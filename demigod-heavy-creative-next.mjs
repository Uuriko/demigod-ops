#!/usr/bin/env node
/** SuperGrok Heavy — creative deep next moves post-v64 copy policy + dynamic ledger. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { connectBrowser, sendToGrok, collectGrokReply, sleep } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-CREATIVE-NEXT.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-CREATIVE-NEXT.json');
const OUT_PROMPT = path.join(ROOT, 'DEMIGOD-CREATIVE-IMPLEMENT-PROMPT.md');
const SENT = path.join(ROOT, 'HEAVY-CREATIVE-NEXT-SENT.txt');

spawnSync('node', ['demigod-leverage-status.mjs'], { cwd: ROOT, encoding: 'utf8' });
const STATUS = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-LEVERAGE-STATUS.json'), 'utf8'));

const COMPETITORS_DIGEST = fs.existsSync(path.join(ROOT, 'HEAVY-COMPETITORS-FEATURES-REPLY.md'))
  ? fs.readFileSync(path.join(ROOT, 'HEAVY-COMPETITORS-FEATURES-REPLY.md'), 'utf8').slice(0, 4500)
  : '';

const CONSTRAINTS = `
## HARD CONSTRAINTS (non-negotiable — override your prior SLA/John advice)
- Site must NOT promise reply speed (no 48h, 2h, SLA badges, "fastest reply")
- Site must NOT mention founder name (no John, no personal SLA surface)
- Success copy: generic potter@trydemigod.com follow-up only
- foot-core v64 already scrubs Webflow canvas leaks at runtime
`;

const SHIPPED = `
## ALREADY SHIPPED (do not re-recommend)
- Dynamic placement ledger: fetchBoard() + board JSON CDN → trust block (v63/v64)
- Copy policy scrub: patchMeta, scrubInputs, SPEED_LEAK cleanup
- Forms wizards, partnerships page, legal, 10% pricing, partner modal
- verify:all PASS, live v64 on catbox CDN
`;

const PROMPT = `SuperGrok Heavy — CREATIVE DEEP DIVE: What should Demigod do NEXT?

John wants you to think deeper than "ship the ledger" — that's done. Be creative, unconventional, blunt. Research 2026 if useful. Challenge boring startup advice.

${CONSTRAINTS}

${SHIPPED}

## LIVE STATUS
${JSON.stringify(STATUS, null, 2)}

## PRIOR HEAVY COMPETITORS CONTEXT (first 4500 chars)
${COMPETITORS_DIGEST}

## ARCHITECTURE EDGE (use this creatively)
- Webflow shell + demigod-foot-core.js IIFE on CDN (vanilla JS, no build)
- Board JSON on catbox → live trust block updates without Webflow publish
- Submissions webhook pipeline exists locally; partner form needs public __dgWebhookUrl
- Solo founder ops — every hour must compound proof or demand

## THE REAL GAP
Board has SEED roles/candidates, zero logged real placements. Site looks ready; trust loop is empty. J&J matches 10% price. Demigod cannot win on fee or AI speed.

---

## DELIVERABLE (min 8000 chars — net-new, not recap)

=== ACK ===
2 sentences: what's actually true now + the ONE creative bet for next 14 days

=== PART A: REFRAME THE CATEGORY ===
What IS Demigod if it's not a job board, not an AI agent, not a recruiter marketplace? Name 3 "category labels" competitors can't copy. Pick the winner. Explain like a positioning essay (300+ words).

=== PART B: CREATIVE GTM (7 plays) ===
Unconventional, SF-specific, <$200 or <4hr founder time each. NOT "post on LinkedIn." Include:
- 2 plays that USE the live board JSON as marketing artifact (screenshot, DM, embed, etc.)
- 1 play that piggybacks Wellfound/YC WaaS noise
- 1 play that turns anti-AI-spam into a public stunt
- 1 play for candidate-side supply without spamming
Table: Play | Mechanism | Expected signal in 7 days | Risk

=== PART C: PRODUCT EXPERIMENTS (foot-core only, no Webflow) ===
5 experiments implementable via demigod-foot-core.js + npm scripts ONLY. Respect copy constraints.
Examples of the caliber wanted: "Brief Quality Score" public counter, "Open Role Ghost Board" fed only by real briefs, "Intro Receipt" hash page, etc.
Rank by proof velocity. Hours estimate each.

=== PART D: PROOF LOOP DESIGN ===
Design the minimum viable proof loop WITHOUT naming the founder on site:
- What gets logged to board JSON at each stage (brief received → intros sent → hire)
- What can be public vs must stay private
- The exact moment Demigod earns the right to add a testimonial quote (anonymized OK)
- 3 rows that should be on the board after ONE good pilot week

=== PART E: ANTI-PRIORITIES ===
12 things to NOT do (include: SLA surface, more Webflow polish, Stripe, community events, Heavy research loops, etc.)

=== PART F: 14-DAY SEQUENCE ===
Day-by-day (or Mon/Wed/Fri blocks) for solo founder — mix GTM + ops + one agent build. Realistic 2-3 hrs/day max.

=== PART G: THREE NPM SCRIPTS TO BUILD ===
demigod-*.mjs names, purpose, CLI flags, why each beats another website hour

=== PART H: CURSOR AGENT PROMPT ===
--- BEGIN CURSOR AGENT PROMPT ---
Single highest-leverage build from Part C (max 2 files). Include verify commands. Respect copy policy.
--- END CURSOR AGENT PROMPT ---

=== PART I: ONE WILD CARD ===
One idea that sounds stupid but might work in SF founder culture in 2026. Commit to it or kill it with reasoning.

=== PART J: ONE SENTENCE ===
What to do tomorrow morning before coffee gets cold.

Rules: creative > safe. No Eat the Sounds. No reply-time promises in any suggested copy.`;

async function collectReply(page) {
  let text = '';
  for (let i = 0; i < 40; i++) {
    await sleep(i < 3 ? 15000 : 18000);
    const reply = await collectGrokReply(page, { waitMs: 12000, minGrowth: 250 });
    if (reply.thinking) continue;
    const body = reply.text || (await page.evaluate(() => document.body?.innerText || ''));
    const idx = body.lastIndexOf('=== ACK ===');
    const chunk = idx >= 0 ? body.slice(idx) : body.slice(-35000);
    text = chunk.length > text.length ? chunk : text;
    const complete = /=== PART J: ONE SENTENCE/i.test(text) && text.length > 7500;
    wlog(`heavy creative poll ${i + 1}: len=${text.length} complete=${complete}`);
    if (complete && !reply.stale) break;
  }
  return text;
}

function extractPrompt(text) {
  const m = text.match(/--- BEGIN CURSOR AGENT PROMPT ---([\s\S]*?)--- END CURSOR AGENT PROMPT ---/i);
  return m ? m[1].trim() : '';
}

async function main() {
  wlog('=== HEAVY CREATIVE NEXT START ===');
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
  const ok = text.length > 6000 && /=== PART B:/i.test(text);

  fs.writeFileSync(
    OUT,
    `# SuperGrok Heavy — Creative Next (post-v64)\n\n_Date: ${new Date().toISOString()}_\n_Limited: ${limited}_\n_Chars: ${text.length}_\n\n${text}\n`,
  );
  if (cursorPrompt) {
    fs.writeFileSync(OUT_PROMPT, `# Demigod Creative — Cursor Implement Prompt\n\n${cursorPrompt}\n`);
  }
  const out = { at: new Date().toISOString(), chars: text.length, ok, limited, paths: { plan: OUT, prompt: OUT_PROMPT } };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== HEAVY CREATIVE NEXT END ===');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});