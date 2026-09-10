# DEMIGOD-SHIP — blank Start a brief CTA — 2026-09-10 ~12:32 PM PT

| Field | Value |
|---|---|
| Script | `demigod-html` |
| Version ID | `ea251881-7fd9-4dca-bc38-da3303da72c0` |
| Upload | 218.11 KiB / gzip 50.21 KiB |
| SoR | box `/workspace/demigod-blank-cta-ship` (surgical patch of live Worker) |
| Hop | CLAIMS_UNREACHABLE · `DASHA_SHIP_SKIP_CLAIMS=1` |
| Lane | Demigod CDN leftover · **not** Instinct Compute / Phase 0 |

## Conversion fix (ONE)

**Before:** Home primary + close `Start a brief` used `namedBriefHref(map)` → prefills first weekly mover (`yc:array-labs` / Array Labs).

**After:** `const briefHref = "/?wiz=startup"` — blank CTA. Packet dir (`one packet`) unchanged.

## Live proof

- https://www.trydemigod.com/ — `#brief` + close CTA `href="/?wiz=startup"` only
- https://www.trydemigod.com/?wiz=startup — `home-wiz` 200
- https://www.trydemigod.com/packets · `/companies` — hold

Worker mirror is box/live edge (not this repo). This note records the ship for project-room #11.
