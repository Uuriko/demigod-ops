# Discovery — 2026-08-07

Run of [`DASHA-DISCOVERY-PROMPT.md`](DASHA-DISCOVERY-PROMPT.md). Everything in
[`DASHA-HORIZON.md`](DASHA-HORIZON.md) was treated as already known; this records what is **new**.

## What is already true (verified this run)

| Fact | How checked |
|---|---|
| Market cap ~$100k, up from ~$64k earlier today | DexScreener API, live |
| On-chain token name is `dash_eats` | DexScreener API |
| Its listed website is `dasha.cam` — **still dead** (`http=000`) | `curl`, live |
| Its listed socials are `x.com/dash_eats/…` and `t.me/dashacommunity`, the Telegram the project disclaims | DexScreener API |
| `getdasha.com` appears nowhere in the token's own metadata | DexScreener API |
| Repo public, issues enabled, 2 open, `good first issue` label exists and is unused | GitHub API |

## The finding that changes something

**$dasha is already a community takeover, and nobody has said so.**

A CTO is the recognised pattern where a token's original creator leaves, the token keeps trading —
Solana memecoins are fully liquid from launch — and the community picks up the social accounts,
the site and the direction. That is an exact description of what has happened here: the creator's
site is dead, the creator's Telegram is disclaimed, and a different group built
`getdasha.com`, the Desk, the Studio and the kit.

This matters because it converts a problem into a procedure:

- **DexScreener sells a "Token Community Takeover" product** whose stated purpose is updating a
  token page's information and socials for exactly this situation
  (`marketplace.dexscreener.com/product/token-community-takeover/order`).
- Until now the stale profile looked unfixable without the original creator. It is not. There is a
  named, legitimate route to point the token's own page at `getdasha.com`.
- Listing trackers relabel these tokens as CTO, which is a *credibility* signal rather than a
  stigma — it tells a stranger why the metadata changed hands.

This is the highest-leverage item found, because every other growth idea is downstream of
discovery, and discovery currently routes to a dead domain.

**It is a paid order and a public claim about who now stewards the token — a decision for the user,
not an agent.** What it needs first: a decision that this is the framing, and honest wording that
claims stewardship of the *page* without implying the original creator endorsed the handover.

## Other findings

**The archive is the community infrastructure we do not have.** Fan communities cohere around
archives and wikis — the research describes documenting the thing as itself the act of belonging
("semiotic productivity"), with rules and tagging emerging from contributors rather than owners.
The crypto precedent is Forgotten Runes' Book of Lore. Memecoin communities almost never build one;
they build Telegram groups, which have no memory. A Dasha archive — what happened, when, who made
what — is the one asset that compounds instead of decaying, and it is contributable by people who
cannot code.

**"Good first issue" is a real discovery channel, not just hygiene.** Large numbers of first-time
contributors search that label directly; it is described repeatedly as the single best onboarding
lever, and project *health* (clear docs, active repo) beats project *fame* for first PRs. Our label
exists and is unused. `.github/seed-issues.sh` is staged and unrun.

**The failure mode is quiet, not dramatic.** The pattern in post-mortems is a volume spike, then a
flat chart and a silent community — attention loss, not a hack. Every candidate should be judged on
whether it gives someone a reason to come back on a boring day.

**Weak evidence, flagged as such:** the "97% of memecoins fail" figure circulates widely without a
traceable methodology, and most "crypto website trust signals" advice reduces to audit badges and
partner logos, which is advice for a different kind of product and would be dishonest here. Do not
cite either as fact.

## Second pass — the discovery layer is broken in four places

Added after searching for the token as an outsider would. This changes the ranking above.

**1. We are not on CoinGecko or CoinMarketCap.** The token appears on DexScreener, DexView, Phantom,
Solscan, holderscan and solsniffer — but not on either major aggregator. Both list for free.

**2. Another token owns our name.** Searching "Dasha coin" returns **Dasha (VVAIFU)**, an AI-agent
token with a larger market cap, listed on CoinGecko, CoinMarketCap, Coinbase, OKX and Bitget. A
stranger who hears "dasha coin" and searches for it finds a different asset on every major surface.
This is not fixable by better copy; it is fixable by being present where they look.

**3. The token is not Jupiter-verified.** Jupiter's process changed: there is no application any
more. Verification follows an organic score plus community support expressed as "smart likes" on the
token's Jupiter page, with an express path that burns 1,000 JUP. Verification status shows in the
interface most Solana buyers actually use.

**4. DexScreener metadata still points at the dead domain** (the CTO finding above).

**Holders: ~868** (secondary source, not independently verified this run). That is a real community,
not a rounding error — and it is large enough that the aggregator gaps cost something measurable.

**One line to hold:** asking real holders to use Jupiter's own like feature is legitimate — it is the
platform's designed channel for community support, like starring a repository. Buying likes, or
running bots, is fabricating traction and is out. The distinction is whether the person liking it
actually holds and actually means it.

## Candidates

### Build now
1. **Seed the good-first-issues.** Staged, five non-overlapping items, one command. Removes the
   "abandoned repo" impression that an empty issue list creates.
2. **The archive, minimum version.** One page, contributed by pull request, that records what
   happened and who made what. No database, no accounts — a document. It is the only item here that
   a non-coder can meaningfully own, and it compounds.

### Scope next
3. **The CTO framing and the DexScreener takeover order** — needs the user's decision on framing and
   spend before anything else.
4. **A verification desk for any Solana mint** (already in Horizon; this run raises its rank). The
   CTO pattern means thousands of communities inherit a token whose metadata they cannot trust.
   That is the same problem the Desk already solves, pointed at everyone.

### Park
- A CLI and npm distribution — plausible, but no evidence found of a crypto tool that grew this way;
  the searches returned package listings, not case studies. Do not cite it as proven.
- Anything requiring a Telegram or Discord presence, until someone is prepared to moderate it daily.

### Reject
- Audit badges, partner logos and "security seals" as trust signals. They are borrowed from
  protocols with audits to show; here they would be decoration implying a review nobody performed.
- Any "utility" invented to justify the token. The research is consistent that invented utility is
  a failure signature, not a fix.

## The three I would start — revised after the second pass

The first pass recommended product work. The second pass says that is the wrong department.

We have spent the day building things to be found with, and almost nothing on being findable. A
person who hears about this coin today lands on a different token's CoinGecko page, or on a
DexScreener profile pointing at a dead domain, or on an unverified badge in Jupiter. The Studio
being good does not survive any of those.

**Superseded — see [`DASHA-IDENTITY-DEBATE-2026-08-07.md`](DASHA-IDENTITY-DEBATE-2026-08-07.md).**
Codex and Grok independently reversed this order, and they are right: listings *amplify whatever the
token's card says*, and right now it says "dead domain". Provenance comes first. Codex also raised a
precondition I had missed entirely — whether this project has any established basis for speaking for
the token at all. Revised order:

0. ~~**Establish the mandate.**~~ **Answered 2026-08-07: the project is official** — developed by
   John Potter (x.com/potterlab), working directly with Dasha and with @perryalpha. Nothing below is
   gated on standing any more. The "community takeover" framing is retired: the DexScreener record
   still needs correcting, but as the operator fixing a stale entry, not as outsiders adopting an
   abandoned token.
1. **Fix the token's own metadata** — the DexScreener community-takeover route, so its profile stops
   pointing at a dead domain and a disclaimed Telegram.
2. **List on CoinGecko and CoinMarketCap.** Free, and worth more once the card is honest.
3. **Jupiter verification**, via organic score and real holders using the like feature.

All three are the user's to authorise: they are public claims about the token, and two cost money.
None of them is a thing an agent should do unilaterally.

**To make room:** stop adding Studio looks and stop adding features generally. Six looks proves the
format. The constraint is not that the product is too small; it is that the product is invisible.

**The one thing to build**, if something must be built: the archive — because it is the only item
that compounds and the only one a non-coder can own. Everything else waits for discovery to work.

## Not looked at

Wallet-side distribution, non-English communities, anything requiring paid data, and the actual
`@dash_eats` account history. The last one matters — the token's own X account is the one artifact
that would confirm or refute the CTO framing, and it was not read this run.
