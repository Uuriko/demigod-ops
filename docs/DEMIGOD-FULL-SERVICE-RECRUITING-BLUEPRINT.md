# Demigod full-service recruiting blueprint

**Date:** 2026-07-28  
**Status:** Service-design and implementation specification. This document does not claim that full-service recruiting is live today.  
**Scope:** Employer-paid, permanent direct-hire recruiting for startup roles.  
**Operating principle:** Own the work end to end; automate only repeated, measured friction.

---

## 1. Executive decision

Demigod can become a credible full-service recruiting service without becoming an applicant-tracking-system company.

The transformation is primarily an operating-model change:

> For every accepted search, one accountable Demigod search lead owns role calibration, search strategy, selective sourcing, recruiter screening, role-specific candidate consent, candidate presentation, scheduling, interview follow-through, feedback collection, offer alignment, authorized negotiation coordination, accepted-offer follow-through, actual-start confirmation, invoicing, and post-start outcome checks.

The employer remains the hiring decision-maker and employer of record. The candidate controls whether their information is shared, whether they interview, and whether they accept. Demigod coordinates and advises; it does not secretly decide for either side.

Demigod already has much of the front half:

- Startup and talent intake
- Private submission storage and validation
- Lead sourcing and outreach records
- Human-reviewed matching
- Pair-specific mutual consent
- Draft-only introductions
- Hire and fee-calculation evidence
- Invoice stubs
- Day-90 referral eligibility

The service stops being complete immediately after the introduction. The present system has an `interviewing` label, but no interview operations. It has a jump from interview to hire, but no offer or negotiation process. It can create a hire-evidence-gated invoice stub, but it has no valid invoice, delivery, billing, or collections process. Its legacy close tool can write an arbitrary-day note and its manual checklist names 30/60/90 follow-ups, but neither schedules, validates, or evidences a structured post-start service.

The correct strategy is therefore:

1. Preserve the existing intake, lead, pair, consent, intro, fee, and referral spine.
2. Repair the intake data that is lost between the public form and the search record.
3. Add a real recruiter screen.
4. Make every post-introduction event pair-specific.
5. Own scheduling and interview operations with ordinary email and calendar tools.
6. Add structured interview feedback, pre-close, offer, negotiation, acceptance, and start records.
7. Replace informal fee acknowledgment and invoice stubs with accepted terms and a valid manual billing process.
8. Add one coherent placement-retention record reused by referrals and guarantees.
9. Show operational obligations in the existing dashboard rather than building another product.
10. Prove the service manually before changing public claims or automating it.

### Commercial recommendation

Keep 10% while privately proving the complete service on tightly qualified searches. Once the full-service readiness gates in this document are satisfied, use one 15% rate for new engagements and grandfather earlier 10% agreements.

Do not create 10% and 15% public packages, a subscription, an executive tier, a calculator, or a maze of discounts. There should be one current service and one current rate.

### The most important constraint

Full service cannot mean unlimited free recruiting labor. At a success-only fee, Demigod must accept only real searches, set a small active-search limit, require client cooperation, pause work when the client stops participating, and define a short focused-search commitment.

---

## 2. What “full service” means

Full service is not a list of tools. It is continuous ownership.

For every active search and candidate, the following must always be true:

- One person owns the next action.
- The current state is known.
- The latest meaningful contact is recorded.
- The next action has a due date or agreed checkpoint.
- The evidence behind each decision is available.
- The candidate knows what is happening once they meaningfully engage.
- The employer knows where the search is blocked.
- Consent is specific to the company and role.
- Commercial obligations are tied to an accepted agreement version.
- An accepted offer is distinguished from an actual start.
- An invoice is distinguished from payment.
- Retention is distinguished from a good 90-day outcome.

If those conditions fail, the service is not full-cycle even if the website, dashboard, or automation says otherwise.

### Full-service journey

```text
Employer qualification
  → signed search activation
  → calibrated role scorecard
  → search thesis and market map
  → selective sourcing
  → candidate interest
  → structured recruiter screen
  → candidate-approved presentation
  → mutual yes
  → introduction
  → scheduling
  → structured interview rounds
  → feedback and debrief
  → offer readiness
  → written offer
  → negotiation
  → written acceptance
  → pre-start follow-through
  → actual start
  → invoice and collection
  → first-week / day-30 / day-60 / day-90 outcome checks
  → guarantee and referral resolution
```

### What “owns” means

Demigod owns a step when it:

1. Defines what must happen.
2. Identifies who can authorize it.
3. Coordinates the participants.
4. Records the event and its evidence.
5. Notices when it is stalled.
6. Communicates the status.
7. Escalates or closes it honestly.

Owning scheduling does not mean building a calendar. Owning negotiation does not mean deciding a candidate’s minimum. Owning interviews does not mean making the hiring decision. Ownership is accountable coordination with explicit boundaries.

---

## 3. Service boundary

The boundary must be written before the service is sold. Otherwise “full service” expands into staffing, legal advice, background investigations, payroll, and indefinite post-hire support.

### Demigod includes

- Search qualification and acceptance
- Employer placement agreement and role-specific search activation
- Role intake and calibration
- Search scorecard and search thesis
- Market mapping
- Existing-network, referral, inbound, community, and selective direct sourcing
- Personalized candidate outreach
- Candidate-interest confirmation
- Structured recruiter screen
- Role-specific candidate consent
- Candidate evidence brief
- Employer presentation
- Mutual-interest confirmation
- Interview-process design assistance
- Calendar coordination, reminders, and rescheduling
- Candidate and interviewer preparation
- Interview-feedback collection
- Pipeline status and candidate closure
- Pre-offer alignment
- Accurate relay of authorized offers and counteroffers
- Negotiation coordination
- Written-acceptance confirmation
- Pre-start follow-through
- Actual-start confirmation
- Placement invoicing and collection tracking
- First-week, day-30, day-60, and day-90 outcome checks
- Contracted guarantee handling
- Referral eligibility and settlement evidence

### Employer retains

- Approved headcount and budget
- Truthful role, company, compensation, equity, and risk information
- Lawful job criteria
- The final selection decision
- Interviewer participation
- Technical or job-specific assessment
- Written employment offer
- Background checks and adverse-action process
- References when required
- I-9 and work-authorization verification
- Immigration counsel
- Payroll, benefits, tax withholding, equipment, and onboarding
- Employment-law compliance
- Performance management and termination
- Placement-fee payment

### Candidate retains

- Truthful experience and work evidence
- Control over each company-specific disclosure
- Control over whether to interview
- Control over what private negotiation information may be relayed
- Control over whether to accept
- The right to withdraw from the process
- The right to request correction, suppression, or deletion subject to applicable retention obligations

### Explicitly excluded

- Temporary staffing
- Contract-worker payroll
- Employer-of-record services
- Leasing, supervising, or employing placed workers
- Immigration, tax, securities, equity-valuation, or legal advice
- Acting as a consumer-reporting agency
- Medical or disability screening
- Making offers on behalf of an employer without express written authority
- Accepting, rejecting, or countering an offer for a candidate
- Automated hiring decisions
- Automated résumé rejection
- Guaranteed candidate volume
- Guaranteed hiring timelines
- Guaranteed hires
- Unlimited sourcing
- Unlimited replacement work
- Performance management after the agreed post-start handoff

This keeps Demigod in permanent placement rather than accidentally turning it into a staffing firm, background-check company, payroll provider, or legal adviser.

---

## 4. Current system: what should be reused

The existing system is not empty. Replacing it with an ATS would discard its strongest parts.

| Capability | Existing foundation | Full-service gap |
|---|---|---|
| Employer intake | Startup WIZ captures company, role, stage, requirements, 90-day outcome, location, compensation, urgency, and contact | The bridge into the pilot/search record drops important fields and does not prove commercial readiness |
| Candidate intake | Talent WIZ captures skills, experience, preferences, availability, compensation, work authorization, résumé, and contact | No structured recruiter-screen record; readiness does not consistently use every relevant field |
| Private data controls | Input validation, public PII scrubbing, private file permissions, deduplication | No complete data-request workflow, field-specific retention schedule, access record, or automated-decision governance |
| Sourcing CRM | `DEMIGOD-LEADS.json`, sourcing tools, provenance, outreach drafts, receipts, opt-out controls | Sourcing is not consistently tied to an accepted role and search thesis |
| Role calibration | Pilot fields and operating checklists include 90-day outcome, must-haves, authority, and scorecard | No versioned structured scorecard used consistently by screening and interviews |
| Matching | Human-reviewed, evidence-generating matching | Fit score is not a substitute for a recruiter screen or competency evidence |
| Candidate consent | Role-plus-candidate pair ledger and evidence-backed founder/candidate consent | Current pair identity lacks an immutable search ID; consent also needs notice version, permitted share scope, withdrawal, and propagation |
| Introduction | Intro queue and draft-only behavior with strong fail-closed gates | Canonical intro content is too skeletal for a full-service handoff |
| Interview | A lead can enter `interviewing` | No pair-scoped schedule, rounds, feedback, debrief, or evidence gate |
| Offer and negotiation | None | Entire operating layer is missing |
| Closing | Legacy tool records a hire from an intro and estimates the fee | It skips offer, acceptance, contingencies, pre-start, and actual-start semantics |
| Billing | Hire-evidence-gated fee calculation and `pending_human_send` invoice stub | No accepted terms evidence, valid invoice number, delivery evidence, due date, aging, collections, or reconciliation |
| Post-start | Legacy arbitrary-day note writer plus a manual 30/60/90 checklist | No scheduled or validated two-sided health record, guarantee decision, or canonical retention result |
| Referrals | Strong day-90, paid-fee, evidence, settlement, and reversal controls | Retention is referral-specific rather than the canonical placement outcome |
| Dashboard | Match review, consent, intro, and control-plane projections | No concise delivery view for searches, screens, interviews, offers, collections, and outcomes |

### Existing sources to preserve

- `demigod-submissions-lib.mjs` — intake readiness, validation, and private submission handling
- `demigod-lead-collect.mjs` and `demigod-funnel.mjs` — sourcing, outreach, receipts, suppression, and financial summary states
- `demigod-pilot-os.mjs` — employer engagement and active-search header
- `demigod-pairs-lib.mjs` — current candidate × role relationship and mutual consent
- `demigod-matching-engine.mjs` and match review — advisory fit evidence and human review
- `demigod-intro-draft.mjs` — draft-only introduction path
- `demigod-revenue.mjs` — hire-evidence-gated fee calculation and invoice stub
- `demigod-referrals.mjs` — day-90, collected-fee, settlement, reversal, and idempotency patterns
- Existing dashboard — projection of canonical state

### Current architectural problem

The lifecycle is split among global leads, pilots, legacy pilot shortlists, and pairs. That overlap is manageable before an introduction but becomes incorrect afterward.

A candidate may participate in several searches, including reopened or materially changed searches for the same role. The current pair key is `roleId + candId`; it cannot distinguish those searches. Therefore the target model must migrate every active pair to an immutable `searchId + candidateId` identity before post-introduction operations are added.

After that migration:

- A lead can say who the person is and how Demigod contacted them.
- A search can say what the employer is hiring for.
- Only the pair can say where that specific candidate is in that specific search.

All post-introduction activity must therefore be pair-scoped.

### Target ownership model

| Record | Owns |
|---|---|
| Search / existing pilot record | Immutable search ID, employer, role, accepted brief, scorecard, terms snapshot, search plan, interview plan, capacity, billing identity |
| Candidate / existing lead record | Identity, source, contact, outreach, suppression, general candidate intake |
| Candidate × immutable search / migrated pair record | Screen, consent, anonymized presentation, interviews, feedback, offer, negotiation, acceptance, and a nested placement result |
| `pair.placement` | Start and fee-basis snapshot plus references to canonical invoice, payment, guarantee, referral, and outcome records; it does not duplicate their state |

