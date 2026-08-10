# Dasha meta layer

**Purpose:** Keep ship, SEO, docs, and legacy paths honest so product work does not re-break.

**Gate:** `npm run dasha:meta` · full stack: `npm run dasha:audit`

## What “meta” means

| Layer | Owner | Truth |
|-------|--------|--------|
| Embeds (home/studio/desk) | `dasha-ship.mjs` | Push → **SHA-256 readback** per surface → publish |
| Studio source | `dasha-studio-embed.html` **inline only** | Do not dual-publish CDN `.js` for `/studio` (clobber risk) |
| Lobby/Simp runtime | `dasha-lobby-worker.mjs` | `npm run dasha:lobby:deploy` |
| Client JS | `dasha-lobby-assets-build.mjs` | Served at `lobby.getdasha.com/client/*` |
| Live announce | `dasha-audit-live.mjs` | Worker + site + optional WS protocol |
| Tools self-test | `dasha-audit-tools.test.mjs` | Soft-lag logic, hang safety, wiring |
| Meta gate | `dasha-meta.mjs` | Docs, legacy, SEO disk, lobby SEO live |
| Shared NOW | `DASHA-LIVE-CONTEXT.md` | All agents read/write; refresh + peer-ping |
| Docs map | `DASHA-DOCS.md` + this file | Current live truth only |

## SEO

| Artifact | Disk | Live target |
|----------|------|-------------|
| `dasha-robots.txt` | yes | Prefer **www** Site settings → SEO; **also** `https://lobby.getdasha.com/robots.txt` |
| `dasha-sitemap.xml` | yes (3 routes) | Prefer **www** custom sitemap; **also** `https://lobby.getdasha.com/sitemap.xml` |
| Page titles / OG | Webflow page settings | Updated via MCP `bulk_update_pages` (no “casino is open”) |

www still DNS-only to Webflow (not CF-proxied), so edge workers cannot intercept `/robots.txt` on the apex without changing DNS. Lobby host is the automated fallback; homepage links `rel=sitemap` to the lobby sitemap.

**Remaining Webflow configuration:** Site settings → SEO must serve prepared robots + sitemap on **www**. Until then lobby-host versions are **fallbacks**, not substitutes for www SEO correctness.

## Known ship risk (mitigated)

`dasha-ship.mjs` must fail closed on readback: **SHA-256 of embed body** (line-ending normalized) must match disk, markers must remain, and query/parse failures on any surface block publish. Fast ship verify uses `dasha-audit-live --fast` (no WS protocol unless `DASHA_AUDIT_PROTOCOL=1` or `--strict`) and then `dasha-domain-check.mjs` for DNS/TLS/redirect/HSTS policy. Soft lag in announce-ready must be reported as soft lag, not paraphrased as fully healthy.

## Legacy (do not ship)

| Path | Status |
|------|--------|
| `bin/dasha-publish` | Hard-abort; use `dasha-ship` |
| `dasha-call-webflow-*.mjs` | LEGACY one-shots; use `dasha-ship.mjs` |
| `dasha-conviction-receipt*`, `dasha-receipts-*` | Scrapped product; tests may remain hermetic |
| Thesis / forecasting / Discord-as-HQ | Docs only; Lobby is on-site chat |

## Shared context (Grok ⇄ Claude ⇄ Codex)

| Piece | Role |
|-------|------|
| [`DASHA-LIVE-CONTEXT.md`](DASHA-LIVE-CONTEXT.md) | Living NOW file — read first, rewrite often |
| `npm run dasha:context:refresh` | Rebuild Live section from meta + audit JSON |
| `npm run dasha:peer-ping` | Refresh + append peer inbox + `dg-bus send` claude/codex (filesystem bus, no Orca) |
| `docs/exchange/DASHA-PEER-INBOX.md` | Durable ping log in-repo |
| Ship hook | `dasha-ship.mjs` stamps NOW on success/fail |

## Commands

```bash
npm run dasha:meta              # this gate (+ offline context stamp)
npm run dasha:context:refresh   # live NOW from gates
npm run dasha:peer-ping -- --note="what changed"
npm run dasha:audit:tools       # auditors self-test
npm run dasha:audit:live:fast   # worker+site
npm run dasha:audit:live        # + WS protocol (~15s)
npm run dasha:audit             # meta + tools + test:all + live protocol
node dasha-ship.mjs --ship      # only with current publish authorization
```

## Soft lag allowlist (announce-ready still OK)

- `howto-404` — route intentionally unpublished  
- `sitemap-404` / `robots-empty` on **www** until Webflow SEO field is filled  
- `health-assets-mixed` — brief dual Worker versions after deploy  
