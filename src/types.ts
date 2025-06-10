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