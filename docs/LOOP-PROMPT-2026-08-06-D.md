# Loop iteration D — last two failures, then leave the suite alone

## State

```
suite   537 tests · 535 pass · 2 fail
  ✖ founder compensation is one required, reviewable wizard step
  ✖ unchanged discovery is idempotent while new P0 evidence still queues
```

## Evidence on the comp step — the one I said not to get lazy about

I flagged this in iteration C as the case where the stale-oracle pattern could make
me careless, because *comp bands kept honest* is a live site claim. So I checked it
harder rather than softer.

**The failing assertion is not about compensation being required. It is about
wizard step ORDER:**

```js
assert.ok(startup[0].indexOf("['90day-outcome']") < startup[0].indexOf("['salary-range']"))
```

Actual captured order, read from the source:

```
welcome → role-title → company-name → company-stage → stack-needs
→ work-location → salary-range → 90day-outcome → contact-email → submit → thanks
```

`salary-range` is at index 96, `90day-outcome` at 113. Salary now comes first.

**This order is identical at HEAD** — verified with `git show HEAD:demigod-foot-core.js`.
It is committed, not another agent's in-flight edit, and has been this way since
the recovery snapshot.

**Every honesty invariant in the same test still passes:**

| Invariant | Status |
| :--- | :--- |
| exactly one `salary-range` step | ✓ length 1 |
| not in the `optional` list | ✓ |
| `name="salary-range" required` in the form | ✓ 1 occurrence |
| has a `WIZ_Q` entry so it stays reviewable | ✓ 1 occurrence |
| not marked optional in its question text | ✓ |
| carried into the submission, in order | ✓ |
| public comp scrubs email / phone / LinkedIn | ✓ |

So the test's own claim — *"founder compensation is one required, reviewable
wizard step"* — holds completely. What broke is a **UX sequencing preference**:
whether you ask what the person should achieve before what you will pay them.

Neither order is more honest. Grouping the hard constraints (location, comp) and
then asking the open-ended outcome question is a defensible flow. This assertion
encodes a product opinion as if it were a guarantee.

## Task 1 — comp step

Replace the outcome-before-salary ordering assertion with the invariants that
actually carry the honesty claim, and say so in a comment. Specifically:

- **Keep** every requiredness/reviewability assertion untouched. They are the
  reason this test exists.
- **Keep** `salary-range` before `contact-email`. That one is not a preference:
  describing the role before collecting contact details is the right sequence, and
  it currently passes.
- **Replace** the outcome-before-salary line with an assertion that all four
  constraint fields are present as distinct steps, in whatever order the wizard
  chooses. Presence is the invariant; sequence is design.

Do not simply delete the line. A deleted assertion protects nothing; a replaced
one protects the thing that mattered.

## Task 2 — discovery idempotence

`unchanged discovery is idempotent while new P0 evidence still queues`. Untriaged.
Idempotence and dedupe are where a wrong "fix" does real damage, so:

1. Read the assertion and the function it exercises.
2. Determine from the source whether the behaviour changed or the oracle did.
3. If the product is genuinely non-idempotent now, that is a **real defect** —
   report it and fix the product, not the test.
4. If it is another stale fixture, fix it the same way as the others: move the
   contract to what matters, prove non-vacuous, comment why.

## Task 3 — stop

Once the suite is green, **stop working on tests.** The signal is restored; more
polish is displacement. The next iteration goes back to product, where two things
are waiting:

- The directory intent-capture button is on disk and unpublished. Another agent
  already fixed my dead `/hire` fallback to `/?wiz=startup`. It needs a rendered
  check and a publish.
- `docs/ENGAGEMENT-ONE-PAGER-DRAFT.md` still has a blank rate. That is a business
  decision, not a build — but the doc is ready for it.

## Constraints

- Every change leaves the contract equal or stronger. Never weaken to pass.
- Prove each fix non-vacuous by breaking what it guards.
- Explicit paths on commits; other agents are active.
- No publishing this iteration unless the request authorises it.
