# Builders (builders.cv) — product mechanics

**Captured:** 2026-07-31 via live pages  
**Operator:** Pensieve Inc. DBA **Pensive** — 282 2nd St, Suite 450, San Francisco, CA 94105  
**Contact:** hello@builders.cv  
**Related:** Exceptional campaign = marketing surface on same stack.

---

## Surfaces

| URL | Role |
|-----|------|
| https://builders.cv/ | Candidate home: Build. Show. Get Hired. |
| https://builders.cv/business | Company “talent partner” |
| https://builders.cv/get-certified | Take-home certification details |
| https://builders.cv/refer | Referral economics (fee disclosure) |
| https://builders.cv/exceptional/entry | Exceptional campaign auth (email OTP) |
| https://exceptional.builders/ | Time-boxed campaign (closes 2026-08-09 PT) |
| https://exceptional.builders/environment-demo | Sample assessment IDE |
| https://builders.cv/terms-of-service | Legal (updated 2026-07-01) |
| https://builders.cv/privacy-policy | Privacy (updated 2026-05-26) |

---

## Candidate funnel

### 1. Submit your work
- Sign up; system pulls **public signals**: LinkedIn, GitHub, hackathon/olympiad records, founding history  
- Privacy: OAuth tokens for GitHub/LinkedIn/Google; URLs you provide may be re-fetched  
- Profile structured/summarized (AI-assisted)

### 2. Get certified (optional but unlocks network)
- Full-stack web take-home; **AI agents allowed**  
- **Timer:** 60 minutes; starts when candidate clicks Start Assessment  
- **Auto evaluation** after submission  
- Optional **30-minute** feedback call with Builders reviewer (pass or fail)  
- get-certified claim: “Passing it unlocks every company on the network”  
- Exceptional FAQ also mentions 15-minute debrief (campaign copy may differ from platform 30m optional)

### 3. Get hired
- “Our team works with you directly to pitch you to companies that fit, fast-track you through their hiring process, and follow through until you're placed.”  
- Privacy: human team reviews AI profile selections before share with companies; companies make hiring decisions  
- Terms: **no guarantee** of employment, interviews, or outcomes  

### Auth
- Exceptional “Take the test” → builders.cv/exceptional/entry → **email + 6-digit code**  
- Sign Up / Login on main site  

### Geography
- US-only targeting (privacy + terms)

---

## Assessment environment (demo)

Sample task (not real take-home): frequent-flyer **miles ledger** — idempotent earns, concurrent redeem safety, FIFO expiry, no negative balance, daily redeem limit. Stack: drizzle SQL, server TS, React UI, tests. Scaffold: AGENTS.md, CLAUDE.md, PLAN.md. IDE shows Claude Code + Codex + usage meter.

---

## Company-side (B2B)

From /business:

- “We assess candidates through real work and help you recruit AI-native technical talent end to end.”  
- Role types marketed: FDE, full-stack, mobile, backend, platform, design eng, GTM eng, AI agent eng, ML, frontend, infra, data, DevOps/SRE, QA  

Partner logos (public): Ramp, BigPanda, Sekai, Blockit, Clair, Foresight Health, Incandor, Scrollmark, MochaCare (+ Exceptional also names Pensive, Poetic, Andera).

---

## Economics (from /refer — critical for Demigod)

Public referral page states:

| Item | Stated terms |
|------|----------------|
| **Company fee (first hire)** | **10% of first-year cash pay (base plus bonuses)** |
| **Company fee (after first)** | **15%** of first-year cash pay |
| **Referrer cut** | **20% of Builders’ fee** on every qualifying hire |
| **Payout gate** | Paid after hire has **stayed 90 days** |
| **Candidate intros** | Unlimited; pay if placement within 12 months of intro |
| **Company intros** | New-to-Builders company; earn 12 months from first hire |
| **Example** | $150k package → ~$3,000 first hire / ~$4,500 later to referrer (20% of 10%/15%) |
| **Headline** | “Your intros could earn you $40,000” (scaled company-intro example) |

**Demigod comparison:**

| | Demigod | Builders (stated) |
|--|---------|-------------------|
| First hire fee | 10% of **first-year base only** | 10% of **base + bonuses** |
| Later hires | Same 10% base (no public escalator) | **15%** cash |
| Equity | Explicitly excluded | Not stated on refer page |
| Talent | Free | Free entry |
| Guarantee | 90-day replacement (pending live payments language) | 90-day stay for **referrer payout**; no hire guarantee |

**Implication:** Builders is a **direct fee-model peer**, not only an assessment peer. Demigod is **cheaper on cash definition** (base-only) and **no 15% escalator** publicly.

Terms of Service (2026-07-01) describe a hiring marketplace but **do not** restate the 10%/15% figures (found only on /refer).

---

## Privacy / AI handling (documentable)

- Legal entity: Pensieve Inc. DBA Pensive  
- AI: summarize profiles, surface matches; **human reviews** before company sees selection  
- “We do not sell or license your personal information to third parties to train their AI”  
- Aggregated/de-identified data may train **their own** models  
- Share profiles with companies is core purpose  

---

## Exceptional campaign vs always-on network

| | Exceptional | Builders always-on |
|--|-------------|-------------------|
| Close date | Aug 9, 2026 11:59pm PT | Ongoing |
| Framing | 1 assessment · 20 companies · Pensive final round | Pass once · whole network |
| Entry | Same builders.cv stack | Same |

---

## Testimonial (partner-side anecdote)

get-certified:

> “One day after taking Builders’ assessment, I had an offer from Clair, without any additional technical interviews and with better compensation than my initial offer. Builders listened to what I wanted and moved fast.”  
> — **Jivin Yalamanchili**, hired at Clair  
> (Clair noted as backed by a16z and Khosla · $11.6M seed)

**Grade:** Host-published anecdote; supports skip-tech-screens for **at least Clair once**.

---

## Claims evidence table

| Claim | Grade |
|-------|--------|
| Free candidate entry | **Documented** (marketing) |
| 60-min timer on Start | **Documented** (get-certified) |
| AI agents allowed | **Documented** |
| Auto evaluation | **Documented** (get-certified) |
| Human review before company share | **Documented** (privacy) |
| 10% then 15% company fee on cash | **Documented** (/refer only) |
| 20% referral of fee | **Documented** (/refer) |
| Pass unlocks every company | **Host claim** |
| Skip résumé + first tech round | **Host claim** + Clair anecdote |
| Exactly 20 companies | **Host marketing**; 12 logos public |
| Blockit raised $20M | **Mismatch** vs $5M Sequoia seed press |
| Employment guaranteed | **False** (terms: no guarantee) |
| US-only | **Documented** |

---

## Changelog

| Date | Note |
|------|------|
| 2026-07-31 | Full mechanics from live pages; fee discovery on /refer |
