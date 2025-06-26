import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitRepositoryRepositoryImpl } from '../git-repository.repository.js';
import { ConfigManager } from '../../../../config.js';
import { GitManager } from '../../../../git.js';

describe('GitRepositoryRepositoryImpl', () => {
  let repository: GitRepositoryRepositoryImpl;
  let mockConfigManager: any;
  let mockGitManager: any;

  beforeEach(() => {
    // Create mocks
    mockConfigManager = {
      getProjects: vi.fn(),
      getProjectByPath: vi.fn()
    };

    mockGitManager = {
      status: vi.fn(),
      branch: vi.fn(),
      checkoutBranch: vi.fn(),
      add: vi.fn(),
      commit: vi.fn(),
      push: vi.fn(),
      log: vi.fn()
    };

    repository = new GitRepositoryRepositoryImpl(
      mockConfigManager as ConfigManager,
      mockGitManager as GitManager
    );
  });

  describe('findById', () => {
    it('should find repository by ID', async () => {
      // Arrange
      const projectConfig = {
        path: '/test/repo',
        github_repo: 'user/repo',
        git_workflow: {
          main_branch: 'main',
          protected_branches: ['main', 'develop']
        }
      };

      const gitStatus = {
        current: 'feature/test',
        tracking: 'origin/feature/test',
        ahead: 1,
        behind: 0,
        modified: ['file1.ts'],
        created: ['file2.ts'],
        deleted: ['file3.ts'],
        renamed: [{ from: 'old.ts', to: 'new.ts' }],
        not_added: ['untracked.ts']
      };

      const branches = {
        all: ['main', 'develop', 'feature/test', 'bugfix/fix-123'],
        current: 'feature/test'
      };

      mockConfigManager.getProjects.mockResolvedValue([projectConfig]);
      mockGitManager.status.mockResolvedValue(gitStatus);
      mockGitManager.branch.mockResolvedValue(branches);

      // Act
      const result = await repository.findById('/test/repo');

      // Assert
      expect(result).not.toBeNull();
      expect(result!.path).toBe('/test/repo');
      expect(result!.currentBranch).toBe('feature/test');
      expect(result!.config.mainBranch).toBe('main');
      expect(result!.config.protectedBranches).toEqual(['main', 'develop']);
      
      // Check uncommitted changes
      expect(result!.uncommittedChanges.fileCount).toBe(5);
      expect(result!.uncommittedChanges.isEmpty()).toBe(false);
    });

    it('should return null when project not found', async () => {
      // Arrange
      mockConfigManager.getProjects.mockResolvedValue([]);

      // Act
      const result = await repository.findById('/non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle missing git workflow config', async () => {
      // Arrange
      const projectConfig = {
        path: '/test/repo',
        github_repo: 'user/repo'
        // No git_workflow
      };

      const gitStatus = {
        current: 'main',
        modified: []
      };

      const branches = {
        all: ['main'],
        current: 'main'
      };

      mockConfigManager.getProjects.mockResolvedValue([projectConfig]);
      mockGitManager.status.mockResolvedValue(gitStatus);
      mockGitManager.branch.mockResolvedValue(branches);

      // Act
      const result = await repository.findById('/test/repo');

      // Assert
      expect(result).not.toBeNull();
      expect(result!.config.mainBranch).toBe('main'); // Default
      expect(result!.config.protectedBranches).toEqual(['main']); // Default
    });

    it('should use cache for subsequent calls', async () => {
      // Arrange
      const projectConfig = {
        path: '/test/repo',
        github_repo: 'user/repo',
        git_workflow: {
          main_branch: 'main',
          protected_branches: ['main']
        }
      };

      const gitStatus = {
        current: 'main',
        modified: ['file1.ts']
      };

      const branches = {
        all: ['main'],
        current: 'main'
      };

      mockConfigManager.getProjects.mockResolvedValue([projectConfig]);
      mockGitManager.status.mockResolvedValue(gitStatus);
      mockGitManager.branch.mockResolvedValue(branches);

      // Act - First call
      const result1 = await repository.findById('/test/repo');
      
      // Update git status for second call
      const updatedStatus = {
        current: 'main',
        modified: ['file1.ts', 'file2.ts']
      };
      mockGitManager.status.mockResolvedValue(updatedStatus);

      // Second call should use cache but refresh changes
      const result2 = await repository.findById('/test/repo');

      // Assert
      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(result1).toBe(result2); // Same instance
      expect(mockConfigManager.getProjects).toHaveBeenCalledTimes(1); // Only called once
      expect(mockGitManager.status).toHaveBeenCalledTimes(2); // Called twice for refresh
      expect(result2!.uncommittedChanges.fileCount).toBe(2); // Updated changes
    });

    it('should map all change types correctly', async () => {
      // Arrange
      const projectConfig = {
        path: '/test/repo',
        github_repo: 'user/repo'
      };

      const gitStatus = {
        current: 'main',
        modified: ['modified1.ts', 'modified2.ts'],
        created: ['new1.ts', 'new2.ts'],
        deleted: ['deleted1.ts'],
        renamed: [
          { from: 'old1.ts', to: 'renamed1.ts' },
          { from: 'old2.ts', to: 'renamed2.ts' }
        ],
        not_added: ['untracked1.ts', 'untracked2.ts']
      };

      const branches = {
        all: ['main'],
        current: 'main'
      };

      mockConfigManager.getProjects.mockResolvedValue([projectConfig]);
      mockGitManager.status.mockResolvedValue(gitStatus);
      mockGitManager.branch.mockResolvedValue(branches);

      // Act
      const result = await repository.findById('/test/repo');

      // Assert
      expect(result).not.toBeNull();
      const changes = result!.uncommittedChanges;
      expect(changes.fileCount).toBe(9);
      
      const files = changes.files;
      expect(files.filter(f => f.status === 'modified')).toHaveLength(2);
      expect(files.filter(f => f.status === 'added')).toHaveLength(2);
      expect(files.filter(f => f.status === 'deleted')).toHaveLength(1);
      expect(files.filter(f => f.status === 'renamed')).toHaveLength(2);
      expect(files.filter(f => f.status === 'untracked')).toHaveLength(2);
    });
  });

  describe('save', () => {
    it('should update cache when saving', async () => {
      // Arrange
      const projectConfig = {
        path: '/test/repo',
        github_repo: 'user/repo'
      };

      const gitStatus = {
        current: 'main',
        modified: []
      };

      const branches = {
        all: ['main'],
        current: 'main'
      };

      mockConfigManager.getProjects.mockResolvedValue([projectConfig]);
      mockGitManager.status.mockResolvedValue(gitStatus);
      mockGitManager.branch.mockResolvedValue(branches);

      // Get repository first
      const repo = await repository.findById('/test/repo');
      expect(repo).not.toBeNull();

      // Act
      await repository.save(repo!);

      // Assert - Repository should be in cache
      const cachedRepo = await repository.findById('/test/repo');
      expect(cachedRepo).toBe(repo);
    });
  });

  describe('findAll', () => {
    it('should return all project repositories', async () => {
      // Arrange
      const projects = [
        { path: '/test/repo1', github_repo: 'user/repo1' },
        { path: '/test/repo2', github_repo: 'user/repo2' },
        { path: '/test/repo3', github_repo: 'user/repo3' }
      ];

      const gitStatus = {
        current: 'main',
        modified: []
      };

      const branches = {
        all: ['main'],
        current: 'main'
      };

      mockConfigManager.getProjects.mockResolvedValue(projects);
      mockGitManager.status.mockResolvedValue(gitStatus);
      mockGitManager.branch.mockResolvedValue(branches);

      // Act
      const results = await repository.findAll();

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].path).toBe('/test/repo1');
      expect(results[1].path).toBe('/test/repo2');
      expect(results[2].path).toBe('/test/repo3');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const projects = [
        { path: '/test/repo1', github_repo: 'user/repo1' },
        { path: '/test/repo2', github_repo: 'user/repo2' }
      ];

      mockConfigManager.getProjects.mockResolvedValue(projects);
      
      // First repo succeeds
      mockGitManager.status.mockResolvedValueOnce({
        current: 'main',
        modified: []
      });
      mockGitManager.branch.mockResolvedValueOnce({
        all: ['main'],
        current: 'main'
      });
      
      // Second repo fails
      mockGitManager.status.mockRejectedValueOnce(new Error('Git error'));

      // Act
      const results = await repository.findAll();

      // Assert
      expect(results).toHaveLength(1); // Only successful repo
      expect(results[0].path).toBe('/test/repo1');
    });
  });
});