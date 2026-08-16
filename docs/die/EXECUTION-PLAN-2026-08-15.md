# DIE execution plan — 2026-08-15

**Status:** active

**Inputs:** `DEMIGOD-DIE-SPEC.md` v2.0, `docs/die/ROADMAP.md`, the 2026-08-15 similar-product scan,
and current local/source truth.

**Objective:** turn the existing Demigod intelligence and structured-hiring primitives into one
role-centered operating system, then deepen research, integrations, controlled action, and learning.

## 1. Execution doctrine

- Build the useful full product by dependency, not by shrinking the ambition.
- Reuse current modules and stores; do not build a second candidate, role, company, or pair truth.
- One role workspace is the vertical integration test for every later horizontal capability.
- Unknown, conflict, stale, quarantined, sample, and error remain distinct states.
- Prepare and verify locally by default. External writes, sends, publishing, and spend remain
  separate authorized actions.
- Every work package ends with one positive check and one fail-closed check at the narrowest shared
  boundary.

## 2. Target loop

```text
accepted role
  → calibrate outcome, must-haves, constraints, interview plan
  → attach company/hiring packet and market context
  → search permitted candidate channels
  → review cited evidence and unknowns
  → curate a capped active shortlist
  → run structured interviews and debrief
  → collect founder and candidate consent
  → prepare/authorize intro and follow-up
  → record outcome and learn which evidence/channels helped
```

## 3. Work packages

### W0 — Preserve the truth kernel

Scope:

- keep map, role ledger, research benchmark/catalog, accepted-role receipt, pair/consent gates,
  evidence receipts, and sample isolation green;
- promote the intended R1 company source set into source control when authorized;
- keep live/release truth out of planning docs.

Checks:

- `npm run demigod:verify:source`;
- focused poison, identity, ledger, role-acceptance, pair, and consent checks;
- `bin/dg truth` for current operational truth, never as a substitute for product checks.

Exit: the official source verifier sees every imported R1 module and no fixture can pass as real.

### W1 — Consolidate one-company intelligence — **first supported path delivered**

Scope:

- support one path for company list, packet, dry-run waterfall, memo, and writeback preview;
- document packet/table/waterfall/writeback schemas and authority;
- add focused checks to the official verification path;
- surface nested-process and loopback-bind failures honestly in constrained environments.

Primary files:

- `demigod-company-identity.mjs`;
- `demigod-company-packet.mjs`;
- `demigod-company-table.mjs`;
- `demigod-company-waterfall.mjs`;
- `demigod-company-memo.mjs`;
- `demigod-packet-writeback.mjs`;
- `docs/die/CONTRACTS.md` and `docs/die/OPERATIONS.md`.

Exit: exact ID/domain resolution leads to one traceable packet; unknown/duplicate/quarantine/unsafe
cases abstain; no external mutation exists.

Current receipt: `demigod-company-intelligence.mjs` now delegates `list`, `get`, dry-run `enrich`,
private `memo`, and writeback preview to the existing modules. Mutation flags fail before dispatch;
focused module checks are wired into `demigod-verify-all.mjs`; contracts and operations document the
shared authority boundary.

### W2 — Deliver the role workspace — **first private composition delivered**

Scope:

- compose accepted-role receipt, role packet, company packet, candidate channels, shortlist,
  evidence notes, debrief, relationship paths, and call notes;
- expose readiness checkpoints instead of hiding missing prerequisites;
- keep review authority separate from consent, intro, and employment decision authority;
- provide private JSON/CLI first, then the dashboard view.

Primary files:

- `demigod-structured-hiring.mjs`;
- `demigod-role-packet.mjs`;
- `demigod-accepted-role.mjs`;
- `demigod-candidate-touch.mjs`;
- `demigod-pilot-batch.mjs`;
- `demigod-match-review.mjs`;
- existing dashboard role surface.

Current slice:

1. Add a pure `demigod.role-workspace/1` composition to the existing structured-hiring desk.
2. Attach accepted-role truth and the exact company packet when available.
3. Show calibration, channel counts, and readiness checkpoints.
4. Add fixture checks for missing packet, accepted/unaccepted role, known/unknown company, and no
   score/action authority.

