#!/bin/bash
set -euo pipefail

# ============================================================================
# Voicecrew Post-Publish Smoke Test
# ============================================================================
# This script verifies the published tarball is actually usable by consumers.
# It packs, installs in a temp dir, validates subpath imports, type declarations,
# and runs a runtime instantiation test.
#
# Usage: ./scripts/smoke-test.sh [tarball-path]
#   If tarball-path is provided, uses that file directly.
#   Otherwise, runs `pnpm pack` to create one.
#
# Exit codes:
#   0 - All checks passed
#   1 - Pack or install failed
#   2 - Subpath import check failed
#   3 - Type declarations check failed
#   4 - Runtime instantiation failed
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TARBALL_PATH="${1:-}"
SMOKE_DIR="/tmp/vc-smoke-test-$$"
PACK_DIR="/tmp/vc-smoke"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup() {
    if [[ -d "$SMOKE_DIR" ]]; then
        log_info "Cleaning up temp directory: $SMOKE_DIR"
        rm -rf "$SMOKE_DIR"
    fi
}

trap cleanup EXIT

# ============================================================================
# Step 1: Pack and install
# ============================================================================
log_info "=== Step 1: Pack and install ==="

if [[ -z "$TARBALL_PATH" ]]; then
    log_info "Packing voicecrew..."
    mkdir -p "$PACK_DIR"
    pnpm pack --pack-destination "$PACK_DIR"
    TARBALL=$(ls -t "$PACK_DIR"/*.tgz | head -n1)
else
    TARBALL="$TARBALL_PATH"
    log_info "Using provided tarball: $TARBALL"
fi

if [[ ! -f "$TARBALL" ]]; then
    log_error "Tarball not found: $TARBALL"
    exit 1
fi

log_info "Installing tarball in temp directory..."
mkdir -p "$SMOKE_DIR"
cd "$SMOKE_DIR"
npm init -y > /dev/null 2>&1
npm install "$TARBALL" > /dev/null 2>&1

log_info "Installation successful"

# ============================================================================
# Step 2: Subpath import check (ESM and CJS)
# ============================================================================
log_info "=== Step 2: Subpath import check ==="

SUBPATHS=(
    "voicecrew"
    "voicecrew/providers/tts/kokoro"
    "voicecrew/providers/tts/openai"
    "voicecrew/providers/tts/base"
    "voicecrew/providers/stt/deepgram"
    "voicecrew/providers/stt/base"
    "voicecrew/providers/llm/openai"
    "voicecrew/providers/llm/base"
    "voicecrew/transports/websocket"
    "voicecrew/transports/base"
)

ESM_FAILED=0
CJS_FAILED=0

# Check ESM imports
log_info "Checking ESM imports..."
for subpath in "${SUBPATHS[@]}"; do
    TEST_FILE="$SMOKE_DIR/test-esm-${subpath//\//-}.mjs"
    echo "import * as pkg from '$subpath'; console.log('OK:', '$subpath');" > "$TEST_FILE"
    
    if node "$TEST_FILE" > /dev/null 2>&1; then
        log_info "  ✓ ESM: $subpath"
    else
        log_error "  ✗ ESM: $subpath"
        ESM_FAILED=$((ESM_FAILED + 1))
    fi
done

# Check CJS requires
log_info "Checking CJS requires..."
for subpath in "${SUBPATHS[@]}"; do
    TEST_FILE="$SMOKE_DIR/test-cjs-${subpath//\//-}.cjs"
    echo "const pkg = require('$subpath'); console.log('OK:', '$subpath');" > "$TEST_FILE"
    
    if node "$TEST_FILE" > /dev/null 2>&1; then
        log_info "  ✓ CJS: $subpath"
    else
        log_error "  ✗ CJS: $subpath"
        CJS_FAILED=$((CJS_FAILED + 1))
    fi
done

if [[ $ESM_FAILED -gt 0 ]] || [[ $CJS_FAILED -gt 0 ]]; then
    log_error "Subpath import check failed: ESM failures=$ESM_FAILED, CJS failures=$CJS_FAILED"
    exit 2
fi

log_info "All subpath imports resolved successfully"

# ============================================================================
# Step 3: Type declarations check
# ============================================================================
log_info "=== Step 3: Type declarations check ==="

NODE_MODULES_VOICECREW="$SMOKE_DIR/node_modules/voicecrew"
DTS_FAILED=0

# Map subpaths to their dist files
for subpath in "${SUBPATHS[@]}"; do
    # Convert subpath to file path
    if [[ "$subpath" == "voicecrew" ]]; then
        DTS_PATH="$NODE_MODULES_VOICECREW/dist/index.d.ts"
    else
        # Remove 'voicecrew/' prefix and add .d.ts
        REL_PATH="${subpath#voicecrew/}"
        DTS_PATH="$NODE_MODULES_VOICECREW/dist/$REL_PATH.d.ts"
    fi
    
    if [[ -f "$DTS_PATH" ]]; then
        log_info "  ✓ .d.ts: $subpath"
    else
        # Try index.d.ts for directory-style exports (if applicable)
    DTS_DIR_PATH="${DTS_PATH%.d.ts}/index.d.ts"
    if [[ -f "$DTS_DIR_PATH" ]]; then
        log_info "  ✓ .d.ts: $subpath (index.d.ts)"
    else
        log_error "  ✗ .d.ts: $subpath ($DTS_PATH)"
        DTS_FAILED=$((DTS_FAILED + 1))
    fi
    fi
done

if [[ $DTS_FAILED -gt 0 ]]; then
    log_error "Type declarations check failed: $DTS_FAILED missing"
    exit 3
fi

log_info "All type declarations present"

# ============================================================================
# Step 4: Runtime instantiation test
# ============================================================================
log_info "=== Step 4: Runtime instantiation test ==="

RUNTIME_TEST_FILE="$SMOKE_DIR/runtime-test.cjs"

cat > "$RUNTIME_TEST_FILE" << 'EOF'
const { VoiceCrew, VoiceAgent } = require('voicecrew');

// Stub providers that satisfy the interface
const stubTTS = {
  name: 'stub-tts',
  synthesize: async () => Buffer.from('')
};

const stubLLM = {
  name: 'stub-llm',
  complete: async () => 'ok',
  chat: async () => 'ok'
};

// Create agent with stub providers
const agent = new VoiceAgent({
  name: 'Test',
  persona: 'Tester',
  voice: { provider: stubTTS },
  llm: { provider: stubLLM }
});

// Create crew with the agent
const crew = new VoiceCrew({ agents: [agent] });

console.log('SMOKE OK');
EOF

if node "$RUNTIME_TEST_FILE"; then
    log_info "Runtime instantiation successful"
else
    log_error "Runtime instantiation failed"
    exit 4
fi

# ============================================================================
# All checks passed
# ============================================================================
log_info "================================"
log_info "SMOKE TEST PASSED - All checks successful"
log_info "================================"

exit 0
