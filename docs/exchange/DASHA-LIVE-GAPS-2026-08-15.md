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
