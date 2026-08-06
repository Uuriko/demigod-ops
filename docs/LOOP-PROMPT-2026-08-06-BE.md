# Loop iteration BE — remove the prose the diagram now carries, and nothing else

## State

```
just did   inlined the three-step diagram into /how, above the prose
flagged    "deliberately did not touch the prose… trimming honesty-gated copy is a
           separate decision with its own gates" — that decision is this iteration
user asked "find more needless text to remove, stop overexplaining everything,
           less is more. use good design and site layout to minimize need for text"
page now   lead sentence + diagram + CTAs + ~350 words restating the same three
           steps
```

## Why this, now

The user's instruction has two halves and I have done one. Adding a visual without
removing the text it replaces makes the page **longer**, which is the opposite of
what was asked. The diagram is only an improvement if it lets something go.

This is also the riskiest copy work on the site, so it gets the tightest rules.
`/how` is where the product's load-bearing claims live — "nothing is messaged yet",
"Software never auto-intros", "identity stays private until both say yes". Those
are the claims the honesty gates exist to protect and the reason this product can
say what it says. Cutting one to save a line would be a real harm, not a tidy-up.

## Task 1 — inventory every claim in the /how prose before cutting anything

List each sentence in `DG_PAGES.how.html` and mark it:

- **Duplicated by the diagram** — the diagram states it in words or structure.
  Candidate for removal.
- **Unique detail** — adds something the diagram cannot carry: what a startup
  submits, what a candidate submits, what happens after a yes, the fee mechanics.
  **Keep.**
- **Load-bearing honesty claim** — a promise about what the system does NOT do.
  **Keep, even if the diagram also says it.** Redundancy on a refusal is cheap;
  losing one is not.

Do this as an explicit list before editing. The temptation is to cut by feel, and
by feel the honesty claims read as the most cuttable because they are the least
promotional.

## Task 2 — cut only the duplicated-and-not-load-bearing sentences

Rules:

- Remove whole sentences, not clauses. A half-edited sentence reads worse than
  either version.
- Do not rewrite what stays. Rewriting turns a reviewable diff into a new draft and
  invites drift in claims nobody asked to change.
- If a cut makes a paragraph a single sentence, that is fine — that is the point.
- Target: the three `<li>` bodies, which restate exactly what the diagram shows.

## Task 3 — prove nothing was lost, with the gates and by reading

- `bin/dg ship prepare` — board-honesty and verify-source must pass.
- `demigod-live-honesty-audit --selftest` and any copy-scrub gate that applies.
- **Diff the claim inventory before and after.** Every claim marked keep must still
  be present in the served markup. This is the check that matters; a green gate
  proves no banned phrase appeared, not that a needed one survived.
- Re-render `/how` at 390×844 and look at it. Confirm it reads as complete rather
  than truncated, and that more of it now fits above the fold.

Report the word count before and after, and the number of claims in each bucket.

## Task 4 — lock, verify, release, do not commit or publish

Same discipline as the last two iterations: claim the foot lock with a reason,
re-check foot-core's mtime after claiming, revert on any gate failure, release in
every outcome.

Do not `git add demigod-foot-core.js`. Do not publish.

If the inventory shows nothing is safely cuttable — if every sentence is unique
detail or a load-bearing claim — **say that and cut nothing.** "The page is already
tight" is a legitimate finding, and inventing a cut to satisfy the instruction
would be worse than leaving it.

## Constraints

- No claim removed that the diagram does not fully carry.
- No rewriting of retained copy.
- Lock held for the edit, released after.
- No commit of contested files, no publish, no outbound.
- Read all command output; look at the rendered page.
