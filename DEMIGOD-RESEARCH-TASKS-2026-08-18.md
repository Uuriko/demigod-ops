---
status: working
generated_by: claude
generated_at: 2026-08-17
---

# 30 tasks from a broad research sweep, and the one number that changes the plan

Every task names the finding that produced it. Numbers marked **live** were computed from this repo's
own artifacts today, not quoted from anyone.

## The headline: we can already contradict the industry's own statistic

The ghost-jobs discourse has a load-bearing number. A study of 175,000+ US listings found **about one
in seven job postings stays active more than 30 days**, and that figure is the backbone of most
coverage. Separately, ~27.4% of US LinkedIn listings are estimated to be ghost jobs, 81% of
recruiters say their employer posts them, and BLS June-2025 data shows 7.4M openings against 5.2M
hires — roughly one posted role in three never producing a hire.

Here is what our own ledger says about San Francisco startups, **live, 2026-08-17**:

| Open roles posted more than… | Count | Share |
|---|---:|---:|
| 30 days | 11,937 | **69.8%** |
| 90 days | 6,152 | 36.0% |
| 180 days | 3,080 | 18.0% |
| 365 days | 1,228 | 7.2% |

Denominator: 17,110 of 17,112 open roles carry the company's own posted date.

**Seventy percent, against an industry-quoted one in seven.** Whatever the explanation — different
universe, different method, or SF startups genuinely being five times staler — that gap is the most
interesting thing this company owns, and nobody has published it.

**And the differentiator is refusing the obvious conclusion.** The methodology already states that a
long-open role is not evidence of a fake one, because hard roles stay open. Every competitor asserts
fakeness; we can publish the measurable distribution and name precisely what it does not prove. That
is a stronger position than the ghost-job content mill, not a weaker one.

**One number we must not publish yet.** Observed role lifespan looks like "median 10 days" — but the
ledger starts 2026-08-04, so every lifespan is censored by a 13-day window. It is an artifact of when
we started watching, not a fact about roles. Right-censoring must be handled before any survival
number ships.

---

## A. The posting-age opening (highest value, mostly built)

1. **Publish the age distribution above as its own page**, with the denominator, the date, and the
   refusal stated in the first screen. `demigod-posting-age-index.mjs` already emits the fragment.
2. **Write the comparison against the one-in-seven figure explicitly** — same question, different
   answer, method shown. This is the citable claim.
3. **Fix the censoring before publishing any lifespan number.** Survival analysis with right-censored
   data, or publish nothing about lifespan until the window is long enough.
4. **Publish the 129 rewritten posted dates.** A company silently changing a role's posted date is
   freshness laundering, it is unreproducible, and no one else holds it.
5. **Segment age by ATS.** Do Greenhouse boards carry older roles than Ashby's? We have the provider
   on every row.
6. **Segment age by company stage and size**, where the map has them.
7. **A per-company posting-age view** for the directory — the honest version of "is this company
   really hiring".
8. **Answer the HBR piece with the numbers it lacks.** Still current in August, gone by November.

## B. Identity and data integrity (entity-resolution practice)

9. **Adopt LEI/Wikidata cross-identifiers where they exist.** GLEIF and OpenCorporates publish an
   open ID-to-LEI relationship file, and Wikidata carries LEI as property P1278. We already hold 626
   `wd:` rows — mapping them out to a global identifier makes the dataset joinable to everything else.
10. **Record the identity key explicitly on every row** rather than leaving it implied by `website`.
    The re-key hazard found today is only invisible because the key is derived, not stored.
11. **A merge/unmerge receipt format**, generalised from `DEMIGOD-IDENTITY-APPLY-RECEIPT.json`. MDM
    practice: never hard-delete without an audit trail, and prove the reversal on a sandbox first.
12. **A tombstone for every dropped row** — id, host, why, what absorbed it — so a merged id resolves
    instead of 404ing.
