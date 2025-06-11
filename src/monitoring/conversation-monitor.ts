import { EventEmitter } from 'events';
import { MonitoringEvent, MonitoringEventType, ConversationPattern } from './types.js';

export class ConversationMonitor extends EventEmitter {
  private patterns: ConversationPattern[] = [
    // Feature development patterns
    {
      type: 'feature_complete',
      regex: /(?:implemented|created|added|built|finished)\s+(?:the\s+)?(?:new\s+)?feature/i,
      eventType: MonitoringEventType.FEATURE_COMPLETE,
      priority: 'high'
    },
    {
      type: 'feature_start',
      regex: /(?:let's|I'll|starting to|going to)\s+(?:implement|create|add|build)\s+(?:a\s+)?(?:new\s+)?feature/i,
      eventType: MonitoringEventType.FEATURE_START,
      priority: 'medium'
    },
    
    // Bug fix patterns
    {
      type: 'bug_fix',
      regex: /(?:fixed|resolved|patched|corrected)\s+(?:the\s+)?(?:bug|issue|problem|error)/i,
      eventType: MonitoringEventType.BUG_FIXED,
      priority: 'high'
    },
    {
      type: 'bug_found',
      regex: /(?:found|discovered|there's|encountering)\s+(?:a\s+)?(?:bug|issue|problem|error)/i,
      eventType: MonitoringEventType.BUG_FOUND,
      priority: 'medium'
    },
    
    // Test patterns
    {
      type: 'tests_added',
      regex: /(?:added|created|wrote|implemented)\s+(?:new\s+)?tests?/i,
      eventType: MonitoringEventType.TESTS_ADDED,
      priority: 'medium'
    },
    {
      type: 'tests_passing',
      regex: /(?:all\s+)?tests?\s+(?:are\s+)?(?:passing|pass|green|successful)/i,
      eventType: MonitoringEventType.TESTS_PASSING,
      priority: 'high'
    },
    {
      type: 'tests_failing',
      regex: /tests?\s+(?:are\s+)?(?:failing|fail|red|broken)/i,
      eventType: MonitoringEventType.TESTS_FAILING,
      priority: 'high'
    },
    
    // Refactoring patterns
    {
      type: 'refactor_complete',
      regex: /(?:refactored|reorganized|restructured|cleaned up)\s+(?:the\s+)?code/i,
      eventType: MonitoringEventType.REFACTOR_COMPLETE,
      priority: 'medium'
    },
    
    // Documentation patterns
    {
      type: 'docs_updated',
      regex: /(?:updated|added|wrote|created)\s+(?:the\s+)?(?:documentation|docs|README)/i,
      eventType: MonitoringEventType.DOCS_UPDATED,
      priority: 'low'
    },
    
    // Deployment/Release patterns
    {
      type: 'ready_for_release',
      regex: /(?:ready\s+for|time\s+to|should\s+create)\s+(?:a\s+)?release/i,
      eventType: MonitoringEventType.READY_FOR_RELEASE,
      priority: 'high'
    },
    {
      type: 'deployment_ready',
      regex: /(?:ready\s+to|time\s+to|can\s+now)\s+deploy/i,
      eventType: MonitoringEventType.DEPLOYMENT_READY,
      priority: 'high'
    },
    
    // Progress indicators
    {
      type: 'milestone_reached',
      regex: /(?:completed|finished|done with)\s+(?:the\s+)?(?:milestone|major\s+feature|sprint)/i,
      eventType: MonitoringEventType.MILESTONE_REACHED,
      priority: 'high'
    },
    {
      type: 'blocked',
      regex: /(?:blocked|stuck|can't\s+proceed|waiting\s+for)/i,
      eventType: MonitoringEventType.BLOCKED,
      priority: 'high'
    }
  ];

  private messageBuffer: Array<{message: string, role: string, timestamp: Date}> = [];
  private readonly MAX_BUFFER_SIZE = 100;
  private isRunning = false;

  constructor() {
    super();
    this.isRunning = true;
  }

  /**
   * Process a conversation message
   */
  processMessage(message: string, role: 'user' | 'assistant'): void {
    if (!this.isRunning) return;

    // Add to buffer
    this.messageBuffer.push({
      message,
      role,
      timestamp: new Date()
    });

    // Trim buffer if too large
    if (this.messageBuffer.length > this.MAX_BUFFER_SIZE) {
      this.messageBuffer.shift();
    }

    // Analyze message for patterns
    const events = this.analyzeMessage(message, role);
    
    // Emit events
    for (const event of events) {
      this.emit('event', event);
    }
  }

  /**
   * Analyze a message for patterns
   */
  private analyzeMessage(message: string, role: string): MonitoringEvent[] {
    const events: MonitoringEvent[] = [];

    for (const pattern of this.patterns) {
      if (pattern.regex.test(message)) {
        const event: MonitoringEvent = {
          type: pattern.eventType,
          timestamp: new Date(),
          projectPath: '', // Will be filled by MonitorManager
          data: {
            message,
            role,
            pattern: pattern.type,
            priority: pattern.priority
          }
        };

        events.push(event);
      }
    }

    // Check for file mentions
    const fileMentions = this.extractFileMentions(message);
    if (fileMentions.length > 0) {
      events.push({
        type: MonitoringEventType.FILES_MENTIONED,
        timestamp: new Date(),
        projectPath: '',
        data: {
          files: fileMentions,
          message,
          role
        }
      });
    }

    return events;
  }

  /**
   * Extract file mentions from a message
   */
  private extractFileMentions(message: string): string[] {
    const files: string[] = [];
    
    // Common file patterns
    const filePatterns = [
      /(?:file|created|modified|updated|deleted)\s+`([^`]+)`/gi,
      /(?:in|at|from)\s+([\/\w\-\.]+\.\w+)/gi,
      /([\/\w\-\.]+\.\w+)(?:\s+(?:file|was|is))/gi
    ];

    for (const pattern of filePatterns) {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        const file = match[1];
        if (this.isLikelyFilePath(file) && !files.includes(file)) {
          files.push(file);
        }
      }
    }

    return files;
  }

  /**
   * Check if a string is likely a file path
   */
  private isLikelyFilePath(str: string): boolean {
    // Must have an extension
    if (!str.includes('.')) return false;
    
    // Common code file extensions
    const codeExtensions = [
      '.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs',
      '.cpp', '.c', '.h', '.cs', '.rb', '.php', '.swift', '.kt',
      '.md', '.json', '.yaml', '.yml', '.xml', '.html', '.css',
      '.scss', '.less', '.sql', '.sh', '.bash', '.ps1'
    ];

    return codeExtensions.some(ext => str.endsWith(ext));
  }

  /**
   * Get recent conversation context
   */
  getRecentContext(messageCount: number = 10): any[] {
    return this.messageBuffer.slice(-messageCount);
  }

  /**
   * Check if monitor is active
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Stop the monitor
   */
  stop(): void {
    this.isRunning = false;
    this.messageBuffer = [];
    this.removeAllListeners();
  }
}