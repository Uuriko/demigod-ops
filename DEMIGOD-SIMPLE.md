# Demigod — Simple (the only card)

**Product:** SF tech-matched talent, humans in the loop · 10% on hire · mutual yes · 90-day outcome · no fake board/SLA  
**Site:** foot-core only for JS · Webflow + CDN · release identity comes only from `bin/dg truth`
**Operating mode:** First Pilot Delivery — complete one real brief → reviewed match → mutual yes → intro → recorded outcome · no Twitter/auto-DM

## User communication (standing)

- **Never assign the user work** or list “what you should do next” (DMs, calls, Publish, fees).
- **When told to choose:** pick one track and execute — no choice menus for the user.
- Report agent results only. **Human-action advice only if the user asks** (“what should I do?”).

## Production handbook

**How the studio runs:** [`docs/DEMIGOD-HANDBOOK.md`](docs/DEMIGOD-HANDBOOK.md) — standards, roles, ship loop, honesty, checklists, onboarding.

## Ponytail (all agents)

**Required:** write code like a lazy senior (YAGNI → reuse → stdlib → native → min). Rules: `docs/PONYTAIL-AGENTS.md`, plugin `ponytail@ponytail`. Keep safety checks.

## Every session (4 steps)

1. `bin/dg orient` → 5-line card (green / freeze / NEXT / demand / assertSame)
2. One goal. One writer if touching `demigod-foot-core.js`
3. Do the smallest change. Verify: `npm run demigod:verify:source` (+ honesty if board)
4. Stop. (Freeze / Publish / real DMs / fees are human-owned when *they* choose — agents don’t prompt them.)

## Who does what (no org chart)

| Stage | Model | May |
|-------|--------|-----|
| Plan | Fable/Claude | Spec, touch list, risks — no “I shipped” |
| Execute | Grok/Cursor | Only listed files + paste real gate output |
| Review | Codex | PASS/BLOCK vs plan — don’t silent-rewrite |
| Authorize | **Current user request** | Publish · messages/posts/forms · money |

**Default: 1 agent.** Use 2–3 only if ambiguous or high-risk mutate.

## Tools worth knowing

```
bin/dg orient             # session start: truth+demand+NEXT card (agents: do this first)
bin/dg truth              # THE oracle: disk/live/freeze/lock/board (+ evidence seal)
node demigod-evidence.mjs fresh truth   # refuse stale green
bin/dg lock claim|require|release|status   # hard foot-core mutex
bin/dg ship status|prepare|cdn|paste|verify|run   # single ship path
bin/dg demand status|queue|draft|log|templates  # GTM drafts only; delivery is permanently disabled
bin/dg unify                                    # deep snapshot (orient is short path)
bin/dg next-canon                                 # single NEXT builder
bin/dg mime | full-check | home | tools
bin/dg-usertest --quick   # when WIZ/UX
# /api/tools defaults hideAliases+hotOnly; ?all=1 for full catalog
```
Before editing foot-core: `bin/dg lock claim --owner "$USER" --why "…"` then `export DG_LOCK_TOKEN=…`  
Or fail hard: `bin/dg lock require`  
Ship mutators (`cdn`/`paste`/`run`) need freeze OFF + lock.


## Hard stops

- No game work · no concurrent foot writers · no inventing pilots/receipts  
- No external publish, message, post, application, or form submission unless the current request explicitly asks for it
- Disk ahead of live is expected until an intentional, authorized release
- Release mutations still require the foot lock and fresh verification

## Deeper only if needed

| Need | Open |
|------|------|
| Live truth | `DEMIGOD-COMPRESSED-STATE.md` |
| Website session 2026-07-15 | `docs/exchange/DEMIGOD-SESSION-STATUS-2026-07-15-WEBSITE.md` |
| Website backlog | `docs/process/WEBSITE-BACKLOG-MEGA.md` |
| Rules detail | `DEMIGOD-AGENTS.md` |
| Business stage checklists | `docs/process/OPS.md` (one file) |
| DIE intelligence build | `DEMIGOD-DIE-SPEC.md` + `docs/die/` · multi-agent atlas: [`docs/die/CLAY-DIE-MULTI-AGENT.md`](docs/die/CLAY-DIE-MULTI-AGENT.md) |
| History / debates | `docs/exchange/` (archive — don’t re-read by default) |

---
*If this page and `bin/dg live` disagree with a long essay, trust live + this page.*
