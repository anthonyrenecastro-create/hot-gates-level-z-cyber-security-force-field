import assert from 'assert';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import readline from 'readline';
import fetch from 'node-fetch';

const API_PORT = 5000;
const API_BASE = `http://127.0.0.1:${API_PORT}`;
const SERVER_COMMAND = 'npx';
const SERVER_ARGS = ['tsx', 'src/backend-api.ts'];

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForHealth(): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        return;
      }
    } catch {
      // ignore
    }
    await wait(250);
  }
  throw new Error('Server did not start in time');
}

function startServer(): Promise<ChildProcessWithoutNullStreams> {
  return new Promise((resolve, reject) => {
    const server = spawn(SERVER_COMMAND, SERVER_ARGS, {
      env: { ...process.env, PORT: String(API_PORT), RUN_MODE: 'enforcement' },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const stdout = readline.createInterface({ input: server.stdout });
    stdout.on('line', line => {
      if (line.includes('Server running')) {
        resolve(server);
      }
    });

    server.stderr.on('data', chunk => {
      process.stderr.write(chunk);
    });

    server.on('error', reject);

    setTimeout(() => reject(new Error('Server failed to start')), 10000);
  });
}

async function stopServer(server: ChildProcessWithoutNullStreams): Promise<void> {
  if (!server.killed) {
    server.kill('SIGTERM');
  }
}

async function testHealthEndpoint() {
  const res = await fetch(`${API_BASE}/health`);
  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert.strictEqual(json.status, 'operational');
}

async function testBasicEvaluateAllowed() {
  const res = await fetch(`${API_BASE}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-tier': 'pro' },
    body: JSON.stringify({
      service: 'eden',
      action: 'chat',
      capabilities: ['chat']
    })
  });

  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.allowed, true);
  assert.strictEqual(body.service, 'eden');
}

async function testHighThreatDeniesFreeUser() {
  const res = await fetch(`${API_BASE}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-tier': 'free' },
    body: JSON.stringify({
      service: 'eden',
      action: 'chat',
      capabilities: ['chat'],
      threatSignals: [
        { type: 'cyber', value: 0.95, region: 'GLOBAL', narrative: 'Critical threat detected' },
        { type: 'infops', value: 0.9, region: 'GLOBAL', narrative: 'Disinformation campaign' }
      ]
    })
  });

  assert.strictEqual(res.status, 403);
  const body = await res.json();
  assert.strictEqual(body.allowed, false);
  assert.ok(body.reason.includes('Access denied') || body.reason.includes('fail closed'));
}

async function testStandaloneThreatAnalysis() {
  const res = await fetch(`${API_BASE}/api/threat/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.API_KEY || '' },
    body: JSON.stringify({
      signals: [
        { type: 'economic', value: 0.7, region: 'ASIA', narrative: 'Market volatility' },
        { type: 'cyber', value: 0.6, region: 'GLOBAL', narrative: 'Ransomware uptick' }
      ]
    })
  });

  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(body.result);
  assert.ok(typeof body.result.scoring.overall_score === 'number');
}

async function testBatchEvaluation() {
  const res = await fetch(`${API_BASE}/api/evaluate/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.API_KEY || '' },
    body: JSON.stringify({
      requests: [
        { id: 'r1', service: 'eden', action: 'chat', userTier: 'pro', capabilities: ['chat'] },
        {
          id: 'r2',
          service: 'eden',
          action: 'chat',
          userTier: 'free',
          capabilities: ['chat'],
          threatSignals: [{ type: 'cyber', value: 0.95, region: 'GLOBAL', narrative: 'Attack pattern' }]
        }
      ]
    })
  });

  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.total, 2);
  assert.strictEqual(body.results.length, 2);
  assert.ok(body.results[0].allowed);
  assert.strictEqual(body.results[1].allowed, false);
}

async function testLoad() {
  const concurrent = 16;
  const requests = Array.from({ length: concurrent }, (_, idx) =>
    fetch(`${API_BASE}/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-tier': 'pro' },
      body: JSON.stringify({
        service: 'ollama',
        action: 'local_llm',
        capabilities: ['local_llm'],
        threatSignals: [
          { type: 'cyber', value: 0.4, region: 'US', narrative: `Load test ${idx}` }
        ]
      })
    })
  );

  const responses = await Promise.all(requests);
  for (const res of responses) {
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.allowed, true);
  }
}

async function main() {
  console.log('Starting backend API test suite...');
  const server = await startServer();

  try {
    await waitForHealth();
    console.log('Server is healthy. Running tests...');

    await testHealthEndpoint();
    console.log('✔ Health endpoint');

    await testBasicEvaluateAllowed();
    console.log('✔ Basic evaluate');

    await testHighThreatDeniesFreeUser();
    console.log('✔ High threat adversarial deny');

    await testStandaloneThreatAnalysis();
    console.log('✔ Standalone threat analysis');

    await testBatchEvaluation();
    console.log('✔ Batch evaluation');

    await testLoad();
    console.log('✔ Load test passed');

    console.log('All tests passed successfully.');
  } finally {
    await stopServer(server);
  }
}

main().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
