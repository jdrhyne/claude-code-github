import { EventEmitter } from 'events';
import { FeedbackStore, UserFeedback, ActionOutcome } from './feedback-store.js';
import { LearningEngine } from './learning-engine.js';
import { LLMDecision, DecisionContext } from '../types.js';
import { MonitoringEvent, MonitoringEventType } from '../monitoring/types.js';

export interface FeedbackRequest {
  decisionId: string;
  feedback: UserFeedback;
  context?: any;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  insights?: any;
}

export class FeedbackHandlers extends EventEmitter {
  private pendingDecisions: Map<string, { decision: LLMDecision; context: DecisionContext }> = new Map();
  private recentActions: Map<string, string> = new Map(); // Maps decision ID to feedback ID
  
  constructor(
    private feedbackStore: FeedbackStore,
    private learningEngine: LearningEngine
  ) {
    super();
  }
  
  /**
   * Register a decision for feedback tracking
   */
  registerDecision(id: string, decision: LLMDecision, context: DecisionContext): void {
    this.pendingDecisions.set(id, { decision, context });
    
    // Auto-cleanup after 1 hour
    setTimeout(() => {
      if (this.pendingDecisions.has(id)) {
        // Record as implicit approval if no explicit feedback
        this.recordImplicitApproval(id);
      }
    }, 60 * 60 * 1000);
  }
  
  /**
   * Handle user approval of a decision
   */
  async handleApproval(decisionId: string, reason?: string): Promise<FeedbackResponse> {
    const pending = this.pendingDecisions.get(decisionId);
    if (!pending) {
      return {
        success: false,
        message: 'Decision not found or already processed'
      };
    }
    
    const feedback: UserFeedback = {
      type: 'approval',
      reason
    };
    
    // Record feedback only once through learning engine
    await this.learningEngine.recordFeedback(
      pending.decision,
      pending.context,
      feedback
    );
    
    // Get the feedback ID from the most recent entry
    const recent = await this.feedbackStore.getRecentFeedback(1, pending.context.currentEvent.projectPath);
    const feedbackId = recent[0]?.id || `feedback-${Date.now()}`;
    
    this.pendingDecisions.delete(decisionId);
    this.recentActions.set(decisionId, feedbackId);
    
    // Emit event for monitoring
    this.emit('feedback-recorded', {
      type: MonitoringEventType.LLM_FEEDBACK_RECEIVED,
      timestamp: new Date(),
      projectPath: pending.context.currentEvent.projectPath,
      data: { feedbackType: 'approval', decisionId, reason }
    });
    
    return {
      success: true,
      message: 'Approval recorded successfully'
    };
  }
  
  /**
   * Handle user rejection of a decision
   */
  async handleRejection(decisionId: string, reason?: string): Promise<FeedbackResponse> {
    const pending = this.pendingDecisions.get(decisionId);
    if (!pending) {
      return {
        success: false,
        message: 'Decision not found or already processed'
      };
    }
    
    const feedback: UserFeedback = {
      type: 'rejection',
      reason
    };
    
    // Record feedback only once through learning engine
    await this.learningEngine.recordFeedback(
      pending.decision,
      pending.context,
      feedback
    );
    
    this.pendingDecisions.delete(decisionId);
    
    // Emit event
    this.emit('feedback-recorded', {
      type: MonitoringEventType.LLM_FEEDBACK_RECEIVED,
      timestamp: new Date(),
      projectPath: pending.context.currentEvent.projectPath,
      data: { feedbackType: 'rejection', decisionId, reason }
    });
    
    return {
      success: true,
      message: 'Rejection recorded successfully'
    };
  }
  
  /**
   * Handle user correction of a decision
   */
  async handleCorrection(
    decisionId: string,
    correctedAction: string,
    reason?: string
  ): Promise<FeedbackResponse> {
    const pending = this.pendingDecisions.get(decisionId);
    if (!pending) {
      return {
        success: false,
        message: 'Decision not found or already processed'
      };
    }
    
    const feedback: UserFeedback = {
      type: 'correction',
      reason,
      correctedAction,
      correctedDecision: {
        ...pending.decision,
        action: correctedAction
      }
    };
    
    // Record feedback only once through learning engine
    await this.learningEngine.recordFeedback(
      pending.decision,
      pending.context,
      feedback
    );
    
    // Get the feedback ID from the most recent entry
    const recent = await this.feedbackStore.getRecentFeedback(1, pending.context.currentEvent.projectPath);
    const feedbackId = recent[0]?.id || `feedback-${Date.now()}`;
    
    this.pendingDecisions.delete(decisionId);
    this.recentActions.set(decisionId, feedbackId);
    
    // Get insights for the corrected action
    const insights = await this.learningEngine.analyzeDecision(
      { ...pending.decision, action: correctedAction },
      pending.context
    );
    
    // Emit event
    this.emit('feedback-recorded', {
      type: MonitoringEventType.LLM_FEEDBACK_RECEIVED,
      timestamp: new Date(),
      projectPath: pending.context.currentEvent.projectPath,
      data: { 
        feedbackType: 'correction', 
        decisionId, 
        originalAction: pending.decision.action,
        correctedAction,
        reason 
      }
    });
    
    return {
      success: true,
      message: 'Correction recorded and learned',
      insights
    };
  }
  
  /**
   * Record action outcome
   */
  async recordOutcome(
    decisionId: string,
    outcome: ActionOutcome
  ): Promise<FeedbackResponse> {
    const feedbackId = this.recentActions.get(decisionId);
    if (!feedbackId) {
      return {
        success: false,
        message: 'No feedback record found for this decision'
      };
    }
    
    await this.feedbackStore.updateOutcome(feedbackId, outcome);
    
    return {
      success: true,
      message: 'Outcome recorded successfully'
    };
  }
  
  /**
   * Get feedback statistics
   */
  async getStats(projectPath?: string): Promise<any> {
    return await this.feedbackStore.getStats(projectPath);
  }
  
  /**
   * Get recent feedback
   */
  async getRecentFeedback(limit: number = 10, projectPath?: string): Promise<any[]> {
    return await this.feedbackStore.getRecentFeedback(limit, projectPath);
  }
  
  /**
   * Get learned preferences
   */
  async getLearnedPreferences(projectPath: string): Promise<any[]> {
    return await this.learningEngine.getLearnedPreferences(projectPath);
  }
  
  /**
   * Record implicit approval (no explicit feedback given)
   */
  private async recordImplicitApproval(decisionId: string): Promise<void> {
    const pending = this.pendingDecisions.get(decisionId);
    if (!pending) return;
    
    const feedback: UserFeedback = {
      type: 'implicit_approval'
    };
    
    // Record feedback only once through learning engine
    await this.learningEngine.recordFeedback(
      pending.decision,
      pending.context,
      feedback
    );
    
    this.pendingDecisions.delete(decisionId);
    
    // Emit event
    this.emit('feedback-recorded', {
      type: MonitoringEventType.LLM_FEEDBACK_RECEIVED,
      timestamp: new Date(),
      projectPath: pending.context.currentEvent.projectPath,
      data: { feedbackType: 'implicit_approval', decisionId }
    });
  }
  
  /**
   * Clear pending decisions (for cleanup)
   */
  clearPendingDecisions(): void {
    this.pendingDecisions.clear();
    this.recentActions.clear();
  }
}