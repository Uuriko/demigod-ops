# Dasha audit/test/bugfix round — Grok + Claude — 2026-08-08

## Coordination
- Shared bus: `DASHA-LIVE-CONTEXT.md`, `docs/exchange/DASHA-PEER-INBOX.md`, filesystem `dg-bus`
- Claude concurrent: docs reconciliation tasks + earlier STOP note on Studio dual-deploy
- Grok: full unit suite, full live audit (protocol), lobby-live fix, studio path note

## Results

| Gate | Result |
|------|--------|
| `dasha:test:all` | **PASS** (desk, mint, culture, lobby, simp, landing puppeteer, ship-readback hash) |
| `dasha:audit:tools` | **PASS** |
| `dasha:meta` | **ok** soft: www robots/sitemap |
| `dasha-audit-live` (full protocol) | **announce-ready** soft: howto-404, sitemap-404, robots-empty |
| `dasha-lobby-live` | **PASS** after hang fix (~15s with join cooldown) |

## Bugs fixed this round

1. **`dasha-lobby-live.test.mjs` hang** — `setTimeout` poll loops kept running after reject, so Node never exited (could spin 5+ minutes). Fixed: `done` flag, clear all timers, terminate sockets, overall 45s deadline, origin-block must see 403 (not “any error”).
2. **Studio dual-deploy confusion** (Claude) — Documented **single canonical path**: inline `dasha-studio-embed.html` via `dasha-ship` only. Do not also CDN-upload `dasha-studio-embed.js` for the same page. Note in `dasha-studio-embed-build.mjs`.

## Resolved / not bugs

- **CC0 missing on live Studio** — Claude re-checked: no CC0 string in source by design (synthetic palette art; comment says no third-party likeness to license). Footer has high-risk + endorsement disclaimer. Not a missing dedication bug.
- **Inline vs CDN Studio** — Claude confirms inline is the documented deploy source until one CDN URL is recorded; Grok ship matches that.

## Soft lag (unchanged)

- www `robots.txt` empty / `sitemap.xml` 404 (lobby fallback live)
- how-to-buy 404 intentional

## Open (low priority)

- Legacy tests can hang on CDP (`dasha-conviction-receipt`, `dasha-receipts-worker`) — scrapped product; not in `dasha:test:all`
- Doc sprawl of dated `DASHA-*.md` at root (Claude): classified in DOC-OF-DOCS but not archived
- Webflow MCP token expiry (operational)

## Claude quote (stateless consult this round)

> Confirm **inline** studio deploy… Hashed CDN is future only, never both.  
> CC0 premise was stale vs current source design.
