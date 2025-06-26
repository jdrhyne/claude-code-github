import { GitService } from '../application/ports/git-service.js';
import { GitManager } from '../../../git.js';
import { Changes } from '../domain/value-objects/changes.js';
import { CommitInfo, FileChange, FileChangeStatus } from '../domain/types.js';

/**
 * Implementation of GitService using GitManager
 */
export class GitServiceImpl implements GitService {
  constructor(private readonly gitManager: GitManager) {}

  async createBranch(repoPath: string, branchName: string): Promise<void> {
    await this.gitManager.checkoutBranch(repoPath, branchName, true);
  }

  async checkoutBranch(repoPath: string, branchName: string): Promise<void> {
    await this.gitManager.checkoutBranch(repoPath, branchName, false);
  }

  async stageAll(repoPath: string): Promise<void> {
    await this.gitManager.add(repoPath, '.');
  }

  async commit(repoPath: string, message: string): Promise<string> {
    const result = await this.gitManager.commit(repoPath, message);
    // Extract commit hash from result
    const match = result.match(/\[[\w-]+ ([\w]+)\]/);
    return match ? match[1] : 'unknown';
  }

  async getCurrentBranch(repoPath: string): Promise<string> {
    const status = await this.gitManager.status(repoPath);
    return status.current;
  }

  async getUncommittedChanges(repoPath: string): Promise<Changes> {
    const status = await this.gitManager.status(repoPath);
    
    const files: FileChange[] = [];

    // Map Git status to domain model
    const mapStatus = (gitStatus: string): FileChangeStatus => {
      switch (gitStatus) {
        case 'M': return FileChangeStatus.MODIFIED;
        case 'A': return FileChangeStatus.ADDED;
        case 'D': return FileChangeStatus.DELETED;
        case 'R': return FileChangeStatus.RENAMED;
        case 'C': return FileChangeStatus.COPIED;
        case '?': return FileChangeStatus.UNTRACKED;
        default: return FileChangeStatus.MODIFIED;
      }
    };

    // Add modified files
    if (status.modified) {
      status.modified.forEach(file => {
        files.push({
          path: file,
          status: FileChangeStatus.MODIFIED
        });
      });
    }

    // Add created files
    if (status.created) {
      status.created.forEach(file => {
        files.push({
          path: file,
          status: FileChangeStatus.ADDED
        });
      });
    }

    // Add deleted files
    if (status.deleted) {
      status.deleted.forEach(file => {
        files.push({
          path: file,
          status: FileChangeStatus.DELETED
        });
      });
    }

    // Add renamed files
    if (status.renamed) {
      status.renamed.forEach(({ from, to }) => {
        files.push({
          path: to,
          status: FileChangeStatus.RENAMED,
          oldPath: from
        });
      });
    }

    // Add untracked files
    if (status.not_added) {
      status.not_added.forEach(file => {
        files.push({
          path: file,
          status: FileChangeStatus.UNTRACKED
        });
      });
    }

    return Changes.create(files);
  }

  async getLastCommit(repoPath: string): Promise<CommitInfo | null> {
    try {
      const log = await this.gitManager.log(repoPath, { n: 1 });
      if (!log.latest) {
        return null;
      }

      return {
        hash: log.latest.hash,
        shortHash: log.latest.hash.substring(0, 7),
        author: log.latest.author_name,
        email: log.latest.author_email,
        message: log.latest.message,
        timestamp: new Date(log.latest.date)
      };
    } catch (error) {
      return null;
    }
  }

  async listBranches(repoPath: string): Promise<string[]> {
    const result = await this.gitManager.branch(repoPath, []);
    return result.all;
  }

  async push(repoPath: string, branch: string, setUpstream?: boolean): Promise<void> {
    const args = setUpstream ? ['-u', 'origin', branch] : ['origin', branch];
    await this.gitManager.push(repoPath, args);
  }
}