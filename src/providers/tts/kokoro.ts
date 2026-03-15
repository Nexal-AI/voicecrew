import { BaseTTSProvider } from './base.js';
import type { TTSConfig } from '../../types.js';

export interface KokoroTTSConfig extends TTSConfig {
  voice?: string;
  speed?: number;
}

export class KokoroTTS extends BaseTTSProvider {
  readonly name = 'kokoro';
  private voice: string;
  private speed: number;

  constructor(config: KokoroTTSConfig = {}) {
    super(config);
    this.voice = config.voice ?? 'af_heart';
    this.speed = config.speed ?? 1.0;
  }

  async synthesize(text: string): Promise<Uint8Array> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Mock implementation - returns empty audio data
    // In real implementation, this would call Kokoro TTS API
    return new Uint8Array(0);
  }

  getVoice(): string {
    return this.voice;
  }

  getSpeed(): number {
    return this.speed;
  }
}
