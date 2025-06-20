import { LLMDecision } from '../../types.js';

export interface LLMProviderConfig {
  apiKey?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
}

export abstract class BaseLLMProvider {
  protected config: LLMProviderConfig;
  
  constructor(config: LLMProviderConfig) {
    this.config = config;
  }
  
  abstract complete(messages: LLMMessage[]): Promise<LLMResponse>;
  
  abstract parseDecision(response: string): LLMDecision;
  
  abstract isAvailable(): Promise<boolean>;
  
  abstract getName(): string;
  
  protected getApiKey(): string {
    if (this.config.apiKey) {
      return this.config.apiKey;
    }
    
    // Try to get from environment
    const envKey = this.getApiKeyEnvVar();
    const apiKey = process.env[envKey];
    
    if (!apiKey) {
      throw new Error(`API key not found. Set ${envKey} environment variable.`);
    }
    
    return apiKey;
  }
  
  protected abstract getApiKeyEnvVar(): string;
  
  protected parseJSON<T>(text: string): T | null {
    // Extract JSON from various response formats
    const patterns = [
      /```json\n([\s\S]*?)\n```/,
      /```\n([\s\S]*?)\n```/,
      /\{[\s\S]*\}/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const jsonStr = match[1] || match[0];
          return JSON.parse(jsonStr);
        } catch {
          continue;
        }
      }
    }
    
    // Try parsing the entire text
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}