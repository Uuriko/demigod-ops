# Pop!_OS + workflow plan — 2026-08-04

Scope: make the laptop faster and the workflow harder to break, after the
2026-08-02 wipe. Written under Ponytail: the ladder ran on every item, and most
of them collapsed to "you already built this — turn it on."

**Net new code to write: one script.** Everything else is enabling existing
tooling or a one-line system change.

---

## A. Turn on what already exists (0 new code)

Your `systemd-user/` survived the wipe with 22 units. The installed copies in
`~/.config/systemd/user/` did not, which is why tab hygiene stopped self-pruning
(tabs reached 12 before a manual prune on 2026-08-04) and why the role-poll
control reads `timer not armed`.

**A1. Relink the units**

```bash
mkdir -p ~/.config/systemd/user
ln -sf ~/systemd-user/*.service ~/systemd-user/*.timer ~/.config/systemd/user/
systemctl --user daemon-reload
```

Prerequisite already met: units hardcode
`/home/potter/.nvm/versions/node/v24.17.0/bin/node`, and nvm + node 24.17.0 are
restored.

**A2. Enable selectively — not all 22**

| Unit | Why | Verdict |
| :--- | :--- | :--- |
| `demigod-tab-hygiene.timer` | auto-prunes CDP tabs ~45min; its absence caused the pileup | enable |
| `demigod-memguard.timer` | soft memory guard, warns at `DG_MEM_WARN_MB=4096` | enable |
| `power-ac-auto.service` | see A3 | enable |
| `demigod-useful-loop.service` | `Restart=always`, unattended, still a wipe suspect | **hold** |
| events-bot / tunnel / tick | outbound-adjacent; re-arm deliberately | hold until reviewed |

**A3. Auto-performance on AC — the whole performance fix, no script**

`bin/power-ac-auto-profile` already does AC-plug detection, profile switching, and
a tab prune on unplug. It reads:

```sh
ON_PROFILE="${POWER_AC_ON_PROFILE:-balanced}"
OFF_PROFILE="${POWER_AC_OFF_PROFILE:-battery}"
```

The unit file already carries the override as a comment. Uncomment and change it:

```ini
Environment=POWER_AC_ON_PROFILE=performance
```

This solves the "Performance resets to Balanced on every boot" problem
permanently, and correctly drops back to `battery` when unplugged. Do **not**
write a boot script for this.

---

## B. Pop!_OS system changes (3 items, no scripts)

**B1. Repaste the CPU — the only real performance fix**

```
package_throttle_count = 10441      core_throttle_count = 7536
throttle time = 93.2s in 31h        clock 3200MHz of 3900MHz max at 65°C
```

i7-7820HK, 2017, original System76 paste. System76 uses generic paste at scale
and it dries with age. Repaste + a more aggressive fan curve; paste alone
improves cooldown rate but doesn't prevent spikes. Shop visit or an afternoon.

Nothing in software fixes a 700MHz sustained clock deficit.

**B2. Boot: drop the 5.8s network wait**

```bash
sudo systemctl disable NetworkManager-wait-online.service
```

18.1s boot, and this single unit is 5.8s of it. Safe on a laptop — it exists only
to delay boot for services that need the network up.

**B3. Cap the journal** — 800MB today

```
# /etc/systemd/journald.conf
SystemMaxUse=200M
```

Cosmetic at 856G free. Do it if you're already in there.

**Explicitly leave alone:** `fstrim.timer` (enabled, scheduled), zram swap
(configured, 0B used), 0 failed units, RAM (81% free), disk (4% used).

---

## C. Claude Code / workflow (config, not scripts)

**C1. `git clean` deny rule — DONE 2026-08-04**

```json
"permissions": { "deny": ["Bash(git clean *)"], "disableBypassPermissionsMode": "disable" }
```

Covers `FOO=bar git clean`, `timeout 30 git clean`, and `x && git clean`. Claude
Code only — Codex, Grok, and Cursor need their own equivalents.

**C2. `SessionStart` hook → inject `bin/dg` orient**

Your `CLAUDE.md` says website truth comes only from `bin/dg truth`, and the
registry already has `orient` ("Truth refresh + demand soft + unify + assert-same
→ 5-line card"). Today every agent has to *remember* to run it.

A `SessionStart` hook makes that automatic — convention becomes enforcement. Uses
the existing tool; the hook is 3 lines of JSON, no script.

**C3. Skip the sandbox.** 111 files write to `/tmp/dg-busy`, which is outside the
sandbox's writable region; `flatpak run` and Docker are incompatible. And with
`cwd = $HOME` the default writable region *is* your home directory, so it would
not have stopped the wipe.

---

## D. The one script worth writing: backups

Nothing on this machine does backups. No restic, borg, timeshift, rclone,
duplicity — only `rsync`. That is the gap the wipe actually exposed.

**What must be covered** — the class git cannot restore. 37 concrete `.gitignore`
entries died on 2026-08-02, never tracked, unrecoverable:

```
DEMIGOD-SUBMISSIONS-INBOX.json (+ .archive.jsonl)   ← real contact PII
DEMIGOD-PAIRS.json      DEMIGOD-ROLE-LEDGER.json    DEMIGOD-EVENTS.json
DEMIGOD-SF-STARTUPS.json  DEMIGOD-PROOF-LOG.json    DESK.json  … (37)
plus ~/.config/demigod/*.env and the systemd user units
```

**Do not write a backup engine.** Install `restic` and write one wrapper —
scheduling via the systemd-user pattern you already use:

- `bin/dg-backup` — restic snapshot of the gitignored data class + `~/.config/demigod`
- `systemd-user/demigod-backup.timer` — daily, `Persistent=true`, matching
  `demigod-role-ledger.timer`
- Target an external disk or object storage. **Not** the same NVMe — a second copy
  on the disk that just lost everything is not a backup.

Restic gives dedup, encryption, and history for free. A hand-rolled tar loop gives
you a bug farm.

**Second copy, separately:** the repo has 3 commits, no `main`, and an
unauthenticated `Uuriko/demigod-ops` remote. Verify it, then push. That covers the
tracked half; restic covers the untracked half.

---

## Order

1. **Verify the `demigod-ops` remote** (`gh auth login` → `git ls-remote`) — highest stakes, still unknown
2. **restic + `bin/dg-backup` + timer** — the actual lesson of the wipe
3. **Rotate** Twitter / Webflow / GitHub / messaging tokens
4. A1–A3 — relink units, `POWER_AC_ON_PROFILE=performance`
5. B2, B3 — boot and journal
6. C2 — the orient hook
7. **Repaste** — book it; biggest performance win, longest lead time

## Not doing, and why

| Item | Why not |
| :--- | :--- |
| Sandbox | breaks `/tmp/dg-busy`; wouldn't have stopped the wipe |
| Custom perf scripts | `power-ac-auto` + `dg hygiene` + `memguard` already cover it |
| Custom backup engine | restic exists and is better than anything hand-rolled |
| Re-arming `useful-loop` | `Restart=always`, unattended, still a wipe suspect |
| Fixing the 11 test failures | wait until the remote is verified — a better version may exist there |
| Tuning RAM / disk / swap | 81% free, 4% used, 0B swap, zero memory pressure |
