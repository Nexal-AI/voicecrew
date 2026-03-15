import type { LLMConfig, LLMMessage, LLMProvider } from '../../types.js';

export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly name: string;
  protected config: LLMConfig;

  constructor(config: LLMConfig = {}) {
    this.config = config;
  }

  abstract complete(prompt: string, options?: LLMConfig): Promise<string>;
  abstract chat(messages: LLMMessage[], options?: LLMConfig): Promise<string>;

  async dispose(): Promise<void> {
    // Default no-op implementation
  }
}

export { type LLMConfig, type LLMMessage, type LLMProvider };
