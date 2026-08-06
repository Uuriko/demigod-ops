# Loop iteration C — finish the suite, then stop touching tests

## State read before deciding

```
suite        537 tests · 531 pass · 5 fail (was 12 this morning)
remaining    approveSubmission enforces the shared blocker before board work
             intake rejection cannot be promoted by approval
             same-email update cannot mint a second public card …
             founder compensation is one required, reviewable wizard step
             unchanged discovery is idempotent while new P0 evidence still queues
foot lock    free
```

## Evidence gathered on the two I inspected

**`demigod-submission-approval-guard.test.mjs` — two failures, both stale.**

1. Source-pattern: asserts `submissionApprovalBlocker(submission);` — one argument.
   The code at `demigod-submissions-lib.mjs:1126` now calls
   `submissionApprovalBlocker(submission, inbox.items)` — two. The guard exists
   and is **stronger**: it now considers the whole inbox, not just the record.
   The oracle pins an old signature.
2. Behavioural: expects `null`, gets `candidate_availability_reconfirmation_required`.
   That blocker is real and new — `demigod-submissions-lib.mjs:1118` fires it when
   `readiness.applicable && readiness.availabilityCurrent === false`. A candidate
   whose stated availability has gone stale must reconfirm before an approval can
   move them. The test predates the rule.

Both are the same shape as everything else fixed today: a guard got stronger, and
a test pinned to its old implementation went red.

## The rule I am now applying, because the sample is large enough

Nine of the ~14 failures resolved this session were stale oracles or vacuous
greens. Zero were product defects except the duplicate preconnect. That ratio is
the finding, not an accident, and it changes how I treat a red test:

**A failing assertion is a hypothesis about the product, not evidence about it.**
Check the source or the live DOM first, every time. Only after the product is
confirmed wrong does the test get to be right.

## Tasks

### Task 1 — `demigod-submission-approval-guard.test.mjs`

- Replace the pinned call signature with an assertion that the blocker is
  consulted **before** any board write, and that its result short-circuits. Do not
  pin the argument list; the point is the ordering, not the arity.
- For the behavioural case: the expectation is now wrong, not the code. A stale
  availability must block promotion. Update the fixture so the candidate's
  availability is current when the test wants `null`, and add a **second** case
  asserting that a stale availability *does* block — the rule is worth guarding
  now that it exists, and asserting only the passing direction would be another
  vacuous green.

### Task 2 — `demigod-startup-comp-step.test.mjs`

Asserts a falsy value where true is expected. Read the assertion, find what it
checks in the wizard, and determine from the live DOM or foot-core source whether
the comp step is still required and reviewable. **Do not assume it is stale** —
the compensation step is a real honesty surface (comp bands kept honest is a live
site claim), and this is exactly the case where the pattern could make me lazy.
If the step genuinely stopped being required, that is a product regression and the
test is right.

### Task 3 — the remaining two

`same-email update cannot mint a second public card` and `unchanged discovery is
idempotent`. Triage only this iteration — classify with evidence, fix only if the
fix is small. Both touch dedupe/idempotence, which is where a wrong "fix" does
real damage.

## Constraints

- **Do not weaken an assertion to make it pass.** Every change must leave the
  contract equal or stronger. If a test is red because the product got safer, the
  test moves to the safer contract — it does not get deleted.
- **Prove each fix non-vacuous.** Break the thing the test guards and watch it go
  red, then restore. This has caught two of my own bad tests today.
- Scope commits with explicit paths. Other agents are active.
- No publishing.

## After this

Stop working the test suite. Once it is green the signal is restored, and the
next iteration should go back to product — the directory intent-capture button is
on disk and unpublished, and the engagement one-pager still has a blank rate.
Continuing to polish tests past green would be its own kind of displacement.
