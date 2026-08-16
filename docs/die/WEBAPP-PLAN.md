# DIE hosted web app plan

**Status:** architecture and execution plan · 2026-08-16
**Product:** Demigod Intelligence Engine inside Demigod, not a separate brand
**Target:** private operator web app first; customer/team product only after the real workflow proves it

## 1. Decision

Build a dedicated hosted DIE application at an eventual private origin such as
`app.trydemigod.com`.

Do **not** expose `demigod-agent-dashboard.mjs`. That server is a trusted local operations console:
it binds to loopback, assumes local requests, reads machine receipts, and can execute allowlisted
jobs and workflow mutations. Its host/origin defenses are correct for localhost and are not user
authentication.

The hosted app will instead:

- reuse the existing pure company, role-workspace, evidence, and review functions;
- use a new narrow HTTP entry point with product routes only;
- begin read-only, then add a small set of audited workflow mutations;
- keep Webflow as the public marketing/intake surface;
- keep the existing agent/ship/diagnostic dashboard loopback-only;
- preserve human review, consent, intro, publishing, spending, and employment-decision boundaries.

This is not a frontend rewrite. The initial app remains Node.js plus browser-native HTML, CSS, and
JavaScript. A framework becomes justified only when observed UI state or team velocity makes the
existing approach measurably costly.

## 2. Evidence behind the decision

Current source truth:

- the local dashboard server is 5,234 lines and the UI shell is 2,346 lines;
- the dashboard exposes more than 30 operational routes, including jobs, handoffs, match mutation,
  review execution, Webflow diagnostics, agent state, and ship state;
- it rejects non-loopback hosts and has no hosted-user authentication or application session;
- role packets, notes, batches, touches, pairs, and referrals currently use private JSON stores,
  atomic writes, and file locks;
- the company table currently has 2,754 exact map identities;
- the role-workspace composition, company packet, candidate channels, suppression, and evidence
  questions already have runnable local contracts;
- there are zero accepted real roles today; the two role packets are demo/seed state;
- the full Demigod verifier passed before this plan was written.

The weakest sufficient product hypothesis is therefore:

> A single trusted operator needs authenticated remote access to the role and company workflow
> before Demigod needs a multi-tenant recruiting SaaS.

That hypothesis supports a useful hosted product without prematurely committing to organizations,
billing, customer administration, public candidate profiles, a frontend framework, or a distributed
database.

## 3. Product boundary

### 3.1 Surfaces

| Surface | Audience | State | Hosted-app relationship |
|---|---|---|---|
| `trydemigod.com` | Public founders and candidates | Webflow/CDN | Remains marketing and intake |
| Local agent dashboard `:9878` | Trusted machine operator/agents | Loopback only | Never exposed or tunneled |
| DIE hosted app | Authenticated operator | New | Company and role workflow only |
| Candidate/founder portal | External participants | Not built | Add only after real workflow evidence |
| Agent API/MCP | Approved automation | Not hosted initially | Read-only service identity later |

### 3.2 V1 operator jobs

The first useful application must let an authenticated operator:

1. browse and search exact company identities;
2. inspect one company packet, hiring evidence, unknowns, journal, and peers;
3. list role packets with explicit demo/real and readiness state;
4. open one complete role workspace;
5. inspect candidate channels and suppression reasons without a global fit score;
6. inspect each must-have evidence question and answered/unknown/stale/conflict state;
7. inspect the bounded shortlist and human review notes;
8. see an append-only activity/audit view for every hosted mutation.

Read-only delivery of jobs 1–7 is the first hosted milestone. Role calibration and review-note writes
enter only after the mutation and storage contracts are ready.

### 3.3 Explicit non-goals for V1

- no public registration;
- no organizations, invitations, seat management, billing, or subscriptions;
- no public candidate profiles or company intelligence pages;
- no email, DM, intro delivery, calendar booking, ATS writeback, Webflow publishing, or money movement;
- no automatic employment recommendation or global fit verdict;
- no raw transcript, resume download, wallet, secret, agent-bus, shell-job, or ship-control route;
- no multi-region or multi-instance deployment;
- no new scraping/enrichment provider;
- no generic workflow builder.

