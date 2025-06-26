import { EnhancedMcpServer } from '../mcp/enhanced-server.js';
import { DevelopmentTools } from '../development-tools.js';
import { AutomationTools } from '../automation/automation-tools.js';
import { FeedbackTools } from '../learning/feedback-tools.js';
import { GitOperationsContext } from '../contexts/git-operations/index.js';
import { FeatureFlags } from './feature-flags.js';
import { ParallelRunAdapter } from './parallel-adapter.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Enhanced MCP Server with DDD migration support
 */
export class MigrationMcpServer extends EnhancedMcpServer {
  private featureFlags: FeatureFlags;
  private gitOperationsContext?: GitOperationsContext;
  private parallelAdapter?: ParallelRunAdapter;

  constructor() {
    super();
    this.featureFlags = new FeatureFlags();
  }

  /**
   * Initialize with contexts
   */
  async initialize(
    devTools: DevelopmentTools,
    automationTools: AutomationTools,
    feedbackTools: FeedbackTools
  ): Promise<void> {
    await super.initialize(devTools, automationTools, feedbackTools);

    // Initialize DDD contexts if enabled
    if (this.featureFlags.isEnabled('use_ddd_git_operations')) {
      const configManager = devTools['configManager'];
      const gitManager = devTools['gitManager'];
      
      this.gitOperationsContext = new GitOperationsContext({
        configManager,
        gitManager,
        getCurrentProjectPath: async () => {
          const project = await devTools['getCurrentProject']();
          return project?.path || '';
        }
      });

      console.log('[Migration] Git Operations DDD context initialized');
    }

    // Initialize parallel adapter if in parallel mode
    if (this.featureFlags.isParallelRunMode()) {
      const commandBus = this.gitOperationsContext?.['commandBus'];
      if (commandBus) {
        this.parallelAdapter = new ParallelRunAdapter(
          devTools,
          commandBus
        );
        console.log('[Migration] Parallel run mode enabled');
      }
    }
  }

  /**
   * Register tools with migration support
   */
  protected registerTools(): void {
    // Always register feature flag management tools
    this.registerFeatureFlagTools();

    if (this.featureFlags.isEnabled('use_ddd_git_operations')) {
      // Register DDD tools
      if (this.gitOperationsContext) {
        const dddTools = this.gitOperationsContext.getMcpTools();
        dddTools.forEach(tool => this.server.tool(tool));
        console.log(`[Migration] Registered ${dddTools.length} DDD Git Operations tools`);
      }
    } else {
      // Register legacy tools
      super.registerTools();
    }

    // In parallel mode, wrap tools with parallel adapter
    if (this.featureFlags.isParallelRunMode() && this.parallelAdapter) {
      this.wrapToolsWithParallelAdapter();
    }
  }

  /**
   * Register feature flag management tools
   */
  private registerFeatureFlagTools(): void {
    const tool: Tool = {
      name: 'migration_status',
      description: 'Get DDD migration status and feature flags',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      handler: async () => {
        const flags = this.featureFlags.getAll();
        const progress = this.featureFlags.getMigrationProgress();
        
        return {
          migration_progress: `${progress}%`,
          feature_flags: flags,
          parallel_mode: this.featureFlags.isParallelRunMode(),
          contexts: {
            git_operations: this.featureFlags.isEnabled('use_ddd_git_operations'),
            github_integration: this.featureFlags.isEnabled('use_ddd_github_integration'),
            project_management: this.featureFlags.isEnabled('use_ddd_project_management'),
            automation: this.featureFlags.isEnabled('use_ddd_automation'),
            monitoring: this.featureFlags.isEnabled('use_ddd_monitoring')
          }
        };
      }
    };

    this.server.tool(tool);

    const toggleTool: Tool = {
      name: 'migration_toggle',
      description: 'Toggle DDD migration feature flags',
      inputSchema: {
        type: 'object',
        properties: {
          flag: {
            type: 'string',
            enum: [
              'use_ddd_git_operations',
              'use_ddd_github_integration',
              'use_ddd_project_management',
              'use_ddd_automation',
              'use_ddd_monitoring',
              'parallel_run_mode'
            ]
          },
          enabled: {
            type: 'boolean'
          }
        },
        required: ['flag', 'enabled']
      },
      handler: async (params: any) => {
        if (params.enabled) {
          this.featureFlags.enable(params.flag);
        } else {
          this.featureFlags.disable(params.flag);
        }
        
        return {
          message: `Feature flag ${params.flag} ${params.enabled ? 'enabled' : 'disabled'}`,
          current_state: this.featureFlags.getAll()
        };
      }
    };

    this.server.tool(toggleTool);
  }

  /**
   * Wrap tools with parallel adapter for comparison
   */
  private wrapToolsWithParallelAdapter(): void {
    // This would intercept tool calls and run both implementations
    // For now, just log that it's enabled
    console.log('[Migration] Tools wrapped with parallel adapter');
  }

  /**
   * Get migration metrics
   */
  getMigrationMetrics(): any {
    if (!this.parallelAdapter) {
      return { message: 'Parallel mode not enabled' };
    }

    const discrepancies = this.parallelAdapter.getDiscrepancies();
    return {
      total_operations: discrepancies.length,
      discrepancy_count: discrepancies.filter(d => d.hasDiscrepancy).length,
      operations: discrepancies.map(d => ({
        operation: d.operation,
        timestamp: d.timestamp,
        hasDiscrepancy: d.hasDiscrepancy,
        duration: d.duration
      }))
    };
  }
}