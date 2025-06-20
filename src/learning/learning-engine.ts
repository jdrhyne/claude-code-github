import { FeedbackStore, FeedbackEntry, UserFeedback, PreferencePattern } from './feedback-store.js';
import { LLMDecision, DecisionContext, AutomationConfig } from '../types.js';
import { LLMDecisionAgent } from '../ai/llm-decision-agent.js';

export interface LearningInsights {
  shouldProceed: boolean;
  confidence: number;
  adjustedDecision?: Partial<LLMDecision>;
  reasoning: string[];
  historicalContext: HistoricalContext;
}

export interface HistoricalContext {
  similarDecisions: number;
  approvalRate: number;
  lastUserAction?: string;
  commonCorrections: string[];
  userPreferences: UserPreference[];
}

export interface UserPreference {
  type: string;
  value: any;
  confidence: number;
  evidence: string[];
}

export class LearningEngine {
  private feedbackStore: FeedbackStore;
  private llmAgent?: LLMDecisionAgent;
  private insights: Map<string, LearningInsights> = new Map();
  
  constructor(
    feedbackStore: FeedbackStore,
    private config: AutomationConfig
  ) {
    this.feedbackStore = feedbackStore;
  }
  
  /**
   * Initialize with LLM agent if available
   */
  setLLMAgent(agent: LLMDecisionAgent): void {
    this.llmAgent = agent;
  }
  
  /**
   * Analyze a decision based on historical feedback
   */
  async analyzeDecision(
    decision: LLMDecision,
    context: DecisionContext
  ): Promise<LearningInsights> {
    // Find similar past decisions
    const similarDecisions = await this.feedbackStore.findSimilarDecisions(context);
    const stats = await this.feedbackStore.getStats(context.currentEvent.projectPath);
    
    // Build historical context
    const historicalContext = await this.buildHistoricalContext(
      decision,
      context,
      similarDecisions,
      stats
    );
    
    // Generate insights
    const insights = this.generateInsights(
      decision,
      context,
      historicalContext
    );
    
    // Cache insights for later reference
    const key = this.getInsightKey(decision, context);
    this.insights.set(key, insights);
    
    return insights;
  }
  
  /**
   * Record user feedback for a decision
   */
  async recordFeedback(
    decision: LLMDecision,
    context: DecisionContext,
    feedback: UserFeedback
  ): Promise<void> {
    const feedbackId = await this.feedbackStore.recordFeedback(
      decision,
      context,
      feedback
    );
    
    // If it's a correction, learn from it immediately
    if (feedback.type === 'correction' && this.config.learning?.adapt_to_patterns) {
      await this.learnFromCorrection(decision, context, feedback);
    }
    
    // Update cached insights
    const key = this.getInsightKey(decision, context);
    this.insights.delete(key);
  }
  
  /**
   * Get learned preferences for a project
   */
  async getLearnedPreferences(projectPath: string): Promise<UserPreference[]> {
    const stats = await this.feedbackStore.getStats(projectPath);
    const preferences: UserPreference[] = [];
    
    // Extract preferences from patterns
    stats.preferencePatterns.forEach(pattern => {
      preferences.push({
        type: pattern.pattern,
        value: pattern.examples,
        confidence: pattern.confidence,
        evidence: [`Observed ${pattern.frequency} times`]
      });
    });
    
    // Add correction-based preferences
    const correctionPrefs = this.extractCorrectionPreferences(stats);
    preferences.push(...correctionPrefs);
    
    return preferences;
  }
  
  /**
   * Adjust decision confidence based on learning
   */
  async adjustConfidence(
    decision: LLMDecision,
    context: DecisionContext
  ): Promise<number> {
    const insights = await this.analyzeDecision(decision, context);
    
    let adjustedConfidence = decision.confidence;
    
    // Adjust based on historical approval rate
    if (insights.historicalContext.similarDecisions > 3) {
      const approvalFactor = insights.historicalContext.approvalRate;
      adjustedConfidence = adjustedConfidence * (0.5 + 0.5 * approvalFactor);
    }
    
    // Reduce confidence if there are common corrections
    if (insights.historicalContext.commonCorrections.length > 0) {
      adjustedConfidence *= 0.8;
    }
    
    // Consider user preferences
    if (insights.historicalContext.userPreferences.length > 0) {
      const avgPrefConfidence = insights.historicalContext.userPreferences
        .reduce((sum, pref) => sum + pref.confidence, 0) / 
        insights.historicalContext.userPreferences.length;
      
      adjustedConfidence = adjustedConfidence * (0.7 + 0.3 * avgPrefConfidence);
    }
    
    return Math.max(0.1, Math.min(1.0, adjustedConfidence));
  }
  
