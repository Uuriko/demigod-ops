# Dasha crypto frontend threat model

**Updated:** 2026-08-09  
**Scope:** getdasha.com links, executable assets, X OAuth, optional wallet proof, and public contribution surfaces.

## Result

No transaction-building, token approval, transfer, airdrop, recovery, or seed-phrase flow exists on Dasha. The only wallet action is an optional Ed25519 message signature for a zero-point holder badge. Its signed text binds the exact product domain, URI, address, Dasha mint, mainnet chain, nonce, issue/expiry times, and purpose; it explicitly says no transaction or public balance. The server consumes the one-use challenge before a finalized exact-mint balance lookup and stores neither wallet nor balance.

The canonical site audit covers Home, Studio, Desk, Lobby, and How-to-buy; Rally is retired to Home. Jupiter is the one public transaction venue. Its links must contain exactly one `sell=SOL` and one `buy=<exact Dasha mint>` parameter and no extras, preventing an unnoticed referral, fee, or tracking parameter from entering the canonical route. Solscan and GeckoTerminal destinations retain the exact mint or canonical pool. Dexscreener links remain rejected because its editable profile exposes unrelated community links. Every new-tab anchor must include `noopener noreferrer`; embedded Dasha clients remain SRI-pinned and the live executable-origin inventory rejects unrecognized scripts and all iframes.

The browser-policy readback now covers every URL in the www sitemap. All six routes currently pass one-year HSTS, framing denial, the narrow CSP, `nosniff`, `no-referrer`, and camera/microphone/geolocation/payment/USB denial. This catches route-specific proxy regressions that a Home-only header probe would miss.

The sitemap is itself treated as untrusted fetch input. The audit reports and refuses foreign-origin, non-HTTPS, credential-bearing, fragmented, duplicate, invalid, overlong, or excessive route inventories before deriving page checks. This follows the sitemap protocol's normal single-host boundary and prevents a compromised sitemap from turning the verifier into an arbitrary-network probe.

The same audit checks claims separately from links. All six public routes currently avoid guaranteed-profit/return language, price promises, risk-free or government-protection claims, fabricated official-token status, claims that Dasha endorses the coin, and unsupported fixed-supply/locked-liquidity/burned-LP/renounced-ownership language. This is a truthfulness control, not a new disclaimer surface.

## Threats and current controls

| Threat | Current boundary | Evidence |
|---|---|---|
| Lookalike token / address poisoning | Full mint appears on Home and Desk; transaction/explorer links are parsed and exact-mint gated | `cryptoLinkViolations`; finalized onchain check |
| Swapped buy destination | The single Jupiter handoff requires exact WSOL sell + exact Dasha buy with no extra parameters | Live audit on every canonical sitemap route |
| Wallet drainer | No transaction or approval construction; no seed/private-key input; optional signed message only | Worker/client source + holder adversarial tests |
| Misleading signature | Human-readable, domain-, mint-, and purpose-bound, expiring, one-use challenge | `walletMessage`, `/simp/wallet/verify` tests |
| Malicious third-party script | Runtime script allowlist; self-owned clients require SHA-384 SRI and readback parity; iframes rejected | `executionViolations`, ship readback |
| Reverse tabnabbing | All `_blank` anchors require both `noopener` and `noreferrer` | `cryptoLinkViolations` |
| User-posted phishing or copycat URL | Lobby parses every URL server-side, allows only known HTTPS hosts, and additionally requires the exact Dasha mint or canonical pool for crypto venues; scored claims remain exact X/PR forms | `linkOk`, `validateMessage`, `isValidEvidenceUrl`, `isValidOssEvidenceUrl` |
| OAuth token misuse | PKCE/state, minimal read-only scopes, access token used once and not retained | identity audit + tests |
| Fake support / recovery path | No Telegram, DM, recovery, airdrop, or unsolicited-support product flow; private GitHub advisory is the security contact | live copy gates + `security.txt` |
| Promissory or false status copy | Concrete profit, price, safety, insurance, official-status, and endorsement claims hard-fail every public route | `MISLEADING_COIN_COPY`, `cryptoClaimViolations` |
| False permanence | Fixed/capped supply, locked/burned liquidity or LP, and renounced-ownership claims hard-fail; null authorities and immutable metadata remain separately verifiable facts | Finalized mint/Metaplex readback + claims gate |
| Hidden crawler claims | Duplicate site identity, app-schema descriptions, license claims, and malformed JSON-LD hard-fail every sitemap route; edge sanitizer retains only the embed-owned visible site identity | `sanitizePublicJsonLd`, `structuredDataViolations` |
| Rerollable reputation | Quiz rank uses stored accuracy `basePoints`; randomized vibe remains cosmetic and cannot alter score on repeated attempts | `quizResultForAttempt`, `scoreProfile`, deterministic score regressions |
| Pool or concentration theater | Finalized RPC pins canonical vault program/mints/owner; balances and top-account concentration remain timestamped observations, never “locked liquidity,” unique-holder, or safety claims | `marketReserves`, `tokenAccountConcentration`, public claims gate |

## Claims and promotion boundary

The SEC Division of Corporation Finance's 2025 meme-coin statement describes a class commonly bought for entertainment, social interaction, and culture, but it is a nonbinding staff view, not a rule or conclusion about Dasha. It expressly preserves a facts-and-circumstances analysis and other agencies' fraud authority. Calling a token a meme coin or adding boilerplate cannot replace the economic reality of how it is promoted.

FINRA's crypto-communications findings apply directly to regulated member firms, not automatically to getdasha.com. They are still a useful claims-quality benchmark: avoid false, exaggerated, promissory, unwarranted, or misleading statements; distinguish third-party venues from the site; and never imply cash-equivalence or statutory protection.

FTC endorsement guidance becomes relevant if Dasha ever gives creators money, tokens, perks, ranking advantages, or anything else of value for public promotion. A material connection must be clear with the endorsement itself. The current product therefore keeps share/engagement points rejected and does not describe ordinary community posts as independent endorsements. Any future compensated creator program requires a separate disclosure design before launch.

The live Desk shell has one narrower presentation defect: its screen-reader heading still says “chart on Dexscreener” while the actual chart route is GeckoTerminal. It is not a link substitution or promissory claim, so the audit records `desk-shell-stale-chart-label` as soft lag. The phrase lives in a separate Webflow navigation embed outside the canonical Desk body. Repair requires exact element readback; the current Webflow refresh credential is invalid, so no element ID is guessed.

An X status URL's username segment is not authorship evidence: X resolves a valid post ID even when the supplied username is wrong. Creator awards remain reviewed rather than automatic, and review must inspect the resolved post author. Any automatic path requires X post lookup and comparison of the returned `author_id` with the linked account; string-matching the URL slug is explicitly insufficient.

The local reference config no longer contradicts the public route: `pairUrl` is the exact GeckoTerminal pool and a focused test pins it. Legacy market-data reads may still name Dexscreener as their non-clickable data provider; that is distinct from a public destination. The Webflow shell defect remains isolated and should not be “fixed” by weakening the audit or rewriting outer DOM from the inner Desk client.

Lobby link validation now applies the same identity boundary to user messages. A trusted hostname alone was insufficient: `jup.ag`, Phantom, Pump.fun, Raydium, Solscan, Rugcheck, Dexscreener, or GeckoTerminal could carry a different mint or pool while still looking familiar in chat. The server now parses URL components with the platform `URL` implementation, rejects credentials and non-HTTPS schemes, and mint-locks or pair-locks each crypto path/query. The client mirrors the same rule before creating an anchor; server rejection remains the security boundary. X, GitHub, and getdasha links retain ordinary host-level allowlisting because they do not select a token transaction or token record.

This follows OWASP's current guidance that an allowlisted domain does not validate attacker-controlled paths or query values, and that known resource selectors should themselves be allowlisted. Phantom's 2026 support guidance likewise recommends the full mint over name search because copycats reuse familiar names and logos.

Studio external media is now bounded separately from executable supply chain. Every built-in image was probed for status, type, dimensions, and anonymous canvas CORS; all 12 passed. Canvas and thumbnail requests set `no-referrer`, and tests allow only reviewed HTTPS media from X's image CDN or Wikimedia. First-party mirroring remains deferred because it would duplicate roughly 2.2 MB of currently healthy assets; trigger it on an observed availability, CORS, or latency failure rather than speculative fear.

Token metadata delivery now has a separate byte-integrity boundary. Finalized Metaplex state points to CIDv0 metadata and image URLs through `ipfs.io`; the on-chain checker pins the exact SHA-256 digest of each currently corroborated payload and compares the same CID through `dweb.link`. A primary digest change or two successful gateways returning different bytes is a hard failure. Alternate-gateway unavailability is only a discovery observation because the pinned primary digest still protects readback.

This is deliberately not described as full CID verification. IPFS documents that CIDv0 identifies a SHA-256 DAG-PB root block and that a CID's multihash generally differs from a simple file checksum after UnixFS chunking and encoding. A correct trustless verifier would need to validate the DAG, not merely compare the downloaded file with the CID digest. No IPLD/UnixFS dependency was added for two 292-byte/18,576-byte immutable assets; the independently corroborated pinned digests close the observed gateway-drift risk with the existing standard library.

