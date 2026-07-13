#!/usr/bin/env node
/** Follow-up: Heavy sections A–F (first pass hit token limit). */
import fs from 'fs';
import path from 'path';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-COMPETITORS-FEATURES-REPLY-PART2.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-COMPETITORS-FOLLOWUP.json');
const SENT = path.join(ROOT, 'HEAVY-COMPETITORS-FOLLOWUP-SENT.txt');

const PROMPT = `SuperGrok Heavy — COMPETITORS RESEARCH (follow-up — DO NOT repeat the brief)

Your prior reply hit the token limit and echoed the input. **Search web/X now.** Return ONLY the deliverable below.

## Demigod (30-second context)
- SF startup talent matching, solo founder John Potter, **10% on hire**, human-matched (anti-AI-spam)
- Site: Webflow shell + demigod-foot-core.js v62 (CDN IIFE) — injects nav, wizards, trust block, partners, legal
- **Trust gap:** static ledger rows vs Fonzi live Placement Ledger
- **Built but not live:** board JSON CDN, submissions webhook, partner webhook (needs public URL)
- Competitors: **Fonzi** (Match Day, 18%, ledger), **Jack & Jill** (AI Jack/Jill, free candidates), **Paraform** (recruiter marketplace, enterprise)

Scope: Demigod only. Ignore Eat the Sounds game.

---

## DELIVERABLE (numbered A–F, tables, min 6000 chars, mark [SOURCE]/[INFERRED])

=== A. COMPETITOR DEEP DIVES ===
Table per competitor (Fonzi, Jack & Jill, Paraform, Dover, Gem, + 2 new 2025–26 SF matchers if found):
| Player | Model | Pricing | Proof mechanics | AI usage | Weakness Demigod exploits |

=== B. FEATURE TAXONOMY ===
Categories: Trust/Proof, Intake, Matching, Communication, Pricing/Billing, Partner/Referral, Community, Ops/SLA
Table: Category | Leader | Demigod today | Highest-ROI add (foot-core compatible)

=== C. DEFENSIBLE WEDGES (12 months) ===
Rank 3 wedges with evidence. Challenge "10% + human + SF-only" — is it enough without proof?

=== D. SITE FEATURE BACKLOG (architecture-compatible) ===
Rank 10 features shippable via foot-core.js + board JSON + head CSS + submissions pipeline.
**Forbidden:** React app, mobile native, full ATS, recruiter marketplace.
Table: Rank | Feature | Effort (hrs) | Trust impact 1-10 | Comp it beats

=== E. COPY / POSITIONING ===
Table: Competitor | Their headline | Demigod counter | Proof needed to say it credibly

=== F. VERDICT ===
One paragraph: feature company vs proof-loop company? What should John **stop** building on site this week?

Be blunt. Tables > essays. Search first.`;

async function collectHeavy(page, minLen = 5500) {
  let text = '';
  for (let i = 0; i < 40; i++) {
    const reply = await collectGrokReply(page, { waitMs: 50000, minGrowth: 250 });
    if (reply.thinking) {
      wlog(`poll ${i + 1}: thinking`);
      continue;
    }
    text = reply.text || text;
    const hasSections = /=== A\.|COMPETITOR DEEP|FEATURE TAXONOMY|DEFENSIBLE|BACKLOG|VERDICT/i.test(text);
    const notEcho = !/demigod-foot-core\.js v62.*Tier A/i.test(text.slice(0, 800));
    if (text.length >= minLen && hasSections && notEcho && !reply.stale) break;
    if (text.length >= minLen * 1.3 && i >= 10) break;
    wlog(`poll ${i + 1}: len=${text.length} stale=${reply.stale} sections=${hasSections}`);
  }
  return text;
}

async function main() {
  wlog('=== HEAVY COMPETITORS FOLLOWUP START ===');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) {
    await browser.disconnect();
    throw new Error('no grok tab');
  }
  await page.bringToFront();
  fs.writeFileSync(SENT, `${new Date().toISOString()}\n${PROMPT.length} chars\n`);
  wlog(`sending ${PROMPT.length} chars`);
  await sendToGrok(page, PROMPT);
  const text = await collectHeavy(page);
  await browser.disconnect();

  const limited = /Upgrade to SuperGrok|before limit is gone|unable to finish/i.test(text);
  fs.writeFileSync(
    OUT,
    `# SuperGrok Heavy — Competitors + Features (Part 2)\n\n_Date: ${new Date().toISOString()}_\n_Limited: ${limited}_\n_Chars: ${text.length}_\n\n${text}\n`,
  );
  const out = {
    at: new Date().toISOString(),
    sentChars: PROMPT.length,
    replyChars: text.length,
    limited,
    reply: OUT,
    sent: SENT,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== HEAVY COMPETITORS FOLLOWUP END ===');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});