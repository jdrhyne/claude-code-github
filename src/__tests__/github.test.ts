import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubManager } from '../github.js';
import { getGitHubMock } from './utils/persistent-mock.js';

describe('GitHubManager', () => {
  let githubManager: GitHubManager;
  let githubMock: ReturnType<typeof getGitHubMock>;

  beforeEach(() => {
    githubManager = new GitHubManager();
    githubMock = getGitHubMock();
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
      const mockKeytar = githubMock.createMockKeytar();
      const mockOctokit = githubMock.createMockOctokit();
      
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(new Error('Unauthorized'));
      
      const isValid = await githubManager.validateToken();
      
      expect(isValid).toBe(false);
      expect(mockKeytar.deletePassword).toHaveBeenCalled();
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
      
      expect(result.data.name).toBe('test-repo');
    });
  });
});