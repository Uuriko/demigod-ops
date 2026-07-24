#!/usr/bin/env node
/**
 * demigod-ship — single ship path (orchestrator)
 *
 *   bin/dg ship status|help|prepare|cdn|paste|verify|run
 *
 * Mutating steps (cdn, paste, run) require current-request authorization + freeze OFF + foot lock.
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
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const argv = process.argv.slice(2);
const cmd = argv[0] || 'help';
const rest = argv.slice(1);
// Fail closed on typos so `ship status --strcit` cannot silently run prepare-state.
const SHIP_FLAGS = new Set(['--json', '--facts']);
const unknownFlag = rest.find((a) => !SHIP_FLAGS.has(a));
if (unknownFlag) {
  console.error(
    `ship: unknown argument ${unknownFlag} — try: bin/dg ship ${cmd} [--json]${cmd === 'status' ? ' [--facts]' : ''}`,
  );
  process.exit(2);
}
const asJson = rest.includes('--json');
const factsOnly = rest.includes('--facts');
if (factsOnly && cmd !== 'status' && cmd !== 'help') {
  console.error('ship: --facts is only valid with status');
  process.exit(2);
}

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
    // FOOTGUN: under allowFail, `ok` is forced true so the step does not abort the flow. It is NOT a
    // success verdict. For any pass/fail decision (receipt, exit code, "✓/✗"), read `rawOk` (the real
    // child exit). Trusting `.ok` on an allowFail step is a fail-open — it bit verify() (fixed 6b7913b).
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

publish: ${f.authorized ? 'CURRENT REQUEST AUTHORIZED' : 'PREPARE ONLY — current request has not authorized publication'}
freeze: ${f.frozen ? 'ON — ' + (f.why || '') : 'OFF'}

Subcommands:
  help       this text
  status     ship-status + truth summary (read-only)
  status --facts   disk/live/stage/freeze only (no agent NEXT)
  prepare    verify-source, honesty, foot-smoke, review summary (no CDN)
  cdn        upload foot CDN (needs current-request authorization + freeze OFF + lock)
  paste      CM6 footer paste (needs current-request authorization + freeze OFF + lock)
  verify     bin/dg truth --require-match
  run        prepare → cdn → paste → verify (full; current-request authorization + freeze OFF + lock)

Power: cdn/paste/run briefly switch system76-power → performance, then restore.
  Skip with DG_SHIP_NO_PERF=1 · restore override DG_SHIP_RESTORE_PROFILE=balanced

Typical:
  bin/dg ship status
  bin/dg ship prepare
  # only when the current user request explicitly authorizes this publication:
  export DEMIGOD_CURRENT_REQUEST_PUBLISH=1
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
    if (age >= -60 && age <= 15) truth = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    /* */
  }
  try {
    const p = path.join(BUSY, 'ship-status.json');
    const age = (Date.now() - fs.statSync(p).mtimeMs) / 1000;
    if (age >= -60 && age <= 20) ship = JSON.parse(fs.readFileSync(p, 'utf8'));
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
  let summary =
    truth?.summaryLine ||
    (truth
      ? `disk v${truth.foot?.ver} live v${truth.live?.footVer} freeze=${freeze.frozen ? 'ON' : 'OFF'} pass=${truth.pass}`
      : null);
  // While publish is unauthorized, disk≠live is prepare-state — not a release FAIL for operators/Q7.
  if (
    summary &&
    !freeze.authorized &&
    truth &&
    !truth.fullyShipped &&
    truth.pass === false &&
    /\bTRUTH\s+FAIL\b/i.test(summary)
  ) {
    summary = summary
      .replace(/\bTRUTH\s+FAIL\b/i, 'TRUTH PREPARE')
      .replace(/\s*$/, '') + ' · publish unauthorized (prepare-only)';
  }
  const next = freeze.frozen
    ? 'No ship — freeze holds (demand-first). Disk work OK.'
    : !freeze.authorized
      ? 'Prepare only — current request has not authorized publish.'
      : ship?.nextAction ||
        (truth?.fullyShipped ? 'already shipped' : 'bin/dg ship prepare → lock → run');
  const report = {
    ok: true,
    subcommand: 'status',
    at: new Date().toISOString(),
    freeze: { on: freeze.frozen, why: freeze.why, authorized: freeze.authorized },
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
    shipNextGate: ship?.shipped ? null : ship?.stage || ship?.status || null,
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
      nextGate: report.shipNextGate,
      shipped: Boolean(report.truth?.fullyShipped || ship?.shipped),
      driftExpected: report.truth?.driftExpected ?? null,
      facts: ship?.facts || null,
      // intentionally no agent NEXT — use bin/dg next-canon
    };
    if (asJson) console.log(JSON.stringify(facts));
    else {
      console.log(`# ship facts freeze=${facts.freeze.on ? 'ON' : 'OFF'} publish=${facts.freeze.authorized ? 'AUTHORIZED' : 'UNAUTHORIZED'}`);
      console.log(`  disk v${facts.diskVer} live v${facts.liveVer} stage=${facts.stage}`);
      console.log(`  shipped=${facts.shipped} driftExpected=${facts.driftExpected}`);
    }
    return 0;
  }
  if (asJson) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`# ship status freeze=${report.freeze.on ? 'ON' : 'OFF'} publish=${report.freeze.authorized ? 'AUTHORIZED' : 'UNAUTHORIZED'}`);
    console.log(`  truth: ${report.truth?.summary || '?'}`);
    console.log(`  ${report.shipNextGate ? 'next gate' : 'stage'}: ${report.shipNextGate || report.shipStage || '?'}`);
    console.log(`  next:  ${report.next}`);
    console.log(`  report: ${path.join(BUSY, 'ship-latest.json')}`);
  }
  // status is read-only success if truth ran; not "fully shipped"
  return report.truth ? 0 : 1;
}

