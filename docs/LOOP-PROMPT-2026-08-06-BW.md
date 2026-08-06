# Loop iteration BW — the design overhaul, built on where grok and codex agreed

## The consultation

I put five specific questions to both agents against the current page. They answered
independently and **converged on the same diagnosis**, which is the strongest signal
either channel has produced on this project.

**Unanimous:**

| # | Both agents said |
|---|---|
| 3 | **Replace the before/after diagram.** It restates the headline and never shows the product. |
| 5 | **The one thing: put a finished, filled-in example receipt in the hero.** Identical answers, independently reached. |
| 4 | One accent doing every job (eyebrow, links, CTA, focus, rules, fingerprint) **flattens hierarchy** and reads as generic dark Web3. |
| 2 | Tool stays **above** the explainer. Explanation serves hesitation; it shouldn't block action. |
| 1 | Keep it self-contained — **no font file, no CDN** — but split display type from body type. |

**They disagreed on two, and the disagreement is useful:**

- *Display face:* grok says **mono** (pairs with UTC + SHA-256, reads as instrument);
  codex says **editorial serif** (reads as publication, deliberately un-crypto).
- *Accent hue:* grok keeps acid green (`#C9E84A`) and fixes the roles; codex goes
  **lavender `#C8B6FF`** because acid-green-on-black "resembles a crypto trading
  terminal, which conflicts with *no wallet, no trading*."

**Grok also found two defects I had missed, both real:**

1. The hero's primary CTA is `href="./dasha-conviction-receipt.html"` — it sends the
   visitor **off the page** to a standalone copy of a tool that is *already inlined
   below*. That is a straight conversion hole.
2. "Frame blocked or JavaScript off? Open the tool on its own page" is **dead copy**.
   It's left over from when the tool was iframed. It no longer is. The page is telling
   the reader about a failure mode that cannot occur.

## How I'm resolving the two disagreements

**Typography — take both, assign each to what it is actually good at.** Three roles,
zero font files:

- **Display** (h1, h2, eyebrows): editorial serif. Codex's argument wins for the
  headline specifically because it is the *contrarian* choice — near-zero crypto pages
  use serif, and differentiation is the point. Mono display is what every other one does.
- **Data** (fingerprint, UTC stamp, token address, the card): mono. Grok is plainly
  right that the receipt artifacts should look like instrument output.
- **Body and controls**: system sans, unchanged.

**Colour — take codex's direction.** Not on taste: the argument that an acid trading-
terminal palette contradicts the page's own "no wallet, no trading, no price data"
claim is the strongest single point either agent made, and it is about *honesty of
signal*, which is this entire product's thesis. A page that looks like the thing it
says it isn't is lying with CSS.

Cost, stated plainly: the favicon and the 1200×630 OG card are both currently acid
green. **They must be regenerated in the new palette in this same iteration** or the
asset set fractures — which is the exact failure I built the favicon to avoid.

## Task 1 — the hero, rebuilt around a filled example receipt

Replace the two-panel diagram with an inline SVG of a **completed thesis card**:
thesis text, the invalidation line, a UTC timestamp, a 12-character checksum, and the
"not financial advice" footer — annotated with three restrained callouts along the
lines of *committed text*, *UTC timestamp*, *fingerprint*.

This answers "what do I actually get?" and "why can't I rewrite it later?" before the
reader is asked to type anything.

**Hard constraints on the sample content, because this is the riskiest thing in the
overhaul:**

- The example must be visibly an example. Label it.
- **Do not use the candidate mint** `53uxQ…`. A filled card showing that address is a
  call on that token rendered in the product's own voice, and control/endorsement is
  not established. Use an obviously illustrative address.
- The example thesis must not be a real call anyone could act on, and must contain no
  price target, no return figure, no timeframe implying a gain.
- No real price data anywhere in the artwork, as with the diagram it replaces.

Keep the before/after diagram only if it survives demotion to a small secondary figure
beside the mechanism copy. If it looks like decoration down there, delete it — grok's
read was that it already reads as decoration at 420px.

## Task 2 — fix the two defects grok found

Point the hero CTA at **`#tool`**, not at the standalone file. The tool is on the page;
sending people away from it is the conversion hole.

Delete the dead "Frame blocked or JavaScript off?" line. Keep a link to the standalone
somewhere honest — it is a real fallback and a real shipping surface — but stop
describing an iframe that no longer exists.

## Task 3 — fix the two `<h1>`s

The page has a hero `<h1>` and the inlined tool brings the standalone's own `<h1>`
along with it. Demote the tool's to an `<h2>` **in the landing copy only** and drop its
`clamp(2.4rem,8vw,5rem)` so it stops outshouting the hero.

This is safe: the tool's heading sits at offset ~10115, and the drift-guarded region
starts at `<form id="receipt-form">` (~10297). **Verify that boundary by reading it
again before editing** rather than trusting this number — I have twice tripped a guard
by assuming a boundary instead of looking.

## Task 4 — the palette, with contrast checked rather than eyeballed

```
bg #0B0A0C   panel #151317   line #353039
ink #F2EDE7  muted #ADA5AE
accent #C8B6FF   accent-hover #DACFFF   invalidation #FF9E91
```

Accent is reserved for **primary action, focus rings, and the fingerprint**. Not
headings, not eyebrows, not decorative rules, not every bullet. That role discipline
*is* the fix both agents identified — the hue change alone accomplishes nothing if one
colour still does eight jobs.

Compute contrast ratios rather than trusting that a light-on-dark pair passes. Muted
text on panel is the pair most likely to fail, and axe will not catch every instance.

## Task 5 — say why it works, once, without overclaiming

Still owed from the research brief. Add the mechanism claim, then hold it to this line:

**The Tetlock/Lerner result is about forecasting and judgment tasks under lab
conditions. It is not evidence that a thesis card makes anyone money and not evidence
about token calls.** The page may say that committing to a position and its disproof
condition in advance is a documented route to more careful reasoning. It may **not**
imply returns, accuracy, or outcomes.

Write the strongest true sentence, then weaken it until it clears that boundary. If
nothing survives, ship nothing and say so — a page that overclaims research hands a
critic the exact contradiction this product exists to oppose.

The CHI 2026 paper is now available free at arXiv 2603.12000, so its four credibility
markers can be cited as read rather than as an abstract snippet. Fix the provenance
note in the research brief accordingly.

## Task 6 — regenerate the assets so the set stays coherent

Favicon and OG card, both in the new palette. Re-verify the favicon at **16px** by
looking at it, and re-check the OG card headline for the collision that `<tspan>` fixed.
The gate compares `og:image:width/height` against the **PNG header bytes**, so a
regenerated card must keep 1200×630 or the test fails — which is the test doing its job.

## Task 7 — verify

Render at 390 and 1440 and *look*. Every copy and layout failure today was caught by
looking at the render, never by reading the diff.

Run `dasha-landing.test.mjs`. Watch three assertions specifically:

- **>2000 indexable chars** — a design pass that trims copy could cross it
- **zero serious/critical axe** at both widths, with the rule count proving axe ran
- **both drift guards** — form markup and script must still match the standalone

## Constraints

- Nothing inside the drift-guarded tool region changes unless it changes identically in both files.
- No font file, no CDN, no external image, no new dependency.
- No outcome, return, or accuracy claim, explicit or implied.
- The example receipt must not use the candidate mint and must be visibly an example.
- Keep the "what this is not" strip — it is the page's honesty anchor.
- Contrast computed, not assumed.
