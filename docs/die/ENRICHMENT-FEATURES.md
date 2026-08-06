# Clay / DIE — 210-feature data-enrichment execution inventory
**Purpose:** durable evidence-gated backlog and execution ledger. No person/contact enrichment, global scores, outbound, publish, paid data, login scraping, Phase-2 without gate, or new frameworks.
**Sources:** `docs/die/{ROADMAP,CONTRACTS,EVALUATION,INNOVATION-AND-COLLABORATION,NEXT-WORK-PROMPT,CLAY-DIE-MULTI-AGENT}.md`, `docs/process/RECRUITAI-INTEGRATION-PLAN.md`, `DEMIGOD-DIE-SPEC.md`, and current `demigod-*` implementations.
**Inventory snapshot:** 210 deduplicated · status tallies: {'BUILT': 170, 'PARTIAL': 10, 'GATED': 9, 'NOW': 11, 'PARKED': 4, 'KILLED': 6} · by domain: {'CI': 18, 'CF': 22, 'AR': 36, 'CH': 19, 'EP': 14, 'QA': 24, 'RA': 18, 'OP': 16, 'OB': 12, 'TE': 21, 'GT': 10}
**Current local yield (offline batch, no ATS poll):** rows=339, PeopleOps boards=85 / reqs=207,
no-agency boards=1, research correctly quarantined after map change, phase2Ready=false.

## Status legend

| Status | Meaning |
|--------|--------|
| BUILT | Implemented + hermetic or receipt-backed |
| PARTIAL | Exists but incomplete coverage/yield |
| NOW | Unblocked local enrichment work |
| GATED | Roadmap phase or publish/auth gate |
| PARKED | Kill condition unmeasurable or deferred |
| KILLED | Explicitly rejected by data or non-goals |

## Execution updates — 2026-08-06b (coverage + multi-ATS)

- **coverageFreshness** (`enrichment coverage|clay`): field-fill % on open roles + maintained-stale dual clock (first_published ≥90d & updated_at ≤14d) + observation age median/max — not quality scores.
- **Lever/Ashby employer fields**: department/team, employmentType/commitment, workplaceType/isRemote → ledger → feed/public strip.
- **RSS**: `DEMIGOD-ROLES-FEED.rss` from roles-feed (public observation honesty).
- **Website**: obs inject + directory recent-role meta show workplace/employment when present.

## Execution updates — 2026-08-06 (website Clay)

- **Greenhouse employer fields (ledger):** `requisitionId` + `requisitionSignal` (`id`|`abstain` for ONE/MULTI trap), `employerDepartment`, `employerOffice`, `nativeDeadline`; refresh each GH poll.
- **roles-feed / public-roles:** pass `boardUpdatedAt`, `employerDepartment`, `employerOffice` for observed-roles strip + `DEMIGOD-ROLES-FEED.json`.
- **enrichment CLI:** `feed` · `velocity` · `requisitions` · `clay` (one-shot website receipt under `/tmp/dg-busy/enrichment-clay-website.json`).
- **Sample backfill:** 10 Greenhouse boards merged → ~1.3k open rows with department/office on disk (full fill on next full poll).

## Execution updates — 2026-07-31

- **CI mergeNamedCompanies board-absorb HN shells:** ATS-only `hn:jobs.*` rows
  merge into primary rows with matching `jobsUrl` board key (not host-only). Stops
  re-inflation of collapsed HN shells on map rebuild. `hiringIdentityKey` uses board
  for those ids.

- **CI identity collapse apply:** `applyWebsiteProposals` collapse (default) drops
  keyless inflation shells when one sibling host exists; refuses if keyless has more
  openRoles. CLI `--apply-websites [--write] [--fill]`. Live 2741→2735, candidates 6→0.

- **CI identity-review website proposals:** `proposeWebsiteBackfill` on
  unmergeable-missing-website groups (exactly one sibling host) — proposal only,
  never auto-applied. Live 6 candidates with donor website hints.

- **EP public-comp OTE/total-cash extract:** `extractPublicCompQuotes` accepts OTE /
  on-target earnings / total cash / annual compensation phrasing; still refuses
  competitive-only and non-parseable quotes (Pave kill: no ML bands).

- **OP-08 — work-find always surfaces exit-fail:** control-board exitFailures use
  `always: true` (hour-seen no longer hides re-broken truth_seal). Live
  `refuseIfStale('truth')` probe adds truth-reseal when map stamps between board receipts.

- **AR-28 — control ats_secondary_coverage:** low informative control on control-board
  reuses `buildBoardCoverage` (primary vs Personio/Recruitee/SR open boards). Never exit-fail;
  yield=0 is honest until enrich (no poll thrash).

- **AR-08 — PARTIAL→improved (ledger residual batch 2):** regional director+enterprise,
  strategic/partner manager, renewals, gtm presales, director of data, product security /
  sysadmin, IR/corp-dev/contracts/fin-reporting, director learning / workforce strategy,
  customer advocacy; EBP → operations. Negatives: ambassador, jewelry store. other 1666→1561.

- **AR-08 — PARTIAL→improved (ledger residual):** categorizeRole recall for MOTS,
  solutions/PS/technical consultants, specialist seller, partner/client/enterprise
  accounts, GTM strategy/planning, demand generation, agency lead, credit risk,
  deployment strategist, bizops, systems/BSA, case management, deal desk,
  engagement manager, GTM enablement. Negatives hold (jewelry consultant, general
  application, wet-lab, therapist). Full-ledger other 1971→1666; still coarse PARTIAL.

- **OP-08 — BUILT (enrich discovery):** `demigod-work-find.mjs` queues executable
  reseal and control-board work; `controlBoardRemediationNote` maps truth_seal →
  `demigod-truth.mjs` and research seal/export honesty → `reseal-queue run` (not
  status-only). Demo packet gaps and a healthy young-aging timer remain status, not work.
  Selftest: `node demigod-work-find.mjs --selftest`.
- **CH-13 — BUILT (schedule-gated):** `demigod-reseal-queue.mjs due|run --schedule`
  + `systemd-user/demigod-research-reseal.{service,timer}` (weekly, max-age 7d).
- **OB-07 — BUILT:** control plane modules `enrich` + `hiring` on
  `demigod-control.mjs` / `/api/control` (receipt-backed metrics).
