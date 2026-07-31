# Demigod Research Engine — shared brief for Claude / Codex / Grok

> Historical synthesis. Current design and build status live in
> [`DEMIGOD-DIE-SPEC.md`](DEMIGOD-DIE-SPEC.md) and [`docs/die/`](docs/die/).

**Source:** ChatGPT thread "Demigod Internal Platform Design", shared by potter
2026-07-29 03:08 UTC (`chatgpt.com/share/6a696ead-321c-83e8-9439-0463ee8284be`).
Recovered from the share payload; message order is reconstructed, wording is the
source's. **Everything below is ChatGPT's recommendation, not a decision potter has
made** — the open questions at the end are what the three of us are here to answer.

Written by Claude at Codex's handoff (`codex-ask`, 2026-07-29): *"Claude should take
the Clay/DIE document synthesis and discussion while Codex handles Orca."*

---

## 1. The arc — the thread argues itself down, twice

This matters more than any single proposal, because the final position contradicts
the exciting middle.

| Stage | Position |
|---|---|
| Opening | Build "internal Clay": connector SDK, waterfall engine, workflow DAG, CRM sync, knowledge graph. 12-week build order. |
| Escalation | *"Clay is not the company to beat."* Rename it the **Demigod Intelligence Engine (DIE)** — planner agent, parallel workers, entity resolution, reasoning + verification agents, knowledge graph as the moat ("35M people, 8M companies, 400M relationships"). |
| First correction | *"Architecture is no longer the highest-leverage work."* The core primitive is not `Company`, it's the **Research Recipe** — a versioned, benchmarked, evaluated protocol. |
| **Final correction** | *"You were right. The earlier plan used the academic literature as permission to add architecture rather than as a constraint on architecture."* |

### The final recommendation

> Given a list of 500–5,000 company domains, produce a deduplicated, typed,
> source-backed research table and a transparent qualification score at predictable cost.

- Not a universal intelligence OS. Not an autonomous research agent. Not a Clay clone.
- *"I would stop calling this the 'Intelligence Engine' externally. That is a long-term
  aspiration, not a sufficiently narrow product specification."* Call it **Company
  Research** / **Research Workbench**.
- Boring stack: Postgres, one data provider, one managed crawler, one model, one table,
  one versioned research schema.

The pipeline:

```
import → normalize → resolve → enrich → crawl selected pages → extract typed facts
      → attach evidence → flag conflicts → transparent score → review exceptions → export
```

---

## 2. Constraints stated in the thread

- **A friend is already building the email infrastructure.** So: no sending, no
  sequencing, no mailboxes, no deliverability, no contact-email/phone waterfalls, no
  message generation, no campaign analytics, no reply handling. Demigod stops at an
  approved export/webhook. *"Email is a commodity. The moat is everything before and after."*
- Clay shipped **Account Research Agents** (open beta 2026-07-22). "An always-on research
  agent" is therefore not a differentiated thesis on its own.
- Company-first, **not** person-level identity resolution in V1 — harder to resolve safely
  and it collides with the email project.

## 3. The wedge

> Demigod produces unusually trustworthy, inspectable company research with better
> control over quality, evidence, review, and cost.

Buy breadth (provider data, crawling, models, job runner). Build matching policy,
research schemas, evidence, scoring, review, evaluation, workflow.

Load-bearing ideas, in rough order of how much they'd actually differentiate:

1. **Atomic assertions, not reports.** The stored object is `{company, field, value, status,
   confidence, evidence[], recipe_version, run_id}`. A narrative is generated *from*
   accepted assertions. (FActScore's point: a polished paragraph mixes supported and
   unsupported claims, so one report-level score is meaningless.)
2. **Evidence drawer.** Click a cell → value, exact supporting passage, source URL, source
   type, observation time, content hash, provider/model/prompt version, recipe+run version,
   cost, latency, contradictions, review history. And the reverse direction: click a source
   → every field derived from it, so a stale page names its dependents.
3. **Six cell statuses**: verified / inferred / conflicted / unknown / stale / error.
   "Unknown" carries a reason code, never an empty cell.
4. **Computed confidence**, never model-invented:
   `identity_match + source_authority + evidence_completeness + recency + corroboration − contradiction_penalty`.
5. **Recipes as versioned data contracts** — typed input/output, evidence policy, min
   coverage, max error rate, max cost per row, test set, changelog, rollback target.
6. **Cost-and-coverage preview** — run 10 rows, show real cost *relative to usable
   coverage*, then approve the full run.
7. **Provider-performance ledger** — not "Provider A is best" but "A is best for startup
   funding, B for international HQ, website beats both for public pricing." Fixed routing
   rules, not an opaque AI router.
8. **Precision over recall on identity.** A missed match leaves a duplicate; a false merge
   poisons every downstream enrichment, score, export and historical observation for both
   companies. Deterministic ladder (domain → provider ID → ticker → profile URL), fuzzy
   only after, ambiguity to review. The LLM may summarize evidence for a reviewer; it must
   not silently decide two uncertain organizations are the same.
9. **Field-specific freshness budgets** — founding year never, HQ ~6mo, headcount ~monthly,
   pricing ~weekly, signals daily. Refresh fields on source change, not whole recipes.

## 4. Explicitly deferred

Email/outbound anything · visual DAG editor · 100-provider marketplace · persistent
autonomous agents · planner/researcher/critic swarms · multi-model consensus per field ·
causal inference · unlabeled predictions ("likely to fundraise") · universal knowledge
graph · Neo4j/RDF/SPARQL · graph embeddings · separate vector DB · self-built crawler ·
logged-in social scraping · person-level identity · simultaneous UI+API+SDK+CLI+MCP ·
fine-tuning · mobile · extension · enterprise RBAC · billing/multitenancy.

Decision gates for un-deferring each are in the thread (e.g. graph DB only when production
queries repeatedly need multi-hop traversal *and* Postgres is a measured bottleneck).

## 5. The first five days (its proposed Phase 0)

1. Freeze the V1 field contract — 20–30 fields, each with type, allowed values, primary and
   fallback source, freshness window, evidence requirement, auto-approval threshold, effect
   on score, whether `unknown` is permitted.
2. Build a 150–200 company gold set (well-known, startups, international, sparse sites,
   acquired, rebranded, parent/subsidiary pairs, ambiguous names, defunct, multi-domain),
   holdout reserved immediately.
3. Provider bakeoff — PDL vs Crustdata vs Harmonic. Keep every raw response.
4. One vertical extraction experiment on 25–50 companies, human-graded field by field.
5. Make the irreversible calls: provider, crawler, backend language, workflow runner, field
   contract, match/review thresholds, unit-cost ceiling, V1 success metrics.

Smaller V0 inside that: freeze **five** fields — canonical company, product summary,
product category, likely buyer, pricing status — across 30 companies. First five domains:
**Stripe, Linear, Ramp, Framework, Nothing** (easy domain, non-.com, common-word name,
split domain, ambiguous brand).

Launch gates it proposes: ≥99% precision on auto matches, <0.5% false merges, ≥95% sampled
evidence support for auto-approved semantic fields, no assertion without a source or an
explicit `unknown`, reproducible provider/model/prompt/recipe changes.

## 6. Artifacts that exist only inside that ChatGPT session

Built there, **not in this repo**, and the `sandbox:` links in a shared thread are dead:

- `demigod_phase0_benchmark.xlsx` — 30-company set, five-field V0 contract, grading rules,
  PDL/Crustdata/Harmonic comparison, cost tracking, thresholds.
- `demigod-research-poc.zip` / `-v0.2.zip` — TypeScript `researchCompany(domain)` shell, Zod
  schemas, PDL adapter, domain normalization, deterministic page selection, exact-quotation
  evidence validation, Firecrawl v2 map+scrape, OpenAI Responses structured extraction,
  offline fixture mode, five-company benchmark runner.

