> Prefer **OPS.md** for daily use. This file is optional detail (INCIDENT-DATA-RESPONSE.md).

# INC-01 — Incident & data response

**Owner:** Finder → escalate to human · **When:** site wrong, form broken, dishonest claim risk, bad intro, PII/key leak, freeze thrash

## Severity (simple)
| Level | Meaning | Action |
|-------|---------|--------|
| **Now** | Live users misled or broken critical path | Fix / rollback / scrub immediately |
| **Today** | Ops broken but not user-facing lie | Fix same day |
| **This week** | Process debt | Schedule |

## Site down / wrong version
1. [ ] `bin/dg live` — freeze? disk vs live?
2. [ ] If freeze ON and disk ahead: **not** an emergency publish
3. [ ] If live broken: rollback CDN/footer or fix-forward via WEB-01
4. [ ] Confirm with curl/CDP + smoke
5. [ ] Note in `demigod-ops/incidents/<id>.md`

## Form / WIZ broken
1. [ ] Repro fresh tab (no stale CDP)
2. [ ] Local: `node demigod-wiz-cdp-playtest.mjs --local` or usertest
3. [ ] Disk fix → gates → WEB-01 if needed

## Dishonest claim (copy / board / DM)
1. [ ] P0 — stop feature work
2. [ ] Grep banned: 48h, SLA, founder names, fake counts
3. [ ] Fix live if published
4. [ ] Root cause note so it doesn’t recur

## Bad intro / relationship risk
1. [ ] Human-only judgment — no auto re-intro
2. [ ] Apologize if needed; fix pair state
3. [ ] Log learning

## PII / key exposure
1. [ ] Contain (revoke key, scrub logs)
2. [ ] Do not paste secrets into agents again
3. [ ] Incident file + rotation

## Freeze thrash
1. [ ] Who toggled? (freeze file + session)
2. [ ] Confirm with human before further mutate
3. [ ] Treat as incident, not routine

**Never:** invent severity SLAs; never hide honesty failures
