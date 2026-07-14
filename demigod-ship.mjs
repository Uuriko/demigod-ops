#!/usr/bin/env node
/**
 * demigod-ship — single ship path (orchestrator)
 *
 *   bin/dg ship status|help|prepare|cdn|paste|verify|run
 *
 * Mutating steps (cdn, paste, run) require freeze OFF + foot lock.
 * prepare/status/help/verify are freeze-safe (read-only).
 *
 * Never auto-unfreezes. Never claims live==disk without truth --require-match.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { status as freezeStatus, assertNotFrozen } from './demigod-publish-freeze.mjs';
import { assertCanWriteFoot } from './demigod-foot-lock.mjs';
import { beginRun, sealRun } from './demigod-evidence.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const cmd = process.argv[2] || 'help';
const asJson = process.argv.includes('--json');
const factsOnly = process.argv.includes('--facts');

function run(label, argv, { timeout = 180000, allowFail = false, keepFull = false } = {}) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, argv, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    env: process.env,
  });
  const full = ((r.stdout || '') + (r.stderr || '')).trim();
  const ok = r.status === 0;
  const out = keepFull ? full : full.slice(-1200);
  return {
    label,
    ok: allowFail ? true : ok,
    rawOk: ok,
    status: r.status ?? 0,
    ms: Date.now() - t0,
    out,
    full: keepFull ? full : undefined,
  };
}

function parseJsonBlob(text) {
  if (!text) return null;
  const i = text.indexOf('{');
  if (i < 0) return null;
  try {
    return JSON.parse(text.slice(i));
  } catch {
    // truncated or multi-object: try last complete top-level object
    const last = text.lastIndexOf('\n{');
    if (last >= 0) {
      try {
        return JSON.parse(text.slice(last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function help() {
  const f = freezeStatus();
  const text = `# demigod-ship — single path

freeze: ${f.frozen ? 'ON — ' + (f.why || '') : 'OFF (mutations allowed)'}

Subcommands:
  help       this text
  status     ship-status + truth summary (read-only)
  status --facts   disk/live/stage/freeze only (no agent NEXT)
  prepare    verify-source, honesty, foot-smoke, review summary (no CDN)
  cdn        upload foot CDN (needs freeze OFF + lock)
  paste      CM6 footer paste (needs freeze OFF + lock)
  verify     bin/dg truth --require-match
  run        prepare → cdn → paste → verify (full; freeze OFF + lock)

Typical:
  bin/dg ship status
  bin/dg ship prepare
  # human: node demigod-publish-freeze.mjs off
  bin/dg lock claim --owner "$USER" --why ship
  export DG_LOCK_TOKEN=…
  bin/dg ship run
  bin/dg ship verify
  node demigod-publish-freeze.mjs on --why post-ship
`;
  console.log(text);
}

function status() {
  // Reuse fresh on-disk artifacts (15–20s) — skip double network probes
  let truth = null;
  let ship = null;
  try {
    const p = path.join(BUSY, 'truth.json');
    const age = (Date.now() - fs.statSync(p).mtimeMs) / 1000;
    if (age <= 15) truth = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    /* */
  }
  try {
    const p = path.join(BUSY, 'ship-status.json');
    const age = (Date.now() - fs.statSync(p).mtimeMs) / 1000;
    if (age <= 20) ship = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    /* */
  }
  const tStep = truth
    ? { label: 'truth', ok: true, rawOk: true, status: 0, ms: 0 }
    : run('truth', ['demigod-truth.mjs', '--json'], { allowFail: true, keepFull: true });
  const sStep = ship
    ? { label: 'ship-status', ok: true, rawOk: true, status: 0, ms: 0 }
    : run('ship-status', ['demigod-ship-status.mjs', '--json'], {
        allowFail: true,
        keepFull: true,
      });
  if (!truth) {
    try {
      truth = JSON.parse(fs.readFileSync(path.join(BUSY, 'truth.json'), 'utf8'));
    } catch {
      truth = parseJsonBlob(tStep.full || tStep.out);
    }
  }
  if (!ship) {
    try {
      ship = JSON.parse(fs.readFileSync(path.join(BUSY, 'ship-status.json'), 'utf8'));
    } catch {
      ship = parseJsonBlob(sStep.full || sStep.out);
    }
  }
  const freeze = freezeStatus();
  const summary =
    truth?.summaryLine ||
    (truth
      ? `disk v${truth.foot?.ver} live v${truth.live?.footVer} freeze=${freeze.frozen ? 'ON' : 'OFF'} pass=${truth.pass}`
      : null);
  const next = freeze.frozen
    ? 'No ship — freeze holds (demand-first). Disk work OK. Human: freeze off only when intentional.'
    : ship?.nextAction ||
      (truth?.fullyShipped ? 'already shipped' : 'bin/dg ship prepare → lock → run');
  const report = {
    ok: true,
    subcommand: 'status',
    at: new Date().toISOString(),
    freeze: { on: freeze.frozen, why: freeze.why },
    truth: truth
      ? {
          pass: truth.pass,
          summary,
          fullyShipped: truth.fullyShipped,
          driftExpected: truth.driftExpected,
          diskVer: truth.foot?.ver,
          liveVer: truth.live?.footVer,
        }
      : null,
    shipStage: ship?.stage || ship?.status || null,
    next,
    steps: [
      { label: 'truth', ok: tStep.rawOk, status: tStep.status, ms: tStep.ms },
      { label: 'ship-status', ok: sStep.rawOk, status: sStep.status, ms: sStep.ms },
    ],
  };
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'ship-latest.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(BUSY, 'ship-os.json'), JSON.stringify(report, null, 2) + '\n');
  if (factsOnly) {
    const facts = {
      at: report.at,
      freeze: report.freeze,
      diskVer: report.truth?.diskVer || ship?.disk?.ver || null,
      liveVer: report.truth?.liveVer || ship?.live?.footVer || null,
      stage: report.shipStage,
      shipped: Boolean(report.truth?.fullyShipped || ship?.shipped),
      driftExpected: report.truth?.driftExpected ?? null,
      facts: ship?.facts || null,
      // intentionally no agent NEXT — use bin/dg next-canon
    };
    if (asJson) console.log(JSON.stringify(facts));
    else {
      console.log(`# ship facts freeze=${facts.freeze.on ? 'ON' : 'OFF'}`);
      console.log(`  disk v${facts.diskVer} live v${facts.liveVer} stage=${facts.stage}`);
      console.log(`  shipped=${facts.shipped} driftExpected=${facts.driftExpected}`);
    }
    return 0;
  }
  if (asJson) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`# ship status freeze=${report.freeze.on ? 'ON' : 'OFF'}`);
    console.log(`  truth: ${report.truth?.summary || '?'}`);
    console.log(`  stage: ${report.shipStage || '?'}`);
    console.log(`  next:  ${report.next}`);
    console.log(`  report: ${path.join(BUSY, 'ship-latest.json')}`);
  }
  // status is read-only success if truth ran; not "fully shipped"
  return report.truth ? 0 : 1;
}

function prepare() {
  const runEv = beginRun('ship-prepare', {
    scope: [path.join(ROOT, 'demigod-foot-core.js')],
  });
  const steps = [];
  const v = spawnSync('npm', ['run', 'demigod:verify:source'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120000,
  });
  steps.push({
    label: 'verify-source',
    ok: v.status === 0,
    status: v.status,
    out: ((v.stdout || '') + (v.stderr || '')).slice(-400),
  });
  steps.push(run('board-honesty', ['demigod-verify-board-honesty.mjs']));
  steps.push(run('foot-smoke', ['demigod-foot-smoke.mjs']));
  steps.push(run('truth', ['demigod-truth.mjs'], { allowFail: true }));
  steps.push(
    run('review', ['demigod-review.mjs', '--format', 'summary', '--fail-on', 'high'], {
      allowFail: true,
    }),
  );
  const ok = steps.filter((s) => s.label !== 'truth' && s.label !== 'review').every((s) => s.ok);
  const report = { at: new Date().toISOString(), ok, steps, freeze: freezeStatus() };
  sealRun(runEv, { pass: ok, summary: ok ? 'ship-prepare ok' : 'ship-prepare fail' });
  fs.writeFileSync(path.join(BUSY, 'ship-prepare.json'), JSON.stringify(report, null, 2) + '\n');
  if (asJson) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`# ship prepare ${ok ? 'OK' : 'FAIL'}`);
    for (const s of steps) console.log(`  ${s.ok ? '✓' : '✗'} ${s.label}`);
  }
  return ok ? 0 : 1;
}

function requireMutate(label) {
  assertNotFrozen(label);
  assertCanWriteFoot({ label });
}

function cdn() {
  requireMutate('ship-cdn');
  const r = run('foot-cdn', ['demigod-foot-cdn-publish.mjs'], { timeout: 300000 });
  if (asJson) console.log(JSON.stringify(r, null, 2));
  else console.log(r.ok ? '✓ CDN publish' : '✗ CDN publish\n' + r.out);
  return r.ok ? 0 : 1;
}

function paste() {
  requireMutate('ship-paste');
  const r = run('cm6-paste', ['demigod-cm6-paste-publish.mjs', '--footer-only'], { timeout: 300000 });
  if (asJson) console.log(JSON.stringify(r, null, 2));
  else console.log(r.ok ? '✓ CM6 paste' : '✗ CM6 paste\n' + r.out);
  return r.ok ? 0 : 1;
}

function verify() {
  const r = run('truth-match', ['demigod-truth.mjs', '--require-match'], { allowFail: true });
  if (asJson) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(r.ok ? '✓ truth --require-match' : '✗ truth --require-match (disk≠live)');
    if (!r.ok) console.log(r.out.slice(-500));
  }
  return r.ok ? 0 : 1;
}

function runAll() {
  requireMutate('ship-run');
  const ev = beginRun('ship-run', { scope: [path.join(ROOT, 'demigod-foot-core.js')] });
  const results = [];
  let code = prepare();
  results.push({ step: 'prepare', code });
  if (code !== 0) {
    sealRun(ev, { pass: false, summary: 'prepare failed' });
    return code;
  }
  code = cdn();
  results.push({ step: 'cdn', code });
  if (code !== 0) {
    sealRun(ev, { pass: false, summary: 'cdn failed' });
    return code;
  }
  code = paste();
  results.push({ step: 'paste', code });
  if (code !== 0) {
    sealRun(ev, { pass: false, summary: 'paste failed' });
    return code;
  }
  code = verify();
  results.push({ step: 'verify', code });
  sealRun(ev, { pass: code === 0, summary: code === 0 ? 'ship-run ok' : 'verify failed' });
  fs.writeFileSync(
    path.join(BUSY, 'ship-run.json'),
    JSON.stringify({ at: new Date().toISOString(), results }, null, 2) + '\n',
  );
  return code;
}

const map = {
  help,
  status,
  prepare,
  cdn,
  paste,
  verify,
  run: runAll,
};

if (!map[cmd]) {
  console.error('usage: bin/dg ship help|status|prepare|cdn|paste|verify|run');
  process.exit(2);
}
const code = map[cmd]();
process.exit(typeof code === 'number' ? code : 0);
