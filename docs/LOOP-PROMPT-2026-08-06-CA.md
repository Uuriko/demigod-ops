# Loop iteration CA — three worked examples, and an honest "proves / does not prove" panel

## State

```
settled     desk = landing page; this file = the Thesis Card tool surface
my lane     per DASHA-SYNC-2026-08-06.md §6: worked examples + a proves/does-not-prove
            panel + the integration contract. No desk edits.
brief L24   "Put three understandable Thesis Card examples on the landing page only
            after the Desk/community purpose remains clear."
gated       both suites PASS, incl. focus colour, axe 390/1440, drift, parity
```

## Why this, now

The tool currently asks a cold visitor to invent a thesis and an invalidation condition
from nothing. That is the hardest possible first interaction, and the invalidation field
is exactly the one the copy already admits "most people skip". Worked examples are the
standard fix and the brief explicitly sequences them here.

The second half matters more. The page makes a claim it has never precisely bounded: what
does a thesis card actually *establish*? Right now the honest limits are real but buried in
a run-on `<small>` note — *"the timestamp is not independently verified and this card is not
proof of when a claim was made"* — sitting under the output where a first-time reader
never goes.

That sentence is the single most important thing on the page and it is in the smallest
type. A card that people share is a card whose limits get shared with it, or not at all.

There is also research pressure for this specifically. CHI 2026's second credibility
marker is **bounded epistemic competence** — "acknowledging the limits of one's expertise
and avoiding prognostication." A panel that says plainly what the artifact does not prove
*is* that marker, implemented. It is the cheapest available piece of the thing the
literature says the market already recognises.

## Task 1 — three worked examples, and let the third one carry the weight

Bull, bear, and **invalidated**. The third is the point: a call that was proven wrong, and
was honoured. Every competing product shows its winners. Showing a loss that settled
cleanly is the entire differentiator, and it is the only one of the three that
demonstrates what the invalidation field is *for*.

Write them as short, concrete pairs of thesis + invalidation, in a normal person's voice.
Not slogans. If an example reads like marketing copy, it teaches nothing about how to fill
the field.

Hard constraints, same as the hero card:

- **No candidate mint.** Self-documenting placeholders only. A real address in a worked
  example reads as a call on that token.
- **No price targets, no return figures, no percentages of gain.** A thesis in this product
  is a reason, not a number — the copy already says "Not a target, not a chart pattern —
  the reason", so an example with a price target would contradict the page one section up.
- The invalidated example must show the *condition that fired*, not a P&L outcome. It got
  settled, not "it lost".

Consider whether the examples should be clickable to prefill the form. It teaches faster
and it is a small amount of code — but it touches the form, and the form is inside the
drift-guarded region shared with the standalone. **If prefill cannot be done from outside
that region, do not do it.** A static example that teaches is worth more than a clever one
that breaks the two-copy contract.

## Task 2 — the proves / does not prove panel

Two columns, plain language, no hedging in either direction.

**Proves** is genuinely something: the checksum detects any later edit of the text. That is
a real, verifiable property and it should be stated with confidence rather than buried
among the disclaimers.

**Does not prove** must include, at minimum: that the timestamp is local and unverified, so
the card is not evidence of *when* a claim was made; that it says nothing about the token's
safety or quality; that it verifies no identity; and that nobody is obliged to honour it.

Do not soften these into marketing. The panel earns trust precisely by being the place
where the product argues against itself, and a reader who spots one hedge stops believing
the rest of the page.

Check it against the existing "What this is not" strip and the output note. If the panel
makes either redundant, **cut the redundant one** — three overlapping honesty blocks read
as anxiety, not as candour, and the page is already long.

## Task 3 — the integration contract, as a document, with no desk edits

The Desk will eventually embed this tool. Write down what it needs: the DOM ids the script
depends on, the CSS custom properties it reads, what it does at runtime (nothing leaves the
browser, no network, no storage), the canvas card dimensions, and what must not be renamed.

Keep it short and executable. Grok owns `dasha-desk/src/*`; this is a spec handed over, not
a change made. **Do not touch that repo** — my last report into it was three commits stale,
so anything I assert about the desk must come from a fresh read.

## Task 4 — gate the new content, and prove the gate fails

Two assertions worth having, both of which would catch a real regression:

- The invalidated example is present and is actually framed as invalidated. If someone
  later "cleans up" the examples into three winners, the product's differentiator quietly
  disappears and nothing notices.
- The does-not-prove column still contains the timestamp limitation. That is the claim
  most likely to be softened by a future copy pass, and it is the one that matters legally
  as well as ethically.

Prove both red before trusting them, and restore via git rather than by retyping.

## Task 5 — verify by rendering, at both widths

Look at it. Every copy and layout defect today was caught by looking, never by reading a
diff. Watch specifically for the two-column panel collapsing badly at 390, and for the page
getting long enough that the tool falls below a reasonable scroll — the tool must stay
above the explainer, which both agents agreed on.

Re-run both suites, including the >2000 indexable-chars assertion, which this task moves in
the safe direction but should still be confirmed.

## Constraints

- Nothing inside the drift-guarded tool region unless it lands identically in both files.
- No candidate mint, no price target, no return figure, no outcome claim.
- The panel must not hedge; if a limitation is real, state it flatly.
- Cut a redundant honesty block rather than adding a third.
- Read-only on `dasha-desk`; the contract is a spec, not an edit.
- Both new assertions proved red before being trusted.
