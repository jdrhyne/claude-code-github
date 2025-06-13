import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ProjectDiscovery } from '../src/project-discovery.js';

const execAsync = promisify(exec);

// Skip mocked fs for these tests - use real filesystem
vi.unmock('fs');
vi.unmock('node:fs');

describe('ProjectDiscovery', () => {
  let tempDir: string;
  let discovery: ProjectDiscovery;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'project-discovery-test-'));
  });

  afterEach(async () => {
    // Clean up the temporary directory
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  describe('discoverProjects', () => {
    it('should return empty array when disabled', async () => {
      discovery = new ProjectDiscovery({
        enabled: false,
        scan_paths: [tempDir]
      });

      const projects = await discovery.discoverProjects();
      expect(projects).toEqual([]);
    });

    it('should discover git repositories in scan paths', async () => {
      // Create test git repositories
      const repo1 = path.join(tempDir, 'repo1');
      const repo2 = path.join(tempDir, 'nested', 'repo2');
      
      await fs.promises.mkdir(repo1);
      await fs.promises.mkdir(path.dirname(repo2), { recursive: true });
      await fs.promises.mkdir(repo2);
      
      await execAsync('git init', { cwd: repo1 });
      await execAsync('git init', { cwd: repo2 });

      discovery = new ProjectDiscovery({
        enabled: true,
        scan_paths: [tempDir],
        auto_detect_github_repo: false
      });

      const projects = await discovery.discoverProjects();
      expect(projects).toHaveLength(2);
      expect(projects.map(p => path.normalize(p.path)).sort()).toEqual([repo1, repo2].map(p => path.normalize(p)).sort());
    });

    it('should respect max_depth setting', async () => {
      // Create nested git repositories
      const repo1 = path.join(tempDir, 'level1', 'repo1');
      const repo2 = path.join(tempDir, 'level1', 'level2', 'level3', 'repo2');
      
      await fs.promises.mkdir(path.dirname(repo1), { recursive: true });
      await fs.promises.mkdir(repo1);
      await fs.promises.mkdir(path.dirname(repo2), { recursive: true });
      await fs.promises.mkdir(repo2);
      
      await execAsync('git init', { cwd: repo1 });
      await execAsync('git init', { cwd: repo2 });

      discovery = new ProjectDiscovery({
        enabled: true,
        scan_paths: [tempDir],
        max_depth: 2,
        auto_detect_github_repo: false
      });

      const projects = await discovery.discoverProjects();
      expect(projects).toHaveLength(1);
      expect(path.normalize(projects[0].path)).toBe(path.normalize(repo1));
    });

    it('should exclude paths based on patterns', async () => {
      // Create test repositories
      const repo1 = path.join(tempDir, 'active', 'repo1');
      const repo2 = path.join(tempDir, 'archived', 'repo2');
      
      await fs.promises.mkdir(path.dirname(repo1), { recursive: true });
      await fs.promises.mkdir(repo1);
      await fs.promises.mkdir(path.dirname(repo2), { recursive: true });
      await fs.promises.mkdir(repo2);
      
      await execAsync('git init', { cwd: repo1 });
      await execAsync('git init', { cwd: repo2 });

      discovery = new ProjectDiscovery({
        enabled: true,
        scan_paths: [tempDir],
        exclude_patterns: ['*/archived/*'],
        auto_detect_github_repo: false
      });

      const projects = await discovery.discoverProjects();
      expect(projects).toHaveLength(1);
      // Use path normalization for cross-platform path comparison
      expect(path.normalize(projects[0].path)).toBe(path.normalize(repo1));
    });

    it('should skip common non-project directories', async () => {
      // Create a git repo inside node_modules (should be skipped)
      const repo1 = path.join(tempDir, 'node_modules', 'some-package');
      const repo2 = path.join(tempDir, 'my-project');
      
      await fs.promises.mkdir(path.dirname(repo1), { recursive: true });
      await fs.promises.mkdir(repo1);
      await fs.promises.mkdir(repo2);
      
      await execAsync('git init', { cwd: repo1 });
      await execAsync('git init', { cwd: repo2 });

      discovery = new ProjectDiscovery({
        enabled: true,
        scan_paths: [tempDir],
        auto_detect_github_repo: false
      });

      const projects = await discovery.discoverProjects();
      expect(projects).toHaveLength(1);
      expect(path.normalize(projects[0].path)).toBe(path.normalize(repo2));
    });
  });

  describe('GitHub repository detection', () => {
    it('should detect GitHub repository from SSH remote', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      await fs.promises.mkdir(repoPath);
      await execAsync('git init', { cwd: repoPath });
      await execAsync('git remote add origin git@github.com:octocat/Hello-World.git', { cwd: repoPath });

      discovery = new ProjectDiscovery({
        enabled: true,
        scan_paths: [tempDir],
        auto_detect_github_repo: true
      });

      const projects = await discovery.discoverProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].github_repo).toBe('octocat/Hello-World');
    });

    it('should detect GitHub repository from HTTPS remote', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      await fs.promises.mkdir(repoPath);
      await execAsync('git init', { cwd: repoPath });
      await execAsync('git remote add origin https://github.com/octocat/Hello-World.git', { cwd: repoPath });

      discovery = new ProjectDiscovery({
        enabled: true,
        scan_paths: [tempDir],
        auto_detect_github_repo: true
      });

      const projects = await discovery.discoverProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].github_repo).toBe('octocat/Hello-World');
    });

    it('should handle repositories without remotes', async () => {
      const repoPath = path.join(tempDir, 'test-repo');
      await fs.promises.mkdir(repoPath);
      await execAsync('git init', { cwd: repoPath });

      discovery = new ProjectDiscovery({
        enabled: true,
        scan_paths: [tempDir],
        auto_detect_github_repo: true
      });

      const projects = await discovery.discoverProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].has_remote).toBe(false);
      expect(projects[0].github_repo).toBeUndefined();
    });
  });

  describe('mergeWithExistingProjects', () => {
    it('should merge discovered projects with existing ones', async () => {
      // Create test repositories
      const repo1 = path.join(tempDir, 'repo1');
      const repo2 = path.join(tempDir, 'repo2');
      
      await fs.promises.mkdir(repo1);
      await fs.promises.mkdir(repo2);
      
      await execAsync('git init', { cwd: repo1 });
      await execAsync('git init', { cwd: repo2 });
      await execAsync('git remote add origin git@github.com:user/repo1.git', { cwd: repo1 });
      await execAsync('git remote add origin git@github.com:user/repo2.git', { cwd: repo2 });

      discovery = new ProjectDiscovery({
        enabled: true,
        scan_paths: [tempDir],
        auto_detect_github_repo: true
      });

      await discovery.discoverProjects();

      const existingProjects = [
        { path: repo1, github_repo: 'user/repo1' }
      ];

      const merged = discovery.mergeWithExistingProjects(existingProjects);
      expect(merged).toHaveLength(2);
      expect(merged[0]).toEqual(existingProjects[0]);
      expect(path.normalize(merged[1].path)).toBe(path.normalize(repo2));
      expect(merged[1].github_repo).toBe('user/repo2');
    });

    it('should not duplicate existing projects', async () => {
      const repo1 = path.join(tempDir, 'repo1');
      
      await fs.promises.mkdir(repo1);
      await execAsync('git init', { cwd: repo1 });
      await execAsync('git remote add origin git@github.com:user/repo1.git', { cwd: repo1 });

      discovery = new ProjectDiscovery({
        enabled: true,
        scan_paths: [tempDir],
        auto_detect_github_repo: true
      });

      await discovery.discoverProjects();

      const existingProjects = [
        { path: repo1, github_repo: 'user/repo1', reviewers: ['reviewer1'] }
      ];

      const merged = discovery.mergeWithExistingProjects(existingProjects);
      expect(merged).toHaveLength(1);
      expect(merged[0]).toEqual(existingProjects[0]);
    });
  });
});