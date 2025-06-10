import { ConfigManager } from './config.js';
import { GitManager } from './git.js';
import { GitHubManager } from './github.js';
import { FileWatcher } from './file-watcher.js';
import { 
  DevelopmentStatus, 
  CreateBranchParams, 
  CreatePullRequestParams, 
  CheckpointParams,
  ProjectConfig,
  PushResult,
  DeploymentInfo 
} from './types.js';
import * as path from 'path';
import { 
  ProjectError, 
  GitError, 
  GitHubError,
  createNoProjectError,
  createProtectedBranchError,
  createNoChangesError,
  createGitHubTokenError,
  createInvalidBranchTypeError,
  createGitRemoteMismatchError
} from './errors.js';
import { ProgressIndicator } from './progress.js';
import { StatusDisplay } from './status-display.js';

export class DevelopmentTools {
  private configManager: ConfigManager;
  private gitManager: GitManager;
  private githubManager: GitHubManager;
  private fileWatcher: FileWatcher;
  private currentProjectPath: string | null = null;

  constructor() {
    this.configManager = new ConfigManager();
    this.gitManager = new GitManager();
    this.githubManager = new GitHubManager();
    this.fileWatcher = new FileWatcher();
  }

  async initialize() {
    const progress = new ProgressIndicator();
    
    try {
      progress.start('Loading configuration');
      const config = await this.configManager.loadConfig();
      progress.succeed('Configuration loaded');
      
      if (config.projects.length > 0) {
        progress.start(`Setting up ${config.projects.length} project${config.projects.length > 1 ? 's' : ''}`);
        for (const project of config.projects) {
          this.fileWatcher.addProject(project);
        }
        progress.succeed(`${config.projects.length} project${config.projects.length > 1 ? 's' : ''} configured`);
      }

      await this.setCurrentProject();
    } catch (error) {
      progress.fail('Initialization failed');
      throw error;
    }
  }

  private async setCurrentProject() {
    const config = await this.configManager.loadConfig();
    const cwd = process.cwd();
    
    for (const project of config.projects) {
      if (cwd.startsWith(project.path)) {
        this.currentProjectPath = project.path;
        return;
      }
    }

    if (config.projects.length > 0) {
      this.currentProjectPath = config.projects[0].path;
    }
  }

  private async getCurrentProject(): Promise<ProjectConfig> {
    if (!this.currentProjectPath) {
      throw createNoProjectError();
    }

    const config = await this.configManager.loadConfig();
    const project = config.projects.find(p => p.path === this.currentProjectPath);
    
    if (!project) {
      throw new ProjectError(
        `Current project path ${this.currentProjectPath} not found in configuration`,
        'Check your config.yml file and ensure the project path is correct'
      );
    }

    return project;
  }

  async getStatus(): Promise<DevelopmentStatus> {
    const project = await this.getCurrentProject();
    const config = await this.configManager.loadConfig();
    
    if (!await this.gitManager.isGitRepository(project.path)) {
      throw new GitError(
        `Project at ${project.path} is not a Git repository`,
        'Initialize with "git init" or clone an existing repository'
      );
    }

    const branch = await this.gitManager.getCurrentBranch(project.path);
    const isProtected = config.git_workflow.protected_branches.includes(branch);
    const uncommittedChanges = await this.gitManager.getUncommittedChanges(project.path);

    return {
      branch,
      is_protected: isProtected,
      uncommitted_changes: uncommittedChanges || undefined
    };
  }

