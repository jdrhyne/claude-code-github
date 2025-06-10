#!/usr/bin/env node

import { McpServer } from './mcp-server.js';
import { DevelopmentTools } from './development-tools.js';
import { McpTool } from './types.js';

async function main() {
  const server = new McpServer();
  const devTools = new DevelopmentTools();

  try {
    await devTools.initialize();
  } catch (error) {
    console.error(`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
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
    description: 'Create a commit with current changes',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The commit message'
        }
      },
      required: ['message']
    }
  };

  server.registerTool(statusTool, async () => {
    return await devTools.getStatus();
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

  process.on('SIGINT', () => {
    devTools.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    devTools.close();
    process.exit(0);
  });

  server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});