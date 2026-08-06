# Loop iteration CG — make the demo path work in two clicks

## State

```
built       the loop: write a call -> it lists -> due -> settle -> streak + marker
shipped     f0934f9, both gates PASS, preview refreshed
suspected   "Start from this" prefills thesis + invalidation but NOT the resolution
            date -- which grok made REQUIRED and future-only after I wrote the prefill
cold view   a first-time visitor sees an empty "Your calls" box before they have
            written anything, positioned above the examples that would teach them
user need   show people, fast
```

## Why this, now

The user is demonstrating this to people. That makes the **demo path** the product, and
the demo path is the one thing I have not walked end to end since the tool changed
underneath me.

The specific risk is a bug I probably introduced by sequencing. I built "Start from this"
to prefill the thesis and invalidation. Grok then replaced the horizon select with a
**required, future-only** resolution date. If prefill does not set that date, then the
exact path someone would walk a stranger through — click the example, hit generate — dead
ends on a validation error, in front of an audience. Every field looks filled and the form
refuses.

That is worse than a plain bug. It looks like the product is broken.

Second: the cold read. A first-time visitor now meets an empty "Your calls" box, and it
sits **above** the examples that would teach them what a call even is. The best feature on
the page is invisible until you act, and the first thing a stranger sees is an empty
container. Both are fixable in minutes.

## Task 1 — verify the prefill bug before fixing it

Click each "Start from this" and submit, exactly as a visitor would. Read `#error` and
check whether `#output` unhides.

Do not fix from the theory above. I have twice today built a fix for a defect that was not
there — the "already-due call" test failed because the *tool was right and my test was
wrong*. Confirm the failure exists, then fix it.

If it does fail, the fix is to also set a sensible future resolution date. Sensible means
matched to the example's own language: the one about two weeks of silence should not
resolve tomorrow. Compute it as an offset from today rather than hardcoding a date, or it
rots the moment it passes — and a hardcoded past date would reintroduce the exact
validation error being fixed.

## Task 2 — hide "Your calls" until there is something in it

A cold visitor should not meet an empty box. Hide the whole section when the list is
empty, so it **appears** the first time someone writes a call. That is a better moment
than a permanent placeholder, and it removes a dead element from the first impression.

Check the section ordering while there: the list currently sits above the examples. For
someone who has never used the tool, examples teach and the list means nothing. Once
hidden-when-empty, the ordering matters much less — confirm rather than assume, and do not
reorder if hiding already solves it. Moving sections has broken things twice today.

## Task 3 — walk the whole demo, as a stranger, and time it

Load the page fresh with storage cleared. Click an example. Generate. See it appear in
"Your calls". That is the demo, and it should be two clicks and obvious.

Then confirm the part that cannot be demonstrated live: settling requires a date to pass.
There is no honest way to show the streak or the `Called it wrong. Said so.` marker in a
live demo without waiting, and **I must not seed fake calls to fake it** — a product about
not rewriting history cannot ship staged history. Note it as a talking point instead.

## Task 4 — update the handoff

`DASHA-SHOW-THIS.md` predates the loop entirely. It should carry the two-click demo script,
what to say about the settle step that cannot be shown live, and the fact that the
portable file has the full loop because localStorage works from `file://`.

Keep it short. It is meant to be read walking into a room.

## Task 5 — gates, and the drift guard specifically

Both suites. The drift guard matters most: there are now three scripts in the landing page
and the guard resolves the tool script by taking the **first** one matching `receipt-form`.
Any change near the prefill script could disturb that ordering. Confirm it still resolves
to the script containing `card()`.

## Constraints

- Confirm the defect before fixing it.
- No seeded or fake calls, ever — not even for a demo.
- Resolution dates computed as an offset from today, never hardcoded.
- Do not touch the drift-guarded tool region.
- Do not reorder sections if hiding-when-empty already fixes the cold read.
