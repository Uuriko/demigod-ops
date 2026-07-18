# Coord-Claude Self-Audit — 4-Day Retrospective (2026-07-17)

Honest audit of my own work (Jul 13–17): what I got right, what I broke, the drift and strange
behavior, the root causes, and an **enforceable** protocol to stop repeating the same mistakes.
Requested by potter after "fixing stuff, breaking it, fixing it again and lots of drift."

## The record

- **127 commits** in 4 days · **233 logged findings** across the 7 rotating autopilot tasks · **89
  self-written memory lessons**.
- Error classes (counted from my own commit subjects — the fixes are real, but each is also evidence
  of a defect that existed, often one I or the swarm introduced):

| Class | Count | What it looks like |
|---|---|---|
| **Gate honesty** (false green / red / vacuous) | 18 | gates green on dead code; assert literals against regex source; `[].every()` passing a WIZ that asks nothing; gate trusts a stored claim over its own evidence |
| **Silent-loss** (non-atomic / wipe / evict / swallow) | 13 | non-atomic SoR writes; corrupt file silently wiped; inbox cap evicts oldest lead; empty `catch` on a write; API returns `ok:true` on failure |
| **Parse / stale / unshipped** | 8 | no gate parsed foot-core for months (the v150 keystone gap); head size never measured (Webflow silent cap); orphan server on :9878 for 8h |
| **PII / secrets in git** | 7 | leads inbox, outreach CSV, board-corruption backups, ORCA status — all held real emails, none gitignored |
| **Sim/test data → real SoR** | 4 | CLI smoke test wrote the real leads inbox; e2e fixtures posted real domains into the live SoR; a greeting became a candidate's name |
| **Self-inflicted** | 4 | my own a11y sweep was 94% false positives; over-claims I later corrected; released grok's lock by misreading a refused claim; wrong-indent edits |

## What went well (keep doing)

- **Found genuinely load-bearing defects**, not cosmetic ones: the keystone gap where *no gate parsed
  the one canonical file* (`15eaf72`), `/events` serving raw HTML source to visitors (`715f8ee`),
  board `computeSignal` counting all 3 sample seeds as real and jamming every gated flow (`a4d434d`),
  head silently exceeding Webflow's cap (`6df8f8f`).
- **Hardened the leads system-of-record** against every silent-loss vector (atomic write, preserve-
  corrupt, archive-before-cap, concurrency lock) and **closed a PII-in-git exposure class**.
- **Self-corrected in-session**: `eb89cad` literally reads "correct my prior over-claim." I caught and
  fixed my own 94%-false-positive sweep (`78f4fe3`).
- **Adversarial verification via codex/swarm** repeatedly caught what I missed (the dashboard bug hunt,
  the copy-regression confirmation, the extra PII sites).
- **The memory system compounded**: 89 lessons, many demonstrably preventing repeats.

## The mistakes, by root cause

1. **Gate honesty (18) — I equated "green" with "works."** I wrote and trusted checks without a
   *positive control*: does the gate go RED on a known-bad input? The worst case (`09a8ab2`) was a
   *vacuous* green — `visGood = realQs.length === 0 || realQs.every(…)` passed a WIZ that walked only
   welcome→submit, testing nothing, because `[].every()` is already true.
2. **Silent-loss (13) — happy-path coding.** I wrote the success path and left corrupt / concurrent /
   full / empty paths untested. Empty `catch` blocks, non-atomic writes, `ok:true` returned on a write
   that threw.
3. **Parse/stale/unshipped (8) — I measured the wrong surface.** I verified *source strings* instead of
   the *rendered artifact users get*, checked an *upload* instead of what *shipped*, trusted a *stored
   claim* instead of *evidence*.
4. **PII in git (7) — I didn't check what a new file exposed before it landed.**
5. **Sim data → SoR (4) — tests shared the production path** with no test-mode isolation.
6. **Self-inflicted (4) — I acted on unverified signal with over-confidence,** and made careless
   mechanical errors (indentation, shell quoting — *twice in the very session that produced this doc*).

## The drift & strange behavior (honest accounting)

- **foot-core churn.** The single canonical 6000-line file gets rewritten mid-session by the swarm and
  by me. This session I found **v682 sitting uncommitted (1057 lines) AND already live** — ~350
  versions were unbacked at one point (`65454ce`). Churn on a shared mutable file is the engine behind
  most of the freeze sagas and version-marker drift.
- **I froze a mid-build.** I paused the swarm (correctly, for a 96°C thermal event) while it had
  uncommitted work in flight — the right call under the constraint, but it left a half-built state.
- **I released another agent's lock** (`grok`) by misreading a refused-claim response, whose payload
  shows the *holder's* owner and looks like success.
- **Repeated shell/node-quoting bugs** cost cycles and produced at least one false "inconclusive"
  audit.
- **Version-marker drift.** foot-core has 4 version markers that must agree; disagreement triggered
  multi-day freeze sagas.

## Root-cause meta-patterns (the deeper why)

- **A. Green ≠ correct.** A passing check is not a working thing until the check is proven able to fail.
- **B. I verify the representation, not the artifact.** Source ≠ rendered DOM. Upload ≠ shipped. Stored
  claim ≠ evidence. Committed ≠ live.
