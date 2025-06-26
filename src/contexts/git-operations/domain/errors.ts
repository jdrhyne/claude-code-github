import { BusinessRuleViolationError, ConflictError, ValidationError } from '../../../shared/domain/errors.js';

/**
 * Git Operations domain-specific errors
 */

/**
 * Error thrown when trying to operate on a protected branch
 */
export class ProtectedBranchError extends BusinessRuleViolationError {
  constructor(branchName: string, operation: string) {
    super(
      'protected_branch',
      `Cannot ${operation} on protected branch '${branchName}'`,
      { branchName, operation }
    );
  }
}

/**
 * Error thrown when there are no changes to commit
 */
export class NoChangesToCommitError extends ConflictError {
  constructor() {
    super('No changes to commit', 'clean', 'commit');
  }
}

/**
 * Error thrown when trying to switch branches with uncommitted changes
 */
export class UncommittedChangesError extends ConflictError {
  constructor(fileCount: number) {
    super(
      `Cannot switch branches with ${fileCount} uncommitted file(s)`,
      'uncommitted_changes',
      'checkout'
    );
  }
}

/**
 * Error thrown when a branch already exists
 */
export class BranchAlreadyExistsError extends ConflictError {
  constructor(branchName: string) {
    super(
      `Branch '${branchName}' already exists`,
      'existing_branch',
      'create_branch'
    );
  }
}

/**
 * Error thrown when a branch is not found
 */
export class BranchNotFoundError extends ValidationError {
  constructor(branchName: string) {
    super(`Branch '${branchName}' does not exist`, 'branchName', branchName);
  }
}

/**
 * Error thrown when repository configuration is invalid
 */
export class InvalidRepositoryConfigError extends ValidationError {
  constructor(message: string, configField: string) {
    super(`Invalid repository configuration: ${message}`, configField);
  }
}

/**
 * Error thrown when Git operation fails
 */
export class GitOperationError extends Error {
  constructor(
    operation: string,
    public readonly gitError: string,
    public readonly exitCode?: number
  ) {
    super(`Git ${operation} failed: ${gitError}`);
    this.name = 'GitOperationError';
  }
}