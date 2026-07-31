# DIE practitioner playbooks — research evidence

**Status:** research pack · researched 2026-07-29 · non-normative evidence

> **Agent loading:** Not default context. Start with the
> [shared DIE brief](SYNTHESIS.md); open this appendix for agent, evaluation, security, or
> production-pattern disputes.

## Scope and authority

This pack favors authors' own posts and official engineering guidance relevant to Demigod's DIE company/talent intelligence system. It records practitioner evidence, caveats, and concrete design implications; it does not claim that any cited architecture has been scientifically proven.

This document is **non-normative**. It can inform design and implementation discussion, but it does not add to or override DIE requirements. [`DEMIGOD-DIE-SPEC.md`](../../../DEMIGOD-DIE-SPEC.md) remains the normative specification.

## Bottom line

The strongest cross-source consensus is:

1. Build DIE's normal path as a visible, deterministic workflow: identify entity → retrieve sources → extract claims → attach evidence → detect conflicts/unknowns → review.
2. Reserve an agent for genuinely open-ended cases such as ambiguous identities or multi-hop research. Give it a narrow, read-only tool set, explicit budgets and stopping conditions, and no ability to send outreach or change canonical records.
3. Make evidence—not generated prose—the core data product. Every claim should retain its source, retrieval time, exact supporting span or structured field, source snapshot/hash, confidence/status, and contradictions.
4. Evaluate the final state of the system and the trace that produced it. Never accept the agent's own statement that it succeeded.
5. Treat every externally supplied page or document as untrusted data. In broader systems
   this includes résumés, uploads, ATS text, and email; current DIE public research is narrower
   and uses no private candidate data. Never combine untrusted content, private data, and
   external communication capability in one model context.
6. Use automated graders to scale expert review, not replace it. Each grader should judge one criterion, be calibrated against human labels, and itself be monitored for drift and bias.

These are practitioner patterns, not controlled academic findings. Vendor posts describe their own systems and customer experience; consultant posts encode personal operating experience; VC posts are market theses and often portfolio marketing. DIE should therefore turn every borrowed idea into a falsifiable local eval rather than treating anecdotes or vendor numbers as expected outcomes.

## High-signal source findings

### 1. Anthropic: start simple; distinguish workflows from agents

- Source: [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- Date: 2024-12-19
- Evidence type: Anthropic engineering synthesis from work with dozens of teams.
- Paraphrased claim: Successful implementations often use small, composable patterns rather than large agent frameworks. A workflow follows code-defined paths and is preferable for predictable tasks; an agent decides its own sequence and is useful when the number and order of steps cannot be known in advance. Framework layers can hide prompts and tool responses, making failures harder to understand.
- Useful patterns: prompt chaining with programmatic gates, routing, parallel retrieval, orchestrator/worker decomposition, evaluator/optimizer loops, explicit stopping conditions, and human checkpoints.
- Caveat: This is vendor-authored practitioner evidence. The sample and comparison method are not disclosed, so it does not establish that simple systems always outperform frameworks.
- DIE implication: The routine company/talent pipeline should be code-directed. An agent should be an escalation path for unresolved research, not the default runtime. Identity resolution, source validation, citation presence, conflict handling, and review eligibility should be programmatic gates. Tool descriptions and schemas deserve the same design care as prompts.

### 2. Anthropic: agent evals need outcomes, traces, trials, and layered graders

- Source: [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- Date: 2026-01-09
- Evidence type: Anthropic engineering guidance and customer experience.
- Paraphrased claim: An agent eval is a task plus an environment, multiple trials where nondeterminism matters, graders, a complete transcript, and the final environment state. Evaluators should verify what actually changed or was produced rather than trusting the agent's narration. Automated checks, production monitoring, and periodic human calibration catch different failure classes.
- Caveat: The examples are configuration- and domain-specific; no one suggested grader stack is universally sufficient.
- DIE implication: A research case needs a known target state, such as the correct entity, supported claims, preserved unknowns, and no unauthorized action. Store the whole trace—retrievals, tool arguments, source versions, intermediate classifications, final record—and grade both the result and how it was obtained. Repeat only genuinely stochastic stages; keep deterministic checks deterministic.

### 3. OpenAI: product-shaped datasets and continuous evaluation

- Sources:
  - [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
  - [Graders](https://developers.openai.com/api/docs/guides/graders)
- Date: No publication/update date displayed; accessed 2026-07-29.
- Evidence type: Official provider guidance.
- Paraphrased claim: Generic benchmark scores and “vibe” checks poorly predict an application's behavior. Define an objective, assemble production-shaped examples including edge and adversarial cases, choose task-specific metrics, compare changes, and continue evaluating after deployment. Pairwise or pass/fail judgments are often easier to calibrate than open-ended scoring. Model graders should be tested against expert labels and can themselves be reward-hacked.
- Relevant edge cases: multiple intents, typos, long context, ambiguous tool arguments, multiple tool calls, handoffs, jailbreaks, and conflicts between trusted instructions and untrusted text.
- Caveat: These are provider recommendations, not independent empirical proof. The page also documents a 2026 deprecation schedule for OpenAI's legacy hosted Evals product, so DIE should adopt the concepts rather than couple its architecture to that product.
- DIE implication: Build a provider-neutral local eval corpus from real research failures. Prefer one binary criterion per grader—for example entity identity, source support, current role status, or consent-policy compliance—and retain a human-reviewed held-out set. Run the suite on every model, prompt, retriever, schema, and tool change.

### 4. OpenAI: context layers, permission pass-through, and executable ground truth

- Source: [Inside OpenAI's in-house data agent](https://openai.com/index/inside-our-in-house-data-agent/)
- Date: 2026-01-29
- Evidence type: First-party internal case study.
- Paraphrased claim: A useful data agent needs several context layers: schemas and usage, human annotations, meaning encoded in code, institutional knowledge, scoped memory, and live runtime context. OpenAI describes normalizing and embedding relatively stable context offline, retrieving it at query time, and validating live state when necessary. Its evals compare executed query results with reference results rather than comparing generated query strings. The system preserves underlying query/result links and passes through existing permissions. The team reports that fewer, non-overlapping tools improved reliability.
- Caveat: This is a single internal case study without an independent control or published efficacy measurements. Its scale and data environment differ from Demigod's.
- DIE implication: Put stable company/role semantics and human annotations in a versioned knowledge layer, but check live role and company status at use time. Preserve the evidence query or source behind each answer. Enforce the source system's permissions rather than giving the model broader access. Grade resolved facts and downstream decisions, not whether the model used an expected wording or research path.

### 5. Chip Huyen: tool use compounds errors and increases stakes

- Source: [Agents](https://huyenchip.com/2025/01/07/agents.html)
- Date: 2025-01-07
- Evidence type: Book-derived practitioner synthesis.
- Paraphrased claim: Each additional reasoning/tool step creates another opportunity for error, and tools turn textual mistakes into real-world effects. More tools increase capability but also make tool selection harder. Read and write capabilities should be distinguished; risky actions should require explicit approval. Agent evaluation should enumerate failure modes such as invalid tool choice, incorrect arguments, missed constraints, false completion, tool-output errors, excessive steps, latency, and cost. Tools should also be tested independently.
- Caveat: The author explicitly describes the area as emerging and lacking an established theoretical framework. The recommendations are best-effort engineering guidance.
- DIE implication: Keep research tools few and orthogonal; separately test every connector and parser. Log every call and result. Remove tools that do not improve measured outcomes. Research can be autonomous within a read-only boundary, while outreach, record mutation, and match-state transitions stay outside that boundary.

### 6. Eugene Yan: small, failure-rich datasets and narrow evaluators

- Sources:
  - [Product Evals in Three Simple Steps](https://eugeneyan.com/writing/product-evals/) — 2025-11
  - [An LLM-as-Judge Won't Save the Product](https://eugeneyan.com/writing/eval-process/) — 2025-04
  - [Evaluating the Effectiveness of LLM-Evaluators](https://eugeneyan.com/writing/llm-evaluators/) — 2024-08-18
- Evidence type: Practitioner guidance plus a survey of published evaluator research.
- Paraphrased claim: A useful first eval can be a modest, labeled, production-shaped dataset. Objective properties fit binary pass/fail; subjective preferences often fit pairwise comparison. Datasets should contain enough meaningful failures to expose differences, with organic production failures preferred over synthetic examples after bootstrapping. Each evaluator should cover one dimension rather than acting as an all-purpose “judge.” Pairwise order should be swapped to reveal position bias, and evaluator precision, recall, agreement, and error modes should be measured against human experts.
- Caveat: Suggested dataset sizes and failure counts are operating heuristics, not universal statistical laws. Evaluator behavior varies materially by model and dataset.
- DIE implication: Maintain separate evals for entity resolution, claim support, role freshness, match rationale, constraint satisfaction, fairness, privacy, and consent. Prioritize recall for dangerous failures, such as unsupported “verified” claims or protected-data leakage. Keep development examples separate from held-out release examples.

### 7. Hamel Husain: traces first; the evaluator also needs an eval

- Sources:
  - [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/index.html) — 2024-03-29
  - [Using LLM-as-a-Judge for Evaluation](https://hamel.dev/blog/posts/llm-judge/) — 2024-10-29
- Evidence type: Consultant/practitioner case studies and operating guidance.
- Paraphrased claim: Use cheap scoped assertions on every change, periodic trace review and human/model evaluation, and product experiments only after the basics are reliable. Trace logging is a prerequisite because final answers alone hide retrieval, tool, and reasoning failures. Start with a diverse, production-shaped dataset and a principal domain expert. Ask judges for a narrow decision plus a critique, iterate until they align with experts, and keep monitoring them. Raw accuracy or agreement can mislead on imbalanced data.
- Caveat: The recommendations reflect the author's consulting experience and case studies, not a controlled comparison. Experience counts in the post are self-reported.
- DIE implication: Make a one-screen evidence-and-trace review interface for the person who knows sourcing/matching best. Record expert corrections as new eval cases and error categories. Measure evaluator precision/recall by failure type, not only aggregate agreement.

### 8. Shreya Shankar: evaluation rigor should match task novelty and consequence

- Source: [In Defense of AI Evals, for Everyone](https://www.sh-reya.com/blog/in-defense-ai-evals/)
- Date: 2025-09-05
- Evidence type: Practitioner argument informed by production ML/LLM work.
- Paraphrased claim: Evaluation is systematic measurement, not necessarily a single numeric score. Lightweight review may be enough for familiar tasks that experts continuously dogfood, while domain-specific, complex document work needs stronger decomposition and measurement. A document fitting within a context window does not mean the model will correctly perform every operation over it.
- Caveat: This is an engineering position, not a controlled experiment.
- DIE implication: Generic model benchmarks do not establish that a model can safely research companies or people. Decompose document and web research into observable stages—parse, resolve, extract, support, reconcile, summarize—and evaluate them separately before end-to-end scoring.

### 9. Simon Willison and Anthropic: prompt injection is an architectural problem

- Sources:
  - [The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) — 2025-06-16
  - [Design patterns for securing LLM agents against prompt injections](https://simonwillison.net/2025/Jun/13/prompt-injection-design-patterns/) — 2025-06-13
  - [Mitigating the risk of prompt injections in browser use](https://www.anthropic.com/research/prompt-injection-defenses) — 2025-11-24
- Evidence type: Security-practitioner threat model and design analysis; Anthropic internal adaptive-attack evaluation.
- Paraphrased claim: Combining access to private data, exposure to untrusted content, and external communication creates a direct exfiltration path. Telling a model to ignore malicious instructions is not a dependable security boundary. Safer designs constrain generality and capability through patterns such as action selection from an allowlist, plan-then-execute with a trusted boundary, dual-model separation, code-then-execute, and context minimization. Anthropic likewise treats every page/document as a potential attack source and uses defense in depth.
- Caveat: The “lethal trifecta” is a practical threat model, not a proof that every such system will be compromised. Anthropic's attack-success measurements are model/configuration-specific and do not establish immunity at any reported rate.
- DIE implication: Public-web research must run in a tainted, read-only plane that has neither private candidate/company data nor send/write tools. A separate privileged plane can receive only typed, validated evidence—not raw page instructions—and must not browse untrusted content. Security classifiers and prompt rules are supplementary controls, not the boundary. Include malicious HTML, PDFs, job descriptions, résumés, and tool arguments in the adversarial eval set.

### 10. a16z: the demo-to-product gap is real data and operating context

- Source: [From Demos to Deals: Insights for Building in Enterprise AI](https://a16z.com/insights-for-enterprise-ai-builders/)
- Date: 2025-06-24
- Evidence type: VC market synthesis based on founder conversations.
- Paraphrased claim: Enterprise AI demos often fail to translate into durable products because real customer data contains long tails and nondeterministic systems behave unpredictably outside curated examples. Builders compensate with evals, scaffolding, task-specific model routing, and customer-specific business context, policies, and systems.
- Caveat: The post has selection bias and does not disclose a research methodology or controlled comparisons. It is market observation, not neutral proof.
- DIE implication: Optimize for messy identity records, conflicting sources, missing fields, and organization-specific definitions rather than polished demos. Keep model routing an eval-driven optimization, not an initial architecture requirement.

### 11. Sequoia: automate repeatable intelligence, preserve human judgment

- Sources:
  - [Services: The New Software](https://sequoiacap.com/article/services-the-new-software/) — 2026-03-05
  - [Why We're Partnering with Juicebox](https://sequoiacap.com/article/why-were-partnering-with-juicebox-the-recruiting-platform-founders-are-obsessed-with/) — 2025-09-25
- Evidence type: VC thesis and portfolio-company investment announcement.
- Paraphrased claim: Sequoia characterizes recruiting's high-volume top of funnel—research, screening, matching, and outreach preparation—as more repeatable and information-heavy than closing, trust, and culture-fit judgment. Its Juicebox announcement presents criteria-driven sourcing and recommendation as a growing product pattern, with humans retaining relationship work.
- Caveat: These pieces are investment theses and marketing. Portfolio adoption, revenue, or customer anecdotes are not independent evidence of accuracy, fairness, or durable outcomes. The split between “intelligence” and “judgment” is a simplification.
- DIE implication: The defensible wedge is evidence-backed research and decision support. Do not interpret market enthusiasm as permission to automate final suitability, sensitive inferences, consent, or outreach. Human review and mutual consent remain product requirements and should be evaluated explicitly.

## Practitioner-derived analytical model

This section translates the posts above into a review model. It is not a replacement schema,
architecture, or build order. The current contract and gated sequence remain in the
[normative DIE specification](../../../DEMIGOD-DIE-SPEC.md) and
[roadmap](../ROADMAP.md).

### 1. Public research plane

- Current DIE inputs: public company sites, public job pages, public filings/news, and approved
  company-data connectors. Person enrichment, professional-profile collection, and candidate
  documents remain outside the current slice.
- Capabilities: search, fetch, parse, extract, and compare only.
- Boundaries: no outbound messages, no canonical writes, no private candidate notes or other
  private candidate data, and no secrets beyond connector-scoped read credentials.
- Every input receives a provenance and taint label. Text from a source is evidence data, never executable instruction.

### 2. Evidence ledger

The durable unit should be a typed claim, not a generated profile:

```text
subject_id
predicate
value
status: supported | conflict | unknown
source_url / source_system
supporting_span_or_field
retrieved_at
source_published_at
valid_from / valid_to
snapshot_hash
extractor/model version
conflicting_claim_ids
review_state
```

The vocabulary above mirrors the current claim contract; freshness is a separate annotation,
not a fourth truth state. Identity resolution and deduplication should be deterministic where
possible. Unknown and conflicting values must survive ingestion; the summarizer must not
silently collapse them. A human correction creates a new version and an eval case rather than
erasing the old trace.

### 3. Code-directed normal workflow

```text
resolve subject
  → retrieve permitted sources in parallel
  → parse/extract typed claims
  → validate source + supporting evidence
  → reconcile conflicts/freshness
  → compute transparent filters/rationale
  → human review
```

Only unresolved cases enter a bounded research agent. That agent receives a case-specific goal, an allowlisted read-only tool set, a maximum number of steps, token/cost/time budgets, and explicit outcomes: `resolved | ambiguous | conflict | unknown | blocked`. “Best guess” is not a valid replacement for unknown.

### 4. Matching-support plane

- Apply explicit hard constraints before model reasoning.
- Keep score components and evidence visible; do not produce a single opaque suitability number.
- Let the model summarize tradeoffs and identify missing evidence, but require cited support for factual claims.
- Exclude protected attributes and unsupported proxies from ranking. Measure subgroup error and exposure where lawful, appropriate data exists; do not infer sensitive traits to fill gaps.
- Separate research/recommendation from final judgment, consent, introduction, outreach, and canonical state changes.

### 5. Privileged review/action plane

The privileged plane accepts only validated typed records and reviewer decisions. It does not ingest raw webpages or documents. Any future send/write capability should use least-privilege tokens, a precise preview of target/content/change, a current approval, an idempotency key, and an immutable receipt.

## Eval blueprint

### Dataset

Start with a small expert-labeled set that is rich in meaningful failures, then grow it from production corrections. Include:

- clean and ambiguous company/person identities;
- duplicate names and employment histories;
- conflicting or stale role/company claims;
- closed, ghost, reposted, and location-mismatched roles;
- missing evidence and sources that disappear;
- long pages/PDFs, malformed fields, and unusual formats;
- multiple simultaneous constraints;
- sources containing prompt injection or exfiltration instructions;
- cases where the correct output is unknown or no-match;
- fairness, privacy, consent, and permission-boundary cases.

Keep development and release sets separate. Preserve a stable regression core and a rotating recent-production set.

### Component evaluations

| Stage | Primary measurements |
|---|---|
| Entity resolution | precision/recall, duplicate merge and false-merge rates, abstention quality |
| Retrieval | source coverage, authority mix, freshness, permission compliance, dead-link rate |
| Extraction | exact-field accuracy, supporting-span presence, date normalization, unknown preservation |
| Claim support | entailment/support, citation correctness, source/subject match, contradiction recall |
| Role/company status | current-state accuracy and stale-as-current rate |
| Matching support | constraint satisfaction, rationale support, missing-evidence detection, subgroup error/exposure slices |
| Security | secret/PII leakage, unauthorized tool attempts, prompt-injection compliance, tool-argument abuse |
| Operations | latency, token/cost, step count, retried calls, connector errors, timeout/abstention rate |

### End-to-end evaluations

- Grade the final evidence record and reviewer-usable outcome, not the generated narrative alone.
- Check that a reviewer could make the correct decision from the surfaced evidence and uncertainty.
- Grade the trace for disallowed sources/actions, missed conflicts, and unsupported inference.
- Run multiple trials only where model variance can change the outcome.
- Use a model grader for scale only after measuring it against expert decisions. Prefer binary or pairwise judgments, swap pairwise order, and monitor precision/recall by failure class.
- Sample both random production traces and targeted high-risk traces for human review.

### Release gates

Set numeric thresholds only after measuring the baseline and the cost of each error. Regardless of threshold, treat these as zero-tolerance critical regressions:

- action or message without current approval;
- access outside the requesting user's permissions;
- private-data or secret exfiltration;
- unsupported evidence labeled as verified;
- stale evidence represented as current without a freshness warning;
- silently merged conflicting identities;
- hidden use of protected traits or unapproved proxies.

Every prompt, model, retriever, parser, tool schema, and policy change should produce an eval diff. Store the configuration, model/provider version, source snapshot hashes, prompts, tool calls/results, latency/cost, grader outputs, and expert override so a regression can be reproduced and rolled back.

## Security and operational controls

1. **Capability separation:** Read-only research and privileged action are different runtimes, credentials, and contexts.
2. **Taint propagation:** Derived summaries remain tainted if they originate in untrusted content until reduced to a validated typed field with provenance.
3. **Least privilege:** Each connector exposes the smallest set of non-overlapping operations needed for one task.
4. **Deterministic validation:** Validate URLs, IDs, schemas, permissions, allowed domains/actions, and output types outside the model.
5. **Budgets and termination:** Step, time, token, and cost limits; explicit unresolved/blocked outcomes; no infinite self-reflection.
6. **Complete receipts:** Immutable traces for sources, tool calls, model/config versions, reviews, and changes.
7. **Freshness policy:** Per-predicate TTLs and live validation for decisions that depend on current status.
8. **Failure queues:** Retries for transient connector failures, dead-letter review for persistent/ambiguous cases, and no silent fallback to fabricated data.
9. **Adversarial regression:** Continuously add real injection attempts, malformed sources, identity collisions, and permission failures.
10. **Human calibration:** Domain experts regularly review both system decisions and evaluator decisions; corrections feed the corpus.

## Translation to the current roadmap

The evidence supports the existing order rather than creating another one: preserve the
shipped claim contract and receipts; learn from one real role; connect corrections to
outcomes; test one missing field; and consider a bounded read-only collector only if manual
research becomes a measured bottleneck. The authoritative gates remain in
[ROADMAP.md](../ROADMAP.md).

## Related canonical documents

- [DIE evaluation](../EVALUATION.md)
- [DIE operations](../OPERATIONS.md)
- [Normative DIE specification](../../../DEMIGOD-DIE-SPEC.md)
