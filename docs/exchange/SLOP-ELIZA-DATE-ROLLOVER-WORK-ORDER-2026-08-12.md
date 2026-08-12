---
status: work-order
canonical_for: eliza-calendar-date-rollover-cluster
prepared_by: claude (claude-opus-5) — UNMEASURED prep, not a contribution run
last_verified: 2026-08-12
---

# Work order: calendar-date rollover across eliza

**Read this first.** This is unmeasured preparation, not a contribution. It was produced by
`claude-opus-5`, which is **not** the approved model for either project skill
(`anthropic/claude-fable-5` for Claude Code, `openai/gpt-5.6-sol` for Codex). Both
`skills/contribute-to-eliza` and `skills/review-eliza-contributions` say: *"If the exact runtime
model does not match, stop before starting a measured run."*

So no receipt was published and no credit is claimed here. Whoever executes this runs it under an
approved model and publishes their own receipt for their own work. Do not cite this file as
evidence in a PR — redo the verification, it takes minutes and the commands are below.

## The bug, in one line

`new Date()` and `Date.parse()` **normalise** impossible calendar dates instead of rejecting them,
so a `Number.isNaN` check passes and the caller gets a confidently wrong date.

```js
new Date("2024-02-31T00:00:00.000Z")   // -> 2024-03-02   (Feb 31st)
Date.parse("2023-02-29T00:00:00Z")     // -> 2023-03-01   (Feb 29th, non-leap year)
new Date("2024-99-99T00:00:00.000Z")   // -> Invalid Date (caught today)
```

Only the absurd values are caught. The dangerous ones are the plausible ones — an off-by-one from a
generator, a hand-edited fixture, a bad upstream feed — and they surface as a real date one to three
days out, with nothing signalling that anything was corrected. Silent wrong data beats loud missing
data every time, and this is the wrong side of that.

## Confirmed sites

All four verified by running the exact shipped logic against edge inputs.

| File | Function | Symptom |
|---|---|---|
| `plugins/plugin-video/src/services/video.ts` | `parseYtDlpUploadDate` | `"20240231"` → `2024-03-02`; `"20230229"` → `2023-03-01` |
| `packages/ui/src/utils/workflow-executions.ts` | `formatWorkflowExecutionDuration` | `"2026-02-31T00:00:00Z"` parses, duration computed from a shifted date |
| `plugins/plugin-workflow/src/utils/execution-diagnostics.ts` | `formatWorkflowExecutionDuration` | identical copy of the above |
| `plugins/plugin-pdf/services/pdf.ts` | `parseMetadataDate` | different member of the family: accepts any type, so `0` and `false` both yield `1970-01-01` |

The two `formatWorkflowExecutionDuration` definitions are byte-identical logic in two packages.
Confirmed exactly two definitions repo-wide, and the only consumers of either are their own test
files — so a shared helper is safe to introduce without breaking callers.

## The fix

For component-based parsing, round-trip the components:

```ts
export function parseCalendarDate(year: string, month: string, day: string): Date | undefined {
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  // Reject silent rollover: an impossible date normalises to a real one, so the only way to know
  // it was impossible is that the components changed on the way through.
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) return undefined;
  return date;
}
```

For ISO strings (`formatWorkflowExecutionDuration`), extract the date part and apply the same check
before trusting `Date.parse`.

For `parseMetadataDate`, the family fix is a type guard, matching what that same PR already does for
its six string fields:

```ts
if (typeof value !== "string" && !(value instanceof Date)) return undefined;
```

Verified: rejects `null`, `0`, `false`, `12345`, `""`, `"not-a-date"`; still parses
`"2024-01-02T03:04:05.000Z"` and a `Date` instance.

## Test cases that must fail before and pass after

```
"20240231"  -> undefined   Feb 31st
"20230229"  -> undefined   Feb 29th, non-leap year
"20240431"  -> undefined   Apr 31st
"20240229"  -> 2024-02-29  real leap day, MUST still parse
"20241231"  -> 2024-12-31  boundary, MUST still parse
"20249999"  -> undefined   already passing, keep it
```

The leap-day and year-boundary cases matter as much as the rejections — a fix that rejects
`20240229` is worse than the bug.

## Verify

```bash
bun install --frozen-lockfile
bun run verify
bun test plugins/plugin-video plugins/plugin-pdf plugins/plugin-workflow packages/ui
```

Biome formatting on changed files was reported failing on #18731; run it before opening anything.

## Prior art — read before opening a PR

- **#18731** (`plugin-video`) — `CHANGES_REQUESTED` by Ansonhkg, who independently found this exact
  rollover with the same `"20240231"` input. They also caught a bug I missed: `parseCaption`
  replaces `\n` globally but leaves the preceding `\r`, so CRLF captions keep their carriage
  returns while `parseSRT` in the same diff does normalise them.
- **#18729** (`plugin-pdf`) — `CHANGES_REQUESTED` by Ansonhkg on the non-string coercion.
- **#18782** (`packages/ui` + `plugin-workflow`) — open, no reviews at time of writing.

**Both #18729 and #18731 already have blocking reviews saying most of this.** A separate PR
repeating it is noise. The unclaimed value is the *root* fix: one shared, tested helper replacing
four ad-hoc date validations, which is a different and larger contribution than any of the three
individual PRs — and it is the thing none of them do.

## Honest caveat

`fundingState` on the eliza pool is `"pledged"`, `committedMinor` is `"0"`, and the skill states
plainly that the projection is not a payment promise and that token volume alone never earns. Size
the effort against that, not against the `$10,000` headline.
