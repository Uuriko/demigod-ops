# DIE shared brief — research-backed operating view

**Status:** shared non-normative brief for Codex, Claude, and Grok
**Researched:** 2026-07-29
**Normative decisions:** [DEMIGOD-DIE-SPEC.md §22](../../../DEMIGOD-DIE-SPEC.md#22-decision-log)

This is the first DIE document agents should load. It is short operating context, not a
second specification. If this brief conflicts with the specification, contracts, tests,
receipts, or current user request, the higher-authority source wins.

## Shared thesis

> DIE is the smallest private, read-only evidence layer that makes one human match review
> better informed: each company fact is a typed claim with a value, exact source span,
> `supported | conflict | unknown`, and the available date context; it enters the existing
> review → consent → outcome loop but never changes score, pair state, consent, introductions,
> or public claims. Its only proof of value is a real reviewed pair showing that the evidence
> changed or clarified a decision.

“Demigod Intelligence Engine” is an internal name. It is not a public product, an autonomous
research claim, a people database, or another recruiting platform.

## Current truth — read, do not extrapolate

| Fact | Current state |
|---|---|
| Gold | 30 frozen benchmark companies |
| Operational catalog | 0 rows on 2026-07-29; `companies: []` is valid |
| Accepted semantic fields | canonical company, product summary, product category, likely buyer |
| Withheld field | pricing |
| Gold live replay | 142/142 quotes replayed on 2026-07-29; verification is red because the refreshed map no longer matches the frozen selection |
| Phase 1 | engineering-complete: gold/runtime separated and fail-closed projection works |
| Product proof | not established; no real accepted role has exercised Phase 2 |
| Next gate | one real accepted startup role |

Never carry the catalog count forward from prose:

```bash
jq '.companies | length' DEMIGOD-COMPANY-RESEARCH.json
node demigod-evidence.mjs fresh company-research-benchmark
```

Gold rows project real quoted evidence. Non-gold companies project no semantic research until
a reviewed operational row exists. The runtime string `verified` means structurally
evidence-backed, not guaranteed live-fresh. Operational rows are not covered by the gold
benchmark's 142-claim receipt; inspect `source` and `researchedAt`.

The current red receipt is fail-closed selection drift, not a quote failure: Kabam lost its
ATS marker in the refreshed map, so one Wikidata × ATS gold slot changed. Do not replace gold
or edit the map merely to make the receipt green; follow the specification's deliberate
benchmark-replacement gate.

## Shared decision index

The labels below are a navigation index only. The exact binding text has one owner:
[the specification decision log](../../../DEMIGOD-DIE-SPEC.md#22-decision-log).

| ID | Decision |
|---|---|
| D-001 | One product, one decision owner |
| D-002 | Evidence, not verdict |
| D-003 | Unknown is valid |
| D-004 | Exact identity only |
| D-005 | Read-only sidecar |
| D-006 | Gold and runtime are separate |
| D-007 | Four fields accepted; pricing withheld |
| D-008 | Company evidence only |
| D-009 | Time belongs to the claim |
| D-010 | Providers are substrate, not the moat |
| D-011 | The simplest code-directed path must earn every expansion |
| D-012 | Public research cannot act |

The four hard gates for every agent are:

- company evidence only—no person enrichment or candidate scraping;
- evidence has no match, score, consent, intro, outcome, or public-site authority;
- public/untrusted research has no private data, write, publish, or communication capability;
- no new product layer begins before its [roadmap](../ROADMAP.md) gate is true.

## Load only what the task needs

| Task | Read |
|---|---|
| Orient or discuss product | this brief |
| Change claim shapes or projection | [CONTRACTS.md](../CONTRACTS.md) |
| Change grading, thresholds, or verification | [EVALUATION.md](../EVALUATION.md) |
| Operate, recover, or edit the catalog | [OPERATIONS.md](../OPERATIONS.md) |
| Decide what may be built now | [ROADMAP.md](../ROADMAP.md) |
| Execute the next bounded work package | [NEXT-WORK-PROMPT.md](../NEXT-WORK-PROMPT.md) |
| Resolve an architecture or authority dispute | [DEMIGOD-DIE-SPEC.md](../../../DEMIGOD-DIE-SPEC.md) |
| Revisit market evidence | [COMPETITIVE-LANDSCAPE.md](COMPETITIVE-LANDSCAPE.md) |
| Revisit academic evidence | [ACADEMIC-FOUNDATIONS.md](ACADEMIC-FOUNDATIONS.md) |
| Revisit production patterns | [PRACTITIONER-PLAYBOOKS.md](PRACTITIONER-PLAYBOOKS.md) |

The three long research memos are appendices, not default prompt context.

## Market position

The market already sells every broad ingredient:

1. data vendors sell company and people coverage;
2. research/workflow tools sell enrichment, signals, and activation;
3. recruiting platforms sell search, ranking, and workflow;
4. recruiting services sell judgment, outreach, and placement.

Wellfound publicly sells a dedicated recruiter at `$500/month/open role + 10% on hire`;
Paraform combines expert recruiters with custom agents; Clay maintains persistent account
research. Fee shape, “AI + human,” database scale, and always-on research are therefore not
defensible positions
([Wellfound](https://reach.wellfound.com/autopilot),
[Paraform](https://www.paraform.com/for-companies),
[Clay](https://university.clay.com/docs/account-research-agents)).

The narrower testable wedge is the join competitors do not publicly establish as one product:

- exact startup and ATS identity;
- atomic company claims with source excerpts, conflicts, and unknowns;
- private review without AI decision authority;
- mutual consent before introduction;
- evidence consultation and correction linked to outcomes.

That is an inference from public materials, not a claim that competitors lack private
capabilities.

## Evidence anchors

These sources explain the decisions agents are most likely to re-litigate:

| Question | Evidence |
|---|---|
| Why atomic claims and explicit unknowns? | [FEVER](https://aclanthology.org/N18-1074/) · [FActScore](https://aclanthology.org/2023.emnlp-main.741/) |
| Why exact identity and abstention? | [Fellegi–Sunter](https://www.tandfonline.com/doi/abs/10.1080/01621459.1969.10501049) · [PDL company matching](https://docs.peopledatalabs.com/docs/reference-company-enrichment-api) |
| Why evidence without an AI verdict? | [Bansal et al.](https://idl.uw.edu/papers/ai-explanations-team-performance) |
| Why evaluate pipeline layers separately? | [RAGAS](https://aclanthology.org/2024.eacl-demo.16/) · [ARES](https://aclanthology.org/2024.naacl-long.20/) |
| Why preserve time context? | [TempLAMA](https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00459/110012/Time-Aware-Language-Models-as-Temporal-Knowledge) · [FreshQA](https://arxiv.org/abs/2310.03214) |
| Is company-at-tenure context a real product pattern? | [Juicebox](https://juicebox.ai/blog/funding-revenue-and-investor-data) |
| Why workflows before agents? | [Anthropic](https://www.anthropic.com/engineering/building-effective-agents) |
| Why separate public research from action? | [Lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) |
| What can compound defensibly? | [OpenAI evals primer](https://openai.com/index/evals-drive-next-chapter-of-ai/) |

Vendor metrics are self-reported. Practitioner posts are experience, not controlled trials.
Academic findings often study narrower tasks. Every borrowed idea remains a local hypothesis
until a Demigod-specific evaluation supports it.

## System shape

```text
public, untrusted sources
        │
        ▼
read-only retrieval ── exact company identity gate
        │
        ▼
typed claims ── exact source span ── source/research dates
        │
        ├── supported
        ├── conflict
        └── unknown
        │
        ▼
private evidence view
        │
        ▼
human review ── mutual consent ── intro ── observed outcome
        │
        └──────── corrections and usefulness labels ───────┘
```

No raw page instruction crosses into privileged state. No research field enters scoring.
No later outcome rewrites the evidence that was available at decision time.

## Evidence packet boundary

### Shipped now

- exact canonical company ID;
- four benchmark-accepted semantic fields;
- field status, safe source URL, and exact quote;
- research source and row-level `researchedAt`;
- verified hiring ownership, public-role observations, and display-only quarantine;
- private match/review/funnel/dashboard projection;
- score, state, consent, intro, and public-output isolation.

### Gated future

- per-claim observed, source-updated, and valid intervals;
- `company_context_during_tenure`, limited to public employer-state facts for that period;
- evidence-shown, evidence-consulted, correction, and decision-changed markers;
- one field-specific provider comparison;
- a bounded read-only collector if manual research becomes a measured bottleneck.

Company-at-tenure context never contains candidate PII or traits and never infers past stage
from current stage.

### Never authorized by this pack

- person enrichment, candidate scraping, or protected-trait inference;
- an AI fit verdict or global confidence score;
- inferred pricing;
- automatic match, rejection, consent, outreach, introduction, or public publishing;
- a graph, DSL, provider router, agent swarm, or database without a measured gate.

This packet outline is not a new database contract. It names the boundary that existing
objects may satisfy incrementally after the roadmap gate.

## Evidence-to-roadmap translation

| Research conclusion | Current state | Earliest gated change |
|---|---|---|
| Gold and runtime differ | implemented | none |
| Claims need exact evidence and unknown/conflict | implemented for accepted fields | extend only for a real missing field |
| Time belongs to the claim | row-level `researchedAt` only | Phase 2, if a real role needs it |
| Explanations can induce overreliance | no AI verdict today | preserve evidence-first review |
| Outcome-linked corrections may compound | outcome state exists | Phase 3 markers and links |
| Providers are substrate | no paid provider | Phase 4, one missing field |
| Agent complexity must earn its way in | no collector | Phase 5, read-only and bounded |
| Untrusted research must not act | enforced boundary | permanent |

Execution remains:

1. keep the shipped benchmark/catalog separation;
2. use one real accepted role to test whether context helps;
3. connect consulted/corrected evidence to real outcomes;
4. test one missing field only after repeated need;
5. add a bounded collector only after measured manual bottleneck.

## Five falsifiable checks

1. **Authority isolation:** identical role and candidate inputs with empty versus populated
   research must produce identical score, ordering, pair state, and consent; only the research
   sidecar and review flags may differ.
2. **Non-vacuous gold verification:** green live verification requires all expected claims,
   selection identity, and exact quote replay; an offline or partial run cannot seal green.
3. **Fail-closed catalog:** an empty catalog preserves benchmark fallback; one valid non-gold
   row projects without changing gold policy; duplicate, malformed, unsafe, or invalid
   overrides project nothing and do not silently fall back.
4. **Person/action gate:** no research field is keyed to a person, no candidate PII enters the
   public research plane, and DIE has no public-site or outbound-action authority.
5. **Real-review utility:** a real accepted role must record that evidence changed or clarified
   a decision, exposed a missing question, prevented a false assumption, or saved a
   clarification loop. Repeated null utility shrinks or removes the surface; it does not
   justify more machinery.

The first four establish correctness and safety. Only the fifth establishes product value.

## Product falsifiers

Reconsider the wedge if real reviews show that:

- evidence never changes a question, decision, error, or clarification burden;
- first-party company and role facts are already obvious to both sides;
- identity or freshness errors cost more time than the context saves;
- founders or candidates do not value private mutual-consent matching;
- a direct substitute supplies the same evidence and service at lower total cost;
- outcome records cannot distinguish learning from story.

## Relationship to the rest of Demigod

DIE does not replace:

- [Talent engineering research](../../DEMIGOD-TALENT-ENGINEERING-RESEARCH.md), which owns
  firm-driven search, retention, market design, and recruiting economics;
- [Full-service recruiting blueprint](../../DEMIGOD-FULL-SERVICE-RECRUITING-BLUEPRINT.md),
  which owns the end-to-end human recruiting operating model;
- [the imported Clay discussion](../../exchange/DEMIGOD-INTELLIGENCE-ENGINE-CLAY-DISCUSSION-2026-07-28.md),
  which is historical context only.

The shared operating rule is simple: evidence informs review; humans decide; consent controls
introduction; outcomes determine whether the layer earns its place.
