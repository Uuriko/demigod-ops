#!/usr/bin/env node
/** Full status → SuperGrok Heavy → FINISH / START / PLAN + Cursor coding prompt. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';
import { fetchLiveHtml, scanLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-CURSOR-ROADMAP.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-ROADMAP.json');
const BRIEF = path.join(ROOT, 'HEAVY-CURSOR-ROADMAP-BRIEF.md');

async function collectHeavyReply(page, minLen = 5000) {
  let text = '';
  for (let i = 0; i < 32; i++) {
    const reply = await collectGrokReply(page, { waitMs: 60000, minGrowth: 120 });
    text = reply.text || text;
    const tail = text.slice(-35000);
    const busy = reply.thinking || /thinking|Finalizing|Agents thinking/i.test(tail);
    const hasFinish = /=== FINISH FIRST/i.test(text);
    const hasStart = /=== START NEXT/i.test(text);
    const hasPrompt = /=== PROMPT FOR CURSOR AGENT ===/i.test(text);
    if (text && !busy && hasFinish && hasStart && hasPrompt && tail.length >= minLen) break;
    if (text && !busy && tail.length >= minLen * 2.5 && i >= 14) break;
    wlog(`heavy roadmap poll ${i + 1}: len=${tail.length} busy=${busy} finish=${hasFinish} start=${hasStart}`);
  }
  return text;
}

async function main() {
  const { html, footerCoreJs } = await fetchLiveHtml(true);
  const scan = scanLiveHtml(html, { footerCoreJs });
  const signals = {
    at: new Date().toISOString(),
    demigod: {
      footVersion: scan.footerCoreCopy?.version,
      formsOk: scan.formsOk,
      staticDrift: scan.staticDrift,
      cdn: JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-FOOT-CDN.json'), 'utf8')).cdnUrl,
      humanActions: JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-HUMAN-ACTIONS.json'), 'utf8')),
      copyV31: fs.existsSync(path.join(ROOT, 'DEMIGOD-COPY-V31-EXEC.json')),
    },
    scope: 'DEMIGOD ONLY — no game items (user directive)',
    disk: { freeGb: 782, pct: 12 },
  };

  const PROMPT = `SuperGrok Heavy — ROADMAP FOR JOHN. UPDATE YOUR CONTEXT.

Help decide what to FINISH, START, and PLAN for coding. DEMIGOD WEBSITE ONLY — no game, no eat-the-sounds, ever.

LIVE SIGNALS:
${JSON.stringify(signals, null, 2)}

---

${fs.readFileSync(BRIEF, 'utf8')}`;

  wlog('=== HEAVY ROADMAP START ===');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) {
    await browser.disconnect();
    throw new Error('no grok tab — open SuperGrok Heavy on grok.com');
  }
  await page.bringToFront();
  wlog(`sending ${PROMPT.length} chars`);
  await sendToGrok(page, PROMPT);
  const text = await collectHeavyReply(page, 5000);
  await browser.disconnect();

  const hasFinish = /=== FINISH FIRST/i.test(text);
  const hasStart = /=== START NEXT/i.test(text);
  const hasPlan = /=== PLAN LATER/i.test(text);
  const hasPrompt = /=== PROMPT FOR CURSOR AGENT ===/i.test(text);

  fs.writeFileSync(OUT, `# SuperGrok Heavy — Roadmap (Finish / Start / Plan)\n\n_Date: ${new Date().toISOString()}_\n_Chars: ${text.length}_\n\n${text}\n`);
  const out = { at: new Date().toISOString(), chars: text.length, hasFinish, hasStart, hasPlan, hasPrompt, signals, path: OUT };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== HEAVY ROADMAP END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });