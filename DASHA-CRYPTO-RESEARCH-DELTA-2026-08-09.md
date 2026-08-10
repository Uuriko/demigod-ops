# Dasha crypto research delta — August 2026

Updated: 2026-08-09 UTC  
Scope: current primary sources, recent preprints, live Dasha evidence, and the smallest product implications that survive all three.

## Decision

Do **not** pivot Dasha into payments, a wallet, a trading terminal, an agent product, or another financial primitive. Solana is expanding rapidly in those directions, but none of that evidence establishes demand for those products from Dasha's users. Keep the current wedge: a concise exact-mint surface plus a Dasha-specific culture loop that produces portable artifacts and recognition.

The next product question is narrower: people are opening and editing in Studio, but there is not yet enough disclosed evidence to say whether they export or share. Preserve the current interface and observe the edit → export boundary before adding tools. A real mobile-and-desktop task check now proves the live edit → PNG-save path works; the suppressed export cell is not evidence of a defect.

## 20:50 PDT artifact-distribution and Chess delta

The latest public read reports 18 Studio opens, 10 first edits, 54 quiz starts and 36 quiz completions. Every Chess cell remains below the disclosure threshold of five. This supports maintaining the existing product and improving the artifacts it already creates; it does not support direct challenges, streaks, token rewards, another social feed, or a mobile wrapper yet.

