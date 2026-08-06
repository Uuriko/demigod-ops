# Loop iteration H — the funnel pages have no action in the mobile fold

## Measured, live, 390×844

Actions (links/buttons ≥30px tall with text) visible in the first screen:

| route | fold actions | first real CTA |
| :--- | :--- | :--- |
| `/` | logo, **Hire talent** (y=294), **Share privately** (y=400) | y=294 ✓ |
| `/pricing` | logo, ✕, Hire talent (624), Share privately (686), ← Home (748) | y=624 ✓ |
| `/hire` | logo, ✕, **Start brief (y=792)** | y=792 — at the edge |
| `/talent` | logo, ✕, How it works → (758), Share privately (819) | y=819 — at the edge |
| `/how` | logo, ✕ — **nothing else** | none in fold |

Home and pricing are fine. The three pages a founder actually lands on from a
shared link — `/hire`, `/talent`, `/how` — put their primary action at or past the
fold edge on a phone. `/how` has no action in the fold at all: it explains the
process and offers no way to start it.

## A non-defect I am explicitly not fixing

My sweep flagged `How it works →` on `/talent` at 38px as under the 44px target.
It is `.dg-p-note a` — an inline link inside a sentence. **WCAG 2.5.8 Target Size
(Minimum) exempts targets "in a sentence or block of text."** The site's own
`ensureTapTargetCss()` deliberately scopes the 48px floor to primary CTAs
(`.hero-actions a[data-dg-cta]`, `#dg-nav-hire`, `#dg-nav-talent`, `#dg-bar a`,
`a.nav_logo`, `a.footer_link`) and leaves inline note links alone. That scoping is
correct, not an oversight.

Enlarging inline links would change layout on every page for an arguable,
marginal gain. Recording it here so a later pass does not "fix" a non-violation —
the failure mode I have hit repeatedly this session is treating a check's output
as a defect without asking whether the check is right.

## Task 1 — get the primary action into the fold on /hire, /talent, /how

The pattern is the same on all three: the page shell renders heading → intro
paragraph → a list of steps or bullets → CTA. The CTA is last, so on a 390px
screen it lands at 790–820 or below.

**Do not simply move the CTA up above the explanation.** The explanation is what
earns the click, and `/how` in particular exists to explain. The lower-risk
change, and the one that matches how the site already behaves elsewhere: these
mini-pages have a persistent bottom bar (`#dg-bar`) on some routes. Establish
first whether `#dg-bar` exists on these three routes and why it is not showing.
If the bar is the intended mechanism and is simply absent here, enabling it is a
smaller and more consistent fix than reordering page content.

Order of investigation:

1. Does `#dg-bar` render on `/`, and not on `/hire` / `/talent` / `/how`? Compare.
2. If it is route-gated, read the gate. There may be a deliberate reason.
3. If enabling it on these routes is a one-line change to a route list, do that
   and re-measure.
4. Only if `#dg-bar` is not the answer, consider a compact inline CTA directly
   under the intro paragraph — before the step list, not replacing it.

## Task 2 — measure, do not assert

Every claim in the report must be a number from the rendered page at 390×844:
first-CTA `y` before and after, per route. A screenshot for at least one route.

This iteration has already produced three wrong answers from checks that looked
authoritative (a DOM sweep that missed an ancestor clip, a stylesheet that never
refreshed, and a metric that improved while the page got worse). The rule earned:
**a number is only evidence if the picture agrees with it.**

## Task 3 — verify nothing regressed

- Full suite must stay 539/539.
- `npm run demigod:verify:source`, `node demigod-live-honesty-audit.mjs`.
- Desktop 1440 unchanged — check, do not assume.
- If the change lands in `demigod-foot-core.js`, hold the foot lock. It was free
  at the start of this iteration; re-check before editing, and release after.

## Constraints

- No honesty claim moved or removed.
- No publishing without authorisation in the current request.
- Scope the commit explicitly; other agents remain active.
- If the investigation shows `#dg-bar` is deliberately absent on these routes,
  **stop and report that** rather than forcing a CTA in. A deliberate design
  choice is not a defect, and I have already mistaken one for the other today.

---

# Findings (executed 2026-08-06)

## The gate is real, deliberate, and correct for two of three routes

`#dg-bar` exists on every route with both CTAs. It is `display:grid` at y=774 on
`/`, and `display:none` on the mini-pages. The gate is explicit and paired:

- `openPage()` — `demigod-foot-core.js:4445` hides it
- `closePage()` — `:4293` restores it
- `show()` — `:3276` hides it too, which is unambiguously right: a modal must not
  compete with a fixed bar

Mini-pages, though, are routes, not modals — and the mobile CSS already reserves
`body{padding-bottom:78px}` for the bar, so the layout is built expecting it.

## Tested by revealing the bar on each route and measuring overlap

| route | bar 774–844 clashes with | verdict |
| :--- | :--- | :--- |
| `/how` | **nothing** | hiding it is a **defect** — this page has no fold action at all |
| `/hire` | `Start brief` (y=792) | hiding it is **correct** |
| `/talent` | `How it works →` (758), `Share privately` (819) | hiding it is **correct** |

So a blanket "show the bar on mini-pages" would be wrong: on two of three routes
it would cover the page's own primary CTA. The blanket hide is equally wrong on
`/how`, which explains the process and offers no way to start it above the fold.

**The fix is conditional**, roughly six lines in `openPage()`: after the page
renders, leave the bar visible only when no in-page action falls inside the bar's
rect. Self-correcting, no route allow-list to drift.

## Not implemented — foot lock held

`bin/dg lock status` → owner `codex-verify-ship-v1017`, why "publish independently
verified navigation and Notes release". `DEMIGOD-SIMPLE.md` mandates one writer
for `demigod-foot-core.js`, and my first copy-scrub fix was silently clobbered
earlier today by ignoring exactly this.

Stopping here is the constraint working, not the task failing. The measurement
stands and the change is ~6 lines whenever the lock frees.

## A non-defect, recorded so a later pass does not "fix" it

`How it works →` on `/talent` renders at 38px, under the 44px floor. It is
`.dg-p-note a` — an inline link inside a sentence, which **WCAG 2.5.8 explicitly
exempts**. `ensureTapTargetCss()` scopes its 48px floor to primary CTAs and leaves
inline note links alone. That scoping is correct.
