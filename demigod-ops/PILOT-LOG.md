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
| Douglas Green (Alpha High / 1517) | email + Calendly | agent-reviewed 2026-07-31 — Gmail verify 2026-07-30: no later reply, no hiring brief, no real role after missed Jul 14 meet | closed — park warm thread; re-open only if founder sends hiring brief (warm ≠ pilot) | 2026-07-31 |
| Douglas Green (Alpha High / 1517) | email | agent-reviewed 2026-07-31 — Gmail verify 2026-07-30: no later reply, no hiring brief, no real role after missed Jul 14 meet | closed — park warm thread; re-open only if founder sends hiring brief (warm ≠ pilot) | 2026-07-31 |
| Douglas Green (Alpha High / 1517) | email + Calendly | Jul 14 meeting missed · reschedule welcomed · Gmail verified 2026-07-30: no later reply, hiring brief, or real role | local follow-up draft ready (DOUGLAS-GMAIL-DRAFT), not sent · Gmail's Jul 9 pre-meeting draft is obsolete · warm ≠ pilot | 2026-07-30 |
| Webflow forms Acme/Alex | form | **test noise only** | ignore | 2026-06-30..07-04 |
| hello@trydemigod.com | inbox | 0 threads (14d) | forms land on personal Gmail | 2026-07-09 |

Reply check: `node demigod-reply-check.mjs --file=/tmp/demigod-gmail-inbound.json`

**Douglas call pack:** `demigod-ops/DOUGLAS-CALL-PACK-2026-07-14.md`
