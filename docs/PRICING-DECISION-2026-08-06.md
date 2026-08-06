# [D1] Pricing — the numbers, so the decision is a choice and not a research task

Every Demigod figure below comes from `feeCents()` in `demigod-revenue.mjs`, not
from arithmetic in this document. Competitor figures carry sources.

## First: the fee base does not agree with itself

| Source | States the fee is |
|---|---|
| Live site copy | 10% of first-year **base salary**, *excluding equity, discretionary bonus* |
| `demigod-revenue.mjs:19` | `FEE_RATE = 0.1; // product truth: 10% first-year cash only` |
| `demigod-pricing-fragment.mjs:34` | "exactly 10% of the hire's first-year **cash compensation**" |

Base salary and cash compensation are different numbers whenever a hire has a
bonus or commission. On a $180k base with a $20k bonus that is an $18,000 fee
versus a $20,000 fee. The live promise is the narrower one; the code and the
unpublished fragment use the broader word.

**This needs resolving before any rate is chosen**, because the rate and the base
multiply. Picking 15% while the base is ambiguous decides less than it looks.

## The comparison, computed from feeCents()

| First-year base | Demigod 10% | at 15% | at 20% | Paraform 20% | Paraform 25% | Dover flat |
|---|---|---|---|---|---|---|
| $140,000 | $14,000 | $21,000 | $28,000 | $28,000 | $35,000 | $2,000–$7,000 |
| $160,000 | $16,000 | $24,000 | $32,000 | $32,000 | $40,000 | $2,000–$7,000 |
| $180,000 | $18,000 | $27,000 | $36,000 | $36,000 | $45,000 | $2,000–$7,000 |
| $200,000 | $20,000 | $30,000 | $40,000 | $40,000 | $50,000 | $2,000–$7,000 |
| $225,000 | $22,500 | $33,750 | $45,000 | $45,000 | $56,250 | $2,000–$7,000 |
| $250,000 | $25,000 | $37,500 | $50,000 | $50,000 | $62,500 | $2,000–$7,000 |

Demigod at 20% equals Paraform at 20% exactly — the rate is the whole difference,
so at that rate the pitch has to be something other than price.

**Crossover against Dover's flat model:** Demigod's 10% passes $7,000 above a
$70,000 base. Every SF engineering hire is above that, so against a flat-fee
competitor Demigod is the expensive option at any percentage — 10% of $180k is
$18,000 against $2,000–$7,000. Price competition against flat fees is not
winnable; the argument there has to be outcome, not cost.

## What each rate implies

**10% (today).** The market band is 15–30%, so this is not merely cheaper, it is
*outside* the band. That reads as a bargain or as inexperience depending on the
buyer, and there is no way to control which. Requires: volume to be viable, and a
story for why it is cheap that is not "we are new."

**15%.** Bottom of the band, still half of Paraform's top. Requires: nothing new —
it is the least explanation-heavy position.

**20%.** Level with Paraform. Requires: a reason to choose Demigod that does not
mention price at all.

## The demand-side finding that outranks the rate

Agencies are paid on placement, not retention, so speed to close beats quality of
match. That is the standing structural objection to every agency, and it is
independent of rate — a cheaper agency has the same incentive problem.

Demigod already bills on hire and tracks pilots and receipts through the events
flow. If retention evidence exists in that data, it answers the objection directly,
and that is worth more than any rate position. Worth checking before the rate is
set, because "10% and we can show retention" is a different product from "10%."

Sources: [Paraform pricing](https://www.herohunt.ai/blog/paraform-pricing-alternatives-2026/) ·
[agency vs in-house cost](https://underdog.io/blog/recruitment-agency-costs) ·
[in-house threshold](https://www.recruitingfromscratch.com/blog/in-house-recruiter-vs-headhunter-startup)

## Applying whatever you pick

The rate is stated in code, copy and deliverables. `feeCents` is the single source
for the number itself and is locked at 0.10 — changing it requires an explicit
`DEMIGOD_FEE_RATE_UNLOCK=1`, which is a deliberate guard, not an obstacle. Filling
`ENGAGEMENT-ONE-PAGER-DRAFT.md`'s blank rate is one pass once the base question
above is settled.
