# Loop iteration X — competitor research, which the goal asks for and I stopped doing

## State

```
site      HELD — foot-core written 4 min ago, head-minimal 12 min ago,
          1,648 insertions uncommitted. Tested this iteration, not assumed.
truth     disk v1030 · live v1019 · lagDebt · publish needs current-request auth
data      export unblocked (operator-only), snapshot timer live
```

## Why this, now

The standing goal has two halves:

> work on trydemigod.com and **do frequent web searches of all other startups for
> brainstorming and comparison**. add features, improve existing things, remove
> bloat and fix bugs

I have done the first half and stopped doing the second. The last competitor
research was `COMPETITOR-ANALYSIS-2026-08-05.md`, and the several iterations since
have been inward — auditing my own tests, my own blocked list, my own reporting.
Iteration W shipped no code at all.

Some of that was warranted; the audits found real defects. But "the site is held
by another worker" has become a reason to work on whatever is nearest rather than
what was asked. The site being held does not block research. Research is the
explicitly requested half I can do right now, and it is the half that has gone
stale.

Do not let this become another self-audit. The output must be about other
companies and what Demigod should do, not about my own process.

## Task 1 — research, breadth first

Search for what is actually happening now, not what I already believe. Cover at
minimum:

- **Direct competitors**: Paraform, Juicebox, Mercor, Alex, Micro1, Hunt Club,
  Riviera Partners, and any newer entrant surfacing in 2026. What do they charge,
  what do they promise, how do they source, what has changed recently?
- **Adjacent**: AI-native ATS and sourcing tools, YC-batch recruiting startups,
  talent marketplaces that pivoted. What is being funded and what is dying?
- **The demand side**: what SF startups say about recruiting agencies right now —
  fee resistance, in-house sourcing, hiring freezes or thaws in 2026.
- **Regulatory**: any movement past California FEHA ADS (Oct 2025) and the EU AI
  Act deferral to 2027-12-02 that changes what an automated matching product may
  claim or must disclose.

Search several distinct phrasings per topic. One query per topic produces one
worldview. Prefer primary sources — pricing pages, docs, filings, official posts —
over listicles, and note when a claim comes only from a secondary source.

## Task 2 — compare honestly against what Demigod actually is

For each competitor finding, place Demigod concretely. Read the current state
rather than recalling it: the live site, the directory, the forms, the honesty
gates, the role ledger.

Three buckets:

- **Demigod is ahead** — say why, and whether the advantage is defensible or just
  unclaimed by others.
- **Demigod is behind** — say how far, and whether closing it is days or months.
- **Deliberately different** — the honesty gates, the no-invented-contact rule,
  provenance on every claim. These cost features on purpose. Where a competitor
  does something Demigod refuses to do, say that it is a refusal and not a gap.
  Do not quietly reclassify a principle as a deficiency.

Where I previously concluded something about a competitor, check whether it is
still true. Pricing and positioning move, and this session has repeatedly shown
that my written conclusions rot.

## Task 3 — turn it into a ranked, specific change list

Not themes. Specific changes, each with: what to change, which file or surface,
why the research supports it, and an effort estimate. Rank by expected value to a
visitor, not by how interesting it is to build.

Split the list explicitly:

- **Data/ops plane** — can be done now, this iteration if small.
- **Site build** — must wait for the other worker; write it so it can be picked up
  the moment the site frees, with enough detail that no re-research is needed.

Anything requiring a decision only the user can make (pricing especially, which
has been open as [D1] for days) goes in a short section addressed to them, phrased
as a question with the research attached — not as a recommendation to build.

## Task 4 — implement what is in the data plane

Pick the highest-value item that does not touch the site build and do it properly:
proven non-vacuous test, honest verification, real numbers. If nothing in the data
plane is worth building, say so rather than inventing work — but say it only after
producing the list, not instead of producing it.

## Constraints

- No foot-core, no head, no CSS, no site build. Verified held this iteration.
- No publishing, no outbound, no drafts, no money, no contact data.
- Cite sources for competitor claims. An unsourced pricing number is a rumour, and
  this session has already produced fake references once — the three cursor-*
  scripts whose only citations were my own deletion-candidate docs.
- Read all command output. Test before claiming.
