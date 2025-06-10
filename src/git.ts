import { simpleGit, SimpleGit, StatusResult } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs/promises';
import { FileChange, UncommittedChanges, DeploymentInfo } from './types.js';

export class GitManager {
  private gitInstances: Map<string, SimpleGit> = new Map();

  private getGit(projectPath: string): SimpleGit {
    if (!this.gitInstances.has(projectPath)) {
      this.gitInstances.set(projectPath, simpleGit(projectPath));
    }
    return this.gitInstances.get(projectPath)!;
  }

  async getCurrentBranch(projectPath: string): Promise<string> {
    const git = this.getGit(projectPath);
    const status = await git.status();
    return status.current || 'main';
  }

  async getUncommittedChanges(projectPath: string): Promise<UncommittedChanges | null> {
    const git = this.getGit(projectPath);
    const status = await git.status();

    const allFiles = [
      ...status.modified,
      ...status.created,
      ...status.deleted,
      ...status.renamed.map(r => r.to),
      ...status.staged,
      ...status.not_added
    ];

    if (allFiles.length === 0) {
      return null;
    }

    const files_changed: FileChange[] = [];
    
    for (const file of status.modified) {
      files_changed.push({ file, status: 'Modified' });
    }
    
    for (const file of status.created) {
      files_changed.push({ file, status: 'Added' });
    }
    
    for (const file of status.deleted) {
      files_changed.push({ file, status: 'Deleted' });
    }
    
    for (const rename of status.renamed) {
      files_changed.push({ file: rename.to, status: 'Renamed' });
    }

    for (const file of status.not_added) {
      files_changed.push({ file, status: 'Added' });
    }

    let diff_summary = '';
    try {
      const diff = await git.diff(['--no-color']);
      const diffLines = diff.split('\n');
      const maxLines = 50;
      
      if (diffLines.length > maxLines) {
        diff_summary = diffLines.slice(0, maxLines).join('\n') + '\n... (truncated)';
      } else {
        diff_summary = diff;
      }
    } catch (error) {
      diff_summary = 'Error generating diff';
    }

    return {
      file_count: allFiles.length,
      diff_summary,
      files_changed
    };
  }

  async createBranch(projectPath: string, branchName: string): Promise<void> {
    const git = this.getGit(projectPath);
    await git.checkoutLocalBranch(branchName);
  }

  async commitChanges(projectPath: string, message: string): Promise<void> {
    const git = this.getGit(projectPath);
    await git.add('.');
    await git.commit(message);
  }

  async pushBranch(projectPath: string, branchName: string): Promise<void> {
    const git = this.getGit(projectPath);
    await git.push('origin', branchName, ['--set-upstream']);
  }

  async getRemoteUrl(projectPath: string): Promise<string | null> {
    const git = this.getGit(projectPath);
    try {
      const remotes = await git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');
      return origin?.refs?.fetch || null;
    } catch (error) {
      return null;
    }
  }

  async isGitRepository(projectPath: string): Promise<boolean> {
    const git = this.getGit(projectPath);
    try {
      await git.status();
      return true;
    } catch (error) {
      return false;
    }
  }

  async isWorkingDirectoryClean(projectPath: string): Promise<boolean> {
    const git = this.getGit(projectPath);
    const status = await git.status();
    return status.isClean();
  }

  parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    const patterns = [
      /github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/,
      /github\.com\/([^/]+)\/([^/.]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2]
        };
      }
    }

    return null;
  }

  async validateRemoteMatchesConfig(projectPath: string, expectedRepo: string): Promise<boolean> {
    const remoteUrl = await this.getRemoteUrl(projectPath);
    if (!remoteUrl) {
      return false;
    }

    const parsed = this.parseGitHubUrl(remoteUrl);
    if (!parsed) {
      return false;
    }

    const actualRepo = `${parsed.owner}/${parsed.repo}`;
    return actualRepo === expectedRepo;
  }

  async hasUpstreamBranch(projectPath: string, branchName: string): Promise<boolean> {
    const git = this.getGit(projectPath);
    try {
      const remotes = await git.branch(['-r']);
      return remotes.all.includes(`origin/${branchName}`);
    } catch (error) {
      return false;
    }
  }

  async hasUnpushedCommits(projectPath: string, branchName: string): Promise<boolean> {
    const git = this.getGit(projectPath);
    try {
      const log = await git.log([`origin/${branchName}..${branchName}`]);
      return log.total > 0;
    } catch (error) {
      // If we can't compare with origin, assume we have unpushed commits
      return true;
    }
  }

  async detectGitHubWorkflows(projectPath: string): Promise<string[]> {
    const workflowsPath = path.join(projectPath, '.github', 'workflows');
    try {
      const files = await fs.readdir(workflowsPath);
      return files.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    } catch (error) {
      return [];
    }
  }

  async detectDeployment(projectPath: string, commitMessage: string, branch: string, mainBranch: string): Promise<DeploymentInfo> {
    const deployment: DeploymentInfo = {
      should_deploy: false
    };

    // Check if we're on main/master branch
    if (branch === mainBranch) {
      deployment.should_deploy = true;
      deployment.reason = 'Commit on main branch';
    }

    // Check for version bump in package.json
    try {
      const packagePath = path.join(projectPath, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      // Check if package.json was modified in the last commit
      const git = this.getGit(projectPath);
      const diff = await git.diff(['HEAD~1', 'HEAD', '--', 'package.json']);
      
      if (diff) {
        const versionMatch = diff.match(/-\s*"version":\s*"([^"]+)"\s*\+\s*"version":\s*"([^"]+)"/);
        if (versionMatch) {
          deployment.version_bump = {
            from: versionMatch[1],
            to: versionMatch[2]
          };
          deployment.should_deploy = true;
          deployment.reason = `Version bump from ${versionMatch[1]} to ${versionMatch[2]}`;
        }
      }
    } catch (error) {
      // Ignore if package.json doesn't exist or can't be parsed
    }

    // Check for deployment-triggering commit patterns
    const deploymentPatterns = [
      /^(feat|fix|perf)(\(.+\))?:/,  // Conventional commits that typically trigger releases
      /^release:/,                     // Explicit release commits
      /^v\d+\.\d+\.\d+/,              // Version tag commits
      /\[deploy\]/,                    // Explicit deploy markers
      /\[release\]/                    // Explicit release markers
    ];

    for (const pattern of deploymentPatterns) {
      if (pattern.test(commitMessage)) {
        deployment.should_deploy = true;
        deployment.reason = deployment.reason || `Deployment-triggering commit pattern: ${pattern}`;
        break;
      }
    }

    // Detect available workflows
    deployment.workflows = await this.detectGitHubWorkflows(projectPath);

    return deployment;
  }

  async getLastCommitMessage(projectPath: string): Promise<string> {
    const git = this.getGit(projectPath);
    const log = await git.log(['-1']);
    return log.latest?.message || '';
  }
}