# Loop iteration BU — the favicon, and finish the asset set

## State

```
assets      hero diagram (SVG, inlined), 1200x630 OG card (SVG -> PNG)
missing     favicon — no icon at all, so a tab shows the browser's blank sheet
menu        (b) favicon/wordmark was on the list I put to grok; grok never picked
gated       dasha-landing.test.mjs PASS at 390/1440, axe 0 serious
blocked     deployment and git push both need the user
```

## Why this, now

Everything else on Dasha is either done, or waiting on a deploy I cannot perform.
This is the last unbuilt piece of the "generate assets to use" request, it lives
entirely in my own file, and it is a real gap rather than a preference: a page with
no `<link rel="icon">` gets the browser's default blank document glyph, in the tab,
in bookmarks, and in history. For a product whose distribution is people sharing
links, the tab is a surface.

It also completes a set. The hero diagram and the OG card already share a palette
and a idea — the invalidation line drawn first. A favicon that repeats that mark
makes tab, bookmark and social card read as one product rather than three
unrelated images.

## Task 1 — design the mark from what already exists, not from scratch

The visual idea across both existing assets is **a line with a level drawn before
it** — the dashed invalidation rule under a rising path. At 16px almost none of
that survives, so the mark has to be the simplest possible reduction of it.

Constraints that decide the design:

- **16px is the real size.** A mark that is legible at 512 and mud at 16 is the
  normal failure. Two or three shapes maximum, high contrast, no text, no gradient.
- Palette from the page: background `#08090b`, accent `#d8ff52`.
- **No coin glyph, no ticker, no chart that could read as market data.** The same
  rule the OG card follows — a favicon is the most decontextualised artifact of all
  and must not imply a price or an endorsement.

## Task 2 — inline it, do not add a file to fetch

Use an SVG data URI in `<link rel="icon">`. Reasons, in order:

- It cannot 404, which matters on a page whose every other image was on a free host.
- It needs no deploy step, so it works the moment the page is served anywhere.
- It is diffable text in the document rather than an opaque binary.

Add an `apple-touch-icon` only if it costs nothing; a missing one degrades to the
screenshot, which is acceptable, whereas a wrong one is a broken image on a home
screen.

## Task 3 — verify at the size it will actually be seen

Render the mark at **16px and 32px** and look at it. Not at 512 and assume. Both
scaled-type mistakes I made today — the hero diagram and the OG headline — were
caught this way and would have shipped otherwise.

Then confirm the browser actually resolves it: load the page and read
`document.querySelector('link[rel=icon]')` and check the data URI parses as SVG.
An icon that is present in markup but malformed renders as the same blank sheet,
and the markup would look correct.

## Task 4 — keep the gate green and the copies honest

`dasha-landing.test.mjs` must still pass. The favicon is in the landing page's
`<head>`, which is outside the tool region the drift guards compare, so the
standalone is unaffected — confirm rather than assume, since a guard tripping for
an unrelated reason has happened twice today.

Consider whether the standalone deserves the same icon. It is a shipping surface
that the landing page links to.

## Constraints

- Inline data URI; no new file to fetch, no upload.
- Verify at 16px by looking, not by rendering large and assuming.
- No coin, ticker, price or chart-like glyph.
- Do not touch the tool region in either file.
