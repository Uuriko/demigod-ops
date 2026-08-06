# Loop iteration Y — make scoring changes impossible to ship silently

## State

```
site      HELD, unambiguously — foot-core written 18s before the check, foot lock
          CLAIMED with why="foot-core edit", 1,650 insertions uncommitted
truth     disk v1030 · live v1019 · lagDebt · publish needs current-request auth
new       explainMatch ships the per-term basis behind every match score
open      D2 persist the basis · D3 scoring-drift guard · S1-S4 blocked on site
```

## Why this, now

Iteration X added `explainMatch` and proved it score-preserving with a differential
harness: 4,000 generated role/candidate pairs, new implementation against old, zero
mismatches. That harness was the most valuable thing built in the iteration and I
**threw it away** — it lived in a temp file that was deleted at the end of the run.

That is backwards. Scoring is the one part of this codebase where a silent change
is most damaging and least visible: a weight edit moves every candidate's ranking,
breaks no test, throws no error, and produces a plausible number. This session has
now caught three vacuous guards and two stale conclusions; a scoring change is
exactly the class of edit that slips past all of them.

The differential harness has to become a permanent guard, and the score basis has
to be reconstructable after the fact rather than only at print time.

## Task 1 — D3, the scoring-drift guard (do this first; it is the safe one)

Rebuild the differential harness as a committed test, but fix its central weakness:
last time it compared the new implementation against a copy of the old one, which
only works during a refactor. A permanent guard needs a **fixed corpus with pinned
expected scores** — a golden file — so any future weight change shows up as a diff
against recorded values rather than against a copy of itself.

Requirements:

1. A deterministic corpus of role/candidate pairs. **No `Math.random()`** — a
   flaky scoring test would be disabled within a week and this session has already
   shown how fast standing reds get normalised. Generate systematically from term
   lists, the way iteration X's harness did.
2. Cover the range, not just the happy path: strong matches, zero-overlap pairs,
   empty role, empty candidate, missing comp, non-SF location, and the capped case
   where terms sum above 100.
3. Pin expected scores in a committed golden file. When a weight legitimately
   changes, updating the golden is a deliberate, reviewable diff — which is the
   entire point.
4. The failure message must name what moved: which pair, old score, new score, and
   which term changed. `expected 82 got 74` sends someone hunting; `skills-overlap
   54→46 on pair #12` does not.
5. Assert the breakdown sums to the score across the whole corpus, not just one
   case — that invariant is what makes the basis trustworthy at all.

Prove it non-vacuous by changing a weight (e.g. skills overlap 18 → 16), confirming
red with a message that names the term, then restoring.

## Task 2 — D2, persist the basis onto proposed pairs

Today the breakdown exists only in the `suggest` output. A pair written to the board
keeps `score` and loses why. That means a match reviewed next month cannot be
explained, and a scoring change silently reinterprets every historical score.

**Check the honesty gates and pair schema BEFORE writing.** `demigod-pairs-lib.mjs`
owns pair shape, and several gates validate exact key sets — iteration U's entire
defect was a projection carrying a field the validator's allow-list rejected. Do
not repeat that: find the validator first, and if the pair schema is exact-keyed,
extend it deliberately rather than bolting a field on and discovering the refusal
downstream.

If extending the schema turns out to be genuinely risky — a gate that cannot
accommodate it without a migration — **stop and say so**. A written-up reason to
defer is a legitimate deliverable. Do not force a schema change to make the
iteration feel productive.

Constraints on what gets persisted:

- The basis only: term name, points, and the short detail already computed. **No
  candidate PII in the detail** — the terms currently carry shared skill names and
  a comp string. Verify no name, email, or phone can reach the stored detail.
- Scores stay derived. Persisting the basis must not create a second source of
  truth that drifts from what `explainMatch` would compute today.

## Task 3 — verify like the last three iterations, not like the first ten

- Every new test proven non-vacuous by breaking its subject and watching it fail
  with a message that names the real problem.
- Check the fixtures for the degenerate shape: would the assertion still fail if
  the subject were broken? Does it depend on a constant another module could move?
  Both shapes have bitten this session.
- `demigod-funnel-selftest.mjs` and the matching suites before claiming anything.
- Re-run any red in isolation before attributing it; another worker is active.

## Constraints

- Data plane only. Site verified held this iteration — no foot-core, head, or CSS.
- No publishing, no outbound, no drafts, no money, no contact data.
- No new dependencies. Node's test runner and stdlib cover all of this.
- Read all command output. Never redirect a command a later step depends on.
