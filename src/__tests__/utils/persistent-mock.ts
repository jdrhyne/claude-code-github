import { GitMock } from './git-mock.js';
import { GitHubMock } from './github-mock.js';
import { FileSystemMock } from './fs-mock.js';
import { vi } from 'vitest';

interface SharedMock {
  gitMock: GitMock;
  githubMock: GitHubMock;
  fsMock: FileSystemMock;
}

let sharedMock: SharedMock | null = null;

export async function getSharedMock(): Promise<SharedMock> {
  if (sharedMock) {
    return sharedMock;
  }

  const gitMock = new GitMock();
  const githubMock = new GitHubMock();
  const fsMock = new FileSystemMock();

  vi.mock('simple-git', () => ({
    simpleGit: vi.fn(() => gitMock.createMockGit())
  }));

  vi.mock('octokit', () => ({
    Octokit: vi.fn(() => githubMock.createMockOctokit())
  }));

  vi.mock('keytar', () => githubMock.createMockKeytar());

  vi.mock('node:fs', () => fsMock.createMockFS());
  vi.mock('fs', () => fsMock.createMockFS());

  vi.mock('chokidar', () => ({
    watch: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      close: vi.fn()
    }))
  }));

  fsMock.mockProjectDirectory('/tmp/test-project');

  sharedMock = {
    gitMock,
    githubMock,
    fsMock
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