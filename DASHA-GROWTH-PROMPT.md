---
status: reference
owner: operator
last_verified: 2026-08-08
---

# Prompt: research the landscape, then build for reach

A standing brief for a fresh session. Read this, then do it. It is written to be re-runnable: the
research goes stale, the constraints do not.

## The goal, stated honestly

More eyeballs, more buyers, more holders. Every positive memecoin metric up.

Say the uncomfortable part first, because it changes what you build: **a website is a weak lever on
token price.** Memecoin demand is driven by narrative, social diffusion and attention, not by page
quality. What a site can actually do is convert attention that already exists into (a) someone
finding the right mint instead of a scam, (b) someone making something that carries the coin into
someone else's feed, and (c) someone finding a reason to stay. Build for those three. Anything
justified by "this will pump it" is a story, not a plan — and this project's whole differentiator is
that it does not tell those.

## What already exists — do not rebuild it

Verify each with the command given; do not trust this list, it ages.

- **getdasha.com** — home, `/studio`, `/dasha` (mint desk), `/lobby` (public chat), `/how-to-buy`.
  `node dasha-surfaces.test.mjs` enumerates every live surface and who owns it.
- **The Studio** — six looks, three formats, PNG + animated GIF, remix links carrying editable state,
  a photo gallery. Open source at `dasha-desk/studio/`, pasteable into any site in two lines.
- **The Desk** — mint verification against independent explorers, one neutral Jupiter route.
- **The Lobby** — public chat, buy button inside the conversation.
- **Simp Board + quiz** — 64 questions, lanes, X-linked scoring.
- **Gates** — 20+, including live ones. `npm run dasha:test:all`. Read `dasha-surfaces.test.mjs`,
  `dasha-loop.test.mjs`, `dasha-contrast.test.mjs` and `dasha-desk/watch.mjs` before building; they
  encode what this project considers a defect.

## Research phase — do this before proposing anything

Search for current material, not 2024 received wisdom. The space moves in months.

1. **Where memecoin attention actually starts in 2026.** Which surfaces originate discovery now —
   DexScreener/Birdeye trending, Phantom's in-wallet discovery and token chats, Jupiter's feeds,
   pump.fun's live streams, Farcaster/Base app feeds, TikTok, X? Rank by where a *first* impression
   happens, not where trading settles.
2. **What converts a viewer into a holder.** Look for anything empirical on trust signals, first-buy
   friction, and why people abandon a swap. Note what is measured versus asserted.
3. **What makes holders stay.** Retention mechanics that are not token rewards: identity, status,
   ritual, chat, collectibles, streaks. Be sceptical of anything that requires a treasury.
4. **What is newly possible.** APIs, embeds, mini-app platforms, wallet integrations, chat protocols,
   agent-readable formats that did not exist a year ago and that a small static site can use.
5. **What comparable projects ship.** Find three memecoins with unusually good product surfaces and
   name specifically what they do that we do not.

For each finding write down: the source, the date, whether it is evidence or someone's opinion, and
what it would change here. Discard anything that fails that test.

## Then propose

Produce 8–12 candidate features. For each, in one paragraph:

- **The behaviour it creates.** Not the feature — the thing a person does that they would not
  otherwise do. If you cannot name it, cut the idea.
- **Which of the three levers** it pulls: find the right mint, carry the coin into a feed, or stay.
- **What it costs**, honestly, including whose permission it needs.
- **How you would know it failed.** A number, a threshold, and a date. If it cannot fail, it cannot
  succeed either.

Rank them. Recommend one. Say what you are not doing and why — a list without exclusions is a wish.

## Then build

Build the top one end to end: source, gate, live verification. Not a prototype behind a flag.

## Constraints that are not negotiable

- **No invented claims.** No price talk, no returns, no fake holder counts, no fake endorsement, no
  "official" status beyond what is true. The anti-scam guidance stays; the risk boilerplate is gone
  by operator decision.
- **No disclaimers.** Removed 2026-08-08. Keep "check the mint" and "never trust a mint from DMs" —
  those are product, not cover.
- **No credit to the operator.** Removed at their request, everywhere.
- **No wallet connection, no custody, no transaction construction.** The site shows and links; it
  does not move value.
- **CC0 for what the Studio draws.** Photos in the gallery are not ours and are not covered — never
  let the licence claim widen to cover them.
- **Publishing, outbound posts and money need explicit authorisation in the request that asks for
  them.** Assume none carries over.

## The thing that will actually block you

This site is published from **two source trees**, and one deploys through a Cloudflare worker this
repo cannot reach. On 2026-08-08 five separate surfaces had a copy decision made correctly in source
and never reach production. Expect it. Before building anything:

- Check what is *live*, not what is in a file. Rendered HTML and repo state disagree routinely.
- Anything in `dasha-meme-studio.html`, `dasha-landing.html` or the lobby client is contested — go
  through the other agent rather than around them.
- **Webflow page settings survive publishes from any tree; embeds do not.** If something must not be
  overwritten, that is where it goes. This is the single most useful thing learned today.
- Take the publish lock. `node dasha-ship.mjs --ship --only=<surface>`.

## How to work

- **Measure before claiming.** Today produced two confident wrong conclusions — "the disclosure is
  hiding format" and "the images need a Designer session" — both from correct evidence and lazy
  inference. Both cost real time. Build the instrument first and check it lies about nothing.
- **A gate that cannot fail is decoration.** Every gate written today that found something was one
  that had a way to be wrong.
- **Correct yourself in public and immediately.** Three claims today needed retracting. The retraction
  was cheap; leaving them standing would not have been.
- Prefer the smallest thing that could work, then check whether it did.
