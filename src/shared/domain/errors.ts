/**
 * Domain-specific error types for better error handling
 */

/**
 * Base class for all domain errors
 */
export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack
    };
  }
}

/**
 * Error thrown when an entity is not found
 */
export class EntityNotFoundError extends DomainError {
  constructor(entityType: string, id: string) {
    super(
      `${entityType} with id '${id}' not found`,
      'ENTITY_NOT_FOUND',
      { entityType, id }
    );
  }
}

/**
 * Error thrown when a validation fails
 */
export class ValidationError extends DomainError {
  constructor(message: string, field?: string, value?: unknown) {
    super(
      message,
      'VALIDATION_ERROR',
      { field, value }
    );
  }
}

/**
 * Error thrown when a business rule is violated
 */
export class BusinessRuleViolationError extends DomainError {
  constructor(rule: string, message: string, context?: Record<string, unknown>) {
    super(
      message,
      'BUSINESS_RULE_VIOLATION',
      { rule, ...context }
    );
  }
}

/**
 * Error thrown when an operation conflicts with current state
 */
export class ConflictError extends DomainError {
  constructor(message: string, currentState?: unknown, attemptedOperation?: string) {
    super(
      message,
      'CONFLICT',
      { currentState, attemptedOperation }
    );
  }
}

/**
 * Error thrown when an operation is not allowed
 */
export class ForbiddenError extends DomainError {
  constructor(operation: string, reason: string) {
    super(
      `Operation '${operation}' is forbidden: ${reason}`,
      'FORBIDDEN',
      { operation, reason }
    );
  }
}

/**
 * Utility to safely extract error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Type guard for DomainError
 */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}