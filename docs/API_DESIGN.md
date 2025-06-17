# API and Webhook Architecture Design

## Overview

This document outlines the design for a real-time suggestions API and webhook system that enables external tools to receive intelligent suggestions from claude-code-github's monitoring engine.

## Goals

1. **Real-time Integration**: Enable external tools to receive suggestions as they're generated
2. **Flexible Delivery**: Support both pull (API) and push (webhooks) mechanisms
3. **Security**: Ensure secure communication with authentication and authorization
4. **Scalability**: Design for high-frequency events without overwhelming consumers
5. **Developer Experience**: Provide clear APIs with good documentation

## Architecture Components

### 1. HTTP API Server

A RESTful API server that runs alongside the MCP server:

```yaml
api:
  enabled: true
  port: 3000
  host: "127.0.0.1"
  auth:
    type: "bearer"  # or "api_key"
    tokens:
      - name: "vscode-extension"
        token: "secret-token-1"
        scopes: ["read:suggestions", "read:status"]
```

### 2. WebSocket Server

For real-time streaming of events:

```yaml
websocket:
  enabled: true
  port: 3001
  auth:
    type: "bearer"
    allow_anonymous: false
```

### 3. Webhook System

Push events to configured endpoints:

```yaml
webhooks:
  enabled: true
  endpoints:
    - url: "https://api.example.com/claude-suggestions"
      events: ["suggestion.created", "milestone.reached"]
      auth:
        type: "bearer"
        token: "webhook-secret"
      retry:
        max_attempts: 3
        backoff: "exponential"
```

## API Endpoints

### Core Endpoints

#### GET /api/v1/status
Get current development status across all projects

```json
{
  "projects": [{
    "path": "/path/to/project",
    "branch": "feature/api",
    "uncommitted_changes": 5,
    "suggestions": ["Consider committing your work"]
  }]
}
```

#### GET /api/v1/suggestions
Get recent suggestions with filtering

Query params:
- `project`: Filter by project path
- `type`: Filter by suggestion type
- `since`: ISO timestamp for suggestions after this time
- `limit`: Number of results (default: 50)

```json
{
  "suggestions": [{
    "id": "sugg_123",
    "timestamp": "2025-06-16T10:30:00Z",
    "project": "/path/to/project",
    "type": "time_reminder",
    "priority": "medium",
    "message": "You've been working for 2 hours",
    "actions": [{
      "type": "commit",
      "label": "Commit changes"
    }]
  }]
}
```

#### GET /api/v1/monitoring/events
Get monitoring events stream

```json
{
  "events": [{
    "id": "evt_456",
    "timestamp": "2025-06-16T10:31:00Z",
    "type": "feature_completed",
    "data": {
      "feature": "user authentication",
      "files_changed": 12
    }
  }]
}
```

#### POST /api/v1/suggestions/{id}/dismiss
Dismiss a suggestion

#### POST /api/v1/suggestions/{id}/action
Execute a suggested action

```json
{
  "action": "commit",
  "params": {
    "message": "feat: add user authentication"
  }
}
```

### WebSocket Events

```javascript
// Client connection
ws.connect('ws://localhost:3001', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});

// Subscribe to events
ws.send({
  type: 'subscribe',
  events: ['suggestion.created', 'milestone.reached'],
  projects: ['/path/to/project']
});

// Receive events
ws.on('message', (event) => {
  console.log('New suggestion:', event.data);
});
```

## Event Types

### Suggestion Events
- `suggestion.created` - New suggestion generated
- `suggestion.dismissed` - Suggestion dismissed by user
- `suggestion.actioned` - Suggestion action executed

### Milestone Events
- `milestone.reached` - Development milestone detected
- `release.ready` - Release conditions met

### Monitoring Events
- `changes.detected` - File changes detected
- `commit.created` - Commit created
- `pr.created` - Pull request created

## Security Considerations

### Authentication Methods

1. **Bearer Tokens**: Simple token-based auth
   ```
   Authorization: Bearer YOUR_SECRET_TOKEN
   ```

2. **API Keys**: Key in header or query param
   ```
   X-API-Key: YOUR_API_KEY
   ```

3. **HMAC Signatures**: For webhooks
   ```
   X-Signature: hmac-sha256=SIGNATURE
   ```

### Rate Limiting

```yaml
rate_limiting:
  enabled: true
  window: 60  # seconds
  max_requests: 100
  by: "token"  # or "ip"
```

### CORS Configuration

