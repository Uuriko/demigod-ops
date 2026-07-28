# Apply-note: two `<h1>` on every mini-page (SEO)

**Status:** BLOCKED — the fix is a `foot-core` render change. `demigod-foot-core.js` is dirty/off-limits
and publishing needs potter's authorization. This note de-risks the fix; it does not apply it.

**Detected by:** `demigod-seo-audit.mjs` (`multiple-h1(2)` on ~every content route). Diagnosed via CDP
against live v845 on 2026-07-28.

## Root cause (confirmed)
When `foot-core` routes to a mini-page it adds the correct page heading in `.dg-page-top` but **leaves the
homepage hero title in the DOM**, only hiding it with `visibility:hidden`. So each mini-page ships two
`<h1>` tags:

| route | h1 #1 (`.hero-title dg-hero-hold dg-cyb`) | h1 #2 (`.dg-page-top`) |
|-------|-------------------------------------------|------------------------|
| /hire | `Demigod` — visibility:hidden, offsetParent null | `Hire talent` — visible |
| /talent | `Demigod` — hidden | `Join the talent network` — visible |
| /pricing | `Demigod` — hidden | `Pricing` — visible |
| /faq | `Demigod` — hidden | `FAQ` — visible |
| /legal | `Demigod` — hidden | `Privacy & Terms` — visible |
| /about | `Demigod` — hidden | `About` — visible |

Same pattern on how, security, partnerships, events, startups. The homepage itself is correct (one visible
`Demigod` h1, no `.dg-page-top` h1).

## Why it matters
- SEO expects exactly one `<h1>` per page. Two competing h1s (one a hidden generic brand word) dilute the
  page's topical signal — the page's real subject ("Pricing", "FAQ") shares h1 weight with "Demigod".
- `visibility:hidden` keeps the element in the DOM and in the parsed source, so crawlers still see it; a
  hidden keyword-bearing `<h1>` can read as a hidden-text pattern. This is not fixed by CSS hiding.

## Intended fix (foot-core)
On any mini-page route, the hero `.hero-title` element must not remain an `<h1>`. Either:
1. **Retag** `.hero-title` from `<h1>` to a non-heading element (`<div class="hero-title">…`) when a
   `.dg-page-top` h1 is present, or
2. **Remove** the `.hero-title` node from the DOM on mini-page routes.

Leave the homepage untouched (its single `Demigod` h1 is correct). `display:none`/`visibility:hidden` are
NOT sufficient — the element must stop being an `<h1>` in the served/rendered DOM.

## Verify after fix
`node demigod-seo-audit.mjs` — every route should drop to `h1Count === 1` and the `multiple-h1(2)` warnings
should clear. (The audit counts DOM-level `<h1>`, so a merely-hidden h1 will still fail — that's intended.)
