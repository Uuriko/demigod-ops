# DEMIGOD.COM — MASTER IMPLEMENTATION PROMPT (v198 → v210)

**Role for the executor:** You are the implementing engineer (Grok/Cursor/Composer). Fable (design/product lead) authored this spec. Demigod is a Webflow-hosted talent-matching marketplace connecting SF/remote startups with vetted engineers. Current phase: **GTM + pre-services honesty**. Site is "mostly done" per Heavy authority — this is a *refinement and hardening* pass, not a redesign. Minimal-surface, high-craft changes only.

**Prime directive:** Do not ship anything that is not (a) verified green by all gates, (b) honest per the rules below, and (c) parse-safe via boot-smoke. Human clicks Publish in Webflow; you prepare CDN + custom-code pastes + diffs. Never claim "live" without a real fetch confirming the hash.

---

## 0. GROUND RULES (READ FIRST — NON-NEGOTIABLE)

### 0.1 Canonical files
- **Site JS:** edit **only** `demigod-foot-core.js` (the canonical foot custom-code, currently v198). Never edit the CDN-mirrored `.live-*.js` artifacts — those are outputs.
- **Head styles/scripts:** the head custom-code block (critical CSS + early unhide script + noscript). Keep the unhide script parse-safe (see history: a misplaced `}catch(e){}` once produced "Unexpected token catch" and blanked the site for days).
- **Pages/copy:** `demigod-pages` (page-level content), Designer static text for structural copy.
- **Board data:** `DEMIGOD-BOARD.json` (single source of truth — beware split-brain with a second board file; the tripwire must watch the same path the foot reads via `BOARD_CDN`).
- **Supporting orchestration:** `demigod-*.mjs` scripts only when NOT touching site JS.

### 0.2 Verify gate (run after EVERY edit, before ANY publish prep)
```
npm run demigod:verify:source        # source-anchor gates
npm run demigod:verify:all           # + smoke + honesty (preferred)
node <boot-smoke>                     # vm.Script parse + boot (ReferenceError catch)
npm run demigod:board-honesty        # board seed/receipt caps
node <loop-state check>              # loop-state sanity
```
A file that passes 49 grep gates but throws on boot is **broken** — grep gates historically missed dead `wizBuild`/`run`/`show` and JS syntax errors. **Always** `grep -n 'function wizBuild\|function run(\|function show('` and confirm each symbol referenced is defined, then run the vm boot-smoke, before trusting any build.

### 0.3 Honesty rules (live-copy law — enforce in code + runtime scrub)
- **No** "48h" / SLA / turnaround promises anywhere (static copy OR runtime). Runtime `scrubTimeClaims()` must catch any that slip into board JSON.
- **No** founder names on the live site. Use "hello@trydemigod.com will follow up".
- **Board:** ≤3 seed roles until real; `realRoles: 0`; receipts labeled `sample:true`; no fabricated testimonials/delivery counts. Honesty gate must FAIL the build if roles > 3 or any `sample:false` receipt exists without a real backing event.
- **Pre-services language:** Twilio/Stripe/SMS features use "pending" copy, never "live"/"instant".
- **proposeIntro / ingest must NOT mint** `sample:false` roles or receipts — any board write goes through the honesty gate, never a direct `saveBoard`/`appendPilot` bypass.
- **Game "Eat the Sounds" is archived** — do not touch unless the user literally says "reopen the game".

### 0.4 Publish protocol
1. Verify all gates green on disk.
2. `demigod:deploy:prep` → confirm CDN foot hash == disk `md5(demigod-foot-core.js)` (foot-cdn-publish first if catbox is stale/frozen).
3. Prepare head + foot paste blocks; stamp a `DG-PUB` marker + version.
4. Human pastes + Save + Publish in Webflow (staging → www).
5. **Poll live** (`curl`/WebFetch) until the new hash/`__dgFootVer` appears. Only then is it "live".
6. CDP screenshots: hero visibility, WIZ desktop + mobile, board render.
7. Re-run `verify:live`.

---

## 1. DESIGN SYSTEM (P1)

**Goal:** one coherent system, tokenized, light+dark safe, WCAG AA. Currently the "cooler UI system" (v197) — tighten it, don't reinvent.

### 1.1 Tokens (head critical CSS, `:root`)
Define/consolidate CSS custom properties — audit for one-off hex values scattered in foot/Designer and replace with tokens:
- **Color:** `--bg`, `--bg-elev`, `--surface`, `--border`, `--text`, `--text-muted`, `--accent` (single brand accent + `--accent-hover`, `--accent-contrast`), `--success`, `--warn`, `--danger`. Provide `@media (prefers-color-scheme: dark)` overrides. Every text/background pair must pass **4.5:1** (body) / **3:1** (large). Validate with a contrast check in `verify:live`.
- **Type scale:** `--fs-xs … --fs-3xl` on a 1.2–1.25 modular scale; `--lh-tight/-normal/-loose`; system + one display face max. No more than 2 font families.
- **Space scale:** `--sp-1 … --sp-12` (4px base). Replace ad-hoc margins.
- **Radius:** `--r-sm/-md/-lg/-full`. **Shadow:** `--shadow-1/-2/-3` (subtle, dark-mode-aware). **Motion:** `--ease`, `--dur-fast/-base/-slow`.

### 1.2 Motion & accessibility
- All animations wrapped in `@media (prefers-reduced-motion: no-preference)`. Reduced-motion users get instant states — no hero glow pulse, no scroll reveals. (History: unbounded animations caused FOUC/flash.)
- Focus-visible rings on every interactive element (`:focus-visible` outline using `--accent`, 2px, offset 2px). Never remove focus outlines without a replacement.
- Min tap target 44×44px on mobile.

### 1.3 Component primitives (foot-rendered + Designer)
Buttons (primary/secondary/ghost, loading + disabled states), inputs/selects/textarea (label + hint + error), badges/pills (role tags), cards (role card, testimonial card — testimonials hidden until real), nav, modal/dialog (WIZ container), toast/inline-alert. Each needs hover/active/focus/disabled/error visual states. **Acceptance:** no interactive element lacks a focus + hover + disabled style.

---

## 2. UI/UX (P1)

### 2.1 Hero
- Ensure `w-mod-ix3` / unhide gate reliably reveals hero (root cause of past blank-site was the unhide script never running). Keep `forceMainVisible()` in foot as a belt-and-suspenders fallback with a RAF + MutationObserver + short interval + noscript path.
- Single clear value prop headline (talent matching), one primary CTA ("Find talent" / startup path) and one secondary ("Get matched" / engineer path). **Remove duplicate CTAs** (history: dup "FIND TALENT" nav + dup CTAs). Grep for duplicate button labels and dedupe.
- Hero glow (v198) must respect reduced-motion and never cause layout shift (CLS ~0).

### 2.2 Navigation
- Single nav, no duplicate links, no dead OAuth buttons (a dead OAuth button lived at foot `:~889` + a Supabase UMD in head — **strip both** if still present). Mobile hamburger with proper `aria-expanded`, focus trap when open, ESC to close.
- Sticky header must not overlap focused inputs on mobile.

### 2.3 Board / proof section
- `renderBoard()` must have a valid anchor (history: `trust()` targeted a removed `/PRICING/` anchor → board never rendered → proof pipeline invisible). Confirm the anchor element exists in Designer markup; add a resilient selector + no-op-safe guard that logs (dev only) if the anchor is missing.
- Escape all board JSON before `innerHTML` (`esc()` helper) — board content is data, treat as untrusted (XSS hardening). No raw `innerHTML = boardJson`.
- Empty/loading/error states for the board fetch (skeleton, not spinner-forever). If board fetch fails, show seed roles, never a blank or infinite spinner.

### 2.4 Performance
- No render-blocking third-party CSS (history: a catbox `m2f8rp.css` render-blocked → spinner). Inline critical CSS in head; defer non-critical.
- Target: LCP < 2.5s, CLS < 0.1, no long tasks > 200ms on load. Preload the display font; `font-display: swap`.

---

## 3. FORMS / WIZ (P0 — highest product value)

**Current:** Typeform-style stepper, two flows (startup + engineer), with a required **90day-outcome** step (high-signal for matching) + explicit **review** step before submit. Test: `node demigod-wiz-cdp-playtest.mjs --local`.

### 3.1 Known failure modes to fix / guard (all historically real)
- **`wizBuild` must be defined and called.** Grep: `grep -n 'wizBuild' demigod-foot-core.js` — confirm one definition + the call site. A build where `wizBuild` is referenced but undefined = boot ReferenceError = all site JS dead. Add a source gate: every wiz function called is defined.
- **`__submit__` branch must be reachable** — the final review step's submit must actually POST/advance. History: unreachable submit branch = wizard never submits.
- **Selector safety:** attribute selectors with numeric-leading values must be quoted: `[name="90day-outcome"]` (unquoted `[name=90day-outcome]` throws and half-patches the startup form → all fields visible / stepper gone). Grep for unquoted numeric-leading attribute selectors.
- **enhanceWIZ must not hide the whole `<form>`** via a `parentElement` fallback (history: caused `vis=0` — entire form hidden). Scope hide/show to step containers only.
- **Stepper integrity:** exactly one step visible at a time; Next disabled until required fields valid; Back preserves entered data; progress indicator accurate. **Live smoke must assert only the current step's fields are visible** (history v197 break: all 7 fields visible, stepper gone).

### 3.2 UX requirements
- Inline validation on blur + on Next; clear error messages tied to inputs via `aria-describedby`.
- Required fields: startup (company, role, stack-needs, **90day-outcome**, email) / engineer (name, stack, resume, **90day-outcome**, email). Resume field must be **visible** and its required-ness must not make the form unsubmittable (history: invisible required resume input).
- Review step: read-only summary of all answers + Edit links back to each step, then Submit.
- Submit states: loading spinner on button, success confirmation ("hello@trydemigod.com will follow up" — **no** 48h), error with retry. On success, ingest goes through the honesty-gated path (no direct board mint).
- Keyboard: Enter advances (except in textarea), ESC does not lose data, focus moves to first field / first error of each step.
- Mobile: full-width fields, no zoom-on-focus (`font-size ≥ 16px` on inputs), sticky Next button above keyboard.

### 3.3 WIZ acceptance criteria
- `node demigod-wiz-cdp-playtest.mjs --local` → **pass:true** on both flows, desktop + mobile.
- Playtest harness itself must use current selectors — scope to `.dg-wiz` container (not doc-wide `h3`), count visibility within the modal only (history: harness false-negatives from doc-order `.dg-wiz-q, h3` shadowed by page `h3` + doc-wide vis count).
- One and only one step visible; submit reaches confirmation; no console errors; no `ReferenceError`.

---

## 4. COPY (ALL SURFACES) (P1)

**Voice:** direct, credible, founder-to-founder. No hype, no fake urgency, no unverifiable claims.

### 4.1 Global scrubs (must be zero on live)
- Remove every "48h", "24h", SLA, "instant", "guaranteed", turnaround-time promise. Runtime `scrubTimeClaims()` as backstop for board JSON.
- Remove founder names → "hello@trydemigod.com will follow up".
- Remove "LIVE ROLES HIRING NOW" / any overclaim of live activity while `realRoles:0`. Use honest framing: "Early roles" / "Seed roles" clearly labeled sample where applicable.
- Kill all lorem ipsum (history: lorem "Insights" section shipped live; lorem scrub once blanked a page — scrub must replace, not empty).
- Dedupe: copyright line, tagline, email, nav labels (history: dup copyright/tag/email).

### 4.2 Page-by-page copy pass (in `demigod-pages` / Designer)
- **Home/hero:** value prop, how-it-works (3 steps), for-startups + for-engineers split, honest proof/board, CTA.
- **How it works:** matching process, vetting, what "pending services" means honestly.
- **Pricing:** honest fee framing (10–25% range per Heavy research) with pre-services "pending" caveat; dedupe pricing lines (history: dup pricing lines).
- **For engineers:** what to expect, resume/stack, privacy bullets on WIZ welcome.
- **Legal:** privacy + terms (see legal pages below).
- **Contact/footer:** hello@trydemigod.com only.

### 4.3 Microcopy
Button labels, form hints, error messages, empty states, success confirmations — all consistent, all honest. Acceptance: `verify:live` copy check finds zero banned phrases.

---

## 5. NEW PAGES / FEATURES (P2 — only after P0/P1 green)

- **Legal pages** (privacy policy, terms) — honest, pre-services caveats, no founder names. Files under `demigod-pages` / Designer routes. (Multiple `demigod-legal-*.mjs` passes exist — consolidate, don't multiply.)
- **Partnerships page** — honest, "pending" where services aren't live (several `demigod-partnerships-*.mjs` scripts exist; reconcile to one page pass).
- **Engineer prefill via OAuth** — **deferred** until trigger met (≥10 real WIZ submissions/week). If built: minimal client-side (Clerk/Supabase script-tag, no server), LinkedIn (engineer prefill) + Google, "pending" copy, added to canonical head/foot. Do **not** ship a dead OAuth button before the flow works.
- **Outreach/proof assets** — honest proof pack only from real receipts; no fabricated delivery counts.

Do not add features that create honesty liabilities (fake testimonials, live-service claims, delivery counters) while `realRoles:0`.

---

## 6. BUGFIXES (prioritized)

### P0 (block ship)
1. **WIZ stepper live integrity** — verify not-frozen, stepper renders, one step visible, submit reaches confirmation (guard against v197-class regression).
2. **wizBuild / run / show defined + called** — no boot ReferenceError; boot-smoke pass.
3. **Head unhide parse-safe** — vm.Script parse gate; hero reveals; `forceMainVisible` fallback intact.
4. **Board honesty** — ≤3 roles, realRoles:0, no `sample:false` mint via proposeIntro/ingest; honesty gate wired into `verify:all`.
5. **Numeric-attribute selectors quoted** — `[name="90day-outcome"]` etc.

### P1
6. Board render anchor exists + `esc()` XSS escaping.
7. Dedupe nav/CTA/copyright/email/pricing.
8. Strip dead OAuth button + orphan Supabase UMD (if present).
9. Runtime `scrubTimeClaims` catches 48h/SLA in board JSON.
10. Split-brain board: single `DEMIGOD-BOARD.json`; tripwire + `BOARD_CDN` point to same file.
11. Reduced-motion + focus-visible everywhere; contrast AA.

### P2
12. pilot-tracker minting `slaDue` on every log (bypasses honesty) — gate or remove; honor `--dry-run` properly.
13. verify gates hardening: no tautological/hardcoded-true checks; grep gates supplemented by smoke; no stale-JSON reads (check mtime vs foot-core before treating a gate/brief P0 as real).
14. truth.mjs cdnId regex false-drift (naive regex matches /hire page script first) — precise selector + manifest sha256 fix.

---

## 7. CODE ARCHITECTURE (`demigod-foot-core.js`)

- **Single IIFE**, no leaked globals except `window.__dgFootVer` (bump to match version). Balanced braces — the IIFE must close correctly at EOF (history: extra `}` closed IIFE early → parse break; and missing `})();` at EOF).
- **Module sections, commented:** tokens/util (`esc`, `qs`, `scrubTimeClaims`), unhide/`forceMainVisible`, nav, board fetch+render, WIZ (`wizVal`, `wizWrap`, `wizCss`, `wizBuild`, step engine, validation, submit→ingest), analytics stub. Each referenced symbol defined before use or hoisted function decl.
- **No dead code** — if `wizBuild`/`run`/`show` unused, either wire or remove; ~30% dead foot has happened.
- **Defensive fetch** — board/ingest wrapped in try/catch with graceful fallback to seeds; never throw uncaught on boot.
- **Version discipline:** bump `v198 → v199…` on every shipped change; stamp `DG-PUB` marker; keep `md5` reproducible for CDN==disk verification.
- Head: critical CSS first, then early unhide script (RAF + MO + interval + listeners + noscript), parse-verified, no third-party render-blocking CSS.

---

## 8. TESTING

1. **Boot-smoke** (vm.Script): parse + run foot in a jsdom/vm shim; assert no SyntaxError/ReferenceError; assert `wizBuild` defined; `__dgFootVer` correct. **Mandatory before every publish.**
2. **Source-anchor gates** (`verify:source`): assert key symbols/anchors present — but never rely on grep alone.
3. **Board honesty gate** (`verify:all`): roles ≤3, realRoles:0, no unbacked `sample:false`, no banned time-copy.
4. **WIZ CDP playtest** (`demigod-wiz-cdp-playtest.mjs --local`): both flows, desktop + mobile, one-step-visible, submit→confirm, zero console errors. Fix harness selectors to scope to `.dg-wiz`.
5. **verify:live** (post-publish, real fetch): hash == disk, banned-copy = 0, lorem = 0, contrast AA sample, WIZ present, hero visible.
6. **Mutation test** (regression trust): break `wizBuild`/`run`/version/90day on a copy → assert source+smoke gates FAIL → byte-identical restore. Proves gates aren't tautological.
7. **CDP screenshots**: hero, WIZ desktop, WIZ mobile, board render — visually confirm.

**Acceptance to ship:** 1–4 green on disk; 7 visually clean; then human publish; then 5 green on live.

---

## 9. SHIP CHECKLIST

- [ ] All edits in `demigod-foot-core.js` (site) only; version bumped; braces balanced.
- [ ] `verify:source` + `verify:all` + board-honesty + loop-state green.
- [ ] Boot-smoke pass (no Syntax/ReferenceError).
- [ ] WIZ playtest pass:true (both flows, mobile+desktop).
- [ ] Grep: no unquoted numeric attr selectors, no dup CTA/nav/copyright, no 48h/SLA/founder-name/lorem, no dead OAuth button.
- [ ] Board: ≤3 seeds, realRoles:0, single file, tripwire==BOARD_CDN.
- [ ] `deploy:prep` → CDN foot hash == disk md5 (foot-cdn-publish if stale).
- [ ] Head + foot paste blocks prepared, DG-PUB stamped.
- [ ] **Human** pastes + Save + Publish (staging → www).
- [ ] Poll live until new hash/`__dgFootVer` appears — only then "live".
- [ ] `verify:live` green; CDP hero/WIZ/board screenshots clean.
- [ ] Commit with honest message; update `DEMIGOD-COMPRESSED-STATE.md` + loop-state.

---

## 10. PRIORITY SUMMARY

| Pri | Item | File |
|-----|------|------|
| P0 | WIZ stepper live integrity + submit reachable | `demigod-foot-core.js` |
| P0 | wizBuild/run/show defined+called; boot-smoke | `demigod-foot-core.js` |
| P0 | Head unhide parse-safe + hero reveal | head custom-code |
| P0 | Board honesty gate (≤3, realRoles:0, no mint) | `DEMIGOD-BOARD.json`, verify gates |
| P0 | Quote numeric attr selectors | `demigod-foot-core.js` |
| P1 | Design tokens + AA contrast + reduced-motion + focus | head CSS |
| P1 | Board anchor + esc() XSS | `demigod-foot-core.js` |
| P1 | Copy scrub (48h/founder/lorem/dupes) | `demigod-pages`, Designer |
| P1 | Strip dead OAuth + Supabase UMD | foot + head |
| P2 | Legal + partnerships pages (honest) | `demigod-pages` |
| P2 | OAuth prefill (deferred to ≥10 real subs/wk) | head/foot |
| P2 | Gate hardening (mtime, no tautologies, truth regex) | `demigod-*.mjs` |

**Stop condition:** all P0 + P1 green on two consecutive clean verify runs, live-confirmed by real fetch, WIZ playtest pass, screenshots clean. Then resume GTM (warm SF founder DMs, pilot logging). Minimal further site changes.

**Remember:** verify green + honest + parse-safe + live-confirmed, or it did not ship.

---
## Round-4 session open
Role note: Fable boss — strategy/plan; single writer rule for foot-core; open with bin/dg live header
```
bin/dg live && bin/dg tools | head
# LIVE= DISK= FREEZE= GATES=
```
See: docs/exchange/DEMIGOD-PROMPT-ROUND4-DISCUSSION.md


## Ponytail (required)
Use Ponytail on all code: YAGNI → reuse → stdlib → native → min. Keep safety. Plugin ponytail@ponytail / docs/PONYTAIL-AGENTS.md.
