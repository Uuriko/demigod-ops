# Assessment methods — research

Scope: what evidence-gathering methods exist for judging a candidate, what each
actually predicts, and which ones Demigod may own given the boundary already set
in [`DEMIGOD-FULL-SERVICE-RECRUITING-BLUEPRINT.md`](DEMIGOD-FULL-SERVICE-RECRUITING-BLUEPRINT.md)
§3, §12, §15.

Written 2026-07-31. Numbers below are from the published meta-analytic record,
not from Demigod data. Demigod has no placement outcomes yet, so nothing here is
validated locally.

## 1. The boundary this sits inside

The blueprint already decided two things:

- §3 / §15.5 — the **employer** owns technical and job-specific assessment.
  Demigod does not build an assessment platform.
- §12 — Demigod owns the **structured recruiter screen**: motivation, evidence
  against accepted criteria, constraints, open uncertainty, sharing consent.
  Explicitly "not a personality test, technical interview, or vibe check."
- §12.7 — no automatic rejection, no hidden personality inference, no protected-
  trait inference, no emotion/face/voice analysis, no culture-fit prediction.

So the practical question is not "should we build a second assessment for
non-technical roles." It is "what methods may the one screen legitimately use,
and which of them survive the §12.7 constraints."

## 2. The validity table

Sackett et al. (2022), reproduced as Table 1 of Sackett et al. (2023). This
supersedes the Schmidt & Hunter (1998) table that most recruiting content still
cites. Sackett's contribution was showing that decades of range-restriction
corrections were systematically applied backwards, inflating most estimates.

ρ = operational validity against overall job performance. B-W d = Black–White
mean difference in Cohen's d — higher means more adverse impact. Both matter;
neither alone decides.

| Predictor | S&H 1998 | ρ (2022) | B-W d |
|---|---|---|---|
| **Employment interviews (structured)** | .51 | **.42** | **.23** |
| Job knowledge tests | .48 | .40 | .54 |
| Empirically keyed biodata | .35 | .38 | .33 |
| Work sample tests | .54 | .33 | .67 |
| GMA / cognitive ability tests | .51 | .31 | .79 |
| Integrity tests | .41 | .31 | .10 |
| Personality-based EI | — | .30 | .22 |
| Assessment centers | .37 | .29 | .52 |
| SJT (knowledge) | — | .26 | .39 |
| SJT (behavioral tendency) | — | .26 | .34 |
| Conscientiousness — contextualized | — | .25 | −.07 |
| Interests | .10 | .24 | .33 |
| Emotional stability — contextualized | — | .23 | .09 |
| Ability-based EI | — | .22 | — |
| Rationally keyed biodata | — | .22 | .33 |
| Extraversion — contextualized | — | .21 | .16 |
| Conscientiousness — overall | .31 | .21 | −.07 |
| **Employment interviews (unstructured)** | .38 | **.19** | .32 |
| Agreeableness — contextualized | — | .19 | .03 |
| Openness — contextualized | — | .12 | .01 |
| Extraversion — overall | — | .11 | .16 |
| Agreeableness — overall | — | .10 | .03 |
| Emotional stability — overall | — | .09 | .09 |
| **Job experience (years)** | .18 | **.07** | .49 |
| Openness — overall | — | .06 | .10 |

Four things in that table change how a screen should be built.

**Structured interview is now #1 and also near-cleanest on adverse impact.**
Every other high-validity method (job knowledge .54, work sample .67, GMA .79)
carries two to three times the subgroup difference. Structured interviewing is
the rare method that is both the most predictive and among the least
discriminatory. It is also role-agnostic — the structure is the method; the
content changes per role.

**Structure is worth more than format.** .42 structured vs .19 unstructured is
the same activity, same hour, same interviewer. The delta comes entirely from
fixed questions, fixed order, and pre-committed rating anchors. This is the
single highest-leverage thing available, and it costs process discipline rather
than money.

**Years of experience predicts almost nothing (.07) and carries real adverse
impact (.49).** This is the sharpest actionable finding. "5+ years" filters are
the default currency of every job board in the roles feed, and they screen on a
near-zero predictor while excluding disproportionately. Blueprint §8.3's
requirement test already attacks this; the number is the ammunition.

