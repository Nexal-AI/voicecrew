# 🎙️ voicecrew

**Multi-agent voice conversations, in code.**

[![npm version](https://img.shields.io/npm/v/voicecrew.svg)](https://www.npmjs.com/package/voicecrew)
[![CI](https://img.shields.io/github/actions/workflow/status/Nexal-AI/voicecrew/ci.yml?branch=main&label=CI)](https://github.com/Nexal-AI/voicecrew/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/badge/bundle-%3C50KB-brightgreen)](https://bundlephobia.com/package/voicecrew)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

```bash
npm install voicecrew
```

---

## What is voicecrew?

**voicecrew** is an open-source TypeScript library for orchestrating multi-agent voice conversations. Define a crew of AI agents — each with their own persona, voice, and language model — then start a meeting where they talk to each other naturally, with turn-taking, interruptions, and real personality.

Think [CrewAI](https://github.com/crewAIInc/crewAI) (multi-agent orchestration) meets real-time voice AI. The first open-source library of its kind.

> 🔊 *Five AI agents holding a product standup. Each with a different voice. Each with a different opinion. Record and post it — it goes viral.*

---

## Quick Start

Under 10 lines to your first multi-agent voice meeting:

```typescript
import { VoiceCrew, VoiceAgent } from 'voicecrew';
import { KokoroTTS } from 'voicecrew/providers/tts/kokoro';
import { OpenAILLM } from 'voicecrew/providers/llm/openai';
import { WebSocketTransport } from 'voicecrew/transports/websocket';

const crew = new VoiceCrew({
  agents: [
    new VoiceAgent({
      name: 'Alice',
      persona: 'Senior engineer who values clean code and pragmatic solutions',
      voice: { provider: new KokoroTTS({ voice: 'af_heart' }) },
      llm:   { provider: new OpenAILLM({ model: 'gpt-4o-mini' }) },
    }),
    new VoiceAgent({
      name: 'Bob',
      persona: 'Product manager focused on user impact and shipping fast',
      voice: { provider: new KokoroTTS({ voice: 'am_fenrir' }) },
      llm:   { provider: new OpenAILLM({ model: 'gpt-4o-mini' }) },
    }),
  ],
  transport: new WebSocketTransport({ port: 3000 }),
});

await crew.startMeeting({
  topic: 'Should we rewrite the backend in Rust?',
  maxTurns: 10,
});
```

Then open `ws://localhost:3000` to stream the audio in real time.

---

## Features

| Feature | Description |
|---|---|
| 🤝 **Multi-agent conversations** | N agents talking to each other — not just one bot and a human |
| 🎙️ **Natural turn-taking** | Smart interruption handling, no two agents speaking at once |
| 🔌 **Provider-agnostic** | Swap TTS / STT / LLM providers without changing your app code |
| 🏠 **Local-first option** | Kokoro TTS + Whisper STT + Ollama LLM = zero API costs |
| 🔷 **TypeScript-native** | Full type safety, first-class TS support, great IDE experience |
| 🌐 **WebSocket transport** | Stream audio to any browser or app in real time |
| 📦 **Under 50KB** | Tiny core bundle — providers are optional peer dependencies |

---

## Providers

### Text-to-Speech (TTS)

| Provider | Import | Local | Free | Voices |
|---|---|:---:|:---:|---|
| **Kokoro** | `voicecrew/providers/tts/kokoro` | ✅ | ✅ | `af_heart`, `am_adam`, `bf_emma`, `bm_daniel`, + more |
| **OpenAI TTS** | `voicecrew/providers/tts/openai` | ❌ | ❌ | `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer` |
| **ElevenLabs** *(coming soon)* | `voicecrew/providers/tts/elevenlabs` | ❌ | ❌ | Custom cloned voices |

### Speech-to-Text (STT)

| Provider | Import | Local | Free | Notes |
|---|---|:---:|:---:|---|
| **Deepgram** | `voicecrew/providers/stt/deepgram` | ❌ | ⚡ | Free tier available; best accuracy |
| **Whisper** | `voicecrew/providers/stt/whisper` | ✅ | ⚡ | OpenAI API & local modes; zero cost when local |
| **Whisper** *(coming soon)* | `voicecrew/providers/stt/whisper` | ✅ | ✅ | Runs locally via whisper.cpp |
| **Web Speech API** *(coming soon)* | `voicecrew/providers/stt/webspeech` | ✅ | ✅ | Browser-native, no install needed |

### Large Language Models (LLM)

| Provider | Import | Notes |
|---|---|---|
| **OpenAI / OpenAI-compatible** | `voicecrew/providers/llm/openai` | Works with GPT-4o, GPT-4o-mini, Claude (via proxy), Kimi, Mistral, any OpenAI-compatible API |
| **Ollama** *(coming soon)* | `voicecrew/providers/llm/ollama` | Fully local — Llama 3, Mistral, Phi-3, etc. |

> 💡 **Fully local stack**: `KokoroTTS` + `WhisperSTT` + `OllamaLLM` (coming soon) = a complete voice crew with zero cloud API calls or costs.

---

## Examples

### 🗣️ Debate

Two agents argue a proposition from opposing sides:

```typescript
import { VoiceCrew, VoiceAgent } from 'voicecrew';
import { KokoroTTS } from 'voicecrew/providers/tts/kokoro';
import { OpenAILLM } from 'voicecrew/providers/llm/openai';
import { WebSocketTransport } from 'voicecrew/transports/websocket';

const llm = new OpenAILLM({ model: 'gpt-4o-mini' });

const crew = new VoiceCrew({
  agents: [
    new VoiceAgent({
      name: 'Advocate',
      persona: 'A passionate advocate who argues strongly FOR the proposition with data and examples',
      voice: { provider: new KokoroTTS({ voice: 'af_heart' }) },
      llm:   { provider: llm },
    }),
    new VoiceAgent({
      name: 'Skeptic',
      persona: 'A sharp skeptic who challenges every claim and argues AGAINST the proposition',
      voice: { provider: new KokoroTTS({ voice: 'bm_daniel' }) },
      llm:   { provider: llm },
    }),
  ],
  transport: new WebSocketTransport({ port: 3000 }),
});

await crew.startMeeting({
  topic: 'AI will replace software engineers within 5 years',
  maxTurns: 8,
});
```

**Run it:**
```bash
npx tsx examples/debate.ts
# Then open ws://localhost:3000 in your browser
```

---

### 📋 Daily Standup

An entire engineering team runs their standup without a single human:

```typescript
import { VoiceCrew, VoiceAgent } from 'voicecrew';
import { KokoroTTS } from 'voicecrew/providers/tts/kokoro';
import { OpenAILLM } from 'voicecrew/providers/llm/openai';
import { WebSocketTransport } from 'voicecrew/transports/websocket';

const llm = new OpenAILLM({ model: 'gpt-4o-mini' });

const crew = new VoiceCrew({
  agents: [
    new VoiceAgent({
      name: 'Mia',
      persona: 'Scrum master keeping the standup focused and on time',
      voice: { provider: new KokoroTTS({ voice: 'af_heart' }) },
      llm:   { provider: llm },
    }),
    new VoiceAgent({
      name: 'Dev',
      persona: 'Backend engineer who shipped a new auth system and is blocked on a database migration',
      voice: { provider: new KokoroTTS({ voice: 'am_fenrir' }) },
      llm:   { provider: llm },
    }),
    new VoiceAgent({
      name: 'Zara',
      persona: 'Frontend engineer working on the dashboard redesign, proud of the new charts',
      voice: { provider: new KokoroTTS({ voice: 'bf_emma' }) },
      llm:   { provider: llm },
    }),
  ],
  transport: new WebSocketTransport({ port: 3000 }),
});

await crew.startMeeting({
  topic: 'Daily standup — what did you do yesterday, what are you doing today, any blockers?',
  maxTurns: 12,
});
```

**Run it:**
```bash
npx tsx examples/standup.ts
```

---

### 🎤 Interview

A technical interviewer grills a candidate agent:

```typescript
import { VoiceCrew, VoiceAgent } from 'voicecrew';
import { KokoroTTS } from 'voicecrew/providers/tts/kokoro';
import { OpenAILLM } from 'voicecrew/providers/llm/openai';
import { WebSocketTransport } from 'voicecrew/transports/websocket';

const llm = new OpenAILLM({ model: 'gpt-4o' });

const crew = new VoiceCrew({
  agents: [
    new VoiceAgent({
      name: 'Interviewer',
      persona: 'Senior staff engineer conducting a rigorous system design interview. Asks hard follow-ups.',
      voice: { provider: new KokoroTTS({ voice: 'bm_daniel' }) },
      llm:   { provider: llm },
    }),
    new VoiceAgent({
      name: 'Candidate',
      persona: 'Confident software engineer candidate with 5 years experience. Thinks out loud and asks clarifying questions.',
      voice: { provider: new KokoroTTS({ voice: 'am_fenrir' }) },
      llm:   { provider: llm },
    }),
  ],
  transport: new WebSocketTransport({ port: 3000 }),
});

await crew.startMeeting({
  topic: 'System design interview: Design a real-time notification system for 10 million users',
  maxTurns: 16,
});
```

**Run it:**
```bash
npx tsx examples/interview.ts
```

---

## API Reference

### `VoiceCrew`

The main orchestrator. Creates and manages a crew of voice agents and runs meetings.

```typescript
import { VoiceCrew } from 'voicecrew';

const crew = new VoiceCrew(config: VoiceCrewConfig);
```

#### `VoiceCrewConfig`

| Property | Type | Required | Description |
|---|---|:---:|---|
| `agents` | `VoiceAgent[]` | ✅ | Array of agents participating in the meeting |
| `transport` | `Transport` | ✅ | Transport layer for streaming audio output |
| `meeting` | `MeetingConfig` | — | Optional default meeting configuration |

#### Methods

| Method | Signature | Description |
|---|---|---|
| `startMeeting` | `(config: StartMeetingConfig) => Promise<Meeting>` | Start a new voice meeting |
| `stopMeeting` | `() => Promise<void>` | Stop the active meeting |
| `on` | `(event: CrewEvent, handler: fn) => void` | Listen to crew events |

#### `StartMeetingConfig`

| Property | Type | Default | Description |
|---|---|---|---|
| `topic` | `string` | — | The topic or prompt that kicks off the conversation |
| `maxTurns` | `number` | `20` | Maximum number of turns before the meeting ends |
| `turnTimeoutMs` | `number` | `30000` | Max ms an agent can hold the floor before yielding |
| `systemPrompt` | `string` | — | Fully replaces the default system message for all agents in this meeting. **Note:** This is a full replacement — it does not append to or extend the default system prompt. |

#### Events

```typescript
crew.on('turn:start',   ({ agent, turn }) => console.log(`${agent.name} is speaking (turn ${turn})`));
crew.on('turn:end',     ({ agent, audio }) => /* audio is Buffer of WAV PCM */);
crew.on('meeting:end',  ({ turns, duration }) => console.log(`Meeting ended after ${turns} turns`));
crew.on('error',        (err) => console.error(err));
```

---

### `VoiceAgent`

Defines an agent's identity: name, persona, voice, and LLM.

```typescript
import { VoiceAgent } from 'voicecrew';

const agent = new VoiceAgent(config: VoiceAgentConfig);
```

#### `VoiceAgentConfig`

| Property | Type | Required | Description |
|---|---|:---:|---|
| `name` | `string` | ✅ | Agent display name — used in turn attribution |
| `persona` | `string` | ✅ | Natural language description of the agent's personality and role |
| `voice` | `VoiceConfig` | ✅ | Voice configuration including TTS provider |
| `llm` | `LLMConfig` | ✅ | LLM configuration including provider and optional overrides |

#### `VoiceConfig`

```typescript
interface VoiceConfig {
  provider: TTSProvider;  // e.g. new KokoroTTS({ voice: 'af_heart' })
  speed?: number;         // 0.5–2.0, default 1.0
  pitch?: number;         // 0.5–2.0, default 1.0
}
```

#### `LLMConfig`

```typescript
interface LLMConfig {
  provider: LLMProvider;   // e.g. new OpenAILLM({ model: 'gpt-4o-mini' })
  temperature?: number;    // 0–2, default 0.8
  maxTokens?: number;      // default 256 (keep responses concise for voice)
  systemPrompt?: string;   // Fully replaces the default system prompt for this agent. Note: this is a full replacement, not an append.
}
```

---

### `Meeting`

The `Meeting` object is returned by `crew.startMeeting()` and represents the active conversation session.

```typescript
const meeting = await crew.startMeeting({ topic: '...' });

// Access meeting state
console.log(meeting.id);          // Unique meeting ID
console.log(meeting.turns);       // Array of completed turns
console.log(meeting.isActive);    // boolean

// Wait for the meeting to complete
await meeting.finished;
console.log(`Meeting lasted ${meeting.turns.length} turns`);
```

#### `Turn`

```typescript
interface Turn {
  id: string;
  agentName: string;
  text: string;          // Transcript of what the agent said
  audio: Buffer;         // PCM WAV audio buffer
  startedAt: Date;
  endedAt: Date;
  durationMs: number;
}
```

---

### TTS Providers

#### `KokoroTTS` — Local, Free

[Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) is a high-quality local TTS model. No API key needed.

```typescript
import { KokoroTTS } from 'voicecrew/providers/tts/kokoro';

const tts = new KokoroTTS({
  voice: 'af_heart',   // Required — see voice list below
  speed: 1.0,          // Optional, default 1.0
  language: 'en-us',   // Optional, default 'en-us'
});
```

**Available voices:**

| Voice ID | Gender | Accent | Personality |
|---|---|---|---|
| `af_heart` | Female | American | Warm, natural |
| `af_bella` | Female | American | Clear, professional |
| `am_adam` | Male | American | Deep, confident |
| `am_michael` | Male | American | Casual, friendly |
| `bf_emma` | Female | British | Crisp, articulate |
| `bm_daniel` | Male | British | Authoritative |

---

#### `OpenAITTS` — Cloud

```typescript
import { OpenAITTS } from 'voicecrew/providers/tts/openai';

const tts = new OpenAITTS({
  apiKey: process.env.OPENAI_API_KEY,  // Required
  voice: 'nova',                        // alloy | echo | fable | onyx | nova | shimmer
  model: 'tts-1',                       // tts-1 | tts-1-hd
  speed: 1.0,                           // 0.25–4.0
});
```

---

### STT Providers

#### `DeepgramSTT` — Cloud, Free Tier

```typescript
import { DeepgramSTT } from 'voicecrew/providers/stt/deepgram';

const stt = new DeepgramSTT({
  apiKey: process.env.DEEPGRAM_API_KEY,  // Required — free tier at deepgram.com
  model: 'nova-2',                        // Recommended
  language: 'en-US',
});
```

---

### LLM Providers

#### `OpenAILLM` — Works with any OpenAI-compatible API

```typescript
import { OpenAILLM } from 'voicecrew/providers/llm/openai';

// OpenAI
const llm = new OpenAILLM({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
});

// Claude via proxy (Anthropic OpenAI-compatible endpoint)
const claude = new OpenAILLM({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-haiku-20240307',
  baseURL: 'https://api.anthropic.com/v1',
});

// Ollama (local)
const ollama = new OpenAILLM({
  apiKey: 'ollama',  // required field, value ignored
  model: 'llama3',
  baseURL: 'http://localhost:11434/v1',
});
```

---

### Transports

#### `WebSocketTransport`

Streams audio turns to connected WebSocket clients in real time.

```typescript
import { WebSocketTransport } from 'voicecrew/transports/websocket';

const transport = new WebSocketTransport({
  port: 3000,          // WebSocket server port, default 3000
  host: '0.0.0.0',     // Bind address, default '0.0.0.0'
  path: '/audio',      // WebSocket path, default '/'
});
```

**WebSocket message format** (what your client receives):

```typescript
// Each message is a JSON envelope followed by a binary audio frame
// Text message (metadata):
{
  "type": "turn:start",
  "agent": "Alice",
  "turn": 3,
  "timestamp": "2024-01-01T00:00:00Z"
}

// Binary message (audio):
// Raw PCM WAV audio — 16kHz, 16-bit, mono

// Text message (end of turn):
{
  "type": "turn:end",
  "agent": "Alice",
  "text": "I think we should keep the Node.js backend...",
  "durationMs": 3420
}
```

**Browser client example:**

```javascript
const ws = new WebSocket('ws://localhost:3000');
const audioCtx = new AudioContext();

ws.addEventListener('message', async (event) => {
  if (event.data instanceof ArrayBuffer) {
    // Decode and play the PCM audio
    const buffer = await audioCtx.decodeAudioData(event.data);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
  } else {
    const msg = JSON.parse(event.data);
    console.log(`[${msg.agent}] ${msg.type}`);
  }
});
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  VoiceCrew                  │
│            (orchestrator / API)             │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │       Meeting        │
        │  (turn management,  │
        │   interrupts, queue) │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │    VoiceAgent[]      │
        │  ┌───────────────┐  │
        │  │  LLM Provider │  │  ← generates speech text
        │  │  TTS Provider │  │  ← synthesises audio
        │  │  STT Provider │  │  ← transcribes audio (optional)
        │  └───────────────┘  │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │      Transport       │
        │  WebSocket / WebRTC  │  ← streams audio to clients
        └─────────────────────┘


Provider layer (swap freely, no core changes):
  TTS:  Kokoro (local) │ OpenAI │ ElevenLabs (soon)
  STT:  Deepgram       │ Whisper (soon) │ Web Speech (soon)
  LLM:  OpenAI-compat  │ Ollama (soon)
```

**Turn flow:**

```
Meeting.nextTurn()
  → pick agent (round-robin or LLM-decided)
  → Agent.think(conversationHistory) → LLM → text response
  → Agent.speak(text) → TTS → audio Buffer
  → Transport.send(audio)
  → store Turn in meeting history
  → emit 'turn:end' event
  → repeat until maxTurns or meeting.stop()
```

---

## Custom Providers

voicecrew is designed for extensibility. Implement any provider interface to add your own TTS, STT, or LLM backend.

### Custom TTS Provider

```typescript
import type { TTSProvider, TTSSynthesisResult } from 'voicecrew/providers/tts/base';

class MyCustomTTS implements TTSProvider {
  readonly name = 'my-custom-tts';

  async synthesize(text: string, options?: TTSSynthesisOptions): Promise<TTSSynthesisResult> {
    // Call your TTS API
    const audioBuffer = await myAPI.synthesize(text);
    return {
      audio: audioBuffer,          // Buffer — PCM WAV, 16kHz 16-bit mono
      durationMs: estimateDuration(audioBuffer),
      sampleRate: 16000,
    };
  }
}

// Use it
new VoiceAgent({
  name: 'Agent',
  persona: '...',
  voice: { provider: new MyCustomTTS() },
  llm: { provider: llm },
});
```

### Custom LLM Provider

```typescript
import type { LLMProvider, LLMResponse } from 'voicecrew/providers/llm/base';

class MyCustomLLM implements LLMProvider {
  readonly name = 'my-custom-llm';

  async complete(messages: LLMMessage[]): Promise<LLMResponse> {
    const response = await myAPI.chat(messages);
    return { content: response.text };
  }
}
```

---

## Local Development

```bash
# Clone the repository
git clone https://github.com/Nexal-AI/voicecrew.git
cd voicecrew

# Install dependencies (requires pnpm)
npm install -g pnpm
pnpm install

# Build the library
pnpm build

# Run tests
pnpm test

# Watch mode for development
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### Project Structure

```
voicecrew/
├── src/
│   ├── index.ts              # Public API — all exports
│   ├── crew.ts               # VoiceCrew class
│   ├── agent.ts              # VoiceAgent class
│   ├── meeting.ts            # Meeting + turn management
│   ├── types.ts              # TypeScript interfaces
│   ├── providers/
│   │   ├── tts/
│   │   │   ├── base.ts       # TTSProvider interface
│   │   │   ├── kokoro.ts     # Kokoro (local, free)
│   │   │   └── openai.ts     # OpenAI TTS
│   │   ├── stt/
│   │   │   ├── base.ts       # STTProvider interface
│   │   │   └── deepgram.ts   # Deepgram
│   │   └── llm/
│   │       ├── base.ts       # LLMProvider interface
│   │       └── openai.ts     # OpenAI-compatible
│   └── transports/
│       ├── base.ts           # Transport interface
│       └── websocket.ts      # WebSocket transport
├── examples/
│   ├── debate.ts             # Two agents debate
│   ├── standup.ts            # Daily standup simulation
│   └── interview.ts          # Technical interview
├── tests/
│   ├── crew.test.ts
│   ├── meeting.test.ts
│   └── providers/
├── package.json
├── tsconfig.json
└── README.md
```

### Running the Examples

```bash
# Set your API key (examples use OpenAI LLM + Kokoro TTS — no key needed for Kokoro)
export OPENAI_API_KEY=sk-...

# Debate example
npx tsx examples/debate.ts

# Standup example
npx tsx examples/standup.ts

# Interview example
npx tsx examples/interview.ts
```

Then connect to `ws://localhost:3000` to receive the audio stream.

---

## FAQ

**Q: Does this require OpenAI?**
No. The LLM provider is configurable — use Ollama for a fully local setup, or any OpenAI-compatible API (Claude, Mistral, etc.). For TTS, Kokoro runs locally with no API key.

**Q: Can humans join the conversation?**
Not in v0.1 (agents-only). Human-in-the-loop support is on the roadmap.

**Q: What audio format does voicecrew produce?**
PCM WAV, 16kHz, 16-bit, mono. This is playable in all browsers and compatible with most audio pipelines.

**Q: Does it work in the browser?**
The library is Node.js-first, but you can receive and play the audio stream from a browser via WebSocket.

**Q: Can I use it with Bun?**
Yes — voicecrew supports Node.js 18+ and Bun.

---

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repo and create a branch: `git checkout -b feat/my-feature`
2. **Write code** — see [Local Development](#local-development) for setup
3. **Write tests** — all new functionality needs Vitest tests
4. **Check types**: `pnpm typecheck`
5. **Lint**: `pnpm lint`
6. **Open a PR** — describe what you built and why

### Ideas for contributions
- 🔊 New TTS providers (ElevenLabs, Azure, Coqui)
- 🎤 New STT providers (Whisper, Web Speech API)
- 🤖 New LLM providers (Ollama, Anthropic native)
- 🚗 New transports (WebRTC, file output)
- 📝 New examples (customer support sim, podcast, game NPCs)
- 📖 Documentation improvements

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening your first PR.

---

## Roadmap

- [ ] **v0.1** — Core library, Kokoro TTS, OpenAI TTS/LLM, Deepgram STT, WebSocket transport, examples
- [ ] **v0.2** — Whisper STT (local), Ollama LLM (local), ElevenLabs TTS
- [ ] **v0.3** — WebRTC transport, human-in-the-loop, meeting recorder (MP3 export)
- [ ] **v0.4** — LLM-driven turn selection (not just round-robin), topic steering
- [ ] **v1.0** — Stable API, browser SDK, full test coverage

---

## License

MIT © [Nexal AI](https://nexal.com.au)

---

<p align="center">
  Built by <a href="https://nexal.com.au">Nexal AI</a> — AI automation for real businesses.<br/>
  Voice agents powered by <a href="https://kall.au">kall.au</a>
</p>
