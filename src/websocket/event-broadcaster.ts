import { WebSocketServer } from './server.js';
import { EventStore } from '../api/stores/event-store.js';
import { WebhookManager } from '../webhooks/manager.js';
import { SuggestionEvent } from '../api/types.js';

export interface BroadcastEvent {
  type: string;
  project?: string;
  data: any;
}

export class EventBroadcaster {
  constructor(
    private wsServer: WebSocketServer | null,
    private eventStore: EventStore,
    private webhookManager: WebhookManager | null
  ) {}

  /**
   * Broadcast a suggestion event
   */
  async broadcastSuggestion(suggestion: SuggestionEvent): Promise<void> {
    const event: BroadcastEvent = {
      type: 'suggestion.created',
      project: suggestion.project,
      data: suggestion
    };

    await this.broadcast(event);
  }

  /**
   * Broadcast a milestone event
   */
  async broadcastMilestone(milestone: any): Promise<void> {
    const event: BroadcastEvent = {
      type: 'milestone.reached',
      project: milestone.project,
      data: milestone
    };

    await this.broadcast(event);
  }

  /**
   * Broadcast a monitoring event
   */
  async broadcastMonitoringEvent(type: string, data: any): Promise<void> {
    const event: BroadcastEvent = {
      type,
      project: data.project,
      data
    };

    await this.broadcast(event);
  }

  /**
   * Core broadcast method
   */
  private async broadcast(event: BroadcastEvent): Promise<void> {
    // Store event
    const storedEvent = this.eventStore.addEvent({
      type: event.type,
      project: event.project,
      data: event.data
    });

    // Broadcast to WebSocket clients
    if (this.wsServer) {
      this.wsServer.broadcast(event.type, {
        id: storedEvent.id,
        ...event.data
      });
    }

    // Deliver to webhooks
    if (this.webhookManager) {
      await this.webhookManager.deliver({
        id: storedEvent.id,
        type: event.type,
        timestamp: storedEvent.timestamp,
        project: event.project,
        data: event.data
      });
    }
  }

  /**
   * Send event to specific client
   */
  sendToClient(clientId: string, event: BroadcastEvent): void {
    if (this.wsServer) {
      this.wsServer.sendToClient(clientId, event.type, event.data);
    }
  }
}