# demigod-review v2.2

## Features
- `DEMIGOD-REVIEW.json` project config (CLI overrides)
- `--format summary|json|md|sarif`
- `--stats` per-pass timings
- `--print-fix-prompt`
- `--config` / `--no-config`
- Unknown flag → exit 2
- Finding dedupe by fingerprint
- Rules: `no-double-semicolons`, `spawn-shell-lc`, `console-log-debug`
- Tier-A: double-semicolon fix
- `bin/dg review-self` | `review-bug` | `review-fix`
- `full-check --with-review`

## Self-bugfix
`bin/dg-review --include-meta --bug --full --gates` on review modules → OK after FP hardening.
