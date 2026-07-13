#!/usr/bin/env node
/**
 * Consensus sprint selftest — pairs + intro gate + audit file presence.
 * Usage: node demigod-sprint-selftest.mjs
 */
import { listPairs, reviewPair, proposePair, pairId, getPair } from './demigod-pairs-lib.mjs';
import { buildQueue } from './demigod-match-review.mjs';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const fails = [];
function ok(c, m) {
  if (!c) fails.push(m);
  else console.log('ok', m);
}

ok(pairId('a', 'b') === pairId('b', 'a'), 'pairId commutative');
const nonce = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const p = proposePair({
  roleId: `role-${nonce}-a`,
  candId: `cand-${nonce}-a`,
  score: 0.5,
  reasons: ['selftest'],
  actor: 'selftest',
});
ok(!!p.pairId, 'propose returns pairId');
ok(!!getPair(p.pairId), 'getPair after propose');
ok(p.state === 'proposed', 'fresh propose is proposed');

let gateHit = false;
try {
  execFileSync('node', [path.join(ROOT, 'demigod-intro-draft.mjs'), p.pairId, '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (e) {
  const err = String(e.stderr || e.stdout || e.message || '');
  gateHit = err.includes('intro_gate') || e.status === 2;
}
ok(gateHit, 'intro gate blocks proposed');

const approved = reviewPair(p.pairId, { decision: 'approve', actor: 'selftest' });
ok(approved.state === 'approved', 'review approve');

const draft = execFileSync(
  'node',
  [path.join(ROOT, 'demigod-intro-draft.mjs'), p.pairId, '--json'],
  { encoding: 'utf8' },
);
ok(JSON.parse(draft).ok === true, 'intro after approve');

const q = buildQueue({});
ok(q.pairs.length >= 1, 'queue non-empty');
ok(fs.existsSync(path.join(ROOT, 'DEMIGOD-BOARD-AUDIT.jsonl')), 'audit jsonl exists');

// reject path — unique ids so re-runs never collide
const p2 = proposePair({
  roleId: `role-${nonce}-b`,
  candId: `cand-${nonce}-b`,
  score: 0.1,
  actor: 'selftest',
});
const rej = reviewPair(p2.pairId, { decision: 'reject', actor: 'selftest' });
ok(rej.state === 'rejected', 'review reject');
let gate2 = false;
try {
  execFileSync('node', [path.join(ROOT, 'demigod-intro-draft.mjs'), p2.pairId, '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (e) {
  gate2 = e.status === 2 || String(e.stderr || '').includes('intro_gate');
}
ok(gate2, 'intro gate blocks rejected');

// consent → mutual_yes path
const p3 = proposePair({
  roleId: `role-${nonce}-c`,
  candId: `cand-${nonce}-c`,
  score: 0.9,
  actor: 'selftest',
});
const { consentPair } = await import('./demigod-pairs-lib.mjs');
consentPair(p3.pairId, { side: 'founder', actor: 'selftest' });
const both = consentPair(p3.pairId, { side: 'candidate', actor: 'selftest' });
ok(both.state === 'mutual_yes', 'dual consent → mutual_yes');

// real-roles env gate: opts alone insufficient
{
  const { saveBoard, loadBoard } = await import('./demigod-submissions-lib.mjs');
  const board = loadBoard();
  const prevEnv = process.env.DEMIGOD_ALLOW_REAL_ROLES;
  delete process.env.DEMIGOD_ALLOW_REAL_ROLES;
  let refused = false;
  try {
    const poisoned = JSON.parse(JSON.stringify(board));
    poisoned.roles = [
      ...(poisoned.roles || []).slice(0, 1),
      {
        id: `role-real-${nonce}`,
        title: 'Real Role',
        sample: false,
        stageType: 'Seed',
        skills: 'x',
      },
    ].slice(0, 3);
    saveBoard(poisoned, {
      reason: 'selftest-real-refuse',
      actor: 'selftest',
      allowRealRoles: true, // opts alone must NOT bypass without env
    });
  } catch (e) {
    refused = e.code === 'REAL_ROLES_REFUSED' || /REAL_ROLES|board_write_refused/.test(String(e.message));
  }
  ok(refused, 'real roles refused without DEMIGOD_ALLOW_REAL_ROLES');
  if (prevEnv != null) process.env.DEMIGOD_ALLOW_REAL_ROLES = prevEnv;
  else delete process.env.DEMIGOD_ALLOW_REAL_ROLES;
}

// mint force needs env
{
  const { mintBoardEntry } = await import('./demigod-submissions-lib.mjs');
  delete process.env.DEMIGOD_MINT_FORCE;
  let mintRefused = false;
  try {
    mintBoardEntry({ id: 'x', status: 'new', form: 'startup', raw: {} }, { force: true, actor: 'selftest' });
  } catch (e) {
    mintRefused = e.code === 'NOT_REVIEWED' || /mint_refused|DEMIGOD_MINT_FORCE/.test(String(e.message));
  }
  ok(mintRefused, 'mint force blocked without DEMIGOD_MINT_FORCE');
}

ok(fs.existsSync(path.join(ROOT, 'bin/dg-matches')), 'bin/dg-matches exists');

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('ALL PASS', buildQueue({}).summary);
