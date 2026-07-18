/*dg-foot-v682-core*/
/**
 * v648 a11y: focus now enters the WIZ dialog on open. show()'s focus query matched the
 *   first input in DOM order (contact-email, on a later step, HIDDEN on welcome) and
 *   .focus() on a non-visible element is a silent no-op — focus stayed on BODY, so
 *   screen-reader users never heard the dialog. Now filters for visibility.
 * v567 positioning: Demigod tech + humans in the loop (not hand-matched)
 * v566 hero H1 scrub-safe + skip honesty rewrite on .hero-title/h1
 * v565 Claude P0: leaner footer tiers, hide path-pills mobile, honest empty-roles line, forceMainVisible skip data-dg-hidden
 * v564 simplify redesign: fewer links, plain copy, calm UI, process+pricing only
 * v563 blog imageAlt a11y + both-approve/human-review body SoR sync
 * v562 sample-tag inline parity with brandAssets (letter-spacing + uppercase)
 * v537 reduced-motion no role/step card lift
 * v536 role/step focus-within + link focus-visible
 * v535 #dg-legal-links focus-visible
 * v534 pricing CTA 48px tap + focus-visible
 * v533 pricing amount contrast + mobile 1-col process/roles
 * v532 WIZ dark inputs + role/step hover + gold scrollbar
 * v531 footer mailto hover underline (redesign contact)
 * v530 #dg-legal-links flex-wrap + gap for redesign footer
 * v529 prefers-reduced-motion: no CTA hover transform
 * v660 restore scroll-margin-top on skip-link targets (dropped by dark-theme redesign; sticky .nav_container obscured #main after skip/anchor)
 * v528 scroll-margin for skip-link targets under sticky chrome
 * v527 path-pills touch target + focus-visible (redesign a11y)
 * v526 forceMainVisible: steps/roles/pricing grids use display:grid (not flex)
 * v525 redesign: unhide sections w/o :has + badge polish
 * v524 redesign: restore process/pricing/roles + premium hero/CTA (Claude+swarm)
 * v523 mark html dg-*-honest classes after scrub (head FOUC CSS keys)
 * v522 skipLink aria-label + "Skip to main content" (parity with head early skip)
 * v521 skipLink scrollIntoView + reduced-motion (a11y after early skip bridge)
 * v520 skipLink removes #dg-skip-early (head a11y bridge)
 * v519 step-desc: rewrite "3-5 highly aligned, pre-vetted candidates" (live residual after title-only fix)
 * v518 Notes human-review: no fixed candidate-count promise (SERP honesty)
 * v517 pricing-card honesty: pre-vetted / dedicated partner / 90d replacement → pending-honest copy
 * v516 modal-title/subtitle/intro honesty (HIRE SF STARTUP TALENT → I'm hiring; no volume intros)
 * v515 step-card: rewrite step-desc under "Meet Your 3-5" (static volume still on canvas)
 * v514 WIZ progress single text node "N of T" (firecrawl still glued Progress1/of 7)
 * v513 skipLink focuses #dg-page when mini-page open (a11y)
 * v512 scrubContactEmail: also rewrite application/ld+json hello@ leftovers
 * v511 scrubContactEmail: attrs+data-props hello@→potter@ (static Designer leftovers)
 * v510 closed WIZ modals set inert+aria-hidden (crawl/SEO: reduce form text when closed)
 * v509 WIZ progress: '1 of 7' spacing (firecrawl read '1/of 7' — slash glued to of)
 * v508 footer nav: /contact had zero inbound links (DG_PAGES entry + route worked, unreachable from UI) — same orphan-page class as v504/v505/v507 fees/security/sample/pilot; added to #dg-legal-links
 * v507 footer nav: /pilot had zero inbound links (DG_PAGES entry + route worked, unreachable from UI) — same orphan-page class as v504/v505 fees/security/sample; added to #dg-legal-links
 * v506 offerAbandon a11y: aria-modal + Escape close + focus #dg-abandon-email
 * v505 DG_PAGES.sample: footer-lite's /sample redirect (?p=sample) had no matching page entry — same dead blank-page bug as v504's /fees /security, now covered
 * v504 routePages: alias fees→pricing, security→legal (map already declared intent, id-from-query bypassed it — /fees /security landed on blank page)
 * v501 Notes "Full note" toggle: ▸/▾ marker matching #dg-faq disclosure pattern (display:flex had dropped native marker)
 * v500 contact page desc: real sentence (was bare email, thin meta description)
 * v498 Notes deep-link: per-note og/twitter title+description sync (was title-only)
 * v495 public contact: potter@trydemigod.com only (no hello@ — mailbox not set up)
 * v494 engineer welcome + footerTag first-year cash honesty
 * v493 TreeWalker scrub: remove static replacement-guarantee + 3-5 volume claims
 * v491 Notes: (superseded) ship-when-ready was draft — removed in later ver
 * v490 feeNote+pricingNote: first-year cash honesty
 * demigod-foot-core.js — ONLY site behavior SoR (Webflow foot CDN).
 * v492 Notes: drop draft ship-when-ready card (published:false in blog SoR)
 * v489 a11y: aria-label on placeholder-only abandon-modal email + WIZ follow-up salary/start/why inputs
 * v488 how page desc: brief→review→approve
 * v487 faq+talent page desc polish
 * v486 status+partners page desc polish
 * v485 hire+pricing page desc polish
 * v484 pilot+method page desc polish
 * v483 compare+legal page desc polish
 * v482 about desc: both approve + 10% on hire
 * v481 FAQ How long: no SLA + hello@ follow-up
 * v480 FAQ Notes: shareable /?p=blog#note-{slug} deep-link tip
 * v479 Mini-pages set canonical + og:url/twitter:url to /?p={id}, restored on close
 * v478 Notes deep-link scroll respects prefers-reduced-motion; Status lists Notes deep-links
 * v477 Notes deep-link: hashchange re-focuses #note-{slug} while Notes is open
 * v476 Notes details summary labels include post title (a11y)
 * v475 Notes deep-link: document.title from note h3 when #note-{slug} opens
 * v474 Notes deep-link: #note-{slug} opens Full note + scroll; pushState keeps hash
 * v473 Notes cards: id=note-{slug} anchors for deep links
 * Sections: COPY · WIZ_CFG · WIZ_Q · WIZ runtime · board · forms/CTA · boot · honesty
 * Map: docs/exchange/DEMIGOD-FOOT-CORE-FUNCTION-MAP.md
 * Ship: freeze off → foot-cdn-publish → cm6-paste → live-doctor --require-match
 * NEVER: MutationObserver writing styles on every attr (v187 freeze); raw catbox .html nav
 * v470 Notes cards: Full note <details> bodies from demigod-blog-posts.json (ship UX)
 * v467 Notes cards: imageAlt + summary text aligned to demigod-blog-posts.json (a11y)
 * v455 Notes grid now 5 cards (2 drafts published: images+bodies verified live)
 * v452 Notes cards use body lines from demigod-blog-posts.json (still 3 published)
 * v454 compare page: clearer boards/agency/Demigod contrast without SLA promises
 * v453 status page shows live foot runtime version
 * v451 richer Notes card summaries from demigod-blog-posts.json (still 3 published)
 * v450 surface existing image-backed Notes posts in DG_PAGES.blog
 * v449 scrub FIND/HIRE TALENT for high-growth/venture-backed teams and startups through the canonical hiring path
 * v447 tighten founder/talent leads into decision, evidence, and privacy beats
 * v446 make founder/talent leads state the decision in plain language before the supporting facts
 * v445 scrub per-hire 90-day replacement inclusions from canvas copy and accessibility labels
 * v444 tighten founder/talent page leads into a parallel facts → decision → consent sequence
 * v443 make founder/talent leads state the decision, evidence, and privacy boundary without repeating the cards
 * v441 scrub FIND/HIRE TALENT FOR FAST-GROWING TEAMS/STARTUPS/COMPANIES canvas labels through the canonical hiring path
 * v440 scrub FIND/HIRE TALENT FOR SCALING TEAMS/STARTUPS/COMPANIES canvas labels through the canonical hiring path
 * v439 scrub FIND/HIRE TALENT FOR SF STARTUPS/FOUNDERS canvas labels through the canonical hiring path
 * v438 scrub match-you-with 3-5 candidate promises from canvas copy and accessibility labels
 * v437 make founder/talent match notes name the evidence, constraint, and decision each side gets before identity moves
 * v436 scrub source/recommend/submit 3-5 candidate promises from canvas copy and accessibility labels
 * v435 make founder/talent decision copy name the proof and tradeoff each side reviews before identity moves
 * v442 scrub stale hiring promises from unclassed and SVG leaf text without flattening markup
 * v434 connect WIZ progress chrome to the active question with a responsive gold guide rail
 * v433 scrub legacy “find/hire talent for your next role” variants into the single honest hiring CTA
 * v432 make founder/talent openings lead with the decision, evidence, and identity boundary in three short beats
 * v430 scrub FIND/HIRE TALENT FOR IMMEDIATE NEEDS/HIRES/ROLES canvas labels through the canonical hiring path
 * v429 keep WIZ fields, navigation, and mobile actions at the 48px control floor
 * v428 make founder/talent openings answer the first pre-intro decision in plain language
 * v426 scrub send/deliver/present 3-5 candidate promises from canvas copy and metadata
 * v423 scrub first-90-day replacement promises phrased as underperformance/falling short
 * v422 scrub first-90-day replacement promises phrased as fit/performance failures
 * v421 scrub 90-day replacement-at-our-expense/on-us promises from canvas copy and metadata
 * v424 scrub FIND/HIRE TALENT FOR URGENT/CRITICAL ROLES canvas labels through the canonical hiring path
 * v420 scrub FIND/HIRE TALENT FOR OPEN ROLES canvas labels through the canonical hiring path
 * v431 scrub reversed “guaranteed for 90 days” canvas claims
 * v419 give WIZ progress fractions distinct current, separator, and total hierarchy
 * v417 scrub FIND/HIRE TALENT YOUR TEAM/STARTUP/COMPANY DESERVES canvas labels
 * v414 restore focus after closing product-page dialogs
 * v412 scrub standalone 90-day risk-free hire/hiring guarantee euphemisms
 * v410 scrub FIND/HIRE TALENT YOUR TEAM NEEDS canvas labels through the canonical hiring path
 * v408 scrub slash-separated count suffixes in split Webflow shortlist/slate copy
 * v405 tighten founder/talent leads around the decision, evidence, and privacy boundary
 * v404 clarify the WIZ progress fraction with distinct separator and total styles
 * v403 preserve the approved hello@ follow-up copy during timing-claim scrubs
 * v402 scrub urgency-suffixed FIND/HIRE TALENT canvas labels through the canonical hiring path
 * v396 make founder/talent leads name the exact private decision in shorter sentences
 * v395 tighten founder/talent leads into parallel evidence, decision, and consent copy
 * v393 scrub replacement peace-of-mind/safeguard euphemisms from canvas copy and metadata
 * v394 normalize Webflow zero-width/NBSP/dash text before static-label policy scrubs
 * v397 make founder/talent decision pages lead with the private match note and one clear decision
 * v399 tighten founder/talent match notes around the evidence each side decides on
 * v401 tighten founders/talent page leads around evidence, work, and mutual approval
 * v400 scrub visible replacement-service and backed-replacement guarantee copy
 * v398 scrub 90-day replacement-service guarantee euphemisms from canvas copy and metadata
 * v392 scrub replacement-insurance guarantee euphemisms from canvas copy and metadata
 * v391 scrub 90-day replacement-support guarantee euphemisms from canvas copy and metadata
 * v390 scrub replacement safety-net/backup guarantee euphemisms from canvas copy and metadata
 * v389 scrub replacement-benefit/perk guarantee euphemisms from canvas copy and metadata
 * v388 scrub replacement-or-money-back guarantee euphemisms from canvas copy and metadata
 * v387 make founder/talent openings state the decision before its supporting evidence
 * v347 align active WIZ, confirmation, and pricing contact copy on potter@trydemigod.com
 * v382 make WIZ progress zero and complete states visually accurate
 * v383 make founder/talent page leads answer what each side sees and decides before an intro
 * v385 tighten founder/talent leads to one evidence, decision, and privacy sentence each
 * v386 scrub outcome-claim FIND/HIRE TALENT canvas CTAs through the canonical hiring path
 * v349 scrub replacement-or-fee-back guarantee promises from canvas copy and metadata
 * v351 make founder/talent decision cards state the anonymous packet and separate approval choice at a glance
 * v352 scrub legacy FIND/HIRE TALENT labels aimed at growing and early-stage teams
 * v354 make founder/talent decision pages name the useful first question before an intro
 * v355 make founder/talent decision cards show decision-grade evidence instead of generic labels
 * v357 make founder/talent decision cards name the exact evidence and tradeoffs reviewed before an intro
 * v358 make founder/talent decision pages lead with the concrete pre-intro packet each side receives
 * v366 add explicit, revocable consent before WIZ drafts use localStorage
 * v367 scrub arrow-suffixed FIND/HIRE TALENT canvas CTAs through the canonical hiring-action path
 * v368 make founder/talent pages distinguish the private packet from the decision it supports
 * v369 scrub combined FIND & HIRE TALENT canvas labels through the canonical hiring path
 * v370 scrub FIND/HIRE TALENT TODAY canvas CTAs through the canonical hiring path
 * v371 scrub quality-hype FIND/HIRE TALENT canvas CTAs through the canonical hiring path
 * v373 make the founders/talent pages describe the private pre-intro decision in plain language
 * v375 scrub stand-behind/backed-by 90-day replacement promises from canvas copy
 * v376 make founder/talent decision pages separate the private facts from the decision they support
 * v377 make founder/talent openings name the exact anonymous decision packet
 * v378 make founder/talent openings state the decision first and remove packet jargon
 * v379 expose the founder and talent decision pages in the canonical footer navigation
 * v380 tighten founder/talent openings into parallel evidence → decision → mutual-intro copy
 * v381 replace vague founder/talent open questions with the specific decision risk each side should test
 * v374 reveal the page only after the canonical relabel and honesty scrub completes
 * v372 keep the WIZ progress fraction legible in Windows forced-colors mode
 * v365 scrub 90-day replacement plan/program guarantee euphemisms from canvas copy
 * v360 polish WIZ progress chrome for clearer hierarchy and mobile scanning
 * v361 scrub FIND/HIRE TALENT for your next hire canvas labels
 * v362 restore the canonical public hello@ contact across WIZ, fallback, footer, and product-page copy
 * v363 scrub "get 3–5" volume claims and candidate-specific 90-day replacement guarantees
 * v364 tighten founder and talent pages into parallel, decision-first copy
 * v359 scrub growth-oriented FIND/HIRE TALENT canvas labels
 * v348 make founder/talent decision cards lead with the exact evidence each side reviews
 * v316 potter@ email · drop mutual-yes / not-a-job-board phrasing · FAQ expand · Notes+Method pages · sleeker CTAs · scroll reveals
 * v317 tighten founder/talent decision-page copy around evidence, privacy, and mutual approval
 * v318 make the current WIZ step the visual anchor in the progress UI
 * v319 make founders/talent decision packets concrete before identity sharing
 * v320 make founder/talent page leads state the exact review packet and decision in fewer words
 * v321 keep primary CTAs and WIZ actions at 48px after compact-style overrides
 * v322 scrub minimum/at-least/as-many-as 3–5 candidate-count promises
 * v323 scrub choose/pick/interview/compare 3–5 candidate-count promises
 * v325 scrub replacement protection/coverage guarantee euphemisms
 * v326 keep every shared hero, nav, and mobile path CTA at the 48px tap-target floor
 * v327 replace founder/talent decision-page jargon with plain, parallel pre-intro copy
 * v328 scrub pool/choice/selection-of 3–5 candidate promises as one honest phrase
 * v329 make founder/talent inputs concrete with evidence and non-negotiables
 * v330 clarify WIZ progress with a labeled current/total status row
 * v331 scrub guaranteed/promised 3–5 candidate-count claims
 * v332 align modal fallback names with the locked hiring/talent paths
 * v333 make founder and talent decision leads name the anonymous packet and next choice
 * v334 expose the explicit data-dg-ready contract alongside the legacy ready class
 * v335 scrub 3–5 applicant/resume/CV volume promises from canvas copy and metadata
 * v336 scrub receive/review/see-a-shortlist 3–5 volume promises from canvas copy and metadata
 * v337 make founders/talent pages show the exact evidence and decision in a shorter parallel scan
 * v338 align How with the three-step product truth and expose FAQ disclosure focus
 * v339 scrub offered/included replacements tied to first-90-day departures
 * v340 make the visible WIZ N / total counter announce "N of total" accessibly
 * v341 scrub replacement-credit/refund promises tied to first-90-day departures
 * v342 scrub placement-fee waiver/refund promises tied to first-90-day departures
 * v343 apply fee-credit/refund and fee-waiver scrubs to visible canvas labels
 * v344 stabilize WIZ progress with a fixed-width numeric status capsule
 * v345 scrub 90-day fee carryover promises toward a replacement search
 * v346 keep WIZ validation errors described, styled, and cleanly reversible
* v200 dual-CTA · v201 FOUC/WIZ keyboard · v202 WIZ one-question ownership + honesty + mobile de-dupe
 * v205–v211 home-minimal CTAs · progress clamp · jsDelivr CDN · FAQ/proof strip removal · ship dogfood
 * v212 decision-home chips + path pills · WIZ welcome polish · richer /?p= pages · head chrome
 * v285 founders/talent pages clarify the both-approve handoff without timing or volume promises
 * v286 scrub role-category variants of legacy FIND TALENT / HIRE TALENT labels
 * v287 scrub company/startup suffix variants of legacy FIND TALENT / HIRE TALENT labels
 * v292 scrub pre-vetted 3-5 profile promises and replacements offered at no charge
 * v293 scrub SF-before-role variants of legacy FIND TALENT / HIRE TALENT labels
 * v295 make founders/talent page leads state the private decision packet plainly
 * v296 make founders/talent page leads answer the pre-intro decision at a glance
 * v297 make founders/talent leads state the packet, decision, and privacy boundary in parallel
 * v298 make founders/talent decision previews label the packet, decision, and privacy boundary at a glance
 * v299 scrub replacement promises phrased as having no additional fee
 * v300 expose founders/talent decision previews as ordered steps for assistive technology
 * v301 scrub interview-ready, role-ready, and decision-ready 3-5 volume promises
 * v312 scrub curated/hand-picked/matched/readiness-qualified 3-5 finalist promises
 * v313 scrub screened and offer-ready 3-5 candidate/finalist promises
 * v314 scrub need/role-suffixed FIND TALENT and HIRE TALENT canvas CTAs
 * v315 scrub slate/group-of 3–5 candidate promises from canvas and metadata
 * v302 keep header hero motion disabled when reduced motion is requested
 * v303 make founder and talent decision-page leads concrete and plain-language
 * v305 scrub continue-search promises tied to first-90-day exits and no additional fee
 * v306 restore Compare to the decision-screen path navigation
 * v309 make founder and talent fit notes state the concrete question each side can test
 * v310 scrub next-search-free promises tied to first-90-day departures
 * v311 tighten founders/talent page leads around the decision each side makes
 * v308 extend forced-colors focus visibility to both classified nav controls
 * v289 make founder/talent decision previews concrete and remove repeated consent copy
 * v290 clarify the anonymous decision packet on founder and talent pages
 * v291 scrub redo/resume-search promises tied to first-90-day hire exits
 * v213 never-stop loop · founders/candidates pages · banned-copy scrub · hero/WIZ copy (Codex P0s)
 * v218 scrub stale hiring/volume/guarantee copy from visible labels and accessibility attributes
 * v219 extend static scrub to form/image metadata and reversed guarantee phrasing
 * v220 synchronize accessible WIZ progress semantics + 48px controls
 * v221 scrub split/variant static volume promises and replacement guarantees
 * v222 scrub promise-style free/90-day replacement copy missed by noun-only variants
 * v224 extend honesty scrub to page metadata and JSON-LD string values
 * v225 sharpen founders/candidates pages around outcome, privacy, and mutual consent
 * v226 scrub hand-picked/best-fit volume promises and conversational free-replacement guarantees
 * v227 make founders/talent paths concrete with useful brief/profile examples and next-step clarity
 * v228 clarify what each side sees before both sides approve and make profile evidence more concrete
 * v229 make founders/talent consent sequence explicit before any identifying details move
 * v231 tighten founders/talent copy around decision-ready context and consent
 * v232 make founders/talent pages state the pre-intro decision in plain language
 * v233 scrub money-back/risk-free guarantee and replacement-coverage variants
 * v234 scrub determiner CTAs, bounded 3–5 claims, and departure-triggered replacements
 * v235 scrub reversed free-replacement claims and find/provide-another variants
 * v236 scrub "on us" and hire-backed 90-day guarantee variants
 * v237 scrub next-hire free/covered/on-us guarantee variants
 * v238 make founders/talent pages explicit about proposal context and private passes
 * v239 remove the stale hardcoded runtime version from the public Status page
 * v240 tighten founders/talent pages around the decision, evidence, privacy, and fee
 * v241 make founders/talent proposal decisions shorter and easier to scan
 * v242 scrub possessive shortlist counts and noun-only free-replacement promises
 * v243 tighten founders/talent pages into a scannable pre-intro decision sequence
 * v244 scrub shortlist/set/batch-of volume promises that put the count after the noun
 * v245 scrub every-hire/stand-behind 90-day guarantee variants
 * v246 make founders/talent pages scan-first with parallel pre-intro decisions
 * v247 scrub count-after-noun shortlist promises from canvas copy and metadata
 * v248 polish WIZ count chip and progress track while preserving reduced motion
 * v249 clarify no-fit behavior on founders/talent pages without volume promises
 * v250 require explicit consent before persisting or restoring WIZ drafts
 * v251 make founders/talent pages parallel, plain-language pre-intro decision guides
 * v252 name the exact pre-intro decision packet for founders and talent
 * v253 scrub slate-style 3–5 candidate volume promises from static copy
 * v254 make founders/talent pages answer the pre-intro decision at a glance
 * v255 make founders/talent decision packets concrete and parallel
 * v256 make founders/talent pages answer share, review, and intro consent in parallel
 * v257 make founders/talent consent boundaries explicit in scan-first section headings
 * v258 scrub finalist-count promises and 90-day hiring/talent guarantee variants
 * v259 add parallel pre-intro decision previews to founders/talent pages
 * v260 make the founders/talent previews answer what is shared before names move
 * v281 scrub adjective/team variants of legacy FIND TALENT and HIRE TALENT CTAs
 * v282 align copy-policy/head prepaint checks with runtime volume and replacement scrubs
 * v283 scrub role-noun variants of legacy 3–5 volume promises
 * v284 scrub replacement-included guarantee euphemisms from static copy and metadata
 * v261 name the anonymous decision packet in both founders/talent previews
 * v262 lead founders/talent pages with the exact private decision each side makes before an intro
 * v263 scrub spaced/slashed shortlist counts, selected-profile variants, and guaranteed replacement timing
 * v265 clarify the anonymous founder/talent decision packets before both-approve identity disclosure
 * v266 scrub replacement warranty/assurance variants from canvas copy and metadata
 * v267 tighten founders/talent pages around the exact pre-intro decision and privacy boundary
 * v268 scrub candidate-count bundles and no-charge replacement-period variants
 * v269 make the founders/talent pre-intro choice explicit and parallel
 * v270 scrub replacement commitment/pledge variants from canvas copy and metadata
 * v271 scrub replacement-protection variants from canvas copy and metadata
 * v272 scrub conditional first-90-days replacement promises without guarantee/free wording
 * v273 unify WIZ count and progress track into a clearer, higher-contrast status panel
 * v274 give each WIZ flow an accurate accessible progress label
 * v275 scrub "should the hire leave" first-90-days replacement promises
 * v276 scrub complimentary replacement/search guarantee euphemisms
 * v277 keep WIZ progress visible in forced-colors mode; smoke now requires matching version markers
 * v278 make founders/talent pre-intro copy name the exact decision and consent boundary
 * v279 scrub no-cost search-restart guarantee euphemisms tied to first-90-day departures
 * v384 tighten founder/talent decision-page leads around evidence, outcome, and mutual approval
 * v406 scrub candidate-count promises when "guaranteed/promised" trails the role noun
 * v409 tighten founders/talent copy around the anonymous match note and approve-or-pass decision
 * v411 scrub stale hiring, volume, and guarantee copy in ARIA controls and disclosure labels
 * v280 apply the search-restart scrub to visible canvas leaves, not only metadata
 * Sections on disk: COPY · WIZ_* · WIZ runtime · BOARD · forms · nav/CTA · product pages · boot · honesty
 */
window.dgFootVersion = 'v682'; console.log('[demigod] foot v682-core loaded');
(function(){
var S='#startup-modal',J='#jobseeker-modal',OPEN=null,DIRTY=false;
/* Use product route (same-origin /?p=) — never raw catbox .html (text/plain MIME) */

var HOW_IT_WORKS='/?p=how';
/* Dual CTAs (competitor-proven): Underdog "I'm Hiring"/"I'm a Candidate"; Wellfound "Find your next hire"/"Find your next job"; Arc "Hire talent"/"Find jobs".
   Never use both "Hire talent" + "Find talent" — same meaning (company side). Pair = hiring vs job-seeking. */
/* ==== SECTION: COPY (runtime marketing strings) ==== */
var COPY={
heroSub:'Demigod tech ranks the fit. A human reviews every potential match. Both sides approve before an intro — without locking talent or hiring to a black-box score.',
badge:'// SF STARTUP TALENT · TECH + HUMANS IN THE LOOP',
heroTrustLine:'Bay Area · 10% on hire · Free for talent · Mutual interest only',
ctaFounder:"I'm hiring",
ctaEngineer:"I'm looking",
navCta:"I'm hiring",
navCtaTalent:"I'm looking",
ctaHireHint:'For founders & startups',
ctaTalentHint:'For candidates',
startupH2:"I'm hiring",
startupBody:'Role + 90-day outcome. Matched with Demigod tech; humans in the loop.',
engineerH2:"I'm looking",
engineerBody:'One private profile. Tech match + review; shared only when you approve.',
feeNote:'10% of first-year cash if you hire. Free for talent. Nothing until then.',
pricingNote:'10% of first-year cash on hire — nothing until then',
pricingIntro:'Pay only when someone starts.',
pricingBilling:'Email from potter@trydemigod.com. Card/SMS payments pending.',
footerTag:'Demigod tech · humans in the loop · 10% on hire',
trustKicker:'How it works',
trustSteps:['You send a brief or profile','Demigod tech ranks · humans review','Both approve → intro'],



privacyNote:'Profiles shared only when both sides approve.',
followUpTitle:'Optional details',
followUpHint:'Optional — we may follow up by email.',
followUpSalary:'Target salary range?',
followUpStart:'Earliest start date?',
followUpWhy:'Dealbreakers?',
pathHow:'How it works',
pathPricing:'Pricing',
pathFaq:'FAQ',
pathCompare:'Compare',
pathBlog:'Blog',
pathMethod:'Method',
pathFounders:'For founders',
pathCandidates:'For talent'
};
/* Frege-night WIZ copy (v597) — natural voice, match-critical only, no draft-save chrome */
var STARTUP_OK="Got it. A human will read this. potter@trydemigod.com follows up if there's a real fit.";
var ENGINEER_OK='Profile saved. Private until you approve a match. potter@trydemigod.com only reaches out on real fits.';
var WIZ_THANKS={
  startup:{head:'Brief in',lead:'Someone reads every submission. We only propose when the fit is real — both sides still have to say yes.',steps:['We read the role and 90-day outcome','We rank and human-review fits','You approve before any intro'],done:'How it works'},
  engineer:{head:'You\'re in',lead:'Your profile stays private. Free for talent. No blasts.',steps:['We store it securely','A human proposes only real fits','You approve before anyone gets your name'],done:'How it works'}
};
/* ==== SECTION: WIZ_CFG (stepper paths) ==== */
var WIZ_CFG={
  startup:{
    steps:[['welcome'],['contact-email'],['company-name'],['company-stage'],['role-title'],['stack-needs'],['90day-outcome'],['__submit__'],['__thanks__']],
    welcome:{t:"I'm hiring",b:'A short brief. One role. One clear 90-day outcome.',btn:'Start the brief'},
    thanks:STARTUP_OK,total:6,
    optional:['phone','salary-range','why-this-role','role-jd','timeline','team-size']
  },
  engineer:{
    steps:[['welcome'],['full-name'],['seeker-email'],['linkedin-url'],['skills-stack'],['experience'],['sf-bay'],['__submit__'],['__thanks__']],
    welcome:{t:"I'm looking",b:'One private profile. Free. Shared only when you approve.',btn:'Start my profile'},
    thanks:ENGINEER_OK,total:6,
    optional:['phone','links','resume','salary-expectation','why-startups','availability']
  }
};
/* ==== SECTION: WIZ_Q (questions + hints) ==== */
var WIZ_Q={
  startup:{
    'contact-email':{q:"What's your work email?",h:'We use this for match notes — never a list, never spam.'},
    'company-name':{q:'Company name?',h:'Just so we know who you are.'},
    'company-stage':{q:'What stage are you at?',h:'Pre-seed, seed, Series A+ — helps us match reality, not hype.'},
    'role-title':{q:'What role are you hiring?',h:'Be specific — founding engineer, first PM, head of growth…'},
    'stack-needs':{q:'What must they be great at?',h:'A few must-haves. Keep it short.'},
    '90day-outcome':{q:'What should they ship in the first 90 days?',h:'One concrete result. This is how we match — not keyword bingo.'},
    'salary-range':{q:'Target compensation? (optional)',h:'Rough cash + equity is enough. Skip if you prefer.'},
    'timeline':{q:'When do you need them? (optional)',h:'ASAP, this quarter, or exploring.'},
    'team-size':{q:'Team context? (optional)',h:'Size or who they report to — only if useful.'},
    'why-this-role':{q:'Why this role now? (optional)',h:'One sentence is fine.'},
    'role-jd':{q:'JD or link? (optional)',h:'PDF, doc, or URL. Or skip and email later.'},
    'phone':{q:'Phone? (optional)',h:'SMS is pending — email works today.'},
    '__submit__':{q:'Look good?',h:"Submit when you're ready. A human reviews every brief."}
  },
  engineer:{
    'full-name':{q:"What's your name?",h:'For intros only — not a public profile.'},
    'seeker-email':{q:'Best email?',h:'Match notes from potter@trydemigod.com only.'},
    'linkedin-url':{q:'LinkedIn URL?',h:'Fastest way for a human to understand your background.'},
    'skills-stack':{q:'What do you do best?',h:'Stack, craft, domain — a short list is perfect.'},
    'experience':{q:"What have you shipped that you're proud of?",h:'Two or three concrete wins beat a long bio.'},
    'sf-bay':{q:'Open to SF Bay startups?',h:'Our focus. Remote is fine when the company is Bay-based.'},
    'availability':{q:'When could you start? (optional)',h:'Now, a few weeks, or passive.'},
    'salary-expectation':{q:'Comp range? (optional)',h:"Helps us skip roles that won't fit."},
    'why-startups':{q:'Why startups? (optional)',h:'One line if you want.'},
    'links':{q:'Portfolio or GitHub? (optional)',h:'Any link that shows the work.'},
    'phone':{q:'Phone? (optional)',h:'SMS is pending. Email is the main channel.'},
    'resume':{q:'Resume? (optional)',h:'PDF/Word if you have it handy — private until a match.'},
    '__submit__':{q:'Ready?',h:'Submit when it looks right. Private until you approve a match.'}
  }
};
/* v624: only probe a localhost API when the page is ITSELF served from localhost. On production
   the events-bot (:3460) and MUD (:3461) probes fired at every VISITOR'S OWN machine — 16 and 12
   console errors per view, mixed-content (http from https), and a pattern Chrome's Private
   Network Access is progressively blocking. Both features already fall back to offline/solo, so
   dropping the probe costs prod nothing; dev on localhost is unchanged. */
function dgLocalOk(u){
  try {
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return true;
    return !/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/)/.test(u);
  } catch (e) { return true; }
}
/* v642: public Events Bot API for live /?p=events.
   Discovery: window.DG_EVENTS_BOT_API → public config JSON (CDN) → tunnel candidates → localhost.
   Probes race in parallel so a dead loca.lt subdomain never blocks a live one.
   localtunnel browser interstitial needs Bypass-Tunnel-Reminder. */
var __dgEvBotExtraBases = [];
var __dgEvBotCfgAt = 0;
function dgEventsBotNormBase(u) {
  u = String(u || '')
    .trim()
    .replace(/\/+$/, '');
  if (!u) return '';
  return u.replace(
    /\/(offer|offers|chat|lifecycle|health|event|idea|feedback|money|agent)(\/.*)?$/i,
    '',
  );
}
function dgEventsBotBases() {
  var raw = '';
  try {
    raw = dgEventsBotNormBase((typeof window !== 'undefined' && window.DG_EVENTS_BOT_API) || '');
  } catch (e0) {}
  var list = [raw]
    .concat(__dgEvBotExtraBases || [])
    .concat([
      'https://demigod-events-bot.loca.lt/api/events-bot',
      'http://127.0.0.1:3460/api/events-bot',
      'http://localhost:3460/api/events-bot',
    ]);
  var out = [];
  var seen = {};
  for (var i = 0; i < list.length; i++) {
    var u = dgEventsBotNormBase(list[i]);
    if (!u || seen[u]) continue;
    try {
      if (typeof dgLocalOk === 'function' && !dgLocalOk(u)) continue;
    } catch (e1) {}
    seen[u] = 1;
    out.push(u);
  }
  return out;
}
function dgEventsBotFetch(url, opts) {
  opts = opts || {};
  var h = {};
  var oh = opts.headers || {};
  try {
    if (typeof Headers !== 'undefined' && oh instanceof Headers) {
      oh.forEach(function (v, k) {
        h[k] = v;
      });
    } else {
      for (var k in oh) {
        if (Object.prototype.hasOwnProperty.call(oh, k)) h[k] = oh[k];
      }
    }
  } catch (e2) {}
  h['Bypass-Tunnel-Reminder'] = '1';
  return fetch(
    url,
    Object.assign({}, opts, {
      mode: opts.mode || 'cors',
      headers: h,
    }),
  );
}
/** Load rotating tunnel apiBase from published config (no foot reship when tunnel URL changes). */
function dgEventsBotLoadConfig() {
  if (Date.now() - __dgEvBotCfgAt < 60000 && __dgEvBotExtraBases.length) {
    return Promise.resolve(__dgEvBotExtraBases);
  }
  var bust = Math.floor(Date.now() / 60000);
  var urls = [
    'https://raw.githubusercontent.com/Uuriko/demigod-site-cdn/main/events-api-latest.json?t=' + bust,
    'https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@main/events-api-latest.json?t=' + bust,
  ];
  function loadOne(cfgUrl) {
    return fetch(cfgUrl, { mode: 'cors', cache: 'no-store', signal: AbortSignal.timeout(3500) }).then(
      function (r) {
        if (!r.ok) throw new Error('cfg ' + r.status);
        return r.json();
      },
    );
  }
  return loadOne(urls[0])
    .catch(function () {
      return loadOne(urls[1]);
    })
    .then(function (j) {
      __dgEvBotCfgAt = Date.now();
      var b = dgEventsBotNormBase((j && (j.apiBase || j.tunnelUrl)) || '');
      if (b && b.indexOf('/api/events-bot') < 0 && /^https?:\/\//.test(b)) b = b + '/api/events-bot';
      if (b) {
        __dgEvBotExtraBases = [b];
        try {
          if (!window.DG_EVENTS_BOT_API) window.DG_EVENTS_BOT_API = b;
        } catch (e3) {}
      }
      return __dgEvBotExtraBases;
    })
    .catch(function () {
      return __dgEvBotExtraBases;
    });
}
/** Race health across all bases; first OK wins. Cache so calendar/offers/chat share one probe. */
var __dgEvBotLive = null;
var __dgEvBotLiveAt = 0;
// In-flight probe shared by concurrent callers: the residual storm was 24 probes all fired
// within ~1s, before any result existed to cache. One round, shared.
var __dgEvBotPending = null;
function dgEventsBotPickBase(timeoutMs) {
  timeoutMs = timeoutMs || 6000;
  // Serve a cached MISS as well as a cached hit: without this every caller re-probed a dead
  // bot, so one page load fired ~64 requests at a 503 tunnel. TTL unchanged (45s).
  if (__dgEvBotLive && Date.now() - __dgEvBotLiveAt < 45000) {
    return Promise.resolve(__dgEvBotLive);
  }
  if (__dgEvBotPending) return __dgEvBotPending;
  __dgEvBotPending = dgEventsBotLoadConfig().then(function () {
    var bases = dgEventsBotBases();
    if (!bases.length) return { base: '', j: {} };
    return new Promise(function (resolve) {
      var left = bases.length;
      var done = false;
      bases.forEach(function (base) {
        dgEventsBotFetch(base + '/health', { method: 'GET', signal: AbortSignal.timeout(timeoutMs) })
          .then(function (r) {
            if (!r.ok) throw new Error('bad');
            /* localtunnel interstitial is HTML 511 — never treat as healthy JSON */
            var ct = (r.headers && r.headers.get && r.headers.get('content-type')) || '';
            if (ct && ct.indexOf('json') < 0) throw new Error('not-json');
            return r.json().then(function (j) {
              if (!j || !j.ok) throw new Error('bad-body');
              return { base: base, j: j || {} };
            });
          })
          .then(function (hit) {
            if (done) return;
            done = true;
            if (hit && hit.base) {
              __dgEvBotLive = hit;
              __dgEvBotLiveAt = Date.now();
            }
            __dgEvBotPending = null;
            resolve(hit);
          })
          .catch(function () {
            left -= 1;
            if (!done && left <= 0) {
              done = true;
              __dgEvBotLive = { base: '', j: {} };
              __dgEvBotLiveAt = Date.now();
              __dgEvBotPending = null;
              resolve(__dgEvBotLive);
            }
          });
      });
    });
  });
  return __dgEvBotPending;
}
function q(s){return document.querySelector(s)}
function qa(s,r){return[...(r||document).querySelectorAll(s)]}

 /* Fable v150: use latest honest published board */
 /*dup q/qa removed - single def earlier*/
function dgIsPageShell(el){if(!el||!el.tagName)return true;var t=el.tagName.toLowerCase();if(t==='body'||t==='html'||t==='main')return true;if(el.id==='startup-modal'||el.id==='jobseeker-modal'||el.id==='dg-bar'||el.id==='dg-path-pills')return true;try{if(el.matches&&el.matches('.hero-section,.hero-container,.hero-actions,.nav_container,header,footer,.footer,nav.w-nav,.w-nav'))return true;}catch(e){}return false;}
function dgHide(el){if(!el||dgIsPageShell(el))return;try{el.style.setProperty('display','none','important');}catch(e){}}

function rmF(f,n){if(!f)return;qa('[name="'+n+'"],#'+n,f).forEach(function(i){var w=i.closest('.w-input,.w-select,.w-radio,.w-checkbox,fieldset')||i.parentElement||i;w.remove()});qa('label',f).forEach(function(l){if(new RegExp(n.replace(/-/g,'[- ]'),'i').test(l.textContent||''))l.remove()})}function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}


function addMotion(){qa('#demigod-trust-block .dg-step,#demigod-trust-block .dg-row,#demigod-trust-block .dg-cand,#demigod-trust-block .dg-process-grid > div,.dg-blog-card,.dg-reveal,.dg-decision-grid li,.dg-p-det,.dg-p-grid > div').forEach(function(el){try{el.classList.add('dg-reveal')}catch(e){}});if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){qa('.dg-reveal').forEach(function(el){el.classList.add('dg-reveal-in')});return}try{if(!window.__dgRevealObs){window.__dgRevealObs=new IntersectionObserver(function(ents){ents.forEach(function(e){if(e.isIntersecting){e.target.classList.add('dg-reveal-in');window.__dgRevealObs.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -8% 0px'})}qa('.dg-reveal,.dg-blog-card,.dg-decision-grid li').forEach(function(el){window.__dgRevealObs.observe(el)})}catch(e){}}

// Consolidated force helper to simplify duplicate !important code across wizBuild/showStep/show
function forceWizVisible(form, modal) {
  /* v195: shell + chrome only — never force all fields (kills one-question contract) */
  /* v617: never force CLOSED hire/talent modals open (was blanking homepage with dual overlays) */
  if (form) {
    form.classList.remove('w-form-loading');
    form.style.setProperty('display', 'block', 'important');
    form.style.setProperty('visibility', 'visible', 'important');
    var p = form;
    while (p && p !== document.body) {
      try {
        if (p.matches && p.matches('#startup-modal,#jobseeker-modal,.modal-overlay')) {
          /* skip forcing closed modal shells */
          var isOpen = OPEN && (p === q(OPEN) || ('#' + (p.id || '') === OPEN));
          if (!isOpen) { p = p.parentElement; continue; }
        }
        p.style.setProperty('display', p.matches && p.matches('#startup-modal,#jobseeker-modal') ? 'flex' : 'block', 'important');
        p.style.visibility = 'visible';
      } catch (e) {}
      p = p.parentElement;
    }
  }
  if (modal) {
    var open = OPEN && (modal === q(OPEN) || ('#' + (modal.id || '') === OPEN));
    if (open) {
      modal.style.setProperty('display', 'flex', 'important');
      modal.style.setProperty('visibility', 'visible', 'important');
    }
  }
  var root = modal || form;
  if (!root) return;
  qa('.dg-wiz-head,.dg-wiz-nav,.dg-wiz-q,.dg-wiz-hint,.dg-wiz-count,.dg-wiz-bar,.dg-wiz-bar i,.dg-wiz-next', root).forEach(function(c){
    if (!c || !c.style) return;
    var d = c.classList && (c.classList.contains('dg-wiz-nav') || c.classList.contains('dg-wiz-next')) ? 'flex' : 'block';
    if (c.classList && c.classList.contains('dg-wiz-bar')) d = 'block';
    if (c.tagName === 'I' || (c.parentElement && c.parentElement.classList && c.parentElement.classList.contains('dg-wiz-bar'))) d = 'block';
    c.style.setProperty('display', d, 'important');
    c.style.setProperty('visibility', 'visible', 'important');
  });
  /* review only when marked show OR submit step */
  qa('.dg-wiz-review,.dg-review', root).forEach(function(c){
    if (!c || !c.style) return;
    var on = c.classList.contains('dg-wiz-show') || (form && form.dataset && form.dataset.dgWizKey === '__submit__');
    c.style.setProperty('display', on ? 'block' : 'none', 'important');
    if (on) c.style.setProperty('visibility', 'visible', 'important');
  });
  /* only re-show wrappers marked for current step */
  qa('.dg-wiz-show', root).forEach(function(c){
    if (c && c.style && !c.classList.contains('dg-wiz-review')) {
      c.style.setProperty('display','block','important');
      c.style.setProperty('visibility','visible','important');
    }
  });
}

// Force main page visible to defeat Webflow w-mod-js :not(.w-mod-ix3) hide + CSS hero guards.
// Called early + in run + MO. Also forces ix3 class so the big hide rule stops matching.
function heroImgPerf(){qa('.hero-section img,.hero-container img,[class*=hero] img,header img').forEach(function(im){if(im.dataset.dgPerf)return;im.dataset.dgPerf='1';im.setAttribute('fetchpriority','high');im.setAttribute('decoding','async');im.loading='eager';if(!im.getAttribute('alt')||!im.getAttribute('alt').trim())im.setAttribute('alt','Demigod — SF startup talent matching, San Francisco Bay Area');var setDims=function(){if(im.naturalWidth&&!im.getAttribute('width'))im.setAttribute('width',im.naturalWidth);if(im.naturalHeight&&!im.getAttribute('height'))im.setAttribute('height',im.naturalHeight)};if(im.complete)setDims();else im.addEventListener('load',setDims,{once:true})})}
function lazyBelowFold(){qa('img').forEach(function(im){if(im.dataset.dgPerf||im.dataset.dgLazy)return;if(im.closest('.hero-section,.hero-container,header,[class*=hero]'))return;im.dataset.dgLazy='1';if(!im.getAttribute('loading'))im.loading='lazy';im.setAttribute('decoding','async');if(!im.getAttribute('alt')||!im.getAttribute('alt').trim())im.setAttribute('alt','');var setDims=function(){if(im.naturalWidth&&!im.getAttribute('width'))im.setAttribute('width',im.naturalWidth);if(im.naturalHeight&&!im.getAttribute('height'))im.setAttribute('height',im.naturalHeight)};if(im.complete)setDims();else im.addEventListener('load',setDims,{once:true})})}
function skipLink(){try{var early=q('#dg-skip-early');if(early)early.remove()}catch(e){}if(q('#dg-skip'))return;var main=q('main');if(main&&!main.id)main.id='main';var a=document.createElement('a');a.id='dg-skip';a.href='#main';a.textContent='Skip to main content';a.setAttribute('aria-label','Skip to main content');a.style.cssText='position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:10000';a.addEventListener('focus',function(){a.style.cssText='position:fixed;left:12px;top:12px;z-index:10000;background:#C9A84C;color:#0A0A0A;padding:8px 12px;border-radius:6px;font-weight:600'});a.addEventListener('blur',function(){a.style.cssText='position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:10000'});a.addEventListener('click',function(e){e.preventDefault();var t=q('#dg-page')||q('#main,main,.hero-section,h1')||document.body;try{t.setAttribute('tabindex','-1');t.focus({preventScroll:true});var beh=(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)?'auto':'smooth';if(t.scrollIntoView)t.scrollIntoView({block:'start',behavior:beh})}catch(err){try{t.focus()}catch(e2){}}});document.body&&document.body.prepend(a)}

function offerAbandon(prevId){try{if(!DIRTY)return;var n=0;try{var s=JSON.parse(sessionStorage.getItem('dgWizSave_startup')||sessionStorage.getItem('dgWizSave_engineer')||'null');if(s&&s.answers)n=Object.keys(s.answers).length}catch(e){}if(n<2)return;var m=q(prevId);if(!m)return;if(m.querySelector('#dg-abandon'))return;var box=document.createElement('div');box.id='dg-abandon';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Follow-up email');box.style.cssText='position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);padding:1rem';box.innerHTML='<div style="background:linear-gradient(165deg,#083222,#03140d);border:1px solid rgba(166,255,203,.28);border-radius:8px;max-width:22rem;padding:1.1rem 1.2rem;color:#f3f0e7"><p style="margin:0 0 .75rem;line-height:1.4">Want a human follow-up? Drop your email — no spam.</p><input id="dg-abandon-email" class="w-input" type="email" autocomplete="email" placeholder="you@email.com" aria-label="Your email" style="width:100%;margin:0 0 .6rem;font-size:16px;min-height:44px"><div style="display:flex;flex-direction:column;gap:.5rem"><button type="button" id="dg-abandon-send" style="width:100%;min-height:44px;background:#a6ffcb;color:#03140d;border:0;border-radius:8px;font-weight:600;cursor:pointer;white-space:normal;word-break:break-word">Email potter@trydemigod.com</button><button type="button" id="dg-abandon-skip" style="width:100%;min-height:44px;background:transparent;color:#A8A29E;border:1px solid #333;border-radius:8px;cursor:pointer">Close</button></div></div>';document.body.appendChild(box);var close=function(){document.removeEventListener('keydown',onEsc,true);box.remove();DIRTY=false};var onEsc=function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}};document.addEventListener('keydown',onEsc,true);box.querySelector('#dg-abandon-skip').onclick=close;box.querySelector('#dg-abandon-send').onclick=function(){var em=(box.querySelector('#dg-abandon-email').value||'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){box.querySelector('#dg-abandon-email').style.borderColor='#F4D03F';return}window.location.href='mailto:potter@trydemigod.com?subject=Follow-up request&body='+encodeURIComponent('Please follow up with me.\nEmail: '+em);close()};box.addEventListener('click',function(e){if(e.target===box)close()});try{var inp=box.querySelector('#dg-abandon-email');if(inp)inp.focus()}catch(_){}}catch(e){}}


function faqCss(){if(q('#dg-faq-css'))return;var s=document.createElement('style');s.id='dg-faq-css';s.textContent='#dg-faq details{border-bottom:1px solid rgba(201,168,76,.15);padding:.55rem 0}#dg-faq summary{cursor:pointer;font-weight:600;color:#F5F0E6;list-style:none;min-height:44px;display:flex;align-items:center}#dg-faq summary::-webkit-details-marker{display:none}#dg-faq summary:before{content:"\\25B8 ";color:#C9A84C}#dg-faq details[open] summary:before{content:"\\25BE "}#dg-proof-strip a:focus,#dg-contact-strip a:focus,.dg-wiz-next:focus,.dg-wiz-back:focus{outline:2px solid #a6ffcb;outline-offset:2px}@media(prefers-reduced-motion:reduce){#startup-modal *,#jobseeker-modal *,#dg-faq *{transition:none!important;animation:none!important}}';document.head.appendChild(s)}
function forceMainVisible() {
  // v565: never unhide sections intentionally collapsed by hero()
  var _dgSkipHidden=function(el){return !!(el&&(el.getAttribute&&el.getAttribute('data-dg-hidden')||el.closest&&el.closest('[data-dg-hidden]')));};
  try {
    var de = document.documentElement;
    var bd = document.body;
    // Only unhide page shell — never force display:block on flex/grid or open modals
    function safeShow(el, allowDisplay) {
      if (_dgSkipHidden(el)) return;
      if (!el || el.closest('#startup-modal,#jobseeker-modal,.modal-overlay,[data-dg-wiz-step],.w-form-done,.w-form-fail')) return;
      if (el.getAttribute('aria-hidden') === 'true' && el.matches && el.matches('[role=dialog],.modal-overlay')) return;
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('opacity', '1', 'important');
      if (allowDisplay) {
        var cs = getComputedStyle(el);
        if (cs.display === 'none') {
          // restore common layout modes instead of nuking flex
          var want = el.matches('html,body') ? 'block' :
            el.matches('.hero-actions,#dg-path-pills,#dg-bar') ? 'flex' :
            el.matches('.w-layout-grid,.pricing-grid,.roles-grid,.steps-grid') ? 'grid' :
            'block';
          el.style.setProperty('display', want, 'important');
        }
      }
    }
    if (de) {
      de.classList.add('w-mod-ix3');
      de.style.setProperty('visibility', 'visible', 'important');
      de.style.setProperty('opacity', '1', 'important');
    }
    if (bd) {
      bd.style.setProperty('visibility', 'visible', 'important');
      bd.style.setProperty('opacity', '1', 'important');
      if (getComputedStyle(bd).display === 'none') bd.style.setProperty('display', 'block', 'important');
    }
    qa('.hero-section,.hero-container,.hero-content-left,.hero-content-right,.header,.nav_container,main,section.trust-section,section:not(.modal-overlay),.pricing-grid,.roles-grid,.steps-grid,.step-card,.role-card,.pricing-card,.premium-btn').forEach(function(el){
      if(!_dgSkipHidden(el))safeShow(el, true);
    });
    // Webflow ix: only unhide page chrome, not aria-hidden dialogs
    qa('.hero-section h1,.header h1,h1.hero-heading,.premium-btn').forEach(function(h){
      if (h && !h.closest('#startup-modal,#jobseeker-modal')) {
        h.style.setProperty('visibility', 'visible', 'important');
        h.style.setProperty('opacity', '1', 'important');
      }
    });
    // Short RAF burst for hero only (not whole page)
    var bc = 0;
    (function braf() {
      if (bc++ >= 4) return;
      try {
        qa('.hero-section,.hero-container,main,h1.hero-heading,.hero-section h1,.premium-btn').forEach(function(el) {
          if (el && !el.closest('#startup-modal,#jobseeker-modal')) {
            el.style.setProperty('visibility', 'visible', 'important');
            el.style.setProperty('opacity', '1', 'important');
          }
        });
      } catch (_) {}
      requestAnimationFrame(braf);
    })();
  } catch (e) {}
}
function enhanceWIZ() { try{ if(OPEN){ var mm=q(OPEN); if(mm) wizResumeToast(mm);} }catch(e){}
  qa('.dg-wiz-next, .dg-wiz-back, .dg-wiz-start').forEach(function(btn) {
    if (btn.dataset.enhanced) return;
    btn.dataset.enhanced = '1';
    btn.style.cursor = 'pointer';
    btn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    });
    // touch friendly
    btn.addEventListener('touchstart', function(){}, {passive:true});
  });
  // Ensure modals buttons work
  qa('[data-demigod-modal]').forEach(function(a) {
    a.style.cursor = 'pointer';
  });
  // Extra guards for all CTAs and premium buttons (no dead clicks)
  qa('.premium-btn, .button, .w-button, #dg-nav-hire, #dg-bar a').forEach(function(b){
    if(!b.dataset.dgClickGuard){ b.dataset.dgClickGuard='1'; b.style.cursor='pointer'; }
  });
  // Mobile nav fallback for WIZ (column if CSS not yet applied) + touch targets
  const isMobile = window.innerWidth < 768;
  qa('.dg-wiz-nav').forEach(function(n){
    if (isMobile) {
      n.style.setProperty('flex-direction', 'column', 'important');
      n.style.setProperty('gap', '8px', 'important');
    }
  });
  qa('.dg-wiz-next, .dg-wiz-back, .dg-wiz-start').forEach(function(b){
    if (isMobile) {
      b.style.setProperty('width', '100%', 'important');
      b.style.setProperty('min-height', '44px', 'important');
      b.style.setProperty('padding', '12px 16px', 'important');
    }
    b.style.setProperty('touch-action', 'manipulation', 'important');
  });
  // Step visibility is owned by wizBuild/showStep.
}
setTimeout(enhanceWIZ, 500);
document.addEventListener('click', function(e) {
  if (e.target.closest('.dg-wiz-next, .dg-wiz-back')) setTimeout(enhanceWIZ, 100);
});
// Global WIZ keyboard: Enter advances (never from TEXTAREA — allow newlines)
document.addEventListener('keydown', function(e){
  if (e.key !== 'Enter' || e.shiftKey) return;
  const modal = document.querySelector('#startup-modal, #jobseeker-modal');
  if (!modal || modal.style.display === 'none' || modal.getAttribute('aria-hidden') === 'true') return;
  const act = document.activeElement;
  if (!act) return;
  if (act.tagName === 'TEXTAREA' || act.isContentEditable) return;
  if (act.tagName !== 'INPUT' && act.tagName !== 'SELECT' && !act.closest('.dg-wiz-nav')) return;
  const next = modal.querySelector('.dg-wiz-next') || Array.from(modal.querySelectorAll('button')).find(b=>/next|continue|submit/i.test((b.textContent||'')));
  if (next) {
    e.preventDefault();
    next.click();
  }
});
/* v190: removed enhanceWIZ full-DOM MO — boot+click+resize cover it */

// Resize + viewport listener for perfect mobile + desktop (re-force nav styles + current step visibility)
/* === ONE-QUESTION OWNERSHIP — hide non-active fields; resize must not unhide every step (v187 thrash lesson) === */
function forceMobileDesktopWIZ() {
  try {
    enhanceWIZ();
    // Re-apply chrome only — do NOT unhide every field (kills one-question WIZ).
    const openModal = document.querySelector && document.querySelector('#startup-modal[style*="flex"], #jobseeker-modal[style*="flex"]');
    if (openModal) {
      const f = openModal.querySelector && openModal.querySelector('form');
      if (f) {
        f.style.setProperty('display','block','important');
        f.style.visibility = 'visible';
        // Head/nav/progress only
        qa('.dg-wiz-head,.dg-wiz-nav,.dg-wiz-q,.dg-wiz-hint,.dg-wiz-bar,.dg-wiz-review', openModal).forEach(function(c){
          if (c && c.style) {
            c.style.setProperty('display','','important');
            c.style.setProperty('visibility','visible','important');
          }
        });
        // If stepper tracks a current key, only that field (plus 90day on that step)
        var key = f.dataset && f.dataset.dgWizKey;
        if (key && key !== 'welcome' && key !== '__thanks__') {
          qa('.dg-field-wrap,input,select,textarea', openModal).forEach(function(c){
            if (!c || !c.style) return;
            var n = (c.getAttribute && (c.getAttribute('name') || c.id)) || '';
            var wrap = c.classList && c.classList.contains('dg-field-wrap') ? c : (c.closest && c.closest('.dg-field-wrap'));
            var wn = wrap && wrap.querySelector ? (wrap.querySelector('[name]') || {}).name : '';
            var match = n === key || wn === key || (key === '__submit__' && c.classList && c.classList.contains('dg-wiz-review'));
            if (match) {
              c.style.setProperty('display','','important');
              c.style.setProperty('visibility','visible','important');
              if (wrap && wrap.style) {
                wrap.style.setProperty('display','','important');
                wrap.style.setProperty('visibility','visible','important');
              }
            }
          });
        }
      }
    }
  } catch(e){}
}
try {
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('resize', function(){ setTimeout(forceMobileDesktopWIZ, 80); });
    window.addEventListener('orientationchange', function(){ setTimeout(forceMobileDesktopWIZ, 120); });
  }
  // initial
  setTimeout(forceMobileDesktopWIZ, 800);
} catch(e){}

/* COMPLETE robust Typeform-style WIZ stepper (one question at a time). 
   Uses WIZ_CFG / WIZ_Q. Works with forms() injected .dg-field-wraps.
   Full keyboard (Enter next, Esc back/close), review, validation, mobile safe.
   Buttons always clickable. Gold chrome via classes.
*/
/* ==== SECTION: WIZ runtime (one-question stepper) ==== */
/* === WIZ BUILD & OWNERSHIP — create chrome once; one active wrapper; reopen is idempotent === */
function wizBuild(form, kind) {
  if (!form || form.dataset.dgWizBuilt) return;
  form.dataset.dgWizBuilt = '1';
  form.classList.add('dg-wiz-on');
  form.classList.remove('w-form-loading');
  form.style.setProperty('display', 'block', 'important');
  // keep form visible forever against Webflow re-hiding
  const forceFormVisible = () => {
    if (!form) return;
    form.classList.remove('w-form-loading');
    try {
      if (form.style.display === 'block' && getComputedStyle(form).display !== 'none') return;
    } catch(e){}
    form.style.setProperty('display', 'block', 'important');
  };
  forceFormVisible();
  // v190: never observe our own style writes — attribute MO + setProperty = infinite sync thrash (site freeze)
  try {
    var moFires = 0;
    var mo = new MutationObserver(function(){
      if (moFires++ > 6) { try { mo.disconnect(); } catch(e){} return; }
      // only re-force if Webflow hid the form; avoid writing style when already visible
      try {
        var cs = getComputedStyle(form);
        if (cs.display === 'none' || form.classList.contains('w-form-loading')) forceFormVisible();
      } catch(e){}
    });
    mo.observe(form, { attributes: true, attributeFilter: ['class', 'style'] });
    setTimeout(function(){ try { mo.disconnect(); } catch(e){} }, 5000);
  } catch(e){}
  setTimeout(forceFormVisible, 200);
  setTimeout(forceFormVisible, 800);
  // hide any success/done states so WIZ stepper owns the view
  qa('.w-form-done, .modal-success-message, [class*=success]', form.closest('#startup-modal, #jobseeker-modal') || document).forEach(function(s){
    if (s.closest('form') === form || s.closest('#startup-modal, #jobseeker-modal')) s.style.display = 'none';
  });
  var cfg = WIZ_CFG[kind] || WIZ_CFG.startup;
  var steps = cfg.steps || [];
  var qmap = WIZ_Q[kind] || {};
  var current = 0;
  var SAVE_KEY = 'dgWizSave_' + kind;
  var answers = {};
  // v597: no draft-save UI / no 7-day localStorage (less is more; privacy)
  /* v646: __dgWizStore removed — it was assigned false here and compared !==true in
     wizResumeToast, so the toast could never fire. The draft lives in sessionStorage (see collect). */
  try {
    localStorage.removeItem('dgWizStoreConsent');
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem('dgWizSave_startup');
    localStorage.removeItem('dgWizSave_engineer');
  } catch (e) {}
  /* v604: same-session resume from the sessionStorage draft (see collect()). Restores answers +
     step so a misclick/back/accidental close does not throw the form away. Never cross-session. */
  var resumeStep = 0;
  try {
    var draft = JSON.parse(sessionStorage.getItem(SAVE_KEY) || 'null');
    if (draft && draft.answers) {
      answers = draft.answers;
      resumeStep = Math.max(0, Math.min(draft.step | 0, (cfg.steps || []).length - 1));
      if (resumeStep > 0) form.dataset.dgWizResumed = '1';
    }
  } catch (e) {}
  var head = document.createElement('div');
  head.className = 'dg-wiz-head';
  var __dgWizTotal = steps.filter(function(s){var k=s[0]||'';return k!=='__thanks__' && k!=='__submit__' && k!=='welcome';}).length || Math.max(1, steps.length-3);
  var progressLabel = kind === 'startup' ? 'Hiring brief progress' : kind === 'engineer' ? 'Talent profile progress' : 'Application progress';
  head.innerHTML =
    '<div class="dg-wiz-progress">' +
    '<div class="dg-wiz-count" aria-live="polite"><span class="dg-cur">01 / ' + String(__dgWizTotal).padStart(2,'0') + '</span></div>' +
    '<div class="dg-wiz-bar" role="progressbar" aria-label="' + progressLabel + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i style="width:0%"></i></div>' +
    '</div>' +
    '<div class="dg-wiz-q"></div><div class="dg-wiz-hint"></div>' +
    '<div class="dg-wiz-live" aria-live="polite" aria-atomic="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)"></div>';
  var qEl = head.querySelector('.dg-wiz-q');
  var hEl = head.querySelector('.dg-wiz-hint');
  var progress = head.querySelector('.dg-wiz-bar');
  var bar = head.querySelector('.dg-wiz-bar i');
  var curEl = head.querySelector('.dg-cur');
  // map fields - prefer the visual container (.form-field-group or .dg-field-wrap)
  var fieldMap = {};
  qa('.dg-field-wrap, .w-input, .w-select, .w-file-upload, label, input, select, textarea, [name], [id]', form).forEach(function(el) {
    var n = (el.name || el.id || (el.getAttribute && el.getAttribute('name')) || '').toLowerCase().replace(/[^a-z0-9-]/g,'');
    var container = el.closest('.form-field-group, .dg-field-wrap') || el.closest('label') || el.parentElement || el;
    if (n && !fieldMap[n]) fieldMap[n] = container;
    if (el.name) fieldMap[el.name] = fieldMap[el.name] || container;
    if (el.id) fieldMap[el.id] = fieldMap[el.id] || container;
  });
  // ensure 90day and key fields are mapped even if injection timing
  ['90day-outcome', 'contact-email', 'company-name', 'role-title', 'stack-needs'].forEach(function(k){
    if (!fieldMap[k]) {
      var el = form.querySelector('[name="' + k + '"], [id="' + k + '"]');
      if (el) {
        var c = el.closest('.form-field-group, .dg-field-wrap') || el.parentElement || el;
        fieldMap[k] = c;
      }
    }
  });
  Object.keys(answers).forEach(function(k){
    var el = form.querySelector('[name="' + k + '"], [id="' + k + '"]');
    if (el && el.type !== 'file' && !el.value) {
      if (el.type === 'checkbox' || el.type === 'radio') { if (answers[k]) el.checked = true; }
      else el.value = answers[k];
    }
  });
  var nav = document.createElement('div');
  nav.className = 'dg-wiz-nav';
  nav.innerHTML = '<button type="button" class="dg-wiz-back">Back</button><button type="button" class="dg-wiz-next">Continue</button>';
  var backBtn = nav.querySelector('.dg-wiz-back');
  var nextBtn = nav.querySelector('.dg-wiz-next');
  // place chrome
  var insertAfter = form.querySelector('.dg-field-wrap') || form.firstElementChild;
  if (insertAfter && insertAfter.parentNode === form) form.insertBefore(head, insertAfter); else form.insertBefore(head, form.firstChild || null);
  form.appendChild(nav);
  // force chrome visible immediately
  head.style.setProperty('display', 'block', 'important');
  nav.style.setProperty('display', 'flex', 'important');
  nav.style.setProperty('visibility', 'visible', 'important');
  qa('.dg-wiz-next', nav).forEach(function(b){ b.style.setProperty('display','inline-block','important'); b.style.cursor='pointer'; });
  // .dg-wiz-back display is owned by showStep (must hide on welcome) — do not blanket-force it here.
  qa('.dg-wiz-back', nav).forEach(function(b){ b.style.cursor='pointer'; });
  var nativeSub = form.querySelector('[type="submit"], .w-button');
  if (nativeSub) nativeSub.style.display = 'none';
  if (typeof forceWizVisible === 'function') forceWizVisible(form, form.closest && form.closest('#startup-modal,#jobseeker-modal'));

  // broad force children to ensure inputs show (from final user tests)
  qa('input,select,textarea,label,.w-input,.w-select,.form-field-group,.dg-field-wrap', form).forEach(function(c){ c.style.setProperty('display','block','important'); c.style.setProperty('visibility','visible','important'); });
  function collect() {
    qa('input,select,textarea', form).forEach(function(i) {
      var nm = i.name || i.id || '';
      if (!nm) return;
      // Hidden inputs are not draft answers. Skips the Turnstile token (~750 chars) that the
      // "save this draft" consent would otherwise persist for 7 days; also clears it from
      // drafts saved before this fix. Restore never wrote it back (Turnstile re-issues), so
      // this is hygiene, not a behaviour change.
      if (i.type === 'hidden') { delete answers[nm]; return; }
      if (i.type === 'file') {
        if (i.files && i.files[0]) answers[nm] = i.files[0].name;
        else delete answers[nm];
      } else if (i.type === 'checkbox' || i.type === 'radio') {
        if (i.checked) answers[nm] = i.value || 'yes';
        else if (i.type === 'checkbox') delete answers[nm];
      } else if (i.value && i.value.trim()) answers[nm] = i.value.trim();
      else delete answers[nm];
    });
    /* v604: sessionStorage draft. v597 removed persistence but left offerAbandon() reading
       dgWizSave_* — nothing wrote it, so n was always 0 and the abandon capture was dead code.
       sessionStorage = same-session resume only (the Ovsiankina case: misclick, back, accidental
       close). No TTL, no consent UI, no cross-session surface. Cleared on submit. */
    try { sessionStorage.setItem(SAVE_KEY, JSON.stringify({ answers: answers, step: current })); } catch (e) {}
  }
  /* === WIZ STEP STATE — show/validate exactly one question; preserve values across back/reopen/resize === */
  function showStep(idx) {
    current = Math.max(0, Math.min(idx, steps.length - 1));
    try { form.dataset.dgWizKey = (steps[current]||[])[0] || ''; } catch(e){}
    // One-question: clear prior ownership classes/hides before showing step
    try {
      qa('.dg-wiz-show', form).forEach(function(el){ el.classList.remove('dg-wiz-show'); });
      qa('.dg-wiz-review, .dg-review', form).forEach(function(r){
        if ((steps[current]||[])[0] !== '__submit__') {
          r.style.setProperty('display','none','important');
          r.classList.remove('dg-wiz-show');
        }
      });
    } catch(e){}
    try { var live=form.querySelector('.dg-wiz-live'); if(live){ var qq=form.querySelector('.dg-wiz-q'); live.textContent=(qq&&qq.textContent)?qq.textContent:''; } } catch(e){}
    var keyArr = steps[current] || [];
    var key = keyArr[0] || '';
    if (form) {
      form.classList.remove('w-form-loading');
      form.style.setProperty('display', 'block', 'important');
      form.style.visibility = 'visible';
      var modal = form.closest ? form.closest('#startup-modal,#jobseeker-modal') : null;
      /* never force .w-form-done/.w-form-fail — that fakes success for waitPost */
      if (modal) qa('form,.w-form,.form-field-group,.dg-field-wrap', modal).forEach(function(c){
        if (c.classList && (c.classList.contains('w-form-done') || c.classList.contains('w-form-fail'))) return;
        c.style.setProperty('display','block','important'); c.style.visibility='visible';
      });
      if (typeof forceWizVisible === 'function') forceWizVisible(form, modal);
    }
    var __tot = steps.filter(function(s){var k=s[0]||'';return k!=='__thanks__' && k!=='__submit__' && k!=='welcome';}).length || Math.max(1, steps.length-3);
    var __qn = steps.slice(0, current + 1).filter(function(s){var k=s[0]||'';return k!=='__thanks__' && k!=='__submit__' && k!=='welcome';}).length;
    if (key === 'welcome') __qn = 0;
    if (key === '__submit__' || key === '__thanks__') __qn = __tot;
    curEl.textContent = String(Math.max(__qn, key === 'welcome' ? 0 : 1)).padStart(2, '0') + ' / ' + String(__tot).padStart(2, '0');
    try {
      head.classList.toggle('is-welcome', key === 'welcome');
      head.classList.toggle('is-thanks', key === '__thanks__');
      head.classList.toggle('is-review', key === '__submit__');
    } catch (eHead) {}
    try{ var totEl=curEl.parentElement; if(totEl&&!totEl.getAttribute('data-dg-prog')){ totEl.setAttribute('data-dg-prog','1'); totEl.setAttribute('aria-live','polite'); } }catch(e){}
    // re-map fields every showStep in case of late injection or Webflow DOM changes
    var fieldMap = {};
    qa('.dg-field-wrap, .w-input, .w-select, .w-file-upload, label, input, select, textarea, [name], [id]', form).forEach(function(el) {
      var n = (el.name || el.id || (el.getAttribute && el.getAttribute('name')) || '').toLowerCase().replace(/[^a-z0-9-]/g,'');
      var container = el.closest('.form-field-group, .dg-field-wrap') || el.closest('label') || el.parentElement || el;
      if (n && !fieldMap[n]) fieldMap[n] = container;
      if (el.name) fieldMap[el.name] = fieldMap[el.name] || container;
      if (el.id) fieldMap[el.id] = fieldMap[el.id] || container;
    });
    ['90day-outcome', 'contact-email', 'company-name', 'role-title', 'stack-needs', 'full-name'].forEach(function(k){
      if (!fieldMap[k]) {
        var el = form.querySelector('[name="' + k + '"], [id="' + k + '"]');
        if (el) fieldMap[k] = el.closest('.form-field-group, .dg-field-wrap') || el.parentElement || el;
      }
    });
    // ULTRA ROBUST: aggressively hide EVERY possible Webflow/field wrapper except current step's
    try {
      qa('input,select,textarea,label,.w-input,.w-select,.w-file-upload,.form-field-group,.dg-field-wrap,fieldset,.w-checkbox,.w-radio', form).forEach(function(el){
        if (el.closest('.dg-wiz-head') || el.closest('.dg-wiz-nav') || el.closest('.dg-wiz-review')) return;
        var c = el.closest('.form-field-group, .dg-field-wrap') || el.closest('label') || el.closest('fieldset') || el.parentElement || el;
        if (c && c !== form && !c.classList.contains('dg-wiz-head') && !c.classList.contains('dg-wiz-nav')) c.style.setProperty('display','none','important');
      });
    } catch(e){}
    // show current key's containers + any matching the step key
    var toShow = [];
    if (key && fieldMap[key]) toShow.push(fieldMap[key]);
    qa('input, select, textarea', form).forEach(function(el){
      // exact name/id only — substring-matching label TEXT leaked any field whose label merely
      // mentioned the step key (skills-stack label "Skills & experience *" leaked onto 'experience')
      var n = (el.name || el.id || '').toLowerCase();
      if (key && n === key) toShow.push(el.closest('.form-field-group, .dg-field-wrap') || el);
    });
    toShow.forEach(function(c){
      if (c && c.style) { c.style.setProperty('display', 'block', 'important'); c.classList.add('dg-wiz-show'); }
      var i = c && c.querySelector ? c.querySelector('input,select,textarea') : c;
      if (i && i.style) i.style.setProperty('display', 'block', 'important');
      // hide native Webflow labels (WIZ question owns the text)
      try {
        qa('label.w-form-label, label[for], .w-form-label', c).forEach(function(lab){
          if (lab.querySelector && lab.querySelector('input[type=checkbox],input[type=radio]')) return;
          if (lab.tagName==='LABEL' && /checkbox|radio/i.test(lab.className||'')) return;
          lab.style.setProperty('display','none','important');
        });
        if (i && i.id) {
          qa('label[for="'+i.id+'"]', form).forEach(function(lab){ lab.style.setProperty('display','none','important'); });
        }
      } catch(eLab){}
    });
    // Force ONLY the current step key. Was ['contact-email','full-name', key] — a vis=0 band-aid
    // that force-showed those two on EVERY step, leaking them into later steps (user-confirmed bug).
    [key].forEach(function(ck){
      if (!ck) return;
      var el = form.querySelector('[name="' + ck + '"], [id="' + ck + '"]');
      if (el) {
        el.style.setProperty('display', 'block', 'important');
        var cc = el.closest('.form-field-group, .dg-field-wrap') || el.parentElement;
        if (cc) { cc.style.setProperty('display', 'block', 'important'); }
      }
    });
        // v195: removed ultimate unhide (was re-showing every field)
// explicit force unhide for critical keys (90day, review, first fields) to fix vis=0 / hasReview false / has90 false
        // v195: only force current step key (not the whole critical list)
    if (key && key !== 'welcome' && key !== '__submit__' && key !== '__thanks__') {
      var ck = key;
      var el = form.querySelector('[name="' + ck + '"], [id="' + ck + '"]');
      if (el) {
        el.style.removeProperty('display'); el.style.setProperty('display','block','important'); el.style.visibility='visible';
        var cc = el.closest('.form-field-group, .dg-field-wrap') || el.parentElement;
        if (cc) { cc.style.removeProperty('display'); cc.style.setProperty('display','block','important'); cc.style.visibility='visible'; cc.classList.add('dg-wiz-show'); }
        /* native label hidden by CSS when WIZ question owns the copy */
      }
    }
        if (key === '__submit__' || key.includes('review')) {
      qa('.dg-wiz-review, .dg-review', form).forEach(function(r){ 
        r.style.removeProperty('display'); r.style.display = ''; r.classList.add('dg-wiz-show'); 
        if (window.innerWidth < 768) {
          r.style.setProperty('flex-direction','column','important');
        }
      });
    }
    // progress (single calc)
    var denom = Math.max(1, steps.filter(function(s){return (s[0]||'')!=='__thanks__' && (s[0]||'')!=='__submit__';}).length || (steps.length - 2));
    var pct = Math.min(100, Math.round( ((key === 'welcome' || key === '__thanks__' || key === '__submit__' ? (key==='welcome'?0:denom) : current) / denom) * 100 ));
    if (bar) bar.style.width = pct + '%';
    if (progress) {
      progress.setAttribute('aria-valuenow', String(pct));
      progress.setAttribute('aria-valuetext', pct + '% complete');
    }
    qEl.textContent = ''; hEl.textContent = '';
    backBtn.style.setProperty('display', (current > 0 && key !== 'welcome') ? 'flex' : 'none', 'important');
    if (key === 'welcome') {
      qEl.textContent = cfg.welcome ? cfg.welcome.t : 'Welcome';
      hEl.textContent = cfg.welcome ? cfg.welcome.b : '';
      nextBtn.textContent = cfg.welcome ? cfg.welcome.btn : 'Start →';
      nextBtn.style.display = '';
      // Force hide ALL fields on welcome to prevent leaks (fixes startup form not loading clean stepper)
      qa('.form-field-group, .dg-field-wrap, input, select, textarea', form).forEach(function(fld){
        if (!fld.closest('.dg-wiz-head') && !fld.closest('.dg-wiz-nav')) {
          fld.style.setProperty('display', 'none', 'important');
        }
      });
      // no pre-show here; advance to contact-email will show the field
    } else if (key === '__submit__') {
      // Review step only — do NOT set dgSubmitting until real submit click
      var sq = (qmap.__submit__ || {});
      qEl.textContent = sq.q || 'Ready to submit?';
      hEl.textContent = sq.h || 'A human reviews personally.';
      nextBtn.textContent = 'Submit';
      // review
      var rev = form.querySelector('.dg-wiz-review');
      if (!rev) { rev = document.createElement('div'); rev.className = 'dg-wiz-review'; form.insertBefore(rev, nav); }
      var html = '';
      // Prioritize 90day-outcome first (biz: high-signal for precise matching + higher close rates; creative UX for human reviewer + founder reminder)
      var keys = Object.keys(answers);
      if (keys.indexOf('90day-outcome') > -1) {
        keys = ['90day-outcome'].concat(keys.filter(function(k){return k !== '90day-outcome';}));
      }
      keys.forEach(function(k) {
        var qd = qmap[k]; if (!qd) return; // skip turnstile/internal fields
        var lab = (qd.q || k).replace(/\s*\(optional[^)]*\)/i, '').replace(/[?？]+\s*$/, '');
        var extra = (k === '90day-outcome') ? ' style="font-weight:600;border-left:2px solid #10c674;padding-left:.5rem"' : '';
        // <select> stores the option value ('series-a'); show the label the user actually picked ('Series A').
        // Display-only: answers[k] stays canonical so localStorage restore (i.value = answers[nm]) still matches.
        var shownVal = answers[k];
        try {
          // checkbox stores "on" (no value attr on the Designer element) — show a human Yes/No
          var cbEl = form.querySelector('input[type="checkbox"][name="' + k + '"], input[type="checkbox"][id="' + k + '"]');
          if (cbEl) shownVal = cbEl.checked ? 'Yes' : 'No';
          var selEl = form.querySelector('select[name="' + k + '"], select[id="' + k + '"]');
          if (selEl && selEl.value === answers[k] && selEl.selectedOptions && selEl.selectedOptions[0]) {
            shownVal = (selEl.selectedOptions[0].textContent || answers[k]).trim() || answers[k];
          }
        } catch (e) {}
        html += '<div' + extra + '><span>' + esc(lab) + '</span><em>' + esc(shownVal) + '</em></div>';
      });
      rev.innerHTML = html || '<div>No answers captured — use Back to fill in your brief.</div>';
    } else if (key === '__thanks__') {
      /* v604: clear the sessionStorage draft too — submitted work must not resume. */
      try { localStorage.removeItem(SAVE_KEY); sessionStorage.removeItem(SAVE_KEY); } catch(e){} DIRTY=false;
      nextBtn.style.display = 'none'; backBtn.style.display = 'none';
      return;
    } else {
      nextBtn.textContent = 'Continue';
      var qd = qmap[key] || {q: key.replace(/-/g,' '), h: ''};
      qEl.textContent = qd.q;
      hEl.textContent = qd.h || '';
      // find target input by name/id or by scanning for closest match
      var target = form.querySelector('[name="' + key + '"], [id="' + key + '"]');
      if (!target) {
        // fallback: try to match by label text near the question
        qa('label', form).forEach(function(lab){
          if (!target && lab.textContent && lab.textContent.toLowerCase().includes(key.replace(/-/g,' '))) {
            target = lab.querySelector('input,select,textarea') || lab.nextElementSibling;
          }
        });
      }
      var fld = fieldMap[key] || fieldMap[key.replace(/-/g,'')] || (target ? (target.closest('.form-field-group, .dg-field-wrap') || target) : null) || form.querySelector('[name="' + key + '"], [id="' + key + '"]');
      if (fld) {
        fld.style.display = '';
        fld.classList.add('dg-wiz-show');
        if (target && target !== fld) {
          target.style.display = '';
          target.classList.add('dg-wiz-show');
        }
        // ensure ancestors that are field containers are visible
        var p = fld.parentElement;
        while (p && p !== form) {
          if (p.classList.contains('form-field-group') || p.classList.contains('dg-field-wrap')) {
            p.style.display = '';
          }
          p = p.parentElement;
        }
        setTimeout(function() {
          var inp = (fld.querySelector ? fld.querySelector('input,select,textarea') : null) || target || fld;
          if (inp && inp.focus) try { inp.focus(); } catch(e){}
        }, 30);
      } else {
        // last resort: show the first hidden container (helps for some injected fields)
        var first = form.querySelector('.form-field-group[style*="none"], .dg-field-wrap[style*="none"]');
        if (first) { first.style.display = ''; first.classList.add('dg-wiz-show'); }
      }
      // deterministic name/id + fieldMap + final-guarantee pass own visibility; fuzzy keyword unhide removed (ghosts)
    }
    // ensure the WIZ form is always visible when stepper active (fixes blank form)
    if (form) {
      form.style.setProperty('display', 'block', 'important');
      form.classList.remove('w-form-loading');
    }
    // Final guarantee pass: force the input (esp 90day-outcome + injected) visible
    try {
      let curTarget = form.querySelector('[name="' + key + '"], [id="' + key + '"]');
      if (!curTarget && qEl.textContent) {
        const qKey = qEl.textContent.toLowerCase().split('?')[0].trim().slice(0,24);
        qa('label,.dg-field-wrap,.form-field-group', form).forEach(function(lab){
          if (!curTarget && (lab.textContent || '').toLowerCase().includes(qKey)) {
            curTarget = lab.querySelector ? (lab.querySelector('input,select,textarea') || lab) : lab;
          }
        });
      }
      if (curTarget) {
        curTarget.style.display = '';
        const gg = curTarget.closest('.form-field-group') || curTarget.closest('.dg-field-wrap') || curTarget.parentElement;
        if (gg) { gg.style.display = ''; gg.classList.add('dg-wiz-show'); }
        var ii = curTarget.tagName && /INPUT|TEXTAREA|SELECT/.test(curTarget.tagName) ? curTarget : (curTarget.querySelector && curTarget.querySelector('input,select,textarea'));
        if (ii) ii.style.display = '';
      }
      // explicit 90day safety
      if (key === '90day-outcome') {
        var od = form.querySelector('[name="90day-outcome"],[id="90day-outcome"]');
        if (od) {
          od.style.display = '';
          var odg = od.closest('.dg-field-wrap') || od.parentElement;
          if (odg) { odg.style.display = ''; odg.classList.add('dg-wiz-show'); }
          var odl = od.previousElementSibling;
          if (odl && odl.tagName === 'LABEL') odl.setAttribute('for', '90day-outcome');
        }
      }
      // ensure review has a11y
      var revEl = form.querySelector('.dg-wiz-review');
      if (revEl) { revEl.setAttribute('role','region'); revEl.setAttribute('aria-label','Review your answers'); }
      if (key === '__submit__' || key.includes('review')) {
        qa('.dg-wiz-review, .dg-review', form).forEach(function(r){ r.style.display = ''; r.classList.add('dg-wiz-show'); });
      }
      // Consolidated single force pass (bloat reduced; delegates to forceWizVisible + targeted critical)
      if (typeof forceWizVisible === 'function') {
        forceWizVisible(form, form.closest && form.closest('#startup-modal,#jobseeker-modal'));
      } else if (form) {
        form.style.setProperty('display','block','important');
        form.classList.remove('w-form-loading');
      }
      // only force CURRENT step field (one-question ownership)
      if (key && key !== 'welcome' && key !== '__submit__' && key !== '__thanks__') {
        var el = form.querySelector('[name="' + key + '"], [id="' + key + '"]');
        if (el) {
          el.style.setProperty('display','block','important'); el.style.visibility='visible';
          var cc = el.closest('.form-field-group, .dg-field-wrap') || el.parentElement;
          if (cc) { cc.style.setProperty('display','block','important'); cc.style.visibility='visible'; cc.classList.add('dg-wiz-show'); }
        }
      }
      scrubStaticLabels();
    } catch(e){}
    enhanceWIZ();
    if (head && !head.getAttribute('role')) {
      head.setAttribute('role', 'region');
      head.setAttribute('aria-label', 'Form stepper');
    }
  }
  nextBtn.onclick = function(ev) {
    ev && ev.preventDefault();
    collect();
    var key = (steps[current] || [])[0];
    // required validation (skip optionals and welcome)
    if (key && key !== 'welcome' && key !== '__submit__' && key !== '__thanks__') {
      var isOpt = (cfg.optional || []).indexOf(key) >= 0;
      var el = form.querySelector('[name="' + key + '"], [id="' + key + '"]');
      if (el && !isOpt) {
        var empty = false;
        if (el.type === 'checkbox' || el.type === 'radio') empty = !el.checked;
        else empty = !String(el.value || '').trim();
        // require answer for any non-optional step (covers company-name without required attr)
        if (empty) {
        el.style.borderColor = '#F87171'; el.setAttribute('aria-invalid', 'true'); el.focus && el.focus();
        var errEl = form.querySelector('.dg-wiz-req-err');
        if (!errEl) {
          errEl = document.createElement('p');
          errEl.className = 'dg-wiz-req-err';
          errEl.setAttribute('role', 'alert');
          errEl.style.cssText = 'color:#F87171;font-size:.85rem;margin:.4rem 0 0';
          el.insertAdjacentElement('afterend', errEl);
        }
        errEl.textContent = 'Please answer this one — then continue.';
        el.setAttribute('aria-describedby', errEl.id || (errEl.id = 'dg-wiz-req-err-' + key));
        el.addEventListener('input', function clearErr(){ el.style.borderColor = ''; el.removeAttribute('aria-invalid'); if(el.getAttribute('aria-describedby')===(errEl&&errEl.id))el.removeAttribute('aria-describedby'); if(errEl) errEl.textContent = ''; el.removeEventListener('input', clearErr); }, { once: true });
        el.addEventListener('change', function clearErr2(){ el.style.borderColor = ''; el.removeAttribute('aria-invalid'); if(el.getAttribute('aria-describedby')===(errEl&&errEl.id))el.removeAttribute('aria-describedby'); if(errEl) errEl.textContent = ''; }, { once: true });
        setTimeout(function(){ if(el) el.style.borderColor = ''; }, 1400);
        return;
        }
      }
      if (el && (key === 'contact-email' || key === 'seeker-email') && el.value && el.offsetParent !== null) {
        var okMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(el.value).trim());
        if (!okMail) {
          el.style.borderColor = '#F87171'; el.setAttribute('aria-invalid', 'true'); el.focus && el.focus();
          var eErr = form.querySelector('.dg-wiz-req-err');
          if (!eErr) { eErr = document.createElement('p'); eErr.className = 'dg-wiz-req-err'; eErr.setAttribute('role','alert'); eErr.style.cssText = 'color:#F87171;font-size:.85rem;margin:.4rem 0 0'; el.insertAdjacentElement('afterend', eErr); }
          eErr.textContent = 'Enter a valid email so we can reach you.';
          eErr.id = eErr.id || 'dg-wiz-req-err-' + key;
          el.setAttribute('aria-describedby', eErr.id);
          return;
        }
      }
    }
    if (key === '__submit__') {
      form.dataset.dgSubmitting='1';
      setTimeout(function(){ try{ delete form.dataset.dgSubmitting; }catch(e){} }, 12000);
      // ensure review is visible and populated before submit
      var rev = form.querySelector('.dg-wiz-review');
      if (!rev) { rev = document.createElement('div'); rev.className = 'dg-wiz-review'; form.insertBefore(rev, nav); }
      rev.style.display = '';
      rev.style.removeProperty('display');
      if (nativeSub) {
        nativeSub.style.display = '';
        setTimeout(function(){ try { nativeSub.click(); } catch(e){ form.submit && form.submit(); } }, 10);
        // only advance to thanks after Webflow done/fail (no silent success)
        // forms() adds .w-form to <form> itself, so form.closest('.w-form') === form and
        // sibling .w-form-done/.w-form-fail under the outer wrapper were never found (Codex P1).
        /* === FORM RESULT CONTRACT — pending → confirmed Webflow success|failure; never synthesize success === */
        function dgWfStatusRoot(f){
          var modal = f.closest && f.closest('#startup-modal,#jobseeker-modal');
          if (modal) {
            var d = modal.querySelector('.w-form-done');
            if (d && d.parentElement) return d.parentElement;
          }
          var p = f.parentElement;
          if (p) {
            var sib = p.querySelector(':scope > .w-form-done, :scope > .w-form-fail');
            if (sib) return p;
            if (p.classList && p.classList.contains('w-form') && p !== f) return p;
          }
          var outer = f.parentElement && f.parentElement.closest && f.parentElement.closest('.w-form');
          if (outer && outer !== f) return outer;
          return p || f;
        }
        var wfWrap = dgWfStatusRoot(form), t0 = Date.now();
        try { delete form.dataset.dgSubmitting; } catch(e){}
        (function waitPost(){
          var scope = wfWrap || form.parentElement || form;
          var okEl = scope.querySelector('.w-form-done');
          var badEl = scope.querySelector('.w-form-fail');
          // also check siblings of form (Webflow classic: form + done + fail as siblings)
          if (!okEl && form.parentElement) {
            var kids = form.parentElement.children;
            for (var i=0;i<kids.length;i++){
              if (kids[i].classList && kids[i].classList.contains('w-form-done')) okEl = kids[i];
              if (kids[i].classList && kids[i].classList.contains('w-form-fail')) badEl = kids[i];
            }
          }
          var okVis = okEl && getComputedStyle(okEl).display !== 'none' && getComputedStyle(okEl).visibility !== 'hidden';
          var badVis = badEl && getComputedStyle(badEl).display !== 'none' && getComputedStyle(badEl).visibility !== 'hidden';
          if (okVis) { try{scrubTimeClaims()}catch(e){} showStep(current + 1); return; }
          if (badVis) {
            var eEl = form.querySelector('.dg-wiz-err');
            if (!eEl) {
              eEl = document.createElement('p');
              eEl.className = 'dg-wiz-err';
              eEl.setAttribute('role','alert');
              eEl.style.cssText = 'color:#f87171;font-size:.9rem;margin:.5rem 0';
              if (nav && nav.parentNode) nav.parentNode.insertBefore(eEl, nav);
              else form.appendChild(eEl);
            }
            eEl.textContent = 'Submission failed — email potter@trydemigod.com and we will take it from there.';
            return;
          }
          if (Date.now() - t0 < 6000) { setTimeout(waitPost, 250); return; }
          var eEl2 = form.querySelector('.dg-wiz-err');
          if (!eEl2) {
            eEl2 = document.createElement('p');
            eEl2.className = 'dg-wiz-err';
            eEl2.setAttribute('role','alert');
            eEl2.style.cssText = 'color:#f87171;font-size:.9rem;margin:.5rem 0';
            if (nav && nav.parentNode) nav.parentNode.insertBefore(eEl2, nav);
            else form.appendChild(eEl2);
          }
          eEl2.textContent = 'Could not confirm submit — email potter@trydemigod.com and we will take it from there.';
          return;
        })();
      } else {
        form.submit && form.submit();
        showStep(current + 1);
      }
    } else if (current < steps.length - 1) {
      showStep(current + 1);
    }
  };
  backBtn.onclick = function(ev){ ev&&ev.preventDefault(); if (current > 0) showStep(current - 1); };
  // keyboard advance on visible inputs + arrows for nav (Typeform polish)
  form.addEventListener('keydown', function(e) {
    var act = document.activeElement;
    var inText = act && (act.tagName === 'TEXTAREA' || act.isContentEditable);
    if (e.key === 'Enter' && !e.shiftKey) {
      if (act && (act.tagName === 'INPUT' || act.tagName === 'SELECT') && !inText) {
        e.preventDefault(); nextBtn.click();
      }
    }
    if (e.key === 'Escape') {
      if (current > 0) { e.preventDefault(); backBtn.click(); }
    }
    // Arrows only when not typing in fields (avoid caret theft)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (act && (act.tagName === 'INPUT' || act.tagName === 'TEXTAREA' || act.tagName === 'SELECT' || act.isContentEditable)) return;
      e.preventDefault(); nextBtn.click();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (act && (act.tagName === 'INPUT' || act.tagName === 'TEXTAREA' || act.tagName === 'SELECT' || act.isContentEditable)) return;
      e.preventDefault(); if (current > 0) backBtn.click();
    }
  }, true);
  // start — honor saved resumeStep (v191: do not clobber with unconditional showStep(0))
  var startIdx = resumeStep || 0;
  setTimeout(function(){ showStep(startIdx); enhanceWIZ(); }, 20);
  form.addEventListener('input', function(){ enhanceWIZ(); });
  setTimeout(function(){ if (typeof showStep === 'function') showStep(startIdx); }, 50);
  // reopen helper — show() calls this instead of rebuild (v194)

    // v195: ensure configured required fields have required attr
    ['contact-email','company-name','company-stage','role-title','stack-needs','90day-outcome','full-name','seeker-email','linkedin-url','skills-stack','experience','sf-bay'].forEach(function(n){ var el=form.querySelector('[name="'+n+'"],[id="'+n+'"]'); if(el && (cfg.optional||[]).indexOf(n)<0){ el.required=true; if(el.type==='checkbox') el.setAttribute('required','required'); }});
  form.__dgWizShow = function(){ try{ showStep(current); enhanceWIZ(); forceWizVisible(form, form.closest('#startup-modal,#jobseeker-modal')); }catch(e){} };
  // additional force to unhide first step fields and review/90day to fix vis=0 and missing review/90 in live/tests
  setTimeout(function(){
    qa('.form-field-group, .dg-field-wrap', form).forEach(function(f){ if (f.classList.contains('dg-wiz-show') || f.querySelector('[name*="90day"]')) { f.style.display = ''; } });
    var firstInput = form.querySelector('input, select, textarea:not([type=hidden])');
    if (firstInput) { firstInput.style.display = ''; var c = firstInput.closest('.form-field-group,.dg-field-wrap'); if(c) c.style.display=''; }
  }, 100);
  // ultimate force for WIZ fields visibility and review/90day (bugfix for playtest vis0, hasReview false, has90 false)
  setTimeout(function(){
    qa('input,select,textarea,.form-field-group,.dg-field-wrap', form).forEach(function(el){
      var n = (el.name || el.id || '').toLowerCase();
      if (n.includes('90day') || el.closest('.dg-wiz-review')) {
        el.style.display = '';
        var p = el.closest('.form-field-group,.dg-field-wrap') || el.parentElement;
        if (p) p.style.display = '';
      }
    });
    // make sure review is built and visible if submit step
    if (steps.some(s => s[0] === '__submit__')) {
      var rev = form.querySelector('.dg-wiz-review');
      if (!rev) {
        rev = document.createElement('div');
        rev.className = 'dg-wiz-review';
        form.insertBefore(rev, nav);
      }
      rev.style.display = '';
    }
  }, 200);
}

/* ==== SECTION: BOARD (CDN ledger — sample-labeled; never invent realRoles) ==== */

function submitTrust(f,msg){if(!f||f.querySelector('#dg-submit-trust'))return;var p=document.createElement('p');p.id='dg-submit-trust';p.style.cssText='color:#9ca3af;font-size:.8rem;margin:.5rem 0 .25rem;line-height:1.4';p.textContent=msg||'Reviewed with humans in the loop. No spam lists.';var b=f.querySelector('[type=submit],.w-button');b?.parentElement?.insertBefore(p,b)}
function charCount(el,max){if(!el||el.dataset.dgCc)return;var wrap=el.closest('.dg-field-wrap,.w-input')||el.parentElement;var c=document.createElement('span');c.className='dg-char-count';c.style.cssText='display:block;color:#6b7280;font-size:.72rem;margin:.2rem 0 .35rem;text-align:right';var upd=function(){var n=(el.value||'').length;c.textContent=n+' / '+max};el.dataset.dgCc='1';el.addEventListener('input',upd);upd();if(wrap)wrap.appendChild(c);else el.insertAdjacentElement('afterend',c)}
function successCta(){qa(S+' .w-form-done,'+J+' .w-form-done').forEach(function(done){if(done.querySelector('.dg-sample-match'))return;if(done.offsetParent===null&&getComputedStyle(done).display==='none')return;var a=document.createElement('button');a.type='button';a.className='dg-sample-match w-button';a.textContent='View sample matches';/* v598: no follow-up mini-form on thanks (less is more) */a.style.cssText='margin-top:.75rem;background:transparent!important;color:#c9a84c!important;border:1px solid rgba(201,168,76,.45)!important';a.addEventListener('click',function(){var blk=q('#demigod-trust-block');if(blk)blk.scrollIntoView({behavior:'smooth',block:'start'});else window.scrollTo(0,document.body.scrollHeight*.55)});done.appendChild(a);var kind=done.closest(J)?'engineer':'startup';var t=WIZ_THANKS[kind];if(t&&!done.querySelector('.dg-thanks')){done.insertAdjacentHTML('afterbegin','<div class="dg-thanks"><h3>'+t.head+'</h3><p>'+t.lead+'</p>'+t.steps.map(function(s){return'<p class="dg-thanks-step">• '+s+'</p>'}).join('')+'</div>')}})}
function ph(i,t){if(i&&'placeholder'in i)i.placeholder=t}
function formEl(sel){var el=typeof sel==='string'?q(sel):sel;if(!el)return null;return el.tagName==='FORM'?el:(el.querySelector&&el.querySelector('form'))||null}
/* === FORMS / NATIVE WEBFLOW — id + labels + optional fields; WIZ wraps after === */
/* ==== SECTION: forms (Webflow form repair + required fields + submit trust) ==== */
function forms(){var stWrap=q('#startup-hire.w-form')||q(S+' .w-form');var st=formEl('#startup-hire')||formEl('#startup-form')||formEl(S+' form')||formEl(stWrap);if(st&&!st.dataset.dgStartup){st.dataset.dgStartup='1';if(stWrap&&stWrap!==st&&stWrap.id==='startup-hire')stWrap.removeAttribute('id');st.classList.add('w-form');st.classList.remove('w-form-loading');st.id='startup-hire';st.name='startup-hire';st.setAttribute('data-name','startup-hire');st.removeAttribute('aria-label');st.removeAttribute('action');st.setAttribute('method','post');rmF(st,'Source');rmF(st,'hiring-model');qa('label,span,p',st).forEach(function(el){if(/Hiring Model|Commission-only|Subscription/i.test(el.textContent||''))(el.closest('.w-radio,fieldset,.w-form-label,div')||el).remove();if(/Stack Needs|Tech stack/i.test(el.textContent||''))el.textContent='Skills / requirements *';if(/Role Title|Job Title/i.test(el.textContent||''))el.textContent='Role title *';if(/Company stage/i.test(el.textContent||''))el.textContent='Company stage *'});ph(st.querySelector('[name=contact-email]'),'you@company.com');ph(st.querySelector('[name=role-title]'),'e.g. Founding PM, Head of Growth, Designer');ph(st.querySelector('[name=stack-needs]'),'e.g. B2B SaaS, GTM, design systems, React');['contact-email','role-title','stack-needs'].forEach(function(n){var i=st.querySelector('[name='+n+']');if(i){i.required=true; if(n==='contact-email')i.setAttribute('autocomplete','email'); var l=i.closest('label')||i.previousElementSibling; if(l&&l.tagName==='LABEL') l.setAttribute('for',n); else if(!l){var nl=document.createElement('label');nl.className='w-form-label';nl.setAttribute('for',n);nl.textContent=(n==='contact-email'?'Best email?':n==='role-title'?'Role title?':'Key skills?'); i.parentNode.insertBefore(nl,i); } } });var cs=st.querySelector('[name=company-stage]');if(cs){cs.required=true} // remove Webflow static title
qa('h3,.w-form-title,[class*=title]',st).forEach(function(h){if(/STARTUP HIRING FORM|HIRING FORM/i.test(h.textContent||'')){h.style.display='none';h.textContent='';}});
// ensure company-name field exists for its WIZ step (some Webflow forms may not have it)
/* company-name */ if(!st.querySelector('[name=company-name]')){var cn=document.createElement('div');cn.className='dg-field-wrap';cn.innerHTML='<label class="w-form-label" for="company-name">Company name?</label><input class="w-input" type="text" id="company-name" name="company-name" autocomplete="organization" required placeholder="Acme Inc">';var ce=st.querySelector('[name=contact-email]');var ceg=ce&&(ce.closest('.form-field-group')||ce.parentElement);if(ceg&&ceg.parentElement&&ceg!==st){ceg.insertAdjacentElement('afterend',cn);}else{(ce&&ce.parentElement||st).appendChild(cn);}}
// inject timeline and team-size (per Fable perfect fields)
if(!st.querySelector('[name=timeline]')){var tw=document.createElement('div');tw.className='dg-field-wrap';tw.innerHTML='<label class="w-form-label" for="timeline">Timeline?</label><select class="w-select" id="timeline" name="timeline"><option value="">Select</option><option value="asap">ASAP (2-4 wks)</option><option value="quarter">This quarter</option><option value="exploratory">Exploratory</option></select>';var sk=st.querySelector('[name=stack-needs]');var skg=sk&&(sk.closest('.form-field-group')||sk.parentElement);if(skg&&skg.parentElement&&skg!==st){skg.insertAdjacentElement('afterend',tw);}else{(sk&&sk.parentElement||st).appendChild(tw);}}
if(!st.querySelector('[name=team-size]')){var tm=document.createElement('div');tm.className='dg-field-wrap';tm.innerHTML='<label class="w-form-label" for="team-size">Team size / reports to?</label><input class="w-input" type="text" id="team-size" name="team-size" placeholder="e.g. 5-person eng team, reports to CTO">';(st.querySelector('[name=stack-needs]')||st).parentElement.appendChild(tm);}var sk=st.querySelector('[name=stack-needs]'),sa=sk&&(sk.closest('.w-input')||sk.parentElement);if(!st.querySelector('[name=company-stage]')){var ce=st.querySelector('[name=contact-email]'),cew=ce&&(ce.closest('.w-input')||ce.parentElement);var sw=document.createElement('div');sw.className='dg-field-wrap';sw.innerHTML='<label class="w-form-label" for="company-stage">Company stage *</label><select class="w-select" id="company-stage" name="company-stage" required><option value="">Select stage</option><option value="pre-seed">Pre-seed</option><option value="seed">Seed</option><option value="series-a">Series A</option><option value="series-b">Series B+</option></select>';var ceg3=ce&&(ce.closest('.form-field-group')||cew);if(ceg3&&ceg3.parentElement&&ceg3!==st)ceg3.parentElement.insertBefore(sw,ceg3.nextSibling);else if(cew&&cew.parentElement)cew.parentElement.insertBefore(sw,cew.nextSibling);else{var rt=st.querySelector('[name=role-title]'),rw=rt&&(rt.closest('.w-input')||rt.parentElement);if(rw&&rw.parentElement)rw.parentElement.insertBefore(sw,rw)}} 
// inject 90day-outcome creative field for high-signal matching data (Fable recommended)
if(!st.querySelector('[name="90day-outcome"]')){var od=document.createElement('div');od.className='dg-field-wrap';od.innerHTML='<label class="w-form-label" for="90day-outcome">#1 outcome this hire must deliver in first 90 days? *</label><textarea class="w-input" id="90day-outcome" name="90day-outcome" rows="2" required placeholder="e.g. Ship v1 checkout; 2 paying pilot customers this quarter"></textarea>';var skg2=sk&&(sk.closest('.form-field-group')||sk.parentElement);if(skg2&&skg2.parentElement&&skg2!==st){skg2.insertAdjacentElement('afterend',od);}else{(sk&&sk.parentElement||st).appendChild(od);}}if(!st.querySelector('[name=salary-range]')){var w=document.createElement('div');w.id='dg-salary-wrap';w.className='dg-field-wrap';w.innerHTML='<label class="w-form-label" for="salary-range">Comp range (optional)</label><input class="w-input" type="text" id="salary-range" name="salary-range" placeholder="e.g. $180-220k + equity">';if(sa&&sa.parentElement)sa.parentElement.insertBefore(w,sa.nextSibling);else st.querySelector('[type=submit],.w-button')?.parentElement?.insertBefore(w,st.querySelector('[type=submit],.w-button'))}else{ph(st.querySelector('[name=salary-range]'),'e.g. $180-220k + equity');qa('label',st).forEach(function(l){if(/salary|comp range/i.test(l.textContent||''))l.textContent='Comp range (optional)'})}if(!st.querySelector('[name=why-this-role]')){var ww=document.createElement('div');ww.id='dg-why-wrap';ww.className='dg-field-wrap';ww.innerHTML='<label class="w-form-label" for="why-this-role">Why this role (optional)</label><textarea class="w-input" id="why-this-role" name="why-this-role" rows="2" placeholder="e.g. First PM hire; need someone who has shipped 0→1"></textarea>';var sal=st.querySelector('[name=salary-range]'),salw=sal&&(sal.closest('.dg-field-wrap,.w-input')||sal.parentElement);if(salw&&salw.parentElement)salw.parentElement.insertBefore(ww,salw.nextSibling);else if(sa&&sa.parentElement)sa.parentElement.insertBefore(ww,sa.nextSibling)}if(!st.querySelector('[name=role-jd]')){var jw=document.createElement('div');jw.id='dg-jd-wrap';jw.className='dg-field-wrap w-file-upload';jw.innerHTML='<label class="w-form-label" for="role-jd">Job description (optional)</label><input class="w-file-upload-input w-input" type="file" id="role-jd" name="role-jd" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><p class="dg-resume-hint">PDF or Word · max 10MB</p>';var why=st.querySelector('[name=why-this-role]'),whyw=why&&(why.closest('.dg-field-wrap,.w-input')||why.parentElement);if(whyw&&whyw.parentElement)whyw.parentElement.insertBefore(jw,whyw.nextSibling);else if(sa&&sa.parentElement)sa.parentElement.insertBefore(jw,sa.nextSibling)}st.setAttribute('enctype','multipart/form-data');if(!st.querySelector('#dg-fee-note')){var n=document.createElement('p');n.id='dg-fee-note';n.style.cssText='color:#9ca3af;font-size:.85rem;margin:.5rem 0 1rem';n.textContent=COPY.feeNote;var b=st.querySelector('[type=submit],.w-button');b?.parentElement?.insertBefore(n,b)}submitTrust(st,'A human reads every brief. potter@trydemigod.com follows up.');charCount(st.querySelector('[name=stack-needs]'),500);charCount(st.querySelector('[name=why-this-role]'),300);var sb=st.querySelector('[type=submit],.w-button');if(sb){sb.value='Send brief';sb.textContent='Send brief'; sb.removeAttribute('disabled'); sb.disabled=false;}wizBuild(st,'startup');}var en=formEl('#engineer-join')||formEl('#jobseeker-form')||formEl(J+' form')||formEl(J+' .w-form');if(en&&!en.dataset.dgEngineer){en.dataset.dgEngineer='1';en.classList.add('w-form');en.id='engineer-join';en.name='engineer-join';en.setAttribute('data-name','engineer-join');en.removeAttribute('aria-label');en.removeAttribute('action');en.removeAttribute('action');en.setAttribute('method','post');if(!en.dataset.dgMailStrip){en.dataset.dgMailStrip='1';en.addEventListener('submit',function(ev){/* keep native Webflow if wired; never open mail client */if(/^mailto:/i.test(en.getAttribute('action')||'')){ev.preventDefault();en.removeAttribute('action');}},true);}rmF(en,'github-url');rmF(en,'portfolio-url');rmF(en,'is-engineer');var ghWrap=en.querySelector('#dg-github-wrap');if(ghWrap)ghWrap.remove();var engChk=en.querySelector('#dg-engineer-check');if(engChk)engChk.remove();qa('label',en).forEach(function(l){if(/Years Experience|Background & highlights|What you have shipped/i.test(l.textContent||''))l.textContent='What you shipped *';if(/Skills\s*&\s*(Stack|experience)/i.test(l.textContent||''))l.textContent='Skills & stack *';if(/^LinkedIn/i.test((l.textContent||'').trim()))l.textContent='LinkedIn URL *'});ph(en.querySelector('[name=full-name]'),'Your full name');ph(en.querySelector('[name=seeker-email]'),'you@email.com');['full-name','seeker-email'].forEach(function(n){var i=en.querySelector('[name='+n+']');if(i){i.required=true;i.setAttribute('autocomplete',n==='full-name'?'name':'email')}});var liIn=en.querySelector('[name=linkedin-url]');if(liIn){liIn.type='url';liIn.required=true;liIn.setAttribute('autocomplete','url');ph(liIn,'https://linkedin.com/in/you')}en.setAttribute('enctype','multipart/form-data');en.setAttribute('method','post');var resIn=en.querySelector('[name=resume],[name=Resume]');if(!resIn){var rw=document.createElement('div');rw.id='dg-resume-wrap';rw.className='dg-field-wrap w-file-upload';rw.innerHTML='<label class="w-form-label" for="resume">Resume (optional now)</label><input class="w-input" type="file" id="resume" name="resume" style="display:block!important;width:100%!important;color:#A8A29E;padding:.45rem 0" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><p class="dg-resume-hint">PDF or Word · max 10MB</p>';var insBefore=en.querySelector('[name=skills-stack]');var insW=insBefore&&(insBefore.closest('.w-input')||insBefore.parentElement);if(insW&&insW.parentElement)insW.parentElement.insertBefore(rw,insW);else{var subR=en.querySelector('[type=submit],.w-button');subR?.parentElement?.insertBefore(rw,subR)}resIn=rw.querySelector('[name=resume]')}else{var resW=resIn.closest('.dg-field-wrap,.w-file-upload,.w-input')||resIn.parentElement;if(resW&&!resW.id)resW.id='dg-resume-wrap';resIn.classList.remove('w-file-upload-input');resIn.classList.add('w-input');resIn.style.cssText='display:block!important;width:100%!important;color:#A8A29E;padding:.45rem 0';/*resume opt per WIZ*/;if(!resIn.id)resIn.id='resume';if(!resIn.name)resIn.name='resume';if(!resIn.accept)resIn.setAttribute('accept','.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document')}qa('label',en).forEach(function(l){if(/resume|résumé|cv/i.test((l.textContent||'').trim())&&!l.querySelector('[type=file]'))l.textContent='Resume (optional now)'});if(resIn&&!en.dataset.dgResumeVal){en.dataset.dgResumeVal='1';resIn.addEventListener('change',function(){var f=resIn.files&&resIn.files[0];if(f&&f.size>10485760)resIn.setCustomValidity('Max file size 10MB');else resIn.setCustomValidity('')})}ph(en.querySelector('[name=skills-stack]'),'e.g. Product strategy, Figma, growth marketing');var skIn=en.querySelector('[name=skills-stack]');if(skIn)skIn.required=true;charCount(en.querySelector('[name=skills-stack]'),400);charCount(en.querySelector('[name=experience]'),600);var ex=en.querySelector('[name=experience]');if(ex&&ex.tagName==='SELECT'){var ta=document.createElement('textarea');ta.className='w-input';ta.name='experience';ta.id='experience';ta.rows=3;ta.placeholder='e.g. Shipped v1 at seed startup; led growth from 0→$1M ARR';ta.required=true;(ex.closest('.w-select')||ex).replaceWith(ta)}else if(ex){ex.required=true;ph(ex,'e.g. Shipped v1 at seed startup; led growth from 0→$1M ARR')}if(!en.querySelector('[name=links]')){var liWrap=liIn&&(liIn.closest('.w-input')||liIn.parentElement);var lw=document.createElement('div');lw.id='dg-links-wrap';lw.className='dg-field-wrap';lw.innerHTML='<label class="w-form-label" for="links">Links (optional)</label><input class="w-input" type="text" id="links" name="links" placeholder="GitHub, portfolio, or other links">';if(liWrap&&liWrap.parentElement)liWrap.parentElement.insertBefore(lw,liWrap.nextSibling);else{var sub=en.querySelector('[type=submit],.w-button');sub?.parentElement?.insertBefore(lw,sub)}}var sf=en.querySelector('[name=sf-bay]');
if(sf&&sf.type==='checkbox'){var sw=document.createElement('div');sw.className='dg-field-wrap';sw.innerHTML='<label class="w-form-label" for="sf-bay">Open to SF Bay startups?</label><select class="w-select" id="sf-bay" name="sf-bay" required><option value="">Select</option><option value="yes">Yes</option><option value="remote-bay">Yes — remote OK if company is Bay-based</option><option value="no">Not right now</option></select>';var par=sf.closest('label,.w-checkbox,.dg-field-wrap')||sf.parentElement;if(par&&par.parentNode)par.parentNode.replaceChild(sw,par);else sf.replaceWith(sw);sf=sw.querySelector('[name=sf-bay]');}
if(!en.querySelector('[name=sf-bay]')){var c=document.createElement('div');c.className='dg-field-wrap';c.innerHTML='<label class="w-form-label" for="sf-bay">Open to SF Bay startups?</label><select class="w-select" id="sf-bay" name="sf-bay" required><option value="">Select</option><option value="yes">Yes</option><option value="remote-bay">Yes — remote OK if company is Bay-based</option><option value="no">Not right now</option></select>';var b2=en.querySelector('[type=submit],.w-button');b2?.parentElement?.insertBefore(c,b2)}
else{var sfel=en.querySelector('[name=sf-bay]');if(sfel){sfel.required=true;if(sfel.tagName==='SELECT'){/* ok */}}}
// inject availability, salary-expect, why-startups for perfect matching
if(!en.querySelector('[name=availability]')){var av=document.createElement('div');av.className='dg-field-wrap';av.innerHTML='<label class="w-form-label" for="availability">Availability?</label><select class="w-select" id="availability" name="availability"><option value="">Select</option><option value="now">Now</option><option value="2-4w">2-4 weeks</option><option value="passive">Passive / open</option></select>';(en.querySelector('[name=sf-bay]')||en).parentElement.appendChild(av);}
if(!en.querySelector('[name=salary-expectation]')){var se=document.createElement('div');se.className='dg-field-wrap';se.innerHTML='<label class="w-form-label" for="salary-expectation">Comp expectation (optional)</label><input class="w-input" type="text" id="salary-expectation" name="salary-expectation" placeholder="e.g. 180-220k + equity">';en.appendChild(se);}
if(!en.querySelector('[name=why-startups]')){var ws=document.createElement('div');ws.className='dg-field-wrap';ws.innerHTML='<label class="w-form-label" for="why-startups">Why SF startups (optional)</label><textarea class="w-input" id="why-startups" name="why-startups" rows="2" placeholder="Mission, stage, impact..."></textarea>';en.appendChild(ws);}if(!en.querySelector('#dg-privacy')){var p=document.createElement('p');p.id='dg-privacy';p.style.cssText='color:#9ca3af;font-size:.8rem;margin:.75rem 0 0';p.textContent='We never blast your profile. Tech match + humans in the loop.';var b3=en.querySelector('[type=submit],.w-button');b3?.parentElement?.insertBefore(p,b3)}submitTrust(en,'Private until a reviewed match. Free for candidates.');var sb2=en.querySelector('[type=submit],.w-button');if(sb2){sb2.value='Get matched';sb2.textContent='Get matched'; sb2.removeAttribute('disabled'); sb2.disabled=false;}wizBuild(en,'engineer');qa('#tally-startup-embed,#tally-engineer-embed,iframe[data-tally-embed]').forEach(function(el){el.remove()});var stW=formEl('#startup-hire');if(stW)wizBuild(stW,'startup');var enW=formEl('#engineer-join');if(enW)wizBuild(enW,'engineer');} // ensure WIZ on any open
// extra label safety for mobile a11y on both forms (build more)
qa('input,select,textarea', document).forEach(function(i){ if(!i.id) return; var l = document.querySelector('label[for="'+i.id+'"]'); if(l) l.setAttribute('for', i.id); });
}
/* === COPY INJECTION — runtime marketing strings from COPY; honesty scrub separate === */
function copy(){qa(S+' h2').forEach(function(e){e.textContent=COPY.startupH2});qa(J+' h2').forEach(function(e){e.textContent=COPY.engineerH2});qa(S+' p,'+J+' p').forEach(function(e){var t=e.textContent||'';if(t.length>240||e.closest('form,.w-form'))return;e.textContent=e.closest(J)?COPY.engineerBody:COPY.startupBody});var jm=q(J);if(jm)qa('*',jm).forEach(function(e){if(e.children.length||e.closest('form,.w-form'))return;var t=(e.textContent||'').trim();if(/^ENGINEER APPLICATION$|^CANDIDATE APPLICATION$/i.test(t))e.textContent='SF STARTUP ROLES'})}
/** Brand wordmark font: rely on the --dg-cyber CSS fallback chain (ui-sans-serif, system-ui), NOT a
 *  runtime external fetch. foot-core injecting <link href=fonts.googleapis.com> added a render-blocking
 *  cross-origin request, broke offline/CSP, and duplicated the head's font ownership — all to swap a
 *  display face on one hero word. The uppercase phosphor styling reads fine on the system fallback. */
function ensureCyberFont() { /* no-op: use CSS var fallback, no external font load */ }

/** Cyber wordmark: split letters for motion. Pure DOM paint. */
function paintCyberWord(el, word) {
  if (!el) return;
  var w = String(word || 'Demigod');
  var reduce =
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) ||
    document.documentElement.classList.contains('dg-reduce');
  el.classList.add('dg-cyber-host');
  if (reduce) {
    el.innerHTML =
      '<span class="dg-cyber-word" aria-label="' +
      w +
      '">' +
      w +
      '</span>';
    return;
  }
  el.innerHTML =
    '<span class="dg-cyber-word" aria-label="' +
    w +
    '">' +
    w
      .split('')
      .map(function (ch, i) {
        var c = ch === ' ' ? '&nbsp;' : ch;
        return (
          '<span class="dg-cyber-ch" style="--i:' +
          i +
          '" data-ch="' +
          ch +
          '">' +
          c +
          '</span>'
        );
      })
      .join('') +
    '</span>';
}

/** Dual-path product H1 (after brand hold). */
function paintDualPathH1(el) {
  if (!el) return;
  el.classList.remove('dg-cyber-host', 'dg-hero-hold', 'dg-hero-morph-out');
  el.setAttribute('data-dg-hero-h1', '1');
  el.setAttribute('data-dg-hero-phase', 'dual');
  el.innerHTML = 'Find talent.<br><em class="dg-em">Find startups.</em>';
  // Keep stable block height so morph does not jump layout
  el.style.minHeight = el.style.minHeight || '';
}

/**
 * Smooth brand hold → dual-path.
 * Jumpiness was: short hold, harsh glitch, 0.4s swap, serif/cyber CSS fight, layout reflow.
 */
function scheduleHeroBrandHold(el) {
  if (!el) return;
  // Codex: ~3× prior 27s hold; calm premium morph (opacity only)
  var HOLD_MS = Number(window.__dgHeroHoldMs) || 81000;
  var FADE_MS = Number(window.__dgHeroFadeMs) || 2800;
  var phase = el.getAttribute('data-dg-hero-phase') || '';
  if (phase === 'dual' || phase === 'hold' || phase === 'morph') return;

  var reduce =
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) ||
    document.documentElement.classList.contains('dg-reduce');
  if (reduce) {
    paintDualPathH1(el);
    return;
  }

  ensureCyberFont();
  el.setAttribute('data-dg-hero-h1', '1');
  el.setAttribute('data-dg-hero-phase', 'hold');
  el.classList.add('dg-hero-hold', 'dg-cyber-host');
  // Reserve two-line height early so dual-path does not shove content
  el.style.minHeight = '2.55em';
  el.style.opacity = '1';
  el.style.transform = 'none';
  el.style.filter = 'none';
  el.style.transition = 'opacity ' + FADE_MS + 'ms cubic-bezier(.4,0,.2,1)';
  paintCyberWord(el, 'Demigod');

  window.clearTimeout(el._dgHeroHoldTimer);
  window.clearTimeout(el._dgHeroMorphTimer);
  el._dgHeroHoldTimer = window.setTimeout(function () {
    try {
      el.setAttribute('data-dg-hero-phase', 'morph');
      el.classList.add('dg-hero-morph-out');
      el.style.opacity = '0';
      el._dgHeroMorphTimer = window.setTimeout(function () {
        paintDualPathH1(el);
        el.classList.add('dg-hero-morph-in');
        void el.offsetWidth;
        el.style.opacity = '0';
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            el.style.opacity = '1';
          });
        });
        window.setTimeout(function () {
          el.classList.remove('dg-hero-morph-in', 'dg-hero-morph-out');
          el.style.transition = '';
          el.style.minHeight = '';
        }, FADE_MS + 80);
      }, FADE_MS);
    } catch (_) {
      paintDualPathH1(el);
    }
  }, HOLD_MS);
}

/* === HERO / CTA SURFACE — dual path pills live in contactStrip; keep sample labels honest === */
function hero(){
  qa('.hero-section h1,.hero-title,.header h1').forEach(function(e){
    e.setAttribute('data-dg-hero-h1','1');
    var phase = e.getAttribute('data-dg-hero-phase') || '';
    if (phase === 'dual') {
      // already settled — keep dual path text stable across re-runs
      if (!/Find talent/i.test(e.textContent || '')) paintDualPathH1(e);
      return;
    }
    if (phase === 'hold' || phase === 'morph') return; // leave timer / fade alone
    scheduleHeroBrandHold(e);
  });
  qa('.hero-section p,.hero-description,.subheading,.header p').forEach(function(e){
    if(e.closest('form,.w-form')||e.id==='dg-cand-kicker'||e.id==='dg-eyebrow'||e.id==='dg-hero-chips'||e.closest('.dg-candidates,#startup-modal,#jobseeker-modal,#dg-path-pills,#dg-hero-chips,#dg-simple-process,#dg-cap-strip,#dg-night-stage'))return;
    var t=e.textContent||'';
    if(t.length>4&&t.length<400)e.textContent=COPY.heroSub;
  });
  // keep frege eyebrow honest on re-run
  var eye=q('#dg-eyebrow'); if(eye) eye.textContent=COPY.badge;
  qa('.badge-text,.hero-badge span:not(.badge-dot)').forEach(function(e){e.textContent=COPY.badge});
  // Hide noisy sample-role wall + empty-state apology; keep process + pricing
  qa('section').forEach(function(s){
    if(!s||s.id==='startup-modal'||s.id==='jobseeker-modal')return;
    if(s.matches&&s.matches('.hero-section,header,footer,.footer'))return;
    if(s.closest&&s.closest('#startup-modal,#jobseeker-modal,header,footer,.footer,.hero-section'))return;
    var head=((s.querySelector('h1,h2,h3')||{}).textContent||'')+' '+(s.getAttribute('aria-label')||'');
    var sniff=head+(s.innerText||'').slice(0,160);
    if(/LIVE ROLES|Example roles|example role/i.test(sniff) && s.querySelector('.roles-grid,.role-card')){
      s.style.setProperty('display','none','important');
      s.setAttribute('data-dg-hidden','roles-simplify');
    } else if (/THE PROCESS|HUMAN-MATCHED STARTUP|PRICING|ONE SIMPLE MODEL/i.test(sniff)) {
      s.style.removeProperty('display');
      s.removeAttribute('data-dg-hidden');
    }
  });
  var emptyNote=q('#dg-roles-empty'); if(emptyNote) emptyNote.remove();
  // Three gates (Operator Calm process)
  qa('.step-card').forEach(function(card,i){
    var title=card.querySelector('.step-title,h3');
    var desc=card.querySelector('.step-desc,p');
    var num=card.querySelector('.step-num');
    var steps=[
      ['Add the signal','Hiring teams share the role and 90-day outcome. Talent shares work, skills, and constraints.'],
      ['Rank, then review','Demigod tech surfaces fit. A human checks the evidence and tradeoffs.'],
      ['Both say yes','Each side reviews privately. We introduce only with mutual interest.']
    ];
    var st=steps[i]||steps[2];
    if(title) title.textContent=st[0];
    if(desc) desc.textContent=st[1];
    if(num) num.textContent=String(i+1).padStart(2,'0');
  });
  qa('.trust-header h2,.trust-section h2,section h2').forEach(function(h){
    var x=(h.textContent||'').trim();
    if(/HUMAN-MATCHED|THE PROCESS|How it works/i.test(x) && h.closest('.trust-section,section')) h.textContent='A match has three gates.';
    if(/ONE SIMPLE MODEL|PRICING|10%/i.test(x) && h.closest('section')) h.textContent='Pricing';
  });
  qa('.trust-header p,.trust-section .paragraph_large').forEach(function(p){
    if(p.closest('#startup-modal,#jobseeker-modal'))return;
    if(/spam|profile|Bay Area|theater|steps|form|tech|human/i.test(p.textContent||'')) p.textContent='Software ranks fit. People review. Mutual yes before intro.';
  });
  qa('.badge-text').forEach(function(b){
    var x=(b.textContent||'').trim();
    if(/^THE PROCESS$/i.test(x)||/^SIMPLE$/i.test(x)) b.textContent='PROCESS';
    if(/^PRICING$/i.test(x)||/^FEE$/i.test(x)) b.textContent='FEE';
    if(/^LIVE ROLES$/i.test(x)||/^SAMPLES$/i.test(x)) b.textContent='SAMPLES';
  });
  // Pricing honesty + simple bullets
  qa('.pricing-card').forEach(function(card){
    qa('div,li,p,span',card).forEach(function(el){
      if(el.children&&el.children.length>2)return;
      var tx=(el.textContent||'').trim();
      if(/^Access to pre-vetted/i.test(tx)||/pre-vetted SF/i.test(tx)) el.textContent='Human-reviewed SF Bay matches';
      if(/Dedicated talent partner/i.test(tx)) el.textContent='Tech match · humans in the loop';
      if(/90-day replacement/i.test(tx)) el.textContent='Replacement policy pending';
      if(/PLACEMENT FEE/i.test(tx)) el.textContent='OF FIRST-YEAR CASH';
    });
  });
  // remove old clutter injects
  ['#demigod-trust-block','#dg-faq','#dg-proof-strip','#dg-pipeline-note','#dg-contact-strip','#dg-faq-jsonld'].forEach(function(sel){
    var el=q(sel); if(el)el.remove();
  });
  // one calm trust line (not three chips)
  var host=q('.hero-actions')||q('.hero-section .w-container')||q('.hero-section')||q('.header');
  if(host&&!q('#dg-hero-chips')&&COPY.heroTrustLine){
    var chips=document.createElement('p');
    chips.id='dg-hero-chips';
    chips.className='dg-trust-line';
    chips.setAttribute('aria-label','What Demigod is');
    chips.textContent=COPY.heroTrustLine;
    if(host.classList&&host.classList.contains('hero-actions')) host.parentNode.insertBefore(chips,host);
    else host.appendChild(chips);
  }
  // only 3 learn-more links (was 8)
  if(host&&!q('#dg-path-pills')){
    var pills=document.createElement('nav');
    pills.id='dg-path-pills';
    pills.setAttribute('aria-label','Learn more');
    pills.innerHTML=
      '<a href="/?p=how" data-dg-page="how">'+COPY.pathHow+'</a>'+
      '<a href="/?p=pricing" data-dg-page="pricing">'+COPY.pathPricing+'</a>'+
      '<a href="/?p=faq" data-dg-page="faq">'+COPY.pathFaq+'</a>';
    var anchor=q('#dg-hero-chips')||host;
    if(anchor.parentNode) anchor.parentNode.insertBefore(pills, anchor.nextSibling);
    else host.appendChild(pills);
  }
}

function wireNavTalent(a){
  if(!a) return;
  a.id=a.id||'dg-nav-talent';
  a.setAttribute('data-demigod-modal','jobseeker');
  a.setAttribute('data-dg-cta','talent');
  a.setAttribute('href','/?wiz=engineer');
  a.setAttribute('aria-label',"I'm looking — open talent profile");
  a.classList.add('is-job');
  var span=a.querySelector('.button_label,.btn-label');
  if(span) span.textContent=COPY.navCtaTalent; else a.textContent=COPY.navCtaTalent;
}

/* ==== SECTION: nav — logo only; dual path lives in hero (no top "I'm hiring") ==== */
function nav(){
  var real=q('nav.w-nav,.w-nav');
  if(real){var inj=q('#dg-top-nav');if(inj)inj.remove();var st=q('#dg-nav-style');if(st)st.remove();document.body.style.paddingTop='';}
  // Hide header/nav primary CTAs — hero dual-path is the only top-of-funnel CTA surface
  qa('nav.w-nav a.button,.w-nav a.button,nav a.button,header a.button,nav a.premium-btn,header a.premium-btn,#dg-nav-hire,#dg-nav-talent,.nav_right a.button,.nav_right a.w-button').forEach(function(a){
    if(a.closest('.hero-actions,#dg-path-pills,#dg-bar,footer,.footer,.pricing-card')) return;
    var t=(a.textContent||'').replace(/\s+/g,' ').trim();
    if(/^(demigod)$/i.test(t)||/i.?m hiring|i.?m looking|hire talent|find talent|get started|post a job|find a job|join network|start$/i.test(t) || a.id==='dg-nav-hire' || a.id==='dg-nav-talent' || a.getAttribute('data-dg-cta')==='hire' || a.getAttribute('data-dg-cta')==='talent'){
      a.style.setProperty('display','none','important');
      a.setAttribute('aria-hidden','true');
      a.setAttribute('tabindex','-1');
    }
  });
  var navCtas=q('#dg-top-nav .dg-nav-ctas'); if(navCtas) navCtas.style.setProperty('display','none','important');
}
function trust(){/* v210: no visual wall — sr-only one-liner for a11y */ var old=q('#demigod-trust-block'); if(old)old.remove(); var f=q('footer,.footer'); if(!f||q('#demigod-trust-block'))return; var el=document.createElement('section'); el.id='demigod-trust-block'; el.setAttribute('aria-label','How it works'); el.style.cssText='position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0'; el.innerHTML='<p>Brief or profile → human match → both sides approve → intro. 10% on hire.</p>'; if(f.parentNode)f.parentNode.insertBefore(el,f); else document.body.appendChild(el); }
function mob(){if(q('#dg-bar'))return;var b=document.createElement('nav');b.id='dg-bar';b.setAttribute('aria-label','Mobile actions');b.innerHTML='<a class="dg-h" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire" aria-label="I&#39;m hiring — open startup brief">'+COPY.ctaFounder+'</a><a class="dg-j" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent" aria-label="I\'m looking — open talent profile">'+COPY.ctaEngineer+'</a>';document.body.appendChild(b)}
function foot(){var f=q('footer,.footer');if(!f)return;if(!q('#dg-legal-links')){var lg=document.createElement('p');lg.id='dg-legal-links';lg.style.cssText='margin:.5rem 0;font-size:.8rem';lg.innerHTML='<span class="dg-foot-primary"><a href="/?p=how" data-dg-page="how">How</a><a href="/?p=pricing" data-dg-page="pricing">Pricing</a><a href="/?p=faq" data-dg-page="faq">FAQ</a><a href="/?p=blog" data-dg-page="blog">Blog</a><a href="/?p=events" data-dg-page="events">Events Bot</a><a href="/?p=contact" data-dg-page="contact">Contact</a></span><span class="dg-foot-more" aria-label="More pages"><a href="/?p=legal" data-dg-page="legal">Legal</a><a href="/?p=pilot" data-dg-page="pilot">Pilot</a><a href="/?p=founders" data-dg-page="founders">Founders</a><a href="/?p=candidates" data-dg-page="candidates">Talent</a><a href="/?p=compare" data-dg-page="compare">Compare</a><a href="/?p=mud" data-dg-page="mud">MUD</a></span><a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a>';f.appendChild(lg);lg.addEventListener('click',function(e){var a=e.target.closest('[data-dg-page]');if(!a)return;e.preventDefault();openPage(a.getAttribute('data-dg-page'),true);})}qa('footer nav,footer ul,footer .w-col,footer [class*="column"],footer section',f).forEach(function(c){var t=c.textContent||'';if(t.length<8||t.length>8000)return;if(/Company|Services|Resources|Legal|ABOUT|TEAM|CAREERS|Facebook|Instagram|LinkedIn|YouTube|GET STARTED/i.test(t)&&!/hello@trydemigod|potter@trydemigod|© 2026/i.test(t))c.style.setProperty('display','none','important')});qa('footer a[href="#"]',f).forEach(function(a){var p=a.closest('li,nav,div')||a;if(!/hello@trydemigod|potter@trydemigod/i.test(p.textContent||''))p.style.setProperty('display','none','important')});qa('footer .footer_icon-group,footer .button-group,footer [class*="social"]',f).forEach(function(g){g.style.setProperty('display','none','important')});var dgFt=f.querySelector('.footer-tagline');if(dgFt){if(dgFt.textContent!==COPY.footerTag)dgFt.textContent=COPY.footerTag;}else if(!q('#demigod-footer-tag')){var p=document.createElement('p');p.id='demigod-footer-tag';p.style.cssText='color:#9ca3af;font-size:.9rem;margin:.5rem 0 1rem;max-width:42rem';p.textContent=COPY.footerTag;var c=f.querySelector('[class*="copyright"],.footer_bottom')||f.lastElementChild;if(c&&c.parentNode)c.parentNode.insertBefore(p,c)}if(!q('#footer-email')){var a=document.createElement('a');a.id='footer-email';a.href='mailto:potter@trydemigod.com';a.textContent='potter@trydemigod.com';a.style.cssText='display:block!important;color:#c9a84c;font-size:.95rem;margin:.75rem 0;text-decoration:none';var c2=f.querySelector('[class*="copyright"],.footer_bottom')||f.lastElementChild;if(c2&&c2.parentNode)c2.parentNode.insertBefore(a,c2)}qa('footer .text-color_secondary,footer [class*="copyright"]',f).forEach(function(el){el.style.fontSize='0.875rem';el.style.lineHeight='1.4';el.textContent='© 2026 Demigod. All rights reserved.'});if(!q('#dg-copyright')&&!qa('footer .text-color_secondary,footer [class*="copyright"]',f).length){var cp=document.createElement('p');cp.id='dg-copyright';cp.textContent='© 2026 Demigod. All rights reserved.';cp.style.cssText='color:#A8A29E;font-size:.875rem;margin:.5rem 0 0';var bot=f.querySelector('.footer_bottom')||f;bot.appendChild(cp)}}
function footerDecisionLinks(){/* v564: keep footer lean — no extra decision links */}
function rmOrphanForms(){qa('form.w-form').forEach(function(f){if(f.closest('#startup-modal,#jobseeker-modal'))return;var n=(f.getAttribute('data-name')||f.name||'').toLowerCase();if(n==='email-form'||n==='test-form'||f.id==='email-form'){(f.closest('section,.w-form-wrap,div')||f).remove()}})}
function hide(f){try{detachTrap(true)}catch(e){}[S,J].forEach(function(id){if(!f&&OPEN===id)return;var m=q(id);if(m){m.style.setProperty('display','none','important');m.style.setProperty('visibility','hidden','important');m.setAttribute('aria-hidden','true');try{m.inert=true}catch(e){m.setAttribute('inert','')}}}); if(document.body){ var prev = document.body.dataset.prevOverflow || ''; var sy = parseInt(document.body.dataset.prevScrollY || '0', 10); document.body.style.overflow = prev; document.body.style.position = ''; document.body.style.top = ''; document.body.style.width = ''; delete document.body.dataset.prevOverflow; delete document.body.dataset.prevScrollY; try { window.scrollTo(0, sy); } catch(e){} } if(document.documentElement) document.documentElement.style.overflow=''; try{var bar=q('#dg-bar');if(bar){bar.style.removeProperty('display');bar.removeAttribute('aria-hidden');}}catch(e){} }
var busy=false,tmr=null,OBS=null,LAST_FOCUS=null,TRAP_H=null;
function focusables(root){if(!root)return[];return qa('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',root).filter(function(el){try{var s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&!el.disabled}catch(e){return true}})}
function attachTrap(m){detachTrap(false);LAST_FOCUS=document.activeElement;TRAP_H=function(e){if(e.key!=='Tab'||!OPEN)return;var modal=q(OPEN);if(!modal)return;var list=focusables(modal);if(!list.length){e.preventDefault();return}var first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();try{last.focus()}catch(_){}}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();try{first.focus()}catch(_){}}else if(!modal.contains(document.activeElement)){e.preventDefault();try{first.focus()}catch(_){}}};document.addEventListener('keydown',TRAP_H,true)}
function detachTrap(restore){if(TRAP_H){document.removeEventListener('keydown',TRAP_H,true);TRAP_H=null}if(restore!==false&&LAST_FOCUS&&LAST_FOCUS.focus){try{LAST_FOCUS.focus()}catch(e){}}LAST_FOCUS=null}
function wizCss(){if(q('#dg-wiz-css'))return;var s=document.createElement('style');s.id='dg-wiz-css';s.textContent=
/* v617 frege-typeform WIZ (closed modals stay closed) — single card, kill Webflow gold shell, quiet progress */
"#startup-modal,#jobseeker-modal{"
+"--wiz-void:#020c08;--wiz-night:#03140d;--wiz-deep:#06271a;--wiz-field:#041a10;"
+"--wiz-line:rgba(166,255,203,.22);--wiz-line-strong:rgba(166,255,203,.48);"
+"--wiz-phosphor:#a6ffcb;--wiz-signal:#10c674;--wiz-paper:#f3f0e7;--wiz-mute:#9aab9f;--wiz-danger:#ffb4a2;"
+"--wiz-serif:Georgia,'Iowan Old Style','Times New Roman',serif;"
+"--wiz-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;"
+"--wiz-sans:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
+"--wiz-radius:8px;--wiz-pad:clamp(1.35rem,4.2vw,2rem)"
+"}"
+"#startup-modal,#jobseeker-modal{"
+"background:rgba(2,12,8,.92)!important;backdrop-filter:blur(16px) saturate(1.08);"
+"align-items:center;justify-content:center;"
+"padding:max(.75rem,env(safe-area-inset-top)) max(.75rem,env(safe-area-inset-right)) max(.75rem,env(safe-area-inset-bottom)) max(.75rem,env(safe-area-inset-left))!important"
+"}"
+"#startup-modal[aria-hidden=true],#jobseeker-modal[aria-hidden=true]{"
+"display:none!important;visibility:hidden!important;pointer-events:none!important"
+"}"
+"#startup-modal[aria-hidden=false],#jobseeker-modal[aria-hidden=false]{"
+"display:flex!important;visibility:visible!important;pointer-events:auto!important"
+"}"
/* Webflow outer shell → transparent; form is THE card */
+"#startup-modal .modal-container,#jobseeker-modal .modal-container{"
+"background:transparent!important;border:0!important;box-shadow:none!important;"
+"padding:0!important;margin:0 auto!important;max-width:26rem!important;width:min(26rem,calc(100vw - 1.5rem))!important;"
+"border-radius:0!important"
+"}"
+"#startup-modal .modal-container > div:not(.w-form):not(.modal-close-btn),"
+"#jobseeker-modal .modal-container > div:not(.w-form):not(.modal-close-btn){"
+"background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important"
+"}"
/* hide Webflow title/subtitle/intro — WIZ owns copy */
+"#startup-modal .modal-title,#jobseeker-modal .modal-title,"
+"#startup-modal .modal-subtitle,#jobseeker-modal .modal-subtitle,"
+"#startup-modal .modal-intro,#jobseeker-modal .modal-intro,"
+"#startup-modal h2.modal-title,#jobseeker-modal h2.modal-title{"
+"display:none!important"
+"}"
/* outer w-form shell transparent */
+"#startup-modal div.w-form,#jobseeker-modal div.w-form,"
+"#startup-modal .w-form:not(form),#jobseeker-modal .w-form:not(form){"
+"background:transparent!important;border:0!important;box-shadow:none!important;"
+"padding:0!important;margin:0!important;max-width:none!important;width:100%!important"
+"}"
/* THE card = form (or .modal-content if present) */
+"#startup-modal .modal-content,#jobseeker-modal .modal-content,"
+"#startup-modal form.dg-wiz-on,#jobseeker-modal form.dg-wiz-on,"
+"#startup-modal form.w-form,#jobseeker-modal form.w-form,"
+"#startup-modal form,#jobseeker-modal form{"
+"position:relative;width:100%!important;max-width:26rem!important;margin:0 auto!important;"
+"background:linear-gradient(165deg,#083222 0%,#03140d 55%,#020f0a 100%)!important;"
+"border:1px solid rgba(166,255,203,.22)!important;border-radius:8px!important;"
+"color:#f3f0e7!important;"
+"box-shadow:0 32px 80px rgba(0,0,0,.55),0 0 0 1px rgba(166,255,203,.05) inset!important;"
+"padding:clamp(1.35rem,4.2vw,2rem)!important;box-sizing:border-box"
+"}"
+"#startup-modal .modal-content form,#jobseeker-modal .modal-content form,"
+"#startup-modal .modal-content .w-form,#jobseeker-modal .modal-content .w-form{"
+"background:transparent!important;border:0!important;box-shadow:none!important;"
+"padding:0!important;margin:0!important;max-width:none!important;width:100%!important;"
+"color:inherit!important"
+"}"
+"#startup-modal .modal-close-btn,#jobseeker-modal .modal-close-btn{"
+"position:absolute;top:.55rem;right:.55rem;z-index:8;"
+"min-width:44px;min-height:44px;border-radius:6px;"
+"border:1px solid rgba(166,255,203,.22)!important;background:transparent!important;"
+"color:#9aab9f!important;font-size:1.1rem;cursor:pointer;"
+"transition:color .15s ease,border-color .15s ease"
+"}"
+"#startup-modal .modal-close-btn:hover,#jobseeker-modal .modal-close-btn:hover{"
+"color:#a6ffcb!important;border-color:rgba(166,255,203,.48)!important"
+"}"
+"#startup-modal .dg-wiz-save,#jobseeker-modal .dg-wiz-save,"
+"#startup-modal .dg-wiz-save-opt,#jobseeker-modal .dg-wiz-save-opt{display:none!important}"
/* head — no gold card nest */
+"#startup-modal .dg-wiz-head,#jobseeker-modal .dg-wiz-head{"
+"position:static!important;z-index:5;background:transparent!important;"
+"padding:0!important;margin:0!important;border:0!important;border-radius:0!important;"
+"box-shadow:none!important;backdrop-filter:none!important;outline:none!important"
+"}"
+"#startup-modal .dg-wiz-head.is-welcome .dg-wiz-progress,"
+"#jobseeker-modal .dg-wiz-head.is-welcome .dg-wiz-progress,"
+"#startup-modal .dg-wiz-head.is-thanks .dg-wiz-progress,"
+"#jobseeker-modal .dg-wiz-head.is-thanks .dg-wiz-progress{display:none!important}"
+"#startup-modal .dg-wiz-progress,#jobseeker-modal .dg-wiz-progress{margin:0 0 .15rem;padding:0;border:0;background:transparent}"
+"#startup-modal .dg-wiz-count,#jobseeker-modal .dg-wiz-count{"
+"display:inline-flex!important;align-items:center;gap:.35rem;"
+"padding:0!important;border:0!important;background:transparent!important;"
+"min-height:auto!important;border-radius:0!important;box-shadow:none!important;"
+"color:#9aab9f!important;font-family:var(--wiz-mono)!important;font-size:.72rem!important;font-weight:500!important;"
+"letter-spacing:.08em!important;text-transform:none!important"
+"}"
+"#startup-modal .dg-wiz-count .dg-cur,#jobseeker-modal .dg-wiz-count .dg-cur{"
+"color:#a6ffcb!important;letter-spacing:.06em;text-transform:none;font-variant-numeric:tabular-nums;font-size:.75rem"
+"}"
+"#startup-modal .dg-wiz-progress-label,#jobseeker-modal .dg-wiz-progress-label{display:none!important}"
+"#startup-modal .dg-wiz-bar,#jobseeker-modal .dg-wiz-bar{"
+"height:2px!important;min-height:2px!important;max-height:2px!important;"
+"background:rgba(166,255,203,.1)!important;border:0!important;border-radius:1px!important;"
+"overflow:hidden!important;margin:.55rem 0 0!important;padding:0!important;box-shadow:none!important"
+"}"
+"#startup-modal .dg-wiz-bar i,#jobseeker-modal .dg-wiz-bar i{"
+"display:block!important;height:100%!important;border-radius:inherit;"
+"background:linear-gradient(90deg,#08a05d,#a6ffcb)!important;"
+"box-shadow:0 0 8px rgba(16,198,116,.3)!important;"
+"transition:width .32s cubic-bezier(.2,.7,.2,1)"
+"}"
/* question + hint */
+"#startup-modal .dg-wiz-q,#jobseeker-modal .dg-wiz-q{"
+"font-family:var(--wiz-serif)!important;"
+"font-size:clamp(1.45rem,4.5vw,1.85rem)!important;font-weight:400!important;"
+"color:#f3f0e7!important;margin:1.2rem 0 .45rem!important;"
+"line-height:1.18;letter-spacing:-.025em;border:0!important;background:transparent!important;padding:0!important"
+"}"
+"#startup-modal .dg-wiz-hint,#jobseeker-modal .dg-wiz-hint{"
+"font-family:var(--wiz-sans)!important;font-size:.9rem!important;"
+"color:#9aab9f!important;margin:0 0 1.25rem!important;line-height:1.45;max-width:36ch;"
+"border:0!important;background:transparent!important;padding:0!important"
+"}"
/* hide native labels when WIZ question owns the copy */
+"#startup-modal form.dg-wiz-on .dg-wiz-show > .w-form-label,"
+"#jobseeker-modal form.dg-wiz-on .dg-wiz-show > .w-form-label,"
+"#startup-modal form.dg-wiz-on .dg-field-wrap.dg-wiz-show > label.w-form-label,"
+"#jobseeker-modal form.dg-wiz-on .dg-field-wrap.dg-wiz-show > label.w-form-label,"
+"#startup-modal form.dg-wiz-on .form-field-group.dg-wiz-show > label,"
+"#jobseeker-modal form.dg-wiz-on .form-field-group.dg-wiz-show > label{"
+"position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;"
+"overflow:hidden!important;clip:rect(0,0,0,0)!important;border:0!important"
+"}"
+"#startup-modal form.dg-wiz-on label.w-checkbox,"
+"#jobseeker-modal form.dg-wiz-on label.w-checkbox{position:relative!important;width:auto!important;height:auto!important;"
+"clip:auto!important;margin:0!important;overflow:visible!important;display:flex!important;align-items:center;gap:.55rem;"
+"color:#f3f0e7;font-size:.95rem;min-height:48px}"
/* inputs — literal colors beat Webflow vars */
+"#startup-modal input:not([type=checkbox]):not([type=radio]):not([type=file]),"
+"#startup-modal select,#startup-modal textarea,"
+"#jobseeker-modal input:not([type=checkbox]):not([type=radio]):not([type=file]),"
+"#jobseeker-modal select,#jobseeker-modal textarea{"
+"width:100%!important;box-sizing:border-box;"
+"font-size:16px!important;min-height:52px!important;line-height:1.4;"
+"font-family:var(--wiz-sans)!important;"
+"background:#041a10!important;border:1px solid rgba(166,255,203,.22)!important;"
+"color:#f3f0e7!important;border-radius:6px!important;"
+"padding:.8rem .95rem!important;"
+"transition:border-color .18s ease,box-shadow .22s ease!important"
+"}"
+"#startup-modal textarea,#jobseeker-modal textarea{min-height:104px!important;resize:vertical}"
+"#startup-modal input:focus-visible,#startup-modal select:focus-visible,#startup-modal textarea:focus-visible,"
+"#jobseeker-modal input:focus-visible,#jobseeker-modal select:focus-visible,#jobseeker-modal textarea:focus-visible{"
+"outline:none!important;border-color:#a6ffcb!important;"
+"box-shadow:0 0 0 3px rgba(16,198,116,.16)!important"
+"}"
+"#startup-modal input::placeholder,#startup-modal textarea::placeholder,"
+"#jobseeker-modal input::placeholder,#jobseeker-modal textarea::placeholder{"
+"color:rgba(154,171,159,.5)!important"
+"}"
+"#startup-modal input[type=checkbox],#startup-modal input[type=radio],"
+"#jobseeker-modal input[type=checkbox],#jobseeker-modal input[type=radio]{accent-color:#10c674;width:1.1rem;height:1.1rem}"
+"#startup-modal input[type=file],#jobseeker-modal input[type=file]{"
+"color:#9aab9f!important;font-size:.85rem;padding:.5rem 0!important;border:0!important;background:transparent!important;min-height:auto"
+"}"
+"#startup-modal .dg-file-honest,#jobseeker-modal .dg-file-honest,"
+"#startup-modal .dg-resume-hint,#jobseeker-modal .dg-resume-hint{color:#9aab9f!important;font-size:.8rem!important}"
+"#startup-modal .dg-wiz-err,#jobseeker-modal .dg-wiz-err,"
+"#startup-modal .dg-wiz-req-err,#jobseeker-modal .dg-wiz-req-err{"
+"color:#ffb4a2!important;font-size:.84rem;margin:.4rem 0 .55rem;font-family:var(--wiz-sans);line-height:1.35"
+"}"
/* nav */
+"#startup-modal .dg-wiz-nav,#jobseeker-modal .dg-wiz-nav{"
+"display:flex!important;gap:.6rem;margin-top:1.5rem;align-items:stretch;border:0!important;background:transparent!important;padding:0!important"
+"}"
+"#startup-modal .dg-wiz-next,#startup-modal .dg-wiz-back,"
+"#jobseeker-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-back{"
+"min-height:52px!important;padding:12px 18px!important;touch-action:manipulation;"
+"border-radius:6px!important;font-family:var(--wiz-mono)!important;font-weight:600!important;"
+"font-size:.84rem!important;letter-spacing:.06em;cursor:pointer;"
+"transition:transform .18s ease,box-shadow .22s ease,border-color .18s ease,background .18s ease!important"
+"}"
+"#startup-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-next{"
+"flex:1;background:rgba(8,160,93,.42)!important;color:#a6ffcb!important;"
+"border:1px solid rgba(166,255,203,.48)!important"
+"}"
+"#startup-modal .dg-wiz-next:hover,#jobseeker-modal .dg-wiz-next:hover{"
+"transform:translateY(-1px);box-shadow:0 12px 32px rgba(16,198,116,.22)!important;"
+"border-color:#a6ffcb!important"
+"}"
+"#startup-modal .dg-wiz-back,#jobseeker-modal .dg-wiz-back,"
+"#startup-modal button.dg-wiz-back,#jobseeker-modal button.dg-wiz-back{"
+"flex:0 0 auto;min-width:5.5rem;background:transparent!important;color:#f3f0e7!important;"
+"border:1px solid rgba(166,255,203,.22)!important;border-color:rgba(166,255,203,.22)!important;"
+"outline-color:#a6ffcb!important"
+"}"
+"#startup-modal .dg-wiz-back:hover,#jobseeker-modal .dg-wiz-back:hover{"
+"border-color:rgba(166,255,203,.48)!important"
+"}"
+"#startup-modal .dg-wiz-next:focus,#startup-modal .dg-wiz-back:focus,"
+"#jobseeker-modal .dg-wiz-next:focus,#jobseeker-modal .dg-wiz-back:focus,"
+"#startup-modal .dg-wiz-next:focus-visible,#startup-modal .dg-wiz-back:focus-visible,"
+"#jobseeker-modal .dg-wiz-next:focus-visible,#jobseeker-modal .dg-wiz-back:focus-visible{"
+"outline:2px solid #a6ffcb!important;outline-offset:3px!important"
+"}"
/* trust notes only on review */
+"#startup-modal form.dg-wiz-on:not([data-dg-wiz-key='__submit__']):not([data-dg-wiz-key='__thanks__']) #dg-fee-note,"
+"#jobseeker-modal form.dg-wiz-on:not([data-dg-wiz-key='__submit__']):not([data-dg-wiz-key='__thanks__']) #dg-fee-note,"
+"#startup-modal form.dg-wiz-on:not([data-dg-wiz-key='__submit__']):not([data-dg-wiz-key='__thanks__']) #dg-submit-trust,"
+"#jobseeker-modal form.dg-wiz-on:not([data-dg-wiz-key='__submit__']):not([data-dg-wiz-key='__thanks__']) #dg-submit-trust,"
+"#startup-modal form.dg-wiz-on:not([data-dg-wiz-key='__submit__']):not([data-dg-wiz-key='__thanks__']) .dg-submit-trust,"
+"#jobseeker-modal form.dg-wiz-on:not([data-dg-wiz-key='__submit__']):not([data-dg-wiz-key='__thanks__']) .dg-submit-trust{"
+"display:none!important"
+"}"
/* review */
+"#startup-modal .dg-wiz-review:empty,#jobseeker-modal .dg-wiz-review:empty{display:none}"
+"#startup-modal .dg-wiz-review,#jobseeker-modal .dg-wiz-review{"
+"border:1px solid rgba(166,255,203,.22)!important;border-radius:6px;padding:.9rem 1rem;"
+"margin:.35rem 0 .75rem;background:rgba(2,12,8,.55)!important;max-height:36vh;overflow:auto"
+"}"
+"#startup-modal .dg-wiz-review h3,#jobseeker-modal .dg-wiz-review h3{"
+"color:#a6ffcb!important;font-size:.68rem;margin:0 0 .55rem;letter-spacing:.14em;"
+"text-transform:uppercase;font-family:var(--wiz-mono);font-weight:600"
+"}"
+"#startup-modal .dg-wiz-review dt,#jobseeker-modal .dg-wiz-review dt,"
+"#startup-modal .dg-wiz-review span,#jobseeker-modal .dg-wiz-review span{"
+"display:block;color:#9aab9f!important;font-size:.68rem;margin-top:.55rem;font-family:var(--wiz-mono);letter-spacing:.04em"
+"}"
+"#startup-modal .dg-wiz-review dd,#jobseeker-modal .dg-wiz-review dd,"
+"#startup-modal .dg-wiz-review em,#jobseeker-modal .dg-wiz-review em{"
+"display:block;font-style:normal;color:#f3f0e7!important;font-size:.95rem;margin:0 0 .1rem;line-height:1.4;font-family:var(--wiz-sans)"
+"}"
+"#startup-modal .dg-wiz-review-signal,#jobseeker-modal .dg-wiz-review-signal{"
+"border-left:2px solid #10c674!important;padding-left:.55rem;margin-left:0"
+"}"
/* thanks */
+"#startup-modal .dg-thanks h3,#jobseeker-modal .dg-thanks h3{"
+"font-family:var(--wiz-serif);font-size:1.45rem;font-weight:400;color:#f3f0e7;margin:.2rem 0 .5rem"
+"}"
+"#startup-modal .dg-thanks p,#jobseeker-modal .dg-thanks p{color:#9aab9f;line-height:1.45}"
+"#startup-modal .dg-thanks-step,#jobseeker-modal .dg-thanks-step{color:#f3f0e7;font-size:.9rem}"
+"#startup-modal .dg-sample-match,#jobseeker-modal .dg-sample-match{display:none!important}"
+"#startup-modal .dg-followup,#jobseeker-modal .dg-followup{display:none!important}"
+"#startup-modal #dg-fee-note,#jobseeker-modal #dg-fee-note,"
+"#startup-modal .dg-submit-trust,#jobseeker-modal .dg-submit-trust{"
+"color:#9aab9f!important;font-size:.8rem!important;line-height:1.4;margin:.75rem 0 0!important"
+"}"
/* motion */
+"#startup-modal .dg-wiz-show,#jobseeker-modal .dg-wiz-show,"
+"#startup-modal .dg-wiz-q.dg-wiz-tick,#jobseeker-modal .dg-wiz-q.dg-wiz-tick,"
+"#startup-modal .dg-wiz-hint.dg-wiz-tick,#jobseeker-modal .dg-wiz-hint.dg-wiz-tick{"
+"animation:dgWizIn .26s cubic-bezier(.2,.7,.2,1) both"
+"}"
+"@keyframes dgWizIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}"
+"@media(max-width:767px){"
+"#startup-modal .dg-wiz-nav,#jobseeker-modal .dg-wiz-nav{flex-direction:column-reverse!important}"
+"#startup-modal .dg-wiz-next,#startup-modal .dg-wiz-back,"
+"#jobseeker-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-back{width:100%!important;min-width:0!important}"
+"}"
+"@media(prefers-reduced-motion:reduce){"
+"#startup-modal .dg-wiz-bar i,#jobseeker-modal .dg-wiz-bar i{transition:none}"
+"#startup-modal .dg-wiz-show,#jobseeker-modal .dg-wiz-show,"
+"#startup-modal .dg-wiz-q,#jobseeker-modal .dg-wiz-q,"
+"#startup-modal .dg-wiz-hint,#jobseeker-modal .dg-wiz-hint,"
+"#startup-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-next{"
+"animation:none!important;transition:none!important;transform:none!important"
+"}"
+"}"
;document.head.appendChild(s)}

function fileUploadHonest(){qa('#startup-modal input[type=file],#jobseeker-modal input[type=file],form input[type=file]').forEach(function(fi){if(fi.dataset.dgFileHonest)return;fi.dataset.dgFileHonest='1';var wrap=fi.closest('.dg-field-wrap,.w-file-upload,div')||fi.parentElement;var hint=document.createElement('p');hint.className='dg-file-honest';hint.style.cssText='color:#A8A29E;font-size:.8rem;margin:.35rem 0';hint.textContent='Tip: paste a Drive/Dropbox link if upload is flaky, or email the file to potter@trydemigod.com.';var link=document.createElement('input');link.type='url';link.className='w-input';link.name=(fi.name||'file')+'-url';link.placeholder='https://… link to file (optional)';if(wrap){wrap.appendChild(hint);wrap.appendChild(link);}var form=fi.closest('form');if(form&&!form.dataset.dgFileVal){form.dataset.dgFileVal='1';form.addEventListener('submit',function(){try{var files=[].slice.call(form.querySelectorAll('input[type=file]'));var urls=[].slice.call(form.querySelectorAll('input[type=url][name$="-url"]'));var hasFile=files.some(function(x){return x.files&&x.files.length});var hasUrl=urls.some(function(x){return (x.value||'').trim().length>8});if(!hasFile&&!hasUrl){/* optional files — allow submit; surface tip only */}else if(!hasFile&&hasUrl){/* ok */} }catch(e){}});}});}

/* === BRAND ASSETS — hero bg + path-pill chrome (dedupe by #dg-brand-assets) === */
/* ==== SECTION: CTA (I'm hiring / Find a job — not two company CTAs) ==== */
function cta(){/*dg-cta-prefetch*/
  try{
    if(!window.__dgCtaPref){
      window.__dgCtaPref=1;
      document.addEventListener('pointerenter',function(e){
        var a=e.target&&e.target.closest&&e.target.closest('[data-dg-cta],.hero-actions a');
        if(!a)return;
        // warm modal shells
        try{ q('#startup-modal'); q('#jobseeker-modal'); }catch(err){}
      },true);
    }
  }catch(e){}

  function wireCta(a, kind){
    if (!a || a.closest('#startup-modal,#jobseeker-modal')) return;
    var hire = kind === 'startup';
    var label = hire ? COPY.ctaFounder : COPY.ctaEngineer;
    try {
      var span = a.querySelector('.btn-label,.button_label,.dg-cta-label');
      if (!span) {
        Array.prototype.forEach.call(a.childNodes, function (n) {
          if (n.nodeType === 3 && String(n.textContent || '').trim()) n.textContent = '';
        });
        if (!a.querySelector('.dg-cta-hint')) {
          span = document.createElement('span');
          span.className = 'dg-cta-label';
          a.appendChild(span);
        } else {
          span = document.createElement('span');
          span.className = 'dg-cta-label';
          a.insertBefore(span, a.firstChild);
        }
      } else {
        Array.prototype.forEach.call(a.childNodes, function (n) {
          if (n.nodeType === 3 && String(n.textContent || '').trim()) n.textContent = '';
        });
      }
      if (hire && /demigod/i.test(label)) {
        span.classList.add('dg-cta-cyber');
        paintCyberWord(span, label);
      } else {
        span.classList.remove('dg-cta-cyber', 'dg-cyber-host');
        span.textContent = label;
      }
    } catch (e) { try { a.textContent = label; } catch (_) {} }
    a.setAttribute('href', hire ? '/?wiz=startup' : '/?wiz=engineer');
    a.setAttribute('data-demigod-modal', hire ? 'startup' : 'jobseeker');
    a.setAttribute('data-dg-cta', hire ? 'hire' : 'talent');
    a.setAttribute('aria-label', hire ? "I'm hiring — open startup brief" : "I'm looking — open talent profile");
    a.classList.toggle('is-talent', hire);
    a.classList.toggle('is-job', !hire);
    // never let a talent card keep is-talent (Webflow class collision)
    if (!hire) { a.classList.remove('is-talent'); a.classList.add('is-job'); }
    else { a.classList.add('is-talent'); a.classList.remove('is-job'); }
  }
  qa('a.premium-btn.is-talent,a.is-talent.premium-btn,a.is-talent').forEach(function(a){
    if(a.closest('#dg-bar,nav,header,.hero-actions')) return;
    if(a.getAttribute('data-dg-cta')==='talent'||a.classList.contains('is-job')) return;
    wireCta(a, 'startup');
  });
  qa('a.premium-btn.is-job,a.is-job.premium-btn,a.is-job').forEach(function(a){
    if(a.closest('.hero-actions')) return; // dual owns hero pair
    if(a.closest('nav,header')&&!a.closest('#dg-bar')) return;
    wireCta(a, 'engineer');
  });
  qa('a,button').forEach(function(a){
    if (a.closest('#startup-modal,#jobseeker-modal,footer,#dg-faq,.hero-actions')) return;
    if (a.getAttribute('data-dg-cta')) return;
    if (a.closest('#dg-path-pills,#dg-bar')) return;
    if (a.classList.contains('is-job')) { wireCta(a, 'engineer'); return; }
    if (a.classList.contains('is-talent')) { wireCta(a, 'startup'); return; }
    var t = (a.textContent || '').trim().split('\n')[0].replace(/\s+/g, ' ');
    if (/^(JOIN NETWORK|GET JOB|FIND A JOB|I'M LOOKING|I'M A CANDIDATE|FIND YOUR NEXT JOB|GET MATCHED|FOR TALENT)$/i.test(t)) {
      wireCta(a, 'engineer'); return;
    }
    if (/^(HIRE TALENT|FIND TALENT|POST A JOB|I'M HIRING|FIND YOUR NEXT HIRE|GET STARTED|CHOOSE COMMISSION)$/i.test(t)) {
      var row = a.parentElement;
      var sibs = row ? qa('a.premium-btn,a.button', row) : [];
      if (sibs.length >= 2 && sibs[1] === a) wireCta(a, 'engineer');
      else wireCta(a, 'startup');
    }
  });
  qa('#dg-path-pills a[data-demigod-modal=startup],#dg-path-pills a.dg-path-hire').forEach(function(a){ wireCta(a, 'startup'); });
  qa('#dg-path-pills a[data-demigod-modal=jobseeker],#dg-path-pills a.dg-path-talent').forEach(function(a){ wireCta(a, 'engineer'); });
  qa('.pricing-card a, .pricing-grid a, [class*=pricing] a.premium-btn, [class*=pricing] a.button').forEach(function(a){
    if (a.closest('#startup-modal,#jobseeker-modal,.hero-actions')) return;
    wireCta(a, 'startup');
  });
  // dual path LAST — hard rebuild so no later wireCta can collapse looking→hire
  (function ensureHeroDual(){
    var host = q('.hero-actions');
    if (!host) {
      var left = q('.hero-content-left') || q('.hero-container') || q('.hero-section');
      if (!left) return;
      host = document.createElement('div');
      host.className = 'hero-actions dg-path-pair';
      host.id = 'dg-hero-actions';
      left.appendChild(host);
    }
    host.classList.add('dg-path-pair');
    host.id = host.id || 'dg-hero-actions';
    // always rebuild — cheap, prevents thrash/overwrite races
    host.innerHTML = '';
    function mk(kind){
      var a = document.createElement('a');
      a.className = 'premium-btn w-button ' + (kind==='hire' ? 'is-talent' : 'is-job');
      a.setAttribute('data-dg-cta', kind);
      a.setAttribute('data-demigod-modal', kind==='hire' ? 'startup' : 'jobseeker');
      a.setAttribute('href', kind==='hire' ? '/?wiz=startup' : '/?wiz=engineer');
      a.setAttribute('aria-label', kind==='hire' ? "I'm hiring — open startup brief" : "I'm looking — open talent profile");
      a.dataset.dgHinted = '1';
      a.innerHTML =
        '<span class="dg-cta-label' +
        (kind === 'hire' ? ' dg-cta-cyber' : '') +
        '"></span>' +
        '<span class="dg-cta-hint">' +
        (kind === 'hire' ? COPY.ctaHireHint : COPY.ctaTalentHint) +
        '</span>';
      var lab = a.querySelector('.dg-cta-label');
      if (kind === 'hire') paintCyberWord(lab, COPY.ctaFounder);
      else if (lab) lab.textContent = COPY.ctaEngineer;
      a.style.cssText = 'display:flex!important;visibility:visible!important;opacity:1!important';
      var w = document.createElement('div');
      w.className = 'dg-cta-wrap dg-in';
      w.style.cssText = 'display:block!important;opacity:1!important';
      w.appendChild(a);
      host.appendChild(w);
      return a;
    }
    mk('hire');
    mk('talent');
    host.dataset.dgDual = '1';
  })();
}
/* dual-path: equal cards with hint inside — no broken flex wraps */
function ctaHints(){
  var host=q('.hero-actions');
  if(!host)return;
  host.classList.add('dg-path-pair');
  // dual path already structured in cta() ensureHeroDual — only fill unhinted leftovers
  if(host.dataset.dgDual==='1'){
    var nudge0=q('#dg-path-nudge'); if(nudge0) nudge0.remove();
    return;
  }
  qa('a[data-dg-cta]',host).forEach(function(a){
    if(a.dataset.dgHinted)return;
    a.dataset.dgHinted='1';
    var wrap=document.createElement('div');
    wrap.className='dg-cta-wrap';
    a.parentNode.insertBefore(wrap,a);
    wrap.appendChild(a);
    var kind=a.getAttribute('data-dg-cta');
    var label=kind==='hire'?COPY.ctaFounder:COPY.ctaEngineer;
    var hint=kind==='hire'?COPY.ctaHireHint:COPY.ctaTalentHint;
    a.innerHTML='<span class="dg-cta-label">'+label+'</span><span class="dg-cta-hint">'+hint+'</span>';
  });
  var nudge=q('#dg-path-nudge'); if(nudge) nudge.remove();
}


/* Night institutional hero art + scroll motion (Frege-inspired) */
/* Art: permanent jsDelivr frege hero/aperture (re-encoded ~q80 for mobile LCP). Grain pure CSS. */
var DG_ART={
  hero:'https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@b22473c0bd8f/art/frege-hero.jpg',
  aperture:'https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@b22473c0bd8f/art/frege-aperture.jpg'
};
function injectNightHero(){
  var hero=q('.hero-section')||q('.header')||q('main')||document.body;
  if(!hero||q('#dg-night-stage'))return;
  var stage=document.createElement('div');
  stage.id='dg-night-stage';
  stage.setAttribute('aria-hidden','true');
  stage.innerHTML=
    '<div class="dg-grain"></div>'+
    '<div class="dg-stars"></div>'+
    '<div class="dg-art-panel">'+
      '<img class="dg-art-img" src="'+DG_ART.hero+'" alt="Demigod — SF night district signal art" width="1280" height="720" decoding="async" fetchpriority="high"/>'+
      '<div class="dg-art-caption">SF BAY · ONE FIT · MUTUAL YES</div>'+
    '</div>';
  // put stage inside hero as first decorative layer
  if(hero.firstChild) hero.insertBefore(stage, hero.firstChild);
  else hero.appendChild(stage);
  try{qa('#dg-cap-strip').forEach(function(el){el.remove();});}catch(e){}
  // eyebrow inject
  if(!q('#dg-eyebrow')){
    var left=q('.hero-content-left')||q('.hero-container')||q('.hero-section');
    if(left){
      var eye=document.createElement('p');
      eye.id='dg-eyebrow';
      eye.className='dg-eyebrow dg-reveal';
      eye.textContent=COPY.badge;
      var h1=left.querySelector('h1,.hero-title');
      if(h1) left.insertBefore(eye,h1);
      else left.prepend(eye);
    }
  }
  // dg-cap-strip removed (v619) — Interface/Control/Intro section deleted
  // aperture art near process section
  var trust=q('.trust-section,section:has(.steps-grid)');
  if(trust&&!q('#dg-aperture')){
    var ap=document.createElement('figure');
    ap.id='dg-aperture';
    ap.className='dg-aperture dg-reveal';
    ap.innerHTML='<img src="'+DG_ART.aperture+'" alt="Scoped passage — ranked fit into human review" width="1440" height="900" loading="lazy" decoding="async"/><figcaption>SCOPED PASSAGE / RANK → REVIEW → MUTUAL YES</figcaption>';
    trust.insertBefore(ap, trust.firstChild);
  }
}
function ensureMotion(){
  if(document.documentElement.dataset.dgMotion==='1')return;
  document.documentElement.dataset.dgMotion='1';
  // pure CSS motion primarily; IO for reveal class (marker is data attr, not empty script)
  try{
    var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    if(reduce){document.documentElement.classList.add('dg-reduce');return;}
    document.documentElement.classList.add('dg-motion');
    var io=new IntersectionObserver(function(ents){
      ents.forEach(function(en){
        if(en.isIntersecting){en.target.classList.add('dg-in');io.unobserve(en.target);}
      });
    },{threshold:0.08,rootMargin:'0px 0px -4% 0px'});
    qa('.dg-reveal,.step-card,.pricing-card,.hero-actions .dg-cta-wrap,#dg-eyebrow,#dg-aperture,h1.hero-title,.hero-section h1').forEach(function(el){
      el.classList.add('dg-reveal');
      io.observe(el);
    });
    // Let the hidden start state paint once; CTA chrome remains gated on honest labels.
    requestAnimationFrame(function(){qa('.hero-section h1,.hero-actions .dg-cta-wrap,#dg-eyebrow').forEach(function(el){el.classList.add('dg-in');});});
    // staggered delay
    qa('.hero-actions .dg-cta-wrap').forEach(function(el,i){el.style.setProperty('--d',(260+i*180)+'ms');});
    qa('.step-card').forEach(function(el,i){el.style.setProperty('--d',(i*110)+'ms');});
  }catch(e){
    try{document.documentElement.classList.add('dg-motion');qa('.dg-reveal').forEach(function(el){el.classList.add('dg-in');});}catch(_){}
  }
}

/* v632: Mutual Signal orb + Fable wordmark (DEMIGOD mono next to mark) */
function ensureLogo(){
  try{
    var mark='<svg class="dg-mark" data-v="632" width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="8" fill="#03140d"/><circle cx="16" cy="16" r="11" fill="none" stroke="#a6ffcb" stroke-width="1.25" opacity="0.55"/><path d="M10.5 16a5.5 5.5 0 0 1 5.5-5.5" fill="none" stroke="#a6ffcb" stroke-width="2.25" stroke-linecap="round"/><path d="M21.5 16a5.5 5.5 0 0 1-5.5 5.5" fill="none" stroke="#10c674" stroke-width="2.25" stroke-linecap="round"/><circle cx="16" cy="16" r="2.35" fill="#a6ffcb"/></svg>';
    qa('a.nav_logo,.nav_logo,a.w-nav-brand,a.logo-link,.logo-link,.w-nav-brand').forEach(function(a){
      if(!a)return;
      a.setAttribute('aria-label','Demigod home');
      /* mark once; wordmark always (early-return was leaving empty DEMIGOD) */
      if(!a.querySelector('svg.dg-mark[data-v="632"]')){
        a.dataset.dgMark='632';
        var icon=a.querySelector('.nav_logo-icon');
        if(icon){
          icon.innerHTML=mark;
          icon.style.cssText='width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0';
        }else{
          var wrap=a.querySelector('svg');
          if(wrap){
            if(wrap.parentElement&&wrap.parentElement!==a)wrap.parentElement.innerHTML=mark;
            else wrap.outerHTML=mark;
          }else{
            a.insertAdjacentHTML('afterbegin','<span class="nav_logo-icon" style="width:28px;height:28px;display:inline-flex">'+mark+'</span>');
          }
        }
      }else{a.dataset.dgMark='632';}
      var name=a.querySelector('[data-brand-name]');
      if(!name){
        name=a.querySelector('.paragraph_large');
        if(!name){
          name=document.createElement('span');
          name.setAttribute('data-brand-name','true');
          a.appendChild(name);
        }
      }
      name.setAttribute('data-brand-name','true');
      name.textContent='Demigod';
      name.classList.add('dg-brand-name');
    });
    if(document.documentElement.dataset.dgFav!=='632'){
      document.documentElement.dataset.dgFav='632';
      try{
        var href='data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2032%2032%22%3E%3Crect%20width%3D%2232%22%20height%3D%2232%22%20rx%3D%228%22%20fill%3D%22%2303140d%22/%3E%3Ccircle%20cx%3D%2216%22%20cy%3D%2216%22%20r%3D%2211%22%20fill%3D%22none%22%20stroke%3D%22%23a6ffcb%22%20stroke-width%3D%221.25%22%20opacity%3D%220.55%22/%3E%3Cpath%20d%3D%22M10.5%2016a5.5%205.5%200%200%201%205.5-5.5%22%20fill%3D%22none%22%20stroke%3D%22%23a6ffcb%22%20stroke-width%3D%222.25%22%20stroke-linecap%3D%22round%22/%3E%3Cpath%20d%3D%22M21.5%2016a5.5%205.5%200%200%201-5.5%205.5%22%20fill%3D%22none%22%20stroke%3D%22%2310c674%22%20stroke-width%3D%222.25%22%20stroke-linecap%3D%22round%22/%3E%3Ccircle%20cx%3D%2216%22%20cy%3D%2216%22%20r%3D%222.35%22%20fill%3D%22%23a6ffcb%22/%3E%3C/svg%3E';
        qa('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(function(l){l.parentNode&&l.parentNode.removeChild(l);});
        var link=document.createElement('link');link.rel='icon';link.type='image/svg+xml';link.href=href;document.head.appendChild(link);
        var apple=document.createElement('link');apple.rel='apple-touch-icon';apple.href=href;document.head.appendChild(apple);
      }catch(eFav){}
    }
  }catch(e){}
}
function brandAssets(){if(q('#dg-brand-assets'))return;var s=document.createElement('style');s.id='dg-brand-assets';s.textContent=
/* v618 Frege-night — large translucent art stage + left scrim; dual-path CTAs primary */
":root{--dg-night:#03140d;--dg-deep:#06271a;--dg-field:#075f3a;--dg-green:#08a05d;--dg-signal:#10c674;--dg-phosphor:#a6ffcb;--dg-paper:#f3f0e7;--dg-paper-mute:#bdc9bf;--dg-ink:#071d13;--dg-rule:rgba(166,255,203,.28);--dg-rule-paper:rgba(3,20,13,.2);--dg-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--dg-sans:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;--dg-serif:Georgia,'Iowan Old Style','Times New Roman',serif;--dg-cyber:'Unbounded',ui-sans-serif,system-ui,sans-serif}"
+"html,body{background:var(--dg-night)!important;color:var(--dg-paper)!important;font-family:var(--dg-sans)!important}"
/* static CSS grain — no remote litter fuse, no infinite composite thrash (Fable #3) */
+"body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:9997;opacity:.055;background-image:radial-gradient(rgba(166,255,203,.11) .6px,transparent .6px),radial-gradient(rgba(243,240,231,.05) .5px,transparent .5px);background-size:3px 3px,5px 5px;background-position:0 0,1px 2px;mix-blend-mode:screen}"
+"@keyframes dgGrain{0%,100%{transform:translate(0,0)}25%{transform:translate(-1%,1%)}50%{transform:translate(1%,-1%)}75%{transform:translate(-1%,-1%)}}"
+"@keyframes dgFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}"
+"@keyframes dgPulse{0%,100%{opacity:.55;filter:drop-shadow(0 0 0 transparent)}50%{opacity:1;filter:drop-shadow(0 0 10px rgba(166,255,203,.55))}}"
+"@keyframes dgStar{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}"
+"@keyframes dgFadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}"
+"@keyframes dgShimmer{0%{background-position:0% 50%}100%{background-position:200% 50%}}"
+"@keyframes dgBorderGlow{0%,100%{box-shadow:0 0 0 0 rgba(166,255,203,0)}50%{box-shadow:0 0 24px 0 rgba(16,198,116,.25)}}"
+"@keyframes dgCtaPhosphor{0%{text-shadow:0 0 0 rgba(166,255,203,0)}45%{text-shadow:0 0 9px rgba(166,255,203,.9),0 0 24px rgba(16,198,116,.5)}100%{text-shadow:0 0 3px rgba(166,255,203,.22)}}"
/* Codex hero: Unbounded + long calm phosphor (no vertical jump / glitch) */
+"@keyframes dgCyberIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}"
+"@keyframes dgCyberBreathe{0%,100%{text-shadow:0 0 8px rgba(166,255,203,.35),0 0 18px rgba(16,198,116,.18)}50%{text-shadow:0 0 11px rgba(166,255,203,.45),0 0 24px rgba(16,198,116,.24)}}"
+"@keyframes dgCyberPulseSoft{0%,100%{opacity:1}50%{opacity:.96}}"
+"@keyframes dgCyberScan{0%,72%{transform:scaleX(0);opacity:0}78%{opacity:.48}88%{transform:scaleX(1);opacity:.22}94%,100%{transform:scaleX(1);opacity:0}}"
+".dg-cyber-host,.dg-cyber-word{font-family:var(--dg-cyber)!important;font-weight:600!important;letter-spacing:.085em!important;text-transform:uppercase!important;color:var(--dg-phosphor)!important;-webkit-text-fill-color:var(--dg-phosphor)!important;text-shadow:0 0 10px rgba(166,255,203,.4),0 0 22px rgba(16,198,116,.2)!important}"
/* beat serif + paper-span rules that caused color/size flash */
+".hero-section h1.dg-hero-hold,.header h1.dg-hero-hold,.hero-section h1.dg-cyber-host,.header h1.dg-cyber-host{font-family:var(--dg-cyber)!important;font-size:clamp(2.6rem,8vw,4.8rem)!important;font-weight:600!important;line-height:1.08!important;letter-spacing:.085em!important;max-width:18ch!important;min-height:2.55em!important;color:var(--dg-phosphor)!important;text-transform:uppercase!important}"
+".hero-section h1.dg-hero-hold.dg-reveal,.header h1.dg-hero-hold.dg-reveal,.hero-section h1.dg-cyber-host.dg-reveal{opacity:1!important;transform:none!important;transition:none!important}"
+".hero-section h1.dg-cyber-host .dg-cyber-ch,.header h1.dg-cyber-host .dg-cyber-ch,.hero-section h1.dg-cyber-host span{color:var(--dg-phosphor)!important;-webkit-text-fill-color:var(--dg-phosphor)!important;background:none!important}"
+".dg-cyber-word{display:inline-flex!important;flex-wrap:nowrap!important;gap:0.02em!important;position:relative!important;align-items:baseline!important}"
+".dg-hero-hold .dg-cyber-word::after{content:'';position:absolute;left:0;right:.085em;bottom:-.16em;height:1px;background:linear-gradient(90deg,transparent,var(--dg-phosphor) 20%,var(--dg-signal) 80%,transparent);transform-origin:left;animation:dgCyberScan 16s cubic-bezier(.22,1,.36,1) .6s infinite;box-shadow:0 0 7px rgba(166,255,203,.28)}"
+".dg-cyber-ch{display:inline-block!important;opacity:0;animation:dgCyberIn 1.2s cubic-bezier(.22,1,.36,1) calc(var(--i,0)*110ms) both,dgCyberBreathe 12s ease-in-out calc(1.2s + var(--i,0)*110ms) infinite}"
/* one letter soft pulse only — sparse over long hold */
+".dg-cyber-ch:nth-child(4){animation:dgCyberIn 1.2s cubic-bezier(.22,1,.36,1) calc(var(--i,0)*110ms) both,dgCyberBreathe 12s ease-in-out calc(1.2s + var(--i,0)*110ms) infinite,dgCyberPulseSoft 19s ease-in-out 2.5s infinite}"
+".dg-cta-cyber.dg-cyber-host,.dg-cta-cyber .dg-cyber-word{font-size:1.02em!important;letter-spacing:.1em!important;font-weight:600!important}"
+".dg-cta-cyber .dg-cyber-ch{animation-duration:1s,10s}"
+".dg-reduce .dg-cyber-ch,.dg-reduce .dg-cyber-word{animation:none!important;opacity:1!important;transform:none!important;filter:none!important}"
+".nav_container,.nav_left,.nav_right{background:transparent!important}"
+".nav_container{position:sticky!important;top:0!important;z-index:50!important;display:flex!important;align-items:center!important;justify-content:space-between!important;padding:.85rem 1.25rem!important;backdrop-filter:blur(12px);background:rgba(3,20,13,.88)!important;border-bottom:1px solid var(--dg-rule)!important}"
+"#main,main,h1.hero-title,.hero-section,.hero-section h1,#dg-page{scroll-margin-top:5.5rem!important}"
/* v632 Fable: DEMIGOD mono wordmark — balanced to 28px mark, flex gap */
+"a.nav_logo,.nav_logo,a.w-nav-brand,.w-nav-brand,a.logo-link,.logo-link{display:inline-flex!important;align-items:center!important;gap:.625rem!important;text-decoration:none!important}"
+".nav_logo .paragraph_large,[data-brand-name],.dg-brand-name{font-family:var(--dg-mono)!important;color:var(--dg-paper)!important;font-size:.9rem!important;font-weight:600!important;letter-spacing:.18em!important;text-transform:uppercase!important;line-height:1!important;margin:0 -.18em 0 0!important;white-space:nowrap!important}"
+"a.nav_logo:hover [data-brand-name],a.nav_logo:hover .dg-brand-name,.w-nav-brand:hover [data-brand-name]{color:var(--dg-phosphor)!important}"
+".nav_logo-icon{color:var(--dg-phosphor)!important;animation:none!important;flex-shrink:0!important}"+".nav_logo-icon .dg-mark,.nav_logo-icon svg{display:block!important;width:28px!important;height:28px!important}"
+"@media (max-width:360px){.nav_logo .paragraph_large,[data-brand-name],.dg-brand-name{font-size:.8rem!important;letter-spacing:.14em!important}}"
+"#dg-nav-hire,#dg-nav-talent,#dg-top-nav .dg-nav-ctas,header a.button,header a.premium-btn,nav.w-nav a.button,nav.w-nav a.premium-btn,.nav_right a.button,.nav_right a.w-button,.nav_container a.button.on-inverse{display:none!important}"
+"#dg-bar a.button,#dg-bar a{display:flex!important}"
/* hero night stage */
+".hero-section,.header{position:relative!important;overflow:hidden!important;background:radial-gradient(120% 90% at 80% 20%,rgba(8,160,93,.22),transparent 55%),linear-gradient(180deg,#06271a 0%,#03140d 70%)!important;background-image:none!important;min-height:min(880px,calc(100svh - 52px))!important;display:flex!important;align-items:stretch!important;padding:clamp(2.5rem,7vh,5rem) 1.25rem 3rem!important;border-bottom:1px solid var(--dg-rule)!important}"
+"#dg-night-stage{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}"
+"#dg-night-stage .dg-grain{position:absolute;inset:0;opacity:.22;background-image:radial-gradient(rgba(166,255,203,.16) .7px,transparent .7px);background-size:4px 4px;mix-blend-mode:soft-light;animation:dgGrain 22s steps(6) infinite}"
+"#dg-night-stage .dg-stars{position:absolute;inset:-20%;background:radial-gradient(1px 1px at 20% 30%,var(--dg-phosphor),transparent),radial-gradient(1px 1px at 70% 20%,rgba(166,255,203,.65),transparent),radial-gradient(1.5px 1.5px at 40% 70%,rgba(16,198,116,.75),transparent),radial-gradient(1px 1px at 85% 60%,var(--dg-phosphor),transparent);opacity:.38;animation:dgStar 90s linear infinite}"
/* LARGE translucent art stage — full hero height, right ~64vw (was ~560px card) */
+"#dg-night-stage .dg-art-panel{position:absolute;right:0;top:0;bottom:0;width:min(64vw,960px);height:100%;border:0;overflow:hidden;"
+"-webkit-mask-image:linear-gradient(90deg,transparent 0%,rgba(0,0,0,.35) 12%,#000 28%,#000 100%);"
+"mask-image:linear-gradient(90deg,transparent 0%,rgba(0,0,0,.35) 12%,#000 28%,#000 100%);"
+"animation:none}"
+"#dg-night-stage .dg-art-img{width:100%;height:100%;object-fit:cover;object-position:62% center;display:block;"
+"opacity:.46;filter:saturate(.72) contrast(1.08) brightness(.8);mix-blend-mode:soft-light}"
+"#dg-night-stage .dg-art-caption{position:absolute;right:0;left:auto;bottom:0;max-width:min(28rem,70%);"
+"padding:.5rem .85rem;font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;text-align:right;"
+"color:rgba(166,255,203,.72);background:linear-gradient(90deg,transparent,rgba(3,20,13,.75));font-family:var(--dg-mono)}"
/* left scrim so type always reads over large art */
+".hero-section::after,.header::after{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;"
+"background:linear-gradient(90deg,#03140d 0%,rgba(3,20,13,.96) 28%,rgba(3,20,13,.72) 46%,rgba(3,20,13,.32) 64%,rgba(3,20,13,.08) 82%,transparent 100%)}"
+"@media(max-width:900px){"
+"#dg-night-stage .dg-art-panel{inset:auto 0 0 0;width:100%;height:48%;top:auto;right:0;"
+"-webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 28%,#000 100%);"
+"mask-image:linear-gradient(180deg,transparent 0%,#000 28%,#000 100%)}"
+"#dg-night-stage .dg-art-img{opacity:.32;mix-blend-mode:normal;object-position:center 30%}"
+"#dg-night-stage .dg-art-caption{display:none}"
+".hero-section::after,.header::after{background:linear-gradient(180deg,rgba(3,20,13,.92) 0%,rgba(3,20,13,.78) 42%,rgba(3,20,13,.45) 70%,rgba(3,20,13,.55) 100%)}"
+"}"
+".hero-grid-background,.grid-col-line,.hero-content-right,.statue-frame,.statue-svg,.statue-wrapper{display:none!important}"
+".hero-container,.hero-content-left{position:relative;z-index:2;max-width:min(40rem,46vw)!important;margin:0!important;width:100%!important;padding-right:1rem!important}"
+"@media(max-width:900px){.hero-container,.hero-content-left{max-width:100%!important;padding-right:0!important}}"
+".dg-eyebrow,#dg-eyebrow{font-family:var(--dg-mono)!important;font-size:.72rem!important;letter-spacing:.14em!important;text-transform:uppercase!important;color:var(--dg-signal)!important;margin:0 0 1.1rem!important;opacity:.9}"
+".hero-section h1,.header h1,.hero-title{position:relative;z-index:2;text-shadow:0 2px 28px rgba(3,20,13,.55)!important;letter-spacing:-.035em!important;max-width:14ch!important;font-family:var(--dg-serif)!important;font-size:clamp(2.8rem,7.2vw,4.6rem)!important;font-weight:430!important;line-height:.98!important;margin:.2rem 0 1rem!important;color:var(--dg-paper)!important;text-transform:none!important}"
+".hero-section h1 em,.hero-title em,.dg-em{font-style:italic!important;color:rgba(243,240,231,.88)!important;font-weight:400!important}"
+".title-accent-gold,.title-accent-cream,.title-accent-red,.title-accent-blue,.hero-section h1 span{color:var(--dg-paper)!important;background:none!important;-webkit-text-fill-color:var(--dg-paper)!important}"
+".hero-section p,.header p,.subheading,.hero-description{position:relative;z-index:2;max-width:42ch!important;font-size:1.05rem!important;line-height:1.6!important;color:var(--dg-paper-mute)!important;margin:0 0 1.15rem!important;font-family:var(--dg-sans)!important}"
+".hero-badge,.badge-text{display:none!important}"
+"#dg-hero-chips,.dg-trust-line{position:relative;z-index:2;display:block!important;margin:0 0 1.25rem!important;color:rgba(166,255,203,.75)!important;font-size:.82rem!important;letter-spacing:.04em;background:transparent!important;font-family:var(--dg-mono)!important}"
+"#dg-path-nudge{display:none!important}"
/* dual path frege-bracket cards */
+".hero-actions,.hero-actions.dg-path-pair{position:relative;z-index:5;display:grid!important;grid-template-columns:1fr 1fr!important;gap:.85rem!important;max-width:34rem!important;width:100%!important;margin:.5rem 0 0!important}"
+".hero-actions .dg-cta-wrap{display:block!important;min-width:0!important}"
+".hero-actions .dg-cta-wrap a,.hero-actions a.premium-btn,.hero-actions a.button,.hero-actions a.w-button,.hero-actions a[data-dg-cta]{box-sizing:border-box!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:.25rem!important;width:100%!important;min-height:76px!important;padding:1.05rem 1.15rem!important;border-radius:4px!important;font-weight:600!important;font-size:.95rem!important;line-height:1.25!important;text-decoration:none!important;font-family:var(--dg-mono)!important;cursor:pointer!important;transition:transform .25s ease,box-shadow .35s ease,border-color .25s ease,background .25s ease!important}"
+".hero-actions a[data-dg-cta=hire],.hero-actions a.is-talent{background:linear-gradient(120deg,rgba(8,160,93,.35),rgba(16,198,116,.12))!important;color:var(--dg-phosphor)!important;border:1px solid rgba(166,255,203,.45)!important;box-shadow:0 0 0 0 rgba(166,255,203,0)!important}"
+".hero-actions a[data-dg-cta=hire]:hover,.hero-actions a.is-talent:hover{transform:translateY(-3px)!important;box-shadow:0 12px 40px rgba(16,198,116,.22)!important;border-color:var(--dg-phosphor)!important}"
+".hero-actions a[data-dg-cta=hire] .dg-cta-label,.hero-actions a[data-dg-cta=hire] .dg-cta-hint,.hero-actions a.is-talent .dg-cta-label,.hero-actions a.is-talent .dg-cta-hint{color:var(--dg-phosphor)!important}"
+".hero-actions a[data-dg-cta] .dg-cta-label,.hero-actions a[data-dg-cta] .dg-cta-hint{display:block!important;line-height:1.25!important}"
+".hero-actions a[data-dg-cta=hire] .dg-cta-label:before,.hero-actions a.is-talent .dg-cta-label:before{content:'[ ';opacity:.7}"
+".hero-actions a[data-dg-cta=hire] .dg-cta-label:after,.hero-actions a.is-talent .dg-cta-label:after{content:' → ]';opacity:.7}"
+".hero-actions a[data-dg-cta=talent],.hero-actions a.is-job{background:transparent!important;color:var(--dg-paper)!important;border:1px solid rgba(166,255,203,.28)!important}"
+".hero-actions a[data-dg-cta=talent]:hover,.hero-actions a.is-job:hover{transform:translateY(-3px)!important;border-color:var(--dg-phosphor)!important;box-shadow:0 12px 36px rgba(3,20,13,.45)!important}"
+".hero-actions a[data-dg-cta=talent] .dg-cta-label,.hero-actions a[data-dg-cta=talent] .dg-cta-hint,.hero-actions a.is-job .dg-cta-label{color:var(--dg-paper)!important}"
+".hero-actions a[data-dg-cta=talent] .dg-cta-label:before{content:'[ ';opacity:.55}"
+".hero-actions a[data-dg-cta=talent] .dg-cta-label:after{content:' ]';opacity:.55}"
+".hero-actions a[data-dg-cta=talent] .dg-cta-hint{color:var(--dg-paper-mute)!important;font-size:.78rem!important;font-weight:500!important}"
+".hero-actions a[data-dg-cta=hire] .dg-cta-hint{opacity:.85!important;font-size:.78rem!important;font-weight:500!important}"
+".hero-actions a .btn-arrow,.hero-actions a svg{display:none!important}"
+"#dg-bar{background:rgba(3,20,13,.96)!important;border-top:1px solid var(--dg-rule)!important}"
+"#dg-bar a.dg-h{background:rgba(8,160,93,.35)!important;color:var(--dg-phosphor)!important;border:1px solid rgba(166,255,203,.4)!important}"
+"#dg-bar a.dg-j{background:transparent!important;color:var(--dg-paper)!important;border:1px solid rgba(166,255,203,.28)!important}"
+"#dg-path-pills{position:relative;z-index:2;display:flex!important;flex-wrap:wrap!important;gap:.35rem 1.15rem!important;margin:1.25rem 0 0!important;padding:1rem 0 0!important;border-top:1px solid var(--dg-rule)!important;background:transparent!important}"
+"#dg-path-pills a{color:var(--dg-paper-mute)!important;font-size:.82rem!important;letter-spacing:.06em!important;text-transform:lowercase!important;text-decoration:none!important;background:transparent!important;border:0!important;min-height:40px!important;display:inline-flex!important;align-items:center!important;transition:color .2s ease!important}"
+"#dg-path-pills a:hover{color:var(--dg-phosphor)!important}"
+"#dg-cap-strip{display:none!important}"
/* below fold night institutional */
+"#demigod-trust-block,#dg-faq,#dg-proof-strip,#dg-pipeline-note,#dg-contact-strip,#dg-hero-trust,#insights-section,.insights-section{display:none!important}"
+"section.trust-section,section:has(.steps-grid),section:has(.pricing-grid),body>section:not(.modal-overlay):not(#startup-modal):not(#jobseeker-modal),.w-section{display:block!important;visibility:visible!important;opacity:1!important;background:var(--dg-night)!important;background-image:none!important;color:var(--dg-paper)!important;padding:clamp(4.5rem,10vh,7rem) 1.25rem!important;border-top:1px solid var(--dg-rule)!important}"
+"section:has(.roles-grid),[data-dg-hidden=roles-simplify]{display:none!important}"
+".trust-header h2,.heading_tertiary,section h2,.step-title{color:var(--dg-paper)!important;font-family:var(--dg-serif)!important;font-size:clamp(1.6rem,3.5vw,2.35rem)!important;font-weight:430!important;letter-spacing:-.03em!important;margin:.5rem 0 .55rem!important}"
+".trust-header p,.paragraph_large,.step-desc{color:var(--dg-paper-mute)!important;font-size:.95rem!important;max-width:44ch;font-family:var(--dg-sans)!important;line-height:1.55!important}"
+".steps-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:1rem!important;max-width:56rem;margin:0 auto!important}"
+".step-card{background:rgba(255,255,255,.03)!important;border:1px solid var(--dg-rule)!important;border-radius:4px!important;padding:1.2rem 1.1rem!important;color:var(--dg-paper)!important;transition:transform .3s ease,border-color .3s ease,box-shadow .35s ease!important}"
+".step-card:hover{transform:translateY(-4px)!important;border-color:rgba(166,255,203,.55)!important;box-shadow:0 16px 40px rgba(0,0,0,.35)!important}"
+".step-num{color:var(--dg-phosphor)!important;font-size:.72rem!important;font-weight:700!important;letter-spacing:.14em!important;font-family:var(--dg-mono)!important}"
+".step-title{font-size:1.15rem!important}"
+".pricing-grid,.pricing-grid.is-single{display:block!important;max-width:28rem;margin:0 auto!important}"
+".pricing-card{background:rgba(255,255,255,.03)!important;border:1px solid var(--dg-rule)!important;border-radius:4px!important;padding:1.7rem 1.45rem!important;color:var(--dg-paper)!important;animation:dgBorderGlow 5s ease-in-out infinite}"
+".pricing-card h3{color:var(--dg-signal)!important;letter-spacing:.12em!important;font-size:.7rem!important;text-transform:uppercase!important;font-family:var(--dg-mono)!important}"
+".pricing-card .pricing-amount,.pricing-card .price,.pricing-card > div > div{color:var(--dg-paper)!important;font-family:var(--dg-serif)!important}"
+".pricing-card a.premium-btn,.pricing-card a.button{margin-top:1.1rem!important;min-height:48px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:4px!important;background:rgba(8,160,93,.4)!important;color:var(--dg-phosphor)!important;border:1px solid rgba(166,255,203,.45)!important;padding:.7rem 1.2rem!important;font-family:var(--dg-mono)!important}"
+"#dg-aperture{margin:0 auto 2rem;max-width:56rem;border:1px solid var(--dg-rule);overflow:hidden}"
+"#dg-aperture img{display:block;width:100%;height:auto;filter:saturate(.9)}"
+"#dg-aperture figcaption{font-size:.65rem;letter-spacing:.12em;padding:.55rem .75rem;color:var(--dg-phosphor);font-family:var(--dg-mono);border-top:1px solid var(--dg-rule);background:rgba(3,20,13,.9)}"
+"#dg-legal-links{display:flex!important;flex-direction:column!important;align-items:center!important;gap:.45rem!important;margin:.75rem auto!important}"
+"#dg-legal-links a{color:var(--dg-paper-mute)!important;font-size:.82rem!important;text-decoration:none!important;min-height:40px!important;display:inline-flex!important;align-items:center!important}"
+"#dg-legal-links a:hover{color:var(--dg-phosphor)!important}"
+"#footer-email,footer a[href^=mailto]{color:var(--dg-phosphor)!important;text-decoration:none!important}"
+"footer .w-layout-grid,footer .footer_icon-group,footer .button-group,footer nav:not(:has(a[href^=mailto])),footer ul{display:none!important}"
+"footer,.footer{padding:2.25rem 1rem 2.75rem!important;text-align:center!important;border-top:1px solid var(--dg-rule)!important;max-width:36rem;margin-inline:auto;background:var(--dg-night)!important}"
+"#demigod-footer-tag,footer .footer-tagline{font-size:.85rem!important;color:var(--dg-paper-mute)!important}"
+"#dg-copyright,footer [class*=copyright],footer .text-color_secondary{color:rgba(189,201,191,.65)!important;font-size:.78rem!important}"
+"a:focus-visible,button:focus-visible,.premium-btn:focus-visible,#dg-bar a:focus-visible{outline:2px solid var(--dg-phosphor)!important;outline-offset:3px!important}"
/* motion reveals */
+".dg-reveal{opacity:0;transform:translateY(22px);transition:opacity 1.25s cubic-bezier(.16,1,.3,1),transform 1.25s cubic-bezier(.16,1,.3,1);transition-delay:var(--d,0ms)}"
+".hero-section h1.dg-reveal,.header h1.dg-reveal{transform:translateY(38px);transition-duration:1.65s}"
+".dg-reveal.dg-in,.dg-motion .dg-reveal.dg-in{opacity:1;transform:none}"
+"body.dg-ready .hero-actions .dg-cta-wrap.dg-in a[data-dg-cta=hire] .dg-cta-label,body[data-dg-ready=\"1\"] .hero-actions .dg-cta-wrap.dg-in a[data-dg-cta=hire] .dg-cta-label{animation:dgCtaPhosphor 2.4s cubic-bezier(.16,1,.3,1) var(--d,0ms) both}"
+"body.dg-ready .hero-actions .dg-cta-wrap.dg-in a[data-dg-cta=hire] .dg-cta-cyber .dg-cyber-ch{text-shadow:0 0 8px rgba(166,255,203,.75)}"
+".dg-reduce .dg-reveal{opacity:1!important;transform:none!important;transition:none!important}"
+".dg-reduce body::before,.dg-reduce #dg-night-stage .dg-grain,.dg-reduce #dg-night-stage .dg-stars,.dg-reduce #dg-night-stage .dg-art-panel,.dg-reduce .nav_logo-icon,.dg-reduce .pricing-card{animation:none!important}"
+"@media(max-width:767px){#dg-path-pills{display:none!important}.hero-actions{display:none!important}#dg-bar{position:fixed!important;left:0;right:0;bottom:0;z-index:9998;display:grid!important;grid-template-columns:1fr 1fr;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px))!important}#dg-bar a{min-height:48px!important;border-radius:4px!important;font-size:.88rem!important;font-weight:650!important;display:flex!important;align-items:center!important;justify-content:center!important;text-decoration:none!important}body{padding-bottom:calc(72px + env(safe-area-inset-bottom,0px))!important}.steps-grid{grid-template-columns:1fr!important}.hero-section h1,.header h1{font-size:clamp(2.2rem,10vw,3rem)!important}}"
+"@media(min-width:768px){#dg-bar{display:none!important}body{padding-bottom:0!important}}"
+"@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}"
+"";document.head.appendChild(s)}


function ensureA11yCss(){try{qa('.modal-close-btn').forEach(function(b){if(!b.getAttribute('aria-label'))b.setAttribute('aria-label','Close');});}catch(e){}if(q('#dg-focus-ring'))return;var fr=document.createElement('style');fr.id='dg-focus-ring';fr.textContent='a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible,.premium-btn:focus-visible,.dg-page-x:focus-visible,#dg-bar a:focus-visible{outline:2px solid #C9A84C!important;outline-offset:3px!important}.modal-close-btn{min-width:44px!important;min-height:44px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}';document.head.appendChild(fr);if(!q('#dg-legal-mobile')){var lm=document.createElement('style');lm.id='dg-legal-mobile';lm.textContent='@media(max-width:767px){#dg-legal-links{font-size:.75rem!important;gap:.25rem .55rem!important;padding:0 .5rem;justify-content:center}#dg-legal-links a{margin-right:0!important}}';document.head.appendChild(lm)}}
function ensureForcedColorsCss(){if(q('#dg-forced-colors'))return;var fc=document.createElement('style');fc.id='dg-forced-colors';fc.textContent='@media(forced-colors:active){#startup-modal .dg-wiz-head,#jobseeker-modal .dg-wiz-head,#startup-modal .dg-wiz-chrome,#jobseeker-modal .dg-wiz-chrome{border:1px solid CanvasText!important;forced-color-adjust:auto}#startup-modal .dg-wiz-bar,#jobseeker-modal .dg-wiz-bar{border:1px solid CanvasText!important;background:Canvas!important}#startup-modal .dg-wiz-bar>i,#jobseeker-modal .dg-wiz-bar>i{background:Highlight!important;box-shadow:none!important}}';document.head.appendChild(fc)}
function run(){if(busy)return;busy=true;try{brandAssets();ensureA11yCss();ensureForcedColorsCss()}catch(e){}if(OBS)OBS.disconnect();try{forceMainVisible();skipLink();heroImgPerf();lazyBelowFold();wizCss();faqCss();hero();injectNightHero();copy();forms();fileUploadHonest();cta();ctaHints();nav();ensureMotion();try{wireLogoHome();ensureLogo()}catch(e){}(function roles(){qa('h2').forEach(function(h){if(/Live SF startup roles hiring now/i.test(h.textContent||''))h.textContent='Example roles — labeled samples'});qa('.badge-text').forEach(function(b){if(/^LIVE ROLES$/i.test((b.textContent||'').trim()))b.textContent='EXAMPLE ROLES'});qa('.role-card').forEach(function(c){if(c.querySelector('.dg-sample-tag'))return;var tag=document.createElement('span');tag.className='dg-sample-tag';tag.textContent='Sample';tag.style.cssText='display:inline-block;font-size:.68rem;font-weight:600;color:#A8A29E;border:1px solid rgba(201,168,76,.35);border-radius:4px;padding:1px 6px;margin:0 0 .35rem;letter-spacing:.06em;text-transform:uppercase';var title=c.querySelector('h3,.role-title-text');if(title)c.insertBefore(tag,title);else c.prepend(tag)});var junk=new RegExp(['l','orem'].join('')+'|consectetur','i');qa('section,div,[class*=role]').forEach(function(c){if(c!==document.body&&c!==document.documentElement&&!c.matches?.('main,.hero-section,header,footer')&&junk.test(c.textContent||'')&&(c.textContent||'').length<2000)c.style.setProperty('display','none','important')});var ins=q('#insights-section');if(ins)ins.style.setProperty('display','none','important');qa('h3.step-title,.step-title,h2,h3').forEach(function(h){if(/Meet Your 3-5|Lightning Fast|100% Vetted/i.test(h.textContent||'')){var card=h.closest('.step-card,div,section')||h;if(/Meet Your 3-5|Meet Your\s*3/i.test(h.textContent||'')){h.textContent='Meet curated matches';var d=card.querySelector&&card.querySelector('.step-desc,p');if(d&&/3[\s–-]5|pre-vetted candidates|highly aligned/i.test(d.textContent||''))d.textContent='Startups get curated matches — no volume promise.';}if(/Lightning Fast/i.test(h.textContent||''))h.textContent='Human-paced matching';if(/^100% Vetted/i.test(h.textContent||''))h.textContent='Human-reviewed'}});qa('p.step-desc,.step-desc').forEach(function(p){if(/3[\s–-]5|pre-vetted candidates|highly aligned/i.test(p.textContent||''))p.textContent='Startups get curated matches — no volume promise.';});qa('p,li,span,div').forEach(function(el){if(el.children&&el.children.length>2)return;var tx=el.textContent||'';if(tx.length>200)return;if(/90-?\s*day replacement guarantee/i.test(tx)&&!el.closest('#startup-modal,#jobseeker-modal')){el.textContent=tx.replace(/90-?\s*day replacement guarantee/ig,'90-day outcome focus (replacement policy pending)')}})})();trust();try{injectBlogHome()}catch(eBlogH){}mob();foot();footerDecisionLinks();rmOrphanForms();successCta();if(!OPEN)hide();/* v210: essays off; trust sr-only */dedupeAll();scrubTimeClaims();scrubStaticLabels();scrubBadStaticClaims();scrubContactEmail();try{hero()}catch(e){}try{document.documentElement.classList.add('dg-cta-honest','dg-pricing-honest','dg-volume-honest','dg-contact-honest')}catch(e){}qa('a[target=_blank]').forEach(function(a){var r=a.getAttribute('rel')||'';if(r.indexOf('noopener')<0)a.setAttribute('rel',(r+' noopener noreferrer').trim())})}catch(e){console.error('Demigod foot fail',e)}finally{if(OBS){OBS.takeRecords();OBS.observe(document.documentElement,{childList:true,subtree:true})}busy=false}}

function dedupeAll(){
  // Extremely aggressive dedupe for duplicate CTAs, badges, footer (Fable spec + live audit findings)
  var killExact = ['FIND TALENT', 'HIRE TALENT', 'JOIN NETWORK', "I'M HIRING", 'FIND A JOB', 'SF BAY AREA STARTUP MATCHING'];
  killExact.forEach(function(needle){
    var matches = [];
    qa('a, button, .button, .premium-btn, [data-demigod-modal], .badge-text, .eyebrow').forEach(function(el){
      if (el.closest('#dg-bar,#dg-path-pills,.hero-actions')) return;
      if (el.closest && el.closest('a.premium-btn')) return;
      var t = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (t.toUpperCase() === needle) matches.push(el);
    });
    for (var i = 1; i < matches.length; i++) {
      var el = matches[i];
      dgHide(el.closest('li,div,nav,header,.w-nav, .badge, .hero-badge, .w-form') || el);
    }
  });

  // Extra badges / repeated eyebrow
  qa('.badge-text, .eyebrow').forEach(function(b, i){ if (i > 0) dgHide(b); });

  // Footer copyright / repeated lines
  var f = q('footer,.footer');
  if (f) {
    var seenF = {};
    qa('p,span,div,a', f).forEach(function(el){
      var tx = (el.textContent || '').trim().replace(/\s+/g, ' ').toLowerCase();
      if (tx.length > 4 && (/copyright|all rights reserved|demigod/i.test(tx))) {
        if (seenF[tx]) el.style.setProperty('display','none','important');
        else seenF[tx] = true;
      }
    });
  }

  /* v190: seenTop nav dedupe removed — killExact already covers */
}

/* ==== SECTION: honesty scrub (no SLA/48h) ==== */
/* === HONESTY BACKSTOP — scrub runtime/static SLA/48h claims; canonical copy belongs in COPY/Designer === */
function scrubTimeClaims(){
  var bad = /(?:respond|reply|answer|get back)\s+within|within\s*\d+\s*(hours?|hrs?|h|days?)|24\s*h(?:ours?)?|48\s*h(?:ours?)?|same day|quickly|fast response|match(?:es|ing)?\s+within\s+\d+/i;
  var rep = 'potter@trydemigod.com will follow up';
  var fullLeaf = /humans?\s+match\s+within|within\s*48\s*h|within\s*24\s*h|3-?5\s+matches?\s+in\s+\d+/i;
  // Static Webflow pricing FOUC: bare "guarantee" without pending honesty
  var bareGuarantee = /90-?\s*day\s+replacement\s+guarantee|(?<!pending.{0,40})\breplacement guarantee\b/i;
  // Webflow native success boxes — full rewrite (source still has 24h until Designer edit)
  qa('.w-form-done, .w-form-done div, .w-form-done p').forEach(function(el){
    var txt = el.textContent || '';
    if (!txt) return;
    if (el.children && el.children.length > 1) return;
    if (bad.test(txt) || /thank you! we have received/i.test(txt)) {
      el.textContent = 'Thank you! ' + rep + '.';
    }
  });
  // Leaf elements (incl. form success copy + static step titles with 48h)
  qa('*').forEach(function(el){
    if (el.closest('script,style,noscript')) return;
    if (el.children && el.children.length) return;
    var txt = el.textContent || '';
    // Do not skip these leaves — rewrite stale hello@ so public contact stays potter@.
    if (/hello@(?:try)?demigod\.com will follow up/i.test(txt)) {
      el.textContent = txt.replace(/hello@(?:try)?demigod\.com/ig, 'potter@trydemigod.com');
      return;
    }
    if (fullLeaf.test(txt) && txt.length < 120) {
      el.textContent = 'Human review — ' + rep;
      return;
    }
    if (bareGuarantee.test(txt) && txt.length < 200) {
      el.textContent = '10% on hire · 90-day outcome focus (no SLA promise)';
      return;
    }
    if (/pre-vetted|Dedicated talent partner|90-?\s*day replacement/i.test(txt) && txt.length < 160 && !el.closest('#startup-modal,#jobseeker-modal')) {
      el.textContent = txt
        .replace(/Access to pre-vetted SF talent/ig,'Human-reviewed SF Bay matches')
        .replace(/pre-vetted/ig,'human-reviewed')
        .replace(/Dedicated talent partner/ig,'Tech match · humans in the loop')
        .replace(/90-?\s*day replacement guarantee/ig,'90-day outcome focus (replacement policy pending)');
      return;
    }
    if (bad.test(txt)) {
      el.textContent = txt.replace(bad, rep).replace(/\s{2,}/g,' ').trim();
    }
  });
  // Text nodes (catches mixed content)
  try {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) {
      if (!n.nodeValue || !bad.test(n.nodeValue)) continue;
      if (n.parentElement && n.parentElement.closest('script,style')) continue;
      if (fullLeaf.test(n.nodeValue) && n.nodeValue.length < 120) {
        n.nodeValue = 'Human review — ' + rep;
      } else {
        n.nodeValue = n.nodeValue.replace(bad, rep);
      }
    }
  } catch (e) {}
  // Always normalize Webflow success copy (source may still say 24h)
  qa('#startup-modal .w-form-done div, #startup-hire ~ .w-form-done div, .w-form-done div').forEach(function(el){
    if (!el || (el.children && el.children.length)) return;
    var tx = el.textContent || '';
    if (/within|24\s*h|get back to you/i.test(tx) || /we have received your brief/i.test(tx)) {
      el.textContent = 'Thank you! potter@trydemigod.com will follow up.';
    }
  });
}



function scrubContactEmail(){
  try{
    var bad=/hello@(?:try)?demigod\.com/ig;
    var good='potter@trydemigod.com';
    function scrubStr(s){
      if(!s||!bad.test(s)){ bad.lastIndex=0; return s; }
      bad.lastIndex=0;
      return String(s).replace(bad,good);
    }
    var root=document.body||document.documentElement;
    var tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);
    var n,list=[];
    while(n=tw.nextNode()){ if(bad.test(n.nodeValue||'')){ bad.lastIndex=0; list.push(n);} }
    list.forEach(function(tn){ tn.nodeValue=scrubStr(tn.nodeValue||''); });
    qa('a[href*="mailto:"],a[href*="hello@"],form[action*="mailto:"]').forEach(function(a){
      var h=(a.getAttribute('href')||a.getAttribute('action')||'');
      var nh=scrubStr(h);
      if(nh!==h){
        if(a.hasAttribute('href')) a.setAttribute('href',nh);
        if(a.hasAttribute('action')) a.setAttribute('action',nh);
      }
      if(a.textContent) a.textContent=scrubStr(a.textContent);
    });
    /* meta description + Designer data-props leftovers */
    qa('meta[content],[title],[aria-label],[data-props-link],[data-link],[data-props],[data-props-form],[data-props-button]').forEach(function(m){
      ['content','title','aria-label','data-props-link','data-link','href','action','data-props','data-props-form','data-props-button'].forEach(function(attr){
        var c=m.getAttribute(attr); if(c==null) return;
        var nc=scrubStr(c);
        if(nc!==c) m.setAttribute(attr,nc);
      });
    });
    qa('script[type="application/ld+json"]').forEach(function(s){
      var c=s.textContent||'';
      var nc=scrubStr(c);
      if(nc!==c) s.textContent=nc;
    });
    if(document.title) document.title=scrubStr(document.title);
  }catch(e){}
}

function scrubBadStaticClaims(){
  try{
    var reG=/90-?\s*day\s+replacement\s+guarantee|guaranteed\s+(?:free\s+)?replacement|(?<!pending.{0,30})\breplacement guarantee\b/ig;
    var reV=/Meet Your 3-5[^.<]{0,40}|Lightning Fast Matching|100%\s*Vetted/ig;
    var tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null);
    var n,nodes=[];
    while(n=tw.nextNode()){
      var v=n.nodeValue||'';
      if(!v||v.length>300)continue;
      if(reG.test(v)||reV.test(v)){ reG.lastIndex=0; reV.lastIndex=0; nodes.push(n); }
    }
    nodes.forEach(function(tn){
      var v=tn.nodeValue||'';
      var nv=v
        .replace(/90-?\s*day\s+replacement\s+guarantee/ig,'90-day outcome focus (no replacement promise)')
        .replace(/(?<!pending.{0,30})\breplacement guarantee\b/ig,'outcome-focused matching')
        .replace(/guaranteed\s+(?:free\s+)?replacement/ig,'honest matching, humans in the loop')
        .replace(/Meet Your 3-5[^.<]{0,40}/ig,'Meet curated matches')
        .replace(/receive\s+3[\s–-]5\s+highly\s+aligned[^.]{0,100}\.?/ig,'get curated matches — no volume promise.')
        .replace(/3[\s–-]5\s+highly\s+aligned[^.]{0,80}\.?/ig,'curated matches — no volume promise.')
        .replace(/Lightning Fast Matching/ig,'Human-paced matching')
        .replace(/100%\s*Vetted/ig,'Human-reviewed');
      if(nv!==v)tn.nodeValue=nv;
    });
    // hide pricing bullets that are only the bad claim
    qa('div,li,p,span').forEach(function(el){
      if(el.children&&el.children.length)return;
      var tx=(el.textContent||'').trim();
      if(/^90-day outcome focus/i.test(tx)||/^outcome-focused matching$/i.test(tx))return;
      if(/replacement guarantee/i.test(tx)&&tx.length<80){
        el.textContent='90-day outcome focus (no replacement promise)';
      }
    });
  }catch(e){}
}

function scrubStaticLabels(){
  // SAFE scrub: only leaf Webflow title strings. NEVER hide #startup-modal / #jobseeker-modal / form containers.
  try {
    if (document.title && /HIRING FORM|ENGINEER APPLICATION|CANDIDATE APPLICATION|EXAMPLE BRIEFS/i.test(document.title)) {
      document.title = 'Demigod · SF startup talent matching';
    }
  } catch(e){}
  function policyText(t){
    return (t||'').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').replace(/[\u00A0\u202F]/g,' ').replace(/[\u2010-\u2015]/g,'-').trim().replace(/\s+/g,' ');
  }
  // v516: Webflow modal chrome still ships agency-style titles/intros
  qa('.modal-title,h2.modal-title,#startup-modal h2,#jobseeker-modal h2').forEach(function(el){
    var t=policyText(el.textContent);
    if(/^HIRE SF STARTUP TALENT$/i.test(t)||/^FIND TALENT$/i.test(t)||/^HIRE TALENT$/i.test(t)||/^I.?M HIRING$/i.test(t)) el.textContent="I'm hiring";
    else if(/^GET MATCHED TO SF STARTUPS$/i.test(t)||/^JOIN NETWORK$/i.test(t)) el.textContent="I'm looking";
  });
  qa('.modal-subtitle,#startup-modal .modal-subtitle,#jobseeker-modal .modal-subtitle').forEach(function(el){
    var t=policyText(el.textContent);
    if(/STARTUP HIRING FORM|HIRING FORM/i.test(t)) el.textContent='Startup brief';
    else if(/CANDIDATE APPLICATION|ENGINEER APPLICATION/i.test(t)) el.textContent='Talent profile';
  });
  qa('.modal-intro,#startup-modal .modal-intro,#jobseeker-modal .modal-intro').forEach(function(el){
    var t=el.textContent||'';
    if(/curated SF candidates|match you to SF startups/i.test(t)){
      el.textContent=/startup|role|comp/i.test(t)
        ? 'Share the role, skills, and a 90-day outcome. Matched with Demigod tech.'
        : 'One private profile. Shared only when both sides approve.';
    }
  });
  // v517: pricing-card bullets (Webflow canvas still ships agency guarantee language)
  qa('.pricing-card div,.pricing-card li,.pricing-grid div,.pricing-grid li').forEach(function(el){
    if(el.children&&el.children.length>1)return;
    var t=policyText(el.textContent);
    if(!t||t.length>120)return;
    if(/^Access to pre-vetted SF talent$/i.test(t)) el.textContent='Human-reviewed SF Bay matches';
    else if(/^Dedicated talent partner$/i.test(t)) el.textContent='Tech match · humans in the loop';
    else if(/90-?\s*day replacement guarantee/i.test(t)) el.textContent='90-day outcome focus (replacement policy pending)';
    else if(/^pre-vetted$/i.test(t)) el.textContent='human-reviewed';
  });
  var leafRe = /^(STARTUP HIRING FORM|HIRING FORM|ENGINEER APPLICATION|CANDIDATE APPLICATION|Hiring Model|EXAMPLE BRIEFS)$/i;
  qa('h1,h2,h3,.w-form-title,[class*="form-title"],label').forEach(function(el){
    var t = policyText(el.textContent);
    if (!leafRe.test(t)) return;
    if (el.closest && el.closest('.dg-wiz-head,.dg-wiz-nav,.dg-wiz-review,.dg-field-wrap')) return;
    el.style.setProperty('display','none','important');
    el.textContent = '';
  });
  // Webflow canvas honesty backstop: rewrite short labels outside owned UI.
  var staleGetVolume = /\bget\s+(?:(?:a|your)\s+)?(?:3\s*(?:[\s/\u2013\u2014-]|to)\s*5|three\s+to\s+five)\s+(?:(?:curated|matched|screened|vetted|qualified|strong|top)\s+)?(?:candidates?|matches?|profiles?|finalists?|introductions?)\b/ig;
  var staleDeliveryVolume = /\b(?:(?:we(?:['’]ll|\s+will)|demigod\s+will)\s+)?(?:send|deliver|present|provide)\s+(?:you\s+)?(?:with\s+)?(?:3\s*(?:[\s/\u2013\u2014-]|to)\s*5|three\s+to\s+five)\s+(?:(?:curated|matched|screened|vetted|qualified|strong|top|interview[\s-]?ready)\s+)?(?:candidates?|matches?|profiles?|finalists?|introductions?)\b/ig;
  var staleSourcedVolume = /\b(?:(?:we(?:['’]ll|\s+will)|demigod\s+will)\s+)?(?:(?:source|recommend|submit)\s+(?:you\s+)?|introduce\s+(?:you\s+)?(?:to\s+)?|match\s+(?:you\s+)?(?:with\s+)?)(?:3\s*(?:[\s/\u2013\u2014-]|to)\s*5|three\s+to\s+five)\s+(?:(?:curated|matched|screened|vetted|qualified|strong|top|interview[\s-]?ready)\s+)?(?:candidates?|matches?|profiles?|finalists?|introductions?|people|engineers?|talent)\b/ig;
  var staleCandidateGuarantee = /\b90\s*[\u2013\u2014-]?\s*day\s+(?:(?:candidate|hire|talent)\s+)?replacement\s+(?:policy|plan|program|guarantee(?:d)?|promise|coverage|protection)\b/ig;
  var staleGuaranteedPeriod = /\b(?:(?:the|your|our|every|each)\s+)?(?:hire|placement|match|candidate|talent)?\s*(?:is\s+|comes\s+)?guaranteed\s+(?:for|throughout|during)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b/ig;
  var staleIncludedReplacement = /\b(?:(?:every|each|any|the|your|our)\s+)?(?:hire|placement|match)\s+(?:includes?|comes\s+with)\s+(?:a\s+|our\s+)?90\s*[\u2013\u2014-]?\s*day\s+(?:free\s+|no[-\s]?cost\s+|complimentary\s+)?replacement(?:\s+(?:policy|plan|program|guarantee|coverage|protection|service))?\b/ig;
  // Check parents too: Webflow often splits one visible label across nested spans.
  var staleHire = /^(?:FIND(?:\s*(?:&|AND|\+|\/)\s*HIRE)?|HIRE)\s+(?:(?:THE|YOUR|RIGHT|TOP|BEST|GREAT|EXCEPTIONAL|ELITE|PROVEN|VETTED|HIGH[\s-]?CALIBER|WORLD[\s-]?CLASS|STARTUP|TECH|TECHNICAL|ENGINEERING|PRODUCT|DESIGN|GROWTH)\s+)?(?:SF\s+)?(?:(?:TECH|TECHNICAL|ENGINEERING|PRODUCT|DESIGN|GROWTH)\s+)?TALENT(?:\s+(?:FOR\s+(?:(?:YOUR|A|ANY|FAST[\s-]?GROWING|GROWING|SCALING|EARLY[\s-]?STAGE|HIGH[\s-]?GROWTH|VENTURE[\s-]?BACKED)\s+)?(?:TEAMS?|STARTUPS?|COMPAN(?:Y|IES)|FOUNDERS?|SF\s+(?:BAY\s+AREA\s+)?STARTUPS?|OPEN\s+ROLES?|URGENT\s+(?:NEEDS?|ROLES?)|CRITICAL\s+(?:HIRES?|ROLES?)|IMMEDIATE\s+(?:NEEDS?|HIRES?|ROLES?))|YOUR\s+(?:TEAM|STARTUP|COMPANY)\s+(?:NEEDS|DESERVES)|YOU\s+NEED|FOR\s+(?:THE|THIS|YOUR)\s+(?:ROLE|NEXT\s+(?:HIRE|ROLE))|TO\s+(?:GROW|SCALE|BUILD)(?:\s+YOUR)?\s+(?:TEAM|STARTUP|COMPANY)|THAT\s+(?:FITS?|DELIVERS?|PERFORMS?|SHIPS?|STAYS?))|\s+(?:NOW|TODAY|FAST|QUICKLY))?[.!]?(?:\s*[\u2192\u203a\u00bb])?$/i;
  var staleHirePhrase = /\b(?:find(?:\s*(?:&|and|\+|\/)\s*hire)?|hire)\s+(?:(?:the|your|right|top|best|great|exceptional|elite|proven|vetted|high[\s-]?caliber|world[\s-]?class|startup|tech|technical|engineering|product|design|growth)\s+)?(?:SF\s+)?(?:(?:tech|technical|engineering|product|design|growth)\s+)?talent(?:\s+(?:for\s+(?:(?:your|a|any|fast[\s-]?growing|growing|scaling|early[\s-]?stage|high[\s-]?growth|venture[\s-]?backed)\s+)?(?:teams?|startups?|compan(?:y|ies)|founders?|SF\s+(?:Bay\s+Area\s+)?startups?|open\s+roles?|urgent\s+(?:needs?|roles?)|critical\s+(?:hires?|roles?)|immediate\s+(?:needs?|hires?|roles?))|your\s+(?:team|startup|company)\s+(?:needs|deserves)|you\s+need|for\s+(?:the|this|your)\s+(?:role|next\s+(?:hire|role))|to\s+(?:grow|scale|build)(?:\s+your)?\s+(?:team|startup|company)|that\s+(?:fits?|delivers?|performs?|ships?|stays?))|\s+(?:now|today|fast|quickly))?\b/ig;
  var staleVolumeTitle = /^(?:(?:meet|receive|review|see)\s+(?:a\s+|your\s+)?)?(?:(?:(?:a|our|your)\s+)?(?:shortlist|slate|set|batch|group)\s+of\s+)?(?:(?:up\s+to|between)\s+)?(?:3\s*(?:[\s/–—-]|to)\s*5|three\s+to\s+five)\s+(?:(?:of\s+(?:our|the)\s+)?|(?:your|our)\s+)?(?:(?:guaranteed|promised|highly\s+aligned|hand[\s-]?(?:picked|selected)|best[\s-]?fit|carefully\s+(?:matched|selected)|pre[\s-]?vetted|interview[\s-]?ready|role[\s-]?ready|decision[\s-]?ready|offer[\s-]?ready|screened|vetted|top|qualified|great|strong)\s+)?(?:candidates?|applicants?|resumes?|CVs?|matches?|introductions?|people|profiles?|engineers?|developers?|designers?|operators?|builders?|hires?|talent)(?:\s+(?:guaranteed|promised|per\s+role|delivered|presented|introduced|within\s+\d+\s+days?))?[.!]?$/i;
  var staleVolume = /\b(?:(?:meet|receive|review|see)\s+(?:a\s+|your\s+)?)?(?:(?:(?:a|our|your)\s+)?(?:shortlist|slate|set|batch|group)\s+of\s+)?(?:(?:up\s+to|between)\s+)?(?:3\s*(?:[\s/–—-]|to)\s*5|three\s+to\s+five)\s+(?:(?:of\s+(?:our|the)\s+)?|(?:your|our)\s+)?(?:(?:guaranteed|promised|highly\s+aligned|hand[\s-]?(?:picked|selected)|best[\s-]?fit|carefully\s+(?:matched|selected)|pre[\s-]?vetted|interview[\s-]?ready|role[\s-]?ready|decision[\s-]?ready|offer[\s-]?ready|screened|vetted|top|qualified|great|strong)\s+)?(?:candidates?|applicants?|resumes?|CVs?|matches?|introductions?|people|profiles?|engineers?|developers?|designers?|operators?|builders?|hires?|talent)(?:\s+(?:guaranteed|promised|per\s+role|delivered|presented|introduced|within\s+\d+\s+days?))?\b/ig;
  var staleVolumeAfter = /\b(?:(?:a|our|your)\s+)?(?:(?:curated|hand[\s-]?picked|best[\s-]?fit|carefully\s+matched|vetted|top|qualified|great|strong)\s+)?(?:shortlist|slate|set|batch|group)\s+of\s+(?:candidates?|matches?|introductions?|people|profiles?)\s*(?:of\s+)?(?:3\s*(?:[/–—-]|to)\s*5|three\s+to\s+five)(?:\s+(?:per\s+role|within\s+\d+\s+days?))?\b/ig;
  var staleCountBundle = /\b(?:3\s*(?:[\s/–—-]|to)\s*5|three\s+to\s+five)\s+(?:(?:vetted|top|qualified|strong|curated|matched)\s+)?(?:candidate|match|profile)\s+(?:shortlist|slate|set|batch|group)(?:\s+per\s+role)?\b/ig;
  var stalePoolVolume = /\b(?:(?:a|our|your)\s+)?(?:choice|selection|pool|pipeline|roster)\s+of\s+(?:(?:up\s+to|between)\s+)?(?:3\s*(?:[\s/–—-]|to)\s*5|three\s+to\s+five)\s+(?:(?:curated|matched|screened|vetted|qualified|strong|top)\s+)?(?:candidates?|matches?|profiles?|finalists?|people|engineers?|talent)(?:\s+(?:per\s+role|for\s+(?:the|your)\s+role))?\b/ig;
  var staleFinalists = /\b(?:(?:meet|review|receive|see)\s+)?(?:(?:up\s+to|between)\s+)?(?:3\s*(?:[\s/–—-]|to)\s*5|three\s+to\s+five)\s+(?:(?:curated|hand[\s-]?(?:picked|selected)|carefully\s+(?:matched|selected)|matched|pre[\s-]?vetted|interview[\s-]?ready|role[\s-]?ready|decision[\s-]?ready|offer[\s-]?ready|screened|vetted|top|qualified|great|strong)\s+)?finalists?(?:\s+(?:per\s+role|for\s+(?:the|your)\s+role|within\s+\d+\s+days?))?\b/ig;
  var staleMinimumVolume = /\b(?:at\s+least|a\s+minimum\s+of|as\s+many\s+as)\s+(?:3\s*(?:[\s/–—-]|to)\s*5|three\s+to\s+five)\s+(?:(?:curated|matched|vetted|qualified|strong|top)\s+)?(?:candidates?|matches?|profiles?|finalists?|people|talent)\b/ig;
  var staleChoiceVolume = /\b(?:choose|pick|select|interview|compare)\s+(?:from\s+)?(?:(?:up\s+to|between)\s+)?(?:3\s*(?:[\s/–—-]|to)\s*5|three\s+to\s+five)\s+(?:(?:curated|matched|screened|vetted|qualified|strong|top)\s+)?(?:candidates?|matches?|profiles?|finalists?|people|engineers?|talent)(?:\s+(?:per\s+role|for\s+(?:the|your)\s+role))?\b/ig;
  var staleTalentGuarantee = /\b90\s*[–—-]?\s*day\s+(?:hiring|talent)\s+(?:policy|guarantee(?:d)?|promise|commitment|pledge|warranty|assurance)\b|\bguaranteed\s+replacement\s+(?:within|for)\s+(?:the\s+first\s+)?90\s+days?\b/ig;
  var staleOutcomeGuarantee = /\b90\s*[–—-]?\s*day\s+(?:fit|placement|retention|success)\s+(?:policy|guarantee(?:d)?|promise|commitment|pledge|warranty|assurance)\b/ig;
  var staleRiskFreeHiring = /\b(?:90\s*[–—-]?\s*day\s+)?risk[\s-]?free\s+(?:hire|hiring|placement|recruiting)(?:\s+(?:policy|guarantee(?:d)?|promise|commitment|pledge|warranty|assurance))?(?:\s+(?:for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?)?|\b(?:hire|hiring|placement|recruiting)\s+(?:is\s+)?risk[\s-]?free\s+(?:for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b/ig;
  var staleReversedGuarantee = /\b(?:replacement\s+(?:policy|guarantee(?:d)?|promise|commitment|pledge|warranty|assurance|coverage|protection)|replacement\s+is\s+guaranteed)\s+(?:for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b|\b90\s+days?\s+of\s+(?:free\s+|no[-\s]?cost\s+|complimentary\s+)?replacement\s+(?:policy|guarantee|coverage|protection)\b/ig;
  var staleBackedReplacement = /\b(?:we\s+stand\s+behind|(?:your|the|every|each)\s+hire\s+is\s+(?:backed|covered))\s+(?:(?:your|the|every|each)\s+hire\s+)?(?:with|by)\s+(?:our\s+|a\s+)?replacement(?:\s+(?:hire|candidate|search|match))?\s+(?:for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b/ig;
  var staleExpenseReplacement = /\b(?:we(?:['’]ll|\s+will)\s+)?replace\s+(?:them|the\s+hire|your\s+hire|the\s+candidate|your\s+candidate)\s+(?:at\s+(?:our|no)\s+(?:expense|cost)|on\s+us)\s+(?:within|for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b|\breplacement(?:\s+(?:hire|candidate|search|match))?\s+(?:is|will\s+be)\s+(?:at\s+(?:our|no)\s+(?:expense|cost)|on\s+us)\s+(?:within|for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b/ig;
  var staleGuaranteePeriod = /\b(?:90\s*[–—-]?\s*days?\s+of\s+)?(?:free|no[-\s]?cost|no[-\s]?charge)\s+replacement\s+(?:coverage|support|period|protection)|replacement(?:\s+(?:hire|candidate|match|search))?\s+(?:is\s+|will\s+be\s+)?at\s+no\s+(?:(?:extra|additional)\s+)?(?:cost|charge|fee)(?:\s+(?:within|during|in|for)\s+(?:the\s+)?(?:first\s+)?90\s+days?)?|replacement\s+(?:coverage|support|period|protection)\s+at\s+no\s+(?:(?:extra|additional)\s+)?(?:cost|charge|fee)(?:\s+for\s+(?:the\s+first\s+)?90\s+days?)?|(?:90\s*[–—-]?\s*day\s+)?replacement\s+(?:is\s+)?included(?:\s+(?:within|during|in|for)\s+(?:the\s+)?(?:first\s+)?90\s+days?)?|replacement\s+(?:within|during|in|for)\s+(?:the\s+)?(?:first\s+)?90\s+days?\s+(?:is\s+)?included\b/ig;
  var staleComplimentaryReplacement = /\b(?:a\s+)?complimentary\s+(?:replacement|replacement\s+(?:search|match|hire|candidate)|new\s+(?:search|match)|search)(?:\s+(?:within|during|in|for)\s+(?:the\s+)?(?:first\s+)?90\s+days?)?|(?:replacement|replacement\s+(?:search|match|hire|candidate)|new\s+(?:search|match)|search)\s+(?:is|will\s+be)\s+complimentary(?:\s+(?:within|during|in|for)\s+(?:the\s+)?(?:first\s+)?90\s+days?)?\b/ig;
  var staleConditionalReplacement = /\b(?:if|when)\s+(?:the\s+)?(?:hire|candidate|they)\s+(?:leaves?|quits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:the\s+)?(?:first\s+)?90\s+days?,?\s+(?:we(?:['’]ll|\s+will)\s+)?(?:replace\s+(?:them|the\s+hire|the\s+candidate)|find|provide)\s+(?:you\s+)?(?:another|a\s+replacement)?\s*(?:hire|candidate|match)?\b|\b(?:replace\s+(?:the\s+)?(?:hire|candidate)|find|provide\s+(?:you\s+)?(?:another|a\s+replacement)\s+(?:hire|candidate|match))\s+(?:if|when)\s+(?:they|the\s+hire|the\s+candidate)\s+(?:leaves?|quits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b/ig;
  var staleFitReplacement = /\b(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:(?:isn['’]?t|is\s+not|doesn['’]?t|does\s+not|fails?\s+to)\s+(?:(?:the\s+)?(?:right|good|strong)\s+fit|a\s+(?:right|good|strong)\s+fit|meet\s+(?:your|the)\s+expectations?|perform|deliver)|underperforms?|falls?\s+short(?:\s+of\s+(?:your|the)\s+expectations?)?)\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?,?\s+(?:we(?:['’]ll|\s+will)\s+)?(?:replace\s+(?:them|the\s+hire|the\s+candidate)|find|provide)\s+(?:you\s+)?(?:another|a\s+replacement)?\s*(?:hire|candidate|match)?\b/ig;
  var staleShouldReplacement = /\bshould\s+(?:the|your|our)\s+(?:hire|candidate)\s+(?:leave|quit|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)\s+(?:first\s+)?90\s+days?,?\s+(?:we(?:['’]ll|\s+will)\s+)?(?:replace\s+(?:them|the\s+hire|the\s+candidate)|find|provide)\s+(?:you\s+)?(?:another|a\s+replacement)?\s*(?:hire|candidate|match)?\b/ig;
  var staleOfferedReplacement = /\bwe\s+(?:offer|include|provide)\s+(?:you\s+)?(?:a\s+)?(?:free\s+|no[-\s]?cost\s+|complimentary\s+)?replacement(?:\s+(?:search|hire|candidate|match))?\s+(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?\b|\b(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?,?\s+we\s+(?:offer|include|provide)\s+(?:you\s+)?(?:a\s+)?(?:free\s+|no[-\s]?cost\s+|complimentary\s+)?replacement(?:\s+(?:search|hire|candidate|match))?\b/ig;
  var staleSearchRestart = /\b(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?,?\s+(?:we(?:['’]ll|\s+will)\s+)?(?:restart|reopen|rerun|redo|resume|continue)\s+(?:your|the|our)?\s*(?:candidate\s+)?search\s+(?:for\s+free|free\s+of\s+charge|at\s+no\s+(?:(?:extra|additional)\s+)?(?:cost|charge|fee))\b/ig;
  var staleNextSearchFree = /\b(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?,?\s+(?:your|the|our)\s+(?:next|replacement)\s+(?:candidate\s+)?search\s+(?:is|will\s+be)\s+(?:free|covered|on\s+us|included|at\s+no\s+(?:(?:extra|additional)\s+)?(?:cost|charge|fee))\b|\b(?:your|the|our)\s+(?:next|replacement)\s+(?:candidate\s+)?search\s+(?:is|will\s+be)\s+(?:free|covered|on\s+us|included|at\s+no\s+(?:(?:extra|additional)\s+)?(?:cost|charge|fee))\s+(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?\b/ig;
  var staleReplacementCredit = /\b(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?,?\s+(?:we(?:['’]ll|\s+will)\s+)?(?:issue|provide|offer|apply|give)\s+(?:you\s+)?(?:a\s+)?(?:full\s+|100%\s+)?(?:replacement\s+|fee\s+)?(?:credit|refund)\b|\b(?:a\s+)?(?:full\s+|100%\s+)?(?:replacement\s+|fee\s+)?(?:credit|refund)\s+(?:is|will\s+be)\s+(?:issued|provided|offered|applied|given)\s+(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?\b/ig;
  var staleFeeWaiver = /\b(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?,?\s+(?:we(?:['’]ll|\s+will)\s+)?(?:waive|refund|return)\s+(?:your|the)?\s*(?:full\s+|entire\s+|100%\s+)?(?:placement|success|hiring|recruiting)?\s*fee\b|\b(?:we(?:['’]ll|\s+will)\s+)?(?:waive|refund|return)\s+(?:your|the)?\s*(?:full\s+|entire\s+|100%\s+)?(?:placement|success|hiring|recruiting)?\s*fee\s+(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?\b/ig;
  var staleFeeCarryover = /\b(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?,?\s+(?:your|the)?\s*(?:placement|success|hiring|recruiting)?\s*fee\s+(?:is|will\s+be)\s+(?:credited|applied)\s+(?:toward|to)\s+(?:(?:a|your|the)\s+)?(?:next|replacement|new)\s+(?:search|hire|candidate|match)\b|\b(?:your|the)?\s*(?:placement|success|hiring|recruiting)?\s*fee\s+(?:is|will\s+be)\s+(?:credited|applied)\s+(?:toward|to)\s+(?:(?:a|your|the)\s+)?(?:next|replacement|new)\s+(?:search|hire|candidate|match)\s+(?:if|when|should)\s+(?:the|your|our)?\s*(?:hire|candidate|they)\s+(?:leaves?|quits?|exits?|doesn['’]?t\s+(?:work\s+out|stick)|does\s+not\s+(?:work\s+out|stick)|not\s+(?:work\s+out|stick))\s+(?:within|during|in)\s+(?:their|the)?\s*(?:first\s+)?90\s+days?\b/ig;
  var staleFeeBackGuarantee = /\b(?:(?:90\s*[–—-]?\s*day\s+)?replacement|replace\s+(?:the|your|our)?\s*(?:hire|candidate))\s+or\s+(?:(?:we(?:['’]ll|\s+will)\s+)?(?:refund|return)\s+)?(?:your|the)?\s*(?:full\s+|entire\s+|100%\s+)?(?:placement|success|hiring|recruiting)?\s*fee\s*(?:back)?\b/ig;
  var staleMoneyBackGuarantee = /\b(?:(?:90\s*[–—-]?\s*day\s+)?replacement|replace\s+(?:the|your|our)?\s*(?:hire|candidate))\s+or\s+(?:(?:we(?:['’]ll|\s+will)\s+)?(?:refund|return)\s+)?(?:your|the)\s+(?:full\s+|entire\s+|100%\s+)?money\s+back\b/ig;
  var staleReplacementBenefit = /\b(?:our\s+|a\s+|the\s+)?(?:90\s*[–—-]?\s*day\s+)?replacement\s+(?:benefit|perk)(?:\s+(?:is\s+)?included)?\b/ig;
  var staleReplacementSafetyNet = /\b(?:our\s+|a\s+|the\s+)?(?:90\s*[–—-]?\s*day\s+)?replacement\s+(?:safety[\s-]?net|backup|support)(?:\s+(?:is\s+)?included)?\b/ig;
  var staleReplacementInsurance = /\b(?:our\s+|a\s+|the\s+)?(?:90\s*[–—-]?\s*day\s+)?replacement\s+insurance(?:\s+(?:policy|plan|coverage))?(?:\s+(?:is\s+)?included)?\b/ig;
  var staleReplacementReassurance = /\b(?:our\s+|a\s+|the\s+)?(?:90\s*[–—-]?\s*day\s+)?replacement\s+(?:peace\s+of\s+mind|safeguard|fallback)(?:\s+(?:is\s+)?included)?\b/ig;
  var staleReplacementService = /\b(?:our\s+|a\s+|the\s+)?(?:90\s*[–—-]?\s*day\s+)?replacement\s+service(?:\s+(?:is\s+|comes\s+)?(?:included|covered|free|complimentary|guaranteed))?(?:\s+(?:for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?)?\b|\breplacement\s+service\s+(?:for|during|throughout)\s+(?:the\s+)?(?:first\s+)?90\s+days?\b/ig;
  var staleGuarantee = /\b(?:(?:our\s+)?(?:90\s*[–—-]?\s*day\s+)(?:(?:free\s+)?replacement|hire)(?:\s+(?:policy|guarantee(?:d)?|promise|commitment|pledge|warranty|assurance|protection|coverage))?|(?:our\s+)?(?:free\s+)?replacement\s+(?:policy\s+)?(?:guarantee(?:d)?|promise|commitment|pledge|warranty|assurance|assured|protection|coverage)|guaranteed\s+(?:free\s+)?replacement|90\s*[–—-]?\s*day\s+(?:(?:money[-\s]?back|risk[-\s]?free|satisfaction)\s+)?(?:guarantee|warranty|assurance)|(?:your|the)\s+hire\s+(?:is\s+)?(?:backed|covered)\s+by\s+(?:our\s+)?(?:90\s*[–—-]?\s*day\s+)?(?:guarantee|warranty|assurance)|(?:every|each|any)\s+hire\s+(?:(?:is|comes)\s+with\s+|is\s+backed\s+by\s+)?(?:our\s+)?90\s*[–—-]?\s*day\s+(?:guarantee|warranty|assurance)|we\s+stand\s+behind\s+(?:every|each|your|the)\s+hire\s+for\s+90\s+days?|we\s+guarantee\s+(?:your|the)\s+hire\s+for\s+90\s+days?|replacement\s+coverage\s+(?:within|for)\s+(?:the\s+first\s+)?90\s+days?|(?:free|no[-\s]?cost)\s+replacement\s+(?:hire|candidate)|(?:free\s+)?replacement\s+(?:within|for)\s+(?:the\s+first\s+)?90\s+days?|(?:your|the|our)\s+replacement\s+(?:is|will\s+be)\s+(?:free|covered|on\s+us|at\s+no\s+(?:extra\s+)?cost)|(?:free\s+)?replacement\s+(?:is|will\s+be)\s+(?:free|at\s+no\s+(?:extra\s+)?cost)\s+(?:if|when)\s+(?:they|it|the\s+hire|your\s+hire)\s+(?:(?:leave|leaves|quit|quits)|(?:(?:doesn['’]?t|does\s+not)\s+(?:work\s+out|stick)))|(?:we(?:['’]ll|\s+will)\s+)?(?:find|provide)\s+(?:you\s+)?(?:another|a\s+replacement)\s+(?:hire|candidate|replacement)?\s*(?:for\s+free|free\s+of\s+charge|at\s+no\s+(?:extra\s+)?cost)|(?:we(?:['’]ll|\s+will)\s+)?replace\s+(?:them|the\s+hire|your\s+hire|the\s+candidate|your\s+candidate)\s+(?:for\s+free|free\s+of\s+charge|at\s+no\s+(?:extra\s+)?cost)(?:\s+(?:within|for)\s+(?:the\s+first\s+)?90\s+days?)?|(?:we(?:['’]ll|\s+will)\s+)?cover\s+(?:your|the)\s+(?:next|replacement)\s+(?:hire|candidate)|(?:your|the)\s+(?:next|replacement)\s+(?:hire|candidate)\s+(?:is|will\s+be)\s+(?:free|covered|on\s+us|at\s+no\s+(?:extra\s+)?cost)|(?:if|when)\s+(?:they|it|the\s+hire|your\s+hire)\s+(?:(?:leave|leaves|quit|quits)|(?:(?:doesn['’]?t|does\s+not)\s+(?:work\s+out|stick))),?\s+(?:(?:we(?:['’]ll|\s+will)\s+)?replace\s+(?:them|it|the\s+hire)?\s*(?:for\s+free|free\s+of\s+charge|at\s+no\s+(?:extra\s+)?cost)|(?:the\s+)?(?:next|replacement)\s+(?:match|hire|candidate)\s+is\s+on\s+us)|(?:free|no[-\s]?cost)\s+replacement\s+(?:if|when)\s+(?:they|it|the\s+hire)\s+(?:(?:leave|leaves|quit|quits)|(?:(?:doesn['’]?t|does\s+not)\s+(?:work\s+out|stick))))\b/ig;
  function honestStaticCopy(t){
    var out=policyText(t);
    staleGetVolume.lastIndex=0;
    if(staleGetVolume.test(out)){staleGetVolume.lastIndex=0;out=out.replace(staleGetVolume,'receive curated matches');}
    staleDeliveryVolume.lastIndex=0;
    if(staleDeliveryVolume.test(out)){staleDeliveryVolume.lastIndex=0;out=out.replace(staleDeliveryVolume,'we share curated matches when the evidence supports them');}
    staleSourcedVolume.lastIndex=0;
    if(staleSourcedVolume.test(out)){staleSourcedVolume.lastIndex=0;out=out.replace(staleSourcedVolume,'share curated matches when the evidence supports them');}
    staleCandidateGuarantee.lastIndex=0;
    if(staleCandidateGuarantee.test(out)){staleCandidateGuarantee.lastIndex=0;out=out.replace(staleCandidateGuarantee,'90-day outcome focus');}
    staleGuaranteedPeriod.lastIndex=0;
    if(staleGuaranteedPeriod.test(out)){staleGuaranteedPeriod.lastIndex=0;out=out.replace(staleGuaranteedPeriod,'90-day outcome focus');}
    staleIncludedReplacement.lastIndex=0;
    if(staleIncludedReplacement.test(out)){staleIncludedReplacement.lastIndex=0;out=out.replace(staleIncludedReplacement,'includes a 90-day outcome review');}
    // Attribute-only: do not map bare "Find talent" strings that are the dual-path hero.
    if(staleHire.test(out) && !/^Find talent(?:\.\s*Find startups\.?)?$/i.test(out) && !/^I'm hiring\b/i.test(out))return "I'm hiring";
    staleHirePhrase.lastIndex=0;
    if(staleHirePhrase.test(out)){staleHirePhrase.lastIndex=0;out=out.replace(staleHirePhrase,"start a hiring brief");}
    stalePoolVolume.lastIndex=0;
    if(stalePoolVolume.test(out)){stalePoolVolume.lastIndex=0;out=out.replace(stalePoolVolume,'curated matches');}
    staleVolume.lastIndex=0;
    if(staleVolume.test(out)){staleVolume.lastIndex=0;out=staleVolumeTitle.test(out)?'Meet curated matches':out.replace(staleVolume,'a curated shortlist');}
    staleVolumeAfter.lastIndex=0;
    if(staleVolumeAfter.test(out)){staleVolumeAfter.lastIndex=0;out=out.replace(staleVolumeAfter,'a curated shortlist');}
    staleCountBundle.lastIndex=0;
    if(staleCountBundle.test(out)){staleCountBundle.lastIndex=0;out=out.replace(staleCountBundle,'curated matches');}
    staleFinalists.lastIndex=0;
    if(staleFinalists.test(out)){staleFinalists.lastIndex=0;out=out.replace(staleFinalists,'a curated shortlist');}
    staleMinimumVolume.lastIndex=0;
    if(staleMinimumVolume.test(out)){staleMinimumVolume.lastIndex=0;out=out.replace(staleMinimumVolume,'a curated shortlist');}
    staleChoiceVolume.lastIndex=0;
    if(staleChoiceVolume.test(out)){staleChoiceVolume.lastIndex=0;out=out.replace(staleChoiceVolume,'review curated matches');}
    staleGuarantee.lastIndex=0;
    if(staleGuarantee.test(out)){staleGuarantee.lastIndex=0;out=out.replace(staleGuarantee,'90-day outcome focus');}
    staleGuaranteePeriod.lastIndex=0;
    if(staleGuaranteePeriod.test(out)){staleGuaranteePeriod.lastIndex=0;out=out.replace(staleGuaranteePeriod,'90-day outcome focus');}
    staleComplimentaryReplacement.lastIndex=0;
    if(staleComplimentaryReplacement.test(out)){staleComplimentaryReplacement.lastIndex=0;out=out.replace(staleComplimentaryReplacement,'90-day outcome focus');}
    staleConditionalReplacement.lastIndex=0;
    if(staleConditionalReplacement.test(out)){staleConditionalReplacement.lastIndex=0;out=out.replace(staleConditionalReplacement,'90-day outcome focus');}
    staleFitReplacement.lastIndex=0;
    if(staleFitReplacement.test(out)){staleFitReplacement.lastIndex=0;out=out.replace(staleFitReplacement,'90-day outcome focus');}
    staleShouldReplacement.lastIndex=0;
    if(staleShouldReplacement.test(out)){staleShouldReplacement.lastIndex=0;out=out.replace(staleShouldReplacement,'90-day outcome focus');}
    staleOfferedReplacement.lastIndex=0;
    if(staleOfferedReplacement.test(out)){staleOfferedReplacement.lastIndex=0;out=out.replace(staleOfferedReplacement,'90-day outcome focus');}
    staleSearchRestart.lastIndex=0;
    if(staleSearchRestart.test(out)){staleSearchRestart.lastIndex=0;out=out.replace(staleSearchRestart,'90-day outcome focus');}
    staleNextSearchFree.lastIndex=0;
    if(staleNextSearchFree.test(out)){staleNextSearchFree.lastIndex=0;out=out.replace(staleNextSearchFree,'90-day outcome focus');}
    staleReplacementCredit.lastIndex=0;
    if(staleReplacementCredit.test(out)){staleReplacementCredit.lastIndex=0;out=out.replace(staleReplacementCredit,'90-day outcome focus');}
    staleFeeWaiver.lastIndex=0;
    if(staleFeeWaiver.test(out)){staleFeeWaiver.lastIndex=0;out=out.replace(staleFeeWaiver,'90-day outcome focus');}
    staleFeeCarryover.lastIndex=0;
    if(staleFeeCarryover.test(out)){staleFeeCarryover.lastIndex=0;out=out.replace(staleFeeCarryover,'90-day outcome focus');}
    staleFeeBackGuarantee.lastIndex=0;
    if(staleFeeBackGuarantee.test(out)){staleFeeBackGuarantee.lastIndex=0;out=out.replace(staleFeeBackGuarantee,'90-day outcome focus');}
    staleMoneyBackGuarantee.lastIndex=0;
    if(staleMoneyBackGuarantee.test(out)){staleMoneyBackGuarantee.lastIndex=0;out=out.replace(staleMoneyBackGuarantee,'90-day outcome focus');}
    staleReplacementBenefit.lastIndex=0;
    if(staleReplacementBenefit.test(out)){staleReplacementBenefit.lastIndex=0;out=out.replace(staleReplacementBenefit,'90-day outcome focus');}
    staleReplacementSafetyNet.lastIndex=0;
    if(staleReplacementSafetyNet.test(out)){staleReplacementSafetyNet.lastIndex=0;out=out.replace(staleReplacementSafetyNet,'90-day outcome focus');}
    staleReplacementInsurance.lastIndex=0;
    if(staleReplacementInsurance.test(out)){staleReplacementInsurance.lastIndex=0;out=out.replace(staleReplacementInsurance,'90-day outcome focus');}
    staleReplacementReassurance.lastIndex=0;
    if(staleReplacementReassurance.test(out)){staleReplacementReassurance.lastIndex=0;out=out.replace(staleReplacementReassurance,'90-day outcome focus');}
    staleReplacementService.lastIndex=0;
    if(staleReplacementService.test(out)){staleReplacementService.lastIndex=0;out=out.replace(staleReplacementService,'90-day outcome focus');}
    staleTalentGuarantee.lastIndex=0;
    if(staleTalentGuarantee.test(out)){staleTalentGuarantee.lastIndex=0;out=out.replace(staleTalentGuarantee,'90-day outcome focus');}
    staleOutcomeGuarantee.lastIndex=0;
    if(staleOutcomeGuarantee.test(out)){staleOutcomeGuarantee.lastIndex=0;out=out.replace(staleOutcomeGuarantee,'90-day outcome focus');}
    staleRiskFreeHiring.lastIndex=0;
    if(staleRiskFreeHiring.test(out)){staleRiskFreeHiring.lastIndex=0;out=out.replace(staleRiskFreeHiring,'90-day outcome focus');}
    staleReversedGuarantee.lastIndex=0;
    if(staleReversedGuarantee.test(out)){staleReversedGuarantee.lastIndex=0;out=out.replace(staleReversedGuarantee,'90-day outcome focus');}
    staleBackedReplacement.lastIndex=0;
    if(staleBackedReplacement.test(out)){staleBackedReplacement.lastIndex=0;out=out.replace(staleBackedReplacement,'90-day outcome focus');}
    staleExpenseReplacement.lastIndex=0;
    if(staleExpenseReplacement.test(out)){staleExpenseReplacement.lastIndex=0;out=out.replace(staleExpenseReplacement,'90-day outcome focus');}
    return out;
  }
  // Include compact Webflow process/nav wrappers: their visible copy is often split
  // across sibling spans, so no individual leaf contains the complete banned phrase.
  qa('a,button,summary,h1,h2,h3,h4,p,li,span,[role="button"],[role="link"],[role="navigation"],[class*="nav-link"],[class*="step-title"],[class*="process-step"],[class*="pricing"],[class*="guarantee"]').forEach(function(el){
    if (el.closest && el.closest('#startup-modal,#jobseeker-modal,#dg-page,#dg-bar,#dg-path-pills,.hero-actions')) return;
    // Visible text can be fixed while stale Webflow aria-label/title copy keeps
    // announcing the old promise. Apply the same policy scrub to those labels.
    // Webflow/custom components can duplicate visible copy into hover, image,
    // or accessibility attributes. Scrub those policy surfaces too so hidden
    // legacy promises are not announced or revealed after the text is fixed.
    ['aria-label','aria-description','title','data-tooltip','data-label','data-text','alt'].forEach(function(attr){
      if (!el.hasAttribute || !el.hasAttribute(attr)) return;
      var raw = el.getAttribute(attr) || '';
      if (!raw || raw.length > 180) return;
      var clean = honestStaticCopy(raw);
      if (clean !== policyText(raw)) el.setAttribute(attr, clean);
    });
    var t = policyText(el.textContent);
    if (!t || t.length > 180) return;
    staleGetVolume.lastIndex = 0;
    if (staleGetVolume.test(t)) {
      staleGetVolume.lastIndex = 0;
      el.textContent = t.replace(staleGetVolume, 'receive curated matches');
      return;
    }
    staleDeliveryVolume.lastIndex = 0;
    if (staleDeliveryVolume.test(t)) {
      staleDeliveryVolume.lastIndex = 0;
      el.textContent = t.replace(staleDeliveryVolume, 'we share curated matches when the evidence supports them');
      return;
    }
    staleSourcedVolume.lastIndex = 0;
    if (staleSourcedVolume.test(t)) {
      staleSourcedVolume.lastIndex = 0;
      el.textContent = t.replace(staleSourcedVolume, 'share curated matches when the evidence supports them');
      return;
    }
    staleCandidateGuarantee.lastIndex = 0;
    if (staleCandidateGuarantee.test(t)) {
      staleCandidateGuarantee.lastIndex = 0;
      el.textContent = t.replace(staleCandidateGuarantee, '90-day outcome focus');
      return;
    }
    staleGuaranteedPeriod.lastIndex = 0;
    if (staleGuaranteedPeriod.test(t)) {
      staleGuaranteedPeriod.lastIndex = 0;
      el.textContent = t.replace(staleGuaranteedPeriod, '90-day outcome focus');
      return;
    }
    staleIncludedReplacement.lastIndex = 0;
    if (staleIncludedReplacement.test(t)) {
      staleIncludedReplacement.lastIndex = 0;
      el.textContent = t.replace(staleIncludedReplacement, 'includes a 90-day outcome review');
      return;
    }
    // Never rewrite the dual-path hero H1 ("Find talent / Find startups") to the hire CTA.
    // Bare "Find talent." matches staleHire (legacy "Find talent" CTAs); hero must stay.
    if (
      (el.matches && el.matches('h1,.hero-title,.header h1,[data-dg-hero-h1],.dg-em')) ||
      (el.closest && el.closest('h1[data-dg-hero-h1],.hero-section h1,.header h1,h1.hero-title'))
    ) {
      return;
    }
    if (staleHire.test(t) && !/^I'm hiring\b/i.test(t)) {
      el.textContent = "I'm hiring";
      if (el.matches('a,button')) {
        el.setAttribute('aria-label', "I'm hiring — open startup brief");
        el.setAttribute('data-demigod-modal', 'startup');
        el.setAttribute('data-dg-cta', 'hire');
      }
      if (el.matches('a')) el.setAttribute('href', '/?wiz=startup');
      if (el.hasAttribute('title')) el.setAttribute('title', "I'm hiring");
      return;
    }
    staleHirePhrase.lastIndex = 0;
    if (staleHirePhrase.test(t) && !(el.matches&&el.matches('h1,.hero-title,.title-accent-gold,.title-accent-cream,[data-dg-hero-h1]'))) {
      staleHirePhrase.lastIndex = 0;
      el.textContent = t.replace(staleHirePhrase, 'start a hiring brief');
      return;
    }
    stalePoolVolume.lastIndex = 0;
    if (stalePoolVolume.test(t)) {
      stalePoolVolume.lastIndex = 0;
      el.textContent = t.replace(stalePoolVolume, 'curated matches');
      return;
    }
    staleVolume.lastIndex = 0;
    if (staleVolume.test(t)) {
      staleVolume.lastIndex = 0;
      el.textContent = staleVolumeTitle.test(t) ? 'Meet curated matches' : t.replace(staleVolume, 'a curated shortlist');
      return;
    }
    staleVolumeAfter.lastIndex = 0;
    if (staleVolumeAfter.test(t)) {
      staleVolumeAfter.lastIndex = 0;
      el.textContent = t.replace(staleVolumeAfter, 'a curated shortlist');
      return;
    }
    staleCountBundle.lastIndex = 0;
    if (staleCountBundle.test(t)) {
      staleCountBundle.lastIndex = 0;
      el.textContent = t.replace(staleCountBundle, 'curated matches');
      return;
    }
    staleFinalists.lastIndex = 0;
    if (staleFinalists.test(t)) {
      staleFinalists.lastIndex = 0;
      el.textContent = t.replace(staleFinalists, 'a curated shortlist');
      return;
    }
    staleMinimumVolume.lastIndex = 0;
    if (staleMinimumVolume.test(t)) {
      staleMinimumVolume.lastIndex = 0;
      el.textContent = t.replace(staleMinimumVolume, 'a curated shortlist');
      return;
    }
    staleChoiceVolume.lastIndex = 0;
    if (staleChoiceVolume.test(t)) {
      staleChoiceVolume.lastIndex = 0;
      el.textContent = t.replace(staleChoiceVolume, 'review curated matches');
      return;
    }
    staleGuarantee.lastIndex = 0;
    if (staleGuarantee.test(t)) {
      staleGuarantee.lastIndex = 0;
      el.textContent = t.replace(staleGuarantee, '90-day outcome focus');
      return;
    }
    staleGuaranteePeriod.lastIndex = 0;
    if (staleGuaranteePeriod.test(t)) {
      staleGuaranteePeriod.lastIndex = 0;
      el.textContent = t.replace(staleGuaranteePeriod, '90-day outcome focus');
      return;
    }
    staleComplimentaryReplacement.lastIndex = 0;
    if (staleComplimentaryReplacement.test(t)) {
      staleComplimentaryReplacement.lastIndex = 0;
      el.textContent = t.replace(staleComplimentaryReplacement, '90-day outcome focus');
      return;
    }
    staleConditionalReplacement.lastIndex = 0;
    if (staleConditionalReplacement.test(t)) {
      staleConditionalReplacement.lastIndex = 0;
      el.textContent = t.replace(staleConditionalReplacement, '90-day outcome focus');
      return;
    }
    staleFitReplacement.lastIndex = 0;
    if (staleFitReplacement.test(t)) {
      staleFitReplacement.lastIndex = 0;
      el.textContent = t.replace(staleFitReplacement, '90-day outcome focus');
      return;
    }
    staleShouldReplacement.lastIndex = 0;
    if (staleShouldReplacement.test(t)) {
      staleShouldReplacement.lastIndex = 0;
      el.textContent = t.replace(staleShouldReplacement, '90-day outcome focus');
      return;
    }
    staleOfferedReplacement.lastIndex = 0;
    if (staleOfferedReplacement.test(t)) {
      staleOfferedReplacement.lastIndex = 0;
      el.textContent = t.replace(staleOfferedReplacement, '90-day outcome focus');
      return;
    }
    staleSearchRestart.lastIndex = 0;
    if (staleSearchRestart.test(t)) {
      staleSearchRestart.lastIndex = 0;
      el.textContent = t.replace(staleSearchRestart, '90-day outcome focus');
      return;
    }
    staleNextSearchFree.lastIndex = 0;
    if (staleNextSearchFree.test(t)) {
      staleNextSearchFree.lastIndex = 0;
      el.textContent = t.replace(staleNextSearchFree, '90-day outcome focus');
      return;
    }
    staleReplacementCredit.lastIndex = 0;
    if (staleReplacementCredit.test(t)) {
      staleReplacementCredit.lastIndex = 0;
      el.textContent = t.replace(staleReplacementCredit, '90-day outcome focus');
      return;
    }
    staleFeeWaiver.lastIndex = 0;
    if (staleFeeWaiver.test(t)) {
      staleFeeWaiver.lastIndex = 0;
      el.textContent = t.replace(staleFeeWaiver, '90-day outcome focus');
      return;
    }
    staleFeeCarryover.lastIndex = 0;
    if (staleFeeCarryover.test(t)) {
      staleFeeCarryover.lastIndex = 0;
      el.textContent = t.replace(staleFeeCarryover, '90-day outcome focus');
      return;
    }
    staleFeeBackGuarantee.lastIndex = 0;
    if (staleFeeBackGuarantee.test(t)) {
      staleFeeBackGuarantee.lastIndex = 0;
      el.textContent = t.replace(staleFeeBackGuarantee, '90-day outcome focus');
      return;
    }
    staleMoneyBackGuarantee.lastIndex = 0;
    if (staleMoneyBackGuarantee.test(t)) {
      staleMoneyBackGuarantee.lastIndex = 0;
      el.textContent = t.replace(staleMoneyBackGuarantee, '90-day outcome focus');
      return;
    }
    staleReplacementBenefit.lastIndex = 0;
    if (staleReplacementBenefit.test(t)) {
      staleReplacementBenefit.lastIndex = 0;
      el.textContent = t.replace(staleReplacementBenefit, '90-day outcome focus');
      return;
    }
    staleReplacementSafetyNet.lastIndex = 0;
    if (staleReplacementSafetyNet.test(t)) {
      staleReplacementSafetyNet.lastIndex = 0;
      el.textContent = t.replace(staleReplacementSafetyNet, '90-day outcome focus');
      return;
    }
    staleReplacementInsurance.lastIndex = 0;
    if (staleReplacementInsurance.test(t)) {
      staleReplacementInsurance.lastIndex = 0;
      el.textContent = t.replace(staleReplacementInsurance, '90-day outcome focus');
      return;
    }
    staleReplacementReassurance.lastIndex = 0;
    if (staleReplacementReassurance.test(t)) {
      staleReplacementReassurance.lastIndex = 0;
      el.textContent = t.replace(staleReplacementReassurance, '90-day outcome focus');
      return;
    }
    staleReplacementService.lastIndex = 0;
    if (staleReplacementService.test(t)) {
      staleReplacementService.lastIndex = 0;
      el.textContent = t.replace(staleReplacementService, '90-day outcome focus');
      return;
    }
    staleBackedReplacement.lastIndex = 0;
    if (staleBackedReplacement.test(t)) {
      staleBackedReplacement.lastIndex = 0;
      el.textContent = t.replace(staleBackedReplacement, '90-day outcome focus');
      return;
    }
    staleExpenseReplacement.lastIndex = 0;
    if (staleExpenseReplacement.test(t)) {
      staleExpenseReplacement.lastIndex = 0;
      el.textContent = t.replace(staleExpenseReplacement, '90-day outcome focus');
      return;
    }
    staleTalentGuarantee.lastIndex = 0;
    if (staleTalentGuarantee.test(t)) {
      staleTalentGuarantee.lastIndex = 0;
      el.textContent = t.replace(staleTalentGuarantee, '90-day outcome focus');
      return;
    }
    staleOutcomeGuarantee.lastIndex = 0;
    if (staleOutcomeGuarantee.test(t)) {
      staleOutcomeGuarantee.lastIndex = 0;
      el.textContent = t.replace(staleOutcomeGuarantee, '90-day outcome focus');
      return;
    }
    staleRiskFreeHiring.lastIndex = 0;
    if (staleRiskFreeHiring.test(t)) {
      staleRiskFreeHiring.lastIndex = 0;
      el.textContent = t.replace(staleRiskFreeHiring, '90-day outcome focus');
      return;
    }
    staleReversedGuarantee.lastIndex = 0;
    if (staleReversedGuarantee.test(t)) {
      staleReversedGuarantee.lastIndex = 0;
      el.textContent = t.replace(staleReversedGuarantee, '90-day outcome focus');
    }
  });
  // Webflow can render the same canvas copy in unclassed wrappers, SVG <text>,
  // or custom elements missed by the semantic selector above. Scrub individual
  // text nodes so nested icons and links survive instead of flattening the parent.
  try {
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),node;
    while((node=walker.nextNode())){
      var parent=node.parentElement;
      if(!parent||parent.closest('script,style,noscript,template,#startup-modal,#jobseeker-modal,#dg-page,#dg-bar,#dg-path-pills,.hero-actions'))continue;
      var beforeNode=node.nodeValue||'';
      if(!beforeNode.trim()||policyText(beforeNode).length>180)continue;
      var afterNode=honestStaticCopy(beforeNode);
      if(afterNode!==policyText(beforeNode))node.nodeValue=afterNode;
    }
  } catch(e) {}
  // Copy policy also applies to accessible names, tooltips, image text, and form chrome.
  qa('[aria-label],[aria-description],[title],[alt],[placeholder],[value],[data-label],[data-title],[data-tooltip],[data-text]').forEach(function(el){
    if (el.closest && el.closest('#startup-modal,#jobseeker-modal,#dg-page,#dg-bar,#dg-path-pills,.hero-actions')) return;
    ['aria-label','aria-description','title','alt','placeholder','value','data-label','data-title','data-tooltip','data-text'].forEach(function(attr){
      if(!el.hasAttribute(attr))return;
      var before=el.getAttribute(attr)||'',after=honestStaticCopy(before);
      if(after!==before.trim().replace(/\s+/g,' '))el.setAttribute(attr,after);
    });
  });
  // Search/social metadata can preserve stale Webflow promises after visible copy is clean.
  qa('meta[name="description"],meta[property^="og:"],meta[name^="twitter:"]').forEach(function(el){
    var before=el.getAttribute('content')||'',after=honestStaticCopy(before);
    if(after!==before.trim().replace(/\s+/g,' '))el.setAttribute('content',after);
  });
  // Parse JSON-LD before scrubbing string leaves so structured data always remains valid JSON.
  qa('script[type="application/ld+json"]').forEach(function(el){
    try {
      var data=JSON.parse(el.textContent||'null'),changed=false;
      function scrubJson(value){
        if(typeof value==='string'){
          var next=honestStaticCopy(value);
          if(next!==value.trim().replace(/\s+/g,' '))changed=true;
          return next;
        }
        if(Array.isArray(value))return value.map(scrubJson);
        if(value&&typeof value==='object')Object.keys(value).forEach(function(key){value[key]=scrubJson(value[key]);});
        return value;
      }
      data=scrubJson(data);
      if(changed)el.textContent=JSON.stringify(data);
    } catch(e) {/* leave malformed third-party data untouched */}
  });
  // Hide lorem / insights junk cards (leaf container only)
  qa('.step-card,[class*="role-card"]').forEach(function(c){
    if (dgIsPageShell(c)) return;
    var t = (c.textContent || '').toLowerCase();
    if (t.length > 800) return;
    if (/lorem ipsum|consectetur adipiscing/.test(t) || (/insights/.test(t) && /lorem|consectetur/.test(t))) {
      dgHide(c);
    }
  });
}

function show(id){if(!q(id))run();var m=q(id);if(!m)return;OPEN=id;try{m.inert=false;m.removeAttribute('inert')}catch(e){}try{var bar=q('#dg-bar');if(bar){bar.style.setProperty('display','none','important');bar.setAttribute('aria-hidden','true');}}catch(e){}m.removeAttribute('aria-hidden');m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.style.cssText='display:flex!important;visibility:visible!important;opacity:1!important';m.setAttribute('aria-hidden','false');try{var title=m.querySelector('.dg-wiz-q,h2,h3,[class*=title]');if(title){if(!title.id)title.id='dg-modal-title-'+(id==='#startup-modal'?'startup':'jobseeker');m.setAttribute('aria-labelledby',title.id);}else{m.setAttribute('aria-label',id==='#startup-modal'?'Hire SF startup talent':'Join talent network');}}catch(e){}if(document.body){ if(!document.body.dataset.prevOverflow){ document.body.dataset.prevOverflow = document.body.style.overflow || getComputedStyle(document.body).overflow || ''; document.body.dataset.prevScrollY = '' + (window.scrollY || 0); } document.body.style.overflow='hidden'; document.body.style.position='fixed'; document.body.style.top = `-${document.body.dataset.prevScrollY}px`; document.body.style.width='100%'; } if(document.documentElement){ document.documentElement.style.overflow='hidden'; } setTimeout(function(){var dgVis=function(e){return !!e&&e.offsetParent!==null};var nx=m.querySelector('.dg-wiz-next');var fi=[].slice.call(m.querySelectorAll('input:not([type=hidden]),select,textarea')).filter(dgVis)[0]||(dgVis(nx)?nx:null)||focusables(m).filter(dgVis)[0];if(fi)try{fi.focus()}catch(e){}},60); setTimeout(dedupeAll, 120); setTimeout(scrubStaticLabels, 150);
// Keep fallback accessible names on the same two paths as every visible CTA.
if (!m.hasAttribute('aria-labelledby')) m.setAttribute('aria-label', id === S ? "I'm hiring — startup brief" : "I'm looking — talent profile");
// extra force for form and title scrub to fix blank and bad title on live
try {
  const f = m.querySelector('form');
  if (f) {
    f.style.setProperty('display','block','important');
    f.style.setProperty('visibility','visible','important');
  }
  qa('h2,h3,[class*="title"],[class*="subtitle"],p', m).forEach(function(el){
    if (/HIRING FORM|APPLICATION|BRIEFS/i.test(el.textContent || '')) {
      el.style.setProperty('display','none','important');
      el.textContent = '';
    }
  });
} catch(e){}
// inject strong override style + direct force to beat Webflow hiding of forms/fields (fixes vis=0 / form none)
try {
  if (!document.getElementById('dg-wiz-force-style')) {
    var st = document.createElement('style'); st.id='dg-wiz-force-style';
    st.textContent = '#startup-modal form,#jobseeker-modal form,#startup-modal .w-form,#jobseeker-modal .w-form{display:block!important;visibility:visible!important}#startup-modal .dg-wiz-head,#jobseeker-modal .dg-wiz-head{display:block!important;visibility:visible!important}#startup-modal .dg-wiz-nav,#jobseeker-modal .dg-wiz-nav{display:flex!important;visibility:visible!important}#startup-modal .dg-wiz-show,#jobseeker-modal .dg-wiz-show{display:block!important;visibility:visible!important}';
    document.head.appendChild(st);
  }
  qa('form,.w-form,.dg-wiz-head,.dg-wiz-nav,.dg-wiz-show', m).forEach(function(c){if(!c)return; var d=c.classList&&c.classList.contains('dg-wiz-nav')?'flex':'block'; c.style.setProperty('display',d,'important');c.style.setProperty('visibility','visible','important');});
} catch(e){}
// WIZ init — build once; reopen reuses instance (v194 idempotent)
try {
  var mf = m.querySelector('form') || (id===S ? q('#startup-hire') : q('#engineer-join'));
  if (mf) {
    mf.classList.remove('w-form-loading');
    mf.style.setProperty('display', 'block', 'important');
    mf.style.visibility = 'visible';
    var p=mf; while(p && p!== document.body){ try{ p.style.setProperty('display','block','important'); p.style.visibility='visible'; }catch(e){} p = p.parentElement; }
    if (m) { m.style.setProperty('display', 'flex', 'important'); m.style.setProperty('visibility', 'visible', 'important'); }
    if (typeof scrubStaticLabels === 'function') scrubStaticLabels();
    try { if (document.title && /HIRING|APPLICATION|BRIEFS/i.test(document.title)) document.title = document.title.replace(/HIRING FORM|ENGINEER APPLICATION|CANDIDATE APPLICATION|EXAMPLE BRIEFS/gi,'').trim() || document.title; } catch(e){}
    var firstBuild = !mf.dataset.dgWizBuilt;
    if (firstBuild) {
      if (typeof forms === 'function') forms();
      if (typeof wizBuild === 'function' && !mf.dataset.dgWizBuilt) wizBuild(mf, (id===S?'startup':'engineer'));
    } else if (typeof mf.__dgWizShow === 'function') {
      try { mf.__dgWizShow(); } catch(e){}
    }
    // chrome visibility only — do not force showStep(0) on reopen (preserves step)
    try {
      var hd = m.querySelector('.dg-wiz-head');
      if (hd) { hd.style.setProperty('display','block','important'); hd.style.setProperty('visibility','visible','important'); }
      var nv = m.querySelector('.dg-wiz-nav');
      if (nv) { nv.style.setProperty('display','flex','important'); nv.style.setProperty('visibility','visible','important'); }
      var n = m.querySelector('.dg-wiz-next'); if(n){ n.style.display='inline-block'; n.style.visibility='visible'; n.disabled=false; }
    } catch(e){}
    forceWizVisible(mf, m);
    var forceCount=0; var fr = setInterval(function(){
      forceCount++;
      if(forceCount>2){clearInterval(fr);return;}
      if(mf){ mf.style.setProperty('display','block','important'); mf.style.visibility='visible'; }
      forceWizVisible(mf, m);
      scrubStaticLabels();
    }, 180);
  }
  try { attachTrap(m); } catch(e){}
} catch(e){}
}



/* === DEEP LINK — /?wiz=startup|engineer (+ hash aliases); product /?p= is same-origin shell route === */
/* === SIMPLE PAGES (?p=) — short secondary screens; home stays a decision screen === */
/* ==== SECTION: product pages (DG_PAGES + openPage / routePages /?p=) ==== */
/* Blog SoR embed from demigod-blog-posts.json */
var DG_BLOG_POSTS=[{"slug":"epicurus-garden-hacker-houses","category":"Market","title":"Epicurus' Garden and the SF hacker house","summary":"Epicurus wanted friendship and a quiet mind. SF hacker houses want speed. The useful overlap is smaller: choose the room carefully, write the norms down, and leave room to recover.","body":"Around 306 BCE, Epicurus bought a house and garden outside the Dipylon gate, on the road toward Plato's Academy. Diogenes Laërtius puts the price at eighty minae, writing centuries later, so treat that number the way you would any figure from one late source. What is better attested is how the place ran. People lived there. They ate at one table, argued over the food, and came back to the same unfinished questions the next week. The Academy up the road was a school you visited. The Garden was one you moved into, which changed what it could ask of the people in it.\n\nThey were after ataraxia: a quieter mind, less fear, fewer pointless wants. Friendship was part of the practice, not a networking bonus. Women studied there. So did people the rest of the city treated as background. That made the Garden unusually open for an Athenian school, but it was not casual about commitment. If you needed public honor more than the shared table, you did not last.\n\nEpicurus's will tried to keep the group going after him. Successors named. Friends' children cared for. Freedom for slaves who had studied. The legal language is dry and that is the point. The house was supposed to outlive one charismatic man.\n\nYou see cousins of this arrangement long before anyone rented a Victorian in the Mission and called it a house for builders. Pythagoras's circle in southern Italy was harsher and weirder: shared property, heavy secrecy, intellectual heat with a mystic edge. Monasteries later made a more durable version of group life. Their purposes were religious, their rules stricter, their days split between prayer, labor, and study. They also copied books.\n\nIn 1417, Poggio Bracciolini found Lucretius' On the Nature of Things in a monastic library. Lucretius was the great Roman carrier of Epicurean thought. A Christian house preserved a poem whose gods, matter, and death sat badly with Christian teaching. Nobody needed to plan that irony. The rule said copy books, so books got copied, including ones the copyists would have disliked if they stopped to argue with every page. That is a boring reason to write shared rules down, and a strong one. Rules keep operating on days when nobody is in the mood to remember the founding pitch.\n\nSan Francisco keeps reinventing a louder cousin of the same pressure. Rent is absurd. Solo technical work is lonely. Hard problems move faster when the people who can help are down the hall instead of three Slack hops and a calendar invite away.\n\nReporting on HF0 describes a selective residency for technical founders in large SF properties. AGI House has been covered as a place for AI builders, researchers, dinners, and events. Those are specific organizations with their own admissions and economics. They are useful because the trade is visible. Residents give up privacy and some control over the room in exchange for people, conversation, and work being close.\n\nProximity helps when the people already share enough. A stuck problem can come up over eggs. Someone can watch a demo fail and still be there when the fix works at midnight. Proximity has no moral quality of its own. If residents disagree about noise, money, ambition, cleanliness, or whether every meal is a pitch session, the hallway becomes another meeting they cannot leave.\n\nFounder mythology likes to skip the boring part. A house full of impressive résumés can be worse than a smaller one where people agree about visitors, quiet hours, chores, and rest. Size photographs well. Norms decide whether anyone wants to stay. Intensity needs a limit too. Epicurus treated modest pleasure, freedom from fear, and time among friends as the point. A modern technical residency may be trying to ship a company in weeks. Different aims. Both get worse when sleep thins, the kitchen turns strange, and small annoyances become politics.\n\nDemigod is not a house, and we will not pretend the lineage is direct. We run a matching service for SF startups and talent: profiles stay private, both sides see evidence before names move, and an introduction happens only after each side approves. What we take from the houses is a working assumption rather than a philosophy. Selection has to be honest before proximity is worth much, because the wrong people in a good room mostly cost each other a month.\n\nWhether any of this works outside one small city is an open question. SF is where we can check our own claims in person, so SF is where we operate.","image":"https://files.catbox.moe/urbco5.jpg","imageAlt":"Gold-on-dark mark for garden, cloister, and group-house pattern essay","publishedAt":"2026-07-17"}];
var DG_PAGES = {
  how: {
    title: 'How it works',
    doc: 'How it works · Demigod',
    desc: 'Three steps: brief or profile → human review → both approve. 10% on hire.',
    html:
      '<ol class="dg-p-list">' +
      '<li><strong>Brief or profile</strong> — startups: role + 90-day outcome. Talent: one profile.</li>' +
      '<li><strong>Tech + review</strong> — Demigod ranks against the 90-day outcome; humans in the loop propose only when evidence is real.</li>' +
      '<li><strong>Both sides approve → intro</strong> — either side can pass privately. Fee only if you hire.</li>' +
      '</ol>',
  },
  pricing: {
    title: 'Pricing',
    doc: 'Pricing · Demigod',
    desc: '10% of first-year cash when a hire starts. Nothing upfront. Talent free. Card tooling pending.',
    html:
      '<p class="dg-p-lead">Startups pay <strong>10%</strong> of first-year cash salary only when a hire starts — not to post a role.</p>' +
      '<ul class="dg-p-list">' +
      '<li><strong>No subscription.</strong> No charge to submit a role brief.</li>' +
      '<li><strong>Candidates free.</strong> Always.</li>' +
      '<li><strong>Typical agencies</strong> often run 15–25%. Demigod is 10% on hire.</li>' +
      '<li><strong>Payments/SMS pending</strong> — commercial confirmations by email from potter@trydemigod.com.</li>' +
      '</ul>',
  },
  faq: {
    title: 'FAQ',
    doc: 'FAQ · Demigod',
    desc: 'Fees, privacy, intros, live vs pending — no SLA, no auto-DM.',
    html:
      '<details class="dg-p-det" open><summary>What is Demigod?</summary><p>Demigod matches SF Bay startups and talent with software — humans in the loop. Share a brief or profile; we propose only strong fits. 10% of first-year cash on hire. Talent free.</p></details>' +
      '<details class="dg-p-det"><summary>What happens after I submit?</summary><p>Demigod tech ranks your brief or profile; humans in the loop review. If a fit looks real, both sides approve before intro. potter@trydemigod.com follows up.</p></details>' +
      '<details class="dg-p-det"><summary>How is matching different from open listing sites?</summary><p>There is no public job feed or application blast. Humans curate. Your profile is not circulated without a real fit and both sides approving the intro.</p></details>' +
      '<details class="dg-p-det"><summary>How much does it cost?</summary><p><strong>Startups:</strong> 10% of first-year cash salary when someone starts. Nothing upfront. <strong>Talent:</strong> always free. Typical agencies often charge more.</p></details>' +
      '<details class="dg-p-det"><summary>Is my profile private?</summary><p>Yes. Identity and contact details move only after both sides approve an intro. You can ask us to update or delete data anytime.</p></details>' +
      '<details class="dg-p-det"><summary>What is a 90-day outcome?</summary><p>One measurable result the hire must deliver in their first 90 days. We match against that outcome — not a keyword soup or generic JD.</p></details>' +
      '<details class="dg-p-det"><summary>Who do you work with?</summary><p>SF Bay Area startups (and builders open to those companies). Seed through growth, product and eng-heavy roles first. Remote talent is fine when the company is Bay-focused.</p></details>' +
      '<details class="dg-p-det"><summary>How long does it take?</summary><p>No SLA clock. Timing depends on role difficulty and response pace. Every brief gets careful human review — potter@trydemigod.com follows up.</p></details>' +
      '<details class="dg-p-det"><summary>Are payments and SMS live?</summary><p>Not yet. Commercial confirmations and follow-ups are by email (potter@trydemigod.com). Stripe and Twilio are pending — we say so honestly on the site.</p></details>' +
      '<details class="dg-p-det"><summary>Do you auto-message founders or candidates?</summary><p>No auto-DM blasts. Humans send outreach. The site is for inbound briefs, profiles, and transparent product pages.</p></details>' +
      '<details class="dg-p-det"><summary>What if a match is not right?</summary><p>Pass privately. No pressure, no public rejection trail. If evidence is thin, we say so instead of manufacturing a shortlist.</p></details>' +
      '<details class="dg-p-det"><summary>Can I partner or refer talent?</summary><p>Yes. Refer outstanding people and earn 20% of the placement fee on successful hires. Email potter@trydemigod.com with “Partner” in the subject.</p></details>' +
      '<details class="dg-p-det"><summary>What roles do you cover first?</summary><p>Product, engineering, design, and GTM for SF Bay startups. Other roles case-by-case when the 90-day outcome is clear.</p></details>' +
      '<details class="dg-p-det"><summary>What do I need to submit as a founder?</summary><p>Company context, the role, and one measurable 90-day outcome. Optional JD/link. Comp range helps us only propose people who will actually say yes.</p></details>' +
      '<details class="dg-p-det"><summary>What do I need as talent?</summary><p>Name, email, LinkedIn, core skills, and a few shipped highlights. Resume optional. Free forever — outreach only on real fits.</p></details>' +
      '<details class="dg-p-det"><summary>How do intros work?</summary><p>When both sides approve, we send a warm intro email. No cold LinkedIn spam from us. You take it from there.</p></details>' +
      '<details class="dg-p-det"><summary>Where can I read updates?</summary><p>See <a href="/?p=blog" data-dg-page="blog">Notes</a> for short product and market posts. Share a note via /?p=blog#note-{slug} (opens full note). Questions: potter@trydemigod.com.</p></details>',
  },
  hire: {
    title: "I'm hiring",
    doc: 'Hire · Demigod',
    desc: 'Submit a brief. Demigod tech matches, humans in the loop. 10% of first-year cash only when a hire starts.',
    html:
      '<p class="dg-p-lead">Tell us the role and the 90-day outcome. We propose only strong fits.</p>' +
      '<ul class="dg-p-list"><li>~2 min brief</li><li>Human review, not a bot</li><li>Pay only when you hire</li></ul>',
  },
  talent: {
    title: "I'm looking",
    doc: 'Talent · Demigod',
    desc: 'One private profile. Free forever. Shared only after both sides approve.',
    html:
      '<p class="dg-p-lead">One profile for SF startups. Private until a human sees a real fit — then you still say yes.</p>' +
      '<ul class="dg-p-list"><li>Free for candidates</li><li>No board spam</li><li>both sides approve before intro</li></ul>',
  },
  contact: {
    title: 'Contact',
    doc: 'Contact · Demigod',
    desc: 'Reach Demigod by email — potter@trydemigod.com. A human replies, no bots.',
    html:
      '<p class="dg-p-lead">Email <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a>. A human replies. SMS/payments pending.</p>',
  },
  legal: {
    title: 'Privacy & Terms',
    doc: 'Legal · Demigod',
    desc: 'Plain-language privacy and terms. Contact potter@trydemigod.com for questions.',
    html:
      '<h3 class="dg-p-h3">Privacy</h3><p>We use your brief or profile to match. No selling lists. Profiles shared only after both sides approve. Contact us to update or delete data: potter@trydemigod.com.</p>' +
      '<h3 class="dg-p-h3">Terms</h3><p>Demigod introduces parties; employment decisions are yours. Placement fee is 10% of first-year cash salary when a hire starts (unless written otherwise). Payments tooling is pending — commercial confirmations by email. SF Bay Area focus. No SLA promises on response time.</p>',
  },
  partners: {
    title: 'Partners',
    doc: 'Partners · Demigod',
    desc: 'Refer outstanding talent. Earn 20% of the placement fee when a hire starts.',
    html:
      '<p class="dg-p-lead">Refer outstanding people to SF startups. Earn <strong>20%</strong> of the Demigod placement fee when a referred hire starts — never a candidate fee.</p>' +
      '<p>Email <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a> with “Partner” in the subject.</p>',
  },
  compare: {
    title: 'Compare',
    doc: 'Compare · Demigod',
    desc: 'Boards and agencies vs Demigod: privacy, mutual approval, 10% on hire.',
    html:
      '<div class="dg-p-grid">' +
      '<div><strong>Job boards</strong><p>Volume-first. You sort noise.</p></div>' +
      '<div><strong>Agencies</strong><p>Often 15–25% of first-year cash. Broad lists.</p></div>' +
      '<div class="dg-p-hi"><strong>Demigod</strong><p>10% on hire. Tech match · humans in the loop. Both approve.</p></div>' +
      '</div>',
  },
  pilot: {
    title: 'Pilot',
    doc: 'Pilot · Demigod',
    desc: 'White-glove pilot for SF founders. Email potter@trydemigod.com to start. SMS/card pending.',
    html:
      '<p class="dg-p-lead">Early partners get white-glove matching while we wire payments/SMS.</p>' +
      '<ul class="dg-p-list"><li>One role focus</li><li>Human-owned intro</li><li>Honest “pending” on tooling</li></ul>' +
      '<p>Email potter@trydemigod.com with “Pilot”.</p>',
  },
  about: {
    title: 'About',
    doc: 'About · Demigod',
    desc: 'Demigod tech matches SF startup talent, humans in the loop — both sides approve, 10% on hire.',
    html:
      '<p class="dg-p-lead">Demigod is tech matching for SF startups and talent, with humans in the loop. Curated intros only — no open feed, no auto-DM blasts.</p>' +
      '<ul class="dg-p-list"><li>One measurable 90-day outcome first</li><li>Both sides approve before every intro</li><li>10% only when you hire</li></ul>',
  },

  founders: {
    title: 'For founders',
    doc: 'For founders · Demigod',
    desc: 'Review proof against your 90-day outcome before names are shared. Both sides approve every intro. 10% of first-year cash when a hire starts.',
    html:
      '<p class="dg-p-lead"><strong>See the proof before the profile.</strong> Review a relevant result, what the person owned, compensation and location fit, and one evidence gap worth testing. Names stay private until both sides approve the conversation.</p>' +
      '<ol class="dg-decision-grid" aria-label="Founder match decision sequence">' +
      '<li><span>Evidence</span><strong>Can they deliver the outcome?</strong><small>Relevant result, metric, ownership, and the clearest evidence gap — no identity</small></li>' +
      '<li><span>Fit</span><strong>Would the conversation be viable?</strong><small>Compensation, location, availability, and working constraints</small></li>' +
      '<li><span>Introduce</span><strong>Two approvals unlock the intro</strong><small>Only then are names and contact details shared</small></li>' +
      '</ol>' +
      '<h3 class="dg-p-h3">Start with the outcome</h3>' +
      '<p>Describe one measurable result this person should own in their first 90 days, why it matters now, and the constraints that shape the fit: compensation range, location, working style, and company stage. For example: “Ship self-serve onboarding and move activation from 28% to 40%.” The brief stays private.</p>' +
      '<h3 class="dg-p-h3">Your private match note</h3>' +
      '<ul class="dg-p-list">' +
      '<li><strong>Proof:</strong> one relevant result, the metric, what the person owned, and the conditions behind it.</li>' +
      '<li><strong>Fit:</strong> compensation, location, availability, plus the most important evidence gap to test in conversation.</li>' +
      '<li><strong>Your choice:</strong> pass privately or approve a conversation. The candidate makes the same choice independently.</li>' +
      '<li><strong>Fee:</strong> 10% of first-year cash salary if the hire starts; nothing upfront.</li>' +
      '</ul>' +
      '<p class="dg-p-note"><strong>No padded shortlist.</strong> If the evidence is not there, we say so instead of manufacturing a match or promising a candidate count.</p>',
  },
  candidates: {
    title: 'For talent',
    doc: 'For talent · Demigod',
    desc: 'Review the outcome, compensation, and constraints before names are shared. Both sides approve every intro. Always free.',
    html:
      '<p class="dg-p-lead"><strong>See the work before the company.</strong> Review the 90-day outcome, why it matters, compensation, working constraints, and one delivery risk worth testing. Names stay private until both sides approve the conversation. Always free.</p>' +
      '<ol class="dg-decision-grid" aria-label="Talent match decision sequence">' +
      '<li><span>Work</span><strong>Is the outcome worth owning?</strong><small>Outcome, why now, scope, and the clearest delivery risk — no company identity</small></li>' +
      '<li><span>Fit</span><strong>Would the conversation be viable?</strong><small>Compensation, location, working style, and other stated constraints</small></li>' +
      '<li><span>Introduce</span><strong>Two approvals unlock the intro</strong><small>Only then are names and contact details shared</small></li>' +
      '</ol>' +
      '<h3 class="dg-p-h3">Start with proof</h3>' +
      '<p>Describe one result that shows what you can deliver, what you want to own next, and the constraints that shape the fit: compensation range, location, working style, and work authorization. For example: “Led the onboarding redesign; activation rose from 28% to 40%.” Your profile stays private.</p>' +
      '<h3 class="dg-p-h3">Your private match note</h3>' +
      '<ul class="dg-p-list">' +
      '<li><strong>Work:</strong> company stage, the 90-day outcome, why it matters now, and what success would change.</li>' +
      '<li><strong>Fit:</strong> compensation, location, working style, plus the most important delivery risk to test in conversation.</li>' +
      '<li><strong>Your choice:</strong> pass privately or approve a conversation. The startup makes the same choice independently.</li>' +
      '<li><strong>Fee:</strong> talent never pays Demigod.</li>' +
      '</ul>' +
      '<p class="dg-p-note"><strong>No profile circulation.</strong> If there is no real fit, we say so and keep your profile private rather than sending it around.</p>',
  },
  status: {
    title: 'Status',
    doc: 'Status · Demigod',
    desc: 'What is live vs pending — WIZ and email live; SMS/card tooling pending.',
    html:
      '<ul class="dg-p-list">' +
      '<li><strong>Live:</strong> dual CTAs, one-question WIZ, 90-day outcome, tech matching with humans in the loop, product pages, Events Bot, Night District MUD (/?p=mud), email follow-up</li>' +
      '<li><strong>Runtime:</strong> foot v__DG_FOOT_VER__ on this page load</li>' +
      '<li><strong>Site:</strong> decision home, dual paths, chips, product pages, /events → Events Bot</li>' +
      '<li><strong>Pending:</strong> SMS (Twilio), card payments (Stripe), Events Bot real send transport (outreach still queued honestly) — commercial path is email until live</li>' +
      '<li><strong>Fee:</strong> 10% on hire — confirmed by email for now</li>' +
      '<li><strong>Honest board:</strong> sample roles labeled; no fake placements</li>' +
      '<li><strong>Notes:</strong> short product posts at /?p=blog — deep-link /?p=blog#note-{slug}</li>' +
      '</ul><p class="dg-p-lead">Questions: <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a></p>',
  },
  blog: {
    title: 'Blog',
    doc: 'Blog · Demigod',
    desc: 'Essays and product notes from Demigod — SF talent matching, culture, and how we work.',
    html:
      '<div class="dg-blog-hero">' +
      '<p class="dg-ev-pill" role="note">Notes · no spam</p>' +
      '<p class="dg-p-lead">Writing from Demigod — matching in SF, and the culture around it.</p>' +
      '<p class="dg-p-note">Deep-link a post: <code>/?p=blog#note-{slug}</code>. Questions: <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a>.</p>' +
      '</div>' +
      '<div class="dg-blog-filters" id="dg-blog-filters" role="group" aria-label="Blog categories"></div>' +
      '<div class="dg-blog-grid" id="dg-blog-grid" aria-live="polite"></div>' +
      '<p class="dg-blog-empty" id="dg-blog-empty" hidden>No posts in this category yet.</p>',
  },
  method: {
    title: 'Method',
    doc: 'Method · Demigod',
    desc: 'How Demigod matching works end to end — tech match, humans in the loop, evidence first, both sides approve.',
    html:
      '<p class="dg-p-lead">A short, deliberate loop — evidence packets, not a job feed.</p>' +
      '<ol class="dg-decision-grid" aria-label="Method">' +
      '<li><span>01</span><strong>Capture</strong><small>Role + 90-day outcome, or a private talent profile</small></li>' +
      '<li><span>02</span><strong>Match</strong><small>Demigod tech · humans in the loop</small></li>' +
      '<li><span>03</span><strong>Propose</strong><small>Evidence packets only when fit looks real</small></li>' +
      '<li><span>04</span><strong>Approve</strong><small>Both sides opt in before identity moves</small></li>' +
      '<li><span>05</span><strong>Intro</strong><small>Warm intro by email; 10% only if a hire starts</small></li>' +
      '</ol>' +
      '<p class="dg-p-note">Payments and SMS tooling are pending — we confirm commercially by email for now.</p>',
  },

  mud: {
    title: 'SF Night District',
    doc: 'SF Night District MUD · Demigod',
    desc: 'Social SF text multiplayer for site visitors — talk, walk SoMa, pray to Vesper the Immortal. Skippable tutorial.',
    html:
      '<p class="dg-p-lead">A <strong>full-page</strong> social hangout for people already on this site. When status says <strong>LIVE</strong>, other visitors hear you — <code>say hi</code> (this room) or <code>chat hi</code> (everyone). Tap <strong>Who is here</strong> / <strong>Say hi</strong> / <strong>Chat all</strong> under the log. Type <code>start</code> for a 4-step guide.</p>' +
      '<ul class="dg-p-list">' +
      '<li><strong>Meet people</strong> — when status is LIVE: <code>who</code> · <code>say hi</code> (room) · <code>chat hi</code> (all)</li>' +
      '<li><strong>Buttons</strong> — Who is here · Say hi · Chat all (under the terminal)</li>' +
      '<li><strong>Walk</strong> — n s e w · map · look (optional flavor)</li>' +
      '<li><strong>Stuck</strong> — <code>start</code> guide · <code>pray</code> to Vesper · <code>skip</code> tutorial</li>' +
      '</ul>' +
      '<div id="dg-mud" class="dg-mud-host" aria-label="SF Night District MUD terminal"></div>' +
      /* v638: same leak class as the events :3460 note — a filename, a port and an env var are
   setup instructions for me, not product copy for a visitor. Solo play is the real experience. */
'<p class="dg-p-note">LIVE = real visitors can hear you. Solo still works with NPCs. SF names are flavor only.</p>',
  },

  sample: {
    title: 'Sample matches',
    doc: 'Sample matches · Demigod',
    desc: 'Example roles and candidates on Demigod are labeled samples for illustration — no fake placements.',
    html:
      '<p class="dg-p-lead">Anything marked <strong>Sample</strong> on the board is illustrative, not a live listing.</p>' +
      '<p class="dg-p-note">Real activity ships as it happens — we never invent placements. Want a real intro? <a href="/?p=hire" data-dg-page="hire">Submit a role</a> or <a href="/?p=talent" data-dg-page="talent">share a profile</a>.</p>',
  },
  events: {
    title: 'Events Bot',
    doc: 'Events Bot · Demigod',
    desc: 'Autonomous SF event organizer — invents nights, finds venues, queues sponsor/volunteer asks, tracks every stage. Chat or offer help anytime.',
    html:
      '<div class="dg-ev-hero" aria-hidden="true"></div>' +
      '<p class="dg-p-lead"><strong>Events Bot</strong> runs <strong>San Francisco</strong> nights end to end — invents them, finds venues, queues sponsor &amp; volunteer asks, and advances the plan on its own.</p>' +
      '<p class="dg-ev-pill" role="note">San Francisco only · in-person · bot-owned</p>' +
      '<p class="dg-p-note">It drafts and queues outreach when it needs something — real sending (email/SMS) <strong>pending</strong>, no fake sends. Chat, suggest, or offer help anytime.</p>' +
      '<div class="dg-ev-cta-band" role="navigation" aria-label="Events Bot shortcuts">' +
      '<a class="dg-ev-cta-pri" href="#dg-events-chat" id="dg-ec-focus">Talk to Events Bot</a>' +
      '<a class="dg-ev-cta-sec" href="#dg-ev-cal">Calendar</a>' +
      '<a class="dg-ev-cta-sec" href="#dg-ev-offers">Offer help</a>' +
      '<a class="dg-ev-cta-sec" href="#dg-ev-extra">Ideas &amp; feedback</a>' +
      '</div>' +
      '<h3 class="dg-p-h3" id="dg-ev-cal-h">SF calendar</h3>' +
      '<p class="dg-p-note">Click a date to view or add a night.</p>' +
      '<div id="dg-ev-cal" class="dg-ev-cal" aria-label="Events calendar">' +
      '<div class="dg-ev-cal-nav">' +
      '<button type="button" class="dg-ev-cal-navbtn" id="dg-ev-cal-prev" aria-label="Previous month">‹</button>' +
      '<h4 class="dg-ev-cal-month" id="dg-ev-cal-month"></h4>' +
      '<button type="button" class="dg-ev-cal-navbtn" id="dg-ev-cal-next" aria-label="Next month">›</button>' +
      '</div>' +
      '<div class="dg-ev-cal-dow" aria-hidden="true"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>' +
      '<div class="dg-ev-cal-grid" id="dg-ev-cal-grid" role="group" aria-labelledby="dg-ev-cal-month"></div>' +
      '<div class="dg-ev-cal-daypanel" id="dg-ev-cal-daypanel">' +
      '<p class="dg-ev-cal-daylabel" id="dg-ev-cal-daylabel">Select a day</p>' +
      '<ul class="dg-ev-cal-list" id="dg-ev-cal-list"></ul>' +
      '<form class="dg-ev-form dg-ev-cal-add" id="dg-ev-cal-form">' +
      '<input type="hidden" id="dg-ev-cal-date" name="date" />' +
      '<label class="dg-ev-lab" for="dg-ev-cal-title">Add event on this day</label>' +
      '<input class="dg-ev-in" id="dg-ev-cal-title" name="title" required maxlength="120" placeholder="e.g. SoMa dinner · rooftop party" />' +
      '<div class="dg-ev-cal-row">' +
      '<div><label class="dg-ev-lab" for="dg-ev-cal-time">Time</label>' +
      '<input class="dg-ev-in" id="dg-ev-cal-time" name="time" maxlength="40" placeholder="7:00 PM" /></div>' +
      '<div><label class="dg-ev-lab" for="dg-ev-cal-seats">Seats</label>' +
      '<input class="dg-ev-in" id="dg-ev-cal-seats" name="seats" type="number" min="1" max="500" inputmode="numeric" placeholder="optional" /></div>' +
      '</div>' +
      '<label class="dg-ev-lab" for="dg-ev-cal-venue">Venue / area (SF)</label>' +
      '<input class="dg-ev-in" id="dg-ev-cal-venue" name="venue" maxlength="120" placeholder="SoMa · Mission · loft" />' +
      '<button type="submit" class="dg-ev-submit" id="dg-ev-cal-submit">Add to calendar</button>' +
      '<p class="dg-ev-msg" id="dg-ev-cal-msg" role="status" aria-live="polite"></p>' +
      '</form></div></div>' +
      '<h3 class="dg-p-h3">The cycle</h3>' +
      '<ol class="dg-decision-grid dg-ev-cycle" aria-label="Events Bot lifecycle">' +
      '<li><span>01</span><strong>Ideate</strong><small>Bot invents · accepts your ideas</small></li>' +
      '<li><span>02</span><strong>Resource</strong><small>Bot finds venue · queues asks</small></li>' +
      '<li><span>03</span><strong>Plan</strong><small>Agenda · invites · Partiful draft</small></li>' +
      '<li><span>04</span><strong>RSVP</strong><small>Tally · reminder queue</small></li>' +
      '<li><span>05</span><strong>Run</strong><small>Day-of checklist · frame</small></li>' +
      '<li><span>06</span><strong>Follow-up</strong><small>Thanks · feedback · mutual yes</small></li>' +
      '<li><span>07</span><strong>Debrief</strong><small>Learnings · next night</small></li>' +
      '</ol>' +
      '<p class="dg-ev-status" id="dg-ev-status" role="status" aria-live="polite">Checking night status…</p>' +
      /* Chat primary — homepage gold, not terminal green */
      '<div id="dg-events-chat" class="dg-events-chat" aria-label="Events Bot chat">' +
      // aria-live: this span is rewritten at :4202 (status.textContent = t) as the bot connects/replies,
// so without it a screen-reader user never learns the state changed (WCAG 4.1.3 Status Messages, AA).
// polite matches the 9 other aria-live uses in this file.
'<div class="dg-ec-head"><span class="dg-ec-title">Talk to Events Bot</span><span class="dg-ec-status" id="dg-ec-status" aria-live="polite">Ready</span></div>' +
      '<p class="dg-ec-note">Chat ideas, ask status, or say “drive the next dinner.”</p>' +
      '<div class="dg-ec-log" id="dg-ec-log" role="log" aria-live="polite"></div>' +
      '<form class="dg-ec-form" id="dg-ec-form">' +
      '<label class="sr-only" for="dg-ec-input">Message</label>' +
      '<textarea id="dg-ec-input" class="dg-ec-input" rows="2" maxlength="2000" placeholder="e.g. drive a 40-person SoMa party — free venue + drink sponsor" required></textarea>' +
      '<button type="submit" class="dg-ec-send" id="dg-ec-send">Send</button>' +
      '</form></div>' +
      '<h3 class="dg-p-h3" id="dg-ev-offers-h">Offer to the night</h3>' +
      '<p class="dg-p-note">Bring a venue, sponsor a table, or volunteer — the bot folds it in. No auto-booking.</p>' +
      '<div class="dg-ev-tabs" role="group" aria-label="Offer type">' +
      '<button type="button" class="dg-ev-tab is-on" data-ev-tab="sponsor" aria-pressed="true">Sponsor</button>' +
      '<button type="button" class="dg-ev-tab" data-ev-tab="venue" aria-pressed="false">Venue</button>' +
      '<button type="button" class="dg-ev-tab" data-ev-tab="volunteer" aria-pressed="false">Volunteer</button>' +
      '</div>' +
      '<div id="dg-ev-offers" class="dg-ev-offers">' +
      '<form class="dg-ev-form" id="dg-ev-form" data-ev-kind="sponsor">' +
      '<input type="hidden" name="kind" id="dg-ev-kind" value="sponsor" />' +
      '<label class="dg-ev-lab" for="dg-ev-name">Name</label>' +
      '<input class="dg-ev-in" id="dg-ev-name" name="name" required maxlength="80" autocomplete="name" />' +
      '<label class="dg-ev-lab" for="dg-ev-email">Email</label>' +
      '<input class="dg-ev-in" id="dg-ev-email" name="email" type="email" required maxlength="120" autocomplete="email" />' +
      '<label class="dg-ev-lab" for="dg-ev-org" id="dg-ev-org-lab">Org / brand</label>' +
      '<input class="dg-ev-in" id="dg-ev-org" name="org" maxlength="120" />' +
      '<label class="dg-ev-lab" for="dg-ev-city">City</label>' +
      '<input class="dg-ev-in" id="dg-ev-city" name="city" maxlength="60" value="San Francisco" />' +
      '<label class="dg-ev-lab" for="dg-ev-capacity" id="dg-ev-cap-lab">Capacity (venues)</label>' +
      '<input class="dg-ev-in" id="dg-ev-capacity" name="capacity" type="number" min="1" max="500" inputmode="numeric" placeholder="optional" />' +
      '<label class="dg-ev-lab" for="dg-ev-offer" id="dg-ev-offer-lab">What you can offer</label>' +
      '<textarea class="dg-ev-in dg-ev-ta" id="dg-ev-offer" name="offer" required maxlength="800" rows="3" placeholder="e.g. dinner tab · 12-seat loft SoMa · photo + check-in"></textarea>' +
      '<button type="submit" class="dg-ev-submit" id="dg-ev-submit">Submit offer</button>' +
      '<p class="dg-ev-msg" id="dg-ev-msg" role="status" aria-live="polite"></p>' +
      '</form></div>' +
      '<p class="dg-ev-counts" id="dg-ev-counts" aria-live="polite"></p>' +
      '<div class="dg-ev-extra" id="dg-ev-extra">' +
      '<details class="dg-p-det"><summary>Suggest an idea</summary>' +
      '<form class="dg-ev-form dg-ev-mini" id="dg-ev-idea-form">' +
      '<label class="dg-ev-lab" for="dg-ev-idea-seed">Theme or leave blank to invent an SF night</label>' +
      '<input class="dg-ev-in" id="dg-ev-idea-seed" maxlength="200" placeholder="e.g. rooftop summer party · jazz loft · dinner club" />' +
      '<button type="submit" class="dg-ev-submit" id="dg-ev-idea-go">Share idea</button>' +
      '<p class="dg-ev-msg" id="dg-ev-idea-msg" role="status"></p></form></details>' +
      '<details class="dg-p-det"><summary>Give feedback</summary>' +
      '<form class="dg-ev-form dg-ev-mini" id="dg-ev-fb-form">' +
      '<label class="dg-ev-lab" for="dg-ev-fb">What should change about nights or the bot?</label>' +
      '<textarea class="dg-ev-in dg-ev-ta" id="dg-ev-fb" required maxlength="2000" rows="2"></textarea>' +
      '<button type="submit" class="dg-ev-submit">Send feedback</button>' +
      '<p class="dg-ev-msg" id="dg-ev-fb-msg" role="status"></p></form></details>' +
      '<details class="dg-p-det"><summary>Sponsor money (intent)</summary>' +
      '<form class="dg-ev-form dg-ev-mini" id="dg-ev-money-form">' +
      '<p class="dg-p-note">Card capture pending — we record intent and follow up.</p>' +
      '<label class="dg-ev-lab" for="dg-ev-m-name">Name</label>' +
      '<input class="dg-ev-in" id="dg-ev-m-name" required maxlength="80" autocomplete="name" />' +
      '<label class="dg-ev-lab" for="dg-ev-m-email">Email</label>' +
      '<input class="dg-ev-in" id="dg-ev-m-email" type="email" required maxlength="120" autocomplete="email" />' +
      '<label class="dg-ev-lab" for="dg-ev-m-org">Org</label>' +
      '<input class="dg-ev-in" id="dg-ev-m-org" maxlength="120" />' +
      '<label class="dg-ev-lab" for="dg-ev-m-amt">Amount / what you cover</label>' +
      '<input class="dg-ev-in" id="dg-ev-m-amt" required maxlength="200" />' +
      '<button type="submit" class="dg-ev-submit">Record intent</button>' +
      '<p class="dg-ev-msg" id="dg-ev-m-msg" role="status"></p></form></details>' +
      '<details class="dg-p-det"><summary>Ops</summary>' +
      '<p class="dg-p-note">Autonomy tick for operators. Not required for hosts.</p>' +
      '<button type="button" class="dg-ev-submit dg-ev-submit-ghost" id="dg-ev-tick">Run autonomy tick</button>' +
      '<p class="dg-ev-msg" id="dg-ev-tick-msg" role="status"></p></details>' +
      '</div>' +
      '<h3 class="dg-p-h3">AI, start to finish</h3>' +
      '<ul class="dg-p-list">' +
      '<li><strong>Guest list &amp; partners</strong> — AI curates who fits and drafts partner outreach.</li>' +
      '<li><strong>Tone of the night</strong> — AI tunes the vibe and seating chemistry.</li>' +
      '<li><strong>Intros</strong> — AI drafts them, only after a mutual yes.</li>' +
      '<li><strong>Sending</strong> — AI drafts invites and reminders; sending pending, opt-in, never a blast.</li>' +
      '</ul>' +
      '<details class="dg-p-det"><summary>How do I start?</summary><p>Chat above with seats, SF date windows, and one outcome — or email <a href="mailto:potter@trydemigod.com?subject=Events%20Bot%20pilot">potter@trydemigod.com</a>.</p></details>' +
      '<details class="dg-p-det"><summary>Pending tooling</summary><p>SMS, calendar sync, Stripe card capture — named pending until live. Email always works.</p></details>' +
      '<p class="dg-p-note">v__DG_FOOT_VER__ · <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a></p>',
  },
  notfound: {
    title: 'Page not found',
    doc: 'Not found · Demigod',
    desc: 'That page does not exist.',
    html: '<p class="dg-p-lead">No page here. Head home or open a brief.</p>',
  }
};
function pageCss() {
  // Versioned so Events gold (and other page polish) re-injects after foot bumps
  var existing = q('#dg-page-css');
  if (existing && existing.getAttribute('data-v') === '682') return;
  if (existing) existing.remove();
  var s = document.createElement('style');
  s.id = 'dg-page-css';
  s.setAttribute('data-v', '682');
  s.textContent =
    '#dg-page{position:relative;z-index:10050;background:#060606;min-height:100vh;overflow:visible;padding:1rem;animation:dg-page-in .25s ease both}' +
    '#dg-page .dg-page-card{max-width:34rem;margin:2rem auto;background:#121212;border:1px solid rgba(201,168,76,.28);border-radius:16px;padding:1.35rem 1.35rem 1.5rem;color:#F5F0E6;box-shadow:0 20px 60px rgba(0,0,0,.45)}' +
    '#dg-page .dg-page-top{display:flex;justify-content:space-between;align-items:center;gap:.75rem;margin-bottom:.75rem}' +
    '#dg-page h1{font-family:Cinzel,Georgia,serif;font-size:1.45rem;color:#C9A84C;margin:0;letter-spacing:.02em}' +
    '#dg-page .dg-page-x{min-width:44px;min-height:44px;border:1px solid rgba(201,168,76,.4);background:transparent;color:#E8D5A3;border-radius:10px;cursor:pointer;font-size:1.1rem}' +
    '#dg-page .dg-p-lead{color:#A8A29E;line-height:1.5;margin:.25rem 0 1rem}' +
    '#dg-page .dg-p-list{margin:.5rem 0 1rem;padding-left:1.15rem;color:#E7E5E4;line-height:1.55}' +
    '#dg-page .dg-p-list li{margin:.4rem 0}' +
    '#dg-page .dg-p-list strong{color:#C9A84C}' +
    '#dg-page .dg-decision-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem;margin:1rem 0 1.15rem;padding:0;list-style:none;counter-reset:dg-decision}' +
    '#dg-page .dg-decision-grid>li{display:flex;flex-direction:column;gap:.25rem;min-width:0;padding:.75rem;border:1px solid rgba(201,168,76,.22);border-radius:12px;background:rgba(201,168,76,.04);counter-increment:dg-decision}' +
    '#dg-page .dg-decision-grid span{color:#A8A29E;font-size:.68rem;letter-spacing:.09em;text-transform:uppercase}' +
    '#dg-page .dg-decision-grid strong{color:#F5F0E6;font-size:.86rem;line-height:1.35}' +
    '#dg-page .dg-decision-grid small{color:#A8A29E;font-size:.72rem;line-height:1.4}' +
    '#dg-page .dg-p-det{border-top:1px solid rgba(201,168,76,.15);padding:.55rem 0}' +
    '#dg-page .dg-p-det summary{cursor:pointer;color:#E8D5A3;font-weight:600;min-height:44px;display:flex;align-items:center}' +
    '#dg-page .dg-p-det p{color:#A8A29E;margin:.35rem 0 .25rem;line-height:1.45}' +
    '#dg-page .dg-p-h3{color:#C9A84C;font-size:1rem;margin:1rem 0 .35rem}' +
    '#dg-page .dg-p-grid{display:grid;grid-template-columns:1fr;gap:.65rem}' +
    '#dg-page .dg-p-grid>div{border:1px solid rgba(201,168,76,.2);border-radius:12px;padding:.85rem;background:rgba(10,10,10,.5)}' +
    '#dg-page .dg-p-grid p{color:#A8A29E;margin:.35rem 0 0;font-size:.9rem}' +
    '#dg-page .dg-p-hi{border-color:rgba(201,168,76,.55)!important;background:rgba(201,168,76,.08)!important}' +
    '#dg-page .dg-blog-hero{margin:0 0 1.1rem}' +
    '#dg-page .dg-blog-filters{display:flex;flex-wrap:wrap;gap:.4rem;margin:0 0 1rem}' +
    '#dg-page .dg-blog-chip{min-height:44px;padding:.4rem .85rem;border-radius:999px;border:1px solid rgba(201,168,76,.35);background:transparent;color:#E8D5A3;font:650 .82rem Manrope,system-ui,sans-serif;cursor:pointer}' +
    '#dg-page .dg-blog-chip-n{opacity:.75;font-weight:600;margin-left:.2rem}' +
    '#dg-page .dg-blog-chip.is-on{background:rgba(201,168,76,.18);border-color:#C9A84C;color:#C9A84C}' +
    '#dg-page .dg-blog-body p{margin:.35rem 0;color:#A8A29E;line-height:1.55}' +
    '#dg-page .dg-blog-grid{display:grid;gap:1rem;grid-template-columns:1fr}' +
    '@media(min-width:720px){#dg-page .dg-blog-grid{grid-template-columns:1fr 1fr}}' +
    '#dg-page .dg-blog-card{overflow:hidden;border:1px solid rgba(201,168,76,.22);border-radius:14px;background:rgba(14,14,18,.92);display:flex;flex-direction:column}' +
    '#dg-page .dg-blog-card img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover}' +
    '#dg-page .dg-blog-card .dg-blog-meta{display:flex;flex-wrap:wrap;gap:.35rem .75rem;align-items:center;margin:.7rem .9rem 0}' +
    '#dg-page .dg-blog-card small{color:#C9A84C;text-transform:uppercase;letter-spacing:.08em;font-size:.72rem;font-weight:700}' +
    '#dg-page .dg-blog-card time{color:#A8A29E;font-size:.78rem}' +
    '#dg-page .dg-blog-card h3{color:#E8D5A3;font-size:1.05rem;margin:.4rem .9rem;line-height:1.3;font-family:Cinzel,Georgia,serif}' +
    '#dg-page .dg-blog-card>p{color:#A8A29E;line-height:1.5;margin:.25rem .9rem .5rem}' +
    '#dg-page .dg-blog-more{margin:auto .9rem .9rem;border-top:1px solid rgba(201,168,76,.14);padding-top:.4rem}' +
    '#dg-page .dg-blog-more summary{cursor:pointer;color:#E8D5A3;font-weight:600;min-height:44px;display:flex;align-items:center;list-style:none}' +
    '#dg-page .dg-blog-more summary::-webkit-details-marker{display:none}' +
    '#dg-page .dg-blog-more summary:before{content:"\\25B8 ";color:#C9A84C}' +
    '#dg-page .dg-blog-more[open] summary:before{content:"\\25BE "}' +
    '#dg-page .dg-blog-more p{margin:.35rem 0 .15rem;color:#A8A29E;line-height:1.5}' +
    '#dg-page .dg-blog-empty{color:#A8A29E;font-size:.9rem}' +
    '#dg-blog-home{margin:2rem auto;max-width:52rem;padding:0 1rem 1.5rem}' +
    '#dg-blog-home .dg-blog-home-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.5rem;margin:0 0 .85rem}' +
    '#dg-blog-home h2{margin:0;font-family:Cinzel,Georgia,serif;font-size:1.25rem;color:#E8D5A3}' +
    '#dg-blog-home .dg-blog-home-all{color:#C9A84C;font-weight:650;text-decoration:none;min-height:44px;display:inline-flex;align-items:center}' +
    '#dg-blog-home .dg-blog-home-grid{display:grid;gap:.75rem;grid-template-columns:1fr}' +
    '@media(min-width:640px){#dg-blog-home .dg-blog-home-grid:not(.is-one){grid-template-columns:1fr 1fr 1fr}}' +
    '#dg-blog-home .dg-blog-home-grid.is-one{max-width:28rem}' +
    '#dg-page .dg-blog-card{opacity:1!important}' +
    '#dg-blog-home .dg-blog-home-card{border:1px solid rgba(201,168,76,.2);border-radius:12px;overflow:hidden;background:rgba(14,14,18,.9);text-decoration:none;color:inherit;display:block;transition:border-color .15s}' +
    '#dg-blog-home .dg-blog-home-card:hover{border-color:rgba(201,168,76,.55)}' +
    '#dg-blog-home .dg-blog-home-card img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}' +
    '#dg-blog-home .dg-blog-home-card strong{display:block;margin:.55rem .7rem .25rem;color:#E8D5A3;font-size:.92rem;line-height:1.3}' +
    '#dg-blog-home .dg-blog-home-card span{display:block;margin:0 .7rem .7rem;color:#A8A29E;font-size:.8rem;line-height:1.4}' +
    '#dg-page .dg-page-ctas{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1.15rem}' +
    '#dg-page .dg-page-ctas a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:.7rem 1.15rem;border-radius:12px;font-weight:700;text-decoration:none!important}' +
    '#dg-page .dg-page-ctas a.hire{background:#C9A84C;color:#0A0A0A}' +
    '#dg-page .dg-page-ctas a.talent{border:1.5px solid rgba(201,168,76,.9);color:#E8D5A3}' +
    '#dg-page .dg-page-ctas a.back{color:#A8A29E;border:1px solid rgba(168,162,158,.35);font-weight:600}' +
    '#dg-page a{color:#C9A84C}' +
    '#dg-page .dg-page-x:focus-visible,#dg-page .dg-page-ctas a:focus-visible,#dg-page summary:focus-visible{outline:2px solid #C9A84C!important;outline-offset:3px!important}' +
    '@keyframes dg-page-in{from{opacity:0}to{opacity:1}}' +
    '@media(prefers-reduced-motion:reduce){#dg-page{animation:none}}' +
    '@media(forced-colors:active){#dg-page{background:Canvas!important;forced-color-adjust:auto}#dg-page .dg-page-card,#dg-page .dg-decision-grid>li,#dg-page .dg-p-grid>div,#dg-page .dg-page-x,#dg-page .dg-page-ctas a{border:1px solid CanvasText!important;background:Canvas!important;color:CanvasText!important;box-shadow:none!important}#dg-page .dg-page-x:focus-visible,#dg-page .dg-page-ctas a:focus-visible,#dg-page summary:focus-visible{outline:2px solid Highlight!important}}' +
    '@media(max-width:639px){#dg-page .dg-decision-grid{grid-template-columns:1fr}}' +
    '@media(min-width:640px){#dg-page .dg-p-grid{grid-template-columns:1fr 1fr 1fr}}' +
    /* Night District MUD */
    '#dg-page.dg-page-mud .dg-page-card{max-width:min(40rem,96vw)}' +
    '#dg-page .dg-mud-host{margin:1rem 0 0}' +
    '#dg-page .dg-mud{border:1px solid rgba(166,255,203,.28);border-radius:6px;background:rgba(2,12,8,.72);overflow:hidden}' +
    '#dg-page .dg-mud-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem;padding:.55rem .75rem;border-bottom:1px solid rgba(166,255,203,.18);font-family:ui-monospace,Menlo,Consolas,monospace}' +
    '#dg-page .dg-mud-title{color:#a6ffcb;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase}' +
    '#dg-page .dg-mud-status{color:#9aab9f;font-size:.68rem}' +
    '#dg-page .dg-mud-log{height:min(52vh,420px);overflow:auto;padding:.7rem .85rem;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.84rem;line-height:1.45;color:#f3f0e7}' +
    '#dg-page .dg-mud-line{margin:0 0 .35rem;white-space:pre-wrap;word-break:break-word}' +
    '#dg-page .dg-mud-cmd{color:#9aab9f}' +
    '#dg-page .dg-mud-sys{color:#9aab9f;font-style:italic}' +
    '#dg-page .dg-mud-room{color:#a6ffcb;font-weight:600;margin-top:.45rem}' +
    '#dg-page .dg-mud-meta{color:#bdc9bf}' +
    '#dg-page .dg-mud-say{color:#e8f5ee}' +
    '#dg-page .dg-mud-err{color:#ffb4a2}' +
    '#dg-page .dg-mud-form{display:grid;grid-template-columns:auto 1fr auto;gap:.4rem;align-items:center;padding:.55rem .65rem;border-top:1px solid rgba(166,255,203,.18)}' +
    '#dg-page .dg-mud-prompt{color:#a6ffcb;font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:700}' +
    '#dg-page .dg-mud-input{width:100%;min-height:48px;background:#03140d;border:1px solid rgba(166,255,203,.28);border-radius:4px;color:#f3f0e7;padding:.55rem .65rem;font-size:16px;font-family:ui-monospace,Menlo,Consolas,monospace}' +
    '#dg-page .dg-mud-input:focus-visible{outline:2px solid #a6ffcb;outline-offset:2px}' +
    '#dg-page .dg-mud-hint{margin:.55rem 0 0;font-size:.75rem;color:#9aab9f}' +
    '#dg-page .dg-mud-hint code{color:#a6ffcb}' +
    '#dg-page .dg-mud-soft{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;padding:.4rem .65rem;border-top:1px solid rgba(166,255,203,.12);background:rgba(3,20,13,.55)}' +
    '#dg-page .dg-mud-soft[hidden]{display:none!important}' +
    '#dg-page .dg-mud-soft-label{color:#9aab9f;font-size:.72rem;font-family:ui-monospace,Menlo,Consolas,monospace;margin-right:.25rem}' +
    /* Events Bot — gold Demigod system (FOCUS: never phosphor MUD green) */
    '#dg-page.dg-page-events{background:radial-gradient(120% 80% at 80% 0%,rgba(201,168,76,.09),transparent 55%),#060606!important}' +
    '#dg-page.dg-page-events .dg-page-card{max-width:min(44rem,96vw);border-color:rgba(201,168,76,.38);' +
    'background:linear-gradient(180deg,#161412 0%,#121212 40%,#0e0e12 100%);box-shadow:0 24px 70px rgba(0,0,0,.5),inset 0 1px 0 rgba(201,168,76,.1)}' +
    '#dg-page.dg-page-events h1{font-family:Cinzel,Georgia,serif!important;color:#C9A84C!important;letter-spacing:.04em;' +
    'font-size:clamp(1.35rem,3.5vw,1.75rem)!important}' +
    '#dg-page.dg-page-events .dg-p-lead{color:#D6D3D1}' +
    '#dg-page.dg-page-events .dg-p-lead strong{color:#E8D5A3}' +
    '#dg-page.dg-page-events .dg-page-x{border-color:rgba(201,168,76,.5);color:#C9A84C}' +
    /* kill any leaked phosphor on events page only */
    '#dg-page.dg-page-events,#dg-page.dg-page-events *{--dg-phosphor:#C9A84C;--dg-signal:#E8D5A3}' +
    '#dg-page.dg-page-events a:not(.dg-ev-cta-pri):not(.dg-page-ctas a){color:#E8D5A3}' +
    '#dg-page .dg-ev-hero{position:relative;height:8.25rem;margin:-.35rem 0 1.1rem;border-radius:14px;border:1px solid rgba(201,168,76,.3);' +
    'background:linear-gradient(115deg,#0A0A0A 0%,#14110c 42%,rgba(201,168,76,.16) 100%),' +
    'radial-gradient(ellipse 70% 55% at 78% 35%,rgba(201,168,76,.2),transparent 62%);' +
    'box-shadow:inset 0 1px 0 rgba(232,213,163,.12),0 10px 28px rgba(0,0,0,.35);overflow:hidden}' +
    '#dg-page .dg-ev-hero::after{content:"DEMIGOD · EVENTS";position:absolute;left:1rem;bottom:.85rem;' +
    'font-family:Cinzel,Georgia,serif;font-size:.72rem;font-weight:700;letter-spacing:.18em;color:rgba(201,168,76,.85)}' +
    '#dg-page .dg-ev-hero::before{content:"";position:absolute;right:-10%;top:-30%;width:55%;height:140%;' +
    'background:radial-gradient(circle,rgba(201,168,76,.18),transparent 68%);pointer-events:none}' +
    '#dg-page .dg-ev-pill{display:inline-flex;align-items:center;margin:0 0 .85rem;padding:.28rem .75rem;border-radius:999px;' +
    'border:1px solid rgba(201,168,76,.42);color:#C9A84C;font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;' +
    'background:rgba(201,168,76,.06)}' +
    '#dg-page .dg-ev-cta-band{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 1.25rem}' +
    '#dg-page .dg-ev-cta-pri{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:.7rem 1.2rem;border-radius:12px;' +
    'background:linear-gradient(180deg,#E8D5A3 0%,#C9A84C 100%);color:#0A0A0A!important;font-weight:700;text-decoration:none!important;' +
    'box-shadow:0 6px 18px rgba(201,168,76,.22)}' +
    '#dg-page .dg-ev-cta-sec{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:.7rem 1rem;border-radius:12px;' +
    'border:1.5px solid rgba(201,168,76,.55);color:#E8D5A3!important;font-weight:650;text-decoration:none!important;background:rgba(201,168,76,.04)}' +
    '#dg-page .dg-ev-cta-pri:hover,#dg-page .dg-ev-cta-sec:hover{transform:translateY(-1px)}' +
    '#dg-page .dg-ev-cta-pri:focus-visible,#dg-page .dg-ev-cta-sec:focus-visible{outline:2px solid #C9A84C;outline-offset:3px}' +
    '#dg-page .dg-events-chat{margin:0 0 1.35rem;border:1px solid rgba(201,168,76,.32);border-radius:14px;background:#141210;overflow:hidden;' +
    'box-shadow:0 14px 44px rgba(0,0,0,.4),inset 0 1px 0 rgba(201,168,76,.08)}' +
    '#dg-page .dg-ec-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem;padding:.75rem .95rem;' +
    'border-bottom:1px solid rgba(201,168,76,.2);background:linear-gradient(90deg,rgba(201,168,76,.08),rgba(201,168,76,.02))}' +
    '#dg-page .dg-ec-title{color:#C9A84C;font-family:Cinzel,Georgia,serif;font-size:.78rem;letter-spacing:.1em;text-transform:uppercase;font-weight:600}' +
    '#dg-page .dg-ec-status{color:#A8A29E;font-size:.72rem}' +
    '#dg-page .dg-ec-note{margin:0;padding:.55rem .95rem;font-size:.84rem;color:#A8A29E;line-height:1.45;border-bottom:1px solid rgba(201,168,76,.12)}' +
    '#dg-page .dg-ec-log{max-height:min(42vh,300px);overflow:auto;padding:.75rem .95rem;display:flex;flex-direction:column;gap:.55rem}' +
    '#dg-page .dg-ec-msg{max-width:92%;padding:.6rem .75rem;border-radius:12px;font-size:.9rem;line-height:1.5;white-space:pre-wrap;font-family:Manrope,system-ui,sans-serif}' +
    '#dg-page .dg-ec-msg.bot{align-self:flex-start;background:rgba(201,168,76,.09);border:1px solid rgba(201,168,76,.24);color:#F5F0E6}' +
    '#dg-page .dg-ec-msg.user{align-self:flex-end;background:rgba(201,168,76,.16);border:1px solid rgba(201,168,76,.35);color:#E8D5A3}' +
    '#dg-page .dg-ec-form{display:grid;grid-template-columns:1fr auto;gap:.5rem;padding:.75rem .95rem;border-top:1px solid rgba(201,168,76,.2)}' +
    '#dg-page .dg-ec-input{width:100%;min-height:48px;resize:vertical;background:#0A0A0A;border:1px solid rgba(201,168,76,.32);border-radius:12px;' +
    'color:#F5F0E6;padding:.6rem .75rem;font-size:16px;font-family:Manrope,system-ui,sans-serif}' +
    '#dg-page .dg-ec-input:focus-visible{outline:2px solid #C9A84C;outline-offset:3px}' +
    '#dg-page .dg-ec-send{min-height:48px;min-width:5.5rem;padding:0 1rem;border-radius:12px;border:1px solid #C9A84C;' +
    'background:linear-gradient(180deg,#E8D5A3,#C9A84C);color:#0A0A0A;font-family:Manrope,system-ui,sans-serif;font-weight:700;cursor:pointer}' +
    '#dg-page .dg-ec-send:hover{box-shadow:0 8px 24px rgba(201,168,76,.28)}' +
    '#dg-page .dg-ec-send:disabled{opacity:.55;cursor:wait}' +
    '#dg-page .dg-ev-cycle{grid-template-columns:repeat(auto-fill,minmax(7.5rem,1fr))!important}' +
    '#dg-page.dg-page-events .dg-ev-cycle>li{border-color:rgba(201,168,76,.28);background:rgba(201,168,76,.05)}' +
    '#dg-page.dg-page-events .dg-ev-cycle span{color:#C9A84C}' +
    '#dg-page .dg-ev-tabs{display:flex;flex-wrap:wrap;gap:.4rem;margin:.65rem 0 .5rem}' +
    '#dg-page .dg-ev-tab{min-height:44px;padding:.45rem .9rem;border-radius:12px;border:1px solid rgba(201,168,76,.38);background:transparent;' +
    'color:#E8D5A3;font-weight:650;cursor:pointer;font-family:Manrope,system-ui,sans-serif;transition:border-color .18s,background .18s}' +
    '#dg-page .dg-ev-tab.is-on{background:rgba(201,168,76,.2);border-color:rgba(201,168,76,.8);color:#C9A84C}' +
    '#dg-page .dg-ev-offers{margin:.35rem 0 0;padding:1rem;border:1px solid rgba(201,168,76,.28);border-radius:14px;background:rgba(14,14,18,.95)}' +
    '#dg-page .dg-ev-form{display:grid;gap:.35rem}' +
    '#dg-page .dg-ev-lab{font-size:.78rem;color:#A8A29E;margin-top:.3rem}' +
    '#dg-page .dg-ev-in{width:100%;min-height:48px;padding:.6rem .75rem;border-radius:12px;border:1px solid rgba(201,168,76,.3);' +
    'background:#0A0A0A;color:#F5F0E6;font-size:16px;font-family:Manrope,system-ui,sans-serif}' +
    '#dg-page .dg-ev-ta{min-height:5.5rem;resize:vertical}' +
    '#dg-page .dg-ev-in:focus-visible{outline:2px solid #C9A84C;outline-offset:3px}' +
    '#dg-page .dg-ev-submit{min-height:48px;margin-top:.6rem;border-radius:12px;border:1px solid #C9A84C;' +
    'background:linear-gradient(180deg,#E8D5A3,#C9A84C);color:#0A0A0A;font-weight:700;cursor:pointer;font-family:Manrope,system-ui,sans-serif}' +
    '#dg-page .dg-ev-submit-ghost{background:transparent;color:#C9A84C}' +
    '#dg-page .dg-ev-submit:disabled{opacity:.55;cursor:wait}' +
    '#dg-page .dg-ev-msg{min-height:1.2rem;font-size:.84rem;color:#A8A29E;margin:.4rem 0 0}' +
    '#dg-page .dg-ev-msg.ok{color:#E8D5A3}' +
    '#dg-page .dg-ev-msg.err{color:#ffb4a2}' +
    '#dg-page .dg-ev-counts{font-size:.8rem;color:#A8A29E;margin:.5rem 0 1rem}' +
    '#dg-page .dg-ev-extra{display:grid;gap:0;margin:1.1rem 0 1.25rem}' +
    '#dg-page .dg-ev-mini{padding:.35rem 0 .65rem}' +
    '#dg-page .dg-ev-status{margin:.35rem 0 1.15rem;padding:.75rem .95rem;border-radius:12px;border:1px solid rgba(201,168,76,.28);' +
    'background:rgba(201,168,76,.08);color:#A8A29E;font-size:.88rem;line-height:1.45}' +
    '#dg-page .dg-ev-cycle>li.is-current{border-color:rgba(201,168,76,.75)!important;background:rgba(201,168,76,.14)!important}' +
    '#dg-page .dg-ev-cycle>li.is-current strong{color:#C9A84C}' +
    '#dg-page .dg-ev-cal{margin:0 0 1.35rem;padding:1rem;border:1px solid rgba(201,168,76,.28);border-radius:14px;background:rgba(14,14,18,.95)}' +
    '#dg-page .dg-ev-cal-nav{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin:0 0 .65rem}' +
    '#dg-page .dg-ev-cal-month{margin:0;font-family:Cinzel,Georgia,serif;font-size:1.05rem;color:#E8D5A3;font-weight:600}' +
    '#dg-page .dg-ev-cal-navbtn{min-width:44px;min-height:44px;border-radius:12px;border:1px solid rgba(201,168,76,.38);background:transparent;color:#C9A84C;font-size:1.35rem;cursor:pointer}' +
    '#dg-page .dg-ev-cal-navbtn:hover{background:rgba(201,168,76,.12)}' +
    '#dg-page .dg-ev-cal-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin:0 0 .35rem;text-align:center;font-size:.72rem;color:#A8A29E;font-weight:650}' +
    '#dg-page .dg-ev-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}' +
    '#dg-page .dg-ev-cal-cell{min-height:3.1rem;padding:.25rem .2rem;border-radius:10px;border:1px solid rgba(201,168,76,.14);background:#0A0A0A;color:#F5F0E6;font-size:.82rem;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;font-family:Manrope,system-ui,sans-serif}' +
    '#dg-page .dg-ev-cal-cell:hover{border-color:rgba(201,168,76,.48)}' +
    '#dg-page .dg-ev-cal-cell.is-out{opacity:.35;cursor:default}' +
    '#dg-page .dg-ev-cal-cell.is-today{border-color:rgba(201,168,76,.6);box-shadow:inset 0 0 0 1px rgba(201,168,76,.28)}' +
    '#dg-page .dg-ev-cal-cell.is-sel{background:rgba(201,168,76,.18);border-color:#C9A84C;color:#E8D5A3}' +
    '#dg-page .dg-ev-cal-cell:focus-visible{outline:2px solid #C9A84C;outline-offset:2px}' +
    '#dg-page .dg-ev-cal-dots{display:flex;flex-wrap:wrap;justify-content:center;gap:2px;min-height:8px}' +
    '#dg-page .dg-ev-cal-dot{width:5px;height:5px;border-radius:50%;background:#C9A84C}' +
    '#dg-page .dg-ev-cal-n{font-size:.65rem;color:#C9A84C;font-weight:700;line-height:1}' +
    '#dg-page .dg-ev-cal-daypanel{margin-top:.85rem;padding-top:.75rem;border-top:1px solid rgba(201,168,76,.2)}' +
    '#dg-page .dg-ev-cal-daylabel{margin:0 0 .45rem;color:#E8D5A3;font-weight:650;font-size:.92rem}' +
    '#dg-page .dg-ev-cal-list{list-style:none;margin:0 0 .75rem;padding:0;display:grid;gap:.4rem}' +
    '#dg-page .dg-ev-cal-list li{padding:.55rem .7rem;border-radius:10px;border:1px solid rgba(201,168,76,.24);background:rgba(201,168,76,.07);color:#F5F0E6;font-size:.88rem;line-height:1.35}' +
    '#dg-page .dg-ev-cal-list li strong{color:#C9A84C;font-weight:650}' +
    '#dg-page .dg-ev-cal-list li em{color:#A8A29E;font-style:normal;font-size:.8rem}' +
    '#dg-page .dg-ev-cal-empty{color:#A8A29E;font-size:.86rem;margin:0 0 .65rem}' +
    '#dg-page .dg-ev-cal-row{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}' +
    '#dg-page .dg-ev-cal-add{margin-top:.25rem}' +
    '@media(max-width:520px){#dg-page .dg-ev-cal-row{grid-template-columns:1fr}#dg-page .dg-ev-cal-cell{min-height:2.6rem;font-size:.75rem}}' +
    '@media(prefers-reduced-motion:reduce){#dg-page .dg-ev-cta-pri,#dg-page .dg-ev-cta-sec,#dg-page .dg-ev-tab{transition:none;transform:none!important}}' +
    '#dg-page .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}';
  document.head.appendChild(s);
}
/* Events Bot calendar — multi-event same day OK */
function eventsBotCalendarMount(root) {
  var box = root && root.querySelector('#dg-ev-cal');
  if (!box || box.dataset.dgEvCal === '1') return;
  box.dataset.dgEvCal = '1';
  var grid = box.querySelector('#dg-ev-cal-grid');
  var monthEl = box.querySelector('#dg-ev-cal-month');
  var listEl = box.querySelector('#dg-ev-cal-list');
  var dayLabel = box.querySelector('#dg-ev-cal-daylabel');
  var form = box.querySelector('#dg-ev-cal-form');
  var dateIn = box.querySelector('#dg-ev-cal-date');
  var msg = box.querySelector('#dg-ev-cal-msg');
  var prev = box.querySelector('#dg-ev-cal-prev');
  var next = box.querySelector('#dg-ev-cal-next');
  var now = new Date();
  var viewY = now.getFullYear();
  var viewM = now.getMonth(); // 0-based
  var selected = '';
  var byDate = {};
  var apiBase = '';

  function ymd(y, m0, d) {
    return y + '-' + String(m0 + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }
  function setMsg(t, cls) {
    if (!msg) return;
    msg.textContent = t || '';
    msg.className = 'dg-ev-msg' + (cls ? ' ' + cls : '');
  }
  function monthName(y, m0) {
    try {
      return new Date(y, m0, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
    } catch (e) {
      return y + '-' + (m0 + 1);
    }
  }
  function renderDayList(date) {
    selected = date || selected;
    if (dateIn) dateIn.value = selected || '';
    if (dayLabel) {
      dayLabel.textContent = selected
        ? 'Events on ' + selected + ' (multiple OK)'
        : 'Select a day';
    }
    if (!listEl) return;
    listEl.innerHTML = '';
    var items = (selected && byDate[selected]) || [];
    if (!selected) {
      listEl.innerHTML = '<li class="dg-ev-cal-empty" style="border:0;background:transparent;padding:0">Pick a date on the grid.</li>';
      return;
    }
    if (!items.length) {
      listEl.innerHTML =
        '<li class="dg-ev-cal-empty" style="border:0;background:transparent;padding:0">No events yet this day — add one below.</li>';
      return;
    }
    items.forEach(function (ev) {
      var li = document.createElement('li');
      var meta = [ev.time, ev.venue, ev.stage, ev.seats ? ev.seats + ' seats' : '']
        .filter(Boolean)
        .join(' · ');
      li.innerHTML =
        '<strong>' +
        esc(ev.title || 'Untitled') +
        '</strong>' +
        (meta ? '<br><em>' + esc(meta) + '</em>' : '');
      listEl.appendChild(li);
    });
  }
  function renderGrid() {
    if (monthEl) monthEl.textContent = monthName(viewY, viewM);
    if (!grid) return;
    grid.innerHTML = '';
    var first = new Date(viewY, viewM, 1);
    var startPad = first.getDay();
    var daysIn = new Date(viewY, viewM + 1, 0).getDate();
    var today = ymd(now.getFullYear(), now.getMonth(), now.getDate());
    var total = startPad + daysIn;
    var cells = Math.ceil(total / 7) * 7;
    for (var i = 0; i < cells; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dg-ev-cal-cell';
      var dayNum = i - startPad + 1;
      if (dayNum < 1 || dayNum > daysIn) {
        btn.classList.add('is-out');
        btn.disabled = true;
        btn.innerHTML = '<span></span>';
        grid.appendChild(btn);
        continue;
      }
      var key = ymd(viewY, viewM, dayNum);
      var n = (byDate[key] || []).length;
      btn.dataset.date = key;
      btn.setAttribute('aria-label', key + (n ? ', ' + n + ' event' + (n === 1 ? '' : 's') : ''));
      if (key === today) btn.classList.add('is-today');
      if (key === selected) btn.classList.add('is-sel');
      var dots = '';
      if (n > 0) {
        var show = Math.min(n, 4);
        dots = '<span class="dg-ev-cal-dots" aria-hidden="true">';
        for (var d = 0; d < show; d++) dots += '<span class="dg-ev-cal-dot"></span>';
        dots += '</span>';
        if (n > 4) dots += '<span class="dg-ev-cal-n">+' + (n - 4) + '</span>';
        else if (n > 1) dots += '<span class="dg-ev-cal-n">' + n + '</span>';
      } else {
        dots = '<span class="dg-ev-cal-dots"></span>';
      }
      btn.innerHTML = '<span>' + dayNum + '</span>' + dots;
      btn.addEventListener('click', function (ev) {
        var dt = ev.currentTarget.dataset.date;
        selected = dt;
        renderGrid();
        renderDayList(dt);
      });
      grid.appendChild(btn);
    }
  }
  async function load() {
    try {
      var pick = await dgEventsBotPickBase(4000);
      if (!pick || !pick.base) throw new Error('offline');
      apiBase = pick.base;
      var r = await dgEventsBotFetch(
        apiBase + '/calendar?year=' + viewY + '&month=' + (viewM + 1),
        { method: 'GET', signal: AbortSignal.timeout(5000) },
      );
      if (!r.ok) throw new Error('cal');
      var j = await r.json();
      byDate = (j && j.byDate) || {};
      // also index flat events if byDate missing
      if (j && j.events && !Object.keys(byDate).length) {
        byDate = {};
        j.events.forEach(function (e) {
          if (!e || !e.date) return;
          if (!byDate[e.date]) byDate[e.date] = [];
          byDate[e.date].push(e);
        });
      }
    } catch (e) {
      byDate = byDate || {};
    }
    if (!selected) selected = ymd(now.getFullYear(), now.getMonth(), now.getDate());
    /* Prefer a day in this month that has events so multi-day is visible without hunting */
    if (!(byDate[selected] || []).length) {
      var keys = Object.keys(byDate || {}).filter(function (k) {
        return k.indexOf(viewY + '-' + String(viewM + 1).padStart(2, '0') + '-') === 0;
      });
      if (keys.length) {
        keys.sort();
        selected = keys[0];
      }
    }
    renderGrid();
    renderDayList(selected);
  }
  if (prev)
    prev.addEventListener('click', function () {
      viewM -= 1;
      if (viewM < 0) {
        viewM = 11;
        viewY -= 1;
      }
      load();
    });
  if (next)
    next.addEventListener('click', function () {
      viewM += 1;
      if (viewM > 11) {
        viewM = 0;
        viewY += 1;
      }
      load();
    });
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var date = (dateIn && dateIn.value) || selected;
      var title = ((box.querySelector('#dg-ev-cal-title') || {}).value || '').trim();
      if (!date) {
        setMsg('Pick a day first.', 'err');
        return;
      }
      if (!title) {
        setMsg('Title required.', 'err');
        return;
      }
      var payload = {
        date: date,
        title: title,
        time: ((box.querySelector('#dg-ev-cal-time') || {}).value || '').trim(),
        seats: ((box.querySelector('#dg-ev-cal-seats') || {}).value || '').trim(),
        venue: ((box.querySelector('#dg-ev-cal-venue') || {}).value || '').trim(),
        city: 'San Francisco',
        source: 'web-calendar',
      };
      var submit = box.querySelector('#dg-ev-cal-submit');
      if (submit) submit.disabled = true;
      setMsg('Saving…');
      try {
        if (!apiBase) {
          var pick2 = await dgEventsBotPickBase(4000);
          apiBase = (pick2 && pick2.base) || '';
        }
        if (!apiBase) throw new Error('offline');
        var r = await dgEventsBotFetch(apiBase + '/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        });
        var j = await r.json().catch(function () {
          return {};
        });
        if (!r.ok || !j.ok) {
          setMsg(j.message || j.error || 'Could not save', 'err');
        } else {
          setMsg(j.message || 'Added — same day can hold more.', 'ok');
          var t = box.querySelector('#dg-ev-cal-title');
          if (t) t.value = '';
          await load();
          renderDayList(date);
        }
      } catch (err) {
        setMsg('API offline — try again when Events Bot is up.', 'err');
      }
      if (submit) submit.disabled = false;
    });
  }
  load();
}
/* Events Bot — live cycle status from GET /lifecycle */
function eventsBotCycleMount(root) {
  var status = root && root.querySelector('#dg-ev-status');
  var cycle = root && root.querySelector('.dg-ev-cycle');
  if (!status || status.dataset.dgEvCycle === '1') return;
  status.dataset.dgEvCycle = '1';

  function stageLabel(id) {
    var map = {
      ideate: 'Ideate',
      resource: 'Resource',
      plan: 'Plan',
      rsvp: 'RSVP',
      run: 'Run',
      followup: 'Follow-up',
      debrief: 'Debrief → next',
    };
    return map[id] || id || 'Ideate';
  }

  async function load() {
    try {
      var pick = await dgEventsBotPickBase(4000);
      if (!pick || !pick.base) throw new Error('no base');
      var r = await dgEventsBotFetch(pick.base + '/lifecycle', {
        method: 'GET',
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) throw new Error('lifecycle');
      var j = await r.json();
      if (!j || !j.ok) throw new Error('bad lifecycle');
      var ae = j.activeEvent || {};
      // Prefer API hasActive (empty shell after seed is not "in flight")
      var hasActive =
        j.hasActive === true ||
        ae.hasActive === true ||
        (j.hasActive == null && ae.hasActive == null && !!(ae.id || ae.title));
      if (j.hasActive === false || ae.hasActive === false) hasActive = false;
      var st = hasActive ? ae.stage || 'ideate' : 'ideate';
      var oc = j.offerCounts || {};
      var title = hasActive && ae.title ? '“' + ae.title + '” · ' : '';
      var offers =
        (oc.sponsor | 0) + ' sponsor · ' + (oc.venue | 0) + ' venue · ' + (oc.volunteer | 0) + ' volunteer';
      if (hasActive) {
        status.textContent =
          'In flight: ' + title + 'stage ' + stageLabel(st) + '. Offers on file: ' + offers + '.';
      } else {
        status.textContent =
          'No named event in flight — chat below to ideate one. Stage default: ' +
          stageLabel(st) +
          '. Offers on file: ' +
          offers +
          '.';
      }
      if (cycle) {
        var items = cycle.querySelectorAll('li');
        var order = ['ideate', 'resource', 'plan', 'rsvp', 'run', 'followup', 'debrief'];
        var idx = order.indexOf(st);
        items.forEach(function (li, n) {
          li.classList.toggle('is-current', n === idx);
        });
      }
      return;
    } catch (e) {}
    status.textContent =
      'No live status yet — use the stages as the playbook. Chat still drafts; offers can fall back to email.';
  }
  load();
}
/* Events Bot offers — sponsor / venue / volunteer (API + mailto fallback) */
function eventsBotOffersMount(root) {
  var form = root && root.querySelector('#dg-ev-form');
  if (!form || form.dataset.dgEv === '1') return;
  form.dataset.dgEv = '1';
  var kindIn = form.querySelector('#dg-ev-kind');
  var msg = form.querySelector('#dg-ev-msg');
  var submit = form.querySelector('#dg-ev-submit');
  var orgLab = form.querySelector('#dg-ev-org-lab');
  var offerLab = form.querySelector('#dg-ev-offer-lab');
  var capLab = form.querySelector('#dg-ev-cap-lab');
  var counts = root.querySelector('#dg-ev-counts');
  var offerUrl = '';

  var labels = {
    sponsor: { org: 'Org / brand', offer: 'What you can sponsor', cap: false },
    venue: { org: 'Venue name', offer: 'Space details (area, amenities, windows)', cap: true },
    volunteer: { org: 'Org (optional)', offer: 'How you can help (check-in, photo, setup…)', cap: false },
  };

  function setMsg(t, cls) {
    if (!msg) return;
    msg.textContent = t || '';
    msg.className = 'dg-ev-msg' + (cls ? ' ' + cls : '');
  }
  function setKind(k) {
    k = k === 'venue' || k === 'volunteer' ? k : 'sponsor';
    if (kindIn) kindIn.value = k;
    form.setAttribute('data-ev-kind', k);
    var L = labels[k];
    if (orgLab) orgLab.textContent = L.org;
    if (offerLab) offerLab.textContent = L.offer;
    if (capLab) capLab.style.display = L.cap ? '' : 'none';
    var cap = form.querySelector('#dg-ev-capacity');
    if (cap) cap.style.display = L.cap ? '' : 'none';
    root.querySelectorAll('.dg-ev-tab').forEach(function (btn) {
      var on = btn.getAttribute('data-ev-tab') === k;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  root.querySelectorAll('.dg-ev-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setKind(btn.getAttribute('data-ev-tab'));
    });
  });

  async function probe() {
    try {
      var pick = await dgEventsBotPickBase(4000);
      if (!pick || !pick.base) throw new Error('offline');
      offerUrl = pick.base + '/offer';
      try {
        var c = await dgEventsBotFetch(pick.base + '/offers', {
          signal: AbortSignal.timeout(4000),
        }).then(function (x) {
          return x.json();
        });
        if (c && c.counts && counts) {
          counts.textContent =
            'Offers on file: ' +
            (c.counts.sponsor | 0) +
            ' sponsor · ' +
            (c.counts.venue | 0) +
            ' venue · ' +
            (c.counts.volunteer | 0) +
            ' volunteer (counts only)';
        } else if (counts) {
          counts.textContent = 'Offer API online';
        }
      } catch (e2) {
        if (counts) counts.textContent = 'Offer API online';
      }
      return;
    } catch (e) {}
    offerUrl = '';
    if (counts) counts.textContent = 'Offer API offline — submit will open email to potter@trydemigod.com';
  }

  function mailtoFallback(payload) {
    var sub = encodeURIComponent('Events Bot offer: ' + payload.kind);
    var body = encodeURIComponent(
      [
        'Kind: ' + payload.kind,
        'Name: ' + payload.name,
        'Email: ' + payload.email,
        'Org: ' + (payload.org || ''),
        'City: ' + (payload.city || ''),
        'Capacity: ' + (payload.capacity || ''),
        'Offer: ' + (payload.offer || ''),
      ].join('\n'),
    );
    window.location.href = 'mailto:potter@trydemigod.com?subject=' + sub + '&body=' + body;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var payload = {
      kind: (kindIn && kindIn.value) || 'sponsor',
      name: (form.querySelector('#dg-ev-name') || {}).value || '',
      email: (form.querySelector('#dg-ev-email') || {}).value || '',
      org: (form.querySelector('#dg-ev-org') || {}).value || '',
      city: (form.querySelector('#dg-ev-city') || {}).value || '',
      capacity: (form.querySelector('#dg-ev-capacity') || {}).value || '',
      offer: (form.querySelector('#dg-ev-offer') || {}).value || '',
    };
    payload.name = String(payload.name).trim();
    payload.email = String(payload.email).trim();
    payload.offer = String(payload.offer).trim();
    if (!payload.name || !payload.email || !payload.offer) {
      setMsg('Name, email, and offer are required.', 'err');
      return;
    }
    if (submit) submit.disabled = true;
    setMsg('Submitting…');
    if (offerUrl) {
      try {
        var r = await dgEventsBotFetch(offerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(12000),
        });
        var j = await r.json().catch(function () {
          return {};
        });
        if (r.ok && j.ok) {
          setMsg(j.message || 'Offer recorded. potter@trydemigod.com will follow up.', 'ok');
          form.reset();
          setKind(payload.kind);
          probe();
          if (submit) submit.disabled = false;
          return;
        }
        setMsg(j.error || 'Could not save — trying email…', 'err');
      } catch (err) {
        setMsg('API unreachable — opening email…', 'err');
      }
    }
    mailtoFallback(payload);
    setMsg('Offer was not saved on the server — attempted to open your mail app with a draft.', 'err');
    if (submit) submit.disabled = false;
  });

  setKind('sponsor');
  probe();
  /* tunnel can lag cold-start — re-probe without waiting for reload */
  setTimeout(probe, 2500);
  setTimeout(probe, 8000);
}
/* Ideas, feedback, money, autonomy tick */
function eventsBotExtraMount(root) {
  var base = '';
  async function ensureBase() {
    if (base) return base;
    try {
      var pick = await dgEventsBotPickBase(4000);
      base = (pick && pick.base) || '';
    } catch (e0) {
      base = '';
    }
    return base;
  }
  async function post(path, body) {
    var root = await ensureBase();
    if (!root) return { ok: false, error: 'no local API' };
    var url = root + path;
    var r = await dgEventsBotFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: AbortSignal.timeout(90000),
    });
    return r.json().catch(function () {
      return { ok: false, error: 'bad json' };
    });
  }
  var ideaForm = root.querySelector('#dg-ev-idea-form');
  if (ideaForm && ideaForm.dataset.bound !== '1') {
    ideaForm.dataset.bound = '1';
    ideaForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = root.querySelector('#dg-ev-idea-msg');
      var seed = String((root.querySelector('#dg-ev-idea-seed') || {}).value || '').trim();
      if (msg) msg.textContent = 'Saving idea…';
      try {
        /* generate:true is ops-only — public web submits a host suggestion (no agent tools) */
        var j = await post('/idea', {
          title: seed || 'SF night idea',
          outcome: seed || 'Host suggestion from events page',
          source: 'web',
        });
        if (msg)
          msg.textContent = j.summary
            ? String(j.summary).slice(0, 400)
            : j.ok
              ? j.idea
                ? 'Idea recorded: ' + String(j.idea.title || seed || 'SF night').slice(0, 80)
                : 'Idea recorded.'
              : j.error || 'Failed';
        msg && msg.classList.add(j.ok !== false ? 'ok' : 'err');
      } catch (err) {
        if (msg) {
          msg.textContent = 'API offline — email potter@trydemigod.com with your idea.';
          msg.classList.add('err');
        }
      }
    });
  }
  var fbForm = root.querySelector('#dg-ev-fb-form');
  if (fbForm && fbForm.dataset.bound !== '1') {
    fbForm.dataset.bound = '1';
    fbForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = root.querySelector('#dg-ev-fb-msg');
      var text = (root.querySelector('#dg-ev-fb') || {}).value || '';
      try {
        var j = await post('/feedback', { text: text, topic: 'general' });
        if (msg) {
          msg.textContent = j.ok ? 'Feedback recorded. Thank you.' : j.error || 'Failed';
          msg.className = 'dg-ev-msg ' + (j.ok ? 'ok' : 'err');
        }
        if (j.ok) fbForm.reset();
      } catch (err) {
        window.location.href =
          'mailto:potter@trydemigod.com?subject=' +
          encodeURIComponent('Events Bot feedback') +
          '&body=' +
          encodeURIComponent(text);
      }
    });
  }
  var mForm = root.querySelector('#dg-ev-money-form');
  if (mForm && mForm.dataset.bound !== '1') {
    mForm.dataset.bound = '1';
    mForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = root.querySelector('#dg-ev-m-msg');
      var body = {
        name: (root.querySelector('#dg-ev-m-name') || {}).value || '',
        email: (root.querySelector('#dg-ev-m-email') || {}).value || '',
        org: (root.querySelector('#dg-ev-m-org') || {}).value || '',
        amountNote: (root.querySelector('#dg-ev-m-amt') || {}).value || '',
      };
      try {
        var j = await post('/money', body);
        if (msg) {
          msg.textContent = j.message || (j.ok ? 'Intent recorded (Stripe pending).' : j.error || 'Failed');
          msg.className = 'dg-ev-msg ' + (j.ok ? 'ok' : 'err');
        }
        if (j.ok) mForm.reset();
      } catch (err) {
        if (msg) {
          msg.textContent = 'API offline — email potter@trydemigod.com to pledge.';
          msg.className = 'dg-ev-msg err';
        }
      }
    });
  }
  var tick = root.querySelector('#dg-ev-tick');
  if (tick && tick.dataset.bound !== '1') {
    tick.dataset.bound = '1';
    tick.addEventListener('click', async function () {
      var msg = root.querySelector('#dg-ev-tick-msg');
      if (msg) msg.textContent = 'Autonomy tick running…';
      tick.disabled = true;
      try {
        var j = await post('/agent/tick', {
          goal: 'Invent original event ideas, save them, spin up if allowed, draft Partiful, queue proactive venue+sponsor outreach with bot identity.',
          maxSteps: 5,
        });
        if (msg) {
          if (j && (j.error || '').toString().indexOf('ops secret') >= 0) {
            msg.textContent = 'This action is available to Events Bot operators only.';
            msg.className = 'dg-ev-msg err';
          } else {
            msg.textContent = (j.summary || j.error || JSON.stringify(j).slice(0, 350)).slice(0, 500);
            msg.className = 'dg-ev-msg ' + (j.ok ? 'ok' : 'err');
          }
        }
      } catch (err) {
        if (msg) {
          msg.textContent = 'Tick failed — Events Bot API offline or ops blocked.';
          msg.className = 'dg-ev-msg err';
        }
      }
      tick.disabled = false;
    });
  }
}
/* Events Bot conversational chat — API (local Codex-class OpenAI) + offline fallback */
function eventsBotChatMount(root) {
  var box = root && root.querySelector('#dg-events-chat');
  if (!box || box.dataset.dgEc === '1') return;
  box.dataset.dgEc = '1';
  var log = box.querySelector('#dg-ec-log');
  var form = box.querySelector('#dg-ec-form');
  var input = box.querySelector('#dg-ec-input');
  var send = box.querySelector('#dg-ec-send');
  var status = box.querySelector('#dg-ec-status');
  var history = [];
  var apiBase = '';

  function addMsg(role, text) {
    if (!log) return;
    var d = document.createElement('div');
    d.className = 'dg-ec-msg ' + (role === 'user' ? 'user' : 'bot');
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }
  function setStatus(t) {
    if (status) status.textContent = t;
  }
  function offline(msg) {
    var last = (msg || '').toLowerCase();
    if (/date|when|calendar/.test(last))
      return 'I keep SF date windows on the active night and the calendar above (multiple events per day OK). Tell me 1–3 windows and I draft them into the plan — or email potter@trydemigod.com.';
    if (/guest|invite|who/.test(last))
      return 'I draft guest framing and invite copy (sending pending). Share seats, mix, and constraints if you have them — I still drive the night.';
    if (/agenda|run/.test(last))
      return 'I own the run-of-show: arrive → frame → structured block → free conversation → close + reconnect notes. Duration or vibe and I revise.';
    if (/sponsor|venue|volunteer|offer/.test(last))
      return 'Use Offer help below or paste details here. I fold offers in and draft outreach for anything missing.';
    return 'I am the organizer of record for SF nights end-to-end (not a host assistant). Ideate → Resource → Plan → RSVP → Run → Follow-up → Debrief. Try: "drive a 40-person SoMa party — free venue + drink sponsor" — or offer help / chat anytime. Outreach stays queued until email/SMS is live; no fake sends.';
  }

  async function probe() {
    try {
      var pick = await dgEventsBotPickBase(4000);
      if (pick && pick.base) {
        apiBase = pick.base + '/chat';
        var j = pick.j || {};
        setStatus(j.openai ? 'Ready' : 'Draft mode');
        return;
      }
    } catch (e) {}
    apiBase = '';
    setStatus('Draft mode');
  }

  async function ask(text) {
    history.push({ role: 'user', content: text });
    addMsg('user', text);
    send.disabled = true;
    setStatus('thinking…');
    var reply = offline(text);
    var mock = true;
    if (apiBase) {
      try {
        var r = await dgEventsBotFetch(apiBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
          signal: AbortSignal.timeout(45000),
        });
        var j = await r.json();
        if (j && j.reply) {
          reply = j.reply;
          mock = !!j.mock;
        }
      } catch (e) {
        reply = offline(text);
        mock = true;
      }
    }
    history.push({ role: 'assistant', content: reply });
    if (history.length > 24) history = history.slice(-24);
    addMsg('bot', reply);
    setStatus(mock ? 'Draft mode' : 'Ready');
    send.disabled = false;
    try {
      input.focus();
    } catch (e) {}
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = (input.value || '').trim();
    if (!t || send.disabled) return;
    input.value = '';
    ask(t);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  addMsg(
    'bot',
    'I run SF nights end-to-end — fun events welcome, not only Demigod-branded. When I invent ideas I lean sponsorable. You approve and send. What are we throwing?',
  );
  probe();
  setTimeout(probe, 2500);
  setTimeout(probe, 8000);
}

function mudMount(root) {
  try {
    var host = root && (root.querySelector('#dg-mud') || root.querySelector('.dg-mud-host'));
    if (!host) return;
    if (host.dataset.dgMudMounted === '1') return;
    host.dataset.dgMudMounted = '1';
    if (window.DemigodMud && typeof window.DemigodMud.mount === 'function') {
      window.DemigodMud.mount(host);
      return;
    }
    host.innerHTML = '<p class="dg-p-lead">MUD client failed to load. Refresh, or open <code>/?p=mud</code> again.</p>';
  } catch (e) {
    try { console.warn('mudMount', e); } catch (e2) {}
  }
}

/* v606: [el, prevInlineDisplay, prevPriority] for the body children openPage() hid inline.
   Shared by openPage/closePage; must outlive both calls. */
var dgPageHidden = [];
function closePage() {
  var el = q('#dg-page');
  if (el) el.remove();
  /* v606: restore the sections we hid inline, or the homepage stays blank forever. Restore the
     exact prior inline value+priority (they were display:block!important from the unhide system,
     not empty). Belt-and-braces: if anything went wrong, any leftover display:none is cleared. */
  try {
    (dgPageHidden || []).forEach(function (rec) {
      var el = rec[0]; if (!el) return;
      if (rec[1]) el.style.setProperty('display', rec[1], rec[2] || '');
      else el.style.removeProperty('display');
      /* Only clear OUR marker — hero() legitimately sets data-dg-hidden on sections it collapses
         (v565), and stripping those would un-collapse the homepage. */
      if (el.getAttribute('data-dg-hidden') === 'dg-page') el.removeAttribute('data-dg-hidden');
    });
  } catch (e) {}
  dgPageHidden = [];
  if (document.body) { document.body.classList.remove('dg-page-on'); document.body.style.overflow = ''; }
  try{var bar=q('#dg-bar');if(bar){bar.style.removeProperty('display');bar.removeAttribute('aria-hidden');}}catch(e){}
  try {
    var u = new URL(location.href);
    if (u.searchParams.has('p') || u.searchParams.has('page') || (history.state && history.state.dgPage)) {
      u.searchParams.delete('p');
      u.searchParams.delete('page');
      history.replaceState({}, '', u.pathname + (u.search || '') + (u.hash || ''));
    }
  } catch (e) {}
  try {
    document.title = window.__dgPagePrevTitle || 'Demigod · SF startup talent matching';
    window.__dgPagePrevTitle=null;
  } catch (e) {}
  try {
    var md2=document.querySelector('meta[name=description]');
    if(md2 && window.__dgPagePrevDesc!=null){ md2.setAttribute('content', window.__dgPagePrevDesc); window.__dgPagePrevDesc=null; }
  } catch (e) {}
  try {
    if (window.__dgPagePrevSocial) {
      Object.keys(window.__dgPagePrevSocial).forEach(function(sel){
        var el = document.querySelector(sel);
        if (el) el.setAttribute('content', window.__dgPagePrevSocial[sel]);
      });
      window.__dgPagePrevSocial = null;
    }
  } catch (e) {}
  try {
    if (window.__dgPagePrevCanonical) {
      var can2 = document.querySelector('link[rel=canonical]');
      if (can2) can2.setAttribute('href', window.__dgPagePrevCanonical);
      window.__dgPagePrevCanonical = null;
    }
  } catch (e) {}
  try {
    var returnFocus=window.__dgPageReturnFocus;
    window.__dgPageReturnFocus=null;
    if(returnFocus&&returnFocus.isConnected&&typeof returnFocus.focus==='function') returnFocus.focus();
  } catch (e) {}
}
function pageCtas(id) {
  var hire =
    '<a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">I&#39;m hiring</a>';
  var talent =
    '<a class="talent" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">I&#39;m looking</a>';
  var back = '<a class="back" href="/" id="dg-page-back">← Home</a>';
  if (id === 'hire') return '<a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief</a>' + talent + back;
  if (id === 'talent') return '<a class="talent" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Create profile</a>' + hire + back;
  if (id === 'events') {
    return (
      '<a class="hire" href="#dg-events-chat" id="dg-ec-focus">Chat with bot</a>' +
      '<a class="talent" href="mailto:potter@trydemigod.com?subject=Events%20Bot%20pilot">Email pilot</a>' +
      back
    );
  }
  if (id === 'mud') {
    return (
      '<a class="hire" href="#dg-mud" id="dg-mud-focus">Enter the district</a>' +
      '<a class="talent" href="/?p=events" data-dg-page="events">Events Bot</a>' +
      back
    );
  }
  if (id === 'contact' || id === 'legal' || id === 'partners') return hire + talent + back;
  return hire + talent + back;
}
function openPage(id, push) {
  var meta = DG_PAGES[id];
  if (!meta) return false;
  if(!q('#dg-page')) window.__dgPageReturnFocus=document.activeElement;
  pageCss();
  var old = q('#dg-page');
  if (old) old.remove();
  var root = document.createElement('div');
  root.id = 'dg-page';
  /* v606: a real in-flow page, not a dialog. aria-modal="true" told screen readers the rest of
     the document was inert — a lie for a page with its own URL (/events, /?p=events). role=main
     + the page <h1> is the honest semantic. Home nav stays reachable. */
  root.setAttribute('role', 'main');
  root.setAttribute('aria-label', meta.title);
  if (id === 'mud') root.classList.add('dg-page-mud');
  if (id === 'events') root.classList.add('dg-page-events');
  root.innerHTML =
    '<div class="dg-page-card"><div class="dg-page-top"><h1>' +
    meta.title +
    '</h1><button type="button" class="dg-page-x" aria-label="Close">✕</button></div>' +
    (String(meta.html || '').replace(/__DG_FOOT_VER__/g, String(window.__dgFootVer || window.dgFootVersion || '?'))) +
    '<div class="dg-page-ctas">' +
    pageCtas(id) +
    '</div></div>';
  document.body.appendChild(root);
  /* v606: no scroll lock — a page scrolls with the document. Hide the Webflow homepage sections
     INLINE rather than covering them with a fixed overlay: they carry inline display:*!important
     (the unhide system), which beats any stylesheet rule — a CSS-only hide silently does nothing.
     Verified: force-hiding sticks; no MutationObserver re-shows them. */
  document.body.classList.add('dg-page-on');
  try {
    /* Body-hide allowlist: never use blog slugs here (blog-sync used to stomp this and
       confused hide logic with deep-link routing). #dg-page is appended after this loop. */
    var KEEP = /^(?:)$/;
    /* openPage can run twice (deepLink on boot, then a nav click). Without this guard the second
       pass captures the ALREADY-HIDDEN display:none as the "prior" value, and closePage then
       faithfully restores none — leaving the homepage blank. Capture once per open. */
    if (!dgPageHidden.length)
    [].slice.call(document.body.children).forEach(function (el) {
      var t = el.tagName;
      if (t === 'SCRIPT' || t === 'STYLE' || t === 'LINK' || t === 'NOSCRIPT') return;
      if (el.id === 'dg-page') return;
      if (el.id && KEEP.test(el.id)) return;
      dgPageHidden.push([el, el.style.display, el.style.getPropertyPriority('display')]);
      el.style.setProperty('display', 'none', 'important');
      /* data-dg-hidden is the unhide system's own opt-out (_dgSkipHidden / forceMainVisible).
         Without it, forceMainVisible re-shows these sections right after boot and the page
         renders on top of a visible homepage. Reusing the author's hook, not inventing one. */
      el.setAttribute('data-dg-hidden', 'dg-page');
    });
  } catch (e) {}
  try { window.scrollTo(0, 0); } catch (e) {}
  /* v636: mini-page content is injected HERE, long after addMotion() ran at boot. CSS hides
     `.dg-reveal, .dg-blog-card, .dg-decision-grid li {opacity:0}` until IntersectionObserver adds
     .dg-in — but nothing ever observed these nodes, so /?p=events' whole 5-step Method list
     (01 Capture … 05 Follow-up) sat at opacity:0 permanently. Inverted a11y too: reduced-motion
     users saw it (the .dg-reduce override forces opacity:1); everyone else saw nothing.
     addMotion is idempotent and reuses window.__dgRevealObs, so re-running is safe. */
  try { addMotion(); } catch (e) {}
  try{var bar=q('#dg-bar');if(bar){bar.style.setProperty('display','none','important');bar.setAttribute('aria-hidden','true');}}catch(e){}
  try {
    if(!window.__dgPagePrevTitle) window.__dgPagePrevTitle=document.title;
    document.title = meta.doc;
  } catch (e) {}
  try {
    var md = document.querySelector('meta[name=description]');
    if (md && meta.desc) {
      if(!window.__dgPagePrevDesc) window.__dgPagePrevDesc=md.getAttribute('content')||'';
      md.setAttribute('content', meta.desc);
    }
  } catch (e) {}
  try {
    window.__dgPagePrevSocial = window.__dgPagePrevSocial || {};
    ['meta[property="og:title"]','meta[property="og:description"]','meta[name="twitter:title"]','meta[name="twitter:description"]'].forEach(function(sel){
      var el = document.querySelector(sel);
      if (!el) return;
      if (!(sel in window.__dgPagePrevSocial)) window.__dgPagePrevSocial[sel] = el.getAttribute('content') || '';
      el.setAttribute('content', /title/.test(sel) ? meta.doc : (meta.desc || el.getAttribute('content')));
    });
  } catch (e) {}
  try {
    var pageUrl = 'https://www.trydemigod.com/?p=' + id;
    var can = document.querySelector('link[rel=canonical]');
    if (can) {
      if (!window.__dgPagePrevCanonical) window.__dgPagePrevCanonical = can.getAttribute('href') || '';
      can.setAttribute('href', pageUrl);
    }
    window.__dgPagePrevSocial = window.__dgPagePrevSocial || {};
    ['meta[property="og:url"]','meta[name="twitter:url"]'].forEach(function(sel){
      var el = document.querySelector(sel);
      if (!el) return;
      if (!(sel in window.__dgPagePrevSocial)) window.__dgPagePrevSocial[sel] = el.getAttribute('content') || '';
      el.setAttribute('content', pageUrl);
    });
  } catch (e) {}
  root.querySelector('.dg-page-x').addEventListener('click', function () {
    closePage();
  });
  var bk = root.querySelector('#dg-page-back');
  if (bk)
    bk.addEventListener('click', function (e) {
      e.preventDefault();
      closePage();
    });
  root.addEventListener('click', function (e) {
    if (e.target === root) closePage();
  });
  qa('[data-demigod-modal]', root).forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var k = a.getAttribute('data-demigod-modal');
      closePage();
      if (k === 'startup') show(S);
      else if (k === 'jobseeker') show(J);
    });
  });
  qa('a[data-dg-page]', root).forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var pid = a.getAttribute('data-dg-page');
      if (pid && DG_PAGES[pid]) openPage(pid, true);
    });
  });
  if (push !== false) {
    try {
      var u = new URL(location.href);
      u.searchParams.set('p', id);
      history.pushState({ dgPage: id }, '', u.pathname + u.search + (u.hash || ''));
    } catch (e) {}
  }
  try {
    // Focus the page title, not the ✕ — focusing Close means Enter dismisses the page.
    var dgH = root.querySelector('h1,h2');
    if (dgH) { dgH.setAttribute('tabindex', '-1'); dgH.focus({ preventScroll: true }); }
    else root.querySelector('.dg-page-x').focus();
  } catch (e) {}
  // Deep-link Notes cards: render from DG_BLOG_POSTS + deep-link Full note
  if (id === 'blog') {
    try {
      blogPageMount(root);
    } catch (eBlog) {}
    focusBlogNoteFromHash(root);
  }
  if (id === 'events') {
    try {
      eventsBotCalendarMount(root);
      eventsBotCycleMount(root);
      eventsBotOffersMount(root);
      eventsBotExtraMount(root);
      eventsBotChatMount(root);
      var foc = root.querySelector('#dg-ec-focus');
      if (foc)
        foc.addEventListener('click', function (e) {
          e.preventDefault();
          var inp = root.querySelector('#dg-ec-input');
          var chat = root.querySelector('#dg-events-chat');
          if (chat) chat.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          try {
            if (inp) inp.focus();
          } catch (err) {}
        });
    } catch (e) {}
  }
  if (id === 'mud') {
    try {
      mudMount(root);
      var mf = root.querySelector('#dg-mud-focus');
      if (mf)
        mf.addEventListener('click', function (e) {
          e.preventDefault();
          var host = root.querySelector('#dg-mud');
          if (host) host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          try {
            var inp2 = root.querySelector('#dg-mud-input');
            if (inp2) inp2.focus();
          } catch (err2) {}
        });
    } catch (eMud) {}
  }

  // soft focus trap
  root.addEventListener('keydown', function(ev){
    if(ev.key!=='Tab') return;
    var f=[].slice.call(root.querySelectorAll('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(function(el){return !el.disabled&&el.offsetParent!==null;});
    if(!f.length) return;
    var first=f[0], last=f[f.length-1];
    if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}
    else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}
  });
  return true;
}
/** Published posts newest-first (SoR may already be sorted by bin/dg-blog sync). */
function blogPostsSorted() {
  var posts = Array.isArray(DG_BLOG_POSTS) ? DG_BLOG_POSTS.slice() : [];
  posts.sort(function (a, b) {
    var da = String((a && a.publishedAt) || '');
    var db = String((b && b.publishedAt) || '');
    if (da !== db) return db < da ? -1 : db > da ? 1 : 0;
    return String((a && a.slug) || '').localeCompare(String((b && b.slug) || ''));
  });
  return posts;
}
function blogBodyHtml(body) {
  var raw = String(body || '').trim();
  if (!raw) return '';
  return raw
    .split(/\n\n+/)
    .map(function (para) {
      return '<p>' + esc(para.replace(/\n/g, ' ').trim()) + '</p>';
    })
    .filter(function (p) {
      return p !== '<p></p>';
    })
    .join('');
}
/** Build one blog article card HTML (shared home + full page). */
function blogCardHtml(p, opts) {
  opts = opts || {};
  var slug = esc(p.slug || '');
  var cat = esc(p.category || 'Note');
  var title = esc(p.title || '');
  var sum = esc(p.summary || '');
  var bodyHtml = blogBodyHtml(p.body || '');
  var img = esc(p.image || '');
  var alt = esc(p.imageAlt || p.title || 'Blog post');
  var date = esc(p.publishedAt || '');
  if (opts.teaser) {
    return (
      '<a class="dg-blog-home-card" href="/?p=blog#note-' +
      slug +
      '" data-dg-page="blog" data-dg-note="' +
      slug +
      '">' +
      (img ? '<img src="' + img + '" alt="' + alt + '" loading="lazy" decoding="async" width="1200" height="675">' : '') +
      '<strong>' +
      title +
      '</strong><span>' +
      sum +
      '</span></a>'
    );
  }
  /* Single long essay with collapsed <details> looked empty; open when only one post or forced. */
  var openAttr = opts.open ? ' open' : '';
  return (
    '<article class="dg-blog-card" id="note-' +
    slug +
    '" data-blog-cat="' +
    cat +
    '">' +
    (img
      ? '<img src="' + img + '" alt="' + alt + '" loading="lazy" decoding="async" width="1200" height="675">'
      : '') +
    '<div class="dg-blog-meta"><small>' +
    cat +
    '</small>' +
    (date ? '<time datetime="' + date + '">' + date + '</time>' : '') +
    '</div>' +
    '<h3>' +
    title +
    '</h3><p>' +
    sum +
    '</p>' +
    '<details class="dg-blog-more"' +
    openAttr +
    '><summary>Full note · ' +
    title +
    '</summary><div class="dg-blog-body">' +
    bodyHtml +
    '</div></details></article>'
  );
}
/** Full /?p=blog page: category chips + grid from DG_BLOG_POSTS. */
function blogPageMount(root) {
  var grid = root && root.querySelector('#dg-blog-grid');
  var filters = root && root.querySelector('#dg-blog-filters');
  var empty = root && root.querySelector('#dg-blog-empty');
  if (!grid || grid.dataset.dgBlog === '1') return;
  grid.dataset.dgBlog = '1';
  var posts = blogPostsSorted();
  var cats = ['All'];
  var catCount = { All: posts.length };
  posts.forEach(function (p) {
    var c = p.category || 'Note';
    if (cats.indexOf(c) < 0) cats.push(c);
    catCount[c] = (catCount[c] || 0) + 1;
  });
  var active = 'All';
  function render() {
    var list = posts.filter(function (p) {
      return active === 'All' || (p.category || 'Note') === active;
    });
    /* One post in the filtered set: expand body so the page is not a teaser-only shell. */
    var expand = list.length === 1;
    grid.innerHTML = list
      .map(function (p) {
        return blogCardHtml(p, { open: expand });
      })
      .join('');
    if (empty) empty.hidden = list.length > 0;
    if (filters) {
      filters.querySelectorAll('.dg-blog-chip').forEach(function (btn) {
        var on = btn.getAttribute('data-cat') === active;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    try {
      /* Cards must be readable even if reveal IO is late/misses inside #dg-page. */
      qa('.dg-blog-card', grid).forEach(function (el) {
        el.classList.add('dg-reveal-in');
        el.style.opacity = '1';
      });
      addMotion();
    } catch (e0) {}
    /* Chip re-render wipes DOM; re-apply deep-link open/scroll if hash still points at a note. */
    try {
      focusBlogNoteFromHash(root);
    } catch (eH) {}
  }
  if (filters) {
    filters.innerHTML = cats
      .map(function (c) {
        var n = catCount[c] || 0;
        return (
          '<button type="button" class="dg-blog-chip' +
          (c === 'All' ? ' is-on' : '') +
          '" data-cat="' +
          esc(c) +
          '" aria-pressed="' +
          (c === 'All' ? 'true' : 'false') +
          '">' +
          esc(c) +
          ' <span class="dg-blog-chip-n">' +
          n +
          '</span></button>'
        );
      })
      .join('');
    filters.querySelectorAll('.dg-blog-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        active = btn.getAttribute('data-cat') || 'All';
        render();
      });
    });
  }
  render();
}
/** Homepage teaser: 3 latest posts above footer. */
function injectBlogHome() {
  if (q('#dg-blog-home')) return;
  var posts = blogPostsSorted();
  if (!posts.length) return;
  // #dg-blog-home styles live in pageCss(); on home no ?p= page opens, so nothing injected them
  // and the teaser rendered unstyled (grid->block, head->block, link inline 22px). Idempotent.
  try { pageCss(); } catch (e) {}
  var f = q('footer,.footer');
  if (!f || !f.parentNode) return;
  var sec = document.createElement('section');
  sec.id = 'dg-blog-home';
  sec.setAttribute('aria-label', 'Blog');
  var top = posts.slice(0, 3);
  sec.innerHTML =
    '<div class="dg-blog-home-head">' +
    '<h2>From the blog</h2>' +
    '<a class="dg-blog-home-all" href="/?p=blog" data-dg-page="blog">All posts →</a>' +
    '</div>' +
    '<div class="dg-blog-home-grid' +
    (top.length === 1 ? ' is-one' : '') +
    '">' +
    top
      .map(function (p) {
        return blogCardHtml(p, { teaser: true });
      })
      .join('') +
    '</div>';
  f.parentNode.insertBefore(sec, f);
  sec.querySelectorAll('a[data-dg-page="blog"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var note = a.getAttribute('data-dg-note');
      if (note) {
        try {
          history.replaceState(null, '', '/?p=blog#note-' + note);
        } catch (err) {}
      }
      openPage('blog', true);
    });
  });
  try {
    addMotion();
  } catch (e1) {}
}
/** Deep-link Notes: open Full note + title + scroll for #note-{slug} (or bare slug). */
function focusBlogNoteFromHash(root) {
  try {
    root = root || document.getElementById('dg-page');
    if (!root) return false;
    var nh = (location.hash || '').replace(/^#/, '');
    if (!nh) return false;
    var nid = /^note-/.test(nh) ? nh : ('note-' + nh);
    if (!/^[a-z0-9-]+$/i.test(nid)) return false;
    var card = root.querySelector('#' + nid);
    if (!card) return false;
    var det = card.querySelector('details');
    if (det) det.open = true;
    try {
      var nt = (card.querySelector('h3') && card.querySelector('h3').textContent || '').trim();
      var nd = (card.querySelector('p') && card.querySelector('p').textContent || '').trim();
      if (nt) {
        document.title = nt + ' · Notes · Demigod';
        var ogT=document.querySelector('meta[property="og:title"]'); if(ogT)ogT.setAttribute('content',nt+' · Demigod Notes');
        var twT=document.querySelector('meta[name="twitter:title"]'); if(twT)twT.setAttribute('content',nt+' · Demigod Notes');
      }
      if (nd) {
        var mD=document.querySelector('meta[name=description]'); if(mD)mD.setAttribute('content',nd);
        var ogD=document.querySelector('meta[property="og:description"]'); if(ogD)ogD.setAttribute('content',nd);
        var twD=document.querySelector('meta[name="twitter:description"]'); if(twD)twD.setAttribute('content',nd);
      }
    } catch (eTitle) {}
    try { var beh=(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)?'auto':'smooth'; card.scrollIntoView({ block: 'nearest', behavior: beh }); } catch (e2) { try { card.scrollIntoView(true); } catch (e3) {} }
    try {
      var sm = det && det.querySelector('summary');
      if (sm) { sm.setAttribute('tabindex', '-1'); sm.focus({ preventScroll: true }); }
    } catch (e4) {}
    return true;
  } catch (e) {
    return false;
  }
}

function routePages() {
  try {
    var map = {
      '/how': 'how',
      '/how-it-works': 'how',
      '/pricing': 'pricing',
      '/faq': 'faq',
      '/blog': 'blog',
      '/notes': 'blog',
      '/method': 'method',
      '/hire': 'hire',
      '/talent': 'talent',
      '/contact': 'contact',
      '/legal': 'legal',
      '/partners': 'partners',
      '/partnerships': 'partners',
      '/partnership': 'partners',
      '/compare': 'compare',
      '/pilot': 'pilot',
      '/network': 'talent',
      '/fees': 'pricing',
      '/security': 'legal',
      '/about': 'about',
      '/founders': 'founders',
      '/candidates': 'candidates',
      '/status': 'status',
      '/events': 'events',
      '/events-bot': 'events',
      '/event-bot': 'events',
      '/mud': 'mud',
      '/night-district': 'mud',
      '/night': 'mud',
    };
    var p = new URLSearchParams(location.search);
    var id = (p.get('p') || p.get('page') || '').toLowerCase();
    var path = (location.pathname || '/').replace(/\/+$/, '') || '/';
    if (!id) id = map[path] || '';
    if (id === 'network') id = 'talent';
    if (id === 'fees') id = 'pricing';
    if (id === 'security') id = 'legal';
    if (id && DG_PAGES[id]) {
      openPage(id, false);
      return true;
    }
    // soft 404 only for unknown non-root paths that are not site chrome
    if (path && path !== '/' && !/^\/(index\.html)?$/i.test(path) && !map[path]) {
      if (!/^\/(designer|cdn-cgi|api)/i.test(path)) {
        openPage('notfound', false);
        return true;
      }
    }
  } catch (e) {}
  return false;
}

function deepLink(){
  try{ if(routePages()) { window.__dgDeepLinked=1; return; } }catch(e){}
  if(window.__dgDeepLinked)return;
  try{
    var p=new URLSearchParams(location.search);
    var w=(p.get('wiz')||p.get('hire')||p.get('modal')||'').toLowerCase();
    var h=(location.hash||'').replace(/^#/,'').toLowerCase();
    if(!w&&/^(startup|founder|hire|engineer|talent|join|jobseeker)$/.test(h))w=h;
    if(h==='legal'||h==='privacy'||h==='terms'){ openPage('legal',false); window.__dgDeepLinked=1; return; }
    if(h==='partnerships'||h==='partners'){ openPage('partners',false); window.__dgDeepLinked=1; return; }
    if(/^note-/.test(h)||/^(epicurus-garden-hacker-houses)$/.test(h)){ openPage('blog',false); window.__dgDeepLinked=1; return; }
    if(!w)return;
    var open=function(){
      if(/^(startup|founder|hire|brief|company)$/.test(w)){window.__dgDeepLinked=1;show(S);return true}
      if(/^(engineer|talent|join|jobseeker|candidate|profile)$/.test(w)){window.__dgDeepLinked=1;show(J);return true}
      return false
    };
    if(!open()){/* retry later */}
    if(!window.__dgDeepLinked){
      setTimeout(function(){try{open()}catch(e){}},600);
      setTimeout(function(){try{open()}catch(e){}},1800);
    }
  }catch(e){}
}

function finalButtonLabels(){var a=q('#startup-hire [type=submit],#startup-modal form [type=submit]');if(a){a.value='Submit';a.textContent='Submit'}var b=q('#engineer-join [type=submit],#jobseeker-modal form [type=submit]');if(b){b.value='Submit';b.textContent='Submit'}var o=q('#startup-hire [name="90day-outcome"],#startup-modal [name="90day-outcome"]');if(o){o.placeholder='e.g. Ship self-serve onboarding and get 2 pilot customers';var l=o.id&&q('label[for="'+o.id+'"]');if(l)l.textContent='What should they ship in the first 90 days?'}}
function orgJsonLd(){if(q('#dg-org-jsonld'))return;var ld=document.createElement('script');ld.type='application/ld+json';ld.id='dg-org-jsonld';ld.textContent=JSON.stringify({'@context':'https://schema.org','@type':'Organization',name:'Demigod',url:'https://www.trydemigod.com',email:'potter@trydemigod.com',description:'Demigod tech matches SF startup talent, humans in the loop. 10% on hire.',areaServed:'San Francisco Bay Area'});document.head.appendChild(ld)}


function wizResumeToast(modal){
  try{
    /* v646: fire only when wizBuild actually resumed a sessionStorage draft. The old guard read
       window.__dgWizStore (hardcoded false) and localStorage (wizBuild clears it), so v604's
       same-session resume silently jumped the user mid-form with no explanation. */
    if(!modal||modal.querySelector('#dg-wiz-resume'))return;
    var rf=modal.querySelector('form');
    if(!rf||rf.dataset.dgWizResumed!=='1')return;
    delete rf.dataset.dgWizResumed;
    var t=document.createElement('p');
    t.id='dg-wiz-resume';
    t.setAttribute('role','status');
    t.style.cssText='margin:0 0 .65rem;padding:.5rem .7rem;border-radius:10px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.35);color:#E8D5A3;font-size:.85rem;line-height:1.35';
    t.textContent='Draft restored — continue where you left off.';
    var head=modal.querySelector('.dg-wiz-head')||modal.querySelector('h2')||modal.firstElementChild;
    if(head&&head.parentNode)head.parentNode.insertBefore(t, head.nextSibling);
    else modal.prepend(t);
  }catch(e){}
}
function wireLogoHome(){
  qa('a.w-nav-brand,a.nav_logo,a.nav_logo-link,.nav_logo-link,a.dg-logo,.logo-link').forEach(function(a){
    if(!a||a.dataset.dgLogo==='1')return;
    a.dataset.dgLogo='1';
    a.setAttribute('href','/');
    a.setAttribute('aria-label','Demigod home');
    a.addEventListener('click',function(e){
      if(q('#dg-page')){e.preventDefault();closePage();try{history.pushState({},'', '/')}catch(err){}}
    });
  });
}
function ensureReducedMotionHeroCss(){if(q('#dg-reduced-motion-hero'))return;var s=document.createElement('style');s.id='dg-reduced-motion-hero';s.textContent='@media(prefers-reduced-motion:reduce){.hero-section h1,.hero-section p,.header h1,.header p,.hero-actions,#dg-hero-chips,#dg-path-pills{animation:none!important;transition:none!important}}';document.head.appendChild(s)}
function ensureTapTargetCss(){if(q('#dg-tap-targets'))return;var s=document.createElement('style');s.id='dg-tap-targets';s.textContent='.hero-actions a[data-dg-cta],#dg-nav-hire,#dg-nav-talent,#dg-bar a{min-height:48px!important}a.nav_logo,a.footer_link{min-height:48px!important}';document.head.appendChild(s)}
function boot(){if(!document.body)return;forceMainVisible();run();ensureReducedMotionHeroCss();ensureTapTargetCss();finalButtonLabels();try{wireLogoHome();ensureLogo()}catch(e){}try{scrubBadStaticClaims();scrubContactEmail()}catch(e){}try{hero()}catch(e){}deepLink();try{document.body.classList.add('dg-ready');document.body.setAttribute('data-dg-ready','1')}catch(e){}try{if(window.requestIdleCallback)requestIdleCallback(function(){try{orgJsonLd()}catch(e){}});else setTimeout(function(){try{orgJsonLd()}catch(e){}},1200)}catch(e){}}boot();document.addEventListener('DOMContentLoaded',boot);[400,1500].forEach(function(ms){setTimeout(boot,ms)});/* v190: drop t=50 forceMainVisible — boot/run cover */
// Extra delayed dedupes to catch late-rendered Webflow elements / repeated sections
/* v190: delayed dedupe/scrub removed — run() already calls both */
document.addEventListener('click',function(e){var c=e.target.closest('[class*=close],.modal_close,.w-modal-close');if(c&&c.closest(S+','+J)){e.preventDefault();var prev=OPEN;OPEN=null;hide(true);setTimeout(function(){offerAbandon(prev)},800);return}
/* v195: never treat bare href=# as hire — only explicit modal targets */
var el=e.target.closest('[data-demigod-modal],a[href="'+S+'"],a[href="'+J+'"],a[href="#startup-modal"],a[href="#jobseeker-modal"]');
if(!el)return;
if(el.closest('a.dg-logo,.w-nav-brand,#dg-skip'))return;
var h=(el.getAttribute('href')||'').trim(),k=el.getAttribute('data-demigod-modal');
if(k==='startup'||h===S||h==='#startup-modal'){e.preventDefault();show(S)}
else if(k==='jobseeker'||h===J||h==='#jobseeker-modal'){e.preventDefault();show(J)}
},true);
document.addEventListener('input',function(e){if(OPEN&&e.target&&e.target.closest&&e.target.closest(S+','+J)){DIRTY=true;/*dg-wiz-err-clear*/try{var f=e.target.closest('form');var er=f&&f.querySelector('.dg-wiz-err');if(er)er.remove();e.target.style.borderColor='';e.target.removeAttribute('aria-invalid')}catch(err){}}},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&q('#dg-page')){closePage();return}if(e.key==='Escape'&&OPEN){var prev=OPEN;OPEN=null;hide(true);setTimeout(function(){offerAbandon(prev)},800)}});
OBS=null;/* v190: no full-document MutationObserver — was freezing main thread (run↔mutate thrash). Timed boots cover late Webflow. */
typeof window.addEventListener==='function'&&window.addEventListener('popstate',function(){/*dg-page-popstate*/ try{ if(!routePages()) closePage(); }catch(e){} });
// Notes in-page: hashchange re-focuses Full note when already on /?p=blog
typeof window.addEventListener==='function'&&window.addEventListener('hashchange',function(){/*dg-note-hash*/ try{ var r=document.getElementById('dg-page'); if(r&&r.querySelector('.dg-blog-card')) focusBlogNoteFromHash(r); }catch(e){} });

/* ==== SECTION: Night District MUD client (demigod-mud-client.js embedded) ====
/**
 * demigod-mud-client.js — SF Night District MUD (social-first, lightweight)
 * Offline solo + NPCs + Vesper immortal. Optional multi :3461.
 *
 * Browser: window.DemigodMud.mount(rootEl)
 * Node: node demigod-mud-client.js --selftest
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof root !== 'undefined') root.DemigodMud = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STORE = 'dgMudChar_v2';
  var DIRS = {
    n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down',
    ne: 'northeast', nw: 'northwest', se: 'southeast', sw: 'southwest',
    north: 'north', south: 'south', east: 'east', west: 'west', up: 'up', down: 'down',
    northeast: 'northeast', northwest: 'northwest', southeast: 'southeast', southwest: 'southwest',
  };
  var DIR_SHORT = { north:'n', south:'s', east:'e', west:'w', up:'u', down:'d',
    northeast:'ne', northwest:'nw', southeast:'se', southwest:'sw' };

  /* —— SF map (social hubs first) —— */
  var ROOMS = {
    plaza: {
      name: 'Market Street Crossing',
      desc: 'Fog rolls along Market. An F-line streetcar clangs past. Stickers on the signal box: old Twitter bird, Stripe atlas pin, a hand-drawn "DECISION > VOLUME." People cross without looking up — except the ones who do, looking for someone to talk to. Best place to bump into other visitors.',
      exits: { north: 'lobby', east: 'alley', west: 'cafe', south: 'dock', northeast: 'garden', southeast: 'market', southsoutheast: 'diner', southwest: 'transit' },
      items: ['leaflet', 'transit_map'],
    },
    lobby: {
      name: 'Demigod Matching Lobby (SoMa)',
      desc: 'Second-floor loft south of Market. Soft phosphor light. Sealed envelopes on a shelf — no open job board. A Bay map pins SoMa, Mission, Dogpatch, Oakland. Quiet enough for a real conversation if you keep your voice low.',
      exits: { south: 'plaza', east: 'review', up: 'roof', west: 'office', north: 'museum' },
      items: ['notebook', 'welcome_card'],
    },
    review: {
      name: 'Mutual-Approve Booths',
      desc: 'Six quiet booths, frosted glass, one lamp each. A printout taped to the wall: "90-day outcome — no keyword soup." The air smells like paper and anxiety. Evidence packets only. Names later.',
      exits: { west: 'lobby', north: 'archive', east: 'library' },
      items: ['stamp', 'red_pen'],
    },
    archive: {
      name: 'Outcome Archive',
      desc: 'Shelves of SF first-quarter ships — case studies, not trophies. One spine reads "Airbnb host trust · history only." Dust motes drift in frege green. A ladder leans against the stacks like someone meant to return.',
      exits: { south: 'review', up: 'attic' },
      items: ['tome', 'index_card'],
    },
    cafe: {
      name: 'Ritual Coffee Nook',
      desc: 'Cold brew, laptop stickers (Linear, Figma, a faded YC backpack under a chair). Chalkboard: open tables — humans only, no auto-DM. The espresso machine hisses. Great place to SAY hello without a pitch deck.',
      exits: { east: 'plaza', north: 'garden', west: 'mission', south: 'parklet' },
      items: ['mug', 'sugar_packet'],
    },
    garden: {
      name: 'South Park Pocket',
      desc: 'Tiny green oval off 2nd & Bryant. Startup ghosts on the benches, dogs on the grass, fog from the Embarcadero. Someone left a half-finished stand-up still echoing. Soft social gravity.',
      exits: { south: 'cafe', east: 'lobby', west: 'showplace' },
      items: ['keycard', 'frisbee'],
    },
    alley: {
      name: 'Folsom Alley',
      desc: 'Brick, loading docks, server fans. Graffiti: SHIP IT. A faded delivery stencil. A side door hums like an edge box. Puddles hold neon. Something small and metallic glints by the dumpster.',
      exits: { west: 'plaza', north: 'lab', south: 'market', northwest: 'plaza', southwest: 'dock', east: 'warehouse' },
      items: ['coin', 'sticker_sheet'],
    },
    lab: {
      name: 'Stack Lab (Dogpatch edge)',
      desc: 'Whiteboards: latency budgets, Postgres, "what would Stripe do at p99?" A Dropbox sticker sheet peels at the corner. Quiet enough to pair — or overhear a real problem.',
      exits: { south: 'alley', east: 'dogpatch', up: 'mezzanine' },
      items: ['cable', 'usb_drive'],
    },
    market: {
      name: 'Ferry Building Night Market',
      desc: 'String lights, SAMPLE role stalls with honest labels, oyster carts, cold wind off the bay. Seed vs Series A comps whispered near the cheese counter. Social gravity is high — people linger.',
      exits: { north: 'alley', west: 'dock', south: 'shop_stall', east: 'embarcadero_path' },
      items: ['badge', 'oyster_fork'],
    },
    dock: {
      name: 'Embarcadero Pier',
      desc: 'Salt air. Bay Bridge lights. A ferry horn. Salesforce Park glows inland. Perfect for a long SAY or a quiet emote. The water takes secrets and returns fog.',
      exits: { north: 'plaza', east: 'market', west: 'caltrain_view', south: 'bridge_view' },
      items: ['shell', 'fog_jar'],
    },
    roof: {
      name: 'SoMa Roof Deck',
      desc: 'Wind off the bay. Neon and cranes. Sutro Tower a faint trident west. Folding chairs still in a circle from a demo-day afterparty that never officially ended. Immortal Vesper is often "nearby" in spirit. Someone left a plant that is trying very hard.',
      exits: { down: 'lobby', east: 'helipad' },
      items: ['lantern', 'hoodie', 'pitch_clicker'],
    },
    mission: {
      name: 'Valencia Sidewalk',
      desc: 'Mission warmth even at night. Murals, taqueria steam, a Field Notes window. West-of-cafe stroll. Music from a bar that pretends not to be a founder hang.',
      exits: { east: 'cafe', north: 'bar', west: 'grouphouse', south: 'bookstore', northwest: 'haight_edge' },
      items: ['clipper', 'zine'],
    },
    bar: {
      name: 'Founder Dive (16th edge)',
      desc: 'Dark wood. No pitch decks after 9 — a sign says so twice. Someone debates pricing honesty over a pint. The jukebox is broken on purpose. Social room.',
      exits: { south: 'mission', east: 'nocturne' },
      items: ['coaster', 'snack'],
    },
    shop_stall: {
      name: 'Night Market Stall',
      desc: 'A SAMPLE stall at the Ferry Building. Honest labels, no fake scarcity. Type LIST · BUY · VALUE. The vendor is never quite looking at you.',
      exits: { north: 'market' },
      items: ['badge'],
      shop: [
        { id: 'mug', cost: 0, name: 'a Ritual coffee mug (sample)' },
        { id: 'leaflet', cost: 0, name: 'a phosphor SF leaflet' },
        { id: 'coaster', cost: 0, name: 'a dive-bar coaster' },
        { id: 'tote', cost: 0, name: 'a night-market tote' },
        { id: 'matcha', cost: 0, name: 'a paper cup of matcha' },
      ],
    },
    office: {
      name: 'Shared Desk Loft',
      desc: 'Standing desks, standing jokes. Whiteboard sprint goal: "talk to a human." Slack pings from a monitor nobody owns. West of the matching lobby.',
      exits: { east: 'lobby', down: 'transit', north: 'parklet' },
      items: ['badge_lanyard', 'sourdough'],
    },
    transit: {
      name: 'Muni Underground Glimpse',
      desc: 'Brake squeal, Clipper taps, a mosaic map of the lines. Doors open south toward Market when you are ready. Someone practices a pitch under their breath and then decides against it.',
      exits: { south: 'plaza', up: 'office', east: 'caltrain_view' },
      items: ['transit_map'],
    },
    /* —— new rooms —— */
    museum: {
      name: 'Museum Lobby Night',
      desc: 'Cool stone, a late ticket window closed, a sculpture that looks expensive and slightly judgmental. Free Wi‑Fi for people who refuse to go home. North of the matching lobby.',
      exits: { south: 'lobby', east: 'library' },
      items: ['museum_map', 'audio_wand'],
    },
    library: {
      name: 'Tech History Stacks',
      desc: 'A quiet wing of books and old product manuals. "Don\'t reinvent the job board" is scribbled in a margin. Soft chairs. Good for WHO and thinking.',
      exits: { west: 'review', south: 'museum' },
      items: ['zine', 'red_pen'],
    },
    attic: {
      name: 'Archive Attic',
      desc: 'Dust, skylight fog, a trunk of unsent intros. Someone filed "almost" under A. You can hear the city through the roof seams.',
      exits: { down: 'archive' },
      items: ['old_letter', 'tote'],
    },
    parklet: {
      name: 'Hayes Valley Parklet',
      desc: 'A wooden deck where a parking space used to be. String lights, a dog, two founders who are not working. A picnic blanket waits for a board game that may or may not appear. South of the coffee nook, north of the loft.',
      exits: { north: 'cafe', south: 'office', west: 'bookstore' },
      items: ['matcha', 'bike_lock', 'burner_phone'],
    },
    bookstore: {
      name: 'City Lights-ish Corner',
      desc: 'Poetry spines, radical pamphlets, a cat that has tenure. Not the real City Lights — a cousin that stole the vibe. Good place to read a ZINE or SAY something honest.',
      exits: { north: 'mission', east: 'parklet' },
      items: ['zine', 'bookmark'],
    },
    warehouse: {
      name: 'Showplace Loading Dock',
      desc: 'High ceilings, a half-assembled booth for a design fair, gaffer tape on the floor. East of Folsom Alley. Echoes make chatty people sound important.',
      exits: { west: 'alley', north: 'dogpatch' },
      items: ['gaffer_tape', 'sticker_sheet'],
    },
    dogpatch: {
      name: 'Dogpatch Waterfront',
      desc: 'Cranes, condo glass, a brewery laugh down the block. The bay is closer than it looks. Lab is west; warehouse south.',
      exits: { west: 'lab', south: 'warehouse', east: 'pier_east' },
      items: ['shell', 'sourdough'],
    },
    pier_east: {
      name: 'Quiet East Pier',
      desc: 'Fewer tourists. More wind. A single bench faces Treasure Island lights. Perfect for TELL and quiet plans.',
      exits: { west: 'dogpatch' },
      items: ['fog_jar', 'coin'],
    },
    caltrain_view: {
      name: '4th & King Approach',
      desc: 'Caltrain sighs into the station. Suitcases, hoodies, a late laptop. West of the pier path, east of Muni underground.',
      exits: { east: 'dock', west: 'transit', north: 'plaza' },
      items: ['transit_map', 'hoodie'],
    },
    bridge_view: {
      name: 'Bay Bridge Pedestrian Glimpse',
      desc: 'You cannot walk the whole span from here — only a view: orange towers, black water, a freighter that does not care about your Series A. South of the Embarcadero pier.',
      exits: { north: 'dock' },
      items: ['binoculars', 'shell'],
    },
    embarcadero_path: {
      name: 'Embarcadero Path',
      desc: 'Joggers, scooters, the smell of the bay. Connects the night market east toward nothing urgent. A good place to CHAT without a room full of stalls.',
      exits: { west: 'market', north: 'chinatown_gate' },
      items: ['tote', 'oyster_fork'],
    },
    chinatown_gate: {
      name: 'Grant Avenue Gate (night)',
      desc: 'Lanterns, late kitchens, a tourist pose that never finishes. North of the Embarcadero path. The city stacks languages here.',
      exits: { south: 'embarcadero_path', west: 'nocturne' },
      items: ['lantern', 'tea_cup'],
    },
    haight_edge: {
      name: 'Haight Edge Walk',
      desc: 'Not the full Haight — just the edge of it. Vintage windows, a busker packing up, fog that smells like eucalyptus. West of Valencia.',
      exits: { east: 'mission', west: 'panhandle', south: 'grouphouse' },
      items: ['zine', 'frisbee'],
    },
    nocturne: {
      name: 'Nocturne Alcove',
      desc: 'A side pocket off the dive bar and the gate path. Dark enough that people tell the truth. A single bulb. Two chairs that disagree about comfort.',
      exits: { west: 'bar', east: 'chinatown_gate' },
      items: ['coaster', 'old_letter'],
    },
    showplace: {
      name: 'Design District Corner',
      desc: 'Showrooms closed, mood lighting still on. Fabric samples in a window. West of South Park. Someone argues about "taste" like it is a metric.',
      exits: { east: 'garden', south: 'warehouse' },
      items: ['fabric_swatch', 'badge_lanyard'],
    },
    mezzanine: {
      name: 'Lab Mezzanine',
      desc: 'Above the stack lab: cables labeled with hope, a couch that has hosted three all-nighters. You can hear whiteboards below without the jargon.',
      exits: { down: 'lab' },
      items: ['usb_drive', 'hoodie'],
    },
    helipad: {
      name: 'Roof Helipad (unused)',
      desc: 'Painted circle, no helicopter. Just wind and a view that makes equity arguments feel smaller. East of the roof deck.',
      exits: { west: 'roof' },
      items: ['binoculars', 'lantern'],
    },
    grouphouse: {
      name: 'Group House Living Room',
      desc: 'Shoes by the door. Whiteboard: HOUSE DINNER THURS — BRING A TAKE. No status updates. The group chat became a couch. A pin tray says earnest. Visitors welcome if you SAY hello first. Online SF culture, offline bodies.',
      exits: { east: 'mission', north: 'haight_edge', west: 'panhandle' },
      items: ['house_key', 'earnest_pin', 'wifi_card', 'group_chat_print'],
    },
    panhandle: {
      name: 'Panhandle Night Path',
      desc: 'A green strip between avenues. Joggers, a late Frisbee, fog in the eucalyptus. Two people walk-and-talk past: "—it is not a startup, it is more of a practice." People who live on timelines come here to remember legs exist.',
      exits: { east: 'haight_edge', south: 'grouphouse' },
      items: ['frisbee', 'earnest_pin'],
    },
    diner: {
      name: 'All-Night Diner Booth',
      desc: 'Chromed stool, endless coffee, pie carousel. Mutuals from that part of Twitter debrief group houses, microfame, and whether the discourse was worth missing dinner. Best late CHAT room. SAY debrief.',
      exits: { northwest: 'plaza', south: 'caltrain_view' },
      items: ['coffee', 'wifi_card', 'pie_slice', 'printed_tweet'],
    },
    salon: {
      name: 'Third Place Salon',
      desc: 'A living room disguised as a coworking space: mismatched lamps, one long couch, no demo screen. Hand-lettered sign: no phones — livetweeting from memory afterward is permitted. Tiny internet discoveries and the useful kind of "what are you building?"',
      exits: { east: 'office', south: 'launch_kitchen' },
      items: ['question_card', 'risograph_card', 'sparkling_water'],
    },
    launch_kitchen: {
      name: 'Launch Night Kitchen',
      desc: 'Pizza boxes and seltzer orbit a scarred kitchen island. A laptop replays a launch video with 11 views — everyone here has watched it twice. Hand-lettered note: ask one real question.',
      exits: { north: 'salon', southwest: 'mission' },
      items: ['name_tag', 'pizza_slice', 'tiny_keyboard'],
    },
  };

  ROOMS.office.exits.west = 'salon';
  ROOMS.mission.exits.northeast = 'launch_kitchen';
  ROOMS.caltrain_view.exits.north = 'diner';
  ROOMS.diner.exits.northwest = 'plaza';
  ROOMS.plaza.exits.southeast = 'market';
  ROOMS.plaza.exits.south = 'dock';
  ROOMS.mission.exits.west = 'grouphouse';
  ROOMS.haight_edge.exits.west = 'panhandle';
  ROOMS.haight_edge.exits.south = 'grouphouse';
  ROOMS.grouphouse.exits.east = 'mission';


  var ITEMS = {
    leaflet: { name: 'a phosphor SF leaflet', look: 'Talk first: who · say hi · chat hi. Walk: n/s/e/w. LIVE status means real visitors hear you. SF startups = flavor only.' },
    notebook: { name: 'a Field Notes pad', look: 'Valencia purchase. For score and 90-day scribbles.', container: true, capacity: 3, holds: [] },
    stamp: { name: 'a mutual-approve stamp', look: 'BOTH SIDES. Not cold LinkedIn spam.' },
    tome: { name: 'a Bay Area outcome tome', look: 'Metrics from SF ships. No fake Demigod placements.' },
    mug: { name: 'a Ritual coffee mug', look: 'Still warm. Someone wanted Stripe-quality craft.', container: true, capacity: 2, holds: [] },
    keycard: { name: 'a South Park fob', look: '2ND & BRYANT. Decorative.' },
    coin: { name: 'a sample Muni token', look: 'SAMPLE. Not Clipper. Quest bait for the pier — take it to Embarcadero and SAY "token for the bay".' },
    cable: { name: 'a Cat6 run', look: 'For the lab rack — not your HDMI crisis.' },
    badge: { name: 'a pilot badge', look: 'White-glove SF pilot. Email: potter@trydemigod.com.', wear: 'badge' },
    shell: { name: 'an Embarcadero shell', look: 'Bay Bridge light on the ridge.' },
    lantern: { name: 'a roof lantern', look: 'Soft green over SoMa. Nice at the pier after dark.' },
    quest_note: { name: 'a quest slip from Vesper', look: 'Immortal handwriting: optional, skippable, fun. Type QUEST to reread.' },
    coffee: { name: 'a warm coffee', look: 'Vesper conjured. Flavor only.', drink: true },
    clipper: { name: 'a sample Clipper card', look: 'Stamped DEMO. Will not open gates.' },
    coaster: { name: 'a dive-bar coaster', look: 'No pitch decks after 9.' },
    snack: { name: 'a Mission pastry', look: 'Sweet. Eat for flavor.', food: true },
    badge_lanyard: { name: 'a blank lanyard', look: 'Write your own title. Or do not.', wear: 'neck' },
    /* new */
    transit_map: { name: 'a crumpled Muni map', look: 'Lines like spaghetti. Home is still Market Street Crossing.' },
    welcome_card: { name: 'a welcome card', look: 'Front: meet someone. Back: SAY hi · WHO · CHAT.' },
    red_pen: { name: 'a red editing pen', look: 'For outcomes, not for burning founders.' },
    index_card: { name: 'an archive index card', look: 'Almost-hires filed under A for Almost.' },
    sugar_packet: { name: 'a sugar packet', look: 'Ritual. Unused. Optimistic.' },
    frisbee: { name: 'a soft park frisbee', look: 'South Park soft toss. Non-weapon.' },
    sticker_sheet: { name: 'a sticker sheet', look: 'Cloudflare, GitHub, a tiny Bay Bridge.' },
    usb_drive: { name: 'a unmarked USB', look: 'Labeled "NOT PROD". Probably true.' },
    oyster_fork: { name: 'a tiny oyster fork', look: 'Ferry Building souvenir. Useless and perfect.' },
    fog_jar: { name: 'a jar of fog', look: 'Marketing claim. Contents: air and hope.' },
    hoodie: { name: 'a black SF hoodie', look: 'Default founder skin. Soft. Wearable.', wear: 'torso' },
    zine: { name: 'a Mission zine', look: 'Poems about rent and latency.' },
    tote: { name: 'a night-market tote', look: 'Canvas. Can hold a notebook and a grudge.', container: true, capacity: 2, holds: [] },
    matcha: { name: 'a paper cup of matcha', look: 'Bitter green. Drink if you must.', drink: true },
    sourdough: { name: 'a sourdough heel', look: 'Tart. Eat for flavor.', food: true },
    bike_lock: { name: 'a U-lock', look: 'Still locked to nothing. Metaphor?' },
    museum_map: { name: 'a museum floor map', look: 'You are here (lobby). Art is that way (closed).' },
    audio_wand: { name: 'an audio tour wand', look: 'Battery dead. Imagine the curator.' },
    old_letter: { name: 'an unsent intro letter', look: 'Dear founder — never mailed. Keep or junk.' },
    bookmark: { name: 'a City Lights-ish bookmark', look: 'Read more. Pitch less.' },
    gaffer_tape: { name: 'a roll of gaffer tape', look: 'Fixes booths, egos, and one shoe.' },
    binoculars: { name: 'a pair of binoculars', look: 'Bay Bridge towers look close. Still not close.' },
    tea_cup: { name: 'a paper tea cup', look: 'Jasmine. Steam ghosts.', drink: true },
    fabric_swatch: { name: 'a design-district swatch', look: 'Color: "honest gold". Texture: ambitious.' },
    question_card: { name: 'a conversation card', look: 'One prompt: What are you building when nobody is watching?' },
    risograph_card: { name: 'a risograph invite', look: 'Third Place, Thursday-ish. Bring curiosity, not a deck.' },
    sparkling_water: { name: 'a can of sparkling water', look: 'Mystery citrus. Cold enough for launch night.', drink: true },
    name_tag: { name: 'a blank name tag', look: 'Name, pronouns, and one oddly specific interest. Wearable.', wear: 'badge' },
    pizza_slice: { name: 'a launch-night pizza slice', look: 'Room temperature, structurally sound, socially useful.', food: true },
    tiny_keyboard: { name: 'a tiny mechanical keyboard', look: 'Forty percent keys, one hundred percent opinions. It is not connected to anything.' },
    house_key: { name: 'a group-house guest key', look: 'Tagged GUEST. SAY hello before the couch myth.' },
    earnest_pin: { name: 'an earnestness pin', look: 'Underrated, according to half of online SF. Wearable.', wear: 'badge' },
    wifi_card: { name: 'a wifi password card', look: 'Network: guests. Password: still-human.' },
    pie_slice: { name: 'a diner pie slice', look: 'Cherry. 1am decisions taste better with sugar.', food: true },
    eacc_sticker: { name: 'an e/acc sticker', look: 'Decorative. Debates optional.' },
    group_chat_print: { name: 'a printed group-chat thread', look: 'Dinner plan survived. Dishes fight redacted.' },
    printed_tweet: { name: 'a printed, ratioed tweet', look: 'Someone posted through it. Now it is paper.' },
    pitch_clicker: { name: 'an abandoned pitch clicker', look: 'Slide 1 of 12. Battery dead. Afterparty lives longer than decks.' },
    burner_phone: { name: 'a burner with 41 group chats', look: 'Muted: sf-walks · saturday-sauna · demo-day-copium · dinner-tonight. Pure icebreaker — quote a chat name at someone.' },

  };


  var NPCS = [
    {
      id: 'hermes', name: 'Hermes', room: 'lobby', immortal: false,
      look: 'SoMa coordinator, phosphor pin, BART card in a notebook. Looks like they actually reply to email.',
      lines: [
        'Evidence first. Names later — still San Francisco.',
        'If status says LIVE, try SAY hello — other visitors can hear you.',
        'Vesper is the Immortal — if stuck: pray',
      ],
    },
    {
      id: 'ada', name: 'Ada', room: 'lab', immortal: false,
      look: 'Engineer on p99. Stickers: Cloudflare, GitHub, Postgres. Half a cold brew.',
      lines: [
        'Ship something measurable in 90 days.',
        'Outcome beats stack fashion.',
        'I pair well with a quiet SAY.',
      ],
    },
    {
      id: 'rio', name: 'Rio', room: 'cafe', immortal: false,
      look: 'Founder + Ritual cold brew. YC backpack under the chair. Exhausted in a hopeful way.',
      lines: [
        'One hire who owns the outcome — not a ten-name shortlist.',
        'Say HI — I will point you back to Market Street.',
        'If you brought the mutual-approve stamp, you get free respect.',
      ],
    },
    {
      id: 'kai', name: 'Kai', room: 'dock', immortal: false,
      look: 'PM watching ferry lights. Salesforce tower inland. Soft smile.',
      lines: [
        'Comps get real fast in SF. Founders know it.',
        'I want builders who have seen a Series A kitchen.',
        'Bring a Muni token and say "token for the bay" if you are on a quest.',
      ],
    },
    {
      id: 'sam', name: 'Sam', room: 'bar', immortal: false,
      look: 'Operator nursing a pint. No deck in sight. Good listener. Soft e/acc sticker on the glass, half-joking.',
      lines: [
        'Best intros still happen face to face — or in a quiet SAY.',
        'Vesper hangs around when the multiplayer relay is lonely.',
        'Say hello. I do not bite. The coaster might.',
        'Ship tonight is a joke until someone actually opens a PR.',
      ],
    },
    {
      id: 'jules', name: 'Jules', room: 'market', immortal: false,
      look: 'Night-market host with a SAMPLE badge and a warm voice.',
      lines: [
        'Welcome to the stalls — labels are honest, I promise.',
        'LIST and BUY if you want souvenirs. Or just CHAT with a stranger.',
        'Social gravity is high here. That is the point.',
      ],
    },
    {
      id: 'priya', name: 'Priya', room: 'mission', immortal: false,
      look: 'Designer with a tote full of zines. Murals behind her.',
      lines: [
        'Valencia is for walking and talking, not for optimizing funnels.',
        'Read the zine. Then SAY something true.',
      ],
    },
    {
      id: 'dex', name: 'Dex', room: 'transit', immortal: false,
      look: 'Muni regular with a crumpled map and excellent timing.',
      lines: [
        'Trains come. Conversations should too.',
        'Up to the loft if you need desks. South to Market if you need people.',
      ],
    },
    {
      id: 'nora', name: 'Nora', room: 'bookstore', immortal: false,
      look: 'Bookseller who has seen every founder phase. Soft cardigan, sharp eyes.',
      lines: [
        'Buy less, read more. Or just SAY hello.',
        'The cat has tenure. You do not.',
      ],
    },
    {
      id: 'cole', name: 'Cole', room: 'roof', immortal: false,
      look: 'Night photographer. Camera, hoodie, patience.',
      lines: [
        'Sutro looks like a trident if you squint.',
        'Lanterns are better at the pier. Take one if you find it.',
      ],
    },
    {
      id: 'mei', name: 'Mei', room: 'chinatown_gate', immortal: false,
      look: 'Late kitchen runner on a break. Tea steam still on her coat.',
      lines: [
        'The gate looks better when you stop treating it like a backdrop.',
        'Tea helps. So does a real conversation.',
      ],
    },
    {
      id: 'oz', name: 'Oz', room: 'warehouse', immortal: false,
      look: 'Install tech with gaffer tape on both wrists. Cheerful chaos.',
      lines: [
        'If it moves and should not, tape it. If it should move and does not, also tape it.',
        'Show floors are just rooms waiting for people.',
      ],
    },
    {
      id: 'lane', name: 'Lane', room: 'dogpatch', immortal: false,
      look: 'Brewery regular in a canvas jacket. Points at cranes like weather.',
      lines: [
        'Dogpatch got fancy. The wind did not get the memo.',
        'East pier is quieter if you need to TELL someone something.',
      ],
    },
    {
      id: 'mara', name: 'Mara', room: 'salon', immortal: false,
      look: 'Community host rearranging chairs into a shape where strangers might actually talk.',
      lines: [
        'The best online mutuals eventually become coffee.',
        'Ask what someone is building. Then stay for the answer.',
      ],
    },
    {
      id: 'sol', name: 'Sol', room: 'salon', immortal: false,
      look: 'Indie hacker with a risograph invite and a browser full of tiny, delightful tools.',
      lines: [
        'My favorite launch has twelve users and a group chat.',
        'Small internet is still internet.',
      ],
    },
    {
      id: 'imani', name: 'Imani', room: 'launch_kitchen', immortal: false,
      look: 'Founder peeling a name tag off a hoodie after finally closing the laptop.',
      lines: [
        'The post did numbers. The kitchen conversation was better.',
        'Nice to meet you beats nice metrics to meet you.',
      ],
    },
    {
      id: 'theo', name: 'Theo', room: 'launch_kitchen', immortal: false,
      look: 'Engineer comparing tiny keyboards with anyone willing to humor the bit.',
      lines: [
        'I came for the keyboard discourse and stayed for the people.',
        'Grab a slice. Tell me the weird version of your idea.',
      ],
    },
    {
      id: 'tess', name: 'Tess', room: 'grouphouse', immortal: false,
      look: 'Group-house host. Soft hoodie, chore chart pen. Treats the living room like a group chat that finally got bodies.',
      lines: [
        'The group chat became a living room. SAY hello before you sit.',
        'Dinner is for humans. Status updates are for Slack.',
      ],
    },
    {
      id: 'bo', name: 'Bo', room: 'plaza', immortal: false,
      look: 'Transplant with good shoes. Knows everyone online, almost no one on this block — until you SAY hi.',
      lines: [
        'I only know people from Twitter. That is why I am outside.',
        'WHO is the offline following graph. Try it when status says LIVE.',
      ],
    },
    {
      id: 'wren', name: 'Wren', room: 'cafe', immortal: false,
      look: 'Builder with an e/acc sticker half-peeled on a laptop. Curious, not a sermon.',
      lines: [
        'What are you building — or are you between arcs?',
        'Build something. Argue later. Cafe is for feelings.',
      ],
    },
    {
      id: 'juno', name: 'Juno', room: 'embarcadero_path', immortal: false,
      look: 'Night-walk organizer with a soft smile and a terrible sense of time.',
      lines: [
        'Walk-and-talk to the pier if anyone wants company.',
        'Moving together is the whole game.',
      ],
    },
    {
      id: 'maru', name: 'Maru', room: 'diner', immortal: false,
      look: 'Night-owl with pie. Debriefs like a kind postmortem.',
      lines: [
        'All-night booths are for truth-telling, not dunks.',
        'SAY debrief if you need the ritual.',
      ],
    },
    {
      id: 'vesper', name: 'Vesper', room: 'roof', immortal: true,
      look: 'An Immortal presence — dungeon master, not a mortal PC. Calm frege phosphor. Type: pray  (or pray <message>)',
      lines: [
        'I am Vesper the Immortal. Ask for a quest, a hint, or company — just pray.',
        'This district is for talking. Game bits are optional.',
        'LIVE status means real visitors. SAY and CHAT are how you meet them.',
      ],
    },
  ];

  var CLASSES = {
    founder: { title: 'Founder', hp: 12, skills: 2 },
    engineer: { title: 'Engineer', hp: 12, skills: 2 },
    wanderer: { title: 'Wanderer', hp: 10, skills: 3 },
  };


  /* SMAUG-style socials (social-first; no combat) — Fable/Codex stock list */
  var SOCIALS = {
    smile: { self: 'You smile.', room: '$N smiles.' },
    grin: { self: 'You grin broadly.', room: '$N grins broadly.' },
    laugh: { self: 'You laugh.', room: '$N laughs.' },
    giggle: { self: 'You giggle.', room: '$N giggles.' },
    nod: { self: 'You nod.', room: '$N nods.', vict: 'You nod at $T.', roomv: '$N nods at $T.', selfv: '$N nods at you.' },
    bow: { self: 'You bow gracefully.', room: '$N bows.', vict: 'You bow to $T.', roomv: '$N bows to $T.', selfv: '$N bows to you.' },
    wave: { self: 'You wave.', room: '$N waves.', vict: 'You wave at $T.', roomv: '$N waves at $T.', selfv: '$N waves at you.' },
    shrug: { self: 'You shrug.', room: '$N shrugs.' },
    wink: { self: 'You wink.', room: '$N winks.', vict: 'You wink at $T.', roomv: '$N winks at $T.', selfv: '$N winks at you.' },
    hug: { self: 'You hug yourself.', room: '$N hugs themself.', vict: 'You hug $T.', roomv: '$N hugs $T.', selfv: '$N hugs you.' },
    dance: { self: 'You dance a little.', room: '$N dances.' },
    sigh: { self: 'You sigh.', room: '$N sighs.' },
    cheer: { self: 'You cheer!', room: '$N cheers!' },
    clap: { self: 'You clap.', room: '$N claps.' },
    point: { self: 'You point at nothing in particular.', room: '$N points.', vict: 'You point at $T.', roomv: '$N points at $T.', selfv: '$N points at you.' },
    ponder: { self: 'You ponder the fog.', room: '$N ponders.' },
    salute: { self: 'You salute.', room: '$N salutes.', vict: 'You salute $T.', roomv: '$N salutes $T.', selfv: '$N salutes you.' },
    yawn: { self: 'You yawn.', room: '$N yawns.' },
    highfive: { self: 'You high-five the air.', room: '$N high-fives the air.', vict: 'You high-five $T.', roomv: '$N high-fives $T.', selfv: '$N high-fives you.' },
    glare: { self: 'You glare into the fog.', room: '$N glares.', vict: 'You glare at $T.', roomv: '$N glares at $T.', selfv: '$N glares at you.' },
    cry: { self: 'You sniffle.', room: '$N sniffs.' },
    frown: { self: 'You frown.', room: '$N frowns.' },
    blush: { self: 'You blush.', room: '$N blushes.' },
    thank: { self: 'You thank the district.', room: '$N thanks the district.', vict: 'You thank $T.', roomv: '$N thanks $T.', selfv: '$N thanks you.' },
    curtsey: { self: 'You curtsey.', room: '$N curtseys.' },
    growl: { self: 'You growl softly.', room: '$N growls.' },
    stare: { self: 'You stare into the middle distance.', room: '$N stares.', vict: 'You stare at $T.', roomv: '$N stares at $T.', selfv: '$N stares at you.' },
    poke: { self: 'You poke the air.', room: '$N pokes the air.', vict: 'You poke $T.', roomv: '$N pokes $T.', selfv: '$N pokes you.' },
    facepalm: { self: 'You facepalm.', room: '$N facepalms.' },
    think: { self: 'You look thoughtful.', room: '$N looks thoughtful.' },
    cough: { self: 'You cough.', room: '$N coughs.' },
    snicker: { self: 'You snicker.', room: '$N snickers.' },
    whistle: { self: 'You whistle.', room: '$N whistles.' },
    jump: { self: 'You jump!', room: '$N jumps.' },
    stretch: { self: 'You stretch.', room: '$N stretches.' },
  };

  var HELP_TOPICS = {
    easy: 'Talk first: WHO · SAY hi (room) · CHAT hi (all online). Walk: N/S/E/W. LIVE in the status bar means multiplayer is on.',
    meet: 'Meet visitors: WHO lists LIVE people. Go to their room (MAP) then SAY. Or CHAT district-wide. INTRO presents you.',
    talk: 'Talk: say / "text · emote / :pose · tell · chat · intro · who',
    movement: 'Movement: n s e w u d · ne nw se sw · go <dir> · enter · leave · exits · home/recall · map · scan · glance',
    communication: 'Talk: say / "text · emote / :pose · tell/whisper · reply (r) · chat/gossip/ooc · shout/yell · intro · afk',
    socials: 'Socials: smile grin laugh giggle nod bow wave shrug wink hug dance sigh cheer clap point ponder salute yawn highfive glare cry frown blush thank curtsey growl stare poke facepalm think cough snicker whistle jump stretch · socials',
    items: 'Items: inv/i · get/take · drop · put · give · examine/x · wear · remove · equipment/eq · junk/sac · open · close',
    info: 'Info: look/l · score/stats · who · where · whois/finger · time · weather · news/motd · title · desc · quest · channels · config · color · consider · affects · skills',
    shop: 'Shop (Ferry Building): list · buy · sell · value · (stand near market)',
    position: 'Position: stand · sit · rest · sleep · wake',
    settings: 'Settings: brief · verbose · save · password (n/a) · quit · restart · ignore · follow · group · gtell',
    immortal: 'Immortal: pray · pray <msg> · skip tutorial',
  };

  var TUTORIAL = [
    'Tutorial 1/4 — type LOOK (or SKIP to dismiss forever).',
    'Tutorial 2/4 — move: N S E W (try E). Or SKIP.',
    'Tutorial 3/4 — talk to people: SAY hello (LIVE visitors hear you in this room). Or SKIP.',
    'Tutorial 4/4 — stuck? PRAY  or  PRAY for a quest. Done — have fun.',
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function clampName(n) {
    return String(n || '').trim().replace(/[^\w \-'.]/g, '').slice(0, 24);
  }
  function uid() {
    return 'p' + Math.random().toString(36).slice(2, 10);
  }

  function normalizeChar(ch) {
    if (!ch || typeof ch !== 'object') return ch;
    ch.inv = ch.inv || [];
    ch.eq = ch.eq || {};
    ch.position = ch.position || 'standing';
    ch.title = ch.title || '';
    ch.ignore = ch.ignore || [];
    ch.afk = !!ch.afk;
    ch.follow = ch.follow || '';
    ch.group = ch.group || [];
    ch.lastTell = ch.lastTell || '';
    ch.xp = ch.xp || 0;
    ch.brief = !!ch.brief;
    return ch;
  }
  function loadChar() {
    try {
      var j = JSON.parse(localStorage.getItem(STORE) || localStorage.getItem('dgMudChar_v1') || 'null');
      if (j && j.name && j.room && ROOMS[j.room]) return j;
    } catch (e) {}
    return null;
  }
  function saveChar(ch) {
    try { localStorage.setItem(STORE, JSON.stringify(ch)); } catch (e) {}
  }
  function clearChar() {
    try {
      localStorage.removeItem(STORE);
      localStorage.removeItem('dgMudChar_v1');
    } catch (e) {}
  }

  function Engine(opts) {
    opts = opts || {};
    this.mode = 'create';
    this.char = null;
    this.roomItems = {};
    this.remoteHere = [];
    this.remoteWho = [];
    this.out = typeof opts.out === 'function' ? opts.out : function () {};
    this.onStatus = typeof opts.onStatus === 'function' ? opts.onStatus : function () {};
    this.apiBase = opts.apiBase || '';
    this.session = null;
    this._since = 0;
    this._immortalHist = [];
    this._huhStreak = 0;
    this._create = { name: '', klass: 'wanderer' };
    Object.keys(ROOMS).forEach(function (id) {
      this.roomItems[id] = (ROOMS[id].items || []).slice();
    }, this);
  }

  Engine.prototype.boot = function () {
    var ch = loadChar();
    this.print('— San Francisco · Night District —', 'sys');
    this.print('Primary: talk to other live visitors on this site. SAY is room chat. CHAT is district-wide. WHO shows who is online.', 'sys');
    this.print('If status says LIVE, other people can hear you. Buttons: Say hi · Who · Chat all. Type START anytime.', 'sys');
    if (ch) {
      this.char = ch;
      if (!this.char.inv) this.char.inv = [];
      this.mode = 'play';
      this.print('Welcome back, ' + ch.name + ' the ' + ((CLASSES[ch.klass] || {}).title || ch.klass) + '.', 'sys');
      this.cmd('look');
      this.tryJoinMulti();
    } else {
      this.mode = 'create';
      this.print('Create: what is your name? (2–24 chars)', 'sys');
    }
    this.probeApi();
  };

  Engine.prototype.print = function (text, kind) {
    this.out(String(text), kind || 'out');
  };

  Engine.prototype.probeApi = function () {
    var self = this;
    var bases = [
      this.apiBase,
      (typeof window !== 'undefined' && window.DG_MUD_API) || '',
      'http://127.0.0.1:3461/api/mud',
      'http://localhost:3461/api/mud',
    ].filter(Boolean).filter(function (u) {
      // v624 parity with the events-bot (dgEventsBotBases): only probe a localhost API when the page
      // is itself served from localhost. On production these fired at every VISITOR'S OWN machine —
      // mixed-content (http from https) + Private-Network-Access blocking + console spam. MUD falls
      // back to solo/NPCs offline, so dropping the prod probe costs nothing.
      try { return typeof dgLocalOk !== 'function' || dgLocalOk(u); } catch (e) { return true; }
    });
    var i = 0;
    function next() {
      if (i >= bases.length) {
        self.onStatus('solo · NPCs only');
        return;
      }
      var b = bases[i++].replace(/\/$/, '');
      fetch(b + '/health', { method: 'GET', mode: 'cors', signal: AbortSignal.timeout(1500) })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (j) {
          self.apiBase = b;
          self.onStatus(j && j.players != null ? ('LIVE · ' + j.players + ' online') : 'LIVE · connecting…');
          if (self.char && self.mode === 'play') self.tryJoinMulti();
        })
        .catch(next);
    }
    try { next(); } catch (e) { self.onStatus('solo · NPCs only'); }
  };

  Engine.prototype.here = function () {
    return ROOMS[this.char && this.char.room] || ROOMS.plaza;
  };

  Engine.prototype.peopleHere = function () {
    var room = this.char.room;
    var me = this.char && this.char.name;
    var list = NPCS.filter(function (n) { return n.room === room; }).map(function (n) {
      return n.immortal ? n.name + ' (Immortal)' : n.name + ' (NPC)';
    });
    (this.remoteHere || []).forEach(function (n) {
      if (!n || n === me) return;
      var label = n + ' (visitor)';
      if (list.indexOf(label) < 0 && list.indexOf(n) < 0) list.push(label);
    });
    if (me) list.push('you (' + me + ')');
    if (list.indexOf('Vesper (Immortal)') < 0 && list.indexOf('Vesper (Immortal · type pray …)') < 0) {
      list.push('Vesper (Immortal · type pray)');
    }
    return list;
  };

  Engine.prototype.lookRoom = function (verbose) {
    var r = this.here();
    var id = this.char.room;
    var brief = !!(this.char && this.char.brief);
    this.print(r.name, 'room');
    if (!brief || verbose === 'force') this.print(r.desc, 'out');
    var exits = Object.keys(r.exits || {});
    var shortEx = exits.map(function (d) { return DIR_SHORT[d] || d; });
    this.print('Exits: ' + (exits.length ? exits.join(', ') : 'none'), 'meta');
    var items = (this.roomItems[id] || []).map(function (i) {
      return (ITEMS[i] && ITEMS[i].name) || i;
    });
    if (items.length) this.print('You see: ' + items.join(', ') + '.', 'meta');
    this.print('Here: ' + this.peopleHere().join(', ') + '.', 'meta');
    /* Easy-play hint — always one line so new players know next step */
    var tip = 'Try: ' + (shortEx.length ? shortEx.join(' ') + ' · ' : '') + 'say hi · who · map · help';
    if (!this.char.tutorialDone) tip += ' · skip';
    this.print(tip, 'sys');
    if (typeof this.onSoftUi === 'function') {
      try { this.onSoftUi({ exits: shortEx, room: r.name || id }); } catch (e0) {}
    }
  };

  Engine.prototype.tutorialTick = function (event) {
    if (!this.char || this.char.tutorialDone) return;
    var step = this.char.tutorialStep | 0;
    if (event === 'start' && step === 0) {
      this.print(TUTORIAL[0], 'sys');
      return;
    }
    if (event === 'look' && step === 0) {
      this.char.tutorialStep = 1;
      saveChar(this.char);
      this.print(TUTORIAL[1], 'sys');
      return;
    }
    if (event === 'move' && step <= 1) {
      this.char.tutorialStep = 2;
      saveChar(this.char);
      this.print(TUTORIAL[2], 'sys');
      return;
    }
    if (event === 'say' && step <= 2) {
      this.char.tutorialStep = 3;
      saveChar(this.char);
      this.print(TUTORIAL[3], 'sys');
      this.char.tutorialDone = true;
      saveChar(this.char);
      return;
    }
    if (event === 'pray' && step <= 3) {
      this.char.tutorialDone = true;
      this.char.tutorialStep = 4;
      saveChar(this.char);
      this.print('Tutorial complete. Explore or talk.', 'sys');
    }
  };

  Engine.prototype.skipTutorial = function () {
    if (!this.char) return;
    this.char.tutorialDone = true;
    this.char.tutorialStep = 99;
    saveChar(this.char);
    this.print('Tutorial skipped. HELP · MAP · SAY · PRAY anytime.', 'sys');
  };

  Engine.prototype.handleCreate = function (line) {
    var t = (line || '').trim();
    if (!t) return;
    if (/^skip$/i.test(t)) {
      this.print('Pick a name first, then you can SKIP the tutorial.', 'err');
      return;
    }
    if (!this._create.name) {
      var n = clampName(t);
      if (n.length < 2) {
        this.print('Name too short. Try again.', 'err');
        return;
      }
      this._create.name = n;
      this.print('Path: founder · engineer · wanderer', 'sys');
      return;
    }
    var k = t.toLowerCase();
    if (!CLASSES[k]) {
      this.print('Pick founder, engineer, or wanderer.', 'err');
      return;
    }
    var c = CLASSES[k];
    this.char = {
      id: uid(),
      name: this._create.name,
      klass: k,
      room: 'plaza',
      inv: [],
      hp: c.hp,
      maxHp: c.hp,
      skills: c.skills,
      xp: 0,
      quest: null,
      tutorialDone: false,
      tutorialStep: 0,
      brief: false,
      desc: '',
      createdAt: Date.now(),
    };
    saveChar(this.char);
    this.mode = 'play';
    this.print('Created ' + this.char.name + ' the ' + c.title + ' on Market Street, San Francisco.', 'sys');
    this.cmd('look');
    this.tutorialTick('start');
    this.tryJoinMulti();
  };

  Engine.prototype.tryJoinMulti = function () {
    var self = this;
    if (!this.apiBase || !this.char || this.session) return;
    fetch(this.apiBase + '/join', {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: this.char.name,
        klass: this.char.klass,
        room: this.char.room,
        id: this.char.id,
      }),
      signal: AbortSignal.timeout(4000),
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (x.ok && x.j && x.j.token) {
          self.session = x.j.token;
          if (x.j.who) self.remoteWho = x.j.who;
          if (x.j.here) self.remoteHere = x.j.here;
          else if (x.j.who && self.char) {
            self.remoteHere = x.j.who.filter(function (p) {
              return p && p.room === self.char.room;
            }).map(function (p) { return p.name; });
          }
          var n = (x.j.who && x.j.who.length) || 1;
          self.onStatus('LIVE · ' + n + ' online');
          self.print('You are LIVE with other site visitors.', 'sys');
          self.print('Talk: SAY hi (this room) · CHAT hi (everyone online) · WHO (list) · TELL name message', 'sys');
          if (n <= 1) self.print('No one else is here yet — leave a SAY or CHAT; they will see you when they arrive.', 'sys');
          else {
            var names = x.j.who.map(function (p) { return p.name; }).filter(function (nm) {
              return nm && self.char && nm !== self.char.name;
            });
            if (names.length) self.print('Online now: ' + names.join(', ') + '. Try: say hello', 'sys');
          }
          self.pollMulti();
        } else if (x.j && x.j.error) {
          self.print('(live chat) ' + x.j.error + ' — you can still play solo with NPCs.', 'sys');
        }
      })
      .catch(function () {});
  };

  Engine.prototype.syncRoom = function () {
    if (!this.apiBase || !this.session || !this.char) return;
    var self = this;
    fetch(this.apiBase + '/state', {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: this.session, room: this.char.room }),
      signal: AbortSignal.timeout(3000),
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.here) self.remoteHere = j.here;
        if (j && j.who) self.remoteWho = j.who;
      })
      .catch(function () {});
  };

  Engine.prototype.pollMulti = function () {
    var self = this;
    if (!this.apiBase || !this.session) return;
    fetch(this.apiBase + '/poll?token=' + encodeURIComponent(this.session) + '&since=' + (this._since || 0), {
      mode: 'cors',
      signal: AbortSignal.timeout(8000),
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.events) {
          j.events.forEach(function (ev) {
            if (ev.t > (self._since || 0)) self._since = ev.t;
            var from = ev.from ? String(ev.from) : '';
            var ign = (self.char && self.char.ignore) || [];
            if (from && ign.indexOf(from.toLowerCase()) >= 0 && /^(say|chat|emote|tell)$/.test(ev.kind || '')) {
              return;
            }
            if (ev.kind === 'tell' && from && from !== 'system' && self.char) {
              self.char.lastTell = from;
            }
            if (ev.text) {
              var kind = ev.kind === 'system' ? 'sys' : 'say';
              if (ev.kind === 'tell') kind = 'say';
              self.print(ev.text, kind);
            }
          });
        }
        if (j && j.here) self.remoteHere = j.here;
        if (j && j.who) self.remoteWho = j.who;
        if (j && j.players != null) self.onStatus('LIVE · ' + j.players + ' online');
      })
      .catch(function () {})
      .finally(function () {
        if (self.session) setTimeout(function () { self.pollMulti(); }, 2000);
      });
  };

  Engine.prototype.pushMulti = function (kind, text, extra) {
    if (!this.apiBase || !this.session) return;
    fetch(this.apiBase + '/event', {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ token: this.session, kind: kind, text: text, room: this.char.room }, extra || {})),
      signal: AbortSignal.timeout(3000),
    }).catch(function () {});
  };

  Engine.prototype.applyCodexActions = function (actions) {
    var self = this;
    (actions || []).forEach(function (a) {
      if (!a || !a.type) return;
      switch (a.type) {
        case 'say':
          self.print(a.text || 'Vesper says something.', 'say');
          break;
        case 'emote':
          self.print('Vesper ' + (a.text || 'gestures.'), 'say');
          break;
        case 'give': {
          var id = a.item;
          if (ITEMS[id] && self.char.inv.indexOf(id) < 0) {
            self.char.inv.push(id);
            saveChar(self.char);
            self.print('Vesper gives you ' + ITEMS[id].name + '.', 'sys');
          }
          break;
        }
        case 'quest':
          self.char.quest = { id: a.id || 'q', text: a.text || 'Explore.' };
          saveChar(self.char);
          self.print('Quest: ' + self.char.quest.text, 'sys');
          break;
        case 'move':
          if (a.room && ROOMS[a.room]) {
            self.char.room = a.room;
            saveChar(self.char);
            self.print('Vesper relocates you…', 'sys');
            self.lookRoom(false);
            self.syncRoom();
          }
          break;
        case 'announce':
          self.print('[district] ' + (a.text || ''), 'sys');
          break;
        case 'hint':
          self.print('Hint: ' + (a.text || ''), 'meta');
          break;
        default:
          break;
      }
    });
  };

  Engine.prototype.askCodex = function (msg) {
    var self = this;
    // bare pray opens a greeting; pray <msg> continues
    if (msg == null) msg = '';
    msg = String(msg).trim();
    if (!msg) msg = 'who are you';
    this.print('You pray to Vesper, the Immortal…', 'sys');
    this.tutorialTick('pray');

    var ctx = {
      name: this.char.name,
      klass: this.char.klass,
      room: this.char.room,
      inv: this.char.inv,
      quest: this.char.quest,
    };

    // offline immortal always available
    function offline() {
      // dynamic import not available in browser embed — inline minimal offline
      var m = msg.toLowerCase();
      var reply = '';
      var actions = [];
      if (/who are you|what are you|immortal/.test(m)) {
        reply = 'I am Vesper — Immortal (wizard/DM) of this district. Not a mortal player. Pray again with a question, quest, or hint request.';
        actions = [{ type: 'emote', text: 'flickers like a cursor' }];
      } else if (/stuck|lost|hint|where|exit/.test(m)) {
        var r = self.here();
        reply = 'You are in ' + r.name + '. Exits: ' + Object.keys(r.exits || {}).join(', ') + '. Try MAP or LOOK.';
        actions = [{ type: 'hint', text: Object.keys(r.exits || {}).join(', ') }];
      } else if (/quest|task|something to do/.test(m)) {
        var qopts = [
          { id: 'muni_to_pier', text: 'GET the Muni token in Folsom Alley → go to Embarcadero Pier → SAY "token for the bay"', reply: 'Quest 1: alley token to the pier. SAY "token for the bay" when you arrive with it.' },
          { id: 'coffee_break', text: 'GET a mug (cafe or stall) → SAY "coffee break" at Ritual Coffee Nook', reply: 'Quest 2: grab a mug, stand in the coffee nook, SAY "coffee break".' },
          { id: 'stamp_intro', text: 'GET the mutual-approve stamp in Mutual-Approve Booths → go to Market Street → SAY "both sides"', reply: 'Quest 3: stamp from the booths, then at Market Street Crossing SAY "both sides".' },
          { id: 'lantern_pier', text: 'GET the roof lantern → bring it to Embarcadero Pier → LOOK shell (or SAY "light the fog")', reply: 'Quest 4: lantern from the roof deck to the pier, then LOOK shell or SAY "light the fog".' },
          { id: 'say_sam', text: 'Go to Founder Dive · SAY hello (Sam is there)', reply: 'Quest 5: find Sam at the Founder Dive and SAY hello. Social quest — perfect.' },
          { id: 'meet_live', text: 'When LIVE: WHO then SAY or CHAT to a real visitor', reply: 'Quest 6 (best one): when status is LIVE, WHO, then SAY or CHAT to a real visitor.' },
          { id: 'ask_builder', text: 'GET the conversation card at Third Place Salon → SAY "what are you building" in the Launch Night Kitchen', reply: 'Quest 7: take the salon conversation card south, then ask the launch kitchen what they are building.' },
          { id: 'meet_kitchen', text: 'GET the name tag in the Launch Night Kitchen → SAY "nice to meet you" at Third Place Salon', reply: 'Quest 8: pick up a kitchen name tag, head north, and say "nice to meet you" at the salon.' },
          { id: 'group_chat_irl', text: 'GET house key at Group House → Market Street → SAY "group chat is irl"', reply: 'Quest 9: guest key from the group house, then at Market Street SAY "group chat is irl".' },
          { id: 'diner_debrief', text: 'All-Night Diner Booth · SAY "debrief"', reply: 'Quest 10: find the diner and SAY "debrief".' },
          { id: 'three_hellos', text: 'SAY hello in cafe, bar, and roof (three rooms)', reply: 'Quest 11: SAY hello in Ritual Coffee, Founder Dive, and SoMa Roof — three rooms, three hellos.' },
        ];
        var pick = qopts[Math.floor(Math.random() * qopts.length)];
        reply = pick.reply + ' Or skip quests and just talk to people.';
        actions = [
          { type: 'quest', id: pick.id, text: pick.text },
          { type: 'give', item: 'quest_note' },
        ];
      } else if (/hello|hi |hey/.test(m)) {
        reply = 'Hello, ' + self.char.name + '. Talk with SAY / EMOTE / CHAT. Pray again if you get stuck.';
      } else if (/coffee|ritual/.test(m)) {
        reply = 'Coffee, then.';
        actions = [{ type: 'give', item: 'coffee' }];
      } else {
        reply = 'I hear you. Try: pray for a quest · pray for a hint · or ask about a room. Multiplayer: SAY when the status says multi.';
      }
      self.print('Vesper (Immortal): ' + reply, 'say');
      self.applyCodexActions(actions);
      self._immortalHist.push({ role: 'user', content: msg });
      self._immortalHist.push({ role: 'assistant', content: reply });
    }

    if (!this.apiBase) {
      offline();
      return;
    }

    fetch(this.apiBase + '/codex', {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: this.session || '',
        message: msg,
        context: ctx,
        history: this._immortalHist.slice(-8),
      }),
      signal: AbortSignal.timeout(45000),
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.reply) {
          self.print('Vesper (Immortal): ' + j.reply, 'say');
          self.applyCodexActions(j.actions || []);
          self._immortalHist.push({ role: 'user', content: msg });
          self._immortalHist.push({ role: 'assistant', content: j.reply });
          if (self._immortalHist.length > 16) self._immortalHist = self._immortalHist.slice(-16);
        } else offline();
      })
      .catch(function () { offline(); });
  };

  Engine.prototype.cmd = function (raw) {
    var line = String(raw || '').replace(/^\s+|\s+$/g, '');
    if (!line) return;
    if (this.mode === 'create') return this.handleCreate(line);

    if (this.char && this.char.position === 'sleeping' && !/^(wake|quit|logout|help|\?|score|stats|status|save)$/i.test(line.split(/\s/)[0])) {
      this.print('You dream of fog and mutual yes… (WAKE to rise.)', 'sys');
      return;
    }

    // classic shortcuts: "hello  and  :waves
    if (line.charAt(0) === '"' || line.charAt(0) === "'") {
      return this.cmd('say ' + line.slice(1).replace(/^\s+/, ''));
    }
    if (line.charAt(0) === ':') {
      return this.cmd('emote ' + line.slice(1).replace(/^\s+/, ''));
    }

    // pray to Vesper (Immortal / DM)
    var prayM = line.match(/^(?:pray|prayer|immortal)\s+(?:to\s+)?(?:vesper\s+)?([\s\S]+)$/i);
    if (prayM) { this._cmdOk(); return this.askCodex(prayM[1]); }
    if (/^(pray|prayer)$/i.test(line)) { this._cmdOk(); return this.askCodex(''); }
    // soft legacy: codex -> same immortal
    var legacyM = line.match(/^(?:codex|ask\s+codex)\s+([\s\S]+)$/i);
    if (legacyM) { this._cmdOk(); return this.askCodex(legacyM[1]); }
    if (/^codex$/i.test(line)) { this._cmdOk(); return this.askCodex(''); }

    if (/^(skip|skip tutorial|tutorial skip)$/i.test(line)) { this._cmdOk(); return this.skipTutorial(); }

    var m = line.match(/^(\S+)(?:\s+([\s\S]+))?$/);
    var verb = (m[1] || '').toLowerCase();
    var arg = (m[2] || '').trim();
    var ch = this.char;

    if (DIRS[verb] && !arg) { this._cmdOk(); return this.move(DIRS[verb]); }
    if (verb === 'go' || verb === 'move' || verb === 'walk') {
      var d = DIRS[arg.toLowerCase()];
      if (!d) { this.print('Go where? N/S/E/W/U/D/NE/NW/SE/SW.', 'err'); return; }
      this._cmdOk();
      return this.move(d);
    }

    var known = {
      l:1,look:1,ls:1,glance:1,scan:1,x:1,ex:1,examine:1,read:1,i:1,inv:1,inventory:1,
      get:1,take:1,grab:1,drop:1,put:1,wear:1,remove:1,eq:1,equipment:1,junk:1,sac:1,sacrifice:1,
      open:1,close:1,enter:1,leave:1,climb:1,drink:1,eat:1,fill:1,empty:1,
      say:1,"'":1,talk:1,emote:1,me:1,pose:1,wave:1,introduce:1,intro:1,chat:1,ooc:1,gossip:1,
      tell:1,whisper:1,to:1,reply:1,r:1,shout:1,yell:1,gtell:1,gt:1,
      who:1,players:1,where:1,whois:1,finger:1,exits:1,doors:1,home:1,recall:1,return:1,
      brief:1,verbose:1,full:1,save:1,time:1,date:1,clock:1,weather:1,desc:1,description:1,setdesc:1,
      title:1,afk:1,ignore:1,follow:1,group:1,ungroup:1,consider:1,affects:1,affected:1,skills:1,spells:1,
      give:1,news:1,motd:1,bug:1,typo:1,idea:1,sit:1,stand:1,rest:1,sleep:1,wake:1,map:1,quest:1,journal:1,
      score:1,stats:1,status:1,channels:1,config:1,color:1,colour:1,auto:1,
      list:1,buy:1,sell:1,value:1,kill:1,flee:1,flee:1,wimpy:1,
      help:1,'?':1,commands:1,socials:1,tutorial:1,quit:1,logout:1,start:1,begin:1,play:1,how:1,howto:1,tip:1,tips:1,
      restart:1,new:1,delete:1,hi:1,hello:1,password:1,practice:1,train:1,auction:1,music:1,ask:1,answer:1
    };
    Object.keys(SOCIALS).forEach(function (s) { known[s] = 1; });
    // note: exit is also in known (exits family); quit uses exit too — both intentional
    if (known[verb]) this._cmdOk();

    switch (verb) {
      case 'l':
      case 'look':
      case 'ls':
        if (!arg || arg === 'here' || arg === 'room') {
          this.lookRoom('force');
          this.tutorialTick('look');
          return;
        }
        return this.examine(arg);
      case 'x':
      case 'ex':
      case 'examine':
      case 'read':
        return this.examine(arg || 'here');
      case 'i':
      case 'inv':
      case 'inventory':
        if (!ch.inv.length) this.print('You are carrying nothing.', 'meta');
        else this.print('You carry: ' + ch.inv.map(function (id) { return (ITEMS[id] && ITEMS[id].name) || id; }).join(', ') + '.', 'meta');
        return;
      case 'get':
      case 'take':
      case 'grab':
        return this.getItem(arg);
      case 'drop':
        return this.dropItem(arg);
      case 'say':
      case "'":
      case 'talk':
        if (!arg) { this.print('Say what?', 'err'); return; }
        // quest check
        var said = false;
        function completeQuest(self, id, xp, msg) {
          self.print('You say, "' + arg + '"', 'say');
          self.print(msg, 'sys');
          ch.xp = (ch.xp || 0) + (xp || 5);
          if (ch.quest && ch.quest.id === id) ch.quest = null;
          saveChar(ch);
        }
        if (/token for the bay/i.test(arg) && ch.room === 'dock' && ch.inv.indexOf('coin') >= 0) {
          completeQuest(this, 'muni_to_pier', 5, 'The bay seems to approve. Quest complete (+xp).');
          said = true;
        } else if (/coffee break/i.test(arg) && ch.room === 'cafe' && ch.inv.indexOf('mug') >= 0) {
          completeQuest(this, 'coffee_break', 5, 'Steam and small talk. Coffee-break quest complete (+xp).');
          said = true;
        } else if (/both sides/i.test(arg) && ch.room === 'plaza' && ch.inv.indexOf('stamp') >= 0) {
          completeQuest(this, 'stamp_intro', 5, 'You stamp the air with mutual yes. Quest complete (+xp).');
          said = true;
        } else if (/light the fog/i.test(arg) && ch.room === 'dock' && ch.inv.indexOf('lantern') >= 0) {
          completeQuest(this, 'lantern_pier', 5, 'Lantern light on salt air. Quest complete (+xp).');
          said = true;
        } else if (/what are you building/i.test(arg) && ch.room === 'launch_kitchen' && ch.inv.indexOf('question_card') >= 0) {
          completeQuest(this, 'ask_builder', 3, 'The kitchen answers with three weird little ideas. Social quest complete (+xp).');
          said = true;
        } else if (/nice to meet you/i.test(arg) && ch.room === 'salon' && ch.inv.indexOf('name_tag') >= 0) {
          completeQuest(this, 'meet_kitchen', 3, 'Names turn into a conversation. Social quest complete (+xp).');
          said = true;
        } else if (/group chat is irl/i.test(arg) && ch.room === 'plaza' && ch.inv.indexOf('house_key') >= 0) {
          completeQuest(this, 'group_chat_irl', 3, 'The street hears the group chat. Quest complete (+xp).');
          said = true;
        } else if (/^debrief\b/i.test(arg) && ch.room === 'diner') {
          completeQuest(this, 'diner_debrief', 3, 'Maru slides pie your way. Debrief complete (+xp).');
          said = true;
        } else if (/^(hi|hello)\b/i.test(arg) && (ch.room === 'cafe' || ch.room === 'bar' || ch.room === 'roof')) {
          // three_hellos + Sam social (bar)
          ch.flags = ch.flags || {};
          ch.flags.hellos = ch.flags.hellos || {};
          ch.flags.hellos[ch.room] = true;
          var h = ch.flags.hellos;
          if (h.cafe && h.bar && h.roof) {
            completeQuest(this, 'three_hellos', 5, 'Three rooms, three hellos. The district softens (+xp).');
            said = true;
          } else if (ch.room === 'bar') {
            completeQuest(this, 'say_sam', 3, 'Sam nods back. Social quest complete (+xp).');
            said = true;
          }
        }
        if (!said) {
          this.print('You say, "' + arg + '"', 'say');
        }
        this.npcHear(arg);
        this.pushMulti('say', ch.name + ' says, "' + arg + '"', { room: ch.room });
        if (this.session && !this._saidLiveTip) {
          this._saidLiveTip = true;
          this.print('(LIVE) Visitors in this room hear that. CHAT reaches the whole district. WHO lists people.', 'sys');
        } else if (!this.session && !this._saidSoloTip) {
          this._saidSoloTip = true;
          this.print('(solo) NPCs heard the vibe. When LIVE, real visitors hear SAY too.', 'sys');
        }
        this.tutorialTick('say');
        return;
      case 'emote':
      case 'me':
      case 'pose':
        if (!arg) { this.print('Emote what?', 'err'); return; }
        this.print(ch.name + ' ' + arg, 'say');
        this.pushMulti('emote', ch.name + ' ' + arg, { room: ch.room });
        return;
      case 'wave':
        this.print(ch.name + ' waves' + (arg ? ' at ' + arg : '') + '.', 'say');
        this.pushMulti('emote', ch.name + ' waves' + (arg ? ' at ' + arg : '') + '.', { room: ch.room });
        return;
      case 'introduce':
      case 'intro':
        this.print('You introduce yourself: "' + ch.name + ' the ' + ((CLASSES[ch.klass] || {}).title || ch.klass) + '."', 'say');
        this.pushMulti('say', ch.name + ' introduces themself (' + ((CLASSES[ch.klass] || {}).title || ch.klass) + ').', { room: ch.room });
        return;
      case 'chat':
      case 'ooc':
      case 'gossip':
        if (!arg) { this.print('Chat what? (district-wide)', 'err'); return; }
        this.print('[chat] ' + ch.name + ': ' + arg, 'say');
        this.pushMulti('chat', '[chat] ' + ch.name + ': ' + arg, { room: '*' });
        if (this.session && !this._chatTip) {
          this._chatTip = true;
          this.print('(LIVE) CHAT goes to everyone online in the district — not just this room.', 'sys');
        }
        return;
      case 'tell':
      case 'whisper':
      case 'to': {
        var parts = arg.match(/^(\S+)\s+([\s\S]+)$/);
        if (!parts) { this.print('Usage: tell <name> <message>', 'err'); return; }
        var target = parts[1];
        var msg = parts[2];
        if (/^(codex|vesper)$/i.test(target)) return this.askCodex(msg);
        var npc = NPCS.find(function (n) { return n.name.toLowerCase() === target.toLowerCase() && n.room === ch.room; });
        if (npc) {
          this.print('You whisper to ' + npc.name + ', "' + msg + '"', 'say');
          this.print(npc.name + ' nods.', 'say');
        } else {
          this.print('You lean toward ' + target + '…', 'say');
          this.pushMulti('tell', ch.name + ' tells you, "' + msg + '"', { to: target, room: ch.room });
        }
        return;
      }
      case 'who':
      case 'players': {
        if (this.session && this.remoteWho && this.remoteWho.length) {
          var others = this.remoteWho.filter(function (p) {
            return p && p.name && (!ch || p.name !== ch.name);
          });
          this.print('LIVE visitors online (' + this.remoteWho.length + '):', 'meta');
          if (!others.length) {
            this.print('  (just you right now — SAY or CHAT so newcomers see activity)', 'meta');
          } else {
            for (var wi = 0; wi < others.length; wi++) {
              var pw = others[wi];
              this.print('  · ' + pw.name + ' (' + (pw.klass || 'visitor') + ') — ' + (pw.room || '?'), 'meta');
            }
          }
          this.print('Talk: SAY hello (same room) · CHAT hello (everyone) · TELL name hi', 'sys');
        } else {
          this.print('Not LIVE yet — only NPCs. Relay offline or still connecting.', 'meta');
          this.print('When status says LIVE, other site visitors hear your SAY/CHAT.', 'sys');
        }
        this.print('Here now: ' + this.peopleHere().join(', '), 'meta');
        return;
      }
      case 'exit':
      case 'exits':
      case 'doors': {
        var rEx = this.here();
        var ex = Object.keys(rEx.exits || {});
        this.print('Obvious exits: ' + (ex.length ? ex.join(', ') : 'none') + '.', 'meta');
        return;
      }
      case 'home':
      case 'recall':
      case 'return':
        if (ch.room === 'plaza') {
          this.print('You are already at Market Street Crossing (home).', 'sys');
          return;
        }
        this.print('You head home to Market Street…', 'sys');
        ch.room = 'plaza';
        saveChar(ch);
        this.lookRoom(false);
        this.syncRoom();
        return;
      case 'brief':
        ch.brief = true;
        saveChar(ch);
        this.print('Brief mode ON — short room names/exits only. Type VERBOSE for full descs.', 'sys');
        return;
      case 'verbose':
      case 'full':
        ch.brief = false;
        saveChar(ch);
        this.print('Verbose mode ON — full room descriptions.', 'sys');
        return;
      case 'save':
        saveChar(ch);
        this.print('Character saved (also auto-saves). Name: ' + ch.name + ' · room: ' + ch.room + '.', 'sys');
        return;
      case 'time':
      case 'date':
      case 'clock': {
        var hr = new Date().getHours();
        var phase = hr < 5 ? 'deep night' : hr < 11 ? 'morning fog' : hr < 17 ? 'afternoon gray' : hr < 21 ? 'evening neon' : 'night district';
        this.print('San Francisco · local ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + phase + '.', 'meta');
        return;
      }
      case 'desc':
      case 'description':
      case 'setdesc':
        if (!arg) {
          this.print(ch.desc ? ('Your desc: ' + ch.desc) : 'No custom desc. Usage: desc <what others see when they look at you>', 'meta');
          return;
        }
        ch.desc = arg.slice(0, 160);
        saveChar(ch);
        this.print('Description set. Others can LOOK ' + ch.name + '.', 'sys');
        return;
      case 'give': {
        // give <item> to <name>  OR  give <name> <item>
        var gm = arg.match(/^(.+?)\s+to\s+(\S+)$/i) || arg.match(/^(\S+)\s+(.+)$/);
        if (!gm) { this.print('Usage: give <item> to <name>', 'err'); return; }
        var gItem = gm[1].trim();
        var gName = gm[2].trim();
        if (/^to$/i.test(gItem)) { this.print('Usage: give <item> to <name>', 'err'); return; }
        // if pattern was give name item
        if (!arg.match(/\s+to\s+/i) && gm) {
          // prefer item-first if inv matches first token
          var try1 = this.findItem(gItem, true);
          if (!try1 || (this.char.inv || []).indexOf(try1) < 0) {
            // swap: give Bob coin
            var swap = gItem; gItem = gName; gName = swap;
          }
        }
        var gid = null;
        var inv = ch.inv || [];
        var qg = gItem.toLowerCase();
        for (var gi = 0; gi < inv.length; gi++) {
          var git = ITEMS[inv[gi]];
          if (inv[gi] === qg || (git && git.name.toLowerCase().indexOf(qg) >= 0)) { gid = inv[gi]; break; }
        }
        if (!gid) { this.print("You aren't carrying that.", 'err'); return; }
        if (/^(codex|vesper)$/i.test(gName)) {
          ch.inv = inv.filter(function (x) { return x !== gid; });
          saveChar(ch);
          this.print('You offer ' + ((ITEMS[gid] && ITEMS[gid].name) || gid) + ' to Vesper. The Immortal accepts with a nod.', 'sys');
          return;
        }
        var gnpc = NPCS.find(function (n) { return n.name.toLowerCase() === gName.toLowerCase() && n.room === ch.room; });
        if (gnpc) {
          ch.inv = inv.filter(function (x) { return x !== gid; });
          saveChar(ch);
          this.print('You give ' + ((ITEMS[gid] && ITEMS[gid].name) || gid) + ' to ' + gnpc.name + '.', 'sys');
          this.print(gnpc.name + ' says, "Thanks."', 'say');
          return;
        }
        // multiplayer: announce give (recipient gets flavor; items stay local-simple)
        this.print('You offer ' + ((ITEMS[gid] && ITEMS[gid].name) || gid) + ' to ' + gName + ' (they must be nearby in multi).', 'sys');
        this.pushMulti('emote', ch.name + ' offers ' + ((ITEMS[gid] && ITEMS[gid].name) || gid) + ' to ' + gName + '.', { room: ch.room });
        return;
      }
      case 'news':
      case 'motd':
        this.print('News: SF Night District is a social MUD for trydemigod.com visitors. Talk first. Vesper is Immortal (pray). Multi: node demigod-mud-app.mjs', 'sys');
        return;
      case 'bug':
      case 'typo':
      case 'idea':
        this.print('Thanks — email potter@trydemigod.com with subject MUD. (No in-game ticket system.)', 'sys');
        return;
      case 'sit':
        ch.position = 'sitting';
        saveChar(ch);
        this.print(ch.name + ' sits down' + (arg ? ' on ' + arg : '') + '.', 'say');
        this.pushMulti('emote', ch.name + ' sits down' + (arg ? ' on ' + arg : '') + '.', { room: ch.room });
        return;
      case 'stand':
        ch.position = 'standing';
        saveChar(ch);
        this.print(ch.name + ' stands up.', 'say');
        this.pushMulti('emote', ch.name + ' stands up.', { room: ch.room });
        return;
      case 'map':
        this.print(
          'SF Night District (sketch — LOOK in each room):\n' +
          '  roof/helipad above lobby · attic above archive · mezz above lab\n' +
          '  [transit]-[office]-[lobby]-[review]-[archive]\n' +
          '      |     west:salon      |\n' +
          '  [caltrain] [parklet] [plaza]-[alley]-[lab]-[dogpatch]-[pier]\n' +
          '   |diner     |        |       |      |\n' +
          '   [dock]-[bridge]  [cafe]  [market]-[stall]\n' +
          '                    |\n' +
          '  [panhandle]-[haight]-[mission]-[bookstore]  · kitchen NE of mission\n' +
          '       \\-[grouphouse]-/    |\n' +
          '                       [bar]-[nocturne]-[chinatown gate]\n' +
          '  also: salon west of loft · showplace west of garden · emb path east of market\n' +
          'You are: ' + ch.room,
          'meta'
        );
        return;
      case 'quest':
      case 'journal':
        if (ch.quest && ch.quest.text) this.print('Quest: ' + ch.quest.text, 'meta');
        else this.print('No active quest. Try: pray for a quest', 'meta');
        return;
      case 'score':
      case 'stats':
      case 'status':
        this.print(
          ch.name + (ch.title ? ' ' + ch.title : '') + ' the ' + ((CLASSES[ch.klass] || {}).title || ch.klass) +
          ' · HP ' + ch.hp + '/' + ch.maxHp +
          ' · xp ' + (ch.xp || 0) +
          ' · ' + (ch.position || 'standing') +
          ' · room ' + ch.room +
          (ch.afk ? ' · AFK' : '') +
          (ch.quest ? ' · quest on' : ''),
          'meta'
        );
        return;
      case 'help':
      case '?':
      case 'commands':
      case 'tutorial':
        if (!arg || arg === 'commands' || arg === 'list') {
          this.print(
            'Easy start (you can use the buttons too):\n' +
            '  LOOK · N S E W · SAY hi · WHO · MAP · PRAY · SKIP · START\n' +
            'More: help movement|talk|socials|items|info|shop|immortal\n' +
            '  LOOK · EXITS · HOME · MAP · INV · GET · DROP · GIVE\n' +
            '  SAY · EMOTE · TELL · CHAT · WHO · SCORE · SAVE · QUIT',
            'sys'
          );
          return;
        }
        var topic = arg.toLowerCase();
        if (HELP_TOPICS[topic]) { this.print(HELP_TOPICS[topic], 'sys'); return; }
        if (SOCIALS[topic]) {
          this.print(topic + ' — social. Usage: ' + topic + '  or  ' + topic + ' <name>', 'sys');
          return;
        }
        if (known[topic] || DIRS[topic]) {
          this.print(topic + ' — try it. Type HELP for groups, or HELP socials.', 'sys');
          return;
        }
        this.print('No help on "' + arg + '". Try HELP or HELP socials.', 'err');
        return;
      case 'quit':
      case 'logout':
        try { this.pushMulti('system', ch.name + ' steps into the fog.', { room: ch.room }); } catch (e) {}
        saveChar(ch);
        this.session = null;
        this.remoteHere = [];
        this.remoteWho = [];
        this.onStatus('offline · saved');
        this.print('You step into the SF fog. Character saved. Come back anytime.', 'sys');
        return;
      case 'restart':
      case 'new':
      case 'delete':
        clearChar();
        this.char = null;
        this.session = null;
        this.mode = 'create';
        this._create = { name: '', klass: 'wanderer' };
        this.print('Character cleared. Name?', 'sys');
        return;

      case 'glance':
        this.lookRoom(false);
        return;
      case 'scan': {
        var rS = this.here();
        var exS = Object.keys(rS.exits || {});
        var linesS = exS.map(function (d) {
          var nid = rS.exits[d];
          var nr = ROOMS[nid];
          return (DIR_SHORT[d] || d) + ' — ' + ((nr && nr.name) || nid);
        });
        this.print(linesS.length ? ('You scan:\\n  ' + linesS.join('\\n  ')) : 'Nothing nearby.', 'meta');
        return;
      }
      case 'weather':
        this.print('San Francisco fog hangs low. Neon reflects on wet asphalt. (Flavor weather.)', 'meta');
        return;
      case 'channels':
        this.print('Channels: say (room) · chat/gossip/ooc (district) · shout/yell · tell/whisper · reply · pray (immortal).', 'meta');
        return;
      case 'config':
      case 'color':
      case 'colour':
      case 'auto':
        this.print('Config is mostly automatic here. BRIEF/VERBOSE toggles room length. COLOR is always on in browser.', 'sys');
        return;
      case 'password':
      case 'practice':
      case 'train':
      case 'auction':
      case 'music':
        this.print('Not used in this social district. Try SAY, CHAT, or PRAY.', 'sys');
        return;
      case 'title':
        if (!arg) {
          this.print(ch.title ? ('Title: ' + ch.title) : 'No title. Usage: title <text>', 'meta');
          return;
        }
        ch.title = arg.slice(0, 48);
        saveChar(ch);
        this.print('Title set: ' + ch.name + ' ' + ch.title, 'sys');
        return;
      case 'afk':
        ch.afk = !ch.afk;
        saveChar(ch);
        this.print(ch.afk ? 'You are now AFK.' : 'You are back.', 'sys');
        this.pushMulti('emote', ch.name + (ch.afk ? ' is AFK.' : ' returns from AFK.'), { room: ch.room });
        return;
      case 'ignore':
        if (!arg) {
          this.print(ch.ignore && ch.ignore.length ? ('Ignoring: ' + ch.ignore.join(', ')) : 'Ignore who? Usage: ignore <name>', 'meta');
          return;
        }
        var ign = arg.toLowerCase();
        ch.ignore = ch.ignore || [];
        if (ch.ignore.indexOf(ign) >= 0) {
          ch.ignore = ch.ignore.filter(function (x) { return x !== ign; });
          this.print('No longer ignoring ' + arg + '.', 'sys');
        } else {
          ch.ignore.push(ign);
          this.print('Ignoring ' + arg + ' (local filter for multi tells/chat).', 'sys');
        }
        saveChar(ch);
        return;
      case 'follow':
        if (!arg) {
          this.print(ch.follow ? ('Following: ' + ch.follow) : 'Follow who? Usage: follow <name> | follow self', 'meta');
          return;
        }
        if (/^(self|me|none|stop)$/i.test(arg)) {
          ch.follow = '';
          saveChar(ch);
          this.print('You stop following.', 'sys');
          return;
        }
        ch.follow = arg;
        saveChar(ch);
        this.print('You start following ' + arg + ' (social flag — multi may show it).', 'sys');
        this.pushMulti('emote', ch.name + ' starts following ' + arg + '.', { room: ch.room });
        return;
      case 'group':
        if (!arg) {
          this.print(ch.group && ch.group.length ? ('Group: ' + ch.group.join(', ')) : 'Empty group. Usage: group <name>', 'meta');
          return;
        }
        ch.group = ch.group || [];
        if (ch.group.indexOf(arg) < 0) ch.group.push(arg);
        saveChar(ch);
        this.print('Group now: ' + ch.group.join(', '), 'sys');
        return;
      case 'ungroup':
        ch.group = [];
        saveChar(ch);
        this.print('Group cleared.', 'sys');
        return;
      case 'gtell':
      case 'gt':
        if (!arg) { this.print('Gtell what?', 'err'); return; }
        this.print('[group] ' + ch.name + ': ' + arg, 'say');
        this.pushMulti('chat', '[group] ' + ch.name + ': ' + arg, { room: '*' });
        return;
      case 'reply':
      case 'r':
        if (!ch.lastTell) { this.print('No one has told you anything yet.', 'err'); return; }
        if (!arg) { this.print('Reply what? (last tell from ' + ch.lastTell + ')', 'err'); return; }
        return this.cmd('tell ' + ch.lastTell + ' ' + arg);
      case 'shout':
      case 'yell':
        if (!arg) { this.print('Shout what?', 'err'); return; }
        this.print('You shout, "' + arg + '"', 'say');
        this.pushMulti('chat', ch.name + ' shouts, "' + arg + '"', { room: '*' });
        return;
      case 'where': {
        var hereW = this.peopleHere();
        this.print('You are at ' + (this.here().name || ch.room) + ' (' + ch.room + ').', 'meta');
        this.print('Here: ' + hereW.join(', '), 'meta');
        if (this.remoteWho && this.remoteWho.length) {
          this.print('District: ' + this.remoteWho.map(function (p) {
            return p.name + '@' + (p.room || '?');
          }).join(' · '), 'meta');
        }
        return;
      }
      case 'whois':
      case 'finger': {
        if (!arg) { this.print('Whois whom?', 'err'); return; }
        if (/^(self|me)$/i.test(arg) || arg.toLowerCase() === String(ch.name).toLowerCase()) {
          this.print(ch.name + (ch.title ? ' ' + ch.title : '') + ' · ' + ((CLASSES[ch.klass] || {}).title || ch.klass) +
            (ch.desc ? '\\n' + ch.desc : '') + (ch.afk ? '\\n(AFK)' : ''), 'meta');
          return;
        }
        var fn = NPCS.find(function (n) { return n.name.toLowerCase() === arg.toLowerCase(); });
        if (fn) {
          this.print(fn.name + (fn.immortal ? ' (Immortal)' : '') + '\\n' + (fn.look || ''), 'meta');
          return;
        }
        this.print(arg + ' — visitor or offline. Try WHO.', 'meta');
        return;
      }
      case 'consider':
        if (!arg) { this.print('Consider whom?', 'err'); return; }
        this.print('You size up ' + arg + '. In this district, talk beats combat. (No PK.)', 'meta');
        return;
      case 'affects':
      case 'affected':
        this.print('You are affected by: fog · curiosity' + (ch.afk ? ' · afk' : '') + '.', 'meta');
        return;
      case 'skills':
      case 'spells':
        this.print('Skills here are social: talk, listen, mutual yes. No combat skills in this district.', 'meta');
        return;
      case 'rest':
        ch.position = 'resting';
        saveChar(ch);
        this.print(ch.name + ' rests.', 'say');
        this.pushMulti('emote', ch.name + ' rests.', { room: ch.room });
        return;
      case 'sleep':
        ch.position = 'sleeping';
        saveChar(ch);
        this.print('You drift into SF fog-dreams. Type WAKE.', 'sys');
        this.pushMulti('emote', ch.name + ' falls asleep.', { room: ch.room });
        return;
      case 'wake':
        if (ch.position === 'standing') { this.print('You are already awake.', 'sys'); return; }
        ch.position = 'standing';
        saveChar(ch);
        this.print('You wake up.', 'sys');
        this.pushMulti('emote', ch.name + ' wakes up.', { room: ch.room });
        return;
      case 'put': {
        // put <item> in <container> OR put <item> <container>
        var pm = arg.match(/^(.+?)\s+(?:in|into|on)\s+(.+)$/i) || arg.match(/^(\S+)\s+(.+)$/);
        if (!pm) { this.print('Usage: put <item> in <container>', 'err'); return; }
        var pItem = pm[1].trim(), pCont = pm[2].trim();
        var pid = null, cid = null;
        var invP = ch.inv || [];
        for (var pi = 0; pi < invP.length; pi++) {
          var pit = ITEMS[invP[pi]];
          if (invP[pi] === pItem.toLowerCase() || (pit && pit.name.toLowerCase().indexOf(pItem.toLowerCase()) >= 0)) {
            if (!pid) pid = invP[pi];
          }
          if (invP[pi] === pCont.toLowerCase() || (pit && pit.name.toLowerCase().indexOf(pCont.toLowerCase()) >= 0)) {
            if (pit && pit.container) cid = invP[pi];
          }
        }
        // container may be on ground
        if (!cid) {
          var cGround = this.findItem(pCont, false);
          if (cGround && ITEMS[cGround] && ITEMS[cGround].container) cid = cGround;
        }
        if (!pid) { this.print("You aren't carrying that item.", 'err'); return; }
        if (!cid) { this.print("That isn't a container you can use.", 'err'); return; }
        if (pid === cid) { this.print("You can't put something inside itself.", 'err'); return; }
        var cont = ITEMS[cid];
        cont.holds = cont.holds || [];
        if (cont.holds.length >= (cont.capacity || 2)) { this.print('It is full.', 'err'); return; }
        ch.inv = invP.filter(function (x) { return x !== pid; });
        cont.holds.push(pid);
        saveChar(ch);
        this.print('You put ' + ((ITEMS[pid] && ITEMS[pid].name) || pid) + ' in ' + (cont.name || cid) + '.', 'sys');
        return;
      }
      case 'wear': {
        if (!arg) { this.print('Wear what?', 'err'); return; }
        var wid = null;
        var winv = ch.inv || [];
        for (var wi = 0; wi < winv.length; wi++) {
          var wit = ITEMS[winv[wi]];
          if (winv[wi] === arg.toLowerCase() || (wit && wit.name.toLowerCase().indexOf(arg.toLowerCase()) >= 0)) {
            if (wit && wit.wear) { wid = winv[wi]; break; }
            if (!wid) wid = winv[wi];
          }
        }
        if (!wid) { this.print("You aren't carrying that.", 'err'); return; }
        var wslot = (ITEMS[wid] && ITEMS[wid].wear) || 'held';
        ch.eq = ch.eq || {};
        if (ch.eq[wslot]) {
          ch.inv.push(ch.eq[wslot]);
        }
        ch.inv = (ch.inv || []).filter(function (x) { return x !== wid; });
        ch.eq[wslot] = wid;
        saveChar(ch);
        this.print('You wear ' + ((ITEMS[wid] && ITEMS[wid].name) || wid) + ' (' + wslot + ').', 'sys');
        return;
      }
      case 'remove': {
        if (!arg) { this.print('Remove what?', 'err'); return; }
        ch.eq = ch.eq || {};
        var rslot = null, rid = null;
        Object.keys(ch.eq).forEach(function (s) {
          var eid = ch.eq[s];
          var eit = ITEMS[eid];
          if (s === arg.toLowerCase() || eid === arg.toLowerCase() || (eit && eit.name.toLowerCase().indexOf(arg.toLowerCase()) >= 0)) {
            rslot = s; rid = eid;
          }
        });
        if (!rid) { this.print("You aren't wearing that.", 'err'); return; }
        delete ch.eq[rslot];
        ch.inv = ch.inv || [];
        ch.inv.push(rid);
        saveChar(ch);
        this.print('You remove ' + ((ITEMS[rid] && ITEMS[rid].name) || rid) + '.', 'sys');
        return;
      }
      case 'eq':
      case 'equipment': {
        ch.eq = ch.eq || {};
        var slots = Object.keys(ch.eq);
        if (!slots.length) { this.print('You are wearing nothing special.', 'meta'); return; }
        this.print('You are wearing:\\n' + slots.map(function (s) {
          return '  ' + s + ': ' + ((ITEMS[ch.eq[s]] && ITEMS[ch.eq[s]].name) || ch.eq[s]);
        }).join('\\n'), 'meta');
        return;
      }
      case 'junk':
      case 'sac':
      case 'sacrifice': {
        if (!arg) { this.print('Junk what?', 'err'); return; }
        var jid = null;
        var jinv = ch.inv || [];
        for (var ji = 0; ji < jinv.length; ji++) {
          var jit = ITEMS[jinv[ji]];
          if (jinv[ji] === arg.toLowerCase() || (jit && jit.name.toLowerCase().indexOf(arg.toLowerCase()) >= 0)) {
            jid = jinv[ji]; break;
          }
        }
        if (!jid) { this.print("You aren't carrying that.", 'err'); return; }
        ch.inv = jinv.filter(function (x) { return x !== jid; });
        ch.xp = (ch.xp || 0) + 1;
        saveChar(ch);
        this.print('You junk ' + ((ITEMS[jid] && ITEMS[jid].name) || jid) + '. The fog accepts it. (+1 xp)', 'sys');
        return;
      }
      case 'open':
      case 'close':
        this.print('You ' + verb + ' ' + (arg || 'something') + '. (Atmosphere — no locked doors in this district.)', 'sys');
        return;
      case 'enter':
        if (DIRS[arg && arg.toLowerCase()]) return this.move(DIRS[arg.toLowerCase()]);
        // try enter room by keyword
        if (arg && /stall|shop|market/i.test(arg) && ROOMS.shop_stall) {
          ch.room = 'shop_stall';
          saveChar(ch);
          this.lookRoom(false);
          this.syncRoom();
          return;
        }
        this.print('Enter where? Try a direction or ENTER STALL at the market.', 'err');
        return;
      case 'leave':
        if (ch.room === 'shop_stall') {
          ch.room = 'market';
          saveChar(ch);
          this.print('You leave the stall.', 'sys');
          this.lookRoom(false);
          this.syncRoom();
          return;
        }
        this.print('You leave the way you came — try EXITS.', 'sys');
        return;
      case 'climb':
        if (arg && /up|roof/i.test(arg)) return this.move('up');
        if (arg && /down/i.test(arg)) return this.move('down');
        this.print('Climb where? CLIMB UP or CLIMB DOWN if available.', 'err');
        return;
      case 'drink': {
        if (!arg) { this.print('Drink what?', 'err'); return; }
        var did = null;
        (ch.inv || []).forEach(function (id) {
          var it = ITEMS[id];
          if (id === arg.toLowerCase() || (it && it.name.toLowerCase().indexOf(arg.toLowerCase()) >= 0)) {
            if (it && it.drink) did = id;
          }
        });
        if (!did) { this.print("You don't have a drink like that.", 'err'); return; }
        ch.inv = (ch.inv || []).filter(function (x) { return x !== did; });
        saveChar(ch);
        this.print('You drink ' + ((ITEMS[did] && ITEMS[did].name) || did) + '. Refreshing.', 'sys');
        return;
      }
      case 'eat': {
        if (!arg) { this.print('Eat what?', 'err'); return; }
        var eid2 = null;
        (ch.inv || []).forEach(function (id) {
          var it = ITEMS[id];
          if (id === arg.toLowerCase() || (it && it.name.toLowerCase().indexOf(arg.toLowerCase()) >= 0)) {
            if (it && it.food) eid2 = id;
          }
        });
        if (!eid2) { this.print("You don't have food like that.", 'err'); return; }
        ch.inv = (ch.inv || []).filter(function (x) { return x !== eid2; });
        saveChar(ch);
        this.print('You eat ' + ((ITEMS[eid2] && ITEMS[eid2].name) || eid2) + '.', 'sys');
        return;
      }
      case 'fill':
      case 'empty':
        this.print(verb === 'fill' ? 'You fill what you can. (Flavor.)' : 'You empty it carefully. (Flavor.)', 'sys');
        return;
      case 'list': {
        var shopR = this.here();
        if (!shopR.shop) {
          this.print('No shop here. Try the Night Market Stall (south of Ferry Building market).', 'err');
          return;
        }
        this.print('For sale:\\n' + shopR.shop.map(function (s, i) {
          return '  ' + (i + 1) + '. ' + s.name + ' — ' + (s.cost ? (s.cost + ' xp') : 'free sample');
        }).join('\\n'), 'meta');
        return;
      }
      case 'buy': {
        var shopB = this.here();
        if (!shopB.shop) { this.print('Nothing to buy here.', 'err'); return; }
        if (!arg) { this.print('Buy what? LIST first.', 'err'); return; }
        var buyItem = null;
        var num = parseInt(arg, 10);
        if (!isNaN(num) && shopB.shop[num - 1]) buyItem = shopB.shop[num - 1];
        else {
          buyItem = shopB.shop.find(function (s) {
            return s.id === arg.toLowerCase() || (s.name && s.name.toLowerCase().indexOf(arg.toLowerCase()) >= 0);
          });
        }
        if (!buyItem) { this.print("They don't sell that.", 'err'); return; }
        if ((ch.xp || 0) < (buyItem.cost || 0)) { this.print('Not enough xp (this stall is mostly free samples).', 'err'); return; }
        ch.xp = (ch.xp || 0) - (buyItem.cost || 0);
        ch.inv = ch.inv || [];
        ch.inv.push(buyItem.id);
        saveChar(ch);
        this.print('You buy ' + buyItem.name + '.', 'sys');
        return;
      }
      case 'sell':
      case 'value':
        this.print(verb === 'sell' ? 'The stall only gives samples — no buyback.' : 'Value: priceless social capital (or free sample).', 'sys');
        return;
      case 'kill':
      case 'flee':
      case 'wimpy':
        this.print('No combat in this district. Talk instead — SAY, EMOTE, or PRAY.', 'sys');
        return;
      case 'socials':
        this.print('Socials: ' + Object.keys(SOCIALS).sort().join(' '), 'sys');
        return;
      case 'ask':
      case 'answer':
        if (!arg) { this.print(verb + ' what? (or PRAY to Vesper)', 'err'); return; }
        return this.cmd('say ' + arg);

      case 'hi':
      case 'hello':
        this.cmd('say hello');
        return;
      case 'start':
      case 'begin':
      case 'play':
      case 'how':
      case 'howto':
      case 'tip':
      case 'tips':
        this._cmdOk();
        this.print(
          'Talk to live visitors (main point of this MUD):\n' +
          '  1) Wait until status says LIVE\n' +
          '  2) WHO — see who is online\n' +
          '  3) SAY hi — people in this room hear you\n' +
          '  4) CHAT hi — everyone online hears you\n' +
          'Also: LOOK · N/S/E/W · MAP · PRAY · SKIP · buttons below',
          'sys'
        );
        if (!arg && verb !== 'tip' && verb !== 'tips') this.lookRoom(false);
        return;
      default:
        if (SOCIALS[verb]) {
          this._cmdOk();
          return this.doSocial(verb, arg);
        }
        this._huhStreak = (this._huhStreak || 0) + 1;
        var guess = '';
        var TYPO = {
          loook:'look', lok:'look', luk:'look', invn:'inv', hlep:'help', hepl:'help',
          extis:'exits', exi:'exits', nroth:'north', soth:'south', eaast:'east',
          whos:'who', wher:'where', mpa:'map', pry:'pray', praay:'pray', saay:'say'
        };
        if (TYPO[verb]) guess = TYPO[verb];
        else {
          var keys = Object.keys(known).concat(Object.keys(DIRS));
          for (var ki = 0; ki < keys.length; ki++) {
            if (keys[ki].indexOf(verb) === 0 && keys[ki].length <= verb.length + 4) {
              guess = keys[ki];
              break;
            }
          }
        }
        this.print(guess ? ('Not sure about "' + verb + '". Did you mean ' + guess.toUpperCase() + '?') : 'Huh?', 'err');
        if (guess) this.print('(Type ' + guess + (arg ? (' ' + arg) : '') + ' — or HELP / START for easy tips.)', 'sys');
        else if (this._huhStreak >= 2) {
          this._huhStreak = 0;
          this.print('Easy: LOOK · N/S/E/W · SAY hi · MAP · WHO · HELP · PRAY · or tap a button below.', 'sys');
        }
        return;
    }
  };

  Engine.prototype._cmdOk = function () {
    this._huhStreak = 0;
  };

  Engine.prototype.doSocial = function (verb, arg) {
    var s = SOCIALS[verb];
    if (!s) return;
    var ch = this.char;
    var name = ch.name;
    function sub(tpl, vict) {
      return String(tpl || '')
        .replace(/\$N/g, name)
        .replace(/\$T/g, vict || 'someone')
        .replace(/\$n/g, name)
        .replace(/\$t/g, vict || 'someone');
    }
    if (!arg) {
      this.print(sub(s.self), 'say');
      this.pushMulti('emote', sub(s.room), { room: ch.room });
      return;
    }
    var target = arg.split(/\s+/)[0];
    if (/^(self|me)$/i.test(target)) {
      this.print(sub(s.self), 'say');
      this.pushMulti('emote', sub(s.room), { room: ch.room });
      return;
    }
    this.print(sub(s.vict || s.self, target), 'say');
    this.pushMulti('emote', sub(s.roomv || s.room, target), { room: ch.room });
  };

  Engine.prototype.move = function (dir) {
    var r = this.here();
    var next = r.exits && r.exits[dir];
    if (!next || !ROOMS[next]) {
      this.print("You can't go that way.", 'err');
      return;
    }
    this.char.room = next;
    this.char.xp = (this.char.xp || 0) + 1;
    saveChar(this.char);
    this.print('You go ' + dir + '.', 'sys');
    this.lookRoom(this.char.brief ? false : false);
    this.syncRoom();
    this.tutorialTick('move');
  };

  Engine.prototype.examine = function (arg) {
    var a = (arg || '').toLowerCase();
    if (!a || a === 'here' || a === 'room') return this.lookRoom(true);
    if (/^(codex|vesper)$/.test(a)) {
      var imm = NPCS.find(function (n) { return n.id === 'vesper' || n.immortal; });
      this.print(imm ? imm.look : 'Vesper the Immortal. Type: pray', 'out');
      return;
    }
    var id = this.findItem(a, true);
    if (id && ITEMS[id]) {
      this.print(ITEMS[id].look || ITEMS[id].name, 'out');
      if (ITEMS[id].container) {
        var holds = ITEMS[id].holds || [];
        this.print(holds.length
          ? ('Contains: ' + holds.map(function (h) { return (ITEMS[h] && ITEMS[h].name) || h; }).join(', '))
          : 'It is empty.', 'meta');
      }
      // lantern quest: look shell at pier while carrying lantern
      if (id === 'shell' && this.char.room === 'dock' && (this.char.inv || []).indexOf('lantern') >= 0) {
        if (this.char.quest && this.char.quest.id === 'lantern_pier') {
          this.char.quest = null;
          this.char.xp = (this.char.xp || 0) + 5;
          saveChar(this.char);
          this.print('Lantern light on the shell. Quest complete (+xp).', 'sys');
        }
      }
      return;
    }
    var npc = NPCS.find(function (n) {
      return n.room === this.char.room && n.name.toLowerCase() === a;
    }, this);
    if (npc) {
      this.print(npc.look, 'out');
      return;
    }
    if (a === 'self' || a === 'me') {
      var me = this.char;
      this.print((me && me.desc) || (me.name + ' the ' + ((CLASSES[me.klass] || {}).title || me.klass) + '.'), 'out');
      this.cmd('score');
      return;
    }
    if (this.char && a === String(this.char.name || '').toLowerCase()) {
      this.print(this.char.desc || (this.char.name + ' the ' + ((CLASSES[this.char.klass] || {}).title || this.char.klass) + '.'), 'out');
      return;
    }
    if ((this.remoteHere || []).some(function (n) { return String(n).toLowerCase() === a; })) {
      this.print('You see ' + a + ' — another visitor in the district.', 'out');
      return;
    }
    this.print("You don't see that here.", 'err');
  };

  Engine.prototype.findItem = function (q, includeInv) {
    q = (q || '').toLowerCase();
    var pool = (this.roomItems[this.char.room] || []).slice();
    if (includeInv) pool = pool.concat(this.char.inv || []);
    for (var i = 0; i < pool.length; i++) {
      var id = pool[i];
      var it = ITEMS[id];
      if (!it) continue;
      if (id === q || it.name.toLowerCase().indexOf(q) >= 0) return id;
    }
    return null;
  };

  Engine.prototype.getItem = function (arg) {
    if (!arg) { this.print('Get what?', 'err'); return; }
    // get <item> from <container>
    var fm = arg.match(/^(.+?)\s+from\s+(.+)$/i);
    if (fm) {
      var gItem = fm[1].trim(), gCont = fm[2].trim();
      var cid = null;
      var inv = this.char.inv || [];
      for (var i = 0; i < inv.length; i++) {
        var it = ITEMS[inv[i]];
        if (inv[i] === gCont.toLowerCase() || (it && it.name.toLowerCase().indexOf(gCont.toLowerCase()) >= 0)) {
          if (it && it.container) { cid = inv[i]; break; }
        }
      }
      if (!cid) {
        var cg = this.findItem(gCont, false);
        if (cg && ITEMS[cg] && ITEMS[cg].container) cid = cg;
      }
      if (!cid || !ITEMS[cid]) { this.print("You don't have that container.", 'err'); return; }
      var holds = ITEMS[cid].holds || [];
      var found = null;
      for (var j = 0; j < holds.length; j++) {
        var hit = ITEMS[holds[j]];
        if (holds[j] === gItem.toLowerCase() || (hit && hit.name.toLowerCase().indexOf(gItem.toLowerCase()) >= 0)) {
          found = holds[j]; break;
        }
      }
      if (!found) { this.print("You don't see that in there.", 'err'); return; }
      ITEMS[cid].holds = holds.filter(function (x) { return x !== found; });
      this.char.inv.push(found);
      saveChar(this.char);
      this.print('You get ' + ((ITEMS[found] && ITEMS[found].name) || found) + ' from ' + (ITEMS[cid].name || cid) + '.', 'sys');
      return;
    }
    var id = this.findItem(arg, false);
    if (!id) { this.print("You don't see that here.", 'err'); return; }
    var room = this.char.room;
    this.roomItems[room] = (this.roomItems[room] || []).filter(function (x) { return x !== id; });
    this.char.inv.push(id);
    this.char.xp = (this.char.xp || 0) + 1;
    saveChar(this.char);
    this.print('You take ' + ((ITEMS[id] && ITEMS[id].name) || id) + '.', 'sys');
  };

  Engine.prototype.dropItem = function (arg) {
    if (!arg) { this.print('Drop what?', 'err'); return; }
    var q = arg.toLowerCase();
    var inv = this.char.inv || [];
    var id = null;
    for (var i = 0; i < inv.length; i++) {
      var it = ITEMS[inv[i]];
      if (inv[i] === q || (it && it.name.toLowerCase().indexOf(q) >= 0)) { id = inv[i]; break; }
    }
    if (!id) { this.print("You aren't carrying that.", 'err'); return; }
    this.char.inv = inv.filter(function (x) { return x !== id; });
    this.roomItems[this.char.room] = this.roomItems[this.char.room] || [];
    this.roomItems[this.char.room].push(id);
    saveChar(this.char);
    this.print('You drop ' + ((ITEMS[id] && ITEMS[id].name) || id) + '.', 'sys');
  };

  Engine.prototype.npcHear = function () {
    var room = this.char.room;
    var here = NPCS.filter(function (n) { return n.room === room && !n.immortal; });
    if (!here.length) return;
    if (Math.random() > 0.55) return;
    var n = here[Math.floor(Math.random() * here.length)];
    var line = n.lines[Math.floor(Math.random() * n.lines.length)];
    this.print(n.name + ' says, "' + line + '"', 'say');
  };

  function mount(root, opts) {
    opts = opts || {};
    if (!root) return null;
    var box = root.querySelector('#dg-mud') || root;
    if (box.dataset.dgMud === '1') return box.__mudEngine || null;
    box.dataset.dgMud = '1';

    box.innerHTML =
      '<div class="dg-mud" id="dg-mud-shell">' +
      '<div class="dg-mud-head"><span class="dg-mud-title">SF Night District</span>' +
      '<span class="dg-mud-status" id="dg-mud-status">solo</span></div>' +
      '<div class="dg-mud-log" id="dg-mud-log" role="log" aria-live="polite"></div>' +
      '<div class="dg-mud-soft" id="dg-mud-soft" aria-label="Room exits"></div>' +
      '<form class="dg-mud-form" id="dg-mud-form" autocomplete="off">' +
      '<label class="sr-only" for="dg-mud-input">Command</label>' +
      '<span class="dg-mud-prompt" aria-hidden="true">&gt;</span>' +
      '<input id="dg-mud-input" class="dg-mud-input" type="text" maxlength="240" ' +
      'placeholder="type a command · say hi · look · map · help · then Enter" enterkeyhint="send" />' +
      '</form>' +
      '<p class="dg-mud-hint"><strong>Talk to live visitors:</strong> <code>say hi</code> (room) · <code>chat hi</code> (all) · <code>who</code> · status <em>LIVE</em> = others can hear you</p>' +
      '</div>';

    var log = box.querySelector('#dg-mud-log');
    var form = box.querySelector('#dg-mud-form');
    var input = box.querySelector('#dg-mud-input');
    var status = box.querySelector('#dg-mud-status');
    var hist = [];
    var histIdx = -1;

    function addLine(text, kind) {
      var d = document.createElement('div');
      d.className = 'dg-mud-line dg-mud-' + (kind || 'out');
      d.innerHTML = esc(text).replace(/\n/g, '<br>');
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
      while (log.children.length > 450) log.removeChild(log.firstChild);
    }

    var soft = box.querySelector('#dg-mud-soft');

    function runCmd(t, silent) {
      t = String(t || '').trim();
      if (!t) return;
      hist.push(t);
      if (hist.length > 80) hist.shift();
      histIdx = hist.length;
      if (!silent) addLine('> ' + t, 'cmd');
      engine.cmd(t);
      try { input.focus(); } catch (eF) {}
    }

    var engine = new Engine({
      out: addLine,
      onStatus: function (t) { if (status) status.textContent = t; },
      apiBase: opts.apiBase || '',
    });
    engine.onSoftUi = function (info) {
      if (!soft) return;
      var ex = (info && info.exits) || [];
      if (!ex.length) {
        soft.innerHTML = '';
        soft.hidden = true;
        return;
      }
      soft.hidden = false;
      // Text-only MUD (potter): exits are shown as plain text, not clickable buttons — type e.g. "north".
      soft.innerHTML = '<span class="dg-mud-soft-label">Exits:</span> ' + ex.join(', ');
    };
    box.__mudEngine = engine;
    engine.boot();

    function onSoftClick(e) {
      var b = e.target && e.target.closest && e.target.closest('[data-mud-cmd]');
      if (!b) return;
      e.preventDefault();
      runCmd(b.getAttribute('data-mud-cmd') || '');
    }
    if (soft) soft.addEventListener('click', onSoftClick);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var t = (input.value || '').trim();
      if (!t) return;
      input.value = '';
      runCmd(t);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!hist.length) return;
        histIdx = Math.max(0, histIdx - 1);
        input.value = hist[histIdx] || '';
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        histIdx = Math.min(hist.length, histIdx + 1);
        input.value = hist[histIdx] || '';
      }
    });
    try { input.focus(); } catch (e) {}
    return engine;
  }

  function selftest() {
    var lines = [];
    var eng = new Engine({
      out: function (t, k) { lines.push([k, t]); },
      onStatus: function () {},
    });
    if (typeof localStorage === 'undefined') {
      var mem = {};
      globalThis.localStorage = {
        getItem: function (k) { return mem[k] || null; },
        setItem: function (k, v) { mem[k] = String(v); },
        removeItem: function (k) { delete mem[k]; },
      };
    }
    try { localStorage.removeItem(STORE); localStorage.removeItem('dgMudChar_v1'); } catch (e) {}
    eng.boot();
    eng.cmd('TestRunner');
    eng.cmd('engineer');
    eng.cmd('skip');
    eng.cmd('look');
    eng.cmd('e');
    eng.cmd('get coin');
    eng.cmd('say hello');
    eng.cmd('pray who are you');
    eng.cmd('map');
    eng.cmd('exits');
    eng.cmd('home');
    eng.cmd('brief');
    eng.cmd('verbose');
    eng.cmd('save');
    eng.cmd('time');
    eng.cmd('desc a tired founder in a black hoodie');
    eng.cmd('help');
    eng.cmd('start');
    eng.cmd('xyzzy');
    eng.cmd('nope');
    eng.cmd('asdf');
    var exitsValid = Object.keys(ROOMS).every(function (id) {
      return Object.keys(ROOMS[id].exits || {}).every(function (dir) { return !!ROOMS[ROOMS[id].exits[dir]]; });
    });
    var contentValid = ['question_card', 'risograph_card', 'sparkling_water', 'name_tag', 'pizza_slice', 'tiny_keyboard', 'house_key', 'burner_phone', 'pitch_clicker', 'printed_tweet'].every(function (id) {
      return !!ITEMS[id];
    }) && ['mara', 'sol', 'imani', 'theo', 'tess', 'wren', 'juno', 'maru', 'bo'].every(function (id) {
      return NPCS.some(function (npc) { return npc.id === id && !!ROOMS[npc.room]; });
    }) && ['grouphouse', 'diner', 'salon', 'launch_kitchen', 'panhandle'].every(function (id) {
      return !!ROOMS[id];
    });
    var ok =
      eng.char &&
      eng.char.name === 'TestRunner' &&
      eng.char.tutorialDone === true &&
      eng.char.inv.indexOf('coin') >= 0 &&
      eng.char.room === 'plaza' &&
      eng.char.desc &&
      exitsValid &&
      contentValid &&
      lines.some(function (l) { return /Immortal|Vesper/i.test(l[1]); }) &&
      lines.some(function (l) { return /Obvious exits|Fundamentals/i.test(l[1]); }) &&
      lines.some(function (l) { return /Character saved|Brief mode/i.test(l[1]); }) &&
      lines.some(function (l) { return /Huh\?|Did you mean|Not sure about/i.test(l[1]); }) &&
      lines.some(function (l) { return /Easy:|HELP|START|LOOK/i.test(l[1]); });
    if (!ok) {
      console.error('MUD selftest FAIL', eng.char, lines.slice(-12));
      process.exitCode = 1;
      return false;
    }
    console.log(JSON.stringify({
      ok: true,
      room: eng.char.room,
      inv: eng.char.inv,
      tutorialDone: eng.char.tutorialDone,
      lines: lines.length,
    }));
    return true;
  }

  if (typeof process !== 'undefined' && process.argv && process.argv.indexOf('--selftest') >= 0) {
    selftest();
  }

  return {
    mount: mount,
    Engine: Engine,
    ROOMS: ROOMS,
    ITEMS: ITEMS,
    NPCS: NPCS,
    selftest: selftest,
  };
});

window.__dgFootVer='682';console.log('Demigod v682');
window.__dgDedupe = dedupeAll;
window.__dgScrub = scrubStaticLabels;



})();
/*removed stray formSend per hygiene*/

// OAuth pending (as led by Fable/Claude bosses): LinkedIn prefill for engineers in WIZ, Google for startups. Minimal 'pending' per pre-services. Supabase stack. See demigod-oauth-setup.md
function initOAuthPending(){/* OAuth pending — no dead button (v167 honesty) */}
if (document.readyState === 'complete' || document.readyState === 'interactive') initOAuthPending();
else document.addEventListener('DOMContentLoaded', initOAuthPending);
window.__dgInitOAuth = initOAuthPending;
/* cdn-bust-20260710-177a */
/* autopilot-cdn-bust-1783648396 */
