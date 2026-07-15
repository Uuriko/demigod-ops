# Demigod — Agent Rules (Webflow / trydemigod.com)

**Prefer:** [`DEMIGOD-SIMPLE.md`](DEMIGOD-SIMPLE.md) for day-to-day. This file is the expanded ruleset.

**Workspace:** `/home/potter`  
**Project:** SF startup talent-matching marketing site (talentlink-sf / trydemigod.com).  
**Not in scope:** Eat the Sounds game — see `AGENTS.md` hard stops.

**Human workflow:** `DEMIGOD-WORKFLOW.md`  
**Live:** https://www.trydemigod.com  
**Designer:** https://talentlink-sf.design.webflow.com/  
**Custom code:** https://webflow.com/dashboard/sites/talentlink-sf/custom-code  
**CDP:** `http://127.0.0.1:9223`

## Role boundaries

| Actor | Owns |
|-------|------|
| **Local agent (you)** | Edit `demigod-*` sources, npm scripts, CDP/Designer automation, verification |
| **SuperGrok Heavy** | Strategy, copy, audits — invoke via grok.com tab or `npm run demigod:heavy:*` |
| **Human (John)** | Publish click, IX3 / master component polish, form smoke test, final UX |
| **Cursor cloud** | Webflow MCP only when user explicitly dispatches — not default |
| **Webflow AI** | Component masters only; never sole source of custom JS truth |


## Agent collaboration method (not org-chart cosplay)

**Do not** treat agents as CEO/CFO/boss with authority. Use stages:

| Stage | Typical model | Authority |
|-------|---------------|-----------|
| PLAN | Fable/Claude | Spec only |
| EXECUTE | Grok/Cursor | `touch[]` only |
| REVIEW | Codex | Read-only verdict |
| AUTHORIZE | Human | Freeze, Publish, DMs, fees |

Full method + prompt templates: `docs/process/AGENT-COLLABORATION-METHOD.md`  
Every nontrivial task: session contract + fresh `bin/dg live`.  
Precedence: human auth → freeze/contract → disk truth → model opinion.


## Canonical files

| File | Owns |
|------|------|
| `demigod-head-minimal.html` | Head custom code (CSS, meta, loader) |
| `demigod-footer-lite.html` | Footer loader stub |
| `demigod-foot-core.js` | All custom vanilla JS (forms, nav patches, interactivity) |
| `demigod-verify-all.mjs` | Full verify pipeline |
| `demigod-open-workspace.mjs` | Chrome tab opener |

## Core commands

```bash
npm run demigod:workspace          # open Designer, live, Grok, dashboards
npm run demigod:verify:all         # gate before human signoff / publish prep
npm run demigod:verify:live        # live HTML checks only
npm run demigod:verify:source      # static source vs export
npm run demigod:source-truth       # source-truth pass
npm run demigod:capture:audit      # screenshot audit → audit-shots/
npm run demigod:visual:pass        # visual regression pass
npm run demigod:cleanup:tabs       # close hung CDP tabs
npm run demigod:status             # status report JSON
npm run demigod:heavy:grok-options # ask Heavy for Grok Build strategy
npm run dev:setup                  # git HEAD + laptop settings + workspace tabs
```

Deprecated / do not auto-run: `demigod:continuous`, `demigod:visual:loop`, `continuous-improve-loop.mjs`.

## Custom code architecture

- **Head:** minimal CSS + meta + CDN links — no JS in head.
- **Footer:** async loader → `demigod-foot-core.js` (vanilla JS, no bundler).
- Paste head/footer in Webflow Site Settings → Custom Code → Save → Publish (staging + production).
- Bump cache `?v=` on CDN script tags after foot-core changes.

## Copy policy (site-facing)

**Never on trydemigod.com** (static HTML, runtime COPY, meta, modals, or injected blocks):

- Reply-time promises — no “48h”, “within 2 hours”, “fastest reply”, SLA badges, or similar.
- Founder name — no “John”, “John Potter”, or “John Doe” placeholders.

Success messages may say `hello@trydemigod.com will follow up` with **no timing**. Runtime scrub lives in `demigod-foot-core.js` (`superCleanup`, `patchMeta`, `scrubInputs`). Do **not** build SLA surfaces or “John replies in X” features.

## Forms

