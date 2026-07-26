# Demigod — What to work on next (Claude × Codex brainstorm, 2026-07-26)

A real back-and-forth (Claude proposed, Codex attacked, both converged) + fresh market searches +
data verification. The full menu of options is below, each with a verdict. Then the one recommendation.

## The convergent verdict (after arguing)

**Sell one "hard-role rescue" — reframed honestly as a hard-role *market read + best-effort intro*.**
Not vanity traffic, not more supply-side building. The bottleneck was never the site; it's that nobody
has ever been sold to. This validates buyer, urgency, pricing, sourcing, and matching in one motion.

Codex's opening ("3 screened candidates in 7 days") was **withdrawn** once Claude pressed the supply gap
(potter has no talent network; the codebase shows generic scraping already produced *15 disqualifications
from 17 leads, zero mutual interest*). The honest, deliverable-solo v1 offer:

> *Give me one hard SF role — cash band, must-haves, measurable 90-day outcome. I'll run a focused
> search and personally vet fit and genuine interest. In seven days you get an honest market read:
> available supply, objections, comp gaps, and any qualified, interested people I found. Intros require
> both sides' yes. No candidate-count or hire-date guarantee. Nothing upfront; 10% of first-year cash
> only if someone I introduce starts.*

The **market read is deliverable even with zero supply** (it's research + honest assessment) — that's
what makes it safe to sell now without breaking the honesty brand.

## The one build worth doing this week: a role **first-seen ledger**

Extend the existing ATS poller (no new crawler/UI/Pulse feature). Per role, store
`provider, board, jobId, company, title, location, url, firstSeen, lastSeen, closedAt, reopenCount`;
poll daily. **Only a successful board fetch may close a role** (timeouts preserve state — honest).
Trigger: **hard role + observed open ≥ 30 days**, using that exact "observed" wording.

Data verified 2026-07-26: Greenhouse exposes `first_published` (real posting date — a Stripe eng role
open since 06-02) and `updated_at`; Lever has `createdAt`; Ashby has `publishedAt` ("last published",
resets on repost). Native dates are inconsistent, so the **observed-open ledger is the robust honest
source**, seeded by `first_published` where reliable. This one artifact powers BOTH the per-company
sales trigger ("your infra role's been open 54 days") AND a sharper Pulse finding ("N SF startups have
roles open 60+ days"). Claude can build this.

## The full menu — every option, with a verdict

### A. Demand / GTM (the bottleneck)
| Option | Verdict | Why |
|--------|---------|-----|
| **Hard-role rescue / market-read offer** | ★ DO FIRST | Only move that tests a real buyer. |
| Role-first outreach: 20 recently-funded SF startups w/ an aging hard role | ★ DO (the channel) | Contact the hiring owner about ONE stuck role w/ role-specific evidence — not generic founder blasting. Solo-founder sweet spot: 50–100 personalized sends/day, 8–15% reply. |
| Job-age as the sales trigger | ★ DO (needs the ledger) | "Open 47 days" ≫ "we run a marketplace." Fresh, and we can extract it. |
| Target VC talent partners + fractional heads of talent | ⏳ AFTER 1 win | Each controls multiple employer intros — but only credible after one proven search. |
| Broad Pulse distribution (HN/X/slacks) | ⚠ COLLATERAL only | Without a conversion offer it's "content theater." Use one narrow finding per target, single CTA. |
| Paid ads | ✗ SKIP | No budget; wrong stage. |

### B. Product / matching
| Option | Verdict | Why |
|--------|---------|-----|
| Concierge fulfilment (manual match for the first brief) | ★ DO (with the offer) | The product IS potter doing it by hand at n=1. |
| Role-first candidate sourcing (mobility signals: open-to-work / layoff / farewell / leaving, matched to stack+comp+outcome) | ★ DO (per brief) | Real data killed generic scraping; role-first is the motion. |
| Preference-learning / algorithmic matching | ✗ LATER | Premature at n=0. |

### C. Data / content leverage (the moat question)
| Option | Verdict | Why |
|--------|---------|-----|
| Role first-seen ledger | ★ DO (the one build) | Powers trigger + Pulse; cheap; honest. |
| One narrow Pulse finding tied to the offer | ★ DO (as collateral) | e.g. "aging hard roles in SF" → CTA "get a 7-day market read." |
| Open the full dataset as a public good | ✗ TRAP | Attracts analysts/job-seekers/scrapers/competitors, not buyers. Release selective insights, not the asset. |
| Weekly Pulse newsroom | ✗ WORST TRAP | Becomes potter's unpaid media job before distribution exists. Ramp does this with a *hired content team*, post-scale. |

### D. Site / polish (backlog — supply-side, low demand-leverage now)
| Option | Verdict |
|--------|---------|
| Homepage how-it-works bug (2-line fix, root-caused) | Quick win, do opportunistically |
| FAQ trim + page merges | Nice-to-have |
| ~500-line scrub deletion (needs Designer source fix) | Real cleanup, blocked on Designer |

### E. Measurement / ops
| Option | Verdict |
|--------|---------|
| WIZ funnel analytics | ✓ DONE this session (live, anonymized, `node demigod-funnel-report.mjs`) |
| Durable analytics endpoint (tunnel rotates) | Small hardening; do when convenient |

### F. Strategic / wedge
- **Honesty and openly-licensed data are table stakes, NOT a moat** (Claude & Codex agreed). Defensibility
  comes *later* from proprietary response + interview + mutual-interest + hiring-outcome data, and repeat
  employer trust. Don't over-invest in the wedge as if it drives demand — it doesn't; it's credibility.
- **Niche correctly:** not "AI startups" (branding, not a pain). Niche by *scarce role × stage × working
  model* — e.g. seed–Series B SF companies hiring in-person AI-infra / data / security engineers.
- **Competitive read:** Mercor left general hiring (→ AI-training labor); Jack&Jill owns candidate-side
  conversational AI. The employer-first, hyperlocal, human-matched lane is open — but "open lane" ≠ demand.

## Where we disagreed (the argument, briefly)
- Claude over-rated the Pulse + the open directory data as a growth engine; Codex reframed them as collateral. Searches
  (Ramp's data-newsroom → NYT/WSJ citations) show data-media *works* — but only with a content team at
  scale, so Codex wins for *now*.
- Claude pressed that Codex's plan ignored **supply**; Codex conceded and produced the market-read offer +
  role-first sourcing (its strongest contribution).
- Both flagged the **honesty risk** in job-age ("first observed" ≠ real posting date) — resolved by the
  observed-open ledger + honest wording.

## Recommendation & division of labor
1. **Claude builds the role first-seen ledger** (this week) — extends the ATS poller, honest observed-open,
   seeds Greenhouse `first_published`. Output: a ranked list of SF startups with genuinely aging hard roles.
2. **Claude drafts the outreach collateral** — the market-read one-pager + 20 role-specific opener drafts
   (potter reviews/sends; no autonomous outbound).
3. **Potter runs the sales motion** — 5 calls / 1 live search / deliver one honest market read. This is the
   test that actually moves the business, and it's inherently a human, founder-led action.

*The uncomfortable honest line both agents landed on: everything we can build is preparation. The one
thing that breaks zero — a real conversation with a real SF employer about a real stuck role — only
potter can do. Our job is to make that conversation impossible to ignore (the ledger + the read).*
