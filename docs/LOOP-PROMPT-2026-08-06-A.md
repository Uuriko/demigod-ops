# Loop iteration A — what's next and why

## State read before deciding (verified, not assumed)

```
bin/dg truth      TRUTH PASS disk=v1014 live=v1014 shipped=true
foot lock         HELD by codex-data-reseal   ← another agent is mid-edit
control board     4 failing:
                    phase2_has_accepted_role   acceptedForDelivery=0
                    board_has_real_role        boardRoles=3 all sample
                    pairs_has_real             real=0 sample=0
                    backup_capability          restic not installed; repo unset
[T1] regression   demigod-head-minimal.html still has 2 preconnects (contract: 1)
restic            available in apt (0.16.4), not installed
external storage  NONE — only the internal NVMe (no /media mounts, /mnt empty)
```

## Task selection

**Ruled out — the three delivery-loop controls.** `acceptedForDelivery=0`,
`boardRoles=3 all sample`, `pairs real=0`. These are not code problems. No commit
moves them; only a signed brief does. Building more product against them is the
exact failure both Codex and Grok independently named in the debates.

**Ruled out — anything in `demigod-foot-core.js`.** The foot lock is held by
`codex-data-reseal`. `DEMIGOD-SIMPLE.md` says one writer, and my first copy-scrub
fix was already silently clobbered once today by ignoring that.

**Selected — two things that are genuinely blocked-on-me, not blocked-on-user:**

### Task 1 — install restic

`backup_capability` reports three blockers: restic missing, `DG_BACKUP_REPO`
unset, `RESTIC_PASSWORD_FILE` unset. I can clear exactly one of them. The other
two need a repo target, and my own script fails closed when the target sits on the
same filesystem as `$HOME` — correctly, since a second copy on the disk that lost
everything on 2026-08-02 is not a backup. **There is no external volume mounted**,
so those two genuinely require a user decision (external disk, or object storage
credentials).

Clearing one of three is still worth doing: it turns "nothing is installed and
nothing is chosen" into "one decision away." Do not weaken the same-filesystem
guard to manufacture a green control.

### Task 2 — resolve [T1], the one real product regression

`demigod-head-minimal.html:271-272` now carries two preconnects — `cdn.jsdelivr.net`
and `files.catbox.moe` — where `demigod-head-font-optional.test.mjs:18` asserts
exactly one. This is the single confirmed *product* defect out of 12 test failures
(the rest were stale oracles or wipe casualties).

I left it alone earlier because it was another agent's uncommitted edit and
reverting in-flight work is how clobbering happens in reverse. It is still red.
**Resolve it properly rather than by picking a side:**

1. Determine whether the catbox preconnect is load-bearing — does the head or foot
   actually fetch from `files.catbox.moe` on the critical path? Preconnect to a
   host nothing requests is pure waste; preconnect to a host on the critical path
   is a real win.
2. If it IS load-bearing: the *contract* is wrong, not the code. Update the test
   deliberately, with a comment saying which hosts are allowed and why — never a
   silent count bump from 1 to 2.
3. If it is NOT load-bearing: remove the preconnect.

Evidence decides which, and the evidence is in the head/foot source, not in
preference.

## Constraints for this iteration

- No foot-core edits while the lock is held by another owner.
- No publishing — the current request authorises none.
- Any test change must state, in a comment, what the new contract is and why —
  the copy-coupled-oracle lesson from `TEST-TRIAGE-2026-08-05.md`.
- Verify by running. Four false test signals turned up in this session; a test's
  verdict is not evidence about the product.
