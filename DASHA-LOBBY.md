# Dasha public lobby

On-site livechat instead of Discord. One public room.

## Shape

- Anon nick (2–18), unique in-room
- Rate limit (~2.5s + 12/min) + duplicate filter
- Caps / airdrop / seed / invite automod
- Pin: concise room label + exact mint; copy mint in client
- No DMs or native accounts; optional X linking only; **hard cap 80 concurrent** (extra joins get full / close 4001; client retries slowly)
- **Per-IP** max 4 sockets · 10 joins / 10 min · **auto slow** at 30+ · quiet joins
- Reserved nicks (`dash_eats`, etc.) · chat **Remix → Studio** · optional `!mod` (needs `LOBBY_MOD_SECRET`)
- Capacity probe: `GET /capacity`
- Allowlisted links only (getdasha, x, jup, dex, solscan, rugcheck, github)
- ~30 minute history, max 40 messages; DO prune alarm
- Protocol: `ready` → `hello` → `hello_ok` + history; then `chat`
- **Optional X link** (OAuth 2 PKCE) — never required
  - Perks: `@handle` badge, 280-char messages, faster rate, priority seats after soft cap (75/80)
  - Routes: `/oauth/x/start`, `/oauth/x/callback`, `/oauth/x/status`, `/oauth/x/logout`, `/privacy`
  - OAuth starts with a concise privacy screen before redirecting to X; no X access or refresh token is persisted
  - Secrets: `X_CLIENT_ID`, `X_CLIENT_SECRET`, `LOBBY_SESSION_SECRET` · callback `https://lobby.getdasha.com/oauth/x/callback`
- **Opt-in Simp Board** reuses the same signed X session; OAuth alone never enrolls
  - Routes: `GET /simp/board`, `GET /simp/me`, `POST /simp/join`, `POST /simp/leave`
  - Simp Quiz: `GET|POST /simp/quiz`; quick 10-question invite or deep 20-question Board path; retakes replace the prior score; finishing explicitly enrolls; result share is optional
  - Studio does not expose a claim form or button. Creative evidence accepted by the backend must be an X status URL; authenticated review remains at `GET|POST /simp/review`.
  - Five claim types: maker, remixer, community helper, lobby regular and code maintainer
  - X link earns 10 eligibility points only after explicit Board enrollment
  - Recognized creative work: 25 each, capped at 100 per rolling 28 days
  - Recognized community work: 10 each, capped at 40 per rolling 28 days
  - OSS points accept only the existing `dasha-simp-oss/v0` result, capped at 300 per season
  - Followers, verification, likes, reposts, replies, chat volume, referrals, purchases, balances, bag size and payments score zero
  - Downloadable 1200×630 personal score card is rendered locally in the browser
  - Public badges: linked, maker, remixer, helper, lobby regular, maintainer and holder
  - Frozen operator-created season snapshots: IDs cannot be overwritten; newest 24 retained via `GET /simp/seasons`, `POST /simp/seasons/snapshot`; leaving scrubs the linked row from every retained snapshot
  - Holder proof signs a one-time five-minute message, checks the Dasha mint through Solana RPC, stores only proof time plus a 24-hour badge expiry, publishes no wallet or balance, sends no transaction and scores zero. Access begins immediately after a successful proof. Injected Phantom/Solflare work directly; mobile browsers without injection reopen the same page in Phantom's signing-capable in-app browser.
- Cloudflare Worker + single Durable Object

## Files

| File | Role |
|------|------|
| `dasha-lobby-mod.mjs` | Pure validation / rate / pin |
| `dasha-lobby-worker.mjs` | Worker + `DashaLobby` DO |
| `dasha-lobby-wrangler.jsonc` | Wrangler config |
| `dasha-lobby-client.js` | Embeddable client (OSS source) |
| `dasha-simp-score.mjs` | Pure Board scoring, ranking and public sanitization contract |
| `dasha-simp-actions.mjs` | Claims, fixed review awards, season snapshots and wallet proof primitives |
| `dasha-simp-board-client.js` | Board link/join/leave UI using the Lobby session |
| `dasha-simp-review.mjs` | Secret-bearing claim review and season snapshot CLI |
| `dasha-landing.html` | `#lobby` / `#simp` mounts; clients load from lobby host |
| `dasha-lobby-static-gen.mjs` | Generated minified clients for Worker `/client/*` |
| `dasha-audit-live.mjs` | Announce-ready live audit (worker + site + optional WS) |

## Deploy

