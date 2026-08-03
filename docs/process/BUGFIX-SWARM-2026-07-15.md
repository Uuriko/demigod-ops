# Bugfix swarm 2026-07-15

**Agents:** Codex site + Codex tools (Fable timed out). Grok applied fixes.
**Live:** foot **v211** (gist CDN) · `live-attest` strict PASS · freeze ON

## Fixed

| Sev | Bug | Fix |
|-----|-----|-----|
| P0 | `/api/orient` `spawnSync` without import | import in dashboard |
| P1 | `getLockWho()` returned full status | returns `who` only + `getLockStatus()` |
| P1 | ship-receipt defaulted ok=true | requires `--ok 0\|1` |
| P1 | CM6 catbox-only (gist fail) | gist in footish/api/live checks |
| P1 | live-attest soft SHA | SHA required unless `--soft` |
| P1 | live-attest last-.js fallback | allowlisted hosts only |
| P2 | WIZ "N of 7" wrong on review | count excl. submit/thanks; clamp bar |
| P2 | closePage left `?p=` | always clear p/page |
| P2 | registry duplicate handoff id | `handoff-legacy` |
| P0 ops | catbox 0-byte | auto **gist fallback** in CDN publish |

## New tools (from prior swarm wants)

- `bin/dg live-attest` · `bin/dg ship-receipt`
- `GET /api/orient` · ship writes receipts on cdn/paste/verify

## Residual

- CM6 can still false-green if CDN already live
- Catbox still broken; gist is the working CDN path
- tools-os-selftest may fail lock-require if lock held mid-run
