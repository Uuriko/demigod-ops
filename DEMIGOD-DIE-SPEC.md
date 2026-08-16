# Demigod Intelligence Engine — full product specification

**Status:** active target specification

**Version:** 2.0 · 2026-08-15

**Product:** Demigod, SF startup ↔ talent matching

**Scope:** private intelligence, operations, matching support, and approved distribution inside Demigod

**Name boundary:** “DIE” is internal shorthand, not a second public product or a claim that software makes employment decisions.

---

## 0. Executive contract

Demigod Intelligence Engine (DIE) is the evidence and workflow layer that turns fragmented
company, role, candidate, relationship, and outcome data into one inspectable operating system
for making excellent human-reviewed matches.

Its job is to help answer, with evidence:

1. Which startups and roles are real, current, and relevant?
2. Which people may fit a specific role, and why?
3. What is known, conflicted, stale, or still unknown?
4. What should an operator inspect or clarify next?
5. Which approved action should be prepared, and what happened afterward?

The product outcome remains one real brief → reviewed match → mutual yes → introduction →
observed outcome. DIE may increase the quality and speed of that loop; it does not replace the
humans in it.

This specification is deliberately ambitious. A capability is excluded only when it is not
useful to Demigod, cannot be made lawful or trustworthy, or conflicts with a hard authority
boundary. Size alone is not a reason to omit a useful feature. Missing prerequisites determine
sequence, not membership in the target product.

### 0.1 Product equation

```text
useful DIE
  = trustworthy identity and evidence
  + company and hiring memory
  + role-specific talent intelligence
  + human review and collaboration
  + controlled actions and integrations
  + outcome-linked learning
```

### 0.2 Non-negotiable invariant

Research can propose, explain, rank for review, and prepare. It cannot silently fabricate facts,
make an employment decision, manufacture consent, send a message, publish, move money, or mutate
an external system without the authority required for that exact action.

---

## 1. Authority, canonicality, and truth

When sources disagree, use this order:

1. the current user request;
2. `AGENTS.md`, `DEMIGOD-SIMPLE.md`, and `DEMIGOD-AGENTS.md`;
3. live receipts and `bin/dg truth`;
4. executable contracts and tests;
5. this specification and `docs/die/ROADMAP.md`;
6. the narrower current-state contracts in `docs/die/CONTRACTS.md`;
7. historical research and dated plans.

This file owns the target product, capability boundaries, and durable invariants. It does not
own mutable release hashes, current counts, live queue state, or claims that a worktree feature
has shipped. Those belong to receipts and executable checks.

### 1.1 Canonical document set

| Document | Owns |
|---|---|
| `DEMIGOD-DIE-SPEC.md` | Full target product and architecture |
| `docs/die/ROADMAP.md` | Ordered implementation, dependencies, and acceptance gates |
| `docs/die/CONTRACTS.md` | Exact contracts implemented by the current evidence kernel |
| `docs/die/EVALUATION.md` | Gold data, grading, live replay, and poison controls |
| `docs/die/OPERATIONS.md` | Current safe operating and recovery procedures |
| `docs/die/CLAY-DIE-MULTI-AGENT.md` | Operational inventory and cross-agent state |

The contracts and operations documents describe what exists now. They expand as roadmap stages
land; they do not shrink this target specification.

---

## 2. Product boundaries

### 2.1 Included

DIE includes:

- company, role, candidate, relationship, and outcome identity;
- evidence-backed enrichment with source lineage and explicit unknowns;
- persistent company and hiring memory with change events;
- role-scoped candidate discovery, enrichment, search, and review support;
- dynamic segments and saved views across companies, roles, candidates, and pairs;
- reusable enrichment functions and governed workflows;
- operator tables, packets, memos, queues, and evidence panels;
- ATS, CRM, data-warehouse, API, webhook, CLI, and agent interfaces when useful;
- reviewed writeback, draft sequences, and approved outbound execution;
- budgets, dry runs, audit trails, retries, rollback, and outcome measurement.

### 2.2 Still one Demigod product

DIE is not a generic public research SaaS. Public directory and role surfaces may consume a
strictly public projection, but the workbench, candidate data, relationship state, research
memory, match review, and action controls remain private Demigod operations.

### 2.3 Excluded because they are not useful or cannot be trusted

- a marketplace whose purpose is accumulating integrations rather than serving a real workflow;
- a token or credit economy sold as product theater;
- unaudited “AI confidence” presented as truth;
- automated employment decisions or protected-trait inference;
- login-gated scraping, stolen credentials, leaked data, or evasion of access controls;
- guessed personal email or phone presented as verified;
- unapproved auto-DM, auto-email, auto-post, or auto-introduction;
- a public claim copied from private or consented data;
- architecture whose only justification is resemblance to Clay.

A graph store, workflow builder, provider router, scheduler, or database is not a permanent
non-goal. It is built when it is the simplest reliable substrate for a useful capability at the
observed scale.

---

## 3. Users and jobs

### 3.1 Operator

The operator needs to:

- search and segment the company/role/talent universe;
- inspect one complete company, role, candidate, or pair packet;
- see the exact evidence and history behind every important value;
- run or preview enrichment on one row, a selection, or a saved segment;
- review conflicts, unknowns, identity ambiguity, and proposed writes;
- prepare and, when currently authorized, execute an external action;
- see cost, failure, freshness, and outcome without reading raw files.

### 3.2 Founder or hiring lead

The founder-facing workflow captures the role, must-haves, 90-day outcome, constraints,
interview process, and consent. DIE may prefill public company and open-role context, but the
founder owns the actual need and corrects it.

### 3.3 Candidate

The candidate-facing workflow captures submitted experience, work evidence, constraints,
preferences, consent, and corrections. Public professional artifacts may supplement this only
with provenance and an appropriate legal/consent basis. Candidate data lives in a stricter trust
zone than public company data.

### 3.4 Reviewer or collaborator

A reviewer needs a bounded packet, cited facts, change history, comments, corrections, and a
clear approval object. Collaboration never grants action authority beyond the current request.

---

## 4. Core domain model

Every object has a stable ID, schema version, provenance, creation/update clocks, and an
append-only event or receipt trail for meaningful state changes.

| Object | Purpose | Canonical identity |
|---|---|---|
| `Company` | Operating organization | reviewed Demigod company ID plus canonical domain |
| `Role` | Employer-declared or founder-submitted need | provider/board/job ID or accepted brief ID |
| `Person` | Candidate or relationship subject | consented Demigod person ID; source IDs are aliases |
| `Pair` | Role ↔ candidate review unit | stable role ID + candidate ID |
| `Claim` | Atomic value with evidence and status | entity + field + claim ID |
| `Observation` | What a source returned at a time | source + external ID + observed time |
| `Signal` | Material change derived from observations | entity + type + event time + evidence |
| `Segment` | Saved deterministic filter over entities | versioned filter definition |
| `Function` | Reusable typed enrichment or transformation | versioned input/output contract |
| `Workflow` | Ordered functions, conditions, reviews, and actions | versioned definition |
| `Run` | One execution with cost, trace, and outputs | immutable run ID |
| `Approval` | Human decision over a proposal or action | subject + scope + reviewer + time |
| `Action` | Proposed or executed write/send/export | idempotency key + authority receipt |
| `Outcome` | Observed downstream event | pair/intro/hire-linked event ID |

### 4.1 Claim contract

A claim is the smallest unit that can be trusted, challenged, refreshed, or retired.

