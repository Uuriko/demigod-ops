#!/usr/bin/env node
/** Full audit + Heavy history digest → SuperGrok Heavy consult (build-focused). */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { connectBrowser, sendToGrok, collectGrokReply, sleep } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-FULL-SYNC.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-FULL-SYNC.json');
const OUT_PROMPT = path.join(ROOT, 'DEMIGOD-HEAVY-FULL-SYNC-PROMPT.md');
const SENT = path.join(ROOT, 'HEAVY-FULL-SYNC-SENT.txt');

function runNode(script) {
  const r = spawnSync('node', [script], { cwd: ROOT, encoding: 'utf8', timeout: 180000 });
  return { script, ok: r.status === 0, status: r.status, tail: (r.stdout || r.stderr || '').slice(-800) };
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function readMdTail(p, max = 8000) {
  try {
    const t = fs.readFileSync(p, 'utf8');
    return t.length > max ? `…${t.slice(-max)}` : t;
  } catch { return '(missing)'; }
}

const CONVERSATION_BRIEF = `
## Recent Cursor ↔ John conversation (June 2026)

1. **John corrected agent:** Site is NOT shippable. Stop GTM/outbound talk. Focus on building and improving.
2. **Agent opinion (revised):** verify PASS is misleading — site is ~60% JS/CSS patches over TalentLink template. Designer canvas still has bloat (METHODOLOGY, SYNDICATE, FAQ, mega-footer). Fake placement rows in foot-core matchRows.
3. **Form improvements discussed:**
   - Simplify fields (Fonzi/Standout patterns): merge engineer skills+shipped, resume OR LinkedIn, notice period, optional comp
   - **Typeform/Tally feel:** stepped wizard (one question per screen), welcome/thank-you, progress bar, card pickers, drop zone uploads, Enter-to-continue — all in vanilla JS wrapping native Webflow forms (keep Turnstile + hello@ notifications)
4. **Partnership Option C** (Portfolio Desk hybrid) researched and documented but **deferred** until proof loop — John wants build not programs now.
5. **GTM scripts built** (dm-blast, sla-pager, proof-logger) — low priority vs site/forms polish per John.
6. **NEW:** John wants **Webflow CMS** for blog posts + content section/page. Need Heavy's architecture + collection schema + how it fits homepage without bloat.
7. **Current stack:** native Webflow forms startup-hire + engineer-join, demigod-foot-core.js v41, demigod-head-minimal.html + head CSS on Catbox CDN, NOT Tally (deprecated for live).
`;

const steps = [
  'demigod-leverage-status.mjs',
  'demigod-system-audit.mjs',
  'demigod-heavy-history-digest.mjs',
  'demigod-forms-full-audit.mjs',
];

wlog('=== HEAVY FULL SYNC: pre-audits ===');
const stepResults = steps.map(runNode);
spawnSync('node', ['demigod-full-audit.mjs'], { cwd: ROOT, encoding: 'utf8', timeout: 240000 });
spawnSync('node', ['demigod-verify-live.mjs'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });

const bundle = {
  leverage: readJson(path.join(ROOT, 'DEMIGOD-LEVERAGE-STATUS.json')),
  system: readJson(path.join(ROOT, 'DEMIGOD-SYSTEM-AUDIT.json')),
  verify: readJson(path.join(ROOT, 'DEMIGOD-VERIFY-LIVE.json')),
  forms: readJson(path.join(ROOT, 'DEMIGOD-FORMS-FULL-AUDIT.json')),
  fullAudit: readJson(path.join(ROOT, 'DEMIGOD-FULL-AUDIT.json')),
  historyTopics: readJson(path.join(ROOT, 'DEMIGOD-HEAVY-HISTORY-DIGEST.json'))?.topics,
  visualFindings: readJson(path.join(ROOT, 'DEMIGOD-VISUAL-AUDIT.json'))?.findings?.slice?.(0, 8),
};

const PROMPT = `SuperGrok Heavy — DEMIGOD FULL SYNC (build phase, NOT GTM)

John wants you synced on everything we've discussed + full audits. Your job: synthesize prior Heavy threads, audit verdict, and produce a **2-week build plan** centered on:
- Making site actually shippable (Designer deletes + fewer JS patches)
- Typeform/Tally-quality form wizard on native Webflow forms
- Webflow CMS for blog/content

**IGNORE Eat the Sounds game entirely.**

${CONVERSATION_BRIEF}

---

## LIVE AUDIT BUNDLE (machine truth)
${JSON.stringify(bundle, null, 2).slice(0, 28000)}

## HEAVY HISTORY DIGEST (topic index)
${readMdTail(path.join(ROOT, 'DEMIGOD-HEAVY-HISTORY-DIGEST.md'), 12000)}

## PRIOR KEY ARTIFACTS ON DISK
- HEAVY-DEMIGOD-SIMPLIFY.md, DESIGN-AUDIT, FORMS-FEEDBACK, INTAKE-FORMS-RESEARCH
- HEAVY-PARTNERSHIP-HYBRID-C.md (Option C — deferred)
- HEAVY-LEVERAGE-NEXT.md (GTM — deprioritized per John)
- DEMIGOD-DESIGNER-DELETE-CHECKLIST.txt
- DEMIGOD-VISUAL-AUDIT.json (12 issues, many still open)

---

## DELIVERABLE FORMAT (min 9000 chars)

=== STATUS ACK ===
(3 sentences: true state of site + what John wants + your single highest-priority build bet)

=== PART A: PRIOR HEAVY THREAD SYNTHESIS ===
Table: Thread/file | Topic | Key decision still valid? | Superseded by what?

Cover at minimum: forms (Tally→native pivot), design masters, simplify/delete list, competitive intake research, partnership Option C, leverage/GTM, copy/trust, submissions pipeline.

=== PART B: FULL AUDIT VERDICT ===
**Forms:** P0/P1/P2 issues from audits + wizard recommendation
**Website:** what's still not shippable (numbered, severity)
**Computer/workspace:** CDP, scripts, drift risks

=== PART C: TYPEFORM/TALLY WIZARD SPEC ===
Exact stepped flows for startup-hire + engineer-join (screens, fields, copy, motion). What stays Webflow-native vs foot-core JS. Acceptance criteria.

=== PART D: WEBFLOW CMS PLAN ===
Collections schema (Blog Posts minimum), template page, nav link, how to render on homepage (teaser), Starter plan limits, MCP vs Designer steps. Max 2 collections for MVP.

=== PART E: 2-WEEK BUILD PRIORITY (14 tasks) ===
Table: Day | Task | Owner (John|agent|MCP) | Hours | Done when
NO GTM. NO outbound. Building only.

=== PART F: DESIGNER DELETE LIST (final) ===
Numbered canvas deletes still required (consolidate all prior Heavy lists).

=== PART G: EXPLICIT ANTI-PRIORITIES ===
10 things NOT to do this sprint.

=== PART H: CURSOR AGENT PROMPT ===
--- BEGIN CURSOR AGENT PROMPT ---
One focused implement pass: wizard P0 OR CMS scaffold — pick ONE, max 2 files + verify commands.
--- END CURSOR AGENT PROMPT ---

=== PART I: ONE SENTENCE TO JOHN ===

Blunt. Build-focused. Reference CMS + forms wizard.`;

function extractPrompt(text) {
  const m = text.match(/--- BEGIN CURSOR AGENT PROMPT ---([\s\S]*?)--- END CURSOR AGENT PROMPT ---/i);
  return m ? m[1].trim() : '';
}

async function collectReply(page) {
  let text = '';
  for (let i = 0; i < 40; i++) {
    await sleep(i < 3 ? 12000 : 15000);
    await collectGrokReply(page, { waitMs: 10000, minGrowth: 200 });
    const body = await page.evaluate(() => document.body?.innerText || '');
    const idx = body.lastIndexOf('=== STATUS ACK ===');
    const chunk = idx >= 0 ? body.slice(idx) : body.slice(-40000);
    text = chunk.length > text.length ? chunk : text;
    const complete = /=== PART I: ONE SENTENCE/i.test(text) && text.length > 8500;
    wlog(`heavy full sync poll ${i + 1}: len=${text.length} complete=${complete}`);
    if (complete) break;
  }
  return text;
}

async function main() {
  fs.writeFileSync(
    path.join(ROOT, 'DEMIGOD-FULL-SYNC-PREAUDIT.json'),
    JSON.stringify({ at: new Date().toISOString(), stepResults, bundleKeys: Object.keys(bundle) }, null, 2),
  );

  wlog('=== HEAVY FULL SYNC: grok dispatch ===');
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
  fs.writeFileSync(SENT, `${new Date().toISOString()}\n\n${PROMPT.slice(0, 50000)}`);

  const text = await collectReply(page);
  await browser.disconnect();

  const cursorPrompt = extractPrompt(text);
  const ok = text.length > 8500 && /=== PART B:/i.test(text);

  fs.writeFileSync(
    OUT,
    `# SuperGrok Heavy — Demigod Full Sync\n\n_Date: ${new Date().toISOString()}_\n_Chars: ${text.length}_\n\n${text}\n`,
  );
  if (cursorPrompt) {
    fs.writeFileSync(OUT_PROMPT, `# Demigod Full Sync — Cursor Implement Prompt\n\n${cursorPrompt}\n`);
  }

  const out = {
    at: new Date().toISOString(),
    chars: text.length,
    ok,
    preaudit: stepResults,
    paths: { plan: OUT, prompt: OUT_PROMPT, sent: SENT, digest: 'DEMIGOD-HEAVY-HISTORY-DIGEST.md' },
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== HEAVY FULL SYNC END ===');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});