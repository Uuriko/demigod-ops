# Dasha unknown-unknowns research

**Date:** 2026-08-08  
**Status:** Current evidence audit; owns risks, not product decisions  
**Scope:** getdasha.com, product, release system, OSS, community, security, accessibility, crypto/legal, workflow  
**Boundary:** Read-only research. Nothing published, messaged, submitted, traded, or changed externally.

## Executive conclusion

The weakest claim supported by current evidence is: **Dasha is a truthful token-discovery surface plus a browser creative instrument, with an unvalidated recurring-participation hypothesis.** It is not yet evidence of a community, network, open format, or durable product loop.

The largest immediate risk is release authority, not missing features. Local gates pass while production is drifted. The best next product experiment remains one bounded Transmission using a portable editable artifact and guaranteed human acknowledgment—but only after intended Home and Studio artifacts are reliably live.

## Direct observations — 2026-08-08

- `npm run dasha:test:all` passes all current Dasha build and interaction checks.
- `npm run dasha:ship:status` reports `liveStatus: drifted`.
- The active ship run passed local gates, then failed live verification for Home and Studio across `www`, apex, and staging.
- `dasha-live-verify.mjs` reports Home/Studio/Desk 200, sitemap 404, Home and Studio not current, Desk neutral, and no live document language.
- Apex redirects to `https://www.getdasha.com/`.
- Inspected responses expose HSTS, but no CSP, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` headers.
- Home loads Jupiter JavaScript directly from `plugin.jup.ag`; Desk fetches Dexscreener and uses `localStorage` for a local mint/visit stamp.
- `npm audit --omit=dev` reports five shared-workspace dependency findings: two high and three moderate. Production reachability is unproven; build/agent-tool exposure remains relevant.
- The public `dasha-desk` repository includes README, MIT LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CODEOWNERS, and a PR template.
- The documented `npm run dasha:test` command does not exist; the current command is `dasha:test:all`.
- Canonical product docs say the project is official and the operator works directly with Dasha; public copy says “Not made by Dasha” and “Association is not endorsement.” A precise relationship sentence is still unresolved.
- No observed evidence establishes non-operator Transmission participation, editable handoff, acknowledgment, or voluntary return.

## Ten surprises

1. A green local suite does not prove the intended product is live.
2. Release drift is already a realized failure, not a hypothetical risk.
3. The sitemap is absent, not merely incomplete.
4. The most-developed feature, current Studio, is not what production serves.
5. The project has more product vocabulary than demand evidence.
6. The Simp leaderboard creates governance, consent, gaming, and endorsement risk before it creates learning.
7. Discord could add an empty-room signal and scam surface instead of community.
8. Direct third-party Jupiter code is a significant trust dependency.
9. OSS documentation is more mature than the public participation loop.
10. “Official” increases the need for exact authority, holdings, compensation, identity, and endorsement disclosures.

## Weakest-sufficient product assessment

Three interpretations remain live:

1. a memecoin marketing site with a creative acquisition tool;
2. a participatory culture product that happens to have a coin;
3. an open-source creative instrument whose community has not formed.

Current evidence cannot select a permanent identity. The weakest sufficient hypothesis is that Dasha gives visitors truthful coin discovery and one small creative action; a seven-day Transmission can test whether the action becomes social and recurrent.

The cheapest discriminating check is one bounded Transmission. Measure distinct non-operator starts, material edits, exports/submissions, editable-link reuse, acknowledgment, and voluntary return. Do not schedule episode two before observing episode one.

## Market and product landscape

Existing products already cover instant launches, bonding curves, creator rewards, token-gated groups, onchain feeds, tipping, AI token packages, wallets, swaps, charts, scanners, and social-token launches. Entering those lanes would require liquidity, compliance, moderation, security, and distribution that Dasha has not demonstrated.

The existing property worth testing is **portable editability**: a finished-looking artifact can travel with state that another person can change. The value is not image generation alone; it is whether people mutate, pass, and return to cultural objects.

### Additional ambitious-horizon research

The 2026 consumer market strengthens the case for a format rather than a closed platform. Sekai, Gizmo, Whip, Remix and Status AI are all exploring interactive or generated media inside proprietary discovery and identity systems. Open-source projects such as CommonPub, Streamplace and Loops instead emphasize federation, self-hosting or creator control. Dasha should not reproduce either full stack before it has a distinctive object people pass around.

Standards research also narrows what Dasha needs to invent:

- C2PA 2.4 already models signed media provenance, ingredients, actions and repository receipts;
- W3C Web Annotation already models portable associations with resources;
- W3C Social Web protocols already cover decentralized creation, following and interaction;
- ordinary files, URLs and explicit licenses remain the cheapest interoperable transport.

Therefore the ambitious hypothesis is **open culture objects**, not a Dasha-only protocol: immediately renderable, editable, host-independent artifacts with explicit reuse terms and bounded source context. Dasha can be the first living world built from them. C2PA, federation, cryptographic identity and onchain settlement remain optional future adapters, not phase-one requirements.

Recent co-creative storytelling studies provide cautious support for structured human direction over undirected generation. NarrativeLoom's 50-person experiment reported improved novelty and diversity with structured multi-persona assistance, especially for novices; Fabula's participatory work with 42 writers emphasizes exposing and revising narrative structure while preserving local storytelling differences. These results support scaffolding and human selection, not autonomous content production, and do not establish Dasha demand.

The ambitious claim has a strict falsification ladder:

1. no completed edit/export → the object itself fails;
2. no cross-person material remix → portability has no behavioral value;
3. lineage adds confusion or consent burden → keep only immediate local source links;
4. no second renderer → do not call it an open format;
5. no outside reuse → keep it a Dasha-specific instrument.

Do not infer:

- token attention → creative demand;
- traffic → community;
- an X intent → submission operations;
- a first-ranked account → functioning leaderboard;
- a GitHub link → contributor onboarding;
- a share URL → remix behavior;
- association → endorsement of every operator action.

## Participation, points, and community

Small-community research suggests hyperspecific identity and group-level belonging can be valuable without scale. That supports a narrow ritual more than a generic server, but qualitative Reddit research cannot predict Dasha retention.

Gamification evidence is mixed: reviews find short-term engagement benefits, while also reporting novelty decay, negative effects for less competitive participants, and possible declines in intrinsic motivation. Points and rank are interventions, not harmless decoration.

Implications:

- acknowledge a person's first valid contribution;
- optimize for competence, autonomy, and relatedness;
- prefer bounded editorial recognition to universal scoring;
- require consent before public ranking;
- disclose rewards, holdings, and material relationships;
- keep creation wallet-free;
- test excluded/noncompetitive participants and novelty decay.

Discord graduates only after repeated non-operator participation, explicit demand for coordination, named moderators, rules/reporting/appeals, controlled invite ownership, and anti-scam operations.

### Ritual is both the opportunity and the danger

Ritual research suggests that repeated structure, mutual focus, shared mood and recognizable objects can support belonging. It also shows that knowing the ritual can become an in-group signal and increase monitoring of outsiders. Dasha should make the form recognizable without making fluency a membership test.

Design consequences:

- keep the opening action legible to a first-time visitor;
- allow watching, saving and occasional participation without penalty;
- repeat a small grammar, not a mandatory schedule;
- avoid streaks, attendance rewards and public absence signals;
- preserve plural interpretations instead of algorithmically declaring canon;
- close episodes editorially without claiming Dasha herself approved them.

Recent fandom research adds a sharper warning: AI-mediated platforms can turn affection into quantified labor through templated generation, ranks and simulated reciprocity. An automated Dasha persona that praises contributions would risk manufacturing the relationship the product claims to observe. Human acknowledgment should stay recognizably human.

### Collecting without artificial scarcity

Digital-collectible studies show that rarity, visual similarity, identity and trading networks influence market behavior. They do not show that tokenization improves a creative product. Other consumer research questions whether NFTs create felt permanence, while ethnographic work on vinyl emphasizes physical possession and social use.

The cheaper Dasha test is therefore a downloadable or printable artifact people keep, display or pass—not an NFT, supply schedule or rarity table. Collect behavior before monetizing collectibility.

## Identity, authority, and crypto/legal uncertainty

The public project needs one evidenced relationship sentence. “Made by,” “official,” “authorized,” “working with,” “endorsed,” and “inspired by” are distinct claims.

FTC guidance says endorsements must be truthful and material connections disclosed. It treats incentivized likes, tags, and shares as possible endorsements. This bears directly on Simp Points, holder bonuses, and promotional rankings.

The SEC staff's 2025 meme-coin statement is nonbinding, fact-specific, excludes economically different tokens, and does not displace fraud or other law; a commissioner disputed its reasoning. Product mechanics must be judged by economic reality, not labels.

Risk-increasing changes include operator promises to increase value, yield/revenue/treasury rights, financialized rankings, coordinated buying language, undisclosed promotion/holdings, holder rewards tied to managerial work, and claims that a checker makes a token safe. This is a counsel-review area, not a finding that current use is unlawful.

Before expanding identity or incentives, establish account/operator ownership, scope of permission, approved relationship wording, media/likeness rights, takedown and correction paths, and disclosures for holdings or rewards.

## Security and privacy

Strengths: static architecture, no custody, no required wallet for Studio, visible mint/risk language, `noopener noreferrer`, and fragment state not normally sent in HTTP requests.

Gaps:

- third-party Jupiter code executes on Home;
- no observed CSP or related defense-in-depth headers;
- remote media/data dependencies can fail, change, or observe requests;
- shared build tooling has known dependency findings;
- no complete public privacy inventory or retention policy;
- a submission backend would introduce abuse, privacy, moderation, and content risk.

Controls:

1. Inventory runtime and build dependencies.
2. Isolate or load Jupiter only after explicit intent where feasible; retain a plain external fallback.
3. Add feasible CSP, Referrer-Policy, Permissions-Policy, and content-type protections.
4. Update dependencies in isolation and verify—never apply `npm audit fix` blindly.
5. Add secret scanning, dependency review, pinned CI actions, and OpenSSF Scorecard review.
6. Threat-model submissions before implementation.
7. State that official operators never request seed phrases or initiate wallet-support DMs.

OWASP 2025 elevates misconfiguration and software-supply-chain failures; both map directly to current gaps.

## Accessibility, navigation, SEO, and performance

Verified production gaps are sitemap 404, missing live language, and stale Home/Studio contracts. Source contains useful native controls and ARIA, but source inspection does not prove accessibility.

Browser evidence must cover keyboard completion, visible/unobscured focus, 24×24 targets or permitted spacing, contrast, 200% zoom, 320px reflow, reduced motion, screen-reader states, a canvas alternative, modal focus restoration, and blocked/offline/error paths across Chrome, Firefox, Safari, iOS, and Android.

WCAG 2.2's focus-not-obscured, dragging-alternative, and minimum-target requirements are particularly relevant. Restore sitemap, document language, route canonicals, useful 404 behavior, and consistent `www` canonicalization.

There is no real-user ledger for LCP, INP, or CLS. Measure all three by route/device at the 75th percentile when field data exists, plus Jupiter cost/failure, remote fonts/images, JS errors, canvas-export errors, uptime, TLS, DNS, and contract drift. Do not add analytics until event decisions and privacy boundaries are defined.

## Open-source assessment

Present in `dasha-desk`: MIT license, README/run instructions, contribution and conduct policies, security policy, CODEOWNERS, PR template, build separation, tests, and referenced asset attribution.

Missing or unverified:

- public CI status and enforced rulesets/reviews;
- issue templates and governance;
- release provenance/versioning;
- dependency review, secret scanning, Scorecard, pinned actions;
- exact boundary between public Desk and non-public Home/Studio sources;
- contribution licensing for code and creative assets;
- clean-clone verification of every README command;
- working GitHub Pages demo;
- evidence-based contributor acknowledgment.

GitHub community files, CODEOWNERS-required review, rulesets, OpenSSF Scorecard, and the 2026 OSPS Baseline provide appropriate checks. Use them for evidence, not badge theater.

## Workflow contradictions and controls

- Current prose contains stale publication matrices and commands.
- The manifest knows production drifted while dated docs can still look current.
- Root CI is broad Demigod/shared-workspace CI, not isolated Dasha release integrity.
- Multiple agents can edit the same external Webflow surface.

Improve by:

1. making the manifest/live verifier the sole release-status owner;
2. generating dynamic status instead of copying it into prose;
3. adding a single-publisher lease with actor, scope, expiry, and release ID;
4. checking Webflow audit-log actor and page set around publishing;
5. failing preflight on concurrent edits;
6. publishing immutable release artifacts, not a changing shared tree;
7. recording hashes per hostname;
8. gating sitemap, language, canonical, accessibility smoke, and headers;
9. executing or validating commands quoted in current docs;
10. clearly indexing old audits as historical;
11. creating isolated Dasha CI;
12. keeping evidence, product decisions, and live release state separate.

## Ranked risk register

| P | Risk | Evidence | Smallest control | Proof |
|---|---|---|---|---|
| P0 | Concurrent overwrite | Manifest drift | Single-publisher lease + immutable artifact | Second publisher fails; hashes match |
| P0 | Public ≠ source/strategy | Home/Studio stale | Reconcile under explicit publish authority | All hosts pass contract |
| P0 | Ambiguous endorsement | Brief vs public wording | One approved relationship sentence | Same accurate wording everywhere |
| P0 | No demand evidence | No outsider receipts | One manual Transmission | Creator/edit/export/return ledger |
| P1 | Third-party script risk | Jupiter executes on Home | Explicit loading/isolation + CSP | Site works when blocked |
| P1 | Discovery/accessibility gaps | Sitemap/lang missing | Restore and audit WCAG 2.2 | Live + keyboard/AT checks |
| P1 | Incentive deception/gaming | Simp/holder concepts | Defer automated rewards/rank | Consent/disclosure/appeal tests |
| P1 | Tool supply-chain exposure | Five audit findings | Review reachable packages | Clean audit or documented non-reachability |
| P1 | Premature community surface | No recurring group | Gate Discord on observed need | Threshold + moderation readiness |
| P2 | Docs manufacture state | Stale command/matrix | Generated status + doc tests | CI fails stale references |
| P2 | Remote asset failure/tracking | X/Dex hotlinks | Licensed local assets where appropriate | Blocked-host test works |

## Conditional roadmap

### Seven days

Freeze new scope; resolve release truth without publishing absent current authorization; settle the authority question; specify manual submission/acknowledgment; define event and stop criteria; test accessibility/mobile/third-party-blocked states; then run Transmission 001 only when intended Home and Studio are live.

### Thirty days

- No outside creation: change prompt/distribution once; do not build accounts.
- Creation but no editable handoff: treat Studio as export tooling; drop open-format claims.
- Handoff but no return: test acknowledgment/editorial closure, not editor features.
- Return plus coordination requests: prepare a moderated community surface.
- Useful outside merges: publish honor-only contribution recognition.

### Ninety days

Only after repeated evidence: formalize cadence, archive real outputs, test a second independent renderer, establish small governance/moderation, and decide whether the token is contextual, optional signaling, or harmful to trust.

Defer the social network, DAO, marketplace, AI persona, mobile app, multi-chain support, token-gated core loop, automated social scoring, and financial rewards.

## Genuinely unresolved

- Dasha's exact authorization and preferred public wording.
- Control and recovery arrangements for every account.
- Whether outsiders want to create, remix, submit, or return.
- Whether token buyers and creators overlap.
- Jurisdiction-specific legal treatment of actual token/project mechanics.
- Whether ranking motivates or repels this audience.
- Which Webflow actor caused the overwrite.
- Whether public GitHub settings enforce reviews/rulesets.
- DNSSEC status; local DNS tooling was unavailable and no dashboard mutation was authorized.
- Real-user performance/accessibility and actual moderation load.
- Whether the durable product is a creative tool, editorial ritual, or only a strong landing page.

## Sources

Primary standards and official guidance:

- [Webflow MCP 2.0](https://developers.webflow.com/home/changelog/2026/7/21) · [Publish API](https://developers.webflow.com/data/reference/sites/publish/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [new WCAG 2.2 criteria](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [OWASP Top 10: 2025](https://owasp.org/Top10/2025/0x00_2025-Introduction/) · [supply-chain failures](https://owasp.org/Top10/2025/A03_2025-Software_Supply_Chain_Failures/)
- [Google Web Vitals](https://web.dev/articles/vitals) · [canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [GitHub CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) · [community health files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file)
- [OpenSSF Scorecard](https://openssf.org/scorecard/) · [2026 OSPS Baseline guide](https://openssf.org/blog/2026/01/07/your-guide-to-the-openssf-osps-baseline-for-more-secure-open-source-projects/)
- [Cloudflare DNSSEC](https://developers.cloudflare.com/registrar/get-started/enable-dnssec/) · [Solana safety](https://solana.com/learn/staying-safe-on-solana)
- [SEC staff meme-coin statement](https://www.sec.gov/newsroom/speeches-statements/staff-statement-meme-coins) · [Commissioner response](https://www.sec.gov/newsroom/speeches-statements/crenshaw-response-staff-statement-meme-coins-022725) · [SEC crypto materials](https://www.sec.gov/about/divisions-offices/division-corporation-finance/corpfin-crypto-assets)
- [FTC endorsement guidance](https://www.ftc.gov/news-events/topics/truth-advertising/advertisement-endorsements) · [Disclosures 101](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers)

Research used with transfer limitations:

- [Small online communities](https://arxiv.org/abs/2108.04282) — qualitative Reddit interviews, not causal Dasha evidence.
- [Founder motivations and community trajectories](https://arxiv.org/abs/2405.00601) — not crypto-specific.
- [Gamified learning systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC10448467/) · [online engagement review](https://pmc.ncbi.nlm.nih.gov/articles/PMC5376078/) · [cognitive-training meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC7445616/) — context-limited and heterogeneous; no leaderboard mandate.
- [Parasocial relationship ethics](https://academic.oup.com/book/60723/chapter-abstract/527895695) — conceptual analysis of attention, communication, and epistemic asymmetry.
- [SolPhishHunter](https://arxiv.org/abs/2505.04094) — emerging Solana phishing dataset.
- [Pump.fun survival](https://arxiv.org/abs/2607.02823) · [token-success prediction](https://arxiv.org/abs/2602.14860) · [Farcaster incentives](https://arxiv.org/abs/2511.00827) — recent preprints; useful hypotheses, not causal product or legal proof.
- [NarrativeLoom](https://arxiv.org/abs/2603.07155) · [Fabula](https://arxiv.org/abs/2606.14411) — small/participatory co-creative storytelling studies; support structured assistance, not Dasha demand.
- [Secular ritual and bonding](https://pmc.ncbi.nlm.nih.gov/articles/PMC7840012/) · [ritual and group boundaries](https://pmc.ncbi.nlm.nih.gov/articles/PMC7423253/) · [participatory arts rituals](https://pmc.ncbi.nlm.nih.gov/articles/PMC12651656/) — context-specific evidence that repetition can support belonging and exclusion.
- [AI-mediated gamification of fan labor](https://journals.sagepub.com/doi/abs/10.1177/13678779261448882) · [fan-labor co-option](https://academic.oup.com/nyu-press-scholarship-online/book/31055/chapter-abstract/264042614) — qualitative/critical scholarship; supports labor and governance questions, not causal product estimates.
- [Serial versus episodic narratives](https://pmc.ncbi.nlm.nih.gov/articles/PMC12192482/) — 44-child active-game study; reason to test serial continuity, not assume adult Dasha retention.
- [NFT rarity](https://pmc.ncbi.nlm.nih.gov/articles/PMC9381539/) · [visual exploration](https://pmc.ncbi.nlm.nih.gov/articles/PMC11569189/) · [fragile permanence](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5064286) · [vinyl materiality](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3986524) — collecting research; argues for measuring keeping/printing before scarcity or tokenization.
- [C2PA 2.4](https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html) · [W3C Web Annotation](https://www.w3.org/TR/annotation-model/) · [W3C Social Web Protocols](https://www.w3.org/TR/social-web-protocols/) — reuse if requirements arise; do not treat standards availability as product evidence.
- [CommonPub](https://commonpub.io/about) · [Streamplace](https://stream.place/about) · [OPENRNDR](https://openrndr.org/about/) — current open/self-hosted creator infrastructure examples; product claims are self-descriptions.

## Decision boundary

The research supports release integrity and one human creative-loop experiment. It does not support a larger platform yet. The next irreversible commitment must be earned by outsider behavior, not the volume of plans, code, token activity, or agent output.