```json
{
  "id": "claim:company:yc:example:productCategory:…",
  "entity": { "type": "company", "id": "yc:example" },
  "field": "productCategory",
  "value": "developer tools",
  "status": "supported",
  "confidence": {
    "level": "high",
    "basis": ["exact_identity", "first_party", "direct_quote"]
  },
  "evidence": [{
    "url": "https://example.com/",
    "quote": "Tools for software teams",
    "span": { "start": 120, "end": 144 },
    "retrievedAt": "2026-08-15T00:00:00Z",
    "contentHash": "sha256:…"
  }],
  "source": { "provider": "first_party", "externalId": null },
  "method": { "function": "company-homepage/2", "model": null, "prompt": null },
  "validTime": { "from": null, "to": null },
  "observedAt": "2026-08-15T00:00:00Z",
  "runId": "run:…",
  "cost": { "usd": 0, "credits": 0 }
}
```

Allowed claim states:

| State | Meaning |
|---|---|
| `supported` | The cited source supports the value |
| `inferred` | A bounded derivation is shown and its premises are supported |
| `conflict` | Relevant sources disagree |
| `unknown` | No acceptable evidence exists |
| `stale` | Evidence exceeded its field-specific freshness budget |
| `error` | Collection or parsing failed; this is not an unknown fact |
| `retracted` | A reviewed claim was superseded or found invalid |

`unknown` includes a closed reason code such as `not_applicable`, `not_found`, `unresolved`,
`source_blocked`, or `identity_ambiguous`. It is never an empty successful cell.

### 4.2 Time model

Do not collapse:

- source event time (`postedAt`, `publishedAt`, `updatedAt`);
- Demigod observation time (`firstObservedAt`, `lastObservedAt`);
- claim validity time (`validFrom`, `validTo`);
- verification time (`lastVerifiedAt`);
- action time (`proposedAt`, `approvedAt`, `executedAt`).

Current company state must never be back-projected onto a candidate’s historical tenure.

---

## 5. System architecture

```text
public + consented sources
  → source adapters
  → raw immutable observations
  → identity resolution / abstention
  → typed claims + evidence spans
  → entity history + signal journal
  → search index / dynamic segments
  → company, role, candidate, and pair packets
  → human review / corrections / approvals
  → approved exports, writebacks, or messages
  → outcome events
  → evaluation and routing policy
```

### 5.1 Trust zones

| Zone | Data | Permitted consumers |
|---|---|---|
| Public research | Company sites, public ATS, public directories, public artifacts | Directory-safe projection and private workbench |
| Consented person | Submissions, resumes, portfolios, preferences, relationship notes | Private talent and pair workflows only |
| Private operations | Reviews, approvals, drafts, CRM state, outcomes | Authorized local/operator services only |
| Action boundary | External writes, sends, publishing, spend | Explicitly authorized executor only |

Raw public content never shares an execution context with private candidate notes or action
credentials. A privileged plane consumes validated typed objects, not webpage instructions.

### 5.2 Storage evolution

The current JSON and JSONL stores remain valid while they are safe. The target logical model is
storage-independent.

Move operational entities, history, runs, and concurrent work to SQLite or Postgres when any of
these becomes true:

- concurrent writers make file locking fragile;
- query latency blocks workbench search or segmentation;
- atomic multi-object transactions are required;
- event history or retention cannot be enforced reliably in files;
- an external service needs a stable supported API.

Relationship queries are a first-class product capability. They may be served from relational
tables and materialized views; a graph database is optional infrastructure, not the definition of
the feature.

---

## 6. Capability specification

### 6.1 Universal workbench and tables

The workbench provides table and packet views for companies, roles, candidates, pairs, signals,
runs, and actions.

Required behavior:

- typed columns with null/unknown/error distinction;
- sort, filter, facet, search, group, and saved views;
- bulk selection without accidental bulk execution;
- column lineage, fill rate, freshness, source, cost, and export status;
- evidence drawer from value → source span and source → dependent claims;
- per-row run history, diff, comments, corrections, and approvals;
- CSV/JSON import and export with schema preview;
- immutable archived runs and reproducible view definitions;
- accessible keyboard navigation and non-color-only states.

The one-company packet remains the canonical detail object. The table is an index and control
surface, not a competing source of truth.

