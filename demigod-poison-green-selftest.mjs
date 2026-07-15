#!/usr/bin/env node
/**
 * Poison false-green selftest — evidence seal must refuse green when tampered.
 *
 *   node demigod-poison-green-selftest.mjs
 *
 * Tamper latest-truth on disk → refuseIfStale green MUST be false → restore.
 * Never leaves permanent poison in latest-truth.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  beginRun,
  sealRun,
  isFresh,
  refuseIfStale,
  loadLatest,
  EVIDENCE_DIR,
} from './demigod-evidence.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const fails = [];
const ok = (c, m) => (c ? console.log('ok', m) : fails.push(m));
const foot = path.join(ROOT, 'demigod-foot-core.js');
const latestTruthPath = path.join(EVIDENCE_DIR, 'latest-truth.json');

// 1) Fresh seal should be green-capable (in-memory, producer ≠ truth)
const run = beginRun('poison-selftest', { scope: [foot] });
const sealed = sealRun(run, { pass: true, summary: 'poison-fixture-pass', ttlSec: 3600 });
ok(Boolean(sealed.runId), 'sealed runId');
const fr = isFresh(sealed);
ok(fr.fresh, 'fresh after honest seal');
ok(Boolean(sealed.result?.pass) && fr.fresh, 'honest seal can be green');

// 2) In-memory hash tamper → not fresh → not green
const poisoned = {
  ...sealed,
  inputsAtSeal: {
    files: { 'demigod-foot-core.js': '0'.repeat(64) },
  },
};
const frBad = isFresh(poisoned);
ok(!frBad.fresh, 'poisoned hash is not fresh');
ok(frBad.reason === 'input-hash-mismatch', 'reason hash mismatch');
ok(!(Boolean(poisoned.result?.pass) && frBad.fresh), 'poisoned seal must NOT be green');

// 3) pass=false seal → not green even if fresh
const failSeal = sealRun(beginRun('poison-fail', { scope: [foot] }), {
  pass: false,
  summary: 'poison-fail',
  ttlSec: 3600,
});
const frFail = isFresh(failSeal);
ok(frFail.fresh, 'fail seal still fresh files');
ok(!(failSeal.result?.pass && frFail.fresh), 'pass=false not green');

// 4) TTL poison
const old = {
  ...sealed,
  endedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
  ttlSec: 60,
};
const frTtl = isFresh(old);
ok(!frTtl.fresh, 'ttl-expired not fresh');
ok(!(old.result?.pass && frTtl.fresh), 'ttl poison not green');

// 5) Disk poison of latest-truth + restore (Codex: green MUST flip off)
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
let backup = null;
let weCreatedTruth = false;
try {
  if (fs.existsSync(latestTruthPath)) {
    backup = fs.readFileSync(latestTruthPath, 'utf8');
  } else {
    // seed a green truth only for this test (restore removes if we created empty)
    sealRun(beginRun('truth', { scope: [foot] }), {
      pass: true,
      summary: 'poison-selftest-seed',
      ttlSec: 3600,
    });
    backup = fs.readFileSync(latestTruthPath, 'utf8');
    weCreatedTruth = true;
  }

  const before = refuseIfStale('truth');
  ok(typeof before.green === 'boolean', 'pre-poison refuseIfStale returns green bool');

  // 5a) hash tamper on disk
  const envHash = JSON.parse(backup);
  envHash.inputsAtSeal = {
    files: {
      ...(envHash.inputsAtSeal?.files || envHash.inputs?.files || {}),
      'demigod-foot-core.js': 'deadbeef'.padEnd(64, '0'),
    },
  };
  // keep result.pass true so only freshness kills green
  if (!envHash.result) envHash.result = {};
  envHash.result.pass = true;
  fs.writeFileSync(latestTruthPath, JSON.stringify(envHash, null, 2) + '\n');
  const afterHash = refuseIfStale('truth');
  ok(afterHash.green === false, 'disk hash-poison → green false');
  ok(afterHash.fresh === false, 'disk hash-poison → not fresh');

  // 5b) pass=false on disk (restore first to known baseline then flip pass)
  const envPass = JSON.parse(backup);
  if (!envPass.result) envPass.result = {};
  envPass.result.pass = false;
  // ensure hashes match so only pass kills green
  fs.writeFileSync(latestTruthPath, JSON.stringify(envPass, null, 2) + '\n');
  const afterPass = refuseIfStale('truth');
  ok(afterPass.green === false, 'disk pass=false → green false');

  // restore
  fs.writeFileSync(latestTruthPath, backup);
  const restored = refuseIfStale('truth');
  ok(typeof restored.green === 'boolean', 'restored truth returns green bool');
  // if backup was pass-fresh, green should return; if not, still ok as long as not permanently poisoned
  if (weCreatedTruth) {
    // leave honest seed (backup is our seed) — fine
    ok(restored.green === true || restored.pass === true, 'seed restore recoverable');
  }
  console.log('ok disk poison + restore');
} catch (e) {
  fails.push('disk poison: ' + e.message);
  // best-effort restore
  try {
    if (backup != null) fs.writeFileSync(latestTruthPath, backup);
  } catch {
    /* */
  }
}

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('ALL PASS demigod-poison-green-selftest');
