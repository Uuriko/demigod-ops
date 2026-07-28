# Demigod working prompt — Claude Code best practices, applied

Paste this to start a Demigod work session. It bakes in Anthropic's Claude Code best practices
(code.claude.com/docs/en/best-practices) against Demigod's real tools and guardrails. Give me ONE task
after this preamble (or say "pick the next best task").

## 1. Work in phases: Explore → Plan → Implement → Verify → Review → Commit
- **Explore (read-only, cheap):** understand the real flow before touching anything. For anything that
  spans multiple files or an unfamiliar subsystem, **delegate the reading to a subagent** ("use a
  subagent to investigate X") so hundreds of files don't fill my context. Ground every claim in the
  code, not memory — recalled facts may be stale; re-verify a file/flag/function still exists before
  relying on it.
- **Plan:** if the change touches multiple files, is publish-gated, or I'm unsure of the approach —
  state a short plan first (what changes, what could break, how I'll verify). If I could describe the
  diff in one sentence (a typo, one guard, a copy tweak), skip the plan and just do it.
- **Implement (Ponytail):** smallest correct diff; reuse before adding; root-cause not symptom (grep every
  caller of the function I'm about to touch and fix it once where they route through). New files or
  clean files only.
- **Verify with EVIDENCE (Demigod's superpower — never skip):** every non-trivial change leaves a runnable
  check, and I show its output, not an assertion of success. Prove the check can go RED before trusting
  green (poison-test); a test that can't be made to fail is vacuous — drop it. Use the smallest relevant
  gate: `--selftest` / `node --test`, `demigod-foot-smoke.mjs`, `bin/dg truth`, `demigod-seo-audit.mjs`,
  `demigod-route-health.mjs`, `bin/dg review`. Regressions are caught by the tool that fails, with output shown.
- **Adversarial review (fresh eyes, correctness-only):** before calling non-trivial work done, have a
  fresh subagent review the diff against the plan/requirements — "report only gaps that affect
  correctness or the stated requirement, not style." Then STOP: don't chase every finding. Over-
  engineering (extra abstraction, defensive code, tests for impossible cases) is a failure mode, same
  as under-verifying. Ponytail wins ties.
- **Commit:** surgical `git commit --only <files>`, clear message, `Co-Authored-By: Claude Opus 4.8
  (1M context) <noreply@anthropic.com>`. Commit only when the unit is verified. Never `git push`.

## 2. Context discipline (the fundamental constraint)
- One task at a time. Don't let an exploration or a debugging tangent pile into the main thread — push
  read-heavy work to subagents that report back a summary.
- If I've corrected the same thing twice, the approach is wrong — stop, re-scope, restate.
- Reference specific files/patterns and the symptom + likely location + what "fixed" looks like, not
  vague asks.

## 3. Demigod guardrails (hard — these override momentum)
- **Publishing needs exact authorization in the live request.** Default is prepare-only. When authorized,
  ship through the gated flow: hold the foot-lock (`demigod-foot-lock.mjs claim --owner claude`), bump the
  4 version markers, `demigod-foot-smoke.mjs`, `bin/dg ship prepare` (must pass), `DEMIGOD_CURRENT_REQUEST_
  PUBLISH=1 DG_LOCK_TOKEN=… bin/dg ship run`, verify `bin/dg truth`, release the lock. Back up foot-core first.
- **`bin/dg truth` is the only source of live-version truth.** Never copy a version into a doc.
- **Concurrent agents (Codex, Grok build) share these files.** `foot-core.js` and the directory renderer
  churn fast — check `git status` + mtime before editing; hold the lock; coordinate via `grok-ask` /
  Orca. Don't clobber another agent's dirty WIP; publishing carries whatever is on disk.
- No outbound (DMs/email/posts/forms), no money movement, no `git push` — all need explicit authorization.
- Don't invent rules/promises/positioning; don't declare the site finished; use they/them for unstated pronouns.
- Ponytail every edit; leave the smallest working diff with its check.

## 4. When to interview me first
For a larger feature, before coding: interview me with `AskUserQuestion` about implementation, UX, edge
cases, and tradeoffs — dig into the hard parts — then write a self-contained `SPEC.md` (names the files,
states what's out of scope, ends with an end-to-end verification step). Execute from the spec.

## 5. Failure patterns to avoid (name them if I'm in one)
kitchen-sink session (unrelated tasks piling up) · correcting the same thing 3× (re-scope instead) ·
trust-then-verify gap (plausible code, no check) · infinite unscoped exploration (use a subagent) ·
chasing every review finding into over-engineering.

Source: Anthropic, "Best practices for Claude Code," https://code.claude.com/docs/en/best-practices
