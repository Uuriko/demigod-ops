# The candidate wizard works. The harness that checks it does not.

## Headline

**A visitor can complete a candidate brief on live today.** Verified by driving it
by hand. The form is fine.

**`demigod-wizard-playtest.mjs` has never been able to finish that flow, and
reports it as passing anyway.**

## What the playtest actually does

Ran it against live: `pass` reports all six checks true, including
`engineerDesktop` and `engineerMobile`. The step data underneath says otherwise:

```
desktop/startup   0% → 13% → 13% → 13% → 13% → 25% → 38% → 100%   review reached
mobile/startup    0% → 13% → 13% → 13% → 13% → 25% → 38% → 100%   review reached
desktop/engineer  0% → 13% ×8                                     review NEVER reached
mobile/engineer   0% → 13% ×8                                     review NEVER reached
```

The candidate walk parks on one question — *"Which work setup are you open to?"* —
and clicks Continue seven more times with nothing changing.

## Why it passes anyway

Two different bars for the two forms:

```js
passWizard = (r) => ... && last?.submitMode && last?.chromeHidden !== false   // startup
engOk      = (r) => s.length > 5 && s.some((x) => x.visible?.includes('sf-bay') || x.submitMode)
```

`engOk` passes on merely **reaching** the `sf-bay` field. A walk that can never get
past it still goes green — and has, on both viewports, for as long as this harness
has existed.

I repaired three stale oracles in this file earlier today and reported it 4/4
green. I validated a harness that never completes half the flow it tests.

## The form is not the problem — measured, not assumed

The blocking control is a required `<select name="sf-bay">` with options
`["", "yes", "remote-bay"]`. Setting it to `yes` and clicking Continue advances
immediately to `full-name`.

So the guard is doing its job. The walk sets `.value` on text inputs and **never
touches a `<select>`**, so it can't satisfy it.

## The fix, written and then reverted

Two changes, both small:

1. `chooseRequiredSelects(page, formSel)` — pick the first real option of any
   visible, empty, **required** select, dispatch `change` + `input`. Deliberately
   narrow: filling everything automatically would hide a genuinely broken guard,
   which is the failure this harness exists to catch.
2. `engOk` requires `submitMode` on the last step — the same bar `passWizard`
   already sets for the startup flow.

Reverted rather than left half-applied. Change 2 without change 1 wired into the
engineer walk turns the harness red, and the file already carries someone else's
uncommitted work from 2026-08-05 21:37 (a nav-selector rework), so committing it
would sweep their changes into mine.

Applying it needs the helper called at the `sf-bay` step in the engineer walk.
