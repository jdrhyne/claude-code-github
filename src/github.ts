import { Octokit } from 'octokit';
import * as keytar from 'keytar';
import * as readline from 'readline';
import { GitHubError } from './errors.js';
import chalk from 'chalk';

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
}