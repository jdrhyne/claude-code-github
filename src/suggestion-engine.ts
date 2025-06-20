import { DevelopmentStatus, Config, SuggestionConfig, LLMDecision } from './types.js';
import { LLMDecisionAgent } from './ai/llm-decision-agent.js';
import { MonitoringEvent, MonitoringEventType } from './monitoring/types.js';

export interface Suggestion {
  type: 'commit' | 'branch' | 'checkpoint' | 'pr' | 'warning';
  priority: 'high' | 'medium' | 'low';
  message: string;
  action?: string;
  reason?: string;
  fromLLM?: boolean;
  confidence?: number;
}

export interface WorkContext {
  lastCommitTime?: Date;
  lastStatusCheckTime?: Date;
  uncommittedStartTime?: Date;
  fileChangeVelocity?: number;
  sessionStartTime: Date;
}

export class SuggestionEngine {
  private workContexts = new Map<string, WorkContext>();
  private llmAgent?: LLMDecisionAgent;
  private llmInitialized = false;
  
  constructor(private config: Config) {
    // Don't initialize async in constructor
  }
  
  private async initializeLLM(): Promise<void> {
    if (this.llmInitialized) return;
    
    if (this.config.automation?.enabled && this.config.automation.mode !== 'off') {
      try {
        this.llmAgent = new LLMDecisionAgent(this.config.automation);
        await this.llmAgent.initialize();
        this.llmInitialized = true;
      } catch (error) {
        console.error('Failed to initialize LLM for suggestions:', error);
      }
    }
  }

  /**
   * Get effective suggestion configuration for a project
   */
  private getEffectiveConfig(projectPath: string): SuggestionConfig {
    const globalConfig = this.config.suggestions || this.getDefaultSuggestionConfig();
    
    // Find project-specific overrides
    const project = this.config.projects.find(p => p.path === projectPath);
    const projectOverrides = project?.suggestions || {};
    
    // Merge configuration with project overrides
    return {
      enabled: projectOverrides.enabled ?? globalConfig.enabled,
      protected_branch_warnings: projectOverrides.protected_branch_warnings ?? globalConfig.protected_branch_warnings,
      time_reminders: {
        enabled: projectOverrides.time_reminders?.enabled ?? globalConfig.time_reminders.enabled,
        warning_threshold_minutes: projectOverrides.time_reminders?.warning_threshold_minutes ?? globalConfig.time_reminders.warning_threshold_minutes,
        reminder_threshold_minutes: projectOverrides.time_reminders?.reminder_threshold_minutes ?? globalConfig.time_reminders.reminder_threshold_minutes,
      },
      large_changeset: {
        enabled: projectOverrides.large_changeset?.enabled ?? globalConfig.large_changeset.enabled,
        threshold: projectOverrides.large_changeset?.threshold ?? globalConfig.large_changeset.threshold,
      },
      pattern_recognition: projectOverrides.pattern_recognition ?? globalConfig.pattern_recognition,
      pr_suggestions: projectOverrides.pr_suggestions ?? globalConfig.pr_suggestions,
      change_pattern_suggestions: projectOverrides.change_pattern_suggestions ?? globalConfig.change_pattern_suggestions,
      branch_suggestions: projectOverrides.branch_suggestions ?? globalConfig.branch_suggestions,
    };
  }

  private getDefaultSuggestionConfig(): SuggestionConfig {
    return {
      enabled: true,
      protected_branch_warnings: true,
      time_reminders: {
        enabled: true,
        warning_threshold_minutes: 120,
        reminder_threshold_minutes: 60,
      },
      large_changeset: {
        enabled: true,
        threshold: 5,
      },
      pattern_recognition: true,
      pr_suggestions: true,
      change_pattern_suggestions: true,
      branch_suggestions: true,
    };
  }

