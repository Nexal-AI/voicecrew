import { describe, it, expect } from 'vitest';
import { WhisperSTT } from '../../../src/providers/stt/whisper.js';

describe('WhisperSTT', () => {
  describe('constructor defaults', () => {
    it('defaults to openai mode', () => {
      const stt = new WhisperSTT();
      expect(stt.getMode()).toBe('openai');
      expect(stt.getModel()).toBe('whisper-1');
      expect(stt.getLanguage()).toBe('en');
    });

    it('accepts custom config', () => {
      const stt = new WhisperSTT({ mode: 'local', model: 'large', language: 'es' });
      expect(stt.getMode()).toBe('local');
      expect(stt.getModel()).toBe('large');
      expect(stt.getLanguage()).toBe('es');
    });
  });

  describe('transcribe', () => {
    it('throws on empty audio', async () => {
      const stt = new WhisperSTT();
      await expect(stt.transcribe(Buffer.alloc(0))).rejects.toThrow('Audio data cannot be empty');
    });

    it('throws when API key is missing in openai mode', async () => {
      const stt = new WhisperSTT({ mode: 'openai' });
      await expect(stt.transcribe(Buffer.from('fake-audio'))).rejects.toThrow('OpenAI API key is required');
    });

    it('throws when localPath is missing in local mode', async () => {
      const stt = new WhisperSTT({ mode: 'local' });
      await expect(stt.transcribe(Buffer.from('fake-audio'))).rejects.toThrow('Local whisper binary path is required');
    });
  });
});
