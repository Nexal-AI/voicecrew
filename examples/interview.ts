/**
 * Voicecrew AI Interview Example
 *
 * Two AI agents simulate a job interview:
 * - Riley (Interviewer): Senior engineer conducting technical interviews
 * - Jamie (Candidate): Mid-level developer interviewing for a backend role
 *
 * Usage:
 *   npx tsx examples/interview.ts
 *
 * Environment Variables:
 *   OPENAI_API_KEY - Required for LLM responses
 *
 * Demonstrates natural back-and-forth conversation dynamics with 8 turns.
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
 * Main interview function.
 */
async function runInterview(): Promise<void> {
  // Check environment first
  if (!checkEnvironment()) {
    process.exit(1);
  }

  console.log('🎙️  Voicecrew AI Interview Simulation');
  console.log('=======================================');
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

  // Configure the interview participants
  const interviewer = new VoiceAgent({
    name: 'Riley',
    persona: `You are Riley, a Senior Staff Engineer conducting a technical interview. You have 10+ years
of experience and value practical knowledge over memorized algorithms. You're friendly but thorough.

Your interview style:
- Start with a warm introduction and asks about the candidate's background
- Ask probing technical questions about system design and problem-solving
- Listen carefully and follow up on interesting answers
- Sometimes ask about past projects and challenges faced
- End by asking if the candidate has questions

You speak professionally but conversationally. You don't ask trick questions.`,
    voice: {
      provider: new KokoroTTS({ voice: 'bm_george' }),
    },
    llm: {
      provider: new OpenAILLM({ model: 'gpt-4o-mini' }),
    },
    temperature: 0.6,
  });

  const candidate = new VoiceAgent({
    name: 'Jamie',
    persona: `You are Jamie, a mid-level backend developer interviewing for a position at a growing startup.
You have 3 years of experience, mostly with Node.js, Python, and PostgreSQL. You've worked on API
design, database optimization, and some basic infrastructure.

Your interview style:
- You're enthusiastic but a bit nervous (normal interview nerves)
- You think through answers before responding
- You're honest about what you know and don't know
- You give concrete examples from past experience
- You ask thoughtful questions about the team and tech stack

You speak naturally, occasionally using "um" or pausing to think (but keep it concise).`,
    voice: {
      provider: new KokoroTTS({ voice: 'bf_emma' }),
    },
    llm: {
      provider: new OpenAILLM({ model: 'gpt-4o-mini' }),
    },
    temperature: 0.7,
  });

  // Create the Voicecrew
  const crew = new VoiceCrew({
    agents: [interviewer, candidate],
    transport,
  });

  console.log('👥 Participants:');
  console.log('   🎤 Riley (Interviewer) - Senior Staff Engineer');
  console.log('   🎯 Jamie (Candidate) - Backend Developer');
  console.log('');
  console.log('🎬 Starting interview simulation...');
  console.log('');
  console.log('-------------------------------------------');

  // Start the interview
  const meeting = crew.startMeeting({
    topic: 'Backend Engineer Interview - Technical Screening',
    maxTurns: 8,
    mode: 'sequential', // Natural back-and-forth
    initialContext: `This is a technical interview for a backend engineering position.
Riley is the interviewer. Jamie is the candidate with 3 years of Node.js/Python experience.
The interview should feel natural, with Riley asking questions and Jamie responding thoughtfully.`,
  });

  // Listen for events
  meeting.on('turn', ({ agent, text, turnNumber }) => {
    if (agent.name === 'Riley') {
      console.log(`🎤 Riley [Interviewer]:`);
    } else {
      console.log(`🎯 Jamie [Candidate]:`);
    }
    console.log(`   "${text}"`);
    console.log('');
  });

  meeting.on('started', ({ meetingId }) => {
    console.log(`📊 Interview started [${meetingId}]`);
    console.log('-------------------------------------------');
    console.log('');
  });

  meeting.on('ended', ({ totalTurns, durationMs }) => {
    console.log('-------------------------------------------');
    console.log(`✅ Interview complete! ${totalTurns} exchanges, ${(durationMs / 1000).toFixed(1)}s`);
  });

  // Handle transport messages (for external clients listening)
  transport.onReceive((data) => {
    // Clients could send instructions like "next topic" or "skip"
    console.log('📥 External command received:', data);
  });

  // Run the interview
  try {
    await meeting.run();
  } catch (error) {
    console.error('❌ Error during interview:', error);
  } finally {
    // Display feedback summary
    console.log('');
    console.log('📋 Interview Transcript:');
    const transcript = meeting.getTranscript();
    for (const entry of transcript) {
      const role = entry.agentName === 'Riley' ? '[I]' : '[C]';
      const text = entry.text.length > 70 ? entry.text.substring(0, 70) + '...' : entry.text;
      console.log(`   ${role} ${entry.agentName}: ${text}`);
    }

    console.log('');
    console.log('💡 Note: In a real scenario, Riley would provide feedback on:');
    console.log('   • Technical depth and problem-solving approach');
    console.log('   • Communication clarity');
    console.log('   • Cultural fit indicators');
    console.log('   • Areas for follow-up questions');

    // Cleanup
    console.log('');
    console.log('⏳ Keeping connection open for 3 seconds...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await transport.disconnect();
    console.log('');
    console.log('👋 Interview simulation complete!');
  }
}

// Run the interview
runInterview().catch(console.error);
