# Agent file access (anti-block)

## Root cause of “weird blocks / many retries”
1. Home `.gitignore` used `DEMIGOD-*` and ignored all of `.local/` + `.config/`.
2. Grok/Cursor file tools **refuse gitignored paths**.
3. Some tool stacks do **not** honor `!` re-include exceptions → thrash loops.

## Fix applied
- Removed blanket `DEMIGOD-*` ignore (living docs readable again).
- Agent CLIs live as real files in `bin/` (PATH: `bin` + `.local/bin` → symlink to `bin`).
- Systemd unit **sources** live in `systemd-user/`; install with `bin/dg-install-user-units`.

## Do this when editing power/services
```bash
# edit unit in repo
$EDITOR systemd-user/demigod-dash.service
bin/dg-install-user-units
systemctl --user restart demigod-dash.service
```

## Agent habits (speed)
- Prefer one short shell over 10 parallel probes.
- No stacking background codex until prior finishes.
- Checkpoint: `/tmp/dg-busy/work-checkpoint.json` on multi-step work.
- Update `DEMIGOD-COMPRESSED-STATE.md` after real site/tool ships when possible.
