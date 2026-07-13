#!/usr/bin/env node
/**
 * demigod-trust-regression.mjs
 * Temp break a key fn (e.g. 90day inject or showStep vis), run verify+playtest, assert fail, restore.
 * Use to prove tests catch regressions. Run: node demigod-trust-regression.mjs
 */
import fs from 'fs';
import { execSync } from 'child_process';

const FOOT = 'demigod-foot-core.js';
const orig = fs.readFileSync(FOOT, 'utf8');
let broken = false;

function run(cmd) {
  try { return execSync(cmd, {encoding:'utf8', stdio:'pipe'}); } catch(e){ return e.stdout + e.stderr; }
}

try {
  // Break 90day visibility/required (P0 for forms)
  const bad = orig.replace(/name="90day-outcome"/g, 'name="90day-broken"');
  fs.writeFileSync(FOOT, bad);
  broken = true;
  console.log('Broke 90day name...');

  const v = run('npm run demigod:verify:source 2>&1');
  const p = run('timeout 15s node demigod-wiz-cdp-playtest.mjs --local 2>&1 || true');
  const fail = !v.includes('"pass":true') || /90day/.test(p) && p.includes('vis":0');
  console.log('Regression caught?', fail || 'partial (source may still pass if no 90day check)');
  if (!fail) console.log('WARN: verify did not catch the break - enhance checks.');

} finally {
  if (broken) fs.writeFileSync(FOOT, orig);
  console.log('Restored.');
  const post = run('npm run demigod:verify:source 2>&1');
  console.log('Post restore pass:', post.includes('"pass":true'));
}
