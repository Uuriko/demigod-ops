# Loop iteration M — settle the fold question with the harness that already works

## State

```
lock     FREE (2nd iteration running)
suite    543/544 — one of the two long-standing reds was fixed by another agent
carried  /how has no action in the mobile fold; fix unimplemented since iteration H
```

## The actual problem is my instrument, not the site

Last iteration I tried four times to establish whether a mini-page's own CTA is
reachable when `#dg-bar` is visible, and produced four bad measurements:

1. `elementFromPoint` on coordinates outside the viewport — returns null whatever
   is there, so "unreachable" was meaningless.
2. `scrollTo` then reading `scrollY` in the same synchronous evaluate — the scroll
   had not applied yet.
3. Same with a settle delay — reported that **the home page cannot scroll**, which
   is certainly false.
4. And the original iteration-H "clash", measured at scroll offset 0 against a
   `position: fixed` bar, where content scrolling underneath is the design.

Every one of those was hand-rolled CDP `Runtime.evaluate` under
`Emulation.setDeviceMetricsOverride`. That combination is not reliable for scroll
and hit-testing.

**Puppeteer is already a dependency and already works here.**
`demigod-wizard-playtest.mjs` drives real viewports, real clicks and real waits
through `puppeteer.connect({ browserURL: CDP_URL })`, and it currently passes all
four of its wizard checks at desktop and 390px. `demigod-user-test.mjs --suite
site` runs mobile assertions ("mobile h1 fits width", "mobile no horizontal
overflow") and passes 27/27.

Ponytail rung 2, for the fourth time this session: the reliable tool already
exists and I hand-rolled a worse one.

## Task 1 — re-measure with Puppeteer, using the existing pattern

Model the probe on `demigod-wizard-playtest.mjs`: `puppeteer.connect`,
`page.setViewport({ width: 390, height: 844, isMobile: true })`, `page.goto` with
`waitUntil`, then real `page.evaluate` / `page.click` with explicit waits.

Establish, per route (`/how`, `/hire`, `/talent`):

1. Does the page scroll at all? Compare `scrollY` before and after
   `page.evaluate(() => window.scrollBy(0, 600))` **with an awaited delay**, and
   sanity-check against `/` which is known to scroll. If `/` reports "cannot
   scroll" again, the instrument is still wrong — stop and say so rather than
   reporting a site defect.
2. With `#dg-bar` revealed, scroll the page's own CTA into view and `page.click`
   it. Did the wizard open? That is the only question that matters, and a real
   click answers it where a rect comparison does not.
3. On `/how`, confirm the bar's own CTA opens the wizard.

## Task 2 — implement whichever the evidence supports

- **If the page CTA still activates with the bar visible on all three routes:**
  the fix is one line — stop hiding `#dg-bar` in `openPage()`
  (`demigod-foot-core.js:4445`). Keep hiding it in `show()` (`:3276`), which is a
  modal and genuinely must not compete with a fixed bar.
- **If it is genuinely blocked on `/hire` and `/talent`:** implement the
  conditional from iteration H — keep the bar only where no in-page action falls
  inside its rect — measured at the scroll position where it matters.
- **If the instrument fails again:** implement nothing. Two iterations of bad
  measurement is enough to say the method is the blocker and stop.

Hold the foot lock for any foot-core edit and release it after. It has been taken
by another agent four times today and my first fix this morning was clobbered by
ignoring exactly that.

## Task 3 — leave a regression check behind

Whatever lands, the check should assert the *behaviour*, not the CSS: on a
mini-page at 390px, a primary action is reachable and activates. Assert through
the existing playtest harness if it fits there, rather than adding a fifth
bespoke browser script.

Prove it non-vacuous by breaking what it guards.

## Constraints

- **Rendered, clicked evidence only.** No rect arithmetic standing in for
  reachability.
- Sanity-check the instrument against a known-good route every run.
- Read all command output; no `>/dev/null` on anything depended upon.
- Suite must not regress past the 1 remaining known-not-mine failure.
- No publishing without authorisation.
