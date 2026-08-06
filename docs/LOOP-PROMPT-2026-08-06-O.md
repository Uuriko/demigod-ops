# Loop iteration O — persist the target list

## State

```
truth    disk v1023 · live v1019 · +4 ver · 0.4h · prepareOnly · lagTracked
lock     HELD — owner "potter", why "FAQ visible match 17 schema questions"
suite    548/549 (registry consolidation red is another agent's in-flight work)
```

Note on the lock: it reads owner `potter`, which is *not* my claim — I released
mine at the end of iteration M. Other agents run as the same unix user, so the
owner field does not disambiguate between workers. The `why` string is the only
reliable signal, and it names FAQ schema work. Foot-core stays off-limits.

## The gap

Iteration J identified it and I never filled it, because I went down the
lead-sourcer path instead and hit the export cap. Iteration K then concluded the
ledger path is the usable one:

`demigod-role-ledger.mjs report --posted --startups` produces the best target list
Demigod has — **150 aging roles across 17 companies**, filtered to companies that
could plausibly hire through a solo operator. Hightouch (40 roles, oldest 350d),
Alpaca (22), SingleStore (19), Gigs (13), Daybreak Health (13), and twelve more.

It is **console output**. Run it, read it, close the terminal, it is gone. Nothing
records which companies have been looked at, which were ruled out, or why.
Re-deriving the same 17 names every morning with no memory of yesterday is how a
target list decays into noise.

Verified: no `DEMIGOD-TARGETS*` or `DEMIGOD-OUTREACH*` file exists, and nothing in
the tree consumes `agingRoles` for persistence.

## Task 1 — Ponytail check first, for the fifth time this session

Four consecutive iterations found the tool already existed. Before writing
anything, establish:

1. Does `--json` on the report already give a durable artifact someone could
   redirect, making a new store unnecessary? If a plain redirect suffices, the
   honest answer may be a documented one-liner rather than code.
2. Does `DEMIGOD-LEADS.json` have a shape that fits an *observed, not contacted*
   company? Read `demigod-lead-collect.mjs` for how partner rows are minted.
   Reusing the CRM beats a parallel store — but only if a row can exist there
   without implying a contact or a relationship.
3. Is there an existing receipts convention under `/tmp/dg-busy/` that this
   should follow rather than inventing a new file location?

**If reuse is clean, use it. If a new artifact is genuinely needed, keep it
minimal.**

## Task 2 — the honesty requirements are fixed regardless of mechanism

- **Never invents a contact.** The ledger has company, role title, URL, and dates.
  It has no email and no person. A row must not imply one exists.
- **Never marks a company as approached.** No outbound has happened. State is
  `observed` unless a human records otherwise, and the tool must not be able to
  set anything else on its own.
- **Carries provenance on every row.** Company's own public ATS board, plus
  Demigod's first-observed date. Both, so a later reader can separate what was
  measured from what was claimed.
- **Is not the board.** `DEMIGOD-BOARD.json` feeds the live site and is honesty-
  gated. This is private working state and must not touch it.
- **Stays out of git.** Anything derived from lead/company working state inherits
  the PII posture. Add it to `.gitignore` in the same change, and verify with
  `demigod-verify-no-committable-sor.mjs`.

## Task 3 — make it re-runnable without losing human judgement

The point of persistence is memory across days. So a second run must not clobber a
human's notes. Minimum viable behaviour:

- New companies appearing in the ledger are added.
- Companies already present keep whatever state a human set.
- Companies that drop out of the ledger are **not deleted** — they are marked as
  no longer aging, with the date. A company disappearing from the list is
  information, not an absence.

Prove the merge with a test: seed a store with a human-set state, re-run, assert
the human value survived and a new company was added.

## Task 4 — verification

- `node demigod-role-ledger.mjs --selftest`
- New test proven non-vacuous — break the merge and watch it fail.
- Full suite must stay at 548/549; the registry red is expected.
- `node demigod-verify-no-committable-sor.mjs` — non-negotiable, this touches
  company working data.

## Constraints

- **No outbound.** Not a draft, not a queue, nothing that could be sent.
  `CLAUDE.md` requires exact authorization in the current request; there is none.
  Building the list is in scope; moving it toward a founder is not.
- No foot-core. Lock held by another worker.
- No publishing. Disk is +4 versions ahead of live and that is fine —
  `lagTracked`, not debt.
- Read all command output. Do not redirect anything whose success the next step
  depends on.
