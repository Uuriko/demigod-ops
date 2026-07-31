# Vertical mechanism deep dive — beyond Clay

**Status:** non-normative market + mechanism research for Demigod  
**Date:** 2026-07-30  
**Audience:** agents and operators choosing the *next* “own version of X” after Clay-like DIE  
**Normative product:** `DEMIGOD-DIE-SPEC.md`, `DEMIGOD-SIMPLE.md`  
**Related:** `COMPETITIVE-LANDSCAPE.md`, strategy roundtable memos under `/tmp/dg-busy/*strategy*`  
**Implementation matrix:** [`VERTICAL-IMPLEMENTATION-MATRIX.md`](VERTICAL-IMPLEMENTATION-MATRIX.md)  
**Shipped (rank 1):** [`../CONTROL-BOARD-DESIGN.md`](../CONTROL-BOARD-DESIGN.md) + `demigod-control-board.mjs`  
**Shipped (rank 3–5):** [`../ROLE-PACKET-DESIGN.md`](../ROLE-PACKET-DESIGN.md) + `demigod-role-packet.mjs`, `demigod-pilot-batch.mjs`, `demigod-candidate-touch.mjs`

This document is not a build order. Each vertical is researched as: **what successful companies sell → the underlying mechanism → what Demigod already has → a thin owned version → gate / kill / non-goals**.

---

## Reading map

| # | Vertical | Exemplars | Demigod loop step |
|---|----------|-----------|-------------------|
| 1 | Structured hiring OS | Ashby, Greenhouse | Role definition → review quality |
| 2 | Mutual / curated marketplace | Underdog, Wellfound Autopilot | Batch + mutual yes economics |
| 3 | Talent rediscovery / CRM memory | Gem | Don’t lose past candidates |
| 4 | Relationship intelligence | Affinity | Warm path to intro |
| 5 | Private company intelligence | Harmonic, Crunchbase | Company identity claims |
| 6 | Change / intent monitoring | Firecrawl Monitor, job signals | Refresh when truth changes |
| 7 | Conversation intelligence | Metaview, BrightHire | Notes after real calls |
| 8 | Evidence / continuous control OS | Vanta | Fail-closed trust receipts |
| 9 | Compensation intelligence | Levels.fyi, Pave | Offer language on real roles |
| 10 | Recruiter service marketplaces | Paraform, Dover | Ops design, not multi-recruiter SaaS |

---

## 1. Structured hiring OS — Ashby & Greenhouse

### What they are

**Greenhouse** productized “structured hiring” as methodology + software: role kickoff → scorecard attributes → interview plan → interview kits → roundup. Official support describes scorecards as mutually exclusive need-to-haves mapped to interview moments, with 90- and 365-day definitions of success in the role-kickoff framing.

**Ashby** sells a startup-scaled ATS with interview plans, openings/headcount structure, and **Candidate Reviews** (1–4 scale, optional notes, evidence fields). Public product material emphasizes required free-text evidence so a “yes” cannot be submitted empty. Ashby’s own talent-ops benchmarks discuss scorecard disagreement rates (~38% of pairs differ by ≥1 point; completion rates scale with company size).

### Mechanisms that actually work

1. **Criteria before candidates** — attributes defined at kickoff, not invented mid-interview.  
2. **Attribute ↔ interviewer mapping** — same person scores the same trait across candidates (consistency).  
3. **Evidence-required scoring** — rating without note is invalid (bias / audit).  
4. **Debrief over average** — structure enables a roundup; the software doesn’t auto-hire.  
5. **90-day success language** — Greenhouse kickoff literature explicitly ties role definition to near-term outcomes (maps cleanly to Demigod’s 90-day product claim).

### What Demigod already has

- Philosophy: 90-day outcome, human review, no auto-match (SIMPLE + DIE D-002).  
- Pair states: proposed / deferred / approved scaffolding.  
- **Missing:** first-class **role object** with required scorecard attributes, required evidence notes, and stage transitions tied to *real* (non-sample) events.

### Thin owned version

```text
RolePacket (one active real role):
  title, companyId, 90d_outcome (required free text)
  must_haves[]  (3–7 attributes, human-authored)
  deal_breakers[]
  comp_band? (human or quoted public only)
  stages: brief_ready → reviewing → mutual_pending → intro → outcome

ReviewNote (per candidate × role):
  attribute → { rating: strong_no|no|yes|strong_yes, evidence: free text required }
  decision_reason: changed_by_context | missing_question | error_prevented | none
```

No AI verdict. Company research projects into the packet as *side evidence*, never as ratings.

### Gate / kill

| | |
|--|--|
| **Gate** | ≥1 accepted-for-delivery role (`sample: false` + provenance) |
| **Kill** | If after 3 real reviews nobody fills scorecards → delete UI, keep free-text notes only |
| **Non-goal** | Full ATS, applicant portal, interview scheduling product |

### Priority for Demigod

**#1 after a real role exists.** Closest mechanism to your actual product definition; Clay does not own this.

---

## 2. Mutual / curated marketplace — Underdog & Wellfound Autopilot

### What they are

**Underdog.io** — Candidate-side apply once; human+software curation; companies receive **small curated batches**; employers contact candidates. Public pricing examples: **~11.5% pay-per-hire** (no monthly on base plan) or premium subscription tiers. Messaging: warm intros, not cold InMail floods; free for candidates.

**Wellfound Autopilot** — Managed layer on the startup jobs marketplace. Public pricing: **$500/month per open role + 10% on hire**, no long contract, pause anytime. Dedicated recruiter; vendor claims **5–10 ready-to-talk candidates per week**. Employer approves/passes warm candidates; recruiter owns sourcing/pitch/scheduling.

### Mechanisms that actually work

1. **Batch size discipline** — quality via *few* candidates, not ranking 500.  
2. **Risk-sharing economics** — success fee (Underdog pure contingency; Wellfound hybrid retain+success). Demigod’s **10% on hire, talent free** is already in this family—closer to Autopilot’s success leg than to 20–25% agency.  
3. **Mutual interest** — marketplace only works when both sides signal; pure push fails.  
4. **Human calibration loop** — Autopilot’s weekly calibration is process, not a model weight.  
5. **Clear “not an agency 25%” positioning** — both sell against traditional contingency.

### What Demigod already has

- 10% on hire economics (positioning).  
- Drafts-only demand; mutual-yes language.  
- **Missing:** enforced **batch cap**, real mutual state on non-sample pairs, pilot logging of outcomes.

### Thin owned version

```text
PilotBatch:
  roleId (real only)
  candidates[2..3] max
  each: why_shortlist (human), consent_candidate, consent_founder
  no fourth candidate until one of first three is terminal (pass/decline)
```

Ops playbook mirrored from Autopilot *without* the $500/mo software product: one role at a time, weekly human calibration checklist.

### Gate / kill

| | |
|--|--|
| **Gate** | First real brief |
| **Kill** | If batches regularly expand past 5 “just this once” → process broken, not missing AI |
| **Non-goal** | Multi-recruiter competitive marketplace (Paraform-style) |

### Priority

**#2 for delivery ops.** Economics story is already aligned; mechanism gap is **discipline objects**, not pricing software.

---

## 3. Talent rediscovery / CRM memory — Gem

### What they are

**Gem** unifies recruiting CRM + outreach + (increasingly) ATS. Flagship mechanism: **AI Talent Rediscovery** — when a search starts, scan *existing* CRM/ATS candidates (silver medalists, past applicants, warm prospects), surface with **engagement history + match score**, before net-new sourcing. Value prop: your database is the first place you look.

### Mechanisms that actually work

1. **Search-over-owned-history first** — cheaper and warmer than cold source.  
2. **Full engagement timeline** — last touch, channel, outcome of past process.  
3. **Silver-medalist memory** — people who almost hired are highest EV.  
4. **Match as prioritization aid** — Gem uses scores; Demigod should use **filter + human order**, not global fit score (D-002).

### What Demigod already has

- Pairs history, demand mark-sent, intros under `demigod-ops/`.  
- Sample pairs only in live data — **no real rediscovery corpus yet**.

### Thin owned version

```text
CandidateTouch SoR (append-only):
  candId, at, channel (dm|email|intro|review), roleId?, outcome, note
Rediscover(role):
  filter owned touches where not suppressed
  sort by: same_company_interest, recency, prior_near_offer
  return ≤10 with full timeline — no fitScore field
```

### Gate / kill

| | |
|--|--|
| **Gate** | ≥5 real candidate touches logged |
| **Kill** | If rediscovery never beats “who we already remembered in Slack” → stop building UI |
| **Non-goal** | 800M external profile index, automated multi-touch sequences |

### Priority

**High after first real pipeline**; useless while pairs are sample-only.

---

## 4. Relationship intelligence — Affinity

### What they are

**Affinity** (relationship CRM for dealmaking) scores **connection strength** from **email + calendar metadata** (frequency, recency — support docs stress **not message content** for the core score). Surfaces who on the team can make a warm intro; strength roughly **10–100**; triggers when scores decay. Used heavily in VC/deal flow; analogous problem: “who can open a door.”

### Mechanisms that actually work

1. **Metadata-not-content** relationship strength — privacy-safer than body scrape.  
2. **Firm-wide network** — intro path is collective, not individual LinkedIn.  
3. **Decay alerts** — relationships rot without nurture.  
4. **Intro as first-class object** — track that an intro was asked/made.

### What Demigod already has

- Intro drafts + logging path; consent gates.  
- **Must not** silently read all mail without explicit product decision.

### Thin owned version (opt-in only)

```text
IntroPath (manual or opt-in connector later):
  from_person, to_company_or_cand, strength: unknown|weak|strong (human-set default)
  evidence: "met at X" | "prior intro 2026-06" (text)
Never auto-email. Never scrape LinkedIn.
```

Phase-0 without Gmail: **manual intro path notes** on company/candidate. Phase-1 only with explicit OAuth and DIE isolation.

### Gate / kill

| | |
|--|--|
| **Gate** | Explicit product decision for any mail/calendar connector |
| **Kill** | If strength scores aren’t used in any intro decision in 90 days |
| **Non-goal** | Affinity clone, people graph SaaS, decay-triggered auto-outreach |

### Priority

**Conceptually high, build-now low.** Manual intro memory first; connectors later.

---

## 5. Private company intelligence — Harmonic & Crunchbase

### What they are

**Harmonic** — “complete startup database” for VC/corp-dev: vendor-scale **35M+ companies / 195M+ people**, time-series firmographics, team graphs, network connections; **Scout** agent for market mapping / IC prep. Buyers: VCs and GTM teams hunting startups.

**Crunchbase** — company/funding/events intelligence; **30M+ verified updates / year** narrative; mix of automated validation + analyst review. Pro tier adds predictions and larger private-market coverage. Provenance is **category-level** (sources + validation process), not always claim-level quote export.

### Mechanisms that actually work

1. **Entity coverage of private markets** — hard and expensive; buy or abstain, don’t casually rebuild.  
2. **Time-series company state** — funding rounds, headcount proxies, hiring as signal.  
3. **Research agent on proprietary graph** (Scout) — only as good as graph + citations.  
4. **Human+AI validation loop** (Crunchbase) — accuracy process is the product.

### What Demigod already has

- SF-focused map (YC/Wikidata/HN) with licenses and retrievedAt.  
- Gold research with **exact quotes + live replay** (stricter inspectability than typical CB/Harmonic public pages).  
- Role ledger as **first-party hiring truth** (Harmonic uses hiring as one signal among many).

### Thin owned version

Do **not** clone 35M companies. Own:

```text
CompanyClaim (operational catalog only when needed):
  field ∈ {stage, last_round, category, ...}
  status supported|conflict|unknown
  evidence {url, quote}  // DIE shape
  researchedAt
```

Prefer **role-ledger-derived** “actively hiring / aging reqs” over purchased headcount estimates.

### Gate / kill

| | |
|--|--|
| **Gate** | Real review blocked on a specific unknown field (roadmap Phase 4) |
| **Kill** | If paid data never changes a review decision → cancel subscription, keep public quotes |
| **Non-goal** | People graph, investor CRM, Scout-like autonomous research product |

### Priority

**Medium, field-gated.** Your differentiation is already *stricter provenance on fewer companies*, not wider coverage.

---

## 6. Change / intent monitoring — Firecrawl Monitor & job signals

### What they are

**Firecrawl `/monitor`** — scheduled page/site checks; markdown diffs; statuses `same|new|changed|removed|error`; webhooks/email/Slack when meaningful change; plain-English “what to track”; filters noisy diffs. Positions as **notify agents when the web changes**, not re-scrape everything daily for fun.

**Job-data / intent vendors** (category: PredictLeads, LinkUp-style feeds, Common Room hiring signals) — treat postings and firmographic changes as GTM triggers.

### Mechanisms that actually work

1. **Change-triggered work** — cost proportional to churn (innovation doc § mechanism 3).  
2. **Diff + semantic filter** — raw HTML change is noisy; structured “did jobs list change?” matters.  
3. **Webhook to workflow** — monitoring is useless without a consumer.  
4. **First-party observation > inferred intent** — for Demigod, **ledger open/close/reopen** is cleaner intent than “website visit” products.

### What Demigod already has

- Role ledger poll (full board snapshots).  
- Research live re-verify (claim still on page).  
- History reduce with transport-fail ≠ absence.  
- **Missing:** page-level monitor on gold URLs; poll cadence as a **timer**; map enrich without reseal thrash policy.

### Thin owned version

```text
1) systemd timer: role-ledger poll daily (primary intent engine)
2) optional: monitor gold company URLs + careers pages
   on changed → enqueue reseal or research flag (not auto-catalog write)
3) never: website-visit intent, pixel, or brokered intent APIs as product core
```

### Gate / kill

| | |
|--|--|
| **Gate** | Poll timer is free anytime; page monitor after multi-day history exists |
| **Kill** | If monitor false-positives > useful reseals over 30 companies (innovation 3.1 style) |
| **Non-goal** | Common Room-style multi-signal GTM cloud |

### Priority

**Poll timer = highest EV infra.** Firecrawl monitor = substrate for Phase 5 / claim refresh, not a new product line.

---

## 7. Conversation intelligence — Metaview & BrightHire

### What they are

**Metaview** — recruiting-native AI notetaker: joins interviews/intake/debriefs; structured notes minutes later; ATS push; expands into sourcing/application review agents. Help center: **does not evaluate candidates or make hiring decisions** — human edits. Pricing often seats/custom.

**BrightHire** — interview intelligence: record/transcribe, align highlights to scorecards, coach interviewer quality; more enterprise “hiring system of action” positioning.

### Mechanisms that actually work

1. **Attention restoration** — interviewer talks to human, not notepad.  
2. **Structured notes → ATS** — notes become institutional memory.  
3. **Scorecard alignment** (BrightHire) — links speech to pre-defined attributes.  
4. **Explicit non-decision** (Metaview messaging) — compatible with D-002 if enforced.

### What Demigod already has

- Douglas-style call packs (manual).  
- Pair history for states — **not** call content.

### Thin owned version

```text
CallNote (after real call only):
  pairId or roleId+candId
  kind: intake|candidate_screen|debrief
  summary_human_edited (required)
  raw_transcript? (optional, private, never scores)
  attributes_touched[] → free text evidence
Push: never auto-changes pair state
```

Build **manual structured notes** first; bot-joiner only if volume justifies.

### Gate / kill

| | |
|--|--|
| **Gate** | ≥1 real intro or screen call completed |
| **Kill** | If notes aren’t opened in the next review → stop automation |
| **Non-goal** | Autonomous sourcing agent, auto-outreach from call AI |

### Priority

**Late** — after intros exist. Premature Metaview-clone is theater.

---

## 8. Evidence / continuous control OS — Vanta

### What they are

**Vanta** — trust/compliance automation: map controls → automated tests → **continuous evidence collection** across integrations; move from point-in-time audits to **continuous control monitoring**; Trust Center for external proof; remediation workflows. Customers buy *ongoing proof*, not a one-time PDF.

### Mechanisms that actually work

1. **Control catalog** — named invariants with owners.  
2. **Automated tests on a schedule** — hourly/daily evidence refresh.  
3. **Fail visible** — red control is productively painful.  
4. **External trust surface** — shareable status without exposing internals.  
5. **Remediation loop** — not just dashboards.

### What Demigod already has (surprisingly deep)

| Vanta idea | Demigod analogue |
|------------|------------------|
| Controls | DIE D-001–D-012, ledger honesty invariants |
| Automated tests | poison suites, verify-all, import-integrity |
| Continuous monitoring | `evidence.mjs fresh`, truth seal |
| Fail closed | research quarantine, CR=0 when red |
| Trust center | could be honest public claims on site + `bin/dg truth` |

### Thin owned version

```text
ControlBoard (operator):
  control_id → last_pass_at, receipt_path, severity
  e.g. research_seal_green, board_honesty, no_sample_as_real,
       export_no_PII, phase2_gate_closed_without_role
Product language: "fail-closed hiring evidence" not "AI matching"
```

Optional public: only controls safe to show (never private candidate data).

### Gate / kill

| | |
|--|--|
| **Gate** | None for internal control board — can build anytime |
| **Kill** | If controls aren’t checked at session start → noise |
| **Non-goal** | Selling GRC SaaS to other companies |

### Priority

**High leverage / low risk** for agent ops and honest marketing. Closest “you already half-built this” vertical after Clay.

---

## 9. Compensation intelligence — Levels.fyi & Pave

### What they are

**Levels.fyi** — crowd-sourced offer database; levels ladders; public TC breakdowns (base/stock/bonus); employer tooling / talent adjacent products. Strength: **candidate-visible market language**.

**Pave** — employer-side **compensation management**: real-time benchmarks (vendor: 9,000+ companies), ranges, merit cycles, total rewards communication. Strength: **company pay decisions as a system**.

### Mechanisms that actually work

1. **Shared vocabulary for offers** — levels + TC components unblock negotiation.  
2. **Band before search** — hiring managers who skip bands waste cycles.  
3. **Fresh benchmarks** — Pave’s pitch vs annual surveys.  
4. **Crowd + employer dual markets** — Levels (supply) vs Pave (demand-side systems).

### What Demigod already has

- Comp as free text on sample roles.  
- Research **pricingStatus** (SaaS pricing) withheld — different concept from **candidate compensation**.

### Thin owned version

```text
Role.comp:
  band_text (human required for real role)
  source: founder_stated | public_job_post_quote | unknown
  if public_job_post: {url, quote} DIE-shaped
Never scrape personal Levels submissions into candidate profiles.
```

### Gate / kill

| | |
|--|--|
| **Gate** | Real role in offer-adjacent stage |
| **Kill** | If bands aren’t used in any candidate conversation |
| **Non-goal** | Building a Levels competitor or Pave HRIS |

### Priority

**Medium, late in pilot.** Important for close rate; not map enrichment.

---

## 10. Recruiter service marketplaces — Paraform & Dover

### What they are

**Paraform** — marketplace of recruiters (+ AI agents) competing on roles; **contingency ~20–25%** of first-year salary; $0 if no hire; 90-day replacement narrative on public materials. Incentivizes submit-interested-candidates, multi-recruiter coverage.

**Dover** — free/cheap ATS wedge + **fractional recruiters**; public materials emphasize **hourly (~$80)** and/or **flat $2k–$8k per hire** style economics (varies by arrangement); $800 deposit patterns on marketplace billing docs historically. Risk on employer for hourly; predictable vs % of salary on flat hire.

### Mechanisms that actually work

1. **Incentive alignment** — contingency vs hourly vs hybrid changes behavior (spray vs craft).  
2. **Software wedge + human fulfillment** — Dover ATS free → paid humans.  
3. **Multi-sourced competition** (Paraform) — coverage for rare roles.  
4. **Transparent public pricing** as GTM — both educate founders against opaque 25% agencies.

### What Demigod already has

