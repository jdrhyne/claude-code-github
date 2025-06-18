#!/usr/bin/env node

import { Command } from 'commander';
import WebSocket from 'ws';
import notifier from 'node-notifier';
import chalk from 'chalk';
import { config } from 'dotenv';

config();

const program = new Command();

interface NotificationEvent {
  type: string;
  timestamp: string;
  title: string;
  message: string;
  project?: string;
  metadata?: Record<string, any>;
}

program
  .name('claude-code-notify-desktop')
  .description('Desktop notifications for Claude Code GitHub development events')
  .version('2.0.0')
  .option('-u, --url <url>', 'API server URL', process.env.API_URL || 'ws://localhost:3000')
  .option('-t, --token <token>', 'API token for authentication', process.env.API_TOKEN)
  .option('-f, --filter <events...>', 'Filter specific event types', [])
  .option('-p, --project <path>', 'Only show notifications for specific project')
  .option('-i, --icon <path>', 'Path to notification icon')
  .option('-s, --sound <name>', 'Notification sound (system default if not specified)')
  .option('-g, --group', 'Group notifications by project')
  .option('-v, --verbose', 'Show verbose output')
  .parse(process.argv);

const options = program.opts();

function showDesktopNotification(event: NotificationEvent) {
  const notificationOptions: any = {
    title: event.title,
    message: event.message,
    time: new Date(event.timestamp).getTime(),
    wait: false,
  };

  if (options.icon) {
    notificationOptions.icon = options.icon;
  }

  if (options.sound) {
    notificationOptions.sound = options.sound;
  }

  if (options.group && event.project) {
    notificationOptions.group = event.project;
  }

  notifier.notify(notificationOptions, (err, response) => {
    if (err && options.verbose) {
      console.error(chalk.red(`❌ Notification error: ${err.message}`));
    }
  });
}

function connectToServer() {
  const wsUrl = options.url.replace('http://', 'ws://').replace('https://', 'wss://');
  const ws = new WebSocket(wsUrl, {
    headers: options.token ? { Authorization: `Bearer ${options.token}` } : {}
  });

  ws.on('open', () => {
    console.log(chalk.green('✅ Connected to Claude Code GitHub API'));
    console.log(chalk.cyan('📱 Desktop notifications enabled'));
    
    if (options.filter.length > 0) {
      console.log(chalk.yellow(`🔍 Filtering events: ${options.filter.join(', ')}`));
    }
    
    if (options.project) {
      console.log(chalk.yellow(`📁 Watching project: ${options.project}`));
    }

    const subscribeMessage = {
      type: 'subscribe',
      filter: options.filter,
      project: options.project
    };
    ws.send(JSON.stringify(subscribeMessage));
  });

  ws.on('message', (data) => {
    try {
      const event = JSON.parse(data.toString()) as NotificationEvent;
      
      if (options.filter.length > 0 && !options.filter.includes(event.type)) {
        return;
      }
      
      if (options.project && event.project !== options.project) {
        return;
      }

      showDesktopNotification(event);

      if (options.verbose) {
        console.log(chalk.gray(`[${new Date(event.timestamp).toLocaleTimeString()}]`), 
          chalk.blue(event.type), 
          chalk.white(event.title));
      }
    } catch (error) {
      if (options.verbose) {
        console.error(chalk.red('❌ Failed to parse message:'), error);
      }
    }
  });

  ws.on('close', () => {
    console.log(chalk.yellow('⚠️  Disconnected from server. Reconnecting in 5 seconds...'));
    setTimeout(connectToServer, 5000);
  });

  ws.on('error', (error) => {
    console.error(chalk.red('❌ WebSocket error:'), error.message);
  });
}

console.log(chalk.blue.bold('🖥️  Claude Code GitHub - Desktop Notifications'));
console.log(chalk.gray('─'.repeat(50)));

connectToServer();

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Shutting down...'));
  process.exit(0);
});