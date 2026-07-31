# Demigod bloat / complexity cut pass — 2026-07-13

## Goal
Keep site fixed (no blank body), shrink thrash surface, keep WIZ/CTA, multi-agent busy on audits.

## Shipped this pass

### Foot **v189**
- `dgIsPageShell` + `dgHide` — never hide `body/html/main/hero/nav/footer/modals`
- `hideCard` simplified to use shell guard (root blank-page class of bugs)
- Less thrash: show force interval 8→4, RAF unhide 20→8, enhanceWIZ MO 12/6s→6/3s, dedupe schedule 3→2 ticks
- `scrubStaticLabels` lorem hide: **only** `.step-card`/role-cards (not all `section,div`)
- `forceMainVisible` forces `body/html { display:block }`

### Footer **v37**
- Body display guard script (last-line defense if anything re-hides body)
- Foot CDN pointed at v189
- Product JS loaders kept distinct (map6)

### Head
- Unhide CSS includes `display:block!important` on html/body (from v188)

## Do **not** delete yet (high risk)
- WIZ stepper (`wizBuild`/`showStep`) — core product
- `forceMainVisible` — fights Webflow IX (keep, already slimmed)
- Path pills / mobile bar / honesty scrub (GTM + policy)

## Next safe cuts (when stable 24h)
1. Collapse duplicate scrub paths (`scrubTimeClaims` vs early head scrub)
2. Remove dead OAuth stub noise at end of foot if unused
3. Archive stale demigod-heavy-*.mjs / exchange docs to `docs/archive/`
4. Add CDP smoke gate: `body.display==='block' && h1.height>20`
5. Real Webflow pages for `/hire` etc. (kill `?p=` + 404)

## Multi-agent status
- Fable `bin/df`, Claude Sonnet, Codex CLI invoked; Codex/Fable may rate-limit — Grok applied high-confidence cuts without waiting on full essays.
- Full troubleshooting: `docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md`

## Workflow optimizations applied
- Never bulk-replace all `files.catbox.moe/*.js` (corrupts product map)
- Publish via UI when API 412
- Measure blank via **body display + rect**, not HTTP alone

## v190 (Claude list applied)
- Removed enhanceWIZ full-DOM MO
- Removed seenTop dedupe loop
- Removed delayed [1200,3500] dedupe/scrub
- Removed t=50 forceMainVisible
- show() force interval 4→2
- Live CDN: f5r4yt.js
