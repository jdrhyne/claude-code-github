/**
 * Agent Event System for Real-time Monitoring
 * 
 * This module provides the core event system for tracking and visualizing
 * autonomous agent activities in real-time.
 */

import { EventEmitter } from 'events';

/**
 * Types of agent activities that can be monitored
 */
export type AgentEventType = 
  | 'scanning'      // Agent is scanning for changes
  | 'analyzing'     // Agent is analyzing detected changes
  | 'suggesting'    // Agent is making a suggestion
  | 'executing'     // Agent is executing an action
  | 'learning'      // Agent is learning from feedback
  | 'waiting'       // Agent is waiting for user input
  | 'error'         // Agent encountered an error
  | 'idle';         // Agent is idle/inactive

/**
 * Result of a decision or action
 */
export type AgentResult = 'pass' | 'fail' | 'warning' | 'pending';

/**
 * Context information about the current project state
 */
export interface ProjectContext {
  path: string;
  branch: string;
  isProtected: boolean;
  hasUncommittedChanges: boolean;
  filesChanged: number;
  lastCommit?: string;
  testsPassing?: boolean;
}

/**
 * Represents a decision made by the agent
 */
export interface AgentDecision {
  id: string;
  type: 'commit' | 'branch' | 'pr' | 'push' | 'warning';
  action: string;
  confidence: number;
  reasoning: string[];
  suggestedCommand?: string;
  requiresApproval: boolean;
  timestamp: Date;
}

/**
 * A node in the decision tree showing agent reasoning
 */
export interface DecisionNode {
  id: string;
  condition: string;
  result: AgentResult;
  confidence?: number;
  message?: string;
  children?: DecisionNode[];
  metadata?: Record<string, any>;
}

/**
 * Core agent event interface
 */
export interface AgentEvent {
  id: string;
  type: AgentEventType;
  timestamp: Date;
  confidence: number;
  context: ProjectContext;
  message: string;
  reasoning?: string[];
  decision?: AgentDecision;
  decisionTree?: DecisionNode;
  metadata?: Record<string, any>;
  duration?: number; // For timing analysis
}

/**
 * Agent status information
 */
export interface AgentStatus {
  mode: 'off' | 'learning' | 'assisted' | 'autonomous';
  isActive: boolean;
  currentProject?: string;
  lastAction?: Date;
  actionsToday: number;
  successRate: number;
  confidenceThreshold: number;
  isPaused: boolean;
}

/**
 * Configuration for event filtering and display
 */
export interface EventFilterConfig {
  types?: AgentEventType[];
  minConfidence?: number;
  projects?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Core event emitter for agent activities
 */
export class AgentEventEmitter extends EventEmitter {
  private eventHistory: AgentEvent[] = [];
  private maxHistorySize = 1000;

  /**
   * Emit an agent activity event
   */
  public emitAgentActivity(event: Omit<AgentEvent, 'id' | 'timestamp'>): void {
    const fullEvent: AgentEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    // Add to history
    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Emit the event
    this.emit('agent-activity', fullEvent);
    this.emit(`agent-${event.type}`, fullEvent);
  }

  /**
   * Subscribe to agent activity events
   */
  public onAgentActivity(callback: (event: AgentEvent) => void): void {
    this.on('agent-activity', callback);
  }

  /**
   * Subscribe to specific type of agent events
   */
  public onAgentEventType(type: AgentEventType, callback: (event: AgentEvent) => void): void {
    this.on(`agent-${type}`, callback);
  }

  /**
   * Get filtered event history
   */
  public getEventHistory(filter?: EventFilterConfig): AgentEvent[] {
    let events = [...this.eventHistory];

    if (filter) {
      if (filter.types) {
        events = events.filter(e => filter.types!.includes(e.type));
      }
      if (filter.minConfidence) {
        events = events.filter(e => e.confidence >= filter.minConfidence!);
      }
      if (filter.projects) {
        events = events.filter(e => filter.projects!.includes(e.context.path));
      }
      if (filter.timeRange) {
        events = events.filter(e => 
          e.timestamp >= filter.timeRange!.start && 
          e.timestamp <= filter.timeRange!.end
        );
      }
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get current agent statistics
   */
  public getStatistics(): {
    totalEvents: number;
    eventsByType: Record<AgentEventType, number>;
    averageConfidence: number;
    successfulActions: number;
    recentActivity: AgentEvent[];
  } {
    const eventsByType = this.eventHistory.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<AgentEventType, number>);

    const totalConfidence = this.eventHistory.reduce((sum, e) => sum + e.confidence, 0);
    const avgConfidence = this.eventHistory.length > 0 ? totalConfidence / this.eventHistory.length : 0;

    const successfulActions = this.eventHistory.filter(e => 
      e.type === 'executing' && e.metadata?.success === true
    ).length;

    const recentActivity = this.eventHistory
      .slice(-10)
      .reverse();

    return {
      totalEvents: this.eventHistory.length,
      eventsByType,
      averageConfidence: avgConfidence,
      successfulActions,
      recentActivity,
    };
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Global agent event emitter instance
 */
export const agentEvents = new AgentEventEmitter();

/**
 * Utility functions for working with agent events
 */
export class AgentEventUtils {
  /**
   * Format an event for display
   */
  static formatEvent(event: AgentEvent): string {
    const time = event.timestamp.toLocaleTimeString();
    const confidence = `(${(event.confidence * 100).toFixed(0)}%)`;
    return `${time} ${this.getEventIcon(event.type)} ${event.message} ${confidence}`;
  }

  /**
   * Get an icon for an event type
   */
  static getEventIcon(type: AgentEventType): string {
    const icons = {
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
   * Get color for event type (for terminal display)
   */
  static getEventColor(type: AgentEventType): string {
    const colors = {
      scanning: 'blue',
      analyzing: 'yellow',
      suggesting: 'green',
      executing: 'magenta',
      learning: 'cyan',
      waiting: 'gray',
      error: 'red',
      idle: 'gray',
    };
    return colors[type] || 'white';
  }

  /**
   * Create a decision tree from reasoning steps
   */
  static createDecisionTree(reasoning: string[], confidence: number): DecisionNode {
    const rootNode: DecisionNode = {
      id: 'root',
      condition: 'Agent Analysis',
      result: confidence > 0.7 ? 'pass' : confidence > 0.4 ? 'warning' : 'fail',
      confidence,
      children: reasoning.map((step, index) => ({
        id: `step_${index}`,
        condition: step,
        result: 'pass' as AgentResult,
      })),
    };

    return rootNode;
  }
}