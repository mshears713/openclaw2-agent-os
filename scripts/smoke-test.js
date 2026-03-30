#!/usr/bin/env node
/**
 * Post-deploy smoke test. Run after deployment to validate all critical paths.
 *
 * Usage:
 *   SMOKE_URL=https://your-service.onrender.com APP_SHARED_SECRET=yoursecret node scripts/smoke-test.js
 *   node scripts/smoke-test.js https://your-service.onrender.com
 */

const BASE_URL = process.env.SMOKE_URL || process.argv[2];
const SECRET = process.env.APP_SHARED_SECRET;

if (!BASE_URL) {
  console.error('Error: provide SMOKE_URL env var or pass URL as first argument');
  process.exit(1);
}
if (!SECRET) {
  console.error('Error: APP_SHARED_SECRET env var is required');
  process.exit(1);
}

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const url = `${BASE_URL.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, options);
  let body;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

console.log(`\nSmoke test → ${BASE_URL}\n`);

await check('GET /health returns 200 with ok:true', async () => {
  const { status, body } = await request('/health');
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body?.ok === true, `Expected ok:true, got ${JSON.stringify(body)}`);
});

await check('POST /agent with no auth returns 401', async () => {
  const { status } = await request('/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'hello' }),
  });
  assert(status === 401, `Expected 401, got ${status}`);
});

await check('POST /agent with wrong secret returns 401', async () => {
  const { status } = await request('/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-secret' },
    body: JSON.stringify({ message: 'hello' }),
  });
  assert(status === 401, `Expected 401, got ${status}`);
});

await check('POST /agent with correct auth and empty body returns 400', async () => {
  const { status } = await request('/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET}` },
    body: JSON.stringify({}),
  });
  assert(status === 400, `Expected 400, got ${status}`);
});

await check('POST /agent with valid message returns 200 with non-empty output', async () => {
  const { status, body } = await request('/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET}` },
    body: JSON.stringify({ message: 'Say hello in one sentence.' }),
  });
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body?.ok === true, `Expected ok:true, got ${JSON.stringify(body)}`);
  assert(typeof body?.output === 'string' && body.output.length > 0, 'Expected non-empty output string');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
