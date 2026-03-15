# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- ElevenLabs TTS provider
- Whisper STT provider (local/free)
- Anthropic LLM provider (Claude)
- Ollama LLM provider (fully local)
- Meeting recording and export feature
- WebRTC transport (low-latency)
- Dashboard and monitoring UI
- Plugin system for custom providers
- Documentation site (Docusaurus/VitePress)

---

## [0.1.0] — 2025-03-15

### Added

#### Core
- **`VoiceCrew` orchestrator** — main entry point for creating and running multi-agent voice meetings
- **`VoiceAgent`** — agent class with configurable persona, voice profile, and LLM backend
- **`VoiceAgentConfig`** — TypeScript interface for full type-safe agent configuration
- **`SimpleVoiceAgent`** — convenience class for quick agent creation with sensible defaults
- **Meeting turn management** — smart turn-taking engine with interruption handling, ensuring no two agents speak at once
- **Conversation history** — agents retain context across turns for coherent, natural conversations
- **`temperature` support** — configurable LLM temperature per agent (default `0.7`), overridable at invocation time

#### TTS Providers
- **Kokoro TTS** (`voicecrew/providers/tts/kokoro`) — local, free text-to-speech; no API key required
  - Voices: `af_heart`, `af_alloy`, `am_adam`, `am_fenrir`, `bf_emma`, `bm_daniel`, and more
- **OpenAI TTS** (`voicecrew/providers/tts/openai`) — cloud TTS via OpenAI API
  - Voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

#### STT Providers
- **Deepgram** (`voicecrew/providers/stt/deepgram`) — cloud STT with free tier; best-in-class accuracy

#### LLM Providers
- **OpenAI-compatible** (`voicecrew/providers/llm/openai`) — works with GPT-4o, GPT-4o-mini, and any OpenAI-compatible API (Claude via proxy, Kimi, Mistral, Ollama)

#### Transports
- **WebSocket transport** (`voicecrew/transports/websocket`) — stream audio to any browser or application in real time

#### Developer Experience
- Full **TypeScript** support with strict typing and complete type exports
- **ESM + CJS** dual output — works in Node.js 18+ and modern bundlers
- **`< 50KB` core bundle** — providers are optional peer dependencies, keeping the core tiny
- **Three runnable examples**: `debate`, `standup`, `interview`
- Comprehensive **test suite** (49 tests covering orchestrator, meeting, agent, providers, and transport)
- GitHub Actions **CI pipeline** — lint, type-check, test (Node 18 & 20), and build on every push/PR

#### Documentation
- Full **README** with quick start, feature table, provider matrix, examples, and API reference
- **CONTRIBUTING.md** with development setup, test instructions, and contribution guidelines
- **LICENSE** (MIT)

---

## Links

- [npm package](https://www.npmjs.com/package/voicecrew)
- [GitHub repository](https://github.com/Nexal-AI/voicecrew)
- [Report a bug](https://github.com/Nexal-AI/voicecrew/issues/new?template=bug_report.md)
- [Request a feature](https://github.com/Nexal-AI/voicecrew/issues/new?template=feature_request.md)

[Unreleased]: https://github.com/Nexal-AI/voicecrew/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Nexal-AI/voicecrew/releases/tag/v0.1.0
