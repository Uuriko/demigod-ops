# Demigod Intelligence Engine — canonical build specification

**Status:** active
**Product:** Demigod, SF startup ↔ talent matching
**Purpose:** make private match review unusually well-informed without automating judgment
**Canonical for DIE:** this file plus the contracts, evaluation, operations, and roadmap documents under `docs/die/`
**Historical context only:** `DEMIGOD-DIE-BRIEF.md` and `docs/exchange/DEMIGOD-INTELLIGENCE-ENGINE-CLAY-DISCUSSION-2026-07-28.md`
**Name boundary:** “Demigod Intelligence Engine” / DIE is internal shorthand, not public
positioning, a separate product, or a claim of autonomous research.

---

## 0. The whole system in one page

Demigod Intelligence Engine (DIE) is not a second product, a Clay clone, a knowledge graph,
or an autonomous matching agent.

It is the smallest trustworthy intelligence layer that helps a human answer:

> For this specific role and candidate, what public company and hiring facts are useful,
> what exact evidence supports them, what remains unknown, and what needs review?

The unit of value is still a human-reviewed match that reaches mutual consent and an
observed outcome. Research is useful only when it improves that loop.

The current system already has:

- a large SF startup map with source provenance;
- native ATS route validation, first-party ownership evidence where available, and current
  public-role summaries;
- a monotonic role observation ledger;
- deterministic match evidence and score isolation;
- pair review, two-sided consent, intro, and outcome state;
- a 30-company research benchmark with exact quotations;
- an independent zero-to-many operational research catalog;
- four benchmark-accepted semantic fields;
- private research projection into match review, candidate ranking, funnel receipts, and
  the operator dashboard;
- sealed evidence receipts and stale-green refusal.

Phase 1 removed the first structural defect:

- the 30-company benchmark remains frozen evaluation gold;
- the operational catalog may contain zero to many companies;
- accepted-field policy still derives only from the benchmark;
- a valid operational row takes precedence over benchmark fallback;
- invalid, duplicate, or unsafe rows fail closed;
- research remains read-only with respect to score, pair state, consent, intros, and public
  claims.

The next product gate is one real accepted startup role. Everything beyond the shipped
catalog waits for evidence from that review or another explicit gate in the roadmap.

---

## 1. Canonicality and precedence

When documents disagree, use this order:

1. the current user request;
2. `AGENTS.md`, `DEMIGOD-SIMPLE.md`, and `DEMIGOD-AGENTS.md`;
3. live receipts and `bin/dg truth`;
4. executable contracts and tests;
5. this specification and `docs/die/`;
6. historical discussion documents.

This specification owns durable design. It does not own mutable release identity, live
website hashes, queue counts, or other facts already owned by receipts.

### 1.1 Canonical document set

| Document | Owns |
|---|---|
| `DEMIGOD-DIE-SPEC.md` | Product boundary, architecture, invariants, decisions, build sequence |
| `docs/die/CONTRACTS.md` | Exact data and function contracts |
| `docs/die/EVALUATION.md` | Gold set, thresholds, live replay, poison controls |
| `docs/die/OPERATIONS.md` | Safe local operating and recovery procedure |
| `docs/die/ROADMAP.md` | Ordered work, gates, current implementation status |
| `docs/die/research/SYNTHESIS.md` | Shared non-normative agent brief and research index |

The synthesis is the short shared entry for Codex, Claude, and Grok. The remaining
non-normative research pack records competitor, academic, and practitioner evidence behind
later decisions. None of it overrides this specification or an executable contract.

There is intentionally no separate source registry, field-registry service, recipe DSL,
model-call notebook, knowledge graph, or evaluation dashboard.

---

## 2. Product boundary

### 2.1 What DIE is

DIE is private, match-adjacent evidence:

- exact company identity;
- concise product summary;
- controlled product category;
- likely buyer;
- public pricing status when sufficiently supported;
- verified hiring-board ownership;
- current public-role observations;
- exact quotation and URL for semantic claims;
- explicit unknowns and conflicts;
- freshness and verification receipts;
- review-only projection into existing Demigod workflows.

### 2.2 What DIE is not

DIE is not:

- a public company-research product;
- an outbound prospecting platform;
- a candidate scraper;
- person identity resolution;
- a replacement for founder or candidate input;
- an automatic match decision;
- an automatic intro;
- a confidence score masquerading as truth;
- a generalized workflow engine;
- a provider router;
- an agent swarm;
- a new database;
- a public website claim surface.

Any future `company_context_during_tenure` is limited to public employer-state facts at the
relevant time. It may never contain candidate PII or traits and may never back-project the
company's current stage into the past.

### 2.3 Product equation

```text
useful DIE
  = source-backed company context
  + observed hiring context
  + deterministic match evidence
  + human review
  + mutual consent
  + outcome labels
```

If a proposed component does not strengthen one term in that equation, it does not belong.

---

## 3. Design principles

### 3.1 Evidence before confidence

A semantic company fact is either:

- `supported` by a public exact quote;
- `conflict` because a public source contradicts another relevant source;
- `unknown`.

There is no unsupported “probably.”

### 3.2 Unknown is a valid output

Unknown is not failure. It prevents invented detail and names where another source or a
human clarification may be useful.

### 3.3 Precision before recall

Company identity uses exact unique normalized names and canonical map IDs. Missing identity
returns `unknown`. Duplicate normalized identities return `ambiguous`. No fuzzy merge runs
inside match review.

### 3.4 Evaluation is separate from operation

The benchmark answers whether a field type is trustworthy enough to expose. The operational
catalog answers what is currently known about a particular company. They share a claim
shape, not a row-count invariant.

### 3.5 Research advises; humans decide

Research may:

- appear in a private review card;
- create a review flag;
- quarantine a displayed hiring board;
- explain what is known or unknown.

Research may not:

- change a match score;
- approve, reject, or defer a pair;
- set founder or candidate consent;
- initiate an intro;
- create an outcome;
- publish a claim.

### 3.6 One source of truth per object

| Object | Source of truth |
|---|---|
| Company universe and source provenance | `DEMIGOD-SF-STARTUP-MAP.json` |
| Public role observations | `DEMIGOD-ROLE-LEDGER.json` |
| Accepted field policy | Frozen research benchmark grade |
| Operational semantic company claims | `DEMIGOD-COMPANY-RESEARCH.json` |
| Pair state and consent | Existing pair ledger |
| Verification freshness | Sealed evidence receipt |
| Website release identity | `bin/dg truth` |

### 3.7 Fewest moving parts

V1 uses:

- JSON already used by the repository;
- Node standard library plus the already-installed Undici transport;
- existing fetch cache and HTML text extraction;
- existing evidence envelopes;
- existing matcher, review, funnel, and dashboard projections.

No new dependency is required.

---

## 4. Current truth

### 4.1 What is implemented

The first vertical slice already did the following:

- fixed role taxonomy so an AI Product Manager remains product while an ML Engineer remains
  AI/data;
- selected a deterministic 30-company benchmark across six source × ATS strata;
- captured five semantic fields with exact quoted evidence or explicit unknown;
- replayed every non-unknown quotation against live sources;
- accepted four fields and withheld pricing;
- projected accepted research into private match review;
- kept score, state, consent, and intros isolated;
- corrected source identity defects caught by Claude and Grok;
- added provider-owner validation for Lever, Greenhouse, and Ashby;
- removed proven false ATS bindings and contaminated role observations;
- made offline grading incapable of sealing live verification green;
- made the source and full verification matrices pass.

A later user-directed, existing-system extension also:

- canonicalized public-page or self-submitted LinkedIn profile URLs as professional identity,
  with shared opt-out suppression and field-level provenance;
- reused the current funnel for local initial/follow-up drafts while preserving hard
  `autoSend: false` and `autoDm: false` boundaries;
- attached structured public-source, freshness, role-count, and exact map-identity evidence
  to local demand draft review without changing draft copy, recipients, rank, or delivery;
- projected only aggregate, redacted enrichment and draft counts into the private Inbox;
- classified nested sample/selftest markers and synthetic contacts before operational Inbox
  counts, and bounded plus PII-scrubbed rejection reasons before private projection;
- extended the verified ATS waterfall to Workable with required first-party owner evidence
  and fail-closed job identifiers across all public adapters;
- bound every supported ATS label to its exact native HTTPS host and canonical board shape
  before deriving a `(provider, slug)` identity, covering Greenhouse, Lever, Ashby,
  SmartRecruiters, Workable, Recruitee, and Personio; lookalikes, credentials, ports,
  query/fragment routes, nested subdomains, and job-detail paths fail closed;
- validated provider role URLs again at the shared ledger ingress, retaining only native
  provider/slug/job routes or reviewed company-owner URLs and requiring no-agency evidence
  to bind to that retained role URL; invalid evidence is stripped without falsely closing
  the observed role;
- bounded every shared ATS observation to 2,000 roles, 500,000 normalized descriptive
  characters, and bounded IDs/titles/locations/URLs; duplicate job IDs or duplicate
  nonempty normalized public URLs invalidate the observation without closing prior roles,
  while duplicate sibling-board identity remains first-observation-wins; enrichment CLI
  modes are exact before any map read or provider poll;
- reused one strict role-ledger loader across poll, purge, and report, requiring the exact
  schema, role-key identity, bounded display fields, lifecycle date order, reopen count, and
  native dates so missing, corrupt, or wrong-shaped ledgers cannot become empty history;
- produced a complete private, mode-`0600` RecruitAI table across exact company, provider,
  and board identities, plus relationship JSON bounded to 25 open roles per board; only the
  downstream company review preview is capped to 5–10 rows;
- commits the JSON table/graph and flat CSV together as one hashed private generation behind
  an atomic latest pointer under one publish lock, so partial or overlapping writes cannot
  publish a mixed or dangling pair; the default sourcer resolves that generation once and
  verifies its confined path, private modes, commit metadata, and both hashes before parsing;
- rejects contact-shaped, unsafe-control, unbounded, or hidden-link descriptive values even
  when table, graph, and diagnostics are tampered consistently; exact allowlisted public URLs
  remain structured and public research URLs are length-bounded before fetch/projection;
- required every sample-role, PeopleOps, attributed-posting-age, and no-agency evidence
  tuple to match a `has_open_role`-connected role under its own board, prioritizing those
  evidence roles within the 25-role bound; role URLs must carry the exact job identity on
  either the native provider host or an existing reviewed company-owner alias, and graph
  counts cannot launder omitted or unidentified roles;
- projected first-observed, closed-today, and reopened-open role changes directly from the
  monotonic ledger without adding a second history store;
- separated first observation from posting date using only the ledger's trusted Greenhouse
  `first_published` attribution, so a coverage discovery cannot be mislabeled as a newly posted role;
- projected that same attributed posting-age evidence into the private RecruitAI table, separating
  45–365 day stale roles from >365 day evergreen roles without changing ranking;
- reused that validated table in the existing partner sourcer as a private 5–10-row preview:
  exact YC identity, exact CRM company-name dedupe, positive no-agency abstention, and no
  score/contact/queue/write authority; only an exact agent-authored junk tombstone is ignored,
  while policy holds, opt-outs, and manual disqualifications still block; the committed source
  must be from the current UTC day and bind the exact current role-ledger update, and projected
  descriptive company/title/talent text is contact-scrubbed without changing structured
  identity, URL, or provenance fields;
