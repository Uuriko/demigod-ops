#!/usr/bin/env node
/**
 * Demigod Intro Generator (automation for human review)
 * Generates personalized intro email/text from match/role/cand data.
 * Human reviews/edits before send.
 *
 * Usage: node demigod-intro-generator.mjs --role-id=... --cand-id=...
 */

import fs from 'fs';
import { loadBoard } from './demigod-submissions-lib.mjs';

function main() {
  const args = process.argv.slice(2);
  const roleId = (args.find(a=>a.startsWith('--role-id='))||'').split('=')[1];
  const candId = (args.find(a=>a.startsWith('--cand-id='))||'').split('=')[1];
  const board = loadBoard();
  const role = (board.roles||[]).find(r=>r.id===roleId) || {title:'Role', skills:'skills', outcome90d:'90d outcome'};
  const cand = (board.candidates||[]).find(c=>c.id===candId) || {summary:'Cand summary', skills:'skills'};
  const intro = `Subject: Warm intro: ${role.title} <> ${cand.summary.slice(0,30)}

Hi both,

Demigod matched you based on strong overlap in ${role.skills} + ${cand.skills}, stage fit, and 90d alignment (${role.outcome90d}).

Quick why mutual: [human note here].

Worth a 15min chat? Reply or let me know.

Best,
Demigod (human-curated)`;
  console.log(intro);
  fs.writeFileSync('/tmp/intro-draft.txt', intro);
  console.log('Draft saved to /tmp/intro-draft.txt (human review before send)');
}

main();