# Dasha Forum + Chat — Improvement Plan

Prepared 2026-08-18. Grounded in disk, not vibes. **Not a publish.** Live `/forum` is still 404.

Companion specs: `DASHA-COMMUNITY-ROADMAP-2026-08-18.md` (H0–H4) and
`DASHA-COMMUNITY-H0-H1-PLAN-2026-08-18.md` (the H0/H1 execution slice). This file is the
**next-step improvement plan**: concrete bugs found on disk, the structural problem behind them,
and a prioritized build order. It does not replace the roadmap.

## Truth sources (read these, not this file, for the current bytes)

| Concern | File |
|---|---|
| Forum pure logic + limits | `dasha-forum.mjs` |
| Forum + chat routes | `dasha-lobby-worker.mjs` (`handleForum`, `FORUM_PAGE_HTML`, chat WS) |
| Embed forum column + chat | `dasha-lobby-client.js` (`mountForum`, `mount`) |
| Chat automod | `dasha-lobby-mod.mjs` (`validateMessage`) |
| Tests | `dasha-forum.test.mjs`, `dasha-forum-worker.test.mjs`, `dasha-lobby-forum-client.test.mjs` |

---

## 1. The structural problem: three forum clients, one room

This is the root cause of most of the bugs below, and it is the same failure the project already
forbids for automod ("a second copy is a second thing to keep in sync"). Today the forum has **three**
separate renderers:

1. **`dasha-lobby-client.js` `mountForum`** — the embed column (`#dasha-forum`). The **full**
   client: search, edit/delete own posts, report, quote-reply, locked badge, permalink, fail-closed
   copy. Talks to the disk routes.
2. **`FORUM_PAGE_HTML` inline script** (worker) — the standalone `/forum` page. A **stripped**
   client: list + open + compose + copy link only. No search, no edit/delete, no report, no
   quote-reply, no locked badge, no avatar, no 404-recovery-into-list.
3. **Live `lobby.js` `mountForum`** — the old deployed client. Posts to `/forum/thread` and
   `/forum/reply`, which **do not exist** on the disk worker; stale caps (title 90 / body 1200 vs
   disk 80 / 2000). Every write 404s. (Deploy-blocked, but it is the "third client" that will bite
   the moment anything goes live.)

Any feature shipped to only one client silently regresses the other two. The single highest-value
improvement is to collapse 2 (and eventually 3) into 1.

---

## 2. Concrete bugs found on disk (low-risk, no deploy needed)

Ordered by cheapness/impact.

1. **Duplicate + conflicting OG/Twitter meta on the standalone `/forum` page.**
   `FORUM_PAGE_HTML` head emits the `og:type/url/title/description/image` and
   `twitter:card/title/description/image` block **twice**, with two different descriptions
   ("Longer than chat. Same rules as chat." vs "Long-form threads for $dasha. Link X to post.").
   Scrapers pick unpredictably; one description is stale. Deduplicate to one block, one description.

2. **Avatars are stored and public but never rendered.** `newThread`/`addReply` persist
   `avatar`; `publicThread`/`publicPost` ship it; but neither `threadRow` nor `postRow` in
   `mountForum`, nor the standalone page, draws it. The chat renders avatars already — the forum
   looks anonymous by omission. Render the X avatar (with the same `avatarOk` host check the chat
   uses) in thread rows and post headers, `referrerpolicy="no-referrer"`.

3. **Standalone `/forum` 404-permalink dead screen.** The embed `mountForum` was fixed to recover
   a bad `?t=` into the list; the standalone inline script still does `fail(res)` and strands the
   reader with no list and a stale `?t=`. Fix it the same way: clear the permalink, re-render the
   list.

4. **`replies` count doesn't decrement on delete.** The DELETE handler stores `deletePost`'s
   tombstoned `posts` but never touches `summary.replies`, so a thread shows "5 replies" with 4
   visible non-deleted posts. Decide: tombstone keeps the slot (count is correct as "slots") or
   decrement on delete so the number matches visible posts. Either way, make it explicit and test it.

5. **Report queue has no read/act surface.** `POST …/report` appends to `forum:reports` (capped
   100). There is no operator endpoint to list reports, no tie into `bin`/mod CLI, and no audit
   trail of the lock/unlock actions. Reports accumulate invisibly. (Lock itself exists via
   `POST /forum/thread/:id/lock` + `LOBBY_MOD_SECRET`.)

6. **No thread-index pagination.** `GET /forum/threads` returns the entire `forumIndex` (≤ 100
   after prune). Bounded now, but H2 says cursor-paginate rather than dump. Add a `?cursor=` +
   `?limit=` contract before the index outgrows 100.

7. **No mention linkify.** `@handle` in post bodies is plain text. Chat links handles to
   `x.com/<handle>`; forum should too (on display only — never a write/notify path until H3).

8. **Edit/report use `window.prompt` / `window.confirm`.** Blocking, off-brand, not keyboard-safe,
   inconsistent with the 44px house controls everywhere else. Replace with inline UI (a small
   edit-in-place textarea and a reason picker), same as the quote chip pattern.

9. **No unread / "someone replied" signal.** Nothing tells the author their thread got a reply, so
   threads die silently. Lowest-effort H3 version: in-tab "updated just now" is already on the list;
   add an in-tab unread dot per thread since last visit (localStorage), no push yet.

---

## 3. Priority build order

### P0 — One client (structure, before more features)

