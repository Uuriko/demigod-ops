# Loop iteration AW — the other ten routes, and the class the chip bug belongs to

## State

```
reviewed   / · /how · /pricing · /startups   (4 of ~14 routes)
found      live defect: <span> role chip renders display:block/align:normal while
           its <button> siblings are flex/center — text sits outside the pill
unreviewed /about /blog /contact /faq /hire /talent /legal /press /refer /sample
           /events /private
gates      axe clean 16 routes · honesty clean 14 · neither sees layout
```

## Why this, now

Yesterday's chip defect was found by looking at a screenshot, and nothing else in
this repo could have found it. That is a working method with ten routes still
unexamined, which is the cheapest remaining source of real defects.

The bug also belongs to a **class** worth checking in code: an element rendered as
two different tags depending on data, with CSS scoped to only one of them. In the
chip case, `button.dg-dir-rolechip` carries `display:inline-flex;align-items:center`
and the bare `.dg-dir-rolechip` does not, so the `<span>` variant — which only
appears for functions outside `DG_FUNCS`, i.e. rarely — renders wrong. A defect
that only surfaces on uncommon data is exactly the kind that survives for months.

Two tasks, then: look at the rest, and grep for the same asymmetry elsewhere.

## Task 1 — screenshot and examine the remaining routes at mobile

390×844, which is where layout breaks first and where the fold is tightest.

Read every image. For each route, record what a visitor actually sees:

- Anything cut off, overlapping, or outside its container — the chip class.
- Is the primary action reachable without hunting?
- Does any page look broken rather than merely plain?
- Does anything render as raw markup, an empty box, or a placeholder?

**Describe the image, not what the code implies.** The chip bug was invisible in
the source and obvious in the picture.

Some routes may not exist as mini-pages (`/private`, `/events` may 404 or redirect).
A 404 on a route the nav links to is itself a defect; a 404 on one nothing links to
is not.

## Task 2 — grep for the same tag-asymmetry class

Search the site sources for CSS selectors qualified by tag (`button.foo`,
`a.foo`, `span.foo`) where the same class is also applied to a different element.
For each hit, decide whether the unqualified variant would render wrong.

Scope: `demigod-startup-atlas-web.js` and any other renderer I can edit. **Not
foot-core, head, or CSS** — still held, still being written every few minutes.

Prove each candidate the way the chip was proven: measure the live element's
computed style, not a local reproduction. My first chip repro showed no difference
and was simply wrong; the live measurement was what settled it.

## Task 3 — fix only what is proven, and respect the held files

- A defect in a file I can edit and that is proven by live measurement — fix it,
  and verify by injecting the rule into the live DOM the way the chip fix was
  verified.
- A defect inside foot-core, head-minimal or head-styles — document with the
  measurement and the screenshot; do not edit.
- Anything the redesign already changes — check their uncommitted diff first and
  drop it rather than duplicating.

Do not commit `demigod-startup-atlas-web.js`. It carries the other worker's
uncommitted work and `git add` on it sweeps their changes into my commit, which is
what 78b9895 did to 14 files today. Leave fixes in the working tree and say so.

## Task 4 — report coverage honestly

State how many routes were examined, how many defects were found and proven, how
many are weaknesses I chose not to act on, and what remains unexamined. If ten
routes are clean, say that — a clean result from a method that just found a real
bug is informative, not a wasted iteration.

## Constraints

- No foot-core, head, or CSS edits.
- No publishing, no outbound.
- Puppeteer for rendering; sanity-check against a known-good route each run.
- Measure the live element before claiming a CSS defect.
- Screenshots to the scratchpad, never the repo.
