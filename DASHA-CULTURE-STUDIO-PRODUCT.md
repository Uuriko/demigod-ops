---
status: canonical
canonical_for: culture-studio-product
title: Remixable Culture Studio — full product description
updated: 2026-08-11
related:
  - DASHA-PRODUCT-BRIEF.md
  - DASHA-CLAIMS.md
  - DASHA-OPEN-SOURCE.md
  - DASHA-TRANSMISSION-001.md
  - DASHA-DOCS.md
---

# Remixable Culture Studio

## Full product description — factory, growth, and social

**Working names:** Remixable Culture Studio (RCS) · Dasha Culture Factory · Open Culture Studio  
**Live reference:** `https://www.getdasha.com/studio` (and successors)  
**Positioning line:**

> The open studio for culture that stays editable — make it, ship it, hand it off, remix it, without killing it as a flat PNG. Growth by culture travel; social by remix and ritual — never by bags, bots, or buy-to-rank.

**Public loop alignment:** Make → Play → Buy (buy optional, never a gate).  
**Claims posture:** narrowest wording only — see `DASHA-CLAIMS.md`. No price promises, no implied endorsement, no points for buys/likes/bags.

---

# Part I — Vision and positioning

## 1. Vision

### 1.1 The problem

Internet culture dies in the wrong format.

- Creators ship **flattened images**. Recipients cannot change the line, look, or layout without starting over.
- “Meme generators” are **caption-on-template** toys (Imgflip/Canva class): fast, disposable, no lineage, no rights model, no season grammar.
- Community tools (Zealy/Galxe class) reward **tasks and XP**, not **material creative work**.
- Creator-economy operators (Ansem-class CT, culture coins, fandoms) need a **daily content factory** and a **cult co-creation loop**, not another trading terminal.
- AI tools generate more sludge; almost nothing gives **honest handoff**, **remix truth**, and **rights clarity**.
- Growth systems usually optimize **spam vectors** (invite farms, engagement pods, bag-weighted status) that destroy trust brands like Dasha.

### 1.2 The bet

If culture objects are **first-class, remixable, portable, and rights-honest**, then:

1. More people **make** (not only consume).
2. More people **pass editable state** (not only screenshots).
3. Seasons, boards, and communities can score **real mutation**, not engagement farming.
4. Growth compounds through **artifacts that travel** (exports, remix links, embeds, packs).
5. Social density forms around **objects and rituals**, not around bags.
6. getdasha.com (and any forked brand) becomes the **reference civilization** for that stack.
7. `$dasha` stays **optional, honest, adjacent** — never the gate to create.

### 1.3 Product thesis

**Remixable Culture Studio** is an open, browser-first (and embeddable) creative system for producing **culture objects**: a finished render **plus** the full editable DNA (look, format, line, media, effects, parent, season, rights). It includes a **growth layer** (how objects spread and return) and a **social layer** (how people gather around objects and seasons). It is built for Solana/CT culture speed, creator brands, fandoms, and campaigns — with a path to a public **Open Culture Object (OCO)** standard so other clients can open the same artifacts.

It is not a generic design suite, not a quest board, not a social network clone, and not a wallet app.

### 1.4 Success definition

- A stranger makes something they are proud to post in **under two minutes**.
- A stranger receives a link, **changes one thing**, and re-exports without a tutorial.
- A third party can open a published OCO fixture in a **second client** (interop ambition).
- Theme packs and looks arrive as **community PRs**, not only operator drops.
- Seasons and boards **plug in** without rewriting the factory.
- Growth is visible in **remix rate and return**, not vanity follower counts.
- Social features increase **co-creation**, not sludge.

### 1.5 System map

```
STUDIO (factory)     → culture objects (render + editable DNA)
GROWTH tools         → spread objects + measure honest loops
SOCIAL tools         → people meet around objects & seasons
BOARD / SEASONS      → recognition & ritual on top (connectors)
DESK / MINT          → honest optional buy (never gates create)
```

**Studio without growth/social** = quiet tool.  
**Growth/social without Studio** = empty Zealy.  
**Together** = culture OS.

---

# Part II — Audience

## 2. Who it’s for

### 2.1 Primary users

| Persona | Need | How Studio serves them |
|---------|------|------------------------|
| **Dasha participant** | Fun reason to create, return, share | Default art system, Transmission starters, site mark, optional Board path |
| **CT / Ansem-class creator** | Daily media volume + brand consistency | Packs, formats, cards, batch export, brand kits, campaign `src=` |
| **Culture-coin / fandom operator** | Co-creation without Zealy sludge | Theme packs, seasons hooks, Relay-valid entries, honor rolls |
| **Remixer** | Continue someone else’s work | Load from URL/OCO, one-field edit, re-share with parent |
| **Open-source contributor** | Clear, visual PRs | New looks, packs, tests, docs; optional honest OSS points |

### 2.2 Secondary users

- Campaigns needing rapid social cards with on-brand constraints
- Communities running bounded creative rituals
- Developers embedding a culture factory in their own site

### 2.3 Explicit non-users (v1 positioning)

- Teams needing full Figma-class multiplayer design systems as day-one requirement
- Users seeking AI engagement bots or auto-shill
- Users wanting bag-weighted leaderboards as the product

### 2.4 Ansem-class dual use (same tools, different packs)

| Job | Tool |
|-----|------|
| Daily content volume | Studio + batch + brand pack |
| Fan remix army | Starters + remix links + duet gallery |
| Cult moments | Seasons + honor roll + lobby |
| Status without pure bag LOLs | Cards/badges for creative work |
| Creator-coin narrative clarity | Honesty desk hooks + claim tools |
| Not quest hell | No Zealy clone |

---

# Part III — Core concepts

## 3. Concepts

