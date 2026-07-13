#!/usr/bin/env node
/** Site architecture report → SuperGrok Heavy */
import fs from 'fs';
import path from 'path';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const REPORT = path.join(ROOT, 'HEAVY-SITE-ARCHITECTURE-REPORT.md');
const OUT = path.join(ROOT, 'HEAVY-SITE-ARCHITECTURE-REPLY.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-ARCHITECTURE-HANDOFF.json');
const SENT = path.join(ROOT, 'HEAVY-SITE-ARCHITECTURE-SENT.txt');

async function main() {
  const report = fs.readFileSync(REPORT, 'utf8');
  const PROMPT = `SuperGrok Heavy — DEMIGOD SITE ARCHITECTURE HANDOFF

John asked Local Grok to map **every line and detail** of how trydemigod.com is built. Local Grok produced a full technical report (below). **Sync on this.** Scope: Demigod only — ignore Eat the Sounds game.

**Your job:**
1. ACK the architecture in 3 sentences
2. GAP ANALYSIS — what's fragile / over-patched / not truly shippable
3. PRIORITIZED NEXT 10 build tasks (tables, not essays)
4. RISKS — CDN, sync loader, wizard+Turnstile, partner API form, Designer drift
5. One paragraph: should legal/partners stay JS-injected or move to Webflow pages?

---

${report}`;

  wlog('=== HEAVY ARCHITECTURE HANDOFF START ===');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) {
    await browser.disconnect();
    throw new Error('no grok tab — open SuperGrok Heavy on grok.com in CDP Chrome');
  }
  await page.bringToFront();
  fs.writeFileSync(SENT, `${new Date().toISOString()}\n${PROMPT.length} chars\n`);
  wlog(`sending ${PROMPT.length} chars`);
  await sendToGrok(page, PROMPT);

  let text = '';
  for (let i = 0; i < 40; i++) {
    const reply = await collectGrokReply(page, { waitMs: 45000, minGrowth: 200 });
    if (reply.thinking) {
      wlog(`poll ${i + 1}: thinking`);
      continue;
    }
    text = reply.text || text;
    if (text.length > 2500 && !reply.stale) break;
    wlog(`poll ${i + 1}: len=${text.length} stale=${reply.stale}`);
  }

  await browser.disconnect();

  const limited = /before limit is gone|Upgrade to SuperGrok/i.test(text);
  fs.writeFileSync(OUT, `# SuperGrok Heavy — Architecture Handoff Reply\n\n_Date: ${new Date().toISOString()}_\n_Limited: ${limited}_\n_Chars: ${text.length}_\n\n${text}\n`);
  const out = {
    at: new Date().toISOString(),
    sentChars: PROMPT.length,
    replyChars: text.length,
    limited,
    report: REPORT,
    reply: OUT,
    sent: SENT,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== HEAVY ARCHITECTURE HANDOFF END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });