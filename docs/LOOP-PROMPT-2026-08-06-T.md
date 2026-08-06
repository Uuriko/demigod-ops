# Loop iteration T — make the publish decision cheap

## State

```
truth    disk v1030 · live v1019 · +11 ver · 1h · DEBT (threshold +8)
lock     FREE
guards   40/40 across the seven I wrote; one stale oracle found and fixed in S
```

## Why this, now

The lag has been reported as `lagTracked` for several iterations and has now
crossed into `lagDebt`. Every further iteration that touches the site adds a
twelfth, thirteenth version to a queue nobody has looked at as a whole.

Publishing needs authorisation in the current request and I do not have it. What
I *can* do is remove every reason to hesitate: say precisely what is in the
eleven versions, and prove the queued build is sound so authorising it is a
one-word decision rather than a research project.

Adding a twelfth unpublished change before doing that would be working against
myself.

## Task 1 — enumerate the delta in user terms

Eleven version bumps is a build number, not information. Produce the list of
**what a visitor would actually notice**, derived from the commits and the
prepared build, not from my memory of what I did.

Group into: visible copy/layout changes, new behaviour, and invisible
(refactors, tests, tooling). A change that a visitor cannot perceive belongs in
the third group and should not be sold as a feature.

For each visible item, state where it appears — which route, which section — so
it can be checked after publishing rather than taken on trust.

## Task 2 — prove the queued build is sound

The point is to make authorising safe, so the verification has to be real:

- `bin/dg truth` clean (already passing — record the exact line).
- The head/foot the manifest points at are the ones on disk.
- Run the honesty gates that apply to shipped copy. Any claim on the site that
  the data cannot support is a blocker, not a note.
- Render the routes that changed and look at them, using Puppeteer via the
  existing `injectCore` pattern in `demigod-button-audit.mjs` — not hand-rolled
  CDP, which produced four wrong measurements in L and M.

If anything fails, that is the iteration. Fix it and stop; a clean queue is
worth more than a long changelog.

## Task 3 — state the risk plainly

Say what could go wrong on publish and what the rollback is. If the answer is
"revert to v1019 with the same command", say that. If there is no rollback path,
that is the most important sentence in the report.

## Task 4 — do NOT publish

No publish command runs in this iteration. The delta report ends with what I
need from the user: one sentence they can send back that authorises it.

Report the debt as debt. Do not soften it and do not let it slide another
iteration without being named.

## Constraints

- No outbound, no drafts, no queues, no money.
- Puppeteer for anything rendered; sanity-check the instrument against a
  known-good route every run.
- Read all command output; never redirect something a later step depends on.
- Another worker is active — re-run any red in isolation before attributing it.
