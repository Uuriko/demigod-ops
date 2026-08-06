# Loop iteration AD — full-suite health, then bloat

## State

```
suite      NOT run end-to-end in many iterations. ~130 tracked files modified by
           another worker plus my own changes since the last full pass.
last full  537/537, then 548/549, both hours and hundreds of edits ago
goal       "add features, improve existing things, remove bloat and fix bugs"
blocked    publish auth · pricing · ADS disclosure · directory-SVG decision · forms
```

## Why this, now

The last several iterations audited my own tooling — tests, blocked list, backups,
claims — and each found something real. But that vein is thinning, and there is a
concrete thing I have simply not done: **run the whole test suite.**

Since the last full pass, another worker has modified ~130 tracked files including
foot-core, head-minimal, head-styles and directory-static, and I have changed the
matching engine, the export, the directory heading, the role ledger and the X
collector. I have been running targeted files and reporting those greens. A
targeted green says nothing about the 500-odd tests I did not run.

If the suite is red, that is the most important fact available and I do not
currently know it. Everything else in this prompt is contingent on that answer.

## Task 1 — run everything, and time it

Run the full suite. Capture the total, the failures, and how long it took.

Do not summarise a red into a count. For every failure, get the file, the test
name, and the assertion message.

## Task 2 — triage each failure into exactly one class

This session established the taxonomy the hard way; use it. Of ~14 failures
triaged earlier, exactly ONE was a real product defect.

- **Real product defect** — behaviour a user would experience is wrong. Fix it.
- **Stale oracle** — the test pins copy, a signature, or a constant that
  legitimately changed. Update the oracle, and check whether the new oracle can
  still fail.
- **Vacuous green turned red** — the test was never really testing; it only
  started failing because its subject moved. Strengthen it.
- **Race** — another worker was mid-write. **Re-run the file in isolation before
  attributing anything to anyone.** The suite has raced repeatedly today.

Attribution matters and misattribution is expensive: earlier this session I swept
14 files out of another agent's staged index, and separately spent an iteration
inferring a UI "clash" from a measurement taken at the wrong scroll offset. If a
failure is in a file the other worker is actively editing, say so and leave it.

## Task 3 — if the suite is green, remove bloat

The goal names bloat removal explicitly and 73 dead files went earlier. Look for
what has accumulated since, with evidence rather than instinct:

- Scripts with no importer, no npm script, no systemd unit, no `bin/dg`
  subcommand, and no reference in AGENTS.md or DEMIGOD-AGENTS.md.
- **Check references honestly.** My own deletion audit once counted three
  references for three files where every "reference" was my own
  deletion-candidate document citing itself. A doc I wrote proposing a deletion
  does not count as a use.
- Duplicate implementations of a thing that now has one canonical home —
  `companyKeyFor`, `startupScore` and the map join have all been unified this
  session; check whether stragglers remain.
- Dead branches inside live files: flags nothing sets, states nothing reaches.

**Do not delete anything the user has fenced.** `AGENTS.md:30` says never touch
the game scripts unless the user says "reopen the game" — I recommended removing
three of them three times before reading that line. Read the fences first.

Anything deleted must be verified unreferenced by search, not by memory, and the
suite must be green after.

## Task 4 — report the number honestly

State the total and the failure count plainly. If the suite is green, say so
without embellishment. If it is red and the reds are someone else's in-flight
work, say that too rather than presenting a clean number I did not earn.

## Constraints

- No foot-core, no head, no CSS edits — still uncommitted redesign territory.
- No publishing, no outbound, no money.
- Re-run any red in isolation before attributing it.
- Read all command output; never redirect something a later step depends on.
