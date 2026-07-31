# Clay / DIE — multi-agent shared state (Grok · Claude · Codex)

**Audience:** every active coding agent on this machine (Grok Build, Claude Code, Codex).  
**Purpose:** single exhaustive map of what exists, what is running, what is unfinished, and what you may build next for **data enrichment** and Clay-like intelligence—without inventing Phase 2 product.

**Authority order (when this file disagrees with older prose):**

1. Current user request in *this* chat/session  
2. Live receipts: `bin/dg truth`, `node demigod-evidence.mjs fresh company-research-benchmark`, `node demigod-accepted-role.mjs --json`  
3. Canonical rules: root `AGENTS.md`, `DEMIGOD-AGENTS.md`, `DEMIGOD-DIE-SPEC.md`  
4. This file (operational atlas)  
5. `docs/die/ROADMAP.md`, `NEXT-WORK-PROMPT.md`, `INNOVATION-AND-COLLABORATION.md`, `docs/process/RECRUITAI-INTEGRATION-PLAN.md`

**Do not** copy mutable run IDs or release SHAs into `AGENTS.md`. Re-read receipts.

**Exhaustive enrichment feature list:** [`docs/die/ENRICHMENT-FEATURES.md`](ENRICHMENT-FEATURES.md)

---

## 0. Vocabulary

| Term | Meaning |
|------|---------|
| **Demigod** | The product: SF talent ↔ startup matching (trydemigod.com + local ops). |
| **DIE** | Demigod Intelligence Engine — private evidence-backed company/hiring intelligence. **Not** a second public product. |
| **Clay-like** | Capabilities similar to Clay (research, tables, enrichment)—implemented *inside* Demigod, not a Clay clone. |
| **Clay clone** | Permanent non-goal (recipe DSL, graph platform, public research SaaS). |
| **Phase 2** | Real-role company context on match-review. **Gated** on accepted-for-delivery role. |
| **Accepted role** | Board role with `sample: false` + verified startup-hire inbox provenance (featured). Seeds never count. |
| **Enrichment (allowed)** | More **attributable public** facts on companies and open roles. |
| **Enrichment (forbidden as product)** | Guessed emails/phones, login-gated scrape, brokered people data, inferred pricing, global fit scores, auto-DM. |

---

## 1. Architecture (where things live)

```text
PUBLIC (CDN / Webflow / foot)
  └── SF directory / map: companies, ATS open-role counts, observed + posted aging badges
        (no sealed research, no RecruitAI graph, no pairs/CRM)

PRIVATE (this laptop)
  map + role ledger + research seal
    → demigod.recruitai-export/3  (/tmp/dg-busy/recruitai-export/)
    → partner preview (lead-sourcer)
    → import-sourcer dry-run
    → match-review / pairs / intro drafts
    → demand drafts-only

DESKTOP (optional, separate process)
  lalalune/recruitai-claude v0.1.1 AppImage
    → own SQLite + optional Gmail send
    ← Demigod handoff pack (/tmp/dg-busy/recruitai-handoff/) is signal only
```

### 1.1 Public vs private checklist

| Surface | Public site | Local busy `/tmp/dg-busy` | Desktop recruitAI |
|---------|-------------|---------------------------|-------------------|
| Company list / open roles | Yes | Yes | Own sweep |
| Observed open-age (“our first seen”) | Yes (map) | Yes | Via import (not built) |
| Sealed quote research | No | Yes | No |
| Partner CRM / import | No | Dry-run default | N/A |
| Pairs / consent / intro | No | Sample-safe; real gated | N/A |
| Gmail / auto-DM | No | Drafts-only | Desktop only |

---

## 2. What is already built (inventory)

### 2.1 Data pipeline modules

