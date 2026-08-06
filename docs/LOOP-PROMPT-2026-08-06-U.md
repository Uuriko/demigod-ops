# Loop iteration U — test the blockage I have been reporting as fact

## State

```
truth    disk v1030 · live v1019 · lagDebt · prepare clean (8/8 gates)
lock     FREE — but foot-core was written 2 min before the last check
site     another worker mid-redesign: 1,635-line CSS diff, uncommitted
mine     data plane: role-ledger, targets, sourcing — no overlap with their build
```

## Why this, now

Anything touching the browser build collides with a redesign in flight. The data
plane is entirely mine and has a defect I have re-reported without re-testing.

Since iteration K I have said the sourcing pipeline is capped because
`DEMIGOD-COMPANY-RESEARCH.json` is `{companies: []}` — a wipe casualty — and that
refilling it needs Firecrawl credentials the user has not restored. I have
repeated that across iterations as an established fact and used it to explain why
`--startups` yields a single lead.

**I have never tested whether the map can substitute for the research catalog.**
`DEMIGOD-SF-STARTUP-MAP.json` has 2,902 rows carrying `description`, `stage`,
`teamSize`, `tags`, `jobsUrl`, `website`, plus `source`, `sourceUrl`,
`sourceLicense`, `retrievedAt`. That is materially the same shape the research
catalog was there to provide, and it is already on disk with provenance intact.

If that is right, a pipeline I have called credential-blocked for six iterations
has been unblocked the whole time, and "waiting on the user" was my own missing
check. That possibility is worth more than any new feature this iteration.

## Task 1 — verify the diagnosis before writing anything

Do not build on the summary. Establish, from the code and the data:

1. Where exactly is the 40-row cap enforced? Read
   `demigod-recruitai-export.mjs` and find the line. Is it a literal cap, or a
   consequence of the join dropping rows that have no research entry?
2. What does the export actually require from `DEMIGOD-COMPANY-RESEARCH.json` —
   which fields, and is any of them absent from the map rows?
3. Is the catalog genuinely empty, or does it have a schema wrapper with rows
   somewhere else? Check, do not assume.
4. Confirm the 17-vs-2,902 gap is caused by this and not by the aging filter,
   the SF filter, or the startup screen. Count at each stage.

If the diagnosis is wrong, say so plainly and stop — a corrected diagnosis is the
deliverable, and building the wrong fix on top of it would be worse than nothing.

## Task 2 — Ponytail before code, eighth consecutive iteration

Six iterations running, the thing already existed. Before writing a join:

- `demigod-recruitai-export.mjs` already joins map + ledger. Does it already
  accept the map as a research source behind a flag?
- `demigod-enrichment.mjs`, `demigod-startup-atlas.mjs` — does either already
  resolve a company to a map row with provenance?
- Is there an existing catalog-builder that reads the map?

If any covers it, the answer is a flag or a documented command, not new code.

## Task 3 — unblock it, with provenance intact

If nothing covers it, let the export fall back to map-derived company context
when the research catalog is empty. Requirements, all inherited and none
negotiable:

- **Provenance survives the join.** Map rows are CC0 / YC-public and carry
  `sourceLicense` and `retrievedAt`. Those must ride along, not be dropped
  because the destination schema has no column for them. Third-party data must
  never be presented as Demigod's own research.
- **Never invent.** Missing `description` renders nothing, not a guess. Missing
  `teamSize` renders nothing, not an estimate. No inferred stage.
- **The fallback is visible.** Output must state that context came from the map
  rather than researched sources. A silent substitution creates a second source
  of truth that goes stale without anyone noticing — the same failure mode the
  targets store was designed to avoid.
- **No contact data.** Still no person, no email. Company-owned public URLs only.
- **Do not imply a relationship.** These are companies observed hiring on their
  own boards.

## Task 4 — prove it with a number, and prove the proof can fail

State the lead count before and after. If it goes 1 → N, N is the finding.

Then apply iteration S's lesson: the new test must be **proven non-vacuous by
breaking its subject**, and the fixture must be able to distinguish the two
behaviours. Iteration R's degenerate fixture passed because every case was
identical under both implementations; iteration S's rotted when an unrelated
constant moved. Check for both shapes:

- Would this assertion still fail if the fallback were removed?
- Does it depend on a constant defined in another module that someone could move?
  If so, assert the relationship, not the literal.

A company in the ledger with no map row must render cleanly, not crash.

## Task 5 — report the reporting failure too

If the pipeline was never credential-blocked, say that directly: how many
iterations I reported a blockage I had not tested, and what I should have run to
catch it. The user has been told twice that this needs their action. If that was
wrong, the correction matters more than the fix.

## Constraints

- Data plane only. No foot-core, no head, no CSS, no site build — another worker
  is mid-redesign there.
- No publishing. Debt already measured and reported; do not add to it.
- No outbound, no drafts, no queues, no money.
- Read all command output. Never redirect a command a later step depends on —
  that error has occurred three times today.
- Re-run any red in isolation before attributing it.
