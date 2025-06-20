import { 
  DecisionContext, 
  LLMDecision, 
  AutomationConfig,
  ProjectState,
  RiskAssessment,
  TimeContext
} from '../types.js';
import { BaseLLMProvider } from './providers/base-provider.js';
import { LLMProviderFactory } from './providers/provider-factory.js';
import { PromptBuilder } from './prompt-builder.js';
import { LearningEngine } from '../learning/learning-engine.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class LLMDecisionAgent {
  private provider: BaseLLMProvider;
  private config: AutomationConfig;
  private promptBuilder: PromptBuilder;
  private learningEngine?: LearningEngine;
  
  constructor(config: AutomationConfig) {
    this.config = config;
    this.provider = LLMProviderFactory.create(config);
    this.promptBuilder = new PromptBuilder(config);
  }
  
  /**
   * Set learning engine for decision improvement
   */
  setLearningEngine(learningEngine: LearningEngine): void {
    this.learningEngine = learningEngine;
    learningEngine.setLLMAgent(this);
  }
  
  async initialize(): Promise<void> {
    const isValid = await LLMProviderFactory.validateProvider(this.provider);
    if (!isValid) {
      throw new Error('Failed to initialize LLM provider');
    }
  }
  
  async makeDecision(context: DecisionContext): Promise<LLMDecision> {
    try {
      // Build the decision prompt
      const messages = this.promptBuilder.buildDecisionPrompt(context);
      
      // Get LLM response
      const response = await this.provider.complete(messages);
      
      // Parse the decision
      let decision = this.provider.parseDecision(response.content);
      
      // Apply learning insights if available
      if (this.learningEngine && this.config.learning?.enabled) {
        const insights = await this.learningEngine.analyzeDecision(decision, context);
        
        // If learning suggests not to proceed, return a wait decision
        if (!insights.shouldProceed) {
          return {
            action: 'wait',
            confidence: 0.2,
            reasoning: `Learning system suggests waiting: ${insights.reasoning.join('; ')}`,
            requiresApproval: true
          };
        }
        
        // Apply adjustments from learning
        if (insights.adjustedDecision) {
          decision = {
            ...decision,
            ...insights.adjustedDecision,
            reasoning: `${decision.reasoning} (Learning: ${insights.reasoning.join('; ')})`
          };
        }
        
        // Adjust confidence based on historical data
        decision.confidence = await this.learningEngine.adjustConfidence(decision, context);
      }
      
      // Apply safety checks
      const safeDecision = await this.applySafetyChecks(decision, context);
      
      return safeDecision;
    } catch (error) {
      console.error('Error making LLM decision:', error);
      // Return a safe default decision
      return {
        action: 'wait',
        confidence: 0,
        reasoning: `Error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requiresApproval: true,
      };
    }
  }
  
  async generateCommitMessage(
    diffSummary: string, 
    projectContext: ProjectState,
    recentCommits: string[]
  ): Promise<string> {
    const messages = this.promptBuilder.buildCommitMessagePrompt(
      diffSummary,
      projectContext,
      recentCommits
    );
    
    const response = await this.provider.complete(messages);
    return response.content.trim();
  }
  
  async generatePRDescription(
    branchName: string,
    commits: string[],
    changesSummary: string
  ): Promise<{ title: string; body: string }> {
    const messages = this.promptBuilder.buildPRDescriptionPrompt(
      branchName,
      commits,
      changesSummary
    );
    
    const response = await this.provider.complete(messages);
    const parsed = this.parseJSON<{ title: string; body: string }>(response.content);
    
    if (!parsed) {
      throw new Error('Failed to parse PR description');
    }
    
    return parsed;
  }
  
  async assessRisk(context: DecisionContext): Promise<RiskAssessment> {
    const messages = this.promptBuilder.buildRiskAssessmentPrompt(context);
    
    const response = await this.provider.complete(messages);
    const parsed = this.parseJSON<RiskAssessment>(response.content);
    
    if (!parsed) {
      // Default high-risk assessment if parsing fails
      return {
        score: 1.0,
        factors: ['Failed to assess risk'],
        level: 'critical',
        requiresApproval: true,
      };
    }
    
    return parsed;
  }
  
  private async applySafetyChecks(
    decision: LLMDecision, 
    context: DecisionContext
  ): Promise<LLMDecision> {
    // Check if automation is enabled
    if (!this.config.enabled || this.config.mode === 'off') {
      decision.requiresApproval = true;
    }
    
    // Check confidence thresholds
    if (decision.confidence < this.config.thresholds.confidence) {
      decision.requiresApproval = true;
    }
    
    // Check if we're in working hours
    const timeContext = context.timeContext || await this.getTimeContext();
    if (!timeContext.isWorkingHours && this.config.preferences.working_hours) {
      decision.requiresApproval = true;
      decision.reasoning += ' (Outside working hours)';
    }
    
    // Check protected files
    if (await this.touchesProtectedFiles(context)) {
      decision.requiresApproval = true;
      decision.reasoning += ' (Touches protected files)';
    }
    
    // Check if tests are passing (if required)
    if (this.config.safety.require_tests_pass) {
      // First check project state if available
      if (context.projectState.testStatus === 'failing') {
        decision.requiresApproval = true;
        decision.reasoning += ' (Tests not passing)';
      } else if (context.projectState.testStatus === 'unknown') {
        // Only run actual test command if status is unknown
        const testsPass = await this.checkTestStatus();
        if (!testsPass) {
          decision.requiresApproval = true;
          decision.reasoning += ' (Tests not passing)';
        }
      }
      // If testStatus is 'passing', no action needed
    }
    
    // Emergency stop check
    if (this.config.safety.emergency_stop) {
      decision.action = 'wait';
      decision.requiresApproval = true;
      decision.reasoning = 'Emergency stop is active';
    }
    
    return decision;
  }
  
  private async getTimeContext(): Promise<TimeContext> {
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    let isWorkingHours = true;
    if (this.config.preferences.working_hours) {
      const { start, end } = this.config.preferences.working_hours;
      const currentTime = now.toTimeString().slice(0, 5);
      isWorkingHours = currentTime >= start && currentTime <= end;
    }
    
    return {
      currentTime: now,
      isWorkingHours,
      lastUserActivity: new Date(), // TODO: Track actual user activity
      dayOfWeek,
    };
  }
  
  private async touchesProtectedFiles(context: DecisionContext): Promise<boolean> {
    if (!this.config.safety.protected_files || 
        this.config.safety.protected_files.length === 0) {
      return false;
    }
    
    // Check if any changed files match protected patterns
    // This is a simplified check - in production, use proper glob matching
    const event = context.currentEvent;
    const files = (event as any).files || (event.data?.files as string[]);
    
    if (files && Array.isArray(files)) {
      for (const file of files) {
        for (const pattern of this.config.safety.protected_files) {
          if (this.matchesPattern(file, pattern)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  private matchesPattern(file: string, pattern: string): boolean {
    // Simple pattern matching - in production, use a proper glob library
    const regex = new RegExp(
      pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.')
    );
    return regex.test(file);
  }
  
  private async checkTestStatus(): Promise<boolean> {
    try {
      // Try to run tests - this is project-specific
      // In a real implementation, this would be configurable
      const { stdout, stderr } = await execAsync('npm test', {
        cwd: process.cwd(),
      });
      
      return !stderr && stdout.toLowerCase().includes('pass');
    } catch {
      // If tests fail or command doesn't exist, assume tests are not passing
      return false;
    }
  }
  
  private parseJSON<T>(text: string): T | null {
    try {
      return JSON.parse(text);
    } catch {
      // Try to extract JSON from the text
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}