  /**
   * Build historical context from feedback data
   */
  private async buildHistoricalContext(
    decision: LLMDecision,
    context: DecisionContext,
    similarDecisions: FeedbackEntry[],
    stats: any
  ): Promise<HistoricalContext> {
    const approvals = similarDecisions.filter(
      d => d.feedback.type === 'approval' || d.feedback.type === 'implicit_approval'
    ).length;
    
    const approvalRate = similarDecisions.length > 0
      ? approvals / similarDecisions.length
      : 0.5; // Default to neutral
    
    // Find common corrections
    const corrections = similarDecisions
      .filter(d => d.feedback.type === 'correction' && d.decision.action === decision.action)
      .map(d => d.feedback.correctedAction || d.feedback.userAction || '');
    
    const uniqueCorrections = Array.from(new Set(corrections));
    
    // Get last user action for this type of decision
    const lastSimilar = similarDecisions.find(
      d => d.decision.action === decision.action
    );
    const lastUserAction = lastSimilar?.feedback.userAction;
    
    // Extract user preferences
    const preferences = await this.extractUserPreferences(
      similarDecisions,
      stats.preferencePatterns
    );
    
    return {
      similarDecisions: similarDecisions.length,
      approvalRate,
      lastUserAction,
      commonCorrections: uniqueCorrections,
      userPreferences: preferences
    };
  }
  
  /**
   * Generate insights from historical context
   */
  private generateInsights(
    decision: LLMDecision,
    context: DecisionContext,
    historicalContext: HistoricalContext
  ): LearningInsights {
    const reasoning: string[] = [];
    let shouldProceed = true;
    let confidence = decision.confidence;
    const adjustedDecision: Partial<LLMDecision> = {};
    
    // Check approval rate
    if (historicalContext.similarDecisions >= 3) {
      if (historicalContext.approvalRate < 0.3) {
        shouldProceed = false;
        reasoning.push(`Low historical approval rate (${(historicalContext.approvalRate * 100).toFixed(0)}%)`);
        confidence *= 0.5;
      } else if (historicalContext.approvalRate > 0.8) {
        reasoning.push(`High historical approval rate (${(historicalContext.approvalRate * 100).toFixed(0)}%)`);
        confidence = Math.min(1.0, confidence * 1.2);
      }
    }
    
    // Check for common corrections
    if (historicalContext.commonCorrections.length > 0) {
      reasoning.push(`User often corrects to: ${historicalContext.commonCorrections.join(', ')}`);
      
      // If there's a consistent correction, suggest it
      if (historicalContext.commonCorrections.length === 1) {
        adjustedDecision.action = historicalContext.commonCorrections[0];
        reasoning.push(`Suggesting learned correction: ${historicalContext.commonCorrections[0]}`);
      }
    }
    
    // Apply user preferences
    historicalContext.userPreferences.forEach(pref => {
      if (pref.confidence > 0.7) {
        reasoning.push(`Strong preference detected: ${pref.type}`);
        
        // Apply preference-specific adjustments
        switch (pref.type) {
          case 'working_hours':
            if (!this.isWithinWorkingHours(pref.value as string[])) {
              shouldProceed = false;
              reasoning.push('Outside preferred working hours');
            }
            break;
            
          case 'commit_frequency':
            if (pref.value.includes('prefers fewer commits') && decision.action === 'commit') {
              confidence *= 0.7;
              reasoning.push('User prefers fewer commits');
            }
            break;
        }
      }
    });
    
    // Consider last user action
    if (historicalContext.lastUserAction) {
      reasoning.push(`Last similar action by user: ${historicalContext.lastUserAction}`);
    }
    
    return {
      shouldProceed,
      confidence,
      adjustedDecision: Object.keys(adjustedDecision).length > 0 ? adjustedDecision : undefined,
      reasoning,
      historicalContext
    };
  }
  
