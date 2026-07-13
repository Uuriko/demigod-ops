#!/usr/bin/env node
/** Full session report → SuperGrok Heavy → deep research on what to work on next. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';
import { fetchLiveHtml, scanLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-NEXT-RESEARCH.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-NEXT-RESEARCH.json');
const SENT = path.join(ROOT, 'HEAVY-NEXT-RESEARCH-SENT.txt');

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return null; }
}

async function collectHeavy(page, minLen = 6000) {
  let text = '';
  for (let i = 0; i < 36; i++) {
    const reply = await collectGrokReply(page, { waitMs: 60000, minGrowth: 150 });
    text = reply.text || text;
    const tail = text.slice(-35000);
    const busy = reply.thinking || /thinking|Finalizing|Agents thinking/i.test(tail);
    const hasA = /=== PART A:/i.test(text);
    const hasB = /=== PART B:/i.test(text);
    const hasTable = /\|.*\|.*\|/.test(text);
    if (text && !busy && hasA && hasB && hasTable && tail.length >= minLen) break;
    if (text && !busy && tail.length >= minLen * 2 && i >= 12) break;
    wlog(`heavy next-research poll ${i + 1}: len=${tail.length} busy=${busy}`);
  }
  return text;
}

async function main() {
  spawnSync('node', ['demigod-status-report.mjs'], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
  spawnSync('npm', ['run', 'demigod:verify:live'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });

  const { html, footerCoreJs } = await fetchLiveHtml(true);
  const scan = scanLiveHtml(html, { footerCoreJs });
  let legalStatus = 404;
  try {
    const r = await fetch(`https://www.trydemigod.com/legal?v=${Date.now()}`);
    legalStatus = r.status;
  } catch (_) { /* ignore */ }

  const SESSION_DONE = `
## SESSION COMPLETED (June 29–30, 2026) — report to Heavy

### Favicon
- Generated 3 options; chose **Option B** (gold D + wing) — \`assets/favicon/demigod-favicon-v1.jpg\`
- CDN: https://files.catbox.moe/qt41n8.jpg
- Wired in demigod-head-minimal.html + foot-core favicon()

### Foot-core v47 (demigod-foot-core.js)
- CMS_ITEMS lorem ipsum + cms() injects #demigod-cms-block (skips if #insights-section exists)
- legalRoute() + legal() — Privacy/Terms in #demigod-legal-wrap; hidden on homepage; shown on /legal
- Footer: #dg-footer-legal links → /legal#privacy, /legal#terms, /legal
- foot() hides mega-columns, socials, orphan links; injects tagline + hello@ + © 2026
- hashchange/popstate listeners for legal anchors
- CDN: ${readJson('DEMIGOD-FOOT-CDN.json')?.cdnUrl || 'unknown'}

### Head CSS
- Footer legal nav polish, centered layout
- CDN: demigod-head-styles.css via catbox (see demigod-head-minimal.html)

### Webflow Designer (AI + automation)
- **Insights CMS collection** created with 3 lorem items (Title, Category, Date, Excerpt)
- **Homepage #insights-section** — static 3-column "Insights & updates" grid (live on trydemigod.com)
- Footer simplified in canvas (tagline + email + copyright)
- Webflow AI **cannot create pages** — /legal still 404
- CDP automation attempted legal page; modal create unreliable

### Verification
- npm run demigod:verify:all — PASS (0 findings, formsOk, mcpGone)
- foot-core v47 live, playtest PASS

### SuperGrok Heavy audits (prior turn)
- HEAVY-WEBSITE-AUDIT-2026.md, HEAVY-DEMIGOD-CODE-HELP.md, HEAVY-DEMIGOD-DESIGN-AUDIT.md
- Some Heavy replies garbled/truncated — treat live verify + screenshots as truth

### Still open / blockers
1. **/legal returns 404** — needs human: Pages → + → Create page → Legal / legal → Publish
2. CMS grid is **static** not bound to Insights collection (AI said binding unsupported)
3. Inline Privacy/Terms may still exist on homepage canvas (JS hides at runtime)
4. Designer canvas bloat still hidden by JS (METHODOLOGY, SYNDICATE, FAQ, etc.)
5. engineer form still has mailto: action in static HTML (foot-core strips)
6. github-url, portfolio-url still in static HTML (foot-core rmF)
7. Fake placement rows in trust block (matchRows in foot-core)
8. No entity/Atlas/invoicing yet (business ops)
9. Form wizard (dg-wiz) exists but needs human incognito smoke test (Turnstile blocks CDP)
10. Webflow MCP auth only — not fully connected for agent edits
`;

  const signals = {
    at: new Date().toISOString(),
    verify: readJson('DEMIGOD-VERIFY-LIVE.json'),
    status: readJson('DEMIGOD-STATUS-REPORT.json'),
    footCdn: readJson('DEMIGOD-FOOT-CDN.json'),
    legalPageStatus: legalStatus,
    footVersion: scan.footerCoreCopy?.version,
    pageScan: scan.pageScan,
    forms: scan.forms,
    staticDrift: scan.staticDrift,
    insightsSectionLive: /id="insights-section"/i.test(html),
    hasStartupHire: /data-name=["']startup-hire/i.test(html),
    hasEngineerJoin: /data-name=["']engineer-join/i.test(html),
  };

  const PROMPT = `SuperGrok Heavy — DEMIGOD SESSION HANDOFF + DEEP RESEARCH

John wants you fully synced on what the Cursor agent just shipped, then **deep research** on what to work on, add, change, improve, fix, audit, and test NEXT.

**Scope:** trydemigod.com / Demigod startup only. **Ignore Eat the Sounds game.**

**John's ask:** "What else should we work on?" — exhaustive prioritized backlog, not generic GTM unless proof-loop ready.

---

${SESSION_DONE}

---

## LIVE MACHINE TRUTH
${JSON.stringify(signals, null, 2)}

---

## DELIVERABLE FORMAT (minimum 8000 chars, blunt, numbered)

=== STATUS ACK ===
3 sentences: true site state, biggest remaining gap, single highest-leverage bet for next 48 hours.

=== PART A: SESSION VERDICT ===
What the agent did well (5 bullets). What was wasted effort (3 bullets). What still lies (verify PASS but not shippable?).

=== PART B: P0 BLOCKERS (fix before anything else) ===
Table: # | Issue | Owner (John|agent|both) | Hours | Done when
Include /legal, publish, forms, trust proof, entity if relevant.

=== PART C: WEBSITE BUILD BACKLOG (20 items) ===
Table: Rank | Task | Type (fix|add|improve|audit|test|delete) | Webflow|JS|ops | Hours | Impact 1-10
Mix: Designer deletes, CMS binding, legal page, form wizard polish, SEO meta, a11y, mobile, copy, trust signals.

=== PART D: FORM & SUBMISSIONS DEEP DIVE ===
Startup-hire + engineer-join: field audit, wizard UX, Turnstile, hello@ notify, webhook (demigod-submissions-*), incognito test plan.

=== PART E: CMS & CONTENT ROADMAP ===
Insights collection → bind to homepage, blog template, legal content strategy, lorem → real copy timeline.

=== PART F: AUDIT & TEST PLAN ===
Exact commands + human checks for next ship gate (verify, capture:audit, playtest, form smoke, legal page, mobile).

=== PART G: ANTI-PRIORITIES (15 items) ===
What NOT to touch this week and why.

=== PART H: COMPETITIVE RESEARCH (2025–2026) ===
Fonzi, Jack & Jill, Dover, Work at a Startup, Paraform — what Demigod should echo vs avoid on site + forms. One SF hiring trend to lean into.

=== PART I: 7-DAY EXECUTION CALENDAR ===
Day-by-day: John vs agent tasks. Max 4h/day John. Building + proof loop, not partnership programs.

=== PART J: PROMPT FOR CURSOR AGENT (next session) ===
Copy-paste prompt: 15–25 numbered steps, one canonical file per step, verify gate at end.

Research deeply. Challenge agent assumptions. No essays — tables and numbered lists.`;

  wlog('=== HEAVY SESSION HANDOFF START ===');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) {
    await browser.disconnect();
    throw new Error('no grok tab — open SuperGrok Heavy on grok.com');
  }
  await page.bringToFront();
  fs.writeFileSync(SENT, `${new Date().toISOString()}\n${PROMPT.length} chars\n`);
  wlog(`sending ${PROMPT.length} chars`);
  await sendToGrok(page, PROMPT);
  const text = await collectHeavy(page, 5000);
  await browser.disconnect();

  const limited = /before limit is gone|Upgrade to SuperGrok/i.test(text);
  fs.writeFileSync(OUT, `# SuperGrok Heavy — Next Research\n\n_Date: ${new Date().toISOString()}_\n_Limited: ${limited}_\n_Chars: ${text.length}_\n\n${text}\n`);
  const out = { at: new Date().toISOString(), chars: text.length, limited, signals, path: OUT };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== HEAVY SESSION HANDOFF END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });