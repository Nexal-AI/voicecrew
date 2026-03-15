import type {
  VoiceCrew as IVoiceCrew,
  VoiceAgent,
  Meeting,
  MeetingConfig,
  Transport,
  VoiceCrewConfig,
} from './types.js';
import { Meeting as MeetingImpl } from './meeting.js';

export class VoiceCrew implements IVoiceCrew {
  private _agents: Map<string, VoiceAgent> = new Map();
  private _transport?: Transport;

  constructor(config: VoiceCrewConfig) {
    this.validateConfig(config);
    
    for (const agent of config.agents) {
      this._agents.set(agent.name, agent);
    }
    
    this._transport = config.transport;
  }

  get agents(): VoiceAgent[] {
    return Array.from(this._agents.values());
  }

  get transport(): Transport | undefined {
    return this._transport;
  }

  async startMeeting(config: MeetingConfig): Promise<Meeting> {
    if (this._agents.size === 0) {
      throw new Error('Cannot start meeting: no agents in crew');
    }

    const meeting = new MeetingImpl(config, this.agents);
    
    // Forward meeting events to transport if available
    if (this._transport) {
      meeting.on('turn_start', (data) => {
        this._transport?.broadcast('turn_start', data);
      });
      meeting.on('turn_end', (data) => {
        this._transport?.broadcast('turn_end', data);
      });
      meeting.on('meeting_start', (data) => {
        this._transport?.broadcast('meeting_start', data);
      });
      meeting.on('meeting_end', (data) => {
        this._transport?.broadcast('meeting_end', data);
      });
    }

    return meeting;
  }

  addAgent(agent: VoiceAgent): void {
    if (this._agents.has(agent.name)) {
      throw new Error(`Agent with name '${agent.name}' already exists`);
    }
    this._agents.set(agent.name, agent);
  }

  removeAgent(name: string): boolean {
    if (!this._agents.has(name)) {
      return false;
    }
    this._agents.delete(name);
    return true;
  }

  getAgent(name: string): VoiceAgent | undefined {
    return this._agents.get(name);
  }

  private validateConfig(config: VoiceCrewConfig): void {
    if (!config.agents) {
      throw new Error('Agents array is required');
    }
    
    // Check for duplicate agent names
    const names = new Set<string>();
    for (const agent of config.agents) {
      if (names.has(agent.name)) {
        throw new Error(`Duplicate agent name: ${agent.name}`);
      }
      names.add(agent.name);
    }
  }
}
