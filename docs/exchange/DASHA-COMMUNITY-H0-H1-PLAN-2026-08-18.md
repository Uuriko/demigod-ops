# Community H0/H1 — execution plan

Do this on disk. **Not a publish.** Live `/forum` stays 404 until an explicit publish + dasha-2 deploy.

## Evidence

- Disk worker API: `GET/POST /forum/threads`, `GET/POST /forum/thread/:id`. Session on writes. Automod inherited.
- Live `lobby.js` already has `mountForum`, but it posts to `/forum/thread` and `/forum/reply` — **those paths are not the disk worker**. Copying live blindly would 404 every write.
- Disk `dasha-lobby-client.js` has no `mountForum`. `#dasha-forum` is an empty column.
- Assets SoR: edit `dasha-lobby-client.js` + `dasha-lobby-page.html`, then `node dasha-lobby-assets-build.mjs --write` (pins SRI, regenerates `dasha-lobby-static-gen.mjs`).
- `FORUM_PAGE_HTML` lives in the worker, not the asset build.

## Constraints

C1–C13, T3/T5, no TG/Discord, no home Forum door until live 200, no `deleted_classes`, no publish, leave Claude’s board client alone.

## Weakest sufficient slice

H0 + shareable H1 on disk. Not H2 memory/mods, not H3 reactions/PWA, not H4 DMs.

## Work

1. **`mountForum` on disk client**, talking to **disk** routes only.
   - `GET /simp/me` → `linked`
   - `GET /forum/threads` → list
   - `POST /forum/threads` `{title,text}`
   - `GET /forum/thread/:id`
   - `POST /forum/thread/:id` `{text}`
   - Caps: title 80, body 2000 (forum module, not live’s 90/1200)
   - `auto()` mounts `#dasha-forum` if present
   - 401 copy: “Link X” / worker `link X first`
   - Unreachable: “Forum is unreachable. Chat still works.”
2. **H1 permalinks**
   - `?t=<id>` opens that thread (embed + standalone)
   - `history.replaceState` when opening/leaving a thread
   - Copy link → `https://lobby.getdasha.com/forum?t=<id>`, fail-closed read-back
3. **Honest first paint**
   - Lobby header: “Official room. No Telegram. No Discord.” (HTML, JS-off)
   - Forum note repeats it
4. **Standalone `/forum` page** (worker HTML): same `?t=`, copy, official-room lede
5. **Privacy**: one sentence that forum posts store handle, avatar, text, time
6. **Build**: `dasha-lobby-assets-build.mjs --write`
7. **Tests**: source pins + puppeteer mock of the disk API
8. **Do not**: deploy, Webflow, sitemap `/forum`, home Forum door, SRI-to-live (live is stale)

## Done when

- Empty `#dasha-forum` fills with list/compose against mocked disk routes
- `?t=` opens a thread
- Copy does not say Copied on a failed clipboard
- Client never calls `/forum/reply` or POST `/forum/thread` (no id)
- Forum + landing + assets-build --check pass
- No publish happened