## 2026-08-09 exact-mint interaction audit

A shadow-aware browser pass covered every canonical sitemap route at 390×844 and 1440×900. The original audit proved that Jupiter, Pump.fun, Phantom, Raydium, Solscan and GeckoTerminal destinations preserved the exact mint or canonical pool. The later product simplification removed Pump.fun, Phantom, and Raydium as public buy choices; the current contract requires the single Jupiter handoff plus evidence links. All audited routes returned successfully, had no horizontal overflow, and emitted no page errors. Studio rendered its open Shadow DOM, canvas, share action and 43 interactive controls at both viewports—the initial light-DOM scan that saw only navigation was an audit limitation, not a broken Studio.

Two real source defects were prepared in the root Webflow tree: Home and Desk still exposed clickable Dexscreener profile destinations despite the documented stale-profile boundary, and six Desk image links lacked accessible names. Public chart destinations now use the exact GeckoTerminal pool, Desk token artwork uses the immutable IPFS image, and every image link has an explicit accessible name. Dexscreener remains only as the runtime price-data source where the UI truthfully labels it. Root landing/Desk browser tests and the non-publishing release gate pass; these corrections are prepared, not claimed live.

## Residual risks

- A compromise of Webflow, Cloudflare, the deployment token, X identity, or a trusted external venue can still change what users see. Readback, SRI, executable-origin checks, GitHub secret scanning, and exact-link audits reduce but do not eliminate this.
- Third-party image hosts can observe ordinary image requests and replace non-executable imagery. They cannot execute script through an `<img>`, but self-hosting remains the upgrade if availability, privacy, or provenance becomes material.
- A valid message signature proves control of one wallet at one moment, not beneficial ownership, wallet uniqueness, or ongoing token ownership.
- Dasha cannot verify the transaction UI shown by Jupiter after navigation. The exact destination mint is preserved in every outbound transaction route; the external venue remains a separate trust domain.
- Lookalike domains and search ads remain outside site control. Canonical metadata, DNSSEC, `security.txt`, and upstream Jupiter verification are the relevant discovery controls.

## Deliberate non-features

Do not add a Dasha-native swap, Blink, airdrop, approval flow, wallet-wide scoring, recovery form, or transaction proxy without a specific product need and a new transaction-level threat review. The current external exact-mint route is simpler and exposes less signing authority.

## Sources

- [FBI: token impersonation and address poisoning](https://www.fbi.gov/contact-us/field-offices/denver/news/fbi-warns-of-cryptocurrency-token-impersonation-scam)
- [FBI: malicious airdrop links and wallet-draining sites](https://www.fbi.gov/investigate/cyber/alerts/2025/cybercriminals-defraud-hedera-hashgraph-network-non-custodial-wallet-users-through-nonfungible-token-airdrops-disguised-as-free-rewards)
- [Solana: staying safe on Solana](https://solana.com/learn/staying-safe-on-solana)
- [Solana Actions and Blinks specification](https://solana.com/developers/guides/advanced/actions)
- [IPFS content addressing and why a CID is not generally a file checksum](https://docs.ipfs.tech/concepts/content-addressing/)
- [Multiformats CID specification — CIDv0 decoding and DAG-PB semantics](https://github.com/multiformats/cid)
- [Phantom `signMessage`](https://docs.phantom.com/phantom-deeplinks/provider-methods/signmessage)
- [Phantom Sign-In With Solana](https://github.com/phantom/sign-in-with-solana)
- [SEC Division of Corporation Finance: Staff Statement on Meme Coins](https://www.sec.gov/newsroom/speeches-statements/staff-statement-meme-coins)
- [SEC Commissioner Crenshaw: response emphasizing economic reality and facts-and-circumstances analysis](https://www.sec.gov/newsroom/speeches-statements/crenshaw-response-staff-statement-meme-coins-022725)
- [FINRA: crypto asset communications sweep findings](https://www.finra.org/media-center/newsreleases/2024/finra-publishes-crypto-asset-communications-sweep-update)
- [FTC: disclosures for social-media influencers](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers)
- [Google Search: structured-data general guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Schema.org: `license`](https://schema.org/license)
- [GitHub REST API: get a pull request](https://docs.github.com/en/rest/pulls/pulls#get-a-pull-request)
- [X API: get post by ID and `author_id`](https://docs.x.com/x-api/posts/get-post-by-id)
- [OWASP: validate URL paths and parameters, not only domains](https://mas.owasp.org/MASTG-BEST-0072)
- [Phantom: search for a token using its contract address](https://help.phantom.com/hc/en-us/articles/38314239086611-How-to-search-for-a-token-in-Phantom)
