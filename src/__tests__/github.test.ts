import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubManager } from '../github.js';
import { getGitHubMock } from './utils/persistent-mock.js';

describe('GitHubManager', () => {
  let githubManager: GitHubManager;
  let githubMock: ReturnType<typeof getGitHubMock>;

  beforeEach(() => {
    githubManager = new GitHubManager();
    githubMock = getGitHubMock();
    githubMock.resetToDefaults();
  });

  describe('parseRepoUrl', () => {
    it('should parse valid repository URL', () => {
      const result = githubManager.parseRepoUrl('user/repo');
      
      expect(result).toEqual({
        owner: 'user',
        repo: 'repo'
      });
    });

    it('should throw error for invalid format', () => {
      expect(() => {
        githubManager.parseRepoUrl('invalid-format');
      }).toThrow('Invalid GitHub repository format');
    });

    it('should throw error for too many parts', () => {
      expect(() => {
        githubManager.parseRepoUrl('user/repo/extra');
      }).toThrow('Invalid GitHub repository format');
    });
  });

  describe('validateToken', () => {
    it('should return true for valid token', async () => {
      githubMock.mockValidToken();
      
      const isValid = await githubManager.validateToken();
      
      expect(isValid).toBe(true);
    });

    it('should return false and clear token for invalid token', async () => {
      // Get the already mocked keytar instance (don't create a new one)
      const mockKeytar = githubMock.createMockKeytar();
      mockKeytar.getPassword.mockResolvedValue('invalid-token');
      
      // Then set up Octokit to reject authentication
      const mockOctokit = githubMock.createMockOctokit();
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(new Error('Unauthorized'));
      
      // Import keytar to verify it's using our mock
      const keytar = await import('keytar');
      
      const isValid = await githubManager.validateToken();
      
      expect(isValid).toBe(false);
      // Check that the mocked keytar's deletePassword was called
      expect(keytar.deletePassword).toHaveBeenCalled();
    });
  });

  describe('createPullRequest', () => {
    it('should create pull request successfully', async () => {
      githubMock.mockValidToken();
      const mockOctokit = githubMock.createMockOctokit();
      
      const result = await githubManager.createPullRequest(
        'test-user',
        'test-repo',
        'Test PR',
        'Test PR description',
        'feature/test',
        'main',
        true,
        ['reviewer1']
      );
      
      expect(mockOctokit.rest.pulls.create).toHaveBeenCalledWith({
        owner: 'test-user',
        repo: 'test-repo',
        title: 'Test PR',
        body: 'Test PR description',
        head: 'feature/test',
        base: 'main',
        draft: true
      });
      
      expect(mockOctokit.rest.pulls.requestReviewers).toHaveBeenCalledWith({
        owner: 'test-user',
        repo: 'test-repo',
        pull_number: 123,
        reviewers: ['reviewer1']
      });
      
      expect(result.number).toBe(123);
      expect(result.html_url).toBe('https://github.com/test-user/test-repo/pull/123');
    });

    it('should create pull request without reviewers', async () => {
      githubMock.mockValidToken();
      const mockOctokit = githubMock.createMockOctokit();
      
      await githubManager.createPullRequest(
        'test-user',
        'test-repo',
        'Test PR',
        'Test PR description',
        'feature/test',
        'main',
        false
      );
      
      expect(mockOctokit.rest.pulls.create).toHaveBeenCalled();
      expect(mockOctokit.rest.pulls.requestReviewers).not.toHaveBeenCalled();
    });

    it('should filter out PR author from reviewers list', async () => {
      githubMock.mockValidToken();
      const mockOctokit = githubMock.createMockOctokit();
      
      // Mock the PR creation to return a specific user as the author
      (mockOctokit.rest.pulls.create as jest.Mock).mockResolvedValueOnce({
        data: {
          number: 123,
          html_url: 'https://github.com/test-user/test-repo/pull/123',
          user: { login: 'test-user' }
        }
      });
      
      await githubManager.createPullRequest(
        'test-user',
        'test-repo',
        'Test PR',
        'Test PR description',
        'feature/test',
        'main',
        false,
        ['test-user', 'reviewer1', 'reviewer2']  // Include PR author in reviewers
      );
      
      expect(mockOctokit.rest.pulls.create).toHaveBeenCalled();
      expect(mockOctokit.rest.pulls.requestReviewers).toHaveBeenCalledWith({
        owner: 'test-user',
        repo: 'test-repo',
        pull_number: 123,
        reviewers: ['reviewer1', 'reviewer2']  // PR author should be filtered out
      });
    });

    it('should handle case-insensitive filtering of PR author', async () => {
      githubMock.mockValidToken();
      const mockOctokit = githubMock.createMockOctokit();
      
      // Mock the PR creation to return a specific user as the author
      (mockOctokit.rest.pulls.create as jest.Mock).mockResolvedValueOnce({
        data: {
          number: 123,
          html_url: 'https://github.com/test-user/test-repo/pull/123',
          user: { login: 'Test-User' }  // Mixed case
        }
      });
      
      await githubManager.createPullRequest(
        'test-user',
        'test-repo',
        'Test PR',
        'Test PR description',
        'feature/test',
        'main',
        false,
        ['test-user', 'TEST-USER', 'reviewer1']  // Different cases
      );
      
      expect(mockOctokit.rest.pulls.create).toHaveBeenCalled();
      expect(mockOctokit.rest.pulls.requestReviewers).toHaveBeenCalledWith({
        owner: 'test-user',
        repo: 'test-repo',
        pull_number: 123,
        reviewers: ['reviewer1']  // Both variations should be filtered out
      });
    });
  });

  describe('getRepository', () => {
    it('should fetch repository information', async () => {
      githubMock.mockValidToken();
      const mockOctokit = githubMock.createMockOctokit();
      
      const result = await githubManager.getRepository('test-user', 'test-repo');
      
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
        owner: 'test-user',
        repo: 'test-repo'
      });
      
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe('test-repo');
    });
  });
});