# Demigod Full-Team Operating System

**For:** 1 founder + multi-agent swarm (process hats for humans; stage contracts for agents)  

> **Method note (2026-07-14):** Hats/RACI are for *process filing and human authority*.  
> Agents use **PLAN / EXECUTE / REVIEW + contracts**, not job titles as power.  
> See **`AGENT-COLLABORATION-METHOD.md`**.

**SSOT state:** `DEMIGOD-COMPRESSED-STATE.md`  
**Product:** SF human-matched talent · 10% on hire · mutual yes · 90-day outcome · pre-services honesty  

**Sources (2026-07-14):** Fable RACI/cadence · Codex executable checklists · Grok merge  
→ `docs/exchange/DEMIGOD-FABLE-TEAM-PROCESS.md` · `DEMIGOD-CODEX-TEAM-PROCESS.md`

---

## 0. What a full team would run (and what we actually staff)

| Hat | Full team title | Who wears it now |
|-----|-----------------|------------------|
| Founder | CEO / money / final yes | Human (Potter) |
| GTM | Outreach / demand | Human sends · agents draft |
| Talent ops | Intake → match → intro | Human + agents (pairs/inbox tools) |
| CS | White-glove pilot | Human (playbook: `demigod-ops/WHITE-GLOVE-ON-REPLY.md`) |
| Eng / SRE | Site, gates, ship, freeze | Grok/Cursor execute · freeze A = human |
| Product | Website conversion | Agents under freeze discipline |
| Design | Brand / pages | Agents (disk) · human taste |
| Finance | Fee / invoice | Human when first hire |
| Legal | Terms / privacy / consent | Human · agents scrub copy only |
| Swarm ops | Tools / verify / dash | Grok + Fable plan + Codex review |

---

## 1. RACI (critical actions)

| Action | R | A | C | I |
|--------|---|---|---|---|
| Website ship / Publish | Eng agent (prep) | **Human** (click / re-auth) | Fable plan | Swarm |
| Freeze on/off | — | **Human only** | Eng | All agents re-read live-doctor |
| Real DM send | — | **Human only** | GTM drafts | Outreach ledger |
| Pilot intro email | Talent ops (draft) | **Human** | Matcher | Pair ledger |
| Fee quote / invoice | — | **Human** | Fee one-pager | Finance folder |
| Board publish (real) | Eng tools | **Human honesty sign-off** | Matcher | Audit log |
| Incident (site / claim) | Finder | **Human** | Swarm | Postmortem |

**Hard rule:** agents never send real DMs, never invent pilots/receipts, never toggle freeze without human.

---

## 2. Process map (value chain)

```
Demand → Intake → Match → Mutual yes → Intro → Hire → 90d outcome → Proof
   \__________________________________________________________________/
                    Ops/Ship (website + honesty gates) runs parallel
```

| Stage | Exit criteria | SoR |
|-------|---------------|-----|
| Demand | Send logged, no fake traction | `demigod-ops/demand/` |
| Intake | 90d outcome + authority + consent | inbox + `demigod-ops/intake/` |
| Match | Evidence shortlist, no auto-intro | `DEMIGOD-PAIRS.json` |
| Intro | Two yeses + receipt | `demigod-ops/intros/` |
| Hire | Start verified + fee terms | `demigod-ops/finance/` |
| Proof | Consent + real only | `demigod-ops/outcomes/` |
| Ship | freeze OFF → full-check --release | `/tmp/dg-busy/` + ship ledger |

---

## 3. Checklist catalog (executable)

| ID | File | Owner hat | Trigger |
|----|------|-----------|---------|
| OPS-01 | [SESSION-HEALTH](SESSION-HEALTH-CHECKLIST.md) | Operator | Start/end day |
| DEM-01 | [DEMAND-BATCH](DEMAND-BATCH-CHECKLIST.md) | GTM | Before outreach batch |
| INT-01 | [INTAKE-ACCEPTANCE](INTAKE-ACCEPTANCE-CHECKLIST.md) | Talent | Before sourcing |
| CAN-01 | [CANDIDATE-CONSENT](CANDIDATE-CONSENT-CHECKLIST.md) | Talent | Before sharing profile |
| MAT-01 | [MATCH-QUALITY](MATCH-QUALITY-CHECKLIST.md) | Matcher | Before pitch either side |
| INT-03 | [MUTUAL-YES-INTRO](MUTUAL-YES-INTRO-CHECKLIST.md) | Account | Before intro email |
| PIL-01 | [PILOT-LIFECYCLE](PILOT-LIFECYCLE-CHECKLIST.md) | CS | Real search open→close |
| HIR-01 | [HIRE-INVOICE](HIRE-INVOICE-OUTCOME-CHECKLIST.md) | Finance | Offer/start |
| BRD-01 | [BOARD-PUBLISH](BOARD-PUBLISH-CHECKLIST.md) | Board steward | Board mutation |
| WEB-01 | [WEBSITE-SHIP](WEBSITE-SHIP-CHECKLIST.md) | Release | Intentional ship |
| INC-01 | [INCIDENT](INCIDENT-DATA-RESPONSE.md) | Finder | Site/claim/PII/bad intro |
| AGT-01 | [AGENT-TASK](AGENT-TASK-CHECKLIST.md) | Swarm | Nontrivial agent work |

**Already strong (keep, don't duplicate):**  
`WHITE-GLOVE-ON-REPLY.md` · `PILOT-LOG.md` · fee one-pager · ship-checklist tool · session-contract · `bin/dg live|mime|full-check`

---

## 4. Cadences

### Daily (≤5 min)
1. `bin/dg live` → note LIVE / DISK / FREEZE  
2. Optional: `bin/dg full-check --skip-smoke` when engineering  
3. One line pipeline: DMs / replies / open briefs / pairs waiting yes  
4. Surface real P0 only (incident playbook)

### Weekly (Mon ~15 min founder)
| Focus | Mon | Tue | Wed | Thu | Fri |
|-------|-----|-----|-----|-----|-----|
| | Demand + capacity | Inbox + briefs | Match review | Intros + check-ins | Truth + finance + ship window |

Metrics (one running log, not 10 docs):  
`sent DMs · replies · open briefs · pairs · intros · realRoles · freeze · foot live ver`

### Monthly
- Doc prune (exchange → archive or process link)  
- Stripe readiness: still pending?  
- Access/keys quick review  
- Laptop hygiene score

---

## 5. Definition of Ready / Done (summary)

| Work | Ready | Done |
|------|-------|------|
| **Website ship** | Single writer · change approved · freeze owner named · rollback known | freeze OFF · `full-check --release` · live==disk · smoke · ledger · compressed state · freeze back ON if policy |
| **Pilot** | Real counterparty · accepted brief · capacity · terms | Scope closed · intros logged · invoice/waiver · no fake proof |
| **Intro** | Pair + two yeses + share scope | Sent once · logged · follow-up owner |
| **Board publish** | Evidence or labeled sample · freeze OFF | Honesty pass · audit line · live render |
| **Agent task** | Session contract + lock + verify/stop | Artifacts · lock released · no false live claims |

---

## 6. Quality gates (always)

| Gate | Block if |
|------|----------|
| Honesty | Unsupported role/pilot/receipt/version; unlabeled samples; SLA/48h language |
| Legal/consent | Intro without mutual yes; public proof without permission; unclear fee |
| Copy scrub | Founder names / 48h / SLA on site |
| Security | Secrets in repo/logs; PII in agent prompts |
| Hygiene | >10 CDP tabs; hung swarm; dual foot writers |

Commands: `bin/dg live` · board honesty · `bin/dg hygiene` · copy policy tools

---

## 7. Gaps we were missing (swarm consensus)

| Have | Missing (now filled or flagged) |
|------|----------------------------------|
| Pilot log | Stage definitions + DoR/DoD → PILOT-LIFECYCLE |
| White-glove playbook | Candidate consent checklist |
| Fee one-pager | Invoice/hire checklist (pre-Stripe) |
| Ship tools | Human-readable WEBSITE-SHIP checklist |
| Gates | Incident playbook for site/claim/PII |
| Agent collab protocol | AGENT-TASK + session contract as default |
| Outreach packs | Demand batch ledger schema |
| Match tools | Match quality rubric checklist |
| Compressed state | Prefer append entries over silent overwrite |
| Writer lock convention | AGENT-TASK + foot lock tools |

---

## 8. Anti-process (do not build yet)

- Sprint/Jira for one founder  
- Multi-level SLA taxonomy (ironic vs no-SLA brand)  
- Second metrics dashboard beyond `:9878`  
- Full ToS law firm pass before first real search (use fee one-pager + mutual yes)  
- Automated DM sending  
- More one-shot `*-pass.mjs` scripts without archive plan  

---

## 9. Doc sprawl plan

| Keep as living | Treat as history | Merge into process/ |
|----------------|------------------|---------------------|
| COMPRESSED-STATE | exchange dated notes | WORKFLOW ship steps → WEB-01 |
| This README | ROUND4, info-exchange | 14-day checklist → roadmap archive |
| AGENTS.md | postmortems | collab protocol → AGT-01 |
| STARTUP-ROADMAP outcomes | Douglas one-call packs | pilot log stays ops evidence |

---

## 10. First week of use

1. Run OPS-01 every session open  
2. Use DEM-01 before any DM batch  
3. On first real reply: INT-01 → WHITE-GLOVE → MAT-01 → INT-03  
4. Ship only via WEB-01 when freeze intentionally lifted  
5. Any honesty scare → INC-01 immediately  

---

*Update this index when a checklist is added/retired. Agents: open with `bin/dg live` then this README for hat-specific work.*