- Extract the forum renderer into a single shared source that both the embed column and the
  standalone `/forum` page use. Two acceptable shapes:
  - **A (preferred):** make `FORUM_PAGE_HTML` load the same pinned client bytes the embed uses
    (`dasha-lobby-client.js`), with a `<div id="dasha-forum">` and the client's own `auto()` mount.
    Then delete the inline script. This reuses the SRI/build path already in
    `dasha-lobby-assets-build.mjs`.
  - **B:** factor `mountForum` into its own file (`dasha-forum-client.js`) imported by both the
    lobby client and the standalone page's pinned script.
- Do **not** copy live `lobby.js`'s `/forum/thread` + `/forum/reply` paths. Disk routes are
  `/forum/threads` and `/forum/thread/:id`.
- Gate: `dasha-lobby-forum-client.test.mjs` and a new standalone-page test both drive the **same**
  renderer; a change to one cannot pass without the other.

### P1 — Kill the bugs from §2 (order above)

Each item is a small, testable diff. Avatars and 404-recovery and dedup-meta first (user-visible,
no new API). Replies-count and pagination and report surface next (API shape + test).

### P2 — Moderation and memory (the real Telegram replacement)

- Report **read** endpoint + `bin/dg forum reports` (or fold into the existing lobby mod CLI):
  list unread reports, lock thread, unlock thread, tombstone a post as operator. Audit log key
  (`forum:audit`) recording who/what/when for lock, unlock, and operator deletes — never shown to
  the room.
- Cursor pagination on the index (P1 item 6 done for real).
- Body search (H2): needs a small inverted index or a per-thread search key, because bodies live
  only in per-thread keys and a full scan is 100 storage reads. Do **not** scan on the hot path;
  maintain `forum:search` incrementally on write/delete, or defer body search until a real need.

### P3 — Texture (only after P0–P2 are live and used)

- In-tab unread + optional Web Push (permission after first post, not on land).
- Reactions: small fixed set, counts only, **score zero**, no leaderboard.
- Studio attach: "post this make" → image from Studio (CC0/likeness rules unchanged), never raw
  upload.
- Per-thread share/OG card (title + @handle, body spoilers ≤ 80 chars).
- Poll: one question, one vote per X session, no token weight.

### P4 — Only if the room is actually full

- Topic tags, DM (off by default), voice (do not start), bots (none), read-only archive, export
  your posts. Details already in the roadmap H4.

---

## 4. Chat-side improvements (the live wire)

Chat works; the gaps are integration, not correctness.

1. **Bridge chat → forum.** A "make a thread from this" affordance on a chat line (prefill a forum
   thread with the line's text, still subject to automod and X-link on post). This is the single
   most effective way to convert "here now" into "come back to what was said" without inventing a
   second identity.
2. **Deep-link chat → thread** (`>> thread` or a per-line permalink into `/forum?t=`), so a good
   chat line can be pointed at from the thread and vice versa.
3. **Honest online presence.** Chat presence is real (WS). Forum must not fake online counts —
   "updated just now" only, never "37 online".
4. **History/scrollback.** Chat caps at ~80 client lines / ~30 min server. Keep it that way
   deliberately (it's the ephemeral surface); do not bolt persistence onto chat — that's what the
   forum is for. Say that in copy so nobody expects a transcript.

## 5. Hard constraints (do not "flex")

- One automod (`validateMessage`) — forum never reimplements it.
- `t.me` / `discord.gg` / `discord.com/invite` / WhatsApp / seed / private key / airdrop / claim
  still die; links allowlisted + exact mint only.
- Identity from session cookie, never body; write requires X-link; origin check on writes.
- C1–C13: no "safe", no token control, no points/rank for posting/reacting, X-link ≠ unique human.
- Root worker **cannot deploy** (CF 10074). Deploy from `.grok/worktrees/potter/dasha-2` only. No
  `deleted_classes`.
- Do not Designer-Publish Webflow. Recompute SRI against **served** bytes after any deploy.
- Prepared ≠ published. This file authorizes no ship.

## 6. Tests per item

- **P0:** standalone page test asserts the served `/forum` HTML contains no inline forum script and
  mounts `#dasha-forum` via the pinned client.
- **§2.1:** static test asserts exactly one `og:description` and one `twitter:description` on the
  standalone page.
- **§2.2:** client test asserts `threadRow`/`postRow` render an avatar `<img>` only for
  allowlisted hosts, with `referrerpolicy="no-referrer"`.
- **§2.3:** client test asserts bad `?t=` renders the list and clears the query.
- **§2.4:** core test asserts `replies` reflects visible posts after delete (whichever policy is
  chosen).
- **§2.5:** worker test asserts `GET /forum/reports` returns 403 without the mod secret and the
  queue with it; lock/unlock appends to the audit log.
- **§2.6:** core + worker test assert cursor pagination is stable and bounded.
- **§2.7:** client test asserts `@handle` in a body renders as an `x.com` link.
- **§2.8:** client test asserts edit-in-place and report reason picker work without `prompt`/`confirm`.

## 7. Done-when

- One forum renderer serves both surfaces; a feature added once appears in both.
- All §2 bugs have a passing test.
- `dasha-forum.test.mjs`, `dasha-forum-worker.test.mjs`, `dasha-lobby-forum-client.test.mjs`,
  `dasha-lobby-page-html` test, and `dasha-gate-all --list` are green.
- No deploy, no publish, no SRI re-pin against live (live is stale).
