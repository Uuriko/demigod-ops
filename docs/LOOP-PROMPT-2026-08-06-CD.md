# Loop iteration CD — spec automatic settlement, and find out what it actually costs

## State

```
user said    "i'm worried our product is boring" + "are there like two products?"
I answered   yes, two: the Desk (memes, culture, live Dex numbers, "casino open") and the
             Thesis Card (write a call + invalidation, "no signal"). Opposite postures.
             The Card has no teeth — it cannot prove when you wrote it, so nothing stops
             anyone being wrong and never mentioning it again.
the fix      auto-settlement: check the invalidation against the Desk's own data feed.
             Makes the two products one thing and gives the Card its point.
live data    Price $5.36e-5 · Mcap $53.56K · Liq $22.53K · Vol 24h $28.98K (fetched today)
```

## Why this, now

This is the piece that answers both of the user's worries at once, and it is the one I
offered. The Desk already pulls live token data. The Card already asks for a condition that
would settle the claim. Nobody has connected them, and connecting them is the difference
between a notepad with a checksum and a place where calls get settled instead of spun.

But I must not design this on optimism. There are two constraints that could make the
obvious design impossible, and both are checkable in this run rather than discoverable
later.

## Task 1 — find out whether the data needed to settle anything actually exists

**This is the make-or-break step and it comes first.**

A condition like *"depth is still below where it started seven days after listing"* needs
**history**, not a snapshot. Fetch the public Dexscreener endpoint for the candidate mint
read-only and enumerate exactly what comes back: which fields, what time windows, and
critically — **does it return any historical series at all, or only the current state plus
some rolled-up 24h deltas?**

If it is snapshot-only, the whole design changes, because settlement then requires somebody
to observe repeatedly over the horizon. Establish this from the response body, not from
documentation or memory.

Also record: does it need a key, what does it rate-limit at, and does it cover arbitrary
mints or only listed pairs. A settlement feature that works for one token and silently
fails for others is worse than none.

## Task 2 — name the architectural tension out loud

If settlement needs observation over time, then **something has to be running when the user
is not**. That directly contradicts the Card's current strongest promise: *"Nothing leaves
your browser. There is no account and no wallet prompt."*

That promise is not decoration — it is on the page three times and it is a real part of why
the tool is trustworthy. Auto-settlement cannot be bolted on without either breaking it or
scoping around it.

Do not resolve this by quietly dropping the promise. Lay out the options honestly, with
what each costs:

- keep everything local, and accept that settlement only happens when the user returns
- introduce a server that watches, and change the promise to something still true and
  narrower
- publish the card somewhere public and let settlement be a thing anyone can verify rather
  than something we do

Give a recommendation. The user is not served by a menu.

## Task 3 — the condition grammar, kept small and honest

Most invalidation conditions people actually write are free text and are **not**
machine-checkable. "The team stops shipping" cannot be settled from a price feed. Any design
that pretends otherwise will produce confidently wrong settlements, which is far worse for a
product about accountability than settling nothing.

So: define the smallest set of structured, checkable condition types that the real data
supports — and be strict that each one maps to a field that Task 1 proved exists. Anything
that needs a field the feed does not carry is out, however desirable.

Then define what happens to everything else. Free-text conditions must remain first-class
and must not be made to look inferior — they are the honest majority. They settle the way
they do today: the author says so, or does not.

## Task 4 — the settlement state machine

States, transitions, and who causes each. At minimum a card is pending, then becomes
invalidated (the condition fired), held (the horizon passed and it did not fire), or
**expired unsettled** — which is the interesting one, because "the author never came back"
is itself information and most products hide it.

Be explicit about the failure modes: the feed is down at the moment of check; the token
delists; the horizon passes while nobody is watching. Each needs a defined outcome, and
"we do not know" must be one of the available answers rather than a silent default to
either success or failure.

## Task 5 — the timestamp dependency, stated plainly

Settlement is worth much less without a credible timestamp. If the card cannot prove *when*
it was written, an auto-settled result still rests on an unverified claim about when the
call was made.

Say clearly whether settlement is worth building before the timestamp problem is solved, or
whether it is the second half of a pair. Do not smuggle the dependency into a footnote.

## Task 6 — write it as a spec grok can implement, not as an essay

The Desk is grok's lane and this touches its data layer. Produce a document, not an edit:
the contract, the fields, the states, the failure modes, and what each side owns. Short
enough to act on.

**No edits to `dasha-desk`. No new dependency in my files. Nothing shipped this run.** This
is a design deliverable and the honest output may well be "here is what it costs and here is
the one thing to decide first."

## Constraints

- Read-only network: fetch the public feed to learn its shape. No writes, no keys, no orders.
- Every condition type must map to a field proved to exist in Task 1.
- Do not weaken or quietly drop the "nothing leaves your browser" promise — surface the
  conflict and recommend.
- Do not touch `dasha-desk` or Webflow.
- If the honest conclusion is that auto-settlement is premature until the timestamp is
  solved, say that plainly rather than speccing something to look productive.
