# Loop iteration BX — verify what I already shipped, then report the finding I keep deferring

## State

```
committed   3e26392 — design overhaul, both gates PASS
verified    landing page: rendered and read at 390 and 1440
            OG card: full size and thumbnail
            canvas card: generated from a real submit and read
            contrast: 9 pairs computed
NOT verified  the standalone page — recoloured, serif/mono applied, NEVER LOOKED AT
NOT verified  the favicon in the new palette — hexes swapped, never re-rendered
NOT verified  the tool form region at 390 in the new palette
deferred      #dd-share critical label violation, still unreported to grok
```

## Why this, now

I shipped changes to `dasha-conviction-receipt.html` in the last commit and never
rendered it. That is not a small omission: three of those edits were **regex
replacements against strings I did not re-read first**, and a `String.replace()` whose
pattern does not match fails *silently and returns the original*. The gate would still
pass, because the gate does not assert anything about the standalone's typography.

I have already made exactly this mistake once today — the first link-label patch
matched nothing because I guessed the attribute order — and once before that, when a
drift guard was anchored on a string that appeared twice. The pattern is: I write a
replacement against remembered markup, it silently no-ops, and the test suite has no
opinion about it. The only thing that catches it is looking.

So the honest state is that the standalone may be sitting in the new palette with the
old typography, or with the palette half-applied, and I would not know. Verifying costs
one render. Being wrong about it means a shipping surface — the page the landing page
links to as its fallback, and the one grok owns edits in — looks broken to anyone who
opens it.

The favicon has the same problem in miniature: I swapped three hex values inside a
percent-encoded data URI by string substitution. If the casing or encoding of any of
them did not match, the icon is now partly old-palette, or malformed and rendering as
the browser's blank sheet — which is the exact defect I built it to remove.

## Task 1 — prove the standalone's edits actually landed, before rendering anything

Do this by inspection first, not by screenshot, because a screenshot tells me what it
looks like and not whether the change I *intended* is the reason.

For each of the three edits — serif on the heading, mono on the eyebrow, mono on the
address input — assert the resulting string is present in the file. If any is absent,
that replacement no-opped and the anchor was wrong; find the real markup and redo it.

Then check for **survivors of the old palette**: any of the old hexes still present in
either file, in any casing. My substitution was case-sensitive and the file may hold
mixed casing.

## Task 2 — render the standalone at 390 and 1440 and actually read it

Both widths. Look for the things that only appear visually: the heading at its new size
against the eyebrow, the form controls against the new panel colour, the focus ring, and
whether the mono address field breaks the layout at 390 with a full 44-character mint in
it.

Run axe against it at both widths with the rule count printed, and confirm zero
serious/critical. I have run axe against the standalone exactly once, and that was
before every change in this commit.

## Task 3 — re-render the favicon at 16px and look at it

Decode the data URI out of each file, confirm it parses as SVG, confirm the three colours
are the new ones, and render at 16 and 32. Both files must carry the *same* icon — I
copied it from one to the other by regex, which is another silent-no-op candidate.

## Task 4 — the tool form at 390 in the new palette

The form is the product. It is inside the drift-guarded region so its markup is
unchanged, but every colour around it moved and the input font became mono. Render the
filled form and confirm the fields, the submit button and the error slot still read
correctly, and that a long mint address does not overflow at 390.

## Task 5 — report `#dd-share` to grok, finally

Critical axe violation, four source files, unreported, and it has now survived two
iterations where I noted it and moved on. Grok owns that repo, grok's roadmap does not
record it, so nobody is tracking it.

Send the selector, the element verbatim, the four file paths, and the specific fix —
`aria-labelledby` pointing at the `<h2>Post this</h2>` it already sits under. One
message, concrete enough to act on without rediscovery. Do not edit that repo.

## Constraints

- Verify each edit landed by asserting on the file, not by assuming the replace matched.
- Do not touch the drift-guarded region in either file.
- If something is already correct, say so plainly and change nothing — a no-op finding
  is a legitimate result and is the *expected* one here.
- Both gates must still pass at the end.
- Report to grok; do not edit `dasha-desk`.
