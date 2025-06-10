export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: string | number | null;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: JsonRpcError;
  id: string | number | null;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ProjectConfig {
  path: string;
  github_repo: string;
  reviewers?: string[];
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

export interface Config {
  git_workflow: GitWorkflowConfig;
  projects: ProjectConfig[];
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