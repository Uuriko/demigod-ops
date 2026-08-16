# Clay → DIE — useful 2026 surface (2026-08-14)

**Status:** ambitious plan, not implemented.  
**Ask:** take as much of Clay as is useful for Demigod.  
**Useful =** company + open-role *public* facts that make a human match review better.  
**Not useful =** people-data waterfalls, login scrape, inferred pricing, global fit scores, auto-DM, recipe marketplace, credit meters.

Clay 2026 (clay.com + guides, fetched today): tables; waterfall (stop at first confident result; bill the hit); Claygent (per-row web research + glass-box trace); Signals (job changes, web intent, funding, custom); HTTP API as a table source; CRM writeback; 200+ marketplace; Audiences; Account Research Agents; Agent plugin CLI/API; Actions + Data Credits.

Steal the *loop*, not the marketplace.

Coresignal / Harmonic / PDL — field check only, not buy-now:

| Their field | Do we need it? |
|---|---|
| Observer `created_at` vs employer `date_posted` | Already have (`firstSeen` vs Greenhouse `first_published`). |
| Company entity resolution | Need *ours*: domain-first merge. Not their API. |
| Cross-post dedupe | Already have `(provider, slug, jobId)`. |
| Funding / headcount | YC batch + `teamSize` when present. Do not buy inferred headcount. |
| Emails / phones / people | Never. |

---

## 1. Clay feature → DIE analog

| Clay 2026 | DIE analog | Have / partial / missing |
|---|---|---|
| Table of companies | `DEMIGOD-SF-STARTUP-MAP.json` + RecruitAI export JSON/CSV (339 board rows; 2754 named companies) | **partial** — fleet artifacts exist; no operator table keyed by `company.id` with one-click row |
| Per-row enrichment action | `demigod-enrichment.mjs` is fleet (scoreboard / clay / batch) | **missing** — cannot `show --id=yc:…` and get one row |
| Waterfall-as-loop | ATS detect already first-success (GH → Lever → Ashby → Workable → secondary). Company *fields* are not a stop-at-first-confident loop | **partial** |
| Claygent (one-company research) | `projectCompanyResearch` + 4 accepted fields; no per-company assembler | **missing** as a packet |
| Evidence / glass box | value + ≤20-word quote + safe URL + `supported\|conflict\|unknown` | **partial** — lives in projector/export, not one evidence panel |
| Signals (role open / close) | `demigod-signals.json` `/3`: `changes[]`, first-observed, closed-today, reopened-open, 7/30d sums | **have** — not joined onto a company row |
| Scheduled refresh | `demigod-role-ledger.timer` + `demigod-roles-pipeline.timer` + weekly reseal | **have** |
| CRM writeback | `recruitai-export` → desk pack → `recruitai-import` (companies + bounded public reqs) | **have** |
| HTTP API as source | CLIs + `/api/control` + `/api/recruitai` | **missing** — no `GET` company table / packet |
| Sources (YC / WD / HN / ATS JSON) | Map + ledger already | **have** (public only) |
| More ATS fields we already fetch | Ledger stores `employerDepartment`, `employerOffice`, `workplaceType`, `employmentType`, `nativeDeadline`, `requisitionId`+signal, `nativeUpdatedAt` | **partial** — on ledger; **not** on export `EXPORT_ROW_KEYS` or `resolveCompanyEvidence` observations |
| Entity resolution | Exact name + `company.id`; website proposals exist | **partial** — dual cards / dummy hosts still possible; no domain-first join key |
| Audiences | SF map is the universe | **partial** — not a queryable table |
| Agent CLI | `bin/dg` + node modules | **partial** |
| Credits / recipes / sequencer / ads / web intent / people job-change | — | **refuse** |

`resolveCompanyEvidence` today is name-keyed, title-exact, and omits employer fields, signals, and an `unknowns[]` list. That is the hole Clay would call “click the row.”

---

## 2. Ranked next 6 (start now, no people data)

