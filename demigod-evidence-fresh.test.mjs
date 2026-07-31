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
  assert.equal(isFresh({}).reason, 'empty-scope', 'no inputs -> empty-scope before timestamp parse');
  assert.equal(
    isFresh({ endedAt: 'not-a-date', inputs: { files: { 'demigod-evidence.mjs': 'a'.repeat(64) } } }).reason,
    'input-hash-mismatch',
  );
  // future-dated by >60s is clock skew (a negative age would otherwise sail past the TTL check)
  const tracked = { inputs: { files: { 'demigod-evidence.mjs': sha256File('demigod-evidence.mjs') } } };
  assert.equal(isFresh({ ...tracked, endedAt: iso(5 * 60_000), ttlSec: 3600 }).reason, 'clock-skew');
  // aged past its TTL
  assert.equal(isFresh({ ...tracked, endedAt: iso(-2 * 3600_000), ttlSec: 3600 }).reason, 'ttl-expired');
});

test('fresh only when recent AND within TTL and scope non-empty', () => {
  const tracked = { inputs: { files: { 'demigod-evidence.mjs': sha256File('demigod-evidence.mjs') } } };
  assert.equal(isFresh({ ...tracked, endedAt: iso(-60_000), ttlSec: 3600 }).fresh, true);
  assert.equal(isFresh({ endedAt: iso(-60_000), ttlSec: 3600, inputs: { files: {} } }).reason, 'empty-scope');
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

test('a pinned-input producer cannot seal green against peer-written bytes', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ev-pin-'));
  const previousBusy = process.env.DEMIGOD_BUSY;
  process.env.DEMIGOD_BUSY = dir;
  const evidence = await import(`./demigod-evidence.mjs?pin=${process.pid}-${Date.now()}`);
  if (previousBusy == null) delete process.env.DEMIGOD_BUSY;
  else process.env.DEMIGOD_BUSY = previousBusy;
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const input = path.join(dir, 'input.txt');
  fs.writeFileSync(input, 'v1');
  const run = evidence.beginRun('pin', { scope: [input] });
  run.meta.pinInputsAtStart = true;
  fs.writeFileSync(input, 'v2');
  const sealed = evidence.sealRun(run, { pass: true, summary: 'would have been green' });
  assert.equal(sealed.result.pass, false);
  assert.equal(sealed.result.exit, 1);
  assert.deepEqual(sealed.result.inputDrift, [input]);
  assert.equal(sealed.inputsAtSeal.files[input], run.inputs.files[input]);
  assert.equal(evidence.isFresh(sealed).reason, 'input-hash-mismatch');
});

test('ttlSec:0 means "no age limit" — pinned sharp edge (change only on purpose)', () => {
  // With ttlSec 0 the age check is skipped (ageMax > 0 guard). An ancient envelope stays fresh as long
  // as its input hashes still match and scope is non-empty.
  const tracked = { inputs: { files: { 'demigod-evidence.mjs': sha256File('demigod-evidence.mjs') } } };
  assert.equal(isFresh({ ...tracked, endedAt: iso(-9_999_999_999), ttlSec: 0 }).fresh, true);
});

test('null or empty seal hash is not vacuous-fresh (file missing at seal)', () => {
  const base = { endedAt: iso(-60_000), ttlSec: 3600 };
  const nullSha = isFresh({
    ...base,
    inputsAtSeal: { files: { 'does-not-exist-at-seal.mjs': null } },
  });
  assert.equal(nullSha.fresh, false, 'null sha must not skip the file forever');
  assert.equal(nullSha.reason, 'input-hash-mismatch');
  const emptySha = isFresh({
    ...base,
    inputsAtSeal: { files: { 'does-not-exist-at-seal.mjs': '' } },
  });
  assert.equal(emptySha.fresh, false, 'empty sha must not skip the file forever');
  assert.equal(emptySha.reason, 'input-hash-mismatch');
});

test('an older concurrent seal cannot roll latest backward', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ev-race-'));
  const previousBusy = process.env.DEMIGOD_BUSY;
  process.env.DEMIGOD_BUSY = dir;
  const evidence = await import(`./demigod-evidence.mjs?race=${process.pid}-${Date.now()}`);
  if (previousBusy == null) delete process.env.DEMIGOD_BUSY;
  else process.env.DEMIGOD_BUSY = previousBusy;
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const input = path.join(dir, 'input.txt');
  fs.writeFileSync(input, 'v1');
  const RealDate = globalThis.Date;
  let now = Date.parse('2026-07-29T23:00:00.000Z');
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  };
  try {
    const older = evidence.beginRun('race', { scope: [input] });
    now += 1000;
    const newer = evidence.beginRun('race', { scope: [input] });
    now += 2000;
    const newerSeal = evidence.sealRun(newer, { pass: true });
    // The older writer resumes in the same millisecond after the newer seal published.
    const olderSeal = evidence.sealRun(older, { pass: true });

    const latest = path.join(evidence.EVIDENCE_DIR, 'latest-race.json');
    const newerReceipt = path.join(evidence.EVIDENCE_DIR, `${newer.runId}.json`);
    const olderReceipt = path.join(evidence.EVIDENCE_DIR, `${older.runId}.json`);
    assert.equal(newerSeal._path, newerReceipt);
    assert.equal(olderSeal._path, olderReceipt);
    assert.equal(evidence.loadLatest('race').runId, newer.runId);
    assert.equal(fs.readFileSync(latest, 'utf8'), fs.readFileSync(newerReceipt, 'utf8'));
    assert.equal(JSON.parse(fs.readFileSync(olderReceipt, 'utf8')).runId, older.runId);
    assert.equal(fs.existsSync(`${latest}.lock`), false);
    assert.equal(fs.statSync(evidence.EVIDENCE_DIR).mode & 0o777, 0o700);
    for (const file of [latest, newerReceipt, olderReceipt]) {
      assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    }
    assert.equal(evidence.isFresh(evidence.loadLatest('race')).fresh, true);
    fs.writeFileSync(input, 'v2');
    assert.equal(evidence.isFresh(evidence.loadLatest('race')).reason, 'input-hash-mismatch');
  } finally {
    globalThis.Date = RealDate;
  }
});

test('a later fail-fresh seal does not demote a still-fresh green latest', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ev-keep-'));
  const previousBusy = process.env.DEMIGOD_BUSY;
  process.env.DEMIGOD_BUSY = dir;
  const evidence = await import(`./demigod-evidence.mjs?keep=${process.pid}-${Date.now()}`);
  if (previousBusy == null) delete process.env.DEMIGOD_BUSY;
  else process.env.DEMIGOD_BUSY = previousBusy;
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const input = path.join(dir, 'input.txt');
  fs.writeFileSync(input, 'v1');
  const green = evidence.beginRun('keep', { scope: [input] });
  const greenSeal = evidence.sealRun(green, { pass: true, summary: 'green' });
  assert.equal(evidence.loadLatest('keep').runId, green.runId);
  assert.equal(evidence.isFresh(evidence.loadLatest('keep')).fresh, true);

  const red = evidence.beginRun('keep', { scope: [input] });
  const redSeal = evidence.sealRun(red, { pass: false, summary: 'red reseal' });
  // Red run is still written under its own runId.
  assert.equal(fs.existsSync(redSeal._path), true);
  assert.equal(JSON.parse(fs.readFileSync(redSeal._path, 'utf8')).result.pass, false);
  // Latest stays green while that seal is still fresh.
  assert.equal(evidence.loadLatest('keep').runId, green.runId);
  assert.equal(evidence.loadLatest('keep').result.pass, true);
});
