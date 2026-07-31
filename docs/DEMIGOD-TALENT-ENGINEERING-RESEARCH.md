# Demigod × Talent Engineering Research
**Date:** 2026-07-10  
**Sources:** a16z Talent Engineer Fellowship (Jun 2026), academic hiring/matching papers, industry fee norms.  
**Use:** Positioning, GTM copy, product design — **not** to invent live capabilities we do not have.

---

## 1. a16z: What is a Talent Engineer?

**Primary:** [Introducing the a16z Talent Engineer Fellowship](https://www.a16z.news/p/introducing-the-a16z-talent-engineer) (Jun 18, 2026) · [Fellowship page](https://build.a16z.com/fellowships/talent-engineer)

| Claim | Substance |
|-------|-----------|
| Definition | An **engineer who recruits** — not a recruiter who codes |
| Problem | AI made recruiting **noisier**: polished résumés, spammy outbound, harder inbound signal; best candidates stopped looking |
| Advantage | Shifts to teams that **build their own** systems (like GTM engineers did for sales after Clay-class tools) |
| Builds | Sourcing agents, market maps, **relationship graphs**, candidate-intelligence workflows, referral systems, AI-assisted evals, hiring-manager context engines, talent-brand surfaces |
| Core thesis | Recruiting done right is a **many-to-many matchmaking problem** — right person, right role, **right moment** — and matchmaking is an engineering problem |
| Judgment line | *“Tooling without judgment is just spam with better infrastructure. The system exists to earn the human conversation, not replace it.”* |

**Founding-fellow ecosystem signal:** Cursor, OpenAI, xAI, Zapier, Anthropic, Paraform, Wellfound, Clay, Airbnb recruiting systems — role is real at frontier companies.

### Demigod alignment (honest)

| a16z Talent Engineer | Demigod today | Stretch (do not claim live) |
|----------------------|---------------|-----------------------------|
| Matchmaking as the job | Human proposes; **both sides say yes** | Full relationship graph / agentic sourcing |
| Judgment over spam | No cold blasts; 3–5 curated | Automated screens |
| Systems that earn conversation | WIZ + 90-day outcome + email follow-up | SMS/Twilio, Stripe (pending) |
| Internal tools | Board, events pipeline, pilot logger | Public “talent OS” product |

**Positioning line (safe):** Demigod is the **human matchmaking layer** for SF startups — the judgment and mutual-yes step that talent-engineering systems are supposed to earn, not skip.

---

## 2. Academic evidence

### 2.1 Firm-driven search: hire more, retain less
**Kim, J. D. & Pergler, M. J. (2025).** *Startup hiring through firm-driven search: Evidence from Venture for America.* Strategic Management Journal, 46(8).  
Summary: [Knowledge@Wharton](https://knowledge.wharton.upenn.edu/article/the-hiring-trade-off-behind-startup-growth/)

- Startups with low reputation struggle to get applications → they **outbound** (firm-driven search).
- Firm-driven search is associated with **higher hire likelihood** (strong across funnel stages).
- Candidates hired after firm outreach were **~77% more likely to quit**.
- Mechanism: outreach **validates** and often causes candidates to **dial down their own search** → weaker comparative fit.
- Low-visibility / multi-role startups use outbound most — exactly Demigod’s ICP.

**Product implication:** Pure “we’ll spam you great people” worsens the Kim–Pergler problem. Demigod should sell **fit and mutual commitment**, not volume outbound:
- Required **90-day outcome** (shared success definition before intro)
- **Both say yes** before intro (candidate still active chooser)
- **90-day replacement** language (backs retention risk with skin in the game)
- Curated **3–5**, not blast lists

### 2.2 External hires cost more and underperform early
**Bidwell, M. (2011).** *Paying More to Get Less: The Effects of External Hiring Versus Internal Mobility.* Administrative Science Quarterly.

- External hires paid **~18–20% more** than internal promotes into similar jobs.
- Lower performance ratings for **first ~2 years**; higher exit rates.
- Incomplete information / firm-specific skill gap.

**Product implication:** Placement fee is small vs total external-hire risk. Helping founders get **fit right** (stage, stack, 90-day outcome, mutual yes) is the real value; **10% vs 15–25% agency** is a secondary, still honest wedge.

### 2.3 Stable matching (Gale–Shapley / Roth)
- Classic market design: one-sided optimization (employer ranking only) produces **unstable** matches — one side wants to rematch.
- **Deferred acceptance** with preferences from **both** sides → stable matching.
- Used in residency matching (NRMP); recent ML work studies learning preferences before matching (NeurIPS-class papers 2024+).

**Product implication:** “Human proposes → **both say yes**” is the operational form of two-sided stability. Do **not** claim we run Gale–Shapley on production data; claim the **design principle** honestly.

### 2.4 Contingency fee norms (industry, not academic)
- Typical contingency: **15–25%** of first-year base; **~20% median** for tech/startup placements (2025–2026 guides: Dover, Recruiting from Scratch, Paraform, etc.).
- Retained search often **25–33%** with upfront.
- Demigod: **10% only on hire**, candidates free, no subscription — honest undercut **if** we deliver real intros (pre-services: payments pending).

---

## 3. Positioning thesis (5 bullets)

1. **Matchmaking > assessment.** a16z: recruiting is many-to-many matchmaking. Demigod product is the **intro + mutual yes**, not ATS spam.
2. **Judgment is the product.** Talent engineering without judgment is spam. Demigod leads with **human read every profile** — systems (WIZ, board, events) exist to **earn** that conversation.
3. **Outbound without fit destroys retention.** Kim–Pergler: firm-driven search hires faster, quits more. Demigod’s 90-day outcome + mutual yes + replacement stance is the **anti-churn** design.
4. **External hire risk is huge; fee is the thin edge.** Bidwell: 18–20% pay premium + early underperformance. 10% placement is cheap relative to a bad hire; sell **close quality**, not just price.
5. **Two-sided markets need two-sided consent.** Gale–Shapley insight → “both say yes.” Employer-only blast platforms optimize the wrong objective.

---

## 4. What NOT to claim (hard)

- That we are “a16z-backed,” in the fellowship, or “built like Cursor’s talent eng team.”
- That we run production **AI agents**, relationship graphs, or automated technical evals today.
- That we “guarantee” retention beyond the **stated 90-day replacement** product language.
- **SLA / 48h** response times.
- Fake pilots, named founders, simulated match counts.
- That 10% is “proven cheaper outcome” (no longitudinal Demigod data yet).
- Full Stripe/SMS live when still **pending**.

---

## 5. Site / GTM implementable slices

| Priority | Slice | Files | Why |
|----------|-------|-------|-----|
| P0 | FAQ + fee honesty: 10% vs typical 15–25%; mutual yes; 90-day fit | `demigod-foot-core.js` | Encodes research; no new claims |
| P0 | Trust / hero: two-sided match + anti-spam judgment line | foot-core COPY | a16z judgment line, honest |
| P1 | Events FAQ: retention / mutual-yes research-backed copy | `demigod-events.html` | Educational, no fake metrics |
| P1 | Research doc (this file) + DM one-liners | `docs/` + GTM packs | GTM leverage |
| P2 | Ops: capture 90-day outcome in pilot logger / matching notes | pilot tools | Closes research loop in ops |

### GTM one-liners (honest)

- *“Agencies blast for 15–25%. Research shows pure firm-driven outreach hires faster but people leave more. We only intro when both sides say yes — and we start from the 90-day outcome.”*
- *“Talent engineering (a16z’s framing) is systems + judgment. Demigod is the human matchmaking layer: 3–5 curated SF fits, 10% only on hire. Stripe still pending; email from hello@.”*
- *“No AI cold blast. A human reads every profile. That’s the point.”*

---

## 6. Roadmap map (research → product, later)

| Horizon | Build | Research driver |
|---------|-------|-----------------|
| Now | Honest copy, 90-day WIZ, mutual yes, board honesty | Judgment + two-sided |
| Next (services live) | Stripe, SMS follow-up, real receipts | Earn conversation at scale |
| Later | Relationship graph / referral system / market maps | a16z talent-eng stack |
| Later | Preference learning before match (candidate + startup) | Gale–Shapley / bandit matching papers |
| Never without proof | “AI places you” / auto-send matches | a16z anti-spam line |

---

## 7. Citations (short list)

1. Torenberg, Booth, Kirsch — *Introducing the a16z Talent Engineer Fellowship* — a16z.news, 2026-06-18.  
2. a16z Build — Talent Engineer Fellowship program page.  
3. Kim & Pergler — SMJ 2025 firm-driven search / VFA.  
4. Bidwell — ASQ 2011 external vs internal mobility.  
5. Gale & Shapley 1962; Roth & Shapley market design (Nobel 2012 popular summary).  
6. Industry contingency fee surveys 2025–2026 (15–25% tech/startup).

---

*Agent note: update this file when new papers or live product capabilities change the honesty boundary. Prefer linking research to existing gates (board honesty, no SLA, pending services) over new marketing surfaces.*

---

## 8. Ship log (2026-07-10)

| Item | Status |
|------|--------|
| Research doc | This file |
| foot-core **v176** | Live CDN `https://files.catbox.moe/8tjw79.js` — mutual yes FAQ, fee 15–25% honesty, judgment copy |
| foot-core **v177** | Disk — softens “90-day replacement guarantee” → “once payments are live and a hire is placed” (Claude honesty flag). Catbox reupload flaky (0-byte responses) — pending |
| Events CDN | `https://files.catbox.moe/m22wy3.html` + data `4alt6r.json` |
| DM snippets | `demigod-outreach/RESEARCH-DM-SNIPPETS-2026-07-10.md` |
| Claude (Sonnet) review | Approve v176; flag hard guarantee; next = GTM DMs not more code |

**Live metrics:** 115/100, foot v176, board roles=2 real=0, SENT-CONFIRMED=0.
