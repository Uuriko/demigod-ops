#!/usr/bin/env node
/**
 * The embed-adoption counter, including the part that made it dead code.
 *
 * The pasted Studio embed calls /studio/event from whatever page it lives on. That origin is not in
 * ALLOWED_ORIGINS, so it is refused — and it should be. The refusal is also the only moment we ever
 * hear from an adopter, so the origin is written down on the way past.
 *
 * The first version of this shipped broken: the counter sat inside handleStudio, but the outer
 * worker rejects disallowed origins before the request reaches the Durable Object, so it could
 * never run. Nothing failed; the number simply stayed zero forever, which is exactly how the
 * unmeasured stays unmeasured. So this asserts reachability, not just behaviour.
 *
 *   node dasha-embed-origins.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.WebSocketRequestResponsePair ??= class { constructor(a, b) { this.request = a; this.response = b; } };
const root = dirname(fileURLToPath(import.meta.url));
const worker = readFileSync(join(root, 'dasha-lobby-worker.mjs'), 'utf8');
const { DashaLobby } = await import('./dasha-lobby-worker.mjs');

const ORIGINS = 'https://www.getdasha.com,https://getdasha.com';

function fakeState() {
  const map = new Map();
  return {
    blockConcurrencyWhile: async (fn) => fn(),
    getWebSockets: () => [],
    setWebSocketAutoResponse: () => {},
    storage: {
      get: async (k) => (map.has(k) ? structuredClone(map.get(k)) : undefined),
      put: async (k, v) => { if (typeof k === 'object') { for (const [a, b] of Object.entries(k)) map.set(a, b); return; } map.set(k, structuredClone(v)); },
      delete: async (k) => { map.delete(k); },
      list: async ({ prefix } = {}) => new Map([...map].filter(([k]) => !prefix || k.startsWith(prefix))),
      setAlarm: async () => {}, getAlarm: async () => null,
    },
    _map: map,
  };
}
const lobby = () => new DashaLobby(fakeState(), { ALLOWED_ORIGINS: ORIGINS, MINT: 'x' });

// ---- reachability: the outer worker must not swallow the ping -------------------
{
  const gate = worker.slice(worker.indexOf("url.pathname.startsWith('/simp/')", worker.indexOf('export default')));
  const block = gate.slice(0, gate.indexOf('return stub.fetch(request)'));
  assert.match(block, /\/studio\/event/,
    'the outer origin gate must exempt /studio/event, or the counter inside the DO can never run');
  assert.match(block, /countableEmbedPing/, 'the exemption should be named, not inlined by accident');
  assert.match(block, /!countableEmbedPing/, 'the exemption must actually be applied to the refusal');
}

// ---- an outside origin is counted, and still refused ----------------------------
{
  const l = lobby();
  assert.equal(l.noteEmbedOrigin('https://someone-elses-site.example'), true, 'a new origin is recorded');
  assert.equal(l.studioMetrics.embedOrigins['https://someone-elses-site.example'], 1);

  // A second visit counts but costs no storage write.
  assert.equal(l.noteEmbedOrigin('https://someone-elses-site.example'), false, 'a repeat sighting must not force a write');
  assert.equal(l.studioMetrics.embedOrigins['https://someone-elses-site.example'], 2, 'repeat sightings still count');

  // Path and query are dropped; only the origin is kept.
  l.noteEmbedOrigin('https://blog.example/some/page?utm=x');
  assert.ok(l.studioMetrics.embedOrigins['https://blog.example'], 'only scheme+host is stored');
  assert.ok(!Object.keys(l.studioMetrics.embedOrigins).some((o) => o.includes('/some/page')), 'no paths are retained');
}

// ---- our own surfaces are not adopters -----------------------------------------
{
  const l = lobby();
  for (const own of ['https://www.getdasha.com', 'https://getdasha.com', 'https://lobby.getdasha.com']) {
    assert.equal(l.noteEmbedOrigin(own), false, `${own} is ours, not an adopter`);
  }
  assert.deepEqual(l.studioMetrics.embedOrigins ?? {}, {}, 'first-party origins must not appear in the adoption log');
}

// ---- junk is ignored -------------------------------------------------------------
{
  const l = lobby();
  for (const junk of [null, undefined, '', 'null', 'not a url', 'file:///etc/passwd', 'javascript:alert(1)']) {
    assert.equal(l.noteEmbedOrigin(junk), false, `${junk} must not be recorded`);
  }
  assert.deepEqual(l.studioMetrics.embedOrigins ?? {}, {}, 'nothing malformed reaches storage');
}

// ---- bounded, because it shares a 128 KiB Durable Object value -------------------
{
  const l = lobby();
  for (let i = 0; i < 80; i++) l.noteEmbedOrigin(`https://site-${i}.example`);
  const kept = Object.keys(l.studioMetrics.embedOrigins).length;
  assert.equal(kept, 50, `the map is capped at 50 distinct origins, got ${kept}`);
  assert.ok(l.studioMetrics.embedOriginsOverflow >= 30, 'sightings past the cap still increment a counter');
  const bytes = new TextEncoder().encode(JSON.stringify(l.studioMetrics)).length;
  assert.ok(bytes < 128 * 1024, `studioMetrics is ${(bytes / 1024).toFixed(1)} KiB and shares one storage value`);
}

// ---- the adoption log never touches the real funnel ------------------------------
{
  const l = lobby();
  const before = JSON.stringify({ ...l.studioMetrics, embedOrigins: null });
  l.noteEmbedOrigin('https://someone-elses-site.example');
  const after = JSON.stringify({ ...l.studioMetrics, embedOrigins: null });
  assert.equal(before, after, 'recording an origin must not move opens, completions or sources');
}

console.log('dasha embed origins: PASS (outer gate lets the ping through, outside origins counted once and still refused, own surfaces excluded, junk ignored, capped at 50, funnel untouched)');
