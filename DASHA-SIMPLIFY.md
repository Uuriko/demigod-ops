---
status: reference
canonical_for: public-surface-kill-list
last_verified: 2026-08-08
---

# Dasha simplify map

Updated: 2026-08-08  
Purpose: kill-list and keep-list so agents do not mistake five focused routes for five products.

## Public website (keep)

| Route | Job | Notes |
|-------|-----|--------|
| `/` | Studio entry + Lobby + opt-in Simp Board + mint + buy | Board rows are measured only after explicit X-linked join; PerryALPHA remains a disclosed non-measured editorial #1. No standalone leaderboard route. |
| `/studio` | Create / edit / export | Procedural looks, local upload and a sourced Dasha image gallery in one simple tool. |
| `/lobby` | Public chat | Separate, deliberately sparse community room. |
| `/dasha` | Desk: verify, chart, sources, culture stills | Source-linked token and culture reference surface. |
| `/how-to-buy` | Four-step buy guide | Edge-served from the canonical source; custom domains return 200 while Webflow staging intentionally does not own the route. |

**Outbound culture:** `https://x.com/dash_eats` primary · `$dasha` live search secondary.

**Buy language:** prefer **Buy $dasha ↗** on primary CTAs; keep one **Open Jupiter directly** text link as fallback wording.

## Do not grow onto the public nav

- Relay lab, remix-pack / capsules, logo lab  
- Conviction receipts / thesis / forecasting  
- Discord; Lobby is the current community surface
- Telegram (`t.me/dashacommunity`)  
- Social feed or standalone leaderboard route. The Studio image gallery and live in-page opt-in Simp Board are bounded parts of existing surfaces.

## Feature add order (evidence-gated)

1. Keep the live Home + Studio + Desk + Lobby + Board system coherent and verifiable.
2. Measure export + remix-link reuse + Lobby/Board participation + buy handoff without wallet telemetry.
3. **Remix Relay only** if strangers produce second-generation edits.  
4. Capsules / kits only if group behavior appears.  
5. Never revive receipts/thesis.

## Repo keep vs freeze

### Keep sharp
- `dasha-landing.html` + `dasha-landing.test.mjs`
- `dasha-meme-studio.html` + `dasha-meme-studio.test.mjs`
- `dasha-desk/` (body, styles, app.js, build, config) + `dasha-desk.test.mjs`
- `dasha-growth.test.mjs`
- `DASHA-BIBLE.md` · `DASHA-PRODUCT-BRIEF.md` · `DASHA-ROADMAP.md` · `DASHA-WORKFLOW.md` · `DASHA-DOCS.md` · this file
- `.tmp-dasha-ship/publish-ready/` when preparing ship

### Freeze (do not “improve” unless reopened by name)
- `dasha-conviction-receipt*` · `dasha-receipts-*` · receipt schema/worker  
- `DASHA-SPEC-GAMIFICATION.md` · `DASHA-SPEC-SETTLEMENT.md`  
- Dated pivot/landscape one-shots as **history**, not current backlog  
- One-off `dasha-call-webflow-*.mjs` after a stable publish path exists  
- `dasha-relay-lab.html` · `dasha-remix-pack.html` · `dasha-logo-lab.html` until a named experiment needs them  

### How-to-buy rule
`dasha-how-to-buy.html` owns the live custom-domain route through the Dasha Worker. Keep it linked,
mint-locked and covered by the live audit; do not invent a duplicate Webflow page solely to make the
staging subdomain match.

## Agent checklist

- [ ] Change only one public surface’s job per PR-sized edit  
- [ ] Run the smallest Dasha gate for that surface  
- [ ] No Demigod work while Dasha is the active user project  
- [ ] Publish only on current-request Webflow authorization  
- [ ] Association ≠ endorsement; no official/safe/verified/endorsed mint language  

## One-line spine

**Create, gather, verify, buy. Everything else is archive or experiment.**
