# Demigod internal tooling ambition (deep loop)

**Date:** 2026-07-14 · Fable + Codex + Grok  
**Ground:** truth PASS + freeze ON + lock free · review v2.2 · ~51 registry tools · dash :9878  
**Raw:** `/tmp/dg-busy/swarm-ambition-os/{FABLE,CODEX}.md`

## North star (merged)

**Unforgeable green + one governed path.**  
Agents (and the dash) only claim “safe” from fresh evidence; mutations go through lock/freeze policy; every run leaves a replayable proof. Not a continuous agent OS.

## Four components (max)

| Component | Role | Entry |
|-----------|------|--------|
| **Truth** | Sole oracle of disk/live/freeze/lock/board | `bin/dg truth` |
| **Lock** | Hard capability to edit foot | `bin/dg lock` + `assertCanWriteFoot` |
| **Review** | Diff policy + gates + (soon) proof freshness | `bin/dg-review` |
| **Cockpit** | Projection of next action + evidence age | dash `:9878` + `bin/dg next` |

Everything else is either a **subcommand** of these or **archive**.

## Architecture (Codex, simplified)

```
intent → claim lock (if foot) → review/check → proof artifact
       → ship only if freeze OFF + proof fresh + truth require-match
dash/control read the same artifacts; never invent green
```

## Ambitious roadmap

### P0 — green means proven (~1–2 weeks)
1. **Proof envelope** — every truth/review/full-check write embeds input SHAs + tool version + age  
2. **Stale refuse** — dash/agents must not show green if source mtime/hash ≠ proof  
3. **Review: `--baseline-diff` + optional `--watch`**  
4. **Registry validation** — hot tools only; dead `*-pass` marked archive  
5. **Lock on all foot mutators** (already on foot-cdn; finish the set)

### P1 — one surface (~2–3 weeks)
1. **`bin/dg check edit|full|release`** — merge full-check / review-gates / ship-gate  
2. **`bin/dg ship`** — one transaction; prep/cdn/cm6 as substeps  
3. **Dash = traffic light + NEXT + “why green?” drawer** (evidence chain)  
4. **Review change contract** — allowed files + require foot lock if foot in scope  

### P2 — moonshot (only after P0/P1 earn trust)
1. Evidence event log under `/tmp/dg-busy/evidence/`  
2. Live reconcile proof vs truth after ship  
3. Orca as *client* of same API (not second brain)  
4. Counterexample fixtures for honesty/freeze/WIZ  

## Kill / merge (aggressive)

- Many `demigod-*-pass.mjs` → archive after one confirmed success  
- Multiple publish scripts → one `dg ship`  
- Multiple ship status/checklist tools → ship subcommands  
- Dashboard must not bypass CLI policy  
- No auto-mint board / sustain-cycle patterns  

## Failure modes this must kill

Concurrent foot writers · stale green · live==disk without body hash · freeze thrash · partial publish · dash disagreeing with CLI · tool sprawl · prose-only handoffs  

## Explicit non-goals

Continuous unsupervised thrash · LLM as hard gate · auto-publish · second metrics dashboard · risk scores that soften honesty  

## Verdict on “agent OS”

| Codex | Fable | Grok |
|-------|-------|------|
| Proof-carrying kernel | Trustworthy on-demand, not continuous OS | **Proof-carrying on demand** — ambitious spine, silent until invoked |

## 2-week sprint if we only build for agents

| Days | Work |
|------|------|
| 1–3 | Proof envelopes + stale refuse (truth, review, dash brief) |
| 4–5 | Review baseline-diff + watch |
| 6–8 | Collapse publish into `dg ship` (or document single path) |
| 9–10 | Dash: one light + NEXT + why-green |
| 11–12 | Registry archive sweep (50 → ~15 hot) |
| 13–14 | Adversarial try: concurrent foot, stale green, freeze publish — fix survivors |

## Current state (implementable now)

Already landed: **truth**, **lock**, **review v2.2**, freeze, full-check.  
Next code: **proof freshness** is the highest leverage ambitious step.

