# Loop iteration S — audit my own guards for the shape I spent the session finding

## Why this, now

The single most useful finding of this session was that **~12 of 14 test failures
were stale oracles or vacuous greens, and only one was a real product defect.** I
built the habit of breaking a thing and watching its test go red before trusting
it.

Last iteration that habit caught me. I "proved" the company-key unification
non-vacuous by reverting it and re-running — and got **9/9 pass**. Every merge
fixture used a single-word company (`Hightouch`, `Gigs`, `Alpaca`) where both key
schemes agree, so the proof could not fail. I only noticed because the number
looked wrong for a change I knew was load-bearing.

I have added **seven test files** this session. Each one I declared non-vacuous
after a single break-and-check. Given one of them was degenerate, the honest move
is to assume others may be, and check systematically rather than trusting the
declaration.

## The guards to audit

```
demigod-foot-copy-rerun.test.mjs            copy scrubs re-applied on load
demigod-public-roles-startup-first.test.mjs directory ranks startups first
demigod-directory-brief-cta.test.mjs        intent-capture button contract
demigod-startup-threshold-drift.test.mjs    four classifiers agree on 200
demigod-mobile-bar-on-routes.test.mjs       bar on routes, not modals
demigod-targets-merge.test.mjs              store preserves human judgement
demigod-targets-detail.test.mjs             display join, no store pollution
```

## Task 1 — break each guard's subject, one at a time

For every file above, identify the **single most important thing it protects**,
break exactly that in the source, run only that test file, and record whether it
went red and with which message.

Not "does the suite still pass" — that is the question I already answered. The
question is: *if the protected behaviour regressed tomorrow, would this file
notice?*

Restore the source immediately after each check and re-verify green. Work one file
at a time; do not batch breakages, or a passing test may be passing for the wrong
reason.

Record per guard: what was broken, red or green, and the failing message. A guard
that stays green is a finding, and fixing it is the point of the iteration.

## Task 2 — look specifically for the degenerate-fixture shape

The bug last iteration was not a missing assertion. It was a **fixture that could
not distinguish the two behaviours**. Look for that shape specifically:

- fixtures whose values are identical under both the correct and incorrect
  implementation (single-word names, empty arrays, zero counts, one-element sets)
- assertions on a slice whose markers might both be absent, so the slice is `''`
  and everything passes — the class I found in `demigod-sprint-selftest.mjs` and
  `demigod-webhook-rate-limit.test.mjs`
- `doesNotMatch` against a value that is empty for an unrelated reason
- source-text assertions where the file could be unreadable and the regex would
  still not match, so a bad read reads as a pass

Several of my files already have a `source read is real` guard for the last case.
Check that every file that reads source has one, and that its threshold is high
enough to actually catch a truncated read.

## Task 3 — fix what is found, prove the fix

For any guard that stays green when its subject is broken:

1. Add the fixture or assertion that distinguishes the cases.
2. Re-break, confirm red, confirm the message names the actual problem.
3. Restore, confirm green.

An assertion whose failure message does not identify the defect is only half a
guard — the drift test's `atlas ceiling 500 has drifted from STARTUP_TEAM_MAX 200`
is the standard to hold to.

## Task 4 — report honestly, including the count

State how many of the seven were genuinely non-vacuous and how many were not. If
all seven pass, say so plainly; if three were degenerate, say that. The number is
the finding either way, and understating it would repeat the exact failure this
iteration exists to correct.

## Constraints

- One breakage at a time, always restored before the next.
- Back up any file before editing it, and verify the restore with `node --check`.
- Do not weaken an assertion to make a guard "work" — strengthen the fixture.
- No foot-core edits beyond temporary break-and-restore; hold the lock if the
  restore is not immediate.
- Run only the affected test file per check; the full suite has been racing
  against another worker all session.
