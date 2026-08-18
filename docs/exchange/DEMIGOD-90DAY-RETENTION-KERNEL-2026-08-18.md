# Role Mission 90-day check · 2026-08-18

**Lane:** Grok / kernel. Not DIE web, not map/ledger, not foot-core. No publish.

## Research that bound the increment

- [StaffingHub / Employ 2025–26 benchmarks](https://staffinghub.com/hiring/your-recruiters-are-filling-roles-faster-some-wont-last-90-days/): time-to-fill **67.7 → 63.5 days**, 90-day retention **93.9% → 84.6%**. Faster fills and early washouts rose together. The cost lands later as refills. Full-year retention improved for people who *clear* 90 days — the damage is the front end.
- Ashby 2026 startup report: AI in hiring is common; process consolidation is Ashby's story. It does not keep whether the hire lasted.
- Greenhouse 2026: structured scorecards are the quality lever, not speed.
- Glassdoor (via 2026 job-search guides): informed candidates who know the company are rated higher — Demigod already has packets; this increment is the *after* the start date.
- EU AI Act Annex III + NYC LL144: do not add a hire score. `lasted` is a boolean observation.

## What was lying

`recordOutcome()` on a `filled` mission could run the same day as `advanceApplication(..., hired)`. The packet already requires a 90-day *intent* (`outcome90d`). The kernel then treated "we hired them" as "we observed the outcome." That is time-to-fill dressed as learning.

## What shipped on disk

`demigod-role-mission-kernel.mjs`:

- `hiredAt` stamped on the application
- `scheduleOutcomeCheck()` — due no earlier than hire + 90 days
- `recordOutcomeCheck({ lasted, note })` — refuses until due
- `recordOutcome()` on `filled` requires the recorded check and copies `lasted90d`
- `closed` without a hire still records learning with `lasted90d: null`
- next-action: `schedule_90d_check` → `wait_90d_check` → `record_outcome`
- hire requires a submitted scorecard **and** a debrief for that candidate
- `openNextMission` copies `lasted90d`; a washout with no `avoid` fails closed

Contract: `docs/die/CONTRACTS.md` §29. Tests: `demigod-role-mission-kernel.test.mjs`.
