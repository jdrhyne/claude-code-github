import { getFileSystemMock, getGitMock, getGitHubMock } from './persistent-mock.js';

export function createTestProjectPath(): string {
  return '/tmp/test-project';
}

export function createTestConfig(projectPath: string = createTestProjectPath()) {
  return {
    git_workflow: {
      main_branch: 'main',
      protected_branches: ['main', 'develop'],
      branch_prefixes: {
        feature: 'feature/',
        bugfix: 'bugfix/',
        refactor: 'refactor/'
      }
    },
    projects: [
      {
        path: projectPath,
        github_repo: 'test-user/test-repo',
        reviewers: ['reviewer1', 'reviewer2']
      }
    ]
  };
}

export function setupTestProject(projectPath: string = createTestProjectPath()) {
  const fsMock = getFileSystemMock();
  const gitMock = getGitMock();
  
  fsMock.mockProjectDirectory(projectPath);
  gitMock.mockUncommittedChanges();
  gitMock.mockFeatureBranch();
  
  return projectPath;
}

export function setupCleanProject(projectPath: string = createTestProjectPath()) {
  const fsMock = getFileSystemMock();
  const gitMock = getGitMock();
  
  fsMock.mockProjectDirectory(projectPath);
  gitMock.mockCleanRepo();
  gitMock.mockFeatureBranch();
  
  return projectPath;
}

export function setupProtectedBranch(projectPath: string = createTestProjectPath()) {
  const fsMock = getFileSystemMock();
  const gitMock = getGitMock();
  
  fsMock.mockProjectDirectory(projectPath);
  gitMock.mockProtectedBranch();
  
  return projectPath;
}

export function mockSuccessfulGitOperations() {
  const gitMock = getGitMock();
  const mockGit = gitMock.createMockGit();
  
  return mockGit;
}

export function mockSuccessfulGitHubOperations() {
  const githubMock = getGitHubMock();
  
  githubMock.mockValidToken();
  githubMock.mockPullRequestCreation({
    number: 456,
    html_url: 'https://github.com/test-user/test-repo/pull/456'
  });
  
  return githubMock.createMockOctokit();
}

export function expectValidDevelopmentStatus(result: any) {
  expect(result).toHaveProperty('branch');
  expect(result).toHaveProperty('is_protected');
  expect(typeof result.branch).toBe('string');
  expect(typeof result.is_protected).toBe('boolean');
  
  if (result.uncommitted_changes) {
    expect(result.uncommitted_changes).toHaveProperty('file_count');
    expect(result.uncommitted_changes).toHaveProperty('diff_summary');
    expect(result.uncommitted_changes).toHaveProperty('files_changed');
    expect(Array.isArray(result.uncommitted_changes.files_changed)).toBe(true);
  }
}

export function expectValidFileChange(fileChange: any) {
  expect(fileChange).toHaveProperty('file');
  expect(fileChange).toHaveProperty('status');
  expect(typeof fileChange.file).toBe('string');
  expect(['Added', 'Modified', 'Deleted', 'Renamed']).toContain(fileChange.status);
}

export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

export function createMockEnvironment() {
  process.env.NODE_ENV = 'test';
  process.env.CI = 'true';
  
  const originalCwd = process.cwd();
  const testCwd = createTestProjectPath();
  
  Object.defineProperty(process, 'cwd', {
    value: () => testCwd,
    configurable: true
  });
  
  return {
    restore: () => {
      Object.defineProperty(process, 'cwd', {
        value: () => originalCwd,
        configurable: true
      });
      delete process.env.NODE_ENV;
      delete process.env.CI;
    }
  };
}