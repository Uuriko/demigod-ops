---
status: working
owner: performance-gate-review
created: 2026-08-11
authority: DASHA-PERFORMANCE-GATE-2026-08-11.md
reviewed_sources: DASHA-RULES.md, DASHA-WORKFLOW.md, DASHA-DOCS.md, dasha-landing.html, dasha-simp-board-client.js, dasha-lobby-client.js, dasha-live-verify.mjs, dasha-*.test.mjs listing
---

<!-- agent-task: 20260811154944907-9-ptxfss; role: claude; completed: 2026-08-11T15:51:30.509Z; independent evidence review -->

# Review: Dasha performance gate — Async JS toggle compatibility

## Verdict: **FAIL** (packet's diagnosis is sound; its gate is not sufficient to publish on)

The LCP root-cause finding (Webflow-generated shell blocking, not Dasha markup) is well evidenced and the toggle is the correct minimum fix per Ponytail (native feature, no shim). The gap is entirely in the **verification protocol**, not the diagnosis.

## Exact code-ordering risk

- `dasha-simp-board-client.js:1646` and `dasha-lobby-client.js:888` guard entry with `if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto()` — **async-safe**, will run correctly whenever the script actually executes.
- `dasha-landing.html:36` (inline copy-button script) has **no such guard**. It runs `document.querySelector('.copy')` / `('#mint')` immediately, relying on synchronous in-order execution (script placed after its target elements in the DOM). Under async loading, this script can execute before those elements parse, `b`/`m` will be `null`, `b?.addEventListener` no-ops silently — the Copy button loses its handler with no error, no console signal, and no automated test would catch it.
- No jQuery/IX2 dependency exists in Dasha's own scripts, so no risk of Dasha code racing Webflow's jQuery global — the risk is isolated to the one unguarded inline script above.

## Missing checks in the packet's protocol

1. **Local test suite cannot exercise this regression at all.** `dasha-live.test.mjs`, `dasha-studio-embed.test.mjs`, `dasha-meme-studio.test.mjs`, etc. run against source HTML/JS files or the Chrome-CDP Desk build — none of them load the Webflow-generated production bundle with the toggle applied. The packet's line "run the existing Home, Studio, Desk, Quiz/Board and live-readback browser gates" reads as if these tests validate the toggle's effect; they don't. The only check that can actually observe script-order regressions is the manual staged-page click-through the packet also lists — that manual pass is the real gate, and it is a single unrepeated human pass with no CI backing.
2. **Staging target is unstated.** The packet says the toggle's effect "becomes public only after publication" but doesn't say the staging pass must publish to Webflow's `*.webflow.io` staging subdomain rather than the live custom domain. Without that explicit instruction, "stage the toggle" is ambiguous and could be read as designer-preview only (which does not reflect production asset loading) or, worse, as the production domain itself.
3. **No automated regression test added for the one unguarded script.** Per this project's own bar ("lazy code without its check is unfinished"), a DOM-timing-sensitive change to publish behavior ships with zero runnable check — only a manual "explicitly verify copy actions" step.

## Minimum correction

1. Add the same `readyState`-guard pattern already used in `dasha-simp-board-client.js`/`dasha-lobby-client.js` to the `dasha-landing.html:36` inline copy script (wrap the `querySelector` calls in the `DOMContentLoaded`-or-immediate pattern). This is the only code change required — everything else in Dasha's custom code is already async-safe.
2. Add one line to the packet's protocol naming the staging target explicitly: publish the toggle to the Webflow staging subdomain first, verify there, only then publish to the custom domain.
3. Keep the rest of the packet's protocol (3 fresh mobile LCP samples, median <2500ms, no accessibility/interaction regression, raw values preserved) as written — it is sufficient once (1) and (2) are done.

No new dependency, framework, or defer shim is justified — this stays a one-guard fix plus a protocol clarification, not a redesign.

## Integrator disposition

Accepted: explicit staging-domain A/B and interaction checks. Rejected: the proposed DOM-ready guard.
The inline script is encountered after its target nodes in the same parser stream; asynchronously
loading Webflow's generated external JavaScript cannot make it execute before already parsed markup.
The staging interaction gate remains capable of falsifying that platform assumption.
