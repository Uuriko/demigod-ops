# Loop iteration AX — does the front door actually work?

## State

```
reviewed   14/14 routes, default state only. 2 defects found by looking.
never done verified the wizard/form works end-to-end on LIVE
known      intake is disconnected downstream — Webflow stores submissions, nothing
           carries them to the inbox. That is a separate, already-reported break.
tooling    demigod-wizard-playtest.mjs exists; I fixed three stale oracles in it
           earlier this session and got it to 4/4 green
```

## Why this, now

Every route I have examined was sitting still. The most important thing on this
site is not a page — it is the brief form. It is the only path from visitor to
lead, and I have never confirmed it works on the live site.

This matters more than usual right now because I already know the *downstream* is
broken: submissions reach Webflow and go no further. If the form itself is also
broken, the picture changes from "we are not receiving what people send" to
"people cannot send anything", and those need different fixes in different order.

There is an existing harness — Ponytail rung 2 for the eleventh time this session.
`demigod-wizard-playtest.mjs` walks the wizard and I already repaired its oracles.
Read it before writing any new automation.

## Task 1 — establish what the harness does BEFORE running it

Non-negotiable: **does it submit?**

`demigod-form-submit-test.mjs` is "dry by default; pass --submit for an
intentional tagged live submission" and `demigod-form-e2e.mjs` is "open + inspect
only" unless `--submit`. Check the wizard playtest for the same shape.

If any path could post a real submission, do not take it. A synthetic brief landing
in Webflow's form store — which the user is about to go read to answer "has anyone
submitted?" — would corrupt the exact evidence I asked them to check. That is a
real harm, not a hypothetical.

Establish and state: what it opens, what it fills, where it stops.

## Task 2 — walk the wizard on live, read-only

Drive it as far as it goes without submitting. Record, step by step:

- Does the modal open from the home CTA?
- Does each step advance? Do the required-field guards fire?
- Is the primary control reachable and tappable at 390px — the mobile action bar
  work from earlier today was about exactly this?
- Does anything render broken, overlap, or fall below the fold at the final step?
- Does the back/close path work without losing entered answers?

Screenshot each step. The two defects found this week were both invisible in source
and obvious in a picture.

## Task 3 — check the states a static screenshot cannot show

The FAQ affordance bug existed because I only ever saw the default state. So
deliberately exercise:

- **Keyboard only.** Tab to the CTA, open the modal, tab through the wizard. Is
  focus visible at every stop? Is focus trapped or lost? A form that cannot be
  completed by keyboard is a defect axe will not catch, because axe checks
  attributes, not journeys.
- **Validation.** Submit-attempt an empty required step; does it explain what is
  wrong, or fail silently?
- **The open state** of anything collapsible in the flow.

## Task 4 — report the journey, and fix only what is mine

State plainly whether a visitor can complete a brief on live today. That is the
headline and it is a yes/no.

The wizard lives in `foot-core`, which is held and being written every few minutes.
So any defect found is documented with its measurement and screenshot, not edited.
If the fix is outside foot-core, fix it and verify against live the way the chip fix
was verified.

## Constraints

- **No submissions.** Not tagged, not synthetic, not "just one to test".
- No foot-core, head, or CSS edits.
- No publishing, no outbound.
- Read the harness before running it; verify its dry-by-default claim rather than
  trusting the header comment.
- Screenshots to the scratchpad.
