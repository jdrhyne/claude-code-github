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

    // Validate project discovery
    this.validateProjectDiscovery(config, errors, warnings);

    // Validate projects
    await this.validateProjects(config, errors, warnings);

    // Validate automation configuration
    this.validateAutomation(config, errors, warnings);

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

  private validateProjectDiscovery(config: Config, errors: ValidationError[], warnings: ValidationWarning[]) {
    if (!config.project_discovery) {
      return; // Optional section
    }

    const discovery = config.project_discovery;

    // Validate scan_paths if enabled
    if (discovery.enabled) {
      if (!Array.isArray(discovery.scan_paths) || discovery.scan_paths.length === 0) {
        errors.push({
          type: 'error',
          field: 'project_discovery.scan_paths',
          message: 'Project discovery is enabled but no scan paths are configured',
          suggestion: 'Add at least one directory path to scan_paths or disable project discovery'
        });
      } else {
        // Validate each scan path
        for (let i = 0; i < discovery.scan_paths.length; i++) {
          const scanPath = discovery.scan_paths[i];
          if (!fs.existsSync(scanPath)) {
            warnings.push({
              type: 'warning',
              field: `project_discovery.scan_paths[${i}]`,
              message: `Scan path does not exist: ${scanPath}`,
              suggestion: 'Check the path or create the directory'
            });
          } else {
            const stats = fs.statSync(scanPath);
            if (!stats.isDirectory()) {
              errors.push({
                type: 'error',
                field: `project_discovery.scan_paths[${i}]`,
                message: `Scan path is not a directory: ${scanPath}`,
                suggestion: 'Scan paths must be directories, not files'
              });
            }
          }
        }
      }
    }

    // Validate max_depth
    if (discovery.max_depth !== undefined) {
      if (typeof discovery.max_depth !== 'number' || discovery.max_depth < 1 || discovery.max_depth > 10) {
        errors.push({
          type: 'error',
          field: 'project_discovery.max_depth',
          message: `Invalid max_depth: ${discovery.max_depth}`,
          suggestion: 'Set max_depth between 1 and 10'
        });
      }
    }

    // Validate exclude_patterns
    if (discovery.exclude_patterns && !Array.isArray(discovery.exclude_patterns)) {
      errors.push({
        type: 'error',
        field: 'project_discovery.exclude_patterns',
        message: 'exclude_patterns must be an array',
        suggestion: 'Set exclude_patterns to an array of glob patterns'
      });
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

    // Skip path validation in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
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

  private validateAutomation(config: Config, errors: ValidationError[], warnings: ValidationWarning[]) {
    if (!config.automation) {
      return; // Optional section
    }

    const automation = config.automation;

    // Validate mode
    if (automation.enabled && automation.mode) {
      const validModes = ['off', 'learning', 'assisted', 'autonomous'];
      if (!validModes.includes(automation.mode)) {
        errors.push({
          type: 'error',
          field: 'automation.mode',
          message: `Invalid mode: "${automation.mode}"`,
          suggestion: `Valid modes are: ${validModes.join(', ')}`
        });
      }

      // Warn if enabled but mode is off
      if (automation.enabled && automation.mode === 'off') {
        warnings.push({
          type: 'warning',
          field: 'automation',
          message: 'Automation is enabled but mode is set to "off"',
          suggestion: 'Either set enabled to false or change mode to "learning", "assisted", or "autonomous"'
        });
      }
    }

    // Validate LLM configuration
    if (automation.llm) {
      const validProviders = ['anthropic', 'openai', 'local'];
      if (!validProviders.includes(automation.llm.provider)) {
        errors.push({
          type: 'error',
          field: 'automation.llm.provider',
          message: `Invalid LLM provider: "${automation.llm.provider}"`,
          suggestion: `Valid providers are: ${validProviders.join(', ')}`
        });
      }

      // Check for API key configuration
      if (automation.llm.api_key_env && automation.enabled) {
        const envVar = process.env[automation.llm.api_key_env];
        if (!envVar) {
          warnings.push({
            type: 'warning',
            field: 'automation.llm.api_key_env',
            message: `Environment variable "${automation.llm.api_key_env}" is not set`,
            suggestion: `Set the environment variable or update api_key_env to the correct variable name`
          });
        }
      }

      // Validate temperature
      if (automation.llm.temperature !== undefined) {
        if (automation.llm.temperature < 0 || automation.llm.temperature > 1) {
          errors.push({
            type: 'error',
            field: 'automation.llm.temperature',
            message: `Temperature must be between 0 and 1, got ${automation.llm.temperature}`,
            suggestion: 'Set temperature between 0 (deterministic) and 1 (creative)'
          });
        }
      }
    }

    // Validate thresholds
    if (automation.thresholds) {
      const thresholds = automation.thresholds;
      
      // Validate confidence values are between 0 and 1
      const thresholdFields: (keyof typeof thresholds)[] = ['confidence', 'auto_execute', 'require_approval'];
      for (const field of thresholdFields) {
        const value = thresholds[field];
        if (value !== undefined && (value < 0 || value > 1)) {
          errors.push({
            type: 'error',
            field: `automation.thresholds.${field}`,
            message: `Threshold must be between 0 and 1, got ${value}`,
            suggestion: 'Set threshold between 0 (never) and 1 (always)'
          });
        }
      }

      // Validate threshold relationships
      if (thresholds.auto_execute < thresholds.confidence) {
        warnings.push({
          type: 'warning',
          field: 'automation.thresholds',
          message: 'auto_execute threshold is lower than confidence threshold',
          suggestion: 'auto_execute should typically be higher than confidence for safety'
        });
      }

      if (thresholds.require_approval > thresholds.confidence) {
        warnings.push({
          type: 'warning',
          field: 'automation.thresholds',
          message: 'require_approval threshold is higher than confidence threshold',
          suggestion: 'require_approval should typically be lower than confidence'
        });
      }
    }

    // Validate preferences
    if (automation.preferences) {
      const prefs = automation.preferences;

      // Validate commit style
      if (prefs.commit_style) {
        const validStyles = ['conventional', 'descriptive', 'custom'];
        if (!validStyles.includes(prefs.commit_style)) {
          errors.push({
            type: 'error',
            field: 'automation.preferences.commit_style',
            message: `Invalid commit style: "${prefs.commit_style}"`,
            suggestion: `Valid styles are: ${validStyles.join(', ')}`
          });
        }
      }

      // Validate commit frequency
      if (prefs.commit_frequency) {
        const validFrequencies = ['aggressive', 'moderate', 'conservative'];
        if (!validFrequencies.includes(prefs.commit_frequency)) {
          errors.push({
            type: 'error',
            field: 'automation.preferences.commit_frequency',
            message: `Invalid commit frequency: "${prefs.commit_frequency}"`,
            suggestion: `Valid frequencies are: ${validFrequencies.join(', ')}`
          });
        }
      }

      // Validate working hours
      if (prefs.working_hours) {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(prefs.working_hours.start)) {
          errors.push({
            type: 'error',
            field: 'automation.preferences.working_hours.start',
            message: `Invalid time format: "${prefs.working_hours.start}"`,
            suggestion: 'Use 24-hour format like "09:00"'
          });
        }
        if (!timeRegex.test(prefs.working_hours.end)) {
          errors.push({
            type: 'error',
            field: 'automation.preferences.working_hours.end',
            message: `Invalid time format: "${prefs.working_hours.end}"`,
            suggestion: 'Use 24-hour format like "18:00"'
          });
        }
      }

      // Validate risk tolerance
      if (prefs.risk_tolerance) {
        const validLevels = ['low', 'medium', 'high'];
        if (!validLevels.includes(prefs.risk_tolerance)) {
          errors.push({
            type: 'error',
            field: 'automation.preferences.risk_tolerance',
            message: `Invalid risk tolerance: "${prefs.risk_tolerance}"`,
            suggestion: `Valid levels are: ${validLevels.join(', ')}`
          });
        }
      }
    }

    // Validate safety settings
    if (automation.safety) {
      const safety = automation.safety;

      // Validate max actions per hour
      if (safety.max_actions_per_hour !== undefined && safety.max_actions_per_hour < 0) {
        errors.push({
          type: 'error',
          field: 'automation.safety.max_actions_per_hour',
          message: 'max_actions_per_hour must be non-negative',
          suggestion: 'Set to 0 to disable rate limiting or a positive number to limit actions'
        });
      }

      // Warn if safety is too permissive in autonomous mode
      if (automation.enabled && automation.mode === 'autonomous') {
        if (!safety.require_tests_pass) {
          warnings.push({
            type: 'warning',
            field: 'automation.safety.require_tests_pass',
            message: 'Tests are not required to pass in autonomous mode',
            suggestion: 'Consider setting require_tests_pass to true for safer automation'
          });
        }

        if (safety.max_actions_per_hour > 50) {
          warnings.push({
            type: 'warning',
            field: 'automation.safety.max_actions_per_hour',
            message: `High action limit (${safety.max_actions_per_hour}) in autonomous mode`,
            suggestion: 'Consider lowering the limit to prevent runaway automation'
          });
        }
      }
    }

    // Validate learning settings
    if (automation.learning) {
      const learning = automation.learning;

      // Warn if learning is disabled but mode is learning
      if (!learning.enabled && automation.mode === 'learning') {
        warnings.push({
          type: 'warning',
          field: 'automation.learning',
          message: 'Learning is disabled but mode is set to "learning"',
          suggestion: 'Enable learning to allow the system to observe and learn patterns'
        });
      }

      // Warn if feedback storage is disabled but adaptation is enabled
      if (!learning.store_feedback && (learning.adapt_to_patterns || learning.preference_learning)) {
        warnings.push({
          type: 'warning',
          field: 'automation.learning.store_feedback',
          message: 'Feedback storage is disabled but adaptation is enabled',
          suggestion: 'Enable store_feedback to allow pattern adaptation and preference learning'
        });
      }
    }
  }
}