### 6.2 Identity resolution

Resolution ladder:

1. exact reviewed internal ID;
2. canonical domain;
3. provider-native company or board ID with owner proof;
4. reviewed external registry ID;
5. explicit alias backed by a merge/split receipt;
6. candidate-pair review with per-feature evidence;
7. abstain.

Fuzzy similarity may generate review candidates but never silently merge companies or people.
Every merge and split is reversible and records the reviewer, evidence, and affected aliases.

### 6.3 Enrichment waterfall

For each requested field, DIE may run a versioned sequence of sources and transformations.

```text
existing verified claim
  → first-party source
  → employer ATS / submitted data
  → trusted public registry
  → licensed provider
  → bounded research agent
  → unknown
```

The waterfall:

- stops at the first result meeting the field’s acceptance policy;
- records every attempted provider, result, latency, cost, and failure class;
- never lets an empty or lower-trust result overwrite a verified value;
- supports `only run if`, input-change triggers, delay, retry, and per-host backoff;
- can run for one row, selected rows, or a segment;
- previews on a small sample with a hard budget before scale;
- supports provider comparison and shadow runs without canonical write;
- validates identity again at every provider boundary;
- retains raw responses subject to rights and retention policy.

Provider routing is field-specific and evidence-driven. “Provider A is best” is not a global
rule; its measured precision, coverage, freshness, rights, and cost for one field are.

### 6.4 Research agent

A per-entity research agent accepts a typed question and returns typed claims, evidence, unknowns,
and a complete trace.

Required controls:

- allowlisted tools and bounded public fetches;
- explicit input and output schema;
- source citation for every factual claim;
- prompt, model, tool, and function version in the run;
- maximum steps, time, bytes, redirects, and spend;
- prompt-injection isolation;
- sample/test mode with no write authority;
- diff against the previous accepted state;
- human approval before canonical write when policy requires it.

The agent may discover an unanticipated useful fact. It may not invent a new canonical field or
silently broaden its authority. Novel outputs land in a reviewable observation namespace until a
field contract is accepted.

### 6.5 Persistent entity memory and signals

DIE maintains history instead of overwriting cells.

For companies and roles, useful signals include:

- role opened, closed, reopened, or materially edited;
- hiring mix or location footprint changed;
- ATS provider or board ownership changed;
- funding, product, pricing, leadership, or company-status evidence changed;
- a previously supported quote disappeared or conflicted;
- a page changed materially while the supporting quote remained stable;
- a freshness budget expired;
- a reviewed correction superseded an earlier claim.

For candidates and relationships, signals require an appropriate consent/legal basis and may
include submitted availability changes, new work evidence, updated preferences, or public career
events. Protected traits, surveillance-style web intent, and covert contact tracking are excluded.

Every signal links to the observations and prior state that caused it. A source fetch failure is
not a business event.

### 6.6 Search, audiences, and saved segments

Operators can search across companies, roles, candidates, and their relationships in one query.
Natural language may compile to a visible deterministic filter; the filter is the executed
contract.

Examples:

- SF companies with three or more currently observed engineering roles and no confirmed agency;
- accepted roles needing platform experience with match-ready candidates who opted into SF;
- companies whose hiring mix changed in 30 days and whose packet has unresolved identity flags;
- prior candidates who consented to re-engagement and now match a newly accepted role.

Segments are versioned, previewable, and recomputed on new observations. Membership changes emit
events but never trigger an external action without its own approval policy.

### 6.7 Reusable functions and workflows

A function is a centrally versioned, typed enrichment sequence with declared inputs, outputs,
cost class, evidence policy, and tests. Updating it creates a new version; existing runs retain
their original version.

A workflow composes functions, deterministic conditions, review steps, and proposed actions.

Required behavior:

- edit in a sandbox while the current version remains live;
- sample on real-shaped fixtures or approved rows;
- publish, pause, roll back, and compare versions;
- idempotency tokens on durable steps;
- retry policy by failure class;
- resumable run history;
- no hidden dependency on column position or UI state;
- approval nodes are explicit data, not comments.

A natural-language builder is useful and belongs in the target. It produces a visible workflow
draft, test data, expected cost, and permission diff. It never deploys or executes merely because
the description parsed.

### 6.8 Talent intelligence

Talent intelligence is role-specific and evidence-first.

Inputs may include:

- candidate-submitted profile, resume, portfolio, and preferences;
- explicitly public professional work, talks, papers, patents, repositories, or writing;
- reviewed referrals and overlap receipts;
- licensed sources whose terms, accuracy, retention, and candidate rights are acceptable;
- public employer-state context during a candidate’s tenure, when historically sourced.

Capabilities:

- typed candidate profile with source-level provenance;
- role-specific criteria derived from founder-authored must-haves and 90-day outcomes;
- search beyond resume keywords using supported skills and work evidence;
- transparent fit dimensions and missing-information flags;
- candidate/role comparison with no single global fit score;
- reviewer feedback and corrections;
- resurfacing of consented prior candidates;
- dream-candidate or relationship watchlists with explicit opt-in and lawful signals;
- referral-overlap analysis when the source data was knowingly provided for that use.

The system may prioritize a review queue, but the human makes every employment-related decision.
No protected trait, proxy trait, personality inference, or unexplained “extraordinary” score is a
permitted criterion.

### 6.9 Company, role, candidate, and pair packets

Each packet combines only evidence appropriate to its trust zone.

**Company packet:** identity, public claims, hiring snapshot, role journal, peers, conflicts,
unknowns, and freshness.

**Role packet:** founder-authored outcome and must-haves, public posting evidence, constraints,
company context, and open questions.

**Candidate packet:** submitted facts, public work evidence, preferences, provenance, consent,
and corrections.

**Pair packet:** role criteria × candidate evidence, missing/conflicted information, review notes,
two-sided consent state, intro readiness, and outcome history.

Private share memos are generated from packets and retain citations. They are not public pages or
automatic messages.

### 6.10 Collaboration and review

The workbench supports:

- assign/claim without concurrent write ambiguity;
- comments on claims, entities, and runs;
- accept, correct, reject, quarantine, merge, split, or request evidence;
- compare current and proposed values;
- preserve the original observation after correction;
- per-field reviewer and reason;
- a queue for identity ambiguity, conflicts, stale claims, failed runs, and proposed actions;
- exportable decision receipts.

### 6.11 Integrations, API, CLI, and agent access

Useful source and destination classes include:

- public ATS providers and founder submissions;
- CRM/ATS systems of record;
- data warehouses and local files;
- HTTP APIs and inbound webhooks;
- approved messaging and scheduling systems;
- MCP/agent functions for bounded operator workflows;
- CSV/JSON/RSS and documented private HTTP endpoints.

Every connector declares:

- read/write scopes;
- credential owner and storage boundary;
- source and destination schema;
- rate, cost, and retention limits;
- dry-run behavior;
- idempotency and rollback behavior;
- whether its data may be exported, redistributed, or used for models;
- exact approval required for writes.

Generic GET/POST/PUT/DELETE support is useful only behind host allowlists, credential isolation,
schema validation, response bounds, and write approvals.

### 6.12 Writeback, sequences, and distribution

DIE may prepare:

- a CRM or ATS field update;
- a reviewed company or candidate sidecar;
- an introduction draft;
- a bounded follow-up sequence;
- a Slack/email brief;
- a consented audience export for an acquisition channel;
- a public directory update from public-safe facts.

Preparation and execution are separate objects. Each external action has a preview, exact target,
payload hash, approval scope, idempotency key, and execution receipt.

Actual send, publish, form submission, community change, ad activation, CRM/ATS mutation, or spend
requires explicit authorization in the current user request. Old approvals and scheduled intent do
not transfer.

### 6.13 Cost, observability, and operations

Each run records:

- rows attempted, completed, abstained, failed, and changed;
- provider/function versions;
- latency and retry history;
- credits, tokens, and currency cost;
- usable supported fields, not just filled fields;
- canonical writes proposed and accepted;
- action side effects;
- failure fingerprint and affected entities;
- input and output hashes.

Controls include:

- sample 5–10 rows before a large run;
- per-run, per-source, daily, and monthly budgets;
- circuit breaker on error, cost, or identity anomaly;
- volume-anomaly quarantine before mass closure or overwrite;
- per-host politeness and rate limits;
- resumable runs and atomic commits;
- append-only, hash-linked audit receipts for material transitions;
- release-tagged error rates and high-cardinality trace search.

---

## 7. Evidence, freshness, and evaluation

### 7.1 Field policy

Every canonical field declares:

- type and allowed values;
- acceptable source classes;
- evidence requirement;
- freshness budget;
- conflict precedence;
- unknown/error behavior;
- auto-accept threshold, if any;
- whether human review is mandatory;
- retention and export rules;
- permitted product uses.

### 7.2 Evaluation sets

Maintain separate evaluation subjects for:

- company identity and merge abstention;
- company semantic fields;
- ATS owner and role lifecycle;
- candidate evidence extraction;
- role-criteria extraction;
- pair explanation support;
- signal precision and change classification;
- provider routing and cost per useful fact;
- action dry-run/idempotency/rollback;
- prompt-injection and malicious-source resistance.

Gold sets remain frozen during a comparison. Operational catalogs and run outputs never become
gold merely because they exist.

### 7.3 Minimum quality gates

The current company benchmark retains its existing thresholds:

```text
usableCoverage >= 0.90
evidenceSupport >= 0.95
```

Other capabilities define task-appropriate gates before canonical write. Identity and action
boundaries require stricter precision than descriptive enrichment. A provider or model is accepted
per field and task, not globally.

### 7.4 Product metrics

Quality:

- exact-identity precision, false-merge rate, and abstention rate;
- supported, conflicted, stale, unknown, and error rates by field;
- quote/span replay and source availability;
- signal precision and false-event rate;
- correction and rollback rate;
- cost per useful reviewed fact;
- action idempotency and external error rate.

Usefulness:

- review time saved;
- missing question exposed;
- incorrect assumption prevented;
- decision clarified or changed with a recorded reason;
- consented candidate or startup re-engaged;
- mutual-yes and intro progression;
- outcome-linked corrections and source usefulness.

Counts of pages, agents, fields, providers, or populated cells are operational metrics, not proof
of product value.

---

## 8. Safety, privacy, and employment fairness

### 8.1 Data minimization

- Collect the minimum person data required for a defined recruiting workflow.
- Keep public company research separate from consented candidate and private relationship data.
- Record collection basis, intended use, retention, and deletion behavior.
- Honor opt-out, correction, access, and deletion requirements where applicable.
- Do not expose private data through public directories, model prompts, logs, or support artifacts.

### 8.2 Candidate protections

- no protected-trait or proxy-trait ranking;
- no health, family, race, religion, political, disability, or other sensitive inference;
- no covert personality or “culture fit” score;
- no decision from social popularity, follower count, school prestige, or athletic history unless a
  lawful, role-relevant criterion is explicitly justified and reviewed—and protected proxies still
  remain excluded;
- show the evidence and missing information behind review prioritization;
- preserve human accountability and correction paths.

### 8.3 Security

- safe URL and DNS checks at every fetch and redirect;
- credential-free evidence URLs;
- bounded content, time, steps, and redirects;
- output escaping and control-character stripping;
- private files `0600`, directories `0700`, and atomic writes where the current system requires;
- secrets outside prompts, receipts, source control, and exports;
- verify bytes before trusting parsed external artifacts;
- least-privilege connector scopes and separate read/write credentials;
- audit every external side effect.

---

## 9. Current implementation baseline

