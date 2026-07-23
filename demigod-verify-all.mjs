#!/usr/bin/env node
/** Run all Demigod verifications: source → live HTTP → optional CDP playtest. */
import { spawn } from 'child_process';
import path from 'path';

const ROOT = '/home/potter';
const browser = process.argv.includes('--browser');
const wizard = process.argv.includes('--wizard') || browser;
const ship = process.argv.includes('--ship');

if (ship || wizard) {
  const args = ['demigod-ship-gate.mjs'];
  if (browser && !wizard) args.push('--fast');
  const child = spawn('node', args, { cwd: ROOT, stdio: 'inherit' });
  child.on('close', (code) => process.exit(code ?? 1));
} else {
  function run(script, args = []) {
    return new Promise((resolve) => {
      const child = spawn('node', [path.join(ROOT, script), ...args], {
        cwd: ROOT,
        stdio: 'inherit',
      });
      child.on('close', (code) => resolve(code ?? 1));
    });
  }

  const steps = [
    ['demigod-verify-board-honesty.mjs'] ,
    ['demigod-verify-loop-state.mjs'],
    ['demigod-live-lib.test.mjs'],
    ['demigod-board-lib.test.mjs'],
    // Honesty poison-tests (c458 vein) — a poison-test that no gate runs locks nothing. These assert the
    // board-honesty gate, the anti-fake-DM attestation gate, and the public-board scrub stay fail-capable.
    ['demigod-verify-board-honesty.test.mjs'],
    ['demigod-demand.test.mjs'],
    ['demigod-board-publish.test.mjs'],
    ['demigod-foot-smoke.test.mjs'], // #40 — locks foot-smoke's parse+boot fail-capability (outage class)
    // Free-text scrubPII poison (Claude/Grok collab): identity links, phones, addresses — fail-capable
    ['demigod-submissions-lib.test.mjs'],
    ['demigod-outbound-poison.test.mjs'],
    // SF startup directory: YC-public merge + host dedupe + atlas honesty (not orphan unit-only)
    ['demigod-startup-map-data.test.mjs'],
    ['demigod-startup-atlas-web.test.mjs'],
    // Jobs enrich slug honesty — domain-only slugs (blocks Camp/Cedar name→wrong ATS)
    ['demigod-startup-jobs-enrich.mjs', ['--selftest']],
    // Live smoke readiness polls through transient CDP evaluate timeouts
    ['demigod-agent-smoke.test.mjs'],
    // grok-ask transport poison (Broken-pipe retry + context) — not orphaned manual-only
    ['demigod-grok-ask-selftest.mjs'],
    // grok-out contract projection (bold **VERDICT:** etc.) — transport=ok ≠ incomplete
    ['demigod-agent-dashboard.mjs', ['--selftest-grok-out']],
    ['demigod-verify-source.mjs'],

    ['demigod-verify-live.mjs'],
    ['demigod-verify-receipt.mjs'],
    ['demigod-verify-signal-theater.mjs'],
    ['demigod-foot-smoke.mjs'],
  ];
  if (browser) steps.push(['demigod-playtest-review.mjs']);

  let failed = 0;
  for (const [script, args = []] of steps) {
    const code = await run(script, args);
    if (code !== 0) failed++;
  }

  console.log(JSON.stringify({ pass: failed === 0, failed, browser }));
  process.exit(failed ? 1 : 0);
}