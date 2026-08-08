# Open Culture Objects — ambitious Dasha product horizon

Updated: 2026-08-07

## Decision

The most defensible ambitious Dasha product is an **open format for portable, editable cultural objects**: a finished image travels through a feed, while a compact recipe beside it lets another person reconstruct, change and pass on the exact editable object.

Working shorthand: **Open Culture Objects (OCO)**. This is a product hypothesis, not a released protocol or token utility claim.

```text
see render + recipe → reconstruct → change one thing → export render + child recipe → repeat
```

The current Studio fragment proves only that Dasha can serialize and rehydrate its own `look`, `format` and `line`. One renderer reading its own URL is a useful save format, not interoperability. Dasha earns the word “open” only after a second independent consumer can reproduce documented fixtures.

## User job

People should be able to answer culture with culture without joining another feed, surrendering the editable source, or asking the original maker for a project file.

The object has two inseparable outputs:

1. a flattened render that works in ordinary social feeds;
2. a small editable recipe that survives outside the Dasha interface.

This is narrower than a creative suite and more ambitious than a meme generator. Culture Kits, remix rooms, community zines and social mini apps can later consume the same object instead of defining incompatible project formats.

## Why this gap exists

- Hosted remix products such as [Magma](https://magma.com/blog/september-2025-update-3-remixing-is-here-copy) and [ForkArt](https://forkart.app/) demonstrate demand for remix lineage, but their product surfaces remain the primary place where lineage is experienced.
- [Uplink](https://uplink.wtf/) already combines multiplayer galleries, contests, token-based participation and creator earnings. OCO must travel beyond a hosted board rather than recreate one.
- AI content suites such as [Meme Agent Studio](https://memeagentstudio.com/whitepaper/), [Kaplex](https://www.usekaplex.com/) and YC's [Remix](https://www.ycombinator.com/companies/remix-3) generate campaign or social output at volume. OCO's claim is exact reconstruction and intentional mutation, not generation quality or quantity.
- [C2PA 2.4](https://spec.c2pa.org/about/) is an open standard for certifying media source and history. OCO must not claim to replace it: C2PA addresses signed provenance; OCO addresses reconstruction of an editable cultural recipe.
- A 2026 study found X/Twitter's image CDN stripped C2PA credentials from the studied uploads. That does not prove every platform or upload strips them, but it supports keeping editable state in a separate carrier rather than relying only on image metadata. [arXiv:2604.25370](https://arxiv.org/abs/2604.25370)
- [Farcaster Mini Apps](https://miniapps.farcaster.xyz/) and [Solana Actions](https://solana.com/developers/guides/advanced/actions) show that useful crypto objects and actions can travel through links. They are possible distribution rails, not the core product.

## Recipe 0 — what exists now

The Studio currently understands this bounded fragment state:

| Field | Meaning | Boundary |
|---|---|---|
| `look` | Original Dasha render treatment | Enumerated, not arbitrary code |
| `format` | Post, story or banner dimensions | Enumerated |
| `line` | Maker-editable text | Maximum 120 characters |
| `arm` | Local Relay experiment variant | Experiment-only; not part of a future public object |

The browser does not send URL fragments in its HTTP request. That keeps recipe state out of ordinary server request logs, although the person sharing the full URL still discloses it to recipients and any client that reads the address.

Verified current behavior:

- fragment → exact editable Studio state;
- legacy query state normalizes into a fragment;
- PNG export;
- native share attempts PNG plus editable URL;
- X fallback saves the PNG and prepares the editable URL separately;
- post, story and banner round-trip through the same recipe.
- the separate Relay Lab parser accepts the same bounded grammar, normalizes it to `{v, renderer, look, format, line}`, semantically reconstructs all three formats and passes a fixed accept/reject corpus without importing Studio code.

That last check is a dual-implementation grammar smoke test, not proof of an open object or renderer interoperability. The Relay preview intentionally does not reproduce the Studio's pixels, so the independent-renderer requirement below remains open.

## OCO v0 — earned contract

Do not publish an OCO standard until all of these are true:

1. A short versioned schema documents canonical encoding and decoding.
2. Golden fixtures cover every field and at least two generations: parent → child → grandchild.
3. The recipe distinguishes optional source context from verified authorship, permission or endorsement.
4. A clean browser can reconstruct, edit and export the same-class recipe without an account or wallet.
5. A second independently implemented consumer passes the golden fixtures.
6. At least one realistic out-of-app social handoff preserves a usable recipe.

Minimum candidate fields after Relay proof:

| Field | Purpose |
|---|---|
| `v` | Schema version |
| `renderer` | Compatible renderer family and version |
| `look`, `format`, `line` | Minimal editable surface |
| `parent` | Optional URI of the directly remixed object |
| `source` | Optional context URI supplied by the maker |

No timestamp, wallet, signature, author identity, ownership claim or full edit log belongs in v0. Those add trust claims that current evidence does not justify. Parent means “this recipe points to that recipe,” not “this person owns, authored, licensed or approved either object.”

Every fragment is untrusted client input. An allowlisted look, format and line establish only that the syntax is understood; they do not establish integrity, provenance, authorship, consent, permission or authenticity. Unknown extra keys are ignored by the current smoke-test consumer rather than promoted into object meaning.

## What makes it crypto-native

The product borrows crypto's useful properties—forkability, composability, portable identifiers and independently verifiable contracts—without forcing the creative act onchain. `$dasha` remains the culture coin adjacent to the scene and discovery loop; it is not required to open, edit, export or prove lineage.

An honest product loop is:

```text
portable object creates attention → recipient enters Dasha → remixes or verifies the mint
                                                     ↘ optional Jupiter handoff
```

The object format must remain useful to somebody who never buys the coin. Purchase conversion comes from cultural affinity and repeated discovery, not a fabricated holder gate.

No schema vote, royalty, minting fee or `$dasha` payment belongs in the hypothesis. Those mechanisms become discussable only after independent adoption reveals a real coordination or settlement job; adding them earlier would turn a portable creative object into another tokenized-content bundle.

## Products this could unlock

Only observed behavior selects these layers:

| Observed behavior | Earned product |
|---|---|
| Multi-generation handoffs | Lineage viewer and fork tree |
| Outside community reuses fixtures | Portable Culture Kits |
| Recurring synchronous participation | Live Remix Rooms that export OCO objects |
| Repeated group assembly | Moment Capsules built from OCO objects |
| Recurring paid creative demand | Open Creative Briefs: a bounded brief, licensed starter object and editable fork submissions; selection and payment stay on existing rails |
| Meaningful Farcaster demand | Thin Mini App renderer/editor |
| Independent renderer adoption | Public schema repository and conformance fixtures |

## Ambitious extension — Culture Packages, not a registry

An object carries one render and its editable recipe. A **Culture Package** would carry a bounded set of objects plus the context needed to use them responsibly:

- human-readable overview and current source links;
- exact contract address and independent verification links when the package concerns a token;
- finished renders and reconstructable recipes;
- standard reuse terms linked to their authoritative text;
- optional campaign or moment context, explicitly labeled as publisher-supplied;
- a small machine-readable manifest containing the same facts, not a second hidden narrative.

This could become a useful supply unit for community members, designers and agents: open one package, understand the current source material, make a compatible artifact and pass the editable result onward. Dasha would be the reference package, not privileged infrastructure.

The package must compose with existing systems rather than pretend to replace them:

- [Solana token metadata](https://solana.com/docs/tokens/extensions/metadata) already supports names, symbols, URIs and off-chain JSON; a Culture Package is a creative/source bundle, not competing token identity metadata.
- [Creative Commons](https://creativecommons.org/share-your-work/cclicenses/) already supplies standard reuse licenses; the package links to a chosen license and does not invent legal terms.
- [C2PA](https://spec.c2pa.org/about/) addresses signed media provenance; a package does not become authentic merely because it contains a source field.
- [Story/Magma](https://help.magma.com/en/articles/11725885-licensing-feature-with-story-integration) and [ForkArt](https://forkart.app/) already address hosted licensing or lineage; the package hypothesis is portability outside one host.

Do not build a registry, package manager, signing service or custom `/.well-known/` endpoint now. [RFC 8615](https://datatracker.ietf.org/doc/rfc8615/) requires well-known suffixes to follow a registration process, and a new protocol has no adoption evidence. The first package can be ordinary static HTML/JSON or a ZIP served from a normal URL.

Hosting establishes only that a domain served the bytes. It does not prove control of a token mint, social account, underlying artwork or celebrity identity. Stronger control claims require explicit cross-linking or signatures from the relevant authority; even those would establish control relationships, not safety, value or endorsement.

Cheapest falsification: give one static package containing three looks, five seed recipes, one source URL and plain standard reuse terms to one outside community. Pass only if they publish from it and later reopen or edit a recipe without operator help. A download, compliment, agent parse or one-off operator delivery fails. Only after multiple independent packages and consumers exist is discovery/indexing a product question.

### Culture Package readiness

| Input | Current evidence | Status |
|---|---|---|
| Five procedural looks | `poster`, `ticket`, `print`, `marquee`, `signal` are drawn locally by the Studio | Ready as implementation; reuse rights not implied |
| Five editable seeds | Home carries exact look, format and line fragments for every look | Ready as Dasha project links |
| Mint and verification sources | Exact mint, public source post, Jupiter, Desk, Dexscreener, Solscan and Rugcheck are present | Ready as cited links; not proof of project control or safety |
| Desk code and original documentation | Covered by the nested `dasha-desk/LICENSE` | MIT within that subtree only |
| Studio looks, seed lines and marketing copy | No root license or recorded reuse grant exists | Not ready — no reuse terms chosen |
| Third-party portraits, social media and token imagery | Nested attribution explicitly excludes third-party media from the Desk MIT grant | Excluded unless separately cleared |
| Outside package recipient | No named outside community or agent team has requested or accepted a test | Not ready — no recipient evidence |
| Registry or discovery index | No independent packages or consumers exist | Out of scope |

Go only when both conditions exist: a recorded rights choice covering the exact original Studio material in scope, and a named outside recipient prepared to use it without operator coaching. Then build one static HTML or JSON-plus-README package, link to an existing standard license and exclude all unresolved media. Pass remains outside publication plus later uncoached recipe reuse. Downloads, compliments, successful parsing and operator-only delivery fail.

A narrower facts-only inventory becomes justified only if an outside consumer explicitly requests machine-readable mint/source/seed links while accepting that no asset reuse license is granted. Label that artifact an inventory, not a Culture Package, brand kit or proof of official control.

## Earned branch — Open Creative Briefs

This is an operating experiment, not a product yet. The exact job is: a community needs a reusable creative asset with clear scope and reuse terms; a creator needs a bounded starter they can fork into a paid editable deliverable without guessing at rights or beginning from zero.

Its only defensible distinction from Dework, Bountycaster, JokeRace, Magma and ForkArt is that the unit of work is **a licensed starter object whose editable fork is the submission**. If rights are renegotiated in DMs or submissions arrive only as flattened images, the branch collapses into an ordinary bounty board and should be dropped.

Cheapest test: run one real brief manually with one clean starter, short explicit reuse terms and existing communication and payment rails. Pass only if it yields at least three usable editable forks, one is adopted without re-briefing, no rights dispute follows, and the same buyer requests a second cycle without operator coaching. Kill it if interest is only compliments, submissions discard editability, delivery is no faster than an ordinary bounty, or rights are relitigated privately.

Do not build a marketplace, escrow, profiles, reputation, voting, contests, wallets, token gates or a collaboration editor for this test. `$dasha` may sponsor the culture around a brief, but it is not required to publish, submit, select, pay or license work.

## Fatal risks and kill rules

- **One-renderer trap:** if only Dasha can read the recipe, call it a Dasha project link—not an open object.
- **No relay behavior:** if fewer than two of ten real handoffs produce a non-operator second-generation edit, stop protocol work.
- **Carrier failure:** if realistic social hops strip, truncate or make recipes unusable, test one smaller carrier; do not build a hosted graph to conceal the failure.
- **False provenance:** never present parent/source fields as proof of identity, consent, licensing or truth.
- **“Git” overreach:** fork and parent are enough. Do not build branches, merges, conflict resolution or blame interfaces without observed need.
- **Economy before love:** no holder gates, rewards, marketplace, minting or onchain registry before people voluntarily remix.

## Next evidence step

Run the existing matched Relay experiment. The lab now also provides a second implementation of the current share grammar and a fixed adversarial corpus. This shows that another parser can interpret the bounded fields; it does not prove cultural portability. The decisive product observation is still not an export, parser result, click or compliment: it is a recipient reopening editable state, materially changing it, and passing a child onward. Pixel-compatible independent rendering and real relay demand both remain unproven; until they are observed, the current product is the Dasha Meme Studio and the ambitious horizon remains unearned.

## Permanent exclusion

Open Culture Objects is a creative remix format. It must never absorb, rename or recreate the permanently scrapped Thesis Card, receipt, prediction, settlement or forecasting products.
