---
status: reference
owner: listing-corrections
updated: 2026-08-09
---

# Dasha token identity and listing correction pack

One factual source for DexScreener, Jupiter, CoinGecko, CoinMarketCap, Solscan and wallet/indexer
corrections. This document prepares submissions; it does not authorize payment, posting, support
messages or form submission.

## Canonical identity

| Field | Value |
| --- | --- |
| Network | Solana |
| Name | `dash_eats` |
| Symbol | `dasha` |
| Mint | `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump` |
| Website | `https://www.getdasha.com` |
| X profile | `https://x.com/dash_eats` |
| Public mint-source post | `https://x.com/dash_eats/status/2085405228078432279` |
| GitHub | `https://github.com/Uuriko/dasha-desk` |
| Explorer | `https://explorer.solana.com/address/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump` |
| Pool | `9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7` |
| Jupiter route | `https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump` |

Do not submit `t.me/dashacommunity`, `dasha.cam`, `Dashaonsol`, `radbrilio` or a post URL as the
canonical X profile. Do not describe the token as verified, safe, endorsed or official.

## Reusable copy

### Short description

> A Solana culture project with an open image studio.

### Standard description

> `$dasha` is a Solana culture project with an open image studio. Create and export images at
> getdasha.com, inspect the exact mint on Dasha Desk, and use the external Jupiter route to swap.

### Representative

Provide the submitting account's real representative information at submission time. Do not invent
a team roster or imply deployer-wallet control.

### Socials

- X: `https://x.com/dash_eats`
- GitHub: `https://github.com/Uuriko/dasha-desk`
- no Telegram;
- no Discord until a real public server exists.

## Media pack

| Asset | Use | Dimensions | SHA-256 |
| --- | --- | --- | --- |
| [`dasha-icon-512.png`](dasha-icon-512.png) | Preferred square PNG | 512×512 RGBA | `48797c99d751dc140b9782ae01026b0dcdbc95fd1b4a95d0a9979ab67723e0d3` |
| [`dasha-icon-180.png`](dasha-icon-180.png) | Smaller square fallback | 180×180 RGBA | `ab8603ee89fdf0146427fb18f6fa0b77715c05698412063cc362616db47d4cca` |
| [`dasha-favicon.svg`](dasha-favicon.svg) | Tile source | SVG | `57221b5b9b3154d85b45253b5ad2081dc57c23ee97375b9034c6b5f012b889d6` |
| [`dasha-mark.svg`](dasha-mark.svg) | Bare mark source | SVG | `fbdadf7aebd862717b4c77e736af70cf36148cec384f4d981b37eb23e6769ac0` |

Prefer the 512×512 PNG unless a provider explicitly requests another format. Recompute hashes before
submission so an edited asset is never mislabeled as the reviewed file.

## Onchain evidence

The finalized probe on 2026-08-09 reported:

- classic SPL Token program and six decimals;
- mint authority `null`;
- freeze authority `null`;
- immutable Metaplex metadata;
- update authority `TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM`;
- metadata URI `https://ipfs.io/ipfs/QmU9TM9DYc8YCxZiZSmvdBcdwWvhHhZvBneoxEAkmgiLxV`;
- image URI `https://ipfs.io/ipfs/Qmb4fcJYbM1RSU43bvNPwUjhwGXK42L9xGvjEEijmWtAcg`;
- byte-identical metadata and image through two IPFS gateways;
- a valid Jupiter Swap V2 route for the exact mint.

These are bounded technical facts, not safety, price or relationship claims. Refresh them with:

```bash
cd /home/potter/.grok/worktrees/potter/dasha
npm run --silent dasha:onchain:summary   # ordinary/machine-readable drift review
npm run dasha:onchain:check     # full diagnostics
```

## Current provider discrepancies

The same probe found:

| Provider | Current discrepancy | Desired factual correction |
| --- | --- | --- |
| DexScreener | Website is `dasha.cam`; Telegram is `dashacommunity`; X is a single post | Website `getdasha.com`; remove Telegram; X profile `dash_eats` |
| Jupiter | Exact SOL→mint route works, but Swap shows `1 JupShield Warning` → `Not Verified`; website is absent and X is a historical post | Use current VRFD V4 verification/correction paths with the exact mint; correct website/profile without claiming endorsement |
| Jupiter VRFD | Current exact-mint endpoints expose the same pending Standard submission as core ID `15201` and audit-event ID `23806`, naming `Dashaonsol`, submitter `radbrilio`, and an unsupported official claim | Correct or supersede the active record without treating it as valid Dasha identity |
| Phantom | About uses the historical metadata post; no positive verification | Downstream readback only: Phantom documents CoinGecko/Jupiter sources and no direct verification form |
| Solflare | Reports mutable metadata although finalized Metaplex and Rugcheck report immutable | Correct the cached mutability fact |
| Solana Explorer | Exact-mint and name search do not surface the token | Investigate indexing; direct address remains canonical |
| GeckoTerminal | Exact-mint token record exists; `coingecko_coin_id` is `null` | Use the existing token/pool URLs as evidence for a new CoinGecko listing |
| CoinGecko | Exact-mint API search returns no coin result | Use **New Coin/Token Listing**, not Update Coin Information |
| CoinMarketCap | DEXScan exact-mint page exists; `/currencies/dash-eats/` is 404 | Use a new tracked-listing request only if its activity criteria are met; do not request an update to a nonexistent currency page |

Nine other Jupiter search results currently share the name or symbol. Every submission and support
request must therefore lead with the full mint, never the ticker alone.

## Provider matrix

### DexScreener

Current marketplace pages advertise:

| Product | Advertised price | What the page establishes |
| --- | ---: | --- |
| [Enhanced Token Info](https://marketplace.dexscreener.com/product/token-info) | $299, reduced from $499 | Paid token-info editing |
| [Community Takeover](https://marketplace.dexscreener.com/product/token-community-takeover) | $199, reduced from $499 | Adds a takeover claim to an existing profile |

The public pages do not establish which proof DexScreener will accept when the submitter controls the
website but not the deployer or metadata authority. Do not choose or pay for either product until
support answers that exact question. Do not use the takeover label merely because it is cheaper.

Prepared support question:

> For Solana mint `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump`, the profile currently links the
> dead `dasha.cam` domain and an unrelated Telegram. I control `getdasha.com`, which publishes the
> complete mint, but I do not control the deployer wallet or immutable metadata authority. Which
> correction path and proof do you accept for replacing the website, removing Telegram and linking
> `https://x.com/dash_eats`? I am asking before purchasing either marketplace product.

### Jupiter

Live readback on 2026-08-09: the exact site URL remains unchanged after load and Jupiter renders
`Sell SOL`, `Buy dasha`, `So11…1112` and `53ux…pump`. Opening its warning shows:
`1 JupShield Warning` → `Not Verified` → `This token is not verified, make sure the mint address is
correct before trading`. This is the highest-friction current acquisition defect because it appears
inside the trusted handoff even when getdasha.com supplies the correct mint.

The public V4 audit endpoint for the exact mint currently returns one pending Standard submission:

| Field | Public readback |
|---|---|
| Core verification ID | `15201` |
| Audit-event ID | `23806` |
| Created | `2026-08-07 16:52:27 UTC` |
| Status / evaluations | `pending` / `0` |
| Token X | `Dashaonsol` |
| Submitter X | `radbrilio` |
| Description | `this is the official dasha nekrasova coin...` |

These are two identifiers for the same submission, not separate requests: the core
`/verifications/token/{mint}` endpoint returns `15201`, while
`/audit/verifications/token/{mint}` returns audit-event `23806`. Their mint, handles, description,
status, evaluation count and creation instant agree. The record is not historical: it is an active
pending identity conflict.

The same dated public asset readback reports market cap `$74,342`, liquidity `$13,685`, `923`
holders, Organic Score `47.90` (`medium`), disabled mint/freeze authorities, top-holder share
`42.28%`, developer balance `0.356%` and bot-holder share `3.91%`. These are volatile observations,
not targets, guarantees or instructions to manufacture activity. They show two likely review gaps:
market cap is below the application's `$100K` warning threshold, and social identity/support is
unresolved. Organic Score, liquidity and holder distribution remain holistic inputs without public
pass thresholds.

Jupiter's current system is **VRFD V4**, not the archived token-list pull-request process and not the
older smart-like-only description. Current official documentation says:

- token verification is open to anyone;
- Standard review is free with no guaranteed timeline;
- Express costs 1,000 JUP and targets a first review within 24–48 hours;
- both methods use a holistic review of market cap, Organic Score, holder distribution, ticker
  uniqueness, social support and onchain liquidity; the application warns below $100k market cap or
  when another contract already has the ticker, but neither warning alone guarantees rejection;
- social support is described as the most important criterion, and a linked X account must be
  dedicated exclusively to the project rather than a personal or KOL account;
- Smart Likes prioritize pending Standard applications; they are not a replacement for an
  application or a guarantee of verification;
- the paid Express API costs 1,000 JUP and can bundle independently reviewed verification and
  metadata requests;
- the public VRFD Open surface separately exposes `Update meta`, but the retrieved public text does
  not establish a universal fee for a standalone Standard metadata correction;
- verification confirms the correct address across Jupiter and partner surfaces but is not an
  endorsement, safety statement or quality guarantee.

Do not create a second blind Standard application while this record is pending. First ask support to
correct, reject or supersede its false identity fields and confirm whether a truthful applicant can
take over the existing record. Use Standard review unless a later explicit request authorizes
spending and contemporaneous evidence justifies Express. Website/social correction may be available
through VRFD Open or the paid Express path. Confirm the standalone Open action's eligibility and
price at its final review screen, and ask support whether the active V4 review can resolve the
conflict before authorizing any payment.

Unresolved eligibility question: `@dash_eats` is the truthful canonical account, but it is also
Dasha's personal public identity rather than a token-only account. Do not create or substitute a fake
“project” account to fit the criterion. Ask VRFD support whether a culture token named for the person
can link the person's own account and what evidence distinguishes that case from an unrelated KOL
token. If the answer is no, preserve the exact-mint warning and site verification flow rather than
misrepresenting identity.

Prepared support description:

> Exact mint: `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump`. Pending VRFD core submission `15201`
> (audit event `23806`) names
> `Dashaonsol`, was submitted by `radbrilio`, and describes the token as official. Those identities
> are not part of getdasha.com. Please void or annotate the stale record and advise the supported
> correction path for website `https://www.getdasha.com` and X profile
> `https://x.com/dash_eats`. This request does not ask Jupiter to represent the token as safe.

Prepared V4 verification note:

> Please review Solana mint `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump` through the current
> Standard VRFD path. The canonical website is `https://www.getdasha.com`, the canonical X profile is
> `https://x.com/dash_eats`, and the public mint-source post is
> `https://x.com/dash_eats/status/2085405228078432279`. Pending core submission `15201` (audit event
> `23806`) contains unrelated
> names (`Dashaonsol`, `radbrilio`) and an unsupported official claim; please do not use those fields
> as project identity. This asks Jupiter to distinguish the exact mint, not to endorse its value,
> safety or quality.

Prepared eligibility question:

> The truthful canonical X identity for mint
> `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump` is `https://x.com/dash_eats`; the token and website
> are built around that same public identity. Your V4 criteria say a linked X account must be
> project-exclusive and not personal/KOL. Does this category permit the named person's own account,
> and what public evidence would distinguish it from an unrelated token using a public figure's
> name? We will not substitute an invented token account or claim endorsement.

### CoinGecko

CoinGecko's April 2026 process requires a public verification post from a social account linked by
the website, then a reply containing the request ID received after submission. The token must be
actively traded on a CoinGecko-tracked exchange. The public post and form are separate gated actions;
do not begin one without being prepared to complete both.

Readback on 2026-08-09: CoinGecko's exact-mint search returned no coin, while GeckoTerminal returned
the exact token and pool with `coingecko_coin_id: null`; CoinGecko's current exchange list includes
Raydium. The applicable form is therefore a new active token listing, not a token-detail update.

GeckoTerminal separately offers a no-fee Regular Pass with review stated as up to five days and an
optional paid Fast Pass. Its current form requires all submitted information to be publicly visible
on the project website and says the contract must be verified. A paid pass accelerates review; it
does not solve the unresolved authority/verification proof. Do not pay or submit until the required
public verification post and truthful account-control evidence can be completed end to end.

### CoinMarketCap

CMC requires a functional website and explorer, public trading on a tracked exchange with material
activity, and a reachable representative. Its official request form is the only accepted submission
channel. It asks applicants to consolidate evidence, avoid hyperbole and avoid duplicate requests.
If changing a website URL, explain why the old domain cannot redirect to the new one.

Readback on 2026-08-09: CMC DEXScan resolves the exact mint, but the conventional currency page at
`/currencies/dash-eats/` returns 404. DEXScan discoverability is not a tracked CMC currency listing.

### Solscan and wallet/indexer surfaces

Solscan documents Metaplex metadata as its token-data source. Because Dasha's metadata is immutable,
prepare a factual cache/indexing correction rather than promising an onchain update. For every wallet
or indexer, ask for correction of demonstrably stale fields before asking for a verification badge.

## Submission order

1. Refresh the onchain/provider probe and asset hashes.
2. Resolve the DexScreener proof-path question without payment.
3. Ask Jupiter to correct, reject or permit takeover of pending core submission `15201` / audit event
   `23806`; do not stack a
   second blind application. Resolve the project-exclusive-X interpretation and ask whether the same
   review can correct website/social identity before considering the separate paid metadata path.
4. Apply the same canonical pack to supported factual corrections.
5. Start CoinGecko only when the required public verification-post sequence can be completed.
6. Start CoinMarketCap only with one consolidated, non-duplicate request.
7. After each provider acts, re-run the probe and record the exact changed fields.

Provider requirements and prices can change. Re-open the official page immediately before any
gated action; this pack is an evidence baseline, not standing authorization.
