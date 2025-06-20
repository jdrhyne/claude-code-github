import { EventEmitter } from 'events';
import { LLMDecision, DecisionContext, Config } from '../types.js';
import { MonitoringEvent, MonitoringEventType } from '../monitoring/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ActionResult {
  success: boolean;
  action: string;
  output?: string;
  error?: string;
  rollbackInfo?: RollbackInfo;
}

export interface RollbackInfo {
  action: string;
  previousState: any;
  rollbackCommand?: string;
}

export class ActionExecutor extends EventEmitter {
  private executionHistory: ActionResult[] = [];
  private safetyValidator: SafetyValidator;
  
  constructor(private config: Config) {
    super();
    this.safetyValidator = new SafetyValidator(config);
  }
  
  /**
   * Execute an action based on LLM decision
   */
  async executeDecision(decision: LLMDecision, context: DecisionContext): Promise<ActionResult> {
    // Validate safety first
    const safetyCheck = await this.safetyValidator.validate(decision, context);
    if (!safetyCheck.safe) {
      return {
        success: false,
        action: decision.action,
        error: `Safety check failed: ${safetyCheck.reasons.join(', ')}`
      };
    }
    
    // Log the execution attempt
    this.emit('execution-start', { decision, context });
    
    try {
      let result: ActionResult;
      
      switch (decision.action) {
        case 'commit':
        case 'checkpoint':
          result = await this.executeCommit(decision, context);
          break;
          
        case 'branch':
          result = await this.executeBranch(decision, context);
          break;
          
        case 'pr':
          result = await this.executePR(decision, context);
          break;
          
        case 'stash':
          result = await this.executeStash(context);
          break;
          
        default:
          result = {
            success: false,
            action: decision.action,
            error: `Unknown action: ${decision.action}`
          };
      }
      
      // Store in history
      this.executionHistory.push(result);
      
      // Emit completion
      this.emit('execution-complete', result);
      
      // Record the action in monitoring
      await this.recordAction(result, decision, context);
      
      return result;
      
    } catch (error) {
      const result: ActionResult = {
        success: false,
        action: decision.action,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this.executionHistory.push(result);
      this.emit('execution-failed', result);
      
      return result;
    }
  }
  
  /**
   * Execute a commit action
   */
  private async executeCommit(decision: LLMDecision, context: DecisionContext): Promise<ActionResult> {
    const projectPath = context.currentEvent.projectPath;
    
    try {
      // Generate commit message using LLM
      const commitMessage = await this.generateCommitMessage(context);
      
      // Stage all changes
      await execAsync('git add -A', { cwd: projectPath });
      
      // Create commit
      const { stdout } = await execAsync(
        `git commit -m "${commitMessage.replace(/"/g, '\\"')}"`,
        { cwd: projectPath }
      );
      
      return {
        success: true,
        action: 'commit',
        output: stdout,
        rollbackInfo: {
          action: 'commit',
          previousState: null,
          rollbackCommand: 'git reset --soft HEAD~1'
        }
      };
    } catch (error) {
      return {
        success: false,
        action: 'commit',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Execute a branch creation
   */
  private async executeBranch(decision: LLMDecision, context: DecisionContext): Promise<ActionResult> {
    const projectPath = context.currentEvent.projectPath;
    
    try {
      // Generate branch name
      const branchName = await this.generateBranchName(context);
      
      // Create and checkout new branch
      const { stdout } = await execAsync(
        `git checkout -b ${branchName}`,
        { cwd: projectPath }
      );
      
      return {
        success: true,
        action: 'branch',
        output: stdout,
        rollbackInfo: {
          action: 'branch',
          previousState: context.projectState.branch,
          rollbackCommand: `git checkout ${context.projectState.branch} && git branch -d ${branchName}`
        }
      };
    } catch (error) {
      return {
        success: false,
        action: 'branch',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Execute PR creation
   */
  private async executePR(decision: LLMDecision, context: DecisionContext): Promise<ActionResult> {
    const projectPath = context.currentEvent.projectPath;
    
    try {
      // Push current branch
      await execAsync('git push -u origin HEAD', { cwd: projectPath });
      
      // Create PR using gh CLI (if available)
      const prTitle = await this.generatePRTitle(context);
      const prBody = await this.generatePRBody(context);
      
      const { stdout } = await execAsync(
        `gh pr create --title "${prTitle}" --body "${prBody}" --draft`,
        { cwd: projectPath }
      );
      
      return {
        success: true,
        action: 'pr',
        output: stdout
      };
    } catch (error) {
      return {
        success: false,
        action: 'pr',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Execute stash action
   */
  private async executeStash(context: DecisionContext): Promise<ActionResult> {
    const projectPath = context.currentEvent.projectPath;
    
    try {
      const { stdout } = await execAsync('git stash push -m "Auto-stashed by LLM"', {
        cwd: projectPath
      });
      
      return {
        success: true,
        action: 'stash',
        output: stdout,
        rollbackInfo: {
          action: 'stash',
          previousState: null,
          rollbackCommand: 'git stash pop'
        }
      };
    } catch (error) {
      return {
        success: false,
        action: 'stash',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Rollback a previous action
   */
  async rollback(actionResult: ActionResult): Promise<boolean> {
    if (!actionResult.rollbackInfo?.rollbackCommand) {
      return false;
    }
    
    try {
      const projectPath = this.executionHistory
        .find(h => h === actionResult)
        ?.action || process.cwd();
        
      await execAsync(actionResult.rollbackInfo.rollbackCommand, {
        cwd: projectPath
      });
      
      this.emit('rollback-complete', actionResult);
      return true;
    } catch (error) {
      this.emit('rollback-failed', { actionResult, error });
      return false;
    }
  }
  
  /**
   * Record action in monitoring system
   */
  private async recordAction(
    result: ActionResult, 
    decision: LLMDecision, 
    context: DecisionContext
  ): Promise<void> {
    const event: MonitoringEvent = {
      type: result.success 
        ? MonitoringEventType.LLM_ACTION_EXECUTED 
        : MonitoringEventType.LLM_ACTION_FAILED,
      timestamp: new Date(),
      projectPath: context.currentEvent.projectPath,
      data: {
        action: decision.action,
        success: result.success,
        confidence: decision.confidence,
        output: result.output,
        error: result.error
      }
    };
    
    this.emit('monitoring-event', event);
  }
  
  // Stub methods for message generation - these would use the LLM
  private async generateCommitMessage(context: DecisionContext): Promise<string> {
    return 'feat: automated commit by LLM';
  }
  
  private async generateBranchName(context: DecisionContext): Promise<string> {
    return `feature/auto-${Date.now()}`;
  }
  
  private async generatePRTitle(context: DecisionContext): Promise<string> {
    return 'Automated PR by LLM';
  }
  
  private async generatePRBody(context: DecisionContext): Promise<string> {
    return 'This PR was automatically created by the LLM automation system.';
  }
}

/**
 * Safety validator for automation actions
 */
class SafetyValidator {
  constructor(private config: Config) {}
  
  async validate(decision: LLMDecision, context: DecisionContext): Promise<{
    safe: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    
    // Check if automation is enabled
    if (!this.config.automation?.enabled) {
      reasons.push('Automation is disabled');
    }
    
    // Check if we're in autonomous mode for auto-execution
    if (this.config.automation?.mode !== 'autonomous' && !decision.requiresApproval) {
      reasons.push('Not in autonomous mode');
    }
    
    // Check confidence threshold
    if (decision.confidence < (this.config.automation?.thresholds.auto_execute || 0.95)) {
      reasons.push(`Confidence ${decision.confidence} below threshold`);
    }
    
    // Check rate limiting
    if (!(await this.checkRateLimit())) {
      reasons.push('Rate limit exceeded');
    }
    
    // Check protected branch
    if (context.projectState.isProtected && decision.action === 'commit') {
      reasons.push('Cannot commit to protected branch');
    }
    
    // Check emergency stop
    if (this.config.automation?.safety.emergency_stop) {
      reasons.push('Emergency stop is active');
    }
    
    return {
      safe: reasons.length === 0,
      reasons
    };
  }
  
  private async checkRateLimit(): Promise<boolean> {
    // Implementation would track actions per hour
    // For now, always return true
    return true;
  }
}