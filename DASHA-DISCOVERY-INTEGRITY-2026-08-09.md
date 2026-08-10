# Dasha discovery integrity — exact mint, inconsistent profiles

**Updated:** 2026-08-09  
**Scope:** How `$dasha` appears outside getdasha.com; which source establishes each claim; which corrections are locally controllable.

## Current result

The durable token identity and transaction route are healthy. The discovery presentation is fragmented.

Verified release readback at `2026-08-09T10:52:49Z` shows one current `og:image` on both Home and
Lobby: `https://lobby.getdasha.com/og/dasha-social-card.png`. Worker release
`c30a51d144dd513c` serves that exact 1200×630 PNG with `image/png`, CORS/CORP, cache headers, and
content bytes covered by the release hash. The legacy duplicate Home tag and Lobby's older card are
gone. The discovery audit now compares the live bytes with this release-owned asset rather than the
superseded worktree card.

The Webflow MCP schema now exposes `openGraph.imageUrl` / `imageAssetId`; the earlier “Designer-only”
assumption is obsolete. Readback identifies Home native asset `6a77fe9db067d20182a0995a` plus its
legacy freeform `og:image`, and Lobby native asset `6a776335c294a629047ee9b0`. The root shipper
now reconciles both native page settings to the release-owned Worker URL and removes only the Home
freeform `og:image` immediately before an explicitly authorized publish. It preserves the canonical,
`og:url`, dimensions, Twitter image, theme color, favicon ownership comments, and scoped CSS, then
requires page-setting readback before publication. That reconciliation is now live and verified.

Verified again at finalized slot `438186792` on 2026-08-09:

- exact mint `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump`;
- classic SPL Token Program, 6 decimals, positive supply;
- mint authority `null` and freeze authority `null`;
- one matching Metaplex account with name `dash_eats`, symbol `dasha`, matching mint, immutable metadata, IPFS image, and the original `@dash_eats` source post;
- Jupiter, Pump.fun, Raydium, and Phantom routes preserve the exact mint;
- Jupiter returns a nonzero SOL → exact-mint order through the canonical graduated Raydium pool;
- finalized Solana state identifies that pool account as a non-executable account owned by Raydium's published AMM-v4 program `675k…Mp8`;
- Raydium's own API identifies the same pool as `Standard` AMM v4 with the exact classic-SPL WSOL (9 decimals) and Dasha (6 decimals) mints and LP mint `8GDv…h3Aj`;
- Dexscreener and GeckoTerminal independently resolve the same mint/pool relationship.

### Two X posts, two provenance claims

The immutable IPFS metadata links `1886425751458877863`: the February 2025 lore/origin post saying
“Can someone send me some crypto currency as a funny bit haha.” It does **not** contain the mint.
The product links `2085405228078432279`: the August 2026 `@dash_eats` post that contains the complete
exact mint. Calling the latter the public mint-source post is accurate; calling the former immutable
metadata provenance is accurate. Neither post replaces finalized mint-account identity.

The on-chain checker now keeps both constants and corroborates the later post through X's official,
unauthenticated oEmbed endpoint: returned URL, author profile and exact mint text must agree. A
reachable contradiction hard-fails identity; temporary oEmbed unavailability remains a discovery
gap rather than pretending the finalized mint disappeared.

Current presentation gaps:

| Surface | Exact identity | Gap | Authority / action |
|---|---|---|---|
| Jupiter | Yes | No website; X is source post; third-party verification request is pending with conflicting identity claims | Do not duplicate verification; keep canonical metadata correction separate |
| Phantom | Yes | Public page says unverified and uses source post as About | Likely downstream of recognized providers; no separate local integration justified |
| Solflare | Yes | Says unverified and **Mutable: Yes**, while finalized Metaplex and the current Rugcheck API both say immutable | Treat as stale third-party presentation; Jupiter identity correction is separate |
| Solana Explorer | Direct page: yes; name search: intermittent; mint search: no | Consecutive `dash_eats` probes alternate between zero results and three unverified results (exact mint plus two same-image duplicates); full-mint search returns zero | Keep direct identity, query discovery, ranking, and verification separate; Jupiter review is the narrowest current lever |
| Dexscreener | Pool identity yes | Editable profile exposes `dasha.cam` and banned Telegram | Keep it non-clickable; public chart remains exact GeckoTerminal pool |
| Search results | Mixed | Multiple mints reuse `dash_eats`, `dasha`, source posts, and image derivatives; `Dashaonsol`, Telegram, `dasha.cam`, and AI descriptions also map to the exact mint | Never identify by name/image alone; strengthen exact-mint upstream metadata |

### First-party indexing readback

A 2026-08-09 public search for the exact domain, `site:getdasha.com`, and the full mint did not surface a getdasha.com page. The full mint did surface the correct Solflare token page and several third-party pages. This is a bounded search-engine observation, not proof that every engine has excluded the site or that a technical crawl error exists.

The cheaper discriminating check found no current crawl defect: `robots.txt` allows public routes
and names both sitemaps; the live www sitemap lists six routes; and every listed URL currently
returns 200, omits `noindex`, and declares its own exact canonical URL. The weakest sufficient
explanation is therefore indexing lag or weak external authority. Do not add keyword copy,
duplicate pages, or another sitemap from this observation alone.

The same route inventory previously exposed missing large-image metadata on `/how-to-buy` and
`/rally`. Both now return a current `og:image` and `summary_large_image`; the six-route social-card
audit is green.

Google's current crawl guidance distinguishes sitemaps from ordinary internal links and recommends
standard `<a href>` links to important pages. The current live Home still omits `/how-to-buy` and
`/rally`, leaving two of six live sitemap routes orphaned from the entry page.

Product review found that only `/how-to-buy` earns a distinct route: it serves a concise newcomer
job without duplicating Home. Rally repeats the Home → Studio/Quiz/Lobby/Buy hub, restores forbidden
disclaimer copy, and has no attributable use evidence. The prepared release therefore links only
the buy guide, removes Rally from both sitemap copies and Home, excludes its HTML from Worker bytes,
and returns a permanent server-side redirect from the old URL to Home. Google documents 301/308 as
the correct signal for a permanent server-side move.

### Post-release copy and audit correction

The broader live audit after publication found three genuine negative-copy regressions: Home says
“wrong one” / “never trust,” Desk says “fakes exist,” and Studio still offers an “old coin” caption.
It also contained six stale checks tied to retired architecture. The audit now recognizes the
literal SRI hash actually shipped, the release-owned social card, the inline Studio, and the neutral
Desk without retired Pump.fun rails. Its hard-failure set is therefore exactly the three copy
surfaces plus the one sitemap-navigation invariant. Affirmative replacements, the one justified
footer link, and Rally retirement are prepared and pass the focused gates; they are not published
by this continuation.

The root publisher previously advanced its manifest after narrower route-marker readback, so those
four broader failures were discovered only afterward. Site-wide verification now also invokes this
canonical live audit before a manifest can become verified. This reuses the existing audit rather
than duplicating its crypto, SRI, Worker, sitemap, metadata and header rules in the publisher.
Gate receipts now also hash the release contract, shipper, focused gate sources and broad
live/domain audits. A verifier change can no longer inherit an earlier `gated: true` result merely
because the page artifacts themselves are unchanged.

## Source hierarchy

No aggregator is authoritative for every field.

1. **Solana finalized mint account:** token program, decimals, supply, mint authority, freeze authority.
2. **Metaplex account + referenced IPFS JSON:** durable name, symbol, image, source-post identity, mutability.
3. **Finalized pool account owner + Raydium's canonical pool registry:** pool program, exact pair relationship, token programs/decimals, and LP mint. Raydium documents its REST response as cached discovery data, so finalized account ownership remains the stronger program check.
4. **Independent pool indexes:** corroborating exact-pair observations, not settlement truth.
5. **Jupiter order response:** whether a current executable route exists for the exact input/output pair.
6. **Wallet, explorer, search, and editable token profiles:** presentation observations only; never use them to override contradictory finalized data.

### Solflare's stale risk panel