## 4. User experience

### 4.1 Information architecture

```text
Sign in (managed access layer)
  -> Roles
       -> Role workspace
            calibration
            company context
            candidate channels
            suppression
            evidence questions
            shortlist and reviews
            activity
  -> Companies
       -> Company packet
            identity and hiring
            research and evidence
            unknowns/conflicts
            journal and peers
  -> Activity
       hosted workflow receipts only
```

### 4.2 Main screens

**Roles:** compact list, demo/real badge, readiness checkpoints, stage, candidate-channel counts, and
last material update. A demo can never look accepted for delivery.

**Role workspace:** the primary product. Preserve the current
`demigod.role-workspace/1` object and progressively disclose calibration, candidates, evidence, and
relationship context. Suppressed candidates remain visible with reasons but are not actionable.

**Companies:** server-side search over exact identity/name/domain, bounded pagination, hiring state,
unknown count, and packet link. Do not send all 2,754 packets to the browser.

**Company packet:** evidence and unknowns first. Dry-run enrichment and writeback preview may be added
later as generated artifacts, never as implicit mutation buttons.

**Activity:** actor, time, entity, action, before/after version, idempotency key, and result. Avoid
logging candidate free text or contact data.

### 4.3 Interaction defaults

- semantic HTML and native controls;
- keyboard-complete navigation and visible focus;
- real URLs for roles and companies, with back/forward support;
- loading, empty, unknown, stale, conflict, suppressed, error, and demo states;
- no optimistic success for authority-changing mutations;
- no color-only status;
- mobile-readable, desktop-optimized operator layout;
- no third-party analytics, chat widget, or session replay in the private app.

## 5. Architecture

### 5.1 Process boundary

Create a dedicated executable, provisionally:

```text
demigod-die-web.mjs
demigod-die-web-ui.html
demigod-die-web-http-policy.mjs
demigod-die-web.test.mjs
```

It may import product modules such as:

- `demigod-company-table.mjs`;
- `demigod-company-packet.mjs`;
- `demigod-structured-hiring.mjs`;
- `demigod-role-packet.mjs` after writes are enabled;
- existing private projection and validation helpers.

It must not import or invoke:

- `demigod-agent-dashboard.mjs`;
- `child_process`;
- the dashboard job allowlist;
- ship, publish, DM, outreach, wallet, or browser-automation modules;
- raw agent-bus or machine-status files.

The separation is structural, not merely a runtime flag. A static test will fail if forbidden imports
or routes appear.

### 5.2 Initial runtime

- Node.js 24, pinned to the verified runtime line;
- one process and one writer;
- browser-native UI with no bundler;
- JSON over HTTPS;
- server-side bounded filtering/pagination;
- CSP, no-store, no-referrer, frame denial, MIME sniffing denial, and restrictive permissions policy;
- structured JSON logs with request IDs and redaction.

The current repository has no production web framework or database dependency. Adding either before
the route and mutation contracts demand it would create a second architecture without improving the
first milestone.

### 5.3 API V1

Read-only milestone:

```text
GET /healthz
GET /api/v1/session
GET /api/v1/companies?q=&limit=&cursor=
GET /api/v1/companies/:companyId
GET /api/v1/roles
GET /api/v1/roles/:roleId/workspace
GET /api/v1/activity?entity=&limit=&cursor=
```

Bounded-mutation milestone:

```text
POST  /api/v1/roles
PATCH /api/v1/roles/:roleId
POST  /api/v1/roles/:roleId/reviews
POST  /api/v1/roles/:roleId/shortlist
POST  /api/v1/roles/:roleId/candidates/:candidateId/terminal
```

Mutation rules:

