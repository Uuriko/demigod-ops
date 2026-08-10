---
status: reference
owner: crypto-research
updated: 2026-08-09
canonical_for: market-quality-decision-2026-08-09
---

# Dasha market-quality decision — 2026-08-09

## Decision

Do not add holder counts, concentration percentages, liquidity scores, volume, “organic” labels or a
risk meter to the public site. Keep exact-mint verification and external chart/explorer routes. Add a
small market-quality observation to the internal onchain summary so operators can detect drift
without mistaking one provider metric for a safety or manipulation verdict.

## Why one metric is insufficient

Recent empirical work treats memecoin risk as multivariate. MemeTrans uses 122 features spanning
context, trading, concentration, time-series and bundle behavior. Cross-chain research identifies
wash trading and liquidity-pool-based price inflation as distinct mechanisms. Work on Pumpfun also
separates concealed accumulation, sniping, wash activity and fabricated attention. These findings do
not validate a universal public score; they show why a raw holder or liquidity number is an
incomplete proxy.

Raw Solana token accounts add a separate attribution problem. A pool vault, exchange account and
individual wallet are different economic roles, and one beneficial owner can control multiple
accounts. Dasha's current probe therefore labels known market vaults and reports both top-ten token
account concentration and top-ten non-market-token-account concentration. Neither is called holder,
owner, whale, decentralization, safety or manipulation evidence.

## Product boundary

Keep public:

- the exact mint and its public source;
- the exact Jupiter route;
- the canonical Raydium pool chart and Solscan route.

Keep internal:

- finalized pool identity and reserve-account read parity;
- top-ten token-account concentration with known market vaults excluded separately;
- incompatible provider holder counts as an explicit disagreement signal;
- the caveat that accounts are not people or beneficial owners.

Do not add:

- a green/red safety badge;
- a single manipulation probability;
- holder-count milestones or concentration marketing;
- volume, price or liquidity celebration;
- claims that immutable metadata, null authorities or current reserves make the token safe.

## Implementation

`npm run --silent dasha:onchain:summary` now includes `marketQualityObservation`. It is deliberately
an observation, not a rating. The full report remains available through `npm run dasha:onchain:check`.
The summary must remain internal unless a future method establishes address classification,
reproducible thresholds, provider provenance and a clear user decision improved by the display.

## Sources

- [MemeTrans: A Dataset for Detecting High-Risk Memecoin Launches on Solana](https://arxiv.org/abs/2602.13480)
- [A Midsummer Meme's Dream: Investigating Market Manipulations in the Meme Coin Ecosystem](https://arxiv.org/abs/2507.01963)
- [Decompose Market Manipulation Strategies: Evidence from On-chain Meme Coin Market](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5953738)
- [Measuring Memecoin Fragility](https://arxiv.org/abs/2512.00377)

## Reconsideration trigger

Reconsider a public market-quality surface only when it changes a concrete verification decision,
uses a reproducible multi-signal method, distinguishes market and program accounts from attributed
beneficial control, exposes freshness and provenance, and passes legal review for public presentation.
