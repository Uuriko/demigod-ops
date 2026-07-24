#!/usr/bin/env node
/**
 * One-command preflight for agents (Grok self-tool).
 * Runs: syntax, smoke, board, ship-status, claim-verify suite, plan open, lock status.
 *
 * Preflight = safe to edit disk (not "fully shipped"). Prepare-only lag
 * (disk ahead of live/manifest while publish unauthorized) is green when
 * live is sealed to manifest and disk is healthy — same honesty as truth.
 * Full ship certification stays with claim-verify --ship / ship status.
 *
 * Usage:
 *   node demigod-preflight.mjs
 *   node demigod-preflight.mjs --json
 *   node demigod-preflight.mjs --strict   # exit 1 on any fail
 *   node demigod-preflight.mjs --full     # + verify:source
 *   node demigod-preflight.mjs --quick    # skip claim-verify + ship (syntax/smoke/board/lock)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  BUSY,
  ensureBusy,
  parseFirstJson,
  runNode,
  atomicWrite,
  flag,
} from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const strict = flag(process.argv, '--strict');
const asJson = flag(process.argv, '--json');
const full = flag(process.argv, '--full');
const quick = flag(process.argv, '--quick');

/** ship-status JSON: edit-ready (fully shipped OR healthy prepare-only lag). */
function shipStatusOkForPreflight(j) {
  if (!j || typeof j !== 'object') return { ok: false, detail: 'no ship-status' };
  const stageOk = (id) => (j.stages || []).some((s) => s.id === id && s.ok === true);
  const diskHealthy = stageOk('disk_ok') && stageOk('disk_syntax');
  const liveSealed =
    stageOk('live_reachable') &&
    stageOk('live_matches_manifest') &&
    stageOk('footer_lite_points_cdn');
  if (j.shipped === true) return { ok: true, detail: 'fully shipped' };
  if (diskHealthy && liveSealed) {
    const dv = j.facts?.diskVer || j.disk?.ver || '?';
    const lv = j.facts?.liveVer || j.live?.footVer || '?';
    return {
      ok: true,
      detail: `prepare-only disk v${dv} ≠ live v${lv} · stage=${j.stage || '?'}`,
    };
  }
  return { ok: false, detail: j.stage || j.nextAction || 'ship incomplete' };
}

function run(label, args, opts = {}) {
  const started = Date.now();
  const r = runNode(ROOT, args, { timeout: opts.timeout || 90000 });
  const out = r.out;
  let ok = r.status === 0;
  let detail = out.slice(0, 200).replace(/\s+/g, ' ');
  const j = parseFirstJson(r.stdout || out);
  if (j) {
    if (typeof j.pass === 'boolean') ok = j.pass && r.status === 0;
    if (j.summary) detail = j.summary;
    if (j.stage) detail = j.stage;
    // ship-status: prepare-only lag is green for edit readiness (not full ship cert)
    if (label === 'ship-status') {
      const s = shipStatusOkForPreflight(j);
      ok = s.ok;
      detail = s.detail;
    }
    // lock status: free or locked both "ok" for preflight (informational)
    if (label === 'foot-lock-status' && typeof j.locked === 'boolean') {
      ok = true;
      detail = j.locked ? `LOCKED by ${j.lock?.owner || '?'}` : 'free';
    }
    // plan ledger open always ok if parsed
    if (label === 'plan-ledger-open' && Array.isArray(j.plans)) {
      ok = r.status === 0;
      detail = `open=${j.count ?? j.plans.length}`;
    }
  }
  // force-fail labels
  if (opts.requireOk && r.status !== 0) ok = false;
  return { label, ok, status: r.status, ms: Date.now() - started, detail };
}

const steps = [];
steps.push(run('foot-syntax', ['--check', 'demigod-foot-core.js']));
steps.push(run('foot-smoke', ['demigod-foot-smoke.mjs']));
steps.push(run('board-honesty', ['demigod-verify-board-honesty.mjs']));

if (!quick) {
  steps.push(run('ship-status', ['demigod-ship-status.mjs', '--json'], { timeout: 90000 }));
  // No --ship: full ship cert is claim-verify --ship / ship cycle. Preflight must
  // soft-ok prepare-only lag so agents can edit disk under lag DEBT without false reds.
  steps.push(
    run(
      'claim-verify',
      ['demigod-claim-verify.mjs', '--copy-policy', '--smoke', '--board'],
      { timeout: 120000 },
    ),
  );
}

steps.push(run('foot-lock-status', ['demigod-foot-lock.mjs', 'status']));
steps.push(run('plan-ledger-open', ['demigod-plan-ledger.mjs', 'open']));
// disk copy-policy always (fast honesty)
steps.push(run('copy-policy-disk', ['demigod-copy-policy.mjs', '--disk-only', '--json']));

if (full) {
  steps.push(run('verify-source', ['demigod-verify-source.mjs'], { timeout: 120000 }));
  steps.push(run('copy-policy-live', ['demigod-copy-policy.mjs', '--json'], { timeout: 60000 }));
}

const pass = steps.every((s) => s.ok);
const report = {
  at: new Date().toISOString(),
  pass,
  quick,
  full,
  steps,
  next: pass
    ? 'preflight green — edit only under foot-lock; ship via dg-publish-foot when needed'
    : `fix: ${steps
        .filter((s) => !s.ok)
        .map((s) => s.label)
        .join(', ')}`,
};

try {
  ensureBusy();
  atomicWrite(path.join(BUSY, 'preflight-latest.json'), JSON.stringify(report, null, 2) + '\n');
} catch {
  /* */
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`preflight  ${pass ? 'PASS ✓' : 'FAIL ✗'}${quick ? ' (quick)' : ''}${full ? ' (full)' : ''}`);
  for (const s of steps) {
    console.log(`  ${s.ok ? '✓' : '✗'} ${s.label.padEnd(22)} ${s.ms}ms  ${s.detail.slice(0, 80)}`);
  }
  console.log(`next  ${report.next}`);
  console.log(`wrote /tmp/dg-busy/preflight-latest.json`);
}

if (strict && !pass) process.exit(1);
process.exit(pass ? 0 : 1);