Exit: one command returns the complete private context for one role without inventing any missing
entity or granting action authority.

### W3 — Unified candidate pool and rediscovery — **private projection in progress**

Scope:

- make permitted channels explicit: inbound submissions, owned-history rediscovery, referrals,
  prior pairs, recruiter-curated, and later licensed/public search;
- preserve channel membership and provenance rather than flattening profiles;
- add recent-contact, opt-out, prior-decline, duplicate, role-truth-change, and stale-profile
  suppression;
- refresh only fields whose rights and freshness policy allow it;
- add candidate correction/deletion workflow.

Data shape:

```text
candidate identity
  submitted claims + evidence + use basis + retention
channel memberships[]
touch history[]
role-specific evidence[]
suppression[]
corrections[]
```

Exit: a role workspace can show candidates from all permitted channels, with source and suppression
visible, without a global fit score.

### W4 — Evidence-backed search and review — **first private criteria projection delivered**

Scope:

- deterministic filters for hard constraints;
- explicit evidence questions tied to each founder-authored must-have;
- cited answer, unknown, conflict, and stale states;
- review-order reasons and reversible human corrections;
- sample-first evaluation set for retrieval precision and false-positive review burden.

Implementation order:

1. role packet compiles to filters plus evidence questions;
2. existing submissions and touches are the first corpus;
3. public work evidence is added only with a defined source/use policy;
4. licensed providers enter via a field/task bakeoff;
5. model summaries run only over retrieved evidence and cite spans.

Exit: every review claim traces to a permitted source; changing a criterion reproduces a changed
queue; protected traits are absent from ranking inputs.

Current receipt: the role workspace now compiles hard-filter policy and one explicit question per
founder-authored must-have. Existing human review notes answer those questions with bounded cited
evidence; missing, stale, and conflicting evidence remain visible states. No global fit score or
automatic employment decision is produced.

### W5 — Structured interview intelligence

Scope:

- preserve criteria-to-interview-moment assignment;
- role-specific question kits and descriptive anchors;
- consented call/interview notes, optional transcription adapter, and evidence spans;
- cross-round debrief, disagreement, missing-question, and changed-by-context views;
- interviewer calibration and process consistency measures.

Exit: summaries are editable and cited; no transcript or summary changes pair/consent/outcome state;
retention and deletion are enforced.

### W6 — Persistent memory, signals, and dynamic pools

Scope:

- append observations and superseding claims instead of overwriting history;
- compute material company, role, candidate, relationship, and freshness changes;
- compile natural language to a visible deterministic filter;
- store segment versions, membership snapshots, entered/exited events, and dependent actions;
- propose refresh or review when evidence changes.

Exit: the same filter and snapshot reproduce membership; fetch failure never becomes a business
change; signals propose but do not execute actions.

### W7 — Versioned functions and run engine

Scope:

- typed function registry with source, cost, freshness, rights, and review policy;
- first-acceptable-result waterfall and no-clobber rules;
- bounded research functions with prompt/model/tool versions and injection isolation;
- 5–10 row sample, projected cost, hard budget, idempotency, resume, run archive, and atomic commit;
- provider ledger by field/task: precision, coverage, freshness, rights, latency, and cost/useful fact.

Exit: one function has identical semantics on one entity, a selection, or a dynamic pool; every
output and dollar has a trace.

### W8 — Integration and permission control plane

Scope:

- inbound ATS/CRM webhooks and scheduled imports;
- read adapters before write adapters;
- scoped API and MCP tools around role workspaces, packets, pools, runs, and previews;
- exact diff, idempotency key, reviewer, authority receipt, execution result, rollback/reconciliation;
- credentials, retention, connector rights, and tenant scope registry.

Exit: replay cannot duplicate a mutation; permission mirrors the human operator; failures reconcile
instead of producing a false success.

### W9 — Candidate experience and controlled engagement

Scope:

- approved intro, follow-up, re-engagement, interview-prep, scheduling, decline, and close-loop
  drafts;
- stop events for reply, opt-out, consent withdrawal, target change, or role closure;
- exact preview bytes and current-request execution authority;
- candidate-visible company, role, compensation, process, and privacy context before consent.

