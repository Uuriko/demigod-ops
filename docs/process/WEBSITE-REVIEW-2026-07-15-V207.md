# Website code + design review — 2026-07-15 (v207)

## Scope
`demigod-foot-core.js`, `demigod-head-minimal.html`, `demigod-head-styles.css`, `demigod-footer-lite.html`, live trydemigod.com.

## Design verdict
**Pass for simplicity.** Home is a Wellfound-style decision screen (~350 chars). Secondary content lives in short `?p=` dialogs (How, Pricing, FAQ, Compare, Legal). Dual CTAs consistent on desktop + mobile bar.

## Live checks (CDP)
| Surface | Result |
|---------|--------|
| Home bodyLen | ~346 |
| Hero CTAs | I'm hiring / Find a job |
| Footer | How · Pricing · FAQ · Compare · Legal · email |
| `?p=how` | Opens, title correct |
| `?p=pricing` | Opens |
| `?p=faq` | Opens |
| Foot version | 207 (`jrm4vt.js`) |

## Code review findings

### Fixed this wave
- Restored missing `cta()` (v205) — labels + mob bar
- Simple pages router + path redirects in footer loader
- Footer CDN publish template no longer wipes routes
- Escape closes pages; popstate guarded for smoke VM
- Hide mobile bar while page open
- org JSON-LD deferred to idle

### Remaining (non-blocking)
1. **Foot bundle size ~138KB** — still one file; later split optional pages to CDN HTML if needed  
2. **Triple boot (0/400/1500ms)** — reliability vs perf tradeoff; keep until Webflow late paint is proven fixed  
3. **Webflow Designer sections still in DOM** (display:none) — dead weight; delete in Designer when time  
4. **queue-publish API 412** — UI publish path works; refresh Webflow auth periodically  
5. **No real OG image unique per page** — share cards use hero; fine for pilot  
6. **WIZ still multi-step** — intentional; shorten welcome copy later  

### Cohesion
- Tokens gold/black/cream consistent  
- CTA radius 12px hire solid / talent outline  
- Favicon geometric D matches brand  
- Honesty: pending SMS/payments, no SLA  

### A11y
- Skip link, dialog role on pages, 44px targets on page CTAs  
- Focus on close button when page opens  
- Trap focus inside page dialog still soft (Escape works)

### Performance notes
- Catbox CSS/JS cached; hero image catbox  
- Avoid re-adding FAQ/trust essays on home  
- Idle org JSON-LD  

## Gate status
`npm run demigod:verify:source` PASS · foot-smoke v207 PASS

## Freeze
Recommend freeze ON after live confirm v207.


## Provenance (reconciled later same day)

- Live confirmed: foot `jrm4vt.js` v207, CSS `cycbs6.css`.
- Git tip at reconcile: `8f6f838` (v205); working tree holds v206–v207.
- Full agent synthesis: `docs/exchange/DEMIGOD-SESSION-STATUS-2026-07-15-WEBSITE.md`.
- Codex session summary: `/tmp/codex-demigod-session-summary.md` (session artifact).
