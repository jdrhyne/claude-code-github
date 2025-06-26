import { ValueObject } from '../../../../shared/domain/value-object.js';
import { Result } from '../../../../shared/domain/result.js';
import { GitConstraints } from '../constants.js';

interface CommitMessageProps {
  value: string;
}

/**
 * Value object representing a Git commit message
 */
export class CommitMessage extends ValueObject<CommitMessageProps> {
  private constructor(props: CommitMessageProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  /**
   * Get the subject line (first line) of the commit message
   */
  get subject(): string {
    return this.props.value.split('\n')[0];
  }

  /**
   * Get the body of the commit message (everything after the first line)
   */
  get body(): string {
    const lines = this.props.value.split('\n');
    return lines.slice(1).join('\n').trim();
  }

  /**
   * Check if this follows conventional commit format
   */
  isConventionalCommit(): boolean {
    return GitConstraints.CommitMessage.CONVENTIONAL_PATTERN.test(this.subject);
  }

  /**
   * Create a new CommitMessage with validation
   */
  static create(message: string): Result<CommitMessage> {
    if (!message || message.trim().length === 0) {
      return Result.fail<CommitMessage>('Commit message cannot be empty');
    }

    const trimmed = message.trim();

    if (trimmed.length < GitConstraints.CommitMessage.MIN_LENGTH) {
      return Result.fail<CommitMessage>(`Commit message must be at least ${GitConstraints.CommitMessage.MIN_LENGTH} characters`);
    }

    if (trimmed.length > GitConstraints.CommitMessage.MAX_LENGTH) {
      return Result.fail<CommitMessage>(`Commit message cannot exceed ${GitConstraints.CommitMessage.MAX_LENGTH} characters`);
    }

    return Result.ok<CommitMessage>(new CommitMessage({ value: trimmed }));
  }

  toString(): string {
    return this.props.value;
  }
}