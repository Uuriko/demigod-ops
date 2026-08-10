# Dasha — crypto psychology, persuasion and group dynamics: what the literature says

Compiled 2026-08-06. Every claim below is sourced; where I'm extrapolating to Dasha
rather than reporting a finding, the line starts with **Implication**.

> **2026-08-08 delta (read first):** Companion market/stack/community research is in  
> [`DASHA-CRYPTO-COMMUNITY-RESEARCH-2026-08-08.md`](DASHA-CRYPTO-COMMUNITY-RESEARCH-2026-08-08.md).  
> - **Still valid:** FOMO/heuristic/herding mechanisms; post-burn audience prefers honesty over hype; information overload → influencer shortcuts. Reinforced by 2026 retail P&L and ~100s median hold times (Galaxy).  
> - **Product delta:** Implications that assume Thesis Card / pre-outcome public forecasting / “accountability product” as the live wedge are **historical**. Those surfaces are scrapped. Do not revive them from this memo alone. Current culture-product implications live in the 2026-08-08 note §5.  
> - **Stats hygiene:** Prefer dated primary/official docs and Galaxy over undated blog aggregates for mcap/Pump volume claims.

The short version: **the academic literature independently describes Dasha's product
as the intervention.** That is unusual and it is the most valuable thing in this
document. The strongest distribution asset here is not a persuasion tactic — it is
that the mechanism has research behind it and no competitor is citing any.

*(Note 2026-08-08: “the product” in the sentence above referred to forecasting/receipts-era
Dasha. Literature on accountability remains interesting; it is not a license to ship
scrapped surfaces.)*

---

## 1. The market Dasha is entering

| Fact | Source |
|---|---|
| Memecoin sector market cap ≈ **$30.6B** (June 2026), rebounded ~$8B | coinlaw.io |
| **~97%** of launched memecoins have died or collapsed in volume; average lifespan ≈ 1 year | coinlaw.io |
| Pump.fun Q1 2026 volume > $2B, declining since | coinlaw.io |
| Pump.fun **profitable wallets rose 56.8% (Feb) → 73.3% (Apr 2026)** — reversing the 2024–25 pattern | coinlaw.io |
| Memecoins lost **$110B** from the 2024 peak; Pump.fun down ~80% | bitcoinfoundation.org |
| TRUMP token: ~$75 shortly after launch, collapsed later that year | CoinMarketCap Academy |
| Most traders still lose while insiders and early wallets capture the gains | coinlaw.io / The Conversation |

**Implication.** The addressable audience is *post-burn*, not pre-burn. A very large
cohort lived through the 2025 celebrity-coin supercycle and lost money to it. That
cohort is not persuadable by hype — they have antibodies to it — but they are the
only cohort with a felt need for what Dasha sells. Targeting the FOMO cohort with
FOMO tactics puts the product in direct competition with every other coin on its
weakest axis. Targeting the burned cohort with the accountability pitch puts it in
competition with nobody.

---

## 2. Why people buy: the mechanism, per the research

**FOMO is mediated, not direct.** Anticipated regret partially mediates FOMO →
investment intention, and so does subjective expected pleasure. Cognitive load
mediates FOMO appeals → investment intention. (Prasad et al. 2025, *Sage*; MDPI
*Psychology International* 2026)

**Information overload is the enabling condition.** Under overload, heuristics —
*following influencers, imitating peers, relying on price momentum* — operate as
"filtering mechanisms that simplified complexity." (MDPI, *When More Is Less*)

**Sentiment beats fundamentals for the target demographic.** Young, less-experienced
participants trade on sentiment transmitted via Google/Twitter rather than
fundamentals, *especially during market stress*. Cryptocurrencies respond more to
social-media sentiment than to macroeconomic news. (ScienceDirect; PMC COVID herding
study)

**Herding is measurable and causal-ish.** Attention Granger-causes price co-movement;
herding produces synchronous price movement across BTC/ETH/LTC/XMR consistent with
bubble evolution. (ScienceDirect, *Attention and retail investor herding*)

**Echo chambers move meme assets specifically.** The r/WallStreetBets study found
meme stocks (GME, AMC) were substantially more sensitive to social-network activity
than non-meme stocks — the price/volume behaviour of AAPL and MSFT was **entirely
unaffected** by social media activity. (arXiv 2203.13790)

**Implication.** The overload → heuristic → herd chain is the exact chain Dasha
interrupts. The product's insight ("write the call before the chart writes the
story") is a load-reduction device: it forces one structured decision at the moment
of lowest cognitive load rather than a stream of unstructured ones at the highest.
That is a real, defensible mechanism claim and it is currently unstated in the copy.

---

## 3. The finding that validates the mechanism — and constrains the design

This is the most important section. **Lerner & Tetlock's accountability research
specifies the exact conditions under which "make a public call" improves judgment,
and Dasha's current design satisfies them almost by accident.**

Findings:

- **Pre-decisional** accountability, to an **unknown audience**, produces increased
  integrative complexity and improved judgment via **preemptive self-criticism**.
- Subjects in the **pre-exposure** accountability condition "reported more
  integratively complex impressions, made **more accurate behavioral predictions**,
  and reported **more appropriate levels of confidence** in their predictions" than
  either no-accountability or **post-exposure** accountability subjects.
- When people *know* the audience's views, or are *constrained by past commitments*,
  the effect inverts — you get conformity and **bolstering** (defending the position
  you already took) instead of complexity.
- Accountability for outcomes outside one's control produces either risk-averse
  consensus forecasts or **escalating commitment to initially off-base forecasts**.

(Lerner & Tetlock 1999, *Accounting for the Effects of Accountability*, Harvard;
Hall 2015 review; Tetlock, social contingency model)

**Three hard design constraints fall directly out of this:**

1. **Pre-decisional or nothing.** A receipt written *before* the position is the
   whole intervention. A receipt written after is not a weaker version of it — the
   research says post-exposure accountability performs **no better than none**, and
   invites bolstering. Anything in the product that lets someone backfill a thesis
   destroys the mechanism. *(Current design is correct here — verify it stays that
   way.)*
2. **Unknown audience beats known audience.** Publishing into a follower base whose
   view you already know is the "known audience" condition that produces conformity.
   This is an argument against tightly-coupled community features early, and for the
   card being a portable artifact rather than a feed post.
3. **Accountability must attach to the *process*, not the *outcome*.** Holding
   someone to a price outcome they don't control produces escalating commitment —
   the pathology Dasha exists to prevent. Holding them to *did you state an
   invalidation condition, and did you honour it* is process accountability, which
   the Good Judgment Project literature supports (process-accountability conditions
   received process scores and worked-example rationales). **Dasha's invalidation
   field is the process-accountability instrument.** It should be framed that way and
   never scored on P&L.

**Implication.** Point 3 is a product decision with a research answer, and it cuts
against the obvious roadmap instinct to build a leaderboard of who was *right*. A
leaderboard of who was *right* recreates the pathology. A record of who **stated an
invalidation and honoured it** is the defensible thing, and it is also the thing
nobody else can copy quickly because it requires the pre-commitment artifact.

---

## 4. The paper that is effectively Dasha's roadmap, written by researchers

*"Credibility Matters: Motivations, Characteristics, and Influence Mechanisms of
Crypto Key Opinion Leaders"* — Kropiunig, Kremer & Haslhofer (Complexity Science Hub
Vienna / Austrian Institute of Technology), **CHI 2026**, Barcelona, April 2026.
ACM DL 10.1145/3772318.3791784.

**Provenance: read in full.** The ACM copy is paywalled (403), but a free preprint is
at **arXiv 2603.12000** and everything below is quoted from it, not from an abstract
snippet.

Method: 13 semi-structured interviews with crypto KOLs across Europe, the US and Asia;
hybrid human–LLM thematic analysis guided by self-determination theory; two independent
human coders, Krippendorff's α = 0.78.

The paper identifies **four community-recognised markers of credibility** — the authors'
own wording:

1. **Self-regulation** — "KOLs decline misaligned sponsorships and impose personal rules
   on promotion"
2. **Bounded epistemic competence** — "acknowledging the limits of one's expertise and
   **avoiding prognostication**"
3. **Accountability** — "cultivating long-term trust through transparent disclosure and
   community stewardship"
4. **Reflexive self-correction** — "learning from past failures and continuously
   reassessing own practices"

Crucially, they find credibility is "a self-determined, **ethically enacted practice**"
rather than "a set of static credentials" — i.e. it is a *thing you do repeatedly*, which
is exactly what a per-call artifact records and a credential cannot.

Proposed design implications:

- "badges for verified sponsorships or investment statements"
- "indicators that track predictive accuracy over time"
- "automated detection of undisclosed promotions"
- interoperable **"trust profiles"** consolidating disclosure histories and accuracy scores
- a community-endorsed **"finfluencer charter"** specifying disclosure formats and risk warnings

