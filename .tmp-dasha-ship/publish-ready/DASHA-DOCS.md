# Dasha documentation map

Start here for all Dasha work. Demigod is out of scope until the user explicitly reopens it.

| Document | Purpose | Status |
|---|---|---|
| [`DASHA-WORKFLOW.md`](DASHA-WORKFLOW.md) | Sources of truth, work loop, status vocabulary and publication matrix | Current; operational entry after this map |
| [`DASHA-BIBLE.md`](DASHA-BIBLE.md) | Culture, design voice, image library, X sources, agent checklist | Current bible |
| [`DASHA-SIMPLIFY.md`](DASHA-SIMPLIFY.md) | Keep/freeze routes and repo kill-list; evidence-gated feature order | Current |
| [`DASHA-DOMAIN-WEBFLOW-LAUNCH.md`](DASHA-DOMAIN-WEBFLOW-LAUNCH.md) | Current domain IDs, route sources, metadata and live publication gate | Current deployment runbook |
| [`dasha-sitemap.xml`](dasha-sitemap.xml) | Bounded custom sitemap for Home, Studio and Desk | Prepared; not live |
| [`dasha-how-to-buy.html`](dasha-how-to-buy.html) | Four-step wallet, mint, Jupiter quote and confirmation guide | Prepared source only; unlinked until a Webflow route exists |
| [`DASHA-CRYPTO-LANDSCAPE.md`](DASHA-CRYPTO-LANDSCAPE.md) | Current crypto culture-product landscape and pivot tests | Active research map |
| [`DASHA-PRODUCT-OPTIONS-2026-08-07.md`](DASHA-PRODUCT-OPTIONS-2026-08-07.md) | Ranked product families, falsification tests and current decision | Current product options map |
| [`DASHA-STUDIO-DEEP-FEATURE-PROMPT.md`](DASHA-STUDIO-DEEP-FEATURE-PROMPT.md) | Reusable research, ranking, implementation and verification prompt for Studio features | Current execution prompt |
| [`DASHA-STUDIO-FEATURE-RESEARCH-2026-08-07.md`](DASHA-STUDIO-FEATURE-RESEARCH-2026-08-07.md) | Evidence ledger, ranked Studio features and one-hop lineage decision | Current research decision |
| [`DASHA-OPEN-CULTURE-OBJECTS.md`](DASHA-OPEN-CULTURE-OBJECTS.md) | Ambitious open editable-artifact horizon, v0 proof contract and kill rules | Active product specification |
| [`dasha-remix-pack.html`](dasha-remix-pack.html) | Culture Capsule: titled, source-aware, editable group-zine prototype | Prepared experiment; not live |
| [`dasha-relay-lab.html`](dasha-relay-lab.html) | Matched editable-vs-image relay starters and local material-diff checker | Verified experiment instrument; not live |
| [`DASHA-PIVOT-LANDSCAPE-2026-08-06.md`](DASHA-PIVOT-LANDSCAPE-2026-08-06.md) | Pre-scrap market scan; product recommendations include retired concepts | Historical research only |
| [`DASHA-PIVOT-DECISION-2026-08-06.md`](DASHA-PIVOT-DECISION-2026-08-06.md) | Superseded forecasting-era pivot decision | Historical snapshot |
| [`DASHA-PRODUCT-STRATEGY.md`](DASHA-PRODUCT-STRATEGY.md) | Positioning, personas, hypotheses, trust contract and business model | Current |
| [`DASHA-ROADMAP.md`](DASHA-ROADMAP.md) | Exact phase gates, metrics, kill criteria and next build order | Current |
| [`DASHA-DISCORD-BLUEPRINT.md`](DASHA-DISCORD-BLUEPRINT.md) | Official server structure, roles, safety controls and launch content | Current |
| [`DASHA-PRODUCT-BRIEF.md`](DASHA-PRODUCT-BRIEF.md) | Plain-language product definition and immediate scope | Current |
| [`dasha-landing.html`](dasha-landing.html) | Canonical Webflow homepage embed | Current; live at `/` |
| [`dasha-social-card.svg`](dasha-social-card.svg) / [`dasha-social-card.png`](dasha-social-card.png) | Editable source and 1200×630 PNG for home/Desk social previews | Verified checkpoint; not live |
| [`dasha-meme-studio.html`](dasha-meme-studio.html) | Canonical Meme Studio embed: post, story and banner outputs | Verified checkpoint; live `/studio` awaits format update |
| [`dasha-landing.test.mjs`](dasha-landing.test.mjs) | Homepage interaction and Jupiter-modal check | Current |
| [`dasha-social-card.test.mjs`](dasha-social-card.test.mjs) | Social-card dimensions, product/trust copy and self-contained-asset check | Current |
| [`dasha-meme-studio.test.mjs`](dasha-meme-studio.test.mjs) | Studio formats, canvas, private remix state, export, share and responsive check | Current |
| [`dasha-relay-lab.test.mjs`](dasha-relay-lab.test.mjs) | Relay arm separation, safe handoff comparison, mobile and accessibility check | Current |
| [`dasha-desk/docs/X-RESEARCH-DASHA-2026-08-06.md`](dasha-desk/docs/X-RESEARCH-DASHA-2026-08-06.md) | Quote, media and attribution evidence ledger | Current snapshot |
| [`dasha-desk/docs/DEPLOY.md`](dasha-desk/docs/DEPLOY.md) | Landing build and deployment procedure | Current |
| [`DASHA-AUDIT-2026-08-06.md`](DASHA-AUDIT-2026-08-06.md) | Measured audit record and defect history | Historical evidence; current truth is in workflow |
| [`DASHA-RESEARCH-CRYPTO-PSYCHOLOGY-2026-08-06.md`](DASHA-RESEARCH-CRYPTO-PSYCHOLOGY-2026-08-06.md) | Psychology, accountability and distribution research memo | Candidate evidence; validate primary claims before product copy |
| [`archive/dasha-thesis-receipts/README.md`](archive/dasha-thesis-receipts/README.md) | Shelf for permanently abandoned thesis/receipt code | Archived; never run or revive |

## Current product language

- Product experiment: **Dasha Meme Studio**
- Platform direction: **culture production and portable remix artifacts**
- Public promise: **Start with a finished signal. Change one thing. Pass it on.**
- Scrapped: Thesis Card, receipts, Pair and forecasting rounds; old files are archived history only.

Avoid “immutable,” “verified track record,” “official Dasha coin,” “safe,” “Ansem product,” or “proof” unless the exact claim is directly supported.

## Current live truth

- Home: `https://www.getdasha.com/` — culture landing, verified mint and Jupiter modal.
- Studio: `https://www.getdasha.com/studio` — canvas generator with PNG export and native-share/X fallback.
- Desk: `https://www.getdasha.com/dasha` — trust-reset mint/source/risk surface is verified on disk; live still exposes the superseded Ride/raid UI and a hash-only Raid link because publication needs valid Webflow auth.
- Webflow site ID: `5f1458122ba25e70a3ff2bd0`.
- Observed 2026-08-07: all three routes return 200 with no browser errors or horizontal overflow; no Thesis Card, receipt, forecasting, or Telegram language appears.
- Crawl drift observed 2026-08-07: `robots.txt` is empty, `/sitemap.xml` returns 404, and the three intended routes emit no canonical or `og:url`; the bounded custom map and exact Webflow setting gate are prepared in the launch runbook.
- Live drift: home still says `THE CASINO IS OPEN`, exposes `JOIN THE CHAOS` as the mobile nav action, omits format state from its five seed links, lacks the adjacent public mint-source link, and shares the stale casino title/image. Studio still lacks post/story/banner controls and the receiver-specific editability instruction; its social image is the same remote casino raster. Desk still exposes preset buy amounts, buy-pressure/net-buy copy, a referral parameter and a hash-only `Raid` link; its OG title/copy/image are also casino-era.
- Prepared checkpoint: home says `MAKE THE TIMELINE STRANGER`, makes a seeded Studio remix the primary hero action, keeps the mobile nav as a verified Jupiter handoff, links to exact-mint verification, cites the public mint source without implying endorsement, and replaces remote casino art with three clickable HTML/CSS previews of exact editable Studio artifacts. Studio adds post/story/banner output, says `This is editable. Make it yours, then pass your remix link on.`, and gives materially changed inbound artifacts one validated immediate-parent `From` link without identity or authorship claims. Desk is the one-buy-route trust reset documented above.
- Publication channel observed 2026-08-07: Webflow API returns `401`; the Designer URL serves a complete but empty document; the dashboard redirects to logged-out human verification with access denied. These facts prove the checkpoint is not publishable through the current session, not that Webflow or the site is generally broken.

## Verification

Run:

```bash
node dasha-desk/build.mjs --check
node dasha-desk.test.mjs
node dasha-desk/dasha-share.test.mjs
node dasha-landing.test.mjs
node dasha-social-card.test.mjs
node dasha-meme-studio.test.mjs
node dasha-relay-lab.test.mjs
node dasha-remix-pack.test.mjs
```

Then verify the live page independently: top-level HTML, loaded iframe/document, links, desktop/mobile interaction, axe and horizontal overflow.
