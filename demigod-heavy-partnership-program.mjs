#!/usr/bin/env node
/** Ask SuperGrok Heavy: partnership / referral program research for Demigod. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, sendToGrok, collectGrokReply, sleep } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-PARTNERSHIP-PROGRAM.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-PARTNERSHIP-PROGRAM.json');
const SENT = path.join(ROOT, 'HEAVY-PARTNERSHIP-PROGRAM-SENT.txt');

const CONTEXT = {
  at: new Date().toISOString(),
  business: {
    name: 'Demigod',
    domain: 'trydemigod.com',
    model: '10% of first-year salary on hire — SF Bay Area startups only, all roles (PM, design, growth, eng)',
    guarantee: '90-day replacement',
    candidateSide: 'Free to join',
    email: 'hello@trydemigod.com',
    founder: 'John Potter — solo founder, manual human matching',
    stage: 'MVP live, 0 logged placements, forms e2e confirmed',
  },
  currentPartnership: {
    website: 'Legacy Webflow footer had hidden "Referral Program" link — not implemented',
    heavyPriorAdvice: 'Email 20 YC/accelerator ops + 10 VCs: free talent intros for portfolio',
    noRecruiterMarketplace: true,
  },
  competitorSnapshots: {
    paraform: {
      model: 'Recruiter-first marketplace — 1000+ clients, AI agents, 80% fee split to recruiters',
      recruiterReferrals: '$100 on first candidate submission; 12.5% of referred recruiter first placement earnings',
      companyReferrals: 'Recruiters: 10% uncapped revenue share; Customers: $300 off both; Others: $1000 on hire',
      payments: 'Placement fees paid in thirds over 90 days',
      url: 'https://www.paraform.com/help/article/company-referrals',
    },
    jackAndJill: {
      program: 'Friends of Jack & Jill',
      companyIntro: '20% of placement fee for 12 months from first job listing',
      candidateIntro: '20% per placement, no cap',
      example: '$150k salary → $15k fee → $3k to introducer per hire',
      mechanism: 'Unique link or CC meetjill@ / meetjack@ on intro email',
      payout: '90 days after candidate start',
      url: 'https://www.jackandjill.ai/friends',
    },
    dover: 'Fractional recruiter marketplace — hourly billing, cost-per-hire transparency, not affiliate program',
    fonzi: 'Success-fee marketplace, placement ledger, schedule-call GTM — no public affiliate page found',
    hireVentures: 'B2B referral partners (fractional execs, accountants) — agreement + toolkit + undisclosed payout',
  },
};

const PROMPT = `SuperGrok Heavy — PARTNERSHIP / REFERRAL PROGRAM RESEARCH for Demigod

John needs you to RESEARCH (web, X, help docs, LinkedIn posts) how recruiting/placement startups structure partnership programs — especially Paraform, Jack & Jill Friends, Dover, Fonzi, Mercor, Contrario, Underdog.io, HireVentures-style B2B referral partners, and VC/accelerator talent partnerships.

## CONTEXT
${JSON.stringify(CONTEXT, null, 2)}

## YOUR MISSION
Design the RIGHT partnership program for Demigod at MVP stage (solo founder, 0 placements, SF only, 10% on hire). Do NOT recommend building a Paraform-scale recruiter marketplace yet. Focus on distribution + trust + low ops overhead.

Research first. Then deliver actionable structure John can implement in week 1–4.

---

## DELIVERABLE FORMAT (exact headers)

=== STATUS ACK ===
(2 sentences — biggest opportunity + biggest trap for Demigod partnerships)

=== PART A: COMPETITOR PARTNERSHIP MATRIX ===
Table comparing at least 8 players:
| Company | Program name | Partner types | Company referral $ | Candidate referral $ | Recruiter referral $ | Duration/cap | Tracking mechanism | Payout timing | Steal for Demigod? Y/N |

Include real URLs/sources where possible.

=== PART B: PARTNER TYPES FOR DEMIGOD ===
Rank these partner archetypes for Demigod MVP (1 = best ROI now):
- VC / accelerator ops (portfolio talent support)
- Fractional CFO/COO/HR advisors
- Startup lawyers / accountants
- Independent recruiters (non-exclusive)
- Candidate "friends" referrals
- Other placement startups (co-referral)
- Microsoft / cloud partner programs (adjacent)

For each: why, expected volume, ops burden, legal risk (CA placement rules), fit score 1–10.

=== PART C: RECOMMENDED DEMIGOD PROGRAM STRUCTURE ===
Propose ONE primary program name + tagline.

Define 2–3 tiers max (e.g. Portfolio Partner / Talent Connector / Recruiter Ally).

For each tier specify:
- Who qualifies
- What they get (non-monetary perks)
- What they earn (exact % or $ ranges based on 10% fee model — show math at $150k, $200k, $250k salary)
- Duration (first hire only? 12 months? lifetime?)
- Cap (if any)
- Exclusivity (none recommended?)
- Attribution rules (what counts as valid intro)
- Payout timing (align with 90-day guarantee?)
- Minimum viable tracking (email + Notion? PartnerStack? manual?)

=== PART D: ECONOMICS & GUARDRAILS ===
- Recommended take rates: Demigod keeps X%, partner gets Y% on referred startup hire
- Break-even: how many partner referrals before it beats founder outbound
- Anti-fraud rules (Paraform-style consent requirements)
- CA compliance flags for paying referral fees to non-licensed individuals [research]
- When to require signed partner agreement vs honor-system email intros

=== PART E: GTM PLAYBOOK (FIRST 30 DAYS) ===
Numbered launch plan:
- Week 1: docs + landing snippet + outreach list
- Week 2–4: first 10 partner conversations
Include exact email subject lines, 3-sentence pitch, and who to target first (name archetypes not random VCs).

=== PART F: WEBSITE / COPY ===
- Should Demigod add /partners or footer "Partners" link now? Y/N + why
- Hero/footer one-liner for partners
- 5 bullet partner value prop
- What NOT to put on site yet

=== PART G: PARAFORM DEEP DIVE ===
Separate section: how Paraform's TWO-SIDED marketplace differs from Demigod, what to steal vs ignore from:
- Recruiter fee split (80%)
- Company referral 10% revenue share
- Recruiter referral 12.5%
- Agency partnership demo motion

=== PART H: DECISION ===
Pick ONE recommended structure for John to launch THIS MONTH.
Format: "Launch X with Y% for Z partners because..."

=== PART I: OPEN QUESTIONS FOR JOHN ===
Max 5 decisions only John can make (e.g. 15% vs 20% share, VC free intros vs paid).

---

RULES:
- Demigod is human-matched SF startup placement — NOT enterprise demo sales like Paraform
- Solo founder — program must be <2 hrs/week ops
- Candidates never pay
- Search 2025–2026 sources
- Minimum 6000 characters
- Be blunt about what fails at 0-placement stage

Search first. Then deliver.`;

async function collectReply(page) {
  let text = '';
  for (let i = 0; i < 36; i++) {
    await sleep(i < 3 ? 12000 : 15000);
    await collectGrokReply(page, { waitMs: 10000, minGrowth: 200 });
    const body = await page.evaluate(() => document.body?.innerText || '');
    const idx = body.lastIndexOf('=== STATUS ACK ===');
    const chunk = idx >= 0 ? body.slice(idx) : body.slice(-30000);
    text = chunk.length > text.length ? chunk : text;
    const complete = /=== PART H: DECISION ===/i.test(text)
      && /=== PART I: OPEN QUESTIONS/i.test(text)
      && text.length > 8000;
    wlog(`heavy partnership poll ${i + 1}: len=${text.length} complete=${complete}`);
    if (complete) break;
  }
  return text;
}

async function main() {
  wlog('=== HEAVY PARTNERSHIP PROGRAM START ===');
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

  const ok = /=== PART H: DECISION ===/i.test(text) && text.length > 6000;
  fs.writeFileSync(
    OUT,
    `# SuperGrok Heavy — Demigod Partnership Program\n\n_Date: ${new Date().toISOString()}_\n_Chars: ${text.length}_\n_OK: ${ok}_\n\n${text}\n`,
  );

  const out = {
    at: new Date().toISOString(),
    chars: text.length,
    ok,
    path: OUT,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== HEAVY PARTNERSHIP PROGRAM END ===');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});