# Loop iteration B — restore the test signal, then cut dead weight

## State read before deciding

```
suite            537 tests · 528 pass · 9 fail · only 2 files failing (was 12 in 4)
  ✖ demigod-submissions-ingest-publish-policy.test.mjs
  ✖ demigod-webhook-rate-limit.test.mjs
foot lock        FREE (codex-data-reseal released)
uncommitted      162 files (other agents active)
dead weight      70 heavy-send-*.mjs · 14 cursor-*.mjs
broken scripts   npm run verify / verify:store / verify:loops → eat-the-sounds/* (deleted)
```

[T1] preconnect and [T2] `proposeIntro` are both resolved. What remains is exactly
[T3] and [T4] from `TEST-TRIAGE-2026-08-05.md`: two wipe casualties, both fixable
by me, neither a product defect.

## Why this is the right task now

The single most expensive finding of this session was that **a standing red count
of 14 was ~7% real**. Two stale oracles and one vacuous green meant the suite was
reporting the revenue-side wizard broken when it worked, while a genuine
regression (the duplicate preconnect) sat unnoticed in the same red pile.

A suite with permanent reds stops being read. Getting to **0 failures** is not
cosmetic — it is what makes the next real regression visible on the day it lands.
Nine failures is close enough that finishing is cheap and the payoff is a signal
that can be trusted again.

## Task 1 — [T3] seed the submissions inbox

`ENOENT /home/potter/DEMIGOD-SUBMISSIONS-INBOX.json`. One of the 37 gitignored
data files destroyed on 2026-08-02, never tracked, unrecoverable.

Seed an **empty, correctly-shaped** inbox. Requirements:

- Read `demigod-submissions-lib.mjs` for the real shape. Do not invent a schema.
- The file is gitignored and holds PII in production — it must stay untracked and
  must never be committed. `demigod-verify-no-committable-sor.mjs` is the guard;
  run it after.
- Seed **empty**. Do not fabricate submissions. A fixture row in the production
  inbox reads as real demand, and `demigod-submissions-lib.mjs:18-20` documents
  that exact incident: *"*.test.mjs polluted the inbox with 115 fixture rows that
  read as real demand, and the board (which feeds the live site) was corrupted
  twice the same way."*

## Task 2 — [T4] relink the systemd user units

`ENOENT ~/.config/systemd/user/demigod-events-heal.service`. The unit definitions
survived in `~/systemd-user/`; only the installed symlinks died with `~/.config`.

Relink **without enabling or starting anything.** Symlink + `daemon-reload` makes
the unit files readable, which is all the test needs. Enabling is a separate
decision and `demigod-useful-loop.service` (`Restart=always`, unattended) is still
one of two suspects for the wipe. Do not enable it.

## Task 3 — [R3] the three broken npm scripts

`npm run verify`, `verify:store`, `verify:loops` all point at
`eat-the-sounds/verify-*.mjs`, which does not exist. `CLAUDE.md` says Eat the
Sounds is archived and out of scope.

`npm run verify` is the most canonical-sounding command in the project and it
fails. Anyone reaching for it gets a false failure. Remove the three entries —
they reference an archived project, so there is nothing to repair.

## Constraints

- **Do not enable systemd units.** Relink only.
- **Do not fabricate data.** An empty seed is the honest fix; a populated one is a
  fake-demand incident that has already happened twice here.
- **Scope commits with explicit paths.** 162 files are uncommitted from other
  agents; an earlier commit swept 14 of them under an unrelated message.
- Verify by running. Re-run the full suite at the end and report the actual count,
  not the expected one.

## Not this iteration

- The `heavy-send-*` (70) and `cursor-*` (14) deletions. They need a live-caller
  grep first, and deleting 84 files while 162 are uncommitted from other agents is
  how work gets lost. Queue for when the tree is quieter.
- Anything that moves `acceptedForDelivery`, `boardRoles`, or `pairs real` — no
  commit moves those.
