# DIE operations

Local-only operating procedure for the
[Demigod Intelligence Engine](../../DEMIGOD-DIE-SPEC.md).

**Multi-agent atlas (Grok / Claude / Codex):** start with
[`CLAY-DIE-MULTI-AGENT.md`](CLAY-DIE-MULTI-AGENT.md) for exhaustive built/unfinished
enrichment state, commands, and collaboration rules.

## 1. Safe boundary

Allowed by default:

- read map, ledger, benchmark, catalog, and receipts;
- edit local canonical DIE files;
- run local and live verification;
- inspect private match-review output;
- prepare source-cited research rows.

Not authorized by this runbook:

- Webflow publish;
- outbound email, DM, post, form, or application;
- money movement;
- public research claims;
- game work;
- automatic match or intro decisions.

## 2. Orient

```bash
bin/dg orient
bin/dg truth
node demigod-evidence.mjs fresh company-research-benchmark
node demigod-accepted-role.mjs status
```

Trust receipts over copied status prose.

`demigod-accepted-role.mjs` is a pure read of “accepted for delivery” board roles
(featured startup-hire inbox provenance). Live boards with only seeds report
`acceptedForDelivery=0` and `phase2Ready=false`. Do not treat this helper as
permission to open Phase 2 product work or annotate match-review until a real
role exists and the current Codex/Grok receipt contract still PASSes.

## 3. Inspect current policy

```bash
node demigod-company-research-benchmark.mjs --offline
```

Offline mode checks structure and accepted fields. It does not prove live source freshness.

## 4. Research one company

### Resolve identity

Use the exact map company ID. Confirm:

- company name;
- website;
- source and source URL;
- ATS source/jobs URL if present;
- no duplicate normalized name.

### Collect claims

For each field:

1. use the smallest suitable first-party page;
2. state a compact value;
3. capture a supporting quote of at most 20 words;
4. record the public URL;
5. use `unknown` when support is absent;
6. use `conflict` when a relevant source contradicts another.

### Add to operational catalog

Edit `DEMIGOD-COMPANY-RESEARCH.json`.

Do not add operational rows to the benchmark.

## 5. Focused check

```bash
node --test demigod-match-review-evidence.test.mjs
node demigod-company-research-benchmark.mjs --selftest
```

The projection test must show:

- operational source wins when present;
- benchmark fallback remains;
- pricing remains withheld;
- invalid operational claims fail closed.

## 6. Live replay

The frozen benchmark:

```bash
node demigod-company-research-benchmark.mjs
node demigod-evidence.mjs fresh company-research-benchmark
```

Operational catalog rows are not covered by the 30-row receipt. Do not call an operational
row live-benchmark-verified unless a future catalog verifier explicitly checks it.

## 7. Integration checks

```bash
npm run demigod:verify:source
npm run demigod:verify:all
```

`verify:all` is proportionate after a multi-surface change. Use focused checks while editing.

## 8. Inspect product projection

The private path is:

```text
matching engine
  -> match-review queue
  -> candidate ranking
  -> funnel evidence receipt
  -> operator dashboard
```

Confirm that:

- research appears only for exact company identity;
- source is `catalog` or `benchmark`;
- conflicts are flagged;
- quarantine hides hiring display;
- score, rank ordering, pair state, and consent remain unchanged.

## 9. Common failures

### Research disappears for every company

Likely benchmark structural or selection failure.

```bash
node demigod-company-research-benchmark.mjs --offline
```

Repair gold or map selection deliberately. Do not bypass the grade.

### One company has no research

Check:

- exact map ID;
- duplicate catalog rows;
- claim statuses;
- safe URLs;
- non-empty quotes;
- accepted field policy.

### Hiring evidence is hidden

Check `quarantineHiring` and provider deny rules. Hidden hiring is fail-closed behavior.

### Live receipt is stale

Run the live benchmark. Do not rewrite receipt files manually.

### Operational row is wrong

Correct or remove the operational row. An invalid operational override intentionally does
not fall back silently to benchmark gold.

## 10. Recovery

No destructive repair command is required.

- JSON is inspectable;
- canonical writes remain explicit;
- benchmark and catalog are separate;
- receipts live under `/tmp/dg-busy`;
- full verification reconstructs current truth.

## 11. Tool dogfood

Wrap meaningful CLI jobs:

```bash
node demigod-tool-dogfood.mjs wrap --tool=company-research-benchmark -- \
  node demigod-company-research-benchmark.mjs
```

Log usefulness after the cycle.

