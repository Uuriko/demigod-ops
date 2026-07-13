#!/usr/bin/env node
// Trust regression: ## loop-state claims in keep-going.md must match disk.
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
const kg = readFileSync('/home/potter/demigod-keep-going.md', 'utf8');
const block = (kg.split(/^## loop-state.*$/m)[1] || '').split(/^\*\*/m)[0];
const errs = [];
const get = k => (block.match(new RegExp(`- ${k}:\\s*(\\S+)`)) || [])[1] || '';
const claimed = get('foot_ver_disk').replace(/^v/, '');
const actual = (readFileSync('/home/potter/demigod-foot-core.js', 'utf8')
  .match(/__dgFootVer='(\d+)'/) || [])[1];
if (!block.trim()) errs.push('no ## loop-state block found');
if (claimed && claimed !== actual) errs.push(`foot_ver_disk claims v${claimed}, disk is v${actual}`);
if (!/- dm_freeze: OFF/.test(block)) errs.push('dm_freeze missing or not ON/OFF');
const sha = get('last_checkpoint');
if (sha && sha !== 'none' && !sha.startsWith('(')) {
  try { execSync(`git cat-file -e ${sha}`, { cwd: '/home/potter', stdio: 'ignore' }); }
  catch { errs.push(`last_checkpoint ${sha} not in git`); }
}
if (errs.length) { console.error('LOOP-STATE FAIL:\n- ' + errs.join('\n- ')); process.exit(1); }
console.log(`loop-state OK (v${actual} matches, dm_freeze ${get('dm_freeze')})`);
