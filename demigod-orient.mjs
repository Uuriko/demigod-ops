#!/usr/bin/env node
/**
 * demigod-orient — boring session start (agents: run this first)
 *
 *   bin/dg orient [--json] [--no-refresh] [--role demand|match|ship|review|all]
 *
 * 1. If truth evidence not green/fresh → run demigod-truth (unless --no-refresh)
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
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { refuseIfStale } from './demigod-evidence.mjs';
import { buildNext } from './demigod-next.mjs';
import { buildUnify } from './demigod-unify.mjs';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';
import { writeJsonAuto, isFreshFile } from './demigod-perf-cache.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const noRefresh = args.includes('--no-refresh');
const roleIdx = args.indexOf('--role');
const role = roleIdx >= 0 ? args[roleIdx + 1] || 'all' : 'all';

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
  if (ship?.next && typeof ship.next === 'object') check('ship.next', ship.next.id, ship.next.cmd);
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

  if (!te.green && !noRefresh) {
    const r = runNode([path.join(ROOT, 'demigod-truth.mjs'), '--quiet'], 90000);
    steps.push({ step: 'truth-refresh', ok: r.status === 0 || r.status === 1, status: r.status });
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
  const assertOk = same.ok && (assertCli.status === 0 || assertCliBody?.ok !== false);

  const freeze = freezeStatus();
  const lock = readJson(path.join(BUSY, 'foot-lock.json'));
  const exp = lock?.expiresAt && Date.parse(lock.expiresAt) < Date.now();
  const lockHeld = Boolean(lock?.owner && !exp);

  const card = {
    schema: 'demigod.orient/1',
    at: new Date().toISOString(),
    role,
    green: Boolean(te.green),
    greenReason: te.reason,
    evidenceRunId: te.runId || null,
    freeze: { on: freeze.frozen, why: freeze.why },
    lock: { held: lockHeld, owner: lockHeld ? lock.owner : null },
    next: {
      id: unify.next?.id || same.next?.id,
      title: unify.next?.title || same.next?.title,
      cmd: unify.next?.cmd || same.next?.cmd,
    },
    demand: unify.demand
      ? {
          pending: unify.demand.pending,
          sentConfirmed: unify.demand.sentConfirmed,
          pilotsFilled: unify.demand.pilotsFilled,
        }
      : null,
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
    },
  };

  if (role === 'match') {
    card.roleHint = 'bin/dg matches · curl -sS :9878/api/matches';
  } else if (role === 'ship') {
    card.roleHint = 'bin/dg ship status --facts · freeze must be OFF to mutate';
  } else if (role === 'review') {
    card.roleHint = 'bin/dg-review --files <touched> --bug --fail-on high';
  } else if (role === 'demand') {
    card.roleHint = 'bin/dg demand status · human DMs only';
  }

  // Exit codes: 2 dual-NEXT beats soft 1
  let exit = 0;
  if (!assertOk) exit = 2;
  else if (!card.green || unify.error) exit = 1;
  else exit = 0;

  card.ok = exit === 0;
  card.exit = exit;
  writeJsonAuto(path.join(BUSY, 'orient.json'), card);

  if (asJson) {
    console.log(JSON.stringify(card, null, process.env.DEMIGOD_JSON_PRETTY === '1' ? 2 : 0));
  } else {
    console.log(`# orient ${exit === 0 ? 'OK' : exit === 2 ? 'DUAL-NEXT' : 'ATTENTION'} · ${card.at.slice(0, 19)}`);
    console.log(
      `1 green=${card.green ? 'yes' : 'NO'} (${card.greenReason}) runId=${card.evidenceRunId || '—'}`,
    );
    console.log(
      `2 freeze=${card.freeze.on ? 'ON' : 'OFF'}${card.freeze.why ? ' — ' + String(card.freeze.why).slice(0, 50) : ''} · lock=${card.lock.held ? card.lock.owner : 'free'}`,
    );
    console.log(`3 NEXT ${card.next.id}: ${card.next.title}`);
    console.log(`4 cmd: ${card.next.cmd}`);
    console.log(
      `5 demand pending=${card.demand?.pending ?? '?'} sent=${card.demand?.sentConfirmed ?? '?'} pilots=${card.demand?.pilotsFilled ?? '?'} · assertSame=${card.assertSame.ok ? 'ok' : 'FAIL'}`,
    );
    if (card.roleHint) console.log(`+ role(${role}): ${card.roleHint}`);
    if (!assertOk && card.assertSame.mismatches?.length) {
      console.error('! dual-NEXT:', JSON.stringify(card.assertSame.mismatches));
    }
    if (exit !== 0) {
      console.error('! fix: bin/dg truth && bin/dg next-canon --assert-same && bin/dg unify');
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