- Single-desk 10% model (closer to Autopilot success fee than Paraform 25%).  
- **Should not** become a multi-recruiter marketplace without business model change.

### Thin owned version (ops, not software)

Steal **playbooks**, not marketplace:

| Steal | How |
|-------|-----|
| Written SLA-free honest timelines | Already in anti-SLA posture |
| Replacement window language | 90-day outcome tracking object |
| “What good submission looks like” | Scorecard + shortlist template |
| Founder education on fee math | Fee one-pager (exists in ops) |

### Gate / kill

| | |
|--|--|
| **Gate** | Scaling beyond one operator |
| **Kill** | If multi-recruiter software is proposed before 10 real hires — BLOCK |
| **Non-goal** | Paraform clone |

### Priority

**Ops design only** until volume forces a second human.

---

## Cross-vertical synthesis

### Mechanisms ranked by fit × readiness

| Rank | Mechanism | Source vertical | Ready when | Build shape |
|-----:|-----------|-----------------|------------|-------------|
| 1 | Control/evidence continuous monitoring | Vanta | Now | Internal control board + session orient |
| 2 | Daily observation / change-triggered poll | Firecrawl + job intent | Now | Timer + ledger (not new SaaS) |
| 3 | Structured role + scorecard + evidence notes | Ashby/Greenhouse | First real role | RolePacket + ReviewNote |
| 4 | Batch cap + mutual states | Underdog/Wellfound | First real role | PilotBatch hard limits |
| 5 | Touch timeline rediscovery | Gem | Real touches logged | CandidateTouch SoR |
| 6 | Quoted company claims (stage/funding) | Harmonic/CB | Review blocked on field | Operational catalog row |
| 7 | Comp band on role | Levels/Pave | Offer stage | Human/quoted band only |
| 8 | Call notes structured | Metaview | First screens | Manual first, bot later |
| 9 | Relationship strength | Affinity | Explicit connector decision | Manual paths first |
| 10 | Multi-recruiter marketplace | Paraform/Dover | Business model change | Do not build software |

### Pattern shared with your Clay work

Successful products sell a **mechanism under a constraint**:

| Product | Constraint that creates value |
|---------|-------------------------------|
| Clay | Table + enrichment under GTM action |
| Greenhouse | Structure under bias/consistency |
| Underdog | Curation under batch size |
| Gem | Memory under “don’t re-source” |
| Affinity | Network under warm intro |
| Vanta | Continuous proof under audit fear |
| Metaview | Attention under interview load |
| Demigod DIE | Exact evidence under human match decision |

Your next builds should name the **constraint**, not the competitor.

### Permanent non-overlap (still)

- People data brokers, LinkedIn cookie products, auto-DM sequences  
- Global fit scores as product  
- Public company-research SaaS  
- Full ATS / HRIS / GRC for third parties  

---

## Suggested research follow-ups (if deepening further)

1. Primary-source pass on **Ashby Candidate Reviews API/export shape** vs Demigod pair notes.  
2. **Wellfound Autopilot** weekly calibration checklist reconstruction from case studies (ops only).  
3. **Affinity** strength formula public details vs privacy review for any future Gmail metadata path.  
4. **Firecrawl monitor** cost model vs daily ledger poll for gold-30 URLs.  
5. Map **Phase 2 packet fields** 1:1 to Greenhouse scorecard attribute types.

---

## Sources (indicative)

Primary and secondary materials consulted 2026-07-30 include vendor product/support pages and docs for Ashby, Greenhouse Support structured hiring guides, Wellfound pricing/Autopilot, Underdog pricing/companies pages, Gem CRM/rediscovery, Affinity relationship intelligence support, Harmonic site/blog, Crunchbase About Data / Pro, Firecrawl monitor docs/blog, Metaview product/support, BrightHire product comparisons, Vanta CCM/compliance product pages, Levels.fyi, Pave, Paraform and Dover comparison/pricing posts. Vendor metrics are not independently audited here.

Internal: `DEMIGOD-DIE-SPEC.md`, `docs/die/research/COMPETITIVE-LANDSCAPE.md`, live Demigod receipts as of 2026-07-30 strategy roundtable.
