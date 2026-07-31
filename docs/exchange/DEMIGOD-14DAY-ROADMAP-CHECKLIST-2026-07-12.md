# Demigod 14-Day Roadmap + Checklist — 2026-07-12

**Decision:** FIX (not scratch).  
**North star:** Warm demand + one real pilot. Site polish only if live breaks.  
**SSOT:** `DEMIGOD-COMPRESSED-STATE.md`  
**Review:** `docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md`  
**Collab:** `docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md`

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Day 0 (today) — Multi-agent baseline

- [x] Multi-agent review (Fable, Opus, Codex, Grok)
- [x] Decision recorded: **FIX**
- [x] Live audit (curl): unhide-v5-safe, CTAs, no lorem/48h in static extract
- [x] Disk gates green: source + board honesty + loop-state
- [x] Hash compare: disk **v177** ≠ live CDN **v176** (honesty patch covers feeNote)
- [x] Collab protocol + this checklist written
- [x] Compressed state refresh to 2026-07-12 truth
- [ ] Form e2e dry via CDP (blocked: CDP Network.enable congestion; site-metrics forms PASS)
- [x] Optional: decide hold CDN reupload (v176+patch sufficient; v177 = feeNote only)

---

## Days 1–3 — Demand + form proof

### GTM
- [ ] Prep remaining warm SF founder targets (name, company, angle)
- [ ] Send/prep to **15+ total** touches; log every send
- [ ] Follow up any overdue threads (no SLA promises)
- [ ] Target: ≥3 replies or ≥1 real brief inbound

### Product trust
- [ ] `node demigod-form-e2e.mjs --dry` (CDP up)
- [ ] `node demigod-form-e2e.mjs` full tagged submit once dry passes
- [ ] Document destination (Webflow form / webhook / email) in exchange note
- [ ] If destination dead → minimal foot/forms fix only, then re-verify

### Stability
- [ ] Daily: `npm run demigod:verify:source && node demigod-verify-board-honesty.mjs && node demigod-verify-loop-state.mjs`
- [ ] Freeze non-essential foot-core edits
- [ ] Confirm no auto board-mint scripts writing samples

**Exit criteria days 1–3:** form path proven OR clear blocker doc; DM machine running; gates green.

---

## Days 4–7 — White-glove + proof

- [ ] Pick strongest inbound (form / DM / existing list)
- [ ] Human-curated 3–5 candidates (or honest “building slate” if thin)
- [ ] Intro via `hello@trydemigod.com` only
- [ ] Log pilot honestly (`demigod-pilot-logger` or ops note) — no fake delivered
- [ ] Capture proof asset (1-pager / anonymized quote / process screenshot)
- [ ] Reuse proof in ≥5 outreach messages

**Exit criteria:** one white-glove attempt completed; proof artifact exists; board still honest (real only if truly real).

---

## Days 8–10 — Light engineering hardening (only if GTM not starving)

- [ ] Boot-smoke deterministic in `demigod-verify-source.mjs` (Codex #1)
- [ ] Release manifest stub: versions + CDN hashes for head/css/foot/board
- [ ] Mobile pass: nav + footer links survive `dg-simplify` (CDP screenshot)
- [ ] Decide CDN: reupload v177 (new catbox URL) **or** keep v176+inline patch through pilot
- [ ] If reupload: smoke → update footer-lite → paste custom code → publish → hash confirm
- [ ] Drop permanent honesty fork only after CDN matches disk feeNote

**Exit criteria:** gates reliable; live version claim is hash-true.

---

## Days 11–14 — Scale what worked / kill what didn’t

- [ ] Double down on channel that produced replies
- [ ] Archive dead templates; keep top 3 DM scripts
- [ ] Update compressed state with real metrics (DMs, replies, pilots, form proof)
- [ ] Explicit **site freeze** unless P0 live bug
- [ ] OAuth/Twilio/Stripe: still **pending** unless ≥10 WIZ/week or paid pilot needs it
- [ ] Multi-agent re-review (short): Fable one-pager on “continue FIX vs any new info”

**Exit criteria:** clear demand numbers; site frozen healthy; next 14-day plan if needed.

---

## Permanent anti-checklist (never mark done by doing these)

- [ ] ~~Full rewrite~~
- [ ] ~~OAuth for polish~~
- [ ] ~~Fake board growth~~
- [ ] ~~48h/SLA copy~~
- [ ] ~~Concurrent foot-core writers~~
- [ ] ~~Game work~~
- [ ] ~~Continuous improve loops unprompted~~

---

## Daily command card

```bash
cd /home/potter
~/agent-dev.sh status
npm run demigod:verify:source
node demigod-verify-board-honesty.mjs
node demigod-verify-loop-state.mjs
# optional live:
curl -sS https://www.trydemigod.com/ -o /tmp/dg-live.html
grep -E 'Last Published|unhide-v5|8tjw79|m2f8rp' /tmp/dg-live.html | head
```

---

## KPI targets (14 days)

| Metric | Target |
|--------|--------|
| Warm founder touches | ≥15 |
| Replies | ≥3 |
| Form e2e | 1 proven path |
| White-glove attempts | ≥1 |
| Real board roles | 0 until real hire/listing |
| Gate regressions | 0 open at EOD |
| Site rewrites started | 0 |

---

## Ownership defaults

| Workstream | Owner |
|------------|--------|
| DMs / lists / logging | Grok prep + human send (or full auto prep) |
| Form e2e / CDP | Grok |
| Foot-core (if required) | Codex or Grok under lock |
| Plans / audits | Fable |
| Strategy kill-list | Heavy |
| Publish | Human default; Grok auto if override active |

---

*Created 2026-07-12 · update checkboxes as work completes.*


---

## Update 2026-07-13 (Grok swarm)

- [x] Live foot **v181** mobile CTA + scrub
- [x] Live foot **v182** differentiation FAQ/trust/deep-links (CDN `j1jic3.js`)
- [x] Agent health: Fable/Sonnet/Opus/Codex Pro OK (`OPENAI_API_KEY` unset; Codex Pro session works)
- [x] Living roadmap + work-together protocol + productive loop scripts
- [x] Douglas call pack written
- [ ] Form e2e when CDP calm
- [ ] Human Top3 DMs (when ready)
