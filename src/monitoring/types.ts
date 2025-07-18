export enum MonitoringEventType {
  // File system events
  FILE_CHANGE = 'file_change',
  
  // Git events
  GIT_STATE_CHANGE = 'git_state_change',
  COMMIT_CREATED = 'commit_created',
  BRANCH_CREATED = 'branch_created',
  BRANCH_SWITCHED = 'branch_switched',
  
  // Development progress events
  FEATURE_START = 'feature_start',
  FEATURE_COMPLETE = 'feature_complete',
  BUG_FOUND = 'bug_found',
  BUG_FIXED = 'bug_fixed',
  TESTS_ADDED = 'tests_added',
  TESTS_PASSING = 'tests_passing',
  TESTS_FAILING = 'tests_failing',
  REFACTOR_COMPLETE = 'refactor_complete',
  DOCS_UPDATED = 'docs_updated',
  
  // Milestone events
  READY_FOR_RELEASE = 'ready_for_release',
  DEPLOYMENT_READY = 'deployment_ready',
  MILESTONE_REACHED = 'milestone_reached',
  BLOCKED = 'blocked',
  
  // Conversation events
  FILES_MENTIONED = 'files_mentioned',
  COMMAND_EXECUTED = 'command_executed',
  ERROR_DISCUSSED = 'error_discussed',
  
  // LLM automation events
  LLM_DECISION_REQUESTED = 'llm_decision_requested',
  LLM_DECISION_MADE = 'llm_decision_made',
  LLM_ACTION_EXECUTED = 'llm_action_executed',
  LLM_ACTION_FAILED = 'llm_action_failed',
  LLM_APPROVAL_REQUIRED = 'llm_approval_required',
  LLM_FEEDBACK_RECEIVED = 'llm_feedback_received'
}

export interface MonitoringEvent {
  type: MonitoringEventType;
  timestamp: Date;
  projectPath: string;
  data: Record<string, unknown>;
}

export interface ConversationPattern {
  type: string;
  regex: RegExp;
  eventType: MonitoringEventType;
  priority: 'high' | 'medium' | 'low';
}

export interface AggregatedMilestone {
  type: 'feature_shipped' | 'release_ready' | 'sprint_complete' | 'major_refactor';
  timestamp: Date;
  events: MonitoringEvent[];
  title: string;
  description: string;
}

export interface MonitoringSuggestion {
  type: 'commit' | 'branch' | 'release' | 'pr' | 'fix' | 'help';
  priority: 'high' | 'medium' | 'low';
  message: string;
  action?: string;
  reason: string;
  relatedEvents: MonitoringEvent[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface MonitoringConfig {
  enabled: boolean;
  conversation_tracking: boolean;
  auto_suggestions: boolean;
  commit_threshold: number;
  release_threshold: {
    features: number;
    bugfixes: number;
  };
  notification_style: 'inline' | 'summary' | 'none';
  learning_mode: boolean;
}