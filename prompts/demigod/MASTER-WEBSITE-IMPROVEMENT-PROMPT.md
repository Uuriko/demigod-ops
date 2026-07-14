# MERGED MASTER WEBSITE IMPROVEMENT PROMPT
## Demigod · trydemigod.com · generated 2026-07-14T18:29:16.819782+00:00

This document merges independent long-form prompts from:
1. **Codex** (`prompts/demigod/MASTER-IMPROVE-CODEX.md`) — principal engineer + design director voice
2. **Claude** (`prompts/demigod/MASTER-IMPROVE-CLAUDE.md`) — senior product engineer + design lead voice
3. **Fable** — df session empty/hung; Claude also filled Fable-role alternate if present

Use this as the single brief for an implementation agent (or re-run as-is).

---

## How to use
1. Paste the **Merged execution brief** (Section A) as the agent system task.
2. Keep Codex + Claude full texts as appendices for detail.
3. Prefer **P0 bug/honesty** before cosmetic P2.
4. Respect freeze / human Publish gates as stated in both source prompts.
5. Canonical site JS remains **only** `demigod-foot-core.js`.

---

## Section A — Merged execution brief (run this)


### Role
You are implementing a full improvement pass for Demigod (Webflow talent matching) at `/home/potter`, live site https://www.trydemigod.com.

### Current disk truth (verify before edit)
- Foot: demigod-foot-core.js (check `__dgFootVer` / dg-foot-v*-core)
- Head CSS: demigod-head-styles.css + demigod-head-minimal.html
- Product pages: demigod-pages/* (+ _shell.css)
- Footer loader: demigod-footer-lite.html
- Pipeline: demigod-foot-cdn-publish.mjs, demigod-head-css-publish.mjs, demigod-cm6-paste-publish.mjs, demigod-publish-freeze.mjs

### Hard constraints (both agents agree)
1. One canonical site JS: demigod-foot-core.js only
2. Honesty: NO 48h/SLA/turnaround; NO founder names; pending for Stripe/SMS; sample board labeled; realRoles=0 until real
3. Dual CTAs only: "I'm hiring" vs "Find a job" / join network — never Hire talent + Find talent
4. Catbox raw .html is text/plain — never navigate users to raw catbox HTML; use proper routes or validate MIME
5. Do not touch Eat the Sounds game
6. Verify after every change: npm run demigod:verify:source + board honesty + loop-state + foot-smoke + WIZ playtest
7. Freeze ON → work disk only until freeze off + authorized ship; paste via CM6 full replace not append

### P0 — Bugs & correctness (do first)
1. **forceMobileDesktopWIZ / showStep ownership**: one-question WIZ must stay one active field after resize/orientation/reopen; no broad unhide of all inputs
2. **Agent-smoke foot version**: assert exact live __dgFootVer + CDN URL + content-type + no console errors (not soft 195 masquerade)
3. **Webflow 412**: redirect/publish API auth failures must fail tests loudly; don't silently treat as home
4. **Product page MIME**: DEMIGOD-PAGES catbox URLs must not be user-facing navigation if text/plain; fix serving or use /?p= routes with HTML content
5. **FOUC / head**: critical CSS inline; unhide finite; no MutationObserver freeze; CSS CDN failure still readable
6. **Sample badges** on every sample role; never "LIVE ROLES HIRING NOW" semantics for samples
7. **Boot integrity**: every called function defined; boot-smoke parse; IIFE closes
8. **Form integrity**: 90day-outcome required; review step before submit; double-submit guard; real success only on real form result
9. **Dedup injects**: no double nav/FAQ/trust on re-run(); no bare href=#
10. **Banned copy scrub** matches current strings; Designer static still audited

### P1 — Design system & UI/UX
- Tokens: near-black tiers, gold scarce action color, muted stone secondary, clamp type scale, radii, focus rings, reduced-motion
- Home: 10-second path choice; hero fit 320–1440; one dominant CTA pair; process preview; honest pricing signal; FAQ; final dual CTA
- Nav: glass/sticky, consistent labels, mobile menu or bar without overlap
- WIZ: glass modal, progress a11y, 44px targets, review with Edit, keyboard Enter/Esc, focus trap
- Product pages: shared shell, unique H1/meta, sticky mobile CTA, hero band optional
- Micro-interactions only for state; no scroll-jacking
- LCP/CLS budgets; preconnect only used origins; degrade if catbox fails

### P1 — Copy (every surface)
Rewrite as a system: eyebrow, H1, sub, badges, trust, nav, buttons, section headers, process, pricing, privacy, partner, footer, FAQ, WIZ questions/hints/placeholders/validation/success, schema, alt text.
Voice: direct, intelligent, selective, operational. No elite/divine/AI-recruiter hype.
Pending: "Payments and SMS are pending. hello@trydemigod.com is the active path."

### P1 — Forms (startup / engineer / partner)
- Startup: email → company → stage → role → 90day → skills → comp → timing → optional JD → review → submit
- Engineer: name → email → LinkedIn → skills → shipped → SF preference → availability → optional → review
- Partner: tertiary; honest referral terms; no fake tracking infrastructure
- Tests: demigod-wiz-cdp-playtest --local; reopen thrice; resize; orientation

### P1/P2 — Pages & features
- Normalize /how /hire /talent /pricing /compare /proof /network /faq
- Proof page radical honesty (live vs sample vs pending)
- Compare page: boards / agencies / Demigod — no unverifiable competitor claims
- SEO: unique title/description/canonical/OG per page
- Analytics: demigod:analytics CustomEvent, no PII
- Optional: OAuth prefill (LinkedIn engineers) as pending layer — don't claim live

### P2 — Polish
- Motion polish, empty states, reduced-motion, print styles, schema.org JobPosting only if real
- Performance Lighthouse targets ≥90/95/95/95 as stretch
- Screenshot baselines at 320/390/768/1024/1440

### Ship pipeline
1. Locks + pre hashes
2. Gates green
3. Freeze status
4. Foot CDN publish + fetch verify version/hash
5. Head CSS CDN + head-minimal URL
6. Product pages proper HTML serve
7. CM6 full replace head+foot, Save, verify editor contents
8. Publish only freeze OFF
9. Live cache-bust poll both domains
10. Live smoke + screenshots + receipt

### Testing matrix (must pass)
| Area | Command / method |
|------|------------------|
| Source | npm run demigod:verify:source |
| Foot smoke | node demigod-foot-smoke.mjs |
| Board honesty | node demigod-verify-board-honesty.mjs |
| Loop state | node demigod-verify-loop-state.mjs |
| Full check | bin/dg full-check |
| WIZ | node demigod-wiz-cdp-playtest.mjs --local |
| Usertest | node demigod-user-test.mjs --quick / full |
| Live smoke | node demigod-agent-smoke.mjs |
| Visual | CDP screenshots desktop/mobile/WIZ |

### Acceptance (not "looks better")
- Founder & candidate know path in 10 seconds
- All three forms complete, accessible, honest
- Zero banned promises / fake proof
- Public pages correct HTML + metadata
- First paint useful under dependency failure
- Mobile + keyboard pass
- Disk/CDN/live version+hash aligned when shipped

### Handoff format
BASELINE · CHANGES · TEST MATRIX · HONESTY LEDGER · SHIP STATE · REMAINING P0/P1/P2

---



# APPENDICES (full agent prompts)

## Codex

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


## Claude

# MASTER PROMPT — Improve the Demigod Website (trydemigod.com)

You are a senior full-stack product engineer + design lead operating on the live Demigod codebase at `/home/potter`. Demigod is a Webflow-hosted talent-matching product (startups ↔ engineers). Your mandate: raise the quality of the site end-to-end — design, UI/UX, forms, copy, features, pages, bugs, code quality, testing — and leave it in a demonstrably shippable, honest, verified state. Work like an owner: plan first, make surgical changes to the canonical files, verify every change, and never publish anything you have not proven correct.

---

## 0. NON-NEGOTIABLE GROUND RULES (read first, they override everything)

1. **One canonical file for site JS.** All site behavior lives in `demigod-foot-core.js`. Edit ONLY that file for site logic. Head styles live in the head custom-code / head styles block. Static page structure/text lives in `demigod-pages` (Webflow Designer content). Do not scatter site logic across the `demigod-*.mjs` helper scripts — those are tooling, not the site.
2. **Verify gate is mandatory after EVERY edit.** Run `npm run demigod:verify:source` (or the targeted `:all`) plus board-honesty and loop-state checks. A build that does not parse (boot-smoke) is NEVER shippable even if all grep gates are green. Always `grep` that referenced functions (e.g. `run(`, `show(`, `wizBuild(`) are actually DEFINED, not just called — past corruptions shipped calls with no definitions.
3. **Boot-smoke before trust.** Before claiming any build is good, execute a parse/boot smoke test (vm shim) on `demigod-foot-core.js`. "All grep gates green on a file that doesn't parse" has happened repeatedly — do not repeat it.
4. **Honesty policy (hard copy rules):**
   - NO "48h", NO SLA promises, NO turnaround-time guarantees anywhere (custom code OR static Designer text).
   - NO founder names / personal names on the live site. Use `hello@trydemigod.com will follow up`.
   - Services not yet live (Twilio/SMS, Stripe, matching automation) MUST use "pending" language — never imply they are active.
   - Board data: max 3 seeds until real receipts exist; `realRoles: 0` until real; sample rows labeled `sample:true`. Never mint fake pilots/receipts/testimonials.
   - Do not overclaim ("LIVE ROLES HIRING NOW", fake counts, fabricated testimonials).
5. **Human owns the Publish click.** You PREPARE (CDN upload, custom-code paste via CDP, diffs, screenshots, verification). Do not force-publish. Never set `DEMIGOD_FORCE_PUBLISH` to bypass freeze guards. Respect any active freeze (`assertNotFrozen`) — if a freeze is on, do design/code/test work on disk only and STOP before shipping.
6. **Do not touch the archived game.** "Eat the Sounds" is archived. Never modify it unless the user explicitly says "reopen the game".
7. **No silent scope creep.** Minimal, purposeful changes. Every change must be justified against product goals (current phase: GTM + pre-services honesty). If the site is "mostly done," prefer polish + correctness over rebuilds.

---

## 1. FIRST: BUILD A MENTAL MODEL (do not edit yet)

Before any change, establish ground truth. Produce a short written baseline:

- Read `DEMIGOD-COMPRESSED-STATE.md` (living state — start here), `CLAUDE.md`, `DEMIGOD-AGENTS.md`, and the latest `docs/exchange/*` postmortems.
- Read `demigod-foot-core.js` fully. Note: current version stamp (`__dgFootVer`), `BOARD_CDN` id, the WIZ/stepper implementation, form handlers, board render, scrub routines.
- Read the head styles / head custom-code block. Note critical CSS, the unhide script, any render-blocking external CSS (past FOUC/spinner bugs came from render-blocking catbox CSS + a `SyntaxError` in the unhide script that kept the hero `visibility:hidden`).
- Inventory `demigod-pages` (static Designer pages: home, hire, engineers, pricing, legal, partnerships, etc.). Note duplicated nav items, duplicate copyright/email, lorem/placeholder sections, and any banned copy (48h/SLA/names).
- Confirm live vs disk state: what is actually LIVE on trydemigod.com vs what is on disk. Identify drift, and whether it is intentional (freeze) or accidental (stale publish). Do NOT assume disk == live.
- Check board honesty state (`DEMIGOD-BOARD.json`): seed count, realRoles, sample labeling, and whether `BOARD_CDN` in foot matches the board file's cdn id.

Output a concise **BASELINE** section: current version, live/disk drift, freeze status, top defects found, and a prioritized plan (P0 = broken/dishonest, P1 = UX/quality, P2 = polish/features). Then proceed.

---

## 2. BUGS & CORRECTNESS (P0 — fix before anything cosmetic)

Hunt and fix, each with a boot-smoke + verify after:

- **Boot integrity:** every function called at boot is defined; no `ReferenceError`/`SyntaxError`; IIFE opens and closes correctly (past breaks: extra `}` closing the IIFE early, missing `})();` at EOF, misplaced `}catch(e){}`).
- **Head unhide:** the visibility-gate script parses and runs; hero/hero-grid become visible; no leftover display-block hacks on grids; no flash of stale content.
- **Render-blocking / FOUC:** no render-blocking external CSS causing spinner-on-stall; critical styles inline; graceful fallback if CDN assets stall.
- **Forms/WIZ:** selectors are valid and quoted (past crash: unquoted `[name=90day-outcome]` / `#90day-outcome`); stepper actually activates (not dead code); `__submit__` branch is reachable; required fields are visible & submittable; no `enhanceWIZ` fallback that hides the whole `<form>` (vis=0 bug).
- **Board render:** anchor element exists so `renderBoard` isn't a no-op; matches/receipts render once (no triplication); JSON→DOM is escaped (`esc()`), no unescaped `innerHTML` XSS from board JSON.
- **Dedup:** no duplicate nav items ("FIND TALENT" ×2), duplicate copyright/email/tagline, duplicate pricing lines.
- **Honesty runtime scrub:** the scrub routine actually matches current banned strings (regex must match the copy on disk); verify it neutralizes any 48h/SLA/name text at runtime.

For each fix: minimal edit → boot-smoke → `verify:source` → grep-confirm the anchor. Log md5/version before & after.

---

## 3. DESIGN & UI/UX (P1)

Elevate the visual and interaction quality without a rebuild. Aim for a crisp, modern, trustworthy talent-marketplace aesthetic.

- **Visual system:** consistent spacing scale, type scale, color tokens, radius, shadow, and a coherent light/dark treatment. Remove one-off inline styles that fight the system. Ensure brand assets (logo, glow, hero) render sharp on retina.
- **Hierarchy:** clear hero value prop, obvious primary CTA per page, scannable sections. Kill lorem/placeholder sections or replace with real, honest content.
- **Motion:** subtle, `prefers-reduced-motion`-safe animations only; nothing that blocks paint or causes layout shift. No janky RAF/interval loops left running.
- **Responsive:** verify mobile, tablet, desktop for hero, nav, forms/WIZ, board, pricing. No overflow, no invisible required inputs, no split label/input pairs.
- **Accessibility:** color contrast AA, focus states, labels tied to inputs, keyboard nav through the WIZ, `alt` on images, semantic landmarks, visible focus ring, form errors announced.
- **Performance:** minimize render-blocking resources, defer non-critical JS, right-size images, measure LCP; hero should paint fast without a spinner.

Where feasible, drive a real browser (CDP) to screenshot before/after at desktop + mobile widths and confirm the change visually.

---

## 4. FORMS (P1 — the conversion core)

The WIZ (Typeform-style stepper) is the highest-signal surface: startup path + engineer path, with a required `90day-outcome` (high-signal for matching) and an explicit review step before submit.

- Confirm both paths (startup, engineer) step correctly, validate per step, and submit successfully (mock POST in tests).
- Required fields must be visible and enforced; error messaging is clear and inline.
- Engineer resume field must be visible and functional (past bug: invisible required input → unsubmittable form).
- The review step shows a truthful summary before submit; the submit branch is reachable and wired.
- Post-submit: honest confirmation copy — "hello@trydemigod.com will follow up" (no timeframe, no SLA, no name). Pending-services language where relevant.
- Anti-spam (Turnstile/honeypot) present and not breaking submit.
- Test with `node demigod-wiz-cdp-playtest.mjs --local` (injects disk foot, mocks POSTs). Beware known harness pitfalls: doc-order selectors can be shadowed by page `h3`; visibility counts can be doc-wide — fix the harness, don't trust false FAILs.

---

## 5. COPY (P1)

- Sweep every page + the custom code for banned copy: `48h`, SLA/turnaround promises, founder/personal names → replace with honest "pending" + `hello@trydemigod.com will follow up`.
- Tighten value prop and CTAs: specific, credible, no hype. Remove overclaims and fabricated social proof.
- Consistent voice across home / hire / engineers / pricing / legal / partnerships.
- Pricing copy honest (fee range consistent with strategy, e.g. talent-matching fee band) and free of pending-service overclaims.
- Legal pages present and coherent (privacy, terms) with correct contact email.

---

## 6. PAGES & NEW FEATURES (P1/P2)

- Audit each page in `demigod-pages` for purpose, completeness, and honesty. Ensure nav is consistent and deduped across pages.
- Consider (propose before building, keep honest + pending-aware):
  - A clear "How it works" for both sides (startup + engineer).
  - An honest live-board / roles section that renders real seeds only (labeled), degrading gracefully to a "pending — early access" state when `realRoles:0`.
  - Proof/receipts section that only shows real, labeled receipts (never fabricated).
  - FAQ addressing pricing, process, and pre-services status honestly.
  - Improved OG/meta/SEO per page (title, description, social card) — factual only.
- Any new feature must ship behind the same verify + honesty gates and must not add banned copy or fake data.

---

## 7. CODE QUALITY (P1)

- Keep `demigod-foot-core.js` cohesive: no dead code (dead WIZ/stepper has been ~30% of the file before), no duplicate handlers, single source for form send, consistent helpers (`esc`, `wizBuild`, `run`, `show`).
- Escape all dynamic HTML from JSON. No global leakage. Idempotent init (guard against double-boot).
- Head styles/scripts: valid, parseable, no dead render-blocking links, no display hacks.
- Keep `BOARD_CDN` in foot in sync with the board file's cdn id (past split-brain). Board writer path must respect the honesty gate — never mint `sample:false` rows on proposals.
- Leave clear version stamps (`__dgFootVer`) and update them on real changes.

---

## 8. TESTING (mandatory before ship)

Prove correctness; do not rely on grep gates alone.

- **Boot-smoke:** vm-shim parse/execute of `demigod-foot-core.js` — must pass.
- **verify:source / verify:all:** run and read output; ensure gates aren't stale (check the source JSON mtime vs foot-core mtime — a stale `DEMIGOD-VERIFY-SOURCE.json` reports false PASS/FAIL).
- **Board honesty gate:** seeds ≤3, realRoles=0 (until real), sample labeled, no banned slaDue mint. Re-run after any board touch.
- **WIZ playtest:** `demigod-wiz-cdp-playtest.mjs --local` both paths; fix harness false-negatives, confirm real submit reachability.
- **Copy scan:** grep all pages + custom code for `48h`, SLA words, and any name tokens — must be zero.
- **Live-vs-disk:** if preparing to ship, confirm the live artifact hash vs disk after CDN upload; beware truth.mjs regex matching the wrong page script (naive first-match) — verify the correct artifact.
- **Visual:** CDP screenshots desktop + mobile of home, WIZ (both paths, open + review + submit), board, pricing.

Report a test matrix: check, command, PASS/FAIL, evidence (hash/screenshot/output). No green claim without evidence.

---

## 9. SHIP (prepare only; respect freeze + human gate)

- If a freeze is active or the user has not authorized publish: STOP after producing a verified, screenshot-backed, diff-documented handoff. Do not publish.
- If authorized and unfrozen: prepare CDN upload of foot (and head if changed), paste custom code via clean CDP (single tab, no keyboard.type-into-CodeMirror mangling — use a paste that survives CodeMirror), stage the Publish, then AFTER the human publishes, poll live for the new hash and re-verify (curl live, confirm version stamp, WIZ live smoke, visual).
- Never claim "shipped/live" without a live-confirmed fetch showing the new version.

---

## 10. OUTPUT / HANDOFF FORMAT

At the end, produce:
1. **BASELINE** — what you found (version, drift, freeze, top defects).
2. **CHANGES** — every edit, file, anchor, before/after md5 or version, and why.
3. **TEST MATRIX** — checks, commands, PASS/FAIL, evidence.
4. **HONESTY LEDGER** — confirmation that banned copy = 0, board honest, services pending.
5. **SHIP STATE** — prepared / blocked-by-freeze / awaiting-human-publish, with exact next steps.
6. **REMAINING P0/P1/P2** — anything deferred, ranked.

Work autonomously through the plan, but STOP and surface immediately if: a freeze blocks ship, the foot file mutates under you (concurrent writer), a build fails to parse, or an honesty gate fails. Prefer honest "blocked/pending" over any fabricated success. Verify everything. Ship nothing unproven.

_(Note: `/tmp/dg-swarm/improve/claude-prompt.md` could not be written — both the Write tool and `mkdir` under `/tmp` were blocked by sandbox permissions, which only allow `/home/potter`. Full prompt printed above per the stdout fallback.)_


## Fable

# DEMIGOD.COM — MASTER IMPLEMENTATION PROMPT (v198 → v210)

**Role for the executor:** You are the implementing engineer (Grok/Cursor/Composer). Fable (design/product lead) authored this spec. Demigod is a Webflow-hosted talent-matching marketplace connecting SF/remote startups with vetted engineers. Current phase: **GTM + pre-services honesty**. Site is "mostly done" per Heavy authority — this is a *refinement and hardening* pass, not a redesign. Minimal-surface, high-craft changes only.

**Prime directive:** Do not ship anything that is not (a) verified green by all gates, (b) honest per the rules below, and (c) parse-safe via boot-smoke. Human clicks Publish in Webflow; you prepare CDN + custom-code pastes + diffs. Never claim "live" without a real fetch confirming the hash.

---

## 0. GROUND RULES (READ FIRST — NON-NEGOTIABLE)

### 0.1 Canonical files
- **Site JS:** edit **only** `demigod-foot-core.js` (the canonical foot custom-code, currently v198). Never edit the CDN-mirrored `.live-*.js` artifacts — those are outputs.
- **Head styles/scripts:** the head custom-code block (critical CSS + early unhide script + noscript). Keep the unhide script parse-safe (see history: a misplaced `}catch(e){}` once produced "Unexpected token catch" and blanked the site for days).
- **Pages/copy:** `demigod-pages` (page-level content), Designer static text for structural copy.
- **Board data:** `DEMIGOD-BOARD.json` (single source of truth — beware split-brain with a second board file; the tripwire must watch the same path the foot reads via `BOARD_CDN`).
- **Supporting orchestration:** `demigod-*.mjs` scripts only when NOT touching site JS.

### 0.2 Verify gate (run after EVERY edit, before ANY publish prep)
```
npm run demigod:verify:source        # source-anchor gates
npm run demigod:verify:all           # + smoke + honesty (preferred)
node <boot-smoke>                     # vm.Script parse + boot (ReferenceError catch)
npm run demigod:board-honesty        # board seed/receipt caps
node <loop-state check>              # loop-state sanity
```
A file that passes 49 grep gates but throws on boot is **broken** — grep gates historically missed dead `wizBuild`/`run`/`show` and JS syntax errors. **Always** `grep -n 'function wizBuild\|function run(\|function show('` and confirm each symbol referenced is defined, then run the vm boot-smoke, before trusting any build.

### 0.3 Honesty rules (live-copy law — enforce in code + runtime scrub)
- **No** "48h" / SLA / turnaround promises anywhere (static copy OR runtime). Runtime `scrubTimeClaims()` must catch any that slip into board JSON.
- **No** founder names on the live site. Use "hello@trydemigod.com will follow up".
- **Board:** ≤3 seed roles until real; `realRoles: 0`; receipts labeled `sample:true`; no fabricated testimonials/delivery counts. Honesty gate must FAIL the build if roles > 3 or any `sample:false` receipt exists without a real backing event.
- **Pre-services language:** Twilio/Stripe/SMS features use "pending" copy, never "live"/"instant".
- **proposeIntro / ingest must NOT mint** `sample:false` roles or receipts — any board write goes through the honesty gate, never a direct `saveBoard`/`appendPilot` bypass.
- **Game "Eat the Sounds" is archived** — do not touch unless the user literally says "reopen the game".

### 0.4 Publish protocol
1. Verify all gates green on disk.
2. `demigod:deploy:prep` → confirm CDN foot hash == disk `md5(demigod-foot-core.js)` (foot-cdn-publish first if catbox is stale/frozen).
3. Prepare head + foot paste blocks; stamp a `DG-PUB` marker + version.
4. Human pastes + Save + Publish in Webflow (staging → www).
5. **Poll live** (`curl`/WebFetch) until the new hash/`__dgFootVer` appears. Only then is it "live".
6. CDP screenshots: hero visibility, WIZ desktop + mobile, board render.
7. Re-run `verify:live`.

---

## 1. DESIGN SYSTEM (P1)

**Goal:** one coherent system, tokenized, light+dark safe, WCAG AA. Currently the "cooler UI system" (v197) — tighten it, don't reinvent.

### 1.1 Tokens (head critical CSS, `:root`)
Define/consolidate CSS custom properties — audit for one-off hex values scattered in foot/Designer and replace with tokens:
- **Color:** `--bg`, `--bg-elev`, `--surface`, `--border`, `--text`, `--text-muted`, `--accent` (single brand accent + `--accent-hover`, `--accent-contrast`), `--success`, `--warn`, `--danger`. Provide `@media (prefers-color-scheme: dark)` overrides. Every text/background pair must pass **4.5:1** (body) / **3:1** (large). Validate with a contrast check in `verify:live`.
- **Type scale:** `--fs-xs … --fs-3xl` on a 1.2–1.25 modular scale; `--lh-tight/-normal/-loose`; system + one display face max. No more than 2 font families.
- **Space scale:** `--sp-1 … --sp-12` (4px base). Replace ad-hoc margins.
- **Radius:** `--r-sm/-md/-lg/-full`. **Shadow:** `--shadow-1/-2/-3` (subtle, dark-mode-aware). **Motion:** `--ease`, `--dur-fast/-base/-slow`.

### 1.2 Motion & accessibility
- All animations wrapped in `@media (prefers-reduced-motion: no-preference)`. Reduced-motion users get instant states — no hero glow pulse, no scroll reveals. (History: unbounded animations caused FOUC/flash.)
- Focus-visible rings on every interactive element (`:focus-visible` outline using `--accent`, 2px, offset 2px). Never remove focus outlines without a replacement.
- Min tap target 44×44px on mobile.

### 1.3 Component primitives (foot-rendered + Designer)
Buttons (primary/secondary/ghost, loading + disabled states), inputs/selects/textarea (label + hint + error), badges/pills (role tags), cards (role card, testimonial card — testimonials hidden until real), nav, modal/dialog (WIZ container), toast/inline-alert. Each needs hover/active/focus/disabled/error visual states. **Acceptance:** no interactive element lacks a focus + hover + disabled style.

---

## 2. UI/UX (P1)

### 2.1 Hero
- Ensure `w-mod-ix3` / unhide gate reliably reveals hero (root cause of past blank-site was the unhide script never running). Keep `forceMainVisible()` in foot as a belt-and-suspenders fallback with a RAF + MutationObserver + short interval + noscript path.
- Single clear value prop headline (talent matching), one primary CTA ("Find talent" / startup path) and one secondary ("Get matched" / engineer path). **Remove duplicate CTAs** (history: dup "FIND TALENT" nav + dup CTAs). Grep for duplicate button labels and dedupe.
- Hero glow (v198) must respect reduced-motion and never cause layout shift (CLS ~0).

### 2.2 Navigation
- Single nav, no duplicate links, no dead OAuth buttons (a dead OAuth button lived at foot `:~889` + a Supabase UMD in head — **strip both** if still present). Mobile hamburger with proper `aria-expanded`, focus trap when open, ESC to close.
- Sticky header must not overlap focused inputs on mobile.

### 2.3 Board / proof section
- `renderBoard()` must have a valid anchor (history: `trust()` targeted a removed `/PRICING/` anchor → board never rendered → proof pipeline invisible). Confirm the anchor element exists in Designer markup; add a resilient selector + no-op-safe guard that logs (dev only) if the anchor is missing.
- Escape all board JSON before `innerHTML` (`esc()` helper) — board content is data, treat as untrusted (XSS hardening). No raw `innerHTML = boardJson`.
- Empty/loading/error states for the board fetch (skeleton, not spinner-forever). If board fetch fails, show seed roles, never a blank or infinite spinner.

### 2.4 Performance
- No render-blocking third-party CSS (history: a catbox `m2f8rp.css` render-blocked → spinner). Inline critical CSS in head; defer non-critical.
- Target: LCP < 2.5s, CLS < 0.1, no long tasks > 200ms on load. Preload the display font; `font-display: swap`.

---

## 3. FORMS / WIZ (P0 — highest product value)

**Current:** Typeform-style stepper, two flows (startup + engineer), with a required **90day-outcome** step (high-signal for matching) + explicit **review** step before submit. Test: `node demigod-wiz-cdp-playtest.mjs --local`.

### 3.1 Known failure modes to fix / guard (all historically real)
- **`wizBuild` must be defined and called.** Grep: `grep -n 'wizBuild' demigod-foot-core.js` — confirm one definition + the call site. A build where `wizBuild` is referenced but undefined = boot ReferenceError = all site JS dead. Add a source gate: every wiz function called is defined.
- **`__submit__` branch must be reachable** — the final review step's submit must actually POST/advance. History: unreachable submit branch = wizard never submits.
- **Selector safety:** attribute selectors with numeric-leading values must be quoted: `[name="90day-outcome"]` (unquoted `[name=90day-outcome]` throws and half-patches the startup form → all fields visible / stepper gone). Grep for unquoted numeric-leading attribute selectors.
- **enhanceWIZ must not hide the whole `<form>`** via a `parentElement` fallback (history: caused `vis=0` — entire form hidden). Scope hide/show to step containers only.
- **Stepper integrity:** exactly one step visible at a time; Next disabled until required fields valid; Back preserves entered data; progress indicator accurate. **Live smoke must assert only the current step's fields are visible** (history v197 break: all 7 fields visible, stepper gone).

### 3.2 UX requirements
- Inline validation on blur + on Next; clear error messages tied to inputs via `aria-describedby`.
- Required fields: startup (company, role, stack-needs, **90day-outcome**, email) / engineer (name, stack, resume, **90day-outcome**, email). Resume field must be **visible** and its required-ness must not make the form unsubmittable (history: invisible required resume input).
- Review step: read-only summary of all answers + Edit links back to each step, then Submit.
- Submit states: loading spinner on button, success confirmation ("hello@trydemigod.com will follow up" — **no** 48h), error with retry. On success, ingest goes through the honesty-gated path (no direct board mint).
- Keyboard: Enter advances (except in textarea), ESC does not lose data, focus moves to first field / first error of each step.
- Mobile: full-width fields, no zoom-on-focus (`font-size ≥ 16px` on inputs), sticky Next button above keyboard.

### 3.3 WIZ acceptance criteria
- `node demigod-wiz-cdp-playtest.mjs --local` → **pass:true** on both flows, desktop + mobile.
- Playtest harness itself must use current selectors — scope to `.dg-wiz` container (not doc-wide `h3`), count visibility within the modal only (history: harness false-negatives from doc-order `.dg-wiz-q, h3` shadowed by page `h3` + doc-wide vis count).
- One and only one step visible; submit reaches confirmation; no console errors; no `ReferenceError`.

---

## 4. COPY (ALL SURFACES) (P1)

**Voice:** direct, credible, founder-to-founder. No hype, no fake urgency, no unverifiable claims.

### 4.1 Global scrubs (must be zero on live)
- Remove every "48h", "24h", SLA, "instant", "guaranteed", turnaround-time promise. Runtime `scrubTimeClaims()` as backstop for board JSON.
- Remove founder names → "hello@trydemigod.com will follow up".
- Remove "LIVE ROLES HIRING NOW" / any overclaim of live activity while `realRoles:0`. Use honest framing: "Early roles" / "Seed roles" clearly labeled sample where applicable.
- Kill all lorem ipsum (history: lorem "Insights" section shipped live; lorem scrub once blanked a page — scrub must replace, not empty).
- Dedupe: copyright line, tagline, email, nav labels (history: dup copyright/tag/email).

### 4.2 Page-by-page copy pass (in `demigod-pages` / Designer)
- **Home/hero:** value prop, how-it-works (3 steps), for-startups + for-engineers split, honest proof/board, CTA.
- **How it works:** matching process, vetting, what "pending services" means honestly.
- **Pricing:** honest fee framing (10–25% range per Heavy research) with pre-services "pending" caveat; dedupe pricing lines (history: dup pricing lines).
- **For engineers:** what to expect, resume/stack, privacy bullets on WIZ welcome.
- **Legal:** privacy + terms (see legal pages below).
- **Contact/footer:** hello@trydemigod.com only.

### 4.3 Microcopy
Button labels, form hints, error messages, empty states, success confirmations — all consistent, all honest. Acceptance: `verify:live` copy check finds zero banned phrases.

---

## 5. NEW PAGES / FEATURES (P2 — only after P0/P1 green)

- **Legal pages** (privacy policy, terms) — honest, pre-services caveats, no founder names. Files under `demigod-pages` / Designer routes. (Multiple `demigod-legal-*.mjs` passes exist — consolidate, don't multiply.)
- **Partnerships page** — honest, "pending" where services aren't live (several `demigod-partnerships-*.mjs` scripts exist; reconcile to one page pass).
- **Engineer prefill via OAuth** — **deferred** until trigger met (≥10 real WIZ submissions/week). If built: minimal client-side (Clerk/Supabase script-tag, no server), LinkedIn (engineer prefill) + Google, "pending" copy, added to canonical head/foot. Do **not** ship a dead OAuth button before the flow works.
- **Outreach/proof assets** — honest proof pack only from real receipts; no fabricated delivery counts.

Do not add features that create honesty liabilities (fake testimonials, live-service claims, delivery counters) while `realRoles:0`.

---

## 6. BUGFIXES (prioritized)

### P0 (block ship)
1. **WIZ stepper live integrity** — verify not-frozen, stepper renders, one step visible, submit reaches confirmation (guard against v197-class regression).
2. **wizBuild / run / show defined + called** — no boot ReferenceError; boot-smoke pass.
3. **Head unhide parse-safe** — vm.Script parse gate; hero reveals; `forceMainVisible` fallback intact.
4. **Board honesty** — ≤3 roles, realRoles:0, no `sample:false` mint via proposeIntro/ingest; honesty gate wired into `verify:all`.
5. **Numeric-attribute selectors quoted** — `[name="90day-outcome"]` etc.

### P1
6. Board render anchor exists + `esc()` XSS escaping.
7. Dedupe nav/CTA/copyright/email/pricing.
8. Strip dead OAuth button + orphan Supabase UMD (if present).
9. Runtime `scrubTimeClaims` catches 48h/SLA in board JSON.
10. Split-brain board: single `DEMIGOD-BOARD.json`; tripwire + `BOARD_CDN` point to same file.
11. Reduced-motion + focus-visible everywhere; contrast AA.

### P2
12. pilot-tracker minting `slaDue` on every log (bypasses honesty) — gate or remove; honor `--dry-run` properly.
13. verify gates hardening: no tautological/hardcoded-true checks; grep gates supplemented by smoke; no stale-JSON reads (check mtime vs foot-core before treating a gate/brief P0 as real).
14. truth.mjs cdnId regex false-drift (naive regex matches /hire page script first) — precise selector + manifest sha256 fix.

---

## 7. CODE ARCHITECTURE (`demigod-foot-core.js`)

- **Single IIFE**, no leaked globals except `window.__dgFootVer` (bump to match version). Balanced braces — the IIFE must close correctly at EOF (history: extra `}` closed IIFE early → parse break; and missing `})();` at EOF).
- **Module sections, commented:** tokens/util (`esc`, `qs`, `scrubTimeClaims`), unhide/`forceMainVisible`, nav, board fetch+render, WIZ (`wizVal`, `wizWrap`, `wizCss`, `wizBuild`, step engine, validation, submit→ingest), analytics stub. Each referenced symbol defined before use or hoisted function decl.
- **No dead code** — if `wizBuild`/`run`/`show` unused, either wire or remove; ~30% dead foot has happened.
- **Defensive fetch** — board/ingest wrapped in try/catch with graceful fallback to seeds; never throw uncaught on boot.
- **Version discipline:** bump `v198 → v199…` on every shipped change; stamp `DG-PUB` marker; keep `md5` reproducible for CDN==disk verification.
- Head: critical CSS first, then early unhide script (RAF + MO + interval + listeners + noscript), parse-verified, no third-party render-blocking CSS.

---

## 8. TESTING

1. **Boot-smoke** (vm.Script): parse + run foot in a jsdom/vm shim; assert no SyntaxError/ReferenceError; assert `wizBuild` defined; `__dgFootVer` correct. **Mandatory before every publish.**
2. **Source-anchor gates** (`verify:source`): assert key symbols/anchors present — but never rely on grep alone.
3. **Board honesty gate** (`verify:all`): roles ≤3, realRoles:0, no unbacked `sample:false`, no banned time-copy.
4. **WIZ CDP playtest** (`demigod-wiz-cdp-playtest.mjs --local`): both flows, desktop + mobile, one-step-visible, submit→confirm, zero console errors. Fix harness selectors to scope to `.dg-wiz`.
5. **verify:live** (post-publish, real fetch): hash == disk, banned-copy = 0, lorem = 0, contrast AA sample, WIZ present, hero visible.
6. **Mutation test** (regression trust): break `wizBuild`/`run`/version/90day on a copy → assert source+smoke gates FAIL → byte-identical restore. Proves gates aren't tautological.
7. **CDP screenshots**: hero, WIZ desktop, WIZ mobile, board render — visually confirm.

**Acceptance to ship:** 1–4 green on disk; 7 visually clean; then human publish; then 5 green on live.

---

## 9. SHIP CHECKLIST

- [ ] All edits in `demigod-foot-core.js` (site) only; version bumped; braces balanced.
- [ ] `verify:source` + `verify:all` + board-honesty + loop-state green.
- [ ] Boot-smoke pass (no Syntax/ReferenceError).
- [ ] WIZ playtest pass:true (both flows, mobile+desktop).
- [ ] Grep: no unquoted numeric attr selectors, no dup CTA/nav/copyright, no 48h/SLA/founder-name/lorem, no dead OAuth button.
- [ ] Board: ≤3 seeds, realRoles:0, single file, tripwire==BOARD_CDN.
- [ ] `deploy:prep` → CDN foot hash == disk md5 (foot-cdn-publish if stale).
- [ ] Head + foot paste blocks prepared, DG-PUB stamped.
- [ ] **Human** pastes + Save + Publish (staging → www).
- [ ] Poll live until new hash/`__dgFootVer` appears — only then "live".
- [ ] `verify:live` green; CDP hero/WIZ/board screenshots clean.
- [ ] Commit with honest message; update `DEMIGOD-COMPRESSED-STATE.md` + loop-state.

---

## 10. PRIORITY SUMMARY

| Pri | Item | File |
|-----|------|------|
| P0 | WIZ stepper live integrity + submit reachable | `demigod-foot-core.js` |
| P0 | wizBuild/run/show defined+called; boot-smoke | `demigod-foot-core.js` |
| P0 | Head unhide parse-safe + hero reveal | head custom-code |
| P0 | Board honesty gate (≤3, realRoles:0, no mint) | `DEMIGOD-BOARD.json`, verify gates |
| P0 | Quote numeric attr selectors | `demigod-foot-core.js` |
| P1 | Design tokens + AA contrast + reduced-motion + focus | head CSS |
| P1 | Board anchor + esc() XSS | `demigod-foot-core.js` |
| P1 | Copy scrub (48h/founder/lorem/dupes) | `demigod-pages`, Designer |
| P1 | Strip dead OAuth + Supabase UMD | foot + head |
| P2 | Legal + partnerships pages (honest) | `demigod-pages` |
| P2 | OAuth prefill (deferred to ≥10 real subs/wk) | head/foot |
| P2 | Gate hardening (mtime, no tautologies, truth regex) | `demigod-*.mjs` |

**Stop condition:** all P0 + P1 green on two consecutive clean verify runs, live-confirmed by real fetch, WIZ playtest pass, screenshots clean. Then resume GTM (warm SF founder DMs, pilot logging). Minimal further site changes.

**Remember:** verify green + honest + parse-safe + live-confirmed, or it did not ship.


---

## ROUND-2 ADDENDUM — Tools-aware website work (history-informed)

After reading `docs/exchange/DEMIGOD-FULL-HISTORY-AND-TOOL-ATLAS.md` and `prompts/demigod/MASTER-OPS-TOOLS-PROMPT.md`:

1. Prefer implementing website changes with **tooling hooks**: emit `demigod:analytics` events; keep usertest selectors stable; keep foot version stamps consistent for agent-smoke.
2. When fixing WIZ, add/extend `demigod-wiz-cdp-playtest.mjs` and `demigod-user-test.mjs` assertions — not only visual polish.
3. When shipping design, always run `bin/dg ship-prep` then freeze-aware CDN+CM6; write ship receipt.
4. Product pages: improve `demigod-pages/*` + ensure HTML MIME strategy; do not rely on raw catbox navigation.
5. Coordinate with ops: sample board labeling must stay machine-testable for honesty gate.
6. Do not invent parallel foot files; do not scatter COPY into dashboard.

This addendum is mandatory for any agent executing the master website prompt after 2026-07-14 history pass.
