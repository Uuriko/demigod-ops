# Competitor & regulatory research — 2026-08-06

Sources are linked inline. Where a number comes only from a secondary source
(review site, comparison blog) it is marked *secondary* — competitor pricing pages
increasingly hide numbers behind a demo request, and a review-site figure is a
rumour until a primary source confirms it.

## 1. The regulatory finding, which outranks everything else here

**Demigod operates an automated decision system as California defines one.**

`demigod-matching-engine.mjs:scoreMatch` computes a weighted 0–100 score over
skills overlap, stage/location fit, comp alignment, stated motivation, and an
experience proxy, then ranks candidates by it.

California's amended FEHA regulations (effective 2025-10-01) cover tools that
"screen, score, rank or recommend candidates, **even where humans retain final
decision-making authority**." Demigod's human-in-the-loop design is a strong
posture but is not, on the face of the rule, an exemption — the scoring step is
in scope regardless of who decides afterwards.

Two further points matter:

- **The rules reach agents, not just employers.** FEHA's definition of "agent"
  covers anyone acting on an employer's behalf to perform "applicant recruitment,
  screening and hiring … including when such activities and decisions are
  conducted in whole or in part through the use of an automated decision system."
  Recruiting platforms and software vendors are named in the practitioner
  commentary as falling inside this analysis.
- **A notice duty is already live.** Since 2026-01-01, under CCPA as strengthened
  by CPRA, applicants must be notified *before* automated decision-making
  technology is used where it significantly affects employment, with an explained
  path to request human review. Records — dataset descriptors, scoring outputs,
  audit findings — are to be retained for four years.

### Where Demigod actually stands today

| | State |
|---|---|
| Human review | Strong. "A human reads every brief", "matches after human review" run through the meta description, OG tags, and foot copy. |
| Privacy note | Present (`#dg-privacy`): "Demigod and its form/email providers process these answers for matching." |
| ADS disclosure | **Absent.** Nothing on the site names automated scoring or ranking. |
| Human-review path | Implicit in the product, **not stated as a right the applicant can invoke**. |
| Scoring-output retention | Partial — proposed pairs carry `score`; the basis was discarded until this iteration. |

This is not a verdict on legal exposure, which needs counsel, not me. It is the
gap between what the rule describes and what the site currently says.

### Why this is an opportunity and not just a cost

Demigod already has the expensive part. The honesty gates, per-claim provenance,
`sourceLicense`/`retrievedAt` on map rows, and the refusal to invent contact data
are most of what an ADS audit trail requires, and they are already built. Very
few competitors disclose scoring at all. "We tell you we score, we show you the
score's basis, and you can ask a human" is a differentiator that Demigod is
unusually close to being able to state truthfully.

## 2. Competitors