- carried validated ledger-change, attributed posting-age, and positive PeopleOps-role facts
  into that preview as `reviewSignals` without changing export order: first observation is not
  called a new posting, closure is not called a hire, and zero PeopleOps roles remains unknown;
- added a reconciled selection receipt to that preview: selected, eligible beyond the preview
  window, mutually exclusive abstention reasons, and upstream export omissions remain separate;
  strict `--offset` windows expose the complete eligible pool without widening a review batch;
- added one dry-run-first `import-sourcer --id=yc:slug` boundary that revalidates the committed
  export and exact current CRM eligibility, then permits only an explicit one-row `sourced`
  projection of public company/role facts; current exact imports are byte-idempotent, while
  source drift, altered rows, CRM blockers, no-agency evidence, unsafe sources, and hash
  mismatches fail closed, its CRM row and transition log commit or roll back together, and no
  contact, score, consent, fee, draft, queue, pair, approval, or delivery authority is
  projected;
- required that CRM store to be a non-array object with both partner and talent lanes, and
  made transaction snapshots treat only `ENOENT` as absence so unreadable or raced existing
  logs abort before any commit; submission-inbox and matching-board loaders use the same
  `ENOENT`-only default and reject wrong-shaped array lanes without rewriting them;
- added one bounded, allowlisted Work at a Startup enrichment route that accepts only an exact
  public job/company payload, projects a safe company URL, and projects LinkedIn only for one
  unambiguous named founder; it never redirects or follows ATS/company-page hops;
- reused the accepted DIE projector in that export so supported company claims remain
  source-backed and withheld pricing remains absent; validation restricts the complete
  research envelope to known accepted fields, a derived status, a typed quarantine flag, a
  valid optional research date, and the exact source-specific verification receipt;
- required every real pair to carry explicit `sample: false` and exact canonical
  pair/role/candidate IDs, then revalidated its currently accepted role and currently
  match-ready non-sample candidate at proposal, approval, consent, intro, pair-sync, and
  referral-reward boundaries; production planners ignore substituted fixture context, while
  forced sample or malformed drafts remain visibly marked `SAMPLE`; classification-conflict
  reproposals refuse, terminal reproposals are byte-idempotent, sample state totals are
  separately labeled, every real approve/reject/defer requires explicit local review
  attestation plus bounded evidence, and mutual-intro authority requires valid founder and
  candidate consent-history receipts rather than booleans alone;
- made startup/candidate readiness require exact current form options, bounded control-safe
  descriptive constraints, syntactically valid contact email, and a standalone
  credential-free HTTPS resume reference; matching removes contact, identity, and protected
  terms from score/evidence, gives no location boost when either side is unknown, and emits
  only bounded evidence reasons; invalid scores, oversized store inputs, and corrupt pair
  or legacy-match stores fail before mutation;
- made that export project semantic company claims only when the sealed benchmark receipt has
  `green`, `pass`, and `fresh` true, canonical reason `pass-fresh`, a nonempty string run ID,
  and a parseable completion time, and made the committed sourcer bind that exact current
  run identity plus the parsed operational-catalog hash, while preserving unrelated public
  hiring observations;
  the shared grader also rejects any change to the frozen `0.90` usable-coverage and `0.95`
  evidence-support thresholds;
- distinguished live-replayed benchmark claims from reviewed but unreplayed catalog claims
  in both table and relationship output, binding the latter to an exact catalog input hash;
- made every generated funnel and Events review-package file mode `0600` and every generation
  directory mode `0700`, including helper artifacts outside the atomic manifest.
- reused one bounded single-line projector across private intro, pair, pilot, initial/follow-up
  funnel, and founder-draft writers; controls and bidi overrides are removed, Markdown
  structure is escaped, and only standalone credential-free HTTP(S) links survive, so
  untrusted form/CSV values cannot forge headers, review/consent markers, or duplicate
  packet sections while atomic private writes preserve exact structured identifiers.

These additions do not collect brokered or candidate person data, send messages, make match
decisions, or create a second database or public surface. The narrow public-founder projection
stays in the existing demand funnel as a local review draft, outside the company-research plane.

### 4.2 What remains gated

The repository can verify gold claims and project valid operational rows. It does not yet:

- collect or write research automatically;
- assemble a role-scoped operator brief for a real accepted brief;
- learn from real match outcomes;
- enforce per-field freshness in match review;
- run a paid-provider bakeoff.

### 4.3 The next product gate

One real accepted startup role must exist before another product layer is added. That review
will determine which existing facts are useful, which questions remain missing, and whether
historical company context is worth collecting.

```text
accepted role
  -> exact company + current hiring + accepted semantic claims
  -> source-backed unknown/conflict flags
  -> human records whether the context helped
```

No automatic recommendation, match authority, or new interface is implied by that gate.

---

## 5. Architecture

### 5.1 Logical flow

```text
YC / Wikidata / HN
        |
        v
SF startup map -----------> ATS ownership validation
        |                              |
        |                              v
        +----------------------> role ledger
        |
        +-----------> exact map company ID
                              |
                              v
                   operational research catalog
                              |
                 accepted-field policy from gold
                              |
                              v
                   company evidence projection
                              |
          +-------------------+-------------------+
          |                   |                   |
          v                   v                   v
      match review       candidate ranking     funnel receipt
          |
          v
      operator dashboard

None of these arrows enters score, pair state, consent, intro, or public site truth.
```

### 5.2 Physical components

| Component | Responsibility |
|---|---|
| `demigod-startup-map-data.mjs` and related refresh paths | Company enumeration and provenance |
| `demigod-startup-jobs-enrich.mjs` | ATS detection, owner validation, role aggregation |
| `demigod-role-ledger.mjs` | Monotonic public-role observations |
| `DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json` | Frozen evaluation gold |
| `demigod-company-research-benchmark.mjs` | Selection, grading, live quote replay, receipt |
| `DEMIGOD-COMPANY-RESEARCH.json` | Operational semantic claim catalog |
| `demigod-evidence.mjs` | Accepted-field policy and safe claim projection |
| `demigod-matching-engine.mjs` | Exact company join and read-only evidence assembly |
| `demigod-match-review.mjs` | Private review queue |
| `demigod-funnel.mjs` | Evidence receipt text, not authority |
| `demigod-agent-dashboard-ui.html` | Private operator rendering |

### 5.3 Why JSON remains enough

The operational catalog is small, review-oriented, and local. JSON provides:

- inspectable diffs;
- no service lifecycle;
- no schema migration framework;
- reuse of existing atomic reads;
- straightforward fixtures;
- easy failure recovery.

Move to a database only when concurrent writes or measured query latency make JSON unsafe.

---

## 6. Identity contract

### 6.1 Canonical key

Every research row is keyed by a `company.id` from the startup map.

Examples:

```text
yc:commodityai
wd:Q15646906
hn:thisismason.com
```

Display names are not keys.

### 6.2 Match-time resolution

For a role company name:

1. normalize using the existing company-name normalizer;
2. find map rows whose normalized name matches exactly;
3. zero matches → `unknown/company_not_found`;
4. more than one match → `ambiguous/company_name_not_unique`;
5. exactly one match → use that row's canonical `company.id`;
6. retrieve hiring and research by that ID.

### 6.3 Explicitly prohibited identity shortcuts

V1 does not:

- fuzzy-match names;
- merge by partial domain;
- accept ATS board name as company ownership proof;
- treat a government or ATS host as a company website;
- overwrite a map ID from semantic research;
- join candidates or people across sources.

### 6.4 When to improve identity

Add reviewed aliases only after a concrete false-negative is reproduced. Keep aliases
explicit and auditable. Do not add a generalized entity-resolution service.

---

## 7. Research objects

### 7.1 Benchmark document

The benchmark document is evaluation gold:

```json
{
  "version": 1,
  "researchedAt": "YYYY-MM-DD",
  "selectionSeed": "demigod-die-benchmark-v1",
  "thresholds": {
    "usableCoverage": 0.9,
    "evidenceSupport": 0.95
  },
  "companies": []
}
```

Its `companies` array remains exactly 30 rows selected across:

- YC × ATS;
- YC × no ATS;
- Wikidata × ATS;
- Wikidata × no ATS;
- HN × ATS;
- HN × no ATS.

The benchmark is not the operational write target.

### 7.2 Operational catalog

The operational catalog is intentionally small:

```json
{
  "version": 1,
  "researchedAt": null,
  "companies": []
}
```

It may contain zero to many map-linked companies.

An operational row may override a benchmark row for private projection, but it cannot
change which fields are accepted. The benchmark alone owns that policy.

### 7.3 Company row

```json
{
  "id": "yc:example",
  "researchedAt": "2026-07-29",
  "fields": {
    "canonicalCompany": {
      "value": "Example",
      "status": "supported",
      "url": "https://example.com/",
      "quote": "Example"
    },
    "productSummary": {
      "value": null,
      "status": "unknown",
      "url": null,
      "quote": null
    }
  },
  "quarantineHiring": false
}
```

### 7.4 Claim

A non-unknown claim requires:

- non-empty `value`;
- status `supported` or `conflict`;
- safe public HTTP(S) URL;
- non-empty exact quote;
- quote of at most 20 words.

An unknown claim requires:

- `value: null`;
- `url: null`;
- `quote: null`.

### 7.5 Catalog precedence

For a company ID:

1. if exactly one operational row exists, use it;
2. otherwise, if exactly one benchmark row exists, use it;
3. otherwise return no research projection.

An invalid operational row fails closed. It does not silently fall back to older gold.

---

## 8. Field contract

The detailed normative contract is in `docs/die/CONTRACTS.md`.

### 8.1 Current fields

| Field | Meaning | Current policy |
|---|---|---|
| `canonicalCompany` | Public canonical company or legal identity | Accepted |
| `productSummary` | Concise description of what the company provides | Accepted |
| `productCategory` | Controlled, useful product category | Accepted |
| `likelyBuyer` | Buyer/user group named or clearly supported by source | Accepted |
| `pricingStatus` | Public availability or buying motion, never invented amount | Withheld |

### 8.2 Why pricing is withheld

Pricing evidence exists for fewer than 90% of the benchmark companies. The correct output
is unknown, not a guessed range or a fabricated contact-sales assumption.

### 8.3 Accepted-field policy

At runtime:

1. grade the frozen benchmark;
2. refuse all semantic projection if the benchmark structure is invalid;
3. use only `grade.acceptedFields`;
4. validate the selected operational or benchmark row;
5. omit unknown or invalid individual fields;
6. preserve conflicts and surface a review flag.

### 8.4 No field affects score

Every field has:

```text
effect_on_score = none
effect_on_state = none
effect_on_consent = none
effect_on_intro = none
```

This is a product invariant, not an implementation accident.

---

## 9. Source policy

### 9.1 Preferred sources

Use the smallest first-party surface that supports the claim:

1. official company page;
2. official product, pricing, about, careers, or investor page;
3. official ATS board only for hiring and role facts;
4. YC company profile for YC directory facts;
5. Wikidata for facts covered by its provenance/license;
6. HN hiring post for the claims actually made by the company representative.

### 9.2 Source-surface rule

A source must be suitable for the claim:

- a Greenhouse marketing page is not evidence for another company's product claim;
- an ATS board name is not ownership proof;
- a `.gov` directory row is not automatically a startup;
- a redirect may establish a reviewed alias, not an unreviewed merge;
- a search-result snippet is not claim evidence.

### 9.3 Safe URL rule

Research URLs must:

- use HTTP or HTTPS;
- contain no username or password;
- have a non-empty public hostname;
- reject IP-literal, loopback, private, link-local, and local-development hosts;
- resolve through a connection-time DNS guard that rejects the whole answer set if any
  address is non-public;
- follow at most five redirects manually and repeat the URL and DNS checks at every hop.

The current verifier only fetches reviewed benchmark/catalog URLs. Arbitrary user-supplied
URL fetching remains out of scope even with this transport boundary.

### 9.4 Exact quote rule

The quote is a compact proof pointer, not a copied page:

- maximum 20 words;
- exact normalized text;
- enough context to support the value;
- no long copyrighted excerpt.

---

## 10. Status and conflict semantics

### 10.1 Field states

| State | Meaning | Runtime behavior |
|---|---|---|
| `supported` | Source supports the stated value | Show value and evidence |
| `conflict` | Relevant source contradicts another source or map fact | Show value, evidence, and review flag |
| `unknown` | No acceptable support | Omit value; keep unknown |

### 10.2 Research-card status

| Status | Meaning |
|---|---|
| `verified` | At least one accepted field projects and none conflicts |
| `verified_with_conflict` | At least one accepted field projects and one or more conflicts |
| `unknown` | Row exists but no accepted supported/conflict field projects |
| absent (`null`) | No unique valid row or benchmark policy invalid |

The word `verified` means structurally evidence-backed. Live source freshness is owned by
the benchmark evidence receipt and must be shown separately when freshness matters.
Operational catalog rows are not part of the benchmark's 142-claim live replay; show their
`researchedAt` date and `source` rather than implying that receipt covers them.

### 10.3 Conflict handling

A conflict:

- counts as usable for benchmark coverage when evidence is valid;
- never disappears;
- adds `company_research_conflict`;
- does not change score or state;
- remains until a reviewed catalog update replaces or marks it unknown.

---

## 11. Freshness

### 11.1 Three kinds of freshness

Do not collapse these:

| Freshness | What it answers | Owner |
|---|---|---|
| Map freshness | Is company/hiring metadata recently refreshed? | Map/job refresh receipts |
| Claim freshness | When was this company row researched? | Row/root `researchedAt` |
| Verification freshness | Did exact quote replay recently pass? | Evidence envelope |

### 11.2 V1 behavior

V1 projects the research row with its `researchedAt` date. It does not yet suppress an old
row automatically.

The operator sees evidence and date; the benchmark receipt proves only the frozen gold
claims, not arbitrary operational rows.

Each live gold replay also updates a private mode-`0600` verification-history snapshot with
`firstVerifiedAt`, `lastVerifiedAt`, and the first clean observation that an exact quote stopped
matching. Claim identity includes the normalized quote hash, so replacement text starts a new
history. Transport or fallback failure is recorded separately and never manufactures decay.
This is diagnostic history only; it does not suppress a claim or change match behavior.

### 11.3 Future stale state

Add per-field stale handling only when a real review consumes an outdated row and the age
changes a decision. Until then:

- preserve `researchedAt`;
- never label operational rows as benchmark-live-verified;
- update a row deliberately when evidence changes.

---

## 12. Benchmark and evaluation

The normative evaluation plan is in `docs/die/EVALUATION.md`.

### 12.1 Gates

For each field:

```text
usableCoverage = (supported + conflict) / 30
evidenceSupport = evidenced claims / (supported + conflict)
```

Acceptance requires:

```text
usableCoverage >= 0.90
evidenceSupport >= 0.95
```

### 12.2 Live verification

A live verification pass requires:

- `verifyLive === true`;
- a direct network replay that bypasses shared cached bodies;
- connection-time public-address validation on every redirect hop;
- more than zero expected claims;
- source-check count exactly equals expected-claim count;
- no failed source check;
- no grade error;
- deterministic benchmark selection still matches the current map.

Offline grading:

- may evaluate schema and coverage;
- writes a separate artifact;
- never overwrites or seals a live pass.

### 12.3 Why benchmark rows stay frozen

The benchmark is useful because it can fail. Treating every operational addition as another
gold row would:

- change the subject under test;
- destroy stable comparisons;
- make expansion break the exact row-count contract;
- turn the evaluation set into the product database.

The runtime catalog prevents that.

---

## 13. Match integration

### 13.1 Company evidence object

For an exact unique company match, the engine may return:

```text
company
provenance
hiring
roleEvidenceStatus
reviewFlags
roleObservations
research
```

### 13.2 Research projection

The research object contains:

```text
status
source                 # catalog | benchmark
researchedAt
acceptedFields
quarantineHiring
fields
```

Each projected field contains:

```text
value
status
evidence.url
evidence.quote
```

### 13.3 Hiring quarantine

When the selected research row has `quarantineHiring: true`:

- hiring status becomes `quarantined`;
- open role count is hidden;
- ATS source and jobs URL are hidden;
- role mix and observation date are hidden;
- exact role observations are not emitted;
- review includes `public_hiring_quarantined`.

This is display protection, not deletion from the canonical map or ledger.

### 13.4 Score isolation

The research object must never be passed into:

- `scoreMatch`;
- compensation alignment;
- location compatibility;
- pair proposal score;
- consent checks;
- intro eligibility.

