**demigod-review — 8 features (ranked)**

- **P0 — `undefined-function-call` rule**: grep-collect all top-level `function`/`const`/`import` bindings in a file, flag any `identifier(` call with no matching definition/global. This is the exact bug class that broke foot-core 5+ times (`wizBuild` called, never defined) and `node --check` never caught it since it's syntactically valid.
- **P0 — `--boot-smoke` gate**: actually `vm.Script`-execute changed `.mjs/.js` files (stubbed DOM/globals) after `node --check`, not just parse. Catches the "extra `}` closes IIFE early" class that shipped past syntax-only checks in the v150 parse break.
- **P0 — run history + `--trend`**: append `{at, sha, summary}` to `/tmp/dg-busy/review-history.jsonl` each run; `--trend N` prints new-vs-fixed deltas across last N runs. Directly targets the recurring "verified green, broken again next session" churn pattern.
- **P1 — `--watch`**: `fs.watch` on scope files, debounce 400ms, rerun `collectFindings` and print only the delta. Matches the actual edit loop (Grok/Cursor rapid iteration) instead of manual reinvokes.
- **P1 — `--attribute`**: for each finding, shell `git log -1 --format=%an,%ar -- <file>` and tag which writer/session introduced it — useful with multiple concurrent agents (Grok/Fable/Cursor) touching the same files.
- **P1 — extend `copy-policy` to template literals**: current rule likely scans static strings; extend regex scan to catch 48h/SLA/founder-name text built via template literals/concatenation, since "runtime scrubs only" has caused repeated live-stale-copy findings.
- **P2 — `--compare a.json b.json`**: diff two saved reports (appeared/disappeared findings) — cheap standalone tool, also the primitive `--trend` needs.
- **P2 — `freeze-bypass-flag` rule**: flag any source use of `DEMIGOD_FORCE_PUBLISH` (or other freeze-bypass env vars) outside `demigod-ship-prep.mjs`/explicitly allow-listed files — memory shows this env var has been used to skip `assertNotFrozen`.

**3 improvements to bin/dg live | full-check | tools-registry**

- **live-doctor (`bin/dg live`)**: stamp `generatedAt` in `live-doctor.json` and have `full-check`/dashboard reject results older than e.g. 10 min instead of trusting a cached file blindly — this is the literal root cause of the recorded `AGENT-BRIEF stale gate` P0 (dashboard read a stale JSON with no mtime check).
- **full-check**: standardize on exit-status-only gating everywhere (it already does for review-gates) — currently mixes `childJson` artifact parsing with spawnSync status; add one top-level `{ok: boolean}` in its JSON output so callers/agents don't have to re-derive pass/fail from nested step output.
- **tools-registry**: add `--stale [hours]` that cross-checks each tool's declared `out` path mtime against a threshold and lists which "hot" tools haven't been run recently — turns the static catalog into an actionable staleness report, addressing the same stale-artifact failure mode that's recurred across ~6 separate incidents in memory.
