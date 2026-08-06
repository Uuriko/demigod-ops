# Loop iteration BF — verify today's four site changes as one unit, before they ship together

## State

```
uncommitted, unpublished, all mine, all in contested files:
  atlas-web   .dg-dir-rolechip gains display:inline-flex + align-items:center
  foot-core   #dg-page summary::after chevron (+ open variant)
  foot-core   inlined three-step SVG in DG_PAGES.how
  foot-core   fee line removed from that SVG, viewBox 226 -> 214
also in the tree: the other worker's 230-insertion foot-core diff, untested by me
```

## Why this, now

Each change was verified in isolation, on the page it targets. None has been
verified **together**, and they do not ship separately — the next publish takes the
whole disk state, including the other worker's diff.

Three of the four are CSS or markup inside foot-core, which renders every mini-page.
A selector added for `/faq` applies to every `#dg-page summary` on the site. An SVG
inlined into one page's html string sits inside the same `innerHTML` assignment
every other page uses. These are exactly the changes whose side effects appear
somewhere other than where they were made.

The `#dg-page summary::after` rule is the specific worry: I verified it on `/faq`
and measured 17 summaries getting the chevron when I expected 6. I never asked
where the other 11 were.

## Task 1 — find the 11 summaries I did not account for

The FAQ verification reported `faqSummaries: 17, withChevron: 17`. Live `/faq` has
6 questions. So 11 more `#dg-page summary` elements exist somewhere in the injected
build, and they now all have a chevron they did not have before.

Establish where they are and whether a chevron is correct for them. If any is a
`<summary>` used as something other than a disclosure — a heading, a label, a
layout element — the rule is wrong for it and needs narrowing.

Do not assume the count was a measurement artefact. Find them.

## Task 2 — render all 14 routes with the disk build and compare against this morning

The same routes I screenshotted before any of today's changes:
`/ /how /pricing /startups /about /faq /hire /talent /contact /refer /sample /legal
/press /blog`.

For each: HTTP status, horizontal overflow, and whether anything looks different
from the morning screenshots in a way I did not intend. The morning set is in the
scratchpad; a diff by eye on the ones that changed is enough.

**Look at the pages that I did not touch.** A regression on `/legal` from a rule
added for `/faq` is precisely the failure this iteration exists to catch.

## Task 3 — run the gates that cover the whole build

- Full test suite. It was 574 tests / 571 passing this morning with 3 known reds
  belonging to the other worker; anything new is mine.
- `bin/dg ship prepare` — all 8 gates.
- axe across the routes. My changes are CSS; axe passing on 16 routes is a property
  I have cited repeatedly today and must not have broken.
- `demigod-live-honesty-audit --selftest`.

## Task 4 — report as one changeset, honestly

State what ships together, what was verified, and what is still unverified — in
particular the other worker's 230-insertion diff, which I have never tested and
which goes out with mine.

If something regressed, fix it or revert my change that caused it. Do not ship a
regression alongside three fixes because the fixes are good.

## Constraints

- Foot lock for any foot-core edit; released after.
- No commit of contested files, no publish.
- Compare against the morning screenshots rather than judging from memory.
- Read all command output.
