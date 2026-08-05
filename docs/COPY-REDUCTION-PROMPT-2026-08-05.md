# Copy reduction — self-prompt

## Objective

Cut excess words from trydemigod.com without cutting a single load-bearing
qualifier. On this site those are the same sentences, which is why a naive
tightening pass is dangerous.

## Where the copy is

Not Webflow. **`demigod-foot-core.js`** — 219 DOM-write sites, 358KB. Editable on
disk, prepare-only, no publish required. Webflow holds layout; foot-core holds
words.

Served-HTML weight, measured: `/startups` 14,261 · `/pricing` 2,964 · `/contact`
2,958 · `/how-it-works` 2,679 · `/` 2,306. Most other routes serve ~20 chars —
empty shells foot-core populates client-side, so served length understates them.
Use the rendered figures from `demigod-conversion-audit.mjs`, not curl.

## The constraint that makes this different

Demigod's honesty architecture is implemented **in prose**. These are not
verbal padding — they are the product:

- consent: "mutual yes", "both sides approve", "before intro"
- provenance: "self-reported", "sample", "observed"
- non-automation: "nothing is sent automatically", "a human decides"
- privacy: "not shared until you approve", "identity stays private"
- hedging that prevents over-claim: "needs review", "when the fit is real"

Cutting any of these converts tight copy into a false claim. The scrub list in
`demigod-conversion-audit.mjs` (`Human-Matched`, `FIND TALENT`, `hello@`) proves
this has bitten before.

## Method

1. **Measure first.** Rendered chars per route via conversion-audit. Record the
   baseline; a reduction claim without a before-number is not a result.
2. **Classify every candidate string** as `load-bearing` or `decorative`.
   Load-bearing = removing it changes what a reader is entitled to believe.
   Decorative = restates something already said on the same view.
3. **Cut in this order:**
   - **Cross-string repetition** — the same guarantee stated three ways on one
     page. Keep the strongest instance, delete the echoes. This is the biggest
     win and the safest.
   - **Throat-clearing** — preamble before the actual sentence.
   - **Doubled modifiers** — "real, concrete first result".
   - **Restated CTA context** — button text that repeats the paragraph above it.
4. **Never** compress two load-bearing claims into one shorter sentence that
   implies more than either did. Shorter is not the goal; fewer words carrying
   the same commitments is.
5. **One concern per edit.** Smallest diff, per Ponytail.

## Verification after every edit

```
node --check demigod-foot-core.js
npm run demigod:verify:source
node demigod-live-honesty-audit.mjs
node demigod-conversion-audit.mjs        # rendered chars — did it actually drop?
bin/dg truth                             # disk/live parity, prepare-only
```

A drop in rendered chars with all gates green is the result. Gates green with no
drop means nothing was accomplished. A drop with a gate red means a claim was
broken — revert, don't patch.

## Out of scope

- Publishing. Disk only; `bin/dg truth` should end `prepareOnlyAssets`.
- Webflow Designer edits.
- The archived game.
- Rewriting positioning — that is the separate site-copy draft.
