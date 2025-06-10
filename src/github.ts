import { Octokit } from 'octokit';
import * as keytar from 'keytar';
import * as readline from 'readline';
import { GitHubError } from './errors.js';
import chalk from 'chalk';
import type { 
  PullRequestStatus, 
  IssueDetails, 
  ReleaseInfo,
  UpdatePullRequestParams,
  ListIssuesParams,
  CreateReleaseParams
} from './types.js';

export class GitHubManager {
  private octokit: Octokit | null = null;
  private static readonly SERVICE_NAME = 'claude-code-github';
  private static readonly ACCOUNT_NAME = 'github-token';

  async getOctokit(): Promise<Octokit> {
    if (this.octokit) {
      return this.octokit;
    }

    const token = await this.getToken();
    this.octokit = new Octokit({ auth: token });
    return this.octokit;
  }

  private async getToken(): Promise<string> {
    let token = await keytar.getPassword(GitHubManager.SERVICE_NAME, GitHubManager.ACCOUNT_NAME);
    
    if (!token) {
      token = await this.promptForToken();
      await keytar.setPassword(GitHubManager.SERVICE_NAME, GitHubManager.ACCOUNT_NAME, token);
    }

    return token;
  }

  private async promptForToken(): Promise<string> {
    console.error(chalk.yellow('\n⚠️  GitHub Personal Access Token required'));
    console.error(chalk.gray('Please create a token with the following scopes:'));
    console.error(chalk.cyan('  • repo') + chalk.gray(' (Full control of private repositories)'));
    console.error(chalk.cyan('  • workflow') + chalk.gray(' (Update GitHub Action workflows)'));
    console.error('');
    console.error(chalk.gray('Create your token at: ') + chalk.cyan('https://github.com/settings/tokens/new'));
    console.error('');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr
    });

    return new Promise((resolve) => {
      rl.question('Enter your GitHub token: ', (token) => {
        rl.close();
        resolve(token.trim());
      });
    });
  }

  async validateToken(): Promise<boolean> {
    try {
      const octokit = await this.getOctokit();
      await octokit.rest.users.getAuthenticated();
      return true;
    } catch (error) {
      await keytar.deletePassword(GitHubManager.SERVICE_NAME, GitHubManager.ACCOUNT_NAME);
      this.octokit = null;
      return false;
    }
  }

  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string,
    isDraft: boolean = true,
    reviewers?: string[]
  ) {
    const octokit = await this.getOctokit();
    
    const pr = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      body,
      head,
      base,
      draft: isDraft
    });

    if (reviewers && reviewers.length > 0) {
      await octokit.rest.pulls.requestReviewers({
        owner,
        repo,
        pull_number: pr.data.number,
        reviewers
      });
    }

    return pr.data;
  }

  async getRepository(owner: string, repo: string) {
    const octokit = await this.getOctokit();
    return await octokit.rest.repos.get({ owner, repo });
  }

  parseRepoUrl(githubRepo: string): { owner: string; repo: string } {
    const parts = githubRepo.split('/');
    if (parts.length !== 2) {
      throw new GitHubError(
        `Invalid GitHub repository format: ${githubRepo}`,
        'Use format "owner/repo", e.g., "facebook/react"'
      );
    }
    
    return {
      owner: parts[0],
      repo: parts[1]
    };
  }

  async getLatestWorkflowRuns(
    owner: string,
    repo: string,
    branch: string,
    limit: number = 5
  ): Promise<Array<{ name: string; url: string; status?: string }>> {
    const octokit = await this.getOctokit();
    
    try {
      const response = await octokit.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        branch,
        per_page: limit
      });

      return response.data.workflow_runs.map(run => ({
        name: run.name || 'Unknown Workflow',
        url: run.html_url,
        status: run.status || undefined
      }));
    } catch (error) {
      // Non-critical - return empty array if we can't get workflow runs
      return [];
    }
  }

  async getActivePullRequests(
    owner: string,
    repo: string,
    options?: {
      state?: 'open' | 'closed' | 'all';
      head?: string;
      base?: string;
    }
  ): Promise<Array<{
    number: number;
    title: string;
    state: string;
    draft: boolean;
    author: string;
    reviewStatus: string;
    url: string;
    createdAt: string;
  }>> {
    const octokit = await this.getOctokit();
    
    try {
      const response = await octokit.rest.pulls.list({
        owner,
        repo,
        state: options?.state || 'open',
        head: options?.head,
        base: options?.base,
        per_page: 10
      });

      const prs = await Promise.all(response.data.map(async (pr) => {
        // Get review status
        let reviewStatus = 'pending';
        try {
          const reviews = await octokit.rest.pulls.listReviews({
            owner,
            repo,
            pull_number: pr.number
          });
          
          const latestReviews = new Map();
          reviews.data.forEach(review => {
            if (!latestReviews.has(review.user?.login) || 
                new Date(review.submitted_at!) > new Date(latestReviews.get(review.user?.login).submitted_at!)) {
              latestReviews.set(review.user?.login, review);
            }
          });

          const states = Array.from(latestReviews.values()).map(r => r.state);
          if (states.includes('CHANGES_REQUESTED')) {
            reviewStatus = 'changes_requested';
          } else if (states.includes('APPROVED')) {
            reviewStatus = 'approved';
          } else if (states.length > 0) {
            reviewStatus = 'reviewed';
          }
        } catch (error) {
          // Ignore review fetch errors
        }

        return {
          number: pr.number,
          title: pr.title,
          state: pr.state,
          draft: pr.draft || false,
          author: pr.user?.login || 'unknown',
          reviewStatus,
          url: pr.html_url,
          createdAt: new Date(pr.created_at).toLocaleDateString()
        };
      }));

      return prs;
    } catch (error) {
      return [];
    }
  }

  async getUserIssues(
    owner: string,
    repo: string,
    username?: string
  ): Promise<Array<{
    number: number;
    title: string;
    state: string;
    labels: string[];
    url: string;
  }>> {
    const octokit = await this.getOctokit();
    
    try {
      const user = username || (await octokit.rest.users.getAuthenticated()).data.login;
      
      const response = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        assignee: user,
        state: 'open',
        per_page: 10
      });

      return response.data
        .filter(issue => !issue.pull_request) // Exclude PRs
        .map(issue => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          labels: issue.labels.map(l => typeof l === 'string' ? l : l.name || ''),
          url: issue.html_url
        }));
    } catch (error) {
      return [];
    }
  }

  // Enhanced PR Management Methods
  async updatePullRequest(
    owner: string,
    repo: string,
    params: UpdatePullRequestParams
  ): Promise<void> {
    const octokit = await this.getOctokit();
    
    // Update PR details
    if (params.title !== undefined || params.body !== undefined || params.draft !== undefined) {
      await octokit.rest.pulls.update({
        owner,
        repo,
        pull_number: params.pr_number,
        title: params.title,
        body: params.body,
        draft: params.draft
      });
    }

    // Update reviewers
    if (params.reviewers) {
      await octokit.rest.pulls.requestReviewers({
        owner,
        repo,
        pull_number: params.pr_number,
        reviewers: params.reviewers
      });
    }

    // Update labels
    if (params.labels) {
      await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: params.pr_number,
        labels: params.labels
      });
    }
  }

  async getPullRequestStatus(
    owner: string,
    repo: string,
    pr_number: number
  ): Promise<PullRequestStatus> {
    const octokit = await this.getOctokit();
    
    const [pr, reviews, checks] = await Promise.all([
      octokit.rest.pulls.get({ owner, repo, pull_number: pr_number }),
      octokit.rest.pulls.listReviews({ owner, repo, pull_number: pr_number }),
      octokit.rest.checks.listForRef({ owner, repo, ref: `pull/${pr_number}/head` }).catch(() => null)
    ]);

    // Process reviews
    const reviewerMap = new Map<string, string>();
    reviews.data.forEach(review => {
      if (review.user && review.state && review.state !== 'COMMENTED') {
        reviewerMap.set(review.user.login, review.state);
      }
    });

    // Process checks
    let checkStatus: PullRequestStatus['checks'] | undefined;
    if (checks) {
      const checkRuns = checks.data.check_runs;
      checkStatus = {
        status: checkRuns.every(c => c.status === 'completed') ? 
          (checkRuns.every(c => c.conclusion === 'success') ? 'success' : 'failure') : 
          'pending',
        total: checkRuns.length,
        passed: checkRuns.filter(c => c.conclusion === 'success').length,
        failed: checkRuns.filter(c => c.conclusion === 'failure').length,
        pending: checkRuns.filter(c => c.status !== 'completed').length
      };
    }

    return {
      number: pr.data.number,
      title: pr.data.title,
      state: pr.data.state as 'open' | 'closed' | 'merged',
      draft: pr.data.draft || false,
      url: pr.data.html_url,
      created_at: pr.data.created_at,
      updated_at: pr.data.updated_at,
      author: pr.data.user?.login || 'unknown',
      reviewers: Array.from(reviewerMap.entries()).map(([login, state]) => ({
        login,
        state: state as any
      })),
      labels: pr.data.labels.map(l => typeof l === 'string' ? l : l.name || ''),
      checks: checkStatus,
      mergeable: pr.data.mergeable || false,
      mergeable_state: pr.data.mergeable_state || undefined,
      commits: pr.data.commits,
      additions: pr.data.additions,
      deletions: pr.data.deletions,
      changed_files: pr.data.changed_files
    };
  }

  async generatePRDescription(
    owner: string,
    repo: string,
    base: string,
    head: string,
    template?: string
  ): Promise<string> {
    const octokit = await this.getOctokit();
    
    // Get commits between base and head
    const comparison = await octokit.rest.repos.compareCommits({
      owner,
      repo,
      base,
      head
    });

    const commits = comparison.data.commits;
    
    // Build description
    let description = '';
    
    if (template) {
      description = template;
    } else {
      description = '## Summary\n\n';
      description += '<!-- Please provide a brief description of your changes -->\n\n';
      
      if (commits.length > 0) {
        description += '## Changes\n\n';
        
        // Group commits by type if they follow conventional commits
        const features: string[] = [];
        const fixes: string[] = [];
        const other: string[] = [];
        
        commits.forEach(commit => {
          const message = commit.commit.message;
          const firstLine = message.split('\n')[0];
          
          if (firstLine.startsWith('feat:') || firstLine.startsWith('feat(')) {
            features.push(`- ${firstLine}`);
          } else if (firstLine.startsWith('fix:') || firstLine.startsWith('fix(')) {
            fixes.push(`- ${firstLine}`);
          } else {
            other.push(`- ${firstLine}`);
          }
        });
        
        if (features.length > 0) {
          description += '### Features\n' + features.join('\n') + '\n\n';
        }
        if (fixes.length > 0) {
          description += '### Bug Fixes\n' + fixes.join('\n') + '\n\n';
        }
        if (other.length > 0) {
          description += '### Other Changes\n' + other.join('\n') + '\n\n';
        }
      }
      
      description += '## Testing\n\n';
      description += '<!-- Describe how these changes were tested -->\n\n';
      description += '## Checklist\n\n';
      description += '- [ ] Tests pass\n';
      description += '- [ ] Documentation updated (if needed)\n';
      description += '- [ ] Changes are backwards compatible\n';
    }
    
    return description;
  }

  // Issue Integration Methods
  async getIssue(
    owner: string,
    repo: string,
    issue_number: number
  ): Promise<IssueDetails> {
    const octokit = await this.getOctokit();
    
    const issue = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number
    });

    return {
      number: issue.data.number,
      title: issue.data.title,
      state: issue.data.state as 'open' | 'closed',
      body: issue.data.body || undefined,
      labels: issue.data.labels.map(l => typeof l === 'string' ? l : l.name || ''),
      assignees: issue.data.assignees?.map(a => a.login) || [],
      milestone: issue.data.milestone ? {
        title: issue.data.milestone.title,
        due_on: issue.data.milestone.due_on || undefined
      } : undefined,
      created_at: issue.data.created_at,
      updated_at: issue.data.updated_at,
      closed_at: issue.data.closed_at || undefined,
      url: issue.data.html_url,
      pull_request: issue.data.pull_request ? {
        url: issue.data.pull_request.html_url || '',
        merged_at: issue.data.pull_request.merged_at || undefined
      } : undefined
    };
  }

  async listIssues(
    owner: string,
    repo: string,
    params: ListIssuesParams = {}
  ): Promise<IssueDetails[]> {
    const octokit = await this.getOctokit();
    
    const response = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: params.state || 'open',
      labels: params.labels?.join(','),
      assignee: params.assignee,
      milestone: params.milestone,
      sort: params.sort || 'created',
      direction: params.direction || 'desc',
      per_page: params.limit || 30
    });

    return response.data
      .filter(issue => !issue.pull_request) // Exclude PRs
      .map(issue => ({
        number: issue.number,
        title: issue.title,
        state: issue.state as 'open' | 'closed',
        body: issue.body || undefined,
        labels: issue.labels.map(l => typeof l === 'string' ? l : l.name || ''),
        assignees: issue.assignees?.map(a => a.login) || [],
        milestone: issue.milestone ? {
          title: issue.milestone.title,
          due_on: issue.milestone.due_on || undefined
        } : undefined,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        closed_at: issue.closed_at || undefined,
        url: issue.html_url
      }));
  }

  async updateIssue(
    owner: string,
    repo: string,
    issue_number: number,
    options: {
      comment?: string;
      state?: 'open' | 'closed';
      labels?: string[];
    }
  ): Promise<void> {
    const octokit = await this.getOctokit();
    
    // Add comment if provided
    if (options.comment) {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number,
        body: options.comment
      });
    }

    // Update state or labels if provided
    if (options.state !== undefined || options.labels !== undefined) {
      await octokit.rest.issues.update({
        owner,
        repo,
        issue_number,
        state: options.state,
        labels: options.labels
      });
    }
  }

  // Release Management Methods
  async createRelease(
    owner: string,
    repo: string,
    params: CreateReleaseParams
  ): Promise<ReleaseInfo> {
    const octokit = await this.getOctokit();
    
    const release = await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: params.tag_name,
      name: params.name || params.tag_name,
      body: params.body,
      draft: params.draft || false,
      prerelease: params.prerelease || false,
      target_commitish: params.target_commitish,
      generate_release_notes: params.generate_release_notes
    });

    return {
      id: release.data.id,
      tag_name: release.data.tag_name,
      name: release.data.name || release.data.tag_name,
      body: release.data.body || undefined,
      draft: release.data.draft,
      prerelease: release.data.prerelease,
      created_at: release.data.created_at,
      published_at: release.data.published_at || undefined,
      url: release.data.html_url,
      assets: release.data.assets.map(asset => ({
        name: asset.name,
        size: asset.size,
        download_url: asset.browser_download_url
      }))
    };
  }

  async getLatestRelease(
    owner: string,
    repo: string
  ): Promise<ReleaseInfo | null> {
    const octokit = await this.getOctokit();
    
    try {
      const release = await octokit.rest.repos.getLatestRelease({
        owner,
        repo
      });

      return {
        id: release.data.id,
        tag_name: release.data.tag_name,
        name: release.data.name || release.data.tag_name,
        body: release.data.body || undefined,
        draft: release.data.draft,
        prerelease: release.data.prerelease,
        created_at: release.data.created_at,
        published_at: release.data.published_at || undefined,
        url: release.data.html_url,
        assets: release.data.assets.map(asset => ({
          name: asset.name,
          size: asset.size,
          download_url: asset.browser_download_url
        }))
      };
    } catch (error) {
      return null;
    }
  }

  async listReleases(
    owner: string,
    repo: string,
    limit: number = 10
  ): Promise<ReleaseInfo[]> {
    const octokit = await this.getOctokit();
    
    const releases = await octokit.rest.repos.listReleases({
      owner,
      repo,
      per_page: limit
    });

    return releases.data.map(release => ({
      id: release.id,
      tag_name: release.tag_name,
      name: release.name || release.tag_name,
      body: release.body || undefined,
      draft: release.draft,
      prerelease: release.prerelease,
      created_at: release.created_at,
      published_at: release.published_at || undefined,
      url: release.html_url,
      assets: release.assets.map(asset => ({
        name: asset.name,
        size: asset.size,
        download_url: asset.browser_download_url
      }))
    }));
  }
}