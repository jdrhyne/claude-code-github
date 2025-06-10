import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigManager } from '../config.js';
import { getFileSystemMock } from './utils/persistent-mock.js';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let fsMock: any;

  beforeEach(() => {
    fsMock = getFileSystemMock();
    configManager = new ConfigManager();
    
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('loadConfig', () => {
    it('should load valid configuration', async () => {
      fsMock.mockConfigExists(true);
      fsMock.addDirectory('/tmp/test-project');
      
      const config = await configManager.loadConfig();
      
      expect(config).toHaveProperty('git_workflow');
      expect(config).toHaveProperty('projects');
      expect(config.git_workflow.main_branch).toBe('main');
      expect(Array.isArray(config.git_workflow.protected_branches)).toBe(true);
      expect(config.git_workflow.protected_branches).toContain('main');
    });

    it('should create default config when file does not exist', async () => {
      fsMock.mockConfigExists(false);
      
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process.exit called');
      });
      
      await expect(configManager.loadConfig()).rejects.toThrow('Process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(1);
      
      exitSpy.mockRestore();
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
      
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process.exit called');
      });
      
      await expect(configManager.loadConfig()).rejects.toThrow('Process.exit called');
      
      exitSpy.mockRestore();
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
      
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process.exit called');
      });
      
      await expect(configManager.loadConfig()).rejects.toThrow('Process.exit called');
      
      exitSpy.mockRestore();
    });
  });

  describe('reloadConfig', () => {
    it('should reload configuration from file', async () => {
      fsMock.mockConfigExists(true);
      fsMock.addDirectory('/tmp/test-project');
      
      const config1 = await configManager.loadConfig();
      expect(config1.git_workflow.main_branch).toBe('main');
      
      const newConfig = `
git_workflow:
  main_branch: develop
  protected_branches: [develop]
  branch_prefixes:
    feature: feat/
    bugfix: fix/
    refactor: refactor/
projects:
  - path: "/tmp/test-project"
    github_repo: "new-user/new-repo"
`;
      
      fsMock.addFile(configManager.getConfigPath(), newConfig);
      
      const config2 = await configManager.reloadConfig();
      expect(config2.git_workflow.main_branch).toBe('develop');
    });
  });
});