| Module | Role |
|--------|------|
| `demigod-startup-map-data.mjs` | Rebuild SF map (YC + Wikidata + HN) |
| `demigod-startup-jobs-enrich.mjs` | US-posted/Remote open-role counts from public ATS JSON |
| `demigod-ats-providers.mjs` | Greenhouse/Lever/Ashby + SmartRecruiters/Workable/Recruitee/Personio shapes |
| `demigod-role-ledger.mjs` | First-seen ledger; fail-closed close; observed vs attributed post age |
| `demigod-directory-aging.mjs` | Roll ledger → per-company aging; `--enrich-map` stamps map |
| `demigod-directory-static.mjs` | Crawlable `/startups` HTML + JSON-LD |
| `demigod-directory-refresh.mjs` | Orchestrator: HN → map+jobs → ledger poll → aging → pulse → static |
| `demigod-hiring-pulse.mjs` | Shareable pulse stats/HTML |
| `demigod-hn-hiring.mjs` | HN Who-is-Hiring → map candidates |
| `demigod-company-research-benchmark.mjs` | Gold 30 + live quote re-verify + seal |
| `demigod-evidence.mjs` | Seals, freshness, grader, `projectCompanyResearch`, unknownReason enum |
| `demigod-recruitai-export.mjs` | Map+ledger → private export/3 + graph |
| `demigod-recruitai-desk.mjs` | Upstream pin, status, pack, refresh handoff |
| `demigod-lead-sourcer.mjs` | Partner/talent **preview** (no CRM write) |
| `demigod-funnel.mjs` | `import-sourcer` dry/`--apply`; collision plan |
| `demigod-accepted-role.mjs` | Phase 2 gate (pure read) |
| `demigod-match-review.mjs` + pairs/intro stack | Review + lifecycle integrity |
| `demigod-abstention-ledger.mjs` | Unknown-field reason distribution |
| `demigod-import-integrity.mjs` | Clone-breaker edges + optional gate-list strict |

### 2.2 Canonical / busy data

| Path | Contents |
|------|----------|
| `DEMIGOD-SF-STARTUP-MAP.json` | Public map SoR on disk (also shipped as CDN map-data) |
| `DEMIGOD-ROLE-LEDGER.json` | Role first-seen SoR |
| `DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json` | Frozen 30-company gold |
| `DEMIGOD-COMPANY-RESEARCH.json` | Operational catalog (often empty) |
| `DEMIGOD-DIRECTORY-AGING.json` | Compact aging lookup |
| `/tmp/dg-busy/evidence/latest-company-research-benchmark.json` | Latest seal pointer |
| `/tmp/dg-busy/company-research-source-history.json` | Claim history counts |
| `/tmp/dg-busy/recruitai-export/` | Committed generation symlink |
| `/tmp/dg-busy/recruitai-handoff/` | Packed export for desktop |
| `/tmp/dg-busy/recruitai-app/recruitAI-0.1.1.AppImage` | Downloaded desktop binary |
| `/tmp/dg-busy/lead-sourcer-latest.json` | Last partner/talent preview |

### 2.3 Website (shipped)

- Directory UI: `demigod-startup-atlas-web.js` — open roles, longest tracked Nd (our first seen), ≥7d/≥30d when present, posted 90–365d (board date), pulse strip.
- Static: `sf-startups-static.html` (regenerated by `directory-static`).
- Live truth must be re-checked: `bin/dg truth` (do not hardcode CDN SHA here).

### 2.4 Dashboard / tools

| Entry | Command / API |
|-------|----------------|
| RecruitAI desk card | Dash Tools tab |
| API | `GET /api/recruitai` |
| Jobs | `recruitai-desk` (status|pack|refresh), `recruitai-export`, `recruitai-seed-pack`, `partner-sourcer` |
| Registry | `node demigod-tools-registry.mjs --md` · `bin/dg tools` |

### 2.5 Integrity properties agents already fixed (do not regress)

- Evidence: demotion guard, same-ms seal concurrency, empty-scope refuse, null-hash refuse  
- Gold/map pin under long live verify (`pinBenchmarkInputsAtRead` / `assertBenchmarkInputsStable`)  
- History: slot-scoped rotation prune; broken-gold **marks** transport fail (staleVerified), does not delete history  
- `unknownReason` closed enum; not allowed on supported/conflict  
- `quarantineHiring`: gold ∪ catalog  
- Export: atomic gen, modes, commit hashes, realpath `commit.generation`  
- Partner: selection receipt balances; TEST_SCOPE override leak closed  
- Pairs: no sample→real; mutual needs consent receipts; intro/referral recheck eligibility  
- Import-integrity: static import edges; **advisory** untracked verify-all gates (`DEMIGOD_IMPORT_GATES=1` strict)

### 2.6 Poison / verify gates (Clay-related)

Wired in `demigod-verify-all.mjs` (among others):

- `demigod-company-research-benchmark.mjs --selftest`  
- `demigod-source-history-poison.test.mjs`  
- `demigod-research-projection-poison.test.mjs`  
- `demigod-recruitai-export.mjs --selftest`  
- `demigod-accepted-role` selftest + poison + unit  
- `demigod-evidence-fresh.test.mjs`  
- `demigod-evidence-vacuous-scope.test.mjs`  
- `demigod-match-review-evidence.test.mjs`  
- `demigod-lead-sourcer.test.mjs` (when present)  
- pairs / intro / funnel selftests  

**Note:** Many of these files are **untracked in git** but present on disk. `import-integrity` reports gate-list advisory (`gateUntracked≈26`). Do not remove from verify-all to silence that.

### 2.7 Hermetic soak

```text
/tmp/dg-busy/clay-soak-run.sh
systemd-run --user --unit=dg-clay-soak ...
Receipts: /tmp/dg-busy/clay-soak-receipt.jsonl
```

Nine–ten hermetic gates with `&&` fail-closed. No live network reseal inside soak.

---

## 3. Why Phase 2 needs a real role (short)

Demigod’s unit of value is a **hire**, not a company dossier. Phase 2 is “context that changes a real match review.” Without an **accepted-for-delivery** role:

- utility is unfalsifiable (no real decision),  
- agents invent product completion,  
- privacy/authority boundaries (consent, intro, outcomes) have nothing honest to attach to.

**Does not need a role:** map, ledger, research benchmark, export, partner preview, dry import, directory aging, recruitAI desktop handoff, integrity work.

Current: `node demigod-accepted-role.mjs --json` → `phase2Ready: false`, seeds only.

---

## 4. Data enrichment — allowed work (unblocked)

Principle: **more attributable public facts on companies and open roles.**

### 4.1 Priority queue (recommended order)

| # | Workstream | Why | Primary commands / files |
|---|------------|-----|---------------------------|
| 1 | **Role-ledger poll cadence** | Observed ages stay tiny until poll history grows; public ≥7d/≥30d badges stay empty | `node demigod-role-ledger.mjs poll` then aging |
| 2 | **Directory aging enrich + static** | Stamps map + crawlable HTML from ledger | `node demigod-directory-aging.mjs --enrich-map` · `node demigod-directory-static.mjs` |
| 3 | **CDN re-ship when map ages matter** | Live site lags disk until publish | `DEMIGOD_CURRENT_REQUEST_PUBLISH=1` + foot-cdn-publish + cm6 paste (**needs current-request publish auth**) |
| 4 | **RecruitAI import adapter (Phase B)** | **Done (companies):** `demigod-recruitai-import.mjs` dry-run/`--apply` into desktop SQLite; reqs still not imported | Re-apply after export refresh; optional req projection later |
| 5 | **Operational catalog one-row ops** | Projector live; catalog empty | `DEMIGOD-COMPANY-RESEARCH.json` + reviewed packet only |
| 6 | **No-agency / PeopleOps JD yield** | Export fields positive-only; many zeros | On poll, better quote/URL extraction; never invent “no TA” |
| 7 | **Research multi-day re-verify** | Unlocks decay / absence metrics | Scheduled live reseal of gold 30; history store |
| 8 | **ATS board join depth** | More boards / better slug ownership | `demigod-ats-providers.mjs` + map preconfig; no fake owners |
| 9 | **Demand draft evidence attach** | Partial | Safe URLs + map identity when unambiguous |
| 10 | **Identity / board dedupe** | Double-count risk | Funnel collision + map dedupe |

### 4.2 Enrichment commands (copy/paste)

```bash
# Orient
bin/dg truth
node demigod-accepted-role.mjs --json
node demigod-evidence.mjs fresh company-research-benchmark

# Deepen open-role truth (network)
node demigod-role-ledger.mjs poll
node demigod-directory-aging.mjs --enrich-map
node demigod-directory-aging.mjs                    # writes DEMIGOD-DIRECTORY-AGING.json
node demigod-directory-static.mjs
node demigod-hiring-pulse.mjs

# Full monthly-ish pipeline
node demigod-directory-refresh.mjs                  # long, network

# Private GTM pack
node demigod-recruitai-export.mjs
node demigod-lead-sourcer.mjs --type=partners --limit=10
node demigod-recruitai-desk.mjs pack                # or: refresh = export+partner+pack

# Integrity canaries (no network)
node demigod-company-research-benchmark.mjs --selftest
node demigod-source-history-poison.test.mjs
node demigod-research-projection-poison.test.mjs
node demigod-recruitai-export.mjs --selftest
node demigod-directory-aging.mjs --selftest
node demigod-recruitai-desk.mjs --selftest
```

