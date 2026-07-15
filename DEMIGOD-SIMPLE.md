# Demigod — Simple (the only card)

**Product:** SF human-matched talent · 10% on hire · mutual yes · 90-day outcome · no fake board/SLA  
**Site:** foot-core only for JS · Webflow + CDN · freeze when green  

## Every session (4 steps)

1. `bin/dg orient` → 5-line card (green / freeze / NEXT / demand / assertSame)
2. One goal. One writer if touching `demigod-foot-core.js`
3. Do the smallest change. Verify: `npm run demigod:verify:source` (+ honesty if board)
4. Stop. Human owns: freeze, Publish, real DMs, fees

## Who does what (no org chart)

| Stage | Model | May |
|-------|--------|-----|
| Plan | Fable/Claude | Spec, touch list, risks — no “I shipped” |
| Execute | Grok/Cursor | Only listed files + paste real gate output |
| Review | Codex | PASS/BLOCK vs plan — don’t silent-rewrite |
| Authorize | **Human** | Freeze · Publish · DMs · money |

**Default: 1 agent.** Use 2–3 only if ambiguous or high-risk mutate.

## Tools worth knowing

```
bin/dg orient             # session start: truth+demand+NEXT card (agents: do this first)
bin/dg truth              # THE oracle: disk/live/freeze/lock/board (+ evidence seal)
node demigod-evidence.mjs fresh truth   # refuse stale green
bin/dg lock claim|require|release|status   # hard foot-core mutex
bin/dg ship status|prepare|cdn|paste|verify|run   # single ship path
bin/dg demand status|queue|log|templates          # GTM (never auto-send)
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
- Freeze ON → **disk work OK**; **no CDN/Webflow mutate** unless human lifts freeze  
- Disk ahead of live under freeze is **expected**, not a P0  
- If freeze ON and task was “ship live”: stop and ask human — don’t thrash  

## Deeper only if needed

| Need | Open |
|------|------|
| Live truth | `DEMIGOD-COMPRESSED-STATE.md` |
| Rules detail | `DEMIGOD-AGENTS.md` |
| Business stage checklists | `docs/process/OPS.md` (one file) |
| History / debates | `docs/exchange/` (archive — don’t re-read by default) |
| Long improve prompts | `prompts/demigod/MASTER-*.md` (task-scoped) |

---
*If this page and `bin/dg live` disagree with a long essay, trust live + this page.*
