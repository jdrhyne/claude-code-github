import { Octokit } from 'octokit';
import * as keytar from 'keytar';
import * as readline from 'readline';

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
    console.error('\nGitHub Personal Access Token required.');
    console.error('Please create a token at: https://github.com/settings/tokens/new');
    console.error('Required scopes: repo, workflow');
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
      throw new Error(`Invalid GitHub repository format: ${githubRepo}. Expected format: owner/repo`);
    }
    
    return {
      owner: parts[0],
      repo: parts[1]
    };
  }
}