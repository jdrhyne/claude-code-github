import { EventEmitter } from 'events';
import { MonitoringEvent, MonitoringEventType, AggregatedMilestone, MonitoringSuggestion } from './types.js';

export class EventAggregator extends EventEmitter {
  private events: MonitoringEvent[] = [];
  private readonly MAX_EVENTS = 1000;
  private readonly MILESTONE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  private readonly SUGGESTION_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
  private lastSuggestions: Map<string, Date> = new Map();

  constructor() {
    super();
  }

  /**
   * Add an event to the aggregator
   */
  addEvent(event: MonitoringEvent): void {
    this.events.push(event);

    // Trim events if too many
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Check for milestones
    this.checkForMilestones(event);

    // Generate suggestions
    this.generateSuggestions(event);
  }

  /**
   * Check if recent events constitute a milestone
   */
  private checkForMilestones(latestEvent: MonitoringEvent): void {
    const now = Date.now();
    const recentEvents = this.events.filter(
      e => now - e.timestamp.getTime() < this.MILESTONE_WINDOW_MS
    );

    // Check for feature completion milestone
    if (latestEvent.type === MonitoringEventType.FEATURE_COMPLETE) {
      const relatedEvents = recentEvents.filter(e => 
        e.type === MonitoringEventType.TESTS_PASSING ||
        e.type === MonitoringEventType.DOCS_UPDATED ||
        e.type === MonitoringEventType.BUG_FIXED
      );

      if (relatedEvents.length >= 2) {
        const milestone: AggregatedMilestone = {
          type: 'feature_shipped',
          timestamp: new Date(),
          events: [latestEvent, ...relatedEvents],
          title: 'Feature Complete with Tests and Documentation',
          description: 'A feature has been implemented with tests passing and documentation updated.'
        };

        this.emit('milestone', milestone);
      }
    }

    // Check for release readiness milestone
    const featureCompleteEvents = recentEvents.filter(
      e => e.type === MonitoringEventType.FEATURE_COMPLETE
    );
    const bugFixEvents = recentEvents.filter(
      e => e.type === MonitoringEventType.BUG_FIXED
    );
    const testsPassingEvents = recentEvents.filter(
      e => e.type === MonitoringEventType.TESTS_PASSING
    );

    if (featureCompleteEvents.length >= 3 || 
        (featureCompleteEvents.length >= 1 && bugFixEvents.length >= 2 && testsPassingEvents.length >= 1)) {
      const milestone: AggregatedMilestone = {
        type: 'release_ready',
        timestamp: new Date(),
        events: [...featureCompleteEvents, ...bugFixEvents, ...testsPassingEvents],
        title: 'Multiple Features Ready for Release',
        description: `${featureCompleteEvents.length} features completed, ${bugFixEvents.length} bugs fixed. Consider creating a release.`
      };

      this.emit('milestone', milestone);
    }
  }

  /**
   * Generate suggestions based on events
   */
  private generateSuggestions(event: MonitoringEvent): void {
    const now = new Date();

    // Check cooldowns
    const suggestionKey = `${event.type}-${event.projectPath}`;
    const lastSuggestion = this.lastSuggestions.get(suggestionKey);
    if (lastSuggestion && now.getTime() - lastSuggestion.getTime() < this.SUGGESTION_COOLDOWN_MS) {
      return;
    }

    let suggestion: MonitoringSuggestion | null = null;

    switch (event.type) {
      case MonitoringEventType.FEATURE_COMPLETE:
        suggestion = {
          type: 'commit',
          priority: 'high',
          message: 'Feature completed! Time to commit your changes.',
          action: 'dev_checkpoint',
          reason: 'Committing completed features helps track progress and enables rollback if needed.',
          relatedEvents: [event]
        };
        break;

      case MonitoringEventType.TESTS_FAILING:
        suggestion = {
          type: 'fix',
          priority: 'high',
          message: 'Tests are failing. Focus on fixing them before continuing.',
          reason: 'Keeping tests green ensures code quality and prevents regressions.',
          relatedEvents: [event]
        };
        break;

      case MonitoringEventType.BUG_FIXED:
        if (this.hasMultipleBugFixes()) {
          suggestion = {
            type: 'release',
            priority: 'medium',
            message: 'Multiple bugs fixed. Consider creating a patch release.',
            action: 'dev_release',
            reason: 'Patch releases help users get bug fixes quickly.',
            relatedEvents: this.getRecentBugFixes()
          };
        }
        break;

      case MonitoringEventType.READY_FOR_RELEASE:
        suggestion = {
          type: 'release',
          priority: 'high',
          message: 'Project is ready for release!',
          action: 'dev_release',
          reason: 'Regular releases keep users engaged and showcase progress.',
          relatedEvents: [event]
        };
        break;

      case MonitoringEventType.BLOCKED:
        suggestion = {
          type: 'help',
          priority: 'high',
          message: 'You seem to be blocked. Consider creating an issue or asking for help.',
          action: 'dev_issue_create',
          reason: 'Getting unblocked quickly keeps development momentum.',
          relatedEvents: [event]
        };
        break;

      case MonitoringEventType.GIT_STATE_CHANGE: {
        const uncommittedChanges = event.data?.uncommittedChanges as { file_count?: number } | undefined;
        if (uncommittedChanges?.file_count && uncommittedChanges.file_count > 10) {
          suggestion = {
            type: 'commit',
            priority: 'medium',
            message: `You have ${uncommittedChanges.file_count} uncommitted files. Consider breaking them into smaller commits.`,
            action: 'dev_checkpoint',
            reason: 'Smaller commits are easier to review and revert if needed.',
            relatedEvents: [event]
          };
        }
        break;
      }
    }

    if (suggestion) {
      this.lastSuggestions.set(suggestionKey, now);
      this.emit('suggestion', suggestion);
    }
  }

  /**
   * Check if there have been multiple bug fixes recently
   */
  private hasMultipleBugFixes(): boolean {
    const recentBugFixes = this.getRecentBugFixes();
    return recentBugFixes.length >= 3;
  }

  /**
   * Get recent bug fix events
   */
  private getRecentBugFixes(): MonitoringEvent[] {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return this.events.filter(
      e => e.type === MonitoringEventType.BUG_FIXED && 
           e.timestamp.getTime() > oneDayAgo
    );
  }

  /**
   * Get statistics about events
   */
  getStats(): Record<string, number | Record<string, number>> {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const recentEvents = this.events.filter(e => e.timestamp.getTime() > oneHourAgo);
    const dailyEvents = this.events.filter(e => e.timestamp.getTime() > oneDayAgo);

    const eventTypeCount = new Map<MonitoringEventType, number>();
    for (const event of dailyEvents) {
      eventTypeCount.set(event.type, (eventTypeCount.get(event.type) || 0) + 1);
    }

    return {
      totalEvents: this.events.length,
      eventsLastHour: recentEvents.length,
      eventsLastDay: dailyEvents.length,
      eventTypes: Object.fromEntries(eventTypeCount)
    };
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 10): MonitoringEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.lastSuggestions.clear();
    this.removeAllListeners();
  }
}