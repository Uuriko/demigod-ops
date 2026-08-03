# Demigod website master prompt (Grok + Fable + Codex swarm)

**Product:** trydemigod.com — SF human-matched talent. 10% on hire. Mutual yes. No fake board/SLA.
**Canonical site JS:** `demigod-foot-core.js` only. Head CSS: `demigod-head-styles.css` / `demigod-head-minimal.html`.
**Release rule:** Freeze may be ON → **disk work OK**; **no CDN/Webflow mutate** unless freeze OFF + lock.
**Verify:** `npm run demigod:verify:source` · board honesty · `node demigod-foot-smoke.mjs` · local WIZ playtest if forms touched.

## Mission
Make the **frontend awesome**: clear paths for **hiring managers/startups** vs **talent/engineers**, polished visual hierarchy, honest copy, zero confusing duplicate CTAs, mobile excellence, accessibility, conversion clarity.

## P0 bug (user-reported)
Top/hero buttons both read like **“I’m hiring”** (or both company-side: FIND TALENT + HIRE TALENT).
**Required pair:**
| Audience | Label (canonical) | Modal / wiz |
|----------|-------------------|-------------|
| Startup / hiring manager | **I'm hiring** | `#startup-modal` / `?wiz=startup` |
| Talent / engineer | **Find a job** (or **I'm looking**) | `#jobseeker-modal` / `?wiz=engineer` |

Never map both Webflow “FIND TALENT” and “HIRE TALENT” to company. Second hero button = talent.

## Audit checklist (every detail)
### Navigation & CTAs
- [ ] Hero: exactly one hire + one talent CTA, distinct labels, correct modals
- [ ] Nav: primary hire + secondary talent (or clear dual); no duplicate “I'm hiring”
- [ ] Mobile sticky bar: hire + talent, 44px targets
- [ ] Pricing CTA = hire only; not talent
- [ ] Footer: no junk Webflow columns; hello@trydemigod.com; legal links
- [ ] Path pills under hero if present: same dual meaning

### Copy honesty
- [ ] No 48h SLA / founder names on live-facing
- [ ] No “90-day replacement **guarantee**” until real — use outcome language only
- [ ] Payments/SMS: pending language
- [ ] Board/roles: sample labels, not “Live roles hiring now” as fake live
- [ ] Process steps: human-paced, no “Lightning Fast / 100% Vetted” hype

### Visual / UX
- [ ] Hero H1 readable, contrast, no layout thrash
- [ ] Gold `#C9A84C` / black / stone system consistent
- [ ] Spacing rhythm; cards not cramped
- [ ] Trust / how-it-works / pricing / FAQ scannable
- [ ] Modals: focus trap, labels, 16px inputs mobile, review step intact

### Forms / WIZ
- [ ] Startup: 90day-outcome required, review step
- [ ] Engineer: clear fields, SF honesty
- [ ] Success copy: hello@trydemigod.com follow-up

### Technical
- [ ] Foot version bump after changes; one writer + foot lock
- [ ] Source verify green; no invent pilots
- [ ] Live vs disk: under freeze drift expected — fix disk first; prepare ship when unfrozen

## Agent roles
| Agent | Job |
|-------|-----|
| **Fable** | Plan only: priority ordered fix list + touch files + risks |
| **Codex A** | CTA/nav/modal identity audit — false dual-hire FAIL |
| **Codex B** | Copy honesty / guarantee / sample roles FAIL cases |
| **Codex C** | Visual/a11y/mobile FAIL cases |
| **Grok** | Implement foot-core (+ head if needed), verify, lock, no false ship |

## Acceptance (ship claim only when true)
1. Live OR local with new foot: hero CTAs show **I'm hiring** + **Find a job** (distinct), correct modals.
2. No two top CTAs with same hire meaning.
3. `npm run demigod:verify:source` PASS.
4. WIZ ownership selftest PASS if forms touched.
5. No “guarantee” SLA language without real service.
6. Document residual: freeze blocks live until publish.

## Non-goals
Game work · invent pilots · dual-NEXT · dash thrash · auto-publish under freeze without human.

## Working style
Write findings to `/tmp/dg-busy/swarm-site/`. Grok consolidates and implements. Prefer one cohesive foot-core pass over many half-fixes.
