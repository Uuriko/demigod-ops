---
status: working
owner: grok
created: 2026-08-11
authority: DASHA-PERFORMANCE-GATE-2026-08-11.md
review: adversarial-evidence-only
verdict: FAIL
---

<!-- agent-task: 20260811154944910-9-8kqv2a; role: grok; completed: 2026-08-11T15:52:09.845Z; independent evidence review -->

# Adversarial review — DASHA-PERFORMANCE-GATE-2026-08-11

## VERDICT

**BLOCKED** (review result: **FAIL**)

Gate-not-met on simulated mobile LCP is supported by one preserved report. The **Webflow generated-shell** class of cause is only **partially** supported. The claim that **Asynchronously load JavaScript** is the weakest *sufficient* correction is **not** evidence-supported. Packet overclaims multi-sample statistics and treats a full render-blocking *estimate* as proof of a JS-only fix.

## EVIDENCE

| Claim in packet | On-disk evidence | Support |
|---|---|---|
| Median LCP **4132.4ms** vs **&lt;2500ms** | `/tmp/dg-busy/lighthouse/{summary,home.report}.json`: simulated LCP **4132.4487ms**, perf score **0.77**, a11y/BP/SEO **100** | **Supported** (single run) |
| Three LCP samples **4008.8 / 4192.7 / 4132.4**; scores **76 / 76 / 77** | Only one full report + summary; strings `4008` / `4192` **absent** from report JSON | **Unsupported** |
| LCP element Home H1 `It’s Time / $Dasha.` | `lcp-breakdown-insight` node: `main#top > header#content > div > h1`, label `It’s Time\n$Dasha.` | **Supported** |
| Doc fast; no redirect; compression | `document-latency-insight`: 47ms server, no redirects, compression; LCP TTFB subpart ~88ms | **Supported** |
| TBT ~0; CLS 0 | TBT **0**; CLS **0** (packet’s 96.3ms TBT not in preserved run) | **Mostly supported** |
| **3150ms** FCP/LCP savings from removing render-blocking Webflow/jQuery/WebFont/CSS | `render-blocking-insight` score **0**, `metricSavings` FCP/LCP **3150**, display ~3140ms; 8 items: jQuery, webfont.js, 5× webflow JS, **1× webflow shared CSS** | **Supported as LH estimate** (not as measured post-fix delta) |
| Not origin / large Dasha DOM / image LCP / layout / Dasha main-thread | DOM **264**; images **0**; bootup **0.3s**; main-thread **0.9s**; TBT **0**; no LCP image | **Supported** for exclusions |
| Async JS toggle is weakest **sufficient** correction | Toggle not applied; no before/after; estimate includes **CSS**; observed FCP/LCP **1365ms** vs simulated **4132ms** (`throttlingMethod: simulate`) | **Unsupported as sufficiency** |
| Prepared only; no Webflow/publish change | Packet self-statement; no contrary live-mutation receipt in scope | **Consistent** |

Source tool: `demigod-lighthouse.mjs` → mobile Lighthouse 13.4.1, formFactor mobile, **simulated** Slow-4G/CPU×4. URL `https://www.getdasha.com/`. Fetch time `2026-08-11T15:48:01.850Z`.

## FINDINGS

### 1. Gate failure (narrow)

Under the preserved **simulated** mobile sample, LCP fails a 2500ms bar. That part of the packet holds for the artifact that exists. Multi-run median/IQR does not.

### 2. “Webflow generated-shell” — class OK, mechanism overfit

Supported: critical path is shell assets (sync/high-priority Webflow JS + shared CSS + WebFont loader), not Dasha lobby work (`simp-board.js` is **Low** priority), not origin latency, not image LCP, not CLS/TBT.

Overfit: “generated-shell” is a **bundle** of distinct blockers. Longest *dependency* chain in the insight is **webfont.js → Google Fonts CSS → woff2** (~598ms chain duration in the tree), while the **largest single render-blocking durations** are jQuery (~1784ms wastedMs) and webflow main JS (~1695), with **CSS still listed** (~1545). Diagnosis as “shell critical-path delay” is fair; collapsing it to “sync page JS only” is not.

### 3. Async-JS toggle is **not** shown to be weakest **sufficient** correction

- LH **3150ms** savings is for clearing **all** listed render-blocking requests, **including CSS**.
- Webflow’s async-JS option (per packet’s own help link framing) targets **scripts**, not render-blocking CSS.
- No staged/public A/B exists; effect is unmeasured.
- **Observed** paint (~**1365ms**) already sits under 2500ms; simulated inflation is the failing number. That weakens any claim that a site mutation is *necessary* for real-user LCP without field/CrUX evidence (none in packet).
- Weaker alternatives not discriminated: drop/disable WebFont project fonts, non-blocking/critical CSS path, fewer shell scripts, font-display (LH only ~100ms). Packet’s “no custom shim” is fine; **sufficiency of the native JS toggle alone is the unsupported leap**.

### 4. Unsupported / over-strong claims (checklist)

1. Three controlled samples and median of three (only one report on disk).  
2. Performance scores 76, 76, 77 (only 77 preserved).  
3. TBT 96.3ms in one sample (preserved run TBT 0).  
4. Async JS is **sufficient** to reach median LCP &lt;2500.  
5. 3150ms estimate **equals** expected post-toggle LCP gain.  
6. Implicit identity of “render-blocking resources” with “async-loadable JS” (CSS + font pipeline remain).

### 5. Falsifiers

| Hypothesis | Observation that falsifies |
|---|---|
| Sync shell **JS** is the dominant LCP gate | After **only** “Asynchronously load JavaScript” (CSS/fonts unchanged), **median simulated LCP stays ≥2500ms** and `render-blocking-insight` still attributes large LCP savings to **CSS** (or LCP barely moves while JS leaves the blocking table). |
| Generated shell (any) is the gate | LCP remains ~4s after shell scripts **and** shared CSS are non-blocking / removed from critical path in a controlled compare. |
| Dasha product JS/DOM is the gate | (Already strained) LCP improves to pass **without** touching Dasha lobby assets — would support shell; opposite would revive product-side hypothesis. |
| Simulation-only failure | Field/CrUX or unthrottled observed LCP consistently &lt;2500 while simulated stays high — gate bar may be mis-calibrated to lab sim only. |

## HANDOFF

**Minimum discriminating test (one experiment):**

1. Stage Webflow **Asynchronously load JavaScript** only (no other shell/CSS/font change); do not treat as public ship without separate auth.  
2. Three controlled mobile runs via same harness (`node demigod-lighthouse.mjs --json --url=https://www.getdasha.com/` or preview URL), preserve **each** `home.report.json` + raw LCP list.  
3. **Pass correction hypothesis** only if median **simulated** LCP **&lt;2500ms** and critical surfaces still pass existing Home/Studio/Desk/Quiz/Board/live-readback gates.  
4. **Fail / escalate** if median LCP ≥2500: next single factor is **render-blocking shared CSS** (and/or WebFont project fonts), not another JS shim.  
5. Record observed vs simulated LCP side-by-side so the gate is not silently “sim-only.”

**Packet disposition:** keep **gate FAIL (lab sim)**; demote correction from “sufficient fix” to **untested partial mitigation**; restore multi-sample claims only with three retained reports.

**Publication / Webflow:** still unauthorized by this review. Prepared ≠ published.
