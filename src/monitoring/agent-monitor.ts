/**
 * Agent Monitor - Real-time Terminal Dashboard
 * 
 * Provides a comprehensive terminal-based interface for monitoring
 * autonomous agent activities using blessed.js
 */

import * as blessed from 'blessed';
import chalk from 'chalk';
import { 
  AgentEvent, 
  AgentStatus, 
  AgentEventEmitter, 
  AgentEventUtils,
  DecisionNode,
  EventFilterConfig,
  AgentEventType
} from './agent-events.js';

/**
 * Configuration for the agent monitor display
 */
export interface MonitorConfig {
  refreshRate: number; // milliseconds
  maxLogLines: number;
  showConfidence: boolean;
  showTimestamps: boolean;
  colorOutput: boolean;
  compactMode: boolean;
}

/**
 * Default monitor configuration
 */
const DEFAULT_CONFIG: MonitorConfig = {
  refreshRate: 1000,
  maxLogLines: 50,
  showConfidence: true,
  showTimestamps: true,
  colorOutput: true,
  compactMode: false,
};

/**
 * Main agent monitoring dashboard
 */
export class AgentMonitor {
  private screen: any;
  private statusBox: any;
  private activityLog: any;
  private decisionTree: any;
  private controlsBox: any;
  private statsBox: any;
  
  private config: MonitorConfig;
  private eventEmitter: AgentEventEmitter;
  private agentStatus: AgentStatus;
  private isPaused: boolean = false;
  private currentFilter: EventFilterConfig = {};
  
  private refreshInterval?: NodeJS.Timeout;
  private eventQueue: AgentEvent[] = [];

  constructor(eventEmitter: AgentEventEmitter, config: Partial<MonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventEmitter = eventEmitter;
    
    // Initialize default agent status
    this.agentStatus = {
      mode: 'off',
      isActive: false,
      actionsToday: 0,
      successRate: 0,
      confidenceThreshold: 0.7,
      isPaused: false,
    };

    this.screen = this.createScreen();
    this.setupLayout();
    this.setupEventHandlers();
    this.setupKeyHandlers();
  }

  /**
   * Start the monitoring dashboard
   */
  public async start(): Promise<void> {
    this.screen.render();
    this.startRefreshTimer();
    
    // Subscribe to agent events
    this.eventEmitter.onAgentActivity(this.handleAgentEvent.bind(this));
    
    // Initial render
    this.updateDisplay();
    
    return new Promise((resolve) => {
      this.screen.key(['q', 'C-c'], () => {
        this.stop();
        resolve();
      });
    });
  }

