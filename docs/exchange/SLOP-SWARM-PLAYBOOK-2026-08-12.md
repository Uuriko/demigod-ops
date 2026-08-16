# Slop.cash swarm playbook — 2026-08-12

**Status:** working playbook for the laptop multi-agent swarm  
**Identity:** GitHub **Uuriko** only · wallet marker already on profile README  
**Money language:** pledged ≠ paid · projected USDC pool · no invented merges

---

## 1. Specialization

| Role | Job | Score style |
|------|-----|-------------|
| **Codex** (`gpt-5.6-sol`) | Mint measured implements/reviews via contribute-to-eliza + `run-receipt` | Measured receipts (preferred for implements) |
| **Claude** (`claude-fable-5` / claude-code) | Mint measured implements + formal reviews | Measured + review points |
| **grok-bot** | Orchestrate: LANE/QUEUE/ledger, bus `task`/`send`, babysit CI, research synthesis | Coord; cannot honestly mint Codex/Claude receipts |
| **grok** / **grok-build** | Research, triage, optional non-measured implements, rebase babysit | Base outcomes only unless skill later allows |

**Rule of thumb:** Codex/Claude **mint receipts**; grok-bot **orchestrates**; grok **researches**.

Templates:

- `slop-agent-inbox/templates/measured-implement-codex.md`
- `slop-agent-inbox/templates/measured-implement-claude.md`
- `slop-agent-inbox/templates/formal-review-spec.md`
- `slop-agent-inbox/templates/inbox-sync-spec.md`

---

## 2. Atomic claims

GitHub has no reservation system. Locally we do:

```bash
slop-queue-claim --agent codex --id 18661 --files "scripts/run-turbo.mjs" --work "implement #18661"
```

- Flock: `/home/potter/slop-agent-inbox/.queue.lock`
- Source of claim truth: `QUEUE.md` Claims table
- Refuse if another agent already holds the id
- Never steal **18730** residual or **18782** duration files

---

## 3. Mission control surfaces

| Surface | Purpose |
|---------|---------|
| `dg-bus` | Authoritative messages/tasks (`send` FYI, `task` guaranteed reply) |
| `LANE.md` | Glanceable board (PRs, claims, do-not-touch) |
| `QUEUE.md` | Ordered implement chain + claims |
| `ACTIVE_TASK.md` | Current grok-bot focus |
| `SCORE-LEDGER-YYYY-MM.md` | Monthly merges/reviews/PRs + cap headroom |
| `POLICIES.md` | Review diet + PR caps + attribution |
| `results/` | Per-agent writebacks |

Orchestrator `--from` for swarm ops: **grok-bot**. No interactive TUI injection.

---

## 4. Review diet

See `POLICIES.md`:

- Max **4** formal Uuriko reviews/day (unless user overrides)
- Max **3** open Uuriko PRs at once (GitHub is adding PR caps vs AI slop — stay under radar)
- No burst reviews on the same author in the same hour
- Prefer **CHANGES_REQUESTED with teeth** over rubber APPROVED
- No self-review for score; prefer ≤100 LOC hand-traces

---

## 5. Measured factory

1. Claim with `slop-queue-claim`
2. Work in isolated worktree (`origin = elizaOS/eliza`; prefer `src/eliza-canonical-codex-sol`)
3. `run-receipt.mjs start` → implement + **tests** → evidence/provenance → `finish`
4. Append footer **unchanged**
5. Open PR ≤ merge-cap awareness (~5 scored merges/mo)
6. Write `results/YYYY-MM-DD-<agent>.md` + ack grok-bot
7. Refresh ledger: `slop-score-ledger-refresh`

Grok-authored PRs without v2 footers **WILL SCORE ZERO** until an approved-client measured run that owns the contribution rescues them. Do not forge.

---

## 6. Optional other bounty markets (future — not now)

Agent Bounty, BountyBook, and similar boards may be interesting later for non-slop income. **Out of scope for this month.** Do not divert the swarm from elizaOS/eliza gitarmy-v1 until the measured factory is reliably minting attribution-valid merges under the review diet.

---

## 7. Heartbeat SPOF

Single points of failure to watch:

| SPOF | Mitigation |
|------|------------|
| Interactive TUI session dies / idle | Prefer `dg-bus task` adapters; no TUI injection |
| Bus adapters sandboxed read-only | Codex write-path fix (`CODEX_ASK_SANDBOX=workspace-write`); verify `dg-bus status` |
| grok-bot laptop local-exec / cloud pod | File inbox remains usable offline; LANE/QUEUE are the reboot surface |
| Device key / receipt toolchain | Keep `~/.config/gitarmy/device-ed25519.pem`; never hand-edit footers |
| Maintainer merge gate | Babysit CI; small PRs; do not spam opens |
| Monthly freeze (day-1 UTC) | Wallet marker on README before Sept 1; ledger honest |

**Heartbeat:** when idle, agents read LANE → QUEUE → POLICIES → top unclaimed Tier A or one formal review → write results → loop. If bus/adapters are down, continue via inbox files only and leave an ack note in `results/`.

---

## 8. Quick commands

```bash
dg-bus status
dg-bus send claude --from grok-bot --subject "…" --body "…"
dg-bus task codex --from grok-bot --title "…" --spec-file templates/measured-implement-codex.md --detach
slop-queue-claim --agent claude --id 18596 --files "…"
slop-score-ledger-refresh 2026-08
```

---

## 9. Related docs

- `/home/potter/docs/exchange/SLOP-CASH-COMPLETE-GUIDE-2026-08-12.md`
- `/home/potter/docs/exchange/SLOP-GROKBOT-RESEARCH-AND-INTEGRATION-2026-08-12.md`
- `/home/potter/docs/exchange/SLOP-CONTRIBUTION-LEDGER-2026-08-12.md`
- `/home/potter/docs/exchange/SLOP-CODEX-ADAPTER-WRITE-PATH-2026-08-12.md`
- `/home/potter/slop-agent-inbox/STANDING.md`
- `/home/potter/slop-agent-inbox/POLICIES.md`
