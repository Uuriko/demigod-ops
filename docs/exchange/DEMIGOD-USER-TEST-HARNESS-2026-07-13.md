# Demigod user-test harness — 2026-07-13

## Why
Many one-off playtests (`agent-smoke`, wiz CDP, submit fixture, tools-selftest). Need **one command** that exercises site + dashboard + tools + forms as a user would, with severities and a stable report.

## How to run

```bash
bin/dg-usertest                 # full (~45–60s)
bin/dg-usertest --quick         # skip agent-smoke + tools-selftest
bin/dg-usertest --suite site    # live CDP UX
bin/dg-usertest --suite dash
bin/dg-usertest --suite tools
bin/dg-usertest --suite forms
bin/dg-usertest --suite copy
npm run demigod:usertest
```

Reports:
- `/tmp/dg-busy/user-test-latest.json`
- `/tmp/dg-busy/user-test-latest.md`

Exit **0** only if no critical/high failures. `--strict` also fails on medium.

## Suites

| Suite | What it tests |
|-------|----------------|
| **site** | HTTP, foot/CDN, product shells, CDP body/h1/foot, dual CTAs, WIZ open/chrome/reopen, mobile overflow |
| **dash** | health, status cold/warm, next/brief/tools/jobs, mutate block, UI parse + paint |
| **tools** | cockpit, agent-smoke, registry, submit-fixture, tools-selftest, shared lib |
| **forms** | CDP WIZ start→next question, submit fixture |
| **copy** | disk foot COPY policy (I'm hiring / Find a job, no 48h, pending) |

## Refine history

1. **Pass 1:** false fails — welcome WIZ has 0 inputs; reopen counted `h2+.dg-wiz-q` → 2  
2. **Fix:** align with `demigod-agent-smoke` contracts (`nVis≤1`, `.dg-wiz-head` only)  
3. **Pass 4–6:** **67/67 PASS** full; site 26/26; dash 21/21  

## Known product notes (not harness bugs)

- WIZ may show **1 residual field** (`stack-needs`) on open — allowed by smoke (`nVis≤1`); welcome-only ideal is 0  
- Multiple **I'm hiring** CTAs still present after wireCta; dual path still has **Find a job** / jobseeker  
- Product `?p=` pages return shell 200 (content via JS loader)

## Agent habit

```bash
bin/dg-usertest --quick && bin/dg-usertest --suite site
# before claiming ship:
bin/dg-usertest
```
