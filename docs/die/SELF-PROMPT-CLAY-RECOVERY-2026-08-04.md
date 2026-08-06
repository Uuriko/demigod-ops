# Self-prompt — Clay/DIE recovery + one creative pass

**Agent:** Grok · **Date:** 2026-08-04 · **Root:** `/home/potter`  
**Authority:** current user request · live receipts · `AGENTS.md` · `docs/die/CLAY-DIE-MULTI-AGENT.md` · `DEMIGOD-DIE-SPEC.md`

## Mission (one sentence)

Restore the private **role-first-seen ledger** after the Aug-2 wipe, re-stitch directory aging → pulse → static, leave RecruitAI export selftests green if unblocked — **without** publishing, auto-DM, Clay clones, or Phase-2 product claims (`acceptedForDelivery` stays 0 until a real role).

## Mindset

You are not rebuilding Clay.com. You are the **night watch for open roles**: every ATS job is a lighthouse; the ledger is the logbook of when each light first appeared and when it went dark. Be fail-closed. Prefer one honest empty field over a clever guess. Ponytail: YAGNI → reuse → min diff.

## Hard stops

- No Webflow publish / CDN ship / outbound DMs / forms / money.
- No brokered people data, email waterfalls, inferred comp, global fit scores.
- No recipe DSL / knowledge-graph platform / second product.
- Do not claim multi-week `observedOpenDays` history you just wiped — day-0 rebuild is honest.
- Phase 2 closed until `node demigod-accepted-role.mjs --json` shows a real accepted role.

## Procedure

### A. Prove baseline
```bash
export PATH="$HOME/.nvm/versions/node/v24.17.0/bin:$PATH"
cd /home/potter
bin/dg truth | tail -5
node demigod-role-ledger.mjs --selftest
node demigod-accepted-role.mjs --json | head -20
test ! -f DEMIGOD-ROLE-LEDGER.json && echo LEDGER_MISSING
```

### B. Seed empty ledger (poll requires existing valid file)
Write `DEMIGOD-ROLE-LEDGER.json` mode `0600`:
```json
{"schema":"demigod.role-ledger/1","updatedAt":"YYYY-MM-DD","roles":{}}
```
`updatedAt` = today UTC date. Never invent rows.

### C. Poll (network — long)
```bash
node demigod-role-ledger.mjs poll
```
Success: `ok: true`, non-zero `ok_fetches`, atomic write. Coverage fail → exit non-zero; report providers, do not fake opens.

### D. Downstream stitch (only if poll ok)
```bash
node demigod-directory-aging.mjs --enrich-map
node demigod-hiring-pulse.mjs
node demigod-directory-static.mjs
node demigod-role-ledger.mjs report --days 0 --json | head -c 2000
```

### E. Optional creative pass (only if D green, still local)
Pick **one** small win already allowed by backlog, not a new subsystem:
- RecruitAI export `--selftest` / regenerate private export if scripts exist and map+ledger present
- Or a **role-ledger report receipt** + aging snapshot under `/tmp/dg-busy/clay-recovery-*.json`
- Or document day-0 honesty in the completion receipt (observed ages start at 0)

Do **not** start Greenhouse field plumbing (`updated_at` etc.) in the same pass unless poll is green and the change is one tight PR-sized module with tests.

### F. Verify
```bash
node demigod-role-ledger.mjs --selftest
node demigod-accepted-role.mjs --json   # still phase2Ready:false
bin/dg truth | tail -8                 # site must stay green; no publish required
```

### G. Completion receipt
Write `/tmp/dg-busy/clay-recovery-2026-08-04.json` + short human summary:
- Outcome PASS|BLOCK
- Ledger path, role count, open count, boards ok/fail
- Files written
- External actions: none
- Observed product utility: not yet (no accepted role)
- Next agent-unblocked item

## Creativity without scope creep

Allowed flavor: treat the poll receipt as a **shipping log** — name the run, note the strangest board failure, celebrate first non-zero open US roles. Forbidden flavor: new agents, new DBs, Claygent clones, “intelligence OS” prose on the public site.

## Done when

1. `DEMIGOD-ROLE-LEDGER.json` exists, schema-valid, from a real poll  
2. Aging/pulse/static ran without inventing history  
3. Selftests pass; accepted-role gate still honest  
4. Receipt on disk; no publish/outbound  
