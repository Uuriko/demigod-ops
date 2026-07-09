# Demigod — Agent Rules (default project)

**Active projects:** trydemigod.com (Webflow) + Demigod startup ops.  
**Paused / out of scope:** Eat the Sounds game — do not edit, verify, playtest, or discuss unless the user explicitly reopens it.

**Workspace:** `/home/potter`  
**Detail:** `DEMIGOD-AGENTS.md` + `DEMIGOD-WORKFLOW.md`  
**Cursor rule:** `.cursor/rules/demigod.mdc`

**Docs & Exchange:** See CLAUDE.md, docs/exchange/ (DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09*.md including new GROK-CLAUDE detailed notes from Sonnet/Opus direct calls). Recent exchange (2026-07-09): Grok talked to Claude models, exchanged on v4/v150, board honesty, publish gate, GTM; cleaned docs (archived clutter to docs/archive), added cross-refs. Always start Claude prompts with "Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty."

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
npm run demigod:workspace  # optional: open tabs
```## Workflow best practices (simple, from research)
- Fable via df for plans.
- Cursor Plan Mode before edits.
- Verify after every change.
- tmux cockpit + entr for auto.
- popOS: system76-power balanced.

## Latest (2026-07-09 Info Exchange)
See DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md for full notes from Grok <-> Fable/Claude/Heavy/Cursor.
Current: v4 head ready (disk/pastes), live stale 17:32 v3, publish pending (human gate), fallback ready for phone.

