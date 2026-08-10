---
status: scoped
canonical_for: lobby-worker-and-simp-board
defers_webflow_to: /home/potter/DASHA-WORKFLOW.md
---

# Dasha Lobby/Board workflow

Updated: 2026-08-08

## Scope

Dasha is the active project. This worktree owns Lobby/Board Worker code. `/home/potter` owns Webflow Home, Studio, Desk, the release contract, and site publishing. Webflow files in this worktree are observed legacy snapshots; do not publish them.

## Sources of truth

| Concern | Canonical source | Generated or observed surfaces |
|---|---|---|
| Start here | [`DASHA-DOCS.md`](DASHA-DOCS.md) | Live truth table |
| Meta / SEO / legacy | [`DASHA-META.md`](DASHA-META.md) | `npm run dasha:meta` |
| Plain product definition | [`DASHA-PRODUCT-BRIEF.md`](DASHA-PRODUCT-BRIEF.md) | Landing copy must not contradict it |
| Work order | [`DASHA-ROADMAP.md`](DASHA-ROADMAP.md) | Current playground section only |
| Strategy / trust language | [`DASHA-PRODUCT-STRATEGY.md`](DASHA-PRODUCT-STRATEGY.md) | Historical strategy may lag; prefer brief + docs |
| Discord blueprint | [`DASHA-DISCORD-BLUEPRINT.md`](DASHA-DISCORD-BLUEPRINT.md) | **Optional / secondary** — Lobby is live on-site chat |
| Public homepage embed | `/home/potter/dasha-landing.html` | Worktree copy is an observed legacy snapshot |
| Meme Studio | `/home/potter/dasha-meme-studio.html` | Worktree copy is an observed legacy snapshot |
| Desk (mint/trust) | `/home/potter/dasha-desk/src/*` + build | Live `/dasha` |
| Token-facing facts | `dasha-desk/config/dasha.json` + mint in lobby/landing | `dasha-mint-consistency` |
| Lobby + Simp | `dasha-lobby-worker.mjs`, clients, `dasha-simp-*` | Live `lobby.getdasha.com` |
| Webflow ship / publish | `/home/potter/dasha-ship.mjs` | Root release contract → readback → publish → verify |
| Worker/live compatibility audit | `dasha-audit-live.mjs` | Useful for Worker state; root release contract owns Webflow truth |
| Tools self-test | `dasha-audit-tools.test.mjs` | `npm run dasha:audit:tools` |
| Peer session brief | `docs/exchange/DASHA-GROK-SESSION-BRIEF-2026-08-08.md` | Claude/Codex review 2026-08-08 |

Never treat catbox or `bin/dasha-publish` as ship paths (retired). Run `node dasha-desk/build.mjs --write` after desk source edits; run lobby assets+embed builds before lobby deploy/ship.

## Work loop

1. **Orient** — Read [`DASHA-DOCS.md`](DASHA-DOCS.md), then brief/roadmap/meta. Verify live pages; do not trust dated audits as current.
2. **Choose one lane** — Home/Studio/Desk embeds · Lobby+Simp · Ship/SEO · Research/trust copy · Docs.
3. **State the smallest outcome** — User-visible result + proof.
4. **Edit canonical sources** — No thesis/receipts revival; Lobby is chat (Discord optional).
5. **Build and verify**

   ```bash
   npm run dasha:meta
   npm run dasha:audit:tools
   npm run dasha:test:all
   npm run dasha:audit:live:fast
   # explicit mutating WS protocol (~15s): npm run dasha:audit:live -- --protocol
   ```

Routine tests and audits are read-only against production. Studio browser tests intercept metrics; quiz smoke is local by default and `--live` remains read-only. Only `--live-write`, `--protocol`, and the explicitly named `dasha:test:lobby:live` command may create synthetic production activity.

6. **Publish only with current authorization** — Webflow: `node /home/potter/dasha-ship.mjs --ship`. Worker-only deploys use this worktree's Wrangler configuration. Never run this worktree's legacy `dasha-ship.mjs --ship`; never catbox. When dogfooding, pass the absolute root ship path because the wrapper intentionally changes its child cwd to `/home/potter`.
7. **Handoff** — Live vs local, verification results, next unblocked Dasha task.

## Ship preflight (prevent regressions)

Homepage is a **Webflow custom-code embed** with a hard **~49KB UTF-8** ceiling. Most breakage is at **boundaries** (size, publish lag, partial ship, agent half-state) — not the mint.

```bash
# 1) Landing budget (gate uses UTF-8 bytes; soft budget 48KB, hard 49KB)
wc -c dasha-landing.html
node dasha-ship.mjs --prep --gate   # or: npm run dasha:gate:fast

# 2) Generated artifacts must match sources
node dasha-desk/build.mjs --check
node dasha-studio-embed-build.mjs --check
node dasha-lobby-assets-build.mjs --check

# 2b) Before a crypto-facing release, verify durable live identity facts (networked)
npm run dasha:onchain:check

# 2c) Verify DNS/TLS/redirect/HSTS and Lobby browser policy (networked)
npm run dasha:domain:check

# 3) Ship only when authorized (order is intentional)
#    prep → gate → lobby hash check/deploy → push studio→lobby→desk→home last → readback hash → publish → live audit
npm run dasha:ship
```

### Boundary rules (standing)

| Rule | Why |
|------|-----|
| Prefer **new interactive weight** on `lobby.getdasha.com/client/*` | Home cannot grow forever |
| After any home edit, leave **≥1KB free** under 49KB | A11y/skip/copy should not block ship |
| **Readback hash must match** after each embed push | `push:ok` alone lied / truncated |
| **Home last** in multi-surface ships | Highest-risk surface; reduce stale-home races |
| Live audit with **retries** after publish | Webflow O2O / edge lag |
| Disabled features: **delete or flag+test** | Half-finished gate code was a re-enable hazard |
| Injected UI must survive mobile nav CSS | e.g. `.navlinks>a:not(.pill){display:none}` |
| X = **identity + share intents**, not yap farms | Product brief + peer consensus 2026-08-08 |
| First-visit Connect X is **optional** (dismiss / Esc / Not now) | Never block the site; board join still explicit after link |
| Peer sync: short exchange doc + OWN WORK / RISKS / NEXT | Chat memory is not truth |

Desk ghost HtmlEmbeds (nav / sticky-fix): never clear without backup + element IDs. Product desk embed id is canonical in `dasha-ship.mjs` (`SURFACES.desk`).

## Status vocabulary

- **Observed:** fetched from the public surface this session.
- **Prepared:** source matches generated artifacts; not necessarily public.
- **Published:** intended public URL fetched after publish contains expected markers.
- **Blocked:** external capability prevents the action.
- **Proposed:** strategy or future behavior, not built.
- **Soft lag:** known incomplete (e.g. www robots) that does not block announce-ready.

Do not call a local commit, upload receipt or Webflow save “published.”

## Current publication matrix

Observed **2026-08-08** (see also `DASHA-DOCS.md`):

| Surface | State | Truth |
|---|---|---|
| Home `/` | Published | Culture landing + Lobby + Simp; external clients from lobby host |
| Studio `/studio` | Published | Meme Studio embed |
| Desk `/dasha` | Published | Trust-reset mint/Jupiter |
| Lobby worker | Published | `lobby.getdasha.com` health/WS/OAuth/clients/robots/sitemap |
| www robots/sitemap | Soft lag | Empty/404 until Webflow Site SEO; lobby fallback live |
| how-to-buy | Live | Worker-served buying guide; crawlably linked from Home footer |
| Catbox / thesis publish | Retired | Do not use |
| Discord | Optional blueprint | Not HQ |

## Documentation rules

- One fact, one owner document. Prefer `DASHA-DOCS.md` for live truth.
- Dated `DASHA-*-2026-08-*.md` reviews are **history** unless marked current.
- Strategy/roadmap historical sections must not be executed.
- New docs go on [`DASHA-DOCS.md`](DASHA-DOCS.md) with status.

## Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-08-08 | Lobby is on-site public chat; Discord secondary | Control + no Discord dependency for core loop |
| 2026-08-08 | External lobby/simp clients; ship readback fail-closed | Webflow ~50KB silent truncate |
| 2026-08-08 | Thesis/receipts/catbox ship paths scrapped or retired | Pivot to culture playground |
| 2026-08-08 | Landing size: UTF-8 byte cap + 48KB soft budget; X gate off; X-intent share only | Peer sync + Webflow cap incidents |
| 2026-08-06 | Desk primary mint surface; no unofficial Telegram | Provenance |

## Next workflow improvements

1. Webflow Site SEO: paste `dasha-robots.txt` + custom `dasha-sitemap.xml` on **www**.
2. Keep `dasha:meta` + live audit green after every ship.
3. Observe Simp opt-in evidence before new scoring machinery.
