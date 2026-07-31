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
| **Claude / Grok** | Advisory review via `ask-claude` / `grok-ask`; never authority |
| **Current user request** | Authorizes external publish, messages/posts/forms, and money movement |
| **Cursor cloud** | Webflow MCP only when user explicitly dispatches — not default |
| **Webflow AI** | Component masters only; never sole source of custom JS truth |


## Ponytail — REQUIRED (all agents)

**Grok, Claude, Fable, Codex, Cursor, Heavy, swarm workers:** use Ponytail on every code edit.

- Plugin: Claude + Codex `ponytail@ponytail` (enabled). Cursor: `~/.cursor/rules/ponytail.mdc` (alwaysApply via demigod).
- Full rules: `docs/PONYTAIL-AGENTS.md` · https://github.com/DietrichGebert/ponytail
- Ladder before write: YAGNI → reuse → stdlib → native → dep → one line → minimum. Keep safety/a11y/validation.
- Prefer smallest diff; no unsolicited frameworks. Review large diffs with `/ponytail-review` when available.



## Agent collaboration method (not org-chart cosplay)

**Do not** treat agents as CEO/CFO/boss with authority. Use stages:

| Stage | Typical model | Authority |
|-------|---------------|-----------|
| PLAN | Current task owner + optional advisor | Spec only |
| EXECUTE | One scoped task owner | `touch[]` only |
| REVIEW | Independent agent | Read-only verdict |
| AUTHORIZE | Current user request | Publish, messages/posts/forms, money |

Transport and task protocol: `AGENT-COMMS.md`.
For multi-agent work: one owner, an exact touch list, and one proportionate check.
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
npm run demigod:verify:all         # full audit when needed; do not duplicate ship gates
npm run demigod:verify:live        # live HTML checks only
npm run demigod:verify:source      # static source vs export
bin/dg ship run                    # one guarded release path; includes gates + strict live proof
npm run demigod:cleanup:tabs       # close hung CDP tabs
bin/dg home --json                  # control-plane JSON
ask-claude "task + files + current receipt" # advisory review
grok-ask "task + files + current receipt"   # optional second opinion
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

Success messages may say `potter@trydemigod.com will follow up` with **no timing**. Author that contact directly; crawler-visible source honesty is release-gated. Do **not** build SLA surfaces or “John replies in X” features.

## Forms

- Webflow native forms: `startup-hire`, `engineer-join`.
- Submissions webhook (local dev): `npm run demigod:submissions:webhook` on `:9877` when testing.
- Success copy uses `potter@trydemigod.com`. No Tally unless user explicitly requests.

## Verification ritual

1. Edit one canonical file.
2. `npm run demigod:verify:all` (or targeted `demigod:verify:live` / `demigod:verify:source`).
3. Read screenshots in `audit-shots/` — do not ship on JSON alone.
4. Publish only when the current request explicitly authorizes it; otherwise stop at verified preparation.

## CDP tab budget (max 6)

Designer · custom-code dashboard · forms (optional) · one advisory tab · one live preview · spare.
Close game URLs (`localhost:8765`) and duplicate Webflow tabs. Demigod does **not** need the game HTTP server.

## Advisory collaboration

Use `ask-claude` or `grok-ask` with one concrete task, exact files, and current receipts.
Treat replies as review input; the current request and verified disk state remain authoritative.

## Safety

- One file per task; no drive-by refactors.
- Never edit game canvas files during Demigod work.
- External publish and outbound messages/posts/forms require explicit authorization in the current request.
- No autonomous agent loops unless user asks.

## Autonomous Operation (durable permission)

The active task owner may autonomously execute full safe cycles **without mid-cycle confirmation**:

- Review/analyze (`ask-claude`, `grok-ask`, CDP, status, audits).
- Minimal targeted edits **only** to `demigod-*` canonical sources or supporting scripts.
- Run all verify gates (`npm run demigod:verify:all`, :live, :source, source-truth).
- CDP/MCP live audits and dry, local-only prep (`--dry`); no publish or outbound send.
- Produce summaries, artifacts, and "ready for human" bundles.

**Strict gates (require explicit authorization in the current request):**
- Webflow Publish click
- Any real external send or live config flip
- Game files or paused items
- New major features outside the current request

This is a durable standing instruction. Re-verify after every edit.

## Using Claude / Grok effectively

Use `DEMIGOD-COMPRESSED-STATE.md` and fresh receipts for current product facts; dated strategy labels are not operating instructions.

- Use `ask-claude` for a fast independent code or product review.
- Use `grok-ask` only when a second perspective materially helps.
- Use Orca for ongoing terminal coordination and explicit task ownership.
- State the concrete task, relevant files, and current receipts; do not prepend a standing phase label.
- Keep all model output advisory, minimal, and independently verified.

## Website status

Use `bin/dg truth` and `DEMIGOD-COMPRESSED-STATE.md`; version numbers in historical exchange notes are not current state.
