# Dasha complete guide

**Updated:** 2026-08-08  
**Status:** Current orientation summary  
**Audience:** Operators, contributors, researchers and agents  
**Ownership boundary:** This document explains the whole project and links to its owners. It does not own mutable release state, product decisions, copy rules, deployment instructions or research conclusions.[^ownership]

## In one minute

Dasha is an open, browser-based cultural project adjacent to the Solana token `$dasha`. Its public website is [getdasha.com](https://www.getdasha.com/). The current product hypothesis is **Dasha Transmissions**: small creative situations made with the **Dasha Meme Studio**, beginning with `make me an alibi.`[^product]

The project has two public jobs:

1. make the associated token easy to identify, inspect and reach through third-party services without promises or custody;
2. test whether people want to make, pass, alter and return to portable Dasha artifacts.

The long-term possibility is larger: Dasha could become the first living world built from **open culture objects**—portable, editable media with explicit reuse terms and bounded source context. That is a falsifiable horizon, not a current platform claim.[^horizon]

The live website currently responds on Home, Studio and Desk, but the release manifest is marked **drifted**: production Home and Studio do not match the intended verified artifacts; the sitemap is not live; and document-language verification fails.[^live]

## Read this next

- Product definition: [DASHA-PRODUCT-BRIEF.md](DASHA-PRODUCT-BRIEF.md)
- Current evidence gates: [DASHA-ROADMAP.md](DASHA-ROADMAP.md)
- Work and release procedure: [DASHA-WORKFLOW.md](DASHA-WORKFLOW.md)
- Culture and copy: [DASHA-BIBLE.md](DASHA-BIBLE.md)
- Visual rules: [DASHA-ART-DIRECTION.md](DASHA-ART-DIRECTION.md)
- Complete document registry: [DASHA-DOC-OF-DOCS-2026-08-08.md](DASHA-DOC-OF-DOCS-2026-08-08.md)
- Unknown-unknowns audit: [DASHA-UNKNOWN-UNKNOWNS-RESEARCH-2026-08-08.md](DASHA-UNKNOWN-UNKNOWNS-RESEARCH-2026-08-08.md)

## What the project is

### Current product

The current experiment is **Dasha Transmissions**. Each Transmission is intended to provide one bounded situation, one small creative act and a way to preserve editability when the result is passed to someone else.[^transmission]

Transmission 001 is:

> make me an alibi.

The visible experience should remain concise. Operational machinery—verification, moderation, attribution, acknowledgment, measurement and legal boundaries—belongs behind the surface.

### Current instrument

The [Dasha Meme Studio](https://www.getdasha.com/studio) is the creative instrument, not the complete product. It currently supports procedural visual looks, post/story/banner formats, browser rendering, PNG export, sharing, editable URL-fragment state and bounded immediate-parent context.[^studio]

Important distinctions:

- A flattened image is an export, not the editable source.
- A parent link records state ancestry, not verified identity, authorship, consent or endorsement.
- URL fragments are normally processed by the browser and are not sent to Webflow in the HTTP request.
- Creation does not require an account, wallet or upload.

### Current token layer

| Field | Value |
|---|---|
| Symbol | `$dasha` |
| Chain | Solana |
| Associated mint | `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump` |
| Public mint-source post | [@dash_eats post](https://x.com/dash_eats/status/2085405228078432279) |
| Jupiter route | [SOL → associated mint](https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump) |
| Pair/chart | [Dexscreener](https://dexscreener.com/solana/9kkdpvuqrqxjiuymfcy1cwqrxlwdcggur2cap2qt7bu7) |
| Explorer | [Solscan](https://solscan.io/token/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump) |

Public association and a mint-source post do not independently establish legal control, safety, authorization or endorsement.[^association] The website must not promise price, return, yield, scarcity-driven appreciation or safety.

## Who makes it and who it references

The canonical product brief records the project as the official project developed by John Potter, working directly with Dasha and with Perry/@PerryALPHA. It also records that the exact public relationship sentence remains unresolved: “working directly with,” “authorized by” and “endorsed by” are different claims.[^authority]

The project references Daria “Dasha” Nekrasova, an actress, filmmaker and podcaster whose public account is [@dash_eats](https://x.com/dash_eats). Cultural and biographical research lives in the [Dasha Bible](DASHA-BIBLE.md). A public post, quotation or cultural reference is not automatically permission to commercially use a person's name, likeness, voice or identity.[^identity]

Current public copy includes cautious non-endorsement language. Any future relationship wording must be supported directly rather than inferred from posts, collaborator statements or project history.

## Website map

Canonical public host: [https://www.getdasha.com](https://www.getdasha.com)  
Apex: `https://getdasha.com` redirects to `www`  
Hosting/editor: Webflow  
Registrar/DNS: Cloudflare  
Webflow site ID: `5f1458122ba25e70a3ff2bd0`[^domain]

| Route | Public job | Canonical source | Primary verification |
|---|---|---|---|
| `/` | Front door, current Transmission, Studio entry, mint and risk | [`dasha-landing.html`](dasha-landing.html) | [`dasha-landing.test.mjs`](dasha-landing.test.mjs) |
| `/studio` | Create, remix, export and pass editable state | [`dasha-meme-studio.html`](dasha-meme-studio.html) | [`dasha-meme-studio.test.mjs`](dasha-meme-studio.test.mjs) |
| `/dasha` | Neutral Desk: mint, chart, sources, copy and buy route | [`dasha-desk/src/`](dasha-desk/src/) | [`dasha-desk.test.mjs`](dasha-desk.test.mjs) |

`/how-to-buy` is prepared locally but is not a valid public route and must remain unlinked until it returns the intended page. Relay, Capsule and logo-lab files are experiments without public routes.[^routes]

Every intended public route should remain clearly navigable from Home. The public surface is deliberately limited to three jobs; experiments do not become navigation merely because their source exists.

## Current live state

Never trust a prose snapshot—including this section—as the final release authority. Run:

```bash
npm run dasha:ship:status
npm run dasha:verify:live
```

Observed during this guide's preparation on 2026-08-08:

- Home returned 200 but failed the current Home contract.
- Studio returned 200 but failed the current Studio contract.
- Desk returned 200 and passed its neutral-desk check.
- `/sitemap.xml` returned 404.
- Canonical metadata passed the project verifier.
- Document language did not pass the live verifier.
- The ship manifest status was `drifted`.
- The last ship attempt passed local/browser gates and failed post-publish live verification across production and staging Home/Studio.[^live]

No publish is part of this document update.

## Source and build architecture

### Home

`dasha-landing.html` is the canonical public Home artifact. It contains the current creative entry, Simp presentation, associated mint, risk language, source links and Jupiter fallback.

### Studio

`dasha-meme-studio.html` is the standalone whole-document source. Webflow receives the generated, Shadow-DOM-isolated `dasha-studio-embed.html`, not the whole document. `dasha-studio-embed-build.mjs` generates the embed; generated embed files are not independent sources.[^embed]

### Desk

The Desk sources are:

- [`dasha-desk/src/body.html`](dasha-desk/src/body.html)
- [`dasha-desk/src/styles.css`](dasha-desk/src/styles.css)
- [`dasha-desk/src/app.js`](dasha-desk/src/app.js)

`dasha-desk/build.mjs` generates Desk outputs. Generated `app.html`, `index.html` and `dist/index.html` are not edited independently.

### Release contract

- [`DASHA-SHIP-MANIFEST.json`](DASHA-SHIP-MANIFEST.json) stores last verified identities and drift state.
- [`dasha-release-contract.json`](dasha-release-contract.json) defines required public markers.
- [`dasha-ship.mjs`](dasha-ship.mjs) prepares, gates, publishes when authorized and verifies.
- [`dasha-live-verify.mjs`](dasha-live-verify.mjs) checks actual served behavior.

The release system distinguishes prepared, gated, pushed, published and verified. A successful API response, local test or Webflow save is not equivalent to a verified live release.[^release]

## Product architecture

The intended product loop is:

```text
arrive → understand → edit → export/share → be acknowledged → return/remix
```

Only the earlier technical stages are currently proven locally. Outsider creation, acknowledgment, editable cross-person handoff and voluntary return remain unproven.[^evidence]

The smallest current experiment measures:

- prompt views;
- distinct non-operator starts;
- material edits;
- exports and submissions;
- first-contribution acknowledgment;
- editable links preserved;
- cross-person remixing;
- voluntary return.

Price, market capitalization, volume, followers, raw reactions and operator-created examples do not prove the loop.

## Ambitious horizon

The conditional north star is an **open culture object**:

- immediately viewable;
- editable;
- portable outside its originating site;
- exportable as ordinary media;
- explicit about reuse terms;
- able to preserve bounded source context;
- independent of an account or wallet;
- implementable by another renderer.

The evidence ladder is intentionally strict:

1. one person edits and exports;
2. another person opens and materially changes that state;
3. a real lineage is useful and consensual;
4. a second independent renderer passes shared fixtures;
5. an outside community reuses the format without operator help.

Only then should the project consider discovery feeds, federation, profiles, collaborative canvases, C2PA credentials, cryptographic identity, patronage or economics.[^standards]

Dasha should reuse existing standards where requirements arise: ordinary URLs/files, explicit licenses, C2PA for durable media provenance, and W3C annotation/social protocols for cross-host interaction. Standards availability is not product demand.

## Culture, voice and visual identity

The house voice is concise, deadpan, slightly strange and resistant to corporate explanation. Public-source lines inform tone, but should not be transformed into promises or fabricated first-person endorsements.[^voice]

Core visual system:

| Role | Value |
|---|---|
| Ink | `#070608` |
| Paper | `#f4eddb` |
| Acid | `#dfff00` |
| Hot | `#ff3b81` |
| Violet | `#7c4dff` |
| Mark | Slot-machine cherries |
| Type | Heavy system/Arial display |

The visual rules, source-media policy and forbidden patterns live in [DASHA-ART-DIRECTION.md](DASHA-ART-DIRECTION.md) and [DASHA-BIBLE.md](DASHA-BIBLE.md). Third-party media must not be treated as MIT/CC0 project material merely because it is publicly reachable.[^media]

## Simp Board and recognition

The live Simp Board keeps Perry/@PerryALPHA's disclosed founding position as a non-measured editorial row and now supports separately opt-in measured rows through the Lobby's X OAuth session. Members can join or self-remove, submit public evidence for creative, community and open-source contributions, receive fixed reviewed awards, display earned badges, download a browser-rendered score card and view immutable season snapshots.[^simp]

The optional holder badge uses a short-lived signed Solana message and a current associated-mint check. It sends no transaction, stores only a 28-day badge expiry, publishes no wallet or balance and scores zero. It is status evidence, not identity uniqueness or Sybil resistance.

An OSS scoring lane is prepared but inactive. It is designed to recognize reviewed, merged contributions from non-operators using public GitHub evidence and maintainer-applied impact labels. Its authoritative result is empty because no qualifying merged contribution exists.

Automated X scoring, holder-weighted ranking, balance publication, paid placement, referral points and airdrop implications remain excluded. Research finds that recognition can increase contribution while narrowing novelty, and that public ranks can demotivate lower-ranked participants.[^recognition]

## Ritual, fandom and community

Research supports a carefully bounded hypothesis: repeated structure, mutual focus, recognizable symbols and lightweight acknowledgment may support belonging. It also warns that rituals can produce insiders, outsiders, conformity and affective labor.[^ritual]

Project implications:

- spectatorship and occasional participation remain legitimate;
- newcomer action must not require insider vocabulary;
- no streaks or public absence signals;
- no automated Dasha persona simulating reciprocal affection;
- plural community fiction should not collapse into one inferred canon;
- editorial continuity does not imply approval by the real person;
- human acknowledgment should remain visibly human.

Discord is a blueprint, not a current community surface. It becomes justified only after recurring participants need persistent coordination and moderation ownership exists.[^discord]

## Open source

The public repository is [Uuriko/dasha-desk](https://github.com/Uuriko/dasha-desk). It includes an MIT license, README, contribution guide, code of conduct, security policy, CODEOWNERS, PR template, source/build separation, tests and asset-attribution material.[^oss]

Home and Studio remain inside the broader private/ops repository and do not currently share a root public license. The project must not publish the entire mixed Demigod/Dasha operations repository merely to call the website open source.

Outstanding OSS questions include:

- public boundary for Studio and Home;
- clean-clone verification;
- branch/ruleset enforcement;
- public CI state;
- issue templates and governance;
- dependency review, secret scanning and pinned actions;
- contribution licensing for code and creative media;
- release provenance and versioning;
- maintainer capacity and response expectations.

The operating plan is in [DASHA-OPEN-SOURCE.md](DASHA-OPEN-SOURCE.md) and [DASHA-OSS-OPERATOR-PLAYBOOK.md](DASHA-OSS-OPERATOR-PLAYBOOK.md).

## Rights, licensing and provenance

Project-owned Studio assets and exports use a CC0-oriented kit license with explicit trademark and likeness carve-outs. The license cannot dedicate rights the project or contributor does not own.[^license]

Every reusable artifact should be able to state:

- title or Transmission identifier;
- maker-supplied display name;
- immediate source or parent when present;
- source-asset attribution;
- license or permission state;
- indication that changes were made;
- non-endorsement boundary.

The system must distinguish project-owned assets, contributor-owned submissions, compatible third-party materials and public identity/likeness references.

## Safety, legal and trust boundaries

Permanent trust rules include:

- no price prediction, return promise or urgency;
- no fabricated holders, volume, partnerships, quotes or endorsements;
- no custody of keys or funds;
- no unofficial Telegram link;
- no claim that Jupiter, a checker or public source makes the token safe;
- no wallet requirement for creative participation;
- no public holder balances;
- no automatic ranking without consent, appeal and manipulation controls;
- no outbound posting, messages, submissions, payments or trades without current authority.

The SEC staff's 2025 meme-coin statement is nonbinding and fact-specific; it expressly excludes economically different arrangements and does not displace other law. FTC endorsement guidance requires truthful endorsements and disclosure of material relationships. Publicity, trademark, copyright, privacy, advertising, tax and jurisdictional questions remain fact-specific.[^legal]

This project documentation identifies issues; it is not legal advice.

## Security and privacy

Current strengths:

- static public architecture;
- no first-party custody;
- Studio does not require wallet, account or upload;
- visible mint and risk language;
- external links use appropriate opener isolation in inspected source;
- fragment state is client-side under normal URL processing.

Current gaps or unknowns:

- Home executes third-party Jupiter JavaScript;
- inspected responses showed HSTS but not a CSP or several other defense-in-depth headers;
- remote images and market APIs can fail or observe requests;
- shared build tooling has known dependency advisories whose Dasha reachability is unresolved;
- no complete public privacy/retention inventory;
- a future submission backend would add spam, content, privacy and moderation risk;
- Webflow concurrency has already produced live drift.[^security]

Security findings follow private disclosure paths. The public repository's policy is [`dasha-desk/SECURITY.md`](dasha-desk/SECURITY.md).

## Accessibility, performance and discovery

Working target: WCAG 2.2 AA.[^accessibility]

Required evidence includes keyboard completion, visible/unobscured focus, target size, contrast, zoom/reflow, reduced motion, screen-reader state, canvas alternatives, modal focus behavior, error/offline states and cross-browser/mobile testing.

Production discovery work includes a bounded three-route sitemap, canonical `www` URLs, staging de-indexing, route-specific metadata, useful 404 behavior and social cards. Current live verification reports the sitemap missing.

Performance must measure LCP, INP and CLS rather than assuming a visually small page is fast. Jupiter, Webflow runtime, fonts, remote media and canvas export are the important candidate costs.

## Workflow

The normal loop is:

1. read [DASHA-DOCS.md](DASHA-DOCS.md);
2. inspect Git and live state;
3. choose one lane;
4. define one user-visible outcome and proof;
5. edit only canonical sources;
6. run the smallest relevant gate;
7. run complete release gates before publishing;
8. publish only under current request authority;
9. verify actual public behavior;
10. report live, local, blocked and proposed states distinctly.

Useful commands:

```bash
npm run dasha:test:all
npm run dasha:ship:test
npm run dasha:ship:status
npm run dasha:verify:live
npm run dasha:gate:fast
```

The documentation coherence gate verifies that local links in [DASHA-DOCS.md](DASHA-DOCS.md) resolve and documented `npm run` commands in owner documents exist.[^docs]

## Documentation system

Stable owner documents answer stable questions:

| Question | Owner |
|---|---|
| What is the product? | [DASHA-PRODUCT-BRIEF.md](DASHA-PRODUCT-BRIEF.md) |
| What happens next? | [DASHA-ROADMAP.md](DASHA-ROADMAP.md) |
| What could exist? | [DASHA-HORIZON.md](DASHA-HORIZON.md) |
| How does it sound? | [DASHA-BIBLE.md](DASHA-BIBLE.md) |
| How does it look? | [DASHA-ART-DIRECTION.md](DASHA-ART-DIRECTION.md) |
| How is it shipped? | [DASHA-WORKFLOW.md](DASHA-WORKFLOW.md) |
| Where is every document? | [DASHA-DOC-OF-DOCS-2026-08-08.md](DASHA-DOC-OF-DOCS-2026-08-08.md) |
| What evidence exists? | [DASHA-ACADEMIC-EVIDENCE.md](DASHA-ACADEMIC-EVIDENCE.md) and [unknown-unknowns audit](DASHA-UNKNOWN-UNKNOWNS-RESEARCH-2026-08-08.md) |
| How should docs improve? | [DASHA-DOCS-SYSTEM-BACKLOG.md](DASHA-DOCS-SYSTEM-BACKLOG.md) |

Dated research supports owners but does not replace them. Historical audits do not own current state. Scrapped specs do not become backlog merely because they remain on disk.

## Scrapped, frozen and gated work

Permanently scrapped:

- Thesis Card;
- conviction receipts;
- forecasting/rounds;
- Pair and settlement descendants;
- FOMO/raid product mechanics;
- the unassociated Telegram surface.

Frozen experiments:

- Relay lab;
- Culture Capsule/remix pack;
- logo lab;
- how-to-buy route;
- Discord blueprint;
- social-engagement scraping or token-weighted Simp ranking.

Evidence-gated possibilities include Remix Relay, static editorial capsules, portable culture kits, live remix rooms, independent renderers, physical artifacts and eventual outside reuse. The complete possibility map is [DASHA-HORIZON.md](DASHA-HORIZON.md); the kill list is [DASHA-SIMPLIFY.md](DASHA-SIMPLIFY.md).

## Decision history

- The unrelated Telegram link was rejected; Discord remains only a gated blueprint.
- The thesis/receipt/forecasting product was permanently scrapped.
- Studio became the creation instrument.
- Dasha Transmissions became the current participatory experiment.
- A minimal Simp Board shipped with explicit opt-in, reviewed evidence, fixed caps and zero-point holder status; participation remains the evidence gate.
- Portable editable state became the critical behavior under test.
- Open culture objects became the ambitious conditional horizon.
- Release state moved out of prose and into the manifest/live verifier.
- Documentation links and commands became executable coherence checks.

Decision reasons and reversal conditions remain in the brief, roadmap, research and workflow owners rather than being redefined here.

## Current priorities

1. Preserve release truth and prevent concurrent overwrite.
2. Reconcile intended Home/Studio with production only under explicit publish authority.
3. Restore sitemap and document-language compliance.
4. Settle precise public relationship wording and rights boundaries.
5. Keep the creative surface elegant.
6. Operate one real Transmission with manual acknowledgment.
7. Measure outsider creation, handoff and return.
8. Let evidence select expansion—or stop it.

## Unknowns

- Exact public wording Dasha has authorized or prefers.
- Control and recovery arrangements for every public account.
- Whether token buyers, fans, creators and OSS contributors overlap.
- Whether anyone outside the operators wants to create, remix or return.
- Whether portable editability survives real sharing.
- Whether a printable artifact is kept or passed.
- Whether recognition motivates without narrowing novelty.
- Whether the token helps distribution or damages product trust.
- Whether the durable product is a living world, open format, editorial media project or elegant token site with a creative tool.
- Whether an outside renderer or community will ever justify calling the format open.

## Footnotes

[^ownership]: The owner model is defined in [DASHA-DOCS.md](DASHA-DOCS.md) and the exhaustive registry in [DASHA-DOC-OF-DOCS-2026-08-08.md](DASHA-DOC-OF-DOCS-2026-08-08.md). This guide intentionally links rather than duplicating fine-grained mutable truth.
[^product]: Current definition and boundaries: [DASHA-PRODUCT-BRIEF.md](DASHA-PRODUCT-BRIEF.md). Current order and evidence gates: [DASHA-ROADMAP.md](DASHA-ROADMAP.md).
[^horizon]: The possibility space and falsification ladder live in [DASHA-HORIZON.md](DASHA-HORIZON.md). The supporting research synthesis is in [DASHA-UNKNOWN-UNKNOWNS-RESEARCH-2026-08-08.md](DASHA-UNKNOWN-UNKNOWNS-RESEARCH-2026-08-08.md).
[^live]: Direct observations were produced by `npm run dasha:ship:status` and `npm run dasha:verify:live` on 2026-08-08. The machine-readable owners are [DASHA-SHIP-MANIFEST.json](DASHA-SHIP-MANIFEST.json) and [dasha-release-contract.json](dasha-release-contract.json).
[^transmission]: Experiment definition, measurements and stop conditions: [DASHA-PARTICIPATORY-CULTURE-RESEARCH-2026-08-08.md](DASHA-PARTICIPATORY-CULTURE-RESEARCH-2026-08-08.md).
[^studio]: Studio implementation: [dasha-meme-studio.html](dasha-meme-studio.html). Behavioral gate: [dasha-meme-studio.test.mjs](dasha-meme-studio.test.mjs). Product role: [DASHA-PRODUCT-BRIEF.md](DASHA-PRODUCT-BRIEF.md).
[^association]: Token facts and public-source links: [DASHA-BIBLE.md](DASHA-BIBLE.md). Trust wording: [DASHA-PRODUCT-STRATEGY.md](DASHA-PRODUCT-STRATEGY.md).
[^authority]: See “Who makes it” in [DASHA-PRODUCT-BRIEF.md](DASHA-PRODUCT-BRIEF.md). The guide does not independently verify private relationship evidence.
[^identity]: Issue map and scholarly sources: [DASHA-ACADEMIC-EVIDENCE.md](DASHA-ACADEMIC-EVIDENCE.md). Operational copy boundary: [DASHA-BIBLE.md](DASHA-BIBLE.md).
[^domain]: IDs, DNS history, metadata and publication procedure: [DASHA-DOMAIN-WEBFLOW-LAUNCH.md](DASHA-DOMAIN-WEBFLOW-LAUNCH.md).
[^routes]: Public keep/kill map: [DASHA-SIMPLIFY.md](DASHA-SIMPLIFY.md).
[^embed]: Canonical-source table and embed procedure: [DASHA-WORKFLOW.md](DASHA-WORKFLOW.md) and [DASHA-DOMAIN-WEBFLOW-LAUNCH.md](DASHA-DOMAIN-WEBFLOW-LAUNCH.md).
[^release]: Operational statuses and gates: [DASHA-WORKFLOW.md](DASHA-WORKFLOW.md), [DASHA-SHIP-FAST.md](DASHA-SHIP-FAST.md) and [dasha-ship.mjs](dasha-ship.mjs).
[^evidence]: Research decision and measurement contract: [DASHA-PARTICIPATORY-CULTURE-RESEARCH-2026-08-08.md](DASHA-PARTICIPATORY-CULTURE-RESEARCH-2026-08-08.md). Evidence limitations: [DASHA-ACADEMIC-EVIDENCE.md](DASHA-ACADEMIC-EVIDENCE.md).
[^standards]: [C2PA 2.4](https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html), [W3C Web Annotation](https://www.w3.org/TR/annotation-model/) and [W3C Social Web Protocols](https://www.w3.org/TR/social-web-protocols/). These standards solve narrower interoperability/provenance problems; they do not validate Dasha demand.
[^voice]: Primary cultural and copy owner: [DASHA-BIBLE.md](DASHA-BIBLE.md).
[^media]: Visual and media rules: [DASHA-ART-DIRECTION.md](DASHA-ART-DIRECTION.md), [DASHA-BIBLE.md](DASHA-BIBLE.md) and [DASHA-KIT-LICENSE.md](DASHA-KIT-LICENSE.md).
[^simp]: Product boundary and activation gates: [DASHA-ROADMAP.md](DASHA-ROADMAP.md). Machine-readable editorial state: [dasha-simp-board.json](dasha-simp-board.json).
[^recognition]: Academic map: [DASHA-ACADEMIC-EVIDENCE.md](DASHA-ACADEMIC-EVIDENCE.md), especially peer awards, leaderboards and intrinsic motivation.
[^ritual]: Ritual, fandom, distributed mentoring and affective-labor research is summarized with transfer limits in [DASHA-ACADEMIC-EVIDENCE.md](DASHA-ACADEMIC-EVIDENCE.md).
[^discord]: Gated plan: [DASHA-DISCORD-BLUEPRINT.md](DASHA-DISCORD-BLUEPRINT.md). Discord does not presently exist as a controlled public product surface.
[^oss]: Public-project plan: [DASHA-OPEN-SOURCE.md](DASHA-OPEN-SOURCE.md). Maintainer operations: [DASHA-OSS-OPERATOR-PLAYBOOK.md](DASHA-OSS-OPERATOR-PLAYBOOK.md). Public repository: [Uuriko/dasha-desk](https://github.com/Uuriko/dasha-desk).
[^license]: [DASHA-KIT-LICENSE.md](DASHA-KIT-LICENSE.md), [`LICENSE-KIT`](LICENSE-KIT) and [`dasha-desk/assets/ATTRIBUTION.md`](dasha-desk/assets/ATTRIBUTION.md).
[^legal]: [SEC staff statement on meme coins](https://www.sec.gov/newsroom/speeches-statements/staff-statement-meme-coins), [Commissioner Crenshaw's response](https://www.sec.gov/newsroom/speeches-statements/crenshaw-response-staff-statement-meme-coins-022725), [SEC crypto materials](https://www.sec.gov/about/divisions-offices/division-corporation-finance/corpfin-crypto-assets) and [FTC endorsement guidance](https://www.ftc.gov/news-events/topics/truth-advertising/advertisement-endorsements).
[^security]: Current audit and sources: [DASHA-UNKNOWN-UNKNOWNS-RESEARCH-2026-08-08.md](DASHA-UNKNOWN-UNKNOWNS-RESEARCH-2026-08-08.md). Baselines: [OWASP Top 10: 2025](https://owasp.org/Top10/2025/0x00_2025-Introduction/) and [OpenSSF Scorecard](https://openssf.org/scorecard/).
[^accessibility]: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and its [new success criteria](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/). Project-specific audit: [DASHA-UNKNOWN-UNKNOWNS-RESEARCH-2026-08-08.md](DASHA-UNKNOWN-UNKNOWNS-RESEARCH-2026-08-08.md).
[^docs]: The gate is [dasha-product-coherence.test.mjs](dasha-product-coherence.test.mjs), included in `npm run dasha:test:all` in [`package.json`](package.json).
