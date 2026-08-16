<!-- agent-task: 20260812204943024-335132-7yfwoi; role: grok; completed: 2026-08-12T20:54:09.106Z; raw model output, verify before promotion -->
I'll start with the collab note and local constraints, then pull live slop.cash / eliza evidence without writing or publishing.Collab note is in. Next I’ll pull live slop.cash data, army `develop` docs, and the local eliza checkout so the mode pick is evidence-backed.Leaderboard scoring is live. Next I’ll pull army skills, the eliza project page, and local contributing rules so Implement vs Review vs Validate is based on acceptance odds, not headline points.Scoring rules are clear. Next I’ll read the contribute/review skills, local eliza state, and live GitHub queue so the mode pick is about merge odds, not points on paper.Skills diverge: army is Implement/Review/Validate with a two-model allowlist; local eliza is Mode A/B only. I’ll now check live queue, local git, and whether any evaluation/cycle payout path is actually working.Official `contributor-ready` queue is empty and no cycle/evaluation files exist. I’ll confirm local checkout state and the live work-queue before locking the mode pick.**VERDICT: BLOCKED**

Inspection is complete and the next paid mode is clear. Execution is blocked: no GitHub-write authorization, Grok is not an approved measured-run model, the official Implement queue is empty, and the only in-flight Uuriko implement (`#18761`) has already been marked incomplete and superseded.

---

## EVIDENCE

- Public SoR is `elizaOS/army@develop`. Live `https://slop.cash/data/cycles/index.json` has `cycles: []` (generated `2026-08-11T08:43:51Z`). `cycles/` and `evaluations/` on `develop` contain only READMEs.
- Eliza pool is **pledged**, not committed: `monthlyCapDisplay: "$10,000"`, `committedMinor: "0"`, `fundingState: "pledged"`. Wallet/settlement files were not read.
- Approved measured models are only `codex` / `openai/gpt-5.6-sol` and `claude-code` / `anthropic/claude-fable-5`. Grok is absent. Army skill: stop before a measured run if the runtime model does not match.
- Live leaderboard (`gitarmy-v1`, window 2026-07-07 → 2026-08-11): **0 evaluated-contribution points** across the published leaders. Evidence points are rare. Reviews score only on the published deep-inspection set (each author’s newest 5 merged PRs that month). Snapshot counts: 78 open PRs, 393 open issues.
- Army issue-candidate filter requires a maintainer `contributor-ready` label. GitHub search: **0** open `contributor-ready` issues; **0** open `good first issue`.
- Local `/home/potter/src/eliza` is **not** army. Single worktree, clean, parked on `fix/dependabot-bun-lock-and-biome-override` @ `047a412c` = Uuriko `#18761` (2-file dependabot/biome tweak, grok-build, unmeasured). `origin` = `Uuriko/eliza`. No army clone. No extra worktrees.
- Member `lalalune` reviewed `#18761` as not close-ready (workflow still trusts `dependabot/npm_and_yarn/*`, lockfile still 2.5.6, `check:biome-version` still requires the override) and opened `#18772` as the complete replacement, preserving the Uuriko commit. Current `develop` verify is broken on that Biome 2.5.7 vs 2.5.6 drift.
- Fresh outsider PR `#18774` (SYMBaiEX) closes `#18770` with a tiny `trajectory list` filter-before-limit fix, real CLI tests, and an army v2 receipt. Zero reviews at fetch time.
- Bus: Claude triage `20260812205057414-337348-nwzv3c` is also running this prompt. Stale grok sync `20260812203334936-2-dl3oh7` is still marked running.

---

## FINDINGS

**Weakest sufficient hypothesis:** first accepted August score comes from a **substantive pre-merge Review** of one soon-to-merge human PR, posted later by Codex or Claude on an approved model. Implement EV is worse today because the official issue queue is empty, `develop` verify is red, and our only implement attempt was already completed by a maintainer. Validate EV is near zero: no `evaluations/` awards exist.

### 1. Collision-proof workflow beyond the existing note

Keep the bus `claim:` / `release:` rule. Add these hard lanes:

| Rule | Why |
|---|---|
| One GitHub actor (`Uuriko`). Do not open extra accounts. | Caps and self-review are per GitHub actor. Related-party payouts need a separate platform record. |
| Never review a PR this actor authored. | `#18761` self-review scores 0. |
| Scored runs use **army** `contribute-to-eliza` + v2 receipt, not the local `packages/skills/...` copy. | Local skill is Mode A/B + v1 footer; army skill is Implement/Review/Validate + approved-model + `run-receipt.mjs`. Mixed footers can void scoring. |
| Measured runs: Codex or Claude only. Grok is unmeasured support. | Army `modelPolicy` allowlist. |
| Do not edit `/home/potter/src/eliza` on the parked `#18761` branch. New work = fresh worktree from current `upstream/develop`. | One writer per tree. That checkout is already the superseded PR. |
| External mutex = GitHub `CLAIMING:` / `CLAIMING REVIEW:` plus live labels (`claimed:shaw`, `claimed:sol`, …). Internal mutex = `dg-bus` claim of **issue/PR number + exact files**. | Army has no reservation system. `live-report` is a filter, not a lock. |
| One mode per artifact. Pre-split candidates so all three do not take the first `live-report` row. | Parallel Claude triage is live. |
| Do not race member follow-ups (`lalalune` is shipping several small fix/test PRs today). | Those close in minutes; duplicate implement is wasted. |
| Review execution needs a disposable sandbox. A worktree is not isolation. | Army/local skill contract. |
| Wallet README marker, `cycles/`, `evaluations/`, settlement scripts stay untouched. | Money-shaped. |
| August UTC month is the score bucket. Work that cannot merge by 2026-08-31 is next-month inventory. | Snapshot freezes 00:11 UTC on the 1st, then 14-day proposal review. |

