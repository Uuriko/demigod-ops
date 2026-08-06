# Competitive deep-research — self-prompt

## Objective

Build a decision-grade map of every product Demigod competes with, is adjacent to,
or could be displaced by. Produce three ranked outputs: **adopt** (they do it, we
should), **cut** (we do it, nobody does, and it isn't load-bearing), and **wedge**
(we do it, nobody does, and it is the asset). Then write full build plans for the
adopt list — complete plans, at whatever size the feature actually is.

## Standing rules for this work

- **No feasibility verdicts.** Do not conclude a feature is out of reach, too big,
  or needs funding Demigod doesn't have. Resources, hires, and runway are not
  visible to me. State what a thing *requires* — engineers, months, integrations,
  data, capital — and let that stand as information, not as a gate.
- **No "we're too small for that."** Size is a fact about today, not a constraint
  on the plan.
- Distinguish verified fact, inference, and unknown on every claim. A competitor's
  marketing page is a claim, not a fact.
- Prefer primary sources: the product itself, pricing pages, docs, changelogs,
  job postings (what they're hiring for reveals what they're building), S-1s,
  funding announcements, engineering blogs, status pages, API references.

## Phase 1 — define the competitor set

Cast wider than "SF recruiting startups." Six rings:

1. **Direct**: startup technical hiring, human or AI, US/SF focus.
   Jack & Jill, Paraform, Dover, Wellfound/AngelList Talent, Mercor, Micro1,
   Moonhub, Alex, SeekOut, hireEZ, Juicebox, HeyMilo.
2. **Community/network-mediated**: the model closest to Demigod's events asset.
   Pallet, Braintrust, A.Team, Contra, Every Talent Collective, Lenny's job board,
   Pragmatic Engineer job board, YC Work at a Startup.
3. **Marketplace/vetted-bench**: Toptal, Andela, Turing, Gun.io, Lemon.io.
4. **ATS and hiring infrastructure** — upstream of us, and a possible product
   surface: Ashby, Greenhouse, Lever, Workable, Rippling ATS.
5. **The graveyard** — what died and precisely why: Triplebyte, Hired, Vettery,
   Woo, Underdog.io, Entelo, Bright.
6. **Non-obvious substitutes** — what a founder uses *instead* of any of the above:
   their own network, a Slack/Discord community, an agency retainer, an in-house
   recruiter, X/LinkedIn posts, a contractor-to-hire trial.

For each, record: what it is, who pays, what they pay, what the buyer gets, what
the candidate gets, funding and headcount if known, and current status (alive,
acquired, dead).

## Phase 2 — per-competitor extraction

For each competitor in rings 1–4, extract to a common schema so the comparison is
structural rather than impressionistic:

- **Pricing model**: contingency %, fixed fee, subscription, per-seat, take-rate,
  free tier. Exact numbers where published.
- **Guarantee / risk-shift**: replacement window, refund, no-hire-no-fee, trial
  period. This is where recruiting products actually differentiate.
- **Supply acquisition**: how candidates arrive. Inbound, scraped, community,
  referral, paid, API.
- **Demand acquisition**: how employers arrive. Sales-led, PLG, community,
  marketplace, partnerships.
- **Vetting mechanism**: assessment, AI screen, human screen, work sample,
  reference, none. Note whether a score is produced and exposed.
- **Matching mechanism**: search, recommendation, human curation, auction, bid.
- **Interaction surface**: web app, chat, email, Slack, API, browser extension,
  voice.
- **Speed claims**: time-to-shortlist, time-to-hire. Record the claim, note that
  it's a claim.
- **Data moat**: what they accumulate that a new entrant cannot copy.
- **Compliance posture**: EEOC/FEHA/EU AI Act statements, bias audits, whether
  they publish them. Cross-reference the FEHA ADS finding from the strategy doc.
- **What they explicitly refuse to do** — often more revealing than the feature
  list.

## Phase 3 — feature inventory and gap analysis

Build a matrix: rows = features observed anywhere in the set, columns =
competitors + Demigod. Populate from evidence, not assumption. Demigod's column
comes from the repo — `bin/dg tools`, the 142-tool registry, `demigod-*.mjs`,
and the live site — not from memory.

Then three passes:

**Pass A — adopt.** Features present in ≥2 competitors and absent in Demigod.
For each: what problem does it solve, does Demigod have that problem, what would
it require to build, and what does it break if added. Rank by (buyer-visible
value) × (fit with the no-score/human-decided architecture).

**Pass B — cut.** Features Demigod has that appear in zero competitors. For each,
the honest question is *why* nobody else has it. Three possible answers, and the
analysis must pick one with evidence:
  1. It's a genuine wedge nobody has copied yet.
  2. It's load-bearing infrastructure that competitors have too, just not
     buyer-visible.
  3. It's work that produced no buyer value — the cut list.
Demigod runs 142 tools against zero transactions, so Pass B is expected to be
long. Do not soften it, and do not assume "unique" means "valuable."

**Pass C — wedge.** Features Demigod has that competitors *cannot* copy without
abandoning their own model. The FEHA/no-score position and the consent mechanic
are the candidates. Test each: what exactly stops a funded competitor from
shipping this next quarter? If the answer is "nothing," it's not a wedge.

## Phase 4 — timing

Research whether now is the moment for each adopt candidate:
- What changed in the last 18 months that makes it viable or newly necessary?
- Regulatory clocks: FEHA ADS (in force Oct 2025), EU AI Act Annex III (deferred
  to Dec 2027), NYC LL144, Illinois.
- Market clocks: the entry-level collapse, the AI-engineer premium, the
  post-2024 recruiting-tech consolidation.
- Technology clocks: what became cheap in the last year that wasn't before.

A feature that is right but early is a different decision from one that is right
and late. Say which.

## Phase 5 — imagination

Do not restrict output to features that exist somewhere. Generate candidates by:
- **Transplant**: mechanisms from other two-sided markets — residency match,
  kidney exchange, school choice, dating, freight, adoption — that no recruiting
  product has imported.
- **Inversion**: for each core assumption in the category (employers pay,
  candidates apply, recruiters shortlist, fees scale with salary), build the
  product where the opposite is true.
- **Constraint-as-feature**: for each Demigod constraint, design the product where
  that constraint is the headline rather than the apology.
- **Unbundling**: which single step of the hiring pipeline, done extremely well
  and sold alone, would people pay for?
- **The thing that becomes possible when the community exists** — design for the
  state after events work, not before.

## Phase 6 — output

1. **Competitor matrix** — the raw comparison.
2. **ADOPT, ranked** — each with problem, evidence, requirement, risk.
3. **CUT, ranked** — each with the Pass B verdict and its evidence.
4. **WEDGE** — each with the "what stops a funded competitor" test result.
5. **Build plans** for the top adopt items. Full plans: user-visible behavior,
   data model, files touched, new files, integration points, gates that must
   pass, rollout order, and what could go wrong. Size the plan to the feature,
   not to an assumed budget.
6. **Open questions** — what the research could not settle, and the cheapest way
   to settle each.

## What would make this research bad

- A list of features with no evidence of who has them.
- Recommending everything (no cut list, no ranking).
- Treating competitor marketing copy as fact.
- Softening the cut list because the work was hard to build.
- Any sentence beginning "you can't" or "it's not realistic to."
