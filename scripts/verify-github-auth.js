#!/usr/bin/env node
/**
 * GitHub Authentication & Identity Verification Script
 * 
 * Two-factor gate:
 * 1. GET /rate_limit → 5000 requests remaining = authenticated
 * 2. GET /user → login matches expected identity = correct account
 * 
 * Usage: node scripts/verify-github-auth.js [expected-username]
 */

const https = require('https');

const GITHUB_API_HOST = 'api.github.com';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const EXPECTED_LOGIN = process.argv[2] || process.env.GITHUB_EXPECTED_LOGIN;

if (!TOKEN) {
  console.error('❌ Error: GITHUB_TOKEN or GH_TOKEN environment variable required');
  process.exit(1);
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: GITHUB_API_HOST,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'User-Agent': 'voicecrew-github-auth-verify/1.0',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function verify() {
  console.log('🔐 GitHub Auth & Identity Verification\n');
  
  // Check 1: Authentication via rate_limit
  console.log('⏳ Check 1: Verifying authentication (GET /rate_limit)...');
  const rateLimitRes = await makeRequest('/rate_limit');
  
  if (rateLimitRes.status !== 200) {
    console.error(`❌ Check 1 FAILED: HTTP ${rateLimitRes.status}`);
    console.error('   Response:', rateLimitRes.data);
    process.exit(1);
  }

  const remaining = rateLimitRes.data?.resources?.core?.remaining;
  const limit = rateLimitRes.data?.resources?.core?.limit;
  
  if (remaining === undefined || limit === undefined) {
    console.error('❌ Check 1 FAILED: Unable to parse rate limit response');
    console.error('   Response:', rateLimitRes.data);
    process.exit(1);
  }

  const authenticated = limit === 5000;
  console.log(`   Rate limit: ${remaining}/${limit} requests remaining`);
  console.log(`   ${authenticated ? '✅' : '⚠️'} Check 1: Authentication ${authenticated ? 'confirmed (5000 limit = authenticated)' : 'suspect (60 limit = unauthenticated)'}`);

  // Check 2: Identity verification via /user
  console.log('\n⏳ Check 2: Verifying identity (GET /user)...');
  const userRes = await makeRequest('/user');
  
  if (userRes.status !== 200) {
    console.error(`❌ Check 2 FAILED: HTTP ${userRes.status}`);
    console.error('   Response:', userRes.data);
    process.exit(1);
  }

  const login = userRes.data?.login;
  const id = userRes.data?.id;
  const type = userRes.data?.type;

  if (!login) {
    console.error('❌ Check 2 FAILED: No login field in user response');
    console.exit(1);
  }

  console.log(`   Authenticated as: ${login} (ID: ${id}, Type: ${type})`);

  const identityVerified = EXPECTED_LOGIN ? login === EXPECTED_LOGIN : true;
  
  if (EXPECTED_LOGIN) {
    if (identityVerified) {
      console.log(`   ✅ Check 2: Identity matches expected login (${EXPECTED_LOGIN})`);
    } else {
      console.error(`   ❌ Check 2: IDENTITY MISMATCH`);
      console.error(`      Expected: ${EXPECTED_LOGIN}`);
      console.error(`      Actual:   ${login}`);
      console.error(`
   ⚠️  This indicates the GitHub token belongs to a different account`);
      console.error(`      than expected. Please verify your GITHUB_TOKEN is correct.`);
      process.exit(1);
    }
  } else {
    console.log(`   ℹ️  Check 2: No EXPECTED_LOGIN specified (set via argument or GITHUB_EXPECTED_LOGIN env var)`);
    console.log(`      To enable strict identity verification, provide expected username.`);
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (authenticated && identityVerified) {
    console.log('✅ VERIFICATION PASSED');
    console.log(`   • Authenticated: YES (5000 req/hour limit)`);
    console.log(`   • Identity:      ${login}${EXPECTED_LOGIN ? ` (matches ${EXPECTED_LOGIN})` : ''}`);
    console.log(`   • Token scopes:  ${rateLimitRes.headers['x-oauth-scopes'] || 'N/A'}`);
    console.log('\n🚀 Ready for GitHub connector activation');
    process.exit(0);
  } else {
    console.log('❌ VERIFICATION FAILED');
    process.exit(1);
  }
}

verify().catch(err => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
