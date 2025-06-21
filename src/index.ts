#!/usr/bin/env node

import { EnhancedMcpServer } from './enhanced-mcp-server.js';
import { DevelopmentTools } from './development-tools.js';
import { McpTool } from './types.js';
import { formatError } from './errors.js';
import { SetupWizard } from './setup-wizard.js';
import { StatusDisplay } from './status-display.js';
import { ProcessManager } from './process-manager.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MonitoringSuggestion, AggregatedMilestone } from './monitoring/types.js';
import { FeedbackTools } from './tools/feedback-tools.js';
import { AutomationTools } from './tools/automation-tools.js';

// Read version from package.json at build/compile time
let version = '1.1.1'; // fallback
try {
  const packagePath = join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  version = packageJson.version;
} catch {
  // Use fallback version if package.json not found
}

async function main() {
  // Check for CLI flags
  const args = process.argv.slice(2);
  
  // Detect MCP mode (no CLI args = MCP mode)
  const isMcpMode = args.length === 0;
  
  // Set global flag for MCP mode to suppress console output
  if (isMcpMode) {
    process.env.MCP_MODE = 'true';
  }
  
  if (args.includes('--version') || args.includes('-v')) {
    console.log(version);
    process.exit(0);
  }
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
claude-code-github v${version}
An intelligent MCP server for Claude Code that monitors development patterns

Usage:
  npx @jdrhyne/claude-code-github [options]

Options:
  -h, --help     Show this help message
  -v, --version  Show version number
  -s, --setup    Run interactive setup wizard
  -k, --api-keys Manage API keys for LLM providers

MCP Server Mode:
  When run without arguments, starts as an MCP server for Claude Code.
  Configure in your Claude Code settings with:
  
  claude mcp add claude-code-github npx -- -y @jdrhyne/claude-code-github@latest

Documentation:
  https://github.com/jdrhyne/claude-code-github
`);
    process.exit(0);
  }
  
  if (args.includes('--setup') || args.includes('-s')) {
    const wizard = new SetupWizard();
    await wizard.run();
    process.exit(0);
  }
  
  if (args.includes('--api-keys') || args.includes('-k')) {
    const { APIKeyManager } = await import('./cli/api-key-manager.js');
    await APIKeyManager.setupAPIKeys();
    process.exit(0);
  }

  const server = new EnhancedMcpServer();
  const devTools = new DevelopmentTools();
  const processManager = new ProcessManager();
  const feedbackTools = new FeedbackTools();

  try {
    // Initialize development tools and get config
    const config = await devTools.initialize();
    
    // Initialize automation tools
    const configManager = devTools.getConfigManager();
    const automationTools = new AutomationTools(configManager);
    
    // Initialize process management with first project
    if (config.projects.length > 0) {
      await processManager.initialize(config.projects[0].path);
    }
    
    // Set up monitoring listeners
    devTools.setupMonitoringListeners({
      onSuggestion: (suggestion) => {
        server.sendSuggestion(suggestion as MonitoringSuggestion);
      },
      onMilestone: (milestone) => {
        server.sendMilestone(milestone as AggregatedMilestone);
      }
    });
    
    // Set up conversation monitoring
    server.onConversationMessage((params) => {
      devTools.processConversationMessage(params.message, params.role as 'user' | 'assistant');
    });
    
    // Initialize feedback tools if automation and learning are enabled
    const eventAggregator = devTools.getEventAggregator();
    if (eventAggregator && config.automation?.enabled && config.automation?.learning?.enabled) {
      const feedbackHandlers = eventAggregator.getFeedbackHandlers();
      if (feedbackHandlers) {
        feedbackTools.setFeedbackHandlers(feedbackHandlers);
      }
    }
    
    // Set event aggregator on automation tools
    if (eventAggregator) {
      automationTools.setEventAggregator(eventAggregator);
    }
    
    // Register automation tools
    if (automationTools && automationTools.getTools) {
      const tools = automationTools.getTools();
      for (const tool of tools) {
        server.registerTool(tool, async (params) => {
          return await automationTools.handleToolCall(tool.name, params);
        });
      }
    }
    
    // Register cleanup handlers
    processManager.onCleanup(async () => {
      await devTools.close();
      server.shutdown();
    });
  } catch (error) {
    console.error(formatError(error instanceof Error ? error : new Error(String(error))));
    process.exit(1);
  }

  const statusTool: McpTool = {
    name: 'dev_status',
    description: 'Get the current development status of the active project',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  };

  const enhancedStatusTool: McpTool = {
    name: 'dev_status_enhanced',
    description: 'Get comprehensive project status including PRs, issues, CI/CD status, and more',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  };

  const createBranchTool: McpTool = {
    name: 'dev_create_branch',
    description: 'Create a new branch with appropriate prefix and commit current changes',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the branch (without prefix)'
        },
        type: {
          type: 'string',
          enum: ['feature', 'bugfix', 'refactor'],
          description: 'The type of branch to create'
        },
        message: {
          type: 'string',
          description: 'The commit message for the initial commit'
        }
      },
      required: ['name', 'type', 'message']
    }
  };

  const createPullRequestTool: McpTool = {
    name: 'dev_create_pull_request',
    description: 'Push current branch and create a pull request on GitHub',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The title of the pull request'
        },
        body: {
          type: 'string',
          description: 'The body/description of the pull request'
        },
        is_draft: {
          type: 'boolean',
          description: 'Whether to create as a draft pull request',
          default: true
        }
      },
      required: ['title', 'body']
    }
  };

  const checkpointTool: McpTool = {
    name: 'dev_checkpoint',
    description: 'Create a commit with current changes and optionally push to remote',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The commit message'
        },
        push: {
          type: 'boolean',
          description: 'Whether to push to remote after committing (overrides auto-push config)',
          default: undefined
        }
      },
      required: ['message']
    }
  };

  const quickActionTool: McpTool = {
    name: 'dev_quick',
    description: 'Perform common workflow actions quickly: wip (save work), fix (amend), done (finalize PR), sync (pull latest), update (update deps)',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['wip', 'fix', 'done', 'sync', 'update'],
          description: 'The quick action to perform'
        }
      },
      required: ['action']
    }
  };

  // Enhanced PR Management Tools
  const updatePRTool: McpTool = {
    name: 'dev_pr_update',
    description: 'Update an existing pull request (title, body, reviewers, labels, draft status)',
    inputSchema: {
      type: 'object',
      properties: {
        pr_number: {
          type: 'number',
          description: 'The pull request number to update'
        },
        title: {
          type: 'string',
          description: 'New title for the pull request'
        },
        body: {
          type: 'string',
          description: 'New body/description for the pull request'
        },
        draft: {
          type: 'boolean',
          description: 'Whether the PR should be a draft'
        },
        reviewers: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of GitHub usernames to request reviews from'
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of labels to apply to the PR'
        }
      },
      required: ['pr_number']
    }
  };

  const getPRStatusTool: McpTool = {
    name: 'dev_pr_status',
    description: 'Get detailed status of a pull request including reviews, checks, and mergeable state',
    inputSchema: {
      type: 'object',
      properties: {
        pr_number: {
          type: 'number',
          description: 'The pull request number'
        }
      },
      required: ['pr_number']
    }
  };

  const generatePRDescriptionTool: McpTool = {
    name: 'dev_pr_generate_description',
    description: 'Generate a pull request description based on commits',
    inputSchema: {
      type: 'object',
      properties: {
        template: {
          type: 'string',
          description: 'Optional template to use for the description'
        }
      },
      required: []
    }
  };

  // Issue Integration Tools
  const createBranchFromIssueTool: McpTool = {
    name: 'dev_issue_branch',
    description: 'Create a new branch from a GitHub issue',
    inputSchema: {
      type: 'object',
      properties: {
        issue_number: {
          type: 'number',
          description: 'The issue number to create a branch from'
        },
        branch_type: {
          type: 'string',
          enum: ['feature', 'bugfix', 'refactor'],
          description: 'The type of branch to create',
          default: 'feature'
        }
      },
      required: ['issue_number']
    }
  };

  const listIssuesTool: McpTool = {
    name: 'dev_issue_list',
    description: 'List GitHub issues with filtering options',
    inputSchema: {
      type: 'object',
      properties: {
        state: {
          type: 'string',
          enum: ['open', 'closed', 'all'],
          description: 'Filter by issue state',
          default: 'open'
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by labels'
        },
        assignee: {
          type: 'string',
          description: 'Filter by assignee username'
        },
        milestone: {
          type: 'string',
          description: 'Filter by milestone'
        },
        sort: {
          type: 'string',
          enum: ['created', 'updated', 'comments'],
          description: 'Sort order',
          default: 'created'
        },
        direction: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort direction',
          default: 'desc'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of issues to return',
          default: 30
        }
      },
      required: []
    }
  };

  const updateIssueTool: McpTool = {
    name: 'dev_issue_update',
    description: 'Update a GitHub issue (comment, state, labels)',
    inputSchema: {
      type: 'object',
      properties: {
        issue_number: {
          type: 'number',
          description: 'The issue number to update'
        },
        comment: {
          type: 'string',
          description: 'Comment to add to the issue'
        },
        state: {
          type: 'string',
          enum: ['open', 'closed'],
          description: 'New state for the issue'
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels to set on the issue'
        }
      },
      required: ['issue_number']
    }
  };

  // Release Management Tools
  const versionBumpTool: McpTool = {
    name: 'dev_version_bump',
    description: 'Bump the project version (major, minor, patch)',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['major', 'minor', 'patch', 'custom'],
          description: 'Type of version bump'
        },
        custom_version: {
          type: 'string',
          description: 'Custom version string (only used when type is "custom")'
        },
        update_files: {
          type: 'boolean',
          description: 'Whether to stage the updated files',
          default: true
        }
      },
      required: ['type']
    }
  };

  const generateChangelogTool: McpTool = {
    name: 'dev_changelog',
    description: 'Generate a changelog based on commits',
    inputSchema: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: 'Starting Git ref (tag, commit, branch)'
        },
        to: {
          type: 'string',
          description: 'Ending Git ref (tag, commit, branch)',
          default: 'HEAD'
        },
        format: {
          type: 'string',
          enum: ['markdown', 'json', 'conventional'],
          description: 'Output format',
          default: 'markdown'
        }
      },
      required: []
    }
  };

  const createReleaseTool: McpTool = {
    name: 'dev_release',
    description: 'Create a GitHub release with automatic changelog generation',
    inputSchema: {
      type: 'object',
      properties: {
        tag_name: {
          type: 'string',
          description: 'The name of the tag (e.g., v1.2.3)'
        },
        name: {
          type: 'string',
          description: 'The name of the release'
        },
        body: {
          type: 'string',
          description: 'The release notes (auto-generated if not provided)'
        },
        draft: {
          type: 'boolean',
          description: 'Whether to create as a draft release',
          default: false
        },
        prerelease: {
          type: 'boolean',
          description: 'Whether this is a pre-release',
          default: false
        },
        generate_release_notes: {
          type: 'boolean',
          description: 'Whether to auto-generate release notes',
          default: true
        }
      },
      required: ['tag_name']
    }
  };

  const getLatestReleaseTool: McpTool = {
    name: 'dev_release_latest',
    description: 'Get information about the latest release',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  };

  const listReleasesTool: McpTool = {
    name: 'dev_release_list',
    description: 'List recent releases',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of releases to return',
          default: 10
        }
      },
      required: []
    }
  };

  const monitoringStatusTool: McpTool = {
    name: 'dev_monitoring_status',
    description: 'Get the current monitoring system status and recent events',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  };

  server.registerTool(statusTool, async () => {
    return await devTools.getStatus();
  });

  server.registerTool(enhancedStatusTool, async () => {
    const status = await devTools.getEnhancedStatus();
    return StatusDisplay.showEnhancedStatus(status);
  });

  server.registerTool(createBranchTool, async (params) => {
    return await devTools.createBranch(params);
  });

  server.registerTool(createPullRequestTool, async (params) => {
    const result = await devTools.createPullRequest(params);
    return {
      result,
      confirmation_required: true
    };
  });

  server.registerTool(checkpointTool, async (params) => {
    return await devTools.checkpoint(params);
  });

  server.registerTool(quickActionTool, async (params) => {
    return await devTools.quickAction(params.action);
  });

  // Register Enhanced PR Management Tools
  server.registerTool(updatePRTool, async (params) => {
    await devTools.updatePullRequest(params);
    return { success: true, message: `Pull request #${params.pr_number} updated` };
  });

  server.registerTool(getPRStatusTool, async (params) => {
    return await devTools.getPullRequestStatus(params.pr_number);
  });

  server.registerTool(generatePRDescriptionTool, async (params) => {
    return await devTools.generatePRDescription(params);
  });

  // Register Issue Integration Tools
  server.registerTool(createBranchFromIssueTool, async (params) => {
    return await devTools.createBranchFromIssue(params);
  });

  server.registerTool(listIssuesTool, async (params) => {
    return await devTools.listIssues(params);
  });

  server.registerTool(updateIssueTool, async (params) => {
    await devTools.updateIssue(params);
    return { success: true, message: `Issue #${params.issue_number} updated` };
  });

  // Register Release Management Tools
  server.registerTool(versionBumpTool, async (params) => {
    return await devTools.versionBump(params);
  });

  server.registerTool(generateChangelogTool, async (params) => {
    const changelog = await devTools.generateChangelog(params);
    if (params.format === 'json') {
      return changelog;
    }
    // Convert to markdown by default
    return devTools['formatChangelogAsMarkdown'](changelog);
  });

  server.registerTool(createReleaseTool, async (params) => {
    return await devTools.createRelease(params);
  });

  server.registerTool(getLatestReleaseTool, async () => {
    return await devTools.getLatestRelease();
  });

  server.registerTool(listReleasesTool, async (params) => {
    return await devTools.listReleases(params.limit);
  });

  server.registerTool(monitoringStatusTool, async () => {
    return await devTools.getMonitoringStatus();
  });

  // Register feedback tools if they are initialized
  if (feedbackTools && feedbackTools.getTools) {
    const tools = feedbackTools.getTools();
    for (const tool of tools) {
      server.registerTool(tool, async (params) => {
        return await feedbackTools.handleToolCall(tool.name, params);
      });
    }
  }


  // Process management handles all cleanup now

  server.start();
}

main().catch((error) => {
  console.error(formatError(error instanceof Error ? error : new Error(String(error))));
  process.exit(1);
});