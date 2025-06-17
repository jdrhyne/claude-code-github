#!/usr/bin/env node

/**
 * Full Integration Example for claude-code-github
 * 
 * This example demonstrates:
 * 1. REST API usage
 * 2. WebSocket real-time events
 * 3. Webhook server setup
 */

const express = require('express');
const io = require('socket.io-client');
const crypto = require('crypto');

// Configuration
const API_URL = 'http://localhost:3000';
const API_TOKEN = process.env.CLAUDE_API_TOKEN || 'your-api-token';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';
const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 3001;

// ============================================
// 1. REST API Client
// ============================================

class ClaudeCodeAPIClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getStatus() {
    return this.request('/api/v1/status');
  }

  async getSuggestions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/v1/suggestions${query ? '?' + query : ''}`);
  }

  async executeSuggestion(id, action) {
    return this.request(`/api/v1/suggestions/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
  }

  async getMonitoringEvents(since) {
    const params = since ? { since: since.toISOString() } : {};
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/v1/monitoring/events${query ? '?' + query : ''}`);
  }
}

// ============================================
// 2. WebSocket Client
// ============================================

class ClaudeCodeWebSocketClient {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.socket = null;
    this.eventHandlers = new Map();
  }

  connect() {
    this.socket = io(this.url, {
      auth: { token: this.token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.onConnect();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('🚨 WebSocket error:', error);
    });

    // Set up event forwarding
    const events = [
      'suggestion.created',
      'suggestion.updated',
      'suggestion.executed',
      'milestone.reached',
      'commit.created',
      'branch.created',
      'pr.created'
    ];

    events.forEach(event => {
      this.socket.on(event, (data) => {
        this.handleEvent(event, data);
      });
    });

    return this;
  }

  onConnect() {
    // Subscribe to all events for all projects
    this.socket.emit('subscribe', {
      events: ['*'],
      projects: ['*']
    });
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  handleEvent(type, data) {
    const handlers = this.eventHandlers.get(type) || [];
    handlers.forEach(handler => handler(data));

    // Also check for wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*') || [];
    wildcardHandlers.forEach(handler => handler({ type, ...data }));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// ============================================
// 3. Webhook Server
// ============================================

class ClaudeCodeWebhookServer {
  constructor(port, secret) {
    this.port = port;
    this.secret = secret;
    this.app = express();
    this.eventHandlers = new Map();
    this.setupRoutes();
  }

  setupRoutes() {
    // Raw body for signature verification
    this.app.use('/webhook', express.raw({ type: 'application/json' }));

    this.app.post('/webhook', (req, res) => {
      // Verify signature
      if (this.secret) {
        const signature = req.headers['x-webhook-signature'];
        if (!this.verifySignature(req.body, signature)) {
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }

      // Parse event
      const event = JSON.parse(req.body);
      console.log(`📨 Webhook received: ${event.type}`);

      // Handle event
      this.handleEvent(event);

      res.json({ received: true });
    });

    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });
  }

  verifySignature(payload, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  handleEvent(event) {
    const handlers = this.eventHandlers.get(event.type) || [];
    handlers.forEach(handler => handler(event));

    // Also check for wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*') || [];
    wildcardHandlers.forEach(handler => handler(event));
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`🚀 Webhook server listening on port ${this.port}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

// ============================================
// 4. Example Usage
// ============================================

async function main() {
  console.log('Claude Code GitHub - Full Integration Example\n');

  // Create API client
  const api = new ClaudeCodeAPIClient(API_URL, API_TOKEN);

  // Create WebSocket client
  const ws = new ClaudeCodeWebSocketClient(API_URL, API_TOKEN);

  // Create webhook server
  const webhook = new ClaudeCodeWebhookServer(WEBHOOK_PORT, WEBHOOK_SECRET);

  // ---- REST API Examples ----
  console.log('📡 Testing REST API...\n');

  try {
    // Get current status
    const status = await api.getStatus();
    console.log('Current Status:', JSON.stringify(status.data, null, 2));

    // Get active suggestions
    const suggestions = await api.getSuggestions({ status: 'active', limit: 5 });
    console.log('\nActive Suggestions:', suggestions.data.length);

    // Get recent monitoring events
    const since = new Date(Date.now() - 3600000); // Last hour
    const events = await api.getMonitoringEvents(since);
    console.log('Recent Events:', events.data.length);
  } catch (error) {
    console.error('API Error:', error.message);
  }

  // ---- WebSocket Examples ----
  console.log('\n🔌 Connecting to WebSocket...\n');

  ws.connect();

  // Handle all events
  ws.on('*', (event) => {
    console.log(`[WebSocket] ${event.type}:`, {
      project: event.project,
      timestamp: event.timestamp
    });
  });

  // Handle specific events
  ws.on('suggestion.created', async (event) => {
    const suggestion = event.data;
    console.log(`\n💡 New Suggestion (${suggestion.priority} priority):`);
    console.log(`   ${suggestion.message}`);
    
    if (suggestion.actions?.length > 0) {
      console.log('   Available actions:');
      suggestion.actions.forEach(action => {
        console.log(`   - ${action.label} (${action.type})`);
      });

      // Auto-execute high priority suggestions (example)
      if (suggestion.priority === 'high' && suggestion.type === 'commit') {
        console.log('   🤖 Auto-executing high priority commit suggestion...');
        try {
          await api.executeSuggestion(suggestion.id, suggestion.actions[0].type);
          console.log('   ✅ Suggestion executed successfully');
        } catch (error) {
          console.error('   ❌ Failed to execute:', error.message);
        }
      }
    }
  });

  ws.on('milestone.reached', (event) => {
    console.log(`\n🎉 Milestone Reached: ${event.data.description}`);
    console.log(`   Type: ${event.data.type}`);
    console.log(`   Project: ${event.project}`);
  });

  ws.on('commit.created', (event) => {
    console.log(`\n📝 New Commit: ${event.data.message}`);
    console.log(`   Branch: ${event.data.branch}`);
    console.log(`   Files: ${event.data.files_changed}`);
  });

  // ---- Webhook Examples ----
  console.log('\n🪝 Starting webhook server...\n');

  webhook.on('*', (event) => {
    console.log(`[Webhook] ${event.type}:`, {
      id: event.id,
      project: event.project,
      timestamp: event.timestamp
    });
  });

  webhook.on('suggestion.created', (event) => {
    // Example: Send to external service
    console.log('   → Forwarding to external service...');
    // await externalService.notify(event);
  });

  webhook.start();

  // ---- Interactive Mode ----
  console.log('\n📋 Commands:');
  console.log('  status    - Get current status');
  console.log('  suggest   - List active suggestions');
  console.log('  events    - Get recent events');
  console.log('  execute   - Execute a suggestion');
  console.log('  quit      - Exit\n');

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'claude> '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const command = line.trim();

    switch (command) {
      case 'status':
        try {
          const status = await api.getStatus();
          console.log(JSON.stringify(status.data, null, 2));
        } catch (error) {
          console.error('Error:', error.message);
        }
        break;

      case 'suggest':
        try {
          const suggestions = await api.getSuggestions({ status: 'active' });
          suggestions.data.forEach(s => {
            console.log(`${s.id}: [${s.priority}] ${s.message}`);
          });
        } catch (error) {
          console.error('Error:', error.message);
        }
        break;

      case 'events':
        try {
          const events = await api.getMonitoringEvents();
          events.data.slice(0, 10).forEach(e => {
            console.log(`${e.timestamp} - ${e.type}: ${e.description || e.data.message || ''}`);
          });
        } catch (error) {
          console.error('Error:', error.message);
        }
        break;

      case 'execute':
        rl.question('Suggestion ID: ', async (id) => {
          rl.question('Action: ', async (action) => {
            try {
              await api.executeSuggestion(id, action);
              console.log('✅ Executed successfully');
            } catch (error) {
              console.error('Error:', error.message);
            }
            rl.prompt();
          });
        });
        return;

      case 'quit':
        console.log('Goodbye!');
        ws.disconnect();
        webhook.stop();
        process.exit(0);
        break;

      default:
        if (command) {
          console.log(`Unknown command: ${command}`);
        }
    }

    rl.prompt();
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down...');
    ws.disconnect();
    webhook.stop();
    process.exit(0);
  });
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  ClaudeCodeAPIClient,
  ClaudeCodeWebSocketClient,
  ClaudeCodeWebhookServer
};