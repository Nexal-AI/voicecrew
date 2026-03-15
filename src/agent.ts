import type {
  VoiceAgent,
  VoiceAgentConfig,
  AgentThinkOptions,
  TTSProvider,
  LLMProvider,
  STTProvider,
} from './types.js';

export class VoiceAgentImpl implements VoiceAgent {
  readonly config: VoiceAgentConfig;
  private ttsProvider: TTSProvider;
  private llmProvider: LLMProvider;
  private sttProvider?: STTProvider;

  constructor(config: VoiceAgentConfig) {
    this.validateConfig(config);
    this.config = config;
    this.ttsProvider = config.voice.provider;
    this.llmProvider = config.llm.provider;
    if (config.stt?.provider !== undefined) {
      this.sttProvider = config.stt.provider;
    }
  }

  get name(): string {
    return this.config.name;
  }

  get persona(): string {
    return this.config.persona;
  }

  async think(context: string, options?: AgentThinkOptions): Promise<string> {
    try {
      const prompt = this.buildPrompt(context, options?.systemPrompt);
      return await this.llmProvider.complete(prompt);
    } catch (error) {
      throw new Error(
        `Agent ${this.name} failed to think: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async speak(text: string): Promise<Uint8Array | Buffer> {
    try {
      return await this.ttsProvider.synthesize(text);
    } catch (error) {
      throw new Error(
        `Agent ${this.name} failed to speak: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private validateConfig(config: VoiceAgentConfig): void {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Agent name is required');
    }
    if (!config.persona || config.persona.trim().length === 0) {
      throw new Error('Agent persona is required');
    }
    if (!config.voice?.provider) {
      throw new Error('Voice provider is required');
    }
    if (!config.llm?.provider) {
      throw new Error('LLM provider is required');
    }
  }

  /**
   * Builds the prompt for the LLM.
   *
   * @param context - The conversation context
   * @param systemPromptOverride - Complete override of the default system message.
   *                               When provided, this REPLACES the auto-generated
   *                               system prompt entirely (it does not prepend or append).
   * @returns The final prompt string to send to the LLM
   */
  private buildPrompt(context: string, systemPromptOverride?: string): string {
    // When systemPromptOverride is provided, it replaces the entire default system message.
    // This is intentional — it gives users full control over the prompt structure.
    if (systemPromptOverride !== undefined && systemPromptOverride.trim().length > 0) {
      return systemPromptOverride;
    }

    // Default behavior: combine agent identity with context
    return `You are ${this.name}. ${this.persona}\n\nContext: ${context}`;
  }
}

export { VoiceAgentImpl as VoiceAgent };
