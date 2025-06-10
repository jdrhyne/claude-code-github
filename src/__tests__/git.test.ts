import { describe, it, expect, beforeEach } from 'vitest';
import { GitManager } from '../git.js';
import { getGitMock, getFileSystemMock } from './utils/persistent-mock.js';

describe('GitManager', () => {
  let gitManager: GitManager;
  let gitMock: any;
  let fsMock: any;
  const testProjectPath = '/tmp/test-project';

  beforeEach(() => {
    gitManager = new GitManager();
    gitMock = getGitMock();
    fsMock = getFileSystemMock();
    fsMock.mockProjectDirectory(testProjectPath);
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      gitMock.setStatus({ current: 'feature/test-branch' });
      
      const branch = await gitManager.getCurrentBranch(testProjectPath);
      
      expect(branch).toBe('feature/test-branch');
    });

    it('should return main as default when current is null', async () => {
      gitMock.setStatus({ current: null });
      
      const branch = await gitManager.getCurrentBranch(testProjectPath);
      
      expect(branch).toBe('main');
    });
  });

  describe('getUncommittedChanges', () => {
    it('should return null for clean repository', async () => {
      gitMock.mockCleanRepo();
      
      const changes = await gitManager.getUncommittedChanges(testProjectPath);
      
      expect(changes).toBeNull();
    });

    it('should return changes for modified files', async () => {
      gitMock.mockUncommittedChanges();
      
      const changes = await gitManager.getUncommittedChanges(testProjectPath);
      
      expect(changes).not.toBeNull();
      expect(changes!.file_count).toBeGreaterThan(0);
      expect(changes!.files_changed).toHaveLength(5); // modified + created + deleted + not_added
      expect(changes!.diff_summary).toBeTruthy();
      
      const modifiedFile = changes!.files_changed.find(f => f.status === 'Modified');
      expect(modifiedFile).toBeTruthy();
      expect(modifiedFile!.file).toBe('src/file1.ts');
    });

    it('should include all file change types', async () => {
      gitMock.mockUncommittedChanges();
      
      const changes = await gitManager.getUncommittedChanges(testProjectPath);
      
      const statuses = changes!.files_changed.map(f => f.status);
      expect(statuses).toContain('Modified');
      expect(statuses).toContain('Added');
      expect(statuses).toContain('Deleted');
    });
  });

  describe('createBranch', () => {
    it('should create and checkout new branch', async () => {
      const mockGit = gitMock.createMockGit();
      
      await gitManager.createBranch(testProjectPath, 'feature/new-feature');
      
      expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('feature/new-feature');
    });
  });

  describe('commitChanges', () => {
    it('should add all files and commit with message', async () => {
      const mockGit = gitMock.createMockGit();
      const message = 'feat: add new feature';
      
      await gitManager.commitChanges(testProjectPath, message);
      
      expect(mockGit.add).toHaveBeenCalledWith('.');
      expect(mockGit.commit).toHaveBeenCalledWith(message);
    });
  });

  describe('pushBranch', () => {
    it('should push branch with upstream tracking', async () => {
      const mockGit = gitMock.createMockGit();
      const branchName = 'feature/test-branch';
      
      await gitManager.pushBranch(testProjectPath, branchName);
      
      expect(mockGit.push).toHaveBeenCalledWith('origin', branchName, ['--set-upstream']);
    });
  });

  describe('getRemoteUrl', () => {
    it('should return origin fetch URL', async () => {
      const url = await gitManager.getRemoteUrl(testProjectPath);
      
      expect(url).toBe('https://github.com/test-user/test-repo.git');
    });

    it('should return null when no origin remote', async () => {
      gitMock.setRemotes([]);
      
      const url = await gitManager.getRemoteUrl(testProjectPath);
      
      expect(url).toBeNull();
    });
  });

  describe('parseGitHubUrl', () => {
    it('should parse HTTPS GitHub URL', () => {
      const url = 'https://github.com/user/repo.git';
      
      const parsed = gitManager.parseGitHubUrl(url);
      
      expect(parsed).toEqual({ owner: 'user', repo: 'repo' });
    });

    it('should parse SSH GitHub URL', () => {
      const url = 'git@github.com:user/repo.git';
      
      const parsed = gitManager.parseGitHubUrl(url);
      
      expect(parsed).toEqual({ owner: 'user', repo: 'repo' });
    });

    it('should return null for invalid URL', () => {
      const url = 'https://gitlab.com/user/repo.git';
      
      const parsed = gitManager.parseGitHubUrl(url);
      
      expect(parsed).toBeNull();
    });
  });

  describe('validateRemoteMatchesConfig', () => {
    it('should return true for matching repository', async () => {
      const isValid = await gitManager.validateRemoteMatchesConfig(
        testProjectPath,
        'test-user/test-repo'
      );
      
      expect(isValid).toBe(true);
    });

    it('should return false for non-matching repository', async () => {
      const isValid = await gitManager.validateRemoteMatchesConfig(
        testProjectPath,
        'different-user/different-repo'
      );
      
      expect(isValid).toBe(false);
    });

    it('should return false when no remote URL', async () => {
      gitMock.setRemotes([]);
      
      const isValid = await gitManager.validateRemoteMatchesConfig(
        testProjectPath,
        'test-user/test-repo'
      );
      
      expect(isValid).toBe(false);
    });
  });

  describe('isGitRepository', () => {
    it('should return true for valid git repository', async () => {
      const isRepo = await gitManager.isGitRepository(testProjectPath);
      
      expect(isRepo).toBe(true);
    });

    it('should return false when git status fails', async () => {
      const mockGit = gitMock.createMockGit();
      mockGit.status.mockRejectedValue(new Error('Not a git repository'));
      
      const isRepo = await gitManager.isGitRepository(testProjectPath);
      
      expect(isRepo).toBe(false);
    });
  });

  describe('isWorkingDirectoryClean', () => {
    it('should return true for clean repository', async () => {
      gitMock.mockCleanRepo();
      
      const isClean = await gitManager.isWorkingDirectoryClean(testProjectPath);
      
      expect(isClean).toBe(true);
    });

    it('should return false for repository with changes', async () => {
      gitMock.mockUncommittedChanges();
      
      const isClean = await gitManager.isWorkingDirectoryClean(testProjectPath);
      
      expect(isClean).toBe(false);
    });
  });
});