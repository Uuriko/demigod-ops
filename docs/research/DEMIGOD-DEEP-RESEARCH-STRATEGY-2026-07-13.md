# Demigod Deep Research + Strategy Pack — 2026-07-13

**Authors:** Grok (synthesis) + Fable/Claude/Codex reports in `/tmp/dg-multi/*research*`  
**Phase:** retired setup framing · **Product live:** foot v182 · **Decision:** FIX not rewrite  
**SSOT state:** `DEMIGOD-COMPRESSED-STATE.md`

---

## 1. Executive truth

Demigod is **human-curated SF seed talent matching**:
- Startups: brief + **90-day outcome**
- Candidates: profile once, private until fit
- **Mutual yes** before intro
- **10% on hire** (vs typical **15–25%** contingency)
- Systems exist to **earn the human conversation**, not replace it (a16z Talent Engineer language)

**Bottleneck is demand + one delivered pilot**, not more site surface.

---

## 2. Research findings (with sources)

### 2.1 Multi-agent AI collaboration (how we should work)

| Practice | Source | Demigod application |
|----------|--------|---------------------|
| **Orchestrator–worker** | Anthropic multi-agent research (2025); Azure/Confluent patterns | Grok = orchestrator; Fable/Opus = plan workers; Codex = code review worker; Sonnet = copy/audit |
| **Shared memory / SSOT** | Anthropic; multi-agent memory engineering | `DEMIGOD-COMPRESSED-STATE.md` + `docs/exchange/` + `/tmp/dg-multi/` — not chat between agents |
| **Detailed subtask specs** | Anthropic: vague prompts → duplicate work | Every spawn: phase, constraints, max words, output path, “do not edit foot unless lock” |
| **Patterns: sequential / concurrent / handoff / hierarchical** | Microsoft Azure AI agent design | Concurrent research OK; sequential for foot publish (one writer) |
| **Blackboard** | Confluent multi-agent | Drop folder is the blackboard |
| **Token cost** | Anthropic: multi-agent ~15× chat tokens | Cap concurrent Claude/Codex to ~2–4; prefer short plans |
| **Human oversight on ledger** | Magentic / Copilot patterns | Human sends real DMs; human is Publish authority when needed; honesty gates |

**Anti-patterns we avoid:** concurrent foot-core writers; unprompted continuous thrash; agents claiming live==disk without CDN hash; fake board growth.

### 2.2 a16z talent engineering & hiring

**Talent Engineer Fellowship (a16z Build / Substack, Jun 2026)**  
- Recruiting is a **many-to-many matchmaking** problem (person × role × moment).  
- Advantage shifts to teams that **build systems** (sourcing agents, market maps, relationship graphs, referral systems, HM context engines).  
- Critical sensibility: **tooling without judgment = spam with better infrastructure**.  
- Role parallel to GTM engineer in sales (Clay inflection).  
→ **Demigod position:** we *are* the human judgment layer + light talent-eng OS for SF seed; not another spam agent.

**How to Hire a Strong Founding Team (a16z, Elmgren, Aug 2025)**  
- Recruiting = core pillar, not support.  
- Funnel: **sourcing + process + decision signal + clear expectations**.  
- Best processes are **fast and hard**.  
- Sources: 1st/2nd degree, internal/external recruiters, creative (X, alumni, GitHub, Discords).  
- Misaligned expectations = costly early attrition; 30-day “is this what you expected?”  
→ **Demigod:** 90-day outcome = MOC-lite for IC/early roles; mutual yes = expectation alignment; speed without SLA lies.

**The Hiring Process / MOC (a16z Growth, Stump et al.)**  
- **Mission / Outcomes / Competencies** before search.  
- If you can’t define it, don’t hire for it.  
- Engaged CEO; working sessions align *how* outcomes are hit.  
→ **Demigod WIZ:** required 90-day outcome mirrors MOC “outcomes” for seed roles.

**Why hire recruiters early (a16z crypto / cited widely)**  
- Founders often spend **30–50% of time** recruiting; **150–300 hours** per hire.  
→ **Demigod monetization narrative:** buy back founder time at half typical agency fee.

### 2.3 Academic / rigorous recruiting research

**Kim & Pergler (Strategic Management Journal, 2025)** — *Startup hiring through firm-driven search* (Venture for America data)  
- Firm-driven outreach **increases hire likelihood**.  
- But **higher turnover** — candidates may treat inbound as substitute for their own search → weaker interest alignment.  
→ **Demigod mutual-yes + candidate privacy** is a direct product answer to this failure mode.

**Black, Hasan, Koning — “Hunting for talent” (firm-driven search, US)**  
- Share of workers hired via recruiting rose (~4% → ~18% over decades in survey work).  
- Outbound recruiting especially relevant for high-skill / tech hubs.  
→ Market structure favors active matching, not pure job boards.

**Fairness in AI recruitment (scoping reviews, arXiv 2024–25)**  
- AI matching must address bias, person–environment fit, not only keyword rank.  
→ Demigod: human final judgment; AI may assist later but not auto-blast.

### 2.4 Market economics & startup context (2025–26)

| Fact | Implication for Demigod |
|------|-------------------------|
| Contingency fees **15–25%**, ~**20%** common | **10%** is clear price wedge |
| Seed rounds often **~$3–5M median** class | Founders price-sensitive; outcome-based fee fits |
| Series A teams leaner than 2020 (SignalFire-type reports) | Each hire higher stakes → quality > volume |
| Ashby: huge application volume at startups | Noise favors **curated slate of 3–5** |
| AI “recruiter agents” hype (X) | Race to spam; Demigod differentiates on **human mutual-yes** |
| Acqui-hire / talent competition for AI eng | High demand for scarce eng; curation valuable |

**Unit economics sketch (illustrative):**  
- $180k hire → Demigod fee **$18k** vs agency **$27–45k**.  
- One placement / quarter early stage can fund ops; 4–6 placements / year is a real business before SaaS.

### 2.5 Near / medium future (predictions we act on)

| Horizon | Trend | Demigod move |
|---------|-------|--------------|
| **0–6 mo** | Founder-led hiring + AI spam flood | White-glove mutual-yes; honest pending services |
| **6–18 mo** | Talent Engineer tooling mainstream | Productize matchmaking OS *after* proof (sourcing CRM, outcome templates) — not before demand |
| **18–36 mo** | Agent↔agent job markets | Stay human-in-loop for intros; optional agent assist for *research* only |
| **Ongoing** | Fee pressure down | Hold 10%; win on retention quality narrative (SMJ) |

---

## 3. Strategy (what Demigod is building)

### Positioning
> Not a job board. Not an ATS. Not a recruiter marketplace.  
> **Human-matched SF seed intros — 90-day outcome first, mutual yes only, private until both sides agree, 10% only on hire.**

### Jobs to be done
1. **Founder:** “I need 1–2 great engineers without burning 200 hours or 20% fee.”  
2. **Engineer:** “I want one relevant intro, not 50 spam applications.”  
3. **Partner/VC (later):** “Send my portcos a trusted human match layer.”

### How we make money (ladder)
1. **Placement fee 10%** first-year cash (core)  
2. **Pilot / success fee** for first design partners if needed (still outcome-aligned)  
3. **Partner referral %** (share of placement, not listing fees)  
4. **Later:** light paid priority / portfolio desk for VCs — free intros only if strategy needs it; never fake volume  
5. **Not now:** SaaS seats, job ads, candidate paid tiers

### Competitive matrix

| Player | Model | Gap Demigod fills |
|--------|-------|-------------------|
| Wellfound | Volume marketplace | Signal, mutual yes |
| Dover | ATS + fractional | Candidates, not empty funnel |
| Paraform | Recruiter marketplace | Single accountable human layer |
| Underdog | Closed network + logos | Open SF seed; no logo theater pre-proof |
| Contingency 15–25% | List spray | Lower fee + outcome fit + retention design |
| AI agent recruiters | 24/7 spam | Judgment + privacy |

---

## 4. Roadmap

### Now (Week 0–2) — Demand & proof
- [ ] Top3–15 warm founder DMs (human sends; agents draft)  
- [ ] Douglas / intros: convert conversations to briefs via `/?wiz=startup`  
- [ ] Form e2e proof (inbox destination documented)  
- [ ] One white-glove slate (3–5 candidates or honest “building slate”)  
- [ ] Site freeze unless P0 (v182 healthy)  
- [ ] Board honesty: real only when real  

### Next (Week 2–6) — First dollar path
- [ ] First mutual-yes intro logged  
- [ ] First pilot terms in writing (10%, no SLA clock, pending Stripe)  
- [ ] Proof asset (anonymized process or quote if earned)  
- [ ] Expand candidate pool via engineer WIZ + warm network  
- [ ] Weekly pipeline review (starts / roles / stages)  

### Medium (Month 2–4) — Repeatability
- [ ] 3–5 intros attempted; learn conversion  
- [ ] Outcome template library (eng roles)  
- [ ] Partner channel (1–2 VCs/accelerators)  
- [ ] Payments live (Stripe) when first invoice due  
- [ ] Light talent-eng tooling *only if* volume hurts humans  

### Later (Month 4–12) — OS layer
- [ ] Matching CRM / relationship graph  
- [ ] Sourcing assist agents (research only; human gate)  
- [ ] Portfolio desk product  
- [ ] Apply a16z Talent Engineer practices internally  

### Explicit anti-roadmap
- Full site rewrite · OAuth vanity · Twilio before demand · fake logos · concurrent foot thrash · game work · unprompted continuous improve

---

## 5. 14-day checklist (execute)

### Demand (P0)
- [ ] List 15 warm SF founders (name, company, role guess, angle)  
- [ ] 3 DM variants ready (no 48h/SLA)  
- [ ] Send Top3 when human ready; log in GTM tracker  
- [ ] Follow-ups on overdue threads  

### Trust / product (P0–P1)
- [ ] Daily: `npm run demigod:verify:source` + board + loop-state  
- [ ] Form path dry-run once CDP calm  
- [ ] Confirm live CDN hash = `DEMIGOD-FOOT-CDN.json` weekly  

### Pilot ops (P0)
- [ ] Douglas pack used on call  
- [ ] One pilot candidate path defined  
- [ ] `hello@trydemigod.com` reply SOP  

### Money (P1)
- [ ] One-page fee sheet (10%, when invoice, replacement once payments live)  
- [ ] Stripe park until first hire imminent  

### Multi-agent ops (P1)
- [ ] SSOT update after every ship  
- [ ] Plans → `/tmp/dg-multi/` then promote best to `docs/exchange/`  
- [ ] Max 1 foot writer; lock file optional  

---

## 6. Multi-agent operating system (improved)

```
Heavy / Opus     → strategy direction (docs)
Fable            → single next action + ranked plan
Sonnet           → copy, UX audit, DM drafts
Codex (Pro)      → code review, gate honesty, checklists
Grok             → execute, verify, publish, synthesize SSOT
Human            → real DMs, taste, final money decisions
```

**Communication:** shared files only (no live agent chat).  
**Blackboard:** `DEMIGOD-COMPRESSED-STATE.md` + `docs/research/` + `docs/exchange/` + `/tmp/dg-multi/`.  
**Orchestrator:** Grok (or human) assigns; workers return files.  
**Verification:** gates after code; hash after publish.

**Codex API key:** currently **missing** in env — Pro CLI path works. To enable second path: set `OPENAI_API_KEY` and document in agent work-together note.

---

## 7. Agent report index

| Agent | File (when ready) |
|-------|-------------------|
| Fable strategy | `/tmp/dg-multi/fable-research-strategy-*.txt` |
| Opus market | `/tmp/dg-multi/opus-research-market-*.txt` |
| Sonnet agents | `/tmp/dg-multi/sonnet-research-agents-*.txt` |
| Codex biz | `/tmp/dg-multi/codex-research-biz-*.txt` |
| Codex agents | `/tmp/dg-multi/codex-research-agents-*.txt` |
| This synthesis | `docs/research/DEMIGOD-DEEP-RESEARCH-STRATEGY-2026-07-13.md` |

---

## 8. Key citations (non-exhaustive)

- a16z Talent Engineer Fellowship — https://www.a16z.news/p/introducing-the-a16z-talent-engineer  
- a16z How to Hire a Strong Founding Team — https://a16z.com/how-to-hire-a-strong-founding-team/  
- a16z The Hiring Process (MOC) — https://a16z.com/the-hiring-process/  
- Kim & Pergler SMJ 2025 firm-driven search — https://sms.onlinelibrary.wiley.com/doi/full/10.1002/smj.3710  
- Anthropic multi-agent research system — https://www.anthropic.com/engineering/multi-agent-research-system  
- Contingency fee guides (Dover, Paraform, etc.) — 15–25% band  
- Azure multi-agent orchestration patterns — Microsoft Learn  

---

*Update this file when strategy shifts. Promote agent drops into sections 3–5 after review.*
