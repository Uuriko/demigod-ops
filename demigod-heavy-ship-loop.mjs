#!/usr/bin/env node
/** Heavy: close submissions loop + review gate + static drift — Demigod only. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-SHIP-LOOP.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-SHIP-LOOP.json');

async function collect(page, minLen = 3500) {
  let text = '';
  for (let i = 0; i < 28; i++) {
    const reply = await collectGrokReply(page, { waitMs: 60000, minGrowth: 120 });
    text = reply.text || text;
    const tail = text.slice(-25000);
    const busy = reply.thinking || /thinking|Finalizing/i.test(tail);
    const ready = /=== PROMPT FOR CURSOR AGENT ===/i.test(text) && /REVIEW GATE|webhook|drift/i.test(text);
    if (text && !busy && ready && tail.length >= minLen) break;
    wlog(`heavy ship-loop poll ${i + 1}: len=${tail.length} busy=${busy}`);
  }
  return text;
}

async function main() {
  const board = fs.existsSync(path.join(ROOT, 'DEMIGOD-BOARD.json'))
    ? JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-BOARD.json'), 'utf8'))
    : {};
  const PROMPT = `SuperGrok Heavy — SHIP THE LOOP for trydemigod.com (Demigod only).

CRITICAL: NO Tally. NO eat-the-sounds game. Native Webflow forms only.

## DONE (do not redo)
- Forms v36 trimmed (Fonzi-style): startup 7 fields, engineer 8 fields
- Foot-core CDN live, verify PASS
- Incognito submit → hello@ works with resume
- Submissions code: demigod-submissions-webhook.mjs :9877, demigod-submissions-lib.mjs, board CDN

## SHIP NOW (your job)
1. **Review gate architecture** — new submissions → inbox only; human approves → featured board. Rules for auto-reject/spam. CLI approve flow.
2. **Webflow webhook wiring** — form_submission trigger for startup-hire + engineer-join. Tunnel vs Make.com vs always-on host. Payload parse for Webflow v2 envelope.
3. **Static drift cleanup** — email-form, TalentLink, METHODOLOGY in view-source. Designer steps vs runtime-only OK?
4. **Board seed data** — 3 roles + 2 candidates placeholder until real approvals. Dedupe policy.
5. **E2E acceptance** — exact test sequence after wiring.

## Constraints
- Vanilla JS foot-core + JSON CDN board
- Anonymize before featured cards (no PII)
- Max 6 roles + 4 candidates on homepage
- Webflow Starter plan

## Deliverable format
=== STATUS ACK ===
=== REVIEW GATE SPEC ===
=== WEBHOOK + TUNNEL SPEC ===
=== STATIC DRIFT STEPS ===
=== BOARD CURATION RULES ===
=== E2E ACCEPTANCE ===
=== PROMPT FOR CURSOR AGENT === (20+ numbered steps, AUTOMATED vs HUMAN, STOP condition)

Current board: ${(board.roles || []).length} roles, ${(board.candidates || []).length} candidates.
Be blunt. Execute now.`;

  wlog('=== HEAVY SHIP LOOP START ===');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) throw new Error('no grok tab');
  await page.bringToFront();
  await sendToGrok(page, PROMPT);
  const text = await collect(page);
  await browser.disconnect();

  const hasPrompt = /=== PROMPT FOR CURSOR AGENT ===/i.test(text);
  fs.writeFileSync(OUT, `# SuperGrok Heavy — Ship Loop\n\n_${new Date().toISOString()}_\n\n${text}\n`);
  fs.writeFileSync(OUT_JSON, JSON.stringify({ at: new Date().toISOString(), chars: text.length, hasPrompt, path: OUT }, null, 2));
  console.log(JSON.stringify({ chars: text.length, hasPrompt, path: OUT }));
  wlog('=== HEAVY SHIP LOOP END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });