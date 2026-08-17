---
status: reference
generated_by: claude
generated_at: 2026-08-17
---

# What the ATS boards we read actually say about being read

Demigod's directory rests on seven public ATS board readers. Three of them carry live boards today
(Ashby 305, Greenhouse 122, Lever 44 — `node demigod-board-pay.mjs --matrix`), and every claim the
product makes about SF hiring comes through them. This is the primary-source position, read
2026-08-17, so the answer is a citation rather than an assumption.

**Nothing here is legal advice, and none of it is a permission slip.** It is what the vendors
publish, what follows from it operationally, and where we are exposed.

## What each vendor documents

### Greenhouse

GET endpoints on the Job Board API are unauthenticated; only application submission requires a key.
The documented purpose is the employer's own site:

> "Job Board API can be used to build a custom job board or career site to post your jobs publicly
> for candidate applications."

> "export information about your public job boards and job posts so your web developers can build
> custom career and application sites"

No rate limits, permitted-use restrictions, or third-party terms appear in the API overview.
Source: [Greenhouse API overview](https://support.greenhouse.io/hc/en-us/articles/10568627186203-Greenhouse-API-overview).

### Ashby

Public and unauthenticated. The documented purpose, in full:

> "If you host your own careers page, you can use this data to populate it."

No rate limits, no republishing terms, no third-party guidance, and no terms-of-service link on the
page. Source: [Ashby public job posting API](https://developers.ashbyhq.com/docs/public-job-posting-api).

### Lever

GET requests need no authentication; only application POSTs need a key. Purpose: the API is
"designed to help you create a job site." Only **published** postings are exposed — no internal
postings, no full-text search. Cross-origin requests are restricted to the company's own domains and
subdomains. The one documented rate limit is `429` above 2 application POSTs per second, which does
not bind us because we never post applications.
Source: [lever/postings-api](https://github.com/lever/postings-api).

### The four with no live boards

SmartRecruiters, Workable, Recruitee and Personio are implemented in `demigod-ats-providers.mjs` and
currently carry **zero** boards in the live map. Their terms were not read, because reading terms for
a reader nobody uses is the kind of work that looks like diligence and produces nothing. Read them
before the first live board lands, not after.

## What follows

1. **We read only what the employer published.** All three APIs serve exactly the postings a company
   chose to make public, which is the same thing any visitor to their careers page sees. This is the
   strongest fact in our favour and it should stay true: no authenticated endpoint, no internal
   posting, no full-text search, no application submission.
2. **None of the three authorizes third-party aggregation, and none prohibits it.** Every documented
   purpose is phrased as the employer's own careers page — *your* jobs, *your* developers, *your*
   careers page. A directory is not that use case. The exposure is contractual and reputational, not
   technical, and it does not resolve by reading the docs harder.
3. **Rate limiting is a courtesy obligation with no published ceiling.** Only Lever documents a
   limit, and only for applications. That absence is not permission: on 2026-08-16 one enrich run at
   12 workers cost 90 Ashby boards to rate limiting, which is the operative signal regardless of what
   the docs say. `DEMIGOD_ENRICH_CONCURRENCY` exists for exactly this and the polite value is not
   knowable from here.
4. **A read failure is never evidence about a company.** Already enforced in three places — the
   enricher carries a stale count rather than zeroing it, the packet refuses to call an unread board
   observed, and the Hiring Pulse excludes unread boards from "paused hiring" instead of publishing
   our crawl health as their business decision.

## The gap

**There is no opt-out.** A company that asks to be removed from the directory has no path, and
nothing in the codebase distinguishes "do not list us" from the misattribution denylists
(`DOMAIN_ATS_BOARD_DENYLIST`, `COMPANY_ATS_BOARD_DENYLIST` in `demigod-startup-jobs-enrich.mjs`),
which mean something different: *this board is not theirs*. Reusing those for removal requests would
merge a factual correction with a stated preference, and the two need different evidence and
different permanence.

The smallest honest version is a separate opt-out list keyed by company id, honoured by the enricher
before any probe, with the request recorded. It is not built. Until it is, the answer to a removal
request is a manual edit by someone who knows both denylists exist, which is not an answer.
