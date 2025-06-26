/**
 * CLI Monitor Module
 * 
 * Handles CLI flags and commands for launching agent monitoring
 */

import { Command } from 'commander';
import { AgentMonitor } from '../monitoring/agent-monitor.js';
import { agentEvents, AgentEventEmitter } from '../monitoring/agent-events.js';
import { DevelopmentTools } from '../development-tools.js';
import chalk from 'chalk';

/**
 * Monitor CLI modes
 */
export type MonitorMode = 'dashboard' | 'stream' | 'monitor';

/**
 * Monitor CLI configuration
 */
export interface MonitorCliConfig {
  mode: MonitorMode;
  project?: string;
  refreshRate?: number;
  compact?: boolean;
  noColor?: boolean;
  filter?: string;
}

/**
 * CLI Monitor class
 */
export class MonitorCli {
  private eventEmitter: AgentEventEmitter;
  private devTools?: DevelopmentTools;

  constructor(eventEmitter: AgentEventEmitter = agentEvents) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * Setup CLI commands for monitoring
   */
  public setupCommands(program: Command): void {
    // Monitor command
    program
      .command('monitor')
      .description('Launch real-time agent monitoring dashboard')
      .option('-p, --project <path>', 'Monitor specific project path')
      .option('-r, --refresh-rate <ms>', 'Dashboard refresh rate in milliseconds', '1000')
      .option('-c, --compact', 'Use compact display mode')
      .option('--no-color', 'Disable colored output')
      .option('-f, --filter <types>', 'Filter events by type (comma-separated)')
      .action(async (options) => {
        await this.launchMonitor({
          mode: 'monitor',
          project: options.project,
          refreshRate: parseInt(options.refreshRate),
          compact: options.compact,
          noColor: !options.color,
          filter: options.filter,
        });
      });

    // Dashboard command (alias for monitor with full UI)
    program
      .command('dashboard')
      .description('Launch interactive dashboard with full controls')
      .option('-p, --project <path>', 'Monitor specific project path')
      .option('-r, --refresh-rate <ms>', 'Dashboard refresh rate in milliseconds', '1000')
      .action(async (options) => {
        await this.launchMonitor({
          mode: 'dashboard',
          project: options.project,
          refreshRate: parseInt(options.refreshRate),
        });
      });

    // Stream command (minimal output)
    program
      .command('stream')
      .description('Stream agent events to console (minimal output)')
      .option('-p, --project <path>', 'Monitor specific project path')
      .option('-f, --filter <types>', 'Filter events by type')
      .option('--no-color', 'Disable colored output')
      .action(async (options) => {
        await this.launchMonitor({
          mode: 'stream',
          project: options.project,
          noColor: !options.color,
          filter: options.filter,
        });
      });
  }

  /**
   * Launch monitor based on configuration
   */
  public async launchMonitor(config: MonitorCliConfig): Promise<void> {
    console.log(chalk.cyan('🚀 Starting Claude Code GitHub Agent Monitor...'));
    
    try {
      // Initialize development tools if needed
      if (config.project) {
        this.devTools = new DevelopmentTools();
        await this.devTools.initialize();
        console.log(chalk.green(`📁 Monitoring project: ${config.project}`));
      }

      switch (config.mode) {
        case 'dashboard':
        case 'monitor':
          await this.launchDashboard(config);
          break;
        case 'stream':
          await this.launchStream(config);
          break;
        default:
          throw new Error(`Unknown monitor mode: ${config.mode}`);
      }
    } catch (_error) {
      console.error(chalk.red('❌ Failed to start monitor:'), error);
      process.exit(1);
    }
  }

