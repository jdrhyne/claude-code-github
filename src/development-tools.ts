import { ConfigManager } from './config.js';
import { GitManager } from './git.js';
import { GitHubManager } from './github.js';
import { FileWatcher } from './file-watcher.js';
import { 
  DevelopmentStatus, 
  CreateBranchParams, 
  CreatePullRequestParams, 
  CheckpointParams,
  ProjectConfig 
} from './types.js';
import * as path from 'path';

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
    const config = this.configManager.loadConfig();
    
    for (const project of config.projects) {
      this.fileWatcher.addProject(project);
    }

    this.setCurrentProject();
  }

  private setCurrentProject() {
    const config = this.configManager.loadConfig();
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

  private getCurrentProject(): ProjectConfig {
    if (!this.currentProjectPath) {
      throw new Error('No current project set. Please configure projects in config.yml');
    }

    const config = this.configManager.loadConfig();
    const project = config.projects.find(p => p.path === this.currentProjectPath);
    
    if (!project) {
      throw new Error(`Current project path ${this.currentProjectPath} not found in configuration`);
    }

    return project;
  }

  async getStatus(): Promise<DevelopmentStatus> {
    const project = this.getCurrentProject();
    const config = this.configManager.loadConfig();
    
    if (!await this.gitManager.isGitRepository(project.path)) {
      throw new Error(`Project at ${project.path} is not a Git repository`);
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
    const project = this.getCurrentProject();
    const config = this.configManager.loadConfig();

    if (!await this.gitManager.isGitRepository(project.path)) {
      throw new Error(`Project at ${project.path} is not a Git repository`);
    }

    const currentBranch = await this.gitManager.getCurrentBranch(project.path);
    if (config.git_workflow.protected_branches.includes(currentBranch)) {
      throw new Error(`Cannot create branch from protected branch: ${currentBranch}`);
    }

    const branchPrefix = config.git_workflow.branch_prefixes[params.type as keyof typeof config.git_workflow.branch_prefixes];
    if (!branchPrefix) {
      throw new Error(`Invalid branch type: ${params.type}. Valid types: ${Object.keys(config.git_workflow.branch_prefixes).join(', ')}`);
    }

    const fullBranchName = `${branchPrefix}${params.name}`;

    const uncommittedChanges = await this.gitManager.getUncommittedChanges(project.path);
    if (!uncommittedChanges) {
      throw new Error('No uncommitted changes to commit to the new branch');
    }

    await this.gitManager.createBranch(project.path, fullBranchName);
    await this.gitManager.commitChanges(project.path, params.message);

    return `Created branch ${fullBranchName} and committed changes`;
  }

  async createPullRequest(params: CreatePullRequestParams): Promise<string> {
    const project = this.getCurrentProject();
    const config = this.configManager.loadConfig();

    if (!await this.gitManager.isGitRepository(project.path)) {
      throw new Error(`Project at ${project.path} is not a Git repository`);
    }

    if (!await this.githubManager.validateToken()) {
      throw new Error('GitHub token validation failed. Please check your token.');
    }

    if (!await this.gitManager.validateRemoteMatchesConfig(project.path, project.github_repo)) {
      throw new Error(`Git remote does not match configured repository: ${project.github_repo}`);
    }

    const currentBranch = await this.gitManager.getCurrentBranch(project.path);
    if (config.git_workflow.protected_branches.includes(currentBranch)) {
      throw new Error(`Cannot create pull request from protected branch: ${currentBranch}`);
    }

    const { owner, repo } = this.githubManager.parseRepoUrl(project.github_repo);

    await this.gitManager.pushBranch(project.path, currentBranch);

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

    return `Created pull request #${pr.number}: ${pr.html_url}`;
  }

  async checkpoint(params: CheckpointParams): Promise<string> {
    const project = this.getCurrentProject();
    const config = this.configManager.loadConfig();

    if (!await this.gitManager.isGitRepository(project.path)) {
      throw new Error(`Project at ${project.path} is not a Git repository`);
    }

    const currentBranch = await this.gitManager.getCurrentBranch(project.path);
    if (config.git_workflow.protected_branches.includes(currentBranch)) {
      throw new Error(`Cannot commit to protected branch: ${currentBranch}`);
    }

    const uncommittedChanges = await this.gitManager.getUncommittedChanges(project.path);
    if (!uncommittedChanges) {
      throw new Error('No changes to commit');
    }

    await this.gitManager.commitChanges(project.path, params.message);

    return `Committed changes with message: ${params.message}`;
  }

  close() {
    this.fileWatcher.close();
  }
}