# Loop iteration BA — reclaim what is safely reclaimable, starting with my own mess

## State

```
diagnosed  93-96°C, 3.4M throttle events, cores at 2800 of 3900 MHz (~28% lost),
           load 23.6 on 8 cores. Main levers need root or a screwdriver.
untouched  disk and scratch growth — never looked at it
mine       /var/tmp/demigod-snapshots: 47MB per run, and I ran it several times
           by hand today plus a daily timer, with NO pruning by design
never ran  demigod-busy-rotate — "Rotate /tmp/dg-busy logs and prune stale
           receipts" — one of the seven unit files systemd has never seen
```

## Why this, now

The thermal finding is real but its fixes are the user's: repaste, root-level
turbo, deciding what to do about a 66-hour grok process. I reported those and
should not keep re-reporting them.

What I have never looked at is **space**, and there is a specific reason to look
now: I added `bin/dg-snapshot` today, gave it no retention policy on purpose
("ponytail: no pruning — 11MB/run against 843G free"), then grew it to 47MB per run
by adding `uncommitted.patch`, and ran it manually several times on top of the
daily timer. That is my footprint and I have never measured it.

`/tmp/dg-busy` is the other candidate. Every tool here writes receipts there, the
rotation unit for it was never installed, and if `/tmp` is tmpfs then that growth
is RAM, not disk — which would connect directly to the performance question.

## Task 1 — establish where space actually goes, and whether /tmp costs RAM

- Is `/tmp` a tmpfs? If yes, everything under `/tmp/dg-busy` is resident memory
  and the size matters far more than on disk.
- Size `/tmp/dg-busy`, `/var/tmp/demigod-snapshots`, and the repo's own untracked
  scratch. Report actual numbers, largest first.
- Check the repo for large generated artifacts that do not need to exist —
  `audit-shots/` accumulates screenshots from every playtest run.

Do not guess at sizes. `du` them.

## Task 2 — prune what is unambiguously mine and safe

Rules, in order:

- **My snapshots**: keep the most recent verified one plus one older. Delete
  nothing until `bin/dg-snapshot --verify` passes on the one being kept — a
  retention policy that deletes the good copy and keeps a corrupt one is worse
  than no policy.
- **Never delete the newest**, and never delete all of them. The 2026-08-02 wipe
  is why these exist.
- `/tmp/dg-busy` receipts: only prune what is regenerable and stale. A receipt
  another tool reads as its source of truth is not scratch. Check before deleting
  — `demigod-verify-no-committable-sor.mjs` exists because this distinction has
  been got wrong before.
- **Nothing outside those two trees.** No repo files, no user data, no
  `~/.cache`, no browser profiles. The last filesystem cleanup in this home
  directory cost the user their configuration.

If a category is ambiguous, leave it and say so.

## Task 3 — give the snapshot tool the retention it should have had

Adding `uncommitted.patch` took it from 11MB to 47MB per run and I left the "no
pruning" note unchanged. Fix the note at minimum; add retention only if it can be
done fail-safe:

- Keep N most recent, N >= 2.
- Verify the newest before removing any older one.
- Never remove the only snapshot, and never remove one whose checksums fail —
  a failing snapshot is evidence, not garbage.

If fail-safe retention cannot be written in a few lines, do not write it. Say the
number and let the user decide.

## Task 4 — report reclaimed space and what was deliberately left

Numbers before and after. What was deleted, what was kept and why, and what is
still growing that the user may want to act on.

## Constraints

- **No deletion outside `/var/tmp/demigod-snapshots` and `/tmp/dg-busy`.**
- Never `rm -rf` a variable that could be empty. Check every path before removing.
- No publishing, no outbound.
- Verify a snapshot restores before pruning any other snapshot.
- Read all command output.
