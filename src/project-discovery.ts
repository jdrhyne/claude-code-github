import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { ProjectConfig } from './types.js';

const execAsync = promisify(exec);

export interface ProjectDiscoveryConfig {
  enabled: boolean;
  scan_paths: string[];
  exclude_patterns?: string[];
  auto_detect_github_repo?: boolean;
  max_depth?: number;
}

export interface DiscoveredProject {
  path: string;
  github_repo?: string;
  detected_branch?: string;
  has_remote?: boolean;
  remote_url?: string;
}

export interface DiscoveryMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  directoriesScanned: number;
  projectsFound: number;
  errors: number;
  scanPaths: { [path: string]: { duration: number; projects: number } };
}

export class ProjectDiscovery {
  private config: ProjectDiscoveryConfig;
  private discoveredProjects: Map<string, DiscoveredProject> = new Map();
  private metrics: DiscoveryMetrics;

  constructor(config: ProjectDiscoveryConfig) {
    this.config = config;
    this.metrics = {
      startTime: 0,
      directoriesScanned: 0,
      projectsFound: 0,
      errors: 0,
      scanPaths: {}
    };
  }

  /**
   * Scan configured paths for Git repositories
   */
  async discoverProjects(): Promise<DiscoveredProject[]> {
    if (!this.config.enabled) {
      return [];
    }

    // Reset metrics
    this.metrics = {
      startTime: Date.now(),
      directoriesScanned: 0,
      projectsFound: 0,
      errors: 0,
      scanPaths: {}
    };

    const allProjects: DiscoveredProject[] = [];

    for (const scanPath of this.config.scan_paths) {
      if (!fs.existsSync(scanPath)) {
        this.metrics.errors++;
        continue;
      }

      const pathStartTime = Date.now();
      const projects = await this.scanDirectory(scanPath, 0);
      const pathDuration = Date.now() - pathStartTime;

      this.metrics.scanPaths[scanPath] = {
        duration: pathDuration,
        projects: projects.length
      };

      allProjects.push(...projects);
    }

    // Update the discovered projects map
    for (const project of allProjects) {
      this.discoveredProjects.set(project.path, project);
    }

    // Finalize metrics
    this.metrics.endTime = Date.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
    this.metrics.projectsFound = allProjects.length;

    // Log performance metrics if not in test mode
    if (process.env.NODE_ENV !== 'test' && process.env.MCP_MODE !== 'true') {
      this.logMetrics();
    }

    return allProjects;
  }

