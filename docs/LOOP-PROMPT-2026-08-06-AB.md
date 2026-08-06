# Loop iteration AB — the asset request, done as assets

## State

```
lock       FREE, but 1,650 insertions of the redesign are still uncommitted in
           foot-core/head/CSS — editing them tangles with half-finished work
undone     [images/assets] and [form features]; forms live in foot-core (192
           wizard references), so assets is the one actually available
assets     every site image is hosted on catbox.moe — a free file host
```

## Why this, now

Last iteration established that the request — *"you and codex are able to generate
new images and other assets not just text. do a design review and figure what
things you both should create and add and where"* — was **not done**. All 146
tracked images predate 2026-08-03; I produced a design-review document instead of
artwork. That is the request I should close, and closing it means producing
assets, not another document about assets.

There is also something worth checking first. Every image the live site loads
comes from `files.catbox.moe` — a free, anonymous file host with no uptime
guarantee. Two `.jpg` assets, plus the CSS and JS bundles, all sit behind it. If
any of those have expired or the host is down, the live site is visibly broken
right now and no audit run this session would have caught it: the honesty audit
checks served HTML for banned phrases, and axe checks the DOM. Neither fetches the
images.

That check comes first because a broken existing asset outranks a nice new one.

## Task 1 — verify every externally hosted asset actually resolves

Fetch each `files.catbox.moe` URL the site references and record status, content
type, and size. Report any that 404, redirect, or return the wrong type.

Do not infer health from the page rendering in an audit — the audits do not load
images. Fetch the URLs directly.

If an asset is dead, that is the iteration: it is a live, visible defect and it
outranks everything below. If all resolve, state the dependency plainly anyway —
the whole site's imagery sitting on an anonymous free host is a standing risk the
user should know about, whether or not it has fired yet.

## Task 2 — produce real assets, self-contained, no upload

The constraint that shapes this: adding a hosted image means uploading to an
external service, which is outbound and needs authorization I do not have. So the
assets must be **inline and self-contained** — SVG, which is text, deterministic,
diffable, and needs no host.

That is a genuine fit rather than a workaround. SVG costs no request, cannot
404, survives the host disappearing, and scales on every display.

Do a real design review of `/startups` first — it is the most data-dense surface,
it is pure text today, and it is built by `demigod-directory-static.mjs`, which is
NOT held. Decide what visual element would actually help a visitor parse it, then
build that. Candidates worth weighing before picking:

- a role-mix bar per company, so "Engineering 43 · Sales 9" is readable at a glance
- an aging indicator for how long roles have sat open
- an empty-state mark for when the feed is thin
- a section rule or wordmark to break the wall of rows

Pick based on what a visitor gains, not what is fun to draw. One asset done well
beats four sketched.

Honesty constraints, inherited and non-negotiable:

- **A chart must encode real data.** A bar whose width is decorative is worse than
  no bar — it looks like information. If the number is unknown, draw nothing.
- No invented figures, no illustrative placeholders that could read as real.
- Keep it inside the 50,000-byte Webflow ceiling, which had **4 bytes of headroom**
  last iteration. Measure before and after; if the asset does not fit, say so and
  reduce it rather than blowing the ceiling.
- Accessible: `role`/`aria-label` or a title, since axe currently passes clean on
  16 routes and must continue to.

## Task 3 — wire it only where nothing is held

`demigod-directory-static.mjs` and `demigod-startup-atlas-web.js` were both safe to
edit last iteration. `foot-core`, `head-minimal`, and `head-styles` are not. If the
asset cannot be wired without a held file, build and test it standalone and say
what remains.

## Task 4 — verify

- Byte budget measured before and after, against the 50,000 ceiling.
- `demigod-directory-static.mjs --selftest` and the directory tests.
- A test proving the visual encodes the data — break the input and watch the
  output change. A decorative element that renders identically for every input is
  the vacuous-green shape in visual form.

## Constraints

- No foot-core, no head, no CSS. No publishing, no outbound, no upload.
- No new dependencies — SVG is a string; nothing needs installing.
- Read all command output. Verify against the repo, not my own claims.
