/**
 * VoiceAgent Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { VoiceAgent } from '../src/agent.js';
import { BaseTTSProvider } from '../src/providers/tts/base.js';
import { BaseLLMProvider } from '../src/providers/llm/base.js';

// Mock Providers
class MockTTSProvider extends BaseTTSProvider {
  readonly name = 'mock-tts';
  synthesizeMock = vi.fn().mockResolvedValue(new Uint8Array([0, 1, 2, 3]));

  async synthesize(text: string): Promise<Uint8Array> {
    return this.synthesizeMock(text);
  }
}

class MockLLMProvider extends BaseLLMProvider {
  readonly name = 'mock-llm';
  completeMock = vi.fn().mockResolvedValue('Mock response');
  chatMock = vi.fn().mockResolvedValue('Mock chat response');

  async complete(prompt: string): Promise<string> {
    return this.completeMock(prompt);
  }

  async chat(messages: { role: string; content: string }[]): Promise<string> {
    return this.chatMock(messages);
  }
}

describe('VoiceAgent', () => {
  const createAgent = (): { agent: VoiceAgent; mockTTS: MockTTSProvider; mockLLM: MockLLMProvider } => {
    const mockTTS = new MockTTSProvider();
    const mockLLM = new MockLLMProvider();

    const agent = new VoiceAgent({
      name: 'TestAgent',
      persona: 'A helpful test assistant',
      voice: { provider: mockTTS },
      llm: { provider: mockLLM },
    });

    return { agent, mockTTS, mockLLM };
  };

  it('should set name and persona in constructor', () => {
    const { agent } = createAgent();

    expect(agent.name).toBe('TestAgent');
    expect(agent.persona).toBe('A helpful test assistant');
  });

  it('should think() call LLM provider complete()', async () => {
    const { agent, mockLLM } = createAgent();

    const response = await agent.think('What is the weather?');

    expect(mockLLM.completeMock).toHaveBeenCalledTimes(1);
    expect(mockLLM.completeMock).toHaveBeenCalledWith(
      expect.stringContaining('What is the weather?')
    );
    expect(response).toBe('Mock response');
  });

  it('should think() include persona in context', async () => {
    const { agent, mockLLM } = createAgent();

    await agent.think('Test prompt');

    const callArg = mockLLM.completeMock.mock.calls[0][0];
    expect(callArg).toContain('A helpful test assistant');
  });

  it('should speak() call TTS provider synthesize()', async () => {
    const { agent, mockTTS } = createAgent();

    const audio = await agent.speak('Hello world');

    expect(mockTTS.synthesizeMock).toHaveBeenCalledTimes(1);
    expect(mockTTS.synthesizeMock).toHaveBeenCalledWith('Hello world');
    expect(audio).toBeInstanceOf(Uint8Array);
  });

  it('should handle LLM errors gracefully', async () => {
    const { agent, mockLLM } = createAgent();
    mockLLM.completeMock.mockRejectedValue(new Error('LLM service down'));

    // Agent should throw or handle error - testing it propagates
    await expect(agent.think('Test')).rejects.toThrow('LLM service down');
  });

  it('should handle TTS errors gracefully', async () => {
    const { agent, mockTTS } = createAgent();
    mockTTS.synthesizeMock.mockRejectedValue(new Error('TTS service down'));

    await expect(agent.speak('Test')).rejects.toThrow('TTS service down');
  });

  it('should support custom system prompt', () => {
    const mockTTS = new MockTTSProvider();
    const mockLLM = new MockLLMProvider();

    const agent = new VoiceAgent({
      name: 'CustomAgent',
      persona: 'Custom persona',
      systemPrompt: 'You are a specialized coding assistant',
      voice: { provider: mockTTS },
      llm: { provider: mockLLM },
    });

    expect(agent.name).toBe('CustomAgent');
    expect(agent.persona).toBe('Custom persona');
  });
});
