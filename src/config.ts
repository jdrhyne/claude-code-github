import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { Config } from './types.js';
import { ConfigValidator } from './validation.js';
import { ProjectDiscovery } from './project-discovery.js';
// import { WorkspaceMonitor } from './workspace-monitor.js';
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
    const projects = process.env.NODE_ENV === 'test' 
      ? [{
          path: path.join(os.tmpdir(), 'claude-code-github-test', 'test-project'),
          github_repo: 'test-user/test-repo',
          reviewers: ['reviewer1', 'reviewer2']
        }]
      : [];

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
      suggestions: {
        enabled: true,
        protected_branch_warnings: true,
        time_reminders: {
          enabled: true,
          warning_threshold_minutes: 120,
          reminder_threshold_minutes: 60
        },
        large_changeset: {
          enabled: true,
          threshold: 5
        },
        pattern_recognition: true,
        pr_suggestions: true,
        change_pattern_suggestions: true,
        branch_suggestions: true
      },
      monitoring: {
        enabled: true,
        conversation_tracking: true,
        auto_suggestions: true,
        commit_threshold: 5,
        release_threshold: {
          features: 3,
          bugfixes: 10
        },
        notification_style: 'inline',
        learning_mode: false
      },
      project_discovery: {
        enabled: false,
        scan_paths: [],
        exclude_patterns: [
          '*/node_modules/*',
          '*/archived/*',
          '*/.Trash/*'
        ],
        auto_detect_github_repo: true,
        max_depth: 3
      },
      workspace_monitoring: {
        enabled: false,
        workspaces: []
      },
      api_server: {
        enabled: false,
        type: 'http',
        port: 3000,
        host: '127.0.0.1',
        auth: {
          enabled: true,
          type: 'bearer',
          tokens: []
        },
        cors: {
          enabled: true,
          origins: ['http://localhost:*']
        },
        rateLimit: {
          enabled: true,
          window: 60,
          max_requests: 100,
          by: 'token'
        },
        logging: {
          enabled: true,
          level: 'info'
        }
      },
      websocket: {
        enabled: false,
        namespace: '/suggestions'
      },
      webhooks: {
        enabled: false,
        endpoints: []
      },
      automation: {
        enabled: false,
        mode: 'off',
        llm: {
          provider: 'anthropic',
          model: 'claude-3-sonnet-20240229',
          temperature: 0.3,
          api_key_env: 'ANTHROPIC_API_KEY'
        },
        thresholds: {
          confidence: 0.8,
          auto_execute: 0.95,
          require_approval: 0.6
        },
        preferences: {
          commit_style: 'conventional',
          commit_frequency: 'moderate',
          working_hours: {
            start: '09:00',
            end: '18:00',
            timezone: 'America/New_York'
          },
          risk_tolerance: 'medium'
        },
        safety: {
          max_actions_per_hour: 10,
          protected_files: ['**/*.env', '**/secrets/*', '**/.env.*'],
          require_tests_pass: true,
          pause_on_errors: true,
          emergency_stop: false
        },
        learning: {
          enabled: true,
          store_feedback: true,
          adapt_to_patterns: true,
          preference_learning: true
        }
      },
      projects
    };
  }

  private writeDefaultConfig() {
    const defaultConfig = this.createDefaultConfig();
    yaml.dump(defaultConfig, {
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

# Intelligent suggestion system configuration
suggestions:
  enabled: true                 # Master switch for all suggestions
  
  # Warn when working directly on protected branches
  protected_branch_warnings: true
  
  # Time-based reminders for uncommitted work
  time_reminders:
    enabled: true
    warning_threshold_minutes: 120    # High priority warning after 2 hours
    reminder_threshold_minutes: 60    # Medium priority reminder after 1 hour
  
  # Large changeset suggestions
  large_changeset:
    enabled: true
    threshold: 5                # Suggest commit when this many files are changed
  
  # Pattern recognition for optimal workflows
  pattern_recognition: true     # Recognize tests + implementation patterns
  pr_suggestions: true          # Suggest PR creation when branches are ready
  change_pattern_suggestions: true  # Suggestions for doc + code patterns
  branch_suggestions: true      # Suggest feature branches for new work

# Advanced monitoring system configuration
monitoring:
  enabled: true                 # Master switch for monitoring system
  conversation_tracking: true   # Track conversation for development insights
  auto_suggestions: true        # Automatically suggest based on activity
  commit_threshold: 5           # Suggest commit after this many changes
  release_threshold:
    features: 3                 # Suggest release after this many features
    bugfixes: 10                # Or this many bug fixes
  notification_style: inline    # inline, summary, or none
  learning_mode: false          # Learn from your development patterns

# Automatic project discovery configuration
project_discovery:
  enabled: false                # Enable automatic discovery of Git repositories
  scan_paths: []                # List of directories to scan for Git repositories
    # Example:
    # - "/Users/steve/Projects"
    # - "/Users/steve/Work"
  exclude_patterns:             # Patterns to exclude from scanning
    - "*/node_modules/*"
    - "*/archived/*"
    - "*/.Trash/*"
  auto_detect_github_repo: true # Automatically detect GitHub repository from git remote
  max_depth: 3                  # Maximum directory depth to scan

# LLM-based automation configuration
automation:
  enabled: false                # Master switch for automation features
  mode: off                     # off, learning, assisted, or autonomous
  
  # LLM provider configuration
  llm:
    provider: anthropic         # anthropic, openai, or local
    model: claude-3-sonnet-20240229
    temperature: 0.3            # Lower = more consistent, higher = more creative
    api_key_env: ANTHROPIC_API_KEY  # Environment variable for API key
  
  # Decision thresholds
  thresholds:
    confidence: 0.8             # Minimum confidence for suggestions
    auto_execute: 0.95          # Confidence required for autonomous execution
    require_approval: 0.6       # Below this always requires approval
  
  # User preferences for automation
  preferences:
    commit_style: conventional  # conventional, descriptive, or custom
    commit_frequency: moderate  # aggressive, moderate, or conservative
    working_hours:
      start: "09:00"
      end: "18:00"
      timezone: "America/New_York"
    risk_tolerance: medium      # low, medium, or high
  
  # Safety settings
  safety:
    max_actions_per_hour: 10
    protected_files:            # Files that require manual approval
      - "**/*.env"
      - "**/secrets/*"
      - "**/.env.*"
    require_tests_pass: true
    pause_on_errors: true
    emergency_stop: false       # Set to true to disable all automation
  
  # Learning system configuration
  learning:
    enabled: true               # Learn from user behavior
    store_feedback: true        # Store decision feedback
    adapt_to_patterns: true     # Adapt to user patterns
    preference_learning: true   # Learn user preferences

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
  #   # Project-specific suggestion overrides
  #   suggestions:
  #     enabled: false           # Disable all suggestions for this project
  #     time_reminders:
  #       enabled: false         # Disable time reminders for this project
  #     large_changeset:
  #       threshold: 10          # Higher threshold for this project
`;

    fs.writeFileSync(this.configPath, configWithComments, 'utf8');
  }

  private async discoverProjects(config: Config): Promise<Config> {
    if (!config.project_discovery?.enabled) {
      return config;
    }

    try {
      const discovery = new ProjectDiscovery(config.project_discovery);
      const discoveredProjects = await discovery.discoverProjects();
      
      if (discoveredProjects.length > 0) {
        // Merge discovered projects with existing ones
        const mergedProjects = discovery.mergeWithExistingProjects(config.projects);
        
        if (process.env.MCP_MODE !== 'true' && mergedProjects.length > config.projects.length) {
          const newCount = mergedProjects.length - config.projects.length;
          console.error(chalk.cyan(`\n✨ Discovered ${newCount} new project(s) via automatic discovery`));
        }
        
        return {
          ...config,
          projects: mergedProjects
        };
      }
    } catch (error) {
      if (process.env.MCP_MODE !== 'true') {
        console.error(chalk.yellow(`\n⚠️  Error during project discovery: ${error instanceof Error ? error.message : String(error)}`));
      }
    }

    return config;
  }

  private resolveEnvironmentVariables(config: Config): Config {
    // Resolve API key from environment if specified
    if (config.automation?.llm?.api_key_env) {
      const apiKey = process.env[config.automation.llm.api_key_env];
      if (!apiKey && config.automation.enabled) {
        if (process.env.MCP_MODE !== 'true') {
          console.error(chalk.yellow(`\n⚠️  Environment variable ${config.automation.llm.api_key_env} not set`));
          console.error(chalk.gray('Automation features will not work without an API key.'));
        }
      }
    }
    
    return config;
  }

  async saveConfig(config: Config): Promise<void> {
    // Validate the config before saving
    const validationResult = await this.validator.validateConfig(config);
    if (!validationResult.valid) {
      throw new Error(`Invalid configuration: ${validationResult.errors[0].message}`);
    }
    
    // Convert to YAML
    const yamlContent = yaml.dump(config, {
      indent: 2,
      quotingType: '"',
      forceQuotes: false,
      lineWidth: -1
    });
    
    // Write to file
    fs.writeFileSync(this.configPath, yamlContent, 'utf8');
    
    // Update cached config
    this.config = config;
  }

  async loadConfig(): Promise<Config> {
    if (this.config) {
      return this.config;
    }

    if (!fs.existsSync(this.configPath)) {
      // Only show messages if not in MCP mode
      if (process.env.MCP_MODE !== 'true') {
        console.error(chalk.yellow(`\n⚠️  Configuration file not found at ${this.configPath}`));
        console.error(chalk.gray('Creating default configuration file...'));
      }
      this.writeDefaultConfig();
      if (process.env.MCP_MODE !== 'true') {
        console.error(chalk.cyan(`\n✨ Created default configuration at ${this.configPath}`));
        console.error(chalk.gray('Please edit this file to configure your projects.'));
        console.error(chalk.gray('\nTip: Run with --setup flag for an interactive setup wizard.'));
      }
      
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
        if (process.env.MCP_MODE !== 'true') {
          console.error(chalk.gray('Validating configuration...'));
        }
        const validationResult = await this.validator.validateConfig(this.config);
        
        if (!validationResult.valid) {
          if (process.env.MCP_MODE !== 'true') {
            console.error(this.validator.formatValidationResults(validationResult));
            console.error(chalk.red('\n❌ Configuration validation failed!'));
            console.error(chalk.gray(`Please fix the errors in ${this.configPath}`));
          }
          process.exit(1);
        }
        
        if (validationResult.warnings.length > 0 && process.env.MCP_MODE !== 'true') {
          console.error(this.validator.formatValidationResults(validationResult));
        }
        
        // Validate GitHub token
        const tokenResult = await this.validator.validateGitHubToken();
        if (!tokenResult.valid && process.env.MCP_MODE !== 'true') {
          console.error(this.validator.formatValidationResults(tokenResult));
          console.error(chalk.yellow('\n⚠️  GitHub authentication required'));
          console.error(chalk.gray('You will be prompted for a token when needed.'));
        }
        
        // Run project discovery after validation
        this.config = await this.discoverProjects(this.config);
      }
      
      // Resolve environment variables
      this.config = this.resolveEnvironmentVariables(this.config);
      
      return this.config;
    } catch (error) {
      if (process.env.MCP_MODE !== 'true') {
        if (error instanceof yaml.YAMLException) {
          console.error(chalk.red(`\n❌ Invalid YAML in configuration file:`));
          console.error(chalk.gray(error.message));
          console.error(chalk.gray(`\nPlease check the syntax in ${this.configPath}`));
        } else {
          console.error(chalk.red(`\n❌ Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`));
        }
      }
      process.exit(1);
    }
  }

  // Keep simple validation for backward compatibility
  private validateConfig(_config: Config) {
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

  async getProjects() {
    const config = await this.loadConfig();
    return config.projects;
  }
}