# Discovery prompt — what should we build next

Reusable. Run it when the question is "what else could exist", not "how do we ship X". Output is a
dated decision document, not a wish list.

## The job

Find things worth building for `getdasha.com` and the `$dasha` community that we have not already
thought of, then argue honestly about which few deserve to exist. The measure is whether more people
end up holding `$dasha` because something we made was worth using and worth passing on.

Not the measure: feature count, novelty, or matching what competitors ship.

## Read first, so you do not re-derive what is known

- [`DASHA-HORIZON.md`](DASHA-HORIZON.md) — everything already on the possibility list. **Your job is
  what is missing from it.** Restating an item there is a failure, unless you bring new evidence
  that changes its rank.
- [`DASHA-PRODUCT-BRIEF.md`](DASHA-PRODUCT-BRIEF.md) — what the product is now.
- [`DASHA-ROADMAP.md`](DASHA-ROADMAP.md) — what is already being done.
- [`DASHA-ART-DIRECTION.md`](DASHA-ART-DIRECTION.md) — the visual system and what it forbids.
- [`DASHA-KIT-LICENSE.md`](DASHA-KIT-LICENSE.md) — the kit is CC0; that is a distribution mechanism,
  not just a licence.

Also check what is actually live before proposing to build it again. Fetch the site. Check the repo.
Several things assumed missing already exist, and several assumed shipped are only prepared.

## What to search for

Breadth first, then depth on whatever survives. Do not stop at five searches; this is the part that
usually gets cut short and it is the part that produces the non-obvious answers.

Cover at least these angles, and add your own:

1. **Adjacent behaviour** — what do people in this community already do without being asked? Tools
   that formalise an existing behaviour beat tools that request a new one.
2. **Other categories entirely** — fan communities, sports, music, open-source projects, forums.
   The best mechanism may exist somewhere with no crypto attached.
3. **What died and why.** Post-mortems are worth more than launch posts. Search for the failures.
4. **Primary sources over listicles.** Docs, changelogs, the actual product, real threads. Most
   "top 10 X for 2026" pages are generated and worthless — if a claim only appears on those, treat
   it as unverified and say so.
5. **Platform mechanics that are changing** — what a platform now allows or penalises can create or
   destroy a product overnight. Verify against primary sources; secondary claims about algorithms
   are usually stale.
6. **Tools that developers would use**, since developers are a distribution channel this category
   mostly ignores.
7. **The trust surface** — what would make a careful person trust a token page? Almost nobody
   competes here, which is exactly why it is available.

## How to judge what you find

For each candidate, answer four things or drop it:

- **Who opens it twice?** Anything used once is content, not product.
- **What does it replace or make unnecessary?** If nothing, it is probably additive clutter.
- **What is the smallest version that would prove it?** If you cannot name one, it is not ready.
- **What would make us abandon it?** Write the falsification condition before building.

Then sort into: **build now** (small, proven demand, reversible), **scope next** (needs a proof
step first), **park** (interesting, no evidence yet), **reject** (name why, so nobody re-proposes it).

Be ruthless. Less is more. A document recommending three things with evidence is worth more than
one listing forty. If the honest answer is "keep improving what exists", say that.

## Hard constraints — a proposal violating any of these is rejected, not softened

1. No price predictions, targets, returns or urgency.
2. No fabricated traction: invented holders, volume, endorsements or quotes.
3. No implied endorsement by any real person, and no real person's likeness used to promote the token.
4. No custody of funds or keys, and nothing mistakable for it.
5. Third-party media needs recorded rights before it ships.
6. Nothing that manufactures a market metric. Holder count is an outcome, never a target.
7. Nothing requiring authorization we do not have — publishing, outbound posts, money movement — is
   proposed as done. Propose it as a decision for the user.

## Output

Write `DASHA-DISCOVERY-<date>.md`:

1. **What is already true** — live state you verified, with how you checked.
2. **Findings** — what the research actually showed, including the things that contradict our
   current plan. Cite sources. Mark anything you could not verify as unverified.
3. **Candidates**, sorted into the four buckets above, each with the four answers.
4. **The three you would start**, and what you would stop to make room.
5. **What you did not look at**, so the next run knows where the gap is.

State plainly where the evidence is thin. A confident list built on generated listicles is worse
than a short list built on three real sources, because it will be believed.
