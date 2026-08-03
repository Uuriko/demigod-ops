# Demigod SCOPE — what NOT to build (now)

**Phase:** retired setup framing · Live foot **v183** green  
**Updated:** 2026-07-13  
**Owner:** Opus/strategy · enforced by Grok/Fable

## In scope (do these)
1. Human warm founder contact + first real pilot (white-glove)
2. Submit alert → human ack → pilot-os checklist
3. Rare site ships only for measured conversion P0 (via `dg-apply`, not thrash)
4. Agent reliability that prevents false claims (truth, claim-verify, lock, freeze)
5. Copy honesty (no 48h/SLA/names; pending Twilio/Stripe)

## Explicitly OUT of scope (kill list)
- Foot-core rewrites / redesigns / “just one more polish pass”
- OAuth / LinkedIn / Google login (trigger unmet)
- Game / Eat the Sounds work
- Auto-publish watchers / continuous improve loops
- Another dashboard UI
- Matching OS / ATS / CRM product features before 1 paid placement
- Sim→real pilot laundering
- Hermes / Eliza for Demigod product
- Anything that accelerates site churn when `fullyShipped=true`

## Agent rules
- Default: **no foot edit** when truth says fullyShipped
- Plans → `dg-apply` outbox only for code changes
- “Fixed” requires `claim-verify` or `truth.json` claims
- Publish: `DEMIGOD_PUBLISH_FREEZE=1` when green; real publish only with receipt

## Reopen triggers
| Build | Only when |
|-------|-----------|
| OAuth | ≥3 real weekly submits need prefill |
| Matching OS | ≥1 hire path + pain logging manually |
| Stripe live | Real start date + founder signed fee |
| Site rewrite | Conversion playtest red on real mobile path |
