/**
 * Result type for handling success/failure in a functional way
 */
export class Result<T> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly error?: string,
    private readonly _value?: T
  ) {
    if (isSuccess && _value === undefined && _value !== null) {
      // Allow undefined for void results
    }

    if (!isSuccess && !error) {
      throw new Error('Failure result must have an error message');
    }
  }

  get value(): T {
    if (!this.isSuccess) {
      throw new Error('Cannot get value from a failure result');
    }

    return this._value as T;
  }

  get isFailure(): boolean {
    return !this.isSuccess;
  }

  /**
   * Create a successful result
   */
  static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, undefined, value as U);
  }

  /**
   * Create a failed result
   */
  static fail<U>(error: string): Result<U> {
    return new Result<U>(false, error);
  }

  /**
   * Combine multiple results into one
   */
  static combine(results: Result<any>[]): Result<any> {
    for (const result of results) {
      if (result.isFailure) {
        return result;
      }
    }
    return Result.ok(results);
  }

  /**
   * Map the value if successful
   */
  map<U>(fn: (value: T) => U): Result<U> {
    if (this.isSuccess) {
      return Result.ok(fn(this.value));
    }
    return Result.fail<U>(this.error!);
  }

  /**
   * FlatMap for chaining results
   */
  flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
    if (this.isSuccess) {
      return fn(this.value);
    }
    return Result.fail<U>(this.error!);
  }
}