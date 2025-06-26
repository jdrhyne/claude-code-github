import { Entity } from '../../../../shared/domain/entity.js';
import { Result } from '../../../../shared/domain/result.js';
import { CommitMessage } from '../value-objects/commit-message.js';
import { Changes } from '../value-objects/changes.js';

export interface CommitProps {
  message: CommitMessage;
  author: string;
  email: string;
  timestamp: Date;
  changes: Changes;
  parentHash?: string;
}

/**
 * Commit entity representing a Git commit
 */
export class Commit extends Entity<string> {
  private props: CommitProps;

  private constructor(hash: string, props: CommitProps) {
    super(hash);
    this.props = props;
  }

  get hash(): string {
    return this._id;
  }

  get shortHash(): string {
    return this._id.substring(0, 7);
  }

  get message(): CommitMessage {
    return this.props.message;
  }

  get author(): string {
    return this.props.author;
  }

  get email(): string {
    return this.props.email;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get changes(): Changes {
    return this.props.changes;
  }

  get parentHash(): string | undefined {
    return this.props.parentHash;
  }

  /**
   * Create a new commit (for domain logic, actual hash would come from Git)
   */
  static create(params: {
    message: string;
    author: string;
    email: string;
    changes: Changes;
    parentHash?: string;
  }): Result<Commit> {
    const messageResult = CommitMessage.create(params.message);
    if (messageResult.isFailure) {
      return Result.fail<Commit>(messageResult.error!);
    }

    if (params.changes.isEmpty()) {
      return Result.fail<Commit>('Cannot create commit with no changes');
    }

    // Generate a temporary hash for domain logic
    // In real implementation, this would come from Git after commit
    const tempHash = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const commit = new Commit(tempHash, {
      message: messageResult.value,
      author: params.author,
      email: params.email,
      timestamp: new Date(),
      changes: params.changes,
      parentHash: params.parentHash
    });

    return Result.ok<Commit>(commit);
  }

  /**
   * Reconstruct a commit from Git data
   */
  static fromGitData(data: {
    hash: string;
    message: string;
    author: string;
    email: string;
    timestamp: Date;
    changes: Changes;
    parentHash?: string;
  }): Result<Commit> {
    const messageResult = CommitMessage.create(data.message);
    if (messageResult.isFailure) {
      return Result.fail<Commit>(messageResult.error!);
    }

    const commit = new Commit(data.hash, {
      message: messageResult.value,
      author: data.author,
      email: data.email,
      timestamp: data.timestamp,
      changes: data.changes,
      parentHash: data.parentHash
    });

    return Result.ok<Commit>(commit);
  }
}