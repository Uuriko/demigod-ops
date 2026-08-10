# Dasha crypto product delta — culture before machinery

Updated: 2026-08-08

## Executive decision

Dasha should not become another creator-coin launcher, trading feed, token-gated chat, referral program, quest farm, or wallet reputation product.

The differentiated product is smaller:

> **Know the lore → make an artifact → receive human recognition → share it outward.**

Home introduces the world. Quiz reveals taste and knowledge. Studio turns that identity into something portable. Lobby is the separate low-friction third place. Simp Board gives bounded, editorial recognition. The CA and buy routes remain visible infrastructure, not the product's personality.

The quiz result now connects directly to a tailored Studio seed. Anonymous Studio funnel measurement is also implemented. A featured community artifact should exist only after real submissions give it something worth featuring.

## What changed in the market

### Creator coins are now a crowded category

[Creator.fun](https://docs.creator.fun/introduction) combines coin launch, embedded wallets, trading, real-time holder chat, streaks, referrals, points, and seasonal airdrops. [Zora](https://support.zora.co/en/articles/2509953) joins creator identity, content coins, trading fees, creator rewards, and referral rewards.

**Dasha implication:** do not recreate this template around an existing coin. Dasha wins by refusing to make every cultural action transactional. X OAuth can identify a participant; wallet ownership should not determine cultural rank.

### Distribution is becoming a product

Solana Mobile reports more than 1,000 apps and is adding [weekly curated App Spotlight drops](https://solanamobile.com/blog/introducing-dapp-spotlight-in-the-solana-dapp-store), reviews, and publisher feedback. Its [builder guidance](https://solanamobile.com/blog/solana-mobile-builder-grants-bring-your-best-seeker-and-skr-ideas) emphasizes apps that are sticky or viral by default and activate users.

**Dasha implication:** curation and a repeatable share loop matter more than an Android build. A native Seeker app has no justification until mobile return use exists. The transferable pattern is a tiny recurring spotlight with a curator note and creator credit.

### Embedded transactions do not solve Dasha's problem

[Solana Actions and Blinks](https://solana.com/developers/guides/advanced/actions) turn transaction-producing APIs into metadata-rich links rendered by compatible clients.

**Dasha implication:** a buy Blink would shorten an already-short Jupiter path while adding a transaction API, wallet surface, maintenance burden, and new trust boundary. It does not improve the culture loop. Do not build it now.

### Social mini-app distribution is real, but Dasha remains X-first

[Farcaster Mini Apps](https://docs.farcaster.xyz/) can run interactive products inside a social feed and reuse Farcaster identity.

**Dasha implication:** splitting identity and maintenance across X and Farcaster is premature. Preserve portable URLs and clean Web sharing; revisit only if referral evidence shows meaningful Farcaster traffic.

### X verification is possible, but not free or automatic

X exposes authenticated user timelines, public post metrics, and private analytics for an account's own recent posts. Its current API is pay-per-use, and non-public metrics are limited to recent posts ([X API overview](https://docs.x.com/x-api/getting-started/about-x-api), [metrics reference](https://docs.x.com/x-api/fundamentals/metrics), [user posts](https://docs.x.com/x-api/users/get-posts)).

**Dasha implication:** opening an X composer is not proof that someone published original work. Do not award automatic Simp points from a share click. If creator scoring is revisited, discover the resulting public post through X, verify its author against the linked account, and cache the result to control API cost.

The 2026-08-09 follow-up found a cleaner user experience than explicit URL submission. X's Filtered Stream can deliver posts matching a narrow rule such as `url:"getdasha.com/studio" has:media -is:retweet -is:reply -is:quote`, including the post's immutable `author_id`. Dasha can match that ID against opt-in Board profiles without requesting a separate user object, then place the public post in the existing private editorial queue. The known pay-per-use path is one persistent connection; X separately documents webhook delivery under an Enterprise-labelled section, so entitlement must be read back before choosing that transport. Current published pricing is $0.005 per Post resource, with repeat reads of the same resource generally deduplicated within a UTC day.

This is automatic **discovery**, not automatic scoring. A Studio URL is editable, a post may contain unrelated media, and publication can later be deleted. Human acceptance remains the weakest sufficient integrity check. The old Studio “Claim on Simp Board” control and its first-party editable-URL claim were removed; creative claims now accept only X status URLs at the server boundary. Do not provision the webhook until real Studio shares exist and X API credits are intentionally available.

Sources: [X Filtered Stream](https://docs.x.com/x-api/posts/filtered-stream/introduction) · [X filtered-stream webhooks](https://docs.x.com/x-api/webhooks/stream/quickstart) · [Filtered-stream operators](https://docs.x.com/x-api/posts/filtered-stream/integrate/operators) · [X expansions and author IDs](https://docs.x.com/x-api/fundamentals/expansions) · [X API pricing](https://docs.x.com/x-api/getting-started/pricing)

### Heavy provenance is solving the wrong stage

[C2PA Content Credentials 2.4](https://spec.c2pa.org/about/) defines cryptographically bound, signed provenance manifests and a corresponding verification experience. Its own explainer stresses that credentials establish the integrity of provenance assertions rather than whether the underlying content is true ([C2PA explainer](https://c2pa.org/specifications/specifications/2.2/explainer/Explainer.html)).

**Dasha implication:** do not label URL lineage as proof or Content Credentials. A conforming implementation would require signing identity, certificate/trust-list decisions, manifest embedding and a real verification UX. One-hop editable URL lineage is sufficient until people actually hand artifacts to one another.

### Becoming a share target is premature packaging

The Web Share Target API can let an installed PWA receive files from the operating-system share sheet, but it requires installation and remains limited across major browsers ([MDN share target](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target)).

**Dasha implication:** keep outbound `navigator.share()` and responsive Web editing. Do not add a manifest, service worker, install prompt or inbound file receiver until repeat mobile use and a real “edit this from another app” demand appear.

## Research findings that matter

### Human curation beats competitive peer scoring

Research on 38 million Threadless evaluations found that skilled participants can strategically underrate close competitors, and targeted lower-skill contributors may leave ([Riedl, Grad, and Lettl](https://arxiv.org/abs/2404.14141)).

**Decision:** keep Simp contribution review bounded and editorial. Do not add public upvotes, creator-versus-creator voting, or token-weighted judging.

### Cultural participation can outlast transactions

A 2026 study of more than one hundred Web3 collections distinguishes trader-heavy fragmented networks from communities where narrative production and sustained interaction remain active as transaction activity falls ([Kuskova and Zaytsev](https://arxiv.org/abs/2604.18761)).

**Decision:** Dasha's useful product metric is repeat cultural participation, not price, volume, purchases, or raw holder count.

### Early exposure can motivate quality creators

Research on creator cold starts finds that front-loading guaranteed impressions efficiently strengthens quality incentives under a limited attention budget ([Nguyen](https://arxiv.org/abs/2509.14102)).

**Decision:** a single curated featured artifact is more defensible than more points. Give the creator visible credit and a link; do not promise money or rank.

### Local ties matter more than aggregate size

Experiments with 19,923 social-media users find that value comes from specific local connections, with weaker ties especially valuable on X ([Aral et al.](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5331340)).

**Decision:** optimize the Lobby and share loop for recognizable handles and lightweight interaction, not member totals.

### Meme humor works when it fits the voice

A multi-study analysis including real X data finds that perceived humor increases sharing and engagement, while mismatched meme use can reduce engagement ([Sewak, Lee, and Haderlie](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6938898)).

**Decision:** Studio should provide Dasha-native raw material and fast editing, not generic branded templates or explanatory campaign copy.

## Product opportunities, ranked

### Buy path — direct Jupiter links, no embedded swap

Jupiter still officially supports its Plugin for sites that need an embedded wallet and swap UI. Dasha does not yet have evidence that an embedded transaction surface improves conversion, while every exact-mint buy CTA already opens Jupiter with SOL as input and `$dasha` fixed as output.

Live browser verification on 2026-08-08 confirms the current `jup.ag/swap?sell=…&buy=…` link preserves its URL and renders **Sell SOL / Buy dasha** for the exact CA. Entering `0.01 SOL` produced a nonzero `$dasha` quote and a live route without connecting a wallet. Jupiter's documented Swap V2 API uses `inputMint` / `outputMint`; those API parameter names are a separate contract and are not evidence for rewriting the web-app deep link.

**Decision:** keep the normal `jup.ag/swap` links and remove the remote Plugin loader. This preserves the full buy path, works as an ordinary external link on mobile and desktop, and removes a mutable third-party script plus popup fallback logic from the homepage. Reconsider an embed only if direct-link funnel evidence shows a material drop-off that an on-page wallet could plausibly fix.

The 2026-08-09 route audit also rendered every secondary venue. Pump.fun and Phantom resolved the exact Dasha mint. Raydium preserved the exact output mint and rendered SOL → `dasha` after its first-visit interstitial was accepted. The links are valid, but presenting venue choice does not add a Dasha capability. Home, Desk, and the dedicated buy guide now use Jupiter as the one transaction handoff, with exact-mint source, explorer, and GeckoTerminal pool links kept as evidence rather than competing buy buttons. Jupiter already routes across Solana liquidity sources and warns that forcing one direct market can produce unfavorable outcomes. A 1.6-million-person retail field experiment separately found that larger recommendation sets can reduce search initiation; that is supporting interface evidence, not a crypto conversion estimate.

Sources: [Jupiter’s current embed guide](https://developers.jup.ag/docs/guides/how-to-embed-a-swap-widget) · [Jupiter route quote](https://developers.jup.ag/docs/swap/v1/get-quote) · [Jupiter Swap V2 order flow](https://developers.jup.ag/docs/swap/order-and-execute) · [Phantom token pages](https://docs.phantom.com/developer-powertools/token-pages) · [Raydium swap flow](https://docs.raydium.io/user-flows/swap) · [Long et al., choice overload field experiment](https://doi.org/10.1287/msom.2022.0659)

### Holder proof — wallet-bound, SIWS-shaped, private

The holder badge remains cosmetic and awards zero points. Its proof now follows the security-relevant shape of Sign In With Solana: the connected address appears in the signed message alongside the requesting domain, URI, mainnet chain, nonce, issuance time, expiration time, and request ID. The server signs the challenge, binds it to the active X session and exact public key, verifies Ed25519, consumes a single persisted nonce, then checks the finalised SPL balance. A different wallet is rejected before signature or RPC work, and replay cannot repeat the RPC call. Abandoned state is bounded to one nonce per X profile; no address or balance is persisted or enters the public board. Wallet Standard `signIn` and Mobile Wallet Adapter remain a compatibility follow-up rather than a dependency added to close the replay boundary.

Mobile support is deliberately bounded. Current Solana Mobile documentation supports MWA in Android Chrome through wallet-adapter packages, but not on iOS; iOS web relies on wallet in-app browsers or extension wallets. Rather than ship a framework for a cosmetic badge, mobile visitors without an injected signer now reopen the same page through Phantom's documented `browse` universal link. Existing injected Phantom/Solflare and desktop behavior is unchanged. Revisit generic MWA only if holder-proof usage demonstrates demand.

The holder endpoints also reuse the Lobby's sliding-window limiter with separate per-X challenge and verification buckets. Challenge issuance is capped at six per minute and signature/RPC verification at four; a valid challenge can still be verified immediately. The buckets contain only the X-session ID and timestamps, expire from memory after an idle hour, and never add a wallet address or IP to persisted state.

Full Wallet Standard `signIn` is deliberately deferred because the lightweight page currently supports injected wallets through `connect` + `signMessage`; the SIWS specification itself defines that as the compatibility fallback. Upgrade to wallet-native `signIn` only when broader Wallet Standard discovery is built.

The X OAuth request now asks only for `tweet.read users.read`. `offline.access` was removed because the callback uses the access token once for `/2/users/me` and stores neither access nor refresh tokens.

The surrounding browser session flow is hardened locally too. Authorization uses PKCE S256 plus a random signed `state` bound to a 15-minute `__Host-` cookie. Every callback outcome clears that state cookie. Signed token parsing accepts exactly two bounded base64url segments and malformed cookies fail closed; X sessions must carry a valid version, handle, ID, signature, and expiry. Logout is POST-only and requires an allowlisted Origin, so a cross-site image/navigation or hostile form cannot clear a session.

The 2026-08-08 live probe found deployed code stale on this boundary: its authorize URL requested `offline.access`, its state cookie lacked the `__Host-` prefix, and both GET and hostile-origin POST logout returned 200 with a clearing cookie. **Resolved in the 2026-08-09 release:** live now uses the prepared minimal-scope, prefixed-state-cookie, origin-gated implementation. The adversarial suite rejects regressions. No OAuth tokens are persisted.

The identity-data lifecycle is now explicit and executable. X's current Developer Policy requires a privacy policy before sign-up, a clear logout, disclosure of collected/shared data, a contact path, and deletion on an account owner's request. `/oauth/x/start` now shows a concise `/privacy` notice before X redirect. The public policy names the exact X profile fields, 30-day signed session, optional Board/quiz/claim data, bounded Lobby history, aggregate metrics, Cloudflare/X/RPC processing, and the enabled private GitHub contact channel.

`POST /simp/leave` now removes more than the public row: profile, claims, active linked quiz attempt, current associated result, one-time holder nonce, and the identity's rows from all retained season snapshots. Future snapshots retain an internal X-ID→handle deletion map that is stripped from public responses; legacy snapshots fall back to the current handle. Anonymous aggregate counters remain. Logout stays separate because a person may leave the Board while retaining optional linked Lobby identity.

The Simp client change exposed a release-workflow defect: `dasha-lobby-assets-build --write` regenerated the Worker client but left its own required SRI pins stale. The same command now refreshes Homepage Simp, Lobby, and Studio SHA-384 pins and rebuilds the final hash after input-page changes. `--check` remains fail-closed.

Sources: [Sign In With Solana specification](https://github.com/phantom/sign-in-with-solana) · [Solana Mobile SIWS guidance](https://docs.solanamobile.com/android-native/using_mobile_wallet_adapter) · [X OAuth PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code) · [X Developer Policy](https://docs.x.com/developer-terms/policy) · [X developer data-handling guidelines](https://docs.x.com/developer-guidelines) · [OAuth 2.0 Security BCP (RFC 9700)](https://www.rfc-editor.org/rfc/rfc9700.html)

### On-chain identity drift gate — built

Finalized Solana RPC currently identifies the exact CA as an initialized classic SPL Token mint with 6 decimals, positive supply, and null mint and freeze authorities. Dexscreener and GeckoTerminal independently resolve the canonical pair to Raydium with that CA as base and wrapped SOL as quote.

The Metaplex metadata account `ArJZQKqW1YuKgSwr4VWkVgavag1u7R8nDYSnCZASXJt3` also resolves to the exact mint, name `dash_eats`, symbol `dasha`, and content-addressed IPFS URI `QmU9TM9DYc8YCxZiZSmvdBcdwWvhHhZvBneoxEAkmgiLxV`. Its `isMutable` flag is false. The IPFS JSON points to a public `@dash_eats` post and contains no getdasha-controlled community destination.

Dexscreener’s separately editable token profile currently advertises `dasha.cam` and the explicitly banned Telegram. Getdasha previously linked that profile as its chart destination even though it did not copy the stale fields. Public chart links now use GeckoTerminal’s exact canonical pool instead; its page/API resolve the same Raydium pair without exposing either stale destination. Dexscreener remains a non-clickable internal market-data API and image host for Desk. The fast ship gate rejects future clickable Dexscreener profile links across all static surfaces.

`npm run dasha:onchain:check` now verifies the durable mint, Metaplex account, immutable off-chain JSON/image/X source, Phantom-compatible image MIME type, canonical pair through both Dexscreener and GeckoTerminal, and Jupiter token-discovery identity. It also requests a small read-only Jupiter order and fails if SOL → the exact CA has no nonzero route. It deliberately ignores price, market cap, holder count, liquidity amounts, organic score and tags: those are volatile market observations, not release truth. The check is opt-in rather than part of offline unit tests because RPC and market APIs can be unavailable even when source is correct.

The immutable Pump/Metaplex JSON has no website field, and the current Jupiter discovery record therefore has no `website`; its unauthenticated response also does not positively expose `isVerified`. Jupiter VRFD now supports reviewed metadata-only updates independently of an on-chain metadata change, including `website` and X fields, with a free standard submission path or a paid Express API path. The minimal prepared target in `dasha-jupiter-metadata.json` uses `website: https://www.getdasha.com` and the canonical profile `twitter: https://x.com/dash_eats`; it deliberately omits Telegram, Discord and every unrelated mutable field. The current source-post URL remains accepted by the checker until review changes the record, but is reported as a soft discovery gap. No verification-status claim is made until Jupiter returns one.

Sources: [Solana `getAccountInfo` RPC](https://solana.com/docs/rpc/http/getaccountinfo) · [Metaplex Token Metadata](https://developers.metaplex.com/token-metadata) · [Phantom fungible display fields](https://docs.phantom.com/best-practices/tokens/home-tab-fungibles) · [Jupiter Tokens API](https://dev.jup.ag/docs/tokens/v2) · [Jupiter VRFD metadata updates](https://dev.jup.ag/docs/tokens/verification) · [GeckoTerminal pair](https://www.geckoterminal.com/solana/pools/9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7)

### Frontend execution integrity — SRI-pinned

The public source executes no remote swap/widget script. Its only cross-origin executable clients are Dasha's own Lobby, Simp Board, and Studio assets on `lobby.getdasha.com`; that Worker already returns CORS and `X-Content-Type-Options: nosniff` headers. All three loaders now carry SHA-384 Subresource Integrity pins plus anonymous CORS mode. The asset builder derives the hashes from the exact minified bytes and fails its check if a loader becomes stale.

A strict response-header CSP is not currently a source-only option: Webflow documents custom security headers as Enterprise-only. A meta CSP would also be awkward around Webflow's generated and inline scripts and would not protect response processing before the meta element. SRI directly covers the mutable cross-origin execution boundary without claiming broader protection.

The ship order remains important: deploy the Worker assets before publishing the Webflow homepage. `dasha-ship.mjs --ship` already does this. The local SRI pins deliberately match the prepared Worker release, not the currently stale live asset.

The Worker HTML boundary is hardened locally as well. OAuth error and upstream failure text is HTML-escaped before rendering; private OAuth pages are noindexed; public HTML receives `nosniff`, `no-referrer`, `X-Frame-Options: DENY`, a narrow CSP (`frame-ancestors`, `base-uri`, and `object-src` only), and a browser capability denylist. The same non-breaking headers are applied to proxied Webflow HTML. Public pages remain indexable. Allowed-origin credentialed preflights return the exact site origin; hostile origins receive no CORS grant.

The fast release gate now inventories every static shipped surface and rejects all iframes, any executable script outside `lobby.getdasha.com/client/`, or any allowed cross-origin client lacking SHA-384 SRI plus anonymous CORS. Current external X/Wikimedia/Dexscreener images remain non-executable media with `no-referrer`; they are not silently replaced with different local photos. This makes future executable drift fail the normal release path instead of relying on reviewers remembering each known tag.

The live audit now inventories the Webflow host shell too. It permits only Webflow's exact WebFont loader, pinned jQuery path, runtimes under Dasha's Webflow site ID, and the three SRI-pinned Dasha clients; every other external script and every iframe is a hard failure. This is unexpected-origin detection, not a claim that Dasha controls or SRI-pins Webflow's platform code. The current live Home, Studio, and Lobby shells fail the Dasha-client SRI checks because they remain behind the prepared release; Desk and the buying guide contain no unexpected executable origin.

A live adversarial probe on 2026-08-08 confirmed the deployed OAuth callback still reflects hostile error markup and therefore needs the prepared Worker release. This is a release-parity finding, not a reason to weaken the local test. No Worker deployment was performed without current publish authorization.

The normal `dasha-ship --ship` fast gate now enforces the public no-negative-coin-copy rule across every shipped embed (Home, Studio, and Desk). This closes a release-path gap: the deeper browser suite already rejected the copy, but a normal fast release did not. Webflow's current API can target its staging subdomain or selected custom-domain IDs and is rate-limited to one successful publish queue per minute; page-scoped publication is available, but Dasha should adopt it only after its MCP wrapper can be read back and verified end to end.

The same rule now has one canonical regex in `dasha-public-copy.mjs` and applies to live Home, Desk, Studio, Lobby, and `/how-to-buy`. The live scan removes style blocks and markup attributes so obsolete CSS names cannot create false failures, while retaining script-generated share copy. This broader readback found two previously hidden deployed defects: Desk still renders “high risk / can go to zero / not financial advice,” and `/how-to-buy` still exposes Rugcheck framing. It also confirms the Webflow Home shell's JSON-LD still says “culture coin,” independently of the embed. Prepared Desk and buying-guide sources are clean; Studio and Lobby are clean live. All three stale surfaces now hard-fail announce readiness rather than relying on a manual audit.

Sources: [Webflow custom security headers](https://help.webflow.com/hc/en-us/articles/46651836279059-Custom-security-headers) · [Webflow publish API](https://developers.webflow.com/data/reference/sites/publish/) · [Webflow page publishing](https://developers.webflow.com/home/changelog/2026/4/8) · [MDN Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity) · [W3C Content Security Policy](https://www.w3.org/TR/CSP/) · [web.dev security headers](https://web.dev/articles/security-headers)

### Domain transport boundary — checked and hardened locally

The 2026-08-09 live probe found valid Google Trust Services certificates for apex, www, and Lobby, each with 88 days remaining. Apex and www canonicalize to `https://www.getdasha.com`, and www sends one-year HSTS. Cloudflare is authoritative DNS. CAA is absent, which Cloudflare documents as compatible with Universal SSL and therefore is not treated as a defect.

Two real gaps remain in the deployed Worker: `http://lobby.getdasha.com` returns 200 instead of redirecting, and Lobby HTML/API responses lack HSTS; the live HTML also lacks the prepared frame/CSP policy. Local Worker source now redirects every HTTP path to the identical HTTPS URL with 308 before routing, and sends one-year HSTS on HTML, JSON, and executable assets. `npm run dasha:domain:check` verifies DNS authority, certificate validity, canonical redirects, HSTS, no-sniff/no-store health policy, and Lobby frame/CSP policy. Post-publish verification now runs it automatically.

DNSSEC is not enabled: the parent publishes no DS record. Cloudflare Registrar supports one-click DNSSEC, but this is an external DNS control and was not changed during source work. The checker reports it as a soft gap rather than conflating it with application release failure.

Sources: [Cloudflare DNSSEC](https://developers.cloudflare.com/registrar/get-started/enable-dnssec/) · [Cloudflare HSTS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/) · [Cloudflare CAA behavior](https://developers.cloudflare.com/ssl/edge-certificates/caa-records/)

### Quiz result cards — crawler-compatible locally

A 2026-08-09 read-only probe found that Twitterbot could fetch the deployed permanent result page and its JPEG with HTTP 200. The evidence therefore does not support a bot-blocking diagnosis. The advertised image was instead a 900×1200 portrait, while X's current card guidance supports website-card images at 1:1 or 1.91:1, at least 800px wide, and no more than 3 MB. The result URL also returned 404 to HEAD and supplied only `twitter:card`, relying on Open Graph fallback for every other field.

Local Worker source now serves one 1200×628, 0.89 MB PNG through the existing assets binding, with complete Open Graph and X title/description/image/alt metadata, declared dimensions and type, cross-origin access, a one-day cache, and GET/HEAD parity on permanent result URLs. That leaves ample headroom under X's 3 MB website-card limit and the project's stricter 2 MB gate. The image is a neutral quiz backdrop; the result-specific score and identity remain in metadata and visible HTML rather than multiplying static files or adding a dynamic image service.

This establishes crawler-compatible source, not successful rendering inside X: the deployed Worker is still stale, X may retain a prior failed-card cache, and no outbound post was made merely to test it. The next authorized release should verify both Twitterbot GET/HEAD responses and a newly created result URL before treating the original “Card unavailable” report as closed.

Sources: [X card image specifications](https://docs.x.com/x-ads-api/creatives) · [Open Graph structured image properties](https://ogp.me/)

The same audit found a separate Home-preview leak: Webflow's deployed `dasha-social-card-v4.png` still embeds the retired “old coin / not the dev” line even though prepared page copy is clean. The canonical local `dasha-og-card.svg` and 1200×630 PNG now use only current Studio copy. The fast ship gate scans the SVG for negative or retired product language, while the landing test pins the rendered PNG dimensions.

The live audit now closes the remaining false-success path. It parses the actual Home `og:image` regardless of meta-attribute order, fetches the asset as bytes, requires a 1200×630 PNG, and compares its SHA-256 with `dasha-og-card.png`. The current public image passes availability and dimensions but fails exact parity, so a body-only Webflow release cannot be reported announce-ready. Webflow's CLI can upload the prepared image, but page metadata separately owns `openGraphImage`; the authorized release must do both and pass this readback. Sources: [Webflow CLI asset commands](https://developers.webflow.com/cli/command-reference) · [Webflow page metadata](https://developers.webflow.com/designer/set-page-metadata)

Page metadata now has a source of truth instead of living in screenshots and historical docs. `dasha-webflow-metadata.mjs` pins each route's concise title, description, Open Graph copy, canonical URL, and Webflow page ID where one exists, and emits the documented Data API payload for SEO/Open Graph text. The live audit compares all five public routes field-by-field. Its first run found every route mismatched: Home retains “culture coin,” Studio and Lobby retain defensive no-wallet/account copy, Desk retains custody disclaimers, `/how-to-buy` claims a “verified CA,” and Lobby lacks a canonical URL. Prepared Lobby and buying-guide HTML now match the contract and the Worker asset hash was regenerated; Home, Studio, Desk, and the Webflow Lobby shell remain release-gated page-setting writes. Webflow's Data API supports SEO and Open Graph text under `pages:write`; its Designer metadata API separately controls `openGraphImage`.

The crawler audit removed the buying guide's `HowTo` JSON-LD from both its source and static generator. Google retired HowTo rich results and removed the feature's documentation, so the markup added a second description surface without producing a current Search result. A `SoftwareApplication` replacement would be worse: Google's eligibility rules require a real rating or review in addition to name and price. Dasha has no first-party review corpus, so no rating, review, or app schema is fabricated. Canonical links and the root sitemap remain aligned because Google treats `rel="canonical"` as a strong signal and sitemap inclusion as a weaker, stackable one. The metadata readback now also requires `og:type=website` and exact `og:url`→canonical parity on every route, closing a gap where correct copy could mask a wrong share destination. Sources: [Google Search documentation updates](https://developers.google.com/search/updates) · [Software app structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app) · [Canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) · [Sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

### Mobile and Blinks re-rank — defer

Solana Actions remain transaction-producing APIs: a production Action needs GET metadata, a POST that returns a signable transaction, CORS, `actions.json`, wallet/client execution, and often registry verification before rich social unfurling. Dasha has no requested on-chain action beyond an existing Jupiter swap, so a buy Blink would add signing and trust surface without strengthening the measured quiz → Studio → share loop.

Solana Mobile's current discovery layer has passed 900 apps and explicitly curates polished, habit-forming products using themed placement and verified user reviews. That makes native distribution a later packaging opportunity, not evidence to build an Android app now. Reconsider only after the web product shows repeat creation and enough real mobile feedback to define a daily-use job. Sources: [Solana Actions and Blinks](https://solana.com/developers/guides/advanced/actions) · [Solana Mobile App Spotlight](https://solanamobile.com/blog/introducing-dapp-spotlight-in-the-solana-dapp-store)

X's current Filtered Stream can deliver matching public posts in near real time, but transport is not attribution: an automated stream still cannot prove that a post is original, useful, or eligible for a fixed creative award. Keep creator points reviewed and capped until real submission volume justifies a narrow discovery rule and moderation queue. The existing classic SPL mint also cannot gain Token-2022 metadata, hooks, transfer fees, or gating after creation; those primitives imply a different mint and are not a Dasha website feature. Sources: [X Filtered Stream](https://docs.x.com/x-api/posts/filtered-stream/introduction) · [Solana SPL token basics](https://solana.com/docs/tokens/basics) · [Token Extensions](https://solana.com/solutions/token-extensions)

### 2026-08-09 discovery and wallet follow-up

Jupiter's current Tokens API treats the old community token lists as history. Discovery now exposes
verification state, `audit.isSus`, tags, and a relative Organic Score derived from organic trading
signals. The exact Dasha record is discoverable and still matches the immutable identity and
graduated pool; it has no website or positive VRFD verification. `dasha-onchain-check.mjs` fails only
an affirmative `audit.isSus === true` signal, explicit banned verification, or a banned tag; a
present false/null field is not adverse. It records volatile discovery fields for operator
comparison. Organic Score, price, holders, and tags remain observations—not homepage claims,
product KPIs, Simp points, or release identity. A free standard VRFD submission remains preferable
to the 1000 JUP Express flow; neither is performed without explicit authority.

Phantom's public token page currently resolves the exact mint, name, symbol, image, and immutable source-post description, but labels the token unverified. Phantom documents no manual verification form; it derives recognition from providers such as Jupiter and CoinGecko and says provider listing does not guarantee or schedule Phantom verification. The same on-chain checker now confirms the linked Phantom page still resolves the exact identity and reports its presentation state as a soft discovery gap. This makes the minimal Jupiter metadata/VRFD path the one shared intervention worth preparing; a separate Phantom integration would be theater.

CoinGecko is a second possible upstream but not a substitute local task. Its current listing workflow requires an actively traded market, an authenticated request, and a public verification post from a social account linked by the project website; the request ID must then be posted as a reply. Getdasha has a valid GeckoTerminal market and links `@dash_eats`, but no agent can truthfully manufacture account ownership or the required public post. Keep CoinGecko listing externally gated and do not create a fake “official project” identity to satisfy it. Jupiter's free standard VRFD review remains the narrower discovery path because the metadata payload is already prepared and it can update website/X presentation without changing immutable Metaplex data.

The external-route audit distinguishes source shape from navigation truth. The public site now exposes Jupiter as its one transaction route and requires its URL plus independent order response to preserve the exact Dasha mint. The opt-in on-chain checker may still follow Pump.fun, Phantom, and Raydium as discovery observations and require Pump's rendered coin page to retain the `dash_eats` identity; those probes no longer justify presenting extra buy buttons. Solscan and Birdeye currently return bot challenges to automated fetches, so they remain exact-address source checks rather than brittle live failures.

The finalized authority readback confirms a classic SPL mint with six decimals, null mint authority, null freeze authority, positive supply, and immutable Metaplex metadata. Solana documents that revoking an authority to `None` is permanent; Metaplex separately requires both the update authority and `isMutable: true` to change fungible-token metadata. The checker now pins the known metadata account and decoded update-authority identity as well as the immutable flag, URI, name, symbol, image, X source, and Pump launch source. It rejects unexpected website, Telegram, or Discord fields in the content-addressed IPFS record. Supply remains an observation rather than a public claim because holders can still burn their own tokens even when new minting is impossible. Sources: [SPL Token basics](https://solana.com/docs/tokens/basics) · [Metaplex fungible metadata updates](https://developers.metaplex.com/tokens/update-token) · [Solana `getAccountInfo`](https://solana.com/docs/rpc/http/getaccountinfo)

Raydium's AMM-v4 documentation also confirms that liquidity providers realize their position by burning LP tokens through `Withdraw`; pool existence and an exact LP mint therefore do not establish permanently locked liquidity. The public claims gate now rejects fixed/capped supply, locked or burned liquidity/LP, and renounced-ownership language. It still permits precise, independently checked statements such as null mint/freeze authorities or immutable metadata; those facts are not rewritten into broader permanence promises.

Solana's current frontend guidance prefers `@solana/kit` plus Wallet Standard for new transaction-heavy applications, but Dasha's only local wallet action is an optional zero-point holder badge. Replacing the small injected-wallet path with a framework would add more code than capability. Android MWA remains limited to Chrome-compatible mobile web, while iOS relies on wallet in-app browsers or Safari wallet extensions. Keep the existing Phantom browse fallback and revisit Wallet Standard only if observed holder-proof usage justifies broader wallet discovery.

The holder-proof audit keeps the existing legacy `connect` + `signMessage` fallback because the badge is not a wallet-authentication system and does not justify adding Wallet Adapter. Its message already follows the Sign In With Solana field shape, including address, URI, chain, nonce, issuance, expiry, and request ID; the Worker additionally binds the signed challenge to the linked X identity, persists one pending nonce, consumes it before RPC, checks the exact mint at finalized commitment, retains no wallet address, and awards zero points. The shared address validator now decodes Base58 and requires exactly 32 bytes instead of accepting any 32–44 character lookalike, and the signed domain is the exact `www.getdasha.com` product host rather than the apex. Tests cover malformed-length addresses, wallet substitution, signature mismatch, one-use replay, RPC call count, expiry state, and rate limits. SIWS remains a future UX upgrade only if Wallet Standard `signIn` support is added for an observed need; its principal value would be wallet-constructed domain-aware prompts, not stronger token-balance evidence. Sources: [Sign In With Solana specification](https://github.com/phantom/sign-in-with-solana) · [Phantom message signing](https://docs.phantom.com/solana/signing-a-message) · [Solana `getTokenAccountsByOwner`](https://solana.com/docs/rpc/http/gettokenaccountsbyowner)

Sources: [Jupiter Tokens API](https://developers.jup.ag/docs/tokens) · [Jupiter Express Verification](https://developers.jup.ag/docs/tokens/verification) · [Phantom verification sources](https://help.phantom.com/hc/en-us/articles/36284556853139-What-makes-a-token-appear-as-verified-in-Phantom) · [Phantom token pages](https://docs.phantom.com/developer-powertools/token-pages) · [CoinGecko listing workflow](https://support.coingecko.com/hc/en-us/articles/7291312302617-How-to-List-a-New-Cryptocurrency-on-CoinGecko) · [CoinGecko request verification](https://support.coingecko.com/hc/en-us/articles/23725417857817-Verification-Guide-for-Listing-Update-Requests-on-CoinGecko) · [Solana frontend guidance](https://solana.com/docs/frontend) · [Solana Mobile web compatibility](https://docs.solanamobile.com/get-started/web/apps) · [Solana Mobile wallet UX](https://docs.solanamobile.com/get-started/web/ux-guidelines)

### P0 — Quiz result → Studio seed — built

Add one result action: **Make one**.

It opens Studio with a result-specific photo, line, and visual treatment through existing URL state. No new backend and no new controls:

- Dasha scholar → deep-cut cinema/lore seed
- Confirmed simp → classic line seed
- Deep in the lore → archival/internet seed
- Watching respectfully → accessible starter
- Dasha curious → playful beginner seed

Success evidence: result-to-Studio clicks and subsequent export/share intents.

### P1 — Anonymous Studio funnel — built locally

Reuse the Worker event pattern already used by quiz metrics. Store aggregate counts only:

- studio_open
- first_edit
- export
- share_intent
- share_success when the Web Share API promise resolves; this is a browser handoff signal, not proof that a post was published

Do not key events by X account, wallet, IP, caption, photo, or draft. Add only a coarse source bucket: home, quiz, direct, or other.

Implementation: `dasha-meme-studio.html` emits `open`, `first_edit`, `export`, `share_intent`, and `share_success`. The last event means only that `navigator.share()` resolved; the public aggregate names it `shareApiResolutions` so it cannot be mistaken for verified publication. `dasha-lobby-worker.mjs` stores fixed aggregate counters in the existing Durable Object. `/studio/metrics` is protected by the existing moderation secret. Unknown fields are discarded; unknown events and untrusted browser origins are rejected.

Operator readout after deployment: `LOBBY_MOD_SECRET=… npm run dasha:studio:metrics`.

Interpretation limit: each stage emits at most once per page load, so the counters approximate page-load progression without storing a session identifier. They are not unique-user analytics or retention. Desktop X compose is a share intent, never a confirmed share. A Web Share API resolution can mean only that the chooser opened or that data reached a target; it does not verify publication.

### P2 — One featured artifact

After at least five genuine community submissions, show one featured artifact with its image, creator X handle, one short curator line, and an open-in-Studio link when reconstruction is possible.

Rotate manually first. Do not build nominations, voting, seasons, rewards, or a gallery.

### P3 — Mobile distribution probe

Make the existing web product installable only if return usage appears. Do not build a native Solana Mobile app or wallet integration before repeat mobile use exists.

## Explicit non-tasks

- no creator-coin relaunch or content coins;
- no referral rewards or trading points;
- no points for purchases, balances, likes, or reposts;
- no peer-voted creator ranking;
- no buy Blink yet;
- no Farcaster identity or Mini App yet;
- no token-gated Lobby;
- no native mobile app yet;
- no PWA install/share-target machinery yet;
- no C2PA badge or cryptographic provenance claims yet;
- no empty featured gallery;
- no AI meme generator before existing editing usage is measured;
- no new surface whose only purpose is to explain the project.

## Falsification gates

| Hypothesis | Evidence needed | Kill / defer condition |
|---|---|---|
| Quiz can feed creation | result → Studio clicks and exports | fewer than 5 downstream actions after 100 completed results |
| Studio is repeatable | edits, exports, shares, returns | opens occur but fewer than 10% reach export/share |
| Recognition motivates | credited feature produces another submission or return | no follow-on contribution after three features |
| Mobile packaging helps | measurable repeat mobile visits | no repeat use; remain a responsive website |

## Immediate task order

1. Publish the verified public-copy cleanup when Webflow OAuth is available.
2. Publish the quiz → Studio bridge and aggregate Studio metrics with the next authorized release.
3. Read the aggregate funnel after enough real traffic; do not infer from test events.
4. Observe before adding a featured artifact.
5. Update this decision from evidence, not token price or feature fashion.

## 2026-08-09 owned-community check

Fresh community-product research does not justify another Dasha surface. The reported X Communities shutdown, Acorn's full owned-community stack, exchange social feeds, and Pump's livestream moderation history all point to the same constraint: a feed creates moderation and retention obligations before it proves cultural value. X's Help Center and API reference still describe Communities after the reported shutdown date, so those pages are not reliable availability evidence. The product conclusion does not depend on that ambiguity: keep the single Lobby, outward X sharing, and optional X identity; do not add DMs, feeds, engagement rewards, token gating, or AT Protocol identity.

The useful implementation delta was invisible: the removed Report UI had left an anonymous `report` WebSocket frame that could affect auto-shield. That dead protocol is now removed and pinned closed by test. Existing bounded history, link allowlist, rate limits, automod, slow mode, shield, mute, clear, and pin controls remain.

The deferred creator-discovery plan survives a direct feasibility check because normal and image-only Studio shares both include the Studio URL. Enable one narrow X filtered stream only after real shares exist and API credits are intentional; enforce a spending ceiling and editorial review, never automatic points.
