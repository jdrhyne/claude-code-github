import { EventEmitter } from 'events';
import { FeedbackHandlers } from '../learning/feedback-handlers.js';
import { McpTool } from '../types.js';

export class FeedbackTools extends EventEmitter {
  private feedbackHandlers?: FeedbackHandlers;
  
  setFeedbackHandlers(handlers: FeedbackHandlers): void {
    this.feedbackHandlers = handlers;
  }
  
  getTools(): McpTool[] {
    return [
      {
        name: 'dev_feedback_approve',
        description: 'Approve an LLM decision',
        inputSchema: {
          type: 'object',
          properties: {
            decision_id: { 
              type: 'string',
              description: 'The ID of the decision to approve'
            },
            reason: {
              type: 'string',
              description: 'Optional reason for approval'
            }
          },
          required: ['decision_id']
        }
      },
      {
        name: 'dev_feedback_reject',
        description: 'Reject an LLM decision',
        inputSchema: {
          type: 'object',
          properties: {
            decision_id: { 
              type: 'string',
              description: 'The ID of the decision to reject'
            },
            reason: {
              type: 'string',
              description: 'Optional reason for rejection'
            }
          },
          required: ['decision_id']
        }
      },
      {
        name: 'dev_feedback_correct',
        description: 'Correct an LLM decision with the action you actually want',
        inputSchema: {
          type: 'object',
          properties: {
            decision_id: { 
              type: 'string',
              description: 'The ID of the decision to correct'
            },
            corrected_action: {
              type: 'string',
              description: 'The action that should have been taken'
            },
            reason: {
              type: 'string',
              description: 'Optional reason for the correction'
            }
          },
          required: ['decision_id', 'corrected_action']
        }
      },
      {
        name: 'dev_feedback_stats',
        description: 'Get learning statistics for the current project',
        inputSchema: {
          type: 'object',
          properties: {
            project_path: {
              type: 'string',
              description: 'Optional project path (defaults to current)'
            }
          }
        }
      },
      {
        name: 'dev_preferences',
        description: 'Get learned preferences for the current project',
        inputSchema: {
          type: 'object',
          properties: {
            project_path: {
              type: 'string',
              description: 'Project path (required)'
            }
          },
          required: ['project_path']
        }
      }
    ];
  }
  
  async handleToolCall(toolName: string, params: any): Promise<any> {
    if (!this.feedbackHandlers) {
      throw new Error('Feedback system not initialized');
    }
    
    switch (toolName) {
      case 'dev_feedback_approve':
        return await this.feedbackHandlers.handleApproval(
          params.decision_id,
          params.reason
        );
        
      case 'dev_feedback_reject':
        return await this.feedbackHandlers.handleRejection(
          params.decision_id,
          params.reason
        );
        
      case 'dev_feedback_correct':
        return await this.feedbackHandlers.handleCorrection(
          params.decision_id,
          params.corrected_action,
          params.reason
        );
        
      case 'dev_feedback_stats': {
        const stats = await this.feedbackHandlers.getStats(params.project_path);
        return {
          success: true,
          stats: {
            total_decisions: stats.totalDecisions,
            approvals: stats.approvals,
            rejections: stats.rejections,
            corrections: stats.corrections,
            implicit_approvals: stats.implicitApprovals,
            success_rate: `${(stats.successRate * 100).toFixed(1)}%`,
            common_corrections: (() => {
              const corrections: { pattern: string; count: number }[] = [];
              stats.commonCorrections.forEach((count, pattern) => {
                corrections.push({ pattern, count });
              });
              return corrections;
            })(),
            preference_patterns: stats.preferencePatterns
          }
        };
      }
        
      case 'dev_preferences': {
        const preferences = await this.feedbackHandlers.getLearnedPreferences(
          params.project_path
        );
        return {
          success: true,
          preferences
        };
      }
        
      default:
        throw new Error(`Unknown feedback tool: ${toolName}`);
    }
  }
}