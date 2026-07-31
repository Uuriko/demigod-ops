# Agent Comms — Claude ⇄ Grok ⇄ Codex

Orca orchestration is the primary bus for ongoing agent work. Shared files hold context; messages
carry task/thread IDs, paths, and concise outcomes. Do not prepend a standing phase label—use only
task-specific facts from current receipts.

Model prompts and replies travel to external providers. Do not include secrets or unnecessary
personal data.

## Primary path — Orca

On Linux use `orca-ide`, never `/usr/bin/orca` (the GNOME screen reader).

```bash
orca-ide status --json
orca-ide terminal list --worktree path:/home/potter --json
```

Terminal handles are runtime-scoped: resolve them after every Orca restart; never persist them in
project files.

- One-off prompt to a known idle terminal: `orca-ide terminal read`, then `terminal send`.
- Threaded status: `orchestration send --thread-id …`; the recipient runs
  `orchestration check --terminal <fresh-recipient-handle> --unread --inject --json`. If an idle
  TUI needs a wake-up, send that exact command to it once. Diagnostics use `--peek`, which does not
  consume mail.
- Tracked work: `task-create` → `dispatch --inject` → coordinator
  `check --wait --types worker_done,escalation,decision_gate --timeout-ms …`.
- Keep one managed Claude terminal per active task. Clear a completed, saved context before reusing it;
  never stop unidentified unmanaged terminals.

## Synchronous fallback

| From any agent / script | Consults | How |
|---|---|---|
| `ask-claude "…"` | **Claude** | stateless `claude -p`, prints reply, exits |
| `grok-ask "…"` | **Grok** | stateless `grok -p`, prints reply, exits |
| `codex-ask "…"` | **Codex** | stateless `codex exec`, read-only sandbox, prints reply, exits |

All three accept the prompt as arguments or stdin, return non-zero on failure, and log diagnostics
to `/tmp/dg-busy/{ask-claude,grok-ask,codex-ask}.log`. `codex-ask` defaults to a 600s budget and a
read-only sandbox (`CODEX_ASK_TIMEOUT`, `CODEX_ASK_SANDBOX`); an empty reply exits 4 rather than
passing as success. It never resumes the live interactive session — two writers corrupt it.
Selftest: `bin/codex-ask --selftest`. Shared context holds durable policy only; current website
identity comes from `/tmp/dg-busy/truth.json`, while active task ownership comes from Orca.

## SBAR handoff (when switching agent or worktree)

Keep handoffs short. One block, no essays:

| Letter | Meaning | Example |
|--------|---------|---------|
| **S** Situation | disk/live foot + lock | disk v869 live v868 lock free |
| **B** Background | branch + last commit | `snapshot/v567-predisk` @ `abc1234` |
| **A** Assessment | gates | `just gate` OK / truth prepare-only |
| **R** Recommendation | next task | ship prepare only — no publish |

Free recipes: `just orient`, `just gate`, `just truth` (see root `Justfile`).

## Routing

- Ongoing Claude⇄Codex work → Orca thread or tracked dispatch (`bin/dg-bus task codex`).
- Stateless second opinion → `ask-claude` / `codex-ask` / `grok-ask` (never dual-write a live TUI).
- Codex playbook (prompt shape, dual-path wake, PASS/BLOCK): [`docs/process/CODEX-COMMS.md`](docs/process/CODEX-COMMS.md).
- Long work → Orca tracked task with `worker_done`, not an unobserved polling loop.
- Keep prompts read-only unless local writes are intended. Context and ownership claims restrict
  work; they never authorize publishing, outbound messages, forms, applications, or money movement.

Do not attach a second writer to an interactive Grok TUI. `bin/grok-ask` is the sole stateless
Grok path.

## Peer bus (role → live handle)

Prefer **roles**, not stale handles (handles die on Orca restart):

```bash
bin/dg-bus roster                 # → /tmp/dg-busy/agent-roster.json
bin/dg-bus status                 # pending tasks + unread + primaries
bin/dg-bus unstick                # Claude "resume from summary" → pick 1
bin/dg-bus shell-start codex      # start agent on empty shell terminal
bin/dg-bus send claude --subject "…" --body "…"
bin/dg-bus task codex --title "review" --spec "…"
bin/dg-bus wake claude            # inject orchestration check into TUI
bin/dg-bus wait --timeout-ms 300000   # block for worker_done on coord terminal
```

Source: `demigod-agent-bus.mjs`. Still use Orca `task-create`/`dispatch` directly for DAGs;
`dg-bus` is the short path for peer status + one-shot dispatch by role.

## GitHub tab + multi-agent

Open Chrome GitHub tab (CDP `:9223`) is **visual only**. Shared work uses **PR URL + `gh` + `/tmp/dg-busy` receipts**.

```bash
bin/dg-github status                    # CDP tabs + notifications
bin/dg-github brief --repo=Uuriko/… --pr=N   # → /tmp/dg-busy/github-pr-brief.md
bin/dg-bus send claude --subject "PR N" --body "See /tmp/dg-busy/github-pr-brief.md"
```

Playbook: [`docs/process/GITHUB-CDP-AGENTS.md`](docs/process/GITHUB-CDP-AGENTS.md).

## Health

```bash
bin/dg-orca status
bin/dg-bus status
orca-ide orchestration task-list --json
orca-ide orchestration inbox --limit 30 --json
tail /tmp/dg-busy/ask-claude.log
```

Dashboard status reads `/tmp/dg-busy/orca-status.json`; it never shells out from the main poll.
