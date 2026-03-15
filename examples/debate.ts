/**
 * Voicecrew AI Debate Example
 *
 * Two AI agents debate a tech topic:
 * - Alex (Optimist): Enthusiastic about new technology
 * - Sam (Skeptic): Cautious and questioning
 *
 * Usage:
 *   npx tsx examples/debate.ts
 *
 * Environment Variables:
 *   OPENAI_API_KEY - Required for LLM responses
 *
 * The debate is streamed via WebSocket on port 3000 for real-time listening.
 */

import { VoiceCrew, VoiceAgent, WebSocketTransport } from '../src/index.js';
import { KokoroTTS } from '../src/index.js';
import { OpenAILLM } from '../src/index.js';

/**
 * Check if required environment variables are set.
 */
function checkEnvironment(): boolean {
  const hasOpenAIKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;

  if (!hasOpenAIKey) {
    console.error('❌ Missing environment variable: OPENAI_API_KEY');
    console.error('');
    console.error('Please set your OpenAI API key:');
    console.error('  export OPENAI_API_KEY=sk-...');
    console.error('');
    console.error('You can get an API key at: https://platform.openai.com/api-keys');
    return false;
  }

  return true;
}

/**
 * Main debate function.
 */
async function runDebate(): Promise<void> {
  // Check environment first
  if (!checkEnvironment()) {
    process.exit(1);
  }

  console.log('🎙️  Voicecrew AI Debate');
  console.log('=======================');
  console.log('');

  // Create the WebSocket transport for real-time streaming
  const transport = new WebSocketTransport({
    port: 3000,
    host: 'localhost',
    path: '/voicecrew',
    cors: true,
  });

  // Connect transport
  await transport.connect();
  console.log('📡 WebSocket server started on ws://localhost:3000/voicecrew');
  console.log('   Open http://localhost:3000/health to check status');
  console.log('');

  // Configure the debaters
  const optimist = new VoiceAgent({
    name: 'Alex',
    persona: `You are Alex, a tech optimist and early adopter. You're enthusiastic about new technology and believe
AI will solve many of humanity's problems. You focus on the potential benefits: increased productivity,
medical breakthroughs, and democratizing access to knowledge. You speak with energy and conviction,
often highlighting exciting possibilities. You challenge skepticism with examples of tech successes.`,
    voice: {
      provider: new KokoroTTS({ voice: 'am_adam' }),
    },
    llm: {
      provider: new OpenAILLM({ model: 'gpt-4o-mini' }),
    },
    temperature: 0.8,
  });

  const skeptic = new VoiceAgent({
    name: 'Sam',
    persona: `You are Sam, a thoughtful tech skeptic. You believe in carefully considering risks and unintended
consequences of new technology. You focus on ethical concerns, job displacement, privacy issues, and
the importance of human judgment. You speak with measured caution, asking critical questions. You
value stability and proven solutions over rapid innovation. You challenge hype with historical examples
of tech disappointments.`,
    voice: {
      provider: new KokoroTTS({ voice: 'af_bella' }),
    },
    llm: {
      provider: new OpenAILLM({ model: 'gpt-4o-mini' }),
    },
    temperature: 0.7,
  });

  // Create the Voicecrew with both agents
  const crew = new VoiceCrew({
    agents: [optimist, skeptic],
    transport,
  });

  const topic = 'Should AI systems be given autonomous decision-making authority in critical infrastructure?';
  console.log(`📋 Topic: ${topic}`);
  console.log('');
  console.log('🎬 Starting debate with 8 turns...');
  console.log('');
  console.log('-------------------------------------------');

  // Start the debate meeting
  const meeting = await crew.startMeeting({
    topic,
    maxTurns: 8,
    mode: 'round_robin',
    initialContext: 'This is a structured debate between an optimist and a skeptic about AI autonomy.',
  });

  // Listen for events
  meeting.on('turn', ({ agent, text, turnNumber }) => {
    const label = agent.name === 'Alex' ? '🟢 Alex (Optimist)' : '🔴 Sam (Skeptic)';
    console.log(`${label} (Turn ${turnNumber}):`);
    console.log(`   "${text}"`);
    console.log('');
  });

  meeting.on('started', ({ meetingId, topic }) => {
    console.log(`📊 Meeting started [${meetingId}]`);
    console.log('-------------------------------------------');
    console.log('');
  });

  meeting.on('ended', ({ totalTurns, durationMs }) => {
    console.log('-------------------------------------------');
    console.log(`✅ Debate complete! ${totalTurns} turns, ${(durationMs / 1000).toFixed(1)}s`);
  });

  // Run the debate
  try {
    await meeting.run();
  } catch (error) {
    console.error('❌ Error during debate:', error);
  } finally {
    // Cleanup
    console.log('');
    console.log('📊 Final Transcript:');
    const transcript = meeting.getTranscript();
    for (const entry of transcript.turns) {
      console.log(`   ${entry.agent.name}: ${entry.text.substring(0, 60)}...`);
    }

    // Keep server running briefly for any final messages
    console.log('');
    console.log('⏳ Keeping WebSocket open for 5 seconds...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await transport.disconnect();
    console.log('👋 Goodbye!');
  }
}

// Run the debate
runDebate().catch(console.error);
