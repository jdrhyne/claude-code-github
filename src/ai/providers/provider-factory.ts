import { AutomationConfig } from '../../types.js';
import { BaseLLMProvider, LLMProviderConfig } from './base-provider.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { APIKeyManager } from '../../cli/api-key-manager.js';

export class LLMProviderFactory {
  static async create(config: AutomationConfig): Promise<BaseLLMProvider> {
    // Get API key from keychain first, then fall back to env var
    const apiKey = await APIKeyManager.getEffectiveAPIKey(config.llm.provider as 'anthropic' | 'openai');
    
    const llmConfig: LLMProviderConfig = {
      model: config.llm.model || 'claude-3-sonnet-20240229',
      temperature: config.llm.temperature || 0.7,
      apiKey: apiKey,
    };
    
    switch (config.llm.provider) {
      case 'anthropic':
        return new AnthropicProvider(llmConfig);
        
      case 'openai':
        return new OpenAIProvider(llmConfig);
        
      case 'local':
        throw new Error('Local LLM provider not yet implemented');
        
      default:
        throw new Error(`Unknown LLM provider: ${config.llm.provider}`);
    }
  }
  
  static async validateProvider(provider: BaseLLMProvider): Promise<boolean> {
    try {
      const available = await provider.isAvailable();
      if (!available) {
        throw new Error(`${provider.getName()} provider is not available. Check API key configuration.`);
      }
      return true;
    } catch (_error) {
      console.error(`Provider validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}