13. **Quarterly firmographic refresh cadence**, which is the documented industry norm for catching
    exactly the domain changes the drift run found.
14. **Re-run `demigod-domain-drift.mjs --all` on a schedule** and diff against the last run. 152
    moved, 93 unreachable, 7 expired today; the interesting artifact is what changes.
15. **Resolve the 152 moved domains into three buckets** — rebrand, acquisition, parked — with the
    acquisitions becoming a parent-child relation rather than a website overwrite.
16. **Reconcile against the 90 blocked hosts.** Brex and Dropbox 403 an unattended fetch; a WAF is
    now the norm, not an anomaly, so the checker needs a documented stance on them.

## C. Provenance, because it is becoming a requirement

17. **Emit W3C PROV or RO-Crate provenance for the published dataset.** PROV is the W3C
    Recommendation for entity/activity/agent provenance; RO-Crate is the approachable JSON-LD
    packaging that generates PROV-compatible output.
18. **The EU AI Act requires documented data provenance for high-risk systems from August 2026** —
    this month. Even if we are out of scope, buyers inside it will ask.
19. **Ship a `Dataset` distribution with a real licence decision.** The JSON-LD deliberately omits
    `license` today because inventing one is a legal claim. That is correct as a default and wrong
    as a permanent state — decide it.
20. **Per-claim provenance on the published pages**: each number links to the command that produces it.

## D. Distribution and the closing web

21. **Add `JobPosting` JSON-LD where we surface roles** — but note Google's Jobs API is gone, every
    posting needs its own URL and an expiration date, and stale listings draw manual actions. This is
    a real obligation, not free traffic.
22. **Decide the AI-crawler stance deliberately.** Cloudflare now blocks AI crawlers by default for
    new sites and from 2026-09-15 blocks mixed-use crawlers on ad-bearing pages. Our robots policy
    allows citation fetchers — confirm nothing upstream is overriding it.
23. **Evaluate Pay-Per-Crawl.** Cloudflare's 402 paywall reportedly cut unauthorized bot traffic ~32%
    and lifted licensing revenue ~27% in Stack Overflow's test. We are a dataset publisher; this is
    our market, not a publisher's curiosity.
24. **Track which AI crawlers actually fetch us**, by user agent, over time. Everything in §A is worth
    less if nothing is reading it.
25. **An MCP server over the dataset.** Founders shipping MCP-compatible APIs for public datasets are
    reaching distribution through agent ecosystems that did not exist before — and it is a small build
    on top of artifacts we already emit.

## E. The business

26. **Pick the wedge and price it.** The documented shape is one buyer, one signal, one geography —
    e.g. 30 subscribers at $299/mo from one metro and one signal type is ~$9k MRR, a niche too small
    for incumbents. We have the metro and the signal; the buyer is undecided.
27. **Write the scraping-posture note.** Logged-out collection of public pages is defensible after
    hiQ and the 2024 Bright Data ruling; logged-in collection against accepted terms is not. We are
    logged-out and first-party — say so publicly, because buyers ask.
28. **Name the competitive set from measured share.** Greenhouse leads top employers at 49%; among
    startup recruiting teams Ashby leads at 15.6% and no ATS exceeds 16.5%. Our coverage should be
    stated against those denominators.
29. **Publish coverage honestly against the market.** SF Bay AI postings hit a record 11,400 in June
    2025 while SF information-sector employment fell 4,500 jobs — a boom and a contraction at once,
    which is exactly the confusion our data can settle.

## F. One piece of hygiene that is not a check

30. **The 45 GB `src/` and the stale mirrors.** `demigod-ops-23/` alone is 111 MB and shadows this
    repo — today it produced duplicate grep hits in three separate investigations and cost real time.

---

## Ordering

§A is one authorization away and has a closing window. §B items 9–12 are the durable fix for the
class of bug found today. §D 22–23 have a dated deadline (2026-09-15). §E 26 is the only one that
decides what the company is, and it is the one I cannot decide alone.
