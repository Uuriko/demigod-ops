#!/usr/bin/env node
/** SuperGrok Heavy — adjudicate what to do FIRST post-v65 + agent deep analysis. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { connectBrowser, sendToGrok, collectGrokReply, sleep } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';
import { fetchLiveHtml, scanLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-PRIORITY-ADJUDICATE.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-PRIORITY.json');
const OUT_PROMPT = path.join(ROOT, 'DEMIGOD-PRIORITY-CURSOR-PROMPT.md');
const SENT = path.join(ROOT, 'HEAVY-PRIORITY-ADJUDICATE-SENT.txt');

spawnSync('node', ['demigod-leverage-status.mjs'], { cwd: ROOT, encoding: 'utf8' });
const STATUS = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-LEVERAGE-STATUS.json'), 'utf8'));

const board = JSON.parse(fs.readFileSync(path.join(ROOT, 'demigod-board.json'), 'utf8'));
const verify = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-VERIFY-LIVE.json'), 'utf8'));
const inbox = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8'));

const { html, footerCoreJs } = await fetchLiveHtml(true);
const scan = scanLiveHtml(html, { footerCoreJs });

const PRIOR_HEAVY = fs.existsSync(path.join(ROOT, 'HEAVY-CREATIVE-NEXT.md'))
  ? fs.readFileSync(path.join(ROOT, 'HEAVY-CREATIVE-NEXT.md'), 'utf8').slice(0, 5500)
  : '';

const AGENT_DEEP = `
## LOCAL AGENT DEEP ANALYSIS (challenge, refine, or overturn)

Thesis: The site is a RECEIPT PRINTER for human work — not the bottleneck.

### What visitors actually see (foot-core v65 runtime)
- superCleanup() HIDES legacy trust section, step "Meet Your 3-5", #insights-section lorem
- trust() INJECTS #demigod-trust-block with policy-safe COPY + live board JSON fetch
- okMsg() HIDES Webflow .w-form-done; wizard uses STARTUP_OK / ENGINEER_OK (no time promises)
- forms() strips mailto:, rewires startup-hire + engineer-join to Webflow POST
- Signal bar, velocity ticker, /#receipt/{hash}, partner webhook via __dgWebhookUrl all live
- npm run demigod:verify:all PASS (18 unit + source + live + receipt)

### Static HTML still has (invisible to normal JS users)
- "within 24 hours" in startup .w-form-done (hidden by okMsg)
- step 03 "Meet Your 3-5 Candidates" (section hidden)
- #insights-section lorem (display:none)
- engineer form action=mailto: (stripped at runtime)

### Agent proposed order
1. Prove brief intake end-to-end (Webflow form → hello@ actually receives)
2. ONE white-glove pilot offline (warm founder, no site changes needed)
3. Log proof (pilot:log → receipt:mint → board publish)
4. Static HTML Designer scrub BEFORE scaled outbound (not before pilot)
5. Stable webhook URL only when partner GTM active (core hire/join uses Webflow native)

### Tension with prior Heavy (HEAVY-CREATIVE-NEXT)
- Heavy said: signal theater first, then DM screenshot bomb tomorrow morning
- Agent says: DM bomb with seed board + demo004 receipt is embarrassing — pilot first
- Heavy anti-priorities included "Designer cleanup" — static scrub conflicts with that
- Heavy Part J said run demigod-signal-theater --dm-list 50-seeds immediately

### Scripts ALREADY BUILT since Heavy creative doc
demigod-signal-theater.mjs, demigod-receipt-mint.mjs, demigod-ghost-push.mjs,
demigod-pilot-logger.mjs, demigod-webhook-ensure.mjs, demigod-verify-receipt.mjs,
demigod-copy-static-ai.mjs — v65 foot-core shipped.

### Business truth
- board: ${board.roles?.length} roles (${board.roles?.filter((r) => !/^role-seed/i.test(r.id)).length} non-seed), ${board.candidates?.length} candidates, receipts: ${board.receipts?.map((r) => r.hash).join(', ')}
- inbox: ${inbox.items?.length} items, ${inbox.items?.filter((i) => i.status === 'new').length} new
- 0 logged real placements / pilots
- Webhook: localtunnel (fragile), partner path only
`;

const CONSTRAINTS = `
HARD CONSTRAINTS: No reply-speed promises on site (no 48h, 24h, 2h, SLA, "fastest").
No founder name on site. hello@ only. Eat the Sounds game out of scope.
`;

const PROMPT = `SuperGrok Heavy — PRIORITY ADJUDICATION (post-v65, June 30 2026)

John asked local agent to think deeper about what should be done FIRST and WHY.
Agent wrote the analysis below. Your job: adjudicate. Be blunt. Kill bad advice. Commit to an ordered stack.

${CONSTRAINTS}

## LIVE STATUS
${JSON.stringify({ STATUS, verifyPass: verify.pass, staticDrift: scan.staticDrift, footVersion: scan.footerCoreCopy?.version, boardSignal: board.signal, liveWebhook: verify.htmlScan?.liveWebhookUrl }, null, 2)}

${AGENT_DEEP}

## PRIOR HEAVY CREATIVE DOC (first 5500 chars — you wrote this)
${PRIOR_HEAVY}

---

## DELIVERABLE (min 6000 chars — adjudication not recap)

=== ACK ===
2 sentences: who is right (agent vs prior Heavy) on ordering + the ONE thing that must happen in the next 24 hours

=== PART A: THE RECEIPT PRINTER THESIS ===
Is "site is receipt printer, bottleneck is proof loop" correct or dangerously wrong for Demigod in June 2026?
When does static HTML / Designer scrub actually matter vs when is it vanity?
300+ words.

=== PART B: ORDERED STACK (TOP 10) ===
Numbered list. Each item: Action | Why this position (not earlier/later) | Owner (John|agent|both) | Hours | Kill criteria (when to skip)

Must include and explicitly rank relative to each other:
- Brief intake smoke test
- White-glove pilot (warm founder)
- demigod-signal-theater DM bomb
- Static HTML Designer scrub
- demigod-webhook-ensure / stable URL
- Board JSON honesty (seed vs real)
- Partner inbox triage
- More foot-core / npm scripts
- IRL coffee roulette
- Anti-AI spam public stunt

=== PART C: ADJUDICATE PRIOR HEAVY PART J ===
Heavy said "tomorrow morning run signal-theater DM 50 seeds."
Yes/no/maybe-with-conditions. Exact conditions for when DM bomb is allowed.

=== PART D: WHAT AGENT GOT WRONG ===
List 3-5 errors or blind spots in the local agent analysis. Be specific.

=== PART E: WHAT TO BUILD NEXT (IF ANYTHING) ===
Max 1 technical build + max 1 ops ritual. Or explicitly "build nothing — execute GTM."
If build: name files, why higher leverage than John's time on intros.

=== PART F: 72-HOUR CALENDAR ===
Hour-by-hour or block schedule for solo founder (realistic 2-3 hrs/day max). No fantasy.

=== PART G: CURSOR AGENT PROMPT ===
--- BEGIN CURSOR AGENT PROMPT ---
Single highest-leverage task from Part B that agent can do WITHOUT John (max 2 files, demigod-* only, verify commands). Or "STOP BUILDING — John does X."
--- END CURSOR AGENT PROMPT ---

=== PART H: ONE SENTENCE ===
What John does before coffee gets cold tomorrow.

Rules: Demigod website + ops only. Respect copy constraints. Creative > safe but proof > polish.`;

async function collectReply(page) {
  let text = '';
  for (let i = 0; i < 40; i++) {
    await sleep(i < 3 ? 15000 : 18000);
    await collectGrokReply(page, { waitMs: 12000, minGrowth: 250 });
    const body = await page.evaluate(() => document.body?.innerText || '');
    const idx = body.lastIndexOf('=== ACK ===');
    const chunk = idx >= 0 ? body.slice(idx) : body.slice(-35000);
    text = chunk.length > text.length ? chunk : text;
    const complete = /=== PART H: ONE SENTENCE/i.test(text) && text.length > 5500;
    const limited = /Upgrade to SuperGrok|unable to finish|before limit is gone/i.test(body);
    wlog(`heavy priority poll ${i + 1}: len=${text.length} complete=${complete} limited=${limited}`);
    if (complete) break;
    if (limited && text.length > 3000) break;
  }
  return text;
}

function extractPrompt(text) {
  const m = text.match(/--- BEGIN CURSOR AGENT PROMPT ---([\s\S]*?)--- END CURSOR AGENT PROMPT ---/i);
  return m ? m[1].trim() : '';
}

async function main() {
  wlog('=== HEAVY PRIORITY ADJUDICATE START ===');
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
  const ok = text.length > 4500 && /=== PART B:/i.test(text);

  fs.writeFileSync(
    OUT,
    `# SuperGrok Heavy — Priority Adjudication (post-v65)\n\n_Date: ${new Date().toISOString()}_\n_Limited: ${limited}_\n_Chars: ${text.length}_\n\n${text}\n`,
  );
  if (cursorPrompt) {
    fs.writeFileSync(OUT_PROMPT, `# Demigod Priority — Cursor Prompt\n\n${cursorPrompt}\n`);
  }
  const out = { at: new Date().toISOString(), chars: text.length, ok, limited, paths: { plan: OUT, prompt: OUT_PROMPT } };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== HEAVY PRIORITY ADJUDICATE END ===');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});