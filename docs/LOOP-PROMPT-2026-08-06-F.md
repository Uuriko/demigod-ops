# Loop iteration F — verify what shipped, then decide what's next

## State

```
suite            537 / 537
truth            disk v1016 · live v1015 · +1 ver · 0h · siblings intentional-staged
foot lock        FREE
bloat            73 files / 186K removed last iteration
control board    3 delivery-loop failures (no commit moves them) + backup_capability
```

## Correction to carry forward

I told the user twice that the directory intent-capture button was "on disk and
not live." **It is live.** The published sibling asset at
`https://files.catbox.moe/9v2uqg.js` contains `dg-dir-brief` six times and is
byte-identical to disk (45,628 bytes, matching sha in `DEMIGOD-FOOT-CDN.json`).

My earlier check hit `https://www.trydemigod.com/startup-map-latest.js`, which is
not where the asset lives. The manifest — `DEMIGOD-FOOT-CDN.json → assets.startupMap.url`
— is the only authority on where a sibling asset is published. Guessing a path
and reporting the miss as "not live" is the same error class as reading served
HTML instead of the rendered DOM.

## Task 1 — verify the button actually works for a user

I shipped a feature and never confirmed a human can use it. `demigod-conversion-audit.mjs`
exists precisely because of this lesson: *measure what users get, not what the
source says*. Source greps and byte-matches prove the code shipped. They do not
prove the button renders, is reachable, or does anything when clicked.

Drive the live site over CDP and establish, in order:

1. `/startups` renders directory rows at all.
2. At least one row with observed open roles shows a `button.dg-dir-brief`.
3. The button has an accessible name containing the company (screen-reader path).
4. It is keyboard reachable — `tabindex` reachable, focus ring visible.
5. Clicking it opens the startup wizard, and the company field is prefilled with
   that row's company.
6. The fallback path is not silently broken: another agent replaced my dead
   `/hire` fallback with `/?wiz=startup` — confirm that route actually opens the
   wizard, because I never verified the original and shipped it broken.

If any step fails, that is a real defect in a live feature and it takes priority
over anything new. Report the exact row, viewport, and observed behaviour.

Do this at desktop **and** 390px. The site holds a 44px touch-target contract and
the button was written to it, but written-to and rendered-at are different claims.

## Task 2 — fresh competitor research

The standing goal asks for frequent web searches for brainstorming and comparison.
Two rounds are already filed (`COMPETITOR-ANALYSIS-2026-08-05.md`). Do not repeat
them. Look for something neither round covered:

- What do these products do at the **moment a founder first arrives** — before
  any signup? Demigod's directory is exactly that surface and just got a CTA.
- Anything shipped in the last ~30 days by Paraform, Dover, Wellfound, Jack &
  Jill, Mercor, or Pallet. Changelogs and job postings reveal roadmap better than
  marketing pages.
- Whether any of them expose a public data asset the way Demigod's directory does.
  If none do, that is the wedge sharpening; if several do, the directory is table
  stakes and the CTA is the only differentiator.

## Task 3 — debate, then build the winner if it is small

Put the research to Codex and Grok as opposing positions, judge, and build only if
the winner is genuinely small. Two rounds have now both resolved the same way —
Grok won on sequencing both times, and both agents refuted themselves into the
same synthesis. If a third debate produces that pattern again, say so plainly
rather than staging it for its own sake.

## Constraints

- **The manifest is the authority** on published asset URLs. Never guess a path.
- **Rendered DOM over source greps** for any claim about what users see.
- No publish without authorisation in the current request.
- Scope commits explicitly; other agents remain active.
- If Task 1 finds a defect, stop and fix it. A broken live feature outranks
  research.
