import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { WorkspaceMonitor, WorkspaceConfig } from '../src/workspace-monitor.js';

const execAsync = promisify(exec);

// Skip mocked fs for these tests - use real filesystem
vi.unmock('fs');
vi.unmock('node:fs');
vi.unmock('chokidar');

describe('WorkspaceMonitor', () => {
  let tempDir: string;
  let monitor: WorkspaceMonitor;
  let cacheFile: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'workspace-monitor-test-'));
    cacheFile = path.join(tempDir, 'cache.json');
  });

  afterEach(async () => {
    // Stop monitor if running
    if (monitor) {
      await monitor.stop();
    }
    // Clean up the temporary directory
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  describe('start', () => {
    it('should not start when disabled', async () => {
      const config: WorkspaceConfig = {
        enabled: false,
        workspaces: []
      };

      monitor = new WorkspaceMonitor(config, cacheFile);
      await monitor.start();

      expect(monitor.getDiscoveredProjects()).toHaveLength(0);
    });

    it('should scan workspace for existing Git repositories', async () => {
      // Create test repositories
      const workspace = path.join(tempDir, 'workspace');
      const repo1 = path.join(workspace, 'repo1');
      const repo2 = path.join(workspace, 'repo2');
      const nonRepo = path.join(workspace, 'not-a-repo');
      
      await fs.promises.mkdir(workspace, { recursive: true });
      await fs.promises.mkdir(repo1);
      await fs.promises.mkdir(repo2);
      await fs.promises.mkdir(nonRepo);
      
      await execAsync('git init', { cwd: repo1 });
      await execAsync('git init', { cwd: repo2 });

      const config: WorkspaceConfig = {
        enabled: true,
        workspaces: [{
          path: workspace,
          auto_detect: true
        }]
      };

      monitor = new WorkspaceMonitor(config, cacheFile);
      await monitor.start();

      // Give it a moment to scan
      await new Promise(resolve => setTimeout(resolve, 100));

      const projects = monitor.getDiscoveredProjects();
      expect(projects).toHaveLength(2);
      expect(projects.map(p => p.path).sort()).toEqual([repo1, repo2].sort());
    });

    it('should detect GitHub repository from folder name', async () => {
      const workspace = path.join(tempDir, 'workspace');
      const repo = path.join(workspace, 'test-repo');
      
      await fs.promises.mkdir(workspace, { recursive: true });
      await fs.promises.mkdir(repo);
      await execAsync('git init', { cwd: repo });

      const config: WorkspaceConfig = {
        enabled: true,
        workspaces: [{
          path: workspace,
          auto_detect: true,
          github_repo_detection: 'from_folder_name'
        }]
      };

      monitor = new WorkspaceMonitor(config, cacheFile);
      await monitor.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      const projects = monitor.getDiscoveredProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].github_repo).toBe('test/repo');
    });
  });

  describe('real-time detection', () => {
    it.skip('should detect newly created Git repositories', async () => {
      const workspace = path.join(tempDir, 'workspace');
      await fs.promises.mkdir(workspace, { recursive: true });

      const config: WorkspaceConfig = {
        enabled: true,
        workspaces: [{
          path: workspace,
          auto_detect: true
        }]
      };

      monitor = new WorkspaceMonitor(config, cacheFile);
      
      // Set up event listener
      const projectDetected = vi.fn();
      monitor.on('project-detected', projectDetected);
      
      await monitor.start();

      // Create a new repository after monitoring started
      const newRepo = path.join(workspace, 'new-repo');
      await fs.promises.mkdir(newRepo);
      await execAsync('git init', { cwd: newRepo });

      // Wait for file watcher to detect the change
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(projectDetected).toHaveBeenCalled();
      const projects = monitor.getDiscoveredProjects();
      expect(projects.some(p => p.path === newRepo)).toBe(true);
    });

    it.skip('should emit event when project is removed', async () => {
      const workspace = path.join(tempDir, 'workspace');
      const repo = path.join(workspace, 'temp-repo');
      
      await fs.promises.mkdir(workspace, { recursive: true });
      await fs.promises.mkdir(repo);
      await execAsync('git init', { cwd: repo });

      const config: WorkspaceConfig = {
        enabled: true,
        workspaces: [{
          path: workspace,
          auto_detect: true
        }]
      };

      monitor = new WorkspaceMonitor(config, cacheFile);
      
      const projectRemoved = vi.fn();
      monitor.on('project-removed', projectRemoved);
      
      await monitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Remove the repository
      await fs.promises.rm(repo, { recursive: true, force: true });

      // Wait for detection
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(projectRemoved).toHaveBeenCalledWith(repo);
    });
  });

  describe('context awareness', () => {
    it('should detect current project based on working directory', async () => {
      const workspace = path.join(tempDir, 'workspace');
      const repo1 = path.join(workspace, 'repo1');
      const repo2 = path.join(workspace, 'repo2');
      
      await fs.promises.mkdir(workspace, { recursive: true });
      await fs.promises.mkdir(repo1);
      await fs.promises.mkdir(repo2);
      
      await execAsync('git init', { cwd: repo1 });
      await execAsync('git init', { cwd: repo2 });

      const config: WorkspaceConfig = {
        enabled: true,
        workspaces: [{
          path: workspace,
          auto_detect: true
        }]
      };

      monitor = new WorkspaceMonitor(config, cacheFile);
      await monitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Set current directory to repo1
      monitor.setCurrentDirectory(repo1);
      const current1 = monitor.getCurrentProject();
      expect(current1?.path).toBe(repo1);

      // Change to repo2
      monitor.setCurrentDirectory(path.join(repo2, 'src'));
      const current2 = monitor.getCurrentProject();
      expect(current2?.path).toBe(repo2);
    });

    it('should emit context-changed event', async () => {
      const workspace = path.join(tempDir, 'workspace');
      const repo = path.join(workspace, 'repo');
      
      await fs.promises.mkdir(workspace, { recursive: true });
      await fs.promises.mkdir(repo);
      await execAsync('git init', { cwd: repo });

      const config: WorkspaceConfig = {
        enabled: true,
        workspaces: [{
          path: workspace,
          auto_detect: true
        }]
      };

      monitor = new WorkspaceMonitor(config, cacheFile);
      
      const contextChanged = vi.fn();
      monitor.on('context-changed', contextChanged);
      
      await monitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      monitor.setCurrentDirectory(repo);

      expect(contextChanged).toHaveBeenCalled();
      expect(contextChanged.mock.calls[0][0].path).toBe(repo);
    });
  });

  describe('caching', () => {
    it('should save discovered projects to cache', async () => {
      const workspace = path.join(tempDir, 'workspace');
      const repo = path.join(workspace, 'test-cached');
      
      await fs.promises.mkdir(workspace, { recursive: true });
      await fs.promises.mkdir(repo);
      await execAsync('git init', { cwd: repo });

      const config: WorkspaceConfig = {
        enabled: true,
        workspaces: [{
          path: workspace,
          auto_detect: true,
          cache_discovery: true,
          github_repo_detection: 'from_folder_name'
        }]
      };

      monitor = new WorkspaceMonitor(config, cacheFile);
      await monitor.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check cache file was created
      expect(fs.existsSync(cacheFile)).toBe(true);
      
      const cacheContent = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      expect(cacheContent).toHaveLength(1);
      expect(cacheContent[0].path).toBe(repo);
      expect(cacheContent[0].github_repo).toBe('test/cached');
    });

    it('should load projects from cache on startup', async () => {
      const workspace = path.join(tempDir, 'workspace');
      const repo = path.join(workspace, 'cached-repo');
      
      await fs.promises.mkdir(workspace, { recursive: true });
      await fs.promises.mkdir(repo);
      await execAsync('git init', { cwd: repo });

      // Create cache file manually
      const cacheData = [{
        path: repo,
        github_repo: 'test/cached',
        is_git: true,
        last_detected: new Date().toISOString(),
        cached: false  // This will be set to true when loaded
      }];
      await fs.promises.writeFile(cacheFile, JSON.stringify(cacheData));

      const config: WorkspaceConfig = {
        enabled: true,
        workspaces: [{
          path: workspace,
          auto_detect: true,
          cache_discovery: true
        }]
      };

      monitor = new WorkspaceMonitor(config, cacheFile);
      await monitor.start();

      const projects = monitor.getDiscoveredProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].cached).toBe(true);
      expect(projects[0].github_repo).toBe('test/cached');
    });
  });

  describe('GitHub repo detection strategies', () => {
    it('should detect from folder name when configured', async () => {
      const workspace = path.join(tempDir, 'workspace');
      const repo = path.join(workspace, 'user-repository');
      
      await fs.promises.mkdir(workspace, { recursive: true });
      await fs.promises.mkdir(repo);
      await execAsync('git init', { cwd: repo });

      const config: WorkspaceConfig = {
        enabled: true,
        workspaces: [{
          path: workspace,
          auto_detect: true,
          github_repo_detection: 'from_folder_name'
        }]
      };

      monitor = new WorkspaceMonitor(config, cacheFile);
      await monitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      const projects = monitor.getDiscoveredProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].github_repo).toBe('user/repository');
    });
  });

  describe('getProjectConfigs', () => {
    it('should convert to ProjectConfig format', async () => {
      const workspace = path.join(tempDir, 'workspace');
      const repo1 = path.join(workspace, 'test-repo1');
      const repo2 = path.join(workspace, 'repo2');
      
      await fs.promises.mkdir(workspace, { recursive: true });
      await fs.promises.mkdir(repo1);
      await fs.promises.mkdir(repo2);
      
      await execAsync('git init', { cwd: repo1 });
      await execAsync('git init', { cwd: repo2 });
      // repo1 has dash, will be detected
      // repo2 has no dash, won't get github_repo

      const config: WorkspaceConfig = {
        enabled: true,
        workspaces: [{
          path: workspace,
          auto_detect: true,
          github_repo_detection: 'from_folder_name'
        }]
      };

      monitor = new WorkspaceMonitor(config, cacheFile);
      await monitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      const projectConfigs = monitor.getProjectConfigs();
      expect(projectConfigs).toHaveLength(1); // Only repo1 has github_repo
      expect(projectConfigs[0]).toEqual({
        path: repo1,
        github_repo: 'test/repo1'
      });
    });
  });
});