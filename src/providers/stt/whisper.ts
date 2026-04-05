import { BaseSTTProvider } from './base.js';
import type { STTConfig } from '../../types.js';

export interface WhisperConfig extends STTConfig {
  /** OpenAI API key (required for OpenAI mode, ignored for local mode) */
  apiKey?: string;
  /** Mode: "openai" uses the OpenAI Whisper API, "local" uses a local binary */
  mode?: 'openai' | 'local';
  /** OpenAI model to use (default: "whisper-1") */
  model?: string;
  /** Path to local whisper binary or whisper.cpp (required for local mode) */
  localPath?: string;
  /** Language hint (ISO 639-1, e.g. "en") */
  language?: string;
  /** Temperature for OpenAI API sampling (default: 0) */
  temperature?: number;
}

export class WhisperSTT extends BaseSTTProvider {
  readonly name = 'whisper';
  private mode: 'openai' | 'local';
  private apiKey: string | undefined;
  private model: string;
  private localPath: string | undefined;
  private language: string;
  private temperature: number;

  constructor(config: WhisperConfig = {}) {
    super(config);
    this.mode = config.mode ?? 'openai';
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'whisper-1';
    this.localPath = config.localPath;
    this.language = config.language ?? 'en';
    this.temperature = config.temperature ?? 0;
  }

  async transcribe(audio: Uint8Array | Buffer): Promise<string> {
    if (!audio || audio.length === 0) {
      throw new Error('Audio data cannot be empty');
    }

    if (this.mode === 'local') {
      return this.transcribeLocal(audio);
    }
    return this.transcribeOpenAI(audio);
  }

  private async transcribeOpenAI(audio: Uint8Array | Buffer): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required for OpenAI Whisper mode');
    }

    const formData = new FormData();
    formData.append('file', new Blob([audio], { type: 'audio/wav' }), 'audio.wav');
    formData.append('model', this.model);
    formData.append('language', this.language);
    formData.append('temperature', String(this.temperature));
    formData.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Whisper API error (${response.status}): ${error}`);
    }

    const result = (await response.json()) as { text: string };
    return result.text;
  }

  private async transcribeLocal(audio: Uint8Array | Buffer): Promise<string> {
    if (!this.localPath) {
      throw new Error('Local whisper binary path is required for local mode');
    }

    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const { writeFile, unlink } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const tmpFile = join(tmpdir(), `whisper_${Date.now()}.wav`);
    try {
      await writeFile(tmpFile, audio);
      const execFileAsync = promisify(execFile);
      const { stdout } = await execFileAsync(this.localPath, [
        '--model', 'base',
        '--language', this.language,
        '--output-format', 'txt',
        tmpFile,
      ]);
      return stdout.trim();
    } finally {
      await unlink(tmpFile).catch(() => {});
    }
  }

  getMode(): string {
    return this.mode;
  }

  getModel(): string {
    return this.model;
  }

  getLanguage(): string {
    return this.language;
  }
}
