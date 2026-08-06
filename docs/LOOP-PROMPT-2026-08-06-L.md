# Loop iteration L — finish the #dg-bar fix, and re-test my own evidence first

## State

```
lock     FREE  ← first time in 5 iterations; foot-core is finally editable
suite    537/539 (2 reds are another agent's dashboard-clean-ui registry work)
```

## The carried task

Iteration H measured a real gap: at 390×844, `/how` has **no action in the mobile
fold at all** — just the logo and a ✕. `/hire` puts "Start brief" at y=792 and
`/talent` at y=819, both at the fold edge. `#dg-bar` exists on every route with
both CTAs, but `openPage()` hides it (`demigod-foot-core.js:4445`) and
`closePage()` restores it (`:4293`).

I concluded the fix was conditional — show the bar only where it does not cover an
in-page action — based on this measurement:

| route | bar rect 774–844 overlapped |
| :--- | :--- |
| `/how` | nothing |
| `/hire` | `Start brief` (y=792) |
| `/talent` | `How it works →` (758), `Share privately` (819) |

## Why I am re-testing that before implementing it

**The overlap was measured at scroll position 0.** `#dg-bar` is
`position: fixed`, so page content scrolls *under* it by design — an element at
y=792 on first paint is not permanently covered, it just happens to sit there
before the user scrolls.

And the layout already accounts for the bar: `body{padding-bottom:78px}` is
applied on all three mini-pages (measured). That padding exists precisely so a
fixed bottom bar never permanently hides the end of the content.

If both of those hold, then hiding the bar on mini-pages is unnecessary on **all
three** routes, and the conditional logic I specified is solving a problem that
does not exist. That would make the fix simpler *and* mean my iteration-H
conclusion was wrong in an interesting way — the measurement was right, the
inference from it was not.

This is the same failure mode that has cost me repeatedly this session: a number
that is accurate about the wrong thing. A rect overlap at one scroll offset is not
evidence of an unreachable control.

## Task 1 — settle it empirically

For `/hire` and `/talent`, with the bar revealed:

1. Is the page's own CTA reachable? Scroll to the bottom of the page and check
   whether the CTA is visible and clickable, or permanently under the bar.
2. Does `body{padding-bottom:78px}` actually reserve space on these routes, or is
   the mini-page an internally-scrolling overlay where body padding is irrelevant?
   Check whether `#dg-page` (or the page shell) is the scroll container rather
   than `document.body`.
3. Click the page's own CTA with the bar visible. If it activates, the bar does
   not block it.

**If the CTA is reachable on all three routes:** the fix is one line — stop hiding
the bar in `openPage()`. Keep hiding it in `show()`, which is a modal and
genuinely must not compete.

**If it is genuinely blocked on `/hire` and `/talent`:** implement the conditional
from iteration H, ~6 lines, measured at the scroll position where it matters.

Either way, report which it was and why my earlier inference held or failed.

## Task 2 — verify at both viewports and prove it

- 390×844 and 1440×900 screenshots, before and after.
- `/how` must gain a fold action; `/hire` and `/talent` must not lose access to
  theirs.
- Click-test the bar's own CTA on a mini-page: it should open the wizard, the same
  path the directory button now uses (`/?wiz=startup`).
- Desktop must be unchanged — `@media(min-width:768px){#dg-bar{display:none}}`
  already handles that, but check rather than assume.

## Task 3 — the four startup classifiers

Now that the lock is free and this is fresh: `startupScore` (public-roles),
plus its consumers in role-ledger and lead-sourcer, plus `dgStartupBand` added to
the atlas today. Four implementations of "is this a startup".

They agree on the 200-person threshold **today** — verified: `STARTUP_TEAM_MAX = 200`
in public-roles, `teamSize <= 200` in the atlas band. Nothing enforces that
agreement, so they will drift.

Do **not** refactor all four this iteration. Three of the four files are being
edited by other agents right now. The minimum useful step is a test that fails
when the thresholds diverge — one file, no coordination needed, and it converts a
latent drift into a loud one.

## Constraints

- Hold the foot lock for any foot-core edit; release it after. It has been held by
  another agent for four straight iterations and my first fix today was clobbered
  by ignoring exactly this.
- Rendered evidence, not source reasoning, for any claim about what a user sees.
- Read command output. No `>/dev/null` on anything the next step depends on.
- Full suite must not regress past the 2 known non-mine failures.
- No publishing without authorisation.
