# Demigod Intelligence Engine (DIE): competitive landscape

> **Authority:** This is non-normative market research. The
> [Demigod Intelligence Engine specification](../../../DEMIGOD-DIE-SPEC.md) is normative.
>
> **Agent loading:** Not default context. Start with the
> [shared DIE brief](SYNTHESIS.md); open this appendix for market, provider, or pricing disputes.

**Research date:** 2026-07-29<br>
**Scope:** company intelligence, talent intelligence, recruiting systems, and web-retrieval
infrastructure relevant to Demigod's private company/talent match-review layer<br>
**Source policy:** official vendor product pages, documentation, release notes, blogs, and
press releases only. No review sites, analyst reports, social posts, or third-party summaries.
**Link validation:** all 100 unique direct external URLs in this document returned HTTP 200
during validation on 2026-07-29.

## How to read this research

The products below occupy different layers. Calling all of them "competitors" would hide the
important distinction between a system of record, a data provider, a research workflow, a
talent search product, and a retrieval primitive.

Evidence labels used in this document:

- **Documented:** the linked official page explicitly describes the capability.
- **Vendor metric:** a scale, performance, or quality number published by the vendor. It has
  not been independently validated here.
- **Inference:** a conclusion drawn from the official material and Demigod's current design.
- **Unknown:** the reviewed public pages do not establish the point. Unknown does not mean the
  vendor lacks the capability; it means no public primary-source support was found.

Publication dates are included when the official page displayed one. Documentation pages
without stable publication dates are labeled **current docs**. Product pages can change after
this review.

## Executive conclusion

The broad market is crowded, but the products do not converge on one identical system:

1. **Clay and Common Room** are the closest products for persistent account research,
   enrichment, signals, and downstream GTM action.
2. **Harmonic and Crunchbase** are private-company intelligence sources; **People Data Labs
   (PDL)** is a licensed person/company data substrate.
3. **Attio** is principally a CRM/system of record that can receive or override enriched data.
4. **Ashby and Gem** combine recruiting systems of record with sourcing, rediscovery, and AI
   workflow.
5. **SeekOut, Findem, Eightfold, and Juicebox** are the closest talent-intelligence and
   discovery products. Findem and Juicebox also expose meaningful company/talent graph
   capabilities.
6. **Exa, Tavily, and Firecrawl** are retrieval, search, extraction, and monitoring
   infrastructure. They can power a DIE collector, but they do not provide Demigod's match
   policy, review state, mutual consent, or outcome loop.
7. **Wellfound Autopilot, Paraform, Underdog, Dover, Hunt Club, and Mercor** are direct
   substitutes for parts of the recruiting service itself: managed sourcing, curated
   introductions, recruiter marketplaces, executive search, or expert staffing.

**Inference:** "always-on AI research" is no longer a defensible category by itself. Clay,
Common Room, Harmonic, Findem, and Firecrawl all publicly describe some form of persistent,
live, or change-triggered intelligence. Explainability and human control are also becoming
normal product claims across recruiting vendors.

**Inference:** a 10% fee, AI-assisted search, or a human in the loop is not differentiation on
its own. Direct substitutes publicly sell each of those elements, sometimes in the same
offering.

The narrower Demigod combination remains differentiated in this primary-source set:

- exact company identity joined to verified ATS ownership and current role observations;
- semantic claims represented as `supported`, `conflict`, or `unknown`;
- exact source quotation and URL, live quote replay, and sealed verification receipts;
- research isolated from match score, pair state, consent, and introductions;
- human match review, two-sided consent, and eventual outcome labels in the same workflow.

No reviewed vendor page documents that exact bundle. This is an **inference from the public
materials**, not proof that no vendor has comparable private capabilities.

## Demigod's current baseline

The following is internal implementation truth, not a market claim. Its canonical sources are
`/home/potter/DEMIGOD-DIE-SPEC.md` and `/home/potter/docs/die/`.

- DIE is already integrated as a private, read-only company-evidence sidecar in the existing
  match-review, candidate-ranking, funnel-receipt, and operator-dashboard paths.
- Its frozen 30-company benchmark spans six source × ATS strata and five fields.
- Four fields passed: canonical company, product summary, product category, and likely buyer.
  Public pricing status was withheld because coverage was 23/30, below the 90% threshold.
- All 142 non-unknown source quotations passed the recorded live replay.
- The benchmark gold set and operational research catalog are now separate. Operational rows
  can grow without changing the 30-row evaluation set.
- Exact-identity joins fail closed; duplicate, malformed, or ambiguous research does not
  project.
- Research can add evidence or review flags but cannot modify scores, pair decisions, consent,
  introductions, or outcomes.
- The next implemented-product gates are real-role context, outcome-linked learning, a
  field-specific source bakeoff if a real review exposes a recurring unknown, and bounded
  collection automation if manual catalog work becomes a measured bottleneck.

This baseline matters because many apparent competitor features already exist under simpler
Demigod primitives. The competitive question is not whether to create another research
platform; it is where a provider or retrieval tool can improve a measured field without
weakening the existing evidence and review contract.

## Category map

| Layer | Products | Primary job | Relationship to DIE |
|---|---|---|---|
| Account research and GTM execution | Clay, Common Room | Enrich accounts/people, combine signals, research continuously, trigger action | Direct overlap on company research; different end workflow |
| Private-company intelligence | Harmonic, Crunchbase | Supply company, funding, people, market, and predictive data | Potential source layer; partial direct overlap |
| Licensed entity data | People Data Labs | Deliver normalized person/company records and changes by API/file | Buyable substrate, not review workflow |
| CRM/system of record | Attio | Store relationships, records, communications, and enriched attributes | Destination/integration, not a DIE replacement |
| Recruiting system plus AI workflow | Ashby, Gem | ATS/CRM, sourcing, rediscovery, assessment, outreach | Adjacent workflow competitor and integration surface |
| Talent intelligence and discovery | SeekOut, Findem, Eightfold, Juicebox | Search, infer fit, rediscover, map talent, support workforce decisions | Most direct talent-side competition |
| Direct recruiting services | Wellfound Autopilot, Paraform, Underdog, Dover, Hunt Club, Mercor | Deliver candidates, recruiters, warm introductions, or embedded experts | Compete with the service and economics, not just DIE infrastructure |
| Search/crawl/extraction infrastructure | Exa, Tavily, Firecrawl | Find, fetch, structure, cite, and monitor web sources | Swappable collection substrate |

The categories overlap. For example, Findem now publishes company-research and MCP
capabilities; Gem combines an ATS/CRM with an external profile index; Common Room combines a
GTM workflow with identity resolution.

## Feature, evidence, freshness, and human-review comparison

| Product | Core scope | Publicly documented evidence/inspectability | Publicly documented freshness | Publicly documented human control | DIE relationship |
|---|---|---|---|---|---|
| **Clay** | Account research, enrichment, signals, GTM action | Account Research Agent run logs can be drilled into from data point to evidence and conclusion; Claygent advertises a reasoning trace. This is stronger than a bare generated summary, but exact-quote export and correction history are **unknown**. | Persistent account context, change tracking, segment-dependent runs, and new-data processing are documented. | Account Research Agent writes are described as automatic but human-approved; prompt tests/rollback exist for Claygent. | Closest company-research workflow competitor |
| **Harmonic** | Private-company and people graph, startup discovery, Scout research | Official pages describe synthesized private-market, public-web, and customer-network data. Claim-level source excerpts and end-user review history are **unknown**. | Vendor says priority companies refresh daily; broader dataset cadence is **unknown**. | End-user approval gates are not specified on the reviewed pages. | Potential company-data provider and direct private-market competitor |
| **Crunchbase** | Company, funding, market, event, and predictive intelligence | Publishes source categories, automated validation, and analyst validation. Row-level source passages and reviewer history are **unknown**. | Vendor says continuous refresh and more than 30M verified updates per year; prediction models refresh weekly. | Human analysts participate in internal validation; customer-side field approval is **unknown**. | Buyable company/funding/category source |
| **People Data Labs** | Person/company data APIs and files | Documents source QA, entity resolution, hand sampling, data versions, and several field timestamps. Returned exact source passages are **unknown**. | APIs update monthly; flat files monthly or quarterly; job-posting deliveries can be daily. | Internal human sample QA is documented; customer review workflow is not the product. | Licensed data substrate |
| **Attio** | CRM and relationship system of record | Enriched field source passages are **unknown**. Users can see and replace enriched values. | Enriched attributes update automatically as Attio receives new data. | Manual overrides are explicit and are not overwritten by later enrichment. | Destination/system of record |
| **Common Room** | Person/account identity, signals, research, GTM action | Profiles and summaries combine many signals/providers; exact supporting passages and field-level provider lineage are **unknown** on reviewed pages. | "Always-on" signal and research language is documented; a field-specific SLA is **unknown**. | Operators define lists and actions; a universal approval requirement for AI actions is **unknown**. | Direct overlap on continuous account/person research |
| **Ashby** | ATS, recruiting CRM, sourcing, rediscovery, analytics | Responsible-AI and application-review pages describe reasoning and linked evidence; rediscovery uses ATS stages, scorecards, email, and profile history. | Rediscovery refreshes selected profiles; global external-index cadence is **unknown**. | Human-defined criteria, review/override, and approval before drafted outreach are explicit. | Adjacent recruiting system with unusually strong review controls |
| **Gem** | ATS/CRM, sourcing, rediscovery, profile discovery | Shows matched criteria and AI match summaries; company summaries can link to Crunchbase, LinkedIn, and company sites. Exact source support for every inference is **unknown**. | External profile and company update cadence is **unknown** on reviewed pages. | Recruiters adjust criteria and remain decision makers; bias warnings and external audits are described. | Broad recruiting-platform competitor |
| **SeekOut** | External/internal talent search, workspaces, recruiting agents/service | Search summaries and recommendations are documented. Per-claim public-source passages are **unknown**. | Release notes show recurring pool and product updates; a global profile-freshness SLA is **unknown**. | Workspace criteria are reviewed/edited by users; agent actions require approval in the described workflow; Spot includes a human recruiter validating matches. | Direct talent discovery plus human-service competitor |
| **Findem** | Talent graph, sourcing, company research, authenticity checks, MCP | Vendor describes more than 100,000 verified sources, expert-labeled data, and authenticity flags. Exact citation coverage for each attribute is **unknown**. | Dynamic talent pools and a real-time people/company/time graph are documented; exact field cadence is **unknown**. | Recruiters can bulk review, override, and customize; assistant flows call for human confirmation. | One of the closest company + talent intelligence competitors |
| **Eightfold** | Enterprise talent acquisition, mobility, skills, workforce planning | Agent actions are described as logged, explainable, and auditable. Source-level evidence behind the external career graph is **unknown**. | Vendor refers to real-time work signals; field-specific update intervals are **unknown**. | Recruiters retain hiring decisions; interview results can be reviewed and overridden; independent bias audit is public. | Enterprise talent-intelligence competitor |
| **Juicebox** | AI talent search, agents, company/talent insights | Match criteria can link to supporting profile sections; research signals link to actual papers, patents, and PDFs. This is the clearest public source-inspection story among the dedicated talent-search products reviewed. | Dynamic company/talent movement and career-change updates are described; exact global cadence is **unknown**. | Approve/skip/reject, notes, calibration, and feedback-driven searches are explicit. | Close startup-oriented talent-search competitor |
| **Exa** | Neural web, people, and company search plus content extraction | Returns source URLs and dates; contents can return extractive highlights or full text with crawl status. Open people/company evals are published. | `maxAgeHours` provides explicit live/cached-content control; vendor reports 50M+ people-index updates weekly. | No end-user review workflow; it is infrastructure. | Candidate retrieval provider/evaluation reference |
| **Tavily** | Search, extract, crawl, and multi-step research API | Search results include citations; domain, time, and search-depth controls are documented. | Live-web retrieval and recency/freshness controls are documented; entity-field cadence is not applicable. | No human-review workflow; it is infrastructure. | Candidate source-discovery provider |
| **Firecrawl** | Search, scrape, crawl, parse, structured extraction, change monitor | Preserves source content/URLs; structured extraction, stored snapshots, diffs, and permalinks are documented. | Monitor supports schedules from five minutes upward, page/site checks, structured diffs, and webhooks; scrape/change tracking also records prior state. | No domain review workflow; monitor notifications and extracted packets can feed one. | Existing Demigod fallback and possible bounded collector substrate |

## Direct recruiting-service substitutes

These companies compete closer to Demigod's recruiting service than to the DIE evidence
engine. Economics below are the current public terms found on official pages. They may not
include negotiated plans, taxes, role exclusions, contract details, or later changes.

| Product | Documented service and human model | Current public economics | Vendor-stated versus unknown |
|---|---|---|---|
| **Wellfound Autopilot** | A dedicated Wellfound recruiter calibrates the search, uses AI-powered/enriched search, reviews profiles, conducts outreach, handles replies, and schedules interested candidates; the employer approves or passes warm candidates. [Official Autopilot page](https://reach.wellfound.com/autopilot) | **$500 per month per open role plus 10% on a successful hire**, with no contract and the ability to pause, per the public page. | Terms are **documented**. Candidate-pool and response-rate figures on the same page are **vendor metrics**. Replacement/refund terms and the exact fee base beyond the page's wording are **unknown**. |
| **Paraform** | An AI-powered recruiter marketplace where multiple expert recruiters and custom AI agents work a role; recruiters submit interested, pre-screened candidates with fit context. [Employer page](https://www.paraform.com/for-companies) · [Recruiting agreement](https://www.paraform.com/recruiting-agreement) | The employer page says pricing is **success-based**, as a flat percentage of first-year base salary only upon hire, and promises a free replacement search if a hire fails within 90 days. Paraform's own June 2026 comparison article reports approximately **20–25%** and a 90-day guarantee. [Official comparison](https://www.paraform.com/blog/paraform-vs-superposition) | Success-only billing and the 90-day replacement are **documented**. The general employer page does not publish the actual percentage, so the 20–25% article figure is a **vendor-stated comparison**, not a universal quote. |
| **Underdog.io** | A curated marketplace sends weekly batches of active candidates who applied to Underdog, were reviewed, and expressed interest; employers contact and interview candidates directly. [Company page](https://underdog.io/companies) · [Developer-hiring page](https://underdog.io/hire-developers) | The developer-hiring page publishes **11.5% of first-year salary, paid only on hire**, with no retainer or exclusivity. Underdog also advertises subscription options, but public plan pricing was not established in the reviewed pages. | The 11.5% pay-per-hire term and human review are **documented**. Acceptance, speed, and quality percentages are **vendor metrics**. Guarantee details vary by plan and are **unknown** publicly. |
| **Dover** | Employers select a vetted fractional recruiter who works inside a shared ATS; the human recruiter can source, coordinate, advise, or run the search. [Recruiter Marketplace](https://www.dover.com/recruiters) · [Billing documentation](https://help.dover.com/en/articles/10524261-billing) | Recruiters set their own rates. Dover supports **hourly, retainer, and pay-per-hire/contingency** arrangements. Hourly marketplace work uses an **$800 refundable deposit** that is consumed as hours are logged. Dover reports a **$4.8K average cost per hire**, a vendor metric. [January 2026 pricing-model update](https://www.dover.com/blog/product-update-january-2026) | The models, recruiter-set rates, and deposit are **documented**. The final rate and total cost are **unknown** until an employer chooses a recruiter and agreement. |
| **Hunt Club** | A managed executive/professional search combines human talent advisors, an AI-powered search platform, proprietary candidate data, and warm introductions through an expert network; experts can advise on role design and interviews. [Talent Acquisition](https://www.huntclub.com/talent-acquisition) · [Expert Network](https://www.huntclub.com/experts) | No current public employer price or placement percentage was found on the reviewed official pages. | The managed human/network/AI model is **documented**. Network size, response, and speed figures are **vendor metrics**. Economics, guarantee, and exact approval flow are **unknown**. |
| **Mercor** | Mercor's current enterprise offer finds, vets, and places expert professionals into teams, using dynamic role-specific AI interviews; its current center of gravity is AI-lab and enterprise expert/contract work rather than conventional permanent startup search. [Enterprise partner page](https://www.mercor.com/partner/) · [Mission and Hire description](https://www.mercor.com/mission/) · [AI interview documentation](https://talent.docs.mercor.com/support/ai-interview) | No current public employer staffing fee, markup, or subscription price was found on the reviewed official pages. Public expert pages show worker rates, not the employer's all-in economics. | AI assessment and expert staffing are **documented**. Employer pricing, human-review depth after AI assessment, guarantees, and permanent-hire economics are **unknown**. |

The comparison changes the differentiation test:

- **10% is already in market:** Wellfound Autopilot publishes 10% plus a monthly role fee;
  Underdog publishes 11.5% success-only pricing.
- **AI plus a person is already in market:** Wellfound pairs AI search with a dedicated
  recruiter; Paraform combines custom agents with expert recruiters; Hunt Club combines an
  AI platform with talent advisors and warm-network experts; Dover sells human fractional
  recruiting inside software.
- **Human review is already in market:** the relevant human may be a dedicated recruiter,
  marketplace recruiter, candidate curator, network expert, hiring manager, or staffing
  operator.

**Inference:** Demigod's defensible service claim must therefore be more specific than price,
AI, or human involvement: high-integrity startup/company/role identity, source-backed context,
explicit mutual consent, a small reviewed slate, transparent action authority, and outcomes
connected back to the evidence and pair.

## Vendor profiles and primary sources

### 1. Clay

**Category:** account research, enrichment, signals, and GTM execution<br>
**Competitive proximity:** high on company-research workflow; lower on talent matching

Official sources:

- [Account Research Agents announcement — July 22, 2026](https://www.clay.com/blog/account-research-agents)
- [Account Research Agents documentation — current docs](https://university.clay.com/docs/account-research-agents)
- [Claygent product page — current](https://www.clay.com/claygent)
- [Signals product page — current](https://www.clay.com/signals)
- [Signals documentation — current docs](https://university.clay.com/docs/signals)
- [Clay in Claude announcement — January 26, 2026](https://www.clay.com/blog/clay-in-claude)

Documented facts:

- Account Research Agents launched in open beta and run over Clay Audience segments.
- They can use CRM, data-warehouse, email, call, activity, enrichment, and signal context,
  maintain persistent per-account context, detect change, and write structured "auditable
  fields" back into operating systems.
- The Data Hub exposes run activity, errors, spend, and a drill-down from a data point to its
  evidence and conclusion.
- Clay describes downstream writes as automatic with human approval and describes cadence as
  dependent on the segment rather than one fixed global schedule.
- Claygent performs on-demand web research and structured extraction and advertises a full
  reasoning trace, prompt testing, and rollback.
- Clay's Signals layer combines first-party and third-party observations such as job changes,
  hiring changes, and social activity.

Interpretation:

- Clay has moved beyond one-shot enrichment into persistent account memory and change-aware
  research. A generic DIE claim of "always-on account research with auditable fields" would
  now collide directly with Clay.
- Clay's operating center is GTM: audiences, CRM/data-warehouse updates, qualification, and
  outbound action. Demigod's operating center is a specific company-role-candidate review
  followed by two-sided consent and outcomes.
- **Unknown:** whether a Clay field can always export the exact primary-source passage,
  source observation timestamp/hash, conflict state, reverse dependencies, and full reviewer
  correction history in a portable form.

### 2. Harmonic

**Category:** private-company and people intelligence<br>
**Competitive proximity:** high for startup/company discovery and entity data

Official sources:

- [Harmonic versus Grata — Harmonic's own product description, April 16, 2026](https://harmonic.ai/blog/harmonic-vs-grata)
- [Harmonic for corporate development — May 6, 2026](https://harmonic.ai/blog/how-harmonic-services-corporate-development)
- [Harmonic for venture capital — May 6, 2026](https://harmonic.ai/blog/how-harmonic-serves-venture-capital-firms)
- [Harmonic for GTM teams — June 1, 2026](https://harmonic.ai/blog/how-harmonic-serves-go-to-market-teams)
- [Original Harmonic launch — November 6, 2022](https://harmonic.ai/blog/introducing-harmonic-a-better-way-to-discover-and-invest-in-startups)

Documented facts:

- Harmonic reports a proprietary dataset of more than 35M companies and 195M people. These
  are **vendor metrics**.
- Scout searches Harmonic's private-market data, the public web, and a customer's network,
  accepting natural-language research requests and returning evaluated companies and
  relationship paths.
- Harmonic says "priority companies" can refresh daily and exposes data through API, MCP,
  native CRM connections, email, Slack, and data-warehouse workflows.
- Its official use cases include venture sourcing, corporate development, GTM account
  discovery, people movement, funding changes, and company monitoring.

Interpretation:

- Harmonic is the strongest reviewed candidate for buying broad private-company coverage
  without constructing a company graph.
- Its daily priority cohort is not the same promise as daily freshness for every field across
  the full vendor-reported graph.
- **Unknown:** exact-quote availability, record-level source provenance, correction/reviewer
  history, false-merge rate, and coverage quality for Demigod's SF startup slice.

### 3. Crunchbase

**Category:** company, market, funding, and event intelligence<br>
**Competitive proximity:** medium; potential source layer

Official sources:

- [Crunchbase data methodology/product page — current](https://about.crunchbase.com/data)
- [Crunchbase company overview — current](https://about.crunchbase.com/about-us)
- [Predictions and Insights launch — December 2, 2025](https://about.crunchbase.com/press/press-releases/predictions-and-insights-launch)
- [Market Insights announcement — June 2, 2026](https://about.crunchbase.com/blog/market-insights)
- [Crunchbase Pro product page — current](https://about.crunchbase.com/products/crunchbase-pro)

Documented facts:

- Crunchbase describes five input/quality channels: direct market experts and partners,
  aggregate engagement signals, automated proprietary ingestion, more than 1,000 external
  news/regulatory sources, and analyst validation.
- The vendor says it processes more than 30M verified updates per year with continuous
  refresh. This is a **vendor metric**.
- Its data covers company financials, funding, leadership, firmographics, M&A, IPOs, and
  predictive signals, available through product, API, and licensing.
- Predictive models for events such as growth, funding, acquisition, IPO, closure, or layoffs
  are described as refreshing weekly.
- The June 2026 Market Insights announcement reports product/service clustering across 2.7M
  private companies and 13.2M mapped products. These are **vendor metrics**.

Interpretation:

- Crunchbase is a plausible source for funding, stage, investor, and category gaps after a
  real match-review need is named.
- Analyst validation is meaningful data-process evidence, but it is different from a
  customer-visible exact source passage supporting each projected field.
- **Unknown:** field-level source passage exposure, reviewer identity/history, provider-side
  correction latency, and exact SF-startup coverage.

### 4. People Data Labs

**Category:** person/company data API and files<br>
**Competitive proximity:** substrate rather than product workflow

Official sources:

- [Data updates documentation — current docs](https://docs.peopledatalabs.com/docs/data-updates)
- [February 2026 release notes, v33.1 — February 17, 2026](https://docs.peopledatalabs.com/changelog/february-2026-release-notes-v331)
- [April 2026 release notes, v34.0 — April 2026](https://docs.peopledatalabs.com/changelog/april-2026-release-notes-v340)
- [Company data overview — current docs](https://docs.peopledatalabs.com/docs/company-data-overview)
- [Data sources — current docs](https://docs.peopledatalabs.com/docs/data-sources)
- [Data build process — December 5, 2024](https://www.peopledatalabs.com/data-lab/datafication/our-data-build-process)
- [Person Enrichment API reference — current docs](https://docs.peopledatalabs.com/docs/reference-person-enrichment-api)
- [Person-match likelihood guidance — current docs](https://docs.peopledatalabs.com/docs/input-parameters-person-enrichment-api)

Documented facts:

- PDL documents monthly API releases and monthly or quarterly flat-file releases. It exposes
  a `data_version` and field metadata such as job-last-verified and location-last-updated.
- Company records include employee counts and history, role/level/country distributions,
  growth, funding, industry, parent relationships, and inferred revenue.
- PDL describes a multi-source pipeline with normalization, deterministic/probabilistic entity
  resolution, deduplication, aggregate QA, hand sampling, trusted/untrusted source handling,
  and release/customer QA.
- Job-posting data is described as originating exclusively from career pages and available in
  close-to-real-time/daily delivery products.
- February and April 2026 release notes report tens of millions of job verifications and
  millions of detected changes per monthly release. Those totals are **vendor metrics**.
- Person Enrichment returns a match-likelihood score and permits a minimum threshold. PDL's
  own guidance warns that permissive default matches can have low probability and suggests
  higher thresholds for high-accuracy use.

Interpretation:

- PDL is useful when Demigod needs normalized bulk attributes or changes, not when it needs a
  complete review workflow.
- The explicit release versioning and field timestamps are stronger freshness primitives than
  generic "live data" language.
- Person data introduces privacy, licensing, retention, and match-error questions that are
  outside the current company-context slice.
- **Unknown:** whether API responses include exact public-source passages sufficient for
  Demigod's claim contract. Internal hand QA is not a substitute for reviewable evidence on a
  projected record.

### 5. Attio

**Category:** CRM/system of record<br>
**Competitive proximity:** integration destination, not primary competitor

Official sources:

- [Enriched data documentation — current docs](https://attio.com/help/reference/managing-your-data/enriched-data)
- [Syncing people and companies — current docs](https://attio.com/help/reference/attio-101/syncing-people-and-companies)
- [Standard objects documentation — current docs](https://attio.com/help/reference/managing-your-data/objects/manage-standard-objects)
- [Attio's venture-capital workflow guide — current docs](https://attio.com/help/reference/industry-guides/vc)

Documented facts:

- Attio enriches company records using a domain and person records using email, supplying
  attributes such as company description, categories, location, employee range, funding,
  founding year, social profiles, and team.
- Enriched data updates automatically as new information arrives.
- Users can manually override enriched fields; Attio says later enrichment does not overwrite
  the manual value.
- Attio says enriched data cannot be exported; a manually entered override can be exported.
- Attio's own VC guide describes Clay as a way to push external enrichment and AI research
  into Attio.

Interpretation:

- Attio validates a clean system boundary: research/evidence can be computed elsewhere and
  optionally projected into a CRM.
- Its persistent manual override is a useful control pattern.
- **Unknown:** exact source passage, per-field observation time, and correction/audit detail
  for Attio-provided enrichment.

### 6. Common Room

**Category:** GTM person/account identity, signals, research, and action<br>
**Competitive proximity:** high on account/person context; different end workflow

Official sources:

- [Person360 product page — current](https://www.commonroom.io/product/person-360/)
- [Signals documentation — last updated April 9, 2025](https://www.commonroom.io/docs/signals/)
- [Person360 launch — February 7, 2024](https://www.commonroom.io/blog/introducing-person360-connect-with-the-person-behind-the-signal/)
- [RoomieAI research, prioritization, and personalization — February 27, 2025](https://www.commonroom.io/blog/ai-research-account-prioritization-and-personalization/)
- [Signals product page — current](https://www.commonroom.io/product/signals/)

Documented facts:

- Person360 uses identity resolution and a waterfall across multiple providers to combine
  person and account records. Common Room reports 200M contacts and 30–50% higher match rates;
  both are **vendor metrics**.
- Signals combine social, business, product, CRM, customer, and community activity through
  native and custom integrations.
- RoomieAI Capture is described as always-on research across the public web and owned data,
  creating account topics such as products, customers, competitors, funding, hiring,
  leadership, and product use.
- Research can be used in profiles, lists, prioritization, CRM updates, and GTM actions.

Interpretation:

- Common Room is a close example of unified first-party behavior plus external research and
  identity, but it optimizes sales/account action rather than two-sided talent matching.
- **Unknown:** whether every summarized claim retains an exact primary passage, provider
  lineage, content hash, conflict state, and customer-visible review history.

### 7. Ashby

**Category:** ATS, recruiting CRM, sourcing, analytics, and AI recruiting workflow<br>
**Competitive proximity:** adjacent system-of-record competitor

Official sources:

- [AI Talent Rediscovery announcement — May 7, 2026](https://www.ashbyhq.com/product-updates/ai-talent-rediscovery)
- [Responsible AI at Ashby — current](https://www.ashbyhq.com/ai)
- [Ashby pricing/capability page — current](https://www.ashbyhq.com/pricing)
- [AI Talent Rediscovery documentation — current docs](https://docs.ashbyhq.com/ai-talent-rediscovery)
- [Ashby One 2026 keynote — May 7, 2026](https://www.ashbyhq.com/blog/culture/ashby-one-2026-keynote)

Documented facts:

- Talent Rediscovery evaluates an employer's existing candidate database against job criteria
  defined by a human and uses stages, scorecards, email threads, and historical interactions.
- Ashby refreshes work history, location, and education for returned rediscovery profiles and
  organizes candidates into prioritized groups.
- Its responsible-AI material says application review exposes reasoning and links evidence,
  supports review/override, and avoids fully black-box recommendations.
- AI-drafted re-engagement is reviewed and approved by a human before sending.
- Ashby reports an internal governance program and third-party FairNow audits.
- The core product combines ATS, CRM, scheduling, analytics, sourcing, enrichment, and
  rediscovery.

Interpretation:

- Ashby's strongest overlap is not generic company intelligence; it is using richer recruiting
  history and evidence in the same system where recruiters decide.
- Human-defined criteria, linked evidence, and approval before communication make simple
  "human in the loop" positioning table stakes.
- External company intelligence and source-excerpt coverage are **unknown**.

### 8. Gem

**Category:** recruiting platform, ATS/CRM, sourcing, and rediscovery<br>
**Competitive proximity:** medium to high on talent workflow

Official sources:

- [Gem AI Sourcing announcement — official page, publication date not stable in accessible page](https://www.gem.com/blog/introducing-gem-ai-sourcing-discover-your-next-hire-faster)
- [AI agents, Rediscovery, and Talent Insights updates — December 9, 2025](https://www.gem.com/blog/updates-to-gems-ai-agents-ai-rediscovery-ai-talent-insights-and-more)
- [August 2025 product updates — August 21, 2025](https://www.gem.com/blog/gems-august-2025-product-updates)
- [Gem current release notes — current through 2026](https://help.gem.com/whats-new)

Documented facts:

- Gem reports an index of more than 800M public profiles, verified emails, and integration
  with the customer's recruiting CRM history. The profile count is a **vendor metric**.
- AI Sourcing displays matched criteria and AI match summaries and lets recruiters revise the
  search.
- AI Rediscovery uses ATS/CRM data including applications, scorecards, email, and notes.
- Gem describes warnings for biased criteria and annual third-party BABL bias audits.
- Company summaries can link out to sources such as Crunchbase, LinkedIn, and an official
  website.

Interpretation:

- Gem joins external discovery with internal recruiting memory, an important substitute for
  part of Demigod's talent-side context.
- Criteria explanations are useful, but they are not necessarily source-backed factual
  assertions. Exact passage coverage and profile freshness remain **unknown**.

### 9. SeekOut

**Category:** talent search, workspaces, recruiting agents, and recruiting service<br>
**Competitive proximity:** high on sourcing and human-assisted execution

Official sources:

- [SeekOut release notes — current through June 2026](https://www.seekout.com/release-notes/)
- [AI features in SeekOut — updated March 6, 2026](https://support.seekout.com/en/articles/13719568-ai-features-in-seekout)
- [Agentic recruiting overview — 2026](https://www.seekout.com/blog/agentic-ai-recruiting-leveled-up-with-seekout/)
- [SeekOut Spot product announcement — current](https://www.seekout.com/blog/seekout-spot/)

Documented facts:

- SeekOut's June 2026 release notes describe a ChatGPT integration; April 2026 notes describe
  MCP search across seven talent verticals and fourteen workflows.
- The seven described verticals include public, GitHub, academic, healthcare, nursing, ATS,
  and internal talent.
- Workspace Express derives criteria from a job description and asks the user to review/edit
  those criteria before applying them.
- AI features include Smart Match, job-description search, clone-candidate search, workspace
  summaries, and recommendations.
- SeekOut's agentic product materials state that people approve recommendations and retain
  control.
- SeekOut Spot pairs AI-assisted sourcing with a human SeekOut recruiter who validates matches
  and manages the search.

Interpretation:

- Spot is a particularly relevant competitive form: software plus a human recruiting service,
  not just a search database.
- The reviewed public pages do not establish exact primary-source passages for every candidate
  attribute or a global freshness SLA.

### 10. Findem

**Category:** talent intelligence graph, company research, sourcing, authenticity, and agents<br>
**Competitive proximity:** very high

Official sources:

- [October 2025 product updates, including Company Research and Authenticity Suite — November 19, 2025](https://www.findem.ai/blog/product-updates-october-2025)
- [Findem Studio and MCP — April 30, 2026](https://www.findem.ai/blog/findem-studio)
- [Findem's 2026 AI recruiting product overview — July 22, 2026](https://www.findem.ai/blog/ai-recruitment-tools)
- [Fia assistant announcement — December 9, 2025](https://www.findem.ai/blog/product-update-fia-intelligent-assistant)
- [Getro and agentic hiring — December 4, 2025](https://www.findem.ai/blog/findem-getro-agentic-hiring)
- [Copilot sourcing — June 13, 2024](https://www.findem.ai/blog/copilot-automated-candidate-sourcing)

Documented facts:

- Findem's Company Research App offers a company database with industry, stage, funding,
  company type, and investor filters; company pages; related-company discovery; research
  lists; and target-company lists that feed talent mapping.
- The Authenticity Suite is described as checking more than 100,000 verified sources,
  flagging mismatches and impossible timelines, and allowing recruiters to review and
  override results. The source count is a **vendor metric**.
- Findem Studio exposes an MCP over a people/companies/time graph and describes movement,
  company, workforce, and investor use cases.
- Findem reports more than one trillion people/company data points and describes expert-labeled
  data, relationship signals, success signals, and dynamic pools. The scale is a
  **vendor metric**.
- Fia accepts conversational input and adapts searches and campaigns from user feedback;
  public product material retains human confirmation for consequential actions.

Interpretation:

- Findem is the closest reviewed vendor to a broad company/talent intelligence graph with an
  agent interface.
- Demigod should not compete on graph size. The meaningful comparison is record identity,
  source inspectability, human correction, role relevance, consent, and measured match
  outcomes.
- **Unknown:** percentage of fields with exact public citations, field-specific freshness,
  false-merge/correction rates, and how much expert-labeled provenance is customer-visible.

### 11. Eightfold AI

**Category:** enterprise talent intelligence, acquisition, mobility, and workforce planning<br>
**Competitive proximity:** high for enterprise talent decisions; lower for startup research

Official sources:

- [Eightfold product portfolio — current](https://eightfold.ai/products/)
- [Candidate Agent announcement — July 15, 2026](https://eightfold.ai/blog/meet-candidate-agent/)
- [Talent Agents 2.0 press release — July 15, 2026](https://eightfold.ai/company/press/press-releases/eightfold-ai-grows-talent-agents-to-2-0/)
- [2026 bias audit results — current](https://eightfold.ai/trust/bias-audit-results/)
- [AI Interviewer product page — current](https://eightfold.ai/products/ai-interviewer/)
- [AI transparency checklist — March 2, 2026](https://eightfold.ai/blog/ai-transparency-checklist/)

Documented facts:

- Eightfold spans talent acquisition, talent management, workforce exchange, workforce
  planning, and resource management, combining enterprise data with market and work signals.
- Candidate Agent is described as using 1.6B career trajectories to match, engage, and route
  candidates. This is a **vendor metric**.
- Eightfold says agent actions are logged, explainable, and auditable and that recruiters
  retain ownership of hiring decisions.
- AI Interviewer presents structured assessments while retaining human review and override.
- Eightfold publishes independent BABL bias-audit results and describes a Responsible AI group,
  risk register, and ongoing monitoring.

Interpretation:

- Eightfold's strongest moat claim is enterprise-scale career/skills intelligence embedded
  throughout workforce processes.
- Demigod's smaller opportunity is high-integrity, startup-specific company/hiring context and
  a two-sided service loop, not an enterprise workforce suite.
- **Unknown:** record-level public source lineage and precise freshness of the career graph.

### 12. Juicebox

**Category:** AI talent search, sourcing agents, company/talent insights<br>
**Competitive proximity:** very high for startup-oriented sourcing

Official sources:

- [New Juicebox search experience — February 4, updated April 20, 2026](https://juicebox.ai/blog/introducing-the-new-juicebox-search-experience)
- [Next-generation Juicebox Agents — May 20, 2026](https://juicebox.ai/blog/introducing-the-next-generation-of-juicebox-agents)
- [Company data and talent insights upgrade — April 2026](https://juicebox.ai/blog/company-data-and-talent-insights-just-got-a-major-upgrade-in-juicebox)
- [Funding, revenue, and investor context — January 2026](https://juicebox.ai/blog/funding-revenue-and-investor-data)
- [Research Signals — July 1, 2026](https://juicebox.ai/blog/introducing-research-signals)
- [Profile citations — November 24, 2025, updated March 17, 2026](https://juicebox.ai/blog/profile-citations)
- [Hiring-manager workflows — July 7, 2026](https://juicebox.ai/blog/introducing-hiring-manager-workflows)
- [Agents 2.0 — September 30, 2025](https://juicebox.ai/blog/agent-2-0)

Documented facts:

- Juicebox reports more than 800M profiles and a 79% score on an Exa-published people-search
  benchmark. These are **vendor metrics**; the benchmark basis should be evaluated directly
  before treating the result as comparable to Demigod.
- Search results show criteria side by side, with colored explanations of why a person
  matched.
- Profile citations let a user click a criterion and inspect the supporting profile section.
- Research Signals link to actual papers, patents, PDFs, citation counts, h-index, and recency.
- Company intelligence includes talent inflow/outflow, company tags, funding stages, role
  filters, and time windows.
- Funding-stage context can be tied to when a candidate worked at a company rather than only
  the company's current stage, a directly relevant example of a temporal company–tenure join.
- Agents adapt search strategy from feedback; hiring-manager workflows expose
  approve/skip/reject, notes, and feedback summaries before the next search.

Interpretation:

- Juicebox has the clearest source-inspection and collaborative-calibration story among the
  startup-oriented talent search vendors reviewed.
- Its "citation" can mean a profile section or research artifact. DIE's semantic company
  contract is stricter when it requires an exact source passage, explicit unknown/conflict,
  and successful live replay.
- The vendor's profile count and benchmark score do not establish identity precision,
  source freshness, or real placement outcomes for Demigod's population.

### 13. Exa

**Category:** search/retrieval API and indexes<br>
**Competitive proximity:** infrastructure and evaluation reference

Official sources:

- [People Search Benchmark — December 17, 2025](https://exa.ai/blog/people-search-benchmark)
- [Company Search Benchmarks — January 22, 2026](https://exa.ai/blog/company-search-benchmarks)
- [Search API reference — current docs](https://exa.ai/docs/reference/search)
- [Contents retrieval reference — current docs](https://exa.ai/docs/reference/contents-retrieval)
- [Contents API guide — current docs](https://exa.ai/docs/reference/contents-api-guide)
- [Live crawling and freshness — current docs](https://exa.ai/docs/reference/livecrawling-contents)
- [Search best practices — current docs](https://exa.ai/docs/reference/search-best-practices)

Documented facts:

- Exa reports an index of more than 1B people and more than 50M people-index updates per week.
  These are **vendor metrics**.
- It publishes an open 1,400-query people-search benchmark/evaluation harness.
- Its company benchmark uses roughly 800 queries and distinguishes static from dynamic facts,
  with temporal anchoring and tolerances for changing facts.
- Search supports company, people, research, and news categories and returns URLs, dates,
  request IDs, and cost metadata.
- Contents can return full text or extractive, query-targeted highlights, along with per-URL
  crawl status and errors.
- `maxAgeHours` explicitly controls cache tolerance: zero requests a live fetch, positive
  values bound cache age, and negative one allows cache-only behavior.

Interpretation:

- Exa's open vertical benchmarks are a useful model for a DIE provider bakeoff: freeze the
  queries, distinguish static/dynamic facts, retain temporal expectations, and publish the
  harness.
- Exa can improve source discovery and passage retrieval. It does not replace Demigod's
  assertion validation, conflict policy, identity gate, human review, or outcomes.
- Exa's company/people category limitations should be tested against the exact API behavior;
  current docs note that some date/crawl filtering options differ by category.

### 14. Tavily

**Category:** search, extract, crawl, and research API<br>
**Competitive proximity:** retrieval infrastructure

Official sources:

- [Tavily 101 — January 28, 2026](https://www.tavily.com/blog/tavily-101-ai-powered-search-for-developers)
- [Citation support — updated March 10, 2025](https://help.tavily.com/articles/3960993389-does-tavily-search-api-provide-citations-for-its-results)
- [Hybrid RAG with live web data — August 21, 2025](https://www.tavily.com/blog/hybrid-rag-with-tavily-combining-static-knowledge-and-dynamic-web-data)
- [January 2026 product release — January 2026](https://www.tavily.com/blog/what-tavily-shipped-in-january-26)

Documented facts:

- Tavily exposes search, extract, crawl, and research endpoints designed to return
  model-ready live-web context.
- Its Research endpoint performs iterative search, deduplication, and multi-step research and
  can return structured output.
- Tavily documents source citations, domain controls, time/recency windows, and search-depth
  controls.
- January 2026 release material says the Research endpoint reached general availability and
  adds domain governance and usage APIs.

Interpretation:

- Tavily is a source-discovery and research primitive, not a company/talent entity graph or
  human-review system.
- A useful comparison against the current Firecrawl path would measure exact source recovery,
  quote support, latency, cost, and identity errors on the same frozen holdout. Feature count
  alone would not establish value.

### 15. Firecrawl

**Category:** web search, scraping, crawling, extraction, file parsing, and monitoring<br>
**Competitive proximity:** existing retrieval fallback and potential collector substrate

Official sources:

- [AI-powered data retrieval — March 3, 2026](https://www.firecrawl.dev/blog/ai-powered-data-retrieval)
- [Firecrawl 101 — May 18, 2026](https://www.firecrawl.dev/blog/firecrawl-101)
- [Choosing a structured-data extractor — current docs](https://docs.firecrawl.dev/developer-guides/usage-guides/choosing-the-data-extractor)
- [Change Tracking — April 14, 2025](https://www.firecrawl.dev/blog/launch-week-iii-day-1-introducing-change-tracking)
- [Parse announcement — April 28, 2026](https://www.firecrawl.dev/blog/introducing-parse)
- [Monitor launch — May 27, 2026](https://www.firecrawl.dev/blog/firecrawl-monitoring-launch)
- [Monitor tutorial — July 16, 2026](https://www.firecrawl.dev/blog/monitor-website-changes-firecrawl)
- [Monitor product page — current](https://www.firecrawl.dev/monitor)
- [Scrape API reference — current docs](https://docs.firecrawl.dev/api-reference/endpoint/scrape)

Documented facts:

- Firecrawl's current platform covers web search, single-page scrape, full-site crawl, URL map,
  file parse, structured extraction/agent gathering, and browser interaction.
- Single-page extraction can return markdown or schema-shaped JSON; the Agent path can discover
  sources across the web.
- Change Tracking stores the previous scrape time and labels pages as new, same, changed, or
  removed, with textual and structured diffs.
- Monitor schedules checks against pages, sites, or searches, stores snapshots, filters noisy
  changes with a goal, and sends structured diffs through signed webhooks or email.
- Monitor supports schedules as frequent as every five minutes, exposes a permalink for each
  change, and reports estimated monthly cost before activation.

Interpretation:

- Firecrawl already participates in Demigod's live quote-replay path as a fallback when direct
  text extraction is insufficient.
- Its new Monitor capability could eventually remove custom polling/diff infrastructure if
  a real field needs change-triggered refresh. Monitor output would still be a candidate
  evidence packet, not an automatically accepted Demigod assertion.
- Firecrawl is strongest at source acquisition and change detection. Company identity,
  source authority, claim policy, contradiction handling, reviewer state, and match outcomes
  remain Demigod responsibilities.

## Cross-market findings

### 1. Continuous research is becoming an input, not the moat

Clay publishes persistent account memory and change-aware research; Common Room publishes
always-on account research; Harmonic publishes daily refresh for priority companies; Findem
publishes dynamic graph/pool behavior; Firecrawl now sells scheduled page/site/web monitoring.

**Implication:** DIE's defensibility cannot rest on scheduling agents or periodically
re-researching accounts. It can rest on what becomes a trusted assertion, how contradictions
are handled, how the fact affects a match review, and what outcome follows.

### 2. "Explainable" describes several non-equivalent things

The primary sources expose at least five different transparency layers:

1. **Model/reasoning trace:** Claygent.
2. **Matched criteria or narrative explanation:** Gem, Juicebox, SeekOut.
3. **Supporting record section or external artifact:** Juicebox.
4. **Data-source methodology and internal QA:** Crunchbase, PDL.
5. **Logged/auditable actions and governance:** Clay Account Research Agents, Ashby,
   Eightfold.

These are not interchangeable. A reasoning trace can still rely on a wrong source; a source
methodology does not show which source supported a specific field; an audited workflow does
not guarantee current content.

**Implication:** DIE should keep its stronger, narrow definition: assertion → exact passage
and URL → observation time → support/conflict/unknown state → verification result → reviewer
decision. If a provider cannot return the passage, its result can nominate a source or create
a review candidate, but should not silently become verified.

### 3. Human control is table stakes in recruiting

Ashby, Gem, SeekOut, Findem, Eightfold, and Juicebox all publicly describe human-defined
criteria, approval, override, feedback, or retained hiring authority. SeekOut Spot goes
further by bundling a human recruiter.

**Implication:** Demigod's distinction is not merely "a human is present." It is the specific
authority boundary: research cannot change score or pair state; a reviewer decides; both
people consent; outbound introduction remains separately gated; and outcomes remain linked
to the pair.

### 4. Vendor scale numbers are not directly comparable

The reviewed vendors claim scales ranging from tens of millions of companies to hundreds of
millions or more than a billion people profiles and trillions of data points. The units,
deduplication rules, active-record definitions, update windows, and quality thresholds differ.

**Implication:** graph size is not a useful DIE acceptance criterion. The relevant measures
are exact identity precision, supported coverage for a named field, evidence portability,
freshness, correction rate, latency, and cost on Demigod's actual company/role population.

### 5. Freshness has multiple meanings

- PDL publishes dataset release versions and field-level update metadata.
- Harmonic describes daily refresh for a priority cohort.
- Crunchbase describes continuous updates and weekly prediction refresh.
- Exa exposes explicit content-cache age and live-crawl controls.
- Firecrawl exposes scheduled checks and page-level diffs.
- Clay and Common Room describe event-/segment-driven persistent research.
- Many talent platforms use "dynamic" or "real-time" language without a public field SLA.

Demigod already separates map freshness, claim research time, and live quote-verification
freshness. That distinction is worth preserving.

### 6. AI/MCP is becoming a normal interface

Harmonic, SeekOut, and Findem publish MCP or agent-interface capabilities; Clay publishes a
Claude connector; Gem, Common Room, and Juicebox publish conversational or autonomous agents.

**Implication:** an agent chat surface is not a standalone competitive advantage. A useful
agent must still operate inside Demigod's exact contracts and action gates.

## Concrete implications for Demigod

### Keep building on the existing spine

The competitive research reinforces the current integrated design:

- Keep the startup map as the company-universe and provenance source.
- Keep verified ATS ownership and the monotonic role ledger as hiring truth.
- Keep the frozen benchmark separate from the operational catalog.
- Keep company research as a sidecar to the existing match-review, ranking, funnel, and
  dashboard paths.
- Keep `supported`, `conflict`, and `unknown`; do not replace them with model confidence.
- Keep exact-quote replay and sealed receipts as the trust gate.
- Add real-role usage and outcome markers in the existing pair/outcome workflow when the
  product gate is reached.

This is an integration strategy, not a second platform.

### Build, buy, and integrate boundary

| Keep/build inside Demigod | Buy or test only for a measured gap | Integrate as a destination/input | Avoid duplicating |
|---|---|---|---|
| Exact company/ATS identity and quarantine rules | Private-company attributes from Harmonic or Crunchbase | Existing ATS feeds | A generic ATS |
| Claim/evidence/conflict/unknown contract | Company attributes from PDL, with evidence and contract review | Optional CRM projection such as Attio | A CRM or outbound sequencer |
| Gold-vs-operational evaluation boundary | Source discovery/passages from Exa or Tavily | First-party company sites, YC, Wikidata, HN | A broad people/company graph |
| Human match-review authority and two-sided consent | Web extraction/monitoring from Firecrawl | Founder/candidate corrections and outcome facts | A crawler/monitor stack already supplied by infrastructure vendors |
| Outcome-linked evaluation | One field-specific provider bakeoff after an observed gap | Existing dashboard/review card | A generic recipe DSL, agent swarm, or knowledge graph |

### Use an evidence-level contract for every provider

A practical comparison ladder:

| Level | Provider output | Permitted DIE use |
|---|---|---|
| E0 | Generated value with no inspectable source | Discovery hint only; do not project |
| E1 | Source URL or provider record provenance | Fetch/review candidate |
| E2 | Exact supporting passage + URL + observation time | Candidate `supported`/`conflict` assertion after validation |
| E3 | E2 plus successful replay/hash and freshness receipt | Projectable under the accepted field policy |
| E4 | E3 plus correction/reviewer history and reverse dependencies | Strong operational assertion with auditable change impact |

Clay, Ashby, Juicebox, Crunchbase, and PDL each expose parts of this ladder, but in different
forms. No provider should be assigned an evidence level from marketing language alone; grade
the actual API/product response.

### Run provider tests against one frozen problem

When a real review names a recurring missing field, compare providers on the same companies,
field definition, source policy, and observation date. Retain raw responses. Measure:

- entity-resolution precision and false merges;
- usable field coverage;
- percentage with exact supporting passages;
- support/conflict/unknown distribution;
- source authority and first-party recovery;
- field observation time and update lag;
- corrections required by a reviewer;
- latency and cost per usable, evidenced field;
- license/retention rights for values, sources, and quotations;
- privacy and employment-data constraints;
- whether a failed provider response remains safely unknown.

Potential source candidates by problem:

- **Funding, investors, market/category:** Crunchbase or Harmonic.
- **Broad normalized company attributes:** PDL; person attributes remain outside the current
  DIE slice.
- **Private startup discovery:** Harmonic; people-movement data remains outside the current
  DIE slice.
- **Source discovery and exact passages:** Exa or Tavily.
- **Known-page extraction and change detection:** the existing Firecrawl path.
- **CRM persistence/manual override:** Attio only if a real operating workflow uses it.

### Preserve retrieval-provider substitutability

Exa, Tavily, and Firecrawl are most valuable as replaceable adapters behind one evidence
contract. A side-by-side retrieval test should use the current frozen company set or a new
sealed holdout and should not alter accepted-field policy. A provider wins only if it
improves supported coverage, evidence recovery, freshness, latency, or cost without
increasing identity errors.

### Make outcome-linked evidence the differentiated dataset

Public competitors emphasize data scale, search, enrichment, recommendations, and workflow.
Demigod can accumulate a different dataset:

```text
company/role assertion
  -> exact evidence consulted
  -> reviewer correction or decision effect
  -> founder and candidate consent
  -> intro/interview/hire/decline outcome
```

The causal claim must remain modest: the record can say evidence was consulted, corrected, or
changed a decision; it should not claim the evidence caused a hire without an appropriate
study. Even with that constraint, this joins research quality to the actual matching service
more directly than generic enrichment metrics.

## What the public primary sources do not establish

Across the market, several important facts remain unknown or non-comparable:

- net pricing and contract minimums for Demigod's expected volume;
- coverage and identity accuracy on Demigod's exact SF startup/talent population;
- percentage of generated attributes with portable exact source passages;
- licensing rights to persist source text, derived values, and correction history;
- provider false-merge and false-negative rates;
- field-specific freshness distributions rather than a headline cadence;
- deletion, suppression, privacy, and data-subject handling for person data;
- customer-visible correction and reviewer audit trails;
- how models behave when sources disagree or disappear;
- whether agent actions are always approval-gated in every product configuration;
- real interview, mutual-consent, or placement lift attributable to the intelligence layer.

These unknowns are the reason a narrow benchmark is more informative than a feature checklist.

## Bottom line

Clay, Common Room, Harmonic, and Findem demonstrate that persistent company/account
intelligence is already a competitive market. Ashby, Gem, SeekOut, Eightfold, and Juicebox
demonstrate that AI-assisted talent search with human control is also established. Exa,
Tavily, and Firecrawl make retrieval and monitoring increasingly purchasable infrastructure.

Demigod's strongest course is to continue integrating DIE into what already exists:
high-integrity company and hiring identity, exact evidence, explicit conflict/unknown,
human-reviewed matches, mutual consent, and outcome-linked learning. Provider data can extend
one proven field gap at a time; it should enter as candidate evidence under the same fail-closed
contract, not as a new source of automatic authority.

## Related DIE documents

- [Research synthesis](SYNTHESIS.md)
- [DIE roadmap](../ROADMAP.md)
- [Normative DIE specification](../../../DEMIGOD-DIE-SPEC.md)
