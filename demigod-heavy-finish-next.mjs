#!/usr/bin/env node
/** Full status → SuperGrok Heavy → very long FINISH FIRST + WORK NEXT Cursor prompt. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';
import { fetchLiveHtml, scanLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-CURSOR-FINISH-NEXT-PROMPT.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-FINISH-NEXT.json');
const SENT = path.join(ROOT, 'HEAVY-CURSOR-FINISH-NEXT-SENT.txt');
const BRIEF = path.join(ROOT, 'HEAVY-CURSOR-FINISH-NEXT-BRIEF.md');

async function collectHeavyReply(page, minLen = 4000) {
  let text = '';
  for (let i = 0; i < 32; i++) {
    const reply = await collectGrokReply(page, { waitMs: 60000, minGrowth: 120 });
    text = reply.text || text;
    const tail = text.slice(-30000);
    const busy = reply.thinking || /thinking|Finalizing|Agents thinking/i.test(tail);
    const hasPrompt = /=== PROMPT FOR CURSOR AGENT ===/i.test(text);
    const hasFinish = /=== FINISH FIRST/i.test(text);
    if (text && !busy && hasPrompt && hasFinish && tail.length >= minLen) break;
    if (text && !busy && tail.length >= minLen * 2.5 && i >= 14) break;
    wlog(`heavy finish-next poll ${i + 1}: len=${tail.length} busy=${busy} prompt=${hasPrompt}`);
  }
  return text;
}

async function main() {
  const { html, pageScan, footerCoreJs } = await fetchLiveHtml(true);
  const scan = scanLiveHtml(html, { footerCoreJs });
  const signals = {
    at: new Date().toISOString(),
    staticHtml: {
      hireTalent: (html.match(/HIRE TALENT/gi) || []).length,
      findTalent: (html.match(/FIND TALENT/gi) || []).length,
      emailForm: (html.match(/data-name=["']email-form["']/gi) || []).length,
      startupHire: (html.match(/data-name=["']startup-hire["']/gi) || []).length,
      engineerJoin: (html.match(/data-name=["']engineer-join["']/gi) || []).length,
      resumeField: /name=["']resume["']/i.test(html),
      solutions: /SOLUTIONS/i.test(html),
      talentLink: /TalentLink/i.test(html),
      methodology: /METHODOLOGY/i.test(html),
      githubUrl: /name=["']github-url["']/i.test(html),
      isEngineer: /name=["']is-engineer["']/i.test(html),
      multipart: /enctype=["']multipart/i.test(html),
    },
    footVersion: scan.footerCoreCopy?.version,
    verifyLive: JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-VERIFY-LIVE.json'), 'utf8')),
    sourceTruth: JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-SOURCE-TRUTH-FINAL.json'), 'utf8')),
    pageScan,
    forms: scan.forms,
    staticDrift: scan.staticDrift,
    system: { diskPct: '12%', ramAvailable: '50GB', mcpStopped: true },
  };

  const PROMPT = `SuperGrok Heavy — UPDATE YOUR CONTEXT. John needs a VERY LONG detailed execution prompt.

This is the latest Demigod website status. Read carefully. Then reply with FINISH FIRST, WORK NEXT, and an exhaustive PROMPT FOR CURSOR AGENT (minimum 20 numbered steps).

LIVE SIGNALS:
${JSON.stringify(signals, null, 2)}

---

${fs.readFileSync(BRIEF, 'utf8')}`;

  wlog('=== HEAVY FINISH-NEXT START ===');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) {
    await browser.disconnect();
    throw new Error('no grok tab — open SuperGrok Heavy on grok.com');
  }
  await page.bringToFront();
  fs.writeFileSync(SENT, `${new Date().toISOString()}\n${PROMPT.length} chars\n`);
  wlog(`sending ${PROMPT.length} chars to ${page.url()}`);
  await sendToGrok(page, PROMPT);
  const text = await collectHeavyReply(page, 4000);
  await browser.disconnect();

  const limited = /before limit is gone/i.test(text);
  const hasPrompt = /=== PROMPT FOR CURSOR AGENT ===/i.test(text);
  const hasFinish = /=== FINISH FIRST/i.test(text);

  fs.writeFileSync(OUT, `# SuperGrok Heavy — Finish First + Work Next\n\n_Date: ${new Date().toISOString()}_\n_Limited: ${limited}_\n_HasPrompt: ${hasPrompt}_\n_HasFinish: ${hasFinish}_\n_Chars: ${text.length}_\n\n${text}\n`);
  const out = { at: new Date().toISOString(), chars: text.length, limited, hasPrompt, hasFinish, signals, path: OUT };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog(`=== HEAVY FINISH-NEXT END chars=${text.length} ===`);
}

main().catch((e) => { console.error(e); process.exit(1); });