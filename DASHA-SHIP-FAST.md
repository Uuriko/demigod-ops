# Dasha fast ship

**Updated:** 2026-08-08

Publishing used to mean: many one-off MCP scripts, full CDP test suite (2–4+ minutes), how-to-buy ceremony, and separate publish. That is replaced by **one script**.

## One command

```bash
# Prepare embeds + fast gate only (~few seconds, no browser)
npm run dasha:gate:fast

# Full ship when Webflow token is valid (prep + fast gate + 4 embeds + publish + curl verify)
export DASHA_WF_TOKEN='…'   # or: printf '%s' '…' > /tmp/dasha-wf-token.txt
npm run dasha:ship

# Push embeds without site publish
npm run dasha:ship:push

# Slow path: full Puppeteer suite before ship
npm run dasha:ship:strict
```

## What got faster

| Before | After |
|--------|--------|
| 5 separate `dasha-call-webflow-*.mjs` + manual JSON | **One** `dasha-ship.mjs` |
| New MCP TCP/auth per surface | **One connection**, four sets, one publish |
| `dasha:test:all` (CDP × many pages) on every ship | **Fast static gate** by default; `--strict` optional |
| How-to-buy page create in every checklist | **Omitted** until route exists (404) |
| Human multi-step PUBLISH-PAYLOAD | `npm run dasha:ship` |

## Token

1. Prefer a **valid** Webflow site/MCP bearer in `DASHA_WF_TOKEN` or `/tmp/dasha-wf-token.txt`.
2. REST `api.webflow.com` may 401 while MCP still works (or neither). Ship fails fast with a clear error — no CDP thrash against the bot wall.

## Surfaces shipped

| Route | Source |
|-------|--------|
| `/` | `dasha-landing.html` |
| `/studio` | `dasha-studio-embed.html` (from `dasha-meme-studio.html`) |
| `/lobby` | `dasha-lobby-page.html` |
| `/dasha` | desk embed shell from `dasha-desk/build.mjs --write` |

## Verify

```bash
npm run dasha:ship:verify
# or after ship: cat /tmp/dasha-ship-verify.json
```

## Landing size budget

| Limit | Value | Enforcement |
|-------|-------|-------------|
| Hard cap | **49000 UTF-8 bytes** | `fastGate` fails ship |
| Soft budget | **48000 UTF-8 bytes** | `fastGate` logs `gate:fast:warn` |
| Prefer | leave **≥1KB free** | Room for skip links / a11y without a crisis cut |

Gate measures **bytes** (`Buffer.byteLength`), not only JS `string.length` (non-ASCII undercount).

```bash
wc -c dasha-landing.html
npm run dasha:gate:fast   # includes size log
```

If over budget: cut dead CSS/copy, merge media queries, or move UI to `lobby.getdasha.com/client/*` — do not invent a second homepage pipeline.

## Ship order (do not reorder casually)

1. prep (desk/studio/lobby assets + embeds)  
2. fast gate (mint, bans, **landing bytes**, embed freshness)  
3. **lobby Worker deploy** (assets hash match)  
4. push **studio → lobby → desk → home last** with **mandatory readback hash**  
5. publish site  
6. live audit (retries for O2O lag)

Partial failure modes to remember: lobby ahead of home, Designer ok / live stale, empty HtmlEmbed ghosts.

## Do not

- Re-introduce multi-script publish loops
- Block ship on how-to-buy 404
- Run CDP by default for every content tweak
- Grow homepage inline HTML past the soft budget without a plan
- Treat `push:ok` without readback as success
- Leave disabled half-features in the client (delete or flag+test)
