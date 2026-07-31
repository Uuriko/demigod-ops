# Agent file access (anti-block)

## Problem
Home-as-repo `.gitignore` used `DEMIGOD-*` and full `.local/` / `.config/` ignores.
Grok/Cursor **cannot read or edit gitignored paths** → thrash, retries, “weird blocks.”

## Fix (2026-07-16)
`.gitignore` allowlists:

- Living docs: `DEMIGOD-SIMPLE.md`, `DEMIGOD-AGENTS.md`, `DEMIGOD-COMPRESSED-STATE.md`, `DEMIGOD-WORKFLOW.md`, …
- CLIs: `.local/bin/dg-*`, `power-ac-auto-profile`, …
- Units: `.config/systemd/user/demigod-*`, `power-ac-auto.service`
- Symlinks also under `bin/` for the same CLIs

## Agent rules
1. Prefer `DEMIGOD-SIMPLE.md` + `DEMIGOD-COMPRESSED-STATE.md` + `demigod-*.mjs` / `bin/*`
2. Do **not** put agent-owned scripts only under ignored personal dirs without allowlist
3. Short tool calls; no stacking 10 background jobs; write `/tmp/dg-busy/work-checkpoint.json` on long tasks
4. After real site/tool changes, update compressed-state in the same session when you can edit it

## Still ignored (by design)
Secrets, HEAVY-*, CURSOR-*, most of `.config`, caches, `/tmp` contents, media, archives.
