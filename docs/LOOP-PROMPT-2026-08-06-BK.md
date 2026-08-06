# Loop iteration BK — the social preview image the brief asked for

## State

```
brief item  "Add lang='en', a canonical URL, og:url, and a purpose-built social
            preview image."
done        lang, canonical, og:url, og:title, og:description, twitter:card
missing     og:image entirely — the page has no social preview at all
context     the whole product is a tool for posting a call on X, so the card that
            renders when the page itself is shared is not decoration
```

## Why this, now

Dasha's wedge is accountability at the moment of a call, and the call gets posted
on X. A link to the tool that unfurls as a blank grey box is the worst possible
first impression for exactly that audience — and `twitter:card` is already set to
`summary_large_image`, which means a large image slot is being requested and
nothing is filling it.

This is also the "generate assets" half of what was asked, done properly: an
original card, not a sourced photograph, for the reasons already stated about
likeness and unconfirmed project identity.

## Task 1 — design the card as SVG, then rasterise it

OG images must be raster in practice; most platforms will not render an SVG
`og:image`. So: author it as SVG for precision and diffability, render it at
1200×630 in the browser, and save a PNG. That is a capability already proven today
— the hero art was rendered and measured the same way.

1200×630 is the correct OG ratio. The receipt tool's own share card is 1200×675;
do not copy that number, it is a different artifact for a different slot.

## Task 2 — what goes on it

The card has to work as a thumbnail, so it carries almost nothing:

- The line that is the product: *Write the call before the chart writes the story.*
- "Dasha Labs" and enough to say it is a free tool with no wallet.
- The same palette as the page, so the click-through is continuous.

**No token ticker, no price, no chart that could read as real data, no mint
address.** The brief withholds token claims until identity is confirmed, and a
social card is the single most screenshot-and-decontextualised artifact a site
produces. It must not carry a claim the page itself would not make.

Type must survive thumbnailing — X renders these small. Test legibility at the size
it will actually appear, not at full resolution. That is the mistake I made twice
today with diagrams and caught by measuring.

## Task 3 — wire it and verify it resolves

- `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`,
  `twitter:image`. Absolute URLs — relative ones do not unfurl.
- Verify the file exists at the path referenced, and that its dimensions match the
  declared width and height. A mismatch is a common cause of a card silently not
  rendering.
- Re-run the page audit: no overflow, no page errors, all previous checks still
  green.

## Task 4 — one honest limitation

The canonical URL currently points at `https://dashalabs.xyz/`, which I chose as a
placeholder because no live URL is recorded anywhere in the repo. State that
plainly: if the real domain differs, `canonical`, `og:url` and `og:image` all need
updating together, and a wrong absolute URL is worse than none because it points
the unfurl at a host that will not serve the image.

## Constraints

- Original artwork only. No sourced photographs, no likeness of any person.
- No token ticker, price, mint address, or anything resembling real market data.
- Self-contained page; the PNG is the only new binary and it must live beside the
  HTML.
- Verify by rendering, not by inspecting markup.
