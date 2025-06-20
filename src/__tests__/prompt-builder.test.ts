import { describe, it, expect, beforeEach } from 'vitest';
import { PromptBuilder } from '../ai/prompt-builder.js';
import { AutomationConfig, DecisionContext, ProjectState } from '../types.js';
import { MonitoringEvent, MonitoringEventType } from '../monitoring/types.js';

describe('PromptBuilder', () => {
  let promptBuilder: PromptBuilder;
  let mockConfig: AutomationConfig;
  let mockContext: DecisionContext;

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      mode: 'assisted',
      llm: {
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        temperature: 0.3
      },
      thresholds: {
        confidence: 0.8,
        auto_execute: 0.95,
        require_approval: 0.6
      },
      preferences: {
        commit_style: 'conventional',
        commit_frequency: 'moderate',
        working_hours: {
          start: '09:00',
          end: '18:00',
          timezone: 'America/New_York'
        },
        risk_tolerance: 'medium'
      },
      safety: {
        max_actions_per_hour: 10,
        require_tests_pass: true
      },
      learning: {
        enabled: true,
        store_feedback: true,
        adapt_to_patterns: true,
        preference_learning: true
      }
    };

    const mockEvent: MonitoringEvent = {
      type: MonitoringEventType.FILE_CHANGE,
      timestamp: new Date(),
      projectPath: '/test/project',
      description: 'Large changeset detected',
      metadata: { fileCount: 10 },
      conversationId: 'test-123',
      files: ['file1.js', 'file2.js'],
      data: {}
    };

    const mockProjectState: ProjectState = {
      branch: 'feature/new-feature',
      isProtected: false,
      uncommittedChanges: 10,
      lastCommitTime: new Date(Date.now() - 7200000), // 2 hours ago
      testStatus: 'passing',
      buildStatus: 'success'
    };

    mockContext = {
      currentEvent: mockEvent,
      projectState: mockProjectState,
      recentHistory: [
        {
          type: MonitoringEventType.FILE_CHANGE,
          timestamp: new Date(Date.now() - 3600000),
          projectPath: '/test/project',
          description: 'Files changed',
          metadata: {},
          conversationId: 'test-123',
          data: {}
        },
        mockEvent
      ],
      userPreferences: mockConfig.preferences,
      possibleActions: ['commit', 'branch', 'pr', 'wait', 'suggest'],
      timeContext: {
        currentTime: new Date('2024-01-15T14:30:00'),
        isWorkingHours: true,
        lastUserActivity: new Date('2024-01-15T14:00:00'),
        dayOfWeek: 'Monday'
      }
    };

    promptBuilder = new PromptBuilder(mockConfig);
  });

  describe('buildDecisionPrompt', () => {
    it('should build a complete decision prompt', () => {
      const messages = promptBuilder.buildDecisionPrompt(mockContext);

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');

      // Check system prompt contains key information
      const systemPrompt = messages[0].content;
      expect(systemPrompt).toContain('intelligent Git workflow assistant');
      expect(systemPrompt).toContain('conventional');
      expect(systemPrompt).toContain('moderate');
      expect(systemPrompt).toContain('09:00-18:00');
      expect(systemPrompt).toContain('0.95');

      // Check user prompt contains context
      const userPrompt = messages[1].content;
      expect(userPrompt).toContain('file_change');
      expect(userPrompt).toContain('feature/new-feature');
      expect(userPrompt).toContain('10 files');
      expect(userPrompt).toContain('2 hour');
      expect(userPrompt).toContain('passing');
    });

    it('should format event descriptions correctly', () => {
      const messages = promptBuilder.buildDecisionPrompt(mockContext);
      const userPrompt = messages[1].content;

      expect(userPrompt).toContain('Files changed: 2');
    });

    it('should include recent history', () => {
      const messages = promptBuilder.buildDecisionPrompt(mockContext);
      const userPrompt = messages[1].content;

      expect(userPrompt).toContain('RECENT HISTORY');
      expect(userPrompt).toContain('1 hour ago: Files changed');
    });
  });

  describe('buildCommitMessagePrompt', () => {
    it('should build commit message prompt with conventional style', () => {
      const diffSummary = `
+++ file1.js
+ Added new authentication module
+++ file2.js  
+ Updated user interface
      `;
      
      const recentCommits = [
        'feat: add login functionality',
        'fix: resolve authentication bug',
        'docs: update API documentation'
      ];

      const messages = promptBuilder.buildCommitMessagePrompt(
        diffSummary,
        mockContext.projectState,
        recentCommits
      );

      expect(messages).toHaveLength(2);
      
      const systemPrompt = messages[0].content;
      expect(systemPrompt).toContain('conventional');
      expect(systemPrompt).toContain('Use conventional commit format');

      const userPrompt = messages[1].content;
      expect(userPrompt).toContain('Added new authentication module');
      expect(userPrompt).toContain('feat: add login functionality');
      expect(userPrompt).toContain('feature/new-feature');
    });

    it('should handle different commit styles', () => {
      mockConfig.preferences.commit_style = 'descriptive';
      promptBuilder = new PromptBuilder(mockConfig);

      const messages = promptBuilder.buildCommitMessagePrompt(
        'Changes',
        mockContext.projectState,
        []
      );

      const systemPrompt = messages[0].content;
      expect(systemPrompt).toContain('descriptive style');
      expect(systemPrompt).not.toContain('Use conventional commit format');
    });
  });

  describe('buildPRDescriptionPrompt', () => {
    it('should build PR description prompt', () => {
      const commits = [
        'feat: add user authentication',
        'test: add auth tests',
        'docs: update auth documentation'
      ];

      const changesSummary = 'Added complete authentication system with tests and documentation';

      const messages = promptBuilder.buildPRDescriptionPrompt(
        'feature/auth',
        commits,
        changesSummary
      );

      expect(messages).toHaveLength(2);
      
      const userPrompt = messages[1].content;
      expect(userPrompt).toContain('feature/auth');
      expect(userPrompt).toContain('feat: add user authentication');
      expect(userPrompt).toContain('Added complete authentication system');
      expect(userPrompt).toContain('Generate a JSON response');
    });
  });

  describe('buildRiskAssessmentPrompt', () => {
    it('should build risk assessment prompt', () => {
      const messages = promptBuilder.buildRiskAssessmentPrompt(mockContext);

      expect(messages).toHaveLength(2);
      
      const systemPrompt = messages[0].content;
      expect(systemPrompt).toContain('risk assessment system');
      expect(systemPrompt).toContain('JSON with score');

      const userPrompt = messages[1].content;
      expect(userPrompt).toContain('file_change');
      expect(userPrompt).toContain('feature/new-feature');
      expect(userPrompt).toContain('Protected: false');
      expect(userPrompt).toContain('Tests: passing');
    });

    it('should include time context in risk assessment', () => {
      const messages = promptBuilder.buildRiskAssessmentPrompt(mockContext);
      const userPrompt = messages[1].content;

      expect(userPrompt).toContain('Jan 15 2024');
      expect(userPrompt).toContain('Working Hours: true');
    });
  });

  describe('time formatting', () => {
    it('should format time differences correctly', () => {
      // Set up a specific time context for predictable results
      const now = new Date();
      const testContext = {
        ...mockContext,
        timeContext: {
          currentTime: now,
          isWorkingHours: true,
          lastUserActivity: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
          dayOfWeek: 'Monday'
        },
        projectState: {
          ...mockContext.projectState,
          lastCommitTime: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
        }
      };
      
      promptBuilder = new PromptBuilder(mockConfig);
      const messages = promptBuilder.buildDecisionPrompt(testContext);
      const userPrompt = messages[1].content;

      // Last user activity should show as "30 minutes ago"
      expect(userPrompt).toMatch(/30 minute[s]? ago/);
      
      // Last commit should show as "2 hours ago"
      expect(userPrompt).toMatch(/2 hour[s]? ago/);
    });
  });
});