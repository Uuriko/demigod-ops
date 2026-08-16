---
status: canonical
canonical_for: documentation-map
last_verified: 2026-08-11
---

# Dasha documentation map

**Start:** [`DASHA-RULES.md`](DASHA-RULES.md) (agent rules) · then owners below.  
**Archive:** [`archive/dasha-docs/`](archive/dasha-docs/) — evidence only, not instructions (~65 files moved 2026-08-11).

Iterative audit, fix and feature loop: [`DASHA-ITERATIVE-QUALITY-PLAN.md`](DASHA-ITERATIVE-QUALITY-PLAN.md).

**Surfaces (product vocabulary):** Home · Simp Board `/simp` · Chess `/chess` · Studio · Desk ·
Lobby (`lobby.getdasha.com`) · Faucet `/faucet` (plus how-to-buy).

**Hosts:** `www.getdasha.com` is Webflow plus edge Worker routes; `lobby.getdasha.com` is the
Cloudflare Worker and its Durable Objects (Simp Board, chess, forum, referrals, faucet).
Page-level titles, descriptions and Open Graph values are the contract in
[`dasha-webflow-metadata.mjs`](dasha-webflow-metadata.mjs) (`WEBFLOW_METADATA`) — change them there,
not by hand in Designer, or the next publish silently reverts them.

> **Live drift, 2026-08-15.** `/studio`, `/dasha` and `/desk` currently 308 to home while this file
> and `DASHA-PRODUCT-BRIEF.md` describe Studio and Desk as active. The user's direction call keeps
> them active, so the redirects are the defect — restoring those two surfaces is a publish, not a
> doc edit. `dasha-live-verify` reports it as `canonical-surface-redirected` and exits 1 until it is
> fixed; that red is expected, not a broken gate. `/airdrop`, `/earn` and `/claim` are live but 308
> and are not surfaces — see `DASHA-ROADMAP.md` D8.

## Read path (active work)

1. [`DASHA-RULES.md`](DASHA-RULES.md) — hard gates and habits  
2. [`DASHA-PRODUCT-BRIEF.md`](DASHA-PRODUCT-BRIEF.md) — what Dasha is  
3. [`DASHA-CULTURE-STUDIO-PRODUCT.md`](DASHA-CULTURE-STUDIO-PRODUCT.md) — Remixable Culture Studio (factory + growth + social); lead product bet  
4. [`DASHA-ROADMAP.md`](DASHA-ROADMAP.md) — what evidence unlocks next  
5. [`DASHA-WORKFLOW.md`](DASHA-WORKFLOW.md) — SoR paths, verify, ship  
6. [`DASHA-CLAIMS.md`](DASHA-CLAIMS.md) + [`DASHA-THREAT-MODEL.md`](DASHA-THREAT-MODEL.md) when copy or security touches release  

Optional: [`DASHA-BIBLE.md`](DASHA-BIBLE.md) voice · [`DASHA-ART-DIRECTION.md`](DASHA-ART-DIRECTION.md) look · [`DASHA-SIMPLIFY.md`](DASHA-SIMPLIFY.md) kill-list · [`DASHA-SHIP-FAST.md`](DASHA-SHIP-FAST.md) ship CLI · [`DASHA-OPEN-SOURCE.md`](DASHA-OPEN-SOURCE.md) OSS · [`DASHA-TRANSMISSION-001.md`](DASHA-TRANSMISSION-001.md) optional experiment.

Orientation snapshot (not mutable truth): [`DASHA-COMPLETE-GUIDE.md`](DASHA-COMPLETE-GUIDE.md).  
Listings pack: [`DASHA-DEX-SUBMISSION.md`](DASHA-DEX-SUBMISSION.md).  
Marketing incentive boundary: [`DASHA-CRYPTO-MARKETING-BOUNDARY-2026-08-09.md`](DASHA-CRYPTO-MARKETING-BOUNDARY-2026-08-09.md).

## Canonical ownership

| Question | Owner |
|---|---|
| Agent rules / gates | `DASHA-RULES.md` |
| What is the product? | `DASHA-PRODUCT-BRIEF.md` |
| Culture Studio / OCO / factory+growth+social features | `DASHA-CULTURE-STUDIO-PRODUCT.md` |
| What next, under what evidence? | `DASHA-ROADMAP.md` |
| How to edit, verify, publish? | `DASHA-WORKFLOW.md` |
| Voice and culture | `DASHA-BIBLE.md` |
| Public claims | `DASHA-CLAIMS.md` |
| Security controls | `DASHA-THREAT-MODEL.md` |
| Visual system | `DASHA-ART-DIRECTION.md` |
| Surface kill-list | `DASHA-SIMPLIFY.md` |
| Doc map (this file) | `DASHA-DOCS.md` |

## Recent working receipts (archived)

Evidence only — not standing instructions:

- [`archive/dasha-docs/DASHA-ATTENTION-AUDIT-2026-08-11.md`](archive/dasha-docs/DASHA-ATTENTION-AUDIT-2026-08-11.md)
- [`archive/dasha-docs/DASHA-GROWTH-X-AUDIT-2026-08-11.md`](archive/dasha-docs/DASHA-GROWTH-X-AUDIT-2026-08-11.md)
- [`archive/dasha-docs/DASHA-CLAUDE-WAVE1-UX-2026-08-11.md`](archive/dasha-docs/DASHA-CLAUDE-WAVE1-UX-2026-08-11.md)
- [`archive/dasha-docs/DASHA-BUG-FIX-PLAN.md`](archive/dasha-docs/DASHA-BUG-FIX-PLAN.md)

## Historical (thin stubs at root; full text often in archive)

Retired directions stay `status: historical` with `superseded_by` for the docs gate: strategy, Discord blueprint, settlement/gamification specs, pivot decision.

## Generated

- `DASHA-DOC-REGISTRY.md` — `node dasha-doc-registry.mjs --write`  
- `DASHA-NOW.md` — ship status  

## Demigod

Out of scope until the user reopens it. Machine entry: root [`AGENTS.md`](AGENTS.md).