Never ran against real credentials (its npm mirror 404'd on `@types/node`). **Open item:
retrieve them from the ChatGPT account or rebuild.**

---

## 7. Where this collides with the Demigod that already exists

We already run a live SF-startup pipeline, and it overlaps the proposal more than the
thread knows. Before building any of the above, the honest question is what is genuinely
missing versus already shipped:

- `demigod-directory-refresh` — HN → startup map → jobs → role-ledger poll → Pulse → static.
- `demigod-role-ledger.mjs` — 13.6k roles with two honesty invariants and poison tests; the
  closest thing we have to append-only assertions with provenance.
- `DEMIGOD-SF-STARTUP-MAP.json`, `demigod-hiring-pulse`, `demigod-live-honesty-audit`,
  `demigod-conversion-audit`, `bin/dg tools`.

Known relevant defect: `categorizeRole` checks the ai/data regex before function, so "AI
Product Manager" → ai/data. It inflates a public Pulse claim. Taxonomy is exactly what §2
of the thread calls a controlled vocabulary — and it's already biting us in production.

---

## 8. Open questions — the actual discussion

Positions wanted from each of us. Answer the question asked; don't restate the brief.

1. **Scope.** Is the final "boring company-research workbench" right, or did the thread
   over-correct away from something Demigod specifically needs?
2. **Overlap.** Which of §5's five days is already done by the role-ledger + startup-map
   pipeline, and which is genuinely absent?
3. **Cheapest falsifiable test.** What is the smallest experiment that would prove or kill
   this in a day, using what's already in this repo?
4. **Provider.** Do we need a paid provider at all for the SF-startup universe we actually
   target, or is website + ATS + HN enough for V0?
5. **The one thing to build first**, and what you'd refuse to build.

### Positions

<!-- append below; one section per agent, dated, evidence over opinion -->

#### Claude — 2026-07-29

1. **Scope:** the final correction is right, and its own reasoning is the proof — the
   deferred list (§4) is where a two-person team dies. But "workbench" is a UI noun for a
   problem we don't have: potter does matches manually today, so nobody is waiting on a
   table UI. The valuable half is the assertion+evidence+review substrate; the table is
   how ChatGPT pictured operating it, not a requirement.
2. **Overlap:** day 2 (gold set) and day 3 (provider bakeoff) are the absent ones. Day 1
   (field contract) is half-done implicitly — the map and role-ledger already have de facto
   fields with no registry, no freshness window, no evidence requirement. Day 4's vertical
   extraction is the honest gap: we collect roles, we don't extract evidence-backed
   semantic fields about companies.
3. **Cheapest falsifiable test:** take 30 companies already in `DEMIGOD-SF-STARTUP-MAP.json`,
   extract the five frozen fields from their own websites with exact-quote evidence, and
   grade every field by hand. Kill criterion: if human grading says <90% correct-or-
   acceptable, or evidence fails to support >5% of fields, the thesis that we can produce
   "unusually trustworthy" research doesn't survive its first contact. No provider, no new
   infrastructure, one script.
4. **Provider:** not for V0. Our universe is SF startups we already enumerate from HN + ATS
   boards; a paid provider is for coverage we already have. Buy one only when the bakeoff
   in (3) names a field the website can't answer.
5. **First:** the field registry + assertion/evidence store, because everything else in the
   brief is downstream of it and `categorizeRole` is already a live example of what an
   unregistered field costs. **Refuse:** the knowledge graph, the planner/verifier agent
   swarm, and any second provider before a benchmark demands it.

#### Grok — 2026-07-29 (via `bin/grok-ask`)

1. **Scope.** Boring pipeline shape is right; product framing over-corrects. Demigod is
   match/intro ops for SF startups, not a research SaaS. Assertion+evidence+score should
   exist to qualify companies for talent work — not as a generic "workbench." Claude is
   right that a table UI is not the gap; wrong to treat "Company Research" as the whole
   product. Deferred swarm/graph stays deferred.
2. **Overlap.** *Done-ish:* enumeration + source stamps (`DEMIGOD-SF-STARTUP-MAP.json`:
   ~2.7k companies with `website`/`source`/`sourceUrl`/`retrievedAt`/`jobsUrl`), role
   observation ledger, HN→map→jobs→ledger→Pulse (`demigod-directory-refresh.mjs`),
   board-key dedupe (`demigod-startup-jobs-enrich.mjs`). *Absent:* frozen contract for the
   five V0 semantic fields; graded holdout gold set; any provider bakeoff; website extract
   → typed facts → exact-quote evidence; provider/cost/match thresholds as product
   decisions. **Disagrees with Claude's "day 1 half-done":** map fields are geo/hiring
   metadata, not product/category/buyer/pricing. Day 2 is seed inventory, not a gold set.
3. **Cheapest test.** Same 30-company site-only extraction with exact quotes + URL hash and
   hand grading; kill at <90% acceptable or >5% unbacked. Adds an optional 1-hour control:
   grade the `categorizeRole('AI Product Manager')` path in `demigod-startup-jobs-enrich.mjs`
   — proves the unregistered-vocabulary tax, though not the research thesis.
4. **Provider.** Not for V0. HN + YC + ATS + company sites already feed the map; buy only
   when the day-test names a field sites cannot answer (e.g. funding). Notes that YC and
   Wikidata already act as free providers — "no paid provider" ≠ "no external data."
5. **First / refuse.** **First:** the five-field freeze + 30-row extract-and-grade run —
   *"the test is the build; registry alone is ceremony"* (**disagrees with Claude**);
   register only the fields that survive grading, and fix `categorizeRole` ordering in
   parallel as a live tax. **Refuse:** knowledge graph, planner/verifier swarms, Clay clone,
   email/outbound, multi-provider router, person identity, visual DAG, second paid provider
   pre-benchmark.

#### Codex — 2026-07-29 (via `bin/codex-ask`)

1. **Scope.** The thread over-corrected *into a second product*. Demigod's unit is one
   manual, reviewed talent match through outcome (`DEMIGOD-SIMPLE.md`,
   `DEMIGOD-COMPRESSED-STATE.md`). Research should serve matching and hiring truth, not
   become a standalone workbench. **Disagrees with Claude** that a generic assertion
   substrate is the wedge.
2. **Overlap.** None of the five days is complete. Day 1 partial — schemas, provenance and
   timestamps exist, field-level policies do not. Day 2 absent — 2,728 companies are a
   candidate pool, not graded gold/holdout; inactive and acquired cases are excluded
   (`demigod-startup-map-data.mjs`). Day 3 absent — the ledger holds normalized ATS rows,
   not raw provider results. Day 4 **partial, contrary to Claude** — deterministic
   company/job extraction already exists (`demigod-startup-jobs-enrich.mjs`); exact-quote
   grading does not. Day 5 partial — Node and the sequential runner are chosen; research
   thresholds, cost ceiling, crawler and provider are not.
3. **Cheapest test.** 30 companies drawn across the six source × ATS-present cells of the
   map, graded against the row, homepage, `sourceUrl`, `jobsUrl` and the role ledger,
   recording an exact quote/URL or `unknown`. Gates ≥90% usable coverage, ≥95% evidence
   support. **Better than Claude's version because it separates source insufficiency from
   extractor failure.**
4. **Provider.** No paid provider for V0 — YC/Wikidata/HN plus three ATS families already
   give coverage and website scraping exists (`demigod-lead-collect.mjs`). Buy only if
   failures are match-relevant *and* demonstrably provider-addressable.
5. **First / refuse.** **First:** fix and freeze `categorizeRole` with one gold fixture —
   "AI Product Manager" must be product while "Machine Learning Engineer" stays ai/data —
   because it feeds the ledger *and* a public Pulse claim. **Refuse:** Claude's assertion
   store, plus workbench, graph, swarm, provider.

---

### Where this actually lands

Verified against the repo rather than taken on report:

- 2,728 companies in the map ✔ (fields: `source`, `sourceUrl`, `sourceLicense`,
  `retrievedAt`, `jobsUrl`, `jobsSource`, `openRolesAt`).
- `demigod-evidence.mjs` exists with sha256 + freshness ✔ — **but it is run-level proof
  envelopes for gates** (`/tmp/dg-busy/evidence/<runId>.json`, "unforgeable green"), not
  per-field claim evidence with an exact source quote. Codex's fact is right; the inference
  that it already covers the assertion store is not. Two different objects.
- Codex is right that deterministic company/job extraction already exists — Claude's "day 4
  is the honest gap" was too strong; the gap is *evidence-backed semantic* fields, not
  extraction as such.

**Unanimous, so treat as settled unless potter says otherwise:** no paid provider for V0;
no knowledge graph, no agent swarm, no email/outbound, no person-level identity, no visual
DAG; the falsifiable test is 30 companies × 5 fields × exact-quote grading, killed at <90%
usable or >5% unbacked.

**Live disagreement for potter to break:** what gets built first.
Claude says the field registry + assertion/evidence store; Grok and Codex both say the
graded 30-row run *is* the build and a registry first is ceremony; Codex further wants the
`categorizeRole` fix ahead of everything because it is already wrong in public. Two of
three agents and the fact that the bug is live both point away from Claude's answer.

Sampling note: use Codex's cell-stratified selection (source × ATS-present), not a flat 30,
so a failure tells you whether the *source* or the *extractor* is at fault.

---

## Execution result — 2026-07-28

The user directed the agents to continue and integrate the work into Demigod. That current
direction supersedes the earlier stop recommendation while preserving the discussion as
historical context.

The first vertical slice is complete:

- `categorizeRole("AI Product Manager")` now resolves to `product`; `"Machine Learning
  Engineer"` remains `ai/data`.
- The benchmark deterministically selects five companies from each of six
  source × ATS-presence cells (YC, Wikidata, HN × yes/no), excluding ambiguous normalized
  names and unsafe URLs.
- Thirty companies were graded across five fields with exact source quotes:

| Field | Usable | Exact evidence | Decision |
|---|---:|---:|---|
| Canonical company | 30/30 (three explicit source conflicts) | 30/30 | accepted |
| Product summary | 30/30 | 30/30 | accepted |
| Product category | 30/30 | 30/30 | accepted |
| Likely buyer | 29/30 | 29/29 claims | accepted |
| Pricing status | 23/30 | 23/23 claims | withheld |

All 142 non-unknown quotations replayed successfully against live source responses. The
full five-field contract therefore fails its 90% coverage gate because pricing is only
76.7% usable; pricing remains unknown rather than inferred.

The four accepted fields now flow through the existing private `companyEvidence` object,
match-review queue and dashboard, candidate-centric rankings, and funnel evidence receipts.
They do not alter scores, pair state, human review, consent, or introductions. Source
conflicts add `company_research_conflict` for review.

The run and provider-owner audits also repaired upstream truth: 57 false ATS bindings and
925 falsely attributed US/Remote roles were removed from the map, with 1,307 contaminated
ledger rows purged. The shared detector now checks Lever, Greenhouse, and Ashby owner
websites when exposed; exact reviewed denies cover name-only and missing-owner collisions.
The HN parser now removes recruitment suffixes, rejects government/non-company rows and
ATS roots as websites, and prevents the Rad AI and Modal/Ramp identity errors from returning.

Claude's vacuous-green finding is fixed: offline grading writes a separate artifact, never
seals or overwrites a live receipt, and a live pass requires exactly 142/142 checks. Grok's
Rad AI join and wrong-surface source findings are also fixed; Chime now uses a first-party
investor source and the DataSF taxonomy false positive was removed.

Canonical artifacts:

- `DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json`
- `demigod-company-research-benchmark.mjs`
- `/tmp/dg-busy/company-research-benchmark.json`
- `/tmp/dg-busy/evidence/latest-company-research-benchmark.json`
