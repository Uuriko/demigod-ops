# DIE hosted web app deep research — 2026-08-15

**Question:** what should change in the DIE hosted-webapp specification after a deeper review of
current recruiting products, private-app hosting, SQLite operations, application security,
accessibility, and employment-data rules?

**Method:** official product documentation, first-party platform documentation, standards bodies,
and government sources only. Vendor descriptions are evidence of product mechanics, not proof of
accuracy, fairness, or commercial results. Legal sources identify design gates; this memo is not a
legal opinion about whether a particular rule applies to Demigod.

## Executive conclusion

The existing architecture is directionally right: build a separate, narrow product server; keep the
agent dashboard loopback-only; ship read-only first; place a managed identity proxy in front of a
private origin; and move workflow writes into one transactional store before enabling them.

The deeper research makes six changes material:

1. The app should open on a **role workspace**, not a generic company browser. The best current
   recruiting products organize brief, criteria, search channels, evaluation, shortlist, and activity
   around one role.
2. Review must be **criterion-by-criterion and independently submitted**. Evidence can be answered,
   unknown, skipped, stale, or conflicting; another reviewer's conclusion stays hidden until the
   current reviewer submits.
3. Company/candidate tables are navigation and triage surfaces, while a record page and activity
   timeline hold context. Spreadsheet editing, saved-view builders, and bulk actions are later needs.
4. Cloudflare Access plus a named Tunnel remains the best hosted default for the current environment.
   A random quick tunnel is not an authentication or production mechanism.
5. SQLite is the smallest credible mutation store, but it must live on local persistent disk, use a
   supported backup API, and pass restore plus integrity checks. Plain copying of a live database is
   not the backup design.
6. “Human decides” does not automatically remove employment-automation obligations. Real-candidate
   evaluation needs a jurisdiction/use classification, data-purpose and retention map, notice and
   accommodation paths where applicable, and outcome monitoring before H4.

## 1. Product mechanics that survived scrutiny

### 1.1 One role is the work unit

SeekOut's current Workspaces product keeps search, evaluation, shortlist, and outreach in one
role-scoped workspace. Its guided setup asks operators to confirm the job description, choose a small
set of key skills or experiences, inspect the generated search, and edit its yes/no evaluation
criteria before use. That is a useful interaction pattern even though Demigod should not copy
SeekOut's aggregate scoring or outreach automation.

Greenhouse's structured-hiring flow begins with role kickoff, then defines a scorecard and interview
plan, assigns focus attributes, collects feedback, and conducts a roundup. Its documentation says the
criteria should be role-specific and kept brief enough to assess in a realistic interview process.

**DIE decision:** `/roles/:roleId` is the application center. It uses this order:

```text
accepted brief
  -> must-have criteria and evidence questions
  -> permitted candidate channels
  -> candidate evidence review
  -> capped shortlist
  -> interview plan and independent notes
  -> debrief, consent, and outcome state
```

Official sources:

- [SeekOut Workspaces](https://support.seekout.com/en/articles/12805473-how-to-use-seekout-workspaces)
- [Greenhouse structured hiring](https://support.greenhouse.io/hc/en-us/articles/360039539772-Structured-hiring-guide)
- [Greenhouse scorecard definitions](https://support.greenhouse.io/hc/en-us/articles/360007247412-Structured-hiring-Scorecard-definitions)
- [Greenhouse interview plans](https://support.greenhouse.io/hc/en-us/articles/115002194903-Interview-plan-overview)

### 1.2 Criteria need evidence and explicit uncertainty

Ashby's assisted application review evaluates each human-authored criterion separately, shows source
citations, marks indeterminate material as unknown or skipped, and leaves advance/reject to the human
reviewer. Its product also exposes flag and override controls. These are stronger mechanics than a
single opaque match score.

**DIE decision:** show an evidence matrix, not a fit score:

| Criterion | State | Evidence | Source/use | Reviewer |
|---|---|---|---|---|
| must-have A | answered | exact permitted span | source + as-of | human confirmation |
| must-have B | unknown | none | searched sources | unresolved |
| must-have C | conflict | both spans | both sources | review required |

Generated search filters and evidence questions are drafts until a human accepts them. An override
adds a correction receipt; it does not silently erase the earlier model output.

Official source: [Ashby AI-assisted application review](https://www.ashbyhq.com/product-updates/ai-assisted-application-review).

### 1.3 Independent review is a product requirement

Greenhouse supports hiding other interviewers' scorecards until the current interviewer submits their
own. The stated purpose is to avoid one review influencing another. It also makes scorecard visibility
and post-submission editing permissioned.

**DIE decision:** when H5 adds a second reviewer:

- each reviewer sees the role rubric and candidate evidence, not another unsubmitted judgment;
- submission freezes the original note and reveals the comparison view;
- a later correction is appended and attributed;
- debrief shows agreement, disagreement, unknowns, and evidence coverage—not averaged sentiment.

Official sources:

- [Greenhouse scorecard visibility](https://support.greenhouse.io/hc/en-us/articles/16187220652059-Scorecard-visibility-options)
- [Greenhouse permission policies](https://support.greenhouse.io/hc/en-us/articles/115002226606-Permission-policies-overview)

### 1.4 Rediscovery needs contact and outcome memory

SeekOut's rediscovery documentation imports a small set of prior-context fields such as last contact,
status, rejection reason, and owner. Gem combines prior applicants and CRM prospects with new search
and suppresses recently sourced prospects for a defined interval. The exact interval is vendor policy,
not a Demigod default; the reusable mechanism is eligibility based on owned history.

**DIE decision:** candidate-channel rows must expose channel, prior role/outcome, last permitted
contact, consent/use state, staleness, and suppression reason before any shortlist control appears.

Official sources:

- [SeekOut Talent Rediscovery](https://support.seekout.com/en/articles/11878023-what-is-talent-rediscovery)
- [Gem AI rediscovery](https://help.gem.com/external/gem-ai-rediscovery-overview-getting-started)
- [Gem ATS rediscovery](https://help.gem.com/external/ats-candidate-rediscovery-ats-search)

### 1.5 Tables navigate; record pages explain

Attio's model uses all-record views for filtering and sorting, record pages for related context, and an
activity tab for interactions and changes. It also exposes cell-level edit history. Clay similarly
provides table change history and configuration versions, while explicitly warning that structural
versioning does not restore overwritten row data.

**DIE decision:** H1 uses bounded server-side tables to find a role or company, then deep-links to a
record page. The activity timeline is backed by durable domain receipts. It is not reconstructed from
access logs, and no “undo” claim is made without actual row-data restoration.

Saved views, kanban, bulk editing, spreadsheet keyboard semantics, and user-designed fields remain
out of H1. They become candidates only after repeated operator work shows that fixed role/company
views are insufficient.

Official sources:

- [Attio table views](https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views)
- [Attio records and activity](https://attio.com/help/reference/managing-your-data/records/create-and-view-records)
- [Clay table history and settings](https://university.clay.com/docs/table-management-settings)
- [Clay table versions](https://university.clay.com/docs/table-versions)

### 1.6 Agent access must inherit human permissions

Ashby's MCP and assistant documentation says agent reads and writes run as the individual user and
respect the same job, team, and object permissions. This supports Demigod's later direction but not an
H1 service account with broad authority.

**DIE decision:** no hosted agent API in H1/H2. A later agent connection uses delegated user identity,
route-scoped tools, and separate read/write grants. A shared bearer token never stands in for a human
actor on a mutation.

Official sources:

- [Ashby MCP](https://www.ashbyhq.com/product-updates/mcp)
- [Ashby Assistant permissions and citations](https://www.ashbyhq.com/product-updates/ashby-assistant)

## 2. Private hosting and identity

### 2.1 Chosen shape

```text
authenticated browser
  -> Cloudflare Access allow policy + MFA
  -> named Cloudflare Tunnel with Protect with Access
  -> loopback-only DIE web process on a dedicated host
```

Cloudflare Tunnel establishes outbound-only connections, so the origin does not need a public inbound
application port. Access can protect a self-hosted application and issue an application JWT. The Tunnel
can validate that token before proxying when Protect with Access is enabled; if a future topology lets
traffic reach the origin without that validated Tunnel path, the application must validate the JWT
signature and audience itself.

This environment already has `cloudflared` and existing Demigod quick-tunnel machinery. That is useful
implementation familiarity, not permission to reuse a public random tunnel: DIE requires a named,
policy-protected tunnel and a separate service definition.

Official sources:

- [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)
- [Protect a self-hosted application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- [Access application token](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
- [Cloudflare Access policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
- [Cloudflare Access MFA](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/)

### 2.2 Authentication logs are not workflow audit

Cloudflare distinguishes authentication events from application activity. Per-request network logs
still do not capture purely client-side interactions or the before/after meaning of a mutation.

**DIE decision:** Access logs answer “who reached which HTTP resource?” App audit events answer “who
changed which role/candidate fact from what version to what version, under which authority?” Both are
kept, and neither substitutes for the other.

Official source: [Cloudflare Access authentication logs](https://developers.cloudflare.com/cloudflare-one/insights/logs/dashboard-logs/access-authentication-logs/).

### 2.3 Session and service-token defaults

- require an exact email/identity allowlist, not an entire public email domain;
- require MFA and use a short application-policy session;
- provide a visible logout route to the Access logout endpoint;
- do not mint a service token for H1/H2;
- if a read-only automation later requires one, give it a separate Access policy, expiry, rotation,
  revocation, and route allowlist;
- never let a service token mutate candidate or employment workflow state.

Official sources:

- [Access session management](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)
- [Access service tokens](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/)

### 2.4 Rejected hosting shortcuts

Tailscale Serve is a credible internal-only alternative and injects identity headers for tailnet users,
but it requires the client to join the tailnet and uses a tailnet hostname. It is a good emergency/internal
pilot option, not the default branded application path. It is not currently installed in this environment.

Fly Volumes are local persistent disks, but Fly explicitly says a single Machine/volume has downtime and
data-loss risk and that its volume snapshots are not a primary backup. Adding a second platform plus
replication to avoid that risk is unnecessary for the single-operator pilot.

Official sources:

- [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve)
- [Fly Volumes](https://fly.io/docs/volumes/overview/)

## 3. Transactional storage

### 3.1 SQLite remains the default

The current workflow is one operator and one process. SQLite provides transactions and constraints
without a database service. Node 24's built-in `node:sqlite` has the smallest dependency surface and
already supports prepared statements, foreign keys by default, defensive mode by default in current
24.x, a busy timeout, and an online backup API.

The caveat is real: the module is documented as Stability 1.2, release candidate, and its API is
synchronous. The H3 spike must qualify the exact pinned Node release with the projected workload and
restore test before selecting it. A driver dependency is justified only if that spike fails.

Official source: [Node 24 `node:sqlite`](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html).

### 3.2 Operating constraints

- database, WAL, and shared-memory files live on local persistent disk;
- never mount the live database over NFS or another network filesystem;
- one application process owns writes;
- foreign keys, strict schemas, check constraints, and prepared statements enforce invariants;
- set a bounded busy timeout and make lock exhaustion an explicit retryable error;
- keep transactions short and never call a remote provider inside a transaction;
- default journal mode is acceptable initially; enable WAL only if a concurrency test shows that
  readers blocking on brief writes matters;
- if WAL is enabled, test checkpoint, backup, shutdown, and restore behavior as one unit.

SQLite's own documentation says WAL readers and writers can proceed concurrently, but every process
must be on the same host. It also warns about locking and corruption risk on network filesystems.

Official sources:

- [SQLite WAL](https://www.sqlite.org/wal.html)
- [SQLite over a network](https://www.sqlite.org/useovernet.html)
- [SQLite corruption and filesystem locking](https://www.sqlite.org/howtocorrupt.html)

### 3.3 Backup is a runnable contract

Use the SQLite/Node online backup API or `VACUUM INTO` to create a consistent snapshot of a live
database. Do not present `cp live.db backup.db` as the production backup path.

Each backup job must:

1. produce a timestamped encrypted/versioned artifact outside the live data directory;
2. restore it into a temporary empty data root;
3. run `quick_check` or `integrity_check` plus `foreign_key_check`;
4. compare row counts and deterministic role/company-workspace fixtures;
5. report the release/schema version and artifact hash;
6. fail the readiness gate if the last successful restore drill is stale.

Official sources:

- [SQLite online backup API](https://www.sqlite.org/backup.html)
- [SQLite integrity and foreign-key checks](https://sqlite.org/pragma.html)

## 4. Application-security baseline

OWASP's current API guidance emphasizes object-level authorization, object-property authorization,
resource consumption, function authorization, inventory, and unsafe downstream API use. This maps
directly to a recruiting app whose URLs contain role, candidate, and company identifiers.

**DIE controls:**

- allowlist response fields; never serialize a private domain/store object and hide fields in the UI;
- deny by default and authorize every request, entity, method, and field;
- bound IDs, queries, body bytes, page size, sort keys, and execution time;
- no CORS in the private browser app;
- accept unsafe requests only as JSON with an exact Origin, same-origin Fetch Metadata, and a custom
  intent/CSRF header; reject browser-simple content types;
- keep all state changes off `GET` and `HEAD`;
- send CSP as a response header on every HTML response, with `default-src 'none'` and only the exact
  same-origin directives needed;
- load no third-party JavaScript, analytics tag, chat widget, font, or session replay;
- redact tokens, contact details, resumes, free text, and query secrets from logs;
- maintain a route inventory and fail on unknown or deprecated routes;
- use OWASP ASVS 5.0 Level 2 as the verification checklist for the private app.

Official sources:

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP REST security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP CSP guidance](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/)

## 5. Accessibility baseline

WCAG 2.2 is the target at Level AA. W3C recommends native HTML tables whenever possible; an ARIA grid
is an interactive composite with substantially more keyboard behavior. H1 therefore uses semantic
tables and ordinary links/buttons, not a custom spreadsheet grid.

Required checks include logical focus order, visible and unobscured focus, descriptive headings and
labels, keyboard-complete operation, programmatically exposed status/error messages, zoom/reflow,
non-color status, and target size. Automated axe results are a smoke check, not full conformance.

Official sources:

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/)
- [W3C focus-order guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)
- [W3C headings and labels](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels)

## 6. Employment data and automated evaluation

### 6.1 California employment rules are already live

California's Civil Rights Council says its automated-decision-system employment regulations became
effective October 1, 2025. The final definition includes systems that screen, evaluate, categorize, or
recommend applicants, including resume screening and analysis of third-party applicant data. The
Council also says covered employers/entities must retain employment records, including automated-
decision data, for at least four years.

**Implication:** evidence questions plus a human final decision may still be regulated depending on
how DIE is used. “No global score” and “human review” remain sound product choices but are not a legal
classification. H4 cannot begin until the actual workflow, users, geography, data, and effect are mapped.

Official sources:

- [California automated-employment rulemaking](https://calcivilrights.ca.gov/civilrightscouncil/rulemaking-actions/)
- [Final automated-employment regulations](https://calcivilrights.ca.gov/wp-content/uploads/sites/32/2025/06/Final-Text-regulations-automated-employment-decision-systems.pdf)
- [California Civil Rights Council summary](https://calcivilrights.ca.gov/2025/06/30/civil-rights-council-secures-approval-for-regulations-to-protect-against-employment-discrimination-related-to-artificial-intelligence/)

### 6.2 California privacy rights can include applicant data

The California Attorney General states that the former employment-data exemption ended and covered
businesses can have notice, access, deletion, correction, and other obligations for employees and job
applicants. The CCPA applies only when its business thresholds and other conditions are met; the plan
must not assume applicability or non-applicability without classification.

The CPPA's completed ADMT regulations took effect January 1, 2026. It says covered businesses using
ADMT for significant decisions must comply with the ADMT requirements beginning January 1, 2027.
Purpose limitation and data minimization require covered businesses to keep collection, use, and
retention reasonably necessary and proportionate to disclosed purposes.

**Implication:** design the data map, notices, correction/deletion workflow, and purpose-bound fields
before real candidate data, while allowing a documented legal-retention exception instead of promising
unconditional deletion.

Official sources:

- [California Attorney General CCPA overview](https://oag.ca.gov/privacy/ccpa)
- [California employer/applicant enforcement notice](https://oag.ca.gov/news/press-releases/attorney-general-bonta-seeks-information-california-employers-compliance)
- [CPPA completed ADMT rulemaking](https://cppa.ca.gov/regulations/ccpa_updates.html)
- [CPPA implementation dates](https://cppa.ca.gov/announcements/2025/20250923.html)
- [CPPA privacy-rights FAQ](https://cppa.ca.gov/faq)

### 6.3 Geography changes the gate

New York City's Local Law 144 applies to covered use of automated employment decision tools in the
city and requires a recent independent bias audit, public summary, and advance candidate/employee
notice. The official city page says the notice must precede use by 10 business days.

**Implication:** the initial SF operating scope is a real product boundary. Any NYC candidate, employer,
or employment-decision use must trigger jurisdiction review before the workflow runs; a UI location
label is not a compliance control.

Official source: [NYC Automated Employment Decision Tools](https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page).

### 6.4 Accommodation and alternative process

The EEOC warns that algorithmic or AI tools can screen out people with disabilities and says employers
may need a reasonable accommodation or alternative assessment format. It recommends telling people
what a tool evaluates and how to request accommodation.

**DIE decision:** before external candidate evaluation, supply a non-automated review path, accessible
intake, plain-language notice about assessed criteria/data, and an accommodation contact/process where
applicable. Do not infer disability or other protected traits in order to “test fairness.”

Official source: [EEOC artificial intelligence and the ADA](https://www.eeoc.gov/eeoc-disability-related-resources/artificial-intelligence-and-ada).

## 7. Exact plan changes

| Existing plan area | Deeper decision |
|---|---|
| H1 home | role list opens the last/active role workspace; companies are supporting context |
| Candidate UI | channel-first queue plus criterion evidence matrix; no aggregate score |
| Reviews | independent submission and append-only correction before multi-reviewer launch |
| Tables | native read-only HTML table first; no spreadsheet/grid framework |
| Authentication | named Tunnel + Access + MFA + Protect with Access; never a quick tunnel |
| App audit | domain mutation receipts separate from Access authentication/request logs |
| CSRF | no CORS; JSON + custom header + exact Origin + Fetch Metadata on unsafe methods |
| Storage | qualify `node:sqlite`; local persistent disk; one writer; online backup + restore drill |
| WAL | enable only after concurrency evidence; never on network storage |
| Real candidates | use/jurisdiction/impact classification gate before H4 |
| Retention | record-class schedule with legal-hold/required-retention disposition |
| Accessibility | WCAG 2.2 AA; native HTML before ARIA composite widgets |
| Agent API | no H1/H2 token; delegated user-scoped access only after a real use case |

## 8. What not to add after this research

- no React/Next.js migration for a read-only six-route operator app;
- no editable spreadsheet engine, kanban, or workflow builder in H1;
- no organization/tenant schema before a second isolated customer exists;
- no public registration or candidate portal before the operator loop works;
- no model-generated candidate rank or global score;
- no third-party analytics or session replay around applicant data;
- no service token with mutation authority;
- no random `trycloudflare.com` URL for private candidate data;
- no Fly/LiteFS/distributed SQLite topology for a single-operator pilot;
- no promise that human review alone resolves automated-employment obligations.

## 9. Residual uncertainties

These are trigger-bound questions, not blockers to H0/H1:

- whether the dedicated host is this machine or a separately provisioned machine;
- which identity provider backs Access and what MFA assertion it exposes;
- whether `node:sqlite` on the exact pinned Node release passes the H3 fault/restore workload;
- which Demigod entity is employer, employment agency, service provider, or other covered actor for a
  specific real pilot;
- which candidate/employer jurisdictions enter the first real role;
- which records are deletable immediately and which must be retained under a documented obligation;
- whether later customer isolation requires Postgres rather than single-host SQLite.

The weakest sufficient conclusion is still to build H0/H1 now. None of these uncertainties requires a
framework, multi-tenant schema, public deployment, or automated candidate decision in the first slice.
