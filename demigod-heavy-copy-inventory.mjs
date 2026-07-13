#!/usr/bin/env node
/** Send full copy inventory to SuperGrok Heavy for audit + delete list. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-COPY-AUDIT-REPLY.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-COPY-AUDIT.json');
const INVENTORY = fs.readFileSync(path.join(ROOT, 'HEAVY-COPY-INVENTORY.md'), 'utf8');

const PROMPT = `SuperGrok Heavy — FULL COPY AUDIT for trydemigod.com

John needs a comprehensive copy review. Local agent already shipped foot-core v23 (Heavy copy spec). Static Webflow HTML still leaks mythic/legacy strings hidden by JS.

Read the full inventory below. Do NOT re-research competitors unless needed for rewrites.

${INVENTORY}

Reply with:
=== COPY AUDIT FOR CURSOR ===
(keep / rewrite / deleteFromCanvas / metaFix)

Then optional:
=== PROMPT FOR CURSOR AGENT ===
(max 12 steps for Webflow canvas DELETE pass)

Be blunt. Number every delete item.`;

async function collect(page, minLen = 1200) {
  let text = '';
  for (let i = 0; i < 24; i++) {
    const reply = await collectGrokReply(page, { waitMs: 55000, minGrowth: 80 });
    text = reply.text || text;
    const tail = text.slice(-16000);
    const busy = reply.thinking || /thinking|Finalizing/i.test(tail);
    if (text && !busy && /COPY AUDIT FOR CURSOR/i.test(text) && tail.length >= minLen) break;
    wlog(`heavy copy audit poll ${i + 1}: len=${tail.length} busy=${busy}`);
  }
  return text;
}

async function main() {
  wlog('=== HEAVY COPY INVENTORY DISPATCH ===');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) throw new Error('no grok tab');
  await page.bringToFront();
  await sendToGrok(page, PROMPT);
  const text = await collect(page);
  await browser.disconnect();
  const hasAudit = /COPY AUDIT FOR CURSOR/i.test(text);
  fs.writeFileSync(OUT, `# SuperGrok Heavy — Copy Audit Reply\n\n_${new Date().toISOString()}_\n\n${text}\n`);
  fs.writeFileSync(OUT_JSON, JSON.stringify({ at: new Date().toISOString(), chars: text.length, hasAudit, path: OUT }, null, 2));
  console.log(JSON.stringify({ chars: text.length, hasAudit, path: OUT }));
  wlog('=== HEAVY COPY INVENTORY DISPATCH END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });