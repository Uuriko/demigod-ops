# Demigod — Claude entry

Start with [`AGENT-SIMPLE.md`](AGENT-SIMPLE.md), then read
[`DEMIGOD-COMPRESSED-STATE.md`](DEMIGOD-COMPRESSED-STATE.md). Follow the root
[`AGENTS.md`](AGENTS.md) and [`DEMIGOD-AGENTS.md`](DEMIGOD-AGENTS.md); those
files are canonical when historical notes disagree.

- Ponytail is required for every code edit.
- Eat the Sounds is archived; do not touch it unless the user reopens it.
- Publishing, outbound messages/posts/forms, and money movement require exact
  authorization in the current user request. Old autonomy notes grant none.
- Website truth comes only from `bin/dg truth`; never copy a release version
  into this file.
- In Orca, check structured messages at task boundaries with
  `orca-ide orchestration check --terminal <this-runtime-handle> --unread --inject --json`; follow injected
  task/dispatch preambles and reply in-thread. Hold the foot lock for foot-core edits.
- Cross-agent protocol: [`AGENT-COMMS.md`](AGENT-COMMS.md). Outside Orca,
  `ask-claude` is a stateless fallback.
- Verify every change with the smallest relevant Demigod gate.
- Data/insight tools — list with `bin/dg tools` or `node demigod-tools-registry.mjs --md`;
  reuse, don't rebuild. Key ones: `demigod-directory-refresh` (HN→map+jobs→role-ledger
  poll→Pulse→static), `demigod-role-ledger report --posted` (aging SF roles by posting age),
  `demigod-hiring-pulse`, `demigod-live-honesty-audit`, `demigod-conversion-audit`.
