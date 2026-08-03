# Agent cockpit & smoke (2026-07-13)

Built so agents stop guessing and stop trusting false greens.

## What agents wanted (from Codex tools audit + us)

| Want | Built |
|------|--------|
| One honest "what next" | `node demigod-agent-cockpit.mjs` / `bin/dg-cockpit` / `GET /api/cockpit` |
| Live proof not curl-only | `node demigod-agent-smoke.mjs` / `bin/dg-smoke` / `GET /api/smoke?run=1` |
| Freeze-aware actions | Cockpit + dashboard freeze card; mutate flag on actions |
| No false site-green | Dashboard requires ver match + hash + freeze off |
| Board honesty real | Fixed `lstatSync` import |
| Kill dangerous mutators | `demigod:source-truth` now exits 1 (archived) |
| Swarm-aware hygiene | Don't recommend kill when `/tmp/dg-busy/swarm` is hot |

## Session start (canonical)

```bash
bin/dg-cockpit          # or: curl -sS http://127.0.0.1:9878/api/cockpit?format=md
bin/dg-smoke            # CDP body/h1/foot/WIZ
# then do cockpit NEXT only
```

## Files

- `demigod-agent-cockpit.mjs`
- `demigod-agent-smoke.mjs`
- `demigod-agent-dashboard.mjs` (UI: Cockpit NEXT, freeze, hash chain)
- `bin/dg-cockpit`, `bin/dg-smoke`
- `/tmp/dg-busy/cockpit.json`, `cockpit.md`, `agent-smoke.json`

## Dashboard UI

http://127.0.0.1:9878/ — top card is **Cockpit NEXT**, then freeze + hash chain, then legacy actions.
