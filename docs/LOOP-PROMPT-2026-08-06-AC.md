# Loop iteration AC — the backup I shipped does not cover the work in flight

## State

```
snapshot   daily timer live since iteration V; restore-proven 39/39 identical
archive    53 entries — gitignored data + dotfiles. ZERO tracked source files.
bundle     commits only, by definition
exposed    129 modified tracked files · 7,847 insertions · 3,360 deletions,
           uncommitted, including the entire 1,650-line site redesign
```

## Why this, now

Five iterations ago I shipped `bin/dg-snapshot`, verified it by restoring 39 files
byte-identical, enabled a timer, and told the user it protects against "a
destructive command inside $HOME." I proved the restore worked. I never checked
**what was in scope to restore.**

It turns out the archive is gitignored files only and the bundle is commits only,
so the entire uncommitted working tree — 7,847 insertions right now, including
another worker's whole site redesign — is covered by neither.

Be precise about the claim, because the precise version still matters:

- For `git clean -xfd`, the command that actually caused the 2026-08-02 loss, the
  coverage IS correct. That command removes untracked and ignored files, which is
  exactly what the archive holds. The claim I made was true for the incident.
- But `git reset --hard`, `git checkout -- .`, a botched merge, or a stray
  `git stash` destroys modified tracked files, and those are 100% unprotected.
  With several agents writing to one repo, that is not a hypothetical.

This is the same failure shape as everything else this session: verified the
mechanism, never verified the scope. "The restore works" answered a different
question than "is the thing I care about in there."

## Task 1 — establish the true coverage, category by category

Do not reason about it. Enumerate what exists in the working tree and check each
category against the archive and the bundle:

1. Committed history — bundle. Verified already, re-confirm.
2. Gitignored data files — archive. Verified already.
3. **Modified tracked files** — expected uncovered. Confirm by picking a file with
   uncommitted changes and checking whether its current content is recoverable
   from the snapshot at all.
4. **Untracked but NOT ignored files** — the file list uses
   `git ls-files -o -i --exclude-standard`, which is ignored-others. A brand-new
   source file that has never been `git add`ed matches neither `-i` nor the
   tracked set. Check whether such a file exists right now and whether it is in
   the archive.
5. Staged-but-uncommitted changes — check separately from unstaged.

Produce a table: category, count of files, covered yes/no, by which artifact.

## Task 2 — close the holes, without breaking what works

Add to the snapshot:

- `git diff HEAD` — captures staged and unstaged modifications to tracked files in
  one patch that `git apply` can restore.
- Untracked, non-ignored files — the new-file case.

Constraints:

- **Do not widen it into a whole-repo copy.** The snapshot runs daily on a timer;
  sweeping node_modules or the 1.5MB map into it every day is how a backup becomes
  something someone disables. Keep the no-slash / bounded discipline that is
  already there.
- The patch must be verified by APPLYING it, not by existing. An unapplied patch
  is the same unverified belief as an unrestored archive — the exact error this
  iteration exists to correct.
- Restore verification goes into the tool itself where it can, so a future
  snapshot that silently stops capturing something fails loudly.
- No deletion, anywhere. Write new paths only. The last filesystem mistake in this
  repo cost the user their configuration.

## Task 3 — correct the claim I made to the user

I told them the snapshot protects against destructive commands in $HOME. Restate
it accurately in the tool's own header and in the report: what it covers, what it
does not, and which specific commands fall on each side. A backup whose scope is
misunderstood is worse than a known-absent one, because it stops people worrying.

## Task 4 — verify end to end, on the real repo state

- Take a snapshot now, with 129 modified files in the tree.
- Restore it into a scratch directory.
- Prove the redesign's uncommitted changes come back — pick a file the other
  worker modified, apply the patch, and diff it against the live working copy.
- Confirm the archive did not balloon; report before/after size.

If the patch cannot be applied cleanly for some real reason, say so and say why
rather than shipping a backup that produces a patch nobody has tested.

## Constraints

- No foot-core, no head, no CSS — the redesign is still uncommitted there and this
  iteration is specifically about not losing it.
- No publishing, no outbound, no money.
- Read all command output. Verify scope, not just mechanism.
