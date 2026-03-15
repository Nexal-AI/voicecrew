/**
 * Integration Smoke Test for Voicecrew
 * 
 * This is the public API canary test — validates the API contract is intact after any change.
 * Tests the full stack: VoiceCrew → startMeeting() → runTurn() → validate turn event fires
 * 
 * Uses mock providers to keep the test environment-agnostic and fast.
 * 
 * Pre-drafted for v0.1.0 — will run immediately once package is published.
 */

import { describe, it, expect, vi } from 'vitest';
import { VoiceCrew, VoiceAgent } from '../../src/index.js';
import { BaseTTSProvider } from '../../src/providers/tts/base.js';
import { BaseLLMProvider } from '../../src/providers/llm/base.js';
import type { TTSConfig, LLMConfig } from '../../src/types.js';

// ============================================================================
// Mock Providers
// ============================================================================

/**
 * Mock TTS provider that returns predictable audio data
 */
class MockTTSProvider extends BaseTTSProvider {
  readonly name = 'mock-tts';

  async synthesize(text: string): Promise<Uint8Array> {
    // Return a simple byte array representing "audio" for testing
    return new Uint8Array([0, 1, 2, 3, 4, 5]);
  }
}

/**
 * Mock LLM provider that returns predictable responses
 */
class MockLLMProvider extends BaseLLMProvider {
  readonly name = 'mock-llm';
  private responseQueue: string[] = [];

  setResponse(response: string): void {
    this.responseQueue = [response];
  }

  setResponses(responses: string[]): void {
    this.responseQueue = [...responses];
  }

  async complete(prompt: string, options?: LLMConfig): Promise<string> {
    const response = this.responseQueue.shift();
    if (response === undefined) {
      return 'This is a mock response from the LLM.';
    }
    return response;
  }

  async chat(messages: { role: string; content: string }[], options?: LLMConfig): Promise<string> {
    return this.complete('');
  }
}

// ============================================================================
// Integration Smoke Tests
// ============================================================================

