# Exhaustive work prompt — Builders / Exceptional / Demigod competitive stream

**Agent:** execute this entire prompt without stopping to ask the user what to do.  
**Date context:** 2026-07-31  
**Workspace:** Demigod repo (`demigod-ops`). Ponytail required. No publish, no outbound messages, no inventing warm intros or pilot receipts.  
**Do not assign the user work.** Report only what you did / blocked on.

---

## Mission

Produce a **complete, durable research + ops package** so any future agent can:

1. Explain Builders.cv / Exceptional.builders vs Demigod in one breath  
2. Name every **public** partner company with product, funding, hiring, map status  
3. Know what Demigod should **reuse vs never build**  
4. Continue from explicit residual gaps only  

Prior research (read first, do not contradict without new evidence):

- `docs/research/EXCEPTIONAL-BUILDERS-COMPETITIVE-2026-07-31.md`  
- `docs/research/BUILDERS-CV-PARTNER-DEMAND-2026-07-31.md`  
- `docs/gtm/AI-NATIVE-EVIDENCE-ONE-PAGER.md`  
- `docs/gtm/DEMIGOD-VS-BUILDERS.md`  
- `docs/process/MATCH-QUALITY-CHECKLIST.md` (AI-native bullet)  

---

## Non-goals (hard)

- Do **not** build a coding assessment product, IDE, proctoring, or Promptster clone  
- Do **not** edit `demigod-foot-core.js` unless a one-line hint is clearly justified and gated  
- Do **not** hand-edit `DEMIGOD-SF-STARTUP-MAP.json` (use notes for pipeline only)  
- Do **not** commit/push unless the user already asked this session (they have not for commit)  
- Do **not** register / OTP on builders.cv (no fake email; no account creation)  
- Do **not** cold-email founders or invent warmth  

---

## Phase A — Read & inventory (mandatory)

1. Re-read all prior docs listed above (skim if already in context; re-open if stale).  
2. List every file you will create or update.  
3. Browser: open and snapshot/evaluate:
   - https://exceptional.builders/  
   - https://builders.cv/  
   - https://builders.cv/business  
   - https://builders.cv/get-certified  
   - https://builders.cv/refer  
   - https://builders.cv/terms-of-service (fee language if any)  
   - https://builders.cv/privacy-policy (data / signals language)  
   - environment-demo if needed  
4. Extract **every** partner logo alt/name from builders.cv + exceptional.builders.  
5. Extract every product claim (pass once, skip screens, pricing, auto-eval, timer, debrief length).  

**Deliverable:** update competitive pack §1–8 if claims change; log any new partners.

---

## Phase B — Partner deep cards (every named company)

For **each** company in the union set, produce a card:

| Field | Required |
|-------|----------|
| Legal/product name | yes |
| Website | yes |
| One-line product | yes |
| Funding (amount, lead, date if public) | yes or Unknown |
| HQ / location posture | yes or Unknown |
| Public careers URL | yes or none found |
| Open role count + sample eng titles | yes or none |
| ATS (Ashby/Greenhouse/…) | if known |
| On Demigod SF map? | yes/no (query map JSON) |
| Exceptional vs builders.cv logo? | which surface |
| Demigod relevance (seed SF AI eng demand 1–5) | yes |
| Evidence notes / mismatches | e.g. Blockit $20M vs $5M |

**Minimum company set (expand if more logos found):**

Pensive, Sekai, Blockit, Poetic, Clair, Andera, Ramp, BigPanda, Foresight Health, Incandor, Scrollmark, MochaCare  

**Plus:** any new logo from Phase A.

For each missing careers page: try `/careers`, `jobs.ashbyhq.com/<slug>`, YC company page, Lever/Greenhouse search via web.

**Deliverable:** expand `BUILDERS-CV-PARTNER-DEMAND-2026-07-31.md` into full cards OR add `BUILDERS-PARTNER-CARDS-2026-07-31.md`.

---

## Phase C — Builders product mechanics (exhaustive)

Document with citations (URL + quote snippet):

1. Candidate funnel steps (submit work → certify → hire)  
2. Timer / duration / AI policy / auto vs human eval  
3. What “unlock every company” means on the page vs gated  
4. B2B pitch (roles they claim to recruit)  
5. Refer & earn mechanics  
6. Any fee, placement %, or “free for candidates” language  
7. Data pulled into profile (LinkedIn, GitHub, olympiads, etc.)  
8. Auth model (email OTP)  
9. Relationship: exceptional.builders domain vs builders.cv (same app?)  
10. Testimonial claims (Clair hire) — full quote + name  

**Deliverable:** section in competitive pack or new `BUILDERS-PRODUCT-MECHANICS-2026-07-31.md`.

---

## Phase D — Competitive set refresh

Update or confirm one-liners for:

- CodeSignal Agentic, Promptster, interviewing.io, Mercor, Karat, CoderPad, HackerRank/Chakra, Woven, Sierra process, Triplebyte (dead), Arc/Hired  

Add **Builders.cv** as primary category peer (not just Exceptional campaign).

Matrix dimensions: multi-co path, AI agents allowed, free candidate, portable bar, SF density, fee transparency, mutual consent.

**Deliverable:** update competitive pack competitive matrix section.

---

## Phase E — Demigod gap analysis (actionable, not advice theater)

Check codebase/docs (read-only prefer; minimal write if YAGNI fails):

1. Engineer wizard fields: experience, resume-url — confirm still present in foot-core  
2. Matching engine: does experience feed `work evidence`?  
3. Match checklist: AI-native bullet present?  
4. SF map: which partners missing (re-run python inventory)  
5. DIE competitive landscape: should it cross-link Builders? (one-line if yes)  
6. Compare / about / pricing site copy: **do not invent site changes**; only note gaps in research doc  

Produce **Demigod backlog bullets** (research only unless a one-line doc fix):

- Map pipeline: ensurenamed companies with Ashby boards get ingested  
- Ops: treat Builders pass as evidence tier  
- Never: build OA  

**Deliverable:** `docs/research/DEMIGOD-BUILDERS-GAP-BACKLOG-2026-07-31.md`

---

## Phase F — Evidence grades (strict)

Re-grade every hard claim:

| Claim | Grade: Documented / Host claim / Anecdote / Unverified / False |
|-------|------------------------------------------------------------------|
| 20 companies | |
| Skip first tech screens | |
| Free for candidates | |
| Auto evaluation | |
| Partner X is on network | per logo |
| Blockit $20M | |
| Clair hire without tech interviews | |

**Deliverable:** claims table in competitive pack.

---

## Phase G — Residual research (max effort, then stop)

1. Web + X search for more partner names: `"builders.cv"`, `from:pensive`, Yoonseok, “Builders Certified”  
2. Do **not** create accounts  
3. If partner list still incomplete: state **blocked: auth-gated**  
4. Optional: open partner career pages for Scrollmark, BigPanda, Incandor, MochaCare jobs  

---

## Phase H — Package & consistency

1. All docs cross-link each other  
2. Single “start here” index at top of competitive pack  
3. Changelog entries dated 2026-07-31  
4. No duplicate mega-files if a section update suffices  
5. Verify markdown files are coherent (headers, tables)  

---

## Phase I — Self-verify

Before finishing:

- [ ] All phases A–H attempted  
- [ ] Partner count ≥ 12 or explained  
- [ ] Demigod vs Builders doc still accurate  
- [ ] No foot-core / map JSON mutation without necessity  
- [ ] No user “you should…” framing  
- [ ] Residual gaps listed explicitly  

---

## Output to user (final message)

1. What was executed (phase checklist)  
2. New/updated file paths  
3. Highest-value findings (≤10 bullets)  
4. Residual gaps only  

**Execute now. Do not stop after the prompt file is written.**
