#!/usr/bin/env node
/**
 * demigod-pilot-batch — Underdog/Wellfound-shaped hard batch caps (2–3 candidates).
 *
 * Quality via small curated sets, not ranked hundreds. No fit score.
 *
 *   node demigod-pilot-batch.mjs list
 *   node demigod-pilot-batch.mjs open --role=ID [--max=3]
 *   node demigod-pilot-batch.mjs add --role=ID --cand=ID --why="…"
 *   node demigod-pilot-batch.mjs terminal --role=ID --cand=ID --as=pass|decline
 *   node demigod-pilot-batch.mjs show --role=ID
 *   node demigod-pilot-batch.mjs --selftest
 *
 * SoR: DEMIGOD-PILOT-BATCHES.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(ROOT, 'DEMIGOD-PILOT-BATCHES.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const SCHEMA = 'demigod.pilot-batch/1';
export const MIN_MAX = 2;
export const DEFAULT_MAX = 3;
export const HARD_MAX = 3;

function now() {
  return new Date().toISOString();
}

function load() {
  if (!fs.existsSync(STORE)) {
    return { schema: 'demigod.pilot-batches-store/1', updatedAt: null, batches: {} };
  }
  const j = JSON.parse(fs.readFileSync(STORE, 'utf8'));
  if (!j.batches || typeof j.batches !== 'object') j.batches = {};
  return j;
}

function save(doc) {
  doc.updatedAt = now();
  atomicWrite(STORE, `${JSON.stringify(doc, null, 2)}\n`, { mode: 0o600 });
}

export function assertBatch(b) {
  if (!b || b.schema !== SCHEMA) throw new Error('batch_schema');
  if (!String(b.roleId || '').trim()) throw new Error('batch_roleId');
  const max = Number(b.max);
  if (!Number.isSafeInteger(max) || max < MIN_MAX || max > HARD_MAX) {
    throw new Error('batch_max');
  }
  if (!Array.isArray(b.candidates)) throw new Error('batch_candidates');
  // Cap is on *active* slots; terminal (pass/decline) free a seat but stay in history.
  const active = b.candidates.filter((c) => !c.state || c.state === 'active').length;
  if (active > max) throw new Error('batch_over_cap');
  const ids = new Set();
  for (const c of b.candidates) {
    if (!c?.candId || !String(c.why || '').trim() || String(c.why).trim().length < 4) {
      throw new Error('batch_cand_shape');
    }
    if (ids.has(c.candId)) throw new Error('batch_dup_cand');
    ids.add(c.candId);
    if (c.state && !['active', 'pass', 'decline'].includes(c.state)) {
      throw new Error('batch_cand_state');
    }
  }
  return true;
}

export function openBatch(roleId, { max = DEFAULT_MAX } = {}) {
  const m = Math.min(HARD_MAX, Math.max(MIN_MAX, Number(max) || DEFAULT_MAX));
  const b = {
    schema: SCHEMA,
    roleId: String(roleId).trim(),
    max: m,
    candidates: [],
    openedAt: now(),
    updatedAt: now(),
  };
  assertBatch(b);
  return b;
}

/** Active (non-terminal) count. */
export function activeCount(batch) {
  return (batch.candidates || []).filter((c) => !c.state || c.state === 'active').length;
}

/**
 * Add candidate. Refuses if active count already at max (must terminal one first).
 */
export function addCandidate(batch, candId, why) {
  assertBatch(batch);
  const id = String(candId).trim();
  if (!id) throw new Error('candId');
  if ((batch.candidates || []).some((c) => c.candId === id)) throw new Error('dup');
  if (activeCount(batch) >= batch.max) {
    throw new Error(`batch_full:${batch.max} — terminal a candidate before adding`);
  }
  const next = {
    ...batch,
    candidates: [
      ...batch.candidates,
      {
        candId: id,
        why: String(why).trim(),
        state: 'active',
        addedAt: now(),
      },
    ],
    updatedAt: now(),
  };
  assertBatch(next);
  return next;
}

export function terminalCandidate(batch, candId, as) {
  assertBatch(batch);
  if (!['pass', 'decline'].includes(as)) throw new Error('terminal_as');
  const id = String(candId).trim();
  const next = {
    ...batch,
    candidates: batch.candidates.map((c) =>
      c.candId === id ? { ...c, state: as, terminalAt: now() } : c,
    ),
    updatedAt: now(),
  };
  if (!next.candidates.some((c) => c.candId === id)) throw new Error('cand_missing');
  assertBatch(next);
  return next;
}

