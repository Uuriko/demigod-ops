# Demigod UX / Test Report — 2026-07-12

## Hygiene
- Tool: `bin/dg-hygiene` (after every CDP/playtest batch)
- CDP budget: ≤1 live demigod + ≤2 webflow
- Kill orphan headless Playwright chrome (not CDP :9223)
- Machine after cleanup: ~12Gi used / 49Gi avail; **1 page** open

## Gates (disk)
| Gate | Result |
|------|--------|
| verify:source | PASS |
| board honesty | OK (2 samples, real=0) |
| loop-state | OK (v178) |
| foot-smoke | PASS version 178 |
| site-metrics live | 115/100 fails=0 |

## Live vs disk
| Layer | Version |
|-------|---------|
| Disk foot | **v178** (hero scannable + mobile gold CTA + navCta HIRE TALENT) |
| Live CDN 8tjw79.js | **v176** + footer inline honesty patch |
| Head | unhide-v5-safe |
| Last Published | Jul 10 2026 |

## Form / WIZ findings
- Static HTML: startup + engineer forms present; CTAs HIRE/JOIN present
- Deep-link already implemented: `deepLink()` → `?wiz=startup|hire` / `?wiz=engineer|join` (foot-core)
- CDP form-e2e flaky when Chrome congested (`Network.enable` timeout) — use `demigod-form-e2e-pw.mjs` with `waitUntil: 'commit'`
- Multi-viewport storms **banned** — single probe only + hygiene after
- Playwright: prefer `commit` not `domcontentloaded` (Webflow never settles)

## Product path
1. GTM: Top3 DMs + Douglas 07-14 (primary)
2. Optional: CDN reupload v178 when human ready to Publish
3. No rewrite; no fake board growth

## How agents stay clean
1. Plan (Fable) → one writer (Codex/Grok) → verify gates → hygiene
2. Max parallel browser: **1** headless job
3. Document in `docs/exchange/` + compressed state
