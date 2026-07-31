# DIE roadmap

Executable, gate-driven plan for the
[Demigod Intelligence Engine](../../DEMIGOD-DIE-SPEC.md).
Research rationale is summarized in
[the DIE research synthesis](research/SYNTHESIS.md); the roadmap remains authoritative for
implementation order.

The roadmap is deliberately short. A later phase does not begin merely because the earlier
one has code; its product gate must also be true.

Completed-phase bullets describe their delivery receipts, not perpetual green status. Read
the mutable current receipt with `node demigod-evidence.mjs fresh company-research-benchmark`.

## Phase 0 — falsifiable evidence slice

**Status:** complete

Delivered:

- corrected role taxonomy;
- deterministic 30-company stratification;
- five-field gold data;
- exact quoted evidence;
- live replay with non-vacuous receipt;
- four accepted fields;
- pricing withheld;
- private match/review/funnel/dashboard projection;
- ATS ownership repairs;
- contaminated role-ledger cleanup;
- Claude/Grok adversarial fixes;
- green source and full gates.

Exit evidence:

```text
benchmark selection matches
142/142 source claims pass
four accepted fields
pricing not projected
full verification green
```

## Phase 1 — operational catalog

**Status:** complete

Problem:

```text
before Phase 1, the benchmark row-count invariant blocked company 31
```

Build:

- add `DEMIGOD-COMPANY-RESEARCH.json`;
- add `projectCompanyResearch`;
- derive accepted fields only from frozen gold;
- prefer one valid operational row;
- fall back to one benchmark row;
- expose source;
- fail closed on duplicates and malformed claims;
- preserve quarantine behavior;
- keep old benchmark wrapper;
- extend the existing focused test.

Do not build:

- automatic research collection;
- new source module;
- database;
- dashboard redesign;
- public output.

Exit:

- one-row operational catalog projects a non-gold company;
- benchmark stays exactly 30;
- operational catalog length does not affect evaluation;
- benchmark fallback works;
- invalid runtime row does not project;
- score/state/consent unaffected;
- focused, source, live, and full gates pass.

Delivered:

- empty operational catalog; `companies: []` is valid and expected until a real role creates
  a reviewed need for an operational row;
- shared runtime projector;
- exact catalog-over-benchmark precedence;
- explicit `catalog`/`benchmark` source;
- duplicate and malformed-claim refusal;
- benchmark fallback;
- runtime hiring quarantine;
- shared grading module included in the live receipt hash scope;
- 142/142 live replay;
- green full verification matrix.

## Phase 2 — real role context

**Gate:** one real accepted startup role exists.

Build only what that review needs:

- exact company identity;
- company semantic claims;
- public hiring snapshot;
- exact title observations;
- missing/ambiguous/conflict flags;
- source span and retrieval date;
- source publication/update or claim-valid dates only when the source supports them;
- company context during candidate tenure only when historically sourced, limited to public
  employer-state facts and never candidate PII, traits, or current-stage back-projection;
- evidence-first presentation without an authoritative AI verdict.

Reuse the existing match-review card. Create another UI only if the card cannot present the
needed context clearly.

Exit:

- a real review records whether the context changed a decision, exposed a missing question,
  prevented an error, or saved clarification;
- no automated match authority.

## Phase 3 — outcome learning

**Gate:** repeated real reviewed pairs and at least one observed downstream outcome.

Build:

- evidence-shown and evidence-consulted markers;
- research correction reason;
- decision-changed reason;
- initial human judgment only if a later recommendation experiment needs an
  automation-bias comparison;
- link to existing pair/outcome record.

Do not build:

- model confidence calibration;
- automatic retraining;
- vector store.

Exit:

- evidence can be connected to real review and outcome facts without invented causality.

## Phase 4 — targeted source bakeoff

**Gate:** real reviews repeatedly need a match-relevant field that first-party sources leave
unknown.

Build:

- a small comparison for that one field;
- exact-identity precision and abstention;
- coverage, evidence support, freshness, and conflict behavior;
- contract, retention, export, and redistribution constraints;
- cost per useful reviewed fact;
- explicit buy/no-buy decision.

Do not run a generic provider bakeoff.

## Phase 5 — bounded collection automation

**Gate:** reviewed operational catalog work is a measured recurring bottleneck.

Build:

- one-company source candidate collector;
- safe URL and bounded fetch;
- read-only public-data tools with step, time, and cost limits;
- typed evidence packet for review;
- prompt-injection and malformed-source regression cases;
- no automatic canonical write.

Only after packet quality is repeatedly acceptable may a reviewed writer be considered.

The collector must not share a runtime context with private candidate notes, outbound
communication, publishing, or match-state mutation.

## Permanent non-goals

- public company-research product;
- Clay clone;
- recipe DSL;
- graph database or generic graph platform;
- planner/verifier swarm;
- brokered, inferred, or login-gated person enrichment;
- inferred pricing;
- global model-confidence or fit score;
- automatic match, consent, or intro;
- a second product definition.

## Current work receipt

Mutable run IDs and release facts are intentionally absent. Read:

```bash
node demigod-evidence.mjs fresh company-research-benchmark
bin/dg truth
```
