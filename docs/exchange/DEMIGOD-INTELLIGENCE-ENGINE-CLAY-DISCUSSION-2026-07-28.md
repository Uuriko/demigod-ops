# Demigod Intelligence Engine (DIE) / Clay Discussion

**Status:** exploration for Codex, Grok, and Claude discussion — not an implementation order  
**Captured:** 2026-07-28 PT  
**Source:** [shared ChatGPT conversation](https://chatgpt.com/share/6a696ead-321c-83e8-9439-0463ee8284be), received by email at `potter@trydemigod.com`  
**Source title:** “Demigod Internal Platform Design”

## Canonicality guard

The current Demigod product remains the SF startup/talent-matching service described in `DEMIGOD-SIMPLE.md` and `DEMIGOD-COMPRESSED-STATE.md`. Current DIE design and build status live in [`DEMIGOD-DIE-SPEC.md`](../../DEMIGOD-DIE-SPEC.md) and [`docs/die/`](../die/). The imported conversation instead explores an evidence-backed company-research platform inspired partly by Clay. It is preserved here as product/architecture input, not as permission to replace the current product, build the proposed system, add infrastructure, or override current external-action gates.

“Demigod Intelligence Engine (DIE)” is Jonathan’s framing for this discussion; the acronym does not appear in the imported conversation.

## Questions for the three-agent discussion

1. Is there a small, valuable intelligence capability inside the existing Demigod talent-matching product, without pivoting into a generic company-research platform?
2. Which ideas already exist in Demigod under different names and should be reused?
3. What is the smallest credible vertical slice, if any?
4. Which proposed ideas are premature, duplicative, or in conflict with current product truth?
5. What decision or evidence would justify revisiting the larger “research recipe” architecture?

## Full imported conversation

### Message 1 — Assistant

~~~~text
I think we've reached the point where architecture is no longer the highest-leverage work.

If I were the founding engineer, I would stop adding components and start designing the research system itself.

After thinking about how Clay, Hebbia, AlphaSense, Common Room, Perplexity, and Deep Research actually work, I think there are four missing pieces that are much more important than another connector or another agent.

1. Research Recipes

I now think this becomes the heart of Demigod.

Not workflows.

Not prompts.

Recipes.

A recipe is closer to a scientific protocol.

It answers:

"How do we reliably answer this question?"

Instead of

Research Company

you have

Company Baseline v1.2

which explicitly defines

required inputs

allowed sources

pages to visit

provider order

extraction schema

validation rules

evidence policy

confidence thresholds

review rules

scoring algorithm

export schema

A recipe becomes version controlled.

Exactly like code.

Example
YAML
recipe:
  company_baseline

version:
  1.3

inputs:
  domain

sources:
  provider
  website

pages:

- homepage
- pricing
- about
- product
- customers

extract:

- product_summary
- pricing
- buyer
- customer_type

validation:

- quote exists
- quote supports claim
- schema valid

review:

confidence < .80

export:

company_baseline_v1

This becomes your biggest internal asset.

2. Research DSL

Don't make engineers write JSON.

Design a tiny language.

Example

Company(domain)

Resolve()

Website()

Pages(
about,
pricing,
product
)

Extract(

ProductSummary,

Pricing,

Buyer

)

Verify()

Score()

Export()

Very readable.

Eventually compile into execution.

3. Evaluation System

This is where almost nobody spends enough time.

Every recipe should accumulate statistics forever.

Imagine a dashboard.

Company Baseline v1.3

Companies

18,241

Average Cost

$0.37

Average Runtime

14 sec

Identity Precision

99.4%

Unsupported Claims

1.1%

Human Corrections

3.4%

Coverage

94%


Every release competes against previous releases.

Exactly like software.

4. Source Registry

Right now we think in connectors.

Instead think in knowledge sources.

Every source gets metadata.

Example

Official Website

Reliability

★★★★★

Freshness

★★★★★

Latency

2 sec

Cost

0

Good For

Pricing

Products

Messaging


Another

Provider X

Reliability

★★★★☆

Freshness

★★★☆☆

Latency

300 ms

Cost

$

Good For

Employees

Funding

Industry

Then recipes choose sources intelligently.

5. Field Registry

This is something Clay doesn't expose well.

Every field gets its own definition.

Example

pricing_status

Description

Public pricing availability.

Allowed Values

public

contact-sales

free

unknown

Preferred Sources

pricing page

Evidence Required

Yes

Auto Approval

90%

Refresh

30 days


Now everything stays consistent.

6. Taxonomy

This is a much bigger deal than it sounds.

Never allow arbitrary categories.

Instead

Security

Identity

Fraud

Voice

CRM

DevTools

Observability

Payments

Infrastructure

Robotics

Healthcare


Controlled vocabulary.

Makes search much better.

7. Benchmark Library

Instead of

30 companies.

Eventually

Identity Cases

200

Pricing Cases

150

Hardware

100

Stealth

100

Developer Tools

150

Healthcare

120

Acquired Companies

90

International

180


Now every release automatically runs against benchmarks.

8. Failure Taxonomy

One of my favorite ideas.

Instead of

Failed

Store

Wrong Match

Bad Crawl

Bad Quote

Weak Evidence

Prompt Failure

Schema Failure

Website Missing

Timeout

Model Hallucination

Provider Missing


Now engineering knows exactly where quality is lost.

9. Gold Dataset

Not benchmark.

Gold.

Every field manually reviewed.

Example

Company

Stripe

Product Category

Payments

Buyer

Engineering

Finance

Pricing

Public


Eventually

1000+

gold companies.

Every recipe gets evaluated.

10. Research Notebook

This one I think is genuinely valuable.

Every run automatically creates a notebook.

Started

10:03

Resolved

Stripe

Visited

6 pages

Ignored

12 pages

Rejected

2 claims

Accepted

11 claims

Human edits

1

Cost

$0.18


Like Jupyter.

But for research.

Incredible for debugging.

11. Quality Ledger

Every model call recorded.

Prompt

v1.3

Model

GPT

Cost

$0.002

Accepted

Yes

Edited

No

Runtime

2 sec

Now prompt engineering becomes measurable.

12. Source Fingerprints

Instead of

saving

Pricing Page

Store

Hash

Retrieved

ETag

Content Length

Version


Now if page hasn't changed

skip extraction.

Huge cost savings.

Biggest Change I'd Make

This is the biggest thing I'd change after all this research.

Originally I thought Demigod's core primitive was:

Company

I now think it's:

Research Recipe

Everything else revolves around recipes.

Companies are just inputs.

Recipes are reusable.

Recipes improve.

Recipes get benchmarked.

Recipes get versioned.

Recipes accumulate statistics.

Recipes become your intellectual property.

The long-term picture

I think Demigod eventually looks like this:

Repository

├── recipes/
│
├── field_registry/
│
├── source_registry/
│
├── taxonomies/
│
├── benchmarks/
│
├── gold_data/
│
├── evaluation/
│
├── providers/
│
├── extractors/
│
├── scorers/
│
├── exports/
│
└── notebooks/

That looks much more like a software engineering platform than an AI tool.

This is the direction I'd continue exploring next: not "how do we build more AI," but how do we make research itself deterministic, measurable, version-controlled, and continuously improving? That's a capability that can support company research today and many other research domains later without requiring a different architecture.
~~~~

### Message 2 — Jonathan

~~~~text
Okay so write a detailed extremely long prompt on what to build next and include full architecture of all the future things that can and will be built after that for this
~~~~

### Message 3 — Assistant

~~~~text
This is actually where I'd split the work.

Don't ask an AI to "design Demigod."

Ask it to design one layer at a time with full awareness of future layers.

The prompt below is written as if you're hiring a principal engineer or distinguished architect from Google, Stripe, Palantir, or Snowflake to design the system from first principles.

DEMIGOD MASTER ARCHITECTURE PROMPT
Phase 1 — Company Research Workbench

You are one of the world's best software architects.

You have designed distributed systems, developer platforms, databases, search engines, knowledge systems, workflow engines, ETL infrastructure, AI systems, internal developer platforms, and enterprise software.

Your job is NOT to brainstorm.

Your job is to design software that could actually be built and maintained by a small team while leaving room for a much larger long-term vision.

Assume this system may eventually become a multi-billion-dollar company.

Assume the engineering team is extremely competent.

Assume code quality matters more than speed.

Assume correctness matters more than cleverness.

Assume we want an architecture that is understandable in five years.

Background

We are building an internal platform called Demigod.

Demigod is NOT a CRM.

Demigod is NOT an email platform.

Demigod is NOT a data provider.

Demigod is NOT a generic AI agent framework.

Demigod is a structured research platform.

The first product performs research on companies.

Users provide a company domain.

The platform returns:

canonical company

structured company record

product information

market information

qualification score

exact evidence

confidence

review state

export

Every semantic claim must have evidence.

Every field must be inspectable.

Every workflow must be reproducible.

Long-Term Vision

Do NOT optimize only for Version 1.

Instead build Version 1 so it naturally evolves into:

Company Research

↓

Customer Research

↓

Competitive Intelligence

↓

Investor Research

↓

Recruiting

↓

Due Diligence

↓

Portfolio Monitoring

↓

Market Intelligence

↓

Internal Knowledge

↓

General Enterprise Research Platform

Without rewriting the architecture.

Extremely Important

Do NOT build unnecessary complexity.

Avoid building:

graph databases

microservices

distributed systems

event sourcing

autonomous agents

vector databases

orchestration engines

unless they are actually justified.

Prefer boring architecture.

Prefer PostgreSQL.

Prefer ordinary APIs.

Prefer deterministic code.

Prefer explicit schemas.

Primary Goal

Design the entire architecture for Phase 1.

Do NOT write implementation code.

Instead produce an engineering design document.

Deliverables

I want an extremely detailed document.

At minimum include the following sections.

1.

High-level architecture.

Explain

why

each layer exists.

2.

System boundaries.

What belongs inside Demigod?

What belongs outside?

What should never be built?

3.

Data model.

Every table.

Every relationship.

Every important index.

Explain why.

4.

Entity model.

Company

Identifiers

Assertions

Evidence

Source documents

Recipes

Runs

Reviews

Exports

Everything.

5.

Request lifecycle.

Walk through

Research Company

from API request

to final export.

Every step.

6.

Provider architecture.

Design

provider SDK

adapter layer

cost tracking

retries

timeouts

idempotency

normalization

error handling

7.

Crawler architecture.

How pages are selected.

What gets crawled.

What gets ignored.

Caching.

Hashing.

Freshness.

Robots.

Limits.

8.

Extraction architecture.

Prompt design.

JSON schema.

Validation.

Evidence.

Unknowns.

Field bundles.

Retries.

9.

Evidence model.

Exactly how evidence works.

Storage.

Verification.

Confidence.

Source priority.

Inspection UI.

10.

Confidence system.

Design an explicit scoring model.

Avoid AI-generated confidence.

Design something explainable.

11.

Qualification engine.

Architecture only.

How scores work.

Versioning.

Feature flags.

Future ML support.

12.

Human review.

Exactly

when

should humans review?

Queue.

Priorities.

Conflict handling.

Correction.

Feedback.

13.

Research recipes.

This is extremely important.

Treat recipes as first-class software.

Design:

recipe schema

versioning

testing

rollback

validation

reuse

deployment

14.

Field registry.

Every field

must have metadata.

Design this.

15.

Source registry.

Every source

must have metadata.

Design this.

16.

Taxonomy system.

Controlled vocabulary.

Categories.

Tags.

Synonyms.

Migration.

Versioning.

17.

Evaluation framework.

How quality is measured.

Benchmarks.

Gold data.

Regression testing.

Coverage.

Accuracy.

Cost.

Latency.

Human correction rates.

18.

Benchmark framework.

How new recipes are evaluated.

Automatic testing.

Holdout datasets.

Canary deployments.

Shadow mode.

19.

Cost architecture.

Provider costs.

LLM costs.

Crawler costs.

Storage.

Caching.

Prediction.

Budgeting.

Preview.

20.

Caching strategy.

Everything that should be cached.

TTL.

Invalidation.

Reuse.

21.

Search.

What should be searchable?

How?

What should not?

22.

Security.

Secrets.

API keys.

Permissions.

PII.

Data retention.

Deletion.

Audit logs.

23.

Observability.

Logging.

Tracing.

Metrics.

Dashboards.

Error taxonomy.

24.

Failure taxonomy.

Categorize every possible failure.

Identity.

Provider.

Crawler.

Prompt.

Validation.

Evidence.

Export.

Timeout.

Everything.

25.

Testing strategy.

Unit.

Integration.

Golden tests.

Property tests.

Evaluation.

26.

Deployment.

Dev.

Staging.

Production.

Migration.

Rollbacks.

27.

Technology choices.

Explain

WHY

for every technology.

Do not simply list technologies.

28.

API design.

REST.

Batch APIs.

Internal APIs.

SDKs.

Webhooks.

Versioning.

29.

CLI.

Should one exist?

Why?

Design it.

30.

Internal developer experience.

How new providers get added.

How new recipes get added.

How new fields get added.

How engineers debug.

31.

Scalability roadmap.

Exactly

what changes

at

10 companies

100

1,000

10,000

100,000

1 million

100 million

Do NOT prematurely optimize.

Only evolve architecture

when justified.

32.

Technical debt roadmap.

What shortcuts are acceptable?

What must never become shortcuts?

33.

Future architecture.

After Phase 1 succeeds,

design

the future phases.

Explain

what gets added

without changing

earlier architecture.

Phase 2

Persistent company monitoring.

Signals.

Website changes.

Funding.

Hiring.

News.

Phase 3

Research across documents.

PDFs.

Decks.

Contracts.

Transcripts.

Phase 4

Customer research.

Phase 5

Investor research.

Phase 6

Competitive intelligence.

Phase 7

Recruiting.

Phase 8

Portfolio intelligence.

Phase 9

Enterprise knowledge platform.

Phase 10

External APIs.

Phase 11

Marketplace.

Only if justified.

Phase 12

Predictive models.

Only after sufficient data exists.

Phase 13

Workflow editor.

Only if actually necessary.

Phase 14

General research platform.

Throughout the document

Whenever recommending a technology,

compare alternatives.

Explain tradeoffs.

Use current best practices.

Use examples from:

Stripe

Snowflake

GitHub

Linear

Notion

Palantir

Datadog

Cloudflare

Clay

Common Room

Hebbia

AlphaSense

when useful.

Do NOT copy them.

Extract architectural principles.

Important Constraints

Never recommend something simply because it is fashionable.

Prefer mature technologies.

Prefer understandable code.

Prefer deterministic systems.

Avoid unnecessary AI.

Avoid unnecessary agents.

Avoid hype.

Output Requirements

Produce a document suitable for immediate implementation by senior engineers.

It should be detailed enough that an engineering team could begin building without asking major architectural questions.

Every recommendation must include:

rationale

tradeoffs

future implications

migration path

alternatives considered

The final document should be extremely detailed—on the order of an internal RFC or architecture specification rather than a blog post.

One improvement I'd make to this prompt

I'd actually split the work into three RFCs instead of one giant document:

RFC-001: Core Research Platform (everything above through Phase 1).

RFC-002: Evolution Roadmap (Phases 2–14 and migration paths).

RFC-003: Engineering Standards (coding standards, API conventions, recipe standards, testing philosophy, observability, security, deployment, and operational playbooks).

That's much closer to how companies like Stripe, Palantir, or Snowflake would document a system. Each RFC stays focused, is easier to review, and can evolve independently while still fitting into one coherent architecture.
~~~~

### Message 4 — Jonathan

~~~~text
How can I send this to codex on my laptop
~~~~

### Message 5 — Assistant

~~~~text
The easiest method is the Codex desktop app.

Option 1: Codex desktop app

On your laptop, install or open the new ChatGPT desktop app.

Sign in with the same ChatGPT account.

Select Codex.

Open or attach the folder containing the Demigod project.

Paste the long master prompt into a new Codex thread.

Add this instruction at the top:

Work inside the attached Demigod repository.

First inspect the entire repository and existing files. Do not overwrite or redesign working code unnecessarily.

Read the architecture prompt below as the long-term specification, but begin by implementing only the next practical milestone.

Before editing:
1. Summarize the current repository state.
2. Identify gaps between the repository and the specification.
3. Write a short implementation plan.
4. Then implement, test, and document the highest-priority incomplete vertical slice.

Do not merely return another architecture document unless the repository lacks one.

The desktop app is available on macOS and Windows, supports projects and separate coding threads, and lets you review Codex’s diffs before accepting them.
OpenAI

Option 2: Use Codex in Terminal

Open Terminal and install Codex.

Mac or Linux
Bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh

Or with Homebrew:

Bash
brew install --cask codex

Or npm:

Bash
npm install -g @openai/codex
Windows PowerShell
PowerShell
powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"

Then go into your Demigod project:

Bash
cd /path/to/demigod
codex

Select Sign in with ChatGPT when prompted. Codex CLI can use your ChatGPT plan without requiring you to paste an API key.
GitHub
+1

Best way to send a very long prompt

Do not paste the entire prompt into Terminal every time. Save it as a Markdown file inside the repository.

Create:

docs/DEMIGOD_MASTER_ARCHITECTURE.md

Paste the long prompt into that file.

Then create a second, shorter task file:

docs/NEXT_TASK.md

Put this inside:

# Demigod Next Task

Read these files first:

- docs/DEMIGOD_MASTER_ARCHITECTURE.md
- README.md
- package.json
- all existing source and test files

The master architecture document describes the full intended system. It is not permission to build everything immediately.

Your task is to:

1. Inspect the current repository.
2. Determine what has already been implemented.
3. Find the highest-priority incomplete vertical slice.
4. Prefer completing and testing existing work over adding new abstractions.
5. Implement that slice fully.
6. Add or improve tests.
7. Run type checking, tests, and relevant build commands.
8. Fix failures you cause.
9. Update the README and architecture decision records.
10. End with:
   - files changed
   - tests run
   - unresolved issues
   - recommended next task

Current likely priorities, subject to repository inspection:

- Complete real Firecrawl retrieval.
- Complete structured extraction.
- Verify exact evidence quotations.
- Run the five-company benchmark.
- Add benchmark result output.
- Add Crustdata comparison only after the first provider path works.

Do not build:

- email sending
- email sequencing
- personal contact enrichment
- a generic workflow editor
- autonomous multi-agent systems
- graph databases
- microservices
- speculative future systems

Make reasonable implementation decisions without stopping for minor clarification.

Then launch Codex from the project folder and say:

Read docs/NEXT_TASK.md and execute it. Treat docs/DEMIGOD_MASTER_ARCHITECTURE.md as long-term context. Inspect the repository before making changes.
Recommended folder setup
demigod/
├── AGENTS.md
├── README.md
├── docs/
│   ├── DEMIGOD_MASTER_ARCHITECTURE.md
│   ├── NEXT_TASK.md
│   ├── decisions/
│   │   ├── 0001-postgres.md
│   │   ├── 0002-firecrawl-retrieval-only.md
│   │   └── 0003-provider-benchmark.md
│   └── evaluation/
│       ├── field-contract.md
│       └── grading-rubric.md
├── src/
├── tests/
└── package.json

AGENTS.md should contain permanent repository rules:

# Demigod Repository Instructions

## Product boundary

Demigod is an evidence-backed company research and qualification system.

Do not implement email sending, sequencing, mailbox management, personal-email lookup, phone enrichment, or campaign functionality.

## Engineering principles

- Prefer conventional architecture.
- Prefer PostgreSQL and ordinary relational modeling.
- Prefer deterministic code before model calls.
- Every semantic field must include evidence.
- Unsupported claims must become unknown or rejected.
- Never silently merge ambiguous companies.
- Every paid operation must be idempotent.
- Every workflow must expose cost and run metadata.
- Do not introduce new infrastructure without demonstrating that the existing stack is insufficient.

## Work procedure

Before modifying code:

1. Inspect relevant files.
2. Describe the existing behavior.
3. Identify the smallest coherent implementation.
4. Add or update tests.
5. Run tests and type checking.
6. Report failures honestly.

## Current stack

- TypeScript
- PostgreSQL
- Trigger.dev
- Firecrawl for retrieval
- Demigod-owned structured extraction and evidence validation

## Definition of done

A change is complete only when:

- code is implemented
- tests exist
- tests pass, or failures are clearly documented
- documentation is updated
- no unsupported factual output is silently accepted

This is better than sending Codex one giant prompt alone. The master prompt supplies architectural context, AGENTS.md supplies permanent rules, and NEXT_TASK.md tells it what to implement now. Codex can then inspect and edit the repository locally rather than answering with another theoretical plan.
~~~~

## Discussion record

### Verdicts

| Reviewer | Verdict |
|---|---|
| **Codex** | Do not build a separate DIE platform. Demigod already has a fixed, inspectable “recipe”: structured intake → deterministic fit reasons → proposed pair → human review → mutual consent → outcome. Test a manual, source-cited company/role context card on a real brief before writing new code. |
| **Claude** | No build. Most useful ideas already exist under plainer names and stricter honesty rules; the proposed DSL, Postgres/Trigger.dev/Firecrawl stack, replacement `AGENTS.md`, and 33-section RFC describe a different company. Reopen the discussion only after real pilots expose repeated research-caused failures. |
| **Grok** | Kill the generic research platform; keep only match-adjacent evidence hygiene. A private pilot company/role brief may be valuable if it measurably shortens time to mutual yes, but it must compose existing map, role-ledger, and match evidence rather than create registries or a new product. |

### What already exists

| Imported idea | Current Demigod equivalent | Decision |
|---|---|---|
| Research recipe | Intake readiness, fixed deterministic matching flow, pair review, mutual consent | Keep it as ordinary code; there is no second real recipe requiring an abstraction. |
| Evidence and confidence | `matchEvidence()`, deterministic score, pair reasons/review notes/consent evidence | Reuse as advisory fit reasons. Do not present heuristic scores as factual confidence. |
| Field registry | Explicit required startup and candidate fields in `demigod-submissions-lib.mjs` | Keep the literals until definitions actually diverge across real workflows. |
| Source registry | Startup-atlas provenance plus ATS provider/board/job IDs, URLs, native dates, and first/last observations | Reuse existing fields; no registry until competing sources need cost/reliability selection. |
| Freshness and fingerprints | Role ledger monotonic observations, sealed truth/evidence receipts, stale-green refusal | Reuse these invariants. Add content hashing only when repeat fetch cost or stale extraction becomes real. |
| Evaluation and benchmark system | Deterministic selftests, poison checks, review gates, tool dogfood usefulness/failure/latency records | Reuse the discipline, not the infrastructure. Current sample fixtures are not gold outcome data. |
| Research notebook / quality ledger | Pair histories, role observations, `/tmp/dg-busy` receipts, tool dogfood | Do not rename these into a platform. Model-call ledgers are unnecessary while the core path is deterministic. |
| Controlled taxonomy | Existing stage/vertical/role vocabularies | Keep small vocabularies in code; centralize only after proven drift. |

### Conflicts with current truth

1. The imported prompt makes company research the product and recruiting a later phase. Canonical Demigod is SF startup/talent matching, with First Pilot Delivery as the operating mode.
2. The suggested replacement `AGENTS.md` declares a different product and stack. It must not be copied into canonical instructions.
3. PostgreSQL, Trigger.dev, Firecrawl, a DSL, registries, gold datasets, notebooks, and a 14-phase platform add infrastructure before a real outcome dataset exists.
4. Matching decisions remain human. The existing `decideMatch()` helper currently returns `state: "matched"` from a deterministic threshold despite its “human confirm” comment (`demigod-matching-engine.mjs`); any future intelligence work must treat that output as advisory eligibility, never authority.
5. Research-platform metrics cannot be validated while completed real matches remain at zero. Recipe accuracy is not a useful substitute for mutual yes, interview, hire, and 90-day outcomes.

### Smallest credible experiment

No new DIE code is justified now. When the first real accepted role brief has a reviewed slate of two or three candidates:

1. Run the existing matcher in rank-only mode and preserve its score and fit reasons.
2. Manually add at most five role-relevant company claims from the founder brief, official company site, or ATS.
3. Record each as `claim · exact quote · URL · retrievedAt · supports / contradicts / unknown`.
4. Use the existing match-quality checklist and pair review note to record whether the extra context changed approve/defer/reject, exposed a missing question, or saved a clarification.
5. Treat sample rehearsals as format checks only; they do not count as product evidence.

If this manual card repeatedly helps real reviews, the smallest later implementation is a private company/role brief assembler over the existing startup map and role ledger. It needs no DSL, database, crawler platform, model call, public surface, or automated intro.

### Evidence gates

The reviewers used different numeric thresholds, but agreed on the sequence:

- **Before any helper:** one real accepted brief must consume the manual evidence card and produce an observed decision or time-saving result.
- **Before a reusable recipe abstraction:** at least two distinct real workflows must repeatedly need the same source/evidence/versioning machinery, with documented research-caused failures or corrections.
- **Before broader DIE architecture:** real pilot/outcome volume must exist, research must be a material share of operator time, and someone must pay for research output itself rather than for a placement.
- **Immediate kill conditions:** the work displaces First Pilot Delivery, creates a second canonical product definition, introduces registries/DSL/UI before repeated use, publishes unverified company claims, or automates match/intro authority.

### Final synthesis

The Clay-inspired conversation is useful as a discipline memo, not a build specification. Keep:

- evidence required for semantic claims;
- unsupported claims becoming unknown;
- explicit source identity and freshness;
- categorized failures instead of a generic failure flag;
- deterministic, inspectable decisions;
- outcome-linked learning.

Reject for the current stage:

- “Research Recipe” as Demigod’s core primitive;
- a custom DSL;
- a new database/provider/crawler stack;
- gold datasets and evaluation dashboards without real outcomes;
- a public company-research product;
- speculative multi-phase platform architecture.

**Decision:** preserve this exchange as exploration. Build nothing from it now. Demigod’s defensible intelligence is the outcome-labeled, human-reviewed matching loop; a source-cited brief card is the only candidate extension, and only when a real brief can test it.

## Existing-system integration — 2026-07-28

The user clarified that the source-cited context should reuse what Demigod has already built. The narrow candidate extension is now integrated as a **read-only match-review projection**, not a DIE subsystem:

- `demigod-match-review.mjs` resolves each non-sample role against the existing startup map by an exact, unique normalized company name.
- A matched record exposes public company facts, source URL/license/retrieval time, current job-board snapshot, and exact ATS role observations from `DEMIGOD-ROLE-LEDGER.json`.
- Missing identity returns `unknown`; duplicate normalized names return `ambiguous` with candidates. There is no fuzzy merge.
- The projection never changes match score, reasons, pair state, review state, consent, or the pair ledger.
- Sample pairs receive no company evidence. The present board/inbox/pair state is sample-only, so this is ready for the first real accepted brief without manufacturing a result.

The existing MAT-01 checklist now requires reviewers to inspect this private `companyEvidence`. A focused fixture proves unique-name resolution, duplicate-name refusal, provenance preservation, hiring evidence, and role-observation age.

## Current execution status — 2026-07-28

The user directed the agents to continue and integrate the work. This section is the current
direction; earlier recommendations above remain only as the record of the initial debate.

The 30-company falsifiable benchmark has now run across all six source × ATS-presence cells.
Every non-unknown field includes an exact quotation and URL, and the live verifier found
all 142 quotations in current source responses.

| Field | Usable coverage | Evidence support | Integrated |
|---|---:|---:|---|
| Canonical company | 100% | 100% | yes |
| Product summary | 100% | 100% | yes |
| Product category | 100% | 100% | yes |
| Likely buyer | 96.7% | 100% | yes |
| Pricing status | 76.7% | 100% of claims | no |

Conflicts are counted as usable only when the corrected value has direct quoted evidence;
they remain visibly marked as conflicts. Unknowns are not counted as usable. Pricing missed
the 90% gate and is never filled by inference.

The accepted fields are attached to the existing private match-review evidence projection,
candidate rankings, dashboard, and funnel receipt. No match score, pair state, review,
consent, outbound message, or public website content is changed.

The benchmark data and executable verifier are
`DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json` and
`demigod-company-research-benchmark.mjs`. The sealed live receipt is at
`/tmp/dg-busy/evidence/latest-company-research-benchmark.json`.

Claude and Grok then adversarially reviewed the implementation. Their concrete findings
are closed: offline grading cannot create or overwrite a live green receipt; live green
requires exactly 142/142 source checks; Rad AI joins by its corrected name; Chime claims use
a first-party investor source; and the DataSF non-company row was removed.

The follow-through audit covered every current Lever, Greenhouse, and Ashby binding. It
removed 57 proven company/board collisions, 925 falsely attributed US/Remote roles, and
1,307 contaminated ledger rows. Future enrichment checks provider-reported owner websites
where available, while exact reviewed denies cover name-only and missing-owner collisions.
The repaired map now reconciles at 342 verified boards and 9,364 US/Remote roles.
