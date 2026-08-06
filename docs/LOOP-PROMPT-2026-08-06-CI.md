# Loop iteration CI — fix the cold read, then gate the loop I shipped on hand checks

## State

```
shipped     the calls loop (f0934f9) and the demo-path fix (391471e)
verified    entirely BY HAND — capture, due, settle, streak, reload, file://
gated       not at all. Neither suite asserts anything about the loop.
cold read   a first-time visitor meets an EMPTY "Your calls" box — heading, lede,
            container and footnote — sitting between the tool and the examples
blocked     domain registration and Webflow OAuth, both the user's
```

## Why this, now

Two problems, both mine, both unblocked.

**The cold read.** The user is showing this page to people. A stranger's first scroll now
hits a section with a heading, a paragraph, an empty container and a footnote — all for zero
content. That is a lot of page spent saying "nothing here yet," positioned *above* the
examples that would actually teach them what a call is. The best feature on the page is
currently a hole in the first impression.

**The gate.** I have written, in this repo's own test header, that *a hand check is a
memory, not a gate* — and then verified an entire feature by hand and shipped it. Every
assertion I made about the loop lives in a terminal I have since cleared. The specific thing
that will rot is the one the research says matters most: **writing a call must not move the
streak.** If a future change quietly makes it points-per-card, that is the documented way
this design gets ruined, and nothing would catch it.

## Task 1 — hide the section until it has something in it

When the list is empty, hide the whole section — heading, lede, list and footnote — not just
the inner box. A heading with nothing under it is worse than no heading.

Then it **appears** the first time someone writes a call, which is a better moment than a
permanent placeholder. The examples section immediately below already teaches the concept,
so nothing is lost from the cold read.

Check the render as a genuinely cold visitor: cleared storage, fresh load, read the page
top to bottom. Confirm the tool is still reachable without an unreasonable scroll — both
agents were explicit that it stays above the explainer, and the page has grown a lot today.

Do **not** reorder sections. Hiding should be sufficient, and moving sections has broken
something twice today.

## Task 2 — gate the loop, and make the anti-volume assertion the centrepiece

Add to `dasha-landing.test.mjs`. Minimum set, each of which catches a real regression:

- a generated card is captured into storage
- **writing calls does not move the streak** — the one that protects the design
- a call whose resolution date has passed shows as due and offers the two settle actions
- settling as wrong applies the `Called it wrong. Said so.` marker and increments the streak
- the record survives a reload
- the section is hidden when there are no calls

For the due state, remember what I learned the hard way: **the tool refuses to create an
already-due call**, because resolution dates must be in the future. That is correct product
behaviour. Simulate time passing by backdating stored data, not by trying to create a
past-dated call — my first attempt at this concluded the module was broken when the tool was
right.

## Task 3 — write the harness so it does not lie to me

Two harness failures today produced false bug reports, and both are avoidable:

- **Never wait a fixed number of milliseconds** for the card. The digest is async; a 550ms
  sleep reported a failure that a 700ms sleep did not. Wait on the condition —
  `waitForSelector` / `waitForFunction` — always.
- **Prefer in-page clicks** over element-handle clicks for controls that may be off-screen.
  A puppeteer click on an off-screen example button behaved differently from the same click
  dispatched in the page, and that difference produced a second false bug report.

An assertion that fails for a harness reason is worse than no assertion, because it burns
trust in the suite and sends me fixing things that work.

## Task 4 — prove every new assertion red

Break the thing each one guards, watch the test name it correctly, restore **via git** rather
than by retyping.

The anti-volume one deserves the most care: make the streak increment on write and confirm
the test catches it. That is the assertion whose whole purpose is to fail some future day.

## Task 5 — confirm nothing else moved

Both suites, both widths, axe clean, drift green, `file://` still working end to end, and
the three example buttons still generating. The tool region is shared with grok, who has
edited it twice today; the drift guard passing is the check that we are still in sync.

## Constraints

- Hide, do not reorder.
- Nothing inside the drift-guarded tool region.
- No fixed sleeps waiting on async work.
- Simulate elapsed time by backdating storage, never by creating a past-dated call.
- Every new assertion proved red before it is trusted, restored via git.
