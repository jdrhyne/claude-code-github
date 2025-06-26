import { Result } from '../domain/result.js';
import { Command, CommandHandler } from './command-bus.js';

/**
 * Type-safe command registry that maintains type information
 */

/**
 * Command constructor type
 */
export type CommandConstructor<T extends Command> = new (...args: any[]) => T;

/**
 * Type-safe command handler registration
 */
export interface CommandHandlerRegistration<TCommand extends Command, TResult> {
  commandType: CommandConstructor<TCommand>;
  handler: CommandHandler<TCommand, TResult>;
}

/**
 * Registry of command handlers with type information preserved
 */
export class CommandHandlerRegistry {
  private handlers = new Map<string, CommandHandlerRegistration<any, any>>();

  /**
   * Register a command handler with type safety
   */
  register<TCommand extends Command, TResult>(
    registration: CommandHandlerRegistration<TCommand, TResult>
  ): void {
    const commandName = registration.commandType.name;
    
    if (this.handlers.has(commandName)) {
      throw new Error(`Handler already registered for command: ${commandName}`);
    }
    
    this.handlers.set(commandName, registration);
  }

  /**
   * Get handler for a command
   */
  getHandler<TCommand extends Command, TResult>(
    command: TCommand
  ): CommandHandler<TCommand, TResult> | undefined {
    const commandName = command.constructor.name;
    const registration = this.handlers.get(commandName);
    return registration?.handler;
  }

  /**
   * Check if handler exists for command
   */
  hasHandler(command: Command): boolean {
    return this.handlers.has(command.constructor.name);
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
  }
}

/**
 * Type-safe command bus implementation
 */
export class TypeSafeCommandBus {
  private registry = new CommandHandlerRegistry();

  /**
   * Register a command handler with full type safety
   */
  register<TCommand extends Command, TResult>(
    commandType: CommandConstructor<TCommand>,
    handler: CommandHandler<TCommand, TResult>
  ): void {
    this.registry.register({ commandType, handler });
  }

  /**
   * Execute a command with type inference
   */
  async execute<TCommand extends Command, TResult>(
    command: TCommand
  ): Promise<Result<TResult>> {
    const handler = this.registry.getHandler<TCommand, TResult>(command);
    
    if (!handler) {
      return Result.fail(`No handler registered for command: ${command.constructor.name}`);
    }

    try {
      return await handler.handle(command);
    } catch (error) {
      return Result.fail(
        `Command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute multiple commands in sequence
   */
  async executeSequence<TResult>(
    commands: Command[]
  ): Promise<Result<TResult[]>> {
    const results: TResult[] = [];
    
    for (const command of commands) {
      const result = await this.execute<Command, TResult>(command);
      if (result.isFailure) {
        return Result.fail(result.error!);
      }
      results.push(result.value);
    }
    
    return Result.ok(results);
  }

  /**
   * Execute multiple commands in parallel
   */
  async executeParallel<TResult>(
    commands: Command[]
  ): Promise<Result<TResult[]>> {
    const promises = commands.map(cmd => this.execute<Command, TResult>(cmd));
    const results = await Promise.all(promises);
    
    const failed = results.find(r => r.isFailure);
    if (failed) {
      return Result.fail(failed.error!);
    }
    
    return Result.ok(results.map(r => r.value));
  }

  /**
   * Clear all registered handlers
   */
  clear(): void {
    this.registry.clear();
  }
}

/**
 * Builder for fluent command bus configuration
 */
export class CommandBusBuilder {
  private bus = new TypeSafeCommandBus();

  /**
   * Register a command handler
   */
  withHandler<TCommand extends Command, TResult>(
    commandType: CommandConstructor<TCommand>,
    handler: CommandHandler<TCommand, TResult>
  ): this {
    this.bus.register(commandType, handler);
    return this;
  }

  /**
   * Register multiple handlers
   */
  withHandlers(
    registrations: Array<{
      commandType: CommandConstructor<any>;
      handler: CommandHandler<any, any>;
    }>
  ): this {
    registrations.forEach(({ commandType, handler }) => {
      this.bus.register(commandType, handler);
    });
    return this;
  }

  /**
   * Build the configured command bus
   */
  build(): TypeSafeCommandBus {
    return this.bus;
  }
}