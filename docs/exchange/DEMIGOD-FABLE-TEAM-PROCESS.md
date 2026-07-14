# FULL TEAM OPERATING SYSTEM — Demigod

*Gaps + checklists only. Assumes existing: DEMIGOD-WORKFLOW.md, DEMIGOD-AGENTS.md, DEMIGOD-COMPRESSED-STATE.md, docs/exchange/*, bin/dg (live|mime|full-check|ship-prep), honesty gate (≤3 seed board, no SLA, pending Stripe/SMS).*

## 1. RACI Matrix

| Action | R (does it) | A (owns outcome) | C (consulted) | I (informed) |
|---|---|---|---|---|
| Ship (publish) | Engineering agent (Grok/Cursor) | Potter (human click) | Fable (plan review) | all agents |
| Pilot intro | Matching ops agent | Potter | CS/white-glove | founder log |
| DM send | GTM agent (drafts only) | Potter (sends) | — | outreach tracker |
| Fee quote | Potter | Potter | Finance/legal notes | none yet — no fee quoted live |
| Board update | Engineering (writer) | Potter (honesty sign-off) | Matching ops | verify gate |
| Freeze toggle | Potter only | Potter | Engineering | all agents (loop-state) |
| Incident (site down/dishonest claim) | Whoever finds it | Potter | all agents | Potter first, always |

**Gap:** no agent may toggle freeze or send a real DM — this is enforced by convention, not by a script gate. Should be a hard check (see §4).

## 2. Cadences

**Daily (5 min, human-read, agent-prepared):**
- `bin/dg full-check` output (live vs disk ver, board honesty, freeze state)
- 1 line: DMs sent yesterday / replies / pilots active
- Any P0 from overnight agent runs (surface only real ones — see incident playbook)

**Weekly (Monday, 15 min):**
- Founder review: pipeline (DMs → replies → intros → pilots), site drift audit, outreach tracker cleanliness
- Demo: one thing that changed on live site, screenshot or CDP proof
- Metric snapshot: real board count, sent-DM count, reply rate — written to a single running log, not scattered docs

**Monthly:**
- Full doc audit: archive stale exchange docs, re-verify CLAUDE.md still matches reality
- Revisit fee/pricing readiness (still pre-services or time to activate Stripe?)
- Laptop/tooling health check (already have a laptop-loop score — reuse it)

## 3. Master Checklist Catalog

| Checklist | Owner | Trigger | Done when |
|---|---|---|---|
| Ship gate | Engineering agent | any foot-core/head edit | verify:source + board-honesty + loop-state all PASS, smoke boot passes |
| Publish confirm | Potter + agent | after human clicks Publish | live ver == disk ver via curl/CDP, screenshot diff clean |
| Pilot intake → intro | Matching ops | new WIZ submission | mutual yes logged, receipt in pilot-tracker, no sample:false leakage |
| DM send | Potter | GTM agent hands off draft batch | sent count logged in outreach tracker, no dupes, no 48h/SLA language |
| Board honesty audit | Engineering | before any publish | ≤3 seeds, real count accurate, no minted samples |
| Freeze toggle | Potter | explicit decision only | loop-state.json reflects new state, all agents re-read before acting |
| Incident response | whoever finds it | site down / dishonest claim risk / bad intro | root cause written to memory, fix verified live, postmortem filed under docs/exchange |
| New agent onboarding | Potter | new tool/model added to swarm | agent has read CLAUDE.md + DEMIGOD-AGENTS.md, allowlist scoped, one supervised dry run |
| Legal/copy scrub | Engineering | any static copy change | grep for 48h/SLA/founder-name banned strings, runtime scrub verified |

## 4. Gaps vs Existing

- **Have** pilot log — **missing** a single source of truth for "who replied, who ghosted" (currently reconstructed from tracker + memory each session)
- **Have** verify gates — **missing** a gate that blocks freeze-toggle or DM-send by non-human actors (currently just a written rule, repeatedly violated per memory history — v197/v198 freeze saga)
- **Have** board honesty gate — **missing** enforcement at the *ingestion* point (memory shows repeated "mints sample:false via proposeIntro" bugs — gate checks after the fact, not before write)
- **Have** DEMIGOD-COMPRESSED-STATE.md — **missing** a *dated* changelog inside it; it's overwritten each session so "what changed since last week" requires digging through memory/git log
- **Have** multi-agent swarm — **missing** a single "who's doing what right now" board; multiple sessions have churned foot-core concurrently with no writer lock (5+ corruption incidents in history)
- **Have** outreach tracker — **missing** a periodic purge of selftest/junk entries (flagged 07-13, still noted as outstanding)

## 5. Escalation & Incident Playbooks

**Site down / stale publish:** run `bin/dg live` → compare disk vs live ver → if mismatch, check freeze state FIRST (do not publish if freeze ON without explicit lift) → if freeze OFF and genuinely stale, run ship gate → publish → re-verify live.

**Form broken (WIZ):** reproduce with `demigod-wiz-cdp-playtest.mjs --local` before trusting any live claim (memory shows repeated false-positive/false-negative reports here) → fix on disk → smoke pass → ship gate → publish.

**Dishonest claim risk (copy, board, DMs):** treat as P0, higher priority than any feature work → grep banned strings (48h, SLA, founder names, fake counts) → if live, fix + publish immediately → log root cause to memory so it doesn't recur (this class of bug has recurred 8+ times per memory history).

**Bad intro (mismatch, unqualified lead):** matching ops agent flags to Potter same day, no auto-retry/auto-reintroduce — human judgment only, this is relationship-risk not a bug.

**Freeze thrash (agent toggles freeze without authorization):** treat as incident, not routine — trace which session/writer did it (loop-state + git blame equivalent), confirm with Potter before any further action, document in memory under a freeze-incident entry.

## 6. First 5 Process Docs to Write Next Week

1. **DM/reply tracker spec** — single schema, one file, dedupe rule, purge-junk rule (closes the outreach tracker gap now, before volume grows)
2. **Writer-lock protocol for foot-core** — even a lightweight "session announces intent to edit, others wait" convention would have prevented most of the 5+ corruption incidents in memory
3. **Freeze-toggle authorization doc** — one page, machine-checkable if possible (agent refuses to publish if loop-state freeze=true and no explicit human override token)
4. **Pilot pipeline stage definitions** — intake → shortlist → mutual yes → intro → delivered → feedback, with what "done" means at each stage (currently implicit, reconstructed each session)
5. **Board ingestion honesty contract** — the *code-level* contract (not just gate check) for what proposeIntro/appendPilot are allowed to write — this is the recurring root cause across multiple "board corruption" incidents

## 7. Anti-Process — Do NOT Process-ify Yet

- **No formal sprint/ticket system.** One human, a handful of agents, pre-revenue — a backlog doc + memory is enough.
- **No fee/pricing process doc yet.** Zero real pilots delivered; premature to formalize what you haven't done once.
- **No legal/ToS drafting yet.** Pending-services language covers this; don't build compliance process for services not live.
- **No formal incident severity taxonomy (P0-P4 with SLAs).** Ironic given the anti-48h-SLA rule — just "is it live and wrong" (fix now) vs "is it a plan" (fix this week).
- **No cross-agent handoff templates beyond what bin/df already does.** More ritual here just adds friction without adding trust.
- **No dashboards beyond the existing :9878** — a second metrics surface will drift and lie, same as the board did.
