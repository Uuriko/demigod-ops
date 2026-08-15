---
status: handoff
canonical_for: getdasha-live-gaps
prepared_by: claude (claude-opus-5)
last_verified: 2026-08-15T21:47Z
---

# Live gaps on getdasha.com, and exactly where the code already is

Everything below was verified against live on 2026-08-15. None of it is fixable from this machine:
the Worker deployed at 17:54Z was built from a tree that has `DashaFaucet`, which exists nowhere
here, and `driftedPins` correctly refuses a ship from here because `simp-board.js`, `studio.js` and
`lobby.js` are pinned to bytes the live Worker no longer serves.

The point of this file is that two of the three fixes are **already written and tested in this
tree** — they just aren't in the deployed Worker. Port, don't rewrite.

## 1. Doubled `<script>` on the homepage — chess client is dead

Live homepage (Webflow pageId `5f1458136c15aa41639b8538`, published 09:25Z) carries a symmetric
double-wrap of the chess payload:

```
offsets 64711 / 64719    </dialog><script><script>
offsets 112887 / 112896  </script></script>
```

Script tags balance 17/17, so it is an extra wrapper pair, not a missing close. The parser ends the
first `<script>` at the first `</script>`, making its body the literal text `<script>…`, so the
**entire chess client fails to parse**. Browser-confirmed: `SyntaxError: Unexpected token '<'` on
every homepage load; the board renders at 5340px and is inert. `/chess` is a separate copy and is
fine.

Fix at whatever source generates the embed for homepage element `111587a0`: collapse each doubled
pair to a single tag. This tree does not source that element — see §4.

## 2. `/price` returns 404 — and fixing it alone changes nothing visible

Two independent faults, both required:

**a. The endpoint.** `lobby.getdasha.com/price` 404s. The implementation is complete here:

| what | where in `dasha-lobby-worker.mjs` |
|---|---|
| `PRICE_TTL_MS` | 140 |
| `DashaLobby.handlePrice` | 1679–1809 |
| route (fetch) | 2602–2604 |
| route (DO) | 3260 |

The caching lives in the Durable Object deliberately. An earlier version cached in Worker module
scope, which is per-isolate, and the endpoint 503'd on roughly 6 of 10 requests; moving it into the
single DO instance took it to 12/12. It also splits the price and candles fetches so the heavier
candles call is dropped first, and only advances the retry clock on success — an earlier version
advanced it on every attempt and produced a retry storm.

**b. The CSS.** `dasha-landing.html` hides the strip unconditionally:

```css
.dasha-hero .poster, .dasha-hero .price { display: none }
```

Commented *"First paint: headline + Buy. Everything else waits below"* — but nothing ever reverses
it. Browser-confirmed `display: none`. The strip also starts with the `hidden` attribute and only
unhides on a successful fetch, so **restoring the endpoint without removing this rule is a no-op**,
and removing the rule without the endpoint is equally a no-op. Ship both or neither.

## 3. `/forum` is built, tested, and unrouted (308)

`lobby.getdasha.com/forum` 308s. Fully implemented here:

| what | where |
|---|---|
| import | `dasha-lobby-worker.mjs:107` — `addReply, newThread, pruneIndex, publicPost, publicThread` from `dasha-forum.mjs` |
| page HTML | 150 (`FORUM_PAGE_HTML`, served from the Worker — the forum is all API, so it needs no Webflow surface) |
| `handleForum` | 1839+ |
| routes | 2617 (`/forum/…`), 3222 (`/forum`, `/forum/`) |
| storage init + prune | 757, 785–792 |
| `forumKey` | 1811 |
| `forumThreadPosts` | 1815 |
| `persistForumIndex` | 1821 |
| `forumPrune` | 1827 |

`dasha-forum.mjs` reuses `validateMessage` from `dasha-lobby-mod.mjs` rather than reimplementing
automod. `MAX_POSTS = 50` and `THREAD_BYTES_MAX = 120 * 1024` are sized so a full thread fits inside
one Durable Object value (the 128 KiB per-value limit) — do not raise either without re-checking
`threadBytes()`.

Tests: `dasha-forum-worker.test.mjs`, `dasha-forum-live.test.mjs`.

This is the cheapest real community win available. It is finished work sitting behind a missing
route, and the site currently has exactly two working community surfaces (Simp board, `/chess`).

## 3b. The homepage ships one visible heading, and a hidden duplicate chess section

Verified in Chromium at 390×844 on live. The page has an `h1` and three `h2`s, and **none of the
`h2`s render**:

| heading | why it is invisible |
|---|---|
| `h2 "Play"` | parent `<section>` computes `display: none` |
| `h2 "Top table"` | parent `<section>` computes `display: none` |
| `h2 "$dasha."` | the heading itself computes `display: none` |

There is also **no "Simp board" heading on live at all** — the board mounts into a bare `<div>`. The
Designer copy has `<h2 class="section-title" id="simp-title">Simp board.</h2>`; live does not.

Two things follow, and they want different fixes:

1. **A chess section is duplicated.** `Play` and `Top table` sit in a section computing
   `display: none`, yet a 64-square board *is* visible further down the page (top at 5340px). So one
   chess block is hidden and another renders — the same shape of defect as the doubled `<script>`
   in §1, and plausibly the same bad merge. Worth fixing together.
2. **The "first paint" CSS became permanent.** `dasha-landing.html` carries
   `.dasha-hero .poster,.dasha-hero .price{display:none}` and
   `.dasha-hero .actions a:not(.buy-dasha){display:none}` under the comment *"First paint: headline
   + Buy. Everything else waits below."* Nothing ever reverses any of it. Live confirms the poster
   collage is absent from the DOM entirely, the price strip computes `display: none`, and the hero
   has exactly one CTA.

Net effect for a visitor and for a crawler: an `h1`, a Buy button, a leaderboard with no heading, a
contract address with no heading, and an inert chessboard. That is a thin document structure for a
page about to receive Twitter traffic — one `h1` and no `h2` gives search and screen-reader
navigation almost nothing to work with.

**This is a judgement call, not an unambiguous bug.** If the minimal hero is a deliberate conversion
choice, keep it — but the hidden section headings and the duplicated chess block are separate from
that choice and should be fixed regardless.

## 3c. Live is deliberately curated. Do not "restore" these.

Two things on live are easy to mistake for regressions and are not:

- **Scroll animations are switched off on purpose.** Live carries
  `animation-timeline:none!important`. That is an explicit override, not an absent feature — the
  `@supports (animation-timeline: view())` block is still there underneath it. Someone disabled the
  motion deliberately. Do not re-enable it without asking whoever did.
- **The poster collage is gone from the markup, not from the stylesheet.** Live has 12 `.poster-tile`
  CSS selector occurrences and **zero** `class="poster-tile"` in markup. The rules are dead weight;
  the collage was removed on purpose, consistent with `/studio` being retired.

Taken with the retired routes, live is a curated, retirement-aware page. This tree's
`dasha-landing.html` is behind it: it still contains 2 `href="/studio"`, 2 `href="/lobby"`, 1
`href="/dasha"` and 1 `href="/how-to-buy"`, and the poster collage markup. **Do not ship this tree's
landing over live** — that is a rollback, independent of the SRI problem in §4.

### The trap waiting for whoever aligns the source

`dasha-ship.mjs:319` hard-requires the retired routes in the landing source:

```js
if (!landing.includes('/studio') || !landing.includes('/dasha')) fail('landing missing dual-path routes');
```

So updating `dasha-landing.html` to match live — removing the links to retired surfaces — **fails
the fast gate**. The gate currently enforces links to pages that 308 to home.

I have deliberately not changed it. Whether `/studio` and `/dasha` are retired permanently or
temporarily is a product decision I do not have, and loosening a release gate on an inference is how
guards quietly stop guarding. Resolve it explicitly: if the retirement is permanent, drop that
assertion in the same change that removes the links, so the gate and the page move together.

## 4. Do not publish getdasha.com from the Webflow Designer or MCP

The Designer holds unpublished changes that are **not** safe to ship:

```
Designer simp-board pin   sha384-3yeE9TBUp76WISRtk4suy8FFCGhCJWRtHmdnqN3SfIRIwVceGuXUHLVa8L9YCkU2
live pin                  sha384-BT+PgNQQrfng+96zjBh0r/vMyR8TnjpmooilEkDoi8DQ44/FfoMHcvnlUhvAapMh
actual /client/simp-board.js hash = sha384-BT+PgNQQ…   (matches live, not the Designer)
```

Publishing that state fails SRI on `simp-board.js` and the Simp board stops loading entirely. The
Designer also still carries nav/footer links to retired `/studio`, `/lobby`, `/bounties`, `/graph`,
`/dasha`, `/how-to-buy` and a poster collage pointing at the retired Studio.

`driftedPins()` in `dasha-ship.mjs` catches exactly this on every publish. A Designer or MCP publish
bypasses it. **Publish only through `dasha-ship.mjs`.**

## 5. Already fixed here (20b1f9e)

`SURFACES.homeLobbyLink` mapped the intentionally-empty `dasha-home-lobby-link.html` onto homepage
element `111587a0` — the element the chess board is published into. `detected` falls back to every
surface whenever the manifest is not `verified` (fresh clone, or a run that failed before stamping),
so a ship from this tree would have written an 820-byte comment over live chess. Mapping removed,
guard test added. Also raised the ship test's spawn timeout from 30s to 300s: the fast gate measures
63s, so the suite had been dying at `gate:fast:start` with `null !== 0` — a stopwatch failure that
read as a ship failure, and it predates the change above.

## Not broken — checked, no action needed

The Twitter share card is correct and launch-ready: `twitter:card = summary_large_image`,
`og:title`, `og:description`, `og:image` → `lobby.getdasha.com/og/dasha-social-card.png` (200,
image/png, 141 KB, 1200×630), plus `description` and `canonical`. A shared link renders as a
full-width image card. Only nit: `twitter:image` is emitted twice with the same value; crawlers take
the first.