```yaml
cors:
  enabled: true
  origins:
    - "http://localhost:*"
    - "https://app.example.com"
  methods: ["GET", "POST"]
  headers: ["Authorization", "Content-Type"]
```

## Implementation Phases

### Phase 1: Core API Server
- Basic HTTP server with Express/Fastify
- Authentication middleware
- Core status and suggestions endpoints
- In-memory event store

### Phase 2: WebSocket Support
- WebSocket server with Socket.io
- Real-time event streaming
- Subscription management
- Connection state handling

### Phase 3: Webhook System
- Webhook configuration management
- Event delivery with retries
- Webhook signature verification
- Delivery status tracking

### Phase 4: Advanced Features
- Event filtering and aggregation
- Historical data queries
- Metrics and analytics
- GraphQL API option

## Integration Examples

### VS Code Extension

```typescript
class ClaudeSuggestionsProvider {
  private ws: WebSocket;
  
  constructor(private token: string) {
    this.connect();
  }
  
  private connect() {
    this.ws = new WebSocket('ws://localhost:3001');
    this.ws.on('open', () => {
      this.authenticate();
      this.subscribe();
    });
    
    this.ws.on('message', (data) => {
      const event = JSON.parse(data);
      if (event.type === 'suggestion.created') {
        vscode.window.showInformationMessage(
          event.data.message,
          ...event.data.actions.map(a => a.label)
        );
      }
    });
  }
}
```

### Slack Integration

```javascript
app.post('/webhooks/claude-suggestions', (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'milestone.reached') {
    slack.chat.postMessage({
      channel: '#dev-team',
      text: `🎉 Milestone reached: ${data.milestone}`,
      attachments: [{
        fields: data.details
      }]
    });
  }
  
  res.status(200).send();
});
```

### GitHub Actions

```yaml
name: Claude Suggestions
on:
  webhook:
    types: [claude-suggestion]

jobs:
  process-suggestion:
    runs-on: ubuntu-latest
    steps:
      - name: Handle suggestion
        run: |
          echo "Suggestion: ${{ github.event.client_payload.message }}"
```

## Configuration Schema

```yaml
# Complete API configuration
api_server:
  enabled: false
  type: "http"  # or "fastify"
  port: 3000
  host: "127.0.0.1"
  
  auth:
    enabled: true
    type: "bearer"
    tokens:
      - name: "default"
        token: "${API_TOKEN}"  # Environment variable
        scopes: ["*"]
    
  cors:
    enabled: true
    origins: ["http://localhost:*"]
    
  rate_limiting:
    enabled: true
    window: 60
    max_requests: 100
    
  logging:
    enabled: true
    level: "info"
    
websocket:
  enabled: false
  port: 3001
  namespace: "/suggestions"
  
webhooks:
  enabled: false
  signing_secret: "${WEBHOOK_SECRET}"
  endpoints: []
```

## Error Handling

### API Error Responses

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "details": {
      "retry_after": 45
    }
  }
}
```

### Webhook Retry Logic

```typescript
async function deliverWebhook(endpoint: WebhookEndpoint, event: Event) {
  const maxAttempts = endpoint.retry?.max_attempts || 3;
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Event-Type': event.type,
          'X-Signature': generateSignature(event)
        },
        body: JSON.stringify(event)
      });
      
      if (response.ok) {
        return;
      }
      
      if (response.status < 500) {
        // Don't retry client errors
        throw new Error(`Client error: ${response.status}`);
      }
    } catch (error) {
      attempt++;
      if (attempt < maxAttempts) {
        await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
      }
    }
  }
}
```

## Testing Strategy

### Unit Tests
- Authentication middleware
- Event filtering logic
- Webhook delivery

### Integration Tests
- API endpoint responses
- WebSocket connections
- Webhook deliveries

### Load Tests
- High-frequency event generation
- Multiple concurrent connections
- Rate limiting behavior

## Documentation Requirements

1. **API Reference**: OpenAPI/Swagger specification
2. **Integration Guides**: Step-by-step for popular tools
3. **Event Catalog**: Complete list with schemas
4. **Security Guide**: Best practices for token management
5. **Troubleshooting**: Common issues and solutions

## Future Enhancements

1. **GraphQL API**: For flexible querying
2. **Event Replay**: Replay historical events
3. **Custom Webhooks**: User-defined event transformations
4. **Metrics API**: Development productivity metrics
5. **AI Insights**: Advanced pattern recognition