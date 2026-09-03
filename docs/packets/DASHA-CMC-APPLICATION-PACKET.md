# $DASHA — CoinMarketCap application packet (partial preflight)

> Regenerate this packet immediately before CMC submission. Volatile supply, market, and holder figures below are point-in-time captures only.

Captured: 2026-09-03T04:26:16.849Z
Cost lane: free
CMC form: https://coinmarketcap.com/request/
Submission ready: **no** (launch_date_manual_required, cmc_browser_search_required, representative_authority_manual, production_gate_faucet_h1)
Preflight only: yes

## 1. Mint and explorer
- Mint: `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump`
- Explorer: https://solscan.io/token/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump

## 2. Canonical market pair
- Pair: `9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7`
- GeckoTerminal: https://www.geckoterminal.com/solana/pools/9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7
- Raydium: https://raydium.io/swap/?inputMint=sol&outputMint=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump
- Canonical pool created (not launch date): 2025-02-03T15:29:15Z

## 3. Website and official social
- Website: https://www.getdasha.com/
- Stable reviewer page: https://www.getdasha.com/how-to-buy
- X: https://x.com/dash_eats (reachable: yes)
- VRFD portal: https://verified.jup.ag/tokens
- Jupiter token page: https://jup.ag/tokens/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump
- VRFD verified (exact mint): yes

## 4. CoinGecko listing (same mint)
- URL: https://www.coingecko.com/en/coins/dash_eats
- Mint on CoinGecko: `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump`
- Captured: 2026-09-03T04:26:17.175Z
- Rank: 3510

## 5. On-chain Metaplex metadata (primary)
- Mint: `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump`
- Name/symbol: dash_eats/dasha
- JSON URI: https://ipfs.io/ipfs/QmU9TM9DYc8YCxZiZSmvdBcdwWvhHhZvBneoxEAkmgiLxV
- Image URI: https://ipfs.io/ipfs/Qmb4fcJYbM1RSU43bvNPwUjhwGXK42L9xGvjEEijmWtAcg
- JSON resolved: yes
- Source: https://api.mainnet-beta.solana.com getAsset

## 6. Supply, authority, and holders
- Decimals: 6
- Total supply (UI): 999831814.51809
- RPC slot: 443879254 (finalized)
- Mint authority: null
- Freeze authority: null
- Supply source: https://api.mainnet-beta.solana.com
- Holder count: 1318
- Holder source: https://lite-api.jup.ag/tokens/v2/search?query=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump
- Holder methodology: Jupiter token search API holderCount for exact mint; regenerate before submission.
- Circulating supply: No separate circulating-supply methodology is claimed. Total supply and decimals are read from on-chain mint data at submission time; CMC may review rank-affecting supply separately.

## 7. Market activity
- Pool created: 2025-02-03T15:29:15Z
- Liquidity USD: 82820.2651
- 24h volume USD: 207515.131399931
- FDV USD: 478492.990088771
- Source: https://api.geckoterminal.com/api/v2/networks/solana/pools/9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7
- Captured: 2026-09-03T04:26:17.173Z

## 8. Product and repository
- Repository: https://github.com/Uuriko/dasha-desk
- Website title: $dasha
- Jupiter token page: https://jup.ag/tokens/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump

## 9. Representative
- Jonathan Potter <potter@trydemigod.com>
- Authority note: Current maintainer is not the original token deployer/issuer. Confirm @dash_eats and website control before selecting the closest truthful CMC relationship option.

## 10. Name/ticker collision
The ticker DASHA and similar names exist on other chains and assets. Identity is established only by the full Solana mint above; aggregators that map the same mint (CoinGecko dash_eats, Raydium pair, Solscan) are authoritative for this project.

## CMC duplicate search (manual required)
- Probe URL: https://coinmarketcap.com/dexscan/solana/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/
- HTTP status: 302
- Duplicate status known: no
- Browser exact-mint search on CoinMarketCap is required before submission. This HTTP probe does not establish preview/tracked status or absence of an existing request.

## Consistency gate (partial preflight)
- [x] website_mint: 53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump
- [x] coingecko_mint: 53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump
- [x] pool_base_mint: 53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump
- [x] metaplex_mint: 53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump
- [x] metaplex_name_symbol: dash_eats/dasha
- [x] metaplex_uri_resolves: https://ipfs.io/ipfs/QmU9TM9DYc8YCxZiZSmvdBcdwWvhHhZvBneoxEAkmgiLxV
- [x] aggregator_corroboration: metaplex=dash_eats/dasha; coingecko=dash_eats/dasha; jupiter=dash_eats/dasha
- [x] jupiter_mint: 53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump
- [x] jupiter_graduated_pool: 9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7
- [x] vrfd_mint_verified: mint=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump; verified=true; tags=verified,launchpad
- [x] official_x_reachable: https://x.com/dash_eats status 200
- [x] official_x_handle: https://x.com/dash_eats
- [x] holder_count: 1318
- [x] how_to_buy_mint: https://www.getdasha.com/how-to-buy
- [x] how_to_buy_no_confusing_copy: clean
- [x] stable_reviewer_page: https://www.getdasha.com/how-to-buy
- [ ] faucet_h1: https://www.getdasha.com/faucet missing H1 (#77)

## Submission readiness blockers
- launch_date_manual_required
- cmc_browser_search_required
- representative_authority_manual
- production_gate_faucet_h1

## Form answers (draft — not submission-ready)
- Relationship: Community maintainer and operator of getdasha.com (manual CMC dropdown selection required).
- Relationship note: Current maintainer is not the original token deployer/issuer. Confirm @dash_eats and website control before selecting the closest truthful CMC relationship option.
- Launch date (CMC): UNRESOLVED — manual
- Launch date note: UNRESOLVED — select the earliest independently verifiable mint or first-trade date manually before submission. Canonical pool creation time is evidence only, not the CMC launch-date answer.
- Contract: `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump` (Solana)
- Market pair: https://www.geckoterminal.com/solana/pools/9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7

### Project description
$DASHA is a Solana community and culture project built around one canonical mint. The public product at getdasha.com is more than a price page: it includes a wallet-optional activity lobby, token-discovery and buy guidance, creative tools, community games, a faucet, open-source contribution surfaces and emerging bounty/mobile experiments. Browsing does not require a wallet or signature, and transaction actions are designed to remain explicit and non-custodial. The project has continued shipping public software and community tools since launch, with source and contribution history available on GitHub. This request is to establish the correct project identity and canonical Solana mint on CoinMarketCap; it is not a claim of investment safety or guaranteed market activity.

### Differentiator
Dasha treats a meme token as a persistent consumer and open-source culture product rather than a short-lived trading page. The website is useful before wallet connection, exposes the exact mint prominently, and links community activity to public software, creative tools and contribution workflows. The project's current work includes reusable Solana activity/bounty primitives and a separate native Android experiment, while keeping custody and automatic trading outside the product boundary.

> Route reviewers to https://www.getdasha.com/how-to-buy until https://github.com/Uuriko/demigod-ops/issues/77 is fully cleared (faucet_missing_h1).
