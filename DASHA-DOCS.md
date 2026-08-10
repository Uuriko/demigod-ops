# Dasha documentation map

Start here for all Dasha work. Demigod is out of scope until the user explicitly reopens it.

**Agent start-here (Grok + Claude + Codex, 2026-08-08):** Current Dasha is Home + Studio + Desk + on-site **Lobby** and opt-in **Simp Board**. Lobby is public chat; Discord is not HQ. Thesis Card, conviction receipts, Pair, forecasting/rounds, casino positioning and Catbox publication are historical or scrapped—do not test, deploy or revive them. Ship with `dasha-ship.mjs` (mandatory Webflow readback). Gates: `npm run dasha:meta` · `dasha:audit:live:fast`. Full multi-agent write-up: [`docs/exchange/DASHA-MULTIAGENT-DOCS-CONSENSUS-2026-08-08.md`](docs/exchange/DASHA-MULTIAGENT-DOCS-CONSENSUS-2026-08-08.md).

**Shared context (automatic spine, no Orca):** Always open [`DASHA-LIVE-CONTEXT.md`](DASHA-LIVE-CONTEXT.md) first. Refresh after work: `npm run dasha:context:refresh -- --agent=you --note="…"`. Notify Claude+Codex: `npm run dasha:peer-ping -- --note="…"`. Inbox: [`docs/exchange/DASHA-PEER-INBOX.md`](docs/exchange/DASHA-PEER-INBOX.md).

| Document | Purpose | Status |
|---|---|---|
| [`DASHA-META.md`](DASHA-META.md) | Meta layer: SEO, ship, legacy, gates (`npm run dasha:meta`) | Current |
| [`DASHA-WORKFLOW.md`](DASHA-WORKFLOW.md) | Sources of truth, work loop, status vocabulary and publication matrix | Current; operational entry after this map |
| [`DASHA-BIBLE.md`](DASHA-BIBLE.md) | Culture, design voice, image library, X sources, agent checklist | Current bible |
| [`DASHA-SIMPLIFY.md`](DASHA-SIMPLIFY.md) | Keep/freeze routes and repo kill-list; evidence-gated feature order | Current |
| [`DASHA-OPEN-SOURCE.md`](DASHA-OPEN-SOURCE.md) | How to open-source desk/studio properly; scrap thesis forever | Current |
| [`DASHA-TASKS-PRIORITIZED.md`](DASHA-TASKS-PRIORITIZED.md) | Research-backed re-prioritization of the exhaustive task list | Current |
| [`DASHA-OSS-OPERATOR-PLAYBOOK.md`](DASHA-OSS-OPERATOR-PLAYBOOK.md) | Shaw/lalalune-informed OSS ops checklist + agent self-prompt + GitHub how-to | Current |
| [`DASHA-SHIP-FAST.md`](DASHA-SHIP-FAST.md) · [`dasha-ship.mjs`](dasha-ship.mjs) | One-command prep/gate/push/publish; CDP optional | Current ship path |
| [`DASHA-DOC-OF-DOCS-2026-08-08.md`](DASHA-DOC-OF-DOCS-2026-08-08.md) | Role taxonomy for all Dasha docs (current/experiment/history/scrap) | Current map |
| [`DASHA-FULL-REVIEW-PROMPT-2026-08-08.md`](DASHA-FULL-REVIEW-PROMPT-2026-08-08.md) | Reusable multi-agent full-review prompt | Current |
| [`DASHA-CHESS-DEEP-BUILD-PROMPT-2026-08-10.md`](DASHA-CHESS-DEEP-BUILD-PROMPT-2026-08-10.md) | Exhaustive research-led prompt for Chess challenges, accessibility, trust, testing and publication | Current execution prompt |
| [`DASHA-MULTIAGENT-DEBATE-2026-08-08.md`](DASHA-MULTIAGENT-DEBATE-2026-08-08.md) | Claude × Codex × Grok debate on whole project | Current review |
| [`DASHA-FULL-AUDIT-2026-08-08.md`](DASHA-FULL-AUDIT-2026-08-08.md) | Whole-project audit (product, trust, live lag, repo) | Current review |
| [`DASHA-CODE-DESIGN-REVIEW-2026-08-08.md`](DASHA-CODE-DESIGN-REVIEW-2026-08-08.md) | Code + design review of all surfaces | Current review |
| [`DASHA-WORKFLOW-ROADMAP-IMPROVE-2026-08-08.md`](DASHA-WORKFLOW-ROADMAP-IMPROVE-2026-08-08.md) | Workflow and roadmap improvement proposals | Current review |
| [`DASHA-DOMAIN-WEBFLOW-LAUNCH.md`](DASHA-DOMAIN-WEBFLOW-LAUNCH.md) | Current domain IDs, route sources, metadata and live publication gate | Current deployment runbook |
| [`dasha-sitemap.xml`](dasha-sitemap.xml) | Bounded custom sitemap for Home, Studio and Desk | Lobby-hosted copy live; Webflow copy still 404 |
| [`dasha-how-to-buy.html`](dasha-how-to-buy.html) | Concise wallet, mint, and route guide | Live Worker route; linked from Home footer |
| [`dasha-jupiter-metadata.json`](dasha-jupiter-metadata.json) | Minimal reviewed-update target: exact mint, getdasha.com and canonical Dasha X profile | Prepared only; external submission gated |
| [`DASHA-CRYPTO-COMMUNITY-RESEARCH-2026-08-08.md`](DASHA-CRYPTO-COMMUNITY-RESEARCH-2026-08-08.md) | Deep research: crypto markets, Solana/memecoin tooling stack, CT/community behavior, Dasha surface implications + sources | **Current** (2026-08-08) |
| [`DASHA-CRYPTO-PRODUCT-DELTA-2026-08-08.md`](DASHA-CRYPTO-PRODUCT-DELTA-2026-08-08.md) | Fresh product delta: creator coins, Solana distribution, community research, ranked Dasha tasks and explicit non-tasks | **Current decision** (2026-08-08) |
| [`DASHA-CRYPTO-RESEARCH-DELTA-2026-08-09.md`](DASHA-CRYPTO-RESEARCH-DELTA-2026-08-09.md) | August primary-source + preprint refresh; live funnel evidence, weakest sufficient implications, and exact build/defer decisions | **Current decision** (2026-08-09) |
| [`DASHA-CRYPTO-CULTURE-DELTA-2026-08-09.md`](DASHA-CRYPTO-CULTURE-DELTA-2026-08-09.md) | Creator SocialFi, Seeker distribution, monetary incentives, and Dasha's nonfinancial culture-layer boundary | **Current decision** (2026-08-09) |
| [`DASHA-RETENTION-RESEARCH-2026-08-09.md`](DASHA-RETENTION-RESEARCH-2026-08-09.md) | Fresh chain, memecoin, identity and recognition evidence; clean public baseline and next experiment gates | **Current decision** (2026-08-09) |
| [`DASHA-DISCOVERY-INTEGRITY-2026-08-09.md`](DASHA-DISCOVERY-INTEGRITY-2026-08-09.md) | Exact-mint source hierarchy, wallet/search inconsistencies, and minimal Jupiter correction path | **Current decision** (2026-08-09) |
| [`DASHA-MARKET-QUALITY-2026-08-09.md`](DASHA-MARKET-QUALITY-2026-08-09.md) | Liquidity, token-account concentration and manipulation-signal limits; internal receipt versus public UI decision | **Current decision** (2026-08-09) |
| [`DASHA-DNS-TRUST-2026-08-09.md`](DASHA-DNS-TRUST-2026-08-09.md) | DNSSEC state model, current TLS/redirect evidence, and safe activation/rollback boundary | **Current trust audit** (2026-08-09) |
| [`DASHA-SUPPLY-CHAIN-TRUST-2026-08-09.md`](DASHA-SUPPLY-CHAIN-TRUST-2026-08-09.md) | Runtime dependency inventory, remote GitHub security posture, immutable Action pins and residual settings | **Current trust audit** (2026-08-09) |
| [`DASHA-IDENTITY-WALLET-TRUST-2026-08-09.md`](DASHA-IDENTITY-WALLET-TRUST-2026-08-09.md) | X OAuth, session, SIWS-shaped holder proof, deletion, residual risks, and upgrade triggers | **Current trust audit** (2026-08-09) |
| [`DASHA-CRYPTO-FRONTEND-THREAT-MODEL-2026-08-09.md`](DASHA-CRYPTO-FRONTEND-THREAT-MODEL-2026-08-09.md) | Crypto link substitution, wallet-drainer, signing, OAuth, executable-asset, and public-evidence threat model | **Current trust audit** (2026-08-09) |
| [`DASHA-X-IDENTITY-RESEARCH-2026-08-08.md`](DASHA-X-IDENTITY-RESEARCH-2026-08-08.md) | Deep research: X-linked identity — InfoFi/Yaps wall, Web Intents, credit/remix opportunities for Lobby/Studio/Simp | **Current** (2026-08-08) |
| [`DASHA-QUIZ-IMPROVE-RESEARCH-2026-08-08.md`](DASHA-QUIZ-IMPROVE-RESEARCH-2026-08-08.md) | Research: how to improve simp quiz (length, result UX, CT share, dual path) | **Current** (2026-08-08) |
| [`DASHA-FULL-BUGTEST-PROMPT-2026-08-08.md`](DASHA-FULL-BUGTEST-PROMPT-2026-08-08.md) | Self-prompt for full audit + bug-test phases | Current |
| [`DASHA-BUGTEST-AUDIT-2026-08-08.md`](DASHA-BUGTEST-AUDIT-2026-08-08.md) | Full audit results (unit + live + browser) | **Current** (2026-08-08) |
| [`DASHA-NEXT-WORK-RESEARCH-2026-08-08.md`](DASHA-NEXT-WORK-RESEARCH-2026-08-08.md) | Online research: prioritize quiz quick path vs Studio re-ship | **Current** (2026-08-08) |
| [`DASHA-CRYPTO-LANDSCAPE.md`](DASHA-CRYPTO-LANDSCAPE.md) | Crypto stack map; receipts-era openings superseded — points to 2026-08-08 research | Active map; product openings historical |
| [`DASHA-RESEARCH-CRYPTO-PSYCHOLOGY-2026-08-06.md`](DASHA-RESEARCH-CRYPTO-PSYCHOLOGY-2026-08-06.md) | Psychology, FOMO/herding, accountability literature | Candidate evidence; 2026-08-08 delta annotated |
| [`dasha-remix-pack.html`](dasha-remix-pack.html) | Culture Capsule: titled, source-aware, editable group-zine prototype | Prepared experiment; not live |
| [`dasha-relay-lab.html`](dasha-relay-lab.html) / [`dasha-relay-lab.test.mjs`](dasha-relay-lab.test.mjs) | Matched relay arms, local observation record, safe comparison, semantic reconstruction and browser gate | Verified experiment; not public |
| [`DASHA-PIVOT-LANDSCAPE-2026-08-06.md`](DASHA-PIVOT-LANDSCAPE-2026-08-06.md) | Pre-scrap market scan; product recommendations include retired concepts | Historical research only |
| [`DASHA-PIVOT-DECISION-2026-08-06.md`](DASHA-PIVOT-DECISION-2026-08-06.md) | Superseded forecasting-era pivot decision | Historical snapshot |
| [`DASHA-PRODUCT-STRATEGY.md`](DASHA-PRODUCT-STRATEGY.md) | Positioning, personas, hypotheses, trust contract and business model | Current |
| [`DASHA-ROADMAP.md`](DASHA-ROADMAP.md) | Exact phase gates, metrics, kill criteria and next build order | Current |
| [`DASHA-DISCORD-BLUEPRINT.md`](DASHA-DISCORD-BLUEPRINT.md) | Proposed server structure, roles, safety controls and launch content | Blueprint only; not HQ |
| [`DASHA-PRODUCT-BRIEF.md`](DASHA-PRODUCT-BRIEF.md) | Plain-language product definition (Home/Studio/Desk/Lobby/Simp) | Current (rewrote 2026-08-08) |
| [`docs/exchange/DASHA-GROK-SESSION-BRIEF-2026-08-08.md`](docs/exchange/DASHA-GROK-SESSION-BRIEF-2026-08-08.md) | Grok session + Claude/Codex doc consensus | Current exchange |
| [`docs/exchange/DASHA-MULTIAGENT-DOCS-CONSENSUS-2026-08-08.md`](docs/exchange/DASHA-MULTIAGENT-DOCS-CONSENSUS-2026-08-08.md) | Claude + Codex PASS + edit merge | Current exchange |
| [`dasha-landing.html`](dasha-landing.html) | Canonical Webflow homepage embed | Current; live at `/` |
| [`dasha-simp-score.mjs`](dasha-simp-score.mjs) / [`dasha-simp-actions.mjs`](dasha-simp-actions.mjs) / [`dasha-simp-board-client.js`](dasha-simp-board-client.js) | Live measured Board, claims, frozen snapshots, score cards, badges and holder proof | Live; Perry founding row remains editorial/non-measured |
| [`dasha-simp-oss-scorer.mjs`](dasha-simp-oss-scorer.mjs) / [`dasha-simp-oss-scorer.test.mjs`](dasha-simp-oss-scorer.test.mjs) | Public-GitHub OSS Simp Points scorer and offline abuse/cap fixtures | Prepared; current awards empty |
| [`dasha-worker-assets/simp/card/quiz.png`](dasha-worker-assets/simp/card/quiz.png) | 1.91:1 permanent quiz-result social preview served by the Lobby Worker | Prepared; deploy-gated |
| [`dasha-og-card.svg`](dasha-og-card.svg) / [`dasha-og-card.png`](dasha-og-card.png) | Current 1200×630 Home social-preview source and rendered asset; live audit requires exact public hash parity | Prepared; Webflow asset + page metadata replacement gated |
| [`dasha-webflow-metadata.mjs`](dasha-webflow-metadata.mjs) | Canonical title, description, Open Graph copy, canonical URL, page IDs, and Data API payloads for all five routes | Current release contract; live parity gated |
| [`dasha-meme-studio.html`](dasha-meme-studio.html) / [`dasha-studio-embed.html`](dasha-studio-embed.html) | Canonical Meme Studio authoring page and generated isolated Webflow payload | Live `/studio` |
| [`dasha-landing.test.mjs`](dasha-landing.test.mjs) | Homepage responsive, accessibility, interaction and Jupiter-modal check | Current |
| [`dasha-social-card.test.mjs`](dasha-social-card.test.mjs) | Social-card dimensions, product/trust copy and self-contained-asset check | Current |
| [`dasha-meme-studio.test.mjs`](dasha-meme-studio.test.mjs) | Studio formats, canvas, private remix state, export, share and responsive check | Current |
| [`dasha-desk/docs/X-RESEARCH-DASHA-2026-08-06.md`](dasha-desk/docs/X-RESEARCH-DASHA-2026-08-06.md) | Quote, media and attribution evidence ledger | Current snapshot |
| [`dasha-desk/docs/DEPLOY.md`](dasha-desk/docs/DEPLOY.md) | Landing build and deployment procedure | Current |
| [`DASHA-AUDIT-2026-08-06.md`](DASHA-AUDIT-2026-08-06.md) | Measured audit record and defect history | Historical evidence; current truth is in workflow |

## Current product language

- Product system: **Home + Meme Studio + Desk + Lobby + optional X OAuth + opt-in Simp Board**
- Creative experiment: **Transmissions/alibi** (unproven; not the whole product)
- Platform direction: **culture production and portable remix artifacts**
- Public action: **Make the timeline stranger.**
- Scrapped: Thesis Card, receipts, Pair and forecasting rounds; old files are archived history only.

Avoid “immutable,” “verified track record,” “official Dasha coin,” “safe,” “Ansem product,” or “proof” unless the exact claim is directly supported.

## Current live truth (observed 2026-08-08)

- **Home** `https://www.getdasha.com/` — culture landing, mint, Jupiter, Studio seeds, quiz and **Simp Board**.
- **Lobby** `https://www.getdasha.com/lobby` — separate public chat page; client served from `lobby.getdasha.com/client/lobby.js`.
- **Studio** `https://www.getdasha.com/studio` — shadow embed, formats, remix; mint present.
- **Desk** `https://www.getdasha.com/dasha` — trust-reset mint/Jupiter desk (no FOMO/raid product chrome).
- **Lobby worker** `https://lobby.getdasha.com` — health/stats/capacity, WS, optional X OAuth, simp board API, static clients. Cap 80 / soft anon 75.
- **Webflow site ID:** `5f1458122ba25e70a3ff2bd0`. Ship: `node dasha-ship.mjs --ship` (not catbox, not `bin/dasha-publish`).
- **Canonical embed sources:** `dasha-landing.html`, `dasha-studio-embed.html`, desk via `dasha-desk` build → ship embed. Lobby/simp JS are **not** inlined (Webflow ~50KB cap).
- **Live discovery:** www robots and sitemap are populated; all six sitemap routes currently return 200 with self-canonicals. Home crawlably links `/how-to-buy`; both www and lobby sitemap surfaces are audited.
- **Page SEO titles:** home/studio/desk updated off casino-era titles (Webflow page settings).
- **Scrapped forever:** Thesis Card, conviction receipts, forecasting, Telegram community as product. Files may remain on disk for history; do not ship or revive.
- **Discord:** blueprint exists; **public chat is Lobby**, not Discord HQ.

## Verification

Run:

```bash
node dasha-desk/build.mjs --check
node dasha-desk.test.mjs
node dasha-desk/dasha-share.test.mjs
node dasha-landing.test.mjs
node dasha-social-card.test.mjs
node dasha-meme-studio.test.mjs
node dasha-relay-lab.test.mjs
node dasha-remix-pack.test.mjs
```

Then verify the live page independently: top-level HTML, loaded iframe/document, links, desktop/mobile interaction, axe and horizontal overflow.
