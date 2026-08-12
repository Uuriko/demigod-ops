---
status: working
owner: performance-gate
created: 2026-08-11
authority: archive/dasha-docs/DASHA-EXECUTION-PLAN-2026-08-11.md
---

# Dasha performance gate — measured correction packet

## Verdict

The execution plan's simulated-lab performance gate is not met. Three controlled Lighthouse mobile samples on the
live Home route produced LCP values of **4008.8ms, 4192.7ms and 4132.4ms**; median **4132.4ms** versus
the required **<2500ms**. Performance scores were 76, 76 and 77. Accessibility, best practices and
SEO were 100 in each run. The durable values are in `DASHA-PERFORMANCE-SAMPLES-2026-08-11.json`;
the harness overwrote the earlier full reports, so future A/B runs must use distinct output folders.

## Root-cause evidence

- LCP element: Home hero H1, `It’s Time / $Dasha.`
- Live document response: about 47–88ms; no redirect; compression enabled.
- Total blocking time: 96.3ms, 0ms and 0ms; CLS: 0 in every sample.
- Lighthouse estimates **3150ms FCP/LCP savings** from removing generated render-blocking resources:
  Webflow runtime chunks, Webflow shared CSS, jQuery and WebFont loader.
- Dasha's canonical landing fragment already uses system fonts for body and headings, contains only
  264 rendered elements in the measured page, and is not the source of the font dependency.

Factor isolation supports a Webflow generated-shell critical-path delay, not slow origin, large Dasha
DOM, image LCP, layout instability or Dasha main-thread work. Blocking only generated Webflow/jQuery/
WebFont scripts improved simulated LCP to **2667.7ms** (still failing). Blocking those plus Webflow's
shared stylesheet improved it to **1742.9ms** (passing). These are upper-bound diagnostics, not a
shippable configuration: Dasha interactions require their own scripts and the shell may require CSS.

## Prepared candidate correction

Stage Webflow's native **Asynchronously load JavaScript** and **Per page CSS** advanced publishing
options together. Webflow documents that synchronous JavaScript blocks content rendering and that
Per page CSS removes styles unused by each page:
<https://help.webflow.com/hc/en-us/articles/38265301927059-Understanding-per-page-JavaScript-and-asynchronously-loading-JavaScript>
<https://help.webflow.com/hc/en-us/articles/33961287288339-Advanced-publishing-options>

No custom defer shim, framework, font copy or alternate page is justified before these two native
options are measured. They are Webflow site mutations and take effect only after publication, so
they remain separately gated. The factor-isolation result proves that async JavaScript alone is not
sufficient under the lab gate; Per page CSS is still a candidate reduction, not a proven fix.

## Compatibility and release protocol

Publish both native options to the `talentlink-sf.webflow.io` staging domain first, not the custom
domain or Designer preview. Run the existing Home, Studio, Desk and Quiz/Board browser gates against
that staging build. Explicitly verify first-paint content, Simp Board mount, Quiz completion, Studio
mount, copy actions and Webflow navigation. Dasha's inline Home copy script is parser-ordered after
its target elements; no speculative DOM-ready wrapper is needed. If any actual custom-code ordering
regression appears, turn the option off before custom-domain publication; do not patch each caller
to race Webflow.

Collect three fresh controlled mobile samples against staging, each with a distinct `DG_LH_OUT`
folder. Promote the candidate only when median simulated LCP is below 2500ms with no accessibility,
interaction or release regression. If it remains at or above 2500ms, leave both options off and
record the Webflow-hosted shell as the remaining constraint rather than adding custom loading hacks.
Preserve simulated and observed LCP separately; a Lighthouse score alone is insufficient.

## Commands

```bash
node demigod-lighthouse.mjs --json --url=https://www.getdasha.com/
node dasha-ship.mjs --status
npm run dasha:verify:live
cd .grok/worktrees/potter/dasha && npm run dasha:audit:live -- --fast
```

## Current authority boundary

Measured and prepared locally. No Webflow setting, publication or external message was changed for
this correction packet.
