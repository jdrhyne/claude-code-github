import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { Config } from './types.js';

export class ConfigManager {
  private configPath: string;
  private config: Config | null = null;

  constructor() {
    const configDir = path.join(os.homedir(), '.config', 'claude-code-github');
    this.configPath = path.join(configDir, 'config.yml');
    this.ensureConfigDir();
  }

  private ensureConfigDir() {
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  private createDefaultConfig(): Config {
    return {
      git_workflow: {
        main_branch: 'main',
        protected_branches: ['main', 'develop'],
        branch_prefixes: {
          feature: 'feature/',
          bugfix: 'bugfix/',
          refactor: 'refactor/'
        }
      },
      projects: []
    };
  }

  private writeDefaultConfig() {
    const defaultConfig = this.createDefaultConfig();
    const yamlContent = yaml.dump(defaultConfig, {
      indent: 2,
      quotingType: '"',
      forceQuotes: false
    });

    const configWithComments = `# Global settings for the claude-code-github server
# Full documentation available at https://github.com/your-org/claude-code-github

# Default Git workflow settings.
git_workflow:
  main_branch: main
  protected_branches:
    - main
    - develop
  branch_prefixes:
    feature: feature/
    bugfix: bugfix/
    refactor: refactor/

# A list of projects for the server to monitor.
# Use absolute paths.
projects: []
  # Example project configuration:
  # - path: "/Users/steve/Documents/Projects/my-awesome-app"
  #   github_repo: "your-username/my-awesome-app"
  #   # Project-specific overrides (optional)
  #   reviewers:
  #     - "github-user1"
  #     - "github-user2"
`;

    fs.writeFileSync(this.configPath, configWithComments, 'utf8');
  }

  loadConfig(): Config {
    if (this.config) {
      return this.config;
    }

    if (!fs.existsSync(this.configPath)) {
      console.error(`Configuration file not found at ${this.configPath}`);
      console.error('Creating default configuration file...');
      this.writeDefaultConfig();
      console.error(`Please edit ${this.configPath} to configure your projects.`);
      process.exit(1);
    }

    try {
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      this.config = yaml.load(configContent) as Config;
      
      this.validateConfig(this.config);
      return this.config;
    } catch (error) {
      console.error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private validateConfig(config: Config) {
    if (!config.git_workflow) {
      throw new Error('Missing git_workflow configuration');
    }

    if (!config.git_workflow.main_branch) {
      throw new Error('Missing git_workflow.main_branch');
    }

    if (!Array.isArray(config.git_workflow.protected_branches)) {
      throw new Error('git_workflow.protected_branches must be an array');
    }

    if (!config.git_workflow.branch_prefixes) {
      throw new Error('Missing git_workflow.branch_prefixes');
    }

    if (!Array.isArray(config.projects)) {
      throw new Error('projects must be an array');
    }

    for (const project of config.projects) {
      if (!project.path || !project.github_repo) {
        throw new Error('Each project must have path and github_repo');
      }

      if (!fs.existsSync(project.path)) {
        throw new Error(`Project path does not exist: ${project.path}`);
      }
    }
  }

  getConfigPath(): string {
    return this.configPath;
  }

  reloadConfig(): Config {
    this.config = null;
    return this.loadConfig();
  }
}