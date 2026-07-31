# Demigod design spec — v598 (self-prompt, 2026-07-17)

Authored after: peer-reviewed research pass (115 claims → 8 survived), craft-site study,
marketplace-peer study, Fable architecture ruling, and direct verification of every constraint below.

## Non-negotiable constraints (VERIFIED by command, do not re-derive)

| Constraint | Evidence |
|---|---|
| Head is **48,211 / 50,000 chars**. Overflow returns 200 + "saved" + a verifying readback, then **silently keeps the old head and every later ship no-ops** (cost 83min once). | `wc -c demigod-head-minimal.html` |
| **ALL new CSS/JS goes in `demigod-foot-core.js`** (jsDelivr, no cap, 284,776 bytes). Nothing in head. | — |
| Canvas still holds dishonest copy (re-measured 2026-07-23): `Human-Matched` ×2 outside scripts (h2 + footer tagline; +2 scrub regexes in foot = 4 total string hits), `mailto:hello@` ×3, `hello@trydemigod` ×5 outside scripts. Foot scrubs load-bearing until Designer retext ships. Public contact SoR = **potter@** only. | `curl` live |
| Canvas element restructuring **cannot** be headless (Designer API = iframe). Data API retexts existing nodes only. | webflow docs |
| Verify a ship by **Last Published moving**, NOT by `truth` (truth reads files; goes green while server keeps old head). | memory |
| No new deps, no build step, no framework. One IIFE, must pass `node --check`. | — |
| Honesty: 0 placements, no fake proof/scarcity, no SLA, contact = potter@trydemigod.com. | CLAUDE.md |

## Evidence that shapes the design

- **Progress bars debunked** (meta-analysis, 32 RCTs, LOR=0.072, p=.365, sig in 2/18). Constant-speed = no benefit. Fast-to-slow works *by deceiving the user* → forbidden by honesty rule. **But debunked ≠ harmful: keep "Step N of total"** (truthful, `aria-live` wired, aids orientation).
- **Endowed progress / goal-gradient real** (19%→34%) but manipulation is *bogus advancement* → forbidden.
- **Inline (on-blur) validation is WORSE than batching after submit**; errors adjacent to field beat summaries (n=303). **Already correct in foot-core — do not touch.**
- **Zeigarnik does not replicate; Ovsiankina resumption does** → save-and-resume is the one supported mechanic.
- **Conversational wizard format: unsupported** (all claims refuted 0-3). Typeform's "2× completion" is vendor marketing. → *Unsupported is not a mandate to rewrite.* Keep 13 steps.
- Zero surviving evidence on: trust signals, privacy assurance, social proof, scarcity, aesthetic-usability, first impressions.
- No peer models honest zero-proof. The only honest lever peers use is **risk-reversal/policy claims** (Underdog: "Your profile is invisible. Your employer is blocked."). We already do this in WIZ hints — it's buried in the form instead of led with.

## Work items, in order

### 1. Revive `offerAbandon` via sessionStorage draft — BUG, highest value
**Verified dead:** `setItem(dgWizSave*)` = **0 occurrences**; `getItem` = 2; `removeItem` = 2; `var resumeStep = 0` hardcoded; `// v597: no draft persistence`.
→ `offerAbandon()` computes `n=0` → `if(n<2)return` always fires → **drop-off lead capture dead since v597**.

**Fix:** write `SAVE_KEY` to **sessionStorage** on each step advance; read it for `resumeStep`; clear on submit.
- sessionStorage (not localStorage): same-session resume only = the Ovsiankina case (accidental close, back button, misclick). No TTL, no consent UI, no cross-session surface (which v597 was right to object to).
- `offerAbandon` must read sessionStorage too, else it stays dead.
- ~6 lines. No dark patterns. Cleared on submit.

### 2. Cut REQUIRED fields, not steps
Every removed required field is *guaranteed* less work; every restructure is speculative.
- Required: **contact, role, 90-day outcome**.
- Optional: comp range, LinkedIn, resume, phone, portfolio, team size, timing.
- Keep 90-day free-text **required**: highest friction *and* the matching key. Deliberate trade.

### 3. `/events` → in-flow page (kills the popup)
**Current:** `#dg-page{position:fixed;inset:0;z-index:10050;background:rgba(6,6,6,.92);backdrop-filter:blur(10px);overflow:auto}` — a full-screen overlay. `/events` returns 200 as a real Webflow page (80,214 bytes) but `"Events Bot"` appears **0×** in raw HTML → zero SEO, dies without JS.

**Phase 1 (headless, today):** render `#dg-page` in-flow — static position, no backdrop/blur, no body scroll-lock, document scroll, back-button works, focus moves to page `<h1>`, underlying Webflow sections hidden while open.
**Phase 2 (queued for next open Designer):** real `/events` canvas skeleton with real copy → SEO + survives JS failure. **Only after that lands, delete `events` from `DG_PAGES`.**
Phase 1 must not be allowed to quietly become the permanent answer.

### 4. Scroll reveal — fail-visible, marketing sections only
No library (GSAP/Lenis/WebGL are a bad trade for a form-bottlenecked site with a documented animation-breakage history).
- `IntersectionObserver` + class toggle + CSS transition. ~26 lines.
- **Content must NEVER be hidden waiting for JS.** Default = visible. Only *add* the hidden class from JS after confirming IO exists, then reveal. If IO never fires (bfcache, print, error, old browser) content stays visible.
- `prefers-reduced-motion: reduce` → short-circuit entirely.
- **Never** animate a modal, the WIZ, or the money path.

### 5. One asset: OG/Twitter card for `/events`
`DG_ART` is already on pinned jsdelivr `@b22473c0` (expiring-host issue already fixed — nothing to do).
Needed: one OG image so the bot link previews when potter shares it in a DM. That's GTM = the actual phase.
**Skip all decorative asset generation** (hero variants, per-page art, icon sets) — work that reaches no one.

## Do NOT
Add a motion library · animate a modal or the money path · rewrite the wizard · remove the step counter ·
ship a fast-to-slow bar (deceptive) · touch the head (1,789 bytes left) · touch a scrub ·
restore cross-session localStorage without consent UI · generate decorative assets.

## Verify
`node --check` → `npm run demigod:verify:source` → board-honesty → ship → **confirm Last Published moved**.
