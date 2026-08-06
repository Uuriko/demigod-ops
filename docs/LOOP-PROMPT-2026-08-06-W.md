# Loop iteration W — find the blast radius of yesterday's fix, then use it

## State

```
truth      disk v1030 · live v1019 · lagDebt · needs current-request publish auth
snapshot   daily timer live, restore-proven (39/39 identical)
export     unblocked — --top 400 works, 12 researched rows, 100 partner leads
blocked    B1 gh auth · B3 tokens · B4 pricing · B5 publish · B6 thermal paste
```

## Why this, now

I reported the export fix as "1 lead becomes 100." That is an operator metric. The
user's standing goal is trydemigod.com — the website. I have not established
whether the defect touched anything a visitor sees, and I should not let a number
that sounds like a win stand in for one.

There are two honest possibilities and I do not currently know which is true:

- The bug was confined to the RecruitAI export and the partner lead sourcer, both
  internal tools. Then the fix is real but invisible, and I should say so plainly
  rather than let "1 → 100" imply the site got better.
- The same export feeds part of the public pipeline — `demigod-directory-refresh`
  runs HN → map+jobs → role-ledger → Pulse → static — in which case the live
  directory has been starved for as long as the export has been throwing, and
  that is a user-visible defect that has been live for days.

The second would be considerably more important than anything else queued. Find
out which, before building anything on top.

## Task 1 — trace the fix forward, do not assume its reach

Establish, by reading the code and running it, whether the export artifact reaches
any published surface:

1. What consumes `/tmp/dg-busy/recruitai-export/latest.json`? Grep for the path
   and for `assertExportValid` / `buildExport` importers. `demigod-lead-sourcer`
   and `demigod-funnel-selftest` are known; find the rest.
2. Does `demigod-directory-refresh` or `demigod-directory-static` read the export,
   or does the public directory come only from the roles feed and the map? Read
   the actual chain rather than the CLAUDE.md summary of it.
3. Does `demigod-hiring-pulse` or the Pulse surface touch it?
4. If any published surface consumes it, determine what the visitor saw during the
   outage: fewer companies, stale data, or an empty section.

State the answer as a fact with the evidence, in one line: either "export feeds no
published surface — the fix is operator-only," or "the live directory was starved,
here is the count."

## Task 2 — if it is operator-only, correct my own framing

Then the honest report is that the pipeline is unblocked and nothing the visitor
sees has changed yet. Say it directly, in the report, without softening.

And then make it worth something: the aging-startup target store holds 17
companies because that is all the old 40-row ceiling could yield. Re-run the
sourcing chain end to end and fold the newly reachable companies into
`DEMIGOD-TARGETS.json` via the existing `targets` command.

Requirements, all inherited and none negotiable:

- The store holds judgement plus the ledger's own observations. **No map columns
  persisted** — the display join from iteration R stays a display join.
- Every new company enters as `observed`. Nothing in this path may set any other
  state; no outbound has happened and the tool must not be able to claim one did.
- Human state and notes on the 17 existing companies must survive the merge. That
  is the property the store exists for. Verify it explicitly after the run, do not
  trust the merge because a test covers it.
- Provenance rides along. No invented descriptions, no estimated team sizes.
- No contact data. No person, no email.

## Task 3 — if it DID reach the site, that becomes the iteration

Drop everything else. Establish how long the surface was degraded, what the
visitor saw, and whether the current disk build already fixes it. Do not publish —
report the delta and what the fix restores, and say plainly that shipping it needs
authorisation in the user's current message.

## Task 4 — re-verify what I have been leaning on

Another worker has been editing ~100 source files all session, and iteration S
found one of my guards had rotted from someone else's unrelated change.

Re-run the seven guards and the export/lead suites. Any red gets re-run in
isolation before it is attributed to anyone. A guard that has gone stale again is
a finding worth more than the feature work below it.

## Constraints

- Data and ops plane only unless Task 3 fires. No foot-core, no head, no CSS.
- No publishing, no outbound, no drafts, no money.
- Read all command output. Never redirect a command a later step depends on —
  that error has now occurred three times in this project.
- Test before claiming. Both corrections this week came from repeating a written
  conclusion instead of running the command that would falsify it.
