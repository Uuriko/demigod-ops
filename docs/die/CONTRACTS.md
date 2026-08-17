# DIE contracts

Normative data and function contracts for the
[Demigod Intelligence Engine](../../DEMIGOD-DIE-SPEC.md).

If this file and code disagree, the failing executable check wins until the discrepancy is
reviewed. Do not loosen a trust boundary to make a fixture pass.

## 1. Company identity

```text
companyId := exact `company.id` from DEMIGOD-SF-STARTUP-MAP.json
```

Rules:

- display names are never keys;
- match-time name resolution is exact after the existing normalizer;
- zero matches returns `unknown`;
- multiple matches returns `ambiguous`;
- no fuzzy merge;
- no ATS-board-name ownership assumption;
- no company research row may create or rewrite a map identity.

## 2. Benchmark document

Path: `DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json`

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

Invariants:

- exactly 30 unique company IDs;
- five companies in each source × ATS-presence stratum;
- IDs/order equal the deterministic selector;
- every row has a `fields` object;
- field statuses are `supported`, `conflict`, or `unknown`;
- non-unknown claims have value, public URL, and quote;
- unknown claims have null value, URL, and quote.

The benchmark is evaluation gold, not the operational write target.

## 3. Operational catalog

Path: `DEMIGOD-COMPANY-RESEARCH.json`

```json
{
  "version": 1,
  "researchedAt": null,
  "companies": []
}
```

Rules:

- `companies` may contain zero to many rows;
- every row ID must be a map company ID;
- duplicate IDs fail closed for that company;
- row-level `researchedAt` overrides root-level `researchedAt`;
- catalog rows may override benchmark rows for private projection;
- catalog rows do not affect benchmark grading or accepted fields;
- no automatic writer exists in Phase 1.

## 4. Company row

```json
{
  "id": "yc:example",
  "researchedAt": "2026-07-29",
  "fields": {},
  "quarantineHiring": false
}
```

| Key | Type | Required | Rule |
|---|---|---:|---|
| `id` | string | yes | Exact map company ID |
| `researchedAt` | string/null | no | ISO date or timestamp; advisory in V1 |
| `fields` | object | yes | Claims keyed by frozen field name |
| `quarantineHiring` | boolean | no | Only literal `true` activates quarantine |

Unknown extra keys are ignored by the projector. Do not use them as hidden decision inputs.

## 5. Claim

### Supported or conflict

```json
{
  "value": "human-readable value",
  "status": "supported",
  "url": "https://example.com/",
  "quote": "Exact source text."
}
```

Required:

- non-empty value;
- `supported` or `conflict`;
- safe public HTTP(S) URL;
- non-empty exact quote;
- at most 20 whitespace-delimited words.

### Unknown

```json
{
  "value": null,
  "status": "unknown",
  "url": null,
  "quote": null
}
```

Unknown with a value or evidence payload is malformed.

## 6. Frozen fields

| Field | Value contract | Preferred evidence | Unknown allowed | Runtime authority |
|---|---|---|---:|---|
| `canonicalCompany` | Current public company/legal name | Official site/about/legal footer | yes | Review context only |
| `productSummary` | One concise factual sentence | Official homepage/product page | yes | Review context only |
| `productCategory` | Compact controlled category | Official positioning/product page | yes | Review context only |
| `likelyBuyer` | Named buyer/user group supported by source | Official customer/use-case page | yes | Review context only |
| `pricingStatus` | Public pricing availability or buying motion | Official pricing/buy/demo page | yes | Withheld until benchmark accepts |

All fields have:

```text
score authority = none
pair-state authority = none
consent authority = none
intro authority = none
public-claim authority = none
```

## 7. Accepted-field policy

```text
acceptedFields := gradeResearchBenchmark(benchmark).acceptedFields
```

The operational catalog cannot add an accepted field.

Current accepted fields:

```text
canonicalCompany
productSummary
productCategory
likelyBuyer
```

Current withheld field:

```text
pricingStatus
```

## 8. Projector

```js
projectCompanyResearch({
  companyId,
  benchmark,
  catalog,
})
```

Selection:

```text
if benchmark grade invalid -> null
if >1 catalog rows for id -> null
if exactly 1 catalog row -> use catalog
else if exactly 1 benchmark row -> use benchmark
else -> null
```

Projection:

- only accepted fields;
- unknown omitted;
- malformed non-unknown claim omitted;
- conflict preserved;
- `source` is `catalog` or `benchmark`;
- `researchedAt` is row then selected document date;
- quarantine only on literal `true`.

Return:

```json
{
  "status": "verified",
  "source": "catalog",
  "researchedAt": "2026-07-29",
  "acceptedFields": [
    "canonicalCompany",
    "productSummary",
    "productCategory",
    "likelyBuyer"
  ],
  "quarantineHiring": false,
  "fields": {}
}
```

Status:

- any projected conflict → `verified_with_conflict`;
- any projected field → `verified`;
- otherwise → `unknown`.

## 9. Company evidence resolver

```js
resolveCompanyEvidence(role, map, ledger, today, benchmark, catalog)
```

It may return:

- `unknown`;
- `ambiguous`;
- `matched`.

For `matched`, it may include:

- company and provenance;
- current public hiring snapshot;
- exact role observations;
- research projection;
- review flags.

It must not mutate any input or canonical store.

## 10. Hiring quarantine

When projected research sets `quarantineHiring: true`:

```text
hiring.status = quarantined
hiring.openRoles = null
hiring.atsSource = null
hiring.jobsUrl = null
hiring.roleMix = null
hiring.observedAt = null
roleObservations = []
reviewFlags includes public_hiring_quarantined
```

## 11. Safe URL

Accepted:

- `http:`;
- `https:`;
- public hostname;
- no credentials.

Rejected:

- localhost and `.localhost`;
- `.local`;
- loopback;
- private IPv4 ranges;
- link-local;
- IPv6 loopback, unique-local, and link-local;
- missing host;
- embedded username/password;
- non-HTTP protocol.

## 12. Research projection entry point

`projectCompanyResearch` is the only entry point. A `companyResearchEvidence` wrapper existed
alongside it with no live caller and no test exercising it; it was deleted rather than
deprecated, since an unused, unexercised export is a second contract nobody is verifying.

## 13. Company packet

`buildCompanyPacket({ companyId, ...inputs })` returns `demigod.company-packet/1` from an exact map
ID. An absent ID returns `status: "unknown"`; duplicate IDs throw and never select a winner.

The packet may contain identity, hiring, accepted research, evidence, unknowns, role journal,
signals, and peers. It contains no people/contact fields and grants no score, match, consent,
intro, writeback, or public-claim authority.

## 14. Company table

`listCompanyRows(inputs, { limit })` returns `demigod.company-table/1` in map order. Every row is a
projection of the corresponding company packet. Duplicate IDs and vanished map IDs fail closed.

The HTTP table binds only to `127.0.0.1`, accepts read-only `GET`, and exposes no people/contact
fields or score. A successful loopback selftest requires an environment that permits local binds.

## 15. Company waterfall

`runCompanyWaterfall` returns `demigod.company-waterfall/1` and evaluates sources in this order:

```text
first_party -> yc -> wikidata -> ats_json -> unknown
```

The first confident value wins per field. Empty or uncertain later values cannot overwrite verified
evidence. Every fill retains its public source URL and retrieval time. The supported path is always
dry-run and never writes the map.

## 16. Private memo

`renderCompanyMemo(packet)` returns `demigod.company-memo/1`. The memo is private, bounded,
citation-preserving, and explicitly not a recommendation. Contact-shaped data, scores, and unsafe
links are omitted. `--out` may write only the rendered local memo requested by the operator.

## 17. Writeback preview

`buildWritebackPlan(packets)` returns `demigod.packet-writeback/1` with `mode: "dry-run"`.
Evidence sidecars are private read-only context; rows reuse the existing RecruitAI import shape.
There is no apply command and no database, score, consent, match, intro, or external-write authority.

## 18. Supported command surface

`demigod-company-intelligence.mjs` is the supported dispatcher for `list`, `get`, `enrich`, `memo`,
and `writeback`. It delegates to the contracts above rather than reimplementing them. `enrich`
forces `--dry-run`; `--write`, `--apply`, and `--apply-map` fail before dispatch.

## 19. Decision rehearsal on review notes

`demigod.review-note/1` may contain an optional private `rehearsal` object with bounded
`initialView`, `contraryEvidence`, `changeCondition`, `finalRationale`, and up to 50
`consultedEvidence` IDs. Historical notes without it remain valid and project `missing`; partial
rehearsals project `incomplete`. It is human-authored context, not a recommendation or score.

## 20. Role Mission

`composeRoleMission(workspace, notes)` returns `demigod.role-mission/1` as a pure projection over
the existing `demigod.role-workspace/1` and review notes. It contains:

- `case`: common operating picture, unresolved state, waiting-on, next safe internal action, and
  closure conditions;
- `evidenceBill`: provenance/impact manifest;
- `decisionTrace`: human review and optional rehearsal history;
- `views.private`: the existing private workspace;
- `views.mutual`: a strict allowlist projection;
- `constitution`: current hard-coded human/consent/intro/action authority.

It creates no mission store and grants no external action.

## 21. Evidence bill

`buildEvidenceBill(workspace)` returns `demigod.evidence-bill/1`. Components name their kind,
state, source, producing activity, trust zone, upstream dependencies, and affected mission question.
The first implementation derives components from accepted-role, role-packet, company-packet,
evidence-review, relationship, and conversation projections. It is an array, not a graph database.

## 22. Mutual projection

`projectMutualMission(workspace)` returns `demigod.role-mission-mutual/1` from an explicit allowlist:
role outcome/criteria/public-post compensation/interview plan, public-safe company identity, shared
questions, process state, and consent/introduction requirements. Founder-only deal-breakers and
non-public compensation are named as withheld until separately reviewed for sharing. Candidate IDs, ratings, evidence text,
reviewers, suppression, relationship paths, private notes, and action authority are absent.

## 23. Mission scenario

`compareMissionScenario(workspace, changes)` returns `demigod.role-mission-scenario/1`. Only title,
90-day outcome, must-haves, deal-breakers, compensation band, and interview plan may change. The
result lists affected requirements, questions, filters, plan, offer context, and role-truth status.
It is immutable, `committable: false`, has `predictedOutcome: null`, and grants no external action.
Unknown fields, empty changes, wrong array shapes, and no-op changes fail closed.

## 24. Candidate evidence assertion

`demigod.candidate-evidence/1` is one immutable, private assertion for one candidate, accepted role,
and founder-authored must-have. It records the criterion label snapshot, bounded claim, exact source
span, content hash, observation/source-update clocks, operational use purpose/basis, policy version,
retention deadline, and optional predecessor. Supported source types are `candidate_submitted` and
`public_work`; public work requires a safe public URL. The operational use basis is metadata, not a
legal conclusion. Newly appended assertions also carry `review.state: approved`, reviewer ID,
approval time, and the exact preview hash. Legacy fixture/corpus assertions without review metadata
remain readable; the workbench writer never creates one.

## 25. Candidate evidence correction and withdrawal

A correction is a new candidate-evidence assertion with `supersedes`; it never overwrites the old
assertion. The predecessor must exist and have the same candidate, role, and must-have, correction
time must advance, forks/cycles fail closed, and historical projections ignore future corrections.

`demigod.candidate-evidence-withdrawal/1` is an append-only stop event naming exact evidence IDs.
The targets must exist in the same candidate/role scope. Once effective, raw claim and source-span
content are withheld. Expiry has the same raw-content boundary. This is application suppression,
not a claim that physical/legal erasure has occurred.

## 26. Candidate evidence projection

`projectCandidateEvidence({ roleId, packet, corpus, at })` returns
`demigod.candidate-evidence-projection/1`. It preserves `active`, `conflict`, `stale`, `corrected`,
`withdrawn`, `expired`, and `future` states. Criterion drift is checked by must-have ID plus the
captured label, so changing one criterion does not stale unrelated evidence. It returns
`globalScore: null`, human-only employment authority, and no external action.

The optional private store is `DEMIGOD-CANDIDATE-EVIDENCE.json` with schema
`demigod.candidate-evidence-corpus/1`. An absent store is an empty valid corpus; malformed input is
reported and contributes no evidence.

## 27. Review-note evidence references

Each `demigod.review-note/1` rating may contain up to 20 bounded `evidenceIds`. Legacy prose-only
notes remain valid. A missing, cross-candidate, cross-criterion, corrected, withdrawn, expired,
conflicting, or stale citation cannot silently become an answered question. Candidate evidence is
included only in Role Mission's private workspace and evidence bill; the mutual projection excludes
candidate IDs, claims, spans, ratings, and reviewer text.

## 28. Candidate evidence workbench

`previewCandidateEvidence({ input, packet, corpus, at })` returns
`demigod.candidate-evidence-preview/1`. It requires one current role criterion, human-authored claim,
source type, artifact text, and an exact source span contained in that artifact. It hashes the full
artifact with SHA-256, derives provenance/use fields and a 90-day retention deadline, but retains
only the bounded span. It is pure, `committable: false`, and grants no action authority.

`approveCandidateEvidence(...)` binds a human reviewer to the exact preview hash, reloads and
revalidates the latest corpus under one file lock, and atomically appends with mode `0600`.
Duplicate, changed, expired, criterion-drifted, cross-candidate-source, or invalid correction
previews fail closed. `rejectCandidateEvidence(...)` returns a bounded content-free receipt and
appends nothing.

`withdrawCandidateEvidence(...)` appends one human-authored stop event under the same lock. Missing,
cross-scope, already corrected, already withdrawn, expired, or future targets fail closed. The
structured-hiring `at` projection uses approval time as the assertion's effective time, so a view
before approval/correction/withdrawal preserves the earlier history.

The private same-origin dashboard routes are:

```text
POST /api/candidate-evidence/preview
POST /api/candidate-evidence/approve
POST /api/candidate-evidence/reject
POST /api/candidate-evidence/withdraw
```

They inherit the dashboard's exact loopback Host and Origin/Referer mutation policy. The workbench
does not fetch URLs, generate claims, score, rank, decide, contact, consent, introduce, publish, or
write to an external system.

## 29. Role Mission OS kernel

`openRoleMission({ packet, owner })` returns `demigod.role-mission-os/1`. This is the writable hire:
ATS applications, calendar slots, and CRM touches/pairs on one object. It is distinct from
`composeRoleMission()`, which remains the read-only workspace projection (`demigod.role-mission/1`).

The kernel owns:

- **ATS** — apply, forward-only stages (`applied` → `screen` → `interview` → `offer` → `hired`),
  evidence-required scorecards via existing review notes, independent drafts hidden until submit,
  and close (`filled` requires a hire);
- **Calendar** — hold, book, reschedule, no-show, release. One active slot per candidate. Overlapping
  interviewer load fails closed. No invite is sent;
- **CRM** — owned touches, sticky opt-out, remembered pair receipts, a derived next action, and
  an optional `demigod.mission-company/1` observation record (`attachCompany` / `detachCompany`);
- **Conversation memory** — `attachCallNote()` on a booked slot reuses `demigod.call-note/1`.
  Human summary, no score, no auto pair change, no invite, no disk store. Surfaces omit transcripts.
  Call notes do not change the next-action kind;
- **Debrief** — `recordDebrief()` on a booked slot joins `debriefRoundup()` to the interview plan.
  Coverage, disagreement, and remaining unknowns are per criterion; `score` is null;
- **Offer terms** — `recordOfferTerms()` is a human-authored record. `sent`/`signed` stay false.
  `sendOffer()` / `signOffer()` and send/sign flags fail closed;
- **Comp context** — `projectCompContext()` shows the packet band only after interview/offer/hire.
  `rank` and `score` stay null. Absence of a band is null, not a guess;
- **Next mission** — `openNextMission()` after an observed outcome copies keep/avoid learning onto
  an empty pipeline. `predicted` stays null.

It creates no store, HTTP route, consent, intro, employment decision, or external action. Demo
packets, contact-shaped IDs, and opted-out advances other than `withdrawn` fail closed.
`recordOutcome()` is allowed only after `filled` or `closed`; `predicted` stays null.
`projectSurfaces()` includes an activity list shaped by `demigod.die-activity-list/1`.
Debrief before a booked slot, next-mission without an observed outcome, and offer send/sign fail
closed.

`attachCompany(mission, record)` validates `demigod.mission-company/1` and stores it on
`crm.company`. A missing company is valid. Observation never changes `closeState` or the next-action
kind. `projectSurfaces().crm.company.presentation` and `projectNextAction().observation` say whether
a count is current. `null` openRoles is unknown, never zero. Zero requires `lastAttempt=ok` and
status other than `board_stale`. Quarantine requires a null count and does not pause the mission.
`observedLifetimeUsable` must be false. The kernel does not read the map.
`toMissionCompany(packet)` is a pure projector from `demigod.company-packet/1`. It copies
`lastAttempt` when present and never invents `ok`. A live `0` without `lastAttempt=ok` becomes
`null` (unknown), not an empty board.

`hiringStatusOf(company, { quarantined, openRoles })` is the one status ladder, read by both
`demigod.company-packet/1` and the matching engine so the two surfaces cannot drift. `board_observed`
requires a date **and** a count: `openRolesAt` alone is a stamp, not an observation, and a YC
directory link that carried one read as a watched board with no roles until 2026-08-17. Zero is a
count, so a board read and found empty stays observed. The caller's projected count wins, because
the packet counts open roles from the role ledger rather than the map row.

```text
demigod.mission-company/1
  null-openRoles          = unknown, never zero
  zero-openRoles          = read ok and empty, requires lastAttempt=ok and status!=board_stale
  quarantined             => openRoles null
  carry                   => original openRolesAt, never restamped
  observedLifetimeUsable  = false
  next-action             => never blocked by observation
  board-observed          => requires openRolesAt AND an integer count, never a date alone
```

## 30. Board pay visibility

Pay is evidence about a posting, and the reader's blindness is part of that evidence. A board we
cannot read pay from and a company that declines to state pay are different facts, and a projection
that collapses them manufactures a company property out of an ATS limitation.

`rolePayVisibility(job, ats)` returns exactly one of three states. `unsupported` means the provider
cannot express pay to us at all and supports no inference about the company. `withheld` requires a
pay-capable reader that found neither a displayed tier nor a range stated in the posting body.
`published` requires a quote that is an exact substring of what the board published.

A displayed tier counts only when `shouldDisplayCompensationOnJobPostings` is also true: the flag
alone can be set with nothing behind it, and a tier string alone can survive a tier the company has
since stopped displaying, so a stale string never republishes pay that was taken down. Because
21.2% of non-opted-in roles state their range in the description instead, `withheld` is reached only
after that body text is checked. Numeric `min`/`max` are never returned — numeric keys are how a
"sort by pay" grows, and such a sort would imply a completeness this data does not have.

Escaped markup is decoded before extraction, never after. A band written `$76,000 &mdash; $114,000`
whose entity survives into the matcher truncates to `$76,000`, publishing the floor of a band as
though it were the pay. A stated range in a currency the shared extractor cannot parse is still a
stated range: presence is detected independently of parsing, the quote is carried verbatim, and
`currency` records that it is unparsed. A range we cannot read is never a company stating nothing.

Measured 2026-08-17 over all 471 mapped boards: 358 published, 69 withheld, 44 unsupported, 0
unread. Ashby carries structured pay behind `?includeCompensation=true`; Greenhouse carries none but
states a range in the `?content=true` body on 111 of its 122 boards; Lever's postings API carries no
pay in any form, and its 44 boards are the only structurally silent ones. Any share, ranking or
comparison runs over `comparablePayCompanies()` only — before Greenhouse was read, the naive
denominator reported 52.4% against an honest 81.0%, a 28.5-point penalty applied to companies for
their vendor's API. A failed fetch is `unread`, never `withheld`.

```text
demigod.board-pay/1
  unsupported     = reader cannot carry pay, no company inference
  unread          = our fetch failed, never a company choice
  withheld        = pay-capable read, no tier and no range in body
  published       = exact quote, structured tier or description
  stale-tier      => flag off suppresses the string
  entities        => decode before extraction, a band never truncates to its floor
  unparsed-currency => a stated range in any currency is published, never withheld
  comparison      => comparable denominator only, never all boards
```
