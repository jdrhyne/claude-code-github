import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { WebSocketConfig } from '../api/types.js';
import { verifyToken } from '../api/middleware/auth.js';
import { ClientConnection } from './client-connection.js';
import { AuthConfig } from '../api/types.js';

export interface WebSocketServerOptions extends WebSocketConfig {
  authConfig?: AuthConfig;
}

export class WebSocketServer {
  private io: SocketIOServer;
  private connections: Map<string, ClientConnection> = new Map();
  private eventHandlers: Map<string, Set<string>> = new Map(); // event -> socket IDs

  constructor(
    httpServer: HTTPServer,
    private config: WebSocketServerOptions
  ) {
    this.io = new SocketIOServer(httpServer, {
      path: config.namespace || '/socket.io',
      cors: config.cors ? {
        origin: config.cors.origins,
        methods: config.cors.methods || ['GET', 'POST'],
        credentials: config.cors.credentials ?? true
      } : undefined,
      transports: ['websocket', 'polling']
    });

    this.setupAuthentication();
    this.setupHandlers();
    this.setupLogging();
  }

  private setupAuthentication() {
    if (!this.config.authConfig?.enabled) {
      return;
    }

    this.io.use(async (socket, next) => {
      try {
        // Check auth token from handshake
        const token = socket.handshake.auth.token || 
                     socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const authToken = await verifyToken(token, this.config.authConfig);
        if (!authToken) {
          return next(new Error('Invalid authentication token'));
        }

        // Store auth info in socket data
        socket.data.auth = authToken;
        socket.data.authenticated = true;
        next();
      } catch (_error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);
      
      // Create client connection
      const connection = new ClientConnection(socket);
      this.connections.set(socket.id, connection);

      // Handle subscription requests
      socket.on('subscribe', (data: { events?: string[], projects?: string[] }) => {
        try {
          const { events = [], projects = [] } = data;
          
          // Validate subscription request
          if (!Array.isArray(events) || !Array.isArray(projects)) {
            socket.emit('error', { message: 'Invalid subscription format' });
            return;
          }

          // Subscribe to events
          connection.subscribe(events, projects);
          
          // Track event subscriptions globally
          for (const event of events) {
            if (!this.eventHandlers.has(event)) {
              this.eventHandlers.set(event, new Set());
            }
            this.eventHandlers.get(event)!.add(socket.id);
          }

          socket.emit('subscribed', { events, projects });
          console.log(`[WebSocket] Client ${socket.id} subscribed to:`, { events, projects });
        } catch (_error) {
          socket.emit('error', { message: 'Subscription failed' });
        }
      });

      // Handle unsubscribe requests
      socket.on('unsubscribe', (data: { events?: string[] }) => {
        try {
          const { events = [] } = data;
          connection.unsubscribe(events);
          
          // Remove from global event tracking
          for (const event of events) {
            const handlers = this.eventHandlers.get(event);
            if (handlers) {
              handlers.delete(socket.id);
              if (handlers.size === 0) {
                this.eventHandlers.delete(event);
              }
            }
          }

          socket.emit('unsubscribed', { events });
          console.log(`[WebSocket] Client ${socket.id} unsubscribed from:`, { events });
        } catch (_error) {
          socket.emit('error', { message: 'Unsubscribe failed' });
        }
      });

      // Handle custom events
      socket.on('request', async (data: { id: string, method: string, params?: any }, callback) => {
        try {
          // Handle custom requests (e.g., trigger actions)
          const result = await this.handleRequest(socket, data.method, data.params);
          
          if (callback) {
            callback({ success: true, result });
          } else {
            socket.emit('response', { id: data.id, success: true, result });
          }
        } catch (error: any) {
          const errorResponse = {
            id: data.id,
            success: false,
            error: { message: error.message }
          };
          
          if (callback) {
            callback(errorResponse);
          } else {
            socket.emit('response', errorResponse);
          }
        }
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`[WebSocket] Client disconnected: ${socket.id} (${reason})`);
        
        // Clean up connection
        this.connections.delete(socket.id);
        
        // Remove from all event handlers
        for (const [event, handlers] of this.eventHandlers) {
          handlers.delete(socket.id);
          if (handlers.size === 0) {
            this.eventHandlers.delete(event);
          }
        }
      });

      // Send welcome message
      socket.emit('connected', {
        id: socket.id,
        timestamp: new Date().toISOString(),
        auth: socket.data.authenticated ? {
          name: socket.data.auth.name,
          scopes: socket.data.auth.scopes
        } : undefined
      });
    });
  }

  private setupLogging() {
    // WebSocket logging is always enabled in debug mode
    this.io.on('connection', (socket) => {
      socket.onAny((event, ...args) => {
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
          console.log(`[WebSocket] Event '${event}' from ${socket.id}:`, args);
        }
      });
    });
  }

  private async handleRequest(socket: Socket, method: string, _params?: any): Promise<any> {
    // Check if client has required scope for the method
    if (socket.data.authenticated) {
      const requiredScope = this.getRequiredScope(method);
      if (requiredScope && !this.hasScope(socket.data.auth, requiredScope)) {
        throw new Error(`Insufficient permissions. Required scope: ${requiredScope}`);
      }
    }

    // Handle specific methods
    switch (method) {
      case 'getStatus':
        return { status: 'connected', subscriptions: this.getClientSubscriptions(socket.id) };
      
      case 'getStats':
        return this.getStats();
      
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private getRequiredScope(method: string): string | null {
    const scopeMap: Record<string, string> = {
      'getStatus': 'read:status',
      'getStats': 'read:monitoring'
    };
    return scopeMap[method] || null;
  }

  private hasScope(auth: any, requiredScope: string): boolean {
    return auth.scopes.includes(requiredScope) || auth.scopes.includes('*');
  }

  private getClientSubscriptions(socketId: string): { events: string[], projects: string[] } {
    const connection = this.connections.get(socketId);
    if (!connection) {
      return { events: [], projects: [] };
    }
    return connection.getSubscriptions();
  }

  /**
   * Broadcast an event to all subscribed clients
   */
  broadcast(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (!handlers || handlers.size === 0) {
      return;
    }

    for (const socketId of handlers) {
      const connection = this.connections.get(socketId);
      if (connection && connection.shouldReceive(event, data)) {
        connection.send(event, data);
      }
    }

    // Log broadcasts in debug mode
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.log(`[WebSocket] Broadcast '${event}' to ${handlers.size} clients`);
    }
  }

  /**
   * Send event to specific client
   */
  sendToClient(socketId: string, event: string, data: any): boolean {
    const connection = this.connections.get(socketId);
    if (!connection) {
      return false;
    }

    connection.send(event, data);
    return true;
  }

  /**
   * Get server statistics
   */
  getStats(): {
    connections: number;
    subscriptions: Record<string, number>;
    clients: Array<{
      id: string;
      connected: Date;
      subscriptions: { events: string[], projects: string[] };
    }>;
  } {
    const stats = {
      connections: this.connections.size,
      subscriptions: {} as Record<string, number>,
      clients: [] as any[]
    };

    // Count subscriptions by event
    for (const [event, handlers] of this.eventHandlers) {
      stats.subscriptions[event] = handlers.size;
    }

    // Get client details
    for (const [id, connection] of this.connections) {
      stats.clients.push({
        id,
        connected: connection.getConnectedTime(),
        subscriptions: connection.getSubscriptions()
      });
    }

    return stats;
  }

  /**
   * Close all connections and shut down
   */
  async close(): Promise<void> {
    // Notify all clients
    this.io.emit('server-closing', { message: 'Server is shutting down' });

    // Close all connections
    for (const [, connection] of this.connections) {
      connection.disconnect();
    }

    // Close the server
    return new Promise((resolve) => {
      this.io.close(() => {
        console.log('[WebSocket] Server closed');
        resolve();
      });
    });
  }
}