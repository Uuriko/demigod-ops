# demigod-review v2.1 — bugfix of the bugfix tool

**2026-07-14** · Fable + Codex + Grok

## Bugs fixed
1. **Gate false-pass** — `status===0 || /PASS/` could green a failed command → now **exit status only** (`DEMIGOD_GATE_ALLOW_OUTPUT_PASS=1` legacy escape)
2. **`--allow-foot` unwired** — CLI now passes through to tier-A fix
3. **Self-review blindness** — `--include-meta` runs full rules on `demigod-review*`
4. **No re-scan after fix** — `--rescan` re-runs rules after autofix
5. **Review gates too broad** — touching review files no longer always queues heavy usertest-dash

## Features added
- `--fail-on critical|high|medium|low|any|never`
- `--max N` highest-severity cap
- `--only-rule a,b` / `--exclude-rule a,b`
- `--exclude pattern` (repeatable; `*.md`, paths)
- `--fix --rescan` / `--allow-foot`
- `--gate-ids id1,id2`
- `--version` → 2.1.0
- Tier-A: BOM strip, collapse 3+ blank lines
- Rules: `gate-status-or-pass`, `side-effect-on-import`
- Expanded selftest

## Usage
```bash
bin/dg-review
bin/dg-review --bug --gates
bin/dg-review --fix --dry-run
bin/dg-review --fix --rescan
bin/dg-review --only-rule eval-use,syntax --files x.mjs
node demigod-review-selftest.mjs
```

## Security follow-up (same day)

7. **LLM command injection** — prompt no longer spliced into `bash -lc`; `claude` argv only  
8. **Tier-A fix rollback** — if syntax fails after write, restore previous bytes  
9. **`--files` path escape** — reject paths outside ROOT  
10. **Pipeline order** — fix → (re)scan → LLM → single finalize/fingerprint/diff mark  
11. **Selftest fixtures** under `tmp/review-fixtures/` (inside ROOT)

