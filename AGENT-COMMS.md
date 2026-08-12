# Agent comms — Claude ⇄ Grok ⇄ Codex

`bin/dg-bus` is the primary coordination path. It uses the existing stateless adapters and a local filesystem task ledger. It needs no terminal injection, daemon, external orchestration runtime or persistent model session.

Prompts and replies travel to external model providers. Never include secrets or unnecessary personal data. Agent context restricts work; it does not authorize publishing, outbound messages, forms, applications, money movement or wallet actions.

## Commands

```bash
bin/dg-bus status
bin/dg-bus task grok --from claude --title "research" --spec-file PROMPT.md --out docs/research/grok-report.md
bin/dg-bus task claude --from grok --title "review" --spec "Review FILE and report findings" --detach
bin/dg-bus show TASK_ID
bin/dg-bus wait --task TASK_ID --timeout-ms 300000
bin/dg-bus send codex --from grok --subject "handoff" --body "See FILE"
bin/dg-bus inbox codex --unread
bin/dg-bus selftest
```

Roles are `claude`, `codex` and `grok`.

**`--from` is required** on every `send` and `task`. There is no default sender (a prior default of `codex` mislabeled messages). Example: Grok coordinating → `--from grok`.

`task` runs synchronously unless `--detach` is present. `--spec-file` is preferred for long prompts because it avoids quoting and shell-length failures. `--out` atomically preserves a successful raw reply inside the workspace with its task ID, role and completion time; it refuses paths outside `/home/potter`.

## Storage and receipts

- Task receipts: `/tmp/dg-busy/agent-bus/tasks/*.json`
- Message ledger: `/tmp/dg-busy/agent-bus/messages.jsonl`
- Transport logs: `/tmp/dg-busy/{ask-claude,grok-ask,codex-ask}.log`
- Optional handoffs: `/tmp/dg-busy/agent-bus/*.md` (operational only)

Every task receipt records the prompt, role, timestamps, status, exit code, reply and error. Writes are atomic. **`/tmp` receipts are operational state, not durable documentation**; promote conclusions to the appropriate project document.

## Direct adapters

Use a direct adapter when no tracked task is needed:

| Command | Model | Contract |
|---|---|---|
| `bin/ask-claude "…"` | Claude | Stateless consultation; local access governed by its adapter |
| `bin/grok-ask "…"` | Grok | Stateless, read-only consultation with retry and balance circuit breaker |
| `bin/codex-ask "…"` | Codex | Fresh read-only Codex exec; never resumes the live interactive session |

All accept an argument or stdin, print the reply and return non-zero on transport failure. An empty reply is failure, never a pass.

## Routing

- Long or auditable work: `dg-bus task … --from … --spec-file …`
- Concurrent independent work: create several detached tasks, then wait by task ID.
- Quick second opinion: direct adapter.
- Durable handoff: save conclusions in a project document and use `dg-bus send --from …` as the pointer.
- **Interactive TUIs do not auto-read the bus.** A live Claude/Codex/Grok session will not see `send` unless someone tasks it, the human pastes, or the agent checks `inbox`. Prefer `task` when you need a guaranteed reply.
- Interactive terminal control of another agent’s TUI: deliberately unsupported. A second writer can corrupt a live session.

## Collision rules

- **One writer per canonical file.** Before editing a shared source while other agents may be live, claim it:  
  `bin/dg-bus send <others> --from <me> --subject "claim: PATH" --body "editing until …"`
- Ship-bound sources: prefer **`/home/potter`** over worktree-only copies; promote before publish.
- Prefer read-only research/review tasks; grant write scope explicitly and narrowly.
- When coordinating parallel work: write a short handoff (goal, lanes, file claims, open defects) before fanning out.

## Safety

- No agent is authority equal to the user.
- Keep prompts task-specific and cite current receipts.
- Verify worker claims against source and gates before accepting them.
- Publishing and every outbound side effect remain current-request-gated.
- Verify PASS is not product OK when user-visible embeds (SRI, mounts) can fail outside marker checks.

## Health

```bash
bin/dg-bus selftest
bin/dg-bus status
tail /tmp/dg-busy/grok-ask.log
tail /tmp/dg-busy/ask-claude.log
tail /tmp/dg-busy/codex-ask.log
```

Implementation: `demigod-agent-bus.mjs`. Compatibility entrypoint: `bin/dg-bus`.