No new ATS database is required. The important work is eliminating ambiguous ownership.

---

## 5. Operating principles

### 5.1 One accountable search lead

The employer and candidate should experience one process owner. That person may wear sourcing, coordination, closing, and finance hats initially, but ownership must never be ambiguous.

### 5.2 A role is not accepted merely because a form exists

An inquiry becomes a search only after authority, budget, scorecard, process, terms, and capacity are real.

### 5.3 A résumé is not a qualified candidate

Qualification requires a live human screen and written evidence against the accepted role criteria.

### 5.4 Consent is company- and role-specific

Finding a profile, receiving a referral, or holding a résumé does not authorize submission.

### 5.5 Scheduling is part of the service

The candidate and employer should not be left to coordinate a multi-party process after a Demigod introduction.

### 5.6 Pre-closing begins before the offer

Compensation, scope, timing, work arrangement, reservations, and decision criteria must be checked throughout the process. Negotiation should not begin with a surprising written offer.

### 5.7 Employer-paid must be disclosed

Demigod is paid by the employer when a hire starts. It can run a fair and respectful process, but it must not describe itself as an undisclosed fiduciary for both sides.

### 5.8 Evidence beats stage labels

“Interviewing,” “offered,” “accepted,” “started,” “invoiced,” and “paid” must correspond to distinct observed events.

### 5.9 Manual first, automation after measured pain

Email, calendar, one search record, one pair record, and append-only events can run the first searches. Software should be added only when a repeated failure has a measurable cost.

### 5.10 Public promises follow observed capability

Internal targets are useful. Unsupported public response times, candidate quantities, retention claims, and guarantees are not.

---

## 6. Commercial foundation

Full-cycle labor should not begin until the commercial relationship is explicit.

### 6.1 Employer placement agreement

Demigod needs one concise, counsel-reviewed employer agreement. It should define:

1. Parties and signer authority
2. Employer-paid permanent-placement service
3. Included services
4. Excluded services
5. How a role becomes an active search
6. Current fee percentage
7. Exact fee basis
8. Invoice trigger
9. Payment deadline
10. Taxes and invoice information
11. Employer duty to report a hire, compensation, and start
12. Candidate-attribution period
13. Pre-existing-candidate procedure
14. Affiliate and related-entity hires
15. Contractor, advisor, and later employee conversions
16. Candidate consent and data-use restrictions
17. Client feedback and cooperation expectations
18. Search pause and closure rights
19. Material role-change handling
20. Narrow non-circumvention
21. Guarantee, if any
22. Confidentiality and security
23. Employment-law responsibilities
24. Limits on Demigod’s authority
25. Liability and insurance allocation
26. Termination
27. Surviving fee obligations
28. Terms version and effective date
29. Governing law and dispute process

The current `feeTermsSent` boolean is insufficient. Full service requires:

- Agreement version
- Acceptance evidence
- Accepted timestamp
- Signer
- Legal entity
- Activated search
- Historical terms preserved with every introduction and placement

### 6.2 Fee basis

Use one legible basis:

> Percentage of first-year base salary, excluding equity, discretionary bonus, commission, and benefits.

Current public and internal sources variously say “first-year cash salary,” “first-year base cash,” and generic “first-year cash.” That is a commercial inconsistency, not merely a wording issue. Before the first full-service agreement, reconcile the website, fee sheet, close tool, revenue calculation, and referral basis to the exact definition above, while preserving historical agreement snapshots.

If Demigod later serves commission-heavy roles, define a separate guaranteed-cash rule only when those roles become real. Do not complicate the initial agreement for hypothetical cases.

### 6.3 Fee trigger

Preserve the strongest public promise:

> No placement fee unless the candidate actually starts.

Written acceptance is not the billing trigger. A signed offer may fall through. The placement event is the confirmed first working day.

### 6.4 Payment terms

The agreement and invoice should state:

- Actual start date
- Fee basis evidence
- Fee amount
- Invoice date
- Due date
- Payment instructions
- Billing entity and address
- Purchase-order requirement, if any
- Dispute route
- Late-payment treatment
- Guarantee eligibility consequences of nonpayment

A valid manual ACH or wire invoice is enough initially. Stripe is not required to prove the service.

### 6.5 Candidate attribution

A fair, simple rule:

- A fee applies if the employer or a defined affiliate hires a candidate within 12 months of a documented, consented Demigod introduction.
- The employer may raise a duplicate or prior-relationship claim within a short stated window.
- A prior relationship requires evidence of substantive, active two-way recruiting interaction, not merely a database record, an old application, a social connection, or an unanswered message.
- Candidate consent remains required even if attribution exists.
- The agreement version active on the introduction governs the later placement.

### 6.6 Focused-search commitment

At a success-only fee, Demigod should not commit unlimited labor to a speculative role.

The initial model should require:

- One accepted role per search order
- One accountable hiring owner
- One roughly 30-day focused-search or first-look period
- Disclosure of other active agencies and internal finalists
- Employer feedback within an agreed internal operating window
- Permission to pause when feedback, compensation, or role truth is missing

The employer can continue ordinary inbound and employee referrals. The commitment exists to prevent Demigod from becoming a free résumé supplier while another uncoordinated process changes the target.

### 6.7 Guarantee

Do not advertise a guarantee before the agreement, reserve, placement evidence, and remedy workflow agree.

The lean default after full-service proof is:

> One replacement search at no additional placement fee if the placement ends within 90 days, except for the employer-driven exclusions below.

Conditions:

- Original invoice paid on time
- Same materially unchanged role
- Same compensation range
- Same location and working arrangement
- Same core responsibilities
- Employer met process and feedback commitments
- Written employer notice of the last working day and reason category
- Candidate-side outcome check where reasonably possible
- Notice within a defined period
- One replacement search
- No guarantee that a replacement will be found
- No cash refund by default
- A defined replacement-search window

Exclusions:

- Layoff
- Eliminated headcount
- Reorganization
- Employer insolvency
- Material compensation reduction
- Material change in location, remote policy, reporting line, or responsibilities
- Employer misconduct or breach
- Unlawful working conditions
- Client nonpayment
- Material facts concealed during intake

Demigod should not collect a personnel file or adjudicate disputed performance. If employer and candidate accounts materially conflict, the remedy pauses for counsel-reviewed handling under the agreement. A cash money-back guarantee may be considered later only with a funded reserve and observed claim data. It is not the lean initial promise.

### 6.8 Referral economics

The current program distinguishes:

- A 20% individual talent-referral reward
- A 10% individual first-company-introduction reward
- A 10% hiring-partner company credit

The policy must explicitly state whether those rewards can stack on one placement. Full-service economics cannot be trusted while the maximum referral burden is ambiguous.

The clean operating rule is:

- Define one maximum reward pool per placement.
- Resolve multiple valid claims manually from evidence.
- Do not pay any reward before the employer fee is collected and retained and the day-90 condition is satisfied.
- Record the reward liability when the placement starts.
- Obtain required tax information before cash settlement.
- Preserve the candidate’s ranking neutrality regardless of referral.

---

## 7. Search qualification and acceptance

Full service begins by refusing work that cannot be delivered well.

### 7.1 Required employer facts

Record:

- Legal entity
- Billing contact
- Authorized signer
- Hiring manager
- Final decision-maker
- Approved headcount
- Approved base range
- Employment type
- Location and remote/hybrid rules
- Time-zone constraints
- Sponsorship capability
- Target start window
- Reason the role exists
- Whether it is new or a replacement
- Whether it is confidential
- Existing agencies
- Internal candidates
- Known referred candidates
- Interview participants
- Offer approver
- Background-check owner
- Onboarding owner
- Relevant work jurisdictions

### 7.2 Required search truth

The hiring manager must be able to explain:

- The business problem
- The first 90-day outcome
- The cost of not filling the role
- Essential work
- Real must-haves
- Trainable requirements
- Acceptable adjacent backgrounds
- Level and autonomy
- Compensation
- Candidate value proposition
- Material company and role risks
- Interview process
- Decision rule

### 7.3 Acceptance conditions

Accept only when:

- Headcount is real.
- Compensation is approved and plausible.
- A decision-maker participates.
- The role can be evaluated from job-related evidence.
- The interview process is available.
- Terms are accepted.
- Candidate-data responsibilities are understood.
- Demigod has capacity.
- The expected fee can plausibly support the work.

### 7.4 Refusal conditions

Refuse or stop a search when:

- Headcount is speculative.
- Budget is not approved.
- The role exists only to collect résumés.
- Requirements are discriminatory or unrelated to work.
- The employer asks for age, race, sex, religion, nationality, disability, family, or other protected traits.
- “Culture fit,” “young,” “native,” “aggressive,” school prestige, or brand pedigree cannot be translated into legitimate evidence.
- The employer misrepresents compensation, role, company condition, or risk.
- The employer will not honor candidate consent.
- The employer wants Demigod to make the hiring decision.
- The employer refuses all process participation while expecting full-cycle labor.
- The likely work is commercially irrational.

### 7.5 Pause conditions

Pause sourcing when:

- The role changes materially.
- Compensation changes.
- Location or remote policy changes.
- Feedback remains missing beyond the agreed checkpoint.
- Existing presented candidates have not been reviewed.
- The hiring manager or decision-maker becomes unavailable.
- Headcount is frozen.
- The employer begins an undisclosed parallel agency process.
- Candidate privacy or process integrity is compromised.

Pausing is better than continuing to spend labor while degrading candidate experience.

### 7.6 Acceptance artifact

An accepted search must have:

- Search ID
- Search owner
- Accepted timestamp
- Signed agreement and version
- Search-order details
- Role scorecard and version
- Interview plan
- Approved candidate pitch
- Search thesis
- Client feedback owner
- Billing identity
- Capacity status
- Next obligation

---

## 8. Role calibration

A job description is marketing copy. A search scorecard is the operational truth.

### 8.1 Kickoff agenda

1. Why the role exists
2. What success looks like at 30, 60, 90, and 365 days
3. Scope and decision rights
4. Team and reporting line
5. Genuine must-haves
6. Flexible and trainable criteria
7. Representative evidence
8. Level
9. Compensation and equity
10. Location and sponsorship
11. Candidate reasons to join
12. Honest risks
13. Interview stages
14. Competency ownership
15. Offer authority
16. Search boundaries
17. Calibration examples
18. Stop conditions

### 8.2 Scorecard

The scorecard should contain:

- Role title
- Reporting line
- Business purpose
- One measurable 90-day outcome
- Six- and twelve-month direction
- Three to five must-have criteria
- Preferred criteria
- Trainable criteria
- Four to six job-related competencies
- Evidence expected for each competency
- Objective disqualifiers
- Scope and autonomy
- Team context
- Technical or operational environment
- Base range
- Equity and other approved package elements
- Location and work pattern
- Sponsorship position
- Start window
- Interview stages
- Competency-to-interviewer mapping
- Final decision-maker
- Candidate proposition
- Material risks
- Search exclusions

### 8.3 Requirement test

For every alleged must-have, ask:

1. What job task does this predict?
2. What evidence would prove it?
3. Could an adjacent background demonstrate the same ability?
4. Is it legally and operationally necessary?
5. Would the role truly fail without it?

If the hiring manager cannot answer, move it to preference or remove it.

### 8.4 Calibration profiles

Before broad outreach, review a small sample:

- Clear fit
- Borderline fit
- Superficial fit that is actually wrong

Record the decision and reason. When this changes the target, version the scorecard. Do not let calibration live only in a call.

### 8.5 Interview design at kickoff

The employer must decide how it will evaluate before it sees a favorite candidate.

Define:

- Number of stages
- Purpose of each stage
- Interviewer
- Competency assessed
- Questions or work sample
- Rating anchors
- Duration
- Feedback owner
- Decision rule
- Offer approval path

This prevents criteria from changing after interviews begin.

### 8.6 Exit gate

No broad sourcing until the employer approves:

- Scorecard
- Compensation
- Candidate proposition
- Search boundaries
- Interview process
- Mandatory versus preferred criteria
- Decision-maker

---

## 9. Search strategy and market mapping

### 9.1 Search thesis

Each search needs a written hypothesis:

- Who is likely to succeed?
- Where might those people work?
- Which adjacent backgrounds transfer?
- What titles are misleading?
- What experience matters more than title?
- What false positives are common?
- What would motivate the target person?
- What concerns will strong candidates have?
- Which constraints most reduce the pool?
- What evidence can be found before contact?

### 9.2 Market map

Record:

- Target titles
- Adjacent titles
- Target company types
- Relevant industries
- Stage or scale environments
- Geographic pools
- Seniority indicators
- Essential skills
- Acceptable substitutes
- Communities
- Events
- Alumni networks
- Referral sources
- Inbound channels
- Search strings
- Excluded profiles and reasons
- Compensation risks
- Inclusion check
- Weekly calibration hypothesis

### 9.3 Source order

Use the highest-trust channels first:

1. Existing consented Demigod talent
2. Trusted direct referrals
3. Approved referrer network
4. Warm professional network
5. Relevant events and communities
6. Alumni and adjacent-company maps
7. Employer referrals
8. Inbound applicants
9. Permissioned professional-platform search
10. Selective direct research and outreach

This maximizes signal before purchasing large databases or automating cold contact.

### 9.4 Prospect record

Capture only:

- Stable candidate ID
- Search ID
- Source
- Source date
- Source URL or evidence
- Fit hypothesis
- Relevant public or consented facts
- Existing relationship or duplicate status
- Contact route
- Contact status
- Last contact
- Opt-out
- Next action
- Owner
- Minimal notes

Do not clone entire public profiles into a private database.

### 9.5 Source-quality learning

Measure:

- Prospects contacted
- Relevant replies
- Screens
- Qualified candidates
- Presentations
- Interviews
- Offers
- Starts
- Day-90 outcomes

The purpose is to learn which sources produce retained hires, not which source yields the most profiles.

---

## 10. Outreach and candidate engagement

### 10.1 First-message standard

Every first message should communicate:

- Who Demigod is
- That Demigod represents the employer on the search
- Employer identity only after the employer’s search activation authorizes disclosure and the full-service privacy notice permits it
- Why the person was contacted
- Role outcome
- Essential scope
- Compensation range when required or approved
- Location and work arrangement
- A low-pressure next step
- An easy decline or opt-out

The live privacy terms currently keep both sides’ identifying details private until mutual approval. Full-service sourcing should deliberately revise that model before launch: an authorized employer may disclose its own identity and role details in outreach, while candidate identity remains private until the candidate gives company- and role-specific consent and the employer approves the anonymized brief. Until that revised notice version is operating, outreach must keep the employer anonymous.

### 10.2 Personalization rule

Personalization must come from verified professional evidence. It must not invent familiarity, interests, motives, relationships, or admiration.

Good:

> Your work leading a migration from a monolith to service ownership appears relevant to the first-90-day outcome for this role.

Bad:

> I have followed your career for years and know this is your dream company.

### 10.3 Cadence

Initially:

- One relevant first message
- One useful follow-up
- One respectful close-out at most
- Immediate suppression on decline or opt-out

No auto-DM swarm is required. The existing evidence-gated draft and receipt path should remain.

### 10.4 Response classification

Use a short reason set:

- Interested
- Open later
- Wrong role
- Compensation
- Location
- Work arrangement
- Sponsorship
- Company/stage
- Timing
- Not looking
- No further contact
- Already engaged
- Other with note

This improves the search thesis without creating a taxonomy project.

### 10.5 Communication compliance baseline

Use:

- Accurate sender information
- Honest subject
- Clear business identity
- Valid business contact details
- Straightforward opt-out
- Suppression handling
- Oversight of any vendor

Avoid automated cold SMS or prerecorded calls. Email and permissioned professional channels are simpler and safer.

### 10.6 Candidate truth

Never claim:

- The role is urgent unless it is.
- The employer has selected the candidate unless it has.
- Other offers exist unless the candidate or employer truthfully disclosed them.
- A response deadline exists unless authorized.
- Demigod is the candidate’s independent agent.
- An interview or offer is guaranteed.

---

## 11. Candidate consent and representation

### 11.1 Required across the presentation sequence

Record:

- Candidate identity
- Employer
- Role
- Employer search-activation authority to disclose company identity
- Employer pair approver identity and authority
- Employer approval timestamp and evidence
- Material role terms shown
- Candidate interest
- Anonymized evidence brief approved for pre-mutual sharing
- Identity and résumé scope approved for release only after mutual yes
- Exact share scope at each boundary
- Information not authorized for sharing
- Consent timestamp
- Consent channel
- Notice version
- Preferred contact method
- Duplicate or prior-submission status
- Withdrawal status

The current privacy promise keeps both sides’ identifying details private until mutual approval. The full-service launch must version and publish the asymmetric disclosure model described in §10.1 before naming an employer in outreach. Candidate identity, contact details, and the approved résumé remain private until both pair approvals exist; before then, the employer receives only an anonymized evidence brief.

### 11.2 Consent is not attribution

Attribution determines whether Demigod may earn a fee. Consent determines whether Demigod may share the person’s information. One does not replace the other.

### 11.3 Employer-paid disclosure

Before screening or submission, the candidate should understand:

- Candidates do not pay.
- Demigod is paid by the employer if the hire starts.
- The candidate controls each introduction.
- Referrers may receive a disclosed reward.
- Referral status does not improve ranking.
- Demigod facilitates negotiation but is not a secret dual fiduciary.

### 11.4 Withdrawal

If the candidate withdraws consent:

- Stop future sharing.
- Notify the employer only as needed to close the process.
- Suppress future outreach when requested.
- Propagate the status to search and pair records.
- Preserve only records required for legal, contractual, dispute, or security purposes.

### 11.5 Duplicate representation

Never allow competing recruiters to surprise the candidate.

When a duplicate claim appears:

1. Pause employer presentation if possible.
2. Ask the candidate what they authorized.
3. Compare role-specific timestamps and evidence.
4. Apply the agreement’s prior-relationship rule.
5. Resolve manually.
6. Record the decision.

Candidate choice and valid evidence matter more than an old database entry.

---

## 12. Structured recruiter screening

This is the first major service capability that does not currently exist.

### 12.1 Purpose

The recruiter screen determines:

- Whether the candidate wants the actual opportunity
- Whether evidence supports the accepted criteria
- Whether constraints align
- What remains uncertain
- Whether sharing is authorized

It is not a personality test, technical interview, or “vibe check.”

### 12.2 Format

Initial planning assumption:

- 30–45 minutes
- Human-led
- No default recording
- Short structured evidence note afterward

The time is an internal planning range, not a public promise.

### 12.3 Screen guide

#### Opportunity and motivation

- What would make a move worthwhile now?
- What type of work is most attractive?
- Why is this specific role worth exploring?
- What are the candidate’s non-negotiables?
- What concerns exist?
- What other processes or decision dates are real?

#### Job evidence

- Which prior work best predicts the 90-day outcome?
- What did the candidate personally own?
- What was the scale and constraint?
- What decisions did they make?
- What changed because of their work?
- What failed?
- What tradeoffs did they make?
- What evidence supports every must-have?

#### Startup and environment fit

Use concrete working conditions:

- Ambiguity
- Resource constraints
- Scope changes
- Pace
- Autonomy
- Collaboration style
- Manager access
- Product/customer proximity

Do not use an undefined “culture fit” score.

#### Logistics

- Location
- Remote/hybrid requirement
- Time zone
- Travel
- Notice period
- Earliest realistic start
- Compensation expectations
- Equity appetite
- Work authorization and future sponsorship need, asked lawfully
- Interview availability
- Accommodation route

#### Candidate questions

- Company
- Leadership
- Product
- Funding or risk
- Team
- Role scope
- Equity
- Interview process
- Anything requiring employer clarification

### 12.4 Questions not to ask

- Current or prior salary where prohibited
- Age or date of birth
- Graduation year as an age proxy
- Race
- Religion
- National origin
- Marital status
- Pregnancy or family plans
- Childcare arrangements
- Disability or medical history before a conditional offer
- Genetic or family medical information
- Citizenship when work authorization answers the legitimate question
- Personal social-media content unrelated to work
- Arrest or criminal information outside a lawful, role-specific process
- Any criterion unrelated to the accepted scorecard

### 12.5 Screen record

Store:

- Candidate ID
- Search ID
- Screened timestamp
- Screener
- Candidate interest
- Must-have evidence
- 90-day-outcome evidence
- Motivation
- Constraints
- Compensation alignment
- Location and start
- Sponsorship fact
- Risks
- Open questions
- Candidate-authorized share scope
- Recommendation
- Confidence
- Criteria version

### 12.6 Screen outcome

Use:

- Qualified and interested
- Potential fit; employer clarification needed
- Not qualified for this role
- Qualified but not interested
- Timing mismatch
- Constraint mismatch
- Candidate withdrew

Every negative decision needs a job-related reason, not a protected-trait proxy or unexplained intuition.

### 12.7 Automated score boundary

The current match score may organize work. It must not become the employment decision.

For full service:

- No automatic rejection
- No hidden personality inference
- No protected-trait inference
- No emotion, face, or voice analysis
- No “culture fit” prediction
- Human decision and evidence recorded
- Candidate correction path
- Score inputs and output retained where legally required
- Human override visible

---

## 13. Candidate presentation and mutual yes

### 13.1 Candidate brief

Before mutual yes, present an anonymized decision document rather than forwarding a résumé.

Include:

- Non-identifying professional descriptor
- Generalized current or recent relevant role when the exact employer/title combination could identify the person
- Two to four relevant accomplishments
- Evidence against the 90-day outcome
- Must-have matrix
- Motivation
- Compensation alignment
- Location and work arrangement
- Availability
- Why the conversation is worth having
- Known risks
- Open questions
- Candidate consent evidence without private contact details

Exclude:

- Name, contact details, profile URL, photograph, and résumé
- Unnecessary contact information
- Protected information
- Recruiter speculation presented as fact
- Private negotiation limits not approved for sharing
- Referral reward details unrelated to the decision

After mutual yes, the introduction may include the identity, contact details, and résumé that the candidate specifically approved. The pre-mutual brief and post-mutual introduction are two views of the same pair record, not two records.

### 13.2 Presentation order

1. Search lead reviews evidence.
2. Candidate sees accurate company and role context.
3. Candidate authorizes the anonymized brief and the exact identity package that may be released only if the employer also approves.
4. Employer receives the anonymized candidate brief.
5. Employer records interview interest or decline.
6. The two approvals create mutual yes.
7. Demigod releases the approved identity package through the introduction and coordinates the next step.

### 13.3 Slate size

Keep the current narrow-slate principle. Full service should improve evidence, not send more résumés.

### 13.4 Decline feedback

The employer must give a job-related disposition:

