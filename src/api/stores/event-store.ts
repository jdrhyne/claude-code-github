import { StoredEvent, EventFilters } from '../types.js';

export class EventStore {
  private events: Map<string, StoredEvent> = new Map();
  private eventsByType: Map<string, Set<string>> = new Map();
  private eventsByProject: Map<string, Set<string>> = new Map();
  private maxEvents: number;
  private maxAge: number; // milliseconds

  constructor(maxEvents = 10000, maxAgeHours = 24) {
    this.maxEvents = maxEvents;
    this.maxAge = maxAgeHours * 60 * 60 * 1000;
  }

  addEvent(event: Omit<StoredEvent, 'id' | 'timestamp'>): StoredEvent {
    const storedEvent: StoredEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event
    };

    this.events.set(storedEvent.id, storedEvent);

    // Index by type
    if (!this.eventsByType.has(event.type)) {
      this.eventsByType.set(event.type, new Set());
    }
    this.eventsByType.get(event.type)!.add(storedEvent.id);

    // Index by project
    if (event.project) {
      if (!this.eventsByProject.has(event.project)) {
        this.eventsByProject.set(event.project, new Set());
      }
      this.eventsByProject.get(event.project)!.add(storedEvent.id);
    }

    // Cleanup if needed
    if (this.events.size > this.maxEvents) {
      this.pruneOldEvents();
    }

    return storedEvent;
  }

  getEvents(filters: EventFilters = {}): StoredEvent[] {
    let eventIds: Set<string> | undefined;

    // Filter by type
    if (filters.type) {
      eventIds = this.eventsByType.get(filters.type);
      if (!eventIds) return [];
    }

    // Filter by project
    if (filters.project) {
      const projectIds = this.eventsByProject.get(filters.project);
      if (!projectIds) return [];
      
      if (eventIds) {
        // Intersection of type and project filters
        eventIds = new Set([...eventIds].filter(id => projectIds.has(id)));
      } else {
        eventIds = projectIds;
      }
    }

    // Get all events if no type/project filter
    const events = eventIds 
      ? Array.from(eventIds).map(id => this.events.get(id)!).filter(Boolean)
      : Array.from(this.events.values());

    // Filter by time
    let filteredEvents = events;
    if (filters.since) {
      filteredEvents = filteredEvents.filter(e => e.timestamp > filters.since!);
    }

    // Sort by timestamp descending
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit results
    if (filters.limit) {
      filteredEvents = filteredEvents.slice(0, filters.limit);
    }

    return filteredEvents;
  }

  getEvent(id: string): StoredEvent | undefined {
    return this.events.get(id);
  }

  clearEvents(): void {
    this.events.clear();
    this.eventsByType.clear();
    this.eventsByProject.clear();
  }

  getStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByProject: Record<string, number>;
    oldestEvent?: Date;
    newestEvent?: Date;
  } {
    const stats: any = {
      totalEvents: this.events.size,
      eventsByType: {},
      eventsByProject: {}
    };

    // Count by type
    for (const [type, ids] of this.eventsByType) {
      stats.eventsByType[type] = ids.size;
    }

    // Count by project
    for (const [project, ids] of this.eventsByProject) {
      stats.eventsByProject[project] = ids.size;
    }

    // Find oldest and newest
    if (this.events.size > 0) {
      const timestamps = Array.from(this.events.values()).map(e => e.timestamp);
      stats.oldestEvent = new Date(Math.min(...timestamps.map(t => t.getTime())));
      stats.newestEvent = new Date(Math.max(...timestamps.map(t => t.getTime())));
    }

    return stats;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private pruneOldEvents(): void {
    const now = Date.now();
    const cutoffTime = now - this.maxAge;
    const sortedEvents = Array.from(this.events.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Remove old events
    for (const event of sortedEvents) {
      if (event.timestamp.getTime() < cutoffTime || this.events.size > this.maxEvents) {
        this.removeEvent(event.id);
      } else {
        break; // Events are sorted, so we can stop
      }
    }

    // If still over limit, remove oldest
    while (this.events.size > this.maxEvents && sortedEvents.length > 0) {
      const oldest = sortedEvents.shift()!;
      this.removeEvent(oldest.id);
    }
  }

  private removeEvent(id: string): void {
    const event = this.events.get(id);
    if (!event) return;

    this.events.delete(id);

    // Remove from type index
    const typeIds = this.eventsByType.get(event.type);
    if (typeIds) {
      typeIds.delete(id);
      if (typeIds.size === 0) {
        this.eventsByType.delete(event.type);
      }
    }

    // Remove from project index
    if (event.project) {
      const projectIds = this.eventsByProject.get(event.project);
      if (projectIds) {
        projectIds.delete(id);
        if (projectIds.size === 0) {
          this.eventsByProject.delete(event.project);
        }
      }
    }
  }
}