import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider, LLMMessage, LLMResponse, LLMProviderConfig } from './base-provider.js';
import { LLMDecision } from '../../types.js';

export class AnthropicProvider extends BaseLLMProvider {
  private client: Anthropic | null = null;
  
  constructor(config: LLMProviderConfig) {
    super(config);
  }
  
  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({
        apiKey: this.getApiKey(),
      });
    }
    return this.client;
  }
  
  async complete(messages: LLMMessage[]): Promise<LLMResponse> {
    try {
      const client = this.getClient();
      
      // Convert messages to Anthropic format
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const otherMessages = messages.filter(m => m.role !== 'system');
      
      const response = await client.messages.create({
        model: this.config.model || 'claude-3-sonnet-20240229',
        max_tokens: this.config.maxTokens || 1024,
        temperature: this.config.temperature || 0.3,
        system: systemMessage,
        messages: otherMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
      });
      
      const content = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';
      
      return {
        content,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        model: response.model,
      };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(`Anthropic API error: ${error.message}`);
      }
      throw error;
    }
  }
  
  parseDecision(response: string): LLMDecision {
    const parsed = this.parseJSON<LLMDecision>(response);
    
    if (!parsed) {
      throw new Error('Failed to parse LLM response as JSON');
    }
    
    // Validate required fields
    if (!parsed.action || typeof parsed.confidence !== 'number' || !parsed.reasoning) {
      throw new Error('Invalid decision format from LLM');
    }
    
    return {
      action: parsed.action,
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      reasoning: parsed.reasoning,
      requiresApproval: parsed.requiresApproval ?? false,
      alternativeActions: parsed.alternativeActions,
      riskAssessment: parsed.riskAssessment,
    };
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const apiKey = this.getApiKey();
      return !!apiKey;
    } catch {
      return false;
    }
  }
  
  getName(): string {
    return 'Anthropic';
  }
  
  protected getApiKeyEnvVar(): string {
    return 'ANTHROPIC_API_KEY';
  }
}