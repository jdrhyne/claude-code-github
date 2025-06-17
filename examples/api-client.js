#!/usr/bin/env node

/**
 * Example API client for claude-code-github
 * 
 * This demonstrates how to interact with the API server
 * to receive development suggestions and monitor events.
 */

const API_BASE = 'http://localhost:3000/api/v1';
const API_TOKEN = 'your-api-token'; // Replace with your actual token

// Helper function for API requests
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API Error: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

// Get current development status
async function getStatus() {
  const status = await apiRequest('/status');
  console.log('Development Status:', JSON.stringify(status.data, null, 2));
  return status.data;
}

// Get recent suggestions
async function getSuggestions(filters = {}) {
  const params = new URLSearchParams(filters);
  const suggestions = await apiRequest(`/suggestions?${params}`);
  
  console.log(`\nFound ${suggestions.data.total} suggestions:`);
  suggestions.data.suggestions.forEach(s => {
    console.log(`- [${s.priority}] ${s.message}`);
    if (s.actions?.length > 0) {
      console.log(`  Actions: ${s.actions.map(a => a.label).join(', ')}`);
    }
  });
  
  return suggestions.data;
}

// Get monitoring events
async function getEvents(filters = {}) {
  const params = new URLSearchParams(filters);
  const events = await apiRequest(`/monitoring/events?${params}`);
  
  console.log(`\nRecent events (${events.data.total}):`);
  events.data.events.forEach(e => {
    console.log(`- ${e.type} at ${new Date(e.timestamp).toLocaleString()}`);
  });
  
  return events.data;
}

// Dismiss a suggestion
async function dismissSuggestion(suggestionId) {
  const result = await apiRequest(`/suggestions/${suggestionId}/dismiss`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'Not relevant' })
  });
  
  console.log(`\nDismissed suggestion ${suggestionId}`);
  return result.data;
}

// Execute a suggestion action
async function executeSuggestionAction(suggestionId, action, params = {}) {
  const result = await apiRequest(`/suggestions/${suggestionId}/action`, {
    method: 'POST',
    body: JSON.stringify({ action, params })
  });
  
  console.log(`\nExecuted action '${action}' for suggestion ${suggestionId}`);
  return result.data;
}

// Stream events using Server-Sent Events
function streamEvents() {
  console.log('\nStreaming events (press Ctrl+C to stop)...');
  
  const eventSource = new EventSource(`${API_BASE}/monitoring/stream`, {
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`
    }
  });

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log(`[${new Date().toLocaleTimeString()}] ${data.type}:`, data);
  };

  eventSource.onerror = (error) => {
    console.error('Stream error:', error);
    eventSource.close();
  };

  return eventSource;
}

// Main example flow
async function main() {
  try {
    console.log('Claude Code GitHub API Client Example\n');
    
    // Get current status
    await getStatus();
    
    // Get recent suggestions
    const suggestions = await getSuggestions({ limit: 5 });
    
    // Get recent events
    await getEvents({ limit: 10 });
    
    // Example: Dismiss the first suggestion if any exist
    if (suggestions.suggestions.length > 0) {
      const firstSuggestion = suggestions.suggestions[0];
      await dismissSuggestion(firstSuggestion.id);
    }
    
    // Note: Streaming would run indefinitely
    // Uncomment to test: streamEvents();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main();
}

module.exports = {
  apiRequest,
  getStatus,
  getSuggestions,
  getEvents,
  dismissSuggestion,
  executeSuggestionAction,
  streamEvents
};