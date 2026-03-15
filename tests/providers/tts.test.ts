/**
 * TTS Provider Unit Tests
 *
 * Covers:
 *  - Constructor / config acceptance (existing)
 *  - Behavioral: empty-text rejection
 *  - Behavioral: missing API key throws at construction (OpenAI)
 *  - Behavioral: HTTP error propagation
 *  - Behavioral: successful response returns non-empty Buffer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KokoroTTS } from '../../src/providers/tts/kokoro.js';
import { OpenAITTS } from '../../src/providers/tts/openai.js';

// ---------------------------------------------------------------------------
// KokoroTTS — constructor / config
// ---------------------------------------------------------------------------

describe('KokoroTTS — constructor', () => {
  it('should accept voice in constructor', () => {
    const provider = new KokoroTTS({ voice: 'af_heart' });
    expect(provider).toBeDefined();
    expect(provider.name).toBe('kokoro');
  });

  it('should have correct name', () => {
    const provider = new KokoroTTS({ voice: 'af_heart' });
    expect(provider.name).toBe('kokoro');
  });

  it('should accept optional config parameters', () => {
    const provider = new KokoroTTS({ voice: 'am_adam', speed: 1.2 });
    expect(provider).toBeDefined();
    expect(provider.getSpeed()).toBe(1.2);
  });

  it('should default to af_heart voice when none provided', () => {
    const provider = new KokoroTTS();
    expect(provider.getVoice()).toBe('af_heart');
  });
});

// ---------------------------------------------------------------------------
// KokoroTTS — behavioral (fetch mocked)
// ---------------------------------------------------------------------------

describe('KokoroTTS — behavioral', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should throw when text is empty', async () => {
    const provider = new KokoroTTS({ voice: 'af_heart' });
    await expect(provider.synthesize('')).rejects.toThrow('Text cannot be empty');
  });

  it('should throw when text is whitespace only', async () => {
    const provider = new KokoroTTS({ voice: 'af_heart' });
    await expect(provider.synthesize('   ')).rejects.toThrow('Text cannot be empty');
  });

  it('should propagate HTTP error responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Service Unavailable', { status: 503 }),
    );

    const provider = new KokoroTTS({ voice: 'af_heart' });
    await expect(provider.synthesize('Hello')).rejects.toThrow(
      'Kokoro TTS API error 503',
    );
  });

  it('should return a non-empty Buffer on success', async () => {
    const fakeAudio = new Uint8Array([0xff, 0xfb, 0x10, 0x00]).buffer;
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(fakeAudio, { status: 200 }),
    );

    const provider = new KokoroTTS({ voice: 'af_heart' });
    const result = await provider.synthesize('Hello world');

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should POST to the correct endpoint', async () => {
    const fakeAudio = new Uint8Array([0x00]).buffer;
    const mockFetch = vi.mocked(fetch).mockResolvedValueOnce(
      new Response(fakeAudio, { status: 200 }),
    );

    const provider = new KokoroTTS({
      voice: 'af_heart',
      baseURL: 'http://localhost:8880/v1',
    });
    await provider.synthesize('Test');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8880/v1/audio/speech',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

// ---------------------------------------------------------------------------
// OpenAITTS — constructor / config
// ---------------------------------------------------------------------------

describe('OpenAITTS — constructor', () => {
  it('should accept config with explicit apiKey', () => {
    const provider = new OpenAITTS({ apiKey: 'test-key', voice: 'alloy' });
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
    expect(provider.getModel()).toBe('tts-1-hd');
  });

  it('should default to alloy voice when none provided', () => {
    const provider = new OpenAITTS({ apiKey: 'test-key' });
    expect(provider.getVoice()).toBe('alloy');
  });

  it('should use OPENAI_API_KEY env var when no apiKey in config', () => {
    const original = process.env['OPENAI_API_KEY'];
    process.env['OPENAI_API_KEY'] = 'env-key';
    try {
      const provider = new OpenAITTS();
      expect(provider).toBeDefined();
    } finally {
      if (original === undefined) {
        delete process.env['OPENAI_API_KEY'];
      } else {
        process.env['OPENAI_API_KEY'] = original;
      }
    }
  });
});

// ---------------------------------------------------------------------------
// OpenAITTS — missing API key throws at construction
// ---------------------------------------------------------------------------

describe('OpenAITTS — constructor API key guard', () => {
  it('should throw at construction when no apiKey and no env var', () => {
    const original = process.env['OPENAI_API_KEY'];
    delete process.env['OPENAI_API_KEY'];

    try {
      expect(() => new OpenAITTS()).toThrow(
        'OpenAI API key is required',
      );
    } finally {
      if (original !== undefined) {
        process.env['OPENAI_API_KEY'] = original;
      }
    }
  });

  it('should throw with a descriptive message mentioning env var', () => {
    const original = process.env['OPENAI_API_KEY'];
    delete process.env['OPENAI_API_KEY'];

    try {
      expect(() => new OpenAITTS()).toThrow('OPENAI_API_KEY');
    } finally {
      if (original !== undefined) {
        process.env['OPENAI_API_KEY'] = original;
      }
    }
  });
});

// ---------------------------------------------------------------------------
// OpenAITTS — behavioral (fetch mocked)
// ---------------------------------------------------------------------------

describe('OpenAITTS — behavioral', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should throw when text is empty', async () => {
    const provider = new OpenAITTS({ apiKey: 'test-key' });
    await expect(provider.synthesize('')).rejects.toThrow('Text cannot be empty');
  });

  it('should throw when text is whitespace only', async () => {
    const provider = new OpenAITTS({ apiKey: 'test-key' });
    await expect(provider.synthesize('   ')).rejects.toThrow('Text cannot be empty');
  });

  it('should propagate HTTP 401 error responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 }),
    );

    const provider = new OpenAITTS({ apiKey: 'bad-key' });
    await expect(provider.synthesize('Hello')).rejects.toThrow(
      'OpenAI TTS API error 401',
    );
  });

  it('should propagate HTTP 429 rate limit responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Rate limit exceeded', { status: 429 }),
    );

    const provider = new OpenAITTS({ apiKey: 'test-key' });
    await expect(provider.synthesize('Hello')).rejects.toThrow(
      'OpenAI TTS API error 429',
    );
  });

  it('should return a non-empty Buffer on success', async () => {
    const fakeAudio = new Uint8Array([0xff, 0xfb, 0x90, 0x00, 0x01]).buffer;
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(fakeAudio, { status: 200 }),
    );

    const provider = new OpenAITTS({ apiKey: 'test-key' });
    const result = await provider.synthesize('Hello world');

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should POST to the correct OpenAI endpoint', async () => {
    const fakeAudio = new Uint8Array([0x00]).buffer;
    const mockFetch = vi.mocked(fetch).mockResolvedValueOnce(
      new Response(fakeAudio, { status: 200 }),
    );

    const provider = new OpenAITTS({ apiKey: 'test-key' });
    await provider.synthesize('Test');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/audio/speech',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('should send Authorization header with Bearer token', async () => {
    const fakeAudio = new Uint8Array([0x00]).buffer;
    const mockFetch = vi.mocked(fetch).mockResolvedValueOnce(
      new Response(fakeAudio, { status: 200 }),
    );

    const provider = new OpenAITTS({ apiKey: 'sk-test-12345' });
    await provider.synthesize('Test');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test-12345',
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// BaseTTSProvider
// ---------------------------------------------------------------------------

describe('BaseTTSProvider', () => {
  it('should define the interface contract', async () => {
    const { BaseTTSProvider } = await import('../../src/providers/tts/base.js');
    expect(BaseTTSProvider).toBeDefined();
  });
});
