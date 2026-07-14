# MASTER OPS & INTERNAL TOOLS IMPROVEMENT PROMPT
## Demigod · implementer brief · pairs with MASTER-WEBSITE-IMPROVEMENT-PROMPT.md

You improve **internal Demigod software** (dashboard, control plane, matching OS, ship pipeline, Orca bridge, gates) — not GTM outreach. Product context: SF talent matching, pre-services honesty.

### Read first
- `docs/exchange/DEMIGOD-FULL-HISTORY-AND-TOOL-ATLAS.md` (or `prompts/demigod/` copy)
- `demigod-control.mjs`, `demigod-tools-registry.mjs`, `demigod-agent-dashboard.mjs`
- `bin/dg`, `bin/dg-orca`, `demigod-full-check.mjs`, `demigod-ship-prep.mjs`
- Matching: `demigod-pairs-lib.mjs`, `demigod-match-review.mjs`, `demigod-submissions-*.mjs`
- Ship: `demigod-publish-freeze.mjs`, `*-cdn-publish.mjs`, `demigod-cm6-paste-publish.mjs`

### Non-negotiables
1. Freeze-aware mutators (`assertNotFrozen` / `isFrozen` with env+file)
2. Board honesty writes JSON + gate in verify path
3. Matching SoR is **DEMIGOD-PAIRS** via `bin/dg matches` (pilot shortlist is legacy dual-write)
4. Registry + control plane stay the discovery surface for agents
5. Never auto-run continuous/game loops
6. File headers: purpose + related cmds + SoR on every new/touched module

### P0 tool work
1. **Live version doctor** — tool that asserts live __dgFootVer == disk, CDN hash, CSS URL; blocks false greens
2. **Route MIME checker** — fail if product URLs return text/plain; suggest /?p= or Webflow page
3. **412 recovery playbook** — detect Webflow unauthorized, print re-login steps, still verify Save landed
4. **Match queue honesty** — realProposed default everywhere (dash cache, agent-brief, spine)
5. **Job freeze parity** — every dashboard mutate job uses same isFrozen as CLI
6. **Registry completeness** — every hot bin/dg-* registered with group + purpose + out path

### P1 tool work
1. Unified `bin/dg tools` TUI (fzf) over registry groups
2. `bin/dg annotate` — print architecture for a module id
3. WIZ visual regression tool (CDP screenshots + pixel/DOM assert one active field)
4. Ship receipt JSON always written under /tmp/dg-busy/ship-receipt-*.json
5. Orca: pair token never on 0.0.0.0; doctor warns; integrate status into dash Home permanently
6. Submissions approve path only mintBoardEntry (already); add dry-run + audit log
7. Intro draft + pair consent CLI documented in control plane next tips
8. Selftest suite expands: freeze import-safe, listPairs sample filter, honesty file write

### P2 new tools (propose then build)
- `demigod-live-doctor.mjs` — single JSON health for website+ops
- `demigod-diff-live-disk.mjs` — hash table foot/head/pages
- `demigod-wiz-matrix.mjs` — matrix of viewports × flows
- `demigod-comment-audit.mjs` — modules missing file headers
- Dashboard tab: Tools browser from /api/tools
- Agent brief includes tool atlas section + last full-check

### How website prompt + tools prompt cooperate
| Website prompt owns | Tools prompt owns |
|---------------------|-------------------|
| foot-core UX/copy | gates, dash, registry |
| head CSS visual | freeze/CDN/paste reliability |
| demigod-pages content | product publish MIME + redirects |
| form conversion | usertest harness accuracy |

Ship still ends in freeze-aware path shared by both.

### Verification for tool changes
```
node demigod-tools-selftest.mjs   # if present
node demigod-full-check.mjs --skip-smoke
node demigod-control.mjs home
curl -sS localhost:9878/api/tools | head
curl -sS localhost:9878/api/orca | head
```

### Handoff
List new tools, registry entries, control plane deltas, selftest results, residual risks.

---

## ROUND-3 EXEC CHECKLIST (2026-07-14)

Current drift: **disk foot v199** · **live v198** · freeze may be ON.

### Build now (P0)
1. `demigod-live-doctor.mjs` + `bin/dg live` — JSON: disk ver, live ver, match?, css URLs, freeze, board honesty
2. `demigod-route-mime.mjs` — check product URLs MIME; exit 1 on text/plain
3. Fix `demigod-agent-smoke.mjs` to fail if live foot != expected disk when `DEMIGOD_REQUIRE_LIVE_MATCH=1`
4. Register both in tools-registry + control plane next tips
5. Expand tools-selftest if present

### Then
- full-check · ship-prep · ship v199 when freeze lifted
