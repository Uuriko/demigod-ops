# Dasha multi-agent docs consensus — 2026-08-08

**Participants:** Grok (author of product arc) · Claude (`ask-claude`) · Codex (`codex-ask`)  
**Input:** `docs/exchange/DASHA-GROK-SESSION-BRIEF-2026-08-08.md`  
**Replies:** `/tmp/dg-busy/dasha-claude-docs-reply.txt`, `/tmp/dg-busy/dasha-codex-docs-reply.txt`

## Verdict

| Agent | Live-truth brief | Notes |
|-------|------------------|--------|
| Claude | **PASS** | Re-ran `dasha:meta`, `dasha:audit:tools`, `dasha:audit:live:fast`; matches brief |
| Codex | **PASS** (with ship risk) | Docs rewrite plan; P0 readback fail-open in ship |

## Agreed doc taxonomy

| File | Status |
|------|--------|
| `DASHA-DOCS.md`, `DASHA-META.md` | CURRENT |
| `DASHA-PRODUCT-BRIEF.md`, `DASHA-ROADMAP.md`, `DASHA-WORKFLOW.md` | CURRENT after rewrite (this session) |
| Dated `DASHA-*-2026-08-*.md` reviews | HISTORY |
| Thesis/receipts/archive | SCRAP — do not revive |
| `DASHA-DISCORD-BLUEPRINT.md` | Historical / optional secondary |
| Casino/thesis/Discord-HQ product language | SCRAP |

## Merged actions (done by Grok)

1. Rewrote `DASHA-PRODUCT-BRIEF.md` (Codex draft + Claude direction).
2. Rewrote `DASHA-ROADMAP.md` to playground + current order; historical banner; “frozen” not “immutable”.
3. Rewrote `DASHA-WORKFLOW.md` publication matrix/decision log to 2026-08-08; Discord optional.
4. Updated `DASHA-META.md` ship-risk language; www SEO still residual.
5. **Codex P0:** `dasha-ship.mjs` readback is fail-closed (no warn-and-continue on query errors; require all surfaces).
6. Pointed `DASHA-DOCS.md` map at exchange receipts.

## Residual (soft / human)

- Webflow Site SEO paste for **www** robots + sitemap (lobby fallback already live).
- Optional: tighten readback to full-hash equality (Codex); multi-edge hard fail after deploy window.

## Agent start-here (consensus)

Start with `DASHA-DOCS.md`, then `DASHA-WORKFLOW.md`, `DASHA-PRODUCT-BRIEF.md`, `DASHA-ROADMAP.md`, and `DASHA-META.md`. Current Dasha is Home + Studio + Desk + on-site Lobby and opt-in Simp Board. Lobby is public chat; Discord is not HQ. Thesis Card, conviction receipts, Pair, forecasting/rounds, casino positioning and Catbox publication are historical or scrapped—do not test, deploy, integrate or revive them. Canonical shipping is `dasha-ship.mjs` with mandatory Webflow readback; verify with `npm run dasha:meta` and `dasha:audit:live:fast`. Never treat a dated review as current truth.
