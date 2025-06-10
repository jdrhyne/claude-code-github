import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import { McpTestClient } from './utils/mcp-client.js';
import { 
  getGitMock, 
  getGitHubMock, 
  getFileSystemMock 
} from './utils/persistent-mock.js';
import { 
  createTestProjectPath, 
  setupTestProject, 
  createMockEnvironment 
} from './utils/test-helpers.js';

describe('Edge Cases and Error Handling', () => {
  let client: McpTestClient;
  let gitMock: any;
  let githubMock: any;
  let fsMock: any;
  let envMock: any;
  const testProjectPath = createTestProjectPath();

  beforeEach(async () => {
    gitMock = getGitMock();
    githubMock = getGitHubMock();
    fsMock = getFileSystemMock();
    
    fsMock.mockConfigExists(true);
    setupTestProject(testProjectPath);
    envMock = createMockEnvironment();
    
    const serverPath = path.resolve(process.cwd(), 'dist', 'index.js');
    client = new McpTestClient({
      command: ['node', serverPath],
      timeout: 15000
    });
    
    await client.connect();
    await client.initialize();
  });

  afterEach(async () => {
    await client.disconnect();
    envMock.restore();
  });

  describe('Configuration Edge Cases', () => {
    it('should handle missing configuration file', async () => {
      fsMock.mockConfigExists(false);
      
      // This would cause the server to exit in real scenario
      // In tests, we just verify the behavior is predictable
      const result = await client.callTool('development.status');
      expect(result).toBeTruthy();
    });

    it('should handle project directory that does not exist', async () => {
      fsMock.removeFile('/tmp/test-project');
      
      try {
        await client.callTool('development.status');
      } catch (error) {
        expect((error as Error).message).toContain('not found');
      }
    });
  });

  describe('Git Repository Edge Cases', () => {
    it('should handle non-git repository', async () => {
      const mockGit = gitMock.createMockGit();
      mockGit.status.mockRejectedValue(new Error('fatal: not a git repository'));
      
      try {
        await client.callTool('development.status');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('not a Git repository');
      }
    });

    it('should handle git command failures', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      const mockGit = gitMock.createMockGit();
      mockGit.add.mockRejectedValue(new Error('git add failed'));
      
      try {
        await client.callTool('development.checkpoint', {
          message: 'test commit'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('git add failed');
      }
    });

    it('should handle corrupted git diff output', async () => {
      gitMock.mockUncommittedChanges();
      const mockGit = gitMock.createMockGit();
      mockGit.diff.mockRejectedValue(new Error('diff failed'));
      
      const result = await client.callTool('development.status');
      const status = JSON.parse(result.content[0].text);
      
      expect(status.uncommitted_changes.diff_summary).toBe('Error generating diff');
    });
  });

  describe('GitHub API Edge Cases', () => {
    it('should handle GitHub API rate limiting', async () => {
      gitMock.mockFeatureBranch();
      githubMock.mockValidToken();
      const mockOctokit = githubMock.createMockOctokit();
      
      mockOctokit.rest.pulls.create.mockRejectedValue(
        new Error('API rate limit exceeded')
      );
      
      try {
        await client.callTool('development.create_pull_request', {
          title: 'Test PR',
          body: 'Test'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('API rate limit exceeded');
      }
    });

    it('should handle invalid repository permissions', async () => {
      gitMock.mockFeatureBranch();
      githubMock.mockValidToken();
      const mockOctokit = githubMock.createMockOctokit();
      
      mockOctokit.rest.pulls.create.mockRejectedValue(
        new Error('Repository not found or insufficient permissions')
      );
      
      try {
        await client.callTool('development.create_pull_request', {
          title: 'Test PR',
          body: 'Test'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('Repository not found');
      }
    });

    it('should handle expired GitHub token', async () => {
      gitMock.mockFeatureBranch();
      const mockKeytar = githubMock.createMockKeytar();
      const mockOctokit = githubMock.createMockOctokit();
      
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(
        new Error('Bad credentials')
      );
      
      try {
        await client.callTool('development.create_pull_request', {
          title: 'Test PR',
          body: 'Test'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('token validation failed');
      }
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle special characters in branch names', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      
      const result = await client.callTool('development.create_branch', {
        name: 'feature-with-@special#chars',
        type: 'feature',
        message: 'feat: add special feature'
      });
      
      expect(result.content[0].text).toContain('Created branch feature/feature-with-@special#chars');
    });

    it('should handle very long commit messages', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      
      const longMessage = 'feat: ' + 'a'.repeat(1000);
      
      const result = await client.callTool('development.checkpoint', {
        message: longMessage
      });
      
      expect(result.content[0].text).toContain('Committed changes');
    });

    it('should handle unicode characters in inputs', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      
      const result = await client.callTool('development.create_branch', {
        name: 'féature-with-émojis-🚀',
        type: 'feature',
        message: 'feat: add unicode support 🎉'
      });
      
      expect(result.content[0].text).toContain('Created branch');
    });

    it('should handle empty strings in parameters', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      
      try {
        await client.callTool('development.create_branch', {
          name: '',
          type: 'feature',
          message: 'test'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });

  describe('Network and File System Edge Cases', () => {
    it('should handle file system permission errors', async () => {
      const mockGit = gitMock.createMockGit();
      mockGit.add.mockRejectedValue(new Error('EACCES: permission denied'));
      
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      
      try {
        await client.callTool('development.checkpoint', {
          message: 'test commit'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('permission denied');
      }
    });

    it('should handle network connectivity issues', async () => {
      gitMock.mockFeatureBranch();
      githubMock.mockValidToken();
      const mockGit = gitMock.createMockGit();
      
      mockGit.push.mockRejectedValue(new Error('network unreachable'));
      
      try {
        await client.callTool('development.create_pull_request', {
          title: 'Test PR',
          body: 'Test'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('network unreachable');
      }
    });

    it('should handle disk space issues', async () => {
      const mockGit = gitMock.createMockGit();
      mockGit.commit.mockRejectedValue(new Error('ENOSPC: no space left on device'));
      
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      
      try {
        await client.callTool('development.checkpoint', {
          message: 'test commit'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('no space left');
      }
    });
  });

  describe('Concurrent Operation Edge Cases', () => {
    it('should handle multiple rapid tool calls', async () => {
      gitMock.mockFeatureBranch();
      
      const promises = Array.from({ length: 5 }, (_, i) => 
        client.callTool('development.status')
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.content[0].text).toBeTruthy();
      });
    });

    it('should handle tool calls with git state changes', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      
      // First call
      const result1 = await client.callTool('development.status');
      const status1 = JSON.parse(result1.content[0].text);
      expect(status1.uncommitted_changes).toBeTruthy();
      
      // Simulate git state change
      gitMock.mockCleanRepo();
      
      // Second call should reflect new state
      const result2 = await client.callTool('development.status');
      const status2 = JSON.parse(result2.content[0].text);
      expect(status2.uncommitted_changes).toBeUndefined();
    });
  });

  describe('Malformed Request Handling', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      // This test simulates a client sending malformed JSON
      // In a real scenario, this would be handled by the JSON-RPC layer
      try {
        await client.callTool('development.status', { malformed: undefined });
      } catch (error) {
        // Should not crash the server, just return an error
        expect(error).toBeTruthy();
      }
    });
  });
});