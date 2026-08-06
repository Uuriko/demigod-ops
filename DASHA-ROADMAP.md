# Dasha exact product roadmap

Updated: 2026-08-06

## North star

Create the easiest credible way to show what someone believed before a crypto-market outcome, then preserve and resolve the original without becoming a trading venue, shill network or fake safety oracle.

## Current state

### Built locally

- A no-wallet Dasha Thesis Card generator
- Asset address validation
- Thesis, invalidation, confidence and horizon fields
- X Web Intent text within 280 characters
- 1200×675 PNG export
- Explicit disclaimer that the local timestamp and checksum are not proof
- Browser regression test covering boundary input, PNG output, X length, 48px controls and mobile overflow

### Live landing page

The latest Webflow publish uses an iframe loading `https://files.catbox.moe/rj3ask.html`.

Verified current defects:

- The deployed iframe still contains `https://t.me/dashacommunity`, an unassociated Telegram the user explicitly asked to remove. It has been removed from the local source, generated app and configuration; deployment is stale.
- The outer Webflow document contains almost no indexable page content beyond the iframe.
- The outer `<html>` still lacks `lang="en"`.
- Canonical URL and `og:url` are absent.
- The iframe is served as `text/plain; charset=utf-8`, even though browsers may still render it in this context.
- A fixed 1520px iframe height is fragile across content and mobile viewport changes.
- The Thesis Card is not live.

These are P0 alongside preparing the official Discord from the reviewed blueprint.

## Phase 0 — trust and landing repair

Goal: one truthful, directly rendered, accessible landing page.

Tasks:

1. Deploy the completed source-level Telegram removal and verify the anchor and associated language are absent from loaded content.
2. Replace the iframe with native Webflow content or a directly hosted page with the correct `text/html` MIME type.
3. Add `lang="en"`, canonical URL and `og:url`.
4. Confirm all external links have accurate labels and intentional new-tab behavior.
5. Preserve precise mint language: associated/published source is not safety or endorsement.
6. Run desktop/mobile screenshots, link checks, axe and overflow checks.

Exit gate:

- No `t.me/dashacommunity` in outer or loaded content.
- Primary content is indexable in the top-level document.
- Zero serious axe violations attributable to page code.
- No broken links or horizontal overflow at 390px and 1440px.

## Phase 1 — 48-hour artifact test

Goal: test whether the social object is understandable and desirable before persistence.

Build:

- Rename the public experiment **Dasha Thesis Card**.
- Keep it asset-neutral and blank by default.
- Create three polished examples:
  - a bullish liquid-asset thesis;
  - an opposing/bearish thesis on the same prompt;
  - an honest failed or invalidated thesis.
- Add a short “what this proves / does not prove” panel.
- Integrate the generator into the Dasha landing page after Phase 0.
- Add aggregate-only event instrumentation for start, valid generation, PNG download and X-intent open. Do not collect wallet or position data.

Target test cohort: at least 30 relevant crypto users or realistic moderated sessions.

Pass gates:

- At least 40% correctly explain the artifact without coaching.
- Median valid card creation under 45 seconds.
- At least 25% say they would share a real call without payment.
- At least 20% of generated cards open the X share intent.
- At least five users create a second card within 14 days in any live beta.

Failure action: simplify or kill the public-call thesis. Do not compensate with rewards, Discord or a leaderboard.

## Community track — official Discord

The user has decided to create a Dasha Discord. It runs beside the product roadmap, not as a substitute for product demand.

Before opening:

- implement [`DASHA-DISCORD-BLUEPRINT.md`](DASHA-DISCORD-BLUEPRINT.md);
- establish canonical official links;
- assign named admin/moderation coverage;
- enable native verification, Rules Screening and AutoMod;
- preload safety copy, three Thesis Card examples and one community prompt;
- ensure the server contains no wallet verification, trading commands or unassociated Telegram references.

After opening, measure meaningful contributors, support resolution and repeated Round participation—not raw member count.

