# Dasha documentation map

Start here for all Dasha work. Demigod is out of scope until the user explicitly reopens it.

| Document | Purpose | Status |
|---|---|---|
| [`DASHA-CRYPTO-LANDSCAPE.md`](DASHA-CRYPTO-LANDSCAPE.md) | Market structure, incumbents, crowded categories and whitespace | Current |
| [`DASHA-PRODUCT-STRATEGY.md`](DASHA-PRODUCT-STRATEGY.md) | Positioning, personas, hypotheses, trust contract and business model | Current |
| [`DASHA-ROADMAP.md`](DASHA-ROADMAP.md) | Exact phase gates, metrics, kill criteria and next build order | Current |
| [`DASHA-DISCORD-BLUEPRINT.md`](DASHA-DISCORD-BLUEPRINT.md) | Official server structure, roles, safety controls and launch content | Current |
| [`DASHA-PRODUCT-BRIEF.md`](DASHA-PRODUCT-BRIEF.md) | Plain-language product definition and immediate scope | Current |
| [`dasha-conviction-receipt.html`](dasha-conviction-receipt.html) | Working local Dasha Thesis Card experiment; filename retained temporarily | Passing local test |
| [`dasha-conviction-receipt.test.mjs`](dasha-conviction-receipt.test.mjs) | Browser regression check | Passing |

## Current product language

- Product experiment: **Dasha Thesis Card**
- Candidate persisted behavior: **sealed receipt**
- Host format: **Rounds**
- Public promise: **Say it before the move. Show what would prove you wrong.**

Avoid “immutable,” “verified track record,” “official Dasha coin,” “safe,” “Ansem product,” or “proof” unless the exact claim is directly supported.

## Current live truth

- Webflow page: `https://johns-awesome-project-39b1b5.webflow.io/dasha`
- Webflow site ID: `5f1458122ba25e70a3ff2bd0`
- Page ID: `6a74b59530c70741b1c574c4`
- Latest observed implementation: Webflow iframe loading `https://files.catbox.moe/rj3ask.html`
- P0: deploy the source-level Telegram removal, then replace the iframe delivery with indexable, correctly served content.

## Verification

Run:

```bash
node dasha-conviction-receipt.test.mjs
```

Then verify the live page independently: top-level HTML, loaded iframe/document, links, desktop/mobile interaction, axe and horizontal overflow.
