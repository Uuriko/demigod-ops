#!/usr/bin/env node
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { beginRun, sealRun, isFresh, refuseIfStale, loadLatest } from './demigod-evidence.mjs';
import { checkContract } from './demigod-review-proof.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const fails = [];
const ok = (c, m) => (c ? console.log('ok', m) : fails.push(m));

const foot = path.join(ROOT, 'demigod-foot-core.js');
const run = beginRun('selftest', { scope: [foot] });
const sealed = sealRun(run, { pass: true, summary: 'selftest' });
ok(Boolean(sealed.runId && sealed._path), 'seal evidence');
const fr = isFresh(sealed);
ok(fr.fresh, 'fresh after seal');

// mutate hash expectation by lying
const bad = { ...sealed, inputsAtSeal: { files: { 'demigod-foot-core.js': '0'.repeat(64) } } };
ok(!isFresh(bad).fresh, 'stale on hash mismatch');

const rTruth = spawnSync(process.execPath, [path.join(ROOT, 'demigod-truth.mjs'), '--json'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 90000,
});
ok([0, 1].includes(Number(rTruth.status)), 'truth runs');
const latest = loadLatest('truth');
ok(latest && latest.producer === 'truth', 'latest-truth exists');
const ref = refuseIfStale('truth');
ok(ref.ok, 'refuseIfStale returns');

const cOk = checkContract({ goal: 'selftest contract', touch: ['demigod-evidence.mjs'], requireFootLock: false }, [
  'demigod-evidence.mjs',
]);
ok(cOk.ok, 'contract allows in-scope');
const cBad = checkContract({ goal: 'selftest contract', touch: ['demigod-evidence.mjs'], requireFootLock: false }, [
  'demigod-truth.mjs',
]);
ok(!cBad.ok, 'contract blocks out-of-scope');

const rev = spawnSync(
  process.execPath,
  [
    path.join(ROOT, 'demigod-review.mjs'),
    '--no-git',
    '--files',
    'demigod-evidence.mjs',
    '--fail-on',
    'never',
    '--format',
    'summary',
  ],
  { cwd: ROOT, encoding: 'utf8', timeout: 60000 },
);
ok(rev.status === 0, 'review summary');
ok(/REVIEW/.test(rev.stdout), 'review prints summary');

const lock = spawnSync(process.execPath, [path.join(ROOT, 'demigod-foot-lock.mjs'), 'require'], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, DG_FOOT_LOCK_SKIP: '' },
});
// free lock should fail
ok(lock.status !== 0, 'lock require fails when free');

const shipSt = spawnSync(process.execPath, [path.join(ROOT, 'demigod-ship-selftest.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 180000,
});
ok(shipSt.status === 0, 'ship-selftest');
if (shipSt.status !== 0) console.error(shipSt.stdout + shipSt.stderr);

const demSt = spawnSync(process.execPath, [path.join(ROOT, 'demigod-demand-selftest.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 180000,
});
ok(demSt.status === 0, 'demand-selftest');
if (demSt.status !== 0) console.error(demSt.stdout + demSt.stderr);

const wizSt = spawnSync(process.execPath, [path.join(ROOT, 'demigod-wiz-ownership-selftest.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 30000,
});
ok(wizSt.status === 0, 'wiz-ownership-selftest');
if (wizSt.status !== 0) console.error(wizSt.stdout + wizSt.stderr);

const nextA = spawnSync(process.execPath, [path.join(ROOT, 'demigod-next.mjs'), '--json'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 15000,
});
ok(nextA.status === 0, 'next-canon runs');
try {
  const n = JSON.parse(nextA.stdout.slice(nextA.stdout.indexOf('{')));
  ok(n.source !== 'broken' && n.id, 'next has id');
  ok(typeof n.truthEvidence?.green === 'boolean', 'next truthEvidence');
} catch {
  fails.push('next json parse');
}

const idSt = spawnSync(process.execPath, [path.join(ROOT, 'demigod-next-identity-selftest.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 90000,
});
ok(idSt.status === 0, 'next-identity-selftest');
if (idSt.status !== 0) console.error(idSt.stdout + idSt.stderr);

const uniSt = spawnSync(process.execPath, [path.join(ROOT, 'demigod-unify-selftest.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 60000,
});
ok(uniSt.status === 0, 'unify-selftest');
if (uniSt.status !== 0) console.error(uniSt.stdout + uniSt.stderr);

// P1 CLI surface checks
const who = spawnSync(process.execPath, [path.join(ROOT, 'demigod-foot-lock.mjs'), 'who'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 10000,
});
ok(who.status === 0, 'lock who');
const facts = spawnSync(process.execPath, [path.join(ROOT, 'demigod-ship.mjs'), 'status', '--facts'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 60000,
});
ok(facts.status === 0, 'ship --facts');
ok(!/demand-ops|Human DM/i.test(facts.stdout), 'facts has no agent NEXT prose');
const evP = spawnSync(process.execPath, [path.join(ROOT, 'demigod-evidence.mjs'), 'producers', 'truth,review'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 15000,
});
ok(evP.status === 0 || evP.status === 1, 'evidence producers runs');
const ho = spawnSync(
  process.execPath,
  [path.join(ROOT, 'demigod-handoff.mjs'), '--from', 'selftest', '--done', 'p1', '--next', 'verify', '--fast'],
  { cwd: ROOT, encoding: 'utf8', timeout: 15000 },
);
ok(ho.status === 0, 'handoff structured');

// Boring ROI: poison false-green (required — no skip)
const poisonSt = spawnSync(process.execPath, [path.join(ROOT, 'demigod-poison-green-selftest.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 60000,
});
ok(poisonSt.status === 0, 'poison-green-selftest');
if (poisonSt.status !== 0) console.error(poisonSt.stdout + poisonSt.stderr);

// Boring ROI: orient one-shot (0 oriented · 1 soft · 2 dual-NEXT · 3 hard)
const orientSt = spawnSync(process.execPath, [path.join(ROOT, 'demigod-orient.mjs'), '--json', '--no-refresh'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 60000,
});
ok([0, 1, 2].includes(Number(orientSt.status)), 'orient runs (0/1/2)');
try {
  const oc = JSON.parse(orientSt.stdout.slice(orientSt.stdout.indexOf('{')));
  ok(oc.schema === 'demigod.orient/1', 'orient schema');
  ok(typeof oc.green === 'boolean', 'orient green bool');
  ok(oc.next && oc.next.id, 'orient has NEXT id');
  ok(oc.assertSame && typeof oc.assertSame.ok === 'boolean', 'orient assertSame');
  // false-green ban: exit 0 only if green + assertSame
  if (orientSt.status === 0) {
    ok(oc.green === true && oc.assertSame.ok === true, 'orient exit0 requires green+assertSame');
  }
  if (orientSt.status === 2) {
    ok(oc.assertSame.ok === false, 'orient exit2 is dual-NEXT');
  }
} catch {
  fails.push('orient json parse');
}

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('ALL PASS tools-os-selftest');
