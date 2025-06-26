import { Entity } from './entity.js';
import { DomainEvent } from '../events/domain-event.js';

/**
 * Base class for aggregate roots.
 * Aggregate roots are the entry point to an aggregate and manage domain events.
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _domainEvents: DomainEvent[] = [];
  private _version: number = 0;

  /**
   * Add a domain event to be dispatched
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Get all uncommitted domain events
   */
  getUncommittedEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * Mark all events as committed
   */
  markEventsAsCommitted(): void {
    this._domainEvents = [];
  }

  /**
   * Clear all events without marking as committed
   */
  clearEvents(): void {
    this._domainEvents = [];
  }

  /**
   * Get the current version of the aggregate
   */
  get version(): number {
    return this._version;
  }

  /**
   * Increment the version after applying an event
   */
  protected incrementVersion(): void {
    this._version++;
  }

  /**
   * Apply a domain event to update the aggregate state
   * Must be implemented by concrete aggregates
   */
  abstract apply(event: DomainEvent): void;
}