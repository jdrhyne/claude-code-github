import { vi } from 'vitest';

export class GitHubMock {
  private mockToken = 'mock-github-token';
  private mockPullRequest = {
    number: 123,
    html_url: 'https://github.com/test-user/test-repo/pull/123',
    data: {
      number: 123,
      html_url: 'https://github.com/test-user/test-repo/pull/123'
    }
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
            create: vi.fn().mockResolvedValue(this.mockPullRequest),
            requestReviewers: vi.fn().mockResolvedValue({})
          },
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: 'test-repo',
                full_name: 'test-user/test-repo',
                default_branch: 'main'
              }
            })
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

  mockPullRequestCreation(pr: Partial<typeof this.mockPullRequest>) {
    this.mockPullRequest = { ...this.mockPullRequest, ...pr };
  }
}