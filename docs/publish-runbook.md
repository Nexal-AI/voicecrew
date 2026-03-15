# Voicecrew v0.1.0 Publish Runbook

> **Purpose:** Step-by-step guide for publishing voicecrew to npm  
> **Target Version:** 0.1.0 (unscoped package)  
> **Package Name:** `voicecrew` (NOT `@voicecrew/voicecrew`)

---

## Pre-Flight Checklist

### 1. Package Identity Verification
```bash
# Critical: Verify package name is UNSCOPED
cat package.json | grep '"name"'
# Expected: "name": "voicecrew"
# Forbidden: "name": "@voicecrew/voicecrew"
```

### 2. Version Verification
```bash
# Verify version matches intended release
cat package.json | grep '"version"'
# For v0.1.0: "version": "0.1.0"
```

### 3. Exports Map Validation
```bash
# Verify main export exists
ls -la dist/index.mjs dist/index.js dist/index.d.ts

# Verify subpath exports
ls -la dist/providers/tts/kokoro.mjs
ls -la dist/providers/stt/deepgram.mjs
ls -la dist/providers/llm/openai.mjs
ls -la dist/transports/websocket.mjs

# Test import resolution (if possible)
node -e "import('./dist/index.mjs').then(m => console.log('VoiceCrew:', typeof m.VoiceCrew))"
```

### 4. Files Field Verification
```bash
# Check only intended files are included
cat package.json | jq '.files'
# Expected: ["dist", "README.md", "LICENSE"]
# Verify dist/ contents match intended exports
```

### 5. Build Verification
```bash
# Clean install and build
rm -rf node_modules dist
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build

# Verify dist/ is populated
ls -la dist/
```

### 6. publishConfig Verification
```bash
# Verify access is public
cat package.json | jq '.publishConfig'
# Expected: { "access": "public" }
```

---

## Publish Steps

### Step 1: Ensure NPM_TOKEN is Configured
Repository secret `NPM_TOKEN` must be set at:  
GitHub → Settings → Secrets and variables → Actions → `NPM_TOKEN`

Token needs `publish` permission for npmjs.com/package/voicecrew

### Step 2: Create and Push Git Tag
```bash
# Ensure clean working directory
git status  # Should show no uncommitted changes on main

# Ensure on main branch
git checkout main
git pull origin main

# Verify all tests pass locally
pnpm run lint
pnpm run typecheck
pnpm run test

# Create signed tag for v0.1.0
git tag -s v0.1.0 -m "Release v0.1.0: Multi-agent voice conversations"

# Push tag to trigger workflow
git push origin v0.1.0
```

### Step 3: Monitor Publish Workflow
```
GitHub → Actions → Publish workflow → Select v0.1.0 tag run
```

Expected workflow stages:
1. ✅ Test and Build (lint → typecheck → test → build → artifact upload)
2. ✅ Publish to npm (downloads artifacts → pnpm publish)
3. ✅ Create GitHub Release (generates changelog → creates release)

### Step 4: Verify npm Publication
```bash
# Check package appears on npm registry
npm view voicecrew versions --json | jq '.[] | select(. == "0.1.0")'

# Verify package contents
npm pack voicecrew@0.1.0 --dry-run

# Install and test
mkdir /tmp/test-install && cd /tmp/test-install
npm init -y
npm install voicecrew@0.1.0
node -e "const { VoiceCrew } = require('voicecrew'); console.log('VoiceCrew imported:', typeof VoiceCrew)"
```

### Step 5: Verify Subpath Imports
```bash
# Test all subpath exports
node -e "const kokoro = require('voicecrew/providers/tts/kokoro'); console.log('KokoroTTS:', typeof kokoro.KokoroTTS)"
node -e "const deepgram = require('voicecrew/providers/stt/deepgram'); console.log('DeepgramSTT:', typeof deepgram.DeepgramSTT)"
node -e "const openai = require('voicecrew/providers/llm/openai'); console.log('OpenAILLM:', typeof openai.OpenAILLM)"
node -e "const ws = require('voicecrew/transports/websocket'); console.log('WebSocketTransport:', typeof ws.WebSocketTransport)"
```

---

## Post-Publish Verification

### GitHub Release Verification
1. Navigate to: `https://github.com/Nexal-AI/voicecrew/releases`
2. Verify v0.1.0 release exists
3. Check changelog is accurate
4. Verify "Latest" badge appears

### Documentation Verification
1. README.md renders correctly on npmjs.com/package/voicecrew
2. API examples are copy-pasteable
3. Links to GitHub repo work
4. License file is attached

### Registry Verification
```bash
# Full package info
npm view voicecrew

# Check dist files are accessible
npm view voicecrew dist.tarball | xargs curl -s | tar -tzf - | head -20
```

---

## Rollback (Emergency)

See `rollback-procedure.md` for detailed rollback steps.

**Quick Reference:**
```bash
# Within 72 hours of publish
npm unpublish voicecrew@0.1.0

# After 72 hours
npm deprecate voicecrew@0.1.0 "Critical issue in v0.1.0, please upgrade to v0.1.1"
```

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Release Owner | | | |
| QA (Proof) | | | |
| Engineering Lead (Arch) | | | |
| Product (Vision) | | | |

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-15  
**Next Review:** v0.2.0 release
