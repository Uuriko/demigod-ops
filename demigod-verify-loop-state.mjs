#!/usr/bin/env node
/**
 * demigod-verify-loop-state — gate: keep-going.md ## loop-state matches disk
 *
 *   node demigod-verify-loop-state.mjs
 *   node demigod-verify-loop-state.mjs --restamp   # rewrite foot_ver_disk to disk
 *
 * Prevents agents claiming a foot version / green state that disk does not have.
 * Compares loop-state block fields (foot_ver_disk, etc.) to demigod-foot-core.js.
 * Craft loops bump foot often; --restamp (or DEMIGOD_LOOP_STATE_RESTAMP=1) heals the claim.
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
const KG = '/home/potter/demigod-keep-going.md';
const loopArgs = process.argv.slice(2);
const LOOP_FLAGS = new Set(['--restamp', '--help', '-h']);
const unknownLoop = loopArgs.find((a) => !LOOP_FLAGS.has(a));
if (unknownLoop) {
  console.error(
    `loop-state: unknown argument ${unknownLoop} — try: node demigod-verify-loop-state.mjs [--restamp]`,
  );
  process.exit(2);
}
if (loopArgs.includes('--help') || loopArgs.includes('-h')) {
  console.log(`demigod-verify-loop-state — gate: keep-going.md ## loop-state matches disk

Usage: node demigod-verify-loop-state.mjs [--restamp]`);
  process.exit(0);
}
const restamp =
  loopArgs.includes('--restamp') || process.env.DEMIGOD_LOOP_STATE_RESTAMP === '1';
let kg = readFileSync(KG, 'utf8');
const actual = (readFileSync('/home/potter/demigod-foot-core.js', 'utf8')
  .match(/__dgFootVer='(\d+)'/) || [])[1];
if (restamp && actual) {
  if (!/^## loop-state/m.test(kg)) {
    console.error('LOOP-STATE FAIL:\n- no ## loop-state block found');
    process.exit(1);
  }
  if (/- foot_ver_disk:\s*\S+/m.test(kg)) {
    kg = kg.replace(/(- foot_ver_disk:\s*)v?\d+/m, `$1v${actual}`);
  } else {
    kg = kg.replace(/^(## loop-state\s*\n)/m, `$1- foot_ver_disk: v${actual}\n`);
  }
  writeFileSync(KG, kg);
}
const block = (kg.split(/^## loop-state.*$/m)[1] || '').split(/^\*\*/m)[0];
const errs = [];
const get = k => (block.match(new RegExp(`- ${k}:\\s*(\\S+)`)) || [])[1] || '';
const claimed = get('foot_ver_disk').replace(/^v/, '');
if (!block.trim()) errs.push('no ## loop-state block found');
// foot_ver_disk is this gate's whole point — a missing claim must FAIL, not silently skip the drift
// check (a block present-but-lacking the line used to pass vacuously via the old `claimed &&` guard).
if (!claimed) errs.push('foot_ver_disk missing from loop-state block');
else if (claimed !== actual) errs.push(`foot_ver_disk claims v${claimed}, disk is v${actual}`);
if (!/- dm_freeze:\s*(ON|OFF)/.test(block)) errs.push('dm_freeze missing or not ON/OFF');
const sha = get('last_checkpoint');
if (sha && sha !== 'none' && !sha.startsWith('(')) {
  try { execSync(`git cat-file -e ${sha}`, { cwd: '/home/potter', stdio: 'ignore' }); }
  catch { errs.push(`last_checkpoint ${sha} not in git`); }
}
if (errs.length) { console.error('LOOP-STATE FAIL:\n- ' + errs.join('\n- ')); process.exit(1); }
console.log(
  `loop-state OK (v${actual} matches, dm_freeze ${get('dm_freeze')}${restamp ? ', restamped' : ''})`,
);