  async createBranch(params: CreateBranchParams): Promise<string> {
    const progress = new ProgressIndicator();
    
    try {
      progress.start('Validating project');
      const project = await this.getCurrentProject();
      const config = await this.configManager.loadConfig();

      if (!await this.gitManager.isGitRepository(project.path)) {
        progress.fail();
        throw new GitError(
          `Project at ${project.path} is not a Git repository`,
          'Initialize with "git init" or clone an existing repository'
        );
      }

      const currentBranch = await this.gitManager.getCurrentBranch(project.path);
      if (config.git_workflow.protected_branches.includes(currentBranch)) {
        progress.fail();
        throw createProtectedBranchError(currentBranch);
      }

      const branchPrefix = config.git_workflow.branch_prefixes[params.type as keyof typeof config.git_workflow.branch_prefixes];
      if (!branchPrefix) {
        progress.fail();
        throw createInvalidBranchTypeError(params.type, Object.keys(config.git_workflow.branch_prefixes));
      }

      const fullBranchName = `${branchPrefix}${params.name}`;

      progress.update('Checking for changes');
      const uncommittedChanges = await this.gitManager.getUncommittedChanges(project.path);
      if (!uncommittedChanges) {
        progress.fail();
        throw createNoChangesError();
      }

      progress.update(`Creating branch ${fullBranchName}`);
      await this.gitManager.createBranch(project.path, fullBranchName);
      
      progress.update('Committing changes');
      await this.gitManager.commitChanges(project.path, params.message);
      
      progress.succeed(`Created branch ${fullBranchName}`);

      return StatusDisplay.showBranchCreated(fullBranchName, params.message);
    } catch (error) {
      progress.fail();
      throw error;
    }
  }

  async createPullRequest(params: CreatePullRequestParams): Promise<string> {
    const progress = new ProgressIndicator();
    
    try {
      progress.start('Validating project');
      const project = await this.getCurrentProject();
      const config = await this.configManager.loadConfig();

      if (!await this.gitManager.isGitRepository(project.path)) {
        progress.fail();
        throw new GitError(
          `Project at ${project.path} is not a Git repository`,
          'Initialize with "git init" or clone an existing repository'
        );
      }

      progress.update('Validating GitHub authentication');
      if (!await this.githubManager.validateToken()) {
        progress.fail();
        throw createGitHubTokenError();
      }

      progress.update('Validating git remote');
      if (!await this.gitManager.validateRemoteMatchesConfig(project.path, project.github_repo)) {
        const remoteUrl = await this.gitManager.getRemoteUrl(project.path);
        const parsed = remoteUrl ? this.gitManager.parseGitHubUrl(remoteUrl) : null;
        const actual = parsed ? `${parsed.owner}/${parsed.repo}` : 'unknown';
        progress.fail();
        throw createGitRemoteMismatchError(project.github_repo, actual);
      }

      const currentBranch = await this.gitManager.getCurrentBranch(project.path);
      if (config.git_workflow.protected_branches.includes(currentBranch)) {
        progress.fail();
        throw createProtectedBranchError(currentBranch);
      }

      const { owner, repo } = this.githubManager.parseRepoUrl(project.github_repo);

      progress.update(`Pushing branch ${currentBranch} to remote`);
      await this.gitManager.pushBranch(project.path, currentBranch);

      progress.update('Creating pull request');
      const pr = await this.githubManager.createPullRequest(
        owner,
        repo,
        params.title,
        params.body,
        currentBranch,
        config.git_workflow.main_branch,
        params.is_draft ?? true,
        project.reviewers
      );
      
      progress.succeed('Pull request created');

      return StatusDisplay.showPullRequestCreated(pr.html_url, params.is_draft ?? true);
    } catch (error) {
      progress.fail();
      throw error;
    }
  }

  async checkpoint(params: CheckpointParams): Promise<string> {
    const progress = new ProgressIndicator();
    
    try {
      progress.start('Validating project');
      const project = await this.getCurrentProject();
      const config = await this.configManager.loadConfig();

      if (!await this.gitManager.isGitRepository(project.path)) {
        progress.fail();
        throw new GitError(
          `Project at ${project.path} is not a Git repository`,
          'Initialize with "git init" or clone an existing repository'
        );
      }

      const currentBranch = await this.gitManager.getCurrentBranch(project.path);
      if (config.git_workflow.protected_branches.includes(currentBranch)) {
        progress.fail();
        throw createProtectedBranchError(currentBranch);
      }

      progress.update('Checking for changes');
      const uncommittedChanges = await this.gitManager.getUncommittedChanges(project.path);
      if (!uncommittedChanges) {
        progress.fail();
        throw createNoChangesError();
      }

      progress.update('Committing changes');
      await this.gitManager.commitChanges(project.path, params.message);
      
      progress.succeed('Changes committed');

      // Check if we should auto-push
      const shouldAutoPush = this.shouldAutoPush(config, currentBranch, params.push);
      let pushResult: PushResult | null = null;

      if (shouldAutoPush) {
        pushResult = await this.performAutoPush(project, config, currentBranch, params.message, progress);
      }

      // Display results
      const lines: string[] = [StatusDisplay.showCheckpointCreated(params.message)];
      
      if (pushResult && pushResult.pushed) {
        lines.push('');
        lines.push(StatusDisplay.showPushResult(pushResult));
      }

      return lines.join('\n');
    } catch (error) {
      progress.fail();
      throw error;
    }
  }

