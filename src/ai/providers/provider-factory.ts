import { AutomationConfig } from '../../types.js';
import { BaseLLMProvider } from './base-provider.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { OpenAIProvider } from './openai-provider.js';

export class LLMProviderFactory {
  static create(config: AutomationConfig): BaseLLMProvider {
    const llmConfig = {
      model: config.llm.model,
      temperature: config.llm.temperature,
      apiKey: config.llm.api_key_env ? process.env[config.llm.api_key_env] : undefined,
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
    } catch (error) {
      console.error(`Provider validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}