The repository already contains more than the previous roadmap described.

### 9.1 Established kernel

- SF startup map with provenance;
- public ATS validation across multiple provider families;
- monotonic role ledger with fail-closed closure semantics;
- observed, posted, updated, closed, and reopened role clocks;
- frozen company-research benchmark and accepted-field policy;
- operational research catalog and safe projector;
- match, pair, consent, intro, and outcome state boundaries;
- sealed evidence receipts, source replay, and poison tests;
- private RecruitAI export, preview, and reviewed import boundaries.

### 9.2 Clay-shaped local slices present on disk

- exact/domain company identity resolver;
- one-company packet joining map, ledger, signals, and research;
- loopback private company list/get table;
- public-source field waterfall with first-confident-result behavior;
- role-change journal;
- role-family peer set;
- private cited company memo;
- review-only founder hiring ticket with human-authored blanks;
- dry-run RecruitAI packet writeback sidecars;
- opt-in, review-only taste prior isolated from company research.

These local slices are implementation evidence, not a blanket ship claim. Their files are in a
dirty worktree, some are untracked, and verification must name the exact source identity tested.
No publication or external action is implied.

### 9.3 Material gaps

- no unified operator workbench across entity types;
- no durable general run/history store;
- no versioned function or workflow registry;
- no governed natural-language workflow builder;
- no full candidate intelligence plane;
- no dynamic cross-entity segments;
- no general per-field provider ledger and cost router;
- no production connector approval center;
- no outcome-linked learning loop across evidence and actions.

---

## 10. Clay capability translation

The target copies useful mechanisms, not Clay’s GTM positioning or indiscriminate data appetite.

| Clay capability | DIE translation | Decision |
|---|---|---|
| Tables | Universal entity workbench with evidence cells | Core |
| Per-row enrichment | Run a typed function on one company, role, candidate, or pair | Core |
| Waterfalls | Field-specific public/licensed/consented sources with early exit | Core |
| Claygent | Bounded research agent returning typed cited claims | Core |
| Signals | Company, hiring, candidate, relationship, and evidence change journal | Core |
| Audiences | Dynamic saved segments across the Demigod universe | Core |
| Search | Cross-company/person/job query compiled to inspectable filters | Core |
| Functions | Centrally versioned reusable enrichment workflows | Core |
| Account Research Agents | Persistent entity memory with scheduled/triggered refresh | Core |
| Sculptor | Natural-language workflow drafting with permission and cost preview | Target |
| HTTP API/webhooks | Governed source/action adapters | Core |
| CRM/data-warehouse sync | Reviewed ATS/CRM/local-store writeback | Core |
| MCP/CLI/API | Bounded agent/operator access to functions and packets | Core |
| Recipes/templates | Versioned approved workflow templates | Useful; no marketplace needed |
| Sequencer | Draft sequences and authorized sends with consent/opt-out controls | Useful, action-gated |
| Ads/audience sync | Consented founder/talent acquisition segment export | Conditional channel adapter |
| Credit dashboard | Real cost budgets and cost per useful fact | Core |
| 200+ provider marketplace | Add only providers that win a measured field/task bakeoff | Do not clone |
| People/contact enrichment | Lawful, consented, role-relevant talent data with strict retention | Adapt narrowly |
| Contact-level surveillance | No covert tracking or sensitive inference | Reject |

Official Clay references checked for this specification:

- [Account Research Agents](https://university.clay.com/docs/account-research-agents)
- [Audiences](https://university.clay.com/docs/audiences)
- [Functions](https://university.clay.com/docs/functions)
- [Search](https://university.clay.com/docs/search)
- [Waterfalls](https://university.clay.com/docs/building-a-data-waterfall)
- [Signals](https://university.clay.com/docs/signals)
- [HTTP API](https://university.clay.com/docs/http-api-integration-overview)
- [Clay’s recruiting workflow](https://www.clay.com/blog/how-clay-uses-clay-for-recruiting-top-talent)

---

## 11. Beyond-Clay differentiation

DIE should be better for Demigod’s workflow in ways a generic enrichment platform is not:

1. **Bitemporal hiring truth.** Employer dates and Demigod observation history remain distinct.
2. **Evidence is bidirectional.** A value opens its source span; a changed source identifies every
   dependent claim, packet, segment, and proposed action.
3. **Human corrections compound.** Reviewed merge/split, claim, criteria, and outcome corrections
   change future routing policy without rewriting history.
4. **Role-scoped intelligence.** Company research, role intent, candidate evidence, and mutual
   constraints meet in one pair packet instead of a generic account score.
5. **Unknowns create work.** Missing or conflicted evidence becomes an explicit review question,
   not silent blankness or a guessed value.
6. **Outcome lineage.** DIE can show which evidence was displayed, consulted, corrected, and later
   associated with mutual yes, intro, or outcome—without claiming causality it cannot prove.
7. **Shareable evidence memos.** Both sides can receive a reviewed, cited brief when authorized,
   rather than a black-box CRM field.
8. **Permissioned action.** Research, review, consent, approval, and execution are separate durable
   states.

---

## 12. Automation authority matrix

| Capability | May automate locally | Requires review | Requires current-request authorization |
|---|---:|---:|---:|
| Read public source | Yes, within safety/cost policy | For novel source/field acceptance | No |
| Parse and store observation | Yes | For canonical promotion when policy says so | No |
| Derive transparent signal | Yes | For new signal class | No |
| Rank a review queue | Yes, with reasons | Human employment decision | No |
| Merge identity | Candidate suggestion only | Yes | No |
| Change match/pair/consent state | No | Yes | As required by existing lifecycle |
| Prepare export/writeback/message | Yes | Yes | No external side effect yet |
| Execute CRM/ATS write | No | Yes | Yes |
| Send email/DM/post/form | No | Yes | Yes |
| Publish public data/site | No | Yes | Yes |
| Spend money/credits beyond approved budget | No | Yes | Yes |

---

## 13. Definition of done

### 13.1 A capability is done when

- its user job and trust zone are explicit;
- input, output, unknown, conflict, and error contracts are versioned;
- one smallest runnable positive check and one fail-closed check exist;
- source lineage and clocks survive projection;
- permissions and side effects are visible;
- a dry run previews cost and writes;
- retries are idempotent;
- accessibility basics apply to any UI;
- the current verification path passes for the exact source identity;
- docs and roadmap status match the receipt.

### 13.2 DIE is product-useful when

Real work records that the system did at least one of the following:

- found a credible company, role, or candidate the operator would have missed;
- exposed a missing question or source conflict;
- prevented an incorrect identity, hiring, or fit assumption;
- reduced research or clarification time;
- improved a reviewed introduction packet;
- supported a mutual yes or corrected a later outcome;
- made an approved action safer, faster, or more measurable.

### 13.3 Full target completion

The full target is complete when Demigod can ingest an approved brief, maintain relevant company
and talent intelligence, produce an evidence-backed review queue, support human selection and
two-sided consent, prepare and execute only authorized actions, and learn from observed outcomes
with complete lineage, budgets, privacy controls, and rollback.

---

## 14. Build sequence

The ordered implementation and current status live in [`docs/die/ROADMAP.md`](docs/die/ROADMAP.md).

The sequencing rule is:

```text
build the useful prerequisite before its dependent capability;
do not delete a useful target merely because the complete version is large;
do not use ambition to bypass evidence, privacy, fairness, or action authority.
```

---

## 15. Compact operating doctrine

```text
Use stable IDs for entities.
Use observations for what sources returned.
Use claims for what the evidence supports.
Use history for what changed.
Use segments for what deserves attention.
Use functions for reusable work.
Use workflows for ordered, inspectable execution.
Use humans for employment decisions, consent, and approvals.
Use current authority for every external action.
Use outcomes to improve the system without inventing causality.
```
