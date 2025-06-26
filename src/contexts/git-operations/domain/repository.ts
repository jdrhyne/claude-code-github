import { AggregateRoot } from '../../../shared/domain/aggregate-root.js';
import { Result } from '../../../shared/domain/result.js';
import { RepositoryId } from './value-objects/repository-id.js';
import { Branch } from './entities/branch.js';
import { Commit } from './entities/commit.js';
import { Changes } from './value-objects/changes.js';
import { RepositoryConfig, BranchType, RepositoryStatus } from './types.js';
import { BranchPrefixes } from './types.js';
import { GitEventFactory } from './events.js';
import { 
  ProtectedBranchError, 
  NoChangesToCommitError, 
  BranchAlreadyExistsError
} from './errors.js';

export interface GitRepositoryProps {
  path: string;
  config: RepositoryConfig;
  currentBranch: string;
  uncommittedChanges: Changes;
  branches: Map<string, Branch>;
}

/**
 * Git Repository Aggregate Root
 */
export class GitRepository extends AggregateRoot<string> {
  private props: GitRepositoryProps;

  private constructor(id: RepositoryId, props: GitRepositoryProps) {
    super(id.value);
    this.props = props;
  }

  get repositoryId(): RepositoryId {
    return RepositoryId.create(this._id).value;
  }

  get path(): string {
    return this.props.path;
  }

  get config(): RepositoryConfig {
    return { ...this.props.config };
  }

  get currentBranch(): string {
    return this.props.currentBranch;
  }

  get uncommittedChanges(): Changes {
    return this.props.uncommittedChanges;
  }

  get branches(): ReadonlyMap<string, Branch> {
    return new Map(this.props.branches);
  }

  /**
   * Check if currently on a protected branch
   */
  isOnProtectedBranch(): boolean {
    return this.props.config.protectedBranches.includes(this.props.currentBranch);
  }

  /**
   * Create a new branch
   */
  createBranch(params: {
    name: string;
    type: BranchType;
  }): Result<Branch> {
    // Validate we're not on a protected branch
    if (this.isOnProtectedBranch()) {
      const error = new ProtectedBranchError(this.props.currentBranch, 'create branch');
      return Result.fail<Branch>(error.message);
    }

    // Validate we have changes to commit
    if (this.props.uncommittedChanges.isEmpty()) {
      const error = new NoChangesToCommitError();
      return Result.fail<Branch>(error.message);
    }

    // Create the branch with appropriate prefix
    const branchResult = Branch.create({
      name: params.name,
      type: params.type,
      baseBranch: this.props.currentBranch,
      prefix: BranchPrefixes[params.type]
    });

    if (branchResult.isFailure) {
      return branchResult;
    }

    const branch = branchResult.value;

    // Check if branch already exists
    if (this.props.branches.has(branch.name.value)) {
      const error = new BranchAlreadyExistsError(branch.name.value);
      return Result.fail<Branch>(error.message);
    }

    // Add branch to repository
    this.props.branches.set(branch.name.value, branch);

    // Emit domain event
    this.addDomainEvent(GitEventFactory.branchCreated(
      this._id,
      {
        path: this.props.path,
        branchName: branch.name.value,
        branchType: params.type,
        baseBranch: this.props.currentBranch
      }
    ));

    return Result.ok(branch);
  }

  /**
   * Switch to a different branch
   */
  checkoutBranch(branchName: string): Result<void> {
    if (!this.props.branches.has(branchName)) {
      return Result.fail<void>('Branch does not exist');
    }

    if (!this.props.uncommittedChanges.isEmpty()) {
      return Result.fail<void>('Cannot switch branches with uncommitted changes');
    }

    const previousBranch = this.props.currentBranch;
    this.props.currentBranch = branchName;

    this.addDomainEvent(GitEventFactory.branchCheckedOut(
      this._id,
      previousBranch,
      branchName,
      this.props.path
    ));

    return Result.ok<void>();
  }