### Paraform
20–25% contingency per hire, contingency-based with installments across a 90-day
guarantee window; the broader marketplace band is quoted at 15–30% of first-year
salary (*secondary*). Model: post a role, independent recruiters compete.
[herohunt](https://www.herohunt.ai/blog/paraform-pricing-alternatives-2026/) ·
[Paraform blog](https://www.paraform.com/blog/true-cost-of-hiring-agency-vs-in-house-vs-embedded)

**Demigod at 10% is less than half.** That is the sharpest number on the site and
it is currently stated once, in the meta description.

### Mercor
Raised $350M at $10B (Sept 2025); in talks for ~$500M at **$20B** as of July 2026;
claims >$2B annualized revenue in June, doubled from $1B in February.
[TechCrunch](https://techcrunch.com/2026/07/09/mercor-is-in-talks-for-a-20b-valuation/) ·
[Forbes](https://www.forbes.com/sites/richardnieva/2026/07/09/mercor-fundraise/) ·
[CNBC](https://www.cnbc.com/2025/10/27/ai-hiring-startup-mercor-funding.html)

Note what the revenue actually is: Mercor's growth is in **AI training-data
labour supply**, not startup engineering placement. It is a different business
that shares a vocabulary. Not a like-for-like competitor.

### Micro1
$35M Series A at a $500M valuation, ~$50M ARR up from $7M at the start of 2025.
Also AI data labelling / contractor management.
[HyperAI](https://hyper.ai/en/stories/f16fec166fc8dd211e052f3885a06dc2)

### Juicebox (PeopleGPT)
Tooling, not a marketplace: natural-language search over 800M+ profiles from 30+
sources, talent-pool analytics, AI email outreach. Free / $119 Starter / $199 per
seat Growth, plus a $199/mo autonomous sourcing agent add-on (*secondary*).
[TrustRadius](https://www.trustradius.com/products/juicebox-peoplegpt/pricing) ·
[powerusers](https://powerusers.ai/ai-tool/juicebox-ai-peoplegpt/)

Sells volume outreach. Demigod's stated position — one role, one concrete first
result, mutual yes — is the opposite trade. Worth holding, not converging on.

### Dover
Flexible hourly model, most companies $2,000–$7,000 per hire (*secondary*) — a
materially different shape from a percentage fee, and the most direct threat to a
10% pitch on senior roles, where 10% of $200k is $20k.
[underdog.io](https://underdog.io/blog/recruitment-agency-costs)

## 3. Demand side

- In-house recruiting starts beating agency fees at roughly **15–20 hires/year**,
  or a steady 8+ roles per quarter. Fully loaded in-house recruiter cost is quoted
  at $175k–$190k including tools and seats (*secondary*).
- Hybrid is the emerging norm: a firm for hard or urgent roles, in-house for the
  rest.
- The recurring complaint about agencies is structural: **paid on placement, not
  retention**, so speed to close beats quality of match.

[underdog.io](https://underdog.io/blog/recruitment-agency-costs) ·
[recruitingfromscratch](https://www.recruitingfromscratch.com/blog/in-house-recruiter-vs-headhunter-startup)

**This is the strongest positioning input in the whole document.** Demigod's
target — SF startups making a handful of hires a year — sits squarely *below* the
in-house threshold, which is the segment where agency economics still work. And
the retention complaint is answerable with evidence Demigod already collects.

## 4. Ranked change list

Effort is my estimate; value is expected value to a visitor or to a decision.

### Data / ops plane — buildable now

| # | Change | Value | Effort |
|---|---|---|---|
| D1 | **Record the basis of every match score** — done this iteration (`explainMatch`). A reviewer sees `skills-overlap=54` instead of `score=82`. | High | done |
| D2 | Persist the breakdown onto proposed pairs so a score is reconstructable later, not just at print time. Touches pair schema — needs an honesty-gate check first. | High | M |
| D3 | Score-drift check: alert when the score distribution moves after a scoring edit. The differential harness written this iteration is most of it. | Med | S |

### Site build — blocked on the other worker, written to be picked up cold

| # | Change | Value | Effort |
|---|---|---|---|
| S1 | **ADS disclosure + human-review path.** One short block near the forms: that Demigod scores and ranks, what the score uses, and that a human decides and can be asked to review. Demigod can say this truthfully today, which almost no competitor can. | Highest | M |
| S2 | **Lead with 10%.** Paraform is 20–25%; the contrast is Demigod's single sharpest fact and currently sits only in a meta description. | High | S |
| S3 | **Answer the retention complaint.** "Paid on placement, not retention" is the structural objection to every agency. Demigod bills 10% on hire and tracks pilots/receipts — if retention evidence exists, showing it attacks the objection directly. | High | M |
| S4 | Name the segment: a few hires a year, below the in-house-recruiter threshold. Tells the right visitor they are in the right place and the wrong one to hire in-house. | Med | S |

### For the user — decisions I should not make

- **[D1 pricing, still open]** Paraform 20–25%, market band 15–30%, Dover
  $2k–$7k flat per hire. Demigod is at 10%. The research says 10% is the strongest
  contrast in the market and also that flat-fee models are the real threat on
  senior roles. `ENGAGEMENT-ONE-PAGER-DRAFT.md` still has a blank rate.
- **ADS disclosure** is a legal-posture question. I can draft copy and build the
  record-keeping; whether and how to make a compliance claim is yours, and worth
  counsel given the agent-liability language.
