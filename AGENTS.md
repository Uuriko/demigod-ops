# Demigod — Agent entry

**Start here:** [`DEMIGOD-SIMPLE.md`](DEMIGOD-SIMPLE.md) · state: `DEMIGOD-COMPRESSED-STATE.md` · detail: `DEMIGOD-AGENTS.md`  
**Website 2026-07-15:** live foot **v207** · [session status](docs/exchange/DEMIGOD-SESSION-STATUS-2026-07-15-WEBSITE.md) · website+startup only (no auto-DM)

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
