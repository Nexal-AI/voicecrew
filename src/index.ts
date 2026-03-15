// Voicecrew - Multi-agent voice conversations, in code
// https://github.com/Nexal-AI/voicecrew

// Provider errors (exported first so users can import for error handling)
export {
  ProviderError,
  type ProviderErrorCode,
  providerErrorFrom,
  RETRYABLE_STATUS_CODES,
  AUTH_ERROR_STATUS_CODES,
} from './providers/errors.js';

// Core classes
export { VoiceCrew } from './crew.js';
export { VoiceAgent } from './agent.js';
export { Meeting } from './meeting.js';

// TTS Providers
export { BaseTTSProvider } from './providers/tts/base.js';
export { KokoroTTS } from './providers/tts/kokoro.js';
export { OpenAITTS } from './providers/tts/openai.js';

// STT Providers
export { BaseSTTProvider } from './providers/stt/base.js';
export { DeepgramSTT } from './providers/stt/deepgram.js';

// LLM Providers
export { BaseLLMProvider } from './providers/llm/base.js';
export { OpenAILLM } from './providers/llm/openai.js';

// Transports
export { BaseTransport } from './transports/base.js';
export { WebSocketTransport } from './transports/websocket.js';

// Types
export type {
  // Core types
  VoiceAgentConfig,
  MeetingConfig,
  MeetingTranscript,
  MeetingTurn,
  MeetingStatus,
  MeetingEventName,
  MeetingEvents,
  MeetingMode,
  VoiceCrewConfig,
  Meeting as MeetingType,
  VoiceCrew as VoiceCrewType,
  VoiceAgent as VoiceAgentInterface,
  
  // Provider types
  TTSProvider,
  TTSConfig,
  STTProvider,
  STTConfig,
  LLMProvider,
  LLMConfig,
  LLMMessage,
  LLMRole,
  
  // Transport types
  Transport,
  TransportConfig,
  
  // Agent result types
  AgentThought,
  AgentSpeech,
  AgentThinkOptions,
} from './types.js';
