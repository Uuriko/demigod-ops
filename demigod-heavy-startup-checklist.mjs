#!/usr/bin/env node
/** Ask SuperGrok Heavy: total startup setup + Demigod website checklist + roadmap. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, sendToGrok, collectGrokReply, sleep } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-STARTUP-CHECKLIST.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-STARTUP-CHECKLIST.json');
const SENT = path.join(ROOT, 'HEAVY-STARTUP-CHECKLIST-SENT.txt');

const CONTEXT = {
  at: new Date().toISOString(),
  business: {
    name: 'Demigod',
    domain: 'trydemigod.com',
    model: '10% placement fee on hire, SF Bay Area startups, human-matched talent (all roles)',
    email: 'potter@trydemigod.com',
    founder: 'John Potter (@jjohnpotter)',
    location: 'SF Bay Area',
    stage: 'MVP shipped — forms live, manual matching, no hires logged yet',
  },
  website: {
    stack: 'Webflow talentlink-sf + demigod-foot-core.js v40 CDN',
    forms: 'startup-hire + engineer-join (Webflow native → hello@)',
    verify: 'demigod:verify:all PASS, form e2e confirmed',
    done: [
      'Single-page marketing site live',
      'Dual CTAs (FIND TALENT / JOIN NETWORK)',
      'Trust block + roles ledger (CDN board JSON)',
      '10% pricing model',
      'Mobile sticky CTAs',
    ],
    notDone: [
      'Slack webhook for submissions',
      'Privacy / Terms pages',
      'Real placement stories on site',
      'CMS for roles',
      'iMessage/SMS apply channel',
    ],
  },
  competitors: 'Fonzi (placement ledger), Standout (AI talent agent), Dover, Paraform',
};

const PROMPT = `SuperGrok Heavy — TOTAL STARTUP SETUP + DEMIGOD CHECKLIST + WEBSITE ROADMAP

John (Potter) needs you to RESEARCH (web/X/docs where useful) and produce actionable checklists. Be blunt, numbered, prioritized. This is NOT a coding task — strategy + operations + compliance + growth.

## CONTEXT (current state)
${JSON.stringify(CONTEXT, null, 2)}

## YOUR MISSION

John is building **Demigod** — a human-matched SF startup talent placement service (10% on hire). Website is shipped at trydemigod.com. He now needs the **full startup operating system**: legal entity, banking, payments, taxes, contracts, ops tooling, AND a clear website content/feature roadmap.

Research and synthesize. Mark items [REQUIRED NOW] vs [SOON] vs [LATER]. Include estimated time and cost ranges where known. Flag California/SF-specific items.

---

## DELIVERABLE FORMAT (use these exact section headers)

=== STATUS ACK ===
(2 sentences — where John is, biggest gap)

=== PART A: COMPANY & LEGAL SETUP ===
Checklist for forming and running a US startup (Delaware C-Corp assumed unless you recommend otherwise for a solo placement/recruiting business).

Cover ALL of:
- Stripe Atlas vs Clerky vs direct Delaware filing — pick ONE path for John + why
- Mercury (or alternatives: Brex, Relay) — when to open, what docs needed
- EIN, registered agent, bylaws, stock, 83(b) if applicable
- Business bank account timeline
- **Recruiting/placement business specifics**: independent contractor vs employee classification for matchers; placement fee agreements; client MSAs; candidate terms; California talent agency rules if any [research]
- Insurance: E&O, general liability, cyber — what placement startups actually buy at MVP
- Trademarks: Demigod / trydemigod.com
- hello@ email — Google Workspace vs alternatives

Number every item. Format: \`[P0|P1|P2] Item — why — time — cost ballpark — link or vendor\`

=== PART B: FINANCE, TAX & PAYMENTS ===
- Bookkeeping (QuickBooks, Puzzle, Bench)
- Collecting 10% placement fees — invoicing (Stripe Invoicing? Mercury? manual?)
- Sales tax / CA obligations for recruiting services [research]
- Contractor payments if John hires matchers
- Runway / minimum cash buffer for solo founder
- When to hire accountant / CPA

=== PART C: OPERATIONS & TOOLING ===
Minimum stack for first 10 briefs + 10 engineer profiles:
- CRM or sheet (Notion, Airtable, HubSpot free?)
- Form intake → Slack/email routing
- Calendar (founder intros)
- Doc templates (offer, placement agreement, invoice)
- Compliance: GDPR/privacy for candidate data, resume storage, retention policy
- Background check / vetting — needed at MVP?

=== PART D: WEBSITE — WHAT'S DONE vs STILL NEEDED ===
Audit against Fonzi-simple benchmark. Checkbox list:
- Done (confirm from context)
- Needed before scaling traffic (P0)
- Needed before first paid marketing (P1)
- Nice-to-have (P2)

Include: SEO basics, analytics (Plausible/GA4), privacy policy, terms, accessibility, performance, Webflow billing tier, domain/DNS/SSL, email deliverability (SPF/DKIM for hello@), social preview cards, favicon, 404, sitemap, robots.txt

=== PART E: WEBSITE CONTENT ROADMAP ===
Phased content to add (NOT new pages unless justified):

**Phase 0 (now):** what copy/assets to add with zero eng
**Phase 1 (after 1 placement):** placement ledger lite, logos, testimonial format
**Phase 2 (10 placements):** case studies, blog?, engineer resources
**Phase 3 (scale):** talent subdomain, login, CMS roles board

For each: exact section, exact copy angle, Webflow-implementable yes/no

=== PART F: WEBSITE FEATURE ROADMAP ===
Technical features prioritized:

| Feature | User value | Effort | When | Owner (Webflow / foot-core JS / human / third-party) |
Examples: Slack webhook, Webflow CMS pipelines, form webhooks, placement ledger API, iMessage apply, Cal.com embed, Stripe payment link for deposits, etc.

=== PART G: GROWTH & DISTRIBUTION ===
First 90 days go-to-market checklist:
- Founder outreach (how many, which channels)
- Engineer acquisition
- Partnerships (YC, accelerators, VCs)
- Content/SEO keywords to target
- Metrics dashboard (5 KPIs)

=== PART H: RISK & COMPLIANCE FLAGS ===
What can go wrong legally or reputationally for a placement fee recruiting startup in CA/SF. Top 5 risks + mitigations.

=== PART I: MASTER CHECKLIST (COPY-PASTE) ===
One consolidated numbered checklist merging A–H — sorted by **week 1, week 2–4, month 2–3, later**. Max 60 items. Each line: \`[ ] task — owner (John|agent|vendor) — est time\`

=== PART J: TOP 10 DO THIS WEEK ===
John's highest-ROI 10 actions starting tomorrow. No fluff.

=== PART K: TOP 5 DO NOT DO YET ===
Explicit anti-patterns (incorporate too early? build ATS? raise? etc.)

---

RULES:
- Search for 2025–2026 guidance on Stripe Atlas, Mercury, CA recruiting/placement regulations where relevant
- Demigod is placement/recruiting NOT a SaaS product — adjust advice accordingly
- Website is Webflow + vanilla JS — no React app unless Phase 3
- Do NOT include Eat the Sounds game items
- Be specific to John's situation (solo founder, MVP live, manual matching, SF only)
- Minimum 8000 characters in reply — John wants exhaustive checklists

Search first. Then deliver.`;

async function collectReply(page) {
  let text = '';
  for (let i = 0; i < 36; i++) {
    await sleep(i < 3 ? 12000 : 15000);
    const reply = await collectGrokReply(page, { waitMs: 10000, minGrowth: 200 });
    const body = await page.evaluate(() => document.body?.innerText || '');
    const idx = body.lastIndexOf('=== STATUS ACK ===');
    const chunk = idx >= 0 ? body.slice(idx) : body.slice(-25000);
    text = chunk.length > text.length ? chunk : text;
    const complete = /=== PART J: TOP 10 DO THIS WEEK ===/i.test(text)
      && /=== PART K: TOP 5 DO NOT DO YET ===/i.test(text)
      && text.length > 12000;
    wlog(`heavy checklist poll ${i + 1}: len=${text.length} complete=${complete}`);
    if (complete) break;
  }
  return text;
}

async function main() {
  wlog('=== HEAVY STARTUP CHECKLIST START ===');
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

  const ok = /=== PART I: MASTER CHECKLIST/i.test(text) && text.length > 8000;
  fs.writeFileSync(OUT, `# SuperGrok Heavy — Startup + Website Checklist\n\n_Date: ${new Date().toISOString()}_\n_Chars: ${text.length}_\n_OK: ${ok}_\n\n${text}\n`);

  const out = {
    at: new Date().toISOString(),
    chars: text.length,
    ok,
    sections: {
      statusAck: /=== STATUS ACK ===/i.test(text),
      partA: /=== PART A:/i.test(text),
      partB: /=== PART B:/i.test(text),
      partC: /=== PART C:/i.test(text),
      partD: /=== PART D:/i.test(text),
      partE: /=== PART E:/i.test(text),
      partF: /=== PART F:/i.test(text),
      partG: /=== PART G:/i.test(text),
      partH: /=== PART H:/i.test(text),
      partI: /=== PART I:/i.test(text),
      partJ: /=== PART J:/i.test(text),
      partK: /=== PART K:/i.test(text),
    },
    path: OUT,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== HEAVY STARTUP CHECKLIST END ===');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });