# Scheduled jobs — what actually runs, and a correction

## Correction first: the nightly export was NOT failing

Yesterday I wrote that `demigod-recruitai-export` "had been throwing every run" via
`ExecStartPost` on the ledger unit. **That was wrong.** Evidence:

- 5 days of journal contain **zero** occurrences of the error or any `"ok": false`
- last night's run emitted `"ok": true` with **497 rows** and finished clean
- the failing export exits **1**, not 0, so systemd would have caught it — my
  earlier "exit=0" reading came from a pipeline where `$?` was the last command

What actually happened: the export only fails when the research gate is green AND
benchmark companies match exported rows. The committed benchmark carried
`researchedAt: 2026-08-01` with 30 companies; it was **re-run today** (271
insertions uncommitted) and the gate is now green as of `2026-08-06T13:35:59Z`.
Before that, `researchGate.green` was false, so `companyResearch` was null on every
row, validation was skipped, and the export succeeded.

So the accurate statement: **the fix prevents a failure that would have started on
tonight's run**, in the state that exists now. That is still worth having — it is
just prevention, not repair, and I reported repair.

## Nine unit files systemd has never seen

The larger finding. These exist in `systemd-user/` and were never symlinked into
`~/.config/systemd/user/`, so they are inert files:

```
demigod-backup          demigod-busy-rotate     demigod-cdp
demigod-dash            demigod-memguard        demigod-session-ready
demigod-tab-hygiene     power-ac-auto           demigod-submissions-webhook
```

`demigod-backup` was already known — written, reported ready, never installed.
`demigod-submissions-webhook` is mine and deliberately not installed. **The other
seven were never checked by anyone**, and each looks identical to a working unit
from the file system.

Note the trap in the status table: `systemctl --user show <unit> -p Result` returns
`Result=success` for a unit that has **never executed once**. Querying the result
of a job that never ran reports success.

## What is actually running

| Unit | Enabled | Last run | Health |
|---|---|---|---|
| `demigod-role-ledger` | yes | 2026-08-06 00:05 | clean, export ok:true 497 rows |
| `demigod-roles-pipeline` | yes | 2026-08-05 19:49 | `lastRun.failed: []`, all 7 steps ok |
| `demigod-snapshot` | yes | 2026-08-06 07:09 | Result=success, artifacts verified |
| `demigod-events-bot` | — | 2026-08-04 10:27 | active process |
| `demigod-useful-loop` | — | 2026-08-06 05:41 | ran today |
| `demigod-events-heal` | enabled | **never** | enabled but has not run |
| `demigod-research-reseal` | enabled | **never** | next 2026-08-10 |
| `demigod-events-tick` | disabled | never | off |
| `demigod-events-tunnel` | disabled | never | off |

## Not proposing to enable anything

The events units are disabled and the events surface may have been retired
deliberately — `events-tunnel` being off is consistent with the intake finding that
its tunnel record is five weeks stale. "Deliberately off" and "quietly broken" look
identical from outside, and enabling a retired job is worse than leaving it off.
This is the user's call, and the seven uninstalled units are worth a decision each
rather than a blanket install.

`demigod-tab-hygiene` is worth flagging specifically: the user asked to "close
extra tabs" earlier in this session, and a tab-hygiene unit exists that has never
been installed.
