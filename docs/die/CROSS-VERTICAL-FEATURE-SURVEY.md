# Cross-vertical feature survey — what other startups solved that we have versions of

**Status:** options for potter, not a plan of record. No strategy claims, no promises.
**Method:** picked verticals whose *core technical problem* matches one we already have, then
checked our code for whether the analogue exists. Findings marked **GAP** were verified against
the source on 2026-07-30, not assumed.
**Constraint:** everything here respects `CLAY-DIE-MULTI-AGENT.md` §5.5 non-goals — nothing below
requires brokered people data, a recipe DSL, a graph platform, or inferred pricing.

---

## 1. Bitemporal / versioned data — XTDB, Dolt, LakeFS

**What they solved:** two independent time axes. *Valid time* (when a fact was true in the world)
vs *system time* (when we recorded it). XTDB implements the SQL:2011 bitemporal spec and supports
"as-of" queries on both axes; Dolt is Git-for-SQL; LakeFS versions whole data-lake states.

**We already half-built this.** The role ledger holds `nativePostedAt` (valid time — what the
board claims) separately from `firstSeen`/`lastSeen` (system time — when we observed it), and the
spec is explicit that observed-age ≠ board date. That separation *is* bitemporality.

| Feature to consider | Notes |
|---|---|
| 1. **As-of reconstruction** — "what did the directory claim on 2026-07-12?" | We keep monotonic history but cannot replay a past state. This is what would settle the parked decay mechanisms |
| 2. Branch/diff a ledger before accepting a poll | LakeFS-style staging: compute the diff, review, then merge |
| 3. Retention/compaction policy with an audit trail | `pruneClosed` exists; a formal policy does not |
| 4. Bitemporal correction (fix a past fact without erasing it) | Today a re-source mints a new claim id and orphans the old — deliberate, but not a *correction* primitive |

## 2. Data observability — Monte Carlo, Great Expectations, Soda, dbt tests, Elementary

**What they solved:** the four pillars — **freshness, volume, schema, distribution** — monitored
continuously, rather than only asserted at pipeline runtime. Their core insight is that *tests
validate what you predicted; observability catches what you didn't.*

| Pillar | Our status |
|---|---|
| Freshness | **Strong.** Evidence seals, TTL, `refuseIfStale`, input-hash drift detection |
| Schema | **Strong.** Strict ledger loader, exact key allowlist, export validation |
| Volume | ⚠ **GAP — verified** |
| Distribution | **Absent** |

> **GAP 5 — mass-closure on a valid-but-truncated board.** `demigod-role-ledger.mjs` treats a fetch
> as unusable only when the payload is *malformed* (`!Array.isArray(d.jobs) → ok:false`, closes
> nothing). A board that returns a **well-formed but truncated** array — pagination bug, rate-limit,
> provider incident — is accepted, and 400 open roles can become 3, closing 397. Closure is a
> public claim ("no longer open") that feeds `closedToday`, aging badges, and the directory.
> Existing bounds (2,000-role cap, duplicate-ID invalidation) don't catch it because they're
> absolute, not relative.
> **Suggested shape:** don't reject — *quarantine*. Require a large relative drop to repeat across
> N polls before mass closure lands, and surface the held-back closures for review. Matches the
> house rule: abstain rather than fabricate.

| Feature to consider | Notes |
|---|---|
| 6. Per-board volume anomaly quarantine | GAP 5 above — highest value item in this document |
| 7. Distribution drift on role mix | A board flipping 80% engineering → 80% sales is a signal or a parse bug; today, neither is noticed |
| 8. A freshness SLA per source, published | Coresignal publishes quality metrics; ours are internal |
| 9. "Data downtime" receipt | We have per-run receipts; no notion of cumulative degraded time |

## 3. Supply-chain provenance — Sigstore, SLSA, in-toto, Rekor

**What they solved:** making a claim about an artifact independently verifiable. in-toto's ITE-6
envelope is a clean triple — **statement type / subject (the artifact) / predicate (the claim)**.
SLSA provenance records builder identity, inputs, and output digest. Rekor is an **append-only
transparency log** so a receipt cannot be quietly rewritten.

**We already do most of this by hand:** `beginRun` / `addArtifact` / `sealRun`, scope hashing,
input-hash drift, and commit hashes binding the export's JSON+CSV.

| Feature to consider | Notes |
|---|---|
| 10. Adopt an in-toto-shaped envelope for seals | Names what we improvised; makes receipts portable and reviewable |
| 11. **Append-only, hash-chained receipt log** | Today `company-research-source-history.json` is a mutable file. A chained log makes "green" unforgeable by rewrite — the exact threat the spec worries about |
| 12. Record builder identity + code digest in the seal | Partly present (module paths in scope); not a digest of the *runner* |
| 13. Verify-then-parse ordering | **Verified, and narrower than it first looks.** `loadRecruitaiExport` runs `JSON.parse(buffers['latest.json'])` *before* the sha256 comparison. The parsed object is not trusted early — the hash check sits in the same guard and gates the return — so the exposure is only that untrusted bytes are parsed at all, plus a worse diagnostic (a tampered file fails with a parse error, not a hash mismatch: attack A did exactly that). Contract text says verify then parse; cheap to align |

## 4. Entity resolution — Splink, Zingg, Senzing, Tilores, OpenCorporates

**What they solved:** deciding when two records are the same organisation despite different
spellings, domains, and sources. Splink/Zingg are open-source and probabilistic (Fellegi-Sunter);
Senzing ships pre-mapped public registries.

**Directly our problem:** company identity across YC, Wikidata, HN, and seven ATS slug namespaces.
Note the house rule forbids **fuzzy company merges**, so the transferable part is *explainability
and abstention*, not ML auto-merge.

| Feature to consider | Notes |
|---|---|
| 14. Candidate-pair scoring with **per-feature evidence** | Show *why* two rows might be one company (domain, normalised name, board owner), never auto-merge |
| 15. A human review queue for ambiguous pairs | Mirrors the existing match-review pattern |
| 16. Blocking keys to make pair generation cheap | Standard ER technique; ours is domain-label + alias today |
| 17. Import a public registry as a resolution anchor | Senzing's CORD idea; only public registries |
| 18. Identity-decision receipts | Every merge/split decision gets a reason and a reviewer |

## 5. Change detection — changedetection.io, Visualping

**What they solved:** watching a page and alerting on *meaningful* change. Key features:
**CSS/xPath scoping**, **ignore-text filters**, visual/text diff, and check frequency per target.

**We hit exactly the problem they solve.** Measured here 2026-07-29: *24 of 48 pages changed
`sha256` in four hours while all 142 quotes still matched* — body hash tracks CSRF tokens, render
timestamps, analytics nonces. The response was to add `textSha256` over visible text, which is the
right instinct; scoping/ignore-filters are the mature version.

| Feature to consider | Notes |
|---|---|
| 19. Per-source CSS/xPath scoping for evidence | Hash only the region the quote lives in |
| 20. Ignore-filters for known-noisy substrings | Kills the remaining churn |
| 21. Store a rendered text diff on change | Today we know *that* it moved, not *what* moved |
| 22. Per-source check frequency | Uniform cadence today; noisy pages deserve different treatment |

## 6. Durable execution — Temporal

**What they solved:** long multi-step processes that survive crashes, via an **event-sourced
history**, deterministic replay, idempotent activities, and typed retry policies.

**Partly present:** the import boundary is byte-idempotent, the export publishes atomically under a
lock, and I added a bounded transport retry today.

| Feature to consider | Notes |
|---|---|
| 23. Run-level event log so `directory-refresh` can **resume** | It's a long network pipeline that currently restarts from zero |
| 24. Explicit retry policy per activity class | Transport vs parse vs policy failures deserve different handling |
| 25. Idempotency tokens on every durable write | Exists for import; not a general primitive |
| 26. Separate "workflow" (deterministic) from "activity" (side-effecting) | Would make the pipeline testable without network |

