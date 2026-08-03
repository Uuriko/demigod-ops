# Data-enrichment backlog — grounded options

**Status:** options for potter to choose from, not a plan of record. Nothing here is a commitment,
a promise, or a strategy claim.
**Scope rule:** every item must produce **more attributable public facts** about companies and open
roles. Items violating `docs/die/CLAY-DIE-MULTI-AGENT.md` §5.5 permanent non-goals are excluded by
construction (no Clay clone, no recipe DSL, no graph platform, no brokered/login-gated/inferred
people data, no inferred product pricing, no global fit score).

**Grounding:** field availability below was probed live on 2026-07-30 against real Greenhouse
boards, not assumed. Where a field turned out to be unreliable, that is recorded as a trap.

---

## 0. What the market does (competitor scan, 2026-07-30)

| Player | What they sell | Relevance here |
|---|---|---|
| **Clay** | 150+ providers behind *waterfall enrichment* — try provider 1, fall through to 2… pay only on hit. ~78–80% email match rates. $100M ARR / $5B valuation 2025; shipped Audiences (intent unification), Web Intent, Sculptor (GTM analytics), Claygent (>1B research runs) | Waterfall is a **cost/coverage** pattern, not an evidence pattern. Adopting the *ordering* idea is cheap; adopting the *people-data* providers is a non-goal |
| **Coresignal** | Job postings + employee + firmographic + technographic + salary estimates; publishes freshness/quality metrics | Their public quality metrics are the bar for how we describe our own coverage |
| **Xverum** | >10M global job postings, daily refresh, enrichment pipelines | Refresh cadence is their headline. Ours is a *first-seen ledger*, which is a different (not better, different) claim |
| **People Data Labs / Revelio (4.1B profiles)** | API-first person data, workforce composition | **Excluded** — brokered people data is a permanent non-goal |
| **Apify / jobdataapi / Signalbase** | ATS scrapers over Greenhouse/Lever/Ashby into one deduped schema; "source attached to every event" | Closest to our ingestion layer. Their cross-ATS key convention `{ats_type}:{ats_id}` matches our `(provider, slug, jobId)` identity |

**The one capability difference worth noting factually:** most providers report the board's *posting
date*. We additionally hold an independent **first-seen observation** with fail-closed absence
semantics (a role only closes on a successful fetch that omits it). That is a different fact, not a
strategic claim — see [[demigod-role-ledger-0726]] semantics before describing it publicly.

---

## 1. Fields we already fetch and currently discard

Probed live on `boards-api.greenhouse.io`. These need **no new provider, no new network budget** —
the bytes are already in the response we parse today.

| # | Field | Evidence it exists | Value |
|---|---|---|---|
| 1 | `updated_at` vs `first_published` | both present on every Affirm role | "edited since first posted" vs "reposted" — distinguishes a stale req from a maintained one |
| 2 | `requisition_id` | present on 100% of sampled boards | distinct-requisition counting (**see trap below**) |
| 3 | `metadata[]` | 181/181 Affirm roles carry it, e.g. `{name:"External Department", value:"Finance"}` | employer-declared structured attributes, fully attributable |
| 4 | `departments[]`, `offices[]` | on the single-job endpoint | real function taxonomy from the employer instead of our regex |
| 5 | `application_deadline` | list endpoint | closing-soon signal |
| 6 | `data_compliance` | list endpoint | retention/compliance hints the employer declares |
| 7 | `ai_disclaimer` / `include_ai_disclaimer` | single-job endpoint | newer Greenhouse fields; employer AI-use disclosure |

### ⚠ Trap found while probing #2

`requisition_id` is **employer-freeform, not a guaranteed identifier**:

- Affirm `JR103863`, Anthropic `PIP-11677`, Anaplan `REQ #27298`, Algolia `2284-2` — real IDs
- **Airbnb**: `ONE` (×153), `MULTI` (×21), `MUL`, `TBD` — a *headcount hint*, not an ID

A naive `distinct(requisition_id)` reads Airbnb as "187 postings → 13 openings" (93% inflation),
which is false. Any use of this field needs a per-board validity gate that abstains to `unknown`
when values are not ID-shaped. **Unknown is a valid output; a fabricated dedupe is not.**

---

## 2. Role-level enrichment

| # | Item | Notes |
|---|---|---|
| 8 | Distinct-requisition count (gated, abstains) | §1 trap applies. Report postings AND distinct reqs separately; never silently replace the public count |
| 9 | Posting-edited signal from `updated_at` | pairs with observed-age; an old req edited yesterday ≠ an old req untouched |
| 10 | Employer department/office from `departments[]`/`offices[]` | replaces regex guessing with employer-declared fact |
| 11 | Employment type where the board declares it | quote-backed only |
| 12 | Remote / hybrid / onsite from structured location | extends existing `usPosted`; no inference from prose |
| 13 | Seniority band from title | bounded parse, evidence = the title string itself |
| 14 | Visa/sponsorship statements | **only** where explicitly stated, with quote + URL |
| 15 | Application route (ATS-native vs external redirect) | already partly enforced at ingress |
| 16 | Description content-hash → change detection | reuses the `textSha256` pattern from research verification |
| 17 | Compensation | **Greenhouse list endpoint does not expose pay.** Would require description parsing = inference. Recommend NOT doing this from prose. Re-probe Ashby/Lever for structured comp before considering |

## 3. Company-level enrichment (public, first-party)

| # | Item | Notes |
|---|---|---|
| 18 | Hiring velocity (opens/closes per week) | ledger already holds monotonic history — pure derivation, no network |
| 19 | First/last observed hiring window | same |
| 20 | Board-provider migration detection (Greenhouse→Ashby) | we already store board identity; a switch is a real observed event |
| 21 | Location footprint aggregated from role locations | observation, not headcount |
| 22 | Technographic extraction from JDs | quote-backed named technologies only; **label as "mentioned in a JD"**, never "uses" |
| 23 | Careers-page canonical verification | strengthens owner-evidence binding |
| 24 | No-agency policy yield | doc §4.1 #6 — improve quote/URL extraction; never invent "no TA team" |
| 25 | PeopleOps/recruiter presence | exists; positive-only, many zeros |
| 26 | Open-role-count trend | observation only. **Do not** present as headcount or growth |

## 4. Evidence and verification quality

| # | Item | Notes |
|---|---|---|
| 27 | Multi-day re-verify scheduler | doc §4.1 #7 — unlocks decay/absence metrics; also settles the parked `unverifiable` state |
| 28 | Per-field freshness surfaced in review | listed in spec §4.2 as not-yet-done |
| 29 | Quote-span character offsets for click-through | market is standardising on claim-level citation (§1.3 of INNOVATION doc) |
| 30 | Cross-source conflict detection per field | `conflict` status already exists; widen the inputs |
| 31 | Absence classification (closed vs board moved vs fetch failed) | partly exists; transport retry landed 2026-07-30 |
| 32 | Provider-order (waterfall) for *public* sources only | Clay's ordering idea, applied to first-party sources — not paid people data |

## 5. Public directory surface

| # | Item | Notes |
|---|---|---|
| 33 | Per-company crawlable page | biggest SEO surface we don't have. **Thin-content risk** — only for companies with real observed data |
| 34 | Filters by function / aging bucket / provider | directory UX |
| 35 | JSON/RSS feed of newly observed roles | cheap, genuinely useful, fully public |
| 36 | Sitemap for directory pages | pairs with #33 |
| 37 | Role-level public pages | **not recommended** — thin content at scale, duplicate of the employer's own posting |

## 6. Pipeline and ops

| # | Item | Notes |
|---|---|---|
| 38 | Poll cadence scheduler | doc §4.1 #1 — observed ages stay tiny until poll history grows; this gates #18/#19/#27 |
| 39 | Provider coverage expansion | doc §4.1 #8; no fake owners |
| 40 | Board auto-discovery from company sites | bounded, allowlisted fetch only |
| 41 | Identity/board dedupe hardening | doc §4.1 #10 |
| 42 | Per-provider cost/quota metering | prerequisite for the parked "cost sample preview" mechanism |

---

## Recommended order (why)

1. **#8 distinct-requisition count, gated** — a public-count correctness question, and the trap is
   already characterised. Highest value per line.
2. **#38 poll cadence** — nothing in §3/§4 produces interesting numbers until poll history grows.
3. **#9 + #10 + #3** — pure parse additions over bytes we already download.
4. **#18/#19** — derivations over the ledger, zero network.
5. **#35** — cheap public artifact.

Everything above is an option. Public-claim taxonomy and directory scope remain potter's calls
(see the unresolved directory-scope question in INNOVATION-AND-COLLABORATION §5).
