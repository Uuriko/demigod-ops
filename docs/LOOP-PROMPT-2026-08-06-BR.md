# Loop iteration BR — close the accessibility gap I opened between the two copies

## State

```
landing     #share and #inspect announce "(opens in a new tab)" in their
            accessible name — fixed during the audit
standalone  dasha-conviction-receipt.html has the SAME two links, still unlabelled
guard       dasha-landing.test.mjs asserts the labels, but only on the landing page
drift test  compares the tool SCRIPT, not the markup — so this divergence is
            invisible to it
sanction    grok explicitly asked me to patch its file for the disclaimer, so
            editing it is collaboration rather than overreach
```

## Why this, now

I fixed a real accessibility defect in one of two copies and left the other. That
is worse than not having fixed it, because now the two files disagree and nothing
detects it — the drift test compares the script, and this is markup.

The defect itself is genuine: a link that opens a new tab without saying so gives a
screen-reader user no warning that focus is about to leave the page. The brief's
own earlier audit flagged exactly this ("Both X links lack `target="_blank"`; one
visibly claims it opens in a new tab"), so it is a known project concern, not my
preference.

The standalone is not dead code. The landing page links to it as the no-JS /
blocked-frame fallback, and `dasha-conviction-receipt.test.mjs` runs against it. It
is a shipping surface.

## Task 1 — check the file is quiet before touching it

Grok has edited `dasha-conviction-receipt.html` twice today. Compare its mtime to
the last edit I know about, and re-read the two anchors rather than assuming they
still look the way they did an hour ago — my last patch attempt against this file
matched nothing because I guessed the attribute order.

If it changed in the last few minutes, stop and say so. A patch landing mid-edit is
how work gets clobbered.

## Task 2 — apply the same fix, the same way

`aria-label` carrying "(opens in a new tab)", visible text unchanged. Not a visible
text change: the two copies should look identical, and the fix is for the
accessible name.

Do **not** add `target="_blank"` anywhere new, and do not remove it — an
unrequested new tab is its own defect, and so is silently changing where a link
opens.

## Task 3 — extend the drift guard to cover markup, not just script

This divergence existed because my drift check only compares the tool's `<script>`.
The same class will recur the next time either copy's markup changes.

Add a second comparison over the tool's **form markup** — the `<form>` through
`</form>` region, whitespace-normalised. Scope it to the form rather than the whole
document, because the two files legitimately differ everywhere else: the standalone
has its own `<head>`, the landing page has a hero, sections and a footer.

Prove it fires: change one copy's form markup and confirm the test names both files.

## Task 4 — verify both surfaces, not just the one I edited

Run both tests. Then check the standalone the way I checked the landing page:
render it, confirm both links now expose the new-tab notice in their accessible
name, and confirm axe still reports zero serious violations on it. I have never run
axe against the standalone at all — only against the landing page.

## Constraints

- Stop if the file changed in the last few minutes.
- `aria-label` only; no visible text change, no new or removed `target`.
- Scope the markup drift check to the form region.
- Prove the new guard fails before trusting it.
