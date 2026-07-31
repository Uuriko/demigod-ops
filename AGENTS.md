# Demigod — Agent entry

**Start here:** [`DEMIGOD-SIMPLE.md`](DEMIGOD-SIMPLE.md) (`AGENT-SIMPLE.md` is a compatibility pointer) · state: `DEMIGOD-COMPRESSED-STATE.md` (`AGENT-STATE.md` is a compatibility pointer) · rules: `AGENT-RULES.md` · workflow: `DEMIGOD-WORKFLOW.md`
**Ponytail required (all agents):** lean code — see § Ponytail below + `docs/PONYTAIL-AGENTS.md`.

**Website truth:** run `bin/dg truth`; never copy a release version into this entry card · [state](DEMIGOD-COMPRESSED-STATE.md) · website+startup only (no auto-DM)

**Cross-agent comms (Claude ⇄ Grok ⇄ Codex):** Orca orchestration is primary for ongoing work (Linux: `orca-ide`, never `/usr/bin/orca`). `ask-claude` / `grok-ask` are stateless fallbacks; the old swarm drainers are gone. Full protocol: [`AGENT-COMMS.md`](AGENT-COMMS.md).

## User communication (standing — 2026-07-15)

- **Do not tell the user what they should do** (DMs, calls, Publish clicks, “your turn”, checklists for the human, “recommended next for you”).
- **Do agent work** and report what *you* did / blocked on. No advice on human actions unless the user **explicitly asks** for advice on what they should do.
- Same for “you can still…” / “you need to…” / “human next:” framing — omit unless asked.

# Demigod — Agent Rules (default project)

**Active projects:** trydemigod.com (Webflow) + Demigod startup ops.  
**Paused / out of scope:** Eat the Sounds game — do not edit, verify, playtest, or discuss unless the user explicitly reopens it.

**Workspace:** `/home/potter`  
**Detail:** `DEMIGOD-AGENTS.md` + `DEMIGOD-WORKFLOW.md`  
**Cursor rule:** `.cursor/rules/demigod.mdc`

**Docs & Exchange:** **Start here:** `DEMIGOD-COMPRESSED-STATE.md` (`AGENT-STATE.md` points there for compatibility). Then `docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md`, `DEMIGOD-WORKFLOW.md`, `docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09*.md`. Prompts use task-specific facts from current receipts; never prepend a standing phase label.

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
| Foot JS truth | `demigod-foot-core.js`; current disk/CDN/live identity comes only from `bin/dg truth` |
| Head CSS truth | `demigod-head-styles.css` / `demigod-head-minimal.html` |
| Footer loader | `demigod-footer-lite.html` |
| Verify gate | `npm run demigod:verify:source` (or :all / targeted); also board-honesty |
| Fresh Fable | `bin/df review "..."` — always fresh disk truth |
| Tools | `bin/dg`, `bin/dgsnap` (checkpoint + verify + commit), `bin/dg-cockpit`, `demigod-wiz-cdp-playtest.mjs --local` |
| Open workspace | `npm run demigod:workspace` |
| CDP | `http://127.0.0.1:9223` |

## Workflow

1. Read `DEMIGOD-AGENTS.md` before multi-file Demigod work.
2. One canonical file per task (`demigod-*` sources).
3. Run `npm run demigod:verify:all` (or targeted `demigod:verify:live` / `demigod:verify:source`).
4. External publish is current-request-gated: prepare and verify by default; publish only when the current user request explicitly asks for it.
5. Close extra CDP tabs when done; keep Designer + live + Grok within tab budget.

## MCP

- **webflow** — Designer changes when user wants Webflow edits
- **chrome-devtools** — live audit @ `--browserUrl=http://127.0.0.1:9223`

## Automation

Do **not** auto-spawn cloud agents, `continuous-improve-loop.mjs`, or `demigod:continuous` unless the user asks.

## Keep working (durable + nonstop)

Standing order: **do not stop after reporting.** Always find and do the next unblocked task.  
Durable loop: `systemctl --user enable --now demigod-useful-loop.service` · `bin/dg-useful-loop status`  
Discover: `node demigod-work-find.mjs`

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

**Blue moon (~14d):** `bin/dg-laptop-blue-moon` · doc [`DEMIGOD-LAPTOP-BLUE-MOON.md`](DEMIGOD-LAPTOP-BLUE-MOON.md) · weekly timer `demigod-laptop-blue-moon.timer`

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
Historical autonomy note: agents may do local research, audits, screenshots, board prep, verification, and scoped code edits without mid-cycle questions.
Fable/Claude are advisory collaborators, never authority equal to the user. Use `bin/df` for plans and verify recommendations against current source.
Webflow publish and every outbound message/post/form are current-request-gated; old blanket-authority wording does not authorize a later task.
Gates always run post change. Board honest <=2-3 seeds, real=0.
Foot-core is the disk SoR; use `bin/dg truth` for its current version and release identity.
Head: research comments added.

## Ponytail — REQUIRED for ALL agents (Grok, Claude, Fable, Codex, Cursor, Heavy)

**Standing order:** Every coding agent on this machine **must** follow Ponytail (lazy senior) when writing or editing code.

- **Plugin/skill:** installed for Claude Code + Codex (`ponytail@ponytail` v4.8.4, enabled)
- **Cursor rule (always):** `~/.cursor/rules/ponytail.mdc` (also project `.cursor/rules/`)
- **Ruleset:** `docs/PONYTAIL-AGENTS.md` · setup: `docs/PONYTAIL-SETUP.md` · upstream: https://github.com/DietrichGebert/ponytail
- **Default mode:** `full` (`~/.config/ponytail/config.json`)

**Before writing code, stop at the first rung that holds:**
1. Does this need to exist? (YAGNI) → skip
2. Already in this codebase? → reuse
3. Stdlib? → use it
4. Native platform feature? → use it
5. Installed dependency? → use it
6. One line? → one line
7. Only then: minimum that works

**Never cut:** trust-boundary validation, data-loss handling, security, accessibility, problem understanding.  
**Prefer:** shortest working diff, fewer files, no unsolicited abstractions/deps.  
**Commands (where supported):** `/ponytail`, `/ponytail-review`, `/ponytail-audit`, levels `lite|full|ultra|off`.

## Tool dogfood (standing)

Every agent **must** dogfood tools when using CLI/dash jobs:

- Wrap: `node demigod-tool-dogfood.mjs wrap --tool=NAME -- <cmd…>`
- Log judgment: `node demigod-tool-dogfood.mjs log --tool=NAME --ok=1 --useful=1 --why="…"`
- Review: `node demigod-tool-dogfood.mjs status` or dash `/api/dogfood`
- Improve tools that fail often or score not-useful; demote unused hot tools.

Priority board: `node demigod-priority-board.mjs` · dash top cards · `/api/priority`.
Maps: dash **Map** tab · `/api/maps`.

## Agent file access (anti-block)

Do **not** put agent-owned sources only under `.local/` or `.config/` (often tool-blocked). Prefer `bin/`, `demigod-*.mjs`, `DEMIGOD-*.md`, `systemd-user/`. Broad `DEMIGOD-*` gitignore is **forbidden** — tools fail on it.
