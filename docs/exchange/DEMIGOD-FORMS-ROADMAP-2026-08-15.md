# Demigod forms — audit, research, roadmap (2026-08-15)

**Product:** trydemigod.com · SF tech-matched talent · software compares · human proposes · mutual yes · 10% on hire  
**Canonical foot:** `demigod-foot-core.js` (disk v1102 → this pass targets v1103)  
**Scope:** Hire brief + talent profile wizards (primary conversion). Partner/refer form secondary.

---

## 1. Live audit (evidence)

| Check | Result |
|-------|--------|
| `bin/dg truth` | PASS disk v1102 · live foot v1101 (prepare-only lag) |
| Full forms audit CDP | `ok:true`, 0 issues, both modals open |
| Form e2e dry-run | submit-ready (no send) |
| form-p0 + adaptive-talent tests | PASS |
| Static Webflow shell | Still ships LinkedIn/GitHub fields + “CANDIDATE APPLICATION”; foot removes/scrubs at runtime |
| Live talent modal intro | **Bug:** still sounds like “upload resume + LinkedIn…” path; scrub mis-classifies “startups” as startup-side copy |
| Labels | Mixed: WIZ titles conversational, native labels sometimes Webflow (“Contact Email*”, “Availability *”, empty labels on talent fields in audit) |
| Step signal | Startup: outcome (highest match signal) sits *after* salary — intake research prefers success definition before logistics |

### Forms as shipped (WIZ after foot)

**Startup (8 answers):** role → company → stage → must-haves → location → salary → first result → email  
**Talent (9 + 2 optional):** setup → name → email → next work → proud outcomes → optional GitHub PR → start window → salary band → optional resume  

**Deliberately removed (match-critical only):** team size, JD paste, timeline, hiring model, phone, why-startups, LinkedIn, generic portfolio URL, work-auth.

---

## 2. Research (peers + form science)

| Source | Takeaway for Demigod |
|--------|----------------------|
| Multi-step lead forms (HubSpot / industry) | One-question-at-a-time + progress raises completion; Demigod WIZ already does this |
| Typeform job apps | Welcome screen, recall prior answers, conversational labels; Demigod has welcome + recall path — labels must match |
| Recruiting intake templates (25-Q) | Role context, must-haves, comp, location, success definition — Demigod already has the *critical* subset; more questions would hurt conversion |
| Underdog / Wellfound | Curated private pipelines, concrete achievements over keyword lists — align with “concrete outcomes” + optional shipped proof |
| YC-style applications | Concrete “what / why / how far” beats vague bios — maps to 90-day outcome + experience prompts |
| Series-D hiring lessons | Define “strong” before opening role — put first-result *before* salary logistics |

**Product boundary (do not copy peers):** no public board, no LinkedIn requirement, no volume SLA, no fake “vetted network.”

---

## 3. Roadmap (execute now vs later)

### P0 — this pass (disk, verify; publish still request-gated)

1. **Fix talent modal intro classification** so LinkedIn/GitHub shell copy becomes private-profile body.
2. **Best-question labels** on every field = WIZ_Q wording (native + wizard titles agree).
3. **Startup step order:** must-haves → **first result** → location → salary → email (success before logistics).
4. **Talent:** “Availability *” → “When could you start?”; ensure name/email/skills/experience always have labels.
5. **Partner form:** clearer referral-context question; honest submit copy.
6. **Tests** pin order, labels, and intro scrub; run form-p0 + adaptive + local CDP where possible.
7. Bump foot **v1103**.

### P1 — next (needs more evidence or Webflow paste)

1. Designer canvas: delete dead LinkedIn/GitHub inputs and fix modal titles JS-off (DG1 honesty).
2. Publish foot + optional Webflow paste under current-request auth.
3. Measure completion drop-off by step (if analytics allowed).

### P2 — park

1. Adaptive branching beyond technical vs non-technical experience prompts.
2. Optional “urgency” field for startups (was removed intentionally).
3. Multi-role briefs.

---

## 4. Execution checklist

- [x] Audit live + disk  
- [x] Research peers + form conversion  
- [x] Implement P0 in `demigod-foot-core.js` (v1103)  
- [x] Update/extend tests  
- [x] Form unit tests + CDP local full audit PASS; source verify has pre-existing non-form fails only  
- [x] Release foot lock  
- [x] Document; **no publish** without current request  

---

## 5. Done-when

- Talent modal intro never asks for LinkedIn as a requirement.  
- Startup wizard asks first-result before salary.  
- Every required field’s visible label matches WIZ_Q (or adaptive prompt).  
- form-p0 + adaptive-talent + source verify green.  
- Publish remains unauthorized until the user asks.  