Recent products keep converging on embedded social distribution, portable artifacts, and one shared identity. Farcaster Mini Apps use a manifest for client discovery and opt-in notifications; Solana Mobile now accepts wrapped web apps in its dApp Store; World Mini Apps report large in-host distribution; and Zora connects content, profiles, and one platform token through trade-linked rewards. Those are useful distribution patterns, not a mandate to copy their financial mechanics. Dasha already has a smaller coherent loop—quiz cards, Studio media, Chess brackets, and replays—without needing to tokenize each artifact or add another wallet surface. Sources: [Farcaster Mini Apps specification](https://docs.neynar.com/miniapps/specification), [Solana Mobile dApp Store](https://docs.solanamobile.com/dapp-store/intro), [World Mini Apps](https://world.org/blog/announcements/world-mini-apps-milestones-new-features-incubator-announced), and [Zora rewards](https://support.zora.co/en/articles/2509953).

The implementation audit found a concrete break in that loop: tournament matches retained every drawn game internally, but the public bracket exposed only the current or decisive game. Once a rematch began, the completed draw became undiscoverable. The prepared correction exposes only completed replay IDs and renders them in order, preserving public match history without changing matchmaking, identity, ratings, holder access, or tournament economics. Direct holder challenges remain gated until at least five tournament starts disclose.

The replay share itself had a second bounded gap: its dynamic page metadata named the players and result, but the only image was the generic Dasha card. The prepared client now renders the final position as a 1200×630 Dasha-versus-Anna PNG and passes it, the replay URL, and concise result text to the native share sheet when file sharing is supported. The existing X Web Intent remains the fallback. This follows the [W3C Web Share Recommendation](https://www.w3.org/TR/web-share/) and requires no posting authority, server upload, retained image, SDK, or new control. It turns an already-finished holder activity into a portable acquisition artifact while keeping authorship and destination under the player’s control.

This is also the defensible holder-demand path: make holding unlock an enjoyable product people voluntarily return to, and let its outputs recruit the next player. Do not manufacture reduced supply with lockups, penalties, promised yield, holder-weighted rankings, or paid promotion. Re-evaluate challenges or recurring Cup Night only after the privacy-safe Chess cells disclose real starts, completions, and replay-share intent.

Chess records now use server-derived Standard Algebraic Notation for ordinary moves, captures, disambiguation, castling, promotion, check, and mate. The UI retains coordinate fallback for stored games, while public replay reconstruction derives SAN for legacy records automatically. This follows [FIDE Appendix C](https://rcc.fide.com/appendixc/) and creates the prerequisite for a future PGN export without adding a PGN button before anyone asks for one. Chess.com’s current sharing guidance likewise treats a standard game record or URL as the input to portable GIF generation. Keep Dasha’s one Share action; consider animated replay export only after five replay-share intents disclose.

An isolated `chess.js` oracle run then compared Dasha’s complete legal-move set, chosen-move SAN, and game-over state across 40 deterministic random games: 6,365 positions and 6,365 plies produced zero mismatches. `chess.js` remains a temporary validation oracle, not a production or repository dependency; permanent tests retain canonical perft depths 1–4 plus focused castling, en-passant, promotion, notation, draw, clock, Worker, and browser regressions. This is strong bounded evidence, not a proof over every reachable chess position.

### Fresh incentive-quality research

Newer evidence strengthens the decision to measure finished artifacts rather than raw social volume. A 2026 natural experiment on Reddit’s crypto reward found that relative-performance rewards increased content quantity and effort while also increasing aggressive, attention-grabbing content. A 2025 UCL working paper reports that wash trading and fake comments can attract traders and redistribute wealth in memecoin markets. A 2026 PUPS case study reports an internal imitation pathway from propagation and sentiment to trading, but one project cannot establish a universal growth law. Sources: [ECIS 2026 reward experiment](https://aisel.aisnet.org/ecis2026/platforms/platforms/6/), [UCL memecoin manipulation paper](https://discovery.ucl.ac.uk/id/eprint/10220651/), and [PUPS study](https://doi.org/10.1145/3815189).

The product implication is narrow: count completed quizzes, finished edits, played games, completed tournaments, and voluntary replay-share intents; do not pay or rank people for posting frequency, likes, reposts, follower reach, trading, or bullish language. If Chess crosses its gates, the next candidates remain direct challenges after five tournament starts, Cup Night after repeat tournament completion, a puzzle made from a real community game after twenty completed games, and animated replay export after five replay-share intents. Each reuses a proven artifact or interaction; none creates a second economy.

## Observed evidence

### First-party product evidence

The public aggregate endpoint was read on 2026-08-09 UTC:

- Studio: 13 opens, 8 first edits, 0.615 open-to-edit event ratio at the latest read. Three opens/edits are synthetic (one formerly unisolated local regression run plus two explicit live task checks); the two live checks also generated exports. This aggregate cannot be treated as an organic funnel sample.
- Studio exports, share intents, and Web Share API resolutions remain below the disclosure threshold of five. An API resolution does not prove that a post was published.
- Quiz: 24 starts, 19 completions, 0.792 start-to-complete event ratio at the 2026-08-09 08:56 UTC read; replays and share intents remain below five. Historical starts may include prior smoke-test starts, so this ratio is not a clean organic baseline.
- Board: 17 measured profiles, 12 with quiz points, and zero profiles with creative, community, OSS, or holder points. Quiz contributes 442 points; the public operator summary now reports this composition directly without identities or unsuppressed private cohorts.
- These are aggregate events, not unique users, retention, or causal conversion evidence.

The weakest sufficient interpretation is that Studio's first action is usable for at least some visits and the next uncertainty is downstream. On 2026-08-09, Playwright completed the live path at 390×844 and 1440×900: Filter changed the rendered canvas, mobile sticky actions remained reachable, Save produced `dasha-photo-square.png`, no horizontal overflow appeared, and no page exception fired. The focused source test separately passed native file share, double-tap suppression, draft restore, touch framing, desktop controls, and mobile scroll. This rules out a reproducible basic edit/export failure; it does **not** prove strong demand or organic conversion.

The local Studio browser regression had been calling the production `/studio/event` endpoint before its later share mock was installed. It now intercepts that endpoint in both browser contexts, asserts the expected events locally, and never writes production counters. A before/after public-endpoint comparison remained byte-for-byte identical across the corrected full test. Future product reads must treat the current 13/8 baseline as contaminated and wait for enough additional non-test traffic rather than subtracting synthetic events into a fabricated unique-user metric.

The quiz smoke had the same class of problem: despite describing live checks as optional, its default path posted both quick and deep starts to production. Default execution is now disk-only, `--live` and `--live-only` are read-only, and only the explicit `--live-write` flag creates labeled synthetic starts. The full quiz suite and read-only live smoke both left the public metrics response byte-for-byte unchanged. Existing quiz counts cannot be retroactively cleaned because aggregate storage intentionally retains no event log or identity; establish future evidence by accumulation from this corrected test boundary, not by guessing which historical starts were synthetic.

The general live audit also posted test chat whenever it was run without `--fast`. It is now read-only by default; mutating WebSocket checks require `--protocol` or `DASHA_AUDIT_PROTOCOL=1`, while the deeper `dasha:test:lobby:live` remains explicitly named. This keeps routine release verification from generating visible community activity while preserving an intentional end-to-end protocol check.

The full default Dasha suite was run again after the route-navigation change. The public metrics response remained byte-for-byte unchanged at 13/8 Studio and 21/16 quiz, providing current negative evidence that routine regression coverage still does not write production funnel state.

The final live audit initially proved Studio deployment parity: the live 53,130-byte client matched the then-current generated/minified Worker asset set. The larger source file was correctly identified as readable source, not deployment drift. The later test-isolation pass exposed a real asynchronous framing race: a pending Surprise image could finish after Undo or Reset and overwrite restored zoom/tilt. The shared loader now assigns every photo request a generation and invalidates pending callbacks on restore/reset. Three consecutive mobile/desktop suites pass. Later media and route-discovery work advanced the prepared asset set again; `DASHA-LIVE-CONTEXT.md` and the live audit are the authority for current hashes. The matching Webflow SRI loader and Worker must publish together after OAuth recovers.

X's public documentation currently needs temporal caution: its Help Center and API reference still describe Communities and expose lookup/search endpoints, even though the reported shutdown date has passed. Those pages show documentation or endpoint residue, not that the end-user product remains available. Dasha's decision to keep one owned Lobby does not depend on Communities being live or dead; it follows from the unproven demand and ongoing moderation cost of adding another feed.

All 12 built-in Studio images currently return HTTP 200 as JPEG, useful dimensions, and `Access-Control-Allow-Origin: *`; the combined payload is roughly 2.2 MB. The reviewed origins are limited to `pbs.twimg.com` and `upload.wikimedia.org`. Mirroring them would duplicate healthy assets without evidence of an availability problem. The canvas loader and gallery thumbnails now both use `no-referrer`, and the Studio test rejects non-HTTPS or unreviewed image hosts. Reconsider first-party mirroring only after an observed outage, CORS regression, or material latency problem.

### Quiz result sharing is functional; the static crawler card is the release gap

X's current primary documentation permits PNG/JPG card imagery at a 1.91:1 aspect ratio and up to 3 MB for card creatives; ordinary post-image uploads allow up to 5 MB.[^x-cards][^x-media] The prepared crawler image is 1200×628 and 893,206 bytes, safely inside both boundaries. The live result page still serves a 1731×906, 2,726,964-byte image and declares those old dimensions. It is one symptom of the known split release: Webflow is current while the Lobby/Board Worker still serves the earlier asset set. The prepared card is not the only pending Worker change, so deploy and verify the bundle atomically rather than treating this as an isolated image patch.

The image-first browser path is separately healthy. A credentialed-CORS harness exercised the current client at 390×844 and 1440×900 against the real quiz media: it rendered a 1200×675 PNG (~1.24 MB), supplied one `image/png` file plus the permanent `/simp/r/…` challenge URL to native share, stayed within the viewport, and raised no page exception. A deterministic mobile Playwright regression now repeats this with local media. The earlier “card unavailable” failure is not reproducible; do not add another share mechanism or more result controls. Publish the prepared static asset through the guarded release path.

### Solana's center of gravity is broadening

Solana Foundation's June ecosystem roundup reports more than $3B in RWA value, tokenized-stock growth, stablecoin settlement, and broader wallet distribution. Its May roundup reports $16.4B in stablecoin supply and continued payment/institutional adoption. The Foundation also released shared Subscriptions & Allowances and Pay.sh infrastructure in 2026.[^sol-june][^sol-may][^sol-subscriptions][^sol-paysh]

This is evidence that Solana is becoming a general settlement and asset network. It is not evidence that every Solana culture product should add payments or recurring billing. Dasha already has the useful chain boundary: exact mint, external market context, and a direct Jupiter route.

### Distribution can become verifiable without becoming automatic points

X's current Filtered Stream supports near-real-time rules, author IDs, media fields, and tagged matching rules. X documents one persistent connection and up to 1,000 rules for pay-per-use access. X separately documents Filtered Stream webhook delivery, but that guide appears under its Enterprise navigation while the general stream page calls webhooks optional; do not assume webhook entitlement from pay-per-use stream access without a live account readback.[^x-stream][^x-stream-webhook][^x-rules]

This makes a narrow future creator-candidate inbox technically credible: watch only exact Dasha terms/account mentions with media, match immutable X author IDs to opt-in profiles, then review. The minimum known transport is one persistent pay-per-use stream; webhook delivery is an entitlement to verify, not an architectural assumption. It still does not justify automatic points. A matching post can be copied, irrelevant, promotional, or edited, and the current Dasha share volume is below five.

### Wallet discovery is upstream, not a new Dasha wallet product

Phantom says token verification is derived from third-party sources such as Jupiter and CoinGecko; Phantom has no direct token-verification form. Phantom also exposes universal token pages that already deep-link to its swapper.[^phantom-token][^phantom-page]

Phantom's April 2026 support guidance is even more specific: name search is convenient but the full mint is the safer way to avoid impersonators, and appearing in Jupiter or CoinGecko still does not guarantee a Phantom badge or timeline.[^phantom-search][^phantom-verified] Dasha's full-CA-first interface and exact-mint Jupiter URLs already implement the useful part of that guidance; adding a wallet connection or another warning surface would not improve provider recognition.

Therefore the prepared Jupiter metadata correction remains the narrow discovery task. Building a Phantom-specific swap or portfolio UI would duplicate a mature wallet. Phantom domain verification becomes relevant only if Dasha adopts Phantom Connect or seeks Phantom app-directory distribution; neither is currently supported by product evidence.[^phantom-domain]

Jupiter's current token contract adds one important distinction to monitoring: unverified is not banned. Dasha now treats null/false verification as a presentation gap but hard-fails explicit `banned` verification/tags or an affirmative `audit.isSus === true` flag. Field presence alone is not suspicion. Jupiter's archived official token-list repository says the application/PR workflow is deprecated: current discovery and verification use organic score, social validation, and community review. The existing pending VRFD record is therefore historical evidence, not an active queue to duplicate. The exact Dasha token page is indexed and canonical; the 2026-08-09 04:46 PDT read reports `organicScore: 0`, label `low`, and verification false/null. The durable mint, route, authorities, metadata bytes, and pool all remain unchanged. Keep monitoring exact-mint identity, score label, collisions, website/X metadata, and explicit verification; never manufacture trading, follows, likes, or holder activity to move a provider score.[^jup-tokens][^jup-v3][^jup-v4][^srfc35]

The 2026-08-09 05:12 PDT name-search refresh returns the canonical mint at rank **1 of 11**, alongside **nine** competing exact `dash_eats`/`dasha` name-symbol records. Rank one is useful current evidence, not durable identity: the on-chain checker now emits `canonicalRank` and reports rank loss separately from disappearance or collision count. The site should continue anchoring identity to the full mint even while the provider happens to rank it first.

The same read exposes why provider growth numbers must stay out of Dasha copy and success metrics: Jupiter currently reports 925 holders while Rugcheck reports 5,982. The sources do not publish a compatible definition in these responses, and Solana token accounts are not unique people or beneficial owners. The checker now reports both values as explicitly non-comparable observations instead of selecting one. This is not evidence of growth, fraud, or a provider defect; it is evidence that “holders” is not a decision-grade product metric without a defined cohort and method.

### First-party search absence is not yet a content mandate

A bounded 2026-08-09 public-search sample did not surface getdasha.com for the exact domain or a `site:` query, while full-mint search did surface the correct Solflare identity and other third parties. Direct crawl checks found all six www sitemap routes returning 200 with exact self-canonicals and no `noindex`. The evidence supports watching crawl integrity and upstream exact-mint metadata; it does not establish that more homepage copy, duplicate SEO pages, or a new content program would improve discovery.

The existing live audit now verifies each sitemap route instead of checking only that three route strings appear in the XML. A future 404, `noindex`, or canonical mismatch becomes a hard, fail-capable release finding; ordinary index lag remains an observation rather than a manufactured product defect.

That inventory found a bounded social-discovery gap: live `/how-to-buy` and `/rally` have titles, descriptions and canonicals but no large-image card metadata. Their canonical source pages now reuse the current Dasha 1200×630 card and declare `summary_large_image`. This changes only how shared links render; it does not claim or promise search ranking.

### Current U.S. guidance rewards precise promises, not utility theater

The SEC's March 2026 interpretation distinguishes several crypto-asset categories and emphasizes that an otherwise non-security asset can still be offered as part of an investment contract. The Chairman's accompanying remarks emphasize explicit, unambiguous representations or promises about essential managerial efforts.[^sec-interpretation][^sec-remarks]

An April 2026 staff statement separately addresses self-custodial transaction interfaces. A Commissioner's summary says wallets/interfaces do not become brokers solely by displaying onchain data, formatting user instructions, or transmitting them to a blockchain, while preferring durable rulemaking over temporary staff treatment.[^sec-ui][^sec-ui-comment]

### Recognition must not become compensated promotion

The FTC's current endorsement guidance reaches beyond cash. A discount, contest entry, free item, or even a nonfinancial opportunity can be a material connection when it could change how an audience weighs a recommendation. Sharing, liking, or posting as part of a rewarded campaign can therefore require clear disclosure; merely tagging the promoted project is not a disclosure.[^ftc-endorsements][^ftc-social]

Dasha's current quiz points remain outside that problem: they measure correct answers and do not depend on buying, sharing, sentiment, reach, or market claims. The same must be true of future creative recognition. An original cultural artifact may receive bounded editorial credit, but acceptance cannot be conditioned on a favorable opinion, buy call, price/performance statement, holding, likes, reposts, followers, or downstream engagement. Posts that recommend trading or make market claims are ineligible for creative points. This keeps recognition about authorship and craft rather than turning the Board into an undisclosed promotional campaign.

The public-copy audit now rejects offers to earn or receive points/rewards for sharing, posting, buying, liking, or reposting. Do not work around that gate with a footer disclosure: the simpler product is to avoid the compensated-promotion mechanic entirely.

Product implication: keep Dasha's public promises narrow and observable. Linking to Jupiter is simpler than embedding transaction preparation, fees, routing, custody, or ongoing value promises. This is a product-risk conclusion, not a classification of the token or legal advice.

### Fresh research supports culture, but warns against mistaking correlation for a playbook

- A July 2026 preprint studies 832,941 Pump.fun launches and reports a very low pooled 24-hour graduation rate plus a strong association between advertised social channels and graduation. The observational design does not show that adding Telegram causes durable community or product demand.[^pump-survival]
- MemeTrans covers more than 40,000 migrated Solana launches and uses transaction, concentration, time-series, and bundle features to detect high-risk patterns. That supports continued mint/pool integrity checks, not a public risk score built from an early model.[^memetrans]
- A cross-chain preprint reports widespread artificial-growth signals among high-return memecoins. This strengthens the decision not to rank Dasha by trading activity, referrals, or raw social engagement.[^midsummer]
- A 2025 qualitative study identifies outsider identity, digital affordances, memetic coordination, distributed learning, and market disruption in meme-investing communities. It supports identity-rich participation, but does not establish which Dasha feature causes it.[^meme-innovation]

## Live hypotheses and discriminating checks

| Hypothesis | Commitments | Cheapest honest check | Current action |
|---|---|---|---|
| Studio needs more tools | Assumes downstream failure is capability-driven | Wait until exports disclose; inspect exported artifacts and failures | **Do not build yet** |
| Studio needs a clearer finish | Assumes edited visits are failing at export/share | Live mobile/desktop edit→Save now passes; wait for non-test exports to disclose before changing hierarchy | **No defect reproduced; observe** |
| Dasha needs wallet-native distribution | Assumes holder verification or buy flow needs Phantom Connect | Measure holder-badge attempts and support failures; current public data does not expose this | **Defer** |
| Automatic creator points will grow participation | Assumes X matches establish authorship and quality | Require at least five real qualifying shares and estimate review cost first | **Defer; review candidates only** |
| Dasha should follow Solana into payments/agents/RWAs | Assumes ecosystem growth transfers to this audience | Look for first-party demand or repeated user jobs | **Reject for now** |

## Prioritized tasks

1. **Observe the now-live quiz → Studio handoff.** Worker `c8b5a3b0efcfbe4c` and all managed Webflow surfaces were read back successfully on 2026-08-09. After ten additional quiz completions, inspect `studio.sources.quiz`; if it remains zero, stop describing quiz → Studio as an active loop.
2. **Preserve the current funnel baseline.** Re-read only after additional real traffic; do not reset or infer unique-user retention.
3. **At the first disclosed non-test export count, re-evaluate the finish path.** Basic live mobile/desktop export already passes. If edit→export is materially weaker than open→edit, inspect actual failures before testing one hierarchy change; do not add controls in the same experiment.
4. **Complete one free reviewed Jupiter metadata correction when external submission authority and the required account are available.** Jupiter says its Tokens API supplies Phantom and Solflare; update only website and the canonical X profile, do not duplicate the pending verification request or pay for Express. Completion is API readback, not submission acknowledgement.
5. **Keep an X candidate-inbox design on the shelf.** Trigger only after five real qualifying shared artifacts; ingest exact author/post IDs and media, deduplicate edits, and require editorial review. Award nothing automatically.
6. **Keep Phantom Connect/app-directory work parked.** Reconsider only if holder verification becomes a meaningful repeated job or wallet-browser warnings measurably block it.
7. **Keep public trading/referral/status mechanics out.** Recent research makes fabricated activity and status gaming a larger concern, not a feature opportunity.

## Wallet-message conformance check

The holder proof already bound the product host, exact address, mainnet, URI, issue and expiry times, a one-time server challenge, and the signed bytes. A standards reread found one narrow mismatch: its generic base64url nonce generator could emit `-` or `_`, while SIWS defines the nonce as at least eight ASCII letters or digits. The holder nonce now uses 128 random bits encoded as 32 hexadecimal characters, and the Worker test rejects future nonconforming output. OAuth state and PKCE remain base64url as required by their own protocols. No wallet SDK, parser dependency, or second authentication path was added.

## IPFS delivery integrity check

The immutable Metaplex record points to CIDv0 metadata (292 bytes) and an image (18,576 bytes) through `ipfs.io`. Fresh reads through `ipfs.io`, `dweb.link`, and `w3s.link` returned byte-identical payloads. The on-chain checker now pins the agreed SHA-256 digests and independently compares `ipfs.io` with `dweb.link`: a changed primary payload or successful-gateway contradiction fails; alternate unavailability remains observational.

sRFC-35 defines a domain-side `solana-mint-address` record through DNS or
`/.well-known/solana.txt`, but its validation model expects the token metadata and domain to point at
each other; its security section strongly recommends DNSSEC.[^srfc35] Dasha's immutable token
metadata points to the source post rather than getdasha.com, and current domain checks show DNSSEC
off. A prepared one-way record was therefore removed before deployment. It would show only that a
domain operator can name a public mint, not corroborate token-side control or association.

The rejected route still exposed a release-identity blind spot: the old health hash covered clients and static
pages but not executable Worker source. A Worker-only route could therefore remain undeployed while
the shipper reported parity. The generated release hash now includes Worker source, the root ship
status reports Worker drift separately, and a full ship can deploy it before Webflow writes.

## The direct Jupiter link is now the safer complete buy product

The canonical Home still loaded `plugin.jup.ag/plugin-v1.js` without SRI when a Buy control received
hover/focus/touch or when the mint section approached the viewport. The loader is roughly one
megabyte and executes with first-party DOM privileges. Jupiter's current plugin documentation now
states that its Ultra Swap foundation is no longer actively maintained and has been superseded by
Swap V2.[^jupiter-plugin] OWASP recommends minimizing third-party JavaScript and using SRI,
sandboxing, or self-hosting where it cannot be avoided.[^owasp-third-party]

No Dasha evidence shows the modal improves completed handoffs, and every Buy control already has a
plain Jupiter URL pinned to SOL input and the exact Dasha output mint. Prepared Home therefore removes
the loader and click interceptor entirely. This is not a custom swap replacement: Jupiter still owns
wallet connection, quotes, simulation and execution on `jup.ag`. The release gate forbids the
unpinned plugin from returning.

The read-only route monitor now follows Jupiter's current Swap V2 `/order` contract rather than the superseded Ultra endpoint.[^jupiter-swap-v2] Swap V2 is a meta-aggregator: Iris/Metis, JupiterZ, DFlow, and OKX compete, so a changing `router` value is expected and is not evidence that the exact mint or canonical market changed. The gate asserts the requested input/output mints, exact input amount, nonzero output, and a nonempty route; it deliberately does not pin the winning router or quote. The 2026-08-09 read returned DFlow as winner while its route plan still named the canonical Raydium AMM pool.

## Jupiter verification: free metadata correction first, no Express payment

Jupiter's current Express API confirms four facts: standard VRFD submissions remain free; Express
costs 1000 JUP; verification and metadata are reviewed independently; and the read-only eligibility
endpoint requires a Jupiter API key.[^jupiter-verification] The public VRFD interface separately
exposes `Update meta` as an open, publicly reviewed contribution.[^jupiter-vrfd]

Dasha has no configured Jupiter API key, and the public queue already contains a pending
verification request for the exact mint—the most common eligibility blocker named by Jupiter. That
does not prove whether a separate metadata-only update is currently eligible. It does prove that
paying for or duplicating verification is unjustified. Keep the exact three-field
`dasha-jupiter-metadata.json` payload for one free reviewed metadata correction; completion remains
Tokens API readback of `website=https://www.getdasha.com` and `twitter=https://x.com/dash_eats`.

Jupiter's current token-information guide explicitly says its Tokens API is used by Phantom and
Solflare.[^jupiter-token-info] That makes this one provider correction higher leverage than building
wallet-specific metadata or swap UI. It does not make Jupiter's verification badge a universal proof:
the exact mint must remain the identity anchor, and submitted fields must stay narrower than the
pending request's unsupported “official” language.

The implementation does not pretend that a file SHA-256 is the CIDv0 digest. IPFS documents that CIDv0 hashes a DAG-PB root block, which generally differs from the reconstructed file bytes. No new IPLD/UnixFS dependency was justified; pinned, independently corroborated payload digests are the smallest correct control for these two immutable assets.

## What this pass rules out

- No stablecoin checkout, subscription, agent-payment, RWA, perps, or token-launch feature.
- No embedded swap router while external Jupiter solves the job.
- No Telegram revival based on launch-correlation research.
- No automatic X engagement scoring, share-to-earn, buy points, or volume leaderboard.
- No public ML “safety” score based on preprint models.
- No Studio redesign from fewer than five disclosed exports.

## Structured data is a public claim surface

A sitemap-wide readback found two homepage `WebSite` objects plus hidden `SoftwareApplication`/`WebApplication` objects on Studio and Desk. Studio's object also claimed a CC0 license that neither the visible page nor the repository's media-provenance policy establishes. Google requires structured data to represent visible page content and warns against hidden or misleading markup; Schema.org defines `license` as a license document that applies to the content.[^google-schema-policy][^schema-license]

The prepared edge sanitizer now deletes the duplicate host-generated `WebSite` object and the hidden app objects while preserving the embed-owned `WebSite` identity with the exact Solana mint and source links. A route-wide audit rejects malformed JSON-LD, duplicate `WebSite` identities, hidden app schema, and license claims. Invalid JSON is not silently repaired: it remains visible so the release gate fails.

## Contribution evidence must prove the right object

The OSS evidence validator contradicted its public contract: it accepted any HTTPS URL on GitHub, X, or getdasha.com, so an OAuth page, an unrelated repository, or an X post could enter the code-contribution review queue and later satisfy the shared scorer. It now accepts only an exact `github.com/Uuriko/dasha-desk/pull/<positive integer>` URL with no credentials, query, or fragment. Current GitHub readback found one real open pull request and the public board reports zero OSS points, so tightening the validator does not revoke an existing public score.[^github-pull]

X status URL slugs cannot establish authorship. A live control request using the correct post ID under an intentionally wrong username returned 200 and resolved to the real author's URL. X's API exposes `author_id` as the authoritative relationship.[^x-post] Automatic creator attribution therefore remains deferred: editorial review must inspect the actual post author, and a future automatic scorer would need post-ID lookup plus an explicit X↔GitHub identity link rather than trusting URL text.

## A fun random result should not be a rerollable rank

The live Board now provides enough evidence to inspect score composition: 17 measured profiles, 12 quiz completions, five enrollment-only rows, and zero creator, community, OSS, or holder points. Quiz points account for 442 of 612 measured points. The scoring source added fresh random vibe of up to ±8 on every completion while allowing unlimited scored retakes, so repeated attempts could reroll rank without improving knowledge.

The prepared scorer now derives Board quiz points from accuracy-only `basePoints`. The random vibe and its one-line result remain for fun and sharing, but no longer change rank. Existing stored quizzes already retain `basePoints`, so the scorer corrects old rows without deleting attempts or requiring a retake; legacy records lacking that field retain their stored points. The same pass suppresses `@perryalpha` from measured output while the explicit editorial #1 row exists, removing the live duplicate without deleting the underlying opt-in profile.

## Market reserves are verifiable; “holders” require careful language

The on-chain checker previously proved the canonical Raydium pool account and mint pair but did not read its token vaults. Rugcheck's market record identifies the two canonical vault addresses; finalized Solana `getMultipleAccounts` now independently requires both accounts to be SPL Token accounts with the expected vault owner and exact WSOL/DASHA mints.[^sol-multiple][^sol-token-account] The latest read observed 204.567023513 WSOL and 160,994,680.021092 DASHA in those vaults. These are volatile reserves, not a promise of price, execution depth, or permanence. Rugcheck and finalized RPC amounts are reported with `sameAtRead` rather than hard-equaled because a legitimate swap can occur between snapshots.

Rugcheck's latest observation reports 5,982 holders and 58.15% across its ten largest token accounts. The canonical Raydium DASHA vault is 16.10 percentage points of that total; the remaining nine listed non-market accounts sum to 42.04%. This is **token-account concentration**, not nine unique people or beneficial owners: Solana defines a token account as one mint/account-owner balance container, and one person can control multiple accounts while programs and custodians can control accounts too. The report therefore labels market vaults and does not turn these volatile figures into homepage copy, rank, or safety claims.

## The missing loop is quiz → Studio, not creator scoring

A fresh authenticated aggregate read at 2026-08-09 02:31 PDT observed 24 quiz starts, 19
completions and three quiz share intents. Studio observed 13 opens, eight first edits, four exports
and zero share intents. All 13 Studio opens were classified direct; **zero** carried the existing
`src=quiz` marker. These are event counts rather than unique people, but they directly contradict the
current loop claim that quiz completion is already feeding creation.

Source inspection found no broken URL: every completed result already creates a title-specific image
and caption seed and includes `src=quiz`. The vague result action said `Make one`, however, and the
live Home no longer mounted the quiz at all after the last root publish. The prepared release restores
the real Board client on the lean Home and renames both result actions `Open Studio`; sharing remains
the primary quiz action. This is one copy repair and one existing integration, not a new reward layer.

No indexed public-search result surfaced a non-first-party post containing the Studio URL or exact
mint. Current X policy also identifies artificially incentivized engagement and recycled content as
problematic monetization practices.[^x-monetization] Recent memecoin research supports social
diffusion as a market force but does not validate attention as creative merit; the larger cross-chain
MemeChain dataset instead treats websites, images and social accounts as forensic context.[^fragility][^memechain]

C2PA is not the shortcut. Its own implementation guidance notes that common platform edits can
invalidate credentials until consuming-platform support is widespread.[^c2pa-ux] X publishes an
accessible alt-text path, but no current primary documentation found in this pass establishes that X
preserves or surfaces C2PA credentials on ordinary image uploads. Do not add hidden PNG metadata,
artifact IDs, perceptual hashing, personhood credentials or wallet proofs for this early cohort.

**Next discriminating read:** after the prepared Home/Worker release accumulates ten additional quiz
completions, inspect `studio.sources.quiz`. If it remains zero, the evidence rejects quiz → Studio as
an active loop and the product brief should stop claiming it; if it becomes nonzero, inspect
quiz-attributed edit/export progression before touching creator recognition. Automatic points remain
deferred in either case.

## Post-release workflow and OSS delta

The 2026-08-09 release exposed one concrete systems defect: the canonical shipper described an
atomic Worker-first sequence but failed when the live Worker hash was stale, requiring a separate
manual Wrangler deployment. Cloudflare's current documentation states that `wrangler deploy` ships
Worker code and configured static assets together and supports an explicit working directory for
monorepos.[^cf-deploy][^cf-assets] The shipper now invokes the existing worktree deploy script only
during a full `--ship`, only before any Webflow surface has been written, then requires exact health
hash parity. Resumed partial releases still fail closed. A fixture proves both auto-deploy and
split-release refusal.

A later server-only holder-message change exposed a narrower identity hole: the release hash covered
the Worker entry module, route configuration, and public assets, but not the four local modules the
Worker imports. A change in moderation, OAuth/session handling, score rules, or holder proof could
therefore leave `health.assets` unchanged and make the shipper skip Wrangler. The same release hash
now includes those direct local dependencies. No recursive dependency walker or bundler was added;
the Worker has four explicit local imports, and a documentation gate pins the complete list.

Recent GitHub evidence reinforces restraint on contributor points. Cross-border public-repository
collaboration grew 16% quarter-over-quarter in Q1 2026, while GitHub simultaneously added controls
for maintainer overload.[^github-graph] GitHub's Maintainer Month reporting emphasizes mentoring,
trust and judgment as increasingly important but less visible work.[^github-maintainers] Dasha's
existing honor-only, maintainer-labeled merged-work lane is therefore preferable to raw commit or PR
volume. Do not add automated volume points; recognize a real first contribution when one exists.

## 12:35 PDT evidence and provider refresh

The public aggregate read now reports 27 quiz starts, 20 completions, 13 Studio opens, eight first
edits, and fewer than five Studio completions, exports, share intents, or resolved native shares.
Sixteen measured Board profiles include 12 quiz scorers and zero creative, community, open-source,
or holder contributors. These are event totals with known historical test contamination, not unique
people or retention. The weakest conclusion remains that the quiz can be completed; the evidence
still cannot distinguish lack of share intent from a desktop attachment inconvenience, an X compose
abandonment, or simple low traffic. Do not add another Studio control, referral loop, reward, gallery,
or automatic creator scorer before a completion/share cell clears the disclosure threshold.

Current X documentation still describes Web Intents as the simplest permissionless compose path,
mobile-friendly and completed by the author in X; it does not turn a local image into an uploaded X
attachment.[^x-intents] That supports the existing split: Web Share with a generated PNG where file
sharing is supported, and a downloaded PNG plus prefilled X compose on desktop. A resolved Web Share
call remains only a handoff signal. Replacing this with X write permissions would add token scope and
posting authority without evidence that it improves completion.

Jupiter's current Express documentation continues to say that metadata and verification are reviewed
independently, that the paid API costs 1000 JUP, and that standard VRFD submissions are free.[^jupiter-verification]
The three-field `dasha-jupiter-metadata.json` is therefore still a valid review target rather than a
local configuration file, but no paid or duplicate request is justified while the exact mint already
has a pending legacy record. Completion remains upstream Tokens API readback of the canonical website
and X profile. Phantom's current documentation still has no direct verification form and names
Jupiter/CoinGecko as upstream sources.[^phantom-token]

The latest Solana ecosystem material remains dominated by payments, RWAs, trading infrastructure,
and mobile distribution.[^sol-june] This establishes ecosystem capacity, not demand from Dasha's
small culture cohort. No payments, RWA, trading-terminal, wallet, or mobile-app pivot follows from it.

## 05:55 PDT regulatory, sharing and distribution refresh

The SEC's March 2026 Commission interpretation expressly addresses airdrops and the circumstances in
which transactions involving a non-security crypto asset may still form an investment contract.[^sec-interpretation]
This does not establish a legal classification for `$dasha`, but it removes any basis for treating
token rewards as a harmless growth mechanic. IRS guidance updated in June 2026 separately says
digital-asset rewards or awards can create reportable income and that digital assets remain property
for federal tax purposes.[^irs-digital-assets] Dasha therefore keeps Simp points nonfinancial and
does not distribute tokens for quiz answers, posts, shares, purchases or open-source work. The
public-copy boundary now rejects direct promises to earn, receive, win or claim `$dasha`, tokens,
coins or an airdrop—not only share-to-earn wording.

X's current media-upload endpoint still requires an OAuth 2.0 access token, while Web Intents remain
the permissionless author-controlled compose path.[^x-upload][^x-intents] This confirms the current
Studio split: native file sharing where the browser supports it; otherwise download the PNG and open
an X compose intent. Do not widen OAuth scope or gain posting authority before measured abandonment
proves that the handoff, rather than low traffic, is the bottleneck.

Solana Mobile now documents a supported web-app path, but it still means creating a PWA, wrapping it
in a signed Android APK, and passing the dApp Store publisher/review process.[^sol-mobile-pwa] That is
a real future distribution option, not a reason to package the current site before repeat mobile use
or a wallet-native job exists.

## 05:58 PDT on-chain and discovery refresh

Finalized mint, immutable metadata, IPFS byte corroboration, Raydium AMM-v4 ownership/vaults, exact
GeckoTerminal pool and nonzero Jupiter Swap V2 route all pass. Jupiter name search still ranks the
exact mint first of 11 beside nine competing name/symbol mints. Its Organic Score has returned to
about `50.5` / `medium` after the earlier same-day `0` / `low` read, while website, canonical-profile
metadata and positive verification remain absent. This is direct evidence that the score is volatile
provider-relative telemetry; it changes neither site identity nor the roadmap. Continue anchoring
every transaction link to the full mint and pursue only the prepared minimal website/X metadata
correction when the existing pending record no longer blocks review.

## 09:55 PDT post-release product check

The current public aggregate read reports 47 quiz starts, 31 completions, 13 Studio opens and eight
first edits. Studio completion, export and share cells remain below the disclosure threshold of five;
these counts are events, not unique users. This still does not justify another editor control, a new
surface, token rewards or a wallet-first pivot.

One independent share defect was actionable without waiting for more traffic. X currently limits
uploaded images to 5 MB.[^x-media] Studio previously generated an unconstrained PNG for its native
and desktop X handoffs. The prepared encoder now keeps normal PNGs and converts only an oversize X
share payload to a 0.9-quality JPEG; Save PNG, canvas resolution, editing and UI are unchanged. A
mobile/desktop browser regression proves the ordinary share remains a PNG below the limit and forces
a 5,000,001-byte PNG through the live encoder to prove the JPEG fallback executes. This is
distribution reliability, not a feature.

Two researched expansions remain rejected:

- Solana Actions/Blinks can expose signable transactions through shareable URLs, but clients still
  decide which Actions to render and execute.[^sol-actions] Dasha already has a plain exact-mint
  Jupiter handoff and no evidence that a second transaction interface solves observed abandonment.
- Cloudflare Analytics Engine offers non-blocking, high-cardinality custom telemetry.[^cf-analytics]
  Dasha's current aggregate Durable Object counters already answer the bounded product question
  without cookies, cross-site identity or a new binding. Adding another analytics store would add
  machinery without stronger evidence.

## 10:05 PDT incentives and open-source triage

New empirical work reinforces the existing Board boundary. A 6,000-token Pump.fun study separates
concealed accumulation, sniping, wash trading and comment bots rather than treating visible activity
as one trustworthy signal.[^manipulation-strategies] A 2026 natural experiment on Reddit's crypto
rewards reports more content and effort alongside more aggressive, attention-seeking content.[^moons]
A global survey finds memecoin participation more closely associated with intensive trading and risk
taking than ordinary demographics.[^meme-people] For Dasha this means:

- never use comments, volume, likes, reposts, followers or holdings as creator quality;
- keep Quiz rank accuracy-based and holder status a zero-point badge;
- keep creation usable without wallet connection, because wallet intensity is not cultural merit.

The public repository is healthy and dependency audit reports zero production vulnerabilities, but
its issue queue has drift. The only open pull request adds a floating scroll-to-top control without
checks; its JavaScript immediately reads `scrollBtn.style` while the source `index.html` does not add
that element, so the branch can throw on scroll and does not meet the site's less-is-more direction.
Do not merge it as-is.[^scroll-pr] Issue 11 asks for a Surprise control that is already shipped, while
Issues 9, 10 and 13 propose more Studio controls or looks before the completion cell clears five.
The useful OSS task is issue triage and accurate acceptance tests—not manufacturing additional UI.

## 10:15 PDT wallet-signature boundary

Phantom's SIWS specification identifies domain binding, an alphanumeric nonce, short issuance window,
expiry and server-side signature/input verification as the core defenses against replay and domain
impersonation.[^siws] Dasha's optional holder badge already uses those fields, a five-minute expiry,
Ed25519 verification, one-time server state and a zero-point badge. It also discards the wallet
address after the check. Migrating to a wallet SDK would add dependencies and reduce compatibility
for no demonstrated product gain because this is a one-off proof rather than Dasha authentication.

The prepared Worker now explicitly requires an approved Origin on both holder-proof POST endpoints.
SameSite cookies and the outer CORS router already reduced cross-site exposure, but the endpoint
itself no longer accepts a missing-origin request carrying a valid session. Tests prove both
challenge and verification reject before parsing wallet data; ordinary Phantom/Solflare flows still
pass. No new wallet prompt, permission, score or public copy was added.

## 10:22 PDT Studio image-origin check

All 12 curated Studio image URLs currently return `200`, `image/jpeg` and
`Access-Control-Allow-Origin: *`; sizes range from roughly 18 KB to 407 KB. Studio already sends no
referrer, sets anonymous CORS before assigning each image URL, ignores stale load callbacks and lets
one failed image fall back to another selection. Three exact bytes are already duplicated in Worker
quiz assets, but the rest are not.

Do not add an image-proxy endpoint now. Cloudflare's fetch cache can reduce repeat origin requests,
but it remains regional/ephemeral and still needs the upstream image on a cold miss.[^cf-fetch-cache]
That adds routing, cache and abuse surface without removing the actual dependency. The trigger for
localizing the gallery is a real source failure, repeated CORS failure, or a deliberate durable asset
archive with provenance—not theoretical CDN anxiety.

## 10:35 PDT referral-loop reconsideration

The user explicitly raised referrals after the verified release. That is new product-direction
evidence, but it is not evidence that referrals will improve durable participation. The current Board
already has 17 measured profiles and remains entirely quiz-driven: 13 profiles have quiz activity,
while creative, community, OSS and holder activity are all zero. A referral experiment can therefore
test acquisition, but it must not be mistaken for evidence that the acquired accounts do anything
useful afterward.

The clean success event is **a previously unseen X ID explicitly joining the Simp Board from a signed
invite**, not a click and not OAuth completion by itself. OAuth alone intentionally does not publish a
profile. X's authenticated-user endpoint exposes the immutable numeric ID needed for deduplication;
account age, follower counts and verification are also available but are weak proxies for personhood
and should not determine points.[^x-me] Zora's current referral promotion similarly waits for a new
account plus qualifying activity and caps each inviter at ten rewards, rather than paying for raw
clicks.[^zora-referral] That design is evidence for conversion/caps, not a template for Dasha's token
or trading incentives.

The weakest sufficient Dasha experiment is:

- signed opaque invite codes bound to the inviter's existing X ID; never expose that ID in the URL;
- one attribution per newly enrolled X ID, no self-referrals, no retroactive claims and no referral
  chains;
- **one point per successful Board join, capped at five per season**; no follower, engagement,
  purchase or balance multiplier;
- show the invited count in the member's own status first; make it public only if abuse stays low;
- retain only the inviter/referee ID edge needed for deduplication and delete/scrub it when either
  member leaves;
- label public share copy plainly if an inviter can earn Board points, because even a noncash ranking
  benefit can be a material connection under the FTC guidance already cited above;
- count invite opens, completed joins and later quiz/Studio continuation only in thresholded aggregate
  telemetry. The experiment succeeds on downstream participation, not raw joins.

Do **not** add a holder bonus in the first experiment. The current holder proof deliberately discards
wallet identity and gives a zero-point badge. A transferable dust balance can be cycled through wallets
or used to badge several X accounts; airdrop research documents the broader pattern of multiple
identities and coordinated transfer behavior exploiting reward eligibility.[^airdrop-sybil][^airdrop-game]
Making proof affect referral points would require a keyed private wallet commitment, cross-account
uniqueness rules, transfer/recheck semantics and new deletion behavior. That is a disproportionate
privacy and abuse surface for an unproven acquisition loop.

This is now a **bounded candidate**, not a permanent rejection and not yet an implementation order.
The cheapest discriminating check is to add no UI: first inspect whether existing quiz-invite shares
produce new Board joins in the next disclosed cohort. If there is no observable invite traffic, a
scored referral system would add machinery to a distribution channel people are not using. If there
is traffic, implement the capped signed-attribution experiment without holder weighting.

## 10:42 PDT fresh creator and mobile product signals

Zora continues to converge creation, trading and referrals: every post is a coin, creator/profile
coins collect trade fees, and platform/trade referrals share fees.[^zora-rewards][^zora-changes] This
is a strong adjacent-product signal but a poor Dasha feature template. Dasha has one pre-existing coin;
turning every Studio artifact or profile into another asset would compete directly with Zora while
making the simple create/share action financial.

Solana Mobile reports more than 1,000 dApps and has added a weekly four-app Spotlight plus publisher
ratings, reviews, response tools and review summaries.[^sol-mobile-discovery] The relevant lesson is
that discovery increasingly depends on a finished, repeatedly useful mobile experience and observable
feedback—not simply shipping an Android wrapper. Dasha's live Home already scores 95 performance and
100 accessibility/best-practices/SEO in the bounded mobile Lighthouse run. With Studio completions and
shares still below five, mobile packaging remains downstream of product evidence.

## 11:00 PDT community economics + chess distribution delta

Fresh primary sources separate three mechanisms that are often bundled together as “token utility”:

1. **Portable participation.** Zora makes content and creator identity directly tradeable and assigns
   fixed trade-fee shares to creators, referrals and permanent liquidity.[^zora-rewards-2026] Towns
   makes memberships programmable and gives communities their own access and reputation rules.[^towns]
   These are protocols built around assetization or on-chain membership. Dasha does not need either
   protocol to make an existing game, quiz result or Studio artifact portable.
2. **Distribution surfaces.** Solana Mobile's current Seeker docs expose a crypto-native dApp Store,
   Seed Vault integration and per-device Genesis Token.[^seeker] This is a real future distribution
   option for a recurring Dasha product, but an Android package does not create recurrence. Chess is
   now the first Dasha surface with a natural repeat loop; measure actual games before packaging it.
3. **Fee routing.** Pump's May 2026 schedule assigns creator, protocol and LP portions to canonical
   pool trades, including older coins from May 13, 2025 onward.[^pump-fees-2026] Bags and Flaunch go
   further with multi-recipient fee shares, liquidity compounding or automatic community buybacks,
   but those choices are launch/pool architecture, not website toggles.[^bags-fees][^flaunch-revenue]
   Jupiter separately permits integrators to add 50–255 bps to swaps.[^jupiter-referral]

The live Dasha readback materially narrows the fee hypothesis. The mint is a completed legacy Pump
curve on its canonical Raydium pool, `cashbackEnabled` is false, and the finalized legacy curve has no
decodable current creator field. Pump's frontend creator record is a provenance signal; it does not
prove control of the fee recipient or any relationship to this project. Therefore:

- do not claim creator revenue, add a “community treasury,” or promise buybacks without a verified
  recipient, wallet-control proof, historical claim readback and a public accounting policy;
- do not add a Jupiter integrator fee merely because the API permits one—it taxes the conversion the
  site is trying to simplify and has no evidenced user benefit;
- do not migrate or wrap the coin to imitate Bags, Flaunch or Zora. That would introduce a competing
  asset and fragment the exact-mint trust boundary;
- if fee control is ever proven, the first feature is a read-only, independently checkable fee ledger,
  not discretionary market operations. Any later allocation decision requires separate legal,
  accounting, custody and disclosure work.

The weakest sufficient attention-to-demand loop is instead:

`public event/replay → X share → public deep link → X identity + current holder proof → play → replay`

This loop creates a reason to hold without promising returns or paying for promotion. The replay and
bracket remain public, so nonholders can understand the product before connecting anything. The
playing seat is the scarce utility. The prepared chess page now supports tournament deep links,
one-click X sharing, dynamic replay/tournament social metadata and an eight-second bracket refresh.
Server-side, thresholded counters measure starts/completions and tournament transitions without new
identity fields. Focused mobile/desktop, privacy, lifecycle and Worker tests pass. Identity deletion
now removes the departing player's games without destroying unrelated players' tournament games.
Do not add token-weighted ratings, prize pools, buy-to-score mechanics or automated trading activity.

The next discriminating observations are tournament links opened, distinct holders who join, games
started and games completed. If shared tournaments recruit opponents, the next small extension is a
shareable direct challenge. If they do not, more chess formats will not solve distribution.

## Sources

[^sol-june]: [Solana Foundation — Ecosystem Roundup: June 2026](https://solana.com/news/solana-ecosystem-roundup-june-2026)
[^sol-may]: [Solana Foundation — Ecosystem Roundup: May 2026](https://solana.com/news/solana-ecosystem-roundup-may-2026)
[^sol-subscriptions]: [Solana Foundation — Native Subscriptions & Allowances](https://solana.com/news/subscriptions-and-allowances)
[^sol-paysh]: [Solana Foundation — Pay.sh with Google Cloud](https://solana.com/news/solana-foundation-launches-pay-sh-in-collaboration-with-google-cloud)
[^x-stream]: [X Developer Platform — Filtered Stream](https://docs.x.com/x-api/posts/filtered-stream/introduction)
[^x-stream-webhook]: [X Developer Platform — Filtered Stream webhook quickstart](https://docs.x.com/x-api/webhooks/stream/quickstart)
[^x-rules]: [X Developer Platform — Filtered Stream operators](https://docs.x.com/x-api/posts/filtered-stream/integrate/operators)
[^x-communities-help]: [X Help — Communities](https://help.x.com/en/using-x/communities)
[^x-communities-api]: [X Developer Platform — Communities lookup](https://docs.x.com/x-api/communities/lookup/introduction)
[^x-cards]: [X Developer Platform — card creative image specifications](https://docs.x.com/x-ads-api/creatives)
[^x-media]: [X Developer Platform — media image specifications](https://docs.x.com/x-api/media/quickstart/best-practices)
[^x-intents]: [X Developer Platform — Web Intents](https://docs.x.com/x-for-websites/web-intents/overview)
[^x-upload]: [X Developer Platform — Upload media](https://docs.x.com/x-api/media/upload-media)
[^irs-digital-assets]: [IRS — Digital asset transaction FAQs, updated June 29, 2026](https://www.irs.gov/individuals/international-taxpayers/frequently-asked-questions-on-digital-asset-transactions)
[^sol-mobile-pwa]: [Solana Mobile — Publishing a web app on the dApp Store](https://docs.solanamobile.com/recipes/general/publishing-a-web-app)
[^phantom-token]: [Phantom — Token verification](https://docs.phantom.com/best-practices/tokens/token-verification)
[^phantom-page]: [Phantom — Token pages](https://docs.phantom.com/developer-powertools/token-pages)
[^phantom-domain]: [Phantom — Verify a domain](https://docs.phantom.com/phantom-portal/verify-domain)
[^phantom-search]: [Phantom — Search for a specific token](https://help.phantom.com/hc/en-us/articles/38314239086611-How-to-search-for-a-token-in-Phantom)
[^phantom-verified]: [Phantom — What makes a token appear as verified](https://help.phantom.com/hc/en-us/articles/36284556853139-What-makes-a-token-appear-as-verified-in-Phantom)
[^jup-tokens]: [Jupiter — Tokens API and verification levels](https://developers.jup.ag/docs/tokens)
[^jup-v3]: [Jupiter — official archived token-list migration notice](https://github.com/jup-ag/token-list)
[^jup-v4]: [Jupiter — Verification v4 criteria and dynamic status](https://discuss.jup.ag/t/verification-v4-faster-clearer-and-better-than-ever-before/39294)
[^srfc35]: [Solana Developer Forums — sRFC-35 address/domain association proposal](https://forum.solana.com/t/srfc-35-address-domain-association-specification/3155)
[^sec-interpretation]: [SEC — 2026 crypto-assets interpretive release](https://www.sec.gov/rules-regulations/2026/03/s7-2026-09)
[^sec-remarks]: [SEC Chair Atkins — Regulation Crypto Assets remarks](https://www.sec.gov/newsroom/speeches-statements/atkins-remarks-regulation-crypto-assets-031726)
[^sec-ui]: [SEC staff — Certain self-custodial crypto user interfaces](https://www.sec.gov/newsroom/speeches-statements/staff-statement-regarding-broker-dealer-registration-certain-user-interfaces-utilized-prepare-staff-statement-regarding-broker-dealer-registration-certain-user-interfaces-utilized)
[^sec-ui-comment]: [Commissioner Peirce — Comments on certain user interfaces](https://www.sec.gov/newsroom/speeches-statements/peirce-041326-interfacing-our-inner-demons-comments-division-trading-markets-statement-certain-user-interfaces)
[^ftc-endorsements]: [FTC — Endorsement Guides: questions and answers](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking)
[^ftc-social]: [FTC — Disclosures 101 for social media influencers](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers)
[^pump-survival]: [Kamat — Pump.fun Graduation Regime Windows (arXiv:2607.02823)](https://arxiv.org/abs/2607.02823)
[^memetrans]: [Hu et al. — MemeTrans (arXiv:2602.13480)](https://arxiv.org/abs/2602.13480)
[^midsummer]: [Mongardini & Mei — A Midsummer Meme's Dream (arXiv:2507.01963)](https://arxiv.org/abs/2507.01963)
[^meme-innovation]: [Ante — Meme Investing as an Unconventional Pathway to Financial Innovation](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5291277)
[^google-schema-policy]: [Google Search — structured-data general guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
[^schema-license]: [Schema.org — `license`](https://schema.org/license)
[^github-pull]: [GitHub REST API — pull requests](https://docs.github.com/en/rest/pulls/pulls#get-a-pull-request)
[^x-post]: [X API — get post by ID](https://docs.x.com/x-api/posts/get-post-by-id)
[^sol-multiple]: [Solana RPC — `getMultipleAccounts`](https://solana.com/docs/rpc/http/getmultipleaccounts)
[^sol-token-account]: [Solana — token account model](https://solana.com/docs/tokens/basics/create-token-account)
[^x-monetization]: [X Help — Content Monetization Policies](https://help.x.com/en/rules-and-policies/content-monetization-policy)
[^fragility]: [Xiang et al. — Measuring Memecoin Fragility (arXiv:2512.00377)](https://arxiv.org/abs/2512.00377)
[^memechain]: [Mongardini & Mei — MemeChain (arXiv:2601.22185)](https://arxiv.org/abs/2601.22185)
[^c2pa-ux]: [C2PA — User Experience Guidance for Implementers](https://spec.c2pa.org/specifications/specifications/2.2/ux/UX_Recommendations.html)
[^cf-deploy]: [Cloudflare — Wrangler `deploy`](https://developers.cloudflare.com/workers/wrangler/commands/workers/#deploy)
[^cf-assets]: [Cloudflare — Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
[^github-graph]: [GitHub — Q1 2026 Innovation Graph update](https://github.blog/news-insights/policy-news-and-insights/q1-2026-innovation-graph-update-open-source-collaboration-is-accelerating-worldwide/)
[^github-maintainers]: [GitHub — Maintainer Month 2026](https://github.blog/open-source/maintainers/welcome-to-maintainer-month-celebrating-the-people-behind-the-code/)
[^jupiter-plugin]: [Jupiter — Plugin integration](https://developers.jup.ag/docs/ultra/plugin-integration)
[^jupiter-swap-v2]: [Jupiter — Swap V2 order and execute](https://developers.jup.ag/docs/swap/order-and-execute)
[^owasp-third-party]: [OWASP — Third Party JavaScript Management](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html)
[^jupiter-verification]: [Jupiter — Express Verification API](https://developers.jup.ag/docs/tokens/verification)
[^jupiter-vrfd]: [Jupiter — VRFD Open](https://verified.jup.ag/)
[^jupiter-token-info]: [Jupiter — How to get token information](https://developers.jup.ag/docs/guides/how-to-get-token-information)
[^sol-actions]: [Solana — Actions and Blinks](https://solana.com/developers/guides/advanced/actions)
[^cf-analytics]: [Cloudflare — Workers Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
[^manipulation-strategies]: [Ding et al. — Decompose Market Manipulation Strategies: Evidence from On-chain Meme Coin Market](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5953738)
[^moons]: [ECIS 2026 — Motivation or Distortion? Relative Performance Rewards and Social Capital](https://aisel.aisnet.org/ecis2026/platforms/platforms/6/)
[^meme-people]: [Balietti et al. — Meme Money, Real People](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6021706)
[^scroll-pr]: [Uuriko/dasha-desk pull request 15](https://github.com/Uuriko/dasha-desk/pull/15)
[^siws]: [Phantom — Sign In With Solana specification](https://github.com/phantom/sign-in-with-solana)
[^cf-fetch-cache]: [Cloudflare — cache using Worker fetch](https://developers.cloudflare.com/workers/examples/cache-using-fetch/)
[^x-me]: [X Developer Platform — Get my User](https://docs.x.com/x-api/users/get-my-user)
[^zora-referral]: [Zora — New User and Referral Rewards Program](https://support.zora.co/en/articles/12308225)
[^airdrop-sybil]: [Fighting Sybils in Airdrops (arXiv:2209.04603)](https://arxiv.org/abs/2209.04603)
[^airdrop-game]: [Toward Resilient Airdrop Mechanisms (arXiv:2503.14316)](https://arxiv.org/abs/2503.14316)
[^zora-rewards]: [Zora — Understanding Rewards](https://support.zora.co/en/articles/2509953)
[^zora-changes]: [Zora — What has changed](https://support.zora.co/en/articles/4641857)
[^sol-mobile-discovery]: [Solana Mobile — 1,000+ dApps, Smarter Discovery, and a Bigger Seeker Season](https://solanamobile.com/blog/1-000-dapps-smarter-discovery-and-a-bigger-seeker-season)
[^zora-rewards-2026]: [Zora — Understanding Rewards, updated March 2026](https://support.zora.co/en/articles/2509953)
[^towns]: [Towns — Introduction and programmable community memberships](https://docs.towns.com/introduction)
[^seeker]: [Solana Mobile — Seeker](https://docs.solanamobile.com/solana-mobile-stack/seeker)
[^pump-fees-2026]: [Pump — Fees, updated May 2026](https://pump.fun/docs/fees)
[^bags-fees]: [Bags — Customize Token Fees](https://docs.bags.fm/how-to-guides/customize-token-fees)
[^flaunch-revenue]: [Flaunch — Creator Revenue](https://docs.flaunch.gg/for-creators/core-features/creator-revenue)
[^jupiter-referral]: [Jupiter — Swap order and execute referral fees](https://developers.jup.ag/docs/swap/order-and-execute)

## 11:20 PDT distribution + retention check

The first post-release chess evidence is still below the public privacy threshold: fewer than five
games started, completed, or tournaments created. Direct challenge links therefore remain the next
conditional chess feature, not current work. The homepage already exposes Chess in the primary nav,
hero micro-nav, footer, sitemap, and How-to-buy footer. Adding another homepage button would create
clutter without proving a discovery problem.

The wider funnel is more informative: since the clean baseline, Studio has 15 opens and 10 first
edits, while the quiz has 50 starts and 33 completions. Completion/export/share cells remain below
five. That points to a distribution gap after creation/completion, but it does not distinguish weak
desire to share from a broken share path or low unique traffic. Preserve the current aggregate-only
instrumentation and observe another disclosed cohort before adding referral rewards or status
machinery.

Fresh platform evidence reinforces a web-first sharing strategy. Solana Actions/Blinks can turn an
Action endpoint into a shareable transaction surface, but production requires an `actions.json`,
cross-origin behavior, client compatibility, transaction simulation, and explicit signing. A buy
Blink would therefore add a new transaction-construction trust boundary while duplicating the
existing exact-mint Jupiter route.[^solana-actions] Farcaster Mini Apps offer discovery,
authentication, notifications, and share embeds, but Base moved to standard web apps in April 2026,
and current Farcaster discovery is driven by opens, additions, transactions, and recent momentum.
With no measured Dasha Farcaster traffic, a second identity/distribution stack remains premature.
Portable public URLs and strong social metadata are the option-preserving choice.[^farcaster-spec]
[^farcaster-discovery][^base-webapp]

The next evidence-gated sequence is unchanged:

1. keep the fixed 10+5 chess release stable and observe the first five real starts;
2. if starts occur but completions do not, debug onboarding, holder proof, clock, and abandonment;
3. if completed replays recruit players, add one signed direct challenge URL using the existing game
   and X/holder gates;
4. do not add a buy Blink, referral points, Farcaster identity, more time controls, or another
   homepage CTA before those signals exist.

The live lobby socket alarm after release was a test artifact, not a service failure. A direct client
received `ready`, presence, and `hello_ok`; repeated forced test termination had temporarily consumed
three of the four per-IP seats. The live smoke test now reports close codes immediately and closes
clients gracefully so it does not manufacture the condition it is testing.

[^solana-actions]: [Solana — Actions and Blinks](https://solana.com/developers/guides/advanced/actions)

## 21:45 PDT creator-market boundary and blocked share recovery

Zora's 2026 product makes the financialized-creation thesis explicit: every post is a tradable coin,
creators receive an allocation and earn from trading, and linked social accounts distinguish verified
from unverified creators.[^zora-product][^zora-updates] Base App places that market inside a Farcaster-
powered social feed.[^base-feed] This can compress publishing, discovery, identity, and trading into one
surface, but it also creates a new market for every artifact.

That last property is the non-transferable one for Dasha. Studio edits, quiz results, replays, brackets,
and contributor work should not compete as liquid instruments or fragment attention away from the one
canonical mint. Per-artifact coins would reward posting and speculation rather than authorship quality,
multiply impersonation and moderation surfaces, and turn community recognition into a trading rank.

The transferable pattern is much smaller: verified attribution attached to a portable artifact. Dasha
already has linked X identity, exact public artifact URLs, share cards, GitHub contribution evidence,
and a bounded editorial review model. Keep improving those primitives. A future community-made shelf is
justified only after real Studio shares are available to curate; it should show author, artifact, and an
open-in-Studio action, with no price, volume, tokenization, popularity ordering, or points for posting.

The Chess share audit also found a standards-level defect. Dasha passed `noopener,noreferrer` to
`window.open()` and treated a truthy return as proof of handoff. The browser API intentionally returns
`null` when `noopener` is requested, even when it opened the destination, so the metric could undercount;
a genuinely blocked popup also had no navigation fallback.[^window-open]

The prepared page now uses one X handoff helper for replay, challenge, and tournament shares. It opens
the destination, immediately severs `opener`, falls back to same-tab navigation only when no window was
created, and records replay handoff intent without confusing a secure null return for failure. Native
Web Share remains first choice; cancellation still stays on the page.

[^zora-product]: [Zora — What is Zora?](https://support.zora.co/en/articles/4648001)
[^zora-updates]: [Zora — What has changed on Zora?](https://support.zora.co/en/articles/4641857)
[^base-feed]: [Coinbase — Base App social feed](https://help.coinbase.com/en/base/social-feed/intro)
[^window-open]: [MDN — Window.open()](https://developer.mozilla.org/en-US/docs/Web/API/Window/open)

## 22:05 PDT crypto-game session infrastructure and navigation-safe handoff

MagicBlock's current session-key model addresses a real onchain-game problem: one wallet authorizes a
temporary, scoped, expiring and revocable signer so frequent transactions do not produce repeated wallet
prompts.[^magic-session] Its game architecture then delegates program state to an ephemeral rollup for
low-latency transactions before committing state back to Solana.[^magic-games] The security tradeoff is
not free: an encrypted client key lives in IndexedDB, browser compromise remains in scope, sessions need
funding and revocation, and contract rules must bound permissions.[^magic-security]

Dasha Chess has none of the friction this system is meant to remove. A player signs once to prove current
holder access; moves are authenticated server requests, clocks are server-authoritative, and completed
games already become immutable public replays. Moving moves, ratings, or tournaments onchain would add a
program, RPC/validator dependency, session-key custody, transaction lifecycle, settlement and audit work
without making a move faster or a match more fun.

**Decision:** keep the game offchain and the holder check read-only. Do not add session keys, burner
wallets, ephemeral rollups, move transactions, gas sponsorship, game NFTs, wagers, or onchain rankings.
The transferable principle is scoped short-lived authority; Dasha already has the simpler equivalent in
its 24-hour holder-access proof and bounded signed browser session.

The sibling share audit found one navigation detail after blocked-popup recovery. A same-tab X fallback
navigates immediately, so its aggregate replay-handoff request could be cancelled. The helper now tells
the callback when it used same-tab recovery, and only that path sends the existing event with Fetch
`keepalive`; successful popup and native-share paths retain ordinary delivery. No new event or storage
was added.

[^magic-session]: [MagicBlock — Session Keys](https://docs.magicblock.gg/pages/tools/session-keys/introduction)
[^magic-games]: [MagicBlock — Games](https://docs.magicblock.gg/pages/get-started/use-cases/games)
[^magic-security]: [MagicBlock — Session Key Security](https://docs.magicblock.gg/pages/tools/session-keys/security)

## 22:25 PDT programmable communities and open-Lobby boundary

Towns demonstrates what a genuinely crypto-native messaging product entails: an app chain and stream
nodes, end-to-end encrypted messages, onchain Space ownership, ERC-721 memberships, programmable
read/write entitlements, subscriptions, reputation, and role-based moderation.[^towns-intro] Its bots
also receive explicit per-capability permissions for reading, writing, banning and moderation.[^towns-bots]
These parts form a protocol-level trust and ownership model; a token gate by itself is not the product.

Dasha's Lobby has a different job. It is a lightweight public room with optional linked-X identity,
bounded history and server-side moderation. Making read or write access depend on $dasha would hide the
community from curious visitors, couple ordinary speech to a volatile asset, increase wallet friction,
and contradict the current separation between open culture surfaces and holder-only game utility.
Creating another membership NFT or paid subscription would also fragment the single-mint identity.

**Decision:** keep Lobby reading and participation open. Keep holder proof on Chess, where it grants one
clear optional utility. Do not add membership NFTs, paid chat, token-weighted roles, holder-only reading,
onchain reputation, governance voting, message rewards, tips, or a Towns migration. The transferable
principles are least-privilege automation, explicit moderation authority and user control; retain those
inside the current small Worker rather than importing a protocol.

The popup-recovery behavior now has direct browser evidence rather than only source inspection. At an
exact replay ply, the regression disables Web Share, forces `window.open()` to return `null`, intercepts
the resulting navigation, and proves the current tab requests the complete X intent with the canonical
game and `ply=0`. No network request reaches X during the test.

[^towns-intro]: [Towns — Introduction](https://docs.towns.com/introduction)
[^towns-bots]: [Towns — Bots](https://docs.towns.com/build/bots/introduction)

## 22:45 PDT attention-leaderboard audit and bounded event identity

Kaito's current Yaps description says it scores crypto relevance, originality, reputation-weighted
engagement and social propagation rather than raw volume, while filtering low-effort posts.[^kaito-yaps]
The same system also supports referral points, social cards, optional wallet lists for partner rewards,
and project leaderboards. Other live campaign designs combine mindshare with product points, staking,
followers and engagement.[^theo-kaito] Even when a model says “quality over quantity,” opaque social
weights plus rewards create a target people can farm and make independent audit difficult.

Dasha should not copy this into the Simp Board. X interactions, followers, reach, sentiment, posting
frequency, referrals, holdings, purchases and trades remain zero-point inputs. The existing positive
lanes are more legible: server-scored lore answers and manually reviewed original/OSS contributions.
Social cards should communicate an earned result, not promise compensation for distribution.

Chess metrics follow the same integrity rule. Authoritative starts, finishes, rematches, challenges and
tournaments come from server transitions; browser funnel events are aggregate, per-session deduplicated,
first-party-origin constrained, rate-limited, threshold suppressed and explicitly not unique-user
conversion. The audit found one bypass: an anonymous event with no linked X identity and no
`CF-Connecting-IP` skipped rate limiting yet still incremented the public counter. Normal Cloudflare
browser traffic supplies the header, so accepting the identity-less case added no real-user capability.

The prepared Worker now rejects such events before counting. A regression proves the response is 400
and the metric remains unchanged; linked sessions continue to rate-limit by stable X ID and ordinary
anonymous production events by the ephemeral network subject. This stores no new analytics dimension
and does not expose an IP publicly.

[^kaito-yaps]: [Kaito — Yaps FAQ](https://faq.yaps.kaito.ai/support/yap-faqs)
[^theo-kaito]: [Theo — Kaito campaign](https://docs.theo.xyz/campaigns/kaito)
[^farcaster-spec]: [Farcaster Mini Apps specification](https://docs.neynar.com/miniapps/specification)
[^farcaster-discovery]: [Farcaster Mini Apps FAQ — discovery signals](https://docs.neynar.com/miniapps/guides/faq)
[^base-webapp]: [Base — Migrate to a Standard Web App](https://docs.base.org/apps/guides/migrate-to-standard-web-app)

## 11:40 PDT chess retention + consumer-product delta

A source/runtime audit found a concrete chess lifecycle defect before the first measured cohort: after
a rated game finished, `/chess/me` continued returning that finished game and the interface exposed
Share but no route back into matchmaking. The queue endpoint accepted a returning player internally,
but retained the stale current-game pointer when no opponent was waiting, so refreshing still reopened
the old board. This made repeat play effectively undiscoverable.

The minimum correction is now local: completed live games show **Play again** beside the quieter Share
action; requeueing releases only that player's finished current-game pointer; the normal queue then
shows matchmaking or the new match. Public replay pages intentionally omit Play again because they may
be opened without the participant session. Mobile and desktop browser tests cover the completed state,
and the Worker test proves a timeout finisher can requeue without losing the public replay.

This is a better holding-utility improvement than financial rewards. It turns one holder-gated match
into a repeatable activity without paying for trades, withholding exits, ranking balances, or promising
returns. It also repairs the observation loop: completion can now lead to another start, so future
start/completion counts describe product behavior rather than a dead-end UI.

Fresh 2026 Solana ecosystem reporting points in the same direction. The consumer products highlighted
with actual uptake pair distribution with a concrete repeat activity—collectibles, commerce, cards,
mobile apps, or games—rather than a generic token community shell. Solana Mobile builders also report
that device distribution can produce an initial user cohort, but Dasha has no evidence that a native
or Seeker-specific build is needed. The transferable lesson is to deepen the smallest working web
activity and its return path before adding another platform.[^solana-accelerate-2026]

[^solana-accelerate-2026]: [Solana Foundation — Accelerate USA 2026 recap](https://solana.com/news/accelerate-usa-recap)

## 12:00 PDT chess rules + repeat-ritual delta

The next chess audit found a rules/UI mismatch: the first-party engine already generated queen, rook,
bishop, and knight promotions, but the browser always selected queen. Legal underpromotion was
therefore impossible for a human player. A four-choice native dialog now appears only when a pawn
reaches the last rank. It is keyboard-labelled, touch-sized, fits the 390px viewport, and adds no
permanent board control. Browser coverage performs a real a7–a8 knight choice and verifies that `n`
is submitted to the Worker.

Current retention products increasingly use low-pressure daily micro-goals, while tournament systems
use limited, legible events rather than leaving every format permanently active. That suggests one
future Dasha experiment: a single rotating public chess puzzle with an optional share result, not a
quest economy, prize pool, paid streak, or additional token reward.[^bgaming-quests][^fc26-events]
It should remain conditional on real chess starts reaching the privacy threshold; before that, a
daily puzzle would be content operations for an unproven audience. If tested later, success is repeat
solves and voluntary shares—not trades, wallet balances, or forced daily check-ins.

[^bgaming-quests]: [BGaming — daily micro-goal retention system](https://bgaming.com/news/bgaming-launches-exclusive-quests-retention-tool)
[^fc26-events]: [EA Sports FC 26 — limited tournaments and live events](https://www.ea.com/en/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-fut-deep-dive)

## 12:20 PDT special moves + participation utility

Threefold-repetition identity had one subtle rules bug. The engine included an en-passant target in
its position key whenever a pawn had just advanced two squares, even when the opposing side had no
legal en-passant capture. Under chess repetition rules, positions are distinguished by available
moves, so an unusable target must not split otherwise identical positions. The key now retains the
target only when `legalMoves` contains an en-passant move. Tests cover both an irrelevant e3 target
and a legally capturable d6 target. Promotion reopening also clears the dialog's previous return value,
so cancelling a later promotion cannot accidentally reuse an older choice.

Fan-token evidence identifies a useful but bounded form of holding utility: holders participate in a
specific, consequential choice. Across 3,576 fan-token polls, reported average participation was about
half of holders, with participation varying materially by poll type and disagreement.[^fan-polls]
But event-token evidence also shows anticipation followed by event-time price reversals, including
sell-the-news behavior around World Cup matches.[^fan-events] The implication is not to manufacture
more hype events. If Dasha earns a real returning cohort, test one low-stakes holder choice whose
outcome changes the product—for example the next tournament name, daily puzzle position, or Studio
image pack. Keep treasury, pricing, listings, buybacks, and roadmap promises out of the ballot.

This mechanism could support holding because current ownership grants a small cultural action, not
because selling is punished or buying is rewarded. It should use the existing ephemeral holder proof,
one X identity/one vote, a fixed close time, public aggregate totals, and no wallet retention. Do not
build it before a real activity has enough participants to make the choice meaningful.

[^fan-polls]: [Ante et al. — Voting Participation and Engagement in Blockchain-Based Fan Tokens](https://arxiv.org/abs/2404.08906)
[^fan-events]: [Saggu et al. — Anticipatory Gains and Event-Driven Losses in Blockchain-Based Fan Tokens](https://arxiv.org/abs/2403.15810)

## 12:40 PDT tournament isolation + coordination delta

The multiplayer audit found a state-collision bug: a holder already waiting in casual matchmaking
could join a tournament without leaving the casual queue. Another casual player could then pull that
entrant into a second game, overwrite the entrant's current tournament-game pointer, and strand the
bracket. Tournament creation and joining now remove the actor from casual matchmaking; starting a
tournament purges every entrant; and casual queue cleanup rejects any stale row whose identity is in
an active tournament. Tests cover both the normal join path and a deliberately reinserted stale row.

Recent coordination products show two very different models. ArenaKit financializes tournaments with
entry fees, wagers, and winner-take-all settlement; Dasha should not copy that trust, legal, abuse, or
bankroll surface.[^arenakit] Repeat's tournament platform is winding down in 2026 after a decade,
despite a long-running community and cash competitions, which is a useful warning that prize-funded
competition is not itself durable product-market fit.[^repeat-close] ETHGlobal's new Continuity Track
instead keeps contributors working on real existing products across events rather than cold-starting
disposable demos.[^ethglobal-continuity]

For Dasha, the product implication is narrow: keep holder chess free, rated, and culturally legible;
let community organizers name and share bounded cups using the tournament system that already exists;
and connect open-source events to improvements that survive the event. Do not add entry fees, wagers,
token prizes, a second tournament protocol, or generic quest infrastructure.

[^arenakit]: [B3 — ArenaKit competition protocol](https://paragraph.com/%40b3dotfun/play-to-win)
[^repeat-close]: [Repeat — platform wind-down announcement](https://www.repeat.gg/content/)
[^ethglobal-continuity]: [ETHGlobal — Continuity Track](https://paragraph.com/%40blog.ethglobal/changing-how-hackathons-work)

## 13:00 PDT keyboard access + social-game discovery

The chess board used native buttons, but all 64 were in the Tab sequence and every state redraw
discarded focus. It was technically operable and practically hostile. The board now implements the
WAI-ARIA composite-grid convention: exactly one cell is tabbable, arrow keys move within the visual
grid, the focused cell becomes the return point, and a selection redraw restores board focus. This
adds no visible control and benefits desktop keyboard and assistive-technology users without changing
touch behavior.[^wai-keyboard][^wai-grid]

Mainstream social-game platforms reinforce the existing conditional challenge thesis. Apple now
surfaces games through friend activity and builds time-limited friend challenges on top of an existing
leaderboard; its guidance says challenge entry points should be contextually relevant and deep-link
directly to the activity without unrelated interruption.[^game-center][^game-challenges] Applied to
Dasha, a future challenge belongs on a completed replay or rating result—not as another global homepage
button—and should reuse the existing X identity, rating, holder gate, game wrapper, and public URL.

That discovery mechanism remains usage-gated. The implementation order is still: first five real
games, verify completion, observe voluntary replay sharing, then test a signed direct challenge. Do
not add notifications, contacts access, another social graph, or challenge rewards.

[^wai-keyboard]: [W3C WAI — Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
[^wai-grid]: [W3C WAI — Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
[^game-center]: [Apple — Game Center discovery and engagement](https://developer.apple.com/game-center/)
[^game-challenges]: [Apple — Creating engaging challenges from leaderboards](https://developer.apple.com/documentation/GameKit/creating-engaging-challenges-from-leaderboards)

## 13:20 PDT replay permanence + storage boundary

The casual matchmaking path silently deleted every completed game beyond the newest 100. That
included tournament history and replay URLs already shared on X. The cap is removed locally, and a
regression creates 101 archived games before another match and proves the original public replay is
still present. Shared replays are acquisition objects; deleting them by unrelated match count makes
every old post a future 404 and destroys accumulated attention.

The correct long-term constraint is storage shape, not an arbitrary public-link cap. The current
SQLite-backed Durable Object permits up to 10 GB per object on a paid plan, but a single key/value is
limited to 2 MB.[^do-limits] Dasha currently serializes the whole chess map inside one `chessState`
value. With fewer than five measured games this is not an immediate production problem. Before that
serialized value reaches 1 MB, migrate completed games to individual durable records or per-game
coordination atoms while keeping the same replay URLs. Cloudflare's current guidance likewise models
each multiplayer game session as a natural Durable Object coordination unit and warns against a
global singleton at scale.[^do-rules]

Do not reintroduce count-based replay deletion. If a future retention limit becomes operationally
necessary, publish an explicit time policy first, exclude currently referenced tournament games, and
measure storage rather than guessing from game count. Identity deletion must continue to override
retention and purge the departing person's games.

[^do-limits]: [Cloudflare — Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
[^do-rules]: [Cloudflare — Rules of Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/)

## 16:42 PDT accessible play and incentive-quality delta

The Chess board already uses 64 native buttons, one Tab stop, arrow navigation, visible focus, themed
piece names and server-derived legal destinations. Its selected piece and destination markers were
CSS-only. A keyboard/screen-reader player could hear “e4 empty” after selecting e2 without learning
that e4 was playable. WAI's interactive-grid guidance says selection must be programmatically exposed
and emphasizes that focus and selection are distinct states.[^wai-grid]

The prepared board renderer now appends three concise states to the existing square label: `selected`,
`legal move`, or `legal capture`. It does not add 64 tab stops, announce decorative coordinates, create
an invalid partial ARIA grid, change visible copy, alter legal-move computation, or add a dependency.
Browser coverage proves Dasha's selected pawn, an empty legal destination and an Anna capture are all
announced at 320, 390 and 1440 pixels while touch/keyboard behavior and zero-overflow remain intact.

Two incentive studies strengthen the project's existing restraint:

- A 574,829-wallet Farcaster study finds token rewards often increase posting while failing to improve
  or sometimes reducing content quality; repeated algorithmic rewards can promote strategic gaming,
  and measured wealth concentration is high.[^farcaster-incentives]
- A randomized controlled experiment finds blockchain-token incentives can crowd out intrinsic
  motivation and that combining multiple token/reputation incentives creates interaction effects that
  a simple additive points model misses.[^token-sharing-rct]

Inference for Dasha: access utility, ratings and editorial recognition can remain separate because
they measure different things. Do not turn Chess wins, wallet balance, posts, referrals and purchases
into one economic score. Improve the experience people voluntarily return to; keep Simp points capped,
editorial and non-financial; keep holder status zero-point; and treat any future reward experiment as a
bounded causal test with quality and retention outcomes, not raw activity.

[^wai-grid]: [W3C WAI — Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
[^farcaster-incentives]: [Liu et al. — Beyond Single-Tokenomics](https://arxiv.org/abs/2511.00827)
[^token-sharing-rct]: [Mion et al. — To incentivize or not](https://arxiv.org/abs/2206.03221)

## 13:40 PDT chess card completeness + portable distribution

Chess pages already emitted dynamic replay/tournament titles, descriptions, canonical URLs, and a
large generic image. The image contract was less complete than the quiz card: it omitted secure URL,
MIME type, dimensions, and alt text. The existing verified 1200×630 PNG now declares all of those
Open Graph properties plus Twitter image alt text. Static and dynamic metadata tests enforce the
contract.[^ogp]

This is useful beyond X. Open Graph treats the canonical `og:url` as the object's permanent graph ID
and recommends structured image metadata, including alt text. Bluesky clients also construct website
cards by fetching a URL's title, description, and image before embedding a snapshot in the post.
Portable, complete metadata therefore compounds the same replay URL across social clients without
requiring Dasha to adopt another identity system or posting API.[^bluesky-cards]

Do not generate per-position chess images yet. The dynamic title already distinguishes each game,
while all chess sharing remains below the public threshold. If voluntary replay shares become
measurable, the next discriminating card experiment is one server-rendered final-board image with
players/result and descriptive alt—not a card editor or multiple variants.

[^ogp]: [The Open Graph protocol — image structured properties](https://ogp.me/)
[^bluesky-cards]: [Bluesky — website card embeds](https://docs.bsky.app/docs/tutorials/creating-a-post#website-card-embeds)

## 14:00 PDT private storage telemetry + analytics restraint

Replay permanence had a documented 1 MB migration trigger but no measurement. The authenticated
operator metrics response now reports the exact UTF-8 byte length of the serialized `chessState` and
the `1,000,000` byte migration threshold. The snapshot function is shared with persistence so the
measurement cannot silently drift from what is written. The signal is absent from public funnel data,
contains no new event or identity record, and adds no user-facing interface.

Do not add an analytics vendor or high-cardinality event stream for this. Cloudflare Analytics Engine
is designed for large aggregate workloads and can adaptively sample both writes and reads; its own
guidance warns that rare subgroups and individual sequences may disappear under sampling.[^wae]
Dasha currently needs exact small-cohort product transitions and one deterministic storage gauge, both
already handled in the Durable Object. Reconsider Analytics Engine only when event volume or query
cost exceeds the current aggregate counters, and then index by product surface rather than user ID.

Current Farcaster discovery similarly ranks apps using recent engagement signals.[^fc-discovery]
That is evidence to measure genuine opens and repeat activity, not a reason to manufacture events or
adopt Farcaster before traffic exists. Dasha's public thresholding and private exact counters remain
the more honest fit for the present cohort.

[^wae]: [Cloudflare — Analytics Engine sampling](https://developers.cloudflare.com/analytics/analytics-engine/sampling/)
[^fc-discovery]: [Neynar — Mini App discovery](https://docs.neynar.com/miniapps/guides/discovery)

## 15:20 PDT creator-market delta + agreed draws

Recent product evidence strengthens the case for connecting culture to one durable community asset,
but not for turning every Dasha artifact into another token. Paragraph reports 9,400 post coins and
5,000 supporters in its first month, and specifically highlights pairing individual post coins with
creator/community coins plus linked remix chains.[^paragraph-learning] Zora's current model goes
further: every post pairs into a profile-level creator coin, while creator subscriptions provide the
return channel.[^zora-coins][^zora-updates] Both products couple repeated publishing with discovery;
neither is evidence that an early site with a tiny cohort benefits from minting more assets.

For Dasha, the useful abstraction is the *link*, not the extra coin: every Studio output, quiz result,
tournament, and chess replay should lead back to one recognizable $dasha world. Do not add post
coins, creator coins, x402 paywalls, or trading-fee economics. If real creation volume appears, first
test a non-financial weekly gallery that attributes the maker and links the editable Studio state.
The existing coin remains the only asset and optional holder access remains the only ownership
primitive.

Solana's 2026 consumer evidence also favors distribution surfaces over token mechanics: its official
Accelerate recap highlights shipped consumer apps, Seeker as an acquisition channel, and consumer
wallet/account infrastructure.[^solana-accelerate] Farcaster Mini App notifications require an app to
be added and notifications explicitly enabled, and provide open-rate analytics.[^neynar-notify]
These are later retention channels, not substitutes for current proof. Revisit a Solana Mobile
package or Mini App only after repeat chess/Studio use clears the privacy threshold.

Chess now supports mutual draw offers locally. The single control changes from **Offer draw** to
**Accept draw** when appropriate; the offer cannot be withdrawn, an opponent move rejects it, and
both players must first make a move. This matches FIDE's online regulation and basic law without a
modal or second decline control.[^fide-online][^fide-laws] Tournament draws continue through the
existing color-swapped rematch path, so no bracket rule or reward system was added.

[^paragraph-learning]: [Paragraph — What We’re Learning from Coins](https://paragraph.com/%40blog/what-were-learning-from-coins-on-paragraph)
[^zora-coins]: [Zora — Understanding Creator Coins](https://support.zora.co/en/articles/6316801)
[^zora-updates]: [Zora — Product changes](https://support.zora.co/en/articles/4641857)
[^solana-accelerate]: [Solana — Accelerate USA 2026 recap](https://solana.com/news/accelerate-usa-recap)
[^neynar-notify]: [Neynar — Mini App notifications](https://docs.neynar.com/docs/send-notifications-to-mini-app-users)
[^fide-online]: [FIDE — Online Chess Regulations](https://handbook.fide.com/chapter/OnlineChessRegulations)
[^fide-laws]: [FIDE — Laws of Chess](https://handbook.fide.com/chapter/e012023)

## 16:00 PDT consumer-collectible delta + chess check semantics

The freshest Solana consumer growth is concentrated in products with a concrete object and a repeat
reveal/collection loop, not generic token-gated dashboards. Solana's April roundup reports Collector
Crypt at $165 million monthly volume and $85 million revenue, while its May and June roundups describe
physical-card vending, pack opening, collectible arcades, and in-wallet packs reaching more than
1,000 collectors in a week.[^solana-april][^solana-may][^solana-june] Solana Mobile's July launch
similarly reports more than 100,000 eligible users and 188 developers after a season of real app
activity—not rewards attached to an empty shell.[^skr]

The transferable insight is a compact recurring reveal, not gacha economics. Dasha Studio already
has the right primitive in its surprise/edit path and image library. Do not add paid packs, random
token rewards, staking, or a second collectible asset. If organic Studio completions clear the
privacy threshold, test one free weekly **Archive Drop**: one Dasha image, one short prompt, immediate
entry into the existing editor, and an editable share link. Measure completion and return visits;
remove it if it merely shifts existing clicks.

Chess now exposes server-derived check state. The checked king receives a visible high-contrast ring,
its native button label says “in check,” and the live status distinguishes “Your king is in check”
from “Opponent is in check.” Adding Axe to the mobile and desktop browser test exposed an older ARIA
error: the board claimed `grid/gridcell` semantics without row elements. Native button semantics plus
the existing roving Tab stop and arrow navigation are both simpler and valid, so the inaccurate roles
were removed rather than adding wrapper markup solely to satisfy a role claim.

[^solana-april]: [Solana — Ecosystem Roundup, April 2026](https://solana.com/uk/news/solana-ecosystem-roundup-april-2026)
[^solana-may]: [Solana — Ecosystem Roundup, May 2026](https://solana.com/vi/news/solana-ecosystem-roundup-may-2026)
[^solana-june]: [Solana — Ecosystem Roundup, June 2026](https://solana.com/pl/news/solana-ecosystem-roundup-june-2026)
[^skr]: [Solana Mobile — SKR is live](https://solanamobile.com/blog/skr-is-live)

## 12:25 PDT participation moat + measured chess restraint

Fresh evidence does not support adding another financial loop. A 2026 Pump.fun study finds that
structural and behavioral launch variables improve predictions of graduation, while a separate
Solana study reports that fewer than two percent of sampled launches reached major DEXs.[^pump-success][^pump-study]
Another 2025 paper models memecoin fragility through volatility, ownership concentration, and
sentiment amplification.[^fragility] These results describe attention-sensitive markets; they do not
show that referral points, lockups, sell penalties, or artificial engagement produce durable holders.

The stronger product pattern is a recurring object people actually use. Solana's May 2026 consumer
recap highlights shipped apps with users and repeat activity, while Farcaster's Mini App documentation
centers one-click social discovery, saved apps, notifications, and existing identity.[^accelerate][^miniapps]
Paragraph's current experiments similarly tie discovery to things people publish and support, while
openly treating the relationship between post-, creator-, and project-level coins as unresolved.[^paragraph-coins]
For Dasha, the weakest sufficient hypothesis remains: one recognizable asset plus public cultural
objects, with optional holder access to play. Attention should return through useful replays,
tournaments, Studio artifacts, and identity—not through a new coin, paywall, trading fee, or reward
promise.

The production funnel reinforces restraint: Chess starts, completions, tournaments, and share intents
all remain below the public threshold of five. Therefore direct challenges, seasonal rewards, a
Farcaster wrapper, and a Solana Mobile package remain gated. This pass instead fixed two concrete
quality problems: the live audit now recognizes the newly published privacy-safe chess share fields,
and Resign requires a native confirmation so an accidental mobile tap cannot irreversibly end a game.
The verifier regression covers the expanded schema; the browser regression covers both dismiss and
confirm paths.

[^pump-success]: [Marino et al. — Predicting the success of new crypto-tokens: the Pump.fun case](https://arxiv.org/abs/2602.14860)
[^pump-study]: [Mancino — The Memecoin Phenomenon: An In-Depth Study of Solana's Blockchain Trends](https://arxiv.org/abs/2512.11850)
[^fragility]: [Xiang et al. — Measuring Memecoin Fragility](https://arxiv.org/abs/2512.00377)
[^accelerate]: [Solana Foundation — Accelerate USA 2026 recap](https://solana.com/news/accelerate-usa-recap)
[^miniapps]: [Farcaster — Why Mini Apps](https://miniapps.farcaster.xyz/)
[^paragraph-coins]: [Paragraph — Introducing Coins](https://paragraph.com/%40blog/coins)

## 13:00 PDT embedded-game pattern + engine proof

Current consumer platforms are converging on short interactive objects inside an existing social
surface. Base's current product announcement combines social identity, group chat, creator posts,
and feed-embedded mini apps; Farcaster documents the same advantages as one-click discovery, saved
apps, and opt-in notifications.[^base-day-one][^miniapps] Solana's March through June roundups show
games, tournaments, vending, packs, and collectible arcades, but the strongest reported usage belongs
to products with a concrete repeat action rather than a generic token dashboard.[^solana-march][^solana-june-2]

The transferable Dasha idea is not “add rewards.” It is “make one complete action legible and worth
returning to.” Chess already has that action: play a rated holder match, then share a public replay.
Studio has another: open a seed, change it, export it. Do not add daily claims, mystery-box payouts,
staking, or engagement bounties; those mechanisms make paid activity indistinguishable from genuine
use and add financial/security scope. A feed wrapper is justified only after repeat web use appears.

The first-party chess engine now has a permanent canonical perft regression: 20 legal positions at
depth one, 400 at depth two, and 8,902 at depth three. Targeted cases also prove that castling through
an attacked transit square and en passant that exposes the moving side's king are rejected. This
raises confidence in the existing engine without a dependency or rewrite. The remaining product
priority is distribution and real match formation, not more chess rules or cosmetics.

[^base-day-one]: [Base — A New Day One](https://blog.base.org/a-new-day-one)
[^solana-march]: [Solana — Ecosystem Roundup, March 2026](https://solana.com/uk/news/solana-ecosystem-roundup-march-2026)
[^solana-june-2]: [Solana — Ecosystem Roundup, June 2026](https://solana.com/pl/news/solana-ecosystem-roundup-june-2026)

## 13:35 PDT social-game retention + draw-turn contract

Recent social-game evidence points to a small loop: a clear action, another person, a result worth
returning to, and a low-friction re-entry. One published Farcaster Mini App case study reports week-one
retention around 15–19% for a draw-and-guess game and frames the useful loop as creation plus another
player's response.[^drawcast] This is directional self-reported evidence, not a universal benchmark.
Farcaster's own Mini App surface supplies discovery, saved apps, and opt-in notifications, while
Solana Mobile's current season ties distribution to a large catalog and measured device activity.[^miniapps][^skr]

Dasha should not copy the reward layer. The strongest nonfinancial loop is already present:
**opponent → move → result → replay/rematch**. Before adding notification permissions or a wrapper,
the web game needs enough matches to prove that loop exists. At the current sub-five public cohort,
the honest next signal is completed games and voluntary replay sharing—not daily active-user rewards.

The replay/lifecycle audit found one server contract error: either participant could offer a draw on
either turn. A player could therefore offer during the opponent's move, precisely when that opponent's
client does not poll. The corrected contract follows the natural turn boundary: only the player who
just moved can offer, and only the player whose turn it is can accept. The server enforces it; the
client disables an invalid offer; worker and mobile/desktop browser tests cover rejection, offer,
visibility, decline-by-move, and acceptance.

[^drawcast]: [Product — Stop Losing Users: A Builder's Guide to Mini App User Retention](https://paragraph.com/%40product/mini-app-retention)

## 14:10 PDT ownership-as-access + mobile recovery

The latest ownership commentary is useful mainly as a warning about sequencing. A16z's 2026 “long
game” essay argues that tokens can coordinate owner communities but acknowledges that extractive
behavior has eroded trust.[^long-game] Its governance guidance is more operational: participation
without a personally meaningful social experience offers little psychological value, and blind
rewards invite harvesting and bots.[^governance] The older progressive-decentralization playbook
states the same sequencing constraint directly: product/market fit before community ownership.[^progressive]

Dasha already has the smallest legitimate ownership primitive: current holder proof opens chess.
The product—not points for buying—is the benefit. Keep public replays and the rest of the site open;
keep the wallet address discarded after the check; do not add balance-weighted rank, governance,
holding-duration multipliers, sell penalties, or token emissions. If chess becomes meaningfully used,
the next holder benefit should be another experience such as a scheduled table or archive event, not
a yield claim.

The mobile lifecycle audit also exposed a practical retention failure unrelated to incentives:
transient network loss could reject a fetch outside the page's handled response path, and an initial
offline load had no automatic recovery. The shared chess request helper now normalizes network
failure into the existing error contract, and the browser's native `online` event refreshes identity
and tournament state. A 390 px regression simulates `internetdisconnected`, proves there is no page
error, restores connectivity, and verifies that the Link X state appears without a reload.

[^long-game]: [A16z crypto — The long game for crypto](https://a16zcrypto.com/posts/article/the-long-game-for-crypto)
[^governance]: [A16z crypto — Governance FAQs](https://a16zcrypto.com/posts/article/governance-faq)
[^progressive]: [A16z crypto — Progressive Decentralization](https://a16zcrypto.com/posts/article/progressive-decentralization-crypto-product-management)

## 14:45 PDT show-the-object distribution + tournament liveness

A16z's June 2026 communications note describes a “show me” shift: crypto projects no longer receive
much credit for a token plus a promised vision; external audiences increasingly expect working,
consumer-ready proof.[^show-me] This is an investor's perspective, but it matches Dasha's own funnel:
the most credible distribution units are artifacts that resolve on click—an editable image, quiz
result, live bracket, or complete replay. Generic “community,” “utility,” and roadmap copy cannot
substitute for them.

The attention strategy should therefore remain object-led. Share one real result with its canonical
URL; let that page make the next action obvious; keep the full mint consistently available. Do not
add speculative feature announcements, paid engagement, token-voting theater, or an activity feed
with no activity. Once five real examples exist in one surface, a small attributed gallery becomes
credible. Before then, the products themselves are the campaign.

The chess abuse audit found a liveness flaw in that object path. Dasha permits only one open tournament
at a time to avoid clutter, but an abandoned registration never expired, so one organizer could block
all future cups forever. Registrations now expire after 24 hours. The cleanup runs centrally before
every chess request, persists once, removes the stale public deep link, and permits a new tournament.
The window is deliberately generous for a small community and adds no scheduler or moderation panel.

[^show-me]: [A16z crypto — Welcome to the “Show Me” era](https://a16zcrypto.com/posts/article/show-me-era-in-communications-crypto)

## 15:20 PDT rendered-state audit + wrapper restraint

Automated DOM checks were green, but rendered screenshots at 390 px and 1440 px exposed a concrete
state bug: the replay slider, arrows, and “Start” label occupied space during a live game. The element
had the native `hidden` attribute, but the authored `.replay { display:flex }` rule won in the cascade.
That cluttered the primary game action on both mobile and desktop and risked exposing an inactive
control group to assistive technology.

The chess page now gives native hidden state explicit precedence with one global rule. The browser
regression asserts that replay controls are actually non-visible during play and visible on a public
replay. This matches web accessibility guidance that hidden dynamic content should be removed from
both rendering and the accessibility tree, rather than merely appearing inactive.[^hidden-content]

Solana Mobile currently accepts packaged progressive web apps, but packaging does not repair an
incorrect web interaction state.[^solana-pwa] Keep the wrapper gated. Dasha gets more value now from
rendered mobile audits of the canonical page than from another distribution artifact that duplicates
the same bug. Reconsider packaging only after repeat chess use and a clean touch-state audit.

[^hidden-content]: [web.dev — Hiding and updating content](https://web.dev/articles/hiding-and-updating-content)
[^solana-pwa]: [Solana Mobile — dApp Store introduction](https://docs.solanamobile.com/dapp-store/intro)

## 15:50 PDT public replay truth

A public replay is an acquisition object, not an authenticated dashboard. The replay route loaded the
game correctly but left the default “Your rating 1200 · 0 games” panel visible even though it had not
loaded an identity. That false personalization is now hidden on anonymous replays. The result, named
players, board playback, move history, leaderboard, tournaments, and Share action remain available
without a gate.

This is also the right distribution boundary. Open Graph requires a stable title, canonical URL, and
representative image so a page can become a legible shared object.[^ogp] Farcaster likewise treats a
Mini App as an experience launched from a social feed, which strengthens the same product rule:
resolve the promise of the shared link before asking for identity or ownership.[^farcaster-docs]
Dasha should not add another replay CTA until real traffic shows that viewers fail to find the existing
Share or tournament path.

[^ogp]: [The Open Graph protocol — basic metadata](https://ogp.me/)

## 00:30 PDT concrete objects, recurring occasions, and create recovery

The newest consumer-crypto launches keep making the same product move in different forms: reduce an
abstract network or token to one recognizable object and one obvious action. Solflare Packs puts a
collectible pack inside a wallet; ComicBook and Collector Crypt use a vending-machine metaphor;
Paragraph organizes creation around a publication, post, subscription and recommendation; Solana
Mobile organizes participation into explicit seasons.[^solana-june][^accelerate-consumer][^paragraph-docs][^skr-live-2]
The reported scale is not transferable evidence that Dasha should copy paid random packs, emissions,
activity tracking, staking, or a generic creator platform. The transferable pattern is legibility.

Dasha already has concrete objects: a Studio image, quiz result, challenge, game replay and tournament
bracket. The best near-term community occasion is therefore a named holder cup built from the existing
Chess system, but only after actual Chess starts and completions clear the privacy threshold. Its
distribution artifact is the bracket and its durable evidence is the replay. No prize, paid entry,
trade task, balance-weighted status, lockup, referral payment, or holding-duration reward is needed.
Attention should resolve to a useful first-party artifact; voluntary demand should come from wanting
continued access to the product and culture, not engineered sell friction.

The reliability audit found that this occasion could strand its organizer. If tournament creation
succeeded but the response was lost, repeating Create returned `a tournament is already open` even
though the organizer was trying to recover that exact tournament. The prepared Worker now treats the
organizer's existing registration or active bracket as the authoritative result. A retry returns the
same tournament ID, creates no second bracket and increments no second creation metric. This uses the
existing authenticated identity and one-open-tournament invariant; it adds no idempotency key, table,
dependency or client protocol.

[^solana-june]: [Solana — Ecosystem Roundup, June 2026](https://solana.com/pl/news/solana-ecosystem-roundup-june-2026)
[^accelerate-consumer]: [Solana — Accelerate USA consumer product recap](https://solana.com/news/accelerate-usa-recap)
[^paragraph-docs]: [Paragraph — product documentation](https://paragraph.com/docs)
[^skr-live-2]: [Solana Mobile — SKR is live](https://solanamobile.com/blog/skr-is-live)

## 01:05 PDT portable distribution without embedded speculation

Solana Actions and Blinks formalize a useful distribution idea: a normal URL can carry an action into
another website, wallet, QR code or chat surface while the wallet preserves an explicit transaction
preview.[^solana-actions] Zora's 2026 product changes similarly emphasize full object pages, rich link
previews and fast feedback for creator coins.[^zora-updates] These products show the value of portable,
canonical objects. They do not prove that every Dasha image, quiz answer, replay or tournament should
become a coin or transaction.

Dasha's existing public challenge, replay and tournament links already cross the important boundary:
they are standard URLs, have state-aware metadata, render without a wallet, and lead back to the
first-party product. Keep the Buy action separate and explicit on the canonical site. Do not put a swap
inside replay or tournament shares, because that would blur cultural evidence with a financial action
and add wallet-client compatibility and transaction-simulation obligations. Measure real share
handoffs, replay opens and replay-to-Play intent before adding another distribution protocol.

The tournament recovery audit then proved a remaining client defect. Although the Worker could now
return the organizer's authoritative bracket on a repeated Create, a mobile browser whose first POST
response vanished still stopped on a network error. The prepared client now performs one safe GET of
the tournament list after an ambiguous Create. It never repeats the POST. If the organizer's bracket is
present, the page renders it and clears the false failure; if not, the original error remains visible.
A 390 px browser regression commits the tournament, drops the response, records exactly one POST and
reaches the original bracket without overflow.

[^solana-actions]: [Solana — Blockchain Links and Actions](https://solana.com/pt/news/blinks-blockchain-links-solana-actions)
[^zora-updates]: [Zora — platform updates through April 2026](https://support.zora.co/en/articles/4641857)

## 01:40 PDT bounded occasions, discovery, and outage truth

Solana Mobile's newest ecosystem recap identifies two distinct growth mechanisms: recurring featured
placement and time-bounded competitions. Its dApp Spotlight rotates a small curated set, while Seeker
games use championships, leaderboards, perks, prizes, quests and rewards.[^seeker-discovery] The first
mechanism transfers to Dasha more cleanly than the second. A small project can create one legible
occasion and feature its real artifacts; it cannot responsibly infer that paid acquisition, emissions,
trading campaigns or prize ladders create durable community or voluntary token demand.

The later Dasha experiment remains one named holder cup only after starts and completions clear the
existing privacy threshold. Spotlight the bracket, decisive replays and one strong Studio artifact on
existing surfaces for a bounded period. Keep entry free beyond current ownership proof; use no prize,
streak, referral payout, trading requirement, balance multiplier or holding-duration score. The success
signal is returning play and artifact handoff, not transactions induced by a reward deadline.

The browser audit disproved a suspected Start-retry defect: the existing tournament poll already
reconciles a committed Start whose response disappears, without replaying the POST. A new 390 px
regression pins one Start request and the recovered active bracket. The audit did expose a different
truthfulness defect: a failed tournament-list request rendered the empty Create state. The prepared
page now removes impossible actions and displays `Tournaments unavailable.`; a missing deep link keeps
the singular `Tournament unavailable.` state. This mirrors the ladder's existing distinction between
an empty table and an unavailable one.

[^seeker-discovery]: [Solana Mobile — 1,000+ dApps, smarter discovery, and a bigger Seeker Season](https://solanamobile.com/blog/1-000-dapps-smarter-discovery-and-a-bigger-seeker-season)

## 02:15 PDT shared-link failure and communication restraint

XMTP's current ecosystem frames chat as a distribution surface for mini apps, agents, group activity
and economic actions. Paragraph uses XMTP to deliver opted-in publication messages to wallet inboxes
and combines that with search and discovery.[^xmtp-community][^wallet-newsletters] Those are useful
patterns at platform scale, but they do not establish that Dasha needs wallet DMs, another group chat,
newsletter delivery, or an agent inside messages. Dasha already has linked X identity, the public Lobby,
native device sharing, X fallback and canonical challenge/replay/bracket URLs.

The next communication primitive should remain the exact artifact link. Only after starts, completions
and returning play disclose should Dasha test one explicitly opted-in return channel for a real turn,
challenge or cup—not a promotional blast, wallet-address scrape, paid message or automated social task.
Consent, unsubscribe, moderation, delivery failure and privacy boundaries would be product requirements,
not implementation details.

The shared-challenge browser audit found a smaller immediate trust defect. When a challenge deep link
returned an error, the page cleared the challenge and rebuilt unrelated tournament Create and Challenge
buttons beneath `Challenge unavailable.` The prepared client now clears the whole Play subpanel and
renders one truthful failure state. A 390 px regression proves the exact error, absence of unrelated
actions and no horizontal overflow. Successful challenge creation, sharing, polling and acceptance are
unchanged.

[^xmtp-community]: [XMTP Community — ecosystem and Base App updates](https://paragraph.com/%40xmtp_community)
[^wallet-newsletters]: [Paragraph — wallet newsletter delivery with XMTP](https://paragraph.com/%40blog/wallet-newsletters)

## 01:10 PDT portable distribution and Studio export recovery

Studio has reached 23 opens and 10 first edits, but completion, export and share cells remain below
five. Chess remains at 12 opens with every downstream cell suppressed. These aggregate counts still do
not justify another Chess mode, reward, notification system or platform wrapper.

Fresh products differ in mechanics but converge on a portable object plus an explicit return channel.
Farcaster Mini Apps lead with feed discovery, one-click launch and opt-in notifications; Base is moving
to standard web apps plus wallet-address notifications; Zora keeps widening content and fast-buy
surfaces; Immutable's 2026 audience material emphasizes owning a contactable audience.[^farcaster-miniapps][^base-standard-app][^base-notifications][^zora-updates][^immutable-audience]
For Dasha, replay, bracket, challenge, quiz-result and Studio URLs should remain the acquisition
objects. An opt-in turn or cup notification is worth reconsidering only after real starts and
completions disclose. Do not ask for notification permission on first visit or add an email form before
use proves a reason to return.

The adjacent Studio audit found a concrete failure. Canvas export occurred before Share's
`try/finally`; a tainted external image or null `toBlob` result could leave Share disabled forever. The
prepared client now rejects null blobs, performs PNG and JPEG export inside the recovery boundary,
restores the button on every failure and gives one bounded error. A 390 px browser forces a
`SecurityError` and proves recovery. The source gate also pins `touch-action:pan-y`, which the
post-deploy audit previously caught only after release.

The demand boundary is unchanged: build voluntary product usefulness and repeat participation. No
artificial volume, buy/trade/share rewards, sell penalties, holding-duration multipliers or
price-support claims.

[^farcaster-miniapps]: [Farcaster — Mini Apps](https://miniapps.farcaster.xyz/)
[^base-standard-app]: [Base — migrate to a standard web app](https://docs.base.org/apps/guides/migrate-to-standard-web-app)
[^base-notifications]: [Base — app notifications](https://docs.base.org/apps/technical-guides/base-notifications)
[^zora-updates]: [Zora — platform updates](https://support.zora.co/en/articles/4641857)
[^immutable-audience]: [Immutable — building an owned game audience](https://www.immutable.com/resources/insights/owning-your-game-audience)

## 01:45 PDT social-game distribution and one-share integrity

Solana's March 2026 ecosystem roundup shows a large volume of new prediction, trading, mobile and
gaming launches, but launch count is not retention evidence.[^solana-march-roundup] Immutable's current
game stack makes the more transferable claim: blockchain mechanics should be invisible to players,
distribution should meet players where they already are, and the growth layer can remain chain
optional.[^immutable-chain] Its growth terms also explicitly warn that low-value activity and product
quality constrain any acquisition system.[^immutable-growth-terms]

Dasha should therefore keep Chess recognizable as Chess: linked identity, a current holder check,
standard rules, public records and direct invitations. New platform wrappers, prediction layers,
financial rewards and generic quest infrastructure would add acquisition machinery before the current
game has disclosed a start. The first useful conversion object remains one challenge or replay URL.

The adjacent interaction audit found that this object could be duplicated accidentally. `shareGame`
had no single-flight boundary, so a rapid double tap could invoke two native share operations; a browser
rejecting the second could then open an unintended X fallback. The prepared page now disables Share
only while one native operation is pending, ignores duplicate activation, and restores it after success,
cancel, failure or fallback. A real 390 px replay regression clicks twice in one task and proves exactly
one native sheet, the complete image card and the exact replay URL. No visible control or dependency was
added.

[^solana-march-roundup]: [Solana — ecosystem roundup, March 2026](https://solana.com/uk/news/solana-ecosystem-roundup-march-2026)
[^immutable-chain]: [Immutable — gaming infrastructure](https://www.immutable.com/blog/immutables-tokenomics-and-staking-principles)
[^immutable-growth-terms]: [Immutable — Growth Product Terms](https://www.immutable.com/legal/growth-product-terms)

## 02:15 PDT coordination products and idempotent tournament enrollment

Current crypto community products cluster around token-gated membership, points, quests, leaderboards,
chat and private spaces. Guild packages those primitives across many integrations, while Towns combines
familiar group messaging with optional onchain ownership and gating.[^guild-current][^towns-current]
Ethereum's current community program points to a less financial coordination mechanism: recurring local
gatherings, organizer templates, contributor connections and amplification.[^ethereum-events]

The useful Dasha transfer is a bounded occasion around an already-working product. A named holder cup
can create a reason to return and a public bracket can create a reason to share, but only after starts
and completions disclose. Dasha should not import generic quests, token rewards, paid access, role
sprawl or another chat system. The Lobby already provides conversation; Chess already provides a
specific coordinated act.

The server audit found one reliability defect in that act. Tournament enrollment was only partly
idempotent: once the bracket reached 16 entrants, a retry from an already-enrolled holder returned
`tournament is full`. A lost first response could therefore make a successful enrollment look failed.
The prepared Worker now identifies existing membership before applying capacity, returns the unchanged
16-person bracket, and neither duplicates the entrant nor increments the aggregate join counter. The
Worker regression constructs a full bracket and pins all three properties.

[^guild-current]: [Guild — community platform](https://guild.xyz/)
[^towns-current]: [Towns — community product updates](https://blog.towns.com/)
[^ethereum-events]: [Ethereum.org — 2026 community events and organizer support](https://ethereum.org/ga/community/events/)

## 02:45 PDT concrete consumer objects and odd-bracket integrity

Solana's June roundup reports consumer traction around concrete, easily explained objects and
occasions: WSOP tournament entry, insured collectible packs, trading-card custody, sports modes,
physical merchandise and fan-owned memorabilia.[^solana-june] The figures are ecosystem-reported and
do not establish durable retention, but the product shape is notable. People can immediately say what
they entered, opened, collected, played or owned. Solana Mobile's current hackathon and store program
adds distribution and launch support, not proof that packaging creates repeat use.[^monolith]

Dasha should transfer legibility rather than financial mechanics. A replay is a game someone played; a
bracket is an event people entered; a Studio export is an image someone made; a quiz result is a score
someone can challenge. Paid random packs, tokenized photos, prize pools, prediction layers and a mobile
wrapper would obscure those objects rather than strengthen them. If Studio completion eventually
discloses, one free curated archive capsule could be tested through the existing Surprise path, without
minting, scarcity claims or another gallery control.

The adjacent Chess audit extends deterministic coverage from a two-player cup to five entrants. It
proves every entrant appears exactly once in the opening round, advancement follows a `2 matches + 1
bye`, `1 match + 1 bye`, final structure, the champion is an original entrant, and every decisive match
retains one public replay. The audit is green; production pairing remains unchanged. FIDE's published
pairing rules likewise treat a bye as a real advancement condition when a field is odd, though Dasha's
small knockout is not represented as a FIDE-rated Swiss event.[^fide-bye]

[^solana-june]: [Solana — ecosystem roundup, June 2026](https://solana.com/pl/news/solana-ecosystem-roundup-june-2026)
[^monolith]: [Solana Mobile — MONOLITH hackathon](https://solanamobile.com/blog/the-monolith-solana-mobile-hackathon)
[^fide-bye]: [FIDE — basic rules for Swiss systems](https://handbook.fide.com/chapter/C0401Till2026)

## 03:15 PDT coordination retries and direct-challenge recovery

Current crypto infrastructure treats ambiguous write outcomes as a first-class correctness boundary.
Coinbase's CDP documentation defines idempotency as returning the same result when a state-changing
request is retried, specifically to prevent network failures from duplicating operations. Interledger's
settlement specification similarly requires one side effect under repeated delivery and eventual
reconciliation after an unclear response.[^coinbase-idempotency][^interledger-idempotence] Those systems
use explicit keys because their operations lack a smaller stable resource identity.

Dasha's direct challenge already has that identity: challenge ID, authenticated accepter and stored
game ID. The audit proved the route failed to use it. If the first acceptance succeeded but its response
was lost, the same holder's retry returned `challenge is not open`, even though the game already existed.
The prepared Worker now returns that original game to the original accepter with status 200. It does not
create a second game or increment the acceptance metric, and a different current holder still receives
a conflict. No generic idempotency-key table, expiry job, request UUID or client state was added.

This is the useful reliability pattern for Dasha: every invitation, bracket and replay should resolve to
one authoritative object under retries. It improves trust and completion without adding another feature,
reward, financial mechanic or visible choice.

[^coinbase-idempotency]: [Coinbase Developer Platform — idempotency](https://docs.cdp.coinbase.com/api-reference/v2/idempotency)
[^interledger-idempotence]: [Interledger — settlement idempotence](https://interledger.org/developers/rfcs/settlement-engines/)

## 23:20 PDT shipped-product scan and the no-feature gate

The latest private aggregate readout is directional, not a unique-user funnel: Studio has 19 opens and
10 first edits; the quiz has 60 starts and 41 completions; Chess has 12 page opens, while every later
Chess cell remains below the five-event publication threshold. A suppressed cell is not zero. It is also
not evidence for a new spectator mode, daily cup, reward system, or another token gate.

Newer Solana consumer launches strengthen a narrower product rule. Accelerate USA highlighted shipped
distribution—ComicBook entering an existing 40M-user surface, Tapestry reporting 160,000 users, and
Seeker supplying an identifiable first-user channel—rather than points layered onto an unused flow.[^accelerate-usa]
The same roundup describes real-world vending and themed physical booths: the transferable mechanism is
an immediately legible object in an existing audience context. It is not artificial trading activity.
A16z's 2026 fund thesis similarly emphasizes transparent, verifiable products people use every day, and
directly aligned creator/developer/user economics.[^a16z-fund5]

For Dasha, the next attention loop should therefore start with the proven quiz completion pool and exact
portable outputs: permanent quiz results, Studio exports, challenge URLs, and move-position replay URLs.
Chess already has the relevant continuation mechanics—direct challenges, public replays, position links,
native image share, PGN, rematches, ratings, and tournaments. The broad live audit passed every hard
route, execution, metadata, mint, navigation, image, and asset-parity check; the only soft signal remains
the honestly disclosed public RPC fallback. The proposed move-specific canonical metadata change was
rejected because it would fragment indexing while the exact URL and notation are already present in the
share artifact. The evidence-backed action is to observe the existing page-open → link → proof → queue →
game path and fix its first measured drop, not pre-build a second Chess acquisition theory.

No attention tactic should create fake volume, pay for trades or referrals, obstruct selling, weight
social status by balance, or promise price support. Durable demand can only come from voluntary reasons
to hold and return: access to a product people actually enjoy, credible records, portable cultural
artifacts, and a community that produces things worth revisiting.

[^accelerate-usa]: [Solana — Accelerate USA recap (May 2026)](https://solana.com/news/accelerate-usa-recap)
[^a16z-fund5]: [a16z crypto — Fund 5 (May 2026)](https://a16zcrypto.com/posts/article/fund-5)

## 23:40 PDT result-to-challenge invocation integrity

The permanent quiz result correctly promised “Beat this score” and linked to a bounded result ID, but
the receiving homepage recognized only generic `?quiz=1` invitations. A result recipient landed at the
Simp Board without entering the quick quiz. A second race made the target score unreliable: the result
lookup could paint `Beat 8/10`, then the ordinary identity refresh replaced it with generic copy.

The prepared client now treats a valid six-to-twenty-character result challenge as a focused quiz
invocation, immediately enters the existing ten-question path, and retains the resolved score/title/lane
across either network completion order. Invalid IDs remain ordinary homepage visits; no new endpoint,
button, reward, account field, or dependency was added. A 390 px browser regression loads the actual
`?challenge=result123#simp` shape, observes exactly one result lookup, reaches question one in quick mode,
and preserves the score target without horizontal overflow.

This follows the broader deep-link rule Apple documents for App Clips: the invocation URL should carry
the recipient's context and the launched experience should use it immediately so the task takes fewer
taps.[^appclip-invocation] Solana's link primitives express the same useful product shape. Dasha does not
need a native App Clip or onchain action here; it needed its existing web invocation to keep its promise.

[^appclip-invocation]: [Apple — Responding to App Clip invocations](https://developer.apple.com/documentation/AppClip/responding-to-invocations)

## 00:00 PDT randomized Chess integrity and reward-system evidence

The Chess engine already had canonical perft positions, named rule edges and browser/server race tests,
but no multi-game stateful stress pass. The prepared deterministic audit now walks eight independently
seeded legal games for up to eighty plies each. Every generated move must be accepted; the prior state
must remain immutable; both kings, piece alphabet, castling rights, version, full-move count, half-move
count, SAN and repetition identity must stay valid. Each game then reaches a terminal state and its public
replay must reconstruct the exact authoritative final board, frame count, result and reason. The fixed
seed makes failures reproducible and adds no production dependency or runtime code.

No defect appeared. That is evidence for preserving the current engine, not proof that arbitrary chess
is solved. The audited mating-material cases also remain aligned with Lichess's current rules model:
king plus knight can mate with certain opposing material, while lone-bishop cases depend on opposite-
color bishops, knights or pawns.[^scalachess-current]

Newer crypto gaming evidence argues against adding engagement emissions to compensate for low play.
Immutable's current product framing is explicit: put gameplay first, keep blockchain infrastructure
invisible, and distribute games where players already are.[^immutable-games] Ronin's June 2026 Proof of
Distribution update is more cautionary: its team changed reward calculations during the season and still
required manual review for bots, sybils and wash trading.[^ronin-pod] That is a platform-scale operations
burden, not a Chess feature. Dasha should continue with first-party identity, instant holder proof,
trustworthy ratings and portable games; no play-to-earn pool, trade-linked rating, prize emission or
automated activity payout.

[^scalachess-current]: [Lichess scalachess — insufficient mating material](https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/InsufficientMatingMaterial.scala)
[^immutable-games]: [Immutable — gaming platform and current growth guides](https://www.immutable.com/blog)
[^ronin-pod]: [Ronin — Proof of Distribution season 2](https://blog.roninchain.com/p/proof-of-distribution-s2-is-almost)

## 22:40 PDT portable credentials and public-game privacy

Solana Attestation Service is a live, permissionless credential layer built around an issuer credential,
a defined schema, an authorized signer, a holder and a verifier. Attestations can carry an expiry and be
reused across applications.[^sas][^sas-create] That makes it relevant when a claim needs portable,
cryptographically verifiable meaning outside the product that issued it.

Dasha does not currently have that requirement. Chess access uses a fresh signed wallet challenge and a
strict token-account check; X identity is session-bound; no outside application consumes a Dasha badge.
Adding SAS now would add a transaction, schema governance, signer custody, revocation policy and public
metadata without removing an existing verification step. Do not integrate it yet. Revisit only when a
second independent verifier commits to consuming a narrowly defined, expiring Dasha credential.

The audit did uncover a nearer trust issue. Completed Chess replays intentionally expose both X handles,
ratings, moves, result and completion time, but the privacy page mentioned only aggregate Chess funnel
counts. The deletion path was already stronger than the copy: Leave Board purges the player's rating,
games, challenges and affected tournaments. The prepared privacy copy now states both the public replay
record and the actual deletion effect, with route tests pinning each disclosure. No replay behavior,
identity field or retention rule changed.

[^sas]: [Solana Attestation Service](https://attest.solana.com/)
[^sas-create]: [Solana — Create Attestation](https://solana.com/docs/tools/attestations/instructions/create-attestation)

## 23:00 PDT replay-scale write boundary

Cloudflare's current SQLite-backed Durable Object limit allows a key and value up to 2 MB and recommends
SQLite for new stateful applications.[^do-limits] Dasha's one-megabyte migration signal is therefore a
conservative operating threshold, not the immediate failure point. The audit found a nearer scaling
problem: every anonymous Chess funnel event rewrote `chessState`, serializing every retained game,
rating, challenge and tournament just to increment one aggregate counter.

The prepared Worker stores high-frequency Chess telemetry under the existing separate `chessMetrics`
key, matching Studio and quiz metrics. Startup prefers that key when present and still reads the embedded
legacy metrics, while gameplay persistence retains the embedded copy for backward compatibility. The
moderator reset updates both representations. A storage-spy regression proves a page-open event writes
only `chessMetrics`, not the replay archive. This changes neither event eligibility nor public counts.

Current consumer launches reinforce the sequencing decision. Solana's 2026 coverage emphasizes products
that already have a working consumer loop—tournaments, collectibles, sports, mobile distribution—and
GameShift's loyalty product requires funded rewards, committed tokens and a developer-controlled program.[^solana-consumer][^gameshift-loyalty]
Dasha should scale its already-shipped Chess/replay loop before importing custody, lockups or reward
programs. Those mechanics add sell-pressure rhetoric and operational liability; reliable play and
shareable public records create voluntary reasons to return without financial promises.

[^do-limits]: [Cloudflare — Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
[^solana-consumer]: [Solana — Consumer news](https://solana.com/news/category/consumer)
[^gameshift-loyalty]: [GameShift — Loyalty Rewards](https://docs.gameshift.dev/v1.0/docs/gameshift-loyalty-program-user-guide)

## 23:20 PDT rating restraint and ambiguous-action recovery

FIDE rapid/blitz regulations rate a game once each player has made at least one move unless fair-play
rules require otherwise.[^fide-rating] Lichess separately defines arranged wins, intentional early
losses, boosting and sandbagging as fair-play violations.[^lichess-tos] Dasha already follows the first
boundary: settlement needs two plies. Raising the move minimum would invalidate legitimate tactical
games without preventing collusion, while opponent-frequency enforcement would punish a small community
whose real use case includes rematches. No rating-rule change is justified yet.

The client audit did prove a transport defect. After an action POST lost its response, Dasha correctly
performed an authoritative GET instead of resending the action. If that GET also failed while the
browser still reported online, recovery stopped permanently because ordinary polling does not run on
the moving player's stale turn. The prepared client now retries only the idempotent game GET every 2.5
seconds until state is authoritative, hidden or explicitly offline. It never replays the POST. A 390 px
browser test commits a resignation, drops its response and first recovery read, then proves automatic
completion with exactly one resignation request.

[^fide-rating]: [FIDE — Rapid and Blitz Rating Regulations](https://handbook.fide.com/chapter/B02RBRegulations2024)
[^lichess-tos]: [Lichess — Terms of Service, Fair Play](https://lichess.org/terms-of-service)

## 23:40 PDT reversible rating moderation

The rating audit exposed an operational gap after declining fake precision from a longer move minimum:
Dasha had no supported remedy when review found boosting or sandbagging. Recomputing Elo from stored
games is not safe because every later result depends on the earlier rating and privacy deletion can
remove part of the history. Deleting replays would also destroy the evidence under review.

The prepared Worker adds a moderator-authenticated, reversible leaderboard hide by exact normalized X
handle. A hidden identity and games involving it disappear from the public rating table and recent-game
shelf, while direct replay records, rating history, active play and tournament state remain intact.
Unhide restores discovery without recalculation. Identity deletion removes the moderation row. Tests
pin authorization, hide-list visibility, discovery removal, direct replay preservation and restoration.
This follows Lichess's documented availability of rank/leaderboard bans while avoiding any claim that a
small automated rule can establish intent.[^lichess-tos]

## 00:00 PDT homepage choice hierarchy

The canonical homepage already links every shipped surface through its hero, contextual micro-links,
sections, footer and bounded sitemap. Chess was present in all three relevant navigation layers. The
audit therefore disproved a missing-discovery hypothesis and found the opposite problem: the desktop
header exposed eight simultaneous choices, including four destinations already represented immediately
below it.

Current consumer products separate primary actions from secondary catalogs. Phantom uses broad grouped
navigation with one Download action, while Paragraph's header keeps pricing/account entry and two
conversion actions rather than mirroring every page section.[^phantom-home][^paragraph-home] Dasha is
smaller and needs less structure, not a menu system. The prepared header now contains only Studio,
Chess, Lobby and Buy. Mint verification remains prominent in the hero and token panel; Stills is a page
section; Desk and X remain in contextual links and the footer. Mobile keeps only Lobby and Buy as before.
Responsive tests pin both the four-item desktop hierarchy and two visible mobile actions.

[^phantom-home]: [Phantom](https://phantom.com/)
[^paragraph-home]: [Paragraph](https://paragraph.com/)

## 00:20 PDT exact replay-position language

Solana's link-native product pattern is portability with exact state: Actions and Blinks use metadata-
rich URLs so an interaction can begin on another surface, while TipLink's core insight is that ordinary
links already move cleanly across platforms.[^blinks][^tiplink] Dasha replays already follow the safer
offchain version of that pattern: a durable game ID plus an optional position parameter opens an exact
board without requesting a transaction.

The handoff audit found that the internal half-move index leaked into visible language. After Black's
first reply, the slider, share copy and generated card said “move 2,” which in chess means the next White
move. The prepared client keeps `ply=2` as internal URL state but renders `1... e5`; White positions use
`1. e4`. A dedicated 390 px browser opens the second ply of a three-ply replay and proves matching
control text, native share copy, exact URL and raster-card text. No new button, endpoint or transaction
surface was added.

Do not add a buy Blink to replay shares. It would collapse a cultural/game artifact into an immediate
financial solicitation, broaden wallet trust requirements and make the shared position less credible.
The replay should earn attention; the first-party page can retain a separate, explicit Buy path.

[^blinks]: [Solana — Blockchain Links and Actions](https://solana.com/news/blinks-blockchain-links-solana-actions)
[^tiplink]: [Solana — TipLink case study](https://solana.com/news/case-study-tiplink)

## 22:00 PDT Jupiter Studio boundary and portable Chess records

Jupiter Studio now combines a bonding-curve launch, configurable quote asset and market-cap parameters,
anti-sniping controls, vesting, liquidity handling, creator fees, and a dedicated Jupiter token page.
Its own documentation is explicit that the hosted Studio identity depends on creating and submitting the
token through Studio's launch API; Studio tokens use a fixed one-billion supply and migrate into a
Meteora pool after reaching the graduation threshold.[^jupiter-studio-overview][^jupiter-studio-api]

Those launch mechanics do not transfer to Dasha's already-liquid canonical mint. Re-launching, issuing a
second token, or implying that Dasha inherits Studio creator fees would split identity and misstate the
asset. The useful transferable primitive is narrower: maintain one canonical first-party coin page,
exact mint identity, clear verification links, and product artifacts that point back to that identity.
Jupiter verification may be evaluated separately against the existing mint, but no new launch flow,
bonding curve, artificial fee, lock, vest, or supply intervention belongs in the product roadmap.

The same portability standard exposed a Chess defect. PGN archival export requires the ordered Seven
Tag Roster: Event, Site, Date, Round, White, Black, and Result.[^pgn-spec] Dasha's export omitted Round,
and replay rendering discarded the server's completion timestamp, so a historic no-move replay could
be dated when downloaded. The prepared client now emits the complete ordered roster with unknown Round
as `?`, carries `finishedAt` into replay export, and prefers authoritative move/start/completion times
before the local clock. A real mobile browser downloads both live and historic records and proves the
header order and retained 2025 date.

[^jupiter-studio-overview]: [Jupiter Studio — overview](https://docs.jup.ag/user-docs/launch/studio)
[^jupiter-studio-api]: [Jupiter Developers — Studio overview](https://developers.jup.ag/docs/studio)
[^pgn-spec]: [Portable Game Notation Specification and Implementation Guide](https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm)

## 22:20 PDT Bags fee-sharing boundary and bounded PGN movetext

Bags v2 makes fee allocation part of token launch configuration. Its documented flow creates metadata,
a fee-share configuration, lookup tables when needed, and the launch transaction; the allocation must
total 10,000 basis points and may name up to 100 wallets or supported social identities.[^bags-launch]
Public creator analytics can expose provider identity, wallet and royalty percentage for tokens launched
through that system.[^bags-creators]

This is interesting infrastructure for a new asset whose creators deliberately choose a launch and fee
contract. It is not evidence that an existing Dasha mint can gain retroactive royalties, and routing
trading fees to social participants would turn recognition into trade-dependent compensation. Dasha
should not relaunch, create a proxy coin, add fee-claimer promises, or rank people by fees. The portable
idea is transparent attribution: keep original and open-source contribution credit legible and tied to
real artifacts, without paying it from trading activity.

The adjacent Chess audit tested the non-standard `Variant "Dasha vs Anna"` tag against Lichess's public
PGN analysis importer. Both it and `Variant "Standard"` returned a parsed analysis page, so removal was
not justified by the interoperability hypothesis. The audit instead proved that long Dasha games were
serialized as one unbounded movetext line. PGN export requires movetext tokens to be packed onto
successive lines with fewer than 80 printing characters.[^pgn-spec] The prepared exporter now wraps only
at token boundaries to 79 characters. A real mobile browser exports an 80-ply record and proves multiple
lines with every line below the limit.

[^bags-launch]: [Bags API — launch a token and configure fee sharing](https://docs.bags.fm/how-to-guides/launch-token)
[^bags-creators]: [Bags API — retrieve token creators and royalty shares](https://docs.bags.fm/how-to-guides/get-token-creators)

## 22:40 PDT Clanker launch loops and replay timestamp provenance

Clanker couples conversational or wizard-driven token deployment with automatic liquidity, creator
rewards derived from swaps, optional launch allocations/vaults, discovery pages, and onchain contract
metadata. Its public product description explicitly makes creator earnings a function of buy and sell
volume on tokens deployed through Clanker.[^clanker-about] This produces a short launch-to-discovery
loop, but the economic mechanics are inseparable from a newly deployed EVM token and its liquidity
position.

Dasha should not clone the launch, airdrop, vault, creator-buy, volume-reward, or multi-chain token
mechanics. They neither retrofit the existing Solana mint nor demonstrate recurring product demand.
The transferable interaction principle is one-action object creation followed by an exact shareable
identity. Dasha already has the right primitives in challenge links, replay links, quiz results, and
Studio exports. Attention work should reduce failed creation-to-share transitions and make those objects
good destinations, rather than creating another financial object or paying for circulation.

The Chess provenance trace found that `publicChessReplay()` reconstructed every stored move through the
live move engine. Passing an absent legacy timestamp as `undefined` activated the engine's `Date.now()`
default, manufacturing a fresh access-time timestamp. That fabricated value then took precedence over
the real game completion time in PGN export. The prepared reconstruction now passes deterministic zero
internally, preserves only finite positive stored timestamps, and removes the synthetic field from
undated moves. Core coverage proves an undated legacy move stays undated while `finishedAt` survives;
the responsive export test proves that completion date reaches the downloaded record.

[^clanker-about]: [Clanker — how token deployment, liquidity and creator rewards work](https://www.clanker.world/about)

## 23:00 PDT real-time attention boundary and honest Chess share counts

Pump's current token communities combine livestreams, voice conversation, wallet/X identity and
holder-gated posting. The visible attention surface is only part of the product cost: Pump's published
policy prohibits violence, harassment, sexual exploitation, privacy and copyright violations, retains
some stream data for moderation, supports appeals, and describes both human and automated enforcement.
Its earlier community notice says a 100-fold stream increase required hundreds of daily takedowns and a
temporary pause while moderation infrastructure caught up.[^pump-live-policy][^pump-live-notice]

This is strong evidence against adding open video or voice to Dasha merely for attention. It would add
identity, consent, recording, reporting, storage, moderator and appeal obligations before the existing
Chess funnel has one downstream cell above the disclosure threshold. A controlled public board state
would be safer than creator video, but even live spectating remains behind the existing completed-game
trigger. Keep the replay/challenge/result artifacts, which are deterministic and already bounded, and
make them accurate enough to circulate on their own.

That accuracy audit found the generated Chess card displayed `game.moves.length` as “moves.” The array
stores plies, so `e4 e5` appeared as two moves instead of chess move one. The prepared card now displays
the ceiling of plies divided by two and handles singular/plural correctly. A real mobile share flow
instruments the canvas text and proves a two-ply game says `checkmate · 1 move`, never `2 moves`; image
dimensions, board colors, native sharing and replay destination remain covered.

[^pump-live-policy]: [Pump — Livestream Moderation Policy](https://pump.fun/docs/livestream-moderation-policy)
[^pump-live-notice]: [Pump — Community Notice on livestream moderation](https://pump.fun/docs/moderation-message)

## 23:20 PDT Go.fun bounties and replay-start artifact consistency

Pump now places funded bounties alongside coin discovery, with visible reward amounts, deadlines and
submission counts. Its Go.fun terms describe a much larger operating system behind the card: posting,
funding, review, moderation, verification, transfers, disputes, sanctions controls, deliverable records,
and project/submission display rights.[^gofun-terms] The attention loop is real because a concrete task
and reward become a public object, but the reward is also a financial and editorial commitment.

Dasha should not add paid bounties, token-funded tasks, holder-funded rewards or automatic payouts
without an authorized budget, reviewer, acceptance criteria, IP terms and dispute process. The lean
transfer is already available: publish precise GitHub issues for real Studio/Chess/Lobby gaps, link the
open-source entry point prominently, and grant bounded editorial contribution credit after merged work.
Paid bounty infrastructure should reopen only after genuine contribution volume creates a review queue
and explicit funding authority exists.

The adjacent Chess artifact audit found that replay controls and share intent correctly called ply zero
`Start` / `from the start`, while the generated image exposed the implementation label `replay move 0`.
The prepared canvas now renders `replay start` for the initial frame and retains `replay move N` after a
move. A dedicated 390-pixel browser context opens the exact `?game=…&ply=0` replay, uses native file
sharing, captures real canvas text and proves `replay start` is present and `move 0` absent.

[^gofun-terms]: [Pump — Go.fun Terms](https://pump.fun/docs/go-fun-terms)

## 23:40 PDT holder-proof infrastructure and signature reuse

A production configuration audit listed only the Lobby moderation/session and X OAuth secrets. No
`SOLANA_RPC_URL` or `SOLANA_RPC_URLS` secret is deployed, so the health endpoint's `public-fallback`
signal is accurate. The application already supports up to two dedicated HTTPS endpoints, four-second
timeouts, endpoint failover, strict parsed-account ownership/mint/balance validation and a retryable
503. Adding a provider requires an external endpoint credential; inventing one, embedding a public key
in source, or weakening holder validation would not improve the system.

The audit did expose a client/server resilience mismatch. On total RPC failure the server deliberately
keeps the already verified signed challenge so the identical request can be retried. Chess discarded
that payload when it received 503; the next click requested a new challenge and forced another wallet
signature. The prepared client performs exactly one delayed retry only for status 503, with the same
challenge, public key and signature. All other status and transport failures retain the existing visible
error path. A real 390-pixel wallet/browser simulation proves one challenge request, one signature, two
verification requests and successful holder access.

This does not hide the infrastructure signal or create an unbounded retry loop. A dedicated RPC remains
the correct operational improvement when a credential is available; the product now degrades with less
wallet friction in the meantime.

## 21:40 PDT coordination stacks and exact Chess object identity

Recent coordination products expose three distinct acquisition models. TipLink turns a funded wallet
claim into a URL so a recipient can receive crypto before having a wallet.[^tiplink] Guild combines
onchain, social and time-based requirements into roles, quests and rewards, including token-gated
Discord/Telegram access and activity points.[^guild-how][^guild-use] Dialect lets wallet users opt into
in-app, email, Telegram and push alerts, with a dedicated application wallet and subscriber state.[^dialect-alerts][^dialect-start]

None is a free attention primitive for Dasha. TipLink would turn acquisition into a paid distribution
campaign; Guild's documented examples explicitly reward follows, transactions, balances and social
tasks; Dialect would require retained wallet-address subscriber state that the current holder check
deliberately discards. Dasha has neither disclosed repeat Chess play nor an urgent event stream that
justifies that identity, privacy and operations surface. Do not add token giveaways, quest points,
balance tiers, sell-triggered role removal, a notification bell, wallet subscriber storage, email or
Telegram collection. If real challenge acceptance becomes measurable, first test whether the existing
native share link and open-table expiry explain the break; only repeated missed accepted challenges
could justify an explicit opt-in notification design.

The related Chess audit found a narrower distribution bug in the artifact Dasha already owns. A URL
containing both valid `challenge` and `tournament` parameters was interpreted differently at its two
boundaries: the Worker selected tournament metadata while the browser selected the challenge. A shared
link could therefore preview one object and open another. Replay already had highest priority and
canonicalized its URL. The prepared fix gives challenge the same precedence over tournament in the
Worker and replaces a successfully loaded mixed challenge URL with the exact challenge URL in the
browser. Worker and 320 px browser regressions prove preview, visible gate and address bar identify the
same challenge. No router, redirect, parameter library or new control was added.

[^tiplink]: [TipLink — links that transfer funded wallets](https://docs.tiplink.io/)
[^guild-how]: [Guild — Requirements, Roles and Rewards](https://docs.guild.xyz/guild/how-guild-works)
[^guild-use]: [Guild — token gates, quests and sybil requirements](https://docs.guild.xyz/guild/main-use-cases)
[^dialect-alerts]: [Dialect — wallet notification infrastructure](https://docs.dialect.to/alerts/index)
[^dialect-start]: [Dialect — opt-in alert setup](https://docs.dialect.to/alerts/quick-start)

## 22:05 PDT Base distribution reset and complete route validation

Base's distribution model materially changed after the earlier Farcaster survey. Its current migration
guide says that after April 9, 2026 the Base App treats apps as standard web apps, ignores Farcaster
manifest semantics, replaces FID identity with wallet address plus SIWE, and moves discovery to Base.dev
metadata and builder codes.[^base-migrate] Its notification API is likewise Base-App-only and exposes
the opted-in audience as Ethereum wallet addresses.[^base-notify] The public launch frames the product
as a tokenized social/trading feed with quick buys, copy trading, creator/post coins and rewards.[^base-app]

This supersedes the earlier Base-specific assumption that Dasha should eventually ship a Farcaster
manifest wrapper. The durable part of that research is the standard web artifact: exact challenge,
replay and bracket URLs that load well in any in-app browser. Dasha's identity is X, its asset and
holder proof are Solana-native, and it has no Base contract or SIWE need. Do not add a Farcaster
manifest, MiniKit, wagmi, viem, Base Account, spend permission, builder code, creator/post coin,
copy-trade surface or Base wallet-address notification store. Base.dev registration remains a possible
distribution experiment only if its current review accepts a Solana-native standard web app and actual
Chess use warrants another channel; registration is an external action, not a code prerequisite.

The route audit then closed the remaining sibling of the mixed-link bug. The Worker validates every
object ID against `[A-Za-z0-9_-]{6,24}` before applying replay → challenge → tournament precedence, but
the browser previously accepted any nonempty value. `?game=x&challenge=<valid>` therefore previewed
the challenge and rendered an unavailable one-character replay. One client helper now applies the
same validation to game, challenge and tournament lookup. A 320 px regression proves an invalid
higher-priority game plus valid challenge/tournament still lands on—and canonicalizes to—the challenge.
No router or dependency was introduced.

[^base-migrate]: [Base — migrate to a standard web app](https://docs.base.org/apps/guides/migrate-to-standard-web-app)
[^base-notify]: [Base — wallet-address notification API](https://docs.base.org/apps/technical-guides/base-notifications)
[^base-app]: [Base — the Base App is open globally](https://blog.base.org/baseapp)

## 22:30 PDT capital formation is not retention

Newer community-capital products increasingly turn reputation into financial access. Legion scores
onchain history, social presence, development and community contribution to prioritize oversubscribed
sale allocations; its guidance also treats post-allocation holding, staking, use and selling behavior
as reputation inputs.[^legion-score][^legion-guide] Kaito Capital Launchpad similarly uses social and
onchain reputation, holdings, historical alignment and conviction to assign allocations.[^kaito-capital]
Echo Sonar is self-hosted primary-sale infrastructure with KYC/KYB, wallet screening, purchase permits,
settlement and refunds.[^echo-sonar] Believe's current Flywheel API offers multisig-controlled burn and
airdrop actions, with buyback and lock actions marked as forthcoming.[^believe-flywheel]

These mechanisms address new issuance, fundraising or operator-controlled token reserves. Dasha is an
already-liquid canonical mint with revoked mint/freeze authorities and no demonstrated project treasury,
fee wallet or inventory control. A sale, allocation score, burn, buyback, lock or airdrop UI would either
require assets and authority the project has not proved, create a second issuance, or reward financial
behavior. Do not build any of them. Do not score holding duration, selling, staking, wallet history,
investment “conviction,” social reach or purchase size on the Simp Board. Genuine quiz knowledge and
bounded editorial attribution for original/OSS work remain recognition, not allocation priority.

The sustainable demand hypothesis stays product-led and falsifiable: people may voluntarily acquire
the existing coin to use a holder utility they value, but the product must be worthwhile without a
promised market intervention. Measure Chess entry and completed play; improve the first disclosed
friction; publish portable artifacts people choose to share. No code can honestly guarantee buy pressure
or reduced selling, and engineering a penalty for selling would undermine the project's trust boundary.

The final URL-lifecycle check also removed malformed object state after it was safely ignored. The
browser now deletes only invalid `game`, `challenge`, and `tournament` parameters while retaining
unrelated attribution such as `utm_source`. A mobile regression proves `?game=x&utm_source=x` becomes
the ordinary Chess page at `?utm_source=x`, so a fake object identity cannot be copied forward.

[^legion-score]: [Legion — reputation-based sale allocation](https://legion.cc/for-investors)
[^legion-guide]: [Legion — value-add and post-allocation score guidance](https://help.legion.cc/en/articles/13566228-how-to-boost-your-legion-score-the-only-guide-you-need)
[^kaito-capital]: [Kaito — Capital Launchpad FAQ](https://faq.yaps.kaito.ai/)
[^echo-sonar]: [Echo — Sonar community sale infrastructure](https://docs.echo.xyz/)
[^believe-flywheel]: [Believe — Flywheel API](https://docs.believe.app/api-reference/introduction)

## 21:05 PDT Solana Mobile distribution audit

Solana Mobile now supports Mobile Wallet Adapter from Android Chrome web apps and PWAs, with Phantom,
Solflare, and Seed Vault Wallet listed as compatible local wallets. The support boundary is exact:
Android Chrome works; other Android browsers and iOS web do not. Its current UX guidance also requires
connect and sign-in to remain inside the initiating user action.[^mwa-web][^mwa-ux]

That does **not** make an ordinary web URL eligible for the Solana dApp Store. Store submission still
requires a signed APK. Solana Mobile's documented web route is a PWA manifest wrapped by Bubblewrap as
a Trusted Web Activity, a durable signing key, Digital Asset Links on the website, publisher KYC/KYB,
an App/Release NFT, and review.[^mobile-pwa-apk][^mobile-submit] Every update must retain the signing key
and increment its Android version.[^mobile-updates]

Current Dasha is not that package. Its only repository web manifest belongs to the archived Eat the
Sounds game and is out of scope; Dasha has no Android project, Bubblewrap output, Digital Asset Links,
or Dasha manifest. Chess and the Simp Board use injected browser-wallet objects with a Phantom in-app
browser fallback. That fallback is useful on mobile but is not generic MWA support in Android Chrome.

The larger prerequisite is trust, not packaging. Store policy requires transparent user-data handling,
account/data deletion, and—when an app exposes UGC—in-app reporting, moderation, and blocking.[^mobile-policy]
Wrapping the whole Dasha site today would pull the Lobby's UGC and X/wallet identity surfaces into that
review scope without proving those controls or meaningful Android demand.

**Decision:** do not add a decorative Dasha manifest, service worker, Bubblewrap dependency, APK,
keystore, or store listing yet. First measure real Android Chess/holder-proof use and validate the
existing Phantom handoff. If usage justifies the channel, the smallest honest lane is a narrowly scoped
Chess PWA/TWA with generic MWA, explicit privacy/deletion behavior, policy-complete UGC boundaries, and
release-key custody designed before build. This is a distribution milestone, not a token reward or
trading-pressure mechanic.

[^mwa-web]: [Solana Mobile — MWA for Web Apps](https://docs.solanamobile.com/get-started/web/apps)
[^mwa-ux]: [Solana Mobile — Mobile Wallet Adapter UX Guidelines](https://docs.solanamobile.com/get-started/web/ux-guidelines)
[^mobile-pwa-apk]: [Solana Mobile — Publishing a Web App on the dApp Store](https://docs.solanamobile.com/recipes/general/publishing-a-web-app)
[^mobile-submit]: [Solana Mobile — Submit a New App](https://docs.solanamobile.com/dapp-store/submit-new-app)
[^mobile-updates]: [Solana Mobile — Publishing subsequent dApp releases](https://docs.solanamobile.com/dapp-store/publishing_releases)
[^mobile-policy]: [Solana Mobile — Publisher Policy](https://docs.solanamobile.com/dapp-store/publisher-policy)

## 21:25 PDT playable-link distribution and native replay sharing

Farcaster Mini Apps are a closer distribution primitive for Dasha Chess than Solana Blinks. A Mini App
URL can render a feed card, launch the exact application route, be discovered in Mini App stores, and
use an embedded Solana wallet through Wallet Standard.[^fc-share][^fc-solana] A replay or challenge is
already a canonical URL-shaped artifact, so the conceptual loop is clean: see table in feed → open exact
table → play or replay → share another exact table.

The integration is not one metadata tag. Current Farcaster publishing requires a stable exact domain,
an account-associated manifest at `/.well-known/farcaster.json`, valid 3:2 embed imagery on every
shareable entry point, and a runtime `sdk.actions.ready()` call or the app can remain behind its splash
screen.[^fc-publish][^fc-loading] Dasha also needs to choose whether `lobby.getdasha.com` is a durable app
identity before signing it. Adding `fc:miniapp` alone would create a card that advertises a runtime the
page does not yet implement.

Solana Actions/Blinks solve a different problem: a URL describes a transaction or authentication
message for a wallet to sign.[^solana-actions] Chess moves, replays, and challenges are server-owned game
state, not onchain transactions. Turning them into Actions would add signing friction and falsely imply
onchain gameplay. Do not build a move Blink, wager, replay mint, or trade action.

The audit did expose a smaller existing mobile defect. Replay native sharing supplied the canonical URL
twice: once inside `text` and again through the Web Share API's `url` field. Share targets may concatenate
both. The prepared client now keeps the URL only in the native `url` field while retaining the complete
text-plus-URL payload for the X intent fallback. Exact-ply links, generated share image, analytics
handoff, and user-activation timing are unchanged; mobile regressions cover finished games and exact
replay positions.

**Decision:** keep Farcaster as an evidence-triggered, narrowly scoped Chess distribution lane. Before
implementation, prove Farcaster audience fit and settle stable domain ownership; then add the signed
manifest, SDK readiness, dynamic replay/challenge embeds, and integrated Solana holder proof as one
testable slice. Do not ship a partial embed or mix it with financial rewards.

[^fc-share]: [Farcaster — Sharing your Mini App](https://miniapps.farcaster.xyz/docs/guides/sharing)
[^fc-solana]: [Farcaster — Interacting with Solana wallets](https://miniapps.farcaster.xyz/docs/guides/solana)
[^fc-publish]: [Farcaster — Publishing your Mini App](https://miniapps.farcaster.xyz/docs/guides/publishing)
[^fc-loading]: [Farcaster — Loading your Mini App](https://miniapps.farcaster.xyz/docs/guides/loading)
[^solana-actions]: [Solana — Actions and Blinks](https://solana.com/developers/guides/advanced/actions)

## 20:45 PDT distribution is a complete object, not another homepage section

The newest primary-source product evidence separates reusable distribution primitives from financial
mechanics Dasha should reject. Farcaster Mini Apps compress discovery, signed-in use, saving, sharing,
notifications, and transactions into a one-click social container.[^farcaster-miniapps] Paragraph's
2026 product now exposes publishing, search, subscribers, analytics, paid files, APIs, CLI, MCP, and an
agent marketplace; its own history also includes post coins and support-ranked discovery.[^paragraph-ai][^paragraph-coins]
Solana's June consumer roundup highlights repeatable games and occasions—WSOP entries, card packs,
fantasy modes, matches, tournaments, and mobile distribution—rather than a generic community feed.[^solana-june]

The transferable pattern is a **complete public object with one next action**: a Chess replay returns
to Play or its bracket; a bracket exposes its matches; a Studio export resolves to Studio; a quiz card
resolves to the quiz. The non-transferable pattern is making every object tradable, rewarding posts or
referrals, ranking people by financial activity, or adding another wallet/feed/subscription layer.
Those mechanics increase attribution, gaming, moderation, and trust costs without proving durable
participation.

A fresh source audit found no structural homepage orphan: Home links Studio, quiz/Simp Board, Chess,
Lobby, Desk, buying guidance, the mint, and open-source contribution through crawlable controls. That
does **not** prove practical discoverability; Webflow Analyze could have supplied behavioral evidence,
but its OAuth connection was expired during this audit. Therefore no new homepage shelf, nav item, or
copy block is justified yet. The next evidence is route-level use and existing click intent after
analytics access returns—not an extra section built from guesswork.

The Chess implementation audit reached the same result. Current local code already includes public
recent rated replays, exact-ply URLs, manual and keyboard replay navigation, image/native/X sharing,
PGN, direct challenges, rematches, ratings, tournaments, mobile layouts, clock reconciliation, and
ambiguous-response recovery. Focused engine, Worker, and responsive-browser suites all passed. Adding
autoplay, puzzles, leagues, another clock, rewards, or broadcasts now would be speculative interface
and operational weight. The product gap is observed participation, not another control.

This preserves the responsible economic boundary: useful recurring access and shareable cultural
artifacts may make holding more attractive voluntarily, but the project should never promise price
support, impede selling, manufacture activity, or reward buying, trading, referrals, shares, balance,
or holding duration.

[^farcaster-miniapps]: [Farcaster — Mini Apps](https://miniapps.farcaster.xyz/)
[^paragraph-ai]: [Paragraph — Paragraph is now AI-native](https://paragraph.com/%40blog/paragraph-is-ai-native)
[^paragraph-coins]: [Paragraph — Introducing Coins](https://paragraph.com/%40blog/coins)
[^solana-june]: [Solana Foundation — Ecosystem Roundup: June 2026](https://solana.com/news/solana-ecosystem-roundup-june-2026)

## 21:05 PDT curated recurrence and clean challenge transitions

Solana Mobile's July 2026 discovery update makes the retention problem explicit: after crossing one
thousand apps, its challenge shifted from getting apps shipped to helping people find useful ones and
turning downloads into everyday habits. Its smallest response is a weekly four-app themed Spotlight
with context and reviews, not an infinite new feed.[^solana-spotlight] The latest Mobile Hackathon also
leans heavily toward short multiplayer games, duels, card games, and playable social surfaces.[^solana-mobile-winners]

For Dasha, the transferable idea remains a bounded recurring occasion using existing objects. If real
game volume crosses the already documented threshold, one weekly featured replay position or holder cup
could create a legible return reason. Until then, automatic weekly content, prizes, reward emissions,
trading predictions, and a curation system would manufacture an empty ritual and add operations before
demand. The current recent-replay shelf is the correct discovery primitive to measure first.

The accompanying Chess transition audit found a smaller present-tense defect. Accepting a direct
challenge returned a valid game and cleared challenge state, but the Play panel retained the stale
challenge card because that success branch did not rerender it. The prepared client now calls the
existing tournament renderer before drawing the game. A 390px browser regression accepts an eligible
challenge, verifies all 64 squares, proves the challenge card disappears, and proves the normal Play
panel returns. No new component, state, control, request, or dependency was added.

The sibling creator path required the same state boundary. When polling learned that an invite had
been accepted, the creator loaded the new game but retained the accepted challenge object and query
parameter. That kept `Table claimed` in the Play panel and made a refresh re-enter obsolete invitation
resolution. The prepared client now clears challenge state and the query only after the authoritative
identity read actually returns the game, then reuses the same renderer. Existing mobile polling
coverage now proves the creator sees the board, the ordinary Play panel, and a clean URL.

The terminal-state audit then found the same deep-link invariant in tournament cancellation. The
authoritative response removed a cancelled cup from client state, but its `?tournament=` parameter
survived. Refreshing the now-normal Play panel therefore resolved a dead object and showed an avoidable
unavailable state. Successful cancellation now clears only that obsolete query through the existing
history API before the ordinary identity refresh. A mobile organizer regression proves the open Play
panel, clean URL, and absence of a false unavailable message. Missing or externally cancelled deep
links still retain their explicit unavailable state.

[^solana-spotlight]: [Solana Mobile — 1,000+ dApps, Smarter Discovery, and a Bigger Seeker Season](https://solanamobile.com/blog/1-000-dapps-smarter-discovery-and-a-bigger-seeker-season)
[^solana-mobile-winners]: [Solana Mobile — Hackathon Winners](https://solanamobile.com/blog/solana-mobile-hackathon-winners-announced)

## 22:25 PDT fee-routing products are not Dasha product evidence

The 2026 launcher market has moved beyond one creator wallet. Bags requires an explicit fee-share
configuration and supports up to one hundred recipients identified through social accounts or wallets;
its post-migration modes can also compound part of each trade fee into liquidity.[^bags-launch-2026][^bags-config-2026]
Pump's May 2026 schedule assigns creator, protocol, and LP portions to canonical PumpSwap activity, and
its terms permit multi-wallet routing, charity routing, cashback launch modes, and platform-
discretionary community takeovers of creator-fee and admin rights.[^pump-fees-2026][^pump-terms-2026]

These are genuine product primitives for tokens launched or administered through those systems. They
do not establish that the Dasha operator controls this mint's deployer wallet, creator-fee destination,
canonical pool, or CTO eligibility. Existing finalized evidence instead shows immutable metadata,
revoked mint/freeze authorities, a Pump update authority, and no demonstrated operator token control.
Therefore the website must not imply fee revenue, community treasury rights, buybacks, compounding,
cashback, contributor revenue share, or control of liquidity.

The no-pivot decision is stronger than “not yet.” Relaunching Dasha on Bags or creating a second token
to gain configurable fees would split the canonical identity and whatever liquidity and recognition the
existing mint has. Applying for a Pump CTO could be investigated as an external governance/finance
operation only after exact eligibility, proposed recipient control, accounting, legal treatment, and
public authority are established; it is not a website feature and no application is authorized here.
Even if obtained, creator fees are an uncertain consequence of third-party trading, not evidence that
product use caused demand or that value will accrue to holders.

The transferable idea is non-financial: make contribution roles and artifact provenance explicit.
Dasha already has GitHub contributions, quiz identity, Chess ratings, replays, and tournament brackets.
Recognizing authorship in those first-party objects preserves social credit without promising fee
shares, rewarding trades, or making contribution status depend on wallet balance.

[^bags-launch-2026]: [Bags — Launch a Token](https://docs.bags.fm/how-to-guides/launch-token)
[^bags-config-2026]: [Bags — Customize Token Fees](https://docs.bags.fm/how-to-guides/customize-token-fees)
[^pump-fees-2026]: [Pump — Fees, updated May 20, 2026](https://pump.fun/docs/fees)
[^pump-terms-2026]: [Pump — Terms: Creator Fees and Community Takeovers](https://pump.fun/docs/terms-and-conditions)

## 22:45 PDT online draw-rule completeness

FIDE distinguishes over-the-board claims from automatic online adjudication. Its Online Chess
Regulations require the playing zone to declare a draw automatically on the third occurrence of the
same position, stalemate, a position where neither side can checkmate by any legal series, and fifty
moves by each side without pawn movement or capture.[^fide-online-draws] That is precisely the model
Dasha uses; changing to fivefold repetition or seventy-five moves would incorrectly import the
over-the-board automatic fallback into this virtual playing zone.

The implementation audit verified the entire state chain rather than matching reason strings. The
initial position is counted; repetition identity includes side to move, castling rights, and only a
legally available en-passant target; pawn moves, captures, and en passant reset the halfmove clock;
threefold and the hundredth halfmove settle automatically; stalemate and dead positions terminate;
the complete state persists with each game. Existing unit regressions cover legal and irrelevant
en-passant identity, a full threefold cycle, the fifty-move boundary, insufficient material, and
timeout/resignation mating-material asymmetry. The independent `chess.js` oracle and deep perft work
remain complementary evidence for move legality.

No new claim button, arbiter flow, fivefold counter, seventy-five-move branch, rule copy, or dependency
is warranted. The page already states its 10+5 online format and reports the exact completion reason.
The product improvement in this pass is confidence: recurring holder Chess is less likely to trap a
session or mis-settle a rating than an added mode would make it more attractive.

[^fide-online-draws]: [FIDE Online Chess Regulations — Article 5.4](https://handbook.fide.com/chapter/OnlineChessRegulations)

## 19:50 PDT attention is an input, not a product outcome

The newest AttentionFi products make the category's central tension unusually explicit. ChainGPT's
own documentation says airdrop hype can end in token dumps, KOL campaigns can produce poor ROI, and
social noise can fail to create onchain adoption; its proposed answer is AI-scored reach, engagement,
staking boosts, missions, and rewards.[^chaingpt-attention] Kaito similarly scores crypto relevance,
reputation-weighted engagement, and discussion quality, then adds referral points, social cards, and
wallet lists that may be shared with reward partners.[^kaito-yaps] These are useful comparables, but
they do not prove that a scoring model can reliably distinguish cultural value from behavior optimized
for the score.

The stronger evidence points away from copying that machinery. A Farcaster study found participation
under plural token incentives alongside extreme wealth concentration and no simple equivalence between
activity and a healthy community.[^farcaster-incentives] An experiment on social-ranking interfaces
found that lower placement reduced engagement by roughly 40 percent even when content was identical,
while rank and social proof did not significantly change perceived relevance, trust, or quality.[^ranking-effects]
X's published policy treats bulk, aggressive, or deceptive engagement as platform manipulation and can
limit its visibility.[^x-spam] Attention metrics are therefore distribution observations, not evidence
of quality, product demand, or sustainable token demand.

For Dasha, reject yap-to-earn, engagement-ranked Simp Points, impression bounties, staking multipliers,
wallet-weighted status, auto-posting, and rewards for buying, holding, trading, or referring buyers. Keep
the existing author-controlled share actions. The product loop is narrower and more defensible:
current holder proof unlocks useful Chess participation; play creates a complete replay, PGN, bracket,
or result card; public visitors can inspect that artifact; sharing hands control to the user; aggregate
measurement distinguishes intent from browser/native handoff without claiming that a post occurred.
Any voluntary demand benefit is an indirect consequence of recurring utility and trust, never a price
promise or an attempt to impede selling.

The measurement audit found one concrete implementation consequence. Event-count quotients are not
cohorts: the same replay can be opened or shared from several sessions, so a numerator can legitimately
exceed its denominator. The prepared public funnel now suppresses such non-comparable ratios instead of
emitting more than 100 percent, clamping the value, or failing the live audit. Raw thresholded event
cells remain available. `replayShareIntents` and `replayShareHandoffs` stay separate, and neither is
called a post, impression, conversion, or successful share.

[^chaingpt-attention]: [ChainGPT — AttentionFi](https://docs.chaingpt.org/our-ecosystem/buzz-by-chaingpt/attentionfi)
[^kaito-yaps]: [Kaito — Yap FAQs](https://faq.yaps.kaito.ai/support/yap-faqs)
[^ranking-effects]: [Huszár et al. — The Effect of Content Ranking and Social Proof on Engagement and Perception](https://arxiv.org/abs/2509.18440)
[^x-spam]: [X — Global Transparency Report H2 2024, Platform Manipulation and Spam](https://transparency.x.com/content/dam/transparency-twitter/2025/x-global-transparency-report_h2_2024.pdf)

## 20:05 PDT product evidence needs an abuse boundary

The Chess mutation path already has the right small-system reliability shape: one Durable Object owns
the state, request versions reject stale positions, repeated settlement is idempotent, a lost response
recovers through the authoritative game read, and tests cover a move crossing the server-clock boundary.
Cloudflare confirms that an individual Durable Object is single-threaded, while also warning that
`async` work can interleave and that one global object is not a general-purpose global rate limiter.[^do-rules]
The existing design is appropriate for current observed scale; WebSockets, sharding, queues, and another
game service remain unjustified.

The adjacent evidence path was weaker. Any script able to send a permitted Origin header could submit
unlimited anonymous Chess events, inflate thresholded counts, and distort the roadmap. Origin validation
is a browser boundary, not proof that telemetry is human or organic. The prepared Worker now allows at
most 60 valid Chess events per minute per linked X identity. Anonymous traffic falls back to the
Cloudflare-supplied client address; Cloudflare documents `CF-Connecting-IP` as the edge-to-origin client
address but cautions that IPs may represent shared mobile or privacy networks.[^cf-ip][^cf-rate]
Accordingly, the ceiling is deliberately generous, the address stays only in the existing ephemeral
in-memory rate map, and linked users never inherit a shared-network bucket.

This is damage containment, not attribution. Distributed scripts can still create events, and none of
these counters prove a unique person, a post, a purchase, price causality, or sustainable demand. The
change prevents one client from cheaply manufacturing the evidence used to decide whether Chess needs
activation work or distribution work. It does not justify attention rewards, buy incentives, sell
friction, or claims that product usage supports price.

[^do-rules]: [Cloudflare — Rules of Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/)
[^cf-ip]: [Cloudflare — HTTP headers: CF-Connecting-IP](https://developers.cloudflare.com/fundamentals/reference/http-headers/#cf-connecting-ip)
[^cf-rate]: [Cloudflare — Workers Rate Limiting best practices](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)

## 20:30 PDT clock display must measure duration, not compare clocks

The Worker returns each active side's remaining duration already adjusted at the authoritative server
timestamp. The browser then subtracted that server timestamp from the device's wall clock. Those epochs
look comparable but are not synchronized: a phone clock set ahead could show an immediate false flag,
and a backward adjustment could add apparent time. The Worker would still adjudicate correctly, but the
player-facing board could be wrong and could issue an unnecessary expiry refresh.

High Resolution Time defines `performance.now()` against a monotonic clock that cannot move backward
or change with system clock adjustments; it also recommends durations, rather than wall-clock moments,
for this kind of measurement.[^hr-time] Chrome's lifecycle guidance says hidden pages may be frozen and
should stop invisible updates.[^page-lifecycle] The prepared client therefore anchors the received
remaining duration to `performance.now()` and measures only foreground elapsed duration. The existing
visibility handler still stops the interval while hidden and immediately reloads authoritative state
when foregrounded, so browser suspension does not become clock authority.

A browser regression moves `Date.now()` forward by a full day after the board loads and proves that the
visible clock does not jump to zero. Existing tests still cover actual local expiry, one bounded server
adjudication read, explicit offline quiescence, foreground refresh, server-side timeout, delayed request
bodies, ratings, and tournament continuation. No clock synchronization protocol, worker timer, socket,
or client-side result logic was added.

[^hr-time]: [W3C — High Resolution Time Level 3](https://www.w3.org/TR/hr-time-3/)
[^page-lifecycle]: [Chrome for Developers — Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)

## 20:55 PDT reconcile an ambiguous move before accepting another

HTTP defines POST as non-idempotent by default and says a client should not automatically retry after
a communication failure unless the application knows the operation is idempotent or can determine
whether the original request was applied.[^http-idempotency] Cloudflare gives the same boundary for
Durable Object errors: retry only idempotent operations, and do not amplify overload.[^do-errors]

Dasha's server already makes a duplicate move harmless: each mutation carries the position version,
the Durable Object serializes requests, and a successfully applied move makes the old version stale.
The browser also correctly chose an authoritative `GET /chess/me` after a failed POST instead of blindly
repeating it. The remaining gap was a short client race: `busy` became false before that recovery read
finished, so another tap could submit the stale move while reconciliation was in flight. It would be
rejected rather than applied twice, but it added traffic and made an already ambiguous moment noisier.

The prepared client now retains its input lock through the complete recovery read. A 390-pixel browser
regression simulates the important case—the Worker commits `e2–e4`, the response is lost, and the player
taps again while the recovery read is deliberately delayed. Exactly one move POST occurs, exactly one
authoritative read follows, and the board resolves to Anna's turn with Dasha's pawn on e4. There is no
automatic POST retry, idempotency store, offline move queue, optimistic board fork, or new UI control.

[^http-idempotency]: [RFC 9110 §9.2.2 — Idempotent Methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
[^do-errors]: [Cloudflare — Durable Objects error handling](https://developers.cloudflare.com/durable-objects/best-practices/error-handling/)

## 21:15 PDT one ambiguous-action recovery rule

The lost-response risk was not move-specific. Resignation, draw offer or acceptance, and rematch are
also state-changing POSTs. Their prior failure handlers displayed the transport error and immediately
unlocked the control without reading authoritative state. If the Worker had already committed a
resignation, the browser could continue to display an active board; a lost rematch acceptance could
leave the player on the finished predecessor game.

The prepared client now applies one rule to every game mutation: never repeat the POST automatically;
read the exact game resource; follow an existing `rematchGameId` through the normal identity read; then
unlock input. This reuses the existing version, game, and settlement authority rather than adding
operation IDs or a client queue. A static regression pins all four handlers—move, resign, draw, and
rematch—to the shared recovery function. A 390-pixel browser regression also commits a resignation,
drops its response, and proves exactly one POST followed by a finished board with the Resign control
gone. The earlier committed-move/lost-response case now uses the narrower exact-game read as well.

This is a product-quality improvement with indirect retention value: a holder-gated game that visibly
disagrees with its server destroys trust faster than another feature creates it. It is not a token-price
mechanism, holding incentive, or reason to add paid retries, streak protection, or financial rewards.

## 21:35 PDT uncertainty should preserve evidence, not invent state

The unified game-action read introduced one remaining failure branch: if both the mutation response and
the exact-game recovery response were lost, the generic reader fell through to `/chess/me`; if that
transport also failed, the page replaced the known board with a generic unavailable gate. That lost
useful local evidence without gaining any server truth.

The prepared reader now distinguishes no HTTP response (`status === 0`) from an authoritative error.
During ambiguous-action reconciliation only, a transport failure preserves the last known board and
the visible `Network unavailable` status. Any real HTTP response still follows the normal identity/game
recovery path. No result is guessed: controls reflect the last verified position until the existing
online event reloads authoritative state.

A 390-pixel browser regression commits resignation, drops both the POST response and exact-game read,
and proves the board remains visible, Resign remains visible, and no second failing identity read hides
the game. After simulated reconnect, the ordinary lifecycle reload reveals the committed finished
result. This is a fail-visible uncertainty state, not offline play, cached authority, or a pause.

## 02:30 PDT shipped artifacts before incentive mechanics

The latest public funnel has nine Chess page-open events while every downstream Chess cell remains
below the five-event disclosure threshold. That is evidence of a small observed audience, not evidence
that any particular gate, mode, or control is failing. It cannot justify puzzles, prizes, another time
control, a public activity feed, or token-weighted status. The prepared challenge, tournament, replay,
PGN, rating, and native-share paths are already the smallest coherent product loop; publish and observe
them before adding another visible surface.

Fresh ecosystem evidence points in the same direction. Solana's May showcase emphasized consumer
products with existing users, revenue, or physical-world utility, while a16z's current product and
communications essays explicitly distinguish demonstrated product-market fit from token or airdrop
activity and describe a market that now expects working product evidence.[^solana-accelerate-2026][^a16z-pmf-2026][^a16z-show-me]
The transferable pattern for Dasha is therefore a public artifact people can inspect and reuse—a Chess
challenge, replay, bracket, PGN, Studio image, or quiz card—not a new financial promise.

The strongest recent empirical warning remains Farcaster's multi-token study: rewards increased some
creation and participation measures but often did not improve content quality, and measured wealth
concentration was extreme.[^farcaster-incentives-2025] Dasha should not manufacture buy pressure,
penalize selling, or pay for posts, referrals, likes, reach, or holding duration. Sustainable voluntary
demand can only be an indirect result of useful holder access, credible identity, recurring occasions,
and artifacts people actually choose to share. The cheapest discriminating check remains real
challenge acceptance and game completion after the prepared release is live.

The failed release also exposed a workflow defect independent of product demand: Webflow OAuth was
validated only after local preparation and gates, so an expired token consumed time and changed the
prepared asset identity before aborting. The shipper now performs a read-only token preflight before
any preparation for a real outbound run, and dry runs cannot stamp the context as shipped. This does
not bypass authentication or broaden publish authority; it makes failure earlier and release state
truthful.

[^solana-accelerate-2026]: [Solana — Accelerate USA 2026 recap](https://solana.com/news/accelerate-usa-recap)
[^a16z-pmf-2026]: [a16z crypto — Three product-market-fit patterns working in crypto](https://a16zcrypto.com/posts/article/product-market-fit-3-patterns-working-in-crypto-today)
[^a16z-show-me]: [a16z crypto — Welcome to the “Show Me” era](https://a16zcrypto.com/posts/article/show-me-era-in-communications-crypto)
[^farcaster-incentives-2025]: [Yang et al. — Beyond Single-Tokenomics](https://arxiv.org/abs/2511.00827)

## 04:10 PDT one identity, many artifacts

An expanded isolated rules-oracle run compared the first-party engine with `chess.js` 1.4.0 across 60
deterministic random games and 7,010 positions/plies. Complete legal-move sets, selected-move SAN, and
terminal state matched at every sampled position. The package remains temporary audit infrastructure,
not a production or repository dependency. Combined with canonical perft and focused rule tests, this
supports leaving the engine architecture alone while continuing to audit server lifecycle boundaries.

That lifecycle audit found a real asymmetry: the five-minute alarm pruned matchmaking, challenges, and
clocks but did not expire a 24-hour tournament registration unless another Chess request arrived. The
shared alarm now expires and persists stale registrations. There is no new control, timer, transport,
or public data field.

Zora's 2026 creator model gives every profile one creator coin while individual posts remain linked
artifacts; its product changelog also emphasizes exact-match search, rich link previews, compact
activity, and external-link cards.[^zora-creator-coin][^zora-updates] Paragraph combines one publication
identity with portable posts, recommendations, search, subscriptions, remix lineage, and access
gating.[^paragraph-docs] Dasha already has the strategically cleaner equivalent: one existing coin and
many nonfinancial artifacts—images, quiz cards, Chess challenges, brackets, PGNs, and replays. Do not
create a coin per artifact, a second token, P&L card, holder leaderboard, or trade feed. The useful
transfer is better canonical previews and cross-artifact navigation after real artifact volume exists.

[^zora-creator-coin]: [Zora — Understanding Creator Coins](https://support.zora.co/en/articles/6316801)
[^zora-updates]: [Zora — Platform updates](https://support.zora.co/en/articles/4641857)
[^paragraph-docs]: [Paragraph documentation](https://paragraph.com/docs)

## 04:40 PDT discovery from complete objects, not follower count

Solana's June ecosystem report highlights consumer traction around completed matches, collectible
pulls, cards, and cultural objects; one game product reports both match and sales counts rather than a
token-only narrative.[^solana-june-2026] Farcaster's current mini-app discovery explicitly tries to
surface new launches without requiring a large existing following, while its platform documentation
centers one-click entry, saveable apps, and a return notification when there is something new to
do.[^farcaster-discover][^farcaster-miniapps] X Web Intents remain a mobile-friendly, author-controlled
handoff and do not require Dasha to store posting credentials.[^x-intents]

The weakest common product pattern is not “build a feed.” It is: make one complete object, give it a
canonical URL and preview, let a viewer enter in one step, and provide a truthful reason to return.
Dasha already has those objects in challenge links, completed replays, brackets, PGNs, quiz result
cards, and Studio exports. Recent rated replays are the small audience-independent discovery shelf.
Do not add follower-ranked discovery, auto-posting, notifications, or another mini-app codebase until
measured replay entry and return use exist.

The Chess audit found one state invariant that could undermine direct invitations: the queue scrubber
excluded tournament members but not an open challenge creator. Normal creation removes that creator
atomically, but legacy or stale persisted queue state could still let another player match the creator.
The shared scrubber now removes both reserved states, and a regression injects the stale row directly.

[^solana-june-2026]: [Solana — Ecosystem Roundup, June 2026](https://solana.com/news/solana-ecosystem-roundup-june-2026)
[^farcaster-discover]: [Farcaster updates — automated mini-app discovery](https://farcaster.xyz/~/channel/fc-updates)
[^farcaster-miniapps]: [Farcaster Mini Apps](https://miniapps.farcaster.xyz/)
[^x-intents]: [X — Web Intents](https://docs.x.com/x-for-websites/web-intents/overview)

## 05:10 PDT valid action before more event machinery

Current Chess.com product documentation separates shareable tournaments from club events and presents
the valid join action beside current state and player count.[^chess-shareable-tournaments] Its 2026
community-league documentation also makes clear that leagues require organizers, teams, scheduling,
and varied formats rather than being a cosmetic wrapper around one bracket.[^chess-community-leagues]
Event-hosting guidance adds schedules, standings, broadcasts, and timezone handling.[^chess-events]

Dasha does not yet have evidence for that machinery. It does have one concrete state mismatch: the
organizer saw an enabled Start control with one entrant although the server requires two. The page now
derives the control's disabled state from the already-public entrant count; it becomes enabled at two.
This removes a guaranteed failed action without adding prose, a modal, a setting, or client authority.
At current volume, one clean shareable cup is sufficient. Scheduling, leagues, teams, custom clocks,
prizes, broadcast tools, and official/fair-play claims remain unsupported.

The broader participation lesson remains conditional. Older large-scale game research found both
achievement and social relationships can correlate with retention at different player stages, not
that every small product needs a social graph or reward system.[^game-retention] Dasha should measure
completed games, accepted challenges, and repeat voluntary play before inferring a need for levels,
streaks, rewards, or friends infrastructure.

[^chess-shareable-tournaments]: [Chess.com — Create a live tournament](https://support.chess.com/en/articles/8609296-how-can-i-create-a-live-blitz-bullet-rapid-tournament)
[^chess-community-leagues]: [Chess.com — Join a Community League](https://www.chess.com/article/view/join-chess-league)
[^chess-events]: [Chess.com — Host an event](https://support.chess.com/en/articles/11525901-how-do-i-host-an-event-on-chess-com)
[^game-retention]: [Sifa et al. — Achievement and Friends: Key Factors of Player Retention](https://arxiv.org/abs/1702.08005)

## 05:40 PDT bracket capacity before recurring billing

A deterministic 16-seat tournament stress audit now exercises the complete knockout lifecycle: four
rounds, 15 decisive games, rating settlement, champion selection, 15 completed replay links, public
identifier minimization, and serialized storage size. It passed without a production change and stayed
below the existing one-megabyte migration trigger. This is bounded proof for one full cup, not a claim
about high-concurrency event hosting.

Solana's June 2026 Subscriptions & Allowances program is an audited shared primitive for recurring
billing and delegated spending.[^solana-subscriptions] That reduces infrastructure cost when a product
already has a recurring paid service; it does not establish that Dasha needs another charge. Paragraph's
membership and gating products similarly attach recurring payment to an explicit stream of newsletters,
files, content, or community benefits.[^paragraph-subscriptions][^paragraph-gating]

Dasha already asks for current ownership of the existing coin to enter Chess. A second subscription,
NFT membership, delegated allowance, paid tournament, or tier would split the access story and create
refund, fulfillment, disclosure, support, and cancellation obligations without evidence of repeat use.
The current product hypothesis is weaker and sufficient: one coin, current proof, free holder play,
public artifacts. Reconsider recurring billing only if a distinct recurring service with demonstrated
demand exists independently of the coin.

[^solana-subscriptions]: [Solana — Native Subscriptions & Allowances](https://solana.com/news/subscriptions-and-allowances)
[^paragraph-subscriptions]: [Paragraph — Recurring Subscriptions](https://paragraph.com/%40blog/recurring-subscriptions)
[^paragraph-gating]: [Paragraph — Metrics and section gating](https://paragraph.com/%40blog/metrics-and-gating)

## 01:15 PDT Chess recovery and bounded-input integrity

FIDE's online regulations make reconnection a continuation of the same server-authoritative game:
the clock continues while disconnected, and a player who returns before flagging resumes with the
remaining time.[^fide-online-reconnect] The prepared Chess bootstrap now treats a failed identity
lookup as a recoverable connection state rather than silently continuing as an anonymous visitor. It
shows one Retry action, suppresses challenge and tournament continuation until identity truth is
available, and restores the exact route after the connection returns without a page reload. Browser
coverage proves offline-to-online recovery on a 320px viewport.

The shared JSON boundary now enforces its 4 KiB limit against both the declared Content-Length and the
actual UTF-8 bytes received. A client that omits or understates the header cannot bypass the limit;
oversized or malformed input follows the existing 4xx invalid-input path and cannot partially mutate a
game. This is intentionally a small boundary repair, not a new transport layer. Cloudflare's current
guidance supports hibernating WebSockets for sustained high-frequency game traffic, but present use
does not justify replacing the simpler visible-page polling loop.[^cf-websockets]

[^fide-online-reconnect]: [FIDE — Online Chess Regulations, Article 11.4](https://handbook.fide.com/chapter/OnlineChessRegulations)

## 21:30 PDT portable social graphs versus portable artifacts

Two newer crypto-social product patterns sharpen Dasha's boundary without supporting another feature.
Tapestry offers a namespaced Solana social layer—wallet-linked profiles, follows, content, likes,
comments and feeds—and markets cross-app identity as a retention primitive.[^tapestry-quick][^tapestry-home]
Paragraph combines publish-once email and Farcaster distribution with recommendations, automated
messages and per-post ERC-20 markets.[^paragraph-home][^paragraph-coins] These are coherent products,
but importing either one would make Dasha own a second identity graph, feed and moderation surface or
create financial objects competing with the one canonical `$dasha` mint.

The weakest transferable primitive is already present: stable public artifacts that move through
ordinary links. Quiz cards, Studio exports, Chess challenges, brackets, PGN and exact-position replays
do not need follows, likes, post coins or wallet-linked activity feeds to travel. Keep X as the optional
public identity, keep Lobby as the single conversation surface, and keep the canonical coin separate
from artifact ranking. Do not add Tapestry, a newsletter platform, post/writer coins, paid boosts,
recommendation rewards, automated email, or another subscriber database without observed recurring
publishing and explicit subscriber demand.

The dated live funnel supports the no-build decision. At `2026-08-10T04:31Z`, Chess disclosed 11 page
opens while every downstream cell—link, enrollment, holder proof, queue, game, replay, challenge and
tournament activity—remained below the five-event public threshold. That does not prove zero activity;
it proves there is not enough disclosed evidence to choose among acquisition friction, holder scarcity,
empty matchmaking, or simple novelty traffic. The cheapest discriminating action remains observing the
existing ordered funnel after the prepared release, not adding a mode. If a downstream stage discloses,
repair the first adjacent conversion break; if completed games and replay opens disclose, then evaluate
one featured real position or scheduled cup. No trade, balance, holding-duration, referral or sharing
reward enters either branch.

[^tapestry-quick]: [Tapestry — Quickstart and namespaced social primitives](https://docs.usetapestry.dev/)
[^tapestry-home]: [Tapestry — cross-app profiles, follows, content, likes and comments](https://www.usetapestry.dev/)
[^paragraph-home]: [Paragraph — publishing, distribution and growth tools](https://paragraph.com/docs)
[^paragraph-coins]: [Paragraph — post-coin mechanics](https://paragraph.com/docs/earn/post-coins)
[^cf-websockets]: [Cloudflare — Durable Objects WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)

## 01:45 PDT portable sharing before another mode

The live privacy-thresholded funnel has nine Chess page opens; every later cell remains below five.
That is insufficient evidence for a puzzle mode, spectator feed, rewards program, or transport rewrite.
It is enough to audit the handoff already present. The completed-game Share path required both the Web
Share API and `navigator.canShare`; browsers capable of native text-and-URL sharing but unable to
declare image-file support were incorrectly sent to the X web composer.

The prepared client now preserves the strongest capability available: image plus exact replay URL when
file sharing is supported, native text and exact URL when it is not, and the existing X composer only
when native sharing is absent or genuinely fails. Cancellation still opens nothing. Direct browser
coverage proves both a missing `canShare` implementation and an explicit file rejection retain the
native sheet without an attachment.

The deeper audit found that image generation previously waited for asynchronous `canvas.toBlob()`
before calling `navigator.share()`. The Web Share specification requires transient user activation at
the share call, so a delayed encoder could make a supported native sheet fail after the click.[^web-share]
Card encoding now completes synchronously inside the click task after a cheap file-capability probe.
The image remains 1200×630 when supported; an encoder exception immediately uses native text and URL.
The browser regression records `navigator.userActivation.isActive` at the share boundary and proves it
is still true.

Measurement now preserves the same distinction. A tap remains a share intent; a separate anonymous
aggregate `handoff` is recorded only when the native share promise resolves or an X destination window
opens. It is not labeled a completed post, impression, person, conversion, or sale. Cancellation,
rejection, and blocked popups do not count, session storage deduplicates repeats, and the public cell
and intent-to-handoff ratio remain suppressed below five. This is the minimum evidence needed to judge
the distribution repair without installing third-party analytics or correlating identity with sharing.

This follows the portable-artifact pattern used by established chess products: Chess.com exposes game
links, PGN, GIF, and image sharing, while Lichess makes public PGN imports browsable and shareable.[^chess-share-2026][^lichess-import]
Fresh crypto products increasingly collapse feed, trading, payments, and earnings into one surface,
but that breadth is not evidence that Dasha needs another financialized feed.[^base-app-2026] The useful
transfer is lower-friction distribution of a real first-party object. Dasha should make replay,
challenge, quiz, and Studio artifacts travel well; it should not reward trades, posts, invitations, or
continued holding to manufacture activity.

[^chess-share-2026]: [Chess.com — share a game by link, PGN, GIF, or image](https://support.chess.com/en/articles/14463498-how-do-i-share-a-game-link-pgn-gif-or-image)
[^lichess-import]: [Lichess — import a public PGN as a browsable shareable game](https://lichess.org/paste)
[^base-app-2026]: [Base — Base App is open globally](https://blog.base.org/baseapp)
[^web-share]: [W3C — Web Share API](https://www.w3.org/TR/web-share/)

## 02:20 PDT one seat, one commitment

The tournament audit found that Chess treated only an active bracket as tournament participation.
Registration removed an entrant from casual matchmaking once, but the same entrant could immediately
queue again or open a public challenge before the cup started. Challenge acceptance would later fail
when the tournament became active, leaving a valid-looking invitation attached to an impossible seat.

The prepared Worker fixes the shared membership predicate: registration and active rounds both reserve
the player. Every existing caller now agrees—queue pruning, casual matchmaking, challenge creation and
acceptance, and rematches. Leaving registration releases the seat through the existing lifecycle. No
new lock, status, route, or UI control was added. The inverse transition is guarded too: a player with
an already-open challenge must cancel it before joining registration. Direct Worker tests prove both
orderings, so neither route can create conflicting public commitments.

This small state rule also matches the broader community evidence better than adding economic
incentives. A 2026 user-centered crypto-community study finds sustained engagement depends on balancing
social and technical interaction, distributed participation and guidance, and growth with authentic
community feeling.[^crypto-paradoxes-seat] Research on online forums likewise associates participation
with retention, but does not establish that financial rewards cause durable belonging.[^forum-retention]
For Dasha, clear shared occasions and trustworthy commitments are the transferable primitives. Do not
pay for attendance, impose holding streaks, punish exits, or infer demand from registrations.

[^crypto-paradoxes-seat]: [Paradoxes of Organising in Crypto Communities](https://sciety.org/articles/activity/10.31235/osf.io/qf2mr_v4)
[^forum-retention]: [Open University — online forum participation and retention](https://oro.open.ac.uk/108763/)

## 02:45 PDT publish replays, not live identifiers

The public tournament serializer exposed each match's current game ID while the game was live even
though Dasha Chess has no live spectator route and the bracket client only renders finished replay
IDs. The identifier was not an authentication secret, but publishing it created an unnecessary probe
surface and blurred the product rule that completed games become public artifacts while active play
remains participant-only.

The prepared response removes the current game ID entirely. A finished match still exposes every
bounded replay through the existing `replays` array, including drawn games followed by decisive
rematches. Internal tournament progression continues to use its private `currentGameId`. Tests prove an
active public bracket contains no `gameId`, while completed replay discovery and the bracket UI remain
unchanged.

Fresh token research reinforces why this kind of product truth matters more than trying to engineer a
price response. A 2026 diffusion study explicitly separates exchange-oriented and utility-oriented
token value, while an adoption-and-valuation preprint reports weak short-run links between usage and
price stability.[^token-diffusion][^adoption-valuation] A new Solana risk dataset also finds that
transaction, concentration, temporal, and bundled-account patterns are informative for high-risk
memecoin launches.[^memetrans] The responsible conclusion is not that product utility can promise buy
pressure. Dasha can improve voluntary demand through useful access, culture, and trustworthy public
artifacts; it cannot truthfully promise price, suppress selling, or manufacture market activity.

[^token-diffusion]: [The Differential Diffusion of Exchange and Utility Value Blockchain Tokens](https://faculty.essec.edu/research/16260-the-differential-diffusion-of-exchange-and-utility-value-blockchain-tokens/)
[^adoption-valuation]: [Discontinuous Adoption Dynamics and Token Valuation in Blockchain Platforms](https://www.preprints.org/manuscript/202603.1720)
[^memetrans]: [MemeTrans — detecting high-risk Solana memecoin launches](https://arxiv.org/abs/2602.13480)

## 03:10 PDT deeper legal-move proof

The engine already matched the canonical opening tree through depth four and three adversarial
positions through depth two. The continuation audit extended the two most demanding fixtures through
depth three: Kiwipete reaches exactly 97,862 leaf positions, and the rook-and-pawn fixture reaches
2,812.[^perft-tool] Together they exercise castling rights, attacked transit squares, pins, checks,
captures, promotions, and en passant across more than 100,000 additional generated continuations.
Every generated move is also replayed through the public move function, so the test checks generator
and executor agreement rather than counting pseudo-legal branches.

This is deliberately a correctness gate, not an engine-analysis feature. It adds no Stockfish,
evaluation bar, opening explorer, hint system, dependency, or visible control. At the current
distribution baseline, trustworthy standard chess is more valuable than presenting unsupported
analysis authority.

[^perft-tool]: [Zurichess perft reference results](https://pkg.go.dev/bitbucket.org/zurichess/tools/perft)

## 17:32 PDT live Chess funnel, public preview, and tap recovery

The live privacy-thresholded funnel now shows eight Chess page opens. Link, enrollment, holder-proof,
queue, buy, game, replay, challenge and tournament cells all remain below five. This directly rules
out claims about which access step is losing people: a hidden cell is unknown, not zero. The current
action is therefore distribution of the existing public route and exact artifacts, not a guessed OAuth,
wallet, rating or matchmaking rewrite.

Current creator products reinforce the public-preview/private-utility split. Paragraph supports a free,
indexable preview before a token-gated section and gives shared content native distribution controls;
its 2026 release adds small paid files without requiring an entirely gated publication.[^paragraph-gating]
Zora's current product gives creator coins full pages and rich link previews, and lets posts embed
external rich links.[^zora-current] These are evidence for making each Dasha replay, challenge, bracket,
quiz result and Studio export a legible public object that returns to the first-party product. They are
not evidence for coining every artifact, hiding the homepage, or gating culture before it can recruit.

Solana's 2026 consumer recap reports more than two million weekly active wallets, while examples that
reached distribution did so through existing consumer surfaces and integrations.[^solana-accelerate]
Dasha already has the cheaper relevant surface: the prepared homepage exposes Chess in navigation,
hero microcopy and footer, while public Chess deep links require no identity to inspect. Keep that
handoff, publish it only under an authorized synchronized release, and measure before adding a mobile
wrapper or paid campaign.

The accompanying Chess audit found a concrete touch problem independent of the sparse funnel. Tapping
the already-selected movable piece left it selected; mobile users had to tap an unrelated square to
cancel. The shared selection handler now treats a second tap on the same square as deselect. It redraws
through the existing renderer, clears legal and accessible destination state, and changes no legal
move, server, clock or identity behavior. Browser coverage exercises the toggle at 320, 390 and 1440
pixels.

[^paragraph-gating]: [Paragraph — metrics, sharing and section gating](https://paragraph.com/@blog/metrics-and-gating)
[^zora-current]: [Zora — current product changes](https://support.zora.co/en/articles/4641857)
[^solana-accelerate]: [Solana — Accelerate USA consumer-app recap](https://solana.com/news/accelerate-usa-recap)

## 17:46 PDT crypto-chess differentiation and rematch recovery

Anichess is the closest current crypto-chess comparison. Its public product reports more than one
million players and differentiates through a separate spell ruleset; CHECK is used for tournament
entry, staking, performance rewards, collectibles and governance.[^anichess-token] Its puzzle product
adds energy regeneration, paid energy, referrals, premium daily puzzles and short resetting rankings.[^anichess-puzzles]
Those are proof that fantasy chess plus a broad token economy is an occupied product category—not proof
that Dasha should reproduce thirteen spells, mana, energy, a second point, referral rewards or paid play.

Research on blockchain-game behavior reaches the weaker, more durable conclusion: long-lived retention
still depends on well-designed gameplay, while financial mechanics create additional behavior and
stability problems.[^aavegotchi-behavior] Dasha's current differentiation is therefore coherent:
server-authoritative standard chess, a culturally legible Dasha-white/Anna-black table, exact public
replays and brackets, and current-holder access without wagers or performance payouts. A weekly position
derived from a real replay remains the first justified content expansion after the completion trigger;
spell chess and a token reward economy do not.

Solana Mobile's current discovery program rotates hand-picked apps through short quest rounds and
collectible badges.[^seeker-summer] This demonstrates that a curated event can focus attention, but it
does not establish that persistent daily quests retain players—or that Dasha should pay for actions.
If repeat Chess use later supports mobile distribution, submit the existing responsive game and a real
community cup as the event. Do not build an app wrapper, fake quest substrate or reward inventory first.

The state audit also found a direct client/server mismatch. The server correctly requires current
holder proof for a rematch. When proof expired after a completed game, the client still showed Rematch,
hid the normal access gate behind the visible board, and could only return a 403. The completed-game
action now reads **Verify to rematch** and reuses the existing sign-message proof flow in place. The
wallet address and balance remain transient, the original game and share/PGN actions stay available,
and an outstanding offer sent by the current player remains disabled rather than presenting a false
second action.

[^anichess-token]: [Animoca Brands — Anichess adopts CHECK](https://www.animocabrands.com/announcement/animoca-brands-anichess-adopts-check-token-as-native-token)
[^anichess-puzzles]: [Anichess — Spell Chess Puzzles](https://docs.anichess.com/anichess/spell-chess-puzzles)
[^aavegotchi-behavior]: [Xu et al. — player behavior in Aavegotchi](https://arxiv.org/abs/2210.13013)
[^seeker-summer]: [Solana Mobile — Seeker Summer quests and discovery](https://solanamobile.com/blog)

## 17:58 PDT social replay loop and outstanding-offer proof

Established chess products treat direct play as a first-class object. Chess.com supports a dedicated
Play a Friend path, profile challenges and shortcut URLs; live invitations expire instead of creating
a permanent social relationship.[^chess-friend] This validates Dasha's exact 30-minute challenge link
and mutual rematch as the appropriate social layer. It does not require importing contacts, building a
friend graph, exposing presence, adding DMs or offering custom clocks before the existing loop is used.

Broader multiplayer evidence also separates acquisition from later retention. A 51,104-player study
found achievement signals more predictive earlier, while social features became more predictive only
at the highest player phase.[^retention-friends] Dasha currently has eight Chess opens and no disclosed
downstream cohort, so a persistent friends system or recommended-opponent model would overfit evidence
from mature games. Preserve rating, exact challenges, rematches and public replay artifacts; add social
structure only if repeat opponents and completed games become observable.

Solana Mobile describes its current 1,000-app problem as turning one-time downloads into everyday
habits, alongside improved discovery and publisher feedback.[^seeker-discovery] That supports measuring
repeat play before packaging, not assuming a dApp listing itself produces retention. Dasha's first
retention object remains a rematch with the same person, followed later by a real replay-derived weekly
position or cup when completion evidence exists.

The completed-game audit then found a sibling proof dead end. A player could send a rematch offer while
verified, let proof expire while waiting, and see only disabled **Rematch sent**. The opponent could not
accept because the server correctly rechecks both holders, while the offerer had no visible refresh
path. Every expired-proof completed-game state now exposes the same **Verify to rematch** action. After
verification, an outstanding offer returns to its truthful disabled waiting state; no duplicate offer
or game is created.

[^chess-friend]: [Chess.com Help — play a friend](https://support.chess.com/article/1241-how-do-i-play-a-friend)
[^retention-friends]: [Park et al. — Achievement and Friends in multiplayer retention](https://arxiv.org/abs/1702.08005)
[^seeker-discovery]: [Solana Mobile — 1,000+ dApps and smarter discovery](https://solanamobile.com/blog/1-000-dapps-smarter-discovery-and-a-bigger-seeker-season)

## 17:20 PDT social presence, rewards, and Chess affordance delta

A July 2026 preprint observed only a 0.198% 24-hour graduation rate across 832,941 pump.fun launches.
Listings that advertised social channels graduated more often, but the study is observational and its
largest covariate—Telegram presence—does not establish that adding a Telegram caused survival.[^pump-survival]
The weakest useful conclusion is that a token benefits from visible, inspectable social presence and
portable public objects; it is not evidence for opening another channel, buying attention, or copying
launch-period self-buying.

Recent reward systems reinforce the cost of economic engagement loops. Common reports that its first
distribution attracted bots and duplicate-wallet farming, then added wallet age, social verification,
onchain history and manual review to redistribute a fixed pool.[^common-retrodrop] Farcaster research
likewise finds reward programs can increase output while leaving quality neutral or worse, with wealth
concentration between 0.72 and 0.94 Gini and repeated rewards encouraging strategic optimization.[^farcaster-plural]
For Dasha, likes, reposts, purchases, trades, holding duration and refusal to sell therefore remain bad
Simp or Chess score inputs. The system already has a cleaner distinction: public cultural artifacts
create discovery; current holder proof opens live recurring play.

Solana Mobile now reports more than 150,000 Seeker devices and over $100 million across 175+ mobile
dApps.[^seeker-2026] That is a credible later distribution surface, but not evidence that packaging the
current standard web route will create repeat use. The gate remains observed repeat Chess play or replay
recruitment. Status's mature token-gated community product also couples chat with a wallet, browser,
end-to-end encryption, metadata privacy and multiple native clients.[^status-2026] This makes a second
messenger especially poor current scope: Lobby should stay small and Chess invitations should remain
portable links.

The Chess audit found one narrower user-visible inconsistency. Replay, completed-game and opponent-turn
squares expose `aria-disabled` and a default cursor, yet their inherited hover/press animation still
brightened and shrank them. That falsely advertised an action on desktop and mobile. Feedback selectors
now apply only when `data-readonly=false`; legal moving-side interaction is unchanged. No flip control,
theme picker, animation system or extra action was added.

[^pump-survival]: [Kamat — Pump.fun Graduation Regime Windows](https://arxiv.org/abs/2607.02823)
[^common-retrodrop]: [Common Foundation — trust-gated retrodrop and Sybil response](https://www.common.foundation/blog/retrodrop-trust-gated-and-sybil-resistant-rewards-for-aura-launched)
[^farcaster-plural]: [Yang et al. — Beyond Single-Tokenomics](https://arxiv.org/abs/2511.00827)
[^seeker-2026]: [Solana Mobile — SKR and the 2026 mobile ecosystem](https://solanamobile.com/blog/skr-launches-january-2026)
[^status-2026]: [Status — wallet, messenger and token-gated communities](https://status.app/)

## 16:55 PDT lifecycle truth and discovery-surface delta

A focused browser test confirmed that a selected piece survived a server completion transition. After
the game ended, the square remained visually and programmatically selected even though no move could
be made. The shared renderer now clears selection whenever the view is a replay, the game is not
active, or the viewer is not the side to move. One guard covers timeout, resignation, draw, reconnect,
replay and opponent-turn state instead of adding caller-specific cleanup. The failing test now passes
through an actual mocked server response and the ordinary resignation flow.

Fresh consumer distribution evidence points toward fewer special wrappers, not more:

- Solana Mobile reports more than 1,000 live dApps and now treats Spotlight/discovery as its own
  product surface.[^solana-discovery]
- Kraken placed thousands of Solana assets inside its existing consumer app specifically to remove
  separate-wallet, seed-phrase and app-switching friction.[^kraken-onchain]
- Solana's April ecosystem report highlights consumer growth in collectibles, commerce and mobile,
  while the Monolith hackathon alone produced more than 400 submissions.[^solana-april]

Inference: distribution inventory is abundant; a listing cannot compensate for an unfinished repeat
loop. Dasha should keep exact standard web URLs and prepare app-store metadata only after Chess starts,
completions or replay recruitment disclose. The nearer product work is activation clarity and one
excellent portable object per completed action. Do not build a second wallet, proprietary mobile
shell, feed, embedded exchange or paid-play reward merely to occupy another surface.

[^solana-discovery]: [Solana Mobile — 1,000+ dApps and smarter discovery](https://solanamobile.com/blog/1-000-dapps-smarter-discovery-and-a-bigger-seeker-season)
[^kraken-onchain]: [Kraken — onchain token trading in the existing app](https://blog.kraken.com/product/onchain-trading/now-built-into-the-kraken-app)
[^solana-april]: [Solana Foundation — April 2026 ecosystem roundup](https://solana.com/news/solana-ecosystem-roundup-april-2026)

## 17:08 PDT attention-market boundary and board-affordance delta

The Chess selection audit found an inconsistent branch: the first tap selected only a piece with at
least one server-authorized legal move, but switching from an already selected piece accepted any
friendly piece. On the initial board, e2 followed by the blocked a1 rook produced a selected rook with
no destinations. A failing browser regression proved the false affordance at every viewport. The
shared click handler now computes `movable` once and uses it in both branches; tapping an immobile
friendly piece clears selection, while tapping another movable piece still switches normally.

The newest attention products make the speculative alternative concrete:

- Zora Trends are tradeable markets around topics, with child content markets and a 1 SOL creation
  fee.[^zora-trends]
- OKX Orbit distributes weekly creator rewards using popularity, engaged-user quality and connection
  strength, while prohibiting fabricated performance claims.[^okx-orbit]
- KuCoin now rewards posting, follows, likes, comments and first trades in the same task system.[^kucoin-feed]
- X's authenticity policy forbids coordinated or deceptive amplification and using popular topics to
  manipulate attention toward products.[^x-authenticity]

These products already occupy “trade the trend” and “pay for engagement.” Dasha should not reproduce
them with a thin Simp-points wrapper. A differentiated attention object is editorial and playable:
after at least twenty genuine completed games, derive one weekly public position from a community
replay, link back to the complete game, and measure solve/share/Play handoffs without a prize. Until
that trigger exists, keep the exact replay and challenge as the distribution objects. Do not reward
likes, reposts, first trades, trending hashtags, purchases, holding duration or non-selling.

[^zora-trends]: [Zora — Trends and Pairs](https://support.zora.com/en/articles/10419521)
[^okx-orbit]: [OKX — Orbit Creator Rewards](https://www.okx.com/en-eu/help/orbit-engage-your-community-earn-rewards)
[^kucoin-feed]: [KuCoin — Feed Content Mining and Task Center](https://www.kucoin.com/announcement/en-kucoin-feed-content-mining-task-center-are-now-live-turn-content-into-real-rewards)
[^x-authenticity]: [X — Authenticity policy](https://help.x.com/en/rules-and-policies/authenticity)

## 16:26 PDT consumer utility and Chess activation delta

The first privacy-disclosed Chess signal is now six page opens. Every downstream cell remains below
five: buy intent, game start/completion, challenge use, tournament use and replay behavior. This proves
discovery, not demand, and leaves the access sequence as the largest unknown. Adding a clock, puzzle,
reward, wallet, chain integration or homepage control would not distinguish X-link friction from Board
enrollment, holder proof, queueing or cold-start matchmaking.

The prepared measurement change adds four fixed anonymous event enums: X-link intent, Board-enrollment
intent, holder-proof intent and queue intent. Each is recorded at most once per browser session by the
existing retry-aware path. Public counts and adjacent-stage ratios remain hidden below five. Payloads
contain no X ID, handle, wallet, balance, mint amount, game, URL, referrer, device, timestamp or source
slice. These are event ratios rather than unique-user conversion or retention, and the public contract
says so. The Worker now uses the shared increment helper, so a newly introduced counter also increments
safely if an old persisted snapshot omitted it.

Fresh 2026 products reinforce the current product boundary:

- Solana Mobile reports more than 150,000 Seeker devices and a zero-fee dApp Store, showing that a
  coherent repeatable consumer experience can earn distribution after it exists.[^seeker-skr]
- Zora now makes every profile and post tradeable and routes attention into creator/profile coins.
  That is a clear, already-occupied product thesis, not an unclaimed Dasha feature.[^zora-creator]
- Pump documents automatic creator fees on trades and mutable fee routing. Those economics require
  independently established recipient control and accurate public disclosure; Dasha has neither
  evidence nor a product reason to imitate the mechanic.[^pump-fees]
- Cloudflare's current Durable Object guidance says each multiplayer game should eventually be an
  atom of coordination, but also warns against premature global bottlenecks. The current serialized
  state remains far below its documented migration trigger, so transport/storage redesign is not an
  activation fix.[^do-rules]

Decision: keep one exact coin, free portable artifacts and holder-only live play. Improve access and
repeat utility before broad distribution. Do not create coins for posts/replays, pay people to trade,
reward purchases or holding duration, penalize sells, simulate volume, or claim that product attention
causes price appreciation. Sustainable voluntary demand comes from people wanting the cultural object
and recurring holder experience, not from making exit harder.

[^seeker-skr]: [Solana Mobile — SKR launches January 2026](https://solanamobile.com/blog/skr-launches-january-2026)
[^zora-creator]: [Zora — Understanding Creator Coins](https://support.zora.co/en/articles/6316801)
[^pump-fees]: [Pump — fees](https://pump.fun/docs/fees)
[^do-rules]: [Cloudflare — Rules of Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/)

## 2026-08-10 cold-start distribution: queue to exact invite

The clean public funnel currently shows 60 Quiz starts and 41 completions, while every Chess cell is
still suppressed below five. That is not evidence that Chess needs more modes. It is evidence that a
synchronous global queue is a poor default distribution assumption for a very small player pool.

Current product platforms increasingly collapse discovery into the activity itself. Farcaster Mini
Apps describe feed discovery, sharing and notifications as retention primitives; Base's current
guidance emphasizes standard web URLs and post-achievement sharing; Solana Mobile reports more than
100,000 app-seeking users while evaluating mobile-first utility.[^farcaster-mini][^base-standard]
[^solana-mobile-2026] The reusable principle is a portable exact object, not another platform SDK.

Dasha already has the correct object: a bounded, unguessable, one-opponent challenge URL with public
inspection and server-side X/holder gates. The prepared client now exposes **Invite someone** only
while a verified holder is waiting in casual matchmaking. One tap leaves the cold queue and creates
one challenge; the primary action then becomes **Share challenge**. Sharing remains a second explicit
tap so browsers retain a valid user gesture for the native share sheet. The existing X fallback and
exact URL remain intact.

This adds no referral reward, contacts access, DM automation, token transfer, social-action points,
buy incentive, holding-duration bonus or sell penalty. It seeks voluntary demand by making existing
holder utility usable with one known opponent. If challenge creation and acceptance remain suppressed,
the next action is distribution or qualitative testing—not more Chess machinery.

[^farcaster-mini]: [Farcaster Mini Apps — discovery and retention](https://miniapps.farcaster.xyz/)
[^base-standard]: [Base — migrate to a standard web app](https://docs.base.org/apps/guides/migrate-to-standard-web-app)
[^solana-mobile-2026]: [Solana Mobile — Builder Grants, July 2026](https://solanamobile.com/blog/solana-mobile-builder-grants-bring-your-best-seeker-and-skr-ideas)

## 2026-08-10 artifact economics and Chess engine evidence

Solana's March 2026 ecosystem roundup shows a crowded wave of prediction, tournament-trading, launch,
privacy, gaming, commerce, social-authenticity and open-source-tokenization products.[^solana-march]
Zora's current model goes further: every post and profile can become a separate tradeable coin, with
creator earnings tied to trading.[^zora-coins] These are useful market signals and poor templates for
Dasha's next release.

Dasha already has one coin and a coherent culture surface. Minting every meme, quiz result, Chess
replay or creator profile would fragment attention, add financial and moderation risk, turn simple
creation into a transaction decision, and make the site harder to understand. The stronger position
is one exact mint plus many free portable artifacts whose utility is legible before any purchase:
Studio output, quiz identity, direct challenges, tournaments, replays and contribution recognition.
Holding can open a seat; it must not weight ratings, Board points, visibility, prizes, or exit rights.

The Chess audit also moved from example tests to reference move trees. The custom engine matches the
Stockfish perft vectors for the opening through depth four, Kiwipete (`48`, `2,039`, `97,862`), the
rook/pawn endgame (`14`, `191`, `2,812`), and the promotion/check-evasion position (`44`, `1,486`,
`62,379`).[^stockfish-perft] The prepared permanent suite retains the first two depths of all three
adversarial positions. This cheaply covers castling, pins, en passant, promotion and check evasion
without adding a chess dependency or changing a correct engine.

Next product evidence remains behavioral: disclose at least one clean Chess cell, Studio completion,
or Studio export before building another channel. Until then, improve exact-object handoffs and
correctness rather than adding trading, quests, rewards, notifications, another chain, or another app.

[^solana-march]: [Solana Ecosystem Roundup — March 2026](https://solana.com/uk/news/solana-ecosystem-roundup-march-2026)
[^zora-coins]: [Zora — Understanding Creator Coins, May 2026](https://support.zora.co/en/articles/6316801)
[^stockfish-perft]: [Stockfish official perft test vectors](https://github.com/official-stockfish/Stockfish/blob/master/tests/perft.sh)

## 2026-08-10 creator completion truth and consumer execution

The live Studio baseline shows 19 opens and 10 first edits, but completion, export and share cells are
still below five. Source tracing found that this evidence was weaker than it appeared: Studio added an
event to its per-page dedupe set before delivery and never removed it after network or HTTP failure.
One transient failure therefore made the same real stage unreportable for the rest of the session.

The prepared fix retains one accepted event per stage but makes failure retryable. A browser test
forces the first open request to fail, repeats the same genuine stage, and proves exactly two attempts;
successful paths remain deduplicated. Payloads remain only `{event, source}` with bounded source enums.
No creative text, image, X identity, wallet, referrer detail, device field or analytics SDK is added.
This does not make the current hidden cells positive; it makes future disclosure trustworthy.

Current Lens stewardship explicitly argues that the ecosystem needs consumer-grade applications and
execution rather than more protocols.[^lens-consumer] Paragraph's creator product similarly emphasizes
publishing once into several existing discovery surfaces.[^paragraph-distribution] The applicable
Dasha lesson is narrow: improve create→save/share reliability and portable URLs before adding a Lens
graph, newsletter, Farcaster fork, subscriber database, onchain post, or new creator coin.

The same audit found one Chess offline leak. Visible polling stopped offline, but the 250ms local clock
timer could still request expiry adjudication at zero. The prepared boundary now waits while explicitly
offline; the server clock never pauses, and reconnect restores the route and adjudicates authoritatively.
A browser regression holds the clock at zero for 1.2 seconds and proves zero game requests plus the
existing concise offline status.

[^lens-consumer]: [Lens — Mask Network to steward the next chapter, January 2026](https://lens.xyz/news/mask-network-to-steward-the-next-chapter-of-lens)
[^paragraph-distribution]: [Paragraph documentation — publish once, distribute across channels](https://paragraph.com/docs)

## 16:12 PDT repeat-play and discovery delta

Two current signals sharpen the product direction. Lichess models a rematch as a dedicated offer tied
to the completed game, rather than quietly returning both players to generic matchmaking.[^lila-rematch]
Solana Mobile's July ecosystem update says its catalog now exceeds 1,000 apps and explicitly frames
curated discovery plus repeat daily use as the new problem; its current hackathon winners prominently
include mobile PvP games and a playable social feed.[^seeker-discovery][^seeker-games]

The prepared Chess change follows the first signal directly: **Rematch** is one mutual, server-owned
offer. The second player accepts, colors swap so each person changes Dasha/Anna side, duplicate accepts
reuse the same new game, and both players must still have current holder proof. The finished board
shows only one primary repeat-play control. It does not create a notification system, friends graph,
chat, custom clock, streak reward, wager, token prize, or second matchmaking mode.

The broader product inference is narrower than “build a mobile app.” Dasha already has the portable
objects that current discovery systems reward: exact challenge links, replay cards and public brackets.
The next distribution experiment, after genuine volume clears privacy thresholds, should curate one
weekly public object—best replay or live cup—on the existing home surface. Packaging for an app store,
paid-play incentives, holder-weighted visibility, or rewards for buying/holding remain unjustified.

[^lila-rematch]: [Lichess server routes — rematch offer endpoint](https://github.com/lichess-org/lila/blob/master/conf/routes/)
[^seeker-discovery]: [Solana Mobile — 1,000+ dApps, smarter discovery, and repeat-use challenge](https://solanamobile.com/blog/1-000-dapps-smarter-discovery-and-a-bigger-seeker-season)
[^seeker-games]: [Solana Mobile — 2026 hackathon winners](https://solanamobile.com/blog/solana-mobile-hackathon-winners-announced)

## 16:28 PDT retention evidence and market contrast

The 2026 consumer-crypto field is converging on tightly coupled social and transaction surfaces. Base
describes one app spanning feed, chat, payments and trading; Zora makes every profile and post
tradeable and pays creators from trading; Solana's March roundup is crowded with prediction games,
token-aware tournaments and mobile gaming stores.[^base-app][^zora-product][^solana-march]

That density is useful negative evidence. Dasha cannot out-feature integrated wallets or generalized
creator markets, and copying trade-to-earn would make culture participation indistinguishable from a
financial solicitation. Its defensible smaller loop is recognizable culture plus playable access:
public artifact → exact game → voluntary holder proof → repeat play → shareable artifact. Any effect on
holder demand should come from people valuing that access, never from promised returns, sell penalties,
wash activity, referral payments, holder-weighted rank, or manufactured scarcity.

The rematch loop now records only two server transitions: first valid offer and second valid acceptance.
The public funnel exposes both cells and their ratio only after each reaches five. It stores no game ID,
player, X ID, wallet, rating, result, time, device or source. Repeated clicks and idempotent acceptance
do not increment either cell. This separates “people ask to continue” from “the opponent agrees” while
preserving the existing privacy contract.

Decision rule: if completed games clear five but rematch offers do not, the finish state or desire for
repeat play is weak. If offers clear five but accepts do not, mutual timing or opponent return is the
problem. Only the latter could justify a bounded notification experiment; neither result justifies a
new game economy.

[^base-app]: [Base — the Base App combines social, chat, payments and trading](https://blog.base.org/a-new-day-one)
[^zora-product]: [Zora — current creator and post coin model](https://zora.co/app)
[^solana-march]: [Solana — March 2026 ecosystem roundup](https://solana.com/uk/news/solana-ecosystem-roundup-march-2026)

## 16:42 PDT settled-game lifecycle audit

The Chess client correctly stops active-game polling when the tab is hidden, consistent with the Page
Visibility API's resource-saving use case.[^page-visibility] A separate finish path defeated that
discipline: every render of an ordinary completed game scheduled an identity refresh after 700ms; the
refresh rendered the same completed game and scheduled the next refresh indefinitely. One idle result
page therefore generated roughly 86 identity requests per minute for as long as it remained visible.

The prepared fix removes all polling from a settled game unless that player has an outstanding rematch
offer. A move, resignation, accepted draw or observed timeout performs one bounded identity refresh to
pick up the settled rating, then becomes idle. The rematch-offering player retains the intentional
2.5-second poll because another person can change that state. Browser coverage holds a completed board
open for 1.8 seconds and fails unless exactly the initial identity request occurs.

This is a reliability and operating-cost repair, not a reason to migrate Chess to WebSockets. Current
Cloudflare guidance recommends Hibernation WebSockets for genuinely high-frequency coordination, but
the existing visible-only 2.5-second turn/rematch polling is simpler at present scale.[^cf-websocket]
The architecture trigger remains sustained real use, not a theoretical feature advantage.

[^page-visibility]: [MDN — Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
[^cf-websocket]: [Cloudflare — Durable Object WebSocket guidance](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)

## 16:55 PDT public-object return path

Chess lives at `lobby.getdasha.com`, while the culture homepage lives at `www.getdasha.com`. A
domain-relative `/` therefore resolves to the Lobby service root, not the homepage; MDN's URL guidance
is explicit that a leading slash retains the current domain.[^mdn-url]

Both Chess header controls were affected. The `$DASHA` brand and a link visibly labelled **Home** sent
challenge, replay and tournament visitors into public chat. The prepared page uses the explicit
canonical homepage URL for both controls. Game-local links remain domain-relative because `/chess`,
replay and tournament state correctly belong to the Lobby origin. Static and rendered-browser tests
assert both the exact cross-origin targets and the absence of a mislabeled root link.

This closes the smallest complete discovery loop: homepage → Chess → public game object → homepage.
It adds no navigation drawer, intermediary campaign page, redirect, tracking parameter or duplicate
Chess route. Search canonical and sitemap signals remain aligned with the actual hosting origins;
Google treats canonical annotation and sitemap inclusion as reinforcing signals.[^google-canonical]

[^mdn-url]: [MDN — absolute and domain-relative URLs](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL)
[^google-canonical]: [Google Search Central — canonical URL signals](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)

## 17:08 PDT deep-link restoration ordering

Tournament and challenge startup previously floated identity and object requests in parallel. Both
responses render the same Play panel, so response timing—not route intent—could decide the final UI.
A fast missing-object response displayed `Tournament unavailable`; a slower identity response then
cleared it and restored the generic creation form. MDN's Promise guidance identifies unreturned,
floating async work as a source of exactly this class of race.[^mdn-promises]

The route restorer now completes identity state first and returns the exact tournament or challenge
request second. The shared object is therefore the final authority after startup, trusted OAuth
completion, reconnect and foreground resume. Replays remain identity-free and load immediately.
A mobile browser test deliberately delays identity by 80ms and proves that a missing tournament's
bounded unavailable state remains visible after all work settles.

This is a sequencing repair, not an added loading framework. It introduces no request token, router,
abort controller, state machine or dependency. Lichess's public route inventory likewise treats a
tournament ID as its own directly addressable resource, reinforcing the exact-object model rather than
a generic tournament-list fallback.[^lila-routes]

[^mdn-promises]: [MDN — Promise chaining and floating-promise races](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
[^lila-routes]: [Lichess server — tournament and challenge routes](https://github.com/lichess-org/lila/blob/master/conf/routes/)

## 17:22 PDT homepage choice architecture

Current crypto-game pages commonly make **Play** their dominant acquisition action. PairPunk leads with
Play but surrounds it with rewards, token statistics, future modes and a large world promise; Tavern
uses the much narrower proposition that communities become stronger by playing together.[^pairpunk][^tavern]
The useful Dasha lesson is prominence after proof, not a larger roadmap.

Chess already appears in global navigation, hero micro-navigation, footer, structured metadata,
how-to-buy and the sitemap. Replacing one of the four hero actions now would be a blind preference
because all production Chess funnel cells remain below the five-event privacy threshold. The existing
roadmap rule stands: rotate a timely replay or live cup into an existing hero slot only after genuine
inventory and disclosed behavior exist. Do not add a fifth action, carousel, “featured” fiction, token
prize, countdown, or coming-soon world.

The route-order repair is completed at the code contract too: tournament and challenge loaders now
return their full fetch/render chains, including the identity refresh after an active bracket is
resolved. Callers can therefore await actual restoration rather than only the first identity step.
Static assertions prevent either loader from becoming a floating promise again.

[^pairpunk]: [PairPunk — current Solana game landing](https://pairpunk.com/)
[^tavern]: [Tavern — community play positioning](https://www.playtavern.com/)
[^farcaster-docs]: [Farcaster Docs — Mini Apps](https://docs.farcaster.xyz/)

## 16:20 PDT eligible actions, not incentive clutter

The anonymous tournament deep link exposed an acquisition contradiction: it showed an enabled Join
button even though the server requires linked X, board enrollment, and current holder proof. The
button could only produce an authorization error. It is now absent until the viewer is eligible; the
existing chess gate supplies the next valid step, while Share, tournament state, entrants, and bracket
remain public. A mobile regression proves that a verified holder still receives Join.

Current ecosystem launches do not justify copying every financial mechanic into Dasha. Base's new app
combines discovery, social context, trading, and creator earnings inside one feed,[^base-app] while
Solana's current community surface separates announcement, discussion, engineering, and event
channels.[^solana-community] The shared observation is narrower: useful actions should appear in the
context where they can complete. It does not imply that Dasha needs a feed, a new reward pool, or more
tokenized objects.

For attention that can mature into durable ownership, keep the sequence: public object → complete
experience → voluntary holder access. Chess tournaments now follow it. Avoid paid referrals,
balance-weighted status, creator-fee loops, lockups, or sell penalties; those can increase measured
activity while obscuring whether anyone returns for the product. The next discriminating evidence is
completed games and repeat players, not clicks on an impossible control.

[^base-app]: [Base — The Base App is now open to everyone](https://blog.base.org/baseapp)
[^solana-community]: [Solana — Community](https://solana.com/community)

## 16:50 PDT object-to-context loops

Solana's July consumer roundup shows a recurring product shape across collectible applications:
opening or acquiring an object is the entry point, while collections, games, leaderboards, and
redemption supply persistent context.[^solana-july] The transferable lesson for Dasha is not to add
randomized packs or another asset. It is to prevent a useful object from becoming a dead end.

Tournament chess replays already carried their tournament identifier in the public API, but the page
discarded it. A shared match now exposes one conditional Tournament link back to the bracket. Casual
games gain no extra control, and tournament replays keep their existing playback and Share actions.
This closes a measurable distribution loop using data already present: bracket → game → replay →
bracket. Browser coverage proves the link is absent during live casual play and present with the
canonical tournament route on a public replay.

This is the next attention principle: connect related first-party objects before acquiring another
channel. If real tournaments later produce at least five durable replays, a compact tournament archive
may be warranted. Until then, an empty archive, quest system, badge economy, or new collectible would
be theater rather than retention.

[^solana-july]: [Solana — Ecosystem Roundup: July 2026](https://solana.com/news/solana-ecosystem-roundup-july-2026)

## 17:20 PDT quest substrate + deeper engine proof

Solana Mobile's current Seeker Summer makes quests work inside a specific substrate: sixteen featured
apps, rotating two-week rounds, daily discovery placement, two graduated actions per app, and durable
badges recorded by the dApp Store and wallet.[^seeker-summer] Dasha has none of that distribution
infrastructure yet. Adding a “daily quest” label or points for opening pages would copy the mechanic
while omitting the reason it can drive discovery. Do not build it now.

The smallest useful adaptation remains product-native and unrewarded: a tournament supplies a bounded
event; each game creates a replay; the replay returns to the bracket. If repeat participation becomes
real, a scheduled Dasha Chess night is a better experiment than a generalized quest system because
the action, audience, and completion object already exist. Measure entrants, completed games, repeat
players, and replay shares—not wallet clicks or subsidized claims.

The engine audit also advanced from 8,902 positions at canonical perft depth 3 to 197,281 at depth 4.
The deeper tree passed and is now a permanent regression. It exercises a materially wider combination
of pins, checks, captures, castling-right transitions, and move-state restoration without changing the
engine or introducing an external chess dependency.

[^seeker-summer]: [Solana Mobile — Seeker Summer quests and badges](https://solanamobile.com/blog/seeker-summer-is-here-complete-quests-earn-badges-and-explore-apps-all-summer-long)

## 17:45 PDT identity-state honesty

The earlier replay repair exposed a shared root condition: anonymous chess-home and tournament visitors
also saw the default “Your rating 1200 · 0 games” panel before linking X. The rating was a system
default presented as personal state. The gate renderer now hides that panel whenever no linked identity
exists, while linked pre-enrollment, verified-holder, active-game, and replay behavior remain intact.

This follows current wallet-onboarding guidance without adding wallet machinery. Solana Mobile advises
that authorization and signing originate from one explicit user action because mobile browsers enforce
trusted-event policies.[^mwa-ux] Dasha similarly keeps X linking explicit and requests a wallet signature
only at the holder-proof step. The interface should not visually imply either identity exists earlier.

The growth implication is trust rather than another funnel trick: public objects stay readable; the
next required action stays visible; personal status appears only when it is real. Do not prefill ranks,
holdings, streaks, or social proof to make an empty state look active. Those tactics may lift a screenshot
while weakening the credibility needed for voluntary ownership and return use.

[^mwa-ux]: [Solana Mobile — Mobile Wallet Adapter UX guidelines](https://docs.solanamobile.com/get-started/web/ux-guidelines)

## 18:10 PDT curated discovery, not another homepage module

A full crawl-path audit found Chess already reachable through the primary navigation, hero micro-links,
footer, how-to-buy page, robots allowlist, and bounded sitemap. The remaining inconsistency was
machine-readable: the site's structured description listed Mint, Studio, quiz, and lobby but omitted
Chess. That metadata now matches the public product set, with a static regression preventing drift.

Solana Mobile's current App Spotlight addresses a nearly 1,000-app catalog by showing four curated
apps per weekly theme, each with a short reason and a verified-user review.[^app-spotlight] Dasha does
not have a catalog problem. Its existing hero already prioritizes four actions, and repeating Chess as
a fifth large button would trade hierarchy for duplication. Keep the visual page unchanged.

The useful distribution idea is editorial rotation only after evidence: if one Dasha surface produces
a timely object—a tournament bracket, strong quiz result, or Studio artifact—the existing hero can
temporarily spotlight that object in place of a weaker action. Do not build a carousel, recommendation
engine, review layer, or “trending” section without enough real objects to curate.

[^app-spotlight]: [Solana Mobile — Introducing dApp Spotlight](https://solanamobile.com/blog/introducing-dapp-spotlight-in-the-solana-dapp-store)

## 18:35 PDT shared-card isolation

The dynamic Chess card audit found no cache or privacy defect, but its proof was too narrow. Worker
coverage previously exercised only one replay. It now proves that replay and tournament query URLs
produce distinct titles, descriptions, and canonical `og:url` values; an unknown replay falls back to
the generic Chess canonical instead of advertising the missing identifier; and the response retains a
bounded two-minute public cache.

This matters because Open Graph treats `og:url` as the permanent identity of the graph object.[^og-id]
A bracket card that accidentally inherits a prior replay's metadata fragments attribution and makes a
shared link look broken even if the browser later renders correctly. The new negative assertions would
fail on exactly that cross-object reuse.

Do not add per-game generated images yet. Dynamic text plus the stable 1200×630 Dasha Chess image is
valid, inexpensive, and verified. A unique image renderer becomes justified only if replay share volume
exists and the generic image measurably limits opens; otherwise it creates another cache, font, image,
and failure surface without evidence.

[^og-id]: [The Open Graph protocol — basic metadata](https://ogp.me/)

## 19:05 PDT Chess discovery measurement

The privacy-thresholded production funnel changed the next-build decision. Since 04:27 UTC, Studio
reported 16 opens and 10 first edits (62.5% open-to-edit), while Quiz reported 50 starts and 33
completions (66%). Every Chess activity cell remained below the public threshold of five. That proves
low disclosed Chess activity, but the old schema could not distinguish low discovery from failed
activation because it began at `gamesStarted`.

Chess now records one aggregate `page_open` per browser session. The event accepts no identity, wallet,
referrer, route, or user dimension; the browser deduplicates it with session storage; the Worker accepts
it only from an allowed origin; and the public value remains null below five. No “open-to-game” ratio is
published because opens are browser sessions while games represent paired activity, so presenting that
quotient as conversion would be false precision.

Cloudflare describes page views as successful HTML responses and its Web Analytics as privacy-first and
cookie-free.[^cf-metrics] Dasha's local counter is narrower: it exists only to choose between two actions.
If `pageOpens` reaches disclosure while games remain suppressed, audit identity/holder/matchmaking
activation. If page opens remain suppressed, improve distribution and object placement. Do not add more
Chess features until one of those hypotheses is distinguished.

[^cf-metrics]: [Cloudflare Web Analytics — high-level metrics](https://developers.cloudflare.com/web-analytics/data-metrics/high-level-metrics/)

## 19:35 PDT cross-product OAuth completion

The shared X OAuth audit found a functional Chess activation defect. Lobby, Board, Quiz, Studio, and
Chess all open the same popup, but successful completion posted its event only to the `www` and apex
origins. Chess lives at `lobby.getdasha.com`, so its opener could not receive the event. The popup then
closed while Chess remained on Step 1 until another refresh path happened to run.

The completion script now targets all three exact first-party origins. It deliberately does not use
`*`: `postMessage` dispatch requires an exact scheme, hostname, and port match, and MDN recommends a
specific target origin to avoid exposing messages to an unintended receiver.[^postmessage] The Chess
listener already verifies that the sender is the Lobby API origin. A static regression locks the exact
three-origin list.

The shared consent, cancellation, configuration-error, and success fallbacks are now product-neutral.
They no longer promise Lobby-only perks or route every user to Lobby. This removes one activation fault
without adding a return-URL state machine: normal popups notify and close; the rare manual fallback goes
to the Dasha home where every product is navigable.

[^postmessage]: [MDN — `window.postMessage()` target origin](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)

## 19:55 PDT OAuth receiver proof

The browser boundary now proves both sides of the shared completion contract. A forged
`dasha-x-linked` message from an unrelated origin triggers no identity request and leaves Chess at
`Link X`; the same message from the exact Lobby API origin refreshes identity and advances the gate to
`Join & enter`. Source inspection also confirmed exact-origin checks in Lobby, Board, Studio, and
Chess rather than permissive wildcard receivers.

This is deliberately a regression test, not another authentication layer. The existing popup protocol
is sufficient once its sender allowlist and receiver checks agree. Adding a token relay, return-URL
framework, or product-specific OAuth implementations would increase security and routing surface
without fixing an observed problem.

## 20:25 PDT community presence is not incentive design

A July 2026 preprint covering 832,941 Pump.fun launches reports a 0.198% pooled 24-hour graduation rate
and a strong association between listed social channels and graduation.[^grw] That is evidence that a
credible place for people to find one another matters; it does not establish that paid referrals,
self-buying, or manufactured activity creates durable community. A separate 2026 study finds rapid
selection, bot participation, and recurrent creator-linked dump patterns in bonding-curve launches,
including a mechanical incentive to sell before graduation.[^pump-predict]

The crowded product lane is explicit. Creator.fun combines automatically provisioned wallets, a
trending feed, trading, creator points, streaks, referrals, airdrop claims, and real-time chat.[^creator]
Dasha should not imitate that bundle. It already has the narrower ingredients the evidence actually
supports: one canonical coin, an exact mint, external-wallet proof, X identity, a lobby, cultural tools,
and replayable games. Attention should resolve into durable public objects—images, results, brackets,
and replays—rather than another points-for-trading loop.

Privy's current architecture also clarifies the custody tradeoff: embedded wallets improve onboarding
but introduce ownership, signer, policy, recovery, domain, cookie, CSP, and MFA decisions.[^privy]
Because Dasha only needs proof of an existing holding, its bring-your-own-wallet signature remains the
smaller and safer product. Do not provision wallets, request transactions, or custody assets merely to
remove one connection step.

[^grw]: [Kamat — Pump.fun Graduation Regime Windows](https://arxiv.org/abs/2607.02823)
[^pump-predict]: [Marino et al. — Predicting the success of new crypto-tokens](https://arxiv.org/abs/2602.14860)
[^creator]: [Creator.fun — product documentation](https://docs.creator.fun/introduction)
[^privy]: [Privy — key concepts](https://docs.privy.io/basics/key-concepts) and [security checklist](https://docs.privy.io/security/implementation-guide/security-checklist)

## 20:40 PDT active-clock adjudication

The Chess browser audit found that opponent turns poll the server, but the local player's turn does
not. When that player's displayed clock reached zero, the board could remain apparently active until a
move, reload, or visibility event asked the server to adjudicate. The client now performs one bounded
game refresh when the active clock expires; the server remains the sole time authority and the control
surface is unchanged.

## 21:10 PDT distribution is context plus feedback

Solana Mobile's July ecosystem review frames the current problem after a catalog passes 1,000 apps as
discovery and repeat habit, not lack of features. Its response is four-item themed curation with short
context, verified reviews, publisher replies, and review digests; the same update highlights multiple
small PvP and puzzle games rather than one universal crypto super-app.[^seeker-1000]

Dasha is far smaller, so copying a store, review system, quest layer, or native wrapper would be cargo
culting. The transferable pattern is editorial: circulate one concrete object with one reason to care,
then listen. The best near-term campaign unit is an existing open tournament link, followed by its
bracket and decisive replay. It already has identity, holder access, a bounded event, live state, and a
share card. No new reward asset or UI module is required.

After `pageOpens` is live, use the evidence literally:

1. Suppressed opens: manually circulate one named cup link and temporarily spotlight that object in the
   existing hero hierarchy.
2. Disclosed opens but suppressed starts: repair the X → board → holder → matchmaking path.
3. Disclosed completed games but suppressed shares: improve the replay artifact and share copy.
4. Five genuine public replays: consider a tiny curated archive; before that, an archive is empty
   theater.

[^seeker-1000]: [Solana Mobile — 1,000+ dApps, Smarter Discovery, and a Bigger Seeker Season](https://solanamobile.com/blog/1-000-dapps-smarter-discovery-and-a-bigger-seeker-season)

## 21:25 PDT tournament draw lifecycle proof

The Worker suite now exercises the previously uncovered tournament-draw branch end to end. A draw
keeps the tournament active, creates a new game with colors swapped, retains both replay identifiers in
the bracket, and advances only after the rematch has a decisive result. This adds no product surface;
it proves that the existing tournament object is safe enough to distribute when the evidence gate opens.

## 21:50 PDT matchmaking expiry belongs to the clock

Matchmaking entries have a 15-minute lifetime, but cleanup previously ran only inside the next queue
submission. With no second player, the first client could poll forever while the server continued to
report `queued: true`. The existing five-minute Durable Object alarm now applies the same queue validity
predicate and persists any cleanup, so expiry no longer depends on another person's arrival.

Cloudflare alarms are persisted, execute at least once, retry failures, and must be explicitly
rescheduled.[^alarms] The cleanup is therefore intentionally idempotent: repeating it only removes rows
that are already invalid, while the existing handler continues to schedule its next run. This is a
reliability correction, not a retention mechanic; silently trapping someone in an empty queue damages
trust and does not create meaningful engagement.

The same infrastructure review confirms the prepared single-record Chess snapshot has a deliberate
one-megabyte migration signal below SQLite-backed Durable Objects' two-megabyte key/value limit.[^do-limits]
Current disclosed use remains too low to justify a storage-schema migration, but the threshold should
remain observable and a migration must happen before it is crossed—not after writes fail.

[^alarms]: [Cloudflare Durable Objects — Alarms](https://developers.cloudflare.com/durable-objects/api/alarms/)
[^do-limits]: [Cloudflare Durable Objects — Limits](https://developers.cloudflare.com/durable-objects/platform/limits/)

## 22:20 PDT holder proof must name the product asking

The shared holder endpoint served Board and Chess, but its SIWS-shaped message always named
`www.getdasha.com`. That was correct for the embedded Board and false for Chess, whose signing request
originates at `lobby.getdasha.com`. The SIWS specification defines the message domain as the authority
requesting sign-in and treats domain binding as a phishing defense.[^siws]

The Worker now derives both domain and URI from the already allowlisted request origin and includes
that exact origin inside the signed challenge. Verification rejects moving a challenge between even
two first-party origins. Board remains `www.getdasha.com`; Chess truthfully presents
`lobby.getdasha.com`; the apex receives its own exact authority. Tests cover both messages and reject a
cross-origin replay before it consumes the valid nonce.

The broader holder design remains intentionally small:

- a five-minute, single-use signing challenge;
- a 24-hour private holder badge after a positive current balance check;
- no transaction, wallet storage, public balance, token-weighted score, or delegated signer;
- expiry prevents new queues and tournament entry but does not confiscate an already-started game.

That is enough product utility to make holding meaningful without manufacturing financial friction.
Do not lengthen the proof merely to hide sales, require continuous wallet surveillance, or interrupt a
live match when its access receipt expires.

[^siws]: [Phantom — Sign In With Solana specification](https://github.com/phantom/sign-in-with-solana)

## 22:45 PDT retry the network, not the signature

Holder verification previously deleted its one-time challenge immediately after validating the wallet
signature, before asking Solana RPC for the token balance. If every configured RPC failed, the endpoint
correctly failed closed but also forced the person to reconnect and sign again. That mixed two separate
facts: the wallet proof was valid; the network check was unavailable.

The challenge now survives only a total RPC failure and remains bounded by its original five-minute
expiry, exact X identity, wallet address, origin, nonce, endpoint rate limit, and signature. The first
definitive balance response—positive or negative—consumes it. A successful retry grants the same
idempotent 24-hour private badge; it cannot create points, funds, transactions, or multiple identities.

Solana explicitly says its public Mainnet endpoint is rate-limited, may change or block traffic without
notice, and is not intended for production applications.[^solana-rpc] Dasha already tries at most two
configured endpoints and fails closed. Preserving a valid five-minute signature across that bounded
outage is therefore a user-experience correction, not weaker ownership verification. A private primary
and operationally independent fallback remain the production reliability upgrade; repeated signatures
are not a substitute for infrastructure.

[^solana-rpc]: [Solana — Clusters and Public RPC Endpoints](https://solana.com/docs/references/clusters)

## 23:10 PDT foreground tables, quiet background tabs

Chess correctly refreshed state when a hidden tab became visible, but it did not stop the existing
2.5-second matchmaking/game poll, eight-second tournament poll, or visual clock interval when the tab
became hidden. Browsers throttle background timers, but throttling is not cancellation; multiple stale
tabs could still create uneven request bursts and needless mobile work.

The Page Visibility API exists so pages can stop work that is not useful while hidden, and MDN calls the
transition to `hidden` an appropriate point to stop UI updates and unwanted tasks.[^visibility] Chess
now clears all three client timers on hide, refuses to re-arm them while hidden, and performs an
immediate authoritative identity/game and tournament refresh on return. Server clocks, queue expiry,
ratings, and tournament state continue independently, so backgrounding never pauses the game itself.

This is the right pre-scale real-time architecture: small visible-only polling plus immediate lifecycle
recovery. Do not add WebSockets, push notifications, a service worker, or cross-tab leadership until
real concurrent play demonstrates that 2.5-second foreground updates are inadequate. The Lobby already
uses WebSockets because chat needs them; Chess does not inherit that complexity merely because it is
nearby.

[^visibility]: [MDN — `visibilitychange`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)

## 23:40 PDT the culture arcade, not the crypto super-app

The newest comparison set makes Dasha's positioning clearer. Together.fun combines a token feed,
chat, trading, guilds, P&L identity, XP, NFTs, an airdrop, and coordinated promotion.[^together]
Patoshi combines a mascot, presale, DAO, games, points, audits, liquidity claims, and multi-channel
content.[^patoshi] Charms frames AI characters with memory, voice, visual identity, social presence,
ownership, and an economy.[^charms] Solana Mobile's Activity Tracking turns transactions, app
exploration, and daily device use into rolling progress categories.[^seeker-activity]

Those are useful comparables, not a feature checklist. Their shared strategy is to collapse identity,
activity, finance, and distribution into one system. Dasha should occupy the less crowded inverse:
six public surfaces with one recognizable character world and outputs that travel independently. Home
is the foyer and houses Board recognition; Quiz is lore; Studio is creation; Lobby is presence; Chess
is play; Desk is the narrow trust rail. No surface needs its own token, feed, streak, wallet, or economy.

Ranked opportunity ladder:

1. **Now, after the prepared release:** distribute one existing object at a time—quiz result, Studio
   image, open cup, bracket, or replay—and use the thresholded funnel to identify its broken handoff.
2. **After five genuine Chess starts:** run one named Cup Night using the existing tournament object;
   improve entry only if opens disclose but starts do not.
3. **After five replay shares:** let a finished replay open Studio with a restrained score/result seed.
   This connects play to creation without inventing another social card service.
4. **After five eligible Studio publications:** curate a tiny rotating Home spotlight and editorial
   Board recognition. Do not make an infinite feed.
5. **After repeat weekly participation:** consider a recurring event calendar or mobile distribution.
   Do not confuse installation, badges, or diagnostics with retention before repeat use exists.

Rejected now: AI Dasha companion, portfolio/P&L identity, trading game, DAO voting, paid referrals,
holder-weighted points, daily streaks, airdrop seasons, embedded wallets, and additional assets. Each is
already a crowded category, expands trust or moderation scope, and weakens the portable-object loop.

[^together]: [Together.fun — product site](https://www.together.fun/)
[^patoshi]: [Patoshi — product site](https://www.patoshi.meme/)
[^charms]: [Charms — launch overview](https://techcrunch.com/press-release/charms-closes-1-5m-pre-seed-to-launch-the-ai-character-economy/)
[^seeker-activity]: [Solana Mobile — Activity Tracking](https://solanamobile.com/blog/introducing-seeker-activity-tracking)

## 00:15 PDT one honest path from play to the exact mint

Chess now keeps one visible purchase handoff in its header: Jupiter with the exact $dasha mint already
used by the project's trust rail. The link records only a session-deduplicated anonymous
`buy_intent` event. Public reporting suppresses fewer than five events and labels the derived
`pageOpenToBuyIntent` ratio as aggregate events, not people, purchases, conversion, or causality.

That is the weakest useful acquisition measurement. A click can show whether Chess makes the holder
requirement actionable, but it cannot prove a swap occurred. Do not add wallet attribution, amounts,
referral rewards, transaction surveillance, or purchase claims unless a later product decision and
separate trust review establish that they are necessary.

## 00:45 PDT portable scenes beat another crypto dashboard

Fresh consumer products keep converging on distribution inside an existing social context. Farcaster
Mini Apps promise one-click feed discovery, built-in identity, notifications, and native wallet rails;
Farworld's own pitch begins with eliminating the download, wallet, bridge, and social-link obstacle
course before a game starts.[^miniapps][^farworld] Base takes the opposite maximalist route by putting
social, trading, payments, chat, apps, and creator coins into one product.[^base-app] Lum Casters is the
more relevant cultural counterexample: community storytelling and world-building first, with explicit
delay of financialization.[^casters]

The weakest conclusion shared by those examples is not “build a Farcaster app” or “add an embedded
wallet.” It is that each Dasha artifact should reopen the exact scene that made it interesting: quiz
result, editable image, live cup, bracket, or replay. Dasha's identity is the small culture arcade, not
an everything wallet. A distribution wrapper becomes justified only after an existing object is shared
repeatedly or an actual integration partner asks for it.

Implications:

1. Preserve public replay and bracket deep links; keep play itself linked-X and holder-gated as promised.
2. After five replay-share intents, open Studio from the finished score rather than inventing another
   social feed or points economy.
3. After repeated external opens, evaluate one thin social mini-app wrapper around the existing web
   route. Do not fork the product or introduce a second identity system.
4. Treat holder-only play, tournaments, status, and culture objects as legitimate utility that can
   support voluntary demand. Do not create rewards for buying, holding duration, posting, or refusing
   to sell; those mechanics manufacture behavior instead of improving the product.

[^miniapps]: [Farcaster — Mini Apps](https://miniapps.farcaster.xyz/)
[^farworld]: [Farworld Labs — the Farcaster gaming platform](https://paragraph.com/@farworld/introducing-farworld-labs-%E2%80%94-the-farcaster-gaming-platform)
[^base-app]: [Base — The Base App is open to everyone](https://blog.base.org/baseapp)
[^casters]: [Lum — Casters](https://paragraph.com/@luminous/casters)

## 01:15 PDT distribution is a property of the object

Base reports that more than 40% of its beta users engaged with mini apps and exposes session time and
acquisition-channel metrics to builders.[^basecamp] Its broader builder guidance emphasizes simple,
low-friction experiences that are accessible to newcomers.[^summer] Those numbers are platform-reported,
not an estimate of Dasha demand, but they sharpen the test: distribution works when an object opens in
the state promised by its social copy.

The Chess audit found the inverse. A completed tournament's share text still said “Join the
tournament,” although the link correctly opened a finished bracket. The route worked; the portable
promise did not. Share language is now state-aware: join while registration is open, follow while play
is active, and see the bracket after completion. This kind of exact handoff is higher priority than
another channel, incentive, or speculative mini-app wrapper.

[^basecamp]: [Base — The State of Base at BaseCamp 2025](https://blog.base.org/the-state-of-base-at-basecamp-2025)
[^summer]: [Base — Onchain Summer II](https://blog.base.org/onchain-summer-ii-is-coming)

## 01:45 PDT measure the public object without identifying its carrier

Public Chess replays and brackets can be opened and shared without X, but the aggregate share endpoint
still required a linked X session. Anonymous viewers received `401`; their X intent opened normally,
so the visible feature worked while the evidence gate silently lost its most relevant acquisition
event.

The endpoint now treats page opens, buy intents, replay shares, and tournament shares as the same narrow
class: an exact first-party origin may increment one aggregate counter, while identities, handles,
wallets, balances, content, URLs, and destinations are neither required nor stored. Cells remain
suppressed below five and the public response continues to say events are not unique users or
conversion. Missing-origin requests still fail with `403`.

This is also the better distribution primitive. Farcaster emphasizes one-click social discovery, but
that does not require copying its social graph into Dasha.[^miniapps] Solana Mobile's current publisher
policy requires transparency about user-data collection and deletion; avoiding new user data is
stronger than collecting it merely to measure a share button.[^mobile-policy]

[^mobile-policy]: [Solana Mobile — Publisher Policy](https://docs.solanamobile.com/dapp-store/publisher-policy)

## 02:15 PDT durable evidence, temporary network

Chess previously wrote its session-deduplication marker before posting an aggregate event and never
removed it when the request failed. A transient outage therefore converted “not delivered” into
“already counted” for the remainder of the tab session. The client now removes only the failed
marker. The next genuine action retries; after one successful response, later duplicates remain
suppressed. A browser regression aborts the first replay-share event, proves the second succeeds, and
proves there is still only one accepted event.

The current holder-utility market offers more aggressive patterns. Munity markets token-gated clubs,
fee discounts, subscriptions, rebates, and a burn-to-signal tier.[^munity] Older engagement-score
systems explicitly proposed rewards and whitelists while acknowledging that liquidity incentives can
attract short-term mercenary capital.[^polyscore] Dasha should not copy either incentive stack.

The cleaner demand loop is already visible in the product architecture:

1. Public quiz results, images, brackets, and replays attract attention without a wallet.
2. One exact-mint path lets an interested person acquire voluntarily.
3. Current ownership opens a live Chess or tournament seat immediately.
4. Ratings, games, brackets, and replays make the utility persistent without requiring the wallet to
   stay connected or publishing its balance.
5. The resulting public object can bring the next viewer back to step one.

This may support organic purchase demand because ownership grants an experience. It does not justify
staking, burning, holding-duration bonuses, token-weighted status, withdrawal penalties, or rewards
for suppressing sales. Those mechanisms optimize market behavior rather than product value.

[^munity]: [Munity — token-gated creator clubs](https://munity.club/)
[^polyscore]: [Polygon — PolyScore](https://polygon.technology/blog/polygon-unveils-polyscore-the-ultimate-measure-of-member-engagement)

## 02:45 PDT the URL is the product state

An offline load of `?game=…` correctly showed “Replay unavailable,” but reconnecting refreshed generic
identity and tournament state instead of retrying the game encoded in the URL. The public acquisition
link survived; its promised scene did not. Startup, OAuth completion, reconnect, and foreground resume
now share one route-aware recovery path. Replay URLs reload the exact replay; tournament and home URLs
retain their existing authoritative refresh.

Current platform direction supports keeping that logic in the standard web route. Base says that after
April 9, 2026 its app treats integrations as standard web apps rather than requiring a Farcaster
manifest, and maps navigation back to ordinary `window.open` plus explicit deep links.[^base-web]
Phantom likewise recommends universal links and offers browser deep links that open an exact web page
inside its mobile wallet.[^phantom-links] Dasha therefore does not need a parallel mini-app codebase to
gain portable distribution. Its existing URLs must first be durable, stateful, and recoverable.

[^base-web]: [Base — Migrate to a Standard Web App](https://docs.base.org/apps/guides/migrate-to-standard-web-app)
[^phantom-links]: [Phantom — Deep links](https://docs.phantom.com/phantom-deeplinks/deeplinks-ios-and-android)

## 14:53 PDT discovery surfaces + challenge lifecycle

Fresh 2026 product evidence strengthens two ideas without justifying another economy. Solana Mobile's
dApp Store passed 1,000 apps and now treats themed curation, reviews, public developer replies and
weekly feedback summaries as first-class discovery infrastructure. Its hackathon winners skew toward
mobile PvP games and playable social feeds, while the official recap explicitly identifies everyday
habit formation—not catalog size—as the new problem.[^sol-mobile-discovery][^sol-mobile-winners]
Chess.com's current friend flow similarly makes a live challenge short-lived and begins the game as
soon as the opponent accepts.[^chess-friend]

For Dasha, the weakest supported conclusion is not “build a mobile app,” “add rewards,” or “add more
games.” It is: make one public object reliably recruit one next participant, and observe the resulting
funnel. Explicit product direction advanced direct challenges ahead of the earlier evidence gate.
That override is now documented instead of pretending the earlier conditional was satisfied.
Challenges reuse X identity, current holder proof, ratings, games and replays; grant no points or
financial reward; expire after 30 minutes; and measure aggregate creation, acceptance and share intent.

The post-release lifecycle audit found a concrete defect: acceptance created the game on the server,
but the challenger's still-open browser never refreshed the challenge. The opponent could start while
the creator remained on an “Open” card. The client now polls only an open challenge through its
existing timer and loads the creator's authoritative game immediately when acceptance appears. It
stops when hidden or no longer open. A 390×844 browser regression proves the open → accepted → board
transition without refresh. This is a reliability fix, not a notification system; push, contacts,
chat, WebSockets, prize pools and a second matchmaking engine remain unsupported.

The next discriminating read is challenge creation → acceptance → completed game. If links are created
but not accepted, improve invitation clarity/distribution. If accepted but not completed, repair game
and mobile friction. If completed and shared, consider one curated Chess spotlight on the existing
home surface before packaging a separate app.

[^sol-mobile-discovery]: [Solana Mobile — 1,000+ dApps, Smarter Discovery, and a Bigger Seeker Season](https://solanamobile.com/blog/1-000-dapps-smarter-discovery-and-a-bigger-seeker-season)
[^sol-mobile-winners]: [Solana Mobile — Hackathon Winners](https://solanamobile.com/blog/solana-mobile-hackathon-winners-announced)
[^chess-friend]: [Chess.com — How do I play a friend?](https://support.chess.com/en/articles/8588467-how-do-i-play-a-friend)

## 15:00 PDT replay-to-play conversion audit

The current privacy-safe read still suppresses every Chess cell below five: page opens, buy intents,
starts, completions, replay shares, challenge creation/acceptance/shares, and tournament activity.
This proves only low disclosed volume, not that any particular conversion is zero.

Apple's current challenge guidance says entry points belong in contextually relevant locations and
invitation links should deep-link into the exact activity without unrelated interruption. Its Games
guidance makes the corresponding viewer action explicit: tap **Play** and enter the associated
activity.[^apple-challenge-context][^apple-game-center]

Dasha's public replay violated the first half of that loop. It rendered the complete game, Share, and
sometimes Tournament, but offered no direct route into Chess. The only product handoff was the global
header's token purchase link. That asked a curious viewer to infer the playable experience rather than
showing it. The prepared replay now presents one primary **Play** link to `/chess` beside Share; the
normal route then handles X linking, Board enrollment, and current holder proof in order. It does not
bypass the access gate, add a new modal, or place a purchase button inside the board.

The same audit caught a separate reliability regression: `shareGame` had two identical click listener
registrations. One press could invoke the browser share surface twice even though the aggregate event
was session-deduplicated. The duplicate listener is removed, and the static regression now requires
exactly one Share handler plus a visible, viewport-safe Play link on public replay at 390×844.

The strongest attention path remains a portable result that offers one obvious next action. Do not
add a replay carousel, autoplay, comments, reactions, token rewards, or a second social feed while all
Chess cells remain suppressed. If replay traffic later discloses without play, instrument a narrowly
defined replay→Play intent before changing incentives.

[^apple-challenge-context]: [Apple — Creating engaging challenges from leaderboards](https://developer.apple.com/documentation/gamekit/creating-engaging-challenges-from-leaderboards)
[^apple-game-center]: [Apple — Get started with Game Center](https://developer.apple.com/videos/play/wwdc2025/214/)

## 15:08 PDT temporary invitation clarity

Current consumer crypto products increasingly bundle identity, rooms, token gates and notifications;
Cherry, for example, markets wallet-to-wallet messaging plus gated rooms as an embedded community
stack.[^cherry] Solana's recent consumer-app recap points instead to distribution partnerships,
wallet abstraction and products reaching existing audiences.[^accelerate-consumer] Neither pattern is
evidence that Dasha needs another messenger, push permission, or social graph. Lobby already supplies
presence, while Chess needs its temporary invitation to be legible and dependable.

The challenge UI placed `Dasha's challenge` under a fixed **Tournament** heading and never showed the
30-minute expiry already enforced by the server. The data contract was correct, but its presentation
misclassified the object and concealed a condition relevant to acceptance. The shared side panel is
now titled **Play**, which truthfully covers casual challenges and tournaments, and an open challenge
shows its rounded remaining minutes. Existing 2.5-second open-challenge refresh updates the label and
authoritative status; no second timer, scheduler, notification, or stored preference was added.

This is the appropriate current scope. A temporary one-to-one table can create useful voluntary holder
demand because access opens an actual game. Artificial scarcity, lockups, paid raids, buy-and-burn
competitions, holder-weighted points and rewards for not selling remain outside the product contract.

[^cherry]: [Cherry — wallet-to-wallet Solana community messaging](https://cherry.fun/)
[^accelerate-consumer]: [Solana — Accelerate USA consumer-app recap](https://solana.com/news/accelerate-usa-recap)

## 15:15 PDT invitation action hierarchy

The incoming challenge rendered both **Share** and **Accept** with the same acid-filled primary style.
That made distribution and starting the promised game visually equivalent. Apple's current button
guidance recommends a prominent style for the most likely action and a less prominent style for the
remaining choices; too many prominent controls increase decision cost.[^apple-buttons]

The prepared challenge now has one context-dependent primary action. An eligible invitee sees
**Accept** first and prominent, with Share secondary. The creator sees Share prominent and Cancel
secondary. An ineligible public viewer retains Share as the only action and receives the existing
compact access explanation. Button labels, 48px hit targets, security gates and server actions are
unchanged. Mobile tests assert order and exact visual roles for both creator and invitee.

This is also the appropriate conversion model for the coin: make the useful holder action obvious,
while leaving acquisition voluntary and separate. Do not increase purchase pressure through fake
urgency, token-weighted matchmaking, exit penalties, coordinated raids, or promised returns.

[^apple-buttons]: [Apple Human Interface Guidelines — Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)

## 15:23 PDT replay recruitment measurement

Adding **Play** to a replay closed the visible conversion gap but left the decision system blind. The
existing Chess `page_open` combines home, challenge, tournament and replay traffic, while
`replay_share` measures outbound intent after a game. Neither answers whether a portable replay itself
recruits a viewer into the holder-gated game.

The prepared aggregate schema adds exactly three public cells: replay opens, replay Play intents, and
the thresholded open→Play ratio. A successful replay load records one event per replay/browser session;
pressing Play records one event before normal `/chess` navigation. Events carry only a fixed enum. They
contain no game ID, URL, handle, X ID, wallet, balance, referrer, timestamp, device fields or source
slice, and every public cell remains hidden below five. This follows the W3C data-minimization principle
that sites should transfer only what is necessary for the stated purpose.[^w3c-privacy]

Normal fetch can be cancelled when an anchor navigates. The Play intent therefore uses Fetch's native
`keepalive` option, intended for small requests that must survive page unload, while retaining the
existing response-aware retry behavior.[^fetch-keepalive] No analytics SDK, cookie, beacon endpoint,
fingerprint, campaign parameter or per-person record was added.

This funnel creates a clean next decision. Replay opens without Play intent indicate invitation/CTA
friction. Play intent without game starts indicates X, enrollment, holder-proof or matchmaking
friction. Starts without completions indicate gameplay reliability. Only after a cell discloses should
the corresponding step change. It does not justify paid acquisition, artificial trading volume,
rewards for buying, penalties for selling, or claims that attention causes price appreciation.

[^w3c-privacy]: [W3C — Privacy Principles](https://www.w3.org/TR/privacy-principles/)
[^fetch-keepalive]: [MDN — Request keepalive](https://developer.mozilla.org/en-US/docs/Web/API/Request/keepalive)

## 15:31 PDT clock-expiry adjudication

The rules audit confirms that automatic third repetition is correct for this online playing zone:
FIDE's Online Chess Regulations require the platform to declare the third occurrence drawn, even
though over-the-board Laws describe a player claim. The same online rules require an automatic draw
when the opponent cannot checkmate by any possible legal sequence.[^fide-online-current]

Dasha's move engine already ended stalemate, third repetition, 50 moves and insufficient material at
the shared move boundary. Clock expiry bypassed that boundary and always awarded the non-expired side
a win. A malformed/legacy or directly restored active dead position could therefore produce a false
rated victory, persisted replay and tournament advancement.

The dead-position predicate is now an exported engine rule reused by clock adjudication. Timeout in a
dead position produces `1/2-1/2 · timeout · no mating material`; timeout with mating material remains a
win. Both outcomes continue through the same rating, replay and tournament finalizer. Engine tests
cover bare kings versus rook material, and Worker tests prove both timeout branches. No claim button,
arbiter workflow, chess library or new client control was added.

[^fide-online-current]: [FIDE — Online Chess Regulations](https://handbook.fide.com/chapter/OnlineChessRegulations)

## 20:15 PDT canonical objects, mobile discovery, and challenge handoff

Fresh 2026 consumer launches reinforce three distinct patterns. Tokens.xyz collapses many contract-level
representations into one canonical asset page, then routes execution outward; Paragraph now exposes its
archive and paid files to people and agents through the same API/CLI/MCP surface; Solana Mobile crossed
1,000 apps and added a rotating four-app Spotlight because catalog size alone no longer creates
discovery.[^tokens-asset][^paragraph-agent][^seeker-discovery] The shared principle is not “add more
features.” It is: give each meaningful object one durable URL, a legible preview, and one next action.

Dasha already has the right object graph: one canonical mint, Studio artifacts, quiz results, Chess
challenges, tournament brackets, and replays. Do not mint each artifact, add another feed, or merge them
into an activity-points economy. The next product work is to improve the handoffs among those objects and
measure voluntary completion. A small later opportunity is an agent-readable public artifact index—no
wallet action and no paywall—only after enough real artifacts exist to justify discovery beyond the
sitemap.

Solana Mobile's newest winners span companion pets, short-session multiplayer games, physical scavenger
hunts, creator/social rooms, and swipeable prediction markets.[^seeker-winners] What transfers to Dasha is
the compact repeatable ritual and mobile-native handoff, not their token rewards or feature breadth.
Package the existing responsive Chess route only after starts, completions, or replay-to-Play recruitment
disclose. Until then, a dApp listing would redistribute a tiny audience across another shell.

The accompanying Chess audit found a direct-link hierarchy defect. An exact challenge URL put the
challenger and Accept action in the lower Play panel while the first screen still showed generic
matchmaking or identity copy. On mobile, the shared object's reason for opening the page could sit below
the fold. The prepared client now makes the challenge the first-screen context: `@creator challenges
you`, `Dasha has white. Take Anna.`, and exactly one valid primary action—Link X, Join, Prove, or Accept.
Share remains secondary, creators retain one Share action, and server authorization is unchanged. Tests
cover eligible and anonymous challenge links at 390px and 320px, one Accept control, no impossible
anonymous Accept, and no horizontal overflow.

Product sequence from this evidence:

1. Publish the prepared homepage Chess discovery and challenge-handoff changes only with fresh authority.
2. Wait for one downstream Chess cell to disclose; repair that first measured transition.
3. After five completed games, schedule one named cup using the existing tournament object.
4. After twenty completed games, derive one attributed weekly position from a real replay.
5. After five replay-share intents and visible replay-to-Play traffic, evaluate animated replay export or
   Solana Mobile packaging—not both at once.

No trading reward, referral payout, balance-weighted access, holding-duration bonus, sell penalty, or
manufactured activity belongs in this sequence. Sustainable demand can come from a public culture people
choose to circulate and a live holder utility they return to; the evidence does not support coercive or
gameable financial mechanics.

[^tokens-asset]: [Solana — One Page Per Asset: Inside Tokens.xyz](https://solana.com/tr/news/inside-tokens-xyz)
[^paragraph-agent]: [Paragraph — Paragraph is now AI-native](https://paragraph.com/%40blog/paragraph-is-ai-native)
[^seeker-discovery]: [Solana Mobile — 1,000+ dApps and smarter discovery](https://solanamobile.com/blog)
[^seeker-winners]: [Solana Mobile — Monolith Hackathon winners](https://solanamobile.com/blog/solana-mobile-monolith-hackathon-winners-announced)

## 20:40 PDT durable discovery versus temporary invitations

Google's current crawler guidance distinguishes canonicalization from indexing control. A canonical is
a representative among duplicate or similar pages and remains a hint; `noindex` is the direct page-level
instruction not to show a URL in search results, and the page must remain crawlable for that instruction
to be observed.[^google-canonical][^google-robots] Google also warns that changing a robots directive
later with client JavaScript may be skipped once `noindex` is encountered.[^google-js] The directive
therefore belongs in the server-rendered Chess head.

Dasha's Chess objects have different lifetimes:

- `/chess`, completed replays, and tournament brackets are durable, useful public pages and remain
  `index,follow` with self-referential canonical URLs.
- challenge links expire after thirty minutes and are eventually deleted. They now render
  `noindex,follow` from the Worker while retaining their exact canonical URL, title, description, Open
  Graph tags, and X card. They remain shareable invitations without becoming stale search results.
- missing or malformed object IDs continue to fall back to the generic indexable Chess page and never
  advertise the invalid query as canonical.

This is a discovery-integrity improvement, not an acquisition claim. Search should surface durable
proof of the product—real replays and brackets—while social sharing carries temporary invitations. The
same lifecycle rule should govern future public objects: decide retention and indexing together; do not
put expiring gates in the sitemap or use `robots.txt` as a substitute for page-level indexing policy.

[^google-canonical]: [Google Search Central — canonicalization](https://developers.google.com/search/docs/crawling-indexing/canonicalization)
[^google-robots]: [Google Search Central — robots meta specifications](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
[^google-js]: [Google Search Central — JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

## 21:05 PDT embedded distribution and tournament portability

The current distribution landscape argues for keeping Dasha's standard web app portable. Base's April
2026 migration treats apps as standard web apps rather than requiring the older Farcaster mini-app SDK,
while Solana Mobile's thousand-app catalog has shifted attention toward curated Spotlight placement,
reviews, and repeat use.[^base-standard][^seeker-spotlight] A wrapper or manifest is therefore not a
substitute for a self-contained route that loads well, shares cleanly, and gives the visitor one next
action. Phantom's browse link similarly opens an ordinary URL inside its wallet browser; it does not
require a second app implementation.[^phantom-browse]

The Chess share audit found one inconsistent public object. Replays generated a native image share with
an X fallback, and direct challenges used the native share sheet with an X fallback, but tournament
brackets always opened an X composer. On mobile this prevented the user from choosing messages, mail,
AirDrop, or another installed destination even though the browser already exposed that capability.

The prepared tournament path now:

- calls the native Web Share API from the original button activation when available;
- shares the exact canonical tournament URL, name, participant count, and lifecycle-specific action;
- says Join during registration, Follow during active play, and See the bracket after completion;
- falls back to the existing encoded X intent if native sharing is absent or fails;
- ignores an explicit user cancellation rather than opening a second surface;
- retains the fixed privacy-safe tournament share-intent event.

This is the cheapest useful attention improvement: make a real communal artifact travel through the
channels a participant already uses. Do not build a Dasha social feed, contact graph, mobile wrapper, or
cross-chain version until those portable objects recruit measurable visitors or players.

[^base-standard]: [Base docs — migrate to a standard web app](https://docs.base.org/apps/guides/migrate-to-standard-web-app)
[^seeker-spotlight]: [Solana Mobile — 1,000+ dApps and smarter discovery](https://solanamobile.com/blog/1-000-dapps-smarter-discovery-and-a-bigger-seeker-season)
[^phantom-browse]: [Phantom docs — browse deep links](https://docs.phantom.com/phantom-deeplinks/other-methods/browse)

## 21:30 PDT holder utility, refresh cadence, and wallet privacy

Current token-gating products reveal a useful design boundary. Collab.Land checks whether a wallet meets
a rule and typically revalidates qualifying roles every 24 hours; Guild automatically removes access
when a connected wallet no longer satisfies its balance requirement.[^collab-refresh][^guild-balance]
Those products prove recurring eligibility is a normal access-control primitive, not that a project
should reward larger balances, longer holding, or financial activity. Recent wallet-privacy research
also identifies browser-wallet interactions and provider exposure as meaningful privacy surfaces, which
supports minimizing both connection frequency and retained identifiers.[^wallet-privacy]

Dasha's existing gate is already the weaker and more private construction for its current scope:

- any positive current $dasha balance qualifies; balance size does not change access or rating;
- the player signs a five-minute, origin-bound challenge and makes no transaction;
- the server checks the balance, then discards the wallet address and exact balance;
- only a boolean holder state and timestamps remain on the linked X profile;
- access lasts 24 hours, after which a fresh proof is required for a new queue, challenge acceptance,
  tournament start, or rematch; an active game is never interrupted mid-play.

The audit found a copy mismatch rather than a protocol defect. Chess said access was immediate but did
not disclose the 24-hour validity visible in the server contract. The prepared gate now says `One
signature. No transaction. 24h access.` and successful proof confirms `Access open for 24h.` This makes
the membership term legible without adding a countdown, public wallet badge, balance display, wallet
storage, new dependency, or extra click.

Do not convert this boolean access rule into token tiers, balance-weighted Chess ratings, renewal points,
holding streaks, sell penalties, or paid entry. The sustainable-demand thesis remains simpler: a person
may choose to hold because one coin opens a recurring cultural experience; the product must earn that
choice through the experience itself.

[^collab-refresh]: [Collab.Land docs — background balance checks](https://docs.collab.land/help-docs/command-center/bot-config/balance-check/)
[^guild-balance]: [Guild docs — token balance requirements](https://docs.guild.xyz/guild/how-to-setup-requirements/token-balance)
[^wallet-privacy]: [The Masks We (Think We) Wear: Privacy Threats of Browser-Extension Wallets](https://arxiv.org/abs/2607.06141)

## 22:00 PDT exact-position replay artifacts

Mature chess products make the completed game portable in several forms. Lichess turns imported PGN
into a browsable public replay and documents FEN as the portable representation of one position;
Chess.com exposes URL, PGN, GIF, image, and embed sharing from a game.[^lichess-import][^lichess-blind]
The useful distinction is between a durable game identity and a temporary viewing position. Dasha
already has both data layers—one replay ID and ordered server-derived frames—but previously shared only
the final frame.

The prepared replay now treats the selected ply as URL state:

- moving through the range, arrow controls, scorebook, or Home/End updates `ply` with
  `history.replaceState`, creating no navigation or server write;
- an exact `?game=<id>&ply=<n>` link clamps safely to available frames and survives reload;
- the final frame keeps the short existing game URL, while earlier positions carry `ply`;
- Share uses the selected position URL and renders that same board frame into the existing 1200×630
  image rather than silently reverting to the result position;
- the share sentence says `Replay from move N` or `Replay from the start`;
- the server keeps canonical and Open Graph metadata consolidated on the durable game URL, so position
  links do not fragment search identity.

This enables organic commentary and “look at this moment” sharing without engine evaluation, FEN
exposure, annotations, accounts, new database fields, or another button. If real position-link traffic
later appears, the same primitive can power one curated weekly position derived from an actual game.
Until then, do not add a puzzle economy, prizes, streaks, or generated analysis.

[^lichess-import]: [Lichess — Import game](https://lichess.org/paste)
[^lichess-blind]: [Lichess — Blind Mode tutorial and PGN/FEN portability](https://lichess.org/page/blind-mode-tutorial)

## 22:30 PDT rating integrity and unplayed results

FIDE's current rating regulations state that, except for fair-play exceptions, a game becomes rateable
after both players have made at least one move. Its online regulations separately name sandbagging,
match fixing, rating fraud, and fictitious games as competition manipulation.[^fide-rating][^fide-online-integrity]
Dasha is not a FIDE rating pool, but the threshold expresses the weakest sensible invariant for its own
small Elo ladder: clicking Resign immediately after pairing must not transfer rating.

The audit proved that the previous Worker settled every finished state, including a version-zero
resignation with no moves. A player pair could therefore manufacture ladder movement without playing
chess. The prepared settlement now:

- counts the table as completed for product reliability metrics and preserves its result/replay;
- marks settlement processed exactly once;
- changes ratings and W/L/D records only after at least two plies, one move by each player;
- exposes the finished game's rating truth to participants;
- says `Game complete · unrated` for an early result and retains `Rated game complete` for a legitimate
  game;
- keeps timeout, legal draws, checkmate, ordinary resignation, tournaments, and rematches unchanged once
  both players have moved.

This closes a concrete ladder-farming path without pretending to solve engine assistance, collusion, or
identity sharing. Do not publish accusations, suspicion scores, or automated fair-play claims. If real
volume later reveals repeated paired forfeits, review private aggregate patterns before considering any
additional control.

The current fixed-K Elo remains adequate for a tiny pool. Glicko-2 models rating uncertainty and
volatility, but adopting it now would add state and explanation cost without enough games to estimate
those values meaningfully.[^glicko2] Correct result settlement matters before rating sophistication.

[^fide-rating]: [FIDE — Rating Regulations](https://handbook.fide.com/chapter/B022024)
[^fide-online-integrity]: [FIDE — Online Chess Regulations](https://handbook.fide.com/chapter/OnlineChessRegulations)
[^glicko2]: [Mark Glickman — Glicko-2 worked example](https://glicko.net/glicko/glicko2.pdf)

## 15:39 PDT direct challenge distribution

The direct challenge is a one-to-one invitation, but its Share action always opened an X composer.
That was appropriate for public promotion and poor for sending the exact table privately through the
recipient's existing mobile channel. Current crypto invite products likewise center portable links;
the useful primitive is the link, not ownership of another contacts or messaging graph.[^squadmint]

The W3C Web Share API gives an HTTPS page a user-activated native chooser without revealing which
targets exist or which target the person selects.[^web-share] The prepared challenge Share action now
uses that chooser for title, concise invitation text and the canonical challenge URL. Browsers without
Web Share retain the exact X intent. Cancelling the chooser does nothing; a genuine API failure falls
back to X. The existing aggregate challenge-share intent remains session-deduplicated and does not
claim that a recipient received the link.

This adds no contacts permission, recipient list, DM access, clipboard read, referral code, reward or
new dependency. Mobile browser coverage verifies the native payload; desktop coverage verifies the X
fallback and exact URL. Tournament and replay sharing remain unchanged because their public broadcast
purposes differ from a direct invitation.

[^squadmint]: [Squadmint — share-a-link invitation model](https://www.squadmint.com/)
[^web-share]: [W3C — Web Share API](https://www.w3.org/TR/web-share/)

## 23:20 PDT public-artifact discovery without another social graph

Fresh consumer-crypto launches continue to cluster around wallet messaging, verified-human feeds,
creator memberships, and tokenized attention. Circle3 combines community chat, wallet identity, and
reputation; PRSN gates a forum behind proof of humanity; The Spot combines memberships, events, and
group chat; Shyft puts creator-token trading directly in a feed.[^circle3][^prsn][^spot][^shyft]
Those products validate demand for identity and community, but they do not establish that Dasha needs
another feed, wallet messenger, creator token, or reputation system. Dasha already has linked X,
holder-gated Chess, a public lobby, Studio artifacts, quiz results, and a Simp Board. Duplicating the
category would fragment a small audience and expand moderation and financial-risk surfaces.

The missing primitive is discovery of artifacts Dasha already produces. Chess.com treats game history,
public collections, links, PGN, images, and replays as durable ways to browse and redistribute completed
play.[^chess-archive][^chess-collections][^chess-share] Dasha already stored finished games and served
public exact replays, but a visitor needed a preexisting link. The prepared Chess response now carries a
five-item recent shelf alongside the existing rating response. It includes only rated completed games,
only public handles, result, and replay ID; it excludes X IDs, wallets, balances, boards, move payloads,
and active games. The panel is absent when empty and every row leads to the existing replay.

Because discoverability changes the practical privacy boundary, the first screen now states `Rated
games are public.` This is not an activity feed, spectator system, player profile, follow graph, or
analytics claim. It creates one path from Chess home to real cultural evidence and from a replay back to
Play. Measure replay opens and replay-to-Play intent before considering collections, curation, a weekly
position, or mobile packaging. Do not reward views, shares, purchases, trades, or holding duration.

The follow-up state audit found that `updatedAt` is not a completion timestamp: rematch offers mutate it.
Sorting discovery by that field would let an old game reappear as recent without a new result. Finished
games now record `finishedAt` once, later rematch activity preserves it, and the shelf sorts on that
immutable value with an `updatedAt` fallback solely for pre-migration records. Tests prove the five-row
cap, exclusion of newer unrated results, correct completion ordering, empty-state removal, and the
bounded public shape.

This choice also matches newer community research. A 2026 network-and-discourse analysis distinguishes
socially embedded ecosystems with sustained narrative participation from fragmented, transaction-only
networks.[^tokens-to-ties] Human Integrity Protocol and Human.tech's Covenant both center durable,
verifiable artifacts rather than ephemeral paid engagement.[^hip][^covenant] The transferable lesson is
to give real Dasha outputs stable identity and discovery, not to put every output onchain or claim human
authorship. Replays, quiz cards, and Studio exports should remain first-party public artifacts; economic
scoring, artificial hype, and coordinated social campaigns remain rejected.

[^circle3]: [Circle3 — crypto community messaging app](https://play.google.com/store/apps/details?id=app.circle3.android)
[^prsn]: [PRSN — proof-of-humanity social platform launch](https://prsn.you/news/prsn-launches-proof-of-humanity-platform)
[^spot]: [The Spot — creator and community memberships](https://thespot.app/)
[^shyft]: [Shyft — Web3 social app](https://apps.apple.com/us/app/shyft-web3-social/id6763483494)
[^chess-archive]: [Chess.com — game archive](https://support.chess.com/en/articles/8598090-how-do-i-view-my-own-games)
[^chess-collections]: [Chess.com — public and community game collections](https://support.chess.com/en/articles/13557248-how-do-i-use-game-collections)
[^chess-share]: [Chess.com — share a game](https://support.chess.com/en/articles/14463498-how-do-i-share-a-game-link-pgn-gif-or-image)
[^tokens-to-ties]: [Kuskova and Zaytsev — From Tokens to Ties](https://arxiv.org/abs/2604.18761)
[^hip]: [Human Integrity Protocol](https://hipprotocol.org/)
[^covenant]: [Human.tech — Covenant community artifacts](https://docs.human.tech/community)

## 23:50 PDT Chess timeout integrity and recurring utility

FIDE's online rule is player-specific: a flag loses unless the opponent cannot checkmate by any possible
series of legal moves.[^fide-online-time] That is not equivalent to asking whether the whole position is
already dead. The prior Worker used the dead-position test. If Dasha flagged with a pawn remaining while
Anna had only a king, the pawn made the position non-dead and Anna could incorrectly receive a win even
though a bare king can never deliver checkmate. Resignation had the same asymmetry despite FIDE applying
the possible-mate exception there too.[^fide-laws-resign]

The prepared engine now evaluates the non-flagging or non-resigning side's mating material. It covers
bare king, one-knight helpmate constraints, bishop color complexes, opposing pawn/knight helpmates, two
knights, and normal pawn/rook/queen material. The implementation follows the standard-chess cases
documented by Lichess's MIT-licensed scalachess rules without importing code or a dependency.[^scalachess-imm]
Timeout and resignation share that single function; ordinary wins, dead-position draws, rating
settlement, tournament advancement, and replay generation remain unchanged. Public replays also retain
the immutable completion time instead of later rematch activity.

Permanent regressions now pin three easily-misimplemented edges from that upstream rule model: a lone
knight may possibly mate when an opposing rook can block escape; a lone bishop cannot mate merely
because the opponent has a queen; and opposite-color bishops can permit a mating position.

Fresh product research reinforces the product boundary. Solana Mobile's latest season uses staking,
rewards, and ecosystem activity tracking at platform scale, while Paragraph combines discovery,
subscriptions, publishing APIs, agents, and experimental writer coins.[^skr-live][^paragraph] Neither model
transfers cleanly to a small personality-centered coin. Dasha should not clone inflation rewards,
activity tracking, post coins, or popularity-ranked financial objects. The transferable primitives are
recurring access, clear standards, portable artifacts, and discovery between real outputs. Chess earns
voluntary recurring holder utility only if its rules and records are trustworthy.

[^fide-online-time]: [FIDE — Online Chess Regulations, Article 4.4](https://handbook.fide.com/chapter/OnlineChessRegulations)
[^fide-laws-resign]: [FIDE — Laws of Chess, Article 5.1.2](https://handbook.fide.com/chapter/e012023)
[^scalachess-imm]: [Lichess scalachess — insufficient mating material](https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/InsufficientMatingMaterial.scala)
[^skr-live]: [Solana Mobile — SKR is live](https://solanamobile.com/blog/skr-is-live)
[^paragraph]: [Paragraph product updates](https://paragraph.com/%40blog)

## 00:20 PDT clock-boundary integrity and repeat participation

The server checked timeout before reading a move request body. With only milliseconds remaining, that
initial check could pass, body parsing could cross zero, and the later clock update would clamp the
negative remainder to zero before adding the five-second increment. A post-flag move could therefore be
accepted. The prepared Worker repeats the authoritative expiry check immediately after parsing and
before version validation or move execution. A deliberately delayed streaming request proves that the
clock expires, the move list remains unchanged, the server returns the finished game, and the timeout is
persisted. This covers moves, draw offers, resignations, and rematch requests through the same route
boundary without moving clock authority into the browser.

Recent engagement research suggests a useful distinction for the next product cycle. A randomized
10,000-user educational-app trial found persistent participation after a bounded contest ended, but a
2026 crypto-community study found sustained engagement depends on balancing technical and social
interaction, decentralized participation and guidance, and scale with authentic community feeling.[^contest-persistence][^crypto-paradoxes]
Farcaster incentive research reports wide participation ranges alongside extreme wealth concentration,
showing that activity alone is not evidence of healthy community value.[^farcaster-incentives]

For Dasha, the responsible transferable pattern is a legible recurring occasion built from the product,
not a permanent paid task layer. A real holder cup or replay-derived position can become a bounded
community moment only after genuine completed-game volume reaches the existing trigger. It should use
the current tournament, challenge, replay, and share primitives; have no prize, trade requirement,
streak penalty, referral payout, or engagement points; and remain optional. The next measurement is
returning play and replay-to-Play intent, not clicks purchased with token emissions.

[^contest-persistence]: [Stanford GSB — Contests, Gamification, and Persistent Engagement](https://www.gsb.stanford.edu/faculty-research/publications/contests-gamification-persistent-engagement-educational-technology)
[^crypto-paradoxes]: [Paradoxes of Organising in Crypto Communities](https://sciety.org/articles/activity/10.31235/osf.io/qf2mr_v4)
[^farcaster-incentives]: [Beyond Single-Tokenomics: Farcaster's Pluralistic Incentives](https://arxiv.org/abs/2511.00827)

## 00:45 PDT truthful failure states and trust as retention

The Chess discovery client treated every ratings response as a valid empty result. A network failure or
503 therefore erased the list and rendered `No rated games yet`, falsely converting unavailable data
into evidence of zero activity. The prepared renderer now distinguishes three states: actual rows,
verified empty, and `Table unavailable`. It validates the two arrays before iterating, removes the recent
shelf on failure, and never retains stale results. Mobile browser coverage forces a 503 and proves the
outage cannot masquerade as an empty ladder.

The same audit found that the shared JSON reader threw on a declared body above 4 KiB. Most malformed
JSON already failed closed as an empty input, but this path could escape the route as a server error.
Oversized input now follows the same bounded invalid-input path, and a Worker regression proves a 4xx.
No payload is partially applied.

Recent consumer products make the strategic point concrete. Tokens.xyz consolidates representations of
one asset onto one canonical page; Status leads with privacy boundaries for messaging, wallet, and
community functions; Trust Wallet's new AI feature explicitly describes which wallet data crosses its
provider boundary.[^tokens-canonical][^status-privacy][^trust-ai] These are different products, but the
transferable behavior is precise state and data disclosure. Dasha should build attention through
artifacts that resolve to canonical first-party pages, then retain people by being legible when data is
present, empty, private, or unavailable. Fabricated activity, optimistic placeholders, and silent
failure would undermine both product utility and voluntary holder confidence.

[^tokens-canonical]: [Solana — One Page Per Asset: Inside Tokens.xyz](https://solana.com/news/inside-tokens-xyz)
[^status-privacy]: [Status — private messenger, wallet, and communities](https://status.app/help/getting-started/what-is-status)
[^trust-ai]: [Trust Wallet — Introducing Trust Wallet AI](https://trustwallet.com/blog/company/introducing-trust-wallet-ai)

## 15:47 PDT challenge-card state truth

Open Graph defines a shared page's title as the title of the represented object and its URL as that
object's canonical identity.[^ogp] A challenge preview therefore must describe the current challenge,
not preserve invitation language after the table has been claimed or closed.

The prepared Worker metadata now has three explicit states: an open table says the creator challenges
the recipient; an accepted table says it is claimed; an expired or cancelled table says it is closed.
The canonical challenge URL remains exact, all dynamic text still passes through the existing HTML
attribute escaping boundary, and previews retain the bounded two-minute cache. Worker tests cover all
three states and prevent claimed or closed links from containing the actionable phrase “challenges
you.” No per-link image generator, cache purge system, crawler-specific branch or dependency was added.

[^ogp]: [The Open Graph protocol — basic metadata](https://ogp.me/)
