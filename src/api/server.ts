import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import http from 'http';
import { APIConfig, APIResponse, WebhookConfig } from './types.js';
import { authMiddleware } from './middleware/auth.js';
import { corsMiddleware } from './middleware/cors.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { EventStore } from './stores/event-store.js';
import { SuggestionStore } from './stores/suggestion-store.js';
import { statusRoutes } from './routes/status.js';
import { suggestionsRoutes } from './routes/suggestions.js';
import { monitoringRoutes } from './routes/monitoring.js';
import { DevelopmentTools } from '../development-tools.js';
import { WebSocketServer } from '../websocket/server.js';
import { EventBroadcaster } from '../websocket/event-broadcaster.js';
import { WebhookManager } from '../webhooks/manager.js';

export class APIServer {
  private app: Application;
  private server: http.Server | null = null;
  private eventStore: EventStore;
  private suggestionStore: SuggestionStore;
  private wsServer: WebSocketServer | null = null;
  private eventBroadcaster: EventBroadcaster;
  private webhookManager: WebhookManager | null = null;

  constructor(
    private config: APIConfig & { websocket?: any; webhooks?: WebhookConfig },
    private developmentTools: DevelopmentTools
  ) {
    this.app = express();
    this.eventStore = new EventStore();
    this.suggestionStore = new SuggestionStore(this.eventStore);
    
    // Initialize webhook manager if configured
    if (this.config.webhooks?.enabled) {
      this.webhookManager = new WebhookManager(this.config.webhooks);
    }
    
    // Event broadcaster will be initialized after server starts
    this.eventBroadcaster = new EventBroadcaster(null, this.eventStore, this.webhookManager);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware() {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: false // Disable for API
    }));

    // CORS
    this.app.use(corsMiddleware(this.config.cors));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Authentication
    this.app.use(authMiddleware(this.config.auth));

    // Rate limiting
    this.app.use(rateLimitMiddleware(this.config.rateLimit));

    // Request logging
    if (this.config.logging?.enabled) {
      this.app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
          const duration = Date.now() - start;
          console.log(`[API] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        });
        next();
      });
    }

    // Store instances in app locals for routes
    this.app.locals.developmentTools = this.developmentTools;
    this.app.locals.eventStore = this.eventStore;
    this.app.locals.suggestionStore = this.suggestionStore;
  }

  private setupRoutes() {
    // Health check (no auth required)
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // API info
    this.app.get('/api/v1', (_req, res) => {
      res.json({
        name: 'claude-code-github API',
        version: '1.0.0',
        endpoints: {
          status: '/api/v1/status',
          suggestions: '/api/v1/suggestions',
          monitoring: '/api/v1/monitoring'
        }
      });
    });

    // Mount route modules
    this.app.use('/api/v1/status', statusRoutes);
    this.app.use('/api/v1/suggestions', suggestionsRoutes);
    this.app.use('/api/v1/monitoring', monitoringRoutes);

    // 404 handler
    this.app.use((req, res) => {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint ${req.method} ${req.path} not found`
        }
      };
      res.status(404).json(response);
    });
  }

  private setupErrorHandling() {
    // Global error handler
    this.app.use((err: any, req: Request, res: Response, _next: any) => {
      console.error('[API Error]', err);

      const response: APIResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'An unexpected error occurred'
        }
      };

      if (this.config.logging?.level === 'debug') {
        response.error!.details = {
          stack: err.stack,
          path: req.path,
          method: req.method
        };
      }

      res.status(err.status || 500).json(response);
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(
          this.config.port,
          this.config.host,
          async () => {
            console.log(`[API] Server listening on ${this.config.host}:${this.config.port}`);
            
            // Initialize WebSocket server if enabled
            if (this.config.websocket?.enabled && this.server) {
              try {
                this.wsServer = new WebSocketServer(this.server, {
                  ...this.config.websocket,
                  authConfig: this.config.auth
                });
                
                // Update event broadcaster with WebSocket server
                this.eventBroadcaster = new EventBroadcaster(
                  this.wsServer,
                  this.eventStore,
                  this.webhookManager
                );
                
                console.log(`[WebSocket] Server initialized on ${this.config.websocket.namespace || '/socket.io'}`);
              } catch (error) {
                console.error('[WebSocket] Failed to initialize:', error);
                // Don't fail startup - WebSocket is optional
              }
            }
            
            resolve();
          }
        );

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`[API] Port ${this.config.port} is already in use`);
          } else {
            console.error('[API] Server error:', error);
          }
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    // Close WebSocket server first
    if (this.wsServer) {
      await this.wsServer.close();
    }
    
    // Then close HTTP server
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('[API] Server stopped');
          resolve();
        });
      });
    }
  }

  getApp(): Application {
    return this.app;
  }

  getHttpServer(): http.Server | null {
    return this.server;
  }

  getEventStore(): EventStore {
    return this.eventStore;
  }

  getSuggestionStore(): SuggestionStore {
    return this.suggestionStore;
  }

  // Method to emit events (called by monitoring system)
  async emitSuggestion(suggestion: Omit<any, 'id' | 'timestamp'>): Promise<void> {
    const stored = this.suggestionStore.addSuggestion(suggestion);
    await this.eventBroadcaster.broadcastSuggestion(stored);
  }

  async emitEvent(event: Omit<any, 'id' | 'timestamp'>): Promise<void> {
    await this.eventBroadcaster.broadcastMonitoringEvent(event.type, event);
  }

  // Get WebSocket server for direct access if needed
  getWebSocketServer(): WebSocketServer | null {
    return this.wsServer;
  }
}