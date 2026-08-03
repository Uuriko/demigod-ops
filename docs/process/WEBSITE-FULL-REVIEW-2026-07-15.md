# Demigod — Full Website Review (Merged)

**At:** 2026-07-15 · **Reviewer:** Grok + Fable + 4× Codex  
**Live:** https://www.trydemigod.com · **Disk foot:** v201 · **Live foot CDN:** v198 (`ksbrmy.js`)  
**Freeze:** ON (demand-first) · **Drift:** expected until ship  

**Raw swarm:**  
`FABLE-FULL-REVIEW.md` · `CODEX-CTA-FORMS.md` · `CODEX-COPY-FULL.md` · `CODEX-A11Y-VISUAL.md` · `CODEX-ARCH-SHIP.md`

---

## 1. Executive verdict

| Layer | Grade | Note |
|-------|-------|------|
| **Architecture** | C | Webflow shell + catbox foot + head unhide stack — works, but multi-engine FOUC |
| **Disk runtime (v201)** | B− | Dual-path CTAs fixed; WIZ/FOUC/honesty residuals |
| **Live runtime (v198)** | D | Dual **I'M HIRING** both → `startup`; stale honesty scrubs |
| **Live static HTML (no JS)** | F | FIND TALENT, HIRE TALENT, LIVE ROLES, 90-day guarantee, pre-vetted |
| **Forms / WIZ config** | B+ | Ownership selftest PASS (90day, review, no SLA) |
| **Forms / WIZ runtime** | C− | One-question flash, multi-field force, submit flag race |
| **Source gates** | A | `verify:source` PASS · board honesty OK · foot-smoke OK |
| **Ship readiness** | Blocked | Freeze ON — perfect live frontend **impossible** until ship v201 |

**One line:** Disk is a generation ahead of live; live still shows the dual-hire bug and static lies until unfreeze + CDN + paste + Publish.

---

## 2. Architecture (how the site is assembled)

```
Webflow Designer HTML/CSS (static product chrome)
    + head custom code (demigod-head-minimal.html + head-styles)
    + footer loader (demigod-footer-lite.html → catbox foot JS)
    → foot-core runtime rewrites CTAs, copy, WIZ, board, modals
```

| Asset | Disk | Live |
|-------|------|------|
| Foot JS | v201 | v198 `files.catbox.moe/ksbrmy.js` |
| CDN manifest | DEMIGOD-FOOT-CDN.json → 198 | matches live |
| Footer loader | points at ksbrmy.js | same |
| Head CSS | catbox `vjxyrf.css` + local styles | CF cache HIT |

**Critical path risk:** foot JS on third-party catbox (no SRI). Every ship needs new URL + footer rewrite + CM6 paste + Webflow Publish.

---

## 3. Live CDP evidence (runtime after foot v198)

| Finding | Evidence |
|---------|----------|
| Foot version | `foot: "198"` |
| Dual hire CTAs | Two buttons: **I'M HIRING** + **I'M HIRING**, both `modal: startup` |
| Mixed dual elsewhere | Also “Find a job” / “I'm looking” on pills/bar (inconsistent) |
| Scrubs partial | guarantee/liveRoles **false** in body text after JS (runtime cleaned some) |
| Modals present | `#startup-modal` + `#jobseeker-modal` exist |
| Path pills + mobile bar | Both present → **triple** dual-path chrome |

**Static HTML (curl, no JS):** FIND TALENT ×1 · HIRE TALENT ×2 · LIVE ROLES · guarantee · premium-btn ×8 · no `data-demigod-modal` until JS.

---

## 4. Product UX — hire vs talent

| Surface | Required | Live v198 | Disk v201 |
|---------|----------|-----------|-----------|
| Hero pair | Hire + Find a job | **FAIL** dual I'M HIRING | **PASS** (force pair) |
| Nav | Hire primary (+ talent secondary) | FIND TALENT static → runtime hire | Dual nav hire+talent |
| Path pills | Hire + Find a job | I'm looking/hiring mix | Find a job + I'm hiring |
| Mobile bar | Hire + Find a job | OK-ish on v198 | OK |
| Pricing CTA | Hire only | HIRE TALENT static | Hire forced |

**User-reported bug is CONFIRMED on live.** Disk fix exists (v200–v201); not shipped.

---

## 5. Forms / WIZ

| Check | Status |
|-------|--------|
| WIZ ownership (90day required, review, no SLA strings) | **PASS** disk |
| Startup + engineer modals in DOM | Present live |
| One-question Typeform contract | **FAIL** residual: sticky `.dg-wiz-show`, force 90day, review always shown, multi-field flash |
| Keyboard | v201: TEXTAREA safe Enter; arrows field-safe — still P1 polish |
| `dgSubmitting` flag | Race: can set on review entry (Codex) |
| Success copy | Runtime scrub toward hello@trydemigod.com; static Webflow success still weak |
| Smoke `ctaOk:true` with dual hire | **False confidence** in smoke (counts any dual modal, not correct labels) |

---

## 6. Copy honesty

| Claim | Live static | Disk runtime |
|-------|-------------|--------------|
| 90-day replacement **guarantee** | Present | Scrubbed → outcome language (v201) |
| LIVE ROLES / hiring now | Present | Relabeled sample (v200+) |
| pre-vetted / 3–5 ready to interview | Process body | Volume body residual |
| FIND TALENT + HIRE TALENT | Present | CTA remap |
| 48h/24h SLA | Not found | Guarded |
| COPY.feeNote / payments pending | — | Honest but **often unpainted** |

**Bottom line:** Honesty depends on JS. Crawlers / FOUC / no-JS still see Webflow lies.

---

## 7. Visual / a11y / mobile (score ~3.5–5/10 live)

**P0**
- Head unhide fights intentional hides / opacity 0
- Trust ledger may start `opacity:0`
- H1 hidden until JS spans
- Invalid skip-link href
- Multi-redesign CSS landfill (~46KB head-styles)
- Triple mobile dual-path chrome

**P1**
- Progress bar a11y roles
- Outline wars on inputs
- Modal mobile keyboard geometry
- Dual hero image (preload vs brandAssets catbox)
- Token inconsistency (#C9A84C vs #D4AF37)

**Salvageable:** 44–48px targets, modal focus trap direction, path pill labels on disk

---

## 8. Gates & tools inventory

| Gate | Result |
|------|--------|
| `npm run demigod:verify:source` | PASS |
| `demigod-foot-smoke` | PASS (disk v201) |
| `demigod-wiz-ownership-selftest` | PASS v201 |
| Board honesty | OK |
| Truth | Drift expected freeze ON disk 201 vs live 198 |
| Orient | Needs truth refresh after foot edits (hash mismatch) |

**Website-related tools (sample):** wiz CDP playtest, form e2e, forms full audit, mobile button playtest, foot CDN publish, ship OS, usertest.

---

## 9. Ranked backlog (what to do next)

### P0 — blocks “site looks great”
1. **Ship foot v201** when freeze OFF: lock → CDN → footer-lite → CM6 paste → Publish → `truth --require-match` → freeze ON  
2. **WIZ one-question ownership** (`showStep` clear `.dg-wiz-show`, no always-force 90day/review, fix `dgSubmitting`)  
3. **Head FOUC collapse** (shell-only unhide; kill global opacity:0 rule; H1 always visible)  
4. **Static Webflow honesty** (Designer or runtime scrub pre-vetted / LIVE / process body / guarantee before paint)  
5. **Mobile chrome** — hide path pills when `#dg-bar` visible (one dual-path system)

### P1 — polish
6. Paint `COPY.feeNote` on pricing card  
7. Trust opacity defaults + process grid consistency  
8. Smoke assert: exactly one hire + one talent on hero (kill false `ctaOk`)  
9. Skip-link `#main` + main landmark  
10. Single hero background ownership (head OR foot, not both)

### P2
11. Collapse head-styles layers  
12. Events page not hard-redirect to catbox HTML  
13. SRI / first-party host for foot JS  
14. Abandon dialog a11y  

---

## 10. Why reviews “fail” / site still looks bad

1. **Freeze** freezes sales surface at v198 — disk work is invisible  
2. **JS-only honesty** — first paint still Webflow  
3. **Dual CTA bug confirmed live** — only fixed in unshipped v200+  
4. **FOUC multi-engine** — head + foot thrash  
5. Long CDP audits sometimes timeout; evidence still captured  

---

## 11. Non-goals (this review)
Implement · unfreeze · invent pilots · game · auto-publish under freeze  

---

## 12. Sources used
- Live curl HTML + CDP Runtime evaluate  
- Disk foot-core v201, head, footer-lite, CDN json  
- Gates: verify:source, wiz-ownership, foot-smoke, board honesty  
- Swarm: Fable + Codex ×4  
- Prior: SITE-MASTER-PROMPT, SITE-FIX-PROMPT-V2, swarm-site/*  

**Copy for humans:** Prefer `docs/process/` snapshot if committed; full raw under `/tmp/dg-busy/swarm-site-review/`.
