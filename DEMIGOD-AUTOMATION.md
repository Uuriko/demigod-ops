---
status: reference
canonical_for: automation
generated_by: claude
generated_at: 2026-08-18
---

# What Demigod does without being asked

Inventory of scheduled work, how to see whether it is actually running, and — the part that is easy
to leave undocumented — what is deliberately **not** automated and why.

Check it with `bin/dg-health`.

## Scheduled

| Unit | When | What it does | Fails loudly? |
|---|---|---|---|
| `demigod-integrity` | daily 00:00 | six read-only checks: verify-source, origin-mirror (14 repos vs GitHub), supply-chain, board-retention, die-accounts and die-store-snapshot selftests | yes — non-zero if any check fails |
| `demigod-die-snapshot` | daily 00:12 | `VACUUM INTO` snapshot of the DIE mission store, **then restores it and boots the app against the copy** | yes |
| `demigod-snapshot` | daily 00:14 | local snapshot of what git cannot restore: repo bundle, ignored data, and `uncommitted.patch` for modified *tracked* files | yes |
| `demigod-busy-rotate` | daily 00:00 | rotate `/tmp/dg-busy`, prune stale receipts | yes |
| `demigod-role-ledger` | daily | observe public ATS boards | pre-existing |
| `demigod-roles-pipeline` | twice daily | discover → apply → ledger → public roles | pre-existing |
| `demigod-board-history` | 03:00 | one bounded 20-board slice of archive collection | yes |
| `demigod-domain-drift` | Sun 04:00 | probe 2,815 company sites; previous report archived first so runs can be diffed | yes |
| `demigod-research-reseal` | weekly | re-verify company research older than 7 days | yes — **currently failing, see below** |
| `dasha-token-observe` | daily 00:26 | dated $dasha market/identity/chain/clone reading, appended | yes |

Every timer sets `Persistent=true`. Without it, a laptop asleep at the scheduled hour simply never
runs the job — on exactly the machine the jobs exist to watch.

## Seeing failures

Before 2026-08-18 nothing was wired to notice one. No unit had `OnFailure=`, `systemctl --failed`
clears when a unit restarts or the session recycles, and the receipts that exist live in
`/tmp/dg-busy`, which dies at reboot. A job failing every night looked identical to a job working.

Now: `OnFailure=demigod-alert@%n.service` appends to `~/.local/state/demigod/failures.jsonl` —
durable — with systemd's own `Result`, the exit status, and the last journal lines, plus a
`last-failure` marker.

`bin/dg-health` reads all of it. The one thing it refuses to say: that a job is healthy because it
has never failed. **A timer that has never fired prints `untested`, not `ok`.** Those are different
states and the difference is the whole reason to look.

## Known red: research reseal

`demigod-research-reseal` fails on its current run: `verificationPass: false`, `reason: fail-fresh`,
with `sourceChecks: 147/147` passing. Enabling the timer is what surfaced it — the failure predates
the automation and was simply never visible. Left enabled and failing on purpose, because a check
that is switched off to keep the board green is worse than a red one.

## Deliberately NOT automated

"Automate as much as possible" has a boundary, and these sit on the far side of it. Each has a
working unit on disk that stays disabled.

| Unit | Why it stays off |
|---|---|
| `demigod-events-tunnel` | Runs `dg-events-online up` — a **public** Events API tunnel. Opening a public endpoint is exposure, and exposure is publishing. Needs authorization in the request that asks for it, not a timer. |
| `demigod-events-heal` | Same tunnel, healed automatically every 5 minutes. A self-healing public endpoint is a public endpoint that is harder to notice. |
| `demigod-events-tick` | A draft-mode autonomy tick every 6h. It does not auto-send, but it is an autonomy loop against an events bot, and it depends on the tunnel above being up. |
| `demigod-useful-loop` | An autonomous plan→do→verify loop that writes work state continuously. It is prepare-only and never publishes, but standing autonomous mutation is a grant the operator makes, not one an agent takes. |
| `demigod-backup` | restic, off-device. Fails closed on three unset things: restic is not installed, `DG_BACKUP_REPO` and `RESTIC_PASSWORD_FILE` are unset, and no external storage is mounted. The local `demigod-snapshot` covers deletion and corruption; it does **not** cover disk failure or theft, and nothing here does. |
| `demigod-memguard`, `demigod-tab-hygiene` | Depend on a CDP browser session that is not always present. |

The pattern: anything that **publishes, sends, spends, or acts autonomously** stays off. Everything
that observes, verifies, snapshots or collects is scheduled.

## Adding a check

`bin/dg-integrity` holds the nightly read-only checks. Before adding one, confirm it exits non-zero
on a real finding — a check that always exits 0 makes the sweep dishonest. Nothing that mutates a
store belongs there.
