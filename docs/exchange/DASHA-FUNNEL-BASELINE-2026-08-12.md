# Studio funnel baseline

Captured: baseline-20260812T143147Z.json
Public: https://lobby.getdasha.com/studio/metrics/public

## Headline ratios (threshold-suppressed nulls possible)
- openToEdit: 0.293  (firstEdits/opens — target: rise after cold-open invite)
- editToShareIntent: 0.459
- intentToShareSuccess: 1
- editToExport: 0.062
- mintToOpen: 1

## Counts
- opens: 498
- firstEdits: 146
- shareIntents: 67
- shareApiResolutions: 67
- exports: 9
- handoffMints: 31
- handoffOpens: 31

## How to re-check
```bash
node dasha-funnel-delta.mjs
```
Compare openToEdit and editToShareIntent to this baseline after ~1–2 days of traffic.
