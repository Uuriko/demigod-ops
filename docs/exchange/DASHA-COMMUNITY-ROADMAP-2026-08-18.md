# Dasha Community — chat + forum roadmap

Working spec for the official $dasha room. **There is no Telegram, Discord, or WhatsApp community.** Those invite links are banned in chat and forum copy. This surface *is* the community.

Not published. Live `/forum` is 404. Disk lobby is chat + forum again. Worker has the thread API and a standalone `/forum` page ready to deploy from dasha-2.

## Job

One public room on `getdasha.com` / `lobby.getdasha.com` that does the work people otherwise flee to Telegram for:

| Need | Surface |
|---|---|
| Be here *now* | Lobby chat (websocket) |
| Come back to what was said | Forum threads (Durable Object) |
| Find the room | Home Lobby door, then `/lobby` split + `/forum` full page |
| Know who is speaking | X-linked handle to write; guests read |
| Not get scammed | Same automod as chat, inherited — never a second copy |
| Make / Play / Buy from the room | Doors to Studio, Simp, Chess, How to buy. No points for posting or reacting (C11) |

Chat is the live wire. Forum is the memory. Together they replace a group chat.

## What already exists (honest)

**Chat (live)**
- Websocket lobby, nick, X-link, presence, slow mode, expand-off on the full page
- Automod: scam phrases, seed/private-key, airdrop/claim, `t.me` / `discord.gg`, link allowlist (exact-mint https only)
- Rate limits, per-IP join, history cap
- Guests can read and type under chat nick rules; X-link is the real identity

**Forum (disk + live client, not live route)**
- `dasha-forum.mjs`: titles ≤ 80, posts ≤ 2000 (chat is 200), 50 posts/thread, 100 threads, 30-day TTL, 120 KiB/thread (DO 128 KiB ceiling)
- Same `validateMessage` as chat — Telegram/Discord invites refused here too
- Write requires a linked X session; identity never taken from the body
- 20 posts / window per X id; origin required on writes
- GET `/forum/threads`, POST `/forum/threads`, GET/POST `/forum/thread/:id`
- Public shapes leak no IP, session, or extra fields
- Standalone `FORUM_PAGE_HTML` (list + thread + compose)
- Live `lobby.js` already has `mountForum(#dasha-forum)` (list, open, compose). Disk `dasha-lobby-client.js` does **not** — that is a ship gap
- Lobby page (disk): forum column + chat column; header “Forum” → `lobby.getdasha.com/forum`

**Hard limits that will break a real community if we ignore them**
- 100 threads, 30-day drop, 50 posts/thread, one DO value per thread
- No edit, delete, search, pin, report, notify, media, or permalinks in the API
- Root Worker cannot deploy (CF 10074). dasha-2 only. Do not add `deleted_classes`
- Live lobby.js SRI (`sha384-8ZUz…`) ≠ disk lobby page pin (`sha384-fet8…`) ≠ disk client (`sha384-zuhm…`). Browser fail-closed

## Constraints (do not “flex” these)

- **C1–C13.** No “safe.” No token control. No endorsement. No points, rank, or access for buys, likes, quotes, referrals, or bag size. X-link ≠ unique human (C13).
- **T3 / T5.** Session is `__Host-` cookie, 30 days, no offline X token. Dasha does not post to X. Spam/unsafe-link controls stay server-side.
- **Banned growth:** official Telegram/Discord/WhatsApp. Product brief: `t.me/dashacommunity` must never return.
- **Privacy:** unlink clears session; say what is stored (handle, avatar, posts, timestamps). No wallet in the room.
- **Ponytail:** one automod, one identity, one room. New surface only when chat + one thread list cannot do the job.
- Prepared ≠ published. This file authorizes no ship.

## What “a lot” means (Telegram map)

Copy the *jobs*, not the product.

| People use Telegram for | We do | We do not |
|---|---|---|
| One URL everyone has | `/lobby` (chat+forum) and `/forum` | A third host or app store |
| Live chatter | Chat, already | Voice/video rooms (H4+, if ever) |
| Topics that stay | Forum threads | 40 Discord channels |
| @ someone / reply | H2 quote-reply + mention highlight | Telegram usernames as identity |
| Pins / announcements | Operator pin in chat today; forum pin in H2 | “Official alpha” as investment advice |
| Share a message | Permalink `/forum?t=` in H1 | Screenshot-only culture |
| Pictures / stickers | Studio handoff into a post (H3) | Arbitrary file dump (malware) |
| Reactions | Count-only, **score zero** (H3) | Points, airdrop weight, “top fan” |
| Alerts | Browser push / email-less: in-tab + optional Web Push (H3) | SMS, Telegram bot bridge |
| DMs | **Default no.** If ever: H4, same automod, no links off-allowlist, no wallet talk | Unmoderated DMs (how drains start) |
| Mods | Operator CLI + report queue (H2) | Random “admin” roles for bags |
| Search | Title + body search (H2) | Cloud archive of deleted scam text |
| Mobile | Mobile web first, then PWA (H3) | Native iOS/Android |
| Invites | Public URL. No invite-gated alpha | Referral codes that score |
| Bots | None until the room is used (H4) | Price bots, raid bots, tip bots |
| Polls | Simple one-question, no token weight (H3) | Snapshot governance |

## Look

Same house as home/chess: ink `#070608`, paper `#f4eddb`, acid `#dfff00`, hot `#ff3b81`. Arial 900. Pills or 0px. 44/48px targets. Forum left / chat right on desktop; forum stacked above chat under 960px. First paint must show both mounts, not “Loading community…”.

## Phases

### H0 — Room exists (this week, before any community claim)

Ship the thing already on disk so a stranger can talk and leave a thread.

- [x] Lobby page is chat **and** `#dasha-forum` (restored on disk 2026-08-18)
- [x] Disk `dasha-lobby-client.js` mounts forum against **disk** `/forum/threads` + `/forum/thread/:id` (not live's old `/forum/reply`)
- [ ] Re-pin lobby.js SRI to the **served** bytes after dasha-2 deploy (fail-closed)
- [ ] Deploy Worker from dasha-2 only (not root; no `deleted_classes`)
- [ ] Live `GET /forum` 200 with title, thread list, compose
- [ ] Live `GET/POST /forum/threads` and `/forum/thread/:id` work with cookies
- [ ] Linked X can post; unlink cannot; 401 copy says “Link X”
- [ ] Automod still kills `t.me`, `discord.gg`, airdrop/claim, seed phrases, off-allowlist links
- [x] Empty state: “No threads yet. Start the first one.”
- [ ] Mobile: forum readable above chat; chat log still > 45% viewport when stacked
- [x] Home footer links Forum (no extra door). Ships with the Worker, not ahead of it
- [x] Sitemap lists `https://lobby.getdasha.com/forum`
- [x] Privacy page names forum posts as stored, session-scoped identity
- [ ] `dasha-forum.test.mjs` + a worker route test for 401/429/automod stay green
- [ ] Explicit **publish** in the request before any of this goes live

**H0 done when:** a new phone can open `/lobby`, read chat, open a thread, and (after Link X) post, without Telegram.

### H1 — The room is shareable and honest

Make it a place you can send, not a widget.

- [x] Permalink: `https://lobby.getdasha.com/forum?t=<id>` opens that thread (lobby embed + standalone) — disk
- [x] Copy thread link, fail-closed (writeText → fallback; do not say Copied unless read-back matches) — disk
- [ ] Deep link from chat: optional `>> thread` does not invent a second identity
- [ ] First-paint header: one line that this is the official room and there is no TG/Discord
- [ ] Guest read of every public thread; write still X-linked
- [ ] Rate-limit copy is human (“wait a few seconds”), not a stack trace
- [ ] 404 thread: branded, mint + doors, no empty Webflow page
- [ ] Presence line in chat stays; forum shows “updated just now” without fake online counts
- [ ] OG card for `/forum` is the site card or a dedicated room card — not a leftover Studio still
- [ ] Operator can pin one chat line and one forum thread (see H2 for the API)

**H1 done when:** someone can text a friend a thread URL and both land on the same posts.

### H2 — Moderation and memory (the actual Telegram replacement)

Without this, the room dies the first time a scammer shows up, or after 30 days.

**Memory**
- [x] TTL is 180 days (was 30). Index still capped at 100. Silent opener-loss on delete is still refused
- [ ] Paginate thread index (cursor), do not dump 10k rows
- [x] Search titles + handle, server-side (`?q=`). Banned titles do not come back. Bodies stay off the index (no 100-thread scan)
- [x] Author can edit own post for 15 minutes; show “edited”
- [x] Author can delete own reply (tombstone). Opening post cannot be deleted
- [ ] Quote-reply (in-thread), not nested Reddit
- [ ] Mention `@handle` highlight only — no notification spam until H3

**Moderation (T5)**
- [x] Report a post (reason enum: scam, spam, harassment, off-topic). Stored at `forum:reports`, not public
- [ ] Operator CLI already used for lobby: mute/pin. Forum lock is `POST /forum/thread/:id/lock` + `Authorization: Bearer LOBBY_MOD_SECRET`
- [x] Locked thread: readable, not writable
- [ ] Mute/ban is session X id, not “the human” (C13). Say that
- [ ] Audit log: who deleted what, when. Not shown to the room
- [ ] Same link allowlist on edit as on create
- [ ] No user-to-user “admin” because they hold $dasha

**H2 done when:** a scam thread can be killed in one command, and last month’s lore is still there.

### H3 — Texture (make it a place, not a form)

Do these only after H0–H2 are live and used.

- [ ] Reactions: a small fixed set. Counts only. **Score zero.** No leaderboard
- [ ] Studio attach: “post this make” → image from Studio (CC0 / likeness rules unchanged), not raw uploads
- [ ] In-tab unread badge on the Forum header; optional Web Push later (permission after first post, not on land)
- [ ] PWA: add to home screen, `/lobby` + `/forum`, no tracking SDK
- [ ] Poll: one question, options, one vote per X session, no token weight, no “governance”
- [ ] Share card per thread (title + @handle, no body spoilers over 80 chars)
- [ ] Mobile composer: 48px send, does not cover the last post
- [ ] Reduced-motion and contrast already on the page stay intact

**H3 done when:** people hang out here without asking “what’s the group chat.”

### H4 — Only if the room is actually full

- [ ] Multiple topic tags (General / Studio / Chess / Desk), still one product, not Discord
- [ ] DMs: **off by default.** If ever on: both sides X-linked, automod, no off-allowlist links, no wallet strings, reportable, operator-readable on report. Prefer “start a thread” over DM
- [ ] Voice: do not start. Revisit only if people ask *after* text works
- [ ] Bots: none until a concrete job exists (e.g. “new chess challenge posted”). No price bot
- [ ] Read-only archive host for threads past TTL
- [ ] Export your posts (JSON) from Privacy / unlink flow

## Checklists by concern

### Safety (every phase)

- [ ] Automod is one function (`validateMessage`). Forum never reimplements it
- [ ] `t.me`, `discord.gg`, `discord.com/invite`, WhatsApp, seed/private key, airdrop/claim still die
- [ ] Links: allowlisted https + exact mint only
- [ ] Writes: origin check + X session + rate limit
- [ ] No “DM me”, no “connect wallet” surviving the filter
- [ ] No official-community claim for any off-site chat
- [ ] Reports do not publish the reporter

### Claims / copy

- [ ] “Official room on getdasha.com.” Not “official Telegram”
- [ ] Not “verified humans.” “X-linked accounts”
- [ ] Not “safe chat.” “Same rules as the lobby”
- [ ] No holder counts, no “join 10k,” no prize for posting

### Access

- [ ] Read: anyone
- [ ] Write: Link X
- [ ] Mod: operator
- [ ] No bag gate to read or write (holder badge stays on Simp / chess)

### A11y

- [ ] Forum region has a name; live status is `aria-live=polite`
- [ ] Thread open is a button, 44px+
- [ ] Focus moves to thread title on open, back to list on back
- [ ] Keyboard: list → thread → compose without a mouse
- [ ] Contrast holds at 320px

### Ship

- [ ] Worker from dasha-2
- [ ] Recompute SRI, re-pin lobby + forum clients, then Webflow `--only=lobby` (and home only when adding a door)
- [ ] Do not Designer-Publish
- [ ] `node dasha-live-verify.mjs` must see forum 200 and matching SRI
- [ ] Leave Claude’s dirty `dasha-simp-board-client.js` out of the slice

## Non-goals

- A second official chat on Telegram/Discord “just for now”
- Token-gated lounge, raid chat, or tip bot
- Points for messages, reactions, or time-in-room
- Unmoderated DMs
- Recreating Discord (roles, 50 channels, voice stages)
- Storing wallets next to posts
- Publishing this spec as if the room were already live

## Evidence → next

| If we see | Then |
|---|---|
| H0 not live | Do not advertise Forum on home |
| People post, then disappear | H1 permalinks + H3 unread, not more features |
| Scam gets through | Tighten automod; do not add DMs |
| Threads fall off at 30 days while people still cite them | H2 memory before H3 stickers |
| Strangers ask “what’s the TG” after H0 | Copy on home/lobby is wrong; fix that before H3 |

## Sources

- Logic: `dasha-forum.mjs` + `dasha-forum.test.mjs`
- Routes / page: `dasha-lobby-worker.mjs` (`handleForum`, `FORUM_PAGE_HTML`)
- Lobby mount: live `lobby.js` `mountForum`; disk `dasha-lobby-page.html` `#dasha-forum`
- Automod: `dasha-lobby-mod.mjs` `validateMessage`
- Claims: `DASHA-CLAIMS.md` C9 C11 C13
- Threats: `DASHA-THREAT-MODEL.md` T3 T5
- Product: `DASHA-PRODUCT-BRIEF.md` (no t.me community)

This file is the working community plan. It does not replace the brief or the claims ledger.
