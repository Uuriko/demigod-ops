---
status: reference
---

# DexScreener token profile — submission payload

Prepared 2026-08-08. Everything the form asks for, written out, so ordering is copy-paste.

## Before paying — resolve this first, free

Neither product page states how DexScreener verifies authority over a token. Ask them (Discord,
Telegram or X support) **which product applies when you are the project operator but may not hold
the deployer wallet**. Five minutes, and it decides between:

> **On-chain facts, verified 2026-08-09 at slot 438204681** by `dasha-onchain-check.mjs`. These were
> asserted nowhere when the recommendation below was written, and they bear directly on it:
>
> | Field | Value | What it means here |
> |---|---|---|
> | `mintAuthority` | `null` | Revoked. No one can mint more supply. |
> | `freezeAuthority` | `null` | Revoked. No one can freeze a holder's account. |
> | `isMutable` | **`false`** | The on-chain metadata can never be changed — by anyone, including the operator. |
> | `updateAuthority` | `TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM` | pump.fun's authority, **not the operator's**. |
> | Rugcheck | 0 risks, score 1 | Clean. |
>
> So there is **no on-chain control the operator can demonstrate**, and no on-chain field that can be
> edited to carry `getdasha.com`. Enhanced Token Info is documented as requiring proof of control of
> the token or deployer wallet; on this evidence that proof does not exist, so the product may not be
> grantable at all. Ask support **whether domain or social control is accepted instead** — the domain
> is genuinely controlled, the deployer wallet is not. Do not pay $299 against the assumption that
> "the project is official" settles it: that phrase is the same unscoped claim `DASHA-CLAIMS.md` C3
> keeps out of public copy, and it is not evidence of wallet control.
>
> The immutability also decides where effort goes: because the metadata is frozen, `getdasha.com` can
> only ever reach a chart or a wallet through **off-chain provider records** — this DexScreener
> profile, Jupiter's verified list, CoinGecko, Solscan. There is no on-chain path. That is the whole
> reason this submission matters.

### Someone else already filed for Jupiter verification — decide this before DexScreener

`dasha-onchain-check.mjs` found a **pending** Jupiter verification request against this exact mint,
open since 2026-08-07 and not filed by the operator:

| Field | Value |
|---|---|
| Request id | `15201`, status `pending`, `verifiedAt: null` |
| X handle it would verify | **`Dashaonsol`** — not `dash_eats`, not `getdasha.com` |
| Filed by | **`radbrilio`** |
| Claims official status | **yes** |

If Jupiter approves it as filed, the token's verified record points at an account this project does
not control, and everything downstream that consumes Jupiter's list — wallets, aggregators, swap
UIs — inherits that. It is also a third party claiming official status for a token, which is the
exact claim `DASHA-CLAIMS.md` C1–C5 exists to keep scoped.

This outranks the DexScreener purchase. Jupiter verification is free, it is the record most likely to
be seen at the moment someone actually buys, and it is currently queued to resolve the wrong way.
Resolve the pending request first; `jupiterVerified` reads `false` today, so nothing is settled yet.

Nine competing mints share the name or symbol in Jupiter's search results. Verification is the thing
that separates the real mint from those nine at the moment of the swap.

| Product | Price | Use when |
|---|---|---|
| [Enhanced Token Info](https://marketplace.dexscreener.com/product/token-info) | $299 (from $499) | You can prove control of the token / deployer wallet |
| [Community Takeover Claim](https://marketplace.dexscreener.com/product/token-community-takeover) | $199 (from $499) | You cannot, and are claiming stewardship of an existing profile |

**Use Enhanced Token Info.** The project is official — developed by the operator with @perryalpha — so
a "community takeover" claim would be the wrong description of what is happening and $199 spent
saying something untrue about the project's own relationship to its token. A takeover means outsiders
adopting an abandoned token; this is the operator correcting a stale record.

The row above is kept only so nobody re-derives the takeover route from an older document. If
DexScreener's support says the takeover product is the only one available without deployer-wallet
control, come back and decide with that fact in hand — do not buy it on the assumption that it is
the cheaper equivalent.

## What is wrong today

The live profile for `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump` lists:

- **Website:** `https://dasha.cam` — dead, returns nothing (verified 2026-08-07 and again 2026-08-08)
- **Telegram:** `t.me/dashacommunity` — the group the project publicly disclaims
- **No mention of `getdasha.com`** anywhere

Anyone who finds the token from a chart lands on a dead domain. That is the whole reason to do this.

## Payload

**Website:** `https://www.getdasha.com`

**Socials:**
- X: `https://x.com/dash_eats`
- GitHub: `https://github.com/Uuriko/dasha-desk`

Do **not** submit `t.me/dashacommunity`. The project disclaims it, and re-listing it would
reintroduce exactly the problem this submission exists to fix. Submit a Telegram only if an official
one is created later.

**Logo:** `dasha-icon-512.png` — the cherries mark, 512×512, transparent-safe on its ink tile.
Sources: `dasha-favicon.svg` (tile) and `dasha-mark.svg` (bare). Regenerate larger from the SVG if
they want more than 512.

**Description** (no price language, no promises, no endorsement claim):

> $dasha is a Solana culture coin with an open studio attached. Make an image, pass it on — the
> tools, the mark and everything they export are public domain. Verify the mint before you swap;
> the desk links independent explorers and a single neutral Jupiter route. Verify the mint before you
> swap.

**Team:** the operator — . Add @perryalpha if the form allows a second name.

**Locked supply wallets:** none to declare. Note that mint and freeze authority are both renounced
(verifiable on-chain) — worth stating if there is a field for it, since it is a real and checkable
fact rather than a claim.

## After it lands

1. Re-fetch the profile and confirm the website field is `getdasha.com` and the dead domain is gone.
2. Confirm the disclaimed Telegram is no longer listed.
3. Only then submit CoinGecko and CoinMarketCap — both read the token's public presence, and both
   list "inadequate project information" among their rejection reasons.

## One thing this does not fix

The profile is the *token's* card. The description above avoids any claim about the relationship
with Dasha Nekrasova, because the exact public wording is still open. If a form field invites a
"story" or "vision", keep it to what is written here rather than improvising something warmer.
