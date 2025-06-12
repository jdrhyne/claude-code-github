import { McpServer } from './mcp-server.js';
import { JsonRpcRequest, JsonRpcResponse } from './types.js';
import { MonitoringSuggestion, AggregatedMilestone } from './monitoring/types.js';

export interface McpNotification {
  method: string;
  params: unknown;
}

export class EnhancedMcpServer extends McpServer {
  private notificationHandlers: Map<string, (params: unknown) => void> = new Map();
  private pendingNotifications: McpNotification[] = [];
  private notificationInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setupNotificationHandlers();
    this.startNotificationProcessor();
  }

  private setupNotificationHandlers() {
    // Handle conversation messages for monitoring
    this.handlers.set('notifications/conversation/message', async (params) => {
      const handler = this.notificationHandlers.get('conversation_message');
      if (handler) {
        handler(params);
      }
      return { success: true };
    });

    // Enable/disable notifications
    this.handlers.set('notifications/enable', async (_params) => {
      this.startNotificationProcessor();
      return { success: true };
    });

    this.handlers.set('notifications/disable', async (_params) => {
      this.stopNotificationProcessor();
      return { success: true };
    });
  }

  /**
   * Register a handler for conversation messages
   */
  onConversationMessage(handler: (params: {message: string, role: string}) => void): void {
    this.notificationHandlers.set('conversation_message', handler as (params: unknown) => void);
  }

  /**
   * Send a notification to Claude
   */
  sendNotification(method: string, params: unknown): void {
    const notification: McpNotification = { method, params };
    this.pendingNotifications.push(notification);
  }

  /**
   * Send a suggestion notification
   */
  sendSuggestion(suggestion: MonitoringSuggestion): void {
    this.sendNotification('notifications/suggestion', {
      type: suggestion.type,
      priority: suggestion.priority,
      message: suggestion.message,
      action: suggestion.action,
      reason: suggestion.reason,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a milestone notification
   */
  sendMilestone(milestone: AggregatedMilestone): void {
    this.sendNotification('notifications/milestone', {
      type: milestone.type,
      title: milestone.title,
      description: milestone.description,
      eventCount: milestone.events.length,
      timestamp: milestone.timestamp.toISOString()
    });
  }

  /**
   * Send a development status update
   */
  sendStatusUpdate(status: unknown): void {
    this.sendNotification('notifications/status', status);
  }

  /**
   * Start processing notifications
   */
  private startNotificationProcessor(): void {
    if (this.notificationInterval) return;

    this.notificationInterval = setInterval(() => {
      this.processNotifications();
    }, 1000); // Check every second
  }

  /**
   * Stop processing notifications
   */
  private stopNotificationProcessor(): void {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }
  }

  /**
   * Process pending notifications
   */
  private processNotifications(): void {
    if (this.pendingNotifications.length === 0) return;

    // Send all pending notifications
    while (this.pendingNotifications.length > 0) {
      const notification = this.pendingNotifications.shift();
      if (notification) {
        const response: JsonRpcResponse = {
          jsonrpc: '2.0',
          method: notification.method,
          params: notification.params
        };
        
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    }
  }

  /**
   * Override handleRequest to intercept conversation messages
   */
  async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    // Check if this is a conversation message
    if (request.method === 'conversation/message') {
      const handler = this.notificationHandlers.get('conversation_message');
      if (handler && request.params) {
        handler(request.params);
      }
    }

    return super.handleRequest(request);
  }

  /**
   * Clean up on shutdown
   */
  shutdown(): void {
    this.stopNotificationProcessor();
    this.pendingNotifications = [];
    this.notificationHandlers.clear();
  }
}