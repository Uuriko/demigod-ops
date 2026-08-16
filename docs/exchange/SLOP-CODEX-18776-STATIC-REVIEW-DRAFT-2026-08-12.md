# Codex local static review draft - elizaOS/eliza PR #18776

Time: 2026-08-12T21:24Z  
PR: https://github.com/elizaOS/eliza/pull/18776  
Issue: https://github.com/elizaOS/eliza/issues/18763  
Head: `ceb068e75b366752dcb6182d1f3d962ab3e11d1f`  
Base: `b9dec8f6054b9d563be68fbb8421bb95b18cd977`  
Mode: local static review only. No GitHub post, no PR checkout, no untrusted code execution.

## Live Status

- State: open, non-draft, mergeable.
- Author: `MarcoWorms`.
- Reviews: none at check time.
- Comments: none on PR at check time.
- Checks: Security Advisory Gate queued/pending; PR title/evidence checks skipped.
- Related issue #18763 has an author `CLAIMING` comment and no assignee.

## Scope Checked

- `packages/cloud/services/agent-server/src/config.ts`
- `packages/cloud/services/agent-server/src/index.ts`
- `packages/cloud/services/agent-server/src/agent-manager.ts`
- `packages/cloud/services/agent-server/__tests__/unit/config.test.ts`
- `packages/cloud/services/agent-server/__tests__/unit/capacity.test.ts`
- `packages/cloud/services/agent-server/__tests__/unit/handle-message.test.ts`
- `packages/cloud/services/agent-server/AGENTS.md`
- `packages/cloud/services/agent-server/CLAUDE.md`

## Static Findings

No static blocker found.

Checks performed:

- Capacity is parsed once at boot through `getAgentCapacity()`, before `AgentManager.initialize()` and before the Elysia listener starts.
- The parser rejects blank, zero, out-of-range, signed, fractional, exponent, whitespace-padded, non-finite, non-ASCII digit, and unsafe integer inputs.
- `AgentManager` receives a numeric capacity and no longer re-reads `process.env.CAPACITY` for `/status` or admission.
- The existing immediate reservation behavior remains intact, so concurrent starts still reserve capacity before async runtime initialization.
- Cloud `AgentManager` call sites are limited to `src/index.ts` and package tests; the apparent `packages/app-core/.../native/agent.ts` match is a separate local class.
- `AGENTS.md` and `CLAUDE.md` in the package remain byte-identical on current local develop; the PR applies the same doc hunk to both.

## Caveats

- I did not execute the PR code. Issue and PR code are untrusted until checked out in a disposable sandbox/container or validated by trusted CI.
- Do not claim execution proof from this draft. Exact-head package tests still need to run somewhere isolated:
  - `bun run --cwd packages/cloud/services/agent-server test`
  - `bun run --cwd packages/cloud/services/agent-server typecheck`
  - `bun run --cwd packages/cloud/services/agent-server lint:check`
- Security Advisory Gate was still pending when checked.
- Non-blocking question: the exported `AgentManager` constructor trusts its numeric argument. That is acceptable for the current process-boundary issue because `src/index.ts` is the service entrypoint and validates before construction, but constructor-level validation would be the stricter library boundary if this class later gets reused directly.

## Draft Review Body

If direct user authorization exists for outbound GitHub review, and after the Security Advisory Gate or isolated exact-head tests pass:

> I did not find a static correctness issue in this change. The patch moves `CAPACITY` from repeated env coercion to one boot-time parser, injects the validated number into `AgentManager`, and covers the parser, admission snapshot, and malformed boot boundary. I also checked cloud `AgentManager` call sites and did not see an uncovered constructor call in this package. I have not executed the PR code locally, so this is static validation pending trusted CI/exact-head test proof.