  /**
   * Analyze the current state and provide intelligent suggestions
   */
  async analyzeSituation(projectPath: string, status: DevelopmentStatus): Promise<Suggestion[]> {
    // Ensure LLM is initialized
    await this.initializeLLM();
    
    const suggestionConfig = this.getEffectiveConfig(projectPath);
    
    // If suggestions are disabled globally for this project, return empty
    if (!suggestionConfig.enabled) {
      return [];
    }
    
    const suggestions: Suggestion[] = [];
    const context = this.getOrCreateContext(projectPath);
    
    // Update context with current status
    this.updateContext(projectPath, status);
    
    // If LLM is enabled, try to get LLM suggestions first
    if (this.llmAgent && this.config.automation?.mode !== 'off') {
      const llmSuggestions = await this.getLLMSuggestions(projectPath, status, context);
      suggestions.push(...llmSuggestions);
    }
    
    // Always include rule-based suggestions as fallback or complement
    if (suggestionConfig.protected_branch_warnings) {
      suggestions.push(...this.checkProtectedBranch(status));
    }
    
    if (suggestionConfig.large_changeset.enabled || suggestionConfig.change_pattern_suggestions) {
      suggestions.push(...this.checkUncommittedChanges(status, context, suggestionConfig));
    }
    
    if (suggestionConfig.time_reminders.enabled) {
      suggestions.push(...this.checkTimeBasedSuggestions(status, context, suggestionConfig));
    }
    
    if (suggestionConfig.pattern_recognition) {
      suggestions.push(...this.checkChangePatterns(status));
    }
    
    if (suggestionConfig.branch_suggestions) {
      suggestions.push(...this.checkBranchSuggestions(status));
    }
    
    if (suggestionConfig.pr_suggestions) {
      suggestions.push(...this.checkPRReadiness(status));
    }
    
    // Remove duplicate suggestions (prefer LLM suggestions)
    const uniqueSuggestions = this.deduplicateSuggestions(suggestions);
    
    // Sort by priority and confidence
    return uniqueSuggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, prefer higher confidence
      return (b.confidence || 0) - (a.confidence || 0);
    });
  }

  private getOrCreateContext(projectPath: string): WorkContext {
    if (!this.workContexts.has(projectPath)) {
      this.workContexts.set(projectPath, {
        sessionStartTime: new Date(),
      });
    }
    const context = this.workContexts.get(projectPath);
    if (!context) {
      // This should never happen, but handle it defensively
      throw new Error(`Failed to create work context for ${projectPath}`);
    }
    return context;
  }

  private updateContext(projectPath: string, status: DevelopmentStatus): void {
    const context = this.getOrCreateContext(projectPath);
    context.lastStatusCheckTime = new Date();
    
    if (status.uncommitted_changes && status.uncommitted_changes.file_count > 0) {
      if (!context.uncommittedStartTime) {
        context.uncommittedStartTime = new Date();
      }
    } else {
      context.uncommittedStartTime = undefined;
      context.lastCommitTime = new Date();
    }
  }

  private checkProtectedBranch(status: DevelopmentStatus): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    if (status.is_protected && status.uncommitted_changes && status.uncommitted_changes.file_count > 0) {
      suggestions.push({
        type: 'warning',
        priority: 'high',
        message: `You're working directly on protected branch '${status.branch}'`,
        action: 'dev_create_branch',
        reason: 'Protected branches should not receive direct commits. Create a feature branch instead.'
      });
    }
    
    return suggestions;
  }

  private checkUncommittedChanges(status: DevelopmentStatus, context: WorkContext, config: SuggestionConfig): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const fileCount = status.uncommitted_changes?.file_count || 0;
    
    // Suggest commit for significant changes
    if (config.large_changeset.enabled && fileCount >= config.large_changeset.threshold) {
      suggestions.push({
        type: 'commit',
        priority: 'medium',
        message: `You have ${fileCount} uncommitted files`,
        action: 'dev_checkpoint',
        reason: 'Large changesets are harder to review. Consider committing your progress.'
      });
    }
    
    // Check for mixed change types
    if (config.change_pattern_suggestions && status.uncommitted_changes?.files_changed) {
      const hasNewFiles = status.uncommitted_changes.files_changed.some(f => f.status === 'Added');
      const hasModified = status.uncommitted_changes.files_changed.some(f => f.status === 'Modified');
      const hasDeleted = status.uncommitted_changes.files_changed.some(f => f.status === 'Deleted');
      
      if (hasNewFiles && hasModified && hasDeleted) {
        suggestions.push({
          type: 'commit',
          priority: 'medium',
          message: 'You have mixed changes (additions, modifications, and deletions)',
          reason: 'Consider splitting these into atomic commits for better history.'
        });
      }
    }
    
    return suggestions;
  }

  private checkTimeBasedSuggestions(status: DevelopmentStatus, context: WorkContext, config: SuggestionConfig): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    if (context.uncommittedStartTime && status.uncommitted_changes && status.uncommitted_changes.file_count > 0) {
      const minutesUncommitted = (Date.now() - context.uncommittedStartTime.getTime()) / (1000 * 60);
      
      if (minutesUncommitted > config.time_reminders.warning_threshold_minutes) {
        suggestions.push({
          type: 'checkpoint',
          priority: 'high',
          message: `You have uncommitted changes for over ${Math.round(minutesUncommitted / 60)} hours`,
          action: 'dev_checkpoint',
          reason: "Don't lose your work! Regular commits help you track progress and recover from mistakes."
        });
      } else if (minutesUncommitted > config.time_reminders.reminder_threshold_minutes) {
        suggestions.push({
          type: 'checkpoint',
          priority: 'medium',
          message: 'Consider committing your progress',
          action: 'dev_checkpoint',
          reason: 'Regular commits make it easier to track your work and collaborate.'
        });
      }
    }
    
    return suggestions;
  }

  private checkChangePatterns(status: DevelopmentStatus): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    if (!status.uncommitted_changes?.files_changed) return suggestions;
    
    const files = status.uncommitted_changes.files_changed;
    
    // Check for test files
    const hasTests = files.some(f => 
      f.file.includes('test') || f.file.includes('spec') || f.file.includes('__tests__')
    );
    const hasImplementation = files.some(f => 
      !f.file.includes('test') && !f.file.includes('spec') && !f.file.includes('__tests__')
    );
    
    if (hasTests && hasImplementation) {
      suggestions.push({
        type: 'commit',
        priority: 'low',
        message: 'You have both implementation and test changes',
        reason: 'Good practice! Consider committing them together to maintain test coverage.'
      });
    }
    
    // Check for documentation updates
    const hasDocs = files.some(f => 
      f.file.endsWith('.md') || f.file.includes('docs/')
    );
    const hasCode = files.some(f => 
      f.file.endsWith('.ts') || f.file.endsWith('.js') || f.file.endsWith('.tsx') || f.file.endsWith('.jsx')
    );
    
    if (hasDocs && hasCode) {
      suggestions.push({
        type: 'commit',
        priority: 'low',
        message: 'Documentation is updated along with code',
        reason: 'Excellent! Keeping docs in sync with code changes.'
      });
    }
    
    return suggestions;
  }

  private checkBranchSuggestions(status: DevelopmentStatus): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // Suggest feature branch for new features
    if (status.uncommitted_changes?.files_changed) {
      const newComponents = status.uncommitted_changes.files_changed.filter(f => 
        f.status === 'Added' && 
        (f.file.includes('components/') || f.file.includes('features/') || f.file.includes('pages/'))
      );
      
      if (newComponents.length > 0 && status.branch === this.config.git_workflow.main_branch) {
        suggestions.push({
          type: 'branch',
          priority: 'high',
          message: 'You appear to be adding new features on the main branch',
          action: 'dev_create_branch',
          reason: 'New features should be developed in feature branches for easier review and rollback.'
        });
      }
    }
    
    return suggestions;
  }

  private checkPRReadiness(status: DevelopmentStatus): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // Check if branch is ahead of main and suggest PR
    if (status.branch !== this.config.git_workflow.main_branch && 
        !status.is_protected &&
        (!status.uncommitted_changes || status.uncommitted_changes.file_count === 0)) {
      // In a real implementation, we'd check commits ahead of main
      suggestions.push({
        type: 'pr',
        priority: 'medium',
        message: 'Your branch appears ready for a pull request',
        action: 'dev_create_pull_request',
        reason: 'Clean working directory and feature branch - perfect time for code review!'
      });
    }
    
    return suggestions;
  }

  /**
   * Get contextual hints based on current activity
   */
  getContextualHints(projectPath: string): string[] {
    const hints: string[] = [];
    const context = this.getOrCreateContext(projectPath);
    
    const sessionMinutes = (Date.now() - context.sessionStartTime.getTime()) / (1000 * 60);
    
    if (sessionMinutes < 5) {
      hints.push("Starting a new session? Run 'dev_status' to see your current state.");
    }
    
    if (context.lastCommitTime) {
      const minutesSinceCommit = (Date.now() - context.lastCommitTime.getTime()) / (1000 * 60);
      if (minutesSinceCommit < 5) {
        hints.push("Great job committing! Consider creating a PR if your feature is complete.");
      }
    }
    
    return hints;
  }
  
  /**
   * Get suggestions from LLM based on current context
   */
  private async getLLMSuggestions(
    projectPath: string, 
    status: DevelopmentStatus, 
    context: WorkContext
  ): Promise<Suggestion[]> {
    if (!this.llmAgent) {
      return [];
    }
    
    try {
      // Create a synthetic event for LLM analysis
      const event: MonitoringEvent = {
        type: MonitoringEventType.FILE_CHANGE,
        timestamp: new Date(),
        projectPath,
        data: {
          status,
          context,
          fileCount: status.uncommitted_changes?.file_count || 0
        }
      };
      
      // Build context for decision
      const decisionContext = {
        currentEvent: event,
        projectState: {
          branch: status.branch,
          isProtected: status.is_protected,
          uncommittedChanges: status.uncommitted_changes?.file_count || 0,
          lastCommitTime: context.lastCommitTime || new Date(),
          testStatus: 'unknown' as const,
          buildStatus: 'unknown' as const
        },
        recentHistory: [],
        userPreferences: this.config.automation?.preferences || {
          commit_style: 'conventional',
          commit_frequency: 'moderate',
          risk_tolerance: 'medium'
        },
        possibleActions: ['commit', 'branch', 'pr', 'wait', 'suggest'],
        timeContext: {
          currentTime: new Date(),
          isWorkingHours: true,
          lastUserActivity: new Date(),
          dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' })
        }
      };
      
      // Get LLM decision
      const decision = await this.llmAgent.makeDecision(decisionContext);
      
      // Convert decision to suggestion
      if (decision.action !== 'wait') {
        return [{
          type: this.mapDecisionToSuggestionType(decision.action),
          priority: decision.confidence > 0.8 ? 'high' : decision.confidence > 0.5 ? 'medium' : 'low',
          message: decision.reasoning,
          action: this.mapDecisionToAction(decision.action),
          reason: `AI confidence: ${(decision.confidence * 100).toFixed(0)}%`,
          fromLLM: true,
          confidence: decision.confidence
        }];
      }
      
    } catch (error) {
      console.error('Error getting LLM suggestions:', error);
    }
    
    return [];
  }
  
  /**
   * Map LLM decision action to suggestion type
   */
  private mapDecisionToSuggestionType(action: string): Suggestion['type'] {
    const mapping: Record<string, Suggestion['type']> = {
      'commit': 'commit',
      'branch': 'branch',
      'pr': 'pr',
      'checkpoint': 'checkpoint',
      'suggest': 'warning'
    };
    return mapping[action] || 'warning';
  }
  
  /**
   * Map LLM decision action to dev action
   */
  private mapDecisionToAction(action: string): string | undefined {
    const mapping: Record<string, string> = {
      'commit': 'dev_checkpoint',
      'branch': 'dev_create_branch',
      'pr': 'dev_create_pull_request'
    };
    return mapping[action];
  }
  
  /**
   * Remove duplicate suggestions, preferring LLM suggestions
   */
  private deduplicateSuggestions(suggestions: Suggestion[]): Suggestion[] {
    const seen = new Map<string, Suggestion>();
    
    // Process LLM suggestions first (they have priority)
    for (const suggestion of suggestions) {
      if (suggestion.fromLLM) {
        const key = `${suggestion.type}-${suggestion.action}`;
        seen.set(key, suggestion);
      }
    }
    
    // Then process rule-based suggestions
    for (const suggestion of suggestions) {
      if (!suggestion.fromLLM) {
        const key = `${suggestion.type}-${suggestion.action}`;
        if (!seen.has(key)) {
          seen.set(key, suggestion);
        }
      }
    }
    
    return Array.from(seen.values());
  }
}