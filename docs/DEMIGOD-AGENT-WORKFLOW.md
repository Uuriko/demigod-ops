# Demigod agent workflow (this machine)

**Authority:** [`DEMIGOD-SIMPLE.md`](../DEMIGOD-SIMPLE.md) is the entry card.  
**Doc map:** [`DOCS.md`](../DOCS.md).  
**Release truth:** `bin/dg truth` only — never paste versions into this file.

## Loop

```text
orient / session  →  one goal  →  smallest edit  →  verify  →  (optional authorized ship)  →  stop or keep-working
```

| Step | Command | Notes |
|------|---------|--------|
| Start | `bin/dg session` or `bin/dg orient` | green / freeze / NEXT / demand |
| Discover work | `node demigod-work-find.mjs` | Prefer concrete over thrash |
| Truth | `bin/dg truth` | disk vs live; prepare-only lag is normal without ship auth |
| Foot edit | `bin/dg lock claim` → edit → `lock release` | one writer; home SoR often `/home/potter` |
| Verify | `npm run demigod:verify:source` | honesty if board |
| Roles refresh | `node demigod-roles-pipeline.mjs` | disk + footer embed; not live alone |
| Ship prepare | `bin/dg ship prepare` | never publishes |
| Ship (authorized only) | `DEMIGOD_CURRENT_REQUEST_PUBLISH=1` + lock + `bin/dg ship run` | see [`SHIP-AND-CDN.md`](SHIP-AND-CDN.md) |
| Webflow spine | `bin/dg webflow connect setup` | MCP OAuth separate |

## Sources of truth (do not invent)

| Concern | Where |
|---------|--------|
| Foot behavior | `demigod-foot-core.js` |
| Head CSS | `demigod-head-styles.css` / head-minimal |
| Footer loaders + public roles payload | `demigod-footer-lite.html` |
| CDN pin | `DEMIGOD-FOOT-CDN.json` + jsDelivr commit |
| Matching samples | `DEMIGOD-BOARD.json` (honesty) |
| Observed roles | roles pipeline → public-roles → footer / `#dg-observed-roles` |

## Multi-agent (opt-in)

- **Default: one agent.**  
- Claude/Codex when blocked, high-risk, or reviewing a finished draft.  
- Do **not** auto-spawn continuous swarms unless the user asks.  
- Standing keep-working: `/tmp/dg-busy/KEEP_WORKING` + useful-loop — see [`DEMIGOD-KEEP-WORKING-PROMPT.md`](../DEMIGOD-KEEP-WORKING-PROMPT.md).

## Do not thrash

- Green site + empty pilots → demand/warm work, not endless CSS.  
- Disk ahead of live is **expected** until current-request publish.  
- Prefer delete/simplify (ponytail).  
- Prefer `/home/potter` (`DEMIGOD_ROOT`) when timers and ship use that SoR; worktrees can lag.

## Related guides

| Topic | Doc |
|-------|-----|
| Ship / CDN / paste | [`SHIP-AND-CDN.md`](SHIP-AND-CDN.md) |
| Roles observation | [`ROLES-PIPELINE.md`](ROLES-PIPELINE.md) |
| Handbook | [`DEMIGOD-HANDBOOK.md`](DEMIGOD-HANDBOOK.md) |
| Resources / modules | [`DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md`](DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md) |
