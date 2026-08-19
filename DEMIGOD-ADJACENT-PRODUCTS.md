---
status: reference
canonical_for: adjacent-products
generated_by: claude
generated_at: 2026-08-18
---

# What could plug into Demigod and DIE

Research sweep across talent intelligence, job-data APIs, ATS feeds, interview intelligence and
agent distribution. Where a claim was testable, it was tested — the results below separate
**verified**, **unverified** and **rejected**, because a provider's documentation does not tell you
what it returns for a *bogus* slug, and that is the only question that matters for attribution.

Why that question: SmartRecruiters returns `200` with `totalFound: 0` for **any** slug. A discovery
pass that trusted the status code would attribute a board to a company that does not have one. Every
provider below is judged on real-vs-bogus behaviour, not on its docs.

---

## 1. Verified this session

### Personio — ✅ safe to probe, with one trap

Free public XML per tenant, no auth: `https://{company}.jobs.personio.de/xml?language=en`

| Probe | Result |
|---|---|
| Real tenant | `200`, 8,550 bytes of `<workzag-jobs><position>` |
| Bogus tenant | `307`, 0 bytes |
| Bogus tenant, **following redirects** | `429`, 33KB of HTML from `personio.com` |

**Probe with redirects disabled.** Followed, a bogus slug lands on the Personio marketing site and
returns a large successful-looking page — the same shape as the `/studio` 308-to-home bug that made
`dasha-live-verify` check the homepage while believing it was checking Studio.

Fit: Demigod already lists `Personio` as a supported source and holds **zero** boards on it. There is
no cross-tenant endpoint — you need the company's own subdomain — which is exactly Demigod's
per-company discovery model rather than a mismatch.

### Recruitee — ⚠️ unverified, do not wire yet

Endpoint is documented and correct: `https://{company}.recruitee.com/api/offers/`, no auth.

Bogus slugs return `404`, which is the *good* shape. But **13 candidate tenants were probed and all
returned 404**, so no live tenant was found and the real-slug side of the discriminator is
unconfirmed. That is not "broken" and not "safe" — it is untested, and the SmartRecruiters lesson is
that this is precisely when not to wire something.

Next step is to find one confirmed Recruitee customer and re-probe. Until then it stays listed and
unused, exactly as it is today.

---

## 2. Strong fit, not yet built

### An MCP server over the dataset

MCP was donated to the Linux Foundation's Agentic AI Foundation in December 2025 and is natively
supported by Anthropic, OpenAI and Google DeepMind; 500+ public servers exist and the SDKs see ~97M
monthly downloads. Read-heavy, resource-shaped integrations are the case it handles best, which is
what this dataset is.

This is a **distribution channel that did not exist when the directory was built**, and it is the one
item on the old work list (§E 52) whose cost has fallen rather than risen. Demigod's differentiator —
that an unread board is never a zero — is exactly the kind of thing an agent consuming the data needs
told, and an MCP resource can carry that caveat with the number.

### Interview intelligence (Metaview, BrightHire, SocialTalent/Cara)

These record and transcribe interviews so decisions rest on evidence rather than memory. DIE already
has the *structured* half — must-haves, scorecards with per-question evidence, debriefs, an
append-only receipt for every mutation. What it lacks is capture.

Deliberately **not** proposed as a build: recording interviews requires consent from people who are
not the operator, and that is a boundary this codebase does not cross on inference. Worth knowing as
a category DIE is adjacent to, not a feature to add.

---

## 3. Rejected, with reasons

### Job aggregators — JobsPipe, Adzuna, Job Datafeeds

JobsPipe normalises 30+ ATS sources into one schema with cross-source dedup, free tier 1,000
jobs/month. Adzuna gives 1,000 calls/month, strongest in UK/EU. Both are competent.

**They break the one claim Demigod can defend.** The directory's method claim is that a count came
from *the company's own public board*, read directly, on a date. An aggregator's deduplicated feed
cannot support that — it says a posting exists somewhere, not that this company's Greenhouse board
showed it today. Adopting one would raise coverage and delete the differentiator.

Worth reconsidering only for something that is explicitly labelled as a *different* claim, never
folded into the verified-board numbers.

### Coresignal, People Data Labs, Lightcast, SignalFire Beacon

Large paid people/company datasets — SignalFire's Beacon tracks 650M individuals and 80M
organisations. These are the incumbents the earlier research already concluded we cannot out-scale,
and a résumé-derived dataset is a different product with different consent questions. Depth is not
where this wins.

---

## 4. What the research changed about DIE

Three features were built from this sweep, and each came from an idea in an adjacent product rather
than from a feature list:

| Built | Borrowed from | Kept honest by |
|---|---|---|
| `/api/v1/signals` | buying-signal research: signals are perishable and decay in days | a change needs two *readable* observations; a first look and an unread board are separate states, never a delta |
| `/api/v1/lifespan` | nothing — this is the archive data no competitor has | 1,105 of 24,775 spans can support a claim, and all three exclusion reasons ship with the number |
| `/api/v1/provenance/:id` | Clay's waterfall enrichment and Diffbot's field-level lineage | **no confidence percentage** — a reader cannot check "93% confident", but they can check origin, observation time and read outcome |

The provenance work then found a fourth state nobody designed: a packet that supplies
`signals: {…zeros}` while simultaneously declaring signals `not_found`. Reported as `contested`
rather than resolved.

---

## Sources

Verified by probe: Personio XML feed, Recruitee offers API.
Read: [ATS platforms with public APIs](https://fantastic.jobs/article/ats-with-api) ·
[JobsPipe comparison](https://jobspipe.dev/blog/best-jobs-api-2026) ·
[Coresignal talent data providers](https://coresignal.com/talent-data-providers/) ·
[SignalFire State of Talent 2026](https://www.signalfire.com/blog/signalfire-state-of-talent-report-2026) ·
[Ashby startup hiring trends](https://www.ashbyhq.com/talent-trends-report/reports/startup-hiring) ·
[MCP in 2026](https://workos.com/blog/everything-your-team-needs-to-know-about-mcp-in-2026) ·
[Interview intelligence platforms](https://www.socialtalent.com/blog/recruiting/top-12-interview-intelligence-platforms) ·
[Clay waterfall enrichment](https://www.clay.com/waterfall-enrichment) ·
[Diffbot data provenance](https://blog.diffbot.com/knowledge-graph-glossary/data-provenance/)
