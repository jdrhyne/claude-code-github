/**
 * Base interface for all domain events
 */
export interface DomainEvent {
  /**
   * The aggregate ID that this event belongs to
   */
  aggregateId: string;

  /**
   * The type of event (e.g., 'BranchCreated', 'CommitMade')
   */
  eventType: string;

  /**
   * The version of the event schema
   */
  eventVersion: number;

  /**
   * When the event occurred
   */
  occurredOn: Date;

  /**
   * The event payload containing event-specific data
   */
  payload: Record<string, any>;

  /**
   * Optional metadata about the event
   */
  metadata?: EventMetadata;
}

/**
 * Metadata that can be attached to events
 */
export interface EventMetadata {
  /**
   * User or system that triggered the event
   */
  triggeredBy?: string;

  /**
   * Correlation ID for tracking related events
   */
  correlationId?: string;

  /**
   * Causation ID linking to the command that caused this event
   */
  causationId?: string;

  /**
   * Additional context
   */
  context?: Record<string, any>;
}

/**
 * Helper function to create a domain event
 */
export function createDomainEvent<TPayload extends Record<string, any>>(
  aggregateId: string,
  eventType: string,
  payload: TPayload,
  metadata?: EventMetadata
): DomainEvent {
  return {
    aggregateId,
    eventType,
    eventVersion: 1,
    occurredOn: new Date(),
    payload,
    metadata
  };
}