# Agent file access (anti-block)

**Status:** living guide
**Documentation map:** [`DOCS.md`](../DOCS.md)

## Why file tools get “weird blocks”

Some agent file tools refuse gitignored paths, and some do not honor `!` re-include exceptions. A broad home-repository ignore such as `DEMIGOD-*`, `.local/`, or `.config/` can therefore hide the exact files agents need and cause retry loops.

## Current layout

- Living entry documents remain visible at the repository root: `AGENTS.md`, `DOCS.md`, `DEMIGOD-SIMPLE.md`, `DEMIGOD-COMPRESSED-STATE.md`, and related canonical guides.
- Agent-owned CLIs live as real files under `bin/`; personal PATH entries may symlink to them.
- User service sources live under `systemd-user/`; install them with `bin/dg-install-user-units`.
- Canonical Demigod sources use explicit `demigod-*` names and must not be hidden by a broad `DEMIGOD-*` ignore.
- Secrets, caches, media, private personal configuration, and transient `/tmp` data remain ignored where appropriate.

## Rules

1. Put agent-owned source in the repository, not only under `.local/` or `.config/`.
2. Prefer `bin/`, `demigod-*.mjs`, `DEMIGOD-*.md`, `docs/`, and `systemd-user/`.
3. Keep source and installed copies distinct: edit `systemd-user/`, then install.
4. Do not loosen ignores around secrets merely to make a tool convenient.
5. Use short, bounded tool calls and avoid stacking duplicate background jobs.
6. For long work, checkpoint machine state under `/tmp/dg-busy/`; do not treat it as durable documentation.

## User service workflow

```bash
# Edit the repository source, then install it.
$EDITOR systemd-user/demigod-dash.service
bin/dg-install-user-units
systemctl --user restart demigod-dash.service
```

If a tool still cannot access a repository file, inspect the exact ignore rule before copying the file elsewhere. Fix the narrow ignore problem; do not create a second source of truth.