export function upsertBatch(batch) {
  assertBatch(batch);
  return withFileLock(`${STORE}.lock`, () => {
    const doc = load();
    doc.batches[batch.roleId] = batch;
    save(doc);
    return batch;
  });
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`pilot-batch selftest: ${m}`);
  };
  let b = openBatch('role-demo', { max: 3 });
  b = addCandidate(b, 'c1', 'Strong craft signal from public work');
  b = addCandidate(b, 'c2', 'Prior domain ship');
  b = addCandidate(b, 'c3', 'Referral from trusted operator');
  assert(b.candidates.length === 3, 'three');
  let threw = false;
  try {
    addCandidate(b, 'c4', 'should fail cap');
  } catch (e) {
    threw = /batch_full/.test(String(e.message));
  }
  assert(threw, 'cap blocks 4th active');
  b = terminalCandidate(b, 'c2', 'decline');
  b = addCandidate(b, 'c4', 'Slot freed after decline');
  assert(activeCount(b) === 3, 'active after terminal+add');
  threw = false;
  try {
    openBatch('x', { max: 5 });
  } catch {
    // openBatch clamps — hard max 3
  }
  const big = openBatch('y', { max: 99 });
  assert(big.max === HARD_MAX, 'clamp max');
  console.log(JSON.stringify({ ok: true, selftest: 'pilot-batch' }));
}

function parseArgs(argv) {
  const o = { cmd: 'list', flags: {} };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--') && a.includes('=')) {
      const [k, ...v] = a.slice(2).split('=');
      o.flags[k] = v.join('=');
    } else if (a.startsWith('--') && argv[i + 1] && !argv[i + 1].startsWith('-')) {
      o.flags[a.slice(2)] = argv[++i];
    } else if (!a.startsWith('-')) rest.push(a);
  }
  if (rest[0]) o.cmd = rest[0];
  return o;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    selftest();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`usage: node demigod-pilot-batch.mjs list|show|open|add|terminal [--role=] [--cand=] [--why=] [--max=3] [--as=pass|decline]`);
    return;
  }
  const { cmd, flags } = parseArgs(args);

  if (cmd === 'list') {
    const doc = load();
    const rows = Object.values(doc.batches || {});
    console.log(`# pilot-batches · ${rows.length}`);
    for (const b of rows) {
      console.log(
        `- ${b.roleId} · active=${activeCount(b)}/${b.max} · total=${b.candidates.length}`,
      );
    }
    return;
  }

  if (cmd === 'show') {
    const b = load().batches[flags.role];
    if (!b) {
      console.error(JSON.stringify({ ok: false, error: 'not found' }));
      process.exit(1);
    }
    console.log(JSON.stringify(b, null, 2));
    return;
  }

  if (cmd === 'open') {
    if (!flags.role) {
      console.error(JSON.stringify({ ok: false, error: '--role required' }));
      process.exit(1);
    }
    const existing = load().batches[flags.role];
    if (existing) {
      console.log(JSON.stringify({ ok: true, existed: true, roleId: flags.role }));
      return;
    }
    const b = openBatch(flags.role, { max: flags.max ? Number(flags.max) : DEFAULT_MAX });
    upsertBatch(b);
    console.log(JSON.stringify({ ok: true, roleId: b.roleId, max: b.max, path: STORE }));
    return;
  }

  if (cmd === 'add') {
    const cur = load().batches[flags.role];
    if (!cur) {
      console.error(JSON.stringify({ ok: false, error: 'open batch first' }));
      process.exit(1);
    }
    try {
      const next = addCandidate(cur, flags.cand, flags.why);
      upsertBatch(next);
      console.log(JSON.stringify({ ok: true, active: activeCount(next), max: next.max }));
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    }
    return;
  }

  if (cmd === 'terminal') {
    const cur = load().batches[flags.role];
    if (!cur) {
      console.error(JSON.stringify({ ok: false, error: 'not found' }));
      process.exit(1);
    }
    try {
      const next = terminalCandidate(cur, flags.cand, flags.as);
      upsertBatch(next);
      console.log(JSON.stringify({ ok: true, active: activeCount(next) }));
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    }
    return;
  }

  console.error(JSON.stringify({ ok: false, error: `unknown ${cmd}` }));
  process.exit(1);
}

if (isMain) main();