- Missing required evidence
- Scope mismatch
- Level mismatch
- Compensation mismatch
- Location/work-arrangement mismatch
- Role changed
- Another candidate showed stronger evidence
- Search paused or closed
- Other specific lawful reason

Demigod should translate that into respectful candidate closure without inventing detailed coaching or disclosing confidential comparisons.

---

## 14. Scheduling operations

Scheduling is the second major missing capability.

### 14.1 One coordinator

One Demigod owner coordinates:

- Candidate availability
- Interviewer availability
- Time zones
- Stage
- Duration
- Format
- Participants
- Meeting link or address
- Accessibility needs
- Confirmation
- Reminder
- Reschedule
- Cancellation
- Completion
- Feedback request

The candidate should not have to coordinate a panel through several founders.

### 14.2 Interview plan first

Scheduling must use the accepted interview plan:

- Stage name
- Purpose
- Competency
- Interviewer
- Duration
- Required preparation
- Feedback owner

An extra interview requires an explicit reason. Interview loops should not grow because the team is indecisive.

### 14.3 Availability

Collect:

- Candidate time zone
- Candidate windows
- Interviewer windows
- Hard constraints
- Earliest date
- Format preference
- Accommodation request route

Do not store medical details. Record only the scheduling adjustment needed.

### 14.4 Calendar invitation standard

Every invite should contain:

- Company and role
- Interview stage
- Date and time with correct time zone
- Duration
- Participants and roles
- Video link or location
- General purpose
- Preparation expectations
- Rescheduling contact
- Accessibility contact

Do not place sensitive candidate notes in the title or guest-visible description.

### 14.5 Scheduling record

Store on the pair:

- Calendar provider
- Calendar event ID
- Stage
- Scheduled start and end
- Time zone
- Participants
- Meeting location/link
- Status
- Created timestamp
- Updated timestamp
- Reschedule count
- Completion evidence
- Cancellation/no-show reason

Gmail and Google Calendar remain the actual communication and scheduling systems. Demigod stores identifiers and outcomes, not a second calendar.

### 14.6 Reminders

Use one modest reminder. Do not build SMS automation initially.

### 14.7 Reschedule protocol

When a change is observed:

1. Identify the responsible party.
2. Notify everyone.
3. Offer new options.
4. Update the canonical calendar event.
5. Update the pair.
6. Preserve the reason.
7. Escalate repeated employer-caused disruption.

### 14.8 No-show protocol

- Confirm safety and communication before assuming bad faith.
- Contact the missing party once.
- Record the event.
- Ask the other side whether rescheduling is appropriate.
- Close or reschedule explicitly.
- Do not silently leave the candidate in `interviewing`.

### 14.9 When scheduling software becomes justified

Add dedicated scheduling automation only when native calendar coordination repeatedly:

- Causes missed interviews
- Creates double bookings
- Consumes a material share of weekly operating time
- Fails under overlapping panels
- Prevents timely candidate communication

Until then, a custom scheduler or another SaaS is not the product.

---

## 15. Interview design and operation

The launch requirement is intentionally small: each stage needs a purpose, interviewer, calendar event, job-related feedback evidence, decision, candidate update, and next action. The structured practices below improve selection quality, but a full competency-consulting engagement, custom work sample, interviewer kit, and calibrated numeric rubric are optional enhancements rather than prerequisites for the first full-service search.

### 15.1 Structured-interview standard

Comparable candidates should receive:

- The same core job-related questions
- Equivalent instructions
- Equivalent time
- The same scoring anchors
- A clear accommodation route
- Evidence-based evaluation

The U.S. Office of Personnel Management describes structured interviews as predetermined, job-related questions evaluated against consistent rating standards. That is the correct design principle even though Demigod serves private startups.

### 15.2 Competency ownership — optional enhancement

Each competency should have one primary interviewer. Repeatedly asking every candidate the same broad background questions wastes time and increases inconsistent intuition.

### 15.3 Rating anchors — optional enhancement

Use a small anchored scale, for example:

- **1 — insufficient evidence:** no relevant example or serious contradiction
- **2 — partial evidence:** related example but below required scope or depth
- **3 — meets:** clear evidence at required scope
- **4 — exceeds:** evidence beyond required scope with transferable judgment

The written evidence matters more than the number.

### 15.4 Interviewer kit — optional enhancement

Provide:

- Role purpose
- 90-day outcome
- Competency assigned
- Approved questions
- Evidence indicators
- Rating anchors
- Questions to avoid
- Candidate brief
- Stage purpose
- Logistics
- Feedback checkpoint

### 15.5 Work samples — optional enhancement

Use a work sample only when:

- It resembles real role work.
- It tests an accepted competency.
- It is reasonably short.
- It is not unpaid client work.
- Criteria are disclosed.
- Comparable candidates receive equivalent conditions.
- Accessibility alternatives exist.
- Candidate work is not commercially reused.

Demigod should not build a technical-assessment platform. The employer owns role-specific technical judgment.

### 15.6 Candidate preparation

Provide:

- Accurate role and company context
- Interview sequence
- Interviewer names and roles
- Competencies assessed
- Format and duration
- Public materials worth reviewing
- Advice on presenting truthful relevant evidence
- Open employer questions

Do not provide hidden questions, fabricate stories, or coach misrepresentation.

### 15.7 Interview-round record

For each round:

- Pair ID
- Stage
- Calendar event ID
- Completed timestamp
- Participants
- Competencies
- Employer evidence
- Anchored rating
- Candidate debrief
- Decision
- Decision reason
- Unanswered questions
- Next action
- Owner
- Feedback timestamp

### 15.8 Independent feedback

Interviewers should submit evidence before a group debrief. This reduces conformity and highest-status-person bias.

### 15.9 Debrief

The search lead should:

1. Confirm feedback is complete.
2. Start from accepted criteria.
3. Ask for evidence.
4. Surface contradictions.
5. Prevent criteria from being rewritten around a favored candidate.
6. Distinguish missing evidence from negative evidence.
7. Record advance, hold, reject, or offer-readiness decision.
8. Assign the next action.
9. Close the candidate loop.

### 15.10 Interview accommodations

Demigod may ask all candidates whether they need an accommodation for the hiring process. It should not ask for disability history or diagnosis. Store only what is needed to coordinate the process, with restricted access.

### 15.11 Recording

Do not record interviews by default. If a future use genuinely requires recording:

- Determine applicable law.
- Obtain proper notice and consent.
- Define purpose.
- Restrict access.
- Set retention.
- Offer an alternative where needed.

---

## 16. Feedback, candidate communication, and pipeline control

### 16.1 Required pair fields

Every meaningfully engaged candidate must have:

- Current stage
- Stage-entry timestamp
- Search owner
- Next action
- Next-action owner
- Agreed checkpoint
- Latest candidate contact
- Latest employer contact
- Consent state
- Decision evidence
- Withdrawal or rejection reason

### 16.2 Internal operating targets

These are initial internal service targets, not public guarantees:

- Candidate messages acknowledged within one business day
- Scheduling action within one business day when calendars permit
- Employer feedback requested immediately after the round
- Employer feedback expected within two business days
- Candidate updated within one business day after Demigod receives a decision
- Weekly employer calibration while a search is active
- Offer risk escalated immediately when observed

If the employer repeatedly breaks the agreed feedback cadence, pause sourcing rather than silently degrading the candidate experience.

### 16.3 Candidate closure

Every candidate who screens or interviews receives:

- An explicit current status
- A respectful rejection, withdrawal confirmation, or hold explanation
- No indefinite “maybe”
- No promise to retain the résumé forever
- A separately explained option for future opportunities
- An opt-out and data-request route

### 16.4 Hold state

A hold needs:

- Reason
- Owner
- Next review date
- Candidate informed
- Employer informed

Otherwise it is a disguised ghosting state.

### 16.5 Search update

The employer’s weekly update should contain facts:

- Search status
- Work completed
- Candidate stages
- Market feedback
- Conversion
- Constraints
- Role questions
- Blockers
- Decisions needed
- Next work

“No qualified candidate yet” is a valid update.

---

## 17. Offer readiness

Offer work begins before a written offer.

### 17.1 Candidate pre-close

Privately reconfirm:

- Interest level
- Role and title expectations
- Base requirements
- Equity questions
- Work arrangement
- Location
- Start timing
- Notice period
- Competing processes
- Decision criteria
- Remaining reservations
- Deal-breakers
- Counteroffer risk
- Information authorized for employer relay

Do not ask salary history. Ask expectations and alignment.

### 17.2 Employer pre-close

Confirm:

- Final approval authority
- Approved base envelope
- Equity
- Bonus, commission, or sign-on
- Benefits
- Title
- Scope
- Location and work arrangement
- Start flexibility
- Negotiable terms
- Fixed terms
- Internal-equity constraints
- Background or reference contingencies
- Written-offer process
- Offer deadline, if genuinely required

### 17.3 Offer-readiness gate

Do not issue an offer until:

- Candidate interest is current.
- Major reservations are known.
- Employer authority is confirmed.
- Proposed terms fit the approved range or a deviation is explicitly approved.
- The role has not materially changed.
- Required interview evidence exists.
- Contingencies are identified.
- Written-offer owner is known.

### 17.4 Offer record

Store:

- Pair ID
- Offer version
- Employer approver
- Date
- Base
- Equity
- Bonus/commission/sign-on
- Title
- Location
- Work arrangement
- Start
- Benefits reference
- Contingencies
- Expiration, if any
- Candidate response
- Employer response
- Written evidence

Restrict access because compensation and negotiation records are sensitive.

---

## 18. Negotiation

Negotiation is the most sensitive addition because Demigod is paid by the employer while promising the candidate a respectful process.

### 18.1 Role

Demigod is a transparent process steward:

- It clarifies priorities.
- It accurately transmits authorized terms.
- It identifies misalignment.
- It suggests possible structures.
- It preserves confidentiality.
- It keeps written versions.
- It prevents avoidable surprises.

It does not secretly decide what either side should accept.

### 18.2 Rules

Demigod may:

- Relay a candidate’s authorized request.
- Relay an employer’s authorized response.
- Clarify total package components.
- Help separate required terms from preferences.
- Suggest package levers already authorized by the employer.
- Check whether verbal commitments appear in writing.
- Maintain momentum without false urgency.

Demigod must not:

- Invent a competing offer.
- Invent another candidate.
- Inflate or suppress a request.
- Reveal a private candidate minimum without permission.
- Pressure acceptance.
- Misrepresent equity value.
- Provide tax, legal, securities, or immigration advice.
- Promise approval.
- Accept, reject, or counter without express authority.
- Treat verbal enthusiasm as acceptance.

### 18.3 Candidate private information

Separate:

- Candidate’s confidential reservation point
- Candidate’s shareable target
- Candidate’s package preferences
- Candidate’s authorized message

Only the authorized message is relayed.

### 18.4 Negotiation event

Each material event records:

- Offer version
- Source
- Authorization
- Exact requested change
- Reason
- Share scope
- Recipient
- Response
- Timestamp
- Next action

### 18.5 Equity

Demigod may relay verbatim, official company-provided equity information:

- Grant amount or percentage as stated
- Vesting schedule
- Exercise window
- Company-provided dilution caveat
- Official plan documents

It must add no valuation framing, characterization, or opinion and must not claim future value or provide investment advice.

### 18.6 Decision time

Any deadline must be real, authorized, and reasonable. False scarcity would destroy the trust model.

---

## 19. Acceptance, pre-start, and actual start

### 19.1 Distinct events

Track:

- Offer prepared
- Offer issued
- Offer revised
- Offer accepted in writing
- Offer declined
- Offer withdrawn
- Contingencies pending
- Contingencies cleared
- Expected start
- Actual start
- Accepted but did not start

The current `interviewing → hired` jump is not sufficient.

### 19.2 Written acceptance

Acceptance requires:

- Final written offer
- Candidate’s written acceptance
- Accepted terms version
- Expected start
- Known contingencies

### 19.3 Pre-start follow-through

After acceptance:

- Confirm resignation or notice timing when the candidate chooses to share it.
- Confirm contingencies.
- Confirm background/reference owner.
- Monitor counteroffer risk without coercion.
- Maintain useful, non-intrusive contact.
- Confirm employer onboarding contact.
- Confirm equipment, location, and first-day instructions.
- Record start changes.

### 19.4 No-start

If the candidate does not start:

- No placement fee.
- Record cause.
- Notify both sides.
- Close or reopen the search.
- Resolve candidate consent.
- Resolve referral state.
- Preserve only necessary evidence.

### 19.5 Actual-start evidence

The start must be confirmed by an authorized employer source and tied to:

- Candidate
- Search
- Pair
- Role
- Actual date
- Base salary
- Terms version
- Evidence

Only then does the placement exist for billing.

---

## 20. Background checks and references

### 20.1 Launch boundary

The employer should contract directly with a compliant background-check provider. Demigod may coordinate timing but should not procure, score, or adjudicate consumer reports at launch.

### 20.2 Why

Third-party employment background reports can trigger Fair Credit Reporting Act duties, including:

- Standalone disclosure
- Written authorization
- Provider certification
- Pre-adverse-action report and rights notice
- Opportunity to dispute
- Post-adverse-action notice
- Secure disposal

State and local rules can add more.

### 20.3 References

If Demigod later coordinates references:

- Obtain candidate permission.
- Use consistent job-related questions.
- Confirm the referee’s relationship.
- Separate facts from opinions.
- Avoid protected and medical information.
- Record minimally.
- Give the candidate a chance to address disputed material facts.

### 20.4 Medical inquiries

Pre-offer disability and medical inquiries are generally restricted. Any post-offer medical process belongs to the employer and qualified provider.

---

## 21. Billing, collection, and financial controls

### 21.1 Invoice workflow

1. Confirm actual start.
2. Confirm accepted employer-terms version.
3. Confirm compensation evidence.
4. Calculate fee from one canonical rate and basis.
5. Create valid invoice number.
6. Record billing entity and address.
7. Set invoice date and due date.
8. Deliver invoice.
9. Preserve delivery evidence.
10. Track payment status.
11. Record bank/processor evidence.
12. Reconcile amount.
13. Mark paid only from observed evidence.

### 21.2 Required statuses

- Draft
- Sent
- Due
- Paid
- Partially paid
- Disputed
- Overdue
- Written off
- Credited
- Refunded

Do not infer payment from an invoice or an email.

### 21.3 Collections

Add a small manual aging process:

- Upcoming due
- Due today
- Overdue
- Disputed
- Escalated

Every item needs:

- Owner
- Latest contact
- Next action
- Evidence

No collections platform is needed until invoice volume exists.

### 21.4 Fee truth

The rate and basis are currently inconsistent or duplicated across website copy, the fee sheet, revenue code, closing code, and referral calculations. Before the first full-service agreement:

- One canonical commercial-rate definition
- One exact “first-year base salary” basis
- Immutable agreement, rate, basis, scorecard, and consent snapshots stored with each accepted search, presentation, and placement
- Referral calculations based on actual collected and retained fee
- Website copy generated or verified against the same truth

Do not build a generalized pricing engine. One current rate plus versioned historical terms is enough.

### 21.5 Guarantee reserve

Before offering a replacement or refund:

- Define maximum exposure.
- Reserve enough cash or capacity.
- Delay referral settlement until day 90 and fee retention.
- Connect guarantee status to placement and invoice.
- Define what happens when a replacement is hired.

---

## 22. Post-start service

The service should continue through the point at which Demigod can learn whether the match was real.

### 22.1 Cadence

- First week
- Day 30
- Day 60
- Day 90

### 22.2 Separate conversations

Check in separately with employer and candidate. Do not automatically share private comments across sides.

### 22.3 Questions

- Is employment continuing?
- Is the role materially what was represented?
- Is the 90-day outcome still appropriate?
- What is on track?
- What is blocked?
- Has scope changed?
- Has compensation changed?
- Has location or remote policy changed?
- Has the reporting line changed?
- Is there a material mismatch?
- Would a facilitated clarification help?

### 22.4 Boundaries

Demigod may:

- Clarify expectations.
- Surface a material representation mismatch.
- Facilitate a conversation.
- Record outcome.
- Determine contracted guarantee eligibility.

Demigod should not:

- Become the manager.
- Evaluate day-to-day performance.
- Handle ordinary employee relations.
- Give termination advice.
- Promise that intervention will preserve employment.

### 22.5 Canonical retention result

Use one placement-retention record:

- Placement ID
- Start date
- First-week status
- Day-30 status
- Day-60 status
- Day-90 employment status
- Day-90 outcome status
- Employer evidence
- Candidate evidence
- Material changes
- Departure date and reason
- Guarantee status
- Referral eligibility

The referral system should derive from this result rather than maintaining a second independent retention truth.

### 22.6 Retention is not quality

Day-90 employment is necessary for referral and guarantee decisions. It is not sufficient proof of a good match.

Also record whether the accepted 90-day outcome is:

- On track
- Partially on track
- Off track
- Invalidated by role change
- Unknown

---

## 23. Data and state architecture

### 23.1 Do not create dozens of top-level states

Use small search states and append-only pair events.

### Search state

- New
- Qualified
- Accepted
- Active
- Paused
- Filled
- Closed

Interviewing and offer are candidate-pair stages, not search stages: one search may contain candidates at several stages simultaneously. Search-level counts may be derived from pairs.

### Pair events

- Proposed
- Screened
- Qualified
- Candidate declined
- Candidate consented
- Anonymized brief presented
- Employer declined
- Mutual yes
- Intro made
- Interview scheduled
- Interview rescheduled
- Interview completed
- Feedback received
- Advanced
- Rejected
- Candidate withdrew
- Offer prepared
- Offer issued
- Offer revised
- Offer accepted
- Offer declined
- Offer withdrawn
- Contingency cleared
- Start changed
- Started
- No-start
- Invoice linked
- Payment observed
- First-week check
- Day-30 check
- Day-60 check
- Day-90 check
- Retention resolved
- Departed

`Sourced`, `Contacted`, and `Replied` remain lead/outreach events linked to a search; copying them into the pair would create two histories. `Invoice linked` and `Payment observed` reference canonical financial records and receipts rather than duplicating financial state. The current summarized funnel may project `interviewing`, `hired`, `invoiced`, and `paid` for compatibility. It should not own the detailed truth.

### 23.2 Evidence requirements

| Owner | Event | Minimum evidence |
|---|---|---|
| Search | Search accepted | Accepted agreement snapshot + scorecard + authority |
| Lead/outreach | Contacted | Actual send receipt linked to search |
| Pair | Screened | Structured screen note |
| Pair | Qualified | Scorecard evidence |
| Pair | Candidate consented | Company/role-specific consent under the active notice |
| Pair | Anonymized brief presented | Approved brief + delivery receipt |
| Pair | Mutual yes | Named employer approver authority/evidence + candidate approval |
| Pair | Intro made | Approved identity package + delivery receipt |
| Pair | Interview scheduled | Calendar event identity |
| Pair | Interview completed | Completion confirmation |
| Pair | Feedback received | Interviewer evidence note |
| Pair | Offer issued | Employer-authorized written offer |
| Pair | Offer revised | Versioned written terms |
| Pair | Offer accepted | Candidate written acceptance |
| Pair placement | Started | Employer start confirmation |
| Pair reference | Invoice linked | Canonical invoice ID + valid invoice + delivery evidence |
| Pair reference | Payment observed | Canonical payment receipt from bank or processor |
| Pair reference | Retention resolved | Employer/candidate day-90 evidence under policy |

### 23.3 Data classes

#### Public

- Public role copy
- Approved company description
- Public compensation range
- Public candidate-facing process

#### Private operational

- Contact details
- Résumé
- Screen notes
- Fit evidence
- Interview status
- Consent
- Source

#### Restricted

- Compensation expectations
- Offer versions
- Private negotiation positions
- Accommodation logistics
- Employer feedback
- Candidate debrief
- Billing evidence
- Tax information

#### Do not collect in recruiting operations

- Social Security number
- Banking information from candidates
- Identity-document scans
- Medical history
- Family information
- Passwords
- Unnecessary personal social content
- Protected-demographic data mixed into selection notes
- Default audio/video recordings

### 23.4 Append-only events

Material events should record:

- Event ID
- Idempotency key
- Expected record revision
- Resulting record revision
- Event type
- Search ID
- Candidate ID
- Pair ID
- Actor
- Occurred-at timestamp
- Recorded-at timestamp
- Source system
- External receipt ID, if any
- Evidence reference
- Previous state
- Result
- Next action
- Redaction state

Corrections should be additive rather than silently rewriting history. External actions must reject stale revisions and duplicate idempotency keys so a retry cannot send a second message, calendar invitation, offer, invoice, or reward.

The current `pair.history` is rewritten with the pair file and capped at 40 entries. It is not an audit log. Full-service events require an uncapped append-only evidence path or an existing append-only ledger pattern reused from referrals; do not relabel the current history as compliant evidence.

### 23.5 Bridge repair

The startup-submission-to-search bridge currently discards useful intake context. The first technical change should preserve:

- Company stage
- Role
- Requirements
- 90-day outcome
- Location
- Compensation
- Urgency
- Employment type
- Contact
- Source

Then the private kickoff adds commercial and interview details. There is no reason to bloat the public form.

### 23.6 Canonical identity migration

Before post-introduction work begins, map:

- Startup submission ID
- Pilot/search ID
- Role ID
- Lead ID
- Candidate ID
- Current role-plus-candidate pair ID
- New immutable search-plus-candidate pair ID
- Legacy `founder` consent mapped to a named employer approver, authority, timestamp, and evidence

Every migrated pair must retain migration provenance and the original IDs. A generic legacy `founder: true` flag is not sufficient employer-side authority. Reopened or materially changed roles receive a new search ID rather than reusing history. No screen, consent, interview, offer, or placement event may exist without one resolvable search ID and candidate ID.

### 23.7 Legacy consolidation

The legacy pilot shortlist and close paths should not receive new lifecycle responsibilities.

Migration direction:

1. Search/pilot remains the engagement record.
2. Lead remains sourcing/contact.
3. Migrated pair becomes the candidate × immutable-search process record.
4. `pair.placement` owns the start and outcome references without copying invoice, payment, guarantee, or referral state.
5. Confirm that each existing candidate’s active privacy-notice version authorizes use in the full-service search; otherwise deliver the updated notice and capture the required consent before inclusion.
6. Legacy tools become read-compatible or retire after migration.

---

## 24. Dashboard and tooling

### 24.1 One existing dashboard

Do not create a recruiting dashboard beside the current dashboard. Run the first complete workflow from canonical records and a small existing-home projection. Add one concise **Delivery** view to the existing control plane only after the underlying events work; the UI is not a launch dependency.

### 24.2 Delivery view

Show:

- Accepted searches
- Search owner
- Current search state
- Next obligation
- Search age
- Human hours
- Current blocker
- Candidates awaiting Demigod action
- Candidates awaiting employer feedback
- Upcoming interviews
- Missing feedback
- Offer risks
- Expected starts
- Invoices due or overdue
- Day-30/60/90 checks
- Potential fee
- Referral liability
- Evidence links

### 24.3 Dashboard rules

- Projection only
- Canonical records remain below it
- No separate dashboard database
- No public PII
- No vanity counts
- No invented activity
- No hidden automated rejection
- Every warning links to the underlying record
- Writes are added only when a repeated operator need is proven

### 24.4 Minimum daily view

The operator should be able to answer:

1. What searches are accepted?
2. What is the next action on each?
3. Which candidates need an update?
4. Which employers owe feedback?
5. What interviews are next?
6. What offers are at risk?
7. What money or outcome event is due?

Everything else is secondary.

### 24.5 Native tools first

Use:

- Existing WIZ
- Existing private submissions
- Existing lead funnel
- Migrated existing pair ledger
- Gmail
- Google Calendar
- Existing fee and invoice-stub evidence
- Existing dashboard

Do not add:

- A custom calendar
- A new CRM
- A new ATS
- A client portal
- A candidate portal
- A negotiation chatbot
- A video-interview system
- A technical-assessment platform
- A data warehouse

### 24.6 Automation triggers

| Pain | Add only when observed |
|---|---|
| Repeated scheduling errors or heavy coordination time | Calendar integration or scheduling assistant |
| Lost candidate communications | Improve pair-event capture |
| Repeated missing feedback | One reminder/escalation mechanism |
| Invoice volume and reconciliation pain | Stripe Invoicing or accounting integration |
| More active searches than the current records can safely manage | Evaluate an ATS before building one |
| Repeated manual offer-version errors | Small versioned offer helper |
| Repeated privacy requests | Minimal request ledger and deletion propagation |

### 24.7 Outbound-action authority

At launch, every external action remains human-confirmed:

| Action | Initial authority |
|---|---|
| Sourcing message | Draft, human review, observed send receipt |
| Candidate brief | Draft, consent check, human send receipt |
| Calendar invitation or change | Human confirmation, calendar event receipt |
| Interview feedback request | Human confirmation, send receipt |
| Offer or counteroffer relay | Exact written authority, human confirmation, version and send receipt |
| Invoice | Start and terms evidence, human confirmation, valid invoice and delivery receipt |
| Referral reward | Eligibility evidence, tax readiness, human payment, processor/bank receipt |

No background job should send, schedule, promise terms, invoice, or pay merely because a state changed. If any action is automated later, its idempotency key, expected revision, external receipt, retry rule, and failure notification must be proven first.

---

## 25. Privacy, security, fairness, and legal readiness

This is an operational checklist, not a substitute for jurisdiction-specific legal advice.

### 25.1 Employment-agency coverage

The EEOC states that employment agencies that regularly refer candidates are covered by federal employment-discrimination rules regardless of their own employee count or whether they receive payment. Demigod must not honor discriminatory employer preferences.

California’s Employment Agency Act expressly exempts a person charging fees exclusively to employers from that particular title, but other federal, state, local, privacy, contract, advertising, and tax obligations remain. The employer-paid, candidate-free structure should remain.

Do not generalize California’s exemption to another jurisdiction. Before accepting each search, confirm whether the employer, role location, candidate location, or Demigod’s activity creates an employment-agency license, registration, bond, contract-language, or reporting requirement, and satisfy it or decline the search.

### 25.2 Job-related selection

Every criterion must:

- Connect to the work.
- Have an evidence definition.
- Be applied consistently.
- Avoid protected-trait proxies.
- Be reviewed when the role changes.

Selection procedures that disproportionately exclude protected groups can create risk even when the wording appears neutral.

### 25.3 California salary history and pay transparency

For California hiring:

- Do not ask current or prior salary.
- Ask compensation expectations.
- Ensure the employer supplies a good-faith pay scale where required.
- Ensure third-party recruiter postings use the approved scale.
- Do not use prior salary to justify a new offer.

### 25.4 Disability and accommodations

- Offer an accommodation route for the hiring process.
- Do not ask disability or medical-history questions before a conditional offer.
- Store only the required scheduling adjustment.
- Keep medical information separate and restricted if any is lawfully received.
- Employer owns post-offer medical processes.

### 25.5 Work authorization

Ask neutral work-authorization and future-sponsorship questions. Do not use citizenship questions when work authorization addresses the legitimate business need.

### 25.6 Background checks

Keep the employer and a compliant vendor responsible. If Demigod later procures or uses reports, implement FCRA and state/local requirements before doing so.

### 25.7 Automated-decision systems

California’s employment automated-decision-system regulations became effective October 1, 2025. Their definition is broad enough to cover computational processes that facilitate human employment decisions, and California requires relevant automated-decision data to be preserved for at least four years.

Demigod’s matching score therefore needs a deliberate governance model even though a human reviews it:

- Document inputs and logic.
- Treat it as advisory.
- Do not auto-reject.
- Record human evidence and override.
- Review proxy risks.
- Preserve required records.
- Provide correction and accommodation routes.
- Check every new jurisdiction before using automated selection.

Human review is meaningful only when the person has authority, evidence, time, and the practical ability to disagree.

### 25.8 Record retention

Define periods by record type:

- Prospect never contacted
- Contacted and declined
- Candidate who opted out
- Screened candidate
- Presented candidate
- Interviewed candidate
- Placement
- Commercial attribution
- Consent
- Automated-decision input/output
- Referral/tax/payment
- Incident
- Legal hold

Federal EEOC rules generally require covered private employers to retain many hiring records for at least one year; California automated-decision records may require four years; contracts, tax records, claims, other jurisdictions, and active disputes may require different periods.

The correct model is:

- Retain the minimum evidence required for the applicable period.
- Separate decision evidence from unnecessary raw PII.
- Delete or suppress unnecessary data.
- Use a tombstone when an event identity must remain but its personal payload can be removed.
- Redact or destroy PII in historical evidence references when deletion applies.
- Preserve a restricted legal-hold copy only when a documented hold or other obligation requires it.
- Record who approved each exception and when it expires.
- Stop using “we might need it someday” as the only rationale.

Append-only does not mean undeletable PII. Event identity and business chronology may remain while personal payloads are redacted according to the retention and legal-hold policy.

### 25.9 Candidate privacy notice

Explain:

- Who Demigod is
- What it collects
- Sources
- Purposes, including full-service sourcing, screening, presentation, interview coordination, and closing
- Employer recipients
- Service providers
- Retention
- Candidate rights
- Request route
- Automated processing
- Referral attribution
- International transfer, if applicable
- Contact

Record the notice version attached to consent.

### 25.10 Data-subject and candidate requests

Create a minimal private request ledger:

- Requester
- Identity verification
- Request type
- Received date
- Applicable deadline
- Systems searched
- Exceptions
- Action
- Evidence
- Completion

Support:

- Access
- Correction
- Deletion
- Suppression
- Consent withdrawal
- Opt-out

### 25.11 Security controls

Minimum:

- Named user accounts
- Multi-factor authentication
- Least privilege
- Field-level authorization and redaction for offer, negotiation, accommodation, feedback, billing, tax, and candidate-contact data
- Runnable access tests proving public and ordinary operator views cannot read restricted fields
- Private files
- Encryption in transit and at rest through established providers
- Provider-native safe preview or quarantine/content inspection for untrusted résumés before operator download
- Restricted offer and compensation records
- No PII in public logs
- No private candidate data in casual prompts or chats
- Vendor register
- Access removal on offboarding
- Backups plus a tested restoration drill for searches, pairs, consents, offer versions, invoices, and retention evidence
- Secure disposal
- Incident response
- Audit events for sensitive actions

### 25.12 Platform terms

Do not scrape professional platforms in violation of their terms. LinkedIn expressly restricts unauthorized automated crawling and extraction. Use licensed or manual features and record provenance.

### 25.13 Email and SMS

Use the FTC’s CAN-SPAM baseline for commercial email:

- Accurate headers
- Honest subjects
- Business identification
- Contact address
- Opt-out
- Timely suppression
- Vendor oversight

Do not automate cold SMS until consent, provider, content, opt-out, and jurisdiction rules are deliberately implemented.

### 25.14 Referral payouts

Before first cash payout:

- Verify beneficiary identity.
- Obtain tax certification.
- Determine reporting treatment for that year.
- Check conflicts and employer policies.
- Check sanctions and international payment issues where applicable.
- Preserve settlement evidence.

Tax thresholds change. The system should not hard-code a permanent reporting threshold into marketing copy.

### 25.15 Insurance and counsel

Before describing full service as live, review:

- Employer agreement
- Candidate notice and consent
- State licensing/registration matrix
- E&O or professional liability
- Cyber coverage
- General liability
- Background-check boundary
- Automated-decision use
- Guarantee terms
- Referral payout rules

---

## 26. Human operating model and capacity

### 26.1 Initial hats

One person may wear all hats, but each responsibility remains explicit.

#### Search lead

- Client relationship
- Search acceptance
- Calibration
- Search thesis
- Screen
- Match judgment
- Weekly update
- Offer process
- Outcome review

#### Sourcer

- Market map
- Research
- Referrals
- Selective outreach
- Source records
- Suppression

#### Coordinator

- Availability
- Calendar invitations
- Changes
- Candidate preparation
- Feedback requests
- Candidate updates

#### Closing lead

- Pre-close
- Offer versions
- Authorized negotiation relay
- Written acceptance
- Pre-start

#### Finance and controls

- Terms evidence
- Start evidence
- Invoice
- Collection
- Guarantee
- Referral liability
- Day-90 settlement

### 26.2 Initial capacity ceiling

The proof starts with one employer and one active search. After that first operating proof, one full-service operator may carry:

- One search requiring active sourcing
- Up to two additional searches only after they have left active sourcing and entered interview, offer, pre-start, billing, or outcome follow-through

This is a safety ceiling, not a benchmark claim.

### 26.3 Add a coordinator when

- Scheduling and feedback consistently consume roughly one workday per week.
- Interviews are missed.
- Candidate updates are late because of administrative load.
- Overlapping panels routinely create conflicts.

### 26.4 Add a sourcer when

- Research displaces screening and closing.
- Two active searches consume most of the search lead’s delivery time.
- Search coverage becomes demonstrably narrow.

### 26.5 Add another search lead when

- The operating model is repeatable.
- Existing search quality remains healthy.
- Demand exceeds the active-search ceiling.
- Unit economics support loaded cost.
- Consent, closure, and outcome quality do not deteriorate.

### 26.6 Planning-hour hypothesis

For capacity budgeting, a successful full-service search may initially require:

| Work | Planning range |
|---|---:|
| Qualification, agreement, calibration | 3–6 hours |
| Market map and search design | 4–8 hours |
| Research and outreach | 20–45 hours |
| Screens and evidence notes | 5–12 hours |
| Candidate presentation and calibration | 2–5 hours |
| Scheduling and feedback | 4–12 hours |
| Offer and close | 3–8 hours |
| Billing and outcome checks | 2–4 hours |
| **Total** | **43–100 hours** |

These are planning assumptions to replace with Demigod’s observed data. They must never appear as public performance claims.

---

## 27. Economics and pricing

### 27.1 Contribution formula

For every accepted search, measure:

```text
expected contribution
  = probability of fill × collected fee
  - referral liability
  - guarantee/replacement reserve
  - human hours × loaded hourly cost
  - sourcing/tool cost
  - collection loss
```

The service cannot be priced from successful placements alone. Unfilled searches consume labor too.

### 27.2 Example at $180,000 base

At 10%:

- Client fee: $18,000
- 20% talent-referral reward: $3,600
- Demigod before labor, overhead, guarantee, tax, and other referral liability: $14,400

If a successful search takes 60 hours but only half of accepted searches fill, approximately 120 service hours are consumed for each collected fee. That is $120 per service hour before overhead. At a one-third fill rate it becomes approximately $80 per service hour.

These examples explain why search acceptance, client commitment, hours, fill rate, and referral stacking matter more than the headline percentage.

### 27.3 Pricing path

#### While proving the service

- 10%
- One rate
- One accepted role
- Short focused-search commitment
- Tight capacity
- No unsupported guarantee
- Measure every hour and outcome

#### When full-service readiness is proven

- 15% for new agreements
- Existing agreements grandfathered
- Same simple base-salary definition
- One contracted replacement-search policy
- No packages or subscription

### 27.4 Readiness to charge 15%

All must be true:

- Scheduling ownership works.
- Interview feedback is controlled.
- Offer and negotiation records work.
- Accepted and started are distinct.
- Employer terms are enforceable and versioned.
- Candidate notice and consent are versioned.
- Manual invoicing and collection work.
- Post-start outcome checks work.
- At least three paid placements remain employed through day 90.
- Human hours and fill rate make 10% economically weak or evidence shows price is not blocking demand.
- Public claims can point to actual capability.

Three retained placements are a governance threshold, not statistically sufficient proof of demand elasticity.

### 27.5 What not to add

- 12% compromise price
- Good/better/best tiers
- Founding-client coupon machinery
- Volume discounts before volume
- Executive surcharge
- Subscription
- Retainer
- Percentage negotiation engine
- Public ROI calculator

---

## 28. Metrics

The pilot weekly scorecard is only §28.1: raw workload, age, hours, blocker, and next-obligation facts. Sections 28.2–28.5 are a later diagnostic catalog, not a dashboard backlog. Calculate them only when a real question and a meaningful denominator exist; do not infer statistical proof from the first few searches.

### 28.1 Search truth

- Accepted searches
- Active sourcing searches per operator
- Days since acceptance
- Human hours
- Current blocker
- Next obligation
- Employer-feedback age
- Candidate-update age

### 28.2 Funnel

- Sourced → contacted
- Contacted → interested
- Interested → screened
- Screened → qualified
- Qualified → presented
- Presented → first interview
- First interview → final
- Final → written offer
- Offer → accepted
- Accepted → started
- Started → day-90 retained

Always show numerator, denominator, and time window.

### 28.3 Business quality

- Accepted-search fill rate
- Time to accepted scorecard
- Time to first qualified interested candidate
- Presentation-to-interview conversion
- Offer acceptance
- Accepted-to-start
- Day-90 employment retention
- Day-90 outcome on track
- Hours per accepted search
- Hours per filled search
- Net fee after reward liability
- Contribution per placement
- Collection days
- Guarantee claims

### 28.4 Candidate and client quality

- Candidate consent before every share
- Interviewed candidates given closure
- Employer terms accepted before sourcing
- Pay range present
- Interview plans with scorecards
- Feedback completion
- Opt-outs honored
- Candidate complaints
- Employer complaints
- Privacy incidents
- Unsupported public claims

### 28.5 Learning

- Why candidates decline outreach
- Why candidates fail screens
- Why employers decline presentations
- Why candidates withdraw
- Why offers fail
- Why accepted candidates do not start
- Why hires depart
- Which intake criteria repeatedly change
- Which sources yield interviews, offers, starts, and retention
- When automated match suggestions disagree with human evidence

### 28.6 Vanity metrics to avoid

- Profiles viewed
- Raw messages drafted
- Raw outreach count without relevance
- “AI matches generated”
- Total database size
- Dashboard activity
- Unverified pipeline value

---

## 29. Readiness gates

These are outcome gates, not generic business phases.

### Gate A — The service is defined

Pass when:

- Employer agreement exists.
- Candidate notice exists.
- Search activation exists.
- Fee basis and trigger are exact.
- Service inclusions and exclusions are written.
- Guarantee is either absent or fully defined.
- Candidate-attribution rules are written.
- Privacy and legal review are complete for initial jurisdictions.
- Initial-jurisdiction licensing, registration, and bonding matrix is complete.
- Restricted-field access and redaction tests pass.
- Deletion, tombstone, retention, and legal-hold behavior agree.

### Gate B — A search can be accepted safely

Pass when:

- Intake bridge preserves canonical fields.
- Canonical submission, lead, candidate, search, role, and pair IDs are mapped.
- Every active pair has an immutable search ID and migration provenance.
- Search owner exists.
- Scorecard exists.
- Compensation is approved.
- Hiring authority exists.
- Interview plan exists.
- Terms version is accepted.
- Capacity gate works.
- Per-search licensing, registration, and bonding status is satisfied or not applicable.
- Bad searches can be refused or paused.

### Gate C — A candidate can be sourced and screened safely

Pass when:

- Search-specific sourcing exists.
- Provenance exists.
- Outreach disclosure exists.
- Opt-out works.
- Existing-candidate notice authorizes full-service use or has been updated.
- Untrusted résumés have a safe preview or quarantine path.
- Recruiter screen exists.
- Lawful-question guide exists.
- Candidate-specific evidence exists.
- Employer approver identity, authority, timestamp, and evidence replace generic legacy founder consent.
- Company/role consent and anonymized pre-mutual presentation exist.

### Gate D — Demigod owns interviews

Pass when:

- Calendar process works.
- Every interview is scoped to an immutable search/candidate pair.
- Accommodation route works.
- Candidate preparation exists.
- Each stage has a purpose, interviewer, calendar receipt, job-related feedback evidence, decision, and next action.
- Missing-feedback escalation exists.
- Candidate closure exists.
- Calendar and message retries cannot duplicate external actions.

### Gate E — Demigod owns offer and close

Pass when:

- Candidate pre-close exists.
- Employer offer-readiness exists.
- Offer versions are recorded.
- Negotiation authority is explicit.
- Private candidate positions remain private.
- Restricted offer and negotiation fields pass authorization tests.
- Offer and negotiation relays are revision-checked, idempotent, and receipt-backed.
- Written acceptance is recorded.
- Start and no-start are distinct.
- Actual-start evidence triggers billing.

### Gate F — Revenue and outcome are real

Pass when:

- Valid invoice can be issued.
- Due date and delivery are recorded.
- Payment evidence can be reconciled.
- Invoice and reward retries cannot duplicate external actions.
- Overdue items are visible.
- Guarantee status is coherent.
- First-week and 30/60/90 checks work.
- Referral liability derives from the placement.

### Gate G — The public claim is honest

Pass when:

- At least one real search has traversed the whole service.
- Failure branches have been tested.
- No public promise exceeds observed capability.
- One accountable operator can run it.
- The existing dashboard or small projection reflects canonical evidence.
- Privacy and money paths fail closed.
- Backup restoration has been demonstrated for search, pair, consent, offer, invoice, and outcome evidence.

### Gate H — The 15% rate is justified

Pass when:

- Full-service gates remain stable.
- At least three paid placements have reached day 90.
- Hours, fill rate, and contribution are measured.
- Client objections and losses are recorded.
- Guarantee exposure is supportable.
- Existing 10% agreements are grandfathered.

### Gate I — Automation is justified

Pass only for a specific repeated failure:

- The manual process fails or consumes material time.
- The failure is measured.
- A native feature does not solve it.
- The proposed automation preserves consent and evidence.
- One small check can prove it.

---

## 30. Outcome-based implementation order

### Outcome 1: Demigod can accept or reject a search without guessing

Add:

- Employer placement agreement
- Search order
- Terms acceptance evidence
- Search scorecard
- Search acceptance checklist
- Search owner
- Capacity gate
- Client cooperation rules

Reuse:

- Startup WIZ
- Pilot/search record

Proof:

> A second informed operator can read the accepted search and independently explain the target candidate, evidence, compensation, interview process, and stop conditions.

### Outcome 2: No canonical intake information disappears

Add:

- Root-cause bridge fix
- Canonical field mapping
- Immutable search ID
- Submission/lead/candidate/role/search/pair identity map
- Existing-pair migration provenance
- Private kickoff fields
- Versioned role changes

Proof:

> Company stage, role, requirements, 90-day outcome, location, compensation, urgency, employment type, contact, and source survive from submission to search, and every active candidate pair resolves to exactly one immutable search and candidate.

### Outcome 3: Demigod can source without spam or attribution confusion

Add:

- Search ID on sourced leads
- Market-map template
- Fit hypothesis
- Provenance
- Existing-relationship check
- Role-specific outreach
- Simple response reasons
- Search-hours tracking

Reuse:

- Existing lead CRM
- Existing outreach receipts
- Existing suppression
- Existing referrals

Proof:

> Every contacted person has a legitimate search, evidence-based reason, actual send record, ownership status, and opt-out path.

### Outcome 4: Demigod can distinguish qualification from a plausible résumé

Add:

- Recruiter-screen guide
- Screen record
- Lawful-question guide
- Candidate share scope
- Anonymized candidate brief and mutual-yes identity release

Reuse:

- Candidate WIZ
- Match evidence
- Human review

Proof:

> Every presented candidate has motivation, constraints, must-have evidence, 90-day-outcome evidence, known risks, and company-specific consent, while identifying details remain private until mutual yes.

### Outcome 5: Neither side has to coordinate the interview loop

Add:

- Interview plan
- Calendar-event record
- Invite standard
- Candidate preparation
- Feedback record
- Candidate update templates
- No-show/reschedule protocol
- Stalled-process control

Reuse:

- Gmail
- Google Calendar
- Migrated pair ledger

Proof:

> Every interview can be reconstructed from calendar identity, participants, purpose, completion, feedback, disposition, and next action.

### Outcome 6: Offers arrive without preventable surprise

Add:

- Candidate pre-close
- Employer offer-readiness
- Versioned offer record
- Negotiation authorization
- Written-offer evidence
- Acceptance/no-start events

Proof:

> Every material term was authorized, every candidate request was shared with permission, and the final written offer matches the recorded version.

### Outcome 7: Placement revenue is collectible and auditable

Add:

- Actual-start confirmation
- Terms version on placement
- Fee-basis evidence
- Valid invoice
- Due date
- Delivery evidence
- Aging and collection
- Payment reconciliation

Reuse:

- Fee calculation
- Pair-bound evidence

Proof:

> A placement is traceable from agreement through introduction, written acceptance, actual start, invoice, and observed payment.

### Outcome 8: The service learns whether the match worked

Add:

- First-week check
- Structured 30/60/90 checks
- Canonical placement-retention result
- Outcome-vs-retention distinction
- Guarantee status
- Referral derivation

Proof:

> Day-90 status, outcome progress, guarantee, and referral eligibility agree without separate clocks.

### Outcome 9: The dashboard shows delivery without becoming an ATS

Add only after Outcomes 1–8 produce reliable canonical events:

- One Delivery view
- Active searches
- Next obligations
- Feedback waits
- Interviews
- Offers
- Starts
- Invoices
- Outcomes

Proof:

> Every displayed item projects a canonical record and no dashboard count can create business reality.

### Outcome 10: Public full-service positioning is truthful

Add later:

- Precise website service scope
- One current fee
- Accurate guarantee copy
- Candidate/employer responsibility copy

Proof:

> Every public claim can be demonstrated in the operating record of a real search.

---

## 31. End-to-end test plan

Before public launch, run fictional data through every branch without polluting real records.

### Search tests

1. Employer inquiry rejected for speculative headcount
2. Search accepted with complete authority and terms
3. Compensation below market
4. Role changes after acceptance
5. Search paused for missing feedback
6. Search closed for hiring freeze
7. Employer requests discriminatory criteria
8. Confidential search
9. Existing internal finalist
10. Duplicate agency engagement