  /**
   * Recursively scan a directory for Git repositories
   */
  private async scanDirectory(dirPath: string, depth: number): Promise<DiscoveredProject[]> {
    const maxDepth = this.config.max_depth ?? 3;
    if (depth > maxDepth) {
      return [];
    }

    this.metrics.directoriesScanned++;
    const projects: DiscoveredProject[] = [];

    // Check if this directory is a Git repository
    const gitPath = path.join(dirPath, '.git');
    if (fs.existsSync(gitPath) && fs.statSync(gitPath).isDirectory()) {
      const project = await this.analyzeGitRepository(dirPath);
      if (project && !this.isExcluded(dirPath)) {
        projects.push(project);
      }
      // Don't scan subdirectories of a git repo
      return projects;
    }

    // Scan subdirectories
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        // Skip common non-project directories
        if (this.shouldSkipDirectory(entry.name)) continue;
        
        const fullPath = path.join(dirPath, entry.name);
        if (this.isExcluded(fullPath)) continue;
        
        const subProjects = await this.scanDirectory(fullPath, depth + 1);
        projects.push(...subProjects);
      }
    } catch (_error) {
      // Ignore permission errors and continue scanning
    }

    return projects;
  }

  /**
   * Analyze a Git repository to extract information
   */
  private async analyzeGitRepository(repoPath: string): Promise<DiscoveredProject | null> {
    try {
      const project: DiscoveredProject = {
        path: repoPath
      };

      // Get current branch
      try {
        const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: repoPath });
        project.detected_branch = branch.trim();
      } catch {
        // Repository might be in detached HEAD state
      }

      // Get remote information
      try {
        const { stdout: remotes } = await execAsync('git remote -v', { cwd: repoPath });
        const lines = remotes.trim().split('\n');
        
        project.has_remote = false; // Default to false
        
        for (const line of lines) {
          if (line.includes('origin') && line.includes('(fetch)')) {
            project.has_remote = true;
            const match = line.match(/origin\s+(.+?)\s+\(fetch\)/);
            if (match) {
              project.remote_url = match[1];
              
              if (this.config.auto_detect_github_repo) {
                const githubRepo = this.parseGitHubRepo(match[1]);
                if (githubRepo) {
                  project.github_repo = githubRepo;
                }
              }
            }
            break;
          }
        }
      } catch {
        project.has_remote = false;
      }

      return project;
    } catch (_error) {
      // Not a valid git repository
      return null;
    }
  }

  /**
   * Parse GitHub repository from remote URL
   */
  private parseGitHubRepo(remoteUrl: string): string | null {
    // Handle SSH URLs: git@github.com:user/repo.git
    const sshMatch = remoteUrl.match(/git@github\.com:(.+?)(?:\.git)?$/);
    if (sshMatch) {
      return sshMatch[1];
    }

    // Handle HTTPS URLs: https://github.com/user/repo.git
    const httpsMatch = remoteUrl.match(/https?:\/\/github\.com\/(.+?)(?:\.git)?$/);
    if (httpsMatch) {
      return httpsMatch[1];
    }

    return null;
  }

  /**
   * Check if a path should be excluded based on patterns
   */
  private isExcluded(filePath: string): boolean {
    if (!this.config.exclude_patterns) {
      return false;
    }

    // Normalize path separators for cross-platform compatibility
    const normalizedPath = filePath.replace(/\\/g, '/');

    for (const pattern of this.config.exclude_patterns) {
      // Simple glob pattern matching
      const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
      if (regex.test(normalizedPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a directory name should be skipped
   */
  private shouldSkipDirectory(name: string): boolean {
    const skipDirs = [
      'node_modules',
      '.git',
      '.svn',
      '.hg',
      'vendor',
      'bower_components',
      'dist',
      'build',
      'coverage',
      '.idea',
      '.vscode',
      '__pycache__',
      '.pytest_cache',
      '.next',
      '.nuxt',
      'target',
      'bin',
      'obj'
    ];

    return skipDirs.includes(name) || name.startsWith('.');
  }

  /**
   * Get discovered projects as ProjectConfig array
   */
  getProjectConfigs(): ProjectConfig[] {
    return Array.from(this.discoveredProjects.values())
      .filter(p => p.github_repo) // Only include projects with detected GitHub repo
      .map(p => ({
        path: p.path,
        github_repo: p.github_repo!
      }));
  }

  /**
   * Merge discovered projects with manually configured ones
   */
  mergeWithExistingProjects(existingProjects: ProjectConfig[]): ProjectConfig[] {
    const existingPaths = new Set(existingProjects.map(p => p.path));
    const mergedProjects = [...existingProjects];

    for (const discovered of this.getProjectConfigs()) {
      if (!existingPaths.has(discovered.path)) {
        mergedProjects.push(discovered);
      }
    }

    return mergedProjects;
  }

  /**
   * Get the latest discovery metrics
   */
  getMetrics(): DiscoveryMetrics {
    return { ...this.metrics };
  }

  /**
   * Log discovery metrics
   */
  private logMetrics(): void {
    console.log('\n📊 Project Discovery Metrics:');
    console.log(`⏱️  Total duration: ${this.metrics.duration}ms`);
    console.log(`📁 Directories scanned: ${this.metrics.directoriesScanned}`);
    console.log(`🔍 Projects found: ${this.metrics.projectsFound}`);
    
    if (this.metrics.errors > 0) {
      console.log(`❌ Errors: ${this.metrics.errors}`);
    }

    if (Object.keys(this.metrics.scanPaths).length > 0) {
      console.log('\n📍 Per-path breakdown:');
      for (const [path, stats] of Object.entries(this.metrics.scanPaths)) {
        console.log(`   ${path}: ${stats.projects} projects in ${stats.duration}ms`);
      }
    }

    // Performance warnings
    if (this.metrics.duration && this.metrics.duration > 5000) {
      console.log('\n⚠️  Discovery took more than 5 seconds. Consider:');
      console.log('   - Reducing max_depth');
      console.log('   - Adding exclude_patterns');
      console.log('   - Using more specific scan_paths');
    }
  }
}