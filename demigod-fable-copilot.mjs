#!/usr/bin/env node
/**
 * Fable/Cursor recruiting copilot stub (meta tool + proof).
 * Generates DM variants or plans using board + research angles (from COMPETITOR-ANALYSIS).
 * Unexpected connection: our hybrid ops as differentiator in GTM.
 * Usage: node demigod-fable-copilot.mjs --target=weave --type=dm
 */

import fs from 'fs';

const target = process.argv.find(a => a.startsWith('--target='))?.split('=')[1] || 'default';
const type = process.argv.find(a => a.startsWith('--type='))?.split('=')[1] || 'dm';

let board;
try { board = JSON.parse(fs.readFileSync('demigod-board.json', 'utf8')); } catch { board = {roles:[]}; }

const samples = (board.roles || []).filter(r => r.sample).slice(0,1);
const researchAngle = target === 'weave' ? 'vs AI volume spam (Wellfound etc.)' : 'human+AI hybrid proof';

console.log(`Fable/Cursor copilot (meta hybrid proof + research): target=${target} type=${type}`);

if (type === 'dm') {
  samples.forEach(s => {
    console.log(`Hi ${s.title || 'there'}, ... Demigod human SF matches (honest 3 samples). We use Fable/Cursor/Grok for our ops — transparent hybrid, not black-box AI. ${researchAngle}. Link: trydemigod.com`);
  });
} else {
  console.log('Plan stub: use Fable research for GTM angle, Cursor to impl copilot UI.');
}

console.log('\n(Lean per Fable research: meta as diff. Update CURSOR-ACTIVITY. The Question: subs.)');