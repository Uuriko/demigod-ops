# Loop iteration AG — does the retention evidence actually exist?

## State

```
open      [D1] pricing, now with numbers · fee BASE ambiguity flagged
claimed   "if retention evidence exists in that data, 'we can show retention' is
          a different product from '10%'" — I wrote that and did not check
flow      submitted → reviewed → matched → introduced → piloted → receipted →
          invoiced(10% on hire) → paid
```

## Why this, now

Yesterday's pricing brief ended by pointing at the strongest available position:
agencies are paid on placement, not retention, and that objection is
rate-independent. I wrote that Demigod could answer it "if retention evidence
exists in that data."

I did not look. That conditional is doing all the work in the sentence, and the
user could reasonably read it as a suggestion that the evidence is probably there.
This session has repeatedly shown that my written conditionals harden into assumed
facts a few iterations later — Firecrawl, the backup timer, the 40-row export
ceiling. Check it now, while it is still labelled as unverified.

The answer matters beyond pricing. The whole funnel state — how many real pairs
exist, how far any of them got — determines what the one-pager can honestly claim,
what the site can say, and whether "show retention" is a strategy available today
or one that needs data first.

## Task 1 — count the funnel, state by state, from the real store

Read `DEMIGOD-PAIRS.json` and `DEMIGOD-BOARD.json` and count how many pairs sit at
each state in `MATCH_STATES`. Use the library (`demigod-pairs-lib.mjs`), not
hand-parsing, so the counts match what the product itself would report.

Critical: **separate real pairs from sample/seed pairs.** The pair record carries
`sample` and `createdSample` flags and the codebase has an entire honesty
apparatus around not counting seeds as real — `isSampleRole`/`isSampleCandidate`
delegate to `isSampleData`, and there is a "No roles[0] fallback" comment
explaining that ranking real candidates against a sample seed is a known harm. A
funnel count that includes seeds is worse than no count.

Report both numbers and label them unmistakably.

## Task 2 — answer the retention question directly

Retention evidence would mean: a hire that started, and then some later
observation that they were still there. Establish whether anything in the data
supports that:

- Has any pair reached `piloted`, `receipted`, `invoiced` or `paid`?
- Does any store record a start date, a guarantee window, or a later check-in?
- Is there a receipt with paid evidence — `invoiceStub` refuses to mint one
  without an evidence path, so a real paid receipt would be strong proof.

Then answer in one sentence, plainly: does retention evidence exist today, yes or
no. If no, say no. Do not soften it into "limited" or "early."

## Task 3 — if it does not exist, say what would produce it

This is where the answer has to be useful rather than discouraging. The user has
been explicit that plans, resources and funding are not visible to me, and that I
should never turn an observation into a verdict about what they can build.

So: state precisely what data a retention claim requires, what the system already
captures toward it, and what is missing. That is a specification, not a judgement.
If the events flow already has the right states and simply has not been exercised,
say that — "the schema supports it and no pair has reached that state yet" is a
completely different situation from "the system cannot record it," and the
difference is the useful part.

## Task 4 — check what the site currently claims against what the data supports

The live site is the promise. If any live claim implies outcomes the funnel cannot
evidence, that is the most damaging class of defect for this product, because the
entire positioning is that its claims are backed.

`demigod-live-honesty-audit` covers banned phrases; it does not cross-check claims
against funnel state. Do that manually for anything outcome-shaped: fill rates,
placements, success language, testimonial-shaped copy.

If the site is clean, say so plainly — the honesty gates existing and working is a
real result.

## Constraints

- Read-only on all stores. No writes to pairs, board, or inbox.
- **No PII in any output.** The inbox holds real submissions; counts and states
  only, no names, no emails, no company-identifying detail beyond what is already
  public.
- No foot-core, no head, no CSS. No publishing, no outbound, no money.
- Verify with the library, not by grepping JSON.
- No verdicts about what the business can or cannot do. Facts and requirements.
