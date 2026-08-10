---
status: reference
owner: crypto-research
updated: 2026-08-09
canonical_for: crypto-economic-control-research-2026-08-09
---

# Dasha crypto economic-control delta — 2026-08-09

## Decision

Do not add creator-fee sharing, holder revenue, buybacks, tokenized Studio outputs or another launch
system. First make the existing token's economic-control boundary explicit: the project does not
currently know or claim who controls the creator wallet, whether the website has any claim on creator
fees, or whether this legacy Raydium-migrated token produces current Pump creator fees.

This is not a negative claim about the token. It is the narrowest statement supported by public and
finalized evidence.

## Exact-mint readback

The public Pump coin endpoint for
`53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump` currently reports:

- creator `65PayE2oiZgpSRXpdZDreJwafnkWwjtGtFwdfckTtpdo`;
- bonding curve `9jLz2oviGgKvTEaKzvGumjo9eqqyynNUiCFYvHfoQgJi`;
- complete migration to Raydium pool `9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7`;
- cashback disabled.

The finalized bonding-curve account is owned by the Pump program but is only 49 bytes. It is a
completed legacy account created before the current onchain creator-field extension, so it contains
no decodable creator field. The immutable Metaplex metadata also contains no creator array. The Pump
frontend creator value is therefore a provider record, not independently corroborated wallet-control
evidence.

The read-only probe now reports this under `economicControl` and deliberately leaves
`pumpCreator: null`. It fails if the known Pump identity, curve, migration pool, program owner or a
future decodable creator field contradicts the baseline.

## What changed in the category

Creator economics are becoming configurable product infrastructure:

- Pump says creator fees apply to eligible bonding-curve and PumpSwap trades and documents separate
  protocol-held creator vaults. Its collection instructions are permissionless to trigger but route
  proceeds to the configured recipient; triggering collection does not confer ownership.
- Pump's current fee-sharing system can migrate a creator field into a sharing configuration and
  distribute accumulated fees among shareholders.
- Bags requires fee-sharing configuration for new launches and supports socially identified fee
  recipients. Its default configuration splits trading fees among protocol, creator and post-migration
  liquidity compounding.
- Pump's own terms warn that creators, promoters and economically interested parties can have
  additional disclosure obligations and remain responsible for how creator fees are used.

Primary sources:

- [Pump fees](https://pump.fun/docs/fees)
- [Pump creator-fee collection](https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/COLLECT_CREATOR_FEE.md)
- [Pump creator-fee sharing](https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/CREATOR_FEE_SHARING.md)
- [Pump program account semantics](https://github.com/pump-fun/pump-public-docs/blob/main/docs/PUMP_PROGRAM_README.md)
- [Bags fee configuration](https://docs.bags.fm/how-to-guides/customize-token-fees)
- [Bags changelog](https://docs.bags.fm/changelog/changelog)
- [Pump terms](https://pump.fun/docs/terms-and-conditions)

## Dasha implications

1. **Separate six identities.** Project operator, token creator record, wallet controller, metadata
   authority, fee recipient and public account are different roles until evidence joins them.
2. **Do not show a creator-fee claim in public UI.** A wallet address without proven control or
   relevance would add confusion, not transparency. Keep the detail in the claims ledger and probe.
3. **Do not build fee-sharing infrastructure around this mint.** The token migrated to a legacy
   Raydium pool rather than the current PumpSwap path; current fee eligibility and administrative
   authority are unproved.
4. **Do not award Simp Points for buying or fees.** Revenue-linked recognition would turn cultural
   contribution into compensated promotion and contradict the existing zero-point boundary.
5. **Resolve economic interest before paid promotion or revenue promises.** Any later statement that
   creators, Dasha, the website, contributors or holders receive trading revenue requires wallet-level
   evidence, authority and a separate legal review.

## Reconsideration trigger

Reopen fee sharing only if all of the following become true: a current controller proves the relevant
wallet by signing a domain- and mint-bound message; the applicable program path and claimable vault are
verified from finalized state; intended recipients and percentages are authorized; and a real product
job requires the distribution. Until then, the correct implementation is a read-only drift gate and no
public economic promise.