1. **One-company packet** — join map + ledger + signals + accepted research + employer ATS fields + `unknowns[]` on exact `company.id`. Unlocks every later row action. **← today.**
2. **ATS employer fields into export + review** — project department / office / workplace / employment / deadline / maintained-stale (`first_published` vs `updated_at`) onto export open-role nodes and the match-review sidecar. Bytes we already store.
3. **Private HTTP company table** — `list` (id, name, domain, openRoles, ats, last signal, research status) + `get --id` returns the packet. Clay’s table, our SoR.
4. **Public-source waterfall loop** — per empty field only: first-party site → YC → Wikidata → HN → unknown. Stop at first confident attributable fact. Empty/uncertain never overwrites verified. No new provider.
5. **Domain-first entity resolution** — registrable domain is the join key; refuse dummy / shared / careers-only hosts; dual cards become one row + source citations. Name stays a label.
6. **Evidence panel + RecruitAI writeback of the packet** — render quote/URL/unknowns in the existing private dashboard; push packet hiring/research fields through the existing import (no contacts, no send).

Do **not** start: people waterfalls, Claygent-as-agent, credit meters, recipe marketplace, auto-DM, inferred pricing, global scores, login scrape.

---

## 3. First slice (today)

**Goal.** Smallest Clay-shaped object that is useful: given exact `company.id`, assemble a read-only private packet from files we already have. No network. No directory-refresh. No catalog write. No score/state/consent/intro authority.

**Schema** `demigod.company-packet/1`:

```text
companyId
asOf { mapGeneratedAt, ledgerUpdatedAt, signalsAt, researchedAt }
identity { id, name, domain, website, source, sourceUrl }
hiring { status, openRoles, openRolesAt, atsSource, jobsUrl, roleMix }
roles[] ≤25  { title, url, location, employerDepartment, employerOffice,
               workplaceType, employmentType, nativeDeadline,
               firstSeen, lastSeen, closedAt, nativePostedAt, nativeDateField }
signals { firstObservedToday, closedToday, reopenedOpen }   # from demigod-signals/3
research                    # projectCompanyResearch or null
unknowns[]                  # { field, reason }  unknown is valid
evidence[]                  # { field, url, quote } from projected research only
```

Identity is `company.id` only (not name). Unknown id → `{ status: "unknown" }`. Duplicate id in map → fail closed. Hiring quarantine still hides roles/jobsUrl. `postedAt` stays null unless `nativeDateField === "first_published"`.

**Files**

| Path | Change |
|---|---|
| `demigod-company-packet.mjs` | **new** — `buildCompanyPacket(...)`, CLI `show --id=`, `--selftest` |
| `demigod-evidence.mjs` | reuse `projectCompanyResearch` only |
| `demigod-role-ledger.mjs` | reuse `boardsFromMap` |
| `demigod-recruitai-seed-pack.mjs` | read-only load of `demigod-signals.json` if present |
| `demigod-enrichment.mjs` | optional `packet --id=` façade (not required for done) |

Do not edit map, ledger, catalog, or export schema in this slice.

**Commands**

```bash
node demigod-company-packet.mjs --selftest
node demigod-company-packet.mjs show --id=yc:affirm
# fixture-only; no live fetch
```

**Tests (in `--selftest`, hermetic)**

1. Known fixture id → packet with identity + hiring + ≤25 roles; employer department present when the ledger row has it.
2. Unknown id → `status: "unknown"`; no invented website/roles.
3. Duplicate map id → throw / null; no merge.
4. Research: only accepted fields project; pricing absent; quote ≤20 words.
5. Signals attach when the signals doc has that `mapCompanyId`; missing signals file → zeros/null, not a crash.
6. Quarantine hides `roles`, `jobsUrl`, open count.
7. Ashby/Lever role with no `first_published` → `nativePostedAt` null (do not copy `publishedAt` / `createdAt`).
8. Packet object is never passed into `scoreMatch` (import/grep canary).

**Done when**

- `--selftest` exits 0.
- `show --id=` on a fixture prints `demigod.company-packet/1` with `unknowns[]` first-class.
- No network, no directory-refresh, no publish, no RecruitAI apply, no people fields.

Parent implements this slice next. Builds 2–6 wait on it.
