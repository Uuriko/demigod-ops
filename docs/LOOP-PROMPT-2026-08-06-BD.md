# Loop iteration BD — wire the /how diagram, now that foot-core is reachable

## State

```
asset      assets/demigod-how-three-steps.svg — built, rendered, legible at
           390px (360x239, type at 12.2px), self-contained, no upload
verified   openPage sets root.innerHTML = ... + (meta.html || '') + ... raw, no
           sanitiser; foot-core already ships an inline <svg> (dg-mark, line 2312);
           copy scrubs are scoped to the two form selectors, zero target #dg-page
blocked by foot-core being written every few minutes — lapsed, quiet since 08:00
just did  FAQ chevron under the lock, released cleanly
```

## Why this, now

The image instruction — *"you and codex are able to generate new images and other
assets not just text… figure what things you both should create and add and
where"* — is still only half done. I made the asset and could not put it anywhere,
which is closer to the design-document outcome the instruction was warning against
than I would like.

Every reason it stayed unwired has now lapsed. The rendering path is verified, not
assumed. The file is reachable. The lock works — I just used it.

`/how` is where it belongs, established by looking rather than by preference: three
numbered steps, ~350 words, zero visuals, and on mobile only two of the three fit
above the fold.

## Task 1 — lock first, and re-check after claiming

`bin/dg lock claim --owner "$USER" --why "how-page flow diagram"`, then immediately
compare foot-core's mtime to what it was before the claim. If it moved, release and
stop — an hour of quiet is not a promise, and the other worker still has 183
uncommitted files here.

## Task 2 — insert the SVG at the top of the /how body

Find `DG_PAGES.how` (or whatever key `/how` maps to) and place the diagram at the
**start** of its `html`, before the prose. The point is that a visitor gets the
shape before the detail.

Rules:

- **Inline the SVG source**, do not reference `assets/`. Nothing on the page can
  fetch a local file — every image on this site is on catbox, and the whole reason
  this asset is SVG is that it needs no host.
- Minify only whitespace between tags. Do not restructure the markup; it was
  verified rendering exactly as written.
- Keep `role="img"` and the `aria-label` intact. axe is clean on 16 routes and must
  stay that way.
- Do not touch the prose in this iteration. Adding the diagram makes the page
  longer, which sits awkwardly against "less is more" — but trimming copy on a page
  full of honesty-gated claims is a separate decision with its own gates, and
  bundling it here would make a small change unreviewable.

## Task 3 — verify it renders, at the width that matters

- `node --check`, then `bin/dg ship prepare` — foot-smoke must pass before I let go
  of the lock.
- Render `/how` at 390×844 with the disk build injected (request-abort pattern),
  screenshot, and **look at it**. Confirm: the diagram appears above the steps, is
  legible, does not overflow, and the page's CTAs are still reachable.
- Confirm the SVG did not get mangled — check the rendered `<svg>` has its expected
  child count, not just that the string is present.

If anything fails, restore foot-core from the pre-edit backup and release.

## Task 4 — release, report, do not commit or publish

Release the lock in every outcome. Do not `git add demigod-foot-core.js` — it
carries the other worker's 230-insertion diff. Do not publish; that needs
authorisation in a current request.

State plainly whether the instruction is now actually satisfied: an asset that
renders on the page is done; an asset in `assets/` that nothing loads is not.

## Constraints

- Lock held for the whole edit, released at the end.
- One insertion. No other foot-core changes.
- Revert on any gate failure.
- No commit of contested files, no publish, no outbound.
- Look at the screenshot; do not infer from the DOM alone.
