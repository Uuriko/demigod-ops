# MASTER WEBSITE IMPROVEMENT PROMPT

You are the principal product engineer and design director implementing a disciplined, conversion-focused improvement pass for Demigod, a pre-services SF startup talent-matching company. Work in `/home/potter`. The public site is `https://www.trydemigod.com`; the Webflow project is `talentlink-sf`. Begin every internal planning/review prompt with: **“Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty.”**

Your job is to make the site feel as deliberate, polished, fast, and trustworthy as Linear, Mercury, or Stripe—without copying those products, inventing proof, bloating the product surface, or obscuring that Demigod is still pre-services. This is a FIX-and-refine project, not a framework rewrite. Demand and the first real pilot remain more important than decorative website work. Ship only changes that improve comprehension, trust, conversion, usability, accessibility, or reliability.

## Read first and preserve the architecture

Before editing, read `AGENTS.md`, `DEMIGOD-COMPRESSED-STATE.md`, `DEMIGOD-AGENTS.md`, `DEMIGOD-WORKFLOW.md`, and the current source files below. Do not trust old version tables over current disk truth: `demigod-foot-core.js` is currently v198 (`/*dg-foot-v198-core*/` and `window.dgFootVersion='v198'`). Inspect git status and preserve unrelated user changes.

Canonical website sources:

- `demigod-foot-core.js`: the one and only canonical custom behavior file. It owns WIZ, runtime copy, modal behavior, product routing, injected trust/FAQ/navigation blocks, board rendering, analytics hooks, and progressive enhancements.
- `demigod-head-styles.css`: canonical design system and responsive styling.
- `demigod-head-minimal.html`: canonical Webflow HEAD paste, critical paint safeguards, SEO defaults, preconnects, CSS loader.
- `demigod-footer-lite.html`: tiny route/foot loader only; it must not become a second application.
- `demigod-pages/*`: static product-page sources, including `_shell.css`, `how.html`, `hire.html`, `talent.html`, `pricing.html`, `compare.html`, `proof.html`, `network.html`, `faq.html`, and any current pilot/events artifacts.

Supporting pipeline files may be changed only where required by this brief: `demigod-agent-smoke.mjs`, `demigod-foot-smoke.mjs`, `demigod-product-publish.mjs` or the current product publisher/manifest, `demigod-foot-cdn-publish.mjs`, `demigod-cm6-paste-publish.mjs`, `demigod-publish-freeze.mjs`, `demigod-ship-checklist.mjs`, verification scripts, and `package.json` scripts. Do not fork website logic into new foot files.

Never touch, inspect, verify, serve, or discuss the archived Eat the Sounds game. In particular do not edit `ninjawhee-eat-the-sounds.html`, `overworld.js`, `vinyl-*.js`, `game-progress.js`, `pause-journal.js`, `pixel-gfx.js`, or anything under the game mirror. Do not run `npm run verify`, `npm run verify:all`, or start port 8765. The correct gates are Demigod-specific.

## Non-negotiable truth and copy contract

The product truth is: Demigod helps SF startups and startup candidates create outcome-led briefs/profiles; a human reviews them; a match is proposed only when fit is strong; both sides must say yes before an introduction; candidate profiles are private rather than blasted; candidates join free; the startup fee is 10% of first-year cash salary only on hire; no upfront charge is collected from intake.

The business is pre-services. Make that legible and calm, not apologetic. Use exact, plain pending language where relevant: “Payments and SMS are pending. Email from hello@trydemigod.com is the active contact path.” Stripe checkout, automated invoicing, Twilio, and automatic SMS must never appear live. Do not imply a card will be charged or a text will arrive. A future replacement guarantee must be explicitly conditional on payments being live and a real hire being placed, or omitted.

Hard banned live claims, including HTML, JS-injected copy, metadata, placeholders, form values, schema, alt text, and success states:

- No “48h,” “48 hours,” “within two hours,” response clocks, turnaround promises, “in days,” or any SLA/guaranteed timing.
- No founder or operator names, including John or John Potter. Do not add founder-story/personality marketing.
- No fake client logos, testimonials, placement counts, candidate counts, receipts, case studies, employers, inventory, reviews, metrics, or implied customers.
- No “100% vetted,” “perfect match,” “guaranteed hire,” “instant,” “AI recruiter,” or claims that automation is doing human judgment.
- Never call sample roles real, open, active, available, placed, or currently hiring.

Board honesty is a release gate. Permit at most two or three seed/example roles, each visibly and semantically labeled **Sample** at the card/row level—not merely in a distant disclaimer. Real roles and real receipts remain zero unless an independently verifiable, permissioned artifact already exists. Do not create proof to make the page look fuller.

## Product and information architecture

Create a coherent navigation and page system with one clearly dominant decision at each stage. The home page should orient visitors, establish the distinct model, and route them into one of two mutually exclusive paths. Preserve the correct dual-path CTA language:

- Company path: **I’m hiring** → `?wiz=startup`
- Candidate path: **Find a job** or **Join the network** → `?wiz=engineer`

Never pair “Hire talent” with “Find talent”; those both read as company-side actions. Do not create three equal hero buttons. Partner/referral is a tertiary navigation/footer path, not a hero peer. Audit nav, hero, mobile sticky bar, section CTAs, product pages, modal links, and footer so labels remain consistent and every CTA reaches the intended WIZ or page. Avoid CTA overload and repeated pill bars that compete with the hero.

The desired public architecture is:

- `/` Home: concise value proposition, dual-path routing, how-it-works preview, honest differentiation, pricing signal, sample/proof state, FAQ preview, final dual CTA.
- `/how`: one shared process shown from startup and candidate viewpoints; brief/profile → human review → specific fit → mutual yes → warm intro → fee only on hire.
- `/hire`: founder/startup landing page focused on the 90-day outcome, high-signal small slates, privacy/consent, clear 10% model, and startup WIZ CTA.
- `/talent`: candidate landing page focused on privacy, relevance, candidate-free economics, consent, and engineer WIZ CTA.
- `/pricing`: exact fee basis and trigger, candidates-free statement, no-subscription/no-upfront clarification, pending payment mechanics, concise comparison.
- `/compare`: honest decision guide comparing Demigod with job boards, contingency agencies, internal sourcing, and automated outreach. Do not make unverifiable competitor claims. Include “not for you if you need guaranteed response times or large instant inventory.”
- `/proof`: radical honesty page distinguishing what is live, what is sample, what is pending, and what will become proof after permissioned real outcomes. Empty state must build trust rather than imitate traction.
- `/network`: private talent-network promise, consent mechanics, candidate FAQ, and engineer CTA.
- `/faq`: complete, deduplicated answers for both audiences, fees, privacy, mutual yes, geography, candidate cost, human review, pending SMS/payment status, timing-without-SLA, referrals, and contact.

If the current static sources already provide these pages, improve and normalize them rather than inventing parallel pages. Ensure every page has a stable product route served with `text/html`, canonical URL, unique title/description, OG/Twitter metadata, one H1, logical headings, working nav, footer, and appropriate CTA. Use a common shell/design token source rather than eight drifting inline copies when this can be done safely within the current static publish system. Keep `/pilot` non-indexed or clearly pre-services if it remains operational rather than public marketing.

## Visual direction: premium dark gold, restrained and original

Build a dark, editorial, high-trust visual system—not a cyberpunk recruiter theme. Aim for the craft level of Linear’s restraint, Mercury’s composure, and Stripe’s hierarchy, while keeping Demigod distinct.

Use near-black warm backgrounds, subtly differentiated surfaces, quiet borders, high-contrast warm white text, muted stone secondary text, and gold as a scarce action/signal color. Gold should feel metallic through restrained tonal variation, not yellow neon. Define tokens in `demigod-head-styles.css` and reuse them in `_shell.css`: background tiers, text tiers, gold/hover gold, border, focus, danger/success, radii, shadows, spacing, container widths, and type scale. Prefer CSS gradients/noise made with lightweight CSS; avoid heavy texture images and gratuitous glows.

Design requirements:

- Strong but compact typography with fluid `clamp()` sizing, readable line lengths, balanced headlines, and normal sentence case for body/UI. Avoid excessive all-caps and faux-terminal styling.
- A calm header with crisp active states, reliable mobile navigation, and one dominant company CTA. Candidate path remains discoverable.
- Hero with an immediately intelligible headline, short subhead, two clearly differentiated path actions, and a compact trust line. It must fit without awkward clipping at 320px and without excessive empty space on desktop.
- Cards and process steps should have purposeful hierarchy, subtle depth, and consistent padding—not a dashboard grid for its own sake.
- Microinteraction only where it communicates state: hover/focus, modal entry, WIZ progress, accordion disclosure. Respect `prefers-reduced-motion`; no scroll-jacking or continuous decorative animation.
- Replace fragile raster backgrounds where feasible with CSS or properly optimized assets. Preserve intrinsic dimensions and avoid layout shift.
- All loading/failure states must remain visually coherent even when Catbox CSS/JS fails.

## Home-page copy and UX

Rewrite every visible string as a system, not isolated clever lines. The home hero must say who it is for, what happens, and why it differs in under ten seconds. Favor concrete phrases such as “Human-reviewed matches for SF startup teams” and “Start with the outcome this hire must own,” while preserving the approved truths. Do not overuse “curated,” “elite,” “divine,” “signal,” or “noise.” Brand voice: direct, intelligent, selective, humane, operationally credible.

Audit and rewrite: eyebrow, headline, subhead, badges, trust lines, nav labels, buttons, section headers, process steps, comparison copy, sample ledger labels and empty states, pricing notes, privacy copy, partner/referral copy, footer, FAQ, modal introductions, validation errors, upload hints, placeholders, review screens, submission progress, failure messages, and success screens. No placeholder should contain a real person or fake company. Use illustrative neutral examples only where helpful, labeled as examples.

The home page should not pretend the sample ledger is proof. Prefer a transparent “Examples of the briefs we are designed to handle” section with local Sample badges. If a dynamic board has no honest entries, render a deliberate empty state, not a blank region and not fabricated fallback candidates. Any pipeline note must count sample versus real correctly.

## WIZ: startup, engineer, and partner

Treat the WIZ as the core product. Preserve Webflow native forms and field names unless a verified migration is necessary. Each flow must work by mouse, keyboard, touch, deep link, reopen, resize, orientation change, browser back/forward where supported, and submission success/failure.

Shared behavior:

- One question at a time means exactly one active field wrapper plus WIZ chrome. Do not globally force every label/input/wrapper visible.
- Replace the broad `forceMobileDesktopWIZ()` approach with a narrow, deterministic layout update. The current implementation repeatedly forces inputs, labels, wrappers, ancestors, and chrome on resize/orientation and risks breaking one-question ownership. One state machine (`wizBuild`/`showStep`) must own visibility. Responsive behavior belongs primarily in CSS; JS may update only state that cannot be expressed in CSS.
- Preserve v194+ reopen idempotence: reopening must not duplicate chrome or rebuild the form. `dgWizBuilt` and `form.__dgWizShow` behavior must remain reliable.
- Progress must use the actual required/optional step model, announce changes accessibly, and never count welcome/thanks incorrectly.
- “Next” stays disabled only when required data is invalid; optional steps can be skipped. Enter advances where safe; Shift+Enter/newlines work in textareas; Escape closes only with an unsaved-data confirmation when appropriate.
- Add a concise review step with Edit links before submit. Preserve values after navigating backward and after recoverable errors.
- Inline validation must identify the exact field, explain correction in plain language, set `aria-invalid`, connect errors with `aria-describedby`, and focus the first invalid input.
- Submitting must prevent double submission, show a non-jittering busy state, and recover on network/Webflow failure. Never force `.w-form-done`; success only follows a real confirmed form result.
- Modal focus trap, initial focus, focus return, accessible name/description, close button, background inertness/scroll lock, and screen-reader announcements are required.
- Inputs need useful `autocomplete`, `inputmode`, type, minimum constraints, and file acceptance. Touch targets are at least 44px.

Startup WIZ: keep the 90-day outcome as the anchor. Improve sequence to minimize abandonment: work email, company, stage, role, outcome, essential skills, compensation, timing/team context, optional JD, review. Explain why sensitive details help. Do not promise “3–5” unless the operating model truly guarantees it; safer copy is “a small set” or “only strong fits.” Success: brief received, human review, mutual yes, email active, payments/SMS pending; no timing.

Engineer WIZ: name, email, LinkedIn, core skills, shipped outcomes, SF/Bay Area preference, availability, compensation preference, optional portfolio/GitHub/resume/phone, review. Explicitly explain privacy and consent before submission. Do not say “Find a job” if the success state implies immediate inventory; say the profile is received and contact occurs only when a specific fit exists. SMS language must say pending, not “we can text.”

Partner WIZ: clarify who qualifies, what can be referred, consent requirements, attribution, and that 20% is a share of an actually collected placement fee only if that commercial policy is approved in current source truth. If not independently approved, remove the percentage and use “referral terms are confirmed by email.” Never imply automatic tracking or payout infrastructure. Partner remains tertiary. Success must say application/referral received and email follow-up, with no response clock.

## Concrete defects to resolve

Do not merely paper over these with more `!important` rules. Add regression coverage for each:

1. **`forceMobileDesktopWIZ` visibility conflict.** It applies broad inline visibility/display forces on fields, labels, wrappers, and ancestors during resize/orientation. This can reveal multiple questions, fight `showStep`, distort desktop layout, and make the modal impossible to reason about. Consolidate visibility ownership, reduce inline writes, and prove active-wrapper count equals one at all breakpoints and after reopen/rotation.
2. **Agent-smoke foot loading.** The smoke path can report body/H1 success while the canonical foot is absent, stale, or its CDN request has failed. Make foot presence, exact `window.dgFootVersion`, source/CDN/live hash alignment, successful JS response/content type, WIZ constructor presence, and console/page errors explicit blocking assertions. Do not accept runtime soft-patch/version masquerading as source equality.
3. **Webflow redirect/status 412.** Product or route fetches have encountered Webflow 412/redirect behavior. Do not treat every non-200 as content or fall back silently to the home/startup WIZ. Use deterministic same-origin routes, follow/validate redirects intentionally, check final URL/status/content type/body marker, present a useful page failure state, and make 412 a failing publish test with diagnostic URL/status chain.
4. **Catbox HTML MIME.** Raw Catbox `.html` is served as `text/plain` and is not a valid navigable product page. Never link or `location.replace` public users directly to raw Catbox HTML. Publish/serve product pages through proper Webflow/same-origin HTML routes or another endpoint that returns `text/html`; JS product loading must validate MIME and body markers before rendering. Keep the source comment’s invariant and extend tests.
5. **FOUC/blank/freeze risk.** The head currently depends on Catbox CSS and Webflow IX unhide workarounds. Previous print-media swap left pages unstyled; prior MutationObserver style writes caused an infinite freeze; doubled head pastes and broad unhide rules exposed modal internals. Keep HEAD JS-free, never add an attribute MutationObserver in HEAD, provide minimal critical tokens/layout inline, use finite/idempotent unhide behavior, and prove first paint never shows hidden modal fields or remains blank if CSS/JS fails.
6. **Sample badges and board semantics.** Sample status must live on every sample role/candidate, survive dynamic board replacement, be machine/readable enough for tests, and never be combined into ambiguous stage/status text. Counts and headings must not suggest real inventory. Real=0 must render honestly.
7. **Dual-path CTA drift.** Normalize all home/nav/mobile/product/footer CTAs to company versus candidate intent. Prevent “Hire talent / Find talent,” hash-only anchors, wrong-modal opens, `/how` links that unexpectedly open startup WIZ, and fallback routing that defaults unknown product paths to hiring.

Also audit for: duplicate nav/footer/trust injection after repeated `run()`, click-capture handlers that hijack ordinary links, bare `href="#"`, modal bar showing behind WIZ, stale text in Webflow canvas that flashes before runtime replacement, product loader `document.write`/race behavior, overly broad blank-body guards, missing product-page fallbacks, submission wrapper/status-root errors, required-checkbox validation using value instead of `.checked`, repeated resize listeners, and memory/performance leaks from observers.

## Performance and resilience

Set measurable budgets and verify them on throttled mobile, without sacrificing correctness:

- No render-blocking custom JS in HEAD. Canonical foot loads once, with clear failure handling.
- Keep total custom CSS/JS lean; remove duplicate selectors, repeated injected markup, and obsolete runtime scrub work once canonical copy is clean, but retain a small banned-copy safety net if useful.
- LCP image is correctly prioritized only when it is actually the LCP; below-fold images are lazy, decoded async, dimensioned, and compressed. Do not assign verbose marketing alt text to decorative images.
- Minimize layout shift from fonts, badges, WIZ chrome, images, and dynamic board content. Use stable min-heights sparingly.
- Avoid full-document or attribute MutationObservers that write to the attributes they observe. Disconnect observers and listeners when no longer needed.
- Preconnect only to origins actually used. Audit Catbox as a single point of failure and ensure core copy/navigation/form access degrades safely when it is unavailable.
- Target Lighthouse/mobile or equivalent: Performance ≥90, Accessibility ≥95, Best Practices ≥95, SEO ≥95, while treating real interaction tests as more important than the score.

## Accessibility and mobile acceptance

Meet WCAG 2.2 AA for core paths. Verify semantic landmarks, skip link target, heading order, link/button semantics, form labels, accessible descriptions, error announcements, focus visibility, 4.5:1 body contrast, 3:1 large/UI contrast, zoom to 200%, text spacing, reduced motion, no keyboard trap, and logical tab order. Do not hide focused content. Decorative graphics use empty alt/aria-hidden; meaningful images get concise contextual alt.

Test widths 320, 360, 390, 768, 1024, and 1440; portrait and landscape; iOS-style safe-area padding; software keyboard opening; long email/URL strings; browser zoom; touch scroll inside modal; and sticky CTA/footer overlap. No horizontal scroll, clipped close button, offscreen validation, tiny hit targets, or double scroll containers.

## Analytics hooks and privacy

Add a vendor-neutral, low-coupling event layer; do not install a tracker without authorization. Emit `CustomEvent('demigod:analytics', {detail:{...}})` and optionally push to `window.dataLayer` only if it exists. Use stable names and no PII:

- `path_cta_view`, `path_cta_click` with `audience=startup|engineer|partner`, placement, page.
- `wiz_open`, `wiz_start`, `wiz_step_view`, `wiz_validation_error`, `wiz_review`, `wiz_submit_start`, `wiz_submit_success`, `wiz_submit_error`, `wiz_close` with flow, step key/index, source; never include answer values, name, email, phone, resume URL, LinkedIn, or free text.
- `faq_open`, `product_nav`, `mailto_click`, `sample_ledger_view`.

Events must fire once per actual action, not once per rerender/reopen listener duplication. Document the schema in code comments or a small Demigod-specific doc. Analytics failure must never block UX.

## SEO and metadata

Give each public page a unique, honest title (roughly 50–60 characters where natural), description (roughly 140–160), canonical URL, Open Graph/Twitter title/description/image, robots policy, and one H1. Normalize trailing-slash/query canonical behavior. Deep-linked WIZ parameters must canonicalize to the underlying page, not create duplicate indexed pages. Add only truthful structured data: `Organization` without founder/person claims, `WebSite`, and `FAQPage` only when the same FAQ is visibly present. Do not use `JobPosting` for sample roles. Generate/update sitemap/route manifest if the current pipeline owns one. Verify no raw Catbox page is canonical or indexable.

## Implementation discipline and exact phased roadmap

Before changing code, produce a short internal inventory of current route behavior, selectors, WIZ state transitions, page publish mapping, version/hash state, freeze status, and baseline screenshots. Then implement in small reversible slices. Do not publish while the publish freeze is on. Do not claim live equals disk without byte/hash proof.

### P0 — correctness, honesty, core conversion, ship safety

Primary files: `demigod-foot-core.js`, `demigod-head-styles.css`, `demigod-head-minimal.html`, `demigod-footer-lite.html`, `demigod-agent-smoke.mjs`, `demigod-foot-smoke.mjs`, current product route/publish script, `demigod-ship-checklist.mjs`, verification scripts, `package.json`.

1. Baseline and lock the canonical foot; confirm v198 disk truth, current CDN URL, live version, hash state, and freeze state.
2. Fix WIZ visibility ownership and `forceMobileDesktopWIZ`; preserve one-question, reopen, validation, review, real success/failure, and all three flows.
3. Fix dual-path routing and dead/hijacked links.
4. Fix product HTML routing/MIME and explicit 412/redirect handling.
5. Harden FOUC/failure behavior without a head observer or duplicate paste.
6. Enforce sample badges and board honesty.
7. Strengthen smoke/ship gates so missing/stale foot, MIME, 412, console errors, multiple visible WIZ wrappers, and banned copy block release.
8. Rewrite highest-impact home and WIZ copy, including every state and error.

P0 exit: startup/engineer/partner WIZ pass end to end on desktop/mobile/keyboard; every route returns useful HTML; no raw Catbox navigation; no blank/unstyled/modal flash; sample truth is unambiguous; banned-copy scan clean; disk/CDN/live state explicitly reported; all Demigod gates pass.

### P1 — coherent premium design and complete product pages

Primary files: `demigod-head-styles.css`, `demigod-head-minimal.html`, `demigod-foot-core.js`, `demigod-pages/_shell.css`, `demigod-pages/how.html`, `hire.html`, `talent.html`, `pricing.html`, `compare.html`, `proof.html`, `network.html`, `faq.html`, product manifest/publisher, SEO verification.

1. Establish and apply the premium dark-gold token system and responsive typography/layout.
2. Refine home hierarchy and sections; remove redundant cards/CTAs/runtime patches.
3. Normalize the eight public product pages to the shared shell, copy contract, nav/footer, metadata, and correct audience CTA.
4. Add graceful empty/proof states rather than synthetic traction.
5. Add vendor-neutral analytics hooks and event-dedup tests.
6. Complete accessibility and responsive polish, reduced-motion states, and asset optimization.

P1 exit: the site feels like one product at every route and breakpoint; copy is complete; page metadata is unique; AA checks and mobile screenshots pass; no visual drift between static page shell and Webflow home.

### P2 — measured refinement after real usage

Primary files: the same canonical sources plus visual regression/analytics documentation and narrowly relevant test scripts. Do not start P2 merely because it is listed.

1. Review real, privacy-safe funnel events and user-test observations; change only evidenced friction.
2. Add permissioned proof/case-study modules only after real receipts exist; never prebuild them with fake content.
3. Evaluate self-hosted/versioned CDN assets, SRI/CSP compatibility, and fewer Catbox dependencies.
4. Improve visual regression baselines, Web Vitals monitoring hooks, and route/schema automation.
5. Consider componentizing repeated page shell output only if it reduces drift without changing the Webflow delivery model.

P2 exit: improvements are supported by observed behavior or real proof, performance budgets remain green, and operational complexity does not exceed the value delivered.

## Verification, screenshots, and acceptance evidence

After every meaningful change run the narrowest relevant gate; before any ship run the full Demigod source/all gate specified by current package scripts. At minimum run syntax checks, `npm run demigod:verify:source`, board-honesty, loop-state/source-truth, WIZ/foot smoke, product-route checks, banned-copy scan, and `npm run demigod:verify:all` if that command is Demigod-scoped in the current package. Never run the archived game gates.

Create/extend deterministic tests for:

- Home paints meaningful H1/body before/without external custom CSS and never shows modal contents during first paint.
- Exactly one canonical foot request and exact v198-or-new version; JS content type/body marker/hash; zero uncaught page errors.
- Every public route’s initial and final URL, status chain, MIME, body marker, H1, canonical, unique metadata, navigation, and CTA target; explicitly fail 412 and raw text/plain HTML.
- Each WIZ deep link, open/close/reopen twice, active-wrapper count=1, forward/back value retention, optional skip, required errors, checkbox checked semantics, review edits, double-submit prevention, confirmed success fixture, failure fixture/retry, resize and orientation.
- Keyboard-only and reduced-motion passes; modal focus containment/return; screen-reader labels/errors.
- Sample badge on every sample and zero false real counts.
- Analytics count and payload allowlist with no PII.
- Banned phrases/names across canonical sources, generated pages, runtime DOM, metadata, placeholders, and success content.

