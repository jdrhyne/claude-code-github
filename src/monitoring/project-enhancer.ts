/**
 * Project Enhancer - Utilities for better project visibility in monitoring
 */

/**
 * Extract project name from full path
 */
export function getProjectName(fullPath: string): string {
  // Extract last directory name from path
  const parts = fullPath.split('/');
  return parts[parts.length - 1] || fullPath;
}

/**
 * Format project path for display
 */
export function formatProjectPath(fullPath: string, maxLength: number = 50): string {
  if (fullPath.length <= maxLength) {
    return fullPath;
  }
  
  // Shorten path keeping project name visible
  const projectName = getProjectName(fullPath);
  const availableLength = maxLength - projectName.length - 4; // 4 for ".../""
  
  if (availableLength <= 0) {
    return projectName;
  }
  
  const pathParts = fullPath.split('/');
  let shortPath = '';
  
  // Try to keep as much of the beginning as possible
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (shortPath.length + part.length + 1 < availableLength) {
      shortPath += (shortPath ? '/' : '') + part;
    } else {
      shortPath += '/...';
      break;
    }
  }
  
  return shortPath + '/' + projectName;
}

/**
 * Get project display info with emoji
 */
export function getProjectDisplay(fullPath: string): { name: string; emoji: string; color: string } {
  const name = getProjectName(fullPath);
  
  // Map specific projects to emojis and colors
  const projectMappings: Record<string, { emoji: string; color: string }> = {
    'claude-code-github': { emoji: '🤖', color: 'cyan' },
    'AgentCopy': { emoji: '📝', color: 'green' },
    'claude-yes': { emoji: '✅', color: 'yellow' },
    'vibetunnel': { emoji: '🌐', color: 'blue' },
    'jdrhyne-me': { emoji: '👤', color: 'magenta' },
    'volks-typo': { emoji: '✏️', color: 'white' },
    'nutrient-dws-client-python': { emoji: '🐍', color: 'yellow' },
    'PSPDFKit-Website': { emoji: '🌍', color: 'blue' },
    'Vibe-Doc-Brrr': { emoji: '📄', color: 'green' },
  };
  
  const mapping = projectMappings[name] || { emoji: '📁', color: 'gray' };
  
  return {
    name,
    emoji: mapping.emoji,
    color: mapping.color,
  };
}

/**
 * Format event with enhanced project visibility
 */
export function formatEventWithProject(event: any): string {
  const project = getProjectDisplay(event.context.path);
  const projectTag = `${project.emoji} ${project.name}`;
  
  return `[${projectTag}] ${event.message}`;
}

/**
 * Group events by project
 */
export function groupEventsByProject(events: any[]): Map<string, any[]> {
  const grouped = new Map<string, any[]>();
  
  events.forEach(event => {
    const path = event.context?.path || 'unknown';
    if (!grouped.has(path)) {
      grouped.set(path, []);
    }
    grouped.get(path)!.push(event);
  });
  
  return grouped;
}

/**
 * Get activity summary by project
 */
export function getProjectActivitySummary(events: any[]): string[] {
  const grouped = groupEventsByProject(events);
  const summary: string[] = [];
  
  grouped.forEach((projectEvents, path) => {
    const project = getProjectDisplay(path);
    const eventCounts = projectEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const counts = Object.entries(eventCounts)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');
    
    summary.push(`${project.emoji} ${project.name}: ${counts}`);
  });
  
  return summary;
}