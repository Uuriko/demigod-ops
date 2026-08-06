# Demigod — Agent rules (Webflow site mirror)

**Live on Webflow:** `rules/demigod-agent.md` via Agent Instructions API (site `6a34c484dcedc18a17408187`).  
**Mirror path:** this file (repo SoR for the same text).  
**Audience:** Grok, Claude Code, Codex, Cursor — any agent with Webflow MCP.

**Site:** talentlink-sf → www.trydemigod.com  
**Rules:** Product first; no auto-DM; no game work. Read current receipts for task context.

## Positioning

- Demigod is **tech with humans in the loop** — not hand-matched agency theater, not fully autonomous black-box matching.
- Dual path: **I'm hiring** / **I'm looking** — seamless, minimal copy.
- No fake metrics, logos, candidate counts, or "48h/SLA" promises on live site.
- Pre-services: Twilio/Stripe/SMS use **pending** language only.
- Contact: `hello@trydemigod.com will follow up` — no founder names on live.

## Source of truth (do not invent parallel paths)

| Layer | SoR |
|-------|-----|
| Product runtime (WIZ, honesty, dual-path UI) | `demigod-foot-core.js` → CDN; footer loader only |
| Early CSS / FOUC / path redirects | `demigod-head-minimal.html` / head CSS CDN |
| Static layout / SEO / components | Designer (MCP + Bridge) |
| CMS content | Data API / MCP |
| Ship | `bin/dg` ship spine (lock → CDN pin → CM6 head+footer → publish → truth) |

## Who does what

- **MCP Data** (no Bridge): CMS, pages metadata, SEO, assets, webhooks, publish, Analyze, agent instructions.
- **MCP Designer** (Bridge App open): canvas structure, styles, selection, components.
- **CDP ship** (`bin/dg-webflow`, CM6): large Custom Code pastes — not MCP megabyte blobs.
- **chrome-devtools MCP**: live proof on trydemigod.com (screenshots, console, a11y).
- **Foot CDN**: product behavior — prefer here over Designer DOM thrash for WIZ/honesty.

## Hard stops

- No auto-DM / outreach automation unless explicitly requested.
- Eat the Sounds game: do not touch unless user reopens it.
- Do not invent second publish/paste scripts — extend existing ship.
- Never put API tokens in Custom Code or foot-core.
- Board honesty: ≤3 seed roles; real receipts only.
- Prefer Designer permanent fixes for static false claims; foot scrubs are runtime honesty only.

## Copy discipline

- Minimal. No dense link farms. Clear hierarchy.
- High-signal fields (e.g. 90-day outcome) matter more than chrome.
- Review step before submit on WIZ paths.

## Verify after changes

`npm run demigod:verify:source` · board-honesty · live truth after ship.

## Connect surfaces (this machine)

| Surface | Command / path |
|---------|----------------|
| Connect doctor / setup | `bin/dg-webflow connect` · `connect setup` · `docs/WEBFLOW-MCP-SETUP.md` |
| Open Designer Bridge | `bin/dg-webflow connect bridge` |
| Grok MCP OAuth | `/mcps` → webflow → `i` (once) |
| chrome-devtools MCP | CDP `:9223` · live proof |
| Site token (REST) | `~/.config/demigod/webflow.env` → `WEBFLOW_API_TOKEN=` |
| Token check | `node demigod-webflow-token.mjs` |
| Webhooks | public URL + `npm run demigod:webhook:setup` or MCP `data_webhook_tool` |
