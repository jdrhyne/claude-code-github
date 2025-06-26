import { Result } from '../domain/result.js';

/**
 * CQRS Query Bus implementation
 */

/**
 * Base interface for queries
 */
export interface Query {
  readonly _queryBrand?: undefined;
}

/**
 * Query handler interface
 */
export interface QueryHandler<TQuery extends Query, TResult> {
  handle(query: TQuery): Promise<Result<TResult>>;
}

/**
 * Query constructor type
 */
export type QueryConstructor<T extends Query> = new (...args: any[]) => T;

/**
 * Type-safe query bus for CQRS
 */
export class QueryBus {
  private handlers = new Map<string, QueryHandler<any, any>>();

  /**
   * Register a query handler
   */
  register<TQuery extends Query, TResult>(
    queryType: QueryConstructor<TQuery>,
    handler: QueryHandler<TQuery, TResult>
  ): void {
    const queryName = queryType.name;
    
    if (this.handlers.has(queryName)) {
      throw new Error(`Handler already registered for query: ${queryName}`);
    }
    
    this.handlers.set(queryName, handler);
  }

  /**
   * Execute a query
   */
  async execute<TQuery extends Query, TResult>(
    query: TQuery
  ): Promise<Result<TResult>> {
    const queryName = query.constructor.name;
    const handler = this.handlers.get(queryName);
    
    if (!handler) {
      return Result.fail(`No handler registered for query: ${queryName}`);
    }

    try {
      return await handler.handle(query);
    } catch (error) {
      return Result.fail(
        `Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
  }
}

/**
 * Base class for query handlers with caching support
 */
export abstract class CachedQueryHandler<TQuery extends Query, TResult> 
  implements QueryHandler<TQuery, TResult> {
  
  private cache = new Map<string, { result: Result<TResult>; timestamp: number }>();
  
  constructor(
    private readonly cacheTtlMs: number = 5 * 60 * 1000 // 5 minutes default
  ) {}

  async handle(query: TQuery): Promise<Result<TResult>> {
    const cacheKey = this.getCacheKey(query);
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.result;
    }

    // Execute query
    const result = await this.executeQuery(query);
    
    // Cache successful results
    if (result.isSuccess) {
      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
    }

    return result;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache key for query
   */
  protected abstract getCacheKey(query: TQuery): string;

  /**
   * Execute the actual query
   */
  protected abstract executeQuery(query: TQuery): Promise<Result<TResult>>;
}

/**
 * Decorator for query handler methods
 */
export function QueryHandlerMethod<TQuery extends Query, TResult>() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (query: TQuery): Promise<Result<TResult>> {
      try {
        const result = await originalMethod.call(this, query);
        return result;
      } catch (error) {
        return Result.fail(
          `Query handler error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    };

    return descriptor;
  };
}