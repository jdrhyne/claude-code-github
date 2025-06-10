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

  private mockGitInstance: any = null;

  setStatus(status: Partial<MockGitStatus>) {
    this.mockStatus = { ...this.mockStatus, ...status };
  }

  setRemotes(remotes: any[]) {
    this.mockRemotes = remotes;
  }

  createMockGit() {
    const self = this;
    if (!this.mockGitInstance) {
      this.mockGitInstance = {
        status: vi.fn(() => Promise.resolve(self.mockStatus)),
        diff: vi.fn().mockResolvedValue('mock diff content'),
        checkoutLocalBranch: vi.fn().mockResolvedValue(undefined),
        add: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        push: vi.fn().mockResolvedValue(undefined),
        getRemotes: vi.fn().mockImplementation((verbose) => {
          if (verbose) {
            return Promise.resolve(self.mockRemotes);
          }
          return Promise.resolve(self.mockRemotes.map(r => ({ name: r.name })));
        }),
        log: vi.fn().mockResolvedValue({ all: [], latest: null }),
        branch: vi.fn().mockResolvedValue({ all: ['main', 'feature/test'], current: 'main' })
      };
    }
    return this.mockGitInstance;
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

  clearMockInstance() {
    this.mockGitInstance = null;
  }
  
  resetToDefaults() {
    this.mockStatus = {
      current: 'main',
      isClean: () => true,
      modified: [],
      created: [],
      deleted: [],
      renamed: [],
      staged: [],
      not_added: []
    };
    
    this.mockRemotes = [
      {
        name: 'origin',
        refs: {
          fetch: 'https://github.com/test-user/test-repo.git',
          push: 'https://github.com/test-user/test-repo.git'
        }
      }
    ];
    
    // Clear instance to force recreation with new values
    this.clearMockInstance();
  }
}