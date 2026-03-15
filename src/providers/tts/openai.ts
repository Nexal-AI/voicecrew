import { BaseTTSProvider } from './base.js';
import type { TTSConfig } from '../../types.js';

export interface OpenAITTSConfig extends TTSConfig {
  apiKey?: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  model?: string;
}

export class OpenAITTS extends BaseTTSProvider {
  readonly name = 'openai-tts';
  private apiKey: string | undefined;
  private voice: string;
  private model: string;

  constructor(config: OpenAITTSConfig = {}) {
    super(config);
    this.apiKey = config.apiKey;
    this.voice = config.voice ?? 'alloy';
    this.model = config.model ?? 'tts-1';
  }

  async synthesize(text: string): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Mock implementation - returns empty buffer
    // In real implementation, this would call OpenAI TTS API
    return Buffer.alloc(0);
  }

  getVoice(): string {
    return this.voice;
  }

  getModel(): string {
    return this.model;
  }
}
