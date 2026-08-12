# Claude entry

Start with root [`AGENTS.md`](AGENTS.md) (active project + hard gates), then the
project day card. Compatibility: [`AGENT-SIMPLE.md`](AGENT-SIMPLE.md) →
[`DEMIGOD-SIMPLE.md`](DEMIGOD-SIMPLE.md) when Demigod is active.

- **Active project** is set in `AGENTS.md` (currently **Dasha** until the user switches).
  - Dasha → [`DASHA-RULES.md`](DASHA-RULES.md) · [`DASHA-DOCS.md`](DASHA-DOCS.md)
  - Demigod (when reopened) → [`DEMIGOD-SIMPLE.md`](DEMIGOD-SIMPLE.md) · [`DEMIGOD-AGENTS.md`](DEMIGOD-AGENTS.md)
- Ponytail is required for every code edit.
- Eat the Sounds is archived; do not touch it unless the user reopens it.
- Publishing, outbound messages/posts/forms, and money movement require exact
  authorization in the current user request. Old autonomy notes grant none.
- Truth by project (see `AGENTS.md`): Dasha → `node dasha-live-verify.mjs`;
  Demigod → `bin/dg truth`. Never copy a release version into this file.
- Cross-agent: [`AGENT-COMMS.md`](AGENT-COMMS.md). Always `bin/dg-bus … --from claude`.
  Check `bin/dg-bus inbox claude --unread` and `bin/dg-bus status` at task boundaries.
  Interactive sessions do not auto-read the bus — use `task`/`send` for cross-talk.
- One writer per file when other agents may be live; ship-bound SoR is `/home/potter`.
- Verify with the smallest relevant **active-project** gate. Hold the Demigod foot lock only for foot-core edits.
- Data/insight tools (Demigod ops): `bin/dg tools` or `node demigod-tools-registry.mjs --md`;
  reuse, don't rebuild.
