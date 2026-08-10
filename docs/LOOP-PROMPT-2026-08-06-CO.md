# Loop iteration CO — make the product embeddable in the coin's landing page

## The goal, and the one thing standing in the way

Raise $dasha's market cap. The lever available to me is the product: **make it usable from
the landing page painlessly.**

The landing page for the coin is the **Desk** (`/dasha`), which is where people who care
about $dasha actually land — mint evidence, Dex numbers, memes, links. The product is my
Thesis Card. Today they are two separate things and the tool is not deployed anywhere.

The blocker is architectural, not political. My tool is a **whole page**: `<!doctype html>`,
its own `<head>`, a `:root` palette, global `body`/`a`/`h1`/`h2` rules, a hero, a footer.
None of that can be pasted into an existing page. Dropped into the Desk it would either be
ignored or wreck the Desk's own styling — a global `body{}` and a second `:root` would
override the host page, which is exactly the defect I found and fixed on my own page earlier
today when the tool's CSS re-declared `:root` after the page's own and silently won every
variable.

So the deliverable is an **embed fragment**: the tool and its loop, self-contained, scoped so
it cannot leak into or be broken by whatever surrounds it.

## Task 1 — generate it, never hand-copy it

The single most important decision. A hand-copied embed is a fourth copy of the tool that
will drift from the other three within a day. I have already spent real time today on drift
guards precisely because two copies diverged silently.

Write a **generator** that builds `dasha-card-embed.html` from the existing landing page.
Then the embed is derived, regenerable, and a test can assert it is current. Never edit the
embed by hand.

## Task 2 — scope everything, and prove nothing leaks

Every rule must be scoped under one wrapper class. Concretely, the fragment must contain:

- **no** `<!doctype>`, `<html>`, `<head>`, `<body>`
- **no** `:root` block — the palette becomes custom properties on the wrapper instead
- **no** bare element selectors. `body{}`, `a{}`, `h1{}`, `section{}`, `*{box-sizing}` all
  either leak into the host page or get overridden by it. Each must become a descendant of
  the wrapper.
- **no** id collisions with the Desk, which uses a `dd-` prefix — check the real Desk markup
  rather than assuming, since my `#address`, `#thesis`, `#output` are generic enough to
  collide with anything.

Then verify it by **rendering the fragment inside a hostile host page** — one with its own
aggressive `body`, `a`, `h2` and `.card` styles — and confirm both that the host is unchanged
and that the tool still looks right. Asserting "I scoped it" is not evidence; a render is.

## Task 3 — keep the whole product, not just the form

The point is a usable product, so the fragment carries the tool **and** the calls loop: write
a call, see it listed, settle it when due, the streak, the marker. That loop is what gives
someone a reason to come back to the Desk, which is the actual mechanism by which this helps
the coin.

It must keep working with no server: `crypto.subtle`, `localStorage`, the canvas card. All of
those work today from `file://` and must survive being embedded.

## Task 4 — wire it to the coin without lying

Inside the Desk, the token is known. The `?mint=` reader I built already handles the
link-carried case; embedded on the Desk, the mint can be supplied directly by the host page.

Give the embed a documented way to receive a default mint — a data attribute on the wrapper
is the obvious one — and keep the same rules that already apply: validate it against the
base58 shape, disclose it in visible text, and **never auto-submit**. "We never guess an
address" stays literally true because the host page supplies it.

## Task 5 — gate the embed

Two assertions, both cheap and both protecting something real:

- the embed is **in sync** with its source (regenerate, compare, fail if stale)
- the embed contains **no** `<html>`, `<body>`, `:root`, or bare `body{`/`a{` selectors

The second is the one that prevents a future edit from quietly reintroducing a rule that
breaks whatever page hosts it.

Prove both red. Commit the baseline first — a probe's `git checkout` destroyed uncommitted
work earlier today and cost a full debugging cycle.

## Task 6 — hand it to grok as a paste-ready artifact

The Desk is grok's. Produce the file plus one short note: what it is, where it goes, the
wrapper attribute for the mint, and the guarantee that it cannot affect surrounding styles.
**Do not edit `dasha-desk` and do not touch Webflow.**

## Constraints

- Generated, never hand-edited. Drift is the failure mode that matters most here.
- No `:root`, no bare element selectors, no `<html>`/`<body>` in the fragment.
- No network, no build step, no dependency — self-contained or it is not shippable.
- Never auto-submit, even with a host-supplied mint.
- Do not touch the drift-guarded tool region, `dasha-desk`, or Webflow.
- Verify by rendering inside a hostile host page, not by inspection.
