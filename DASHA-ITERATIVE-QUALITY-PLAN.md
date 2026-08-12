---
status: working
canonical_for: iterative-quality-loop
last_verified: 2026-08-11
---

# Dasha iterative quality and product loop

## Objective

Continuously make Dasha more correct, accessible, fast, secure, coherent and useful. Each cycle begins with current evidence, fixes root causes, verifies the complete affected system, researches the next product opportunity, implements only the best supported small feature, and repeats the forensic audit against the changed product.

This plan does not weaken publication, wallet, financial, privacy, claims or moderation gates. A cycle may prepare changes freely; it publishes only a complete release that passes every relevant gate and can be read back from production.

## Definition of done for one cycle

A cycle is complete only when:

1. Every known public route, embedded client and API is inventoried from source and live routing.
2. Every confirmed defect found in the cycle is fixed at its narrowest shared root cause or explicitly classified as an external constraint.
3. Generated artifacts match their canonical sources and integrity pins match the exact bytes to be served.
4. Targeted tests and the complete Dasha suite pass without hanging, vacuous success or skipped affected surfaces.
5. Browser checks cover mobile and desktop rendering, interaction, keyboard use, accessibility trees, console errors, failed requests and layout overflow.
6. Security, privacy, claims, metadata, structured data, sitemap, robots, social cards and exact-mint links remain correct.
7. A new feature, if added, has a stated user job, a cheaper rejected alternative and a runnable regression check.
8. The prepared release is published only after all gates pass, then production is fetched and exercised again.
9. New production evidence is fed into the next cycle rather than treating publication as completion.

## Cycle 1 — establish truth

### 1. Orient and freeze the evidence window

- Read `DASHA-RULES.md`, `DASHA-DOCS.md`, `DASHA-WORKFLOW.md`, the product brief, roadmap, claims and threat model.
- Run `dasha-where.mjs` and inspect both Git worktrees without modifying unrelated changes.
- Inventory current routes from the Worker router, sitemap, Webflow surface map and release contract.
- Record canonical source, generated artifact, deployment owner and live URL for every surface.
- Check for concurrent writers and mutable generated bundles before trusting hashes.
- Capture release manifest state, current Worker asset identity and live response identities.

### 2. Static source audit

Inspect every ship-bound HTML, CSS, JavaScript, Worker module and build script for:

- syntax errors, duplicate code, dead branches and stale generated output;
- invalid HTML structure, duplicate IDs, missing landmarks and heading-order errors;
- visible labels that differ from accessible names;
- controls without names, states, focus behavior or keyboard equivalents;
- undersized targets, clipped content, fixed elements obscuring focus and unsafe viewport assumptions;
- missing reduced-motion, forced-colors and high-contrast handling;
- fragile URL parsing, unbounded inputs, unsafe DOM injection and missing trust-boundary validation;
- incorrect cache, CORS, CSP, HSTS, permissions, framing and referrer policies;
- secrets, personal data or low-cohort metrics crossing public response boundaries;
- incorrect mint, pool, source, canonical, metadata, schema, robots, sitemap and social-card values;
- SRI pins that are not derived from the exact generated client bytes;
- release scripts that read from a different tree than the declared source of truth;
- tests that can pass without mounting the product, ignore subprocess errors or leave processes running.

Use `rg` to trace every caller before changing shared functions. Treat generated files as outputs and edit their owner source.

### 3. Live protocol and browser audit

For every route at 390×844 and 1440×900:

- fetch the document with cache busting and record redirects, status, headers and content type;
- capture console errors, page errors, CSP/SRI failures and non-2xx requests;
- verify expected client mount points contain meaningful content rather than merely existing;
- verify one useful H1, main landmark, navigation, skip behavior and logical tab order;
- test keyboard-only access, focus visibility, Escape behavior, dialogs, details, forms and disabled states;
- measure all interactive target rectangles and identify overlap or obstruction;
- test 200% text zoom, narrow reflow, long content, missing images, reduced motion and forced colors;
- run Axe/WCAG checks, then manually inspect cases automation cannot decide;
- test image load/decode, canvas dimensions, download/export, clipboard and native-share fallbacks;
- exercise offline, timeout, malformed JSON, empty data and API error states;
- confirm deep links, query parameters, fragments, back/forward navigation and reload recovery;
- use Lighthouse for performance, accessibility, best practices and SEO without confusing lab scores with field data;
- inspect LCP subparts, render blocking, unused third-party work, long tasks and forced layouts;
- compare live asset hashes and visible behavior with the prepared release.

State-changing, authenticated and wallet flows use isolated test identities and the smallest reversible action. Never send a transaction or create public content merely to gather evidence.

### 4. API and adversarial audit

For every public endpoint:

