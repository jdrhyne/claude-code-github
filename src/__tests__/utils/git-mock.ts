import { vi } from 'vitest';
import { StatusResult } from 'simple-git';

export interface MockGitStatus {
  current: string;
  isClean: () => boolean;
  modified: string[];
  created: string[];
  deleted: string[];
  renamed: Array<{ from: string; to: string }>;
  staged: string[];
  not_added: string[];
}

export class GitMock {
  private mockStatus: MockGitStatus = {
    current: 'main',
    isClean: () => true,
    modified: [],
    created: [],
    deleted: [],
    renamed: [],
    staged: [],
    not_added: []
  };

  private mockRemotes = [
    {
      name: 'origin',
      refs: {
        fetch: 'https://github.com/test-user/test-repo.git',
        push: 'https://github.com/test-user/test-repo.git'
      }
    }
  ];

  setStatus(status: Partial<MockGitStatus>) {
    this.mockStatus = { ...this.mockStatus, ...status };
  }

  setRemotes(remotes: any[]) {
    this.mockRemotes = remotes;
  }

  createMockGit() {
    return {
      status: vi.fn().mockResolvedValue(this.mockStatus),
      diff: vi.fn().mockResolvedValue('mock diff content'),
      checkoutLocalBranch: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      push: vi.fn().mockResolvedValue(undefined),
      getRemotes: vi.fn().mockResolvedValue(this.mockRemotes)
    };
  }

  mockUncommittedChanges() {
    this.setStatus({
      isClean: () => false,
      modified: ['src/file1.ts', 'src/file2.ts'],
      created: ['src/new-file.ts'],
      deleted: ['src/old-file.ts'],
      not_added: ['src/untracked.ts']
    });
  }

  mockCleanRepo() {
    this.setStatus({
      isClean: () => true,
      modified: [],
      created: [],
      deleted: [],
      renamed: [],
      staged: [],
      not_added: []
    });
  }

  mockProtectedBranch() {
    this.setStatus({
      current: 'main'
    });
  }

  mockFeatureBranch() {
    this.setStatus({
      current: 'feature/test-branch'
    });
  }
}