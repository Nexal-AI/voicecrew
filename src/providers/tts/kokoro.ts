import { BaseTTSProvider } from './base.js';
import type { TTSConfig } from '../../types.js';

export interface KokoroTTSConfig extends TTSConfig {
  voice?: string;
  speed?: number;
  baseURL?: string;
}

export class KokoroTTS extends BaseTTSProvider {
  readonly name = 'kokoro';
  private voice: string;
  private speed: number;
  private baseURL: string;

  constructor(config: KokoroTTSConfig = {}) {
    super(config);
    this.voice = config.voice ?? 'af_heart';
    this.speed = config.speed ?? 1.0;
    this.baseURL = config.baseURL ?? 'http://localhost:8880/v1';
  }

  async synthesize(text: string): Promise<Buffer> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const response = await fetch(`${this.baseURL}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'kokoro',
        input: text,
        voice: this.voice,
        speed: this.speed,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Kokoro TTS API error ${response.status}: ${errorBody}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  getVoice(): string {
    return this.voice;
  }

  getSpeed(): number {
    return this.speed;
  }
}
