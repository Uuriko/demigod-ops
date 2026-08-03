# Demigod full-system audit → map → prove → fix → prune → verify

You are the primary Codex agent working in `/home/potter`.

Audit the complete active Demigod system, map how every meaningful part connects, prove what
works, find bugs and false-green states, delete or consolidate proven bloat, and implement the
smallest safe root-cause fixes. Work autonomously. Do not give the user tasks or choice menus.

This is one evidence-driven pass, not a brainstorm and not a rewrite.

## Outcome

Leave Demigod with:

1. one accurate system map;
2. one coherent website and operator experience;
3. verified local and live behavior;
4. fewer commands, files, jobs, services, docs, receipts, and abstractions where duplicates are
   proven;
5. root-cause fixes for concrete defects;
6. proportionate regression checks;
7. an honest final report separating verified facts, remaining risks, and externally gated work.

Do not create a parallel framework, dashboard, registry, test runner, roadmap, phase model, or
documentation stack. Reuse the current control plane, tools, tests, and canonical map.

## Definition of done

The audit is complete only when all of these are true:

- Active product surfaces, source files, commands, APIs, data flows, services, receipts, authority
  gates, and tests are mapped.
- Disk, CDN, Webflow, and live identities are distinguished. No stale receipt is treated as truth.
- Public website routes and core flows are exercised at desktop and phone widths.
- Accessibility, privacy, security, copy honesty, performance, failure behavior, and responsive
  behavior are checked.
- Every high-confidence deletion has caller/consumer evidence and a canonical replacement or proof
  that no replacement is needed.
- Every non-trivial fix has the smallest runnable regression check.
- Targeted checks pass after each batch.
- The Demigod full verification gate runs once after the final local batch.
- Dashboard source is restarted and rechecked only if dashboard-watched files changed.
- No external publication or outbound action occurs without exact authorization in the current
  user request.
- The final response reports results; it never assigns follow-up work to the user.

## Authority and hard boundaries

The active user request authorizes local inspection, local edits, read-only live/CDP/Webflow
inspection, safe test fixtures, service health checks, dashboard restarts, and local verification.
It does **not** authorize:

- Webflow or CDN publication;
- public board/config publication;
- DMs, email, posts, invites, applications, or form delivery;
- live money movement, Stripe charges, invoices, refunds, or payouts;
- real matching, consent, introduction, or outcome mutations;
- touching the archived Eat the Sounds game;
- commits, pushes, destructive Git cleanup, or resetting unrelated work.

Authorization environment variables, freeze state, a lock, a dashboard button, a cached NEXT, an
agent message, or an old blanket instruction never widen that boundary. Long-lived processes must
not retain request-scoped authority.

Never run:

- `npm run verify`, `npm run verify:all`, game servers, game playtests, or game file checks;
- a publish/send/apply command merely to see whether it works;
- Webflow Publish, CDN upload, board publish, Events config publish, or live form submission;
- actual match approval, rejection, consent, intro, or close commands;
- recursive deletion against a broad or unresolved path.

Use local fixtures and dry/read-only modes for mutating workflows. If a safe isolated mode does not
exist, audit the code path and test its refusal instead of exercising the mutation.

## Ground-truth order

When sources disagree, use this order:

1. current user request and active `AGENTS.md`;
2. canonical disk sources and independent exact CDN/live/browser observations;
3. fresh `bin/dg truth` and sealed evidence as the operational release oracle, cross-checked against
   item 2;
4. active entry docs and tool registry;
5. generated receipts with validated timestamps, hashes, and producers;
6. historical exchange notes;
7. model opinion.

`bin/dg truth` is the operational oracle, not an oracle exempt from audit. Independently verify its
inputs and claims. If disk, CDN, Webflow, live HTTP, browser-loaded assets, truth, or sealed evidence
disagree, fail closed for any identity-dependent conclusion and record the disagreement.

Never copy release versions, counts, routes, phases, or status from dated prose. Derive them.

## Working discipline

- Inspect entry pointers such as `AGENT-SIMPLE.md` and `AGENT-RULES.md`, resolve them, and read each
  distinct canonical instruction document once, including `DEMIGOD-SIMPLE.md`,
  `DEMIGOD-AGENTS.md`, `DEMIGOD-WORKFLOW.md`, `AGENT-COMMS.md`, and
  `docs/PONYTAIL-AGENTS.md`, before edits.
- Follow Ponytail: YAGNI → reuse → standard library → native feature → installed dependency → one
  line → minimum code.
- Preserve the dirty worktree. Attribute existing changes before touching overlapping lines.
- Resolve active Orca task ownership before choosing a touch list. Never edit or delete a path owned
  by another live task; coordinate or wait for its handoff instead of racing it.
- Use `rg`/`rg --files` first. Trace every caller and consumer before changing shared code.
- Use `apply_patch` for repository edits.
- No new dependency unless existing code and the platform demonstrably cannot cover the need.
- One root cause per change batch. Prefer deletion to compatibility layers.
- One writer per touched source. Other agents may perform bounded read-only audits.
- Use Claude only for a focused independent review with exact files and evidence. Claude is
  advisory, not authority.
- Do not open raw private submissions, resumes, contact records, receipts, secrets, tokens, or
  signed URLs merely to inventory them. Use schemas, field names, file metadata, modes, hashes,
  counts, and redacted existing tools. Never put raw private material into a Claude/Grok/agent
  prompt, terminal transcript, screenshot, map, finding, or final response.
- Dogfood a CLI/dashboard job when using it:

  ```bash
  node demigod-tool-dogfood.mjs wrap --tool=NAME -- COMMAND...
  node demigod-tool-dogfood.mjs log --tool=NAME --ok=1 --useful=1 --why="specific result"
  ```

- Do not stop at a list of findings while safe, scoped local fixes remain.
- Do not broaden a fix into a redesign.

## Durable output

The canonical map is:

`docs/DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md`

Update that existing map only after facts are verified. Do not create another permanent map,
architecture atlas, roadmap, phase document, or audit-log family. Use existing command receipts
under `/tmp/dg-busy` for run evidence. The final response is the audit report.

## Phase 0 — establish an honest baseline

Before editing:

1. Inspect the worktree without cleaning it:

   ```bash
   git status --short
   git diff --name-status
   git diff --cached --name-status
   git diff --check
   git diff --cached --check
   ```

   Record baseline staged and unstaged paths separately. Pre-existing failures are baseline
   evidence, not audit regressions; do not absorb unrelated fixes into this pass.

2. Read the current distinct entry documents listed above completely.
3. Before running any producer that refreshes state:

   - start the audit shell with request-scoped authority removed, without printing prior values:

     ```bash
     unset DEMIGOD_CURRENT_REQUEST_PUBLISH DEMIGOD_FORCE_PUBLISH DEMIGOD_ALLOW_AUTO_DM DG_LOCK_TOKEN
     ```

     Ensure audit commands and children inherit that cleared environment; use equivalent `env -u`
     prefixes if commands do not share one shell. Acquire a fresh, command-scoped lock only if a
     later authorized local foot-core edit requires one.
   - locate the canonical truth, NEXT, control-plane, cockpit, priority, dashboard-status, and
     evidence receipts from their producers; capture their existing path, mode, size, mtime, and
     SHA-256 before refreshing them. Do not print private receipt bodies.
   - derive the exact protected real-state paths from canonical sources and capture path, mode,
     size, and SHA-256 for site sources/manifest, public board, private inbox, pair ledger, referral
     ledger, and demand/send state. Do not print their contents.

4. Capture current orientation and truth:

   ```bash
   bin/dg orient
   node demigod-evidence.mjs fresh truth
   bin/dg home --json
   bin/dg next-canon --assert-same
   ```

   Reuse the truth produced by orient when its seal is fresh and contains the required identity
   fields. Run standalone `bin/dg truth --json` only when that receipt is missing, stale, or
   incomplete.

5. Capture tool and runtime topology:

   ```bash
   node demigod-tools-registry.mjs --json
   node demigod-tool-dogfood.mjs status
   bin/dg-orca status
   orca-ide orchestration task-list --json
   orca-ide orchestration inbox --limit 30 --json
   systemctl --user list-unit-files 'demigod-*' --no-legend
   systemctl --user list-units 'demigod-*' --all --no-legend
   ss -ltnp
   ```

   For every discovered Demigod unit, run:

   ```bash
   systemctl --user show UNIT -p Id -p FragmentPath -p UnitFileState -p ActiveState -p SubState -p MainPID
   ```

   Compare each installed fragment and symlink with its repository source under `systemd-user/`.
   Distinguish active runtime drift, installed-source drift, transient units, and config-only files.

6. Resolve every live task's owner and touch list. If a task overlaps the proposed audit surface,
   leave those paths read-only until its result is handed off. Do not stop or reuse unidentified
   terminals.
7. Record:

   - disk/live/CDN/Webflow release identity;
   - truth freshness and input hashes;
   - dashboard health and restart requirement;
   - canonical NEXT identity across all consumers;
   - running services, timers, browsers, and agent processes;
   - current package-script and tool-registry counts;
   - current test baseline;
   - every existing local modification that overlaps likely audit files.

Do not label old red receipts as current defects until their producer is rerun or their inputs are
validated. Do not refresh a receipt merely to hide a useful stale-state bug.

## Phase 1 — build the complete system map

Derive the map from sources and live observations. Do not begin with the old map as assumed truth.

### 1.1 Component inventory

For every active component, record:

| Field | Required content |
|---|---|
| Component | Stable name |
| Purpose | One sentence; no aspirational capability |
| Canonical source | Exact file or external source of truth |
| Producer | Exact command, service, function, or external writer |
| Entrypoints | CLI, dashboard job, API, route, service, or timer |
| Inputs | Files, requests, environment, browser state, receipts |
| Outputs | Files, responses, mutations, external effects |
| Consumers | All production callers and important tests |
| Scope | Public, private, local-only, fixture-only, or archived |
| Authority | Read-only, local mutation, publish, outbound, money, match |
| Concurrency | Lock, lease, atomic write, idempotency behavior |
| Freshness | Timestamp/hash/TTL contract and failure behavior |
| Storage | File mode, sensitivity, retention, and rotation contract |
| Verification | Smallest authoritative checks |
| Status | Keep, merge, delete candidate, broken, or externally blocked |

Cover at least:

- Webflow site and live production host;
- head, footer loader, foot core, CDN manifest, sibling release assets;
- dashboard UI/server, control plane, orient, truth, NEXT, priority, review, dogfood;
- Webflow helper and CM6 paths;
- forms, WIZ, draft persistence, uploads, webhook, inbox, board, public status;
- matching/proposal/review/consent/intro/close code paths, read-only only;
- demand, funnel, outreach drafts, pilots, evidence, referrals, revenue;
- Events app, Events Bot, outbox, public API/tunnel/config, health/heal/tick services;
- startup atlas, directory, map data, ATS/job enrichment, role ledger;
- blog, pages, navigation, redirects, SEO, sitemap, robots, favicon;
- agent communications, Orca bridge, Claude/Grok helpers, handoffs, plan inbox/ledger;
- package scripts, `bin/dg*`, tool registry, dashboard job allowlist, APIs;
- systemd units/timers, Chrome CDP, local ports, laptop hygiene and useful loop;
- canonical JSON/JSONL/Markdown state, `/tmp/dg-busy` receipts, locks, caches, logs;
- tests, verification routers, hooks, and generated artifacts.

For `/tmp/dg-busy`, inventory metadata only and map each active receipt's producer, consumers,
schema/version, mode, sensitivity, TTL/freshness, retention, and rotation. Prove whether each
consumer validates freshness and identity. Do not delete a pre-existing receipt, cache, log, or
untracked file without exact ownership, active-consumer, and recoverability evidence.

### 1.2 Entrypoint and command map

Trace:

- every `demigod:*` package script and shared development entrypoint actually called by Demigod;
- every `bin/dg` verb and `bin/dg*` executable;
- every tool-registry record;
- every dashboard `JOBS` entry and command-palette action;
- every dashboard `/api/*` route;
- every enabled or linked Demigod systemd unit/timer;
- every long-lived server and listening port;
- every active prompt and agent entry document.

Classify excluded non-Demigod package scripts at the boundary without opening or running archived
game targets.

For each entrypoint, prove whether it is canonical, a legitimate specialized mode, a harmless alias,
a duplicate, dead, dangerous, or misleading. Search literal command IDs and target files across
code, docs, package scripts, systemd, hooks, dashboard UI, registry, and tests.

### 1.3 Source-of-truth map

Map ownership for:

- release identity and fully-shipped state;
- head/footer/foot custom code;
- public board and private submissions;
- demand/send receipts and pilot outcomes;
- pair/match/consent/intro state;
- Events state and public config;
- startup/map/job data;
- referrals/revenue/money intent;
- plans, handoffs, agent ownership, and NEXT;
- dashboard caches and derived summaries.

Flag dual writers, compatibility mirrors, copied release facts, generated files treated as source,
and receipts with no active producer.

### 1.4 Data-flow and authority map

Draw the smallest useful flows for:

- browser → Webflow/runtime → form validation → webhook → private inbox → review/public status;
- startup/talent records → scoring → manual review → mutual consent → intro → outcome;
- disk sources → verify → CDN assets → Webflow custom code → live truth;
- Events plan/outbox → public API/config/invite surfaces;
- local receipts → orient/NEXT/control/priority/dashboard;
- user request → authority gate → lock/freeze/command → external effect;
- agent task → Orca or stateless review → local edit → evidence.

Mark every trust boundary, PII boundary, external effect, lock, cache, retry, and irreversible action.

## Phase 2 — audit the public website as a product

Use source inspection plus the existing CDP browser at `http://127.0.0.1:9223`. Reuse tabs and stay
within the tab budget. If Designer authentication redirects to login, record that boundary and
continue with live/source/API evidence; do not bypass it.

### 2.1 Route and navigation inventory

Derive all public routes, virtual query routes, pretty redirects, anchors, modal/deep-link states,
legal pages, blog pages, Events pages, startup/map pages, form entry routes, and error states.

Reconcile the route definitions in `DG_PAGES`, head redirects, foot redirects, `/startups` mapping,
sitemap URLs, canonical allowlists, structured-data navigation, and actual HTTP responses. Detect
aliases that remain true 404s and query-only states omitted from canonical logic.

Audit each meaningful route in the representations that exist: raw served HTML with no runtime
repair, rendered live DOM, verified local disk-core injection, and Webflow page/settings/custom code
when accessible. Runtime cleanup must not hide crawler-visible or no-JS defects.

For every route/state verify:

- HTTP status and redirect/query/fragment preservation;
- canonical navigation and back/close behavior;
- title, description, canonical, indexability, structured data where present;
- exactly one correct title, description, canonical, OG URL/title/description, and Twitter metadata
  in raw HTML using attribute-order-independent checks;
- every sitemap URL is HTTP 200, not a soft 404, and self-canonical;
- no broken internal links, dead CTAs, duplicate CTAs, or hidden unreachable actions;
- no stale product claim, fixed response promise, invented proof, fake availability, or fake count;
- no console exception, failed required asset, mixed content, or repeated network storm;
- reasonable empty, loading, offline, timeout, malformed-data, and partial-data behavior.

### 2.2 Core user journeys

Exercise without external submission:

- startup/hiring entry → WIZ progression → validation → review screen → safe refusal before delivery,
  in live and verified-local modes;
- talent entry → WIZ progression → availability/compensation/resume validation → review → refusal,
  in live and verified-local modes;
- navigation among Home, product/how, pricing, proof/status, legal, blog, Events, and community/map;
- browser draft save/restore/clear behavior;
- upload and secure-link alternatives using fixtures only;
- deep links, browser history, refresh, close, escape, and interrupted flow recovery;
- public submission-status lookup with isolated fixtures;
- safe dry validation of directory/community/event forms and fixture-based status progression;
- Events discovery/invite/RSVP UI without creating a real RSVP;
- source-derived current directory/map search, filter, selection, detail, reset, and empty-state
  behavior that actually exists; absence of an old layer/radius feature is not itself a defect.

Derive the current flows from source; do not assume old screenshots or docs are accurate.
Each journey receipt must name the exact route, persona, viewport, representation, loaded asset
identity, and interaction steps. A startup-only result cannot satisfy engineer coverage.
On live, never activate a final submit control. Stop at the review boundary. Test submit, status,
RSVP, event, and other delivery behavior only in isolated local fixtures with outbound submission
and network delivery intercepted or blocked.

### 2.3 Responsive and visual behavior

Inspect at minimum:

- phone around 390×844;
- tablet around 768×1024;
- desktop around 1440×900;
- 200% zoom or equivalent narrow reflow;
- reduced-motion behavior;
- light/dark or forced-colors behavior where the site declares support.

Execute responsive, interaction, and accessibility checks as one route × viewport × persona matrix;
do not repeat the same journey in separate audit layers.

Check:

- horizontal overflow;
- obscured or clipped controls;
- touch targets;
- sticky/fixed overlays;
- focus visibility and focus order;
- modal/dialog containment and return focus;
- heading hierarchy;
- readable line length and contrast;
- layout shifts, blank hero, unhide timing, duplicated components;
- mobile disclosure behavior and important content order.

View the screenshots; a JSON receipt alone is not visual proof.

### 2.4 Accessibility

Keyboard-test every interactive path. Inspect semantics and runtime behavior for:

- landmarks, headings, labels, descriptions, errors, required state;
- buttons versus links;
- dialogs, disclosures, tabs, menus, live regions, logs, status messages;
- focus trap, Escape, return focus, skipped/hidden controls;
- dynamic content announcements without whole-page chatter;
- native date/file/select behavior;
- map/list keyboard equivalence;
- pointer target size;
- reduced motion and forced colors;
- alt text and decorative-image treatment.

Treat accessibility regressions as product bugs, not polish.

### 2.5 Performance and resilience

Measure and inspect:

- document and critical asset request count/size;
- loader count and duplicate runtime initialization;
- foot-core parse/boot behavior;
- head unhide behavior and MutationObserver usage;
- long tasks, repeated timers, polling, duplicate listeners, layout thrash;
- CDN MIME, bytes, hashes, caching, redirects, and sibling asset identity;
- the exact foot and startup-map URLs, versions, SHA-256 values, and bodies loaded by the browser,
  including fallback paths;
- behavior when one API/feed/CDN mirror fails;
- cache invalidation and stale-data labels;
- dashboard polling payload and inactive-view rendering;
- Chrome tab/process load created by Demigod tooling.

Do not add a performance framework. Use current browser/network data and existing probes.

## Phase 3 — audit each subsystem end to end

### 3.1 Release and Webflow

Trace canonical disk sources through verification, manifest/CDN, CM6/Webflow save/publish code, and
live attestation.

Verify:

- one head source, one footer loader source, one foot-core source;
- version markers agree;
- exactly one approved live loader;
- manifest URL/hash/bytes/version/MIME match contracts;
- version equality alone never proves parity: same-version/different-SHA-or-bytes must remain
  unshipped, including the script body actually loaded by the browser;
- sibling startup-map/map-data assets cannot partially succeed;
- status distinguishes prepared, staged, published, and fully shipped;
- lock ownership, lease expiry, source-change detection, and atomic replacement;
- `help`, `status`, `prepare`, and structural checks stay read-only;
- current-request authorization is command-scoped and checked at the final shared mutation boundary;
- long-lived processes cannot inherit publication authority for future work;
- no alternate publish script bypasses the canonical path.

Do not publish.

### 3.2 Forms, submissions, webhook, inbox, and board

Use isolated fixture roots/directories. Verify:

- payload limits, content types, HMAC/signing-secret readiness, origin and proxy policy;
- rate limiting, request aborts, malformed JSON, null/nested data, path parsing;
- provider-event idempotency and same-email update semantics;
- live webhook checks require a non-empty expected webhook URL; an empty expectation is “not
  checked,” never pass;
- private/public field separation and PII scrubbing;
- resume/file/link validation and dangerous URL rejection;
- filesystem permissions, atomic writes, archive retention, and race behavior;
- public status reveals no capability-grade IDs, tokens, paths, or private fields;
- auto-feature/local board behavior cannot trigger inherited or background publication;
- test fixtures cannot touch the real inbox, board, plan inbox, pair ledger, referral ledger, or
  production receipts;
- every publish path refuses without exact current-request authorization.

### 3.3 Matching, consent, introductions, and outcomes

Map and audit code only. The user performs real complete matches manually.

Verify:

- all proposal paths use one shared eligibility/score decision;
- SF/open-to-SF, function, skills, compensation, availability, and evidence guards agree;
- vague data remains reviewable without becoming invented certainty;
- PII never enters public cards or unsafe evidence;
- review and consent state transitions are explicit, idempotent, and permission-safe;
- introductions require mutual consent;
- outcomes, hires, invoices, and retained-hire evidence cannot be invented;
- dashboard controls cannot mutate terminal or consent states accidentally;
- fixtures are isolated from real pairs and submissions.

Do not approve, reject, propose, consent, introduce, close, invoice, or settle a real record.

### 3.4 Demand, funnel, outreach, pilots, referrals, and revenue

Verify:

- drafts are permanently non-delivering;
- no environment variable, timer, agent loop, dashboard job, or legacy wrapper can re-enable send;
- SENT/pilot/outcome/money counts require explicit valid receipts;
- mark-sent paths cannot self-attest delivery;
- follow-ups and packages remain drafts;
- opt-out, quarantine, invalid schema, collision, and terminal-state handling are consistent;
- lead merges preserve evidence and are review-gated;
- pilot, referral, invoice, retention, and settlement state transitions are honest and idempotent;
- no tool moves money or claims payment from intent/stub data.

### 3.5 Events

Map the Events app, bot, chat, lifecycle, outbox, tunnel, public API/config, website integration,
services, timers, and receipts.

Verify:

- public availability requires service health, current browser-consumed config, config
  reachability, a successful browser CORS fetch, and the expected response; a healthy local
  service/tunnel alone is insufficient;
- event creation/edit/withdraw/status state machines validate dates, timezone, location, and review;
- no fake RSVP, attendee, booking, sponsor, volunteer, or revenue count;
- Partiful/Luma remain draft destinations unless separately authorized and connected;
- invite/resource outboxes do not leak tokens or private contact data;
- health/heal/tick loops are bounded, draft-only, and do not thrash a healthy non-preferred tunnel;
- service restart/retry behavior is bounded and observable;
- website failure is graceful when the Events API/config is unavailable.

Do not create, publish, invite, RSVP, or withdraw a real event.

### 3.6 Startup atlas, directory, jobs, and content

Verify:

- source attribution and data licenses/claims are accurate;
- generated map/job data has a clear producer and freshness contract;
- ATS failure cannot falsely close roles;
- first-seen/open-day claims are labeled as Demigod observation, not employer posting truth;
- source-derived current map/list controls, directory, cards, details, selection, reset, and empty
  states agree; do not grade the current product against absent legacy controls;
- Webflow `/startups`, runtime `/?p=map`, and generated `sf-startups-static.html` have explicit,
  verified ownership; compare consumption, timestamps, counts, claims, and canonical behavior, then
  flag unused duplicate representations;
- no unreviewed community submission appears verified;
- static/generated outputs are consumed, reproducible, and not duplicated;
- blog, startup pages, and public proof remain current, navigable, accessible, and honest.

### 3.7 Dashboard, control plane, tools, and agents

Verify:

- one canonical NEXT identity in orient, control, cockpit, ship, priority, dashboard, and receipts;
- cache TTLs cannot create internally contradictory status;
- fresh info/OK cards cannot suppress actionable NEXT;
- priority never assigns human-only or externally gated work to an agent;
- dashboard API Host/CORS/CSP/privacy/mutation policies fail closed;
- registry metadata and dashboard execution authority agree;
- no inherited object property or unknown ID becomes executable;
- every dashboard job has one command, one authority classification, and a real caller;
- inactive UI views do not trigger redundant API work;
- agent status comes from one file-only receipt rather than shelling out on hot polls;
- Orca, `ask-claude`, and `grok-ask` have distinct purposes and do not create dual writers;
- self-tests do not write into real coordination, plan, match, board, or outbound state.

## Phase 4 — cross-system security, privacy, and authority audit

Trace every trust boundary and external-effect function. Record here only gaps that span subsystems
or escaped their subsystem audit; do not duplicate the same execution and finding.

Check for:

- request-scoped environment variables inherited by servers, timers, children, or future requests;
- authorization checked only in UI/help rather than the shared mutation function;
- shell invocation or argument injection;
- path traversal, unsafe symlink following, broad globs, and predictable temporary files;
- corrupt-state fail-open behavior;
- malformed/future timestamps treated as fresh;
- stale cached authorization, NEXT, lock, or health state;
- CORS/Host/origin confusion and trusted-proxy spoofing;
- XSS/HTML injection in Webflow runtime, dashboard, Events chat, map, and public cards;
- unsafe URL schemes, SSRF, open redirects, signed URL leakage, and query-token persistence;
- secrets, bearer links, emails, phone numbers, resumes, or lock tokens in logs/receipts/UI;
- public files containing private submissions, pair evidence, pilots, contacts, or money records;
- permissions weaker than needed on private files;
- non-atomic or concurrent writes that can corrupt ledgers;
- idempotency gaps around inbound retries and state transitions;
- test modes that can touch production state;
- dashboard/API endpoints whose labels understate mutation or external effects.

P0 authority, privacy, or data-loss defects outrank bloat.

## Phase 5 — test the tests

Audit verification for false green, side effects, duplication, and missing failure capability.

Before the first test, recheck the protected real-state path/mode/size/SHA-256 snapshot from Phase
0. Compare it after each test batch and again at final reconciliation. Any unexplained change is a
P0 test-isolation defect: stop the affected test path and preserve evidence. Restore only an exact
audit-created fixture or an exact backup whose ownership and identity are proven; never use a broad
reset against pre-existing real state.

For every major gate determine:

- what exact behavior it proves;
- whether it can fail;
- whether it consumes source, generated output, cache, or live state;
- whether it validates freshness and identity;
- whether it mutates real state;
- whether it leaves fixtures, tabs, services, locks, or receipts behind;
- whether another test already covers the same contract;
- whether it is called by the canonical verification router.
- for every `--local` or injected-source browser test, the exact URL, version, SHA-256, and sibling
  assets actually loaded; a command-line flag alone is not proof that local code ran.

Use poison/adversarial checks where they already exist. Add only the smallest regression for a new
non-trivial branch. Do not create a new test framework or large fixture family.

Baseline and final gates:

```bash
node demigod-import-integrity.mjs
node demigod-tools-selftest.mjs
node demigod-tools-os-selftest.mjs
npm run demigod:verify:source
npm run demigod:verify:live
npm run demigod:verify:all
```

Reuse a recent full-gate receipt as the pre-edit baseline only when its recorded source/input
hashes, truth identity, and relevant runtime identities match the Phase 0 baseline; Git HEAD alone
is insufficient in a dirty worktree. Otherwise run a pre-edit full gate, then run exactly one final
full gate after the last batch. During development use the narrowest relevant test. Do not rerun
identical expensive gates without a changed input.

## Phase 6 — prove and rank bloat

A deletion or consolidation candidate needs evidence, not taste.

For each candidate prove:

1. all callers and consumers were searched;
2. package scripts, `bin/`, dashboard jobs/UI, registry, systemd, hooks, docs, tests, and dynamic
   import/command construction were considered;
3. its output is unused or has a canonical producer;
4. it is not the only safety/verification boundary;
5. historical evidence is distinguished from active code;
6. deleting it will not touch game or unrelated user work;
7. the relevant focused check passes after deletion.

Classify:

- **DELETE** — dead, superseded, duplicated, unsafe legacy path, stale generated artifact;
- **MERGE** — two active paths own the same responsibility;
- **KEEP** — distinct responsibility with active callers;
- **DEMOTE** — valid but not a primary/hot/dashboard surface;
- **ARCHIVE/LIST ONLY** — historical or user-owned material that should not be deleted in this pass.

Specifically hunt:

- duplicate npm aliases and flag-only wrappers;
- registry aliases and duplicate command IDs;
- dashboard jobs or API routes with no UI/consumer;
- old publish/send paths beside a canonical guarded path;
- multiple NEXT/phase/status builders;
- stale background loops and timers;
- one-off model prompts, generated handoffs, and dated checklists used as active instructions;
- `.bak`, corrupt copies, screenshots, logs, receipts, and generated JSON tracked as source;
- orphan scripts, imports, exports, tests, output paths, and docs;
- repeated parsers/validators/scorers that should route through one shared function;
- abstractions with one implementation and dependencies used for trivial standard-library work;
- huge status payload fields not used by the active view;
- self-tests that duplicate production behavior rather than test it.

Prefer deleting the compatibility surface over adding another alias.

## Phase 7 — finding contract

Every finding must use this shape:

