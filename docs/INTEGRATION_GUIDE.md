# Claude Code GitHub Integration Guide

This guide explains how to integrate with the claude-code-github API to receive real-time development events and suggestions. The API supports REST endpoints, WebSocket connections, and webhook deliveries.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [REST API](#rest-api)
- [WebSocket Integration](#websocket-integration)
- [Webhook Integration](#webhook-integration)
- [Event Types](#event-types)
- [Examples](#examples)

## Overview

The claude-code-github API provides three ways to integrate:

1. **REST API** - Poll for suggestions and monitoring data
2. **WebSocket** - Real-time bidirectional communication
3. **Webhooks** - Server-to-server event delivery

## Authentication

All API methods use Bearer token authentication:

```bash
# REST API
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/v1/status

# WebSocket
const socket = io('http://localhost:3000', {
  auth: { token: 'YOUR_TOKEN' }
});

# Webhooks (configured in config.yml)
webhooks:
  endpoints:
    - url: https://your-server.com/webhook
      auth:
        type: bearer
        token: YOUR_WEBHOOK_TOKEN
```

## REST API

### Status Endpoint

Get current development status:

```bash
GET /api/v1/status
```

Response:
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "path": "/path/to/project",
        "branch": "feature/new-feature",
        "uncommitted_changes": 5,
        "suggestions": 2
      }
    ],
    "monitoring": {
      "enabled": true,
      "events_today": 42
    }
  }
}
```

### Suggestions Endpoint

List active suggestions:

```bash
GET /api/v1/suggestions?status=active&limit=10
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "sugg_123",
      "type": "commit",
      "priority": "high",
      "message": "You have 15 uncommitted changes. Consider creating a commit.",
      "project": "/path/to/project",
      "actions": [
        {
          "type": "commit",
          "label": "Create commit",
          "params": {
            "message": "feat: implement user authentication"
          }
        }
      ]
    }
  ]
}
```

Execute a suggestion action:

```bash
POST /api/v1/suggestions/sugg_123/execute
Content-Type: application/json

{
  "action": "commit"
}
```

### Monitoring Events

Stream monitoring events:

```bash
GET /api/v1/monitoring/events/stream
Accept: text/event-stream
```

## WebSocket Integration

### Connecting

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3000', {
  auth: {
    token: 'YOUR_API_TOKEN'
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  
  // Subscribe to events
  socket.emit('subscribe', {
    events: ['suggestion.created', 'milestone.reached'],
    projects: ['/path/to/project'] // or ['*'] for all projects
  });
});

socket.on('suggestion.created', (event) => {
  console.log('New suggestion:', event.data);
});
```

### WebSocket Events

**Client to Server:**
- `subscribe` - Subscribe to event types
- `unsubscribe` - Unsubscribe from events
- `request` - Make a request (getStatus, getStats)
- `ping` - Keep connection alive

**Server to Client:**
- `connected` - Connection established
- `subscribed` - Subscription confirmed
- `unsubscribed` - Unsubscription confirmed
- `pong` - Ping response
- Event broadcasts (suggestion.created, etc.)

### Example WebSocket Client

```javascript
// Full example available in examples/websocket-client.js
const socket = io('http://localhost:3000', {
  auth: { token: API_TOKEN }
});

// Handle suggestions
socket.on('suggestion.created', (event) => {
  console.log(`New ${event.data.priority} priority suggestion:`);
  console.log(event.data.message);
  
  // Optionally execute the suggestion
  if (event.data.actions?.length > 0) {
    const action = event.data.actions[0];
    // Call REST API to execute action
  }
});

// Handle milestones
socket.on('milestone.reached', (event) => {
  console.log(`Milestone: ${event.data.description}`);
});

// Get current status
socket.emit('request', {
  id: '123',
  method: 'getStatus'
}, (response) => {
  console.log('Current status:', response);
});
```

## Webhook Integration

### Configuration

Configure webhooks in your `config.yml`:

```yaml
webhooks:
  enabled: true
  signing_secret: your-signing-secret # Optional HMAC verification
  endpoints:
    - url: https://your-server.com/claude-code-webhook
      events: ['suggestion.*', 'milestone.*']  # Event filters
      auth:
        type: bearer
        token: your-webhook-token
      retry:
        max_attempts: 3
        backoff: exponential

    - url: https://internal.service/events
      events: ['commit.created']
      auth:
        type: basic
        username: webhook-user
        password: webhook-pass

    - url: https://custom.endpoint/webhook
      auth:
        type: custom
        headers:
          X-API-Key: your-api-key
          X-Source: claude-code-github
```

### Webhook Payload

All webhooks receive POST requests with the following structure:

```json
{
  "id": "evt_123",
  "type": "suggestion.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "project": "/path/to/project",
  "data": {
    // Event-specific data
  }
}
```

### Webhook Headers

```
Content-Type: application/json
User-Agent: claude-code-github/1.0
X-Webhook-Event: suggestion.created
X-Webhook-ID: evt_123
X-Webhook-Timestamp: 2024-01-15T10:30:00.000Z
X-Webhook-Signature: sha256=... (if signing_secret configured)
```

### Verifying Webhook Signatures

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}

// Express.js example
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  
  if (!verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const event = JSON.parse(req.body);
  console.log('Received event:', event.type);
  
  res.json({ received: true });
});
```

## Event Types

### Suggestion Events

- `suggestion.created` - New suggestion generated
- `suggestion.updated` - Suggestion updated
- `suggestion.dismissed` - Suggestion dismissed
- `suggestion.executed` - Suggestion action executed

### Development Events

- `commit.created` - New commit created
- `branch.created` - New branch created
- `pr.created` - Pull request created
- `pr.updated` - Pull request updated

### Milestone Events

- `milestone.reached` - Development milestone achieved
- `milestone.commits` - Commit threshold reached
- `milestone.features` - Feature count milestone

### Monitoring Events

- `monitoring.started` - Monitoring started for project
- `monitoring.stopped` - Monitoring stopped
- `conversation.update` - Claude conversation update

## Examples

### VS Code Extension Integration

```typescript
// Simple VS Code extension that shows suggestions
import * as vscode from 'vscode';
import { io } from 'socket.io-client';

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('claudeCode');
  const apiUrl = config.get('apiUrl', 'http://localhost:3000');
  const apiToken = config.get('apiToken');

  const socket = io(apiUrl, {
    auth: { token: apiToken }
  });

  socket.on('suggestion.created', (event) => {
    const suggestion = event.data;
    
    vscode.window.showInformationMessage(
      suggestion.message,
      ...suggestion.actions.map(a => a.label)
    ).then(selection => {
      if (selection) {
        // Execute the selected action
        executeSuggestion(suggestion.id, selection);
      }
    });
  });

  socket.emit('subscribe', {
    events: ['suggestion.*'],
    projects: [vscode.workspace.rootPath]
  });
}