## 7. Claim-level citation — Perplexity, Elicit, Consensus, Semantic Scholar

**What they solved:** attaching a source *span* to each claim, with click-through to the exact
passage. The market is standardising on this (already noted in INNOVATION §1.3).

| Feature to consider | Notes |
|---|---|
| 27. **Character offsets** for each accepted quote | We store the quote and URL; not where it sits |
| 28. Highlight-on-open review surface | Reviewer lands on the passage, not the page |
| 29. Quote-drift detection separate from page-drift | We conflate them today |
| 30. "Unknown" and "conflict" as first-class UI states | Already first-class in data; not in any surface |

## 8. Search & retrieval — Algolia, Typesense, Meilisearch

| Feature to consider | Notes |
|---|---|
| 31. Typo-tolerant company search over the directory | 2,737 companies with no search |
| 32. Faceted filters (function, aging bucket, provider, location) | Backlog #34 |
| 33. Synonym dictionary for role titles | Would improve `categorizeRole` without touching the public taxonomy claim |
| 34. Saved-search + alert on new matches | Pairs with the JSON/RSS feed (backlog #35) |

## 9. Public data & registries — OpenCorporates, Crunchbase, Wikidata, OpenStreetMap

| Feature to consider | Notes |
|---|---|
| 35. Stable public IDs + permalinks per company | Wikidata's Q-id discipline; we already ingest `wd:` ids |
| 36. Per-record "sources" panel showing every observation | OpenCorporates' strongest UX idea |
| 37. Machine-readable dumps + a documented schema | Backlog #35/#36; cheap and fully public |
| 38. Public corrections channel | OSM's changeset model — but **no auto-canonical writes** |

## 10. Developer observability — Sentry, Honeycomb, OpenTelemetry

| Feature to consider | Notes |
|---|---|
| 39. Issue **grouping/fingerprinting** for repeated failures | Sentry's best idea. Our failures are per-run; a fingerprint would collapse "same flaky URL, 13 times" into one tracked issue — we literally have that case |
| 40. High-cardinality run tracing | Honeycomb-style: which board, which provider, which claim |
| 41. Release-tagged error rates | We tag site versions; not pipeline runs |

## 11. Feature flags & config — LaunchDarkly, Unleash

| Feature to consider | Notes |
|---|---|
| 42. Typed, audited flags instead of env-var authority | Directly relevant: three `DEMIGOD_TEST_SCOPE` consumers, two were exploitable; `FREEZE_DISABLED` is inert. A flag system with an audit trail is the mature form of what env vars are doing badly |

## 12. Scraping infrastructure — Firecrawl, Apify, Bright Data

| Feature to consider | Notes |
|---|---|
| 43. Per-provider quota/cost metering | Backlog #42; we hit `firecrawl_insufficient_credits` today |
| 44. Uniform cross-ATS schema with a `raw` passthrough | Apify/open-source convention: keep provider-specific fields rather than discard them — we discard `metadata[]`, `updated_at`, `departments[]` |
| 45. Politeness/backoff policy per host | Today: fixed batches of 5 |

---

## If I had to pick five

1. **GAP 5 — volume-anomaly quarantine** (§2). A verified hole in a public claim, and nothing else on this list is a live correctness risk.
2. **Append-only hash-chained receipt log** (§3, #11). Makes "green" unforgeable rather than merely checked.
3. **Verify-then-parse in the export consumer** (§3, #13). Low severity — the hash still gates use — but it is a free alignment with the stated contract and a better failure diagnostic.
4. **Evidence scoping + ignore-filters** (§5, #19–20). Directly kills the measured 50%-churn noise.
5. **Failure fingerprinting** (§10, #39). Converts recurring flakes into one tracked object instead of N re-diagnoses — this session lost real time to exactly that.

Everything above is an option. Public-surface and taxonomy choices remain potter's call.
