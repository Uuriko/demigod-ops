#!/usr/bin/env node
/** Copy audit → SuperGrok Heavy → COPY SPEC for Cursor. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-COPY-SPEC.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-COPY.json');
const BRIEF = fs.readFileSync(path.join(ROOT, 'HEAVY-COPY-BRIEF.md'), 'utf8');

const PROMPT = `SuperGrok Heavy — COPY FIX for trydemigod.com

John wants the website copy fixed. You are the copy strategist. Local Cursor agent will implement your exact strings in demigod-foot-core.js + demigod-head-minimal.html.

${BRIEF}

Reply with === COPY SPEC FOR CURSOR === block. Be blunt.`;

async function collect(page, minLen = 1500) {
  let text = '';
  for (let i = 0; i < 24; i++) {
    const reply = await collectGrokReply(page, { waitMs: 60000, minGrowth: 100 });
    text = reply.text || text;
    const tail = text.slice(-15000);
    const busy = reply.thinking || /thinking|Finalizing/i.test(tail);
    const hasSpec = /=== COPY SPEC FOR CURSOR ===/i.test(text);
    if (text && !busy && hasSpec && tail.length >= minLen) break;
    if (text && !busy && tail.length >= minLen * 2 && i >= 10) break;
    wlog(`heavy copy poll ${i + 1}: len=${tail.length} busy=${busy} spec=${hasSpec}`);
  }
  return text;
}

async function main() {
  wlog('=== HEAVY COPY PROMPT START ===');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) throw new Error('no grok tab');
  await page.bringToFront();
  await sendToGrok(page, PROMPT);
  const text = await collect(page);
  await browser.disconnect();
  const hasSpec = /COPY SPEC FOR CURSOR/i.test(text);
  fs.writeFileSync(OUT, `# SuperGrok Heavy — Copy Spec\n\n_${new Date().toISOString()}_\n\n${text}\n`);
  fs.writeFileSync(OUT_JSON, JSON.stringify({ at: new Date().toISOString(), chars: text.length, hasSpec, path: OUT }, null, 2));
  console.log(JSON.stringify({ chars: text.length, hasSpec, path: OUT }));
  wlog('=== HEAVY COPY PROMPT END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });