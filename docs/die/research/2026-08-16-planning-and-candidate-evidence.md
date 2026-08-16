# Planning research → Candidate Evidence Corpus — 2026-08-16

**Status:** research complete · shaped slice implemented locally · full verifier PASS

## 1. Question

How should Demigod plan ambitious DIE work so breadth produces an integrated product rather than a
grab-bag, and what should that method cause us to build next?

The immediate product problem is concrete: Role Mission can express founder-authored evidence
questions, but most answers are still reviewer prose. It cannot yet carry a permitted work artifact
from source moment through correction, withdrawal, criterion change, and human review.

## 2. What the research changes

### Shape work around an appetite and a risky assumption

Basecamp's Shape Up method separates raw ideas from shaped work. A pitch names the problem,
appetite, solution, rabbit holes, and explicit no-gos. It recommends building meaningful vertical
slices and resolving unknown interdependencies before treating a project as ready. This is useful to
Demigod as a shaping discipline, not as a mandate to copy six-week cycles.

Sources:

- [Set Boundaries — Shape Up](https://basecamp.com/shapeup/1.2-chapter-03)
- [Risks and Rabbit Holes — Shape Up](https://basecamp.com/shapeup/1.4-chapter-05)
- [Write the Pitch — Shape Up](https://basecamp.com/shapeup/1.5-chapter-06)

### Detail the near work; keep later work conditional

The UK Government Service Manual says agile plans should become detailed near execution and remain
high-level farther out. Its alpha guidance focuses prototypes on the riskiest assumptions, sometimes
only the difficult part of a journey, and expects the result to inform a continue/change/stop
decision. Its roadmap guidance treats each iteration as a mission toward user value and requires the
roadmap to say what is not being done.

Sources:

- [Planning in agile — GOV.UK](https://www.gov.uk/service-manual/agile-delivery/planning-agile)
- [How the alpha phase works — GOV.UK](https://www.gov.uk/service-manual/agile-delivery/how-the-alpha-phase-works)
- [Developing a roadmap — GOV.UK](https://www.gov.uk/service-manual/agile-delivery/developing-a-roadmap)

### Provenance is a lifecycle, not a URL field

W3C PROV models entities, activities, agents, derivations, revisions, generation, use, and
invalidation. Its constraints explicitly handle changing things by representing different states as
distinct entities with lifetimes. Demigod does not need RDF or the whole ontology now, but it does
need immutable evidence assertions, explicit supersession, responsibility, and stop events.

Sources:

- [W3C PROV Model Primer](https://www.w3.org/TR/prov-primer/)
- [W3C PROV Constraints](https://www.w3.org/TR/prov-constraints/)

### Clay's most useful lesson is controlled execution

Clay begins tables with sources, orders providers in waterfalls, exposes the successful provider,
supports conditional runs, and recommends testing small batches before scaling. It also separates
orchestration cost from data-provider cost. For DIE, the transferable mechanism is not mass person
enrichment. It is source-first evidence, explicit acceptance conditions, early exit, sample-first
execution, and visible resource use.

Sources:

- [Sources — Clay Docs](https://university.clay.com/docs/sources)
- [Waterfalls — Clay Docs](https://university.clay.com/docs/building-a-data-waterfall)
- [Actions & Data Credits — Clay Docs](https://university.clay.com/docs/actions-data-credits)

### Hiring evidence requires stronger boundaries than GTM data

The ICO's recruitment-AI audit emphasizes transparency, data minimisation, and purpose limitation.
EEOC guidance warns that algorithmic assessment can screen out disabled applicants and recommends
explaining how technology evaluates people plus providing an accommodation path. NIST AI RMF treats
govern, map, measure, and manage as a continuous lifecycle and calls for documented human oversight
and test/evaluation evidence. These sources do not decide Demigod's jurisdiction-specific legal
basis; they do justify a conservative technical boundary.

Sources:

- [AI tools used in recruitment — ICO](https://ico.org.uk/action-weve-taken/audits-and-overview-reports/2024/11/ai-tools-used-in-recruitment/)
- [Artificial Intelligence and the ADA — EEOC](https://www.eeoc.gov/eeoc-disability-related-resources/artificial-intelligence-and-ada)
- [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)

## 3. The planning method Demigod should use

For every ambitious DIE slice, use an **evidence-bounded mission pitch**:

1. **Problem:** describe the broken user decision, not a desired feature.
2. **Outcome:** name the observable capability the slice must create.
3. **Appetite:** choose one integrated vertical slice; later scopes stay conditional.
4. **Riskiest assumption:** state the cheapest fact that could invalidate the plan.
5. **Evidence contract:** name allowed inputs, provenance, time, purpose, rights, unknown/error
   states, and the human decision boundary before designing automation.
6. **Solution elements:** breadboard the smallest end-to-end path using existing modules.
7. **Rabbit holes:** resolve or exclude connectors, ranking, universal schemas, storage migrations,
   and automated actions unless current evidence makes them necessary.
8. **Acceptance:** include a positive case, a materially different sibling, and a fail-closed case.
9. **Learning receipt:** record what the slice proved, what remained fixture-only, and which next
   observation discriminates the next roadmap choice.

This combines Shape Up's boundaries, GDS's risk-first alpha, weakest-sufficient-hypothesis planning,
and Demigod's existing authority/truth gates. It keeps ambition in the system design while making
each implementation claim falsifiable.

## 4. Weakest sufficient product hypothesis

> A small, immutable, role-specific evidence contract can make candidate research inspectable and
> correctable without requiring a universal knowledge graph, automated ranking, a connector, or a
> new database.

This hypothesis is weaker than “build the whole enrichment platform” because it does not assume a
provider, hosted app, legal regime, model, storage engine, or scale. It is strong enough to predict a
useful result: an evidence item should remain traceable, become stale only when its criterion changes,
stop contributing after withdrawal or expiry, preserve conflicting evidence, and never make a hiring
decision.

The cheapest discriminating test is a synthetic role with:

- a candidate-submitted artifact;
- a permitted public-work artifact;
- a correction;
- a later withdrawal;
- one changed and one unchanged criterion;
- a human note citing an evidence ID.

If the projection cannot preserve those distinctions without leaking withdrawn content or adding a
score, the contract is wrong and provider/connectivity work should not begin.

## 5. Shaped build pitch

### Problem

Review prose currently collapses source material, reviewer interpretation, and hiring judgment. A
changed role can stale every note; a correction can overwrite history; a withdrawal has no evidence
object to stop; public work has no explicit use policy.

### Appetite

One local, read-only vertical slice integrated into the existing role workspace and Role Mission.
No connector, hosted UI, data purchase, model call, ranking engine, or database migration.

### Solution

Add `demigod.candidate-evidence/1` assertions with:

- role, candidate, and must-have identity;
- a snapshot of the criterion label;
- bounded claim and exact source span;
- candidate-submitted or public-work source policy;
- source reference, safe public URL where required, observation/source-update clocks, and content
  hash;
- role-review purpose, operational use basis, policy version, and retention deadline;
- optional `supersedes` link for append-only correction.

Add `demigod.candidate-evidence-withdrawal/1` as an append-only stop event. Project both through
Role Mission so inactive raw text is withheld and each evidence question retains `active`,
`conflict`, `stale`, `corrected`, `withdrawn`, `expired`, or `future` state.

Extend review-note ratings with optional bounded evidence IDs. Keep legacy prose-only notes valid.

### Rabbit holes resolved

- **Universal provenance graph:** excluded; one concrete role-evidence contract is sufficient.
- **Legal-basis inference:** prohibited; the technical `use.basis` is operational metadata, not a
  legal conclusion.
- **Deletion semantics:** physical deletion and derived-data erasure require the hosted identity,
  policy, and storage work in M3. This slice withholds inactive raw content but does not claim legal
  erasure.
- **Automatic truth resolution:** prohibited; conflicts remain conflicts.
- **Public mutual disclosure:** prohibited; candidate evidence remains in the private projection.
- **Automated employment decision:** prohibited.

### Acceptance gates

| Gate | Required result |
|---|---|
| Valid submitted evidence | active and linked to exactly one role criterion |
| Valid public work | safe URL, exact span, hash, policy, and retention required |
| Criterion change | only dependent evidence becomes stale |
| Correction | old assertion becomes corrected; new assertion becomes active |
| Historical snapshot | a later correction/withdrawal does not rewrite the earlier view |
| Conflict | incompatible active claims remain visible |
| Withdrawal/expiry | raw claim and source span are withheld from the active projection |
| Cross-scope event | refused |
| Review note | evidence IDs preserved and bounded |
| Mutual view | candidate IDs, claims, spans, ratings, and private reviewer text absent |
| Authority | global score null; employment decision human; external action none |

## 6. Execution sequence

1. Define and validate immutable assertion and withdrawal schemas.
2. Build a pure time-aware projection over an optional private corpus.
3. Add correction-chain, withdrawal, retention, conflict, and criterion-drift semantics.
4. Extend structured review ratings with optional evidence IDs.
5. Join evidence into the existing `compileEvidenceReview` path.
6. Add evidence entities to the existing Role Mission bill of materials.
7. Load the optional private corpus in `buildDesk`; absence stays an empty valid corpus and malformed
   data becomes a visible channel error.
8. Add the standalone and integration self-tests to the official Demigod verifier.
9. Promote contracts and roadmap truth only after checks pass.

## 7. Implementation receipt

Implemented locally:

- `demigod-candidate-evidence.mjs` — assertion/withdrawal contracts, optional private corpus loader,
  time-aware pure projection, and self-test;
- `demigod-role-packet.mjs` — bounded evidence IDs on review ratings;
- `demigod-structured-hiring.mjs` — candidate evidence joins evidence questions and Role Mission;
- `demigod-verify-all.mjs` — official self-test registration.

No external source was fetched into a candidate record. All implementation fixtures are synthetic.
No publish, send, connector, model call, ranking, or employment action was added.

Verification on 2026-08-16:

- candidate-evidence self-test: PASS;
- role-packet self-test: PASS;
- structured-hiring integration/privacy self-test: PASS;
- import integrity: PASS after the new executable source was tracked;
- `npm run demigod:verify:source`: PASS;
- `npm run demigod:verify:all`: `pass: true`, `failed: 0`, browser-disabled lane; funnel
  sub-suite: 1,122 passed, 0 failed, 0 skipped.

## 8. Next discriminating observation

After this fixture slice, the most informative next observation is whether one real accepted role can
define a useful evidence question and whether a permitted submitted artifact answers it more clearly
than reviewer prose alone. Until that exists, adding broad public search or licensed providers would
optimize coverage before usefulness and rights are established.
