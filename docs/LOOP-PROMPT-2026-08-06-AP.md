# Loop iteration AP — is anything else on a timer failing silently?

## State

```
found      demigod-recruitai-export ran nightly via ExecStartPost and threw every
           time. Nobody knew. Found only because I checked what the timers run.
signals    demigod-events-heal.timer  LAST 2026-08-02, NEXT "-"
           demigod-events-tunnel      inactive / disabled
           demigod-events-tick        inactive / disabled
pattern    a scheduled job that fails produces no output anyone reads
```

## Why this, now

Yesterday's finding was not "the export had a bug". The bug was found and fixed
hours earlier for unrelated reasons. The finding was that **a job had been failing
every night and no signal reached anyone.**

That is a property of the scheduled surface, not of the export. There are a dozen
user units here, and I have never asked the only question that matters about any of
them: *did the last run actually succeed?*

Three signals already suggest more. `demigod-events-heal.timer` last fired
2026-08-02 and has no next run. `events-tunnel` and `events-tick` are both
inactive and disabled. Those may be deliberate — the events surface may have been
retired — but "deliberately off" and "quietly broken" look identical from the
outside, and I do not currently know which each one is.

The asymmetry that makes this worth doing: a failing timer costs a day of data per
day, compounding, and announces nothing. A working timer costs nothing to verify.

## Task 1 — enumerate every unit and get its real last result

For every unit in `systemd-user/` and every timer systemd knows about:

- Is it installed? A file in `systemd-user/` that was never symlinked into
  `~/.config/systemd/user/` is inert — `demigod-backup.timer` was exactly that,
  reported ready and never installed, and `demigod-submissions-webhook.service`
  reports `not-found` today for the same reason.
- Is it enabled? Active?
- **What was the result of its last run?** `systemctl --user show <unit>
  -p Result -p ExecMainStatus -p InactiveExitTimestamp` is the authority, not the
  timer list.
- When did it last actually run, versus when it was supposed to?

Build one table. Installed / enabled / last result / last run / expected cadence.

## Task 2 — separate "off on purpose" from "quietly broken"

For anything not running, decide which it is, with evidence:

- Deliberately retired — say what retired it. A note in `AGENTS.md`, a superseding
  tool, or the user saying so. The Eat the Sounds fence is the model: an explicit
  statement, not an inference.
- Broken — it should be running and is not.
- Never installed — the unit file exists and systemd has never seen it.

**Do not enable anything to "fix" it.** Enabling a job that was deliberately
retired is worse than leaving it off, and I cannot tell the difference for the
events units without evidence. Report and let the user decide.

## Task 3 — check the receipts, not just the exit codes

A job can exit 0 and still do nothing useful — the export exits 0 while printing
`{"ok":false}`, which is why the nightly failure was invisible to systemd. So for
each running job, find the artifact it is supposed to produce and check:

- Does the receipt exist?
- Is its mtime consistent with the cadence, or is it stale?
- Does it contain `ok:false`, an error field, or a zero count where a count is
  expected?

This is the check that would have caught the export. A unit reporting
`Result=success` is not evidence the work happened.

## Task 4 — propose the smallest thing that would have surfaced it

If several jobs can fail without signal, the useful output is one cheap check, not
a list of eight findings. `bin/dg doctor` already exists and I extended it
yesterday with integration config checks; a staleness check over scheduled
receipts is the same shape and the same place.

Only build it if it can be honest: it must compare a receipt against an expected
cadence and report `ok:false` bodies, not merely assert that a file exists. A
check that a file exists would have reported green throughout the export failure,
because the file existed and was stale.

## Task 5 — report by cost of failure

Rank findings by what a day of failure actually costs: a day of role collection is
not the same as a stale audit receipt. Say which is which, and say plainly if
everything is healthy.

## Constraints

- Do not enable, disable, start or stop any unit except read-only status queries.
- No network re-polls, no publishing, no outbound.
- No writes to real stores.
- Read all command output; a green exit code is not evidence the work happened.
