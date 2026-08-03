# Competitor + UX Inspiration — 2026-07-12

**Mode:** Research for GTM positioning + *future* UX. Do **not** rewrite site.  
**Live Demigod score:** 115/100 · FIX decision stands.

Sources: live scrapes of Wellfound, YC Work at a Startup, Demigod; multi-agent notes; public recruiting LP best practices.

---

## 1. Competitive map

| Player | Model | Strength | Weakness vs Demigod |
|--------|-------|----------|---------------------|
| **Wellfound** | Marketplace + job board + AI Autopilot | Scale (10M+ cands, logos, free ATS), dual CTAs (hire/job) | Noise; self-serve volume; not human mutual-yes SF curation |
| **YC Work at a Startup** | Closed network (YC cos) | Trust + founder access inside YC | YC-only; Demigod can serve non-YC SF seed |
| **Contingency agencies** | 15–25% on hire | Full-service white-glove | Expensive, slow, often spray resumes |
| **LinkedIn Easy Apply** | Volume apply | Ubiquity | Spam; no 90-day outcome matching |
| **Demigod** | Human mutual-yes, 10% on hire, SF seed focus | High-signal brief (90-day outcome), honesty, lower fee | Thin proof until first real pilot; no logos/scale story |

### Positioning (keep / sharpen in DMs, not fake site claims)
> **Demigod:** Human-curated SF seed intros — 90-day outcome first, mutual yes only, **10% on hire**. Not a job board.

Contrast lines for DMs:
- vs Wellfound: “Not another apply-button flood — a human proposes 3–5 only when both sides fit.”
- vs Agency: “Same white-glove intent, ~half the typical fee, founder-paced.”
- vs YC WAAS: “If you’re outside YC (or want non-YC talent), we still human-match Bay Area.”

---

## 2. What Wellfound does well (steal *after* pilot, carefully)

1. **Binary audience split above fold** — “looking for a job” vs “looking for candidates” (Demigod already has Hire / Join — keep equal weight).
2. **Social proof wall** — logos + big counters (8M matches). Demigod: **do not fake**. Use Douglas intros / first real placement only.
3. **Role/location chips** — browse paths. Demigod: optional later; for now deep-link `?wiz=startup` / `?wiz=engineer`.
4. **One profile, many apps** — candidate side. Demigod already “upload once.”
5. **Salary transparency messaging** — Demigod asks salary-range optionally; keep honest, not a calculator.

## 3. Conversion tactics to adopt (priority)

| # | Tactic | Now? | How without rewrite |
|---|--------|------|---------------------|
| 1 | Single primary CTA per scroll section | Yes | Foot already forces HIRE/JOIN — verify no CTA soup |
| 2 | Deep-link wiz modes | Yes | Share `/?wiz=startup` in DMs (already in Douglas pack) |
| 3 | Outcome-first brief (90-day) | **Differentiator live** | Keep required; never bury |
| 4 | Trust: “sample / example roles” labels | Live | Keep board honesty |
| 5 | Proof strip from real pilots only | After pilot | Placeholder OK; no logos |
| 6 | Mobile 44px targets on WIZ | Live in foot CSS | Verify on CDP mobile later |
| 7 | Email-only success path (pre-SMS) | Live | Keep pending SMS language |
| 8 | Google OAuth signup | **Not now** | Park until ≥10 WIZ/week |

---

## 4. Demigod live UX snapshot (static HTML)

- CTAs: HIRE SF STARTUP TALENT / HIRE TALENT / FIND TALENT / JOIN NETWORK  
- Forms: startup-hire + candidate application in DOM  
- Modals: `#startup-modal`, `#jobseeker-modal` present  
- Follow-up: hello@trydemigod.com  
- No lorem / 48h in metrics  

**Gaps vs competitors (honest):** no logo wall, no volume metrics, no browse-by-role SEO pages, no AI autopilot — **and we should not fake them**.

---

## 5. Feature backlog inspired by competitors (post-pilot only)

1. Public “example brief” gallery (anonymized real 90-day outcomes)  
2. Founder one-pager PDF auto from WIZ submit  
3. Mutual-yes email templates + status board (private)  
4. Light talent network browse for founders *after* human filter  
5. OAuth LinkedIn prefill for engineer WIZ  

### Anti-list (pre-PMF)
- AI recruiter Autopilot clone  
- Free ATS  
- Fake counters / logos  
- National scale job board  
- Rewrite off Webflow  

---

## 6. UI micro-improvements (safe, optional, ranked)

Only if conversion data or Douglas feedback demands:

1. Ensure hero secondary line states **“10% on hire · human match · SF”** in one glance (copy polish in foot COPY).  
2. Sticky mobile Hire/Join bar already exists — confirm not double-rendered.  
3. Success state always shows hello@ (already).  
4. Prefill `?role=` query into role-title for DM deep links (small JS — later).  
5. Reduce Motions on prefers-reduced-motion (partially done).

**Default this week:** no foot thrash; site metrics green.

---

## 7. GTM plays this week (from research + status)

1. **Douglas Green call** 2026-07-14 — use call pack; ask for 2–3 founder intros  
2. **Top 3 DMs:** T0, Hellyeah, Weave — SEND-PACK-TOP3  
3. Remaining 5 ready-emails  
4. Every DM links `?wiz=startup` with 90-day framing  
5. Log SENT-CONFIRMED; no invent pilots  

---

*Grok research pass 2026-07-12 · feed multi-agent confirmations into exchange as they land.*
