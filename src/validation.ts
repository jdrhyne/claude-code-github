import * as fs from 'fs';
import { Config, Project } from './types.js';
import { GitManager } from './git.js';
import { GitHubManager } from './github.js';
import chalk from 'chalk';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'error';
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationWarning {
  type: 'warning';
  field: string;
  message: string;
  suggestion?: string;
}

export class ConfigValidator {
  private gitManager: GitManager;
  private githubManager: GitHubManager;

  constructor() {
    this.gitManager = new GitManager();
    this.githubManager = new GitHubManager();
  }

  async validateConfig(config: Config): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate git_workflow section
    this.validateGitWorkflow(config, errors, warnings);

    // Validate projects
    await this.validateProjects(config, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateGitWorkflow(config: Config, errors: ValidationError[], warnings: ValidationWarning[]) {
    if (!config.git_workflow) {
      errors.push({
        type: 'error',
        field: 'git_workflow',
        message: 'Missing git_workflow configuration section',
        suggestion: 'Add a git_workflow section to your config with main_branch, protected_branches, and branch_prefixes'
      });
      return;
    }

    const { git_workflow } = config;

    // Validate main_branch
    if (!git_workflow.main_branch) {
      errors.push({
        type: 'error',
        field: 'git_workflow.main_branch',
        message: 'Missing main branch configuration',
        suggestion: 'Set main_branch to "main" or "master" depending on your repository default'
      });
    } else if (!['main', 'master', 'develop'].includes(git_workflow.main_branch)) {
      warnings.push({
        type: 'warning',
        field: 'git_workflow.main_branch',
        message: `Unusual main branch name: "${git_workflow.main_branch}"`,
        suggestion: 'Common main branch names are "main", "master", or "develop"'
      });
    }

    // Validate protected_branches
    if (!Array.isArray(git_workflow.protected_branches)) {
      errors.push({
        type: 'error',
        field: 'git_workflow.protected_branches',
        message: 'protected_branches must be an array',
        suggestion: 'Set protected_branches to an array like ["main", "develop"]'
      });
    } else if (git_workflow.protected_branches.length === 0) {
      warnings.push({
        type: 'warning',
        field: 'git_workflow.protected_branches',
        message: 'No protected branches configured',
        suggestion: 'Consider protecting at least your main branch from direct commits'
      });
    } else if (git_workflow.main_branch && !git_workflow.protected_branches.includes(git_workflow.main_branch)) {
      warnings.push({
        type: 'warning',
        field: 'git_workflow.protected_branches',
        message: `Main branch "${git_workflow.main_branch}" is not in the protected branches list`,
        suggestion: 'Add your main branch to protected_branches to prevent accidental direct commits'
      });
    }

    // Validate branch_prefixes
    if (!git_workflow.branch_prefixes) {
      errors.push({
        type: 'error',
        field: 'git_workflow.branch_prefixes',
        message: 'Missing branch prefixes configuration',
        suggestion: 'Add branch_prefixes with at least "feature", "bugfix", and "refactor" mappings'
      });
    } else {
      const requiredPrefixes: Array<keyof typeof git_workflow.branch_prefixes> = ['feature', 'bugfix', 'refactor'];
      for (const prefix of requiredPrefixes) {
        if (!git_workflow.branch_prefixes[prefix]) {
          errors.push({
            type: 'error',
            field: `git_workflow.branch_prefixes.${prefix}`,
            message: `Missing required branch prefix: ${prefix}`,
            suggestion: `Add ${prefix}: "${prefix}/" to your branch_prefixes`
          });
        }
      }

      // Check for trailing slashes
      for (const [type, prefix] of Object.entries(git_workflow.branch_prefixes)) {
        if (prefix && typeof prefix === 'string' && !prefix.endsWith('/')) {
          warnings.push({
            type: 'warning',
            field: `git_workflow.branch_prefixes.${type}`,
            message: `Branch prefix "${prefix}" doesn't end with a slash`,
            suggestion: `Consider changing to "${prefix}/" for consistency`
          });
        }
      }
    }
  }

  private async validateProjects(config: Config, errors: ValidationError[], warnings: ValidationWarning[]) {
    if (!Array.isArray(config.projects)) {
      errors.push({
        type: 'error',
        field: 'projects',
        message: 'projects must be an array',
        suggestion: 'Set projects to an empty array [] if you haven\'t configured any projects yet'
      });
      return;
    }

    if (config.projects.length === 0) {
      warnings.push({
        type: 'warning',
        field: 'projects',
        message: 'No projects configured',
        suggestion: 'Add at least one project with path and github_repo fields'
      });
      return;
    }

    for (let i = 0; i < config.projects.length; i++) {
      await this.validateProject(config.projects[i], i, errors, warnings);
    }
  }

  private async validateProject(project: Project, index: number, errors: ValidationError[], warnings: ValidationWarning[]) {
    const projectPrefix = `projects[${index}]`;

    // Validate required fields
    if (!project.path) {
      errors.push({
        type: 'error',
        field: `${projectPrefix}.path`,
        message: 'Missing project path',
        suggestion: 'Add the absolute path to your project directory'
      });
      return;
    }

    if (!project.github_repo) {
      errors.push({
        type: 'error',
        field: `${projectPrefix}.github_repo`,
        message: 'Missing GitHub repository',
        suggestion: 'Add the GitHub repository in format "owner/repo"'
      });
    } else {
      // Validate GitHub repo format
      const parts = project.github_repo.split('/');
      if (parts.length !== 2 || parts.some(p => !p)) {
        errors.push({
          type: 'error',
          field: `${projectPrefix}.github_repo`,
          message: `Invalid GitHub repository format: "${project.github_repo}"`,
          suggestion: 'Use format "owner/repo", e.g., "facebook/react"'
        });
      }
    }

    // Validate path exists
    if (!fs.existsSync(project.path)) {
      errors.push({
        type: 'error',
        field: `${projectPrefix}.path`,
        message: `Project path does not exist: ${project.path}`,
        suggestion: 'Check the path and make sure it points to an existing directory'
      });
      return;
    }

    // Validate it's a directory
    const stats = fs.statSync(project.path);
    if (!stats.isDirectory()) {
      errors.push({
        type: 'error',
        field: `${projectPrefix}.path`,
        message: `Project path is not a directory: ${project.path}`,
        suggestion: 'The path should point to a directory, not a file'
      });
      return;
    }

    // Check if it's a git repository
    const isGitRepo = await this.gitManager.isGitRepository(project.path);
    if (!isGitRepo) {
      errors.push({
        type: 'error',
        field: `${projectPrefix}.path`,
        message: `Project path is not a git repository: ${project.path}`,
        suggestion: 'Initialize a git repository with "git init" or clone an existing repository'
      });
      return;
    }

    // Validate git remote matches GitHub repo
    if (project.github_repo) {
      const remoteMatches = await this.gitManager.validateRemoteMatchesConfig(project.path, project.github_repo);
      if (!remoteMatches) {
        const remoteUrl = await this.gitManager.getRemoteUrl(project.path);
        if (!remoteUrl) {
          warnings.push({
            type: 'warning',
            field: `${projectPrefix}`,
            message: 'No git remote "origin" found',
            suggestion: `Add a remote with: git remote add origin https://github.com/${project.github_repo}.git`
          });
        } else {
          const parsed = this.gitManager.parseGitHubUrl(remoteUrl);
          const actualRepo = parsed ? `${parsed.owner}/${parsed.repo}` : 'unknown';
          errors.push({
            type: 'error',
            field: `${projectPrefix}.github_repo`,
            message: `GitHub repo mismatch: configured as "${project.github_repo}" but remote points to "${actualRepo}"`,
            suggestion: `Update the github_repo to "${actualRepo}" or change the git remote`
          });
        }
      }
    }

    // Validate reviewers
    if (project.reviewers && !Array.isArray(project.reviewers)) {
      errors.push({
        type: 'error',
        field: `${projectPrefix}.reviewers`,
        message: 'reviewers must be an array',
        suggestion: 'Set reviewers to an array of GitHub usernames, e.g., ["user1", "user2"]'
      });
    }
  }

  async validateGitHubToken(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const isValid = await this.githubManager.validateToken();
      if (!isValid) {
        errors.push({
          type: 'error',
          field: 'github_token',
          message: 'GitHub token is invalid or expired',
          suggestion: 'Run the setup wizard to configure a new token, or create one at https://github.com/settings/tokens/new'
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOTFOUND')) {
        errors.push({
          type: 'error',
          field: 'github_token',
          message: 'Unable to connect to GitHub API',
          suggestion: 'Check your internet connection and try again'
        });
      } else {
        errors.push({
          type: 'error',
          field: 'github_token',
          message: 'Failed to validate GitHub token',
          suggestion: 'Ensure you have a valid token with "repo" and "workflow" scopes'
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  formatValidationResults(result: ValidationResult): string {
    const output: string[] = [];

    if (result.errors.length > 0) {
      output.push(chalk.red.bold('\n❌ Configuration Errors:'));
      for (const error of result.errors) {
        output.push(chalk.red(`  • ${error.field}: ${error.message}`));
        if (error.suggestion) {
          output.push(chalk.gray(`    → ${error.suggestion}`));
        }
      }
    }

    if (result.warnings.length > 0) {
      output.push(chalk.yellow.bold('\n⚠️  Configuration Warnings:'));
      for (const warning of result.warnings) {
        output.push(chalk.yellow(`  • ${warning.field}: ${warning.message}`));
        if (warning.suggestion) {
          output.push(chalk.gray(`    → ${warning.suggestion}`));
        }
      }
    }

    if (result.valid && result.warnings.length === 0) {
      output.push(chalk.green.bold('\n✅ Configuration is valid!'));
    }

    return output.join('\n');
  }
}