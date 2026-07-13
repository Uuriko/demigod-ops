#!/usr/bin/env node
/** Ask SuperGrok Heavy: code problems, bloat fruit, elegance + performance */
import fs from 'fs';
import path from 'path';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-ELEGANCE-PERF-REPLY.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-ELEGANCE.json');
const SENT = path.join(ROOT, 'HEAVY-ELEGANCE-PERF-SENT.txt');

const PROMPT = `SuperGrok Heavy — DEMIGOD CODE ELEGANCE + PERFORMANCE AUDIT

John wants your opinion on **code problems**, **low-hanging bloat to remove**, and **ways to make the site + codebase more elegant and fast**.

**Context:** You already have the full architecture handoff (Webflow shell + demigod-head-styles.css on Catbox + demigod-foot-core.js v60 sync-loaded from ouk85t.js). Ship gate passes. Designer bloat-delete ran June 30. Ignore Eat the Sounds game.

**Stack truth:**
- foot-core v60: single ~125-line minified IIFE, 60+ functions, run() pipeline, MutationObserver, wizard on 3 forms
- head CSS: jj45v9.css hides bloat + themes hero/modals
- Canvas Home is minimal; JS still injects nav, trust, legal, partners, partner modal
- COPY object is inline in foot-core; ledger is static; fetchBoard removed
- Partner form uses Webflow API fetch, not native POST
- Submissions webhook exists locally (:9877) but not prod

**John's ask:** Be blunt and specific. No GTM. Building only.

---

## DELIVERABLE (numbered, tables where useful, min 5000 chars)

=== A. CODE PROBLEMS (top 15) ===
Table: # | Problem | Where (file/function) | Severity | Fix complexity (S/M/L)

Focus: foot-core monolith, run() order fragility, duplicate hide layers (CSS+JS+Designer), wizard complexity, click handler capture hacks, no modules, CDN single point, partner API form, stale Webflow HTML drift.

=== B. LOW-HANGING BLOAT TO DELETE ===
Split into:
- **Designer canvas** (permanent delete — what sections/forms/nav/footer junk still worth removing?)
- **head-styles.css** (selectors we can delete once canvas is clean?)
- **foot-core.js** (functions/patterns safe to remove or collapse in v61?)

Rank by: bytes saved on wire × effort. Give exact text patterns or section names to grep.

=== C. ELEGANCE REFACTOR (don't over-engineer) ===
5–8 concrete moves to simplify WITHOUT a full rewrite:
- e.g. demigod-config.json for COPY
- collapse bloat()+cms()+foot()+sweep()?
- single routing module?
- defer non-critical run() steps?

What NOT to do (anti-patterns for this stack).

=== D. PERFORMANCE WINS ===
Table: # | Win | Impact (LCP/TTI/bytes/CLS) | Effort | Owner (agent|John)

Cover: sync script loader vs defer+inline critical, CSS size, run() on every mutation, wizard CSS injection, hero image, Webflow payload, third-party (Turnstile), mobile bottom bar.

Target: what gets us to "feels instant" on 4G mobile without breaking buttons.

=== E. v61 PATCH LIST ===
Exactly 10 line-item changes for the **next foot-core publish** — ordered, one canonical file each, with expected LOC delta.

=== F. ONE PARAGRAPH VERDICT ===
Is the current architecture the right tradeoff for a solo founder + agents, or should we migrate something to Webflow-native / split files / build step?

Research if helpful (Webflow custom code perf 2025–2026). Challenge assumptions. Tables > essays.`;

async function collectHeavy(page, minLen = 4000) {
  let text = '';
  for (let i = 0; i < 36; i++) {
    const reply = await collectGrokReply(page, { waitMs: 50000, minGrowth: 250 });
    if (reply.thinking) {
      wlog(`poll ${i + 1}: thinking`);
      continue;
    }
    text = reply.text || text;
    const hasSections = /=== A\.|CODE PROBLEMS|LOW-HANGING|ELEGANCE|PERFORMANCE|v61/i.test(text);
    if (text.length >= minLen && hasSections && !reply.stale) break;
    if (text.length >= minLen * 1.5 && i >= 8) break;
    wlog(`poll ${i + 1}: len=${text.length} stale=${reply.stale}`);
  }
  return text;
}

async function main() {
  wlog('=== HEAVY ELEGANCE HANDOFF START ===');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) {
    await browser.disconnect();
    throw new Error('no grok tab — open SuperGrok Heavy on grok.com');
  }
  await page.bringToFront();
  fs.writeFileSync(SENT, `${new Date().toISOString()}\n${PROMPT.length} chars\n`);
  wlog(`sending ${PROMPT.length} chars`);
  await sendToGrok(page, PROMPT);
  const text = await collectHeavy(page);
  await browser.disconnect();

  const limited = /Upgrade to SuperGrok|before limit is gone/i.test(text);
  fs.writeFileSync(OUT, `# SuperGrok Heavy — Elegance + Performance\n\n_Date: ${new Date().toISOString()}_\n_Limited: ${limited}_\n_Chars: ${text.length}_\n\n${text}\n`);
  const out = { at: new Date().toISOString(), sentChars: PROMPT.length, replyChars: text.length, limited, reply: OUT, sent: SENT };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== HEAVY ELEGANCE HANDOFF END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });