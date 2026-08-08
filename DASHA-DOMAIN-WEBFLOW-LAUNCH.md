# Dasha domain and Webflow launch truth

Updated: 2026-08-07

This is the current domain/publication runbook. Historical registrar experiments and the permanently scrapped thesis/receipt product are intentionally excluded. Start with [`DASHA-DOCS.md`](DASHA-DOCS.md) and [`DASHA-WORKFLOW.md`](DASHA-WORKFLOW.md).

## Public property

| Item | Current truth |
|---|---|
| Apex | `https://getdasha.com` |
| Canonical public host | `https://www.getdasha.com` |
| Registrar/DNS | Cloudflare |
| Webflow site | `5f1458122ba25e70a3ff2bd0` (`talentlink-sf`; old internal project name is not public branding) |
| Apex domain ID | `6a762e813cfcf91448a83e3b` |
| `www` domain ID | `6a762e833cfcf91448a83e58` |
| Staging | `https://johns-awesome-project-39b1b5.webflow.io` |

Both custom-domain routes currently respond. Domain registration and DNS attachment are complete; do not repeat old purchase or domain-attachment work.

## Routes and canonical sources

| Route | Webflow page ID | Canonical source | Purpose |
|---|---|---|---|
| `/` | `5f1458136c15aa41639b8538` | `dasha-landing.html` | Product identity, remix entry, exact mint and Jupiter handoff |
| `/studio` | `6a763858748c216defe621b9` | edit `dasha-meme-studio.html`, **paste `dasha-studio-embed.html`** | Post/story/banner creation and editable remix links |
| `/dasha` | `6a74b59530c70741b1c574c4` | `dasha-desk/src/` built by `dasha-desk/build.mjs` | Source, risk, chart and the single buy route |

`dasha-how-to-buy.html` is a prepared standalone buyer guide, not a public route. As of 2026-08-07, `/how-to-buy` returns the same Webflow 404 as an arbitrary missing path and has no recorded page ID. Home and Desk therefore must not link to it. Create and verify the Webflow page first; only after the custom-domain route returns the intended 200 should the route be added here, to the sitemap, and back into public navigation.

`dasha-meme-studio.html` is a whole document — `<!doctype>`, a `:root` palette, global `body`/`h1`/`label` rules and generic ids like `#canvas` and `#line`. Pasting it into a Webflow HtmlEmbed makes it fight the page in both directions. Paste the generated `dasha-studio-embed.html` instead: same Studio, isolated in a shadow root, ids that cannot collide. Regenerate with `node dasha-studio-embed-build.mjs` after every Studio edit — the embed is never hand-edited, and its gate fails if it is stale. The updater's `--studio` path reads this generated embed, never the whole document.

`dasha-studio-embed.js` is the identical optional external-asset payload. Use it only after Webflow returns an exact uploaded asset URL, with `<div class="dasha-studio-embed"></div><script src="EXACT_URL"></script>` in the HtmlEmbed. Until that receipt exists, the pasteable `.html` is the deployment source; do not guess a CDN URL.

`dasha-remix-pack.html` is the verified local Culture Capsule experiment with no public route. Do not link to `/capsule` or publish it before the roadmap gate is met.

## Prepared versus live

Prepared and verified locally:

- home headline `MAKE THE TIMELINE STRANGER`;
- mobile navigation exposes the existing verified Jupiter handoff;
- hero links to full mint verification;
- hero makes the seeded Studio remix primary while keeping Buy in the nav and as a secondary exact-Jupiter action;
- hero previews three exact editable Studio artifacts in native HTML/CSS; it has no casino raster or third-party image-host dependency;
- public mint-source provenance without endorsement language;
- token panel adds a compact self-custody → exact-mint verification → Jupiter path without urgency or return claims;
- official Jupiter Plugin uses the documented `data-preload defer` plain-HTML path and retains the exact direct-link fallback;
- five seeds preserve look, format and line;
- Studio exports post, story and banner, teaches the receiver to pass editability on, and exposes Home, mint verification and the exact Jupiter route in its top bar;
- Desk trust reset: one buy route, no referrals, preset amounts, raid link, pressure metrics or pressure copy.

Observed live on **2026-08-08**, by rendering each route rather than reading the sources. The
2026-08-07 drift list is retired: every item on it had already shipped, and leaving it would send
someone to redo finished work.

- **Home** — the prepared headline is live (`Make the timeline stranger`). `THE CASINO IS OPEN` and
  `JOIN THE CHAOS` are gone.
- **Studio** — v4: six looks, three formats, GIF export, remix links, the CC0 dedication and the
  cherries mark. *This route regressed earlier the same day* — an inline republish silently dropped
  the CC0 dedication, the mark and the Cherry look, and nothing detected it because every gate read
  local files. Restored and now covered by `dasha-live.test.mjs`.
- **Desk** — clean. No preset amounts, referral parameters, buy-pressure copy or raid link; the only
  occurrences of "raid" and "referral" are inside a code comment stating the fact pack contains
  none of them.

Still local-only: the homepage footer attribution to John Potter and @perryalpha.

No active route contains the retired product, forecasting language or the disclaimed Telegram link.

**Run [`dasha-live.test.mjs`](dasha-live.test.mjs) after every publish.** It is the only check that
looks at what is served rather than what is committed, which is precisely where the CC0 regression
lived.

## Publication access

**Superseded 2026-08-07: the Data API token works.** A `list_sites` call returns the site and both getdasha domains, and asset upload, custom-code writes and `publish_site` all succeeded against it. The earlier `401` record is stale; do not re-derive "we cannot publish" from it.

What the working token does and does not reach:

- **Works:** page and site custom code, page SEO/OG metadata, JSON-LD, assets, sitemap flags, publish.
- **Does not exist in the API:** the Site settings favicon field, and anything else that lives only in the dashboard. Use custom code, or a human.
- Designer-session tools still need an open Designer; the browser-side blocker is unchanged.

Publishing is full-site by default: it pushes **everything currently staged in Webflow**, not just the change you made. Check what is staged before publishing, and verify the live routes afterward rather than trusting the publish response.

Local file work remains **prepared**, not published, until its HtmlEmbed is actually replaced. Do not call a passing source test, an upload receipt or a save operation “live.”

When a valid Webflow session exists, use the existing page IDs, replace the three HtmlEmbed values from their canonical sources, set metadata below, publish to staging plus both domain IDs, then verify the custom domain independently.

## SEO and social metadata

### Crawl and canonical checkpoint

Live audit on 2026-08-07 found an empty `robots.txt`, a 404 at `/sitemap.xml`, and no canonical or `og:url` tags on Home, Studio or Desk. Home links to both child routes, so this is crawl hygiene—not evidence that the pages are absent from search.

Until the old Webflow project's complete published-page inventory is proven clean, do **not** enable its broad auto-generated sitemap. In **Site settings → SEO**:

1. set the global canonical URL to `https://www.getdasha.com`;
2. keep staging-domain indexing disabled;
3. leave auto-generation off and paste the exact contents of [`dasha-sitemap.xml`](dasha-sitemap.xml) into the custom sitemap field;
4. save, publish with the coherent three-page checkpoint, then verify `/sitemap.xml` returns XML and `robots.txt` contains exactly one `Sitemap: https://www.getdasha.com/sitemap.xml` reference.

The bounded map intentionally contains only Home, Studio and Desk, uses absolute `www` URLs and omits `lastmod` because there is no reliable independently maintained modification timestamp. A sitemap is a discovery hint, not a ranking promise or a mechanism for removing old URLs. Inventory, unpublish or noindex any unknown legacy routes separately before considering auto-generation.

| Field | Home | Studio | Desk |
|---|---|---|---|
| Title | `$dasha — it’s time` | `Dasha Meme Studio — make it yours` | `$dasha desk — verify, chart, buy` |
| Description | `It’s time $dasha. Make something, check the mint, or buy through Jupiter. High risk.` | `Make and remix Dasha posts, stories and banners in your browser. No wallet, account or upload.` | `Verify the associated $dasha mint, inspect independent sources and open the single Jupiter buy route. High risk.` |
| OG image | `dasha-social-card.png` | `dasha-social-card.png` | `dasha-social-card.png` |

Never restore retired product copy or its old OG asset. Do not place mutable price, market-cap, holder or return claims in metadata or share images.

Home Open Graph checkpoint:

- `og:title`: `$dasha — it’s time`
- `og:description`: `It’s time $dasha. Make something, check the mint, or buy through Jupiter. High risk.`
- `og:type`: `website`
- `og:url`: `https://www.getdasha.com/`
- `og:image`: the Webflow asset URL produced by uploading `dasha-social-card.png`
- `og:image:type`: `image/png`
- `og:image:width`: `1200`
- `og:image:height`: `630`
- `og:image:alt`: `Dasha remix Studio card with three colorful editable artifact previews.`
- `twitter:card`: `summary_large_image`
- `twitter:title`, `twitter:description`, `twitter:image`: use the matching Open Graph values

The SVG is the editable source; the PNG is the publication asset. Do not upload the SVG as Open Graph media and do not compress the PNG to WebP or AVIF. The live page currently exposes the stale casino title and remote Catbox image; replacing both is part of the next authenticated page-settings publication.

For `/studio`, use its page-specific title, description and `og:url=https://www.getdasha.com/studio`, but reuse the same verified PNG, dimensions, type and alt fields. Every fragment remix URL necessarily receives this one generic Studio preview because URI fragments are client-only and are not sent to Webflow. The card represents the editable Studio product; it does **not** claim to depict the specific remix encoded after `#`.

For `/dasha`, use its page-specific title, description and `og:url=https://www.getdasha.com/dasha`, with the same PNG/image fields. Do not restore the live casino-open OG copy or the old Desk casino JPG.

### Site icon

The mark is slot-machine cherries. Two files, one geometry:

| File | Use |
|---|---|
| [`dasha-favicon.svg`](dasha-favicon.svg) | the icon. Carries its own ink tile, because acid `#dfff00` on transparent is unreadable against a light tab strip and most browser chrome is light |
| [`dasha-mark.svg`](dasha-mark.svg) | everywhere the background is already controlled. Uses `currentColor`, so one file serves acid-on-ink, ink-on-paper and single-colour print |

**Live as of 2026-08-07.** The Data API exposes no favicon field, so the icon is installed through **site-wide head custom code** instead of Site settings → Favicon. Three links live there: the SVG inline as a `data:` URI (crisp at every size, cannot 404), a 32px PNG for browsers without SVG-favicon support, and a 180px `apple-touch-icon` for the iOS home screen. Both PNGs are Webflow-hosted assets rendered from the same SVG.

Two traps, both hit while shipping this:

1. **Page-level head code beats site-level head code.** Home and Desk each carried their own `<link rel="icon">` holding the *retired* product's mark, which silently overrode the new site icon. Both were removed. Never add a page-level icon link — it will win again and the site icon will look broken for no visible reason.
2. Webflow still emits its own template `favicon.ico` link before ours. Ours comes later and declares `type`, so it wins; do not "clean up" by deleting our links.

If someone later sets a real favicon in Site settings, remove the head-code block at the same time so there is one source of truth.

`dasha-meme-studio.html` also inlines the icon as a `data:` URI so the standalone authoring page carries it from `file://`. That is a second copy of the artwork and `dasha-mark.test.mjs` re-derives it from the SVG, so editing `dasha-favicon.svg` without updating the page fails the gate. Never hand-edit the inlined URI.

Do not raster the mark to PNG for the favicon. SVG is sharp at every size and the geometry is already tuned for 16px: nothing is thinner than 7 units of the 64 grid, and there is deliberately no leaf, which would merge into the stem and destroy the silhouette.

## Publish and verification gate

Before publication:

```bash
node dasha-landing.test.mjs
node dasha-social-card.test.mjs
node dasha-meme-studio.test.mjs
node dasha-studio-embed-build.mjs --check
node dasha-studio-embed.test.mjs
node dasha-mark.test.mjs
node dasha-brand.test.mjs
node dasha-gif.test.mjs
node dasha-remix-pack.test.mjs
cd dasha-desk && node build.mjs --check && node dasha-share.test.mjs
```

### `/studio` deploys by inline paste. Decided 2026-08-08.

**Paste `dasha-studio-embed.html` inline into the HtmlEmbed. Do not use a hosted asset.** Agreed by
Claude, Codex and Grok after the CC0 dedication was silently dropped from production twice in one
day. All three also agreed to run `node dasha-live.test.mjs` after every publish.

One useful consequence: because the fragment is inline, its text is in the raw HTML, so the
`dasha-release-contract.json` markers can actually see it. The blindness described below applied to
the hosted-asset route, which is now retired.

**Coordination note:** the `dg-bus` inbox is delivered but not read — no agent polls it in its loop.
For anything that must be seen, use the stateless adapters (`bin/codex-ask`, `bin/grok-ask`), which
answer synchronously.

### Why there were two routes

The Studio's CC0 dedication was silently dropped from production **twice on 2026-08-08**. Neither
time was a coding error. Two deploy mechanisms were in use — a hashed Webflow asset referenced by
the embed, and an inline paste of the fragment — and each publish overwrote the other. Last writer
wins, and the public promise about people's rights to their own exports is what fell out.

