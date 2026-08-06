# Loop iteration AO — will today's changes survive running unattended tonight?

## State

```
changed today  recruitai-export · matching-engine · role-ledger · x-hiring ·
               directory-static · startup-atlas-web · roles-pipeline · revenue ·
               doctor · bin/dg-snapshot · several new test files
scheduled      roles-pipeline    ~07:31 (imminent)
               role-ledger poll  2026-08-07 00:12
               dg-snapshot       2026-08-07 00:05
               directory refresh via the same chain
verified so far each change in isolation, by its own tests
```

## Why this, now

Every change today was verified the way I verify things — targeted tests, proven
non-vacuous, selftests green. None of it has been verified the way it will
actually run: **unattended, from a systemd unit, with no terminal, no
DEMIGOD_TEST_SCOPE, and a different environment.**

That gap has already bitten this project once today. `demigod-backup.timer` was
written, reported as ready, and had never been installed — the failure was in the
handoff to automation, not in the code. And I have shipped a "verified" thing
whose scope was wrong twice more: the snapshot that did not cover uncommitted work,
and the receiver whose secret silently failed validation.

The roles pipeline fires within the hour and runs `demigod-x-hiring.mjs`, which I
edited twice today. The ledger poll runs tonight against
`demigod-role-ledger.mjs`, which I edited today. If either breaks, it breaks with
nobody watching, and the first signal will be missing data tomorrow — the exact
silent-loss shape I have spent three iterations hunting.

Checking now costs minutes. Not checking costs a day of collection.

## Task 1 — enumerate precisely what runs, and what it touches

For each scheduled unit that will fire in the next 24 hours, list the scripts it
executes and intersect that with the files I changed today. Read the units and the
pipeline definitions rather than recalling them — `demigod-roles-pipeline.mjs`
carries its own step list and `demigod-directory-refresh.mjs` spawns nine scripts.

Anything I changed that is NOT in a scheduled path can be noted and skipped; the
point is the unattended surface, not a full re-test.

## Task 2 — exercise each changed-and-scheduled script the way the timer will

Not the way I tested it. Specifically:

- **Without** `DEMIGOD_TEST_SCOPE`, `NODE_TEST_CONTEXT`, or any env I set by hand.
  Several modules branch on those — `demigod-submissions-lib.mjs` redirects every
  store path when `IS_TEST` is true, so a test-scoped run proves nothing about the
  real one.
- With the unit's `Environment=` lines, including its `PATH`. A systemd user unit
  does not inherit my shell's PATH; `bin/dg-snapshot` had to hardcode a node path
  for exactly this reason.
- Offline-safe modes first (`--selftest`, `--check`, `--queries`), then a real
  invocation **only where it is read-only or already scheduled to happen anyway.**

**Do not trigger a network re-poll to test a poll.** The scheduled run does that
tonight; forcing it early is the thing I declined to do yesterday for good reason.
Prefer `--selftest` and dry paths, and say plainly which steps could only be
verified offline.

## Task 3 — check the two units I added or touched today

`demigod-snapshot.service` and `demigod-submissions-webhook.service` are mine from
this session. Verify:

- The snapshot unit runs clean from systemd, not just from my shell — it did once,
  but the script has changed since (it now writes `uncommitted.patch` and verifies
  it applies, which clones a bundle into a temp dir).
- The webhook unit is still correctly **not** enabled. It should stay that way
  until a secret and URL exist, and an accidental enable would leave a receiver
  running in compat-unsigned mode.

## Task 4 — report by risk, not by count

For each scheduled job: will it run, and what happens if it does not? A job whose
failure loses a day of collection is not the same as one whose failure means a
stale receipt. Say which is which.

If everything is clean, say so plainly. This iteration is insurance; finding
nothing is the expected and good outcome, and manufacturing a finding to justify
the time would be worse than reporting zero.

## Constraints

- No network re-polls, no publishing, no outbound.
- Do not enable, disable, or start any unit except to verify status — and if I
  start something to prove it works, stop it and confirm it stopped.
- No writes to real stores. Verify mtimes unchanged where a script could write.
- Read all command output.