async function executeSuggestion(id: string, action: string) {
  // Call REST API to execute the suggestion
  const response = await fetch(`${apiUrl}/api/v1/suggestions/${id}/execute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action })
  });
  
  if (response.ok) {
    vscode.window.showInformationMessage('Suggestion executed successfully');
  }
}
```

### Slack Integration via Webhooks

```javascript
// Slack webhook handler
const express = require('express');
const { WebClient } = require('@slack/web-api');

const app = express();
const slack = new WebClient(process.env.SLACK_TOKEN);

app.post('/claude-webhook', express.json(), async (req, res) => {
  const event = req.body;
  
  // Map event types to Slack messages
  const messages = {
    'suggestion.created': {
      text: `💡 New suggestion in ${event.project}`,
      attachments: [{
        color: event.data.priority === 'high' ? 'danger' : 'warning',
        fields: [
          { title: 'Suggestion', value: event.data.message },
          { title: 'Priority', value: event.data.priority, short: true },
          { title: 'Type', value: event.data.type, short: true }
        ]
      }]
    },
    'milestone.reached': {
      text: `🎉 Milestone reached: ${event.data.description}`,
      attachments: [{
        color: 'good',
        fields: [
          { title: 'Type', value: event.data.type },
          { title: 'Project', value: event.project }
        ]
      }]
    }
  };
  
  const message = messages[event.type];
  if (message) {
    await slack.chat.postMessage({
      channel: '#dev-notifications',
      ...message
    });
  }
  
  res.json({ received: true });
});
```

### GitHub Actions Integration

```yaml
# .github/workflows/claude-suggestions.yml
name: Process Claude Suggestions

on:
  repository_dispatch:
    types: [claude-suggestion]

jobs:
  process-suggestion:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Process Suggestion
        run: |
          echo "Suggestion: ${{ github.event.client_payload.message }}"
          echo "Priority: ${{ github.event.client_payload.priority }}"
          
      - name: Create Issue for High Priority
        if: github.event.client_payload.priority == 'high'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Claude Suggestion: ${{ github.event.client_payload.message }}',
              body: 'Automated issue from Claude Code suggestion',
              labels: ['claude-suggestion', '${{ github.event.client_payload.priority }}']
            })
```

### Dashboard Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>Claude Code Dashboard</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <h1>Development Activity</h1>
  <div id="suggestions"></div>
  <div id="events"></div>

  <script>
    const socket = io('http://localhost:3000', {
      auth: { token: 'YOUR_TOKEN' }
    });

    socket.on('connect', () => {
      socket.emit('subscribe', {
        events: ['*'],
        projects: ['*']
      });
    });

    socket.on('suggestion.created', (event) => {
      const div = document.createElement('div');
      div.className = `suggestion ${event.data.priority}`;
      div.innerHTML = `
        <h3>${event.data.message}</h3>
        <p>Project: ${event.project}</p>
        <p>Priority: ${event.data.priority}</p>
      `;
      document.getElementById('suggestions').prepend(div);
    });

    // Listen for all events
    const eventTypes = ['commit.created', 'branch.created', 'pr.created'];
    eventTypes.forEach(type => {
      socket.on(type, (event) => {
        const div = document.createElement('div');
        div.className = 'event';
        div.innerHTML = `
          <span class="time">${new Date(event.timestamp).toLocaleTimeString()}</span>
          <span class="type">${event.type}</span>
          <span class="project">${event.project}</span>
        `;
        document.getElementById('events').prepend(div);
      });
    });
  </script>
</body>
</html>
```

## Best Practices

1. **Authentication**: Always use secure tokens and rotate them regularly
2. **Event Filtering**: Subscribe only to events you need to reduce network traffic
3. **Error Handling**: Implement proper error handling and retry logic
4. **Rate Limiting**: Respect rate limits (default: 100 requests per minute)
5. **Webhook Security**: Verify webhook signatures in production
6. **Connection Management**: Implement reconnection logic for WebSocket clients
7. **Logging**: Log all API interactions for debugging

## Troubleshooting

### WebSocket Connection Issues

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  // Common issues:
  // - Invalid token
  // - Server not running
  // - Network issues
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // Socket.IO will automatically try to reconnect
});
```

### Webhook Delivery Failures

Check the server logs for webhook delivery attempts:
```
[Webhooks] Delivery failed for https://example.com/webhook, will retry in 1000ms
[Webhooks] Delivery failed permanently for https://example.com/webhook: HTTP 404
```

### API Rate Limiting

Handle rate limit responses:
```javascript
if (response.status === 429) {
  const retryAfter = response.headers.get('X-RateLimit-Reset');
  console.log(`Rate limited. Retry after ${retryAfter}s`);
}
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/anthropics/claude-code-github/issues
- Documentation: https://docs.anthropic.com/claude-code