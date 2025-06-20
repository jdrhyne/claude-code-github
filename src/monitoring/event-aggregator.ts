import { EventEmitter } from 'events';
import { MonitoringEvent, MonitoringEventType, AggregatedMilestone, MonitoringSuggestion } from './types.js';
import { Config, DecisionContext } from '../types.js';
import { LLMDecisionAgent } from '../ai/llm-decision-agent.js';
import { GitManager } from '../git.js';
import { FeedbackStore } from '../learning/feedback-store.js';
import { LearningEngine } from '../learning/learning-engine.js';
import { FeedbackHandlers } from '../learning/feedback-handlers.js';

export class EventAggregator extends EventEmitter {
  private events: MonitoringEvent[] = [];
  private readonly MAX_EVENTS = 1000;
  private readonly MILESTONE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  private readonly SUGGESTION_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
  private lastSuggestions: Map<string, Date> = new Map();
  private llmAgent?: LLMDecisionAgent;
  private config?: Config;
  private processingDecision = false;
  private gitManager?: GitManager;
  private feedbackHandlers?: FeedbackHandlers;
  private decisionCounter = 0;

  constructor(gitManager?: GitManager) {
    super();
    this.gitManager = gitManager;
  }
  
  /**
   * Initialize with config to enable LLM integration
   */
  async initialize(config: Config): Promise<void> {
    this.config = config;
    
    if (config.automation?.enabled && config.automation.mode !== 'off') {
      try {
        // Initialize LLM agent
        this.llmAgent = new LLMDecisionAgent(config.automation);
        await this.llmAgent.initialize();
        
        // Initialize learning system if enabled
        if (config.automation.learning?.enabled) {
          const dataDir = config.dataDir || '~/.claude-code-github';
          const feedbackStore = new FeedbackStore(dataDir);
          await feedbackStore.initialize();
          
          const learningEngine = new LearningEngine(feedbackStore, config.automation);
          this.llmAgent.setLearningEngine(learningEngine);
          
          this.feedbackHandlers = new FeedbackHandlers(feedbackStore, learningEngine);
          
          // Listen for feedback events
          this.feedbackHandlers.on('feedback-recorded', (event) => {
            this.addEvent(event);
          });
        }
      } catch (error) {
        console.error('Failed to initialize LLM agent:', error);
        // Continue without LLM if initialization fails
      }
    }
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
    
    // Process with LLM if enabled
    if (this.llmAgent && this.config?.automation?.enabled && !this.processingDecision) {
      this.processWithLLM(event).catch(error => {
        console.error('Error processing event with LLM:', error);
      });
    }
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
   * Get feedback handlers for external access
   */
  getFeedbackHandlers(): FeedbackHandlers | undefined {
    return this.feedbackHandlers;
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.lastSuggestions.clear();
    this.removeAllListeners();
  }
  
  /**
   * Process event with LLM for intelligent decision making
   */
  private async processWithLLM(event: MonitoringEvent): Promise<void> {
    if (!this.llmAgent || this.processingDecision) {
      return;
    }
    
    // Skip certain event types that don't need LLM processing
    const skipEventTypes = [
      MonitoringEventType.LLM_DECISION_REQUESTED,
      MonitoringEventType.LLM_DECISION_MADE,
      MonitoringEventType.LLM_ACTION_EXECUTED,
      MonitoringEventType.LLM_ACTION_FAILED,
      MonitoringEventType.LLM_APPROVAL_REQUIRED,
      MonitoringEventType.LLM_FEEDBACK_RECEIVED
    ];
    
    if (skipEventTypes.includes(event.type)) {
      return;
    }
    
    try {
      this.processingDecision = true;
      
      // Emit that we're requesting an LLM decision
      this.addEvent({
        type: MonitoringEventType.LLM_DECISION_REQUESTED,
        timestamp: new Date(),
        projectPath: event.projectPath,
        data: { triggerEvent: event }
      });
      
      // Build context for LLM
      const context = await this.buildDecisionContext(event);
      
      // Get LLM decision
      const decision = await this.llmAgent.makeDecision(context);
      
      // Guard against undefined decision
      if (!decision || typeof decision !== 'object') {
        console.error('LLM returned invalid decision');
        return;
      }
      
      // Emit the decision
      this.addEvent({
        type: MonitoringEventType.LLM_DECISION_MADE,
        timestamp: new Date(),
        projectPath: event.projectPath,
        data: { decision, context }
      });
      
      // Generate decision ID for tracking
      const decisionId = `decision-${Date.now()}-${++this.decisionCounter}`;
      
      // Register decision for feedback tracking
      if (this.feedbackHandlers) {
        this.feedbackHandlers.registerDecision(decisionId, decision, context);
      }
      
      // Handle the decision
      if (decision && decision.requiresApproval) {
        this.emit('llm-approval-required', { decision, context, decisionId });
        this.addEvent({
          type: MonitoringEventType.LLM_APPROVAL_REQUIRED,
          timestamp: new Date(),
          projectPath: event.projectPath,
          data: { decision, reason: decision.reasoning, decisionId }
        });
      } else if (decision.confidence >= (this.config?.automation?.thresholds.auto_execute || 0.95)) {
        this.emit('llm-action-ready', { decision, context, decisionId });
      }
      
    } finally {
      this.processingDecision = false;
    }
  }
  
  /**
   * Build context for LLM decision making
   */
  private async buildDecisionContext(event: MonitoringEvent): Promise<DecisionContext> {
    // Get project state (this would need to be implemented based on your git integration)
    const projectState = await this.getProjectState(event.projectPath);
    
    return {
      currentEvent: event,
      projectState,
      recentHistory: this.events
        .filter(e => e.projectPath === event.projectPath)
        .slice(-10),
      userPreferences: this.config?.automation?.preferences || {
        commit_style: 'conventional',
        commit_frequency: 'moderate',
        risk_tolerance: 'medium'
      },
      possibleActions: ['commit', 'branch', 'pr', 'stash', 'wait', 'suggest'],
      timeContext: {
        currentTime: new Date(),
        isWorkingHours: this.isWorkingHours(),
        lastUserActivity: new Date(), // This would need to track actual user activity
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' })
      }
    };
  }
  
  /**
   * Get project state from git
   */
  private async getProjectState(projectPath: string): Promise<any> {
    const branch = await this.getBranchName(projectPath);
    const isProtected = this.config?.git_workflow.protected_branches.includes(branch) || false;
    
    let uncommittedChanges = 0;
    let lastCommitTime = new Date();
    
    // Use GitManager if available
    if (this.gitManager) {
      try {
        const changes = await this.gitManager.getUncommittedChanges(projectPath);
        uncommittedChanges = changes?.file_count || 0;
        
        const commits = await this.gitManager.getRecentCommits(projectPath, 1);
        if (commits.length > 0 && commits[0].date) {
          lastCommitTime = new Date(commits[0].date);
        }
      } catch (error) {
        // Fallback to defaults if GitManager fails
      }
    }
    
    return {
      branch,
      isProtected,
      uncommittedChanges,
      lastCommitTime,
      testStatus: 'unknown' as const,
      buildStatus: 'unknown' as const
    };
  }
  
  /**
   * Get branch name (simple implementation)
   */
  private async getBranchName(projectPath: string): Promise<string> {
    // Use GitManager if available
    if (this.gitManager) {
      try {
        return await this.gitManager.getCurrentBranch(projectPath);
      } catch {
        // Fallback to direct git command
      }
    }
    
    try {
      const { execSync } = await import('child_process');
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectPath,
        encoding: 'utf8'
      }).trim();
      return branch;
    } catch {
      return 'main';
    }
  }
  
  /**
   * Check if current time is within working hours
   */
  private isWorkingHours(): boolean {
    if (!this.config?.automation?.preferences.working_hours) {
      return true;
    }
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const { start, end } = this.config.automation.preferences.working_hours;
    
    return currentTime >= start && currentTime <= end;
  }
}