function prepare() {
  const runEv = beginRun('ship-prepare', {
    scope: [
      'demigod-foot-core.js',
      'demigod-startup-atlas-web.js',
      'DEMIGOD-SF-STARTUP-MAP.json',
      'demigod-head-minimal.html',
      'demigod-head-styles.css',
      'demigod-footer-lite.html',
    ].map((file) => path.join(ROOT, file)),
  });
  const steps = [];
  // Blog SoR must match foot embed + head JSON-LD (bin/dg-blog sync)
  steps.push(run('blog-check', ['demigod-blog-sync.mjs', '--check']));
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
  // Clone-breaker edges + export contracts (poison: demigod-import-integrity.test.mjs)
  steps.push(run('import-integrity', ['demigod-import-integrity.mjs']));
  steps.push(run('foot-smoke', ['demigod-foot-smoke.mjs']));
  steps.push({
    ...run('truth', ['demigod-truth.mjs'], { allowFail: true }),
    observational: true,
  });
  steps.push(
    run('review', [
      'demigod-review.mjs', '--format', 'summary', '--fail-on', 'high', '--no-contract', '--files',
      'demigod-foot-core.js', 'demigod-head-minimal.html', 'demigod-head-styles.css', 'demigod-footer-lite.html',
    ]),
  );
  const ok = steps.filter((s) => s.label !== 'truth').every((s) => s.ok);
  const report = { at: new Date().toISOString(), ok, steps, freeze: freezeStatus() };
  sealRun(runEv, { pass: ok, summary: ok ? 'ship-prepare ok' : 'ship-prepare fail' });
  atomicWrite(
    path.join(BUSY, 'ship-prepare.json'),
    JSON.stringify(report, null, 2) + '\n',
    { mode: 0o600 },
  );
  if (asJson) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`# ship prepare ${ok ? 'OK' : 'FAIL'}`);
    for (const s of steps) {
      if (s.observational) {
        console.log(`  ${s.rawOk ? '✓' : '○'} ${s.label} (observational${s.rawOk ? '' : ' failure; non-blocking'})`);
      } else {
        console.log(`  ${s.ok ? '✓' : '✗'} ${s.label}`);
      }
    }
  }
  return ok ? 0 : 1;
}

function requireMutate(label) {
  assertNotFrozen(label);
  assertCanWriteFoot({ label });
}

function writeReceipt(phase, ok, note) {
  try {
    run(
      'ship-receipt',
      ['demigod-ship-receipt.mjs', 'write', '--phase', phase, '--ok', ok ? '1' : '0', '--note', note || phase],
      { allowFail: true, timeout: 15000 },
    );
  } catch {
    /* non-fatal */
  }
}

