#!/usr/bin/env node
// Empty-scope seals used to be permanent green (clock-only "ok"). Root isFresh now fails closed
// with reason empty-scope. Producer-side: no beginRun may seal scope:[] (demand was the regressor).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isFresh } from './demigod-evidence.mjs';

const now = new Date().toISOString();

// --- root fail-closed: zero tracked files is never fresh ------------------------------------
{
  const vacuous = { producer: 'p', endedAt: now, ttlSec: 3600, inputs: { files: {} } };
  const verdict = isFresh(vacuous);
  assert.equal(verdict.fresh, false, 'zero tracked files must not be fresh');
  assert.equal(verdict.reason, 'empty-scope');
}
{
  const noInputs = { producer: 'p', endedAt: now, ttlSec: 3600 };
  assert.equal(isFresh(noInputs).reason, 'empty-scope');
}
{
  // One tracked file that cannot be hashed → red. Same envelope shape, opposite verdict.
  const tracked = { producer: 'p', endedAt: now, ttlSec: 3600, inputs: { files: { 'no-such-file.xyz': 'a'.repeat(64) } } };
  assert.equal(isFresh(tracked).fresh, false, 'one missing file is red');
  assert.equal(isFresh(tracked).reason, 'input-hash-mismatch');
}
{
  // A seal that recorded a null hash must also be red — creating the file later has to invalidate.
  const nulled = { producer: 'p', endedAt: now, ttlSec: 3600, inputs: { files: { 'demigod-evidence.mjs': null } } };
  assert.equal(isFresh(nulled).fresh, false, 'a null hash at seal is not "skip forever"');
}

// --- the producer-side defence: no sealed producer may use an empty scope ------------------
// Source-level because the alternative is executing every producer. A new empty-scope producer
// added anywhere in the repo fails here, which is the point.
{
  const offenders = [];
  for (const file of fs.readdirSync('.').filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs'))) {
    const source = fs.readFileSync(file, 'utf8');
    // beginRun(..., { scope: [] }) with only whitespace/comments inside the brackets.
    for (const m of source.matchAll(/beginRun\(([^)]*?)\{\s*scope:\s*\[\s*\]/g)) {
      offenders.push(`${file}: beginRun(${m[1].trim().slice(0, 40)}… scope: [])`);
    }
  }
  assert.deepEqual(offenders, [], `producers sealing with an empty scope are vacuously fresh forever:\n  ${offenders.join('\n  ')}`);
}

// --- and specifically that `demand`, the one that regressed, keeps a real scope ------------
{
  const demand = fs.readFileSync('demigod-demand.mjs', 'utf8');
  const call = demand.match(/beginRun\('demand',\s*\{[\s\S]{0,400}?\}\s*\)/)?.[0];
  assert.ok(call, "demand still seals an envelope — if this call moved, re-point this test rather than deleting it");
  const scope = call.match(/scope:\s*\[([\s\S]*?)\]/)?.[1] || '';
  const entries = scope.split(',').map((s) => s.trim()).filter(Boolean);
  assert.ok(entries.length >= 3, `demand's seal scope must track real inputs, found ${entries.length}`);
  assert.match(scope, /demigod-demand\.mjs/, 'the producer must at minimum track its own source');
}

console.log('evidence vacuous-scope guard: all cases PASS');
