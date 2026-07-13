#!/usr/bin/env node
/** Fresh Grok chat — condensed research digest → Heavy ACK + refine */
import fs from 'fs';
import path from 'path';
import { connectBrowser, sendToGrok, collectGrokReply, sleep } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const DIGEST = path.join(ROOT, 'HEAVY-COMPETITORS-LOCAL-RESEARCH.md');
const OUT = path.join(ROOT, 'HEAVY-COMPETITORS-FEATURES-REPLY.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-COMPETITORS-HANDOFF.json');

const PROMPT = `SuperGrok Heavy — ACK + REFINE competitor research for Demigod.

Local Grok researched competitors (web fetch June 30) and drafted sections A–F below. **Your job:**
1. ACK in 2 sentences
2. CORRECT anything wrong (especially J&J now at 10% — verify)
3. ADD 2 competitors we missed
4. RE-RANK the feature backlog for a solo founder with foot-core v62
5. One blunt paragraph: what to build Monday vs what to stop

Do NOT repeat the digest. Add net-new insight. Tables OK. Min 2000 chars.

---

${fs.readFileSync(DIGEST, 'utf8')}`;

async function main() {
  wlog('=== HEAVY COMPETITORS FRESH START ===');
  const browser = await connectBrowser();
  const page = (await browser.pages()).find((p) => p.url().includes('grok.com')) || (await browser.newPage());
  await page.goto('https://grok.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
  await page.bringToFront();
  wlog(`sending ${PROMPT.length} chars to fresh chat`);
  await sendToGrok(page, PROMPT);

  let text = '';
  for (let i = 0; i < 30; i++) {
    const reply = await collectGrokReply(page, { waitMs: 40000, minGrowth: 150 });
    if (reply.thinking) continue;
    text = reply.text || text;
    const ok = text.length > 1800 && !/Local Grok researched competitors.*A\. Competitor/i.test(text.slice(0, 500));
    if (ok && !reply.stale) break;
    wlog(`poll ${i + 1}: len=${text.length}`);
  }
  await browser.disconnect();

  const limited = /Upgrade to SuperGrok|unable to finish/i.test(text);
  const body = limited && text.length < 500
    ? `${text}\n\n---\n_Note: Heavy hit limit. Local research digest remains canonical: HEAVY-COMPETITORS-LOCAL-RESEARCH.md_\n`
    : text;
  fs.writeFileSync(
    OUT,
    `# SuperGrok Heavy — Competitors + Features Reply\n\n_Date: ${new Date().toISOString()}_\n_Limited: ${limited}_\n_Chars: ${body.length}_\n\n${body}\n`,
  );
  const out = { at: new Date().toISOString(), sentChars: PROMPT.length, replyChars: body.length, limited, digest: DIGEST, reply: OUT };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== HEAVY COMPETITORS FRESH END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });