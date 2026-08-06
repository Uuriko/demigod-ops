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
 * CH-13: is a scheduled multi-day re-verify due?
 * due when research not green, OR last green reseal/evidence older than maxAgeDays.
 */
export function resealDue({ maxAgeDays = 7 } = {}) {
  const maxD = Math.max(1, Number(maxAgeDays) || 7);
  let research = null;
  try {
    research = refuseIfStale('company-research-benchmark');
  } catch (e) {
    research = { green: false, fresh: false, reason: String(e.message || e) };
  }
  const last = fs.existsSync(LAST) ? JSON.parse(fs.readFileSync(LAST, 'utf8')) : null;
  const lastOkAt = last?.green || last?.verificationPass ? last.at : null;
  // Prefer evidence run id age via refuseIfStale when green; else last reseal
  let lastAt = lastOkAt;
  try {
    const evPath = path.join(BUSY, 'evidence', 'latest-company-research-benchmark.json');
    if (fs.existsSync(evPath)) {
      const ev = JSON.parse(fs.readFileSync(evPath, 'utf8'));
      const evidenceAt = ev?.endedAt || ev?.at || ev?.startedAt;
      if (evidenceAt && (!lastAt || Date.parse(evidenceAt) > Date.parse(lastAt))) lastAt = evidenceAt;
    }
  } catch {
    /* */
  }
  const ageDays = lastAt && Number.isFinite(Date.parse(lastAt))
    ? (Date.now() - Date.parse(lastAt)) / 864e5
    : null;
  const pending = pendingCount();
  const notGreen = !(research?.green === true && research?.fresh === true);
  const agedOut = ageDays == null || ageDays >= maxD;
  // Failed reseals are still attempts. A schedule loop that re-runs live
  // network reseal every few minutes cannot lift gold usableCoverage; cool
  // down so KEEP_WORKING / timers do not thrash reseal while research is red.
  const COOL_DOWN_H = 12;
  const lastAttemptAt = last?.at && Number.isFinite(Date.parse(last.at)) ? last.at : null;
  const lastAttemptAgeH = lastAttemptAt
    ? (Date.now() - Date.parse(lastAttemptAt)) / 36e5
    : null;
  const recentFailedAttempt =
    notGreen &&
    lastAttemptAt &&
    lastAttemptAgeH != null &&
    lastAttemptAgeH < COOL_DOWN_H &&
    !(last?.green === true || last?.verificationPass === true);
  const due = pending > 0 || (!recentFailedAttempt && (notGreen || agedOut));
  return {
    schema: 'demigod.reseal-due/1',
    at: new Date().toISOString(),
    due,
    maxAgeDays: maxD,
    ageDays: ageDays == null ? null : Math.round(ageDays * 10) / 10,
    lastAt,
    lastAttemptAt,
    lastAttemptAgeH: lastAttemptAgeH == null ? null : Math.round(lastAttemptAgeH * 10) / 10,
    coolDownHours: COOL_DOWN_H,
    recentFailedAttempt,
    pending,
    research: {
      green: research?.green === true,
      fresh: research?.fresh === true,
      reason: research?.reason || null,
      runId: research?.runId || null,
    },
    reason: pending > 0
      ? 'queue_pending'
      : recentFailedAttempt
        ? 'research_red_recent_attempt'
        : notGreen
          ? 'research_not_green'
          : agedOut
            ? 'max_age_exceeded'
            : 'fresh',
  };
}

/**
 * Run reseal if research not green or --force. Marks queue drained on success.
 * With schedule:true, only runs when resealDue().due (CH-13 multi-day).
 */
export function runReseal({ force = false, schedule = false, maxAgeDays = 7 } = {}) {
  if (schedule && !force) {
    const d = resealDue({ maxAgeDays });
    if (!d.due) {
      return { ok: true, skipped: true, reason: 'not-due', due: d };
    }
  }
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

  // Benchmark needs File/fetch undici APIs (Node ≥20). Prefer the studio Node 24 pin when the
  // parent process is still system Node 18 — otherwise reseal false-fails with File is not defined.
  const node24 = path.join(process.env.HOME || '', '.nvm/versions/node/v24.17.0/bin/node');
  const nodeBin = fs.existsSync(node24) ? node24 : process.execPath;
  const r = spawnSync(nodeBin, [path.join(ROOT, 'demigod-company-research-benchmark.mjs')], {
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
  // due helper shape (uses module-level BUSY — call live after restore)
  if (prev == null) delete process.env.DEMIGOD_BUSY;
  else process.env.DEMIGOD_BUSY = prev;
  fs.rmSync(busy, { recursive: true, force: true });
  const d = resealDue({ maxAgeDays: 7 });
  assert(d.schema === 'demigod.reseal-due/1', 'due schema');
  assert(typeof d.due === 'boolean' && d.reason, 'due fields');
  assert(typeof d.coolDownHours === 'number' && d.coolDownHours > 0, 'cool-down hours present');
  if (d.research.green && d.research.fresh) assert(d.lastAt, 'fresh evidence timestamp');
  // When a failed reseal just ran, schedule must not thrash another live run.
  if (d.reason === 'research_red_recent_attempt') assert(d.due === false, 'cool-down holds schedule');
  console.log(JSON.stringify({ ok: true, selftest: 'reseal-queue', due: d.due, reason: d.reason, coolDownHours: d.coolDownHours }));
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    selftest();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`usage: node demigod-reseal-queue.mjs enqueue|status|due|run [--why=…] [--force] [--schedule] [--max-age-days=7]
  due       CH-13: whether multi-day re-verify is due (no network)
  run       reseal when not green / pending / --force; --schedule respects due window`);
    return;
  }
  const cmd = args.find((a) => !a.startsWith('-')) || 'status';
  let why = 'manual';
  let maxAgeDays = 7;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--why' && args[i + 1]) why = args[++i];
    else if (args[i].startsWith('--why=')) why = args[i].slice(6);
    else if (args[i] === '--max-age-days' && args[i + 1]) maxAgeDays = Number(args[++i]);
    else if (args[i].startsWith('--max-age-days=')) maxAgeDays = Number(args[i].slice(15));
  }
  if (cmd === 'enqueue') {
    const row = enqueueReseal({ why });
    console.log(JSON.stringify({ ok: true, enqueued: row, queue: QUEUE, pending: pendingCount() }));
    return;
  }
  if (cmd === 'due') {
    const d = resealDue({ maxAgeDays });
    console.log(JSON.stringify(d, null, 2));
    // Always exit 0 for dash/tool jobs; scripts can read `.due`.
    // Use: node demigod-reseal-queue.mjs due | jq -e .due  for gate-style.
    process.exit(0);
  }
  if (cmd === 'status') {
    const pending = pendingCount();
    let research = null;
    try {
      research = refuseIfStale('company-research-benchmark');
    } catch (e) {
      research = { green: false, reason: String(e.message || e) };
    }
    const due = resealDue({ maxAgeDays });
    console.log(
      JSON.stringify(
        {
          ok: true,
          pending,
          due,
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
    const schedule = args.includes('--schedule');
    const result = runReseal({ force, schedule, maxAgeDays });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }
  console.error(JSON.stringify({ ok: false, error: `unknown ${cmd}` }));
  process.exit(1);
}

if (isMain) main();