  /**
   * Launch the blessed.js dashboard
   */
  private async launchDashboard(config: MonitorCliConfig): Promise<void> {
    console.log(chalk.yellow('🖥️  Launching interactive dashboard...'));
    console.log(chalk.gray('Press [q] to quit, [h] for help'));

    const monitor = new AgentMonitor(this.eventEmitter, {
      refreshRate: config.refreshRate || 1000,
      showConfidence: true,
      showTimestamps: true,
      colorOutput: !config.noColor,
      compactMode: config.compact || false,
    });

    // Simulate some initial agent status
    monitor.updateStatus({
      mode: 'assisted',
      isActive: true,
      confidenceThreshold: 0.7,
      actionsToday: 0,
      successRate: 85.2,
    });

    // Generate some sample events for demonstration
    if (process.env.NODE_ENV === 'development') {
      this.generateSampleEvents();
    }

    await monitor.start();
  }

  /**
   * Launch stream mode (console output)
   */
  private async launchStream(config: MonitorCliConfig): Promise<void> {
    console.log(chalk.yellow('📡 Starting event stream...'));
    console.log(chalk.gray('Press Ctrl+C to quit'));

    // Setup event listener
    this.eventEmitter.onAgentActivity((event) => {
      if (this.shouldShowEvent(event, config.filter)) {
        this.printStreamEvent(event, config.noColor);
      }
    });

    // Generate sample events for development
    if (process.env.NODE_ENV === 'development') {
      this.generateSampleEvents();
    }

    // Keep process alive
    await new Promise((resolve) => {
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\n👋 Monitor stopped'));
        resolve(void 0);
      });
    });
  }

  /**
   * Check if event should be shown based on filter
   */
  private shouldShowEvent(event: any, filter?: string): boolean {
    if (!filter) return true;
    
    const allowedTypes = filter.split(',').map(t => t.trim());
    return allowedTypes.includes(event.type);
  }

  /**
   * Print event in stream format
   */
  private printStreamEvent(event: any, noColor: boolean = false): void {
    const time = event.timestamp.toLocaleTimeString();
    const icon = this.getEventIcon(event.type);
    const confidence = `(${(event.confidence * 100).toFixed(0)}%)`;
    
    if (noColor) {
      console.log(`${time} ${icon} ${event.message} ${confidence}`);
    } else {
      const color = this.getEventColor(event.type);
      console.log(
        chalk.gray(time) + ' ' +
        icon + ' ' +
        chalk[color](event.message) + ' ' +
        chalk.yellow(confidence)
      );
    }

    // Show reasoning if available
    if (event.reasoning && event.reasoning.length > 0) {
      event.reasoning.forEach((reason: string) => {
        const prefix = noColor ? '  └─ ' : chalk.gray('  └─ ');
        console.log(prefix + reason);
      });
    }
  }

  /**
   * Get icon for event type
   */
  private getEventIcon(type: string): string {
    const icons: Record<string, string> = {
      scanning: '🔍',
      analyzing: '🧠',
      suggesting: '💡',
      executing: '⚡',
      learning: '📚',
      waiting: '⏳',
      error: '❌',
      idle: '😴',
    };
    return icons[type] || '📋';
  }

  /**
   * Get color for event type
   */
  private getEventColor(type: string): 'blue' | 'yellow' | 'green' | 'magenta' | 'cyan' | 'gray' | 'red' {
    const colors: Record<string, 'blue' | 'yellow' | 'green' | 'magenta' | 'cyan' | 'gray' | 'red'> = {
      scanning: 'blue',
      analyzing: 'yellow',
      suggesting: 'green',
      executing: 'magenta',
      learning: 'cyan',
      waiting: 'gray',
      error: 'red',
      idle: 'gray',
    };
    return colors[type] || 'gray';
  }

  /**
   * Generate sample events for development/testing
   */
  private generateSampleEvents(): void {
    setTimeout(() => {
      this.eventEmitter.emitAgentActivity({
        type: 'scanning',
        confidence: 1.0,
        context: {
          path: '/Users/admin/Projects/claude-code-github',
          branch: 'feature/agent-visualization',
          isProtected: false,
          hasUncommittedChanges: true,
          filesChanged: 3,
        },
        message: 'Scanning project for changes...',
      });
    }, 1000);

    setTimeout(() => {
      this.eventEmitter.emitAgentActivity({
        type: 'analyzing',
        confidence: 0.85,
        context: {
          path: '/Users/admin/Projects/claude-code-github',
          branch: 'feature/agent-visualization',
          isProtected: false,
          hasUncommittedChanges: true,
          filesChanged: 3,
        },
        message: 'Analyzing changes: 3 new TypeScript files',
        reasoning: [
          'Files are cohesive (all monitoring-related)',
          'No breaking changes detected',
          'Tests are passing',
        ],
      });
    }, 3000);

    setTimeout(() => {
      this.eventEmitter.emitAgentActivity({
        type: 'suggesting',
        confidence: 0.92,
        context: {
          path: '/Users/admin/Projects/claude-code-github',
          branch: 'feature/agent-visualization',
          isProtected: false,
          hasUncommittedChanges: true,
          filesChanged: 3,
        },
        message: 'Suggesting: Commit monitoring infrastructure',
        reasoning: [
          'High confidence in change quality',
          'Feature branch is appropriate',
          'Similar commits successful in past',
        ],
        decision: {
          id: 'decision_001',
          type: 'commit',
          action: 'git commit -m "feat: add agent monitoring infrastructure"',
          confidence: 0.92,
          reasoning: ['Feature complete', 'Tests passing', 'Good commit message'],
          requiresApproval: true,
          timestamp: new Date(),
        },
      });
    }, 5000);

    // Add ongoing activity every 15 seconds
    setInterval(() => {
      const activities = [
        {
          type: 'scanning' as const,
          confidence: 1.0,
          message: 'Monitoring file system for changes...',
          context: { path: '/Users/admin/Projects/AgentCopy', branch: 'main', isProtected: false, hasUncommittedChanges: false, filesChanged: 0 }
        },
        {
          type: 'analyzing' as const,
          confidence: 0.75,
          message: 'Detected git status change in vibetunnel',
          reasoning: ['Branch switched to feature/new-ui', 'No uncommitted changes'],
          context: { path: '/Users/admin/Projects/vibetunnel', branch: 'feature/new-ui', isProtected: false, hasUncommittedChanges: false, filesChanged: 0 }
        },
        {
          type: 'idle' as const,
          confidence: 1.0,
          message: 'Waiting for development activity...',
          context: { path: '/Users/admin/Projects/claude-code-github', branch: 'main', isProtected: false, hasUncommittedChanges: false, filesChanged: 0 }
        },
        {
          type: 'learning' as const,
          confidence: 0.6,
          message: 'Learning from development patterns',
          reasoning: ['Analyzing commit frequency', 'Updating user preferences'],
          context: { path: '/Users/admin/Projects/jdrhyne-me', branch: 'main', isProtected: false, hasUncommittedChanges: false, filesChanged: 0 }
        }
      ];

      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      this.eventEmitter.emitAgentActivity({
        type: randomActivity.type,
        confidence: randomActivity.confidence,
        context: randomActivity.context,
        message: randomActivity.message,
        reasoning: randomActivity.reasoning,
      });
    }, 15000); // Every 15 seconds
  }
}

/**
 * Check if running in monitor mode based on CLI args
 */
export function isMonitorMode(): boolean {
  const args = process.argv.slice(2);
  return args.includes('--monitor') || 
         args.includes('--dashboard') || 
         args.includes('--stream') ||
         args.includes('monitor') ||
         args.includes('dashboard') ||
         args.includes('stream');
}

/**
 * Extract monitor mode from CLI args
 */
export function getMonitorMode(): MonitorMode | null {
  const args = process.argv.slice(2);
  
  if (args.includes('dashboard')) return 'dashboard';
  if (args.includes('stream')) return 'stream';
  if (args.includes('monitor') || args.includes('--monitor')) return 'monitor';
  
  return null;
}