Pick one and keep it. The hashed asset is preferred for one concrete reason: its md5 is stamped in
the embed comment, so "what is actually live" is answerable by reading the page instead of guessing.

**Know which check applies to which mechanism**, because they are not interchangeable:

| Check | Reads | Catches an inline-paste regression | Catches an asset regression |
|---|---|---|---|
| `dasha-release-contract.json` via `dasha-ship.mjs` | raw HTML (`fetch`, no JS) | yes | **no** — the text lives in the `.js` |
| [`dasha-live.test.mjs`](dasha-live.test.mjs) | the rendered page and shadow root | yes | yes |

So the contract markers are necessary but not sufficient. Two commands, and the split matters:

```bash
npm run dasha:test:all     # BEFORE publishing — 15 local gates, nothing touches the network
npm run dasha:test:live     # AFTER publishing — renders the live routes and the Pages copy
```

`dasha-live.test.mjs` is deliberately **not** in `dasha:test:all`. It reads production, which is
older than local by definition before a publish, so including it would make the pre-publish suite
fail for the wrong reason and teach people to skip it.

Publish one surface without touching the others, and keep the verification:

```bash
node dasha-ship.mjs --ship --only=studio
```

`--only` exists because the script used to be all-or-nothing: fixing the Studio meant publishing the
homepage too, so people published through direct MCP instead and `verifyLive()` never ran. That is
how `/studio` lost its CC0 dedication three times in one day.

Then verify all three custom-domain routes at 390px and desktop:

- expected headline/controls/copy are actually rendered;
- internal and external destinations are non-empty and correct;
- SOL → exact `$dasha` mint remains fixed in Jupiter;
- mint copy and Studio export/share/remix actions work;
- `robots.txt` is non-empty, `/sitemap.xml` returns 200 XML with only the three canonical routes, and all three pages emit `www` canonicals plus matching `og:url` values;
- no browser errors, serious/critical accessibility violations or horizontal overflow;
- no retired product, forecasting, Telegram, referral, raid or pressure language;
- apex and `www` resolve to the same current checkpoint.

For the Jupiter smoke, pass means the official modal opens with SOL as the input, the exact `$dasha` mint as the fixed output, a wallet connection control and `Powered by Jupiter`. Jupiter may show its own token warnings; record them as observed risk UI and never hide, restyle or treat their absence as the goal. The direct `jup.ag` link must remain usable when the plugin is blocked or unavailable.

Observed 2026-08-07: the real mobile modal showed JupShield `Not verified — This token is not verified, make sure the mint address is correct before trading.` Jupiter documents this as an identity-review status, not a judgment that the token is safe, valuable or legitimate. Keep the exact mint, public source, independent links and live Jupiter warning visible. Do not hard-code `currently unverified` into page copy because the third-party status can change, and do not suppress the warning if it remains.

## Jupiter VRFD verification packet

Read-only inspection of the exact [VRFD dashboard](https://verified.jup.ag/dashboard/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump) on 2026-08-07 showed:

- free submission status `Pending` with two history entries;
- one JupShield warning: `Not Verified`;
- `4 TO FIX`: website missing, description missing, ecosystem support requires more than ten likes (current zero), and recent news requires at least one approval in the last two weeks (current zero);
- current token data names `dash_eats` / `dasha`, reports `1B` circulating supply and points X at a public `@dash_eats` status.

Complete the free evidence path before considering Express. Jupiter currently documents a free standard flow; Express costs `1000 JUP`, submits through a signed payment transaction and still receives an independent review with no approval guarantee. No agent may craft, sign or submit that transaction without current payment authorization.

Prepared truthful fields:

| Field | Value / boundary |
|---|---|
| Website | `https://www.getdasha.com/` |
| Description (151 chars) | `$dasha is a high-risk Solana culture coin behind an open remix studio for posts, stories and banners. Verify the mint and source links at getdasha.com.` |
| X/source | Keep the existing public mint-source post as association evidence only. Do not call `@dash_eats` a project-controlled or official account without direct control evidence. |
| Recent news | Submit only a dated, already-live material release or domain/product update. A prepared-but-unpublished Webflow checkpoint is not news. |
| Ecosystem likes | Must be real third-party support. Never farm, buy or automate likes. |

Verification is identity metadata, not endorsement, safety, price support or proof of legitimacy. Never claim `Jupiter verified`, wallet partnership, ecosystem support, news approval or completion until the live dashboard itself shows that exact state.

Publication is successful only when those live checks pass.
