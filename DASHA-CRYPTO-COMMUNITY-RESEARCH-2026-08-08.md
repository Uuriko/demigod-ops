# Crypto markets, tooling stack & community — research for Dasha

**Compiled:** 2026-08-08 (incremental sections as research landed)  
**Status:** Current research note. Supersedes stale *product* openings in [`DASHA-CRYPTO-LANDSCAPE.md`](DASHA-CRYPTO-LANDSCAPE.md) (forecasting/receipts-era). Psychology companion remains [`DASHA-RESEARCH-CRYPTO-PSYCHOLOGY-2026-08-06.md`](DASHA-RESEARCH-CRYPTO-PSYCHOLOGY-2026-08-06.md) with delta noted below.  
**Scope:** Markets + Solana memecoin stack + community behavior that inform **culture products** (Home / Studio / Desk / Lobby / Simp / X). Not a crypto textbook, not trading advice, not price targets.

**Public-copy constraint (user override, 2026-08-08):** no negative coin jokes, warnings, or disclaimers. Keep the exact CA, source, chart, and buy actions direct and affirmative. Match [`DASHA-BIBLE.md`](DASHA-BIBLE.md).

---

## 0. Executive (2026-08-08)

| Claim | Evidence posture |
|---|---|
| Memecoin *infrastructure* (launchpads, bots, aggregators) captures durable value; most tokens and most retail traders do not | Galaxy Research (2025-10); pump fee docs; retail P&L reports |
| Discovery → CA paste → chart → risk scan → swap is the default path; “official site” is secondary | CoinBureau buy guide; Jupiter verify docs; CT practice on X |
| **Crypto Twitter (CT)** remains the narrative/status layer; Telegram/Discord are retention + high phishing cost | CT definitions; Coinbase consumer protection; TRM/FTC scam framing |
| Power-law attention: millions of launches, tiny survivors, median hold times ~minutes/seconds | Galaxy: ~12.8M Pump tokens; 12 tokens >55% FDMC; ~100s median hold |
| InfoFi “pay-to-post” (Kaito Yaps) was curtailed; mindshare tools remain, farming is hostile | CoinDesk Yaps sunset (2026-01) |
| **Dasha’s non-overlap** is culture production + honest mint identity + opt-in identity/board — not another launchpad, screener, or FOMO feed | Product brief + this note §5 |

---

## 1. Markets (2026-08-08)

### 1.1 Size and drawdown (dated figures — drift expected)

- Aggregate meme-token market cap reported in the mid‑$20B–$30B range by mid‑2026 after a multi‑year peak near ~$135B (2024), i.e. large sector drawdown. Sources: [Bitcoin Foundation / CoinGecko category framing](https://bitcoinfoundation.org/news/altcoins/pump-fun-dead/) (2026-06), [CoinGecko meme category](https://www.coingecko.com/en/categories/meme-token).
- Pump.fun remains the dominant Solana launch surface historically: free create, bonding curve, graduation, creator fees. Official fee table (updated 2026-05): create **0 SOL**, graduation fee to PumpSwap **0.015 SOL**, creator share of trade fees. [Pump.fun fees docs](https://pump.fun/docs/fees).
- Platform activity is cyclical: reports of multi‑billion peak days (2025) and later revenue/volume compression (2026 mid-year narratives). Treat third-party aggregates as directional; prefer on-chain dashboards for ops numbers.

### 1.2 Structure of outcomes

Galaxy Research (“State of Memecoins,” Oct 2025) — primary institutional write-up used here: [galaxy.com/insights/research/memecoins-pump-fun-solana-kols](https://www.galaxy.com/insights/research/memecoins-pump-fun-solana-kols)

| Finding (Galaxy) | Product-relevant gloss |
|---|---|
| ~30% of Solana DEX volume from memes (down from ~60% early-2025 peaks) | Meme is large but not the whole Solana economy |
| ~12.8M+ Pump tokens; **12 tokens (~0.00009%) >55% of platform FDMC** | Power law: culture survivors ≠ launch volume |
| Median Solana memecoin hold time ~**100 seconds** (was ~300s) | “Community” often means seconds of PvP, not multi-year fandom |
| Value accrues to **infra** (launchpad, trading UIs, bots) more than bags | Don’t build another casino; culture sites attach to existing rails |
| Memes as **crypto onramps** (first wallet/DEX use) | Desk + clear CA + Jupiter/Pump links still matter |

Retail outcomes: March 2026 Dune/viral analyses cited ~49% wallets losing on Pump-issued tokens; ~96% either red or under $500 profit ([crypto.news](https://crypto.news/pump-fun-data-shows-49-of-march-traders-in-the-red-as-platform-locks-fees/)). **Implication for copy:** never promise upside; burned cohorts reject FOMO language (see psychology memo).

### 1.3 Creator-fee meta

- Pump creator fees + multi-wallet fee share (2025–2026 product changes) make tokens a **creator monetization** channel, not only a joke. [TradingView/Coinpedia on fee sharing](https://www.tradingview.com/news/coinpedia:5c7d05500094b:0-pump-fun-rolls-out-major-creator-fee-changes-teases-big-pump-future-ahead/); [Pump fees](https://pump.fun/docs/fees).
- Parallel “creator capital markets” on Base/Zora: every profile/post can be a coin ([Zora Coins Protocol](https://docs.zora.co/coins)). Different chain culture; same attention→trade loop.

---

## 2. Tooling stack (2026-08-08)

### 2.1 Layered stack (operational)

```
Attention (CT / TikTok / streams)
    ↓ ticker + narrative
Launch (Pump.fun / rivals / custom Meteora)
    ↓ mint CA
Charts & social discovery (Dexscreener, Birdeye, GeckoTerminal)
    ↓
Risk signals (RugCheck, Solscan authorities, Bubblemaps-style clusters)
    ↓
Execution (Jupiter aggregator, PumpSwap, Raydium, Phantom, bots e.g. Axiom)
```

| Layer | Established products | Saturation | Dasha implication |
|---|---|---|---|
| L1 / L2 rails | Solana dominant for new meme launches; ETH for legacy cults; Base/Zora social coins | High | Stay Solana-CA honest; don’t multi-chain spaghetti |
| Launch | Pump.fun (winner-most); Bonk.fun etc. flash rivals | Very high | Never become a launchpad |
| Charts | Dexscreener, Birdeye, GeckoTerminal | Very high | Link out; no second screener |
| Risk | RugCheck, Solscan mint/freeze, wallet scanners | High | Show **identity evidence**, not a “safe” badge |
| Swap | [Jupiter](https://docs.jup.ag/) (swap + token metadata + verification tags), Raydium, Phantom | Very high | Multi-rail buy links already product; keep mint match |
| Attention scoring | [Kaito](https://kaito.ai/) mindshare; Yaps post-to-earn **sunset** after X policy ([CoinDesk 2026-01](https://www.coindesk.com/business/2026/01/15/kaito-to-sunset-yaps-as-x-cracks-down-on-infofi-apps-token-falls-17)) | High | No yap farming; X intent share is enough |
| Social trading | Bullpen-style public P&L, FOMO-style pods (describe only) | High | No copy-trade / leaderboard casino |

### 2.2 Verification language (critical)

Industry “verified” usually means **metadata / community process / explorer listing**, **not** safety, endorsement, or investment quality.

- Jupiter: always check contract address; social links may be creator-supplied; verification is a distinct process ([Jupiter tokens & trading](https://docs.jup.ag/user-docs/trade/swap/tokens-and-trading), [Tokens API / verified tags](https://dev.jup.ag/docs/guides/how-to-get-token-information)).
- Solana developer guidance: token verification for explorer visibility is separate from legitimacy ([Solana verify token guide](https://solana.com/developers/guides/getstarted/how-to-verify-a-token)).
- RugCheck: free on-chain risk **signals** (authorities, holders, liquidity) — a filter, not insurance ([rugcheck.xyz](https://rugcheck.xyz/)).
- Practical buy checklists still teach: age, mint/freeze authority, sell test, holders ([CoinBureau Solana meme buy guide](https://coinbureau.com/guides/how-to-buy-solana-meme-coins)).

**Product rule:** Desk/Home show the exact CA, its public source, chart, and direct routes without coin-warning or disclaimer copy.

### 2.3 Distribution primitives

- [X Web Intents](https://docs.x.com/x-for-websites/web-intents/overview): user-authorized prefilled posts; author always confirms. Prefer intents over auto-post or scrape farms.
- Artifact share (meme PNG/story, board row text, quiz card) > “join our Telegram for alpha.”

---

## 3. Crypto community behavior (2026-08-08)

### 3.1 Crypto Twitter (CT)

- **CT** = informal name for the crypto conversation on X: traders, founders, meme accounts, KOLs. Drives narrative, status, and often short-term price attention. Definitions: [Volity CT explainer](https://volity.io/crypto/ct-crypto-twitter/), [Tangem CT intro](https://tangem.com/en/blog/post/crypto-twitter/).
- Behaviors observed in primary CT practice posts (2026):
  - Discovery loop: X virality + Pump launchpad + on-chain alerts → categorize meme (AI, animal, PolitFi, TikTok, persona, frontrun event) → risk pass → trade cycle (launch → virality → consolidate → second wave or death). Example methodology thread: [GemisAlpha 2014976586584334647](https://x.com/GemisAlpha/status/2014976586584334647).
  - Attention lifespan as edge: flash vs multi-day vs cross-platform animal vs community-backed ([Nofelinesss 2085669785468105119](https://x.com/Nofelinesss/status/2085669785468105119)).
  - Status = being “early,” posting CA, sharing PnL screenshots, dunking on rugs — not long-form product docs.
- Galaxy: X + TG amplify shills; **KOLs** amplify or kill coins; communities substitute belief for fundamentals.

### 3.2 Telegram / Discord

- Still used for retention, raids, “pods,” and “alpha.” Also **primary scam surface**: admin impersonation, fake support, wallet-drain links, community takeovers. [Coinbase: scammers on Discord/Telegram](https://www.coinbase.com/blog/consumer-protection-tuesday-how-scammers-are-targeting-crypto-communities); [FTC crypto scams](https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-scams); TRM crime reports (AI-scaled impersonation).
- **Implication:** Describe competitor TG/Discord usage; do **not** make Telegram the product home. Dasha default: **Lobby (on-site) + X**. Discord blueprint may exist as optional later; never “official TG community” claims. Banned: `t.me/dashacommunity` as recommended HQ ([DASHA-BIBLE](DASHA-BIBLE.md)).

### 3.3 Culture vs PvP

| Mode | Behavior | Longevity |
|---|---|---|
| PvP trench | Sub-minute holds, bots, bundles, vampire forks | Hours |
| Cult / community-backed | Shared identity, memes, multi-month survivors | Months–years |
| Persona / celebrity association | High media, high dump risk, endorsement confusion | High variance |

Dasha sits closer to **persona-adjacent culture** with public association rules: mint may appear on @dash_eats posts; she is **not the dev**; site must not invent endorsement ([bible + @dash_eats source posts](https://x.com/dash_eats)).

### 3.4 $dasha-adjacent CT snapshot (sample, not exhaustive)

Illustrative mentions only — not metrics product:

- CA paste culture on X: e.g. [PerryALPHA 2085406351937703996](https://x.com/PerryALPHA/status/2085406351937703996) quoting mint `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump`.
- Bot/signal noise: paid Dexscreener-style pings with stale volume (e.g. low-engagement signal bots) — noise floor, not demand.
- Historical bag storytelling is common and unreliable; never scrape into product truth.

---

## 4. Competitors & distribution patterns (2026-08-08)

| Pattern | Who | Do / don’t for Dasha |
|---|---|---|
| Industrial launch + creator fees | Pump.fun | Link Pump coin page; don’t launch coins |
| Chart + trend lists | Dexscreener / Birdeye | External links only |
| Aggregated swap | Jupiter | Primary buy rail + plugin when intentional |
| Instant bot trading UIs | Axiom et al. | Out of scope |
| Mindshare / InfoFi | Kaito (post-Yaps) | No post-to-earn; optional later mindshare *observation* only |
| Creator coins social | Zora | Different stack; same “attention market” lesson |
| Public trader performance | Bullpen / FOMO pods | No P&L leaderboard product |
| Meme authoring | Generic meme makers | **Studio** is the culture production wedge |
| Opt-in identity boards | Niche communities | **Simp Board** + optional X OAuth (not mandatory gate forever) |

---

## 5. Dasha product implications (current surfaces only)

Mapped to **Home · Studio · Desk · Lobby · Simp · X**. Historical forecasting/receipts ideas are **retired** — see landscape supersession.

| Surface | Implication from research | Guardrail |
|---|---|---|
| **Home** | Culture + mint identity + Studio seeds + board; CT expects CA + vibe, not thesis essays | Direct, affirmative copy; no coin warnings or disclaimers |
| **Studio** | Memes are the native unit of CT attention; portable share artifacts beat chat walls | Share via X intent; optional X credit; no download-score theater |
| **Desk** | Full CA, multi-rail buy, charts out | Keep it factual and concise |
| **Lobby** | On-site chat reduces TG phishing surface while keeping live energy | Capacity limits; no wallet connect required for chat |
| **Simp Board** | Opt-in status games fit CT (rank, quiz, share) without paid yap farming | Explicit join; optional first-visit Connect X only |
| **X** | Distribution default; @dash_eats primary culture source | Intents; no auto-post; no fake endorsement |

**Crowded — reject:** new launchpad, screener, swap, copy-trading, FOMO raid tool, Telegram-as-HQ, “Ansem product,” price targets.

**Open enough for culture product:** editable meme/signal artifacts, honest mint verify UX, measured opt-in board, lobby chat, X share loops.

---

## 6. Delta vs prior research (2026-08-08)

### vs [`DASHA-CRYPTO-LANDSCAPE.md`](DASHA-CRYPTO-LANDSCAPE.md) (2026-08-06)

| Prior landscape | Update |
|---|---|
| Product opening framed as “reasoning-and-receipts layer” / pre-outcome claims | **Superseded for product.** Receipts/Thesis/Pair scrapped. Landscape file now points here for current implications. |
| Discord as “user-selected community home” | Softened: **Lobby + X** are live defaults; Discord remains blueprint-only |
| Stack table (Pump, Jupiter, Kaito, Bullpen…) | Still valid; refreshed with 2026 fee/Yaps/market-drawdown evidence |
| Ansem boundary | Unchanged: no affiliation claims |

### vs [`DASHA-RESEARCH-CRYPTO-PSYCHOLOGY-2026-08-06.md`](DASHA-RESEARCH-CRYPTO-PSYCHOLOGY-2026-08-06.md)

| Psychology memo (still useful) | Delta |
|---|---|
| FOMO → regret/heuristic chain; post-burn audience | **Still stands.** Reinforced by 2026 retail P&L and hold-time compression |
| Accountability / pre-decisional public calls as product mechanism | Mechanism literature still interesting; **product no longer ships Thesis Card / forecasting**. Do not revive from psychology claims alone |
| Memecoin mcap / Pump stats via coinlaw aggregates | Prefer Galaxy + primary docs + dated news; treat blog aggregates as secondary |
| Discord-heavy distribution notes | Prefer X + Lobby in current product implications |

### vs pivot docs (2026-08-06)

[`DASHA-PIVOT-LANDSCAPE-2026-08-06.md`](DASHA-PIVOT-LANDSCAPE-2026-08-06.md) / decision: **historical only**. Do not re-activate forecasting from this research.

---

## 7. Source index (major claims)

| Topic | Sources |
|---|---|
| Pump fees / creator economics | https://pump.fun/docs/fees |
| Memecoin stack & power law | https://www.galaxy.com/insights/research/memecoins-pump-fun-solana-kols |
| Sector drawdown narrative | https://bitcoinfoundation.org/news/altcoins/pump-fun-dead/ · CoinGecko meme category |
| Retail P&L snapshot | https://crypto.news/pump-fun-data-shows-49-of-march-traders-in-the-red-as-platform-locks-fees/ |
| Jupiter verification | https://docs.jup.ag/user-docs/trade/swap/tokens-and-trading · https://dev.jup.ag/docs/guides/how-to-get-token-information |
| Solana token verify | https://solana.com/developers/guides/getstarted/how-to-verify-a-token |
| RugCheck | https://rugcheck.xyz/ |
| Buy path practice | https://coinbureau.com/guides/how-to-buy-solana-meme-coins |
| CT definition | https://volity.io/crypto/ct-crypto-twitter/ · https://tangem.com/en/blog/post/crypto-twitter/ |
| TG/Discord scams | https://www.coinbase.com/blog/consumer-protection-tuesday-how-scammers-are-targeting-crypto-communities · https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-scams |
| Kaito Yaps sunset | https://www.coindesk.com/business/2026/01/15/kaito-to-sunset-yaps-as-x-cracks-down-on-infofi-apps-token-falls-17 |
| Zora creator coins | https://docs.zora.co/coins |
| X intents | https://docs.x.com/x-for-websites/web-intents/overview |
| CT practice (examples) | https://x.com/GemisAlpha/status/2014976586584334647 · https://x.com/Nofelinesss/status/2085669785468105119 |
| $dasha CA on X (example) | https://x.com/PerryALPHA/status/2085406351937703996 |

---

## 8. Research log (append-as-you-go)

| When | What landed |
|---|---|
| 2026-08-08 | Markets + Pump fees + Galaxy stack; wrote §1–2 |
| 2026-08-08 | CT/TG community + scam surfaces + X samples; wrote §3 |
| 2026-08-08 | Kaito Yaps sunset, Zora, competitor matrix; wrote §4–5 |
| 2026-08-08 | Landscape/psychology deltas + source index; §6–7 |
| 2026-08-08 | X-linked identity deep dive → [`DASHA-X-IDENTITY-RESEARCH-2026-08-08.md`](DASHA-X-IDENTITY-RESEARCH-2026-08-08.md) (Yaps wall, intents, credit/remix opportunities) |
| 2026-08-09 | 2026 consumer-product + large-sample Pump.fun delta; added §9 |
| 2026-08-09 | Owned-community / social-feed delta and Lobby protocol audit; added §10 |
| 2026-08-09 | Cross-aggregator token discovery audit; added §11 |
| 2026-08-09 | X identity privacy/deletion audit; added §12 |

## 9. 2026-08-09 delta — attention markets, quests, and causal restraint

### What actually changed

Two consumer patterns are now unusually visible:

1. **Financialized attention.** Zora now describes every post as a tradeable coin and has added P&L cards, creator earnings, wallet research, quick-buy feedback and trading agents. Pump continues to pay creator fees on trades. This is a coherent product lane, but it collapses creation, status and speculation into one action.
2. **Curated, short quests.** Solana Mobile's Seeker Summer uses a quick quest plus a deeper quest, date-stamped badges, limited rounds and curated app discovery. The official program emphasizes returning for the next drop; it does not require every app to invent a new social network.

Solana Mobile also reports a rapidly growing distribution surface (1,000+ dApps and themed spotlight curation). That is evidence that mobile distribution exists, not evidence that Dasha presently needs a native app. Mobile Wallet Adapter remains Android/mobile-web constrained, and the current responsive web product has no observed demand that justifies native packaging.

### Recent preprints: useful results, narrow interpretation

- A July 2026 preprint observes **832,941** Pump.fun launches in a 34-day window and reports a **0.198%** 24-hour graduation rate. Listings with Telegram or all three social channels graduated more often. This is observational and social-link presence can proxy creator preparation, audience, self-buying or launch quality; it does **not** prove that adding Telegram causes durable community.
- A companion study finds persistent early-buyer cohorts across **166,098** launches, but an activity-matched placebo produced an even larger apparent buyer-flow lift. The authors explicitly reject a strong cohort-specific causal interpretation. This is a direct warning against turning early-wallet activity into “smart community” status.
- A February 2026 paper finds fast bonding-curve progress and creator/trader history predictive of graduation, while noting limited support for the most selective creator groups. Its outcome is protocol graduation, not cultural durability, fandom or product retention.

### Dasha decision

Do **not** copy Zora's per-post coins, P&L/status feed, auto-trading agents, Pump fee games, Telegram presence, raid mechanics or wallet-activity rank. Those mechanisms would financialize the culture loop and the cited evidence does not show they create durable participation.

The smallest testable borrowing from the quest pattern is already mostly built:

`quick/deep quiz → tailored Studio seed → export/share → optional editorial recognition`

After the prepared release has real, non-operator funnel data, test **one rotating Studio prompt** inside the existing Studio—not a new route, token, badge system or app. One prompt should have one visual seed, one short action and one optional X share intent. Success means higher first-edit → export/share completion than the unprompted baseline; otherwise delete it. Do not build this before baseline traffic exists.

### Primary sources

- [Solana Mobile: Seeker Summer quests and dated badges](https://solanamobile.com/blog/seeker-summer-is-here-complete-quests-earn-badges-and-explore-apps-all-summer-long)
- [Solana Mobile: 1,000+ dApps and themed discovery](https://solanamobile.com/blog/1-000-dapps-smarter-discovery-and-a-bigger-seeker-season)
- [Zora 2026 product changes](https://support.zora.co/en/articles/4641857)
- [Pump creator-fee documentation](https://pump.fun/docs/fees)
- [Kamat: 832,941-launch graduation survival analysis](https://arxiv.org/abs/2607.02823)
- [Kamat: coordinated cohorts and placebo limits](https://arxiv.org/abs/2607.02795)
- [Marino et al.: predicting Pump.fun graduation](https://arxiv.org/abs/2602.14860)

## 10. 2026-08-09 delta — own the room, not another feed

### Evidence

- X reportedly retired Communities after citing low usage and disproportionate spam, scam, and malware reports. The exact percentages are an X executive's own characterization, not an independently audited study. X's Help Center and API reference still describe Communities after the reported shutdown date, so neither documentation residue nor the shutdown report alone should carry the product decision. The durable signal is the moderation and retention obligation of owning another feed before demand exists.
- Acorn launched a broad owned-community stack—custom feeds, onboarding packs, reputation, moderation, analytics, and optional self-hosting—on AT Protocol. AT Protocol itself offers portable identity/data and a public firehose. This proves such infrastructure is available; it does not prove Dasha needs to operate it.
- Trading products are moving the other direction: OKX Orbit joins market discussion, performance, and execution; KuCoin Feed markets post-to-earn creator rewards. These are exchange-retention products, not evidence that a small cultural site benefits from a feed or engagement payouts.
- Pump's own moderation notice says a 100× livestream increase required hundreds of daily removals, doubled human moderation, automated systems, and ultimately a pause. User-generated surface area creates operating cost before it creates community value.
- X's current Filtered Stream can deliver narrow matching posts over one pay-per-use persistent connection. X also documents webhook delivery, but the webhook guide sits under an Enterprise-labelled section; verify account entitlement instead of assuming the same transport is included. Reads are currently listed at $0.005 per Post resource and repeated reads are generally deduplicated within a UTC day. Dasha's shipped Studio share text includes `getdasha.com/studio`, so later creator discovery is technically feasible without a public submission form.

### Weakest sufficient conclusion

Keep the Lobby as one small, owned room and X as outbound distribution. Do not add a feed, DMs, token gating, engagement rewards, AT Protocol identity, or another community platform. Import only invisible operational lessons: bounded history, strict link validation, rate limits, automatic shield mode, operator mute/clear controls, and authenticated identity as an optional privilege.

The protocol audit found a stale anonymous `report` WebSocket frame after the Report UI had been removed. It had no legitimate caller but could still increment counters and influence auto-shield. The frame, queue, stats field, watcher output, and stale operator documentation were removed; forged report frames now fail closed as unknown types. This reduces abuse surface without adding visible controls.

Creator discovery remains deferred until genuine Studio shares exist. If that trigger is reached, use one narrow X stream rule, match the returned immutable `author_id` to an opted-in Board profile, deduplicate post IDs, enforce a spending ceiling, and send candidates to editorial review. Discovery must never award points by itself.

### Sources

- [X Communities shutdown and stated moderation load](https://techcrunch.com/2026/04/23/x-is-shutting-down-communities-because-of-low-usage-and-lots-of-spam/)
- [X Help — Communities (still published after the reported shutdown)](https://help.x.com/en/using-x/communities)
- [X Developer Platform — Communities lookup (still documented after the reported shutdown)](https://docs.x.com/x-api/communities/lookup/introduction)
- [Acorn owned-community launch](https://techcrunch.com/2026/05/04/as-x-shuts-down-communities-acorn-debuts-an-alternative-that-puts-creators-in-control/)
- [AT Protocol: portable records and public firehose](https://atproto.com/)
- [OKX Orbit](https://www.okx.com/en-us/learn/orbit-traders-social-network)
- [Pump community moderation notice](https://pump.fun/docs/moderation-message)
- [X filtered stream](https://docs.x.com/x-api/posts/filtered-stream/introduction)
- [X pay-per-use pricing](https://docs.x.com/x-api/getting-started/pricing)

## 11. 2026-08-09 delta — aggregator identity is a separate trust layer

The exact mint has coherent durable identity: finalized classic SPL Token, 6 decimals, null mint/freeze authorities, immutable Metaplex account, content-addressed JSON/image, canonical graduated Raydium pool, and a live Jupiter route. But aggregator presentation is independently editable and can diverge from that truth.

- Immutable Pump metadata names `dash_eats`, symbol `dasha`, the permanent image, and the original Dasha X post; it contains no website.
- Jupiter reproduces that identity and pool but currently exposes no `website`; its unauthenticated response does not positively state VRFD verification. Missing data is not treated as a negative verification result.
- Jupiter VRFD now accepts reviewed metadata-only updates independently of on-chain metadata mutability. This makes a future `getdasha.com` website association technically possible without changing the mint.
- Dexscreener's editable profile points to `dasha.cam` and the banned Telegram even though its pool identity is correct. Therefore a valid pair address does not make every profile field suitable as a project destination.
- GeckoTerminal independently resolves the same Raydium pool, exact base mint, and wrapped-SOL quote without exposing those stale destinations.

**Product action:** public chart links now use GeckoTerminal's exact pool. Dexscreener remains only a non-clickable data/image provider inside Desk. The fast ship gate rejects future clickable Dexscreener profile links. The on-chain checker validates the original X source and both canonical-pool views, while reporting Jupiter website/verification visibility as soft discovery gaps.

**Weakest conclusion:** do not call an aggregator profile authoritative as a whole. Bind each claim to the narrow field and source that establishes it: Solana for mint mechanics, Metaplex/IPFS for durable identity, Jupiter for route/discovery, and GeckoTerminal for the public chart. A future VRFD metadata update should be reported only after readback.

Sources: [Solana Metaplex metadata guide](https://solana.com/docs/tokens/metaplex) · [Jupiter Tokens API](https://dev.jup.ag/docs/tokens) · [Jupiter VRFD metadata updates](https://dev.jup.ag/docs/tokens/verification) · [GeckoTerminal canonical pool](https://www.geckoterminal.com/solana/pools/9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7)

## 12. 2026-08-09 delta — identity perks create a data product

X OAuth is small in UI but not legally or operationally neutral. X's current Developer Policy requires a privacy policy before sign-up, easy login/logout, clear disclosure and control, and deletion or modification of stored X content within 24 hours of an X or account-owner request. Authentication by itself is not consent for unrelated actions.

Dasha's requested scopes are already minimal (`tweet.read users.read`), and the prepared implementation does not retain OAuth access or refresh tokens. Its persisted identity footprint is narrower than many crypto community products: X ID/handle/avatar/verification type for opted-in Board records; quiz score and reviewed evidence; holder-check timestamps but no wallet/balance; bounded Lobby history; anonymous Studio/quiz aggregates.

The audit still found two gaps:

1. `/oauth/x/start` redirected immediately without displaying a privacy policy.
2. “Leave Board” removed the current profile and claims but did not scrub retained season snapshots, active linked attempt, current result page, or holder nonce.

Both are closed locally. OAuth now stops at a one-screen notice linking the full public privacy contract. Board leave performs deletion in the same authenticated request and keeps logout separate. Season snapshots now carry a private X-ID→handle deletion index that never enters `publicSeasons`; legacy rows use a handle fallback. Aggregate funnel counts remain because they cannot identify a person.

**Product implication:** do not add email, wallet identity, follow graphs, likes, or engagement scraping. Each new identifier expands consent, deletion, and compliance-stream obligations. The clean product advantage is not “zero data”; it is a small declared data lifecycle with a working exit.

Sources: [X Developer Policy](https://docs.x.com/developer-terms/policy) · [X developer data-handling guidelines](https://docs.x.com/developer-guidelines) · [X compliance streams](https://docs.x.com/x-api/compliance/streams/introduction)

*End of note. Update this log when refreshing numbers; do not silently fork a parallel “final” doc.*
