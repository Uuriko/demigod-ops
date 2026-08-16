# DIE Role Mission implementation plan — 2026-08-15

**Status:** active execution plan · M1 first vertical slice delivered and verified 2026-08-15

**Objective:** deliver the ambitious DIE product described in
[`research/2026-08-15-ambitious-product-synthesis.md`](research/2026-08-15-ambitious-product-synthesis.md)
as one dependency-ordered Role Mission system, reusing the current Demigod truth kernel and never
granting evidence employment-decision, consent, introduction, send, publish, or spend authority.

**Product-value gate:** fixtures may prove mechanics and trust boundaries. Only one real accepted
role moving through reviewed evidence → mutual yes → introduction → observed outcome can prove the
product useful.

## 1. Delivery doctrine

1. Extend the existing role workspace; do not create a second role, company, candidate, pair, or
   outcome truth.
2. Build vertical mission outcomes before generic horizontal platforms.
3. Keep public company research, private operations, candidate context, relationships,
   conversations, actions, and evaluation as separate authority planes.
4. Derive views from existing records before adding storage.
5. Every stored change is versioned, bounded, validated, and correction/deletion aware.
6. Every external effect remains preview → current-request authorization → execution →
   reconciliation.
7. Each work package has a positive check and a fail-closed check.
8. Add infrastructure only when a measured failure requires it.

## 2. Target product loop

```text
accepted role
  → Role Mission and common operating picture
  → calibrated requirements and explicit uncertainties
  → company/time-aware evidence matrix
  → permitted candidate pool and evidence questions
  → decision rehearsal and structured conversations
  → mutual diligence and independently scoped consent
  → relationship route and exact introduction preview
  → approved coordination and offer scenarios
  → observed outcome, retrospective, and prospective learning
```

## 3. Existing substrate to reuse

| Need | Existing source |
|---|---|
| accepted role and role-truth hash | `demigod-accepted-role.mjs` |
| calibrated role, criteria, interview plan, review notes | `demigod-role-packet.mjs` |
| company identity and evidence | `demigod-company-packet.mjs` and company research modules |
| role workspace composition | `demigod-structured-hiring.mjs` |
| candidate submissions and readiness | `demigod-submissions-lib.mjs` |
| capped shortlist | `demigod-pilot-batch.mjs` |
| owned-history rediscovery | `demigod-candidate-touch.mjs` |
| pair, consent, intro, outcome authority | existing pair libraries and receipts |
| relationship routes | `demigod-intro-path.mjs` |
| conversation evidence | `demigod-call-note.mjs` |
| atomic stores and locks | `demigod-agent-tools-lib.mjs` |
| verification closure | `demigod-verify-all.mjs` |

## 4. Shared contracts

### 4.1 `RoleMission`

The mission is a projection over current records, not a new canonical record in the first stage.

Required projection:

- stable role ID and current accepted role receipt;
- founder-authored outcome, must-haves, constraints, compensation, and interview plan;
- company packet and claim status;
- candidate channels with source and suppression preserved;
- evidence questions and responses;
- relationship and conversation context;
- case state, next safe action, and closure conditions;
- evidence bill of materials;
- decision trace;
- private and mutual-safe projections;
- current authority matrix.

### 4.2 Evidence bill of materials

Each component contains:

- stable local component ID;
- kind: receipt, packet, claim, human review, relationship, conversation, or derived projection;
- source identity and source time where present;
- state: supported, human-authored, unknown, conflict, stale, suppressed, or error;
- activity/function that produced the component;
- upstream dependencies;
- affected mission questions;
- trust zone and allowed projection.

No graph database is required. A deterministic array derived from the workspace is sufficient until
measured traversal or query needs prove otherwise.

### 4.3 Decision rehearsal

A review note may optionally record:

- independent initial view;
- strongest contrary evidence or alternative interpretation;
- observation that would change the view;
- final rationale;
- IDs of evidence actually consulted.

These fields are human-authored, private, length-bounded, and never combined into a score. A missing
rehearsal remains visibly incomplete; it does not invalidate an otherwise valid historical note.

### 4.4 Mission scenario

A scenario is an immutable derived comparison:

