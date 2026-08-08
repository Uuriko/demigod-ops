# Dasha code review + design review

**Date:** 2026-08-08  
**Surfaces:** landing, Studio, desk, how-to-buy, experiments, tests, build  
**Gates observed:** desk build PASS · growth PASS · live-verify reports ship lag  
**Agent input:** Claude + Codex debate (see multi-agent doc)

---

## Part A — Code review

### Architecture overview

```
dasha-landing.html          single-file home embed + Jupiter plugin
dasha-meme-studio.html      single-file Studio (~26KB) canvas + remix grammar
dasha-desk/src/body|css|js  SoT → build.mjs → index/dist/app.html + embed
dasha-desk/config/dasha.json  small reference snapshot (not build input)
experiments                 relay-lab, remix-pack, logo-lab, how-to-buy
tests                       policy + interaction + a11y (CDP)
```

### Studio (`dasha-meme-studio.html`) — **B+**

**Strengths**
- Zero deps; procedural looks (no likeness rights on canvas).  
- Fragment state for privacy-preserving remix URLs.  
- Formats: square / story / banner.  
- Parent lineage bounded to one generation (honest about non-proof).  
- Native share + X intent + PNG export.

**Risks / debt**
- File carries product + renderer + URL grammar + lineage + share kit — acceptable until Relay fails, then **delete** lineage/`arm=flat` rather than framework-ize.  
- Duplicate embed build paths (`dasha-studio-embed*`) can drift.  
- Seed lines on home must stay in sync with `LOOKS` / formats (tests help).

**Review notes**
- Do not extract modules until two live consumers need the same code.  
- Keep “no remote photo strip” gate — correct.

### Desk (`dasha-desk/`) — **B**

**Strengths**
- Clear SoT: `body.html` + `styles.css` + `app.js` + `build.mjs`.  
- `DDShare.buildSharePack` pure export for tests; neutral (no FOMO) share pack.  
- Mint paste verifier UX.  
- Culture tape + pbs avatar → `@dash_eats`.  
- Live Dex price fetch with failure-tolerant UI.

**Risks**
- Multiple generated artifacts (`src/app.html`, `index.html`, `dist/`, `/tmp` embed) — prefer **one ship artifact**.  
- Mint/CA duplicated vs landing/studio strings.  
- `receipts/` directory is historical FOMO lab evidence — social gravity to reintroduce bad patterns.

**Ponytail deletes**
- Unused FOMO builders if any remain in git history only — keep share pack neutral.  
- Extra embed targets not used by Webflow.

### Landing (`dasha-landing.html`) — **B+**

**Strengths**
- Lean: hero seeds, ticker, remix grid, voice quotes, token panel, endband.  
- Policy tests: no telegram, no catbox casino hero, no howto link while 404.  
- Jupiter plugin with direct fallback pattern.  
- Direct `@dash_eats` + live search secondary.

**Risks**
- Hardcoded mint + Jupiter URLs in many places.  
- Voice/endband increase length — still no image tape (good).  
- Must not reintroduce banned explanatory slogans (tests).

### How-to-buy — **C (product role)**

- Code quality fine; **product role confused** (built, tested, 404, unlinked).  
- Codex: delete; Claude: fold. Review: **freeze** until explicit route decision.

### Tests — **B / mixed**

| Good | Overreach |
|------|-----------|
| Mint exactness, Jupiter pin, no telegram, a11y serious/critical, no horizontal overflow | Exact nav label matrices, full seed line arrays, deleted marketing phrases as permanent APIs |
| Growth forbids howto links while 404 | Calling howto “primary conversion surface” while unlinked |

**Recommendation:** keep trust/security/a11y/mint; loosen campaign freezes over time; don’t let growth-test mythology expand.

### Experiments — **D for product pull, B for craft**

Relay lab dual-parser idea is clever; remix-pack proves capsule mechanics. Both should stay **off nav** until metrics force reopen.

---

## Part B — Design review

### Design system (coherent)

| Token | Role |
|-------|------|
| Ink `#070608` | Field |
| Paper `#f4eddb` | Type |
| Acid `#dfff00` | CTA / emphasis |
| Hot `#ff3b81` | Offset shadow / energy |
| Violet `#7c4dff` | Gradients |
| Type | Heavy uppercase display + Arial |

Studio and home share the system; desk is slightly softer purple UI — intentional “utility” vs “poster” split.

### Type & space

| Surface | Assessment |
|---------|------------|
| Home hero | Strong scale; stroke word works; lean micro copy OK |
| Seeds | Five looks grid — good; collapses sensibly |
| Voice | Quotes readable; 3-col → 1-col mobile |
| Token panel | Dense but one bounded buy-guide (test-enforced) |
| Endband | Dual-path clear: Studio / Desk / `@dash_eats` |
| Desk | Good risk callout; tape strip small enough |
| Studio | Panel + canvas grid solid; topbar wrap for narrow |

### Dual-path & nav clarity

| Path | Entry |
|------|--------|
| Create | Hero Remix · seeds · endband Studio |
| Verify/buy | Token · Buy $dasha · Desk · Jupiter |
| Culture | `@dash_eats` nav · voice · desk stills |

**Issue:** Buy labels once varied (“Buy on Jupiter” vs “Buy $dasha”) — disk should stay **Buy $dasha ↗** on primaries.

### Honest copy

| Do | Don’t |
|----|-------|
| Can go to zero · NFA · association ≠ endorsement | Official · safe · verified · endorsed |
| Not the dev (public line) | Dev claims |
| Public source post | Fake brand deal |

### Culture / image

| Surface | Policy |
|---------|--------|
| Home | No remote person photos (brittle + rights + endorsement optics) |
| Studio | Procedural only |
| Desk | Hotlinked public stills + Dex art, sourced |

Aligns with memecoin honesty: culture is **vibe + participation**, not stock-photo endorsement.

### Accessibility

- Desk/studio/landing run axe-critical/serious in CDP tests.  
- Focus rings present.  
- External links `noopener noreferrer`.  
- Decorative brand marks need careful alt (empty only if text adjacent).

---

## Combined severity list

| Sev | Item |
|-----|------|
| High | Live lag / wrong live Studio |
| High | Unmeasured funnel |
| Med | Experiment HTML + FOMO receipts as political backlog |
| Med | How-to-buy role confusion in tests |
| Med | Multi-copy mint |
| Low | Desk multi-generate outputs |
| Low | Docs status over-labeling futures |

---

## Code+design verdict

Ship the **small, honest, dual-path** system you already have. Do not grow surface area until export/share/remix numbers exist. The design language is ready; the **distribution of the design** (live publish) is not.
