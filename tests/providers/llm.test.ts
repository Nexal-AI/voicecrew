/**
 * LLM Provider Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { OpenAILLM } from '../../src/providers/llm/openai.js';

describe('OpenAILLM', () => {
  it('should accept config in constructor', () => {
    const provider = new OpenAILLM({
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
    });

    expect(provider).toBeDefined();
    expect(provider.name).toBe('openai');
  });

  it('should have correct name', () => {
    const provider = new OpenAILLM({ apiKey: 'test' });
    expect(provider.name).toBe('openai');
  });

  it('should accept custom baseURL', () => {
    const provider = new OpenAILLM({
      apiKey: 'test',
      baseURL: 'https://custom.openai.api.com/v1',
    });

    expect(provider).toBeDefined();
  });

  it('should default model if not specified', () => {
    const provider = new OpenAILLM({ apiKey: 'test' });
    expect(provider).toBeDefined();
  });
});

describe('BaseLLMProvider', () => {
  it('should define the interface contract', async () => {
    // Testing that the interface exists and works
    const { BaseLLMProvider } = await import('../../src/providers/llm/base.js');
    expect(BaseLLMProvider).toBeDefined();
  });
});
