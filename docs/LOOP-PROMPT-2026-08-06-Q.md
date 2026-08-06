# Loop iteration Q — verify the fix I shipped but never saw

## State

```
lock     FREE
suite    9/9 targets · 5/5 mobile-bar guard · full run ~550/554 with known races
openPage hides bar: false   ← my iteration-M change survived
```

The foot lock's `why` last iteration read "restore mini-page mobile actions",
which overlapped my change. It turned out the other worker was doing the *same*
thing, not reverting it. Confirmed rather than assumed.

## The debt

In iteration M I removed the `#dg-bar` hide from `openPage()` so `/how` would have
an action in the mobile fold. I proved it at the **source** level — a test asserts
`openPage` no longer hides and `show()` still does — and I proved *reachability*
of the page's own CTAs with Puppeteer.

**I never confirmed the bar actually renders on `/how`.** The one attempt failed
because I injected disk foot-core into a page whose published build had already
applied an inline `display:none`, so the injection could not undo it. I moved on.

That is a change on disk, unpublished, justified by a source assertion. This
session's repeated lesson is that source assertions are not evidence about what a
user sees. I should close it before building anything new.

## Task 1 — see it

Use Puppeteer, which now works (`page.setViewport`, real waits) — not hand-rolled
CDP under `Emulation.setDeviceMetricsOverride`, which produced four wrong
measurements in iterations L and M.

The injection problem is real and needs handling, not ignoring. Options, in order
of preference:

1. Navigate to a route, then inject disk foot-core, then **clear the inline
   `display` the published build set** before re-running the page open. The
   published build's `openPage` already ran; its side effects must be undone for
   the disk build's behaviour to be observable.
2. Or serve the page and intercept the foot-core request so only the disk build
   ever runs. `demigod-button-audit.mjs` already does exactly this — it has an
   `injectCore(page)` that aborts `catbox.moe` requests and injects `CORE` from
   disk. **Read it first; that is very likely the right tool and it already
   exists.** Ponytail rung 2 for the sixth time this session.

Deliverable: a screenshot of `/how` at 390×844 with the bar visible, and the bar's
measured `top`/`height`, plus the first-action `y` before and after.

If it does *not* render, that is a defect in my change and it takes priority over
everything else in this prompt.

## Task 2 — make the guard assert behaviour, not source

`demigod-mobile-bar-on-routes.test.mjs` asserts that `openPage` does not contain a
hide call. That is a proxy. It would pass if the bar were broken for some other
reason — a CSS rule, a later scrub, a Webflow change.

If Task 1 shows a clean way to render the disk build (especially via the existing
`injectCore` pattern), promote the check: assert on a mini-page at 390px that the
bar is visible with both CTAs. Keep the source assertions too — they localise the
failure — but the rendered one is what actually protects the user.

If a rendered check cannot be made reliable in-suite, say so and leave the source
guard. A flaky browser test in a 554-test suite is worse than an honest proxy;
this session has already shown how fast standing reds get normalised.

## Task 3 — only if 1 and 2 are clean

Do not start new feature work until the shipped change is verified. If both tasks
close early, the next most useful thing is the publish-readiness question: disk
has been ahead of live for several iterations, `lagTracked` rather than debt, and
publishing needs authorisation in the current request. Report the delta and what
is in it rather than acting on it.

## Constraints

- Puppeteer, not hand-rolled CDP, for anything rendered.
- Sanity-check the instrument against a known-good route every run — if `/` looks
  broken, the instrument is broken.
- Hold the foot lock for any foot-core edit; release it after.
- No publishing without authorisation in the current request.
- Read all command output; no redirecting anything the next step depends on.
- If a full-suite red appears, re-run that file in isolation before attributing
  it — another worker is active and the suite has been racing.
