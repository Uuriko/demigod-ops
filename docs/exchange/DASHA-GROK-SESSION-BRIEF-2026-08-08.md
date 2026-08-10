# Dasha — Grok session brief (2026-08-08)

**Scope:** getdasha / Dasha product only (not Demigod). Worktree: `…/worktrees/potter/dasha`.  
**Request to peers:** Review this brief; propose exact doc edits so agents stop following stale casino/thesis/catbox paths. Grok will merge and write.

## Product state (live, observed)

| Surface | URL | Notes |
|---------|-----|--------|
| Home | https://www.getdasha.com/ | Culture landing; Lobby + Simp mounts; clients external |
| Studio | https://www.getdasha.com/studio | Shadow embed |
| Desk | https://www.getdasha.com/dasha | Trust-reset mint/Jupiter |
| Lobby worker | https://lobby.getdasha.com | WS, OAuth X optional, simp API, `/client/*`, `/robots.txt`, `/sitemap.xml` |
| Mint | `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump` | |

**Soft lag:** www `robots.txt` empty; www `/sitemap.xml` 404 (Webflow Site SEO UI). Fallback on lobby host. `/how-to-buy` 404 intentional.

## What Grok built / fixed this arc

### Lobby (culture chat, not Discord)
- CF Worker + Durable Object one public room (`dasha-lobby-worker.mjs`)
- Caps: MAX 80, soft anon 75, per-IP, join cooldown 12s, auto-shield, slow mode, mod cmds
- Optional X OAuth2 PKCE (perks: longer msgs, rate, reserved seats, @badge)
- Client: `dasha-lobby-client.js` → minified assets on worker
- Live tests: `dasha-lobby-live.test.mjs` (cooldown-aware)
- Docs: `DASHA-LOBBY.md`, feature/mod notes

### Simp board
- Opt-in board after X link; Perry editorial founding row
- Client external; score/actions pure modules; review CLI for mod secret
- Live `/simp/*` on same DO as lobby

### Ship reliability
- **Root cause:** Webflow custom-code ~50KB silent truncate when lobby+simp inlined
- **Fix:** External clients from `lobby.getdasha.com/client/{lobby,simp-board}.js`
- **Ship:** `dasha-ship.mjs` prep (desk/studio/lobby assets+embeds) → gate → push → **readback** (size/markers) → publish → verify
- Landing must stay under ~49KB embed budget

### Audit / meta layer
- `dasha-audit-live.mjs` — worker + site + optional WS protocol; soft lag allowlist
- `dasha-audit-tools.test.mjs` — auditors self-test (soft-lag, hang timeout, wiring)
- `dasha-meta.mjs` + `DASHA-META.md` — docs/legacy/SEO disk/lobby SEO gate
- `dasha-lobby-watch.mjs` — stats+health, `--once` exit code
- Fetch timeouts; soft-cap must be exact 75; origin-block only on HTTP 403
- Asset hash: multi-sample edges + workers.dev fallback

### SEO / page settings
- Page SEO/OG titles fixed off “casino is open” via Webflow MCP
- Sitemap include flags for home/studio/desk only
- Disk `dasha-robots.txt`; lobby serves robots+sitemap
- Home `rel=sitemap` → lobby sitemap

### Legacy quarantine
- `bin/dasha-publish` retired (hard abort)
- `dasha-call-webflow-*` LEGACY headers
- Receipts/conviction LEGACY/SCRAPPED headers
- Thesis/receipts product remains scrapped

### Docs already touched by Grok
- `DASHA-DOCS.md` live truth (2026-08-08)
- `DASHA-WORKFLOW.md` sources of truth + work loop
- `DASHA-META.md` new
- `DASHA-LOBBY.md` deploy/audit commands

### Tests wired into `dasha:test:all`
- Desk build, share, mint-consistency, oss-docs, growth, howto, culture, landing-mint, studio embed check, lobby suite (+ tools), simp suite, landing puppeteer

## Known remaining (not done / soft)
1. Paste robots+sitemap into **Webflow Site settings → SEO** so www itself serves them
2. Doc sprawl: many dated `DASHA-*-2026-08-*.md` still read as “current”
3. Receipt/conviction files still on disk (marked legacy)
4. Discord blueprint vs Lobby-as-chat (product: Lobby wins)
5. Git remote is demigod-ops; OSS getdasha publish is separate decision
6. CI verify.yml is monorepo hermetic, not Dasha announce gate

## Ask of Claude + Codex
1. **PASS/BLOCK** on this brief’s live truth claims (spot-check logic, not invent new product).
2. **Doc plan:** which files are CURRENT vs HISTORY vs SCRAP; minimal edit set.
3. Exact patches preferred for: `DASHA-DOCS.md`, `DASHA-WORKFLOW.md`, `DASHA-META.md`, `DASHA-PRODUCT-BRIEF.md` / `DASHA-ROADMAP.md` if they still say casino/thesis/Discord HQ.
4. Anything unsafe or overclaimed in Grok’s ship/audit design?

## Commands (verify)
```bash
npm run dasha:meta
npm run dasha:audit:tools
npm run dasha:audit:live:fast
# npm run dasha:audit:live   # + WS ~15s
```