- test allowed methods, content types, missing bodies, invalid JSON, oversized input and boundary lengths;
- test origin allowlists, credentials, preflight, CSRF assumptions and replay resistance;
- test unauthenticated, expired, malformed and cross-user credentials;
- test rate limits, idempotency, duplicate submissions and concurrent version conflicts;
- test enumeration, identity leakage, hidden fields and small-cohort metric suppression;
- test error responses for stable JSON, safe wording and absence of internal details;
- test moderation, deletion and leave flows for complete derived-state cleanup;
- test external RPC/API unavailability and ensure failure is bounded and honest;
- verify GET/HEAD parity, cache headers and deterministic static assets.

### 5. Fixing order

Fix in this order:

1. Security, privacy, funds or irreversible data risk.
2. Entire routes or primary actions that do not work.
3. Release/source divergence that can reintroduce defects.
4. Accessibility blockers and keyboard failures.
5. Incorrect claims, mint links, metadata or indexability.
6. Error recovery and intermittent reliability.
7. Performance regressions affecting initial usefulness or interaction.
8. Visual polish and low-frequency edge cases.
9. Audit-tool defects that could hide any of the above.

For each defect, write the observation, weakest sufficient cause, discriminating check, shared fix point and smallest failing regression check. Do not patch a live symptom if the same bad state can be regenerated.

### 6. Verification ladder

After each fix:

- run the smallest targeted check that fails on the old behavior;
- test one materially different sibling path if the fix claims to cover a class;
- rebuild all affected generated artifacts;
- run syntax and `git diff --check`;
- run the fast release gate;
- run the complete Dasha test suite;
- ensure every test process exits cleanly;
- run the prepared bundle in a clean local shell and exercise it in both viewports;
- run the strict read-only live audit before publication to understand current drift;
- publish Worker assets before Webflow whenever their hashes differ;
- publish the scoped Webflow surfaces;
- read back stored Webflow code, Worker identity and every affected public route;
- repeat console, network, mount, accessibility and primary-action checks against production.

## Feature research and selection

### Research sources

Use current primary sources first: web platform specifications and MDN, W3C/WAI, Chrome/web.dev, official social-platform documentation, repository evidence, direct competitive product documentation and peer-reviewed work. Use secondary commentary only to discover claims that can be checked directly.

Research across:

- creation speed and first-export friction;
- editable handoff and remix continuity;
- sharing files plus editable state;
- mobile OS integration, installability and return paths;
- lightweight collaboration without accounts or a captive feed;
- accessibility and alternative input;
- content portability and rights metadata;
- discovery and contributor onboarding;
- performance and offline resilience;
- community recognition based on real contribution rather than financial or engagement farming.

### Candidate scorecard

Score each candidate from current evidence, not enthusiasm:

- user job is observable on an existing surface;
- strengthens Make → Share → Return;
- works without wallet custody, token gating or deceptive incentives;
- reuses existing state, renderer and native browser capabilities;
- adds little privacy, moderation and operational burden;
- degrades safely where browser support is absent;
- can be tested locally and read back live;
- does not duplicate an existing feature;
- has a clear removal path if it fails technically or harms the core flow.

Reject candidates that primarily add dashboards, vanity metrics, speculative accounts, a second editor, a second social graph, engagement rewards, arbitrary AI generation, wallet execution or unproven infrastructure.

### Current research shortlist

1. Clipboard image paste into Studio, reusing the existing upload validation and renderer.
2. Installable Studio with a minimal manifest, only if it improves return without adding a service-worker stack.
3. Web Share Target support for receiving images, only after installability and cross-browser fallback are clear.
4. Export sharing that validates file support with `navigator.canShare()` before calling `navigator.share()`.
5. Lightweight remix-history comparison using the existing bounded URL state rather than accounts or storage.
6. Faster edge-served shells for Home, Studio and Desk if Webflow remains the measured LCP bottleneck.

The first implementation should be the highest-value candidate that can be built by reusing an existing trusted path. Current evidence favors clipboard image paste because it shortens creation on desktop, needs no backend or new dependency, can share the existing file validation, and has a normal upload fallback.

## New-feature forensic pass

Every new feature repeats the full audit, plus feature-specific tests for:

- supported and unsupported browsers;
- permission denied, user cancellation and missing secure context;
- hostile MIME type, oversized file, corrupt image and decompression limits;
- keyboard, screen-reader name/state and visible feedback;
- mobile/desktop layout and target size;
- duplicate activation, race conditions and repeated use;
- URL-state compatibility and reload behavior;
- memory cleanup for object URLs and large canvases;
- no unexpected network upload or metadata disclosure;
- no regression to export, remix, share, source or rights behavior.

## Loop continuation rule

After production verification, start again from route and source inventory. Prefer a newly observed defect over a speculative feature. Prefer improving the core Studio handoff over adding another surface. Continue while there is a confirmed defect, a release-system weakness or an evidence-supported feature whose benefit exceeds its complexity and trust cost. Stop only at a genuine authorization, external-service, safety or evidence boundary; record the exact boundary and resume with the next independent local task.
