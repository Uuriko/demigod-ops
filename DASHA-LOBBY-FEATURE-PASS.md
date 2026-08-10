# Dasha Lobby — exhaustive feature / bug / audit / test pass

**Scope:** Public on-site lobby (`dasha-lobby-*`, landing `#lobby`, worker at `lobby.getdasha.com`).  
**Product constraints (non-negotiable):** one room; anon nick; no DMs; no Discord/Telegram HQ; concise affirmative coin copy; sourced claims; allowlisted links only; short retention; less is more / Ponytail.

**Live targets:** https://www.getdasha.com/#lobby · https://lobby.getdasha.com/health · `wss://lobby.getdasha.com/ws`

---

## A. Bugs to fix (must)

1. **Double `hello_ok` on connect** — DO sends empty `hello_ok` then another after nick; client wipes the log twice. Connect should send a lightweight `ready`/`pin` only; full history only after successful `hello`.
2. **Chat race before ready** — client may send `chat` immediately after `hello` without waiting for `hello_ok`; queue or block until ready.
3. **Join spam** — every re-hello (nick focus/change) broadcasts “X joined”; only broadcast when nick is newly set or actually changes.
4. **Nick collisions** — two users can share the same nick; reject or force uniqueness (reject with clear error is enough).
5. **Presence count drift** — count includes half-closed sockets; recompute from live sockets only; broadcast on close after a tick if needed.
6. **Inline client drift** — landing embeds a hand-copied minified client vs `dasha-lobby-client.js`. Source of truth + sync check/build so ship cannot diverge.
7. **Rate-limit UX** — server returns `waitMs` but client only shows error string; show “wait Ns” and disable send briefly.
8. **XSS surface** — keep textContent for message bodies (already); if linkifying, only allowlist hosts and use `rel=noopener noreferrer` + https only.
9. **Missing discovery** — hero/micro/endband/skip don’t surface Lobby; add minimal links without clutter.
10. **Tests weak** — structure-only tests; need deeper mod cases, client protocol unit hooks if any, live integration smoke, landing asserts permanent `lobby.getdasha.com` URL.

## B. Features to add (should — thin, useful)

1. **Connect protocol cleanup** — `ready` with pin; `hello` → `hello_ok` with history/you/presence; optional `pong`.
2. **Char counters** on nick + message (live remaining or used/max).
3. **Linkify allowlisted URLs only** in rendered chat lines.
4. **Pin row: copy full mint** + short mint display (already partial).
5. **Flood filters in mod** — identical message repeat within window; extreme CAPS (e.g. >70% letters uppercase and length ≥12); expand scam patterns lightly (seed phrase variants, “air drop”, wallet connect claim).
6. **Connection cap** per room (e.g. 80 sockets) with clear error and close.
7. **History prune alarm** on DO (periodic prune + persist) so hibernation doesn’t leave stale storage forever.
8. **Quiet presence** — status “Live · N here”; optional compact nick list max 12 names (truncate).
9. **Client reconnect** — keep nick; auto-hello on open; exponential backoff (already); stop reconnect after destroy; don’t stack sockets.
10. **Embed sync tool** — `dasha-lobby-embed-build.mjs --check|--write` for landing inline block.
11. **Ship gate** — include lobby tests in `dasha:test:lobby` / prep path; live-verify marker for lobby URL on home.
12. **Accessibility** — log `role=log`; focus management; form labels already; ensure reduced-motion doesn’t break; 48px targets (already).

## C. Features explicitly out of scope (do not build)

- Accounts, auth, wallets, Discord bot, multi-room, DMs, reactions, uploads, price bots, FOMO timers, “official” badge, moderation dashboard UI, long-term message archive, push notifications.

## D. Audit checklist

- [ ] No thesis/receipt/Telegram/Discord invite links on home lobby section  
- [ ] No “safe/verified/official mint” claims  
- [ ] Origin allowlist enforced on browser WS (403 for evil origin) — live verified  
- [ ] Automod blocks airdrop/seed/t.me  
- [ ] Rate limit works  
- [ ] Multiparty broadcast works  
- [ ] Mobile layout: form stacks, log scrolls, no horizontal overflow  
- [ ] CSP-safe (no inline event handlers with untrusted data)  
- [ ] Worker SECURITY headers on HTTP  
- [ ] Docs (`DASHA-LOBBY.md`) match live URLs  

## E. Test plan (must pass before ship)

1. `node dasha-lobby-mod.test.mjs` — nick, message, rate, flood, links, CAPS, uniqueness helpers  
2. `node dasha-lobby.test.mjs` — structure + permanent WS URL + no Discord invites  
3. `node dasha-lobby-embed-build.mjs --check`  
4. `node dasha-landing-mint-check.test.mjs` + `node dasha-landing.test.mjs`  
5. Local or live WS integration: multiparty, rate, automod, evil origin 403, nick taken, connect protocol  
6. Deploy worker + `npm run dasha:ship` (or home push) + curl live home for `lobby.getdasha.com`  

## F. Execution order

1. Pure mod enhancements + tests  
2. Worker protocol + caps + prune alarm + nick uniqueness  
3. Client UX + linkify + rate wait + ready race fix  
4. Embed sync + landing discovery links  
5. Full test suite  
6. Deploy + ship + live verify  

## G. Done when

- All tests green  
- Live health OK; multiparty chat OK  
- www home shows `#lobby` and `wss://lobby.getdasha.com/ws`  
- Double hello / join spam / chat-before-ready fixed  
- No product constraint regressions  
