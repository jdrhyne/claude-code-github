import { FSWatcher, watch } from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import { ProjectDiscovery } from './project-discovery.js';
import { ProjectConfig } from './types.js';
import { GitManager } from './git.js';

export interface WorkspaceConfig {
  enabled: boolean;
  workspaces: WorkspacePathConfig[];
}

export interface WorkspacePathConfig {
  path: string;
  auto_detect: boolean;
  inherit_settings?: boolean;
  cache_discovery?: boolean;
  github_repo_detection?: 'from_remote' | 'from_folder_name';
}

export interface WorkspaceProject {
  path: string;
  github_repo?: string;
  is_git: boolean;
  last_detected: Date;
  cached: boolean;
}

export class WorkspaceMonitor extends EventEmitter {
  private watchers: Map<string, FSWatcher> = new Map();
  private discoveredProjects: Map<string, WorkspaceProject> = new Map();
  private config: WorkspaceConfig;
  private gitManager: GitManager;
  private projectDiscovery: ProjectDiscovery;
  private cacheFile: string;
  private currentWorkingDirectory?: string;

  constructor(config: WorkspaceConfig, cacheFile: string) {
    super();
    this.config = config;
    this.cacheFile = cacheFile;
    this.gitManager = new GitManager();
    this.projectDiscovery = new ProjectDiscovery({
      enabled: true,
      scan_paths: [],
      auto_detect_github_repo: true,
      max_depth: 1
    });
    
    if (config.workspaces.some(w => w.cache_discovery)) {
      this.loadCache();
    }
  }

  /**
   * Start monitoring workspace directories
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    for (const workspace of this.config.workspaces) {
      if (!workspace.auto_detect) {
        continue;
      }

      if (!fs.existsSync(workspace.path)) {
        console.warn(`Workspace path does not exist: ${workspace.path}`);
        continue;
      }

      // Initial scan of the workspace
      await this.scanWorkspace(workspace);

      // Set up file watcher for new directories
      const watcher = watch(workspace.path, {
        persistent: true,
        ignoreInitial: true,
        depth: 1,
        ignored: /(^|[\/\\])\../, // Ignore dotfiles
        followSymlinks: false
      });

      watcher.on('addDir', async (dirPath: string) => {
        // Check if this new directory is a git repository
        const gitPath = path.join(dirPath, '.git');
        if (fs.existsSync(gitPath)) {
          await this.detectProject(dirPath, workspace);
        }
      });

      watcher.on('unlinkDir', (dirPath: string) => {
        // Remove from discovered projects if it was tracked
        if (this.discoveredProjects.has(dirPath)) {
          this.discoveredProjects.delete(dirPath);
          this.emit('project-removed', dirPath);
          this.saveCache();
        }
      });

      this.watchers.set(workspace.path, watcher);
    }
  }

  /**
   * Stop monitoring all workspaces
   */
  async stop(): Promise<void> {
    for (const [_, watcher] of this.watchers) {
      await watcher.close();
    }
    this.watchers.clear();
  }

  /**
   * Scan a workspace for existing Git repositories
   */
  private async scanWorkspace(workspace: WorkspacePathConfig): Promise<void> {
    try {
      const entries = await fs.promises.readdir(workspace.path, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const fullPath = path.join(workspace.path, entry.name);
        const gitPath = path.join(fullPath, '.git');
        
        if (fs.existsSync(gitPath)) {
          await this.detectProject(fullPath, workspace);
        }
      }
    } catch (error) {
      console.error(`Error scanning workspace ${workspace.path}:`, error);
    }
  }

  /**
   * Detect and analyze a Git project
   */
  private async detectProject(projectPath: string, workspace: WorkspacePathConfig): Promise<void> {
    try {
      const isGit = await this.gitManager.isGitRepository(projectPath);
      if (!isGit) return;

      let githubRepo: string | undefined;

      // Detect GitHub repository based on configuration
      if (workspace.github_repo_detection === 'from_remote') {
        const remoteUrl = await this.gitManager.getRemoteUrl(projectPath);
        if (remoteUrl) {
          githubRepo = this.parseGitHubRepo(remoteUrl);
        }
      } else if (workspace.github_repo_detection === 'from_folder_name') {
        // Use folder name as a hint (e.g., "user-repo" -> "user/repo")
        const folderName = path.basename(projectPath);
        if (folderName.includes('-')) {
          githubRepo = folderName.replace('-', '/');
        }
      }

      const project: WorkspaceProject = {
        path: projectPath,
        github_repo: githubRepo,
        is_git: true,
        last_detected: new Date(),
        cached: false
      };

      this.discoveredProjects.set(projectPath, project);
      this.emit('project-detected', project);
      
      if (workspace.cache_discovery) {
        this.saveCache();
      }
    } catch (error) {
      console.error(`Error detecting project at ${projectPath}:`, error);
    }
  }

  /**
   * Parse GitHub repository from remote URL
   */
  private parseGitHubRepo(remoteUrl: string): string | undefined {
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

    return undefined;
  }

  /**
   * Update current working directory to enable context awareness
   */
  setCurrentDirectory(dirPath: string): void {
    this.currentWorkingDirectory = dirPath;
    
    // Check if we're in a discovered project
    for (const [projectPath, project] of this.discoveredProjects) {
      if (dirPath.startsWith(projectPath)) {
        this.emit('context-changed', project);
        break;
      }
    }
  }

  /**
   * Get the current project based on working directory
   */
  getCurrentProject(): WorkspaceProject | undefined {
    if (!this.currentWorkingDirectory) return undefined;

    for (const [projectPath, project] of this.discoveredProjects) {
      if (this.currentWorkingDirectory.startsWith(projectPath)) {
        return project;
      }
    }

    return undefined;
  }

  /**
   * Get all discovered projects
   */
  getDiscoveredProjects(): WorkspaceProject[] {
    return Array.from(this.discoveredProjects.values());
  }

  /**
   * Convert discovered projects to ProjectConfig format
   */
  getProjectConfigs(): ProjectConfig[] {
    return this.getDiscoveredProjects()
      .filter(p => p.github_repo)
      .map(p => ({
        path: p.path,
        github_repo: p.github_repo!
      }));
  }

  /**
   * Load cached project information
   */
  private loadCache(): void {
    if (!fs.existsSync(this.cacheFile)) {
      return;
    }

    try {
      const cacheContent = fs.readFileSync(this.cacheFile, 'utf8');
      const cached = JSON.parse(cacheContent) as WorkspaceProject[];
      
      for (const project of cached) {
        // Verify the project still exists
        if (fs.existsSync(path.join(project.path, '.git'))) {
          project.cached = true;
          project.last_detected = new Date(project.last_detected);
          this.discoveredProjects.set(project.path, project);
        }
      }
    } catch (error) {
      console.error('Error loading workspace cache:', error);
    }
  }

  /**
   * Save project information to cache
   */
  private saveCache(): void {
    try {
      const projects = Array.from(this.discoveredProjects.values());
      const cacheDir = path.dirname(this.cacheFile);
      
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      
      fs.writeFileSync(this.cacheFile, JSON.stringify(projects, null, 2));
    } catch (error) {
      console.error('Error saving workspace cache:', error);
    }
  }
}