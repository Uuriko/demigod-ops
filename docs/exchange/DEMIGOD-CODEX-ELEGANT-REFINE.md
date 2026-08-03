# Demigod minimum viable documentation OS

## 1. Verdict

Yes: radically overcomplicated. Fourteen process files, 58 exchange notes, and many root
`DEMIGOD-*.md` files repeat state, authority, workflow, roadmaps, and agent method.
The cost is not reading time; it is contradictory truth: stale versions, human-vs-agent
publish rules, duplicate rituals, and history presented as current instruction.

The tools already encode the reliable procedure (`bin/dg live`, locks, honesty gates,
and release checks). Docs should explain intent, ownership, and exceptions—not replay tools.
Freeze is ON, so consolidation is editorial only: no product, live, or release mutation.

## 2. Target OS: four living docs + one state

1. `DEMIGOD-AGENTS.md` — authority, scope, invariants, canonical files, hard stops.
2. `docs/OPERATIONS.md` — demand-to-outcome operating model; exceptions and records.
3. `docs/PRODUCT.md` — customer promise, copy constraints, architecture, product decisions.
4. `docs/ROADMAP.md` — now/next/later outcomes; no session logs or speculative backlog.
5. `DEMIGOD-COMPRESSED-STATE.md` — current live/disk/freeze truth and next intentional move.

Only the compressed state changes every ship/session. The other four change only when a
durable rule, product decision, operating model, or roadmap outcome changes.
Everything dated is immutable evidence under `docs/archive/`; it is never an agent entry point.

## 3. Merge map

| From | To |
|---|---|
| root `AGENTS.md` Demigod rules + `DEMIGOD-AGENTS.md` + agent-method/collab/loop docs | `DEMIGOD-AGENTS.md` |
| `DEMIGOD-WORKFLOW.md` + `docs/process/README.md` + 12 routine checklist files | `docs/OPERATIONS.md` or executable `bin/dg` behavior |
| GTM, sourcing, outreach, matching, events, Stripe, pilot, intro process docs | `docs/OPERATIONS.md` |
| tech architecture, Webflow troubleshooting, product onboarding, competitor conclusions | `docs/PRODUCT.md` |
| roadmap variants, future plans, huge backlog, next-hour and sprint documents | `docs/ROADMAP.md` |
| `DEMIGOD-STATE.md`, ship-status prose, session-start/status notes | `DEMIGOD-COMPRESSED-STATE.md` |
| 58 exchange docs, swarm outputs, prompt rounds, histories, research snapshots | `docs/archive/exchange/` |
| postmortems and decision evidence | `docs/archive/decisions/`, linked from the living doc |
| indexes whose only job is listing other docs | delete after links resolve |

Migration rule: merge only the latest non-conflicting rule. If two rules conflict, current
explicit user authority plus `bin/dg live` wins; record one resolution, not both versions.

## 4. Agent session card

Demigod is Webflow talent matching; phase is retired setup framing.
Read compressed state, then run `bin/dg live`.
Freeze ON means inspect and prepare only unless explicitly authorized otherwise.
Use one canonical source and one writer.
Default to one agent; PLAN → EXECUTE → REVIEW only when risk warrants it.
Never invent roles, receipts, pilots, proof, SLAs, or founder identity.
Never send real outreach, change fees, or expose private data without authority.
Never touch the archived game unless explicitly reopened.
Verify with the smallest relevant `bin/dg` gate; release uses `bin/dg full-check --release`.
Disk is not live; claim live state only from fresh evidence.
Update compressed state only when truth changes.
Stop when the requested outcome is met.

## 5. Do not delete: load-bearing

- `DEMIGOD-COMPRESSED-STATE.md` until replaced atomically; it is the current truth pointer.
- Root `AGENTS.md` game hard stops and workspace safety rules; deduplicate, do not weaken.
- Canonical sources: `demigod-foot-core.js`, head, footer loader, and verification code.
- `bin/dg` commands, writer locks, honesty gates, release checks, and their machine-readable data.
- The 2026-07-09 publish/load postmortem: it contains unique failure and recovery evidence.
- Consent, mutual-yes, fee/invoice, incident, privacy, and data-handling rules; compress them
  into Operations, but retain original dated evidence in the archive.
- Real operational records in `demigod-ops/`, release evidence, ledgers, and audit artifacts.
- Decision provenance needed to explain safety invariants; archive it, never load it by default.

Ruthless rule: if a document neither changes an agent decision nor preserves unique evidence,
it is not documentation—it is residue.
