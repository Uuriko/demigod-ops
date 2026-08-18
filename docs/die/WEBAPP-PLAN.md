# DIE hosted web app plan

**Status:** H0/H1 complete · H2 transport prepared dark, interlock corrected 2026-08-18 · named accounts, roles, API keys, and export shipped · Access/DNS activation still blocked by current Cloudflare OAuth scope · 2026-08-18
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

The 2026-08-16 request authorized these external changes. Activation still fails closed until the
Cloudflare account can create an Access organization/application/policy and a DNS record.

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

The first code slice implements H0 plus the read-only skeleton of H1.

Touch only:

```text
demigod-die-web.mjs                 new narrow server
demigod-die-web-ui.html             new product shell
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

## 11. H0/H1 implementation receipt · 2026-08-16

Implemented:

- dedicated `127.0.0.1:9880` Node server, separate from the operations dashboard;
- native Roles, Role Workspace, Companies, and Company Packet screens;
- native Activity screen and bounded `/api/v1/activity` placeholder that exposes only hosted
  workflow receipts and reports zero while hosted mutations do not exist;
- bounded company search and cursor-ready API projection over the 2,754-company source corpus;
- Company Packet screen renders accepted research values with exact citations, explicit unknowns,
  bounded hiring journal, evidence-based peers, and observed roles from the existing packet;
- role workspace projection over existing packet, review-note, company, and candidate-evidence logic;
- Roles list state, readiness checkpoints, and candidate-channel counts derived from that same
  workspace projection; non-demo packets are not labeled accepted before the acceptance gate opens;
- explicit local session truth: `authenticated: false`, `hosted: false`, `mode: local_read_only`;
- GET/HEAD-only policy, loopback host enforcement, generic internal errors, no CORS, strict security
  headers, and per-response CSP nonces without `unsafe-inline`;
- a fail-capable HTTP/security/product contract in the full Demigod verifier;
- `npm run demigod:die:web` as the one local start command.

Verified:

- `node demigod-die-web.test.mjs` PASS with real loopback HTTP probes;
- `npm run demigod:verify:source` PASS;
- `npm run demigod:verify:all` PASS with the DIE contract in the canonical integration gate;
- real-store search returned the exact Anthropic company identity and both role packets remained
  visibly demo-only;
- headless browser render PASS for Roles, Role Workspace, and Companies;
- Axe returned zero violations on the Role Workspace and Companies screens after the contrast fix.
- Activity query-bound and empty-receipt HTTP checks pass; its rendered empty state has zero Axe
  violations and marks the Activity navigation item current.
- Roles fixture checks bind exact checkpoint and channel counts; the real two-card render shows
  demo-only readiness, shortlist, rediscovery, review, and packet-update truth with zero Axe
  violations.
- CommodityAI renders verified cited research plus journal and peers; Anthropic renders the honest
  no-research state plus its journal and peers. Both real packet screens have zero Axe violations.

Not performed in H0/H1: deployment, DNS, tunnel, identity-provider configuration, hosted
authentication, customer invitations, data migration, or hosted mutations.

**2026-08-16 H1 projection correction:** the role HTTP route now reuses `buildDesk(id).workspace`
instead of calling the pure composer with empty channel defaults. The native view renders inbound,
referrals, rediscovery, prior pairs, explicit suppression reasons, and the bounded shortlist. A
non-empty fixture proves the route carries shortlist and rediscovery data; the real demo workspace
rendered 3/3 shortlist entries and four suppressed rediscovery rows with zero Axe violations. The
focused loopback HTTP/security suite and `npm run demigod:verify:source` pass; import integrity keeps
the still-untracked DIE web test as an advisory gate-list item. The full
`npm run demigod:verify:all` integration gate also passes with zero failed checks.

## 12. H2 dark-deployment receipt · 2026-08-16

Implemented:

- hosted mode for the same read-only app, enabled only by the complete pair
  `DEMIGOD_DIE_PUBLIC_HOST` + `DEMIGOD_DIE_TRUST_ACCESS_PROXY=1`;
- exact hosted-host enforcement and mandatory bounded `Cf-Access-Jwt-Assertion` shape check;
- no trust in `Cf-Access-Authenticated-User-Email`; the origin assumes signature, audience, and
  team validation only when Cloudflare Tunnel has `originRequest.access.required=true`;
- owner-scoped systemd web service, enabled and active at `127.0.0.1:9880`;
- separate tunnel service with an absent `~/.config/demigod/die-tunnel-ready` condition interlock;
- named Cloudflare tunnel `demigod-die` (`7eb0869e-07ac-49c6-8101-41a78a6e8bbd`), created but
  inactive, without a public hostname or connector.

Verified:

- focused HTTP contract PASS for local session truth, hosted denial without an assertion, hosted
  session projection behind the trusted-proxy contract, wrong-host denial, and incomplete-config
  startup failure;
- `npm run demigod:verify:source` and `npm run demigod:verify:all` PASS after the H2 changes;
- systemd unit verification PASS;
- installed web service active; socket inventory shows only `127.0.0.1:9880`;
- future public Host header returns `403` while hosted mode is disabled;
- tunnel start is skipped because the readiness marker is absent;
- Cloudflare inventory reports the named tunnel `inactive`;
- `app.trydemigod.com` has no DNS record.

External blocker:

- Cloudflare API returns `Access is not enabled` for applications and identity providers;
- the current Wrangler OAuth grant has tunnel administration but lacks Access app/policy write and
  DNS write scopes;
- the available Cloudflare browser session is not authenticated, so account enablement cannot be
  completed safely from the current credentials.

Activation sequence once those account permissions exist:

1. enable the Zero Trust organization and identity provider;
2. create the self-hosted Access app and one explicit operator allow policy;
3. configure tunnel ingress to `http://127.0.0.1:9880` with required Access team and audience
   validation;
