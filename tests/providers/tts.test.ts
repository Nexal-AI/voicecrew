/**
 * TTS Provider Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { KokoroTTS } from '../../src/providers/tts/kokoro.js';
import { OpenAITTS } from '../../src/providers/tts/openai.js';

describe('KokoroTTS', () => {
  it('should accept voice in constructor', () => {
    const provider = new KokoroTTS({
      voice: 'af_heart',
    });

    expect(provider).toBeDefined();
    expect(provider.name).toBe('kokoro');
  });

  it('should have correct name', () => {
    const provider = new KokoroTTS({ voice: 'af_heart' });
    expect(provider.name).toBe('kokoro');
  });

  it('should accept optional config parameters', () => {
    const provider = new KokoroTTS({
      voice: 'am_adam',
      speed: 1.2,
    });

    expect(provider).toBeDefined();
  });
});

describe('OpenAITTS', () => {
  it('should accept config in constructor', () => {
    const provider = new OpenAITTS({
      apiKey: 'test-key',
      voice: 'alloy',
    });

    expect(provider).toBeDefined();
    expect(provider.name).toBe('openai-tts');
  });

  it('should have correct name', () => {
    const provider = new OpenAITTS({ apiKey: 'test', voice: 'echo' });
    expect(provider.name).toBe('openai-tts');
  });

  it('should accept model parameter', () => {
    const provider = new OpenAITTS({
      apiKey: 'test',
      voice: 'fable',
      model: 'tts-1-hd',
    });

    expect(provider).toBeDefined();
  });
});

describe('BaseTTSProvider', () => {
  it('should define the interface contract', async () => {
    const { BaseTTSProvider } = await import('../../src/providers/tts/base.js');
    expect(BaseTTSProvider).toBeDefined();
  });
});
