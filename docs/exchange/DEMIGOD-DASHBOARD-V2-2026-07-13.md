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
