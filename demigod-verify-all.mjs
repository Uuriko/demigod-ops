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
    ['demigod-verify-source.mjs'],
    ['demigod-verify-live.mjs'],
    ['demigod-verify-receipt.mjs'],
    ['demigod-verify-signal-theater.mjs'],
    ['demigod-foot-smoke.mjs'],
  ];
  if (browser) steps.push(['demigod-playtest-review.mjs']);

  let failed = 0;
  for (const [script] of steps) {
    const code = await run(script);
    if (code !== 0) failed++;
  }

  console.log(JSON.stringify({ pass: failed === 0, failed, browser }));
  process.exit(failed ? 1 : 0);
}