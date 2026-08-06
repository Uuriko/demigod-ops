# Loop iteration BC — apply the FAQ chevron fix, under the lock, minimally

## State

```
foot-core   last written 08:00:05 · now 09:01 · ~1 hour quiet, first all day
lock        FREE
tree        183 uncommitted files — the other worker has still committed NOTHING
defect      /faq: six <details> with no disclosure affordance. Proven on live:
              all 6 summaries resolve ::after and ::before to none
              the nav dropdown resolves ::after to "⌄"  (control)
cause       summary{display:flex} is global and kills the native marker;
            summary::-webkit-details-marker{display:none} global too;
            the chevron replacement is scoped to #dg-nav-directory only
```

## Why this, now

This is a proven, user-facing defect that has been documented and unapplied for
several iterations purely because the file was being written every few minutes.
That reason has lapsed.

It is also small: one selector. The fix is to give `#dg-page summary` the same
`::after` chevron the nav already gets, so a visitor can tell six FAQ questions
are expandable.

The risk is that foot-core is the highest-consequence file here — it renders every
mini-page and it is what the whole site loads. So this is done under the lock, with
the smallest possible diff, and verified before release.

## Task 1 — claim the foot lock, properly

`bin/dg lock claim --owner "$USER" --why "faq disclosure affordance"` and keep the
token. The lock exists precisely so two writers cannot both be in this file.

If the claim fails, stop. Someone else took it back and this waits again.

Re-check the mtime immediately after claiming: if foot-core changed between my
check and my claim, release and stop. An hour of quiet is not a guarantee.

## Task 2 — the smallest diff that fixes it

Add a chevron for mini-page summaries. Constraints:

- **Do not touch the global `summary{}` rule.** It sets the 48px tap target and
  the border; changing it affects the nav too and is a bigger blast radius than
  this defect deserves.
- **Do not remove `-webkit-details-marker{display:none}`.** Restoring the native
  triangle would look inconsistent with the nav's custom chevron.
- Add one rule scoped to `#dg-page summary::after`, matching the nav's existing
  content and colour so the two read as the same component.
- If the nav rule already has an `[open]` variant flipping "⌄" to "⌃", mirror it.
  Half a disclosure control is worse than none.

Match the file's existing style exactly — it is minified-ish inline CSS in a JS
string, not a stylesheet. A prettier-formatted insertion would stand out and
conflict badly with the other worker's diff.

## Task 3 — verify before releasing the lock

- `node --check demigod-foot-core.js`
- `bin/dg ship prepare` — foot-smoke is the gate that catches a broken foot-core,
  and it must pass before I let go of the lock.
- Render `/faq` with the disk build injected (the `injectCore` pattern in
  `demigod-button-audit.mjs`) and measure: all six summaries should now resolve
  `::after` to the chevron, and the nav must still resolve to its own.
- Screenshot it. The two defects this week were both settled by a picture.

If anything fails, revert foot-core to the pre-edit copy and release the lock.

## Task 4 — release the lock in every outcome, then report

Release whether it worked or not. Leaving it held blocks the other worker, who has
183 uncommitted files riding on this file.

Do not commit `demigod-foot-core.js` — it carries their uncommitted work, and
`git add` sweeps it into my commit. That is what 78b9895 did to 14 files today.
The fix goes in the working tree alongside theirs, and I say so plainly.

Do not publish. The fix reaches visitors only with authorisation in a current
request.

## Constraints

- Foot lock claimed for the whole edit, released at the end, no exceptions.
- One selector. No opportunistic tidying of anything else in foot-core.
- Revert on any gate failure.
- No commit of contested files, no publish, no outbound.
- Read all command output.
