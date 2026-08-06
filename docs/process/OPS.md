# Demigod ops — one page (when you actually need a process)

Open this only for a **real** search, ship, or incident. Day-to-day agents use `DEMIGOD-SIMPLE.md`.

## Pipeline

```
Demand → Intake → Match → Mutual yes → Intro → Hire → Proof
         ↑ parallel: site ship + honesty
```

## Checklists (checkbox when doing the work)

### Demand (human sends)
- [ ] Honest copy (no SLA/48h) · mark sent in ledger · agents draft only  

### Intake (before sourcing)
- [ ] 90-day outcome · authority · comp/location · fee terms pointed at fee one-pager  
- [ ] Don’t mint public board from interest alone  

### Match
- [ ] Score vs 90-day · shortlist 2–3 · gaps written · `DEMIGOD-PAIRS` · no auto-intro  

### Mutual yes → intro
- [ ] Founder yes · candidate consent · one intro email · log under `demigod-ops/intros/`  

### Ship site
- [ ] Freeze OFF · current request authorizes publish · `bin/dg lock claim`
- [ ] `DEMIGOD_CURRENT_REQUEST_PUBLISH=1 bin/dg ship run` (CDN + paste + verify) — detail [`docs/SHIP-AND-CDN.md`](../SHIP-AND-CDN.md)
- [ ] `bin/dg truth` shows shipped / disk==live · release lock

### Observed roles refresh (disk)
- [ ] `node demigod-roles-pipeline.mjs` · ship/paste if live footer must update — [`docs/ROLES-PIPELINE.md`](../ROLES-PIPELINE.md)

### Incident (live wrong / dishonest claim / PII)
- [ ] `bin/dg truth` first · fix or rollback · no fake “PASS” · note in `demigod-ops/incidents/`

### Agent task (nontrivial only)
- [ ] Goal · touch[] · forbid · verify cmd · raw output · 1 writer on foot  

## RACI (blast radius)

| Action | Who |
|--------|-----|
| Freeze / real DM / fee / real board claim as inventory | **Human judgment** (or explicit current-request agent authority) |
| CDN + Webflow publish | **Agent when current request authorizes**; else prepare-only |

## Anti-process

No Jira · no 3-agent ceremony for typos · no second metrics dashboard · no auto-DM  

## Archive

Individual checklist files under this folder are **optional detail** — prefer this page.  
Agent transport: root `AGENT-COMMS.md`.