  /**
   * Learn from a user correction
   */
  private async learnFromCorrection(
    decision: LLMDecision,
    context: DecisionContext,
    feedback: UserFeedback
  ): Promise<void> {
    if (!this.llmAgent) return;
    
    // Build a learning prompt
    const learningPrompt = `
User corrected the following decision:
- Original action: ${decision.action}
- Original reasoning: ${decision.reasoning}
- User's correction: ${feedback.correctedAction || feedback.userAction}
- User's reason: ${feedback.reason || 'Not provided'}
- Context: ${context.currentEvent.type} in ${context.projectState.branch}

Please incorporate this feedback into future decisions.
`;
    
    // Store this learning in the LLM's context
    // This is a placeholder - in reality, you'd want to update the LLM's prompt
    // or fine-tune it with this feedback
    console.log('Learning from correction:', learningPrompt);
  }
  
  /**
   * Extract user preferences from feedback
   */
  private async extractUserPreferences(
    entries: FeedbackEntry[],
    patterns: PreferencePattern[]
  ): Promise<UserPreference[]> {
    const preferences: UserPreference[] = [];
    
    // Convert patterns to preferences
    patterns.forEach(pattern => {
      preferences.push({
        type: pattern.pattern,
        value: pattern.examples,
        confidence: pattern.confidence,
        evidence: [`Pattern observed ${pattern.frequency} times`]
      });
    });
    
    // Extract preferences from approvals/rejections
    const commitPreference = this.extractCommitPreference(entries);
    if (commitPreference) preferences.push(commitPreference);
    
    const branchPreference = this.extractBranchPreference(entries);
    if (branchPreference) preferences.push(branchPreference);
    
    return preferences;
  }
  
  private extractCommitPreference(entries: FeedbackEntry[]): UserPreference | null {
    const commitDecisions = entries.filter(e => e.decision.action === 'commit');
    if (commitDecisions.length < 5) return null;
    
    const approvals = commitDecisions.filter(
      e => e.feedback.type === 'approval' || e.feedback.type === 'implicit_approval'
    ).length;
    
    const approvalRate = approvals / commitDecisions.length;
    
    if (approvalRate > 0.8) {
      return {
        type: 'commit_style',
        value: 'frequent',
        confidence: 0.8,
        evidence: [`${approvals}/${commitDecisions.length} commits approved`]
      };
    } else if (approvalRate < 0.3) {
      return {
        type: 'commit_style',
        value: 'conservative',
        confidence: 0.8,
        evidence: [`Only ${approvals}/${commitDecisions.length} commits approved`]
      };
    }
    
    return null;
  }
  
  private extractBranchPreference(entries: FeedbackEntry[]): UserPreference | null {
    const branchDecisions = entries.filter(
      e => e.decision.action === 'branch' && e.feedback.type === 'correction'
    );
    
    if (branchDecisions.length < 3) return null;
    
    const corrections = branchDecisions
      .map(e => e.feedback.correctedAction || '')
      .filter(Boolean);
    
    // Look for patterns in corrections
    const patterns: string[] = [];
    
    if (corrections.every(c => c.includes('/'))) {
      patterns.push('always uses prefixes');
    }
    if (corrections.every(c => c.match(/^[a-z-]+$/))) {
      patterns.push('uses kebab-case');
    }
    
    if (patterns.length > 0) {
      return {
        type: 'branch_naming',
        value: patterns,
        confidence: 0.9,
        evidence: corrections.slice(0, 3)
      };
    }
    
    return null;
  }
  
  private extractCorrectionPreferences(stats: any): UserPreference[] {
    const preferences: UserPreference[] = [];
    
    // Find strong correction patterns
    stats.commonCorrections.forEach((count: number, pattern: string) => {
      if (count >= 3) {
        const [from, to] = pattern.split(' -> ');
        preferences.push({
          type: 'action_correction',
          value: { from, to },
          confidence: Math.min(0.9, count / 10),
          evidence: [`Corrected ${count} times`]
        });
      }
    });
    
    return preferences;
  }
  
  private isWithinWorkingHours(hours: string[]): boolean {
    const currentHour = new Date().getHours();
    return hours.some(range => {
      const hour = parseInt(range.split(':')[0]);
      return hour === currentHour;
    });
  }
  
  private getInsightKey(decision: LLMDecision, context: DecisionContext): string {
    return `${context.currentEvent.projectPath}-${decision.action}-${context.projectState.branch}`;
  }
}