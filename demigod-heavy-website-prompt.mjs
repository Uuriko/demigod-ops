#!/usr/bin/env node
/** Report website + GitHub CDN state to SuperGrok Heavy → collect Cursor prompt. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-CURSOR-WEBSITE-PROMPT.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-WEBSITE-PROMPT.json');
const SENT = path.join(ROOT, 'HEAVY-CURSOR-WEBSITE-SENT.txt');
const BRIEF = path.join(ROOT, 'HEAVY-CURSOR-WEBSITE-BRIEF.md');

const PROMPT = fs.readFileSync(SENT, 'utf8')
  + '\n\n---\n\n'
  + fs.readFileSync(BRIEF, 'utf8').slice(0, 6000);

async function collectHeavyReply(page, minLen = 1200) {
  let reply = { text: '', thinking: true };
  for (let i = 0; i < 24; i++) {
    reply = await collectGrokReply(page, { waitMs: 55000, minGrowth: 100 });
    const tail = (reply.text || '').slice(-14000);
    const stillBusy = reply.thinking || /Finalizing|thinking|Agents thinking|before limit is gone/i.test(tail);
    if (reply.text && !stillBusy && tail.length >= minLen) break;
    if (reply.text && tail.length >= minLen * 2 && i >= 10) break;
    wlog(`heavy website-prompt poll ${i + 1}: len=${tail.length} thinking=${stillBusy}`);
  }
  return reply.text || '';
}

async function main() {
  wlog('=== HEAVY WEBSITE PROMPT REQUEST START ===');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) {
    await browser.disconnect();
    throw new Error('no grok tab — open SuperGrok Heavy on grok.com');
  }
  await page.bringToFront();
  wlog(`sending ${PROMPT.length} chars to ${page.url()}`);
  await sendToGrok(page, PROMPT);
  const text = await collectHeavyReply(page, 1200);
  await browser.disconnect();

  const limited = /before limit is gone/i.test(text)
    || (/Upgrade to SuperGrok/i.test(text) && text.length < 2000);
  const hasCursorBlock = /PROMPT FOR CURSOR AGENT|=== PROMPT FOR CURSOR/i.test(text);

  fs.writeFileSync(OUT, `# SuperGrok Heavy — Website Cursor Prompt\n\n_Date: ${new Date().toISOString()}_\n_Limited: ${limited}_\n_HasCursorBlock: ${hasCursorBlock}_\n\n${text}\n`);
  const out = { at: new Date().toISOString(), chars: text.length, limited, hasCursorBlock, path: OUT };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog(`=== HEAVY WEBSITE PROMPT REQUEST END chars=${text.length} ===`);
}

main().catch((e) => { console.error(e); process.exit(1); });