---
status: reference
owner: crypto-research
updated: 2026-08-09
canonical_for: discovery-contamination-research-2026-08-09
---

# Dasha discovery contamination — 2026-08-09

## Result

The canonical site is crawlable but not yet visible in sampled web-search results. Exact-mint search
currently favors older market pages and cached third-party prose. This is an index-lag and authority
problem, not evidence that getdasha.com needs more pages, keyword copy or paid visibility products.

Do not buy backlinks, DEX boosts, Enhanced Token Info, listings or verification merely to displace
search results. Correct high-reach factual identity errors through the narrowest provider-supported
path; let low-reach generated prose expire unless it creates a concrete confusion or impersonation
event.

## Current evidence

### Canonical surface

Readback on 2026-08-09 established:

- `https://www.getdasha.com/`, `/studio`, `/lobby`, `/dasha` and `/how-to-buy` return `200`;
- every route declares its exact `www` canonical URL;
- `robots.txt` allows public routes and advertises the sitemap;
- `sitemap.xml` returns XML and contains exactly the five canonical routes;
- no sampled route returns a `noindex` directive;
- apex requests redirect directly to the corresponding `www` URL.

The latest Webflow response also reported a same-day `last-modified` value. Google says most new or
updated sites should expect at least several days rather than same-day crawling and that a sitemap is
a discovery hint, not an indexing guarantee. A `site:` query returning nothing is therefore an
observation to monitor, not proof of a configuration defect.

One unrelated live discovery gate is red: the public pasteable Studio embed at
`uuriko.github.io/dasha-desk/studio/embed.js` is 46,089 bytes with SHA-256
`9f606e6dbe12fc63398d02533fec480f854605aea5caeda261c7baad34cd1e91`, while the gated local embed is
45,366 bytes with SHA-256 `2483ee263498b3c93ea224514a1e6020c066cdd3821034832717eeac2a23671a`.
This does not block crawlers, but it means third-party sites using the published embed run unaligned
bytes. Syncing that public repository is a release task and remains current-request-gated.

### External surfaces

| Surface | Observation | Classification | Action |
|---|---|---|---|
| DexScreener | Correct mint/pool, stale `dasha.cam`, unrelated Telegram, older X status and mutable description | High-reach factual identity drift | Keep prepared correction pack; outbound correction remains request-gated |
| Phantom | Correct mint/name and immutable X lore URL; unverified label | Faithful metadata plus provider status | No prose correction; resolve common verification lane |
| Solflare | Correct mint but stale mutability/holder interpretation in cached pages | Provider-derived stale risk presentation | Monitor direct provider readback; do not copy its claims into Dasha |
| ListingSpy | Search cache showed AI-generated “platform” and “marketplace” claims; current URL redirects to its generic listings page | Retired/generated residue | No backlink or paid correction; allow recrawl to remove it |
| `$VVAIFU` Dasha pages | Unrelated token uses the same human name and appears in multilingual results | Name collision, not mint collision | Lead with exact mint on Desk/How-to-Buy; do not fight every ambiguous name result |

## Correction hierarchy

1. **Exact mint or destination wrong:** correct urgently through the provider's documented factual
   channel; never substitute a new story.
2. **High-reach website/social wrong:** use the prepared identity pack after authority is accepted.
3. **Provider status stale:** document the contradiction and keep finalized evidence authoritative.
4. **Generated description unsupported:** request removal only when the page remains live and causes
   measurable confusion; never provide a backlink, payment or endorsement to obtain it.
5. **Name-only collision:** do not chase it. Names and symbols are non-unique; the mint is the
   identity boundary.

## What not to build

- No SEO blog, glossary or low-value token pages.
- No schema.org type invented for a crypto token.
- No duplicate mint landing pages or keyword-stuffed titles.
- No automatic reputation score for external listings.
- No paid DEX boosts or coordinated reactions to manipulate trending systems.
- No `lastmod` timestamps unless the release system can keep them accurate per route.

Google ignores sitemap `priority` and `changefreq`, so the local bounded sitemap now omits both. The
five canonical URLs remain unchanged.

## Reconsideration gates

- Treat indexing as defective only if Search Console or verified crawler logs show a crawl/index
  error, or if the canonical site remains absent after a reasonable recrawl window while third-party
  pages continue to rank.
- Add accurate per-route `lastmod` only when the ship manifest owns significant-content timestamps.
- Add machine-readable identity beyond ordinary metadata only after a named consumer documents a
  supported schema and demonstrates a failed ingestion.

Primary guidance:

- [Google crawling and indexing troubleshooting](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors)
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google title-link guidance](https://developers.google.com/search/docs/appearance/title-link)
- [DEX Screener token listing and metadata](https://docs.dexscreener.com/token-listing)
- [DEX Screener trending inputs](https://docs.dexscreener.com/trending)
