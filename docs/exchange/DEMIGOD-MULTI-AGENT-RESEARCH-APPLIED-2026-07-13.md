Write access wasn't granted for that path, so here's the doc as text — save it manually to `docs/exchange/DEMIGOD-MULTI-AGENT-RESEARCH-APPLIED-2026-07-12.md` if useful (it's a delta on top of the existing `DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md`, not a replacement):

---

**Patterns → roles**

| Pattern | Source | Applied here |
|---|---|---|
| Orchestrator-worker | Anthropic multi-agent research | Grok orchestrates: decomposes, dispatches, verifies, publishes. Fable/Codex/Sonnet are narrow-brief workers, not free-roaming agents. |
| Sequential handoff | Azure agent patterns | Fable (plan) → Grok/Codex (build) → Codex (review) → Grok (verify+ship). Each stage reads only the prior stage's artifact file, not live chat context. |
| Concurrent, non-overlapping | Azure | Sonnet copy/audit and Codex code review run in parallel — different files, read-only, no lock needed. |
| Blackboard | classic multi-agent | `DEMIGOD-COMPRESSED-STATE.md` is the blackboard. If it's not written there, it didn't happen — no agent's private context is authoritative. |
| Single writer | already in base protocol | Unchanged: one of {Grok, Codex} holds the foot-core lock. Fable and Sonnet never write code, only `/tmp/` or `docs/exchange/` files. |

**Tightened role contract**
- **Fable** — plan only. Reads compressed-state + latest review, never touches code. Outputs ranked steps + exact commands.
- **Grok** — orchestrator + executor. Owns dispatch, writer lock, gates, CDN/publish. Only agent that can call something "done."
- **Codex** — code review + guarded edits. Reviews Grok's diffs before ship; edits only under an active lock claim.
- **Sonnet** — copy/audit. Checks live/static text against copy policy (no 48h/SLA/founder names), flags honesty-gate risk. Read-only.

**Weekly rhythm**
1. Mon: Fable sets the week's single next-priority (demand vs. site).
2. Daily: Grok executes ≤1 P0 change; gates after every edit; no thrash while gates are green.
3. Wed/Fri: Sonnet audits live copy; Codex reviews the week's diffs.
4. End of week: one exchange doc — ship/no-ship + next week's single next.

**Documentation rules**
- One writer per doc-edit session, no concurrent appends to the same file.
- Every exchange doc: dated filename + "Applied/Delta/Supersedes" line pointing to what it changes.
- Compressed-state is the only doc every agent must read before acting.
- Dated docs are append-only history — corrections go in a new dated doc, never edits to old ones.
