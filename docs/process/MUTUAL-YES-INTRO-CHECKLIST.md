> Prefer **OPS.md** for daily use. This file is optional detail (MUTUAL-YES-INTRO-CHECKLIST.md).

# INT-03 — Mutual yes → intro

**Owner:** Account lead · **When:** immediately before intro email

## Gates
- [ ] Founder yes on shortlist (or this candidate)
- [ ] Candidate yes (CAN-01)
- [ ] Share scope agreed (what each side sees)
- [ ] Contacts current; no wrong-person risk
- [ ] Pair state updated in `DEMIGOD-PAIRS.json`

## Intro email
- [ ] Both parties on thread (or sequential with explicit handoff)
- [ ] Context: why this match · first concrete result · next step
- [ ] No SLA clocks · no fake scarcity
- [ ] Fee not renegotiated in CC without founder awareness

## After send
- [ ] Log: `demigod-ops/intros/<pair-id>.md` + pilot logger if applicable
- [ ] Follow-up owner + soft date (no public promise)
- [ ] Soft check-in later — no automated spam

**Done:** one send · logged · pair advanced · not double-intro’d  
**Tool aid:** `node demigod-intro-draft.mjs <pairId>` (draft only; send needs current authority)
