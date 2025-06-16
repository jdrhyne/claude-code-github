/**
 * Example VS Code Extension Integration
 * 
 * This shows how a VS Code extension could integrate with
 * the claude-code-github API to show real-time suggestions.
 */

import * as vscode from 'vscode';

const API_BASE = 'http://localhost:3000/api/v1';
const WS_BASE = 'ws://localhost:3001';

export class ClaudeCodeSuggestionsProvider {
  private apiToken: string;
  private statusBarItem: vscode.StatusBarItem;
  private diagnosticCollection: vscode.DiagnosticCollection;
  private eventSource?: EventSource;

  constructor(context: vscode.ExtensionContext) {
    // Get API token from settings
    this.apiToken = vscode.workspace.getConfiguration('claudeCode').get('apiToken') || '';
    
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.text = '$(sync~spin) Claude Code';
    this.statusBarItem.show();
    
    // Create diagnostic collection for showing suggestions
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('claude-code');
    
    // Register commands
    context.subscriptions.push(
      vscode.commands.registerCommand('claudeCode.showStatus', () => this.showStatus()),
      vscode.commands.registerCommand('claudeCode.showSuggestions', () => this.showSuggestions()),
      vscode.commands.registerCommand('claudeCode.dismissSuggestion', (id) => this.dismissSuggestion(id)),
      vscode.commands.registerCommand('claudeCode.executeSuggestion', (id, action) => this.executeSuggestionAction(id, action))
    );
    
    // Start monitoring
    this.startMonitoring();
    
    // Update status periodically
    setInterval(() => this.updateStatus(), 30000);
  }

  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || response.statusText);
    }

    return response.json();
  }

  private async updateStatus() {
    try {
      const status = await this.apiRequest('/status');
      const { uncommitted_changes, suggestions } = status.data.project;
      
      // Update status bar
      if (uncommitted_changes?.file_count > 0) {
        this.statusBarItem.text = `$(git-commit) ${uncommitted_changes.file_count} changes`;
        this.statusBarItem.tooltip = 'Click to see Claude Code suggestions';
      } else {
        this.statusBarItem.text = '$(check) Claude Code';
        this.statusBarItem.tooltip = 'All changes committed';
      }
      
      // Show suggestions as information messages
      if (suggestions?.length > 0) {
        const suggestion = suggestions[0];
        const actions = suggestion.actions?.map((a: any) => ({
          title: a.label,
          action: () => this.executeSuggestionAction(suggestion.id, a.type)
        })) || [];
        
        vscode.window.showInformationMessage(
          `Claude Code: ${suggestion.message}`,
          ...actions.map(a => a.title)
        ).then(selection => {
          const action = actions.find(a => a.title === selection);
          if (action) {
            action.action();
          }
        });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      this.statusBarItem.text = '$(error) Claude Code';
    }
  }

  private async showStatus() {
    try {
      const status = await this.apiRequest('/status/enhanced');
      
      // Create a webview to show detailed status
      const panel = vscode.window.createWebviewPanel(
        'claudeCodeStatus',
        'Claude Code Status',
        vscode.ViewColumn.One,
        {}
      );
      
      panel.webview.html = this.getStatusHtml(status.data);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to get status: ${error.message}`);
    }
  }

  private async showSuggestions() {
    try {
      const response = await this.apiRequest('/suggestions');
      const suggestions = response.data.suggestions;
      
      if (suggestions.length === 0) {
        vscode.window.showInformationMessage('No active suggestions');
        return;
      }
      
      // Show quick pick with suggestions
      const items = suggestions.map((s: any) => ({
        label: `$(${this.getIconForPriority(s.priority)}) ${s.message}`,
        description: s.type,
        detail: s.actions?.map((a: any) => a.label).join(' • '),
        suggestion: s
      }));
      
      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a suggestion to act on'
      });
      
      if (selected) {
        this.showSuggestionActions(selected.suggestion);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to get suggestions: ${error.message}`);
    }
  }

  private async showSuggestionActions(suggestion: any) {
    if (!suggestion.actions || suggestion.actions.length === 0) {
      return;
    }
    
    const items = suggestion.actions.map((a: any) => ({
      label: a.label,
      description: a.type,
      action: a
    }));
    
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select an action'
    });
    
    if (selected) {
      await this.executeSuggestionAction(suggestion.id, selected.action.type);
    }
  }

  private async dismissSuggestion(id: string) {
    try {
      await this.apiRequest(`/suggestions/${id}/dismiss`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Dismissed by user' })
      });
      
      vscode.window.showInformationMessage('Suggestion dismissed');
      this.updateStatus();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to dismiss suggestion: ${error.message}`);
    }
  }

  private async executeSuggestionAction(id: string, action: string) {
    try {
      const result = await this.apiRequest(`/suggestions/${id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      
      vscode.window.showInformationMessage(`Action '${action}' executed successfully`);
      this.updateStatus();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to execute action: ${error.message}`);
    }
  }

  private startMonitoring() {
    // Use Server-Sent Events for real-time updates
    this.eventSource = new EventSource(`${API_BASE}/monitoring/stream`, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`
      }
    });
    
    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'suggestion.created') {
        // Show notification for new suggestions
        this.showSuggestionNotification(data.data);
      } else if (data.type === 'milestone.reached') {
        // Show milestone notification
        vscode.window.showInformationMessage(
          `🎉 Milestone: ${data.data.type} - ${data.data.description}`
        );
      }
      
      // Update status bar
      this.updateStatus();
    };
    
    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      // Reconnect after 5 seconds
      setTimeout(() => this.startMonitoring(), 5000);
    };
  }

  private showSuggestionNotification(suggestion: any) {
    const actions = suggestion.actions?.map((a: any) => a.label) || [];
    
    vscode.window.showInformationMessage(
      `Claude Code: ${suggestion.message}`,
      ...actions
    ).then(selection => {
      if (selection) {
        const action = suggestion.actions.find((a: any) => a.label === selection);
        if (action) {
          this.executeSuggestionAction(suggestion.id, action.type);
        }
      }
    });
  }

  private getIconForPriority(priority: string): string {
    switch (priority) {
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'light-bulb';
      default: return 'circle-outline';
    }
  }

  private getStatusHtml(status: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
          }
          .section {
            margin-bottom: 20px;
          }
          .metric {
            display: inline-block;
            margin: 10px;
            padding: 10px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
          }
          .metric-value {
            font-size: 24px;
            font-weight: bold;
          }
          .metric-label {
            font-size: 12px;
            opacity: 0.8;
          }
        </style>
      </head>
      <body>
        <h1>Claude Code Status</h1>
        
        <div class="section">
          <h2>Current Branch</h2>
          <div class="metric">
            <div class="metric-value">${status.branch.current}</div>
            <div class="metric-label">${status.branch.isProtected ? 'Protected' : 'Feature'} Branch</div>
          </div>
        </div>
        
        <div class="section">
          <h2>Uncommitted Changes</h2>
          <div class="metric">
            <div class="metric-value">${status.uncommittedChanges?.file_count || 0}</div>
            <div class="metric-label">Files Changed</div>
          </div>
        </div>
        
        <div class="section">
          <h2>Pull Requests</h2>
          ${status.pullRequests?.map((pr: any) => `
            <div class="metric">
              <div class="metric-value">#${pr.number}</div>
              <div class="metric-label">${pr.title}</div>
            </div>
          `).join('') || '<p>No active pull requests</p>'}
        </div>
      </body>
      </html>
    `;
  }

  dispose() {
    this.statusBarItem.dispose();
    this.diagnosticCollection.dispose();
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}

// Extension activation
export function activate(context: vscode.ExtensionContext) {
  const provider = new ClaudeCodeSuggestionsProvider(context);
  context.subscriptions.push(provider);
}

export function deactivate() {
  // Cleanup handled by dispose()
}