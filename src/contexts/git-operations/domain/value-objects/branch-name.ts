import { ValueObject } from '../../../../shared/domain/value-object.js';
import { Result } from '../../../../shared/domain/result.js';

interface BranchNameProps {
  value: string;
}

/**
 * Value object representing a Git branch name
 */
export class BranchName extends ValueObject<BranchNameProps> {
  private static readonly INVALID_CHARS = /[^a-zA-Z0-9\-_\/]/;
  private static readonly MAX_LENGTH = 255;

  private constructor(props: BranchNameProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  /**
   * Create a new BranchName with validation
   */
  static create(name: string): Result<BranchName> {
    if (!name || name.trim().length === 0) {
      return Result.fail<BranchName>('Branch name cannot be empty');
    }

    if (name.length > BranchName.MAX_LENGTH) {
      return Result.fail<BranchName>(`Branch name cannot exceed ${BranchName.MAX_LENGTH} characters`);
    }

    if (BranchName.INVALID_CHARS.test(name)) {
      return Result.fail<BranchName>('Branch name can only contain letters, numbers, hyphens, underscores, and slashes');
    }

    if (name.startsWith('/') || name.endsWith('/')) {
      return Result.fail<BranchName>('Branch name cannot start or end with a slash');
    }

    if (name.includes('//')) {
      return Result.fail<BranchName>('Branch name cannot contain consecutive slashes');
    }

    return Result.ok<BranchName>(new BranchName({ value: name }));
  }

  toString(): string {
    return this.props.value;
  }
}