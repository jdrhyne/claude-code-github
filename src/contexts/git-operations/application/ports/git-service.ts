import { Changes } from '../../domain/value-objects/changes.js';
import { CommitInfo } from '../../domain/types.js';

/**
 * Interface for Git operations
 */
export interface GitService {
  /**
   * Create and checkout a new branch
   */
  createBranch(repoPath: string, branchName: string): Promise<void>;

  /**
   * Checkout an existing branch
   */
  checkoutBranch(repoPath: string, branchName: string): Promise<void>;

  /**
   * Stage all changes
   */
  stageAll(repoPath: string): Promise<void>;

  /**
   * Create a commit
   */
  commit(repoPath: string, message: string): Promise<string>;

  /**
   * Get current branch name
   */
  getCurrentBranch(repoPath: string): Promise<string>;

  /**
   * Get uncommitted changes
   */
  getUncommittedChanges(repoPath: string): Promise<Changes>;

  /**
   * Get last commit info
   */
  getLastCommit(repoPath: string): Promise<CommitInfo | null>;

  /**
   * List all branches
   */
  listBranches(repoPath: string): Promise<string[]>;

  /**
   * Push to remote
   */
  push(repoPath: string, branch: string, setUpstream?: boolean): Promise<void>;
}