import { GitMock } from './git-mock.js';
import { GitHubMock } from './github-mock.js';
import { FileSystemMock } from './fs-mock.js';
import { vi } from 'vitest';
import * as os from 'os';
import * as path from 'path';

interface SharedMock {
  gitMock: GitMock;
  githubMock: GitHubMock;
  fsMock: FileSystemMock;
}

let sharedMock: SharedMock | null = null;

// Create instances at module level to ensure they exist when mocks are hoisted
const gitMockInstance = new GitMock();
const githubMockInstance = new GitHubMock();
const fsMockInstance = new FileSystemMock();

// These will be hoisted to the top of the file
vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => gitMockInstance.createMockGit())
}));

vi.mock('octokit', () => ({
  Octokit: vi.fn(() => githubMockInstance.createMockOctokit())
}));

// More mocks that need to be hoisted
vi.mock('keytar', () => githubMockInstance.createMockKeytar());
vi.mock('node:fs', () => fsMockInstance.createMockFS());
vi.mock('fs', () => fsMockInstance.createMockFS());
vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn()
  }))
}));

export async function getSharedMock(): Promise<SharedMock> {
  if (sharedMock) {
    return sharedMock;
  }

  // Ensure config file exists before any tests run
  fsMockInstance.mockConfigExists(true);
  fsMockInstance.mockProjectDirectory(path.join(os.tmpdir(), 'claude-code-github-test', 'test-project'));

  sharedMock = {
    gitMock: gitMockInstance,
    githubMock: githubMockInstance,
    fsMock: fsMockInstance
  };

  return sharedMock;
}

export async function cleanupSharedMock(): Promise<void> {
  if (sharedMock) {
    vi.clearAllMocks();
    vi.resetModules();
    sharedMock = null;
  }
}

export function getGitMock(): GitMock {
  if (!sharedMock) {
    throw new Error('Shared mock not initialized. Call getSharedMock() first.');
  }
  return sharedMock.gitMock;
}

export function getGitHubMock(): GitHubMock {
  if (!sharedMock) {
    throw new Error('Shared mock not initialized. Call getSharedMock() first.');
  }
  return sharedMock.githubMock;
}

export function getFileSystemMock(): FileSystemMock {
  if (!sharedMock) {
    throw new Error('Shared mock not initialized. Call getSharedMock() first.');
  }
  return sharedMock.fsMock;
}