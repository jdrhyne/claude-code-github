/**
 * Feature flags for gradual DDD migration
 */
export class FeatureFlags {
  private flags: Map<string, boolean>;
  
  constructor() {
    // Initialize with all flags disabled by default
    this.flags = new Map([
      ['use_ddd_git_operations', false],
      ['use_ddd_github_integration', false],
      ['use_ddd_project_management', false],
      ['use_ddd_automation', false],
      ['use_ddd_monitoring', false],
      ['use_ddd_api', false],
      ['parallel_run_mode', false] // Run both implementations for comparison
    ]);

    // Check environment variables for overrides
    this.loadFromEnvironment();
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flag: string): boolean {
    return this.flags.get(flag) || false;
  }

  /**
   * Enable a feature flag
   */
  enable(flag: string): void {
    if (!this.flags.has(flag)) {
      throw new Error(`Unknown feature flag: ${flag}`);
    }
    this.flags.set(flag, true);
    console.log(`Feature flag enabled: ${flag}`);
  }

  /**
   * Disable a feature flag
   */
  disable(flag: string): void {
    if (!this.flags.has(flag)) {
      throw new Error(`Unknown feature flag: ${flag}`);
    }
    this.flags.set(flag, false);
    console.log(`Feature flag disabled: ${flag}`);
  }

  /**
   * Get all feature flags and their states
   */
  getAll(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    this.flags.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Load feature flags from environment variables
   */
  private loadFromEnvironment(): void {
    // Convention: DDD_FEATURE_FLAG_<FLAG_NAME>=true
    for (const [flag] of this.flags) {
      const envVar = `DDD_FEATURE_FLAG_${flag.toUpperCase()}`;
      if (process.env[envVar] === 'true') {
        this.flags.set(flag, true);
        console.log(`Feature flag ${flag} enabled from environment`);
      }
    }
  }

  /**
   * Check if we're in parallel run mode
   */
  isParallelRunMode(): boolean {
    return this.isEnabled('parallel_run_mode');
  }

  /**
   * Get migration progress percentage
   */
  getMigrationProgress(): number {
    const dddFlags = Array.from(this.flags.entries())
      .filter(([key]) => key.startsWith('use_ddd_'));
    
    const enabledCount = dddFlags.filter(([, enabled]) => enabled).length;
    return Math.round((enabledCount / dddFlags.length) * 100);
  }
}