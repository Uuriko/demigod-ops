# Dasha product strategy

Updated: 2026-08-06

## Position

**Dasha is the pre-outcome reasoning layer for public crypto calls.**

It helps someone state a market thesis before the result, preserve what would invalidate it, share a legible card on X and later resolve the original without rewriting history.

Public promise:

> Say it before the move. Show what would prove you wrong.

Internal distinction:

- User-facing job: “prove I said it before the move.”
- Integrity property: complete, non-deletable history once server-backed receipts exist.
- Educational benefit: better thesis formation and calibration.
- Not the pitch: moral accountability, guaranteed alpha or safety.

## Initial personas

### Alpha broadcaster

Wants timestamped social proof without exposing wallet, size or complete strategy. Values a recognizable X card and low friction.

### Reputation climber

Wants to be early and noticed. Will game leaderboards and rewards, so the first product should avoid global ranking and token incentives.

### Quiet serious trader

Wants private decision hygiene and review. May never share publicly. Browser-local drafts can serve this user without changing the public product.

### Spectator

Wants fast context: thesis, horizon, confidence, invalidation and evidence the wording was not rewritten after outcome.

### Host or producer

Wants a repeatable segment for a Space, stream or podcast: one prompt, a cutoff, divergent calls and a resolution recap.

## Product hypotheses

| Rank | Hypothesis | What must be true | Cheapest test | Kill criterion |
|---:|---|---|---|---|
| 1 | Thesis Card | Target users understand and voluntarily share a pre-outcome call artifact. | Current no-wallet generator plus three realistic examples. | Under 40% comprehension or under 25% stated real-call share intent across 30 target users. |
| 2 | Sealed receipt | Users value credible time/order proof enough to return to a stable URL. | Server-stamp a small invited beta; originals append-only. | Fewer than 20% return or share; frequent demands to edit/delete misses. |
| 3 | Automatic resolution | A resolved card creates a second discussion and retention event. | Resolve liquid BTC/SOL/ETH examples with explicit oracle rules. | Under 30% creator return-to-resolution or disputes above 2%. |
| 4 | Community rounds | Hosts can turn receipts into recurring content without Dasha operation. | One creator-neutral session with 5–10 hypotheses. | Fewer than five submissions, host setup over ten minutes or fewer than half resolve. |
| 5 | Evidence snapshot | Users need context at creation time but do not mistake it for safety. | A/B a discrete facts panel against link-only version. | No comprehension gain or over 20% interpret it as endorsement in five interviews. |
| 6 | Calibration profile | Repeat users value process quality over raw P&L. | Show calibration only after enough resolved binary forecasts. | Users optimize easy questions, lack sufficient samples or treat score as investment advice. |

## The product loop

1. A market moment or host prompt creates intent.
2. A user enters asset, claim/direction, confidence, horizon, invalidation and short rationale.
3. Dasha shows an exact preview.
4. In the local MVP, Dasha generates an explicitly non-proving card and checksum.
5. In the persisted product, Dasha seals an append-only original and returns a canonical URL.
6. The user shares to X using a standard Web Intent.
7. A reader opens the receipt and can create a counter-thesis from the same prompt without copying the rationale.
8. At the horizon, the receipt resolves through a published rule.
9. The outcome card links to the unchanged original and prompts a postmortem.

## Trust contract

Dasha must say exactly what it proves.

### Local prototype proves

- The card text produced the displayed checksum.
- Nothing about when the content was written.
- Nothing about token identity, safety, ownership, wallet position or investment quality.

### Server-backed receipt may prove

- The server received an exact canonical payload no later than a recorded time.
- Later versions differ from the preserved original.
- The resolution rule and data source used.

### It still cannot prove

- The caller's full portfolio or all opinions
- That the caller acted on the thesis
- That the asset is safe
- That the caller is unbiased
- That a public history includes private or alternate-account calls

Therefore use “public Dasha call history,” never “complete verified trader record.”

## Anti-gaming and safety

- Blank asset by default; never prefill Dasha or ANSEM.
- No wallet connection, size, buy button, referral link or execution in the initial product.
- Original receipts are append-only; corrections create a version; deletion becomes a tombstone.
- Standardized horizons and resolution rules.
- Expired and invalidated calls remain visible.
- Contract-address disambiguation for tokens with the same name.
- Strip arbitrary links from public rationale.
- Add conflict/sponsorship disclosure before public beta.
- No global leaderboard for illiquid assets.
- Rate limits, reporting and a documented appeal path before open creation.
- Do not auto-mention Ansem, Dasha or any community.

## Discord role

The user has decided Dasha will have a Discord server. It is the official community and product home, while X remains the acquisition and status surface.

The initial server stays intentionally small: official links, safety, announcements, general community, memes, Dasha Desk, Thesis Cards, Rounds, feedback and moderation. It must not become a trading-signals room, wallet-support surface or token-gated investment club. See [`DASHA-DISCORD-BLUEPRINT.md`](DASHA-DISCORD-BLUEPRINT.md).

## Business model sequence

Do not monetize before the sharing and return loops work.

Potential later models, in order of fit:

1. Free public receipts; paid private workspaces or exports for serious users.
2. Host tools for recurring community rounds and branded recaps.
3. API access for receipts/resolutions with precise provenance.
4. Team/media subscriptions for private forecast sets.

Avoid token-gated access, paid shills, order flow, referral-based trading revenue and pay-to-rank mechanics. Each corrupts the product's neutrality before it earns trust.

## Brand architecture

- **Dasha Desk**: the `$dasha` landing page, mint/source desk and product launcher.
- **Dasha Thesis Card**: current creator-neutral experiment inside the Desk.
- **Sealed Call**: candidate persisted product behavior, not yet a truth claim.
- **Rounds**: creator-neutral host format.
- **Dasha Discord**: official community, support and recurring-round home.

Never describe Dasha as official to Dasha Nekrasova or affiliated with Ansem without direct, current evidence and permission.