  /**
   * Create a commit
   */
  commit(params: {
    message: string;
    author: string;
    email: string;
  }): Result<Commit> {
    if (this.props.uncommittedChanges.isEmpty()) {
      return Result.fail<Commit>('No changes to commit');
    }

    const commitResult = Commit.create({
      message: params.message,
      author: params.author,
      email: params.email,
      changes: this.props.uncommittedChanges
    });

    if (commitResult.isFailure) {
      return commitResult;
    }

    const commit = commitResult.value;

    // Clear uncommitted changes after commit
    this.props.uncommittedChanges = Changes.empty();

    this.addDomainEvent(GitEventFactory.commitCreated(
      this._id,
      {
        path: this.props.path,
        commitHash: commit.hash,
        branch: this.props.currentBranch,
        message: commit.message.value,
        author: params.author,
        email: params.email,
        fileCount: commit.changes.fileCount,
        additions: commit.changes.additions,
        deletions: commit.changes.deletions
      }
    ));

    return Result.ok(commit);
  }

  /**
   * Update uncommitted changes
   */
  updateChanges(changes: Changes): void {
    this.props.uncommittedChanges = changes;

    this.addDomainEvent(GitEventFactory.changesUpdated(
      this._id,
      {
        path: this.props.path,
        fileCount: changes.fileCount,
        additions: changes.additions,
        deletions: changes.deletions,
        modifiedFiles: changes.getModifiedFiles().filter(f => f.status === 'modified').map(f => f.path),
        addedFiles: changes.getModifiedFiles().filter(f => f.status === 'added').map(f => f.path),
        deletedFiles: changes.getModifiedFiles().filter(f => f.status === 'deleted').map(f => f.path)
      }
    ));
  }

  /**
   * Get repository status
   */
  getStatus(): RepositoryStatus {
    return {
      currentBranch: this.props.currentBranch,
      isClean: this.props.uncommittedChanges.isEmpty(),
      uncommittedChanges: [...this.props.uncommittedChanges.files]
    };
  }

  /**
   * Apply domain events (for event sourcing)
   */
  apply(event: any): void {
    switch (event.eventType) {
      case 'BranchCreated':
        // In event sourcing, we would reconstruct state from events
        break;
      case 'BranchCheckedOut':
        this.props.currentBranch = event.payload.toBranch;
        break;
      case 'CommitCreated':
        this.props.uncommittedChanges = Changes.empty();
        break;
      case 'ChangesUpdated':
        // Would reconstruct changes from event payload
        break;
    }
    this.incrementVersion();
  }

  /**
   * Create a new repository
   */
  static create(params: {
    id: string;
    path: string;
    config: RepositoryConfig;
    currentBranch?: string;
  }): Result<GitRepository> {
    const idResult = RepositoryId.create(params.id);
    if (idResult.isFailure) {
      return Result.fail<GitRepository>(idResult.error!);
    }

    const repository = new GitRepository(idResult.value, {
      path: params.path,
      config: params.config,
      currentBranch: params.currentBranch || params.config.mainBranch,
      uncommittedChanges: Changes.empty(),
      branches: new Map()
    });

    return Result.ok(repository);
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(data: {
    id: string;
    path: string;
    config: RepositoryConfig;
    currentBranch: string;
    uncommittedChanges: Changes;
    branches: Array<{
      name: string;
      type: BranchType;
      baseBranch: string;
      createdAt: Date;
      isProtected: boolean;
    }>;
  }): Result<GitRepository> {
    const idResult = RepositoryId.create(data.id);
    if (idResult.isFailure) {
      return Result.fail<GitRepository>(idResult.error!);
    }

    const branches = new Map<string, Branch>();
    
    for (const branchData of data.branches) {
      const branchResult = Branch.fromPersistence(branchData);
      if (branchResult.isFailure) {
        return Result.fail<GitRepository>(`Failed to restore branch: ${branchResult.error}`);
      }
      branches.set(branchData.name, branchResult.value);
    }

    const repository = new GitRepository(idResult.value, {
      path: data.path,
      config: data.config,
      currentBranch: data.currentBranch,
      uncommittedChanges: data.uncommittedChanges,
      branches
    });

    return Result.ok(repository);
  }
}