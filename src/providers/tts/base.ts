import type { TTSConfig, TTSProvider } from '../../types.js';

export abstract class BaseTTSProvider implements TTSProvider {
  abstract readonly name: string;
  protected config: TTSConfig;

  constructor(config: TTSConfig = {}) {
    this.config = config;
  }

  abstract synthesize(text: string): Promise<Uint8Array | Buffer>;

  async dispose(): Promise<void> {
    // Default no-op implementation
  }
}

export { type TTSConfig, type TTSProvider };
