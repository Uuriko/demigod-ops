# DEM-01 — Demand / outreach batch

**Owner:** Human (sends) · agents draft only · **When:** before each DM/email batch

## Ready
- [ ] Target list named (no invented “interested founders”)
- [ ] Template checked: no 48h/SLA; 10% on hire; mutual yes; pending Stripe/SMS if relevant
- [ ] Site link: `https://www.trydemigod.com/?wiz=startup` (or honest product URL)
- [ ] Permission basis OK (warm intro, prior relationship, public hiring signal)

## Execute (human)
- [ ] Send from authorized human account only
- [ ] Mark sent: `node demigod-dm-mark-sent.mjs --name=NAME` (or ledger row)
- [ ] Log channel + date + variant in `demigod-ops/demand/outreach-ledger.csv` (or SEND tracker)

## Done
- [ ] Every send has target, channel, date, status
- [ ] No unsent item counted as sent
- [ ] Replies route to white-glove playbook — not auto-board mint

**Never:** agent auto-DM · fake reply rates · promising response clocks  
**Related:** `docs/gtm/DM-PACK-TOP.md` · `demigod-ops/SEND-QUEUE-PRIORITIZED.md`