4. set the hosted environment, restart the web service, and prove direct/missing/wrong assertions
   fail;
5. create the public DNS route, write the readiness marker, and start the tunnel;
6. prove unauthenticated HTTPS denial and authenticated read-only browser access before calling H2
   complete.

Rollback is ordered to fail closed: remove/disable the DNS route, stop the tunnel, remove the
readiness marker and hosted environment, then restart the loopback service. No private store is
migrated or mutated by H2.

## 13. Correction to §12, and what shipped since · 2026-08-18

### The §12 receipt was wrong about the tunnel

§12 records the named tunnel as *"created but inactive, without a public hostname or connector"*
and the tunnel service as holding *"an absent `~/.config/demigod/die-tunnel-ready` condition
interlock"*. On 2026-08-18 the connector was running with **four ready edge connections**, and had
been since 2026-08-17 01:03, while `demigod-die-web.service` was `inactive (dead)`.

Both halves of that sentence were true of `demigod-die-tunnel.service`. Neither was true of
`demigod-die-named-tunnel.service`, which is the unit that actually runs:

| unit | armed by | origin dependency | ran |
|---|---|---|---|
| `demigod-die-tunnel` | `die-tunnel-ready` (absent) | `Requires=` | no |
| `demigod-die-named-tunnel` | `die-gate-ready` (**present**) | `Wants=` | **yes** |
| `demigod-die-quick-tunnel` | `die-gate-ready` (**present**) | `Wants=` | yes, connector dead |

`die-gate-ready` means only that a gate secret exists. It is not consent to publish, and gating
exposure on it made the interlock decorative. `demigod-die-web.test.mjs` asserted the real
interlock, and passed, because it read the one unit that was correctly gated and therefore could
not expose anything — the two that could were checked for a token path and a filename.

Nothing was publicly reachable: no DNS record resolves to the tunnel and hosted mode returns 403
without an Access assertion. The controls that held were the ones nobody was relying on.

**Fixed.** All three units are armed by `die-tunnel-ready` and use `BindsTo=demigod-die-web.service`
— not `Requires=`, which propagates a failed origin but not a cleanly stopped one, and a clean
`systemctl stop` was exactly the case that left a tunnel serving nothing. The test now discovers
every unit that can open a tunnel from its `ExecStart` rather than naming files, and it caught a
third unit on its first run.

**Note for whoever reads §12 next:** `~/.config/systemd/user/` is symlinked to `systemd-user/` in
the repo, so the repo is the installed configuration. There is no install step and no drift, but
also no staging — editing a unit changes the machine.

### Shipped since §12

- **Named accounts** with scrypt hashes, roles `viewer`/`operator`/`admin`, sessions verified
  against the accounts file as it stands now. Publishing, sending, and spending are deliberately
  not grantable by any role.
- **API keys** (`dgk_<id>_<secret>`), issued per account, revocable by id, stored only as a
  SHA-256 hash and printed once. Effective role is the weaker of the key's grant and the owner's
  current role, computed per request, so demoting a person demotes their programs.
- **Export** at `/api/v1/export?dataset=…&format=csv|json` over companies, roles, missions,
  calendar, and activity. Oversized exports refuse rather than truncate, because a CSV has no field
  to carry "and 900 more" and a truncated file opens looking complete.
- **Per-account rate limiting** and audit records that separate `account` (who was signed in) from
  `actor` (who the record is about).

### Also shipped 2026-08-18, after an enterprise-readiness audit

- **The session signing key is no longer the shared login password.** `GATE_SECRET` is what a
  submitted password is compared against, and it was also the HMAC key for account sessions —
  anyone ever told that password could sign a cookie for any address and any role. Retiring the
  password once accounts exist does not close that; it stops being accepted at the form while
  remaining the key that forges what the form would issue. Sessions use
  `DEMIGOD_DIE_SESSION_SECRET`, and the server refuses to start if the two are equal.
- **Access mode is read-only.** `canMutate` ended `role ? … : true`, so Cloudflare Access — which
  arrives authenticated with no account and no role, because this origin refuses to trust the
  forwarded user header — could mutate the desk and land in the audit as `account: null`.
- **Receipts name who acted.** Every activity row read `actor: "operator"`. Events carry `account`
  now, kept separate from `actor` (who the record is *about*). Note the trap: `shapeActivityRow`
  drops any row containing an address, so attribution had to be exempted explicitly or it would
  have silently deleted the receipts it was added to label.
- **Password change with session invalidation**, via a per-account `sessionEpoch` signed into the
  MAC. Any password change ends open sessions; a role edit does not. API keys survive, since they
  have their own revocation.
- **Health that can fail.** `/healthz` returned an unconditional 200; it now reads the store and
  returns 503 with a reason. Every 5xx writes a structured line to the journal — there was
  previously no logging at all, so a 500 recorded nothing anywhere.
- **Backups cover the database.** `bin/dg-backup` derived its file list from *top-level* ignored
  files, so `~/.local/share/demigod/die-missions.sqlite` was never in it. Snapshots are taken with
  `VACUUM INTO` and verified before being kept, because a file-level copy of a live SQLite database
  can be torn in the middle and still open.

### What is still needed before an outside user

**Needs a human with credentials — no amount of code moves these:**

1. **The Cloudflare account permission.** Unchanged from §12: Zero Trust org, identity provider, an
   Access app with one allow policy, a DNS record. The only remaining blocker for a stable hostname.
2. **Backup destination.** `restic` is not installed, and `DG_BACKUP_REPO` / `RESTIC_PASSWORD_FILE`
   are unset, so `demigod-backup.timer` is inactive. The script fails closed on all three: there is
   no backup today, only a backup that would now contain the right things once those exist.
3. **`DEMIGOD_DIE_SESSION_SECRET`** in `~/.config/demigod/die-web.env`, then a first admin account.
   Named accounts refuse to issue sessions until it is set, which is deliberate.

**Code, and none of it blocks the above:**

4. **Streaming export.** A full companies export builds a packet per company and takes ~20s. Fits
   inside Cloudflare's 100s limit; wants streaming before it wants more datasets.
5. **An admin surface.** Accounts and keys are managed only through the CLI.
6. **Optimistic concurrency on mission writes.** Two operators editing one mission is currently
   last-write-wins.
