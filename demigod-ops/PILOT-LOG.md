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

## Operating note (2026-07-15)
Website-first: **no auto-DM / Twitter blast**. Pilots come from inbound site (WIZ) + warm human outreach only. Site status page: `/?p=status`.

## Active pipeline
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
| Douglas Green (Alpha High / 1517) | email | Gmail re-check 2026-08-06: no Doug reply after Aug 5 re-engagement (potter@trydemigod.com Re: Meeting?) · last Doug mail 2026-07-14 · no hiring brief · warm ≠ pilot | wait for Doug reply · no chase · re-check after 2026-08-13 if silent · warm ≠ pilot | 2026-08-06 |
| Douglas Green (Alpha High / 1517) | email | resolved — superseded by 2026-08-06 Gmail re-check (draft was sent 2026-08-05 from potter@trydemigod.com) · warm ≠ pilot | no follow-up — superseded · see 2026-08-06 email row | 2026-08-05 |
| Douglas Green (Alpha High / 1517) | calendly | resolved — superseded 2026-08-04 by email-channel re-check (Jul 14 miss history retained in email row) | no follow-up — see email row + DOUGLAS-GMAIL-DRAFT.md | 2026-08-04 |
| Webflow forms Acme/Alex | form | **test noise only** | ignore | 2026-06-30..07-04 |
| hello@trydemigod.com | inbox | 0 threads (14d) | forms land on personal Gmail | 2026-07-09 |

Reply check: `node demigod-reply-check.mjs --file=/tmp/demigod-gmail-inbound.json`

**Douglas call pack:** `demigod-ops/DOUGLAS-CALL-PACK-2026-07-14.md`
