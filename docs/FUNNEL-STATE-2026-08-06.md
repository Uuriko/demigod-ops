# Funnel state — what the data can and cannot evidence today

Answering a conditional I wrote into the pricing brief and did not check:
*"if retention evidence exists in that data."*

## The answer

**No. Retention evidence does not exist today.** Not limited, not early — none.

## What is actually in the stores

| Store | Contents |
|---|---|
| `DEMIGOD-PAIRS.json` | **file does not exist** — gitignored, never committed, and absent from today's snapshot |
| `DEMIGOD-BOARD.json` | 3 roles, 2 candidates — **all five carry `sample: true`** |
| `DEMIGOD-SUBMISSIONS-INBOX.json` | `items: 0` |

Zero real pairs. Zero real submissions. Every board record is a seed. No pair has
reached `piloted`, `receipted`, `invoiced` or `paid`, because no pair exists.

Counted through `demigod-pairs-lib.mjs` rather than by parsing JSON, so the numbers
are what the product itself would report, and real records are separated from
seeds using the `sample`/`createdSample` flags the codebase already uses for
exactly this distinction.

## The distinction that matters

**The system can record this; nothing has reached those states yet.** Those are
very different situations and only the second one is true here.

The machinery is built and gated:

- `MATCH_STATES` runs submitted → reviewed → matched → introduced → piloted →
  receipted → invoiced → paid. The states for a retention claim exist.
- `invoiceStub` refuses to mint a receipt without an evidence path — its own
  selftest asserts "stub without evidence fails". So a paid receipt, once one
  exists, is real proof rather than an assertion.
- `assertMutualConsentReceipts` and the sample-data guards mean a seed cannot be
  promoted into a real outcome by accident.

So a retention claim needs data the pipeline is already shaped to capture. What is
missing is throughput, not schema.

## What a retention claim would require

1. At least one pair reaching `paid` with a real invoice receipt.
2. A start date recorded for that hire.
3. A later observation that the person is still there — the events flow has no
   post-start check-in state today, so that is the one genuinely absent piece.

Item 3 is the only thing that needs building. Items 1 and 2 need a hire.

## What the live site claims

Checked the live home page against the empty funnel, because an unbacked outcome
claim is the most damaging possible defect for a product whose whole position is
that its claims are backed.

**The site is clean.** No placement counts, no fill rates, no success rates, no
testimonials, no "trusted by". What it does claim is process and price:

> Software compares the facts, a human decides what to propose, and both sides
> approve before an introduction.
> Talent pays nothing; startups pay 10% of first-year base salary only when a hire
> starts.

Both are true independent of funnel state. The banned-phrase list — `pre-vetted`,
`3–5 candidates`, `replacement guarantee`, `Human-Matched` — exists to prevent
exactly the claims an empty funnel could not support, and 14 routes are clean of
them.

One false positive in my own check: the scan flagged "10% PLACEMENT", which is the
fee label, not an outcome claim.

## Note on the 2026-08-02 wipe

`DEMIGOD-SUBMISSIONS-INBOX.json` was a documented casualty of that incident and is
listed in the recovery notes as holding PII. It exists again today with 0 items.
Whether it held real submissions before 08-02 cannot be established from the data
now on disk — it is gitignored and there was no backup at the time. This is a
statement of what is knowable, not a claim either way.