**Interests jumped .10 → .24 when measured as fit between the person's interests
and the specific job's demands.** That is close to what a matching engine is
already trying to model. It is not a license to call the match score an
assessment — §12.7 governs — but it does mean interest-fit is a real signal
rather than a soft one, worth capturing explicitly in the screen instead of
inferred from a résumé.

## 3. Method-by-method, against the §12.7 constraints

**Structured interview — adopt. Already the plan.**
Fixed questions per competency, same order for every candidate on a search,
behavioral ("tell me about a time…") and situational ("what would you do if…")
both count. Rating anchors written before the first candidate. Independent
scoring before debrief (§15.8 already says this). Nothing here conflicts with
§12.7. This alone covers every role type; sales, ops, marketing and engineering
differ only in question content.

**Job knowledge tests (.40) — employer's, not Demigod's.**
Highest-validity method after structured interviews, but it is by definition
role-specific technical judgment, which §3 assigns to the employer. Also d = .54.

**Work samples (.33) — employer's, with the §15.5 fairness rules already written.**
Note it dropped from .54 to .33 and carries d = .67. Work samples are widely
treated as the obviously fair, obviously predictive option; on this evidence they
are middling on validity and poor on adverse impact. Worth knowing before
recommending one to an employer.

**Situational judgment tests (.26 / .26) — plausible future fit, not now.**
The one method that ports cleanly to non-technical roles without the employer
building anything: present realistic scenarios, score the response ordering.
Moderate validity, moderate adverse impact (.34–.39). Needs a scenario bank and
a scoring key per role family, and needs volume to calibrate. Demigod has 0
submissions in the inbox; there is nothing to calibrate against.

**Contextualized personality (conscientiousness .25, d = −.07) — blocked by §12.7
as written, and probably correctly.**
"Contextualized" means at-work framing ("at work, I…") rather than general
self-description, which roughly doubles validity. Conscientiousness is the only
predictor in the table with a *negative* B-W d, meaning it slightly favors Black
candidates — an unusual and useful property. But §12.7 forbids hidden personality
inference, and a disclosed, consented self-report inventory is a different thing
from hidden inference. If this is ever wanted, it is a deliberate policy change
to §12.7, made explicitly, not a quiet addition.

**Integrity tests (.31, d = .10) — strong on paper, high risk in practice.**
Good validity, lowest adverse impact of any high-validity method. But faking is
well documented, several states restrict them, and they read as hostile to
candidates in a market where Demigod's pitch is candidate-side trust.

**Biodata (.38 empirical / .22 rational) — needs outcome data Demigod does not have.**
"Empirically keyed" means the items are scored by their observed correlation with
performance *in your own hires*. That requires a body of placements with known
outcomes. Demigod has 4 pilots and 5 candidate touches. This is a method to
revisit after ~50+ placements with §22 outcome checks recorded, not before.

**Assessment centers (.29, d = .52) — no.**
Expensive, multi-day, low validity for the cost.

**Reference checks — no meta-analytic entry in this table.**
Blueprint §20.3 already scopes them as employer-side and post-offer.

## 4. Legal exposure

Relevant because any scored screen edges toward "automated employment decision
tool" territory.

- **NYC Local Law 144** — annual independent bias audit plus public posting for
  any AEDT used on NYC candidates. Penalties start at $500/violation, escalating
  to $1,500/day. A 2026 audit of the law's own effectiveness has raised employer
  risk rather than lowered it.
- **Illinois AIVIA** — narrow but strict: applies to AI analysis of video
  interview content. Pre-interview notice, explanation of what is evaluated,
  written consent.
- **Title VII / ADEA / ADA disparate impact** — applies to a facially neutral
  tool that produces disparate outcomes, with or without AI-specific legislation.
  Using a vendor does not transfer liability.

Blueprint §12.7's "no automatic rejection, human decision recorded" rule is what
keeps the current design largely out of AEDT scope. That rule is load-bearing
legally, not just ethically. Anything that turns the match score into a gate
changes the compliance posture.

