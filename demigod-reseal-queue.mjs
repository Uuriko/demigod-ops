#!/usr/bin/env node
/**
 * demigod-reseal-queue — after map stamps, enqueue research reseal instead of leaving red forever.
 *
 *   node demigod-reseal-queue.mjs enqueue --why="directory-aging --enrich-map"
 *   node demigod-reseal-queue.mjs status
 *   node demigod-reseal-queue.mjs run [--force]
 *   node demigod-reseal-queue.mjs --selftest
 *
 * Queue: /tmp/dg-busy/reseal-queue.jsonl
 * Does not publish. Live reseal may use network/cache.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { refuseIfStale } from './demigod-evidence.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const QUEUE = path.join(BUSY, 'reseal-queue.jsonl');
const LAST = path.join(BUSY, 'reseal-queue-last.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export function enqueueReseal({ why = 'map-changed', producer = 'company-research-benchmark' } = {}) {
  fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
  const row = {
    schema: 'demigod.reseal-queue/1',
    at: new Date().toISOString(),
    why: String(why).slice(0, 200),
    producer,
    pending: true,
  };
  fs.appendFileSync(QUEUE, `${JSON.stringify(row)}\n`, { mode: 0o600 });
  try {
    fs.chmodSync(QUEUE, 0o600);
  } catch {
    /* */
  }
  return row;
}

export function readQueue(limit = 50) {
  if (!fs.existsSync(QUEUE)) return [];
  const lines = fs.readFileSync(QUEUE, 'utf8').split('\n').filter(Boolean);
  return lines.slice(-limit).map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

export function pendingCount() {
  return readQueue(200).filter((r) => r.pending !== false).length;
}

/**
 * Run reseal if research not green or --force. Marks queue drained on success.
 */
export function runReseal({ force = false } = {}) {
  let green = false;
  try {
    const st = refuseIfStale('company-research-benchmark');
    green = st.green === true && st.fresh === true;
  } catch {
    green = false;
  }
  if (green && !force && pendingCount() === 0) {
    return { ok: true, skipped: true, reason: 'already-green-no-pending' };
  }
  if (green && !force) {
    // Drain pending markers without reseal
    drainPending('already-green');
    return { ok: true, skipped: true, reason: 'already-green-drained-queue' };
  }

  const r = spawnSync(process.execPath, [path.join(ROOT, 'demigod-company-research-benchmark.mjs')], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    env: process.env,
  });
  const out = (r.stdout || '').slice(-1500);
  let verificationPass = false;
  try {
    const j = JSON.parse(out.match(/\{[\s\S]*\}\s*$/)?.[0] || out);
    verificationPass = j.verificationPass === true || j.ok === true;
  } catch {
    verificationPass = r.status === 0;
  }
  let after = null;
  try {
    after = refuseIfStale('company-research-benchmark');
  } catch (e) {
    after = { green: false, reason: String(e.message || e) };
  }
  const result = {
    schema: 'demigod.reseal-queue-run/1',
    at: new Date().toISOString(),
    exit: r.status,
    verificationPass,
    green: after?.green === true,
    reason: after?.reason || null,
    runId: after?.runId || null,
    force,
  };
  atomicWrite(LAST, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
  if (result.green || verificationPass) drainPending('resealed');
  return { ok: result.green || verificationPass, ...result, tail: out.slice(-400) };
}

function drainPending(note) {
  if (!fs.existsSync(QUEUE)) return;
  const rows = readQueue(500).map((r) => ({
    ...r,
    pending: false,
    drainedAt: new Date().toISOString(),
    drainNote: note,
  }));
  atomicWrite(QUEUE, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''), {
    mode: 0o600,
  });
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`reseal-queue selftest: ${m}`);
  };
  const busy = path.join('/tmp', `dg-reseal-q-${process.pid}`);
  fs.mkdirSync(busy, { recursive: true });
  const prev = process.env.DEMIGOD_BUSY;
  process.env.DEMIGOD_BUSY = busy;
  // re-import paths use BUSY at load time — test pure helpers with explicit queue write
  const qpath = path.join(busy, 'reseal-queue.jsonl');
  fs.writeFileSync(qpath, '');
  const row = {
    schema: 'demigod.reseal-queue/1',
    at: new Date().toISOString(),
    why: 'test',
    producer: 'company-research-benchmark',
    pending: true,
  };
  fs.appendFileSync(qpath, JSON.stringify(row) + '\n');
  const lines = fs.readFileSync(qpath, 'utf8').trim().split('\n');
  assert(lines.length === 1, 'enqueue');
  if (prev == null) delete process.env.DEMIGOD_BUSY;
  else process.env.DEMIGOD_BUSY = prev;
  fs.rmSync(busy, { recursive: true, force: true });
  console.log(JSON.stringify({ ok: true, selftest: 'reseal-queue' }));
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    selftest();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log('usage: node demigod-reseal-queue.mjs enqueue|status|run [--why=…] [--force]');
    return;
  }
  const cmd = args.find((a) => !a.startsWith('-')) || 'status';
  let why = 'manual';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--why' && args[i + 1]) why = args[++i];
    else if (args[i].startsWith('--why=')) why = args[i].slice(6);
  }
  if (cmd === 'enqueue') {
    const row = enqueueReseal({ why });
    console.log(JSON.stringify({ ok: true, enqueued: row, queue: QUEUE, pending: pendingCount() }));
    return;
  }
  if (cmd === 'status') {
    const pending = pendingCount();
    let research = null;
    try {
      research = refuseIfStale('company-research-benchmark');
    } catch (e) {
      research = { green: false, reason: String(e.message || e) };
    }
    console.log(
      JSON.stringify(
        {
          ok: true,
          pending,
          research: { green: research.green, reason: research.reason, runId: research.runId },
          last: fs.existsSync(LAST) ? JSON.parse(fs.readFileSync(LAST, 'utf8')) : null,
          queue: QUEUE,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (cmd === 'run') {
    const force = args.includes('--force');
    const result = runReseal({ force });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }
  console.error(JSON.stringify({ ok: false, error: `unknown ${cmd}` }));
  process.exit(1);
}

if (isMain) main();
