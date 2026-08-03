> Prefer **OPS.md** for daily use. This file is optional detail (BOARD-PUBLISH-CHECKLIST.md).

# BRD-01 — Board publish

**Owner:** Board steward · **When:** any board JSON mutation intended for public CDN

## Before
- [ ] Sample vs real classification correct
- [ ] ≤3 seed samples; realRoles/realReceipts receipt-backed
- [ ] `node demigod-verify-board-honesty.mjs` PASS
- [ ] Freeze OFF if publish path mutates live
- [ ] No inventing intros as receipts

## Publish
- [ ] Board publish tool / CDN path per current ops
- [ ] Audit line in `DEMIGOD-BOARD-AUDIT.jsonl`

## After
- [ ] Live board fetch shows samples labeled
- [ ] Compressed state if public claim changed

**Related:** `npm run demigod:board:publish` (honesty-gated)