Exit: prepared, approved, executed, replied, stopped, and reconciled are separate durable states;
only authorized bytes reach the approved destination.

### W10 — Outcome learning and scale

Scope:

- link evidence shown/consulted/corrected to review, mutual yes, intro, and outcome;
- cohort-aware funnel, source yield, review burden, time-in-stage, and candidate-experience metrics;
- preserve original judgment to measure automation bias;
- add transactional storage, queues, indexes, RBAC, retention jobs, and warehouse sync only when
  measured use requires them;
- natural-language workflow builder after functions, permissions, budgets, and run history stabilize.

Exit: Demigod can identify which channels and evidence improve the real loop without rewriting
history or making unsupported causal claims.

## 4. Dependency order

| Package | Requires | Unlocks |
|---|---|---|
| W0 truth kernel | existing system | every safe claim |
| W1 company consolidation | W0 | company context in workspace/functions |
| W2 role workspace | W0, W1 packet | vertical product loop |
| W3 candidate pool | W2 | cross-channel discovery |
| W4 evidence search | W2, W3 | useful review queue |
| W5 interview intelligence | W2, W4 | consistent evaluation/debrief |
| W6 memory and pools | W1–W4 | monitoring and repeatability |
| W7 functions/run engine | W1, W6 policies | governed scale |
| W8 integrations | W0, W2, W7 | controlled system access |
| W9 engagement | W2, W3, W8 | candidate/founder workflow |
| W10 learning/scale | real W2–W9 events | compounding product |

W1 and the first W2 composition can proceed together because company packets are read-only and the
workspace exposes missing prerequisites rather than bypassing them.

## 5. Verification matrix

| Risk | Required check |
|---|---|
| fixture presented as real | accepted-role and sample-isolation poison checks |
| wrong company joined | exact ID/domain and duplicate-ID refusal |
| stale or failed fetch treated as change | complete-fetch and clock checks |
| unsupported candidate claim | evidence/source/use-basis assertion |
| hidden ranking | no forbidden score fields; visible reasons/criteria |
| accidental bulk action | selection → preview only; explicit per-action authority |
| duplicate external write | idempotency replay test |
| prompt injection | hostile source cannot add tools/context/authority |
| consent/privacy breach | consent, suppression, retention, and deletion checks |
| model summary overclaim | evidence-span coverage and unknown preservation |
| historical green mistaken for current | exact-source fresh receipt |

## 6. Provider and model evaluation

Every paid provider or model gets a bounded bakeoff:

1. choose one field/task and a frozen, rights-safe evaluation set;
2. record the existing public/owned baseline;
3. measure exact correctness, usable coverage, freshness, citation quality, latency, and cost;
4. inspect false positives and identity collisions manually;
5. reject outputs that cannot preserve unknown/conflict states or use rights;
6. adopt only the fields/tasks the provider wins;
7. re-evaluate on drift and retain the prior version for replay.

## 7. Current execution receipt

In this work cycle:

- completed the primary-source product scan;
- revised the roadmap around the role workspace, rediscovery-first pool, structured interviews,
  relationship memory, dynamic pools, permissioned integrations, and candidate experience;
- completed the first W2 slice: the existing structured-hiring desk now composes accepted-role
  truth, calibration, exact company-packet context, shortlist, rediscovery, reviewed candidates,
  relationship paths, call notes, readiness checkpoints, and explicit authority boundaries;
- started W3 in that same projection with privacy-bounded inbound-candidate and prior-pair channels,
  plus visible recent-contact and prior-decline suppression reasons; contacts and pair scores are not
  projected;
- promoted the exact R1 company-intelligence source closure; import-integrity now has no missing or
  untracked edges;
- added a native role selector and compact role-workspace view to the existing private dashboard;
- extended the pool with referral claims and visible opt-out, stale-availability, profile-incomplete,
  location-preference, prior-decline, recent-contact, and role-truth-change suppression derived from
  existing stores;
- fixed the missing-company desk path so it cannot inherit unrelated global intro paths;
- no send, publish, external write, paid provider call, or person-data acquisition was authorized or
  performed.
