# Dasha product roadmap

Updated: 2026-08-08

## North star

Learn whether one recurring, witnessed creative ritual can turn attention into voluntary return—while keeping `$dasha` adjacent, optional and honestly disclosed.

## Permanent exclusions

The Thesis Card and every receipt/forecasting descendant are scrapped. Do not test, deploy, integrate or rename them. Archived code is evidence of abandoned work, not backlog.

## Current evidence

- The live homepage already offers the verified mint, Jupiter, chart, source links, X discovery and `/dasha` desk.
- The official Jupiter modal begins the buy flow without leaving the site and preserves a direct fallback.
- Meme Studio is live and creates/exports square posts, vertical stories and wide banners. Remix URLs preserve the exact editable look, format and line.
- The live homepage includes an opt-in Simp Board with PerryALPHA's disclosed editorial founding spot. X-linked members can separately join, claim reviewed contribution evidence, earn fixed creative/community/OSS points and badges, save a personal score card, view frozen season snapshots and optionally prove a zero-point holder badge.
- Current memecoin research consistently describes narrative, social diffusion and participatory culture as primary behavior, alongside severe volatility and concentration risk.
- Zora makes creation and trading one loop; Guild combines community identity and campaigns; quest products reward participation. Dasha should learn from the loop, not copy their infrastructure.
- Grok's independent 30-track review converged with the academic evidence: first-contribution acknowledgement, bounded prompts and remix continuity are better-supported next tests than ranks, accounts, token gates or another feature suite. Raw receipt: [`DASHA-GROK-DEEP-RESEARCH-2026-08-08.md`](DASHA-GROK-DEEP-RESEARCH-2026-08-08.md).

## Simp Board boundary

The live Board combines one editorial row with measured opt-in rows. PerryALPHA's founding #1 remains explicitly non-measured. OAuth or Lobby use alone never enrolls anyone; join and leave are explicit, and leave removes the public profile and its claims.

Linking earns a fixed 10-point eligibility credit; reviewed creative work is 25 points each capped at 100 per rolling 28 days; reviewed community work is 10 each capped at 40; and OSS points accept only `dasha-simp-oss/v0` tiers capped at 300. Followers, verification, likes, reposts, replies, chat volume, referrals, purchases, balances, bag size and payments score zero. Holder proof signs a short-lived message, checks the associated mint at finalized commitment, stores only the check time and a 28-day badge expiry, publishes no wallet or balance, sends no transaction and scores zero. The date proves a positive balance at that check, not continuous holding. Season snapshots are frozen by ID and retained up to 24; they are operator-held views, not immutable records or promises of rewards.

Live verification on 2026-08-08 established homepage/client parity, public seasons and claims routes, authenticated review rejection, anonymous holder rejection and hostile-origin rejection. Mutable Worker identities belong in deployment receipts and `dasha-audit-live.mjs` output, not this roadmap. Real participation and demand remain unproven.

Prepared OSS lane: `dasha-simp-oss/v0` scores only merged, reviewed pull requests to allowlisted public Dasha repos. Exactly one impact label maps to 5/15/40/100/200 points, capped at 300 points, eight merges per 28-day season and three merges per rolling seven days. Operators and bots score zero; direct commits are not backfilled. `dasha-simp-oss-scorer.mjs` recomputes the lane from public GitHub evidence, and its current authoritative result is empty because `Uuriko/dasha-desk` has no merged PRs. Activate only after the impact labels, season timestamps and first non-operator reviewed PR exist.

## Phase 0 — coherent conversion path

Goal: let a qualified visitor verify and begin buying with less context switching.

Build:

- official Jupiter Plugin modal with `$dasha` fixed as output;
- direct `jup.ag` fallback on every buy surface, retained when the Jupiter plugin is absent **or loads but fails during initialization**;
- adjacent mint and risk disclosure;
- event markers for buy-modal open and direct-Jupiter fallback when Webflow analytics supports them.

Gate:

- modal loads on desktop and mobile without page errors;
- wallet and swap execution remain entirely inside Jupiter;
- direct fallback works when the plugin is blocked;
- no material Core Web Vitals regression from loading the plugin before intent.

Falsification: after enough traffic for a useful comparison, plugin opens do not improve qualified Jupiter handoff or visitors abandon more often than the outbound-only baseline.

## Phase 1 — Dasha Meme Studio instrument

Goal: provide the creation and editable-handoff instrument for the Transmission experiment.

Status: prepared checkpoint. The live Studio v3 asset already has five procedural looks, individual post/story/banner output, explicit three-size preparation links, fragment remix URLs and one-hop lineage. It differs from the generated source only in the latest navigation/accessibility cleanup: the prepared top bar restores the verified mint and Buy paths, gives controls 44px targets and hides the lower-priority X link on narrow screens. PNG export, combined image+remix sharing, inbound-remix state and matched image-only sharing remain intact. Parent state is bounded to one generation and makes no identity, authorship or endorsement claim. Old query links remain readable and immediately normalize to fragment state. Publication and demand remain unproven. Webflow Analyze reports are unavailable because this site lacks the Analyze entitlement; absence of reports is not evidence of zero use.

Prototype:

- five original procedural layouts with no third-party image dependency;
- editable one-line caption and live preview;
- PNG export first; GIF/video only after PNG demand;
- optional X share intent and optional verified-mint caption;
- portable remix URLs carrying the editable look, format and line without an account or upload;
- small removable `getdasha.com` attribution, never a fake endorsement mark.

Gate:

- a first-time mobile visitor exports within 60 seconds;
- at least 20% of studio starters export;
- at least 10% of exporters voluntarily open X share intent;
- at least five distinct people create without operator coaching.

Failure action: improve the asset pack and templates once. If sharing remains absent, stop building editor features and test Lore Vault.

## Phase 1.5 — Transmission 001

Goal: determine whether a recurring character situation creates more participation and return interest than a standalone editor.

Run one bounded experiment titled **make me an alibi**:

- one concise instruction: `make me an alibi.`;
- one original, deliberately incomplete Studio starter carrying `transmission-001`;
- one task designed to take minutes;
- the existing PNG-plus-editable-link share path and one manually reviewed submission path;
- acknowledgement for every distinct person's first valid submission by the end of the next calendar day;
- a seven-day contribution window;
- one small, explicitly curated closing record only if real contributions exist;
- a second Transmission only if participation pulls it into existence.

Gate:

- at least five distinct non-operator submissions;
- at least three materially changed artifacts;
- at least one repeat, remix or explicit request for the next prompt;
- every valid first submission receives acknowledgement;
- at least one valid submission preserves an editable link; treat a cross-person second-generation remix as stronger evidence, not a required first-test threshold;
- source, permission and non-endorsement boundaries remain intact.

Measure the path from view → material edit → export → submission → acknowledgement → return/remix. Keep operator examples separate. Token price, market cap, trade volume, follower count and raw reactions do not count toward the gate.

Adapt once if credible participants consistently fail at the same shared step. Stop if fewer than two credible non-operator artifacts appear after real distribution, or if people consistently view/save without editing. Do not add points, token rewards, accounts or automated ingestion to rescue a failed creative loop.

Research and full boundary: [`DASHA-PARTICIPATORY-CULTURE-RESEARCH-2026-08-08.md`](DASHA-PARTICIPATORY-CULTURE-RESEARCH-2026-08-08.md). Academic map: [`DASHA-ACADEMIC-EVIDENCE.md`](DASHA-ACADEMIC-EVIDENCE.md).

## Phase 2 — choose one expansion

Only one branch proceeds based on observed behavior:

### A. Remix Relay

Trigger: at least ten non-operator chains reach a second remix generation. Add the smallest portable artifact format and optional parent lineage. Do not add accounts, a token or social graph just to label this a network.

Immediate experiment: [`dasha-relay-lab.html`](dasha-relay-lab.html) gives five matched image-only and editable-fragment starters using the existing Studio, then locally compares parent and returned Studio links for changes to look, format or line. A valid comparison renders a machine-readable `dasha-relay-observation/v0` record containing only the experiment arm, material-change result, changed fields and the two supplied URLs; it is neither submitted nor stored. Its separately implemented parser also validates and semantically reconstructs the bounded Studio recipe without importing Studio code; this is a dual-implementation grammar smoke test, not pixel-renderer conformance, cultural portability or demand evidence. Over seven days, count materially changed second-generation remixes—not clicks, parser results, compliments or operator examples. Kill further editor work if fewer than two of at least ten real handoffs produce a non-operator second-generation edit, or if recipients consistently keep the PNG and discard editability. Do not publish the Wall, gallery or lineage layer to rescue a failed relay.

### B. Moment Capsules

Trigger: recurring group moments produce more participation than solitary creation. Open a bounded contribution window and export the result as a static collage or zine; no attendance token or permanent identity.

Prepared experiment: **Culture Capsule** ([`dasha-remix-pack.html`](dasha-remix-pack.html)) accepts a bounded moment title, one validated public context URL and 2–9 existing Studio remix links with optional contributor labels, then exports one local 1080×1080 group zine. Native share keeps that PNG and its editable Capsule link together; the X fallback saves the PNG and opens a post containing the same link. The link carries the title, context, every entry, format and label in the URL fragment, so another person can reopen, add, replace or remove remixes without sending state in the HTTP request. Each rendered slot exposes its exact Studio source and a remove control; the PNG is an export, not the editable source. Context and contributor labels are maker-supplied and explicitly unverified. It has no backend or public collection surface. Publish only as an experiment; kill it after three distributed capsules if no non-operator contributes or reopens and changes one.

Trust boundary: contributor names are unverified labels entered by the wall maker. They are not proof of authorship, consent, licensing or permission. Do not add onchain attribution or ownership claims without a real approval workflow.

### C. Portable Culture Kits

Trigger: an outside community publishes with a Dasha-derived kit and reuses it without agent help. Extract only the proven renderer and format boundary; do not build a marketplace or SDK first.

### D. Live Remix Rooms

Trigger: scheduled prompts draw repeat attendance. Run the first room with the existing Studio and manual collation; add real-time state only after repeated sessions justify it.

### E. Transaction Preflight pivot

Trigger: the cultural loop fails and active Solana users repeatedly bring real unsigned requests they can obtain without assistance. Treat this as a product pivot, not an adjacent feature, because its trust/security identity conflicts with the current cultural surface.

### F. Generic Living Objects — rejected

Rezona, Sekai, Variant and Pops already offer interactive/playable content with creation, remixing and sharing. Do not build tap-reveal toys, AI games, levels, a runtime marketplace or an app store under a new name. Reconsider only if Dasha discovers a materially different interaction job that those products do not serve.

### G. Agent products — deferred or rejected

The existing Studio fragment is already a deterministic, free machine interface. Defer a static agent skill until human Remix Relay works or an external agent consumer asks for a stable grammar. Reject autonomous Dasha posting bots: they are crowded, make engagement evidence less trustworthy, and create endorsement/moderation risk. Reject a paid x402 Culture Compiler while the same output can be constructed locally for free; reconsider only when a proven server-side capability and independent demand both exist.

### H. In-feed Dasha — distribution option, not a pivot

[Farcaster Mini Apps](https://miniapps.farcaster.xyz/) provide feed discovery, signed-in social context, notifications and wallet rails for ordinary web apps. A later Dasha Mini App could open an exact remix, edit it and pass the result on without leaving the feed. Do not build the wrapper before Relay proves that people pass editable state: the SDK can improve distribution, but it cannot create the underlying behavior. Trigger: repeated non-operator chains plus identifiable Farcaster demand. First version reuses the existing Studio and adds only the required manifest/SDK boundary—no feed, token gate or separate editor.

### I. Open Creative Briefs — earned market branch

Trigger: Relay proves editable artifacts survive real handoffs and one community brings a real creative request, a legitimate starter and a budget. Run the first cycle manually: brief, reuse terms, starter object, editable fork submissions and external payment. Productize only if at least three forks are usable, one is adopted without re-briefing, rights stay clear and the buyer requests a second cycle without operator coaching. Otherwise drop the branch. Do not build escrow, voting, profiles, reputation, a marketplace or `$dasha` payment rails.

### J. Lore Vault — bounded fallback, not CultureGraph

Trigger: Studio/Relay sharing fails and real users repeatedly ask for sourced contract, origin or disputed-claim context. Use the existing Dasha evidence ledger plus two unrelated tokens to test three static pages manually under the time and return-use gates in [`DASHA-PRODUCT-OPTIONS-2026-08-07.md`](DASHA-PRODUCT-OPTIONS-2026-08-07.md). Do not build a multi-token graph, scraper, crowdsourced wiki, sentiment feed, safety score or price layer. If the static test fails, archive the direction.

## Ambitious platform horizon

If real cross-person remix chains recur, Dasha can become the first living world built from **open culture objects**: portable editable artifacts with explicit reuse terms and bounded source context. The ambition is an open media format and renderer, not another captive feed.

Graduation order:

1. one exported object;
2. one cross-person material remix;
3. one useful, consented lineage;
4. one independent renderer passing shared fixtures;
5. one outside community reusing the format without operator help.

Only then consider discovery, federation, profiles, collaborative canvases, commissioning or provenance standards such as C2PA. `$dasha` may remain the cultural sponsor and discovery asset; utility, gating and financial rewards are not assumed and require separate legal, technical and demand evidence.

## Growth and safety metrics

Primary:

- verified buy-flow starts per qualified landing visitor;
- Meme Studio start → export → voluntary share-intent conversion;
- returning creators and distinct remixers;
- inbound visits carrying a studio/remix attribution.

Guardrails:

- zero invented association or endorsement claims;
- zero unofficial Telegram/Discord links;
- zero wallet custody or custom swap execution;
- prominent loss-risk disclosure;
- no rewards for deceptive promotion or coordinated spam.

Raw price movement is not proof that the website or product caused demand.
