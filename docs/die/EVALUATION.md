# DIE evaluation

Normative evaluation plan for the
[Demigod Intelligence Engine](../../DEMIGOD-DIE-SPEC.md).

## 1. Purpose

The benchmark decides whether a field type is trustworthy enough to show in private match
review. It does not measure placement quality and it is not an operational database.

## 2. Subject

Thirty companies are deterministically selected from the startup map:

| Source | ATS | Count |
|---|---:|---:|
| YC | yes | 5 |
| YC | no | 5 |
| Wikidata | yes | 5 |
| Wikidata | no | 5 |
| HN | yes | 5 |
| HN | no | 5 |

Eligibility requires:

- supported source family;
- safe public company website;
- unique normalized company name.

Selection order is hash-stable from:

```text
seed + company.id
```

## 3. Field grading

For each field:

```text
claims = supported + conflict
usableCoverage = claims / 30
evidenceSupport = evidenced / claims
```

Pass:

```text
usableCoverage >= 0.90
evidenceSupport >= 0.95
```

Conflict counts as usable only when it has valid evidence and remains visibly flagged.

Unknown never counts as usable.

## 4. Structural errors

The grade is invalid when:

- company count is not 30;
- IDs are duplicated;
- a field is missing or has an unknown status;
- unknown carries a value, URL, or quote;
- non-unknown lacks a value;
- URL is unsafe;
- quote is missing;
- quote exceeds 20 words.

One structural error fails the benchmark policy and therefore disables semantic projection.

## 5. Live quote replay

For every non-unknown claim:

1. validate URL;
2. fetch through the existing bounded cache;
3. normalize visible text and response text;
4. look for the exact normalized quote;
5. use the existing Firecrawl fallback only when direct text is insufficient;
6. record transport, status, hash, and error;
7. keep every claim result.
8. update the private claim-history snapshot keyed by row, field, URL, and normalized quote hash:
   verified, cleanly absent, or transport failure. Only a 2xx check with no direct or fallback
   error starts `stoppedMatchingAt`.

## 6. Non-vacuous verification

Live verification passes only when:

```text
verifyLive == true
expectedClaims > 0
sourceChecks.length == expectedClaims
every sourceCheck.ok == true
grade.errors.length == 0
selectionMatches == true
```

The sealed input scope includes:

- startup map;
- benchmark JSON;
- benchmark runner;
- shared evidence/grading module.

Changing grading or projection policy therefore makes the receipt stale.

Offline grading:

- writes `company-research-benchmark-offline.json`;
- does not seal evidence;
- does not overwrite the latest live receipt;
- reports `verificationPass: false`.

## 7. Current decision

| Field | Decision |
|---|---|
| `canonicalCompany` | accepted |
| `productSummary` | accepted |
| `productCategory` | accepted |
| `likelyBuyer` | accepted |
| `pricingStatus` | withheld |

The current live subject contains 142 non-unknown claims. Mutable results belong in:

```text
/tmp/dg-busy/company-research-benchmark.json
/tmp/dg-busy/evidence/latest-company-research-benchmark.json
```

Do not copy a receipt run ID into canonical docs.

## 8. Poison controls

The smallest fail-capable checks must prove:

- unsafe URL rejects;
- credentialed URL rejects;
- unknown with evidence errors;
- quote over 20 words errors;
- conflict with valid evidence counts supported;
- offline cannot verify;
- empty checks cannot verify;
- partial checks cannot verify;
- exact complete live checks can verify;
- successful absence records decay while a transport failure preserves the prior claim
  state;
- catalog row count does not affect benchmark grade;
- one-row operational projection works without grading that row as a benchmark.

## 9. Regression matrix

| Change | Focused check |
|---|---|
| Claim validation/projector | `node --test demigod-match-review-evidence.test.mjs` |
| Benchmark selection or replay | `node demigod-company-research-benchmark.mjs --selftest` |
| Benchmark data | Run offline, then live |
| Matcher evidence | Match-review evidence test + matching readiness |
| ATS owner rules | Startup-jobs-enrich and role-ledger selftests |
| Source integration | `npm run demigod:verify:source` |
| Whole Demigod integration | `npm run demigod:verify:all` |

## 10. Evaluation changes

Do not change thresholds or benchmark membership merely to make a field pass.

A benchmark replacement requires:

- a documented source/map reason;
- preservation of the six strata;
- a new complete live replay;
- a review of accepted fields;
- update of the decision record.

## 11. What this benchmark does not prove

It does not prove:

- automatic research extraction accuracy;
- real match improvement;
- faster mutual consent;
- higher interview or hire rate;
- correct person identity;
- pricing value;
- provider value.

Those require real operational evidence.
