---
status: canonical
canonical_for: dasha-meta
last_verified: 2026-08-17
---

# Dasha meta

Door for docs truth, SEO artifacts, and ship wiring. The gate is `node dasha-meta.mjs` (`npm run dasha:meta`).

- Robots / sitemap on disk: `dasha-robots.txt`, `dasha-sitemap.xml`
- Live context rewrite: `dasha-context-refresh.mjs` → `DASHA-LIVE-CONTEXT.md`
- Peer ping: `dasha-peer-ping.mjs`
- Tool audit: `npm run dasha:audit:tools` → `dasha-audit-tools.mjs`
- Ship: `dasha-ship.mjs` (prepare ≠ publish)

Do not invent a sixth colour, a Telegram community, or points for buys, likes, or referrals.
