import { vi } from 'vitest';

export class GitHubMock {
  private mockToken = 'mock-github-token';
  private mockPullRequest = {
    number: 123,
    html_url: 'https://github.com/test-user/test-repo/pull/123'
  };
  private mockKeytarInstance: any = null;
  private mockOctokitInstance: any = null;

  createMockOctokit() {
    if (!this.mockOctokitInstance) {
      this.mockOctokitInstance = {
        rest: {
          users: {
            getAuthenticated: vi.fn().mockResolvedValue({ data: { login: 'test-user' } })
          },
          pulls: {
            create: vi.fn(() => Promise.resolve({ data: this.mockPullRequest })),
            requestReviewers: vi.fn().mockResolvedValue({}),
            list: vi.fn().mockResolvedValue({ data: [] }),
            listReviews: vi.fn().mockResolvedValue({ data: [] })
          },
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: 'test-repo',
                full_name: 'test-user/test-repo',
                default_branch: 'main'
              }
            })
          },
          issues: {
            get: vi.fn().mockResolvedValue({ data: { number: 1, title: 'Test Issue' } }),
            list: vi.fn().mockResolvedValue({ data: [] }),
            update: vi.fn().mockResolvedValue({ data: {} }),
            createComment: vi.fn().mockResolvedValue({ data: {} })
          },
          actions: {
            listWorkflowRunsForRepo: vi.fn().mockResolvedValue({ data: { workflow_runs: [] } })
          },
          releases: {
            create: vi.fn().mockResolvedValue({ data: {} }),
            getLatest: vi.fn().mockResolvedValue({ data: {} }),
            list: vi.fn().mockResolvedValue({ data: [] })
          }
        }
      };
    }
    return this.mockOctokitInstance;
  }

  createMockKeytar() {
    if (!this.mockKeytarInstance) {
      this.mockKeytarInstance = {
        getPassword: vi.fn(() => Promise.resolve(this.mockToken)),
        setPassword: vi.fn().mockResolvedValue(undefined),
        deletePassword: vi.fn().mockResolvedValue(true)
      };
    }
    return this.mockKeytarInstance;
  }

  mockValidToken() {
    this.mockToken = 'valid-token';
  }

  mockInvalidToken() {
    this.mockToken = '';
  }

  mockPullRequestCreation(pr: any) {
    Object.assign(this.mockPullRequest, pr);
    if (this.mockOctokitInstance) {
      this.mockOctokitInstance.rest.pulls.create = vi.fn().mockResolvedValue({ data: this.mockPullRequest });
    }
  }
  
  resetToDefaults() {
    this.mockToken = 'mock-github-token';
    this.mockPullRequest = {
      number: 123,
      html_url: 'https://github.com/test-user/test-repo/pull/123'
    };
    // Clear instances to force recreation
    this.mockKeytarInstance = null;
    this.mockOctokitInstance = null;
  }
}