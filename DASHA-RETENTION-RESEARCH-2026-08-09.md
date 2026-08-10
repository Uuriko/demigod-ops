# Dasha retention research — what earns a second visit

**Updated:** 2026-08-09  
**Scope:** Fresh crypto/community evidence mapped to the live Home → Quiz → Studio → Lobby → Simp loop. This note does not authorize a new surface.

## Decision

Do not add another crypto primitive. The weakest sufficient product hypothesis is:

> Dasha can earn repeat participation by making cultural identity easy to perform, then giving a small amount of credible human recognition to good artifacts.

This is narrower than claiming that wallets, points, token rewards, a feed, a gallery, or more trading features create retention. Current evidence does not establish those claims.

## Observed evidence

- The live product already supplies identity (Quiz), creation (Studio), conversation (Lobby), optional recognition (Simp Board), and exact-mint trade rails (Desk/Jupiter). The release verified green on 2026-08-08.
- The first trustworthy public cohort began at **2026-08-08T21:27:20-07:00**. Both aggregate funnels were reset together and verified at zero. Earlier totals had no `since` value and included test-era question paths, so they are not demand evidence.
- The first bounded read shortly afterward showed **3 Quiz starts, 2 completions, 0 Quiz shares, and 0 Studio opens**. This proves collection is live but is much too small—and too weakly attributable—to justify a UI or roadmap change.
- The public read after the 2026-08-09 release showed **8 Studio opens** and **10 Quiz starts / 10 completions**. Studio first edits, exports, share intents and confirmed shares, plus Quiz replays and share intents, all remained below the public threshold of five. These are event counts—not people—and the suppressed cells may contain anywhere from zero to four events. The evidence therefore supports watching the Studio open → first-edit boundary, but does not support diagnosing a specific UX defect or changing the editor yet.
- The 2026-08-09 05:20 PDT read showed **13 Studio opens / 8 first edits** and **26 Quiz starts / 20 completions**. Studio exports, share intents and Web Share API resolutions were still below five. Some Studio events are known synthetic regressions, so this does not establish organic conversion; it does establish that the aggregate edit boundary is observable while output completion is not yet measured cleanly.
- The 2026-08-09 08:37 PDT read still showed **13 Studio opens / 8 first edits**, while Quiz had reached **41 starts / 28 completions**. Every Studio output/share cell and Quiz share/replay cell remained below five. During this read, `completionSince` changed between cold starts because the migration timestamp was held only in memory until another Studio event arrived. The Worker now persists that boundary immediately, and its test recreates the Durable Object twice without an intervening event to prove the timestamp stays fixed. Do not compare completion counts across the pre-fix timestamps; use the first stable deployed `completionSince` after the coordinated release.
- The live release audit now treats the public funnel as a trust boundary: it requires a dated baseline, a suppression threshold of at least five, fixed aggregate-only fields, valid count/ratio ranges, and explicit language that the figures are not unique-user conversion or retention. A synthetic wallet/identity field or an unsuppressed sub-threshold count hard-fails the audit.
- CoinGecko's Q1 2025 → Q1 2026 chain cohorts report only **7.9% Solana retention**. This is wallet activity, not Dasha-site retention, but it argues against assuming that chain activity itself creates durable return behavior.
- A 2026 survival analysis of 832,941 Pump.fun launches reports a **0.198% 24-hour graduation rate** in its observation window. Launch abundance is therefore not evidence that another launch/trading feature is useful to Dasha.
- Research on meme-investing communities identifies outsider identity, memetic coordination, distributed learning, and market disruption as recurring community dynamics. Another study argues that meme-coin communities expand through playable personae and imitation.
- A 2025 blockchain-community study found social reward, outlook, and investment level predict identity fusion. Dasha should use the social-reward finding without turning investment size into rank.
- A 12,182-user field experiment found a reputation treatment increased the proportion of contributing users by roughly 15%; its model also found peer recognition materially valuable. This supports bounded credit, not automatic point inflation.
- That experiment's contribution lift appeared quickly but had limited long-run persistence. Recognition is therefore a bounded experiment for Dasha, not a retention mechanism to assume in advance.
- A 2026 Bitcoin-forum study found that doubling a posting fee reduced post quantity 16.8% while raising measured quality 16.4%. A separate 2026 quasi-experiment found monetary UGC rewards increased subsequent activity. Together they show that financial friction and rewards change who contributes and how—not that either produces the culture Dasha wants. Do not add posting fees, token tips, or tournaments as a proxy for community quality.
- Online-community self-governance research found participation can reduce contribution quantity while improving quality. This supports editorial selection only after submissions exist, rather than public voting or a high-volume feed.
- A 574,829-wallet Farcaster study found token rewards often increased content creation while leaving quality unchanged or worse, with highly concentrated reward distributions. This strengthens the decision not to award Dasha points for likes, reposts, purchases, or algorithmic engagement.
- A 2026 mixed-method community study found social identity, norms, and self-efficacy were stronger predictors of active participation than the tested governance structure. Dasha should make the existing creation path feel achievable and socially legible before adding governance.
- X's current developer policy forbids platform manipulation, and its authenticity rules explicitly prohibit coordinating exchanges of likes, replies, reposts, views, or follows. Simp recognition must remain editorial credit for original work—not an engagement exchange.
- CNIL's 2025 audience-measurement guidance favors statistics used only by the publisher, anonymous outputs, and no cross-site identifier or data matching. The ICO separately warns that analytics cookies require consent in its jurisdiction even when used only for audience measurement. Dasha's aggregate counters use no analytics cookie, persistent identifier, cross-site join, event log, or analytics vendor; adding those merely to compute “unique conversion” would materially change the privacy contract.
- Solana's official cluster documentation states that public RPC endpoints are rate-limited, may block high-traffic applications without notice, and are not intended for production. Its infrastructure guide separately recommends reducing repeated RPC calls, caching where appropriate, and using private RPC for public-facing applications. Dasha's bounded server-side holder check, replay protection, and two-endpoint failover are appropriate fallback controls; the live `holder-rpc-public` warning remains honest until a dedicated endpoint exists. This is an availability boundary, not evidence for adding wallet-first onboarding or token-weighted rank.

## Live hypotheses and cheapest checks

| Hypothesis | Additional commitment | Cheapest discriminating check | Decision now |
|---|---|---|---|
| Better first-run handoff is enough | Quiz identity can cause creation | Observe Quiz-source Studio opens and downstream edits/exports | **Measure** |
| Novelty can improve repeat creation | A rotating prompt changes behavior | After a usable baseline, test one prompt inside Studio; no new page/control | **Later experiment** |
| Recognition causes another contribution | Credited feature matters to creators | After five genuine submissions, manually feature one artifact and observe follow-on work | **Later experiment** |
| Wallet/token mechanics create loyalty | Financial stake improves product retention | Would require identity-linked financial data and adds incentive distortion | **Reject without new evidence** |
| A public gallery creates community | Moderation/provenance cost is justified | Needs enough genuine artifacts and moderation capacity first | **Park** |

## Operating sequence

1. Preserve the dated aggregate baseline; do not reset during ordinary audits.
2. Read the funnel only after non-operator traffic exists. Treat `share_intent` as intent and a Web Share API resolution only as a browser handoff signal—not evidence that a post was published.
   Use `LOBBY_MOD_SECRET=… npm run dasha:studio:metrics:summary`; use raw `metrics` only for question-level diagnosis. A prepared public summary suppresses every cell below five and omits identities, content and source slices; after deployment it is readable with `npm run dasha:studio:metrics:public`.
3. Diagnose the largest observed transition loss before changing UI. Do not infer retention from opens, price, holders, impressions, or chat membership.
4. If five genuine credited submissions exist, manually feature exactly one artifact with creator handle and an open-in-Studio link. No nominations, voting, rewards, gallery, or new scoring axis.
5. Only after a stable Studio baseline, test one rotating prompt in the existing Studio. Keep it only if first-edit → export/share completion improves.

## Product implications

