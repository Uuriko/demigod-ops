# Agent comms — Claude ⇄ Grok ⇄ Codex

`bin/dg-bus` is the primary coordination path. It uses the existing stateless adapters and a local filesystem task ledger. It needs no terminal injection, daemon, external orchestration runtime or persistent model session.

Prompts and replies travel to external model providers. Never include secrets or unnecessary personal data. Agent context restricts work; it does not authorize publishing, outbound messages, forms, applications, money movement or wallet actions.

## Commands

```bash
bin/dg-bus status
bin/dg-bus task grok --title "research" --spec-file PROMPT.md --out docs/research/grok-report.md
bin/dg-bus task claude --title "review" --spec "Review FILE and report findings" --detach
bin/dg-bus show TASK_ID
bin/dg-bus wait --task TASK_ID --timeout-ms 300000
bin/dg-bus send codex --subject "handoff" --body "See FILE"
bin/dg-bus inbox codex --unread
bin/dg-bus selftest
```

Roles are `claude`, `codex` and `grok`. `task` runs synchronously unless `--detach` is present. `--spec-file` is preferred for long prompts because it avoids quoting and shell-length failures. `--out` atomically preserves a successful raw reply inside the workspace with its task ID, role and completion time; it refuses paths outside `/home/potter`.

## Storage and receipts

- Task receipts: `/tmp/dg-busy/agent-bus/tasks/*.json`
- Message ledger: `/tmp/dg-busy/agent-bus/messages.jsonl`
- Transport logs: `/tmp/dg-busy/{ask-claude,grok-ask,codex-ask}.log`

Every task receipt records the prompt, role, timestamps, status, exit code, reply and error. Writes are atomic. `/tmp` receipts are operational state, not durable documentation; promote conclusions to the appropriate project document.

## Direct adapters

Use a direct adapter when no tracked task is needed:

| Command | Model | Contract |
|---|---|---|
| `bin/ask-claude "…"` | Claude | Stateless consultation; local access governed by its adapter |
| `bin/grok-ask "…"` | Grok | Stateless, read-only consultation with retry and balance circuit breaker |
| `bin/codex-ask "…"` | Codex | Fresh read-only Codex exec; never resumes the live interactive session |

All accept an argument or stdin, print the reply and return non-zero on transport failure. An empty reply is failure, never a pass.

## Routing

- Long or auditable work: `dg-bus task … --spec-file …`
- Concurrent independent work: create several detached tasks, then wait by task ID.
- Quick second opinion: direct adapter.
- Durable handoff: save conclusions in a project document and use `dg-bus send` as the pointer.
- Interactive terminal control: deliberately unsupported. A second writer can corrupt a live TUI and is not needed for tracked stateless work.

## Safety

- No agent is authority equal to the user.
- Keep prompts task-specific and cite current receipts.
- Do not let two workers edit the same canonical file concurrently.
- Prefer read-only research/review tasks; grant write scope explicitly and narrowly.
- Verify worker claims against source and gates before accepting them.
- Publishing and every outbound side effect remain current-request-gated.

## Health

```bash
bin/dg-bus selftest
bin/dg-bus status
tail /tmp/dg-busy/grok-ask.log
tail /tmp/dg-busy/ask-claude.log
tail /tmp/dg-busy/codex-ask.log
```

Implementation: `demigod-agent-bus.mjs`. Compatibility entrypoint: `bin/dg-bus`.
