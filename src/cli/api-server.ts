#!/usr/bin/env node

import { Command } from 'commander';
import { APIServer } from '../api/server.js';
import { DevelopmentTools } from '../development-tools.js';
import { ConfigManager } from '../config.js';
import chalk from 'chalk';
import { config } from 'dotenv';

config();

const program = new Command();

program
  .name('claude-code-api')
  .description('Real-time API server for Claude Code GitHub')
  .version('2.0.0')
  .option('-p, --port <port>', 'Server port', process.env.API_PORT || '3000')
  .option('-h, --host <host>', 'Server host', process.env.API_HOST || '0.0.0.0')
  .option('--auth', 'Enable authentication', false)
  .option('--websocket', 'Enable WebSocket support', true)
  .option('--webhooks', 'Enable webhook support', true)
  .parse(process.argv);

const options = program.opts();

async function startServer() {
  console.log(chalk.blue.bold('🚀 Claude Code GitHub API Server'));
  console.log(chalk.gray('─'.repeat(50)));

  try {
    const configManager = new ConfigManager();
    
    const devTools = new DevelopmentTools();
    await devTools.initialize();

    const apiConfig = {
      enabled: true,
      port: parseInt(options.port),
      host: options.host,
      cors: {
        enabled: true,
        origins: ['*']
      },
      auth: {
        enabled: options.auth,
        type: 'bearer' as const,
        tokens: []
      },
      rateLimit: {
        enabled: true,
        window: 15 * 60, // 15 minutes in seconds
        max_requests: 100
      },
      logging: {
        enabled: true,
        level: 'info' as const
      },
      websocket: options.websocket ? {
        enabled: true,
        namespace: '/socket.io',
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        }
      } : undefined,
      webhooks: options.webhooks ? {
        enabled: true,
        maxRetries: 3,
        timeout: 5000
      } : undefined
    };

    const server = new APIServer(apiConfig, devTools);
    
    // Set up monitoring listeners
    devTools.setupMonitoringListeners({
      onSuggestion: async (suggestion) => {
        await server.emitSuggestion(suggestion);
      },
      onMilestone: async (milestone) => {
        await server.emitEvent({
          type: 'milestone.reached',
          data: milestone
        });
      }
    });

    await server.start();

    console.log(chalk.green('✅ API Server started successfully'));
    console.log(chalk.cyan(`📡 API endpoint: http://${options.host}:${options.port}/api/v1`));
    
    if (options.websocket) {
      console.log(chalk.cyan(`🔌 WebSocket endpoint: ws://${options.host}:${options.port}/socket.io`));
    }
    
    if (options.webhooks) {
      console.log(chalk.cyan(`🪝 Webhooks enabled at: /api/v1/webhooks`));
    }

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n👋 Shutting down API server...'));
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error(chalk.red('❌ Failed to start API server:'), error);
    process.exit(1);
  }
}

startServer();