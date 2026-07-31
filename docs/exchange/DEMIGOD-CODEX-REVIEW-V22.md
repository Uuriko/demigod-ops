# Demigod Review v2.2 — Codex P0 proposal

Scope: review tooling only. Freeze ON. No CDN/Webflow mutation and no `demigod-foot-core.js` edit or ship.

## P0.1 — Make gate execution explicit and fail closed

- `--gates` with no suggested gates should report `no-gates-selected`, not silently run board honesty.
- Unknown `--gate-ids` must be a CLI/config error (exit 2); never yield an unrelated default gate.
- Add `--list-gates`; include selected, skipped, unknown, timeout/signal, and exact exit status in JSON/Markdown/SARIF metadata.
- Keep strict status-only success; remove the `DEMIGOD_GATE_ALLOW_OUTPUT_PASS` escape hatch in v2.2.
- Touch: `demigod-review-gates.mjs`, `demigod-review.mjs`, `demigod-review-lib.mjs`, `demigod-review-selftest.mjs`, `bin/dg-review`.

## P0.2 — One trustworthy scope/diff model

- Represent scope as `{file, source}` where source is explicit, tracked-change, base-diff, or untracked.
- `--files` must still compute hunks (currently it disables diff awareness); `--diff BASE` should include committed BASE..HEAD plus worktree/index without duplicates.
- Report rejected/path-escaped/missing explicit inputs instead of silently dropping them.
- Treat renames, deletions, spaces/quoted Git paths, and zero-context hunks deterministically.
- Add `--scope` dry inspection so agents can verify what will be reviewed before gates/fixes.
- Touch: `demigod-review-lib.mjs`, `demigod-review.mjs`, `demigod-review-selftest.mjs`, `bin/dg-review`.

## P0.3 — Transactional fixes with an immutable foot guard

- Make foot exclusion unconditional while freeze is ON; `--allow-foot` alone must not bypass it.
- Plan every fix first, then atomic apply; on any write/syntax failure roll back the entire batch, not only one file.
- Record before/after hashes and unified patches in dry-run/report; refuse stale writes if disk hash changed.
- Rescan is mandatory after apply and applied fixes must not hide newly introduced findings.
- Touch: `demigod-review-fix.mjs`, `demigod-review.mjs`, `demigod-review-lib.mjs`, `demigod-review-selftest.mjs`, `bin/dg-review`.

## P0.4 — Stable, auditable baselines

- Replace line-based fingerprints with rule + normalized file + stable evidence/context hash; preserve a legacy matcher for migration.
- `--baseline-add` must require explicit finding IDs/rules and a reason; never bulk-add all low/info findings.
- Detect expired/orphaned suppressions and surface them without failing the review by default.
- Write baseline changes atomically and include actor/time/reason/schema version.
- Touch: `demigod-review-lib.mjs`, `demigod-review.mjs`, `DEMIGOD-REVIEW-BASELINE.json`, `demigod-review-selftest.mjs`.

## P0.5 — Contract tests for exit codes and machine output

- Define exits: 0 clean/pass, 1 findings or failed gate, 2 usage/internal/config error, 3 fix transaction failure.
- Guarantee `--json` emits JSON only on stdout; diagnostics go to stderr; reports carry a `2.2.0` schema version.
- Add fixtures for empty gate selection, unknown gate, timeout/signal, explicit-file diff, rename/delete, path escape, stale fix, rollback, baseline migration, and SARIF validity.
- Self-test must use an isolated temp root and clean it, avoiding tracked workspace fixture writes.
- Touch: `demigod-review.mjs`, `demigod-review-lib.mjs`, `demigod-review-gates.mjs`, `demigod-review-fix.mjs`, `demigod-review-selftest.mjs`, `package.json`.

## Related-tool follow-through (after P0 contract is green)

- Update dashboard/tool registry to display scope, gate reason, exit class, and report links without parsing prose.
- Update `bin/dg` help and npm aliases; keep the v2.1 flags compatible for one release with deprecation warnings on stderr.
- Touch: `demigod-agent-dashboard.mjs`, `bin/dg`, `bin/dg-review`, `package.json`.

Order: P0.1 → P0.2 → P0.5 harness → P0.3 → P0.4 → related tools. Ship gate: self-test + targeted source verification green; freeze remains ON and foot stays untouched.
