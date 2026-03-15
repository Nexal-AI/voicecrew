# Changelog

All notable changes to **voicecrew** will be documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2025-07-01

### Added

#### Core
- **`VoiceCrew` orchestrator** — top-level class that wires agents, transport, and meeting lifecycle together
- **`VoiceAgent`** — agent class with configurable name, persona, voice profile, and LLM backend
- **`Meeting`** — turn management engine with natural turn-taking, configurable `maxTurns`, topic injection, and event emission
- **`SimpleVoiceAgent`** helper — convenience wrapper for the most common single-provider setup

#### Providers
- **Kokoro TTS** (`voicecrew/providers/tts/kokoro`) — local, free text-to-speech via the Kokoro model; zero API costs; supports 10+ voices including `af_heart`, `am_adam`, `bf_emma`, `bm_daniel`
- **OpenAI TTS** (`voicecrew/providers/tts/openai`) — cloud TTS via OpenAI's `tts-1` and `tts-1-hd` models; voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`
- **Deepgram STT** (`voicecrew/providers/stt/deepgram`) — real-time speech-to-text with high accuracy; free tier available
- **OpenAI-compatible LLM** (`voicecrew/providers/llm/openai`) — works with GPT-4o, GPT-4o-mini, and any OpenAI-compatible endpoint (Claude via proxy, Kimi, Mistral, Ollama, etc.)

#### Transports
- **WebSocket transport** (`voicecrew/transports/websocket`) — streams audio frames to connected browser or app clients in real time over `ws://`

#### Developer Experience
- Full **TypeScript** support with strict typings and comprehensive `d.ts` declarations
- ESM + CJS dual build via `tsup`
- **49 unit tests** (Vitest) covering orchestrator, agents, meeting lifecycle, providers, and transports
- `VoiceCrewConfig`, `VoiceAgentConfig`, `MeetingConfig`, `TTSProvider`, `STTProvider`, `LLMProvider` interfaces fully documented
- Three runnable **examples**: `debate.ts`, `standup.ts`, `interview.ts`
- Comprehensive `CONTRIBUTING.md` and `README.md` with quick start, provider table, API reference

#### Infrastructure
- GitHub Actions CI (lint → typecheck → test) on every push and PR
- `tsup` build pipeline producing ESM, CJS, and `.d.ts` outputs
- `publishConfig.access: "public"` set for open-source npm publish

---

## [Unreleased]

### Planned
- ElevenLabs TTS provider
- Whisper STT provider (local, via whisper.cpp)
- Anthropic Claude LLM provider (native, not via proxy)
- Ollama LLM provider (fully local)
- WebRTC transport for low-latency browser use
- Meeting recording and audio export
- Dashboard / monitoring UI
- Plugin system for custom providers
- Documentation site (Docusaurus or VitePress)

---

[0.1.0]: https://github.com/Nexal-AI/voicecrew/releases/tag/v0.1.0
[Unreleased]: https://github.com/Nexal-AI/voicecrew/compare/v0.1.0...HEAD
