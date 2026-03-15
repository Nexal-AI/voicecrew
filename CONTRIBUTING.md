# Contributing to voicecrew

Thanks for wanting to contribute! voicecrew is open-source and community-driven. Here's everything you need to know.

## Before You Start

- Check [open issues](https://github.com/Nexal-AI/voicecrew/issues) — your idea might already be in progress
- For large features, open an issue first to discuss the approach before writing code
- For bug fixes and small improvements, feel free to open a PR directly

## Setup

```bash
# Fork the repo, then clone your fork
git clone https://github.com/<your-username>/voicecrew.git
cd voicecrew

# Install pnpm if you haven't
npm install -g pnpm

# Install dependencies
pnpm install

# Verify the build works
pnpm build

# Run tests
pnpm test
```

## Development Workflow

```bash
# Create a branch for your work
git checkout -b feat/my-feature   # for features
git checkout -b fix/my-bug-fix    # for bug fixes
git checkout -b docs/update-x     # for documentation

# Make your changes in src/
# Write tests in tests/

# Before committing:
pnpm typecheck   # must pass
pnpm lint        # must pass
pnpm test        # must pass
```

## Code Standards

- **TypeScript strict mode** — all new code must pass `pnpm typecheck` with zero errors
- **Tests required** — all new functionality needs test coverage in `tests/`
- **One concern per file** — keep modules focused; don't mix provider logic with orchestration
- **No breaking changes without discussion** — if your change affects the public API, open an issue first

## Adding a New Provider

Providers implement a small interface — see the existing implementations as a guide:

```
src/providers/tts/    ← add your-provider.ts
src/providers/stt/    ← add your-provider.ts
src/providers/llm/    ← add your-provider.ts
```

Every new provider needs:
1. A class that implements the base interface (`TTSProvider`, `STTProvider`, or `LLMProvider`)
2. An export added to the appropriate `base.ts` or a new entry in `package.json` exports
3. Tests in `tests/providers/`
4. An entry in the **Providers** table in `README.md`

## Adding a New Example

Examples live in `examples/`. They should:
- Be runnable with `npx tsx examples/your-example.ts`
- Have a comment at the top explaining what they demonstrate
- Use environment variables for API keys (never hardcode)
- Connect to `ws://localhost:3000` for audio output

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add ElevenLabs TTS provider
fix: prevent double-speak when two agents respond simultaneously
docs: add WebRTC transport example
test: add coverage for KokoroTTS error handling
chore: upgrade tsup to v9
```

## Pull Request Checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes  
- [ ] `pnpm test` passes
- [ ] New functionality has tests
- [ ] README updated if you added a new provider, transport, or public API
- [ ] PR description explains what you built and why

## Questions?

Open an issue with the `question` label, or start a [GitHub Discussion](https://github.com/Nexal-AI/voicecrew/discussions).
