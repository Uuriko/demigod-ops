# Codex Sol measured verification result - PR #18786

Time: 2026-08-12T22:16Z  
Target: https://github.com/elizaOS/eliza/pull/18786  
Canonical repo: `/home/potter/src/eliza-canonical-codex-sol`  
Target head verified: `18f62861ccf741a7758ee2ec809a311f05f7977b`

## Result

Codex Sol independently verified the `formatTime(agent.createdAt)` blocker:

```text
packages/ui/src/cloud/instances/AgentDetailPage.tsx:48-53,258-263 — An invalid non-null `createdAt` now renders `—` for the date, but `formatTime()` still renders literal `Invalid Date` beneath it. Please apply the same finite-timestamp guard there, returning `""`, and cover it in the malformed-date test.
```

No GitHub post was made from this run. A `Uuriko` CHANGES_REQUESTED review with the same blocker was already live on #18786 at `2026-08-12T22:12:43Z`, before Codex reached the post step. Duplicating it would add noise.

## Receipt

Run id: `run_01KZW0EMF1AJ1N1W32GVC50W74`  
Model: `openai/gpt-5.6-sol`  
Usage: `732713` project-attributed tokens, `bounded`

The receipt was finished locally to close active state. Its footer was **not** posted publicly because this run did not carry a new public contribution.

## Operational Lessons

- `CODEX_ASK_MODEL=gpt-5.6-sol` works for approved-model stateless Codex workers.
- The active `contribute-to-eliza` symlink path does not invoke `run-receipt.mjs`'s CLI main; use the canonical versioned path.
- Receipt preflight requires repository `origin=elizaOS/eliza`; use `/home/potter/src/eliza-canonical-codex-sol`, not the Uuriko fork-origin checkout.
