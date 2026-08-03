# Demigod Multi-Agent Prompting Method

## Decision

**A — “startup org-chart hats” are weak control mechanisms.** A CEO/CTO/reviewer persona may cue a useful perspective, but it does not grant knowledge, tools, authority, or accountability. It encourages role theater: confident strategy, duplicated work, and decisions outside the agent's evidence. Keep hats only as short human-readable labels.
Use this precedence instead:

1. **Capability contract:** what the agent can read, use, change, and prove.
2. **Stage ownership:** exactly one owner controls each transition and mutable artifact.
3. **Perspective/hat:** optional tone or review lens; never authority.
For Demigod, stage ownership matters most. Fable owns plan quality, Grok owns bounded execution, Codex owns independent review, and only the explicitly authorized release owner can cross freeze/publish gates. `demigod-foot-core.js` always has one writer, regardless of model names.
This follows two Anthropic principles: begin with the simplest workflow that works, adding autonomy only when it demonstrably improves results [1]; for genuinely open-ended work, use an orchestrator that delegates detailed, non-overlapping objectives and scales worker count to task complexity [2]. Multi-agent is an effort multiplier, not a default.

## Agent contract schema

Every nontrivial task should have one machine-readable/session-contract-compatible contract:

| Field | Required meaning |
|---|---|
| `goal` | One observable outcome, not “improve everything” |
| `stage` | `PLAN`, `EXECUTE`, or `REVIEW` |
| `owner` | One accountable agent/model and handoff target |
| `fresh_state` | Timestamped `bin/dg live`: LIVE, DISK, FREEZE, gates |
| `inputs` | Canonical files/artifacts and permitted sources |
| `capabilities` | Available tools plus read/write/publish permissions |
| `touch` | Exhaustive writable file list; empty for plan/review-only |
| `forbid` | Game, unrelated rewrite, secret/external send, and task-specific exclusions |
| `invariants` | Freeze policy, honesty rules, single-writer rules, canonical truth |
| `deliverable` | Exact path and structured output format |
| `verify` | Change-proportionate commands and required user-path evidence |
| `stop` | Success condition and hard-stop conditions |
| `budget` | Time/tool-call/agent ceiling; when to escalate effort |
| `claims` | `PROVEN`, `INFERRED`, `UNKNOWN`, each with evidence |
| `handoff` | Artifact paths, unresolved risks, next owner, and what not to redo |
Extend `demigod-session-contract.mjs`; do not create a parallel contract format. A contract does not override freeze or authorization.

## Required prompt templates

### PLAN — Fable

```text
Demigod (Webflow talent matching). Use current disk truth and task-specific context.
STAGE: PLAN. You are plan-only; touch=[]; do not claim commands ran.
GOAL / NON-GOALS: [observable outcome] / [explicit exclusions]
FRESH STATE: inspect current bin/dg live + named canonical docs; record time,
LIVE, DISK, FREEZE, and uncertainty. Never inherit version claims from prompt prose.
INVARIANTS: freeze; one foot-core writer; no game; honesty; no external send.
INPUTS: [files, incident/failure evidence, user constraint]
TASK: diagnose first; propose the smallest reversible sequence with one owner per step.
EFFORT: [small/medium/large]; justify whether another agent is useful.
RETURN: assumptions; ranked steps; touch list; acceptance tests; fast/full gates;
risks/rollback; hard stops; EXECUTE handoff. Label PROVEN/INFERRED/UNKNOWN.
```
### EXECUTE — Grok

```text
Demigod (Webflow talent matching). Use current disk truth and task-specific context.
STAGE: EXECUTE. Contract: [path]. Plan artifact: [path].
GOAL / TOUCH / FORBID: [copy exactly from approved contract].
PRECHECK: run fresh bin/dg live; validate contract; check freeze; acquire the
single-writer lock before any foot/head/footer mutation. Stop on state mismatch.
IMPLEMENT: smallest plan-conformant patch; no drive-by refactor or new one-shot tool.
VERIFY: run named fast gates after edits, then required full/user-path checks.
A passing agent smoke is supporting evidence only: confirm fixture, artifact version,
route, visible state, and expected failure behavior; do not equate exit 0 with UX proof.
RETURN: changed files; diff intent; commands + exact results; artifact paths;
live/disk/CDN separately; PROVEN/INFERRED/UNKNOWN; rollback; REVIEW handoff.
Never ship, unfreeze, publish, or send unless this contract explicitly authorizes it.
```
### REVIEW — Codex

```text
Demigod (Webflow talent matching). Use current disk truth and task-specific context.
STAGE: REVIEW. Read-only unless separately authorized. Contract: [path].
GOAL: independently decide whether the deliverable satisfies the contract.
REFRESH: run/read fresh bin/dg live; inspect actual diff and generated gate artifacts.
CHECK: scope/invariants; freeze and lock history; correctness; honesty; regression risk;
test freshness; disk/CDN/live identity; whether each gate can fail for the target defect.
ADVERSARIAL PATH: reproduce the affected user path or inspect equivalent direct evidence.
RETURN: PASS/BLOCK/PASS-WITH-RISK; findings by severity with file/evidence; false-positive
analysis; missing proof; minimal remediation; release recommendation. Do not silently fix.
```

## Demigod topology: 1 vs 2 vs 3 agents

| Agents | Use when | Shape |
|---|---|---|
| **1** | Known, bounded, reversible work; one file; established gate | One capable agent plans briefly, executes, self-checks. Default. |
| **2** | Ambiguous diagnosis **or** meaningful mutation/release risk | Fable→Grok for discovery/plan + execution, or Grok→Codex for execution + adversarial review. Never two writers. |
| **3** | Cross-domain, high-impact, or historically flaky work with separable stages | Fable PLAN → Grok EXECUTE → Codex REVIEW. Sequential stage gates; parallelize only independent read-only research/tests. |
Do not swarm routine copy, status, or a known one-line fix. Do not parallelize agents against foot-core. Add agents only when decomposition, independent evidence, or adversarial review is worth coordination cost. Anthropic found detailed delegation needs an objective, output format, tools/sources, and boundaries; vague worker prompts duplicate work and leave gaps [2].

## Evaluation and prompt-improvement loop

1. Log the task contract, prompt/version, agent count, tool trace, edits, gate artifacts, elapsed effort, and outcome.
2. Classify failure at the first bad transition: stale context, bad decomposition, capability/tool mismatch, authority breach, implementation defect, false-positive verifier, or lossy handoff.
3. Reproduce with the smallest fixture. For a false-positive smoke, preserve the passing bad case and add a negative/mutation test that must fail.
4. Patch the narrowest control surface: contract field, prompt heuristic, tool description, gate, or checklist. Do not answer every failure with more prose.
5. Replay a small eval set: known-good, known-bad, frozen drift, stale artifact, dual-writer attempt, and affected user path.
6. Promote only if failures fall without materially increasing time, tokens, churn, or false blocks; otherwise revert.
This mirrors Anthropic's practice of observing agent trajectories, deriving prompt changes from concrete failures, and retaining test cases/tracing because nondeterministic coordination cannot be debugged from final answers alone [2].

## Concrete documentation/process patches

- **`DEMIGOD-AGENTS.md`:** replace the actor org chart with “stage owners + capability matrix”; state that hats are lenses, not authority.
- **`DEMIGOD-AGENTS.md`:** add precedence: explicit task authorization → current freeze/contract → canonical source truth → model suggestion.
- **`DEMIGOD-AGENTS.md`:** require fresh `bin/dg live` in every PLAN/EXECUTE/REVIEW handoff; ban copied version state as evidence.
- **Session contract:** add `stage`, `fresh_state`, `capabilities`, `invariants`, `budget`, `claims`, `handoff`; validate one writer and freeze separately from `allowShip`.
- **`docs/process/AGENT-TASK-CHECKLIST.md`:** add topology chooser (1 default; 2 for ambiguity/risk; 3 for cross-domain/high-impact) and prohibit parallel writers.
- **Process README:** make PLAN→EXECUTE→REVIEW an optional risk tier, not mandatory ceremony for small work.
- **Verify docs:** define fast, full, and release gates by change class; require gate artifact freshness against touched-file mtimes.
- **Smoke docs:** require fixture/route/version/visible assertion plus one negative or mutation test; label agent-smoke-only results “supporting,” never “user verified.”
- **Handoffs:** require exact artifact paths and claim labels; reviewers inspect originals, avoiding agent-to-agent telephone summaries.
- **Prompt registry:** version these three templates and keep a compact failure corpus; review prompt changes against outcome and coordination-cost metrics monthly.

## Sources

[1] Anthropic, *Building Effective Agents* (2024): prefer simple composable workflows; add agentic complexity only when needed; use parallelization and orchestrator-workers for tasks that truly decompose.
[2] Anthropic, *How we built our multi-agent research system* (2025): orchestrator-worker architecture; detailed delegation contracts; explicit effort scaling; parallelism for independent work; trajectory observability, evals, and prompt iteration from failures.
