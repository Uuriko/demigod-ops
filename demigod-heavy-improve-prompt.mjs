#!/usr/bin/env node
/** Report Demigod status to SuperGrok Heavy → collect improve Cursor prompt. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';
import { fetchLiveHtml, scanLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-CURSOR-IMPROVE-PROMPT.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-IMPROVE-PROMPT.json');
const BRIEF = path.join(ROOT, 'HEAVY-CURSOR-IMPROVE-BRIEF.md');

async function collectHeavyReply(page, minLen = 2000) {
  let text = '';
  for (let i = 0; i < 28; i++) {
    const reply = await collectGrokReply(page, { waitMs: 55000, minGrowth: 100 });
    text = reply.text || text;
    const tail = text.slice(-20000);
    const busy = reply.thinking || /thinking|Finalizing|Agents thinking/i.test(tail);
    const hasPrompt = /=== PROMPT FOR CURSOR AGENT ===/i.test(text);
    if (text && !busy && hasPrompt && tail.length >= minLen) break;
    if (text && !busy && tail.length >= minLen * 2 && i >= 12) break;
    wlog(`heavy improve poll ${i + 1}: len=${tail.length} busy=${busy} prompt=${hasPrompt}`);
  }
  return text;
}

async function main() {
  const { html, pageScan } = await fetchLiveHtml(true);
  const scan = scanLiveHtml(html);
  const signals = {
    staticHtml: {
      hireTalent: (html.match(/HIRE TALENT/gi) || []).length,
      findTalent: (html.match(/FIND TALENT/gi) || []).length,
      emailForm: (html.match(/data-name=["']email-form["']/gi) || []).length,
      startupHire: (html.match(/data-name=["']startup-hire["']/gi) || []).length,
      engineerJoin: (html.match(/data-name=["']engineer-join["']/gi) || []).length,
      solutions: /SOLUTIONS/i.test(html),
      talentLink: /TalentLink/i.test(html),
      methodology: /METHODOLOGY/i.test(html),
      githubUrl: /name=["']github-url["']/i.test(html),
      isEngineer: /name=["']is-engineer["']/i.test(html),
      footerCols: /Company|Services|Resources|Legal/i.test(html),
    },
    verifyLive: fs.existsSync(path.join(ROOT, 'DEMIGOD-VERIFY-LIVE.json'))
      ? JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-VERIFY-LIVE.json'), 'utf8'))
      : null,
    screenshotProblems: fs.existsSync(path.join(ROOT, 'DEMIGOD-SCREENSHOT-MANIFEST.json'))
      ? JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-SCREENSHOT-MANIFEST.json'), 'utf8')).problems
      : [],
    pageScan,
    forms: scan.forms,
    humanTasks: fs.existsSync(path.join(ROOT, 'DEMIGOD-HUMAN-ACTIONS.json'))
      ? JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-HUMAN-ACTIONS.json'), 'utf8'))
      : null,
  };

  const PROMPT = `SuperGrok Heavy — DEMIGOD WEBSITE IMPROVE PASS

John wants you to review what Local Cursor Grok has shipped, then write ONE copy-paste prompt for Local Grok to execute next.

FOCUS: high-impact bugfixes, code review, design review, making sure everything works.
NOT: eat-the-sounds game, Tally revival, competitive research.

LIVE SIGNALS (fetched ${new Date().toISOString()}):
${JSON.stringify(signals, null, 2)}

---

${fs.readFileSync(BRIEF, 'utf8')}`;

  wlog('=== HEAVY IMPROVE PROMPT START ===');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) {
    await browser.disconnect();
    throw new Error('no grok tab — open SuperGrok Heavy on grok.com');
  }
  await page.bringToFront();
  wlog(`sending ${PROMPT.length} chars`);
  await sendToGrok(page, PROMPT);
  const text = await collectHeavyReply(page, 2000);
  await browser.disconnect();

  const limited = /before limit is gone/i.test(text)
    || (/Upgrade to SuperGrok/i.test(text) && text.length < 2500);
  const hasPrompt = /=== PROMPT FOR CURSOR AGENT ===/i.test(text);
  const hasCodeReview = /=== CODE REVIEW VERDICT ===/i.test(text);
  const hasDesignReview = /=== DESIGN REVIEW VERDICT ===/i.test(text);

  fs.writeFileSync(OUT, `# SuperGrok Heavy — Demigod Improve Cursor Prompt\n\n_Date: ${new Date().toISOString()}_\n_Limited: ${limited}_\n_HasPrompt: ${hasPrompt}_\n_HasCodeReview: ${hasCodeReview}_\n_HasDesignReview: ${hasDesignReview}_\n\n${text}\n`);
  const out = {
    at: new Date().toISOString(),
    chars: text.length,
    limited,
    hasPrompt,
    hasCodeReview,
    hasDesignReview,
    signals,
    path: OUT,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog(`=== HEAVY IMPROVE PROMPT END chars=${text.length} ===`);
}

main().catch((e) => { console.error(e); process.exit(1); });