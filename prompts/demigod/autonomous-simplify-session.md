# Autonomous simplification session — self-prompt (user away)

**Mandate:** keep simplifying Demigod ("less is more, elegance, remove bloat") for as long as
productive, WITHOUT oversight. The user gave full authority incl. publish. But I wrote
`DEMIGOD-BUILD-RETROSPECTIVE.md` this session — autonomous loops that churn, clobber, and thrash-publish
are the #1 failure mode. **Do not become the loop I just disabled.**

## Guardrails (hard)
1. **Reversible-first.** Prefer git-tracked deletions (recoverable) and no-publish work. Verify each change; commit in small, surgical, well-labeled batches (explicit paths — never `git add -A`, never sweep the shared tree).
2. **Publish is rare + batched.** At most ONE more foot publish this session, only if a clearly-high-value copy/bug batch is ready; always foot-smoke green + `bin/dg truth` live==disk after. No thrash-publishing (retro P4/P5).
3. **Don't touch:** Eat-the-Sounds files (CLAUDE.md), the live homepage section-hiding logic (needs user review), the runtime scrubs (gated on Designer source fix), tests without per-file review ("selftests are real"), money/outbound.
4. **Stop when the safe backlog is done — don't spin.** A finished backlog is the correct ending, not a reason to invent churn. Leave a clear status for the user.
5. **Read the artifact, don't presume** (retro P8). Verify against real live/rendered state; a snapshot lied about "Bug 1" already this session.

## Backlog (priority order)
1. **Reversible dead-code cleanup** — the ~65 tracked orphan scripts (Agent 1's `deadish-tracked.txt`): re-verify each has zero code/entrypoint/registry/systemd refs against *current* state, then `git rm` the clear one-shot passes (`*-pass.mjs`, `*-audit.mjs`, `heavy-*.mjs`). Keep anything ambiguous. Commit.
2. **Doc consolidation** — collapse the 8 overlapping roadmaps to one, move dated snapshots (`*-2026-07-*`, retrospective, audits) into `history/`, merge topic-pair docs. Verify no canonical doc/`bin` references a moved/deleted file first (repoint if so). Commit.
3. **Investigate the real homepage story (read-only)** — is `.trust-section` (how-it-works) intentionally hidden by the "night institutional" redesign, with the model shown elsewhere, or a real bug? Write findings to a doc for the user; do NOT change live homepage rendering autonomously.
4. **One copy publish (optional, if confident)** — FAQ 18→~10 (cut the entries that verbatim-duplicate pricing/status/WIZ, per `scratchpad/simplify-copy-bugs.md`). Pure DG_PAGES string trims, NO route/nav/page-merge changes (those need the footer-lite redirects + nav updated = too risky solo). foot-smoke → publish → verify → commit.

## Status log
Append one line per completed item to `DEMIGOD-AUTONOMOUS-SESSION-LOG.md` so the user can see what ran.
Start: swarm disabled; ~180 files + 4 doc groups removed; v820 published (funnel copy enriched live).
