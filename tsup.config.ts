import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'providers/tts/base': 'src/providers/tts/base.ts',
    'providers/tts/kokoro': 'src/providers/tts/kokoro.ts',
    'providers/tts/openai': 'src/providers/tts/openai.ts',
    'providers/stt/base': 'src/providers/stt/base.ts',
    'providers/stt/deepgram': 'src/providers/stt/deepgram.ts',
    'providers/llm/base': 'src/providers/llm/base.ts',
    'providers/llm/openai': 'src/providers/llm/openai.ts',
    'transports/base': 'src/transports/base.ts',
    'transports/websocket': 'src/transports/websocket.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: 'node18',
  outDir: 'dist',
  external: [],
  banner: {
    js: '/* voicecrew — multi-agent voice conversations, in code */',
  },
  esbuildOptions(options) {
    options.conditions = ['import', 'module', 'require', 'default'];
  },
});
