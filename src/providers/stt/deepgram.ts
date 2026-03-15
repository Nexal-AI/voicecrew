import { BaseSTTProvider } from './base.js';
import type { STTConfig } from '../../types.js';

export interface DeepgramConfig extends STTConfig {
  apiKey?: string;
  language?: string;
  model?: string;
}

export class DeepgramSTT extends BaseSTTProvider {
  readonly name = 'deepgram';
  private apiKey: string | undefined;
  private language: string;
  private model: string;

  constructor(config: DeepgramConfig = {}) {
    super(config);
    this.apiKey = config.apiKey;
    this.language = config.language ?? 'en-US';
    this.model = config.model ?? 'nova-2';
  }

  async transcribe(audio: Uint8Array | Buffer): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Deepgram API key is required');
    }
    if (!audio || audio.length === 0) {
      throw new Error('Audio data cannot be empty');
    }

    // Mock implementation
    // In real implementation, this would call Deepgram API
    return 'Transcribed text from audio';
  }

  getLanguage(): string {
    return this.language;
  }

  getModel(): string {
    return this.model;
  }
}
