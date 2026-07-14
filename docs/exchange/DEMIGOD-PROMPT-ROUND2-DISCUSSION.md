# Prompt Round-2 Discussion — Website + Tools

**Date:** 2026-07-14  
**Inputs:** Codex/Claude/Fable MASTER improve prompts · Full History & Tool Atlas · this session ships v196–v198

## What the first prompts got right
- Honesty contract and dual-CTA rule
- Canonical foot-only JS
- WIZ as conversion core
- Ship state machine (freeze → CDN → CM6 → live verify)
- Concrete P0 bugs (forceMobileDesktopWIZ, smoke version, 412, MIME)

## What was missing (history-informed)
1. **Tooling half of the company** — 244 mjs + 55 bins + dashboard were under-specified
2. **Atlas/discovery** — agents reinvent tools without `bin/dg tools` / registry
3. **Matching SoR** — pairs vs pilot shortlist confusion
4. **Post-ship freeze culture** — thrash prevention as first-class
5. **Comment/annotation policy** — file headers + function maps, not line spam
6. **Coordination** — website prompt must call usertest/ship-prep/full-check by name

## Decisions for prompt v2
| Decision | Rationale |
|----------|-----------|
| Split website vs ops prompts | Parallel agents without stepping on SoR |
| Merge file with Section A brief | One paste for implementer |
| Require tool hooks in website work | Tests stay green; smoke can trust versions |
| Explicit “no line-by-line comment spam” | Maintainability |
| Add live-doctor + MIME checker as P0 tools | Recurring ship pain |

## Updated prompt set
1. `prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md` (+ Round-2 addendum)
2. `prompts/demigod/MASTER-OPS-TOOLS-PROMPT.md` (**new**)
3. Codex/Claude/Fable appendices unchanged as depth sources
4. Atlas: `docs/exchange/DEMIGOD-FULL-HISTORY-AND-TOOL-ATLAS.md`
5. Indexes: MODULE-INDEX, BIN-INDEX, FOOT-CORE-FUNCTION-MAP

## Next run protocol
1. Agent A: execute website Section A (disk)
2. Agent B: execute ops tools P0
3. Agent C: debate/review A+B outputs
4. full-check + usertest + ship-prep
5. freeze off only for intentional ship