Solflare's page says its visible risk data comes from Rugcheck. Rugcheck's current full report for the exact mint says `tokenMeta.mutable: false`, null mint/freeze authorities, and zero current risk entries, agreeing with the independently decoded finalized Metaplex account. Solflare still renders `Mutable: Yes`, so the contradiction is downstream presentation lag rather than current Rugcheck or on-chain state.

The checker now reads Rugcheck directly and pins only durable identity fields: exact mint/program, null authorities, name/symbol/URI, and immutable metadata. It reports the number of current risk entries and normalized score as observations rather than homepage claims or release identity. Solflare documents Jupiter as the source of its swap list, but that does not establish that a Jupiter metadata update will refresh its separate Rugcheck-derived risk panel.

### Explorer's split identity state

Solana Explorer currently recognizes the exact mint on its direct address route: the server-rendered title names `dash_eats` and the page contains the full mint. Its provider endpoints also return Rugcheck `1/100`, Jupiter `verified: false`, CoinGecko `verified: false`, and Bluprynt `verified: false`.

Searchability is query- and upstream-state-dependent. During this audit, the live `dash_eats` query alternated between zero results and the exact mint among three unverified same-image results; the full-mint query consistently returned zero. The latest check at `2026-08-09T16:26:16Z` returned zero for both queries while the direct token page still matched and Rugcheck still returned `1/100`.

