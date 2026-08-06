# Loop iteration I — the directory is invisible to search

## State

```
lock     HELD by codex-faq-schema-dedupe  → foot-core off-limits again
truth    disk v1017 · live v1017 · shipped
suite    539/539
```

Foot-core has been locked for two consecutive iterations. That rules out routing
and page-shell work, which is most of what a big directory change would touch. So
this iteration produces a **plan**, not a shipped feature — and says so plainly
rather than substituting busywork.

## The finding

Research on directory-product growth keeps landing on the same mechanism:
programmatic pages over proprietary structured data. Wellfound runs ~3M
visits/month on a startup company-and-jobs directory. Crunchbase is described as
*the* reference directory. The reported pattern is long-tail programmatic pages
outperforming established players in competitive niches, and one cited case moved
signups from 67 to 2,100/month on that mechanism.

The caveat in the same research matters more than the upside: *"if your
programmatic pages just regurgitate public information, you're disposable."* The
moat is proprietary data an LLM cannot hallucinate.

**Demigod has the data and publishes none of it as indexable pages.**

| asset | today |
| :--- | :--- |
| 2,891 SF companies | one client-rendered URL |
| 505 with observed open roles | same URL |
| live counts from Greenhouse / Lever / Ashby | same URL |
| filters: function, ATS, team size, hiring status | **hash fragments** — `#fn=`, `#size=`, `#ats=` |
| first-observed dates, open-age medians | rendered only |

Hash fragments are not crawled. Every filtered view — "SF startups hiring
engineers", "seed-stage SF companies on Ashby", "11–50 person SF startups with
open roles" — exists as a working, shareable URL that no search engine will ever
index.

And the proprietary half is real: *first-observed dates and open-age medians are
Demigod's own measurements*, not public data. Nobody else has them. That is
exactly the "content moat" the research says is the difference between a durable
asset and a disposable one.

## Task 1 — quantify before proposing

Do not write a plan on a vibe. Establish from the data on disk:

1. How many filter combinations produce a **non-trivial** result set (say ≥5
   companies)? Compute it from `DEMIGOD-SF-STARTUP-MAP.json` and the roles feed —
   function × team-size × hiring-status × ATS.
2. How many companies have enough unique data to justify their own page? A
   company page is only defensible if it carries something beyond name and
   website: observed roles, open-age, ATS provider, first-observed date.
3. What is already crawlable? `demigod-directory-static.mjs` exists and generates
   a static fragment — establish what it currently emits and whether it is live.
   There may be more precedent here than I expect.

Report real numbers. "Thousands of pages" is not a number.

## Task 2 — debate it

Put it to Codex and Grok as opposing positions, because this is genuinely
two-sided:

- **For:** the directory is the only asset with distribution (both prior debates
  concluded this), the data is proprietary, and the pages are generated from
  existing structured data rather than written.
- **Against:** thousands of thin pages is the classic programmatic-SEO failure;
  Demigod has zero transactions, so traffic without a conversion path is the
  free-ride problem Grok already named; and SEO pays out over months while the
  first placement is the actual constraint.

Judge honestly. Both prior debates resolved the same way — Grok won on sequencing
twice. If it happens a third time, say so rather than staging a contest.

## Task 3 — write the full plan, sized to the feature

If the debate supports it, write a complete build plan. The standing instruction
is explicit that size is not a reason to decline, so the plan states what it
actually requires — generation, routing, sitemap, hosting constraints, Webflow
interaction, verification — without hedging.

The plan must answer:

- Which pages, generated from what, at what count
- How they get routed (Webflow's constraints are real and this is where it gets
  hard — `DG_PAGE_PATHS` is a fixed table in foot-core, and foot-core is locked)
- How the honesty contract survives at scale: every page must carry city-level
  precision, point-in-time counts, "our first observation, not a verdict", and
  must not imply Demigod represents any listed company
- How thin pages are prevented — a hard floor, not an intention
- What the conversion path on each page is, since the whole point of the
  directory-as-engine argument is that browsing must be able to become a brief
- Sitemap and canonical strategy, given 33 URLs already collapse to 15 pages
- What could go wrong, specifically

## Constraints

- **No foot-core edits.** Lock held.
- No publishing without authorisation.
- Numbers from the data, not estimates.
- If the debate concludes this is premature, **write that conclusion and stop**.
  A plan produced because a plan was requested is displacement.
