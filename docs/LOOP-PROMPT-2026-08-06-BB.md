# Loop iteration BB — the tag-asymmetry sweep I promised and skipped

## State

```
proven     two live defects of one shape:
             button.dg-dir-rolechip styled, bare .dg-dir-rolechip not
               → the <span> variant renders text outside its pill
             summary{display:flex} global, chevron scoped to #dg-nav-directory
               → six FAQ accordions with no sign they open
promised   iteration AW Task 2: "grep for the same tag-asymmetry class". Never ran
           it — the FAQ finding took the iteration.
```

## Why this, now

Two defects, same mechanism, found within a day of each other. Both invisible to
axe, the honesty audit, and the conversion audit. Both only visible by looking at a
picture or measuring a computed style.

That is a pattern with a mechanical signature, and I said I would search for it and
then did not. Unfinished promises of exactly this kind are what I have spent the
session finding elsewhere — the heading rename, the backup timer, the deferred
classifier fixture.

The signature: **a class styled through a tag-qualified selector (`button.foo`,
`a.foo`, `input.foo`) while the same class is also applied to a different tag.**
The unqualified variant silently misses the layout properties. It survives because
the unqualified case is usually the rare one — `Other 6` only appears for functions
outside `DG_FUNCS`.

## Task 1 — enumerate tag-qualified selectors and their class users

In the files I can edit — `demigod-startup-atlas-web.js`, `demigod-directory-static.mjs`,
and any other renderer not held:

1. Find every CSS selector of the form `tag.classname`.
2. For each, find every place that classname is emitted in markup.
3. Flag any where the class is applied to a tag other than the qualified one.

**Read the markup, not just the CSS.** The chip bug needed both halves: the CSS said
`button.dg-dir-rolechip`, the renderer emitted both `<button>` and `<span>` with
that class. Either half alone looks fine.

## Task 2 — prove each candidate on live before calling it a defect

The discipline that saved the chip finding: my local reproduction showed no
difference and was simply wrong. The live computed style was what settled it.

For each candidate, measure on the live page:

- the computed `display`, `align-items`, and box of both variants
- whether they differ in a way a visitor would see

A candidate whose two variants compute identically is **not** a defect. Say so and
move on. Do not fix a difference that only exists in the source.

If a candidate's rare variant never appears in current data, say that too — it is a
latent defect, worth recording, not worth an unverifiable fix.

## Task 3 — fix what is proven, verify the way the chip was verified

Inject the candidate rule into the live DOM and confirm the computed style flips
and the render changes. Screenshot before and after. Then apply to disk.

**Do not commit `demigod-startup-atlas-web.js`** — it carries the other worker's
uncommitted changes, and `git add` on it sweeps their work into my commit. That is
what 78b9895 did to 14 files today. Leave fixes in the working tree and say so.

Held files — `foot-core`, `head-minimal`, `head-styles` — are documentation only.
The FAQ chevron fix already sits there unapplied for that reason.

## Task 4 — report the count, including zero

How many tag-qualified selectors were checked, how many had a mismatched emitter,
how many were proven live, how many fixed. If the sweep finds nothing, that is a
real result: it means the two known defects were isolated rather than a systemic
pattern, and that is worth knowing.

Do not report a widened selector as a fixed bug without a live measurement showing
the difference.

## Constraints

- No foot-core, head, or CSS edits.
- Do not commit contested files.
- Measure live before claiming; a local repro that disagrees with live is wrong.
- No publishing, no outbound.
- Read all command output.
