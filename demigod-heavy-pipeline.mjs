#!/usr/bin/env node
/** Submissions pipeline plan → SuperGrok Heavy (no Tally, no game). */
import fs from 'fs';
import path from 'path';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-PIPELINE-PLAN.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-PIPELINE.json');
const BRIEF = path.join(ROOT, 'HEAVY-PIPELINE-BRIEF.md');

async function collect(page, minLen = 4000) {
  let text = '';
  for (let i = 0; i < 28; i++) {
    const reply = await collectGrokReply(page, { waitMs: 60000, minGrowth: 120 });
    text = reply.text || text;
    const tail = text.slice(-25000);
    const busy = reply.thinking || /thinking|Finalizing/i.test(tail);
    const hasPrompt = /=== PROMPT FOR CURSOR AGENT ===/i.test(text);
    const hasArch = /PIPELINE ARCHITECTURE/i.test(text);
    if (text && !busy && hasPrompt && hasArch && tail.length >= minLen) break;
    wlog(`heavy pipeline poll ${i + 1}: len=${tail.length} busy=${busy}`);
  }
  return text;
}

async function main() {
  const PROMPT = `SuperGrok Heavy — SUBMISSIONS PIPELINE + FEATURED BOARD for trydemigod.com.

CRITICAL: We do NOT use Tally. Native Webflow forms only. No eat-the-sounds game.

${fs.readFileSync(BRIEF, 'utf8')}`;

  wlog('=== HEAVY PIPELINE START ===');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) throw new Error('no grok tab');
  await page.bringToFront();
  await sendToGrok(page, PROMPT);
  const text = await collect(page);
  await browser.disconnect();

  const hasPrompt = /=== PROMPT FOR CURSOR AGENT ===/i.test(text);
  fs.writeFileSync(OUT, `# SuperGrok Heavy — Pipeline Plan\n\n_${new Date().toISOString()}_\n\n${text}\n`);
  fs.writeFileSync(OUT_JSON, JSON.stringify({ at: new Date().toISOString(), chars: text.length, hasPrompt, path: OUT }, null, 2));
  console.log(JSON.stringify({ chars: text.length, hasPrompt, path: OUT }));
  wlog('=== HEAVY PIPELINE END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });