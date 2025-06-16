# API Implementation Plan

## Phase 1: Foundation (Week 1)

### 1.1 Project Structure
```
src/
├── api/
│   ├── server.ts         # Main API server
│   ├── routes/           # API routes
│   │   ├── status.ts
│   │   ├── suggestions.ts
│   │   └── monitoring.ts
│   ├── middleware/       # Express middleware
│   │   ├── auth.ts
│   │   ├── cors.ts
│   │   └── rate-limit.ts
│   ├── controllers/      # Route handlers
│   └── types.ts          # API types
├── websocket/
│   ├── server.ts         # WebSocket server
│   ├── handlers.ts       # Event handlers
│   └── manager.ts        # Connection management
└── webhooks/
    ├── manager.ts        # Webhook management
    ├── delivery.ts       # Delivery logic
    └── retry.ts          # Retry mechanism
```

### 1.2 Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.5.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^6.7.0",
    "helmet": "^7.0.0",
    "joi": "^17.9.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/socket.io": "^3.0.2",
    "supertest": "^6.3.3"
  }
}
```

### 1.3 Core API Server

```typescript
// src/api/server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { statusRoutes } from './routes/status.js';
import { suggestionsRoutes } from './routes/suggestions.js';

export class APIServer {
  private app: express.Application;
  private server: http.Server | null = null;
  
  constructor(private config: APIConfig) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  private setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors(this.config.cors));
    this.app.use(express.json());
    this.app.use(authMiddleware(this.config.auth));
    this.app.use(rateLimitMiddleware(this.config.rateLimit));
  }
  
  private setupRoutes() {
    this.app.use('/api/v1/status', statusRoutes);
    this.app.use('/api/v1/suggestions', suggestionsRoutes);
    this.app.use('/api/v1/monitoring', monitoringRoutes);
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', version: '1.0.0' });
    });
  }
  
  async start() {
    return new Promise<void>((resolve) => {
      this.server = this.app.listen(this.config.port, this.config.host, () => {
        console.log(`API server listening on ${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }
  
  async stop() {
    if (this.server) {
      return new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
    }
  }
}
```

## Phase 2: Core Endpoints (Week 1-2)

### 2.1 Status Endpoint

```typescript
// src/api/routes/status.ts
import { Router } from 'express';
import { DevelopmentTools } from '../../development-tools.js';

export const statusRoutes = Router();

statusRoutes.get('/', async (req, res) => {
  try {
    const tools = req.app.locals.developmentTools as DevelopmentTools;
    const status = await tools.getEnhancedStatus();
    
    res.json({
      success: true,
      data: {
        projects: [{
          path: status.project.path,
          repo: status.project.repo,
          branch: status.branch.current,
          is_protected: status.branch.isProtected,
          uncommitted_changes: status.uncommittedChanges?.file_count || 0,
          recent_commits: status.recentCommits,
          pull_requests: status.pullRequests,
          suggestions: status.suggestions || []
        }]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch status'
      }
    });
  }
});
```

### 2.2 Suggestions Endpoint

```typescript
// src/api/routes/suggestions.ts
import { Router } from 'express';
import { SuggestionStore } from '../stores/suggestion-store.js';

export const suggestionsRoutes = Router();

suggestionsRoutes.get('/', async (req, res) => {
  const { project, type, since, limit = 50 } = req.query;
  const store = req.app.locals.suggestionStore as SuggestionStore;
  
  const filters = {
    project: project as string,
    type: type as string,
    since: since ? new Date(since as string) : undefined,
    limit: parseInt(limit as string)
  };
  
  const suggestions = await store.getSuggestions(filters);
  
  res.json({
    success: true,
    data: {
      suggestions,
      total: suggestions.length
    }
  });
});

suggestionsRoutes.post('/:id/dismiss', async (req, res) => {
  const { id } = req.params;
  const store = req.app.locals.suggestionStore as SuggestionStore;
  
  const dismissed = await store.dismissSuggestion(id);
  
  if (!dismissed) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Suggestion not found'
      }
    });
  }
  
  res.json({ success: true });
});
```

### 2.3 Event Store

```typescript
// src/api/stores/event-store.ts
export interface StoredEvent {
  id: string;
  timestamp: Date;
  type: string;
  project?: string;
  data: any;
}

export class EventStore {
  private events: Map<string, StoredEvent> = new Map();
  private eventsByType: Map<string, Set<string>> = new Map();
  private maxEvents = 10000;
  
  addEvent(event: Omit<StoredEvent, 'id' | 'timestamp'>): StoredEvent {
    const storedEvent: StoredEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...event
    };
    
    this.events.set(storedEvent.id, storedEvent);
    
    // Index by type
    if (!this.eventsByType.has(event.type)) {
      this.eventsByType.set(event.type, new Set());
    }
    this.eventsByType.get(event.type)!.add(storedEvent.id);
    
    // Cleanup old events if needed
    if (this.events.size > this.maxEvents) {
      this.pruneOldEvents();
    }
    
    return storedEvent;
  }
  
  getEvents(filters: EventFilters): StoredEvent[] {
    let events = Array.from(this.events.values());
    
    if (filters.type) {
      const typeIds = this.eventsByType.get(filters.type);
      if (typeIds) {
        events = events.filter(e => typeIds.has(e.id));
      } else {
        return [];
      }
    }
    
    if (filters.project) {
      events = events.filter(e => e.project === filters.project);
    }
    
    if (filters.since) {
      events = events.filter(e => e.timestamp > filters.since!);
    }
    
    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (filters.limit) {
      events = events.slice(0, filters.limit);
    }
    
    return events;
  }
}
```

## Phase 3: WebSocket Implementation (Week 2)

### 3.1 WebSocket Server

```typescript
// src/websocket/server.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from '../api/middleware/auth.js';

export class WebSocketServer {
  private io: SocketIOServer;
  private connections: Map<string, ClientConnection> = new Map();
  
  constructor(httpServer: HTTPServer, private config: WebSocketConfig) {
    this.io = new SocketIOServer(httpServer, {
      cors: this.config.cors
    });
    
    this.setupAuthentication();
    this.setupHandlers();
  }
  
  private setupAuthentication() {
    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      
      try {
        const user = await verifyToken(token);
        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }
  
  private setupHandlers() {
    this.io.on('connection', (socket) => {
      const connection = new ClientConnection(socket);
      this.connections.set(socket.id, connection);
      
      socket.on('subscribe', (data) => {
        connection.subscribe(data.events, data.projects);
      });
      
      socket.on('unsubscribe', (data) => {
        connection.unsubscribe(data.events);
      });
      
      socket.on('disconnect', () => {
        this.connections.delete(socket.id);
      });
    });
  }
  
  broadcast(event: any) {
    for (const connection of this.connections.values()) {
      if (connection.shouldReceive(event)) {
        connection.send(event);
      }
    }
  }
}
```

### 3.2 Event Broadcasting

```typescript
// src/websocket/broadcaster.ts
export class EventBroadcaster {
  constructor(
    private wsServer: WebSocketServer,
    private eventStore: EventStore,
    private webhookManager: WebhookManager
  ) {}
  
  async broadcastSuggestion(suggestion: Suggestion) {
    const event = {
      type: 'suggestion.created',
      data: suggestion,
      timestamp: new Date().toISOString()
    };
    
    // Store event
    this.eventStore.addEvent(event);
    
    // Broadcast to WebSocket clients
    this.wsServer.broadcast(event);
    
    // Deliver to webhooks
    await this.webhookManager.deliver(event);
  }
}
```

## Phase 4: Webhook System (Week 2-3)

### 4.1 Webhook Manager

```typescript
// src/webhooks/manager.ts
export class WebhookManager {
  private endpoints: WebhookEndpoint[] = [];
  
  constructor(private config: WebhookConfig) {
    this.endpoints = config.endpoints || [];
  }
  
  async deliver(event: Event) {
    const deliveries = this.endpoints
      .filter(endpoint => this.shouldDeliver(endpoint, event))
      .map(endpoint => this.deliverToEndpoint(endpoint, event));
    
    await Promise.allSettled(deliveries);
  }
  
  private shouldDeliver(endpoint: WebhookEndpoint, event: Event): boolean {
    if (!endpoint.events || endpoint.events.length === 0) {
      return true; // Deliver all events
    }
    
    return endpoint.events.includes(event.type);
  }
  
  private async deliverToEndpoint(endpoint: WebhookEndpoint, event: Event) {
    const delivery = new WebhookDelivery(endpoint, event);
    return delivery.execute();
  }
}
```

### 4.2 Webhook Delivery with Retries

```typescript
// src/webhooks/delivery.ts
export class WebhookDelivery {
  constructor(
    private endpoint: WebhookEndpoint,
    private event: Event
  ) {}
  
  async execute(): Promise<DeliveryResult> {
    const maxAttempts = this.endpoint.retry?.max_attempts || 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.attemptDelivery();
        return {
          success: true,
          attempts: attempt,
          response: result
        };
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxAttempts) {
          await this.backoff(attempt);
        }
      }
    }
    
    return {
      success: false,
      attempts: maxAttempts,
      error: lastError?.message
    };
  }
  
  private async attemptDelivery() {
    const payload = this.buildPayload();
    const signature = this.generateSignature(payload);
    
    const response = await fetch(this.endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Type': this.event.type,
        'X-Event-ID': this.event.id,
        'X-Signature': signature,
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }
}
```

## Phase 5: Integration & Testing (Week 3-4)

### 5.1 Integration with MCP Server

```typescript
// src/index.ts - Updated
import { APIServer } from './api/server.js';
import { WebSocketServer } from './websocket/server.js';
import { EventBroadcaster } from './websocket/broadcaster.js';

export class MCPServer {
  private apiServer?: APIServer;
  private wsServer?: WebSocketServer;
  private broadcaster?: EventBroadcaster;
  
  async initialize() {
    // ... existing initialization ...
    
    if (this.config.api_server?.enabled) {
      await this.startAPIServer();
    }
  }
  
  private async startAPIServer() {
    this.apiServer = new APIServer(this.config.api_server!);
    await this.apiServer.start();
    
    if (this.config.websocket?.enabled) {
      this.wsServer = new WebSocketServer(
        this.apiServer.getHttpServer(),
        this.config.websocket
      );
    }
    
    this.broadcaster = new EventBroadcaster(
      this.wsServer,
      this.eventStore,
      this.webhookManager
    );
    
    // Connect to monitoring system
    this.monitorManager.on('suggestion', (suggestion) => {
      this.broadcaster.broadcastSuggestion(suggestion);
    });
  }
}
```

### 5.2 Testing Strategy

```typescript
// test/api/server.test.ts
describe('API Server', () => {
  let server: APIServer;
  let request: SuperTest<any>;
  
  beforeEach(async () => {
    server = new APIServer(testConfig);
    await server.start();
    request = supertest(server.getApp());
  });
  
  afterEach(async () => {
    await server.stop();
  });
  
  describe('GET /api/v1/status', () => {
    it('should return project status', async () => {
      const response = await request
        .get('/api/v1/status')
        .set('Authorization', 'Bearer test-token')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('projects');
    });
    
    it('should require authentication', async () => {
      await request
        .get('/api/v1/status')
        .expect(401);
    });
  });
});
```

## Timeline

- **Week 1**: Foundation + Core API endpoints
- **Week 2**: WebSocket implementation + Event system
- **Week 3**: Webhook system + Integration
- **Week 4**: Testing + Documentation + Release

## Deliverables

1. Fully functional API server with authentication
2. WebSocket server for real-time events
3. Webhook delivery system with retries
4. Comprehensive test suite
5. API documentation (OpenAPI spec)
6. Integration examples
7. Migration guide for existing users