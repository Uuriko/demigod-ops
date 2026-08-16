# Codex local static review draft - elizaOS/eliza PR #18786

Time: 2026-08-12T21:56Z  
PR: https://github.com/elizaOS/eliza/pull/18786  
Head checked: `18f62861ccf741a7758ee2ec809a311f05f7977b`  
Base checked: `97fe1ca832829f35b0b40307acefdc83505442f1`  
Mode: local read-only static review. No checkout, no untrusted code execution, no GitHub post from Codex.

## Live Status

- State: open, non-draft, mergeable.
- Author: `Svector-anu`.
- Checks visible at review time: Security Advisory Gate pass; evidence/title jobs skipped.
- Files changed:
  - `packages/ui/src/cloud/instances/AgentDetailPage.tsx`
  - `packages/ui/src/cloud/instances/AgentDetailPage.test.tsx`

## Confirmed Finding

### 1. Malformed `createdAt` still renders `Invalid Date` in the Created time line

The PR fixes `formatDate()` and `formatRelativeShort()`, but leaves `formatTime()` unchanged:

```text
48 function formatTime(date: string | null): string {
49   if (!date) return "";
50   return new Date(date).toLocaleTimeString(undefined, {
```

The Created card renders both helpers for the same `agent.createdAt` value:

```text
259 {formatDate(agent.createdAt)}
262 {formatTime(agent.createdAt)}
```

So a malformed non-null `createdAt` now renders the fixed fallback `—` on the date line while the second line still renders the literal browser string `Invalid Date`. Local sanity check:

```text
node -e "console.log(new Date('not-a-date').toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}))"
Invalid Date
```

Consequence: the PR does not fully satisfy its stated scope for invalid created dates, and the new test misses the remaining rendered path because it imports only `formatDate` and `formatRelativeShort`.

Repair: give `formatTime()` the same finite timestamp guard and existing null fallback (`""`), then cover malformed `createdAt` through either an exported helper assertion or a rendered Created card regression.

## Draft Review Body

If an approved-model submitter independently verifies this exact head:

> This still leaves one malformed created-date path unfixed. `formatDate(agent.createdAt)` now returns `—`, but the Created card also renders `formatTime(agent.createdAt)`, and `formatTime()` still calls `new Date(date).toLocaleTimeString(...)` without a finite timestamp guard. For `createdAt: "not-a-date"`, the date line is fixed while the time line still renders the literal `Invalid Date`, so the page can still show the bug this PR is meant to remove. Please add the same finite guard to `formatTime()` using its existing empty-string fallback, and cover malformed `createdAt` in the regression test.
