# Pilot log (honest — no fake receipts)

**Rule:** Only log what actually happened. `realRoles` / delivered receipts stay 0 until a human-delivered intro exists.

## How to log
```bash
# Dry report
node demigod-pilot-logger.mjs --report

# Log a real pilot AFTER white-glove delivery (example)
node demigod-pilot-logger.mjs \
  --founder="First name only or company code" \
  --brief="Role + 90-day outcome one line" \
  --intros=3 \
  --outcome="pending|intro made|declined|hired" \
  --source="linkedin-dm|email|inbound" \
  --no-publish   # add publish only when board CDN should update
```

## Phase note (2026-07-15)
Website-first: **no auto-DM / Twitter blast**. Pilots come from inbound site (WIZ) + warm human outreach only. Site status page: `/?p=status`.

## Active pipeline (fill by hand)
| ID | Founder/co | Role | 90d outcome | Status | Next action | Date |
|----|------------|------|-------------|--------|-------------|------|
| P0 | — | — | — | waiting first brief | inbound WIZ + human warm only | 2026-07-15 |

## White-glove checklist (first real brief)
1. [ ] Brief received (email or form) with 90-day outcome
2. [ ] Human review same day (no SLA promise in outbound copy)
3. [ ] 3–5 curated candidates only if strong fit
4. [ ] Mutual yes before intro email
5. [ ] Log pilot with honest outcome
6. [ ] Only then consider proof snippet for DMs

## Do not
- Fake logos, fake testimonials, invented intros
- Promise 24h/48h response
- Claim Stripe/SMS live before wired

## Warm inbound (not a pilot yet)
| Who | Channel | Status | Next | Date |
|-----|---------|--------|------|------|
| Douglas Green (Alpha High / 1517) | email + Calendly | **call Tue 2026-07-14 13:30 PT** Meet | prep: `demigod-ops/DOUGLAS-GREEN-PREP-2026-07-14.md` · prep email **SENT** 2026-07-09 from potter@trydemigod.com (thread 1517) | 2026-07-09 |
| Webflow forms Acme/Alex | form | **test noise only** | ignore | 2026-06-30..07-04 |
| hello@trydemigod.com | inbox | 0 threads (14d) | forms land on personal Gmail | 2026-07-09 |

Reply check: `node demigod-reply-check.mjs --file=/tmp/demigod-gmail-inbound.json`

**Douglas call pack:** `demigod-ops/DOUGLAS-CALL-PACK-2026-07-14.md`