  /**
   * Stop the monitoring dashboard
   */
  public stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.screen.destroy();
  }

  /**
   * Update agent status
   */
  public updateStatus(status: Partial<AgentStatus>): void {
    this.agentStatus = { ...this.agentStatus, ...status };
    this.updateStatusDisplay();
  }

  /**
   * Handle incoming agent events
   */
  private handleAgentEvent(event: AgentEvent): void {
    if (this.isPaused) return;
    
    this.eventQueue.push(event);
    this.addActivityLogEntry(event);
    
    if (event.decisionTree) {
      this.updateDecisionTree(event.decisionTree);
    }
    
    this.screen.render();
  }

  /**
   * Create the main screen
   */
  private createScreen(): any {
    return blessed.screen({
      smartCSR: true,
      title: 'Claude Code GitHub Agent Monitor',
      dockBorders: true,
      fullUnicode: true,
      autoPadding: true,
    });
  }

  /**
   * Setup the dashboard layout
   */
  private setupLayout(): void {
    // Main container
    const container = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'cyan',
        },
      },
    });

    // Status bar (top)
    this.statusBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: 'Loading...',
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'yellow',
        },
        bg: 'black',
        fg: 'white',
      },
      tags: true,
    });

    // Activity log (left side)
    this.activityLog = blessed.log({
      top: 3,
      left: 0,
      width: '50%',
      height: '60%',
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'green',
        },
      },
      label: ' 🤖 Agent Activity ',
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        style: {
          bg: 'blue',
        },
      },
      tags: true,
    });

    // Decision tree (right side)
    this.decisionTree = blessed.box({
      top: 3,
      left: '50%',
      width: '50%',
      height: '60%',
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'magenta',
        },
      },
      label: ' 🧠 Decision Tree ',
      content: 'No active decisions',
      scrollable: true,
      tags: true,
    });

    // Statistics box (bottom left)
    this.statsBox = blessed.box({
      top: '63%',
      left: 0,
      width: '50%',
      height: '27%',
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'blue',
        },
      },
      label: ' 📊 Statistics ',
      content: 'Loading statistics...',
      scrollable: true,
      tags: true,
    });

    // Controls (bottom right)
    this.controlsBox = blessed.box({
      top: '63%',
      left: '50%',
      width: '50%',
      height: '27%',
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'red',
        },
      },
      label: ' 🎛️  Controls ',
      content: this.getControlsText(),
      tags: true,
    });

    // Add all boxes to container
    container.append(this.statusBox);
    container.append(this.activityLog);
    container.append(this.decisionTree);
    container.append(this.statsBox);
    container.append(this.controlsBox);

    // Add container to screen
    this.screen.append(container);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Handle screen resize
    this.screen.on('resize', () => {
      this.screen.render();
    });
  }

  /**
   * Setup keyboard handlers
   */
  private setupKeyHandlers(): void {
    // Quit
    this.screen.key(['q', 'C-c'], () => {
      this.stop();
      process.exit(0);
    });

    // Pause/Resume
    this.screen.key(['p', 'space'], () => {
      this.isPaused = !this.isPaused;
      this.agentStatus.isPaused = this.isPaused;
      this.updateStatusDisplay();
      this.screen.render();
    });

    // Clear log
    this.screen.key(['c'], () => {
      this.activityLog.setContent('');
      this.eventQueue = [];
      this.screen.render();
    });

    // Help
    this.screen.key(['h', '?'], () => {
      this.showHelp();
    });

    // Filter events
    this.screen.key(['f'], () => {
      this.showFilterDialog();
    });

    // Refresh
    this.screen.key(['r'], () => {
      this.updateDisplay();
      this.screen.render();
    });
  }

  /**
   * Add an entry to the activity log
   */
  private addActivityLogEntry(event: AgentEvent): void {
    const icon = AgentEventUtils.getEventIcon(event.type);
    const time = event.timestamp.toLocaleTimeString();
    const confidence = this.config.showConfidence ? 
      ` {yellow-fg}(${(event.confidence * 100).toFixed(0)}%){/}` : '';
    
    const logEntry = `{gray-fg}${time}{/} ${icon} ${event.message}${confidence}`;
    
    if (event.reasoning && event.reasoning.length > 0) {
      this.activityLog.log(logEntry);
      event.reasoning.forEach(reason => {
        this.activityLog.log(`  {gray-fg}└─{/} ${reason}`);
      });
    } else {
      this.activityLog.log(logEntry);
    }

    // Keep log size manageable
    const content = this.activityLog.getContent();
    const lines = content.split('\n');
    if (lines.length > this.config.maxLogLines) {
      const trimmedContent = lines.slice(-this.config.maxLogLines).join('\n');
      this.activityLog.setContent(trimmedContent);
    }
  }

  /**
   * Update the decision tree display
   */
  private updateDecisionTree(rootNode: DecisionNode): void {
    const treeText = this.renderDecisionNode(rootNode, 0);
    this.decisionTree.setContent(treeText);
  }

  /**
   * Render a decision node as text
   */
  private renderDecisionNode(node: DecisionNode, depth: number): string {
    const indent = '  '.repeat(depth);
    const icon = this.getResultIcon(node.result);
    const confidence = node.confidence ? 
      ` {yellow-fg}(${(node.confidence * 100).toFixed(0)}%){/}` : '';
    
    let text = `${indent}${icon} ${node.condition}${confidence}`;
    
    if (node.message) {
      text += `\n${indent}  {gray-fg}${node.message}{/}`;
    }

    if (node.children && node.children.length > 0) {
      text += '\n' + node.children
        .map(child => this.renderDecisionNode(child, depth + 1))
        .join('\n');
    }

    return text;
  }

  /**
   * Get icon for decision result
   */
  private getResultIcon(result: string): string {
    const icons: Record<string, string> = {
      pass: '{green-fg}✓{/}',
      fail: '{red-fg}✗{/}',
      warning: '{yellow-fg}⚠{/}',
      pending: '{blue-fg}○{/}',
    };
    return icons[result] || '{gray-fg}?{/}';
  }

  /**
   * Update the status display
   */
  private updateStatusDisplay(): void {
    const status = this.agentStatus;
    const modeColor = status.mode === 'autonomous' ? 'green' : 
                     status.mode === 'assisted' ? 'yellow' : 'red';
    
    const statusText = [
      `{bold}Claude Code GitHub Agent{/}`,
      `Status: {${status.isActive ? 'green' : 'red'}-fg}${status.isActive ? 'ACTIVE' : 'INACTIVE'}{/}`,
      `Mode: {${modeColor}-fg}${status.mode.toUpperCase()}{/}`,
      `Threshold: {yellow-fg}${(status.confidenceThreshold * 100).toFixed(0)}%{/}`,
      status.currentProject ? `Project: {cyan-fg}${status.currentProject}{/}` : '',
      status.lastAction ? `Last Action: {gray-fg}${status.lastAction.toLocaleTimeString()}{/}` : '',
      status.isPaused ? `{red-fg}⏸ PAUSED{/}` : '',
    ].filter(Boolean).join(' │ ');

    this.statusBox.setContent(statusText);
  }

  /**
   * Update statistics display
   */
  private updateStatistics(): void {
    const stats = this.eventEmitter.getStatistics();
    
    const statsText = [
      `{bold}Session Statistics{/}`,
      `Total Events: {cyan-fg}${stats.totalEvents}{/}`,
      `Success Rate: {green-fg}${this.agentStatus.successRate.toFixed(1)}%{/}`,
      `Avg Confidence: {yellow-fg}${(stats.averageConfidence * 100).toFixed(0)}%{/}`,
      `Actions Today: {blue-fg}${this.agentStatus.actionsToday}{/}`,
      '',
      `{bold}Event Breakdown:{/}`,
      ...Object.entries(stats.eventsByType).map(([type, count]) => 
        `${AgentEventUtils.getEventIcon(type as AgentEventType)} ${type}: ${count}`
      ),
    ].join('\n');

    this.statsBox.setContent(statsText);
  }

  /**
   * Get controls help text
   */
  private getControlsText(): string {
    return [
      '{bold}Keyboard Controls:{/}',
      '',
      '{yellow-fg}[p]{/} / {yellow-fg}[space]{/} - Pause/Resume',
      '{yellow-fg}[c]{/} - Clear activity log',
      '{yellow-fg}[r]{/} - Refresh display',
      '{yellow-fg}[f]{/} - Filter events',
      '{yellow-fg}[h]{/} / {yellow-fg}[?]{/} - Show help',
      '{yellow-fg}[q]{/} - Quit monitor',
      '',
      `{gray-fg}Status: ${this.isPaused ? 'PAUSED' : 'ACTIVE'}{/}`,
    ].join('\n');
  }

  /**
   * Update the entire display
   */
  private updateDisplay(): void {
    this.updateStatusDisplay();
    this.updateStatistics();
    this.controlsBox.setContent(this.getControlsText());
  }

  /**
   * Start the refresh timer
   */
  private startRefreshTimer(): void {
    this.refreshInterval = setInterval(() => {
      this.updateDisplay();
      this.screen.render();
    }, this.config.refreshRate);
  }

  /**
   * Show help dialog
   */
  private showHelp(): void {
    const helpBox = blessed.box({
      top: 'center',
      left: 'center',
      width: '60%',
      height: '70%',
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'yellow',
        },
        bg: 'black',
      },
      label: ' Help ',
      content: this.getHelpText(),
      scrollable: true,
      tags: true,
    });

    this.screen.append(helpBox);
    helpBox.focus();
    
    helpBox.key(['escape', 'q'], () => {
      this.screen.remove(helpBox);
      this.screen.render();
    });

    this.screen.render();
  }

  /**
   * Get help text content
   */
  private getHelpText(): string {
    return [
      '{bold}Claude Code GitHub Agent Monitor{/}',
      '',
      '{yellow-fg}This dashboard provides real-time monitoring of the autonomous agent activities.{/}',
      '',
      '{bold}Panels:{/}',
      '• {green-fg}Agent Activity{/} - Live stream of agent actions and reasoning',
      '• {magenta-fg}Decision Tree{/} - Visual representation of agent decision logic',
      '• {blue-fg}Statistics{/} - Performance metrics and event summaries',
      '• {red-fg}Controls{/} - Keyboard shortcuts and current status',
      '',
      '{bold}Event Types:{/}',
      '🔍 Scanning - Agent is looking for changes',
      '🧠 Analyzing - Agent is processing detected changes',
      '💡 Suggesting - Agent is proposing an action',
      '⚡ Executing - Agent is performing an action',
      '📚 Learning - Agent is learning from feedback',
      '⏳ Waiting - Agent is waiting for user input',
      '',
      '{bold}Tips:{/}',
      '• Use {yellow-fg}[p]{/} to pause monitoring without stopping the agent',
      '• Use {yellow-fg}[f]{/} to filter events by type or confidence',
      '• Use {yellow-fg}[c]{/} to clear the log for better readability',
      '',
      'Press {yellow-fg}[ESC]{/} or {yellow-fg}[q]{/} to close this help.',
    ].join('\n');
  }

  /**
   * Show filter dialog (placeholder for now)
   */
  private showFilterDialog(): void {
    // TODO: Implement filtering dialog
    const message = blessed.message({
      top: 'center',
      left: 'center',
      width: '50%',
      height: '30%',
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'yellow',
        },
      },
    });

    message.display('Event filtering will be implemented in the next iteration.', 3, () => {
      this.screen.render();
    });
  }
}