**One honest tension.** Their "indicators that track predictive accuracy over time" is an
*outcome* measure, which sits against §3.3's process-not-outcome argument from Tetlock.
Marker 2 — "avoiding prognostication" — cuts the other way and supports §3.3. The two
literatures are not fully aligned here and the roadmap should decide deliberately rather
than assume they agree.

**Implication.** Marker 1 is the thesis card's constraint fields. Marker 3 is the
card itself. Marker 4 is the invalidation condition being honoured. The three
proposed features are Phase 1–3 of the roadmap. This is peer-reviewed, CHI-tier,
2026 evidence that the market *recognises* these markers — meaning the product isn't
betting on educating people into valuing accountability; they already do.

Supporting: platforms that disclose methodology, share historical accuracy data, and
present probabilistic rather than guaranteed forecasts "earn considerably more
trust," and most platforms **do not** reveal whether following their calls would have
profited. (financefeeds)

Corroborating the gap: forecasters "rarely provide ex post data on actual accuracy,"
and when asked typically say it's confidential or unavailable — documented track
records are usually **not available at all**. (Flyvbjerg, arXiv 1302.2544)

---

## 5. Distribution — what the research actually supports

**The artifact is the distribution.** A thesis card is a shareable image whose sharer
has a personal stake in it being seen. That is organic distribution driven by
commitment-consistency, and it costs nothing. The single highest-leverage growth work
is therefore making the card *good* — legible, screenshot-safe, unambiguous about
what it does and doesn't claim. This is already most of the way there.

**Lead with the loss, not the gain.** Anticipated regret is a documented mediator of
crypto investment intention. The honest application is not manufacturing regret about
missing a pump — it's naming the regret people have already felt: the call they can't
defend, the thesis they rewrote after the fact. That's true, it's specific, and it
addresses the post-burn cohort in §1.

**Go where the burned are, not where the hype is.** Echo-chamber research says
meme-asset communities are maximally social-media-sensitive. That cuts both ways:
those venues move fast on a genuinely novel framing, and they are also where the
anti-accountability incentive is strongest. Expect the pitch to land with people who
have been wrong publicly and to be actively resented by people whose business is
never being pinned down. The resentment is a signal the positioning is working.

**Cite the research.** No competitor in this space is pointing at Tetlock or CHI
2026. "There is a body of research on why this works, here it is" is a durable
differentiator in a category where every other claim is a vibe.

---

## 6. Compliance — this constrains distribution hard, read before spending anything

This is not optional-nice-to-have; enforcement materially intensified in 2026.

- **FTC:** material connections must be disclosed **conspicuously and unambiguously**,
  at the **beginning** of a post, before "more"/scroll. **Every single post needs its
  own disclosure** — each is evaluated separately.
- **Penalties: $51,744–$53,088 per violation** (2025 figures), **per violation, not
  per campaign** — stacks to seven figures.
- **SEC:** promoting a token that may be a security without disclosing compensation is
  a securities violation; disclosure must cover the "nature, scope, and amount" of
  compensation. Kim Kardashian: **$1.26M settlement + 3-year crypto promotional ban**.
- **Platform-level, automated:** since **late February 2026, X automatically flags and
  suspends accounts that fail to label paid crypto promotions**. This is no longer a
  regulator-with-a-lag risk; it's same-day account loss.
- SEC, FCA, MAS and VARA are all actively monitoring.

**Two flags specific to Dasha, factual not editorial:**

1. **The celebrity angle is the enforcement bullseye.** Celebrity-backed token
   offerings are the named category regulators are pursuing. The project brief already
   records that public evidence does **not** establish legal control, celebrity
   authorization, safety or endorsement for the candidate mint. Every distribution
   asset must keep that boundary — the compliance exposure and the product's honesty
   claim happen to require the exact same discipline here.
2. **Paid undisclosed promotion would be self-refuting.** A product whose pitch is
   "disclose your position before you post" cannot buy undisclosed placement. Beyond
   the legal exposure, one screenshot of an undisclosed paid Dasha post ends the
   positioning permanently. If paid promotion is used, disclosure-first is both the
   legal route and the on-brand one.

---

## 7. What I'd do next with this

| # | Action | Why |
|---|---|---|
| 1 | Put the **process-not-outcome** principle into the roadmap before any leaderboard is designed | §3.3 — a "who was right" board recreates escalating commitment |
| 2 | Get the **CHI 2026 KOL paper** full text | §4 — closest thing to third-party validation; currently paywalled |
| 3 | Add one research-backed line to landing copy | §2 — the mechanism claim is currently unstated |
| 4 | Write the disclosure rule into the distribution plan **before** any promotion | §6 — automated X enforcement, per-post FTC penalties |
| 5 | Target the post-burn cohort explicitly in copy | §1 — the only cohort with a felt need |

---

## Sources

- [Attention and retail investor herding in cryptocurrency markets — ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S154461232200650X)
- [Herding behavior in the cryptocurrency market during COVID-19: the role of media coverage — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9242680/)
- [Herding behaviour in digital currency markets: survey and empirical estimation — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7452385/)
- [Virtual influence, real impact: social media sentiment and crypto market dynamics — ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2096720925001022)
- [The echo chamber effect resounds on financial markets: a social media alert system for meme stocks — arXiv 2203.13790](https://arxiv.org/abs/2203.13790)
- [Echo Chambers in Investment Discussion Boards — UChicago](https://people.cs.uchicago.edu/~ravenben/publications/pdf/echo-icwsm17.pdf)
- [When More Is Less: Information Overload and the Psychology of Decision-Making in Cryptocurrency Investment — MDPI](https://doi.org/10.3390/psycholint8010017)
- [Cryptocurrency Investment Adoption Intentions… Mediating and Moderating Effects of FOMO — Sage](https://journals.sagepub.com/doi/10.1177/09722629251326762)
- [Exploring the Psychological Drivers of Cryptocurrency Investment Biases — MDPI](https://www.mdpi.com/2227-7072/13/4/219)
- [Cryptocurrency Research: A Conceptual Model for Future Research — Psychology & Marketing](https://onlinelibrary.wiley.com/doi/10.1002/mar.70020)
- [Lerner & Tetlock, Accounting for the Effects of Accountability (1999) — Harvard](https://projects.iq.harvard.edu/files/lernerlab/files/lerner_tetlock_1999.pdf)
- [An accountability account: A review and synthesis (Hall 2015)](https://cebma.org/assets/Uploads/Hall-2015.pdf)
- [Accountability and adaptive performance under uncertainty — Judgment and Decision Making](https://www.cambridge.org/core/journals/judgment-and-decision-making/article/accountability-and-adaptive-performance-under-uncertainty-a-longterm-view/A16B2380B817354B0F39A392BFD1FD5C)
- [Evidence on good forecasting practices from the Good Judgment Project — AI Impacts](https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/)
- [Assessing public forecasts to encourage accountability — PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5552300/)
- [Credibility Matters: … Crypto Key Opinion Leaders — CHI 2026](https://dl.acm.org/doi/10.1145/3772318.3791784)
- [What People Look at Before Trusting a Crypto Forecast — FinanceFeeds](https://financefeeds.com/what-people-look-at-before-trusting-a-crypto/)
- [Quality Control and Due Diligence… the Outside View (Flyvbjerg) — arXiv 1302.2544](https://arxiv.org/pdf/1302.2544)
- [Predicting the success of new crypto-tokens: the Pump.fun case — arXiv 2602.14860](https://arxiv.org/pdf/2602.14860)
- [Cryptocurrency's transparency is a mirage — The Conversation](https://theconversation.com/cryptocurrencys-transparency-is-a-mirage-new-research-shows-a-small-group-of-insiders-influence-its-value-251001)
- [Memecoin Statistics 2026 — coinlaw.io](https://coinlaw.io/memecoin-statistics/)
- [Memecoins Lost $110B Since 2024 Peak, Pump.fun Crashes 80%](https://bitcoinfoundation.org/news/altcoins/pump-fun-dead/)
- [Meme Coins This Year: Top 5 Predictions for 2026 — CoinMarketCap Academy](https://coinmarketcap.com/academy/article/meme-coins-this-year-top-5-predictions-for-2026)
- [2026 FTC Influencer Disclosure Rules — Launchpoint](https://www.launchpointhq.com/blog/ftc-influencer-disclosure-guide)
- [From Memes to Millions: Regulating Celebrity-Backed Crypto Offerings — Cassels](https://cassels.com/insights/from-memes-to-millions-regulating-celebrity-backed-crypto-offerings/)
- [Celebrity Crypto Fines Flag Lessons for Lawyers — Bloomberg Law](https://news.bloomberglaw.com/us-law-week/celebrity-crypto-fines-flag-lessons-for-lawyers)
