import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnthropicProvider } from '../ai/providers/anthropic-provider.js';
import { OpenAIProvider } from '../ai/providers/openai-provider.js';
import { LLMProviderFactory } from '../ai/providers/provider-factory.js';
import { AutomationConfig } from '../types.js';

// Mock the external SDKs
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"action":"commit","confidence":0.85,"reasoning":"Test decision","requiresApproval":false}' }],
        usage: { input_tokens: 100, output_tokens: 50 },
        model: 'claude-3-sonnet-20240229'
      })
    };
  }
  return { default: MockAnthropic };
});

vi.mock('openai', () => {
  class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: '{"action":"commit","confidence":0.85,"reasoning":"Test decision","requiresApproval":false}'
            }
          }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
          model: 'gpt-4-turbo-preview'
        })
      }
    };
  }
  return { default: MockOpenAI };
});

describe('AI Providers', () => {
  const mockConfig: AutomationConfig = {
    enabled: true,
    mode: 'assisted',
    llm: {
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229',
      temperature: 0.3,
      api_key_env: 'ANTHROPIC_API_KEY'
    },
    thresholds: {
      confidence: 0.8,
      auto_execute: 0.95,
      require_approval: 0.6
    },
    preferences: {
      commit_style: 'conventional',
      commit_frequency: 'moderate',
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

  beforeEach(() => {
    // Set up environment variables
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    vi.clearAllMocks();
  });

  describe('AnthropicProvider', () => {
    let provider: AnthropicProvider;

    beforeEach(() => {
      provider = new AnthropicProvider({
        model: 'claude-3-sonnet-20240229',
        temperature: 0.3
      });
    });

    it('should complete a request successfully', async () => {
      const messages = [
        { role: 'system' as const, content: 'You are a helpful assistant' },
        { role: 'user' as const, content: 'Make a decision' }
      ];

      const response = await provider.complete(messages);

      expect(response).toMatchObject({
        content: expect.stringContaining('action'),
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150
        }
      });
    });

    it('should parse decision correctly', () => {
      const response = '{"action":"commit","confidence":0.85,"reasoning":"Test decision","requiresApproval":false}';
      const decision = provider.parseDecision(response);

      expect(decision).toEqual({
        action: 'commit',
        confidence: 0.85,
        reasoning: 'Test decision',
        requiresApproval: false
      });
    });

    it('should handle malformed JSON in decision parsing', () => {
      const response = 'This is not JSON';
      
      expect(() => provider.parseDecision(response)).toThrow('Failed to parse LLM response as JSON');
    });

    it('should check availability based on API key', async () => {
      const available = await provider.isAvailable();
      expect(available).toBe(true);

      delete process.env.ANTHROPIC_API_KEY;
      const unavailable = await provider.isAvailable();
      expect(unavailable).toBe(false);
    });
  });

  describe('OpenAIProvider', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider({
        model: 'gpt-4-turbo-preview',
        temperature: 0.3
      });
    });

    it('should complete a request successfully', async () => {
      const messages = [
        { role: 'system' as const, content: 'You are a helpful assistant' },
        { role: 'user' as const, content: 'Make a decision' }
      ];

      const response = await provider.complete(messages);

      expect(response).toMatchObject({
        content: expect.stringContaining('action'),
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150
        }
      });
    });

    it('should validate decision format', () => {
      const invalidResponse = '{"action":"commit","reasoning":"Missing confidence"}';
      
      expect(() => provider.parseDecision(invalidResponse)).toThrow('Invalid decision format from LLM');
    });
  });

  describe('LLMProviderFactory', () => {
    it('should create Anthropic provider', () => {
      const provider = LLMProviderFactory.create(mockConfig);
      expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it('should create OpenAI provider', () => {
      const openAIConfig = {
        ...mockConfig,
        llm: { ...mockConfig.llm, provider: 'openai' as const }
      };
      const provider = LLMProviderFactory.create(openAIConfig);
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should throw error for unsupported provider', () => {
      const localConfig = {
        ...mockConfig,
        llm: { ...mockConfig.llm, provider: 'local' as const }
      };
      
      expect(() => LLMProviderFactory.create(localConfig)).toThrow('Local LLM provider not yet implemented');
    });

    it('should validate provider availability', async () => {
      const provider = LLMProviderFactory.create(mockConfig);
      const isValid = await LLMProviderFactory.validateProvider(provider);
      expect(isValid).toBe(true);
    });
  });
});