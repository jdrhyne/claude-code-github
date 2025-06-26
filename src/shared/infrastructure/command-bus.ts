import { Result } from '../domain/result.js';

/**
 * Command interface - marker for commands
 */
export interface Command {
  readonly _commandBrand?: undefined;
}

/**
 * Command handler interface
 */
export interface CommandHandler<TCommand extends Command, TResult = void> {
  handle(command: TCommand): Promise<Result<TResult>>;
}

/**
 * Command bus interface for executing commands
 */
export interface CommandBus {
  /**
   * Execute a command
   */
  execute<TResult>(command: Command): Promise<Result<TResult>>;
  
  /**
   * Register a command handler
   */
  register<TCommand extends Command, TResult>(
    commandType: new (...args: any[]) => TCommand,
    handler: CommandHandler<TCommand, TResult>
  ): void;
}

/**
 * Simple in-memory command bus implementation
 */
export class InMemoryCommandBus implements CommandBus {
  private handlers = new Map<string, CommandHandler<any, any>>();

  register<TCommand extends Command, TResult>(
    commandType: new (...args: any[]) => TCommand,
    handler: CommandHandler<TCommand, TResult>
  ): void {
    const commandName = commandType.name;
    if (this.handlers.has(commandName)) {
      throw new Error(`Handler already registered for command: ${commandName}`);
    }
    this.handlers.set(commandName, handler);
  }

  async execute<TResult>(command: Command): Promise<Result<TResult>> {
    const commandName = command.constructor.name;
    const handler = this.handlers.get(commandName);
    
    if (!handler) {
      return Result.fail(`No handler registered for command: ${commandName}`);
    }

    try {
      return await handler.handle(command);
    } catch (_error) {
      return Result.fail(
        `Command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
  }
}