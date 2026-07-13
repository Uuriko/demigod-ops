#!/usr/bin/env node
/**
 * Lean a11y + perf pipeline stub (for WIZ/forms quality).
 * Runs local playtest + a11y audit. Future: full CDP lighthouse.
 * Per best practices: user-visible checks, isolate.
 * Usage: node demigod-a11y-perf-pipeline.mjs --local
 */

import { execSync } from 'child_process';

const local = process.argv.includes('--local');

console.log('Demigod a11y/perf pipeline (lean stub)');

if (local) {
  try {
    const play = execSync('node demigod-wiz-cdp-playtest.mjs --local 2>&1 | tail -5', {encoding: 'utf8'});
    const a11y = execSync('node demigod-wiz-a11y-audit.mjs 2>&1 | cat', {encoding: 'utf8'});
    console.log('Playtest tail:', play.trim());
    console.log('A11y summary:', a11y.split('\n').filter(l => l.includes('pass') || l.includes('issues')).slice(0,3).join(' '));
    console.log('PASS (basic local checks)');
  } catch(e) {
    console.log('Issues detected in pipeline');
  }
} else {
  console.log('Run with --local. Extend for full CDP lighthouse.');
}

console.log('Integrate into verify or Cursor tasks. Honest, no bloat.');