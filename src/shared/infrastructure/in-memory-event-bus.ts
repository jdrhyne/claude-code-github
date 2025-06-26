import { EventBus, EventHandler } from '../events/event-bus.js';
import { DomainEvent } from '../events/domain-event.js';

/**
 * In-memory implementation of EventBus for development and testing
 */
export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private allHandlers: EventHandler[] = [];

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      // Notify specific event type handlers
      const handlers = this.handlers.get(event.eventType) || [];
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (_error) {
          console.error(`Error handling event ${event.eventType}:`, error);
        }
      }

      // Notify all-event handlers
      for (const handler of this.allHandlers) {
        try {
          await handler(event);
        } catch (_error) {
          console.error(`Error handling event ${event.eventType} in all-handler:`, error);
        }
      }
    }
  }

  subscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  subscribeToAll(handler: EventHandler): void {
    this.allHandlers.push(handler);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.handlers.set(eventType, handlers);
    }
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
    this.allHandlers = [];
  }
}