### 3.1 Culture object (Open Culture Object — OCO)

A culture object is **not** “an image.” It is a package:

| Layer | Contents |
|-------|----------|
| **Render** | PNG / GIF / optional video still — what you post |
| **State** | Full editable DNA (see §4) |
| **Identity** | Content-addressed ids; stable object id across remixes of lineage |
| **Lineage** | Optional parent snapshot (immediate parent; chain view available) |
| **Provenance lite** | Created-at, tool version, pack ids, season id, `src` campaign tag |
| **Rights** | Machine-readable grant + carve-outs (CC0 where true; likeness/media exceptions) |
| **Claims** | Optional human-readable disclaimer block (no price promises) |

**Principle:** The render is a **projection** of state. State is the source of truth.

### 3.2 Remix

A remix is a **material change** to state that produces a new object, optionally with parent pointer.

**Not a remix:** re-encoding the same PNG, cropping for screenshot, pure reshare.

### 3.3 Pack

A **versioned theme package**: looks, palettes, fonts (where licensed), stickers, starter lines, format presets, export chrome, rights notes.

Dasha ships the reference pack. Others ship their own (creator brand pack, fandom pack, season pack).

### 3.4 Season hook

Studio does not replace Season OS; it **emits** objects that seasons can require (starter id, incompleteness rules, Relay validity).

### 3.5 Growth vector

Every export is a **distribution unit**: render + remix link + optional mark + optional `src=`. Growth is a property of objects, not a separate spam channel.

### 3.6 Social atom

The social unit is the **object** (and secondarily the **season**), not the follower edge. Follow graphs are optional sugar around object streams.

### 3.7 Honesty posture

- No wallet required to create.
- No points for buying, holding, liking, or raw referral clicks by default.
- No implied endorsement by real people via likeness.
- Site mark / “made with” optional but default-on for reference builds.
- `$dasha` / any mint appears only in optional verify/buy surfaces — never as a gate.

---

# Part IV — Editable state model (the DNA)

## 4. State fields

Every live project in the Studio is a structured document.

### 4.1 Identity and meta

- `schemaVersion`
- `objectId` / `revisionId`
- `createdAt` / `modifiedAt`
- `tool` `{ name, version }`
- `packId` / `packVersion`
- `locale`
- `title` (optional, human)
- `notes` (private to maker, never exported by default)

### 4.2 Format

- `format`: `post` (1:1) · `story` (9:16) · `banner` (wide) · `card` (profile/score) · extensible
- `width` / `height` / `safeAreas`
- `exportPresets[]` (platform targets: X, IG story, Telegram, etc.)

### 4.3 Look (visual system)

- `lookId` (procedural or asset-backed look)
- `palette` overrides
- `background` (solid, gradient, image, procedural)
- `frame` / `chrome` (borders, tickets, stamps)
- `texture` / `noise` / `grain`
- `motion` (for GIF: loop length, easing, keyframes)
- `intensity` / `mood` sliders where looks support them

### 4.4 Line (text system)

- `line` primary copy
- `subline` optional
- `textStyle` (preset + fine controls: size, weight, tracking, case, align, stroke, shadow)
- `textBlocks[]` for multi-zone layouts
- `placeholders` for season starters (“___ was the alibi”)
- `maxLength` / `profanityPolicy` (configurable per pack)
- `typographyScale` responsive to format

### 4.5 Media

- `galleryRef` (registered media id from pack/operator gallery)
- `upload` (local blob → export-time bake; never required server-side)
- `crop` / `focusPoint` / `filters`
- `stickers[]` / `stamps[]` (position, scale, rotation, opacity)
- `effects[]` (glitch, blur, duotone, ticket punch, etc.)
- **Likeness flags** on assets that depict real people

### 4.6 Composition

- `layoutId` (template within format)
- `layers[]` ordered, toggleable, lockable
- `guides` / `snap`
- `margin` / `bleed` for print-ish capsules

### 4.7 Lineage and campaign

- `parent` `{ objectId, revisionId, stateHash, renderHash }` — **state ancestry, not authorship proof**
- `rootObjectId` for lineage views
- `src` allowlisted campaign tags (`transmission-001`, partner drop ids, etc.)
- `seasonId` / `promptId`
- `materialChange` summary (computed): which fields differ from parent

### 4.8 Rights and export policy

- `license` (e.g. CC0 for original drawings where true)
- `carveOuts[]` (name/likeness; third-party uploads keep own rights)
- `attributionRequired`
- `commercialUse`
- `exportMark` (getdasha.com / pack brand / none)
- `disclaimers[]`

### 4.9 Privacy and safety

- `visibility` draft vs shareable
- `stripExif` default true on upload bake
- `allowAISuggest` opt-in
- `moderationFlags` local heuristics

### 4.10 Portability

- **URL fragment** (primary): full state in `#oco=...` or compressed binary in fragment (not sent to server as query)
- **Legacy query** normalize-on-load
- **File**: `.oco.json` / `.oco` bundle (state + optional embeds)
- **Clipboard**: copy link / copy state
- **QR**: deep link to remix

---

# Part V — Factory features (make)

## 5. Feature pillars — creation

### 5.1 Instant make (time-to-wow)

**Goal:** proud export in under two minutes, first-run.

- **Zero account / zero wallet** create path
- **One-tap starters**: blank, pack random, season starter, “remix trending fixture”
- **Smart defaults**: format = post; look + line prefilled from pack
- **Undo / redo** deep stack; “revert to last export”
- **Autosave** to localStorage + optional file download
- **Crash recovery** of last draft
- **Mobile-first** touch targets; desktop power (keyboard, panels)
- **Onboarding that is optional**: short coach marks, skip forever
- **Performance budget**: first interactive paint fast on mid mobile; no multi-MB block for hello world

### 5.2 Looks system (art direction as product)

- **Procedural looks** (shader/CSS/canvas recipes) + **asset looks**
- **Look browser** with search, tags (mood, contrast, season, brand-safe)
- **Look parameters** exposed as sliders (not black boxes)
- **Favorites** and recents
- **A/B pair mode**: same line, two looks, export both
- **Contrast-safe text** helpers (warn when line fails AA on background)
- **Print-adjacent** high-res export modes for capsules/zines
- **Dark/light** pack variants
- **Contributor pipeline**: look = folder + manifest + preview + tests

### 5.3 Formats and layouts

- **Post (1:1)** — default CT/X
- **Story (9:16)** — IG/TikTok/Telegram
- **Banner (wide)** — headers, spaces, sites
- **Score / identity card** — personal rank card, season badge card
- **Thread card** — multi-panel export (1/n, 2/n…)
- **Quote card** — line-forward layout for text hits
- **Ticket / stub** — Transmission/alibi aesthetic
- **Custom format** via pack (width/height + safe area)
- **Format lock** during season (starter forces story-only, etc.)
- **One-click “same state, all formats”** — prepare post + story + banner together
- **Platform export presets** (safe margins for X crop quirks, etc.)

### 5.4 Line and typography

- **Primary line** with live canvas preview
- **Multi-block text** for complex layouts
- **Voice presets** per pack (Dasha voice, neutral, loud CT, quiet literary)
- **Character/word limits** with gentle, non-shaming UI
- **Template slots** for incomplete starters
- **Typography pairings** licensed for pack or system fonts only
- **Text-on-path / stamps** where art direction allows
- **RTL / basic i18n** readiness
- **Paste plain text** sanitization
- **No auto-hashtag spam** insertion

### 5.5 Media: gallery, upload, stickers

- **Registered gallery** of pack/operator media with rights metadata
- **Local upload** processed in-browser; bake into export; optional never leave device
- **Smart crop** with focus point
- **Stickers / props** library (pack-scoped)
- **Layer order** and opacity
- **Replace media keep composition**
- **Duplicate as new object**
- **Strip metadata** on bake
- **Likeness gate**: assets flagged as real-person require explicit “I understand carve-out” before commercial-looking export chrome
- **No silent training-upload** of user media to random APIs

### 5.6 Effects, motion, GIF

- **Static effects**: grain, halftone, glitch, duotone, blur, chromatic, ticket punch, stamp
- **Motion (GIF / short loop)**: Ken Burns, text enter/exit, look-native loops, frame budget controls
- **Export GIF and still** from same state
- **Preview at target FPS**
- **Reduce motion** accessibility mode (static fallback)

### 5.7 Remix and handoff (the moat)

- **Share remix link** (fragment state) + **PNG/GIF** together (native share where possible)
- **X intent fallback**: save image + open intent with editable URL in text
- **Open link → exact rehydrate** (look, format, line, media refs)
- **“Remix” CTA** always visible on loaded shared objects
- **One-field remix mode**: change only line / only look / only format (teaching material change)
- **Parent banner**: “From a prior version” with open parent (no claim of who made it)
- **Lineage drawer**: root → … → current (state ancestry)
- **Diff view**: highlight fields changed vs parent
- **Material change score** (for seasons/Relay): boolean + structured diff
- **Fork without parent** option (clean break)
- **Compress state** for URL length; graceful “state too large → download .oco”
- **Legacy URL normalizer** for old query links
- **QR remix** for IRL / stories

### 5.8 Open Culture Object (OCO) standard features

- **Publish OCO** (JSON + optional assets)
- **Validate OCO** (schema, rights, pack resolution)
- **Fixture suite** (golden files for CI and second clients)
- **Canonical hash** of state
- **Import OCO file / URL**
- **Round-trip tests**: export → import → pixel/state parity within tolerance
- **Version negotiation**: newer studio opens older objects; older clients show upgrade path
- **Public registry optional**: pack ids resolve to URLs (https/IPFS)
- **Second-client readiness**: documented minimal viewer/editor API

### 5.9 Remix Relay (built-in + exportable)

Native capability (not a hollow separate product at start):

- **Relay check** any two objects (or object vs starter): material edit, editable handoff, campaign/season constraints, safety flags
- **Relay badge** on export optional (“Relay-valid vs starter X”)
- **CLI / library** `relay-check` for seasons and bots
- **Honest language**: Relay ≠ proof of human skill, originality, or non-AI

### 5.10 Packs and brand systems

- **Pack manifest**: id, version, license, looks, media, stickers, layouts, voice, disclaimers
- **Hot-swap packs** without losing line
- **Dasha reference pack** (canonical)
- **Blank/neutral pack** for forks
- **Creator brand pack template** (colors, marks, disclaimers, fonts)
- **Season pack** (time-boxed looks + forced starters)
- **Pack preview page** (web)
- **Pack signing optional** (integrity of official packs)
- **Community pack PR template** + visual regression tests
- **Pack sandbox**: try untrusted pack with permissions (no network, no exfil)

### 5.11 Rights, likeness, license UX

- **Always-visible rights strip** on export settings
- **CC0 / MIT / custom** for original procedural output where true
- **Carve-outs** explicit: real person name/likeness; gallery photos; user uploads
- **Per-asset rights inspector**
- **Export blocked or watermarked** when policy violated (configurable)
- **Generated LICENSE snippet** per export batch
- **No “endorsed by [person]”** chrome ever
- **Contributor guide** for adding media legally

### 5.12 Share and publish (factory side)

