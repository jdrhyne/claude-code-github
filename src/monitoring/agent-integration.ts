/**
 * Agent Integration Module
 * 
 * Connects the existing automation and monitoring systems with the new
 * agent event system for real-time visualization.
 */

import { agentEvents, AgentEventType, ProjectContext, AgentDecision } from './agent-events.js';
import { EventAggregator } from './event-aggregator.js';
import { AutomationTools } from '../tools/automation-tools.js';
import { DevelopmentTools } from '../development-tools.js';

/**
 * Integrates existing systems with the agent event system
 */
export class AgentIntegration {
  private eventAggregator?: EventAggregator;
  private automationTools?: AutomationTools;
  private devTools?: DevelopmentTools;
  private currentProject?: string;

  /**
   * Initialize with existing system components
   */
  public initialize(
    eventAggregator: EventAggregator,
    automationTools: AutomationTools,
    devTools: DevelopmentTools
  ): void {
    this.eventAggregator = eventAggregator;
    this.automationTools = automationTools;
    this.devTools = devTools;

    this.setupEventListeners();
  }

  /**
   * Set the current project being monitored
   */
  public setCurrentProject(projectPath: string): void {
    this.currentProject = projectPath;
    
    // Emit project switch event
    agentEvents.emitAgentActivity({
      type: 'scanning',
      confidence: 1.0,
      context: this.createProjectContext(projectPath),
      message: `Switching to project: ${projectPath}`,
    });
  }

  /**
   * Setup listeners for existing system events
   */
  private setupEventListeners(): void {
    if (!this.eventAggregator) return;

    // Listen for file system changes
    this.eventAggregator.on('files-changed', (data) => {
      this.handleFilesChanged(data);
    });

    // Listen for git changes
    this.eventAggregator.on('git-status-changed', (data) => {
      this.handleGitStatusChanged(data);
    });

    // Listen for automation decisions
    this.eventAggregator.on('automation-decision', (data) => {
      this.handleAutomationDecision(data);
    });

    // Listen for test results
    this.eventAggregator.on('test-results', (data) => {
      this.handleTestResults(data);
    });
  }

  /**
   * Handle file system changes
   */
  private handleFilesChanged(data: any): void {
    if (!this.currentProject) return;

    agentEvents.emitAgentActivity({
      type: 'scanning',
      confidence: 1.0,
      context: this.createProjectContext(this.currentProject, data),
      message: `Files changed: ${data.files?.length || 0} files`,
      reasoning: data.files?.map((f: any) => `${f.status}: ${f.path}`) || [],
      metadata: { files: data.files },
    });

    // Follow up with analysis
    setTimeout(() => {
      this.analyzeChanges(data);
    }, 500);
  }

  /**
   * Handle git status changes
   */
  private handleGitStatusChanged(data: any): void {
    if (!this.currentProject) return;

    const eventType: AgentEventType = data.hasUncommittedChanges ? 'analyzing' : 'idle';
    
    agentEvents.emitAgentActivity({
      type: eventType,
      confidence: 0.8,
      context: this.createProjectContext(this.currentProject, data),
      message: `Git status: ${data.branch} (${data.hasUncommittedChanges ? 'dirty' : 'clean'})`,
      reasoning: [
        `Current branch: ${data.branch}`,
        `Protected: ${data.isProtected ? 'Yes' : 'No'}`,
        `Uncommitted changes: ${data.hasUncommittedChanges ? 'Yes' : 'No'}`,
      ],
      metadata: data,
    });
  }

  /**
   * Handle automation decisions
   */
  private handleAutomationDecision(data: any): void {
    if (!this.currentProject) return;

    const decision: AgentDecision = {
      id: data.id || `decision_${Date.now()}`,
      type: data.type || 'commit',
      action: data.action || 'Unknown action',
      confidence: data.confidence || 0.5,
      reasoning: data.reasoning || [],
      requiresApproval: data.requiresApproval !== false,
      timestamp: new Date(),
      suggestedCommand: data.suggestedCommand,
    };

    agentEvents.emitAgentActivity({
      type: 'suggesting',
      confidence: decision.confidence,
      context: this.createProjectContext(this.currentProject),
      message: `Suggesting: ${decision.action}`,
      reasoning: decision.reasoning,
      decision,
      metadata: data,
    });
  }

  /**
   * Handle test results
   */
  private handleTestResults(data: any): void {
    if (!this.currentProject) return;

    const success = data.success || data.passed;
    const eventType: AgentEventType = success ? 'analyzing' : 'error';

    agentEvents.emitAgentActivity({
      type: eventType,
      confidence: success ? 0.9 : 0.3,
      context: this.createProjectContext(this.currentProject, { testsPassing: success }),
      message: `Tests ${success ? 'passed' : 'failed'}`,
      reasoning: data.details ? [data.details] : [],
      metadata: data,
    });
  }

  /**
   * Analyze file changes and emit analysis event
   */
  private analyzeChanges(data: any): void {
    if (!this.currentProject || !data.files) return;

    // Simple analysis logic
    const files = data.files;
    const confidence = this.calculateChangeConfidence(files);
    const analysis = this.generateChangeAnalysis(files);

    agentEvents.emitAgentActivity({
      type: 'analyzing',
      confidence,
      context: this.createProjectContext(this.currentProject, data),
      message: `Analysis: ${analysis.summary}`,
      reasoning: analysis.reasoning,
      metadata: { analysis },
    });

    // If high confidence, suggest an action
    if (confidence > 0.7) {
      setTimeout(() => {
        this.suggestAction(analysis, confidence);
      }, 1000);
    }
  }

  /**
   * Calculate confidence based on file changes
   */
  private calculateChangeConfidence(files: any[]): number {
    if (!files || files.length === 0) return 0;

    let score = 0.5; // Base score

    // Factors that increase confidence
    if (files.some(f => f.path.includes('test'))) score += 0.2; // Tests included
    if (files.length <= 5) score += 0.1; // Small change set
    if (files.every(f => f.status === 'modified')) score += 0.1; // Only modifications
    
    // Factors that decrease confidence
    if (files.length > 10) score -= 0.2; // Large change set
    if (files.some(f => f.status === 'deleted')) score -= 0.1; // Deletions

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Generate analysis of file changes
   */
  private generateChangeAnalysis(files: any[]): { summary: string; reasoning: string[] } {
    if (!files || files.length === 0) {
      return { summary: 'No changes detected', reasoning: [] };
    }

    const summary = `${files.length} files modified`;
    const reasoning = [
      `${files.filter(f => f.status === 'modified').length} modified`,
      `${files.filter(f => f.status === 'added').length} added`,
      `${files.filter(f => f.status === 'deleted').length} deleted`,
    ].filter(r => !r.endsWith('0'));

    // Add theme analysis
    const hasTests = files.some(f => f.path.includes('test'));
    const hasComponents = files.some(f => f.path.includes('component'));
    const hasAPI = files.some(f => f.path.includes('api'));

    if (hasTests) reasoning.push('Includes test files');
    if (hasComponents) reasoning.push('UI component changes');
    if (hasAPI) reasoning.push('API modifications');

    return { summary, reasoning };
  }

  /**
   * Suggest an action based on analysis
   */
  private suggestAction(analysis: any, confidence: number): void {
    if (!this.currentProject) return;

    const action = this.determineAction(analysis);
    
    const decision: AgentDecision = {
      id: `suggestion_${Date.now()}`,
      type: action.type,
      action: action.description,
      confidence,
      reasoning: action.reasoning,
      requiresApproval: true,
      timestamp: new Date(),
      suggestedCommand: action.command,
    };

    agentEvents.emitAgentActivity({
      type: 'suggesting',
      confidence,
      context: this.createProjectContext(this.currentProject),
      message: `Suggesting: ${action.description}`,
      reasoning: decision.reasoning,
      decision,
    });
  }

  /**
   * Determine appropriate action based on analysis
   */
  private determineAction(analysis: any): {
    type: 'commit' | 'branch' | 'pr' | 'push' | 'warning';
    description: string;
    command: string;
    reasoning: string[];
  } {
    // Simple action determination logic
    const reasoning = ['Changes appear cohesive', 'Quality threshold met'];

    return {
      type: 'commit',
      description: 'Commit current changes',
      command: 'git add . && git commit -m "feat: implement changes"',
      reasoning,
    };
  }

  /**
   * Create project context from current state
   */
  private createProjectContext(projectPath: string, additionalData?: any): ProjectContext {
    return {
      path: projectPath,
      branch: additionalData?.branch || 'main',
      isProtected: additionalData?.isProtected || false,
      hasUncommittedChanges: additionalData?.hasUncommittedChanges || false,
      filesChanged: additionalData?.files?.length || 0,
      lastCommit: additionalData?.lastCommit,
      testsPassing: additionalData?.testsPassing,
    };
  }

  /**
   * Emit a manual event (for testing or manual triggers)
   */
  public emitEvent(type: AgentEventType, message: string, confidence: number = 0.8): void {
    if (!this.currentProject) return;

    agentEvents.emitAgentActivity({
      type,
      confidence,
      context: this.createProjectContext(this.currentProject),
      message,
    });
  }

  /**
   * Simulate agent activity for demonstration
   */
  public simulateActivity(): void {
    if (!this.currentProject) {
      this.currentProject = '/Users/admin/Projects/claude-code-github';
    }

    // Simulate a typical workflow
    setTimeout(() => this.emitEvent('scanning', 'Scanning for changes...', 1.0), 1000);
    setTimeout(() => this.emitEvent('analyzing', 'Analyzing detected changes...', 0.85), 3000);
    setTimeout(() => this.emitEvent('suggesting', 'Suggesting commit action...', 0.92), 5000);
    setTimeout(() => this.emitEvent('waiting', 'Waiting for user approval...', 1.0), 7000);
  }
}

/**
 * Global agent integration instance
 */
export const agentIntegration = new AgentIntegration();