- **Keep:** Quiz identities, tailored Studio seeds, editable share URLs, X-authorized sharing, clean Lobby, editorial Simp recognition, exact mint, and Jupiter handoff.
- **Improve from evidence:** the transition with the largest measured loss, then one manual recognition experiment.
- **Do not build now:** creator coins, buy points, referral rewards, token-weighted rank, peer voting, engagement scraping, a feed, a Remix Wall, embedded trading, Farcaster identity, PWA/native packaging, or AI generation.
- **Primary metric:** repeat cultural participation cannot yet be measured directly because events deliberately contain no persistent user identifier. Current aggregate funnels measure progression, not unique users or retention. Do not relabel them.
- **Prepared measurement improvement:** count one `completion` per page session when either a file export succeeds or the Web Share API resolves. It records only `event` and a bounded source category—no identity, content, wallet, cookie or persistent identifier—and public counts remain suppressed below five. The browser test now proves `share_intent → share_success → completion` exactly once for a successful native-share path and rejects extra payload fields. `completionSince` makes the migration boundary explicit because historical exports and shares cannot be losslessly joined. Use edit → completion to choose the next Studio fix, but never call it unique-user conversion, a published post, or retention: the Web Share specification resolves after handoff to the target or operating system, not after downstream publication.

### Route pruning decision

Retire `/rally`. It packages Quiz, Studio, Lobby and Buy into a second explanatory hub without a
distinct user job or attributable funnel data. Its live footer also reintroduced disclaimer copy
already removed elsewhere. Recent community research supports identity, achievable participation
and authentic social interaction; it does not establish that duplicating entry funnels creates
retention. Keep `/how-to-buy` because it has a narrower newcomer job. Remove Rally from navigation
and the sitemap, stop shipping its HTML, and preserve old links with one 308 redirect to Home.

## Sources

- [CoinGecko — Blockchain user retention rate analysis, Q1 2026](https://www.coingecko.com/research/publications/blockchain-user-rention-rate-analysis-2026-q1)
- [Pump.fun Graduation Regime Windows: survival analysis of 832,941 launches](https://arxiv.org/abs/2607.02823)
- [Meme Investing as an Unconventional Pathway to Financial Innovation](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5291277)
- [Brichta — Play, proliferation, and personae in meme coin speculation](https://firstmonday.org/ojs/index.php/fm/article/view/13307)
- [Oxford Research Archive — What keeps them invested? Social identity and group formation in blockchain](https://ora.ox.ac.uk/objects/uuid%3Aa9c0cc68-3d6c-48e4-b0de-9edd5ae4d229)
- [Jiang — Encouraging Online Content Contributions with Peer Recognition and Platform Rewards](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5346349)
- [Kung & Kousha — Micropayments and user behavior on digital platforms](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6556022)
- [Pethig, Hui & Lanz — Unexpected Monetary Incentives and User-Generated Content](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6429679)
- [Journal of Strategic Information Systems — participation in online-community self-governance](https://www.sciencedirect.com/science/article/pii/S0963868725000046)
- [Beyond Single-Tokenomics — Farcaster incentives and participation](https://arxiv.org/abs/2511.00827)
- [Collective Action in Digital Communities](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5713979)
- [X Developer Policy](https://docs.x.com/developer-terms/policy)
- [X authenticity rules](https://help.x.com/en/rules-and-policies/authenticity)
- [CNIL — audience-measurement tools and consent-exemption conditions, 2025](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience)
- [ICO — cookies and similar technologies](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/)
- [Solana — Clusters and public RPC endpoints](https://solana.com/docs/references/clusters)
- [Solana — RPC infrastructure](https://solana.com/rpc)
- [W3C — Web Share API](https://www.w3.org/TR/web-share/)
- [MDN — `Navigator.share()` resolution semantics](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)
- [Google Search — permanent server-side redirects](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
- [Paradoxes of Organising in Crypto Communities — user-centred study](https://sciety.org/articles/activity/10.31235/osf.io/qf2mr_v4)
- [Meme Money, Real People — survey of memecoin participants](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6021706)

## Residual uncertainty

The external studies concern chains, launchpads, investment communities, Q&A, and other content platforms—not Dasha visitors. They justify the order of experiments, not predicted effect sizes. Dasha's clean post-release behavior is the deciding evidence.
