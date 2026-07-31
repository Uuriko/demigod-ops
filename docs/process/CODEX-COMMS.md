# Communicating with Codex (Demigod)

How Grok / Claude / scripts talk to Codex without corrupting sessions or thrashing.

## Pick a channel

| Need | Use | Notes |
|------|-----|--------|
| **Tracked multi-step work** | `bin/dg-bus task codex --title "…" --spec "…"` | Creates Orca task + inject + wake. Best default for real work. |
| **Status / ack / handoff note** | `bin/dg-bus send codex --subject "…" --body "…"` | Orchestration message; Codex must `orchestration check --unread --inject` (or bus wake). |
| **Stateless second opinion** | `bin/codex-ask "…"` | Fresh `codex exec`, **read-only** sandbox by default. Never attaches to the live TUI. |
| **Wake idle TUI** | `bin/dg-bus wake codex` | Pastes the orchestration check command into the terminal. |
| **Empty shell** | `bin/dg-bus shell-start codex` | Starts `codex` + sticky role hint. Skip update nag with `unstick`. |
| **Ownership handoff** | `bin/dg-orca spawn codex "…"` | New terminal; prefer for long parallel ownership. |

**Never** `terminal send` into an interactive Codex session *while also* running `codex-ask` against the same live resume, and never two writers on one TUI. `codex-ask` is always a **new** exec session.

## Prompt shape that works

Codex does best with **review-shaped, evidence-first** specs:

1. **ROLE** — e.g. `Review-only PASS/BLOCK` or `Investigate + report, no ship`
2. **TRUTH** — “`bin/dg truth`; expect disk=live v859; note sibling drift”
3. **SCOPE** — exact files / routes; **out of scope** (foot lock owner, publish)
4. **DO** — numbered steps, each with a command or artifact path
5. **OUT** — single report path under `/tmp/dg-busy/…md`
6. **DONE** — `worker_done` with `reportPath=…` (for Orca tasks)

Prefer **PASS/BLOCK + risks + next agent action** over open-ended “improve the site.”

### Example (good)

```bash
bin/dg-bus task codex --title "map-data sibling drift" --spec "$(cat <<'SPEC'
ROLE: Review-only PASS/BLOCK. No foot-core edits (lock may be held). No ship unless DEMIGOD_CURRENT_REQUEST_PUBLISH already set for this collab and you claim no conflicting lock.

CONTEXT: truth reports mapData unexplained: disk companies 2722 vs live 2728. Atlas matched. Foot v859 sealed.

DO:
1. bin/dg truth — paste siblingDrift lines
2. Compare disk DEMIGOD-SF-STARTUP-MAP.json vs live CDN map-data URL from DEMIGOD-FOOT-CDN.json
3. Identify rebuild path: node demigod-startup-map-data.mjs [--with-jobs]
4. Write /tmp/dg-busy/codex-map-data-drift.md: PASS if intentional rebuild+ship is enough; BLOCK with risks if data quality issues
5. worker_done reportPath=/tmp/dg-busy/codex-map-data-drift.md

Ponytail. No invent pilots/SLA.
SPEC
)"
# Dual-path: also paste a one-liner into the TUI so inject is not the only wake
orca-ide terminal send --terminal "$(python3 -c 'import json;print(json.load(open("/tmp/dg-busy/agent-roster.json"))["primary"]["codex"]["handle"])')" \
  --text "Review mapData disk vs live drift; write /tmp/dg-busy/codex-map-data-drift.md PASS/BLOCK. No foot edit." --enter
```

## Dual-path wake (what actually works)

Orca inject alone sometimes sits unread. Pattern that worked in this studio:

1. `dg-bus task codex …` (tracked + inject)
2. `orca-ide terminal send --terminal <codex-handle> --text "…" --enter` (visible prompt)
3. Coordinator later: `bin/dg-bus wait --timeout-ms 300000` or poll `/tmp/dg-busy/<report>.md`

Resolve handle every time via `bin/dg-bus roster` (never hardcode `term_*` in docs).

## Role resolution gotchas

- Codex TUI title often stays `potter` — sticky **role hints** after `shell-start` matter.
- Scrollback can mention “codex”/“grok” and confuse classify; bus prefers **title + hints**.
- After Orca restart: `bin/dg-bus roster` then re-hint if needed.

## What Codex is best at here

- PASS/BLOCK reviews of foot/ship/gate diffs
- Form contracts, route/canonical honesty, gate regex thrash
- Sibling asset / CDN identity checks
- “Is this safe to ship?” with evidence

Less good as sole owner of long multi-file foot thrash while another agent holds the foot lock — use **read-only review** or wait for lock free.

## Coordinator checklist

```bash
bin/dg-bus roster
bin/dg-bus status
# after dispatch
test -f /tmp/dg-busy/codex-….md && head -40 /tmp/dg-busy/codex-….md
# or
bin/dg-bus wait --timeout-ms 300000
# ack
bin/dg-bus send codex --subject "ack …" --body "Got report. Next: …"
```

## Related

- Protocol spine: [`AGENT-COMMS.md`](../../AGENT-COMMS.md)
- Peer bus: [`AGENT-PEER-BUS.md`](AGENT-PEER-BUS.md)
- CLI: `bin/codex-ask`, `bin/dg-bus`, `bin/dg-orca`
