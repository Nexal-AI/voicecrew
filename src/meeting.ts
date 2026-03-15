import { EventEmitter } from 'events';
import type {
  Meeting as IMeeting,
  VoiceAgent,
  MeetingConfig,
  MeetingTranscript,
  MeetingTurn,
  MeetingStatus,
  MeetingEventName,
  MeetingEvents,
} from './types.js';

export class Meeting extends EventEmitter implements IMeeting {
  readonly id: string;
  readonly topic: string;
  readonly agents: VoiceAgent[];
  readonly config: MeetingConfig;

  private _status: MeetingStatus = 'idle';
  private _currentTurn: number = 0;
  private turns: MeetingTurn[] = [];
  private startTime?: Date;
  private endTime?: Date;

  /**
   * Construct a Meeting.
   *
   * Agents are resolved in the following priority order:
   *   1. `config.agents` — preferred; allows a single config object literal
   *      to be passed to `VoiceCrew.startMeeting()` without a separate arg.
   *   2. `agents` parameter — fallback for callers that pass agents directly
   *      (e.g. `new Meeting(config, [alice, bob])`).
   *
   * At least one agent must be resolvable via either path, otherwise
   * construction throws.
   */
  constructor(config: MeetingConfig, agents: VoiceAgent[] = []) {
    super();

    // Resolve agents: config.agents takes priority over the constructor param.
    const resolvedAgents =
      config.agents && config.agents.length > 0 ? config.agents : agents;

    this.validateConfig(config, resolvedAgents);

    this.id = this.generateId();
    this.topic = config.topic;
    this.agents = [...resolvedAgents];
    this.config = {
      maxTurns: 10,
      ...config,
      // Normalise: store the resolved agents on config so downstream
      // readers (tests, serialisers) always find them in one place.
      agents: [...resolvedAgents],
    };
  }

  get status(): MeetingStatus {
    return this._status;
  }

  get currentTurn(): number {
    return this._currentTurn;
  }

  async start(): Promise<MeetingTranscript> {
    if (this._status === 'active') {
      throw new Error('Meeting is already active');
    }
    if (this._status === 'ended') {
      throw new Error('Meeting has already ended');
    }

    this._status = 'active';
    this.startTime = new Date();
    this._currentTurn = 0;

    this.emit('meeting_start', { topic: this.topic, agents: this.agents });

    return this.getTranscript();
  }

  async end(): Promise<MeetingTranscript> {
    if (this._status === 'ended') {
      throw new Error('Meeting has already ended');
    }

    this._status = 'ended';
    this.endTime = new Date();

    const transcript = this.getTranscript();
    this.emit('meeting_end', { transcript });

    return transcript;
  }

  pause(): void {
    if (this._status !== 'active') {
      throw new Error('Cannot pause: meeting is not active');
    }
    this._status = 'paused';
    this.emit('meeting_pause', { reason: 'Manual pause' });
  }

  resume(): void {
    if (this._status !== 'paused') {
      throw new Error('Cannot resume: meeting is not paused');
    }
    this._status = 'active';
    this.emit('meeting_resume');
  }

  async run(): Promise<MeetingTranscript> {
    await this.start();

    const maxTurns = this.config.maxTurns ?? 10;

    while (this._status === 'active' && this._currentTurn < maxTurns) {
      await this.runTurn();
    }

    return this.end();
  }

  /**
   * Execute a single turn in the meeting.
   *
   * @internal
   * This method is public for internal orchestration but is not part of the
   * public API surface for v0.1.0. Use `run()` to execute the full meeting.
   */
  async runTurn(): Promise<void> {
    if (this._status !== 'active') {
      throw new Error('Cannot run turn: meeting is not active');
    }

    const maxTurns = this.config.maxTurns ?? 10;
    if (this._currentTurn >= maxTurns) {
      return;
    }

    const agentIndex = this._currentTurn % this.agents.length;
    const agent = this.agents[agentIndex];

    if (!agent) {
      throw new Error(`Agent at index ${agentIndex} not found`);
    }

    this._currentTurn++;
    this.emit('turn_start', { agent, turnNumber: this._currentTurn });

    try {
      const context = this.buildContext();
      const text = await agent.think(context);

      // Guard: if the agent returns empty/whitespace-only text, emit
      // `turn_empty` instead of recording a blank turn.  This lets callers
      // (and test fixtures) observe the condition without throwing.
      if (!text || text.trim().length === 0) {
        this.emit('turn_empty', { agent, turnNumber: this._currentTurn });
        return;
      }

      const turn: MeetingTurn = {
        turnNumber: this._currentTurn,
        agent,
        text,
        timestamp: new Date(),
      };

      this.turns.push(turn);
      this.emit('turn_end', { agent, turnNumber: this._currentTurn, text });
    } catch (error) {
      this.emit('error', {
        error: error instanceof Error ? error : new Error(String(error)),
        context: `Turn ${this._currentTurn} with agent ${agent.name}`,
      });
    }
  }

  getTranscript(): MeetingTranscript {
    // Build transcript object conditionally to satisfy exactOptionalPropertyTypes
    const transcript: MeetingTranscript = {
      topic: this.topic,
      turns: [...this.turns],
      totalTurns: this.turns.length,
    };

    if (this.startTime !== undefined) {
      transcript.startTime = this.startTime;
    }

    if (this.endTime !== undefined) {
      transcript.endTime = this.endTime;
    }

    return transcript;
  }

  override on<K extends MeetingEventName>(
    event: K,
    handler: (data: MeetingEvents[K]) => void
  ): this {
    super.on(event, handler as (...args: unknown[]) => void);
    return this;
  }

  override off<K extends MeetingEventName>(
    event: K,
    handler: (data: MeetingEvents[K]) => void
  ): this {
    super.off(event, handler as (...args: unknown[]) => void);
    return this;
  }

  private validateConfig(config: MeetingConfig, agents: VoiceAgent[]): void {
    if (!config.topic || config.topic.trim().length === 0) {
      throw new Error('Meeting topic is required');
    }
    if (agents.length === 0) {
      throw new Error(
        'At least one agent is required — provide agents via config.agents or the constructor parameter'
      );
    }
    if (config.maxTurns !== undefined && config.maxTurns <= 0) {
      throw new Error('maxTurns must be positive');
    }
  }

  private generateId(): string {
    return `meeting-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private buildContext(): string {
    const recentTurns = this.turns.slice(-3);
    if (recentTurns.length === 0) {
      return `Topic: ${this.topic}\nThis is the start of the conversation.`;
    }

    const history = recentTurns
      .map(t => `${t.agent.name}: ${t.text}`)
      .join('\n');

    return `Topic: ${this.topic}\n\nRecent conversation:\n${history}`;
  }
}