Current Explorer source at commit [`310ee3f`](https://github.com/solana-foundation/explorer/commit/310ee3f949e35c57144d325d92531cdbb675b9d8) resolves search candidates through Jupiter Tokens V2 `search?query=...`; only when that request is unavailable does it fall back to the legacy curated token list, whose own source comment says it cannot provide address search. Rugcheck is not a search input. It is fetched through a separate `/api/verification/rugcheck/<mint>` route after a direct address page is open and supplies only one verification-badge source.

This directly contradicts the current Solana guide's claim that automatic Rugcheck pickup, or any one provider, is sufficient to make a token appear in Explorer search. Treat that sentence as stale or overgeneralized implementation guidance, not a runtime guarantee. The supported conclusion is narrower: Dasha has a correct direct Explorer identity and a good Rugcheck signal, but name discovery is intermittent/ambiguous and it lacks exact-mint search resolution and positive Jupiter verification. Jupiter search inclusion is the actual current Explorer discovery dependency; Rugcheck presence cannot repair it.

This makes the already-prepared Jupiter review more valuable without making acceptance predictable. Do not describe the token as “Explorer verified” until the exact-mint search result and provider readbacks support that wording.

### Phantom is downstream, not another submission lane

Phantom's current support documentation says its verified-token presentation uses trusted third-party
data such as CoinGecko and Jupiter. It also says there is no email address or form for token
verification, recognition by either upstream does not guarantee a Phantom badge, and no propagation
timeline is available. The exact Dasha mint page currently resolves and names the token, but remains
unverified and uses the immutable source post as its About link.

Therefore do not open a generic Phantom ticket or invent a Phantom metadata payload. Correct Jupiter
and/or complete a truthful CoinGecko listing, then use Phantom only as downstream readback. A Phantom
badge confirms recognition by its providers; it would not establish safety, endorsement, ownership or
the site's authority to speak for the token.

### Name and image collisions

Jupiter's current `dash_eats` query returns the canonical mint first, followed by multiple other mints using the same name/symbol combination. Several use image URLs derived from the canonical mint or cite recent `@dash_eats` posts. Explorer's narrower name search is unstable: consecutive live probes alternated between zero results and three unverified results, where the latter set contained the exact mint beside two other mints using the same canonical IPFS image.

This is evidence of active identity collision, not proof about the intent of every creator. Names, symbols, images, X links, null authorities, and even Pump.fun provenance are not unique identifiers on Solana. The durable discriminator remains the complete mint `53ux…pump`, corroborated by its February 2025 creation history, immutable metadata account, graduated Raydium pool, and getdasha's own exact-mint links.

No new public warning panel is justified: Home, Desk, the buy guide, and transaction links already expose or lock the complete mint. The useful improvement is monitoring. The checker now records whether the canonical mint appears in Jupiter/Explorer name search, how many exact name/symbol collisions exist, and which Explorer results reuse the canonical image.

### DexScreener's mutable profile is not identity evidence

The current exact-pair API still reports `https://dasha.cam` as Website and
`https://t.me/dashacommunity` as Telegram. It also links a real `@dash_eats` post, but one correct
field does not validate the others. The on-chain checker now preserves the profile's website/social
rows and reports non-canonical websites or Telegram as discovery gaps without failing durable mint
and pool integrity.

DexScreener says token information is imported automatically from external lists such as CoinGecko,
with paid Enhanced Token Info as the faster alternative. CoinGecko and GeckoTerminal require a
public verification post from a social account linked by the project website; GeckoTerminal also
requires the contract to be visible on an official site or social profile. These rules make a
truthful CoinGecko/GeckoTerminal request potentially higher leverage than buying another mutable
DexScreener profile, but it remains externally gated on account control and a public post. Do not
pay for Enhanced Token Info or automate a false ownership claim.

### Current VRFD queue state

The public Jupiter VRFD API already has a `pending` basic-verification request for the exact mint, created 2026-08-07. It was submitted by `radbrilio`, names `Dashaonsol` as the token X handle, and makes an “official” claim while citing `@dash_eats`. Public search results show `@Dashaonsol` also advertises this exact mint, so the handle difference alone is not evidence of a different token or a malicious submission. It does differ from getdasha's chosen canonical profile, and the “official” claim is not established by finalized chain metadata or getdasha.com; neither should be copied into product copy.

Jupiter's current Tokens API documentation distinguishes ordinary unverified status from an explicit
banned level and separately describes `audit.isSus` as a conditional suspicious flag. The checker
hard-fails `verification: banned`, a `banned` tag, or affirmative `audit.isSus === true`, while
leaving null/false verification as a discovery gap. Field presence alone is not suspicion. This
avoids converting “not reviewed” into “unsafe” without overlooking an explicit provider signal.

Do **not** submit a duplicate verification request while this record is pending. Jupiter documents an existing pending request as the common eligibility blocker. The metadata correction remains logically separate: Jupiter says verification and metadata updates are reviewed independently, and the existing public metadata endpoint still has no reviewed `tokenMetadata` record. Keep the minimal target in `dasha-jupiter-metadata.json`; do not add a different handle or official-token language.

Submission-ready evidence already on disk:

- exact mint and classic SPL program from finalized RPC;
- null mint/freeze authorities and immutable Metaplex metadata;
- canonical `dash_eats` name, `dasha` symbol, IPFS image, and source post;
- `https://www.getdasha.com` linking the full mint and `https://x.com/dash_eats`;
- canonical graduated Raydium AMM-v4 pool and a live exact-mint Jupiter route;
- current Jupiter metadata target containing only mint, website, and canonical X profile.

Readback, not submission activity, remains the completion proof: `website` must become `https://www.getdasha.com`, `twitter` must become the canonical profile, and Explorer/Jupiter must positively identify the exact mint before any verified claim. Name-search presence alone proves only ambiguous discoverability.

## Weakest sufficient intervention

Submit one minimal Jupiter **metadata** request through VRFD Open when an authenticated contributor
can provide the canonical evidence and the interface confirms the standalone update's current
eligibility and cost before submission:

```json
{
  "tokenId": "53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump",
  "website": "https://www.getdasha.com",
  "twitter": "https://x.com/dash_eats"
}
```

Canonical payload: [`dasha-jupiter-metadata.json`](dasha-jupiter-metadata.json).

## 2026-08-09 ecosystem decision

The next crypto improvement is **distribution integrity, not another onchain feature**.

Jupiter's current Tokens V2 documentation makes a second priority explicit: Organic Score influences
token discovery, verification, and whether Price API considers a price trustworthy. It is relative
to the ecosystem and combines confirmed organic volume, holders, traders, and buyers; it is not an
absolute count of humans. At the 2026-08-09 05:58 PDT read, the exact Dasha mint reported about
`50.5` / `medium`, null positive verification, no website, and the source-post X URL. Its mint/freeze audit controls are positive,
but those do not substitute for discovery activity. The checker now records bounded 6h/24h provider
telemetry beside a warning that it is not product success, safety, or a public performance claim.
Do not game this signal with raids, rewards, wash activity, or a trading leaderboard. The product
response is genuine human creation and sharing; the metadata response is the existing narrow
website/X correction.

The volatility is observed, not hypothetical: the same provider record moved from roughly `51` / `medium` before 10:00 UTC to `0` / `low` shortly afterward while finalized mint, metadata, pool, reserves, and exact-mint route checks remained consistent. Jupiter itself describes Organic Score as an activity classifier derived from trading and wallet signals, with scores that can move as its evidence changes. Do not alert on score movement alone or turn it into a release invariant. The route monitor separately migrated from superseded Ultra to current Swap V2 `/order`; DFlow winning the meta-aggregator auction is valid router selection, not evidence of pool replacement.

Solana's current verification guide says Explorer aggregates independent signals from RugCheck, Jupiter, CoinGecko, Solflare, and Bluprynt and claims one recognized provider can make a token discoverable in Explorer search. Current Explorer code is narrower: Jupiter Tokens V2 supplies search candidates, while those providers supply separate verification readbacks. Jupiter's current VRFD Open page says anyone can submit verification, metadata corrections, news, or bad-data flags, and every contribution is publicly reviewed. That makes the minimal Jupiter identity correction unusually high leverage without pretending Rugcheck already solved search: one exact website/X/mint association can improve the provider Explorer actually queries, plus several downstream discovery surfaces, without adding custody, a wallet framework, token incentives, or another user flow.

Solana sRFC-35 proposes a DNS TXT record or `/.well-known/solana.txt` association such as `solana-mint-address=<mint>`. It is not an adopted wallet-discovery dependency here: the proposal expects a bidirectional domain reference, Dasha's immutable off-chain metadata points to the source post rather than getdasha.com, and its own security section recommends DNSSEC, which the domain does not yet have. Do not publish the record as verification theater. Reconsider only if a provider Dasha actually uses consumes the proposal or the bidirectional/DNSSEC conditions become true.

This boundary was retested against the full specification on 2026-08-09. A one-way Worker endpoint
was briefly prepared, then removed before deployment after the bidirectional and DNSSEC conditions
were confirmed. The useful by-product—the Worker release hash now covering executable source—was
kept; the invalid association claim was not.

Solana Actions/Blinks remain a later option, not a current task. They are useful when a product has a specific transaction or signed-message action worth sharing. Getdasha already has a working Jupiter path and does not yet have evidence that an additional signing surface would improve Studio, quiz, or Lobby retention. Adding one now would duplicate the swap path and increase trust/UI burden.

Do not add Telegram, Discord, a mutable description, verification claims, price claims, or unrelated
profile fields. Jupiter documents a free Standard **verification** lane and a paid Express API that
costs 1,000 JUP and can bundle verification with metadata. The public VRFD Open surface also exposes
an independently reviewed `Update meta` action, but the retrieved public text does not establish a
universal fee for a standalone Standard metadata correction. Confirm that exact action's eligibility
and price at the final review screen; do not infer “free” or pay merely to accelerate an uncorrected
identity claim.

## External gates

- Jupiter's standard contribution path is open, free, and publicly reviewed; it does not require the paid Express API. An authenticated project account is stronger evidence but is not a stated eligibility requirement. A third-party verification request is already pending, so do not duplicate it. No agent should claim acceptance before Tokens API readback changes.
- CoinGecko requires an authenticated request plus a public verification post from a social account linked by the project website, followed by a reply containing the request ID. This cannot be truthfully automated from repository state.
- CoinGecko offers a paid expedited review, but payment does not guarantee approval and is not required for the current narrow correction.
- GeckoTerminal currently offers a no-fee Regular Pass and an optional Fast Pass; either still
  requires public, consistent website/social evidence and the public verification-post sequence.
- Do not create or use a fake “official” account to repair metadata.

### 10:03 PDT provider refresh

Finalized identity, immutable metadata, two-gateway IPFS byte corroboration, canonical Raydium pool
ownership/vaults and a nonzero Jupiter route still pass at slot `438236213`. The current Jupiter
record remains unverified with no website and a post URL in its X field; VRFD request `15201` remains
pending with zero evaluations. Explorer's exact-mint and name-search probes both returned no result
on this read, reinforcing that search visibility is provider-state telemetry rather than durable
identity.

Current official documentation makes the dependency chain clearer: Jupiter describes Tokens V2 as
the token-data source used by Phantom, Solflare and many Solana apps; Solana's Explorer guide names
Jupiter and CoinGecko as the fastest manual discovery routes; DexScreener says it automatically
imports token information from external lists such as CoinGecko. CoinGecko verification also flows
into GeckoTerminal's verified metadata. This supports the existing queue—truthful Jupiter metadata
correction first, then one authenticated CoinGecko/GeckoTerminal request when the required public
verification post can exist—and rejects a paid DexScreener-only patch.

## Local controls completed

- `npm run --silent dasha:onchain:summary` prints machine-readable durable identity, provider identity, discovery gaps and failures for routine drift review. `npm run dasha:onchain:check` retains the full diagnostic object. Both execute the same probes; durable identity/route mismatches fail while mutable presentation gaps remain explicit.
- Its Jupiter snapshot now preserves the provider's mint/freeze audit controls and bounded 6h/24h
  organic telemetry with an explicit non-KPI/non-safety boundary; it does not promote volatile price,
  volume, market-cap, or score numbers onto the site.
- `npm run dasha:audit:live:fast` now reads every www sitemap URL and fails if a listed route stops returning 200, gains `noindex`, or canonicalizes elsewhere. This distinguishes a real crawl regression from mere absence in sampled search results.
- The same audit inventories large-image social metadata for every sitemap route, preventing a publicly navigable page from silently losing its share card.
- The Webflow metadata contract models the exact expected image per route, treats more or fewer than
  one `og:image` as drift, and emits the native `openGraph.imageUrl` update supported by the current
  API. The root ship path owns the bounded Home/Lobby reconciliation rather than relying on a manual
  Designer-only step.
- Fast ship and live readback compare Home anchors with the full sitemap route set, so a newly listed route cannot silently become an orphan.
- The checker treats Explorer direct-page identity as durable enough to fail on mismatch, while reporting search/provider status as third-party discovery observations. It does not collapse page rendering, search inclusion, and verification into one claim.
- The checker now pins the canonical pool's finalized AMM-v4 account owner and corroborates its exact program, two mints, token programs, decimals, and LP mint through Raydium's own API. It deliberately does not gate on TVL, price, volume, APR, market cap, or LP-token supply because those are volatile observations and do not establish permanence or product quality.
- The check now detects Solflare's mutable/unverified presentation against finalized Metaplex data.
- Public chart links use GeckoTerminal's exact pool; clickable Dexscreener profiles are rejected by release gates.
- Home, Desk, Studio, Lobby, and how-to routes retain the exact mint and current getdasha links.
- Home JSON-LD now gives search systems one compact identity graph: `WebSite` name/alternate name/canonical URL and X profile, plus an `$dasha` `Thing` whose `PropertyValue` is the full Solana mint and whose references are the exact Solscan token and canonical source post. Google documents `WebSite` structured data for site-name selection and says `sameAs` can help disambiguate identities; Schema.org supports typed external identifiers through `PropertyValue`. The markup makes no official, verified, safety, ownership, or endorsement claim.

## Sources

- [Solana token verification and Explorer aggregation guide](https://solana.com/developers/guides/getstarted/how-to-verify-a-token)
- [Solana sRFC-35 address/domain association proposal](https://forum.solana.com/t/srfc-35-address-domain-association-specification/3155)
- [Solana Explorer exact Dasha token page](https://explorer.solana.com/address/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump)
- [Solana Explorer search resolver at audited commit](https://github.com/solana-foundation/explorer/blob/310ee3f949e35c57144d325d92531cdbb675b9d8/app/features/search/api/resolve-search-tokens.ts)
- [Solana Explorer Jupiter discovery adapter at audited commit](https://github.com/solana-foundation/explorer/blob/310ee3f949e35c57144d325d92531cdbb675b9d8/app/features/search/api/discover-with-jupiter.ts)
- [Solana Explorer Rugcheck badge route at audited commit](https://github.com/solana-foundation/explorer/blob/310ee3f949e35c57144d325d92531cdbb675b9d8/app/api/verification/rugcheck/%5BmintAddress%5D/route.ts)
- [Jupiter Tokens V2 search documentation](https://developers.jup.ag/docs/tokens/token-information)
- [Phantom verified and unverified token sources](https://help.phantom.com/hc/en-us/articles/38425812822419-Difference-between-verified-and-unverified-tokens-in-Phantom)
- [Phantom verification propagation and no-direct-form policy](https://help.phantom.com/hc/en-us/articles/36284556853139-What-makes-a-token-appear-as-verified-in-Phantom)
- [Raydium canonical program addresses](https://docs.raydium.io/reference/program-addresses)
- [Raydium API v3: exact Dasha pool record](https://api-v3.raydium.io/pools/info/ids?ids=9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7)
- [Raydium AMM-v4 source and mainnet deployment](https://github.com/raydium-io/raydium-amm)
- [Google Search: site-name `WebSite` structured data](https://developers.google.com/search/docs/appearance/site-names)
- [Google Search: crawlable internal links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Schema.org `sameAs`](https://schema.org/sameAs) and [`identifier`](https://schema.org/identifier)
- [Solana Actions and Blinks specification](https://solana.com/developers/guides/advanced/actions)
- [Jupiter Tokens API](https://developers.jup.ag/docs/tokens)
- [Jupiter: how Organic Score works](https://developers.jup.ag/blog/what-is-organic-score)
- [Jupiter VRFD Open](https://verified.jup.ag/)
- [Jupiter public exact-mint VRFD dashboard](https://verified.jup.ag/dashboard/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump)
- [X oEmbed API](https://docs.x.com/x-for-websites/oembed-api)
- [Immutable lore post](https://x.com/dash_eats/status/1886425751458877863) and [public exact-mint post](https://x.com/dash_eats/status/2085405228078432279)
- [Jupiter Express Verification and metadata fields](https://developers.jup.ag/docs/tokens/verification)
- [CoinGecko update workflow](https://support.coingecko.com/hc/en-us/articles/8820830357017-How-to-Update-Token-Information-on-CoinGecko)
- [CoinGecko verification-post requirements](https://support.coingecko.com/hc/en-us/articles/23725417857817-Verification-Guide-for-Listing-Update-Requests-on-CoinGecko)
- [DEX Screener token-information sources and Enhanced Token Info](https://docs.dexscreener.com/token-listing)
- [GeckoTerminal token-update rejection and verification requirements](https://support.coingecko.com/hc/en-us/articles/23689612586265-Why-did-my-token-information-update-request-on-GeckoTerminal-get-rejected)
- [Live Solflare exact-mint page](https://www.solflare.com/prices/dash-eats/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/)
- [Solflare token-list/Jupiter explanation](https://help.solflare.com/en/articles/9260147-i-cannot-find-a-token-in-solflare)
- [Solflare Metaplex metadata behavior](https://docs.solflare.com/solflare/technical/our-nft-standard)
- [Rugcheck exact-mint report](https://api.rugcheck.xyz/v1/tokens/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/report)

## Next evidence

After any authorized external request, rerun `npm run dasha:onchain:check`. Completion requires Jupiter API readback showing the exact website and canonical X profile; a submitted form, payment, screenshot, or promise is not proof.

For a future Solflare correction report, the minimal evidence packet is: exact mint; metadata account `ArJZQKqW1YuKgSwr4VWkVgavag1u7R8nDYSnCZASXJt3`; finalized decoded `isMutable: false`; current Rugcheck `tokenMeta.mutable: false`; and the exact Solflare page still rendering `Mutable: Yes`. Request only correction of that factual mismatch. Do not ask Solflare to label the token safe, endorsed, or verified, and do not include price, volume, score, holder, or liquidity claims.