- base mission/role ID and base role-truth identity;
- explicit proposed changes limited to known role fields;
- affected requirements, questions, filters, interview-plan rows, and evidence responses;
- unchanged state listed separately;
- `committable: false` and no action authority.

The first version accepts a small explicit change object. It does not forecast outcomes or mutate
the base mission.

### 4.5 Trust-zone projections

`private` may contain operator reviews, candidate IDs, suppression, relationship paths, and internal
case state.

`mutual` may contain only:

- role title, outcome, must-haves, constraints, compensation context, and interview plan;
- public-safe company identity/context;
- shared process status and unresolved mutual questions;
- explicit consent and introduction readiness states;
- no candidate list, reviewer identity, rating, private note, relationship path, suppression reason,
  or internal recommendation.

## 5. Work packages

### M0 — Preserve and expose authority

Deliver:

- keep the current role workspace authority block;
- expose a mission constitution projection using existing hard-coded rules;
- assert default-deny external action and separate consent/intro gates;
- document which future policy variation would justify a formal engine.

Exit:

- empty, fixture, incomplete, and real-shaped workspaces all grant no external action;
- mutual projection cannot expose private fields;
- no policy language or dependency added.

### M1 — Role Mission Decision Trace

Deliver:

- mission case/common operating picture;
- evidence bill of materials;
- optional decision-rehearsal fields on existing review notes;
- private and mutual-safe projections;
- immutable requirement-change scenario comparison;
- CLI `mission --role=ID` projection;
- selftest and official verifier coverage.

Exit:

- one fixture mission can be reconstructed from intent through consulted evidence and final human
  rationale;
- changing one requirement identifies affected questions and interview-plan rows without changing
  the base workspace;
- private note text and candidate IDs are absent from the mutual JSON projection;
- no global score or action authority appears anywhere.

### M2 — Company Time Machine and evidence assurance

Dependencies: M1 evidence manifest; current R1 company packet and role journal.

Deliver:

- per-claim observation, source-update, validity, and verification clocks where the source supports
  them;
- append-only claim supersession;
- material source-span diff;
- dependency impact from changed claims to mission questions and packets;
- source health, freshness, exception, and re-review state;
- exact historical review snapshot.

Exit:

- a source change marks only dependent mission artifacts stale;
- fetch failure never becomes a business change;
- current company state is never projected into historical candidate tenure.

### M3 — Candidate Data Link

Dependencies: authenticated hosted app, person-data source/use policy, deletion propagation.

Deliver in order:

1. static consent/correction prototype with synthetic data;
2. source registry defining fields, purpose, retention, rights, and refusal-safe alternative;
3. candidate-initiated link session with short-lived token;
4. preview of normalized data before acceptance;
5. human-readable and machine-readable receipt;
6. correction, expiry, withdrawal, deletion, and reconnect path;
7. one connector only after the prototype proves useful.

Exit:

- declining every optional link leaves a functional submission path;
- credentials never enter Demigod;
- withdrawal suppresses queued work and reaches derived state;
- no linked field becomes an automatic verdict.

### M4 — Hiring Case and Control Tower

Dependencies: M1 case state and at least two active or fixture missions.

Deliver:

- owner, objective, readiness, waiting-on, next safe action, and closure conditions;
- portfolio view preserving each mission's state;
- explicit waiting states: founder, evidence, candidate, reviewer, consent, external authorization;
- stale handoff detection without invented SLA promises;
- retrospective record for closed, changed, failed, or paused missions;
- optional notifications only after a real missed handoff demonstrates need.

Exit:

- every mission has one explainable attention state;
- no funnel total hides a blocked or consent-withdrawn mission;
- retrospective records observations and corrections without blame labels.

### M5 — Mutual Diligence Room

Dependencies: M1 mutual projection, hosted authentication, participant-scoped permissions.

Deliver:

- founder, candidate, and operator views from one mission with field allowlists;
- shared role/company/process/compensation context;
- participant questions and factual corrections;
- turn/owner for each open clarification;
- version and change history;
- independent consent controls;
- accessible responsive interface and export receipt.

Exit:

- private review notes never cross projections;
- both sides can inspect and correct shared context before consent;
- role-truth change invalidates stale consent and pending introduction previews.

### M6 — Relationship Hospitality and Router

Dependencies: consented relationship sources and M5 participant identity.

Deliver:

- volunteered communication, scheduling, accessibility, and future-contact preferences;
- prior commitments and service-recovery state;
- retention and expiry per preference;
- permitted route comparison by source, recency, appropriateness, and owner;
- exact intro packet; two independent consent gates;
- suppression for opt-out, withdrawal, role change, prior decline, and recent contact.

Exit:

- returning participants need not repeat useful volunteered context;
- no mailbox/contact scraping or inferred relationship strength;
- shortest graph path cannot override appropriateness or consent.

### M7 — Research Protocol Registry and expert network

Dependencies: M1 bill of materials, R3 function registry, repeated human research need.

Deliver:

- versioned protocol document: question, sources, steps, stop rule, output, review, cost, failures;
- run deviations and evidence acceptance;
- sample-first expert assignment with exact scope and budget;
- contributor evaluation by accepted evidence/corrections within cohort;
- marketplace/payment mechanics only with explicit money authority and demonstrated volume.

Exit:

- one protocol replays against the frozen benchmark;
- expert access is mission-scoped and grants no contact/action authority;
- quantity cannot substitute for evidence quality.

### M8 — Offer Scenario Studio

Dependencies: accepted compensation source policy and M5 mutual room.

Deliver:

- scenarios covering cash, equity, vesting, valuation/dilution assumptions, location, scope, and start;
- source and uncertainty for every benchmark;
- version comparison and proposal ownership;
- private deliberation separated from mutually shared terms;
- exact approved offer packet export; no signature or send without separate authority.

Exit:

- a reader can identify the assumptions driving every difference;
- the system never estimates reservation price or optimizes against a candidate;
- no scenario is presented as financial or legal advice.

### M9 — Coordination and controlled action

Dependencies: M5–M8 and R6 connector control plane.

Deliver:

- scheduling and preparation previews;
- action objects with target, payload hash, authority receipt, idempotency key, and expiry;
- stop-event propagation for reply, decline, withdrawal, target change, and closure;
- execution reconciliation and visible prepared/executed distinction;
- only the connectors demanded by a real workflow.

Exit:

- replay cannot duplicate a durable change;
- approval for one action grants nothing to the next step;
- a stop event suppresses all pending dependent actions.

### M10 — Mission Forecast Ledger

Dependencies: stable outcome events and enough resolvable operational questions.

Deliver:

- question, probability/range, forecast time, horizon, and exact resolution rule;
- forecasts limited to mission/process state;
- private shadow mode before any workflow use;
- proper scoring and calibration by comparable cohort;
- comparison of human, model, and combined forecasts without hidden anchoring.

Exit:

- every forecast resolves objectively or is voided explicitly;
- no forecast concerns candidate worth, performance, retention, or protected outcomes;
- policy changes only after prospective evidence.

### M11 — Learning and risk center

Dependencies: M1 consulted evidence, real review/outcome events, R8.

Deliver:

- evidence shown/consulted/corrected/decision-relevant markers;
- source and function utility by task/role cohort;
- review burden, clarification loops, stage duration, experience feedback, and incidents;
- govern/map/measure/manage profile per AI function;
- replayable eval corpus preserving initial human judgment;
- prospective experiments and rollback.

Exit:

- a regression case catches worse evidence or an authority leak;
- conclusions remain descriptive unless design supports causality;
- sparse outcomes do not create person-level prediction labels.

### M12 — Aggregate Talent Observatory

Dependencies: repeated valuable aggregate question, multiple trustworthy collaborators, privacy and
legal review, and proof that public/licensed non-person data is insufficient.

Deliver in research order:

1. question and decision-value register;
2. threat model including differencing, linkage, and repeated-query attacks;
3. minimum cohorts, query templates, output controls, budget, and audit;
4. synthetic-data prototype;
5. collaborator governance and deletion/exit terms;
6. evaluated clean-room or confidential-compute substrate;
7. production only after independent privacy/security review.

Exit:

- no raw person record is exchanged;
- outputs cannot reasonably single out a participant;
- privacy technology never substitutes for lawful purpose, consent, fairness, or minimization.

## 6. Dependency graph

```text
M0 authority ──────────────┐
M1 decision trace ─────────┼─→ M2 time machine
                           ├─→ M4 control tower
                           ├─→ M5 mutual room ─→ M6 relationships ─→ M9 coordination
                           │                 └─→ M8 offer studio ──┘
                           ├─→ M7 protocols/experts
                           └─→ M11 learning ─→ M10 forecasting

M3 candidate link ─────────────→ M5/M6/M11
M11 + repeated multi-firm need ─→ M12 aggregate observatory
```

## 7. Verification matrix

| Risk | Smallest fail-capable check |
|---|---|
| second source of truth | every new view derives from canonical IDs/stores; no duplicated entity store |
| scenario mutates live state | deep equality of base before/after scenario build |
| stale dependency remains green | changed requirement marks its question and plan row affected |
| evidence loses provenance | every supported response yields a manifest component with source/activity |
| review becomes verdict | recursive assertion rejects `fitScore`, recommendation, or automatic decision fields |
| private-to-mutual leak | forbidden-key and sentinel-string assertions over mutual JSON |
| consent broadening | purpose/scope/actor mismatch remains denied |
| external action escalation | all fixture/incomplete projections report `externalAction: none` |
| sample contamination | accepted real role projection refuses sample people/pairs |
| withdrawal ignored | dependent pending actions become suppressed before execution |
| retrospective rewrites history | original evidence/decision snapshot hash stays unchanged |
| privacy aggregate leak | repeated-query and small-cohort adversarial tests before any real data |

## 8. Current execution receipt

### Delivered before this plan

- R0/R1 truth and company evidence kernel;
- accepted role and role-truth receipts;
- role workspace with calibration, company context, channels, suppression, evidence questions,
  relationship context, checkpoints, and authority;
- structured review notes, interview kit, capped shortlist, rediscovery, and pair/consent boundaries.

### This execution slice

- M1 Role Mission Decision Trace is delivered as a pure projection;
- it reuses `demigod-role-packet.mjs` and `demigod-structured-hiring.mjs`;
- review notes support optional bounded decision rehearsal;
- `mission --role=ID` returns case, evidence bill, decision trace, private/mutual views, and
  constitution;
- `scenario --role=ID --changes=JSON` returns an immutable, non-committable impact comparison;
- mutual projection selftests exclude candidate IDs, ratings, reviewer identity, suppression, and
  private sentinel text;
- it adds no dependency, database, graph, agent framework, connector, or external side effect;
- `demigod-role-packet.mjs --selftest` and `demigod-structured-hiring.mjs --selftest` pass;
- both selftests are in `demigod-verify-all.mjs`;
- `npm run demigod:verify:all` completed with `failed: 0` on 2026-08-15.

### R2 → R5 evidence-corpus continuation — delivered locally 2026-08-16

- immutable role/candidate/criterion evidence assertions support submitted and permitted public-work
  source types;
- exact source spans, hashes, observation clocks, purpose, operational use basis, policy version,
  and retention are required;
- append-only supersession, historical snapshots, conflicts, criterion-specific staleness,
  withdrawal, and expiry are projected without a global score;
- inactive raw evidence is withheld and cross-scope correction/withdrawal fails closed;
- review-note ratings may cite bounded evidence IDs;
- the existing evidence questions and Role Mission bill of materials consume the projection;
- no connector, database, ranking engine, model judgment, or external action was added;
- research and shaping receipt:
  [`research/2026-08-16-planning-and-candidate-evidence.md`](research/2026-08-16-planning-and-candidate-evidence.md).
- `npm run demigod:verify:all` completed with `pass: true` and `failed: 0` on 2026-08-16.

## 9. Full-product definition of done

DIE reaches the ambitious target only when:

- an accepted role becomes one inspectable mission across intent, evidence, people, relationships,
  conversations, consent, coordination, offers, and outcome;
- founder, candidate, operator, expert, and agent see only their authorized projections;
- every material claim and action has lineage, time, purpose, and correction history;
- alternatives can be compared without mutating live state;
- decisions remain human, dissent remains visible, and unknown remains valid;
- candidate-controlled data can be refused, corrected, withdrawn, and deleted;
- every external effect is exact, authorized, idempotent, stoppable, and reconciled;
- real prospective evidence shows that the system improved at least one important mission outcome;
- the product can explain what it does not know and stop safely when authority or evidence is absent.
