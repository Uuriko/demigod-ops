# Demigod referral program — simple redesign

Updated 2026-07-27. Product + ops design. Implementation lives in `demigod-referrals.mjs` + site page `/?p=refer`.

## What “good” looks like (research + competitors)

| Practice | Why it matters | Demigod choice |
|----------|----------------|----------------|
| **Unique trackable link per referrer** | Attribution without sharing PII in the URL | Opaque 144-bit `rf_…` token |
| **Subject owns the form** | Avoids résumé harvesting / cold lists | Talent (or startup) submits via existing WIZ only |
| **Clear disclosure** | Trust + compliance | Reward comes from Demigod’s fee, never candidate pay |
| **Pay on outcomes, not clicks** | Quality + no gaming | Pay only after **90-day retention + client fee collected** |
| **Candidate benefit first** | Prosocial framing improves trust and targeting | Free private profile; candidate controls every intro |
| **Simple reward math** | Referrers must understand it | **20% of Demigod’s net placement fee** for talent intros (individuals) |
| **No multi-level / MLM** | Brand + legal | One hop only |
| **No auto-DM / blast** | Matches Demigod honesty | Drafts-only outbound; no referral spam tools |
| **Pay after cash is real** | Agency standard: don’t front payouts | `settle` records observed payment only; Stripe later |

**Industry anchors (not Demigod quotes):** employee-referral programs win on quality/speed when the share link is unique and rewards are outcome-tied; recruiting partners often take a cut of placement fees after start/guarantee periods; marketplace job boards (Wellfound, WAAS) rarely run public cash referral-to-pay for strangers—Demigod’s model is closer to **approved network referrers** than an open affiliate program.

**Demigod commercial baseline:** startups pay **10% of first-year base salary**, excluding equity, discretionary bonus, commission, and benefits, when a hire starts (written terms). Candidates never pay. Referral reward is a **share of Demigod’s collected net fee**, not of salary.

## Simplified product (talent-first)

### One sentence
An approved person gets **one unique link** to share personally; the candidate submits their own free profile and controls every intro. When that person is hired through Demigod, stays **90 days**, and the startup’s fee is **paid and retained**, the referrer becomes eligible for **20% of that net fee**—never 20% of salary (cash; payout tooling pending).

### Happy path (operator + referrer + talent)

```
1. Referrer wants in  →  emails potter@trydemigod.com (or ops mint)
2. Ops creates link   →  bin/dg referrals mint-talent --name --email
3. Ops approves       →  written agreement evidence + --i-reviewed
4. Ops sends pack     →  bin/dg referrals pack <linkId>  (one personal message + one URL)
5. Referrer shares    →  personally, with the included disclosure
6. Talent applies     →  /?referral=rf_…&wiz=engineer  (existing WIZ + disclosure UI)
7. Human matching     →  existing inbox / pairs / mutual consent
8. Hire starts        →  funnel hired + evidence
9. Fee paid           →  funnel paid + evidence
10. Day 90            →  bin/dg referrals retain …
11. Eligible          →  reward earned (ledger)
12. Pay referrer      →  bin/dg referrals settle … (observed cash; Stripe later)
```

### Unique link shape (today)

Works with current Webflow + foot (no new backend host required). Prefer the **short** form when sharing:

```
https://www.trydemigod.com/?r=rf_<opaque>&wiz=engineer
```

Foot normalizes query aliases into the canonical form before form submit + disclosure:

| Form | Example |
|------|---------|
| Short (preferred share) | `/?r=rf_…&wiz=engineer` |
| Canonical | `/?referral=rf_…&utm_source=referral&utm_campaign=partner-network&wiz=engineer` |

- Same token on hiring variant (`wiz=startup`) for company intros if ever used.
- Token is **not** an account login; it is **revocable**.
- First eligible **completed** submission wins attribution (click alone does not).
- Operator pack includes one candidate-first **copy-paste share message** with mandatory disclosure.

### Reward rules (snapshot on claim — do not freestyle)

| Referrer | What they introduce | Reward |
|----------|---------------------|--------|
| Individual (cash) | Talent who is retained after hire | **20%** of net placement fee |
| Individual (cash) | Startup’s **first** retained hire | **10%** of that fee |
| Hiring partner | Link-sourced talent retained | **10% company credit** (never personal cash) |

**Net placement fee** = fee Demigod actually collected and retained (not salary × 20%). Integer basis points only.

### Explicit non-goals (keep simple)

- No public self-serve portal that mints links without human review  
- No multi-level, no “refer a referrer”  
- No auto-email/SMS of candidates  
- No Stripe Connect in v1 (ledger + observed settle only)  
- No portal, leaderboard, points, streaks, or automated invite blasts
- No candidate-ranking advantage for referrals
- No inventing RSVPs, hires, or “SENT” for referral marketing  

## Operator cheat sheet

```bash
# Mint + print talent-referrer pack (creates pending link)
bin/dg referrals mint-talent --name "Alex Chen" --email alex@example.com

# After written agreement on file
bin/dg referrals approve <linkId> --evidence path/to/agreement.pdf --beneficiary-id alex-chen --i-reviewed

# Re-print copy pack for the referrer
bin/dg referrals pack <linkId>

# Status (redacted)
bin/dg referrals status
```

Lifecycle after a referred talent submits still uses: `sync` → `qualify` → `hire` → `retain` → `settle` (evidence-gated; see `demigod-referrals.mjs`).

## Public surface

- `/?p=refer` — explain program, unique-link idea, timeline to pay, honest “payout tooling pending”
- `/?p=partners` — compatibility alias to the consolidated referral page
- Landing disclosure already in foot when `?referral=` is present  

## Why this is “redesign” not rewrite

`demigod-referrals.mjs` already implements the hard parts (opaque codes, claims, first-submission wins, hire/retain/settle evidence, no money movement). The redesign is **product simplification**:

1. Candidate-benefit-first story and one operator mint/pack path  
2. Clear public page for “how do I refer?”  
3. Honest pay timeline (90 days + fee paid)  
4. Keep company-credit partners secondary  

## Deferred until volume proves the need

- Production Stripe payouts / W-9 collection (1099 via Connect/Deel/Tremendous when live)  
- Optional product decisions (research only — not auto-shipped): shorter claim window (120d vs 365d); incremental thirds over 90d vs single post-90 eligibility  

## Competitor notes (why this shape)

- **Employee-referral software** (ERIN, Drafted, Ashby modules): unique share link + outcome pay (often split hire/retention). We keep one eligibility after day-90 + fee paid.  
- **Recruiter marketplaces** (e.g. Paraform-style): pay on placement milestones after guarantees — same spirit as retain → settle.  
- **Contingency recruiting**: 15–25% of first-year base salary is a common market frame; Demigod client fee stays **10%**; referrer gets **20% of Demigod’s net fee**, not of salary.
- **Open affiliate self-serve** (PartnerStack-style): skipped — approved network only, no multi-level, no auto-DM.
