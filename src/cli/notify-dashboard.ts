#!/usr/bin/env node

import { Command } from 'commander';
import WebSocket from 'ws';
import blessed from 'blessed';
import { config } from 'dotenv';

config();

const program = new Command();

interface DashboardEvent {
  type: string;
  timestamp: string;
  title: string;
  message: string;
  project?: string;
  metadata?: Record<string, any>;
}

interface ProjectStats {
  commits: number;
  branches: number;
  pullRequests: number;
  lastActivity: Date;
  suggestions: number;
}

program
  .name('claude-code-dashboard')
  .description('Real-time terminal dashboard for Claude Code GitHub development')
  .version('2.0.0')
  .option('-u, --url <url>', 'API server URL', process.env.API_URL || 'ws://localhost:3000')
  .option('-t, --token <token>', 'API token for authentication', process.env.API_TOKEN)
  .option('-p, --projects <paths...>', 'Projects to monitor (monitors all if not specified)')
  .option('-r, --refresh <seconds>', 'Stats refresh interval', '60')
  .parse(process.argv);

const options = program.opts();

const screen = blessed.screen({
  smartCSR: true,
  title: 'Claude Code GitHub Dashboard'
});

// blessed doesn't have a layout widget, so we'll position manually

const titleBox = blessed.box({
  parent: screen,
  top: 0,
  left: 0,
  width: '100%',
  height: 3,
  content: '{center}🚀 Claude Code GitHub - Development Dashboard{/center}',
  tags: true,
  style: {
    fg: 'cyan',
    border: {
      fg: 'cyan'
    }
  }
});

const statsBox = blessed.box({
  parent: screen,
  label: ' 📊 Project Statistics ',
  top: 3,
  left: 0,
  width: '50%',
  height: '40%',
  border: {
    type: 'line'
  },
  style: {
    border: {
      fg: 'green'
    }
  },
  scrollable: true,
  alwaysScroll: true,
  mouse: true
});

const activityLog = blessed.log({
  parent: screen,
  label: ' 📝 Activity Feed ',
  top: 3,
  left: '50%',
  width: '50%',
  height: '40%',
  border: {
    type: 'line'
  },
  style: {
    border: {
      fg: 'yellow'
    }
  },
  scrollable: true,
  alwaysScroll: true,
  mouse: true,
  tags: true
});

const suggestionsBox = blessed.list({
  parent: screen,
  label: ' 💡 AI Suggestions ',
  top: '43%',
  left: 0,
  width: '100%',
  height: '30%',
  border: {
    type: 'line'
  },
  style: {
    border: {
      fg: 'magenta'
    },
    selected: {
      bg: 'blue',
      fg: 'white'
    }
  },
  mouse: true,
  keys: true,
  vi: true
});

const statusBar = blessed.box({
  parent: screen,
  bottom: 0,
  left: 0,
  width: '100%',
  height: 3,
  style: {
    bg: 'blue'
  }
});

screen.key(['escape', 'q', 'C-c'], () => {
  return process.exit(0);
});

screen.key(['r', 'R'], () => {
  updateStats();
  statusBar.setContent(' Status: Refreshing... | Press Q to quit | R to refresh ');
  screen.render();
});

const projectStats: Map<string, ProjectStats> = new Map();
const suggestions: string[] = [];
let connected = false;

function updateStats() {
  let content = '';
  projectStats.forEach((stats, project) => {
    content += `{bold}${project}{/bold}\n`;
    content += `  Commits: ${stats.commits} | Branches: ${stats.branches} | PRs: ${stats.pullRequests}\n`;
    content += `  Suggestions: ${stats.suggestions} | Last: ${stats.lastActivity.toLocaleTimeString()}\n\n`;
  });
  statsBox.setContent(content);
  screen.render();
}

function addActivity(event: DashboardEvent) {
  const time = new Date(event.timestamp).toLocaleTimeString();
  const typeColor = getEventColor(event.type);
  activityLog.log(`{gray-fg}[${time}]{/gray-fg} {${typeColor}-fg}${event.type}{/${typeColor}-fg} ${event.title}`);
  
  if (event.project) {
    const stats = projectStats.get(event.project) || {
      commits: 0,
      branches: 0,
      pullRequests: 0,
      lastActivity: new Date(),
      suggestions: 0
    };
    
    stats.lastActivity = new Date(event.timestamp);
    
    switch (event.type) {
      case 'commit':
        stats.commits++;
        break;
      case 'branch':
        stats.branches++;
        break;
      case 'pull_request':
        stats.pullRequests++;
        break;
      case 'suggestion':
        stats.suggestions++;
        suggestions.unshift(`[${event.project}] ${event.message}`);
        if (suggestions.length > 10) suggestions.pop();
        break;
    }
    
    projectStats.set(event.project, stats);
    updateStats();
    updateSuggestions();
  }
}

function updateSuggestions() {
  suggestionsBox.setItems(suggestions);
  screen.render();
}

function getEventColor(type: string): string {
  const colors: Record<string, string> = {
    commit: 'green',
    branch: 'blue',
    pull_request: 'cyan',
    suggestion: 'yellow',
    error: 'red',
    warning: 'magenta'
  };
  return colors[type] || 'white';
}

function updateStatusBar() {
  const status = connected ? '{green-fg}Connected{/green-fg}' : '{red-fg}Disconnected{/red-fg}';
  const projectCount = options.projects?.length || 'All';
  statusBar.setContent(` Status: ${status} | Projects: ${projectCount} | Press Q to quit | R to refresh `);
  screen.render();
}

function connectToServer() {
  const wsUrl = options.url.replace('http://', 'ws://').replace('https://', 'wss://');
  const ws = new WebSocket(wsUrl, {
    headers: options.token ? { Authorization: `Bearer ${options.token}` } : {}
  });

  ws.on('open', () => {
    connected = true;
    updateStatusBar();
    
    const subscribeMessage = {
      type: 'subscribe',
      projects: options.projects,
      includeStats: true
    };
    ws.send(JSON.stringify(subscribeMessage));
  });

  ws.on('message', (data) => {
    try {
      const event = JSON.parse(data.toString()) as DashboardEvent;
      addActivity(event);
    } catch (error) {
      activityLog.log(`{red-fg}Error parsing message: ${error}{/red-fg}`);
    }
  });

  ws.on('close', () => {
    connected = false;
    updateStatusBar();
    setTimeout(connectToServer, 5000);
  });

  ws.on('error', (error) => {
    activityLog.log(`{red-fg}WebSocket error: ${error.message}{/red-fg}`);
  });
}

titleBox.setContent('{center}🚀 Claude Code GitHub - Development Dashboard{/center}');
statusBar.setContent(' Status: Connecting... | Press Q to quit | R to refresh ');
screen.render();

connectToServer();

setInterval(() => {
  if (connected) {
    updateStats();
  }
}, parseInt(options.refresh) * 1000);