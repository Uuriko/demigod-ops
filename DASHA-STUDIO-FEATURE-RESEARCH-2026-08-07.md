# Dasha Studio feature research — 2026-08-07

## Decision

Ship **one-hop remix lineage** as the next prepared Studio feature. An inbound artifact that is materially changed now carries its immediate parent’s validated look, format and line in the new URL fragment. A child visibly links back to that reconstructable parent. Editing the child advances the chain by replacing the grandparent with the child’s immediate prior state.

This is state ancestry, not proof of identity, authorship, permission, consent or endorsement. It has no account, wallet, backend, public graph or recursively growing URL.

## Evidence ledger

- Current Studio already reconstructs a complete artifact from a bounded URL fragment, exports a PNG and shares the image with the editable link. Homepage seeds supply finished starting points. Direct source and runtime inspection, 2026-08-07.
- The Studio had no visible relationship between a received artifact and a changed descendant. A recipient could remix, but the resulting object did not demonstrate the relay.
- Sketch-a-bit was designed for deep creative chains in which every sketch is directly prompted by a previous sketch; its published analysis covered more than 50,000 sketches. [AAAI AIIDE](https://doi.org/10.1609/aiide.v8i5.12572).
- Scratch research found both positive reactions and plagiarism accusations around remixing, supporting visible upstream acknowledgment without overclaiming authorship. [ICWSM](https://doi.org/10.1609/icwsm.v4i1.14028).
- A 2026 remix-culture paper identifies decentralized access with upstream acknowledgment as a core practice in the Hatsune Miku ecosystem. This is a short SSRN paper and is used as directional evidence, not universal proof. [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6577918).
- Recent scholarship characterizes meme circulation as continuous alteration that creates new meaning at each iteration. [Remixsphere](https://doi.org/10.56074/msgsuakademi.1803189).
- Farcaster Mini Apps explicitly package social discovery and viral mechanics around actions that happen inside the feed. This supports a later distribution wrapper only after the underlying handoff behavior works. [Farcaster](https://miniapps.farcaster.xyz/).
- Base’s 2026 guidance now treats apps as standard web apps and removes several earlier SDK-specific assumptions. This argues against prematurely coupling the Studio to a wrapper. [Base documentation](https://docs.base.org/apps/guides/migrate-to-standard-web-app).
- Grok independently ranked bounded lineage `ship`; its strongest objection was schema drift and URL bloat unless validation remains strict and ancestry depth remains exactly one. Consultation receipt: 2026-08-07 local `grok-ask` run.

## Ranked feature options

| Rank | Feature | Why it could win | Decision now |
|---:|---|---|---|
| 1 | One-hop remix lineage | Makes the differentiating handoff visible, reuses exact fragment state, gives the recipient a useful parent, and needs no identity or backend | **Implemented locally** |
| 2 | Before/after share card | Could show mutation at a glance and make chains legible outside the Studio | Defer until real second-generation remixes exist; it doubles visual payload and may weaken the finished artifact |
| 3 | Relay invitation | A maker names or challenges the next change | Existing editable link already performs the handoff; test concise share copy before adding UI |
| 4 | Moment prompt deck | Gives a community a timely reason to make several related artifacts | Run with curated homepage seeds first; no scheduling system or prompt CMS |
| 5 | Collaborative capsule/zine | Turns several remixes into one bounded shared object | Prepared separately; test only after more than one person actually contributes |
| 6 | Community culture packs | Lets another community reuse a visual system with explicit terms | Three-size local preparation is implemented; an outside community and explicit rights boundary are still required before calling it a portable kit |
| 7 | Farcaster/Base/Solana Mobile wrapper | Brings creation into a discovery surface | Distribution cannot manufacture relay demand; wrap only after non-operator chains recur |
| 8 | Image upload, stickers and freeform layout | Adds expressive range | Generic-editor competition, asset-rights complexity and interface weight; reject for the current wedge |
| 9 | AI caption or image generation | Lowers blank-page friction | Homepage seeds already remove the blank page; crowded, nondeterministic and less remix-specific |
| 10 | Profiles, gallery, likes, leaderboard or rewards | Creates visible activity | Reject: backend/moderation/fake-activity burden and incentives can obscure whether artifacts are intrinsically worth passing |

## Implemented behavior

- Parent fields are accepted only when look and format are known, the line is nonempty, and the line is at most 120 characters.
- A blank Studio never invents a parent.
- An untouched inbound starter does not claim a new generation.
- A material change to look, format or effective line attaches the inbound artifact as parent.
- An existing child keeps its parent when merely reopened or copied.
- Editing that child replaces the grandparent with the child’s own prior state, keeping depth at one.
- The visible `From “…”` link is constructed locally on the same Studio route.
- Image-only experiment links never carry or share lineage.
- Old fragment and legacy query links remain readable.

Canonical implementation: [`dasha-meme-studio.html`](dasha-meme-studio.html). Generated pasteable Webflow payload: [`dasha-studio-embed.html`](dasha-studio-embed.html); [`dasha-studio-embed.js`](dasha-studio-embed.js) is the identical optional asset form and is not used without a recorded upload URL.

## Experiment and falsification

The feature is technically verified but demand-unproven. The discriminating observation is a non-operator second-generation remix whose link contains a valid immediate parent and is voluntarily passed again.

Do not count agent-generated examples, parser tests, clicks, compliments or first-generation exports. If real recipients routinely export the PNG but remove or ignore the editable link, lineage has not rescued the relay hypothesis. Do not build a public graph, gallery, profiles or protocol to manufacture evidence.

## Ambitious horizon

If multiple independent chains recur, the earned next feature is a **before/after relay view**, followed by bounded multi-person Culture Capsules. If a second independent renderer consumes the recipe, extract an Open Culture Object format. Until those observations exist, a public lineage graph, marketplace, token incentive layer and SDK remain unsupported commitments.

## Fresh Solana product scan — 2026-08-07

- Frontier recorded 438 Consumer Apps submissions (15.3%) but only 92 Social/SocialFi submissions (3.2%). Category counts show builder supply, not demand, yet they do show that a generic social label is not a differentiated wedge. [Colosseum Analytics](https://colosseum.com/analytics).
- Solana Mobile reports more than 900 dApps and introduced a weekly themed Spotlight containing only four products, with curation notes and reviews. Distribution increasingly rewards a polished, immediately legible artifact rather than feature volume. [Solana Mobile](https://solanamobile.com/blog/introducing-dapp-spotlight-in-the-solana-dapp-store).
- Current highlighted apps lead with smooth games, real utility or a direct skill loop. Colosseum companies similarly emphasize two-click workflows, creator/audience interaction and usable financial operations. [Solana Mobile](https://solanamobile.com/blog/introducing-dapp-spotlight-in-the-solana-dapp-store), [Colosseum companies](https://colosseum.com/companies).
- Grok’s forced contrarian bet was a deterministic Culture Face Pack: one seed becomes a coherent set of platform formats while Remix Relay remains the propagation path. Its failure condition is that communities care only about charts and never reuse the visual system.

The cheapest implementation is **Prepare 3 sizes** in the existing Studio. It renders the selected look and line as post, story and banner once, then exposes three explicit download links. An attempted automatic multi-download was rejected after a real Chrome probe silently discarded the downloads; explicit user-initiated links worked for all three files. This is a Dasha launch-pack convenience, not evidence that an outside-community Culture Kit product exists.

## Status

Prepared and verified locally. Not published. No external adoption, conversion lift or purchase increase is claimed.

## Fresh competitive check — 2026-08-07

- Pump.fun still compresses token creation to a direct launch flow; competing on coin creation would erase Dasha's culture-product distinction. [Pump.fun](https://pump.fun/create).
- MemeMint now markets 40 AI styles, AI video, meme packs, stickers and pump.fun deployment. This makes “more styles” and generic AI generation a crowded feature-volume contest rather than a defensible next move. [MemeMint](https://www.mememint.fun/).
- Frontier's current 2,870 categorized submissions include 438 Consumer Apps (15.3%) and 92 Social/SocialFi projects (3.2%). These are builder-supply counts, not user demand, but they do not justify another generic social feed. [Colosseum Analytics](https://colosseum.com/analytics).
- Solana Actions and Blinks can expose a transaction through shareable links, but production requires public GET/POST endpoints, CORS, transaction construction and client/registry handling. The existing fixed-mint Jupiter handoff is the weaker sufficient buy path until a Blink solves an observed distribution failure. [Solana Actions and Blinks](https://solana.com/developers/guides/advanced/actions).
- Grok's hostile review independently rejected AI generation, feeds, Blinks, token gates and more templates as the next move. Its reason was operational, not aesthetic: the public home and Studio still lag the already verified conversion checkpoint, so new surface area would not test the current product.

Decision: no additional editor feature follows the three-size and lineage work before the coherent checkpoint is live and observed. The next technical improvement is truthful live-state verification: [`dasha-live-verify.mjs`](dasha-live-verify.mjs) now compares the uploaded Studio asset with the generated local payload and reports homepage checkpoint drift separately.
