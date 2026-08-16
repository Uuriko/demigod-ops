# DIE roadmap

**Status:** active · aligned to `DEMIGOD-DIE-SPEC.md` v2.0 on 2026-08-15

**Purpose:** order the full Demigod Intelligence Engine by dependencies and risk, not by fear of
large features.

**Truth rule:** mutable counts, release hashes, and current gates come from receipts and
`bin/dg truth`, not this file.

---

## 0. Roadmap rule

A useful capability stays on the roadmap even when it is large. It is split into verifiable
increments and built after the prerequisites that make it safe and coherent.

The roadmap does not allow:

- invented live roles, candidates, pairs, outcomes, or product proof;
- public or external action without current-request authorization;
- person-data collection without a defined legal/consent basis;
- employment decisions by an unexplained model;
- architecture added only to imitate Clay.

These are safety and usefulness constraints, not excuses to keep the product small.

---

## 1. Baseline already present

### R0 — Evidence and hiring kernel — **built; preserve**

- startup map and public-source provenance;
- multi-provider ATS ownership and route validation;
- monotonic role ledger with fail-closed close/reopen behavior;
- observed versus employer-provided clocks;
- frozen 30-company benchmark, exact quotations, field acceptance policy, and live replay;
- operational company-research catalog and read-only projector;
- match, pair, consent, intro, and outcome authority boundaries;
- evidence receipts, poison checks, and stale-green refusal;
- private RecruitAI export/preview/import boundaries.

Exit remains continuous: the exact-source verification path must keep passing. A historical green
receipt is not current truth.

### R1 — One-company intelligence slices — **first supported path consolidated**

Present on disk:

- exact/domain identity resolution;
- company packet;
- private loopback company table;
- first-confident public-source waterfall;
- role-change journal and peers;
- cited private memo;
- review-only founder hiring ticket;
- dry-run packet writeback;
- opt-in review-only taste prior.

Consolidation receipt:

1. The intended source closure is tracked and import-integrity verified.
2. Focused identity, packet, waterfall, table, memo, writeback, and dispatcher checks are in
   `demigod-verify-all.mjs`.
3. The official path invokes module selftests directly; the table check still honestly requires a
   loopback-capable environment.
4. `CONTRACTS.md` and `OPERATIONS.md` define the packet/table/waterfall/memo/writeback boundaries.
5. `demigod-company-intelligence.mjs` supports `list`, `get`, `enrich`, `memo`, and writeback
   preview while refusing mutation flags.

Exit:

- one company can be resolved, packeted, enriched in dry-run, inspected in a table, rendered as a
  memo, and projected to a writeback plan under one versioned identity;
- unknown, duplicate identity, unsafe URL, quarantine, and no-source cases fail closed;
- no message, external write, publish, score, consent, or intro authority exists in this stage.

---

## 2. Role workspace and workbench foundation

### R2 — Role workspace first, universal private workbench second

**Private composition and dashboard view delivered 2026-08-15:**
`demigod-structured-hiring.mjs workspace --role=ID --json` now returns
`demigod.role-workspace/1` with accepted-role, calibration, company-packet,
candidate-channel, relationship, readiness, and authority projections. The existing private
dashboard now has a native role selector and renders that projection. Unified pool expansion remains.

**First pool projection delivered 2026-08-15:** inbound, owned-history rediscovery, reviewed,
shortlist, and prior-pair channels are separate; recent-contact and prior-decline suppression is
visible; referral claims and opt-out, stale-availability, profile-incomplete, location-preference,
and role-truth-change suppression now join that view. Contact fields and pair scores are not
projected.

Build:

- one role workspace joining accepted-role truth, founder calibration, company packet, candidate
  channels, capped shortlist, evidence notes, interview plan, relationship paths, calls, consent,
  intro, and outcome state;
- visible readiness checkpoints for missing acceptance, calibration, company identity, candidate
  evidence, review, and consent;
- role-specific candidate channels: inbound, owned-history rediscovery, prior pairs, referrals,
  recruiter-curated, and later licensed/public sources;
- typed table and packet views for companies, roles, candidates, pairs, signals, runs, and actions;
- search, sort, facets, saved views, bulk selection, and CSV/JSON import/export preview;
- evidence drawer, source-to-dependent-claims view, unknown/conflict/stale/error states;
- comments, corrections, quarantine, merge/split review, and approval objects;
- accessible keyboard operation and bounded private HTTP/API projection;
- run archive with input/output hashes and source identity.

Reuse first:

- `demigod-structured-hiring.mjs`, role packet, accepted-role receipt, candidate touches, pilot batch,
  intro paths, call notes, and match review;
- `demigod-company-table.mjs` and company packet;
- existing dashboard shell and private API patterns;
- existing evidence projector, receipts, and atomic file helpers.

Storage:

- keep files while one writer and bounded scans are safe;
- move operational entities/runs to SQLite or Postgres when transactions, concurrency, or query
  latency require it;
- do not delay the workbench waiting for the final storage engine.

Exit:

- one command or private view returns the complete context for one role without inventing a missing
  company, candidate, acceptance, consent, or action authority;
- an operator can find any entity, inspect lineage, compare a proposed change, and approve or reject
  it without opening source JSON;
- table cells never erase unknown/error/conflict distinctions;
- bulk selection cannot become accidental bulk execution.

---

## 3. Enrichment and research runtime

### R3 — Versioned functions, waterfalls, and research agents

Build:

1. **Field registry:** types, source policy, freshness, review policy, retention, and allowed use.
2. **Function registry:** versioned typed inputs/outputs, checks, cost class, and evidence policy.
3. **Waterfall runner:** first acceptable result, provider trace, early exit, retries, backoff, and
   no-clobber semantics.
4. **Per-row research agent:** bounded tools, cited claims, structured unknowns, prompt/model/tool
   versions, and injection isolation.
5. **Sample-first execution:** 5–10 row preview, projected cost, quality sample, and hard budget.
6. **Run engine:** idempotency, resume, archived runs, failure fingerprinting, and atomic commit.
7. **Provider ledger:** precision, coverage, freshness, rights, latency, and cost per useful fact by
   field/task.

Initial source order:

```text
existing accepted claim → first party → submitted/employer data → public registry
  → licensed provider that wins a bakeoff → bounded research agent → unknown
```

Exit:

- one function can run on one row, a selection, or a saved segment with identical semantics;
- every output has a trace and every spend has a budget;
- an empty/lower-trust provider cannot overwrite accepted evidence;
- a malicious page cannot grant tools, private context, write authority, or action authority;
- provider choice is backed by a field-specific receipt.

---

## 4. Persistent memory, signals, and audiences

### R4 — Change-aware entity memory

Build:

- append-only observation history and superseding claim history;
- material-diff extraction and evidence-span drift;
- company, role, hiring-mix, source, freshness, and correction signals;
- per-source cadence and material-change triggers;
- dynamic saved segments across companies, roles, candidates, pairs, and signals;
- natural-language query compiled to a visible deterministic filter;
- membership-entered/exited events with no implicit external action;
- watchlists for approved companies, roles, and consented people.

Carry forward the existing role journal instead of adding a second role-history truth.

Exit:

- repeated fetch failures never become business changes;
- a changed source identifies affected claims, packets, segments, and proposed actions;
- segment membership is reproducible from its versioned filter and input snapshot;
- every candidate/person signal has a recorded use basis and retention policy.

---

## 5. Talent intelligence

### R5 — Role-specific candidate discovery and review

Build:

1. consented candidate profile with submitted data, public work evidence, preferences, and
   provenance;
2. accepted role packet with founder-authored must-haves, 90-day outcome, constraints, and company
   context;
3. unified candidate pool across inbound, owned-history rediscovery, prior pairs, referrals,
   recruiter-curated, and permitted external sources while preserving channel provenance;
4. recent-contact, opt-out, prior-decline, duplicate, role-change, and stale-profile suppression;
5. deterministic hard filters followed by explicit evidence questions for each must-have;
6. transparent fit dimensions and missing/conflicted information;
7. review queue prioritization with reasons and no global fit verdict;
8. prior-candidate resurfacing and referral-overlap analysis where consented;
9. pair packet joining role, candidate, evidence, review, consent, intro, and outcome state;
10. correction, deletion, and appeal paths for person data and derived claims;
11. structured interview plan, question kit, consented evidence notes, disagreement, and debrief.

The first private W4 projection is now in the role workspace: hard-filter rules, per-must-have
questions, and answered/unknown/stale/conflict states sourced only from human review notes. Public
work-evidence retrieval and provider search remain gated on explicit source/use policy.

This stage does not wait to design the primitives until a real role exists. It may be built and
tested with fixtures now. Real product claims and employment decisions require real accepted roles,
real candidates, and the existing review/consent gates.

Exit:

- a real accepted brief can produce a cited review queue without protected traits, hidden model
  confidence, or automatic employment decisions;
- fixtures cannot contaminate real queues or receipts;
- review order changes are explainable and reversible;
- candidate data never enters public company outputs.

---

## 6. Integrations and controlled action

### R6 — ATS/CRM/API/MCP/writeback control plane

Build:

- inbound webhooks and scheduled imports;
- governed HTTP API connector with host allowlists and schema bounds;
- ATS/CRM/data-warehouse read and write adapters chosen by actual workflow need;
- CLI and private API for packets, functions, segments, runs, and action previews;
- MCP/agent functions with scoped read/write permissions;
- dry-run sidecars, exact diffs, approval center, idempotency keys, and rollback/reconciliation;
- connector rights, retention, cost, and credential-scope registry.

Exit:

- a replayed webhook or writeback cannot duplicate a durable change;
- every external mutation has a target, payload hash, reviewer, authority receipt, and result;
- read-only agent access cannot escalate to writes;
- connector failures are reconciled instead of silently reported as success.

### R7 — Draft sequences and approved distribution

Build:

- reviewed intro, follow-up, re-engagement, and briefing drafts;
- candidate preparation, scheduling, graceful decline, and close-loop state;
- sequence state, stop conditions, consent/opt-out suppression, and reply handoff;
- approved Slack/email/ATS/CRM destinations;
- consented audience export for a measured founder or talent acquisition channel;
- public-safe directory projections with explicit source and snapshot date.

Execution remains gated:

- no external send, publish, form submission, CRM/ATS write, ad activation, or spend without explicit
  authorization in the current user request;
- approval for one action does not authorize later sequence steps;
- a reply, opt-out, consent withdrawal, or changed target stops pending actions.

Exit:

- prepared and executed states are visibly distinct;
- negative/stop events suppress pending work immediately;
- every sent or published byte binds to its approved preview.

---

## 7. Learning, workflow authoring, and scale

### R8 — Outcome-linked learning

Build:

- evidence-shown, evidence-consulted, corrected, and decision-reason markers;
- links from claims/functions/actions to pair, intro, and outcome events;
- source and function usefulness by role/task cohort;
- correction-aware routing policy;
- experiments that preserve the initial human judgment when measuring automation bias;
- no causal claim beyond the observed design.

Exit:

- Demigod can identify which sources and functions helped or hurt real reviews;
- corrections improve future routing without rewriting historical runs;
- outcomes never become a license to infer protected traits.

### R9 — Natural-language workflow builder

Build after functions, permissions, budgets, and run history are stable:

- describe a workflow in natural language;
- generate a visible function/workflow draft;
- show inputs, outputs, sources, permissions, estimated cost, and side effects;
- generate tests and sample preview;
- require explicit publish and separate action authorization;
- version, pause, compare, and roll back.

Exit:

- the generated workflow is no more privileged than a hand-authored one;
- ambiguous instructions produce questions or a safe partial draft, not guessed authority;
- deployment is reproducible and reversible.

### R10 — Scale substrate

Add only the infrastructure required by measured use:

- transactional database and migrations;
- queue/workflow workers;
- materialized search and relationship indexes;
- horizontal provider scheduling;
- retention/deletion jobs;
- tenant/RBAC controls if more than the trusted local operator needs access;
- warehouse sync and high-volume segment refresh.

The useful capability is already specified. This stage changes its substrate, not its purpose.

---

## 8. Clay-to-DIE feature ledger

| Capability | Roadmap stage | Status/intent |
|---|---:|---|
| Tables and evidence cells | R1–R2 | Local company table exists; generalize |
| Per-row enrich | R1–R3 | Local packet/waterfall exists; govern |
| Waterfalls | R3 | Core |
| Claygent-like research | R3 | Core, cited and bounded |
| Signals | R4 | Role signals exist; expand |
| Audiences/segments | R4 | Build |
| Search across companies/people/jobs | R2/R4/R5 | Build |
| Functions | R3 | Build |
| Persistent account/entity agents | R4 | Build |
| API, HTTP, webhooks | R6 | Build as real connectors require |
| CRM/ATS writeback | R1/R6 | Dry-run sidecar exists; complete control plane |
| CLI/MCP | R2/R6 | Build bounded access |
| Sequencer | R7 | Build drafts and authorized execution |
| Ads audience sync | R7 | Conditional on consented measured channel |
| Natural-language builder | R9 | Build after primitives |
| Cost/credit visibility | R3 | Build real budgets, not token theater |
| Provider marketplace | — | Do not clone; add measured winners only |

## 8A. Adjacent-product mechanism ledger

Primary-source detail: [`research/2026-08-15-similar-product-scan.md`](research/2026-08-15-similar-product-scan.md).

| Mechanism | Examples observed | DIE stage |
|---|---|---:|
| Calibrated role workspace | SeekOut, Wellfound, Juicebox | R2 |
| Unified channel pool | Findem, Gem, Ashby | R2/R5 |
| Rediscovery and recent-contact suppression | SeekOut, Gem, Ashby, hireEZ | R5 |
| Evidence-backed summaries and scorecards | Ashby, BrightHire, Metaview | R5 |
| Structured interview plan and debrief | BrightHire, Metaview, Ashby | R5 |
| Relationship paths and owned history | Affinity, Gem | R4/R5 |
| Dynamic pools and signals | Clay, Common Room, Attio | R4 |
| Permission-aware agents/MCP | Ashby, Gem, Affinity | R6 |
| Candidate prep, scheduling, decline loop | Wellfound, BrightHire | R7 |
| Full-funnel analytics | Gem | R8 |
| Human service layer | SeekOut Spot, Wellfound, Paraform, Dover | all stages |

---

## 9. Cross-cutting acceptance gates

Every stage must preserve:

- exact identity or explicit abstention;
- claim-level evidence and source lineage;
- separate source, observation, validity, verification, and action clocks;
- unknown/conflict/stale/error distinctions;
- candidate privacy and public/private trust zones;
- no protected-trait inference or automatic employment decision;
- sample/fixture isolation;
- input bounds, safe URLs, prompt-injection isolation, and least privilege;
- dry-run before external mutation;
- current-request authority for send/publish/write/spend;
- one smallest runnable positive and fail-closed check;
- exact-source verification and a durable receipt.

---

## 10. Current execution pointer

The R1 → R2 vertical slice is now present: one supported company path plus a private role workspace
joining accepted-role truth, calibration, company context, candidate channels, suppression, and
evidence questions. The next engineering goal is the **R2 → R5 evidence corpus**: attach permitted
submitted/public work evidence to those questions while retaining source/use policy, unknowns,
corrections, and human-only decisions. Until a real role is accepted, delivery claims remain
fixture/demo-only.

Detailed execution: [`EXECUTION-PLAN-2026-08-15.md`](EXECUTION-PLAN-2026-08-15.md).
Hosted product plan: [`WEBAPP-PLAN.md`](WEBAPP-PLAN.md). It keeps the existing ops dashboard
loopback-only and defines a separate authenticated company/role application from read-only pilot
through bounded mutations and later team/tenant stages.

The dated [`PLAN-2026-08-14.md`](PLAN-2026-08-14.md) remains historical execution evidence; it does
not override this roadmap.

Current mutable truth:

```bash
bin/dg truth
node demigod-evidence.mjs fresh company-research-benchmark
node demigod-accepted-role.mjs --json
```
