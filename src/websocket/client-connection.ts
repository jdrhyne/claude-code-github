import { Socket } from 'socket.io';

export class ClientConnection {
  private subscribedEvents: Set<string> = new Set();
  private subscribedProjects: Set<string> = new Set();
  private connectedAt: Date;

  constructor(private socket: Socket) {
    this.connectedAt = new Date();
  }

  /**
   * Subscribe to events and/or projects
   */
  subscribe(events: string[], projects: string[]): void {
    // Add events to subscription
    for (const event of events) {
      this.subscribedEvents.add(event);
    }

    // Add projects to subscription
    for (const project of projects) {
      this.subscribedProjects.add(project);
    }
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(events: string[]): void {
    for (const event of events) {
      this.subscribedEvents.delete(event);
    }
  }

  /**
   * Check if this connection should receive an event
   */
  shouldReceive(eventType: string, data: any): boolean {
    // Check if subscribed to this event type or all events
    if (!this.subscribedEvents.has(eventType) && !this.subscribedEvents.has('*')) {
      return false;
    }

    // If event has a project, check project subscription
    if (data.project && this.subscribedProjects.size > 0) {
      return this.subscribedProjects.has(data.project) || this.subscribedProjects.has('*');
    }

    return true;
  }

  /**
   * Send data to the client
   */
  send(event: string, data: any): void {
    this.socket.emit(event, {
      type: event,
      timestamp: new Date().toISOString(),
      data
    });
  }

  /**
   * Get subscription details
   */
  getSubscriptions(): { events: string[], projects: string[] } {
    return {
      events: Array.from(this.subscribedEvents),
      projects: Array.from(this.subscribedProjects)
    };
  }

  /**
   * Get connection time
   */
  getConnectedTime(): Date {
    return this.connectedAt;
  }

  /**
   * Get socket ID
   */
  getId(): string {
    return this.socket.id;
  }

  /**
   * Check if connection is still active
   */
  isConnected(): boolean {
    return this.socket.connected;
  }

  /**
   * Disconnect the client
   */
  disconnect(): void {
    this.socket.disconnect(true);
  }

  /**
   * Send an error to the client
   */
  sendError(message: string, code?: string): void {
    this.socket.emit('error', {
      message,
      code,
      timestamp: new Date().toISOString()
    });
  }
}