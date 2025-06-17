import { SuggestionEvent, EventFilters } from '../types.js';
import { EventStore } from './event-store.js';

export class SuggestionStore {
  private suggestions: Map<string, SuggestionEvent> = new Map();
  private eventStore: EventStore;

  constructor(eventStore: EventStore) {
    this.eventStore = eventStore;
  }

  addSuggestion(suggestion: Omit<SuggestionEvent, 'id' | 'timestamp'>): SuggestionEvent {
    const fullSuggestion: SuggestionEvent = {
      id: this.generateSuggestionId(),
      timestamp: new Date(),
      ...suggestion
    };

    this.suggestions.set(fullSuggestion.id, fullSuggestion);

    // Also store in event store
    this.eventStore.addEvent({
      type: 'suggestion.created',
      project: suggestion.project,
      data: fullSuggestion
    });

    return fullSuggestion;
  }

  getSuggestion(id: string): SuggestionEvent | undefined {
    return this.suggestions.get(id);
  }

  getSuggestions(filters: EventFilters = {}): SuggestionEvent[] {
    let suggestions = Array.from(this.suggestions.values());

    // Filter by project
    if (filters.project) {
      suggestions = suggestions.filter(s => s.project === filters.project);
    }

    // Filter by type
    if (filters.type) {
      suggestions = suggestions.filter(s => s.type === filters.type);
    }

    // Filter by time
    if (filters.since) {
      suggestions = suggestions.filter(s => s.timestamp > filters.since!);
    }

    // Sort by timestamp descending
    suggestions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit results
    if (filters.limit) {
      suggestions = suggestions.slice(0, filters.limit);
    }

    return suggestions;
  }

  dismissSuggestion(id: string): boolean {
    const suggestion = this.suggestions.get(id);
    if (!suggestion) {
      return false;
    }

    this.suggestions.delete(id);

    // Store dismissal event
    this.eventStore.addEvent({
      type: 'suggestion.dismissed',
      project: suggestion.project,
      data: { suggestionId: id }
    });

    return true;
  }

  actionSuggestion(id: string, action: string, params?: any): boolean {
    const suggestion = this.suggestions.get(id);
    if (!suggestion) {
      return false;
    }

    // Store action event
    this.eventStore.addEvent({
      type: 'suggestion.actioned',
      project: suggestion.project,
      data: { 
        suggestionId: id,
        action,
        params
      }
    });

    // Remove suggestion after action
    this.suggestions.delete(id);

    return true;
  }

  clearSuggestions(): void {
    this.suggestions.clear();
  }

  getStats(): {
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byProject: Record<string, number>;
  } {
    const stats = {
      total: this.suggestions.size,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      byProject: {} as Record<string, number>
    };

    for (const suggestion of this.suggestions.values()) {
      // Count by type
      stats.byType[suggestion.type] = (stats.byType[suggestion.type] || 0) + 1;

      // Count by priority
      stats.byPriority[suggestion.priority] = (stats.byPriority[suggestion.priority] || 0) + 1;

      // Count by project
      stats.byProject[suggestion.project] = (stats.byProject[suggestion.project] || 0) + 1;
    }

    return stats;
  }

  private generateSuggestionId(): string {
    return `sugg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Prune old suggestions (called periodically)
  pruneOldSuggestions(maxAgeHours = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    for (const [id, suggestion] of this.suggestions) {
      if (suggestion.timestamp < cutoffTime) {
        this.suggestions.delete(id);
      }
    }
  }
}