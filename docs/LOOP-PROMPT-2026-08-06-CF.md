# Loop iteration CF — build the loop: your calls, settled by you

## State

```
specced      DASHA-SPEC-GAMIFICATION.md steps 1-3: personal settlement record, the
             "Called it wrong. Said so." marker, settlement streak.
             "Steps 1-3 need no server, no account, and no identity."
built        nothing. Two specs, zero product.
blocked      auto-settlement (needs a decision on the privacy line) and any leaderboard
             (needs identity). Neither blocks steps 1-3.
hazard       grok edited the shared tool mid-turn today. The tool region is drift-guarded
             and shared. Anything I add must live OUTSIDE it.
```

## Why this, now

The user said the product feels boring. I answered with analysis and two design documents,
which is the correct first move and is now finished. What makes it not boring is a **loop** —
a reason to come back — and the spec already establishes that the honest loop needs nothing I
am blocked on.

Manual settlement is the version that requires zero infrastructure: you wrote a call with a
resolution date; when that date arrives you come back and say what happened. No feed, no
network, no account, no server. The promise on the page stays exactly as true as it is today.

It is also the version that is *most* on-thesis. Auto-settlement is convenient, but a person
choosing to mark their own call as wrong is the entire behaviour this product exists to
create. Automating it away would be removing the moment that matters.

## Task 1 — build it as an observer, not an edit

The tool's form and script are drift-guarded and shared with grok's file, and grok changed
them **today, mid-turn**. Editing that region invites a collision and a broken guard.

So: add a separate module, outside the guarded region, that watches the existing tool rather
than modifying it. Hook the submit or observe `#output` becoming visible, then read the
fields that are already in the DOM. The tool does not need to know this exists.

Precedent already set: the worked-example prefill script does exactly this and the drift
guard stayed green. Reuse that pattern, including the rule that **the new script must not
contain the string `receipt-form`** — the guard finds the tool script with
`m.find(x => /receipt-form/.test(x))`, which returns the *first* match, so an earlier script
mentioning it would be silently compared instead.

## Task 2 — the states, from the spec

`OPEN` (resolution date ahead), `DUE` (date passed, not yet settled), and the settled
outcomes. A `DUE` card is the call to action — it is the entire reason to return.

Settling is two choices: **it held**, or **it fired and I was wrong**. The second gets the
marker. Per the spec, the wording must read as earned rather than as punishment — `Called it
wrong. Said so.` — because if it reads as a scarlet letter nobody opts in and the design
collapses.

Show the streak as identity, not as a number at risk: it counts **settled calls**, and it
breaks only on ghosting a due call. Never on failing to open the page.

## Task 3 — storage, and the deletion tension

`localStorage`, on the user's own device. This keeps "nothing is stored on our side" literally
true and is worth saying in the copy, not just in the code.

**Test that `localStorage` actually works from `file://`.** The portable single file is how
this gets shown to people, and if storage is blocked at that origin the feature silently does
nothing there. Do not assume — some origins restrict it. Verify, and if it fails, degrade
visibly rather than silently.

There is a real tension to resolve rather than dodge: a product about accountability that
lets you delete your losing calls. Offer deletion anyway — it is the user's own device and
their own data, and refusing would be a privacy failure dressed as principle. Resolve it
honestly in the copy: the local list is **for you**; the public proof is the card you posted.
A local record nobody else can see was never evidence, and pretending otherwise would be the
dishonest move.

## Task 4 — do not let this become engagement bait

The section must not nag, must not badge everything, and must not imply you should be writing
more calls. The spec is explicit: nothing that rewards volume, nothing that makes someone feel
bad for not opening the page.

If there are no calls yet, say something plain and get out of the way. An empty state that
sells is the exact thing that would make this product feel cheap.

## Task 5 — gate it, and prove the gates fail

At minimum: a card written is captured; a card past its date shows as `DUE`; settling moves it
and updates the streak; the streak does **not** move for a card that was merely written.

That last one is the assertion that matters — it is what stops a future change quietly turning
this into points-per-card, which the research says is the most likely way this gets ruined.

Prove each red before trusting it, and restore via git rather than by retyping.

## Task 6 — check the whole page still holds

Both suites, both widths, axe clean, drift green, and `file://` still working end to end. The
page has grown a lot today; confirm the tool is still reachable without an unreasonable
scroll, because both agents were explicit that it stays above the explainer.

## Constraints

- Nothing inside the drift-guarded tool region. Observe, do not edit.
- The new script must not contain `receipt-form`.
- No network, no account, no upload — this whole feature is local or it is wrong.
- Nothing that rewards writing more cards.
- Deletion must be possible, and the copy must be honest about what that means.
- Every new assertion proved red before it is trusted.
