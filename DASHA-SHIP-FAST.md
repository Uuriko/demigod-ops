---
status: reference
---

# Dasha fast ship

**Updated:** 2026-08-08

Publishing used to mean: many one-off MCP scripts, full CDP test suite (2–4+ minutes), how-to-buy ceremony, and separate publish. That is replaced by **one script**.

## One command

```bash
# Prepare embeds + fast gate only (~few seconds, no browser)
npm run dasha:gate:fast

# Full ship when Webflow token is valid (prep + fast gate + changed embeds + publish + live verify)
export DASHA_WF_TOKEN='…'   # or: printf '%s' '…' > /tmp/dasha-wf-token.txt
npm run dasha:ship

# Push embeds without site publish
npm run dasha:ship:push

# Read-only token, site and custom-domain access check
npm run dasha:ship:preflight

# Disk vs last verified release, changed surfaces, gates and token availability
npm run dasha:ship:status

# Slow path: full Puppeteer suite before ship
npm run dasha:ship:strict
```

## What got faster

| Before | After |
|--------|--------|
| 5 separate `dasha-call-webflow-*.mjs` + manual JSON | **One** `dasha-ship.mjs` |
| New MCP TCP/auth per surface | **One connection**, three sets, one publish |
| `dasha:test:all` (CDP × many pages) on every ship | **Fast static gate** by default; `--strict` optional |
| How-to-buy page create in every checklist | **Omitted** until route exists (404) |
| Human multi-step PUBLISH-PAYLOAD | `npm run dasha:ship` |
| Three embed writes on every run | SHA-256 delta: push only changed surfaces |
| Separate push and publish sessions | One authenticated MCP session |
| Late failure restarts the whole run | Atomic stage receipt resumes matching artifacts |
| Token failure after local work | Site/domain preflight before Webflow writes |

## Incremental and resumable behavior

- Verified artifact hashes persist in `DASHA-SHIP-MANIFEST.json`, so a reboot does not force three redundant writes.
- The current resumable run lives at `/tmp/dasha-ship-state.json`.
- A matching rerun skips gates, surface writes and publication stages that already succeeded. The
  receipt identity covers surface bytes, the shipper, release contract, focused gates and broad
  live/domain audits; changing verification logic invalidates the receipt and reruns gates.
- A full `--ship` deploys the canonical Lobby Worker when its live asset hash is stale, but only
  before any Webflow surface has been written. A partial release still fails closed instead of
  changing the Worker underneath staged Webflow content.
- The Worker release hash covers both executable Worker source and static clients/assets. Worker-only
  route changes therefore cannot hide behind an unchanged client bundle hash.
- A fully unchanged ship performs live verification but makes no Webflow connection or publication call.
- Embed writes use bounded readback polling because Webflow can acknowledge a large write several seconds before `get_settings` reflects it; publication still fails closed if exact bytes never appear.
- Use `node dasha-ship.mjs --ship --fresh` to discard a matching incomplete receipt and deliberately replay the deployment.
- `dasha-release-contract.json` owns exact required and forbidden live markers for Home, Studio and Desk.
- Site-wide verification then runs the canonical worktree `dasha-audit-live.mjs --fast`, covering
  Worker parity, SRI, social-card bytes, sitemap navigation, crypto copy/links, indexing and headers.
  A narrow `--only` verification remains narrow when it is not publishing the site.
- The manifest advances only after all routes satisfy the marker contract on `www`, apex and staging
  and the broader live audit has no hard failures.
- `dasha-product-coherence.test.mjs` prevents the Brief, Roadmap, Docs map, Simplify rules, Board data and homepage from naming competing experiments.
- The fast gate runs browser coverage only for surfaces whose verified artifact hash changed and records why every browser gate ran or skipped.

Webflow MCP 2.0 data tools run headlessly; routine shipping does not require an open Designer. Canvas navigation and visual snapshots remain separate Designer-session capabilities.

## Token

1. Prefer a **valid** Webflow site/MCP bearer in `DASHA_WF_TOKEN` or `/tmp/dasha-wf-token.txt`.
2. REST `api.webflow.com` may 401 while MCP still works (or neither). Ship fails fast with a clear error — no CDP thrash against the bot wall.

## Surfaces shipped

| Route | Source |
|-------|--------|
| `/` | `dasha-landing.html` |
| `/studio` | `dasha-studio-embed.html` (from `dasha-meme-studio.html`) |
| `/dasha` | desk embed shell from `dasha-desk/build.mjs --write` |

## Verify

```bash
npm run dasha:ship:verify
# or after ship: cat /tmp/dasha-ship-verify.json
npm run dasha:ship:test
```

## Do not

- Re-introduce multi-script publish loops
- Block ship on how-to-buy 404
- Run CDP by default for every content tweak
