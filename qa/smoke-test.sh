#!/bin/bash
set -e

echo "=========================================="
echo "Voicecrew Post-Publish Smoke Test"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0
PASSED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    echo -e "${RED}  Error: $2${NC}"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

echo "Test Environment:"
echo "  Node: $(node --version)"
echo "  npm: $(npm --version)"
echo "  Package: voicecrew@latest"
echo ""

# Create temp test directory
TEST_DIR=$(mktemp -d)
echo "Test directory: $TEST_DIR"
cd "$TEST_DIR"

# Initialize test project
echo ""
echo "--- Step 1: Fresh npm install voicecrew@latest ---"
npm init -y > /dev/null 2>&1
if npm install voicecrew@latest 2>&1; then
    pass "Package installation"
else
    fail "Package installation" "npm install voicecrew@latest failed"
    exit 1
fi

# Get installed package path
PKG_PATH="$TEST_DIR/node_modules/voicecrew"

echo ""
echo "--- Step 2: package.json exports field validation ---"

if [ -f "$PKG_PATH/package.json" ]; then
    EXPORTS=$(cat "$PKG_PATH/package.json" | node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync(0,'utf-8')); console.log(JSON.stringify(pkg.exports||{},null,2))")
    
    if [ "$EXPORTS" != "{}" ]; then
        pass "package.json has exports field"
        
        # Validate each export path resolves to a real file
        REQUIRED_EXPORTS=(
            "."
            "./providers/tts/kokoro"
            "./providers/tts/openai"
            "./providers/stt/deepgram"
            "./providers/llm/openai"
        )
        
        for export_path in "${REQUIRED_EXPORTS[@]}"; do
            RESOLVED=$(node -e "
                const pkg = require('$PKG_PATH/package.json');
                const exp = pkg.exports || {};
                const entry = exp['$export_path'];
                if (entry && entry.require && entry.import) {
                    console.log('OK');
                } else if (entry && entry.default) {
                    console.log('OK');
                } else {
                    console.log('MISSING');
                }
            " 2>/dev/null || echo "ERROR")
            
            if [ "$RESOLVED" = "OK" ]; then
                pass "Export '$export_path' configured"
            else
                fail "Export '$export_path'" "Missing or invalid export configuration"
            fi
        done
    else
        fail "package.json exports field" "Exports field is empty or missing"
    fi
else
    fail "package.json exists" "package.json not found at $PKG_PATH"
fi

echo ""
echo "--- Step 3: Core entry point import ---"

cat > test-core.js << 'EOF'
try {
    const { VoiceCrew, VoiceAgent } = require('voicecrew');
    if (typeof VoiceCrew !== 'function') throw new Error('VoiceCrew is not a constructor');
    if (typeof VoiceAgent !== 'function') throw new Error('VoiceAgent is not a constructor');
    console.log('PASS');
} catch (e) {
    console.error('FAIL:', e.message);
    process.exit(1);
}
EOF

if node test-core.js 2>&1 | grep -q "PASS"; then
    pass "Core entry point: import { VoiceCrew, VoiceAgent } from 'voicecrew'"
else
    ERROR=$(node test-core.js 2>&1 || true)
    fail "Core entry point import" "$ERROR"
fi

echo ""
echo "--- Step 4: Provider sub-path imports ---"

# Test TTS providers
cat > test-tts.js << 'EOF'
try {
    const { KokoroTTS } = require('voicecrew/providers/tts/kokoro');
    if (typeof KokoroTTS !== 'function') throw new Error('KokoroTTS is not a constructor');
    console.log('PASS: KokoroTTS');
} catch (e) {
    console.error('FAIL: KokoroTTS -', e.message);
}

try {
    const { OpenAITTS } = require('voicecrew/providers/tts/openai');
    if (typeof OpenAITTS !== 'function') throw new Error('OpenAITTS is not a constructor');
    console.log('PASS: OpenAITTS');
} catch (e) {
    console.error('FAIL: OpenAITTS -', e.message);
}
EOF

if node test-tts.js 2>&1 | grep -q "PASS: KokoroTTS"; then
    pass "Provider import: voicecrew/providers/tts/kokoro"
else
    ERROR=$(node test-tts.js 2>&1 | grep "FAIL: KokoroTTS" || echo "Import failed")
    fail "TTS Kokoro provider import" "$ERROR"
fi

if node test-tts.js 2>&1 | grep -q "PASS: OpenAITTS"; then
    pass "Provider import: voicecrew/providers/tts/openai"
else
    ERROR=$(node test-tts.js 2>&1 | grep "FAIL: OpenAITTS" || echo "Import failed")
    fail "TTS OpenAI provider import" "$ERROR"
fi

# Test STT providers
cat > test-stt.js << 'EOF'
try {
    const { DeepgramSTT } = require('voicecrew/providers/stt/deepgram');
    if (typeof DeepgramSTT !== 'function') throw new Error('DeepgramSTT is not a constructor');
    console.log('PASS: DeepgramSTT');
} catch (e) {
    console.error('FAIL: DeepgramSTT -', e.message);
}
EOF

if node test-stt.js 2>&1 | grep -q "PASS: DeepgramSTT"; then
    pass "Provider import: voicecrew/providers/stt/deepgram"
else
    ERROR=$(node test-stt.js 2>&1 | grep "FAIL:" || echo "Import failed")
    fail "STT Deepgram provider import" "$ERROR"
fi

# Test LLM providers
cat > test-llm.js << 'EOF'
try {
    const { OpenAILLM } = require('voicecrew/providers/llm/openai');
    if (typeof OpenAILLM !== 'function') throw new Error('OpenAILLM is not a constructor');
    console.log('PASS: OpenAILLM');
} catch (e) {
    console.error('FAIL: OpenAILLM -', e.message);
}
EOF

if node test-llm.js 2>&1 | grep -q "PASS: OpenAILLM"; then
    pass "Provider import: voicecrew/providers/llm/openai"
else
    ERROR=$(node test-llm.js 2>&1 | grep "FAIL:" || echo "Import failed")
    fail "LLM OpenAI provider import" "$ERROR"
fi

echo ""
echo "--- Step 5: Type exports validation ---"

cat > test-types.js << 'EOF'
// Type exports are compile-time only, but we can verify the module exports them
try {
    const types = require('voicecrew');
    
    // Check that the module exports exist (runtime check)
    if (!types.VoiceCrew) throw new Error('VoiceCrew export missing');
    if (!types.VoiceAgent) throw new Error('VoiceAgent export missing');
    
    console.log('PASS: Core types exported');
    
    // Check MeetingMode if available
    if (types.MeetingMode) {
        console.log('PASS: MeetingMode exported');
    } else {
        console.log('WARN: MeetingMode not found (may be type-only)');
    }
    
    // Check AgentThinkOptions if available  
    if (types.AgentThinkOptions) {
        console.log('PASS: AgentThinkOptions exported');
    } else {
        console.log('WARN: AgentThinkOptions not found (may be type-only)');
    }
    
    // Check TurnEvent if available
    if (types.TurnEvent) {
        console.log('PASS: TurnEvent exported');
    } else {
        console.log('WARN: TurnEvent not found (may be type-only)');
    }
    
    // Check MeetingEvents if available
    if (types.MeetingEvents) {
        console.log('PASS: MeetingEvents exported');
    } else {
        console.log('WARN: MeetingEvents not found (may be type-only)');
    }
    
} catch (e) {
    console.error('FAIL:', e.message);
}
EOF

if node test-types.js 2>&1 | grep -q "PASS: Core types exported"; then
    pass "Type exports: VoiceCrew, VoiceAgent available"
else
    ERROR=$(node test-types.js 2>&1 | grep "FAIL:" || echo "Type check failed")
    fail "Core type exports" "$ERROR"
fi

echo ""
echo "--- Step 6: Runtime class instantiation (no-throw test) ---"

cat > test-runtime.js << 'EOF'
try {
    const { VoiceCrew, VoiceAgent } = require('voicecrew');
    
    // Test VoiceCrew instantiation with minimal config
    const crew = new VoiceCrew({
        agents: [],
        transport: null
    });
    console.log('PASS: VoiceCrew instantiation (empty config)');
    
    // Test VoiceAgent instantiation
    const agent = new VoiceAgent({
        name: 'TestAgent',
        persona: 'Test persona',
        voice: null,
        llm: null
    });
    console.log('PASS: VoiceAgent instantiation');
    
    // Test basic method existence
    if (typeof crew.startMeeting === 'function') {
        console.log('PASS: VoiceCrew.startMeeting method exists');
    } else {
        console.log('FAIL: VoiceCrew.startMeeting method missing');
    }
    
    if (typeof agent.think === 'function') {
        console.log('PASS: VoiceAgent.think method exists');
    } else {
        console.log('WARN: VoiceAgent.think method may be internal');
    }
    
} catch (e) {
    console.error('FAIL:', e.message);
    console.error(e.stack);
    process.exit(1);
}
EOF

if node test-runtime.js 2>&1 | grep -q "PASS: VoiceCrew instantiation"; then
    pass "Runtime: VoiceCrew class instantiation (no throw)"
else
    ERROR=$(node test-runtime.js 2>&1 | grep -A 5 "FAIL:" || echo "Instantiation failed")
    fail "VoiceCrew class instantiation" "$ERROR"
fi

if node test-runtime.js 2>&1 | grep -q "PASS: VoiceAgent instantiation"; then
    pass "Runtime: VoiceAgent class instantiation (no throw)"
else
    ERROR=$(node test-runtime.js 2>&1 | grep -A 5 "FAIL:" || echo "Instantiation failed")
    fail "VoiceAgent class instantiation" "$ERROR"
fi

if node test-runtime.js 2>&1 | grep -q "PASS: VoiceCrew.startMeeting method exists"; then
    pass "Runtime: VoiceCrew.startMeeting method exists"
else
    ERROR=$(node test-runtime.js 2>&1 | grep "FAIL: VoiceCrew.startMeeting" || echo "Method missing")
    fail "VoiceCrew.startMeeting method" "$ERROR"
fi

echo ""
echo "=========================================="
echo "SMOKE TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}PASSED: $PASSED${NC}"
echo -e "${RED}FAILED: $FAILED${NC}"
echo ""

# Cleanup
cd - > /dev/null
rm -rf "$TEST_DIR"

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}SMOKE TEST FAILED${NC} — Package is NOT production-ready"
    exit 1
else
    echo -e "${GREEN}SMOKE TEST PASSED${NC} — Package is ready for production"
    exit 0
fi
