import { describe, it, expect, beforeEach } from 'vitest';
import { DevelopmentTools } from '../development-tools.js';
import { 
  getGitMock, 
  getGitHubMock, 
  getFileSystemMock 
} from './utils/persistent-mock.js';
import { 
  createTestProjectPath, 
  setupTestProject,
  expectValidDevelopmentStatus 
} from './utils/test-helpers.js';

describe('DevelopmentTools', () => {
  let developmentTools: DevelopmentTools;
  let gitMock: ReturnType<typeof getGitMock>;
  let githubMock: ReturnType<typeof getGitHubMock>;
  let fsMock: ReturnType<typeof getFileSystemMock>;
  const testProjectPath = createTestProjectPath();

  beforeEach(async () => {
    developmentTools = new DevelopmentTools();
    gitMock = getGitMock();
    githubMock = getGitHubMock();
    fsMock = getFileSystemMock();
    
    // Reset mocks to default state
    gitMock.resetToDefaults();
    
    fsMock.mockConfigExists(true);
    setupTestProject(testProjectPath);
    
    await developmentTools.initialize();
  });

  describe('getStatus', () => {
    it('should return status for project with uncommitted changes', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      
      const status = await developmentTools.getStatus();
      
      expectValidDevelopmentStatus(status);
      expect(status.branch).toBe('feature/test-branch');
      expect(status.is_protected).toBe(false);
      expect(status.uncommitted_changes).toBeTruthy();
      expect(status.uncommitted_changes!.file_count).toBeGreaterThan(0);
    });

    it('should return status for clean project', async () => {
      gitMock.mockCleanRepo();
      gitMock.mockFeatureBranch();
      
      const status = await developmentTools.getStatus();
      
      expectValidDevelopmentStatus(status);
      expect(status.branch).toBe('feature/test-branch');
      expect(status.is_protected).toBe(false);
      expect(status.uncommitted_changes).toBeUndefined();
    });

    it('should identify protected branch', async () => {
      gitMock.mockCleanRepo();
      gitMock.mockProtectedBranch();
      
      const status = await developmentTools.getStatus();
      
      expect(status.branch).toBe('main');
      expect(status.is_protected).toBe(true);
    });

    it('should throw error for non-git repository', async () => {
      const mockGit = gitMock.createMockGit();
      mockGit.status.mockRejectedValue(new Error('Not a git repository'));
      
      await expect(developmentTools.getStatus()).rejects.toThrow(
        'is not a Git repository'
      );
    });
  });

  describe('createBranch', () => {
    it('should create feature branch and commit changes', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      const mockGit = gitMock.createMockGit();
      
      const result = await developmentTools.createBranch({
        name: 'user-profile',
        type: 'feature',
        message: 'feat: add user profile page'
      });
      
      expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('feature/user-profile');
      expect(mockGit.add).toHaveBeenCalledWith('.');
      expect(mockGit.commit).toHaveBeenCalledWith('feat: add user profile page');
      expect(result).toContain('Created branch: feature/user-profile');
    });

    it('should create bugfix branch with correct prefix', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      const mockGit = gitMock.createMockGit();
      
      await developmentTools.createBranch({
        name: 'login-error',
        type: 'bugfix',
        message: 'fix: resolve login error'
      });
      
      expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('bugfix/login-error');
    });

    it('should throw error when on protected branch', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockProtectedBranch();
      
      await expect(developmentTools.createBranch({
        name: 'test',
        type: 'feature',
        message: 'test'
      })).rejects.toThrow('Cannot perform this operation on protected branch');
    });

    it('should throw error for invalid branch type', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      
      await expect(developmentTools.createBranch({
        name: 'test',
        type: 'invalid',
        message: 'test'
      })).rejects.toThrow('Invalid branch type: invalid');
    });

    it('should throw error when no uncommitted changes', async () => {
      gitMock.mockCleanRepo();
      gitMock.mockFeatureBranch();
      
      await expect(developmentTools.createBranch({
        name: 'test',
        type: 'feature',
        message: 'test'
      })).rejects.toThrow('No uncommitted changes found');
    });
  });

  describe('createPullRequest', () => {
    it('should create pull request successfully', async () => {
      gitMock.mockFeatureBranch();
      githubMock.mockValidToken();
      const mockGit = gitMock.createMockGit();
      const mockOctokit = githubMock.createMockOctokit();
      
      const result = await developmentTools.createPullRequest({
        title: 'Add user profile feature',
        body: 'This PR adds user profile functionality',
        is_draft: true
      });
      
      expect(mockGit.push).toHaveBeenCalledWith('origin', 'feature/test-branch', ['--set-upstream']);
      expect(mockOctokit.rest.pulls.create).toHaveBeenCalledWith({
        owner: 'test-user',
        repo: 'test-repo',
        title: 'Add user profile feature',
        body: 'This PR adds user profile functionality',
        head: 'feature/test-branch',
        base: 'main',
        draft: true
      });
      expect(result).toContain('View at: https://github.com/test-user/test-repo/pull/123');
    });

    it('should throw error when on protected branch', async () => {
      gitMock.mockProtectedBranch();
      githubMock.mockValidToken();
      
      await expect(developmentTools.createPullRequest({
        title: 'Test PR',
        body: 'Test'
      })).rejects.toThrow('Cannot perform this operation on protected branch');
    });

    it('should throw error for invalid GitHub token', async () => {
      gitMock.mockFeatureBranch();
      githubMock.mockInvalidToken();
      
      await expect(developmentTools.createPullRequest({
        title: 'Test PR',
        body: 'Test'
      })).rejects.toThrow('GitHub authentication failed');
    });

    it('should throw error when remote does not match config', async () => {
      gitMock.mockFeatureBranch();
      gitMock.setRemotes([{
        name: 'origin',
        refs: {
          fetch: 'https://github.com/different-user/different-repo.git'
        }
      }]);
      githubMock.mockValidToken();
      
      await expect(developmentTools.createPullRequest({
        title: 'Test PR',
        body: 'Test'
      })).rejects.toThrow('Git remote mismatch');
    });
  });

  describe('checkpoint', () => {
    it('should commit changes with provided message', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      const mockGit = gitMock.createMockGit();
      
      const result = await developmentTools.checkpoint({
        message: 'WIP: working on user profile',
        push: false
      });
      
      expect(mockGit.add).toHaveBeenCalledWith('.');
      expect(mockGit.commit).toHaveBeenCalledWith('WIP: working on user profile');
      expect(result).toContain('Created checkpoint');
      expect(result).toContain('WIP: working on user profile');
    });

    it('should throw error when on protected branch', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockProtectedBranch();
      
      await expect(developmentTools.checkpoint({
        message: 'test commit'
      })).rejects.toThrow('Cannot perform this operation on protected branch');
    });

    it('should throw error when no changes to commit', async () => {
      gitMock.mockCleanRepo();
      gitMock.mockFeatureBranch();
      
      await expect(developmentTools.checkpoint({
        message: 'test commit'
      })).rejects.toThrow('No uncommitted changes found');
    });
  });
});