#!/usr/bin/env node
/** Competitors + features research brief → SuperGrok Heavy */
import fs from 'fs';
import path from 'path';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const REPORT = path.join(ROOT, 'HEAVY-COMPETITORS-FEATURES-REPORT.md');
const OUT = path.join(ROOT, 'HEAVY-COMPETITORS-FEATURES-REPLY.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-COMPETITORS-HANDOFF.json');
const SENT = path.join(ROOT, 'HEAVY-COMPETITORS-FEATURES-SENT.txt');

async function main() {
  const report = fs.readFileSync(REPORT, 'utf8');
  const PROMPT = `SuperGrok Heavy — DEMIGOD COMPETITORS + FEATURES RESEARCH

John asked Local Grok to think deeper — anchor competitor research in the **full site architecture** (Webflow + foot-core v62 + submissions pipeline). Local Grok produced a research brief below with seed competitor data (Fonzi, Jack & Jill, Paraform) and architecture-aware feature matrix.

**Your job:** Use web/X/HN research. Return numbered sections **A–F** exactly as specified in section 5 of the brief. Tables, not essays. Mark [SOURCE] vs [INFERRED]. Min 5000 chars. Blunt and build-focused.

**Scope:** Demigod startup only — ignore Eat the Sounds game.

**Critical context:** Demigod wins on 10% fee + human + SF wedge IF proof exists. Competitors win on ledger/testimonials/portals. Architecture allows dynamic board JSON via foot-core without rebuilding to React.

---

${report}`;

  wlog('=== HEAVY COMPETITORS HANDOFF START ===');
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
  for (let i = 0; i < 50; i++) {
    const reply = await collectGrokReply(page, { waitMs: 45000, minGrowth: 200 });
    if (reply.thinking) {
      wlog(`poll ${i + 1}: thinking`);
      continue;
    }
    text = reply.text || text;
    if (text.length > 5000 && !reply.stale) break;
    wlog(`poll ${i + 1}: len=${text.length} stale=${reply.stale}`);
  }

  await browser.disconnect();

  const limited = /before limit is gone|Upgrade to SuperGrok/i.test(text);
  fs.writeFileSync(
    OUT,
    `# SuperGrok Heavy — Competitors + Features Reply\n\n_Date: ${new Date().toISOString()}_\n_Limited: ${limited}_\n_Chars: ${text.length}_\n\n${text}\n`,
  );
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
  wlog('=== HEAVY COMPETITORS HANDOFF END ===');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});