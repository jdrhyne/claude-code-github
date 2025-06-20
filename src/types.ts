export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id?: string | number | null;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: JsonRpcError;
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ProjectConfig {
  path: string;
  github_repo: string;
  reviewers?: string[];
  suggestions?: Partial<SuggestionConfig>;
}

export type Project = ProjectConfig;

export interface GitWorkflowConfig {
  main_branch: string;
  protected_branches: string[];
  branch_prefixes: {
    feature: string;
    bugfix: string;
    refactor: string;
  };
  auto_push?: {
    feature_branches?: boolean;
    main_branch?: boolean;
    confirm_before_push?: boolean;
  };
}

export interface SuggestionConfig {
  enabled: boolean;
  protected_branch_warnings: boolean;
  time_reminders: {
    enabled: boolean;
    warning_threshold_minutes: number;
    reminder_threshold_minutes: number;
  };
  large_changeset: {
    enabled: boolean;
    threshold: number;
  };
  pattern_recognition: boolean;
  pr_suggestions: boolean;
  change_pattern_suggestions: boolean;
  branch_suggestions: boolean;
}

export interface ProjectDiscoveryConfig {
  enabled: boolean;
  scan_paths: string[];
  exclude_patterns?: string[];
  auto_detect_github_repo?: boolean;
  max_depth?: number;
}

export interface WorkspaceMonitoringConfig {
  enabled: boolean;
  workspaces: WorkspacePathConfig[];
}

export interface WorkspacePathConfig {
  path: string;
  auto_detect: boolean;
  inherit_settings?: boolean;
  cache_discovery?: boolean;
  github_repo_detection?: 'from_remote' | 'from_folder_name';
}

export interface AutomationConfig {
  enabled: boolean;
  mode: 'off' | 'learning' | 'assisted' | 'autonomous';
  llm: {
    provider: 'anthropic' | 'openai' | 'local';
    model?: string;
    temperature?: number;
    api_key_env?: string;
  };
  thresholds: {
    confidence: number;
    auto_execute: number;
    require_approval: number;
  };
  preferences: {
    commit_style: 'conventional' | 'descriptive' | 'custom';
    commit_frequency: 'aggressive' | 'moderate' | 'conservative';
    working_hours?: {
      start: string;
      end: string;
      timezone: string;
    };
    risk_tolerance: 'low' | 'medium' | 'high';
  };
  safety: {
    max_actions_per_hour: number;
    protected_files?: string[];
    require_tests_pass?: boolean;
    pause_on_errors?: boolean;
    emergency_stop?: boolean;
  };
  learning: {
    enabled: boolean;
    store_feedback: boolean;
    adapt_to_patterns: boolean;
    preference_learning: boolean;
  };
}

export interface Config {
  git_workflow: GitWorkflowConfig;
  suggestions?: SuggestionConfig;
  projects: ProjectConfig[];
  monitoring?: MonitoringConfig;
  project_discovery?: ProjectDiscoveryConfig;
  workspace_monitoring?: WorkspaceMonitoringConfig;
  api_server?: import('./api/types.js').APIConfig;
  websocket?: import('./api/types.js').WebSocketConfig;
  webhooks?: import('./api/types.js').WebhookConfig;
  automation?: AutomationConfig;
  dataDir?: string; // Directory for storing learning data
}

// Re-export API types for convenience
export type { 
  APIConfig, 
  WebSocketConfig, 
  WebhookConfig,
  AuthConfig,
  AuthToken,
  CorsConfig,
  RateLimitConfig,
  WebhookEndpoint
} from './api/types.js';

export interface MonitoringConfig {
  enabled?: boolean;
  conversation_tracking?: boolean;
  auto_suggestions?: boolean;
  commit_threshold?: number;
  release_threshold?: {
    features: number;
    bugfixes: number;
  };
  notification_style?: 'inline' | 'summary' | 'none';
  learning_mode?: boolean;
}

export interface FileChange {
  file: string;
  status: 'Added' | 'Modified' | 'Deleted' | 'Renamed';
}

export interface UncommittedChanges {
  file_count: number;
  diff_summary: string;
  files_changed: FileChange[];
}

export interface DevelopmentStatus {
  branch: string;
  is_protected: boolean;
  uncommitted_changes?: UncommittedChanges;
  suggestions?: Array<{
    type: string;
    priority: string;
    message: string;
    action?: string;
    reason?: string;
  }>;
  hints?: string[];
}

export interface CreateBranchParams {
  name: string;
  type: string;
  message: string;
}

export interface CreatePullRequestParams {
  title: string;
  body: string;
  is_draft?: boolean;
}

export interface CheckpointParams {
  message: string;
  push?: boolean;
}

export interface DeploymentInfo {
  should_deploy: boolean;
  reason?: string;
  version_bump?: {
    from: string;
    to: string;
  };
  workflows?: string[];
}

export interface PushResult {
  pushed: boolean;
  branch: string;
  remote_url?: string;
  deployment_info?: DeploymentInfo;
  workflow_runs?: {
    name: string;
    url: string;
    status?: string;
  }[];
}

// Enhanced PR Management Types
export interface UpdatePullRequestParams {
  pr_number: number;
  title?: string;
  body?: string;
  draft?: boolean;
  reviewers?: string[];
  labels?: string[];
}

export interface PullRequestStatus {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  draft: boolean;
  url: string;
  created_at: string;
  updated_at: string;
  author: string;
  reviewers: Array<{
    login: string;
    state: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  }>;
  labels: string[];
  checks?: {
    status: 'pending' | 'success' | 'failure' | 'neutral';
    conclusion?: string;
    total: number;
    passed: number;
    failed: number;
    pending: number;
  };
  mergeable?: boolean;
  mergeable_state?: string;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface GeneratePRDescriptionParams {
  include_commits?: boolean;
  template?: string;
}

// Issue Integration Types
export interface CreateBranchFromIssueParams {
  issue_number: number;
  branch_type?: 'feature' | 'bugfix' | 'refactor';
}

export interface IssueDetails {
  number: number;
  title: string;
  state: 'open' | 'closed';
  body?: string;
  labels: string[];
  assignees: string[];
  milestone?: {
    title: string;
    due_on?: string;
  };
  created_at: string;
  updated_at: string;
  closed_at?: string;
  url: string;
  pull_request?: {
    url: string;
    merged_at?: string;
  };
}

export interface ListIssuesParams {
  state?: 'open' | 'closed' | 'all';
  labels?: string[];
  assignee?: string;
  milestone?: string;
  sort?: 'created' | 'updated' | 'comments';
  direction?: 'asc' | 'desc';
  limit?: number;
}

export interface UpdateIssueParams {
  issue_number: number;
  comment?: string;
  state?: 'open' | 'closed';
  labels?: string[];
}

// Release Management Types
export interface VersionBumpParams {
  type: 'major' | 'minor' | 'patch' | 'custom';
  custom_version?: string;
  update_files?: boolean;
}

export interface GenerateChangelogParams {
  from?: string;  // Git ref (tag, commit, branch)
  to?: string;    // Git ref (tag, commit, branch)
  format?: 'markdown' | 'json' | 'conventional';
  include_unreleased?: boolean;
}

export interface CreateReleaseParams {
  tag_name: string;
  name?: string;
  body?: string;
  draft?: boolean;
  prerelease?: boolean;
  target_commitish?: string;
  generate_release_notes?: boolean;
}

export interface ReleaseInfo {
  id: number;
  tag_name: string;
  name: string;
  body?: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at?: string;
  url: string;
  assets: Array<{
    name: string;
    size: number;
    download_url: string;
  }>;
}

export interface TagInfo {
  name: string;
  commit: string;
  message?: string;
  tagger?: {
    name: string;
    email: string;
    date: string;
  };
}

export interface ChangelogEntry {
  version?: string;
  date: string;
  commits: Array<{
    hash: string;
    type?: string;
    scope?: string;
    subject: string;
    body?: string;
    breaking?: boolean;
    issues?: string[];
  }>;
  breaking_changes: string[];
  features: string[];
  fixes: string[];
  other: string[];
}

// Automation Types
export interface LLMDecision {
  action: string;
  confidence: number;
  reasoning: string;
  requiresApproval: boolean;
  alternativeActions?: string[];
  riskAssessment?: RiskAssessment;
}

export interface DecisionContext {
  currentEvent: import('./monitoring/types.js').MonitoringEvent;
  projectState: ProjectState;
  recentHistory: import('./monitoring/types.js').MonitoringEvent[];
  userPreferences: AutomationConfig['preferences'];
  possibleActions: string[];
  riskFactors?: RiskAssessment;
  timeContext?: TimeContext;
}

export interface ProjectState {
  branch: string;
  isProtected: boolean;
  uncommittedChanges: number;
  lastCommitTime: Date;
  testStatus?: 'passing' | 'failing' | 'unknown';
  buildStatus?: 'success' | 'failure' | 'pending';
}

export interface RiskAssessment {
  score: number;
  factors: string[];
  level: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
}

export interface TimeContext {
  currentTime: Date;
  isWorkingHours: boolean;
  lastUserActivity: Date;
  dayOfWeek: string;
}

export interface AutomationFeedback {
  decisionId: string;
  originalDecision: LLMDecision;
  userAction: string;
  userComment?: string;
  timestamp: Date;
  context: DecisionContext;
  outcome: 'accepted' | 'modified' | 'rejected';
}

export interface LearnedPreference {
  pattern: string;
  preference: string;
  confidence: number;
  examples: number;
  lastUpdated: Date;
}