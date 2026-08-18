---
status: working
generated_by: claude
generated_at: 2026-08-18
---

# What to do for $dasha after the DEX approval

Every item below is tied to something measured on 2026-08-18, not to general advice. Where a number
appears, the command that produced it is named so the next reader can re-derive it instead of
trusting this file.

**Ownership key:** 🤖 I can do it · 🔑 needs a credential you hold · 💰 money movement, needs
explicit authorization in the request that asks for it · 📤 outbound submission, same rule.

---

## 0. The finding that reorders the list

I expected to find a broken market. The market is small but **structurally healthy**:

| Measure | Value | What the research says |
|---|---|---|
| 24h volume ÷ FDV | **6.4%** ($5,802 / $90,235) | healthy band is 2–10% |
| Liquidity ÷ FDV | **33.8%** ($30,532) | unusually high; most memecoins run 5–15% |
| Pair age | **created 2025-02-03** | survived 18 months, not a fresh launch |
| Holders | **978** | real distribution, not 3 wallets |
| Buy/sell 24h | 18 / 24 (43% buys) | mild sell pressure, normal at this size |

So the constraint is **not** market mechanics. Volume is proportionate and liquidity is deep
relative to size. The constraints are **reach** and **trust legibility** — people not finding it,
and the people who find it not being given what they check.

That means the highest-value work is metadata, trust signals and discovery — not liquidity
engineering, and not anything that would require paying for attention.

Source: `curl api.dexscreener.com/latest/dex/tokens/<mint>`, `lite-api.jup.ag/tokens/v2/search`.

---

## A. Trust signals we already pass and state nowhere

Read from chain on 2026-08-18 (`getAccountInfo`, finalized) and Jupiter's audit blob. These are the
exact checks a buyer runs before buying, and we pass all of them silently.

| Fact | Value |
|---|---|
| Supply | 999,831,949.035, 6 decimals — fixed |
| Mint authority | **null** — no more can ever be created |
| Freeze authority | **null** — no wallet can be frozen |
| Dev balance | **0.36%** |
| Top 10 holders | 41.3% |
| Metaplex metadata | **immutable** (`onchainMutable: false`) |

- [ ] 🤖 **A1.** Add a "what you can check yourself" block to `/how-to-buy` stating those six facts
      as a *dated on-chain observation*, each with a verify link. Not a safety claim — see A3.
- [ ] 🤖 **A2.** Add claim **C14 ONCHAIN_AUTHORITIES** to `DASHA-CLAIMS.md` in the C8 style: a dated
      finalized observation, allowed wording, and an explicit "do not infer" list.
- [ ] 🤖 **A3.** Write the wording so it cannot be read as an endorsement. C2 forbids "safe" and C3
      makes token control unestablished. The honest form is: *no new supply can be created and no
      wallet can be frozen — that is what these two facts mean and all they mean. They say nothing
      about price, liquidity, or whether anyone will buy it.*
- [ ] 🤖 **A4.** Gate it: extend `dasha-onchain-check.mjs` so a published authority claim fails the
      gate if chain state ever stops matching. A claim that cannot go stale-detectably is a slogan.
- [ ] 🤖 **A5.** State top-10 concentration (41.3%) alongside the good numbers. Publishing only the
      flattering three is the thing that makes the other three disbelieved.

## B. Wallet and aggregator metadata — the highest-traffic surface

`dasha-onchain-check.mjs` discovery gaps, 2026-08-18. DexScreener is correct; nothing else is.

| Surface | Links getdasha.com? |
|---|---|
| DexScreener | ✅ canonical site + `@dash_eats`, no banned Telegram |
| Jupiter metadata | ❌ links the old source post |
| Phantom "About" | ❌ links the old source post |
| Solflare | ❌ stale metadata, reports unverified |

- [ ] 🤖 **B1.** Confirm which of these read on-chain metadata vs their own store. On-chain is
      **immutable**, so anything reading it can never be corrected and the fix must be provider-side.
      Do this before asking anyone to change anything.
- [ ] 📤 **B2.** Request the Jupiter metadata correction (website → `getdasha.com`, X → the canonical
      profile rather than the source post).
- [ ] 📤 **B3.** Same for Phantom's token About source.
- [ ] 📤 **B4.** Solflare renders *stale mutable* metadata although finalized Metaplex and current
      Rugcheck both report immutable — report the staleness, it is their cache, not our data.
- [ ] 🤖 **B5.** Keep `dasha-listings-identity.mjs` as the scorer of record and run it against every
      surface, not just DexScreener. It already encodes canonical site, the rejected `dasha.cam`
      domains and the banned Telegram.
- [ ] 🤖 **B6.** Re-run the identity score weekly and diff. Metadata drifts back.

## C. Jupiter verification, described accurately

- [ ] 🤖 **C1.** ✅ *Done 2026-08-18.* Corrected `DASHA-DEX-SUBMISSION.md`: pending request
      `15201` / audit `23806` is **not ours** — `senderTwitterHandle: radbrilio`,
      `twitterHandle: Dashaonsol`, neither anywhere in this tree. So "correct or supersede the
      existing request" was never an available action.
- [ ] 🤖 **C2.** Do not file while `23806` is pending. It sits at `evaluationCount: 0` and may
      simply be denied; a second concurrent request is the documented mistake.
- [ ] 📤 **C3.** Decide whether to tell Jupiter a third party filed on our mint with a description
      (*"this is the official dasha nekrasova coin"*) that C1/C5 does not support us making. We
      would not want it granted **in that wording** even though it names our mint.
- [ ] 💰 **C4.** Express verification burns **1,000 JUP**. It is the only path independent of 23806.
      Money movement — needs its own authorization, and check the treasury actually holds JUP first.
- [ ] 🤖 **C5.** Organic score is **0** and tags are `["launchpad","unknown"]`. Track it weekly; it
      is the signal that moves without any submission at all.
- [ ] 🤖 **C6.** Until verified, assume every buyer sees an unverified-token warning. That is an
      input to §E, not a footnote.

## D. Impersonation defence

Jupiter name search for `dash_eats` returns **12 results; 11 are not ours.** Each clone holds
1–7 holders and ~$2,178–2,303 liquidity — automated copies, but they pollute every name search.
Ours ranks first and holds 978 holders and $15.3k liquidity.

- [ ] 🤖 **D1.** Record the 11 clone mints with first-seen dates in a tracked file, so "how many
      are there" stops being re-derived by hand each time.
- [ ] 🤖 **D2.** Watch for a clone gaining real liquidity or holders. One at $2.2k is noise; one at
      $50k is an active attack and the response is different.
- [ ] 🤖 **D3.** Make the mint the most copyable thing on every surface. The research is blunt:
      the mint address is the *only* authoritative identifier, since names and tickers are trivially
      duplicated. `/how-to-buy` already does this well — carry it to home and `/simp`.
- [ ] 🤖 **D4.** Keep the "last four characters are not enough" warning; clones deliberately reuse
      the suffix. This is already right on `/how-to-buy` and should not be softened for brevity.
- [ ] 📤 **D5.** Report clones to Jupiter/DexScreener only if one gains traction. Reporting eleven
      dead mints spends credibility we will want later.

## E. The buy path, and the warning nobody is warned about

`/how-to-buy` is genuinely good — mint-first, character-for-character, names the CoinGecko
`Dasha (VVAIFU)` collision. But it mentions the Jupiter unverified prompt **zero times**, and our
tags guarantee one appears at the exact moment of purchase.

- [ ] 🤖 **E1.** Say what they will see, before they see it: an unverified/unknown-token warning,
      why it appears (not verified ≠ not real), and that the mint is the check that settles it.
- [ ] 🤖 **E2.** Frame it as the site being straight with them. A user who hits an unexpected scare
      screen concludes the site misled them; one who was warned concludes it did not.
- [ ] 🤖 **E3.** Add the A1 trust block directly beneath, so the reassurance is adjacent to the fear.
- [ ] 🤖 **E4.** Do not claim the warning will disappear. Verification is not ours to promise.
- [ ] 🤖 **E5.** Re-test the whole path after any change: `npm run dasha:test:growth` covers mint and
      buy-route consistency.
- [ ] 🤖 **E6.** Check the Jupiter deep link still opens with the exact mint pre-filled. It is the
      last step before money moves and the easiest to break silently.

## F. Discovery — what actually moves DexScreener

Their trending algorithm weighs **24h USD volume, transaction count, and unique wallet addresses**,
and explicitly discounts identical trade sizes and low wallet diversity as artificial. So the only
inputs we could ethically move are the ones that come from more *distinct people* showing up.

- [ ] 🤖 **F1.** Make the free surfaces the reason to arrive. Chess, the faucet and the Simp board
      already exist and none of them require buying anything.
- [x] 🤖 **F3.** ✅ *Audited 2026-08-18.* Result below. Corrects **F2**, which I had carried from the
      older work list without checking — `/chess` **does** have an OG image.

      | Surface | og:image | Card |
      |---|---|---|
      | `/` · `/how-to-buy` · `/simp` · `/chess` · `/faucet` | ✅ | `dasha-social-card.png` — the same one on all five |
      | `/dasha` | ✅ | its own desk card |
      | `/studio` | ❌ **none** | — |

- [ ] 🔑 **F2a.** `/studio` is the only surface with no card at all, and it is the most shareable
      thing we own — a creative tool that currently unfurls as a bare link. Its `<head>` is assembled
      from **Webflow page settings**, not a repo file, so this is a settings change behind H1 rather
      than code.
- [ ] 🤖 **F2b.** Five surfaces share one generic card. Page-specific cards are the real improvement
      — a chess card that looks like chess is a different share from a logo.
      *(First check where each `<head>` is authored; only `/how-to-buy` is a repo file.)*
- [ ] 🤖 **F4.** `/simp` has zero visuals. It is the most linkable page we have and it looks like
      a text file.
- [ ] 🤖 **F5.** Publish one number nobody else publishes and let it be cited. The refusal
      discipline is the differentiator; a citation is worth more than a post.
- [ ] 🤖 **F6.** Track referrers. There is currently no way to tell which surface brings anyone.
- [ ] 🤖 **F7.** Make the faucet path legible — a working free thing is the cheapest possible reason
      for a stranger to make a first transaction and become a distinct wallet.

## G. Market structure — yours alone

Nothing here is mine to act on and none of it is urgent, because §0 shows the ratios are fine.

- [ ] 🔑 **G1.** Liquidity is $30.5k. Research flags **under $25k** as materially slippage-prone, so
      we are just above the line — worth knowing, not obviously worth acting on.
- [ ] 🔑 **G2.** At this size *spread discipline* reportedly matters more than raw depth. Only
      relevant if a market maker is ever considered, which is a cost decision.
- [ ] 🔑 **G3.** Decide whether LP is locked or burned, and if it is, say so — it is one of the
      three things communities check and we do not currently state it.
- [ ] 🤖 **G4.** Verify the LP position state on chain before any claim about it is published.

## H. Site and infrastructure hygiene

- [ ] 🔑 **H1.** **Webflow token returns 403.** Everything in §A, §D and §E ships through it.
      This is the single blocker on all site work.
- [ ] 🤖 **H2.** `boardSriOk` reports `null` in `dasha-live-verify.mjs` — unknown, not confirmed.
      An SRI guard that cannot report is not guarding.
- [ ] 🤖 **H3.** ✅ *Done 2026-08-18.* `dasha-onchain-check.mjs` could not complete at all; it now
      completes with the explorer marked unreachable rather than crashing, and no longer reports a
      false failure for a page nobody could load.
- [ ] 🤖 **H4.** `explorer.solana.com` blanket-429s this network. Consider a second identity source
      so that surface is not permanently unknown from here.
- [ ] 🤖 **H5.** Put `dasha-onchain-check.mjs` on a schedule with its output diffed, so metadata
      regressions are noticed rather than discovered.
- [ ] 🤖 **H6.** `getdasha.com` homepage is 4.49 MB against a 2.3 MB median; 3.4 MB of converted
      images are built and waiting on H1.

## I. Measurement — otherwise none of this is checkable

- [ ] 🤖 **I1.** Record today as the baseline: FDV $90,235 · liq $30,532 · 24h vol $5,802 ·
      978 holders · organic score 0 · 42 txns · 11 clones.
- [ ] 🤖 **I2.** Re-measure weekly into an append-only file. Point-in-time numbers with no series
      cannot answer whether anything worked.
- [ ] 🤖 **I3.** Track holders and *unique 24h wallets* separately from price. Price is the number
      we do not control and the one that will tempt us to conclude things.
- [ ] 🤖 **I4.** Write down in advance what would count as this checklist having failed. A plan with
      no falsifier is a wish.

## J. Deliberately not doing

From `DASHA-CRYPTO-MARKETING-BOUNDARY-2026-08-09.md`, whose rule is **recognize participation,
never purchase or promotional reach**. These are refusals, not omissions.

- **No** points, rank, access, prizes or status for buying, holding, bag size, balance or volume.
- **No** rewards for likes, reposts, replies, views, followers or referral conversions.
- **No** paid trending slots or promotion services. DexScreener's own algorithm discounts
  low-diversity volume, so buying activity is both against the boundary and technically useless.
- **No** "official coin" or endorsement claim. It is what makes the third-party Jupiter request
  something we would not want granted in its current wording.
- **No** price prediction, target, or any framing that implies return.
- **No** second Jupiter application while `23806` is pending.

---

## If only three things happen

**H1** (reissue the Webflow token — it blocks every site item), **A1+E1** (the trust facts and the
warning, shipped together on `/how-to-buy`), and **B2** (get Jupiter's metadata pointing at
getdasha.com instead of a year-old X post).

Everything else is smaller than those three, and §G is not urgent at all.
