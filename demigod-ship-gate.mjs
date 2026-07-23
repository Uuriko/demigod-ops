#!/usr/bin/env node
/**
 * Unified Demigod ship gate — one timeout-safe pipeline:
 * tabs → source → live → design snap → design audit → button quick → partnerships → wizard
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ROOT } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-SHIP-GATE.json');
const FAST = process.argv.includes('--fast');
const NO_PLAYTEST = process.argv.includes('--no-playtest');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function runStep(name, script, args = [], timeoutMs = 120000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const nodeArgs = args[0] === '--test' ? ['--test', path.join(ROOT, script)] : [path.join(ROOT, script), ...args];
    const child = spawn('node', nodeArgs, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d;
      process.stdout.write(d);
    });
    child.stderr.on('data', (d) => {
      stderr += d;
      process.stderr.write(d);
    });

    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 4000);
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        name,
        script,
        args,
        code: killed ? 124 : (code ?? 1),
        ok: !killed && code === 0,
        timedOut: killed,
        ms: Date.now() - started,
        stdout: stdout.slice(-4000),
        stderr: stderr.slice(-2000),
      });
    });
  });
}

async function tabCleanup() {
  const started = Date.now();
  try {
    const { closeExtraTabs } = await import('./cdp-close-tabs.mjs');
    const tabs = await closeExtraTabs();
    return { ok: true, ms: Date.now() - started, tabs };
  } catch (e) {
    return { ok: false, ms: Date.now() - started, error: String(e.message || e) };
  }
}

const STEPS = [
  { name: 'unit', script: 'demigod-live-lib.test.mjs', timeout: 45000, out: null },
  { name: 'submissions', script: 'demigod-submissions-lib.test.mjs', timeout: 45000, out: null, args: ['--test'] },
  // Honesty poison-tests (c458) — the publish gate must verify the honesty gates are still fail-capable,
  // not just that they pass now (a vacuous-green regression would pass the gate but slip fake proof live).
  { name: 'honesty-board', script: 'demigod-verify-board-honesty.test.mjs', timeout: 45000, out: null, args: ['--test'] },
  { name: 'honesty-demand', script: 'demigod-demand.test.mjs', timeout: 45000, out: null, args: ['--test'] },
  { name: 'honesty-scrub', script: 'demigod-board-publish.test.mjs', timeout: 45000, out: null, args: ['--test'] },
  { name: 'honesty-referrals', script: 'demigod-referrals.test.mjs', timeout: 45000, out: null, args: ['--test'] },
  { name: 'honesty-referrals-mint', script: 'demigod-referrals-mint.test.mjs', timeout: 30000, out: null, args: ['--test'] },
  { name: 'honesty-outbound-poison', script: 'demigod-outbound-poison.test.mjs', timeout: 45000, out: null, args: ['--test'] },
  // Matching cold-start honesty: readiness + pairs sample-by-default (not orphan unit-only)
  { name: 'honesty-matching-readiness', script: 'demigod-matching-readiness.test.mjs', timeout: 30000, out: null },
  { name: 'honesty-pairs-cli', script: 'demigod-pairs-cli-safety.test.mjs', timeout: 30000, out: null },
  { name: 'honesty-lead-sourcer', script: 'demigod-lead-sourcer.test.mjs', timeout: 30000, out: null, args: ['--test'] },
  { name: 'foot-smoke-poison', script: 'demigod-foot-smoke.test.mjs', timeout: 45000, out: null, args: ['--test'] },
  { name: 'grok-ask-selftest', script: 'demigod-grok-ask-selftest.mjs', timeout: 60000, out: null },
  { name: 'grok-out-contract', script: 'demigod-agent-dashboard.mjs', args: ['--selftest-grok-out'], timeout: 30000, out: null },
  { name: 'sor-pii-poison', script: 'demigod-verify-no-committable-sor.mjs', args: ['--self-test'], timeout: 30000, out: null },
  { name: 'source', script: 'demigod-verify-source.mjs', timeout: 45000, out: 'DEMIGOD-VERIFY-SOURCE.json' },
  { name: 'live', script: 'demigod-verify-live.mjs', timeout: 60000, out: 'DEMIGOD-VERIFY-LIVE.json' },
  { name: 'designSnap', script: 'demigod-design-snap.mjs', timeout: 90000, out: null },
  { name: 'designAudit', script: 'demigod-design-audit.mjs', args: ['--quick'], timeout: 150000, out: 'DEMIGOD-DESIGN-AUDIT.json', skip: FAST },
  { name: 'buttonQuick', script: 'demigod-button-audit.mjs', args: ['--quick'], timeout: 120000, out: 'DEMIGOD-BUTTON-AUDIT.json' },
  { name: 'partnerships', script: 'demigod-partnerships-playtest.mjs', timeout: 150000, out: 'DEMIGOD-PARTNERSHIPS-PLAYTEST.json', skip: NO_PLAYTEST },
  { name: 'wizard', script: 'demigod-wizard-playtest.mjs', timeout: 240000, out: 'DEMIGOD-WIZARD-PLAYTEST.json', skip: NO_PLAYTEST },
];

async function main() {
  const report = {
    at: new Date().toISOString(),
    fast: FAST,
    noPlaytest: NO_PLAYTEST,
    tabs: null,
    steps: [],
    artifacts: {},
    pass: {},
    ok: false,
  };

  console.log('\n=== Demigod ship gate ===\n');
  report.tabs = await tabCleanup();
  await sleep(800);

  for (const step of STEPS) {
    if (step.skip) {
      report.steps.push({ name: step.name, skipped: true });
      continue;
    }
    console.log(`\n--- ${step.name} (${step.script}) ---\n`);
    const result = await runStep(step.name, step.script, step.args || [], step.timeout);
    report.steps.push(result);
    if (step.out) {
      report.artifacts[step.name] = readJson(path.join(ROOT, step.out));
    }
    if (!result.ok) {
      console.error(`\n✗ ${step.name} failed (code ${result.code}${result.timedOut ? ', timed out' : ''})\n`);
    } else {
      console.log(`\n✓ ${step.name} (${result.ms}ms)\n`);
    }
    await sleep(600);
  }

  const art = report.artifacts;
  report.pass = {
    tabs: report.tabs?.ok !== false,
    allSteps: report.steps.every((step) => step.skipped || step.ok === true),
    unit: report.steps.find((s) => s.name === 'unit')?.ok === true,
    submissions: report.steps.find((s) => s.name === 'submissions')?.ok === true,
    source: report.steps.find((s) => s.name === 'source')?.ok === true,
    live: report.steps.find((s) => s.name === 'live')?.ok === true,
    designSnap: report.steps.find((s) => s.name === 'designSnap')?.ok === true,
    designAudit: FAST || report.steps.find((s) => s.name === 'designAudit')?.ok === true,
    buttonQuick: report.steps.find((s) => s.name === 'buttonQuick')?.ok === true,
    partnerships: NO_PLAYTEST || art.partnerships?.ok === true,
    wizard: NO_PLAYTEST || art.wizard?.ok === true,
    barePartnerships404: art.buttonQuick?.bareUrls?.['/partnerships']?.is404 === true,
    bareLegal404: art.buttonQuick?.bareUrls?.['/legal']?.is404 === true,
    brokenButtons: (art.buttonQuick?.summary?.totalBroken ?? 0) > 0,
    offPalette: (art.designAudit?.summary?.blueRed ?? 0) > 0,
  };

  report.ok =
    report.pass.tabs &&
    report.pass.allSteps &&
    report.pass.unit &&
    report.pass.submissions &&
    report.pass.source &&
    report.pass.live &&
    report.pass.designSnap &&
    report.pass.designAudit &&
    report.pass.buttonQuick &&
    report.pass.partnerships &&
    report.pass.wizard &&
    !report.pass.barePartnerships404 &&
    !report.pass.bareLegal404 &&
    !report.pass.brokenButtons &&
    !report.pass.offPalette;

  report.summary = {
    failedSteps: report.steps.filter((s) => s.ok === false).map((s) => s.name),
    totalMs: report.steps.reduce((n, s) => n + (s.ms || 0), 0) + (report.tabs?.ms || 0),
  };

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log('\n=== Ship gate result ===');
  console.log(JSON.stringify({ ok: report.ok, pass: report.pass, failed: report.summary.failedSteps, out: OUT }));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), ok: false, crash: String(e.message || e) }, null, 2));
  process.exit(1);
});
