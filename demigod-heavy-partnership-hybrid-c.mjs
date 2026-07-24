#!/usr/bin/env node
/** SuperGrok Heavy: Option C hybrid partnership — research + implementation plan + Cursor agent prompt. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, sendToGrok, collectGrokReply, sleep } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-PARTNERSHIP-HYBRID-C.md');
const OUT_PROMPT = path.join(ROOT, 'DEMIGOD-PARTNERSHIP-IMPLEMENT-PROMPT.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-PARTNERSHIP-HYBRID-C.json');
const SENT = path.join(ROOT, 'HEAVY-PARTNERSHIP-HYBRID-C-SENT.txt');

const CONTEXT = {
  at: new Date().toISOString(),
  decision: 'Option C — Hybrid (John confirmed explore this path)',
  optionC: {
    phase0: 'Portfolio Desk — VC/accelerator ops get FREE priority matching, NO cash, no public earn page',
    phase1: 'After first paid placement — Advisor Referral cash at 15% of Demigod 10% fee (fractional CFO/HR, lawyers, accountants)',
    phase2: 'After 3-5 placements — brand as Demigod Allies, optional public page, Channel C candidate intros deferred or $500 flat',
    vcCash: 'VCs/accelerators stay service-only permanently (no referral fees to avoid conflict optics)',
    gates: {
      portfolioDesk: 'Can start now (0 placements)',
      cashReferrals: 'After entity + first placement + lawyer-reviewed 1-page agreement',
      publicAlliesPage: 'After placement #1 minimum, ideally #3',
    },
  },
  rejectedFromPriorHeavy: [
    '25% cash to VC/accelerator Tier 1',
    'Public /allies earn page at 0 placements',
    'Jack & Jill 12-month rolling 20% window',
    'Paraform recruiter marketplace',
  ],
  business: {
    name: 'Demigod',
    domain: 'trydemigod.com',
    model: '10% first-year salary on hire, SF Bay Area startups, all roles',
    guarantee: '90-day replacement',
    email: 'potter@trydemigod.com',
    founder: 'John Potter — solo, manual matching',
    stage: 'MVP live v41, 0 placements, forms e2e OK, Privacy/Terms injected via foot-core',
    stack: 'Webflow talentlink-sf + demigod-foot-core.js CDN + Notion for ops (planned)',
    legal: 'No entity yet — Heavy startup checklist recommended Stripe Atlas + E&O before scaling',
  },
  priorResearch: 'HEAVY-PARTNERSHIP-PROGRAM.md (Demigod Allies 25%/15% — superseded by Option C for VCs)',
  competitors: {
    paraform: 'Recruiter marketplace; company ref 10% rev share; outsider $1k flat',
    jackAndJill: 'Friends 20% for 12mo company / per candidate; CC email intros',
    hireVentures: 'B2B referral partners — agreement + toolkit',
  },
};

const PROMPT = `SuperGrok Heavy — OPTION C HYBRID PARTNERSHIP: DEEP PLAN + CURSOR AGENT PROMPT

John chose **Option C (Hybrid)** over your prior "Demigod Allies 25%/15%" recommendation. Your job: research, refine, and produce an **executable implementation plan** plus a **copy-paste Cursor/local agent prompt** John can hand to his coding agent.

## CONTEXT (authoritative)
${JSON.stringify(CONTEXT, null, 2)}

## OPTION C SUMMARY (do not change this strategic choice)
- **Portfolio Desk (now):** VC/accelerator ops + strategic partners → free 48h priority matching, NO cash ever for VCs
- **Advisor Referral (gated):** Fractional CFO/COO/HR, lawyers, accountants → 15% of Demigod's 10% fee, ONLY after placement #1 + entity + legal review
- **Public marketing:** NO earn-language on site until placement #1; full Allies page after 3-5 placements
- **Ops budget:** <90 min/week founder time; CC hello@ + Notion tracker

Research Jack & Jill Friends, Paraform referrals, HireVentures, YC/Work at a Startup talent partner norms, fractional advisor referral programs, CA finder-fee vs employment agency rules for placement businesses.

---

## DELIVERABLE FORMAT (exact headers — fill ALL)

=== STATUS ACK ===
(3 sentences: why Option C beats pure cash program at 0 placements; biggest execution risk; success metric for 60 days)

=== PART A: OPTION C vs PRIOR HEAVY RECOMMENDATION ===
Table: Dimension | Prior Allies (25%/15%) | Option C Hybrid | Winner + why

=== PART B: PHASE 0 — PORTFOLIO DESK (WEEKS 1-4, START NOW) ===
**B.1 Partner ICP** — exact titles, where to find them (YC batch ops, VC talent partners, etc.), who to exclude
**B.2 Offer sheet** — bullet what they get / don't get / what you need from them
**B.3 Outreach** — 3 email templates (cold, warm follow-up, post-intro thank-you); subject lines; send cadence
**B.4 Tracking** — Notion database schema (properties, views, statuses); CC email rules; attribution fields
**B.5 Success criteria** — numeric targets week 1/2/4 (intros requested, briefs received, matches sent)
**B.6 Failure modes** — 5 ways Desk fails + mitigation

=== PART C: PHASE 1 — ADVISOR REFERRAL (GATED ON PLACEMENT #1) ===
**C.1 Gate checklist** — every prerequisite before first $ payout (entity, E&O, agreement, 1099, etc.)
**C.2 Who qualifies** — fractional advisors yes; independent recruiters maybe; candidates defer
**C.3 Economics** — 15% of fee with math table $150k/$200k/$250k; compare to Paraform $1k outsider bounty
**C.4 Legal** — CA finder fee safe harbor for intro-only; when bond/license needed; 1-page agreement outline (section headers only)
**C.5 Payout process** — step-by-step from hire → 90-day wait → 1099 → pay
**C.6 Advisor outreach** — different pitch than VC (includes future 15%); when to send

=== PART D: PHASE 2 — DEMIGOD ALLIES BRAND (3-5 PLACEMENTS) ===
What goes public on site, footer, copy angles, what case studies to show, when to add partner application form

=== PART E: WEBSITE & DEMIGOD-FOOT-CORE IMPLEMENTATION MAP ===
Table: Asset | Phase | Webflow vs foot-core.js vs Notion vs human | Priority P0/P1/P2
Include: hidden /partners page, footer link timing, email aliases (partners@?), form fields if any, NO bundler/React

=== PART F: NOTION / DOC TEMPLATES (OUTLINE) ===
List every doc to create with section headers:
- Portfolio Desk one-pager (partner-facing)
- Internal ally tracker
- Intro consent blurb
- Advisor Referral Agreement outline
- Partner outreach CRM fields

=== PART G: 60-DAY GANTT ===
Week-by-week checklist (max 12 weeks if needed) with owner: John | agent | lawyer | vendor

=== PART H: METRICS DASHBOARD ===
5 KPIs + 3 leading indicators + review cadence

=== PART I: RISKS & ANTI-PATTERNS ===
Top 10 things John must NOT do (specific to Option C)

=== PART J: CURSOR AGENT IMPLEMENTATION PROMPT ===
**CRITICAL:** Write a complete, copy-paste-ready prompt block (min 2500 chars) for John's local Cursor agent. The prompt must:
1. State project = Demigod Webflow only (not Eat the Sounds game)
2. List exact files agent may edit: demigod-foot-core.js, demigod-head-minimal.html, demigod-footer-lite.html, new markdown in /home/potter only if John asked
3. Phase 0 tasks only (what to build NOW vs explicitly defer)
4. Include exact copy strings for any site injection (Portfolio Desk CTA, not earn language)
5. Specify verify ritual: npm run demigod:foot:cdn, demigod:fix:custom-code, demigod:verify:all
6. Include Notion template content as markdown file to create: DEMIGOD-PORTFOLIO-DESK-KIT.md
7. One file per task rule
8. End with acceptance criteria checklist

Format PART J as:
\`\`\`
--- BEGIN CURSOR AGENT PROMPT ---
(full prompt here)
--- END CURSOR AGENT PROMPT ---
\`\`\`

=== PART K: OPEN DECISIONS FOR JOHN ===
Max 5 binary decisions (A vs B) that block implementation

---

RULES:
- Option C is locked — refine it, don't replace with marketplace or 25% VC cash
- Demigod = human-matched SF placement, 10% on hire, solo founder
- Minimum 9000 characters total
- Be blunt; cite URLs where possible
- PART J must be actionable without reading the rest

Search first. Then deliver.`;

async function collectReply(page) {
  let text = '';
  for (let i = 0; i < 40; i++) {
    await sleep(i < 3 ? 12000 : 15000);
    await collectGrokReply(page, { waitMs: 10000, minGrowth: 200 });
    const body = await page.evaluate(() => document.body?.innerText || '');
    const idx = body.lastIndexOf('=== STATUS ACK ===');
    const chunk = idx >= 0 ? body.slice(idx) : body.slice(-35000);
    text = chunk.length > text.length ? chunk : text;
    const hasPrompt = /--- BEGIN CURSOR AGENT PROMPT ---/i.test(text)
      && /--- END CURSOR AGENT PROMPT ---/i.test(text);
    const complete = /=== PART J: CURSOR AGENT IMPLEMENTATION PROMPT ===/i.test(text)
      && /=== PART K:/i.test(text)
      && hasPrompt
      && text.length > 10000;
    wlog(`heavy hybrid-c poll ${i + 1}: len=${text.length} prompt=${hasPrompt} complete=${complete}`);
    if (complete) break;
  }
  return text;
}

function extractCursorPrompt(text) {
  const m = text.match(/--- BEGIN CURSOR AGENT PROMPT ---([\s\S]*?)--- END CURSOR AGENT PROMPT ---/i);
  return m ? m[1].trim() : '';
}

async function main() {
  wlog('=== HEAVY PARTNERSHIP HYBRID C START ===');
  const browser = await connectBrowser();
  const page = (await browser.pages()).find((p) => /grok\.com/i.test(p.url()));
  if (!page) throw new Error('open grok.com SuperGrok Heavy tab');

  await page.bringToFront();
  await page.evaluate(() => {
    [...document.querySelectorAll('button,a')].find((b) =>
      /new chat/i.test((b.textContent || b.getAttribute('aria-label') || '').trim()),
    )?.click();
  });
  await sleep(2500);

  await sendToGrok(page, PROMPT);
  fs.writeFileSync(SENT, `${new Date().toISOString()}\n\n${PROMPT}`);

  const text = await collectReply(page);
  await browser.disconnect();

  const cursorPrompt = extractCursorPrompt(text);
  const ok = cursorPrompt.length > 2000 && text.length > 9000;

  fs.writeFileSync(
    OUT,
    `# SuperGrok Heavy — Option C Hybrid Partnership Plan\n\n_Date: ${new Date().toISOString()}_\n_Chars: ${text.length}_\n_Cursor prompt chars: ${cursorPrompt.length}_\n_OK: ${ok}_\n\n${text}\n`,
  );

  if (cursorPrompt) {
    fs.writeFileSync(
      OUT_PROMPT,
      `# Demigod Option C — Cursor Agent Implementation Prompt\n\n_Extracted from SuperGrok Heavy ${new Date().toISOString()}_\n\n${cursorPrompt}\n`,
    );
  }

  const out = {
    at: new Date().toISOString(),
    chars: text.length,
    cursorPromptChars: cursorPrompt.length,
    ok,
    paths: { plan: OUT, cursorPrompt: OUT_PROMPT },
    sections: {
      statusAck: /=== STATUS ACK ===/i.test(text),
      partB: /=== PART B:/i.test(text),
      partC: /=== PART C:/i.test(text),
      partE: /=== PART E:/i.test(text),
      partJ: /=== PART J:/i.test(text),
      cursorBlock: cursorPrompt.length > 2000,
    },
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== HEAVY PARTNERSHIP HYBRID C END ===');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});