/** Boost system76-power to performance for mutate bursts; restore after. */
function withShipPerf(fn) {
  if (process.env.DG_SHIP_NO_PERF === '1') return fn();
  const prevPath = path.join(BUSY, 'ship-power-prev.json');
  let prev = 'balanced';
  try {
    const out = spawnSync('system76-power', ['profile'], { encoding: 'utf8', timeout: 8000 });
    const m = String(out.stdout || '').match(/Power Profile:\s*(\w+)/i);
    if (m) prev = m[1].toLowerCase();
  } catch {
    /* */
  }
  try {
    fs.mkdirSync(BUSY, { recursive: true });
    fs.writeFileSync(prevPath, JSON.stringify({ at: new Date().toISOString(), prev }, null, 2) + '\n');
  } catch {
    /* */
  }
  if (prev !== 'performance') {
    const b = spawnSync('system76-power', ['profile', 'performance'], {
      encoding: 'utf8',
      timeout: 15000,
    });
    if (!asJson) {
      console.log(
        b.status === 0 || /Power Profile/i.test(String(b.stdout || b.stderr || ''))
          ? '⚡ ship: performance profile (was ' + prev + ')'
          : '⚡ ship: could not set performance (continuing)',
      );
    }
  }
  try {
    return fn();
  } finally {
    const restore = process.env.DG_SHIP_RESTORE_PROFILE || prev || 'balanced';
    if (restore !== 'performance') {
      spawnSync('system76-power', ['profile', restore], { encoding: 'utf8', timeout: 15000 });
      if (!asJson) console.log('⚡ ship: restored power → ' + restore);
    }
    try {
      spawnSync('dg-notify', ['Ship power', 'restored ' + restore], {
        encoding: 'utf8',
        timeout: 5000,
      });
    } catch {
      /* */
    }
  }
}

function cdn() {
  requireMutate('ship-cdn');
  return withShipPerf(() => {
    // Fan-out blog SoR → foot embed + head LD before CDN upload
    const b = run('blog-sync', ['demigod-blog-sync.mjs'], { timeout: 60000 });
    if (!b.ok) {
      writeReceipt('cdn', false, 'blog-sync failed');
      if (asJson) console.log(JSON.stringify(b, null, 2));
      else console.log('✗ blog-sync\n' + b.out);
      return 1;
    }
    if (!asJson) console.log('✓ blog-sync');
    const r = run('foot-cdn', ['demigod-foot-cdn-publish.mjs'], { timeout: 300000 });
    writeReceipt('cdn', r.ok, r.ok ? 'cdn ok' : 'cdn failed');
    if (asJson) console.log(JSON.stringify(r, null, 2));
    else console.log(r.ok ? '✓ CDN publish' : '✗ CDN publish\n' + r.out);
    return r.ok ? 0 : 1;
  });
}

function paste() {
  requireMutate('ship-paste');
  return withShipPerf(() => {
    const r = run('cm6-paste', ['demigod-cm6-paste-publish.mjs'], { timeout: 300000 });
    writeReceipt('paste', r.ok, r.ok ? 'paste ok' : 'paste failed');
    if (asJson) console.log(JSON.stringify(r, null, 2));
    else console.log(r.ok ? '✓ CM6 paste' : '✗ CM6 paste\n' + r.out);
    return r.ok ? 0 : 1;
  });
}

function verify() {
  const r = run('truth-match', ['demigod-truth.mjs', '--require-match'], { allowFail: true });
  // also live-attest when available
  const a = run('live-attest', ['demigod-live-attest.mjs', '--json'], { allowFail: true, timeout: 60000 });
  // Use rawOk, NOT ok: run() forces ok=true under allowFail (so the process doesn't abort on a
  // verification miss), but the REAL child exit is in rawOk. Reading .ok here made post-publish
  // verify() always report success even when truth-match failed (disk≠live) or live-attest failed —
  // a fail-open that would tell the operator "verified" on an unverified/broken publish.
  writeReceipt('verify', r.rawOk && a.rawOk, r.rawOk ? 'verify+attest' : 'verify failed');
  if (asJson) console.log(JSON.stringify({ truth: r, attest: a }, null, 2));
  else {
    console.log(r.rawOk ? '✓ truth --require-match' : '✗ truth --require-match (disk≠live)');
    console.log(a.rawOk ? '✓ live-attest' : '✗ live-attest');
    if (!r.rawOk) console.log(r.out.slice(-500));
  }
  return r.rawOk && a.rawOk ? 0 : 1; // match the receipt: verified iff BOTH truth-match AND live-attest pass
}

function runAll() {
  requireMutate('ship-run');
  const ev = beginRun('ship-run', { scope: [path.join(ROOT, 'demigod-foot-core.js')] });
  // Single perf boost for full run (cdn/paste already wrap; avoid double toggle by disabling nested)
  process.env.DG_SHIP_NO_PERF = process.env.DG_SHIP_NO_PERF || '';
  const nested = process.env.DG_SHIP_NO_PERF;
  return withShipPerf(() => {
    process.env.DG_SHIP_NO_PERF = '1'; // nested cdn/paste skip re-boost
    try {
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
      try {
        spawnSync(
          'dg-notify',
          [code === 0 ? 'Ship OK' : 'Ship FAIL', code === 0 ? 'run complete' : 'see ship-run.json'],
          { timeout: 5000 },
        );
      } catch {
        /* */
      }
      return code;
    } finally {
      process.env.DG_SHIP_NO_PERF = nested;
    }
  });
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
