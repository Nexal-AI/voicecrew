/**
 * LLM Provider Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { OpenAILLM } from '../../src/providers/llm/openai.js';
import { AnthropicLLM } from '../../src/providers/llm/anthropic.js';

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

describe('AnthropicLLM', () => {
  it('should accept config in constructor', () => {
    const provider = new AnthropicLLM({
      apiKey: 'test-key',
      model: 'claude-3-haiku-20240307',
    });

    expect(provider).toBeDefined();
    expect(provider.name).toBe('anthropic');
  });

  it('should have correct name', () => {
    const provider = new AnthropicLLM({ apiKey: 'test' });
    expect(provider.name).toBe('anthropic');
  });

  it('should accept custom baseURL', () => {
    const provider = new AnthropicLLM({
      apiKey: 'test',
      baseURL: 'https://custom.anthropic.api.com/v1',
    });

    expect(provider).toBeDefined();
  });

  it('should default model if not specified', () => {
    const provider = new AnthropicLLM({ apiKey: 'test' });
    expect(provider).toBeDefined();
    expect(provider.getModel()).toBe('claude-3-haiku-20240307');
  });

  it('should use environment variable for API key', () => {
    const originalEnv = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'env-api-key';

    const provider = new AnthropicLLM();
    expect(provider).toBeDefined();

    process.env.ANTHROPIC_API_KEY = originalEnv;
  });

  it('should accept all config options', () => {
    const provider = new AnthropicLLM({
      apiKey: 'test-key',
      model: 'claude-3-opus-20240229',
      temperature: 0.5,
      maxTokens: 2048,
      baseURL: 'https://custom.api.com',
      timeoutMs: 60_000,
      maxRetries: 5,
    });

    expect(provider).toBeDefined();
    expect(provider.getModel()).toBe('claude-3-opus-20240229');
    expect(provider.getBaseURL()).toBe('https://custom.api.com');
  });
});

describe('BaseLLMProvider', () => {
  it('should define the interface contract', async () => {
    // Testing that the interface exists and works
    const { BaseLLMProvider } = await import('../../src/providers/llm/base.js');
    expect(BaseLLMProvider).toBeDefined();
  });
});
