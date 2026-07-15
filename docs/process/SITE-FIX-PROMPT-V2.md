# Demigod site fix prompt V2 — perfect frontend ASAP

You are auditing/planning for **trydemigod.com** (Demigod: SF human-matched talent, 10% on hire, mutual yes).

## Constraints (hard)
- **Only** edit `demigod-foot-core.js` for site JS (canonical). Head: `demigod-head-styles.css` / `demigod-head-minimal.html` if needed.
- Freeze may be **ON** → disk work OK; **no CDN/Webflow publish** unless freeze OFF + foot lock.
- Honesty: no 48h SLA, no fake live board, no guarantee language without real service; payments/SMS **pending**.
- Verify: `npm run demigod:verify:source` + `node demigod-foot-smoke.mjs` + wiz ownership if forms touched.
- Do **not** thrash game files. Do **not** invent pilots.

## Product UX truth
| Audience | Label | Opens |
|----------|--------|--------|
| Startup / hiring manager | **I'm hiring** | `?wiz=startup` / `#startup-modal` |
| Talent / engineer | **Find a job** | `?wiz=engineer` / `#jobseeker-modal` |

Never both CTAs company-side (FIND TALENT + HIRE TALENT both → hire).

## Disk vs live
- Disk foot may already be **v200** with dual-path CTA fix.
- Live may still be **v198** until ship — note residual; fix disk completely first.

## Your job (Codex / Fable)
1. List **remaining P0/P1** after v200 (visual, a11y, forms/WIZ, copy, FOUC, mobile).
2. Exact **functions** in foot-core to touch (`forceMainVisible`, `wizBuild`, `brandAssets`, `scrubTimeClaims`, modal CSS, etc.).
3. Acceptance tests (DOM assertions, labels, modals, contrast, mobile 44px).
4. Write to `/tmp/dg-busy/swarm-site/<YOUR-ID>.md`. **Plan only if Codex; Grok implements.**

## P0 themes (known from prior audits)
- FOUC / nuclear unhide fighting design
- WIZ multi-field flash; keyboard stealing Enter in textareas
- Triple mobile CTAs (hero + pills + bar) — unify labels
- Trust steps opacity 0 risk
- Static Webflow copy: guarantee, LIVE ROLES (scrub if residual)
- Form polish: labels, focus rings, review step, success copy
- Visual: spacing, type scale, card hierarchy, gold system consistency

## Output format
```
## Verdict
## P0 (must fix now)
## P1
## Touch map (function → change)
## Acceptance
## Non-goals
```