describe('Voicecrew Integration Smoke Test', () => {
  
  it('should instantiate VoiceCrew and start a meeting', async () => {
    // Arrange
    const mockTTS = new MockTTSProvider();
    const mockLLM = new MockLLMProvider();
    mockLLM.setResponse('Hello, I agree we should rewrite the auth system.');

    const agent = new VoiceAgent({
      name: 'Alice',
      persona: 'Senior engineer who values clean code',
      voice: { provider: mockTTS },
      llm: { provider: mockLLM },
    });

    const crew = new VoiceCrew({
      agents: [agent],
    });

    // Act
    const meeting = await crew.startMeeting({
      topic: 'Should we rewrite the auth system?',
      maxTurns: 1,
    });

    // Assert
    expect(meeting).toBeDefined();
    expect(meeting.topic).toBe('Should we rewrite the auth system?');
    expect(meeting.agents).toHaveLength(1);
    expect(meeting.agents[0].name).toBe('Alice');
    expect(meeting.status).toBe('idle');
  });

  it('should run one turn and fire the turn_start and turn_end events', async () => {
    // Arrange
    const mockTTS = new MockTTSProvider();
    const mockLLM = new MockLLMProvider();
    const mockResponse = 'I believe a full rewrite is necessary for better security.';
    mockLLM.setResponse(mockResponse);

    const agent = new VoiceAgent({
      name: 'Bob',
      persona: 'Security-focused engineer',
      voice: { provider: mockTTS },
      llm: { provider: mockLLM },
    });

    const crew = new VoiceCrew({
      agents: [agent],
    });

    const meeting = await crew.startMeeting({
      topic: 'Auth system security audit',
      maxTurns: 1,
    });

    // Set up spies for event handlers
    const turnStartHandler = vi.fn();
    const turnEndHandler = vi.fn();
    const meetingStartHandler = vi.fn();
    const meetingEndHandler = vi.fn();

    meeting.on('turn_start', turnStartHandler);
    meeting.on('turn_end', turnEndHandler);
    meeting.on('meeting_start', meetingStartHandler);
    meeting.on('meeting_end', meetingEndHandler);

    // Act - Start the meeting and run one turn
    await meeting.start();
    await meeting.runTurn();
    await meeting.end();

    // Assert - Event firing
    expect(meetingStartHandler).toHaveBeenCalledTimes(1);
    expect(meetingStartHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'Auth system security audit',
      })
    );

    expect(turnStartHandler).toHaveBeenCalledTimes(1);
    expect(turnStartHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: expect.objectContaining({ name: 'Bob' }),
        turnNumber: 1,
      })
    );

    expect(turnEndHandler).toHaveBeenCalledTimes(1);
    expect(turnEndHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: expect.objectContaining({ name: 'Bob' }),
        turnNumber: 1,
        text: mockResponse,
      })
    );

    expect(meetingEndHandler).toHaveBeenCalledTimes(1);
    expect(meetingEndHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        transcript: expect.objectContaining({
          topic: 'Auth system security audit',
          totalTurns: 1,
        }),
      })
    );

    // Assert - State
    expect(meeting.status).toBe('ended');
    expect(meeting.currentTurn).toBe(1);
  });

  it('should run complete meeting via run() method', async () => {
    // Arrange
    const mockResponse = 'I concur with the assessment.';
    const mockTTS = new MockTTSProvider();
    const mockLLM = new MockLLMProvider();
    mockLLM.setResponses([mockResponse, mockResponse, mockResponse]);

    const agent = new VoiceAgent({
      name: 'Charlie',
      persona: 'Pragmatic tech lead',
      voice: { provider: mockTTS },
      llm: { provider: mockLLM },
    });

    const crew = new VoiceCrew({
      agents: [agent],
    });

    const meeting = await crew.startMeeting({
      topic: 'Code review discussion',
      maxTurns: 2,
    });

    const turnEndHandler = vi.fn();
    meeting.on('turn_end', turnEndHandler);

    // Act - Run complete meeting
    const transcript = await meeting.run();

    // Assert
    expect(turnEndHandler).toHaveBeenCalledTimes(2);
    expect(transcript.totalTurns).toBe(2);
    expect(transcript.topic).toBe('Code review discussion');
    expect(meeting.status).toBe('ended');
    expect(transcript.turns[0].text).toBe(mockResponse);
  });

  it('should support multiple agents in round-robin', async () => {
    // Arrange
    const mockTTS = new MockTTSProvider();
    
    const mockLLMA = new MockLLMProvider();
    mockLLMA.setResponse('Agent A speaking here.');
    
    const mockLLMB = new MockLLMProvider();
    mockLLMB.setResponse('Agent B responding.');

    const agentA = new VoiceAgent({
      name: 'AgentA',
      persona: 'First speaker',
      voice: { provider: mockTTS },
      llm: { provider: mockLLMA },
    });

    const agentB = new VoiceAgent({
      name: 'AgentB',
      persona: 'Second speaker',
      voice: { provider: mockTTS },
      llm: { provider: mockLLMB },
    });

    const crew = new VoiceCrew({
      agents: [agentA, agentB],
    });

    const meeting = await crew.startMeeting({
      topic: 'Multi-agent discussion',
      maxTurns: 4,
    });

    const turnEndHandler = vi.fn();
    meeting.on('turn_end', turnEndHandler);

    // Act
    await meeting.run();

    // Assert - Verify round-robin pattern
    expect(turnEndHandler).toHaveBeenCalledTimes(4);
    
    const calls = turnEndHandler.mock.calls;
    expect(calls[0][0].agent.name).toBe('AgentA');
    expect(calls[1][0].agent.name).toBe('AgentB');
    expect(calls[2][0].agent.name).toBe('AgentA');
    expect(calls[3][0].agent.name).toBe('AgentB');
  });

  it('should track transcript with complete turn data', async () => {
    // Arrange
    const mockTTS = new MockTTSProvider();
    const mockLLM = new MockLLMProvider();
    mockLLM.setResponse('This is my contribution to the discussion.');

    const agent = new VoiceAgent({
      name: 'Alice',
      persona: 'Contributing member',
      voice: { provider: mockTTS },
      llm: { provider: mockLLM },
    });

    const crew = new VoiceCrew({
      agents: [agent],
    });

    const meeting = await crew.startMeeting({
      topic: 'Transcript verification',
      maxTurns: 1,
    });

    // Act
    await meeting.run();
    const transcript = meeting.getTranscript();

    // Assert
    expect(transcript.turns).toHaveLength(1);
    expect(transcript.turns[0]).toMatchObject({
      turnNumber: 1,
      text: 'This is my contribution to the discussion.',
    });
    expect(transcript.turns[0].agent.name).toBe('Alice');
    expect(transcript.turns[0].timestamp).toBeInstanceOf(Date);
    expect(transcript.startTime).toBeInstanceOf(Date);
    expect(transcript.endTime).toBeInstanceOf(Date);
    expect(transcript.totalTurns).toBe(1);
  });
});

describe('Voicecrew API Contract Validation', () => {
  
  it('should throw error when starting meeting without agents', async () => {
    // Arrange
    const crew = new VoiceCrew({
      agents: [],
    });

    // Act & Assert
    await expect(
      crew.startMeeting({ topic: 'Test', maxTurns: 1 })
    ).rejects.toThrow('Cannot start meeting: no agents in crew');
  });

  it('should throw error for duplicate agent names', () => {
    // Arrange
    const mockTTS = new MockTTSProvider();
    const mockLLM = new MockLLMProvider();

    const agent1 = new VoiceAgent({
      name: 'Alice',
      persona: 'Developer',
      voice: { provider: mockTTS },
      llm: { provider: mockLLM },
    });

    const agent2 = new VoiceAgent({
      name: 'Alice',  // Same name
      persona: 'Designer',
      voice: { provider: mockTTS },
      llm: { provider: mockLLM },
    });

    // Act & Assert
    expect(() => {
      new VoiceCrew({
        agents: [agent1, agent2],
      });
    }).toThrow("Duplicate agent name: Alice");
  });

  it('should throw error when agent name is empty', () => {
    const mockTTS = new MockTTSProvider();
    const mockLLM = new MockLLMProvider();

    expect(() => {
      new VoiceAgent({
        name: '',
        persona: 'Test',
        voice: { provider: mockTTS },
        llm: { provider: mockLLM },
      });
    }).toThrow('Agent name is required');
  });

  it('should throw error when agent persona is empty', () => {
    const mockTTS = new MockTTSProvider();
    const mockLLM = new MockLLMProvider();

    expect(() => {
      new VoiceAgent({
        name: 'Alice',
        persona: '',
        voice: { provider: mockTTS },
        llm: { provider: mockLLM },
      });
    }).toThrow('Agent persona is required');
  });

  it('should support agent CRUD operations', () => {
    const mockTTS = new MockTTSProvider();
    const mockLLM = new MockLLMProvider();

    const agent = new VoiceAgent({
      name: 'Alice',
      persona: 'Developer',
      voice: { provider: mockTTS },
      llm: { provider: mockLLM },
    });

    const crew = new VoiceCrew({ agents: [] });

    // Test adding
    crew.addAgent(agent);
    expect(crew.agents).toHaveLength(1);
    expect(crew.getAgent('Alice')).toBeDefined();

    // Test duplicate add
    expect(() => crew.addAgent(agent)).toThrow("Agent with name 'Alice' already exists");

    // Test removing
    expect(crew.removeAgent('Alice')).toBe(true);
    expect(crew.agents).toHaveLength(0);
    expect(crew.removeAgent('Alice')).toBe(false);
  });
});
