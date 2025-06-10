import { simpleGit, SimpleGit, StatusResult } from 'simple-git';
import * as path from 'path';
import { FileChange, UncommittedChanges } from './types.js';

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
}