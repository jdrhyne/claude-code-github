import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { Config } from './types.js';
import { ConfigValidator } from './validation.js';
import chalk from 'chalk';

export class ConfigManager {
  private configPath: string;
  private config: Config | null = null;
  private validator: ConfigValidator;

  constructor() {
    const configDir = path.join(os.homedir(), '.config', 'claude-code-github');
    this.configPath = path.join(configDir, 'config.yml');
    this.ensureConfigDir();
    this.validator = new ConfigValidator();
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
        },
        auto_push: {
          feature_branches: true,
          main_branch: false,
          confirm_before_push: false
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
  
  # Auto-push configuration
  auto_push:
    feature_branches: true      # Automatically push feature branches after commits
    main_branch: false          # Automatically push main branch (use with caution)
    confirm_before_push: false  # Ask for confirmation before pushing

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

  async loadConfig(): Promise<Config> {
    if (this.config) {
      return this.config;
    }

    if (!fs.existsSync(this.configPath)) {
      console.error(chalk.yellow(`\n⚠️  Configuration file not found at ${this.configPath}`));
      console.error(chalk.gray('Creating default configuration file...'));
      this.writeDefaultConfig();
      console.error(chalk.cyan(`\n✨ Created default configuration at ${this.configPath}`));
      console.error(chalk.gray('Please edit this file to configure your projects.'));
      console.error(chalk.gray('\nTip: Run with --setup flag for an interactive setup wizard.'));
      
      // Don't exit during tests
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
      
      // Return default config for tests
      this.config = this.createDefaultConfig();
      return this.config;
    }

    try {
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      this.config = yaml.load(configContent) as Config;
      
      // Skip validation in test environment
      if (process.env.NODE_ENV !== 'test') {
        // Run comprehensive validation
        console.error(chalk.gray('Validating configuration...'));
        const validationResult = await this.validator.validateConfig(this.config);
        
        if (!validationResult.valid) {
          console.error(this.validator.formatValidationResults(validationResult));
          console.error(chalk.red('\n❌ Configuration validation failed!'));
          console.error(chalk.gray(`Please fix the errors in ${this.configPath}`));
          process.exit(1);
        }
        
        if (validationResult.warnings.length > 0) {
          console.error(this.validator.formatValidationResults(validationResult));
        }
        
        // Validate GitHub token
        const tokenResult = await this.validator.validateGitHubToken();
        if (!tokenResult.valid) {
          console.error(this.validator.formatValidationResults(tokenResult));
          console.error(chalk.yellow('\n⚠️  GitHub authentication required'));
          console.error(chalk.gray('You will be prompted for a token when needed.'));
        }
      }
      
      return this.config;
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        console.error(chalk.red(`\n❌ Invalid YAML in configuration file:`));
        console.error(chalk.gray(error.message));
        console.error(chalk.gray(`\nPlease check the syntax in ${this.configPath}`));
      } else {
        console.error(chalk.red(`\n❌ Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`));
      }
      process.exit(1);
    }
  }

  // Keep simple validation for backward compatibility
  private validateConfig(config: Config) {
    // Basic structural validation is now handled by ConfigValidator
    // This method is kept for backward compatibility but actual validation
    // is done by the ConfigValidator class in loadConfig()
  }

  getConfigPath(): string {
    return this.configPath;
  }

  async reloadConfig(): Promise<Config> {
    this.config = null;
    return this.loadConfig();
  }
}