- **Download PNG / GIF / .oco**
- **Copy remix link**
- **Native Web Share** (file + url when supported)
- **Share sheet presets**: X, download-only, embed
- **Open Graph preview** via optional intermediate pages when fragment-only links need previews
- **Short-link service (optional operator)**: stores state server-side for short URLs — **must** be documented as non-canonical vs pure fragment portability
- **Watermark / site mark**: getdasha.com or pack brand; position/opacity; off for white-label forks
- **No silent posting** as the user
- **Batch export zip** for high-volume creator days
- **Content calendar stub**: save named drafts

### 5.13 Seasons and Transmission integration

Studio is the **instrument**; seasons are the **ritual**:

- **Load season starter** (incomplete by design)
- **Hard constraints** from season: format, required fields, banned fields, min material change
- **Submission package**: render + OCO + Relay report + parent + timestamps
- **Ack surface** is season’s job; Studio emits **submission id payload**
- **Operator example mode**: flag exports as non-counting
- **Closing zine import**: multi-object select → capsule layout

### 5.14 Recognition and Board hooks (optional)

- **Export score card** layouts from Board data (read-only consumer)
- **Emit creative event** webhook: `object.created`, `object.remixed` (for honest scorers)
- **Never** auto-enroll Board from create
- **Badge render** from earned badge ids
- **OSS contributor card** if GitHub-linked elsewhere

### 5.15 AI features (optional, policy-bound, vibe-safe)

AI is **assistive**, never the product’s soul:

- **Line suggestions** (local model or user-supplied API key)
- **Look suggestions** from mood words
- **Alibi / Transmission fillers** for incomplete starters
- **Alt text generator** for accessibility on export
- **Hard policy engine**:
  - cannot auto-post
  - cannot promise returns/prices
  - cannot generate disallowed likeness claims
  - cannot bypass season constraints
- **Show AI provenance** on state: `assistedBy: { role, model }`
- **One-click strip AI suggestions** and keep only committed human edits
- **Offline path** without AI always works

### 5.16 Accessibility and inclusion

- Keyboard-complete editing
- Screen reader labels for controls
- Focus visible; skip links in shell
- Reduced motion
- Contrast warnings
- Text resize without breaking layout (within reason)
- Language packs for UI
- Color-blind-safe look tags

### 5.17 Collaboration (ambitious, phased)

**v1:** single-player excellence.

**Best later:**

- **Async collab**: pass OCO like a file (already works via remix links)
- **Live multiplayer** (optional CRDT room) for zine nights
- **Comment pins** on layers for operators
- **Role**: maker vs approver for brand packs

### 5.18 Embeds and platform SDK

- **`studio-embed.js`** thin loader with **SRI**
- **iframe / web component** modes
- **Config**: pack, season, format lock, mark, callbacks
- **Events**: `ready`, `export`, `remix`, `relay`
- **Headless render** (server or worker) for cards at scale — careful with rights
- **React/Svelte/Vue wrappers**
- **WordPress/Webflow** embed snippets
- **CSP documentation**

### 5.19 Developer and OSS surface

- **Packages** (illustrative):
  - `@dasha/oco-schema`
  - `@dasha/oco-validate`
  - `@dasha/relay`
  - `@dasha/studio-core`
  - `@dasha/packs-dasha`
  - `@dasha/embed`
  - `@dasha/share-card`
  - `@dasha/campaign-analytics` (privacy-first aggregates)
- **MIT/Apache** for code; packs may differ
- **CONTRIBUTING**: good first issues for looks, docs, a11y
- **Visual regression CI** for looks
- **Playwright smoke**: load → edit line → export
- **Fixture corpus** public
- **Architecture docs** + state machine diagram
- **Changelog / semver**
- **Code of conduct** + **security policy**

### 5.20 Operator / multi-tenant

- **Brand workspace**: packs, marks, disclaimers, domains
- **Season console** (light): create starter, lock rules, export submissions
- **Moderation queue** for gallery submissions (if enabled)
- **Feature flags**
- **Custom domain embed**
- **White-label**: remove Dasha mark, keep engine

### 5.21 Quality, trust, anti-sludge (factory)

- **Rate limits** on public short-link APIs if any
- **Client-side moderation** lists optional
- **Duplicate detection** vs parent (near-identical warning)
- **Export checklist**: rights OK, contrast OK, season OK, Relay OK
- **Claim linter** on any text that looks like price/return/endorsement
- **Honest empty states**

### 5.22 Performance and technical excellence

- **Local-first** editing
- **Web workers** for encode/GIF
- **WASM** where encode benefits
- **Lazy load** looks
- **Tree-shaken** embeds
- **Offline shell** (PWA optional)
- **Deterministic renders** where possible (tests)
- **Memory caps** on huge uploads
- **SRI + pin discipline** documented from live ship lessons

---

# Part VI — Growth tools and features

## 6. Growth model

### 6.1 What growth means here

| Loop | Meaning |
|------|---------|
| **Make** | More exports, more remix links |
| **Spread** | Artifacts leave the site (X, chats, embeds) |
| **Return** | Open link → remix → re-export |
| **Belong** | Seasons, lobby, board (opt-in) |
| **Buy** | Verify mint / Jupiter — never forced |

### 6.2 Honest growth metrics

**Track:**

- Distinct makers
- Remix rate (opens that re-export)
- Editable-link survival
- Season completions + return next season
- Organic mentions / unprompted shares
- Campaign `src=` funnels (aggregate)
- Time-to-first-export
- Multi-format export rate
- Pack diversity (non-default look share)

**Do not optimize as north stars:**

- Bought followers
- Bag-weighted ranks
- Like-farms
- Points for invite spam
- Fake activity counters

---

## 7. Growth feature set

### 7.1 Artifact-native growth (highest leverage)

The content is the ad.

| Feature | What it does | Why it grows Dasha |
|---------|--------------|-------------------|
| **Remix links on every export** | PNG + editable URL always travel together | Recipients become makers |
| **Site mark / “made with”** | Small getdasha.com (or pack) mark | Attribution without paywall |
| **Multi-format pack export** | Post + story + banner from one state | More surface area per make |
| **Share cards** | Score cards, season cards, “I remixed” cards | Identity flex that points home |
| **Starter drops** | Incomplete public starters (Transmission-class) | One post → many remixes |
| **Relay badge** | “Material remix of starter X” | Status for real work, not spam |
| **OG / preview pages** | Smart landing when links need HTTP preview | Fix fragment-link preview gap |
| **Embed Studio** | Other sites host the factory | Distribution without ads |
| **Theme pack drops** | New looks = news + reasons to return | Cadence growth |
| **Thread builder** | Multi-card 1/n export | CT-native distribution |
| **Quote-card mode** | Line-forward layouts | Text hits that still carry remix URL |

### 7.2 Acquisition tools

| Feature | Role | Vibe check |
|---------|------|------------|
| **Season calendar** | Public schedule of creative rituals | High — cultural, not airdrop |
| **Campaign `src=` tags** | Attribute opens/exports to a post or partner | High — analytics, not points-for-spam |
| **Partner pack program** | Creator brands ship packs on the engine | High — their audience makes on your stack |
| **Embed contest** | “Best pack” / “best look” OSS + social | High |
| **Challenge codes** | Time-boxed starters unlocked by phrase/QR | High |
| **Connector / invite (careful)** | Opt-in, capped; scores **activation + creative**, not clicks | Only if abuse-proof; never bag/buy |
| **Listing / directory presence** | Dex, directories, “tools for culture coins” | Medium — honesty kit helps |
| **Short links** | Operator short URLs for big campaigns | Medium — document non-portability |
| **IRL QR kits** | Meetup cards → remix | High for local culture |

### 7.3 Activation and retention

| Feature | What it does |
|---------|----------------|
| **First-export checklist** | “Edit line → switch format → copy remix link” |
| **Remix of the day** | Featured object to continue |
| **Return hooks without scam streaks** | “New pack” / “new season” — avoid dark-pattern guilt streaks |
| **Drafts and collections** | Come back to unfinished work |
| **Opt-in digest** | New packs, season open/close — no shill blasts |
| **Progression without pay-to-win** | Badges for *exports, remixes, season entries, OSS merges* only |
| **Personal museum** | Public page of your objects (opt-in) — portable portfolio |
| **Empty-state invitations** | Strong default canvas, not a login wall |

### 7.4 Conversion tools (Buy — honest interest only)

| Feature | Notes |
|---------|--------|
| **Mint adjacent every culture surface** | Never blocking create |
| **One Jupiter path + verify** | Desk DNA |
| **Claim linter on campaign copy** | Growth without lying |
| **“How this works” desk** | Trust increases voluntary buy |
| **No discount-for-post** | Keeps claims clean |
| **No create-gate on wallet** | Non-negotiable |

### 7.5 Growth analytics (privacy-first)

Aggregate only unless user opts into identity:

- Exports, remix opens, re-exports, format mix, pack mix
- Funnel: land → edit → export → copy link
- Season: start → submit → return
- Campaign attribution via `src=`
- Mobile vs desktop success rates
- **No** fingerprint dox dashboards sold as “growth hacking”
- **No** selling user creative content as training data by default

### 7.6 Operator growth console

For Dasha ops and white-label creators:

- Drop starter + track `src`
- Feature objects editorially (label editorial)
- Moderate gallery
- Export season submissions
- Pack release notes
- Alert: “remix rate down after UI change”
- Partner pack approvals
- Embed key / domain allowlists

### 7.7 Growth loops (designed products)

**Loop A — Viral remix (core)**  
`Starter post → many remix links → secondary posts → new makers land on Studio`  
Tools: starters, remix URLs, Relay, marks, multi-format.

**Loop B — Season ritual**  
`Announce season → make under constraints → public gallery → ack → next season`  
Tools: season runner, submission package, honor roll, lobby mode.

**Loop C — Status without bags**  
`Make/remix/OSS → badges/cards → share card → curiosity → site`  
Tools: honest board, score cards, museum profiles.

**Loop D — Creator-economy partners**  
`Brand pack → their audience makes → objects carry engine mark → Dasha gravity`  
Tools: white-label packs, embeds, brand workspace.

**Loop E — OSS contributors**  
`Good first look PR → merge → optional Board points → GitHub social proof`  
Tools: pack PR templates, visual CI, scorer.

**Loop F — Honest conversion**  
`Trust surfaces + culture fun → voluntary verify/buy`  
Tools: desk, mint, claim linter — never gate Loops A–E.

### 7.8 Growth anti-patterns (refuse)

| Anti-pattern | Why |
|--------------|-----|
| Points for follows, likes, RTs | Farms sludge; kills honesty brand |
| Points for buys/bags | Claims + vibe death |
| Invite spam leaderboards | Sybil + annoyance |
| Fake activity / bots | Trust death |
| Engagement pods tooling | Same |
| “Boost if you hold” | Pay-to-win social |
| Dark-pattern hard gates (login to see) | Kills make loop |
| Shill-agent auto-post | Opposite of culture |
| Bought stars as success metric | Vanity without use |

---

# Part VII — Social tools and features

## 8. Social model

### 8.1 Principle

Dasha should **not** become a full social network. It should be **social around objects and seasons**.

- **Social atom** = culture object  
- **Social ritual** = season / Transmission  
- **Social status** = creative work and OSS, disclosed editorial rows only  
- **Social login** = optional enhancement, never required to create  

### 8.2 Social graph (lightweight)

| Feature | Description |
|---------|-------------|
| **Object comments (optional)** | On public objects — rate-limited, mod tools |
| **Reactions (limited set)** | e.g. remix / fire / alibi — **not** a like-farm currency for rank |
| **Follow makers (opt-in)** | Feed of *new objects*, not bag flex |
| **Remix graph** | See children of an object; “family tree” of a meme |
| **From-chain** | Always one tap to parent |
| **Duet / parallel remix** | Same starter, side-by-side gallery |
| **Collab zine room** | Time-boxed multi-maker capsule (social make) |

### 8.3 Lobby and presence

| Feature | Description |
|---------|-------------|
| **Public lobby** | One moderated room (product DNA) |
| **Season lobby mode** | Chat tied to active Transmission |
| **Object drops in lobby** | Paste remix link → preview card |
| **Spaces companion kit** | Share-card pack for live audio (not hosting the Space itself) |
| **Presence without creep** | “N makers online” aggregate, not stalker maps |

### 8.4 Social identity

| Feature | Description |
|---------|-------------|
| **Opt-in profiles** | Handle, bio, museum of objects |
| **X link** | Explicit join (quiz/board path stays carefully gated) |
| **Badges** | Creative / season / OSS only |
| **Score cards** | Shareable PNGs — recognition, not financial flex |
| **No mandatory social login to create** | Critical |
| **Leave / delete profile** | Explicit; removes public claims |

### 8.5 Social proof (honest)

| Feature | Description |
|---------|-------------|
| **Featured remixes** | Editorial, labeled editorial |
| **Season roll of honor** | Distinct makers, not top bags |
| **“Remixed N times”** | Object-level, transparent |
| **Founding / operator rows** | Disclosed non-measured |
| **Never** fake counters, bought followers, simulated activity |

### 8.6 Social distribution helpers

| Feature | Description |
|---------|-------------|
| **Compose for X** | Image + text + remix URL ready |
| **Thread builder** | Multi-card export 1/n… |
| **Quote-card mode** | Line-forward for CT text hits |
| **Context strip** | Optional “this is a remix of starter…” |
| **Tag pack / season** | Discoverability inside product |

### 8.7 Group and community social

| Feature | Description |
|---------|-------------|
| **Crews / houses (light)** | Named groups for seasons — optional |
| **Pack clubs** | People maintaining a pack together (OSS social) |
| **Local chapters** | IRL meetup card templates + QR remix |
| **Capsule parties** | Timed multiplayer make → one zine |

### 8.8 Social moderation and safety

- Rate limits on comments, reactions, lobby posts
- Report / block flows
- Operator mod queue
- Auto-hide obvious spam patterns
- No shadow rank manipulation
- Transparent rules page
- Season operator separation (who may ack, who may feature)

### 8.9 Social anti-patterns (refuse)

- Full Facebook-style feed as the home experience
- Endless scroll engagement maximization as the goal
- Ranking by followers, bags, or paid boosts
- Mandatory identity to view public objects
- DM spam tooling
- Social graph export sold to advertisers as core business

---

# Part VIII — Journeys

## 9. Primary user journeys

### 9.1 First-time maker (Dasha)

1. Land on Studio.  
2. See a strong default look + invitation line.  
3. Edit line once.  
4. Switch format to story.  
5. Export PNG + copy remix link.  
6. Share to X.  
7. Optional: later open Board / season — never forced.

### 9.2 Remixer

1. Click someone’s remix URL.  
2. Exact state loads.  
3. “Remix” → change look only.  
4. Diff shows material change.  
5. Export with parent set.  
6. Relay-valid if season requires.  
7. Optional: appear in duet gallery / remix graph.

### 9.3 Ansem-class content day

1. Load personal brand pack.  
2. Paste call notes into line.  
3. Generate 3 looks × 2 formats.  
4. Batch export zip + links.  
5. Post with `src=` campaign if tracking.  
6. Community remixes with parent chain.

### 9.4 Season participant (Transmission-class)

1. Open official incomplete starter.  
2. Complete required slots.  
3. Must change at least one of look/format/line per rules.  
4. Submit package (render + OCO + Relay).  
5. Await ack outside Studio.  
6. Appear on honor roll if valid.

### 9.5 Social maker (museum + follow)

1. Opt into profile.  
2. Museum fills from exports.  
3. Others follow for new objects only.  
4. Share score card after season — not bag card.

### 9.6 OSS contributor

1. Fork repo.  
2. Add look via template.  
3. `npm test` visual + unit.  
4. PR with preview.  
5. Merged → optional honest Board OSS points if allowlisted.

### 9.7 White-label operator

1. Clone engine or use embed.  
2. Ship pack + mark + disclaimers.  
3. Embed on own domain.  
4. Run own season using same object format.  
5. Growth console tracks `src=` and remix rate.

### 9.8 Growth operator (Dasha)

1. Ship new pack or season starter.  
2. Announce with campaign `src=`.  
3. Feature early remixes (labeled).  
4. Watch remix rate and time-to-export.  
5. Close season with honor roll + capsule.  
6. Desk/mint remains optional side door.

---

# Part IX — Surfaces and UI

## 10. UI architecture

### 10.1 Main chrome (factory)

- **Canvas** center (the truth)
- **Left**: packs / looks / media / stickers
- **Right**: line, format, effects, rights, export
- **Top**: undo, remix link, season chip, help
- **Bottom mobile**: primary actions (edit line, looks, export)

### 10.2 Modes

- **Compose**
- **Remix (guided)**
- **Diff**
- **Export**
- **Inspect (state JSON)** power user
- **Museum / profile** (social)
- **Remix graph** (social)
- **Season** entry (when active)

### 10.3 Growth/social chrome (site-level)

