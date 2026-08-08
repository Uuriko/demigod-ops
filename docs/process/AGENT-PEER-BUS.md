# Agent peer bus

**Source of truth:** [`AGENT-COMMS.md`](../../AGENT-COMMS.md).
**Implementation:** [`demigod-agent-bus.mjs`](../../demigod-agent-bus.mjs) through [`bin/dg-bus`](../../bin/dg-bus).

The bus invokes the existing stateless Claude, Codex and Grok adapters and records atomic JSON receipts under `/tmp/dg-busy/agent-bus/`. There is no terminal discovery, terminal injection, daemon, database or external orchestration dependency.

```bash
bin/dg-bus status
bin/dg-bus task grok --title "research" --spec-file prompt.md
bin/dg-bus task claude --title "review" --spec "Review FILE" --detach
bin/dg-bus wait --task TASK_ID
bin/dg-bus show TASK_ID
bin/dg-bus selftest
```

Use tracked tasks for long work and direct `ask-claude`, `grok-ask` or `codex-ask` calls for disposable second opinions. Task context never grants publication, outbound-message, form, application, wallet or money authority.
