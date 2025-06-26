import { ValueObject } from '../../../../shared/domain/value-object.js';
import { Result } from '../../../../shared/domain/result.js';

interface RepositoryIdProps {
  value: string;
}

/**
 * Value object representing a repository identifier
 */
export class RepositoryId extends ValueObject<RepositoryIdProps> {
  private constructor(props: RepositoryIdProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  /**
   * Create a new RepositoryId with validation
   */
  static create(id: string): Result<RepositoryId> {
    if (!id || id.trim().length === 0) {
      return Result.fail<RepositoryId>('Repository ID cannot be empty');
    }

    if (id.length > 255) {
      return Result.fail<RepositoryId>('Repository ID cannot exceed 255 characters');
    }

    return Result.ok<RepositoryId>(new RepositoryId({ value: id.trim() }));
  }

  toString(): string {
    return this.props.value;
  }
}