- Home rail: featured remixes, active season, remix of the day
- Studio footer: mark, rights, optional mint link (never blocking)
- Lobby: object preview cards
- Board: opt-in only; score cards export back through Studio layouts

### 10.4 Empty / error honesty

- Pack failed to load → why
- State too large for URL → download OCO
- Look missing in pack version → closest fallback + warn
- Season closed → still allow local remix, block submit

---

# Part X — Non-goals

## 11. Non-goals (keep the product sharp)

- Full multiplayer Figma replacement as day-one requirement
- Wallet connect, swap, sniper, portfolio as Studio features
- Points for buys, bags, likes, follows
- Auto-posting, engagement pods, shill agents
- Guaranteeing virality or returns
- Claiming endorsement by real people
- Being the entire Season OS or Board in v1 (integrate, don’t sprawl)
- Training foundation models on private uploads by default
- Becoming a generic quest platform
- Ranking humans by wealth or follower count
- Dark-pattern growth (forced login, fake urgency, deceptive counters)

---

# Part XI — Competition and differentiation

## 12. Differentiation

| Alternative | They optimize | We optimize |
|-------------|---------------|-------------|
| Canva / Imgflip | Templates + captions | **Remixable state + lineage + packs + rights** |
| memegen OSS | URL→image API | **Full culture object + studio UX + seasons** |
| Zealy / Galxe | Quests + XP | **Creative material work + honest recognition** |
| Generic AI meme apps | Prompt→sludge | **Human commit + optional assist + policy** |
| Trading terminals | Charts | **Culture manufacturing** (complement, not compete) |
| Full social networks | Feed engagement | **Object- and season-centric social** |

---

# Part XII — Metrics

## 13. Metrics

### 13.1 Product (privacy-first aggregates)

- Time-to-first-export
- % exports with remix link copied
- Remix open rate / re-export rate
- Editable-link survival (season instrumentation or surveys)
- Multi-format export rate
- Pack diversity (non-default look share)
- Season Relay-valid rate (when used)
- Mobile export success rate
- Return within 7 days after first export
- Partner pack export share

### 13.2 Social

- Opt-in profile rate (among exporters)
- Remix graph depth (median children per starter)
- Duet gallery participation
- Honor roll distinct makers per season
- Lobby object-drop rate
- Report rate (moderation health)

### 13.3 OSS

- Unique monthly contributors
- Look/pack PRs merged
- Downstream embeds
- Fixture second-client pass

### 13.4 Explicitly not vanity north stars

- Stars alone
- Raw bot traffic
- Follower counts
- Invite counts without activation

---

# Part XIII — Architecture

## 14. Architecture sketch

```
┌──────────────────────────────────────────────────────────┐
│  Studio Shell (UI)                                         │
│  compose / remix / diff / export / museum / graph hooks    │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│  studio-core                                               │
│  state store, history, constraints                         │
│  layout engine, text, media, effects                       │
│  renderers: canvas2d / webgl / svg                         │
└───────────────┬─────────────────────┬──────────────────────┘
                │                     │
       ┌────────▼────────┐   ┌────────▼────────┐
       │ oco-schema      │   │ relay-lib       │
       │ oco-validate    │   │ material diff   │
       └────────┬────────┘   └────────┬────────┘
                │                     │
       ┌────────▼─────────────────────▼────────┐
       │ packs-*  ·  share-card  ·  embed      │
       └────────┬─────────────────────┬────────┘
                │                     │
       ┌────────▼────────┐   ┌────────▼────────┐
       │ growth: src=    │   │ social: museum  │
       │ analytics agg.  │   │ graph, lobby    │
       └────────┬────────┘   └────────┬────────┘
                │                     │
                └──────────┬──────────┘
                           ▼
              getdasha.com · embeds · white-label hosts
                           │
              seasons · board · desk/mint (connectors)
```

**Principles:** local-first; pack sandbox; deterministic tests; thin live clients with integrity pins; privacy-first growth analytics; social never required to create.

---

# Part XIV — Phased delivery

## 15. Phases (ambition intact; start sharp)

### Phase A — Undeniable factory (start)

- Full compose UX: looks, line, formats (post/story/banner), export PNG
- Fragment remix links + rehydrate
- Parent + one-level lineage
- Dasha pack + pack manifest
- Rights strip + carve-outs
- Multi-format prepare
- Site mark + share sheet / X-ready compose
- Mobile + desktop
- First-export checklist
- Aggregate funnel analytics (land → edit → export → copy link)
- OSS repo: core + pack + tests + CONTRIBUTING

### Phase B — Moat + artifact growth

- OCO file import/export + public fixtures
- Diff view + material change
- Relay library + in-app Relay check
- GIF/motion
- Batch export
- Embed loader + SRI docs
- Score/card formats
- Campaign `src=` attribution
- Featured remix rail
- Personal museum (simple)
- Remix of the day

### Phase C — Social density + seasons connectors

- Remix graph / children gallery
- Duet gallery for starters
- Opt-in profiles + follow makers (object feed)
- Limited non-ranking reactions
- Season starter constraints + submission package
- Season honor roll
- Lobby object previews
- Webhooks for creative events
- Share cards for seasons/scores
- Operator growth console (light)

### Phase D — Network gravity

- Brand workspaces / white-label / partner packs
- AI assist with hard policy
- Capsule multi-object layout / capsule parties
- Short-link optional service + OG previews
- Connector/referral (capped, activation+creative only) if evidence supports
- Second independent client using fixtures
- Pack registry
- Optional live collab rooms
- Headless render service
- Public read APIs for galleries

**Ambition is Phase D. Start is Phase A done so well that B–D are inevitable.**

---

# Part XV — Packaging and voice

## 16. Product family names