## Phase 2 — sealed receipts beta

Only begin after Phase 1 passes.

Goal: provide real pre-outcome evidence rather than a local checksum.

Build:

- Server-issued ID and received-at timestamp
- Canonical serialized payload and content hash
- Stable public URL
- Append-only original
- Corrections as new versions
- Deletion as a visible tombstone
- Author-controlled public/private state
- Asset identity stored by chain and contract address, not symbol alone
- Optional RFC 3161 or OpenTimestamps anchoring after basic server receipts are reliable

Do not call a receipt immutable unless the storage and verification path actually make that claim true.

Pass gates:

- At least 100 activated creators
- At least 20% voluntary X share rate
- Receipt click-to-new-card conversion at least 5%
- Fourteen-day repeat creation at least 20%
- Zero lost or silently mutated originals

## Phase 3 — deterministic resolution

Only begin after sealed receipts show repeat use.

Goal: create a second useful social event at the declared horizon.

Start with liquid BTC, ETH and SOL or binary prompts with unambiguous public sources. Do not start by ranking illiquid memecoins.

Build:

- Resolution-source declaration at creation
- Reference value/time and timezone normalization
- HIT / INVALIDATED / EXPIRED / DISPUTED states
- Outcome card linking to the original
- Required short postmortem
- Dispute and correction log

Pass gates:

- At least 30% of creators return for resolution.
- Fewer than 2% unresolved oracle disputes.
- Resolution produces measurable return visits or new cards.

Immediate stop: a material coordination/pump incident, a product-caused impersonation/scam incident or systemic resolution ambiguity.

## Phase 4 — creator-neutral rounds

Only begin after individual receipt and resolution loops work.

Goal: let a host turn a Space, stream or show into a recurring forecast segment.

Build:

- One prompt and cutoff
- 5–10 audience hypotheses
- Optional sealed/private-until-cutoff mode
- Reveal mosaic
- Resolution recap
- Host embed/export

The mode may be useful to Ansem, Market Bubble or any community, but must not imply affiliation or require them.

Pass gates:

- Two independent hosts each run three rounds.
- Host setup stays under ten minutes.
- Fewer than half of rounds require Dasha operator intervention.
- More than half of submitted hypotheses reach resolution.

## Phase 5 — histories and calibration

Only begin after enough resolved observations exist.

Build:

- Public Dasha call history, never “complete trader record”
- Private browser-local or account workspace
- Calibration by confidence bucket
- Brier/proper scoring only where questions are well-defined
- Setup-level review
- Export/API

Do not build a global P&L leaderboard. Do not score thin-token calls in a way that rewards coordinated promotion.

## Deferred until evidence changes

- Dasha token utility or gating
- Wallet connection
- Position-size proof
- Trading/execution
- Copy trading
- Referral revenue
- Paid promotion marketplace
- AI trade advice
- Global leaderboard
- Automatic X posting
- Scraped Ansem call feed

## Metrics hierarchy

### Activation

- Valid cards / landing visitors
- Median time to valid card
- Concrete invalidation completion rate

### Distribution

- X intent opens / valid cards
- Verified public shares
- Shared-card click-through
- Reader-to-new-card conversion
- Cards created per shared card

### Retention

- Second card within 14 days
- Return for resolution
- Four-week retained creators

### Trust

- Mutation/loss incidents
- Resolution disputes
- Tombstone/edit rate
- Scam/impersonation reports
- Misunderstanding of what the artifact proves

### Host viability

- Independent recurring hosts
- Setup time
- Operator intervention rate

Token price, holder growth, impressions and Discord members are not product-success metrics.

## Exact next build order

1. Repair the live iframe/Telegram/accessibility defects.
2. Reconcile the local Thesis Card naming across code and docs.
3. Produce the three example cards.
4. Add the proof/non-proof explanation to the tool.
5. Integrate the local tool into the landing page.
6. Run the 30-user artifact test.
7. Decide go/kill before writing any persistence backend.
