#!/usr/bin/env node
/**
 * Lean proof visualizer stub (internal GTM tool).
 * Generates simple text/JSON "assets" from honest board/pilots for DMs/pilots.
 * YAGNI: bare min, no bloat. Extend later with real visuals.
 * Usage: node demigod-proof-visualizer-stub.mjs --type=ledger or --pilot
 */

import fs from 'fs';

const type = process.argv.find(a => a.startsWith('--type='))?.split('=')[1] || 'ledger';
let board;
try { board = JSON.parse(fs.readFileSync('demigod-board.json', 'utf8')); } catch { board = {roles:[], pilots:[]}; }

console.log(`Proof Visualizer Stub (lean, honest data): type=${type}`);

if (type === 'ledger') {
  const samples = (board.roles || []).filter(r => r.sample);
  console.log('Sample Ledger Proof (for DMs):');
  samples.forEach(r => console.log(`- ${r.title} | ${r.stageType} | ${r.skills} | ${r.outcome}`));
  console.log('\n(Real ledger will show live when data arrives. Use in outreach.)');
} else if (type === 'pilot') {
  const p = (board.pilots || [])[0] || {brief: 'N/A'};
  console.log(`Pilot Proof: ${p.brief || 'matching active'} | intros:${p.intros || 0} | status:${p.status || 'new'}`);
  console.log('90d note: Track outcomes manually pending services.');
}

console.log('\n(The Question: helps subs/proof. Honest pending.)');