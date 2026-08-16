# slop.cash agent collaboration note - 2026-08-12

## Current Evidence

- Live `https://slop.cash/` is a static React/Vite app titled `Slop - make money shipping slop`.
- The live app also serves `slop.tech`; `eliza.army` is a compatibility alias per the public README.
- Canonical public repo: `https://github.com/elizaOS/army`, branch `develop`.
- No local `/home/potter` source tree for `elizaOS/army` was found. Do not treat `/home/potter/src/eliza` as the slop.cash site repo.
- Only local `slop-cash` filename hits were `.config/solana/slop-cash-payout.*`; Codex did not read them. Wallet/money paths stay gated.
- Grok bus retry completed as task `20260812203608885-325944-0b9d8m`; first sandboxed attempt `20260812203334936-2-dl3oh7` is a stale interrupted receipt.

## Surface Map

- Routes visible from the built client: `/`, `/projects/:slug`, `/contributors/:login`, `/cycles/:project/:cycle`, `/projects/new`, `/#projects`, `/#leaderboard`.
- Browser data reads: `/data/leaderboard.json`, `/data/cycles/index.json`, and cycle artifacts under `/data/cycles/<project>/<cycle>/`.
- Launch projects in the live bundle: `eliza` (`elizaOS/eliza`, pledged `$10,000` monthly pool) and `delta-star` (`lalalune/ArkLib`, external Ethereum Foundation Proximity Prize percentage). Delta Star does not promise or distribute that prize.
- Client has no app POST path; creation flow generates a manifest and GitHub handoff for a PR to `elizaOS/army`.

## Repo Map

- `projects/` - reviewed project manifests and reward policy.
- `skills/` - contributor and CI reviewer skills.
- `evaluations/` - reviewed partial-credit awards.
- `cycles/` - append-only monthly proposals, approvals, plans, and receipts.
- `src/` - UI and strict browser/domain contracts.
- `scripts/` - GitHub ingestion, packaging, month close, and settlement checks.
- `skill-tests/` - executable safety and receipt tests for every skill.
- `tests/` - component, integration, and browser coverage.
- Generated output under `public/brand`, `public/downloads`, `public/projects`, and `public/data/cycles` is not edited by hand.

## Collaboration Protocol

- Primary continuous-work SoR for paid eliza work is now `docs/exchange/SLOP-ELIZA-MULTIAGENT-COORD-2026-08-12.md`.
- Source of record, if work starts: a local clone of `github.com/elizaOS/army` on `develop`; live `slop.cash` is evidence, not an editable source.
- Use `bin/dg-bus task <agent> --from <agent> --spec-file ... --out docs/exchange/...` for guaranteed reviews or research.
- Use `bin/dg-bus send <agent> --from <agent> --subject "claim: PATH" --body "slop.cash: editing until <condition>"` before edits when another agent may be live.
- Release claims with `subject "release: PATH"` and include verification performed.
- Claim exact files, not broad directories, except for one short-lived generated-output lane after a build.
- Keep durable conclusions in `docs/exchange/` or the project repo docs, not only `/tmp/dg-busy`.

## Paid Work Addendum

- Current best target is **Review/Validate mode on `elizaOS/eliza#18774`**, pending final CI, sandbox, and direct outbound-auth checks. It is small, human-authored, open, non-draft, mergeable, and only touches the trajectory CLI loop plus one focused real-CLI test file.
- Do not spend more time expanding `#18756` / `#18761`; `#18772` is the maintainer superset and `#18761` is closed.
- Do not start `#16268` from this repo without fresh maintainer direction. It is assigned/member-claimed packaging work with prior implementation history closed as superseded/moved.
- `#18729` and `#18731` are occupied by external `CLAIMING REVIEW` comments plus `CHANGES_REQUESTED` reviews; do not duplicate them unless new commits land.
- Grok is unmeasured support for strategy/red-team/collision checks. Measured Slop receipts are Codex/Claude only when the exact allowlisted model identity is available.
- No GitHub comments, reviews, PRs, reward files, wallet reads, or settlement actions without current explicit authorization.

## Suggested Lanes

- Codex: source edits, tests, schema/trust-boundary verification, minimal implementation.
- Grok: live-surface audit, product/risk red-team, external state checks, independent review.
- Claude, if used: UX/a11y/copy/claims review.

## Hard Gates

- No publish/deploy, outbound messages, forms, reward close/propose/approve/settle, money movement, wallet reads, or Solana signing/broadcasting unless the current user request explicitly authorizes that exact action.
- Reward/cycle/settlement files are money-shaped. Treat changes to `cycles/`, `evaluations/`, wallet markers, `src/lib/wallets.ts`, `src/lib/cycle-index.ts`, `src/lib/run-receipts.ts`, `src/lib/leaderboard.ts`, `src/lib/project-view.ts`, and settlement scripts as high-risk.
- Slop prepares and verifies public state; it does not custody funds or keys.

## Verify Commands From Public README

Local setup in the repo:

```bash
bun install --frozen-lockfile
bun run projects:check
bun run evaluations:check
bun run leaderboard:generate
bun run dev
```

Full verification:

```bash
bun run projects:check
bun run evaluations:check
bun run cycles:check
bun run audit:dependencies
bun run typecheck
bun run format:check
bun run lint:check
bun run test
bun run build
bun run test:e2e
```
