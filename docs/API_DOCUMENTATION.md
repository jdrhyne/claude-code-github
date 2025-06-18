# Claude Code GitHub Real-time API Documentation

The Claude Code GitHub API provides real-time access to development insights, suggestions, and monitoring data. This enables external tools and integrations to leverage the intelligent monitoring capabilities.

## Table of Contents

- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [REST API Endpoints](#rest-api-endpoints)
- [WebSocket Events](#websocket-events)
- [Webhooks](#webhooks)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Getting Started

### Running the API Server

```bash
# Install the package
npm install -g @jdrhyne/claude-code-github

# Start the API server
claude-code-api --port 3000

# With authentication enabled
claude-code-api --port 3000 --auth
```

### Configuration

The API server can be configured through environment variables:

```bash
API_PORT=3000
API_HOST=0.0.0.0
API_TOKEN=your-secret-token
```

## Authentication

When authentication is enabled, all API requests must include a Bearer token:

```bash
curl -H "Authorization: Bearer your-api-token" \
  http://localhost:3000/api/v1/status
```

## REST API Endpoints

### Get Project Suggestions

```http
GET /api/v1/projects/{projectPath}/suggestions
```

Returns intelligent suggestions for the specified project.

**Response:**
```json
{
  "project": "/Users/admin/Projects/my-app",
  "suggestions": [
    {
      "id": "protected-branch-warning",
      "type": "warning",
      "priority": "high",
      "message": "Working on protected branch 'main'",
      "recommendation": "Create a feature branch to avoid direct commits",
      "context": {
        "current_branch": "main",
        "modified_files": 4
      },
      "timestamp": "2025-06-18T10:30:00Z"
    }
  ]
}
```

### Get Monitoring Status

```http
GET /api/v1/projects/{projectPath}/monitoring-status
```

Returns the current monitoring status for a project.

**Response:**
```json
{
  "project": "/Users/admin/Projects/my-app",
  "monitoring": {
    "active": true,
    "duration_minutes": 45,
    "events_captured": 127,
    "suggestions_generated": 8
  }
}
```

### Get Recent Events

```http
GET /api/v1/projects/{projectPath}/events?limit=50
```

Returns recent monitoring events for a project.

**Query Parameters:**
- `limit` (optional): Maximum number of events to return (default: 50)

**Response:**
```json
{
  "project": "/Users/admin/Projects/my-app",
  "events": [
    {
      "id": "evt_123",
      "type": "file.changed",
      "timestamp": "2025-06-18T10:25:00Z",
      "data": {
        "file": "src/index.js",
        "action": "modified"
      }
    }
  ]
}
```

### Enhanced Status

```http
GET /api/v1/status/enhanced
```

Returns comprehensive project status including Git info, PRs, and issues.

**Response:**
```json
{
  "project": "/Users/admin/Projects/my-app",
  "branch": "feature/new-api",
  "is_protected": false,
  "uncommitted_changes": {
    "file_count": 3,
    "files_changed": [
      {"file": "src/api.js", "status": "Modified"}
    ]
  },
  "pull_requests": [
    {
      "number": 42,
      "title": "Add new API endpoints",
      "state": "open",
      "draft": false
    }
  ],
  "assigned_issues": [
    {
      "number": 29,
      "title": "Feature Request: Real-time API",
      "labels": ["enhancement"]
    }
  ]
}
```

## WebSocket Events

Connect to the WebSocket endpoint for real-time updates:

```javascript
const io = require('socket.io-client');
const socket = io('ws://localhost:3000');

// Subscribe to specific projects and events
socket.emit('subscribe', {
  projects: ['/Users/admin/Projects/my-app'],
  events: ['suggestion.created', 'milestone.reached']
});

// Listen for suggestions
socket.on('suggestion', (data) => {
  console.log('New suggestion:', data);
});

// Listen for milestones
socket.on('milestone.reached', (data) => {
  console.log('Milestone reached:', data);
});
```

### Available Events

- `suggestion.created` - New suggestion generated
- `monitoring.status_changed` - Monitoring started/stopped
- `pattern.detected` - Development pattern recognized
- `threshold.reached` - Configured threshold hit
- `milestone.reached` - Development milestone achieved
- `file.changed` - File modification detected
- `commit.created` - New commit detected
- `branch.changed` - Branch switch detected

## Webhooks

Register webhook endpoints to receive HTTP POST notifications:

### Subscribe to Webhooks

```http
POST /api/v1/webhooks/subscribe
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["suggestion.created", "milestone.reached"],
  "project": "/Users/admin/Projects/my-app"
}
```

**Response:**
```json
{
  "id": "wh_abc123",
  "message": "Webhook subscription created",
  "subscription": {
    "id": "wh_abc123",
    "url": "https://your-app.com/webhook",
    "events": ["suggestion.created", "milestone.reached"],
    "project": "/Users/admin/Projects/my-app",
    "createdAt": "2025-06-18T10:30:00Z"
  }
}
```

### Webhook Payload

Your webhook endpoint will receive POST requests with this structure:

```json
{
  "event": "suggestion.created",
  "data": {
    "project": "/Users/admin/Projects/my-app",
    "suggestion": {
      "id": "commit-timing",
      "type": "suggestion",
      "priority": "medium",
      "message": "4 files modified - good time to commit",
      "recommendation": "Commit related changes together",
      "context": {
        "files": ["src/api.js", "src/server.js"]
      }
    }
  },
  "timestamp": "2025-06-18T10:30:00Z"
}
```

### Unsubscribe from Webhooks

```http
DELETE /api/v1/webhooks/{webhookId}
```

### List Webhook Subscriptions

```http
GET /api/v1/webhooks
```

## Error Handling

All API errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional context
  }
}
```

Common error codes:
- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error

## Rate Limiting

The API implements rate limiting to prevent abuse:

- Default: 100 requests per 15 minutes per IP
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

## Client Libraries

### JavaScript/TypeScript

```javascript
const ClaudeCodeAPI = require('@jdrhyne/claude-code-github-client');

const client = new ClaudeCodeAPI({
  baseURL: 'http://localhost:3000',
  apiToken: 'your-api-token'
});

// Get suggestions
const suggestions = await client.getSuggestions('/path/to/project');

// Subscribe to real-time events
client.on('suggestion', (suggestion) => {
  console.log('New suggestion:', suggestion);
});
```

### Python

```python
from claude_code_github import APIClient

client = APIClient(
    base_url="http://localhost:3000",
    api_token="your-api-token"
)

# Get suggestions
suggestions = client.get_suggestions("/path/to/project")

# Subscribe to webhooks
client.subscribe_webhook(
    url="https://your-app.com/webhook",
    events=["suggestion.created"]
)
```

## Examples

### Dashboard Integration

```javascript
// Real-time dashboard showing development insights
const io = require('socket.io-client');
const socket = io('ws://localhost:3000');

socket.emit('subscribe', { events: ['*'] });

socket.on('suggestion', (data) => {
  updateDashboard('suggestions', data);
});

socket.on('milestone.reached', (data) => {
  showNotification('Milestone reached!', data.description);
});
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Check Development Suggestions
  run: |
    SUGGESTIONS=$(curl -s http://api-server:3000/api/v1/projects/${{ github.workspace }}/suggestions)
    if [[ $(echo $SUGGESTIONS | jq '.suggestions | length') -gt 0 ]]; then
      echo "::warning::Development suggestions available"
      echo $SUGGESTIONS | jq '.suggestions[]'
    fi
```

### Slack Integration

```javascript
// Webhook receiver for Slack notifications
app.post('/claude-code-webhook', (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'suggestion.created' && data.suggestion.priority === 'high') {
    slack.postMessage({
      channel: '#dev-alerts',
      text: `⚠️ ${data.suggestion.message}`,
      attachments: [{
        text: data.suggestion.recommendation,
        color: 'warning'
      }]
    });
  }
  
  res.sendStatus(200);
});
```