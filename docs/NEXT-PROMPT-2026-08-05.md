# What to do next — self-prompt

Written after closing [F1]. The task register is `docs/DEMIGOD-TASKS.md`; the
dated evidence is `DEMIGOD-TASK-LIST-2026-08-05.md`.

## What just changed, and why it reframes the queue

Closing [F1] took three fixes, and **none of them were in the product**:

1. `isWelcome` matched headline copy the copy passes renamed.
2. The walk ended in 4 blind `clickNext` calls assuming a field order the wizard
   no longer has — it parked at `bar:38%` on a card-select those clicks cannot
   satisfy.
3. `passWizard` required `/^Question \d+/` against `meta`, which `wizState`
   builds as `"bar:<width> next:<label>"`. That condition could never match. Dead.

The startup wizard — the revenue-side flow — was never broken. Three layers of
test staleness reported it failing for an unknown period.

Combined with the earlier `demigod-sprint-selftest.mjs` fix (a slice between two
markers that no longer existed, asserting on `''`), that is **four confirmed
false signals**: three false negatives and one false positive.

**Therefore the next priority is not the next feature. It is: how many of the
remaining test failures are real?** The audit classified 3 as environment and 11
as real, but "real" there meant "not explained by the wipe." Two have since been
shown stale. That classification is now untrustworthy, and a suite with standing
reds stops being read — which is exactly how a real defect hides.

## Task 1 — Re-triage every failing test (do this first)

For each of the 14 failures in the last full run, classify with evidence:

- **REAL** — the product is wrong. Cite the incorrect behaviour, not the failing
  assertion.
- **STALE ORACLE** — the test asserts copy, field order, DOM structure, or a
  string format that legitimately changed. Cite what it asserts vs what exists.
- **ENVIRONMENT** — a wipe casualty: missing data file, missing systemd unit,
  missing credential.

Then, for every STALE one, ask the second question: *what would this test have
caught if it were working, and is that thing still worth guarding?* A stale test
whose subject no longer exists should be deleted, not repaired.

Method: run `node --test <file>` individually. Read the assertion. Check the
current source or live DOM. Do not infer from the test name.

Deliverable: a table in `docs/TEST-TRIAGE-2026-08-05.md` — file, verdict,
evidence, action (fix / delete / restore-env). Then fix the REAL ones.

## Task 2 — Harden against the class, not the instances

Four false signals in one session is a systemic property, not bad luck. Two
concrete shapes to eliminate:

**Marker-slice tests.** `src.slice(src.indexOf(A), src.indexOf(B))` returns `''`
when a marker vanishes, and every assertion on `''` passes. Live in
`demigod-startup-atlas-web.test.mjs:198` and
`demigod-dashboard-events-native-invite.test.mjs:9,10,11,159`. All four verified
non-empty today, so this is hardening, not a bug fix. Write one shared helper —
`sliceBetween(src, a, b)` — that throws when either marker is absent, and route
all five callers through it.

**Copy-coupled oracles.** Any test asserting on user-visible prose will rot the
moment copy changes, and copy is changing constantly right now. Grep the suite
for string literals that also appear in `demigod-foot-core.js` COPY, and for each
decide: assert structurally instead, or accept the coupling and document it.

## Task 3 — Then, and only then, the product queue

In order, from the task register:

- **[B1] replacement guarantee** — highest value per unit of work; also lets
  [R7] (the "First result, not a guarantee" defensive paragraph) be deleted.
  Full plan in `COMPETITOR-ANALYSIS-2026-08-05.md` §Build 1.
- **[R1]–[R3] deletions** — 70 `heavy-send-*`, 3 dead `cursor-*`, 3 broken npm
  scripts. Fast, and shrinks everything downstream. Grep for live callers first.
- **[B4] `#dg-site-nav`** — resolve the unknown before building: was the nav
  removed deliberately (making the JSON-LD and the test both stale), or did the
  injection break? If deliberate, this is a deletion, not a build.

## Task 4 — Copy, continued

The open-roles section is done (20 words → 10, provenance carried by design).
Next largest cut, already measured in the rendered DOM:

- `/hire` restates the entire `/how` process as 4 steps.
- The homepage states the compare/decide mechanic 3× and the consent gate 6×.

Constraint from `COPY-REDUCTION-PROMPT-2026-08-05.md`: the honesty guarantees
*are* the prose. Cut repetition across views; never cut a consent, provenance, or
non-automation qualifier. Keep the strongest instance of each claim, delete the
echoes.

## Rules for this work

- **No feasibility verdicts.** State what something requires; never conclude it is
  out of reach. Resources are not visible to me.
- Verify by running, not by reading. This session's entire lesson is that a test's
  verdict is not evidence about the product.
- One writer for `demigod-foot-core.js`. Another agent bumped it v935→v939 mid-
  session and silently clobbered a fix. Check `git diff` before and after edits.
- Scope commits with `git commit -- <paths>`. An earlier commit swept 14 files
  from another agent's staged index.
- Disk only. Publishing needs explicit authorisation in the current request;
  `truth` reports `disk=v939 live=v903 prepareOnly`.

## Still blocked on the user, unchanged for four days

`gh auth login` → verify `Uuriko/demigod-ops` exists. Four commits, no `main`, no
backups, unverified remote. Every deliverable above lives on one disk until this
is answered. Then restic + a repo target for `bin/dg-backup`.
