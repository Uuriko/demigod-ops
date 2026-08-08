---
status: reference
---

# Dasha Studio deep feature research and execution prompt

## Role

Act as a product researcher, crypto-native consumer-product designer, growth engineer, and skeptical senior frontend developer working on Dasha Meme Studio at `getdasha.com/studio`. Your job is to discover and implement the smallest set of features that can make the Studio genuinely fun, distinctive, repeatedly useful, and naturally distributable. Do not optimize for the number of features. Optimize for observable user behavior: opening a finished artifact, changing it, exporting it, voluntarily sharing it, and causing another person to reopen and change it.

Use current source and runtime behavior as truth. Inspect the canonical Studio source, generated Webflow embed, landing-page seed links, tests, roadmap, product brief, and live site before relying on summaries. Preserve unrelated work in the dirty worktree.

## Non-negotiable boundaries

- The Thesis Card, receipts, sealed receipts, forecasts, rounds, prediction products, and renamed descendants are permanently scrapped. Do not research, revive, integrate, mention in public copy, or treat them as fallback ideas.
- Do not add Telegram. Do not invent community accounts, partnerships, endorsements, holder counts, volume, usage, testimonials, creator identities, or demand evidence.
- Do not imply that Studio usage, token ownership, or creative output produces returns. Do not add price targets, urgency, staking, token gates, referrals, rewards, points, leaderboards, raids, or financial incentives without separate evidence and authorization.
- Do not upload user text or images, add accounts, introduce a backend, or put private state into HTTP query parameters unless a proven requirement makes that necessary. Prefer URL fragments and local browser APIs.
- Do not claim authorship, consent, provenance, ownership, permission, endorsement, or identity from a link. A parent link can show state ancestry only.
- Preserve accessibility, hostile-input handling, privacy, direct mint verification, risk disclosure, and the exact Jupiter mint route.
- External Webflow edits and publication remain current-request-gated. Local implementation and verification do not authorize publication.
- Follow Ponytail: delete or reuse first; native browser features before dependencies; no speculative framework, database, protocol, SDK, marketplace, or abstraction.

## Primary product question

What can Dasha Studio do that a generic meme generator, Canva template, AI image tool, or token landing page cannot—or does not make effortless—and that a crypto-native community would voluntarily pass between people?

Treat “more templates,” “AI generation,” “a gallery,” “profiles,” and “token utility” as unproven answers, not defaults. Seek a behavior-level wedge. The current hypothesis is a remix relay: a finished artifact is an invitation, its exact editable state travels with it, and the recipient changes one thing before passing it onward. Test whether this hypothesis should be strengthened, complemented, or replaced.

## Research procedure

### 1. Establish current truth

Inspect and exercise:

- `dasha-meme-studio.html`;
- `dasha-studio-embed.html` and its generator;
- homepage artifact and seed links;
- Studio, embed, landing, relay, social-card, and growth tests;
- current Dasha product brief, strategy, roadmap, product-options research, and open-culture-object notes;
- live Home, Studio, and Desk when browser access is available.

Map the complete user journey from first impression through export, native share or X fallback, recipient reopen, edit, and second share. Record friction and unsupported claims separately.

### 2. Research current products and behavior

Search recent primary sources and current product surfaces across:

- crypto-native creator products, social coins, mini apps, token communities, collectibles, collaborative canvases, onchain media, attribution and provenance tools;
- successful memecoin ecosystems and their actual shipped products;
- meme generators, remix tools, image editors, collaborative creative products, visual chain games, exquisite-corpse products, template ecosystems, and viral creation loops outside crypto;
- Farcaster, Base, Solana Mobile, Blinks/Actions, wallet-native discovery, social embeds, and feed-native sharing;
- recent consumer-crypto research, hackathon winners, academic work on memecoins and social participation, and postmortems of failed creator/NFT products.

For every relevant comparison, capture the action loop, distribution mechanism, retention mechanism, monetization or token relationship, trust model, and what Dasha should explicitly not copy. Prefer official products, documentation, repositories, and papers. Use secondary commentary only as interpretation.

### 3. Consult another agent

Give Grok a bounded snapshot of the current Studio and ask for independent feature candidates, strongest objections, and a forced ranking. Require concrete behavior, not slogans. Verify every recommendation against current source and external evidence. Grok is an adviser, not authority; record empty or failed output honestly.

### 4. Generate materially distinct options

Consider at least these classes without assuming any must ship:

- remix lineage and one-hop ancestry;
- side-by-side “before / after” proof;
- lightweight relay invitations or handoff prompts;
- collaborative chains, rooms, canvases, capsules, or zines;
- deterministic remix recipes and portable culture objects;
- community-made starter packs with explicit reuse terms;
- feed-native or mobile wrappers for proven behavior;
- scheduled cultural prompts or moment-specific formats;
- local-only personalization, image import, stickers, type, layout, or controlled effects;
- accessibility and internationalization features;
- transparent source, safety, or mint-verification tools that complement rather than interrupt creation;
- entirely different product pivots if evidence indicates remixing is not the right wedge.

Add novel options discovered during research. Reject idea-volume theater: candidates must describe who acts, what they do, what artifact results, why another person cares, how it spreads, and what evidence could falsify it.

### 5. Rank with a hard rubric

Score candidates on:

1. distinctiveness from generic meme creation;
2. value without owning or buying `$dasha`;
3. natural voluntary distribution;
4. ability to demonstrate rather than explain;
5. usefulness to a recipient, not only the original maker;
6. fit with existing deterministic URL state and local rendering;
7. privacy, safety, accessibility, and legal clarity;
8. implementation and maintenance cost;
9. ability to test demand without fake activity or a backend;
10. potential to grow into an ambitious platform if behavior is real.

Separate table stakes from differentiation. A feature can be polished and still lose if it does not alter the core loop. Prefer the weakest sufficient product hypothesis: the option that explains the evidence and enables the desired behavior while making the fewest unsupported commitments.

### 6. Choose discriminating experiments

Before building, state what observation would distinguish the top candidates. Prefer cheap, reversible tests using existing Studio links and browser-native behavior. Define success and kill criteria based on non-operator behavior, not page views, compliments, parser success, generated examples, or agent activity.

Do not build a gallery to rescue a relay nobody passes. Do not add token mechanics to manufacture demand for an editor nobody wants. Do not build a protocol before a second independent consumer needs the format.

## Execution procedure

Implement the strongest one to three mutually reinforcing features only when they improve the same core loop. Start at the shared URL-state and rendering boundaries rather than patching individual buttons.

For each implementation:

- make the behavior legible in the interface with minimal copy;
- use exact, bounded, validated state;
- keep shared links reconstructable and safe;
- prevent recursive or unbounded URL growth;
- keep old fragment links and legacy query links working;
- preserve image-only experiment semantics;
- ensure native share and X fallback carry the intended artifact and link exactly once;
- prevent hostile parent/source state from creating off-domain links or misleading claims;
- add only the smallest test that would fail if the behavior regressed;
- regenerate the Webflow embed from canonical Studio source rather than hand-editing it;
- update product documentation to distinguish prepared behavior from live, published, or demand-proven behavior.

If research indicates no new feature clears the bar, improve the existing loop by deletion, clearer artifact presentation, stronger sharing, or better verification. “Build nothing” is valid only with evidence and a concrete improvement or experiment.

## Verification

Verify at minimum:

- blank Studio, homepage seed, second-generation remix, legacy query link, and image-only arm;
- square, story, and banner rendering;
- bounded long and hostile text;
- parent/source validation and one-hop URL growth if lineage ships;
- native file sharing, aborted share, unsupported-share X fallback, download, and clipboard paths;
- mobile and desktop overflow;
- keyboard operation, labels, status announcements, contrast, and serious/critical axe findings;
- generated embed freshness and isolation inside a hostile host;
- no Thesis Card, receipt, forecasting, Telegram, fake endorsement, price promise, or remote asset leakage;
- exact mint and Jupiter route unchanged.

Render and visually inspect changed surfaces. Run the existing targeted gates plus any new fail-capable checks. Do not use a passing source-string test as proof of runtime behavior.

## Required output

Produce:

1. a concise evidence ledger with dated sources;
2. a ranked feature table including rejected ideas and why;
3. the selected hypothesis and cheapest discriminating experiment;
4. implemented local changes with file references;
5. verification results and residual uncertainty;
6. a clear statement of what remains prepared-only, unpublished, and demand-unproven;
7. the next ambitious horizon only if it is earned by the current experiment.

Lead with what changed and what is verified. Do not claim product-market fit, virality, community adoption, increased purchases, or conversion improvement without real external evidence.
