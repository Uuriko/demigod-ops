# DexScreener token profile — submission payload

Prepared 2026-08-08. Everything the form asks for, written out, so ordering is copy-paste.

## Before paying — resolve this first, free

Neither product page states how DexScreener verifies authority over a token. Ask them (Discord,
Telegram or X support) **which product applies when you are the project operator but may not hold
the deployer wallet**. Five minutes, and it decides between:

| Product | Price | Use when |
|---|---|---|
| [Enhanced Token Info](https://marketplace.dexscreener.com/product/token-info) | $299 (from $499) | You can prove control of the token / deployer wallet |
| [Community Takeover Claim](https://marketplace.dexscreener.com/product/token-community-takeover) | $199 (from $499) | You cannot, and are claiming stewardship of an existing profile |

**Use Enhanced Token Info.** The project is official — developed by John Potter with @perryalpha — so
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

**Team:** John Potter — `https://x.com/potterlab`. Add @perryalpha if the form allows a second name.

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
