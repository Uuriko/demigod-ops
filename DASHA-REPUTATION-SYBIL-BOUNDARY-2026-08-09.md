---
status: reference
updated: 2026-08-09
---

# Dasha reputation and Sybil boundary

## Decision

Do not add Human Passport, World ID, wallet-history classification, OpenRank or a custom Sybil
score to the Simp Board now. X OAuth proves account control, not unique humanity. That limited fact
is sufficient only because Board points are playful recognition with no prize, payment, governance,
allocation or airdrop entitlement.

The activation threshold for stronger identity is the first scarce right attached to rank or
points. At that point the system needs an explicit adversary model and proof appropriate to the
right; it must not quietly reuse X linking, a holder badge or quiz completion as proof of personhood.

## Current controls

- enrollment is explicit and keyed to the OAuth account;
- the latest completed quiz replaces the previous quiz score rather than accumulating attempts;
- creative and community awards have rolling caps;
- OSS awards require reviewed merged-PR evidence and have a season cap;
- follower count, verification tier, likes, reposts, replies, chat volume, referrals, purchases,
  balances, bag size and payments score zero;
- the holder proof is a dated, zero-point badge and may be shared by multiple X identities;
- Perry's founding row is visibly editorial rather than measured.

These controls limit point farming and misleading status. They do not create Sybil resistance.

## Research fit

- [Human Passport](https://docs.passport.human.tech/) combines credentials, wallet-activity models
  and privacy-preserving identity checks for programs that need unique-human or anti-Sybil access.
  Its model product currently focuses on EVM activity, while Dasha's holder proof is Solana-based.
- [World ID](https://docs.world.org/world-id/overview) provides proof-of-human and other
  privacy-preserving credentials for one-person-one-action flows. Its integration requires backend
  proof verification and replay/uniqueness storage.
- [OpenRank](https://docs.openrank.com/) uses context-specific reputation graphs and EigenTrust;
  its own documentation notes that absent trusted seeds, equal initial trust is less Sybil resistant.
- [GitHub's Pull Request API](https://docs.github.com/en/rest/pulls/pulls) exposes merged work,
  authorship and reviewable repository evidence. That is a better narrow source for Dasha OSS credit
  than importing a general identity score.

Each external identity system adds onboarding friction, a new dependency and a new claim about what
the proof means. None improves the present low-stakes Board enough to justify those costs.

## If incentives change

Before attaching anything scarce to points:

1. name the exact right and maximum value available to one participant;
2. decide whether the policy needs account uniqueness, personhood, contribution quality, wallet
   control or some combination—these are different facts;
3. model account farms, collusion, bought accounts, replay and reviewer capture;
4. choose the least invasive proof that addresses that model;
5. provide an appeal/fallback path and disclose false-positive risk;
6. keep proof outputs separate from the public score and never publish identity or wallet data.

Until that trigger occurs, the correct product is a transparent account-linked leaderboard, not a
premature identity protocol.