## 5. Inside the structured interview — where the .42 actually comes from

Treating "structured interview" as one method hides the fact that it is the
predictor with the **widest validity spread in the entire table**: SD of ρ = .19,
80% credibility interval .18 to .66. Every other top predictor is tighter (job
knowledge .13, biodata .09, work sample .09). A structured interview is not a
thing you either have or don't; .42 is the average over implementations ranging
from barely-structured to rigorous, and where a given process lands inside that
interval is a design decision, not luck.

So the useful question is which structuring choices move you up the interval.

**The component list.** Campion, Palmer & Campion (1997) decomposed structure
into 15 components in two families — *what to ask* (content) and *how to
evaluate*. Levashina et al. (2014) later validated that the two-family split
holds up under expert categorization. The evaluation family is the one that gets
skipped in practice and is where most of the loss happens.

**Question type, and the anchors that carry it.** Taylor & Small's meta-analysis
compared past-behavior questions ("tell me about a time you…") against
situational questions ("what would you do if…"). When paired with descriptively
anchored answer rating scales, past-behavior questions reached .63 against .47
for situational. Both beat the .42 mean — because both were being scored against
written anchors. Huffcutt's work adds a moderator: situational-interview validity
*degrades as job complexity rises*, while behavior-description validity does not.
For senior or ambiguous roles, past-behavior questions are the safer default.

The recurring finding across all of it: **the anchored rating scale is doing much
of the work.** Fixed questions without anchors is half the method. Blueprint §8.5
and §15.3 already require anchors written at kickoff; that requirement is not
process hygiene, it is most of the validity.

**Note-taking is not neutral.** Behavioral notes — what the candidate actually
said and did — raise validity. Procedural notes lower it. Interviewers who choose
to take notes outrate non-notetakers, but interviewers *instructed* to take
general notes score worse than those taking none. The instruction that helps is
specific: record behavioral evidence, not impressions and not process.

**Interviewer training on the rating dimensions improves predictive validity.**
Small, cheap, skipped everywhere.

## 6. Sales — the largest non-technical bucket, and its own literature

Sales is 29 of the 200 roles in the current feed, the biggest non-engineering
function. It also has the deepest role-specific meta-analysis: Vinchur,
Schippmann, Switzer & Roth (1998), 129 samples, N = 45,944.

**Read the caveat before the numbers.** These are 1998-era corrections — exactly
the range-restriction practice Sackett et al. (2022) showed to be systematically
overcorrected. Treat the *rank order* as informative and the *magnitudes* as
inflated, probably substantially. They are not comparable to the §2 table.

Corrected r, by criterion:

| Predictor | Supervisor ratings | Objective sales |
|---|---|---|
| Biodata | .52 | .28 |
| Interest | .50 | .50 |
| Sales ability tests | .45 | .37 |
| General cognitive (g) | .40 | **.04** |
| Cognitive ability (overall) | .31 | −.03 |
| Conscientiousness | .21 | .31 |
| — Achievement (facet) | .25 | **.41** |
| — Dependability (facet) | .18 | .18 |
| Extraversion | .18 | .22 |
| — Potency (facet) | .28 | .26 |
| — Affiliation (facet) | .12 | .15 |
| Age | .26 | −.06 |
| Emotional stability | .06 | −.12 |
| Agreeableness | .03 | −.03 |

Three things fall out of this that matter more than any single coefficient.

**The criterion decides the answer.** Cognitive ability predicts *supervisor
ratings* of salespeople at .40 and *actual sales* at .04. Age predicts ratings at
.26 and sales at −.06. Both are the signature of rater bias, not performance:
managers rate articulate, senior-seeming people highly regardless of what they
close. Any assessment validated against "the hiring manager liked them" is
partially validating against that bias. Blueprint §22's day-30/60/90 outcome
checks are the only criterion Demigod will have that isn't a rating — worth
protecting for that reason alone.

**Facets beat factors.** Achievement (a conscientiousness facet) predicts
objective sales at .41, nearly double its parent factor's .31 and far above
dependability's .18. Potency (an extraversion facet) at .26 against affiliation's
.15 — meaning drive and assertiveness carry the "extraverts sell" folk wisdom,
while sociability contributes little. "Hire outgoing people for sales" is
approximately wrong; hire driven ones.

**Incremental validity dies fast.** Vinchur's Table 4, uncorrected multiple Rs:

- Objective sales: Achievement alone **.23** → + sales ability .25 → + biodata
  .26 → + potency .27 → + cognitive ability .27
- Ratings: Sales ability alone .26 → + cognitive .36 → + potency .36 →
  + achievement .37

Four predictors stacked on the first one buy .04. This is the general shape of
selection-system design and the strongest available argument against adding
assessment stages: the second and third instrument mostly re-measure the first.

## 7. Unproctored assessment is being invalidated in real time

This is the newest and most disruptive finding, and it changes the standing
advice on take-homes.

- One coding-interview vendor (Karat) found **80% of candidates used an LLM** on
  a top-of-funnel code test *after being explicitly told not to*.
- Woven's data: candidates using AI tools without proctoring were **3× more
  likely to advance**, implying roughly **1 in 3 technical interviews is with
  someone who cheated** on the prior stage.
- Canvas8/Multiverse (2024): about **half of job seekers** admit using generative
  AI to misrepresent their skills.
- 59% of hiring managers already suspect it.

A take-home was never as good as its reputation — §2 puts work samples at .33
with the worst adverse impact of any common method (d = .67). Now its central
assumption, that the artifact was produced by the candidate, is false at scale.
An unproctored take-home in 2026 measures AI access and willingness, not skill.

The cheap, well-attested defense is not proctoring software: it is a **short live
follow-up in which the candidate explains their own submission.** Candidates who
outsourced the work fail within about two questions. That is a structured
interview about a work sample — which is to say, the method §2 already ranks
first, applied to the artifact.

This is a genuine advantage for a recruiter-led screen. Live, human, structured
conversation is currently the only high-validity method that AI assistance
doesn't quietly destroy.

## 8. Length is a real cost, and Demigod cannot pay it

Every added assessment minute is paid in candidates who never finish.

- Applications under 5 minutes complete at **12.47%**; over 15 minutes, **3.61%**
  (Appcast) — a 365% difference from duration alone.
- **60%** of workers have started an application and never finished it (iCIMS
  2025 State of Frontline Hiring).
- Drop-off by stage: interview 32%, scheduling 20%, application 14%.
- Stated reasons: form too long (50%), unsure of qualifications (35%), no pay
  transparency (31%).
- Take-homes of 3+ hours frequently complete below 50% — at which point the
  instrument is measuring availability and desperation alongside skill, and doing
  so non-randomly.

Demigod's submissions inbox is at 0. A funnel with no inbound cannot spend
anything on friction. This is an independent argument for the same conclusion as
§7: put the assessment burden on a recruiter's 30–45 minutes (blueprint §12.2)
rather than on a candidate-completed instrument. The recruiter absorbs the cost;
the candidate does not abandon.

Also worth noting that "no pay transparency" at 31% is a top-three abandonment
cause, and blueprint §7.1/§8.2 already require a base range on every accepted
search. That requirement is a funnel asset, not just an honesty one.

## 9. Realistic job preview — the guarantee-period lever

Premack & Wanous (1985), 21 studies: realistic job previews produced a mean
**36% reduction in voluntary turnover**. Phillips (1998, AMJ), 40 studies: RJPs
reduced attrition during recruitment, reduced voluntary and overall turnover, and
were associated with *higher* performance. Post-hire delivery is slightly more
effective than pre-hire for turnover specifically.

This is not an assessment method, but it belongs here because it acts on the same
outcome an assessment is meant to protect, more cheaply than any instrument in
the table. Blueprint §6.7 (guarantee), §21.5 (guarantee reserve) and §22 (day-30/
60/90 checks) mean early turnover is a direct hit to Demigod's revenue. Telling
candidates the unflattering truth about a role is the highest-ROI intervention
available on that specific line, and §15.6 already requires accurate role and
company context. The 36% is the number behind the rule.

The cost is real and should be stated: RJPs also reduce perceived organizational
attractiveness. Some candidates opt out. That is the mechanism working.

## 10. Reference checks

Hunter & Hunter (1984) put reference checks at .26. Later work on *structured*
reference checks — fixed questions, rated responses, same discipline as a
structured interview — found r = .25 raw, .36 corrected for range restriction and
criterion unreliability. Respectable, and better than its reputation, but the
gain comes entirely from structure again.

Blueprint §20.3 already scopes references as employer-side and post-offer, which
is the right call for legal exposure. No change indicated.

## 11. Validating any of this with almost no data

The standard route — local criterion-related validation — needs a sample of hires
with recorded performance that Demigod will not have for years. Two sanctioned
alternatives exist under the Uniform Guidelines:

- **Transportability (§7B).** Validity evidence from one setting may be borrowed
  for another if job analyses on both jobs establish substantial similarity. This
  is the standard route for small employers, and it is explicitly sanctioned.
- **Synthetic validity.** Build the validity case from competency-level
  components rather than from the whole job, generalizing across a class of
  occupations. Also Guidelines-authorized.

Both require one thing Demigod would otherwise skip: **a real job analysis per
role, documented.** The blueprint's §8.2 scorecard — competencies, evidence
expected per competency, requirement test in §8.3 — is that job analysis, if it
is written down and versioned. Done properly it is the artifact that makes a
transportability argument possible later. Done as a sales call, it leaves nothing
to point at if a process is ever challenged.

This is the strongest argument in this document for taking the scorecard
seriously as a written record rather than a kickoff formality.

## 12. Revised implications

Supersedes the first-pass list. Recorded as options, not decisions.

1. **No separate non-technical assessment product.** One structured screen with
   role-specific question sets covers every `fn` bucket. Structure is the
   validity; content is the variable.
2. **Anchored rating scales are the deliverable, not the question list.** The
   .19→.42 gap, and most of the .42→.63 headroom above it, lives in the
   evaluation half of the method — the half that gets skipped. §8.5/§15.3 already
   mandate it.
3. **Prefer past-behavior questions over situational**, especially for senior or
   ambiguous roles, where situational validity degrades and behavioral does not.
4. **Instruct interviewers to record behavioral evidence specifically.** "Take
   notes" as a general instruction measurably makes ratings worse.
5. **Do not add a second assessment stage without a specific reason.** Vinchur's
   incremental table: four predictors stacked on the first buy .04. Stages cost
   candidates (§8) and buy less than they appear to.
6. **Treat unproctored take-homes as compromised** (§7). If an employer insists on
   one, the fix is a 10-minute live walkthrough of the candidate's own
   submission, not proctoring software.
7. **Years-of-experience minimums remain the cheapest correctness win** on the
   employer side — ρ = .07, d = .49. §8.3 has the mechanism.
8. **For sales roles, screen for drive, not sociability.** Achievement .41 and
   potency .26 against objective sales; affiliation .15. Rank order only — the
   1998 magnitudes are inflated.
9. **Protect the objective criterion.** §22's day-30/60/90 outcome checks are the
   only non-rating criterion Demigod will ever have, and the sales literature
   shows how far ratings and outcomes can diverge.
10. **Write the scorecard as a real job analysis** (§11). It is the only path to a
    defensible validity claim at Demigod's sample size.
11. **Deliver a realistic job preview, including the unflattering parts.** 36%
    voluntary-turnover reduction lands directly on the guarantee reserve.
12. **Still gated on volume:** SJTs, empirically keyed biodata, any local
    validation. Revisit after enough placements with recorded outcomes.

## Sources

- [Sackett, Zhang, Berry & Lievens (2022), *Revisiting meta-analytic estimates of validity in personnel selection*, JAP](https://www.semanticscholar.org/paper/Revisiting-meta-analytic-estimates-of-validity-in-Sackett-Zhang/3d97bb723b4ec316b23105126b78b71a855de79e)
- [Sackett et al. (2023), *Revisiting the design of selection systems*, Industrial and Organizational Psychology](https://www.cambridge.org/core/journals/industrial-and-organizational-psychology/article/revisiting-the-design-of-selection-systems-in-light-of-new-findings-regarding-the-validity-of-widely-used-predictors/A20984B138319E3D432E643978BF026D) — Table 1 reproduced above
- [SIOP — *Is cognitive ability the best predictor of job performance?*](https://www.siop.org/tip-article/is-cognitive-ability-the-best-predictor-of-job-performance-new-research-says-its-time-to-think-again/)
- [Insights from Sackett et al. (2022, 2023)](https://www.master-hr.com/insights/insights-from-sackett-et-al-2023/)
- [DLA Piper — NYC AI hiring law audit, 2026](https://knowledge.dlapiper.com/dlapiperknowledge/globalemploymentlatestdevelopments/2026/New-York-Critical-audit-of-New-York-Citys-AI-hiring-law-signals-increased-risk-for-employers)
- [Illinois AIVIA 2026 compliance guide](https://www.ratedwithai.com/blog/illinois-ai-video-interview-act-2026)
- [NYC Local Law 144 compliance guide](https://www.warden-ai.com/resources/hr-tech-compliance-nyc-local-law-144)
- [OPM — structured interviews](https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews) (already cited in the blueprint)

Deep dive (§5–§11):

- [Levashina, Hartwell, Morgeson & Campion (2014), *The structured employment interview: narrative and quantitative review*, Personnel Psychology](https://onlinelibrary.wiley.com/doi/abs/10.1111/peps.12052) — validates the Campion et al. (1997) 15-component structure taxonomy
- [*Structured interviews: moving beyond mean validity*, Industrial and Organizational Psychology](https://www.cambridge.org/core/journals/industrial-and-organizational-psychology/article/structured-interviews-moving-beyond-mean-validity/7CB1F7C86CB0D15328B3F07AD5F964E2) — the SD = .19 / CI .18–.66 problem
- [Taylor & Small, *Asking applicants what they would do versus what they did do*: meta-analytic comparison of situational vs past-behavior questions](https://www.researchgate.net/publication/227869871_Asking_applicants_what_they_would_do_versus_what_they_did_do_A_meta-analytic_comparison_of_situational_and_past_behavior_employment_interview_questions) — .63 vs .47 with anchored scales
- [Huffcutt (1999), *Further analysis of employment interview validity: interviewer-related structuring methods*, JOB](https://onlinelibrary.wiley.com/doi/abs/10.1002/(SICI)1099-1379(199907)20:4%3C549::AID-JOB921%3E3.0.CO;2-Q)
- [Vinchur, Schippmann, Switzer & Roth (1998), *A meta-analytic review of predictors of job performance for salespeople*, JAP](https://members.bestbusinesscoach.ca/wp-content/uploads/2022/11/A-Meta-Analytic-Review-of-Predictors-of-Job-Performance-for-Salespeople.pdf) — Tables 1–4 reproduced above
- [Karat / Woven / Canvas8 data on AI use in unproctored assessment](https://fabrichq.ai/blogs/how-ai-cheating-killed-take-home-assignments)
- [Woven — async proctoring and ChatGPT detection data](https://www.woventeams.com/async-proctoring-chatgpt-detection/)
- [Appcast / iCIMS application length and drop-off data](https://www.pin.com/blog/applicant-drop-off-rates/)
- [Coding assessment completion-rate benchmarks](https://clarity-hire.com/blog/coding-assessment-completion-rate)
- [Premack & Wanous (1985) and Phillips (1998) RJP meta-analyses — summary](https://www.qic-wd.org/umbrella-summary/realistic-job-previews)
- [Phillips (1998), *Effects of realistic job previews on multiple organizational outcomes*, AMJ](https://journals.aom.org/doi/abs/10.5465/256964)
- [Transportability of test validation evidence (Uniform Guidelines §7B)](https://iosolutions.com/transportability-test-validation/)
- [Uniform Guidelines on Employee Selection Procedures (1978), 41 CFR Part 60-3](https://www.ecfr.gov/current/title-41/subtitle-B/chapter-60/part-60-3)
- [Structured reference checks — validity](https://www.refapp.com/blog/5-reference-checking-myths-debunked)
