import { EventEmitter } from 'events';
import { McpTool } from '../types.js';
import { ConfigManager } from '../config.js';
import { EventAggregator } from '../monitoring/event-aggregator.js';
import { StatusDisplay } from '../status-display.js';

export class AutomationTools extends EventEmitter {
  private configManager: ConfigManager;
  private eventAggregator?: EventAggregator;
  
  constructor(configManager: ConfigManager) {
    super();
    this.configManager = configManager;
  }
  
  setEventAggregator(aggregator: EventAggregator): void {
    this.eventAggregator = aggregator;
  }
  
  getTools(): McpTool[] {
    return [
      {
        name: 'dev_automation_status',
        description: 'Get the current automation status and configuration',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'dev_automation_enable',
        description: 'Enable automation with specified mode',
        inputSchema: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['learning', 'assisted', 'autonomous'],
              description: 'The automation mode to enable'
            }
          },
          required: ['mode']
        }
      },
      {
        name: 'dev_automation_disable',
        description: 'Disable automation',
        inputSchema: {
          type: 'object',
          properties: {
            emergency: {
              type: 'boolean',
              description: 'Set emergency stop flag (prevents all automated actions)'
            }
          }
        }
      },
      {
        name: 'dev_automation_configure',
        description: 'Update automation configuration settings',
        inputSchema: {
          type: 'object',
          properties: {
            thresholds: {
              type: 'object',
              properties: {
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                auto_execute: { type: 'number', minimum: 0, maximum: 1 },
                require_approval: { type: 'number', minimum: 0, maximum: 1 }
              }
            },
            preferences: {
              type: 'object',
              properties: {
                commit_style: { type: 'string', enum: ['conventional', 'descriptive', 'custom'] },
                commit_frequency: { type: 'string', enum: ['aggressive', 'moderate', 'conservative'] },
                risk_tolerance: { type: 'string', enum: ['low', 'medium', 'high'] }
              }
            },
            safety: {
              type: 'object',
              properties: {
                max_actions_per_hour: { type: 'number', minimum: 0 },
                require_tests_pass: { type: 'boolean' },
                pause_on_errors: { type: 'boolean' }
              }
            }
          }
        }
      },
      {
        name: 'dev_automation_learning',
        description: 'Configure learning system settings',
        inputSchema: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Enable/disable learning system'
            },
            store_feedback: {
              type: 'boolean',
              description: 'Store user feedback for learning'
            },
            adapt_to_patterns: {
              type: 'boolean',
              description: 'Adapt behavior based on patterns'
            },
            preference_learning: {
              type: 'boolean',
              description: 'Learn user preferences automatically'
            }
          }
        }
      }
    ];
  }
  
  async handleToolCall(toolName: string, params: any): Promise<any> {
    await this.configManager.loadConfig();
    
    switch (toolName) {
      case 'dev_automation_status': {
        const statusData = await this.getAutomationStatus();
        return {
          ...statusData,
          display: StatusDisplay.showAutomationStatus(statusData)
        };
      }
        
      case 'dev_automation_enable':
        return await this.enableAutomation(params.mode);
        
      case 'dev_automation_disable':
        return await this.disableAutomation(params.emergency);
        
      case 'dev_automation_configure':
        return await this.configureAutomation(params);
        
      case 'dev_automation_learning':
        return await this.configureLearning(params);
        
      default:
        throw new Error(`Unknown automation tool: ${toolName}`);
    }
  }
  
  private async getAutomationStatus(): Promise<any> {
    const config = await this.configManager.loadConfig();
    const automation = config.automation || this.getDefaultAutomation();
    
    // Get runtime status if event aggregator is available
    let runtimeStatus = {};
    if (this.eventAggregator) {
      const llmAgent = this.eventAggregator['llmAgent'];
      const feedbackHandlers = this.eventAggregator.getFeedbackHandlers();
      
      runtimeStatus = {
        llm_initialized: !!llmAgent,
        learning_active: !!feedbackHandlers,
        mode_active: automation.enabled && automation.mode !== 'off'
      };
    }
    
    return {
      success: true,
      enabled: automation.enabled,
      mode: automation.mode,
      configuration: {
        llm: {
          provider: automation.llm.provider,
          model: automation.llm.model,
          temperature: automation.llm.temperature,
          api_key_configured: !!process.env[automation.llm.api_key_env || '']
        },
        thresholds: automation.thresholds,
        preferences: automation.preferences,
        safety: automation.safety,
        learning: automation.learning
      },
      runtime: runtimeStatus,
      warnings: this.getConfigWarnings(automation)
    };
  }
  
  private async enableAutomation(mode: string): Promise<any> {
    const config = await this.configManager.loadConfig();
    
    // Ensure automation config exists
    if (!config.automation) {
      config.automation = this.getDefaultAutomation();
    }
    
    // Update settings
    if (!config.automation) {
      config.automation = {
        enabled: true,
        mode: mode as any,
        llm: { provider: 'anthropic', model: 'claude-3-sonnet', temperature: 0.7 },
        thresholds: { confidence: 0.7, auto_execute: 0.9, require_approval: 0.5 },
        preferences: { commit_style: 'conventional', commit_frequency: 'moderate', risk_tolerance: 'medium' },
        safety: { max_actions_per_hour: 10, require_tests_pass: false, emergency_stop: false },
        learning: { enabled: true, store_feedback: true, adapt_to_patterns: true, preference_learning: true }
      };
    } else {
      config.automation.enabled = true;
      config.automation.mode = mode as any;
      
      // Clear emergency stop if it was set
      if (config.automation.safety) {
        config.automation.safety.emergency_stop = false;
      }
    }
    
    // Save config
    await this.configManager.saveConfig(config);
    
    // Reinitialize event aggregator if available
    if (this.eventAggregator && config.automation) {
      await this.eventAggregator.initialize(config);
    }
    
    return {
      success: true,
      message: `Automation enabled in ${mode} mode`,
      mode,
      warnings: this.getConfigWarnings(config.automation)
    };
  }
  
  private async disableAutomation(emergency?: boolean): Promise<any> {
    const config = await this.configManager.loadConfig();
    
    if (!config.automation) {
      return {
        success: true,
        message: 'Automation is already disabled'
      };
    }
    
    // Update settings
    config.automation.enabled = false;
    
    if (emergency && config.automation.safety) {
      config.automation.safety.emergency_stop = true;
    }
    
    // Save config
    await this.configManager.saveConfig(config);
    
    return {
      success: true,
      message: emergency 
        ? 'Automation disabled (emergency stop activated)' 
        : 'Automation disabled',
      emergency_stop: emergency || false
    };
  }
  
  private async configureAutomation(params: any): Promise<any> {
    const config = await this.configManager.loadConfig();
    
    // Ensure automation config exists
    if (!config.automation) {
      config.automation = this.getDefaultAutomation();
    }
    
    const automation = config.automation!; // Type assertion after null check
    
    // Update thresholds
    if (params.thresholds) {
      automation.thresholds = {
        ...automation.thresholds,
        ...params.thresholds
      };
    }
    
    // Update preferences
    if (params.preferences) {
      automation.preferences = {
        ...automation.preferences,
        ...params.preferences
      };
    }
    
    // Update safety
    if (params.safety) {
      automation.safety = {
        ...automation.safety,
        ...params.safety
      };
    }
    
    // Save config
    await this.configManager.saveConfig(config);
    
    return {
      success: true,
      message: 'Automation configuration updated',
      updated: Object.keys(params),
      configuration: {
        thresholds: automation.thresholds,
        preferences: automation.preferences,
        safety: automation.safety
      }
    };
  }
  
  private async configureLearning(params: any): Promise<any> {
    const config = await this.configManager.loadConfig();
    
    // Ensure automation config exists
    if (!config.automation) {
      config.automation = this.getDefaultAutomation();
    }
    
    const automation = config.automation!; // Type assertion after null check
    
    // Update learning settings
    automation.learning = {
      ...automation.learning,
      ...params
    };
    
    // Save config
    await this.configManager.saveConfig(config);
    
    return {
      success: true,
      message: 'Learning configuration updated',
      learning: automation.learning
    };
  }
  
  private getDefaultAutomation(): any {
    return {
      enabled: false,
      mode: 'off',
      llm: {
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        temperature: 0.3,
        api_key_env: 'ANTHROPIC_API_KEY'
      },
      thresholds: {
        confidence: 0.7,
        auto_execute: 0.9,
        require_approval: 0.5
      },
      preferences: {
        commit_style: 'conventional',
        commit_frequency: 'moderate',
        risk_tolerance: 'medium'
      },
      safety: {
        max_actions_per_hour: 10,
        require_tests_pass: true,
        pause_on_errors: true,
        emergency_stop: false
      },
      learning: {
        enabled: true,
        store_feedback: true,
        adapt_to_patterns: true,
        preference_learning: true
      }
    };
  }
  
  private getConfigWarnings(automation: any): string[] {
    const warnings: string[] = [];
    
    // Check API key
    if (automation.enabled && automation.llm.api_key_env) {
      if (!process.env[automation.llm.api_key_env]) {
        warnings.push(`API key environment variable "${automation.llm.api_key_env}" is not set`);
      }
    }
    
    // Check mode consistency
    if (automation.enabled && automation.mode === 'off') {
      warnings.push('Automation is enabled but mode is "off"');
    }
    
    // Check safety in autonomous mode
    if (automation.mode === 'autonomous') {
      if (!automation.safety.require_tests_pass) {
        warnings.push('Tests are not required to pass in autonomous mode');
      }
      if (automation.safety.max_actions_per_hour > 50) {
        warnings.push(`High action limit (${automation.safety.max_actions_per_hour}) in autonomous mode`);
      }
    }
    
    // Check learning consistency
    if (automation.mode === 'learning' && !automation.learning.enabled) {
      warnings.push('Mode is "learning" but learning is disabled');
    }
    
    return warnings;
  }
}