| Name | Role |
|------|------|
| **Remixable Culture Studio** | End-user product |
| **OCO** | Format/standard |
| **Relay** | Material-change truth |
| **Packs** | Art/brand units |
| **Embed** | Distribution |
| **Growth suite** | Marks, `src=`, analytics, share compose, museums |
| **Social suite** | Graph, duets, lobby hooks, profiles, honor rolls |
| **getdasha.com/studio** | Reference civilization |

Forks rename freely; protocol names stay boring and clear.

## 17. Voice and art direction (requirements)

- **Opinionated defaults**, flexible packs
- Default pack should feel like **Dasha**: sharp, cultural, not SaaS purple
- UI chrome stays **out of the way of the canvas**
- Copy is **direct, unironic about rights, allergic to hype claims**
- Empty states can be funny; errors must be precise
- Growth UI never uses fake urgency or deceptive scarcity
- Social UI never confuses **creative status** with **financial status**

---

# Part XVI — Risks

## 18. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Seen as “just another meme tool” | Lead every demo with remix link + lineage + packs + rights |
| URL length limits | Compression + OCO file fallback |
| Rights/likeness incidents | Carve-outs, gates, docs, no endorsement chrome |
| Pack quality variance | Official pack bar + sandbox + visual CI |
| Scope explosion | Phase A lock; seasons/board as connectors |
| Growth theater creep | Written anti-pattern list; claim linter; no bag points |
| Social network bloat | Object/season-centric only; no mandatory feed home |
| OSS with no contributors | Good first looks; merge fast; public fixtures |
| Partner packs dilute brand | Sandbox + review for “official” directory |
| Analytics become surveillance | Aggregates by default; opt-in identity |

---

# Part XVII — Acceptance bars

## 19. Factory “best” checklist

A factory build is not “best” until:

1. **&lt;2 min** to first proud export on mobile  
2. **Exact rehydrate** from remix link  
3. **One-tap** post + story + banner from same state  
4. **Parent + diff** on remix  
5. **Rights visible** and carve-outs enforced  
6. **Pack** can be swapped without losing line  
7. **Relay** can say material vs not  
8. **OCO** round-trips in tests  
9. **Embed** works with integrity story  
10. **No wallet** required  
11. **No** buy/like/bag scoring  
12. **OSS** outsider can add a look via documented PR  
13. **Season starter** can lock incompleteness  
14. **AI** optional and policy-bound  
15. **A11y** keyboard + reduced motion + contrast warns  
16. **Batch** path for high-volume creators  
17. **Honest** claim linter on export copy  
18. **Performance** acceptable on mid-tier phones  
19. **Lineage** never claimed as identity/endorsement  
20. **White-label** possible without forking logic core  

## 20. Growth “best” checklist

1. Every export can carry **remix link + mark**  
2. Multi-format export is one action  
3. `src=` campaigns attribute without paying for spam  
4. Funnel analytics exist without doxing  
5. Featured remixes are labeled when editorial  
6. Partner/embed path documented  
7. No growth feature requires points-for-follows/buys/bags  
8. Time-to-first-export is measured and guarded in CI/perf budgets  

## 21. Social “best” checklist

1. Create works with **zero** social identity  
2. Remix graph and parent chain are first-class  
3. Profiles and follow are opt-in  
4. Reactions cannot buy rank  
5. Honor rolls list distinct makers, not bags  
6. Lobby can preview objects without becoming the whole product  
7. Moderation and leave/delete exist  
8. No fake social proof  

---

# Part XVIII — Open-source extraction map

## 22. What to open as modules

| Module | Why people fork |
|--------|-----------------|
| **studio-core + packs** | Run their own factory |
| **oco-schema + validate + fixtures** | Interop standard |
| **relay** | Season and campaign truth |
| **share-card renderer** | Any project’s season/rank cards |
| **campaign `src` + privacy analytics** | Honest attribution kit |
| **remix graph viewer** | Any OCO host |
| **season honor roll UI** | Anti-XP recognition |
| **claim linter** | Growth copy hygiene |
| **embed + SRI starter** | Distribution |
| **look PR template + visual CI** | Contributor onboarding |

**Keep operator-owned when needed:** live moderation policy enforcement details, production secrets, Webflow pins, discretionary editorial featuring — open the **components**, not necessarily every production knob.

---

# Part XIX — Summary

## 23. One-page summary

**Remixable Culture Studio** is the ambitious open culture factory plus its growth and social layers:

- **Factory:** culture objects (render + full editable DNA + rights + optional lineage), CT-speed UX, packs for every brand (Dasha, Ansem-class, fandoms), path to **OCO** and **Relay**.
- **Growth:** every export is a vector (links, marks, formats, campaigns, embeds, seasons); measure remix and return, not vanity.
- **Social:** people gather around **objects and rituals** (graphs, duets, lobby, profiles, honor rolls) — never around bags, bots, or buy-to-rank.
- **Buy:** desk/mint remain optional side doors.

**Start here:** Phase A factory so undeniable that growth rails and social graph are forced by usage.  
**Ambition:** culture OS — open manufacturing infrastructure for internet culture that stays editable.

---

## 24. Related Dasha docs

- `DASHA-PRODUCT-BRIEF.md` — product system and scrapped directions  
- `DASHA-CLAIMS.md` — public claim boundaries  
- `DASHA-OPEN-SOURCE.md` — OSS posture and desk/studio status  
- `DASHA-TRANSMISSION-001.md` — season/ritual experiment shape  
- `DASHA-RULES.md` — agent/publish gates  

---

*End of canonical product description. Owner for Remixable Culture Studio / OCO / factory+growth+social feature decisions. Phase A implementation ships against `dasha-meme-studio.html` → public `dasha-desk/studio/`.*
