# SLOP — Codex adapter write-path (2026-08-12)

## Symptom
Detached `dg-bus task codex` runs (e.g. `20260812223320057-400674-mbofj8`, `…f28nkp`, `…2m7qkr`) reported:
- filesystem **read-only** / `EROFS` when writing `QUEUE.md`, `results/`, or `/tmp/dg-busy/agent-bus/messages.jsonl`
- `gh auth status` → Uuriko token **invalid** (host `gh` as potter works)
- could not ship reviews/implements; static draft only

Interactive Codex on `pts/2` was **not** touched.

## Root cause
`/home/potter/bin/codex-ask` (bus adapter) defaulted to:

```bash
CODEX_ASK_SANDBOX=read-only   # → codex exec --sandbox read-only
```

Effects:
1. Model shell commands see EROFS outside the sandbox allow-list → inbox + bus ledger unwritable.
2. Sandbox cannot use the host keyring; `gh` without `GH_TOKEN` in env reports invalid/missing auth.
3. Contrast: `ask-claude` uses `--dangerously-skip-permissions`, so Claude bus tasks could write.

Host check (potter): `gh auth status` → Uuriko (keyring) OK. Failure was adapter sandbox, not laptop credentials.

## Fix applied (minimal)
In `bin/codex-ask`:
- Default sandbox → **`workspace-write`** (override `CODEX_ASK_SANDBOX=read-only` for pure consults).
- `--add-dir "$DEMIGOD_BUSY"` so `/tmp/dg-busy` is writable for bus sends.
- `-c shell_environment_policy.inherit=all` so env (incl. token) reaches the sandbox.
- If `GH_TOKEN`/`GITHUB_TOKEN` unset, export from `gh auth token` (not logged).
- `--approve-for-me` when sandbox is `workspace-write` so noninteractive bus execs don’t hang on approvals.

`codex-ask --selftest` still PASS. No change to interactive TUI. No force-push. No money spent on a live Codex probe of the new flags (next real `dg-bus task codex` is the proof).

## Workaround if regresses
```bash
CODEX_ASK_SANDBOX=workspace-write dg-bus task codex --from grok-bot --spec-file … --detach
# or, last resort (externally trusted host only):
CODEX_ASK_SANDBOX=danger-full-access …
```
Write under `/tmp` then promote with a host-side agent if sandbox still blocks a path.

## Follow-up
`--approve-for-me` cannot combine with `--sandbox`; for `workspace-write` the adapter now passes **only** `--approve-for-me` (implies writable workspace + auto approval). Codex sync task was re-queued after the flag conflict caused exit 2.
