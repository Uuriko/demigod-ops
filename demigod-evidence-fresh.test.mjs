#!/usr/bin/env node
// The "refuse stale green" honesty primitive. isFresh() is what stops a dashboard from showing a
// green that no longer reflects disk (source changed) or that has aged out. priority-board.test only
// mocks refuseIfStale's RETURN; isFresh's own branches were untested. Run:
//   node --test demigod-evidence-fresh.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isFresh, sha256File } from './demigod-evidence.mjs';

const iso = (msFromNow) => new Date(Date.now() + msFromNow).toISOString();

test('fail-closed on missing / malformed / future / expired envelopes', () => {
  assert.deepEqual(isFresh(null), { fresh: false, reason: 'missing' });
  assert.equal(isFresh({ endedAt: 'not-a-date' }).reason, 'invalid-timestamp');
  assert.equal(isFresh({}).fresh, false, 'no timestamp at all -> not fresh (fail-closed; reason is an artifact of the ||0 fallback)');
  // future-dated by >60s is clock skew (a negative age would otherwise sail past the TTL check)
  assert.equal(isFresh({ endedAt: iso(5 * 60_000), ttlSec: 3600 }).reason, 'clock-skew');
  // aged past its TTL
  assert.equal(isFresh({ endedAt: iso(-2 * 3600_000), ttlSec: 3600 }).reason, 'ttl-expired');
});

test('fresh only when recent AND within TTL', () => {
  assert.equal(isFresh({ endedAt: iso(-60_000), ttlSec: 3600 }).fresh, true);
});

test('detects source drift via input hash (the real stale-green trap)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ev-'));
  const f = path.join(dir, 'input.txt');
  fs.writeFileSync(f, 'v1');
  const sha = sha256File(f);
  const env = (files) => ({ inputsAtSeal: { files }, endedAt: iso(-60_000), ttlSec: 3600 });
  assert.equal(isFresh(env({ [f]: sha })).fresh, true, 'matching hash + recent -> fresh');
  fs.writeFileSync(f, 'v2'); // source changed after seal
  const stale = isFresh(env({ [f]: sha }));
  assert.equal(stale.fresh, false);
  assert.equal(stale.reason, 'input-hash-mismatch');
  assert.equal(stale.mismatches[0].file, f);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ttlSec:0 means "no age limit" — pinned sharp edge (change only on purpose)', () => {
  // With ttlSec 0 the age check is skipped (ageMax > 0 guard). An ancient envelope stays fresh as long
  // as its input hashes still match. If this ever needs to expire, change here AND in isFresh together.
  assert.equal(isFresh({ endedAt: iso(-9_999_999_999), ttlSec: 0 }).fresh, true);
});
