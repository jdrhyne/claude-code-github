import { DevelopmentTools } from '../development-tools.js';
import { CommandBus } from '../shared/infrastructure/command-bus.js';
import { CreateBranchCommand } from '../contexts/git-operations/application/commands/create-branch.command.js';
import { BranchType } from '../contexts/git-operations/domain/types.js';

/**
 * Adapter that runs both legacy and DDD implementations in parallel
 * for comparison and validation during migration
 */
export class ParallelRunAdapter {
  private discrepancies: any[] = [];

  constructor(
    private readonly legacyTools: DevelopmentTools,
    private readonly commandBus: CommandBus,
    private readonly logDiscrepancies: boolean = true
  ) {}

  /**
   * Create branch using both implementations
   */
  async createBranch(params: {
    name: string;
    type: string;
    message: string;
  }): Promise<any> {
    const startTime = Date.now();
    
    // Run both implementations in parallel
    const [legacyResult, dddResult] = await Promise.allSettled([
      this.runLegacy('createBranch', () => 
        this.legacyTools.createBranch({
          name: params.name,
          type: params.type as any,
          message: params.message
        })
      ),
      this.runDDD('createBranch', async () => {
        const projectPath = await this.legacyTools['getCurrentProjectPath']();
        const command = new CreateBranchCommand(
          projectPath,
          params.name,
          params.type as BranchType,
          params.message
        );
        const result = await this.commandBus.execute(command);
        
        if (result.isFailure) {
          throw new Error(result.error);
        }
        
        return {
          branch: result.value.branchName,
          message: `Created branch ${result.value.branchName}`
        };
      })
    ]);

    const duration = Date.now() - startTime;

    // Compare results
    await this.compareResults('createBranch', params, legacyResult, dddResult, duration);

    // Return legacy result for now (during migration)
    if (legacyResult.status === 'rejected') {
      throw legacyResult.reason;
    }
    return legacyResult.value;
  }

  /**
   * Get status using both implementations
   */
  async getStatus(): Promise<any> {
    const startTime = Date.now();
    
    const [legacyResult, dddResult] = await Promise.allSettled([
      this.runLegacy('getStatus', () => this.legacyTools.getStatus()),
      this.runDDD('getStatus', async () => {
        // DDD implementation would go here
        // For now, return a placeholder
        return { branch: 'main', uncommitted_changes: { file_count: 0 } };
      })
    ]);

    const duration = Date.now() - startTime;
    await this.compareResults('getStatus', {}, legacyResult, dddResult, duration);

    if (legacyResult.status === 'rejected') {
      throw legacyResult.reason;
    }
    return legacyResult.value;
  }

  /**
   * Run legacy implementation with error handling
   */
  private async runLegacy<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      console.log(`[Legacy] ${operation} completed in ${Date.now() - startTime}ms`);
      return result;
    } catch (_error) {
      console.error(`[Legacy] ${operation} failed:`, error);
      throw error;
    }
  }

  /**
   * Run DDD implementation with error handling
   */
  private async runDDD<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      console.log(`[DDD] ${operation} completed in ${Date.now() - startTime}ms`);
      return result;
    } catch (_error) {
      console.error(`[DDD] ${operation} failed:`, error);
      throw error;
    }
  }

  /**
   * Compare results from both implementations
   */
  private async compareResults(
    operation: string,
    params: any,
    legacyResult: PromiseSettledResult<any>,
    dddResult: PromiseSettledResult<any>,
    duration: number
  ): Promise<void> {
    const discrepancy: any = {
      operation,
      params,
      timestamp: new Date(),
      duration,
      legacy: {
        status: legacyResult.status,
        value: legacyResult.status === 'fulfilled' ? legacyResult.value : undefined,
        error: legacyResult.status === 'rejected' ? this.serializeError(legacyResult.reason) : undefined
      },
      ddd: {
        status: dddResult.status,
        value: dddResult.status === 'fulfilled' ? dddResult.value : undefined,
        error: dddResult.status === 'rejected' ? this.serializeError(dddResult.reason) : undefined
      }
    };

    // Check for discrepancies
    const hasDiscrepancy = this.detectDiscrepancy(legacyResult, dddResult);
    
    if (hasDiscrepancy) {
      discrepancy.hasDiscrepancy = true;
      this.discrepancies.push(discrepancy);
      
      if (this.logDiscrepancies) {
        console.warn(`[ParallelRun] Discrepancy detected in ${operation}:`, {
          params,
          legacy: discrepancy.legacy,
          ddd: discrepancy.ddd
        });
      }
    }

    // Log metrics
    console.log(`[ParallelRun] ${operation} completed in ${duration}ms`);
  }

  /**
   * Detect if there's a meaningful discrepancy between results
   */
  private detectDiscrepancy(
    legacyResult: PromiseSettledResult<any>,
    dddResult: PromiseSettledResult<any>
  ): boolean {
    // Both failed or both succeeded
    if (legacyResult.status !== dddResult.status) {
      return true;
    }

    // Both failed - check if same error type
    if (legacyResult.status === 'rejected' && dddResult.status === 'rejected') {
      const legacyError = this.getErrorType(legacyResult.reason);
      const dddError = this.getErrorType(dddResult.reason);
      return legacyError !== dddError;
    }

    // Both succeeded - check key fields match
    if (legacyResult.status === 'fulfilled' && dddResult.status === 'fulfilled') {
      // Add specific comparison logic based on operation type
      // For now, just check if both have values
      return false;
    }

    return false;
  }

  /**
   * Get error type for comparison
   */
  private getErrorType(error: any): string {
    if (error?.message?.includes('protected branch')) return 'PROTECTED_BRANCH';
    if (error?.message?.includes('no changes')) return 'NO_CHANGES';
    if (error?.message?.includes('not found')) return 'NOT_FOUND';
    return 'UNKNOWN';
  }

  /**
   * Serialize error for logging
   */
  private serializeError(error: any): any {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }
    return error;
  }

  /**
   * Get discrepancy report
   */
  getDiscrepancies(): any[] {
    return [...this.discrepancies];
  }

  /**
   * Clear discrepancy log
   */
  clearDiscrepancies(): void {
    this.discrepancies = [];
  }
}