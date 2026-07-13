#!/usr/bin/env node
/** Report AGENTS.md routing options to Heavy + ask for deeper Grok Build capabilities research. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, sendToGrok, collectGrokReply, sleep } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-GROK-BUILD-OPTIONS-RESEARCH.md');
const SENT = path.join(ROOT, 'HEAVY-GROK-BUILD-OPTIONS-SENT.txt');
const JSON_OUT = path.join(ROOT, 'DEMIGOD-GROK-BUILD-OPTIONS-RESEARCH.json');

const PROMPT = `SuperGrok Heavy — STRATEGY + DEEP GROK BUILD RESEARCH (follow-up).

John's local Grok Build agent analyzed how to organize agent rules for a **dual-project workspace** at /home/potter (Pop!_OS COSMIC). You previously delivered HEAVY-GROK-BUILD-MASTER-PROMPT.md (Demigod Webflow OS). Now John wants your strategic take + **deeper research on Grok Build capabilities and best practices** to maximize the tool.

---

## CURRENT STATE (facts — do not invent)

**Workspace:** /home/potter — single repo, two active projects:
1. **Eat the Sounds** — vanilla HTML canvas game (@ninjawhee). Root AGENTS.md is game-first. Cursor rules (.cursor/rules/eat-the-sounds.mdc) apply alwaysApply:true to **/*.js and **/*.html — so Demigod files like demigod-foot-core.js get game rules today (bug).
2. **Demigod** — Webflow marketing site (trydemigod.com + talentlink-sf). DEMIGOD-WORKFLOW.md exists (47 lines, accurate). Heavy master prompt saved but NOT auto-loaded. Real verify: npm run demigod:verify:all. Workspace opener: npm run demigod:workspace.

**Grok Build config (~/.grok/config.toml):**
- compact_mode=true, permission_mode=always-approve, codebase_indexing=false
- subagents enabled, chrome-devtools-mcp @ :9223 only (webflow MCP not in grok config yet)
- git HEAD exists (commit 3029ead) — worktrees work now

**Prior Heavy research issues:** Master prompt invented /home/potter/demigod path, dev:verify, Supabase/Resend — none match repo truth. Raw 6.5k paste into AGENTS.md would harm game project.

---

## OPTIONS REPORT (from local agent — evaluate and rank)

| ID | Option | Summary |
|----|--------|---------|
| A | Do nothing | Keep HEAVY-GROK-BUILD-MASTER-PROMPT.md as manual paste reference |
| B | DEMIGOD-AGENTS.md | ~80-line curated Demigod canon (real npm commands, strip invented stack) |
| C | Mode-switch AGENTS.md | Top banner ACTIVE_PROJECT=demigod|game |
| D | Cursor rule demigod.mdc | globs: demigod-*, DEMIGOD-* — fixes cross-contamination |
| E | Expand DEMIGOD-WORKFLOW.md | Human + agent doc, already accurate |
| F | Grok skill (~/.grok/skills/demigod-os) | On-demand /demigod-os, lean default context |
| G | npm run demigod:boot | Executable boot: tabs + checklist + DEMIGOD-SESSION.json |
| H | Git worktree / Orca isolation | demigod worktree with own AGENTS.md |
| H2 | Separate repo | Full Demigod migration off /home/potter root |
| I | Prompt template files | Small .txt blocks (ship, audit, heavy-handoff, cursor-dispatch) |
| J | Heavy as living research only | Re-run research periodically, never auto-merge |
| K | config.toml aliases + MCP matrix | Grok aliases for demigod:verify:all; enable Webflow MCP selectively |

Local agent recommendation: **D + B + one-line pointer in root AGENTS.md** (minimum). Add G+F+K if Demigod-focused for weeks. H/H2 for long-term separation.

---

## YOUR MISSION (search first, then synthesize)

### Part 1 — DEEP GROK BUILD CAPABILITIES RESEARCH
Go beyond the prior digest. Search xAI docs, changelog, plugin marketplace, X/Reddit/HN for:

- **AGENTS.md** — hierarchical loading, multiple files, project vs global, how Grok Build merges with Cursor rules
- **Skills / hooks / plugins** — when to use vs AGENTS.md; official marketplace patterns
- **Subagents + worktrees** — per-subagent worktree strategy, limits, best practices
- **config.toml full surface** — permission_mode options, codebase_indexing modes, session auto_compact, yolo, aliases, MCP max_concurrent
- **CLI modes** — /plan, /goal, /compact, grok inspect, headless -p, ACP
- **MCP hygiene** — chrome-devtools vs webflow vs firecrawl; enable/disable per task; community anti-patterns
- **Multi-project single workspace** — how others handle game + website in one folder without context bleed
- **Underused features** — what power users do that John likely isn't doing yet
- **Grok Build vs Cursor vs Claude Code** — where Grok Build wins for John's stack (npm scripts, CDP, vanilla JS, Webflow)

Mark [SOURCE] or [INFERRED]. Be honest where docs are thin.

### Part 2 — STRATEGIC RECOMMENDATION
Given John's stack (Grok Build local + you Heavy + optional Cursor Webflow MCP + Orca + CDP @9223 + Demigod Webflow):

1. **Rank options A–K** — which to implement, in what order, with effort (hours) and ROI
2. **Pick a winning architecture** — file layout John should have after 1 day of work
3. **Exact config.toml block** — copy-paste for ~/.grok/config.toml tuned to Demigod-primary mode (with note on switching back to game)
4. **What NOT to do** — confirm or reject raw master-prompt paste, separate repo now, etc.

### Part 3 — ACTIONABLE DELIVERABLES
1. **RESEARCH DIGEST** (800 words max) — Grok Build capabilities + best practices
2. **OPTIONS VERDICT** — table: Option | Do? | Why | Effort
3. **IMPLEMENTATION PLAN** — numbered steps John/local agent executes (max 12 steps, who: JOHN / LOCAL / HEAVY)
4. **CURATED DEMIGOD-AGENTS.md OUTLINE** — section headers + bullet content (not full prose — local agent will write file)
5. **GROK BUILD POWER MOVES** — 5–10 specific commands/workflows John should try this week
6. **ONE THING JOHN IS UNDERUSING** — single highest-leverage Grok Build feature

Do not be brief. Search before answering. This informs how John runs Demigod for the next month.`;

function isComplete(chunk) {
  return chunk.length > 7000
    && /OPTIONS VERDICT|IMPLEMENTATION PLAN/i.test(chunk)
    && /GROK BUILD POWER MOVES|UNDERUSING/i.test(chunk);
}

async function main() {
  wlog('=== HEAVY GROK BUILD OPTIONS RESEARCH START ===');
  const browser = await connectBrowser();
  const pages = await browser.pages();
  const page = pages.find((p) => /grok\.com/i.test(p.url()));
  if (!page) throw new Error('open grok.com tab for Heavy');

  await page.bringToFront();
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button,a')].find((b) =>
      /new chat/i.test((b.textContent || b.getAttribute('aria-label') || '').trim()),
    );
    btn?.click();
  });
  await sleep(2500);

  await sendToGrok(page, PROMPT);
  fs.writeFileSync(SENT, `${new Date().toISOString()}\n\n${PROMPT}`);

  let clean = '';
  for (let i = 0; i < 28; i++) {
    await sleep(15000);
    await collectGrokReply(page, { waitMs: 8000, minGrowth: 150 });
    const body = await page.evaluate(() => document.body?.innerText || '');
    const markers = ['RESEARCH DIGEST', 'Part 1', 'DEEP GROK BUILD'];
    let idx = -1;
    for (const m of markers) {
      const j = body.lastIndexOf(m);
      if (j > idx) idx = j;
    }
    const chunk = idx >= 0 ? body.slice(idx) : body.slice(-20000);
    const uiCut = chunk.search(/\n\d+ sources\n|\nExplore chrome|\nUpgrade to SuperGrok/i);
    clean = (uiCut > 0 ? chunk.slice(0, uiCut) : chunk).trim();
    const thinking = /thinking|Agents thinking/i.test(body);
    wlog(`heavy wait ${i + 1} thinking=${thinking} len=${clean.length} complete=${isComplete(clean)}`);
    if (isComplete(clean)) break;
    if (!thinking && clean.length > 8000 && i >= 8) break;
  }

  if (clean.length < 5000) {
    const body = await page.evaluate(() => document.body?.innerText || '');
    const idx = body.lastIndexOf('RESEARCH DIGEST');
    const fallback = idx >= 0 ? body.slice(idx) : body.slice(-25000);
    const fbCut = fallback.search(/\n\d+ sources\n|\nExplore chrome|\nUpgrade to SuperGrok/i);
    clean = (fbCut > 0 ? fallback.slice(0, fbCut) : fallback).trim();
    wlog(`fallback scrape len=${clean.length}`);
  }

  const prior = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const priorClean = prior.replace(/^#[^\n]+\n\n_[^\n]+_\n\n/, '').trim();
  if (clean.length < 5000 && priorClean.length > clean.length) {
    wlog(`keeping prior (${priorClean.length} chars)`);
    clean = priorClean;
  }

  const doc = `# SuperGrok Heavy — Grok Build Options + Capabilities Research\n\n_${new Date().toISOString()}_\n\n${clean || '_no reply_'}\n`;
  if (clean.length >= 5000) fs.writeFileSync(OUT, doc);

  const result = {
    at: new Date().toISOString(),
    ok: isComplete(clean) || clean.length > 8000,
    chars: clean.length,
    path: OUT,
    sentPath: SENT,
  };
  fs.writeFileSync(JSON_OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.disconnect();
  wlog('=== HEAVY GROK BUILD OPTIONS RESEARCH END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });