import * as fs from 'fs/promises';
import * as path from 'path';
import { LLMDecision, DecisionContext } from '../types.js';

export interface FeedbackEntry {
  id: string;
  timestamp: Date;
  projectPath: string;
  decision: LLMDecision;
  context: DecisionContext;
  feedback: UserFeedback;
  outcome?: ActionOutcome;
}

export interface UserFeedback {
  type: 'approval' | 'rejection' | 'correction' | 'implicit_approval';
  reason?: string;
  correctedAction?: string;
  correctedDecision?: Partial<LLMDecision>;
  userAction?: string; // What the user actually did
}

export interface ActionOutcome {
  success: boolean;
  error?: string;
  userSatisfied?: boolean;
  followUpAction?: string;
}

export interface FeedbackStats {
  totalDecisions: number;
  approvals: number;
  rejections: number;
  corrections: number;
  implicitApprovals: number;
  successRate: number;
  commonCorrections: Map<string, number>;
  preferencePatterns: PreferencePattern[];
}

export interface PreferencePattern {
  pattern: string;
  frequency: number;
  confidence: number;
  examples: string[];
}

export class FeedbackStore {
  private storePath: string;
  private cache: Map<string, FeedbackEntry> = new Map();
  private readonly MAX_ENTRIES = 10000;
  
  constructor(dataDir: string) {
    this.storePath = path.join(dataDir, 'learning', 'feedback.json');
  }
  
  /**
   * Initialize the feedback store
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.storePath), { recursive: true });
      const data = await this.load();
      
      // Load into cache
      data.forEach(entry => {
        this.cache.set(entry.id, entry);
      });
      
      // Trim if too large
      if (this.cache.size > this.MAX_ENTRIES) {
        await this.trimOldEntries();
      }
    } catch (error) {
      console.error('Failed to initialize feedback store:', error);
    }
  }
  
  /**
   * Record user feedback for a decision
   */
  async recordFeedback(
    decision: LLMDecision,
    context: DecisionContext,
    feedback: UserFeedback
  ): Promise<string> {
    const id = this.generateId();
    const entry: FeedbackEntry = {
      id,
      timestamp: new Date(),
      projectPath: context.currentEvent.projectPath,
      decision,
      context,
      feedback
    };
    
    this.cache.set(id, entry);
    await this.save();
    
    return id;
  }
  
  /**
   * Update the outcome of an action
   */
  async updateOutcome(id: string, outcome: ActionOutcome): Promise<void> {
    const entry = this.cache.get(id);
    if (entry) {
      entry.outcome = outcome;
      await this.save();
    }
  }
  
  /**
   * Get feedback statistics
   */
  async getStats(projectPath?: string): Promise<FeedbackStats> {
    const entries = projectPath
      ? Array.from(this.cache.values()).filter(e => e.projectPath === projectPath)
      : Array.from(this.cache.values());
    
    const stats: FeedbackStats = {
      totalDecisions: entries.length,
      approvals: 0,
      rejections: 0,
      corrections: 0,
      implicitApprovals: 0,
      successRate: 0,
      commonCorrections: new Map(),
      preferencePatterns: []
    };
    
    let successCount = 0;
    
    entries.forEach(entry => {
      switch (entry.feedback.type) {
        case 'approval':
          stats.approvals++;
          break;
        case 'rejection':
          stats.rejections++;
          break;
        case 'correction':
          stats.corrections++;
          // Track correction patterns
          if (entry.feedback.correctedAction) {
            const key = `${entry.decision.action} -> ${entry.feedback.correctedAction}`;
            stats.commonCorrections.set(
              key,
              (stats.commonCorrections.get(key) || 0) + 1
            );
          }
          break;
        case 'implicit_approval':
          stats.implicitApprovals++;
          break;
      }
      
      if (entry.outcome?.success) {
        successCount++;
      }
    });
    
    stats.successRate = entries.length > 0 ? successCount / entries.length : 0;
    
    // Analyze preference patterns
    stats.preferencePatterns = await this.analyzePatterns(entries);
    
    return stats;
  }
  
  /**
   * Get recent feedback entries
   */
  async getRecentFeedback(
    limit: number = 10,
    projectPath?: string
  ): Promise<FeedbackEntry[]> {
    const entries = Array.from(this.cache.values())
      .filter(e => !projectPath || e.projectPath === projectPath)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
    
    return entries;
  }
  
  /**
   * Find similar past decisions
   */
  async findSimilarDecisions(
    context: DecisionContext,
    limit: number = 5
  ): Promise<FeedbackEntry[]> {
    const entries = Array.from(this.cache.values())
      .filter(e => {
        // Match on similar context
        return (
          e.projectPath === context.currentEvent.projectPath &&
          e.context.projectState.branch === context.projectState.branch &&
          e.context.currentEvent.type === context.currentEvent.type
        );
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
    
    return entries;
  }
  
  /**
   * Analyze patterns in user feedback
   */
  private async analyzePatterns(entries: FeedbackEntry[]): Promise<PreferencePattern[]> {
    const patterns: Map<string, PreferencePattern> = new Map();
    
    // Pattern: Time of day preferences
    const timePattern = this.analyzeTimePatterns(entries);
    if (timePattern) patterns.set('time', timePattern);
    
    // Pattern: Branch naming preferences
    const branchPattern = this.analyzeBranchPatterns(entries);
    if (branchPattern) patterns.set('branch', branchPattern);
    
    // Pattern: Commit frequency preferences
    const commitPattern = this.analyzeCommitPatterns(entries);
    if (commitPattern) patterns.set('commit', commitPattern);
    
    return Array.from(patterns.values());
  }
  
  private analyzeTimePatterns(entries: FeedbackEntry[]): PreferencePattern | null {
    // Analyze when users tend to approve vs reject
    const hourlyStats = new Map<number, { approvals: number; rejections: number }>();
    
    entries.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      const stat = hourlyStats.get(hour) || { approvals: 0, rejections: 0 };
      
      if (entry.feedback.type === 'approval' || entry.feedback.type === 'implicit_approval') {
        stat.approvals++;
      } else if (entry.feedback.type === 'rejection') {
        stat.rejections++;
      }
      
      hourlyStats.set(hour, stat);
    });
    
    // Find patterns
    const workingHours: number[] = [];
    hourlyStats.forEach((stat, hour) => {
      if (stat.approvals > stat.rejections * 2) {
        workingHours.push(hour);
      }
    });
    
    if (workingHours.length > 0) {
      return {
        pattern: 'working_hours',
        frequency: workingHours.length,
        confidence: 0.8,
        examples: workingHours.map(h => `${h}:00-${h + 1}:00`)
      };
    }
    
    return null;
  }
  
  private analyzeBranchPatterns(entries: FeedbackEntry[]): PreferencePattern | null {
    const branchCorrections = entries
      .filter(e => e.feedback.type === 'correction' && e.decision.action === 'branch')
      .map(e => e.feedback.userAction || '');
    
    if (branchCorrections.length >= 3) {
      // Look for naming patterns
      const patterns: string[] = [];
      
      if (branchCorrections.some(b => b.includes('/'))) {
        patterns.push('uses prefixes');
      }
      if (branchCorrections.some(b => b.includes('-'))) {
        patterns.push('uses kebab-case');
      }
      if (branchCorrections.some(b => b.includes('_'))) {
        patterns.push('uses snake_case');
      }
      
      return {
        pattern: 'branch_naming',
        frequency: branchCorrections.length,
        confidence: 0.7,
        examples: patterns
      };
    }
    
    return null;
  }
  
  private analyzeCommitPatterns(entries: FeedbackEntry[]): PreferencePattern | null {
    const commitApprovals = entries.filter(
      e => e.decision.action === 'commit' && 
      (e.feedback.type === 'approval' || e.feedback.type === 'implicit_approval')
    );
    
    const commitRejections = entries.filter(
      e => e.decision.action === 'commit' && e.feedback.type === 'rejection'
    );
    
    if (commitApprovals.length + commitRejections.length >= 5) {
      const approvalRate = commitApprovals.length / (commitApprovals.length + commitRejections.length);
      
      return {
        pattern: 'commit_frequency',
        frequency: commitApprovals.length + commitRejections.length,
        confidence: Math.abs(approvalRate - 0.5) * 2, // More extreme = more confidence
        examples: [
          approvalRate > 0.7 ? 'prefers frequent commits' : 
          approvalRate < 0.3 ? 'prefers fewer commits' : 
          'moderate commit frequency'
        ]
      };
    }
    
    return null;
  }
  
  /**
   * Load feedback data from disk
   */
  private async load(): Promise<FeedbackEntry[]> {
    try {
      const data = await fs.readFile(this.storePath, 'utf8');
      const entries = JSON.parse(data);
      
      // Convert date strings back to Date objects
      return entries.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp)
      }));
    } catch (error) {
      // File doesn't exist yet
      return [];
    }
  }
  
  /**
   * Save feedback data to disk
   */
  private async save(): Promise<void> {
    try {
      const entries = Array.from(this.cache.values());
      await fs.writeFile(
        this.storePath,
        JSON.stringify(entries, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save feedback data:', error);
    }
  }
  
  /**
   * Trim old entries to stay under limit
   */
  private async trimOldEntries(): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime())
      .slice(0, this.MAX_ENTRIES);
    
    this.cache.clear();
    entries.forEach(([id, entry]) => {
      this.cache.set(id, entry);
    });
    
    await this.save();
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Clear all feedback data (for testing)
   */
  async clear(): Promise<void> {
    this.cache.clear();
    try {
      await fs.unlink(this.storePath);
    } catch {
      // File might not exist
    }
  }
}