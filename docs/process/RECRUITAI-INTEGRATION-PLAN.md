# Integrating lalalune/recruitai-claude with Demigod

**Repo reviewed:** https://github.com/lalalune/recruitai-claude  
**Latest release (pinned):** [`v0.1.1`](https://github.com/lalalune/recruitai-claude/releases/tag/v0.1.1) · commit `2aa5021` · published 2026-07-29  
(previous review: `cb04965`; local mirror `/tmp/recruitai-claude`)  
**Also reviewed:** https://github.com/lalalune/recruit-ai `c4299cb` (stricter evidence-first research workbench)  
**Date:** 2026-07-29–30 · **Authors:** Grok (+ Claude/Codex review via bus)

**Desk CLI (2026-07-30):** `node demigod-recruitai-desk.mjs status|pack|refresh` · dash `/api/recruitai` · Tools tab card

---

## 0. Product fit (do not conflate)

| | **Demigod** | **recruitAI (Shaw)** |
|--|-------------|----------------------|
| Business | Marketplace: talent + startups, **10% on hire**, mutual yes | Contingency **agency** cold outreach to hiring companies |
| Default send | **Drafts-only** demand; auto-DM permanently off | Paced **Gmail send** after human review |
| Data plane | Website + local ops SQLite/JSON; public map CDN | **Local-only** Electron SQLite; never commits company data |
| Core unit | Matching intro / pilot | **Requisition** as the sales atom |

Integration is **signal + draft quality**, not “turn Demigod into a cold-email engine.” Shipping Gmail blast from Demigod demand would violate standing drafts-only policy unless the user reopens that product decision.

---

## 1. Overlap map (what each already does)

### Free discovery / hiring signal

| Capability | Demigod today | recruitAI |
|------------|---------------|-----------|
| Greenhouse / Lever / Ashby boards | `demigod-startup-jobs-enrich.mjs`, `demigod-ats-providers.mjs`, role-ledger | `src/main/sources/ats.ts` (+ SmartRecruiters, Workable, Workday) |
| YC public companies | map-data + free-ops YC | `ingestYc` / seeds |
| HN Who is hiring | `demigod-hn-hiring.mjs` (BADHOST hardened 2026-07-29) | `ingestHn` |
| Public SF map | `DEMIGOD-SF-STARTUP-MAP.json` → CDN atlas | company DB keyed by domain |
| Role age / posting age | `demigod-role-ledger.mjs report --posted` | `daysOpen`, `repostCount` on reqs |
| Directory orchestration | `demigod-directory-refresh.mjs` | pipeline `run.ts` source registry |

### Ranking / ICP

| Signal | Demigod | recruitAI |
|--------|---------|-----------|
| Open role counts | map `hiring` + jobs enrich | `openReqCount`, eng split |
| Stale reqs (days open) | role-ledger firstSeen / posted age | primary score component |
| Comp → fee estimate | partial (comp step tests) | **30% first-year fee** from Ashby/Lever bands |
| **No in-house TA** | not first-class | **`hasInhouseTa` / recruiterCount** (highest-leverage idea) |
| No-agency JD clause | positive-only evidence from supported ATS descriptions | `noAgencyDisclaimer` on reqs |

### Outreach

| | Demigod | recruitAI |
|--|---------|-----------|
| Draft generation | `bin/dg demand draft` + hygiene flags | template + optional LLM **body only** |
| LLM vs contact values | hygiene forbids fake counts | **structural ban**: draft table has no email column; model never sees address |
| Send | **refused** (drafts-only) | Gmail OAuth + governor + suppression |
| Evidence on claims | draftHygiene + role_count_source | FieldObservation / provenance badges |

---

## 2. Integration principles (Ponytail)

1. **Reuse Demigod SoR for discovery** — do not re-run a second full ATS universe inside Demigod website ship path.  
2. **Import scoring ideas, not Electron UI**, into Demigod demand/directory unless we deliberately productize an offline “GTM desk.”  
3. **Keep send outside Demigod demand** (or only via explicit future product flag). Prefer export → recruitAI for actual Gmail.  
4. **One provenance story** — every number in a draft must cite role-ledger / map / ATS fetch, same honesty rules as demand hygiene.  
5. **No second foot-core writer** for integration experiments; new code = `demigod-recruitai-*.mjs` or `docs/` + thin CLI.

### `v0.1.1` refresh adopted on 2026-07-29–30

The second review covered the 17 commits after `cb04965`, through tagged release
`v0.1.1` (`2aa5021`), plus the evidence-first `recruit-ai` workbench at
`c4299cb`. The useful delta was integrated into existing Demigod seams:

- the shared company canonicalizer now preserves CJK, Cyrillic, Arabic, and
  non-Latin combining marks while retaining the existing Latin accent fold;
- evidence `latest` publication is lock-serialized and monotonic by `endedAt`,
  so an older concurrent run cannot replace a newer receipt;
- citation checks now accept only the existing HTML-to-text projection from a
  successful HTTP response or the rendered-Markdown fallback; raw markup,
  script/attribute strings, inert templates, malformed/unclosed script or style
  blocks, and non-2xx bodies cannot certify a claim. This is static page text,
  not browser-computed visibility (titles and collapsed/hidden page sections
  remain eligible);
- the same fresh-green research receipt now gates review-only matching context,
  so stale, failed, or missing benchmark evidence withholds benchmark and
  catalog claims without hiding independent map or role-ledger evidence;
- committed preview consumption now binds that exact current benchmark run ID
  and completion time plus the parsed operational-catalog hash, so a fresh
  replacement seal or same-path catalog rewrite cannot inherit stale green;
- export and partner-preview validation reject bidi/zero-width controls,
  oversized structured values, unsafe domains, non-canonical ATS job IDs, and
  undeclared graph/research fields;
- relationship validation now requires exact typed role scalars and lifecycle
  dates, exact Personio `/job/<jobId>` routes, role-local policy URLs, and
  per-board policy-evidence counts;
- positive `quarantineHiring` evidence now abstains at partner selection instead
  of being treated as an ordinary open-role signal;
- the existing sealed-export → `import-sourcer` primary-loop self-test now
  isolates every transition receipt and runs in both verification and ship
  gates; it did not require a second harness;
- live paid enrichment has one dedicated fail-fast run lock, preventing
  concurrent CLIs from spending the same capped provider calls while dry runs
  remain lock-free; unsafe, local, or private Firecrawl targets are rejected
  before cache creation or provider-process spawn;
- a resumability regression pins the existing filter-before-limit behavior:
  once the first enrichment row is cooled, a `limit:1` second pass advances to
  the next eligible row.
- active-role rows and graph edges now require observation on the export's
  current ledger day; an unclosed role left behind by a failed board fetch
  remains historical evidence but cannot become a current hiring signal;
- committed selection and import bind both the current role ledger and startup
  map to the export generation, refusing either source when its identity or
  filesystem timestamp moved after export;
- the pure automated match decision is regression-tested against the actual
  `research`, `companyResearch`, `companyEvidence`, and `quarantineHiring`
  sidecars; existing pair and intro gates remain the owners of consent and
  action safety;
- non-WIZ CRM role projection now carries the existing matcher's outcome,
  compensation, location, skills, stage, and sample constraints; automated
  proposal tests isolate private latest receipts, and stale match-review
  receipts no longer override newer canonical pair or dashboard evidence.

Demigod already had per-hop public-URL checks, deterministic draft projection,
fresh-input evidence seals, and no automatic send path, so the upstream Electron
UI, Gmail governor, contacts pipeline, and duplicate prompt layer were not
copied.

---

## 3. Recommended integration phases

### Phase A — Read-only export only (narrowed after Claude + Codex review 2026-07-29)

**Goal:** Demigod map + role-ledger → provenance-backed rows for offline GTM / future recruitAI import.  
**No score port. No fee. No contacts. No demand body rewrite in the same patch.**

Reports: `/tmp/dg-busy/claude-recruitai-integration.md`, `/tmp/dg-busy/codex-recruitai-integration.md`.

1. **Export pack only**  
   - CLI: `node demigod-recruitai-export.mjs [--top N] [--json]`  
   - Join map ↔ ledger **only** on exact `(provider, slug)` from `jobsUrl` / ledger keys (export or use `boardFromCompany`). `boardFromCompany` first binds each of the seven supported provider labels to its native HTTPS host and canonical board path; arbitrary/lookalike hosts, credentials, ports, query/fragment routes, nested provider subdomains, and job-detail paths cannot mint provider identity. At ledger ingress, each role URL must also bind to its provider/slug/job route or the reviewed company owner; malformed links and mismatched policy quotes are stripped without manufacturing a role closure.  
   - Schema `demigod.recruitai-export/3` with table fields:  
     `mapCompanyId, domain, name, boardKey{provider,slug}, openReqCount, firstObservedTodayReqCount, firstObservedTodayOlderPostedReqCount, closedTodayReqCount, reopenedOpenReqCount, attributedPostedReqCount, staleAttributedPostedReqCount, evergreenAttributedPostedReqCount, maxAttributedPostedDays, maxObservedOpenDays, staleObservedReqCount, sample role title/URL, jobsUrl, sourceLicense, sourceUrl, retrievedAt, ageBasis:"observed-first-seen"`  
   - Reuse the accepted DIE projector as an optional `companyResearch` evidence cell. It contains only benchmark/catalog claims that already passed the shared field policy **and only while the sealed live benchmark receipt is fresh green**; stale/red/missing evidence leaves hiring rows intact but makes every research cell `null`. Benchmark claims are labeled `live_replayed`; catalog claims are explicitly `catalog_not_live_replayed`, with the exact catalog input hash recorded. The committed consumer also requires the exact current seal identity and parsed catalog hash. Pricing stays withheld.
   - Provider routing reports selected company/open-role coverage per provider; the canonical ledger poll reports per-provider boards, successes, failures, and returned role counts. The shared ingress accepts at most 2,000 roles and 500,000 normalized descriptive characters per board, bounds every ID/title/location/URL, rejects duplicate IDs and duplicate nonempty normalized URLs, and treats any malformed observation as failed so it cannot false-close prior roles. Duplicate sibling board identity remains first-observation-wins.
   - Poll, purge, and report reuse one strict ledger loader: exact schema, role-key identity, bounded display fields, booleans, lifecycle date order, reopen count, and native dates are mandatory. Missing, corrupt, and wrong-shaped ledgers fail instead of projecting an empty history.
   - Change signals reuse ledger facts instead of a second delta store: first observed today, the exact subset with an older trusted Greenhouse `first_published` date, closed today, and currently open after a prior reopen. `changeBasis:"ledger-observation"` prevents first observation from being described as a new posting; Lever `createdAt` and other untrusted native fields do not become posting claims, and a closure is successful provider absence, not a hire. A board that just became empty remains visible for that closure day; zero still means no observed signal, not proof of no hiring.
   - Posting-age columns reuse the same `postedDaysAgo()` honesty boundary: coverage and 45–365 day stale counts use only Greenhouse `first_published`; roles older than 365 days are separated as evergreen, and the bounded max/sample exclude them. This evidence remains separate from observation age and does not change ordering.
   - PII-free relationship projection: company → native-route-bound ATS board (with first-party owner evidence where available) → provider/open role and company → accepted claim → exact public source, with stable node/edge IDs and no score authority. Validation binds every role URL to its board/job identity or an existing reviewed company-owner alias, reconciles typed role fields, lifecycle dates, per-board policy-evidence counts, bounded omissions, and graph counts, rejects nested forbidden fields, contact-shaped/control/unbounded descriptive text, and hidden descriptive links, and binds the full accepted-research envelope to its exact verification receipt. Exact allowlisted public URL fields remain structured.
   - Bound the graph to the 25 oldest-observed roles per board; keep full `openReqCount` in the table and report `openRolesAvailable` / `openRolesOmitted`.
   - Export `openPeopleOpsReqCount` plus one public-role evidence link as a positive signal only. A zero count is unknown, never proof that no in-house talent team exists.
   - Export `noAgencyEvidenceReqCount` plus one ≤20-word public-role quote/URL only when a supported ATS description explicitly refuses unsolicited agency submissions. Zero is unknown; failed board fetches preserve prior evidence. The bounded pack also carries a global exception diagnostic so a policy row outside `--top N` is not hidden.
   - **Forbidden fields:** score, estimatedFee*, email, phone, persona, Gmail, send.  
   - **Age honesty:** never rename observed-first-seen as “posted”; `postedDaysAgo` only if ledger already attributes Greenhouse `first_published`.  
   - Outputs: rich JSON graph at `/tmp/dg-busy/recruitai-export/latest.json` and the same selected rows as a private flat table at `latest.csv`; both resolve through one publish-locked atomic private generation pointer, are mode `0600`, and are hash-bound by `commit.json`.  
   - Review preview: `node demigod-lead-sourcer.mjs --type=partners --limit=10 [--offset=N]` resolves the default generation once, confines it to the private generation root, verifies its directory/file modes plus exact JSON/CSV commit hashes, then validates the complete export before reading it. It also requires export/change/ledger dates from the current UTC day, exact current startup-map and canonical-ledger identities, no later source mtime, the exact current fresh benchmark seal, and the parsed operational-catalog hash, so next-day reuse and same-day input rewrites refuse. It preserves export order, admits only exact `yc:` / `YC-public` rows with open roles, exact-dedupes normalized company names against the CRM, and abstains on positive no-agency evidence. Only exact agent-authored `junk-aggregator-or-fragment` tombstones whose every present lifecycle mirror is `disqualified` are omitted from dedupe; active rows, conflicting mirrors, policy holds, opt-outs, and manual disqualifications remain blockers. Its mode-`0600` output maps only public company/role provenance plus exact ledger-change, attributed posting-age, and positive PeopleOps-role `reviewSignals`; descriptive company/title text is contact-scrubbed while structured IDs/domains/URLs/provenance remain exact, and zero PeopleOps roles stays unknown. A reconciled `selectionReceipt` separates eligible rows before, inside, and after the deterministic review window, mutually exclusive abstentions, and any rows omitted by an explicitly capped ad hoc export. The registered exporter is uncapped; the preview does not alter the CRM, queue, drafts, scores, or sends.
   - Exact promotion: `node demigod-funnel.mjs import-sourcer --id=yc:slug [--apply]` ignores the mutable preview and overrides, revalidates the committed generation plus current CRM eligibility, and defaults to a byte-stable dry run. Explicit `--apply` can add only one contact-free `sourced` public company/role projection. Exact current imports are byte/log-idempotent; the CRM row and transition log commit or roll back together. The CRM must be a non-array object with both `partners` and `talent` arrays, and a transaction snapshot treats only `ENOENT` as absence, so an unreadable or raced existing log aborts before commit. Source drift, altered imports, existing CRM blockers, positive no-agency evidence, unsafe sources, and commit hash mismatches refuse without downstream draft, queue, score, consent, fee, approval, pair, or send authority.
   - Fail-capable `--selftest`: collision, name-only join, missing provenance, forbidden fields.

2. **Score / fee / agency 1–10** — **out of Phase A** (Codex BLOCK, Claude disagree).  
   Demigod data cannot feed recruitAI’s five score components without inventing constants; fee 30% must not touch Demigod drafts or public site. If ranking is needed, sort by ledger facts as **role-aging order**, never “agency score.” The separate private candidate matcher accepts only exact current location/availability options, bounded control-safe constraints, valid email/HTTPS-resume structure, and excludes contact, identity, and protected terms from score/evidence; unknown location earns no fit credit. Those rules do not project candidate data into this export.

3. **Demand draft evidence** — **delivered as structured review metadata**.  
   `bin/dg demand draft --json` and demand status expose safe source URLs, verification freshness, quantified-role claim metadata, and an exact map identity only when a source URL matches one canonical `jobsUrl`, `sourceUrl`, or `website`. Ambiguous identity fails closed. Draft bodies, recipients, ranking, and delivery state are unchanged; no address is added to the evidence object. Intro, pair, pilot, funnel, and founder-draft writers reuse one bounded single-line projector that removes controls/bidi, escapes Markdown structure, and permits only standalone credential-free HTTP(S) links, preventing untrusted form or CSV values from minting headers, approval/consent markers, or duplicate sections.

**Exit:** exporter selftest green; `latest.json` validates with jq contract; demand send boundary unchanged.

### Phase B — Optional offline “GTM desk” (later)

- Run **recruitAI Electron** as a separate process on the laptop (not website).  
- Feed it Phase A export (CSV/JSON import adapter — small PR upstream or local fork).  
- Gmail send stays **only** in recruitAI, never in `demigod-demand` send.  
- Document Cal. BPC §17529.5 constraints from their PLAN.md (public WHOIS, named agency).

### Phase C — ATS surface expansion (optional)

- Workable discovery is delivered through its existing public adapter and accepted only when Workable's own `llms.txt` names a matching company website.
- Exact Work at a Startup job pages now use the existing lead collector's bounded structured
  payload path; it does not become another ATS adapter or generic homepage scraper.
- Exact preconfigured SmartRecruiters, Recruitee, and Personio boards can use their existing
  bounded public adapters; automatic discovery remains out until an equally strong
  first-party owner join exists.
- Share denylist / BADHOST lessons both ways (Demigod HN hardening already improved).

### Explicit non-goals (now)

- Merging Electron into Demigod monorepo.  
- Auto-send from Demigod demand.  
- LinkedIn cookie injection (recruitAI itself deprioritizes; legal risk).  
- Putting agency 30% fee language on trydemigod.com.  
- Paying verifiers/Clay from Demigod website budget without a separate product decision.

---

## 4. Concrete file / command sketch (Phase A)

```
demigod-recruitai-export.mjs     # map + role-ledger + jobs → /tmp/dg-busy/recruitai-export/
demigod-agency-score.mjs         # pure score port (optional; can start as subset)
docs/process/RECRUITAI-INTEGRATION-PLAN.md  # this file
bin/dg tools registry entry: recruitai-export
```

Verify:

```bash
node demigod-directory-refresh.mjs   # or lighter: map-data + role-ledger report
node demigod-recruitai-export.mjs
bin/dg demand draft --name=T0 --json   # after enrichment hook
npm run demigod:verify:source          # no foot thrash required
```

---

## 5. Open questions for Claude / Codex

1. **Score port:** reimplement 1–10 agency score against Demigod role-ledger only, or keep scoring inside recruitAI after export?  
2. **Import direction:** Demigod→recruitAI only, or also pull approved companies back as demand queue seeds (drafts-only)?  
3. **hasInhouseTa:** only the positive public-role signal is exported; zero remains unknown unless a separate reviewed source supports the claim.
4. **Fee language:** keep agency score internal-only forever?  
5. **Phase B:** is Electron on this laptop desired, or Phase A export enough for current GTM?

---

## 6. Peer review protocol

| Agent | Ask |
|-------|-----|
| **Claude** | Architecture / honesty: does Phase A violate drafts-only or invent claims? Touch list? |
| **Codex** | PASS/BLOCK Phase A design; list risks (license, double sources, score misuse on public site) |
| **Grok** | Implement Phase A after dual PASS or adjudicate conflicts |

Reports expected:

- `/tmp/dg-busy/claude-recruitai-integration.md`  
- `/tmp/dg-busy/codex-recruitai-integration.md`  

---

## 7. Bottom line

**Best integration:** treat recruitAI as the **agency GTM desk** (local send + review UX) and Demigod as the **public matching product + free hiring graph**. Connect them with a **read-only export + scoring ideas + demand draft evidence**, not a code merge or shared auto-emailer.

Highest-leverage single idea to steal first: **`stale open req × no in-house TA × fee potential`** ranked queue for demand drafts, powered by Demigod’s existing role-ledger + map.
