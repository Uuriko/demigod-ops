# Demigod — outside-in research, 2026-08-04

Not an ops doc. Research into the market, the regulatory environment, and
marketplace mechanics, framed against one fact from the control board:

```
board_has_real_role     boardRoles=3, all sample
pairs_has_real          real=0  sample=0  — delivery loop empty
phase2_has_accepted     acceptedForDelivery=0
```

142 tools, honesty gates, control boards, a shipping spine — and zero
transactions. **The bottleneck is not tooling.** Everything below is aimed at
that gap. Legal items are research, not legal advice; the California section in
particular is worth an hour with an employment attorney.

---

## 1. The biggest find: California turned your weakness into a product

**California FEHA automated-decision-system regulations took effect 2025-10-01.**
The definition is deliberately broad — it covers tools that *screen, score, rank,
or recommend* candidates, **even where a human makes the final decision**. And
critically: an employer deploying a third-party ADS **retains full FEHA liability
for discriminatory outcomes the tool produces**.

Layered on top, CCPA/CPRA now requires notifying applicants before automated
decision-making technology is used, often with a path to request human review.

### Why this matters more to you than to anyone else

Every competitor is shipping an AI screener. In California, each one of those
hands the employer a liability they cannot delegate. Meanwhile the regulations
make an employer's anti-bias testing — its quality, scope, and *recency* —
admissible evidence in a discrimination claim.

Demigod's design is the opposite of an ADS, and this is already enforced in code:

- `structured_hiring_no_score` — control board asserts **no fitScore, no trustScore**
- `demigod-role-packet` — "Scorecard + evidence-required review notes; **no AI verdict**"
- `demigod-call-note` — "no score; never auto-changes pair"
- `DEMIGOD-COMPRESSED-STATE.md` — "Matching decisions are handled manually and are
  not an agent automation target"

You have been treating "manual, doesn't scale, no scoring" as the thing to
apologize for. In California in 2026 it is a **compliance-grade feature**, and
`bin/dg` already emits the receipt that proves it.

### The uncomfortable half

The same breadth cuts toward you. `suggestMatches`, `proposeForCandidate`, and
`decideMatch` in `demigod-matching-engine.mjs` *recommend candidates*. "Human
decides" is explicitly **not** an exemption. Whether Demigod is a covered ADS is a
real question, not a rhetorical one — and the answer shapes what you can claim.

**Worth doing:** get this assessed, then decide deliberately whether to position
as "not an ADS" or as "an ADS with published bias testing." Both are defensible.
Drifting between them is not.

---

## 2. Cold start: you may be seeding the wrong side, or the wrong segment

Marketplace research is blunt:

- **Two-thirds of failed marketplaces die on the supply side**, not demand (a16z)
- Most die of **liquidity failure in years 1–3**, after launch, not before
- **"If neither side has standalone urgency, your marketplace dies in cold start
  regardless of which side you pick"**

That last line is the one to sit with. Not "which side first" — *does either side
have standalone urgency without the other?*

**What you already do right:** `demigod-role-ledger` polls public SF ATS boards
daily. That is a genuinely clever cold-start move — you observe real demand
without onboarding a single employer. Most marketplaces can't see demand until
someone signs up.

**The gap:** observed roles are not engaged employers. `boardRoles=3, all sample`
is the receipt. Observation has not converted to a transaction, and the research
says the conversion — not the observation — is where marketplaces die.

---

## 3. The SF market is two markets, and only one is addressable

2026 Bay Area data:

| Signal | Number |
| :--- | :--- |
| Entry-level AI/ML hiring, 2025 | **−73.4%** |
| Entry-level hiring overall, YoY | −6% |
| Share of global AI eng roles in Bay Area | 32% |
| CA share of US AI startup funding, 2025 | 80% |
| SF senior AI engineer | only US city where you can run **5 concurrent offers, bottom one $400K** |

**Senior AI engineers do not need you.** They have five offers. A marketplace adds
nothing to someone with that much leverage.

