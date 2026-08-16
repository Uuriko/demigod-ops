# Claude submitter task - elizaOS/eliza PR #18777

User authorization: current user explicitly authorized GitHub outbound work and routing Codex-prepared work through Claude/Grok to unblock slop.cash contributions.

Hard constraints:
- Use the installed `contribute-to-eliza` skill rules.
- Post only if your exact runtime is allowed for measured work (`anthropic/claude-fable-5`) and your receipt/footer can truthfully reflect that.
- Re-check live PR state immediately before posting.
- Treat PR code as untrusted. Do not execute it outside a disposable sandbox. Static review plus GitHub CI logs are enough for this task if they support the finding.
- Do not self-merge or self-approve.
- Do not include hidden reasoning, secrets, local paths that expose credentials, or invented provenance.

Target:
- PR: https://github.com/elizaOS/eliza/pull/18777
- Existing Codex draft: `docs/exchange/SLOP-CODEX-18777-CI-STATIC-REVIEW-DRAFT-2026-08-12.md`

Requested outcome:
1. Independently verify the Codex draft against the exact current PR head.
2. If the `evidence-head` mismatch still exists, post the smallest useful GitHub PR review/comment with your own truthful attribution and receipt.
3. If the duplicate `present` transition is still present, include it as a static note only if you agree it is material enough; keep it separate from the evidence-gate blocker.
4. Write your result, posted URL if any, and commands/evidence checked to `docs/exchange/SLOP-CLAUDE-18777-SUBMITTER-RESULT-2026-08-12.md`.

Do not post stale lint findings from earlier runs unless they still reproduce on the latest head and affect changed files.
