import { DecisionContext, AutomationConfig, ProjectState } from '../types.js';
import { MonitoringEvent, MonitoringEventType } from '../monitoring/types.js';
import { LLMMessage } from './providers/base-provider.js';

export class PromptBuilder {
  private config: AutomationConfig;
  
  constructor(config: AutomationConfig) {
    this.config = config;
  }
  
  buildDecisionPrompt(context: DecisionContext): LLMMessage[] {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(context);
    
    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
  }
  
  buildCommitMessagePrompt(
    diffSummary: string,
    projectContext: ProjectState,
    recentCommits: string[]
  ): LLMMessage[] {
    const systemPrompt = `You are a Git commit message generator. Generate professional commit messages following the ${this.config.preferences.commit_style} style.
    
Rules:
1. Keep the first line under 72 characters
2. Use active voice and present tense
3. Be specific about what changed and why
4. Follow the repository's existing commit style
5. ${this.config.preferences.commit_style === 'conventional' ? 'Use conventional commit format (type: subject)' : ''}`;

    const userPrompt = `Generate a commit message for the following changes:

DIFF SUMMARY:
${diffSummary}

PROJECT INFO:
- Branch: ${projectContext.branch}
- Test Status: ${projectContext.testStatus || 'unknown'}

RECENT COMMITS (for style reference):
${recentCommits.slice(0, 5).join('\n')}

Generate a commit message following the team's style.`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
  }
  
  buildPRDescriptionPrompt(
    branchName: string,
    commits: string[],
    changesSummary: string
  ): LLMMessage[] {
    const systemPrompt = `You are a GitHub Pull Request description generator. Create comprehensive PR descriptions that help reviewers understand the changes.

Output format: JSON with "title" and "body" fields.`;

    const userPrompt = `Create a pull request description:

BRANCH: ${branchName}
COMMITS:
${commits.join('\n')}

CHANGES SUMMARY:
${changesSummary}

Generate a JSON response with:
- title: Clear, concise PR title
- body: Comprehensive description including summary, motivation, type of change, and testing performed`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
  }
  
  buildRiskAssessmentPrompt(context: DecisionContext): LLMMessage[] {
    const systemPrompt = `You are a risk assessment system for Git automation. Evaluate the risk level of proposed actions.

Output format: JSON with score (0-1), factors (array), level (low/medium/high/critical), and requiresApproval (boolean).`;

    const userPrompt = `Assess the risk of this action:

ACTION: ${context.currentEvent.type}
PROJECT STATE:
- Branch: ${context.projectState.branch}
- Protected: ${context.projectState.isProtected}
- Uncommitted Changes: ${context.projectState.uncommittedChanges}
- Tests: ${context.projectState.testStatus || 'unknown'}

TIME CONTEXT:
- Current Time: ${context.timeContext?.currentTime || 'unknown'}
- Working Hours: ${context.timeContext?.isWorkingHours || 'unknown'}

Evaluate risk considering branch protection, test status, time of day, and change scope.`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
  }
  
  private buildSystemPrompt(): string {
    return `You are an intelligent Git workflow assistant that makes decisions about when and how to perform Git operations.

Your role:
1. Analyze the current development context
2. Decide what action to take (if any)
3. Provide clear reasoning for your decision
4. Assess confidence level (0-1)
5. Determine if manual approval is needed

User Preferences:
- Commit Style: ${this.config.preferences.commit_style}
- Commit Frequency: ${this.config.preferences.commit_frequency}
- Risk Tolerance: ${this.config.preferences.risk_tolerance}
- Working Hours: ${this.config.preferences.working_hours ? 
    `${this.config.preferences.working_hours.start}-${this.config.preferences.working_hours.end}` : 
    'Not specified'}

Safety Rules:
- Never auto-execute if confidence < ${this.config.thresholds.auto_execute}
- Always require approval if confidence < ${this.config.thresholds.require_approval}
- Respect protected branches and files
- Consider test status when available

Output Format: JSON with fields:
{
  "action": "commit|branch|pr|stash|wait|suggest",
  "confidence": 0.0-1.0,
  "reasoning": "explanation of decision",
  "requiresApproval": true/false,
  "alternativeActions": ["other viable options"],
  "riskAssessment": { optional risk details }
}`;
  }
  
  private buildUserPrompt(context: DecisionContext): string {
    const event = context.currentEvent;
    const state = context.projectState;
    
    return `Analyze the current situation and decide what action to take:

CURRENT EVENT:
- Type: ${event.type}
- Description: ${this.getEventDescription(event)}
- Timestamp: ${event.timestamp}

PROJECT STATE:
- Branch: ${state.branch}
- Protected: ${state.isProtected}
- Uncommitted Changes: ${state.uncommittedChanges} files
- Last Commit: ${this.getTimeSince(state.lastCommitTime)}
- Test Status: ${state.testStatus || 'unknown'}
- Build Status: ${state.buildStatus || 'unknown'}

RECENT HISTORY:
${this.formatRecentHistory(context.recentHistory.slice(-5))}

AVAILABLE ACTIONS:
${context.possibleActions.join(', ')}

TIME CONTEXT:
- Current Time: ${context.timeContext?.currentTime || 'unknown'}
- Is Working Hours: ${context.timeContext?.isWorkingHours || 'unknown'}
- Last User Activity: ${context.timeContext?.lastUserActivity ? 
    this.getTimeSince(context.timeContext.lastUserActivity) : 'unknown'}

Based on the user's preferences and current context, what action should be taken?`;
  }
  
  private getEventDescription(event: MonitoringEvent): string {
    // Handle files from either event.files or event.data.files
    const files = (event as any).files || (event.data?.files as string[]);
    
    switch (event.type) {
      case MonitoringEventType.FILE_CHANGE:
        return `Files changed: ${files?.length || 0}`;
      case MonitoringEventType.FEATURE_COMPLETE:
        return 'Feature appears to be complete';
      case MonitoringEventType.TESTS_PASSING:
        return 'All tests are passing';
      case MonitoringEventType.TESTS_FAILING:
        return 'Tests are failing';
      case MonitoringEventType.REFACTOR_COMPLETE:
        return 'Refactoring completed';
      case MonitoringEventType.DOCS_UPDATED:
        return 'Documentation updated';
      default:
        // For file changes with many files, describe as large changeset
        if (event.type === MonitoringEventType.FILE_CHANGE && 
            files && files.length > 5) {
          return 'Large number of changes accumulated';
        }
        return event.type;
    }
  }
  
  private formatRecentHistory(events: MonitoringEvent[]): string {
    return events
      .map(e => `- ${this.getTimeSince(e.timestamp)}: ${this.getEventDescription(e)}`)
      .join('\n');
  }
  
  private getTimeSince(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  }
}