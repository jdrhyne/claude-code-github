import { Result } from '../../../../shared/domain/result.js';

/**
 * Base interface for command handlers
 */
export interface CommandHandler<TCommand, TResult = void> {
  handle(command: TCommand): Promise<Result<TResult>>;
}