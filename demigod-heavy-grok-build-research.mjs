#!/usr/bin/env node
/** Ask SuperGrok Heavy to research Grok Build best practices + return master prompt. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, sendToGrok, collectGrokReply, sleep } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-GROK-BUILD-RESEARCH.md');
const PROMPT_OUT = path.join(ROOT, 'HEAVY-GROK-BUILD-MASTER-PROMPT.md');
const JSON_OUT = path.join(ROOT, 'DEMIGOD-GROK-BUILD-RESEARCH.json');

const PROMPT = `SuperGrok Heavy — RESEARCH + MASTER PROMPT AUTHOR.

You are the strategic research layer. John runs a multi-agent stack on Pop!_OS COSMIC:

STACK TODAY:
1. **Grok Build** (you are talking to John via grok.com; separate local agent runs \`grok\` CLI in /home/potter with chrome-devtools MCP @ :9223, compact_mode, subagents, always-approve)
2. **SuperGrok Heavy** (you — strategy, copy, audits, long reasoning)
3. **Orca IDE** (optional — parallel git worktrees + embedded browser)
4. **Cursor cloud agents** (optional — Webflow MCP bridge when enabled)
5. **Webflow** — talentlink-sf site, trydemigod.com, split custom code (head-minimal + footer CDN loader + demigod-foot-core.js), CDP Designer automation

ACTIVE PROJECT: Demigod — SF startup talent matching site (NOT the eat-the-sounds game right now).

---

## YOUR RESEARCH MISSION

Use your web/X search and reasoning to find how **others** use Grok Build (xAI's agentic coding CLI, formerly related to Cursor agent workflows) for:
- Website builds (marketing sites, Webflow, headless, custom code)
- Code projects (vanilla JS, npm scripts, no bundler)
- Agent + browser automation (CDP, MCP)
- Multi-agent orchestration (Heavy + local agent + Cursor + Orca)

Search creatively for:
- xAI docs, Grok Build changelog, plugin marketplace (chrome-devtools-mcp, firecrawl)
- Community posts on X/Reddit/HN about Grok agent / coding agent workflows
- Cursor + Webflow MCP patterns (Bridge app, Designer limitations, component masters)
- **Grok Build → Cursor → Webflow** chains (who does what, handoff prompts)
- **Grok Build + CDP Webflow** without Cursor (Puppeteer Designer automation — what we do now)
- Anti-patterns (huge workspaces, too many MCPs, auto-loops, context bloat)

Be honest where public info is thin — infer from adjacent tools (Claude Code, Cursor agents, Devin, Codex) and mark [INFERRED].

---

## DELIVERABLE (this is the main ask)

Write **ONE DETAILED LONG MASTER PROMPT** (1500–3000 words) that John can paste into his **local Grok Build agent** as the canonical operating system for Demigod website work.

That master prompt must include:

### A) Role definition
- What Grok Build owns vs Heavy vs human vs Cursor vs Orca vs Webflow AI

### B) Session boot checklist
- Exact npm commands, tab budget, CDP launch, verify sequence

### C) Webflow-specific playbook
- Custom code split architecture (head CSS / foot JS CDN)
- When to use Designer AI vs CDP canvas patch vs human master edit
- Publish checklist (both domains)
- Forms pipeline (startup-hire, engineer-join) without Tally

### D) Grok Build config.toml recommendations
- MCP on/off matrix by task type
- compact_mode, codebase_indexing, subagents, permission_mode
- Worktree strategy (now that git has HEAD)

### E) Prompt templates (copy-paste blocks)
- "Ship source truth" prompt
- "Audit live vs static" prompt
- "Ask Heavy for strategy" handoff prompt
- "Cursor Webflow MCP dispatch" prompt (when to use vs skip)

### F) Chrome/CDP hygiene rules
- Tab roles, close rules, Designer 1440×900

### G) Verification doctrine
- demigod:verify:all, capture:audit, screenshot truth

### H) Creative extras you discover
- Any novel patterns for Grok Build + Webflow nobody else is doing
- Orca vs pure Grok Build decision tree
- How Heavy should be invoked (frequency, prompt shape)

---

## FORMAT

1. **RESEARCH DIGEST** (max 600 words) — bullet findings with [SOURCE] or [INFERRED] tags
2. **GAP ANALYSIS** — what our stack does well vs industry
3. **THE MASTER PROMPT** — one giant fenced block John copies into Grok Build AGENTS.md or first message of session
4. **TOP 10 RULES** — one-liners
5. **ONE THING TO STOP DOING**

Do not be brief. John explicitly wants a detailed long prompt back. Search first, then synthesize.`;

/** Pull master prompt + rules from Heavy reply (handles multiple heading styles). */
function extractMasterAndRules(clean) {
  const masterPatterns = [
    /# DEMIGOD OS v1\.0/i,
    /## A\) ROLE/i,
    /You are Grok[- ]Build[- ]Demigod/i,
    /You are Grok Build Demigod Agent/i,
  ];
  let masterStart = -1;
  for (const pat of masterPatterns) {
    const m = clean.search(pat);
    if (m >= 0 && (masterStart < 0 || m < masterStart)) masterStart = m;
  }
  const sectionIdx = clean.search(/THE MASTER PROMPT/i);
  if (sectionIdx >= 0) {
    const after = clean.slice(sectionIdx);
    const textIdx = after.search(/\n(?:text|```)\n/i);
    if (textIdx >= 0) {
      const start = sectionIdx + textIdx + 1;
      if (masterStart < 0 || start < masterStart) masterStart = start;
    }
  }

  const rulesPatterns = [
    /\*\*TOP 10 RULES\*\*/i,
    /\nTOP 10 RULES \(one-liners/i,
    /\nTOP 10 RULES\n/i,
  ];
  let rulesStart = -1;
  for (const pat of rulesPatterns) {
    const m = clean.search(pat);
    if (m >= 0 && (rulesStart < 0 || m < rulesStart)) rulesStart = m;
  }

  let masterBlock = '';
  if (masterStart >= 0) {
    masterBlock = clean.slice(masterStart, rulesStart > masterStart ? rulesStart : undefined).trim();
    masterBlock = masterBlock.replace(/^(?:text|```)\n/, '').replace(/\n```$/, '').trim();
  }

  let rulesBlock = '';
  if (rulesStart >= 0) {
    rulesBlock = clean.slice(rulesStart).trim();
    const uiCut = rulesBlock.search(/\nJohn — paste|\nReady when you are/i);
    if (uiCut > 0) rulesBlock = rulesBlock.slice(0, uiCut).trim();
  }
  return { masterBlock, rulesBlock };
}

async function main() {
  wlog('=== HEAVY GROK BUILD RESEARCH START ===');
  const browser = await connectBrowser();
  const pages = await browser.pages();
  const page = pages.find((p) => /grok\.com/i.test(p.url()));
  if (!page) throw new Error('open grok.com tab for Heavy');

  await page.bringToFront();
  // Fresh thread avoids truncated prior context.
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button,a')].find((b) =>
      /new chat/i.test((b.textContent || b.getAttribute('aria-label') || '').trim()),
    );
    btn?.click();
  });
  await sleep(2500);

  await sendToGrok(page, PROMPT);
  fs.writeFileSync(path.join(ROOT, 'HEAVY-GROK-BUILD-RESEARCH-SENT.txt'), `${new Date().toISOString()}\n\n${PROMPT}`);

  let reply = { text: '', thinking: true };
  for (let i = 0; i < 24; i++) {
    await sleep(15000);
    reply = await collectGrokReply(page, { waitMs: 8000, minGrowth: 150 });
    const body = await page.evaluate(() => document.body?.innerText || '');
    const idx = body.lastIndexOf('RESEARCH DIGEST');
    const chunk = idx >= 0 ? body.slice(idx) : body.slice(-15000);
    const complete = /TOP 10 RULES|ONE THING TO STOP DOING/i.test(chunk) && chunk.length > 8000;
    wlog(`heavy wait ${i + 1} thinking=${reply.thinking} len=${chunk.length} complete=${complete}`);
    if (complete) {
      reply.text = chunk;
      break;
    }
    if (!reply.thinking && chunk.length > 6000 && i >= 6) {
      reply.text = chunk;
      break;
    }
  }

  if (!reply.text) {
    const body = await page.evaluate(() => document.body?.innerText || '');
    const idx = body.lastIndexOf('RESEARCH DIGEST');
    reply.text = idx >= 0 ? body.slice(idx) : body.slice(-20000);
  }

  let clean = (reply.text || '').trim();
  const uiCut = clean.search(/\n\d+ sources\n|\nExplore chrome|\nUpgrade to SuperGrok/i);
  if (uiCut > 0) clean = clean.slice(0, uiCut).trim();

  if (!clean || clean.length < 5000) {
    const body = await page.evaluate(() => document.body?.innerText || '');
    const idx = body.lastIndexOf('RESEARCH DIGEST');
    const fallback = idx >= 0 ? body.slice(idx) : body.slice(-25000);
    const fbCut = fallback.search(/\n\d+ sources\n|\nExplore chrome|\nUpgrade to SuperGrok/i);
    clean = (fbCut > 0 ? fallback.slice(0, fbCut) : fallback).trim();
    wlog(`fallback body scrape len=${clean.length}`);
  }

  const prior = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const priorClean = prior.replace(/^#[^\n]+\n\n_[^\n]+_\n\n/, '').trim();
  if (clean.length < 5000 && priorClean.length > clean.length) {
    wlog(`keeping prior research (${priorClean.length} chars) — new scrape too short (${clean.length})`);
    clean = priorClean;
  }

  const body = `# SuperGrok Heavy — Grok Build Research + Master Prompt\n\n_${new Date().toISOString()}_\n\n${clean || '_no reply_'}\n`;
  if (clean.length >= 5000) fs.writeFileSync(OUT, body);

  const { masterBlock, rulesBlock } = extractMasterAndRules(clean);
  if (masterBlock || rulesBlock) {
    fs.writeFileSync(
      PROMPT_OUT,
      `# Grok Build Master Prompt (from Heavy)\n\n_${new Date().toISOString()}_\n\n${masterBlock}\n\n${rulesBlock}\n`,
    );
  }

  const result = {
    at: new Date().toISOString(),
    ok: clean.length > 8000 && /TOP 10 RULES|ONE THING TO STOP/i.test(clean),
    chars: clean.length,
    masterChars: masterBlock.length,
    path: OUT,
    masterPromptPath: masterBlock ? PROMPT_OUT : null,
  };
  fs.writeFileSync(JSON_OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.disconnect();
  wlog('=== HEAVY GROK BUILD RESEARCH END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });