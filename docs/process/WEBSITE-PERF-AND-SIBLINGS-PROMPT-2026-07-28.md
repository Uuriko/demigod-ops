# Website prompt: mobile perf + sibling assets + residual public quality

**Self-execute.** Do agent work; report what you did / blocked on. Do not assign the user chores unless they ask.

---

## 0. Product & authority

| Item | Rule |
|------|------|
| Product | Demigod / https://www.trydemigod.com — SF startup talent matching, humans in the loop, **10% on hire**, free for talent |
| Code SoR | `demigod-foot-core.js` (foot lock), `demigod-footer-lite.html`, `demigod-head-styles.css` / `demigod-head-minimal.html`, map/atlas siblings in CDN manifest |
| Truth | Only `bin/dg truth` (never hardcode version in docs as “current live”) |
| Publish | User has granted ship authority in this collaboration; use `DEMIGOD_CURRENT_REQUEST_PUBLISH=1` + foot lock for CDN/CM6/events-config |
| Out of scope | Eat the Sounds; Stripe; auto-DM / outbound messages; inventing pilots, real board roles, SLA/volume claims |
| Ponytail | YAGNI → reuse → min diff; no new frameworks for a one-line fix |

---

## 1. Why this prompt exists

After full site audit + hard-route 301s + events config publish + tab hygiene:

- **SEO / a11y structure is largely green** (single H1 on product pages, FAQPage schema, axe 0 serious).
- **Lighthouse mobile** scored **perf ~55** on home/faq with **a11y 100 / seo 100**; hire/talent/events often **flake to 0** (runner/Chrome path), not necessarily broken product.
- Truth sometimes flags **sibling atlas/mapData drift** when disk/CDN/live diverge; last check may already be **matched** — re-verify before “fixing.”
- Events still uses **quick Cloudflare tunnels** (hostname rotates) → config can go stale again.

This prompt is the longer, ordered plan for **performance**, **sibling asset honesty**, and **leftover public-site quality** without redoing finished work.

---

## 2. Baseline (run first; paste tails into receipt)

```bash
export DEMIGOD_CURRENT_REQUEST_PUBLISH=1
bin/dg truth
bin/dg events status
node demigod-route-health.mjs --json
node demigod-seo-audit.mjs --json | tee /tmp/dg-busy/website-perf-seo.json
node demigod-axe-routes.mjs
# Lighthouse: set CHROME_PATH if needed (Flatpak Chrome or Playwright chromium)
node demigod-lighthouse.mjs
cat /tmp/dg-busy/sibling-drift.json 2>/dev/null
node demigod-live-attest.mjs --json
```

**Record:** disk/live foot version, events `websiteConfigCurrent` / `reachable` / tunnel URL, route bareAliases, SEO issue codes, axe serious count, LH scores per route, sibling-drift status.

**Skip finished work if green:** dual-H1, FAQ schema, bare 301s (refer/map/press/partners), axe serious=0, sealed foot ship.

---

## 3. Workstream A — Sibling assets (atlas + map-data)

### Goal
`bin/dg truth` reports sibling assets **matched** (or intentional-staged only with a real reason). Live `/map` and atlas loaders serve executable MIME and bodies consistent with disk + `DEMIGOD-FOOT-CDN.json`.

### Investigate
1. Read truth report: `/tmp/dg-busy/truth.json`, `/tmp/dg-busy/sibling-drift.json`.
2. Manifest keys under `assets` (startup-map / map-data URLs, shas, versions).
3. Disk files: `demigod-startup-atlas-web.js` (and any `*-map-data*` / map JSON published to CDN).
4. Live fetch: CDN URLs from manifest vs `bin/dg truth` lines for startup-map / map-data.
5. Foot references: `startupMapAssetUrl()`, map page mount, offline fallback honesty.

### Fix patterns (only if drift real)
- Rebuild/regenerate map data if source pipeline exists (`demigod-startup-atlas*.mjs`).
- Ensure ship path publishes **siblings with foot** (foot-cdn-publish / ship run), not foot alone.
- If drift is intentional (staged unshipped atlas), either **ship siblings** or **revert disk** to live — do not leave unexplained drift.
- Never invent company counts or “verified hiring” on the public map.

### Verify
```bash
bin/dg truth   # sibling lines green
# CDP or curl: map page loads without console spam; failure copy stays honest
```

---

## 4. Workstream B — Mobile performance (Lighthouse ~55 → better)

### Goal
Improve **real** LCP/CLS/main-thread cost on **home** (and if cheap, hire/talent entry). Do not chase vanity scores with fake “optimizations.” Prefer measured before/after.

### Research anchors
- Core Web Vitals: prioritize above-fold content, stable hero dimensions, defer non-critical JS, avoid layout thrash.  
  (Webflow technical SEO / CWV guidance: LCP, interaction readiness, CLS.)
- Demigod already: `heroImgPerf()`, `lazyBelowFold()`, dual CTA, night stage art.

### Investigate (evidence first)
1. Re-run Lighthouse **home only** with stable Chrome:
   ```bash
   export CHROME_PATH="${CHROME_PATH:-$HOME/.local/share/flatpak/app/com.google.Chrome/current/active/files/extra/chrome}"
   # or Playwright chromium under ~/.cache/ms-playwright/
   node demigod-lighthouse.mjs
   ```
2. Open LH HTML reports under `/tmp/dg-busy/lighthouse/` — note top LCP element, unused JS, long tasks, CLS culprits.
3. CDP Performance: home load, network waterfall for foot-latest.js size, hero images, head CSS.
4. Profile foot `run()`: what runs synchronously on every boot (forms, scrub, roles, JSON-LD, motion).

### Candidate fixes (smallest first)
| Idea | When to do |
|------|------------|
| Ensure hero `width`/`height` / aspect-ratio to kill CLS | LH shows layout shift on hero/H1/CTAs |
| `fetchpriority=high` only on true LCP image; no competing large images | Multiple high-priority images |
| Defer non-critical foot work with `requestIdleCallback` / `requestAnimationFrame` (orgJsonLd, scrubStaticLabels thrash, heavy roles scrub) | Long tasks attributed to foot after first paint |
| Avoid re-running full `run()` loops / interval force-show on WIZ when closed | CPU on idle home |
| Split or trim CSS injection strings if huge reflows | Style recalc spikes |
| Mobile: skip desktop-only night-stage art download (if not already) | Network LCP on phone |
| Do **not** remove honesty scrubs or WIZ correctness for score | Never |

### Anti-goals
- No removing dual boot reliability without proof.
- No “perf theater” (hiding content until late paint).
- No breaking WIZ, forms, or sample labeling.

### Verify
- LH home: a11y still ≥90, seo ≥90; perf improved or LCP/CLS metrics improved in report.
- `node demigod-foot-smoke.mjs`, `npm run demigod:verify:source`.
- Manual CDP: home CTAs open WIZ; mobile bar works.

---

## 5. Workstream C — Lighthouse runner reliability

Hire/talent/events scoring **0** is often **tooling**, not product.

1. Fix `demigod-lighthouse.mjs` Chrome resolution (Flatpak + Playwright paths).
2. Prefer one browser binary; increase timeout for `?p=` routes (foot boot + deepLink).
3. Wait for `window.dgFootVersion` / `body.dg-ready` before ending LH gather if using custom gatherer; else document flake.
4. Suite should not fail closed on a single flaky route if ≥60% routes score and a11y floor holds (already partially implemented).

---

## 6. Workstream D — Events public stability (website-facing)

1. `bin/dg events status` — if `websiteConfigCurrent` false or not reachable → heal → **publish-config**.
2. CDP `/?p=events` and `/?p=map`: zero CORS errors to dead tunnels.
3. Named tunnel still preferred long-term (`bin/dg-named-tunnel-setup login|create|run`) but **blocked without Cloudflare account login** — do not block the rest of this prompt on that.
4. Public copy must not claim bot sends/publishes externally.

---

## 7. Workstream E — Residual SEO / share / a11y (only if gaps remain)

After A–D, re-run SEO audit. Only if issues remain:

1. **Meta** 80–160 chars on every DG_PAGES desc.  
2. **Canonical + og:url** prefer hard paths (`/hire`, `/map`, …).  
3. **og:image / twitter:image** — ensure one stable brand image on product pages (reuse existing site OG asset; don’t invent stock photos).  
4. **JSON-LD** — Organization + WebSite (no fake SearchAction if no search); FAQPage only on faq.  
5. **Sitemap** — note missing `/map` `/refer` `/press` in Webflow sitemap; fix only via real pages or documented 301 finals (don’t spam `?p=` URLs into sitemap unless intentional).  
6. **Contrast** gold/cream on black for trust line and secondary text (WCAG AA where practical).  
7. **Focus-visible** already sitewide — extend only if LH/axe finds misses.

---

## 8. Workstream F — Hygiene (occasional, non-blocking)

```bash
bin/dg hygiene --prune
# Timer should be enabled: demigod-tab-hygiene.timer (~45m)
# Deeper: bin/dg-laptop-blue-moon
```

Keep **4–8** CDP tabs: live, designer, custom-code, Grok/ops. Never kill CDP Chrome `:9223`.

---

## 9. Ship path (when code or siblings change)

```bash
bin/dg lock claim --owner "$USER" --why "website perf/siblings"
export DG_LOCK_TOKEN=…   # from claim
export DEMIGOD_CURRENT_REQUEST_PUBLISH=1
bin/dg ship prepare
bin/dg ship run          # or ship siblings path if separate
bin/dg truth
node demigod-live-attest.mjs --json
bin/dg lock release
```

Bump foot version markers if foot-core changes. Update footer-lite CDN pin via ship, not hand-edit alone.

---

## 10. Receipts

Write `/tmp/dg-busy/website-perf-siblings-receipt.json` with:

- `at`, truth summary, sibling-drift  
- LH before/after (or “flake”)  
- events config current/reachable  
- files touched, version shipped  
- remaining blockers (e.g. CF named tunnel login)

Optional: append one line to agent dogfood log for tools used.

---

## 11. Priority order (execute top-down)

1. Re-baseline truth + sibling-drift (don’t fix matched siblings).  
2. Events config if stale.  
3. Sibling ship/fix if unexplained drift.  
4. Lighthouse home investigation → smallest perf wins.  
5. LH runner hardening.  
6. Residual SEO/share only if audit still flags.  
7. Ship + re-verify.  
8. Hygiene if tabs bloated.

---

## 12. Stop conditions

- Truth **PASS**, siblings **matched**, events config **current+reachable** (or blocked only on tunnel login).  
- Home LH a11y/seo solid; perf improved or documented with evidence.  
- No open P0 website console errors on home/hire/events/map.  
- Or blocked only on: Cloudflare login, Webflow API token, human Designer for new pages.

---

## 13. Suggested one-shot agent preamble

```
Demigod website. Execute docs/process/WEBSITE-PERF-AND-SIBLINGS-PROMPT-2026-07-28.md.
Re-check truth first (may already be v852+ sealed). Prefer ponytail diffs.
Publish with DEMIGOD_CURRENT_REQUEST_PUBLISH=1 when fixes need live.
Do not invent pilots/SLA. Keep working until stop conditions or hard block.
```

---

## 14. Related prompts

- Broader exploration: `docs/process/WEBSITE-EXHAUSTIVE-WORK-PROMPT-2026-07-28.md`  
- Laptop/tabs: `DEMIGOD-LAPTOP-BLUE-MOON.md`, `bin/dg hygiene --prune`, `demigod-tab-hygiene.timer`

---

*Prompt written for agent self-start after 2026-07-28 audit + 301s + events config + LH mid-50s mobile perf signal.*
