/**
 * VoiceCrew Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { VoiceCrew, VoiceAgent } from '../src/index.js';
import { BaseTTSProvider } from '../src/providers/tts/base.js';
import { BaseLLMProvider } from '../src/providers/llm/base.js';
import type { Meeting } from '../src/meeting.js';

// Mock Providers
class MockTTSProvider extends BaseTTSProvider {
  readonly name = 'mock-tts';
  async synthesize(_text: string): Promise<Uint8Array> {
    return new Uint8Array([0, 1, 2, 3]);
  }
}

class MockLLMProvider extends BaseLLMProvider {
  readonly name = 'mock-llm';
  async complete(_prompt: string): Promise<string> {
    return 'Mock response';
  }
  async chat(_messages: { role: string; content: string }[]): Promise<string> {
    return 'Mock chat response';
  }
}

describe('VoiceCrew', () => {
  const createMockAgent = (name: string): VoiceAgent => {
    return new VoiceAgent({
      name,
      persona: 'Test persona',
      voice: { provider: new MockTTSProvider() },
      llm: { provider: new MockLLMProvider() },
    });
  };

  it('should create crew with agents in constructor', () => {
    const agents = [createMockAgent('Alice'), createMockAgent('Bob')];
    const crew = new VoiceCrew({ agents });

    expect(crew).toBeDefined();
    expect(crew.agents).toHaveLength(2);
    expect(crew.agents[0].name).toBe('Alice');
    expect(crew.agents[1].name).toBe('Bob');
  });

  it('should create crew with empty agents array', () => {
    const crew = new VoiceCrew({ agents: [] });
    expect(crew.agents).toHaveLength(0);
  });

  it('should add agent via addAgent()', () => {
    const crew = new VoiceCrew({ agents: [] });
    const agent = createMockAgent('Charlie');

    crew.addAgent(agent);

    expect(crew.agents).toHaveLength(1);
    expect(crew.agents[0].name).toBe('Charlie');
  });

  it('should remove agent via removeAgent()', () => {
    const agent = createMockAgent('Dave');
    const crew = new VoiceCrew({ agents: [agent] });

    crew.removeAgent(agent);

    expect(crew.agents).toHaveLength(0);
  });

  it('should startMeeting() create and return a Meeting instance', async () => {
    const crew = new VoiceCrew({ agents: [createMockAgent('Eve')] });

    const meeting = await crew.startMeeting({
      topic: 'Test meeting',
      maxTurns: 5,
    });

    expect(meeting).toBeDefined();
    expect(meeting.topic).toBe('Test meeting');
    expect(meeting.maxTurns).toBe(5);
    expect(meeting.agents).toHaveLength(1);
  });

  it('should throw when starting meeting with zero agents', async () => {
    const crew = new VoiceCrew({ agents: [] });

    await expect(
      crew.startMeeting({ topic: 'Empty meeting' })
    ).rejects.toThrow();
  });

  it('should maintain agent order', () => {
    const agent1 = createMockAgent('First');
    const agent2 = createMockAgent('Second');
    const agent3 = createMockAgent('Third');

    const crew = new VoiceCrew({ agents: [agent1, agent2] });
    crew.addAgent(agent3);

    expect(crew.agents[0].name).toBe('First');
    expect(crew.agents[1].name).toBe('Second');
    expect(crew.agents[2].name).toBe('Third');
  });
});