- **AR-08 — PARTIAL→improved:** categorizeRole recall for L&D, GRC/privacy counsel,
  support/RevOps, DevRel/tech writer, compensation/HRIS/sourcer, creative heads,
  success/GTM, product leadership (Head/Director/0→1), solutions architect, CX,
  account management, people consultant/technology, collections; wet-lab scientist
  stays other; eng canaries hold; ledger other 2293→1655; still coarse (not fine taxonomy).
- **AR-25 — PARTIAL (timer-owned):** daily role-ledger timer healthy; max oldestObservedDays≈5 — ≥7/30 badges need calendar depth, not poll thrash.
- **AR-28 — PARTIAL→improved:** jobs-enrich `detect` now probes Personio, Recruitee,
  SmartRecruiters after GH/Lever/Ashby/Workable; owner evidence required (HTML/JSON
  parsers + fail closed without match). Hermetic detect canaries; live map still
  0 secondary boards until next full enrich (no poll thrash this fire).
- **RA-16 — BUILT:** collapsed registry façade — removed separate `recruitai-pack` /
  `recruitai-refresh` tools; one `recruitai-desk` (status|pack|refresh) + seed-pack/
  import integrity edges. Desk is not a second SoR.
- **OP-07 — BUILT:** export board identity control green (boardCollisions=0) + funnel
  collision-plan idle (groups=0); apply remains review-gated.
- **Public-comp fetch:** SSRF-safe `--fetch-url` for operator job pages (https +
  safeResearchUrl); strip HTML; quote-bound apply only.
- **Control `structured_hiring_no_score`:** med control — SH stores readable, no
  fitScore/trustScore, batch active≤3.
- **CI-15 identity helpers:** `stableMapCompanyId` + `hiringIdentityKey` (board
  host+path); hn: ATS-only board-slug ids (`host/slug`) accepted; full-disk
  id scan 2741 stable; multi-path/name-mint refused in selftest.
- **EP-12 open URL:** demand draft `open` field only via `safeResearchUrl`.
- **export_board_identity_clean + reseal_schedule_ok** controls on control-board.
- **structured-hiring audit** CLI + tools registry.
- **AR-28 boards receipt:** `node demigod-enrichment.mjs boards` → ats-board-coverage.json.
- **CF-14:** directory static foot states blurbs ≠ company-research claims.
- **Match-review:** compact debrief attached per structuredHiring projection.

## Execution updates — 2026-07-30

- **AR-26 — BUILT / AR-08 — PARTIAL:** high-confidence PeopleOps precedence now covers
  recruiter+AI/sales/infrastructure, People Business Partner, People leadership, Employee
  Relations, Total Rewards, and People Experience without stealing engineer/scientist titles.
  Open PeopleOps classification moved 179 → 214; `/hr`, recruiting-engineer, and Talent
  Community canaries stay negative. The deliberately coarse overall taxonomy remains PARTIAL.
- **EP-10 / RA-08 — BUILT:** seed and desk paths reuse the canonical committed-generation
  validator. Desk copies the exact validated buffers and fails before handoff mutation on poison.
- **RA-13 / TE-14 — BUILT:** hash poison fails seed and desk before output; the unused arbitrary
  seed `--from` bypass was deleted and is a negative CLI canary.
- **AR-27 — BUILT:** bounded positive-only no-agency phrases expanded with negative controls;
  current live yield remains one attributable board.
- **RA-09 / RA-12 — BUILT:** import derives companies and bounded public req samples directly
  from the committed export, rejects loose/malformed CLI flags, backs up before apply, and has
  a real temp-SQLite insert/update/idempotency check. The live batch remains dry by default.
- **Map/export batch — BUILT:** ledger role mix, engineering/sales/remote/observed counts,
  sample location, scoreboard, and fail-fast batch orchestration exist. The latest offline
  nine-step receipt is green and previewed 930 reqs without applying them.

## Inventory-ranked NOW top 20 (snapshot before execution)

| Rank | ID | Capability | Why now |
|-----:|----|------------|--------|
| 1 | AR-26 | PeopleOps title recall HRBP/People Partner | PeopleOps undercount HRBP/People Partner — pure local classifier |
| 2 | AR-08 | Role fn categorizeRole taxonomy | Same classifier surface as AR-26; taxonomy is PARTIAL |
| 3 | EP-10 | Seed-pack / desk handoff use committed load | Handoff→import trust: seed-pack must loadRecruitaiExport |
| 4 | RA-13 | Seed-pack default must use loadRecruitaiExport | Alias of EP-10 for RecruitAI path |
| 5 | AR-25 | Role-ledger poll cadence deepening ages | Observed ages stay shallow without poll cadence |
| 6 | NOW-01 | Scheduled role-ledger poll (systemd/timer) | Operationalize poll (timer) for AR-25 |
| 7 | CH-13 | Multi-day research re-verify schedule | Decay/absence metrics need multi-day reseal |
| 8 | AR-27 | Broader no-agency quote patterns without inventing | No-agency yield 1/339; expand extract carefully |
| 9 | NOW-02 | Directory static rebuild after aging | Static/HTML after aging enrich |
| 10 | AR-28 | More ATS boards / preconfig join depth | More boards without fake owners |
| 11 | RA-12 | RecruitAI open req projection (roles as reqs) | Company import done; req projection residual |
| 12 | OP-07 | Map identity / funnel collision dedupe | Identity double-count risk |
| 13 | CF-14 | Map company description as weak public blurb | Map blurb weak; not research claim |
| 14 | CH-15 | Directory aging badges ≥7d/≥30d from ledger | Public badges need longer observation |
| 15 | RA-08 | Desk pack handoff directory | Desk pack weak commit verify |
| 16 | RA-16 | Desk/registry UI façade YAGNI risk | Desk façade YAGNI vs integrity edge |
| 17 | EP-12 | Demand draft evidence attach safe URLs | Demand draft evidence attach partial |
| 18 | OP-08 | Useful-loop / work-find discovery of enrich tasks | Discovery of enrich work may idle |
| 19 | TE-14 | seed-pack --selftest pure only | Seed-pack lacks commit poison |
| 20 | OB-07 | Control plane /api/control enrich modules | Dash control plane enrich visibility |

## Full inventory

| ID | Capability | Status | Evidence / gate | Touchpoint | Smallest check | Domain |
|----|------------|--------|-----------------|------------|----------------|--------|
| CI-01 | Map companyId as sole SoR key | BUILT | CONTRACTS §1; map JSON | DEMIGOD-SF-STARTUP-MAP.json | node demigod-startup-map-data.mjs --selftest | CI |
| CI-02 | Exact name normalizer (incl. non-Latin preserve) | BUILT | DIE-SPEC D-004; companyKey NFKC | demigod-startup-atlas.mjs / lead-sourcer companyKey | node demigod-startup-atlas.mjs --selftest 2>/dev/null \|\| node demigod-lead-sourcer.test.mjs | CI |
| CI-03 | Match-time resolveCompanyEvidence zero→unknown multi→ambiguous | BUILT | CONTRACTS §9; matching-engine | demigod-matching-engine.mjs | node demigod-match-review-evidence.test.mjs | CI |
| CI-04 | No fuzzy merge of company identities | BUILT | CONTRACTS §1 non-goals | resolveCompanyEvidence | grep/tests forbid fuzzy | CI |
| CI-05 | ATS boardKey provider\|slug join not name ownership | BUILT | NEXT-WORK provider routing; export boardKey | demigod-role-ledger boardFromCompany | export --selftest unmatchedAts=0 | CI |
| CI-06 | Board URL ownership / ownedRoleUrl bind | BUILT | ledger ownedRoleUrl; export validation | demigod-role-ledger.mjs | node demigod-role-ledger.mjs --selftest | CI |
| CI-07 | YC public identity gate for partners (yc: + YC-public + sourceUrl) | BUILT | lead-sourcer notPublicYcIdentity | demigod-lead-sourcer.mjs | node --test demigod-lead-sourcer.test.mjs | CI |
| CI-08 | Domain projection scrub + safe host only | BUILT | projectedPartnerDomain/safeResearchUrl | demigod-lead-sourcer.mjs | lead-sourcer.test control-shaped domains | CI |
| CI-09 | Map boardKey host dedupe for multi-QID same ATS | BUILT | startup-jobs-enrich boardKey | demigod-startup-jobs-enrich.mjs | startup-map-data selftest | CI |
| CI-10 | HN BADHOST exclusion for company websites | BUILT | hn-cache-badhost.test | demigod-hn-hiring.mjs | node demigod-hn-cache-badhost.test.mjs | CI |
| CI-11 | Research row cannot mint map identity | BUILT | CONTRACTS §1; projector | projectCompanyResearch | research-projection-poison | CI |
| CI-12 | CRM company name dedupe for partner preview (read-only) | BUILT | existingCrmName/Id abstentions | demigod-lead-sourcer.mjs | lead-sourcer tests CRM | CI |
| CI-13 | Duplicate export stream identity abstention | BUILT | duplicateSourceIdentity | demigod-lead-sourcer.mjs | lead-sourcer selection receipt | CI |
| CI-14 | Personio /job/<id> exact route for roles | BUILT | NEXT-WORK Personio route | export relationship validation | export --selftest Personio | CI |
| CI-15 | Atlas mapCompanyId stability across refresh | BUILT | yc:/wd: slug ns + hn: host|host/slug (ATS-only); hiringIdentityKey board SoR; name-mint refused; full-disk id scan in selftest; regen may still add new wd:Qs | demigod-startup-map-data.mjs stableMapCompanyId | map-data --selftest identity | CI |
| CI-16 | No ATS-board-name → company ownership | BUILT | CONTRACTS §1 | boardFromCompany website/slug | ledger selftest | CI |
| CI-17 | Ambiguous Atlas Inc vs LLC company evidence | BUILT | match-review-evidence | matching-engine | test ambiguous status | CI |
| NOW-06 | HN SF-only hiring ingest | BUILT | hn-hiring selftest | demigod-hn-hiring.mjs | --selftest | CI |
| CF-01 | Frozen field: canonicalCompany | BUILT | CONTRACTS §6; gold 30 | DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json | benchmark grade + live replay | CF |
| CF-02 | Frozen field: productSummary | BUILT | CONTRACTS §6 | benchmark + projectCompanyResearch | benchmark --selftest | CF |
| CF-03 | Frozen field: productCategory | BUILT | CONTRACTS §6 | same | 4/5 accepted | CF |
| CF-04 | Frozen field: likelyBuyer | BUILT | CONTRACTS §6 | same | 4/5 accepted | CF |
| CF-05 | Frozen field: pricingStatus withheld D-007 | BUILT | coverage <0.9; grader withhold | demigod-evidence gradeResearchBenchmark | unknownReason ledger 0.8519 | CF |
| CF-06 | Operational catalog DEMIGOD-COMPANY-RESEARCH.json | BUILT | Phase1 empty valid companies:[] | DEMIGOD-COMPANY-RESEARCH.json | projectCompanyResearch catalog precedence | CF |
| CF-07 | Catalog-over-benchmark projection precedence | BUILT | CONTRACTS §8 | projectCompanyResearch | match-review-evidence catalog tests | CF |
| CF-08 | quarantineHiring union catalog∪benchmark | BUILT | evidence.mjs projectCompanyResearch | demigod-evidence.mjs | projection-poison quarantine | CF |
| CF-09 | Research live quote replay 142/142 | BUILT | EVALUATION live replay | company-research-benchmark.mjs | node demigod-company-research-benchmark.mjs (live) | CF |
| CF-10 | Safe URL only for research evidence | BUILT | safeResearchUrl SSRF deny | demigod-evidence.mjs | benchmark --selftest safeResearchUrl | CF |
| CF-11 | Quote ≤20 words exact match | BUILT | CONTRACTS claim rules | grader | grade errors on long quote | CF |
| CF-12 | Deterministic 30-company stratification | BUILT | selectionSeed demigod-die-benchmark-v1 | selectBenchmarkCompanies | selectionMatches in receipt | CF |
| CF-13 | Export binds companyResearch only when research green | BUILT | export researchGate green | demigod-recruitai-export.mjs | export CR=15 when pass-fresh | CF |
| CF-14 | Map company description as weak public blurb | BUILT | static foot + coverage caveat; description never research field | directory-static + map | directory-static --selftest CF-14 | CF |
| CF-15 | YC sourceUrl + sourceLicense on map rows | BUILT | map provenance | startup-map-data | map selftest YC-public | CF |
| CF-16 | Wikidata CC0 companies in map | BUILT | map source mix | startup-map-data | map volume floors | CF |
| CF-17 | Operational one-row catalog for real role company | GATED | Phase2 need OR reviewed packet; catalog empty | DEMIGOD-COMPANY-RESEARCH.json | phase2Ready + catalog length | CF |
| CF-18 | Pricing accept if coverage crosses 0.9 | GATED | D-007; still 0.85 adjusted | grader thresholds | gradeResearchBenchmark after gold edit only with proof | CF |
| CF-19 | Benchmark version + researchedAt advisory | BUILT | CONTRACTS §2 | benchmark JSON | schema parse | CF |
| CF-20 | Field statuses supported\|conflict\|unknown only | BUILT | grader | demigod-evidence.mjs | malformed status errors | CF |
| NOW-03 | Operational catalog first reviewed row | GATED | pri5 + real role need | DEMIGOD-COMPANY-RESEARCH.json | projector non-gold id | CF |
| NOW-05 | Export research green CR projection | BUILT | local CR=15 green true | export | export summary | CF |
| AR-01 | Role ledger schema demigod.role-ledger/1 | BUILT | strict loader throw on corrupt | demigod-role-ledger.mjs | role-ledger-poison | AR |
| AR-02 | firstSeen monotonic never rewritten | BUILT | upsertLedger invariant | demigod-role-ledger.mjs | selftest reopen preserves firstSeen | AR |
| AR-03 | Failed fetch never closes roles | BUILT | INVARIANT 2 poll | demigod-role-ledger.mjs | selftest failed board | AR |
| AR-04 | Greenhouse poll content=true for JD text | BUILT | POLLERS.Greenhouse | demigod-role-ledger.mjs | live poll (network) / selftest fixture | AR |
| AR-05 | Lever descriptionPlain/additional for agency extract | BUILT | POLLERS.Lever | demigod-role-ledger.mjs | selftest extractAgency | AR |
| AR-06 | Ashby description fields for agency extract | BUILT | POLLERS.Ashby | demigod-role-ledger.mjs | selftest | AR |
| AR-07 | nativePostedAt + nativeDateField per provider | BUILT | first_published/createdAt/publishedAt | demigod-role-ledger.mjs | export attributedPosted counts | AR |
| AR-08 | Role fn categorizeRole taxonomy | PARTIAL | coarse buckets + residual batches (MOTS/PS/seller/GTM/security/IR/renewals/data-lead); jewelry/general-app/wet-lab/therapist/ambassador stay other; not fine taxonomy · ledger other →1561 | demigod-startup-jobs-enrich.mjs categorizeRole | enrich + startup-jobs selftests | AR |
| AR-09 | openPeopleOpsReqCount export aggregate | BUILT | fn===people count | demigod-recruitai-export.mjs | export rows people>0 (local ~74) | AR |
| AR-10 | samplePeopleOpsRole title/URL positive only | BUILT | null when count 0 | export aggregateRoles | assertExportValid people ops pair | AR |
| AR-11 | noAgencyEvidenceReqCount positive only | BUILT | supported agencyPolicyEvidence | export | local yield 1 board | AR |
| AR-12 | extractAgencyPolicyEvidence quote patterns | BUILT | 4 regexes; ≤20 words | demigod-role-ledger.mjs | selftest explicit clause | AR |
| AR-13 | Agency evidence URL must equal role URL | BUILT | normalize + ownership | upsertLedger | selftest policy cleared on url mismatch | AR |
| AR-14 | openReqCount / closedToday / firstObservedToday | BUILT | aggregateRoles; exact account deltas + observed 7/30d sums without a score/rate | export → demigod-signals/3 changes[] + velocity | export + seed-pack selftests | AR |
| AR-15 | reopenedOpenReqCount from reopenCount | BUILT | ledger reopen on reappear | export | selftest reopen | AR |
| AR-16 | staleObservedReqCount from firstSeen age | BUILT | STALE_DAYS threshold | export | export ordering role-aging | AR |
| AR-17 | maxObservedOpenDays board max | BUILT | daysBetween firstSeen | export | directory aging uses ledger | AR |
| AR-18 | staleAttributedPostedReqCount from native post age | BUILT | STALE_DAYS on postedDaysAgo | export | export diagnostics stale attributed | AR |
| AR-19 | evergreenAttributedPostedReqCount ≥365d post age | BUILT | EVERGREEN_DAYS | export | export evergreen counts | AR |
| AR-20 | sampleRole prefer stale observation tip | BUILT | staleRow prefer | export aggregateRoles | export sampleRoleUrl bind graph | AR |
| AR-21 | ATS provider routing 7 labels native hosts | BUILT | NEXT-WORK routing | demigod-ats-providers.mjs | ats --selftest | AR |
| AR-22 | Board role bound 2000 roles / char limits | BUILT | shared ATS ingress | ats-providers / ledger | selftest bounds | AR |
| AR-23 | Duplicate jobId or URL invalidates observation | BUILT | ingress policy | demigod-ats-providers.mjs | selftest dups | AR |
| AR-24 | usPosted location flag | BUILT | isUsPostedLocation | role-ledger | report usOnly filter | AR |
| AR-25 | Role-ledger poll cadence deepening ages | PARTIAL | NOW-01 timer BUILT+healthy; max oldestObservedDays~5 (needs calendar time for ≥7/30); do not thrash poll for badges | role-ledger poll + timer | report --posted aging; timer unit | AR |
| AR-26 | PeopleOps title recall HRBP/People Partner | BUILT | 179→214 open; positive + negative precedence canaries | categorizeRole | enrich + startup-jobs selftests | AR |
| AR-27 | Broader no-agency quote patterns without inventing | BUILT | bounded positive-only phrases expanded; live yield remains 1 | extractAgencyPolicyEvidence | ledger selftest + negative control | AR |
| AR-28 | More ATS boards / preconfig join depth | PARTIAL | detect wired for Personio/Recruitee/SmartRecruiters (owner-required); map yield still Ashby/GH/Lever until next enrich | map jobsUrl + atsSource + detect probes | jobs selftest + live poll coverage | AR |
| AR-29 | Relationship graph open_role nodes ≤25/board | BUILT | export bound omissions | demigod-recruitai-export.mjs | export relationships counts | AR |
| AR-30 | Graph has_claim / research_source when green research | BUILT | export CR nodes | export | export green CR=15 nodes | AR |
| AR-31 | Greenhouse first_published attribution basis string | BUILT | export attributedPostingBasis | export metadata | export field | AR |
| AR-32 | Observed ageBasis observed-first-seen | BUILT | export ageBasis | export rows | assertExportValid ageBasis | AR |
| AR-33 | Closed roles retained with closedAt day | BUILT | ledger close on missing poll | role-ledger | selftest close | AR |
| AR-34 | Export omits roles without jobId | BUILT | rolesWithoutJobId:0 | export relationships | export diagnostics | AR |
| AR-35 | Title-only seniorityMix export bands | BUILT | closed enum; exact sum=openReqCount; no JD inference | demigod-recruitai-export.mjs JSON+CSV | export selftest + current 7108/12027 classified | AR |
| NOW-17 | Provider denied boards strip | BUILT | export deniedBoards | export diagnostics | export denied=0 or listed | AR |
| NOW-18 | Map openRolesAt timestamp | BUILT | map hiring stamp | startup-jobs-enrich | map field present | AR |
| CH-01 | Evidence seal inputsAtSeal hash bind | BUILT | sealRun + isFresh | demigod-evidence.mjs | evidence-fresh.test | CH |
| CH-02 | pinInputsAtStart scope pin for benchmark | BUILT | seal-scope race fix | company-research-benchmark + sealRun | evidence-fresh pin test | CH |
| CH-03 | pinBenchmarkInputsAtRead exact Buffer gold/map | BUILT | benchmark pin helpers | company-research-benchmark.mjs | benchmark --selftest pin | CH |
| CH-04 | assertBenchmarkInputsStable pre-seal | BUILT | gold/map drift throw | company-research-benchmark.mjs | selftest gold_changed_under_run | CH |
| CH-05 | fail-fresh does not demote green latest | BUILT | sealRun keep-green | demigod-evidence.mjs | evidence-fresh demotion test | CH |
| CH-06 | empty-scope never vacuous-fresh | BUILT | isFresh empty-scope | demigod-evidence.mjs | evidence-vacuous-scope.test | CH |
| CH-07 | Source history schema /2 claim store | BUILT | company-research-source-history | reduceSourceVerificationHistory | source-history-poison | CH |
| CH-08 | Live-set prune rotation orphans (mark not delete for unmintable) | BUILT | liveIds/liveSlots; Claude mark fix | company-research-benchmark.mjs | source-history-poison | CH |
| CH-09 | staleVerified diagnostic (verified + later transport fail) | BUILT | INNOVATION 3.8 | history counts.staleVerified | source-history-poison | CH |
| CH-10 | textStableFlaky diagnostic | BUILT | isTextStableTransportFlaky | history counts | source-history-poison | CH |
| CH-11 | sha256ChangeCount / textSha256ChangeCount page churn | BUILT | INSTRUMENTED mechanism 3 | reduceSourceVerificationHistory | history fields present | CH |
| CH-12 | Change-triggered refresh productization | PARKED | high body churn low text churn; no skip | history counters | ≥10 runs kill condition | CH |
| CH-13 | Multi-day research re-verify schedule | BUILT | due + weekly schedule-gated reseal (max-age 7d) | demigod-reseal-queue due/run --schedule + research-reseal.timer | node demigod-reseal-queue.mjs due | CH |
| CH-14 | Partner same-day export/map/ledger bind | BUILT | assertCurrentRecruitaiSource | demigod-lead-sourcer.mjs | lead-sourcer committed tests | CH |
| CH-15 | Directory aging badges ≥7d/≥30d from ledger | PARTIAL | aging enrich; ages young until poll history | demigod-directory-aging.mjs | directory-aging --selftest | CH |
| CH-16 | Export changeDate / changeBasis ledger-observation | BUILT | changeDate defaults to ledger updatedAt, not UTC wall-clock | demigod-recruitai-export.mjs | cross-UTC-boundary export + selftest | CH |
| CH-17 | TTL expire on evidence envelopes | BUILT | isFresh ttlSec | demigod-evidence.mjs | evidence-fresh ttl test | CH |
| CH-18 | Clock-skew future envelope reject | BUILT | isFresh clock-skew | demigod-evidence.mjs | evidence-fresh future test | CH |
| NOW-04 | History lock + reduce serialisation | BUILT | withFileLock live path | company-research-benchmark.mjs | contention selftest optional | CH |
| EP-01 | Claim value+url+quote triple | BUILT | CONTRACTS §5 | benchmark rows | grade + live check | EP |
| EP-02 | Live quote still on page (or fallback text) | BUILT | verifySources | company-research-benchmark.mjs | 142/142 receipt | EP |
| EP-03 | htmlToVisibleText only for quote match | BUILT | INNOVATION / DIE-SPEC | demigod-live-lib.mjs | benchmark selftest visible vs script | EP |
| EP-04 | Source history firstVerifiedAt never rewritten | BUILT | poison firstVerifiedAt | reduceSourceVerificationHistory | source-history-poison | EP |
| EP-05 | Transport failure ≠ absence | BUILT | poison suite | reduceSourceVerificationHistory | source-history-poison | EP |
| EP-06 | Export relationships supported_by claim edges | BUILT | export graph when green | demigod-recruitai-export.mjs | export green graph counts | EP |
| EP-07 | sampleNoAgencyPolicyQuote/Url from JD | BUILT | agencyPolicyEvidence | export + ledger | export noAgency rows | EP |
| EP-08 | Partner provenance boardKey+sourceUrl+retrievedAt | BUILT | lead-sourcer lead object | demigod-lead-sourcer.mjs | lead-sourcer.test | EP |
| EP-09 | Commit-bound export generation sha256 | BUILT | export-commit/1 | demigod-recruitai-export.mjs | loadRecruitaiExport commit match | EP |
| EP-10 | Seed-pack / desk handoff use committed load | BUILT | both reuse canonical validator; desk copies validated buffers | seed-pack + desk pack | tamper latest.json fails both before output | EP |
| EP-11 | Match companyEvidence provenance retrievedAt | BUILT | resolveCompanyEvidence | matching-engine | match-review-evidence.test | EP |
| EP-12 | Demand draft evidence attach safe URLs | BUILT | source + open via safeResearchUrl; localhost refused | demigod-demand draftEvidence + cmdDraft | demand-selftest + open reject | EP |
| EP-13 | Evidence artifact paths on seal | BUILT | addArtifact benchmark+history | sealRun | receipt artifacts[] | EP |
| EP-14 | PrivateText scrub on export descriptive fields | BUILT | privateText in export | demigod-recruitai-export.mjs | export --selftest scrub | EP |
| NOW-08 | Funnel CRM loader fail-closed non-array | BUILT | NEXT-WORK CRM loader | demigod-funnel.mjs | funnel selftest | QA |
| NOW-09 | Pair lifecycle real-only sample=false | BUILT | strict pair gates | demigod-pairs-lib.mjs | pairs CLI safety test | QA |
| NOW-10 | Intro draft SAMPLE marker forced sample | BUILT | intro tests | demigod-intro.mjs | intro.test | QA |
| NOW-15 | Board publish scrub PII | BUILT | board honesty | demigod-board-lib / honesty | board tests | QA |
| NOW-16 | Matching readiness form options exact | BUILT | NEXT-WORK readiness | matching-engine | matching-readiness.test | QA |
| NOW-19 | Comp step bounds for startup roles | BUILT | startup-comp-step.test | matching/comp | comp-step test | QA |
| QA-01 | Unknown claim status valid | BUILT | D-003 | grader | unknown fields null triple | QA |
| QA-02 | unknownReason closed enum | BUILT | UNLOCKED 2026-07-30 | UNKNOWN_CLAIM_REASONS | unknownReason poison | QA |
| QA-03 | unknownReason forbidden on supported/conflict | BUILT | grader red | demigod-evidence.mjs | benchmark selftest garbage reason | QA |
| QA-04 | Conflict status preserves dual quotes | BUILT | field status conflict | benchmark Artifact etc | live replay conflict rows | QA |
| QA-05 | Usable coverage / evidence support thresholds frozen | BUILT | 0.9 / 0.95 | grader | threshold change refused without review | QA |
| QA-06 | Abstention ledger informative adjusted coverage | BUILT | ledger not product gate | demigod-abstention-ledger.mjs | abstention-ledger --selftest | QA |
| QA-07 | Score isolation research never in match score | BUILT | D-005/D-012 | demigod-matching-engine.mjs | score-isolation.test | QA |
| QA-08 | No global fit/confidence score | BUILT | INNOVATION verify zero globalScore | matching-engine | rg globalScore deny | QA |
| QA-09 | Partner selection receipt reconciles inputRows | BUILT | selected+before+beyond+abstentions | lead-sourcer | partner accounting audit + tests | QA |
| QA-10 | Import-sourcer dry-run default written=false | BUILT | funnel import-sourcer | demigod-funnel.mjs | import dry receipt | QA |
| QA-11 | Sample pairs never project companyEvidence as real | BUILT | match-review sample gate | demigod-match-review.mjs | match-review-private/evidence tests | QA |
| QA-12 | Board honesty ≤seeds real=0 | BUILT | verify-board-honesty | demigod-verify-board-honesty.mjs | board honesty gate | QA |
| QA-13 | Role-ledger cross-check as company truth conflict | KILLED | die-33-falsify.md; evergreen brands | — | do not implement | QA |
| QA-14 | Evidence-consulted markers / field consult | PARKED | INNOVATION 3.4; no real reviews; blob UI | match-review UI | resume after real non-sample review | QA |
| QA-15 | Decay absence product interval | PARKED | 3.1 unmeasurable 0 absences | source-history | ≥30d + ≥1 absence | QA |
| QA-16 | Cost-per-accepted-fact metered transport | PARKED | mechanism 1; no cost fields | sourceChecks | park until metered | QA |
| QA-17 | unknownReason not_applicable vs not_found pricing | BUILT | 7 annotated gold | benchmark JSON | abstention ledger | QA |
| QA-18 | Non-vacuous live verification expectedClaims>0 | BUILT | EVALUATION §6 | sourceVerificationPass | selftest empty subject fails | QA |
| RA-01 | Export schema demigod.recruitai-export/3 | BUILT | export writer | demigod-recruitai-export.mjs | export --selftest | RA |
| RA-02 | Export CSV + JSON atomic generation | BUILT | commit bind | export | loadRecruitaiExport | RA |
| RA-03 | Partner sourcer limit/offset windows | BUILT | selection receipt | demigod-lead-sourcer.mjs | lead-sourcer tests offset | RA |
| RA-04 | Partner peopleOpsRoleEvidence projection | BUILT | reviewSignals | lead-sourcer | lead-sourcer test people ops | RA |
| RA-05 | Partner abstain positive no-agency | BUILT | noAgencyEvidenceReqCount!==0 | lead-sourcer | selection abstentions | RA |
| RA-06 | Company seed pack CompanySeed shape | BUILT | seed-pack rowToSeedEntry | demigod-recruitai-seed-pack.mjs | seed-pack --selftest | RA |
| RA-07 | demigod-signals.json by domain/mapCompanyId | BUILT | /3 adds provenance, exact changes[], typed daily history, and observed 7/30d account velocity; unchanged same-day revisions dedupe | seed-pack + daily post-poll refresh | poison/idempotence selftest + live mode-600 artifact | RA |
| RA-08 | Desk pack handoff directory | BUILT | committed load + exact validated JSON/CSV/commit buffers | demigod-recruitai-desk.mjs | valid pack + hash poison in sourcer test | RA |
| RA-09 | RecruitAI SQLite company import dry/apply | BUILT | committed export source; strict CLI; dry default | demigod-recruitai-import.mjs | import --selftest / real dry-run | RA |
| RA-10 | RecruitAI import positive-only has_inhouse_ta | BUILT | people>0 → 1 else null | planCompanyRow | import selftest | RA |
| RA-11 | RecruitAI import positive-only no_agency_policy | BUILT | noAgency>0 | planCompanyRow | import selftest | RA |
| RA-12 | RecruitAI open req projection (roles as reqs) | BUILT | bounded graph samples; 930 current previews | import adapter | temp SQLite insert/update/idempotency | RA |
| RA-13 | Seed-pack default must use loadRecruitaiExport | BUILT | committedOnly loader reused; arbitrary --from deleted | seed-pack main | hash poison + --from refusal before output | RA |
| RA-14 | Upstream pin lalalune v0.1.1 constant | BUILT | RECRUITAI_UPSTREAM | desk + plan doc | desk --selftest pin | RA |
| RA-15 | Handoff README policy drafts-only | BUILT | pack README text | desk packHandoff | pack produces README | RA |
| RA-16 | Desk/registry UI façade YAGNI risk | BUILT | single registry tool `recruitai-desk` (status\|pack\|refresh); pack uses loadRecruitaiExport; no separate pack/refresh façade tools | desk + tools-registry | desk --selftest; registry list | RA |
| RA-17 | Import plan limit N rows | BUILT | strict positive safe-integer limit | demigod-recruitai-import.mjs | import parser selftest + dry-run --limit | RA |
| RA-18 | Import backup before apply | BUILT | import --apply backup | demigod-recruitai-import.mjs | code path apply | RA |
| NOW-01 | Scheduled role-ledger poll (systemd/timer) | BUILT | daily persistent timer enabled; all-provider failure is nonzero and cannot advance ledger freshness | role-ledger poll + `systemd-user/demigod-role-ledger.{service,timer}` | timer unit test + live 338/339-board cycle | OP |
| NOW-02 | Directory static rebuild after aging | BUILT | refreshed jobs → 339/339 poll → aging → static/Pulse on 2026-07-31 | directory-static.mjs | static selftest + Infinite fallback poison check | OP |
| NOW-20 | Referral ledger redacted no money move | BUILT | referrals status | demigod-referrals.mjs | referrals status | OP |
| OP-01 | directory-refresh pipeline HN→map→jobs→ledger→static | BUILT | directory-refresh.mjs | demigod-directory-refresh.mjs | refresh --help / dry stages | OP |
| OP-02 | directory-aging enrich-map oldestObservedDays | BUILT | aging from ledger | demigod-directory-aging.mjs | aging --selftest | OP |
| OP-03 | directory-static crawlable HTML jobs | BUILT | static generator | demigod-directory-static.mjs | static --selftest | OP |
| OP-04 | hiring-pulse deltas empty-map fail closed | BUILT | mixed-row history filter + lock keeps map and typed role-signal observations independent | demigod-hiring-pulse.mjs | hiring-pulse --selftest | OP |
| OP-05 | role-ledger report --posted aging SF | BUILT | CLI report | demigod-role-ledger.mjs | report --posted | OP |
| OP-06 | CDN re-ship map ages | GATED | pri3 current-request publish auth | foot-cdn-publish + cm6 | only with DEMIGOD_CURRENT_REQUEST_PUBLISH=1 | OP |
| OP-07 | Map identity / funnel collision dedupe | BUILT | export_board_identity_clean (boardCollisions=0); funnel collision-plan review/apply (groups=0 idle); hiringIdentityKey board SoR | funnel + map + control-board | control-board + funnel collision-plan | OP |
| OP-08 | Useful-loop / work-find discovery of enrich tasks | BUILT | reseal/control-board/SH plan/comp/aging keys | demigod-work-find.mjs | work-find --json enrich kinds | OP |
| OP-09 | Hermetic clay soak 9-gate loop | BUILT | soak design/audit | systemd dg-clay-soak | clay-soak-receipt.jsonl | OP |
| OP-10 | Tools registry recruitai export/partner jobs | BUILT | tools-registry | demigod-tools-registry.mjs | registry list | OP |
| OP-11 | Firecrawl only safe public targets | BUILT | enrich --repair-denied policy | startup-jobs-enrich | invocation selftest | OP |
| OP-12 | Accepted-role gate CLI phase2Ready | BUILT | accepted-role.mjs | demigod-accepted-role.mjs | --json phase2Ready false | OP |
| OP-13 | Directory filter SF board honesty | BUILT | directory-filter | demigod-directory-filter.mjs | filter selftest if any | OP |
| NOW-07 | Startup atlas web honesty | BUILT | atlas web tests | demigod-startup-atlas-web.js | atlas-web.test | OB |
| OB-01 | company-research-benchmark sealed receipt | BUILT | evidence latest-company-research-benchmark | demigod-evidence.mjs | refuseIfStale green | OB |
| OB-02 | Export diagnostics changedCompanies / closedToday | BUILT | export diagnostics | demigod-recruitai-export.mjs | export --json diagnostics | OB |
| OB-03 | Partner selectionReceipt abstention buckets | BUILT | lead-sourcer | demigod-lead-sourcer.mjs | preview selectionReceipt | OB |
| OB-04 | Source history counts in export researchEvidence | BUILT | sourceHistory.counts | export researchGate | export sourceHistory | OB |
| OB-05 | Desk researchStaleVsExport warning | BUILT | pack when export green research not | demigod-recruitai-desk.mjs | status/pack flag | OB |
| OB-06 | Dogfood wrap for tools | BUILT | tool-dogfood | demigod-tool-dogfood.mjs | dogfood status | OB |
| OB-07 | Control plane /api/control enrich modules | BUILT | modules.enrich + modules.hiring | demigod-control.mjs | node demigod-control.mjs modules · GET /api/control | OB |
| OB-08 | Hiring pulse render escape injection | BUILT | selftest escape | demigod-hiring-pulse.mjs | --selftest | OB |
| OB-09 | Import integrity untracked import edges | BUILT | import-integrity | demigod-import-integrity.mjs | node demigod-import-integrity.mjs | OB |
| OB-10 | Publish freeze / ship prepare evidence | BUILT | ship-prepare receipt | demigod-ship.mjs | ship-prepare contract test | OB |
| OB-11 | Control plane next.json / orient | BUILT | bin/dg orient | demigod-next.mjs | bin/dg next | OB |
| NOW-11 | Webhook private write + rate limit | BUILT | webhook tests | demigod-webhook-*.mjs | webhook tests | TE |
| NOW-12 | Live honesty audit selftest | BUILT | verify-all | demigod-live-honesty-audit.mjs | --selftest | TE |
| NOW-13 | Route audit declared routes | BUILT | 404 vs stub | demigod-route-audit.mjs | --selftest | TE |
| NOW-14 | Perf-cache SSRF permissions | BUILT | IP-literal deny | demigod-perf-cache.mjs | perf-cache-permissions.test | TE |
| TE-01 | company-research-benchmark --selftest | BUILT | offline hermetic | company-research-benchmark.mjs | --selftest | TE |
| TE-02 | source-history-poison suite | BUILT | absence/transport/prune | demigod-source-history-poison.test.mjs | node …poison.test.mjs | TE |
| TE-03 | research-projection-poison suite | BUILT | catalog fail-closed | demigod-research-projection-poison.test.mjs | node … | TE |
| TE-04 | evidence-fresh + pinInputsAtStart poison | BUILT | 8 tests | demigod-evidence-fresh.test.mjs | node --test … | TE |
| TE-05 | recruitai-export --selftest | BUILT | fixtures acme/beta | demigod-recruitai-export.mjs | --selftest | TE |
| TE-06 | lead-sourcer hermetic partner tests | BUILT | 18 tests | demigod-lead-sourcer.test.mjs | node --test … | TE |
| TE-07 | role-ledger --selftest + poison | BUILT | agency + loader | role-ledger + poison test | both | TE |
| TE-08 | match-review-evidence hermetic | BUILT | research attach | demigod-match-review-evidence.test.mjs | node … | TE |
| TE-09 | accepted-role selftest + poison | BUILT | phase2 gate | accepted-role*.mjs | --selftest + poison | TE |
| TE-10 | startup-map-data --selftest floors | BUILT | volume floors | demigod-startup-map-data.mjs | --selftest | TE |
| TE-11 | ats-providers --selftest | BUILT | routing | demigod-ats-providers.mjs | --selftest | TE |
| TE-12 | directory-aging --selftest | BUILT | aging | demigod-directory-aging.mjs | --selftest | TE |
| TE-13 | score-isolation test | BUILT | research≠score | demigod-score-isolation.test.mjs | node … | TE |
| TE-14 | seed-pack committed-source poison | BUILT | fixture covers seed + desk valid/hash poison + --from refusal | lead-sourcer.test.mjs | node --test demigod-lead-sourcer.test.mjs | TE |
| TE-15 | verify-all matrix includes clay gates | BUILT | verify-all list | demigod-verify-all.mjs | npm run demigod:verify:source subset | TE |
| TE-16 | events-app policy poison | BUILT | verify-all | events-app-policy-selftest | poison suite | TE |
| TE-17 | outbound-poison drafted→sent needs receipt | BUILT | verify-all | demigod-outbound-poison.test.mjs | node test | TE |
| GT-01 | Phase2 match-review company context card | GATED | acceptedForDelivery≥1 | match-review + research | demigod-accepted-role.mjs --json | GT |
| GT-02 | Phase2 company_context_during_tenure | GATED | historical public employer facts only | research fields future | phase2 gate | GT |
| GT-03 | Phase3 evidence-shown/consulted telemetry | GATED | real pairs + outcomes | pairs + review | phase3 gate | GT |
| GT-04 | Phase4 single-field provider bakeoff | GATED | repeated first-party unknown | provider compare harness | phase4 gate | GT |
| GT-05 | Phase5 one-company collector automation | GATED | catalog bottleneck measured | collector module | phase5 gate | GT |
| GT-06 | Public company-research product | KILLED | permanent non-goal | — | do not build | GT |
| GT-07 | Clay clone / recipe DSL | KILLED | permanent non-goal | — | do not build | GT |
| GT-08 | Person/contact enrichment broker | KILLED | D-012 / non-goals | — | do not build | GT |
| GT-09 | Inferred pricing / global scores | KILLED | D-007 / non-goals | — | do not build | GT |
| GT-10 | Auto match/consent/intro | KILLED | non-goals | — | do not build | GT |

## Duplicates / YAGNI (collapse these)

| Cluster | Keep | Drop / do not rebuild |
|---------|------|------------------------|
| PeopleOps yield | AR-26 classifier fix | Separate “PeopleOps product”; re-export schema |
| Commit validation | loadRecruitaiExport (EP-09) | New seed-pack validator (reuse only) EP-10/RA-13/TE-14 |
| Desk façade | Optional pack via export+cp | Full desk module + triple tools (RA-16) if integrity pains |
| No-agency | AR-11/12 extract + AR-27 careful expand | Invent “no TA” from missing recruiters (KILLED) |
| Research fields | CF-01–04 gold + CF-06 catalog | Public research product GT-06; auto collector Phase5 |
| Aging | AR-16/17 + CH-15 + poll AR-25 | Parallel aging store outside ledger |
| Partner preview | RA-03–05 lead-sourcer | Second partner pipeline / CRM clone |
| Score | QA-07/08 isolation | Global fit score GT-09 |
| Phase2 context | GT-01 gated | Invent roles or sample utility observation |
| Mechanism #3 refresh | CH-11 counters only | Naive body-hash skip refresh (dead) |
| Role-ledger→company conflict | QA-13 KILLED | Auto conflict from evergreen brands |
| Cost preview | QA-16 PARKED | Fake cost columns without transport |

## Gates still closed (do not NOW)

- **Phase 2** (`phase2Ready:false`): GT-01, GT-02, CF-17 operational row for product value.
- **Phase 3–5:** GT-03–05.
- **Publish CDN:** OP-06 requires current-request publish auth.
- **Permanent non-goals:** GT-06–10.

## Suggested sequencing (next unblocked)

1. **AR-26/AR-08** — categorizeRole people recall (hermetic).
2. **EP-10/RA-13/TE-14** — seed-pack/desk default `loadRecruitaiExport()` (trust).
3. **AR-25/NOW-01** — poll cadence so aging badges become real.
4. **AR-27** only after false-positive poison for agency patterns.
5. **CH-13** multi-day reseal when ops capacity allows (network).

---

**File:** `/tmp/dg-busy/grok-clay-enrichment-backlog.md`
