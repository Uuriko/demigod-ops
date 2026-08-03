#!/usr/bin/env node
/**
 * demigod-orient — boring session start (agents: run this first)
 *
 *   bin/dg orient [--json] [--no-refresh] [--role demand|match|ship|review|all]
 *
 * 1. If truth evidence is stale/missing → run demigod-truth (unless --no-refresh)
 * 2. Soft-refresh demand if missing/stale >15m
 * 3. buildUnify + assert-same (in-process + CLI)
 * 4. Print 5-line card (or JSON)
 *
 * Exit (Codex / Fable contract):
 *   0 oriented — truth green + assert-same ok + single NEXT
 *   1 soft fail — truth not green / unify incomplete
 *   2 dual-NEXT — assert-same mismatch
 *   3 hard refuse — missing spine / corrupt evidence / bad ROOT
 */
import { spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { refuseIfStale } from './demigod-evidence.mjs';
import { buildNext } from './demigod-next.mjs';
import { buildUnify, buildRoleLamps } from './demigod-unify.mjs';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';
import { writeJsonAuto, isFreshFile } from './demigod-perf-cache.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const args = process.argv.slice(2);
const ORIENT_FLAGS = new Set(['--json', '--no-refresh', '--role', '--help', '-h']);
const unknownOrient = args.find(
  (a, i) =>
    a.startsWith('-') &&
    !ORIENT_FLAGS.has(a) &&
    !(args[i - 1] === '--role' && !a.startsWith('-')),
);
if (unknownOrient) {
  console.error(
    `orient: unknown argument ${unknownOrient} — try: bin/dg orient [--json] [--no-refresh] [--role demand|match|ship|review|all]`,
  );
  process.exit(2);
}
if (args.includes('--help') || args.includes('-h')) {
  console.log(`demigod-orient — session start card

Usage: bin/dg orient [--json] [--no-refresh] [--role demand|match|ship|review|all]`);
  process.exit(0);
}
const asJson = args.includes('--json');
const noRefresh = args.includes('--no-refresh');
const roleIdx = args.indexOf('--role');
const role = roleIdx >= 0 ? args[roleIdx + 1] || 'all' : 'all';
if (roleIdx >= 0 && (args[roleIdx + 1] == null || String(args[roleIdx + 1]).startsWith('-'))) {
  console.error('orient: --role requires a value (demand|match|ship|review|all)');
  process.exit(2);
}

function runNode(scriptArgs, timeout = 90000) {
  return spawnSync(process.execPath, scriptArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    env: process.env,
  });
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM means the process exists but belongs to another user.
    return err?.code === 'EPERM' ? true : false;
  }
}

function sha256File(file) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  } catch {
    return null;
  }
}

function sourceReceipt(file) {
  try {
    const stat = fs.statSync(file);
    return {
      schema: 'demigod.source-receipt/1',
      capturedAt: new Date().toISOString(),
      path: file,
      bytes: stat.size,
      sha256: sha256File(file),
    };
  } catch {
    return {
      schema: 'demigod.source-receipt/1',
      capturedAt: new Date().toISOString(),
      path: file,
      bytes: null,
      sha256: null,
    };
  }
}

function demandHygieneSnapshot(demandSnap) {
  const source = demandSnap?.drafts?.hygiene;
  const allHygieneOk = demandSnap?.drafts?.allHygieneOk;
  const ok = typeof source?.ok === 'boolean'
    ? source.ok
    : (typeof allHygieneOk === 'boolean' ? allHygieneOk : null);
  const top3 = Array.isArray(demandSnap?.drafts?.top3) ? demandSnap.drafts.top3 : [];
  const statusPath = source?.statusPath || demandSnap?.statusPath || path.join(BUSY, 'demand-status.json');
  const sourceAt = source?.at || demandSnap?.at || null;
  const sourceAtMs = sourceAt ? Date.parse(sourceAt) : NaN;
  const timestampInvalid = sourceAt !== null && !Number.isFinite(sourceAtMs);
  let fileAtMs = NaN;
  try {
    fileAtMs = fs.statSync(statusPath).mtimeMs;
  } catch {
    /* Missing evidence is stale, not silently current. */
  }
  // File mtime is a compatibility fallback only when the producer omitted its
  // timestamp. An explicit malformed timestamp is corrupt evidence and must
  // fail closed instead of borrowing freshness from a recently touched file.
  const evidenceAtMs = sourceAt === null
    ? fileAtMs
    : (Number.isFinite(sourceAtMs) ? sourceAtMs : NaN);
  const rawAgeSec = Number.isFinite(evidenceAtMs)
    ? Math.floor((Date.now() - evidenceAtMs) / 1000)
    : null;
  // Permit small filesystem/clock jitter, but never turn a forged or corrupt
  // future timestamp into fresh evidence by clamping it to zero.
  const clockSkewed = rawAgeSec !== null && rawAgeSec < -60;
  const ageSec = rawAgeSec !== null && !clockSkewed
    ? Math.max(0, rawAgeSec)
    : null;
  const stale = timestampInvalid || clockSkewed || ageSec === null || ageSec > 900;
  // Publish the same structured, byte-bound evidence receipt used by the
  // dashboard. This lets file-only orient consumers verify provenance without
  // reconstructing a weaker path + hash contract from separate fields.
  const receipt = sourceReceipt(statusPath);
  return {
    statusPath,
    jsonPointer: source?.jsonPointer || '/drafts/hygiene',
    // Bind the verdict to the exact materialized status bytes. A file-only
    // consumer can now distinguish a current hygiene result from a copied or
    // subsequently rewritten demand-status path without trusting mtime alone.
    sourceReceipt: receipt,
    // Compatibility alias for existing compact-card and API consumers.
    sourceSha256: receipt.sha256,
    source: typeof source?.ok === 'boolean'
      ? (source.source || 'drafts.hygiene')
      : (typeof allHygieneOk === 'boolean' ? 'drafts.allHygieneOk' : 'unknown'),
    at: Number.isFinite(evidenceAtMs) ? new Date(evidenceAtMs).toISOString() : null,
    ageSec,
    stale,
    timestampInvalid,
    clockSkewed,
    checked: source?.checked ?? top3.length,
    clean: source?.clean ?? top3.filter((draft) => draft?.hygieneOk === true).length,
    flagged: source?.flagged ?? top3.filter((draft) => draft?.hygieneOk === false).length,
    ok,
    // Consumers should not have to reconstruct the freshness policy. This is
    // intentionally stricter than `ok`: a clean but stale receipt is not ready.
    // `statusPath` is part of the public orient contract. Do not call the
    // verdict ready when only an in-memory/copied timestamp survives but the
    // advertised evidence bytes cannot be read and identified.
    ready: ok === true && stale === false && receipt.sha256 !== null && receipt.bytes !== null,
  };
}

function formatDemandHygiene(hygiene) {
  if (!hygiene) return 'unknown(STALE)';
  const age = Number.isFinite(hygiene.ageSec) ? `,age=${hygiene.ageSec}s` : ',age=?';
  const source = hygiene.source && hygiene.source !== 'unknown' ? `,source=${hygiene.source}` : '';
  // Keep the five-line card compact while making its hygiene evidence directly
  // discoverable to file-only agents (the dashboard exposes the same locator).
  const receipt = hygiene.statusPath
    ? `,receipt=${path.basename(hygiene.statusPath)}${hygiene.jsonPointer || '/drafts/hygiene'}`
    : ',receipt=missing';
  const identity = typeof hygiene.sourceSha256 === 'string'
    ? `,sha=${hygiene.sourceSha256.slice(0, 8)}`
    : ',sha=missing';
  if (typeof hygiene.ok !== 'boolean') {
    return hygiene.stale ? `unknown(STALE${age}${source}${receipt}${identity})` : `unknown(${age.slice(1)}${source}${receipt}${identity})`;
  }
  const verdict = hygiene.ok ? 'ok' : 'FIX';
  const checked = Number.isInteger(hygiene.checked) ? hygiene.checked : null;
  const clean = Number.isInteger(hygiene.clean) ? hygiene.clean : null;
  const flagged = Number.isInteger(hygiene.flagged) ? hygiene.flagged : null;
  const freshness = hygiene.stale ? ',STALE' : '';
  const readiness = `,ready=${hygiene.ready === true ? 'yes' : 'NO'}`;
  return checked === null || clean === null || flagged === null
    ? `${verdict}(${age.slice(1)}${source}${receipt}${identity}${freshness}${readiness})`
    : `${verdict}(clean=${clean}/${checked},flagged=${flagged}${age}${source}${receipt}${identity}${freshness}${readiness})`;
}

function hardRefuse(reason) {
  const card = {
    schema: 'demigod.orient/1',
    ok: false,
    exit: 3,
    reason,
    at: new Date().toISOString(),
  };
  if (asJson) console.log(JSON.stringify(card));
  else {
    console.error(`# orient HARD REFUSE · ${reason}`);
    console.log(`# orient HARD · ${reason}`);
  }
  process.exit(3);
}

function assertSameInProcess() {
  const n = buildNext();
  const plane = readJson(path.join(BUSY, 'control-plane.json'));
  const cock = readJson(path.join(BUSY, 'cockpit.json'));
  const ship = readJson(path.join(BUSY, 'ship-latest.json'));
  const mismatches = [];
  const check = (label, id, cmd) => {
    if (id == null && cmd == null) return;
    if (id && id !== n.id) mismatches.push({ label, field: 'id', expected: n.id, got: id });
    if (cmd && cmd !== n.cmd) mismatches.push({ label, field: 'cmd', expected: n.cmd, got: cmd });
  };
  if (plane?.nextCanon) check('control.nextCanon', plane.nextCanon.id, plane.nextCanon.cmd);
  else if (plane?.next) check('control.next', plane.next.id, plane.next.cmd);
  if (cock?.next && !['live-down', 'board-honesty', 'verify-source'].includes(cock.next.id)) {
    check('cockpit.next', cock.next.id, cock.next.cmd);
  }
  if (ship?.next && typeof ship.next === 'object' && ship.next.id && !ship.next.stage) {
    // ship-latest may describe the release stage chain (often with a hash-like
    // id), not the agent's canonical NEXT. Match demigod-next --assert-same so
    // orient cannot invent a dual-NEXT failure from release metadata.
    if (typeof ship.next.id === 'string' && !/^[0-9a-f]{8,}$/i.test(ship.next.id)) {
      check('ship.next', ship.next.id, ship.next.cmd);
    }
  }
  const nj = readJson(path.join(BUSY, 'next.json'));
  if (nj?.id) check('next.json', nj.id, nj.cmd);
  return { ok: mismatches.length === 0, next: n, mismatches };
}

async function main() {
  // Hard spine checks
  if (!fs.existsSync(path.join(ROOT, 'demigod-truth.mjs'))) {
    hardRefuse('missing demigod-truth.mjs (bad DEMIGOD_ROOT?)');
  }
  if (!fs.existsSync(path.join(ROOT, 'demigod-foot-core.js'))) {
    hardRefuse('missing demigod-foot-core.js');
  }
  if (process.env.DEMIGOD_ROOT && path.resolve(process.env.DEMIGOD_ROOT) !== path.resolve(ROOT)) {
    // still ok if we resolved; only refuse if ROOT clearly wrong
  }

  const steps = [];
  let te;
  try {
    te = refuseIfStale('truth');
  } catch (e) {
    hardRefuse('corrupt truth evidence: ' + e.message);
  }

  if (!te.fresh && !noRefresh) {
    const r = runNode([path.join(ROOT, 'demigod-truth.mjs'), '--quiet'], 90000);
    steps.push({ step: 'truth-refresh', ok: r.status === 0, status: r.status });
    try {
      te = refuseIfStale('truth');
    } catch (e) {
      hardRefuse('corrupt truth after refresh: ' + e.message);
    }
  } else {
    steps.push({ step: 'truth-evidence', ok: te.green, reason: te.reason });
  }

  const demandPath = path.join(BUSY, 'demand-status.json');
  if (!isFreshFile(demandPath, 900) && !noRefresh) {
    const d = runNode([path.join(ROOT, 'demigod-demand.mjs'), 'status', '--json'], 30000);
    steps.push({ step: 'demand-refresh', ok: d.status === 0, status: d.status });
  } else {
    steps.push({ step: 'demand-cache', ok: true, fresh: isFreshFile(demandPath, 900) });
  }

  let unify;
  try {
    unify = await buildUnify();
  } catch (e) {
    steps.push({ step: 'unify', ok: false, error: e.message });
    unify = { next: null, demand: null, error: e.message };
  }

  const same = assertSameInProcess();
  const assertCli = runNode([path.join(ROOT, 'demigod-next.mjs'), '--assert-same'], 15000);
  let assertCliBody = null;
  try {
    assertCliBody = JSON.parse(assertCli.stdout.slice(assertCli.stdout.indexOf('{')));
  } catch {
    /* */
  }
  const assertOk = same.ok && assertCli.status === 0 && assertCliBody?.ok !== false;

  const freeze = freezeStatus();
  const lock = readJson(path.join(BUSY, 'foot-lock.json'));
  const exp = lock?.expiresAt && Date.parse(lock.expiresAt) < Date.now();
  const lockHeld = Boolean(lock?.owner && !exp);
  // PIDs are host-local. A remote lease cannot be proved dead by probing the
  // same numeric PID on this machine, so preserve liveness as unknown.
  const lockOwnerIsLocal = !lock?.host || lock.host === os.hostname();
  // `claim` records the short-lived claim command PID for diagnostics; it is
  // not the process that owns the lease. Only an explicit lease-owner PID can
  // support a liveness verdict. Otherwise preserve unknown until expiry.
  const lockHasOwnerPid = lock?.pidScope === 'lease-owner';
  const lockOwnerAlive = lockHeld && lockOwnerIsLocal && lockHasOwnerPid
    ? processAlive(lock?.pid)
    : null;
  const lockCompromised = Boolean(lockHeld && lockOwnerAlive === false);

  const demandSnap = readJson(path.join(BUSY, 'demand-status.json'));
  const demandHygiene = demandSnap ? demandHygieneSnapshot(demandSnap) : null;
  let controlBoard;
  try {
    const result = runNode([path.join(ROOT, 'demigod-control-board.mjs'), '--json'], 15000);
    controlBoard = JSON.parse(result.stdout);
    if (
      controlBoard?.schema !== 'demigod.control-board/1' ||
      (result.status === 0) !== (controlBoard.ok === true)
    ) {
      throw new Error(`invalid control-board result (status=${result.status})`);
    }
    steps.push({
      step: 'control-board',
      ok: controlBoard.ok,
      highFailures: controlBoard.highFailures,
    });
  } catch (error) {
    controlBoard = {
      ok: false,
      summary: 'evaluation failed',
      highFailures: ['control_board_error'],
      exitFailures: ['control_board_error'],
      error: String(error?.message || error),
    };
    steps.push({ step: 'control-board', ok: false, error: controlBoard.error });
  }
  const shipSnap = readJson(path.join(BUSY, 'ship-status.json')) || readJson(path.join(BUSY, 'ship-latest.json'));
  const truthSnap = readJson(path.join(BUSY, 'truth.json'));
  const reviewEv = (() => {
    try {
      return refuseIfStale('review');
    } catch {
      return { green: false, reason: 'no-review' };
    }
  })();
  const lamps =
    unify.lamps ||
    buildRoleLamps({
      truthEv: te,
      reviewEv,
      freeze: { on: freeze.frozen },
      demand: demandSnap,
      ship: shipSnap,
      truth: truthSnap,
    });

  const card = {
    schema: 'demigod.orient/1',
    at: new Date().toISOString(),
    role,
    // green = truth seal only — NOT business / ship / demand outcome
    green: Boolean(te.green),
    greenReason: te.reason,
    greenMeans: 'truth-seal-pass-fresh-only',
    evidenceRunId: te.runId || null,
    freeze: { on: freeze.frozen, why: freeze.why },
    lock: {
      held: lockHeld,
      owner: lockHeld ? lock.owner : null,
      ownerIsLocal: lockHeld ? lockOwnerIsLocal : null,
      ownerAlive: lockOwnerAlive,
      compromised: lockCompromised,
      ttlLeftSec: lockHeld && lock?.expiresAt
        ? Math.max(0, Math.ceil((Date.parse(lock.expiresAt) - Date.now()) / 1000))
        : null,
    },
    next: {
      id: unify.next?.id || same.next?.id,
      title: unify.next?.title || same.next?.title,
      cmd: unify.next?.cmd || same.next?.cmd,
    },
    demand: unify.demand || demandSnap
      ? {
          pending: unify.demand?.pending ?? demandSnap?.queue?.pending ?? null,
          sentConfirmed: unify.demand?.sentConfirmed ?? demandSnap?.dms?.sentConfirmed ?? null,
          pilotsFilled: unify.demand?.pilotsFilled ?? demandSnap?.pilots?.realFilled ?? null,
          // Warm replies are actionable demand but never pilot evidence. Keep
          // urgency and parser quarantine visible beside the real-pilot count.
          warmInbound: {
            count: demandSnap?.warmInbound?.count ?? null,
            overdue: demandSnap?.warmInbound?.freshness?.overdueActionCount ?? null,
            overdueOldestDays: demandSnap?.warmInbound?.freshness?.overdueActionOldestDays ?? null,
            quarantined: demandSnap?.warmInbound?.quarantinedRows ?? null,
          },
          drafts: {
            // Keep CLI/orient.json evidence self-describing. The dashboard API
            // must not be required to discover where this hygiene verdict came from.
            hygiene: demandHygiene,
          },
        }
      : null,
    lamps,
    controlBoard: {
      ok: controlBoard.ok,
      summary: controlBoard.summary,
      highFailures: controlBoard.highFailures,
      exitFailures: controlBoard.exitFailures,
      receipt: path.join(BUSY, 'control-board.json'),
      error: controlBoard.error || null,
    },
    versions: unify.next?.versions || same.next?.versions || null,
    assertSame: {
      ok: assertOk,
      mismatches: same.mismatches,
      cli: assertCliBody,
    },
    steps,
    links: {
      unify: 'bin/dg unify',
      api: 'http://127.0.0.1:9878/api/unify',
      assert: 'bin/dg next-canon --assert-same',
      controls: 'node demigod-control-board.mjs status',
    },
  };

  if (role === 'match') {
    card.roleHint = 'bin/dg matches · curl -sS :9878/api/matches';
  } else if (role === 'ship') {
    card.roleHint = lamps.ship.green
      ? 'bin/dg ship status --facts'
      : 'ship lamp OFF under freeze — bin/dg ship status --facts only';
  } else if (role === 'review') {
    card.roleHint = 'bin/dg-review --since HEAD~1 --fail-on high (--contract if multi-file)';
  } else if (role === 'demand') {
    card.roleHint = lamps.demand.outcomeOk
      ? 'bin/dg demand status · await replies / white-glove'
      : 'bin/dg demand status · drafts only · outbound remains stopped';
  }

  // Exit codes: 2 dual-NEXT beats soft 1
  let exit = 0;
  if (!assertOk) exit = 2;
  else if (!card.green || unify.error || !controlBoard.ok) exit = 1;
  else exit = 0;

  card.ok = exit === 0;
  card.exit = exit;
  writeJsonAuto(path.join(BUSY, 'orient.json'), card);

  if (asJson) {
    console.log(JSON.stringify(card, null, process.env.DEMIGOD_JSON_PRETTY === '1' ? 2 : 0));
  } else {
    console.log(`# orient ${exit === 0 ? 'OK' : exit === 2 ? 'DUAL-NEXT' : 'ATTENTION'} · ${card.at.slice(0, 19)}`);
    console.log(
      `1 green=${card.green ? 'yes' : 'NO'} (reason=${card.greenReason}; policy=truth-seal-only) runId=${card.evidenceRunId || '—'}`,
    );
    console.log(
      `2 freeze=${card.freeze.on ? 'ON' : 'OFF'}${card.freeze.why ? ' — ' + String(card.freeze.why).slice(0, 50) : ''} · lock=${card.lock.held ? card.lock.owner + (card.lock.compromised ? ' [OWNER EXITED; lease held]' : '') : 'free'}`,
    );
    console.log(`3 NEXT ${card.next.id}: ${card.next.title}`);
    console.log(`4 cmd: ${card.next.cmd}`);
    console.log(
      `5 demand pending=${card.demand?.pending ?? '?'} sent=${card.demand?.sentConfirmed ?? '?'} pilots=${card.demand?.pilotsFilled ?? '?'} warm=${card.demand?.warmInbound?.count ?? '?'}(overdue=${card.demand?.warmInbound?.overdue ?? '?'}${Number.isInteger(card.demand?.warmInbound?.overdueOldestDays) ? `/${card.demand.warmInbound.overdueOldestDays}d` : ''},quarantined=${card.demand?.warmInbound?.quarantined ?? '?'}) drafts.hygiene=${formatDemandHygiene(card.demand?.drafts?.hygiene)} · controls=${card.controlBoard.ok ? 'ok' : 'ATTENTION'} · assertSame=${card.assertSame.ok ? 'ok' : 'FAIL'}`,
    );
    // Keep the CLI contract to exactly five numbered lines. Role lamps remain
    // available in orient.json / --json without competing with the canonical
    // green, freeze, NEXT, command, and demand+assertSame scan path.
    if (card.roleHint) console.log(`+ role(${role}): ${card.roleHint}`);
    if (!assertOk && card.assertSame.mismatches?.length) {
      console.error('! dual-NEXT:', JSON.stringify(card.assertSame.mismatches));
    }
  }
  process.exit(exit);
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(3);
  });
}
