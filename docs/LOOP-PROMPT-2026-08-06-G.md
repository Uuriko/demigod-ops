# Loop iteration G — the directory's mobile fold is all preamble, no product

## What I checked and what I got wrong

Ran a rendered-DOM sweep of the mobile funnel and found what looked like a serious
defect: on `/startups` at 390px, the nav items (`How it works`, `Pricing`,
`Hire guide`, …) all reported bounding rects between y=15 and y=533 with
`display` and `visibility` passing — i.e. the whole fold appeared to be an open
nav menu covering the page.

**That reading was wrong.** The screenshot disproves it: "Explore ⌄" is a
*collapsed* dropdown, and those nodes are clipped by an ancestor. Per-element
`getComputedStyle` does not reveal an ancestor's `overflow: hidden`, so my
visibility predicate was measuring the wrong thing.

Third time this session that a source- or DOM-level check produced a confident
wrong claim that a rendered artifact corrected. The rule earned again: **for any
claim about what a user sees, look at the pixels.**

## What the screenshot actually shows — and this is real

At 390×844 on `/startups`, above the fold, in order:

| y | content |
| :--- | :--- |
| 31 | Demigod logo |
| 78 | Explore ⌄ |
| 348 | "SF tech company directory" + ✕ |
| 473 | amber chip: SAN FRANCISCO · OPEN DATA · CITY-LEVEL · **CURRENT STATUS NOT VERIFIED** |
| 571–775 | 4 lines: city-level only / not a verified office / counts point-in-time / not a verdict |
| 851–953 | 4 lines of coverage stats (505 companies, 489 open-age, 110 aging, 583 YC links) |
| 1003–1071 | "Largest role buckets: engineering 3,898 · sales 1,525 …" |
| 1120+ | search box, then four filter dropdowns |

**Zero companies are visible above the fold.** The entire first screen is chrome,
a warning-styled disclaimer, qualification prose, and aggregate statistics. The
product — the list of SF startups hiring — begins somewhere past 1,700px.

The debates concluded the directory is the acquisition surface and the only asset
with real distribution. A founder arriving from a shared link on a phone sees a
compliance notice and a stats block, and has to scroll past four dropdowns before
a single company appears.

The amber chip is the most visually dominant element after the heading, and it
says NOT VERIFIED. It is Webflow-authored (confirmed: the string appears nowhere
in `.js`/`.mjs` on disk), so it is not mine to change from here — but its weight
is part of the problem and should be named in the report.

## Task 1 — get product into the fold

Reorder the directory header so a company row is visible on a 390px screen
without scrolling. The constraint that makes this non-trivial: **every honesty
claim must survive.** They currently survive by being stated up front; they must
survive by being stated *somewhere reachable and unmissable*, not by dominating
the fold.

Concretely, in `demigod-startup-atlas-web.js`:

1. **Move the aggregate stats and role-buckets lines below the list.** They are
   orientation for someone already browsing, not for someone deciding whether to
   browse. Nothing about them is an honesty claim — they are counts, and the
   counts stay accurate wherever they sit.
2. **Keep the intro paragraph**, but it is the last thing to touch — it carries
   city-level precision, "not a verified office", point-in-time, and "not a
   verdict". Those are load-bearing. If it must shrink, shrink it by moving the
   *counting-methodology* half below the list, never the *precision* half.
3. **Keep search + filters above the list.** They are the product, not chrome.

Measure before and after with a screenshot at 390px, and report the y-coordinate
of the first company row both times. "It looks better" is not a result; "first
company row moved from y≈1,700 to y≈900" is.

## Task 2 — verify nothing regressed

- `node --test demigod-startup-atlas-web.test.mjs` — it asserts the honesty labels
  by claim now, so a reorder should pass. If it fails, read carefully: it may be
  catching a genuinely dropped claim rather than a moved one.
- Full suite must stay 537/537.
- `npm run demigod:verify:source`, `node demigod-live-honesty-audit.mjs`.
- Screenshot at 390px **and** 1440px — a mobile fix that breaks desktop is not a
  fix.

## Task 3 — report the chip

The `CURRENT STATUS NOT VERIFIED` chip is Webflow-authored and amber-styled. Say
plainly in the report that it is the loudest element on the page and that a
disclaimer rendered as a warning reads as a defect notice to a first-time visitor.
Do not change it — it is outside disk control and changing a Webflow-authored
honesty label without authorisation would be exactly the wrong move.

## Constraints

- Rendered screenshots are the evidence. Not JSON, not source greps.
- No honesty claim may be deleted. Moved is fine; deleted is not.
- No publishing without authorisation in the current request.
- Foot lock is free but this work is in the atlas, not foot-core.
- Scope the commit explicitly; other agents are active.