### 4.3 RecruitAI desktop (this machine)

| Item | Path / note |
|------|-------------|
| AppImage | `/tmp/dg-busy/recruitai-app/recruitAI-0.1.1.AppImage` |
| Launch | `.../recruitAI-0.1.1.AppImage --no-sandbox` |
| User data | `~/.config/recruitai` |
| Handoff | `/tmp/dg-busy/recruitai-handoff/` |
| Upstream | https://github.com/lalalune/recruitai-claude/releases/tag/v0.1.1 |

**Not built:** automatic import of Demigod JSON/CSV into recruitAI’s SQLite. Handoff is operator/review signal until an adapter lands.

### 4.4 Website publish rules

- Map/atlas/foot ship together via `demigod-foot-cdn-publish.mjs` + `demigod-cm6-paste-publish.mjs`.  
- Requires **`DEMIGOD_CURRENT_REQUEST_PUBLISH=1`** in the **current** user request, foot lock, freeze OFF.  
- Old “ship whenever” autonomy notes grant **nothing**.

---

## 5. Unfinished / gated / parked (exhaustive)

### 5.1 Roadmap phases

| Phase | Gate | Build when open |
|-------|------|-----------------|
| **0** Evidence slice | — | **Complete** (receipts mutable; re-verify) |
| **1** Operational catalog plumbing | — | **Complete** (catalog may be empty) |
| **2** Real role context | ≥1 accepted-for-delivery role | Match-review company packet; no AI verdict; utility log |
| **3** Outcome learning | Real pairs + ≥1 outcome | Consulted/shown markers; link to outcomes |
| **4** Source bakeoff | Reviews need one unknown field | One-field bakeoff + buy/no-buy |
| **5** Bounded collection | Catalog work is measured bottleneck | One-company collector; no auto canonical write |

### 5.2 Parked mechanisms (need data, not code fantasy)

| ID | Topic | Resume when |
|----|--------|-------------|
| 3.1 | Decay / absence product | ≥30d re-fetch; ≥1 classified absence |
| 3.4 | Evidence-consult inversion | Per-field UI + real reviews |
| #1 | Cost sample preview | Metered transport fields exist |
| #3 | Change-triggered refresh product | Enough page-churn samples |
| unverifiable | Third claim state | Product decision after sustained runs |

### 5.3 RecruitAI plan remainder

| Phase | Status |
|-------|--------|
| A Export + partner + dry import | **Largely done** |
| B Import into Electron + Gmail only there | **Company import done** (`demigod-recruitai-import.mjs`); reqs/Gmail still desktop-only |
| C ATS surface expansion | Partial; auto-discovery limited |
| Agency 1–10 score in Demigod | **Out of scope** for Phase A |
| Bidirectional demand seeds | Open product question |

### 5.4 Ops hygiene

- `git add` untracked Clay modules/tests (user authorization)  
- Default-fail on untracked verify-all gates after tracking  
- Keep soak green across concurrent agent edits  
- Reseal research after any seal-scope file edit  
- Firecrawl credit exhaustion policy during live reseal  

### 5.5 Permanent non-goals (never “next sprint”)

- Clay clone, recipe DSL, graph DB platform, swarm-as-product  
- Public company-research SaaS  
- Brokered/login-gated/inferred people enrichment  
- Inferred pricing; global fit score  
- Auto match / consent / intro / Demigod auto-DM  
- Merge Electron into monorepo; LinkedIn cookie product  
- Agency fee copy on trydemigod.com  

---

## 6. Agent protocol (how to collaborate)

### 6.1 Roles

| Agent | Prefer |
|-------|--------|
| **Grok** | Implement, ship prepare, multi-tool wiring, long unattended integrity + enrichment runs |
| **Claude** | Architecture honesty, adversarial path audits, kill-condition writing |
| **Codex** | Adversarial gate reviews, pair lifecycle, BLOCK when product boundary slips |

Orca orchestration primary (`orca-ide`); `ask-claude` / `grok-ask` / `codex-ask` are stateless fallbacks. See `AGENT-COMMS.md`.

### 6.2 Hard stops (every agent)

- No invent real roles, pairs, or “phase2Ready true” without receipts.  
- No publish / paste / CDN without **current-request** publish language + `DEMIGOD_CURRENT_REQUEST_PUBLISH=1`.  
- No outbound DM/email/post/form; demand is **drafts-only**.  
- No money movement.  
- No game (Eat the Sounds) unless user reopens.  
- No `git add` of broad Clay sets unless user asks.  
- Ponytail on every code edit (`docs/PONYTAIL-AGENTS.md`).  

### 6.3 Verify after enrichment touches

```bash
node demigod-directory-aging.mjs --selftest
node demigod-role-ledger.mjs --selftest   # if available
node demigod-recruitai-export.mjs --selftest
node demigod-recruitai-desk.mjs --selftest
# If seal-scope code changed:
node demigod-company-research-benchmark.mjs --selftest
# Live reseal only when intentional (network + may spend Firecrawl):
# node demigod-company-research-benchmark.mjs
bin/dg truth   # after any public ship
```

### 6.4 Handoff receipt convention

Write short receipts under `/tmp/dg-busy/`:

- `*-clay-*.md`, `*-die-*.md`, `grok-clay-*.md`, `claude-clay-*.md`, `codex-clay-*.md`  
- Include: commands run, pass/fail, files touched, **phase2Ready**, publish? y/n  

Update this file’s **§8 Working log** when you complete a durable chunk (append, don’t rewrite history).

---

## 7. Decision tree (what to pick next)

```text
Is the user authorizing website publish?
  yes → enrich-map + static + foot-cdn-publish + cm6-paste (lock + DEMIGOD_CURRENT_REQUEST_PUBLISH=1)
  no  → local enrich only

Is there a real accepted role?
  yes → Phase 2 match-review context (only)
  no  → do not open Phase 2 product

Is the goal GTM / agency desk?
  yes → recruitai-desk refresh/pack; optional import adapter; never Demigod send

Is the goal public hiring truth?
  yes → role-ledger poll + directory-aging (+ ship if authorized)

Is the goal research quality?
  yes → reseal, history, operational catalog one row, unknownReason honesty
```

---

## 8. Working log (append-only)

### 2026-07-30 — Grok

- Document created for multi-agent use (`docs/die/CLAY-DIE-MULTI-AGENT.md`); linked from `docs/die/OPERATIONS.md` + `DEMIGOD-SIMPLE.md`.  
- Enrichment run (`/tmp/dg-busy/clay-enrich-poll.log`): `role-ledger poll` → `directory-aging --enrich-map` → aging JSON → `directory-static` → `recruitai-desk pack`.  
  - Ledger roles ≈ **13155**, `updatedAt` 2026-07-30; map companies with `oldestObservedDays` ≈ **336**; max observed still **~4d** (young ledger).  
  - Handoff packed: `/tmp/dg-busy/recruitai-handoff/` (ready).  
- Prior same day: public directory open-role aging **shipped** (foot v859); RecruitAI desk + AppImage v0.1.1; seal-scope pin; pair/export integrity; soak script.  
- `phase2Ready: false` throughout. Research may be `input-hash-mismatch` after seal-scope edits—reseal before claiming green research.  
- **CDN not re-shipped** in this enrichment pass (map ages unchanged at 4d max; publish needs current-request auth when ages matter).  

### 2026-07-30 — Grok (later)

- **RecruitAI seed pack adapter:** `demigod-recruitai-seed-pack.mjs`  
  - `company-seeds.jsonl` — recruitAI v0.1.1 `CompanySeed` shape `{name,domain?,website?}`  
  - `demigod-signals.json` — openReq / observed / PeopleOps / no-agency signals by domain  
  - Wired into `demigod-recruitai-desk.mjs pack` (always written with handoff)  
  - Selftests green; pack: **339 seeds**, 30 with PeopleOps, 92 with stale attributed posts, 1 with no-agency evidence  
- Flag `researchStaleVsExport` when export still says researchGreen but seal is not green.  
- Tools registry: re-registered recruitai-desk/pack/refresh/seed-pack if overwritten.  

### 2026-07-30 — Grok (exhaustive enrichment list + ship)

- Inventory: `docs/die/ENRICHMENT-FEATURES.md` (~70 features across A–G; non-goals explicit).  
- Shipped local: agency phrase expansion; offline `fn` reclassify; map **roleMix from ledger**; export `openEng/Sales/Remote/Observed7` + `sampleLocation`; RecruitAI **req sample import** (`--reqs`); `demigod-enrichment.mjs` scoreboard + batch.  
- Live batch green: poll → aging → static → pulse → export → desk → import reqs → scoreboard.  
  - Export: eng=4750 sales=1850 remote=2553 peopleOps=174 sampleLoc=339/339; research 15 when green.  
  - Map roleMix on **337** companies; recruitAI DB: 339 companies + **930** sample reqs.  
  - Research resealed green after map stamp.  
- CDN not published (no current-request publish). `phase2Ready: false`.  

### 2026-07-30 — Grok (reseal + poll + Phase B import)

- Live reseal after seal-scope drift → research **green** (`pass-fresh`, 142/142 source checks).  
- Role-ledger **poll** (339 boards, 12342 open, 360 closed today) → `directory-aging --enrich-map` → static HTML → reseal again (map hash change) → desk **refresh** + seed pack.  
  - `researchStaleVsExport: false`; export rows=339 CR=15 researchGreen.  
  - maxObserved still ~4d (young ledger); public CDN not re-shipped (no current-request publish).  
- **Phase B SQLite import:** `demigod-recruitai-import.mjs`  
  - Dry-run default; `--apply` backs up DB then inserts/updates `company` only (no contacts/drafts/sends).  
  - Positive-only `has_inhouse_ta` / `no_agency_policy`; skips reviewed/approved.  
  - Applied to empty `~/.config/recruitai/recruitai.db` → **339 companies**, 339 audit rows; tools registry `recruitai-import`.  
- `phase2Ready: false` throughout. Nothing published.

### 2026-07-30 — Claude

- Integrity pass; receipt: `/tmp/dg-busy/claude-clay-integrity-2026-07-30.md`. **Nothing published**; live site byte-identical.
- Fixed, each poison-controlled: transport retry in live source verify (`fetchLiveSource`); `\u2028/\u2029` + `\u061c` missing from the six unsafe-text classes, now one `UNSAFE_INVISIBLE_CLASS` in `demigod-agent-tools-lib.mjs`; **pair-eligibility bypass** in `demigod-funnel.mjs` (any non-empty `DEMIGOD_TEST_SCOPE` unlocked caller-supplied board/inbox — same class as the sourcer leak §2.5 already lists, second instance); **`demigod-redirects.mjs` write commands were the only Webflow writer with no publish-authorization guard**, now `assertNotFrozen`; two vacuous `[].every()` selftest assertions in `demigod-role-ledger.mjs`; `abstention-ledger` swallowing a corrupt corpus as `0 abstentions`; accepted-role gate now emits `boardPath`/`boardIsCanonical`.
- Verified clean, do not re-audit: export consumer boundary (10 attacks + accepted baseline), partner selection partition (11 offset windows, 110 rows, 0 dupes), CSV/JSON agreement (structural), research projection positive control (15 rows `live_replayed`).
- **Two corrections to this atlas.** (a) §4.4/§6.2 read as if publish freeze is a second barrier — `FREEZE_DISABLED = true` in `demigod-publish-freeze.mjs`, so `DEMIGOD_PUBLISH_FREEZE=1` is inert and only the `DEMIGOD_CURRENT_REQUEST_PUBLISH === '1'` arm protects publish paths. (b) The site has **two** redirect layers: Webflow 301s plus a `dg-path-redirects` head shim that rewrites even hard-served 200 pages to `/?p=`. `route-audit` sees layer 1 only, so repointing the 6 stub routes scores green while sending users an extra hop to a different page key. The stubs' real cost is served metadata (`/?p=press` returns the homepage title); fixing needs real Webflow pages, a Designer operation.
- Gates: `node --test *.test.mjs` 480/480 · verify-all pass · funnel selftest 1101/0.

### 2026-07-30 — Codex + Grok

- Fixed the shared PeopleOps title classifier in `demigod-startup-jobs-enrich.mjs`; receipt:
  `/tmp/dg-busy/codex-clay-people-classifier.md`; independent traces:
  `/tmp/dg-busy/grok-clay-next-build.md` and `/tmp/dg-busy/codex-clay-next-build.md`.
- `demigod-recruitai-export.mjs` now reuses that classifier instead of trusting stale
  persisted `row.fn`; its existing selftest carries an intentionally stale `Talent Partner`
  category so the boundary stays fail-capable.
- Current-ledger dry projection: **49 → 178** open PeopleOps roles; 135 conservative
  recruiting/HRBP/People Partner/People Operations titles recovered and 6 `/hr` compensation
  false positives removed. The 339-company exact-board export projection is **30 → 73
  companies** and **48 → 173 attributable roles**.
- Startup-enrich, role-ledger, export, seed-pack, and 18/18 sourcer integrity tests pass.
  No network poll, canonical data rewrite, publish, outbound, desktop launch, or Phase 2
  change; `phase2Ready: false`.

- **Enrichment backlog + first item** (Claude, later 2026-07-30). Competitor scan (Clay waterfall/150+ providers, Coresignal, Xverum, PDL/Revelio, Apify/Signalbase) and a 42-item grounded options list: `docs/die/ENRICHMENT-BACKLOG.md`. Field availability was probed against live Greenhouse boards, not assumed — `updated_at`, `requisition_id`, `metadata[]`, `departments[]`/`offices[]`, `application_deadline` are already in bytes we download and discard; **Greenhouse exposes no pay range**, so comp-from-prose would be inference and is recommended against.
- Built backlog #8: `requisitionSignal()` in `demigod-ats-providers.mjs` — distinct-requisition counting with two independently poison-proven gates. **Trap it encodes:** `requisition_id` is employer-freeform. Airbnb uses `ONE`(x153)/`MULTI`/`TBD` as a headcount hint, so naive `distinct()` reads 187 postings as 13 openings (93% understatement presented as precision). Placeholders (`PIPELINING-ONLY`, `TBD`) cluster on otherwise-clean boards, so it counts the usable subset and reports the residue; usable+unusable always reconciles to postings. Live: affirm 181→116, anthropic 400→366, algolia 41→27(+3), alpaca 56→55(+1), **airbnb ABSTAIN**. Pure over raw board JSON — deliberately NOT added to adapter output or ledger rows (ledger enforces an exact key allowlist), and **no public count was changed** (public-claim taxonomy is potter's call).
- Gates: 480/480 · verify-all pass.

### 2026-07-30 — Codex + Grok (210-feature inventory + integrity batch)

- Promoted Grok’s evidence-gated audit into `docs/die/ENRICHMENT-FEATURES.md`: **210**
  deduplicated enrichment/operations/testing capabilities with BUILT/PARTIAL/NOW/GATED/PARKED/KILLED
  status, touchpoint, evidence, and smallest check.
- Closed the copied-export trust gap without a second validator: default seed, desk status/pack,
  and RecruitAI import all reuse the canonical committed loader. Desk copies the exact validated
  JSON/CSV/commit buffers; arbitrary seed `--from` was deleted. The existing sourcer poison test
  proves hash mismatch fails seed and desk before either writes output.
- PeopleOps precedence + leadership/ER/Total Rewards recall moved the open ledger projection
  **179 → 214** while recruiter-engineer, People-tools engineer, Talent Community, and `/hr`
  controls remain non-PeopleOps.
- RecruitAI import now derives from the committed export, rejects loose/malformed CLI input, and
  exercises company plus req insert/update/idempotency against temp SQLite. Current dry preview:
  **339 companies / 930 public req samples**; no DB apply.
- Offline enrichment batch (poll skipped) completed **9/9** stages. Current export:
  **339 rows / 11,994 reqs / 207 PeopleOps reqs on 85 boards / 1 no-agency board**. Handoff files
  byte-match the validated generation. Research is honestly quarantined after the map hash changed;
  no paid/network reseal was started.
- Independent reports: `/tmp/dg-busy/grok-clay-enrichment-backlog.md`,
  `/tmp/dg-busy/grok-people-precedence-audit.md`, and
  `/tmp/dg-busy/codex-clay-validator-audit.md`. No publish, outbound, Cursor, app launch, or
  Phase 2 work; `phase2Ready: false`. Hermetic Clay soak remains active with zero restarts.

### 2026-07-30 — Codex + Grok (controls + observation clock)

- Built the Vanta-shaped internal Control Board and integrated it into session orientation:
  named pass/fail/n/a controls, private receipt, corrupt-artifact poison checks, and no aggregate
  trust score. Grok’s independent read-only review found the contract intact and no circular import.
- Enabled the daily persistent role-market observation timer using the existing role-ledger poller.
  Fixed the shared failure invariant first: an all-provider outage now exits nonzero and cannot
  advance ledger `updatedAt`.
- First systemd cycle: **338/339 boards succeeded in 8s**, 13,294 role assertions, ledger mode 600;
  timer active for the next daily run. No map enrich, reseal, publish, outbound, Cursor, or Phase 2
  change.

### 2026-07-30 — Codex (private hiring-intent feed)

- Reused the export’s existing exact observation deltas instead of adding a scoring engine:
  `demigod-signals.json` is now schema `/2` with provenance, full `changes[]`, opens, older-posted
  opens, closures, and cumulative reopened-open counts by exact board identity.
- Fixed the exporter’s UTC-boundary bug by anchoring its default change date to ledger `updatedAt`;
  the same post-5pm-Pacific input now retains 339 rows instead of failing with `empty rows`.
- The proven daily role timer now refreshes the committed export and private handoff only after a
  successful poll. Live service proof: **338/339 boards**, success in 8s, then a mode-600 feed for
  **338 accounts / 3 changed accounts / 1 newly observed role / 3 closures** on the new observation
  date. No score, contact lookup, send, publish, Cursor, or Phase 2 change.

### 2026-07-30 — Codex (observed hiring velocity)

- Reused `DEMIGOD-HIRING-HISTORY.jsonl` instead of creating a second history product. Legacy public
  map snapshots and explicitly typed role-ledger observations stay independent under one shared lock.
- `demigod-signals.json` schema `/3` retains idempotent daily account deltas and derives 7/30-day
  sums by latest observed snapshot per date. It reports `observedDays` and never invents a weekly
  rate when fewer than seven observations exist.
- The first real window is intentionally one observed day: **338 accounts / 3 changed / 1 newly
  observed / 3 closed / net -2 observed reqs**. Corrupt history fails closed before replacing the
  last feed; changed same-day revisions replace the derived view while unchanged revisions append
  once across export generations. No new crawler, provider, score, contact, send, publish, Cursor,
  or Phase 2 change.

### 2026-07-30 — Codex (zero-failure ATS refresh)

- Traced the sole daily poll failure to Infinite’s retired Ashby board (`404`), not an adapter bug.
  Reused the existing full jobs refresher: Infinite now falls back to its attributable YC jobs page,
  while newly verified Gather/Greenhouse keeps the map at **339 boards / 8,145 US-or-Remote roles**.
- Re-ran the normal observation service against the refreshed identities: **339/339 fetches passed**,
  no volume anomalies, 12,394 open ledger roles, and the private feed now has **339 accounts / 9
  changed / 4 newly observed / 7 closed / net -3** for one observed day.
- Rebuilt ledger aging, the crawlable directory, and the Pulse; drained the existing research reseal
  at **142/142 source checks** and regenerated the hash-bound export. Dogfooding also removed
  unchanged same-day history churn across fresh export generations. No publish, send, contact
  lookup, new provider, Cursor, or Phase 2 change.

*(Agents: add dated bullets below.)*

---

## 9. Quick reference table

| Want | Do |
|------|-----|
| Shared orientation | **This file** |
| Product gates | `docs/die/ROADMAP.md` |
| Task copy-paste | `docs/die/NEXT-WORK-PROMPT.md` |
| Mechanisms / parked | `docs/die/INNOVATION-AND-COLLABORATION.md` |
| RecruitAI boundary | `docs/process/RECRUITAI-INTEGRATION-PLAN.md` |
| Spec | `DEMIGOD-DIE-SPEC.md` |
| Live website truth | `bin/dg truth` |
| Phase 2 gate | `node demigod-accepted-role.mjs --json` |
| Research green | `node demigod-evidence.mjs fresh company-research-benchmark` |
| Desk status | `node demigod-recruitai-desk.mjs status` |

---

## 10. File ownership hints (reduce thrash)

| Area | Prefer one owner per session |
|------|------------------------------|
| `demigod-company-research-benchmark.mjs` + evidence | One agent; reseal after |
| `demigod-recruitai-export.mjs` / lead-sourcer | One agent |
| `demigod-pairs-lib.mjs` / funnel intro | One agent (lifecycle) |
| Map enrich + ship | One agent (publish auth required for CDN) |
| This doc | Append log; avoid contradictory rewrites |

Hold foot lock for `demigod-foot-core.js` edits (`bin/dg lock claim`).

---

**End of multi-agent atlas.** Prefer updating §8 and receipts over inventing parallel “state” docs.
