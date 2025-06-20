import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMDecisionAgent } from '../ai/llm-decision-agent.js';
import { AutomationConfig, DecisionContext, ProjectState } from '../types.js';
import { MonitoringEvent, MonitoringEventType } from '../monitoring/types.js';

// Create a mock provider instance
const mockProvider = {
  complete: vi.fn().mockResolvedValue({
    content: '{"action":"commit","confidence":0.85,"reasoning":"Time to commit changes","requiresApproval":false}'
  }),
  parseDecision: vi.fn().mockReturnValue({
    action: 'commit',
    confidence: 0.85,
    reasoning: 'Time to commit changes',
    requiresApproval: false
  }),
  isAvailable: vi.fn().mockResolvedValue(true),
  getName: vi.fn().mockReturnValue('MockProvider')
};

// Mock the provider factory
vi.mock('../ai/providers/provider-factory.js', () => ({
  LLMProviderFactory: {
    create: vi.fn(() => mockProvider),
    validateProvider: vi.fn().mockResolvedValue(true)
  }
}));

// Mock util.promisify
vi.mock('util', () => ({
  promisify: vi.fn((fn) => {
    // Return a promisified version of exec
    return (cmd: string, opts?: any) => {
      return new Promise((resolve, reject) => {
        if (cmd === 'npm test') {
          resolve({ stdout: 'Tests passed', stderr: '' });
        } else {
          reject(new Error('Command not found'));
        }
      });
    };
  })
}));

describe('LLMDecisionAgent', () => {
  let agent: LLMDecisionAgent;
  let mockConfig: AutomationConfig;
  let mockContext: DecisionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock provider to default values
    mockProvider.complete.mockResolvedValue({
      content: '{"action":"commit","confidence":0.85,"reasoning":"Time to commit changes","requiresApproval":false}'
    });
    mockProvider.parseDecision.mockReturnValue({
      action: 'commit',
      confidence: 0.85,
      reasoning: 'Time to commit changes',
      requiresApproval: false
    });
    
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
        protected_files: ['**/*.env', '**/secrets/*'],
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

    const mockEvent: MonitoringEvent = {
      type: MonitoringEventType.FILE_CHANGE,
      timestamp: new Date(),
      projectPath: '/test/project',
      description: 'Files changed',
      metadata: {},
      conversationId: 'test-123',
      data: {}
    };

    const mockProjectState: ProjectState = {
      branch: 'feature/test',
      isProtected: false,
      uncommittedChanges: 5,
      lastCommitTime: new Date(Date.now() - 3600000), // 1 hour ago
      testStatus: 'passing',
      buildStatus: 'success'
    };

    mockContext = {
      currentEvent: mockEvent,
      projectState: mockProjectState,
      recentHistory: [mockEvent],
      userPreferences: mockConfig.preferences,
      possibleActions: ['commit', 'wait', 'suggest'],
      timeContext: {
        currentTime: new Date(),
        isWorkingHours: true,
        lastUserActivity: new Date(),
        dayOfWeek: 'Monday'
      }
    };

    agent = new LLMDecisionAgent(mockConfig);
  });

  describe('makeDecision', () => {
    it('should make a decision based on context', async () => {
      const decision = await agent.makeDecision(mockContext);

      expect(decision).toEqual({
        action: 'commit',
        confidence: 0.85,
        reasoning: 'Time to commit changes',
        requiresApproval: false
      });
    });

    it('should require approval for low confidence decisions', async () => {
      // Update the mock to return low confidence
      mockProvider.complete.mockResolvedValueOnce({
        content: '{"action":"commit","confidence":0.5,"reasoning":"Low confidence decision","requiresApproval":false}'
      });
      mockProvider.parseDecision.mockReturnValueOnce({
        action: 'commit',
        confidence: 0.5, // Below threshold
        reasoning: 'Low confidence decision',
        requiresApproval: false
      });
      
      const decision = await agent.makeDecision(mockContext);
      expect(decision.requiresApproval).toBe(true);
    });

    it('should require approval outside working hours', async () => {
      // Set time outside working hours
      const afterHoursContext = {
        ...mockContext,
        timeContext: {
          ...mockContext.timeContext!,
          isWorkingHours: false
        }
      };

      const decision = await agent.makeDecision(afterHoursContext);
      expect(decision.requiresApproval).toBe(true);
      expect(decision.reasoning).toContain('Outside working hours');
    });

    it('should handle emergency stop', async () => {
      mockConfig.safety.emergency_stop = true;
      agent = new LLMDecisionAgent(mockConfig);

      const decision = await agent.makeDecision(mockContext);
      expect(decision.action).toBe('wait');
      expect(decision.requiresApproval).toBe(true);
      expect(decision.reasoning).toBe('Emergency stop is active');
    });

    it('should return safe default on error', async () => {
      mockProvider.complete.mockRejectedValueOnce(new Error('API error'));
      
      const decision = await agent.makeDecision(mockContext);
      expect(decision.action).toBe('wait');
      expect(decision.confidence).toBe(0);
      expect(decision.requiresApproval).toBe(true);
      expect(decision.reasoning).toContain('Error occurred');
    });
  });

  describe('generateCommitMessage', () => {
    it('should generate a commit message', async () => {
      mockProvider.complete.mockResolvedValueOnce({
        content: 'feat: add user authentication'
      });
      
      const message = await agent.generateCommitMessage(
        'Added login functionality',
        mockContext.projectState,
        ['fix: resolve login bug', 'feat: add signup page']
      );

      expect(message).toBe('feat: add user authentication');
    });
  });

  describe('generatePRDescription', () => {
    it('should generate PR title and body', async () => {
      mockProvider.complete.mockResolvedValueOnce({
        content: '{"title":"Add user authentication","body":"This PR adds login and signup functionality"}'
      });
      
      const pr = await agent.generatePRDescription(
        'feature/auth',
        ['feat: add login', 'feat: add signup'],
        'Authentication implementation'
      );

      expect(pr.title).toBe('Add user authentication');
      expect(pr.body).toBe('This PR adds login and signup functionality');
    });
  });

  describe('assessRisk', () => {
    it('should assess risk level', async () => {
      mockProvider.complete.mockResolvedValueOnce({
        content: '{"score":0.3,"factors":["non-critical changes"],"level":"low","requiresApproval":false}'
      });
      
      const risk = await agent.assessRisk(mockContext);

      expect(risk).toEqual({
        score: 0.3,
        factors: ['non-critical changes'],
        level: 'low',
        requiresApproval: false
      });
    });

    it('should return high risk on parsing failure', async () => {
      mockProvider.complete.mockResolvedValueOnce({
        content: 'Invalid JSON response'
      });
      
      const risk = await agent.assessRisk(mockContext);

      expect(risk).toEqual({
        score: 1.0,
        factors: ['Failed to assess risk'],
        level: 'critical',
        requiresApproval: true
      });
    });
  });

  describe('safety checks', () => {
    it('should require approval when tests are failing', async () => {
      // Create new context with failing tests
      const failingContext = {
        ...mockContext,
        projectState: {
          ...mockContext.projectState,
          testStatus: 'failing' as const
        }
      };

      const decision = await agent.makeDecision(failingContext);
      expect(decision.requiresApproval).toBe(true);
    });

    it('should detect protected files', async () => {
      mockContext.currentEvent = {
        ...mockContext.currentEvent,
        files: ['/test/project/.env', '/test/project/src/index.js']
      } as any;

      const decision = await agent.makeDecision(mockContext);
      expect(decision.requiresApproval).toBe(true);
      expect(decision.reasoning).toContain('Touches protected files');
    });
  });
});