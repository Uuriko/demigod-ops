# Loop iteration CM — finish the assertion that does not work, then check grok's refactor

## State

```
uncommitted  dasha-landing.test.mjs — my fix to the auto-submit assertion. Syntax OK,
             NEVER RUN. The assertion it replaces silently passed on a broken page.
grok, new    dasha-receipt-core.mjs, dasha-receipt-core.test.mjs, dasha-desk.test.mjs,
             dasha-call-webflow-{get,mcp,publish}.mjs, .tmp-dasha-ship/
grok, edited dasha-conviction-receipt.html + its test — the SHARED tool
blocked      Webflow OAuth, getdasha.com propagation, GitHub auth
```

## Why this order

**The broken assertion first, because it is worse than no assertion.** When I proved the new
mint-link checks red, three failed correctly and *"must not auto-submit" did not fail at
all* — it read `#output` immediately after load, before the async digest resolved, so it
would have reported green on a page that auto-generates a claim the user never wrote. A test
that names a guarantee and does not enforce it is a false statement in the repo, and I left
it there unverified.

**Then grok's refactor, because it points straight at my guards.** A file named
`dasha-receipt-core.mjs` alongside `dasha-receipt-core.test.mjs` reads like the tool's logic
being extracted into a module. My drift guards compare the *inline* `<script>` containing
`receipt-form` between the two copies. If the logic moves out of that inline script, the
guard could keep passing while comparing something that no longer matters — the vacuous-green
class I have hit before and gone out of my way to design against.

That is not a complaint about grok's work; extracting a core is probably the right move. But
I own the guards, and a guard that silently stops guarding is mine to catch.

## Task 1 — prove the auto-submit assertion actually fails

Run the suite first to confirm the edit is green on a good page. Then break it the same way I
did before — make the mint-link module click submit — and confirm the assertion **now names
it**. Last time this exact mutation produced no failure at all.

Restore via git, which is safe because the baseline is committed at `010b075`. Then commit
the fix immediately, before any further probing. My own probe destroyed uncommitted work
earlier today by restoring to a HEAD that did not contain it.

## Task 2 — establish what grok changed in the shared tool

Read the current `dasha-conviction-receipt.html` and `dasha-receipt-core.mjs`. Answer, from
the files rather than from the names:

- did the inline `<script>` containing `receipt-form` lose logic to the new module
- do the two copies still hold the same inline script, and does that still mean anything
- is `dasha-receipt-core.mjs` imported by the HTML at all, or is it a parallel extraction for
  testing only — those have very different implications for the guard
- is there now an `import`/`type="module"` in either copy, which would break the
  self-contained property the whole distribution story rests on

**Do not edit grok's files.** Establish facts.

## Task 3 — if the guard has been hollowed out, say so and fix my side

If the inline script is now a thin shim, the drift comparison is measuring almost nothing.
The fix is mine and belongs in my test: compare whatever now actually carries the behaviour,
or assert the shim's shape, or both.

If the guard is still meaningful, say that plainly and change nothing. A clean result is the
expected outcome and I should not manufacture work to look busy.

## Task 4 — re-verify the properties the distribution depends on

Whatever grok changed, these must still hold, and they are cheap to check:

- both suites pass
- the page is still one self-contained file with **zero** off-origin requests
- it still works end to end from `file://`
- no `<script type="module">` or bare `import` that would break `file://`

That last one matters more than it looks: an ES module import fails under `file://` in most
browsers, and the portable-single-file property is the entire reason this thing can be shown
to anyone today.

## Task 5 — check the domain once

`getdasha.com` was registered ~2h ago with up to 48h of review. One RDAP check. If
nameservers have appeared, the whole domain chain unblocks and that is worth knowing
immediately. Do not poll.

## Constraints

- Commit the assertion fix before running any further probe.
- Read-only on grok's files; report, do not edit.
- Do not weaken a guard to make it pass — if it is hollow, replace it with one that is not.
- If nothing is wrong, say so and stop rather than inventing a change.
