import { EventEmitter } from 'events';
import { FileWatcher, FileChangeEvent } from '../file-watcher.js';
import { GitManager } from '../git.js';
import { ProjectConfig, Config } from '../types.js';
import { ConversationMonitor } from './conversation-monitor.js';
import { EventAggregator } from './event-aggregator.js';
import { MonitoringEvent, MonitoringEventType } from './types.js';

export interface MonitorManagerOptions {
  fileWatcher: FileWatcher;
  gitManager: GitManager;
  projects: ProjectConfig[];
  config?: Config;
}

export class MonitorManager extends EventEmitter {
  private fileWatcher: FileWatcher;
  private gitManager: GitManager;
  private conversationMonitor: ConversationMonitor;
  private eventAggregator: EventAggregator;
  private projects: Map<string, ProjectConfig> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastGitStates: Map<string, string> = new Map();
  private config?: Config;

  constructor(options: MonitorManagerOptions) {
    super();
    this.fileWatcher = options.fileWatcher;
    this.gitManager = options.gitManager;
    this.config = options.config;
    this.conversationMonitor = new ConversationMonitor();
    this.eventAggregator = new EventAggregator(this.gitManager);

    // Store projects
    options.projects.forEach(project => {
      this.projects.set(project.path, project);
    });

    this.setupEventListeners();
    this.startMonitoring();
    
    // Initialize EventAggregator with config if available
    if (this.config) {
      this.eventAggregator.initialize(this.config).catch(error => {
        console.error('Failed to initialize EventAggregator:', error);
      });
    }
  }

  /**
   * Setup event listeners for various monitors
   */
  private setupEventListeners(): void {
    // File system events
    this.fileWatcher.addChangeListener((event: FileChangeEvent) => {
      this.handleFileChange(event);
    });

    // Conversation events
    this.conversationMonitor.on('event', (event: MonitoringEvent) => {
      this.eventAggregator.addEvent(event);
      this.emit('monitoring-event', event);
    });

    // Aggregated events
    this.eventAggregator.on('milestone', (milestone) => {
      this.emit('milestone', milestone);
    });

    this.eventAggregator.on('suggestion', (suggestion) => {
      this.emit('suggestion', suggestion);
    });
  }

  /**
   * Start monitoring all projects
   */
  private startMonitoring(): void {
    for (const [projectPath, project] of this.projects) {
      // Monitor Git state every 30 seconds
      const interval = setInterval(() => {
        this.checkGitState(projectPath, project);
      }, 30000);

      this.monitoringIntervals.set(projectPath, interval);

      // Initial Git state check
      this.checkGitState(projectPath, project);
    }
  }

  /**
   * Stop all monitoring
   */
  stop(): void {
    // Clear all intervals
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();

    // Stop conversation monitor
    this.conversationMonitor.stop();

    // Clear event aggregator
    this.eventAggregator.clear();
  }

  /**
   * Handle file change events
   */
  private async handleFileChange(event: FileChangeEvent): Promise<void> {
    const monitoringEvent: MonitoringEvent = {
      type: MonitoringEventType.FILE_CHANGE,
      timestamp: event.timestamp,
      projectPath: event.projectPath,
      data: {
        filePath: event.filePath,
        changeType: event.eventType
      }
    };

    this.eventAggregator.addEvent(monitoringEvent);
    this.emit('monitoring-event', monitoringEvent);

    // Check if this might warrant a Git state check
    if (this.isSignificantFileChange(event)) {
      const project = this.projects.get(event.projectPath);
      if (project) {
        await this.checkGitState(event.projectPath, project);
      }
    }
  }

  /**
   * Check if a file change is significant enough to trigger Git state check
   */
  private isSignificantFileChange(event: FileChangeEvent): boolean {
    const significantExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs'];
    const significantPaths = ['src/', 'lib/', 'components/', 'features/'];

    const extension = event.filePath.substring(event.filePath.lastIndexOf('.'));
    const hasSignificantExtension = significantExtensions.includes(extension);
    const inSignificantPath = significantPaths.some(path => event.filePath.includes(path));

    return hasSignificantExtension || inSignificantPath;
  }

  /**
   * Check Git state for changes
   */
  private async checkGitState(projectPath: string, _project: ProjectConfig): Promise<void> {
    try {
      // Get current Git state
      const branch = await this.gitManager.getCurrentBranch(projectPath);
      const changes = await this.gitManager.getUncommittedChanges(projectPath);
      const commits = await this.gitManager.getRecentCommits(projectPath, 1);

      // Create state hash
      const stateHash = this.createGitStateHash(branch, changes || {}, commits);
      const lastHash = this.lastGitStates.get(projectPath);

      if (stateHash !== lastHash) {
        this.lastGitStates.set(projectPath, stateHash);

        // Emit Git state change event
        const event: MonitoringEvent = {
          type: MonitoringEventType.GIT_STATE_CHANGE,
          timestamp: new Date(),
          projectPath,
          data: {
            branch,
            uncommittedChanges: changes,
            latestCommit: commits[0]
          }
        };

        this.eventAggregator.addEvent(event);
        this.emit('monitoring-event', event);
      }
    } catch (error) {
      console.error(`Error checking Git state for ${projectPath}:`, error);
    }
  }

  /**
   * Create a hash of Git state for comparison
   */
  private createGitStateHash(branch: string, changes: { file_count?: number }, commits: Array<{ hash?: string }>): string {
    const stateObj = {
      branch,
      changeCount: changes?.file_count || 0,
      latestCommitHash: commits[0]?.hash || ''
    };
    return JSON.stringify(stateObj);
  }

  /**
   * Process MCP conversation message
   */
  processConversationMessage(message: string, role: 'user' | 'assistant'): void {
    this.conversationMonitor.processMessage(message, role);
  }

  /**
   * Get current monitoring state
   */
  getMonitoringState(): {
    projects: ProjectConfig[];
    activeMonitors: {
      fileWatcher: boolean;
      gitMonitor: boolean;
      conversationMonitor: boolean;
    };
    eventStats: Record<string, number | Record<string, number>>;
    lastEvents: MonitoringEvent[];
  } {
    return {
      projects: Array.from(this.projects.values()),
      activeMonitors: {
        fileWatcher: true,
        gitMonitor: this.monitoringIntervals.size > 0,
        conversationMonitor: this.conversationMonitor.isActive()
      },
      eventStats: this.eventAggregator.getStats(),
      lastEvents: this.eventAggregator.getRecentEvents(10)
    };
  }
  
  /**
   * Get the event aggregator instance
   */
  getEventAggregator(): EventAggregator {
    return this.eventAggregator;
  }
}