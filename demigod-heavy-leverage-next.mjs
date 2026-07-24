#!/usr/bin/env node
/** SuperGrok Heavy: highest leverage next actions — creative + blunt. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { connectBrowser, sendToGrok, collectGrokReply, sleep } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-LEVERAGE-NEXT.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-LEVERAGE-NEXT.json');
const OUT_PROMPT = path.join(ROOT, 'DEMIGOD-LEVERAGE-IMPLEMENT-PROMPT.md');
const SENT = path.join(ROOT, 'HEAVY-LEVERAGE-NEXT-SENT.txt');

spawnSync('node', ['demigod-leverage-status.mjs'], { cwd: ROOT, encoding: 'utf8' });

const STATUS = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-LEVERAGE-STATUS.json'), 'utf8'));

const AGENT_OPINION = `
Local agent opinion (for Heavy to challenge/refine):
- Site is "done enough" — v41, forms e2e, legal placeholders, trust block. More website work is low leverage.
- Partnership Option C is correct strategically but PREMATURE to implement before one proof loop (brief → match → hire or strong intro).
- Real bottleneck is likely DEMAND (startup briefs) not supply, not tech. Solo founder's time on matching + warm outreach beats programs.
- Highest leverage: (1) white-glove pilot with 1-3 warm founders, (2) <2h hello@ SLA + alerts, (3) one ally not a program, (4) Atlas/invoicing before first hire, (5) board JSON reflecting real pipeline.
- Creative wedge: "fastest human reply in SF startup hiring" — not platform, not marketplace.
- Existing scripts: demigod-submissions-webhook.mjs, demigod-webhook-setup.mjs, demigod-board-publish.mjs — may be underused.
`;

const PROMPT = `SuperGrok Heavy — HIGHEST LEVERAGE / LOWEST HANGING FRUIT for Demigod (June 2026)

John wants your strategic opinion + a minimal implementation plan. Challenge the local agent opinion below. Be creative, blunt, numbered. NOT a partnership program essay — what moves the needle THIS WEEK toward first placement or undeniable proof (3 strong intros).

## LIVE STATUS
${JSON.stringify(STATUS, null, 2)}

## LOCAL AGENT OPINION (challenge this)
${AGENT_OPINION}

## CONTEXT
- Demigod: 10% on hire, SF startups, human-matched, potter@trydemigod.com, solo founder John Potter
- Competitors: Fonzi (ledger), Jack & Jill (Friends 20%), Paraform (marketplace) — John should NOT copy marketplace
- Option C partnership plan exists but agent says defer until proof loop
- Eat the Sounds game is separate project — ignore

Research if useful: solo placement startup GTM, Fonzi/Jack&Jill early stage motion, YC Work at a Startup, founder-led recruiting wedge.

---

## DELIVERABLE FORMAT

=== STATUS ACK ===
(2 sentences: true bottleneck + single highest-leverage bet for next 7 days)

=== PART A: BOTTLENECK DIAGNOSIS ===
Rank likely constraints: demand (briefs) | supply (candidates) | ops (response speed) | trust (no proof) | legal (no entity)
Pick ONE primary bottleneck with evidence reasoning. Secondary bottleneck.

=== PART B: TOP 7 ACTIONS (THIS WEEK ONLY) ===
Table: Rank | Action | Hours | Leverage 1-10 | Owner (John|agent|both) | Done when

Include mix of: GTM (DMs/outreach), ops (webhook/SLA), site (minimal copy), business (Atlas). NO action >4 hours solo John time.

=== PART C: CREATIVE BETS (3 unconventional ideas) ===
Things John probably hasn't tried — specific, SF-relevant, low cost. Not generic "post on LinkedIn."

=== PART D: EXPLICIT ANTI-PRIORITIES (10 items) ===
What John should NOT touch this week (partnership pages, Heavy loops, canvas, etc.)

=== PART E: ONE WHITE-GLOVE PILOT PLAYBOOK ===
Step-by-step for ONE founder pilot: who to pick, exact DM script, what to deliver in 48h, how to ask permission for site quote, fallback if no hire.

=== PART F: AUTOMATION — 3 CUSTOM NPM SCRIPTS ===
Propose exactly 3 new scripts John's agent should build (names like demigod-*.mjs). For each:
- Purpose
- Inputs/outputs
- When to run
- Why higher leverage than more Webflow edits

Use existing: demigod-submissions-webhook.mjs, demigod-board-publish.mjs, demigod-webhook-setup.mjs

=== PART G: PARTNERSHIP OPTION C — WHEN? ===
Yes/no: implement Portfolio Desk kit this week? If no, what trigger? If yes, minimal scope only.

=== PART H: CURSOR AGENT PROMPT (ONE SMALL BUILD) ===
Write copy-paste prompt for local agent to implement THE single highest-leverage technical task from Part B (max 1-2 files, demigod-* only, include verify commands). Format:

--- BEGIN CURSOR AGENT PROMPT ---
...
--- END CURSOR AGENT PROMPT ---

=== PART I: 7-DAY SCORECARD ===
5 metrics John checks daily + pass/fail thresholds

=== PART J: ONE SENTENCE TO JOHN ===
Motivational but not cheesy — what to do tomorrow morning.

Rules: min 7000 chars, blunt, no Eat the Sounds, website changes only if Part B justifies.`;

async function collectReply(page) {
  let text = '';
  for (let i = 0; i < 36; i++) {
    await sleep(i < 3 ? 12000 : 15000);
    await collectGrokReply(page, { waitMs: 10000, minGrowth: 200 });
    const body = await page.evaluate(() => document.body?.innerText || '');
    const idx = body.lastIndexOf('=== STATUS ACK ===');
    const chunk = idx >= 0 ? body.slice(idx) : body.slice(-32000);
    text = chunk.length > text.length ? chunk : text;
    const complete = /=== PART J: ONE SENTENCE/i.test(text) && text.length > 6500;
    wlog(`heavy leverage poll ${i + 1}: len=${text.length} complete=${complete}`);
    if (complete) break;
  }
  return text;
}

function extractPrompt(text) {
  const m = text.match(/--- BEGIN CURSOR AGENT PROMPT ---([\s\S]*?)--- END CURSOR AGENT PROMPT ---/i);
  return m ? m[1].trim() : '';
}

async function main() {
  wlog('=== HEAVY LEVERAGE NEXT START ===');
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

  const cursorPrompt = extractPrompt(text);
  const ok = text.length > 6500 && /=== PART B:/i.test(text);

  fs.writeFileSync(
    OUT,
    `# SuperGrok Heavy — Highest Leverage Next\n\n_Date: ${new Date().toISOString()}_\n_Chars: ${text.length}_\n\n${text}\n`,
  );
  if (cursorPrompt) {
    fs.writeFileSync(OUT_PROMPT, `# Demigod Leverage — Cursor Implement Prompt\n\n${cursorPrompt}\n`);
  }

  const out = { at: new Date().toISOString(), chars: text.length, ok, paths: { plan: OUT, prompt: OUT_PROMPT } };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== HEAVY LEVERAGE NEXT END ===');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});