# Codex local CI/static review draft - elizaOS/eliza PR #18777

Time: 2026-08-12T21:35Z; refreshed 2026-08-12T21:52Z  
PR: https://github.com/elizaOS/eliza/pull/18777  
Issue: https://github.com/elizaOS/eliza/issues/18747  
Head checked: `7f8dcbd743b6980e9b92c4dee4cd3382b329d933`  
Base checked: `97fe1ca832829f35b0b40307acefdc83505442f1`  
Mode: local read-only CI/static review. No GitHub post, no checkout, no untrusted code execution.

## Live Status

- State: open, non-draft, mergeable.
- Author: `lalalune`.
- Reviews: none at check time.
- `check-pr-evidence`: **passing after PR body update**.
- `gitleaks`: passing on the latest run.
- Current red checks: Quality, Tests (scripts), lint. Logs were not yet downloadable because the runs were still in progress when refreshed.

## Resolved Finding

### 1. Evidence head was stale after the latest push, now fixed

The original local review saw current PR head `7f8dcbd743b6980e9b92c4dee4cd3382b329d933` while the PR body still contained:

```text
<!-- evidence-head:95fc3de1543786e28cc9baf9b45426d3aba747e4 -->
```

The latest `check-pr-evidence` job failed with:

```text
[FAIL] Evidence head SHA (evidence-head): head-mismatch - evidence-head marker must match the current PR head SHA
```

Fresh live check at 2026-08-12T21:52Z shows the PR body now contains `<!-- evidence-head:7f8dcbd743b6980e9b92c4dee4cd3382b329d933 -->` and `check-pr-evidence` passes. Do **not** post the old evidence-head finding.

## Static Review Note

### 2. Potential duplicate typed `present` transition on refresh

The PR moves `dispatchStewardSessionChange("present")` into the canonical shared `writeStoredStewardToken()` helper. The existing refresh path in `packages/ui/src/cloud/shell/StewardProviderRuntime.tsx` still does:

```text
writeStoredStewardToken(body.token);
...
dispatchStewardSessionChange("present");
```

That path is not part of the PR diff, so it looks unchanged at this head. After #18777, a successful refresh with a token would emit two typed `present` transitions: one from the shared storage helper and one from the manual dispatch. The notification store's current `present` handler appears mostly idempotent when the authority key is unchanged, so this may be non-blocking, but it contradicts the PR's "typed transitions at the canonical token-mutation boundary" model and increments the session epoch twice for one token write.

Suggested check before posting publicly: inspect exact PR head and, if still present, remove the manual `dispatchStewardSessionChange("present")` after `writeStoredStewardToken(body.token)` while keeping the legacy `steward-token-sync` dispatch.

## Stale CI Note

An earlier lint failure on the prior head was in `packages/shared/src/utils/trajectory-format.test.ts`, which was not in the #18777 diff. Current local develop has the same formatting shape, so that older failure looked like base-branch Biome drift rather than a #18777 code issue. The PR has since pushed a new run, so do not use that old lint result as a review finding unless it reappears on the latest head and still affects changed files.

## Draft Review Body

The old evidence-head draft is stale and must not be posted. Current useful public review needs either:

- a real blocker from the current Quality / Tests (scripts) / lint logs after they become downloadable; or
- the duplicate typed `present` transition note below, but only after exact-head second-read confirms it remains present and material.

Possible static note, only if still true on exact head:

> This PR moves typed `present` dispatch into `writeStoredStewardToken()`, but `StewardProviderRuntime.tsx` still manually dispatches `present` immediately after `writeStoredStewardToken(body.token)` on refresh. If that line is still present on the latest head, a refresh emits two typed `present` transitions for one storage write. It is probably mostly idempotent today, but removing the manual typed dispatch would keep the new canonical-boundary invariant clean while preserving the legacy `steward-token-sync` event.
