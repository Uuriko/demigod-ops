---
name: demigod-orient
description: Orient on Demigod product state and control plane. Use at session start, when lost, or when asked what next / status / control plane.
---

# Demigod orient

## Read first (in order)

1. `DEMIGOD-SIMPLE.md` (or `AGENT-SIMPLE.md`)
2. `DEMIGOD-COMPRESSED-STATE.md`
3. `AGENTS.md` + `DEMIGOD-AGENTS.md` for hard stops

## Live facts (never invent versions)

```bash
export DEMIGOD_ROOT="${DEMIGOD_ROOT:-$(pwd)}"
bin/dg truth
bin/dg home          # control plane map
node demigod-work-find.mjs --json
```

Website truth comes **only** from `bin/dg truth`. Do not copy a release version into docs.

## Control plane spine

| Module | Command |
|--------|---------|
| Orient | `bin/dg home` / `bin/dg next` |
| Site smoke | `bin/dg smoke` |
| Ship | `bin/dg ship prepare` then authorized `run` |
| Blog | `bin/dg-blog` / `node demigod-blog-sync.mjs` |
| Tools | `bin/dg tools` |
| Hygiene | `bin/dg hygiene --prune` |
| Lock | `bin/dg lock status` |

Dash: `http://127.0.0.1:9878` · receipts `/tmp/dg-busy/`

## Product (one sentence)

SF startup↔talent matching: private profiles, mutual yes, **10% of first-year cash only on start**. No auto-DM. Public board samples until real.

## Agent roles (who does what)

| Agent | Best for |
|-------|----------|
| **Grok** | Long autonomous ops, ship prep, research digests, multi-file Demigod loops |
| **Claude Code** | Careful refactors, skills/plugins, plan→implement, review |
| **Codex** | High-reasoning fixes, PR review, isolated worktree execution |
| **Orca** | Spawn agents in worktrees, orchestration threads, browser cards |

Cross-agent: Orca orchestration first; `ask-claude` / `grok-ask` / `codex-ask` as stateless fallbacks (`AGENT-COMMS.md`).
