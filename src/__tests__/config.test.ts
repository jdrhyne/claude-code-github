import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigManager } from '../config.js';
import { getFileSystemMock } from './utils/persistent-mock.js';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let fsMock: any;

  beforeEach(() => {
    fsMock = getFileSystemMock();
    configManager = new ConfigManager();
  });

  describe('loadConfig', () => {
    it('should load valid configuration', () => {
      fsMock.mockConfigExists(true);
      
      const config = configManager.loadConfig();
      
      expect(config).toHaveProperty('git_workflow');
      expect(config).toHaveProperty('projects');
      expect(config.git_workflow.main_branch).toBe('main');
      expect(Array.isArray(config.git_workflow.protected_branches)).toBe(true);
      expect(config.git_workflow.protected_branches).toContain('main');
    });

    it('should create default config when file does not exist', () => {
      fsMock.mockConfigExists(false);
      
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process.exit called');
      });
      
      expect(() => configManager.loadConfig()).toThrow('Process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(1);
      
      exitSpy.mockRestore();
    });

    it('should validate configuration structure', () => {
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
      
      expect(() => configManager.loadConfig()).toThrow('Process.exit called');
      
      exitSpy.mockRestore();
    });

    it('should validate project paths exist', () => {
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
      
      expect(() => configManager.loadConfig()).toThrow('Process.exit called');
      
      exitSpy.mockRestore();
    });
  });

  describe('reloadConfig', () => {
    it('should reload configuration from file', () => {
      fsMock.mockConfigExists(true);
      
      const config1 = configManager.loadConfig();
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
      
      const config2 = configManager.reloadConfig();
      expect(config2.git_workflow.main_branch).toBe('develop');
    });
  });
});