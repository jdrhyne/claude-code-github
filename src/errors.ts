import chalk from 'chalk';

export class UserError extends Error {
  public suggestion?: string;
  public code?: string;

  constructor(message: string, suggestion?: string, code?: string) {
    super(message);
    this.name = 'UserError';
    this.suggestion = suggestion;
    this.code = code;
  }
}

export class ConfigurationError extends UserError {
  constructor(message: string, suggestion?: string) {
    super(message, suggestion, 'CONFIG_ERROR');
    this.name = 'ConfigurationError';
  }
}

export class GitError extends UserError {
  constructor(message: string, suggestion?: string) {
    super(message, suggestion, 'GIT_ERROR');
    this.name = 'GitError';
  }
}

export class GitHubError extends UserError {
  constructor(message: string, suggestion?: string) {
    super(message, suggestion, 'GITHUB_ERROR');
    this.name = 'GitHubError';
  }
}

export class ProjectError extends UserError {
  constructor(message: string, suggestion?: string) {
    super(message, suggestion, 'PROJECT_ERROR');
    this.name = 'ProjectError';
  }
}

export function formatError(error: Error): string {
  const output: string[] = [];

  if (error instanceof UserError) {
    output.push(chalk.red(`\n❌ ${error.name}: ${error.message}`));
    
    if (error.suggestion) {
      output.push(chalk.gray(`   → ${error.suggestion}`));
    }

    if (error.code) {
      output.push(chalk.gray(`   Error code: ${error.code}`));
    }
  } else if (error.message.includes('ENOENT')) {
    output.push(chalk.red('\n❌ File or directory not found'));
    output.push(chalk.gray('   → Check that the path exists and you have permission to access it'));
  } else if (error.message.includes('EACCES')) {
    output.push(chalk.red('\n❌ Permission denied'));
    output.push(chalk.gray('   → Check file permissions or run with appropriate privileges'));
  } else if (error.message.includes('ECONNREFUSED')) {
    output.push(chalk.red('\n❌ Connection refused'));
    output.push(chalk.gray('   → Check your internet connection and firewall settings'));
  } else if (error.message.includes('ETIMEDOUT')) {
    output.push(chalk.red('\n❌ Connection timeout'));
    output.push(chalk.gray('   → Check your internet connection and try again'));
  } else {
    output.push(chalk.red(`\n❌ Error: ${error.message}`));
  }

  return output.join('\n');
}

export function formatJsonRpcError(error: Error): { code: number; message: string; data?: any } {
  if (error instanceof UserError) {
    return {
      code: -32603, // Internal error
      message: error.message,
      data: {
        type: error.name,
        suggestion: error.suggestion,
        code: error.code
      }
    };
  }

  return {
    code: -32603,
    message: error.message
  };
}

// Helper functions for common error scenarios
export function createNoProjectError(): ProjectError {
  return new ProjectError(
    'No project configured for the current directory',
    'Add your project to the config.yml file or change to a configured project directory'
  );
}

export function createProtectedBranchError(branch: string): GitError {
  return new GitError(
    `Cannot perform this operation on protected branch: ${branch}`,
    'Switch to a feature branch or create a new one'
  );
}

export function createNoChangesError(): GitError {
  return new GitError(
    'No uncommitted changes found',
    'Make some changes to your files before trying to commit'
  );
}

export function createGitHubTokenError(): GitHubError {
  return new GitHubError(
    'GitHub authentication failed',
    'Create a new personal access token at https://github.com/settings/tokens/new with "repo" and "workflow" scopes'
  );
}

export function createInvalidBranchTypeError(type: string, validTypes: string[]): UserError {
  return new UserError(
    `Invalid branch type: ${type}`,
    `Use one of the following types: ${validTypes.join(', ')}`
  );
}

export function createGitRemoteMismatchError(expected: string, actual: string): GitError {
  return new GitError(
    `Git remote mismatch: expected "${expected}" but found "${actual}"`,
    `Update your config.yml to use "${actual}" or change the git remote to match "${expected}"`
  );
}