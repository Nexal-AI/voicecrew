/**
 * Voicecrew - Type definitions
 * Multi-agent voice conversations, in code
 */

// ============================================
// Provider Base Interfaces
// ============================================

export interface TTSConfig {
  voice?: string;
  speed?: number;
  [key: string]: unknown;
}

export interface STTConfig {
  language?: string;
  model?: string;
  [key: string]: unknown;
}

export interface LLMConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  baseURL?: string;
  apiKey?: string;
  [key: string]: unknown;
}

// ============================================
// Provider Interfaces
// ============================================

export interface TTSProvider {
  readonly name: string;
  synthesize(text: string): Promise<Uint8Array | Buffer>;
  dispose?(): Promise<void> | void;
}

export interface STTProvider {
  readonly name: string;
  transcribe(audio: Uint8Array | Buffer): Promise<string>;
  dispose?(): Promise<void> | void;
}

export interface LLMProvider {
  readonly name: string;
  complete(prompt: string, options?: LLMConfig): Promise<string>;
  chat(messages: LLMMessage[], options?: LLMConfig): Promise<string>;
  dispose?(): Promise<void> | void;
}

// ============================================
// LLM Types
// ============================================

export type LLMRole = 'system' | 'user' | 'assistant';

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

// ============================================
// Voice Agent Types
// ============================================

export interface VoiceAgentConfig {
  name: string;
  persona: string;
  voice: {
    provider: TTSProvider;
  };
  llm: {
    provider: LLMProvider;
  };
  stt?: {
    provider: STTProvider;
  };
  /** Optional temperature setting for LLM responses (0.0 - 1.0) */
  temperature?: number;
}

/** Options for agent think() method */
export interface AgentThinkOptions {
  /** 
   * Complete override of the default system prompt.
   * When provided, this *replaces* the auto-generated system message 
   * (agent persona + context) entirely — it does not prepend or append.
   * Include any topic and conversation history context manually if needed.
   */
  systemPrompt?: string;
}

export interface AgentThought {
  agent: VoiceAgent;
  text: string;
}

export interface AgentSpeech {
  agent: VoiceAgent;
  text: string;
  audio: Uint8Array | Buffer;
}

// ============================================
// Meeting Types
// ============================================

export type MeetingStatus = 'idle' | 'active' | 'paused' | 'ended';

export type MeetingMode = 'round_robin' | 'sequential';

export interface MeetingConfig {
  topic: string;
  maxTurns?: number;
  /** 
   * Complete override of the default system prompt.
   * When provided, this *replaces* the agent's default system message 
   * entirely — it does not prepend or append.
   * Include any topic, persona, and conversation history context manually.
   */
  systemPrompt?: string;
  /** 
   * Meeting mode: 'round_robin' cycles through agents, 'sequential' goes agent by agent.
   * Currently only round_robin is fully implemented.
   */
  mode?: MeetingMode;
  /** Optional initial context to set the stage for the meeting */
  initialContext?: string;
}

export interface MeetingTurn {
  turnNumber: number;
  agent: VoiceAgent;
  text: string;
  audio?: Uint8Array | Buffer;
  timestamp: Date;
}

export interface MeetingTranscript {
  topic: string;
  turns: MeetingTurn[];
  startTime?: Date;
  endTime?: Date;
  totalTurns: number;
}

// ============================================
// Meeting Events
// ============================================

export interface MeetingEvents {
  turn: { agent: VoiceAgent; text: string; turnNumber: number };
  turn_start: { agent: VoiceAgent; turnNumber: number };
  turn_end: { agent: VoiceAgent; turnNumber: number; text: string };
  started: { meetingId: string; topic: string };
  ended: { totalTurns: number; durationMs: number };
  meeting_start: { topic: string; agents: VoiceAgent[] };
  meeting_end: { transcript: MeetingTranscript };
  meeting_pause: { reason?: string };
  meeting_resume: void;
  error: { error: Error; context?: string };
}

export type MeetingEventName = keyof MeetingEvents;

// ============================================
// Transport Types
// ============================================

export interface TransportConfig {
  port?: number;
  host?: string;
  path?: string;
  cors?: boolean;
  [key: string]: unknown;
}

export interface Transport {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  broadcast(event: string, data: unknown): void;
  onConnection?(handler: (client: unknown) => void): void;
  onDisconnection?(handler: (client: unknown) => void): void;
}

// ============================================
// VoiceCrew Types
// ============================================

export interface VoiceCrewConfig {
  agents: VoiceAgent[];
  transport?: Transport;
}

// ============================================
// Forward declarations for class types
// ============================================

export interface VoiceAgent {
  readonly name: string;
  readonly persona: string;
  readonly config: VoiceAgentConfig;
  think(context: string, options?: AgentThinkOptions): Promise<string>;
  speak(text: string): Promise<Uint8Array | Buffer>;
}

export interface Meeting {
  readonly id: string;
  readonly topic: string;
  readonly agents: VoiceAgent[];
  readonly status: MeetingStatus;
  readonly currentTurn: number;
  readonly config: MeetingConfig;
  start(): Promise<MeetingTranscript>;
  end(): Promise<MeetingTranscript>;
  pause(): void;
  resume(): void;
  run(): Promise<MeetingTranscript>;
  on<K extends MeetingEventName>(
    event: K,
    handler: (data: MeetingEvents[K]) => void
  ): this;
  off<K extends MeetingEventName>(
    event: K,
    handler: (data: MeetingEvents[K]) => void
  ): this;
  getTranscript(): MeetingTranscript;
}

export interface VoiceCrew {
  readonly agents: VoiceAgent[];
  readonly transport?: Transport;
  startMeeting(config: MeetingConfig): Meeting;
  addAgent(agent: VoiceAgent): void;
  removeAgent(name: string): boolean;
  getAgent(name: string): VoiceAgent | undefined;
}
