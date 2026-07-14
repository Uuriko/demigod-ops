# Demigod Internal Tooling OS

## 1. North star

Every agent can determine the next safe action from fresh evidence, execute it through one governed path, and prove the resulting disk-to-live state without a human reconstructing history.

## 2. Architecture

- **Evidence kernel:** add `demigod-evidence.mjs`, a typed, append-only event/evidence store under `/tmp/dg-busy/evidence/`; every result carries `runId`, producer/version, started/ended times, input SHA set, scope, freshness TTL, exit status, and artifact SHA. JSON files such as `truth.json` become projections, never independent truth.
- **Truth oracle:** `demigod-truth.mjs` resolves disk SHA/version, CDN body SHA, live loader URL/body SHA, freeze, foot lease, board honesty, and latest gate evidence into one signed snapshot. `bin/dg truth --fresh` probes; default output clearly labels cached/stale/unknown. Drift under freeze is an explicit valid state, not green-by-omission.
- **Review engine:** `demigod-review.mjs` v2.2 remains the diff-aware policy/rule engine. It consumes a declared change manifest, emits findings plus required gate IDs, and cannot certify its own engine changes unless `demigod-review-selftest.mjs` and an independent syntax/test runner pass.
- **Mutation authority:** `demigod-foot-lock.mjs` becomes a capability lease: owner, task/run ID, base SHA, allowed files/actions, TTL, token, heartbeat, and expected post-SHA. All foot writers and publish commands import `assertMutationAuthorized()`; shell convention alone is insufficient.
- **Gate runner:** replace orchestration overlap with `demigod-check.mjs`; it executes a dependency DAG from the registry, deduplicates gates, isolates timeouts, records evidence, and supports profiles `edit`, `full`, and `release`. `bin/dg full-check` becomes an alias to `bin/dg check full`.
- **Control plane:** `demigod-control.mjs` computes state and a single `NEXT` from evidence plus policy; it never shells out while rendering. `bin/dg` is the only public CLI and invokes typed actions (`inspect`, `check`, `claim`, `prepare`, `ship`, `handoff`).
- **Dashboard:** `demigod-agent-dashboard.mjs` on `:9878` is a read-mostly projection of the same APIs: current truth, evidence age, active lease, gate DAG, queued/running jobs, ship state, and audit log. Mutations require the same capability token as CLI actions.
- **Ship transaction:** `demigod-ship.mjs` owns prepare -> authorize -> CDN upload -> CDN SHA verify -> Webflow paste -> publish -> live SHA verify -> release record. It is resumable and idempotent; freeze blocks authorization, while `ship-prep` remains read-only.
- **Registry:** convert `demigod-tools-registry.mjs` from a hand-maintained catalog to validated manifests with owner, command, inputs/outputs, safety class, freeze policy, lock requirement, timeout, dependencies, and deprecation target. CI/selftest rejects unregistered executables and dangling dashboard jobs.
- **Orca:** `bin/dg orca` is a remote console/transport for the same control API, never a second scheduler or truth source; phone approvals become scoped, expiring authorization events in the audit log.

## 3. Ambitious capabilities by layer

### Review

- Change contracts: `bin/dg review --intent intent.json` checks touched files, invariants, expected version movement, and required evidence—not only source patterns.
- Semantic risk routing: foot, loader, freeze, publish, dashboard action, and review-engine changes automatically select stricter rules and gates.
- Counterexample fixtures: every high finding can emit a minimal reproducible fixture; accepted fixes must turn that fixture green before rescan.
- Trust calibration: track rule precision, suppressed findings, escaped defects, runtime, and flaky gates; quarantine noisy rules instead of normalizing false green.

### Truth & Lock

- Content identity across disk -> generated paste -> CDN -> footer loader -> live DOM, with version strings treated as labels rather than proof.
- Optimistic concurrency on release: fail if foot SHA differs from lease `baseSha`; require explicit rebase/reclaim, never silently overwrite.
- Lease recovery protocol: expired/dead leases become `orphaned`, preserve audit data, and require a fresh claim against current SHA.
- Policy invariants: freeze ON forbids remote mutation; lock absent forbids foot mutation; release profile requires live==disk SHA; unknown is never PASS.

### Dashboard

- A “why is this green?” drawer showing the exact evidence chain, producer, age, inputs, and command to refresh it.
- Event timeline per run/task, including agent, lease, files, gates, publish stages, failures, retries, and final hashes.
- Stuck-work detection for expired leases, hung jobs, stale truth, inconsistent versions, and partially completed ship transactions.
- Safe action palette generated from registry policy; unavailable actions show the blocking invariant rather than disappearing.

### Control & Ship

- Deterministic `bin/dg next --json`: one action, reason, prerequisites, mutation class, and proof-of-done contract.
- Job supervisor with bounded concurrency, cancellation, heartbeat, structured logs, and run-scoped output paths; no shared `latest.json` races.
- Release bundles under `demigod-ops/releases/<releaseId>/` containing manifest, hashes, review, gates, authorization, CDN/Webflow receipts, and rollback pointer.
- Automatic rollback recommendation—not automatic rollback—when post-publish live identity or smoke fails; preserve the failing release evidence.

### Swarm

- Task DAG with explicit owner, read/write set, dependencies, acceptance contract, and authority; default topology remains one agent.
- Scheduler refuses overlapping writers and foot work without a lease; read-only reviewers may run concurrently against immutable SHAs.
- Handoffs are machine-readable events, not prose-only notes: claimed SHA, completed evidence, unresolved risks, and exact next action.
- Agents consume `GET /api/context?task=<id>` for a bounded context pack, avoiding full-history rereads and contradictory cached briefs.

## 4. Ranked build roadmap

### P0 — make green mean proven (8–12 days)

1. Evidence envelope/store plus run-scoped artifacts; adapt truth, review, full-check, and dashboard readers (3–4d).
2. Registry manifests and validator; declare all ~50 tools, safety classes, dependencies, aliases, and owners (2d).
3. Capability lease enforcement imported by every discovered foot/publish writer; adversarial lock tests (2–3d).
4. `demigod-check.mjs` DAG profiles and `bin/dg check edit|full|release`; eliminate duplicate review invocation in current full-check (1–2d).
5. Truth freshness/content-chain tests for freeze ON with disk v199/live v198 and release-match behavior (1d).

### P1 — one operational surface (10–15 days)

1. Refactor `demigod-control.mjs` into pure state reducer + action policy; implement deterministic `NEXT` (3d).
2. Dashboard evidence drill-down, job supervisor, timeline, and token-gated actions (4–5d).
3. Resumable `demigod-ship.mjs` transaction and immutable release bundle (4–5d).
4. Review intent manifests, semantic risk routing, and independent meta-review profile (2d).

### P2 — safe multi-agent leverage (12–20 days)

1. Task DAG, read/write-set conflict detection, structured handoffs, and immutable-SHA review jobs (4–6d).
2. Orca as authenticated control client with scoped approval events and live job streaming (3–4d).
3. Rule/gate trust analytics, flake quarantine, escaped-defect ledger, and reliability budgets (3–5d).
4. Hermetic fixtures simulating CDN/Webflow/live failure stages and crash-resume/rollback advice (4–5d).

## 5. Kill/merge list

- Merge `demigod-full-check.mjs`, `demigod-review-gates.mjs`, `demigod-ship-gate.mjs`, and `demigod-full-ship-pass.mjs` into registry-driven `demigod-check.mjs`; retain compatibility aliases for 30 days.
- Merge `demigod-ship-status.mjs`, `demigod-ship-checklist.mjs`, `demigod-ship-prep.mjs`, `demigod-foot-cdn-publish.mjs`, `demigod-cm6-paste-publish.mjs`, and `demigod-publish-foot.mjs` behind `demigod-ship.mjs` subcommands.
- Merge `demigod-internal-dashboard.mjs` into `demigod-agent-dashboard.mjs`; one server, UI, API, and job map on `:9878`.
- Archive standalone wrappers `bin/dg-review`, `bin/dg-lock`, `bin/dg-ship-status`, `bin/dg-ship-check`, and `bin/dg-publish-foot` after `bin/dg` parity; aliases must not contain logic.
- Archive `demigod-full-ship-pass.mjs`, `demigod-webflow-ai-ship.mjs`, `demigod-heavy-ship-loop.mjs`, `heavy-collect-ship-*.mjs`, and `heavy-send-ship-*.mjs`; they encode alternate ship authority.
- Collapse `orca-agent-drive.sh`, `orca-drive-all.sh`, `demigod-orca-hybrid.sh`, and `run-demigod-orca.mjs` into `bin/dg orca`; keep platform setup scripts separate.
- Move backups (`demigod-foot-core.js.bak*`, `.trust-bak`, generated b64/txt copies) out of executable discovery into an archive; Git/release bundles own recovery.

## 6. Failure modes this OS must prevent

- Claiming live==disk from matching version text without CDN/live body hashes.
- Treating expected freeze drift as a defect, or treating it as permission to call a release green.
- Concurrent foot writers, stale-base edits, token leakage, forced unlock without an audit trail, or a writer bypassing the mutex.
- Self-green review caused by reviewing only its own rules, duplicate review runs, silent baselines, noisy findings, or stale artifacts.
- Publish while freeze is ON; partial CDN/Webflow publish; non-idempotent retry; success claimed before live identity and smoke proof.
- Dashboard/control disagreement, recursive status calls, `latest.json` races, stale green badges, hidden unknowns, and UI actions bypassing CLI policy.
- Tool sprawl: multiple scripts owning the same mutation, undocumented executables, divergent defaults, shell wrappers with hidden logic, and history mistaken for current procedure.
- Swarm thrash: agents rereading sprawling docs, working from different SHAs, overlapping writes, unbounded processes/tabs, and prose handoffs with no acceptance proof.
- Repeating catastrophic client behavior such as the WIZ `MutationObserver` feedback loop without runtime smoke, timeout, and browser responsiveness evidence.

## 7. Single moonshot

Build a local “proof-carrying agent kernel” where every proposed action is simulated against policy and immutable inputs, every mutation requires a scoped capability, and every completion emits a replayable evidence chain—so an autonomous swarm can safely take Demigod from task intent to verified live state while freeze, truth, and founder authority remain mathematically explicit.
