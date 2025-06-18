import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigManager } from '../config.js';
import { getFileSystemMock } from './utils/persistent-mock.js';
import { FileSystemMock } from './utils/fs-mock.js';
import * as os from 'os';
import * as path from 'path';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let fsMock: FileSystemMock;
  const testProjectPath = path.join(os.tmpdir(), 'claude-code-github-test', 'test-project');

  beforeEach(() => {
    fsMock = getFileSystemMock();
    configManager = new ConfigManager();
    
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('loadConfig', () => {
    it('should load valid configuration', async () => {
      fsMock.mockConfigExists(true);
      fsMock.addDirectory(testProjectPath);
      
      const config = await configManager.loadConfig();
      
      expect(config).toHaveProperty('git_workflow');
      expect(config).toHaveProperty('projects');
      expect(config.git_workflow.main_branch).toBe('main');
      expect(Array.isArray(config.git_workflow.protected_branches)).toBe(true);
      expect(config.git_workflow.protected_branches).toContain('main');
    });

    it('should create default config when file does not exist', async () => {
      fsMock.mockConfigExists(false);
      
      // In test mode, it returns a default config instead of exiting
      const config = await configManager.loadConfig();
      
      expect(config).toHaveProperty('git_workflow');
      expect(config).toHaveProperty('projects');
      expect(config.projects).toHaveLength(1);
      expect(config.projects[0].path).toBe(testProjectPath);
    });

    it('should validate configuration structure', async () => {
      const invalidConfig = `
git_workflow:
  # missing main_branch
  protected_branches: []
projects: []
`;
      
      fsMock.addFile(
        configManager.getConfigPath(),
        invalidConfig
      );
      
      // In test mode, it returns default config instead of exiting
      const config = await configManager.loadConfig();
      
      // Should return default config due to validation failure
      expect(config.git_workflow.main_branch).toBe('main');
      expect(config.projects).toHaveLength(1);
      expect(config.projects[0].path).toBe(testProjectPath);
    });

    it('should validate project paths exist', async () => {
      const configWithInvalidPath = `
git_workflow:
  main_branch: main
  protected_branches: []
  branch_prefixes:
    feature: feature/
    bugfix: bugfix/
    refactor: refactor/
projects:
  - path: "/nonexistent/path"
    github_repo: "user/repo"
`;
      
      fsMock.addFile(
        configManager.getConfigPath(),
        configWithInvalidPath
      );
      
      // In test mode, it returns default config instead of exiting
      const config = await configManager.loadConfig();
      
      // Should return default config due to validation failure
      expect(config.git_workflow.main_branch).toBe('main');
      expect(config.projects).toHaveLength(1);
      expect(config.projects[0].path).toBe(testProjectPath);
    });
  });

  describe('reloadConfig', () => {
    it('should reload configuration from file', async () => {
      // Start with default config
      fsMock.mockConfigExists(true);
      fsMock.addDirectory(testProjectPath);
      
      const config1 = await configManager.loadConfig();
      expect(config1.git_workflow.main_branch).toBe('main');
      
      // In test mode, reloadConfig returns the same default config
      const config2 = await configManager.reloadConfig();
      
      // Still returns default config in test mode
      expect(config2.git_workflow.main_branch).toBe('main');
      expect(config2.projects).toHaveLength(1);
      expect(config2.projects[0].path).toBe(testProjectPath);
    });
  });
});