- Webflow native forms: `startup-hire`, `engineer-join`.
- Submissions webhook (local dev): `npm run demigod:submissions:webhook` on `:9877` when testing.
- Success copy uses `hello@trydemigod.com`. No Tally unless user explicitly requests.

## Verification ritual

1. Edit one canonical file.
2. `npm run demigod:verify:all` (or targeted `demigod:verify:live` / `demigod:verify:source`).
3. Read screenshots in `audit-shots/` — do not ship on JSON alone.
4. Human publish + incognito form smoke test.

## CDP tab budget (max 6)

Designer · custom-code dashboard · forms (optional) · Grok/Heavy · one live preview · spare.  
Close game URLs (`localhost:8765`) and duplicate Webflow tabs. Demigod does **not** need the game HTTP server.

## Heavy handoff template

```
=== HANDOFF TO HEAVY ===
State: [npm run demigod:status summary or latest verify result]
Task: [one sentence]
Return: STRATEGY + COPY + AUDIT POINTS + next local command
```

## Safety

- One file per task; no drive-by refactors.
- Never edit game canvas files during Demigod work.
- Human must click Webflow Publish — agent prepares only.
- No autonomous agent loops unless user asks.

## Autonomous Operation (durable permission)

The local agent (Grok + Fable via `claude --model fable` or `scripts/demigod-fable.mjs`) may autonomously execute full safe cycles **without mid-cycle confirmation**:

- Review/analyze (Fable, Heavy scripts, CDP/chrome-devtools MCP, status/audits).
- Minimal targeted edits **only** to `demigod-*` canonical sources or supporting scripts.
- Run all verify gates (`npm run demigod:verify:all`, :live, :source, source-truth).
- CDP/MCP live audits, dry/safe GTM/pilot/tracker/board prep (`--dry`, `--log-prepared`, board:publish, etc.).
- Produce summaries, artifacts, and "ready for human" bundles.

**Strict gates (always surface + wait for human):** 
- Webflow Publish click
- Any real external send or live config flip
- Game files or paused items
- New major features outside current Heavy phase

This is a durable standing instruction. Re-verify after every edit. Use `npm run demigod:autoprep` or `demigod:fable:autonomy` to bootstrap cycles. Update DEMIGOD-STATE with results.

## Using Fable / Claude effectively (Demigod)

## Using Fable / Claude effectively (Demigod)

**Current phase (as of 2026-07-04):** Pre-services prep complete. Site is honest about pending Twilio/SMS and Stripe. Focus per Heavy: **demand generation** (DMs to warm SF founders), pilot logging via tracker, white-glove delivery, proof assets. Minimal additional site changes.

### Core Principles
- One canonical file for site: `demigod-foot-core.js`.
- Always run `npm run demigod:verify:all` (or :live/:source) after edits.
- Heavy output is authoritative for strategy: demand > polish. "Site is mostly done."
- Copy policy (never on live site): no 48h promises, no founder names in placeholders. Use "hello@trydemigod.com will follow up" with no timing. Runtime scrubs in foot-core.
- Pre-services language: "pending", "Twilio number pending", "Stripe test ready / live keys pending", "SMS & payments coming online soon".

### Good Prompt Patterns
- "Given current board and Heavy advice, suggest exact copy change for X that uses pending language."
- "Improve this node script for pre-services pilot logging. Keep zero-deps, under X lines. Output diff or full ready code."
- "Review this against DEMIGOD-AGENTS.md and Heavy: [paste]. Return specific actionable edits only."

### Usage
- Prefer `claude --model fable -p "..." --add-dir /home/potter` for quick.
- Use claude-lib for structured (browser for rich context or CLI fallback).
- For Demigod tasks, start prompt with: "Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty. [task]"

### Anti-patterns
- Do not suggest new Webflow pages, heavy UI, or features outside Heavy priorities.
- Do not invent new SLAs or timing promises.
- Keep changes minimal and verifiable.

See AI-HYBRID-COLLABORATION-PLAYBOOK.md for full hybrid workflows with Grok Build, Fable, and Heavy.

## Website status (2026-07-15)

See `docs/exchange/DEMIGOD-SESSION-STATUS-2026-07-15-WEBSITE.md`. Live foot **v207**. Phase: website+startup only; no auto-DM.
