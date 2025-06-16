import { ConfigManager } from './config.js';
import { Config } from './types.js';
import { GitManager } from './git.js';
import { GitHubManager } from './github.js';
import { FileWatcher } from './file-watcher.js';
import { WorkspaceMonitor, WorkspaceProject } from './workspace-monitor.js';
import { 
  DevelopmentStatus, 
  CreateBranchParams, 
  CreatePullRequestParams, 
  CheckpointParams,
  ProjectConfig,
  PushResult,
  UpdatePullRequestParams,
  PullRequestStatus,
  GeneratePRDescriptionParams,
  CreateBranchFromIssueParams,
  IssueDetails,
  ListIssuesParams,
  UpdateIssueParams,
  VersionBumpParams,
  GenerateChangelogParams,
  CreateReleaseParams,
  ReleaseInfo,
  ChangelogEntry
} from './types.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { 
  ProjectError, 
  GitError, 
  createNoProjectError,
  createProtectedBranchError,
  createNoChangesError,
  createGitHubTokenError,
  createInvalidBranchTypeError,
  createGitRemoteMismatchError
} from './errors.js';
import { ProgressIndicator } from './progress.js';
import { StatusDisplay } from './status-display.js';
import { SuggestionEngine } from './suggestion-engine.js';
import { MonitorManager } from './monitoring/monitor-manager.js';

export class DevelopmentTools {
  private configManager: ConfigManager;
  private gitManager: GitManager;
  private githubManager: GitHubManager;
  private fileWatcher: FileWatcher;
  private workspaceMonitor: WorkspaceMonitor | null = null;
  private suggestionEngine!: SuggestionEngine;
  private monitorManager: MonitorManager | null = null;
  private currentProjectPath: string | null = null;

  constructor() {
    this.configManager = new ConfigManager();
    this.gitManager = new GitManager();
    this.githubManager = new GitHubManager();
    this.fileWatcher = new FileWatcher();
    // SuggestionEngine will be initialized after config is loaded
  }

  async initialize() {
    const progress = new ProgressIndicator();
    
    try {
      progress.start('Loading configuration');
      const config = await this.configManager.loadConfig();
      progress.succeed('Configuration loaded');
      
      // Initialize suggestion engine with config
      this.suggestionEngine = new SuggestionEngine(config);
      
      // Initialize monitor manager if monitoring is enabled
      if (config.monitoring?.enabled !== false) {
        this.monitorManager = new MonitorManager({
          fileWatcher: this.fileWatcher,
          gitManager: this.gitManager,
          projects: config.projects
        });
      }
      
      // Initialize workspace monitor if enabled
      if (config.workspace_monitoring?.enabled) {
        progress.start('Initializing workspace monitoring');
        const cacheFile = path.join(process.env.HOME || process.env.USERPROFILE || '', '.config', 'claude-code-github', 'workspace-cache.json');
        this.workspaceMonitor = new WorkspaceMonitor(config.workspace_monitoring, cacheFile);
        
        // Start monitoring workspaces
        await this.workspaceMonitor.start();
        
        // Merge discovered projects with configured ones
        const discoveredProjects = this.workspaceMonitor.getProjectConfigs();
        if (discoveredProjects.length > 0) {
          const existingPaths = new Set(config.projects.map(p => p.path));
          for (const discovered of discoveredProjects) {
            if (!existingPaths.has(discovered.path)) {
              config.projects.push(discovered);
              this.fileWatcher.addProject(discovered);
            }
          }
          progress.succeed(`Workspace monitoring initialized (${discoveredProjects.length} projects discovered)`);
        } else {
          progress.succeed('Workspace monitoring initialized');
        }
        
        // Listen for new project discoveries
        this.workspaceMonitor.on('project-detected', (project: any) => {
          if (project.github_repo) {
            const projectConfig: ProjectConfig = {
              path: project.path,
              github_repo: project.github_repo
            };
            this.fileWatcher.addProject(projectConfig);
          }
        });
        
        // Update current directory for context awareness
        this.workspaceMonitor.setCurrentDirectory(process.cwd());
      }
      
      if (config.projects.length > 0) {
        progress.start(`Setting up ${config.projects.length} project${config.projects.length > 1 ? 's' : ''}`);
        for (const project of config.projects) {
          this.fileWatcher.addProject(project);
        }
        progress.succeed(`${config.projects.length} project${config.projects.length > 1 ? 's' : ''} configured`);
      }

      await this.setCurrentProject();
      return config;
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

    // Build basic status
    const status: DevelopmentStatus = {
      branch,
      is_protected: isProtected,
      uncommitted_changes: uncommittedChanges || undefined
    };

    // Get intelligent suggestions if suggestion engine is initialized
    if (this.suggestionEngine) {
      const suggestions = this.suggestionEngine.analyzeSituation(project.path, status);
      const hints = this.suggestionEngine.getContextualHints(project.path);
      
      if (suggestions.length > 0) {
        status.suggestions = suggestions;
      }
      
      if (hints.length > 0) {
        status.hints = hints;
      }
    }

    return status;
  }

  async getEnhancedStatus(): Promise<any> {
    const progress = new ProgressIndicator();
    
    try {
      progress.start('Gathering comprehensive project status');
      
      const project = await this.getCurrentProject();
      const config = await this.configManager.loadConfig();
      
      if (!await this.gitManager.isGitRepository(project.path)) {
        throw new GitError(
          `Project at ${project.path} is not a Git repository`,
          'Initialize with "git init" or clone an existing repository'
        );
      }

      // Get basic branch info
      progress.update('Analyzing branch status');
      const branchInfo = await this.gitManager.getBranchInfo(project.path);
      const isProtected = config.git_workflow.protected_branches.includes(branchInfo.current);
      
      // Get uncommitted changes
      const uncommittedChanges = await this.gitManager.getUncommittedChanges(project.path);
      
      // Get recent commits
      progress.update('Fetching recent commits');
      const recentCommits = await this.gitManager.getRecentCommits(project.path, 5);
      
      // Parse GitHub repo info
      const { owner, repo } = this.githubManager.parseRepoUrl(project.github_repo);
      
      // Get PRs
      progress.update('Checking pull requests');
      const pullRequests = await this.githubManager.getActivePullRequests(owner, repo, {
        head: `${owner}:${branchInfo.current}`
      });
      
      // Get issues
      progress.update('Fetching assigned issues');
      const issues = await this.githubManager.getUserIssues(owner, repo);
      
      // Get workflow runs for current branch
      progress.update('Checking CI/CD status');
      const workflowRuns = await this.githubManager.getLatestWorkflowRuns(
        owner, 
        repo, 
        branchInfo.current,
        3
      );
      
      // Get remote branches for context
      const remoteBranches = await this.gitManager.getRemoteBranches(project.path);
      const relatedBranches = remoteBranches
        .filter(b => b.includes(branchInfo.current.split('/').pop() || ''))
        .filter(b => !b.includes(branchInfo.current));
      
      progress.succeed('Status gathered');
      
      return {
        project: {
          path: project.path,
          repo: project.github_repo
        },
        branch: {
          current: branchInfo.current,
          isProtected,
          ahead: branchInfo.ahead,
          behind: branchInfo.behind,
          tracking: branchInfo.tracking
        },
        uncommittedChanges,
        recentCommits,
        pullRequests,
        issues,
        workflowRuns,
        relatedBranches
      };
    } catch (error) {
      progress.fail();
      throw error;
    }
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

  private shouldAutoPush(config: Config, currentBranch: string, explicitPush?: boolean): boolean {
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
    config: Config, 
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

  async quickAction(action: string): Promise<string> {
    const progress = new ProgressIndicator();
    
    try {
      const project = await this.getCurrentProject();
      const config = await this.configManager.loadConfig();
      
      switch (action) {
        case 'wip': {
          // Quick work-in-progress commit and push
          progress.start('Creating WIP commit');
          const uncommittedChanges = await this.gitManager.getUncommittedChanges(project.path);
          if (!uncommittedChanges) {
            progress.fail();
            return '❌ No changes to commit';
          }
          
          const timestamp = new Date().toISOString().substring(0, 16).replace('T', ' ');
          const wipMessage = `wip: work in progress - ${timestamp}`;
          await this.gitManager.commitChanges(project.path, wipMessage);
          
          const currentBranch = await this.gitManager.getCurrentBranch(project.path);
          if (!config.git_workflow.protected_branches.includes(currentBranch)) {
            progress.update('Pushing to remote');
            await this.gitManager.pushBranch(project.path, currentBranch);
            progress.succeed('WIP commit created and pushed');
            return `✅ Created WIP commit and pushed to ${currentBranch}`;
          } else {
            progress.succeed('WIP commit created');
            return `✅ Created WIP commit (not pushed - protected branch)`;
          }
        }
          
        case 'fix': {
          // Amend last commit
          progress.start('Amending last commit');
          const git = this.gitManager['getGit'](project.path);
          await git.add('.');
          await git.commit([], ['--amend', '--no-edit']);
          progress.succeed('Last commit amended');
          return '✅ Last commit amended with current changes';
        }
          
        case 'done': {
          // Finalize branch - push and create PR
          progress.start('Finalizing branch');
          const branch = await this.gitManager.getCurrentBranch(project.path);
          
          if (config.git_workflow.protected_branches.includes(branch)) {
            progress.fail();
            return '❌ Cannot finalize protected branch';
          }
          
          // Push if needed
          const hasUnpushed = await this.gitManager.hasUnpushedCommits(project.path, branch);
          if (hasUnpushed) {
            progress.update('Pushing branch');
            await this.gitManager.pushBranch(project.path, branch);
          }
          
          // Get last commit for PR title
          const lastCommit = await this.gitManager.getLastCommitMessage(project.path);
          const prTitle = lastCommit.split('\n')[0];
          
          // Create PR
          progress.update('Creating pull request');
          const { owner, repo } = this.githubManager.parseRepoUrl(project.github_repo);
          const pr = await this.githubManager.createPullRequest(
            owner,
            repo,
            prTitle,
            `Branch: ${branch}\n\nAuto-generated from quick action`,
            branch,
            config.git_workflow.main_branch,
            false,
            project.reviewers
          );
          
          progress.succeed('Branch finalized');
          return `✅ Branch finalized! Pull request created: ${pr.html_url}`;
        }
          
        case 'sync': {
          // Pull and rebase current branch
          progress.start('Syncing with remote');
          const syncBranch = await this.gitManager.getCurrentBranch(project.path);
          const syncGit = this.gitManager['getGit'](project.path);
          
          // Fetch latest
          progress.update('Fetching latest changes');
          await syncGit.fetch();
          
          // Pull with rebase
          progress.update('Rebasing on latest');
          await syncGit.pull('origin', syncBranch, ['--rebase']);
          
          progress.succeed('Synced with remote');
          return `✅ Synced ${syncBranch} with remote`;
        }
          
        case 'update': {
          // Update dependencies and commit
          progress.start('Updating dependencies');
          
          // Check for package.json
          if (!await this.gitManager['getGit'](project.path).checkIsRepo()) {
            progress.fail();
            return '❌ No package.json found';
          }
          
          // Run npm update with timeout
          const { execSync } = await import('child_process');
          progress.update('Running npm update');
          try {
            execSync('npm update', { 
              cwd: project.path, 
              stdio: 'ignore',
              timeout: 60000 // 60 second timeout
            });
          } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ETIMEDOUT') {
              throw new Error('npm update timed out after 60 seconds');
            }
            throw new Error(`npm update failed: ${error instanceof Error ? error.message : String(error)}`);
          }
          
          // Check if there are changes
          const updateChanges = await this.gitManager.getUncommittedChanges(project.path);
          if (updateChanges) {
            progress.update('Committing updates');
            await this.gitManager.commitChanges(project.path, 'chore: update dependencies');
            progress.succeed('Dependencies updated');
            return '✅ Dependencies updated and committed';
          } else {
            progress.succeed('No updates needed');
            return '✅ All dependencies are up to date';
          }
        }
          
        default:
          return `❌ Unknown quick action: ${action}. Available: wip, fix, done, sync, update`;
      }
    } catch (error) {
      progress.fail();
      throw error;
    }
  }

  close() {
    this.fileWatcher.close();
    if (this.monitorManager) {
      this.monitorManager.stop();
    }
    if (this.workspaceMonitor) {
      this.workspaceMonitor.stop();
    }
  }

  // Enhanced PR Management Methods
  async updatePullRequest(params: UpdatePullRequestParams): Promise<void> {
    const progress = new ProgressIndicator();
    
    try {
      const project = await this.getCurrentProject();
      progress.start('Updating pull request');
      
      const { owner, repo } = this.githubManager.parseRepoUrl(project.github_repo);
      await this.githubManager.updatePullRequest(owner, repo, params);
      
      progress.succeed(`Pull request #${params.pr_number} updated`);
    } catch (error) {
      progress.fail('Failed to update pull request');
      throw error;
    }
  }

  async getPullRequestStatus(pr_number: number): Promise<PullRequestStatus> {
    const progress = new ProgressIndicator();
    
    try {
      const project = await this.getCurrentProject();
      progress.start('Getting pull request status');
      
      const { owner, repo } = this.githubManager.parseRepoUrl(project.github_repo);
      const status = await this.githubManager.getPullRequestStatus(owner, repo, pr_number);
      
      progress.succeed('Pull request status retrieved');
      return status;
    } catch (error) {
      progress.fail('Failed to get pull request status');
      throw error;
    }
  }

  async generatePRDescription(params: GeneratePRDescriptionParams = {}): Promise<string> {
    const progress = new ProgressIndicator();
    
    try {
      const project = await this.getCurrentProject();
      const config = await this.configManager.loadConfig();
      progress.start('Generating pull request description');
      
      const currentBranch = await this.gitManager.getCurrentBranch(project.path);
      const baseBranch = config.git_workflow.main_branch;
      
      const { owner, repo } = this.githubManager.parseRepoUrl(project.github_repo);
      const description = await this.githubManager.generatePRDescription(
        owner, 
        repo, 
        baseBranch, 
        currentBranch,
        params.template
      );
      
      progress.succeed('Pull request description generated');
      return description;
    } catch (error) {
      progress.fail('Failed to generate pull request description');
      throw error;
    }
  }

  // Issue Integration Methods
  async createBranchFromIssue(params: CreateBranchFromIssueParams): Promise<{
    branch_name: string;
    issue: IssueDetails;
  }> {
    const progress = new ProgressIndicator();
    
    try {
      const project = await this.getCurrentProject();
      const config = await this.configManager.loadConfig();
      progress.start(`Creating branch from issue #${params.issue_number}`);
      
      // Get issue details
      const { owner, repo } = this.githubManager.parseRepoUrl(project.github_repo);
      const issue = await this.githubManager.getIssue(owner, repo, params.issue_number);
      
      // Generate branch name from issue title
      const branchType = params.branch_type || 'feature';
      const prefix = config.git_workflow.branch_prefixes[branchType];
      const safeName = issue.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
      const branchName = `${prefix}${issue.number}-${safeName}`;
      
      // Create and checkout branch
      progress.update(`Creating branch ${branchName}`);
      await this.gitManager.createBranch(project.path, branchName);
      
      // Add issue reference to first commit message
      progress.succeed(`Created branch ${branchName} from issue #${issue.number}`);
      return { branch_name: branchName, issue };
    } catch (error) {
      progress.fail('Failed to create branch from issue');
      throw error;
    }
  }

  async listIssues(params: ListIssuesParams = {}): Promise<IssueDetails[]> {
    const progress = new ProgressIndicator();
    
    try {
      const project = await this.getCurrentProject();
      progress.start('Fetching issues');
      
      const { owner, repo } = this.githubManager.parseRepoUrl(project.github_repo);
      const issues = await this.githubManager.listIssues(owner, repo, params);
      
      progress.succeed(`Found ${issues.length} issues`);
      return issues;
    } catch (error) {
      progress.fail('Failed to list issues');
      throw error;
    }
  }

  async updateIssue(params: UpdateIssueParams): Promise<void> {
    const progress = new ProgressIndicator();
    
    try {
      const project = await this.getCurrentProject();
      progress.start(`Updating issue #${params.issue_number}`);
      
      const { owner, repo } = this.githubManager.parseRepoUrl(project.github_repo);
      
      // Add auto-comment for linked commits if updating from a branch
      if (params.comment) {
        const currentBranch = await this.gitManager.getCurrentBranch(project.path);
        if (currentBranch.includes(`${params.issue_number}-`)) {
          params.comment += `\n\n_Updated from branch: ${currentBranch}_`;
        }
      }
      
      await this.githubManager.updateIssue(owner, repo, params.issue_number, {
        comment: params.comment,
        state: params.state,
        labels: params.labels
      });
      
      progress.succeed(`Issue #${params.issue_number} updated`);
    } catch (error) {
      progress.fail('Failed to update issue');
      throw error;
    }
  }

  // Release Management Methods
  async versionBump(params: VersionBumpParams): Promise<{
    old_version: string;
    new_version: string;
    files_updated: string[];
  }> {
    const progress = new ProgressIndicator();
    
    try {
      const project = await this.getCurrentProject();
      progress.start('Bumping version');
      
      // Get current version
      const currentVersion = await this.gitManager.getCurrentVersion(project.path);
      if (!currentVersion) {
        throw new ProjectError('No version found in package.json');
      }
      
      // Calculate new version
      let newVersion: string;
      if (params.type === 'custom' && params.custom_version) {
        newVersion = params.custom_version;
      } else {
        const [major, minor, patch] = currentVersion.split('.').map(Number);
        switch (params.type) {
          case 'major':
            newVersion = `${major + 1}.0.0`;
            break;
          case 'minor':
            newVersion = `${major}.${minor + 1}.0`;
            break;
          case 'patch':
            newVersion = `${major}.${minor}.${patch + 1}`;
            break;
          default:
            throw new Error(`Invalid version bump type: ${params.type}`);
        }
      }
      
      // Update package.json
      progress.update(`Updating version from ${currentVersion} to ${newVersion}`);
      await this.gitManager.updateVersion(project.path, newVersion);
      
      const filesUpdated = ['package.json'];
      
      // Also update package-lock.json if it exists
      try {
        const lockPath = path.join(project.path, 'package-lock.json');
        await fs.access(lockPath);
        const { execSync } = await import('child_process');
        execSync('npm install --package-lock-only', { cwd: project.path, stdio: 'ignore' });
        filesUpdated.push('package-lock.json');
      } catch (error) {
        // package-lock.json doesn't exist or npm failed, continue
      }
      
      if (params.update_files !== false) {
        // Stage the updated files
        await this.gitManager.stageFiles(project.path, filesUpdated);
      }
      
      progress.succeed(`Version bumped from ${currentVersion} to ${newVersion}`);
      return {
        old_version: currentVersion,
        new_version: newVersion,
        files_updated: filesUpdated
      };
    } catch (error) {
      progress.fail('Failed to bump version');
      throw error;
    }
  }

  async generateChangelog(params: GenerateChangelogParams = {}): Promise<ChangelogEntry> {
    const progress = new ProgressIndicator();
    
    try {
      const project = await this.getCurrentProject();
      progress.start('Generating changelog');
      
      // Determine range
      const to = params.to || 'HEAD';
      const from = params.from || await this.gitManager.getLatestTag(project.path) || 'HEAD~10';
      
      // Get commits
      const commits = await this.gitManager.getCommitsBetween(project.path, from, to);
      
      // Parse commits using conventional commit format
      const changelogEntry: ChangelogEntry = {
        date: new Date().toISOString().split('T')[0],
        commits: [],
        breaking_changes: [],
        features: [],
        fixes: [],
        other: []
      };
      
      for (const commit of commits) {
        const parsed = this.parseConventionalCommit(commit.message);
        
        changelogEntry.commits.push({
          hash: commit.hash.substring(0, 7),
          type: parsed.type,
          scope: parsed.scope,
          subject: parsed.subject,
          body: parsed.body,
          breaking: parsed.breaking,
          issues: parsed.issues
        });
        
        if (parsed.breaking) {
          changelogEntry.breaking_changes.push(`${parsed.subject}${parsed.body ? '\n' + parsed.body : ''}`);
        }
        
        if (parsed.type === 'feat') {
          changelogEntry.features.push(parsed.scope ? `**${parsed.scope}**: ${parsed.subject}` : parsed.subject);
        } else if (parsed.type === 'fix') {
          changelogEntry.fixes.push(parsed.scope ? `**${parsed.scope}**: ${parsed.subject}` : parsed.subject);
        } else {
          changelogEntry.other.push(`${parsed.type}: ${parsed.subject}`);
        }
      }
      
      // Add version if this is a tag
      if (params.from && params.from.match(/^v?\d+\.\d+\.\d+/)) {
        changelogEntry.version = params.from.replace(/^v/, '');
      }
      
      progress.succeed('Changelog generated');
      return changelogEntry;
    } catch (error) {
      progress.fail('Failed to generate changelog');
      throw error;
    }
  }

  private parseConventionalCommit(message: string): {
    type?: string;
    scope?: string;
    subject: string;
    body?: string;
    breaking: boolean;
    issues: string[];
  } {
    const lines = message.split('\n');
    const header = lines[0];
    
    // Parse header: type(scope): subject
    const match = header.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/);
    
    const result = {
      type: match?.[1],
      scope: match?.[2],
      subject: match?.[3] || header,
      body: lines.slice(1).join('\n').trim() || undefined,
      breaking: false,
      issues: [] as string[]
    };
    
    // Check for breaking changes
    if (header.includes('!:') || message.includes('BREAKING CHANGE:')) {
      result.breaking = true;
    }
    
    // Extract issue references
    const issueMatches = message.matchAll(/#(\d+)/g);
    for (const match of issueMatches) {
      result.issues.push(match[1]);
    }
    
    return result;
  }

  async createRelease(params: CreateReleaseParams): Promise<ReleaseInfo> {
    const progress = new ProgressIndicator();
    
    try {
      const project = await this.getCurrentProject();
      progress.start('Creating release');
      
      // Ensure we have the tag locally
      const tags = await this.gitManager.getTags(project.path);
      if (!tags.includes(params.tag_name)) {
        progress.update(`Creating tag ${params.tag_name}`);
        await this.gitManager.createTag(project.path, params.tag_name, params.name);
        await this.gitManager.pushTags(project.path);
      }
      
      // Generate release notes if not provided
      let body = params.body;
      if (!body && params.generate_release_notes !== false) {
        progress.update('Generating release notes');
        const previousTag = await this.gitManager.getLatestTag(project.path);
        const changelog = await this.generateChangelog({
          from: previousTag || undefined,
          to: params.tag_name
        });
        
        body = this.formatChangelogAsMarkdown(changelog);
      }
      
      // Create GitHub release
      progress.update('Creating GitHub release');
      const { owner, repo } = this.githubManager.parseRepoUrl(project.github_repo);
      const release = await this.githubManager.createRelease(owner, repo, {
        ...params,
        body
      });
      
      progress.succeed(`Release ${params.tag_name} created`);
      return release;
    } catch (error) {
      progress.fail('Failed to create release');
      throw error;
    }
  }

  formatChangelogAsMarkdown(changelog: ChangelogEntry): string {
    let markdown = '';
    
    if (changelog.breaking_changes.length > 0) {
      markdown += '## ⚠️ Breaking Changes\n\n';
      changelog.breaking_changes.forEach(change => {
        markdown += `- ${change}\n`;
      });
      markdown += '\n';
    }
    
    if (changelog.features.length > 0) {
      markdown += '## ✨ Features\n\n';
      changelog.features.forEach(feature => {
        markdown += `- ${feature}\n`;
      });
      markdown += '\n';
    }
    
    if (changelog.fixes.length > 0) {
      markdown += '## 🐛 Bug Fixes\n\n';
      changelog.fixes.forEach(fix => {
        markdown += `- ${fix}\n`;
      });
      markdown += '\n';
    }
    
    if (changelog.other.length > 0) {
      markdown += '## 📝 Other Changes\n\n';
      changelog.other.forEach(other => {
        markdown += `- ${other}\n`;
      });
      markdown += '\n';
    }
    
    markdown += `\n**Full Changelog**: ${changelog.commits.length} commits`;
    
    return markdown;
  }

  async getLatestRelease(): Promise<ReleaseInfo | null> {
    const progress = new ProgressIndicator();
    
    try {
      const project = await this.getCurrentProject();
      progress.start('Getting latest release');
      
      const { owner, repo } = this.githubManager.parseRepoUrl(project.github_repo);
      const release = await this.githubManager.getLatestRelease(owner, repo);
      
      progress.succeed(release ? `Latest release: ${release.tag_name}` : 'No releases found');
      return release;
    } catch (error) {
      progress.fail('Failed to get latest release');
      throw error;
    }
  }

  async listReleases(limit: number = 10): Promise<ReleaseInfo[]> {
    const progress = new ProgressIndicator();
    
    try {
      const project = await this.getCurrentProject();
      progress.start('Listing releases');
      
      const { owner, repo } = this.githubManager.parseRepoUrl(project.github_repo);
      const releases = await this.githubManager.listReleases(owner, repo, limit);
      
      progress.succeed(`Found ${releases.length} releases`);
      return releases;
    } catch (error) {
      progress.fail('Failed to list releases');
      throw error;
    }
  }

  /**
   * Process conversation message for monitoring
   */
  processConversationMessage(message: string, role: 'user' | 'assistant'): void {
    if (this.monitorManager) {
      this.monitorManager.processConversationMessage(message, role);
    }
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): Record<string, unknown> {
    if (!this.monitorManager) {
      return { enabled: false };
    }
    
    return {
      enabled: true,
      ...this.monitorManager.getMonitoringState()
    };
  }

  /**
   * Set up monitoring event listeners
   */
  setupMonitoringListeners(callbacks: {
    onSuggestion?: (suggestion: unknown) => void;
    onMilestone?: (milestone: unknown) => void;
    onEvent?: (event: unknown) => void;
  }): void {
    if (!this.monitorManager) return;

    if (callbacks.onSuggestion) {
      this.monitorManager.on('suggestion', callbacks.onSuggestion);
    }
    
    if (callbacks.onMilestone) {
      this.monitorManager.on('milestone', callbacks.onMilestone);
    }
    
    if (callbacks.onEvent) {
      this.monitorManager.on('monitoring-event', callbacks.onEvent);
    }
  }
}