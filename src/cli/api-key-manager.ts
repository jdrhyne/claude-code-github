import * as keytar from 'keytar';
import readline from 'readline';
import chalk from 'chalk';

const SERVICE_NAME = 'claude-code-github';
const ANTHROPIC_ACCOUNT = 'anthropic-api-key';
const OPENAI_ACCOUNT = 'openai-api-key';

export class APIKeyManager {
  /**
   * Store an API key securely
   */
  static async setAPIKey(provider: 'anthropic' | 'openai', apiKey: string): Promise<void> {
    const account = provider === 'anthropic' ? ANTHROPIC_ACCOUNT : OPENAI_ACCOUNT;
    await keytar.setPassword(SERVICE_NAME, account, apiKey);
    console.log(chalk.green(`✅ ${provider} API key stored securely in system keychain`));
  }

  /**
   * Retrieve an API key from secure storage
   */
  static async getAPIKey(provider: 'anthropic' | 'openai'): Promise<string | null> {
    const account = provider === 'anthropic' ? ANTHROPIC_ACCOUNT : OPENAI_ACCOUNT;
    return await keytar.getPassword(SERVICE_NAME, account);
  }

  /**
   * Delete an API key from secure storage
   */
  static async deleteAPIKey(provider: 'anthropic' | 'openai'): Promise<boolean> {
    const account = provider === 'anthropic' ? ANTHROPIC_ACCOUNT : OPENAI_ACCOUNT;
    return await keytar.deletePassword(SERVICE_NAME, account);
  }

  /**
   * Check if API key exists
   */
  static async hasAPIKey(provider: 'anthropic' | 'openai'): Promise<boolean> {
    const key = await this.getAPIKey(provider);
    return key !== null && key.length > 0;
  }

  /**
   * Interactive setup for API keys
   */
  static async setupAPIKeys(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(prompt, resolve);
      });
    };

    try {
      console.log(chalk.blue('\n🔑 API Key Setup for claude-code-github\n'));

      // Check existing keys
      const hasAnthropicKey = await this.hasAPIKey('anthropic');
      const hasOpenAIKey = await this.hasAPIKey('openai');

      if (hasAnthropicKey) {
        console.log(chalk.green('✓ Anthropic API key already stored'));
        const update = await question('Update Anthropic API key? (y/N): ');
        if (update.toLowerCase() === 'y') {
          const key = await question('Enter your Anthropic API key: ');
          if (key.trim()) {
            await this.setAPIKey('anthropic', key.trim());
          }
        }
      } else {
        console.log(chalk.yellow('⚠️  No Anthropic API key found'));
        const key = await question('Enter your Anthropic API key (or press Enter to skip): ');
        if (key.trim()) {
          await this.setAPIKey('anthropic', key.trim());
        }
      }

      if (hasOpenAIKey) {
        console.log(chalk.green('✓ OpenAI API key already stored'));
        const update = await question('Update OpenAI API key? (y/N): ');
        if (update.toLowerCase() === 'y') {
          const key = await question('Enter your OpenAI API key: ');
          if (key.trim()) {
            await this.setAPIKey('openai', key.trim());
          }
        }
      } else {
        console.log(chalk.yellow('⚠️  No OpenAI API key found'));
        const key = await question('Enter your OpenAI API key (or press Enter to skip): ');
        if (key.trim()) {
          await this.setAPIKey('openai', key.trim());
        }
      }

      console.log(chalk.green('\n✅ API key setup complete!\n'));
      console.log(chalk.gray('Keys are stored securely in your system keychain.'));
      console.log(chalk.gray('The service will automatically use them when needed.\n'));

    } finally {
      rl.close();
    }
  }

  /**
   * Get API key for use - checks keychain first, then env var
   */
  static async getEffectiveAPIKey(provider: 'anthropic' | 'openai'): Promise<string | undefined> {
    // First check keychain
    const storedKey = await this.getAPIKey(provider);
    if (storedKey) {
      return storedKey;
    }

    // Fall back to environment variable
    const envVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
    return process.env[envVar];
  }
}