Tests should compare behavior with empty versus populated research and observe only the
sidecar evidence object changing.

---

## 14. Review, funnel, and dashboard

### 14.1 Match review

Non-sample reviewed pairs may show company evidence. Sample pairs do not receive company
evidence, preventing sample truth from becoming product proof.

### 14.2 Candidate-centric ranking

Candidate ranking may include the company-evidence sidecar for each role. Ranking order and
score remain unchanged.

### 14.3 Funnel receipt

The funnel may record:

```text
companyEvidence
roleEvidence
researchEvidence
researchFields
```

Those lines document what the engine saw. They do not prove that research caused a
transition, and they do not create consent.

### 14.4 Dashboard

The private dashboard may render:

- research status;
- source (`catalog` or `benchmark`);
- product category;
- likely buyer;
- research conflicts;
- role observations.

No DIE claim is added to the public site by this design.

---

## 15. Operational workflow

The exact runbook is in `docs/die/OPERATIONS.md`.

At a high level:

```text
1. identify an exact map company id
2. collect first-party evidence
3. record supported/conflict/unknown fields in the operational catalog
4. run the focused projection test
5. run source verification
6. inspect the private match-review projection
7. record whether the context changed or clarified a real review
```

There is no auto-research writer in V1.

---

## 16. Build plan

The executable sequence is in `docs/die/ROADMAP.md`.

### Phase 0 — falsify the thesis

Status: complete.

- freeze five fields;
- select 30 stratified companies;
- collect exact evidence;
- grade coverage and support;
- withhold pricing;
- replay claims live;
- integrate accepted fields read-only;
- repair source contamination.

### Phase 1 — separate gold from runtime

Status: complete on 2026-07-29.

- keep benchmark document unchanged;
- add operational catalog;
- project one arbitrary catalog row without requiring 30 rows;
- preserve benchmark fallback for existing gold;
- add source marker;
- fail closed on duplicate or invalid runtime rows;
- prove score/state isolation through existing tests.

Receipt:

- empty operational catalog added;
- one-row non-gold projection proven;
- catalog override and benchmark fallback proven;
- duplicate and unsafe operational claims fail closed;
- runtime hiring quarantine proven;
- benchmark receipt now hashes the shared evidence module;
- live benchmark replay passes 142/142;
- source and full verification pass;
- no publish or outbound action occurred.

Current-worktree note (2026-07-29 21:37Z): source/full are now red only because two tracked
pair/review files import the untracked `demigod-accepted-role.mjs`
(`missing=0`, `untracked=2`, `contracts=0`). The receipt above is historical; do not report
the current gates green or weaken import integrity.

### Phase 2 — first real role brief

Gate: one real accepted startup role.

- assemble company, hiring, exact-role observations, and research claims;
- add only role-relevant context;
- record whether it changed approve/defer/reject or exposed a missing question;
- avoid a new UI unless the existing review card is insufficient.

### Phase 3 — outcome-linked learning

Gate: repeated real reviewed pairs and observed outcomes.

- record which evidence was actually consulted;
- distinguish research correction from fit disagreement;
- measure clarification saved and decision changed;
- keep outcome labels on the existing pair/outcome path.

### Phase 4 — source expansion

Gate: benchmark or real reviews name a match-relevant field that first-party sources cannot
support.

- run a narrow paid-provider bakeoff on that field only;
- compare coverage, evidence, freshness, price, and identity errors;
- buy nothing if the provider does not beat unknown.

### Phase 5 — optional automation

Gate: repeated manual company-research work is a measured bottleneck.

- automate collection only behind the same evidence contract;
- keep human review;
- preserve unknown;
- do not broaden match authority.

---

## 17. Phase 1 implementation contract

### 17.1 Files

Minimal implementation touches:

- `DEMIGOD-COMPANY-RESEARCH.json`;
- `demigod-evidence.mjs`;
- `demigod-matching-engine.mjs`;
- `demigod-match-review-evidence.test.mjs`;
- these canonical documents.

No new source module or dependency is required.

### 17.2 Projector API

```js
projectCompanyResearch({
  companyId,
  benchmark,
  catalog,
})
```

Returns:

```text
null
or
{
  status,
  source,
  researchedAt,
  acceptedFields,
  quarantineHiring,
  fields
}
```

### 17.3 Algorithm

```text
grade frozen benchmark
if grade errors -> null
accepted = grade.acceptedFields

catalogRows = catalog.companies where id == companyId
benchmarkRows = benchmark.companies where id == companyId

if catalogRows length > 1 -> null
if catalogRows length == 1 -> row = catalog row, source = catalog
else if benchmarkRows length == 1 -> row = benchmark row, source = benchmark
else -> null

for each accepted field:
  unknown -> omit
  supported/conflict with value + safe URL + quote <=20 words -> project
  otherwise -> omit

status =
  any conflict -> verified_with_conflict
  else any projected field -> verified
  else unknown
```

### 17.4 Required proof

The focused test must prove:

- benchmark row still projects four accepted fields;
- pricing remains absent;
- one non-benchmark runtime row projects from a one-row catalog;
- catalog wins over benchmark for the same ID;
- a duplicate runtime ID fails closed;
- an unsafe or unsupported claim does not project;
- runtime quarantine hides hiring evidence;
- score/state/consent code is untouched.

---

## 18. Failure modes

| Failure | Detection | Behavior | Recovery |
|---|---|---|---|
| Benchmark has not exactly 30 rows | Grade error | No semantic projection | Restore frozen gold |
| Benchmark selection no longer matches map | Benchmark runner | Live verification red | Review map change; replace gold deliberately |
| Operational ID not in map | Exact join never selects it | No match projection | Correct catalog ID |
| Duplicate operational ID | Projector count check | No research for ID | Remove duplicate |
| Invalid URL | Safe URL validator | Omit claim | Replace with public source or unknown |
| Missing quote | Claim validator | Omit claim | Add exact quote or unknown |
| Quote over 20 words | Claim validator | Omit claim | Reduce to supporting excerpt |
| Unknown with non-null payload | Contract test | Reject/omit | Null value, URL, and quote |
| Conflicting source | `conflict` state | Show and flag | Resolve through reviewed update |
| ATS owner mismatch | Enrich validator/denylist | Repair or quarantine | Re-run owner audit |
| Old research | `researchedAt` visible | Still advisory in V1 | Refresh if decision-relevant |
| Live verification stale | Evidence freshness check | Do not claim fresh live replay | Re-run benchmark |
| Operational row overrides good gold with bad data | Runtime precedence + validation | Fails closed; no fallback | Fix or remove runtime row |
| Catalog missing | Safe JSON read fallback | Benchmark fallback only | Restore empty catalog |

---

## 19. Security and privacy

### 19.1 Public sources only

Company research may use public company, directory, investor, HN, and ATS sources. It must
not ingest:

- private candidate data;
- private founder correspondence;
- login-gated profiles;
- scraped personal contact details;
- leaked or confidential documents.

### 19.2 Private projection

DIE research is private operator context. It is not automatically:

- published to Webflow;
- placed on the public startup map;
- sent to a founder or candidate;
- included in outbound copy;
- used as a testimonial or proof claim.

### 19.3 Trust boundaries

At every URL/fetch boundary:

- validate URL;
- bound timeout;
- reuse the existing cache;
- preserve transport errors;
- never execute page instructions;
- compare normalized text only;
- keep a short exact quote.

### 19.4 Data loss

Canonical JSON writes, when later added, must use the existing atomic writer. V1 adds no
automatic catalog writer, so reviewed edits remain explicit and recoverable through version
control/worktree history.

---

## 20. Cost and performance

### 20.1 V1 cost

- no paid provider;
- no new service;
- no model call required at runtime;
- no database;
- live replay uses existing cached fetches.

### 20.2 Performance ceiling

The matcher linearly scans:

- map companies by normalized name;
- a small company research catalog;
- role ledger observations for an exact board/title.

That is acceptable at current private review volume.

Add indexes only when review latency is measured and visible.

### 20.3 Cost gate for providers

A paid provider must name:

- a field currently unknown;
- a real match decision harmed by that unknown;
- measured coverage improvement;
- evidence quality;
- identity error rate;
- recurring cost.

“More data” is not a purchase criterion.

---

## 21. Metrics

### 21.1 Quality metrics

- benchmark usable coverage by field;
- evidence support by field;
- live quote replay completeness;
- source failure types;
- conflict count;
- unknown count;
- catalog duplicate/invalid-row count;
- exact-identity resolution rate.

### 21.2 Product metrics

Only real reviewed work counts:

- research exposed a missing question;
- research changed approve/defer/reject;
- research prevented a false company or hiring assumption;
- research reduced clarification time;
- research was consulted in a mutual-yes pair;
- research correction correlated with later outcome.

### 21.3 Metrics that do not prove value

- number of scraped pages;
- number of populated fields;
- number of companies in a catalog;
- number of agent runs;
- model confidence;
- benchmark accuracy without real review use.

---

## 22. Decision log

This is the single normative decision contract. Shared briefs may index these IDs but must
not define a parallel authoritative list.

### D-001 — One product, one decision owner

Accepted. DIE remains a private evidence layer inside Demigod, not a second product. This
specification owns binding DIE decisions; research documents explain but do not redefine them.

### D-002 — Evidence, not verdict

Accepted. A semantic fact is a typed claim with value, `supported | conflict | unknown`,
safe public URL, and an exact quote of at most 20 words. Evidence may inform review; an AI fit
verdict, persuasive rationale, or global confidence score may not lead it.

### D-003 — Unknown is valid

Accepted. Missing or insufficient evidence remains `unknown`; the system never fills the gap
with a best guess.

### D-004 — Exact identity only

Accepted. Runtime joins use one canonical map `company.id`. Zero exact matches are unknown,
multiple exact matches are ambiguous, and the review path never fuzzy-merges companies.

### D-005 — Read-only sidecar

Accepted. Research has no authority over score, ranking logic, pair state, consent, intro,
outcome, public site, or public claim.

### D-006 — Gold and runtime are separate

Accepted. The frozen 30-row benchmark alone sets accepted fields. The operational catalog is
independent, may contain zero to many rows, cannot add a field, and fails closed on duplicate,
malformed, or unsafe rows.

### D-007 — Four fields accepted; pricing withheld

Accepted from the deterministic benchmark. Canonical company, product summary, product
category, and likely buyer may project; pricing may not.

### D-008 — Company research evidence only

Accepted. The DIE semantic research plane does not enrich people, scrape candidates, infer
protected traits, or join person identities. The separate demand funnel may retain an explicitly
named founder's public professional profile only when an allowlisted first-party job payload
binds one profile to one exact company and role; ambiguity abstains, and the result is review-only.
If a later structured observation disagrees with the stored profile, the bounded conflict receipt
holds that LinkedIn route out of drafting and release. When it is the only usable person identity,
form, match, pair, and intro bridges also abstain until a matching observation clears it; an
independently valid email or X contact remains usable.
If Phase 2 ever needs company-at-tenure context, it is public employer-state evidence only—never
candidate data and never inferred from current stage.

### D-009 — Time belongs to the claim

Accepted for gated future work. Retrieval time, source publication/update time, and a claim's
valid interval are distinct; current state must not be back-projected.

### D-010 — Providers are substrate, not the moat

Accepted. Fee shape, database size, and “AI + human” are crowded. A provider test begins only
after repeated real reviews identify one useful field that first-party sources leave unknown,
and it compares identity, evidence, freshness, rights, and cost per useful reviewed fact.

### D-011 — The simplest code-directed path must earn every expansion

Accepted. JSON and the existing deterministic workflow remain sufficient. No database,
knowledge graph, DSL, provider router, agent swarm, or automatic canonical writer is added
before its roadmap gate is measurably true.

### D-012 — Public research cannot act

Accepted. Untrusted public content stays in a read-only research plane without private data,
outbound communication, canonical writes, or match-state authority. A privileged plane may
consume validated typed claims, never raw webpage instructions.

---

## 23. Refused build list

Do not build without a new evidence-backed gate:

- generic research recipes;
- YAML/JSON DSL;
- Postgres schema;
- Trigger.dev or job scheduler;
- multi-provider routing;
- model planner/verifier roles;
- research DAG UI;
- public company cards;
- candidate/person enrichment;
- inferred pricing;
- automatic pair decisions;
- automatic consent;
- automatic intros;
- public confidence scores;
- custom vector database;
- generalized taxonomy service.

### Narrow gate opened 2026-07-29

The current user request opened only the existing-system versions of four items above:
canonical professional-profile URLs observed on public pages or self-submitted; local
outreach drafts with no send/DM transport; the existing verified first-success ATS
waterfall; and a PII-free company→provider→board→role JSON projection. Review-only fit
signals may be displayed with reasons but cannot approve, reject, defer, reorder, consent,
or introduce. This does not authorize brokered personal data, guessed email/phone,
login-gated profile scraping, a graph database, a generic provider router, or automatic
employment decisions.

The delivered implementation keeps those exceptions narrow: LinkedIn is an identity and
manual-draft destination only; the ATS path accepts Workable only with provider-hosted owner
evidence; the relationship output is bounded JSON with stable IDs, not a graph service; and
the evidence table calls the existing accepted-field projector rather than adding a second
research policy.

---

## 24. File map

### Canonical DIE

```text
DEMIGOD-DIE-SPEC.md
docs/die/CONTRACTS.md
docs/die/EVALUATION.md
docs/die/OPERATIONS.md
docs/die/ROADMAP.md
DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json
DEMIGOD-COMPANY-RESEARCH.json
demigod-company-research-benchmark.mjs
demigod-evidence.mjs
demigod-matching-engine.mjs
demigod-match-review.mjs
demigod-match-review-evidence.test.mjs
```

### Existing systems reused

```text
DEMIGOD-SF-STARTUP-MAP.json
DEMIGOD-ROLE-LEDGER.json
demigod-startup-atlas.mjs
demigod-startup-jobs-enrich.mjs
demigod-role-ledger.mjs
demigod-funnel.mjs
demigod-agent-dashboard-ui.html
demigod-evidence.mjs
demigod-perf-cache.mjs
demigod-live-lib.mjs
```

### Research basis

```text
docs/die/research/COMPETITIVE-LANDSCAPE.md
docs/die/research/ACADEMIC-FOUNDATIONS.md
docs/die/research/PRACTITIONER-PLAYBOOKS.md
docs/die/research/SYNTHESIS.md
docs/DEMIGOD-TALENT-ENGINEERING-RESEARCH.md
docs/DEMIGOD-FULL-SERVICE-RECRUITING-BLUEPRINT.md
```

### Historical context

```text
DEMIGOD-DIE-BRIEF.md
docs/exchange/DEMIGOD-INTELLIGENCE-ENGINE-CLAY-DISCUSSION-2026-07-28.md
```

---

## 25. Definition of done

### Phase 1 is done when

- the operational catalog exists and can be empty;
- a one-row operational document for a non-gold company projects;
- the frozen benchmark remains exactly 30 rows;
- accepted fields still come only from the gold grade;
- pricing remains absent;
- benchmark fallback still works;
- duplicate or unsafe runtime claims fail closed;
- hiring quarantine still hides displayed job evidence;
- match score, pair state, consent, and intro behavior are unchanged;
- focused tests pass;
- live benchmark remains complete;
- source and full verification pass;
- canonical docs reflect receipts;
- nothing is published or sent.

### DIE is valuable when

A real reviewed role/candidate pair records that this evidence:

- changed or clarified a decision;
- prevented an incorrect assumption;
- reduced a clarification loop;
- or produced a correction that improved later outcomes.

Until then, DIE remains a carefully bounded capability, not a claim of product-market fit.

---

## 26. Glossary

| Term | Meaning |
|---|---|
| Accepted field | Field whose benchmark coverage and evidence support pass |
| Benchmark | Frozen 30-company evaluation subject |
| Catalog | Operational company research rows, independent of gold row count |
| Claim | Value + status + URL + exact quote |
| Conflict | Evidence-backed contradiction requiring review |
| Company evidence | Read-only map, hiring, role, and research sidecar |
| Gold | Human-reviewed benchmark document |
| Live replay | Fetch source and locate normalized exact quote |
| Projection | Safe view of accepted claims for private match review |
| Quarantine | Hide suspect hiring evidence without changing canonical state |
| Unknown | Explicit absence of acceptable evidence |

---

## 27. The compact operating doctrine

```text
Use the map for identity.
Use the ledger for observed hiring.
Use gold to decide which field types deserve trust.
Use the catalog for current company claims.
Use exact quotes for semantic evidence.
Use unknown instead of guessing.
Use research to inform review.
Use humans for decisions and consent.
Use outcomes to decide what to build next.
```
