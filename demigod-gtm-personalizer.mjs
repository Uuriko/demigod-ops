#!/usr/bin/env node
/**
 * Lean GTM DM personalizer stub (internal tool).
 * Pulls honest board samples + basic templates. Outputs variants for targets.
 * YAGNI: bare min for DM prep. No bloat.
 * Usage: node demigod-gtm-personalizer.mjs --target=weave
 */

import fs from 'fs';

const targets = process.argv.find(a => a.startsWith('--target='))?.split('=')[1] || 'default';

let board;
try { board = JSON.parse(fs.readFileSync('demigod-board.json', 'utf8')); } catch { board = {roles:[]}; }

const samples = (board.roles || []).filter(r => r.sample).slice(0,2);
const pilots = (board.pilots || []).slice(0,1); // honest recent

const templates = {
  default: `Hi {{name}}, saw your work in {{area}}. We're matching SF startups to talent human-first (3 labeled samples now while pilots ship). 10% on hire only. Link: trydemigod.com`,
  weave: `Hi {{name}}, your design/eng leadership at formidable stands out. Demigod: warm human SF matches for startups (honest 3 samples, pending services). Curious about roles?`,
  pilot: `Hi {{name}}, following up on our pilot. Demigod: real human intros for SF startups (proof ledger + 90d focus). 10% only on hire. {{pilot_note}}`,
};

const tpl = templates[targets] || templates.default;
let pilotNote = '';
if (pilots.length && targets === 'pilot') pilotNote = `Recent pilot: ${pilots[0].brief || 'matching in progress'}.`;

console.log(`GTM Personalizer (lean, honest samples + pilots + meta hybrid proof): target=${targets}`);
samples.forEach((s,i) => {
  const msg = tpl.replace('{{name}}', s.title || 'there').replace('{{area}}', s.skills || 'tech').replace('{{pilot_note}}', pilotNote);
  console.log(`\nVariant ${i+1}:\n${msg}\n[Meta: We use Fable/Cursor/Grok hybrid for our ops — transparent human+AI, see CURSOR-ACTIVITY.md]`);
});
if (pilots.length) console.log(`\nPilot context: ${JSON.stringify(pilots[0]).slice(0,100)}...`);
console.log('\n(Use for DMs; log SENT-CONFIRMED. The Question: subs. Lean per GTM best practices + Fable research connections (meta as proof vs AI spam).)');