```bash
node dasha-lobby-assets-build.mjs --write   # bake clients + atomically refresh all SRI pins
npm run dasha:lobby:embed                   # landing → external client script tags
npm run dasha:test:lobby                    # unit + structure + embed check
npm run dasha:test:simp                     # score, privacy, API structure + board embed
npm run dasha:audit:tools                   # self-test audit/ship/watch tooling
npm run dasha:audit:live:fast               # worker + site parity (~2s)
npm run dasha:audit:live                    # full read-only worker + site audit
npm run dasha:audit:live -- --protocol      # mutating WS protocol (~15s; visible test chat)
npm run dasha:test:lobby:live               # explicit mutating multiparty test
npm run dasha:test:quiz                     # local only; never changes live metrics
node dasha-quiz-smoke.mjs --live             # read-only live quiz contract
node dasha-quiz-smoke.mjs --live-write       # explicit synthetic live starts
npm run dasha:lobby:watch -- --once         # one-shot stats+health (exit 1 on bad)
npm run dasha:lobby:deploy                  # CLOUDFLARE_API_TOKEN
npm run dasha:lobby:dev                     # local :8787
```

Review without exposing the secret to browser code:

```bash
LOBBY_MOD_SECRET=… node dasha-simp-review.mjs list
LOBBY_MOD_SECRET=… node dasha-simp-review.mjs accept CLAIM_ID 40
LOBBY_MOD_SECRET=… node dasha-simp-review.mjs decline CLAIM_ID "reason"
LOBBY_MOD_SECRET=… node dasha-simp-review.mjs snapshot season-zero "Season zero"
```

OSS accept values are fixed at 5, 15, 40, 100 or 200. Creative/community awards are fixed by claim type. A holder badge means the wallet held a positive raw token amount when the dated check ran; it does not prove continuous holding during the 24-hour display window. It may be proven again after expiry. The same wallet can badge more than one X identity, so this is an identity-neutral status badge—not Sybil resistance or rank evidence.

Privacy: `https://lobby.getdasha.com/privacy`. The X session cookie expires within 30 days. `POST /simp/leave` deletes the linked profile, claims, active quiz attempt, current associated result, holder nonce, and retained season rows; anonymous aggregate funnel counts remain. `POST /oauth/x/logout` clears the signed browser session separately.

`LOBBY_MOD_SECRET=… node dasha-simp-review.mjs metrics` returns both aggregate Studio and server-derived quiz funnels with a shared `since` baseline. `metrics-reset` is the authenticated post-release baseline operation; it resets both aggregate sets together and persists the new timestamp. It does not alter profiles, quiz results, claims, seasons, chat, or holder badges. Never reset live metrics during ordinary audits.

Use `LOBBY_MOD_SECRET=… npm run dasha:studio:metrics:summary` for the decision readout: Studio edit/export ratios, Quiz completion/share-intent ratios, and the Quiz → Studio handoff. These are page-load progression ratios, not unique-user conversion or retention.

Public observation: `GET /studio/metrics/public` / `npm run dasha:studio:metrics:public` returns only aggregate Studio and Quiz totals and ratios. Every cell below five is `null`; identity, content, wallet data, question detail, and source breakdowns are omitted. Raw metrics and reset remain secret-authenticated. Worker release `bb009443b06e8e7d` was deployed and verified on 2026-08-09.

Test isolation: routine Studio/Quiz suites must never write this endpoint. Studio Playwright intercepts `/studio/event`; quiz smoke is disk-only by default and read-only with `--live`. Only `--live-write`, `dasha:audit:live -- --protocol`, and `dasha:test:lobby:live` intentionally mutate production. Historical 2026-08-09 aggregates include synthetic test traffic and are not a clean organic conversion baseline.

Clients: `https://lobby.getdasha.com/client/lobby.js` · `…/client/simp-board.js`  
Ship: `node dasha-ship.mjs --verify` runs audit `--fast`; `DASHA_AUDIT_PROTOCOL=1` explicitly enables mutating WS checks.

Feature pass prompt: `DASHA-LOBBY-FEATURE-PASS.md`

Production (Potter CF account · zone `getdasha.com`):

- Health: `https://lobby.getdasha.com/health`
- WS: `wss://lobby.getdasha.com/ws`
- Route: `lobby.getdasha.com/*` → worker `dasha-lobby`
- DNS: proxied CNAME `lobby` → `dasha-lobby.getdasha.workers.dev`

Homepage `#dasha-lobby` / client `DEFAULT_WS` point at the WS URL above.


## Protocol (JSON over WebSocket)

Client → server:

- `{ "type": "hello", "nick": "ava" }`
- `{ "type": "chat", "text": "gm" }`
- `{ "type": "ping" }`

Server → client:

- `{ "type": "hello_ok", "pin", "history", "you" }`
- `{ "type": "chat", "id", "nick", "text", "ts" }`
- `{ "type": "system" | "presence" | "error" | "pong" }`
