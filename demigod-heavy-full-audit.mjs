#!/usr/bin/env node
/** Send full website audit to SuperGrok Heavy. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-FULL-AUDIT-REPLY.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-FULL-AUDIT.json');
const BRIEF = fs.readFileSync(path.join(ROOT, 'HEAVY-FULL-AUDIT-BRIEF.md'), 'utf8');
const COPY_SUMMARY = fs.existsSync(path.join(ROOT, 'HEAVY-COPY-INVENTORY.md'))
  ? '\n\n## Prior copy audit (reference)\nSee HEAVY-COPY-INVENTORY.md — v23 copy shipped; static mythic/subscription/footer bloat still in HTML source.\n'
  : '';

const PROMPT = `SuperGrok Heavy — FULL WEBSITE AUDIT for trydemigod.com

John wants a comprehensive audit: old code, unused assets, hidden DOM, forms, meta drift, repo bloat, launch readiness.

Local agent ran demigod-full-audit.mjs + npm run demigod:verify:all (PASS). MCP scripts gone. foot-core v23 live on catbox.

${BRIEF}${COPY_SUMMARY}

Machine JSON: DEMIGOD-FULL-AUDIT.json · DEMIGOD-SCRIPT-CATEGORIES.json

Reply with:
=== FULL AUDIT VERDICT FOR CURSOR ===
(shipNow, blockers, deleteFromCanvas numbered, deleteFromRepo numbered, keepPatches, unusedScripts)

Then:
=== PROMPT FOR CURSOR AGENT ===
(max 12 steps — one session scope)

Be blunt. Prioritize launch vs perfection.`;

async function collect(page, minLen = 1500) {
  let text = '';
  for (let i = 0; i < 28; i++) {
    const reply = await collectGrokReply(page, { waitMs: 55000, minGrowth: 80 });
    text = reply.text || text;
    const tail = text.slice(-18000);
    const busy = reply.thinking || /thinking|Finalizing/i.test(tail);
    if (text && !busy && /FULL AUDIT VERDICT FOR CURSOR/i.test(text) && tail.length >= minLen) break;
    wlog(`heavy full audit poll ${i + 1}: len=${tail.length} busy=${busy}`);
  }
  return text;
}

async function main() {
  wlog('=== HEAVY FULL AUDIT DISPATCH ===');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) throw new Error('no grok tab');
  await page.bringToFront();
  await sendToGrok(page, PROMPT);
  const text = await collect(page);
  await browser.disconnect();
  const hasVerdict = /FULL AUDIT VERDICT FOR CURSOR/i.test(text);
  fs.writeFileSync(OUT, `# SuperGrok Heavy — Full Audit Reply\n\n_${new Date().toISOString()}_\n\n${text}\n`);
  fs.writeFileSync(OUT_JSON, JSON.stringify({ at: new Date().toISOString(), chars: text.length, hasVerdict, path: OUT }, null, 2));
  console.log(JSON.stringify({ chars: text.length, hasVerdict, path: OUT }));
  wlog('=== HEAVY FULL AUDIT DISPATCH END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });