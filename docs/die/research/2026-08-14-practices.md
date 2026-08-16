# DIE research brief — 2026-08-14

Internal research for Demigod's DIE (company/role intelligence layer).
Read-only. No repos edited. Live web + existing DIE recon (`sf-directory-2026-08-14.md`).

**What DIE is:** a Clay-*inspired* internal layer that helps a human answer, for this role and this candidate: which *public* company/hiring facts are useful, what evidence supports them, and what is unknown.

**What DIE is not:** a Clay clone, people-data broker, recipe DSL, public research SaaS, email/phone finder, auto-DM tool, or Phase-2 match-review packet factory.

Allowed sources: attributable public facts on companies and open roles (ATS boards, YC, Wikidata, HN Who-is-Hiring, first-party sites).
Forbidden: guessed emails/phones, login-gated scrape, brokered people data, inferred pricing, global fit scores, auto-DM, Phase-2 packets until an accepted-for-delivery role exists.

---

## 1. How vendors describe quality / freshness (copy the *honesty*, not the product)

Vendors sell coverage theater. The useful part is the *metric vocabulary* they are forced to invent so buyers can tell a live board from a stale dump.

### Clay (2026 CRM / waterfall guides)

Clay's 2026 docs treat enrichment as a **loop**, not a one-shot append. Decay is the stated problem: B2B records go stale ~3–5% per month; an untouched year is wrong about a third of the time. The honesty metrics they (and third-party bake-offs) actually use:

| Metric | What it means | DIE analog |
|---|---|---|
| Verified match rate | % of records confirmed by spot-check or a verification rule | % of company/role facts with a live source URL + retrievedAt |
| Safe writeback rate | updates that do not duplicate or clobber a trusted field | empty/uncertain ATS poll never overwrites a good `openRoles` / website |
| Refresh reliability | scheduled runs that actually complete | directory-refresh exit 0 + completeness guard |
| Freshness window | last-verified date inside N days (Revnu bake-off used 90d) | `openRolesAt`, `firstObservedAt`, map `generatedAt` — never one stamp for all three |
| Cost per *usable* record | spend / records that pass verification | irrelevant as product; useful as "don't pay a broker for a fact we can GET" |

Clay's own waterfall rule we *should* steal as honesty: **stop at the first confident result; a stale or uncertain result never clobbers a good field.** Clay's own waterfall rule we must *not* steal as product: chain 100+ people-data providers (Hunter, Wiza, Apollo, ZoomInfo, PDL) until an email or phone appears.

