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
  expectValidDevelopmentStatus,
  createMockEnvironment 
} from './utils/test-helpers.js';
import { GitMock } from './utils/git-mock.js';
import { GitHubMock } from './utils/github-mock.js';
import { FileSystemMock } from './utils/fs-mock.js';
import { McpTool } from '../types.js';

describe('E2E MCP Server Tests', () => {
  let client: McpTestClient;
  let gitMock: GitMock;
  let githubMock: GitHubMock;
  let fsMock: FileSystemMock;
  let envMock: { restore: () => void };
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
      timeout: 10000
    });
    
    await client.connect();
  });

  afterEach(async () => {
    await client.disconnect();
    envMock.restore();
  });

  describe('Server Initialization', () => {
    it('should initialize successfully', async () => {
      const result = await client.initialize();
      
      expect(result).toHaveProperty('protocolVersion');
      expect(result).toHaveProperty('capabilities');
      expect(result).toHaveProperty('serverInfo');
      expect(result.serverInfo.name).toBe('claude-code-github');
    });

    it('should list all available tools', async () => {
      await client.initialize();
      const result = await client.listTools();
      
      expect(result).toHaveProperty('tools');
      expect(Array.isArray(result.tools)).toBe(true);
      
      const toolNames = result.tools.map((tool: McpTool) => tool.name);
      expect(toolNames).toContain('development.status');
      expect(toolNames).toContain('development.create_branch');
      expect(toolNames).toContain('development.create_pull_request');
      expect(toolNames).toContain('development.checkpoint');
    });
  });

  describe('development.status Tool', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    it('should return status for project with changes', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      
      const result = await client.callTool('development.status');
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('text');
      
      const status = JSON.parse(result.content[0].text);
      expectValidDevelopmentStatus(status);
      expect(status.branch).toBe('feature/test-branch');
      expect(status.uncommitted_changes).toBeTruthy();
    });

    it('should return status for clean project', async () => {
      gitMock.mockCleanRepo();
      gitMock.mockFeatureBranch();
      
      const result = await client.callTool('development.status');
      const status = JSON.parse(result.content[0].text);
      
      expect(status.branch).toBe('feature/test-branch');
      expect(status.uncommitted_changes).toBeUndefined();
    });

    it('should identify protected branches', async () => {
      gitMock.mockCleanRepo();
      gitMock.mockProtectedBranch();
      
      const result = await client.callTool('development.status');
      const status = JSON.parse(result.content[0].text);
      
      expect(status.branch).toBe('main');
      expect(status.is_protected).toBe(true);
    });
  });

  describe('development.create_branch Tool', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    it('should create feature branch successfully', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      
      const result = await client.callTool('development.create_branch', {
        name: 'user-profile',
        type: 'feature',
        message: 'feat: add user profile page'
      });
      
      expect(result.content[0].text).toContain('Created branch feature/user-profile');
    });

    it('should create bugfix branch successfully', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      
      const result = await client.callTool('development.create_branch', {
        name: 'login-fix',
        type: 'bugfix',
        message: 'fix: resolve login issue'
      });
      
      expect(result.content[0].text).toContain('Created branch bugfix/login-fix');
    });

    it('should handle validation errors', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockProtectedBranch();
      
      try {
        await client.callTool('development.create_branch', {
          name: 'test',
          type: 'feature',
          message: 'test'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('protected branch');
      }
    });
  });

  describe('development.create_pull_request Tool', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    it('should create pull request successfully', async () => {
      gitMock.mockFeatureBranch();
      githubMock.mockValidToken();
      
      const result = await client.callTool('development.create_pull_request', {
        title: 'Add user profile feature',
        body: 'This PR adds user profile functionality',
        is_draft: true
      });
      
      expect(result.content[0].text).toContain('Created pull request #123');
      expect(result.content[0].text).toContain('https://github.com/test-user/test-repo/pull/123');
    });

    it('should include confirmation requirement', async () => {
      gitMock.mockFeatureBranch();
      githubMock.mockValidToken();
      
      const result = await client.callTool('development.create_pull_request', {
        title: 'Test PR',
        body: 'Test description'
      });
      
      const response = JSON.parse(result.content[0].text);
      expect(response.confirmation_required).toBe(true);
    });

    it('should handle protected branch error', async () => {
      gitMock.mockProtectedBranch();
      githubMock.mockValidToken();
      
      try {
        await client.callTool('development.create_pull_request', {
          title: 'Test PR',
          body: 'Test'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('protected branch');
      }
    });
  });

  describe('development.checkpoint Tool', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    it('should create checkpoint successfully', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockFeatureBranch();
      
      const result = await client.callTool('development.checkpoint', {
        message: 'WIP: working on user profile'
      });
      
      expect(result.content[0].text).toContain('Committed changes with message: WIP: working on user profile');
    });

    it('should handle no changes error', async () => {
      gitMock.mockCleanRepo();
      gitMock.mockFeatureBranch();
      
      try {
        await client.callTool('development.checkpoint', {
          message: 'test commit'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('No changes to commit');
      }
    });

    it('should handle protected branch error', async () => {
      gitMock.mockUncommittedChanges();
      gitMock.mockProtectedBranch();
      
      try {
        await client.callTool('development.checkpoint', {
          message: 'test commit'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('protected branch');
      }
    });
  });

  describe('Tool Parameter Validation', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    it('should handle missing required parameters', async () => {
      try {
        await client.callTool('development.create_branch', {
          name: 'test'
          // missing type and message
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    it('should handle invalid tool name', async () => {
      try {
        await client.callTool('development.invalid_tool');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('Unknown tool');
      }
    });
  });
});