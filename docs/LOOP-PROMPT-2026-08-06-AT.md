# Loop iteration AT — look at the site, then make the asset it actually needs

## State

```
site         held all day — foot-core written 90s ago, 180 uncommitted files,
             and the other worker has committed NOTHING in 4+ hours
undone       "you and codex can generate new images and other assets not just
             text. do a design review and figure what things you both should
             create and add and where" — still not done
last attempt built a role-mix bar, reverted it: it tripped a deliberate no-<svg>
             guard in the directory renderer
```

## Why this, now

This is the only outstanding user instruction blocked by nothing except my not
having done it. Everything else needs their accounts, their authorisation, or a
file another worker is holding.

My first attempt failed for a specific reason worth not repeating: I picked a place
to put a visual before establishing what the site actually needs, and the place I
picked had a deliberate constraint against it. The instruction has two halves —
*"do a design review"* and *"figure what to create and where"* — and I skipped
straight to making something.

So: look first. I can render the live site with Puppeteer, which works here
(`demigod-wizard-playtest.mjs` uses it; hand-rolled CDP under
`Emulation.setDeviceMetricsOverride` produced four wrong measurements in earlier
iterations and must not be used).

## Task 1 — actually look at the live site

Render the key routes at a mobile width (390×844) and a desktop width, and **look
at the screenshots**. Not a DOM audit — axe already passes clean on 16 routes and
the honesty audit is clean on 14, so the defects that remain are the ones only an
eye catches.

Cover at least `/`, `/how`, `/pricing`, `/startups`. Sanity-check the instrument
against a known-good route every run: if `/` looks broken, the instrument is
broken, not the site.

For each, note what a visitor sees in the first screen. Where is the page a wall of
text? Where is a claim doing work that a diagram would do better? Where is there
nothing to look at at all?

## Task 2 — decide what to create from what you saw, not from a list

Name the single highest-value visual gap, with the screenshot as the evidence.
Candidates worth weighing only *after* looking:

- The three-step flow (brief → human review → mutual yes) stated in prose
- The fee model, which is the sharpest fact on the site and is currently a sentence
- An empty or text-only region on a mini-page

Then check where it can live **without** touching a held file or a guarded
surface. `foot-core`, `head-minimal`, `head-styles` are held. The directory
renderer bans `<svg>` by deliberate guard. `assets/` already holds real SVG
(`assets/demigod-mark.svg`, `assets/brand/favicon.svg`), so repo-resident SVG is an
established pattern here.

If the honest answer is that the asset cannot reach the site today without a held
file or an upload, **say so plainly and still make it** — a finished asset with a
stated wiring path is a real deliverable; a document about assets is what I
produced last time and it is what the instruction was warning against.

## Task 3 — make it, and hold it to the site's own standards

- **Inline SVG, hand-written, deterministic.** No dependency, no binary, no upload.
  It must survive the catbox host disappearing, which currently serves every image
  on the site.
- **Accessible**: `role="img"` and a real `aria-label`, since axe passes clean on
  16 routes and must continue to.
- **Theme-honest**: it will sit on a dark page (`#07150f` and `#a6ffcb` are the
  site's existing colours — use them rather than inventing a palette).
- **No invented claims.** If it depicts the flow, the flow must be the one the site
  actually describes. If it shows a number, that number comes from the fee code,
  not from me.

## Task 4 — prove it renders, don't assume

Render the SVG standalone in the browser and screenshot it. An SVG that is
syntactically valid and visually broken is the normal failure mode, and "it
validates" is not evidence anyone can see it.

Check it at small width. Check it against the dark background it will sit on.

## Constraints

- No foot-core, no head, no CSS edits. No publishing, no upload, no outbound.
- Puppeteer for anything rendered; sanity-check the instrument each run.
- Screenshots to the scratchpad, not the repo.
- If the design review concludes the site does not need a new asset, say that and
  stop. That is a legitimate outcome and better than adding decoration.