Sources: [Clay waterfall enrichment 2026](https://www.clay.com/guides/waterfall-enrichment), [Clay CRM enrichment 2026](https://www.clay.com/guides/crm-enrichment-guide), [Revnu 1,000-lead bake-off](https://revnu.partners/blog/b2b-data-enrichment-tools).

### Coresignal (jobs API + Jun 2026 multi-source essay)

Coresignal's quality frame is the one DIE should quote internally. They refuse volume-as-quality and list five questions a buyer should ask:

1. Does the provider collect from boards **and** career pages **and** ATS?
2. How often are *active* jobs refreshed?
3. Are active jobs **revisited within 24h**?
4. Is historical data available (they claim 2020+)?
5. Are cross-posted roles **deduplicated**, and are they **resolved to a real company**?

Their Multi-source Jobs API data dictionary already separates the clocks DIE must keep separate:

| Field | Meaning |
|---|---|
| `created_at` | when *their* job record was first created (observer first-seen) |
| `updated_at` | when *their* record last changed |
| `date_posted` | employer/source posting date — they warn a fraction are **future-dated**, "as provided by the originating source" |
| `job_sources[].updated_at` | last update **from that source** |
| `status` / `job_id_expired` | cluster-level active / expired / deleted; expired never flips back to 0 |

Copy: revisit SLA, per-source `updated_at`, explicit "source date may be wrong/future", entity resolution as a named step, dedup of cross-posts. Do not copy: recruiter PII, applicant counts, "urgent hire" flags, professional-network employee graphs.

Sources: [Coresignal multi-source jobs, Jun 2026](https://coresignal.com/blog/multi-source-jobs-data/), [data dictionary](https://docs.coresignal.com/jobs-api/multi-source-jobs-api/data-dictionary-multi-source-jobs-api), [jobs data explained, Feb 2026](https://coresignal.com/blog/expert-answers-jobs-data-explained/).

### Xverum (2026 jobs/company datasets)

Xverum's public claim set is thinner and more marketing: 9M active jobs, **daily refresh**, "new posts within 24h of going live", company refresh "as fast as 24 hours for priority segments", "98% accuracy", GDPR/CCPA, open-web sourcing. Their LinkedIn (Feb 2026) line is the useful one: **"freshness isn’t just a technical spec, but also a contextual SLA."**

Copy: name a revisit SLA and say which segment gets it. Do not copy: people datasets (750M professionals), "near-100% coverage", connected people+jobs+POI graphs, or any accuracy % we cannot recompute from our own ledger.

Sources: [Xverum jobs datasets](https://www.xverum.com/jobs-datasets/), [Xverum company datasets](https://www.xverum.com/company-datasets/), [Xverum about](https://www.xverum.com/about/).

### Apify / job-board actors (2026)

The Apify ecosystem is where the *operational* honesty language is best. Three patterns worth adopting as DIE hygiene, not as a scraping product:

- **Daily canary + schema version + `_scrapedAt`.** FreshActors (last verified 2026-08-03): a scheduled canary hits a known Greenhouse board and a known Lever board, alerts on parse change, patches same day, changelogs it. Missing ATS fields come back `null`, not omitted. Honest-failure: if *no* requested board fetched, the run **fails loudly and names them** instead of "success, 0 results."
- **Change tracking with first_seen / last_seen.** i-scraper and JobStream (`brebiv/jobstream`) emit `is_new` / `is_modified` / `status` plus `first_seen` / `last_seen`. JobStream's `maxExpiryPct` (default 50) **refuses to expire a board** if a run would close more than that share of a ≥10-job board — the truncated-response guard.
- **Never bill / never report empty on a failed fetch.** JobStream: a failed board is skipped, not expired, not billed. FreshActors: dead/renamed/private boards are isolated and listed.

Copy: canary, schema version, scrapedAt, null-not-omitted, failed-fetch ≠ empty, mass-expiry guard. Do not copy: pay-per-job marketplace, bundled 900-company registries as "our inventory", seniority/tech-stack inference sold as fact.

Sources: [FreshActors GH+Lever scraper](https://apify.com/freshactors/greenhouse-lever-jobs-scraper), [JobStream](https://apify.com/brebiv/jobstream), [ATS jobs scraper](https://apify.com/i-scraper/ats-jobs-scraper), [six ATS endpoints, Aug 2026](https://dev.to/udaninn/six-ats-platforms-publish-their-job-boards-as-open-json-here-are-the-endpoints-2d3k).

---

## 2. First-seen vs employer `postedAt` — do not conflate

This is the single most common lie in job data. Three clocks, three jobs:

| Clock | Who owns it | Use for | Never use for |
|---|---|---|---|
| **Employer posted / first_published / date_posted** | the ATS or the employer | "the board says this went up on D" | incremental sync, days-open, "new today" in *our* feed |
| **Observer first-seen / date_created / created_at** | DIE's ledger | incremental sync, "we first observed this on D", knowable lifetime | claiming the employer posted it that day |
| **Last-seen / last observation / became_inactive** | DIE's ledger | "still on the board as of D", detected close | claiming the employer closed it at that instant |

Fantastic.jobs (docs last modified 2026-07-22) says it cleanly: `date_posted` = what the source site says; `date_created` = when *they* first indexed (always populated, monotonic — use for sync); the two **diverge on backfill and on newly added boards**. They also note some ATS rewrite `date_posted` constantly; they ignore a "new" posted date unless it is older than 14 days.

ATSRadar (2026) measures *observed* opening speed, not employer-side duration, and labels `postedAt` as **coverage context only** because completeness is mixed. Field contract: first seen = `created_at`, last seen = `last_seen_at`, inactive = `became_inactive_at`. Time-to-inactive is exact to *detection*, not to the employer's click.

Glitchbound (2026) is the ledger recipe DIE already half-implements:

```
PRIMARY KEY (platform, boardToken, jobId)
firstSeen, lastSeen, closedOn
```

Three ways this goes wrong, all of which DIE must refuse:

1. **A failed fetch is not a closure.** Only diff boards that answered completely this run.
2. **A truncated page is the same bug.** Track per-board completeness, not HTTP 200.
3. **`daysOpen = closedOn - firstSeen` invents a number** if the job was already there on the day you started watching. Knowable only when `firstSeen > board_first_seen`. A company's `closed30` must be *absent* until you have watched 30 days — not `0`.

Ghost-job detectors (WhenThisJobWasPosted) add a fourth clock: Wayback first-capture. If the page says "posted 2 days ago" and the archive first saw the URL 4 months ago, it is a refresh. DIE should *flag the conflict*, not pick a winner.

**DIE today:** `roles-feed/1` already states the contract in `basis`: "first observation on a public ATS board by Demigod; postedAt is the employer date where attributed (Greenhouse first_published), else null." 79/120 rows have employer `postedAt`; 41 (Ashby/Lever in that snapshot) correctly leave it null. All 120 have `firstObservedAt: 2026-08-06` because observation history is 2 days — so **none of those 120 "new" rows have a knowable lifetime**. That is honest. Do not "fix" it by copying `firstObservedAt` into `postedAt`.

Sources: [Fantastic.jobs time fields](https://developer.fantastic.jobs/documentation/time-fields), [ATSRadar opening speed](https://atsradar.com/blog/how-fast-job-openings-actually-move), [Glitchbound closures](https://dev.to/glitchbound/how-to-know-which-job-postings-were-removed-when-nothing-tells-you-4aoc), [WhenThisJobWasPosted](https://whenthisjobwasposted.com/about).

---

## 3. ATS public JSON — reliable fields vs traps

These endpoints exist so companies can embed their own boards. They are documented, unauthenticated, and the right source. Login-gated Harvest / Lever authenticated APIs are out of scope.

### Greenhouse — `GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs`

Official contract ([Job Board API](https://developers.greenhouse.io/job-board), [jobs.md](https://github.com/grnhse/greenhouse-api-docs/blob/master/source/includes/job-board/_jobs.md)):

| Field | Reliable? | Notes |
|---|---|---|
| `id` | **Yes — job-post key** | Unique per *post*. Use this in the ledger PK. |
| `internal_job_id` | Yes, with care | Unique per *job*. One job, many posts (locations, languages). Prospect posts have `null`. |
| `absolute_url` | Yes | Actionable link. Drop the row if it is not `http(s)`. |
| `title` | Yes | |
| `first_published` | **Yes — employer postedAt** | On the list payload (Aug 2026 live keys) and the single-job payload. This is the date to attribute. |
| `updated_at` | Yes as *board edit*, **trap as postedAt** | Any edit, republish, or metadata tweak. Harvest added `first_published_at` to Job Posts in May 2019 precisely because `updated_at` is not first publish. |
| `location.name` | Weak | Often just "Remote" / "Hybrid"; city lives in `offices[]` or `metadata`. |
| `departments` / `offices` | Only with `?content=true` **or** `/departments` join | List-without-content has **no department**. Silent empty department looks like the company didn't fill it in. |
| `content` | Only with `?content=true` | HTML, **double-entity-encoded**. Decode once. |
| `requisition_id` | **Trap** | See below. |
| `application_deadline` | Optional | Fine to store, not a close signal. |
| `metadata[]` | Employer-defined | Workplace type sometimes lives here, not on `location`. |

**`requisition_id` ONE / MULTI trap.** Greenhouse's own support article is the model: a *requisition* is the configured job (scorecard, team, interview plan, one-or-many *posts*); an *opening* is a seat. One requisition may have many openings and many posts. Harvest describes `requisition_id` as **"an arbitrary ID provided by an external source; does not map to another entity in Greenhouse."** Live boards put junk in it. The Airbnb sample from a 2026 Greenhouse scraper is the exhibit: `"requisitionId": "ONE"` — that is an opening-type flag (one seat vs multi-seat), **not a unique key**. Deduping or joining on `requisition_id` collapses unrelated posts (and, on boards that stamp `ONE`/`MULTI` on every row, collapses the entire board into two buckets).

Ledger PK for Greenhouse: `(greenhouse, board_token, job.id)`. Optional *display* of `requisition_id` when it looks like a real req (`R-12345`, `50`), never as identity. Never treat `ONE`/`MULTI`/`null` as identity.

Also: `?content=false` (or omitting it) plus a later "lean" parse has already bitten FreshActors — they shipped a 2026-06-06 fix because turning descriptions off **silently nulled `department` and `allLocations`**. DIE's enrich path must always fetch the full board for counts/depts, then drop body text if it wants a lean feed.

### Lever — `GET https://api.lever.co/v0/postings/{token}?mode=json`

| Field | Reliable? | Notes |
|---|---|---|
| `id` | Yes | Ledger PK. |
| `text` | Yes | This is the **title**. There is no `title`. |
| `hostedUrl` / `applyUrl` | Yes | |
| `categories.{location,team,department,commitment,allLocations}` | Yes, nested | Primary location is also inside `allLocations`. |
| `workplaceType` | Yes when set | `unspecified` \| `on-site` \| `remote` \| `hybrid`. Not filterable. |
| `createdAt` | **Trap if you parse it as ISO** | Epoch **milliseconds** (demo board historically looked like microseconds). Greenhouse/Ashby are ISO 8601. A naive parse yields year ~47,000,000 and a "posted last 7 days" filter that **silently returns nothing**. |
| `updatedAt` | Often absent | FreshActors sample: `updatedAt: null` on Lever. Do not invent. |
| `salaryRange` | Optional | Only when the employer published it. |
| Pagination | **Trap** | `skip`/`limit`, default limit 100. Same silent-truncate class as SmartRecruiters. |
| Region | US vs EU | `api.lever.co` vs `api.eu.lever.co`. |

Lever has no public `requisition_id`. Do not map Greenhouse `requisition_id` onto Lever rows.

Sources: [Lever postings API README](https://github.com/lever/postings-api/blob/master/README.md), [createdAt issue #35](https://github.com/lever/postings-api/issues/35), [zsevic Lever notes](https://dev.to/zsevic/integration-with-lever-public-jobs-api-2mnn).

### Ashby — `GET https://api.ashbyhq.com/posting-api/job-board/{token}` (docs updated 2026-05-26)

| Field | Reliable? | Notes |
|---|---|---|
| `id` | Usually present | Fallback `title:publishedAt` is a last resort, not a PK. |
| `title`, `jobUrl`, `applyUrl` | Yes | |
| `isListed` | **Yes — filter** | `false` = unlisted, direct-link only. Do not put on a public feed. |
| `isRemote`, `workplaceType` | **Best of the three** | Enum: `OnSite` \| `Remote` \| `Hybrid`. Use the flag; do not regex the location. |
| `publishedAt` | **Trap vs first-published** | Official text: "ISO DateTime when the job was **last published**." A republish resets it. That is *not* Greenhouse `first_published`. Store as `boardUpdatedAt` / `lastPublishedAt`, leave `postedAt` null unless we have a first-publish we trust. |
| `secondaryLocations` + `address.postalAddress` | Yes | Structured city/region/country when filled. |
| `compensation` | Only with `?includeCompensation=true` | Ashby is the only one of the three that publishes structured bands consistently (Ramp: ~115/121 in the Aug 2026 live check). Still employer-disclosed, never inferred. |
| `employmentType` | Yes when set | `FullTime` \| `PartTime` \| `Intern` \| `Contract` \| `Temporary`. |
| Missing fields | Official | "Where some piece of this data is missing in Ashby, it will also be missing in this response." |

DIE's Aug 6 roles-feed already does the right thing on Ashby: `postedAt: null`, `boardUpdatedAt: null`. Keep it. Do not "improve" coverage by copying `publishedAt` into `postedAt`.

Source: [Ashby public job posting API](https://developers.ashbyhq.com/docs/public-job-posting-api).

### Cross-ATS traps (Aug 2026 live write-up)

- **Wrong SmartRecruiters token → HTTP 200 + empty list.** `Bosch` is empty; `BoschGroup` is 4,753. "Not on SmartRecruiters" and "you spelled it wrong" are indistinguishable. Same class as a valid Greenhouse/Lever/Ashby board with **zero openings**: that is a real answer (not hiring), not a miss, and must not fall through to the next ATS.
- **Workable / Recruitee windows closed.** A year-old "open JSON" tutorial is stale; some feeds now want a token. DIE already lists Workable/Personio/Recruitee/SmartRecruiters/Gem as optional enrich targets — treat auth-gated ones as *skip*, never as login-scrape.
- **One bad posting must not kill the board.** Isolate record build; require title + http(s) URL.
- **Remote is a regex guess on Greenhouse and Lever.** Only Ashby hands you `isRemote`. Label guessed remote as guessed.
- **Salary is the exception** except on Ashby. Greenhouse pay is per-job extra request and often absent (Stripe sampled none; GitLab 13/40). Never infer a band.

Source: [udaninn, Aug 2026](https://dev.to/udaninn/six-ats-platforms-publish-their-job-boards-as-open-json-here-are-the-endpoints-2d3k), [votiakov](https://dev.to/votiakov/most-company-job-boards-are-just-a-public-json-api-you-can-get-55g3).

---

## 4. How hiring directories stay honest

The honest ones do four things. Fake inventory is what happens when you skip any of them.

1. **Snapshot date on the surface, not only in the JSON.** YC Work at a Startup is continuously updated *as companies post*; third-party indexes still stamp a last-update (JobSiteDir: 2026-05-26). Demigod `/startups` already does this in the no-JS fallback: "Browse 501 companies with verified open roles in this 2026-08-02 snapshot." Keep the date in the *sentence*, not just `generatedAt`.
2. **Empty is a first-class state.** A valid board with 0 openings is "not hiring (as of D)", not "not found", not a reason to invent a sample PM / Founding Designer / Head of Growth. Demigod `/bounties` already ships an honest empty card. The directory must do the same for a company with `hiring=unknown` and no ATS hit.
3. **Self-report ≠ verified count.** YC "is hiring" / a jobs link is a self-report. DIE already encodes this: 583 companies have `jobsSource: "YC"` and **no** `openRoles` number. Do not mint one. Wellfound "Hot Startup" is editorial. HN Who-is-Hiring is a monthly thread, not a live board.
4. **Don't expire what you didn't successfully fetch; don't show stale copies of vanished jobs.** udaninn: key the snapshot to the exact query (change the company list → new baseline, or every dropped company "closes"); a disappeared job is reported from the snapshot as title+link, not a stale full record. JobStream's mass-expiry guard is the same idea.

Fake-inventory flags already written for this repo (do not regress): hand-added titles, homepage sample roles as inventory, `__dgPublicRoles` / 120-row feed as matching inventory, invented `stack` / neighborhood pins, YC self-report flipped to a count, Wikidata beer-company false positives, 365d+ evergreen Greenhouse reqs labeled "fresh", dual cards for one company.

Sources: [YC Work at a Startup](https://www.workatastartup.com/), [CTAIO YC jobs 2026](https://ctaio.dev/en/job-portals/yc-work-at-a-startup/), [udaninn change-detection](https://dev.to/udaninn/six-ats-platforms-publish-their-job-boards-as-open-json-here-are-the-endpoints-2d3k), existing `sf-directory-2026-08-14.md`.

---

## 5. Entity resolution — domain-first, not name-first

Name matching is how you merge Bolt (SF checkout, `bolt.com`) with Bolt (Estonian ride-hail, `bolt.eu`) and call it one account. Delpha (Jan 2026) calls this the **Homonym Trap**. The only B2B identifier that is globally unique, regulated, and available for ~all tech companies is the **registrable domain**.

Collision table to keep next to the matcher (Delpha 2026):

| Name | A | B | C |
|---|---|---|---|
| Bolt | bolt.com (fintech) | bolt.eu (ride-hail) | boltthreads.com (materials) |
| Branch | branch.io (attribution) | branch.com (insurance) | branchapp.com (wellness) |
| Frame | frame.io (video) | frame.com (framing) | |
| Sage | sage.com (ERP) | sagerx.com (biotech) | sage.ai (data) |
| Delta | delta.com (airline) | deltaww.com (electronics) | deltadental.com |
| Mercury | mercury.com (startup bank) | mrcy.com (defense) | mercurymarine.com |
| Atlas / Spring / Loom / Pilot / Ripple | same pattern | | |

Rules that survive contact with YC + HN + Wikidata:

- **Domain is the join key.** `website` → registrable domain (keep the TLD). `frame.io` ≠ `frame.com`. Do not strip to a "name stem."
- **Dummy / shared domains are not keys.** `google.com`, `tbc.com`, a careers-only host used as `website` (Snowflake-on-HN), a dead-host denylist entry (`afriexapp.com`) — treat as *missing website*, not as identity.
- **Name-only is the hard case, not the default.** Crustdata (May 2026): if you already have a domain, skip search and resolve on that domain. If you have only a name, candidates from web search + firmographics + a "no match" option. **Never force a match.** A queued unknown is cheaper than a confident wrong company.
- **Legal-name collisions are real.** "ABC Services LLC" in DE and CA are two entities. Geography or a domain is required. Registry number + jurisdiction is the compliance gold standard; DIE does not need KYB, but it *does* need to refuse the merge.
- **Parent vs subsidiary is a product choice, not a match.** Vauxhall is not General Motors unless a human said "roll up." DIE should keep the operating domain the candidate would work at.
- **YC name collisions.** Multiple YC companies are called Alpha or Level (Faingezicht). Batch + domain disambiguate; name does not.
- **Wikidata SPARQL is a recall source, not an identity source.** Almanac Beer Company (`wd:Q4733679`) is already a documented false positive on the SF map. Join Wikidata rows to YC/HN **on domain**, drop the rest or park them as `source: wikidata` with `hiring` unset.
- **Dual cards are the live bug.** HN `Snowflake` (website = careers URL, no description) sitting next to a richer YC/Wikidata Snowflake is two startups to a reader. Merge on domain; keep the thin HN row as a *source citation*, not a second pin.

Sources: [Delpha, Jan 2026](https://delpha.io/blog/b2b-identity-resolution-website-vs-name/), [Crustdata messy inputs, May 2026](https://crustdata.com/blog/company-entity-resolution-messy-inputs), [Faingezicht on ER](https://faingezicht.com/articles/2024/09/03/entity-resolution/), [Zephira on registry IDs](https://zephira.ai/entity-resolution-without-fuzzy-matching-how-registry-identifiers-solve-the-duplicate-problem/).

---

## 6. What "enrichment waterfall" means when you refuse people-data

Clay's 2026 definition, stripped of vendors: **a fallback chain, not a fan-out.** Order several sources, send the record to the first, keep the first *confident* answer, stop. The second source only sees misses. You are sequencing for "cheapest trustworthy first, broadest last," and the confidence threshold is the only real dial — strict for anything a human will act on, because a wrong value is worse than a hole.

Clay then fills that chain with Hunter / Wiza / Apollo / ZoomInfo / PDL / Claygent-on-LinkedIn. That is the product we are not building.

**DIE public-source waterfall** (company + open-role facts only):

| Step | Source | What it may fill | Stop when |
|---|---|---|---|
| 0 | Domain already on the row | identity | domain is non-dummy |
| 1 | First-party ATS JSON (GH / Lever / Ashby / …) derived from that domain | `openRoles`, `openRolesAt`, `atsSource`, `jobsUrl`, role rows | board fetched *complete* (0 is a valid answer) |
| 2 | YC official dump / Work at a Startup | stage, teamSize, sector, self-report jobs link | YC row matched **on domain** |
| 3 | Wikidata (sameAs / official website) | inception, description, HQ city | domain match, not label match |
| 4 | HN Who-is-Hiring (thread + month) | "said they were hiring in month M" | cite the comment; do not mint a count |
| 5 | First-party site (homepage / about / careers HTML *only if no ATS JSON*) | description, careers URL | attributable paragraph + URL |
| 6 | Stop | leave the field unknown | — |

Rules that make this a waterfall and not a slurry:

- **One field, one winner, one citation.** Do not average three headcounts. Do not "AI-merge" two descriptions.
- **Empty / 0 / unknown are different.** Empty = we did not look. 0 = we looked and the board was empty. Unknown = we looked and the source does not say.
- **No people-data provider in the chain. Ever.** No Clearbit-style person append, no Hunter infer-email, no PDL, no ZoomInfo, no "Claygent: does this person still work there."
- **No inferred pricing, no global fit score, no auto-DM.**
- **Verify-before-overwrite** (Clay's good habit): a miss or a stale poll does not blank a previously verified `openRoles` until a *complete* fetch says 0 / gone.
- **Unknown is a first-class output** of DIE. The human's job is to see the hole.

---

## 7. Durable rules DIE should adopt

1. **Three clocks, never one.** Employer `postedAt` / `first_published` ≠ observer `firstObservedAt` ≠ `lastSeen` / `openRolesAt`. The public feed already says this; do not let a UI or a "freshness score" collapse them.
2. **A complete successful fetch is the only thing that may close or zero a board.** Failed, timed-out, or truncated polls leave yesterday's state. Add a mass-expiry guard (JobStream's `maxExpiryPct` idea) before `directory-refresh` can wipe a live board.
3. **Knowable lifetime or null.** `daysOpen` / velocity / "closed in 30d" is absent until `firstSeen > board_first_seen` and the watch window covers the period. The Aug 6 feed's 2-day observation span means almost every "new" row is left-censored — keep saying so (`windowExceedsObservationHistory`).
4. **Ledger PK is `(provider, board_token, job_post_id)`.** Never `requisition_id`. Treat `ONE` / `MULTI` / empty / shared req IDs as non-keys. One Greenhouse `internal_job_id` may legally have many posts; do not collapse them.
5. **Parse ATS dates as the ATS defines them.** Lever `createdAt` = epoch ms. Ashby `publishedAt` = last published, not first. Greenhouse `updated_at` is an edit clock. When the field is missing, store null — do not copy another clock into it.
6. **Domain is the company key; name is a label.** Keep the TLD. Refuse dummy/shared/careers-only hosts as identity. Homonyms (Bolt, Branch, Mercury, YC Alpha/Level) stay split until a domain (or a human) joins them. Dual HN + YC cards for one domain are a bug.
7. **Self-report is not inventory.** YC "hiring" + jobs link ≠ `openRoles`. HN mention ≠ a live req. Homepage sample roles and `__dgPublicRoles` are not matching inventory. 0 openings on a valid board is a fact.
8. **Snapshot date belongs on the surface.** Every map, feed, and company card shows *as of {date}* for the fact it asserts. Generated-at ≠ published-to-CDN-at ≠ last-ATS-poll-at (live directory is already 8 days past generation; say it).
9. **Public-source waterfall only, stop at first confident attributable fact.** ATS JSON → YC → Wikidata → HN → first-party site → unknown. No people brokers, no guessed emails/phones, no inferred comp, no fit score.
10. **Safe writeback.** Empty enrichment never overwrites a populated field. Uncertain never overwrites verified. New values need a source URL + retrievedAt.
11. **Null, don't invent.** Missing department, workplaceType, salary, neighborhood, stack — omit or null. Regex-remote and title-derived `fn` are labeled as derived, not employer fields. One malformed posting cannot fail the board.
12. **Canary the parsers.** A daily hit on one known GH, Lever, and Ashby board, schema version on every record, changelog when an ATS shape moves. Silent empty-department / silent 0-from-a-500-error is the failure mode.

---

## 8. What we must not copy from Clay

- **The product shape.** Spreadsheet-of-providers, recipe DSL, credit meters (Data Credits + Actions), 150-provider marketplace, CRM-as-source-of-truth with Clay as the writeback loop.
- **People-data waterfalls.** Work-email and mobile-phone chains (Hunter, Wiza, Findymail, Apollo, ZoomInfo, Cognism, PDL, Prospeo, DropContact). Infer-email-from-name+domain. Catch-all verification as a feature.
- **Person monitoring.** Job-change schedules, "this contact left", Claygent prompts that confirm whether a *person* still works at a company from "public professional sources."
- **Coverage theater.** "40% → 80%" as a goal, near-100% fill rates, buying a worse source to close a hole.
- **Action at the bottom of the waterfall.** Sequencer push, auto-DM, HubSpot/Salesforce Update keyed on a person. DIE stops at a brief for a human.
- **Inferred or blended facts.** AI-filled revenue, headcount, "likely stack", global fit scores, guessed pricing.
- **Login-gated or ToS-hostile graph pulls.** LinkedIn scrape-as-enrichment (Clay documents this on paid plans). Out of bounds for DIE.

Steal only: waterfall-*as-fallback-chain*, verify-before-overwrite, scheduled refresh, "unknown > wrong", and the habit of stamping when a fact was last checked.

---

## 9. How this maps onto existing DIE

Live path (from `sf-directory-2026-08-14.md`, still true 2026-08-14):

```
YC-OSS + Wikidata SPARQL + HN Who-is-Hiring + DataSF
        → demigod-startup-map-data.mjs --with-jobs
        → demigod-startup-jobs-enrich.mjs          # ATS counts
        → DEMIGOD-SF-STARTUP-MAP.json              # map
        → demigod-role-ledger.mjs poll             # role ledger
        → demigod-directory-aging.mjs --enrich-map
        → demigod-roles-feed.mjs                   # roles-feed
        → demigod-directory-refresh.mjs            # one-command wrap
        → CDN pin → /startups + /map
```

Laptop SoR (not GitHub `demigod-ops`): `DEMIGOD-SF-STARTUP-MAP.json`, `DEMIGOD-ROLES-FEED.json`, `DEMIGOD-ROLE-LEDGER.json` (~10.8 MB), `DEMIGOD-DIRECTORY-AGING.json`. Scripts live on the laptop: `demigod-startup-map-data.mjs`, `demigod-startup-jobs-enrich.mjs`, `demigod-directory-refresh.mjs`.

### Map (`demigod.sf-startup-map/3`)

- 2902 companies. Identity today is a composite `id` (`yc:`, `wd:`, `hn:`) — **this is name/source-first, and it is why Snowflake and Almanac Beer happen.** Next increment: add `domain` as the join key, merge dual cards, park Wikidata-only rows that have no domain overlap.
- `hiring=yes` (978) mixes verified ATS (505 with `openRoles` + `openRolesAt: 2026-08-02`) and YC self-report (583). Rule 7: keep the split visible; never promote YC to a count.
- `openRolesAt` is the poll stamp (rule 1, clock 3). It is already 12 days behind "today" as of this brief — the surface must keep saying "as of 2026-08-02."
- Thin fields (website 38, description 304, stage/teamSize YC-only) are waterfall steps 2–5, not Claygent.

### Role ledger (`DEMIGOD-ROLE-LEDGER.json`)

- This *is* the observation ledger. It must own `firstSeen` / `lastSeen` / `closedOn` / `fetchComplete` / `boardFirstSeen`. Closures only from complete polls (rule 2). `daysOpen` null when left-censored (rule 3).
- PK = `(provider, board, job id)` (rule 4). Greenhouse `requisition_id=ONE` must never collapse Airbnb-scale boards.
- 16,059 open in the Aug 6 receipt. That number is a ledger count, not matching inventory, not an SF-only count (Gurugram / Dallas / Stockholm already leak into the public feed).

### Roles-feed (`demigod.roles-feed/1`)

- Already the honesty template: `basis` text, `postedAt` null when unattributed, `firstObservedAt` separate, per-company cap, `droppedUnsafeUrl`, `observationSpanDays`, `windowExceedsObservationHistory`.
- Gaps to close, not "enrich": Ashby/Lever `publishedAt`/`createdAt` must not be backfilled into `postedAt`; Lever epoch parse; `isListed=false` drop; label regex-remote; do not present the 120 rows as Demigod inventory (page copy already says they are not).

### Directory-refresh (`demigod-directory-refresh.mjs`)

- The loop Clay would call "keep fresh," except the sources are public and the write is a dated snapshot, not a CRM person record.
- Must grow: completeness bit per board, mass-expiry guard, canary (rule 12), domain merge pass, "generatedAt vs publishedAt vs polledAt" all retained (rule 8). Last successful ingest-site-bundle was 2026-08-05; v1099 on 2026-08-13 **re-shipped the Aug 6 bytes** — refresh reliability is the metric, not commit count.
- Smallest honest refresh is still: run the script, fill empty websites from URLs we already have, re-poll ATS, publish one SHA. Do not hand-write roles.

### DIE-the-product (the human brief)

For an accepted-for-delivery role, DIE should assemble: company card (domain, sources, as-of dates), open-role facts with evidence URLs, and an **unknowns list** (no website, no first_published, board not watched long enough, YC self-report only). That is the whole interface. No packet, no score, no guessed contact, no auto-DM.

---

## 10. Sources

### Quality / freshness
- https://www.clay.com/guides/waterfall-enrichment
- https://www.clay.com/guides/crm-enrichment-guide
- https://www.clay.com/guides/how-to-enrich-hubspot-records
- https://revnu.partners/blog/b2b-data-enrichment-tools
- https://coresignal.com/blog/multi-source-jobs-data/
- https://docs.coresignal.com/jobs-api/multi-source-jobs-api/data-dictionary-multi-source-jobs-api
- https://coresignal.com/blog/expert-answers-jobs-data-explained/
- https://www.xverum.com/jobs-datasets/
- https://www.xverum.com/company-datasets/
- https://www.xverum.com/about/
- https://apify.com/freshactors/greenhouse-lever-jobs-scraper
- https://apify.com/brebiv/jobstream
- https://apify.com/i-scraper/ats-jobs-scraper
- https://apify.com/nimait/career-site-job-listings-scraper

### First-seen vs postedAt
- https://developer.fantastic.jobs/documentation/time-fields
- https://atsradar.com/blog/how-fast-job-openings-actually-move
- https://dev.to/glitchbound/how-to-know-which-job-postings-were-removed-when-nothing-tells-you-4aoc
- https://whenthisjobwasposted.com/about

### ATS public JSON
- https://developers.greenhouse.io/job-board
- https://github.com/grnhse/greenhouse-api-docs/blob/master/source/includes/job-board/_jobs.md
- https://support.greenhouse.io/hc/en-us/articles/360037953951-Requisition-and-openings
- https://developer.greenhouse.io/webhooks.html (requisition_id = arbitrary external ID)
- https://developers.ashbyhq.com/docs/public-job-posting-api
- https://github.com/lever/postings-api/blob/master/README.md
- https://github.com/lever/postings-api/issues/35
- https://dev.to/udaninn/six-ats-platforms-publish-their-job-boards-as-open-json-here-are-the-endpoints-2d3k
- https://dev.to/votiakov/most-company-job-boards-are-just-a-public-json-api-you-can-get-55g3
- https://dev.to/zsevic/integration-with-greenhouse-public-jobs-api-1lj3
- https://dev.to/zsevic/integration-with-lever-public-jobs-api-2mnn
- https://sevic.dev/notes/ashby-public-jobs-api-nodejs/

### Directory honesty
- https://www.workatastartup.com/
- https://ctaio.dev/en/job-portals/yc-work-at-a-startup/
- https://jobsitedir.com/jobboard/workatastartup.com
- Existing DIE recon: `/workspace/slop/briefs/sf-directory-2026-08-14.md`

### Entity resolution
- https://delpha.io/blog/b2b-identity-resolution-website-vs-name/
- https://crustdata.com/blog/company-entity-resolution-messy-inputs
- https://faingezicht.com/articles/2024/09/03/entity-resolution/
- https://zephira.ai/entity-resolution-without-fuzzy-matching-how-registry-identifiers-solve-the-duplicate-problem/

### Waterfall (pattern only)
- https://www.clay.com/guides/waterfall-enrichment
- https://university.clay.com/lessons/enrich-companies-waterfalls-clay-101
- https://vantaige.io/blog/how-clay-works-waterfall-enrichment-2026

---

*Researched 2026-08-14. Prefer these URLs over memory; ATS shapes move and the canary is the point.*