- JSON body and strict size cap;
- exact schema validation and unknown-key refusal;
- authenticated human actor;
- exact same-origin request plus CSRF protection;
- `Idempotency-Key` required;
- current entity version/`If-Match` required;
- append-only audit receipt before success response;
- recheck candidate suppression and role acceptance at commit time;
- no mutation endpoint is reachable through `GET`;
- no endpoint grants send, intro, publish, spend, or employment-decision authority.

### 5.4 Authentication and origin

Default deployment candidate:

```text
browser
  -> Cloudflare Access policy
  -> Cloudflare Tunnel
  -> 127.0.0.1:<DIE_PORT> on a dedicated host
  -> DIE web process
```

Cloudflare Access is an identity-aware proxy for self-hosted apps, and Tunnel publishes a private
origin without opening a direct inbound application port. This matches the single-operator phase and
avoids building password reset, session storage, MFA, and account recovery prematurely.

Production requirements:

- email/identity allowlist, MFA at the identity provider, and short session lifetime;
- origin bound to loopback and reachable only by the tunnel;
- validated Access application identity before serving private data;
- Access JWT audience/signature verification or an equivalently strong origin-binding control;
- no trust in a caller-supplied email header by itself;
- separate read-only service identity for agents only when needed;
- service token rotation/revocation and no service token with mutation authority in the first release.

References:

- [Cloudflare Access self-hosted applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/)
- [Cloudflare Tunnel setup](https://developers.cloudflare.com/tunnel/setup/)
- [Cloudflare Access application-token validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
- [Cloudflare Access service tokens](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/)

The vendor choice remains reversible. The invariant is authenticated HTTPS in front of a non-public
origin; the app contract must not depend on Cloudflare-specific UI.

### 5.5 Storage

#### Read-only hosted milestone

Keep the existing stores as the source of truth, mounted read-only into the application where
possible. Package only the data the product routes require.

Data classes:

| Class | Examples | Hosted policy |
|---|---|---|
| Reference | company map, role ledger, accepted research | read-only versioned snapshot |
| Workflow | role packets, notes, batches, touches, pairs | private; read-only in first milestone |
| Candidate intake | inbox/profile submissions | project allowlisted fields only |
| Operations | ship receipts, agent bus, jobs, machine state | never mounted into hosted app |
| Secrets | provider keys, wallet, Webflow/CDP credentials | never mounted unless a later connector requires one exact secret |

#### Mutation milestone

Do not add hosted writes across several JSON files and call them transactional. Before the first web
mutation, choose one durable workflow store and make CLI plus web use the same source of truth.

Default migration candidate: single-file SQLite on the same host, because one-process deployment and
transactional workflow updates fit the current scale. Node 24 provides `node:sqlite`, but its current
documentation labels it release-candidate stability; implementation must either pin and qualify that
runtime or select a small mature driver after a focused spike.

Reference: [Node.js 24 `node:sqlite`](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html).

Minimum tables, only when writes begin:

```text
roles
role_criteria
candidates
candidate_channels
candidate_suppressions
review_notes
shortlist_entries
touches
pairs
audit_events
idempotency_keys
```

Every person/workflow row receives an explicit retention class. Tenant columns are not added until a
second tenant exists; speculative null `tenant_id` fields are not isolation.

Migration sequence:

1. freeze hosted writes;
2. snapshot private JSON stores and record hashes/counts;
3. import through schema validators;
4. compare entity counts and deterministic projections;
5. run the same company/role workspace fixtures against JSON and database reads;
6. switch both CLI and web to the new store in one release;
7. keep the immutable pre-migration snapshot for rollback;
8. do not dual-write indefinitely.

### 5.6 Deployment layout

```text
/opt/demigod/app/          read-only release
/var/lib/demigod/          private data, owner-only
/var/lib/demigod/backups/  encrypted/versioned backups
/etc/demigod/die-web.env   owner-only configuration
```

- dedicated non-root service account;
- systemd process supervision;
- read-only code, private writable data directory, restrictive umask;
- one immutable release identifier in `/api/v1/session` and health diagnostics;
- daily backup after writes exist, with a tested restore path;
- deployment and DNS changes remain separately authorized external actions.

## 6. Security and privacy gates

### 6.1 Required before any hosted data

- authenticated deny-by-default access policy;
- origin unreachable directly from the Internet;
- host/origin validation for the hosted domain;
- production CSP without `unsafe-inline` scripts;
- request/body/query bounds and timeouts;
- no directory traversal or caller-selected file paths;
- no raw exception, filesystem path, environment, or secret in responses;
- PII/contact poison tests for every list and error payload;
- logs omit candidate free text, contact data, resumes, tokens, and query secrets;
- private data and backups owner-only/encrypted;
- dependency and release inventory;
- explicit incident shutdown: revoke Access policy and stop tunnel/process.

### 6.2 Required before hosted mutations

- human actor binding;
- CSRF and replay/idempotency controls;
- optimistic concurrency/version conflict response;
- append-only audit receipt;
- transaction or compensating rollback for every multi-entity change;
- correction and deletion path for candidate data;
- retention enforcement;
- authorization tests for every method/route pair;
- separate preview and execute operations wherever an external action is later introduced.

### 6.3 Required before more than one operator

- explicit viewer/reviewer/admin permissions;
- actor-specific audit and revocation;
- no shared credentials;
- concurrency and conflicting-review behavior;
- least-privilege service identities;
- tenant design only if a genuinely separate customer workspace is introduced.

## 7. Delivery roadmap

### H0 — Freeze the boundary

Deliver:

- route/data inventory;
- forbidden-import and forbidden-route contract;
- hosted response projection allowlists;
- environment/data-root contract;
- fixture/real isolation contract;
- threat model and data classification.

Exit:

- a test proves the hosted entry point cannot reach child processes, local job routes, ship state,
  raw candidate files, or external-action executors.

### H1 — Local read-only product app

Deliver:

- new dedicated Node server and native UI;
- roles list and role workspace;
- company search and packet view;
- activity placeholder backed only by hosted receipts;
- accessible navigation and explicit loading/error/unknown/demo states;
- API equivalence tests against the existing CLI projections.

Exit:

- one command starts the product app on loopback;
- company and role screens render fixture data without importing the ops dashboard;
- mutation methods return `405`;
- source and hosted-app focused gates pass.

### H2 — Private hosted read-only pilot

Deliver:

- dedicated host/service account;
- Access policy and tunnel;
- release packaging and health check;
- private data snapshot deployment;
- structured redacted logs;
- shutdown and rollback runbook.

Exit:

- unauthenticated requests cannot reach app bytes or APIs;
- authenticated browser access works through HTTPS;
- origin port is not publicly reachable;
- demo state remains visibly demo;
- no local ops route exists on the hosted origin.

This phase requires current-request authorization for DNS, Access, tunnel, host, and deployment
changes. Planning and local implementation do not grant it.

### H3 — Durable role calibration and review

Deliver:

- selected transactional workflow store;
- deterministic JSON import and rollback snapshot;
- create/edit role packet;
- human review note creation/correction;
- shortlist add/terminal actions;
- actor/version/idempotency/audit controls;
- correction/deletion and retention paths.

Exit:

- concurrent stale edits fail with a conflict instead of overwriting;
- repeated idempotency keys do not duplicate writes;
- every mutation has an attributable receipt;
- suppressed candidates cannot be shortlisted without an explicit reviewed correction;
- CLI and web read the same source of truth.

### H4 — One real role operating pilot

Deliver:

- one accepted real brief, if and only if the existing acceptance gate opens;
- real candidate pool projection under existing consent/use rules;
- evidence-question review and bounded shortlist;
- outcome instrumentation without automatic decisions.

Exit:

- the hosted app supports brief -> evidence review -> shortlist preparation for one real role;
- no intro is delivered without the existing two-sided consent gate and separate action authority;
- demo/fixture data cannot contaminate real receipts.

### H5 — Small-team application

Trigger: a second real operator needs access.

Deliver only then:

- viewer/reviewer/admin roles;
- assignments and review ownership;
- conflict-aware debrief;
- invitation/revocation through the identity provider;
- concurrency, audit export, and operational support controls.

### H6 — Customer-facing SaaS and integrations

Trigger: repeated external customer use proves a need for separate workspaces.

Possible later work:

- tenant-isolated data model and authorization;
- founder calibration portal;
- candidate correction/consent portal;
- ATS/CRM connectors with preview, scoped credentials, idempotency, and reconciliation;
- billing only after a real commercial model requires it;
- MCP/OAuth interface with user-delegated, route-scoped authority.

None of H6 belongs in the first hosted app.

## 8. Verification matrix

| Risk | Smallest fail-capable check |
|---|---|
| Ops dashboard accidentally exposed | hosted server forbidden-import/route test |
| Unauthenticated private access | Access/origin integration probe |
| Header spoofing | invalid/missing JWT and wrong-audience tests |
| Cross-site mutation | Origin + CSRF negative tests |
| Duplicate mutation | idempotency replay test |
| Lost concurrent edit | stale version/`If-Match` conflict test |
| Candidate PII leak | contact/resume poison in list, error, log, and audit output |
| Demo appears real | sample/acceptance poison suite |
| Suppression bypass | opt-out/stale/prior-decline commit-time test |
| Cross-file partial write | transaction rollback fault injection |
| Stale evidence appears current | packet-update versus review-time test |
| Private artifact permissions | `0600`/owner-only test |
| Accessibility regression | keyboard, focus, landmarks, labels, and axe smoke |
| Backup theater | restore into temporary data root and compare hashes/counts |

Release gate order:

```text
unit/domain checks
  -> hosted HTTP/security poison checks
  -> projection equivalence
  -> browser accessibility/workflow smoke
  -> backup/restore check when writes exist
  -> npm run demigod:verify:source
  -> npm run demigod:verify:all for integration releases
  -> authenticated hosted smoke after an authorized deployment
```

## 9. First implementation packet

The first code slice should be H0 plus the read-only skeleton of H1.

Touch only:

```text
demigod-die-web.mjs                 new narrow server
demigod-die-web-ui.html             new product shell
demigod-die-web-http-policy.mjs     hosted route/security policy
demigod-die-web.test.mjs            one fail-capable contract suite
package.json                         one local start script
demigod-verify-all.mjs              add focused test after it is green
docs/die/WEBAPP-PLAN.md              receipt updates only
```

First routes:

```text
GET /healthz
GET /api/v1/companies?limit=10
GET /api/v1/companies/:id
GET /api/v1/roles
GET /api/v1/roles/:id/workspace
GET /roles
GET /roles/:id
GET /companies
GET /companies/:id
```

First-slice acceptance:

- binds loopback only;
- no authentication claim yet because it is not hosted;
- all non-GET/HEAD methods return `405`;
- only product data appears;
- search/query/id lengths are bounded;
- no `child_process`, job runner, external network call, or arbitrary filesystem route;
- company packet and role workspace match existing pure projections;
- native UI renders demo and unknown states honestly;
- current local ops dashboard is unchanged;
- no deploy, DNS, tunnel, Access, or publish action occurs.

## 10. Open decisions and their trigger

| Decision | Default now | Revisit when |
|---|---|---|
| Frontend framework | none | repeated state/routing defects or team scale justify build tooling |
| Database driver | none for read-only; qualify SQLite before writes | H3 implementation spike |
| Hosting vendor | single private host behind identity proxy | deployment authorization and account inventory |
| Auth provider | Cloudflare Access candidate | existing identity/DNS constraints contradict it |
| App RBAC | one operator | second operator exists |
| Multi-tenancy | none | first separate customer workspace is required |
| Agent API | none | a real automation needs authenticated read access |
| External actions | preview only | current request authorizes one exact connector/action |
| Billing | none | repeated paid customer use requires it |

The plan stays ambitious by defining the route from local tool to customer SaaS, while each phase
ships only the commitments supported by the workflow evidence available at that phase.