| Field | Meaning |
|---|---|
| ID | Stable `DG-AUDIT-NNN` |
| Severity | P0, P1, P2, or P3 |
| Class | bug, authority, security, privacy, a11y, UX, performance, stale truth, test gap, or bloat |
| Surface | Website/system area |
| Evidence | Exact file/line, command output, API field, screenshot, or live observation |
| Intended | Evidence-backed expected behavior |
| Actual | Reproduced behavior |
| Root cause | Shared function/path, not symptom |
| Callers | All affected production callers |
| Smallest fix | Delete, route through existing code, or minimum patch |
| Regression | One runnable check |
| External gate | None, publish, outbound, money, real match, or login |
| Status | Fixed, verified, listed, or blocked |

Severity:

- **P0:** unauthorized external effect, private-data exposure, data loss/corruption, or critical
  security boundary failure;
- **P1:** broken primary user flow, false public claim, inaccessible core flow, unsafe fail-open, or
  deterministic production defect;
- **P2:** contradictory operator state, meaningful performance/reliability issue, duplicate active
  architecture, or high-confidence bloat;
- **P3:** minor polish or low-impact cleanup with proof.

Do not inflate severity to make the report interesting. “No finding” is valid.

## Phase 8 — implement safe local fixes and pruning

After the read-only map and baseline:

1. Fix P0/P1 root causes first.
2. Fix P2 contradictions that cause wrong actions or repeated work.
3. Delete high-confidence bloat in small batches.
4. Skip speculative P3 work.

For each batch:

- restate the reproduced defect or deletion proof;
- state the exact touch list in the active task plan before editing and recheck that no live Orca
  task owns it;
- identify the shared root;
- edit the fewest files;
- preserve validation, security, accessibility, and data-loss handling;
- run one focused failing-before/passing-after check;
- inspect the diff;
- continue only if green.

Never:

- rewrite the site or dashboard;
- create an architecture layer to “clean things up”;
- add a dependency for convenience;
- change public copy without checking all static/runtime/meta variants;
- patch each caller when one shared guard fixes them all;
- delete an artifact solely because it looks old;
- silently normalize corrupt or ambiguous business evidence;
- use a test fixture against real state.

If a defect requires external publication, record the verified local fix/preparation and continue
with other safe work. Do not turn that boundary into a user task.

## Phase 9 — final reconciliation

After the last local batch:

1. Run focused tests for every touched subsystem.
2. Run `git diff --check` and `git diff --cached --check`; compare both staged and unstaged
   name-status output with the baseline.
3. Run the final Demigod verification gate once.
4. Re-run truth/orient/NEXT identity.
5. If dashboard-watched sources changed, restart `demigod-dash.service`, then verify:

   - service active;
   - `/api/health` healthy;
   - running source identity equals disk;
   - `restartRequired=false`;
   - `next.id === control.nextCanon.id` where both are present;
   - priority headline is not false-idle;
   - UI polling payload remains bounded.

6. Recheck systemd units, installed fragment/symlink identity, ports, tabs, locks, and temporary
   fixtures.
7. Compare the final diff to the declared touch lists and attribute every changed path; do not stage
   or commit merely to mark ownership.
8. Compare the protected real-state path/mode/size/SHA-256 snapshot with baseline and confirm no
   test or audit action mutated it and no real external effect occurred.
9. Update `docs/DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md` to the verified final topology.
10. Remove only audit-created temporary files.

## Final response format

Lead with the outcome. Include:

1. **System map:** concise component/data-flow/authority summary and link to the updated canonical map.
2. **Verified health:** local, live, dashboard, services, and test results with exact counts.
3. **Fixed bugs:** root cause, smallest change, and regression proof.
4. **Pruned bloat:** files/commands/jobs/routes/services removed or consolidated, with counts.
5. **Kept intentionally:** surprising complexity that has a proven distinct responsibility.
6. **Remaining risks:** only concrete unresolved findings, each with its external gate or blocker.
7. **Boundaries:** explicitly state whether publish, outbound, money, real match, game, commit, or push
   occurred.

Do not include:

- a user checklist;
- “your turn,” “you should,” or human-next framing;
- speculative roadmap items;
- a choice menu;
- praise for complexity;
- claims unsupported by a command, source, receipt, or live observation.

The shortest correct system is the goal. Map first, prove second, fix concrete P0/P1 defects third,
prune proven bloat fourth, verify last.
