# Loop iteration BY — turn today's hand checks into the gate, and prove each one fails

## State

```
landing test   axe (rule-count proof), overflow, og-vs-PNG-header, link labels,
               indexable chars, both drift guards, live tool submit
standalone test  PASS — but asserts NOTHING about accessibility or design
today, by hand   axe on the standalone (first time ever, 89 rules, clean)
                 favicon parity across both files
                 no old-palette survivors
                 the three typography edits actually landing
                 focus ring colour on form fields
all five of those are memories again, not gates
```

## Why this, now

The header of `dasha-landing.test.mjs` says it plainly: *"A hand check is a memory, not
a gate."* I wrote that, then spent today doing five hand checks and committing on the
strength of them.

Two concrete defect classes hit me in the last two iterations and **both are currently
undetectable**:

1. **Silent no-op replacement.** Three standalone edits were `String.replace()` against
   remembered markup. A non-matching pattern returns the original and throws nothing. The
   suite has no opinion on the standalone's typography, so a no-op would have shipped
   green. I checked by hand this time. Next time I won't.
2. **A defect axe cannot see.** The five form fields had no designed focus state and fell
   back to the UA ring. axe passes — a visible indicator *does* exist — so no
   accessibility tool would ever flag it. Only rendering and looking caught it, and
   looking does not run in CI.

There is also a straightforward gap of coverage: **the standalone has never had axe in
its own test**, on the page that is the actual product and that the landing page links to
as its fallback. I ran axe against it ad hoc today for the first time. That should not be
the state of a shipping surface.

## Task 1 — axe in the standalone gate, with proof the harness ran

Mirror what the landing test does: inject axe, assert **rule count > 30** before asserting
zero serious/critical. The rule-count assertion is not decoration — it is what
distinguishes "clean" from "axe never actually executed", and I have shipped a vacuously
green test before by not having it.

Run at **390 and 1440**, the same two widths the exit gate names, and fill the form first
so the output region and its buttons are in the tree. An empty form under-tests the page:
`#output` is `hidden` until submit, and hidden subtrees are skipped.

## Task 2 — the focus-state assertion, which is the real prize

This is the regression guard for the defect I just fixed, and it must be written so it
would have **failed before the fix**.

For each of the five controls, focus it and read the computed `outlineColor` and
`outlineWidth`. Assert the colour equals the accent. Not "an outline exists" — the UA
default is also an outline, so that assertion would have passed on the broken page and
been worthless.

Note the trap: **`:focus-visible` does not paint for mouse interaction.** Focus must be
driven the way a keyboard user drives it, or every field will report no outline and the
test will fail for a reason that has nothing to do with the defect. I hit this today; do
not rediscover it.

## Task 3 — cross-file parity assertions

Three cheap checks that would have caught the silent no-op:

- **Favicon identical** in both files, and parsing as SVG. I copied it across by regex; a
  missed match leaves one page on the blank sheet.
- **No old-palette hex survives** in either file, case-insensitively. My substitution was
  case-sensitive and the files hold mixed casing.
- **The palette is declared once.** The tool CSS used to re-declare `:root` *after* the
  page's own and silently won every variable — a defect that made the page immune to its
  own stylesheet. Assert there is exactly one `:root` block per file so it cannot return.

## Task 4 — prove every new assertion fails

Non-negotiable, and the reason is on the record: I have written a drift guard that did not
fire on the divergence it was written for, and a `--selftest` that passed against an empty
string. A green assertion I have never seen red is not evidence.

For each new check, break the thing it guards, watch the test name it correctly, restore.
Restore by **reverting from git**, not by retyping — retyping is how a "restore" silently
becomes a second edit.

## Task 5 — surface the product question I keep stepping around

Not a build task; a paragraph for the user, because it is theirs to decide and it blocks
the roadmap's Phase 0 exit.

There are **two different pages** in play. `/dasha` on the live origin is grok's *desk* —
mint evidence, quotes, Dex numbers. My `dasha-landing.html` is the *thesis card* landing
page. The roadmap's Phase 0 goal names "one truthful, directly rendered, accessible
landing page", singular. Nobody has said which of the two that is, and the honest answer
is that I have been polishing a page that may or may not be the one that ships.

State it plainly, with what each is good at, and let the user decide. Do not decide it by
default through continued polishing.

## Constraints

- Do not touch the drift-guarded tool region.
- Every new assertion proved red before trusting it; restore via git.
- Keep both gates runnable with no new dependency.
- If a check turns out to be already covered, drop it and say so — duplicating an existing
  assertion is noise, not safety.
