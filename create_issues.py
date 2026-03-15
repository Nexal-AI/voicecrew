#!/usr/bin/env python3
import json
import urllib.request
import urllib.error
import subprocess
import sys

# Get token from git config
result = subprocess.run(
    ['git', 'config', '--get', 'remote.origin.url'],
    capture_output=True, text=True,
    cwd='/Users/madan/coding/voicecrew'
)
url = result.stdout.strip()
# Extract token: https://TOKEN@github.com/...
token = url.split('//')[1].split('@')[0]

REPO = 'Nexal-AI/voicecrew'
API_BASE = 'https://api.github.com'

def create_issue(title, body, labels):
    payload = json.dumps({
        'title': title,
        'body': body,
        'labels': labels
    }).encode('utf-8')
    
    req = urllib.request.Request(
        f'{API_BASE}/repos/{REPO}/issues',
        data=payload,
        headers={
            'Authorization': f'token {token}',
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
        },
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            print(f"  OK Issue #{data['number']}: {data['title']}")
            print(f"     {data['html_url']}")
            return data
    except urllib.error.HTTPError as e:
        body_err = e.read().decode()
        print(f"  FAIL: {e.code} -- {body_err[:200]}")
        return None

issues = [
    {
        'title': 'feat: Add ElevenLabs TTS provider',
        'body': 'Add ElevenLabs as a TTS provider option.\n\n**Motivation:** ElevenLabs offers high-quality, natural-sounding voice synthesis with a wide variety of voices, making it ideal for production deployments.\n\n**Proposed API:**\n```typescript\nimport { ElevenLabsTTSProvider } from "voicecrew/providers/tts";\nconst agent = new VoiceAgent({\n  voice: { provider: new ElevenLabsTTSProvider({ apiKey: "...", voiceId: "EXAVITQu4vr4xnSDxMaL", modelId: "eleven_turbo_v2" }) },\n});\n```\n\n**Acceptance Criteria:**\n- [ ] Implement `ElevenLabsTTSProvider` conforming to `TTSProvider` interface\n- [ ] Support voice selection by ID and model selection\n- [ ] Support streaming audio output\n- [ ] Unit tests with mocked ElevenLabs API\n- [ ] Example in `examples/`\n- [ ] Update README provider table\n\n[ElevenLabs API docs](https://docs.elevenlabs.io/api-reference/text-to-speech)',
        'labels': ['good-first-issue', 'enhancement']
    },
    {
        'title': 'feat: Add Whisper STT provider (local + OpenAI API)',
        'body': 'Add OpenAI Whisper as an STT provider, supporting both local inference and the OpenAI Whisper API.\n\n**Motivation:** Whisper enables fully offline, zero-cost deployments alongside Kokoro TTS and Ollama LLM.\n\n**Proposed API:**\n```typescript\nimport { WhisperSTTProvider } from "voicecrew/providers/stt";\nconst stt = new WhisperSTTProvider({ mode: "api", apiKey: "...", model: "whisper-1" });\nconst sttLocal = new WhisperSTTProvider({ mode: "local", modelPath: "./models/ggml-base.en.bin" });\n```\n\n**Acceptance Criteria:**\n- [ ] Implement `WhisperSTTProvider` conforming to `STTProvider` interface\n- [ ] Support OpenAI Whisper API and local whisper.cpp\n- [ ] Unit tests with mocked transcription\n- [ ] Update README provider table\n- [ ] Add to local-first example (Kokoro + Whisper + Ollama)\n\n[OpenAI Whisper API](https://platform.openai.com/docs/api-reference/audio) | [whisper.cpp](https://github.com/ggerganov/whisper.cpp)',
        'labels': ['good-first-issue', 'enhancement']
    },
    {
        'title': 'feat: Add Anthropic Claude LLM provider',
        'body': 'Add Anthropic Claude as a native LLM provider option.\n\n**Motivation:** Claude (claude-3-5-sonnet, claude-3-haiku) offers strong conversational quality and is widely used. Supporting it natively expands the voicecrew audience.\n\n**Proposed API:**\n```typescript\nimport { AnthropicLLMProvider } from "voicecrew/providers/llm";\nconst agent = new VoiceAgent({\n  llm: { provider: new AnthropicLLMProvider({ apiKey: "...", model: "claude-3-5-haiku-20241022" }) },\n});\n```\n\n**Acceptance Criteria:**\n- [ ] Implement `AnthropicLLMProvider` conforming to `LLMProvider` interface\n- [ ] Support streaming responses for low-latency turn-taking\n- [ ] System prompt and conversation history support\n- [ ] Unit tests with mocked Anthropic API responses\n- [ ] Update README provider table\n\n[Anthropic API docs](https://docs.anthropic.com/en/api)',
        'labels': ['good-first-issue', 'enhancement']
    },
    {
        'title': 'feat: Meeting recording and transcript export',
        'body': 'Add the ability to record a voicecrew meeting session and export it as audio (WAV/MP3) or a transcript (JSON/Markdown).\n\n**Motivation:** Recording is one of the biggest viral use cases -- sharing clips of AI agents conversing. First-class support removes the DIY recording friction.\n\n**Proposed API:**\n```typescript\nconst crew = new VoiceCrew({\n  agents: [alice, bob],\n  recording: { enabled: true, format: "wav", outputPath: "./recordings", transcript: true },\n});\nawait crew.startMeeting({ topic: "Weekly standup" });\n// Outputs: meeting-2024-01-15T09-00-00.wav + .transcript.json\n```\n\n**Acceptance Criteria:**\n- [ ] Mix all TTS audio output into a single timeline\n- [ ] Export as WAV and optionally MP3\n- [ ] Export transcript as JSON with speaker labels and timestamps\n- [ ] Export transcript as readable Markdown\n- [ ] Example: `examples/record-meeting.ts`\n- [ ] README recording section',
        'labels': ['enhancement']
    },
    {
        'title': 'feat: Add WebRTC transport',
        'body': 'Add a WebRTC transport as a lower-latency alternative to the existing WebSocket transport.\n\n**Motivation:** WebRTC offers significantly lower latency via P2P connections, built-in echo cancellation, and better packet loss handling -- ideal for real-time browser apps.\n\n**Proposed API:**\n```typescript\nimport { WebRTCTransport } from "voicecrew/transports";\nconst crew = new VoiceCrew({\n  agents: [alice, bob],\n  transport: new WebRTCTransport({ signalingUrl: "wss://signal.example.com" }),\n});\n```\n\n**Acceptance Criteria:**\n- [ ] Implement `WebRTCTransport` conforming to `Transport` interface\n- [ ] Signaling via WebSocket (SDP exchange)\n- [ ] STUN/TURN server configuration\n- [ ] Works in Node.js (via `node-webrtc`) and browsers\n- [ ] Example: `examples/webrtc-browser/`\n- [ ] README transports table updated\n\n[node-webrtc](https://github.com/node-webrtc/node-webrtc)',
        'labels': ['enhancement']
    },
    {
        'title': 'feat: Web dashboard for monitoring live meetings',
        'body': 'Build a lightweight browser-based dashboard for monitoring and controlling live voicecrew meetings in real time.\n\n**Motivation:** Developers need visibility into agent activity. A dashboard dramatically lowers the debugging barrier and improves the new-user experience.\n\n**Features:**\n- Live transcript feed with speaker identification\n- Visual indicator of active speaker\n- Meeting duration and turn counter\n- Agent status panel (idle / thinking / speaking)\n- Controls: pause, resume, end meeting, inject topic\n\n**Approach:** Standalone HTML/CSS/JS (no framework), served via optional `VoiceCrew.serveDashboard({ port: 3000 })`, connects to WebSocket transport.\n\n**Acceptance Criteria:**\n- [ ] Dashboard renders correctly in Chrome/Firefox\n- [ ] Real-time transcript updates via WebSocket\n- [ ] Active speaker highlighted\n- [ ] No breaking API changes to core\n- [ ] Example: `examples/dashboard/`\n- [ ] README documentation',
        'labels': ['enhancement']
    },
    {
        'title': 'feat: Plugin/registry system for community providers',
        'body': 'Formalise the provider system into a first-class plugin architecture so community members can publish custom TTS, STT, LLM, and transport providers as separate npm packages.\n\n**Motivation:** Enables `voicecrew-provider-azure`, `voicecrew-transport-twilio`, etc. without bloating the core bundle.\n\n**What needs formalising:**\n- Published TypeScript interfaces exported from `voicecrew/types`\n- Provider authoring guide in `docs/`\n- Community Providers section in README\n- Provider scaffolding template\n\n**Acceptance Criteria:**\n- [ ] Extract provider interfaces into `voicecrew/types` entry point\n- [ ] Publish provider authoring guide\n- [ ] Example custom provider with tests (`examples/custom-provider/`)\n- [ ] Community Providers section in README\n- [ ] Provider template / scaffold',
        'labels': ['good-first-issue', 'enhancement']
    },
    {
        'title': 'docs: Set up documentation site (VitePress or Docusaurus)',
        'body': 'Create a full documentation site for voicecrew, hosted on GitHub Pages at nexal-ai.github.io/voicecrew.\n\n**Motivation:** The README alone will not scale. A docs site enables searchable content, versioning, structured navigation, and better SEO.\n\n**Proposed structure:**\n```\ndocs/\n  intro.md\n  quick-start.md\n  guides/\n    agents.md\n    meetings.md\n    providers.md\n    transports.md\n  api/          (auto-generated from TypeScript via TypeDoc)\n  examples/\n  changelog.md\n```\n\n**Technology options:** VitePress (lighter, recommended) or Docusaurus.\n\n**Acceptance Criteria:**\n- [ ] Framework chosen and skeleton set up\n- [ ] README content ported to structured guide pages\n- [ ] API reference auto-generated from TypeScript\n- [ ] Deployed to GitHub Pages via GitHub Actions\n- [ ] Docs link added to README and package.json\n\n[VitePress](https://vitepress.dev/) | [Docusaurus](https://docusaurus.io/) | [TypeDoc](https://typedoc.org/)',
        'labels': ['good-first-issue', 'enhancement']
    },
]

print(f"Creating {len(issues)} GitHub issues for {REPO}...")
print()

created = []
for issue in issues:
    result = create_issue(issue['title'], issue['body'], issue['labels'])
    if result:
        created.append(result)

print()
print(f"Summary: {len(created)}/{len(issues)} issues created successfully")
