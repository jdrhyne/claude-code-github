import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigValidator } from '../validation.js';
import { Config } from '../types.js';
import { AutomationTools } from '../tools/automation-tools.js';
import { ConfigManager } from '../config.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

function createTestConfig(): Config {
  return {
    git_workflow: {
      main_branch: 'main',
      protected_branches: ['main'],
      branch_prefixes: {
        feature: 'feature/',
        bugfix: 'bugfix/',
        refactor: 'refactor/'
      }
    },
    projects: [
      {
        path: '/test/project',
        github_repo: 'test/repo'
      }
    ],
    automation: {
      enabled: false,
      mode: 'off',
      llm: {
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        temperature: 0.3,
        api_key_env: 'TEST_API_KEY'
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
    }
  };
}

describe('Automation Configuration Validation', () => {
  let validator: ConfigValidator;
  
  beforeEach(() => {
    // Set NODE_ENV to test to skip certain validations
    process.env.NODE_ENV = 'test';
    validator = new ConfigValidator();
  });
  
  afterEach(() => {
    delete process.env.NODE_ENV;
  });
  
  it('should validate valid automation config', async () => {
    const config = createTestConfig();
    const result = await validator.validateConfig(config);
    
    // Should have warnings about API key not being set, but no errors
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should catch invalid automation mode', async () => {
    const config = createTestConfig();
    config.automation!.enabled = true; // Enable automation to trigger mode validation
    config.automation!.mode = 'invalid' as any;
    
    const result = await validator.validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'automation.mode',
        message: expect.stringContaining('Invalid mode')
      })
    );
  });
  
  it('should catch invalid LLM provider', async () => {
    const config = createTestConfig();
    config.automation!.llm.provider = 'invalid' as any;
    
    const result = await validator.validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'automation.llm.provider',
        message: expect.stringContaining('Invalid LLM provider')
      })
    );
  });
  
  it('should validate temperature range', async () => {
    const config = createTestConfig();
    config.automation!.llm.temperature = 1.5;
    
    const result = await validator.validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'automation.llm.temperature',
        message: expect.stringContaining('Temperature must be between 0 and 1')
      })
    );
  });
  
  it('should validate threshold values', async () => {
    const config = createTestConfig();
    config.automation!.thresholds.confidence = -0.1;
    
    const result = await validator.validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'automation.thresholds.confidence',
        message: expect.stringContaining('Threshold must be between 0 and 1')
      })
    );
  });
  
  it('should warn about threshold relationships', async () => {
    const config = createTestConfig();
    config.automation!.thresholds.auto_execute = 0.5;
    config.automation!.thresholds.confidence = 0.8;
    
    const result = await validator.validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        field: 'automation.thresholds',
        message: expect.stringContaining('auto_execute threshold is lower than confidence')
      })
    );
  });
  
  it('should validate commit style', async () => {
    const config = createTestConfig();
    config.automation!.preferences.commit_style = 'invalid' as any;
    
    const result = await validator.validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'automation.preferences.commit_style',
        message: expect.stringContaining('Invalid commit style')
      })
    );
  });
  
  it('should validate working hours format', async () => {
    const config = createTestConfig();
    config.automation!.preferences.working_hours = {
      start: '25:00',
      end: '18:00',
      timezone: 'America/New_York'
    };
    
    const result = await validator.validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'automation.preferences.working_hours.start',
        message: expect.stringContaining('Invalid time format')
      })
    );
  });
  
  it('should warn about safety in autonomous mode', async () => {
    const config = createTestConfig();
    config.automation!.enabled = true;
    config.automation!.mode = 'autonomous';
    config.automation!.safety.require_tests_pass = false;
    
    const result = await validator.validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        field: 'automation.safety.require_tests_pass',
        message: expect.stringContaining('Tests are not required to pass in autonomous mode')
      })
    );
  });
  
  it('should warn about learning mode inconsistency', async () => {
    const config = createTestConfig();
    config.automation!.mode = 'learning';
    config.automation!.learning.enabled = false;
    
    const result = await validator.validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        field: 'automation.learning',
        message: expect.stringContaining('Learning is disabled but mode is set to "learning"')
      })
    );
  });
});

describe('Automation Tools', () => {
  let tempDir: string;
  let automationTools: AutomationTools;
  let configManager: ConfigManager;
  
  beforeEach(async () => {
    // Set NODE_ENV to test
    process.env.NODE_ENV = 'test';
    
    tempDir = path.join(tmpdir(), `claude-code-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Create config directory
    const configDir = path.join(tempDir, '.config', 'claude-code-github');
    await fs.mkdir(configDir, { recursive: true });
    
    // Create test project directory
    const testProjectPath = path.join(tempDir, 'test-project');
    await fs.mkdir(testProjectPath, { recursive: true });
    
    // Initialize as git repo
    await fs.mkdir(path.join(testProjectPath, '.git'), { recursive: true });
    
    // Override home directory for tests
    process.env.HOME = tempDir;
    
    configManager = new ConfigManager();
    automationTools = new AutomationTools(configManager);
  });
  
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.HOME;
    delete process.env.NODE_ENV;
  });
  
  it('should get automation status', async () => {
    const result = await automationTools.handleToolCall('dev_automation_status', {});
    
    expect(result.success).toBe(true);
    expect(result.enabled).toBe(false);
    expect(result.mode).toBe('off');
    expect(result.configuration).toBeDefined();
    expect(result.display).toContain('Automation Status');
  });
  
  it('should enable automation', async () => {
    const result = await automationTools.handleToolCall('dev_automation_enable', {
      mode: 'assisted'
    });
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Automation enabled in assisted mode');
    expect(result.mode).toBe('assisted');
    
    // Verify it's persisted
    const status = await automationTools.handleToolCall('dev_automation_status', {});
    expect(status.enabled).toBe(true);
    expect(status.mode).toBe('assisted');
  });
  
  it('should disable automation', async () => {
    // First enable it
    await automationTools.handleToolCall('dev_automation_enable', { mode: 'learning' });
    
    // Then disable it
    const result = await automationTools.handleToolCall('dev_automation_disable', {});
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Automation disabled');
    
    // Verify it's disabled
    const status = await automationTools.handleToolCall('dev_automation_status', {});
    expect(status.enabled).toBe(false);
  });
  
  it('should configure automation settings', async () => {
    const result = await automationTools.handleToolCall('dev_automation_configure', {
      thresholds: {
        confidence: 0.8,
        auto_execute: 0.95
      },
      preferences: {
        commit_frequency: 'aggressive'
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.updated).toContain('thresholds');
    expect(result.updated).toContain('preferences');
    expect(result.configuration.thresholds.confidence).toBe(0.8);
    expect(result.configuration.preferences.commit_frequency).toBe('aggressive');
  });
  
  it('should configure learning settings', async () => {
    const result = await automationTools.handleToolCall('dev_automation_learning', {
      enabled: true,
      store_feedback: false
    });
    
    expect(result.success).toBe(true);
    expect(result.learning.enabled).toBe(true);
    expect(result.learning.store_feedback).toBe(false);
  });
  
  it('should handle emergency stop', async () => {
    const result = await automationTools.handleToolCall('dev_automation_disable', {
      emergency: true
    });
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('emergency stop activated');
    expect(result.emergency_stop).toBe(true);
  });
});