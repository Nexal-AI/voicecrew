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

  constructor(config: MeetingConfig, agents: VoiceAgent[]) {
    super();
    this.validateConfig(config, agents);
    
    this.id = this.generateId();
    this.topic = config.topic;
    this.agents = [...agents];
    this.config = {
      maxTurns: 10,
      ...config,
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

    this._currentTurn++;
    this.emit('turn_start', { agent, turnNumber: this._currentTurn });

    try {
      const context = this.buildContext();
      const text = await agent.think(context);
      
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
        context: `Turn ${this._currentTurn} with agent ${agent.name}`
      });
    }
  }

  getTranscript(): MeetingTranscript {
    return {
      topic: this.topic,
      turns: [...this.turns],
      startTime: this.startTime,
      endTime: this.endTime,
      totalTurns: this.turns.length,
    };
  }

  on<K extends MeetingEventName>(
    event: K,
    handler: (data: MeetingEvents[K]) => void
  ): void {
    super.on(event, handler as (...args: unknown[]) => void);
  }

  off<K extends MeetingEventName>(
    event: K,
    handler: (data: MeetingEvents[K]) => void
  ): void {
    super.off(event, handler as (...args: unknown[]) => void);
  }

  private validateConfig(config: MeetingConfig, agents: VoiceAgent[]): void {
    if (!config.topic || config.topic.trim().length === 0) {
      throw new Error('Meeting topic is required');
    }
    if (agents.length === 0) {
      throw new Error('At least one agent is required');
    }
    if (config.maxTurns !== undefined && config.maxTurns <= 0) {
      throw new Error('maxTurns must be positive');
    }
  }

  private generateId(): string {
    return `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
