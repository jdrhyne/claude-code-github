import OpenAI from 'openai';
import { BaseLLMProvider, LLMMessage, LLMResponse, LLMProviderConfig } from './base-provider.js';
import { LLMDecision } from '../../types.js';

export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI | null = null;
  
  constructor(config: LLMProviderConfig) {
    super(config);
  }
  
  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.getApiKey(),
      });
    }
    return this.client;
  }
  
  async complete(messages: LLMMessage[]): Promise<LLMResponse> {
    try {
      const client = this.getClient();
      
      const response = await client.chat.completions.create({
        model: this.config.model || 'gpt-4-turbo-preview',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: this.config.temperature || 0.3,
        max_tokens: this.config.maxTokens || 1024,
        response_format: { type: 'json_object' },
      });
      
      const content = response.choices[0]?.message?.content || '';
      
      return {
        content,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
        model: response.model,
      };
    } catch (_error) {
      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API error: ${error.message}`);
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
    return 'OpenAI';
  }
  
  protected getApiKeyEnvVar(): string {
    return 'OPENAI_API_KEY';
  }
}