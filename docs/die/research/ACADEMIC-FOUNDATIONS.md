# Academic foundations for Demigod Intelligence Engine (DIE)

> **Authority:** This document is non-normative research evidence. [DEMIGOD-DIE-SPEC.md](../../../DEMIGOD-DIE-SPEC.md) is the normative DIE specification.
>
> **Agent loading:** Not default context. Start with the
> [shared DIE brief](SYNTHESIS.md); open this appendix for evidence, evaluation, provenance,
> temporal, human-reliance, or hiring-risk disputes.

**Research date:** 2026-07-29<br>
**Scope:** company and talent intelligence: retrieval, factuality, entity resolution, provenance, human review, hiring fairness, and temporal freshness.<br>
**Source policy:** original papers, official proceedings, and official standards only.

## How to read this memo

- **Evidence** reports what a cited publication or standard establishes.
- **Limitation** describes the boundary of that evidence.
- **DIE implication (inference)** is a proposed system or evaluation choice. It is not a claim made by the source.

## Executive synthesis

The literature supports the current direction: an evidence-backed, time-aware
decision-support system rather than a model that writes authoritative profiles.

The most defensible core is:

1. A profile is a **materialized view of atomic claims**. Current DIE maps the literature's
   verification outcomes into `supported`, `conflict`, or `unknown`, preserves contradicting
   evidence, and carries a row-level `researchedAt` date. Per-claim observation and validity
   time remain gated Phase 2 work.
2. Current company identity remains exact: one canonical match resolves, no match is unknown,
   and duplicate matches are ambiguous. The record-linkage literature supports retaining that
   review/abstention band if learned matching is ever introduced.
3. Provenance is stored as data, not presentation metadata. Source snapshots, transformations, model versions, reviewers, and supersession links should be reproducible.
4. Human review is evaluated as a team. Explanations alone do not reliably produce appropriate reliance and can increase acceptance of wrong recommendations.
5. Any future learned talent ranking would allocate exposure and opportunity. Accuracy alone
   would not be a fairness result; that scope would require funnel-stage exposure, selection
   outcomes, error rates, and uncertainty.
6. Freshness is a measured property. Current correctness, stale-claim rate, detection delay, update delay, and behavior on new/changed/unchanged facts need time-sliced tests.

This yields a useful design rule: **generate prose only from a versioned claim ledger, and make the ledger—not the prose—the source of truth.**

---

## 1. Retrieval and factuality

### 1.1 Retrieval-Augmented Generation (RAG)

**Source:** Lewis et al., “Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks,” NeurIPS 2020.<br>
**Canonical publication:** [NeurIPS proceedings](https://proceedings.neurips.cc/paper_files/paper/2020/hash/6b493230205f780e1bc26945df7481e5-Abstract.html)

**Evidence**

- The paper combines a parametric sequence-to-sequence model with a non-parametric Wikipedia index.
- It reports state-of-the-art results on three open-domain question-answering tasks and more specific, diverse, and factual generation than a parametric-only baseline on the studied tasks.
- Retrieved documents can be inspected and the external index can be replaced without retraining the entire generator.

**Limitation**

- The experiments use a fixed Wikipedia snapshot and task benchmarks; they do not establish that retrieval guarantees claim-level support, source authority, or current correctness.
- A retrieved passage can be irrelevant, stale, incorrectly attributed, or contradicted elsewhere.

**DIE implication (inference)**

- Retrieval should supply candidate evidence, never a truth bit.
- Store the exact evidence span and source snapshot used for each claim, then verify the claim against that evidence independently.
- Refreshing the source/index and reverifying affected claims should be possible without rebuilding the entire intelligence system.

### 1.2 FEVER: joint claim classification and evidence

**Source:** Thorne et al., “FEVER: a Large-scale Dataset for Fact Extraction and VERification,” NAACL-HLT, June 2018.<br>
**Canonical publication:** [ACL Anthology](https://aclanthology.org/N18-1074/) · [DOI](https://doi.org/10.18653/v1/N18-1074)

**Evidence**

- FEVER contains 185,445 claims labeled **Supported**, **Refuted**, or **NotEnoughInfo**, with evidence sentences for claims that can be decided from Wikipedia.
- The paper reports Fleiss’ kappa of 0.6841 for claim labeling.
- Its baseline scored 50.91% on label accuracy but only 31.87% when the label also had to be accompanied by correct evidence, showing that classification without evidence is a materially easier problem.

**Limitation**

- Claims were generated and mutated from Wikipedia sentences, within a closed evidence collection.
- Moderate annotator agreement and alternative valid evidence sets make “ground truth” less absolute than a single label implies.

**DIE implication (inference)**

- Use at least three verification outcomes: supported, refuted, and insufficient evidence. Add a separate conflict state when credible sources disagree.
- Score verdict and evidence jointly. A correct-looking profile claim without attributable evidence should fail the factuality gate.
- Track reviewer agreement and adjudication, not only a single gold label.

### 1.3 FActScore: atomic factual precision

**Source:** Min et al., “FActScore: Fine-grained Atomic Evaluation of Factual Precision in Long Form Text Generation,” EMNLP, December 2023.<br>
**Canonical publication:** [ACL Anthology](https://aclanthology.org/2023.emnlp-main.741/) · [DOI](https://doi.org/10.18653/v1/2023.emnlp-main.741)

**Evidence**

- FActScore decomposes long-form output into atomic facts and measures the percentage supported by a reliable knowledge source.
- The paper evaluates 6,500 generations and reports that its automated estimator has less than 2% error in its experimental setting.
- The decomposition makes unsupported statements visible even when they occur inside otherwise accurate prose.

**Limitation**

- The main setting is biographies checked against Wikipedia.
- Factual precision does not measure completeness, usefulness, entity identity, source quality, or whether a claim is current.
- Automatic decomposition, retrieval, and judging each introduce errors.

**DIE implication (inference)**

- Decompose every generated company or candidate summary into independently checkable claims.
- Report both atomic support precision and coverage of required fields. A system can score high by saying very little.
- Audit the decomposition layer itself with human-labeled atomic facts; otherwise an extractor can hide unsupported compound claims.

### 1.4 SAFE and long-form factuality

**Source:** Wei et al., “Long-form factuality in large language models,” NeurIPS 2024.<br>
**Canonical publication:** [NeurIPS paper](https://proceedings.neurips.cc/paper_files/paper/2024/file/937ae0e83eb08d2cb8627fe1def8c751-Paper-Conference.pdf) · [arXiv DOI](https://doi.org/10.48550/arXiv.2403.18802)

**Evidence**

- SAFE decomposes a response into facts, uses search to find evidence, and has an LLM judge whether evidence supports each fact.
- The study covers 2,280 prompts across 38 topics and roughly 16,000 facts.
- SAFE agreed with crowd labels 72% of the time. In an expert-adjudicated sample of 100 human/SAFE disagreements, SAFE was preferred in 76 cases.
- The paper introduces F1@K to balance supported-fact precision with a length-based proxy for recall.

**Limitation**

- Search results and LLM judges are themselves variable and fallible.
- The 76% result is from a 100-disagreement sample, not all evaluated facts.
- F1@K uses an arbitrary target length as a recall proxy; it is not semantic completeness.

**DIE implication (inference)**

- An automated verifier can be a scalable first pass, but calibration must use DIE-specific, expert-adjudicated claims.
- Pin search results or source snapshots so an evaluation can be replayed.
- Report support precision and schema/task completeness separately rather than collapsing them into one score.

### Retrieval/factuality evaluation contract

| Layer | Required measures |
|---|---|
| Atomic decomposition | Claim-boundary precision/recall; compound-claim rate; omitted-claim rate |
| Retrieval | Evidence recall@k; source-authority coverage; cross-source diversity; snapshot availability |
| Verification | Macro-F1 for supported/refuted/unknown; conflict detection; evidence entailment; calibrated abstention |
| Synthesis | Atomic support precision; unsupported claims per profile; required-field coverage; citation correctness |
| Reproducibility | Exact-source replay rate; model/prompt/index version completeness |

---

## 2. Entity resolution and identity safety

### 2.1 Fellegi–Sunter record linkage

**Source:** Fellegi and Sunter, “A Theory for Record Linkage,” *Journal of the American Statistical Association*, December 1969.<br>
**Canonical publication:** [DOI](https://doi.org/10.1080/01621459.1969.10501049)

**Evidence**

- The framework weights comparison evidence according to how likely an agreement or disagreement is among true matches versus non-matches.
- It formalizes three decisions: link, non-link, and possible link/clerical review.
- Under its assumptions, thresholds can be chosen in relation to specified false-match and false-nonmatch error levels.

**Limitation**

- Match/non-match distributions must be estimated, and fields are not always independent.
- Weights and thresholds drift when sources, naming conventions, or populations change.
- Clerical review is a real operational cost, not a free residual category.

**DIE implication (inference)**

- Preserve a review band rather than forcing binary identity decisions.
- Log per-field evidence—domain, verified email domain, official ID, location, names, redirects, employment dates—so a reviewer can see why two records were linked.
- Calibrate thresholds on the asymmetric cost of a false merge versus a false split; for talent/company intelligence, false merges should normally receive the stricter bound.

### 2.2 DeepMatcher

**Source:** Mudgal et al., “Deep Learning for Entity Matching: A Design Space Exploration,” SIGMOD, June 2018.<br>
**Canonical publication:** [author-hosted paper](https://pages.cs.wisc.edu/~anhai/papers1/deepmatcher-sigmod18.pdf) · [DOI](https://doi.org/10.1145/3183713.3196926)

**Evidence**

- Across the studied benchmarks, deep models were most beneficial for textual and dirty data.
- The paper found little advantage over established approaches on structured datasets.
- Its design-space analysis shows that representation choice should follow data characteristics rather than a blanket assumption that a deeper matcher is better.

**Limitation**

- The work studies supervised entity matching with benchmark labels.
- It does not solve candidate generation, unsupervised matching, human review, or domain-specific identity policy.

**DIE implication (inference)**

- Use deterministic rules and conventional field comparison for clean identifiers; reserve semantic models for aliases, descriptions, and messy text.
- Benchmark a simple weighted baseline before adopting a learned matcher.

### 2.3 Ditto

**Source:** Li et al., “Deep Entity Matching with Pre-Trained Language Models,” PVLDB 14(1), 2021.<br>
**Canonical publication:** [PVLDB paper](https://www.vldb.org/pvldb/vol14/p50-li.pdf) · [DOI](https://doi.org/10.14778/3421424.3421431)

**Evidence**

- Ditto casts entity matching as transformer sequence-pair classification.
- The paper reports improvements of up to 29 F1 points over prior systems on benchmark datasets, a further gain of up to 9.8 points from its optimizations, and prior state-of-the-art results with at most half the labeled data.
- On a real company-matching task with datasets of 789,000 and 412,000 records, it reports 96.5% F1.
- The paper explicitly treats blocking/candidate generation as a separate preprocessing step.

**Limitation**

- Aggregate F1 can hide rare but costly false merges.
- Performance depends on blocking recall, labels, domain, model, and threshold.
- A company-data result does not establish performance on Demigod’s sources, rebrands, subsidiaries, people, or shared recruiting infrastructure.

**DIE implication (inference)**

- Evaluate blocking separately; a perfect pair classifier cannot recover a true pair that blocking discarded.
- Build a collision-heavy test set: aliases, rebrands, parent/subsidiary pairs, same-name people, shared ATS domains, redirects, acquisitions, and conflicting locations.
- Report false-merge and false-split rates in addition to F1.

### 2.4 Fairness in entity matching

**Source:** Shahbazi et al., “Through the Fairness Lens: Experimental Analysis and Evaluation of Entity Matching,” PVLDB 16(11), 2023.<br>
**Canonical publication:** [PVLDB paper](https://www.vldb.org/pvldb/vol16/p3279-shahbazi.pdf) · [DOI](https://doi.org/10.14778/3611479.3611525)

**Evidence**

- The study evaluates 13 matchers across six benchmarks and two semi-synthetic social datasets.
- It finds that group representation, name similarity, matcher family, and threshold choices can materially change group performance.
- It motivates positive predictive value and true-positive-rate parity as useful views for highly imbalanced entity-matching tasks.

**Limitation**

- Most benchmarks are product data; the social datasets are semi-synthetic.
- Fairness results are dataset-, grouping-, and threshold-specific and do not automatically transfer to hiring.

**DIE implication (inference)**

- When lawful, justified group attributes are available for evaluation, test identity precision and recall by group and intersection, with sample sizes and uncertainty.
- Treat name transliteration, name changes, sparse web presence, and non-Western naming conventions as explicit stress strata even when protected attributes are not used by the production matcher.

### Entity-resolution decision flow

1. **Normalize without destroying evidence:** preserve original strings and source records.
2. **Generate candidates:** deterministic IDs, domains, redirects, source-native IDs, and conservative lexical/semantic blocking.
3. **Compare evidence:** exact identifiers, names/aliases, chronology, organization hierarchy, geography, URLs, and descriptive text.
4. **Decide:** match, non-match, or review.
5. **Never auto-merge contradictions:** an identity conflict becomes a review object with both source records intact.
6. **Version decisions:** later evidence can supersede a link without erasing the prior decision or its rationale.

### Entity-resolution evaluation contract

- Blocking recall and candidate pairs per record.
- Pair precision, recall, F1, and calibration.
- False merges per 1,000 accepted links; false splits per 1,000 true entities.
- Review-band precision, yield, reviewer agreement, and median review time.
- Results by collision/stress stratum and, where lawfully governed, relevant demographic group.
- Cluster-level consistency, not only pair-level scores.

---

## 3. Provenance and data governance

### 3.1 W3C PROV

**Source:** W3C Provenance Working Group, PROV family of Recommendations, 30 April 2013.<br>
**Canonical standards:** [PROV overview](https://www.w3.org/TR/prov-overview/) · [PROV-O](https://www.w3.org/TR/prov-o/) · [PROV-DM history](https://www.w3.org/standards/history/prov-dm/)

**Evidence**

- PROV models **Entities**, **Activities**, and **Agents**, including relations such as `used`, `wasGeneratedBy`, `wasDerivedFrom`, and `wasAttributedTo`.
- Expanded terms distinguish quotation, revision, and primary source and can represent generation/invalidation time.
- Bundles support provenance about provenance; specialization and alternate relations support versions and equivalent views.

**Limitation**

- PROV describes lineage and interchange. It does not prove that a statement is true, a source is authoritative, a transformation is fair, or collection/use is permitted.
- Completeness still depends on instrumentation and policy.

**DIE implication (inference)**

- Map source snapshots, extracted claims, resolved identities, and rendered profiles to **Entities**.
- Map retrieval, parsing, extraction, verification, matching, review, and synthesis runs to **Activities**.
- Map source organizations, models, connectors, and human reviewers to **Agents**.
- Keep truth state, source authority, consent/license, and policy fields separate from lineage.

### 3.2 Datasheets for Datasets

**Source:** Gebru et al., “Datasheets for Datasets,” *Communications of the ACM* 64(12), November/December 2021.<br>
**Canonical publication:** [DOI](https://doi.org/10.1145/3458723) · [author publication page](https://www.microsoft.com/en-us/research/publication/datasheets-for-datasets/)

**Evidence**

- The paper proposes structured documentation of dataset motivation, composition, collection, preprocessing/cleaning/labeling, uses, distribution, and maintenance.
- The intended mechanism is reflection and communication across dataset creators and consumers.

**Limitation**

- The authors do not present datasheets as a replacement for provenance/version tracking, independent verification, or construct-validity analysis.
- Documentation can be incomplete or self-serving and imposes maintenance cost.

**DIE implication (inference)**

- Maintain a lightweight datasheet for each source family or connector: collection purpose, covered population, access method, field meanings, known omissions, update behavior, transformations, permitted uses, retention, and owner.
- Version the datasheet with connector changes and link it to runs; do not treat a static README as operational provenance.

### 3.3 Model Cards

**Source:** Mitchell et al., “Model Cards for Model Reporting,” FAT*, January 2019.<br>
**Canonical publication:** [DOI](https://doi.org/10.1145/3287560.3287596) · [arXiv](https://arxiv.org/abs/1810.03993)

**Evidence**

- Model cards document model/version, intended and out-of-scope uses, evaluation data and procedure, disaggregated performance across relevant groups and intersections, ethical considerations, and caveats.
- The paper argues that aggregate metrics are insufficient for many real uses.

**Limitation**

- The paper supplies a reporting framework, not a guarantee that a card is accurate or complete.
- Static cards can go stale and may fit trained models better than composite retrieval-and-review systems.

**DIE implication (inference)**

- Use a component/evaluation card for each released extractor and verifier, plus any matcher
  or ranker only if one is later introduced under an explicit gate.
- Include thresholds, abstention behavior, data cutoffs, stress slices, known failure modes, and the exact evaluation receipt.
- Mark a card stale when its model, prompt, index, source mix, or decision policy changes.

### Minimum claim/provenance record

```text
claim_id
entity_id
predicate
value
support_state              # supported | conflict | unknown
contradicting_evidence_ids[]
source_id
source_url
evidence_quote_or_span
source_snapshot_hash
published_at               # if known
observed_at
valid_from / valid_to      # if supported by evidence
retrieval_run_id
extractor_version
verifier_version
identity_decision_version
supersedes_claim_id
reviewer_id / reviewed_at / rationale
policy_and_usage_tags
```

The snapshot hash makes evidence replayable; it does not remove the need to retain a lawful, inspectable snapshot or quotation.

### Governance evaluation contract

- Provenance completeness by required field.
- Percentage of claims reproducible from retained evidence.
- Orphan claims, missing snapshots, and unresolved source redirects.
- Datasheet/card freshness after a component or source change.
- Reproducibility across pinned model, prompt, index, and policy versions.
- Percentage of superseded claims whose decision history remains inspectable.

---

## 4. Human–AI complementarity and automation bias

### 4.1 Use, misuse, disuse, and abuse of automation

**Source:** Parasuraman and Riley, “Humans and Automation: Use, Misuse, Disuse, Abuse,” *Human Factors*, June 1997.<br>
**Canonical publication:** [DOI](https://doi.org/10.1518/001872097778543886)

**Evidence**

- The paper distinguishes appropriate use from overreliance (misuse), underuse (disuse), and automation applied without adequate regard for consequences (abuse).
- Reliability, trust, workload, salience, and the allocation of function between human and automation affect monitoring and decision behavior.

**Limitation**

- This is a broad framework and synthesis, much of it grounded in safety-critical automation rather than talent intelligence.

**DIE implication (inference)**

- Measure both overreliance and underreliance; “reviewer accepted the AI” is not a success metric.
- Show uncertainty and missing evidence at the moment of decision and retain overrides/rationales for calibration analysis.

### 4.2 Omission and commission errors

**Source:** Skitka, Mosier, and Burdick, “Does automation bias decision-making?” *International Journal of Human-Computer Studies*, November 1999.<br>
**Canonical publication:** [DOI](https://doi.org/10.1006/ijhc.1999.0252)

**Evidence**

- In a simulated flight task, automated aids produced omission errors—failing to act when the aid did not alert—and commission errors—following an incorrect recommendation despite other correct indicators.
- Unaided participants outperformed aided participants on monitoring in the experiment.

**Limitation**

- The task was simulated aviation with non-expert participants and a very reliable but imperfect aid.
- It does not estimate effects in professional talent review.

**DIE implication (inference)**

- Seed evaluations with both missed alerts and persuasive wrong alerts.
- Track omission and commission errors separately because UI changes can reduce one while increasing the other.

### 4.3 Explanations do not guarantee complementary performance

**Source:** Bansal et al., “Does the Whole Exceed its Parts? The Effect of AI Explanations on Complementary Team Performance,” CHI, May 2021.<br>
**Canonical publication:** [DOI](https://doi.org/10.1145/3411764.3445717) · [author-hosted paper](https://www.cs.cmu.edu/~sherryw/assets/pubs/2021-team.pdf)

**Evidence**

- Across 1,626 users and three tasks, human–AI teams achieved complementary performance in all studied teaming conditions.
- Explanations did not significantly improve team performance over confidence alone.
- Explanations increased acceptance of AI recommendations whether the AI was correct or wrong, harming outcomes when the AI erred.

**Limitation**

- The tasks were selected to be suitable for crowdsourcing and were not high-stakes employment decisions.
- The study did not systematically vary professional expertise.

**DIE implication (inference)**

- Do not use explanation presence as evidence of safe review.
- Evaluate whether evidence views help reviewers accept correct recommendations **and reject incorrect ones**.
- Prefer inspectable source evidence and contradiction surfacing over persuasive narrative rationales.

### 4.4 Cognitive forcing functions

**Source:** Buçinca, Malaya, and Gajos, “To Trust or to Think: Cognitive Forcing Functions Can Reduce Overreliance on AI in AI-assisted Decision-making,” PACMHCI/CSCW, April 2021.<br>
**Canonical publication:** [DOI](https://doi.org/10.1145/3449287) · [arXiv](https://arxiv.org/abs/2102.09692)

**Evidence**

- In an experiment with 199 crowd workers and a simulated 75%-accurate AI, forcing functions such as making an initial decision before seeing advice reduced overreliance on wrong AI compared with a simple explanation.
- The interventions did not eliminate overreliance or significantly improve overall team performance.
- More effortful designs were less preferred, and effects differed with participants’ Need for Cognition.

**Limitation**

- The study used one food-substitution task, a simulated AI, and crowd workers.
- Friction can impose usability and accessibility costs.

**DIE implication (inference)**

- Test a blind-first review mode: reviewer records an initial judgment, then sees DIE’s match/evidence assessment and may revise.
- Apply forcing only to high-impact or low-confidence cases; blanket friction may reduce throughput without improving outcomes.
- Evaluate accessibility, reviewer expertise, and differential burden alongside error reduction.

### Human-team evaluation contract

Run the same adjudicated cases in randomized conditions:

- human alone;
- AI alone;
- human + score;
- human + evidence;
- blind-first human, then AI + evidence.

Report:

- team accuracy relative to the better solo member;
- acceptance of correct AI and rejection of wrong AI (“appropriate reliance”);
- omission and commission error rates;
- override direction and rationale quality;
- review time and unresolved rate;
- results by reviewer experience and relevant usability/accessibility strata.

---

## 5. Algorithmic hiring fairness

### 5.1 Claims and practices in algorithmic hiring

**Source:** Raghavan, Barocas, Kleinberg, and Levy, “Mitigating Bias in Algorithmic Hiring: Evaluating Claims and Practices,” FAT*, January 2020.<br>
**Canonical publication:** [DOI](https://doi.org/10.1145/3351095.3372828) · [arXiv](https://arxiv.org/abs/1906.09208)

**Evidence**

- The authors analyzed public materials from 18 algorithmic hiring vendors and interviewed relevant actors.
- Fifteen vendors offered customized or customizable assessments; eight described training or validating against data on a client’s current or past employees.
- The paper shows that target construction, training data, validation choices, legal concepts, and marketing claims can diverge; “unbiased” is not a technically self-defining property.

**Limitation**

- The vendor analysis relies substantially on public disclosures and represents a 2020 snapshot.
- It is not a causal audit of private systems or employment outcomes.

**DIE implication (inference)**

- Define the job-related construct and intended decision before building a score.
- Do not treat historical employee success, recruiter preference, engagement, or hiring outcome as a neutral target without construct and selection-bias analysis.
- Maintain a claim register for every fairness statement, including metric, population, stage, date, and limitations.

### 5.2 Fairness of exposure in rankings

**Source:** Singh and Joachims, “Fairness of Exposure in Rankings,” KDD, August 2018.<br>
**Canonical publication:** [author-hosted paper](https://www.cs.cornell.edu/~tj/publications/singh_joachims_18a.pdf) · [DOI](https://doi.org/10.1145/3219819.3220088)

**Evidence**

- Ranking allocates position-dependent exposure, a scarce resource.
- The paper formulates ranking optimization that balances user utility with explicit exposure-fairness constraints under selected fairness definitions.

**Limitation**

- Results depend on the validity of relevance estimates, position-bias assumptions, group definitions, and the chosen normative constraint.
- Fairness in expectation across rankings does not guarantee fair treatment in every list or for every individual.

**DIE implication (inference)**

- Evaluate who receives exposure at each ranking and workflow stage, not only who is finally selected.
- Store the candidate set, eligibility rules, score, rank, displayed positions, and downstream action so exposure can be reconstructed.
- State which fairness principle a constraint implements and why it fits the use case.

### 5.3 Equality of opportunity / equalized odds

**Source:** Hardt, Price, and Srebro, “Equality of Opportunity in Supervised Learning,” NeurIPS 2016.<br>
**Canonical publication:** [NeurIPS proceedings](https://proceedings.neurips.cc/paper_files/paper/2016/hash/6a9659feb1216f14f7384ba499518b38-Abstract.html) · [arXiv](https://arxiv.org/abs/1610.02413)

**Evidence**

- The paper defines equalized odds and equality of opportunity using the joint behavior of prediction, outcome, and protected attribute.
- It gives a post-processing construction for satisfying the criteria under stated assumptions.

**Limitation**

- The authors describe the criteria as “oblivious”: they use observed prediction/outcome/group distributions rather than a causal account of why inequity occurred.
- The method requires meaningful outcome labels and protected-group data; neither is automatically available or valid.
- A metric cannot select the appropriate fairness norm.

**DIE implication (inference)**

- Where labels and lawful group data support it, report true-positive and false-negative behavior by group in addition to selection/exposure rates.
- Do not optimize parity against a proxy outcome whose construct validity is untested.

### 5.4 NIST bias risk framework

**Source:** NIST, “Towards a Standard for Identifying and Managing Bias in Artificial Intelligence,” Special Publication 1270, March 2022.<br>
**Canonical standard:** [NIST publication](https://doi.org/10.6028/NIST.SP.1270) · [official PDF](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1270.pdf)

**Evidence**

- NIST distinguishes systemic, statistical/computational, and human biases and treats AI as socio-technical rather than purely algorithmic.
- It identifies challenges across datasets, testing/evaluation, deployment context, and human factors.
- The document explicitly treats zero bias risk as unattainable and emphasizes identifying, measuring, and managing risk.

**Limitation**

- SP 1270 is broad, preliminary cross-domain guidance, not an employment-specific certification or legal safe harbor.

**DIE implication (inference)**

- Keep a bias-risk register spanning sourcing, entity resolution, missing data, labels, ranking, UI, reviewer behavior, and downstream customer use.
- Every mitigation should name the measured risk, affected population, evidence, owner, reevaluation trigger, and remaining risk.

### 5.5 Uniform Guidelines on Employee Selection Procedures

**Source:** U.S. Equal Employment Opportunity Commission et al., Uniform Guidelines on Employee Selection Procedures, 29 CFR Part 1607, adopted 1978.<br>
**Canonical standard:** [official CFR text](https://www.govinfo.gov/app/details/CFR-2020-title29-vol4/CFR-2020-title29-vol4-part1607) · [EEOC interpretive Q&A](https://www.eeoc.gov/laws/guidance/questions-and-answers-clarify-and-provide-common-interpretation-uniform-guidelines)

**Evidence**

- The Guidelines address selection procedures that have adverse impact and describe criterion-related, content, and construct validity.
- The four-fifths rule is a practical rule of thumb, not a complete legal definition of adverse impact.
- The Guidelines call for examining both an overall process and components when a component is a selection procedure.
- Ranking by score requires evidence that higher scores correspond to better job performance where the ranking is used that way.

**Limitation**

- This is a 1978 framework, not AI-specific technical guidance.
- Statistical thresholds do not by themselves determine fairness, causation, or legal compliance.
- Whether a particular DIE feature is a selection procedure depends on how it is actually used.

**DIE implication (inference)**

- Treat any feature used to screen, rank, or recommend people for employment as potentially consequential from its first workflow stage.
- Preserve stage-level inputs, decisions, and outcomes so overall and component effects can be evaluated.
- Human review and vendor status are not substitutes for job-related validation or outcome monitoring.

### Hiring-fairness evaluation contract

For every consequential use, define the population, job/context, funnel stage, outcome window, and fairness rationale before computing metrics.

Minimum reporting, when the required data is lawful and meaningful:

- candidate-source and eligibility coverage;
- exposure by rank position and workflow stage;
- selection-rate ratios with counts and uncertainty, not just the four-fifths heuristic;
- true-positive, false-negative, false-positive, and positive-predictive-value behavior where outcome labels are valid;
- intersectional and sparse-data slices with uncertainty or suppression rules;
- alternative-procedure comparison;
- drift since the prior evaluation;
- documented limits on causal and legal interpretation.

---

## 6. Temporal freshness and evaluation

### 6.1 Temporal degradation and continual update

**Source:** Lazaridou et al., “Mind the Gap: Assessing Temporal Generalization in Neural Language Models,” NeurIPS 2021.<br>
**Canonical publication:** [NeurIPS proceedings](https://proceedings.neurips.cc/paper_files/paper/2021/hash/f5bf0ba0a17ef18f9607774722f5698c-Abstract.html)

**Evidence**

- Using temporally ordered WMT news and arXiv data, the paper finds that future performance degrades as the gap from training data increases.
- Increasing model size alone does not remove temporal degradation.
- Continual model updates mitigate some degradation in the studied setting.

**Limitation**

- The experiments center on Transformer-XL language modeling and perplexity, not a current retrieval-backed company graph.

**DIE implication (inference)**

- Model scale cannot stand in for a freshness strategy.
- Evaluate against future time slices and update sources/indexes/claims continuously rather than relying on a static training cutoff.

### 6.2 StreamingQA

**Source:** Liska et al., “StreamingQA: A Benchmark for Adaptation to New Knowledge over Time in Question Answering Models,” ICML, July 2022.<br>
**Canonical publication:** [PMLR](https://proceedings.mlr.press/v162/liska22a.html)

**Evidence**

- StreamingQA uses 14 years of timestamped news and time-associated questions with quarterly evaluation.
- Adding new documents lets semi-parametric models adapt rapidly, but a stale underlying language model still underperforms one retrained on newer data.

**Limitation**

- News QA with controlled timestamps is simpler than a changing web of company pages, job posts, people, subsidiaries, and redirects.

**DIE implication (inference)**

- Test retrieval/index freshness and model freshness separately.
- Maintain historical source snapshots so “what was knowable at time t?” can be evaluated without future leakage.

### 6.3 Time-aware language models

**Source:** Dhingra et al., “Time-Aware Language Models as Temporal Knowledge Bases,” TACL, 2022.<br>
**Canonical publication:** [ACL Anthology](https://aclanthology.org/2022.tacl-1.15/) · [DOI](https://doi.org/10.1162/tacl_a_00459)

**Evidence**

- The paper models timestamps jointly with text to represent facts that change or expire.
- In its experiments, time awareness improves performance and calibration on temporal facts and permits targeted refreshing without full retraining.

**Limitation**

- The work studies temporal knowledge in language models, not source-grounded company intelligence.
- Useful timestamps must exist or be inferred correctly.

**DIE implication (inference)**

- Distinguish **publication time**, **observation/retrieval time**, and **valid time**. They are not interchangeable.
- Never infer that a role or hiring status remains current merely because the source page is still reachable.

### 6.4 TemporalWiki

**Source:** Jang et al., “TemporalWiki: A Lifelong Benchmark for Training and Evaluating Ever-Evolving Language Models,” EMNLP, December 2022.<br>
**Canonical publication:** [ACL Anthology](https://aclanthology.org/2022.emnlp-main.418/) · [DOI](https://doi.org/10.18653/v1/2022.emnlp-main.418)

**Evidence**

- TemporalWiki builds consecutive Wikipedia/Wikidata snapshots and separates retained, updated, and newly acquired knowledge.
- The paper reports that training on diffs can achieve similar or better perplexity than full-snapshot retraining with roughly 12 times less computation in its setting.

**Limitation**

- Wikipedia/Wikidata diffs and perplexity do not capture ambiguous company changes or downstream decision correctness.

**DIE implication (inference)**

- Organize temporal tests into unchanged, changed, new, and removed/expired facts.
- Use source diffs to target re-extraction and reverification, while periodically testing full rebuilds for missed dependencies.

### 6.5 FreshQA / FreshLLMs

**Source:** Vu et al., “FreshLLMs: Refreshing Large Language Models with Search Engine Augmentation,” Findings of ACL, August 2024.<br>
**Canonical publication:** [ACL Anthology](https://aclanthology.org/2024.findings-acl.813/) · [DOI](https://doi.org/10.18653/v1/2024.findings-acl.813)

**Evidence**

- FreshQA includes questions about fast-changing facts and questions with false premises.
- The paper reports more than 50,000 human judgments and shows substantial failures on dynamic and false-premise questions.
- Search augmentation improves freshness in the studied setting; evidence selection/order and concise synthesis affect results.

**Limitation**

- Search rankings are volatile, and factoid QA is not longitudinal entity intelligence.
- Search augmentation can import low-authority, stale, or mutually copied claims.

**DIE implication (inference)**

- Include false-premise tests such as nonexistent companies, conflated people, obsolete roles, and closed job openings.
- Reward abstention and premise correction rather than forcing a profile or match.

### Temporal data model

Keep separate clocks:

- `published_at`: when the source says it was published or updated;
- `observed_at`: when DIE retrieved or observed it;
- `valid_from` / `valid_to`: when the underlying claim is believed to hold, supported by evidence;
- `verified_at`: when the claim/evidence relation was last checked;
- `superseded_at`: when a newer claim or identity decision replaced it.

Assign field-specific refresh targets from measured change rates. Hiring status and current roles may require faster checks than legal name or founding year, but the intervals should be calibrated from observed staleness and source cost—not declared universal constants.

### Freshness evaluation contract

- Current correctness on a dated, adjudicated set.
- Stale-claim rate by predicate and source.
- Time from real-world/source change to detection, verification, and visible correction.
- Results on unchanged, changed, new, removed/expired, conflicting, and false-premise cases.
- Regression/forgetting on unchanged facts after an update.
- Coverage by age/freshness bucket.
- Reproducibility against the sources available at the evaluation cutoff.

---

## 7. Academic systems model, mapped to current DIE scope

This section is a system-design inference from the publications above, not a replacement for
the current architecture or roadmap. Person identity, candidate enrichment, learned ranking,
and employment screening remain outside the current DIE build. Within current scope, the
model ends in a private company-evidence view for human match review.

```text
source snapshot
    ↓  (source identity, timestamps, hash, access/use policy)
source records
    ↓  (blocking)
identity comparison
    ├── non-match
    ├── review
    └── versioned identity link
             ↓
atomic claim extraction
             ↓
evidence retrieval + verification
    ├── supported
    ├── refuted
    ├── unknown
    └── conflict
             ↓
time-aware claim ledger
             ↓
private human review
             ↓
evidence packet as a versioned view
```

### Non-negotiable separation of concerns

- **Identity confidence is not claim confidence.**
- **Claim confidence is not source authority.**
- **Source authority is not freshness.**
- **Freshness is not legal permission or appropriate use.**
- **Predictive accuracy is not fairness.**
- **An explanation is not evidence of appropriate human reliance.**
- **Human review is not proof of validity or fairness.**

### Gates if scope later expands

The current exact-identity, company-evidence slice continues to use
[DIE evaluation](../EVALUATION.md). If an explicit future request reopens learned identity,
person enrichment, or employment ranking, the literature suggests adding the applicable
receipts below rather than treating model accuracy as sufficient:

1. Identity evaluation, including blocking recall and false-merge rate on collision cases.
2. Claim/evidence evaluation with supported, refuted, unknown, and conflict cases.
3. Provenance replay for a sample of produced profiles.
4. Time-sliced evaluation containing new, changed, unchanged, expired, and false-premise facts.
5. Human-alone, AI-alone, and human+AI comparison for consequential review.
6. Funnel-stage exposure/outcome report for any employment screening or ranking use where the required data is available and appropriate.
7. Current source datasheets and component/evaluation cards.

## 8. Generalized benchmark sketch

This sketch captures academic evaluation concepts; it is not the current executable DIE
contract. A future benchmark extension should map into the existing three-state vocabulary:

```text
case_id
cutoff_time
available_source_snapshots[]
entity_candidates[]
gold_identity_state          # match | non-match | unresolved
gold_identity_rationale
claims[]:
  - atomic_claim
  - support_state            # supported | conflict | unknown
  - contradicting_evidence[]
  - valid_time
  - acceptable_evidence_sets[]
  - adjudicator_notes
task_context                  # source, screen, rank, introduce, summarize, etc.
protected/evaluation_groups   # only where lawful, justified, governed
stress_tags[]                 # alias, rebrand, sparse, stale, collision, false premise...
```

Gold labels should support multiple acceptable evidence sets and an unresolved state. Adjudication policy, annotator expertise, agreement, and label date belong with the benchmark.

## 9. Research boundary

These sources provide strong foundations, but none validates DIE itself. The concrete architecture and metrics above remain hypotheses until tested on Demigod’s actual sources, entities, users, decisions, and temporal conditions. Employment-law applicability also depends on deployment context and jurisdiction; this memo supplies an evaluation foundation, not a legal conclusion.

## Related DIE documents

- [Evaluation framework](../EVALUATION.md)
- [System contracts](../CONTRACTS.md)
- [Research synthesis](SYNTHESIS.md)
- [Normative DIE specification](../../../DEMIGOD-DIE-SPEC.md)
