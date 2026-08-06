# Loop iteration J — make the 17-company target list durable

## State

```
lock     HELD by codex-faq-schema-dedupe (3rd consecutive iteration) → no foot-core
suite    537/539 — the 2 reds are another agent's dashboard-clean-ui work,
         verified by stashing my change and reproducing them identically
```

## What the last iteration actually produced

`demigod-role-ledger report --posted --startups` now yields **150 aging roles
across 17 distinct companies**. That is the target list the third debate argued
for — founders whose roles have sat long enough to hurt, filtered to companies
that could plausibly hire through Demigod.

| roles | oldest | company |
| ---: | ---: | :--- |
| 40 | 350d | Hightouch |
| 22 | 240d | Alpaca |
| 19 | 202d | SingleStore |
| 13 | 321d | Gigs |
| 13 | 293d | Daybreak Health |
| 7 | 174d | Mattermost |
| 5 | 314d | General Proximity |
| … | … | 10 more, 1–5 roles each |

`agencyPolicyEvidence` is `None` for all 150 rows — the field exists but is
unpopulated here, so it cannot be used to screen out companies whose boards refuse
agencies. Record that; do not pretend the screen exists.

## The problem with the list as it stands

It is **console output**. Run the command, get 150 lines, close the terminal, the
list is gone. A solo operator working 17 companies over days needs to know which
ones have already been looked at, which were ruled out and why. Re-deriving the
same list every morning with no memory of yesterday is how a target list becomes
noise.

## Task 1 — check what already tracks this, before building anything

Ponytail rung 2, and it has paid off twice in a row this session (the aging report
already existed; `startupScore` already existed). Establish, from the code:

1. `DEMIGOD-LEADS.json` — what is its schema? It has `partners` (112 rows) and
   `talent`. Is a company-with-aging-roles a `partner` in that model, or something
   else? Read `demigod-lead-collect.mjs` for how rows are minted and what fields
   are required.
2. Does anything already join role-ledger output to the leads store? Search for
   imports of `demigod-role-ledger` across the tree.
3. `demigod-recruitai-export.mjs` is registered as "Map+role-ledger → export" —
   read it. It may already do most of this.

**If a path exists, use it.** If it exists but does not cover aging-startup
targets, extend it. Only if nothing exists should anything new be written.

## Task 2 — persist the target list, honestly

Whatever the mechanism, the requirements are fixed:

- **Never invents a contact.** The ledger has company, role, URL, dates. It has no
  email and no person. A target row must not imply one exists.
- **Never marks a company as approached.** That is an outbound fact, and no
  outbound has happened. State is `observed` until a human records otherwise.
- **Carries provenance.** Every row is derived from the company's own public ATS
  board plus Demigod's first-observed date. Both must be on the row, so a later
  reader can tell what is measured versus claimed.
- **Is not the board.** `DEMIGOD-BOARD.json` feeds the live site and is honesty-
  gated. A target list is private working state and must not touch it.
- **Stays out of git.** The leads store is gitignored for PII reasons; anything
  derived from it inherits that. Verify with `demigod-verify-no-committable-sor.mjs`
  after.

## Task 3 — verify

- `node demigod-role-ledger.mjs --selftest`
- Full suite — must not regress past the 2 known non-mine failures. If the count
  changes, stash and re-check before blaming or absolving myself.
- `npm run demigod:verify:source`
- `node demigod-verify-no-committable-sor.mjs` — the PII guard, non-negotiable
  here since this touches lead data.

## Constraints

- **No outbound.** Not a draft, not a queued message, nothing that could be sent.
  `CLAUDE.md` requires exact authorization in the current request and there is
  none. Building the list is in scope; anything that moves it toward a founder is
  not.
- No foot-core. Lock held.
- No publishing.
- Scope the commit explicitly.
- If Task 1 finds this is already fully handled, **say so and stop.** Two of the
  last three iterations found the tool already existed; a third would be a
  finding, not a failure.
