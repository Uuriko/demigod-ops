# Demigod Control — master improvement list (tools + dashboard)

**Phase:** GTM + pre-services · FREEZE ON · live v198 / disk v199  
**Goal:** One cohesive Control product for humans (UI) and agents (JSON/CLI)

## P0 — implement now (this batch)

| # | Item | Why |
|---|------|-----|
| 1 | **`/api/unify` + `bin/dg unify`** | Single agent entry: next+truth+demand+tools+evidence+ledger |
| 2 | **Tools tab search + more runnable jobs** | Find/run truth/demand/ship/review without CLI hunt |
| 3 | **Command palette expanded** | All hot verbs + tabs + copy unify |
| 4 | **Evidence + ledger on Home/Gates** | See green seals + version history in-product |
| 5 | **Home “system strip”** | Hot tools chips + spine + APIs always visible |
| 6 | **Jobs: ship-status, ledger, full-check, evidence, ship prepare** | Wire CLI into dash jobs |
| 7 | **`demigod-unify-selftest.mjs`** | Prove unify schema + dual-NEXT ban |
| 8 | **Registry + SIMPLE note** | Document one spine |

## P1 — next session

| # | Item |
|---|------|
| 9 | SSE status delta (only re-render changed fields) |
| 10 | Split dashboard.mjs modules (status/jobs/http) |
| 11 | Tool age badges auto-refresh |
| 12 | Match/inbox keyboard first-class |
| 13 | Persist UI prefs (tab, poll interval) |
| 14 | Unifyментированный agent brief from unify only |

## P2 — later

| # | Item |
|---|------|
| 15 | Mobile responsive pass |
| 16 | Dark/light tokens export |
| 17 | Webflow doctor live panel without spawn thrash |
| 18 | Archive cold tools from registry listing |
| 19 | Graph of tool→artifact→gate |

## Explicit non-goals (not on this list)

- Unfreeze / CDN ship v199  
- Auto-send DMs  
- Game work  
- Fake pilots/receipts  

## Cohesion spine

```
Human:  http://127.0.0.1:9878/  (v7 Control)
Agent:  curl /api/unify  |  bin/dg unify
CLI:    truth → next-canon → demand → ship status → review
Jobs:   POST /api/jobs?run=<id>
```

## Implementation status 2026-07-14 (resume)

| Item | Status |
|------|--------|
| P0 unify product | DONE |
| lock-who | DONE `bin/dg lock-who` |
| evidence producers | DONE `bin/dg evidence producers` |
| ship --facts | DONE |
| handoff structured | DONE CLI + POST + UI fields |
| brief from unify | DONE |
| SSE delta | DONE event:delta |
| /api/presence graph jobs/history | DONE |
| System tab presence/jobs/graph | DONE |
| density + mobile CSS | DONE |
| keyboard map v2 | DONE |
| registry aliases | DONE |
| deep-link ?tab=&job= | DONE |
| next identity selftest | DONE |
| P2 i18n / orca remote / continuous E2E | deferred (out of scope) |