  private shouldAutoPush(config: any, currentBranch: string, explicitPush?: boolean): boolean {
    // Explicit push parameter overrides everything
    if (explicitPush !== undefined) {
      return explicitPush;
    }

    // Check auto-push configuration
    const autoPushConfig = config.git_workflow.auto_push;
    if (!autoPushConfig) {
      return false;
    }

    const isMainBranch = currentBranch === config.git_workflow.main_branch;
    
    if (isMainBranch && autoPushConfig.main_branch) {
      return true;
    }

    if (!isMainBranch && autoPushConfig.feature_branches) {
      return true;
    }

    return false;
  }

  private async performAutoPush(
    project: ProjectConfig, 
    config: any, 
    currentBranch: string, 
    commitMessage: string,
    progress: ProgressIndicator
  ): Promise<PushResult> {
    const result: PushResult = {
      pushed: false,
      branch: currentBranch
    };

    try {
      // Safety checks
      progress.update('Performing safety checks');
      
      // Verify remote matches configuration
      if (!await this.gitManager.validateRemoteMatchesConfig(project.path, project.github_repo)) {
        const remoteUrl = await this.gitManager.getRemoteUrl(project.path);
        const parsed = remoteUrl ? this.gitManager.parseGitHubUrl(remoteUrl) : null;
        const actual = parsed ? `${parsed.owner}/${parsed.repo}` : 'unknown';
        throw createGitRemoteMismatchError(project.github_repo, actual);
      }

      // Check for unpushed commits
      const hasUnpushedCommits = await this.gitManager.hasUnpushedCommits(project.path, currentBranch);
      if (!hasUnpushedCommits) {
        result.pushed = false;
        return result;
      }

      // Check if confirmation is required
      if (config.git_workflow.auto_push?.confirm_before_push) {
        // In MCP mode, we can't ask for confirmation, so we skip the push
        // This could be enhanced later to return a confirmation requirement
        result.pushed = false;
        return result;
      }

      progress.update(`Pushing ${currentBranch} to remote`);
      
      // Perform the push
      await this.gitManager.pushBranch(project.path, currentBranch);
      result.pushed = true;
      result.remote_url = await this.gitManager.getRemoteUrl(project.path) || undefined;

      // Detect deployment information
      progress.update('Analyzing deployment triggers');
      result.deployment_info = await this.gitManager.detectDeployment(
        project.path, 
        commitMessage, 
        currentBranch, 
        config.git_workflow.main_branch
      );

      // Get workflow run information if available
      if (result.deployment_info?.should_deploy && result.deployment_info.workflows) {
        result.workflow_runs = await this.getWorkflowRunUrls(project, result.deployment_info.workflows);
      }

      progress.succeed('Push completed');
      return result;

    } catch (error) {
      progress.fail('Push failed');
      throw error;
    }
  }

  private async getWorkflowRunUrls(project: ProjectConfig, workflows: string[]): Promise<{ name: string; url: string }[]> {
    const results: { name: string; url: string }[] = [];
    
    for (const workflow of workflows) {
      const workflowName = workflow.replace(/\.(yml|yaml)$/, '');
      const url = `https://github.com/${project.github_repo}/actions/workflows/${workflow}`;
      results.push({ name: workflowName, url });
    }

    return results;
  }

  close() {
    this.fileWatcher.close();
  }
}