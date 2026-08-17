# Demigod — complete task register

**Status:** living backlog · **Scope:** trydemigod.com + startup operations · **Excludes:** archived game

This is the authoritative inventory of work that still needs doing. It does not
copy volatile versions, counts, or timestamps. Run the command in each section
for current state. Historical roadmaps and unchecked checklist boxes are not
tasks unless they appear here.

## Priority order

1. Preserve a trustworthy, usable website.
2. Obtain and deliver one real accepted startup brief.
3. Record mutual consent, introduction, outcome, and proof honestly.
4. Keep EventsBot and public-role observations healthy without autonomous sends.
5. Add product layers only after real delivery exposes a measured need.

## Now — agent-executable

### First-pilot integrity and acquisition

- [x] Preserve every match-critical startup brief field when a reviewed submission
  becomes a pilot draft. The submission bridge now carries company stage,
  requirements, work location, salary range, interview process, 90-day outcome,
  and contact into the existing pilot record. A temp-directory contract test
  proves exact preservation without touching real submissions; pilot evidence,
  permissions, demand selftests, and source verification pass.
- [ ] Treat `/startups` as the smallest acquisition wedge: measure aggregate
  company-row brief opens and completed reviews before adding accounts, saved
  jobs, alerts, ATS integrations, automated sourcing, or recruiter-marketplace
  mechanics. Current market review shows those are mature competitors' scale
  products, while Demigod's unproven transition remains observed hiring signal
  → accepted brief.
  - 2026-08-06 the existing company-row handoff now preserves any allowlisted
    referral/campaign values and otherwise records non-PII
    `utm_source=directory` / `utm_campaign=company-brief` on the startup form.
    Exact-local `v1052` browser evidence covers all 33 sitemap routes and 218
    controls with zero failed clicks, forms, or intents; the Replit journey
    preserved company prefill plus both attribution fields without submitting.
- [ ] If measurement identifies directory comprehension friction, clarify the
  existing distinction between an observed public role and an engaged employer,
  then retest the same path. Do not expand the product from click data alone; the
  success condition is one qualified accepted brief.

### Website quality

- [x] Reduce the measured mobile performance bottleneck until Lighthouse mobile
  performance meets the enforced 80 budget without regressing forms, navigation,
  accessibility, or honesty. Current evidence points to footer script evaluation,
  style/layout work, and noncritical boot-time DOM mutation. Make only measured,
  targeted changes. Verify with `node demigod-lighthouse.mjs --path=/` and the
  staged interaction suites.
  - 2026-08-06 final receipt: documented `--path=/` gate now selects one route
    correctly and passes at performance 80, accessibility 100, best practices
    100, SEO 100; the full interaction matrix below remains green.
  - Reopened on live `v989`: the next single controlled run scored 77/100/100/100.
    FCP/LCP were 3.8/3.9s with 40ms TBT; render-blocking canonical/Webflow CSS
    remains the measured constraint. Do not retry merely to obtain a green score.
  - Closed on live `v990`: the canonical footer loader now uses native `defer`;
    the next single controlled run scored 83/100/100/100. No retry was used.
  - Reopened on live `v996`: reserving the final mobile hero-column height cut
    focused CLS from 0.097 to 0.037, but the one controlled Lighthouse run scored
    78/100/100 with FCP/LCP 3.9s and TBT 80ms. Do not rerun for a favorable
    sample. The remaining measured constraints are Webflow's render-blocking CSS
    and eager form-provider Turnstile; do not remove bot protection to gain score.
  - Closed on live `v997`: the Webflow Turnstile loader is deferred until either
    protected form opens. Both startup and candidate checks proved zero Cloudflare
    requests before interaction, then valid 730-character tokens after opening;
    no bot protection was removed. The next single Lighthouse run scored
    87/100/100/100 with no retry.
  - Live `v998` regression sample remained above budget at 81/100/100/100; one
    run, no score-shopping.
  - 2026-08-06 live `v1019` sample returned 43/100/100/100, but is invalid as a
    product regression measurement: host load was 23.98 on 8 CPUs and Lighthouse's
    own evaluation task blocked the measured main thread for 1.397s. The harness
    now refuses runs above 2× load per available CPU (explicit
    `DG_LH_ALLOW_BUSY=1` override) instead of recording workstation contention as
    site TBT. Built-in positive/negative selftest and live busy-host rejection
    pass. The 43 is retained as contaminated evidence, not retried or called green.
- [x] Re-run the full staged release matrix after the current source stops moving:
  navigation over every sitemap URL, both wizard paths, design snapshots, mobile
  accessibility, axe, SEO, and source verification. Each audit must intercept
  both local head CSS and local footer JS. Record the exact tested source identity;
  do not call a moving series of snapshots one release.
  - 2026-08-06 exact-release receipt: live/disk/CDN `v996`; source PASS;
    33 sitemap URLs and 295 controls PASS; startup and mobile engineer wizards
    PASS; design PASS; 15-route mobile sweep 0 findings; axe 0
    serious/critical; SEO gate PASS. Wizard contrast is 16.03:1, mobile CLS
    0.037, and LCP 588ms in the focused live accessibility/performance audit.
  - 2026-08-06 rolling staged receipt after the route-content expansion:
    SEO/FAQ passes at `v1047`; all 16 primary routes have zero serious/critical
    axe violations at `v1048`; and exact `v1049` mobile and design audits pass
    across the same 16 routes with zero overflow, tap-target, label, live-region,
    palette, or wizard-layout findings. Direct review of the generated home,
    pricing, directory, and mobile screenshots found the new action hierarchy
    legible and unclipped. These are staged receipts, not publication claims.
  - 2026-08-06 exact-local `v1054` interaction refresh: all 33 sitemap routes
    are reachable and all 218 distinct controls pass with zero broken links,
    unnamed controls, dead hashes, disabled submits, failed clicks, failed forms,
    or failed intents. Startup, candidate, and directory-company journeys retain
    their expected modal state, referral/campaign data, and company prefill; no
    external form was submitted. Receipt: `/tmp/dg-busy/navigation-audit.json`.
  - 2026-08-06 rolling staged render refresh after subsequent homepage edits:
    `v1055` design and 16-route axe audits pass with no palette/wizard-layout
    findings and zero serious/critical violations; `v1056` mobile and SEO audits
    pass all 16 routes with zero overflow, tap-target, label, live-region,
    metadata, heading, canonical, or console-error failures. The sole SEO warning
    is the known served FAQ schema content mismatch; staged visible/schema pairs
    match exactly, while Webflow still serves the older 17-pair schema. These are
    rolling receipts because the shared source advanced between serialized runs.
  - 2026-08-06 `v1058` talent conversion pass makes résumé/work proof explicitly
    optional while keeping location, availability, compensation, experience, and
    contact evidence required. Three stale form oracles were updated to assert the
    new contract, including native `required` removal. Exact-local full-form audit
    passes with zero issues, and the dry candidate journey reaches review in all
    ten steps while deliberately leaving résumé/link blank; zero external form
    posts were made. Current full design audit also passes at `v1057` after direct
    desktop/mobile screenshot review.
  - 2026-08-06 exact-local `v1059` interaction receipt: every one of 33 sitemap
    pages reports runtime foot version 1059; all 218 distinct controls pass with
    zero unreachable areas, broken links, unnamed controls, dead hashes, disabled
    submits, failed clicks, failed forms, or failed intents. Startup/candidate
    referral handoff and directory-company attribution/prefill remain intact.
    Receipt: `/tmp/dg-busy/navigation-audit.json`. Disk advanced afterward, so
    this receipt is intentionally not relabeled as evidence for a later version.
- [x] Reconcile the old website mega backlog against current rendered evidence.
  Remove items already implemented (canonical metadata, sitemap, robots, touch
  targets, link checking, wizard playtests) and reject optional decoration or
  speculative features. The old unchecked boxes are not authority.
  - Reconciled against live `v987` on 2026-08-06; the legacy file now retains
    only proven implementation, the active performance item, and explicit
    evidence-gated deferrals.
- [x] Keep all public controls operable: every button, form action, link, logo,
  modal control, role link, and keyboard path must have an accessible name and a
  real destination/action. Verify all sitemap routes, not only the homepage.
  - `v989` fixes clean `/hire` and `/talent` CTA fallbacks when their Webflow
    documents lack modal markup, preserving validated referral/campaign fields
    through the resulting wizard navigation.
  - `v997` live audit: 295 controls, 0 broken links, failed clicks, failed forms,
    failed CTA intents, disabled submits, or unnamed controls.
  - The new-user and wizard playtests now select stable behavior attributes and
    the current logo/hero/footer navigation contract instead of retired CTA copy
    or `#dg-site-nav`. Both ten-step forms reach review on desktop and mobile;
    the dry E2E receipt distinguishes Turnstile telemetry and proves zero form
    POSTs. Both ten-step flows still reach review on the published release.
- [x] Keep every canonical public area reachable from the homepage through clear
  navigation, footer links, or a labeled directory; aliases must resolve to a
  canonical destination and never strand the visitor.
  - `v998` adds a native Explore disclosure to the previously logo-only header.
    Its ten canonical destinations are visible on desktop and mobile, route
    correctly, and close the disclosure after selection. `v999` raises both the
    Explore control and every menu link to the project’s 48px mobile target floor;
    the 16-route live mobile sweep reports zero findings and open-menu axe passes.
    The published sitemap audit covers
    33 routes and 298 unique controls with 0 unreachable areas, unnamed controls,
    broken links, failed clicks, failed forms, or failed intents.
  - `v1000` adds Escape-close to Explore and restores focus to its summary.
    Live keyboard-only checks pass on mobile and desktop: Enter/Space opens,
    Tab reaches the first destination, Escape closes with focus restored, and
    Enter opens both startup and candidate forms. The source verifier now treats
    release versions numerically, so four-digit versions cannot false-fail.
  - `v1002` expands the browser-proven head `<noscript>` fallback instead of the
    footer location Webflow strips. JavaScript-disabled `/how`, `/legal`, and
    `/blog` each render 479 honest characters and 13 native links, including the
    canonical directory, fee/privacy boundary, email alternatives, and an explicit
    forms-require-JavaScript notice. All 16 SEO routes now pass without the former
    JS-only-body warnings; the scanner counts head no-script content to match real
    browser behavior.
  - `v1003` removes inherited generic `<details>` margin/padding from Explore.
    The late menu insertion no longer grows the mobile header: exact-local and
    live wizard audits both pass with CLS 0.036 (down from 0.139), strong contrast,
    no validation/focus issues, and no hidden hero-art request. The wizard audit
    now also binds its local runtime version to the attested CDN manifest.
  - `v1004` restores the intended shared top-header fallback on the 11 canonical
    blank-shell routes and preserves native header wrappers on authored pages.
    All 16 canonical surfaces now have exactly one visible 78px header with the
    Demigod home link and Explore directory; 320–1280px checks show no overflow,
    duplicate header, or hidden host. The 33-route/298-control navigation audit
    and both ten-step forms remain green on the published release.
  - `v1005` removes mismatched `aria-label` overrides from every shared CTA so
    each accessible name is the exact visible label. Live Lighthouse now reports
    `label-content-name-mismatch` at 1.0 with zero findings; both hero actions
    still open the correct modal, and the full form audit remains at zero issues.
  - 2026-08-06 `/startups` crawlable directory drift was repaired without a
    foot release: the current 49,958-byte sealed fragment was saved to the page,
    read back with an exact SHA-256 match, and published. Live site-health now
    passes all 37 declared routes with a fresh 43,097-character directory block.
    The scoped paste tool now resizes reused Designer tabs before opening Pages;
    Webflow's sub-900px “browser too small” mode had silently blocked the panel.
  - Later 2026-08-06 refresh: all 37 routes remain hard-served, but live
    `/startups` is stale again versus the current 49,996-byte sealed fragment.
    The source and prepared package match exactly at SHA-256
    `d3ccc2fcca1d0cf527d5cd856a2f42409e58752b92aa4bd685908d4301ecbb7b`;
    the static-fragment selftest passes and the read-only Designer comparison
    confirms persisted drift. Page save/publish remains current-request-gated.
  - `v1006` eliminates the full-body layout shift on injected product routes.
    The existing early-route boot guard now keeps the native Webflow shell out
    of layout until the routed page is ready, and `openPage` inserts beside the
    top-level header instead of after the homepage. Exact single-run Lighthouse
    moved `/hire` from 57 performance / CLS 1.0 to 84 / CLS 0, and `/talent`
    from 57 / CLS 1.0 to 83 / CLS 0; both remain 100 accessibility, best
    practices, and SEO.
  - `v1007` lets the head preload the exact attested footer runtime while keeping
    the footer as its sole executor; the CDN publisher updates the preload URL
    atomically with every release. On `/events`, runtime priority changed from
    Low to High, completion moved from 1,143ms to 904ms, and LCP element-render
    delay fell from 2,179ms to 790ms. The trace contains one runtime request,
    CLS remains zero, and accessibility/best-practices/SEO remain 100.
  - The Webflow utility 404 was republished so it now receives the existing
    site runtime while preserving HTTP 404. Mobile click checks proved its Home,
    How it works, Hire, Talent, and Events recovery links reach the intended
    pages. No duplicate page-specific recovery code was retained.
  - `v1012` prevents the observed-public-roles rail from reappearing inside
    injected product pages and obscuring their primary hierarchy. Production
    disk/CDN/live identity is exact; the 33-route audit covers 298 controls with
    zero unreachable areas, broken links, unnamed controls, failed clicks,
    failed forms, or failed intents.
  - `v1013` replaces the three legacy modal-close hash anchors on Jobs, Apply,
    and Careers with native buttons. Live keyboard checks close each dialog with
    Space, and the full 33-route click/form audit now reports zero dead hashes,
    unreachable areas, unnamed controls, broken links, failed clicks, failed
    forms, or failed intents across 298 controls.
  - The Lighthouse runner now launches its installed CLI with the existing Node
    24 runtime instead of silently producing no scores under system Node 18; its
    receipt records the runtime and actionable failure text. The single controlled
    homepage run passes at 80/100/100/100. The navigation audit also rejects and
    retries any shared-browser tab that is externally redirected mid-run, avoiding
    false same-origin link failures from unrelated browser automation.
  - `v1014` binds the startup-directory script and JSON URLs from the attested
    release manifest into inert head metadata. This fixes opaque Catbox footer
    URLs silently loading an older pinned directory snapshot. A rendered-link
    audit found and removed seven dead company websites while retaining every
    company and its attributed CC0 source. Live `/startups` now requests the
    current Catbox JSON, the 33-route click/form audit is green, and the 16-route
    mobile sweep reports zero overflow, tap-target, label, or live-region issues.
  - 2026-08-06 the same release contract was extended to the roles-feed URL, so
    an opaque Catbox script can no longer invent a nonexistent sibling path.
    The live directory now renders eight recent-role rows with zero feed/CORS
    errors. Its rebuilt public artifact contains 2,705 companies, 1,956 attributed
    team sizes, 331 verified ATS boards, and 8,130 observed open roles; generated
    coverage and HN provenance are checked against the artifact instead of stale
    fixed totals.
  - `v1015` repairs the directory’s cross-page “Hiring here? Start a brief”
    handoff: when `/startups` has no local modal, the existing wizard draft
    carries the selected company to `/?wiz=startup` without overwriting a prior
    answer or sending anything. Role chips and brief buttons now meet the 48px
    project target floor. Live verification passes 33 sitemap routes / 187
    controls with zero failed clicks, forms, intents, links, or unreachable pages;
    the 16-route mobile sweep has zero findings.
  - The live directory filter sweep covers every team-size, hiring-evidence, and
    sort value plus search/hash state. It removed the empty “Not hiring reported”
    choice: absence of a public board is unknown, not evidence that a company is
    not hiring. A legacy `#hiring=no` link now safely returns the unfiltered view.
    Every role-function and ATS-provider value also returns live companies; the
    display now preserves acronym/slash labels as “AI / data” and “Finance / legal”
    while keeping their existing shareable hash values stable.
  - 2026-08-06 competitive scan: keep the directory's narrow advantage—SF company
    discovery joined to direct employer boards, first-observed freshness, and the
    human startup brief. Do not imitate Wellfound's salary/equity/stage/remote
    filter stack until Demigod has honest structured coverage for those fields;
    empty controls would add apparent capability without useful results. The
    current 12-case renderer suite passes hash round-trips, hostile state,
    team-size coverage, role narrowing, sorting, and public-data constraints.
  - A 1,486-destination audit of every open-role company’s website, job board,
    and public attribution found one conclusive dead hostname. `v1016` suppresses
    Onton’s retired `careers.onton.com` link at render time and on future HN map
    rebuilds while retaining the company row, verified Ashby board, and HN source.
  - 2026-08-06 refresh against the prepared public surface checked all 352 links
    emitted by the crawlable startup listing plus all 24 homepage observed-role
    destinations (370 unique URLs). 365 returned 200; one access-controlled 403
    was inconclusive; four 12-second Greenhouse timeouts independently resolved
    to their current `job-boards.greenhouse.io` pages with 200 responses. No DNS
    failure, 404, or 410 was found, so no canonical destination was removed.
  - 2026-08-06 directory generator CLI now treats `--help` as read-only and
    rejects unknown/malformed arguments with exit 2 before artifact writes. Its
    existing selftest covers both paths. Canonical regeneration produced a
    deployable 49,944-byte fragment (56 bytes headroom), eight recent roles, and
    a durable prepared-package receipt bound to `sf-startups-static.html` at SHA
    `e8ba428169289535d8dc8a40237e7ff8fba8092268e8b1493e40a2a0a23ec410`.
  - `v1016` also restores the homepage’s observed-role rail at the release root:
    the canonical footer publisher now carries the bounded 24-role public payload
    instead of discarding it during each CDN publish. Live renders eight
    startup-ranked ATS roles plus the directory link, keeps authored sample cards
    labeled separately, and emits no console errors. The same release keeps search
    full-width and lays filters out two per row on narrow phones, preserving all
    five visible 48px controls while bringing the company list upward. The final,
    longer “Open roles · startups first” sort control spans its otherwise empty
    row so its selected value remains readable instead of clipping on 390px screens.
  - `v1017` gives Notes its own canonical `/blog` product route, renders the
    canonical post data there, opens a directly linked note, and keeps the main
    navigation visible on product pages. Clean-route history now preserves inbound
    attribution parameters, while wizard links fall back to real homepage URLs if
    a modal is unavailable. Live verification passes 33 sitemap routes and 196
    controls with zero unreachable pages, broken links, failed clicks, forms, or
    intents; the Notes deep link renders one open article with no console errors.
  - `v1018` keeps the complete 17-question FAQ schema served by Webflow and stops
    foot-core from adding a second, older six-question `FAQPage` block. The SEO
    harness now flags duplicate FAQ schemas and binds local-mode requests to the
    exact attested CDN URLs, failing if the rendered runtime version differs from
    disk or the live release manifest. Its public checks run in isolated Chromium
    rather than inheriting shared-CDP cache/interception state. A second Webflow
    publish cleared stale v1017 HTML at the exact `/how` edge path; all 16 clean
    live routes now render v1018 with no SEO issues.
  - Reopened 2026-08-06: rendered evidence proved those 17 schema answers had
    drifted from the six questions visitors could read. Prepared `v1024` makes
    the full 17-question FAQ visible with current human-review/base-salary copy
    and generates its one rendered schema block from those exact answers. A
    focused local browser check proves `17 visible == 17 schema`. The SEO audit
    now fails when either rendered or served FAQ schema differs from visible
    content; the page-scoped Webflow schema still needs the same replacement so
    non-JavaScript consumers do not receive its older wording.
  - Prepared `v1024` also completes the mini-page mobile-action fix. The shared
    page-hiding loop now preserves `#dg-bar`, and both canonical CSS layers paint
    it above `#dg-page`. At 390×844 the FAQ has 17 accessible 48px summaries,
    zero horizontal overflow, and a hit-testable two-path bar; opening the startup
    form hides the bar and Escape restores it.
  - Prepared `v1024` raises the shared sticky navigation above the mini-page shell,
    fixing Explore links that opened visibly but hit-tested against page content.
    Exact-local browser checks at 390px and 1280px hit the first link as an anchor,
    navigate to the How page, close the menu, and retain the expected mobile bar.
  - The staged source advanced through `v1025`–`v1027` during verification. The local navigation
    audit now binds opaque Catbox foot/head assets by their exact release-manifest
    URLs instead of silently falling back to live code. Its fail-capable matcher
    selftest passes; the resulting v1025 sweep covers all 33 sitemap URLs and 207
    distinct visible controls with zero unreachable routes, broken links, failed
    clicks, form-control failures, or intent failures. Both ten-step wizard flows
    also reach populated review states, and the full rendered forms audit has zero
    issues; no external form was submitted. The 16-route v1026 mobile sweep has
    zero overflow, tap-target, label, or live-region findings. A fresh v1027 FAQ
    browser check proves the prepared page-scoped replacement still matches all
    17 visible answers exactly; the local SEO gate fails only because Webflow still
    serves the older page-scoped block.
  - Staged v1027 also passes axe across all 16 primary routes with zero violations
    (including zero serious/critical), plus the exact-local design audit with no
    legacy palette or wizard-hint findings. Manual inspection of the generated
    homepage, directory, mobile, and startup-wizard screenshots found no release
    blocker; the apparent mid-page sticky header in the stitched full-page mobile
    capture is a screenshot-stitching artifact, not viewport overlap.
  - After the independent About/Sample early-action change settled at v1029, the
    exact-local 33-route sweep was refreshed: 208 distinct visible controls, zero
    unreachable routes, broken links, failed clicks, form-control failures, or
    intent failures. Focused 390px and 1280px checks prove each new founder action
    reaches the visible startup wizard, hides the competing mobile bar, focuses the
    wizard, and restores the bar on Escape.
  - A later mobile sweep correctly failed closed when shared Chromium cache bypassed
    local asset interception (empty runtime identity); its 69 apparent findings were
    invalid live/static evidence and prompted no site CSS change. The harness now
    disables cache before interception, matching the SEO audit. Its rerun binds all
    16 routes to v1031 and reports zero overflow, undersized-target, label, or
    live-region findings. A later v1033 navigation refresh covers 33 sitemap
    URLs and 211 distinct controls with every reachability, link, click, form, and
    intent counter at zero failures. The 69 invalid identity-less findings were
    removed from the temporary findings ledger by exact task/timestamp; a pre-clean
    backup remains under `/tmp/dg-busy/`. The verifier now gates ledger writes on
    runtime identity, with a fail-capable selftest proving an identity failure calls
    no append function.
  - Current v1033 release preparation passes blog, source, honesty, import, smoke,
    truth, review, and map-checkpoint gates. Webflow doctor also passes: live fetch,
    unique SEO metadata, sitemap/robots, custom-code tab, and tooling are healthy;
    it confirms prepare-only state and disk v1033 versus live v1019.
  - The axe local harness was also false-green on opaque Catbox URLs: it had tested
    live v1019 without asserting runtime identity. It now binds all release assets
    by exact manifest URL, records each route's foot version, fails mismatches, and
    retains node-level failure evidence. The corrected run exposed the Events early
    CTA at 1.22:1 because the page's generic gold-link rule overrode its green button
    text. Prepared v1035 excludes `.dg-p-actions` from that rule; exact-local axe now
    passes all 16 routes with zero violations and source verification passes.
  - The rendered forms audit now follows the same contract: cache disabled, exact
    manifest-bound foot and head assets, and a high-severity runtime-version gate
    across startup/engineer at desktop/mobile. All four v1035 views bind exactly and
    pass with zero issues. Navigation now requires the expected version rather than
    merely any version, and navigation/design disable shared-browser cache before
    interception. The cache-disabled v1035 design rerun binds every view to v1035
    and passes with zero palette or wizard-hint findings.
  - Truth briefly failed before sealing because its valid hash chain had reached
    1,079 receipts against an arbitrary 1,000-link verification ceiling. The bounded
    ceiling is now 10,000 while retaining full ancestor hash verification; all nine
    evidence-chain tests pass and fresh v1035 truth seals green. Add checkpoints
    before the new ceiling becomes operationally material.
  - Wizard CDP local mode no longer treats every Catbox JS/CSS asset as foot/head or
    trusts browser cache. It binds the manifest's exact URLs, disables cache, and
    fails unless `window.__dgFootVer` matches disk. Startup and talent flows at
    desktop and mobile all reached their review action on exact v1035 without submitting.
  - The nonstop useful-work loop had no handlers for two tasks its own finder emits.
    It now reuses the existing crawlable-directory generator and draft-only package
    stage. The `/startups` fragment rebuilt from 2,902 companies with eight recent
    roles at 49,893 bytes (below its 50 KB ceiling), and both task dispatches pass.
  - Exact-local v1038 browser proof covers the current staged release: 33 sitemap
    routes and 213 controls have zero unreachable pages, broken links, failed clicks,
    form failures, dead hashes, or failed intents. All 16 primary routes also have
    zero serious/critical axe violations and zero mobile overflow, tap-target,
    input-label, or live-region findings; every receipt reports foot v1038.
  - The complete v1038 ten-view design capture also passes with zero off-palette or
    wizard-hint findings. Direct image review covered desktop/mobile home, pricing,
    directory, referral, legal, and both intake dialogs; CTAs remain legible and
    unobscured. The mobile fixed bar has matching body safe-area padding and its
    route/modal behavior is already guarded, so no speculative CSS change was added.
  - Production v1019 was audited separately from staging: 33 routes and 196 controls
    have zero navigation/click/form/intent failures, all 16 primary routes have zero
    serious axe or mobile geometry/label findings, and both live intake journeys reach
    their final review action with required-field focus/announcements intact. The runs
    stop before submission and create no lead.
  - Exact-local v1040 form structure passes startup/talent at desktop/mobile with zero
    issues. Its 16-route SEO audit also passes: titles, descriptions, canonicals, H1s,
    runtime identity, and console checks are clean, and all 17 visible FAQ answers match
    the rendered FAQPage schema. Only Webflow's older served FAQ schema differs, retained
    as an explicit warning until a currently authorized page save/publish replaces it.
  - Directory behavior has focused and public-runtime proof: 18 atlas/renderer tests plus
    filter, aging, and static selftests pass. On live v1019 mobile, searching `Replit`
    reduces 2,902 companies to two results; its accessible company CTA opens the startup
    brief and pre-fills `Replit`, stopping before any submission.
  - The same mobile directory journey passes against the exact staged v1042 foot and
    prepared atlas: `Replit` yields two of 2,902 companies, opens the company-specific
    brief, and preserves the prefill. Foot/atlas hashes were identical before and after
    the read-only run, so the proof did not race the active writer.
  - Exact-local v1065 navigation receipt (2026-08-06): all 33 sitemap pages and 218
    unique clickable controls pass with zero unreachable routes, unnamed controls,
    dead hashes, disabled submits, broken links, failed clicks, failed dry form
    validation, or failed intent handoffs. The audit snapshots its staged assets at
    launch and made no submissions or outbound writes.
  - Exact-local v1067 rendered-quality receipts cover 16 primary routes with zero
    overflow, tap-target, input-label, live-region, or axe findings. The SEO sweep
    then found `/hire`'s description at 166 characters; v1069 shortens it to 151
    without dropping the human-review, mutual-approval, or fee terms. Source verify,
    the complete local SEO sweep, and ship preparation pass. The sole remaining SEO
    warning is Webflow's older served FAQ schema, already correct in staged runtime
    and still page-save/publish gated.
  - Exact-local v1070 form receipts (2026-08-06): startup and talent both traverse
    ten steps to their guarded “Send brief” / “Send privately” review actions, with
    zero form POSTs. Desktop/mobile structure checks report zero issues. The E2E
    verifier now requires the startup journey—not only talent—to reach submit before
    it can pass. A subsequent source gate caught concurrent head metadata using
    “first-year base” instead of the required “first-year base salary”; this is an
    honest open failure (`head:fee-desc-cash`), left untouched while the active foot
    writer owns the lock.
  - The live head now omits redundant custom preconnect hints. Webflow already
    exposes connection hints for immediately discovered critical resources, while
    the Catbox stylesheet and desktop hero preload initiate their own requests in
    the head. This removes Lighthouse’s over-four-preconnect warning without
    weakening the existing high-priority hero preload or release identity gates.
  - `v1019` removes Pricing’s second mobile hamburger after the canonical Explore
    menu mounts. The preserved Webflow button expanded an empty overlay with stale
    hidden links, duplicating navigation without presenting a usable menu. Live
    Pricing now exposes one top navigation control; Explore opens ten current site
    links, with no overflow or console errors.
  - The button audit’s bare-route 404 probe now strips scripts/styles and checks
    HTTP status plus real title/heading markers. It no longer mistakes redirect
    code comments containing “404” for user-visible failures, and a genuine bare
    `/legal` or `/partnerships` soft-404 now fails the audit instead of appearing
    only as an ignored summary flag.
  - The mobile and design local-mode harnesses now intercept the exact attested
    opaque CDN URLs from `DEMIGOD-FOOT-CDN.json` and fail if the runtime foot
    version differs from the disk version; “local” results can no longer silently
    exercise the previous live release.
  - `v995` retains the canonical Notes renderer from the published blog SoR and
    adds Notes to the existing homepage footer directory; all 33 sitemap URLs
    are reachable in the rendered navigation graph. Notes is included in the
    primary axe, mobile, and SEO route sets; its cards reserve 1200×675 image
    space and render separated category/date metadata.
  - `v995` changes the candidate action from ambiguous “I'm looking” to “Share
    privately” and makes both post-submit paths explicit about human review,
    email-only real-fit follow-up, no automated drip/blasts, and mutual approval.

### Operational integrity

- [x] Refresh the expired research seal and drain the scheduled reseal item:
  `node demigod-reseal-queue.mjs run --schedule`, then verify with
  `node demigod-control-board.mjs`. Do not project research claims unless the
  resulting evidence is green, fresh, and identity-bound.
  - 2026-08-06: researched 10 gold admits + repointed GigaGen off broken
    grifols.com → gigagen.com; live `145/145` source checks; evidence
    `company-research-benchmark-msh7to8s-0c818e` pass-fresh (4/5 fields
    accepted; pricingStatus 0.833/0.9 honest abstentions: Tara dead site,
    Cowboy/Jäntra not_found, GigaGen/Shorenstein not_applicable). Control
    board `research_seal` green; remaining fails are delivery-loop gates.
- [ ] Review the one due warm inbound signal without promoting it to a pilot,
  accepted brief, or board role unless direct evidence supports that transition.
  Current state: `bin/dg pilot status`.
- [ ] Keep role-ledger and public-role pipeline timers healthy. Observed ATS roles
  remain observations, not matching inventory or evidence of founder interest.
  Current state: `node demigod-roles-pipeline.mjs status` and control board.
  - 2026-08-06: both role-ledger and roles-pipeline timers enabled/active; all
    seven pipeline stages pass; public feed is fresh (24 homepage roles, one-day
    observation window). Public-role CLI help/unknown arguments now fail closed
    before artifact writes, with a regression check.
- [x] Stop the directory rebuild from silently deleting companies it once observed.
  The HN cache is read on every map rebuild but was written with a full replace, so
  each `--months` refresh dropped every company whose thread had rolled out of the
  window. Between the 2026-08-06 and 2026-08-14 maps that removed 226 companies, 98
  of them carrying 2,254 live ATS open roles, while the board count held at ~340
  because new boards replaced them one-for-one — invisible to every count-based
  check. `mergeHnCache` now unions the cache and lets the existing `isFreshHnThread`
  age a stale claim to `hiring:'unknown'` instead of deleting the row, which is what
  the module's own docstring always said should happen. Cache seeded from the prior
  map's own HN rows (provenance intact, claims re-aged). After refresh: 2754 → 2917
  companies, 340 → 387 boards, 8428 → 9260 open roles — above the pre-loss baseline.
- [ ] Decide whether 21 companies on the live map belong in a directory that says
  "San Francisco". They are the remainder after the HN recovery, all Wikidata/YC
  rows, carrying 910 open roles: Palantir (Denver), Robinhood (Menlo Park), Nuro and
  NewsBreak (Mountain View), Elastic (Amsterdam), Lightmatter (Boston) — but also
  Mercury (57 roles) and Runway (41), which are SF. Publishing disk drops all of
  them. `bin/dg truth` now names them under `siblingDrift.mapData.dropsSample`
  instead of reporting "unexplained", so this is a scope decision, not a defect
  hunt. Do not restore them wholesale; the non-SF ones were arguably wrong to list.
- [ ] Decide whether the public roles embed should still carry employer metadata.
  `demigod-clay-website.test.mjs` asserts `demigod-foot-core.js` contains
  `employerDepartment` and `boardUpdatedAt`. Both were present at `543bd46` and have
  been absent since; `demigod-startup-atlas-web.js` still carries them, so the atlas
  and the foot embed disagree. Either restore them in foot-core (needs the foot lock)
  or retire those two assertions — do not leave them contradicting each other.
- [ ] Wire the passing orphan tests into `demigod-verify-all.mjs`. Of nine
  DIE-relevant `*.test.mjs` files referenced by neither `demigod-verify-all.mjs` nor
  `package.json`, eight pass and one (`clay-website`) is red — which is how the
  foot-core drift above went unnoticed. Wiring the eight is cheap; the red one waits
  on that decision. Measure before generalizing: most of the 166 test files are fine,
  this is a specific hole rather than a systemic one.
- [ ] Keep the useful-work loop productive and bounded: repair proven failures,
  prune duplicate/stale work, and never auto-publish, auto-message, or manufacture
  business state. Current state: `bin/dg next` and `node demigod-work-find.mjs`.
- [x] Verify backup/remote recovery capability with the existing backup and git
  tooling; report missing configuration honestly. Do not invent another backup
  subsystem.
  - 2026-08-06 audit (`/tmp/dg-busy/backup-capability.json`): **not capable**.
    Blockers: `restic` not installed; `DG_BACKUP_REPO` unset; `RESTIC_PASSWORD_FILE`
    unset. Timer units exist (`systemd-user/demigod-backup.{service,timer}`) but
    cannot run without those deps/env. Git still covers tracked sources; ~20
    gitignored top-level paths remain uncovered until restic is installed and
    pointed at off-device storage. No new backup subsystem invented.

### Documentation and repository hygiene

- [ ] Keep `DOCS.md` the sole documentation index and this file the sole complete
  task register. Convert superseded backlogs into pointers or archives rather
  than maintaining competing lists.
- [ ] Remove stale volatile release facts and retired instructions from living
  docs; prefer `bin/dg truth` and receipts for changing state.
- [x] Reclassify known test failures using fresh reproductions. Fix stale oracles
  at their shared root, fix genuine product defects, and remove tests for archived
  or nonexistent paths when allowed by the game hard stop.
  - 2026-08-06: isolated active-tool reproduction passes all 154 contracts. The
    remaining red receipts are classified, not unexplained test failures:
    site-health has one genuine publish-gated `/startups` fragment mismatch;
    doctor reports optional local environment state (dashboard/API-key file);
    useful-loop reports unavailable backup dependencies and a research abstention.
    Fresh site-health selftest passes. The prepared directory fragment is newer
    and more precise than live (505 companies, “public ATS open roles,” startup-
    first ordering); no archived game path was run or changed.
- [ ] Audit obsolete agent-transport and UI-driving scripts for live callers;
  delete only proven-dead code. Orca is the primary ongoing agent transport.

## Ready but authority-gated

These tasks are real, but agents must not execute the external mutation without
authority in the current user request.

- [x] Publish the prepared website release, then prove disk, manifest, CDN, and
  production identities match. Current state: `bin/dg truth`; preparation:
  `bin/dg ship prepare`; authorized path: `bin/dg ship run`.
  - Published 2026-08-06; strict truth PASS at `v987`, freeze OFF, lock released.
- [ ] Publish the prepared EventsBot API-base configuration so the website stops
  pointing at an expired quick-tunnel URL; then verify the public endpoint.
  Current state: `bin/dg events status`.
- [ ] Send or submit any demand message, follow-up, form, application, invite, or
  event communication only when the current request authorizes that exact class
  of outbound action. Drafting, validation, and logging preparation remain safe.
- [ ] Make payments, bookings, purchases, or paid-provider tests only with current
  authority and explicit amount/scope.

## Business-state gates — execute when evidence exists

These are not software backlog items. They become executable as the real service
moves through its first delivery.

### Acquire and accept one real brief

- [ ] Qualify a named startup counterparty and confirm hiring authority.
- [ ] Capture role, location/remote policy, compensation, must-haves, interview
  owner, and a measurable 90-day outcome.
- [ ] Confirm fee terms and capacity; accept or reject the brief honestly.
- [ ] Record the accepted brief privately. Never mint a public role from interest.

### Deliver the search

- [ ] Assemble a role-scoped operator brief from accepted, current evidence.
- [ ] Review candidates against the 90-day outcome and hard constraints; record
  unknowns, conflicts, gaps, and source freshness.
- [ ] Produce a maximum first slate of two or three evidence-backed candidates.
- [ ] Keep matching decisions human-reviewed; do not create automated match or
  introduction authority.

### Obtain mutual yes and introduce

- [ ] Obtain founder approval and candidate-specific consent, including the exact
  information each side may receive.
- [ ] Record the pair state and send one contextual introduction only when the
  outbound action is currently authorized.
- [ ] Record follow-up facts without SLA promises, fake scarcity, or automated spam.

### Close and learn

- [ ] Record the outcome: hired, paused, declined, or no fit.
- [ ] For a verified hire, record start date and fee basis; prepare an invoice only
  through the authorized finance path.
- [ ] Schedule and record post-start outcome checks.
- [ ] Publish a testimonial, logo, case study, placement count, or proof artifact
  only with explicit consent and receipt-backed facts.
- [ ] Feed real delivery observations into research and product decisions; do not
  infer learning from samples or test records.

## Events and community lifecycle

- [ ] Keep one private, feasible event plan progressing through ideation,
  resourcing, plan, RSVP, run, follow-up, and debrief, with required evidence at
  every transition.
- [ ] Keep public EventsBot output clearly labeled as a private draft; nothing may
  send, publish, book, or charge automatically.
- [ ] Replace the temporary quick tunnel with a stable named endpoint only when
  credentials and external-mutation authority are available.
- [ ] Record attendance, mutual interest, introductions, and debrief outcomes only
  from real evidence and consent.

## Triggered later — not current build work

Add these only when the named evidence makes them necessary:

- Employer-visible engagement status: after a real accepted brief proves status
  visibility is a bottleneck and the privacy boundary is specified.
- Interview scheduling: after real introductions show scheduling friction.
- Candidate profile editing: after a real candidate needs a durable correction path.
- Analytics: after a specific conversion question exists; collect no form PII.
- Stripe or SMS: after the service process and current authorization require them;
  keep public copy marked pending until live and verified.
- Replacement guarantee or pricing change: after terms, economics, exclusions,
  and legal review are decided; never imply a guarantee prematurely.
- Automated research collection, paid-provider bakeoff, or matching automation:
  only after one real accepted role and delivery evidence identify a concrete gap.
- Public proof, testimonials, role inventory, or placement counts: only after real
  receipt-backed facts and publication consent exist.

## Explicitly not tasks

- Reopening, testing, cleaning up, or discussing Eat the Sounds.
- Building a second dashboard, coordinator, database, task oracle, doc index, or
  matching authority.
- Cosmetic polish, speculative marketplace mechanics, OAuth prefill, elaborate
  animations, empty-state illustration systems, or dashboards without measured
  demand.
- Inventing pilots, candidates, placements, attendance, receipts, customer logos,
  SLAs, guarantees, or service availability.
- Treating sample board entries or observed public ATS roles as accepted searches.
- Publishing, sending, submitting forms, booking, or moving money based on old
  blanket authority.

## Current-state commands

```bash
bin/dg session
bin/dg truth
bin/dg next
bin/dg pilot status
bin/dg events status
node demigod-control-board.mjs
npm run demigod:verify:source
```

The commands and their receipts decide current status. This register decides
scope; process checklists specify how to execute a task once its gate opens.