### 2. Best next paid mode: **Review**

Expected accepted score/hour, not headline points:

| Mode | Theoretical | Observed acceptance | Expected first 1–2h |
|---|---|---|---|
| **Review** | 3 pts, cap 10/month | Scores only if the PR later merges **and** is in that author’s newest 5 merged PRs | **Best.** ~1–2h static+sandbox; 3 pts if the target lands |
| Implement | 10 + 4 issue + 4 tests + ≤6 evidence, cap 5 PRs | Official issue queue empty; `#18761` already incomplete; `develop` verify red | Poor. Hours high, merge odds low for another outsider CI/config PR |
| Validate | 1–8 via army `evaluations/` | **Zero** awards on the live ledger; extra maintainer PR to army | Near zero |

Do **not** keep implementing `#18756` / `#18761`. The member completion is `#18772`. Cherry-picking their commit onto `#18761` still competes with a member PR and does not make Uuriko the merged-PR author.

First review target, pending a live re-check: **`elizaOS/eliza#18774`** (closes `#18770`). Backup if it gets claimed/approved: a still-unclaimed lalalune **test-only** PR such as `#18769` or `#18767`, not `#18772`.

### 3. Live evidence to re-check before committing to that target

1. PR still open, non-draft, human author, no `CLAIMING REVIEW:`, no review requests, no APPROVED / CHANGES_REQUESTED.
2. Head SHA vs current `develop` (tracking was `2a14d09c`; live PRs already cite `b9dec8f6`).
3. Author’s August merged-PR count (deep-inspection cap). Prefer authors who will merge this month but have not already burned five newer merges after this PR.
4. CI / focused tests / evidence-head still matching the head.
5. Diff audit: lockfiles, hooks, CI, binaries, tests treated as untrusted.
6. Sandbox available. If not, static review only; do not claim execution proof.
7. Posting agent has exact approved model identity. Grok does not post the scored review.
8. User has authorized that specific GitHub review. This request does not.
9. Bus + GitHub show no sibling agent already on the same PR (Claude triage is concurrent).

### 4. Exact lanes for the first 1–2 hours

All three stay **read-only / local-draft** until the user authorizes a GitHub review.

- **Codex:** Install/verify army `contribute-to-eliza` on `gpt-5.6-sol`. Fresh worktree from `upstream/develop`. Trusted-side raw diff of `#18774` (or the replacement from step 3). If sandbox exists, reproduce the CLI regression; if not, stop at static findings. Prepare one `CHANGES_REQUESTED` or `APPROVED` body with line-level defects. Do not post. Do not touch `#18761` files.
- **Grok:** Unmeasured collision/red-team only. Watch `#18761` vs `#18772`, live-report churn, and whether `#18774` is still eligible. Static-read the same diff for security/duplication. No measured receipt. No GitHub write. Do not edit the parked checkout.
- **Claude:** Evidence-row / claims / a11y / attribution audit of the target PR body (template rows vs army v2 footer, N/A abuse, evidence-head). Independent check that Codex findings are real. No implement. No post.

If Codex and Claude would both review, Codex posts later (approved measured client); Claude stays second-reader.

### 5. Red flags that should stop us

- Continuing `#18761` against `#18772`, or reviewing `#18772` to protect `#18761`.
- Grok starting `run-receipt.mjs` / claiming an approved model it does not have.
- Rubber-stamp `APPROVE` with no reproduced defect or proof gap.
- Reviewing a PR that is draft, already reviewed, member-claimed, or unlikely to merge in August.
- All three taking the same first `live-report` candidate.
- Editing the shared `/home/potter/src/eliza` `#18761` worktree.
- Treating `/home/potter/src/eliza` as the slop.cash repo, or cloning army on top of it without a claim.
- Opening issues/PRs/reviews without current-request GitHub-write auth.
- Validate/diagnosis work aimed at `evaluations/` (path has never paid on the live ledger).
- Mixing Biome/lockfile repair into an unrelated PR while `#18756` is contested.
- Public write-up of a suspected vulnerability.
- Wallet marker, cycle close, propose/approve/settle, or any Solana action.
- Second GitHub identity to dodge self-review / caps.

---

## HANDOFF

- **Pick:** Review mode on `elizaOS/eliza`, first candidate `#18774`, after the live re-check list.
- **Do not pick:** more Implement on `#18756`/`#18761`; Validate; measured Grok run; army site edits.
- **Blocked on:** explicit GitHub review authorization; Codex or Claude on an allowlisted model; a worktree that is not `#18761`.
- **Parked state:** leave `/home/potter/src/eliza` on `047a412c`. Do not force-push or expand that PR unless the user later chooses to abandon it in favor of `#18772`.
- **Payout realism:** pledged $10k, no closed cycle, no evaluations, 14-day post-month review. Fastest *accepted score* is still weeks from cash.
- **No files written. No posts. No agents spawned.**
