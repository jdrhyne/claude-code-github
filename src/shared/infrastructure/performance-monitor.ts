/**
 * Performance monitoring and metrics collection
 */

export interface PerformanceMetrics {
  operationName: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface AggregatedMetrics {
  operationName: string;
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  p95Duration: number;
  p99Duration: number;
}

/**
 * Performance monitor for tracking operation metrics
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 10000;

  /**
   * Record a performance metric
   */
  record(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Trim old metrics to prevent memory growth
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Measure an async operation
   */
  async measure<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;

    try {
      const result = await operation();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.record({
        operationName,
        duration,
        success,
        timestamp: new Date(),
        metadata
      });
    }
  }

  /**
   * Measure a sync operation
   */
  measureSync<T>(
    operationName: string,
    operation: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const startTime = Date.now();
    let success = true;

    try {
      const result = operation();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.record({
        operationName,
        duration,
        success,
        timestamp: new Date(),
        metadata
      });
    }
  }

  /**
   * Get aggregated metrics for an operation
   */
  getAggregatedMetrics(
    operationName: string,
    since?: Date
  ): AggregatedMetrics | null {
    let metrics = this.metrics.filter(m => m.operationName === operationName);
    
    if (since) {
      metrics = metrics.filter(m => m.timestamp >= since);
    }

    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successCount = metrics.filter(m => m.success).length;

    return {
      operationName,
      count: metrics.length,
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      successRate: successCount / metrics.length,
      p95Duration: this.getPercentile(durations, 0.95),
      p99Duration: this.getPercentile(durations, 0.99)
    };
  }

  /**
   * Get all operation names
   */
  getOperationNames(): string[] {
    return Array.from(new Set(this.metrics.map(m => m.operationName)));
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(since?: Date): PerformanceMetrics[] {
    if (since) {
      return this.metrics.filter(m => m.timestamp >= since);
    }
    return [...this.metrics];
  }

  private getPercentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor();

/**
 * Decorator for monitoring method performance
 */
export function MonitorPerformance(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const effectiveOperationName = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return globalPerformanceMonitor.measure(
        effectiveOperationName,
        () => originalMethod.apply(this, args),
        { args: args.length }
      );
    };

    return descriptor;
  };
}