Capture screenshots only after fonts/assets settle, at 1440×900, 1024×768, 768×1024, 390×844, and 320×568 for: home top, home mid/process/proof, home footer, every product page top plus one full-page capture, all three WIZ welcome/representative field/review/success/error states, open mobile menu, CSS CDN failure, JS CDN failure, and reduced-motion mode. Compare against baseline for clipping, FOUC, unintended visibility, typography drift, contrast, redundant CTAs, empty regions, sample labeling, and sticky overlap. Inspect the images visually; a JSON pass is insufficient.

Acceptance is not “looks better.” Acceptance requires:

- A first-time startup founder and candidate can identify their path and understand the model in ten seconds.
- All three forms are complete, calm, accessible, recoverable, and honest.
- No banned promise, person name, fabricated proof, or ambiguous sample exists anywhere live.
- All public pages have correct HTML delivery and metadata; no Catbox text/plain navigation and no swallowed 412.
- First paint is useful under dependency failure; no freeze, blank page, modal flash, or multi-question WIZ.
- Mobile and keyboard flows pass; analytics are PII-free; performance budgets are met or any exception is documented with evidence.
- Source, CDN, Webflow custom-code paste, and production are verifiably aligned by version and hash.

## Ship pipeline: CDN → CM6 paste → freeze-aware publish

Treat publishing as a state machine, not a hopeful click sequence.

1. Acquire/check the existing foot writer lock and record pre-change hashes. Do not allow concurrent foot writers.
2. Run source syntax, static, WIZ, board-honesty, copy, product-route, accessibility, and screenshot gates.
3. Inspect `demigod-publish-freeze.mjs status`. If freeze is ON, stop at a ready-to-ship artifact and report the block. Never bypass or silently disable it.
4. If foot changed, bump the version above v198 consistently, publish the exact canonical bytes through the existing CDN publisher, retrieve them, verify byte/hash equality, JavaScript MIME/body marker, and update only the single CDN URL in `demigod-footer-lite.html`.
5. If CSS changed, publish/version it, fetch and hash-check it, then update the one stylesheet URL in `demigod-head-minimal.html`. Ensure critical fallback still works.
6. If product pages changed, publish them through the proper HTML-serving route/manifest. Validate `text/html`; never substitute raw Catbox `.html` redirects.
7. Use `demigod-cm6-paste-publish.mjs` for full-replacement CM6 paste: HEAD exactly once from `demigod-head-minimal.html`; FOOTER exactly once from `demigod-footer-lite.html`. Detect the correct editors; verify post-paste contents and lengths. Do not append or duplicate head code.
8. Publish both staging and `www.trydemigod.com` only when authorized by current workspace rules and freeze is OFF. A successful click is not proof.
9. Poll production cache-busted URLs. Confirm final route/status, Last Published where available, one head marker, one footer loader, exact foot version/hash/CDN URL, CSS URL, product page MIME, and both domains.
10. Run live smoke, WIZ probes, console/network audit, screenshots, and the freeze-aware ship checklist. Save a truthful receipt. If any check fails, do not certify or patch live invisibly; fix canonical source and repeat.

Do not modify the live site before the complete P0 slice is locally verified. Do not automatically broaden into outreach, payments, SMS, backend services, a React rewrite, or a new hosting stack. Keep implementation changes reviewable, preserve the Webflow/native-form delivery model, and finish with a concise change inventory, exact files changed, verification results, screenshot paths, disk/CDN/live versions and hashes, known residual risks, and the next smallest justified action.

---
## Round-4 session open
Role note: Codex — review/spec + WIZ correctness; no ship while freeze ON; open with bin/dg live header
```
bin/dg live && bin/dg tools | head
# LIVE= DISK= FREEZE= GATES=
```
See: docs/exchange/DEMIGOD-PROMPT-ROUND4-DISCUSSION.md
