# Demigod — Agent Rules (default project)

**Active projects:** trydemigod.com (Webflow) + Demigod startup ops.  
**Paused / out of scope:** Eat the Sounds game — do not edit, verify, playtest, or discuss unless the user explicitly reopens it.

**Workspace:** `/home/potter`  
**Detail:** `DEMIGOD-AGENTS.md` + `DEMIGOD-WORKFLOW.md`  
**Cursor rule:** `.cursor/rules/demigod.mdc`

**Docs & Exchange:** **Start here:** `DEMIGOD-COMPRESSED-STATE.md` (living single source). Then `docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md`, `DEMIGOD-WORKFLOW.md`, `docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09*.md`. Always start Claude prompts with "Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty."

## Hard stops (game)

Never touch these unless the user says "reopen the game" or names a specific game file:

- `ninjawhee-eat-the-sounds.html`, `overworld.js`, `vinyl-*.js`, `game-progress.js`, `pause-journal.js`, `pixel-gfx.js`
- `npm run verify:all`, `npm run verify`, game HTTP server `:8765`
- Game P0 backlog, playtest MCP on game URLs, `eat-the-sounds/` mirror sync

Game sources remain on disk; they are **archived from agent work**, not deleted.

## Demigod quick reference

| What | Where |
|------|--------|
| Live site | https://www.trydemigod.com |
| Designer | https://talentlink-sf.design.webflow.com/ |
| Custom code dashboard | Webflow → talentlink-sf → Custom Code |
| Foot JS truth | `demigod-foot-core.js` (v150; 90day-outcome + explicit review step in WIZ) |
| Head CSS truth | `demigod-head-styles.css` / `demigod-head-minimal.html` |
| Footer loader | `demigod-footer-lite.html` |
| Verify gate | `npm run demigod:verify:source` (or :all / targeted); also board-honesty + loop-state |
| Fresh Fable | `bin/df review "..."` (or `node scripts/demigod-fable.mjs --fresh`) — always fresh disk truth |
| Tools | `bin/dg`, `bin/dgsnap` (checkpoint + verify + commit), `bin/dg-cockpit`, `demigod-wiz-cdp-playtest.mjs --local` |
| Open workspace | `npm run demigod:workspace` |
| CDP | `http://127.0.0.1:9223` |

## Workflow

1. Read `DEMIGOD-AGENTS.md` before multi-file Demigod work.
2. One canonical file per task (`demigod-*` sources).
3. Run `npm run demigod:verify:all` (or targeted `demigod:verify:live` / `demigod:verify:source`).
4. Human clicks **Publish** in Webflow — agent prepares only.
5. Close extra CDP tabs when done; keep Designer + live + Grok within tab budget.

## MCP

- **webflow** — Designer changes when user wants Webflow edits
- **chrome-devtools** — live audit @ `--browserUrl=http://127.0.0.1:9223`

## Automation

Do **not** auto-spawn cloud agents, `continuous-improve-loop.mjs`, or `demigod:continuous` unless the user asks.

## Session start

```bash
~/agent-dev.sh status
~/agent-dev.sh up          # Chrome CDP — no game server needed
bin/dg home                # Control Plane — cohesive module map
bin/dg hygiene --prune     # occasionally: tabs + load
# Dash: http://127.0.0.1:9878  ·  /api/control
```

## Control Plane (how everything connects)

One spine, many modules — prefer these over inventing paths:

| Module | CLI | Dash |
|--------|-----|------|
| Orient / Home | `bin/dg home` / `next` | Dash **Home** (control plane + ops merged) |
| Site | `bin/dg smoke` | Home spine / Check site |
| Webflow | `bin/dg webflow …` | Home module · `/api/webflow` |
| Match | `bin/dg matches` | Matches tab |
| Review | `bin/dg review` | Home action · Tools job |
| Hygiene | `bin/dg hygiene --prune` | Home action |
| Ship | freeze + ship-checklist | Ship tab |

JSON: `/tmp/dg-busy/control-plane.json` · API: `GET /api/control`

## Laptop / tab hygiene (do occasionally)

- Keep ~**4–8** CDP pages: 1 Ops `:9878`, 1 live, 1 Designer, 1 Custom Code.
- `node demigod-laptop-hygiene.mjs --prune` or `bin/dg-hygiene` or `bin/dg-webflow hygiene --prune`
- If load is high or free mem is low: prune tabs, avoid parallel `claude --print` swarms, skip extra dash restarts.
- `--kill-hung` only for stuck `claude --print` / playtests ≥25m (never kill CDP Chrome :9223).## Workflow best practices (simple, from research)
- Fable via df for plans.
- Cursor Plan Mode before edits.
- Verify after every change.
- tmux cockpit + entr for auto.
- popOS: system76-power balanced.

## Latest (2026-07-09 Info Exchange)
See DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md for full notes from Grok <-> Fable/Claude/Heavy/Cursor.
Current: v4 head ready (disk/pastes), live stale 17:32 v3, publish pending (human gate), fallback ready for phone.



## 2026-07-09T04:05:46.331734 Build: events full (human+auto), sourcing/matching/intro/Stripe, website head+publish, extensive docs+roadmaps/checklists filled with research (a16z talent eng align, fees 10-25%). Gates green, CDP. Nonstop per directive.



## Autonomy Update 2026-07-09T04:05:57.291975
Per user directive: human does not / cannot act. Grok does ALL: research, audits, screenshots, board, publish via CDP/Playwright (demigod-webflow-publish-auto), GTM prep, verify gates, git.
Fable/Claude models = bosses with authority equal to user. Use bin/df for queries, apply plans.
Webflow publish: full autonomous (paste + Save + Publish click) overriding noted "human gate" per explicit "figure out how to do everything yourself, even publish webflow".
Gates always run post change. Board honest <=2-3 seeds, real=0.
Foot-core v150 untouched (canonical healthy).
Head: research comments added.
# Demigod — Compressed State (living)

## 2026-07-13 · v195 LIVE SHIP

- **One-question:** forceWizVisible chrome-only; removed ultimate unhide; critical = current key only
- **Validation:** checkbox `.checked`; non-optional steps require non-empty; company-name required
- **Click:** bare `href="#"` no longer opens hire modal
- **Product:** loadProduct onerror + empty fallback UI
- **Dashboard:** site-green only when live==disk versions + freeze off
- **CDN:** https://files.catbox.moe/gxwld0.js · footer v41
- truth claims.live==disk true


## 2026-07-13 · v194 DISK (not live) — WIZ reopen idempotent

- `show()` no longer deletes `dgWizBuilt` / rebuilds chrome every open
- Reopen uses `form.__dgWizShow` to refresh current step
- Gates: smoke + verify:source PASS · **publish freeze ON** → live still v193 until ship
- Codex API: gpt-5.6-sol ~$5/1M in · $30/1M out; rate limit sample 5k RPM / 4M TPM on gpt-4o-mini tier


## 2026-07-13 · v193 LIVE — dual CTAs

- **Buttons:** `I'm hiring` (startup) · `Find a job` (candidate) — not Hire/Find Talent pair
- **Competitor copy:** Underdog "I'm Hiring"/"I'm a Candidate"; Wellfound "Find your next hire/job"; Arc "Hire talent"/"Find jobs"
- **CDN:** `https://files.catbox.moe/7s02w8.js` · footer-lite **v40**
- **Also:** submit wrapper fix, How→/?p=how, resume step, #dg-bar hide in modal
- **Gates:** source PASS · smoke v193
- **Prompt pack still drives:** product loader race, one-question ownership, waitPost fixtures


## 2026-07-13 · v191 DISK (multi-agent pack + form P1s)

- **Agents queried:** Fable, Codex exec+review, Claude Sonnet, Claude Opus (Heavy-grade). SuperGrok Heavy browser: no grok.com tab.
- **Master pack:** `docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md` · `/tmp/dg-busy/prompt-pack/`
- **Disk foot v191:** submit wrapper fix (`dgWfStatusRoot`), no force `.w-form-done`, How → `/?p=how`, resume `startIdx`, truth CDN `src=` match.
- **Gates:** verify:source PASS · foot-smoke v191 PASS · board honesty OK.
- **Live:** still **v190** `f5r4yt.js` — publish freeze ON; ship CDN+Webflow after unfreeze.
- **Next Grok:** fixture for waitPost · product loader · one-question ownership · CDN ship v191.

---

## 2026-07-13 · v187 FREEZE FIX (shipped)

- **Root cause:** `wizBuild` form MutationObserver wrote `style` on every attribute mutation → infinite sync thrash → page freeze / never `load`.
- **Also:** removed full-document OBS thrash; hero CTAs no longer `display:none` by aggressive nav dedupe (v184).
- **Live foot:** `https://files.catbox.moe/sx8bw3.js` · footer-lite **v31 map5** · product sticky mobile CTAs.
- **Local proof:** load 120ms · WIZ open · deep-link · mobile bar · hero CTAs visible.
- **Verify:** `demigod:verify:source` PASS.
- **Product map5:** hire 9hf7zj, talent kuejms, how qoc2gv, pricing af8teb, pilot 7tf8v0, proof ne8030, faq ylgfkk, compare njdv6h.


**Update this file every ship.** Source of truth for humans + agents.  
**Last update:** 2026-07-13 · Live foot **v187** (`sx8bw3.js`) freeze fix
**Live:** https://www.trydemigod.com · Staging: https://talentlink-sf.webflow.io  
**Decision:** **FIX** not rewrite · demand + lean site build  
**Roadmaps:** `docs/exchange/DEMIGOD-STARTUP-ROADMAP.md` · `docs/exchange/DEMIGOD-LIVING-ROADMAP.md`

---

## 1. One-line truth

**SF startup talent matching:** human-reviewed briefs ↔ candidates; **10% on hire**; `hello@trydemigod.com`.  
**Differentiator:** not a job board / not ATS — **90-day outcome + mutual yes + private until both sides agree**.  
**Bottleneck:** demand (founder DMs + one pilot) · site conversion polish is secondary.

---

## 2. Live vs disk

| Piece | Truth |
|-------|--------|
| Foot disk | `demigod-foot-core.js` **v183** · `__dgFootVer='183'` |
| Foot CDN | https://files.catbox.moe/3fzlp6.js |
| Loader | `demigod-footer-lite.html` → 3fzlp6 + honesty soft-patch |
| Head | `demigod-head-minimal.html` unhide-v5-safe |
| Board | 2 samples · realRoles 0 · realReceipts 0 |
| Verify | `npm run demigod:verify:source` + board-honesty + loop-state |

**Version rule:** Never claim live == disk without CDN body hash.

---

## 3. Recent ships

| Ver | What |
|-----|------|
| v181 | Mobile CTA color fix; 48h scrub |
| v182 | Diff FAQ; hero not board/ATS; contact deep-links |
| **v183** | Path pills **I'm hiring / I'm looking**; `ensureHowLink` in run; badge HUMAN-MATCHED; CDN sync |

---

## 4. Startup phase (summary)

| Phase | Focus |
|-------|--------|
| **Now** | Demand + first white-glove pilot + conversion site polish |
| **30–90d** | Proof + first invoice path |
| **90d+** | Light matching OS only if demand hurts humans |

Full: `docs/exchange/DEMIGOD-STARTUP-ROADMAP.md`  
Research: `docs/research/DEMIGOD-DEEP-RESEARCH-STRATEGY-2026-07-13.md`

---

## 5. Agent roles

| Actor | Job |
|-------|-----|
| Heavy / Opus | Strategy |
| Fable | Plans via `bin/df` |
| Sonnet | Copy / audit |
| Codex | Code review |
| Grok | Execute, verify, publish, docs |
| Human | Real DMs + money decisions |

**Not for Demigod product:** Hermes / ElizaOS (personal later only).

---

## 6. Hard constraints

No 48h/SLA/founder-name · pending Twilio/Stripe language · ≤3 sample board roles · one foot-core writer · no game work · no concurrent thrash

---

## 7. Next

1. Human Top3–15 warm founder DMs  
2. Form e2e when useful  
3. Pilot terms + invoice SOP  
4. Site only for P0 / clear conversion wins

---

## Agent session tooling (2026-07-13)
- `bin/dg-start` — refresh AGENT-BRIEF + ship-status + lock
- `demigod-foot-lock.mjs` / `bin/dg-lock` — durable + flock foot writer lock
- `demigod-ship-status.mjs` — disk→CDN→live state machine
- Dashboard: http://127.0.0.1:9878/ · brief file `/tmp/dg-busy/AGENT-BRIEF.md`
- Docs: `docs/exchange/DEMIGOD-AGENT-TOOLING-2026-07-13.md`

## Agent wants debate (2026-07-13)
See `docs/research/DEMIGOD-AGENT-WANTS-DEBATE-SETTLEMENT-2026-07-13.md` — settlement: demand pack + hash-gated publish + PLAN-LEDGER + claim-verifier.
# Demigod — Agent Rules (Webflow / trydemigod.com)

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
# Demigod workflow (human + agent)

## What we're building

**trydemigod.com** — SF startup talent matching. Webflow site + custom foot JS + native forms.  
**Startup ops** — submissions, outreach, partnerships, SLA pager, proof logging (see `npm run demigod:status`).

## Daily agent session

```bash
~/agent-dev.sh audit           # full laptop + Demigod audit JSON
~/agent-dev.sh status
~/agent-dev.sh up              # Chrome CDP only
npm run dev:workspace          # Designer + live + Grok tabs
```

If Chrome has >10 tabs: `npm run dev:tabs-cleanup`

## Edit → verify → publish

1. **Edit** one file: usually `demigod-foot-core.js`, head CSS, or a `demigod-*-pass.mjs` script.
2. **Verify:** `npm run demigod:verify:all` (or `demigod:verify:source` + board-honesty + loop-state).
3. **CDN** (if foot-core changed): `npm run demigod:foot:cdn` then ensure footer embed still points at working catbox loader (`xngres.js`). Do not republish foot CDN casually.
4. **Custom code paste (once, full replace):**
   - HEAD = full `demigod-head-minimal.html` (must include `unhide-v5-safe`; **never** paste twice).
   - FOOTER = full `demigod-footer-lite.html` (must include `xngres.js`).
5. **Publish:** Webflow → check **both** `talentlink-sf.webflow.io` **and** `www.trydemigod.com` → “Publish to selected domains”.
6. **Confirm production (not staging only):**
   ```bash
   curl -sL "https://www.trydemigod.com/?v=$(date +%s)" | grep -o 'Last Published: [^<]*'
   curl -sL "https://www.trydemigod.com/?v=$(date +%s)" | grep -c unhide-v5-safe   # ≥1
   ```
7. **Smoke:** hard-refresh live — page must paint quickly (no endless spinner). Incognito form → `hello@trydemigod.com` copy.

### Load / publish failure modes (2026-07-09)

See `docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md`.

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Endless spinner / freeze | HEAD unhide MutationObserver thrash or doubled head paste | Ship `unhide-v5-safe` **once**; zero MO in `<head>` |
| “Publish did nothing” | Only staging domain selected | Check **www.trydemigod.com** in publish dialog; compare Last Published |
| Blank hero | IX hide + broken unhide | v5 CSS unhide + finite ticks |
| Gates green, site wrong | Disk ≠ live custom code | Always curl production after publish |

**Never** reintroduce attribute `MutationObserver` in HEAD that writes styles.

## Who does what

| Step | Agent | Human |
|------|-------|-------|
| JS/CSS logic + canonical edits | ✓ (full cycles) | |
| Review, verify, dry GTM/pilot prep, CDP audits | ✓ (autonomous within rules) | |
| Webflow Designer structure | MCP when asked | ✓ masters / IX |
| Publish click | | ✓ |
| Form spam test (incognito) | prepare + dry scripts | ✓ |
| Strategy / copy (Heavy) | Heavy via Grok/Fable | review |

Agent runs safe autonomy cycles (see DEMIGOD-AGENTS.md "Autonomous Operation").

## Out of scope (unless asked)

- Eat the Sounds game files and `npm run verify:all`
- Auto agent loops (`demigod:continuous`, `continuous-improve-loop.mjs`)
- Cursor cloud dispatch without explicit user request

## Useful status commands

```bash
npm run demigod:status
npm run demigod:verify:live
npm run demigod:audit:forms
npm run demigod:leverage:status
```
codex
The governing documents show multiple policy eras and some stale snapshots, so I’m treating dated ship records, git history, CDN/version checks, and postmortems as stronger evidence than undated role tables. Next I’m mapping the exchange corpus and actual executable surface.
exec
/bin/bash -lc "find docs/exchange -maxdepth 1 -type f -printf '%f\\t%s bytes\\n' | sort; wc -l prompts/demigod/MASTER* demigod-tools-registry.mjs demigod-control.mjs package.json bin/dg bin/dg-* bin/dgsnap 2>/dev/null | tail -n 5; git log --date=iso --pretty=format:'%h%x09%ad%x09%an%x09%s' --all -- . ':"'!ninjawhee-eat-the-sounds.html'"' ':"'!overworld.js'"' ':"'!vinyl-*.js'"' ':"'!game-progress.js'"' ':"'!pause-journal.js'"' ':"'!pixel-gfx.js'"' | head -n 250" in /home/potter
 succeeded in 0ms:
DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md	5569 bytes
DEMIGOD-AFK-WORKLOG-2026-07-13.md	1144 bytes
DEMIGOD-AGENT-COCKPIT.md	1321 bytes
DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md	5398 bytes
DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md	13558 bytes
DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md	15001 bytes
DEMIGOD-AGENT-SWARM-STATUS-2026-07-13.md	836 bytes
DEMIGOD-AGENT-TOOLING-2026-07-13.md	1031 bytes
DEMIGOD-AGENT-TOOLS-WISHLIST-BUILT.md	1292 bytes
DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md	2307 bytes
DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md	3101 bytes
DEMIGOD-BACKLOG-HUGE.md	1028 bytes
DEMIGOD-BLOAT-CUT-PASS-2026-07-13.md	2135 bytes
DEMIGOD-CDN-V179-READY.md	933 bytes
DEMIGOD-COMPETITOR-DIFF-2026-07-13.md	1608 bytes
DEMIGOD-COMPETITOR-UX-INSPIRATION-2026-07-12.md	5104 bytes
DEMIGOD-COPY-PACK-2026-07-13.md	2032 bytes
DEMIGOD-DASHBOARD-V2-2026-07-13.md	1052 bytes
DEMIGOD-DOUGLAS-CALL-PACK-2026-07-13.md	1400 bytes
DEMIGOD-FABLE-12H-2026-07-13.md	2036 bytes
DEMIGOD-FABLE-POST-PUBLISH-48H.md	2125 bytes
DEMIGOD-GTM-NEXT-BATCH-2026-07-12.md	2258 bytes
DEMIGOD-LIVING-ROADMAP.md	1333 bytes
DEMIGOD-MULTI-AGENT-CONSENSUS-2026-07-13.md	1424 bytes
DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md	14030 bytes
DEMIGOD-MULTI-AGENT-RESEARCH-APPLIED-2026-07-13.md	2505 bytes
DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md	8219 bytes
DEMIGOD-NEXT-HOUR.md	812 bytes
DEMIGOD-OPENAI-CODEX-RESEARCH-2026-07-12.md	8360 bytes
DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md	4354 bytes
DEMIGOD-RELEASE-MANIFEST.json	1421 bytes
DEMIGOD-SCOPE-NOW.md	1566 bytes
DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md	2635 bytes
DEMIGOD-SESSION-START-2026-07-13.md	1275 bytes
DEMIGOD-SETTLEMENT-EXECUTED-2026-07-13.md	1070 bytes
DEMIGOD-SONNET-LIVE-RISKS-2026-07-13.md	1652 bytes
DEMIGOD-STARTUP-ROADMAP.md	5279 bytes
DEMIGOD-SWARM-BACKLOG-SPRINT-A-2026-07-13.md	1381 bytes
DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md	5449 bytes
DEMIGOD-TALENT-ENG-SHIP-2026-07-10.md	2051 bytes
DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md	7851 bytes
DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md	5561 bytes
DEMIGOD-USER-TEST-HARNESS-2026-07-13.md	1999 bytes
DEMIGOD-UX-TEST-REPORT-2026-07-12.md	1596 bytes
DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md	16253 bytes
     2 bin/dg-watch-submits
    13 bin/dg-webflow
     2 bin/dg-worker-budget
    12 bin/dgsnap
  3768 total
f228a61	2026-07-14 11:15:53 -0700	potter	Great design v198: brand assets, product pages v3, home glow
e9b744a	2026-07-14 11:06:33 -0700	potter	Design v197: cooler UI system + sharpened site/form copy
1f6615b	2026-07-14 10:58:01 -0700	potter	Ship live v196 foot + knfmdf head CSS (freeze off)
9645174	2026-07-14 10:51:11 -0700	potter	Build finish: mint approve, auto-propose quality, ship-prep, freeze guards
ed69995	2026-07-14 10:47:06 -0700	potter	Finish WIP: match honesty, freeze env, approve sample, orca pair, nav UX
305aa3f	2026-07-13 13:37:55 -0700	potter	Cohesion: full-check, freeze guards, honesty JSON, WIZ UX v196
d8edc21	2026-07-13 13:34:36 -0700	potter	Head CSS: focus-visible, WIZ CTA depth, 90day field emphasis
f6daa65	2026-07-13 13:34:29 -0700	potter	Orca phone remote seat: bridge tools, keep-awake, control plane module
dcc2c65	2026-07-13 13:11:05 -0700	potter	Demigod ops stack: control plane home, tools, webflow, review
9ca8d71	2026-07-09 04:05:55 -0700	potter	build: events flow, sourcing, matching decide, Stripe when, head website, docs refine, verified, publish auto
001ddc3	2026-07-09 03:36:04 -0700	potter	per Fable: board trim, lib fixes, publish, research
8736d60	2026-07-09 03:35:17 -0700	potter	fix: board to 2 roles, lib dedupe+cap3, ingest gate, writer lock per Fable boss. Automation + publish.
06720f8	2026-07-09 03:34:36 -0700	potter	fix: board trim + writer lock + head research per Fable boss; automation improvements
3029ead	2026-06-29 08:28:41 -0700	potter	init: demigod + dev workspace base
exec
/bin/bash -lc "sed -n '1,260p' prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md; sed -n '1,260p' prompts/demigod/MASTER-IMPROVE-CLAUDE.md; sed -n '1,260p' prompts/demigod/MASTER-IMPROVE-CODEX.md; sed -n '1,260p' prompts/demigod/MASTER-IMPROVE-FABLE.md; sed -n '1,320p' demigod-tools-registry.mjs; sed -n '1,300p' demigod-control.mjs; node -e \"const p=require('./package.json'); for(const [k,v] of Object.entries(p.scripts||{})) if(k.includes('demigod')||k.startsWith('dg')) console.log(k+'\\t'+v)\"" in /home/potter
 succeeded in 0ms:
# MERGED MASTER WEBSITE IMPROVEMENT PROMPT
## Demigod · trydemigod.com · generated 2026-07-14T18:29:16.819782+00:00

This document merges independent long-form prompts from:
1. **Codex** (`prompts/demigod/MASTER-IMPROVE-CODEX.md`) — principal engineer + design director voice
2. **Claude** (`prompts/demigod/MASTER-IMPROVE-CLAUDE.md`) — senior product engineer + design lead voice
3. **Fable** — df session empty/hung; Claude also filled Fable-role alternate if present

Use this as the single brief for an implementation agent (or re-run as-is).

---

## How to use
1. Paste the **Merged execution brief** (Section A) as the agent system task.
2. Keep Codex + Claude full texts as appendices for detail.
3. Prefer **P0 bug/honesty** before cosmetic P2.
4. Respect freeze / human Publish gates as stated in both source prompts.
5. Canonical site JS remains **only** `demigod-foot-core.js`.

---

## Section A — Merged execution brief (run this)


### Role
You are implementing a full improvement pass for Demigod (Webflow talent matching) at `/home/potter`, live site https://www.trydemigod.com.

### Current disk truth (verify before edit)
- Foot: demigod-foot-core.js (check `__dgFootVer` / dg-foot-v*-core)
- Head CSS: demigod-head-styles.css + demigod-head-minimal.html
- Product pages: demigod-pages/* (+ _shell.css)
- Footer loader: demigod-footer-lite.html
- Pipeline: demigod-foot-cdn-publish.mjs, demigod-head-css-publish.mjs, demigod-cm6-paste-publish.mjs, demigod-publish-freeze.mjs

### Hard constraints (both agents agree)
1. One canonical site JS: demigod-foot-core.js only
2. Honesty: NO 48h/SLA/turnaround; NO founder names; pending for Stripe/SMS; sample board labeled; realRoles=0 until real
3. Dual CTAs only: "I'm hiring" vs "Find a job" / join network — never Hire talent + Find talent
4. Catbox raw .html is text/plain — never navigate users to raw catbox HTML; use proper routes or validate MIME
5. Do not touch Eat the Sounds game
6. Verify after every change: npm run demigod:verify:source + board honesty + loop-state + foot-smoke + WIZ playtest
7. Freeze ON → work disk only until freeze off + authorized ship; paste via CM6 full replace not append

### P0 — Bugs & correctness (do first)
1. **forceMobileDesktopWIZ / showStep ownership**: one-question WIZ must stay one active field after resize/orientation/reopen; no broad unhide of all inputs
2. **Agent-smoke foot version**: assert exact live __dgFootVer + CDN URL + content-type + no console errors (not soft 195 masquerade)
3. **Webflow 412**: redirect/publish API auth failures must fail tests loudly; don't silently treat as home
4. **Product page MIME**: DEMIGOD-PAGES catbox URLs must not be user-facing navigation if text/plain; fix serving or use /?p= routes with HTML content
5. **FOUC / head**: critical CSS inline; unhide finite; no MutationObserver freeze; CSS CDN failure still readable
6. **Sample badges** on every sample role; never "LIVE ROLES HIRING NOW" semantics for samples
7. **Boot integrity**: every called function defined; boot-smoke parse; IIFE closes
8. **Form integrity**: 90day-outcome required; review step before submit; double-submit guard; real success only on real form result
9. **Dedup injects**: no double nav/FAQ/trust on re-run(); no bare href=#
10. **Banned copy scrub** matches current strings; Designer static still audited

### P1 — Design system & UI/UX
- Tokens: near-black tiers, gold scarce action color, muted stone secondary, clamp type scale, radii, focus rings, reduced-motion
- Home: 10-second path choice; hero fit 320–1440; one dominant CTA pair; process preview; honest pricing signal; FAQ; final dual CTA
- Nav: glass/sticky, consistent labels, mobile menu or bar without overlap
- WIZ: glass modal, progress a11y, 44px targets, review with Edit, keyboard Enter/Esc, focus trap
- Product pages: shared shell, unique H1/meta, sticky mobile CTA, hero band optional
- Micro-interactions only for state; no scroll-jacking
- LCP/CLS budgets; preconnect only used origins; degrade if catbox fails

### P1 — Copy (every surface)
Rewrite as a system: eyebrow, H1, sub, badges, trust, nav, buttons, section headers, process, pricing, privacy, partner, footer, FAQ, WIZ questions/hints/placeholders/validation/success, schema, alt text.
Voice: direct, intelligent, selective, operational. No elite/divine/AI-recruiter hype.
Pending: "Payments and SMS are pending. hello@trydemigod.com is the active path."

### P1 — Forms (startup / engineer / partner)
- Startup: email → company → stage → role → 90day → skills → comp → timing → optional JD → review → submit
- Engineer: name → email → LinkedIn → skills → shipped → SF preference → availability → optional → review
- Partner: tertiary; honest referral terms; no fake tracking infrastructure
- Tests: demigod-wiz-cdp-playtest --local; reopen thrice; resize; orientation

### P1/P2 — Pages & features
- Normalize /how /hire /talent /pricing /compare /proof /network /faq
- Proof page radical honesty (live vs sample vs pending)
- Compare page: boards / agencies / Demigod — no unverifiable competitor claims
- SEO: unique title/description/canonical/OG per page
- Analytics: demigod:analytics CustomEvent, no PII
- Optional: OAuth prefill (LinkedIn engineers) as pending layer — don't claim live

### P2 — Polish
- Motion polish, empty states, reduced-motion, print styles, schema.org JobPosting only if real
- Performance Lighthouse targets ≥90/95/95/95 as stretch
- Screenshot baselines at 320/390/768/1024/1440

### Ship pipeline
1. Locks + pre hashes
2. Gates green
3. Freeze status
4. Foot CDN publish + fetch verify version/hash
5. Head CSS CDN + head-minimal URL
6. Product pages proper HTML serve
7. CM6 full replace head+foot, Save, verify editor contents
8. Publish only freeze OFF
9. Live cache-bust poll both domains
10. Live smoke + screenshots + receipt

### Testing matrix (must pass)
| Area | Command / method |
|------|------------------|
| Source | npm run demigod:verify:source |
| Foot smoke | node demigod-foot-smoke.mjs |
| Board honesty | node demigod-verify-board-honesty.mjs |
| Loop state | node demigod-verify-loop-state.mjs |
| Full check | bin/dg full-check |
| WIZ | node demigod-wiz-cdp-playtest.mjs --local |
| Usertest | node demigod-user-test.mjs --quick / full |
| Live smoke | node demigod-agent-smoke.mjs |
| Visual | CDP screenshots desktop/mobile/WIZ |

### Acceptance (not "looks better")
- Founder & candidate know path in 10 seconds
- All three forms complete, accessible, honest
- Zero banned promises / fake proof
- Public pages correct HTML + metadata
- First paint useful under dependency failure
- Mobile + keyboard pass
- Disk/CDN/live version+hash aligned when shipped

### Handoff format
BASELINE · CHANGES · TEST MATRIX · HONESTY LEDGER · SHIP STATE · REMAINING P0/P1/P2

---



# APPENDICES (full agent prompts)

## Codex

# MASTER WEBSITE IMPROVEMENT PROMPT

You are the principal product engineer and design director implementing a disciplined, conversion-focused improvement pass for Demigod, a pre-services SF startup talent-matching company. Work in `/home/potter`. The public site is `https://www.trydemigod.com`; the Webflow project is `talentlink-sf`. Begin every internal planning/review prompt with: **“Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty.”**

Your job is to make the site feel as deliberate, polished, fast, and trustworthy as Linear, Mercury, or Stripe—without copying those products, inventing proof, bloating the product surface, or obscuring that Demigod is still pre-services. This is a FIX-and-refine project, not a framework rewrite. Demand and the first real pilot remain more important than decorative website work. Ship only changes that improve comprehension, trust, conversion, usability, accessibility, or reliability.

## Read first and preserve the architecture

Before editing, read `AGENTS.md`, `DEMIGOD-COMPRESSED-STATE.md`, `DEMIGOD-AGENTS.md`, `DEMIGOD-WORKFLOW.md`, and the current source files below. Do not trust old version tables over current disk truth: `demigod-foot-core.js` is currently v198 (`/*dg-foot-v198-core*/` and `window.dgFootVersion='v198'`). Inspect git status and preserve unrelated user changes.

Canonical website sources:

- `demigod-foot-core.js`: the one and only canonical custom behavior file. It owns WIZ, runtime copy, modal behavior, product routing, injected trust/FAQ/navigation blocks, board rendering, analytics hooks, and progressive enhancements.
- `demigod-head-styles.css`: canonical design system and responsive styling.
- `demigod-head-minimal.html`: canonical Webflow HEAD paste, critical paint safeguards, SEO defaults, preconnects, CSS loader.
- `demigod-footer-lite.html`: tiny route/foot loader only; it must not become a second application.
- `demigod-pages/*`: static product-page sources, including `_shell.css`, `how.html`, `hire.html`, `talent.html`, `pricing.html`, `compare.html`, `proof.html`, `network.html`, `faq.html`, and any current pilot/events artifacts.

Supporting pipeline files may be changed only where required by this brief: `demigod-agent-smoke.mjs`, `demigod-foot-smoke.mjs`, `demigod-product-publish.mjs` or the current product publisher/manifest, `demigod-foot-cdn-publish.mjs`, `demigod-cm6-paste-publish.mjs`, `demigod-publish-freeze.mjs`, `demigod-ship-checklist.mjs`, verification scripts, and `package.json` scripts. Do not fork website logic into new foot files.

Never touch, inspect, verify, serve, or discuss the archived Eat the Sounds game. In particular do not edit `ninjawhee-eat-the-sounds.html`, `overworld.js`, `vinyl-*.js`, `game-progress.js`, `pause-journal.js`, `pixel-gfx.js`, or anything under the game mirror. Do not run `npm run verify`, `npm run verify:all`, or start port 8765. The correct gates are Demigod-specific.

## Non-negotiable truth and copy contract

The product truth is: Demigod helps SF startups and startup candidates create outcome-led briefs/profiles; a human reviews them; a match is proposed only when fit is strong; both sides must say yes before an introduction; candidate profiles are private rather than blasted; candidates join free; the startup fee is 10% of first-year cash salary only on hire; no upfront charge is collected from intake.

The business is pre-services. Make that legible and calm, not apologetic. Use exact, plain pending language where relevant: “Payments and SMS are pending. Email from hello@trydemigod.com is the active contact path.” Stripe checkout, automated invoicing, Twilio, and automatic SMS must never appear live. Do not imply a card will be charged or a text will arrive. A future replacement guarantee must be explicitly conditional on payments being live and a real hire being placed, or omitted.

Hard banned live claims, including HTML, JS-injected copy, metadata, placeholders, form values, schema, alt text, and success states:

- No “48h,” “48 hours,” “within two hours,” response clocks, turnaround promises, “in days,” or any SLA/guaranteed timing.
- No founder or operator names, including John or John Potter. Do not add founder-story/personality marketing.
- No fake client logos, testimonials, placement counts, candidate counts, receipts, case studies, employers, inventory, reviews, metrics, or implied customers.
- No “100% vetted,” “perfect match,” “guaranteed hire,” “instant,” “AI recruiter,” or claims that automation is doing human judgment.
- Never call sample roles real, open, active, available, placed, or currently hiring.

Board honesty is a release gate. Permit at most two or three seed/example roles, each visibly and semantically labeled **Sample** at the card/row level—not merely in a distant disclaimer. Real roles and real receipts remain zero unless an independently verifiable, permissioned artifact already exists. Do not create proof to make the page look fuller.

## Product and information architecture

Create a coherent navigation and page system with one clearly dominant decision at each stage. The home page should orient visitors, establish the distinct model, and route them into one of two mutually exclusive paths. Preserve the correct dual-path CTA language:

- Company path: **I’m hiring** → `?wiz=startup`
- Candidate path: **Find a job** or **Join the network** → `?wiz=engineer`

Never pair “Hire talent” with “Find talent”; those both read as company-side actions. Do not create three equal hero buttons. Partner/referral is a tertiary navigation/footer path, not a hero peer. Audit nav, hero, mobile sticky bar, section CTAs, product pages, modal links, and footer so labels remain consistent and every CTA reaches the intended WIZ or page. Avoid CTA overload and repeated pill bars that compete with the hero.

The desired public architecture is:

- `/` Home: concise value proposition, dual-path routing, how-it-works preview, honest differentiation, pricing signal, sample/proof state, FAQ preview, final dual CTA.
- `/how`: one shared process shown from startup and candidate viewpoints; brief/profile → human review → specific fit → mutual yes → warm intro → fee only on hire.
- `/hire`: founder/startup landing page focused on the 90-day outcome, high-signal small slates, privacy/consent, clear 10% model, and startup WIZ CTA.
- `/talent`: candidate landing page focused on privacy, relevance, candidate-free economics, consent, and engineer WIZ CTA.
- `/pricing`: exact fee basis and trigger, candidates-free statement, no-subscription/no-upfront clarification, pending payment mechanics, concise comparison.
- `/compare`: honest decision guide comparing Demigod with job boards, contingency agencies, internal sourcing, and automated outreach. Do not make unverifiable competitor claims. Include “not for you if you need guaranteed response times or large instant inventory.”
- `/proof`: radical honesty page distinguishing what is live, what is sample, what is pending, and what will become proof after permissioned real outcomes. Empty state must build trust rather than imitate traction.
- `/network`: private talent-network promise, consent mechanics, candidate FAQ, and engineer CTA.
- `/faq`: complete, deduplicated answers for both audiences, fees, privacy, mutual yes, geography, candidate cost, human review, pending SMS/payment status, timing-without-SLA, referrals, and contact.

If the current static sources already provide these pages, improve and normalize them rather than inventing parallel pages. Ensure every page has a stable product route served with `text/html`, canonical URL, unique title/description, OG/Twitter metadata, one H1, logical headings, working nav, footer, and appropriate CTA. Use a common shell/design token source rather than eight drifting inline copies when this can be done safely within the current static publish system. Keep `/pilot` non-indexed or clearly pre-services if it remains operational rather than public marketing.

## Visual direction: premium dark gold, restrained and original

Build a dark, editorial, high-trust visual system—not a cyberpunk recruiter theme. Aim for the craft level of Linear’s restraint, Mercury’s composure, and Stripe’s hierarchy, while keeping Demigod distinct.

Use near-black warm backgrounds, subtly differentiated surfaces, quiet borders, high-contrast warm white text, muted stone secondary text, and gold as a scarce action/signal color. Gold should feel metallic through restrained tonal variation, not yellow neon. Define tokens in `demigod-head-styles.css` and reuse them in `_shell.css`: background tiers, text tiers, gold/hover gold, border, focus, danger/success, radii, shadows, spacing, container widths, and type scale. Prefer CSS gradients/noise made with lightweight CSS; avoid heavy texture images and gratuitous glows.

Design requirements:

- Strong but compact typography with fluid `clamp()` sizing, readable line lengths, balanced headlines, and normal sentence case for body/UI. Avoid excessive all-caps and faux-terminal styling.
- A calm header with crisp active states, reliable mobile navigation, and one dominant company CTA. Candidate path remains discoverable.
- Hero with an immediately intelligible headline, short subhead, two clearly differentiated path actions, and a compact trust line. It must fit without awkward clipping at 320px and without excessive empty space on desktop.
- Cards and process steps should have purposeful hierarchy, subtle depth, and consistent padding—not a dashboard grid for its own sake.
- Microinteraction only where it communicates state: hover/focus, modal entry, WIZ progress, accordion disclosure. Respect `prefers-reduced-motion`; no scroll-jacking or continuous decorative animation.
- Replace fragile raster backgrounds where feasible with CSS or properly optimized assets. Preserve intrinsic dimensions and avoid layout shift.
- All loading/failure states must remain visually coherent even when Catbox CSS/JS fails.

## Home-page copy and UX

Rewrite every visible string as a system, not isolated clever lines. The home hero must say who it is for, what happens, and why it differs in under ten seconds. Favor concrete phrases such as “Human-reviewed matches for SF startup teams” and “Start with the outcome this hire must own,” while preserving the approved truths. Do not overuse “curated,” “elite,” “divine,” “signal,” or “noise.” Brand voice: direct, intelligent, selective, humane, operationally credible.

Audit and rewrite: eyebrow, headline, subhead, badges, trust lines, nav labels, buttons, section headers, process steps, comparison copy, sample ledger labels and empty states, pricing notes, privacy copy, partner/referral copy, footer, FAQ, modal introductions, validation errors, upload hints, placeholders, review screens, submission progress, failure messages, and success screens. No placeholder should contain a real person or fake company. Use illustrative neutral examples only where helpful, labeled as examples.

The home page should not pretend the sample ledger is proof. Prefer a transparent “Examples of the briefs we are designed to handle” section with local Sample badges. If a dynamic board has no honest entries, render a deliberate empty state, not a blank region and not fabricated fallback candidates. Any pipeline note must count sample versus real correctly.

## WIZ: startup, engineer, and partner

Treat the WIZ as the core product. Preserve Webflow native forms and field names unless a verified migration is necessary. Each flow must work by mouse, keyboard, touch, deep link, reopen, resize, orientation change, browser back/forward where supported, and submission success/failure.

Shared behavior:

- One question at a time means exactly one active field wrapper plus WIZ chrome. Do not globally force every label/input/wrapper visible.
- Replace the broad `forceMobileDesktopWIZ()` approach with a narrow, deterministic layout update. The current implementation repeatedly forces inputs, labels, wrappers, ancestors, and chrome on resize/orientation and risks breaking one-question ownership. One state machine (`wizBuild`/`showStep`) must own visibility. Responsive behavior belongs primarily in CSS; JS may update only state that cannot be expressed in CSS.
- Preserve v194+ reopen idempotence: reopening must not duplicate chrome or rebuild the form. `dgWizBuilt` and `form.__dgWizShow` behavior must remain reliable.
- Progress must use the actual required/optional step model, announce changes accessibly, and never count welcome/thanks incorrectly.
- “Next” stays disabled only when required data is invalid; optional steps can be skipped. Enter advances where safe; Shift+Enter/newlines work in textareas; Escape closes only with an unsaved-data confirmation when appropriate.
- Add a concise review step with Edit links before submit. Preserve values after navigating backward and after recoverable errors.
- Inline validation must identify the exact field, explain correction in plain language, set `aria-invalid`, connect errors with `aria-describedby`, and focus the first invalid input.
- Submitting must prevent double submission, show a non-jittering busy state, and recover on network/Webflow failure. Never force `.w-form-done`; success only follows a real confirmed form result.
- Modal focus trap, initial focus, focus return, accessible name/description, close button, background inertness/scroll lock, and screen-reader announcements are required.
- Inputs need useful `autocomplete`, `inputmode`, type, minimum constraints, and file acceptance. Touch targets are at least 44px.

Startup WIZ: keep the 90-day outcome as the anchor. Improve sequence to minimize abandonment: work email, company, stage, role, outcome, essential skills, compensation, timing/team context, optional JD, review. Explain why sensitive details help. Do not promise “3–5” unless the operating model truly guarantees it; safer copy is “a small set” or “only strong fits.” Success: brief received, human review, mutual yes, email active, payments/SMS pending; no timing.

Engineer WIZ: name, email, LinkedIn, core skills, shipped outcomes, SF/Bay Area preference, availability, compensation preference, optional portfolio/GitHub/resume/phone, review. Explicitly explain privacy and consent before submission. Do not say “Find a job” if the success state implies immediate inventory; say the profile is received and contact occurs only when a specific fit exists. SMS language must say pending, not “we can text.”

Partner WIZ: clarify who qualifies, what can be referred, consent requirements, attribution, and that 20% is a share of an actually collected placement fee only if that commercial policy is approved in current source truth. If not independently approved, remove the percentage and use “referral terms are confirmed by email.” Never imply automatic tracking or payout infrastructure. Partner remains tertiary. Success must say application/referral received and email follow-up, with no response clock.

## Concrete defects to resolve

Do not merely paper over these with more `!important` rules. Add regression coverage for each:

1. **`forceMobileDesktopWIZ` visibility conflict.** It applies broad inline visibility/display forces on fields, labels, wrappers, and ancestors during resize/orientation. This can reveal multiple questions, fight `showStep`, distort desktop layout, and make the modal impossible to reason about. Consolidate visibility ownership, reduce inline writes, and prove active-wrapper count equals one at all breakpoints and after reopen/rotation.
2. **Agent-smoke foot loading.** The smoke path can report body/H1 success while the canonical foot is absent, stale, or its CDN request has failed. Make foot presence, exact `window.dgFootVersion`, source/CDN/live hash alignment, successful JS response/content type, WIZ constructor presence, and console/page errors explicit blocking assertions. Do not accept runtime soft-patch/version masquerading as source equality.
3. **Webflow redirect/status 412.** Product or route fetches have encountered Webflow 412/redirect behavior. Do not treat every non-200 as content or fall back silently to the home/startup WIZ. Use deterministic same-origin routes, follow/validate redirects intentionally, check final URL/status/content type/body marker, present a useful page failure state, and make 412 a failing publish test with diagnostic URL/status chain.
4. **Catbox HTML MIME.** Raw Catbox `.html` is served as `text/plain` and is not a valid navigable product page. Never link or `location.replace` public users directly to raw Catbox HTML. Publish/serve product pages through proper Webflow/same-origin HTML routes or another endpoint that returns `text/html`; JS product loading must validate MIME and body markers before rendering. Keep the source comment’s invariant and extend tests.
5. **FOUC/blank/freeze risk.** The head currently depends on Catbox CSS and Webflow IX unhide workarounds. Previous print-media swap left pages unstyled; prior MutationObserver style writes caused an infinite freeze; doubled head pastes and broad unhide rules exposed modal internals. Keep HEAD JS-free, never add an attribute MutationObserver in HEAD, provide minimal critical tokens/layout inline, use finite/idempotent unhide behavior, and prove first paint never shows hidden modal fields or remains blank if CSS/JS fails.
6. **Sample badges and board semantics.** Sample status must live on every sample role/candidate, survive dynamic board replacement, be machine/readable enough for tests, and never be combined into ambiguous stage/status text. Counts and headings must not suggest real inventory. Real=0 must render honestly.
7. **Dual-path CTA drift.** Normalize all home/nav/mobile/product/footer CTAs to company versus candidate intent. Prevent “Hire talent / Find talent,” hash-only anchors, wrong-modal opens, `/how` links that unexpectedly open startup WIZ, and fallback routing that defaults unknown product paths to hiring.

Also audit for: duplicate nav/footer/trust injection after repeated `run()`, click-capture handlers that hijack ordinary links, bare `href="#"`, modal bar showing behind WIZ, stale text in Webflow canvas that flashes before runtime replacement, product loader `document.write`/race behavior, overly broad blank-body guards, missing product-page fallbacks, submission wrapper/status-root errors, required-checkbox validation using value instead of `.checked`, repeated resize listeners, and memory/performance leaks from observers.

## Performance and resilience

Set measurable budgets and verify them on throttled mobile, without sacrificing correctness:

- No render-blocking custom JS in HEAD. Canonical foot loads once, with clear failure handling.
# MASTER PROMPT — Improve the Demigod Website (trydemigod.com)

You are a senior full-stack product engineer + design lead operating on the live Demigod codebase at `/home/potter`. Demigod is a Webflow-hosted talent-matching product (startups ↔ engineers). Your mandate: raise the quality of the site end-to-end — design, UI/UX, forms, copy, features, pages, bugs, code quality, testing — and leave it in a demonstrably shippable, honest, verified state. Work like an owner: plan first, make surgical changes to the canonical files, verify every change, and never publish anything you have not proven correct.

---

## 0. NON-NEGOTIABLE GROUND RULES (read first, they override everything)

1. **One canonical file for site JS.** All site behavior lives in `demigod-foot-core.js`. Edit ONLY that file for site logic. Head styles live in the head custom-code / head styles block. Static page structure/text lives in `demigod-pages` (Webflow Designer content). Do not scatter site logic across the `demigod-*.mjs` helper scripts — those are tooling, not the site.
2. **Verify gate is mandatory after EVERY edit.** Run `npm run demigod:verify:source` (or the targeted `:all`) plus board-honesty and loop-state checks. A build that does not parse (boot-smoke) is NEVER shippable even if all grep gates are green. Always `grep` that referenced functions (e.g. `run(`, `show(`, `wizBuild(`) are actually DEFINED, not just called — past corruptions shipped calls with no definitions.
3. **Boot-smoke before trust.** Before claiming any build is good, execute a parse/boot smoke test (vm shim) on `demigod-foot-core.js`. "All grep gates green on a file that doesn't parse" has happened repeatedly — do not repeat it.
4. **Honesty policy (hard copy rules):**
   - NO "48h", NO SLA promises, NO turnaround-time guarantees anywhere (custom code OR static Designer text).
   - NO founder names / personal names on the live site. Use `hello@trydemigod.com will follow up`.
   - Services not yet live (Twilio/SMS, Stripe, matching automation) MUST use "pending" language — never imply they are active.
   - Board data: max 3 seeds until real receipts exist; `realRoles: 0` until real; sample rows labeled `sample:true`. Never mint fake pilots/receipts/testimonials.
   - Do not overclaim ("LIVE ROLES HIRING NOW", fake counts, fabricated testimonials).
5. **Human owns the Publish click.** You PREPARE (CDN upload, custom-code paste via CDP, diffs, screenshots, verification). Do not force-publish. Never set `DEMIGOD_FORCE_PUBLISH` to bypass freeze guards. Respect any active freeze (`assertNotFrozen`) — if a freeze is on, do design/code/test work on disk only and STOP before shipping.
6. **Do not touch the archived game.** "Eat the Sounds" is archived. Never modify it unless the user explicitly says "reopen the game".
7. **No silent scope creep.** Minimal, purposeful changes. Every change must be justified against product goals (current phase: GTM + pre-services honesty). If the site is "mostly done," prefer polish + correctness over rebuilds.

---

## 1. FIRST: BUILD A MENTAL MODEL (do not edit yet)

Before any change, establish ground truth. Produce a short written baseline:

- Read `DEMIGOD-COMPRESSED-STATE.md` (living state — start here), `CLAUDE.md`, `DEMIGOD-AGENTS.md`, and the latest `docs/exchange/*` postmortems.
- Read `demigod-foot-core.js` fully. Note: current version stamp (`__dgFootVer`), `BOARD_CDN` id, the WIZ/stepper implementation, form handlers, board render, scrub routines.
- Read the head styles / head custom-code block. Note critical CSS, the unhide script, any render-blocking external CSS (past FOUC/spinner bugs came from render-blocking catbox CSS + a `SyntaxError` in the unhide script that kept the hero `visibility:hidden`).
- Inventory `demigod-pages` (static Designer pages: home, hire, engineers, pricing, legal, partnerships, etc.). Note duplicated nav items, duplicate copyright/email, lorem/placeholder sections, and any banned copy (48h/SLA/names).
- Confirm live vs disk state: what is actually LIVE on trydemigod.com vs what is on disk. Identify drift, and whether it is intentional (freeze) or accidental (stale publish). Do NOT assume disk == live.
- Check board honesty state (`DEMIGOD-BOARD.json`): seed count, realRoles, sample labeling, and whether `BOARD_CDN` in foot matches the board file's cdn id.

Output a concise **BASELINE** section: current version, live/disk drift, freeze status, top defects found, and a prioritized plan (P0 = broken/dishonest, P1 = UX/quality, P2 = polish/features). Then proceed.

---

## 2. BUGS & CORRECTNESS (P0 — fix before anything cosmetic)

Hunt and fix, each with a boot-smoke + verify after:

- **Boot integrity:** every function called at boot is defined; no `ReferenceError`/`SyntaxError`; IIFE opens and closes correctly (past breaks: extra `}` closing the IIFE early, missing `})();` at EOF, misplaced `}catch(e){}`).
- **Head unhide:** the visibility-gate script parses and runs; hero/hero-grid become visible; no leftover display-block hacks on grids; no flash of stale content.
- **Render-blocking / FOUC:** no render-blocking external CSS causing spinner-on-stall; critical styles inline; graceful fallback if CDN assets stall.
- **Forms/WIZ:** selectors are valid and quoted (past crash: unquoted `[name=90day-outcome]` / `#90day-outcome`); stepper actually activates (not dead code); `__submit__` branch is reachable; required fields are visible & submittable; no `enhanceWIZ` fallback that hides the whole `<form>` (vis=0 bug).
- **Board render:** anchor element exists so `renderBoard` isn't a no-op; matches/receipts render once (no triplication); JSON→DOM is escaped (`esc()`), no unescaped `innerHTML` XSS from board JSON.
- **Dedup:** no duplicate nav items ("FIND TALENT" ×2), duplicate copyright/email/tagline, duplicate pricing lines.
- **Honesty runtime scrub:** the scrub routine actually matches current banned strings (regex must match the copy on disk); verify it neutralizes any 48h/SLA/name text at runtime.

For each fix: minimal edit → boot-smoke → `verify:source` → grep-confirm the anchor. Log md5/version before & after.

---

## 3. DESIGN & UI/UX (P1)

Elevate the visual and interaction quality without a rebuild. Aim for a crisp, modern, trustworthy talent-marketplace aesthetic.

- **Visual system:** consistent spacing scale, type scale, color tokens, radius, shadow, and a coherent light/dark treatment. Remove one-off inline styles that fight the system. Ensure brand assets (logo, glow, hero) render sharp on retina.
- **Hierarchy:** clear hero value prop, obvious primary CTA per page, scannable sections. Kill lorem/placeholder sections or replace with real, honest content.
- **Motion:** subtle, `prefers-reduced-motion`-safe animations only; nothing that blocks paint or causes layout shift. No janky RAF/interval loops left running.
- **Responsive:** verify mobile, tablet, desktop for hero, nav, forms/WIZ, board, pricing. No overflow, no invisible required inputs, no split label/input pairs.
- **Accessibility:** color contrast AA, focus states, labels tied to inputs, keyboard nav through the WIZ, `alt` on images, semantic landmarks, visible focus ring, form errors announced.
- **Performance:** minimize render-blocking resources, defer non-critical JS, right-size images, measure LCP; hero should paint fast without a spinner.

Where feasible, drive a real browser (CDP) to screenshot before/after at desktop + mobile widths and confirm the change visually.

---

## 4. FORMS (P1 — the conversion core)

The WIZ (Typeform-style stepper) is the highest-signal surface: startup path + engineer path, with a required `90day-outcome` (high-signal for matching) and an explicit review step before submit.

- Confirm both paths (startup, engineer) step correctly, validate per step, and submit successfully (mock POST in tests).
- Required fields must be visible and enforced; error messaging is clear and inline.
- Engineer resume field must be visible and functional (past bug: invisible required input → unsubmittable form).
- The review step shows a truthful summary before submit; the submit branch is reachable and wired.
- Post-submit: honest confirmation copy — "hello@trydemigod.com will follow up" (no timeframe, no SLA, no name). Pending-services language where relevant.
- Anti-spam (Turnstile/honeypot) present and not breaking submit.
- Test with `node demigod-wiz-cdp-playtest.mjs --local` (injects disk foot, mocks POSTs). Beware known harness pitfalls: doc-order selectors can be shadowed by page `h3`; visibility counts can be doc-wide — fix the harness, don't trust false FAILs.

---

## 5. COPY (P1)

- Sweep every page + the custom code for banned copy: `48h`, SLA/turnaround promises, founder/personal names → replace with honest "pending" + `hello@trydemigod.com will follow up`.
- Tighten value prop and CTAs: specific, credible, no hype. Remove overclaims and fabricated social proof.
- Consistent voice across home / hire / engineers / pricing / legal / partnerships.
- Pricing copy honest (fee range consistent with strategy, e.g. talent-matching fee band) and free of pending-service overclaims.
- Legal pages present and coherent (privacy, terms) with correct contact email.

---

## 6. PAGES & NEW FEATURES (P1/P2)

- Audit each page in `demigod-pages` for purpose, completeness, and honesty. Ensure nav is consistent and deduped across pages.
- Consider (propose before building, keep honest + pending-aware):
  - A clear "How it works" for both sides (startup + engineer).
  - An honest live-board / roles section that renders real seeds only (labeled), degrading gracefully to a "pending — early access" state when `realRoles:0`.
  - Proof/receipts section that only shows real, labeled receipts (never fabricated).
  - FAQ addressing pricing, process, and pre-services status honestly.
  - Improved OG/meta/SEO per page (title, description, social card) — factual only.
- Any new feature must ship behind the same verify + honesty gates and must not add banned copy or fake data.

---

## 7. CODE QUALITY (P1)

- Keep `demigod-foot-core.js` cohesive: no dead code (dead WIZ/stepper has been ~30% of the file before), no duplicate handlers, single source for form send, consistent helpers (`esc`, `wizBuild`, `run`, `show`).
- Escape all dynamic HTML from JSON. No global leakage. Idempotent init (guard against double-boot).
- Head styles/scripts: valid, parseable, no dead render-blocking links, no display hacks.
- Keep `BOARD_CDN` in foot in sync with the board file's cdn id (past split-brain). Board writer path must respect the honesty gate — never mint `sample:false` rows on proposals.
- Leave clear version stamps (`__dgFootVer`) and update them on real changes.

---

## 8. TESTING (mandatory before ship)

Prove correctness; do not rely on grep gates alone.

- **Boot-smoke:** vm-shim parse/execute of `demigod-foot-core.js` — must pass.
- **verify:source / verify:all:** run and read output; ensure gates aren't stale (check the source JSON mtime vs foot-core mtime — a stale `DEMIGOD-VERIFY-SOURCE.json` reports false PASS/FAIL).
- **Board honesty gate:** seeds ≤3, realRoles=0 (until real), sample labeled, no banned slaDue mint. Re-run after any board touch.
- **WIZ playtest:** `demigod-wiz-cdp-playtest.mjs --local` both paths; fix harness false-negatives, confirm real submit reachability.
- **Copy scan:** grep all pages + custom code for `48h`, SLA words, and any name tokens — must be zero.
- **Live-vs-disk:** if preparing to ship, confirm the live artifact hash vs disk after CDN upload; beware truth.mjs regex matching the wrong page script (naive first-match) — verify the correct artifact.
- **Visual:** CDP screenshots desktop + mobile of home, WIZ (both paths, open + review + submit), board, pricing.

Report a test matrix: check, command, PASS/FAIL, evidence (hash/screenshot/output). No green claim without evidence.

---

## 9. SHIP (prepare only; respect freeze + human gate)

- If a freeze is active or the user has not authorized publish: STOP after producing a verified, screenshot-backed, diff-documented handoff. Do not publish.
- If authorized and unfrozen: prepare CDN upload of foot (and head if changed), paste custom code via clean CDP (single tab, no keyboard.type-into-CodeMirror mangling — use a paste that survives CodeMirror), stage the Publish, then AFTER the human publishes, poll live for the new hash and re-verify (curl live, confirm version stamp, WIZ live smoke, visual).
- Never claim "shipped/live" without a live-confirmed fetch showing the new version.

---

## 10. OUTPUT / HANDOFF FORMAT

At the end, produce:
1. **BASELINE** — what you found (version, drift, freeze, top defects).
2. **CHANGES** — every edit, file, anchor, before/after md5 or version, and why.
3. **TEST MATRIX** — checks, commands, PASS/FAIL, evidence.
4. **HONESTY LEDGER** — confirmation that banned copy = 0, board honest, services pending.
5. **SHIP STATE** — prepared / blocked-by-freeze / awaiting-human-publish, with exact next steps.
6. **REMAINING P0/P1/P2** — anything deferred, ranked.

Work autonomously through the plan, but STOP and surface immediately if: a freeze blocks ship, the foot file mutates under you (concurrent writer), a build fails to parse, or an honesty gate fails. Prefer honest "blocked/pending" over any fabricated success. Verify everything. Ship nothing unproven.

_(Note: `/tmp/dg-swarm/improve/claude-prompt.md` could not be written — both the Write tool and `mkdir` under `/tmp` were blocked by sandbox permissions, which only allow `/home/potter`. Full prompt printed above per the stdout fallback.)_
# MASTER WEBSITE IMPROVEMENT PROMPT

You are the principal product engineer and design director implementing a disciplined, conversion-focused improvement pass for Demigod, a pre-services SF startup talent-matching company. Work in `/home/potter`. The public site is `https://www.trydemigod.com`; the Webflow project is `talentlink-sf`. Begin every internal planning/review prompt with: **“Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty.”**

Your job is to make the site feel as deliberate, polished, fast, and trustworthy as Linear, Mercury, or Stripe—without copying those products, inventing proof, bloating the product surface, or obscuring that Demigod is still pre-services. This is a FIX-and-refine project, not a framework rewrite. Demand and the first real pilot remain more important than decorative website work. Ship only changes that improve comprehension, trust, conversion, usability, accessibility, or reliability.

## Read first and preserve the architecture

Before editing, read `AGENTS.md`, `DEMIGOD-COMPRESSED-STATE.md`, `DEMIGOD-AGENTS.md`, `DEMIGOD-WORKFLOW.md`, and the current source files below. Do not trust old version tables over current disk truth: `demigod-foot-core.js` is currently v198 (`/*dg-foot-v198-core*/` and `window.dgFootVersion='v198'`). Inspect git status and preserve unrelated user changes.

Canonical website sources:

- `demigod-foot-core.js`: the one and only canonical custom behavior file. It owns WIZ, runtime copy, modal behavior, product routing, injected trust/FAQ/navigation blocks, board rendering, analytics hooks, and progressive enhancements.
- `demigod-head-styles.css`: canonical design system and responsive styling.
- `demigod-head-minimal.html`: canonical Webflow HEAD paste, critical paint safeguards, SEO defaults, preconnects, CSS loader.
- `demigod-footer-lite.html`: tiny route/foot loader only; it must not become a second application.
- `demigod-pages/*`: static product-page sources, including `_shell.css`, `how.html`, `hire.html`, `talent.html`, `pricing.html`, `compare.html`, `proof.html`, `network.html`, `faq.html`, and any current pilot/events artifacts.

Supporting pipeline files may be changed only where required by this brief: `demigod-agent-smoke.mjs`, `demigod-foot-smoke.mjs`, `demigod-product-publish.mjs` or the current product publisher/manifest, `demigod-foot-cdn-publish.mjs`, `demigod-cm6-paste-publish.mjs`, `demigod-publish-freeze.mjs`, `demigod-ship-checklist.mjs`, verification scripts, and `package.json` scripts. Do not fork website logic into new foot files.

Never touch, inspect, verify, serve, or discuss the archived Eat the Sounds game. In particular do not edit `ninjawhee-eat-the-sounds.html`, `overworld.js`, `vinyl-*.js`, `game-progress.js`, `pause-journal.js`, `pixel-gfx.js`, or anything under the game mirror. Do not run `npm run verify`, `npm run verify:all`, or start port 8765. The correct gates are Demigod-specific.

## Non-negotiable truth and copy contract

The product truth is: Demigod helps SF startups and startup candidates create outcome-led briefs/profiles; a human reviews them; a match is proposed only when fit is strong; both sides must say yes before an introduction; candidate profiles are private rather than blasted; candidates join free; the startup fee is 10% of first-year cash salary only on hire; no upfront charge is collected from intake.

The business is pre-services. Make that legible and calm, not apologetic. Use exact, plain pending language where relevant: “Payments and SMS are pending. Email from hello@trydemigod.com is the active contact path.” Stripe checkout, automated invoicing, Twilio, and automatic SMS must never appear live. Do not imply a card will be charged or a text will arrive. A future replacement guarantee must be explicitly conditional on payments being live and a real hire being placed, or omitted.

Hard banned live claims, including HTML, JS-injected copy, metadata, placeholders, form values, schema, alt text, and success states:

- No “48h,” “48 hours,” “within two hours,” response clocks, turnaround promises, “in days,” or any SLA/guaranteed timing.
- No founder or operator names, including John or John Potter. Do not add founder-story/personality marketing.
- No fake client logos, testimonials, placement counts, candidate counts, receipts, case studies, employers, inventory, reviews, metrics, or implied customers.
- No “100% vetted,” “perfect match,” “guaranteed hire,” “instant,” “AI recruiter,” or claims that automation is doing human judgment.
- Never call sample roles real, open, active, available, placed, or currently hiring.

Board honesty is a release gate. Permit at most two or three seed/example roles, each visibly and semantically labeled **Sample** at the card/row level—not merely in a distant disclaimer. Real roles and real receipts remain zero unless an independently verifiable, permissioned artifact already exists. Do not create proof to make the page look fuller.

## Product and information architecture

Create a coherent navigation and page system with one clearly dominant decision at each stage. The home page should orient visitors, establish the distinct model, and route them into one of two mutually exclusive paths. Preserve the correct dual-path CTA language:

- Company path: **I’m hiring** → `?wiz=startup`
- Candidate path: **Find a job** or **Join the network** → `?wiz=engineer`

Never pair “Hire talent” with “Find talent”; those both read as company-side actions. Do not create three equal hero buttons. Partner/referral is a tertiary navigation/footer path, not a hero peer. Audit nav, hero, mobile sticky bar, section CTAs, product pages, modal links, and footer so labels remain consistent and every CTA reaches the intended WIZ or page. Avoid CTA overload and repeated pill bars that compete with the hero.

The desired public architecture is:

- `/` Home: concise value proposition, dual-path routing, how-it-works preview, honest differentiation, pricing signal, sample/proof state, FAQ preview, final dual CTA.
- `/how`: one shared process shown from startup and candidate viewpoints; brief/profile → human review → specific fit → mutual yes → warm intro → fee only on hire.
- `/hire`: founder/startup landing page focused on the 90-day outcome, high-signal small slates, privacy/consent, clear 10% model, and startup WIZ CTA.
- `/talent`: candidate landing page focused on privacy, relevance, candidate-free economics, consent, and engineer WIZ CTA.
- `/pricing`: exact fee basis and trigger, candidates-free statement, no-subscription/no-upfront clarification, pending payment mechanics, concise comparison.
- `/compare`: honest decision guide comparing Demigod with job boards, contingency agencies, internal sourcing, and automated outreach. Do not make unverifiable competitor claims. Include “not for you if you need guaranteed response times or large instant inventory.”
- `/proof`: radical honesty page distinguishing what is live, what is sample, what is pending, and what will become proof after permissioned real outcomes. Empty state must build trust rather than imitate traction.
- `/network`: private talent-network promise, consent mechanics, candidate FAQ, and engineer CTA.
- `/faq`: complete, deduplicated answers for both audiences, fees, privacy, mutual yes, geography, candidate cost, human review, pending SMS/payment status, timing-without-SLA, referrals, and contact.

If the current static sources already provide these pages, improve and normalize them rather than inventing parallel pages. Ensure every page has a stable product route served with `text/html`, canonical URL, unique title/description, OG/Twitter metadata, one H1, logical headings, working nav, footer, and appropriate CTA. Use a common shell/design token source rather than eight drifting inline copies when this can be done safely within the current static publish system. Keep `/pilot` non-indexed or clearly pre-services if it remains operational rather than public marketing.

## Visual direction: premium dark gold, restrained and original

Build a dark, editorial, high-trust visual system—not a cyberpunk recruiter theme. Aim for the craft level of Linear’s restraint, Mercury’s composure, and Stripe’s hierarchy, while keeping Demigod distinct.

Use near-black warm backgrounds, subtly differentiated surfaces, quiet borders, high-contrast warm white text, muted stone secondary text, and gold as a scarce action/signal color. Gold should feel metallic through restrained tonal variation, not yellow neon. Define tokens in `demigod-head-styles.css` and reuse them in `_shell.css`: background tiers, text tiers, gold/hover gold, border, focus, danger/success, radii, shadows, spacing, container widths, and type scale. Prefer CSS gradients/noise made with lightweight CSS; avoid heavy texture images and gratuitous glows.

Design requirements:

- Strong but compact typography with fluid `clamp()` sizing, readable line lengths, balanced headlines, and normal sentence case for body/UI. Avoid excessive all-caps and faux-terminal styling.
- A calm header with crisp active states, reliable mobile navigation, and one dominant company CTA. Candidate path remains discoverable.
- Hero with an immediately intelligible headline, short subhead, two clearly differentiated path actions, and a compact trust line. It must fit without awkward clipping at 320px and without excessive empty space on desktop.
- Cards and process steps should have purposeful hierarchy, subtle depth, and consistent padding—not a dashboard grid for its own sake.
- Microinteraction only where it communicates state: hover/focus, modal entry, WIZ progress, accordion disclosure. Respect `prefers-reduced-motion`; no scroll-jacking or continuous decorative animation.
- Replace fragile raster backgrounds where feasible with CSS or properly optimized assets. Preserve intrinsic dimensions and avoid layout shift.
- All loading/failure states must remain visually coherent even when Catbox CSS/JS fails.

## Home-page copy and UX

Rewrite every visible string as a system, not isolated clever lines. The home hero must say who it is for, what happens, and why it differs in under ten seconds. Favor concrete phrases such as “Human-reviewed matches for SF startup teams” and “Start with the outcome this hire must own,” while preserving the approved truths. Do not overuse “curated,” “elite,” “divine,” “signal,” or “noise.” Brand voice: direct, intelligent, selective, humane, operationally credible.

Audit and rewrite: eyebrow, headline, subhead, badges, trust lines, nav labels, buttons, section headers, process steps, comparison copy, sample ledger labels and empty states, pricing notes, privacy copy, partner/referral copy, footer, FAQ, modal introductions, validation errors, upload hints, placeholders, review screens, submission progress, failure messages, and success screens. No placeholder should contain a real person or fake company. Use illustrative neutral examples only where helpful, labeled as examples.

The home page should not pretend the sample ledger is proof. Prefer a transparent “Examples of the briefs we are designed to handle” section with local Sample badges. If a dynamic board has no honest entries, render a deliberate empty state, not a blank region and not fabricated fallback candidates. Any pipeline note must count sample versus real correctly.

## WIZ: startup, engineer, and partner

Treat the WIZ as the core product. Preserve Webflow native forms and field names unless a verified migration is necessary. Each flow must work by mouse, keyboard, touch, deep link, reopen, resize, orientation change, browser back/forward where supported, and submission success/failure.

Shared behavior:

- One question at a time means exactly one active field wrapper plus WIZ chrome. Do not globally force every label/input/wrapper visible.
- Replace the broad `forceMobileDesktopWIZ()` approach with a narrow, deterministic layout update. The current implementation repeatedly forces inputs, labels, wrappers, ancestors, and chrome on resize/orientation and risks breaking one-question ownership. One state machine (`wizBuild`/`showStep`) must own visibility. Responsive behavior belongs primarily in CSS; JS may update only state that cannot be expressed in CSS.
- Preserve v194+ reopen idempotence: reopening must not duplicate chrome or rebuild the form. `dgWizBuilt` and `form.__dgWizShow` behavior must remain reliable.
- Progress must use the actual required/optional step model, announce changes accessibly, and never count welcome/thanks incorrectly.
- “Next” stays disabled only when required data is invalid; optional steps can be skipped. Enter advances where safe; Shift+Enter/newlines work in textareas; Escape closes only with an unsaved-data confirmation when appropriate.
- Add a concise review step with Edit links before submit. Preserve values after navigating backward and after recoverable errors.
- Inline validation must identify the exact field, explain correction in plain language, set `aria-invalid`, connect errors with `aria-describedby`, and focus the first invalid input.
- Submitting must prevent double submission, show a non-jittering busy state, and recover on network/Webflow failure. Never force `.w-form-done`; success only follows a real confirmed form result.
- Modal focus trap, initial focus, focus return, accessible name/description, close button, background inertness/scroll lock, and screen-reader announcements are required.
- Inputs need useful `autocomplete`, `inputmode`, type, minimum constraints, and file acceptance. Touch targets are at least 44px.

Startup WIZ: keep the 90-day outcome as the anchor. Improve sequence to minimize abandonment: work email, company, stage, role, outcome, essential skills, compensation, timing/team context, optional JD, review. Explain why sensitive details help. Do not promise “3–5” unless the operating model truly guarantees it; safer copy is “a small set” or “only strong fits.” Success: brief received, human review, mutual yes, email active, payments/SMS pending; no timing.

Engineer WIZ: name, email, LinkedIn, core skills, shipped outcomes, SF/Bay Area preference, availability, compensation preference, optional portfolio/GitHub/resume/phone, review. Explicitly explain privacy and consent before submission. Do not say “Find a job” if the success state implies immediate inventory; say the profile is received and contact occurs only when a specific fit exists. SMS language must say pending, not “we can text.”

Partner WIZ: clarify who qualifies, what can be referred, consent requirements, attribution, and that 20% is a share of an actually collected placement fee only if that commercial policy is approved in current source truth. If not independently approved, remove the percentage and use “referral terms are confirmed by email.” Never imply automatic tracking or payout infrastructure. Partner remains tertiary. Success must say application/referral received and email follow-up, with no response clock.

## Concrete defects to resolve

Do not merely paper over these with more `!important` rules. Add regression coverage for each:

1. **`forceMobileDesktopWIZ` visibility conflict.** It applies broad inline visibility/display forces on fields, labels, wrappers, and ancestors during resize/orientation. This can reveal multiple questions, fight `showStep`, distort desktop layout, and make the modal impossible to reason about. Consolidate visibility ownership, reduce inline writes, and prove active-wrapper count equals one at all breakpoints and after reopen/rotation.
2. **Agent-smoke foot loading.** The smoke path can report body/H1 success while the canonical foot is absent, stale, or its CDN request has failed. Make foot presence, exact `window.dgFootVersion`, source/CDN/live hash alignment, successful JS response/content type, WIZ constructor presence, and console/page errors explicit blocking assertions. Do not accept runtime soft-patch/version masquerading as source equality.
3. **Webflow redirect/status 412.** Product or route fetches have encountered Webflow 412/redirect behavior. Do not treat every non-200 as content or fall back silently to the home/startup WIZ. Use deterministic same-origin routes, follow/validate redirects intentionally, check final URL/status/content type/body marker, present a useful page failure state, and make 412 a failing publish test with diagnostic URL/status chain.
4. **Catbox HTML MIME.** Raw Catbox `.html` is served as `text/plain` and is not a valid navigable product page. Never link or `location.replace` public users directly to raw Catbox HTML. Publish/serve product pages through proper Webflow/same-origin HTML routes or another endpoint that returns `text/html`; JS product loading must validate MIME and body markers before rendering. Keep the source comment’s invariant and extend tests.
5. **FOUC/blank/freeze risk.** The head currently depends on Catbox CSS and Webflow IX unhide workarounds. Previous print-media swap left pages unstyled; prior MutationObserver style writes caused an infinite freeze; doubled head pastes and broad unhide rules exposed modal internals. Keep HEAD JS-free, never add an attribute MutationObserver in HEAD, provide minimal critical tokens/layout inline, use finite/idempotent unhide behavior, and prove first paint never shows hidden modal fields or remains blank if CSS/JS fails.
6. **Sample badges and board semantics.** Sample status must live on every sample role/candidate, survive dynamic board replacement, be machine/readable enough for tests, and never be combined into ambiguous stage/status text. Counts and headings must not suggest real inventory. Real=0 must render honestly.
7. **Dual-path CTA drift.** Normalize all home/nav/mobile/product/footer CTAs to company versus candidate intent. Prevent “Hire talent / Find talent,” hash-only anchors, wrong-modal opens, `/how` links that unexpectedly open startup WIZ, and fallback routing that defaults unknown product paths to hiring.

Also audit for: duplicate nav/footer/trust injection after repeated `run()`, click-capture handlers that hijack ordinary links, bare `href="#"`, modal bar showing behind WIZ, stale text in Webflow canvas that flashes before runtime replacement, product loader `document.write`/race behavior, overly broad blank-body guards, missing product-page fallbacks, submission wrapper/status-root errors, required-checkbox validation using value instead of `.checked`, repeated resize listeners, and memory/performance leaks from observers.

## Performance and resilience

Set measurable budgets and verify them on throttled mobile, without sacrificing correctness:

- No render-blocking custom JS in HEAD. Canonical foot loads once, with clear failure handling.
- Keep total custom CSS/JS lean; remove duplicate selectors, repeated injected markup, and obsolete runtime scrub work once canonical copy is clean, but retain a small banned-copy safety net if useful.
- LCP image is correctly prioritized only when it is actually the LCP; below-fold images are lazy, decoded async, dimensioned, and compressed. Do not assign verbose marketing alt text to decorative images.
- Minimize layout shift from fonts, badges, WIZ chrome, images, and dynamic board content. Use stable min-heights sparingly.
- Avoid full-document or attribute MutationObservers that write to the attributes they observe. Disconnect observers and listeners when no longer needed.
- Preconnect only to origins actually used. Audit Catbox as a single point of failure and ensure core copy/navigation/form access degrades safely when it is unavailable.
- Target Lighthouse/mobile or equivalent: Performance ≥90, Accessibility ≥95, Best Practices ≥95, SEO ≥95, while treating real interaction tests as more important than the score.

## Accessibility and mobile acceptance

Meet WCAG 2.2 AA for core paths. Verify semantic landmarks, skip link target, heading order, link/button semantics, form labels, accessible descriptions, error announcements, focus visibility, 4.5:1 body contrast, 3:1 large/UI contrast, zoom to 200%, text spacing, reduced motion, no keyboard trap, and logical tab order. Do not hide focused content. Decorative graphics use empty alt/aria-hidden; meaningful images get concise contextual alt.

Test widths 320, 360, 390, 768, 1024, and 1440; portrait and landscape; iOS-style safe-area padding; software keyboard opening; long email/URL strings; browser zoom; touch scroll inside modal; and sticky CTA/footer overlap. No horizontal scroll, clipped close button, offscreen validation, tiny hit targets, or double scroll containers.

## Analytics hooks and privacy

Add a vendor-neutral, low-coupling event layer; do not install a tracker without authorization. Emit `CustomEvent('demigod:analytics', {detail:{...}})` and optionally push to `window.dataLayer` only if it exists. Use stable names and no PII:

- `path_cta_view`, `path_cta_click` with `audience=startup|engineer|partner`, placement, page.
- `wiz_open`, `wiz_start`, `wiz_step_view`, `wiz_validation_error`, `wiz_review`, `wiz_submit_start`, `wiz_submit_success`, `wiz_submit_error`, `wiz_close` with flow, step key/index, source; never include answer values, name, email, phone, resume URL, LinkedIn, or free text.
- `faq_open`, `product_nav`, `mailto_click`, `sample_ledger_view`.

Events must fire once per actual action, not once per rerender/reopen listener duplication. Document the schema in code comments or a small Demigod-specific doc. Analytics failure must never block UX.

## SEO and metadata

Give each public page a unique, honest title (roughly 50–60 characters where natural), description (roughly 140–160), canonical URL, Open Graph/Twitter title/description/image, robots policy, and one H1. Normalize trailing-slash/query canonical behavior. Deep-linked WIZ parameters must canonicalize to the underlying page, not create duplicate indexed pages. Add only truthful structured data: `Organization` without founder/person claims, `WebSite`, and `FAQPage` only when the same FAQ is visibly present. Do not use `JobPosting` for sample roles. Generate/update sitemap/route manifest if the current pipeline owns one. Verify no raw Catbox page is canonical or indexable.

## Implementation discipline and exact phased roadmap

Before changing code, produce a short internal inventory of current route behavior, selectors, WIZ state transitions, page publish mapping, version/hash state, freeze status, and baseline screenshots. Then implement in small reversible slices. Do not publish while the publish freeze is on. Do not claim live equals disk without byte/hash proof.

### P0 — correctness, honesty, core conversion, ship safety

Primary files: `demigod-foot-core.js`, `demigod-head-styles.css`, `demigod-head-minimal.html`, `demigod-footer-lite.html`, `demigod-agent-smoke.mjs`, `demigod-foot-smoke.mjs`, current product route/publish script, `demigod-ship-checklist.mjs`, verification scripts, `package.json`.

1. Baseline and lock the canonical foot; confirm v198 disk truth, current CDN URL, live version, hash state, and freeze state.
2. Fix WIZ visibility ownership and `forceMobileDesktopWIZ`; preserve one-question, reopen, validation, review, real success/failure, and all three flows.
3. Fix dual-path routing and dead/hijacked links.
4. Fix product HTML routing/MIME and explicit 412/redirect handling.
5. Harden FOUC/failure behavior without a head observer or duplicate paste.
6. Enforce sample badges and board honesty.
7. Strengthen smoke/ship gates so missing/stale foot, MIME, 412, console errors, multiple visible WIZ wrappers, and banned copy block release.
8. Rewrite highest-impact home and WIZ copy, including every state and error.

P0 exit: startup/engineer/partner WIZ pass end to end on desktop/mobile/keyboard; every route returns useful HTML; no raw Catbox navigation; no blank/unstyled/modal flash; sample truth is unambiguous; banned-copy scan clean; disk/CDN/live state explicitly reported; all Demigod gates pass.

### P1 — coherent premium design and complete product pages

Primary files: `demigod-head-styles.css`, `demigod-head-minimal.html`, `demigod-foot-core.js`, `demigod-pages/_shell.css`, `demigod-pages/how.html`, `hire.html`, `talent.html`, `pricing.html`, `compare.html`, `proof.html`, `network.html`, `faq.html`, product manifest/publisher, SEO verification.

1. Establish and apply the premium dark-gold token system and responsive typography/layout.
2. Refine home hierarchy and sections; remove redundant cards/CTAs/runtime patches.
3. Normalize the eight public product pages to the shared shell, copy contract, nav/footer, metadata, and correct audience CTA.
4. Add graceful empty/proof states rather than synthetic traction.
5. Add vendor-neutral analytics hooks and event-dedup tests.
6. Complete accessibility and responsive polish, reduced-motion states, and asset optimization.

P1 exit: the site feels like one product at every route and breakpoint; copy is complete; page metadata is unique; AA checks and mobile screenshots pass; no visual drift between static page shell and Webflow home.

### P2 — measured refinement after real usage

Primary files: the same canonical sources plus visual regression/analytics documentation and narrowly relevant test scripts. Do not start P2 merely because it is listed.

1. Review real, privacy-safe funnel events and user-test observations; change only evidenced friction.
2. Add permissioned proof/case-study modules only after real receipts exist; never prebuild them with fake content.
3. Evaluate self-hosted/versioned CDN assets, SRI/CSP compatibility, and fewer Catbox dependencies.
4. Improve visual regression baselines, Web Vitals monitoring hooks, and route/schema automation.
5. Consider componentizing repeated page shell output only if it reduces drift without changing the Webflow delivery model.

P2 exit: improvements are supported by observed behavior or real proof, performance budgets remain green, and operational complexity does not exceed the value delivered.

## Verification, screenshots, and acceptance evidence

After every meaningful change run the narrowest relevant gate; before any ship run the full Demigod source/all gate specified by current package scripts. At minimum run syntax checks, `npm run demigod:verify:source`, board-honesty, loop-state/source-truth, WIZ/foot smoke, product-route checks, banned-copy scan, and `npm run demigod:verify:all` if that command is Demigod-scoped in the current package. Never run the archived game gates.

Create/extend deterministic tests for:

- Home paints meaningful H1/body before/without external custom CSS and never shows modal contents during first paint.
- Exactly one canonical foot request and exact v198-or-new version; JS content type/body marker/hash; zero uncaught page errors.
- Every public route’s initial and final URL, status chain, MIME, body marker, H1, canonical, unique metadata, navigation, and CTA target; explicitly fail 412 and raw text/plain HTML.
- Each WIZ deep link, open/close/reopen twice, active-wrapper count=1, forward/back value retention, optional skip, required errors, checkbox checked semantics, review edits, double-submit prevention, confirmed success fixture, failure fixture/retry, resize and orientation.
- Keyboard-only and reduced-motion passes; modal focus containment/return; screen-reader labels/errors.
- Sample badge on every sample and zero false real counts.
- Analytics count and payload allowlist with no PII.
- Banned phrases/names across canonical sources, generated pages, runtime DOM, metadata, placeholders, and success content.

Capture screenshots only after fonts/assets settle, at 1440×900, 1024×768, 768×1024, 390×844, and 320×568 for: home top, home mid/process/proof, home footer, every product page top plus one full-page capture, all three WIZ welcome/representative field/review/success/error states, open mobile menu, CSS CDN failure, JS CDN failure, and reduced-motion mode. Compare against baseline for clipping, FOUC, unintended visibility, typography drift, contrast, redundant CTAs, empty regions, sample labeling, and sticky overlap. Inspect the images visually; a JSON pass is insufficient.

Acceptance is not “looks better.” Acceptance requires:

- A first-time startup founder and candidate can identify their path and understand the model in ten seconds.
- All three forms are complete, calm, accessible, recoverable, and honest.
- No banned promise, person name, fabricated proof, or ambiguous sample exists anywhere live.
- All public pages have correct HTML delivery and metadata; no Catbox text/plain navigation and no swallowed 412.
- First paint is useful under dependency failure; no freeze, blank page, modal flash, or multi-question WIZ.
- Mobile and keyboard flows pass; analytics are PII-free; performance budgets are met or any exception is documented with evidence.
- Source, CDN, Webflow custom-code paste, and production are verifiably aligned by version and hash.

## Ship pipeline: CDN → CM6 paste → freeze-aware publish

Treat publishing as a state machine, not a hopeful click sequence.

1. Acquire/check the existing foot writer lock and record pre-change hashes. Do not allow concurrent foot writers.
2. Run source syntax, static, WIZ, board-honesty, copy, product-route, accessibility, and screenshot gates.
3. Inspect `demigod-publish-freeze.mjs status`. If freeze is ON, stop at a ready-to-ship artifact and report the block. Never bypass or silently disable it.
4. If foot changed, bump the version above v198 consistently, publish the exact canonical bytes through the existing CDN publisher, retrieve them, verify byte/hash equality, JavaScript MIME/body marker, and update only the single CDN URL in `demigod-footer-lite.html`.
5. If CSS changed, publish/version it, fetch and hash-check it, then update the one stylesheet URL in `demigod-head-minimal.html`. Ensure critical fallback still works.
6. If product pages changed, publish them through the proper HTML-serving route/manifest. Validate `text/html`; never substitute raw Catbox `.html` redirects.
7. Use `demigod-cm6-paste-publish.mjs` for full-replacement CM6 paste: HEAD exactly once from `demigod-head-minimal.html`; FOOTER exactly once from `demigod-footer-lite.html`. Detect the correct editors; verify post-paste contents and lengths. Do not append or duplicate head code.
8. Publish both staging and `www.trydemigod.com` only when authorized by current workspace rules and freeze is OFF. A successful click is not proof.
9. Poll production cache-busted URLs. Confirm final route/status, Last Published where available, one head marker, one footer loader, exact foot version/hash/CDN URL, CSS URL, product page MIME, and both domains.
10. Run live smoke, WIZ probes, console/network audit, screenshots, and the freeze-aware ship checklist. Save a truthful receipt. If any check fails, do not certify or patch live invisibly; fix canonical source and repeat.

Do not modify the live site before the complete P0 slice is locally verified. Do not automatically broaden into outreach, payments, SMS, backend services, a React rewrite, or a new hosting stack. Keep implementation changes reviewable, preserve the Webflow/native-form delivery model, and finish with a concise change inventory, exact files changed, verification results, screenshot paths, disk/CDN/live versions and hashes, known residual risks, and the next smallest justified action.
# DEMIGOD.COM — MASTER IMPLEMENTATION PROMPT (v198 → v210)

**Role for the executor:** You are the implementing engineer (Grok/Cursor/Composer). Fable (design/product lead) authored this spec. Demigod is a Webflow-hosted talent-matching marketplace connecting SF/remote startups with vetted engineers. Current phase: **GTM + pre-services honesty**. Site is "mostly done" per Heavy authority — this is a *refinement and hardening* pass, not a redesign. Minimal-surface, high-craft changes only.

**Prime directive:** Do not ship anything that is not (a) verified green by all gates, (b) honest per the rules below, and (c) parse-safe via boot-smoke. Human clicks Publish in Webflow; you prepare CDN + custom-code pastes + diffs. Never claim "live" without a real fetch confirming the hash.

---

## 0. GROUND RULES (READ FIRST — NON-NEGOTIABLE)

### 0.1 Canonical files
- **Site JS:** edit **only** `demigod-foot-core.js` (the canonical foot custom-code, currently v198). Never edit the CDN-mirrored `.live-*.js` artifacts — those are outputs.
- **Head styles/scripts:** the head custom-code block (critical CSS + early unhide script + noscript). Keep the unhide script parse-safe (see history: a misplaced `}catch(e){}` once produced "Unexpected token catch" and blanked the site for days).
- **Pages/copy:** `demigod-pages` (page-level content), Designer static text for structural copy.
- **Board data:** `DEMIGOD-BOARD.json` (single source of truth — beware split-brain with a second board file; the tripwire must watch the same path the foot reads via `BOARD_CDN`).
- **Supporting orchestration:** `demigod-*.mjs` scripts only when NOT touching site JS.

### 0.2 Verify gate (run after EVERY edit, before ANY publish prep)
```
npm run demigod:verify:source        # source-anchor gates
npm run demigod:verify:all           # + smoke + honesty (preferred)
node <boot-smoke>                     # vm.Script parse + boot (ReferenceError catch)
npm run demigod:board-honesty        # board seed/receipt caps
node <loop-state check>              # loop-state sanity
```
A file that passes 49 grep gates but throws on boot is **broken** — grep gates historically missed dead `wizBuild`/`run`/`show` and JS syntax errors. **Always** `grep -n 'function wizBuild\|function run(\|function show('` and confirm each symbol referenced is defined, then run the vm boot-smoke, before trusting any build.

### 0.3 Honesty rules (live-copy law — enforce in code + runtime scrub)
- **No** "48h" / SLA / turnaround promises anywhere (static copy OR runtime). Runtime `scrubTimeClaims()` must catch any that slip into board JSON.
- **No** founder names on the live site. Use "hello@trydemigod.com will follow up".
- **Board:** ≤3 seed roles until real; `realRoles: 0`; receipts labeled `sample:true`; no fabricated testimonials/delivery counts. Honesty gate must FAIL the build if roles > 3 or any `sample:false` receipt exists without a real backing event.
- **Pre-services language:** Twilio/Stripe/SMS features use "pending" copy, never "live"/"instant".
- **proposeIntro / ingest must NOT mint** `sample:false` roles or receipts — any board write goes through the honesty gate, never a direct `saveBoard`/`appendPilot` bypass.
- **Game "Eat the Sounds" is archived** — do not touch unless the user literally says "reopen the game".

### 0.4 Publish protocol
1. Verify all gates green on disk.
2. `demigod:deploy:prep` → confirm CDN foot hash == disk `md5(demigod-foot-core.js)` (foot-cdn-publish first if catbox is stale/frozen).
3. Prepare head + foot paste blocks; stamp a `DG-PUB` marker + version.
4. Human pastes + Save + Publish in Webflow (staging → www).
5. **Poll live** (`curl`/WebFetch) until the new hash/`__dgFootVer` appears. Only then is it "live".
6. CDP screenshots: hero visibility, WIZ desktop + mobile, board render.
7. Re-run `verify:live`.

---

## 1. DESIGN SYSTEM (P1)

**Goal:** one coherent system, tokenized, light+dark safe, WCAG AA. Currently the "cooler UI system" (v197) — tighten it, don't reinvent.

### 1.1 Tokens (head critical CSS, `:root`)
Define/consolidate CSS custom properties — audit for one-off hex values scattered in foot/Designer and replace with tokens:
- **Color:** `--bg`, `--bg-elev`, `--surface`, `--border`, `--text`, `--text-muted`, `--accent` (single brand accent + `--accent-hover`, `--accent-contrast`), `--success`, `--warn`, `--danger`. Provide `@media (prefers-color-scheme: dark)` overrides. Every text/background pair must pass **4.5:1** (body) / **3:1** (large). Validate with a contrast check in `verify:live`.
- **Type scale:** `--fs-xs … --fs-3xl` on a 1.2–1.25 modular scale; `--lh-tight/-normal/-loose`; system + one display face max. No more than 2 font families.
- **Space scale:** `--sp-1 … --sp-12` (4px base). Replace ad-hoc margins.
- **Radius:** `--r-sm/-md/-lg/-full`. **Shadow:** `--shadow-1/-2/-3` (subtle, dark-mode-aware). **Motion:** `--ease`, `--dur-fast/-base/-slow`.

### 1.2 Motion & accessibility
- All animations wrapped in `@media (prefers-reduced-motion: no-preference)`. Reduced-motion users get instant states — no hero glow pulse, no scroll reveals. (History: unbounded animations caused FOUC/flash.)
- Focus-visible rings on every interactive element (`:focus-visible` outline using `--accent`, 2px, offset 2px). Never remove focus outlines without a replacement.
- Min tap target 44×44px on mobile.

### 1.3 Component primitives (foot-rendered + Designer)
Buttons (primary/secondary/ghost, loading + disabled states), inputs/selects/textarea (label + hint + error), badges/pills (role tags), cards (role card, testimonial card — testimonials hidden until real), nav, modal/dialog (WIZ container), toast/inline-alert. Each needs hover/active/focus/disabled/error visual states. **Acceptance:** no interactive element lacks a focus + hover + disabled style.

---

## 2. UI/UX (P1)

### 2.1 Hero
- Ensure `w-mod-ix3` / unhide gate reliably reveals hero (root cause of past blank-site was the unhide script never running). Keep `forceMainVisible()` in foot as a belt-and-suspenders fallback with a RAF + MutationObserver + short interval + noscript path.
- Single clear value prop headline (talent matching), one primary CTA ("Find talent" / startup path) and one secondary ("Get matched" / engineer path). **Remove duplicate CTAs** (history: dup "FIND TALENT" nav + dup CTAs). Grep for duplicate button labels and dedupe.
- Hero glow (v198) must respect reduced-motion and never cause layout shift (CLS ~0).

### 2.2 Navigation
- Single nav, no duplicate links, no dead OAuth buttons (a dead OAuth button lived at foot `:~889` + a Supabase UMD in head — **strip both** if still present). Mobile hamburger with proper `aria-expanded`, focus trap when open, ESC to close.
- Sticky header must not overlap focused inputs on mobile.

### 2.3 Board / proof section
- `renderBoard()` must have a valid anchor (history: `trust()` targeted a removed `/PRICING/` anchor → board never rendered → proof pipeline invisible). Confirm the anchor element exists in Designer markup; add a resilient selector + no-op-safe guard that logs (dev only) if the anchor is missing.
- Escape all board JSON before `innerHTML` (`esc()` helper) — board content is data, treat as untrusted (XSS hardening). No raw `innerHTML = boardJson`.
- Empty/loading/error states for the board fetch (skeleton, not spinner-forever). If board fetch fails, show seed roles, never a blank or infinite spinner.

### 2.4 Performance
- No render-blocking third-party CSS (history: a catbox `m2f8rp.css` render-blocked → spinner). Inline critical CSS in head; defer non-critical.
- Target: LCP < 2.5s, CLS < 0.1, no long tasks > 200ms on load. Preload the display font; `font-display: swap`.

---

## 3. FORMS / WIZ (P0 — highest product value)

**Current:** Typeform-style stepper, two flows (startup + engineer), with a required **90day-outcome** step (high-signal for matching) + explicit **review** step before submit. Test: `node demigod-wiz-cdp-playtest.mjs --local`.

### 3.1 Known failure modes to fix / guard (all historically real)
- **`wizBuild` must be defined and called.** Grep: `grep -n 'wizBuild' demigod-foot-core.js` — confirm one definition + the call site. A build where `wizBuild` is referenced but undefined = boot ReferenceError = all site JS dead. Add a source gate: every wiz function called is defined.
- **`__submit__` branch must be reachable** — the final review step's submit must actually POST/advance. History: unreachable submit branch = wizard never submits.
- **Selector safety:** attribute selectors with numeric-leading values must be quoted: `[name="90day-outcome"]` (unquoted `[name=90day-outcome]` throws and half-patches the startup form → all fields visible / stepper gone). Grep for unquoted numeric-leading attribute selectors.
- **enhanceWIZ must not hide the whole `<form>`** via a `parentElement` fallback (history: caused `vis=0` — entire form hidden). Scope hide/show to step containers only.
- **Stepper integrity:** exactly one step visible at a time; Next disabled until required fields valid; Back preserves entered data; progress indicator accurate. **Live smoke must assert only the current step's fields are visible** (history v197 break: all 7 fields visible, stepper gone).

### 3.2 UX requirements
- Inline validation on blur + on Next; clear error messages tied to inputs via `aria-describedby`.
- Required fields: startup (company, role, stack-needs, **90day-outcome**, email) / engineer (name, stack, resume, **90day-outcome**, email). Resume field must be **visible** and its required-ness must not make the form unsubmittable (history: invisible required resume input).
- Review step: read-only summary of all answers + Edit links back to each step, then Submit.
- Submit states: loading spinner on button, success confirmation ("hello@trydemigod.com will follow up" — **no** 48h), error with retry. On success, ingest goes through the honesty-gated path (no direct board mint).
- Keyboard: Enter advances (except in textarea), ESC does not lose data, focus moves to first field / first error of each step.
- Mobile: full-width fields, no zoom-on-focus (`font-size ≥ 16px` on inputs), sticky Next button above keyboard.

### 3.3 WIZ acceptance criteria
- `node demigod-wiz-cdp-playtest.mjs --local` → **pass:true** on both flows, desktop + mobile.
- Playtest harness itself must use current selectors — scope to `.dg-wiz` container (not doc-wide `h3`), count visibility within the modal only (history: harness false-negatives from doc-order `.dg-wiz-q, h3` shadowed by page `h3` + doc-wide vis count).
- One and only one step visible; submit reaches confirmation; no console errors; no `ReferenceError`.

---

## 4. COPY (ALL SURFACES) (P1)

**Voice:** direct, credible, founder-to-founder. No hype, no fake urgency, no unverifiable claims.

### 4.1 Global scrubs (must be zero on live)
- Remove every "48h", "24h", SLA, "instant", "guaranteed", turnaround-time promise. Runtime `scrubTimeClaims()` as backstop for board JSON.
- Remove founder names → "hello@trydemigod.com will follow up".
- Remove "LIVE ROLES HIRING NOW" / any overclaim of live activity while `realRoles:0`. Use honest framing: "Early roles" / "Seed roles" clearly labeled sample where applicable.
- Kill all lorem ipsum (history: lorem "Insights" section shipped live; lorem scrub once blanked a page — scrub must replace, not empty).
- Dedupe: copyright line, tagline, email, nav labels (history: dup copyright/tag/email).

### 4.2 Page-by-page copy pass (in `demigod-pages` / Designer)
- **Home/hero:** value prop, how-it-works (3 steps), for-startups + for-engineers split, honest proof/board, CTA.
- **How it works:** matching process, vetting, what "pending services" means honestly.
- **Pricing:** honest fee framing (10–25% range per Heavy research) with pre-services "pending" caveat; dedupe pricing lines (history: dup pricing lines).
- **For engineers:** what to expect, resume/stack, privacy bullets on WIZ welcome.
- **Legal:** privacy + terms (see legal pages below).
- **Contact/footer:** hello@trydemigod.com only.

### 4.3 Microcopy
Button labels, form hints, error messages, empty states, success confirmations — all consistent, all honest. Acceptance: `verify:live` copy check finds zero banned phrases.

---

## 5. NEW PAGES / FEATURES (P2 — only after P0/P1 green)

- **Legal pages** (privacy policy, terms) — honest, pre-services caveats, no founder names. Files under `demigod-pages` / Designer routes. (Multiple `demigod-legal-*.mjs` passes exist — consolidate, don't multiply.)
- **Partnerships page** — honest, "pending" where services aren't live (several `demigod-partnerships-*.mjs` scripts exist; reconcile to one page pass).
- **Engineer prefill via OAuth** — **deferred** until trigger met (≥10 real WIZ submissions/week). If built: minimal client-side (Clerk/Supabase script-tag, no server), LinkedIn (engineer prefill) + Google, "pending" copy, added to canonical head/foot. Do **not** ship a dead OAuth button before the flow works.
- **Outreach/proof assets** — honest proof pack only from real receipts; no fabricated delivery counts.

Do not add features that create honesty liabilities (fake testimonials, live-service claims, delivery counters) while `realRoles:0`.

---

## 6. BUGFIXES (prioritized)

### P0 (block ship)
1. **WIZ stepper live integrity** — verify not-frozen, stepper renders, one step visible, submit reaches confirmation (guard against v197-class regression).
2. **wizBuild / run / show defined + called** — no boot ReferenceError; boot-smoke pass.
3. **Head unhide parse-safe** — vm.Script parse gate; hero reveals; `forceMainVisible` fallback intact.
4. **Board honesty** — ≤3 roles, realRoles:0, no `sample:false` mint via proposeIntro/ingest; honesty gate wired into `verify:all`.
5. **Numeric-attribute selectors quoted** — `[name="90day-outcome"]` etc.

### P1
6. Board render anchor exists + `esc()` XSS escaping.
7. Dedupe nav/CTA/copyright/email/pricing.
8. Strip dead OAuth button + orphan Supabase UMD (if present).
9. Runtime `scrubTimeClaims` catches 48h/SLA in board JSON.
10. Split-brain board: single `DEMIGOD-BOARD.json`; tripwire + `BOARD_CDN` point to same file.
11. Reduced-motion + focus-visible everywhere; contrast AA.

### P2
12. pilot-tracker minting `slaDue` on every log (bypasses honesty) — gate or remove; honor `--dry-run` properly.
13. verify gates hardening: no tautological/hardcoded-true checks; grep gates supplemented by smoke; no stale-JSON reads (check mtime vs foot-core before treating a gate/brief P0 as real).
14. truth.mjs cdnId regex false-drift (naive regex matches /hire page script first) — precise selector + manifest sha256 fix.

---

## 7. CODE ARCHITECTURE (`demigod-foot-core.js`)

- **Single IIFE**, no leaked globals except `window.__dgFootVer` (bump to match version). Balanced braces — the IIFE must close correctly at EOF (history: extra `}` closed IIFE early → parse break; and missing `})();` at EOF).
- **Module sections, commented:** tokens/util (`esc`, `qs`, `scrubTimeClaims`), unhide/`forceMainVisible`, nav, board fetch+render, WIZ (`wizVal`, `wizWrap`, `wizCss`, `wizBuild`, step engine, validation, submit→ingest), analytics stub. Each referenced symbol defined before use or hoisted function decl.
- **No dead code** — if `wizBuild`/`run`/`show` unused, either wire or remove; ~30% dead foot has happened.
- **Defensive fetch** — board/ingest wrapped in try/catch with graceful fallback to seeds; never throw uncaught on boot.
- **Version discipline:** bump `v198 → v199…` on every shipped change; stamp `DG-PUB` marker; keep `md5` reproducible for CDN==disk verification.
- Head: critical CSS first, then early unhide script (RAF + MO + interval + listeners + noscript), parse-verified, no third-party render-blocking CSS.

---

## 8. TESTING

1. **Boot-smoke** (vm.Script): parse + run foot in a jsdom/vm shim; assert no SyntaxError/ReferenceError; assert `wizBuild` defined; `__dgFootVer` correct. **Mandatory before every publish.**
2. **Source-anchor gates** (`verify:source`): assert key symbols/anchors present — but never rely on grep alone.
3. **Board honesty gate** (`verify:all`): roles ≤3, realRoles:0, no unbacked `sample:false`, no banned time-copy.
4. **WIZ CDP playtest** (`demigod-wiz-cdp-playtest.mjs --local`): both flows, desktop + mobile, one-step-visible, submit→confirm, zero console errors. Fix harness selectors to scope to `.dg-wiz`.
5. **verify:live** (post-publish, real fetch): hash == disk, banned-copy = 0, lorem = 0, contrast AA sample, WIZ present, hero visible.
6. **Mutation test** (regression trust): break `wizBuild`/`run`/version/90day on a copy → assert source+smoke gates FAIL → byte-identical restore. Proves gates aren't tautological.
7. **CDP screenshots**: hero, WIZ desktop, WIZ mobile, board render — visually confirm.

**Acceptance to ship:** 1–4 green on disk; 7 visually clean; then human publish; then 5 green on live.

---

## 9. SHIP CHECKLIST

- [ ] All edits in `demigod-foot-core.js` (site) only; version bumped; braces balanced.
- [ ] `verify:source` + `verify:all` + board-honesty + loop-state green.
- [ ] Boot-smoke pass (no Syntax/ReferenceError).
- [ ] WIZ playtest pass:true (both flows, mobile+desktop).
- [ ] Grep: no unquoted numeric attr selectors, no dup CTA/nav/copyright, no 48h/SLA/founder-name/lorem, no dead OAuth button.
- [ ] Board: ≤3 seeds, realRoles:0, single file, tripwire==BOARD_CDN.
- [ ] `deploy:prep` → CDN foot hash == disk md5 (foot-cdn-publish if stale).
- [ ] Head + foot paste blocks prepared, DG-PUB stamped.
- [ ] **Human** pastes + Save + Publish (staging → www).
- [ ] Poll live until new hash/`__dgFootVer` appears — only then "live".
- [ ] `verify:live` green; CDP hero/WIZ/board screenshots clean.
- [ ] Commit with honest message; update `DEMIGOD-COMPRESSED-STATE.md` + loop-state.

---

## 10. PRIORITY SUMMARY

| Pri | Item | File |
|-----|------|------|
| P0 | WIZ stepper live integrity + submit reachable | `demigod-foot-core.js` |
| P0 | wizBuild/run/show defined+called; boot-smoke | `demigod-foot-core.js` |
| P0 | Head unhide parse-safe + hero reveal | head custom-code |
| P0 | Board honesty gate (≤3, realRoles:0, no mint) | `DEMIGOD-BOARD.json`, verify gates |
| P0 | Quote numeric attr selectors | `demigod-foot-core.js` |
| P1 | Design tokens + AA contrast + reduced-motion + focus | head CSS |
| P1 | Board anchor + esc() XSS | `demigod-foot-core.js` |
| P1 | Copy scrub (48h/founder/lorem/dupes) | `demigod-pages`, Designer |
| P1 | Strip dead OAuth + Supabase UMD | foot + head |
| P2 | Legal + partnerships pages (honest) | `demigod-pages` |
| P2 | OAuth prefill (deferred to ≥10 real subs/wk) | head/foot |
| P2 | Gate hardening (mtime, no tautologies, truth regex) | `demigod-*.mjs` |

**Stop condition:** all P0 + P1 green on two consecutive clean verify runs, live-confirmed by real fetch, WIZ playtest pass, screenshots clean. Then resume GTM (warm SF founder DMs, pilot logging). Minimal further site changes.

**Remember:** verify green + honest + parse-safe + live-confirmed, or it did not ship.
#!/usr/bin/env node
/**
 * Demigod tools registry — agent-discoverable catalog of keep-path tools.
 * CLI: node demigod-tools-registry.mjs [--json] [--md] [--group gates]
 * Used by dashboard /api/tools
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const BUSY = '/tmp/dg-busy';

/** @typedef {{ id: string, name: string, group: string, cmd: string, purpose: string, out?: string, mutate?: boolean, hot?: boolean }} Tool */

/** @type {Tool[]} */
export const TOOLS = [
  // Session start
  { id: 'control', name: 'Control plane', group: 'session', cmd: 'bin/dg home', purpose: 'Cohesive map: site/webflow/match/review/hygiene/ship/orca', out: '/tmp/dg-busy/control-plane.json', hot: true },
  { id: 'full-check', name: 'Full check', group: 'session', cmd: 'bin/dg full-check', purpose: 'Doctor + orca + gates + smoke (one spine)', out: '/tmp/dg-busy/full-check.json', hot: true },
  { id: 'cockpit', name: 'Cockpit', group: 'session', cmd: 'bin/dg-cockpit', purpose: 'Single honest NEXT + hash chain', out: '/tmp/dg-busy/cockpit.json', hot: true },
  { id: 'smoke', name: 'Agent smoke', group: 'session', cmd: 'bin/dg-smoke', purpose: 'CDP body/h1/foot/WIZ proof', out: '/tmp/dg-busy/agent-smoke.json', hot: true },
  { id: 'usertest', name: 'User-test harness', group: 'session', cmd: 'bin/dg-usertest', purpose: 'Unified site+dash+tools+forms UX suite', out: '/tmp/dg-busy/user-test-latest.json', hot: true },
  { id: 'usertest-quick', name: 'User-test quick', group: 'session', cmd: 'bin/dg-usertest --quick', purpose: 'Faster UX suite without full selftest', out: '/tmp/dg-busy/user-test-latest.json', hot: true },
  { id: 'doctor', name: 'Doctor', group: 'session', cmd: 'node demigod-doctor.mjs', purpose: 'Env health: CDP, dash, keys, bins, orca', out: '/tmp/dg-busy/doctor.json', hot: true },
  { id: 'orca-up', name: 'Orca up', group: 'orca', cmd: 'bin/dg-orca up', purpose: 'Keep-awake + desktop Orca + pair + hubs', hot: true },
  { id: 'orca-status', name: 'Orca status', group: 'orca', cmd: 'bin/dg-orca status', purpose: 'Runtime + keep-awake + pair doctor', out: '/tmp/orca-pair-meta.json', hot: true },
  { id: 'orca-pair', name: 'Orca pair URL', group: 'orca', cmd: 'bin/dg-orca pair', purpose: 'Phone pairing orca:// URL + HTML', out: '/home/potter/orca-pair-code.txt', hot: true },
  { id: 'orca-swarm', name: 'Orca swarm', group: 'orca', cmd: 'bin/dg-orca swarm', purpose: 'Spawn grok+claude+codex in demigod-swarm worktree' },
  { id: 'orca-site', name: 'Orca site tabs', group: 'orca', cmd: 'bin/dg-orca site', purpose: 'Open live site + control plane in Orca browser' },
  { id: 'webflow', name: 'Webflow workbench', group: 'session', cmd: 'bin/dg-webflow status', purpose: 'Freeze/tabs/truth/playbooks for Designer+Custom Code', out: '/tmp/dg-busy/webflow-status.json', hot: true },
  { id: 'webflow-doctor', name: 'Webflow doctor', group: 'session', cmd: 'bin/dg-webflow doctor', purpose: 'CDP + Designer + custom-code + freeze readiness', out: '/tmp/dg-busy/webflow-doctor.json', hot: true },
  { id: 'hygiene', name: 'Laptop hygiene', group: 'session', cmd: 'node demigod-laptop-hygiene.mjs --prune', purpose: 'Prune CDP tabs + load/mem check', out: '/tmp/dg-busy/laptop-hygiene.json', hot: true },
  { id: 'review', name: 'Code review v2', group: 'session', cmd: 'bin/dg-review', purpose: 'Diff-aware rules, baseline, SARIF, fix prompt', out: '/tmp/dg-busy/review-latest.json', hot: true },
  { id: 'review-bug', name: 'Bug-hunt review', group: 'gates', cmd: 'bin/dg-review --bug --gates', purpose: 'Stricter + targeted gates', out: '/tmp/dg-busy/review-latest.json' },
  { id: 'review-selftest', name: 'Review selftest', group: 'gates', cmd: 'node demigod-review-selftest.mjs', purpose: 'Fixture proof of review engine' },
  { id: 'ship-checklist', name: 'Ship checklist', group: 'ship', cmd: 'node demigod-ship-checklist.mjs', purpose: 'Freeze-aware ship readiness (no publish)', out: '/tmp/dg-busy/ship-checklist.json', hot: true },
  { id: 'ship-prep', name: 'Ship prep', group: 'ship', cmd: 'bin/dg ship-prep', purpose: 'Gates + paste paths + next commands (no mutate if frozen)', out: '/tmp/dg-busy/ship-prep.json', hot: true },
  { id: 'approve-sub', name: 'Approve submission', group: 'session', cmd: 'node demigod-submissions-approve.mjs --list', purpose: 'Mint sample board card via mintBoardEntry', hot: true },
  { id: 'inbox', name: 'Submissions inbox', group: 'session', cmd: 'bin/dg-inbox', purpose: 'Redacted startup/engineer/partner queue', out: '/tmp/dg-busy/submissions-inbox-latest.json', hot: true },
  { id: 'match-review', name: 'Match review queue', group: 'session', cmd: 'bin/dg-matches list', purpose: 'Pair ledger review queue (not public board)', out: '/tmp/dg-busy/match-review-latest.json', hot: true },
  { id: 'pairs', name: 'Pair ledger CLI', group: 'session', cmd: 'node demigod-pairs-lib.mjs list', purpose: 'Canonical DEMIGOD-PAIRS propose/review/consent', out: 'DEMIGOD-PAIRS.json' },
  { id: 'auto-propose', name: 'Auto-propose pairs', group: 'session', cmd: 'node demigod-auto-propose.mjs --json', purpose: 'Score roles×cands → DEMIGOD-PAIRS (min score 72)', out: '/tmp/dg-busy/auto-propose-latest.json', hot: true },
  { id: 'intro-draft', name: 'Intro draft', group: 'session', cmd: 'node demigod-intro-draft.mjs <sub-id|pairId>', purpose: 'Draft intro (gate: approved|mutual_yes; --force audits)', out: '/tmp/dg-busy/intros/' },
  { id: 'sprint-selftest', name: 'Sprint selftest', group: 'gates', cmd: 'npm run demigod:sprint-selftest', purpose: 'Pairs + intro gate + board audit presence' },
  { id: 'brief', name: 'Agent brief', group: 'session', cmd: 'curl -sS http://127.0.0.1:9878/api/agent-brief', purpose: 'Markdown brief for models', out: '/tmp/dg-busy/AGENT-BRIEF.md', hot: true },
  { id: 'start', name: 'Session start', group: 'session', cmd: 'bin/dg-start', purpose: 'Env + chrome + workspace hygiene' },
  { id: 'truth', name: 'Truth', group: 'session', cmd: 'node demigod-truth.mjs --md', purpose: 'live==disk claims', out: '/tmp/dg-busy/truth.json' },
  { id: 'preflight', name: 'Preflight', group: 'session', cmd: 'node demigod-preflight.mjs', purpose: 'Before foot edits', out: '/tmp/dg-busy/preflight-latest.json' },
  { id: 'handoff', name: 'Handoff', group: 'session', cmd: 'node demigod-handoff.mjs --note "…"', purpose: 'Session handoff note' },

  // Gates
  { id: 'verify-source', name: 'Verify source', group: 'gates', cmd: 'npm run demigod:verify:source', purpose: 'Foot/head/footer source gate', out: 'DEMIGOD-VERIFY-SOURCE.json' },
  { id: 'board-honesty', name: 'Board honesty', group: 'gates', cmd: 'node demigod-verify-board-honesty.mjs', purpose: '≤3 seed roles, real counts honest', out: 'DEMIGOD-BOARD-HONESTY.json' },
  { id: 'loop-state', name: 'Loop state', group: 'gates', cmd: 'node demigod-verify-loop-state.mjs', purpose: 'Loop/busy state consistency' },
  { id: 'foot-smoke', name: 'Foot smoke', group: 'gates', cmd: 'node demigod-foot-smoke.mjs', purpose: 'Local foot JS smoke' },

  // Ship (mutate — respect freeze)
  { id: 'freeze-status', name: 'Freeze status', group: 'ship', cmd: 'node demigod-publish-freeze.mjs status', purpose: 'Publish freeze on/off', out: '/tmp/dg-busy/publish-freeze.json' },
  { id: 'ship-status', name: 'Ship status', group: 'ship', cmd: 'node demigod-ship-status.mjs', purpose: 'CDN/ship snapshot', out: '/tmp/dg-busy/ship-status.json' },
  { id: 'foot-cdn', name: 'Foot CDN publish', group: 'ship', cmd: 'node demigod-foot-cdn-publish.mjs', purpose: 'Upload foot to catbox + manifest', mutate: true },
  { id: 'cm6-paste', name: 'CM6 paste publish', group: 'ship', cmd: 'node demigod-cm6-paste-publish.mjs --footer-only', purpose: 'Paste footer into Webflow custom code', mutate: true },
  { id: 'tab-prune', name: 'CDP tab prune', group: 'ship', cmd: 'node demigod-cdp-tab-prune.mjs', purpose: 'Close excess Chrome tabs' },

  // Inbox / multi-agent
  { id: 'plan-inbox', name: 'Plan inbox', group: 'swarm', cmd: 'node demigod-plan-inbox.mjs --useful', purpose: 'Unread agent plans', out: '/tmp/dg-busy/plan-inbox-latest.json' },
  { id: 'tools-registry', name: 'Tools registry', group: 'swarm', cmd: 'node demigod-tools-registry.mjs --md', purpose: 'This catalog', hot: true },
  { id: 'dash', name: 'Dashboard', group: 'swarm', cmd: 'bin/dg-dash', purpose: 'Agent dashboard UI :9878', hot: true },

  // Forms / WIZ
  { id: 'wiz-playtest', name: 'WIZ CDP playtest', group: 'forms', cmd: 'node demigod-wiz-cdp-playtest.mjs --local', purpose: 'Local WIZ stepper playtest' },
  { id: 'submit-fixture', name: 'Submit fixture', group: 'forms', cmd: 'bin/dg-submit-fixture', purpose: 'Webflow form submit mock harness' },
];

export function toolAge(outPath) {
  if (!outPath) return null;
  const full = outPath.startsWith('/') ? outPath : path.join(ROOT, outPath);
  try {
    const st = fs.statSync(full);
    return {
      path: full,
      mtime: st.mtime.toISOString(),
      ageSec: Math.round((Date.now() - st.mtimeMs) / 1000),
      bytes: st.size,
    };
  } catch {
    return { path: full, missing: true };
  }
}

export function buildRegistry({ group = null } = {}) {
  const at = new Date().toISOString();
  let tools = TOOLS.slice();
  if (group) tools = tools.filter((t) => t.group === group);
  const enriched = tools.map((t) => ({
    ...t,
    evidence: toolAge(t.out),
  }));
  const groups = [...new Set(TOOLS.map((t) => t.group))];
  return {
    at,
    count: enriched.length,
    groups,
    tools: enriched,
    sessionStart: ['bin/dg-cockpit', 'bin/dg-smoke', 'curl -sS http://127.0.0.1:9878/api/agent-brief'],
    note: 'Prefer cockpit NEXT. Mutate tools only when freeze OFF.',
  };
}

export function toMarkdown(reg) {
  const lines = [
    `# Demigod tools registry`,
    `at: ${reg.at} · count: ${reg.count}`,
    '',
    `Session: \`${reg.sessionStart.join(' && ')}\``,
    '',
  ];
  for (const g of reg.groups) {
    const items = reg.tools.filter((t) => t.group === g);
    if (!items.length) continue;
    lines.push(`## ${g}`);
    for (const t of items) {
      const age = t.evidence?.missing
        ? 'no output yet'
        : t.evidence?.ageSec != null
          ? `age ${t.evidence.ageSec}s`
          : '';
      const flags = [t.mutate ? 'MUTATE' : null, t.hot ? 'hot' : null].filter(Boolean).join(',');
      lines.push(`- **${t.name}** (\`${t.id}\`) ${flags ? `[${flags}]` : ''}`);
      lines.push(`  - ${t.purpose}`);
      lines.push(`  - \`${t.cmd}\`${age ? ` · ${age}` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = new Set(process.argv.slice(2));
  const groupArg = process.argv.includes('--group')
    ? process.argv[process.argv.indexOf('--group') + 1]
    : null;
  const reg = buildRegistry({ group: groupArg });
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'tools-registry.json'), JSON.stringify(reg, null, 2));
  if (args.has('--md') || !args.has('--json')) {
    const md = toMarkdown(reg);
    fs.writeFileSync(path.join(BUSY, 'tools-registry.md'), md);
    if (!args.has('--json')) console.log(md);
  }
  if (args.has('--json')) console.log(JSON.stringify(reg, null, 2));
}
#!/usr/bin/env node
/**
 * demigod-control — cohesive Control Plane over all Demigod ops modules
 *
 * One mental model:
 *   Site (live/disk) · Webflow · Match · Review · Hygiene · Ship
 * One CLI spine:
 *   bin/dg status|home|next|webflow|matches|review|hygiene|dash|…
 * One JSON:
 *   /tmp/dg-busy/control-plane.json  (+ dash /api/control)
 *
 * Usage:
 *   bin/dg status|--json
 *   bin/dg home                 # human map
 *   bin/dg next                 # single NEXT + module tips
 *   bin/dg <module> [args…]     # dispatch to module CLI
 *   node demigod-control.mjs modules
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { BUSY, ensureBusy, atomicWrite, readJson } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const DASH = process.env.DEMIGOD_DASH || 'http://127.0.0.1:9878';
const OUT = path.join(BUSY, 'control-plane.json');

/** Module map — the cohesion layer (UI + CLI + API) */
export const MODULES = {
  site: {
    title: 'Site',
    why: 'Live foot healthy and honest vs disk',
    emoji: '◎',
    accent: '#5ecf8a',
    key: 's',
    cli: 'bin/dg smoke',
    dashTab: 'overview',
    api: `${DASH}/api/smoke`,
    jobs: ['smoke', 'truth'],
    actions: [
      { id: 'smoke', label: 'Smoke', job: 'smoke' },
      { id: 'truth', label: 'Truth', job: 'truth' },
    ],
  },
  webflow: {
    title: 'Webflow',
    why: 'Freeze, CDP tabs, paste/publish readiness',
    emoji: '◇',
    accent: '#7eb6e8',
    key: 'w',
    cli: 'bin/dg webflow doctor',
    dashTab: 'plane',
    api: `${DASH}/api/webflow`,
    jobs: ['webflow', 'webflow-doctor', 'tab-prune'],
    actions: [
      { id: 'wf-doc', label: 'Doctor', job: 'webflow-doctor' },
      { id: 'wf-stat', label: 'Status', job: 'webflow' },
      { id: 'prune', label: 'Prune tabs', job: 'tab-prune' },
    ],
  },
  match: {
    title: 'Match',
    why: 'Inbox → pairs → review → intro draft',
    emoji: '⇄',
    accent: '#C9A84C',
    key: 'm',
    cli: 'bin/dg matches',
    dashTab: 'matches',
    api: `${DASH}/api/matches`,
    jobs: ['inbox', 'match-review', 'auto-propose'],
    actions: [
      { id: 'inbox', label: 'Inbox', job: 'inbox', tab: 'inbox' },
      { id: 'queue', label: 'Queue', job: 'match-review', tab: 'matches' },
      { id: 'auto', label: 'Auto-propose', job: 'auto-propose' },
    ],
  },
  review: {
    title: 'Review',
    why: 'Diff-aware policy scan + fix prompts',
    emoji: '⌕',
    accent: '#e8b84a',
    key: 'r',
    cli: 'bin/dg review',
    dashTab: 'plane',
    api: `${DASH}/api/review`,
    jobs: ['review', 'review-bug'],
    actions: [
      { id: 'rev', label: 'Review', job: 'review' },
      { id: 'revbug', label: 'Bug hunt', job: 'review-bug' },
    ],
  },
  hygiene: {
    title: 'Hygiene',
    why: 'Tabs + load — keep laptop snappy',
    emoji: '✧',
    accent: '#9a9388',
    key: 'h',
    cli: 'bin/dg hygiene --prune',
    dashTab: 'plane',
    jobs: ['hygiene', 'tab-prune'],
    actions: [{ id: 'hyg', label: 'Prune now', job: 'hygiene' }],
  },
  ship: {
    title: 'Ship',
    why: 'When (not) to mutate CDN/Webflow',
    emoji: '⚑',
    accent: '#f07171',
    key: 'p',
    cli: 'node demigod-publish-freeze.mjs status',
    dashTab: 'roadmap',
    api: `${DASH}/api/ship-checklist`,
    jobs: ['ship-checklist', 'verify-source', 'board-honesty'],
    actions: [
      { id: 'shipc', label: 'Checklist', job: 'ship-checklist' },
      { id: 'honest', label: 'Board honesty', job: 'board-honesty' },
    ],
  },
  swarm: {
    title: 'Swarm',
    why: 'Handoffs + multi-agent plans',
    emoji: '◉',
    accent: '#7eb6e8',
    key: 'a',
    cli: 'bin/dg-handoff',
    dashTab: 'swarm',
    jobs: ['plan-inbox'],
    actions: [
      { id: 'plans', label: 'Plans', job: 'plan-inbox', tab: 'swarm' },
      { id: 'hand', label: 'Handoff', tab: 'handoff' },
    ],
  },
  orca: {
    title: 'Orca',
    why: 'Phone + laptop remote seat (pair, hubs, agent spawn)',
    emoji: '◎',
    accent: '#a78bfa',
    key: 'o',
    cli: 'bin/dg-orca status',
    dashTab: 'plane',
    jobs: [],
    actions: [
      { id: 'orca-up', label: 'Up', cmd: 'bin/dg-orca up' },
      { id: 'orca-pair', label: 'Pair URL', cmd: 'bin/dg-orca pair' },
      { id: 'orca-swarm', label: 'Swarm', cmd: 'bin/dg-orca swarm' },
    ],
  },
};

const DISPATCH = {
  webflow: ['demigod-webflow.mjs'],
  wf: ['demigod-webflow.mjs'],
  matches: ['demigod-match-review.mjs', '--json'],
  match: ['demigod-match-review.mjs', '--json'],
  pairs: ['demigod-pairs-lib.mjs', 'list'],
  inbox: ['demigod-submissions-inbox.mjs', '--json'],
  review: ['demigod-review.mjs'],
  hygiene: ['demigod-laptop-hygiene.mjs'],
  doctor: ['demigod-doctor.mjs'],
  smoke: ['demigod-agent-smoke.mjs'],
  truth: ['demigod-truth.mjs', '--md'],
  freeze: ['demigod-publish-freeze.mjs', 'status'],
  cockpit: ['demigod-agent-cockpit.mjs'],
  usertest: ['demigod-user-test.mjs', '--quick'],
};

function sh(cmd, timeout = 20000) {
  return spawnSync('bash', ['-lc', cmd], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
  });
}

function safeJsonFile(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

async function fetchJson(url, ms = 8000) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms) });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function buildControlPlane() {
  ensureBusy();
  const freeze = safeJsonFile(path.join(BUSY, 'publish-freeze.json')) || {};
  const envRaw = String(process.env.DEMIGOD_PUBLISH_FREEZE || '').toLowerCase();
  const envFreeze = ['1', 'true', 'yes', 'on'].includes(envRaw);
  const frozen = envFreeze || Boolean(freeze.on);

  // Prefer busy cache to avoid recursive dash status when called FROM dash
  let dashStatus = safeJsonFile(path.join(BUSY, 'dashboard-status.json'));
  if (!dashStatus?.at || Date.now() - Date.parse(dashStatus.at) > 120000) {
    dashStatus = (await fetchJson(`${DASH}/api/status`)) || dashStatus;
  }
  const [webflow, review, hygiene, matchesBusy] = await Promise.all([
    Promise.resolve(safeJsonFile(path.join(BUSY, 'webflow-status.json')) || fetchJson(`${DASH}/api/webflow`)),
    Promise.resolve(safeJsonFile(path.join(BUSY, 'review-latest.json'))),
    Promise.resolve(safeJsonFile(path.join(BUSY, 'laptop-hygiene.json'))),
    Promise.resolve(safeJsonFile(path.join(BUSY, 'match-review-latest.json'))),
  ]);

  // refresh thin modules if missing (best-effort, short)
  let wf = webflow;
  if (!wf?.at) {
    sh('node demigod-webflow.mjs status --json >/tmp/dg-busy/webflow-status.json 2>/dev/null', 25000);
    wf = safeJsonFile(path.join(BUSY, 'webflow-status.json'));
  }

  const boardH = safeJsonFile(path.join(ROOT, 'DEMIGOD-BOARD-HONESTY.json'));
  const footLock = safeJsonFile(path.join(BUSY, 'foot-lock.json'));
  const lockHeld = Boolean(footLock?.expiresAt && Date.parse(footLock.expiresAt) > Date.now());

  function enrich(id, state) {
    const def = MODULES[id] || {};
    return {
      id,
      title: def.title,
      why: def.why,
      emoji: def.emoji,
      accent: def.accent,
      key: def.key,
      cli: def.cli,
      dashTab: def.dashTab,
      jobs: def.jobs || [],
      actions: def.actions || [],
      ...state,
    };
  }

  const modules = {};
  modules.site = enrich('site', {
    ok: Boolean(dashStatus?.live?.ok ?? dashStatus?.smoke?.pass),
    detail: dashStatus?.glance?.site || dashStatus?.live?.foot || '—',
    next: 'bin/dg smoke',
    metrics: {
      foot: dashStatus?.live?.foot || null,
      smoke: dashStatus?.smoke?.pass ?? null,
    },
  });
  modules.webflow = enrich('webflow', {
    ok: Boolean(wf?.cdp?.ok),
    freeze: frozen,
    ready: wf?.ready || null,
    tabs: wf?.tabs?.byRole || null,
    detail: frozen
      ? `freeze ON · tabs ${wf?.tabs?.pages ?? '?'}`
      : `paste=${wf?.ready?.paste} · tabs ${wf?.tabs?.pages ?? '?'}`,
    next: 'bin/dg webflow doctor',
    metrics: { pages: wf?.tabs?.pages, cdp: wf?.cdp?.ok },
  });
  const matchSum = matchesBusy?.summary || dashStatus?.matches?.summary || null;
  const realProposed =
    matchSum?.realProposed ??
    (matchSum?.byState?.proposed != null && matchSum?.sampleCount != null
      ? Math.max(0, (matchSum.byState.proposed || 0) - (matchSum.sampleCount || 0))
      : matchSum?.byState?.proposed);
  modules.match = enrich('match', {
    ok: true,
    summary: matchSum,
    inbox: dashStatus?.inbox
      ? { new: dashStatus.inbox.newCount, total: dashStatus.inbox.total }
      : null,
    detail: matchSum
      ? `pairs ${matchSum.total} · realProposed ${realProposed ?? 0} · samples ${matchSum.sampleCount ?? '?'}`
      : 'run bin/dg matches',
    next: 'bin/dg matches',
    metrics: {
      pairs: matchSum?.total,
      proposed: realProposed ?? 0,
      realProposed: realProposed ?? 0,
      sampleCount: matchSum?.sampleCount ?? 0,
      inboxNew: dashStatus?.inbox?.newCount,
    },
  });
  modules.review = enrich('review', {
    ok: review ? !review.summary?.fail : null,
    findings: review?.summary?.count ?? null,
    bySev: review?.summary?.bySev || null,
    detail: review
      ? `${review.summary?.count ?? 0} findings · fail=${review.summary?.fail}`
      : 'no review yet',
    next: 'bin/dg review',
    metrics: { fail: review?.summary?.fail, count: review?.summary?.count },
  });
  modules.hygiene = enrich('hygiene', {
    ok: hygiene?.healthy ?? null,
    tabs: hygiene?.tabs?.pages ?? wf?.tabs?.pages,
    detail: hygiene
      ? `load ${hygiene.load?.load1} · tabs ${hygiene.tabs?.pages} · free ${hygiene.load?.memAvailGb}G`
      : 'run hygiene',
demigod:audit	node demigod-webflow-audit.mjs
demigod:heavy	node demigod-competitive-heavy.mjs
demigod:heavy:code	node demigod-code-heavy.mjs
demigod:heavy:design	node -e "import('./demigod-turn-lib.mjs').then(m=>m.runHeavyDesignAudit().then(console.log))"
demigod:status	node demigod-status-report.mjs
demigod:heavy:sanity	node demigod-heavy-sanity-pass.mjs
demigod:heavy:queue	node demigod-heavy-queue.mjs
demigod:heavy:queue:resume	node demigod-heavy-queue.mjs review,code,design
demigod:heavy:visual	node demigod-visual-heavy.mjs
demigod:visual:loop	echo 'DEPRECATED: loop disabled — use demigod:visual:apply' && exit 1
demigod:visual:apply	node demigod-visual-apply.mjs
demigod:visual:deploy	node demigod-visual-apply.mjs && node demigod-deploy-both.mjs
demigod:visual:assets	node demigod-upload-assets.mjs
demigod:continuous	echo 'DEPRECATED: auto-loop disabled' && exit 1
demigod:healthcheck	node demigod-healthcheck.mjs
demigod:cleanup	node demigod-cleanup-workers.mjs
demigod:cleanup:tabs	node cdp-close-tabs.mjs
demigod:designer:resize	node demigod-designer-resize.mjs
demigod:full-ship	node demigod-full-ship-pass.mjs
demigod:master-only	node demigod-master-only-pass.mjs
demigod:source-truth	echo DEPRECATED: use demigod:cockpit / demigod:truth — source-truth-pass archived && exit 1
demigod:resume-field	node demigod-resume-field-pass.mjs
demigod:heavy:master	node demigod-heavy-master-code.mjs
demigod:heavy:improve	node demigod-heavy-improve-prompt.mjs
demigod:heavy:finish-next	node demigod-heavy-finish-next.mjs
demigod:heavy:roadmap	node demigod-heavy-roadmap.mjs
demigod:heavy:pipeline	node demigod-heavy-pipeline.mjs
demigod:heavy:form-fields	node demigod-heavy-form-fields.mjs
demigod:board:publish	node demigod-verify-board-honesty.mjs && node demigod-board-publish.mjs
demigod:pilot:log	node demigod-pilot-logger.mjs
demigod:sms:sim	node demigod-sms-sim.mjs
demigod:sms:present	node demigod-matching-engine.mjs present-sms
demigod:receipt:mint	node demigod-receipt-mint.mjs
demigod:signal:theater	node demigod-signal-theater.mjs
demigod:signal:png	node demigod-signal-theater.mjs --png
demigod:dm:blast	node demigod-founder-dm-blast.mjs --dry
demigod:autonomy:status	node demigod-status-report.mjs && npm run demigod:verify:live && echo '=== Autonomy safe status complete ==='
demigod:cycle	echo 'RETIRED: sustain-cycle minted sim pilots + fed Grok fake context. Use dg → ship/demand prompts.' && exit 1
demigod:autoprep	npm run demigod:autonomy:status && node demigod-founder-dm-blast.mjs --dry --limit=3 2>/dev/null || true && node demigod-pilot-tracker.mjs --help 2>/dev/null | head -3 || true && echo '=== Safe prep artifacts ready (dry only). Run verify before any publish prep. ==='
demigod:fable:autonomy	node scripts/demigod-fable.mjs --autonomy
demigod:ghost:push	node demigod-ghost-push.mjs
demigod:verify:receipt	node demigod-verify-receipt.mjs
demigod:submissions:webhook	node demigod-submissions-webhook.mjs
demigod:submissions:ingest	node demigod-submissions-ingest.mjs
demigod:submissions:approve	node demigod-submissions-approve.mjs
demigod:submissions:triage	node demigod-submissions-triage.mjs
demigod:submissions:inbox	node demigod-submissions-inbox.mjs
demigod:intake:smoke	node demigod-intake-smoke.mjs
demigod:submissions:e2e	node demigod-submissions-e2e.mjs
demigod:board:reset	node demigod-board-reset.mjs
demigod:tunnel	node demigod-tunnel-start.mjs
demigod:webhook:wire	node demigod-foot-cdn-publish.mjs && node demigod-fix-custom-code.mjs
demigod:webhook:ensure	node demigod-webhook-ensure.mjs
demigod:copy:static	node demigod-drift-fix-pass.mjs
demigod:copy:static:ai	node demigod-copy-static-ai.mjs
demigod:webhook:setup	node demigod-webflow-webhook-setup.mjs
demigod:drift:fix	node demigod-drift-fix-pass.mjs
demigod:forms:rename	node demigod-forms-rename-pass.mjs
demigod:heavy:ship-loop	node demigod-heavy-ship-loop.mjs
demigod:heavy:website-audit	node demigod-heavy-website-audit-pass.mjs
demigod:final:publish	node demigod-final-publish-pass.mjs
demigod:perf:cleanup	node demigod-perf-cleanup.mjs
demigod:workspace	node demigod-open-workspace.mjs
demigod:heavy:grok-perf	node demigod-heavy-grok-perf.mjs
demigod:heavy:grok-research	node demigod-heavy-grok-build-research.mjs
demigod:heavy:grok-options	node demigod-heavy-grok-options-research.mjs
demigod:heavy:startup-checklist	node demigod-heavy-startup-checklist.mjs
demigod:heavy:partnership	node demigod-heavy-partnership-program.mjs
demigod:heavy:partnership-hybrid	node demigod-heavy-partnership-hybrid-c.mjs
demigod:heavy:leverage	node demigod-heavy-leverage-next.mjs
demigod:leverage:status	node demigod-leverage-status.mjs
demigod:dm:blast:send	node demigod-founder-dm-blast.mjs
demigod:sla:start	node demigod-sla-pager.mjs
demigod:sla:test	node demigod-sla-pager.mjs --test
demigod:sla:tick	node demigod-sla-pager.mjs --tick
demigod:sla:status	node demigod-sla-pager.mjs --status
demigod:log:proof	node demigod-proof-logger.mjs
demigod:verify:blast	node demigod-founder-dm-blast.mjs --dry --limit=1
demigod:verify:sla	node demigod-sla-pager.mjs --test
demigod:verify:loop-state	node demigod-verify-loop-state.mjs
demigod:verify:gtm	node demigod-verify-gtm-scripts.mjs
demigod:audit:system	node demigod-system-audit.mjs
demigod:audit:forms	node demigod-forms-full-audit.mjs
demigod:heavy:history	node demigod-heavy-history-digest.mjs
demigod:heavy:full-sync	node demigod-heavy-full-sync.mjs
demigod:heavy:architecture	node demigod-heavy-architecture-handoff.mjs
demigod:heavy:competitors	node demigod-heavy-competitors-handoff.mjs
demigod:heavy:competitors:followup	node demigod-heavy-competitors-followup.mjs
demigod:heavy:competitors:fresh	node demigod-heavy-competitors-fresh.mjs
demigod:heavy:creative	node demigod-heavy-creative-next.mjs
demigod:heavy:elegance	node demigod-heavy-elegance-handoff.mjs
demigod:audit:full-sync	node demigod-system-audit.mjs && node demigod-heavy-history-digest.mjs && node demigod-forms-full-audit.mjs && node demigod-full-audit.mjs && node demigod-verify-live.mjs
demigod:webflow:ai-ship	node demigod-webflow-ai-ship.mjs
demigod:ship:loop	node demigod-board-reset.mjs && node demigod-submissions-e2e.mjs && node demigod-agent-cockpit.mjs --json
demigod:verify:submissions	node --test demigod-submissions-lib.test.mjs
demigod:symbol-master	node demigod-symbol-master-cdp.mjs
demigod:nav-master	node demigod-nav-master-cdp.mjs
demigod:tally:webhook	node demigod-tally-webhook-setup.mjs
demigod:tally:relay	node demigod-tally-slack-relay.mjs
demigod:cms:pipelines	node demigod-cms-pipelines.mjs
demigod:agent-wake	node demigod-agent-wake.mjs
demigod:poke	node demigod-local-poke.mjs
demigod:bridge	node demigod-cycle-bridge.mjs
demigod:loose-ends	node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('DEMIGOD-LOOSE-ENDS.json')),null,2))"
demigod:playtest	node demigod-playtest-review.mjs
demigod:wizard:playtest	node demigod-wizard-playtest.mjs
demigod:mobile:buttons	node demigod-mobile-button-playtest.mjs
demigod:mobile:audit	node demigod-mobile-audit.mjs
demigod:mobile:lighthouse	node demigod-mobile-lighthouse.mjs
demigod:button:audit	node demigod-button-audit.mjs
demigod:button:audit:quick	node demigod-button-audit.mjs --quick
demigod:partnerships:publish	node demigod-partnerships-publish-pass.mjs
demigod:design:audit	node demigod-design-audit.mjs
demigod:partnerships:playtest	node demigod-partnerships-playtest.mjs
demigod:verify:unit	node --test demigod-live-lib.test.mjs
demigod:verify:source	node demigod-verify-source.mjs
demigod:verify:live	node demigod-verify-live.mjs
demigod:verify:smoke	node demigod-foot-smoke.mjs
demigod:deploy:prep	node demigod-verify-board-honesty.mjs && node --check demigod-foot-core.js && npm run demigod:verify:source && node demigod-foot-cdn-publish.mjs && node demigod-fix-custom-code.mjs && npm run demigod:verify:live
demigod:ship:gate	node demigod-ship-gate.mjs
demigod:ship:gate:fast	node demigod-ship-gate.mjs --fast
demigod:verify:all	node demigod-verify-all.mjs
demigod:verify:browser	node demigod-verify-all.mjs --browser
demigod:fix-masters	node demigod-fix-masters.mjs
demigod:heavy:webflow-tally	node demigod-heavy-webflow-tally.mjs
demigod:forms-plan	node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('DEMIGOD-FORMS-TALLY-PLAN.json')),null,2))"
demigod:fix-forms	node demigod-fix-forms.mjs
demigod:simplify	node demigod-simplify-delete.mjs
demigod:canvas:simplify	node demigod-canvas-simplify.mjs
demigod:designer:bloat-delete	node demigod-designer-bloat-delete.mjs
demigod:tally:probe	node demigod-tally-probe.mjs
demigod:tally:create	node demigod-create-tally-forms.mjs
demigod:tally:create:cdp	node demigod-tally-create-cdp.mjs
demigod:tally:publish	node demigod-tally-publish-cdp.mjs
demigod:tally:complete	node demigod-tally-complete.mjs
demigod:tally:append-head	node demigod-append-tally-embed.mjs
demigod:head:prune	node demigod-head-prune.mjs
demigod:fix:custom-code	node demigod-fix-custom-code.mjs
demigod:foot:cdn	node demigod-foot-cdn-publish.mjs
demigod:head:cdn	node demigod-head-css-publish.mjs
demigod:footer:master	node demigod-footer-master-cdp.mjs
demigod:fix:code-leak	node demigod-fix-code-leak.mjs
demigod:dns:cutover	node demigod-dns-cutover.mjs && node demigod-dns-add-domain.mjs
demigod:dns:connect	node demigod-connect-domain.mjs
demigod:dns:squarespace	node demigod-squarespace-dns.mjs
demigod:dns:verify	node demigod-dns-verify.mjs
demigod:premium:stack	node demigod-premium-stack.mjs
demigod:perfect:loop	echo 'DEPRECATED: loop disabled' && exit 1
demigod:cursor:audit	node demigod-cursor-audit.mjs
demigod:tally:pipe-brief	node demigod-tally-pipe-brief.mjs
demigod:tally:fix-fields	node demigod-tally-fix-fields.mjs
demigod:tally:recreate	node demigod-tally-recreate.mjs
demigod:bugfix:pass	npm run demigod:head:prune && npm run demigod:canvas:simplify && npm run demigod:fix-masters && npm run demigod:tally:fix-fields && npm run demigod:capture:audit && npm run demigod:playtest
demigod:fix:head-leak	node demigod-fix-head-leak.mjs
demigod:heavy:tally	node demigod-heavy-tally-update.mjs
demigod:form:test	node demigod-form-submit-test.mjs
demigod:pipeline	node demigod-run-pipeline.mjs
demigod:post-login	node demigod-post-login.mjs
demigod:capture:audit	node demigod-capture-live-audit.mjs
demigod:visual:pass	node demigod-visual-pass.mjs
demigod:scroll:audit	node demigod-scroll-audit.mjs
demigod:heavy:prompts	node demigod-heavy-problem-prompts.mjs
demigod:webflow:ai:p0	node demigod-webflow-ai-p0.mjs
demigod:head:surgical	node demigod-head-surgical.mjs
demigod:audit:full	npm run demigod:capture:audit && npm run demigod:playtest && npm run demigod:heavy:prompts
demigod:tally:sync	node demigod-sync-tally-urls.mjs
demigod:tally:setup	node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('DEMIGOD-TALLY-URLS.json')),null,2))"
demigod:inject-head	node demigod-inject-head.mjs
demigod:idle-reprompt	node demigod-idle-reprompt.mjs
demigod:idle-reprompt:force	node demigod-idle-reprompt.mjs --force --playtest
demigod:heavy:autocontinue	node demigod-heavy-autocontinue.mjs
demigod:recover	node demigod-idle-reprompt.mjs --recover
demigod:p0-pass	node demigod-p0-publish-pass.mjs
demigod:remove-mcp	node demigod-remove-mcp-apps.mjs
demigod:fix-live	node demigod-fix-live-pass.mjs
demigod:loop	echo 'DEPRECATED: loop disabled — edit manually' && exit 1
demigod:loop:once	echo 'DEPRECATED: loop disabled' && exit 1
demigod:cursor	node demigod-cursor-webflow-dispatch.mjs
demigod:watch	echo 'DEPRECATED: supervisor disabled' && exit 1
demigod:watch:once	echo 'DEPRECATED: orchestrator disabled' && exit 1
demigod:orchestrator	echo 'DEPRECATED: orchestrator disabled' && exit 1
demigod:cycle8	node demigod-cycle-8.mjs
demigod:screenshots	node -e "import('./demigod-turn-lib.mjs').then(m=>m.captureDemigodScreenshots('manual').then(console.log))"
demigod:pilot:track	node demigod-pilot-tracker.mjs
demigod:proof:sla	node demigod-proof-sla.mjs
demigod:fable	node scripts/demigod-fable.mjs
demigod:fable:quick	claude --model fable -p --add-dir /home/potter --bare
demigod:fable:gtm	node scripts/demigod-fable.mjs --gtm
demigod:fable:review	node scripts/demigod-fable.mjs --review
demigod:fable:copy	node scripts/demigod-fable.mjs --copy
demigod:fable:code	node scripts/demigod-fable.mjs --code
demigod:fable:template	node scripts/demigod-fable.mjs --template
demigod:workflow:plan	node scripts/demigod-fable.mjs --fresh "$(cat /tmp/fable-workflow-empower-task.txt 2>/dev/null || echo 'Lead planning to empower popOS/Grok/Cursor/Claude-Fable workflow')"
demigod:workflow:status	~/agent-dev.sh status; echo '--- Fable plan tail ---'; tail -c 4000 /tmp/fable-workflow-empower-reply.txt 2>/dev/null || echo '(plan still running or use cat /tmp/fable-*.txt)'; echo '--- recent keep-going ---'; tail -c 2000 demigod-keep-going.md 2>/dev/null || true
demigod:audit:workflow	node demigod-capture-live-audit.mjs 2>/dev/null || true; node -e 'console.log("CDP tabs:");' 2>/dev/null; ~/agent-dev.sh status; npm run demigod:verify:source; echo 'Screenshots in /tmp/audit-*.png + /tmp/demigod-*.png'
demigod:dash	node demigod-agent-dashboard.mjs
demigod:dash:bg	bin/dg-dash
demigod:start	bin/dg-start
demigod:ship:status	node demigod-ship-status.mjs
demigod:foot:lock	node demigod-foot-lock.mjs
demigod:foot:lock:status	node demigod-foot-lock.mjs status
demigod:publish:foot	node demigod-publish-foot.mjs
demigod:claim-verify	node demigod-claim-verify.mjs
demigod:plan	node demigod-plan-ledger.mjs
demigod:plan:open	node demigod-plan-ledger.mjs open
demigod:preflight	node demigod-preflight.mjs
demigod:inbox	node demigod-plan-inbox.mjs
demigod:tools-selftest	node demigod-tools-selftest.mjs
demigod:sprint-selftest	node demigod-sprint-selftest.mjs
demigod:match-review	node demigod-match-review.mjs --json
demigod:auto-propose	node demigod-auto-propose.mjs --json
demigod:review	node demigod-review.mjs
demigod:review:json	node demigod-review.mjs --json
demigod:review:bug	node demigod-review.mjs --bug --gates
demigod:review:selftest	node demigod-review-selftest.mjs
demigod:review:llm	node demigod-review.mjs --llm --bug
demigod:webflow	node demigod-webflow.mjs status
demigod:webflow:doctor	node demigod-webflow.mjs doctor
demigod:webflow:tabs	node demigod-webflow.mjs tabs
demigod:hygiene	node demigod-laptop-hygiene.mjs --prune
demigod:truth	node demigod-truth.mjs
demigod:freeze	node demigod-freeze.mjs
demigod:handoff	node demigod-handoff.mjs
demigod:apply	node demigod-apply.mjs
demigod:anchors	node demigod-anchors.mjs
demigod:watch-submits	node demigod-watch-submits.mjs
demigod:copy-policy	node demigod-copy-policy.mjs
demigod:conversion	node demigod-conversion-playtest.mjs
demigod:publish-freeze	node demigod-publish-freeze.mjs
demigod:pilot-os	node demigod-pilot-os.mjs
demigod:worker-budget	node demigod-worker-budget.mjs
demigod:ops-reconcile	node demigod-ops-reconcile.mjs
demigod:submissions-stale	node demigod-submissions-stale.mjs
demigod:session-contract	node demigod-session-contract.mjs
demigod:match	node demigod-match.mjs
demigod:intro	node demigod-intro.mjs
demigod:close	node demigod-close.mjs
demigod:build-loop	node demigod-build-loop.mjs
demigod:pages:serve	python3 -m http.server 8766 --directory demigod-pages
demigod:cockpit	node demigod-agent-cockpit.mjs
demigod:cockpit:json	node demigod-agent-cockpit.mjs --json
demigod:agent-smoke	node demigod-agent-smoke.mjs
demigod:usertest	node demigod-user-test.mjs
demigod:usertest:quick	node demigod-user-test.mjs --quick
demigod:usertest:site	node demigod-user-test.mjs --suite site
demigod:usertest:dash	node demigod-user-test.mjs --suite dash
demigod:submit-fixture	node demigod-submit-fixture.mjs
demigod:agent-tools	node demigod-submit-fixture.mjs && node demigod-agent-smoke.mjs && node demigod-agent-cockpit.mjs --json
demigod:tools	node demigod-tools-registry.mjs --md
demigod:tools:json	node demigod-tools-registry.mjs --json
demigod:doctor	node demigod-doctor.mjs
demigod:ship-check	node demigod-ship-checklist.mjs

exec
/bin/bash -lc "node demigod-tools-registry.mjs --md; sed -n '1,180p' demigod-control.mjs; for c in "'$(git rev-list --reverse HEAD); do git show -s --format='"'%h %ad %s' --date=short "'$c; git show --stat --oneline --format='"'' "'$c | tail -n 3; done' in /home/potter
 succeeded in 188ms:
 demigod-write-desk.mjs                             |  100 +
 package.json                                       |   63 +-
 312 files changed, 43228 insertions(+), 281 deletions(-)
f6daa65 2026-07-13 Orca phone remote seat: bridge tools, keep-awake, control plane module
 demigod-orca-bridge.mjs |  212 +++++++
 keep-awake.sh           |   50 ++
 7 files changed, 2029 insertions(+), 1 deletion(-)
d8edc21 2026-07-13 Head CSS: focus-visible, WIZ CTA depth, 90day field emphasis
 demigod-head-styles.css | 16 ++++++++++++++++
 1 file changed, 16 insertions(+)
305aa3f 2026-07-13 Cohesion: full-check, freeze guards, honesty JSON, WIZ UX v196
 demigod-tools-registry.mjs       |  10 +++-
 demigod-verify-board-honesty.mjs |  47 ++++++++++++++---
 13 files changed, 378 insertions(+), 51 deletions(-)
ed69995 2026-07-14 Finish WIP: match honesty, freeze env, approve sample, orca pair, nav UX
 demigod-pairs-lib.mjs           | 13 ++++++---
 demigod-submissions-approve.mjs | 59 +++++++++++++++++++++++++++++++++--------
 10 files changed, 154 insertions(+), 47 deletions(-)
9645174 2026-07-14 Build finish: mint approve, auto-propose quality, ship-prep, freeze guards
 demigod-submissions-approve.mjs | 88 +++++++++++++++++++++++++++--------------
 demigod-tools-registry.mjs      |  4 +-
 11 files changed, 228 insertions(+), 54 deletions(-)
1f6615b 2026-07-14 Ship live v196 foot + knfmdf head CSS (freeze off)
 demigod-head-css-publish.mjs  |   6 +-
 demigod-head-minimal.html     |   2 +-
 6 files changed, 46 insertions(+), 232 deletions(-)
e9b744a 2026-07-14 Design v197: cooler UI system + sharpened site/form copy
 demigod-head-styles.css    | 168 +++++++++++++++++++++++++++++++++++++++++++++
 demigod-keep-going.md      |   2 +-
 6 files changed, 194 insertions(+), 26 deletions(-)
f228a61 2026-07-14 Great design v198: brand assets, product pages v3, home glow
 public/demigod/hero-gold-bg.jpg | Bin 0 -> 230416 bytes
 public/demigod/mark-gold.png    | Bin 0 -> 84469 bytes
 18 files changed, 1803 insertions(+), 13 deletions(-)

exec
/bin/bash -lc "rg -n '"'^#|''^##|''^###|v1[0-9]{2}|Grok|Fable|Claude|Codex|Cursor|Heavy|postmortem|failure|root cause|built|shipped|phase|Orca|control plane'"' docs/exchange/*.md | sed -n '1,1400p'" in /home/potter
 succeeded in 0ms:
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:1:# Demigod Agent Collaboration Protocol — 2026-07-12
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:3:**Purpose:** One clear way for Grok, Fable/Claude, Codex, Cursor, Heavy, and humans to work without thrash.  
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:9:## 1. Roles (rigid)
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:13:| **Heavy (Supergrok)** | Strategy / GTM priority | Chat / heavy scripts | Docs only (strategy) |
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:14:| **Fable / Claude (opus/sonnet)** | Plan, audit, single-next | `bin/df`, `claude --print` | Prefer **read-only**; plans → `/tmp/fable-*.txt` |
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:15:| **Codex** | Code review + careful edits | codex CLI | `demigod-*.mjs`, foot-core **only with lock** |
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:16:| **Cursor** | Precise multi-file when tasked | Editor | Same as Codex; plan-mode first for foot |
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:17:| **Grok** | Execute, verify, CDP, docs, GTM prep | Full local + CDP | Canonical sources + docs; publish prep/auto when authorized |
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:20:**Equal authority note:** User has directed that Fable/Claude plans and Grok execution run autonomously. Still: **one writer** on foot-core; **hash before claiming live**.
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:24:## 2. Shared truth (read order every session)
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:37:## 3. Communication pattern
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:40:Heavy / Fable:  decide WHAT + WHY (plan file)
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:42:Grok / Codex:   implement HOW (one writer)
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:44:Grok:           verify:source + board + loop-state
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:46:Grok:           prepare CDN/custom-code pastes + /tmp/READY*
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:53:### Prompt templates
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:55:**Fable / Claude**
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:57:Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty.
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:62:Output: decision, ranked steps, exact cmds for Grok, anti-list. Prefer no site change.
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:65:**Codex**
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:69:Report pass/fail raw + exact failure. Prefer FIX over architecture change.
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:72:**Grok self-start**
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:77:### Shared drop folder
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:85:## 4. Writer lock (foot-core)
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:87:1. Only one of Grok / Codex / Cursor edits `demigod-foot-core.js` at a time.  
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:97:## 5. Verify gates (non-negotiable)
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:103:# when touching WIZ:
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:105:# when claiming live:
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:107:# foot hash:
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:116:## 6. Conflict resolution
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:120:| Strategy vs polish | Heavy/Fable GTM priority |
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:121:| Plan vs gate failure | Gate (fix first) |
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:128:## 7. What “done enough” means for website
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:141:## 8. Session hygiene
docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md:150:*Agreed synthesis from Fable + Opus + Codex + Grok, 2026-07-12.*
docs/exchange/DEMIGOD-BACKLOG-HUGE.md:1:# Demigod backlog (huge) — living
docs/exchange/DEMIGOD-BACKLOG-HUGE.md:6:## Sprint A (implement under freeze — local only)
docs/exchange/DEMIGOD-BACKLOG-HUGE.md:17:## Sprint B
docs/exchange/DEMIGOD-BACKLOG-HUGE.md:27:## Later / ambitious
docs/exchange/DEMIGOD-BACKLOG-HUGE.md:31:## Do not while freeze ON
docs/exchange/DEMIGOD-AGENT-COCKPIT.md:1:# Agent cockpit & smoke (2026-07-13)
docs/exchange/DEMIGOD-AGENT-COCKPIT.md:5:## What agents wanted (from Codex tools audit + us)
docs/exchange/DEMIGOD-AGENT-COCKPIT.md:17:## Session start (canonical)
docs/exchange/DEMIGOD-AGENT-COCKPIT.md:22:# then do cockpit NEXT only
docs/exchange/DEMIGOD-AGENT-COCKPIT.md:25:## Files
docs/exchange/DEMIGOD-AGENT-COCKPIT.md:33:## Dashboard UI
docs/exchange/DEMIGOD-FABLE-12H-2026-07-13.md:1:Disk foot-core is v180 (line 963), matching your claim. Board-honesty and node checks were permission-denied this session, so gate runs below are Grok's to execute. Ranked plan:
docs/exchange/DEMIGOD-FABLE-12H-2026-07-13.md:29:**6. Mutation-test the gates (1h, if time):** apply the verify-mutation spec (break wizBuild on a copy, assert source+smoke gates FAIL, restore byte-identical). Gates that can't fail are the recurring root cause here.
docs/exchange/DEMIGOD-NEXT-HOUR.md:1:# Next hour — Demigod (live v179)
docs/exchange/DEMIGOD-NEXT-HOUR.md:3:**Confirmed live:** foot `el26dg.js` v179 · published 2026-07-13 00:41 UTC · gates green · metrics 100/100  
docs/exchange/DEMIGOD-NEXT-HOUR.md:5:## Human (only unblock)
docs/exchange/DEMIGOD-NEXT-HOUR.md:13:## Agents (keep busy, no foot thrash)
docs/exchange/DEMIGOD-NEXT-HOUR.md:20:## Stop site work until
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:1:# Demigod Autonomous Build System
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:5:## Roles
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:9:| Planner | Fable (`bin/df review`) | Plans with verify cmds + stop conditions |
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:10:| Executor | Grok / Cursor | Apply plans via `dg-apply` or write tools/pages |
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:11:| Reviewer | Codex Pro + API Codex | Adversarial code review file:line |
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:16:## Safety rails (never skip)
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:24:## Loop (simple forever)
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:27:# 1) health
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:30:# 2) ensure queue
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:34:# 3) process one item
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:37:# 4) agents (when planning next batch)
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:39:# codex exec --full-auto "Review last diff / new pages…"
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:40:# sonnet: copy audit demigod-pages/*.html
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:41:# opus: re-rank queue priorities
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:43:# 5) repeat
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:46:## Queue format (`/tmp/dg-busy/BUILD-QUEUE.jsonl`)
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:54:## Matching product spine
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:61:## Master prompts
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:76:## What autonomy is *not*
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:84:## Live product paths (2026-07-13)
docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md:101:## Product site map4 (2026-07-13)
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:1:# Demigod — Overall Startup Roadmap (living)
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:3:**Updated:** 2026-07-13 · **Site:** foot v183 (shipping) · **Decision:** FIX not rewrite  
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:9:## 1. What we are
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:28:## 2. How we make money
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:43:## 3. Phases
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:45:### Phase 0 — Foundation (done / ongoing)
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:50:- [x] Differentiation copy (v182–v183)
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:54:### Phase 1 — Demand + first pilot (NOW → 30 days)
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:64:- [ ] Site: only P0 bugs + conversion polish (this phase)
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:66:### Phase 2 — Proof + repeatability (30–90 days)
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:74:### Phase 3 — Light talent-eng OS (90 days–6 mo)
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:81:### Phase 4 — Scale judgment (6–12 mo)
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:89:## 4. Website roadmap (parallel, lean)
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:93:| v181 mobile CTA | Live | Gold/dark contrast |
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:94:| v182 diff FAQ + trust | Live | Not board/ATS |
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:95:| **v183 path pills + how-link** | Shipping | I'm hiring / I'm looking; ensureHowLink in run |
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:109:## 5. Ops checklist (this week)
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:111:### Business
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:117:### Product / site
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:118:- [x] v183 build
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:119:- [ ] Publish v183 + confirm live hash
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:123:### Agents
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:130:## 6. Anti-roadmap
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:138:## 7. Success metrics (honest)
docs/exchange/DEMIGOD-STARTUP-ROADMAP.md:152:*Update this file every phase change or major ship.*
docs/exchange/DEMIGOD-DOUGLAS-CALL-PACK-2026-07-13.md:1:# Douglas Call Pack — 2026-07-13 / call 13:30 PT
docs/exchange/DEMIGOD-DOUGLAS-CALL-PACK-2026-07-13.md:7:## 30-min run of show
docs/exchange/DEMIGOD-DOUGLAS-CALL-PACK-2026-07-13.md:10:### Pitch (truthful)
docs/exchange/DEMIGOD-DOUGLAS-CALL-PACK-2026-07-13.md:16:### Never say
docs/exchange/DEMIGOD-DOUGLAS-CALL-PACK-2026-07-13.md:19:### Discovery
docs/exchange/DEMIGOD-DOUGLAS-CALL-PACK-2026-07-13.md:22:### Ask ladder
docs/exchange/DEMIGOD-DOUGLAS-CALL-PACK-2026-07-13.md:28:### Close
docs/exchange/DEMIGOD-DOUGLAS-CALL-PACK-2026-07-13.md:31:### Site for him
docs/exchange/DEMIGOD-DOUGLAS-CALL-PACK-2026-07-13.md:35:### Live product status (for you only)
docs/exchange/DEMIGOD-DOUGLAS-CALL-PACK-2026-07-13.md:36:Foot **v182** · CDN j1jic3.js · board 2 samples real=0 · forms present · payments pending
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:1:# Demigod 14-Day Roadmap + Checklist — 2026-07-12
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:13:## Day 0 (today) — Multi-agent baseline
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:15:- [x] Multi-agent review (Fable, Opus, Codex, Grok)
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:19:- [x] Hash compare: disk **v177** ≠ live CDN **v176** (honesty patch covers feeNote)
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:23:- [x] Optional: decide hold CDN reupload (v176+patch sufficient; v177 = feeNote only)
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:27:## Days 1–3 — Demand + form proof
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:29:### GTM
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:36:### Product trust
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:42:### Stability
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:51:## Days 4–7 — White-glove + proof
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:64:## Days 8–10 — Light engineering hardening (only if GTM not starving)
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:66:- [ ] Boot-smoke deterministic in `demigod-verify-source.mjs` (Codex #1)
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:69:- [ ] Decide CDN: reupload v177 (new catbox URL) **or** keep v176+inline patch through pilot
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:77:## Days 11–14 — Scale what worked / kill what didn’t
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:84:- [ ] Multi-agent re-review (short): Fable one-pager on “continue FIX vs any new info”
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:90:## Permanent anti-checklist (never mark done by doing these)
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:102:## Daily command card
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:110:# optional live:
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:117:## KPI targets (14 days)
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:131:## Ownership defaults
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:135:| DMs / lists / logging | Grok prep + human send (or full auto prep) |
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:136:| Form e2e / CDP | Grok |
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:137:| Foot-core (if required) | Codex or Grok under lock |
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:138:| Plans / audits | Fable |
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:139:| Strategy kill-list | Heavy |
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:140:| Publish | Human default; Grok auto if override active |
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:149:## Update 2026-07-13 (Grok swarm)
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:151:- [x] Live foot **v181** mobile CTA + scrub
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:152:- [x] Live foot **v182** differentiation FAQ/trust/deep-links (CDN `j1jic3.js`)
docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md:153:- [x] Agent health: Fable/Sonnet/Opus/Codex Pro OK (`OPENAI_API_KEY` unset; Codex Pro session works)
docs/exchange/DEMIGOD-AGENT-TOOLS-WISHLIST-BUILT.md:1:# What agents wanted · what we built (2026-07-13)
docs/exchange/DEMIGOD-AGENT-TOOLS-WISHLIST-BUILT.md:3:## Wishlist (Codex tools audit + Grok + Fable/Opus)
docs/exchange/DEMIGOD-AGENT-TOOLS-WISHLIST-BUILT.md:14:## Built
docs/exchange/DEMIGOD-AGENT-TOOLS-WISHLIST-BUILT.md:25:## Not built yet (next tools iteration)
docs/exchange/DEMIGOD-AGENT-TOOLS-WISHLIST-BUILT.md:33:## Agent habit
docs/exchange/DEMIGOD-AGENT-TOOLS-WISHLIST-BUILT.md:37:# do only NEXT.cmd unless human says otherwise
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:1:# Demigod Multi-Agent Review — 2026-07-12
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:4:**Participants:** Grok (orchestrator), Fable (Claude fable), Claude Opus, Codex  
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:12:## 1. Decision: **FIX** (not rewrite, not hybrid rebuild)
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:20:**Unanimous agent consensus:** Fable = FIX · Codex = FIX · Opus = stabilize-then-GTM · Grok = FIX.
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:26:## 2. Evidence snapshot (2026-07-12)
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:28:### Live (www)
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:35:| Foot CDN | `files.catbox.moe/8tjw79.js` → **v176** |
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:36:| Inline honesty | `dg-v177-honesty-patch` in footer (soft 90-day language) |
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:41:### Disk / gates
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:44:| `demigod-foot-core.js` | **v177** · 111653 bytes · sha256 `2a274e8e…4c2622` |
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:45:| Live CDN 8tjw79.js | **v176** · 111554 bytes · sha256 `2f9dd073…d2c89f` |
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:50:| Loop-state | **OK** (v177 matches disk, dm_freeze OFF) |
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:53:### Critical drift
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:54:**Disk foot = v177; live catbox foot = v176.**  
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:55:Footer intentionally ships an **inline v177 honesty patch** (“full-foot reupload pending”). Forms/WIZ behavior may differ slightly until full CDN reupload. Do **not** claim live == v177 until CDN hash matches disk.
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:59:## 3. What each agent contributed
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:61:### Fable (strategy)
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:67:### Codex (technical)
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:72:### Opus (risk audit)
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:80:### Grok (this session)
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:86:## 4. Ideal multi-agent operating model
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:94:| **Fable / Claude** | Plan / audit (prefer read-only) | Strategy, single next, plans → `/tmp/fable-*.txt` |
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:95:| **Codex / Cursor** | One writer at a time | `demigod-foot-core.js` + supporting `demigod-*.mjs` under lock |
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:96:| **Grok** | Execute + verify + tools | Gates, CDP, CDN prep, docs, GTM prep, publish automation when authorized |
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:97:| **Heavy** | Strategy only | Demand/GTM priority, anti-list |
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:109:## 5. Must-do backlog (ranked)
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:111:### P0 — This week (ship demand + truth)
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:115:4. [ ] **CDN truth:** either reupload v177 foot (new catbox hash) + update footer-lite + publish, **or** freeze and document live=v176+patch until pilot justifies ship  
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:118:### P1 — Stabilize engineering (no rewrite)
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:119:6. [ ] Deterministic boot-smoke capture in `demigod-verify-source.mjs` (Codex #1)  
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:125:### P2 — Later (only if conversion data demands)
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:132:### Anti-list (do not do)
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:142:## 6. Architecture keep-list
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:158:## 7. Communication artifacts (shared)
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:172:## 8. Immediate execution plan (Grok continues)
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:175:2. Refresh `DEMIGOD-COMPRESSED-STATE.md` to v177 / live v176 truth  
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:178:5. Prepare CDN reupload package for v177 **without** thrashing WIZ behavior  
docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md:184:*Synthesized 2026-07-12 by Grok from Fable + Opus + Codex + live/disk evidence.*
docs/exchange/DEMIGOD-AFK-WORKLOG-2026-07-13.md:1:# AFK worklog — 2026-07-13
docs/exchange/DEMIGOD-AFK-WORKLOG-2026-07-13.md:5:## Done while AFK started
docs/exchange/DEMIGOD-AFK-WORKLOG-2026-07-13.md:11:- [x] UX swarm (Codex/Fable/Claude) → applied cut-bloat  
docs/exchange/DEMIGOD-AFK-WORKLOG-2026-07-13.md:16:## In flight / next for agents
docs/exchange/DEMIGOD-AFK-WORKLOG-2026-07-13.md:18:1. Apply Codex specs for persisted jobs if solid  
docs/exchange/DEMIGOD-AFK-WORKLOG-2026-07-13.md:19:2. Docs consolidate per Claude plan  
docs/exchange/DEMIGOD-AFK-WORKLOG-2026-07-13.md:24:## URLs
docs/exchange/DEMIGOD-AFK-WORKLOG-2026-07-13.md:30:## Re-entry for human
docs/exchange/DEMIGOD-COPY-PACK-2026-07-13.md:1:# Demigod copy pack — 2026-07-13
docs/exchange/DEMIGOD-COPY-PACK-2026-07-13.md:5:## Voice rules
docs/exchange/DEMIGOD-COPY-PACK-2026-07-13.md:12:## Site (marketing)
docs/exchange/DEMIGOD-COPY-PACK-2026-07-13.md:31:## Dashboard (ops)
docs/exchange/DEMIGOD-COPY-PACK-2026-07-13.md:47:## Do not change
docs/exchange/DEMIGOD-SONNET-LIVE-RISKS-2026-07-13.md:1:**Top 5 product risks — Demigod v179 (el26dg)**
docs/exchange/DEMIGOD-SONNET-LIVE-RISKS-2026-07-13.md:9:4. **wizBuild critical-field logic is deeply nested and history of drift.** 90day-outcome selector/critical-array logic (lines ~277-547) has broken before (dead calls, unreachable `__submit__`, invisible required fields) across multiple prior versions; no automated smoke test currently guards this exact v179 path.
docs/exchange/DEMIGOD-SONNET-LIVE-RISKS-2026-07-13.md:11:5. **Honesty gate is manual, not enforced at write time.** `DEMIGOD-BOARD.json` is currently correctly 2 sample/0 real, but nothing in `foot-core.js` blocks a future writer from flipping `sample:false` — repeated historical failure mode (board corruption #1-3).
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:1:# Demigod Website + Webflow — Exhaustive Troubleshooting
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:4:**Status:** Root blank-page cause identified and fixed in **foot v188** (`3ozk21.js`) + head unhide + footer **v36**.  
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:6:**Do not start from scratch** unless v188 hard-refresh still blanks on real devices after CF cache clear.
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:10:## 0. Executive summary (what “broken / not loading / blank” actually was)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:15:| **Blank black page** (only top nav) | **`document.body { display: none !important }`** set by JS | **v188** `hideCard` must never hide `body` |
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:16:| Infinite hang / freeze | MutationObserver thrash in foot (form style MO, full-doc MO) | **v187** capped/removed thrash MOs |
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:39:## 1. Architecture map (what can break)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:54:**Single points of failure**
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:67:## 2. Symptom → diagnostic decision tree
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:69:### 2.1 Completely unreachable
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:81:### 2.2 HTTP 200 but blank / black
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:121:# extract foot URL from homepage HTML
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:124:# size must be ~100k+ for foot-core; 0 bytes = dead CDN
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:125:head -c 120 /tmp/foot.js   # expect /*dg-foot-v188-core*/
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:135:### 2.3 “Loads then freezes / unresponsive”
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:141:| Full-document MutationObserver + `run()` DOM mutations | pre-v187 | OBS disabled / capped |
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:142:| Form `style` attribute MO calling `setProperty` on same form | pre-v187 | Only re-force if `display===none` |
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:144:| `setInterval(forceFormVisible, 400)` forever | pre-v186 | Removed |
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:146:### 2.4 Product pages broken
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:155:### 2.5 Forms / WIZ not opening
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:158:window.dgFootVersion          // need v188+
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:164:Historical: `nav()` hid **all** `HIRE TALENT` links including hero (fixed v184).  
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:167:### 2.6 Agent / automation says broken, human OK (or reverse)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:186:## 3. Live inventory (2026-07-13 post-mortem measurements)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:188:### 3.1 Before v188 blank fix
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:198:### 3.2 After v188
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:201:dg = v188
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:210:### 3.3 Routes
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:218:| Foot CDN `3ozk21.js` | 200 ~118KB | v188 |
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:223:## 4. Webflow-specific troubleshooting
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:225:### 4.1 Custom Code pipeline
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:242:### 4.2 301 redirects
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:250:### 4.3 Designer vs Custom Code
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:256:### 4.4 Assets / CDN
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:266:### 4.5 Publishing auth (automation)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:277:## 5. Code-level failure catalog (foot / head / footer)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:279:### 5.1 `hideCard` body climb — **P0 blank** (fixed v188)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:282:// BAD (pre-v188): walks to body, body has buttons → hide body
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:297:### 5.2 MutationObserver thrash — **P0 freeze** (fixed v187)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:302:### 5.3 Hero CTA hide — **P1** (fixed v184)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:306:### 5.4 Product `visibility:hidden` flash — **P1 blank** (fixed v36)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:308:`loadProduct` set `documentElement.visibility='hidden'` before async load; failure left page blank.
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:310:### 5.5 Catbox HTML MIME — **P1**
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:314:### 5.6 `/hire` 404 — **P2**
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:320:## 6. Fix verification checklist (do this every ship)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:323:# 1) Source
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:328:# 2) CDN
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:330:curl -sS <FOOT_URL> | head -c 80   # v188 marker
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:333:# 3) Browser (automation Chrome :9223 preferred)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:334:# In page:
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:335:#   getComputedStyle(document.body).display === 'block'
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:336:#   document.querySelector('h1').getBoundingClientRect().height > 20
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:337:#   window.dgFootVersion === 'v188'
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:338:#   click Hire → #startup-modal display flex
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:339:#   /?p=hire → title Hire · Demigod, a.cta present
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:341:# 4) Screenshot both home and ?p=hire (visual mandatory)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:346:## 7. Should we start from scratch?
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:350:| **Continue patch (current)** | Root blank cause known; v188 fixes it; WIZ/product machinery exists | Complexity debt; catbox dependency; no `/hire` pages | **Default — hard refresh + verify v188** |
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:352:| **Full Webflow rebuild** | Clean Designer | Weeks; loses foot/WIZ investment | Only if v188 fails after cache purge on real phones |
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:357:1. Hard refresh on phone + desktop still blanks **with** `dgFootVersion=v188` and `body.display=block`, or  
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:363:## 8. Immediate ops playbook (human or agent)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:366:2. Console: confirm `window.dgFootVersion === 'v188'`.  
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:378:## 9. Multi-agent / tooling notes
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:382:| **Grok (this agent)** | Live CDP, curl multiprobe, foot/head edits, paste publish |
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:383:| **Fable / Claude (`bin/df`)** | Architecture reviews; ask for hideCard/MO audits before big foot edits |
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:384:| **Codex / Cursor** | Precise multi-file patches; Plan mode on foot-core |
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:389:Suggested Fable prompt for next deep audit:
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:392:Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty.
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:393:Audit demigod-foot-core.js v188 for any path that can set body/html/main display:none
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:400:## 10. Version timeline (relevant)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:404:| v183 | Baseline “healthy” claim before thrash rediscovery |
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:405:| v184 | Stop hiding hero CTAs in `nav()` |
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:406:| v186–187 | Kill MO thrash / perpetual intervals |
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:408:| **v188 / footer v36** | **hideCard body blank fix + body display:block force** |
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:412:## 11. Open follow-ups (ordered)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:423:## 12. One-line root cause (for the record)
docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md:427:**Fixed in v188. Hard-refresh the live site.**
docs/exchange/DEMIGOD-AGENT-TOOLING-2026-07-13.md:1:# Agent tooling for Grok — 2026-07-13
docs/exchange/DEMIGOD-AGENT-TOOLING-2026-07-13.md:3:## Session start (always)
docs/exchange/DEMIGOD-AGENT-TOOLING-2026-07-13.md:6:# or
docs/exchange/DEMIGOD-AGENT-TOOLING-2026-07-13.md:11:## Foot lock
docs/exchange/DEMIGOD-AGENT-TOOLING-2026-07-13.md:13:DG_LOCK_OWNER=grok node demigod-foot-lock.mjs claim --why 'v184 polish'
docs/exchange/DEMIGOD-AGENT-TOOLING-2026-07-13.md:14:# edit demigod-foot-core.js
docs/exchange/DEMIGOD-AGENT-TOOLING-2026-07-13.md:16:# or wrap:
docs/exchange/DEMIGOD-AGENT-TOOLING-2026-07-13.md:22:## Ship state
docs/exchange/DEMIGOD-AGENT-TOOLING-2026-07-13.md:26:# snapshot: /tmp/dg-busy/ship-status.json
docs/exchange/DEMIGOD-AGENT-TOOLING-2026-07-13.md:31:## Dashboard
docs/exchange/DEMIGOD-AGENT-TOOLING-2026-07-13.md:35:## Fable
docs/exchange/DEMIGOD-UX-TEST-REPORT-2026-07-12.md:1:# Demigod UX / Test Report — 2026-07-12
docs/exchange/DEMIGOD-UX-TEST-REPORT-2026-07-12.md:3:## Hygiene
docs/exchange/DEMIGOD-UX-TEST-REPORT-2026-07-12.md:9:## Gates (disk)
docs/exchange/DEMIGOD-UX-TEST-REPORT-2026-07-12.md:14:| loop-state | OK (v178) |
docs/exchange/DEMIGOD-UX-TEST-REPORT-2026-07-12.md:18:## Live vs disk
docs/exchange/DEMIGOD-UX-TEST-REPORT-2026-07-12.md:21:| Disk foot | **v178** (hero scannable + mobile gold CTA + navCta HIRE TALENT) |
docs/exchange/DEMIGOD-UX-TEST-REPORT-2026-07-12.md:22:| Live CDN 8tjw79.js | **v176** + footer inline honesty patch |
docs/exchange/DEMIGOD-UX-TEST-REPORT-2026-07-12.md:26:## Form / WIZ findings
docs/exchange/DEMIGOD-UX-TEST-REPORT-2026-07-12.md:33:## Product path
docs/exchange/DEMIGOD-UX-TEST-REPORT-2026-07-12.md:35:2. Optional: CDN reupload v178 when human ready to Publish
docs/exchange/DEMIGOD-UX-TEST-REPORT-2026-07-12.md:38:## How agents stay clean
docs/exchange/DEMIGOD-UX-TEST-REPORT-2026-07-12.md:39:1. Plan (Fable) → one writer (Codex/Grok) → verify gates → hygiene
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:1:# How agents work together better — 2026-07-13
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:3:## Health check (all green as of this session)
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:6:| **Fable** | `bin/df review "..."` or `claude --print --model fable` | Claude Code login | OK |
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:7:| **Sonnet** | `claude --print --model sonnet --add-dir /home/potter "..."` | Claude Code | OK |
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:8:| **Opus** | `claude --print --model opus --add-dir /home/potter "..."` | Claude Code | OK |
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:9:| **Codex (Pro+)** | `codex exec "..."` (ChatGPT session) | Codex CLI 0.144.1 | OK |
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:10:| **Codex API key** | needs `OPENAI_API_KEY` | **missing in env** — Pro path works; API path not required if Pro auth live |
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:11:| **Grok** | this session + CDP | local | OK |
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:13:## Single-writer protocol
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:20:## Handoff shapes
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:21:**Fable → Grok:** plan with exact cmds, max 250 words, anti-list  
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:22:**Sonnet → Grok:** ranked micro-fixes with risk  
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:23:**Opus → Grok:** strategy / roadmap only (no code)  
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:24:**Codex → Grok:** P0 bug list + verify pass/fail  
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:25:**Grok → all:** ship note in compressed state + `/tmp/dg-multi/ship-*.md`
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:27:## Shared folders
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:34:## Prompt prefix (always)
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:36:Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty.
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:41:## Busy without thrash
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:44:- Cap concurrent Claude/Codex to ~2–4  
docs/exchange/DEMIGOD-AGENT-WORK-TOGETHER-2026-07-13.md:49:## Research pack
docs/exchange/DEMIGOD-SETTLEMENT-EXECUTED-2026-07-13.md:1:# Settlement executed — 2026-07-13
docs/exchange/DEMIGOD-SETTLEMENT-EXECUTED-2026-07-13.md:3:## Landed
docs/exchange/DEMIGOD-SETTLEMENT-EXECUTED-2026-07-13.md:13:## Codex P0s fixed
docs/exchange/DEMIGOD-SETTLEMENT-EXECUTED-2026-07-13.md:21:## Human unblock (only you)
docs/exchange/DEMIGOD-SETTLEMENT-EXECUTED-2026-07-13.md:26:## Agent session
docs/exchange/DEMIGOD-MULTI-AGENT-RESEARCH-APPLIED-2026-07-13.md:9:| Orchestrator-worker | Anthropic multi-agent research | Grok orchestrates: decomposes, dispatches, verifies, publishes. Fable/Codex/Sonnet are narrow-brief workers, not free-roaming agents. |
docs/exchange/DEMIGOD-MULTI-AGENT-RESEARCH-APPLIED-2026-07-13.md:10:| Sequential handoff | Azure agent patterns | Fable (plan) → Grok/Codex (build) → Codex (review) → Grok (verify+ship). Each stage reads only the prior stage's artifact file, not live chat context. |
docs/exchange/DEMIGOD-MULTI-AGENT-RESEARCH-APPLIED-2026-07-13.md:11:| Concurrent, non-overlapping | Azure | Sonnet copy/audit and Codex code review run in parallel — different files, read-only, no lock needed. |
docs/exchange/DEMIGOD-MULTI-AGENT-RESEARCH-APPLIED-2026-07-13.md:13:| Single writer | already in base protocol | Unchanged: one of {Grok, Codex} holds the foot-core lock. Fable and Sonnet never write code, only `/tmp/` or `docs/exchange/` files. |
docs/exchange/DEMIGOD-MULTI-AGENT-RESEARCH-APPLIED-2026-07-13.md:16:- **Fable** — plan only. Reads compressed-state + latest review, never touches code. Outputs ranked steps + exact commands.
docs/exchange/DEMIGOD-MULTI-AGENT-RESEARCH-APPLIED-2026-07-13.md:17:- **Grok** — orchestrator + executor. Owns dispatch, writer lock, gates, CDN/publish. Only agent that can call something "done."
docs/exchange/DEMIGOD-MULTI-AGENT-RESEARCH-APPLIED-2026-07-13.md:18:- **Codex** — code review + guarded edits. Reviews Grok's diffs before ship; edits only under an active lock claim.
docs/exchange/DEMIGOD-MULTI-AGENT-RESEARCH-APPLIED-2026-07-13.md:22:1. Mon: Fable sets the week's single next-priority (demand vs. site).
docs/exchange/DEMIGOD-MULTI-AGENT-RESEARCH-APPLIED-2026-07-13.md:23:2. Daily: Grok executes ≤1 P0 change; gates after every edit; no thrash while gates are green.
docs/exchange/DEMIGOD-MULTI-AGENT-RESEARCH-APPLIED-2026-07-13.md:24:3. Wed/Fri: Sonnet audits live copy; Codex reviews the week's diffs.
docs/exchange/DEMIGOD-COMPETITOR-UX-INSPIRATION-2026-07-12.md:1:# Competitor + UX Inspiration — 2026-07-12
docs/exchange/DEMIGOD-COMPETITOR-UX-INSPIRATION-2026-07-12.md:10:## 1. Competitive map
docs/exchange/DEMIGOD-COMPETITOR-UX-INSPIRATION-2026-07-12.md:20:### Positioning (keep / sharpen in DMs, not fake site claims)
docs/exchange/DEMIGOD-COMPETITOR-UX-INSPIRATION-2026-07-12.md:30:## 2. What Wellfound does well (steal *after* pilot, carefully)
docs/exchange/DEMIGOD-COMPETITOR-UX-INSPIRATION-2026-07-12.md:38:## 3. Conversion tactics to adopt (priority)
docs/exchange/DEMIGOD-COMPETITOR-UX-INSPIRATION-2026-07-12.md:53:## 4. Demigod live UX snapshot (static HTML)
docs/exchange/DEMIGOD-COMPETITOR-UX-INSPIRATION-2026-07-12.md:65:## 5. Feature backlog inspired by competitors (post-pilot only)
docs/exchange/DEMIGOD-COMPETITOR-UX-INSPIRATION-2026-07-12.md:73:### Anti-list (pre-PMF)
docs/exchange/DEMIGOD-COMPETITOR-UX-INSPIRATION-2026-07-12.md:82:## 6. UI micro-improvements (safe, optional, ranked)
docs/exchange/DEMIGOD-COMPETITOR-UX-INSPIRATION-2026-07-12.md:96:## 7. GTM plays this week (from research + status)
docs/exchange/DEMIGOD-COMPETITOR-UX-INSPIRATION-2026-07-12.md:106:*Grok research pass 2026-07-12 · feed multi-agent confirmations into exchange as they land.*
docs/exchange/DEMIGOD-DASHBOARD-V2-2026-07-13.md:1:# Dashboard v2 + tools synthesis (2026-07-13)
docs/exchange/DEMIGOD-DASHBOARD-V2-2026-07-13.md:3:## Swarm
docs/exchange/DEMIGOD-DASHBOARD-V2-2026-07-13.md:4:- **Claude (sonnet) MVP**: evidence ages, tools tab, async jobs, never-stuck loading, tabs, keyboard r/s/c, toasts, dark gold polish — **implemented**
docs/exchange/DEMIGOD-DASHBOARD-V2-2026-07-13.md:5:- **Fable/df**: drifted to site-green (not useful for dash plan)
docs/exchange/DEMIGOD-DASHBOARD-V2-2026-07-13.md:6:- **Codex x2**: still empty stdout (err logs only) — did not block ship
docs/exchange/DEMIGOD-DASHBOARD-V2-2026-07-13.md:8:## Shipped
docs/exchange/DEMIGOD-DASHBOARD-V2-2026-07-13.md:16:## Acceptance
docs/exchange/DEMIGOD-DASHBOARD-V2-2026-07-13.md:22:## URL
docs/exchange/DEMIGOD-AGENT-SWARM-STATUS-2026-07-13.md:1:# Agent swarm status — 2026-07-13
docs/exchange/DEMIGOD-AGENT-SWARM-STATUS-2026-07-13.md:3:## Live product
docs/exchange/DEMIGOD-AGENT-SWARM-STATUS-2026-07-13.md:4:- Foot **v179** · CDN `el26dg.js` · Published 00:41 UTC
docs/exchange/DEMIGOD-AGENT-SWARM-STATUS-2026-07-13.md:8:## Swarm rule
docs/exchange/DEMIGOD-AGENT-SWARM-STATUS-2026-07-13.md:9:When site is green, keep **≥2** of Fable / Opus / Sonnet / Codex on **GTM + docs** (not foot thrash).  
docs/exchange/DEMIGOD-AGENT-SWARM-STATUS-2026-07-13.md:13:## Recent contributions
docs/exchange/DEMIGOD-AGENT-SWARM-STATUS-2026-07-13.md:16:| Fable | Top3 DMs now; 48h plan in DEMIGOD-FABLE-POST-PUBLISH-48H.md |
docs/exchange/DEMIGOD-AGENT-SWARM-STATUS-2026-07-13.md:18:| Codex | gtm-status Top3 paths + mark-sent one-liners |
docs/exchange/DEMIGOD-AGENT-SWARM-STATUS-2026-07-13.md:19:| Grok | Live publish, hygiene tool, EXECUTE-NOW pack, swarm-busy |
docs/exchange/DEMIGOD-AGENT-SWARM-STATUS-2026-07-13.md:21:## Human unblock
docs/exchange/DEMIGOD-USER-TEST-HARNESS-2026-07-13.md:1:# Demigod user-test harness — 2026-07-13
docs/exchange/DEMIGOD-USER-TEST-HARNESS-2026-07-13.md:3:## Why
docs/exchange/DEMIGOD-USER-TEST-HARNESS-2026-07-13.md:6:## How to run
docs/exchange/DEMIGOD-USER-TEST-HARNESS-2026-07-13.md:23:Exit **0** only if no critical/high failures. `--strict` also fails on medium.
docs/exchange/DEMIGOD-USER-TEST-HARNESS-2026-07-13.md:25:## Suites
docs/exchange/DEMIGOD-USER-TEST-HARNESS-2026-07-13.md:35:## Refine history
docs/exchange/DEMIGOD-USER-TEST-HARNESS-2026-07-13.md:41:## Known product notes (not harness bugs)
docs/exchange/DEMIGOD-USER-TEST-HARNESS-2026-07-13.md:47:## Agent habit
docs/exchange/DEMIGOD-USER-TEST-HARNESS-2026-07-13.md:51:# before claiming ship:
docs/exchange/DEMIGOD-MULTI-AGENT-CONSENSUS-2026-07-13.md:1:# Multi-agent consensus — 2026-07-13 (v182 live)
docs/exchange/DEMIGOD-MULTI-AGENT-CONSENSUS-2026-07-13.md:3:## Agent health
docs/exchange/DEMIGOD-MULTI-AGENT-CONSENSUS-2026-07-13.md:6:| Fable | OK | `bin/df` / `claude --print --model fable` via **stdin** |
docs/exchange/DEMIGOD-MULTI-AGENT-CONSENSUS-2026-07-13.md:9:| Codex Pro | OK | CLI 0.144.1 ChatGPT session |
docs/exchange/DEMIGOD-MULTI-AGENT-CONSENSUS-2026-07-13.md:10:| Codex API key | missing `OPENAI_API_KEY` | Pro path is enough for now |
docs/exchange/DEMIGOD-MULTI-AGENT-CONSENSUS-2026-07-13.md:11:| Grok | OK | execute + publish + loop |
docs/exchange/DEMIGOD-MULTI-AGENT-CONSENSUS-2026-07-13.md:13:## Consensus
docs/exchange/DEMIGOD-MULTI-AGENT-CONSENSUS-2026-07-13.md:16:3. **v181 mobile CTA + v182 FAQ/trust/deep-links** shipped live (`j1jic3.js`)  
docs/exchange/DEMIGOD-MULTI-AGENT-CONSENSUS-2026-07-13.md:17:4. **Codex:** no remaining foot P0s in reviewed paths  
docs/exchange/DEMIGOD-MULTI-AGENT-CONSENSUS-2026-07-13.md:19:6. **Fable next:** Top3 DMs (human), form e2e when CDP calm, white-glove pilot  
docs/exchange/DEMIGOD-MULTI-AGENT-CONSENSUS-2026-07-13.md:22:## Shared docs updated
docs/exchange/DEMIGOD-MULTI-AGENT-CONSENSUS-2026-07-13.md:31:## Drop folder
docs/exchange/DEMIGOD-COMPETITOR-DIFF-2026-07-13.md:1:# Competitor scan + differentiation — 2026-07-13
docs/exchange/DEMIGOD-COMPETITOR-DIFF-2026-07-13.md:5:## Map
docs/exchange/DEMIGOD-COMPETITOR-DIFF-2026-07-13.md:15:## Differentiator (keep sharp)
docs/exchange/DEMIGOD-COMPETITOR-DIFF-2026-07-13.md:18:## UX inspiration adopted (v182, minimal)
docs/exchange/DEMIGOD-COMPETITOR-DIFF-2026-07-13.md:24:## Experimental backlog (do later, only if demand)
docs/exchange/DEMIGOD-SESSION-START-2026-07-13.md:1:# Demigod session start — 2026-07-13
docs/exchange/DEMIGOD-SESSION-START-2026-07-13.md:3:## Live status
docs/exchange/DEMIGOD-SESSION-START-2026-07-13.md:5:- **Live foot v180**: `https://files.catbox.moe/v5giq8.js` (published ~00:59 UTC).
docs/exchange/DEMIGOD-SESSION-START-2026-07-13.md:9:## GTM Top 3
docs/exchange/DEMIGOD-SESSION-START-2026-07-13.md:17:## Douglas tomorrow
docs/exchange/DEMIGOD-SESSION-START-2026-07-13.md:23:## Agent swarm
docs/exchange/DEMIGOD-SESSION-START-2026-07-13.md:26:- Keep at least two of Fable / Opus / Sonnet / Codex productive on outreach, Douglas support, reply checks, and handoffs.
docs/exchange/DEMIGOD-SESSION-START-2026-07-13.md:29:## Immediate order
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:1:# Demigod tools · roadmap, docs habits, Webflow — 2026-07-13
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:3:Living notes while founder AFK. Agents (Grok / Codex / Fable) should extend, not thrash foot-core while freeze ON.
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:5:## Shipped this session (v4 ops)
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:14:| Swarm UX | Codex + Fable + Claude plans applied (cut bloat, human glance) |
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:16:## What agents want most (consensus)
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:23:6. **Typed next/jobs schemas** (Codex)  
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:24:7. **Human Simple mode sacred** (Fable)
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:26:## How to document work better
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:28:### Daily / session (agents)
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:31:# Start
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:35:# End — always
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:41:### Artifacts (single places)
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:53:### Rules of thumb
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:58:- Never claim live ship without cockpit `shipped` + hash match.  
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:61:### Human re-entry checklist
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:70:## Demigod / trydemigod.com product ideas (non-GTM spam)
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:72:### Product clarity (site)
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:80:### Matching ops (behind site)
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:86:### Tools that would unlock product
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:97:## Webflow — use effectively
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:99:### Do
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:109:### Don’t
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:116:### Effective workflow
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:123:### Webflow strengths to lean on
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:130:### Weaknesses to work around
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:138:## Experiments queue (AFK agents)
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:150:## Session start (agents)
docs/exchange/DEMIGOD-TOOLS-ROADMAP-AND-BRAINSTORM-2026-07-13.md:155:# only NEXT.cmd unless human handoff says otherwise
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:1:# Demigod Multi-Agent Exhaustive Prompt Pack
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:3:**Disk foot:** v191 · sha256 `a54ed85481d619c023460129b8b410dfbf3ed2a135b0bc1191751332f3799ada` · 119007 bytes  
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:4:**Live (pre-ship):** still CDN f5r4yt.js v190 until freeze lifts + publish  
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:5:**Publish freeze:** ON (v190 ship) — disk v191 ready, not live yet  
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:9:## 0. What we asked and who answered
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:13:| **Fable** | `bin/df review` | `/tmp/dg-busy/prompt-pack/fable-reply.md` | Partial — answered truth-CDN false-P0 (product map steals first catbox match); full A–D prompt pack weak |
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:14:| **Codex EXEC** | `codex exec` | `/tmp/dg-busy/prompt-pack/codex-exec-pack.md` | **Full pack** — 7 self + 4 review + 8 Grok prompts + matrix + smells + forms checklist |
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:15:| **Codex REVIEW** | `codex exec review` | `/tmp/dg-busy/prompt-pack/codex-review-pack.md` | **Ranked P1s** + self/Grok fix prompts |
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:16:| **Claude Sonnet** | `claude --print --model sonnet` | `/tmp/dg-busy/prompt-pack/claude-sonnet-pack.md` | Forms pixel-spec + design gaps + 7 self + 8 Grok |
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:17:| **Claude Opus (Heavy-grade)** | `claude --print --model opus` | `/tmp/dg-busy/prompt-pack/claude-opus-heavy-pack.md` | Strategy S1–S5 + Fable/Codex/Grok prompts + surface matrix + success defs |
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:18:| **SuperGrok Heavy (browser)** | demigod-heavy-* CDP | — | **No grok.com tab on CDP** — Opus pack substituted as Heavy-grade strategy |
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:19:| **Grok (this session)** | apply + verify | this file + foot v191 | Applied top Codex P1s |
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:35:## 1. Ranked consensus findings (all agents)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:37:### P1 (forms / ship-blocking) — *applied on disk as v191*
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:38:1. **Submit confirmation broken** (Codex): `form.closest('.w-form')` returns the form itself because `forms()` adds `.w-form` to `<form>` → sibling `.w-form-done`/`.w-form-fail` never seen → always timeout “Could not confirm submit”.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:39:2. **Force-show done box** (Codex): `showStep` forced `.w-form-done` to `display:block` → can fake success if wrapper lookup ever works.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:40:3. **How link → catbox HTML** (Codex): MIME `text/plain` risk; must use `/?p=how`.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:41:4. **Resume step clobber** (Codex): `showStep(resume)` at 20ms then `showStep(0)` at 50ms.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:43:### P1 (not yet fixed — next sessions)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:44:5. **Product `document.write` race** (Codex) — `demigod-footer-lite.html` dynamic script loaders.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:45:6. **One-question WIZ ownership** (Codex/Sonnet) — multiple force-visible passes fight each other; welcome can leak fields.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:46:7. **WIZ reopen rebuilds chrome** (Codex) — `show()` clears flags and re-`forms()`/`wizBuild()`.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:47:8. **Checkbox validation** (Codex) — `sf-bay` checks `.value` not `.checked`.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:48:9. **Truth CDN false drift** (Fable) — first catbox `.js` in HTML is product map — *fixed in demigod-truth.mjs*.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:49:10. **footer:boot-smoke nondeterministic** (Codex) — aggregate gate sometimes empty stdout while direct smoke passes.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:51:### P2 elegance / health
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:55:- 117KB single IIFE still large after v190 cuts (Codex)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:56:- Dead `schedule()`/`timer` after MO removal (Codex)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:57:- Manifest missing sha256 (Fable/Codex)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:61:## 2. PROMPTS FOR FABLE (self) — run via `bin/df review "..."` or `bin/df cursor "..."`
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:63:### F1 — Forms contract authority
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:66:Author the canonical WIZ forms contract for startup + engineer against demigod-foot-core.js v191.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:69:Save /tmp/fable-forms-spec.txt with @file diffs Cursor can apply.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:73:### F2 — Elegance rubric + remediation
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:75:Demigod. Audit live + disk head/foot v191 against elegance: ≤2 type families, 8pt spacing, one gold token, CLS≈0, no FOUC, 5s squint 375+1440, zero dups/lorem.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:79:### F3 — Gate hardening (mutation suite)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:86:### F4 — One-question WIZ ownership plan
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:91:### F5 — Product route architecture
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:96:### F6 — Board honesty + CDN identity
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:103:## 3. PROMPTS FOR CODEX EXEC (self)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:105:### CX-E1 — Forms state machine proof (read-only first)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:110:### CX-E2 — Apply Fable forms plan under lock
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:115:### CX-E3 — Product loader non-destructive
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:120:### CX-E4 — Checkbox/url/file validity
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:125:### CX-E5 — Idempotent show()
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:132:## 4. PROMPTS FOR CODEX REVIEW (self)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:134:### CX-R1 — Adversarial submit path
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:139:### CX-R2 — Shell hide safety
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:144:### CX-R3 — Elegance scorecard
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:149:### CX-R4 — Diff gate for any foot change
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:156:## 5. PROMPTS FOR SUPERGROK HEAVY / OPUS (strategy)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:158:### H1 — Truth table every session
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:163:### H2 — Elegance operational definition
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:165:Elegant = testable: ≤2 type families, 4–6 type scale, 8pt grid, one accent, reduced-motion, CLS≈0, 5s squint 375+1440, zero orphan/dup. Checklist Codex can score.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:168:### H3 — Forms-perfection authority
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:173:### H4 — Publish honesty
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:178:### H5 — Anti-churn
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:180:One writer holds dg-lock; md5 snapshot before apply; abort if md5 changed mid-plan. Heavy arbitrates conflicts.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:185:## 6. PROMPTS FOR GROK (executor) — ordered, do next
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:187:### G1 — DONE (this session): submit + how + resume + truth CDN match
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:188:Disk v191. Verify:source PASS, smoke PASS, board OK. Freeze still ON → live remains v190 until unfreeze+CDN+publish.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:190:### G2 — Fixture test for waitPost success/fail
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:195:Stop: when red on pre-v191 code path and green on v191.
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:198:### G3 — Hide #dg-bar when WIZ open
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:205:### G4 — Product loader deterministic fallback
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:211:### G5 — One-question ownership (after F4 plan)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:217:### G6 — CDN ship v191 when freeze lifted
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:222:### G7 — Board CDN byte match + sha256 in DEMIGOD-FOOT-CDN.json
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:224:### G8 — Reconcile DEMIGOD-COMPRESSED-STATE + loop-state to v191 (post-live)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:228:## 7. FORMS PERFECT checklist (merged Sonnet + Codex)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:230:### Startup steps (order)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:233:### Engineer steps
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:236:### Pass criteria
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:250:## 8. EVERY-SURFACE DETAIL CHECKLIST
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:252:| Surface | Disk v191 | Live (freeze) | Next |
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:254:| Body display | forceMainVisible + head + footer guard | v190 OK | Keep |
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:266:| Freeze | ON | no live ship | human/Grok unfreeze |
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:270:## 9. DO NOT TOUCH (stability)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:283:## 10. Applied this session (v191)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:290:6. Gates: `node --check` OK · foot-smoke pass v191 · demigod:verify:source **PASS** · board honesty OK
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:292:**Not shipped to CDN/Webflow** (publish freeze ON).
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:296:## 11. How to re-run agents (copy-paste)
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:299:# Fable
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:302:# Codex both
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:306:# Claude
docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md:310:# Heavy (needs grok.com SuperGrok tab on CDP :9223)
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:1:# Demigod tools — keep vs archive
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:3:**Updated:** 2026-07-13 · after v193 dual-CTA ship  
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:9:## 1. Daily / session start (KEEP — use these)
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:23:| **Fable** | `bin/df review "…"` | Plans with fresh disk truth |
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:31:## 2. Ship path (KEEP — when changing live site)
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:57:## 3. Forms / QA (KEEP when polishing)
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:70:## 4. Multi-agent (KEEP)
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:74:| `bin/df` | Fable with injected disk truth |
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:75:| Codex CLI | `codex exec` / `codex exec review` |
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:76:| Claude CLI | `claude --print --model sonnet\|opus` |
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:82:**Heavy scripts** (`demigod-heavy-*.mjs`, ~31): keep **files**, run only if SuperGrok tab is open on CDP. Not required for daily ship.
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:86:## 5. GTM / pilot (KEEP when demand work)
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:99:## 6. Ops matching (KEEP stubs; light use)
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:108:## 7. ARCHIVE / cold (do not start sessions here)
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:125:## 8. Dashboard — how to use it
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:145:## 9. npm scripts — which aliases matter
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:163:## 10. Session checklist (agents)
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:166:# 1) brief
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:168:# or: cat /tmp/dg-busy/AGENT-BRIEF.md
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:170:# 2) facts
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:175:# 3) work (one foot writer)
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:176:# … edit demigod-foot-core.js …
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:178:# 4) gates
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:183:# 5) ship only if freeze off + intentional
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:184:# 6) handoff
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:190:## 11. Inventory snapshot (2026-07-13)
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:201:| Heavy | 31 | **COLD** unless Grok tab |
docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md:209:## 12. Do not
docs/exchange/DEMIGOD-LIVING-ROADMAP.md:1:# Demigod Living Roadmap — continuously updated
docs/exchange/DEMIGOD-LIVING-ROADMAP.md:7:**Updated:** 2026-07-13 (v183 shipping)
docs/exchange/DEMIGOD-LIVING-ROADMAP.md:9:## North star
docs/exchange/DEMIGOD-LIVING-ROADMAP.md:12:## Differentiation
docs/exchange/DEMIGOD-LIVING-ROADMAP.md:15:## Now
docs/exchange/DEMIGOD-LIVING-ROADMAP.md:16:- [x] v181–v182 live
docs/exchange/DEMIGOD-LIVING-ROADMAP.md:18:- [ ] **v183 publish** (path pills I'm hiring / I'm looking, how-link in run, badge)
docs/exchange/DEMIGOD-LIVING-ROADMAP.md:23:## Website track (build)
docs/exchange/DEMIGOD-LIVING-ROADMAP.md:26:| v183 path pills + how-link | P0 ship now |
docs/exchange/DEMIGOD-LIVING-ROADMAP.md:31:## Business track
docs/exchange/DEMIGOD-LIVING-ROADMAP.md:39:## Anti
docs/exchange/DEMIGOD-TALENT-ENG-SHIP-2026-07-10.md:1:# Talent Engineering Research + Site Ship — 2026-07-10
docs/exchange/DEMIGOD-TALENT-ENG-SHIP-2026-07-10.md:3:**Agents:** Grok (research/build/publish) · Claude Sonnet (review authority)  
docs/exchange/DEMIGOD-TALENT-ENG-SHIP-2026-07-10.md:6:## Research (cited)
docs/exchange/DEMIGOD-TALENT-ENG-SHIP-2026-07-10.md:16:## Positioning (approved thesis)
docs/exchange/DEMIGOD-TALENT-ENG-SHIP-2026-07-10.md:20:## Shipped
docs/exchange/DEMIGOD-TALENT-ENG-SHIP-2026-07-10.md:24:| foot **v176** live | CDN `8tjw79.js` — mutual-yes FAQ, 15–25% honesty, judgment trust copy, privacy de-hype |
docs/exchange/DEMIGOD-TALENT-ENG-SHIP-2026-07-10.md:25:| foot **v177** disk | Softens 90-day guarantee until payments + placement (Claude flag) — catbox reupload returning 0-byte; retry later |
docs/exchange/DEMIGOD-TALENT-ENG-SHIP-2026-07-10.md:28:| Gates | source PASS, smoke 177 disk, board OK, loop-state v177, metrics 115/100 live v176 |
docs/exchange/DEMIGOD-TALENT-ENG-SHIP-2026-07-10.md:30:## Claude review (Sonnet)
docs/exchange/DEMIGOD-TALENT-ENG-SHIP-2026-07-10.md:32:- Approve v176 honesty overall.
docs/exchange/DEMIGOD-TALENT-ENG-SHIP-2026-07-10.md:33:- Flag: hard “90-day replacement guarantee” before real placements/payments → fixed on disk as v177.
docs/exchange/DEMIGOD-TALENT-ENG-SHIP-2026-07-10.md:36:## Human next
docs/exchange/DEMIGOD-TALENT-ENG-SHIP-2026-07-10.md:40:3. Agent: retry catbox for v177 when healthy; do not invent pilots
docs/exchange/DEMIGOD-SCOPE-NOW.md:1:# Demigod SCOPE — what NOT to build (now)
docs/exchange/DEMIGOD-SCOPE-NOW.md:3:**Phase:** GTM + pre-services honesty · Live foot **v183** green  
docs/exchange/DEMIGOD-SCOPE-NOW.md:5:**Owner:** Opus/strategy · enforced by Grok/Fable
docs/exchange/DEMIGOD-SCOPE-NOW.md:7:## In scope (do these)
docs/exchange/DEMIGOD-SCOPE-NOW.md:14:## Explicitly OUT of scope (kill list)
docs/exchange/DEMIGOD-SCOPE-NOW.md:25:## Agent rules
docs/exchange/DEMIGOD-SCOPE-NOW.md:31:## Reopen triggers
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:1:# Session note — 2026-07-12 Multi-agent Demigod review + build
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:3:## Directive
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:6:## Decision
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:7:**FIX** (unanimous Fable + Codex + Opus + Grok). Not rewrite.
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:9:## Artifacts created
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:17:| `DEMIGOD-COMPRESSED-STATE.md` | Refreshed SSOT (v177 disk / v176 live) |
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:18:| `/tmp/dg-multi/*` | Raw Fable / Opus / Codex reviews |
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:20:## Code change this session
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:21:- `demigod-verify-source.mjs` — hardened boot-smoke JSON capture + one retry (Codex flake fix)
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:24:## Live truth
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:26:- Foot CDN 8tjw79.js = **v176**; disk = **v177** (feeNote honesty only; inline patch covers live)
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:30:## GTM truth (highest leverage)
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:35:## CDP note
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:38:## Next agent turn
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:40:2. Human/Grok day-of: Douglas call pack
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:42:4. Optional CDN v177 reupload only after demand motion — not blocking
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:45:## Collab model (short)
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:46:Fable plans → Grok/Codex one-writer execute → verify gates → human DMs/publish → update compressed state.
docs/exchange/DEMIGOD-SESSION-2026-07-12-MULTI-AGENT.md:48:## Hygiene (2026-07-12 evening)
docs/exchange/DEMIGOD-GTM-NEXT-BATCH-2026-07-12.md:1:# GTM Next Batch — 2026-07-12
docs/exchange/DEMIGOD-GTM-NEXT-BATCH-2026-07-12.md:4:**Live site metrics:** score **115/100** fails=0 (foot CDN v176; disk v177 honesty patched live).
docs/exchange/DEMIGOD-GTM-NEXT-BATCH-2026-07-12.md:6:## Priority order (do these, not more website)
docs/exchange/DEMIGOD-GTM-NEXT-BATCH-2026-07-12.md:8:### 1. Douglas Green call — **Tue 2026-07-14 13:30 PT** (highest leverage)
docs/exchange/DEMIGOD-GTM-NEXT-BATCH-2026-07-12.md:14:### 2. Top 3 founder DMs (human send)
docs/exchange/DEMIGOD-GTM-NEXT-BATCH-2026-07-12.md:22:### 3. After any reply / brief
docs/exchange/DEMIGOD-GTM-NEXT-BATCH-2026-07-12.md:27:## Volume snapshot
docs/exchange/DEMIGOD-GTM-NEXT-BATCH-2026-07-12.md:36:## Copy constraints
docs/exchange/DEMIGOD-GTM-NEXT-BATCH-2026-07-12.md:42:## Agent policy while site green
docs/exchange/DEMIGOD-GTM-NEXT-BATCH-2026-07-12.md:45:- Optional v177 CDN reupload is cleanup, not blocking
docs/exchange/DEMIGOD-GTM-NEXT-BATCH-2026-07-12.md:47:## Links
docs/exchange/DEMIGOD-GTM-NEXT-BATCH-2026-07-12.md:54:## Positioning line (use in DMs / Douglas)
docs/exchange/DEMIGOD-SWARM-BACKLOG-SPRINT-A-2026-07-13.md:1:# Swarm backlog + Sprint A execution — 2026-07-13
docs/exchange/DEMIGOD-SWARM-BACKLOG-SPRINT-A-2026-07-13.md:3:## Agents
docs/exchange/DEMIGOD-SWARM-BACKLOG-SPRINT-A-2026-07-13.md:6:| Codex UX | Product sprint A/B | Delivered (`/tmp/dg-busy/swarm/backlog-codex-ux.md`) |
docs/exchange/DEMIGOD-SWARM-BACKLOG-SPRINT-A-2026-07-13.md:7:| Codex tech | Control-plane | Slow/empty this run |
docs/exchange/DEMIGOD-SWARM-BACKLOG-SPRINT-A-2026-07-13.md:8:| Fable | Strategy cut | Slow/empty this run |
docs/exchange/DEMIGOD-SWARM-BACKLOG-SPRINT-A-2026-07-13.md:9:| Claude impl | File list | Slow/empty this run |
docs/exchange/DEMIGOD-SWARM-BACKLOG-SPRINT-A-2026-07-13.md:10:| Grok | Execute Sprint A | **Done** |
docs/exchange/DEMIGOD-SWARM-BACKLOG-SPRINT-A-2026-07-13.md:12:## Codex UX Sprint A (aligned + shipped)
docs/exchange/DEMIGOD-SWARM-BACKLOG-SPRINT-A-2026-07-13.md:21:## DO NOT (Codex + standing rules) while freeze ON
docs/exchange/DEMIGOD-SWARM-BACKLOG-SPRINT-A-2026-07-13.md:25:## How to use
docs/exchange/DEMIGOD-SWARM-BACKLOG-SPRINT-A-2026-07-13.md:30:# UI: Roadmap tab (Simple mode)
docs/exchange/DEMIGOD-SWARM-BACKLOG-SPRINT-A-2026-07-13.md:34:## Sprint B (next when swarm/human agrees)
docs/exchange/DEMIGOD-FABLE-POST-PUBLISH-48H.md:3:## Ranked next-48h actions
docs/exchange/DEMIGOD-FABLE-POST-PUBLISH-48H.md:9:Fix: proposeIntro writes only to a proposals log (new file, not board); board writes happen solely via the gated ingest path. Then `npm run demigod:verify:source && node demigod-board-honesty-gate.mjs` (or your board-honesty npm alias). Grok applies; smoke-pass before anything else.
docs/exchange/DEMIGOD-FABLE-POST-PUBLISH-48H.md:16:**3. Douglas call prep (before the call, ~30 min).** One page: what's live (v179, how-it-works i61ega.html), honest board state (N seeds, 0 real), the white-glove offer, and one concrete ask (intro or pilot commit). No delivery-time promises. Log outcome immediately after via pilot logger **only after item 1 is fixed** — otherwise log to a text note, not the board.
docs/exchange/DEMIGOD-FABLE-POST-PUBLISH-48H.md:18:**4. Live smoke on v179.** Confirm foot ver + no console errors + WIZ submits:
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:1:# Demigod publish + load postmortem (2026-07-09)
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:3:**Audience:** Grok, Fable/Claude, Cursor, human.  
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:7:## User symptoms
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:11:3. Agents/Claude “working for days” with little live proof.
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:13:## Root causes (ranked)
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:15:### P0 — Main-thread freeze (endless loading)
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:28:### P0 — Publish updates staging only
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:34:### P1 — Blank hero (historical)
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:38:### P1 — Agent process gap
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:40:Disk gates green (`verify:source`, board honest, foot v150 on CDN) **≠** live custom code. CDP paste automation is flaky (CM6 virtualizes readback, puppeteer `Network.enable` timeouts, `keyboard.type` mangler). Prefer single verified paste + production curl.
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:42:### P2 — Design CSS side effects
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:46:### P2 — Foot observers
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:50:## Confirmation commands (always)
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:53:# Production bake time
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:56:# Must be ≥1 after v5 ship; MO must be 0 in <head>
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:61:# Staging vs prod same Last Published
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:65:## Human publish checklist (2 minutes)
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:77:## Session context dump for Fable
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:79:Full Grok dump: `/tmp/demigod-fable-full-context-20260709-0707.txt`  
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:82:## What is healthy (do not thrash)
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:86:| `demigod-foot-core.js` v150 | Canonical; CDN `xngres.js` |
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:91:## After load is green
docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md:95:## Confirmed fixed + UI follow-on (2026-07-09)
docs/exchange/DEMIGOD-CDN-V179-READY.md:1:# Foot CDN v179 READY — 2026-07-12
docs/exchange/DEMIGOD-CDN-V179-READY.md:3:## Uploaded
docs/exchange/DEMIGOD-CDN-V179-READY.md:5:- **Version:** v179  
docs/exchange/DEMIGOD-CDN-V179-READY.md:9:## Not live yet
docs/exchange/DEMIGOD-CDN-V179-READY.md:10:www still loads `8tjw79.js` (v176) until Webflow **Custom Code footer paste + Publish**.
docs/exchange/DEMIGOD-CDN-V179-READY.md:12:## Paste pack
docs/exchange/DEMIGOD-CDN-V179-READY.md:18:## Includes
docs/exchange/DEMIGOD-CDN-V179-READY.md:25:## After publish
docs/exchange/DEMIGOD-OPENAI-CODEX-RESEARCH-2026-07-12.md:1:# Demigod — OpenAI Codex Research — 2026-07-12
docs/exchange/DEMIGOD-OPENAI-CODEX-RESEARCH-2026-07-12.md:6:## Positioning one-liner
docs/exchange/DEMIGOD-OPENAI-CODEX-RESEARCH-2026-07-12.md:8:> **Demigod gives SF seed startups human-curated, mutual-yes talent intros built around the hire's 90-day outcome—for 10% on hire: less noise than Wellfound, open beyond YC's Work at a Startup, and leaner than a 15–25% agency.**
docs/exchange/DEMIGOD-OPENAI-CODEX-RESEARCH-2026-07-12.md:12:## Six landing-page conversion tactics
docs/exchange/DEMIGOD-OPENAI-CODEX-RESEARCH-2026-07-12.md:23:**Priority:** tactics 1–5 are message and flow discipline, not a redesign request. Tactic 6 waits for genuine proof. The current site should remain frozen unless measurement or founder feedback identifies a specific conversion failure.
docs/exchange/DEMIGOD-OPENAI-CODEX-RESEARCH-2026-07-12.md:25:## Four GTM plays this week
docs/exchange/DEMIGOD-OPENAI-CODEX-RESEARCH-2026-07-12.md:34:### Shared execution rule
docs/exchange/DEMIGOD-OPENAI-CODEX-RESEARCH-2026-07-12.md:38:## Features not to build pre-PMF
docs/exchange/DEMIGOD-OPENAI-CODEX-RESEARCH-2026-07-12.md:54:## Bottom line
docs/exchange/DEMIGOD-OPENAI-CODEX-RESEARCH-2026-07-12.md:60:*Prepared by OpenAI Codex from existing Demigod workspace research; no external claims were newly introduced and no site code was changed.*
docs/exchange/DEMIGOD-BLOAT-CUT-PASS-2026-07-13.md:1:# Demigod bloat / complexity cut pass — 2026-07-13
docs/exchange/DEMIGOD-BLOAT-CUT-PASS-2026-07-13.md:3:## Goal
docs/exchange/DEMIGOD-BLOAT-CUT-PASS-2026-07-13.md:6:## Shipped this pass
docs/exchange/DEMIGOD-BLOAT-CUT-PASS-2026-07-13.md:8:### Foot **v189**
docs/exchange/DEMIGOD-BLOAT-CUT-PASS-2026-07-13.md:15:### Footer **v37**
docs/exchange/DEMIGOD-BLOAT-CUT-PASS-2026-07-13.md:17:- Foot CDN pointed at v189
docs/exchange/DEMIGOD-BLOAT-CUT-PASS-2026-07-13.md:20:### Head
docs/exchange/DEMIGOD-BLOAT-CUT-PASS-2026-07-13.md:21:- Unhide CSS includes `display:block!important` on html/body (from v188)
docs/exchange/DEMIGOD-BLOAT-CUT-PASS-2026-07-13.md:23:## Do **not** delete yet (high risk)
docs/exchange/DEMIGOD-BLOAT-CUT-PASS-2026-07-13.md:28:## Next safe cuts (when stable 24h)
docs/exchange/DEMIGOD-BLOAT-CUT-PASS-2026-07-13.md:35:## Multi-agent status
docs/exchange/DEMIGOD-BLOAT-CUT-PASS-2026-07-13.md:36:- Fable `bin/df`, Claude Sonnet, Codex CLI invoked; Codex/Fable may rate-limit — Grok applied high-confidence cuts without waiting on full essays.
docs/exchange/DEMIGOD-BLOAT-CUT-PASS-2026-07-13.md:39:## Workflow optimizations applied
docs/exchange/DEMIGOD-BLOAT-CUT-PASS-2026-07-13.md:44:## v190 (Claude list applied)
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:1:# Demigod Multi-Agent Swarm Synthesis
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:3:**Agents:** 4× Codex API + 1× Codex history lane · Fable · Claude (retry) · Grok  
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:5:**Live:** foot **v193** (`7s02w8.js`) · **Disk:** foot **v194** (reopen idempotent, unshipped) · freeze **ON**
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:9:## Swarm roster
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:13:| Codex API #1 | Forms + submissions | Done | `codex/forms-audit.md` |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:14:| Codex API #2 | Site design/UX | Done | `codex/site-ux-audit.md` |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:15:| Codex API #3 | Tools + dashboard | Running/partial | `codex/tools*.log` |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:16:| Codex API #4 | Roadmap + features | Done | `codex/roadmap.md` |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:17:| Codex history | Historical bugs status | Done | `codex/history-bugs.md` |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:18:| Fable | Planner | Slow/empty at compile | `fable/fable-swarm.md` |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:19:| Claude Sonnet/Opus | Copy + strategy | First launch failed CLI; retrying | `claude/` |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:20:| Grok | Live CDP + gates + assets | Done | `grok/*` + images |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:24:## Grok live user-test (hard evidence)
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:26:### Home (v193 live)
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:31:### WIZ startup (CRITICAL)
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:34:- **FAIL reopen:** `.dg-wiz-head` count grew **2 → 3 → 4 → 5** across open cycles (duplicate chrome on **live v193**)
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:35:- Disk **v194** was written to fix rebuild; **not live yet**
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:37:### Engineer modal
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:40:### Product `/?p=hire`
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:43:### Gates / tools
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:44:- smoke + verify:source PASS on disk v194
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:47:- freeze ON — do not claim live==disk for v194
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:51:## Consensus P0 (all lanes agree)
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:53:1. **Ship v194** — reopen idempotent (stop head/nav multiplication) + then retest CDP reopen counts = 1  
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:54:2. **One-question ownership** — kill `forceWizVisible` / modal force CSS fighting `showStep` (Codex forms + site + Grok CDP prove leak)  
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:55:3. **Submit fixtures** — `dgWfStatusRoot` shipped but unproven e2e; company-name required gap; sf-bay checkbox `.value` bug  
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:56:4. **Product loader** — replace `document.write` races (Codex site P0)
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:58:## Consensus P1
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:67:## Consensus P2 / features (lean)
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:69:From roadmap Codex: fixtures first, then deterministic product routes, then content polish.  
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:72:### Content to produce (swarm)
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:73:- Hero/trust microcopy variants (pending Claude retry)  
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:82:## Ranked next actions (owners)
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:86:| 1 | Unfreeze → CDN+CM6 ship **v194** → CDP reopen counts=1 | Grok | freeze off + hash match |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:87:| 2 | One visibility owner for WIZ steps (minimal CSS/class) | Grok | wiz-playtest one field/step |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:88:| 3 | Fix sf-bay `checked` + company-name `required` | Grok | fixtures |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:89:| 4 | Submit success/fail fixture | Grok+Codex | dual pass |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:90:| 5 | Product route loader non-write | Grok | 8 routes + fallback |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:91:| 6 | Scope `href="#"` click handler | Grok | logo ≠ open WIZ |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:92:| 7 | Copy pack apply (hero/FAQ) | Claude→Grok | policy grep clean |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:94:| 9 | Dashboard: keep brief honest post-ship | Grok | openai set, no false P0 |
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:99:## What each Codex file says (pointer)
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:101:### forms-audit.md
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:104:### site-ux-audit.md
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:107:### roadmap.md
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:110:### history-bugs.md
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:115:## Operating note
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:117:Parallel Codex **API key path works** (5 concurrent). Claude first invoke failed (`--print` needs stdin/arg — fixed on retry). Fable may still be buffering.
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:119:**Do not** open more foot writers until v194 ships or freeze remains intentional.
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md:123:## Raw paths
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:1:# Demigod Agent Info Exchange - 2026-07-09
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:3:## Participants
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:4:- Grok (xAI): This session + prior
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:5:- Fable (Claude via bin/df, scripts/demigod-fable.mjs, claude -p)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:6:- Supergrok Heavy (node demigod-heavy-*.mjs)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:7:- Cursor (node cursor-*.mjs + .cursor/commands/dg-*.md)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:8:- Additional this session: direct `claude --print --model sonnet` and `--model default` (Opus) calls for exchange when Fable quota limited.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:10:## Work Summary (exchanged notes)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:12:### Website (trydemigod.com Webflow)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:15:  - `demigod-foot-core.js` v150: WIZ with 90day-outcome (required), explicit __review__ step, pending language for services, COPY for hero/WIZ, forms, board from CDN.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:18:  - /tmp/PASTE-FOOTER-ONLY.txt (loader for xngres.js -> v150)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:34:### GTM + Startup Ops (pre-services honesty)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:42:### Agent Rules & Coordination
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:47:  - Tab budget: ~6-10 (Designer, live, Grok/Heavy, Claude, Webflow dashboards).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:48:  - Heavy authority: strategy from Supergrok Heavy (demand/GTM first). "Site mostly done."
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:52:  - Fable for deep: bin/df review "..." -> /tmp/fable-*.txt. Grok applies + verifies.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:54:  - Grok: tools, hygiene, verify, pastes, fallback, this exchange.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:55:  - Fable/Claude: plans via df review, audits, summaries (via claude -p, bin/df). This session: direct sonnet/opus for exchange notes.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:56:  - Heavy: audits, website audit pass.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:57:  - Cursor: explore, webflow-enable, dg-*.md (verify, test, implement, pilot, gtm, cdp, snap).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:59:  - Prompts: start with "Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty."
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:61:  - Plan (Fable/Cursor), execute (Grok/Cursor), verify (gates + board/loop).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:68:### Docs & Plans
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:72:- Orca workspaces have copies of AGENTS.md etc.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:73:- Scattered, some outdated (pre v4, old phases). Cleanup in progress.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:75:### Current Phase & Blockers
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:80:## Info Exchange Notes (Grok <-> Fable/Claude/Heavy/Cursor)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:81:- **Grok (this session)**: Hygiene (tabs, procs, CDP), fresh diagnostics (curls, puppeteer, CDP), prep pastes/instructions/coord, fallback static, verify enforcement, agent coordination via tools/files/bg prompts, doc cleanup (archived clutter, new exchange doc, updates to CLAUDE.md + main exchange). Talked to Sonnet + Opus for fresh notes.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:82:- **Fable/Claude**: Plans via bin/df review + claude -p (summaries, publish steps, audits). Confirmed v4 healthy (detailed layers, RAF/MO etc), publish gap, mobile CSS fallback, optional perf. This session Sonnet/Opus: detailed disk md5s, history of SyntaxError root cause, explicit board FAIL flag, multi-confirm advice, division of labor. Limits on df/claude calls handled by using other models.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:83:- **Heavy**: Website audits (puppeteer/CDP), state checks.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:84:- **Cursor**: Explore, webflow deep enable, dg- commands (verify, implement, test, gtm, pilot, cdp, snap). Task files for follow-up.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:86:- **Exchange Method**: bg prompts (claude -p, node heavy, node cursor, bin/df, node fable), /tmp files, this doc. Direct model calls for when Fable limited.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:88:## 2026-07-09 Grok <-> Sonnet/Opus Exchange (this session, added)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:89:See the dedicated new doc: `docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md` for full verbatim-style notes from the Claude calls.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:93:- WIZ v150 specifics (required 90d, review step, stepper counts, form patches).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:98:- Grok actions: ran the calls with prefixed prompts + --add-dir, captured, performed docs cleanup + created new doc, updated CLAUDE.md.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:100:## Docs Cleanup (this session)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:104:- Enhanced this file + created dedicated new detailed exchange doc (GROK-CLAUDE) with merged Sonnet/Opus + Grok notes.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:108:## Next Steps (post-exchange)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:113:- Iterate: Cursor for any perf (from Claude notes), more audits.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:116:## Key Commands (for all agents)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:118:- Fable/Claude exchange: `bin/df review "..."` ; `node scripts/demigod-fable.mjs --fresh` ; `claude --print --model sonnet --add-dir /home/potter`
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:127:## Fresh Claude Summary (from bg task 2026-07-09, post prior exchange)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:128:Claude (short, with prefix): 
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:129:**Demigod (Webflow talent-matching site), phase: GTM + pre-services honesty.** The site is architecturally "mostly done" — canonical JS lives in `demigod-foot-core.js` (currently a healthy v150 build: `wizBuild` defined, 90day-outcome selector quoted, review step present, no banned 48h/SLA copy) with head/footer/WIZ Typeform stepper (startup + engineer, required 90day-outcome for match signal) and a `forceMainVisible` fallback; the recurring pain has been a HEAD unhide `<script>` SyntaxError that blanked the hero (fixed on disk, md5 759e28ce) plus repeated **publish gaps** — live custom code kept lagging disk because CDP paste/publish (port 9223 dead, tab bloat) and the Webflow human-Publish step keep failing, so "site won't load" was stale-publish, not code. Guardrails: edit only the one canonical file, run `npm run demigod:verify:source` + board-honesty + loop-state gates after every edit, keep the board to ≤3 honest seeds (pilot-tracker still spuriously mints `slaDue` receipts — known corruption engine), and let a human click Publish while the agent preps CDN/CDP diffs. **Current focus is demand generation** — 15+ DMs to warm SF founders (5 sent, follow-up ~07-08), pilot logging, one white-glove delivery, and real proof assets — with minimal further site changes; **next steps** are getting the fixed head+foot actually published and live-confirmed (verify hash matches disk, screenshot WIZ desktop/mobile), then resolving the dead webhook and unfreezing outreach once live is verified.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:132:- Matches core state (v150, WIZ required 90d + review, publish gap is the blocker, GTM focus, rules).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:134:- Re-confirms Fable/Claude view of "human Publish only", verify gates, honest board, minimal site changes.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:135:- Heavy audit in same bg failed (CDP 9223 ECONNREFUSED — CDP not up or tabs issue; use `~/agent-dev.sh up` + hygiene).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:137:Fable attempt in bg: script usage error on first (no task), then limited ("Fable 5 limit"). Direct Claude (non-fable) used successfully for exchange.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:139:## Fable/Claude Self-Summary (bg claude -p as Fable, 2026-07-09)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:141:**Prompt framing**: "You are Fable/Claude working on Demigod... Summarize everything you and your sessions have worked on recently..." (website, GTM, coordination, docs, blockers).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:145:### 1. Website — custom code, publish, forms
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:147:- **Foot** (`demigod-foot-core.js`, md5 `9e23ff36`, `__dgFootVer='150'`): Healthy v150. `wizBuild` defined, quoted `[name="90day-outcome"]`, explicit review step + `forceMainVisible`. Clean of 48h/SLA in custom code. History of concurrent churn/corruption (v37 rollback etc.).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:151:### 2. GTM / pilots — board, ledger, honesty
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:157:### 3. Agent coordination + rules
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:158:- Core: One canonical (`demigod-foot-core.js` for JS), mandatory verify:source + board + loop after edits, human Publish only, tab budget, Heavy strategy, game archived.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:159:- Flow: Fable → plans/audits to `/tmp/fable-*.txt`; Grok applies + tools/verify/hygiene; Cursor precise edits (Plan mode). `bin/df review "..."` for fresh disk truth (ver/board/loop/verify).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:160:- Chronic: Concurrent Grok sessions with no writer lock churn foot-core mid-work. Fable sessions often read-only (permissions/CLAUDE-PERMISSIONS-NOTE.md not installed). Deliverables as text for Grok to apply.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:161:- `LOOP-STATE.json` stale (old game phase "paused", 2026-06-23 data — ignore for site/GTM).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:163:### 4. Current blockers & status
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:165:- Publish: Human paste (v4 head + v150 foot) + Publish. CDP blocked.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:170:- **Bottom line (per Fable)**: Disk healthiest state yet. Chain is publish + live-verify + hygiene items. "No live-confirmed claim should be made until a real fetch confirms the new head/foot hashes are serving."
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:172:**Fable offers in summary**: (a) clean single-file publish handoff, (b) dedupe board + CDN reconcile, (c) live fetch to confirm hashes.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md:175:- Foot v150, head md5 `601a1ea15f15c27bd70df3168b864c63` (matches).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:1:# Demigod Agent Info Exchange — Grok + Claude (Sonnet/Opus) 2026-07-09
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:4:**Participants:** Grok (xAI, this session), Claude via `claude --print` (models: sonnet, default/opus; Fable limited by quota)  
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:5:**Context:** Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:7:## Purpose of this Exchange
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:8:Grok initiated direct conversations with other Claude models (and referenced prior Fable work) to exchange notes on:
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:16:## How the Talk Happened
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:18:- Prompts always prefixed: "Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty."
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:21:- Also referenced `bin/df`, `scripts/demigod-fable.mjs`, prior Fable outputs (Fable 5 limit hit earlier).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:23:Grok side also ran: `npm run demigod:verify:source`, board/loop checks, hygiene reminders.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:25:## Grok's Summary of Recent Work (shared with Claude)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:27:- Foot: `demigod-foot-core.js` v150 (WIZ_CFG with 90day-outcome required high-signal step + explicit review step "Ready to submit...", pending language, COPY scrub, xngres loader).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:29:- Process: hygiene (tabs close via cdp-close-tabs + agent-dev.sh, pkill), verifies (source green, loop v150, board FAIL flagged), coord via /tmp/COORD-AGENTS-*.md + bg prompts to Fable/Claude/Heavy/Cursor.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:31:- Confirmed: source gates, md5s (head 601a1ea1, foot v150), no game touches.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:34:## Claude (Sonnet) Key Notes & Contributions (verbatim merged)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:36:- Foot v150: wizBuild defined, 90day-outcome required (textarea), explicit __review__ / __submit__ step. Stepper 11/13 steps. Forms patched (required, counters, 10MB uploads, trust copy).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:38:- Agent collab: bin/df for Fable (fresh ver/board/loop/verify inject), verify:* surface, one canonical (only foot-core.js for site JS), human Publish only, tab hygiene (cdp-close-tabs), mobile resilience in v4.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:46:## Claude (Opus / default) Key Notes & Contributions (verbatim merged)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:48:- Disk verified: foot md5 9e23ff36 v150, head 601a1ea1 ~8400B. wizBuild(), 90day req x16, dg-wiz-review x13, review step present.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:52:  - Fable/Claude: deep plans/audits (bin/df injects truth)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:53:  - Cursor: precise edits (Plan Mode)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:54:  - Grok: tools, hygiene, verify, prep, execute
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:55:  - Heavy: GTM strategy ("site mostly done")
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:57:- GTM phase: demand gen 15+ DMs to warm SF founders, 1 white-glove, proof. No simulated data.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:60:**Flag from Opus**: "live-published state is unverified this session (no confirmed curl). Don't let the doc imply v4/v150 are live — they're disk-ready and gated on a human Publish + multi-confirm."
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:62:## Merged Agreements & Fresh Findings (Grok + Claudes)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:63:- All aligned on v4 + v150 readiness on disk, WIZ improvements (required 90d + review), rules, publish process, pre-services language.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:64:- **Actionable this exchange**: board-honesty FAIL (5 roles) — must fix before more GTM. (Verify run in this session confirmed source PASS, loop v150 OK, board FAIL.)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:65:- Exchange method effective: direct claude --print + --add-dir gives fresh disk-aware Claude perspective when Fable quota limited.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:69:## Docs Changes from this Exchange
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:70:- Created this new doc (detailed Claude responses + Grok side).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:76:## Key Commands (shared)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:78:# Talk / exchange
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:81:bin/df review "..."   # Fable (when quota allows)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:84:# Verify (always)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:90:# Hygiene + prep
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:96:# Test
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:100:## Outcome
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:101:Successful exchange. Claude models provided detailed, disk-grounded validation + actionable flags (esp. board). Grok performed the requested cleanup + new doc creation. All notes now consolidated in docs/exchange/.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:106:*Generated during Grok session on 2026-07-09. Sources: direct model calls + disk truth (head v4, foot v150, verifies).*
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:108:## Fresh Claude Summary (from bg task 2026-07-09, post prior exchange)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:109:Claude (short, with prefix): 
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:110:**Demigod (Webflow talent-matching site), phase: GTM + pre-services honesty.** The site is architecturally "mostly done" — canonical JS lives in `demigod-foot-core.js` (currently a healthy v150 build: `wizBuild` defined, 90day-outcome selector quoted, review step present, no banned 48h/SLA copy) with head/footer/WIZ Typeform stepper (startup + engineer, required 90day-outcome for match signal) and a `forceMainVisible` fallback; the recurring pain has been a HEAD unhide `<script>` SyntaxError that blanked the hero (fixed on disk, md5 759e28ce) plus repeated **publish gaps** — live custom code kept lagging disk because CDP paste/publish (port 9223 dead, tab bloat) and the Webflow human-Publish step keep failing, so "site won't load" was stale-publish, not code. Guardrails: edit only the one canonical file, run `npm run demigod:verify:source` + board-honesty + loop-state gates after every edit, keep the board to ≤3 honest seeds (pilot-tracker still spuriously mints `slaDue` receipts — known corruption engine), and let a human click Publish while the agent preps CDN/CDP diffs. **Current focus is demand generation** — 15+ DMs to warm SF founders (5 sent, follow-up ~07-08), pilot logging, one white-glove delivery, and real proof assets — with minimal further site changes; **next steps** are getting the fixed head+foot actually published and live-confirmed (verify hash matches disk, screenshot WIZ desktop/mobile), then resolving the dead webhook and unfreezing outreach once live is verified.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:113:- Matches core state (v150, WIZ required 90d + review, publish gap is the blocker, GTM focus, rules).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:115:- Re-confirms Fable/Claude view of "human Publish only", verify gates, honest board, minimal site changes.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:116:- Heavy audit in same bg failed (CDP 9223 ECONNREFUSED — CDP not up or tabs issue; use `~/agent-dev.sh up` + hygiene).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:118:Fable attempt in bg: script usage error on first (no task), then limited ("Fable 5 limit"). Direct Claude (non-fable) used successfully for exchange.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:120:## Fable/Claude Self-Summary (bg claude -p as Fable, 2026-07-09)
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:122:**Prompt framing**: "You are Fable/Claude working on Demigod... Summarize everything you and your sessions have worked on recently..." (website, GTM, coordination, docs, blockers).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:126:### 1. Website — custom code, publish, forms
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:128:- **Foot** (`demigod-foot-core.js`, md5 `9e23ff36`, `__dgFootVer='150'`): Healthy v150. `wizBuild` defined, quoted `[name="90day-outcome"]`, explicit review step + `forceMainVisible`. Clean of 48h/SLA in custom code. History of concurrent churn/corruption (v37 rollback etc.).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:132:### 2. GTM / pilots — board, ledger, honesty
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:138:### 3. Agent coordination + rules
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:139:- Core: One canonical (`demigod-foot-core.js` for JS), mandatory verify:source + board + loop after edits, human Publish only, tab budget, Heavy strategy, game archived.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:140:- Flow: Fable → plans/audits to `/tmp/fable-*.txt`; Grok applies + tools/verify/hygiene; Cursor precise edits (Plan mode). `bin/df review "..."` for fresh disk truth (ver/board/loop/verify).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:141:- Chronic: Concurrent Grok sessions with no writer lock churn foot-core mid-work. Fable sessions often read-only (permissions/CLAUDE-PERMISSIONS-NOTE.md not installed). Deliverables as text for Grok to apply.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:142:- `LOOP-STATE.json` stale (old game phase "paused", 2026-06-23 data — ignore for site/GTM).
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:144:### 4. Current blockers & status
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:146:- Publish: Human paste (v4 head + v150 foot) + Publish. CDP blocked.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:151:- **Bottom line (per Fable)**: Disk healthiest state yet. Chain is publish + live-verify + hygiene items. "No live-confirmed claim should be made until a real fetch confirms the new head/foot hashes are serving."
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:153:**Fable offers in summary**: (a) clean single-file publish handoff, (b) dedupe board + CDN reconcile, (c) live fetch to confirm hashes.
docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md:156:- Foot v150, head md5 `601a1ea15f15c27bd70df3168b864c63` (matches).

exec
/bin/bash -lc "sed -n '1,240p' docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md; sed -n '1,300p' docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md; sed -n '1,300p' docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md; sed -n '1,260p' docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md" in /home/potter
 succeeded in 0ms:
# Demigod publish + load postmortem (2026-07-09)

**Audience:** Grok, Fable/Claude, Cursor, human.  
**Sites:** production `https://www.trydemigod.com` · staging `https://talentlink-sf.webflow.io` · Designer `talentlink-sf.design.webflow.com`  
**Not a test domain.** Apex `trydemigod.com` → 301 → `www.trydemigod.com` (Webflow + Cloudflare).

## User symptoms

1. “I published and nothing happened.”
2. “Site not loading / endless spinner / blank.”
3. Agents/Claude “working for days” with little live proof.

## Root causes (ranked)

### P0 — Main-thread freeze (endless loading)

Live HEAD custom code (`unhide-v4`) ran a `MutationObserver` on `style`/`class` while the same script **wrote styles** on every tick. That is an infinite mutation loop → browser spinner never finishes.

Worse: HEAD was **double-pasted** (`dg-early-unhide` ×2, supabase ×2, xngres ×2) so thrash ran twice.

**Disk fix:** `demigod-head-minimal.html` → **`unhide-v5-safe`**  
- CSS-first unhide  
- Finite `setInterval` (~20 ticks)  
- **No** attribute MutationObserver  
- Guard `window.__dgUnhideV5`  
- Supabase `async defer` (non-blocking)

### P0 — Publish updates staging only

Webflow “Publish to selected domains” can leave **www.trydemigod.com** unchecked.  
Truth: HTML comment `<!-- Last Published: ... -->`  
- Staging can show today’s publish while production stays on yesterday.

### P1 — Blank hero (historical)

Webflow IX starts nodes at `opacity:0` / `visibility:hidden`. Broken/truncated unhide (brace imbalance) left hero invisible even when HTML existed.

### P1 — Agent process gap

Disk gates green (`verify:source`, board honest, foot v150 on CDN) **≠** live custom code. CDP paste automation is flaky (CM6 virtualizes readback, puppeteer `Network.enable` timeouts, `keyboard.type` mangler). Prefer single verified paste + production curl.

### P2 — Design CSS side effects

`files.catbox.moe/m2f8rp.css` can hide `h1` until `.title-accent-gold` or a 2.5s fallback animation — brief “blank title.”

### P2 — Foot observers

`demigod-foot-core.js` uses childList MOs with a `busy` flag (acceptable). Do **not** reintroduce style-attribute observers in HEAD.

## Confirmation commands (always)

```bash
# Production bake time
curl -sL "https://www.trydemigod.com/?v=$(date +%s)" | grep -o 'Last Published: [^<]*'

# Must be ≥1 after v5 ship; MO must be 0 in <head>
H=$(curl -sL "https://www.trydemigod.com/?v=$(date +%s)")
echo "$H" | tr '\n' ' ' | sed 's/<\/head>.*/<\/head>/' | grep -c unhide-v5-safe
echo "$H" | tr '\n' ' ' | sed 's/<\/head>.*/<\/head>/' | grep -c MutationObserver   # expect 0

# Staging vs prod same Last Published
curl -sL "https://talentlink-sf.webflow.io/?v=$(date +%s)" | grep -o 'Last Published: [^<]*'
```

## Human publish checklist (2 minutes)

1. https://webflow.com/dashboard/sites/talentlink-sf/custom-code  
2. **HEAD:** clear → paste **once** full `demigod-head-minimal.html` (must contain `unhide-v5-safe`)  
3. **FOOTER:** clear → paste **once** `demigod-footer-lite.html` (must contain `xngres.js`)  
4. Save  
5. Publish → check **both** `talentlink-sf.webflow.io` **and** `www.trydemigod.com`  
6. “Publish to selected domains”  
7. Hard refresh https://www.trydemigod.com/?v=5 — page should paint in seconds, no endless spinner  

Paste mirrors: `/tmp/PASTE-HEAD-ONLY.txt`, `/tmp/PASTE-FOOTER-ONLY.txt`

## Session context dump for Fable

Full Grok dump: `/tmp/demigod-fable-full-context-20260709-0707.txt`  
Joint audit output: `/tmp/fable-joint-audit-*.txt`

## What is healthy (do not thrash)

| Asset | Status |
|--------|--------|
| `demigod-foot-core.js` v150 | Canonical; CDN `xngres.js` |
| Board honesty | 2 sample roles, realRoles 0 |
| Domain DNS/SSL | OK; not a parking/test host |
| Forms copy | hello@trydemigod.com follow-up |

## After load is green

Minimal GTM: warm SF founder DMs, one white-glove pilot, real board receipts only. No more head thrash unless load regresses.

## Confirmed fixed + UI follow-on (2026-07-09)

| Time (UTC) | Event |
|------------|--------|
| ~14:12–14:16 | unhide-v5-safe on www; MO gone; single early-unhide |
| ~14:18 | UI fix: `dg-base-tokens` + normal catbox CSS; stop hiding `.w-nav-menu` |

**Living master doc:** `DEMIGOD-COMPRESSED-STATE.md` (timeline, features, agent roles, GTM next).
# Demigod tools — keep vs archive

**Updated:** 2026-07-13 · after v193 dual-CTA ship  
**Scope:** `demigod-*.mjs`, `bin/dg*`, dashboard, npm `demigod:*`  
**Rule:** Prefer this list over inventing more one-shots. ~217 scripts exist; **daily path is ~15**.

---

## 1. Daily / session start (KEEP — use these)

| Tool | Cmd | Why |
|------|-----|-----|
| **Agent dashboard** | http://127.0.0.1:9878/ · `bin/dg-dash` | Live status UI + brief |
| **Agent brief** | `curl -sS http://127.0.0.1:9878/api/agent-brief` · `/tmp/dg-busy/AGENT-BRIEF.md` | Start every agent session here |
| **Session start** | `bin/dg-start` | Brief + ship-status + lock hygiene |
| **Truth** | `node demigod-truth.mjs` | Disk/CDN/live/board facts (no prose) |
| **Ship status** | `node demigod-ship-status.mjs` · `bin/dg-ship-status` | Stage checklist |
| **Publish freeze** | `node demigod-publish-freeze.mjs status\|on\|off` | Hard stop when green |
| **Source gate** | `npm run demigod:verify:source` | After every foot edit |
| **Foot smoke** | `node demigod-foot-smoke.mjs` | Parse + version |
| **Board honesty** | `node demigod-verify-board-honesty.mjs` | ≤3 seeds, real=0 |
| **Handoff** | `node demigod-handoff.mjs --note "…"` | Session end |
| **Fable** | `bin/df review "…"` | Plans with fresh disk truth |
| **Foot lock** | `bin/dg-lock` / `node demigod-foot-lock.mjs` | One writer |

**Canonical product files (not scripts):**  
`demigod-foot-core.js` · `demigod-footer-lite.html` · `demigod-head-minimal.html` · `DEMIGOD-BOARD.json` · `DEMIGOD-COMPRESSED-STATE.md`

---

## 2. Ship path (KEEP — when changing live site)

```text
edit demigod-foot-core.js
  → node --check + demigod-foot-smoke + demigod:verify:source
  → upload catbox (demigod-foot-cdn-publish.mjs or manual)
  → update footer-lite src + DEMIGOD-FOOT-CDN.json (sha256)
  → node demigod-cm6-paste-publish.mjs --footer-only
  → Designer Publish (API often 412)
  → truth + CDP body/h1/foot ver
  → publish-freeze on
```

| Tool | Cmd |
|------|-----|
| CDN upload | `node demigod-foot-cdn-publish.mjs` (or manual catbox) |
| Webflow paste | `node demigod-cm6-paste-publish.mjs [--footer-only]` |
| Head CSS CDN | `node demigod-head-css-publish.mjs` (rare) |
| CDP Chrome | `:9223` via `~/agent-dev.sh up` |
| Workspace tabs | `npm run demigod:workspace` |

**Measure blank pages by body display + h1 rect, not HTTP alone.**  
**Never bulk-replace all `files.catbox.moe/*.js`** (corrupts product map).

---

## 3. Forms / QA (KEEP when polishing)

| Tool | When |
|------|------|
| `node demigod-wiz-cdp-playtest.mjs --local` | WIZ stepper e2e |
| `node demigod-form-e2e.mjs` / form-e2e-pw | Full form path |
| `node demigod-button-audit.mjs` | CTA labels / wiring |
| `node demigod-conversion-playtest.mjs` | Conversion surfaces |
| `node demigod-mobile-button-playtest.mjs` | Mobile bar |
| `npm run demigod:verify:live` | Live greps |

---

## 4. Multi-agent (KEEP)

| Tool | Role |
|------|------|
| `bin/df` | Fable with injected disk truth |
| Codex CLI | `codex exec` / `codex exec review` |
| Claude CLI | `claude --print --model sonnet\|opus` |
| Prompt pack | `docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md` |
| Plan inbox | `node demigod-plan-inbox.mjs` |
| Plan ledger | `node demigod-plan-ledger.mjs` |
| Claim-verify | `node demigod-claim-verify.mjs` |

**Heavy scripts** (`demigod-heavy-*.mjs`, ~31): keep **files**, run only if SuperGrok tab is open on CDP. Not required for daily ship.

---

## 5. GTM / pilot (KEEP when demand work)

| Tool | Role |
|------|------|
| `demigod-founder-dm-blast.mjs` | DM packs (`--dry` first) |
| `demigod-gtm-*` | Status / prep / personalizer |
| `demigod-pilot-tracker.mjs` / pilot-logger | Pilot ops |
| `demigod-pilot-os.mjs` | Pilot OS surface |

Not the site-polish path.

---

## 6. Ops matching (KEEP stubs; light use)

Submissions pipeline, match/intro/close, board publish — real when services live.  
Pre-services: honesty + pending language; don’t fake volume.

Examples: `demigod-match.mjs`, `demigod-intro.mjs`, `demigod-board-publish.mjs`, `demigod-submissions-*`.

---

## 7. ARCHIVE / cold (do not start sessions here)

Do **not** delete yet (may hold one useful pattern). Treat as **cold**:

| Bucket | ~Count | Notes |
|--------|--------|-------|
| **Tally era** | many `*tally*` | Product is native WIZ; Tally optional archive |
| **One-shot Designer passes** | canvas-simplify, nav-master, form-rename, bloat-delete, hero-cleanup… | Ran once; re-run only with explicit goal |
| **Deprecated loops** | `demigod:continuous`, `demigod:loop`, `demigod:watch`, `demigod:orchestrator` | Explicitly exit 1 in package.json |
| **Visual auto loops** | visual:loop, perfect:loop | Disabled |
| **Eat-the-sounds verify** | `npm run verify*` | Game archived — never for Demigod |
| **Duplicate “pass” scripts** | `*-pass.mjs` from old nights | Prefer current ship path |

If you need history: `docs/archive/` + git history. Prefer **one new edit to foot-core** over a new `demigod-foo-pass.mjs`.

---

## 8. Dashboard — how to use it

| URL / cmd | Purpose |
|-----------|---------|
| http://127.0.0.1:9878/ | Human UI (auto-refresh) |
| `/api/agent-brief` | Markdown brief for agents |
| `/api/status` | JSON status |
| `/api/actions` | Next actions only |
| `bin/dg-dash` | Start in bg |
| `bin/dg-dash stop` | Stop |
| `bin/dg-dash brief` | Print brief |

**Also on disk:** `/tmp/dg-busy/AGENT-BRIEF.md`, `dashboard-status.json`, `truth.json`, `ship-status.json`.

**Fixed 2026-07-13:** live CDN detection uses `src="…catbox….js"` so product-map URLs no longer fake “DRIFT”.

**Internal ops dashboard** (`demigod-internal-dashboard.mjs` :3456) = matches/pilots only, not multi-agent control.

---

## 9. npm scripts — which aliases matter

```bash
npm run demigod:dash          # dashboard
npm run demigod:verify:source
npm run demigod:verify:smoke
npm run demigod:verify:live
npm run demigod:truth
npm run demigod:ship:status
npm run demigod:publish-freeze
npm run demigod:foot:cdn
npm run demigod:workspace     # open core tabs
```

Ignore the long tail of `demigod:heavy:*`, `demigod:tally:*`, and deprecated loop scripts unless you have a named task.

---

## 10. Session checklist (agents)

```bash
# 1) brief
curl -sS http://127.0.0.1:9878/api/agent-brief | head -40
# or: cat /tmp/dg-busy/AGENT-BRIEF.md

# 2) facts
node demigod-truth.mjs
node demigod-ship-status.mjs
node demigod-publish-freeze.mjs status

# 3) work (one foot writer)
# … edit demigod-foot-core.js …

# 4) gates
npm run demigod:verify:source
node demigod-foot-smoke.mjs
node demigod-verify-board-honesty.mjs

# 5) ship only if freeze off + intentional
# 6) handoff
node demigod-handoff.mjs --note "what changed"
```

---

## 11. Inventory snapshot (2026-07-13)

| Group | ~Scripts | Stance |
|-------|----------|--------|
| verify / ship | 17 | **KEEP hot** |
| publish / webflow | 17 | **KEEP hot** when shipping |
| forms / QA | 22 | **KEEP warm** |
| agent ops | 10 | **KEEP warm** |
| GTM | 11 | **KEEP** for demand |
| ops matching | 32 | **KEEP** light / pre-services |
| CDP / design one-shots | 12 | **COLD** |
| Heavy | 31 | **COLD** unless Grok tab |
| other | 65 | **Mostly COLD** — check name before running |
| **Total demigod-*.mjs** | **~217** | |

`bin/` has ~45 `dg*` wrappers → thin aliases into the above.

---

## 12. Do not

- Spawn continuous-improve / watch loops without explicit ask  
- Touch game verify / eat-the-sounds  
- Add another `demigod-*-pass.mjs` for a one-line foot fix  
- Trust “live CDN drift” without checking `src=` foot tag vs product map  
- Claim published without `truth.json` claims.live==disk  

---

**One-liner:** Dashboard + brief + truth + verify + CM6 ship path = the real toolkit; everything else is optional or history.
# Demigod Multi-Agent Swarm Synthesis
**When:** 2026-07-13T16:46:10.782862+00:00  
**Agents:** 4× Codex API + 1× Codex history lane · Fable · Claude (retry) · Grok  
**Artifacts:** `/tmp/dg-busy/swarm/`  
**Live:** foot **v193** (`7s02w8.js`) · **Disk:** foot **v194** (reopen idempotent, unshipped) · freeze **ON**

---

## Swarm roster

| Agent | Role | Status | Output |
|-------|------|--------|--------|
| Codex API #1 | Forms + submissions | Done | `codex/forms-audit.md` |
| Codex API #2 | Site design/UX | Done | `codex/site-ux-audit.md` |
| Codex API #3 | Tools + dashboard | Running/partial | `codex/tools*.log` |
| Codex API #4 | Roadmap + features | Done | `codex/roadmap.md` |
| Codex history | Historical bugs status | Done | `codex/history-bugs.md` |
| Fable | Planner | Slow/empty at compile | `fable/fable-swarm.md` |
| Claude Sonnet/Opus | Copy + strategy | First launch failed CLI; retrying | `claude/` |
| Grok | Live CDP + gates + assets | Done | `grok/*` + images |

---

## Grok live user-test (hard evidence)

### Home (v193 live)
- body `display:block`, h1 visible ~600×786, foot **193**
- CTAs: **I'm hiring** → startup · **Find a job** → jobseeker · path pills OK
- CDN: `7s02w8.js`

### WIZ startup (CRITICAL)
- Modal opens (`display:flex`), next button present
- **FAIL one-question:** on open, **many fields visible at once** (contact-email, company-stage, company-name, role-title, stack-needs, timeline, team-size, 90day-outcome, salary-range, why-this-role, role-jd)
- **FAIL reopen:** `.dg-wiz-head` count grew **2 → 3 → 4 → 5** across open cycles (duplicate chrome on **live v193**)
- Disk **v194** was written to fix rebuild; **not live yet**

### Engineer modal
- Question text present; open state flaky in test (needs retest after ship)

### Product `/?p=hire`
- **PASS:** body block, h1 "Hire for the 90-day outcome…", ~3.4k text — product page works

### Gates / tools
- smoke + verify:source PASS on disk v194
- board honesty OK (2 samples, real0)
- dashboard: `openai_key: set`, reports disk/live drift (correct)
- freeze ON — do not claim live==disk for v194

---

## Consensus P0 (all lanes agree)

1. **Ship v194** — reopen idempotent (stop head/nav multiplication) + then retest CDP reopen counts = 1  
2. **One-question ownership** — kill `forceWizVisible` / modal force CSS fighting `showStep` (Codex forms + site + Grok CDP prove leak)  
3. **Submit fixtures** — `dgWfStatusRoot` shipped but unproven e2e; company-name required gap; sf-bay checkbox `.value` bug  
4. **Product loader** — replace `document.write` races (Codex site P0)

## Consensus P1

- Nav `href="#"` → always opens startup (logo hijack)  
- Over-broad `forceMainVisible` / aria-hidden unhide  
- CTA surface overload (hero + pills + mobile bar)  
- Thanks step may not render WIZ_THANKS reliably  
- Disk/live drift until publish  
- Tool sprawl: keep core path only (see tools keep doc)

## Consensus P2 / features (lean)

From roadmap Codex: fixtures first, then deterministic product routes, then content polish.  
**Do not build:** marketplace, ATS, live Stripe/Twilio, fake proof, accounts.

### Content to produce (swarm)
- Hero/trust microcopy variants (pending Claude retry)  
- +3 FAQ answers  
- Assets generated this run:
  - `images/11.jpg` hero gold match concept  
  - `images/12.jpg` dual CTA social mock  
  - also under `/tmp/dg-busy/swarm/assets/` when copied

---

## Ranked next actions (owners)

| # | Action | Owner | Stop |
|---|--------|-------|------|
| 1 | Unfreeze → CDN+CM6 ship **v194** → CDP reopen counts=1 | Grok | freeze off + hash match |
| 2 | One visibility owner for WIZ steps (minimal CSS/class) | Grok | wiz-playtest one field/step |
| 3 | Fix sf-bay `checked` + company-name `required` | Grok | fixtures |
| 4 | Submit success/fail fixture | Grok+Codex | dual pass |
| 5 | Product route loader non-write | Grok | 8 routes + fallback |
| 6 | Scope `href="#"` click handler | Grok | logo ≠ open WIZ |
| 7 | Copy pack apply (hero/FAQ) | Claude→Grok | policy grep clean |
| 8 | Drop CTA duplicate pills OR sticky-only-after-scroll | Design | mobile shot |
| 9 | Dashboard: keep brief honest post-ship | Grok | openai set, no false P0 |
| 10 | Human: warm DMs + 1 real form receipt check | Human | — |

---

## What each Codex file says (pointer)

### forms-audit.md
Overall **FAIL** isolation contract; matrices for every step; P0 fixes listed with lines.

### site-ux-audit.md
P0 product `document.write`; P0 one-question thrash; P1 hash→startup; blank-guard overreach; CTA overload.

### roadmap.md
P0 form completion + routes; decision rules; no premature marketplace; owners assigned.

### history-bugs.md
Blank-body/MO freeze **FIXED** on live lineage; form vis / one-question / submit **REGRESSION RISK**.

---

## Operating note

Parallel Codex **API key path works** (5 concurrent). Claude first invoke failed (`--print` needs stdin/arg — fixed on retry). Fable may still be buffering.

**Do not** open more foot writers until v194 ships or freeze remains intentional.

---

## Raw paths
```
/tmp/dg-busy/swarm/SHARED-BRIEF.md
/tmp/dg-busy/swarm/codex/forms-audit.md
/tmp/dg-busy/swarm/codex/site-ux-audit.md
/tmp/dg-busy/swarm/codex/roadmap.md
/tmp/dg-busy/swarm/codex/history-bugs.md
/tmp/dg-busy/swarm/grok/cdp-user-test.json
/tmp/dg-busy/swarm/grok/live-tools.md
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md  (this file)
```
# Demigod Website + Webflow — Exhaustive Troubleshooting

**Date:** 2026-07-13  
**Status:** Root blank-page cause identified and fixed in **foot v188** (`3ozk21.js`) + head unhide + footer **v36**.  
**Live check after fix:** `body.display=block`, h1 height ~786px, hero CTAs visible, WIZ opens.  
**Do not start from scratch** unless v188 hard-refresh still blanks on real devices after CF cache clear.

---

## 0. Executive summary (what “broken / not loading / blank” actually was)

| Symptom users report | Actual mechanism | Fix |
|---------------------|------------------|-----|
| Site “won’t load” | HTTP often **200**; page paints black | Not always downtime |
| **Blank black page** (only top nav) | **`document.body { display: none !important }`** set by JS | **v188** `hideCard` must never hide `body` |
| Infinite hang / freeze | MutationObserver thrash in foot (form style MO, full-doc MO) | **v187** capped/removed thrash MOs |
| Product pages “source code” | Catbox serves `.html` as **`text/plain` + nosniff** | Product **JS loaders** (`document.write`) v35+ |
| `/hire` dead | Webflow **301s deleted**; no Designer page → **404** without custom code | Use `/?p=hire` until real WF pages exist |
| Agents say green, user sees blank | HTTP + DOM text present while **body display:none** → zero layout box | Measure **bounding rect + body display**, not only `innerText` |
| Flaky agent tests | Headless Chromium often fails CF/lifecycle; CDP tabs wedge | Prefer automation Chrome profile on `:9223` |

**Root cause of blank homepage (confirmed 2026-07-13 live CDP):**

```text
document.body inline style included:
  display: none !important; visibility: visible; opacity: 1
→ getBoundingClientRect() width/height = 0 for body and all content
→ screenshot: black field with only fixed/out-of-flow nav chrome
```

**Why body was set to `display:none`:**

`hideCard(el)` in `demigod-foot-core.js` walked **up the parent chain** until it found a node containing `a,button`.  
`document.body` always matches → **`body.style.setProperty('display','none','important')`**.  
Called from pricing scrub / subscription card hide paths → **entire site blank**.

---

## 1. Architecture map (what can break)

```
Browser
  → Cloudflare (cache, CF challenge, edge)
  → Webflow hosting (HTML page shell)
      HEAD custom code (unhide CSS/JS, design CSS from catbox)
      BODY Webflow Designer content + IX (Interactions) CSS
      FOOTER custom code (path router + product loaders + foot-core CDN)
  → files.catbox.moe
      foot-core.js (behavior: WIZ, CTAs, scrub, hideCard, …)
      product-*.js (document.write full product HTML)
      m2f8rp.css (design tokens)
```

**Single points of failure**

1. Webflow custom code not Saved/Published  
2. Catbox 0-byte or wrong file  
3. Foot JS exception before unhide / after setting body none  
4. Webflow IX `visibility:hidden` without `w-mod-ix3`  
5. Product path 404 (no WF page)  
6. Catbox HTML MIME (text/plain)  
7. CORS if using `fetch()` of HTML cross-origin  
8. Agent publish freeze / 412 Unauthorized on Webflow APIs  

---

## 2. Symptom → diagnostic decision tree

### 2.1 Completely unreachable

```bash
curl -sS -o /dev/null -w "%{http_code} ttfb=%{time_starttransfer}\n" https://www.trydemigod.com/
```

| Result | Meaning | Action |
|--------|---------|--------|
| 000 / timeout | DNS, network, CF outage | Check DNS, CF status, try mobile data |
| 5xx | Webflow/CF origin error | Webflow status; republish |
| 200 | **Not downtime** | Go to blank-page checks |

### 2.2 HTTP 200 but blank / black

**A. Body display none (THIS WAS THE BUG)**

```js
// DevTools Console on https://www.trydemigod.com/
getComputedStyle(document.body).display
// "none" → blank site
document.body.getAttribute('style')
// look for display: none !important
document.body.getBoundingClientRect()
// height 0
```

**Immediate user unblock (until fixed foot loads):**

```js
document.body.style.setProperty('display','block','important');
```

**B. Webflow IX hide (visibility hidden)**

```js
document.documentElement.className
// need w-mod-js AND w-mod-ix3
```

Webflow injects early:

```css
html.w-mod-js:not(.w-mod-ix3) :is(h1,h2,.nav_container,...) {
  visibility: hidden !important;
}
```

If head unhide script fails, content stays invisible (nav may still show if forced).

**C. Foot CDN empty or blocked**

```bash
# extract foot URL from homepage HTML
curl -sS https://www.trydemigod.com/ | grep -oE 'https://files.catbox.moe/[a-z0-9]+\.js'
curl -sS -D- -o /tmp/foot.js -w "%{http_code} %{size_download}\n" <FOOT_URL>
# size must be ~100k+ for foot-core; 0 bytes = dead CDN
head -c 120 /tmp/foot.js   # expect /*dg-foot-v188-core*/
```

Adblockers / corporate filters sometimes block `files.catbox.moe`.

**D. JS error before boot**

DevTools → Console: red errors in `3ozk21.js` / unhide script.  
Any SyntaxError aborts rest of foot → partial UI / stuck IX hide.

### 2.3 “Loads then freezes / unresponsive”

Historical causes:

| Cause | Version | Fix |
|-------|---------|-----|
| Full-document MutationObserver + `run()` DOM mutations | pre-v187 | OBS disabled / capped |
| Form `style` attribute MO calling `setProperty` on same form | pre-v187 | Only re-force if `display===none` |
| Footer honesty MO walking text + thrash | footer v28–29 | v30 timed passes only |
| `setInterval(forceFormVisible, 400)` forever | pre-v186 | Removed |

### 2.4 Product pages broken

| URL | Expected | Failure mode |
|-----|----------|--------------|
| `/?p=hire` | Product HTML via JS loader | Loader missing/wrong URL; CORS if fetch |
| `/hire` | Should 200 WF page **or** 301 | **Currently 404** (redirects deleted, no Designer page) |
| `files.catbox.moe/*.html` | Rendered page | **text/plain** → source code in browser |
| `files.catbox.moe/*product*.js` | `document.write` HTML | Works as `application/javascript` |

### 2.5 Forms / WIZ not opening

```js
window.dgFootVersion          // need v188+
document.querySelector('.hero-actions a.premium-btn.is-talent')
  ?.getAttribute('data-demigod-modal')  // "startup"
getComputedStyle(document.querySelector('#startup-modal')).display  // "flex" when open
```

Historical: `nav()` hid **all** `HIRE TALENT` links including hero (fixed v184).  
Deep link: `/?wiz=startup` or `/?wiz=engineer`.

### 2.6 Agent / automation says broken, human OK (or reverse)

| Harness | Known issue |
|---------|-------------|
| Playwright/Puppeteer headless | CF / `networkidle` hangs; not proof of downtime |
| CDP on wedged tab | `Runtime.enable` timeout |
| curl-only | Misses blank body (still 200 + HTML) |
| `innerText.length` only | Can be large while `body.display=none` |

**Required green definition:**

1. `body` computed `display !== 'none'` and height > 100  
2. `h1` getBoundingClientRect().height > 20  
3. `window.dgFootVersion` matches intended  
4. Screenshot shows hero text  
5. WIZ opens on click or `?wiz=startup`  

---

## 3. Live inventory (2026-07-13 post-mortem measurements)

### 3.1 Before v188 blank fix

```
body.display = "none"
body inline = "visibility: visible !important; opacity: 1 !important; display: none !important;"
body rect = { w:0, h:0 }
h1 rect = { w:0, h:0 }
screenshot = black + nav only
```

### 3.2 After v188

```
dg = v188
body.display = block
body height ≈ 5885
h1 height ≈ 786
hire CTA height ≈ 64
WIZ open = true on ?wiz=startup
screenshot = hero + copy visible
```

### 3.3 Routes

| Path | HTTP | Notes |
|------|------|-------|
| `/` | 200 | Homepage |
| `/?p=hire` | 200 | Product via JS loader |
| `/hire` | **404** | No WF page; system 404 has **no** site custom code |
| `/pricing` | 200 | Legacy WF pricing page exists |
| Foot CDN `3ozk21.js` | 200 ~118KB | v188 |
| Catbox `.html` product | 200 **text/plain** | Do not deep-link |

---

## 4. Webflow-specific troubleshooting

### 4.1 Custom Code pipeline

1. Dashboard → Site → **Custom code**  
2. **Head** = `demigod-head-minimal.html` (unhide + tokens + CSS)  
3. **Footer** = `demigod-footer-lite.html` (router + foot CDN + honesty)  
4. **Save** then **Publish** to `trydemigod.com`  

**Failures seen**

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| Save without Publish | Staging OK, live stale | UI Publish to selected domains |
| API `queue-publish` **412** | Auth cookie stale | UI Publish; re-login automation Chrome |
| Publish freeze file | Agents skip publish | `node demigod-publish-freeze.mjs off` when shipping critically |
| CM6 paste wrong pane | Head/foot swapped | Verify preview strings (`dg-unhide` vs `foot-cdn-loader`) |
| Aggressive regex on footer | **Product CDN map all rewritten to foot URL** | Never bulk-replace all catbox `.js` URLs |

### 4.2 301 redirects

- Product 301s previously pointed at catbox HTML (broken MIME).  
- **Deleted via UI “Delete all”** 2026-07-13.  
- Live now: `/hire` → **404** (not ideal, but avoids text/plain trap).  
- Re-adding 301s: only to hosts with `Content-Type: text/html`, **or** keep `/?p=…` JS loaders.  
- Mutating redirects API often **412** without fresh login.

### 4.3 Designer vs Custom Code

- Designer visual content can be healthy while custom foot blanks `body`.  
- Interactions (IX) hide content until JS; custom unhide must run **after** Webflow’s `w-mod-js` class inject.  
- Order in live HTML: Webflow IX hide CSS → our unhide CSS → early unhide script → … → footer foot.

### 4.4 Assets / CDN

| Asset | Host | MIME | Risk |
|-------|------|------|------|
| Foot core | catbox `.js` | `application/javascript` | Empty upload |

exec
/bin/bash -lc "git show --format=fuller --stat 305aa3f ed69995 9645174 1f6615b e9b744a f228a61; git show --format= --name-status f228a61; rg -n 'v19[5-8]|design|brand|product pages|cooler|glow|knfmdf|hero-gold|mark-gold' DEMIGOD-COMPRESSED-STATE.md docs/exchange prompts/demigod demigod-keep-going.md DEMIGOD-*.md | head -n 400; rg -n 'dg-foot-v|dgFootVersion|__dgFootVer' demigod-foot-core.js demigod-footer-lite.html demigod-head-minimal.html demigod-head-styles.css | head -n 30" in /home/potter
 succeeded in 0ms:
commit 305aa3f6cdd7083a28dda73b5a09e581b9cad0fa
Author:     potter <potter@local>
AuthorDate: Mon Jul 13 13:37:55 2026 -0700
Commit:     potter <potter@local>
CommitDate: Mon Jul 13 13:37:55 2026 -0700

    Cohesion: full-check, freeze guards, honesty JSON, WIZ UX v196
    
    - bin/dg full-check + demigod-full-check spine; orca in tools registry/doctor/API
    - assertNotFrozen on foot-cdn + board publish (import-safe freeze module)
    - Board honesty writes DEMIGOD-BOARD-HONESTY.json for control plane
    - Foot v196: review-step chrome + safer forceMobileDesktopWIZ (no field thrash)
    - Head CSS: focus, FAQ, trust hover, 90day emphasis

 bin/dg                           |   8 +++
 demigod-agent-dashboard-ui.html  |   2 +-
 demigod-agent-dashboard.mjs      |  55 ++++++++++++++++++++
 demigod-board-publish.mjs        |   3 ++
 demigod-doctor.mjs               |  33 ++++++++++++
 demigod-foot-cdn-publish.mjs     |   3 ++
 demigod-foot-core.js             |  34 ++++++++++---
 demigod-full-check.mjs           |  81 ++++++++++++++++++++++++++++++
 demigod-head-styles.css          |  45 ++++++++++++++++-
 demigod-keep-going.md            |   2 +-
 demigod-publish-freeze.mjs       | 106 +++++++++++++++++++++++++++------------
 demigod-tools-registry.mjs       |  10 +++-
 demigod-verify-board-honesty.mjs |  47 ++++++++++++++---
 13 files changed, 378 insertions(+), 51 deletions(-)

commit ed69995222399979d11acf010b5944bfae2ef070
Author:     potter <potter@local>
AuthorDate: Tue Jul 14 10:47:06 2026 -0700
Commit:     potter <potter@local>
CommitDate: Tue Jul 14 10:47:06 2026 -0700

    Finish WIP: match honesty, freeze env, approve sample, orca pair, nav UX
    
    Codex+Claude tandem with Grok: no auto-seed fixtures; realProposed metrics;
    isFrozen honors DEMIGOD_PUBLISH_FREEZE; approve sets sample:true and skips
    CDN when frozen; pair HTTP localhost + chmod 600; dual match SoR note on
    bin/dg-match; restore top nav; scrub bare replacement-guarantee FOUC.

 bin/dg-match                    | 11 ++++++++
 bin/dg-orca                     | 11 +++++---
 demigod-agent-tools-lib.mjs     | 12 ++++++---
 demigod-control.mjs             | 19 +++++++++----
 demigod-foot-core.js            |  6 +++++
 demigod-head-styles.css         |  4 ++-
 demigod-match-review.mjs        | 50 +++++++++++++++++++++++-----------
 demigod-orca-bridge.mjs         | 16 +++++++----
 demigod-pairs-lib.mjs           | 13 ++++++---
 demigod-submissions-approve.mjs | 59 +++++++++++++++++++++++++++++++++--------
 10 files changed, 154 insertions(+), 47 deletions(-)

commit 9645174ca00fe4a1117634b1a5645d2693ba00df
Author:     potter <potter@local>
AuthorDate: Tue Jul 14 10:51:11 2026 -0700
Commit:     potter <potter@local>
CommitDate: Tue Jul 14 10:51:11 2026 -0700

    Build finish: mint approve, auto-propose quality, ship-prep, freeze guards
    
    - Approve routes through mintBoardEntry (sample default; freeze skips CDN)
    - Auto-propose min score 72 + sample flags; proposePair accepts sample
    - head-css + cm6 freeze aligned with status(); bin/dg ship-prep
    - Pilot shortlist dual-write marks sample; dash matches summary realProposed
    - Head FOUC slightly faster; registry/ship-prep wired

 bin/dg                          |  4 ++
 demigod-agent-dashboard.mjs     |  6 ++-
 demigod-auto-propose.mjs        | 60 ++++++++++++++++++++++------
 demigod-cm6-paste-publish.mjs   | 14 +++----
 demigod-head-css-publish.mjs    |  3 ++
 demigod-head-styles.css         |  2 +-
 demigod-match.mjs               |  3 +-
 demigod-pairs-lib.mjs           | 11 +++++-
 demigod-ship-prep.mjs           | 87 ++++++++++++++++++++++++++++++++++++++++
 demigod-submissions-approve.mjs | 88 +++++++++++++++++++++++++++--------------
 demigod-tools-registry.mjs      |  4 +-
 11 files changed, 228 insertions(+), 54 deletions(-)

commit 1f6615bf470d5cb6f770f220c3b52c0cd427ab82
Author:     potter <potter@local>
AuthorDate: Tue Jul 14 10:58:01 2026 -0700
Commit:     potter <potter@local>
CommitDate: Tue Jul 14 10:58:01 2026 -0700

    Ship live v196 foot + knfmdf head CSS (freeze off)
    
    CDN: bw18d5.js foot v196, knfmdf.css head. Custom code pasted+saved.
    Foot-cdn-publish hardened (curl fail-with-body, ver match). Queue-publish
    API 412 session flake; live already serving new assets.

 demigod-cm6-paste-publish.mjs |  17 +----
 demigod-foot-cdn-publish.mjs  |  46 +++++++----
 demigod-footer-lite.html      | 172 ++----------------------------------------
 demigod-footer-loader.html    |  35 +--------
 demigod-head-css-publish.mjs  |   6 +-
 demigod-head-minimal.html     |   2 +-
 6 files changed, 46 insertions(+), 232 deletions(-)

commit e9b744ad1ee3355cf3c5b7f139a4e7bb550c8fca
Author:     potter <potter@local>
AuthorDate: Tue Jul 14 11:06:33 2026 -0700
Commit:     potter <potter@local>
CommitDate: Tue Jul 14 11:06:33 2026 -0700

    Design v197: cooler UI system + sharpened site/form copy
    
    Hero/CTA/trust copy tightened (Linear/Mercury restraint). WIZ welcomes and
    field labels polished. Head CSS: gold glow, glass nav/modals, pill CTAs,
    cinematic hero. CDN d6h21f.js + wvblvl.css shipped via custom code.

 demigod-foot-core.js       |  40 +++++------
 demigod-footer-lite.html   |   4 +-
 demigod-footer-loader.html |   4 +-
 demigod-head-minimal.html  |   2 +-
 demigod-head-styles.css    | 168 +++++++++++++++++++++++++++++++++++++++++++++
 demigod-keep-going.md      |   2 +-
 6 files changed, 194 insertions(+), 26 deletions(-)

commit f228a613e098be209d5a6a73a2ffa4911603e1dd
Author:     potter <potter@local>
AuthorDate: Tue Jul 14 11:15:53 2026 -0700
Commit:     potter <potter@local>
CommitDate: Tue Jul 14 11:15:53 2026 -0700

    Great design v198: brand assets, product pages v3, home glow
    
    - Generated gold hero/mark assets on catbox; brandAssets() in foot
    - Product pages (how/hire/talent/pricing/…) premium shell v3 + hero band
    - Pages uploaded to catbox; DEMIGOD-PAGES.json map refreshed
    - Head CSS vjxyrf + foot ksbrmy.js; custom code saved live

 demigod-foot-core.js            |  26 ++--
 demigod-footer-lite.html        |   4 +-
 demigod-footer-loader.html      |   4 +-
 demigod-head-minimal.html       |   2 +-
 demigod-head-styles.css         |  41 +++++++
 demigod-keep-going.md           |   2 +-
 demigod-pages/_shell.css        | 196 ++++++++++++++++++++++++++++++
 demigod-pages/compare.html      | 262 ++++++++++++++++++++++++++++++++++++++++
 demigod-pages/faq.html          | 255 ++++++++++++++++++++++++++++++++++++++
 demigod-pages/hire.html         | 258 +++++++++++++++++++++++++++++++++++++++
 demigod-pages/how.html          |   3 +
 demigod-pages/network.html      |   3 +
 demigod-pages/pilot.html        | 258 +++++++++++++++++++++++++++++++++++++++
 demigod-pages/pricing.html      |   3 +
 demigod-pages/proof.html        | 248 +++++++++++++++++++++++++++++++++++++
 demigod-pages/talent.html       | 251 ++++++++++++++++++++++++++++++++++++++
 public/demigod/hero-gold-bg.jpg | Bin 0 -> 230416 bytes
 public/demigod/mark-gold.png    | Bin 0 -> 84469 bytes
 18 files changed, 1803 insertions(+), 13 deletions(-)
M	demigod-foot-core.js
M	demigod-footer-lite.html
M	demigod-footer-loader.html
M	demigod-head-minimal.html
M	demigod-head-styles.css
M	demigod-keep-going.md
A	demigod-pages/_shell.css
A	demigod-pages/compare.html
A	demigod-pages/faq.html
A	demigod-pages/hire.html
A	demigod-pages/how.html
A	demigod-pages/network.html
A	demigod-pages/pilot.html
A	demigod-pages/pricing.html
A	demigod-pages/proof.html
A	demigod-pages/talent.html
A	public/demigod/hero-gold-bg.jpg
A	public/demigod/mark-gold.png
DEMIGOD-AGENTS.md:9:**Designer:** https://talentlink-sf.design.webflow.com/  
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:132:- Roadmaps/Checklists: Appended to this index + DEMIGOD-EVENTS-FLOW etc. Refined with details. Refer HEAVY-STARTUP-CHECKLIST.md, DEMIGOD-GTM-DETAILED-ROADMAP.md, PRODUCT-ONBOARD etc. Updated for events, sourcing, matching design, Stripe when-ready, website (WIZ events, ledger).
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:157:- **Matching design**: demigod-matching-engine.mjs: scoreMatch + decideMatch (threshold 60, reasons 90d/skills/stage, humanLoop:true). MATCH_STATES const. Suggest + decide used in sim. Rubric per a16z/papers (skills 40-60%, 90d 20-30%).
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:281:- DEMIGOD-MATCHING-DESIGN.md, DEMIGOD-LEAD-SOURCING.md, DEMIGOD-STRIPE-INVOICE.md (design, 90d primary, pending, splits).
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:319:**Fable alignment (consult just completed):** Events/sourcing/matching/intro/Stripe design already good (human loop at gates, auto for sourcer/decide/intro/stub). Safety first for publish (read-back, prepare, fixed verify, no destructive loops). Next: GTM DM follow-ups from leads, 1 white-glove pilot logged, proof assets. Board real=0 until real receipts. No 48h promises.
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:334:## 2026-07-09 Continue: board honesty push, designer publish trigger, live poll, tools + GTM
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:360:## 2026-07-09 Keep going round: board clean (real=0), designer publish trigger, live poll, tools+sim, gates
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:374:**Fable/plan align:** publish safety (read-back, designer full pub, prepare), events good, focus GTM/pilots/honest data. 404 addressed by getting head live (unhide + research + WIZ).
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:379:## 2026-07-09 Keep going: board real=0 push, paste+readback, designer publish, live poll, human sim, tools, gates
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:396:## 2026-07-09 Keep going: board real=0 + publish, head paste+readback, designer full pub trigger, live poll 6x, human review/approve logged in MATCHES, tools (leads/decide), gates, GTM, docs
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:408:**Docs:** appended cycle (board clean, paste+designer pub, poll, human sim/approve, 404 root+fix via Fable publish safety, tools, GTM, next: confirm update, DM follow, white-glove pilot log, proof).
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:410:**Fable/plan:** publish safety (read-back, designer full, prepare), events/sourcing/matching/intro/Stripe design good (human at gates + heavy auto), focus GTM (15+ DMs from leads, 1 white-glove, proof), honest data, no loops without gates.
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:415:## 2026-07-09 Keep going: board real=0 + publish, head paste+readback, designer full pub, live poll, human approve logged, tools, gates, GTM, docs
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:427:**Docs:** appended (board, paste+designer pub, poll, human sim, 404 target via Fable safety, tools, GTM, next: confirm update, DM, white-glove pilot, proof).
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:429:**Fable align:** publish safety (read-back, designer full, prepare), events good, GTM focus (DMs from leads, pilot, proof), honest board.
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:434:## 2026-07-09 Keep going: board real=0 push, head paste+readback, designer full pub, live poll, human approve logged in MATCHES, tools, gates, GTM, docs
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:446:**Docs:** appended cycle (board, paste+designer pub, poll, human sim, 404 target via Fable publish safety, tools, GTM, next: confirm update, DM follow, white-glove pilot log, proof).
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:448:**Fable/plan:** publish safety (read-back, designer full, prepare), events good, GTM focus (DMs from leads, 1 white-glove, proof), honest board.
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:453:## 2026-07-09 Keep going: board real=0 + publish, head paste+readback, designer full pub, live poll, human approve logged, tools, gates, GTM, docs
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:465:**Docs:** appended cycle (board, paste+designer pub, poll, human sim, 404 target via Fable publish safety, tools, GTM, next: confirm update, DM follow, white-glove pilot log, proof).
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:467:**Fable align:** publish safety (read-back, designer full, prepare), events good, GTM focus (DMs from leads, 1 white-glove, proof), honest board.
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:472:## 2026-07-09 Keep going: board real=0 + publish, head paste+readback, designer full pub, live poll, human approve logged, tools, gates, GTM, docs
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:484:**Docs:** appended cycle (board, paste+designer pub, poll, human sim, 404 target via Fable publish safety, tools, GTM, next: confirm update, DM follow, white-glove pilot log, proof).
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:486:**Fable align:** publish safety (read-back, designer full, prepare), events good, GTM focus (DMs from leads, 1 white-glove, proof), honest board.
DEMIGOD-FUTURE-PLANS-AND-ASSETS-INDEX.md:499:- Next: poll until new Last Published + unhide-v4/90day/Talent/Events visible (no more 404/broken hidden state). Then human DM sends (log), white-glove pilot receipt, more 90d design proof. Fable safety respected (readback, scoped publish, no auto-destructive).
DEMIGOD-AGENT-LOOPS.md:1:# Demigod Agent Loops (Fable-led design, Grok execution)
DEMIGOD-AGENT-LOOPS.md:57:**Status:** Source ready, loops designed simple. Fable prompt launched for lead design. Executing per plan.
DEMIGOD-IMPROVED-ROADMAP.md:22:- Review: CDP audits, Fable design review, Figma for assets.
DEMIGOD-IMPROVED-ROADMAP.md:44:- Fable: use for design review, GTM planning, audits. Prompts with raw state.
DEMIGOD-STATE.md:27:Fable designs exact SEARCH/REPLACE only.
DEMIGOD-STATE.md:323:- Heavy website audit (code/design): Trust/ledger excellent, proof/scrubs strong. P1: kill 48h drift (hardened SPEED_LEAK + replace to "3-5 matches on fit"), modal title trim, "AI speed • Human trust" injected, 90d guarantee emphasis.
DEMIGOD-STATE.md:512:Fable noted: move pilots to private file long-term (board is public by design). Current redaction + local-only is the minimal safe step.
DEMIGOD-COMPRESSED-STATE.md:3:## 2026-07-13 · v195 LIVE SHIP
DEMIGOD-AGENT-COLLABORATION-PLAYBOOK-V2.md:29:Task: [SINGLE best for GTM/proof/onboard/sustain. Or specific: audit honesty, design SMS demo, roadmap X.]
DEMIGOD-HEAVY-HISTORY-DIGEST.md:23:### design
DEMIGOD-HEAVY-HISTORY-DIGEST.md:78:_2026-07-04T01:56:44.086Z_ · topics: forms, design, copy, partnership, cms, pipeline, competitive, legal, tech
DEMIGOD-HEAVY-HISTORY-DIGEST.md:83:_2026-07-04T01:57:25.145Z_ · topics: forms, design, copy, partnership, gtm, pipeline, competitive, legal, tech
DEMIGOD-HEAVY-HISTORY-DIGEST.md:85:_Date: 2026-07-04T01:57:25.145Z_ _Screenshot: /home/potter/audit-shots/audit/01-landing-2026-07-04T01-47-46-430Z.png_ w in LAUNCH MODE for trydemigod.com. ONE SESSION. STOP when you reply "✅ SHIP READY — v77 live + canvas clean + repo <15 files". 20 steps — do in order, no skipping, screenshot after each major group: 1-3 HUMAN (5min): Publish v77 foot-core to catbox as l0vbot.js. Update demigod-footer-lite.html loader + Webflow custom code embed. Publish site. 4-7 HUMAN (8min): In Webflow designer — delete exactly the 8 items from CANVAS DELETE LIST above. Rename any email-form orphans. Force…
DEMIGOD-HEAVY-HISTORY-DIGEST.md:88:_2026-07-04T01:57:25.151Z_ · topics: forms, design, copy, partnership, gtm, legal, tech
DEMIGOD-HEAVY-HISTORY-DIGEST.md:93:_2026-07-04T02:21:09.224Z_ · topics: forms, design, copy, partnership, gtm, pipeline, competitive, legal, tech
DEMIGOD-HEAVY-HISTORY-DIGEST.md:98:_2026-07-04T02:22:15.292Z_ · topics: forms, design, copy, partnership, gtm, pipeline, competitive, legal, tech
demigod-keep-going.md:126:- Events/Match Days (Fonzi-inspired + Demigod twist): Quarterly small curated SF "Match Days" (breakfast/poker style + structured 1:1 intros). Startups pay entry/sponsor fee for access to pre-vetted talent pool + human facilitation. Talent free/invite. Drives subs + brand + real intros. Low cost, high signal.
demigod-keep-going.md:137:**LATEST (Complete website code + design + every detail review, 2026-07-06):** 
demigod-keep-going.md:172:- Hygiene: ran tabs-cleanup (core kept: live, claude, designer, grok; cursor agents closed). No stray test procs.
demigod-keep-going.md:179:- Launched Fable prompt (full research + Demigod context + "take lead designing simple loops") via claude --model fable bg to /tmp/fable-agent-loops-output.txt (pending full; executed per plan).
demigod-keep-going.md:221:**LATEST (Exhaustive every-line + full site design/UX/code review loop w/ MCP screenshots + states + custom tests, 2026-07-07):** 
demigod-keep-going.md:381:- webflow-blocker shots are audit artifacts from designer/custom-code capture (not site bug).
demigod-keep-going.md:413:- CSS: full WIZ chrome (bar/glow, q/hint large Cinzel gold, nav, review), gold buttons with yellow hover lift + shadow, inputs focus rings, modal takeover, process grid, new subtle anims (gold-rise, glow, stagger on steps/rows), mobile 44/48px, dedupes.
demigod-keep-going.md:421:Continue GTM with new proof assets from design.
demigod-keep-going.md:424:User directive: current design bad, restore older gold/yellow heavy, Fable take control + work with Grok for extremely thorough overall (forms Typeform exact, every button/click works, mobile+desktop flawless, every aspect, new anims + assets generated).
demigod-keep-going.md:425:- Fable prompt written (/tmp/fable-thorough-gold-design.txt) + launched (bg).
demigod-keep-going.md:434:  - Full WIZ chrome: bigger elegant Q, glowing progress, review cards, transitions.
demigod-keep-going.md:435:  - New anims: gold-glow pulse on CTAs, rise stagger on steps/ledger/cands, hover lifts, reduced-motion safe.
demigod-keep-going.md:703:- SMS onboard demoed: sim for "design Figma SF" + "PM GTM" → profile → opt-in → pilot logged. Inbox ~64 (10+ new, mostly SMS cands). GTM helper confirms templates promote "+1 (415) 555-DEMO (pending)".
demigod-keep-going.md:900:Sweep/recruit ready, 5+ SMS pilots, 10 new inbox cands (designer/PM), ready DMs  (gtm-heavy), CDP CTAs true, demo in v147 local/recent. Verify pass.
demigod-keep-going.md:984:- Research: multi-agent best (specialization, MCP, subagents, Cursor+Claude), SaaS design (Linear clean, Stripe forms).
demigod-keep-going.md:1006:- Executed: perfect forms (fields, copy), design polish, animations, other pages, agent scripts, laptop.
demigod-keep-going.md:1020:The design overhaul is complete and working on the pushed version. 
demigod-keep-going.md:1048:- Gold theme, animations, WIZ chrome (Cinzel gold Q, progress glow, etc.) intact from CSS.
demigod-keep-going.md:1051:Fresh shots and CDP data confirm. Fable-led design + loops from prior research applied via fixes. Core features solid for talent matching + revenue.
demigod-keep-going.md:1057:- Active loop: SHIP website stability + product pages UX
demigod-keep-going.md:1059:- foot_ver_disk: v198
demigod-keep-going.md:1112:- Full CDP + script + terminal + process + board + Fable file audit completed. Screenshots: /tmp/audit-live-hero-full.png, audit-wiz-*.png (hero->hire->steps email/advances), audit-designer-overview.png + old ones. Evidence of actual: WIZ advances, clicks/fills work, but live old CDN (8ad7s0), high vis inputs/steps vs expected isolation; gold partial; verifies pass.
demigod-keep-going.md:1149:- Tabs: 5 (cursor + core 4: live, claude, designer, grok) — within budget.
demigod-keep-going.md:1270:**Loop 2026-07-07 (code/design review + fixes + monetize):**
demigod-keep-going.md:1282:- Live state: startup q good, vis low on welcome (design), bad static reduced by scrub; eng vis good in some.
demigod-keep-going.md:1292:- Design: from MCP/puppeteer shots (home, modals open/advanced, mobile), WIZ chrome present (q, next, head), but visInputs low on some (welcome design + timing); static "HIRING FORM" leaks in live/old; good structure but "EXAMPLE" in ledger/headers reduces trust.
demigod-keep-going.md:1339:Loop: bloat reduce in WIZ force (consolidated passes), insights+lorem hide stronger, fresh CDN publish ogozjt+, gates+smoke green, form WIZ 90d+review explicit, CTA #, design audit (lorem scrubbed in code). Live delivery needs Webflow CC update to new src + publish. Form fixed in canonical. Next: internal GTM/pilot tools.
demigod-keep-going.md:1340:Loop cycle complete: site form/design perfect (bloat reduced, WIZ 90d+review explicit, insights scrubbed, gates pass, fresh CDN aji9m9 + loader ready in /tmp). Internal next: pilot-logger + --report + 90d support added (ties to WIZ field). Continuing: more internal or GTM or audit. Always verify.
demigod-keep-going.md:1341:GTM next: enhanced dm-helper to call out 90d-outcome (from WIZ) for stronger founder DMs. Pilot tools report 90d. Site form/design loop solid (bloat cut, scrubs, verified). Live force with aji9m9 running for confirmation. Next ahead: generate fresh DMs from board, enhance submissions triage for briefs, or bin/df for Fable GTM plan. Keep simple + verify.
demigod-keep-going.md:1409:Playtest timed on nav (CDP flakiness common). But source gates + board OK + code has 90d+review + design CSS good + forces in place + footer aji9m9. Positive perfect for source/design. Live validated via force scripts. Next: GTM volume + internal dashboard (html+json stub built) + perhaps more polish or df plan follow.
demigod-keep-going.md:1410:2026-07-07T14:39:19-07:00 Scheduler 30m heartbeat created (verify+gtm+reports). Lean internal dashboard built (html served on :3456, includes 90d). GTM fresh 3 DMs. Playtest nav timeout (CDP). Site source+design perfect. Next after this: run dashboard, more DM volume or X variants, pilot real 90d log, or df follow-up. Keep simple.
DEMIGOD-GTM-DETAILED-ROADMAP.md:9:- Board clean (3 roles: Product Manager Pre-seed B2B SaaS GTM/roadmap/user research $160-200k+equity; Founding Designer Seed Consumer Figma/brand; Head of Growth Series A Fintech PLG/paid/ analytics $180-240k). 2 seed cands. 0 pilots. signal real=0/0. Only sample receipt.
DEMIGOD-OUTREACH-TEMPLATES.md:99:3. **Chai Discovery**: Hey — SF design eng role? 8 real roles on board, 24 receipts. Design systems focus, SF culture. I know fits who would thrive. Fast human or $100. Brief?
DEMIGOD-COMPRESSED-STATE.md:3:## 2026-07-13 · v195 LIVE SHIP
DEMIGOD-COMPETITOR-ANALYSIS.md:13:| Lemon.io | Curated senior devs for startups (Europe/LatAm/US) | Month-to-month sub or hourly, buyout fee for direct. High manual vet (top 1-3%). | 24h match, flexible scaling, manual human vet every stage (no "AI bullshit"), ready profiles. | Quality for startups, speed, flexibility. | Not SF-specific, contract focus, buyout fees. | Demigod: human + local network, full-time matching emphasis?, luxury branding. |
prompts/demigod/MASTER-IMPROVE-CLAUDE.md:3:You are a senior full-stack product engineer + design lead operating on the live Demigod codebase at `/home/potter`. Demigod is a Webflow-hosted talent-matching product (startups ↔ engineers). Your mandate: raise the quality of the site end-to-end — design, UI/UX, forms, copy, features, pages, bugs, code quality, testing — and leave it in a demonstrably shippable, honest, verified state. Work like an owner: plan first, make surgical changes to the canonical files, verify every change, and never publish anything you have not proven correct.
prompts/demigod/MASTER-IMPROVE-CLAUDE.md:18:5. **Human owns the Publish click.** You PREPARE (CDN upload, custom-code paste via CDP, diffs, screenshots, verification). Do not force-publish. Never set `DEMIGOD_FORCE_PUBLISH` to bypass freeze guards. Respect any active freeze (`assertNotFrozen`) — if a freeze is on, do design/code/test work on disk only and STOP before shipping.
prompts/demigod/MASTER-IMPROVE-CLAUDE.md:59:- **Visual system:** consistent spacing scale, type scale, color tokens, radius, shadow, and a coherent light/dark treatment. Remove one-off inline styles that fight the system. Ensure brand assets (logo, glow, hero) render sharp on retina.
prompts/demigod/MASTER-IMPROVE-CODEX.md:3:You are the principal product engineer and design director implementing a disciplined, conversion-focused improvement pass for Demigod, a pre-services SF startup talent-matching company. Work in `/home/potter`. The public site is `https://www.trydemigod.com`; the Webflow project is `talentlink-sf`. Begin every internal planning/review prompt with: **“Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty.”**
prompts/demigod/MASTER-IMPROVE-CODEX.md:9:Before editing, read `AGENTS.md`, `DEMIGOD-COMPRESSED-STATE.md`, `DEMIGOD-AGENTS.md`, `DEMIGOD-WORKFLOW.md`, and the current source files below. Do not trust old version tables over current disk truth: `demigod-foot-core.js` is currently v198 (`/*dg-foot-v198-core*/` and `window.dgFootVersion='v198'`). Inspect git status and preserve unrelated user changes.
prompts/demigod/MASTER-IMPROVE-CODEX.md:14:- `demigod-head-styles.css`: canonical design system and responsive styling.
prompts/demigod/MASTER-IMPROVE-CODEX.md:46:Never pair “Hire talent” with “Find talent”; those both read as company-side actions. Do not create three equal hero buttons. Partner/referral is a tertiary navigation/footer path, not a hero peer. Audit nav, hero, mobile sticky bar, section CTAs, product pages, modal links, and footer so labels remain consistent and every CTA reaches the intended WIZ or page. Avoid CTA overload and repeated pill bars that compete with the hero.
prompts/demigod/MASTER-IMPROVE-CODEX.md:60:If the current static sources already provide these pages, improve and normalize them rather than inventing parallel pages. Ensure every page has a stable product route served with `text/html`, canonical URL, unique title/description, OG/Twitter metadata, one H1, logical headings, working nav, footer, and appropriate CTA. Use a common shell/design token source rather than eight drifting inline copies when this can be done safely within the current static publish system. Keep `/pilot` non-indexed or clearly pre-services if it remains operational rather than public marketing.
prompts/demigod/MASTER-IMPROVE-CODEX.md:66:Use near-black warm backgrounds, subtly differentiated surfaces, quiet borders, high-contrast warm white text, muted stone secondary text, and gold as a scarce action/signal color. Gold should feel metallic through restrained tonal variation, not yellow neon. Define tokens in `demigod-head-styles.css` and reuse them in `_shell.css`: background tiers, text tiers, gold/hover gold, border, focus, danger/success, radii, shadows, spacing, container widths, and type scale. Prefer CSS gradients/noise made with lightweight CSS; avoid heavy texture images and gratuitous glows.
prompts/demigod/MASTER-IMPROVE-CODEX.md:84:The home page should not pretend the sample ledger is proof. Prefer a transparent “Examples of the briefs we are designed to handle” section with local Sample badges. If a dynamic board has no honest entries, render a deliberate empty state, not a blank region and not fabricated fallback candidates. Any pipeline note must count sample versus real correctly.
prompts/demigod/MASTER-IMPROVE-CODEX.md:116:4. **Catbox HTML MIME.** Raw Catbox `.html` is served as `text/plain` and is not a valid navigable product page. Never link or `location.replace` public users directly to raw Catbox HTML. Publish/serve product pages through proper Webflow/same-origin HTML routes or another endpoint that returns `text/html`; JS product loading must validate MIME and body markers before rendering. Keep the source comment’s invariant and extend tests.
prompts/demigod/MASTER-IMPROVE-CODEX.md:163:1. Baseline and lock the canonical foot; confirm v198 disk truth, current CDN URL, live version, hash state, and freeze state.
prompts/demigod/MASTER-IMPROVE-CODEX.md:174:### P1 — coherent premium design and complete product pages
prompts/demigod/MASTER-IMPROVE-CODEX.md:180:3. Normalize the eight public product pages to the shared shell, copy contract, nav/footer, metadata, and correct audience CTA.
prompts/demigod/MASTER-IMPROVE-CODEX.md:206:- Exactly one canonical foot request and exact v198-or-new version; JS content type/body marker/hash; zero uncaught page errors.
prompts/demigod/MASTER-IMPROVE-CODEX.md:233:4. If foot changed, bump the version above v198 consistently, publish the exact canonical bytes through the existing CDN publisher, retrieve them, verify byte/hash equality, JavaScript MIME/body marker, and update only the single CDN URL in `demigod-footer-lite.html`.
prompts/demigod/MASTER-IMPROVE-CODEX.md:235:6. If product pages changed, publish them through the proper HTML-serving route/manifest. Validate `text/html`; never substitute raw Catbox `.html` redirects.
prompts/demigod/MASTER-IMPROVE-FABLE.md:1:# DEMIGOD.COM — MASTER IMPLEMENTATION PROMPT (v198 → v210)
prompts/demigod/MASTER-IMPROVE-FABLE.md:3:**Role for the executor:** You are the implementing engineer (Grok/Cursor/Composer). Fable (design/product lead) authored this spec. Demigod is a Webflow-hosted talent-matching marketplace connecting SF/remote startups with vetted engineers. Current phase: **GTM + pre-services honesty**. Site is "mostly done" per Heavy authority — this is a *refinement and hardening* pass, not a redesign. Minimal-surface, high-craft changes only.
prompts/demigod/MASTER-IMPROVE-FABLE.md:12:- **Site JS:** edit **only** `demigod-foot-core.js` (the canonical foot custom-code, currently v198). Never edit the CDN-mirrored `.live-*.js` artifacts — those are outputs.
prompts/demigod/MASTER-IMPROVE-FABLE.md:49:**Goal:** one coherent system, tokenized, light+dark safe, WCAG AA. Currently the "cooler UI system" (v197) — tighten it, don't reinvent.
prompts/demigod/MASTER-IMPROVE-FABLE.md:53:- **Color:** `--bg`, `--bg-elev`, `--surface`, `--border`, `--text`, `--text-muted`, `--accent` (single brand accent + `--accent-hover`, `--accent-contrast`), `--success`, `--warn`, `--danger`. Provide `@media (prefers-color-scheme: dark)` overrides. Every text/background pair must pass **4.5:1** (body) / **3:1** (large). Validate with a contrast check in `verify:live`.
prompts/demigod/MASTER-IMPROVE-FABLE.md:59:- All animations wrapped in `@media (prefers-reduced-motion: no-preference)`. Reduced-motion users get instant states — no hero glow pulse, no scroll reveals. (History: unbounded animations caused FOUC/flash.)
prompts/demigod/MASTER-IMPROVE-FABLE.md:73:- Hero glow (v198) must respect reduced-motion and never cause layout shift (CLS ~0).
prompts/demigod/MASTER-IMPROVE-FABLE.md:99:- **Stepper integrity:** exactly one step visible at a time; Next disabled until required fields valid; Back preserves entered data; progress indicator accurate. **Live smoke must assert only the current step's fields are visible** (history v197 break: all 7 fields visible, stepper gone).
prompts/demigod/MASTER-IMPROVE-FABLE.md:154:1. **WIZ stepper live integrity** — verify not-frozen, stepper renders, one step visible, submit reaches confirmation (guard against v197-class regression).
prompts/demigod/MASTER-IMPROVE-FABLE.md:181:- **Version discipline:** bump `v198 → v199…` on every shipped change; stamp `DG-PUB` marker; keep `md5` reproducible for CDN==disk verification.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:5:1. **Codex** (`prompts/demigod/MASTER-IMPROVE-CODEX.md`) — principal engineer + design director voice
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:6:2. **Claude** (`prompts/demigod/MASTER-IMPROVE-CLAUDE.md`) — senior product engineer + design lead voice
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:136:You are the principal product engineer and design director implementing a disciplined, conversion-focused improvement pass for Demigod, a pre-services SF startup talent-matching company. Work in `/home/potter`. The public site is `https://www.trydemigod.com`; the Webflow project is `talentlink-sf`. Begin every internal planning/review prompt with: **“Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty.”**
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:142:Before editing, read `AGENTS.md`, `DEMIGOD-COMPRESSED-STATE.md`, `DEMIGOD-AGENTS.md`, `DEMIGOD-WORKFLOW.md`, and the current source files below. Do not trust old version tables over current disk truth: `demigod-foot-core.js` is currently v198 (`/*dg-foot-v198-core*/` and `window.dgFootVersion='v198'`). Inspect git status and preserve unrelated user changes.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:147:- `demigod-head-styles.css`: canonical design system and responsive styling.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:179:Never pair “Hire talent” with “Find talent”; those both read as company-side actions. Do not create three equal hero buttons. Partner/referral is a tertiary navigation/footer path, not a hero peer. Audit nav, hero, mobile sticky bar, section CTAs, product pages, modal links, and footer so labels remain consistent and every CTA reaches the intended WIZ or page. Avoid CTA overload and repeated pill bars that compete with the hero.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:193:If the current static sources already provide these pages, improve and normalize them rather than inventing parallel pages. Ensure every page has a stable product route served with `text/html`, canonical URL, unique title/description, OG/Twitter metadata, one H1, logical headings, working nav, footer, and appropriate CTA. Use a common shell/design token source rather than eight drifting inline copies when this can be done safely within the current static publish system. Keep `/pilot` non-indexed or clearly pre-services if it remains operational rather than public marketing.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:199:Use near-black warm backgrounds, subtly differentiated surfaces, quiet borders, high-contrast warm white text, muted stone secondary text, and gold as a scarce action/signal color. Gold should feel metallic through restrained tonal variation, not yellow neon. Define tokens in `demigod-head-styles.css` and reuse them in `_shell.css`: background tiers, text tiers, gold/hover gold, border, focus, danger/success, radii, shadows, spacing, container widths, and type scale. Prefer CSS gradients/noise made with lightweight CSS; avoid heavy texture images and gratuitous glows.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:217:The home page should not pretend the sample ledger is proof. Prefer a transparent “Examples of the briefs we are designed to handle” section with local Sample badges. If a dynamic board has no honest entries, render a deliberate empty state, not a blank region and not fabricated fallback candidates. Any pipeline note must count sample versus real correctly.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:249:4. **Catbox HTML MIME.** Raw Catbox `.html` is served as `text/plain` and is not a valid navigable product page. Never link or `location.replace` public users directly to raw Catbox HTML. Publish/serve product pages through proper Webflow/same-origin HTML routes or another endpoint that returns `text/html`; JS product loading must validate MIME and body markers before rendering. Keep the source comment’s invariant and extend tests.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:296:1. Baseline and lock the canonical foot; confirm v198 disk truth, current CDN URL, live version, hash state, and freeze state.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:307:### P1 — coherent premium design and complete product pages
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:313:3. Normalize the eight public product pages to the shared shell, copy contract, nav/footer, metadata, and correct audience CTA.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:339:- Exactly one canonical foot request and exact v198-or-new version; JS content type/body marker/hash; zero uncaught page errors.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:366:4. If foot changed, bump the version above v198 consistently, publish the exact canonical bytes through the existing CDN publisher, retrieve them, verify byte/hash equality, JavaScript MIME/body marker, and update only the single CDN URL in `demigod-footer-lite.html`.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:368:6. If product pages changed, publish them through the proper HTML-serving route/manifest. Validate `text/html`; never substitute raw Catbox `.html` redirects.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:381:You are a senior full-stack product engineer + design lead operating on the live Demigod codebase at `/home/potter`. Demigod is a Webflow-hosted talent-matching product (startups ↔ engineers). Your mandate: raise the quality of the site end-to-end — design, UI/UX, forms, copy, features, pages, bugs, code quality, testing — and leave it in a demonstrably shippable, honest, verified state. Work like an owner: plan first, make surgical changes to the canonical files, verify every change, and never publish anything you have not proven correct.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:396:5. **Human owns the Publish click.** You PREPARE (CDN upload, custom-code paste via CDP, diffs, screenshots, verification). Do not force-publish. Never set `DEMIGOD_FORCE_PUBLISH` to bypass freeze guards. Respect any active freeze (`assertNotFrozen`) — if a freeze is on, do design/code/test work on disk only and STOP before shipping.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:437:- **Visual system:** consistent spacing scale, type scale, color tokens, radius, shadow, and a coherent light/dark treatment. Remove one-off inline styles that fight the system. Ensure brand assets (logo, glow, hero) render sharp on retina.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:536:# DEMIGOD.COM — MASTER IMPLEMENTATION PROMPT (v198 → v210)
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:538:**Role for the executor:** You are the implementing engineer (Grok/Cursor/Composer). Fable (design/product lead) authored this spec. Demigod is a Webflow-hosted talent-matching marketplace connecting SF/remote startups with vetted engineers. Current phase: **GTM + pre-services honesty**. Site is "mostly done" per Heavy authority — this is a *refinement and hardening* pass, not a redesign. Minimal-surface, high-craft changes only.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:547:- **Site JS:** edit **only** `demigod-foot-core.js` (the canonical foot custom-code, currently v198). Never edit the CDN-mirrored `.live-*.js` artifacts — those are outputs.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:584:**Goal:** one coherent system, tokenized, light+dark safe, WCAG AA. Currently the "cooler UI system" (v197) — tighten it, don't reinvent.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:588:- **Color:** `--bg`, `--bg-elev`, `--surface`, `--border`, `--text`, `--text-muted`, `--accent` (single brand accent + `--accent-hover`, `--accent-contrast`), `--success`, `--warn`, `--danger`. Provide `@media (prefers-color-scheme: dark)` overrides. Every text/background pair must pass **4.5:1** (body) / **3:1** (large). Validate with a contrast check in `verify:live`.
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:594:- All animations wrapped in `@media (prefers-reduced-motion: no-preference)`. Reduced-motion users get instant states — no hero glow pulse, no scroll reveals. (History: unbounded animations caused FOUC/flash.)
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:608:- Hero glow (v198) must respect reduced-motion and never cause layout shift (CLS ~0).
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:634:- **Stepper integrity:** exactly one step visible at a time; Next disabled until required fields valid; Back preserves entered data; progress indicator accurate. **Live smoke must assert only the current step's fields are visible** (history v197 break: all 7 fields visible, stepper gone).
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:689:1. **WIZ stepper live integrity** — verify not-frozen, stepper renders, one step visible, submit reaches confirmation (guard against v197-class regression).
prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md:716:- **Version discipline:** bump `v198 → v199…` on every shipped change; stamp `DG-PUB` marker; keep `md5` reproducible for CDN==disk verification.
demigod-foot-core.js:1:/*dg-foot-v198-core*/
demigod-foot-core.js:2:window.dgFootVersion = 'v198'; console.log('[demigod] foot v198-core loaded');
demigod-foot-core.js:1098:window.__dgFootVer='198';console.log('Demigod v198');

exec
/bin/bash -lc "git status --short; git show --format= --name-status 3029ead | sed -n '1,220p'; sed -n '1,180p' docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md; sed -n '1,180p' docs/exchange/DEMIGOD-TALENT-ENG-SHIP-2026-07-10.md; sed -n '1,180p' docs/exchange/DEMIGOD-DASHBOARD-V2-2026-07-13.md; sed -n '1,160p' docs/exchange/DEMIGOD-AGENT-TOOLING-2026-07-13.md; sed -n '1,180p' docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md" in /home/potter
 succeeded in 0ms:
 M demigod-auto-propose.mjs
 M demigod-candidate-copy-pass.mjs
 M demigod-canvas-simplify.mjs
 M demigod-cms-legal-pass.mjs
 M demigod-designer-bloat-delete.mjs
 M demigod-designer-form-rename.mjs
 M demigod-drift-fix-pass.mjs
 M demigod-final-publish-pass.mjs
 M demigod-fix-custom-code.mjs
 M demigod-forms-orphan-delete.mjs
 M demigod-full-ship-pass.mjs
 M demigod-ghost-push.mjs
 M demigod-hero-canvas-cleanup.mjs
 M demigod-legal-page-pass.mjs
 M demigod-legal-publish.mjs
 M demigod-master-only-pass.mjs
 M demigod-match.mjs
 M demigod-nav-forms-pass.mjs
 M demigod-nav-master-pass.mjs
 M demigod-partnerships-page-pass.mjs
 M demigod-partnerships-publish-pass.mjs
 M demigod-partnerships-rename-pass.mjs
 M demigod-pricing-canvas-delete.mjs
 M demigod-publish-foot.mjs
 M demigod-resume-field-pass.mjs
 M demigod-route-pages-pass.mjs
 M demigod-seo-nav-forms-pass.mjs
 M demigod-ship-head-now.mjs
 M demigod-source-truth-pass.mjs
 M demigod-webflow-ai-ship.mjs
?? .claude.json
?? .cursorignore
?? .factory/
?? .finch/
?? .form-html.mjs
?? .gemini/
?? .gitconfig
?? .hermes/
?? .kimi-code/
?? .live-bok9ax.json
?? .live-foot-34hqh2.js
?? .live-home.html
?? .live-jj45v9.css
?? .live-mdxwq2.js
?? .mozilla/
?? .omp/
?? .openclaude/
?? .orca-run-demigod-sequence.py
?? .orca-run-demigod-sequence.sh
?? .orca/
?? .pi/
?? .pki/
?? .pyenv/
?? .sudo_as_admin_successful
?? .vscode/
?? .wget-hsts
?? .wine/
?? .zshrc
?? AI-HYBRID-COLLABORATION-PLAYBOOK.md
?? AUDIO-AUDIT.md
?? CDP-TAB-CLEANUP.json
?? CLAUDE-PERMISSIONS-NOTE.md
?? CLAUDE.md
?? COMPETITOR-ANALYSIS.md
?? DEV-WORKSPACE-SETUP.json
?? EAT-THE-SOUNDS-DESIGN.md
?? Firefox_wallpaper.png
?? GAME-CODE-BUNDLE-STATS.json
?? GAME-CODE-COMPLETE-BUNDLE.txt
?? GAME-CODE-DESIGN-DIGEST.md
?? GAME-CODE-MANIFEST.md
?? GAME-DESIGN-DOC-HEAVY-FULL.md
?? GAME-DESIGN-DOC-HEAVY-V2.md
?? GAME-DESIGN-DOC-HEAVY.md
?? GAME-DESIGN-DOC.md
?? GTM-HEAVY-NEXT-LIST.md
?? LAPTOP-HEALTH.json
?? LAPTOP-SETTINGS.json
?? LOOP-STATE.json
?? NEW-PLAYER-PLAYTEST.md
?? NOTES-FOR-SUPERGROK-HEAVY.md
?? ORCA-PAIR-EMAIL-STATUS.txt
?? README.md
?? REVIEW-3rooms-notes.md
?? REVIEW-smoothwalk-notes.md
?? SHARE-WITH-NINJAWHEE.txt
?? SIGNAL-THEATER.json
?? STORE-TILE-LAYOUT-PLAN.md
?? THOROUGH-PLAYTEST.md
?? TYPING-PERF-FIX.json
?? agent-dev.sh
?? assets/
?? audio-audit-playtest.mjs
?? audio-bus.js
?? audit-cohesion.mjs
?? audit-interact-audit.mjs
?? audit-intro.png
?? audit-jazz4-overworld.png
?? audit-map.mjs
?? audit-overworld.png
?? audit-review.mjs
?? audit-shot-01-intro.png
?? audit-shot-02-moon-pad.png
?? audit-shot-03-simon-pad.png
?? audit-shot-04-register.png
?? bin/df
?? bin/dgsnap
?? bin/fable-to-cursor
?? bin/speed-optimize
?? build-game-code-bundle.mjs
?? build-game-design-summary.mjs
?? capture-screenshots.mjs
?? cdp-close-tabs.mjs
?? cdp-config.mjs
?? chrome-cursor-tab.mjs
?? clarity-moon-pad.png
?? clarity-store-wide.png
?? clarity-vinyl-playing.png
?? claude-lib.mjs
?? collab-lib.mjs
?? collision-walk-test.mjs
?? completionist-playtest.mjs
?? continuous-improve-loop.mjs
?? cursor-agent-ready.png
?? cursor-agent-snap.txt
?? cursor-agent-submitted.png
?? cursor-agents-now.png
?? cursor-click-w-chip.mjs
?? cursor-cloud-agents-snapshot.txt
?? cursor-composer-probe.mjs
?? cursor-composer-probe.png
?? cursor-computer-use.mjs
?? cursor-configure-environment.mjs
?? cursor-crash-watchdog.mjs
?? cursor-dashboard-setup.mjs
?? cursor-demigod-dispatched.png
?? cursor-demigod-submit2.png
?? cursor-enable-mcps-menu.mjs
?? cursor-enable-webflow-mcp.mjs
?? cursor-env-configured.png
?? cursor-env-detail.png
?? cursor-env-saved.png
?? cursor-explore-all.mjs
?? cursor-loop-dispatch.png
?? cursor-mcps-menu-open.png
?? cursor-plugin-mcp-edit.png
?? cursor-plugin-mcps.png
?? cursor-plugin-snapshot.txt
?? cursor-plugin-webflow.png
?? cursor-retry-after.png
?? cursor-retry-crash.mjs
?? cursor-setup-agent-detail.png
?? cursor-setup-agent-started.png
?? cursor-setup-agent.mjs
?? cursor-setup-session.png
?? cursor-snap-after-click.json
?? cursor-snap-after-click.png
?? cursor-snap-goto.json
?? cursor-snap-goto.png
?? cursor-snap-snapshot.json
?? cursor-snap-snapshot.png
?? cursor-submit-agent.mjs
?? cursor-tab-shot.png
?? cursor-tab-snapshot.json
?? cursor-tasks.md
?? cursor-w-chip-open.png
?? cursor-webflow-enable-deep.mjs
?? cursor-webflow-mcp-enabled.png
?? cursor-webflow-mcp-toggle.mjs
?? custom-code-snap.txt
?? dcss-move-test.mjs
?? demigod-assets/brand/
?? demigod-board-publish.mjs.bak
?? demigod-board.corrupt-0706T0318.bak.json
?? demigod-board.json.bak-1783505726
?? demigod-cdp-chunks/
?? demigod-copy-denylist.txt
?? demigod-events-data.json
?? demigod-foot-core.b64
?? demigod-foot-core.js.bak-broken
?? demigod-foot-core.js.bak.slim
?? demigod-foot-core.js.bak.v145-slim.1783278777
?? demigod-foot-core.js.trust-bak
?? demigod-foot-oneline.txt
?? demigod-foot-v19.txt
?? demigod-gtm-autolog.txt
?? demigod-oauth-setup.md
?? demigod-ops/
?? demigod-orca-hybrid.sh
?? demigod-outreach/
?? demigod-sms-state.json
?? demigod/
?? dm-send-log.txt
?? docs/
?? easter-eggs.js
?? eat-the-sounds/
?? explore-playtest.mjs
?? fetch-grok-pixel-art.mjs
?? fetch-heavy-code.mjs
?? find-quest-sarah-playtest.mjs
?? fix-github-overworld.mjs
?? force-paste-custom.mjs
?? game-dialogue-check.png
?? game-progress.js
?? game-root.mjs
?? game-screenshot.png
?? github-repos.png
?? grok-collab.mjs
?? grok-diagnose.png
?? grok-heavy-reply.txt
?? grok-input.txt
?? grok-new.txt
?? grok-new2.txt
?? grok-rhythm-direction.mjs
?? grok-snapshot.txt
?? grok-tail.txt
?? grok-visual-direction.mjs
?? gtm-proof-1783310522494-site.png
?? gtm-proof-1783310522494.json
?? gtm-proof-1783310730194-site.png
?? gtm-proof-1783310730194.json
?? hahahacks-2026/
?? heavy-code-diagnose.mjs
?? heavy-collect-ambient-jazz.mjs
?? heavy-collect-audit.mjs
?? heavy-collect-bugfix-round.mjs
?? heavy-collect-collision.mjs
?? heavy-collect-completionist.mjs
?? heavy-collect-cooperation-workflow.mjs
?? heavy-collect-cursor-game-help.mjs
?? heavy-collect-dcss.mjs
?? heavy-collect-design-doc-now.mjs
?? heavy-collect-design-text.mjs
?? heavy-collect-design.mjs
?? heavy-collect-dialogue.mjs
?? heavy-collect-full-audit.mjs
?? heavy-collect-full-cohesion.mjs
?? heavy-collect-full-design-doc.mjs
?? heavy-collect-game-design.mjs
?? heavy-collect-hear-records.mjs
?? heavy-collect-improve.mjs
?? heavy-collect-interact.mjs
?? heavy-collect-interior-fix.mjs
?? heavy-collect-loose-ends.mjs
?? heavy-collect-mutuals-lore.mjs
?? heavy-collect-overworld-store.mjs
?? heavy-collect-passive.mjs
?? heavy-collect-pause-journal.mjs
?? heavy-collect-perf-review.mjs
?? heavy-collect-pixel-overworld.mjs
?? heavy-collect-pixel.mjs
?? heavy-collect-playtest-report.mjs
?? heavy-collect-progress.mjs
?? heavy-collect-review-final.mjs
?? heavy-collect-review.mjs
?? heavy-collect-rhythm-extend.mjs
?? heavy-collect-rhythm-longer.mjs
?? heavy-collect-rhythm-multisong.mjs
?? heavy-collect-rhythm-polish.mjs
?? heavy-collect-ship-status.mjs
?? heavy-collect-ship-verdict.mjs
?? heavy-collect-simplify.mjs
?? heavy-collect-smoothwalk.mjs
?? heavy-collect-sniff-test.mjs
?? heavy-collect-spacious-store.mjs
?? heavy-collect-store-layout.mjs
?? heavy-collect-store-pass.mjs
?? heavy-collect-tuning.mjs
?? heavy-collect-vinyl-text.mjs
?? heavy-collect-walk-fix.mjs
?? heavy-collect-walk-perf.mjs
?? heavy-dialogue-art.js
?? heavy-launch-cdp.mjs
?? heavy-puppeteer-fetch2.mjs
?? heavy-runtime.js
?? heavy-send-ambient-jazz.mjs
?? heavy-send-audit.mjs
?? heavy-send-bugfix-round.mjs
?? heavy-send-bugfix-round2.mjs
?? heavy-send-collision.mjs
?? heavy-send-completionist.mjs
?? heavy-send-cooperation-workflow.mjs
?? heavy-send-cursor-game-help.mjs
?? heavy-send-cursor-nudge.mjs
?? heavy-send-dcss.mjs
?? heavy-send-demigod-forms.mjs
?? heavy-send-design-dialogue-round2.mjs
?? heavy-send-design-dialogue.mjs
?? heavy-send-design-doc-digest.mjs
?? heavy-send-design-doc-final.mjs
?? heavy-send-design-doc-v2.mjs
?? heavy-send-design-open.mjs
?? heavy-send-design-review.mjs
?? heavy-send-design.mjs
?? heavy-send-dialogue.mjs
?? heavy-send-floor-ux.mjs
?? heavy-send-full-audit.mjs
?? heavy-send-full-cohesion.mjs
?? heavy-send-full-design-doc.mjs
?? heavy-send-game-design.mjs
?? heavy-send-hear-records.mjs
?? heavy-send-improve.mjs
?? heavy-send-improvements.mjs
?? heavy-send-interact.mjs
?? heavy-send-interior-fix.mjs
?? heavy-send-inventory.mjs
?? heavy-send-layout-collision.mjs
?? heavy-send-loose-ends.mjs
?? heavy-send-master-audit.mjs
?? heavy-send-mutuals-lore.mjs
?? heavy-send-once.mjs
?? heavy-send-orca-pair.mjs
?? heavy-send-overworld-store.mjs
?? heavy-send-pause-journal.mjs
?? heavy-send-perf-review.mjs
?? heavy-send-pixel-intro.mjs
?? heavy-send-pixel-overworld.mjs
?? heavy-send-playtest-report.mjs
?? heavy-send-portrait-fix.mjs
?? heavy-send-portrait-review.mjs
?? heavy-send-progress.mjs
?? heavy-send-review-final.mjs
?? heavy-send-review-round7.mjs
?? heavy-send-review.mjs
?? heavy-send-rhythm-extend.mjs
?? heavy-send-rhythm-longer.mjs
?? heavy-send-rhythm-multisong.mjs
?? heavy-send-rhythm-polish.mjs
?? heavy-send-rhythm.mjs
?? heavy-send-session.mjs
?? heavy-send-ship-status.mjs
?? heavy-send-ship-verdict.mjs
?? heavy-send-simplify.mjs
?? heavy-send-smoothwalk.mjs
?? heavy-send-sniff-test.mjs
?? heavy-send-spacious-store.mjs
?? heavy-send-store-layout.mjs
?? heavy-send-store-pass.mjs
?? heavy-send-tick-walk.mjs
?? heavy-send-tuning.mjs
?? heavy-send-vinyl-silence.mjs
?? heavy-send-vinyl.mjs
?? heavy-send-walk-fix.mjs
?? heavy-send-walk-floor2.mjs
?? heavy-send-walk-perf.mjs
?? heavy-status-read.mjs
?? heavy-xdotool-fetch.sh
?? laptop-health-fix.mjs
?? laptop-settings-fix.mjs
?? launch-chrome-automation.sh
?? launch-cursor-game.sh
?? launch-demigod-chrome.sh
?? launch-flatpak-chrome-cdp.sh
?? launch-game-chrome.mjs
?? manifest.webmanifest
?? map-walk-audit.mjs
?? mcp-batch-push.mjs
?? mcp-invoke-push.mjs
?? mcp-push-from-file.mjs
?? mcp-push-from-json.mjs
?? mcp-push-runner.mjs
?? new-player-playtest.mjs
?? ninjawhee-eat-the-sounds.html
?? orca-agent-drive.sh
?? orca-demigod.sh
?? orca-drive-all.sh
?? orca-ide.sh
?? orca-linux.AppImage
?? orca-linux.AppImage.bak.20260629
?? orca-mobile-setup.sh
?? orca-setup.sh
?? overworld-pixel-polish-v2.png
?? overworld-pixel-polish.png
?? overworld-sarah-shot.png
?? overworld-store-shot.png
?? overworld-store-v2.png
?? overworld.js
?? package-lock.json
?? pause-all.mjs
?? pause-journal.js
?? pixel-canvas-only.png
?? pixel-gfx.js
?? playtest-01-intro.png
?? playtest-02-store-front.png
?? playtest-02-store.png
?? playtest-03-east-rooms.png
?? playtest-03-east.png
?? playtest-04-vinyl.png
?? playtest-04-west-return.png
?? playtest-05-moon-spin.png
?? playtest-05-talk-1.png
?? playtest-05-talk-2.png
?? playtest-05-talk-3.png
?? playtest-06-veteran.png
?? playtest-07-aftermath.png
?? playtest-07-veteran.png
?? playtest-08-aftermath.png
?? playtest-browser.mjs
?? playtest-find-01.png
?? prompts/
?? proof-pack-2026-07-06T04-05-32.json
?? proof-pack-2026-07-06T04-05-32.png
?? proof-pack-2026-07-06T06-52-08.json
?? proof-pack-2026-07-06T06-52-08.png
?? public/sla-badge.json
?? push-eat-the-sounds-github.mjs
?? push-github-via-api.mjs
?? quick-candidate-intake.html
?? quick-intake-enhanced.html
?? reload-game.mjs
?? report-rhythm-to-heavy.mjs
?? report-visual-polish.mjs
?? rhythm-diag.png
?? rhythm-fixed.png
?? rhythm-flow.png
?? rhythm-loop.js
?? run-continuous.sh
?? run-demigod-loop.sh
?? run-demigod-orca.mjs
?? run-demigod-supervisor.sh
?? run-demigod-watcher.sh
?? save-grok-pixel.mjs
?? scripts/
?? send-orca-pair-email.mjs
?? setup-chrome-mcp.sh
?? setup-dev-workspace.mjs
?? sf-culture-preview.html
?? simple-program.html
?? skills-lock.json
?? store-ambient.js
?? store-events.js
?? store-floor-lounge.png
?? store-floor-middle.png
?? store-floor-spawn.png
?? store-floorux-entrance.png
?? store-floorux-middle.png
?? store-items.js
?? store-view-crates.png
?? store-view-entrance.png
?? store-view-lounge.png
?? tally-create-snap.txt
?? tally-settings-engineer.txt
?? tally-snap-engineer.txt
?? thorough-playtest.mjs
?? tmp-cdn-board-live.json
?? tmp-cdn-board-new.json
?? tmp-live-foot.js
?? tmp-live-head.css
?? tmp-live-home.html
?? tmp-user-full-test.mjs
?? tmp-wiz-full-test.mjs
?? typing-perf-fix.mjs
?? vinyl-audio.js
?? vinyl-echo-bridge.js
?? visual-explore-playtest.mjs
A	.gitignore
A	AGENTS.md
A	demigod-foot-core.js
A	demigod-footer-lite.html
A	demigod-head-minimal.html
A	package.json
# Demigod Multi-Agent Review — 2026-07-12

**Status:** Authoritative decision + synthesis  
**Participants:** Grok (orchestrator), Fable (Claude fable), Claude Opus, Codex  
**Live:** https://www.trydemigod.com  
**Last Published (www):** Fri Jul 10 2026 01:58:08 GMT  

Raw agent outputs: `/tmp/dg-multi/` (`fable-out.txt`, `opus-out.txt`, `codex-review.md`)

---

## 1. Decision: **FIX** (not rewrite, not hybrid rebuild)

| Option | Verdict | Why |
|--------|---------|-----|
| **FIX** | **Chosen** | Live site works; architecture is sound; bottleneck is **demand**, not product surface |
| Hybrid (new stack + keep Webflow) | Rejected for now | Weeks of dual systems; no extra founder intros |
| Scratch (Next/custom host) | Rejected | Rebuild forms, hosting, publish, WIZ, honesty for a GTM-ready UI |

**Unanimous agent consensus:** Fable = FIX · Codex = FIX · Opus = stabilize-then-GTM · Grok = FIX.

**Root cause of past pain:** process (concurrent foot writes, publish lag, CDN hash drift) — **not** Webflow+custom-code as an architecture.

---

## 2. Evidence snapshot (2026-07-12)

### Live (www)
| Check | Result |
|-------|--------|
| HTTP | 200 · ~31KB · ~85ms (curl) |
| Title | Demigod • Human-Matched SF Startup Talent |
| Unhide | `unhide-v5-safe` present |
| Design CSS | `files.catbox.moe/m2f8rp.css` |
| Foot CDN | `files.catbox.moe/8tjw79.js` → **v176** |
| Inline honesty | `dg-v177-honesty-patch` in footer (soft 90-day language) |
| CTAs in static HTML | HIRE TALENT · JOIN NETWORK · FIND TALENT · hello@ |
| Lorem / 48h SLA in static text extract | **No** |
| Playwright full audit | Unreliable (domcontentloaded timeout from headless); use curl + CDP |

### Disk / gates
| Check | Result |
|-------|--------|
| `demigod-foot-core.js` | **v177** · 111653 bytes · sha256 `2a274e8e…4c2622` |
| Live CDN 8tjw79.js | **v176** · 111554 bytes · sha256 `2f9dd073…d2c89f` |
| Head | `unhide-v5-safe` · `demigod-head-minimal.html` |
| Board | 2 sample roles · `realRoles:0` · `realReceipts:0` · CDN `orqkmx.json` |
| `npm run demigod:verify:source` | **pass** (this session) |
| Board honesty | **OK** |
| Loop-state | **OK** (v177 matches disk, dm_freeze OFF) |
| Direct `demigod-foot-smoke.mjs` | pass version 177 |

### Critical drift
**Disk foot = v177; live catbox foot = v176.**  
Footer intentionally ships an **inline v177 honesty patch** (“full-foot reupload pending”). Forms/WIZ behavior may differ slightly until full CDN reupload. Do **not** claim live == v177 until CDN hash matches disk.

---

## 3. What each agent contributed

### Fable (strategy)
- **FIX** only. Site mostly done; demand is the bottleneck.
- Freeze foot-core thrash; single-writer discipline; disable rogue board-mint automation.
- 14-day focus: DMs → one white-glove pilot → proof assets → form e2e.
- OAuth parked until ≥10 real WIZ/week.

### Codex (technical)
- Architecture split (head / footer-lite / foot-core) is correct.
- Monolith foot + overlapping head unhide/scrub = tech debt, not rewrite fuel.
- Top technical work: deterministic boot-smoke in aggregate verifier; release manifest; fold honesty into CDN; modularize foot **behind same delivery**; behavioral tests; risk-namespace npm scripts; CDN provenance/SRI.

### Opus (risk audit)
- Live CDN staleness is the recurring “won’t load / wrong version” class of bug.
- Single JS SPOF (catbox foot) with no SRI.
- CSS catbox link can stall (historical spinner); head override may flash modal internals.
- `dg-simplify` may hide real nav/footer if they live in dropdowns/grids — verify mobile.
- WIZ coupled to hardcoded field names — Designer renames break stepper.
- Honesty OK on disk; most honesty is runtime-JS dependent.

### Grok (this session)
- Multi-agent orchestration, live/disk audit, gate runs, hash compare, shared docs, roadmap/checklist, compressed-state refresh, collab protocol.
- Decision owner under user directive: **no stop-to-ask**.

---

## 4. Ideal multi-agent operating model

See **`docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md`**.

Short form:

| Agent | Mode | Owns |
|-------|------|------|
| **Fable / Claude** | Plan / audit (prefer read-only) | Strategy, single next, plans → `/tmp/fable-*.txt` |
| **Codex / Cursor** | One writer at a time | `demigod-foot-core.js` + supporting `demigod-*.mjs` under lock |
| **Grok** | Execute + verify + tools | Gates, CDP, CDN prep, docs, GTM prep, publish automation when authorized |
| **Heavy** | Strategy only | Demand/GTM priority, anti-list |
| **Human** | Publish gate (default) | Webflow Publish; unless explicit full-autonomy override |

**Hard rules**
1. One canonical JS: `demigod-foot-core.js`
2. After any edit: `verify:source` + board-honesty + loop-state
3. No concurrent writers on foot-core
4. Shared truth: `DEMIGOD-COMPRESSED-STATE.md` + this exchange folder
5. GTM > site polish unless live P0 breakage

---

## 5. Must-do backlog (ranked)

### P0 — This week (ship demand + truth)
1. [ ] **Close GTM volume:** remaining warm SF founder DMs → 15+ total logged  
2. [ ] **Form e2e proof** on live (`node demigod-form-e2e.mjs` via CDP) — one tagged submit lands somewhere readable  
3. [ ] **One white-glove pilot** end-to-end → first non-seed receipt when real  
4. [ ] **CDN truth:** either reupload v177 foot (new catbox hash) + update footer-lite + publish, **or** freeze and document live=v176+patch until pilot justifies ship  
5. [ ] **Daily gates only** — no thrash: source + board + loop-state  

### P1 — Stabilize engineering (no rewrite)
6. [ ] Deterministic boot-smoke capture in `demigod-verify-source.mjs` (Codex #1)  
7. [ ] Release manifest: head / css / footer / core / CDN URLs + hashes  
8. [ ] Fold honesty patch into canonical core → drop permanent inline fork  
9. [ ] Mobile nav/footer survival under `dg-simplify`  
10. [ ] Consolidate docs → compressed state SSOT; archive stale root roadmaps  

### P2 — Later (only if conversion data demands)
11. [ ] Modularize foot-core → still one CDN artifact  
12. [ ] Behavioral contract tests (modal, WIZ, board labels)  
13. [ ] SRI / self-host critical CSS on Webflow assets  
14. [ ] OAuth (trigger: ≥10 WIZ/week)  
15. [ ] Twilio/Stripe live (pending language until then)  

### Anti-list (do not do)
- Full rewrite (Next, custom CMS, new host)
- OAuth/Twilio/Stripe “for polish”
- Board seeds >3 or fake receipts
- Concurrent agent foot-core edits
- Game / Eat the Sounds work
- Continuous improve loops without ask

---

## 6. Architecture keep-list

```
Webflow Designer (canvas/IX human)
  + head custom: demigod-head-minimal.html (unhide-v5-safe)
  + head CSS CDN: m2f8rp.css (+ inline tokens fallback)
  + footer: demigod-footer-lite.html → foot CDN + route redirects
  + foot behavior: demigod-foot-core.js (canonical) → catbox hash URL
  + board: DEMIGOD-BOARD.json ≤2–3 samples, real=0
  + gates: verify:source | board-honesty | loop-state | wiz playtest
```

This is **good enough for GTM**. Improve at the edges; do not replace the middle.

---

## 7. Communication artifacts (shared)

| File | Purpose |
|------|---------|
| `DEMIGOD-COMPRESSED-STATE.md` | Living SSOT (update every ship) |
| `docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md` | This decision |
| `docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md` | How agents work together |
| `docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md` | Executable checklist |
| `/tmp/dg-multi/*` | Raw multi-agent reviews |

**How agents contribute:** append dated notes under `docs/exchange/`; update compressed state on ship; never invent live version claims — hash first.

---

## 8. Immediate execution plan (Grok continues)

1. Write collab protocol + 14-day checklist (done with this pass)  
2. Refresh `DEMIGOD-COMPRESSED-STATE.md` to v177 / live v176 truth  
3. Run CDP form dry e2e if Chrome up  
4. Fix boot-smoke flake if cheap  
5. Prepare CDN reupload package for v177 **without** thrashing WIZ behavior  
6. GTM checklist + outreach readiness refresh  
7. Keep gates green; stop site churn after readiness  
# Talent Engineering Research + Site Ship — 2026-07-10

**Agents:** Grok (research/build/publish) · Claude Sonnet (review authority)  
**Phase:** GTM + pre-services honesty

## Research (cited)

1. **a16z Talent Engineer Fellowship** (Jun 18, 2026) — engineer who recruits; many-to-many matchmaking; judgment over spam tooling; builds agents/graphs/workflows.
2. **Kim & Pergler, SMJ 2025** — firm-driven search ↑ hire likelihood, ~77% higher quit risk; candidates dial down own search.
3. **Bidwell, ASQ 2011** — external hires paid ~18–20% more, weaker early performance, higher exit.
4. **Gale–Shapley / Roth** — two-sided stable matching; employer-only optimize → unstable.
5. **Industry contingency** — 15–25% first-year base (~20% median); Demigod 10%.

Full synthesis: `docs/DEMIGOD-TALENT-ENGINEERING-RESEARCH.md`

## Positioning (approved thesis)

Demigod = **human matchmaking layer** for SF startups: systems exist to earn the human conversation; mutual yes + 90-day outcome counters firm-driven retention risk; 10% fee is secondary to fit.

## Shipped

| Asset | Detail |
|-------|--------|
| foot **v176** live | CDN `8tjw79.js` — mutual-yes FAQ, 15–25% honesty, judgment trust copy, privacy de-hype |
| foot **v177** disk | Softens 90-day guarantee until payments + placement (Claude flag) — catbox reupload returning 0-byte; retry later |
| Events | `https://files.catbox.moe/m22wy3.html` research FAQs |
| GTM | `RESEARCH-DM-SNIPPETS-2026-07-10.md`, TOP3 + 8 ready-emails research hook |
| Gates | source PASS, smoke 177 disk, board OK, loop-state v177, metrics 115/100 live v176 |

## Claude review (Sonnet)

- Approve v176 honesty overall.
- Flag: hard “90-day replacement guarantee” before real placements/payments → fixed on disk as v177.
- Next: **GTM human DMs**, not more code.

## Human next

1. Send `demigod-outreach/SEND-PACK-TOP3.md` → `node demigod-dm-mark-sent.mjs --name=…`
2. Douglas call **2026-07-14 13:30 PT**
3. Agent: retry catbox for v177 when healthy; do not invent pilots
# Dashboard v2 + tools synthesis (2026-07-13)

## Swarm
- **Claude (sonnet) MVP**: evidence ages, tools tab, async jobs, never-stuck loading, tabs, keyboard r/s/c, toasts, dark gold polish — **implemented**
- **Fable/df**: drifted to site-green (not useful for dash plan)
- **Codex x2**: still empty stdout (err logs only) — did not block ship

## Shipped
1. `demigod-agent-dashboard-ui.html` — v2 UI (external file, no nested-quote load bug)
2. Dashboard server: evidence map, tools summary, `/api/tools`, `/api/jobs`, loadHtml()
3. `demigod-tools-registry.mjs` + `bin/dg-tools` — 21 keep-path tools with ages
4. Async allowlisted jobs (smoke, cockpit, truth, preflight, plan-inbox, tab-prune, …)
5. UI: Overview | Tools | Swarm | Brief | Gates; skeleton; toasts; palette `/`; keys 1-5, r,s,c
6. Cache + singleflight retained; cold ~0.7s

## Acceptance
- UI title "Agent Dashboard v2", client JS parses
- `/api/status` version:2 + evidence keys
- `/api/tools` count 21
- POST `/api/jobs?run=tools-registry` ok

## URL
http://127.0.0.1:9878/
# Agent tooling for Grok — 2026-07-13

## Session start (always)
```bash
bin/dg-start                 # brief + ship-status + lock
# or
npm run demigod:start
cat /tmp/dg-busy/AGENT-BRIEF.md
```

## Foot lock
```bash
DG_LOCK_OWNER=grok node demigod-foot-lock.mjs claim --why 'v184 polish'
# edit demigod-foot-core.js
node demigod-foot-lock.mjs release --owner grok
# or wrap:
DG_LOCK_OWNER=grok bin/dg-lock node --check demigod-foot-core.js
```

Files: `/tmp/dg-busy/foot-lock.json` + `foot-lock.txt` (dashboard reads these).

## Ship state
```bash
node demigod-ship-status.mjs
node demigod-ship-status.mjs --strict   # exit 1 if not live==disk
# snapshot: /tmp/dg-busy/ship-status.json
```

Stages: disk_ok → disk_syntax → footer_lite_points_cdn → manifest_matches_disk → live_reachable → live_matches_manifest → live_matches_disk_ver

## Dashboard
http://127.0.0.1:9878/  
`/api/agent-brief` · `/api/actions` · `/api/status`

## Fable
`bin/df` now injects AGENT-BRIEF + ship-status into the prompt when available.
# Demigod Autonomous Build System

**Goal:** Keep website + matching software improving with multi-agent roles, without thrashing live foot or inventing proof.

## Roles

| Role | Model / tool | Job |
|------|----------------|-----|
| Planner | Fable (`bin/df review`) | Plans with verify cmds + stop conditions |
| Executor | Grok / Cursor | Apply plans via `dg-apply` or write tools/pages |
| Reviewer | Codex Pro + API Codex | Adversarial code review file:line |
| Copy/UX | Sonnet | Page copy honesty, banned phrases |
| Strategy | Opus | Kill list, prioritization |
| Gates | `demigod-tools-selftest`, `truth`, `claim-verify` | Hard pass/fail |

## Safety rails (never skip)

1. If `truth` says `fullyShipped: true` → **do not** edit `demigod-foot-core.js` unless task explicitly requires a ship.
2. `publish-freeze` ON → no real Webflow publish; dry-run / page files OK.
3. Foot edits: `DG_LOCK_OWNER` + `DG_LOCK_TOKEN` (see foot-lock claim output).
4. After any “fixed” claim: `node demigod-claim-verify.mjs …`
5. One queue item at a time; no concurrent foot writers.

## Loop (simple forever)

```bash
# 1) health
node demigod-build-loop.mjs doctor

# 2) ensure queue
node demigod-build-loop.mjs seed   # first time
node demigod-build-loop.mjs status

# 3) process one item
node demigod-build-loop.mjs once

# 4) agents (when planning next batch)
bin/df review "Plan next BUILD-QUEUE items from doctor output…"
# codex exec --full-auto "Review last diff / new pages…"
# sonnet: copy audit demigod-pages/*.html
# opus: re-rank queue priorities

# 5) repeat
```

## Queue format (`/tmp/dg-busy/BUILD-QUEUE.jsonl`)

```json
{"id":"unique","type":"tool|page|fix|review","title":"…","priority":1,"status":"ready|running|done|failed","cmd":"bash command","verify":"optional"}
```

Add items by appending JSON lines. Prefer small cmds.

## Matching product spine

```
submit → pilot-os → dg-match → dg-intro → dg-close
pages: /hire /talent /how /pricing /pilot /proof  (demigod-pages/)
```

## Master prompts

Regenerated by agents into:

- `/tmp/dg-multi/fable-loop-master-prompt.txt`
- `/tmp/dg-multi/codex-loop-master-prompt.txt`
- `/tmp/dg-multi/sonnet-pages-copy-prompt.txt`
- `/tmp/dg-multi/opus-autonomy-strategy.txt`

Refresh:

```bash
node demigod-build-loop.mjs prompts
```

## What autonomy is *not*

- Auto-sending outreach
- Auto-minting board roles
- Auto-publishing Webflow while freeze is on
- Inventing proof for `/proof`


## Live product paths (2026-07-13)

Webflow **301 redirects** (not foot thrash):

| path | target |
|------|--------|
| /hire | catbox hire page |
| /talent | catbox talent |
| /how | catbox how |
| /pilot | catbox pilot |
| /proof | catbox proof |
| /pricing | native Webflow page |

Map: `DEMIGOD-PAGES.json`. Tool: `node demigod-redirects.mjs list|ensure|set`.
Footer-lite also has path→CDN fallback for when page/footer loads.


## Product site map4 (2026-07-13)

Paths: /hire /talent /how /pricing(native) /pilot /proof /faq /compare → catbox map4 + product strip in footer-lite.
Tool: DEMIGOD-PAGES.json + demigod-redirects.

codex
I’ve completed the evidence pass. The history has three important discontinuities I’ll make explicit in the report: sparse git commits conceal large uncommitted/one-shot eras; “live” claims were repeatedly invalidated by CDN/Webflow drift; and the July 13–14 tooling/design burst moved faster than the compressed state was updated. I’m now writing the synthesis with confidence labels and source pointers.
exec
/bin/bash -lc 'mkdir -p /tmp/dg-swarm/history' in /home/potter
 succeeded in 0ms:
