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

## The gap, and how it was closed

**There was no opt-out.** A company that asks to be removed from the directory has no path, and
nothing in the codebase distinguishes "do not list us" from the misattribution denylists
(`DOMAIN_ATS_BOARD_DENYLIST`, `COMPANY_ATS_BOARD_DENYLIST` in `demigod-startup-jobs-enrich.mjs`),
which mean something different: *this board is not theirs*. Reusing those for removal requests would
merge a factual correction with a stated preference, and the two need different evidence and
different permanence.

**Closed 2026-08-17.** `DEMIGOD-DIRECTORY-OPTOUT.json` is a separate list keyed by company id,
honoured by `demigod-startup-jobs-enrich.mjs` before any probe: an opted-out company's board is never
read and the job evidence we hold is dropped. The run summary reports `directoryOptOuts`, so a fall
in coverage has an explanation that is not "the market cooled".

Three decisions worth keeping:

- It is **not** the denylists. Those mean "this board is not theirs" — a factual correction, which can
  be overturned by evidence. An opt-out is a stated preference, which cannot. Sharing one list would
  give both the same evidence bar and the same permanence.
- We stop **reading**, not just publishing. Skipping the probe is the difference between honouring a
  request and being discreet about continuing to ignore it.
- The company stays in the directory as a company. "Stop publishing our openings" and "erase us" are
  different asks, and only the first has been made by anyone. Build the second when someone asks for
  it.

An unreadable opt-out file throws rather than defaulting to empty. Silently ignoring a request we
were told about is the worst available outcome, and a missing file is the only absence that means
nothing.

## Rippling, added 2026-08-18

Rippling was added as an eighth reader after it turned up on 14 of 120 sampled careers pages — more
often than Lever, which we already read.

**What could be verified directly.** `GET https://api.rippling.com/platform/api/ats/v1/board/{slug}/jobs`
answers 200 with a JSON array and **no token**, tested against live boards on 2026-08-18. The payload
carries `uuid`, `name`, `department`, `url` and `workLocation`, and **no posted date at all** — so
Rippling roles hold `nativePostedAt: null` and can never enter the posting-age denominator, which
requires a Greenhouse `first_published` date.

**The behaviour that decided it was safe to add.** An unknown slug returns

    HTTP 404 {"error_code":"RESOURCE_NOT_FOUND","message":"Job Board not found"}

not a 200 with an empty array. This is the opposite of SmartRecruiters, which answers 200 with
`{"totalFound":0,"content":[]}` for a slug belonging to nobody and forced `acceptsVerifiedEmpty()`
into existence. Rippling cannot manufacture a verified-empty board, so a successful read is a real
board and a failure is unambiguously a failure.

**What could not be verified, stated plainly.** `developer.rippling.com` is JavaScript-rendered and
returns an empty 2 KB shell to a plain fetch, so the primary source could not be read the way
Greenhouse's, Ashby's and Lever's were. The documented purpose, via secondary summaries, is the same
shape as the others — render your job board on your own careers site — and the Recruiting Pro
subscription that is described as required appears to be a requirement on the **employer**, not on
the reader, which is consistent with the unauthenticated GET observed here. **That reading is
inference, not a citation.** Someone should read the rendered page and replace this paragraph.

**Where that leaves us.** Same posture as the other seven: a public, unauthenticated GET whose
documented purpose is the employer's own careers page, with no published authorization for
third-party aggregation. Adding Rippling does not change the exposure described above; it adds one
more vendor to it.

