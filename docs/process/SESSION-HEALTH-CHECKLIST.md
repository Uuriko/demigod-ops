# OPS-01 — Session health

**Owner:** Operator (any agent or human) · **When:** start (and end) of work day / heavy session

## Start
- [ ] `bin/dg live` → record `LIVE= DISK= FREEZE= GATES=`
- [ ] `bin/dg home` or open Dash `:9878` if working ops
- [ ] Freeze: if ON, no CDN/Webflow mutate unless human explicitly unfreezes
- [ ] CDP tabs ~4–8 (`bin/dg hygiene` / prune if bloated)
- [ ] If editing foot-core: claim lock / single writer (`bin/dg-lock` or announce)
- [ ] Session contract for nontrivial work: `node demigod-session-contract.mjs scaffold --goal "…"`

## End
- [ ] Artifacts under `/tmp/dg-busy/` linked in handoff if needed
- [ ] Locks released
- [ ] If ship happened: compressed state + freeze restored per policy
- [ ] No false “live==disk” claims

**Pass:** freeze visible, versions known, no dual writers, hygiene sane  
**Artifact:** `/tmp/dg-busy/live-doctor.json` · control-plane.json
