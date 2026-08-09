---
status: reference
scope: How attention reaches a Solana token and the site attached to it
updated: 2026-08-09
---

# Where eyeballs actually come from

Research run 2026-08-09. Every claim below is marked **evidence** (a primary source says it) or
**inference** (my reading, which can be wrong). The distinction matters more here than usual: this
project's whole differentiator is not telling stories, and a growth plan is the easiest place to
start telling them.

## The thesis, stated against our own interest

`DASHA-GROWTH-PROMPT.md` already says a website is a weak lever on token price. The research does not
contradict it — it sharpens it. **Almost every surface where a first impression happens is one we do
not own.** Charts, wallets, aggregators and swap UIs originate discovery; the site converts attention
that already exists. Work that improves records on surfaces we do not own outranks work on the site,
which is an uncomfortable conclusion for a repo full of site code.

## Where discovery starts, ranked

**Evidence.** In 2026 the ranked origination points for a Solana memecoin first impression are:

1. **Phantom's Explore / Trending** — Phantom is the most-used Solana wallet; tokens gaining momentum
   surface in its trending list, reachable from the search icon in-app. Discovery happens *inside the
   wallet that already holds the money*, which is the shortest possible path to a buy.
2. **DexScreener Trending / New Pairs** — the standard early-stage discovery surface, 100+ chains.
3. **Birdeye New Listings / Find Gems** — deeper analytics, trending feeds, configurable alerts.
4. **Jupiter** — where the swap is actually executed, and therefore where a doubt is fatal.

None of these read our website. All of them read **provider records** — the exact records our
metadata is immutable against changing on-chain, so off-chain correction is the only lever.

## The two channels, separated

The operator asked for this split explicitly, and it is the right frame.

### Increases buys, may never touch the site

- Correct DexScreener profile (currently the dead `dasha.cam` and a disclaimed Telegram).
- Jupiter verification (currently `false`, with a visible warning — see below).
- CoinGecko / CoinMarketCap listings.
- Wallet metadata as rendered by Phantom and Solflare.

### Increases site visits

- **Search, and specifically answer engines.** *Evidence:* SEO is described as the load-bearing
  acquisition surface for crypto because ad platforms restrict crypto, and it is the only channel
  whose value survives a market cycle — paid budgets get cut and KOLs go quiet, rankings persist.
  2026-current practice explicitly includes optimizing for AI Overviews, zero-click results and
  **earning citations from LLMs** (ChatGPT, Perplexity), by structuring content for answer engines.
- **Anything carrying the mark into someone else's feed** — the Studio, which is the only
  compounding loop this project has.

*Inference:* the `HowTo` structured data added to `/how-to-buy` on 2026-08-09 sits precisely on the
answer-engine lever. "How to buy $dasha" is a high-intent query and we are the only page that answers
it. This is the cheapest site-side reach work available and it is already done.

## Jupiter, in depth — the highest-friction defect we have

**Evidence.** Jupiter retired its application process. Catdetlist is deprecated and replaced by
Jupiter Verify (V3), now V4/VRFD. There is no form to fill in. Verification follows:

- **Organic score** (0–100): a composite of organic volume, organic holders, organic traders and
  organic buyers, measuring trades from confirmed human wallets versus bots and market makers.
- **Social support**, measured as **smart likes** — endorsements from *Smart Followers*, a
  dynamically updated set of verified humans and known ecosystem participants, **derived from
  verified X accounts**. Community members like the token at `jup.ag/tokens/<mint>`.
- Two review lanes: **Standard (free)**, continually monitored, no timeline; **Express**, burning
  **1,000 JUP**, guaranteed review within 24h.

**Evidence, and the most useful single sentence found:** organic score "rewards early growth
heavily. Going from 10 organic buyers to 100 matters a lot more than going from 10,000 to 10,100."

*Inference:* with roughly 868 holders, this project sits in exactly the band the curve rewards. That
is a genuinely favourable position and argues for the free Standard lane before considering 1,000
JUP.

### The problem nobody has named yet

**Evidence:** social support is measured through smart followers on *the project's X page*. **Evidence:**
Jupiter's pending record `15201` names the token's X as `Dashaonsol`, submitted by `radbrilio`.
**Evidence:** `DASHA-CLAIMS.md` C4 records that project control of `@dash_eats` is unestablished.

*Inference, and it needs checking rather than believing:* if Jupiter measures social support against
the X account it has on file, then the account it has on file is one we do not control — and the
account we would want it to measure is one we also do not control. Correcting record `15201` may
therefore matter less because it might approve, and more because **it defines which X account
Jupiter counts**. I flagged that record as urgent, then corrected myself to "stale, not an
emergency." Both framings missed this. The right question for support is not only "please void it"
but "which X account does verification measure for this mint, and how is that set?"

This also means C4 is not merely a claims-hygiene matter. **Not controlling the project's X account
is a growth constraint**, because the main free verification lever is denominated in it.

### The warning is the conversion defect

`DASHA-DEX-SUBMISSION.md` records the live readback: Jupiter shows `1 JupShield Warning` →
`Not Verified` → "this token is not verified, make sure the mint address is correct before trading."
*Evidence, general:* verified tokens are surfaced first in wallet swap interfaces and unverified-token
warnings add friction at the decision point. *Inference:* this fires inside the trusted handoff,
after our site has done its job correctly and handed over the right mint. Every improvement upstream
of it is discounted by whatever fraction of people stop here. It is the single highest-leverage fix
available, and it is free.

## Nine impostors

**Evidence:** nine other mints currently share the name or symbol in Jupiter search, and a separate
token, Dasha (VVAIFU), outranks us on CoinGecko, CoinMarketCap, Coinbase, OKX and Bitget for the
search "Dasha coin."

*Inference:* this makes ticker-first marketing actively harmful — it sends people to a search result
we lose. Every outbound surface should lead with the full mint, never the symbol. Verification is
also the mechanism that separates us from those nine at the exact moment of a swap, which is a second
argument for treating it as the priority.

## CoinGecko and CoinMarketCap

**Evidence:** CoinGecko's platform fee is $0 and it does not sell listings; free listings take
roughly 2–8 weeks (CoinGecko) and 1–4 weeks (CoinMarketCap). Requirements include active trading on a
tracked exchange, real liquidity, accurate circulating supply, verified contract info and complete
metadata. *Evidence, from our own probe:* GeckoTerminal already holds an exact-mint token record with
`coingecko_coin_id: null`, and CMC has a DEXScan page while `/currencies/dash-eats/` 404s.

*Inference:* the GeckoTerminal record is the evidence a CoinGecko **new listing** request wants, and
the long lead time is the argument for filing early rather than perfectly. Free, slow, and it
compounds — start the clock.

## What I am not recommending

Stated because a growth document that only says yes is a sales pitch.

- **Do not buy smart likes or engagement.** The score is explicitly built to detect and discount
  automated activity; buying it is both self-defeating and the exact dishonesty this project's
  differentiator rests on not doing.
- **Do not burn 1,000 JUP yet.** Standard review is free, the organic-score curve favours our holder
  band, and the X-account question above is unresolved — paying to fast-track a review that measures
  the wrong account buys a faster wrong answer.
- **Do not pay DexScreener before support answers.** Enhanced Token Info is documented as requiring
  proof of token/deployer-wallet control, which the on-chain evidence says does not exist here.
- **Do not chase Discord/Telegram community-building as a traffic play.** The generic advice says
  build a community; this project deliberately disclaims the Telegram that exists, and standing up a
  server to satisfy a marketing checklist would create exactly the unowned-identity surface that
  produced `Dashaonsol` and `dasha.cam`.

## What this changes here

1. Ask Jupiter which X account verification measures for this mint, and correct record `15201`.
   Free. Unblocks the only free path to removing the swap warning.
2. Resolve `@dash_eats` control, or establish an account the project does control and can point
   providers at. This is now a growth blocker, not just C4 hygiene.
3. Ask DexScreener which proof they accept. Free. Decides $299 / $199 / neither.
4. File the CoinGecko new-token listing using the GeckoTerminal record. Free, 2–8 weeks, start now.
5. Keep the answer-engine work on `/how-to-buy`. Done as of `1fd1a1a`; it is the cheapest site-side
   reach lever and it is already banked.

Items 1–4 need the operator's own accounts. None of them is a thing an agent should do unilaterally,
and none of them is a website change.

## Sources

- [Jupiter — what is organic score](https://developers.jup.ag/blog/what-is-organic-score)
- [Jupiter Verify / VRFD](https://verified.jup.ag/)
- [Catdet Token List — deprecated, replaced by Jupiter Verify](https://catdetlist.jup.ag/)
- [Jupiter support — token verification](https://support.jup.ag/hc/en-us/articles/18599586767644-How-can-I-get-my-token-verified-on-Jupiter)
- [Jupiter Research — FAQ Token List V3 Verification](https://discuss.jup.ag/t/faq-token-list-v3-verification/23074)
- [Phantom — Solana memecoins starter guide (2026)](https://phantom.com/learn/crypto-101/solana-memecoins-tokens)
- [Backpack — where to track and trade memes (2026)](https://learn.backpack.exchange/articles/where-to-track-and-trade-memes)
- [CoinGecko listing requirements 2026](https://listing.help/coingecko-listing-requirements/)
- [CoinMarketCap listing requirements 2026](https://listing.help/coinmarketcap-listing-requirements/)
- [Crypto SEO 2026 — technical optimization and ranking](https://eakdigital.com/crypto-seo-2026-technical-optimization-ranking/)
- [Web3 SEO guide for crypto projects (2026)](https://track360.io/blog/web3-seo-guide-for-crypto-projects-2026)
