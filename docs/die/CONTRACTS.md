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
