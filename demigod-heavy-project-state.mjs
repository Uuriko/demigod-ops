#!/usr/bin/env node
/** Full Demigod project state → SuperGrok Heavy consult + report. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { connectBrowser, sendToGrok, collectGrokReply, sleep } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-PROJECT-STATE.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-PROJECT-STATE.json');
const OUT_PROMPT = path.join(ROOT, 'DEMIGOD-HEAVY-PROJECT-CURSOR-PROMPT.md');
const SENT = path.join(ROOT, 'HEAVY-PROJECT-STATE-SENT.txt');

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function readTail(p, max = 6000) {
  try {
    const t = fs.readFileSync(p, 'utf8');
    return t.length > max ? `…${t.slice(-max)}` : t;
  } catch { return '(missing)'; }
}

spawnSync('node', ['demigod-leverage-status.mjs'], { cwd: ROOT, encoding: 'utf8' });
spawnSync('node', ['demigod-status-report.mjs'], { cwd: ROOT, encoding: 'utf8' });

const board = readJson(path.join(ROOT, 'demigod-board.json'));
const inbox = readJson(path.join(ROOT, 'DEMIGOD-SUBMISSIONS-INBOX.json'));
const inboxNew = (inbox?.items || []).filter((i) => i.status === 'new').length;
const inboxSpam = (inbox?.items || []).filter((i) => i.status === 'spam').length;

const PROJECT_ARC = `
## PROJECT ARC (full history — June 2026)

**Product:** Demigod — SF human-matched startup talent. 10% on hire. hello@trydemigod.com. Solo founder ops.
**Site:** https://www.trydemigod.com (Webflow talentlink-sf). NOT a job board; positioning = SF Human Signal Broker / anti-AI-slop curation.
**Architecture:** Webflow shell + demigod-head-minimal.html + Catbox head CSS + demigod-footer-lite.html loader + demigod-foot-core.js v65 on Catbox CDN (~103KB IIFE). Board JSON on Catbox → live trust block. Local submissions webhook :9877 + localtunnel for partner form.

**Evolution:**
- v18–v41: scrub TalentLink/Hermes leaks, forms rename, pricing simplification, legal/partnerships hash routes
- v53–v61: Typeform-style stepped wizard (dg-wiz) on native Webflow forms startup-hire + engineer-join
- v63–v64: dynamic board fetchBoard(), copy policy (no 48h, no founder name), SPEED_LEAK scrub
- v65: Signal theater — brief signal bar, velocity ticker, intro receipt route /#receipt/{hash}, partner webhook via __dgWebhookUrl

**Hard copy constraints (John):** No reply-speed promises (48h/24h/2h/SLA/fastest). No founder name on site. Success = hello@ follow-up only.

**Competitive context (Heavy research):** Fonzi, Jack & Jill, Paraform, Mercor, YC WaaS — Demigod cannot win on speed/volume; wins on scarcity + warm SF intros.

**Partnership:** Option C hybrid (VC Portfolio Desk + cash referral track) documented — DEFERRED until first proof loop.

**Eat the Sounds game:** PAUSED — out of scope for all Demigod work.

**Strategic pivot (Heavy Creative Next):** Weaponize board JSON as proof artifact; 7 GTM plays; foot-core experiments ranked by proof velocity.

**Recent agent + Heavy adjudication:** Site = receipt printer; bottleneck = 0 real placements. Agent + Heavy agree: triage inbox, intake smoke, white-glove pilot, log proof, THEN outbound. Designer scrub deferred until scale.

**Session work completed:**
- npm run demigod:verify:all PASS (18 unit + source + live + receipt)
- Built: pilot-logger, receipt-mint, signal-theater, ghost-push, webhook-ensure, verify-receipt, copy-static-ai, submissions-triage, intake-smoke
- Inbox: 15 e2e items bulk-marked spam; 0 new real leads
- intake:smoke PASS; Turnstile blocks automated Webflow POST — manual hello@ check pending
- SuperGrok Heavy priority adjudicate (rate-limited partial reply) saved HEAVY-PRIORITY-ADJUDICATE.md

**Best-version forms spec (agent):** One-question wizard, unified webhook+hello@ delivery, company-name on startup, tap-to-edit review, policy-safe thanks.

**Known static HTML drift (runtime hidden):** within 24h in .w-form-done, step 03 Meet 3-5, #insights-section lorem, engineer mailto action.

**Board truth:** ${board?.roles?.length} roles (${board?.roles?.filter((r) => !/^role-seed/i.test(r.id)).length} non-seed), ${board?.candidates?.length} candidates, receipts: ${board?.receipts?.map((r) => r.hash).join(', ')}, signal: ${JSON.stringify(board?.signal || {})}

**Inbox:** ${inbox?.items?.length} total, ${inboxNew} new, ${inboxSpam} spam

**npm demigod scripts:** ~168 in package.json
`;

const bundle = {
  leverage: readJson(path.join(ROOT, 'DEMIGOD-LEVERAGE-STATUS.json')),
  statusReport: readJson(path.join(ROOT, 'DEMIGOD-STATUS-REPORT.json')),
  verifyLive: readJson(path.join(ROOT, 'DEMIGOD-VERIFY-LIVE.json')),
  verifySource: readJson(path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json')),
  verifyReceipt: readJson(path.join(ROOT, 'DEMIGOD-VERIFY-RECEIPT.json')),
  intakeSmoke: readJson(path.join(ROOT, 'DEMIGOD-INTAKE-SMOKE.json')),
  wizardPlaytest: readJson(path.join(ROOT, 'DEMIGOD-WIZARD-PLAYTEST.json'))?.pass,
  partnershipsPlaytest: readJson(path.join(ROOT, 'DEMIGOD-PARTNERSHIPS-PLAYTEST.json'))?.ok,
  tunnel: readJson(path.join(ROOT, 'DEMIGOD-TUNNEL.json')),
  inboxTriage: readJson(path.join(ROOT, 'DEMIGOD-INBOX-TRIAGE.json')),
  footCdn: readJson(path.join(ROOT, 'DEMIGOD-FOOT-CDN.json')),
};

const PRIOR_HEAVY = [
  'HEAVY-CREATIVE-NEXT.md',
  'HEAVY-PRIORITY-ADJUDICATE.md',
  'HEAVY-LEVERAGE-NEXT.md',
  'HEAVY-SITE-ARCHITECTURE-REPLY.md',
  'HEAVY-COMPETITORS-FEATURES-REPLY.md',
  'HEAVY-WEBSITE-AUDIT-2026.md',
].map((f) => `### ${f}\n${readTail(path.join(ROOT, f), 3500)}`).join('\n\n');

const PROMPT = `SuperGrok Heavy — FULL DEMIGOD PROJECT STATE REPORT (June 30 2026)

John wants you fully synced on the ENTIRE Demigod project — not just the last session. Read everything below. Then produce a comprehensive state-of-the-union + authoritative next-phase plan.

**IGNORE Eat the Sounds game completely.**

**HARD CONSTRAINTS:** No reply-speed promises on site. No founder name on site. hello@ only for contact.

${PROJECT_ARC}

---

## MACHINE TRUTH BUNDLE
${JSON.stringify(bundle, null, 2).slice(0, 22000)}

---

## PRIOR HEAVY OUTPUTS (tails)
${PRIOR_HEAVY.slice(0, 20000)}

---

## DELIVERABLE (min 10000 chars — full project report)

=== EXECUTIVE SUMMARY ===
5 sentences: what Demigod is, what's actually shipped, what's actually broken/missing, true bottleneck, single bet for next 14 days.

=== PART A: ARCHITECTURE & STACK ===
Webflow + foot-core + CDN + board JSON + webhook pipeline. What works. What's fragile. Diagram in prose.

=== PART B: WEBSITE STATE ===
Live UX (what visitors see via v65). Static HTML debt. Verify gate honesty. Shippable Y/N with evidence.

=== PART C: FORMS STATE ===
startup-hire, engineer-join, partner-apply — fields, wizard, delivery paths, Turnstile, inbox pipeline. Best version gaps. P0/P1/P2.

=== PART D: PROOF LOOP & BOARD ===
Seed vs real data. demo004 receipt. Inbox. What proof looks like after one pilot. Scripts to use.

=== PART E: OPS & AUTOMATION ===
Key npm scripts (grouped). Rituals after reboot. Webhook/tunnel fragility. What to harden.

=== PART F: GTM & POSITIONING ===
SF Human Signal Broker thesis. Which Heavy GTM plays are valid NOW vs after proof. DM/stunt rules.

=== PART G: PARTNERSHIP PROGRAM ===
Option C status. When to implement. What NOT to build.

=== PART H: PRIOR HEAVY SYNTHESIS ===
Table: prior recommendation | still valid? | superseded? | your verdict

=== PART I: ANTI-PRIORITIES (15 items) ===
What John must NOT do this month.

=== PART J: 14-DAY PLAN ===
Day-by-day or Mon/Wed/Fri blocks. Mix John human work + agent builds. Realistic 2-3 hrs/day.

=== PART K: BUILD BACKLOG (ranked 20 items) ===
Table: Rank | Build | Why | Hours | Blocker

=== PART L: CURSOR AGENT PROMPT ===
--- BEGIN CURSOR AGENT PROMPT ---
Top 3 agent builds from Part K with file names + verify commands. Respect copy policy.
--- END CURSOR AGENT PROMPT ---

=== PART M: ONE PARAGRAPH TO JOHN ===
Blunt motivational close.

Rules: Demigod only. Honest about fake seed data. Creative but proof-first.`;

async function collectReply(page) {
  let text = '';
  for (let i = 0; i < 45; i++) {
    await sleep(i < 3 ? 15000 : 20000);
    await collectGrokReply(page, { waitMs: 12000, minGrowth: 300 });
    const body = await page.evaluate(() => document.body?.innerText || '');
    const idx = body.lastIndexOf('=== EXECUTIVE SUMMARY ===');
    const chunk = idx >= 0 ? body.slice(idx) : body.slice(-40000);
    text = chunk.length > text.length ? chunk : text;
    const complete = /=== PART M: ONE PARAGRAPH/i.test(text) && text.length > 9000;
    const limited = /Upgrade to SuperGrok|unable to finish|before limit is gone/i.test(body);
    wlog(`heavy project-state poll ${i + 1}: len=${text.length} complete=${complete} limited=${limited}`);
    if (complete) break;
    if (limited && text.length > 5000) break;
  }
  return text;
}

function extractPrompt(text) {
  const m = text.match(/--- BEGIN CURSOR AGENT PROMPT ---([\s\S]*?)--- END CURSOR AGENT PROMPT ---/i);
  return m ? m[1].trim() : '';
}

async function main() {
  wlog('=== HEAVY PROJECT STATE START ===');
  const browser = await connectBrowser();
  let page = (await browser.pages()).find((p) => /grok\.com/i.test(p.url()));
  if (!page) {
    page = await browser.newPage();
    await page.goto('https://grok.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(4000);
  }
  await page.bringToFront();
  await page.evaluate(() => {
    [...document.querySelectorAll('button,a')].find((b) =>
      /new chat/i.test((b.textContent || b.getAttribute('aria-label') || '').trim()),
    )?.click();
  });
  await sleep(2500);

  wlog(`sending ${PROMPT.length} chars`);
  await sendToGrok(page, PROMPT);
  fs.writeFileSync(SENT, `${new Date().toISOString()}\n\n${PROMPT}`);

  const text = await collectReply(page);
  await browser.disconnect();

  const cursorPrompt = extractPrompt(text);
  const limited = /Upgrade to SuperGrok|unable to finish/i.test(text);
  const ok = text.length > 7000 && /=== PART [A-J]:/i.test(text);

  fs.writeFileSync(
    OUT,
    `# SuperGrok Heavy — Full Demigod Project State\n\n_Date: ${new Date().toISOString()}_\n_Limited: ${limited}_\n_Chars: ${text.length}_\n\n${text}\n`,
  );
  if (cursorPrompt) {
    fs.writeFileSync(OUT_PROMPT, `# Demigod Project State — Cursor Prompt\n\n${cursorPrompt}\n`);
  }
  const out = { at: new Date().toISOString(), chars: text.length, ok, limited, paths: { report: OUT, prompt: OUT_PROMPT, sent: SENT } };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== HEAVY PROJECT STATE END ===');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});