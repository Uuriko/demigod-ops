# TryDemigod full-site interaction repair prompt

## Objective

Audit every public route and every user-visible interactive control on `https://www.trydemigod.com`, reproduce the reported failures, repair their shared root causes in the canonical Demigod sources, and leave a verified prepare-only release. Buttons, links, menus, dialogs, wizards, and forms must work with mouse, keyboard, and touch-sized layouts. Do not publish or submit real forms unless the current user request separately grants that authority.

## Ground truth and authority

- Workspace: `/home/potter`.
- Public origin: `https://www.trydemigod.com`.
- Canonical runtime: `demigod-foot-core.js`.
- Canonical head and loader: `demigod-head-minimal.html`, `demigod-head-styles.css`, `demigod-footer-lite.html`.
- Fresh release identity comes only from `bin/dg truth`.
- Discover routes from the live sitemap, live navigation, `DG_PAGE_PATHS`, and other route declarations. Do not rely on one stale hard-coded route list.
- Preserve unrelated dirty-worktree changes. Inspect overlapping diffs before editing.
- The Eat the Sounds game and its tests are out of scope.
- External Webflow publish and real form submission are not authorized by this task. Local interception, validation, dry-run behavior, and read-only live inspection are authorized.

## Required operating method

1. Run `bin/dg orient` and `bin/dg truth` before diagnosis.
2. Read the applicable Demigod rules and use Ponytail full: understand the entire interaction path, reuse existing helpers and tests, and prefer one shared root-cause fix over per-button patches.
3. Inventory routes from all current sources:
   - `/sitemap.xml` and any sitemap indexes it names;
   - canonical anchors and navigation on the live homepage;
   - pretty paths declared in `demigod-foot-core.js`;
   - query-driven pages that remain intentional public entry points.
4. For every discovered route, check:
   - HTTP/final URL, redirect shape, canonical URL, and absence of 404/error shells;
   - runtime boot and console/page errors;
   - visible anchors and buttons have meaningful text or accessible names;
   - internal links resolve and do not point to dead fragments or inert placeholders;
   - route/navigation controls open the intended page or dialog;
   - close, Escape, back, and focus behavior work for overlays;
   - desktop and 390px mobile layouts retain clickable, visible primary actions.
5. Exercise every interaction family rather than clicking only one specimen:
   - header, mobile menu, logo/home, footer, route cards, and deep links;
   - startup hiring dialog/wizard and engineer talent dialog/wizard;
   - community event, startup submission, referral, contact, and other rendered forms;
   - next/back/close/submit controls, conditional fields, upload-or-link behavior, and validation errors;
   - dynamically injected cards, pagination/filter controls, and management links where present.
6. Never send real submissions during the audit. Intercept submission transport or stop after native/browser validation. Verify that invalid input cannot advance or submit, valid synthetic input reaches the expected pre-send handler, duplicate clicks are guarded, failure states remain recoverable, and success is never fabricated.
7. When a control fails, capture the exact route, viewport, label/selector, expected result, actual result, console error, and responsible handler. Before editing a handler, find all callers and sibling controls that share it.
8. Fix the earliest shared cause in the fewest canonical files. Do not add dependencies, frameworks, alternate routers, alternate form systems, or speculative abstractions. Preserve trust-boundary validation, accessibility, privacy, and data-loss protections.
9. Add or update one smallest runnable regression check for each non-trivial shared fix. Prefer extending an existing route/form/browser test over creating a new harness.
10. After each source edit, run the smallest relevant check. At completion run, as applicable:
    - syntax and focused unit/regression tests;
    - route audit and live route health;
    - form P0/policy tests and local-core form browser audit;
    - interaction/browser smoke on desktop and mobile;
    - accessibility route audit;
    - `npm run demigod:verify:source` and the proportionate full Demigod gate;
    - `bin/dg truth` to record final disk/live/prepare-only state.
11. Inspect generated screenshots for the repaired flows. JSON alone is not visual proof.
12. Report discovered failures, root causes, exact files changed, tests run with results, remaining limitations, and publication state. Do not describe an unpublished disk fix as live.

## Acceptance criteria

- Every discovered public route resolves or has an intentional, verified redirect.
- No tested primary control is inert, double-bound, hidden behind an overlay, or routed to the wrong destination.
- Dialogs and menus work by pointer and keyboard, retain visible focus, and close predictably.
- Both principal hiring forms can traverse all wizard steps with synthetic valid data; invalid required data blocks progression with an understandable error.
- All other public forms expose working conditional requirements and reach their guarded pre-send path without a real external submission.
- No uncaught page error explains or accompanies a tested interaction failure.
- Desktop and mobile checks pass for every primary interaction family.
- Static source verification and focused regression checks pass.
- The final state is explicitly marked prepare-only unless a separate current request authorizes Webflow publication.

## Deliverable

Produce the smallest verified source diff that satisfies the acceptance criteria, plus machine-readable receipts/screenshots from the existing Demigod tools. If live behavior differs from repaired local-core behavior, state that plainly as unpublished release drift.
