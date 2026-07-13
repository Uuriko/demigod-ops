#!/usr/bin/env node
/** Ask SuperGrok Heavy for Navigation/Footer master + form rename CDP code. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';
import { fetchLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-MASTER-CODE-HELP.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-MASTER-CODE.json');

async function main() {
  const { html } = await fetchLiveHtml(true);
  const signals = {
    hireTalent: (html.match(/HIRE TALENT/gi) || []).length,
    findTalent: (html.match(/FIND TALENT/gi) || []).length,
    emailForm: (html.match(/data-name="email-form"/gi) || []).length,
    solutions: /SOLUTIONS/i.test(html),
    talentLink: /TalentLink/i.test(html),
    footerCols: /Company|Services|Resources|Legal/i.test(html),
    hasNav: /w-nav/i.test(html),
  };

  const PROMPT = `SuperGrok Heavy — MASTER-ONLY CDP AUTOMATION for Demigod Webflow (talentlink-sf).

GOAL: Permanent source fixes via Navigation + Footer component masters + Form Settings — NOT runtime JS.

LIVE HTML SIGNALS NOW:
${JSON.stringify(signals, null, 2)}

STACK: Puppeteer CDP on Chrome :9223, Webflow Designer, prepareWebflowDesigner() uses Browser.setWindowBounds + reload.

TASKS FOR CURSOR TO IMPLEMENT:
1. Navigation master: CTA "FIND TALENT" → #startup-modal; delete SOLUTIONS/ABOUT/BLOG/SUPPORT; keep hero "HIRE TALENT" separate
2. Footer master: delete mega-columns + social; hello@trydemigod.com + © 2026 Demigod + tagline only
3. Form Settings: rename startup-form → startup-hire, jobseeker-form → engineer-join (remove duplicate email-form data-name)
4. Delete orphan Email Form / Test Form in dashboard

Deliver:
A) Exact Webflow Designer click-path for each master (human fallback)
B) Puppeteer CDP script patterns that work when iframe.contentDocument is accessible
C) Webflow AI prompt text (master edit language) if CDP fails
D) Verification grep checks for publish success
E) What ONLY a human can do in Designer (be explicit)

Max 20 bullets. Copy-paste code blocks where helpful. No essays.`;

  wlog('=== HEAVY MASTER CODE START ===');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) {
    await browser.disconnect();
    throw new Error('no grok tab — open SuperGrok Heavy on grok.com');
  }
  await page.bringToFront();
  await sendToGrok(page, PROMPT);

  let text = '';
  for (let i = 0; i < 16; i++) {
    const reply = await collectGrokReply(page, { waitMs: 45000, minGrowth: 80 });
    text = reply.text || '';
    const busy = reply.thinking || /thinking|Finalizing/i.test(text.slice(-2000));
    if (text.length > 800 && !busy) break;
    wlog(`heavy master poll ${i + 1}: len=${text.length} busy=${busy}`);
  }
  await browser.disconnect();

  fs.writeFileSync(OUT, `# SuperGrok Heavy — Master CDP Help\n\n_${new Date().toISOString()}_\n\n${text}\n`);
  const out = { at: new Date().toISOString(), chars: text.length, signals, path: OUT };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== HEAVY MASTER CODE END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });