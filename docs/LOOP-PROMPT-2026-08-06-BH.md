# Loop iteration BH — run the trim method across the remaining mini-pages

## State

```
done      /how   removed a fee line I had duplicated into my own diagram
          /startups  275 -> 193 chars, 174px -> 124px, no claim lost
method    measure the vertical budget at 390px → inventory every sentence against
          what else the page already shows → cut only proven duplicates → verify
          each retained claim survives in the rendered page → look at it
untouched /refer /sample /talent /hire /pricing /about  (and /legal, excluded)
chars     refer 1758 · legal 1969 · sample 1510 · talent 1141 · hire 1031 ·
          pricing 962 · about 841   (disk build, 390px)
```

## Why this, now

The instruction was general — *"find more needless text to remove, stop
overexplaining everything, less is more"* — and I have applied it to two pages out
of eight. The method is proven and cheap, and both times the honest answer was
different from my first guess, which is exactly why it is worth running rather
than eyeballing.

`/legal` is excluded outright. Privacy and terms copy is not padding, and trimming
it is a legal question rather than a design one.

## Task 1 — measure before reading

For each of `/refer /sample /talent /hire /pricing /about`, at 390×844 with the
disk build: the height of every direct child above the primary CTA row.

Rank by the largest single text block. On `/startups` this is what redirected me
from the paragraph I assumed was the problem to the one that actually was — a
174px block I had never looked at. Do not skip to reading the copy.

## Task 2 — inventory each candidate's sentences against the rest of its page

For the two or three heaviest blocks only. For each sentence:

- **Stated elsewhere on the same page** — by a badge, a heading, a CTA label, or a
  later sentence that says it more completely. Candidate to cut.
- **Unique detail** — keep.
- **A refusal** — what the product does NOT do, does not claim, does not sell.
  Keep even if duplicated. Every one of these pages carries them and they are the
  reason the honesty gates pass.

Write the inventory before editing. Twice now it has stopped a cut that would have
removed a claim.

## Task 3 — cut whole sentences, verify every retained claim renders

- Whole sentences only. No clause surgery, no rewriting what stays.
- After each page: render at 390px, assert every retained claim is present in the
  served text, and report chars/px before and after.
- **Render with the page's own scripts intact where the claim lives in the
  directory renderer.** Last iteration my verification aborted all catbox `.js`,
  which includes atlas-web, and reported a surviving claim as LOST. Match the
  verification to where the claim actually lives.
- `bin/dg ship prepare` after the last edit — board-honesty and verify-source.

## Task 4 — stop when the cuts stop being obvious

If a page's heaviest block is all unique detail and refusals, say so and move on.
Two of the last three copy inventories concluded "already tight", and that was the
correct answer both times. A page left alone is a result.

Target the two or three best candidates, not all six. A large diff across six
pages is unreviewable and the other worker is still holding this file.

## Constraints

- Foot lock for the whole edit; re-check mtime after claiming; release after.
- `/legal` untouched.
- No rewriting of retained copy; no touching badges, filters, or CTA rows.
- No commit of contested files, no publish, no outbound.
- Look at the rendered page, not just the DOM.