**Early-career is a glut**, down 73.4%. Enormous supply, collapsed demand.
Employers will not pay for access to a glut.

The middle is where matching is genuinely hard and someone will pay for it.

### And the line that should reshape your GTM

> *"the open postings are a small fraction of the actual hiring happening behind
> **warm intros and direct sourcing**"*

Your role ledger polls **public postings** — by this account, the minority channel.
Meanwhile `demigod-intro-path.mjs` already exists: *"Manual warm-intro paths;
human strength+evidence only; no mail scrape/auto-send."*

You built the tool that matches where the market actually transacts, and you're
feeding the funnel from the channel where it doesn't. That asymmetry is worth
more attention than any remaining engineering task.

---

## 4. Pricing: absent from the evidence, and the models have moved

| Model | Rate |
| :--- | :--- |
| Fixed fee | **$4,900 – $21,900 per hire**, flat regardless of salary |
| Contingency | 20–25% of first-year salary |
| Retained | 25–33%+, paid in tranches |

Fixed-fee is reported as the most predictable for startups, and the emerging
risk-shift is *no-hire-no-fee + replacement guarantee*.

**Fit with your constraints:** fixed-fee is the only model that doesn't create an
incentive to inflate salary — which matters unusually much for a product whose
core claim is honesty. It also survives your "no invented SLA / no fake metrics"
rule, because a flat number needs no performance promise to justify it.

Nothing in the repo shows a chosen price. `verify-live` checks a `pricingCompare`
element, so the site references pricing, but no model is committed in the SoR.

---

## 5. The asset you're under-using: events

You have `demigod-events-bot`, `demigod-hiring-pulse`, SF community discovery, and
a public events API — all currently **down since the wipe**, all in draft mode.

Warm intros do not form on job boards. They form in rooms. If the hiring that
matters happens behind warm intros, and you run the events infrastructure for an
SF technical community, then events are not a side project — **they are the
supply-and-demand acquisition channel**, and the intro-path tool is the conversion
step.

That reframes EventsBot from "marketing" to "the top of the only funnel that
matches how this market actually hires."

---

## Five questions worth more than the next feature

1. **Are you an ADS under California FEHA?** Get a real answer. It determines
   whether "no scores, human decides" is a marketing line or a defensible legal
   position — and it's the sharpest differentiator available to you.
2. **Which side has standalone urgency?** If neither does, no amount of tooling
   saves the loop. Seed-stage startups making their first 1–3 technical hires,
   with no in-house recruiter, no legal team, and no budget for 25% contingency,
   are the most plausible answer.
3. **Why is the funnel fed from public postings** when the sourcing that matters
   is warm intros — and you already built the warm-intro tool?
4. **What is the price?** Fixed-fee fits the honesty constraint better than
   contingency and needs no SLA to justify.
5. **Is EventsBot the actual product surface** rather than an adjacent one?

## What I'd deliberately not do

- Build more matching automation — it worsens the ADS question and doesn't touch
  the empty loop
- Add scoring of any kind — it's the one thing your own control board forbids, and
  now there's a legal reason as well as an honesty one
- Chase senior AI engineers — they have five offers
- Optimize the site further before a single real role exists

---

## 2026-08-06 website-first market refresh

Current disk evidence is broader than the original brief: the directory contains
2,902 named companies, 505 companies with public ATS openings, and 16,062 open
ledger roles across 501 employers. This is observation coverage, not evidence that
an employer has asked Demigod to recruit.

The current competitor set occupies four larger product shapes:

- YC Work at a Startup and Wellfound are scaled job/talent marketplaces.
- Juicebox is a cross-source candidate search and automated-outreach product.
- Dover is an ATS plus fractional-recruiter marketplace.
- Paraform is a recruiter marketplace with AI-assisted sourcing; its strongest
  intent label, “Qualified Role,” requires a recent employer check-in rather than
  merely observing a public posting.

Primary sources: [YC jobs](https://www.ycombinator.com/jobs/),
[Wellfound](https://wellfound.com/about), [Juicebox](https://juicebox.ai/),
[Dover](https://www.dover.com/), [Paraform](https://www.paraform.com/for-companies),
[Paraform qualified roles](https://www.paraform.com/blog/qualified-roles), and
[Ashby startup hiring report](https://www.ashbyhq.com/talent-trends-report/reports/startup-hiring).

The weakest sufficient product conclusion is **not** “build another marketplace.”
The present website already has the useful narrow loop: searchable startup and
role evidence → honest provenance/date labels → an existing human-reviewed hiring
brief. The next website work is therefore reliability and comprehension of that
loop, not a new ATS, profile database, automated outreach layer, or unverified
“active hiring” badge.

Ranked website work:

1. Ship and live-attest the prepared navigation, FAQ, schema, and mobile-action
   repairs when publication is authorized.
2. Re-run the whole sitemap/control/form harness against that exact live release;
   repair only demonstrated failures.
3. Measure whether directory visitors can understand “observed role” versus
   “employer engaged” and reach the existing hiring brief. Improve the current row
   CTA/copy only if the bounded check finds confusion or a dead path.
4. Add employer-confirmed intent only after a real employer check-in exists; keep
   public-board observations explicitly separate.

Skipped: sector filters, candidate databases, recruiter marketplaces, ATS features,
and automated outreach. The existing search already indexes company descriptions
and tags, and none of those larger systems addresses the verified empty-delivery
loop more directly than the brief path already on the site.

---

# Part 2 — the precedent set

## 6. The graveyard: both direct precedents were absorbed

| Company | Model | Outcome |
| :--- | :--- | :--- |
| **Triplebyte** | standardized technical assessment as pre-vetted signal | acquired by Karat 2023 · assessment platform **shut down 2024** · sourcing network "Magnet" downsized · core service discontinued |
| **Hired** | candidate-profile marketplace, employers bid | began winding down + selling assets 2020, CEO resigned abruptly over Zoom · bought by **Vettery** Nov 2020 · rebranded Hired · **part of LHH Recruitment (Adecco) since June 2024** |

Two of the best-funded SF engineer-matching marketplaces, both ending inside
staffing conglomerates. Not a coincidence — the reported lesson is that
consolidation was necessary and the specialized assessment model could not
sustain itself independently.

### The finding that should settle an internal debate

**Triplebyte's model was scoring.** Standardized assessment producing a
pre-vetted signal. It died commercially in 2024 — and as of October 2025 the same
mechanism is a California regulatory exposure that transfers liability to your
customer.

Scoring is now wrong for two fully independent reasons. Whatever residual pull
there is toward adding a fit score, this is the answer. Your control board's
`structured_hiring_no_score` was right before either reason existed.

## 7. What's alive instead: community-owned distribution

**Pallet** is the live comparable, and it is not an assessment company. It is
infrastructure letting communities and creators run native recruiting for their
own audiences — talent collectives with Lenny Rachitsky, The Pragmatic Engineer,
and Packy McCormick. Reported: **$3.5M paid out to communities, 100k+ members
hired**, and roughly double competitors' response rate from community-sourced
candidates.

Pricing: **$0 upfront + 20% of base salary** for 1–3 roles; custom above that.

Two things follow.

**First, a correction to Part 1.** Pallet runs 20% contingency, not fixed fee.
The fixed-fee argument still holds on incentive grounds — it removes any pull
toward inflating salary, which matters disproportionately for an honesty-first
product — but the live community-recruiting comparable did not choose it. Treat
fixed-fee as a deliberate differentiator, not the obvious default.

**Second, the structural difference.** Pallet *rents* other people's communities.
Demigod would *own* one — SF, in person, via EventsBot and community discovery.
That is more defensible if the community is real, and worth nothing if it isn't.
It is a falsifiable bet, and the events infrastructure is how you test it.

## 8. The referral numbers make the case quantitative

Part 1 argued the funnel is fed from the wrong channel. The data:

| Metric | Referral / warm | Job board / cold |
| :--- | :--- | :--- |
| Apply-to-hire conversion | **28.2%** | 2–5% |
| Candidates hired | **30%** | 7% |
| Outreach reply rate | 21–34% | 1–5% |
| Response likelihood | 10–40× cold | — |

A referred candidate is hired roughly **4× more often** than a job-board
applicant. `demigod-role-ledger` polls public postings — the 7% channel.
`demigod-intro-path.mjs` is built for the 30% channel and is idle.

This is the strongest argument in either part of this document, and it is an
argument about where to spend attention, not what to build. The tool exists.

## 9. Signal without scoring — the central tension, resolved

If you can't score, how do you produce the signal employers pay for? The
assessment literature answers it:

- **Work samples have the highest predictive validity and lower disparity than
  cognitive tests**
- 2026 design rule: **under 60 minutes, graded against a published rubric of 4–6
  criteria**
- Cognitive tests: one signal in a battery, **never a single-stage filter**
- Public pre-application signal counts too — open source, talks, patents, prior
  trajectory

**The synthesis across all three research threads:** a human-graded work sample
against a *published* rubric produces real signal, is not an AI verdict, and the
published rubric is itself the anti-bias-testing evidence California weighs when
assessing a discrimination claim. One mechanism satisfies the honesty constraint,
the regulatory posture, and the employer's actual need.

That is compatible with `demigod-role-packet`'s existing shape — "scorecard +
evidence-required review notes; no AI verdict" — and with `matchEvidence`. What's
missing is the published rubric, not the machinery.

## 10. First customers, with no track record

> "Your first clients aren't buying your history — they're buying your capability
> to solve their current hiring problem and your willingness to work hard enough
> to prove it."

The recurring prescription: a clearly defined niche with genuine demand, and a
go-to-market aimed at **3–5 first clients**. Not a platform launch. Not
volume. Three to five.

`boardRoles=3, all sample` becomes a much smaller problem when the target is
three real ones.

---

## Revised: what I'd test first

1. **Are you an ADS under California FEHA?** Still the highest-leverage unknown.
   Triplebyte's death and the FEHA rules point the same direction, which is rare.
2. **Run the intro-path channel for 3–5 roles** and compare against the ledger's
   public-posting channel. The published data says 30% vs 7%; your own numbers
   would be the first real receipts on the board.
3. **Publish a work-sample rubric.** It's the missing piece between "no scores"
   and "employers need signal," and it doubles as compliance evidence.
4. **Decide the fee model deliberately** — fixed-fee as differentiator, or 20%
   contingency as the community-recruiting norm.
5. **Test whether the SF community is real** via events. Pallet's whole model says
   community distribution works; it also says the community has to exist first.

**Sources — Part 1:** Manatt, Jackson Lewis, and Saul Ewing on the California FEHA
ADS regulations; DLA Piper and Ogletree on the EU AI Act Digital Omnibus deferral
to 2027-12-02; a16z marketplace failure data via RaftLabs and GoPractice;
Pragmatic Engineer and Built In on the 2026 Bay Area market; funded.club and Tech
Magazines on recruiting fee models.

---

# Part 3 — the academic literature

Method: go to the fields that formally study what Demigod *is* — market design,
labor economics of referrals, personnel-selection psychometrics, network science —
and specifically audit whether the canonical numbers still hold.

## 11. Analogical import: the AEA signaling mechanism

**The single most transferable idea in this document.**

Coles, Cawley, Levine, Niederle, Roth & Siegfried, *JEP* 24(4), 2010. The
economics job market had the exact pathology Demigod faces in miniature:
thousands of applications, hundreds per employer, and — the key line —
**employers declined to interview strong candidates they assumed were out of
reach**. Good matches died because interest could not be credibly conveyed.

The fix was not an algorithm, a score, or a centralized clearinghouse. Each
candidate may send **exactly two signals** of special interest. That's it.

> *"What gives the signals credibility is that each applicant is limited to two,
> so there is an opportunity cost to sending a signal."*

Credibility comes from **scarcity**, not from a model's judgment.

Why this fits Demigod better than any competitor:

- It produces real signal **without scoring anyone** — no ADS exposure, no
  fitScore, nothing your control board forbids
- It is *minimalist* — it works at 3 roles, not only at 3,000. Most matching
  mechanisms need scale; this one doesn't
- It directly attacks congestion, which is one of Roth's three requirements for a
  market to function at all
- Scarcity is self-enforcing honesty: a candidate with two signals cannot spam,
  and an employer knows that

Concretely: each candidate gets 2–3 signals per cycle; each employer the same.
The scarcity carries the information. This is buildable in a week and is the most
defensible product idea surfaced by any of this research.

## 12. Failure-mode map: you have a thickness problem, not a product problem

Roth's taxonomy (*What Have We Learned from Market Design?*, NBER w13530 / *EJ*
2008) says a marketplace must do three things:

| Requirement | Meaning | Demigod today |
| :--- | :--- | :--- |
| **Thickness** | attract enough of the potential participants | `boardRoles=3, all sample` — **failing** |
| **Congestion** | let participants evaluate enough alternatives to choose well | not yet binding at n=3; §11 is the pre-built answer |
| **Safety** | make it safe and simple to participate | **your strongest asset, and you don't call it that** |

The reframe: your honesty constraints — no fake metrics, no invented SLA,
draft-only outbound, no auto-DM, sample-labelled board entries — are not brand
positioning. In Roth's technical vocabulary they are **safety**, one of the three
things that determines whether a market works at all. You have over-invested in
the requirement you can satisfy at zero scale and under-invested in thickness.

Also worth naming: SF tech hiring shows classic **unraveling** — exploding
offers, pre-emptive hiring, transactions creeping earlier. Roth documents that
unraveling makes thick markets thin. A market suffering unraveling is one where a
credible, slower, safer venue has a real role — if it can get thick.

## 13. Canonical-number audit: the assessment literature was revised

**Sackett, Zhang, Berry & Lievens (2022), *Journal of Applied Psychology*
107(11), 2040–2068.**

The Schmidt–Hunter validity hierarchy that every assessment vendor cites was
built on range-restriction corrections that systematically **overcorrected**. The
authors reviewed five common approaches and found each produces substantial
overcorrection. Conclusion: the validity of many selection procedures **has been
substantially overestimated**.

The headline reversal: general cognitive ability testing is "considerably more
modest than previously thought" and now **ranks below structured interviews and
biodata**.

This is a third independent strike against the Triplebyte model. It didn't only
fail commercially (§6) and become a California liability (§1) — **the science it
rested on was revised downward.** Structured human review plus evidence is closer
to what the current literature supports than an algorithmic test is.

Practical: keep the work-sample-plus-published-rubric design from §9, and drop any
temptation toward a cognitive screen. The 2026 guidance is explicit that cognitive
tests should never be a single-stage filter.

## 14. Causal referral evidence — and a correction to Part 2

**Burks, Cowgill, Hoffman & Housman (2015), *QJE* 130(2), 805–839.** Personnel
data from nine firms across call centers, trucking, and high-tech.

What they actually found:

- Referred applicants are more likely to be hired **and** more likely to accept
- **Similar** productivity to non-referred workers on most measures
- **10–30% less likely to quit**
- Substantially better on rare **high-impact** outcomes — patents in tech, avoided
  accidents in trucking

**The correction.** Part 2 leaned on vendor conversion stats and implied referrals
produce *better* candidates. The causal evidence says otherwise: on average they
are **not more productive**. The durable gains are **retention** and **tail
outcomes**.

This is a better pitch, not a worse one, and it's one you can make honestly. For a
seed-stage startup making its first one to three technical hires, a 10–30% lower
quit probability is enormous — early attrition at that size is an
existential event, not a metric. "They stay" is defensible, evidence-backed, and
survives your no-fake-metrics rule. "Better candidates" would not.

## 15. Which ties — a design parameter, from causal data

**Rajkumar, Saint-Jacques, Bojinov, Brynjolfsson & Aral (2022), *Science*.** Five
years of randomized experiments on LinkedIn's People You May Know: **20M people,
2B new ties, 600k jobs.** Causal, not correlational — rare here.

The finding is not "weak ties win." It is an **inverted U**: weaker ties increase
job transmission *up to a point*, then diminishing returns. **Moderately weak ties
produce the most job mobility** — between the very weakest and average-strength
ties.

`demigod-intro-path.mjs` already records "human strength+evidence." You are
already capturing the input variable. The instruction from the data: **target the
middle of the curve.** Not the founder's closest circle — too strong, redundant
information, everyone already knows the same people. Not cold outreach — too weak
to transmit. The moderately-weak band is the yield zone, and almost nobody
operationalizes it deliberately.

## 16. Not all referrers are equal — and the risk that creates

**Montgomery (1991), *AER* 81(5), 1407–1418.** The foundational referral model:
it is optimal for firms to recruit through referrals from their **most productive**
employees, because high-ability workers disproportionately know other high-ability
workers ("inbreeding bias"). Referrals work by reducing **adverse selection** —
the referrer supplies information about unobserved productivity that no résumé
carries.

Two consequences:

**Design:** weight intro paths by the *referrer's* demonstrated track record, not
only by tie strength. Strength and source quality are different variables, and
§15 only covers the first.

**Risk — and it loops back to §1:** inbreeding bias means referral networks
**reproduce their own composition**. A referral-first hiring product is, by
construction, a disparate-impact exposure under FEHA. This is the strongest
argument for pairing the intro-path channel with the published work-sample rubric
from §9: the rubric is the objective counterweight, and it is exactly the
anti-bias-testing evidence California weighs.

Referral-first *without* a rubric is the one combination this research says not to
build.

---

## What changed my mind across all three parts

1. **Scarce signaling (§11) beats everything else on the buildable/defensible
   frontier.** No score, no scale requirement, attacks a named market failure.
2. **Sell retention, not match quality (§14).** The causal evidence won't support
   the stronger claim, and the weaker claim is worth more to a seed-stage buyer.
3. **The empty loop is a thickness failure (§12)** with a known literature, not a
   mystery.
4. **Referral-first needs the rubric (§16)**, or it is a discrimination claim
   waiting to happen.
5. **Three independent lines now say don't score (§1, §6, §13)** — regulatory,
   commercial, scientific. That question should be closed.

**Sources — Part 3:** Coles, Cawley, Levine, Niederle, Roth & Siegfried, *JEP*
24(4) 2010 (AEA signaling); Roth, *What Have We Learned from Market Design?*, NBER
w13530 / *Economic Journal* 2008; Sackett, Zhang, Berry & Lievens, *J. Applied
Psychology* 107(11) 2022, 2040–2068; Burks, Cowgill, Hoffman & Housman, *QJE*
130(2) 2015, 805–839; Rajkumar, Saint-Jacques, Bojinov, Brynjolfsson & Aral,
*Science* 2022 (doi:10.1126/science.abl4476); Montgomery, *AER* 81(5) 1991,
1407–1418.

**Sources — Part 2:** Wikipedia and TechCrunch on the Vettery/Hired acquisition;
Terminal.io, Arc, and JoinNextDev on the Triplebyte shutdown; Messari, Venture
Scout, and Consumer Startups on Pallet and Braintrust; Pin, Zippia, and Cadient on
referral conversion data; GrowLeads and daily.dev on warm-versus-cold reply rates;
ClarityHire and Talentera on predictive validity of hiring methods; RecruitBPM on
first-client acquisition.
