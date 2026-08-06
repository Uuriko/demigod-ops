# Loop iteration AF — turn the open pricing question into a decision with numbers

## State

```
suite     574 · 571 pass · 3 reds, all gated on the other worker's redesign
open      [D1] pricing — 10% vs Paraform 20-25% vs Dover $2-7k flat.
          ENGAGEMENT-ONE-PAGER-DRAFT.md still has a BLANK rate. Days old.
found     demigod-pricing-fragment.mjs derives the fee table from feeCents in
          demigod-revenue.mjs, so a displayed fee cannot drift from the charged one
research  competitor numbers gathered this session, with sources
```

## Why this, now

Nearly everything left is waiting on the user: publish authorization, the ADS
disclosure call, the directory-SVG constraint, the forms work behind a held
foot-core. Pricing is the one blocked item I can materially move without deciding
it, because what makes it hard is not the choice — it is that nobody has put the
actual dollar consequences side by side.

The one-pager has had a blank rate for days. A blank is not neutral: it blocks
every downstream artifact that quotes a rate, and it means any outreach draft is
unfinishable.

Two things exist now that did not before:

1. Current competitor pricing with sources — Paraform 20–25% contingency,
   market band 15–30%, Dover $2,000–$7,000 flat per hire, Juicebox $119–$199 per
   seat tooling.
2. `demigod-pricing-fragment.mjs`, which computes displayed fees from `feeCents`
   in `demigod-revenue.mjs`. Any number I publish should come from that code, not
   from arithmetic I do in my head — a fee quoted in a doc that disagrees with the
   fee the code charges is exactly the drift that module exists to prevent.

## Task 1 — read the real fee logic first, do not assume the model

Before computing anything, establish from `demigod-revenue.mjs` and
`demigod-pricing-fragment.mjs`:

- What is the fee actually a percentage OF? First-year base salary? Total comp?
  Is equity excluded? The competitor comparison is meaningless if Paraform's 20%
  and Demigod's 10% are percentages of different bases.
- Is there a floor, a cap, a minimum, or a guarantee/clawback window?
- When is it invoiced — the events flow says `invoiced(10% on hire) -> paid`.
  Confirm whether that is on start date, on offer accept, or after a guarantee
  period, because that is a real difference to a startup's cash position.

If the code and the site copy disagree about any of this, that is a defect and it
outranks the analysis.

## Task 2 — compute the comparison from the code, not by hand

Use the real fee function over a realistic SF salary range. Do not invent salary
figures — derive the range from data already on disk if the role ledger or map
carries comp, and if it does not, say the range is illustrative and label it.

Produce, per salary point: Demigod at 10%, at 15%, at 20%; Paraform at 20% and
25%; Dover at $2k and $7k. Show the crossover — the salary at which a percentage
fee overtakes a flat fee — because that is the actual competitive boundary and
nobody has computed it.

Every number traceable: state which function produced it.

## Task 3 — frame the decision without making it

Lay out what each rate buys and costs, with the research attached:

- What 10% signals versus 20%: the market band is 15–30%, so 10% is not merely
  cheaper, it is *outside* the band, which reads as either a bargain or as
  inexperience depending on the buyer.
- The structural finding from the demand-side research: agencies are paid on
  placement, not retention, and that is the standing objection. A rate discussion
  that ignores it is incomplete.
- Volume math: in-house recruiting beats agency fees above ~15–20 hires/year, so
  the target segment is below that. What rate is coherent with that segment?

**Do not issue a verdict.** The user has been explicit that plans, resources and
funding are not visible to me. Give the analysis, the tradeoffs and the
requirements each option implies, and let them choose. Present options, not
recommendations dressed as facts.

## Task 4 — make the chosen rate cheap to apply

Whatever they pick, the one-pager, the site copy and the fee code must agree.
Identify every place a rate is stated so filling the blank is one pass, not a
hunt. List them with file and line.

Do not change any rate. The current rate is 10% and it is on the live site; the
analysis is for a decision that has not been made.

## Constraints

- No foot-core, no head, no CSS — held.
- No publishing, no outbound, no money movement, no drafts sent.
- Numbers come from the fee code. A hand-computed figure in a doc is the drift
  `demigod-pricing-fragment.mjs` exists to prevent.
- Read all command output.
