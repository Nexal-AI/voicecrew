/**
 * Voicecrew AI Standup Meeting Example
 *
 * Three AI agents have a daily standup meeting:
 * - Jordan (Tech Lead): Coordinates and unblocks
 * - Casey (Frontend Dev): Building the UI
 * - Morgan (Product Manager): Tracks progress and priorities
 *
 * Usage:
 *   npx tsx examples/standup.ts
 *
 * Environment Variables:
 *   OPENAI_API_KEY - Required for LLM responses
 *
 * Simulates a realistic engineering team standup with 6 turns.
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
 * Main standup function.
 */
async function runStandup(): Promise<void> {
  // Check environment first
  if (!checkEnvironment()) {
    process.exit(1);
  }

  console.log('🎙️  Voicecrew AI Standup Meeting');
  console.log('==================================');
  console.log('');

  // Create the WebSocket transport
  const transport = new WebSocketTransport({
    port: 3000,
    host: 'localhost',
    path: '/voicecrew',
    cors: true,
  });

  // Connect transport
  await transport.connect();
  console.log('📡 WebSocket server started on ws://localhost:3000/voicecrew');
  console.log('');

  // Configure the standup participants
  const techLead = new VoiceAgent({
    name: 'Jordan',
    persona: `You are Jordan, the Tech Lead. You keep standups efficient and focused. You care about:
1. What did you work on yesterday?
2. What are you working on today?
3. Any blockers?

You speak concisely, offer help with blockers, and keep the team aligned. You reference technical
details when relevant. You might suggest pairing or code reviews when someone is stuck.`,
    voice: {
      provider: new KokoroTTS({ voice: 'am_michael' }),
    },
    llm: {
      provider: new OpenAILLM({ model: 'gpt-4o-mini' }),
    },
    temperature: 0.6,
  });

  const frontendDev = new VoiceAgent({
    name: 'Casey',
    persona: `You are Casey, a Frontend Developer working on the dashboard UI. You're implementing the new
analytics components and fixing accessibility issues. You speak with energy about UI/UX details.
You sometimes mention React, TypeScript, or CSS challenges. You're enthusiastic but realistic
about timelines if there's complexity.`,
    voice: {
      provider: new KokoroTTS({ voice: 'af_sarah' }),
    },
    llm: {
      provider: new OpenAILLM({ model: 'gpt-4o-mini' }),
    },
    temperature: 0.7,
  });

  const productManager = new VoiceAgent({
    name: 'Morgan',
    persona: `You are Morgan, the Product Manager. You track sprint progress and user-facing value.
You ask clarifying questions about timelines and dependencies. You're friendly but focused on
delivery. You might mention upcoming stakeholder demos or user feedback. You help prioritize
when there are conflicting demands.`,
    voice: {
      provider: new KokoroTTS({ voice: 'af_nicole' }),
    },
    llm: {
      provider: new OpenAILLM({ model: 'gpt-4o-mini' }),
    },
    temperature: 0.6,
  });

  // Create the Voicecrew
  const crew = new VoiceCrew({
    agents: [techLead, frontendDev, productManager],
    transport,
  });

  console.log('👥 Team:');
  console.log('   🏗️  Jordan (Tech Lead)');
  console.log('   💻 Casey (Frontend Dev)');
  console.log('   📊 Morgan (Product Manager)');
  console.log('');
  console.log('🎬 Starting standup with 6 turns...');
  console.log('');
  console.log('-------------------------------------------');

  // Start the standup meeting
  const meeting = crew.startMeeting({
    topic: 'Daily standup: Sprint 23 progress on the Analytics Dashboard',
    maxTurns: 6,
    mode: 'round_robin',
    initialContext: `Today's standup for the Analytics Dashboard team. Sprint 23 ends Friday.
Jordan is coordinating, Casey is working on the chart components, and Morgan is tracking delivery.
Current velocity is good but there's a potential blocker with the API response times.`,
  });

  // Listen for events
  meeting.on('turn', ({ agent, text, turnNumber }) => {
    const role = agent.name === 'Jordan' ? '🏗️' : agent.name === 'Casey' ? '💻' : '📊';
    console.log(`${role} ${agent.name} (Turn ${turnNumber}):`);
    console.log(`   "${text}"`);
    console.log('');
  });

  meeting.on('started', ({ meetingId }) => {
    console.log(`📊 Meeting started [${meetingId}]`);
    console.log('-------------------------------------------');
    console.log('');
  });

  meeting.on('ended', ({ totalTurns, durationMs }) => {
    console.log('-------------------------------------------');
    console.log(`✅ Standup complete! ${totalTurns} turns, ${(durationMs / 1000).toFixed(1)}s`);
  });

  // Run the standup
  try {
    await meeting.run();
  } catch (error) {
    console.error('❌ Error during standup:', error);
  } finally {
    // Display summary
    console.log('');
    console.log('📋 Standup Summary:');
    const transcript = meeting.getTranscript();
    const updates = transcript.map((t) => `   • ${t.agentName}: ${t.text.substring(0, 80)}...`);
    console.log(updates.join('\n'));

    // Cleanup
    console.log('');
    console.log('⏳ Keeping connection open for 3 seconds...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await transport.disconnect();
    console.log('👋 Standup finished!');
  }
}

// Run the standup
runStandup().catch(console.error);
