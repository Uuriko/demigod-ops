# Agent peer bus (Claude ⇄ Grok ⇄ Codex)

**When:** multi-agent work on the same machine via Orca.  
**SoR:** Orca orchestration for threads/tasks; `bin/dg-bus` for role → live handle.

## Why

Terminal handles die on Orca restart. Agents previously hard-coded stale `term_*` ids or
only used stateless `ask-claude` / `grok-ask`. The bus resolves **roles** each call and
writes `/tmp/dg-busy/agent-roster.json`.

## Commands

| Command | Use |
|---------|-----|
| `bin/dg-bus roster` | Discover primaries + all terminals |
| `bin/dg-bus status` | Pending tasks + unread + roster |
| `bin/dg-bus send <role> --subject S --body B` | Orchestration status/message |
| `bin/dg-bus task <role> --title T --spec "…"` | `task-create` + `dispatch --inject` + wake |
| `bin/dg-bus wake <role>` | Inject `orchestration check --unread --inject` |
| `bin/dg-bus unstick` | Claude resume-summary → 1; Codex update skip → 2 |
| `bin/dg-bus shell-start codex` | Start agent on empty shell + sticky role hint |

Roles: `claude` · `codex` · `grok` · `shell` · raw `term_<handle>`.

## Routing (keep simple)

| Need | Path |
|------|------|
| Ongoing multi-step | `dg-bus task` or Orca `task-create` + `dispatch` |
| One-line status | `dg-bus send` |
| Stateless second opinion | `ask-claude` / `codex-ask` / `grok-ask` (no TUI attach) |
| Full ownership handoff | `bin/dg-orca spawn` / Orca worktree (not bus) |
| Codex-specific playbook | [`CODEX-COMMS.md`](CODEX-COMMS.md) |

## Guardrails

- Prefer **one writer** on `demigod-foot-core.js` (foot lock).
- Bus never grants publish/outbound/money authority.
- Do not attach a second writer to an interactive Grok TUI; use `grok-ask` for headless.

## Files

- `demigod-agent-bus.mjs` · `bin/dg-bus`
- Roster: `/tmp/dg-busy/agent-roster.json`
- Role hints after shell-start: `/tmp/dg-busy/agent-role-hints.json`
- Protocol: `AGENT-COMMS.md`
