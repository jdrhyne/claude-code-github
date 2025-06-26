import { DomainEvent } from './domain-event.js';

/**
 * Handler for domain events
 */
export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void>;

/**
 * Interface for event bus implementations
 */
export interface EventBus {
  /**
   * Publish domain events
   */
  publish(events: DomainEvent[]): Promise<void>;

  /**
   * Subscribe to a specific event type
   */
  subscribe(eventType: string, handler: EventHandler): void;

  /**
   * Subscribe to all events
   */
  subscribeToAll(handler: EventHandler): void;

  /**
   * Unsubscribe a handler
   */
  unsubscribe(eventType: string, handler: EventHandler): void;
}