### Sourcing tests

11. Existing consented candidate
12. Referral
13. Public professional source
14. Candidate opts out
15. Bad contact identity
16. Platform-source restriction
17. Candidate already engaged directly
18. Search-specific outreach
19. No response and close-out

### Screening and consent tests

20. Qualified and interested
21. Qualified but not interested
22. Missing must-have
23. Compensation mismatch
24. Location mismatch
25. Sponsorship mismatch
26. Candidate refuses profile sharing
27. Candidate authorizes limited sharing
28. Candidate withdraws consent
29. Candidate corrects inaccurate information
30. Referral disclosure

### Interview tests

31. Normal scheduling
32. Cross-time-zone scheduling
33. Candidate accommodation
34. Employer reschedule
35. Candidate reschedule
36. Candidate no-show
37. Interviewer no-show
38. Missing feedback
39. Contradictory feedback
40. Work sample
41. Candidate rejection
42. Candidate withdrawal
43. Search hold

### Offer tests

44. Offer within approved range
45. Offer below disclosed range
46. Multiple offer revisions
47. Candidate counterproposal
48. Employer rejects counterproposal
49. Candidate has a real competing process
50. Employer attempts false deadline
51. Candidate accepts
52. Candidate declines
53. Employer withdraws
54. Verbal and written terms differ

### Start and billing tests

55. Acceptance with contingency
56. Start date changes
57. Candidate does not start
58. Actual start confirmed
59. Invoice issued
60. Partial payment
61. Invoice dispute
62. Overdue invoice
63. Payment evidence mismatch
64. Referral liability

### Outcome and guarantee tests

65. Healthy first week
66. Role materially changed
67. Day-30 concern
68. Day-60 risk
69. Day-90 retained and on track
70. Day-90 retained but outcome off track
71. Voluntary departure during guarantee
72. Performance termination
73. Layoff exclusion
74. Client nonpayment
75. Replacement search
76. Referral settlement
77. Referral reversal

### Privacy and controls tests

78. Candidate access request
79. Candidate correction request
80. Candidate deletion request
81. Legal-hold exception
82. Unauthorized compensation access
83. PII attempted in public dashboard output
84. AI suggestion conflicts with human evidence
85. Automated score would reject but human advances
86. Retention purge
87. Security incident
88. Reopened same-role search maps to a new immutable search/pair
89. Retried message, calendar, invoice, or reward cannot duplicate the external action
90. Malicious or mismatched résumé is quarantined from operator download
91. Search, pair, consent, offer, invoice, and outcome records restore from backup
92. Existing candidate notice does not authorize full-service reuse
93. Cross-jurisdiction search requires licensing or registration
94. Candidate identity is attempted in an anonymized pre-mutual brief
95. Employer identity is attempted in outreach under the unrevised live notice
96. Legacy founder consent lacks a named authorized employer approver

Full service is ready only when these scenarios have coherent owners, records, evidence, and outcomes.

---

## 32. Failure modes and controls

| Failure | Control |
|---|---|
| Speculative role | Approved headcount, budget, authority, and acceptance gate |
| Weak definition | Block on 90-day outcome and scorecard |
| Constant role changes | Version, pause, and recalibrate |
| Below-market pay | Surface evidence; reject or redefine |
| Pedigree proxies | Require connection to job evidence |
| Discriminatory request | Refuse and record |
| Open-ended free labor | Focused-search commitment and capacity ceiling |
| Résumé blasting | Narrow slate and company-specific consent |
| Platform scraping | Permissioned/manual sources and provenance |
| Candidate identity shared before mutual yes | Anonymized brief, pair consent, and two-sided approval gate |
| Employer identity shared under the unrevised privacy promise | Versioned asymmetric notice + search-activation disclosure authority |
| Generic founder consent treated as commercial approval | Named employer approver, authority, timestamp, evidence, and migration provenance |
| Duplicate candidate | Prior-relationship rule and evidence |
| Reopened role reuses the wrong candidate history | Immutable search ID and migrated pair identity |
| Retry duplicates an external send, invite, invoice, or payment | Revision check, idempotency key, and external receipt |
| Unsafe résumé reaches an operator | Provider-native preview or quarantine/content inspection |
| Historical event prevents lawful deletion | PII redaction, tombstone, and legal-hold policy |
| Restricted negotiation or accommodation data leaks | Field-level authorization and runnable access tests |
| Records cannot be recovered | Demonstrated backup restoration |
| Match score treated as decision | Human evidence and no auto-rejection |
| Unstructured interview | Accepted questions, competencies, anchors |
| Accommodation mishandled | Private route and minimal logistics data |
| Employer delays feedback | Pause sourcing and escalate |
| Candidate ghosted | Required status and closure |
| Scheduling chaos | One coordinator and canonical calendar |
| Offer outside range | Pre-close and offer-readiness gate |
| Recruiter pressures candidate | Employer-paid disclosure and authorization boundaries |
| Private minimum disclosed | Share-scope field and event log |
| Verbal/written mismatch | Written version controls |
| Accepted candidate does not start | Separate no-start event; no fee |
| Invoice disputed | Terms, attribution, start, and compensation evidence |
| Invoice unpaid | Aging and collections view |
| Early departure | Contracted guarantee conditions |
| Referral conflict | One documented placement reward policy |
| Operator overload | Search ceiling and pause gate |
| Parallel systems disagree | Search/lead/pair ownership model |
| Dashboard theater | Projection-only evidence |
| PII leak | Data classes, least privilege, redaction, incident response |
| Automated-selection bias | Advisory use, records, validation, human override |
| Public overclaim | Capability gate before copy changes |

---

## 33. Canonical operating artifacts

Do not create eleven standalone Markdown forms that can drift from the actual records. Define each field once in its canonical record and render a human-readable view when needed:

| Artifact | Canonical definition |
|---|---|
| Search activation | §§6–7 |
| Role scorecard | §8 |
| Search thesis | §9 |
| Recruiter screen | §12.5 |
| Anonymized candidate brief | §13.1 |
| Schedule and interview round | §§14.5 and 15.7 |
| Offer readiness and offer | §§17.3–17.4 |
| Negotiation event | §18.4 |
| Placement, invoice, and collection | §§19 and 21 |
| Outcome check | §22.5 |

Generated views may be copied into email or a meeting document; they never become an independent source of truth.

---

## 34. What not to build

Do not build:

- A custom ATS
- A second dashboard
- A client portal
- A candidate portal
- A mobile app
- An AI sourcing swarm
- Auto-DM campaigns
- Cold SMS automation
- Automated résumé rejection
- Personality scoring
- Culture-fit scoring
- Emotion, voice, or facial analysis
- AI video interviews
- A technical-assessment platform
- A scheduling product
- A compensation calculator product
- A negotiation chatbot
- Background-check infrastructure
- Payroll
- Employer-of-record services
- A new CRM
- A job-board marketplace
- A pricing-tier engine
- A replacement-claim engine
- A metrics warehouse
- A public activity wall
- More funnel states for appearance
- Another intro, retention, invoice, or referral ledger

Use one search record, one lead record, one pair record, append-only evidence, email, calendar, and the existing dashboard.

---

## 35. Definition of done

Demigod may accurately describe the service as full-cycle only when readiness Gates A–G pass, one real search has traversed the whole required service, all 96 fictional branches have coherent owners and evidence, and every public claim is no broader than the observed capability. Gate H governs a later price change; Gate I governs later automation. Neither is a reason to delay a sound manual service.

The service is elegant when the employer and candidate feel one attentive human process while the internal system remains small, factual, and difficult to fool.

---

## 36. Research and authority notes

These sources inform the blueprint. They are not substitutes for counsel applying the rules to a particular search.

### Recruiting service and market

- [Dover — full-cycle recruiting from sourcing to close](https://www.dover.com/blog/fractional-recruiting-sourcing-to-close)
- [Wellfound Autopilot](https://wellfound.com/recruit/all-features/autopilot)
- [Wellfound Source terms](https://wellfound.com/terms/source)
- [Paraform recruiting agreement](https://www.paraform.com/recruiting-agreement)
- [AESC professional standards](https://www.aesc.org/standards/)
- [NAPS standards of ethical practices](https://www.naps360.org/page/StandardsOfEthical)

### Job analysis and structured selection

- [U.S. Office of Personnel Management — job analysis](https://www.opm.gov/policy-data-oversight/assessment-and-selection/job-analysis/)
- [U.S. Office of Personnel Management — structured interviews](https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews)
- [EEOC — employment tests and selection procedures](https://www.eeoc.gov/laws/guidance/employment-tests-and-selection-procedures)
- [EEOC — employment-agency coverage](https://www.eeoc.gov/employers/coverage-employment-agencies)

### Candidate questions, accommodations, and pay

- [California Equal Pay Act guidance](https://dir.ca.gov/dlse/california_equal_pay_act.htm)
- [EEOC — pre-employment inquiries and disability](https://www.eeoc.gov/pre-employment-inquiries-and-disability)
- [EEOC — pre-employment inquiries and citizenship](https://www.eeoc.gov/pre-employment-inquiries-and-citizenship)

### Background checks

- [FTC and EEOC — background checks employers need to know](https://www.ftc.gov/business-guidance/resources/background-checks-what-employers-need-know)

### Privacy, security, and outreach

- [FTC — Start with Security](https://www.ftc.gov/business-guidance/resources/start-security-guide-business)
- [FTC — CAN-SPAM compliance guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
- [EEOC — recordkeeping obligations](https://www.eeoc.gov/employers/summary-selected-recordkeeping-obligations-29-cfr-part-1602)
- [LinkedIn crawling terms](https://www.linkedin.com/legal/crawling-terms)
- [California Civil Rights Council — automated-decision-system rulemaking](https://calcivilrights.ca.gov/civilrightscouncil/rulemaking-actions/)
- [California Civil Rights Department — automated-decision regulations announcement](https://calcivilrights.ca.gov/2025/06/30/civil-rights-council-secures-approval-for-regulations-to-protect-against-employment-discrimination-related-to-artificial-intelligence/)
- [California Privacy Protection Agency — CCPA and automated-decision updates](https://cppa.ca.gov/regulations/ccpa_updates.html)

### California employer-paid placement structure

- [California Civil Code, Employment Agency Act definitions and employer-paid exemption](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?article=&chapter=1.&division=3.&lawCode=CIV&part=4.&title=2.91.)

### Referral payments

- [IRS information-return guidance](https://www.irs.gov/businesses/small-businesses-self-employed/am-i-required-to-file-a-form-1099-or-other-information-return)
- [IRS forms for independent contractors](https://www.irs.gov/businesses/small-businesses-self-employed/forms-and-associated-taxes-for-independent-contractors)
- [FTC Endorsement Guides](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking)

---

## 37. Final recommendation

The route to full-service recruiting is:

1. Contract the service.
2. Accept only real, supportable searches.
3. Preserve the complete intake.
4. Add a structured human recruiter screen.
5. Make candidate progression pair-specific.
6. Own calendar coordination and feedback.
7. Help the employer run a structured interview process.
8. Pre-close before the offer.
9. Coordinate negotiation transparently.
10. Separate acceptance, start, invoice, payment, and retention.
11. Reuse the existing day-90 evidence model.
12. Measure hours, conversion, collection, and outcome.
13. Add one Delivery view to the existing dashboard.
14. Change public positioning and price only after the operating proof exists.

The moat should not be another recruiting interface. It should be a small, evidence-backed service that candidates trust, startups can understand, and one accountable operator can execute beautifully.
