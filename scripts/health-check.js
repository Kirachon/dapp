#!/usr/bin/env node
/*
  Staging API Health Check Script
  - GET /health (expect 200)
  - GET /ready (expect 200)
  - POST /graphql { __typename } (expect data.__typename)
*/

const BASE = process.env.HEALTH_BASE || 'http://localhost:8080';

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function checkHealth() {
  const res = await fetchWithTimeout(`${BASE}/health`);
  if (!res.ok) throw new Error(`/health failed: ${res.status}`);
  return 'OK';
}

async function checkReady() {
  const res = await fetchWithTimeout(`${BASE}/ready`);
  if (!res.ok) throw new Error(`/ready failed: ${res.status}`);
  return 'OK';
}

async function checkGraphQL() {
  const res = await fetchWithTimeout(`${BASE}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ __typename }' })
  });
  if (!res.ok) throw new Error(`/graphql failed: ${res.status}`);
  const json = await res.json();
  if (!json || !json.data || typeof json.data.__typename !== 'string') {
    throw new Error('GraphQL response missing data.__typename');
  }
  return json.data.__typename;
}

(async () => {
  try {
    console.log(`Checking API at ${BASE} ...`);
    const health = await checkHealth();
    console.log(`\u2705 /health: ${health}`);

    const ready = await checkReady();
    console.log(`\u2705 /ready: ${ready}`);

    const typename = await checkGraphQL();
    console.log(`\u2705 /graphql: __typename=${typename}`);

    console.log('\nAll health checks PASSED');
    return;
  } catch (err) {
    const detail = err && err.stack ? err.stack : (err && err.message ? err.message : String(err));
    console.error(`\n\u274c Health check FAILED:`, detail);
    process.exitCode = 1;
  }
})();

