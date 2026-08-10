# X-linked identity: research for Dasha product use

**Compiled:** 2026-08-08  
**Status:** Research decision input (not a ship plan).  
**Question:** How else can Dasha take advantage of people linking X accounts—what works in crypto/culture products, what X policy killed, what fits Home / Studio / Desk / Lobby / Simp?

**Honesty constraints:** Association ≠ endorsement. No “official,” “safe,” FOMO raids, Telegram-as-HQ, or pay-to-post farming. Match [`DASHA-BIBLE.md`](DASHA-BIBLE.md).  
**Companion:** markets/stack/community → [`DASHA-CRYPTO-COMMUNITY-RESEARCH-2026-08-08.md`](DASHA-CRYPTO-COMMUNITY-RESEARCH-2026-08-08.md).

---

## 0. Executive

| Finding | Source posture | Dasha implication |
|---|---|---|
| On CT, **@handle is social identity** comparable to a wallet for brand/reputation | CT practice; KOL economy | Linking should **name people**, not scrape graphs |
| **Post-to-earn / InfoFi** (Yaps-class) was **killed by X policy** (2026-01); incentive spam + AI replies | CoinDesk, CoinGecko, X product leadership coverage | Do **not** reward “post about $dasha” via API scoring |
| **Web Intents** let users post/share **without app OAuth write** — user always confirms | [X Web Intents docs](https://docs.x.com/x-for-websites/web-intents/overview) | Default distribution = intent + prefilled text/image, not `tweet.write` |
| Industry uses X connect for **login, credit, leaderboards, anti-sybil soft signal** | Bullpen (X as signup), airdrop flows, CT “blue check / brand” posts | Dasha already has identity path; expand **credit + portable artifacts** |
| Memecoins live on **community + culture + attention**, not utility decks | Galaxy memecoin research; CMC/meme primers | Best use of link = **attribution in culture loops**, not trading features |
| Portable identity dream (Farcaster/Lens) remains **crypto-niche at scale** | 2026 de-soc analyses | Stay **X-native for distribution**; don’t rebuild a social network |

**One-line strategy:** Treat linked X as **stable public identity + credit surface + higher-trust on-site perks**, and treat **share as user-authorized intents**. Never treat it as a post farm or endorsement engine.

---

## 1. What “connect X” means in the wild (2025–2026)

### 1.1 Three product patterns

| Pattern | What the product wants | User gets | Risk |
|---|---|---|---|
| **A. Identity / login** | Unique person, handle, avatar | One-tap profile, less bot nick spam | Sybil via multi-accounts still possible |
| **B. Attention / post-to-earn** | Mindshare, spam volume, “yaps” | Points, airdrop weight | **X banned incentivized posting apps** (2026-01) |
| **C. Social performance** | Public PnL, follow traders, share alpha | Status on leaderboard | Casino framing; not Dasha’s product |

Dasha today is closest to **A** (plus light C-style board points that are **on-site measured**, not “post more on X”).

### 1.2 Why crypto users accept connect

Observed CT framing (examples):

- Connect X = **social identity** for protocols and reward eligibility soft checks ([e.g. community reply framing, 2026](https://x.com/RayhanTreader/status/2086084256665915865)).
- “Verified Twitter as important as a wallet” for **creator/brand era** (KOL/testnet meta; [example thread](https://x.com/wilson_/status/1968630226436366374)) — status culture, not pure security.
- Projects use connect to **reduce anonymous spam** and attach rewards to a public persona (common airdrop checklist pattern: wallet + X).

**Implication:** Users tolerate OAuth when the ask is **“be yourself here”** or **“get credit.”** They bristle when the ask is **“let us post”** or **“farm replies for points.”**

### 1.3 X platform trajectory (product environment)

- **Smart cashtags / in-app coin surfaces** on X (2026 reporting: live charts + feeds for $tickers / CAs) — discovery increasingly **stays inside X** ([TradingView/99Bitcoins coverage](https://www.tradingview.com/news/99Bitcoins:3d2d285ac094b:0-x-money-adds-live-crypto-cashtags-how-this-changes-coin-discovery-for-retail/)).
- **Crackdown on unofficial X data scrapers** for sniper/tracker tools (community reports of ToS enforcement) — don’t build “listen to $dasha firehose via shady API.”
- **Memecoin marketing orthodoxy** still lists X as primary surface ([TokenMinds 2026 meme marketing](https://tokenminds.co/blog/meme-coin-marketing)); quality engagement > bot volume.

---

## 2. Policy wall: why post-to-earn is dead for Dasha

### 2.1 Yaps / InfoFi sunset

- Jan 2026: X restricted apps that **reward users for posting**; InfoFi spam / AI reply farms cited.
- Kaito **sunset Yaps** and incentivized leaderboards; pivoted to selective **Kaito Studio** creator marketplace ([CoinDesk](https://www.coindesk.com/business/2026/01/15/kaito-to-sunset-yaps-as-x-cracks-down-on-infofi-apps-token-falls-17), [CoinGecko Kaito guide](https://www.coingecko.com/learn/what-is-kaito-earn-yap-points), [founder post](https://x.com/Punk9277/status/2011837292907020605)).

**Product rule for Dasha:**

- ❌ Points for “tweet about getdasha / $dasha N times”
- ❌ Auto-post, scheduled shill, reply-guy bots
- ❌ Ranking by raw X engagement harvested via API
- ✅ User opens **Web Intent** with prefilled text; **they** hit Post
- ✅ On-site actions (quiz, claim, lobby behavior) scored without reading their timeline

### 2.2 OAuth scope design (trust UX)

| Scope class | Typical use | User reaction |
|---|---|---|
| `users.read` (+ profile) | Handle, avatar, id | Low friction if optional |
| `tweet.read` | Read posts (mindshare apps) | Higher suspicion; easy to abuse for farming |
| `tweet.write` / media write | Post as user | Highest drop-off; “this app can tweet” |
| none (Web Intents only) | Prefill share | Lowest friction for distribution |

**Dasha default (current):** identity-oriented OAuth + **intents for share**. Research supports **keeping write out** unless a future feature *requires* posting for the user and is clearly consented.

Official intent framing: Web Intents work **without authorizing an app**, user must see full composer before post ([X docs](https://docs.x.com/x-for-websites/web-intents/overview)).

---

## 3. Competitive / adjacent patterns

### 3.1 Trading / social terminals (e.g. Bullpen-class)

- Signup with wallet **or X / Google / email**; X as **account identity**, leaderboards, share performance ([Bullpen FAQ/signup patterns](https://docs.bullpen.fi/support/faqs), airdrop guides).
- Value of X: **public persona on a P&L stage**, one-tap share of alpha.

**Dasha non-overlap:** no execution, no copy trade, no PnL truth claims. Overlap: **persona on a board + share artifact**.

### 3.2 Attention markets (Kaito post-Yaps)

- Shift from permissionless post-earn → **selective creator–brand marketplace**.
- Mindshare measurement may remain; **paying for spam posts** does not.

**Dasha non-overlap:** don’t become mindshare infra. Optional later: *observe* culture without paying for posts.

### 3.3 Creator coins / SocialFi (Zora etc.)

- Profile/post as tradeable attention ([Zora coins protocol](https://docs.zora.co/coins)).
- Different chain/product; lesson = **identity + creation monetized as attention**.

**Dasha:** culture production without forcing a second token or creator-fee platform.

### 3.4 Decentralized social (Farcaster / Lens)

- Pitch: portable graph, multi-client identity ([Farcaster primers](https://www.cryptohopper.com/blog/what-is-farcaster-how-this-decentralized-social-protocol-works-12754)).
- 2026 critique: still **hard to scale past crypto-native niche** ([e.g. de-soc scale commentary](https://www.linkedin.com/posts/arammughalyan_the-era-of-decentralized-social-media-is-activity-7421537538521110880-Vhir)).

**Dasha:** distribution remains **X**; on-site Lobby is the controlled room. Don’t fork CT.

### 3.5 Memecoin community mechanics (Galaxy + CT practice)

From prior landscape research + Galaxy “State of Memecoins”:

- X + TG amplify; **KOLs** make/break attention.
- Survivors are **cult / community-backed** more than pure PvP seconds.
- Power law: few tokens capture most value; culture products attach to **narrative half-life**.

**Dasha use of link:** help **cult mode** (named makers, remix credit, seasons) rather than PvP sniping tools.

---

## 4. What linked identity is *good* for (evidence-shaped)

### 4.1 Anti-spam and conversation quality
- Pseudonymous chat without link → nick squatting, raid spam.
- Linked @ is a **costly-to-rotate public identity** (not perfect sybil resistance, but better than free text nicks).
- Lobby already maps to longer messages / priority framing when linked.

### 4.2 Attribution and remix culture
- Meme culture depends on **who made / remixed** the bit (credit wars are real on CT).
- Products that stamp **@handle on artifacts** convert participation into portable status without paying for posts.
- Web Intents + result URLs = distribution that **feels native to X** without API write.

### 4.3 Soft reputation (not follower-count worship)
- Follower count is gameable and celebrity-biased.
- Better signals for culture product:
  - Completed on-site quiz / board enrollment
  - Claimed creative after share
  - Holder proof (wallet) **optional**, separate from X
  - Season participation stamps

### 4.4 Challenge and “beat this” loops
- Permanent result / challenge URLs already fit CT “ratio this score” behavior.
- Linked identity makes challenger **legible** (“@x beat 9/12”) vs anonymous blob.

### 4.5 Capacity and fairness
- When rooms fill, **linked seats** as soft priority is an accepted clubhouse pattern (Discord roles analog without Discord HQ).
- Must stay transparent and non-punitive for skippers (optional connect).

---

## 5. What linked identity is *bad* for (failure modes)

| Anti-pattern | Why it fails | Evidence / analog |
|---|---|---|
| Post-to-earn leaderboards | Policy + AI spam + brand toxicity | Yaps sunset |
| Rank by followers | Pays celebrities; demotivates culture makers | CT KOL inequality |
| Auto-tweet raids | Consent + “official army” optics | Honesty bible |
| Scrape mentions for points | Bots, lookalikes, ToS, noise | Tracker crackdowns |
| Require link to browse | Conversion death; contradicts optional gate | Optional product doctrine |
| Imply endorsement via linked users | Legal/reputation | Association ≠ endorsement |

---

## 6. Capability map: Dasha today vs research opportunity

| Surface | Already uses X link | Research-backed opportunity | Scope need |
|---|---|---|---|
| **Lobby** | @handle, avatar, longer msgs, priority seats | Line → Studio remix with attribution; “makers in room” strip | identity |
| **Simp Board** | Join, quiz, share intents, chip | Season stamps; challenge graph; public makers feed (opt-in) | identity |
| **Studio** | Optional credit on share | Remix lineage `via @`; claim after share; handle watermark | identity + intent |
| **Desk** | Thin today | Share pack prefilled with @ + mint + honesty line | intent (link optional) |
| **Home** | Optional gate, board mount | Makers strip; don’t gate content | identity optional |
| **Growth** | — | Prefer artifact virality over API farming | intents |

---

## 7. Ranked product opportunities (research → design)

Scored for **fit / policy safety / effort / cool factor** (not a commit to build).

### P0 — Double down (already aligned; polish)

1. **Attributed share artifacts**  
   Every quiz card, board row, Studio export can carry `@handle` when linked; share via Web Intent only.  
   *Why:* Credit is the CT currency; no write scope; matches intents docs.

2. **Challenge / beat-this URLs with named challenger**  
   Linked result pages show stable @ + deep link back to Studio/board.  
   *Why:* Native CT competitive humor without InfoFi.

3. **Visible but optional connect**  
   Gate with skip + “Take quiz ↓” (shipped direction); never block browse.  
   *Why:* Research shows force-link kills trust; optional identity still upgrades quality.

### P1 — High cool, still identity-only

4. **Remix lineage (one hop)**  
   Studio: “Remixed from @alice · ticket look.” Stored against X id if both linked.  
   *Why:* Remix culture is the product thesis; Farcaster-style portability lite without new network.

5. **Lobby line → meme**  
   One button: take chat line → Studio seed with speaker @ if linked.  
   *Why:* Closes culture loop inside controlled room; no TG.

6. **Public makers strip (opt-in enrolled)**  
   Home/board: last N claimed memes or quiz finishes with handles.  
   *Why:* Social proof without follower ranking or shill board.

7. **Season passport stamps**  
   Time-boxed culture seasons (line of the week), badge if participated while linked.  
   *Why:* Cult half-life > endless PvP; no price promises.

### P2 — Later / careful design

8. **Selective creator moments** (Kaito Studio analog, tiny)  
   Invite-only “feature this meme” — human/agent curated, not automated yap.  

9. **Wallet + X dual identity**  
   Holder proof already exists; keep X and wallet **independent** so bag ≠ speech.

10. **Mindshare observation only**  
    Optional internal dash of $dasha conversation quality — **not** user-facing farm.

### Explicit no-build (from research)

- Yap clones, reply spam rewards, auto-post, raid bots, follower-weighted ranks, Telegram army lists, “official community” claims.

---

## 8. UX / trust principles (from research + Dasha honesty)

1. **Link is a perk, not a ticket to the site.**  
2. **Minimum scopes:** prefer `users.read` + offline; justify any `tweet.read`; avoid `tweet.write`.  
3. **Say what you store:** handle, id, avatar URL, session — not “we read your likes.”  
4. **Share is always user-final:** Web Intent composer visible (X requirement).  
5. **Credit opt-out:** allow “share without @” even if linked.  
6. **Honesty footer on outbound packs:** association ≠ endorsement; can go to zero; NFA.  
7. **No endorsement cascade:** linked users are participants, not spokespeople.

---

## 9. Metrics that measure the right thing

| Metric | Good signal | Bad signal |
|---|---|---|
| % sessions that link | Interest in identity | Forced by hard gate |
| Linked → enrolled board | Activation | — |
| Shares opened (intent) | Distribution intent | Posts scraped via API |
| Claim rate after share | Creative loop | Claims without share proof |
| Lobby spam rate linked vs anon | Quality lift | — |
| Quiz completes with linked reveal | Funnel health | Points for external tweets |

Avoid optimizing “number of tweets containing $dasha from linked users” via API — that’s the Yaps graveyard.

---

## 10. Suggested build order (if productizing next)

1. **Studio watermark + claim after successful share intent** (identity already there).  
2. **Remix `via @` one hop** in Studio state + share text.  
3. **Lobby → Studio seed** with attribution.  
4. **Makers strip** (opt-in) on board/home.  
5. **Season stamps** once 1–3 are dogfooded.

Each step is identity-only + intents; shippable without new X write permissions.

---

## 11. Source index

| Topic | Sources |
|---|---|
| Web Intents (no app auth for post) | https://docs.x.com/x-for-websites/web-intents/overview |
| Yaps / InfoFi ban | https://www.coindesk.com/business/2026/01/15/kaito-to-sunset-yaps-as-x-cracks-down-on-infofi-apps-token-falls-17 |
| Kaito pivot | https://www.coingecko.com/learn/what-is-kaito-earn-yap-points · https://x.com/Punk9277/status/2011837292907020605 |
| Bullpen X as identity/signup | https://docs.bullpen.fi/support/faqs · airdrop guides referencing X connect |
| Memecoin culture / infra | https://www.galaxy.com/insights/research/memecoins-pump-fun-solana-kols |
| X cashtags discovery | https://www.tradingview.com/news/99Bitcoins:3d2d285ac094b:0-x-money-adds-live-crypto-cashtags-how-this-changes-coin-discovery-for-retail/ |
| Meme marketing surface = X | https://tokenminds.co/blog/meme-coin-marketing |
| Farcaster portable identity | https://www.cryptohopper.com/blog/what-is-farcaster-how-this-decentralized-social-protocol-works-12754 |
| CT identity-as-brand (examples) | https://x.com/wilson_/status/1968630226436366374 · https://x.com/RayhanTreader/status/2086084256665915865 |
| Dasha stack / CT behavior companion | [`DASHA-CRYPTO-COMMUNITY-RESEARCH-2026-08-08.md`](DASHA-CRYPTO-COMMUNITY-RESEARCH-2026-08-08.md) |
| Product honesty | [`DASHA-BIBLE.md`](DASHA-BIBLE.md) |

---

## 12. Research log

| When | What landed |
|---|---|
| 2026-08-08 | Policy wall (Yaps), intents vs write OAuth, competitive patterns |
| 2026-08-08 | Capability map vs Dasha surfaces; ranked P0–P2 opportunities |
| 2026-08-08 | Metrics + trust principles; no-build list |

*Refresh when X OAuth policy or Dasha scopes change; don’t silent-fork a parallel “final strategy” doc.*
