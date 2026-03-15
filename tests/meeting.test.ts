/**
 * Meeting Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { Meeting } from '../src/meeting.js';
import { VoiceAgent } from '../src/agent.js';
import { BaseTTSProvider } from '../src/providers/tts/base.js';
import { BaseLLMProvider } from '../src/providers/llm/base.js';

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
    return 'Mock LLM response';
  }
  async chat(_messages: { role: string; content: string }[]): Promise<string> {
    return 'Mock chat response';
  }
}

describe('Meeting', () => {
  const createMockAgent = (name: string): VoiceAgent => {
    return new VoiceAgent({
      name,
      persona: 'Test persona',
      voice: { provider: new MockTTSProvider() },
      llm: { provider: new MockLLMProvider() },
    });
  };

  it('should set topic and agents in constructor', () => {
    const agents = [createMockAgent('Alice'), createMockAgent('Bob')];
    const meeting = new Meeting({
      topic: 'Architecture discussion',
      agents,
      maxTurns: 10,
    });

    expect(meeting.topic).toBe('Architecture discussion');
    expect(meeting.agents).toHaveLength(2);
    expect(meeting.maxTurns).toBe(10);
  });

  it('should start with idle status', () => {
    const meeting = new Meeting({
      topic: 'Test',
      agents: [createMockAgent('Test')],
    });

    expect(meeting.status).toBe('idle');
  });

  it('should transition status via start()', async () => {
    const meeting = new Meeting({
      topic: 'Test',
      agents: [createMockAgent('Test')],
    });

    await meeting.start();

    expect(meeting.status).toBe('active');
  });

  it('should transition status via end()', async () => {
    const meeting = new Meeting({
      topic: 'Test',
      agents: [createMockAgent('Test')],
    });

    await meeting.start();
    await meeting.end();

    expect(meeting.status).toBe('ended');
  });

  it('should emit meeting_start event', async () => {
    const meeting = new Meeting({
      topic: 'Test Event',
      agents: [createMockAgent('Test')],
    });

    const handler = vi.fn();
    meeting.on('meeting_start', handler);

    await meeting.start();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'Test Event' })
    );
  });

  it('should emit meeting_end event', async () => {
    const meeting = new Meeting({
      topic: 'Test End',
      agents: [createMockAgent('Test')],
    });

    const handler = vi.fn();
    meeting.on('meeting_end', handler);

    await meeting.start();
    await meeting.end();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should emit turn_start event on runTurn()', async () => {
    const meeting = new Meeting({
      topic: 'Turn Test',
      agents: [createMockAgent('Speaker')],
      maxTurns: 1,
    });

    const handler = vi.fn();
    meeting.on('turn_start', handler);

    await meeting.start();
    await meeting.runTurn();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: expect.objectContaining({ name: 'Speaker' }),
        turnNumber: 1,
      })
    );
  });

  it('should emit turn_end event on runTurn()', async () => {
    const meeting = new Meeting({
      topic: 'Turn Test',
      agents: [createMockAgent('Speaker')],
      maxTurns: 1,
    });

    const handler = vi.fn();
    meeting.on('turn_end', handler);

    await meeting.start();
    await meeting.runTurn();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: expect.objectContaining({ name: 'Speaker' }),
        turnNumber: 1,
        text: expect.any(String),
      })
    );
  });

  it('should track turn count correctly', async () => {
    const meeting = new Meeting({
      topic: 'Count Test',
      agents: [createMockAgent('A')],
      maxTurns: 3,
    });

    await meeting.start();
    expect(meeting.currentTurn).toBe(0);

    await meeting.runTurn();
    expect(meeting.currentTurn).toBe(1);

    await meeting.runTurn();
    expect(meeting.currentTurn).toBe(2);
  });

  it('should respect maxTurns', async () => {
    const meeting = new Meeting({
      topic: 'Max Turns',
      agents: [createMockAgent('A')],
      maxTurns: 2,
    });

    const handler = vi.fn();
    meeting.on('turn_end', handler);

    await meeting.start();
    await meeting.run(); // Run complete meeting

    expect(handler).toHaveBeenCalledTimes(2);
    expect(meeting.status).toBe('ended');
  });

  it('should return transcript from run()', async () => {
    const meeting = new Meeting({
      topic: 'Transcript Test',
      agents: [createMockAgent('Speaker')],
      maxTurns: 2,
    });

    await meeting.start();
    const transcript = await meeting.run();

    expect(transcript).toBeDefined();
    expect(transcript.topic).toBe('Transcript Test');
    expect(transcript.totalTurns).toBe(2);
    expect(transcript.turns).toHaveLength(2);
  });

  it('should agents take turns in order', async () => {
    const agents = [createMockAgent('A'), createMockAgent('B')];
    const meeting = new Meeting({
      topic: 'Order Test',
      agents,
      maxTurns: 4,
    });

    const handler = vi.fn();
    meeting.on('turn_start', handler);

    await meeting.start();
    await meeting.run();

    const calls = handler.mock.calls;
    expect(calls[0][0].agent.name).toBe('A');
    expect(calls[1][0].agent.name).toBe('B');
    expect(calls[2][0].agent.name).toBe('A');
    expect(calls[3][0].agent.name).toBe('B');
  });

  it('should support pause and resume', async () => {
    const meeting = new Meeting({
      topic: 'Pause Test',
      agents: [createMockAgent('Test')],
    });

    await meeting.start();
    expect(meeting.status).toBe('active');

    meeting.pause();
    expect(meeting.status).toBe('paused');

    meeting.resume();
    expect(meeting.status).toBe('active');
  });
});