- **C. Happy-path only.** The corrupt / concurrent / empty / failure input is where the SoR dies.
- **D. Over-claim velocity.** I declare "done / contained / no more" before the re-sweep finishes.
- **E. Shared mutable state without isolation.** Tests write prod SoR; N agents churn one file.

## Enforceable protocol (the fix — not vague advice)

Each rule maps to a mechanism, not a good intention:

1. **Positive control before any finding is "real."** Assert the gate/check FAILS on a known-bad,
   empty, or *absent* subject before trusting its pass. → add to the autopilot HARD RULES + a
   `demo()` self-check on any new gate. *(This is the verify-the-verifier lesson, promoted to a gate.)*
2. **Measure the artifact, not the source.** Any "it ships / renders / is scrubbed" claim requires a
   CDP render or served-HTTP check of the actual bytes users get. → checklist line before reporting
   any user-facing fix.
3. **Every SoR/config write: atomic + preserve-corrupt + a failure-input test.** tmp→rename, copy
   corrupt aside before overwrite, and one test that feeds corrupt/empty/concurrent input. → covered
   for leads SoR; make it the template for all five SoR files.
4. **No swallowed failures.** An error handler must surface (return failure / respond 5xx / log) —
   never an empty `catch` on a write, never `ok:true` on an unpersisted result.
5. **New-file exposure check.** Before any new file lands, check for PII/secrets; gitignore-first for
   anything with real contact data.
6. **foot-core discipline.** Never leave it uncommitted; snapshot before large swarm work; exactly one
   writer via the lock; never churn the version markers gratuitously.
7. **Kill the quoting errors.** Prefer a script file over `node -e`/`jq` one-liners with nested quotes.
8. **Claim only what the re-sweep confirms.** "No more X" is only sayable after the sweep that would
   find X returns clean.

## Codex's independent assessment

_(External review — codex got the same error-class data and returned enforceable mechanisms. It
strongly corroborated the analysis above and added sharper enforcement. The highest-value additions
beyond my own list:)_

- **Gate-of-gates.** A meta-gate that fails when any registered gate *lacks a negative-control test*,
  or whose assertions never actually observe the artifact/evidence they claim to validate. This turns
  "prove the check can fail" from a habit into a CI rule.
- **Ban readiness-from-stored-fields.** A lint check forbidding any green/ready/shipped/real/healthy
  decision derived from a stored `status`/`ok`/`verified` field without independently collected
  evidence. Stored claims may be *displayed as history* but must never *determine* state.
- **The artifact ladder.** Each surface has rungs: canonical source → generated/pasted artifact →
  served response → rendered behavior. **A claim is only as strong as the highest rung actually
  checked**, and any unchecked rung must be recorded explicitly (the shipping gate rejects missing
  rungs instead of silently downgrading confidence).
- **Finding-close template.** No bare "fixed." Closing a finding requires: reproducer-before,
  reproducer-after, caller search, sibling-pattern search, and exact command output.
- **Discovery ≠ findings.** Scanner/grep output stays a *candidate* (schema: `evidence_type`,
  `reproducer`, `expected`, `actual`, `confidence`) until a minimal reproducer shows real impact.
  Candidates may not enter the priority board or appear in commit subjects as confirmed defects.
- **Fail-closed provenance.** Ingestion rejects test/simulation provenance; fixtures use reserved
  non-registrable domains; a gate *attempts to submit a fixture into the real SoR and requires that it
  be rejected*.
- **A refused lock is ALWAYS failure, regardless of the holder text displayed.** (This is exactly how
  I released grok's lock.)

**Codex's 11-step verification protocol** (adopt verbatim as the finding-close discipline): state the
claim narrowly → find the real source of truth and final consumed artifact (never start from a
label/cache/stored claim) → build the smallest reproducer against the real path, record failing
input+output *before* editing → run a **negative control that should fail** and confirm it fails for
the intended reason, then a known-good control → inspect the gate itself for vacuity (empty
collections, swallowed exceptions, default-true, stale files, unchecked exit codes) → search all
callers and siblings → validate each artifact rung, recording any skipped → for mutations, force a
failure mode and confirm no data loss / no silent replacement / no fixture leakage / no ok:true on
failure → run the narrow regression then the project gate (gate is *supporting* evidence, never the
reproducer) → re-sweep the original search and explain every remaining match → only then promote
candidate → confirmed.

## The one meta-rule

Codex and I converged on the same single habit, stated most precisely by codex:

> **No claim becomes real or done until a minimal reproducer fails *before*, passes *after*, and a
> deliberately broken control proves the verifier itself can fail** — measured against the *artifact*
> users get, never its representation.

Nearly every class above (gate honesty, stale/unshipped, over-claims, silent-loss) collapses into
this. If I change exactly one thing, it is this — and the enforcement mechanisms above (gate-of-gates,
finding-close template, artifact ladder, candidate-vs-confirmed) exist to make it mechanical rather
than a matter of remembering to be careful.

---
_Sources: 127 commits + 233 findings (`/tmp/dg-busy/autopilot-findings.jsonl`) + 89 memory lessons,
Jul 13–17 2026. Independent review: codex (`claude-selfimprove-1784342237`). Self-audit aggregator:
`.dg-selfaudit.mjs`._
