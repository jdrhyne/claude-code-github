import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import { Config, ProjectConfig } from './types.js';
import { GitManager } from './git.js';
import { GitHubManager } from './github.js';
import { ConfigValidator } from './validation.js';

interface SetupOptions {
  configPath?: string;
  skipGitHubAuth?: boolean;
}

export class SetupWizard {
  private rl: readline.Interface;
  private gitManager: GitManager;
  private githubManager: GitHubManager;
  private validator: ConfigValidator;
  private configPath: string;

  constructor(options: SetupOptions = {}) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.gitManager = new GitManager();
    this.githubManager = new GitHubManager();
    this.validator = new ConfigValidator();
    
    const configDir = path.join(os.homedir(), '.config', 'claude-code-github');
    this.configPath = options.configPath || path.join(configDir, 'config.yml');
  }

  async run(): Promise<void> {
    console.log(chalk.cyan.bold('\n🚀 Welcome to Claude Code GitHub Setup Wizard\n'));
    console.log(chalk.gray('This wizard will help you configure claude-code-github for your projects.\n'));

    try {
      // Check if config already exists
      const overwrite = await this.checkExistingConfig();
      if (!overwrite) {
        return;
      }

      // Step 1: GitHub Authentication
      console.log(chalk.yellow.bold('\n📋 Step 1: GitHub Authentication\n'));
      await this.setupGitHubAuth();

      // Step 2: Git Workflow Configuration
      console.log(chalk.yellow.bold('\n📋 Step 2: Git Workflow Configuration\n'));
      const gitWorkflow = await this.setupGitWorkflow();

      // Step 3: Project Configuration
      console.log(chalk.yellow.bold('\n📋 Step 3: Project Configuration\n'));
      const projects = await this.setupProjects();

      // Create final config
      const config: Config = {
        git_workflow: gitWorkflow,
        projects
      };

      // Validate the configuration
      console.log(chalk.gray('\n🔍 Validating configuration...'));
      const validationResult = await this.validator.validateConfig(config);
      
      if (!validationResult.valid) {
        console.log(this.validator.formatValidationResults(validationResult));
        const proceed = await this.confirm('Configuration has errors. Save anyway?', false);
        if (!proceed) {
          console.log(chalk.yellow('\n⚠️  Setup cancelled.'));
          return;
        }
      } else if (validationResult.warnings.length > 0) {
        console.log(this.validator.formatValidationResults(validationResult));
      }

      // Save configuration
      await this.saveConfig(config);
      
      console.log(chalk.green.bold('\n✅ Setup complete!\n'));
      console.log(chalk.gray('Your configuration has been saved to:'));
      console.log(chalk.cyan(this.configPath));
      console.log(chalk.gray('\nYou can now use claude-code-github with Claude Code.'));
      console.log(chalk.gray('To make changes, edit the config file or run setup again.\n'));

    } finally {
      this.rl.close();
    }
  }

  private async checkExistingConfig(): Promise<boolean> {
    if (fs.existsSync(this.configPath)) {
      console.log(chalk.yellow(`⚠️  Configuration file already exists at ${this.configPath}`));
      return await this.confirm('Do you want to overwrite it?', false);
    }
    return true;
  }

  private async setupGitHubAuth(): Promise<void> {
    console.log(chalk.gray('GitHub authentication is required for creating pull requests.'));
    console.log(chalk.gray('Your token will be stored securely in your system keychain.\n'));

    const hasToken = await this.githubManager.validateToken();
    if (hasToken) {
      console.log(chalk.green('✓ GitHub token already configured and valid'));
      const reconfigure = await this.confirm('Do you want to reconfigure it?', false);
      if (!reconfigure) {
        return;
      }
    }

    console.log(chalk.gray('Please create a personal access token with these scopes:'));
    console.log(chalk.cyan('  • repo') + chalk.gray(' (Full control of private repositories)'));
    console.log(chalk.cyan('  • workflow') + chalk.gray(' (Update GitHub Action workflows)'));
    console.log('');
    console.log(chalk.gray('Create your token at:'));
    console.log(chalk.cyan('https://github.com/settings/tokens/new\n'));

    const token = await this.prompt('Enter your GitHub token:', { password: true });
    
    // Validate the token
    console.log(chalk.gray('Validating token...'));
    const isValid = await this.validateGitHubToken(token);
    
    if (!isValid) {
      console.log(chalk.red('✗ Invalid token'));
      const retry = await this.confirm('Try again?', true);
      if (retry) {
        return this.setupGitHubAuth();
      }
    } else {
      console.log(chalk.green('✓ Token validated successfully'));
    }
  }

  private async setupGitWorkflow() {
    console.log(chalk.gray('Configure your Git workflow preferences.\n'));

    const mainBranch = await this.prompt('Main branch name:', { default: 'main' });
    
    const protectedBranches: string[] = [mainBranch];
    const addMoreProtected = await this.confirm(`Add more protected branches besides "${mainBranch}"?`, false);
    
    if (addMoreProtected) {
      let addAnother = true;
      while (addAnother) {
        const branch = await this.prompt('Protected branch name:');
        if (branch && !protectedBranches.includes(branch)) {
          protectedBranches.push(branch);
        }
        addAnother = await this.confirm('Add another protected branch?', false);
      }
    }

    console.log(chalk.gray('\nConfigure branch naming prefixes:'));
    const featurePrefix = await this.prompt('Feature branch prefix:', { default: 'feature/' });
    const bugfixPrefix = await this.prompt('Bugfix branch prefix:', { default: 'bugfix/' });
    const refactorPrefix = await this.prompt('Refactor branch prefix:', { default: 'refactor/' });

    return {
      main_branch: mainBranch,
      protected_branches: protectedBranches,
      branch_prefixes: {
        feature: this.ensureTrailingSlash(featurePrefix),
        bugfix: this.ensureTrailingSlash(bugfixPrefix),
        refactor: this.ensureTrailingSlash(refactorPrefix)
      }
    };
  }

  private async setupProjects(): Promise<ProjectConfig[]> {
    console.log(chalk.gray('Add your projects. You can add more projects later by editing the config file.\n'));

    const projects: ProjectConfig[] = [];
    let addAnother = true;

    while (addAnother) {
      const project = await this.setupSingleProject(projects.length + 1);
      if (project) {
        projects.push(project);
      }
      
      if (projects.length === 0) {
        console.log(chalk.yellow('⚠️  At least one project is required.'));
        addAnother = true;
      } else {
        addAnother = await this.confirm('Add another project?', false);
      }
    }

    return projects;
  }

  private async setupSingleProject(number: number): Promise<ProjectConfig | null> {
    console.log(chalk.cyan(`\nProject ${number}:`));

    // Get project path
    let projectPath = await this.prompt('Project path (absolute):', {
      validate: (input) => {
        if (!input) return 'Path is required';
        if (!path.isAbsolute(input)) return 'Path must be absolute';
        return true;
      }
    });

    // Expand ~ to home directory
    if (projectPath.startsWith('~/')) {
      projectPath = path.join(os.homedir(), projectPath.slice(2));
    }

    // Validate path exists and is a git repo
    if (!fs.existsSync(projectPath)) {
      console.log(chalk.red(`✗ Path does not exist: ${projectPath}`));
      const retry = await this.confirm('Try again?', true);
      return retry ? this.setupSingleProject(number) : null;
    }

    const isGitRepo = await this.gitManager.isGitRepository(projectPath);
    if (!isGitRepo) {
      console.log(chalk.red(`✗ Not a git repository: ${projectPath}`));
      console.log(chalk.gray('Initialize with "git init" or clone an existing repository'));
      const retry = await this.confirm('Try a different path?', true);
      return retry ? this.setupSingleProject(number) : null;
    }

    // Try to detect GitHub repo from remote
    let githubRepo = '';
    const remoteUrl = await this.gitManager.getRemoteUrl(projectPath);
    if (remoteUrl) {
      const parsed = this.gitManager.parseGitHubUrl(remoteUrl);
      if (parsed) {
        githubRepo = `${parsed.owner}/${parsed.repo}`;
        console.log(chalk.gray(`Detected GitHub repository: ${githubRepo}`));
      }
    }

    githubRepo = await this.prompt('GitHub repository (owner/repo):', {
      default: githubRepo,
      validate: (input) => {
        if (!input) return 'Repository is required';
        const parts = input.split('/');
        if (parts.length !== 2 || parts.some(p => !p)) {
          return 'Use format "owner/repo"';
        }
        return true;
      }
    });

    // Optional reviewers
    const reviewers: string[] = [];
    const addReviewers = await this.confirm('Add default reviewers for pull requests?', false);
    
    if (addReviewers) {
      let addAnother = true;
      while (addAnother) {
        const reviewer = await this.prompt('GitHub username:');
        if (reviewer && !reviewers.includes(reviewer)) {
          reviewers.push(reviewer);
        }
        addAnother = await this.confirm('Add another reviewer?', false);
      }
    }

    const project: ProjectConfig = {
      path: projectPath,
      github_repo: githubRepo
    };

    if (reviewers.length > 0) {
      project.reviewers = reviewers;
    }

    return project;
  }

  private async validateGitHubToken(token: string): Promise<boolean> {
    try {
      const { Octokit } = await import('octokit');
      const octokit = new Octokit({ auth: token });
      await octokit.rest.users.getAuthenticated();
      
      // Save the token
      const keytar = await import('keytar');
      await keytar.setPassword('claude-code-github', 'github-token', token);
      
      return true;
    } catch (_error) {
      return false;
    }
  }

  private async saveConfig(config: Config): Promise<void> {
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const yamlContent = this.generateConfigWithComments(config);
    fs.writeFileSync(this.configPath, yamlContent, 'utf8');
  }

  private generateConfigWithComments(config: Config): string {
    const header = `# Claude Code GitHub Configuration
# Generated by setup wizard on ${new Date().toISOString()}
# Full documentation: https://github.com/jdrhyne/claude-code-github

`;

    const yamlContent = yaml.dump(config, {
      indent: 2,
      quotingType: '"',
      forceQuotes: false,
      noRefs: true
    });

    // Add section comments
    const lines = yamlContent.split('\n');
    const annotatedLines: string[] = [];
    let inProjects = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('git_workflow:')) {
        annotatedLines.push('# Git workflow configuration');
        annotatedLines.push(line);
      } else if (line.startsWith('projects:')) {
        annotatedLines.push('');
        annotatedLines.push('# Projects to monitor');
        annotatedLines.push(line);
        inProjects = true;
      } else if (inProjects && line.startsWith('  - ')) {
        annotatedLines.push(line);
      } else {
        annotatedLines.push(line);
      }
    }

    return header + annotatedLines.join('\n');
  }

  private ensureTrailingSlash(prefix: string): string {
    return prefix.endsWith('/') ? prefix : prefix + '/';
  }

  private async prompt(question: string, options: { default?: string; password?: boolean; validate?: (input: string) => true | string } = {}): Promise<string> {
    return new Promise((resolve) => {
      const promptText = options.default 
        ? `${question} ${chalk.gray(`(${options.default})`)}: `
        : `${question}: `;

      if (options.password) {
        // For password input, we need to handle it differently
        process.stdout.write(promptText);
        
        const stdin = process.stdin;
        const oldRawMode = stdin.isRaw;
        
        stdin.setRawMode(true);
        stdin.resume();
        
        let password = '';
        
        const onData = (char: Buffer) => {
          const str = char.toString();
          
          switch (str) {
            case '\n':
            case '\r':
            case '\u0004': // Ctrl-D
              stdin.setRawMode(oldRawMode);
              stdin.pause();
              stdin.removeListener('data', onData);
              process.stdout.write('\n');
              resolve(password);
              break;
            case '\u0003': // Ctrl-C
              process.stdout.write('\n');
              process.exit(0);
              break;
            case '\u007f': // Backspace
              if (password.length > 0) {
                password = password.slice(0, -1);
                process.stdout.write('\b \b');
              }
              break;
            default:
              password += str;
              process.stdout.write('*');
              break;
          }
        };
        
        stdin.on('data', onData);
      } else {
        this.rl.question(promptText, async (answer) => {
          const value = answer.trim() || options.default || '';
          
          if (options.validate) {
            const result = options.validate(value);
            if (result !== true) {
              console.log(chalk.red(`✗ ${result}`));
              const retry = await this.prompt(question, options);
              resolve(retry);
              return;
            }
          }
          
          resolve(value);
        });
      }
    });
  }

  private async confirm(question: string, defaultValue: boolean = true): Promise<boolean> {
    const defaultText = defaultValue ? 'Y/n' : 'y/N';
    const answer = await this.prompt(`${question} ${chalk.gray(`(${defaultText})`)}`);
    
    if (!answer) {
      return defaultValue;
    }
    
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }
}