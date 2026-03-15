import { BaseTTSProvider } from './base.js';
import type { TTSConfig } from '../../types.js';

export interface OpenAITTSConfig extends TTSConfig {
  apiKey?: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  model?: string;
  baseURL?: string;
}

export class OpenAITTS extends BaseTTSProvider {
  readonly name = 'openai-tts';
  private apiKey: string | undefined;
  private voice: string;
  private model: string;
  private baseURL: string;

  constructor(config: OpenAITTSConfig = {}) {
    super(config);
    this.apiKey = config.apiKey ?? process.env['OPENAI_API_KEY'];
    this.voice = config.voice ?? 'alloy';
    this.model = config.model ?? 'tts-1';
    this.baseURL = config.baseURL ?? 'https://api.openai.com/v1';
  }

  async synthesize(text: string): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error(
        'OpenAI API key is required. Pass apiKey in config or set OPENAI_API_KEY env var.',
      );
    }
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const response = await fetch(`${this.baseURL}/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
        voice: this.voice,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenAI TTS API error ${response.status}: ${errorBody}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  getVoice(): string {
    return this.voice;
  }

  getModel(): string {
    return this.model;
  }
}
