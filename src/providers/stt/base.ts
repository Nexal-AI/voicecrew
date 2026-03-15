import type { STTConfig, STTProvider } from '../../types.js';

export abstract class BaseSTTProvider implements STTProvider {
  abstract readonly name: string;
  protected config: STTConfig;

  constructor(config: STTConfig = {}) {
    this.config = config;
  }

  abstract transcribe(audio: Uint8Array | Buffer): Promise<string>;

  async dispose(): Promise<void> {
    // Default no-op implementation
  }
}

export { type STTConfig, type STTProvider };
