/*dg-foot-v572-core*/
/**
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
window.dgFootVersion = 'v572'; console.log('[demigod] foot v572-core loaded');
(function(){
var S='#startup-modal',J='#jobseeker-modal',OPEN=null,DIRTY=false;
/* Use product route (same-origin /?p=) — never raw catbox .html (text/plain MIME) */

var HOW_IT_WORKS='/?p=how';
/* Dual CTAs (competitor-proven): Underdog "I'm Hiring"/"I'm a Candidate"; Wellfound "Find your next hire"/"Find your next job"; Arc "Hire talent"/"Find jobs".
   Never use both "Hire talent" + "Find talent" — same meaning (company side). Pair = hiring vs job-seeking. */
/* ==== SECTION: COPY (runtime marketing strings) ==== */
var COPY={
heroSub:'Demigod tech ranks the fit. A human reviews every potential match. Both sides approve before an intro.',
badge:'SF STARTUP TALENT MATCHING',
heroTrustLine:'SF Bay Area · 10% on hire · Free for talent · No intro without mutual interest',
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
ledgerKicker:'',
ledgerTitle:'',
ledgerRows:[],
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
pathBlog:'Notes',
pathMethod:'Method',
pathFounders:'For founders',
pathCandidates:'For talent'
};
var STARTUP_OK='Brief received. Demigod tech + humans in the loop. potter@trydemigod.com follows up. Payments/SMS pending.';
var ENGINEER_OK='Profile saved privately. potter@trydemigod.com follows up only if fit. Payments/SMS pending.';
var WIZ_THANKS={startup:{head:'Brief received',lead:'Human review next. Both sides approve — no spam lists.',steps:['We read your brief + 90-day outcome','We propose only strong fits','Both sides say yes before intro'],done:'How it works'},engineer:{head:'Profile saved',lead:'Private until both sides approve. Free for talent.',steps:['Stored securely — never blasted','Human proposes match if fit','potter@trydemigod.com may follow up'],done:'How it works'}};
/* ==== SECTION: WIZ_CFG (stepper paths) ==== */
var WIZ_CFG={startup:{steps:[['welcome'],['contact-email'],['company-name'],['company-stage'],['role-title'],['stack-needs'],['90day-outcome'],['__submit__'],['__thanks__']],welcome:{t:"I'm hiring",b:'One role. What must they ship in 90 days?',btn:'Start brief →'},thanks:STARTUP_OK,total:7,optional:['phone','salary-range','why-this-role','role-jd','timeline','team-size']},engineer:{steps:[['welcome'],['full-name'],['seeker-email'],['linkedin-url'],['skills-stack'],['experience'],['sf-bay'],['__submit__'],['__thanks__']],welcome:{t:"I'm looking",b:'One private profile. Free.',btn:'Start profile →'},thanks:ENGINEER_OK,total:7,optional:['phone','links','resume','salary-expectation','why-startups','availability']}};
/* ==== SECTION: WIZ_Q (questions + hints) ==== */
var WIZ_Q={startup:{'contact-email':{q:'Work email?',h:'For match proposals only — never a list, never spam.'},'company-name':{q:'Company name?',h:'Context for culture and stage fit.'},'company-stage':{q:'What stage is the company?',h:'Pre-seed / Seed / Series A+ — we match only to real startup operating realities.'},'role-title':{q:'What role are you hiring for?',h:'Founding PM, first Engineer, Head of Growth — specific titles get more relevant proposals.'},'stack-needs':{q:'Key skills or outcomes needed?',h:'Top must-haves and success metrics. This is what we screen candidates against.'},
'90day-outcome':{q:'#1 outcome this hire must deliver in 90 days?',h:'Be specific and measurable — this is the anchor for every match we propose.'},'salary-range':{q:'Target comp range (cash + equity note)?',h:'Realistic range = candidates we propose will actually say yes. Critical for quality.'},'timeline':{q:'When do you need the hire?',h:'ASAP / This quarter / Exploratory — matches candidate availability.'},'team-size':{q:'Team size / reporting line?',h:'Helps us match seniority and collaboration style.'},'why-this-role':{q:'Why hire this role now?',h:'New bet, backfill, scaling team — the "why" drives who we suggest first.'},'role-jd':{q:'Job description, brief or link? (optional)',h:'PDF/Word up to 10MB. Humans read every detail you share.'},'phone':{q:'Phone (optional)',h:'SMS pending — email from potter@trydemigod.com always works.'},'__submit__':{q:'Submit your brief?',h:'A human reviews it personally. Matches only when fit is strong.'}},engineer:{'full-name':{q:'Your full name?',h:'Used only for the intro email to the right startup.'},'seeker-email':{q:'Best email?',h:'Match updates and proposals only — from potter@trydemigod.com.'},'linkedin-url':{q:'LinkedIn profile?',h:'Primary signal. Full profile URL lets a human assess real background fast.'},'skills-stack':{q:'Core skills & stack?',h:'React, Figma, GTM, product — what you actually do best.'},'experience':{q:'Key things you have shipped?',h:'2-3 concrete highlights or impact bullets. Wins > titles.'},'sf-bay':{q:'Open to SF Bay Area startups?',h:'Our focus. Remote fine if the startup is Bay Area.'},'availability':{q:'When are you available?',h:'Now / 2–4 weeks / Passive — matches role timeline.'},'salary-expectation':{q:'Comp expectation (optional)?',h:'Helps us only propose roles that will excite you.'},'why-startups':{q:'Why SF startups (optional)?',h:'Context for strong human matches.'},'links':{q:'Portfolio, GitHub, site? (optional)',h:'Links help humans see the work.'},'phone':{q:'Phone (optional)?',h:'Pending SMS. We can text when a fit appears.'},'resume':{q:'Resume (PDF/Word, optional now)',h:'Max 10MB. Private until a human proposes a specific match — add later if easier.'},'__submit__':{q:'Join the network?',h:'A human reviews your profile. Outreach only on real fits — no blasts.'}}};
/* v197 copy polish: explicit review actions, complete contact language, and plain-English outcome guidance. */
WIZ_Q.startup['90day-outcome']={q:'What must this hire accomplish in their first 90 days?',h:'Name one specific, measurable result. We use it as the anchor for every match.'};
WIZ_Q.startup['salary-range']={q:'What is the target compensation range?',h:'Include base salary and an equity note, if known. This helps us propose aligned candidates.'};
WIZ_Q.startup.__submit__={q:'Review and submit your brief',h:'Check your answers below. A human reviews every submission before proposing a match.'};
WIZ_Q.engineer['full-name']={q:'What is your full name?',h:'Used only for relevant match proposals and introductions.'};
WIZ_Q.engineer['seeker-email']={q:'What is the best email to reach you?',h:'Match proposals come from potter@trydemigod.com. No newsletters or lists.'};
WIZ_Q.engineer.phone={q:'Phone number (optional)',h:'SMS is pending. Email from potter@trydemigod.com is the active contact channel.'};
WIZ_Q.engineer.__submit__={q:'Review and submit your profile',h:'Check your answers below. Your profile stays private until you approve a specific match.'};
function q(s){return document.querySelector(s)}
function qa(s,r){return[...(r||document).querySelectorAll(s)]}

var BOARD_CDN='https://files.catbox.moe/orqkmx.json'; /* Fable v150: use latest honest published board */
var BOARD=null,BOARD_AT=0; /*dup q/qa removed - single def earlier*/
function dgIsPageShell(el){if(!el||!el.tagName)return true;var t=el.tagName.toLowerCase();if(t==='body'||t==='html'||t==='main')return true;if(el.id==='startup-modal'||el.id==='jobseeker-modal'||el.id==='dg-bar'||el.id==='dg-path-pills')return true;try{if(el.matches&&el.matches('.hero-section,.hero-container,.hero-actions,.nav_container,header,footer,.footer,nav.w-nav,.w-nav'))return true;}catch(e){}return false;}
function dgHide(el){if(!el||dgIsPageShell(el))return;try{el.style.setProperty('display','none','important');}catch(e){}}
function lbl(el,t){if(!el)return;(el.querySelector('.btn-label,.button_label')||el).textContent=t}
function rmF(f,n){if(!f)return;qa('[name="'+n+'"],#'+n,f).forEach(function(i){var w=i.closest('.w-input,.w-select,.w-radio,.w-checkbox,fieldset')||i.parentElement||i;w.remove()});qa('label',f).forEach(function(l){if(new RegExp(n.replace(/-/g,'[- ]'),'i').test(l.textContent||''))l.remove()})}function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
function ledgerHtml(rows){var R=rows||COPY.ledgerRows;return R.map(function(r){var t=Array.isArray(r)?r:[r.title,r.stageType||r[1],r.status||r.comp||r[2]];var label=r.sample?'Sample':(t[2]||'');return'<div class="dg-row"><span>'+esc(t[0])+'</span><em>'+esc(t[1])+(label?' · '+esc(label):'')+'</em></div>'}).join('')}
function candidatesHtml(list){if(!list||!list.length)return'';return list.map(function(c){var tags=(c.tags||[]).slice(0,4).map(function(t){return'<span class="dg-tag">'+esc(t)+'</span>'}).join('');var sample=c.sample?'<span class="dg-tag dg-sample">Sample</span> ':'';return'<div class="dg-cand">'+sample+'<p>'+esc(c.summary||c.blurb||'')+'</p><div class="dg-tags">'+tags+'</div></div>'}).join('')}
function renderBoard(){var blk=q('#demigod-trust-block');if(!blk||!BOARD)return;var lg=blk.querySelector('.dg-ledger');if(lg&&BOARD.roles&&BOARD.roles.length)lg.innerHTML=ledgerHtml(BOARD.roles);var cand=blk.querySelector('.dg-candidates');if(!cand){var h2=document.createElement('h2');h2.textContent='Featured candidates';var k=document.createElement('p');k.className='dg-kicker';k.textContent='Anonymized profiles — humans match, no spam.';k.id='dg-cand-kicker';cand=document.createElement('div');cand.className='dg-candidates';blk.appendChild(h2);blk.appendChild(k);blk.appendChild(cand)}if(BOARD.candidates&&BOARD.candidates.length)cand.innerHTML=candidatesHtml(BOARD.candidates);pipelineNote();addMotion()}function pipelineNote(){if(!BOARD)return;var host=q('#dg-proof-strip')||q('#dg-faq')||q('#demigod-trust-block');if(!host)return;var rc=(BOARD.roles||[]).length,cc=(BOARD.candidates||[]).length;if(!rc&&!cc)return;var txt='Right now: '+rc+' example role brief'+(rc===1?'':'s')+' and '+cc+' candidate profile'+(cc===1?'':'s')+' on the public ledger — real placements only after delivered intros.';var n=q('#dg-pipeline-note');if(!n){n=document.createElement('p');n.id='dg-pipeline-note';n.style.cssText='max-width:42rem;margin:.5rem auto 0;padding:0 1rem;color:#A8A29E;font-size:.8rem;text-align:center';host.parentNode?host.parentNode.insertBefore(n,host.nextSibling):host.appendChild(n)}n.textContent=txt}function addMotion(){qa('#demigod-trust-block .dg-step,#demigod-trust-block .dg-row,#demigod-trust-block .dg-cand,#demigod-trust-block .dg-process-grid > div,.dg-blog-card,.dg-reveal,.dg-decision-grid li,.dg-p-det,.dg-p-grid > div').forEach(function(el){try{el.classList.add('dg-reveal')}catch(e){}});if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){qa('.dg-reveal').forEach(function(el){el.classList.add('dg-reveal-in')});return}try{if(!window.__dgRevealObs){window.__dgRevealObs=new IntersectionObserver(function(ents){ents.forEach(function(e){if(e.isIntersecting){e.target.classList.add('dg-reveal-in');window.__dgRevealObs.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -8% 0px'})}qa('.dg-reveal,.dg-blog-card,.dg-decision-grid li').forEach(function(el){window.__dgRevealObs.observe(el)})}catch(e){}}

// Consolidated force helper to simplify duplicate !important code across wizBuild/showStep/show
function forceWizVisible(form, modal) {
  /* v195: shell + chrome only — never force all fields (kills one-question contract) */
  if (form) {
    form.classList.remove('w-form-loading');
    form.style.setProperty('display', 'block', 'important');
    form.style.setProperty('visibility', 'visible', 'important');
    var p = form; while (p && p !== document.body) { try { p.style.setProperty('display','block','important'); p.style.visibility='visible'; }catch(e){} p=p.parentElement; }
  }
  if (modal) {
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('visibility', 'visible', 'important');
  }
  var root = modal || form;
  if (!root) return;
  qa('.dg-wiz-head,.dg-wiz-nav,.dg-wiz-q,.dg-wiz-hint,.dg-wiz-count,.dg-wiz-bar,.dg-wiz-bar i,.dg-wiz-next,.dg-wiz-back', root).forEach(function(c){
    if (!c || !c.style) return;
    var d = c.classList && (c.classList.contains('dg-wiz-nav') || c.classList.contains('dg-wiz-next') || c.classList.contains('dg-wiz-back')) ? 'flex' : 'block';
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
function faqBlock(){/* v210: homepage FAQ removed for clarity */ var el=q('#dg-faq'); if(el)el.remove(); var ld=q('#dg-faq-jsonld'); if(ld)ld.remove(); }
function offerAbandon(prevId){try{if(!DIRTY)return;var n=0;try{var s=JSON.parse(localStorage.getItem('dgWizSave_startup')||localStorage.getItem('dgWizSave_engineer')||'null');if(s&&s.answers)n=Object.keys(s.answers).length}catch(e){}if(n<2)return;var m=q(prevId);if(!m)return;if(m.querySelector('#dg-abandon'))return;var box=document.createElement('div');box.id='dg-abandon';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Follow-up email');box.style.cssText='position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);padding:1rem';box.innerHTML='<div style="background:#141414;border:1px solid rgba(201,168,76,.35);border-radius:12px;max-width:22rem;padding:1.1rem 1.2rem;color:#F5F0E6"><p style="margin:0 0 .75rem;line-height:1.4">Want a human follow-up? Drop your email — no spam.</p><input id="dg-abandon-email" class="w-input" type="email" autocomplete="email" placeholder="you@email.com" aria-label="Your email" style="width:100%;margin:0 0 .6rem;font-size:16px;min-height:44px"><div style="display:flex;gap:.5rem;flex-wrap:wrap"><button type="button" id="dg-abandon-send" style="flex:1;min-height:44px;background:#C9A84C;color:#0A0A0A;border:0;border-radius:8px;font-weight:600;cursor:pointer">Email potter@</button><button type="button" id="dg-abandon-skip" style="flex:1;min-height:44px;background:transparent;color:#A8A29E;border:1px solid #333;border-radius:8px;cursor:pointer">Close</button></div></div>';document.body.appendChild(box);var close=function(){document.removeEventListener('keydown',onEsc,true);box.remove();DIRTY=false};var onEsc=function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}};document.addEventListener('keydown',onEsc,true);box.querySelector('#dg-abandon-skip').onclick=close;box.querySelector('#dg-abandon-send').onclick=function(){var em=(box.querySelector('#dg-abandon-email').value||'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){box.querySelector('#dg-abandon-email').style.borderColor='#F4D03F';return}window.location.href='mailto:potter@trydemigod.com?subject=Follow-up request&body='+encodeURIComponent('Please follow up with me.\nEmail: '+em);close()};box.addEventListener('click',function(e){if(e.target===box)close()});try{var inp=box.querySelector('#dg-abandon-email');if(inp)inp.focus()}catch(_){}}catch(e){}}
function proofStrip(){/* v210: proof essay removed */ var el=q('#dg-proof-strip'); if(el)el.remove(); }
function contactStrip(){/* v210: no hero essay — CTAs only */ var el=q('#dg-contact-strip'); if(el)el.remove(); }
function faqCss(){if(q('#dg-faq-css'))return;var s=document.createElement('style');s.id='dg-faq-css';s.textContent='#dg-faq details{border-bottom:1px solid rgba(201,168,76,.15);padding:.55rem 0}#dg-faq summary{cursor:pointer;font-weight:600;color:#F5F0E6;list-style:none;min-height:44px;display:flex;align-items:center}#dg-faq summary::-webkit-details-marker{display:none}#dg-faq summary:before{content:"\\25B8 ";color:#C9A84C}#dg-faq details[open] summary:before{content:"\\25BE "}#dg-proof-strip a:focus,#dg-contact-strip a:focus,.dg-wiz-next:focus,.dg-wiz-back:focus{outline:2px solid #C9A84C;outline-offset:2px}@media(prefers-reduced-motion:reduce){#startup-modal *,#jobseeker-modal *,#dg-faq *{transition:none!important;animation:none!important}}';document.head.appendChild(s)}
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
  try { window.__dgWizStore = localStorage.getItem('dgWizStoreConsent') === '1'; } catch(e) { window.__dgWizStore = false; }
  var resumeStep=0; try { var saved = window.__dgWizStore===true ? JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') : null; if (saved && saved.answers){ if (saved.t && (Date.now()-saved.t)>7*24*3600*1000){ try{localStorage.removeItem(SAVE_KEY)}catch(e){} saved=null; } else { answers = saved.answers; if (typeof saved.step==='number') resumeStep=saved.step; } } } catch(e){}
  var head = document.createElement('div');
  head.className = 'dg-wiz-head';
  var __dgWizTotal = steps.filter(function(s){return (s[0]||'')!=='__thanks__' && (s[0]||'')!=='__submit__';}).length || Math.max(1, steps.length-2);
  var progressLabel = kind === 'startup' ? 'Hiring brief progress' : kind === 'engineer' ? 'Talent profile progress' : 'Partner application progress';
  // v514: one text node "N of T" so crawlers don't glue Progress1/of7 across spans
  head.innerHTML = '<div class="dg-wiz-count" aria-live="polite"><span class="dg-wiz-progress-label">Progress </span><span class="dg-wiz-fraction"><span class="dg-cur">1 of ' + __dgWizTotal + '</span></span></div><div class="dg-wiz-bar" role="progressbar" aria-label="' + progressLabel + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i style="width:0%"></i></div><div class="dg-wiz-q"></div><div class="dg-wiz-hint"></div><label class="dg-wiz-save"><input type="checkbox" class="dg-wiz-save-opt"' + (window.__dgWizStore===true?' checked':'') + '> Save this draft on this device for 7 days</label><div class="dg-wiz-live" aria-live="polite" aria-atomic="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)"></div>';
  var qEl = head.querySelector('.dg-wiz-q');
  var hEl = head.querySelector('.dg-wiz-hint');
  var progress = head.querySelector('.dg-wiz-bar');
  var bar = head.querySelector('.dg-wiz-bar i');
  var curEl = head.querySelector('.dg-cur');
  var saveOpt = head.querySelector('.dg-wiz-save-opt');
  if(saveOpt) saveOpt.addEventListener('change',function(){
    window.__dgWizStore=saveOpt.checked===true;
    try { if(window.__dgWizStore){localStorage.setItem('dgWizStoreConsent','1')}else{localStorage.removeItem('dgWizStoreConsent');localStorage.removeItem(SAVE_KEY)} } catch(e){}
    if(window.__dgWizStore) collect();
  });
  // map fields - prefer the visual container (.form-field-group or .dg-field-wrap)
  var fieldMap = {};
  qa('.dg-field-wrap, .w-input, .w-select, .w-file-upload, label, input, select, textarea, [name], [id]', form).forEach(function(el) {
    var n = (el.name || el.id || (el.getAttribute && el.getAttribute('name')) || '').toLowerCase().replace(/[^a-z0-9-]/g,'');
    var container = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.closest('label') || el.parentElement || el;
    if (n && !fieldMap[n]) fieldMap[n] = container;
    if (el.name) fieldMap[el.name] = fieldMap[el.name] || container;
    if (el.id) fieldMap[el.id] = fieldMap[el.id] || container;
  });
  // ensure 90day and key fields are mapped even if injection timing
  ['90day-outcome', 'contact-email', 'company-name', 'role-title', 'stack-needs'].forEach(function(k){
    if (!fieldMap[k]) {
      var el = form.querySelector('[name="' + k + '"], [id="' + k + '"]');
      if (el) {
        var c = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.parentElement || el;
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
  nav.innerHTML = '<button type="button" class="dg-wiz-back">Back</button><button type="button" class="dg-wiz-next">Next</button>';
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
  qa('.dg-wiz-next, .dg-wiz-back', nav).forEach(function(b){ b.style.setProperty('display','inline-block','important'); b.style.cursor='pointer'; });
  var nativeSub = form.querySelector('[type="submit"], .w-button');
  if (nativeSub) nativeSub.style.display = 'none';
  if (typeof forceWizVisible === 'function') forceWizVisible(form, form.closest && form.closest('#startup-modal,#jobseeker-modal'));

  // broad force children to ensure inputs show (from final user tests)
  qa('input,select,textarea,label,.w-input,.w-select,.form-field-group,.dg-field-wrap', form).forEach(function(c){ c.style.setProperty('display','block','important'); c.style.setProperty('visibility','visible','important'); });
  function collect() {
    qa('input,select,textarea', form).forEach(function(i) {
      var nm = i.name || i.id || '';
      if (!nm) return;
      if (i.type === 'file') {
        if (i.files && i.files[0]) answers[nm] = i.files[0].name;
        else delete answers[nm];
      } else if (i.type === 'checkbox' || i.type === 'radio') {
        if (i.checked) answers[nm] = i.value || 'yes';
        else if (i.type === 'checkbox') delete answers[nm];
      } else if (i.value && i.value.trim()) answers[nm] = i.value.trim();
      else delete answers[nm];
    });
    try { if(window.__dgWizStore!==true) return; localStorage.setItem(SAVE_KEY, JSON.stringify({answers: answers, step: current, t: Date.now()})); } catch(e){}
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
    try { var live=form.querySelector('.dg-wiz-live'); if(live){ var qq=form.querySelector('.dg-wiz-q'); live.textContent=(qq&&qq.textContent)?('Step '+(current+1)+': '+qq.textContent):('Step '+(current+1)); } } catch(e){}
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
    var __tot = steps.filter(function(s){return (s[0]||'')!=='__thanks__' && (s[0]||'')!=='__submit__';}).length || Math.max(1, steps.length-2);
    curEl.textContent = String(Math.min(current + 1, __tot)) + ' of ' + __tot;
    try{ var totEl=curEl.parentElement; if(totEl&&!totEl.getAttribute('data-dg-prog')){ totEl.setAttribute('data-dg-prog','1'); totEl.setAttribute('aria-live','polite'); } }catch(e){}
    // re-map fields every showStep in case of late injection or Webflow DOM changes
    var fieldMap = {};
    qa('.dg-field-wrap, .w-input, .w-select, .w-file-upload, label, input, select, textarea, [name], [id]', form).forEach(function(el) {
      var n = (el.name || el.id || (el.getAttribute && el.getAttribute('name')) || '').toLowerCase().replace(/[^a-z0-9-]/g,'');
      var container = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.closest('label') || el.parentElement || el;
      if (n && !fieldMap[n]) fieldMap[n] = container;
      if (el.name) fieldMap[el.name] = fieldMap[el.name] || container;
      if (el.id) fieldMap[el.id] = fieldMap[el.id] || container;
    });
    ['90day-outcome', 'contact-email', 'company-name', 'role-title', 'stack-needs', 'full-name'].forEach(function(k){
      if (!fieldMap[k]) {
        var el = form.querySelector('[name="' + k + '"], [id="' + k + '"]');
        if (el) fieldMap[k] = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.parentElement || el;
      }
    });
    // ULTRA ROBUST: aggressively hide EVERY possible Webflow/field wrapper except current step's
    try {
      qa('input,select,textarea,label,.w-input,.w-select,.w-file-upload,.form-field-group,.dg-field-wrap,fieldset,.w-checkbox,.w-radio', form).forEach(function(el){
        if (el.closest('.dg-wiz-head') || el.closest('.dg-wiz-nav') || el.closest('.dg-wiz-review')) return;
        var c = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.closest('label') || el.closest('fieldset') || el.parentElement || el;
        if (c && c !== form && !c.classList.contains('dg-wiz-head') && !c.classList.contains('dg-wiz-nav')) c.style.setProperty('display','none','important');
      });
    } catch(e){}
    // show current key's containers + any matching the step key
    var toShow = [];
    if (key && fieldMap[key]) toShow.push(fieldMap[key]);
    qa('.dg-field-wrap, .form-field-group, label, input, select, textarea', form).forEach(function(el){
      var n = (el.name || el.id || (el.textContent||'').toLowerCase()).replace(/[^a-z0-9-]/g,'');
      if (key && n.indexOf(key) > -1) toShow.push(el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el);
    });
    toShow.forEach(function(c){
      if (c && c.style) { c.style.setProperty('display', 'block', 'important'); c.classList.add('dg-wiz-show'); }
      var i = c && c.querySelector ? c.querySelector('input,select,textarea') : c;
      if (i && i.style) i.style.setProperty('display', 'block', 'important');
    });
    // explicit force for contact-email and critical to fix reported vis=0
    ['contact-email', 'full-name', key].forEach(function(ck){
      if (!ck) return;
      var el = form.querySelector('[name="' + ck + '"], [id="' + ck + '"]');
      if (el) {
        el.style.setProperty('display', 'block', 'important');
        var cc = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.parentElement;
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
        var cc = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.parentElement;
        if (cc) { cc.style.removeProperty('display'); cc.style.setProperty('display','block','important'); cc.style.visibility='visible'; cc.classList.add('dg-wiz-show'); }
        var lab = el.previousElementSibling; if (lab && lab.tagName === 'LABEL') { lab.style.display='block'; lab.style.visibility='visible'; }
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
    backBtn.style.display = (current > 0 && key !== 'welcome') ? '' : 'none';
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
      nextBtn.textContent = (kind === 'startup' ? 'Submit brief' : (kind === 'engineer' ? 'Submit profile' : 'Submit'));
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
        var extra = (k === '90day-outcome') ? ' style="font-weight:600;border-left:3px solid #C9A84C;padding-left:.5rem"' : '';
        html += '<div' + extra + '><span>' + esc(lab) + '</span><em>' + esc(answers[k]) + '</em></div>';
      });
      rev.innerHTML = html || '<div>No answers captured — use Back to fill in your brief.</div>';
    } else if (key === '__thanks__') {
      try { localStorage.removeItem(SAVE_KEY); } catch(e){} DIRTY=false;
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
          var cc = el.closest('.form-field-group') || el.closest('.dg-field-wrap') || el.parentElement;
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
function fetchBoard(){if(!BOARD_CDN)return;if(BOARD&&Date.now()-BOARD_AT<60000){renderBoard();return}var bucket=Math.floor(Date.now()/60000);fetch(BOARD_CDN+'?v='+bucket).then(function(r){return r.json()}).then(function(d){BOARD=d;BOARD_AT=Date.now();try{if(!BOARD.realRoles){(BOARD.roles||[]).forEach(function(r){if(r&&r.sample!==false)r.sample=true});(BOARD.candidates||[]).forEach(function(c){if(c&&c.sample!==false)c.sample=true})}else{(BOARD.roles||[]).forEach(function(r){if(r&&r.sample==null)r.sample=false});}}catch(e){}renderBoard();try{qa('.role-card').forEach(function(c){if(c.querySelector('.dg-sample-tag'))return;var tag=document.createElement('span');tag.className='dg-sample-tag';tag.textContent='Sample';tag.style.cssText='display:inline-block;font-size:.68rem;font-weight:600;color:#A8A29E;border:1px solid rgba(201,168,76,.35);border-radius:4px;padding:1px 6px;margin:0 0 .35rem;letter-spacing:.06em;text-transform:uppercase';var title=c.querySelector('h3,.role-title-text');if(title)c.insertBefore(tag,title);else c.prepend(tag)})}catch(e){}}).catch(function(){})}
function submitTrust(f,msg){if(!f||f.querySelector('#dg-submit-trust'))return;var p=document.createElement('p');p.id='dg-submit-trust';p.style.cssText='color:#9ca3af;font-size:.8rem;margin:.5rem 0 .25rem;line-height:1.4';p.textContent=msg||'Reviewed with humans in the loop. No spam lists.';var b=f.querySelector('[type=submit],.w-button');b?.parentElement?.insertBefore(p,b)}
function charCount(el,max){if(!el||el.dataset.dgCc)return;var wrap=el.closest('.dg-field-wrap,.w-input')||el.parentElement;var c=document.createElement('span');c.className='dg-char-count';c.style.cssText='display:block;color:#6b7280;font-size:.72rem;margin:.2rem 0 .35rem;text-align:right';var upd=function(){var n=(el.value||'').length;c.textContent=n+' / '+max};el.dataset.dgCc='1';el.addEventListener('input',upd);upd();if(wrap)wrap.appendChild(c);else el.insertAdjacentElement('afterend',c)}
function successCta(){qa(S+' .w-form-done,'+J+' .w-form-done').forEach(function(done){if(done.querySelector('.dg-sample-match'))return;if(done.offsetParent===null&&getComputedStyle(done).display==='none')return;var a=document.createElement('button');a.type='button';a.className='dg-sample-match w-button';a.textContent='View sample matches';/* PREP for Twilio jack&jill post-form collection (before real SMS): optional follow-up questions shown in thanks */if(!done.querySelector('.dg-followup')){var fu=document.createElement('div');fu.className='dg-followup';fu.style.cssText='margin-top:1rem;padding:0.75rem;border:1px solid rgba(201,168,76,.2);border-radius:8px;font-size:0.85rem';fu.innerHTML='<strong>'+COPY.followUpTitle+'</strong><p style="margin:0.25rem 0 0.5rem;color:#A8A29E">'+COPY.followUpHint+'</p><div style="display:flex;flex-direction:column;gap:0.4rem"><input class="w-input dg-fu-salary" placeholder="'+COPY.followUpSalary+'" aria-label="'+COPY.followUpSalary+'" style="font-size:0.8rem"><input class="w-input dg-fu-start" placeholder="'+COPY.followUpStart+'" aria-label="'+COPY.followUpStart+'" style="font-size:0.8rem"><textarea class="w-input dg-fu-why" placeholder="'+COPY.followUpWhy+'" aria-label="'+COPY.followUpWhy+'" rows="2" style="font-size:0.8rem"></textarea></div><button type="button" style="margin-top:0.5rem;font-size:0.75rem;background:transparent;border:1px solid rgba(201,168,76,.3);color:#C9A84C;padding:0.25rem 0.5rem;border-radius:4px">Email these details</button>';fu.querySelector('button').addEventListener('click',function(){var sv=(fu.querySelector('.dg-fu-salary').value||'').trim(),st=(fu.querySelector('.dg-fu-start').value||'').trim(),wy=(fu.querySelector('.dg-fu-why').value||'').trim();if(!sv&&!st&&!wy){fu.querySelector('button').textContent='Add a detail above first';return}var body='Salary range: '+sv+'\nStart date: '+st+'\nDealbreakers: '+wy;window.location.href='mailto:potter@trydemigod.com?subject=Follow-up details&body='+encodeURIComponent(body);fu.style.opacity='0.6';fu.querySelector('button').textContent='Opened in your email app — send to reach us'});done.appendChild(fu)};a.style.cssText='margin-top:.75rem;background:transparent!important;color:#c9a84c!important;border:1px solid rgba(201,168,76,.45)!important';a.addEventListener('click',function(){var blk=q('#demigod-trust-block');if(blk)blk.scrollIntoView({behavior:'smooth',block:'start'});else window.scrollTo(0,document.body.scrollHeight*.55)});done.appendChild(a);var kind=done.closest(J)?'engineer':'startup';var t=WIZ_THANKS[kind];if(t&&!done.querySelector('.dg-thanks')){done.insertAdjacentHTML('afterbegin','<div class="dg-thanks"><h3>'+t.head+'</h3><p>'+t.lead+'</p>'+t.steps.map(function(s){return'<p class="dg-thanks-step">• '+s+'</p>'}).join('')+'</div>')}})}
function ph(i,t){if(i&&'placeholder'in i)i.placeholder=t}
function formEl(sel){var el=typeof sel==='string'?q(sel):sel;if(!el)return null;return el.tagName==='FORM'?el:(el.querySelector&&el.querySelector('form'))||null}
/* === FORMS / NATIVE WEBFLOW — id + labels + optional fields; WIZ wraps after === */
/* ==== SECTION: forms (Webflow form repair + required fields + submit trust) ==== */
function forms(){var stWrap=q('#startup-hire.w-form')||q(S+' .w-form');var st=formEl('#startup-hire')||formEl('#startup-form')||formEl(S+' form')||formEl(stWrap);if(st&&!st.dataset.dgStartup){st.dataset.dgStartup='1';if(stWrap&&stWrap!==st&&stWrap.id==='startup-hire')stWrap.removeAttribute('id');st.classList.add('w-form');st.classList.remove('w-form-loading');st.id='startup-hire';st.name='startup-hire';st.setAttribute('data-name','startup-hire');st.removeAttribute('aria-label');st.removeAttribute('action');st.setAttribute('method','post');rmF(st,'Source');rmF(st,'hiring-model');qa('label,span,p',st).forEach(function(el){if(/Hiring Model|Commission-only|Subscription/i.test(el.textContent||''))(el.closest('.w-radio,fieldset,.w-form-label,div')||el).remove();if(/Stack Needs|Tech stack/i.test(el.textContent||''))el.textContent='Skills / requirements *';if(/Role Title|Job Title/i.test(el.textContent||''))el.textContent='Role title *';if(/Company stage/i.test(el.textContent||''))el.textContent='Company stage *'});ph(st.querySelector('[name=contact-email]'),'you@company.com');ph(st.querySelector('[name=role-title]'),'e.g. Founding PM, Head of Growth, Designer');ph(st.querySelector('[name=stack-needs]'),'e.g. B2B SaaS, GTM, design systems, React');['contact-email','role-title','stack-needs'].forEach(function(n){var i=st.querySelector('[name='+n+']');if(i){i.required=true; if(n==='contact-email')i.setAttribute('autocomplete','email'); var l=i.closest('label')||i.previousElementSibling; if(l&&l.tagName==='LABEL') l.setAttribute('for',n); else if(!l){var nl=document.createElement('label');nl.className='w-form-label';nl.setAttribute('for',n);nl.textContent=(n==='contact-email'?'Best email?':n==='role-title'?'Role title?':'Key skills?'); i.parentNode.insertBefore(nl,i); } } });var cs=st.querySelector('[name=company-stage]');if(cs){cs.required=true} // remove Webflow static title
qa('h3,.w-form-title,[class*=title]',st).forEach(function(h){if(/STARTUP HIRING FORM|HIRING FORM/i.test(h.textContent||'')){h.style.display='none';h.textContent='';}});
// ensure company-name field exists for its WIZ step (some Webflow forms may not have it)
/* company-name */ if(!st.querySelector('[name=company-name]')){var cn=document.createElement('div');cn.className='dg-field-wrap';cn.innerHTML='<label class="w-form-label" for="company-name">Company name?</label><input class="w-input" type="text" id="company-name" name="company-name" autocomplete="organization" required placeholder="Acme Inc">';var ce=st.querySelector('[name=contact-email]');(ce&&ce.parentElement||st).appendChild(cn);}
// inject timeline and team-size (per Fable perfect fields)
if(!st.querySelector('[name=timeline]')){var tw=document.createElement('div');tw.className='dg-field-wrap';tw.innerHTML='<label class="w-form-label" for="timeline">Timeline?</label><select class="w-select" id="timeline" name="timeline"><option value="">Select</option><option value="asap">ASAP (2-4 wks)</option><option value="quarter">This quarter</option><option value="exploratory">Exploratory</option></select>';var sk=st.querySelector('[name=stack-needs]');(sk&&sk.parentElement||st).appendChild(tw);}
if(!st.querySelector('[name=team-size]')){var tm=document.createElement('div');tm.className='dg-field-wrap';tm.innerHTML='<label class="w-form-label" for="team-size">Team size / reports to?</label><input class="w-input" type="text" id="team-size" name="team-size" placeholder="e.g. 5-person eng team, reports to CTO">';(st.querySelector('[name=stack-needs]')||st).parentElement.appendChild(tm);}var sk=st.querySelector('[name=stack-needs]'),sa=sk&&(sk.closest('.w-input')||sk.parentElement);if(!st.querySelector('[name=company-stage]')){var ce=st.querySelector('[name=contact-email]'),cew=ce&&(ce.closest('.w-input')||ce.parentElement);var sw=document.createElement('div');sw.className='dg-field-wrap';sw.innerHTML='<label class="w-form-label" for="company-stage">Company stage *</label><select class="w-select" id="company-stage" name="company-stage" required><option value="">Select stage</option><option value="pre-seed">Pre-seed</option><option value="seed">Seed</option><option value="series-a">Series A</option><option value="series-b">Series B+</option></select>';if(cew&&cew.parentElement)cew.parentElement.insertBefore(sw,cew.nextSibling);else{var rt=st.querySelector('[name=role-title]'),rw=rt&&(rt.closest('.w-input')||rt.parentElement);if(rw&&rw.parentElement)rw.parentElement.insertBefore(sw,rw)}} 
// inject 90day-outcome creative field for high-signal matching data (Fable recommended)
if(!st.querySelector('[name="90day-outcome"]')){var od=document.createElement('div');od.className='dg-field-wrap';od.innerHTML='<label class="w-form-label" for="90day-outcome">#1 outcome this hire must deliver in first 90 days? *</label><textarea class="w-input" id="90day-outcome" name="90day-outcome" rows="2" required placeholder="e.g. Ship v1 checkout; 2 paying pilot customers this quarter"></textarea>';(sk&&sk.parentElement||st).appendChild(od);}if(!st.querySelector('[name=salary-range]')){var w=document.createElement('div');w.id='dg-salary-wrap';w.className='dg-field-wrap';w.innerHTML='<label class="w-form-label" for="salary-range">Comp range (optional)</label><input class="w-input" type="text" id="salary-range" name="salary-range" placeholder="e.g. $180-220k + equity">';if(sa&&sa.parentElement)sa.parentElement.insertBefore(w,sa.nextSibling);else st.querySelector('[type=submit],.w-button')?.parentElement?.insertBefore(w,st.querySelector('[type=submit],.w-button'))}else{ph(st.querySelector('[name=salary-range]'),'e.g. $180-220k + equity');qa('label',st).forEach(function(l){if(/salary|comp range/i.test(l.textContent||''))l.textContent='Comp range (optional)'})}if(!st.querySelector('[name=why-this-role]')){var ww=document.createElement('div');ww.id='dg-why-wrap';ww.className='dg-field-wrap';ww.innerHTML='<label class="w-form-label" for="why-this-role">Why this role (optional)</label><textarea class="w-input" id="why-this-role" name="why-this-role" rows="2" placeholder="e.g. First PM hire; need someone who has shipped 0→1"></textarea>';var sal=st.querySelector('[name=salary-range]'),salw=sal&&(sal.closest('.dg-field-wrap,.w-input')||sal.parentElement);if(salw&&salw.parentElement)salw.parentElement.insertBefore(ww,salw.nextSibling);else if(sa&&sa.parentElement)sa.parentElement.insertBefore(ww,sa.nextSibling)}if(!st.querySelector('[name=role-jd]')){var jw=document.createElement('div');jw.id='dg-jd-wrap';jw.className='dg-field-wrap w-file-upload';jw.innerHTML='<label class="w-form-label" for="role-jd">Job description (optional)</label><input class="w-file-upload-input w-input" type="file" id="role-jd" name="role-jd" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><p class="dg-resume-hint">PDF or Word · max 10MB</p>';var why=st.querySelector('[name=why-this-role]'),whyw=why&&(why.closest('.dg-field-wrap,.w-input')||why.parentElement);if(whyw&&whyw.parentElement)whyw.parentElement.insertBefore(jw,whyw.nextSibling);else if(sa&&sa.parentElement)sa.parentElement.insertBefore(jw,sa.nextSibling)}st.setAttribute('enctype','multipart/form-data');if(!st.querySelector('#dg-fee-note')){var n=document.createElement('p');n.id='dg-fee-note';n.style.cssText='color:#9ca3af;font-size:.85rem;margin:.5rem 0 1rem';n.textContent=COPY.feeNote;var b=st.querySelector('[type=submit],.w-button');b?.parentElement?.insertBefore(n,b)}submitTrust(st,'Matched with Demigod tech; humans in the loop. potter@trydemigod.com follows up.');charCount(st.querySelector('[name=stack-needs]'),500);charCount(st.querySelector('[name=why-this-role]'),300);var sb=st.querySelector('[type=submit],.w-button');if(sb){sb.value='Send brief';sb.textContent='Send brief'; sb.removeAttribute('disabled'); sb.disabled=false;}wizBuild(st,'startup');}var en=formEl('#engineer-join')||formEl('#jobseeker-form')||formEl(J+' form')||formEl(J+' .w-form');if(en&&!en.dataset.dgEngineer){en.dataset.dgEngineer='1';en.classList.add('w-form');en.id='engineer-join';en.name='engineer-join';en.setAttribute('data-name','engineer-join');en.removeAttribute('aria-label');en.removeAttribute('action');en.removeAttribute('action');en.setAttribute('method','post');if(!en.dataset.dgMailStrip){en.dataset.dgMailStrip='1';en.addEventListener('submit',function(ev){/* keep native Webflow if wired; never open mail client */if(/^mailto:/i.test(en.getAttribute('action')||'')){ev.preventDefault();en.removeAttribute('action');}},true);}rmF(en,'github-url');rmF(en,'portfolio-url');rmF(en,'is-engineer');var ghWrap=en.querySelector('#dg-github-wrap');if(ghWrap)ghWrap.remove();var engChk=en.querySelector('#dg-engineer-check');if(engChk)engChk.remove();qa('label',en).forEach(function(l){if(/Years Experience|Background & highlights|What you have shipped/i.test(l.textContent||''))l.textContent='What you shipped *';if(/Skillss*&s*(Stack|experience)/i.test(l.textContent||''))l.textContent='Skills & stack *';if(/^LinkedIn/i.test((l.textContent||'').trim()))l.textContent='LinkedIn URL *'});ph(en.querySelector('[name=full-name]'),'Your full name');ph(en.querySelector('[name=seeker-email]'),'you@email.com');['full-name','seeker-email'].forEach(function(n){var i=en.querySelector('[name='+n+']');if(i){i.required=true;i.setAttribute('autocomplete',n==='full-name'?'name':'email')}});var liIn=en.querySelector('[name=linkedin-url]');if(liIn){liIn.type='url';liIn.required=true;liIn.setAttribute('autocomplete','url');ph(liIn,'https://linkedin.com/in/you')}en.setAttribute('enctype','multipart/form-data');en.setAttribute('method','post');var resIn=en.querySelector('[name=resume],[name=Resume]');if(!resIn){var rw=document.createElement('div');rw.id='dg-resume-wrap';rw.className='dg-field-wrap w-file-upload';rw.innerHTML='<label class="w-form-label" for="resume">Resume (optional now)</label><input class="w-input" type="file" id="resume" name="resume" style="display:block!important;width:100%!important;color:#A8A29E;padding:.45rem 0" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><p class="dg-resume-hint">PDF or Word · max 10MB</p>';var insBefore=en.querySelector('[name=skills-stack]');var insW=insBefore&&(insBefore.closest('.w-input')||insBefore.parentElement);if(insW&&insW.parentElement)insW.parentElement.insertBefore(rw,insW);else{var subR=en.querySelector('[type=submit],.w-button');subR?.parentElement?.insertBefore(rw,subR)}resIn=rw.querySelector('[name=resume]')}else{var resW=resIn.closest('.dg-field-wrap,.w-file-upload,.w-input')||resIn.parentElement;if(resW&&!resW.id)resW.id='dg-resume-wrap';resIn.classList.remove('w-file-upload-input');resIn.classList.add('w-input');resIn.style.cssText='display:block!important;width:100%!important;color:#A8A29E;padding:.45rem 0';/*resume opt per WIZ*/;if(!resIn.id)resIn.id='resume';if(!resIn.name)resIn.name='resume';if(!resIn.accept)resIn.setAttribute('accept','.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document')}qa('label',en).forEach(function(l){if(/resume|résumé|cv/i.test((l.textContent||'').trim())&&!l.querySelector('[type=file]'))l.textContent='Resume (optional now)'});if(resIn&&!en.dataset.dgResumeVal){en.dataset.dgResumeVal='1';resIn.addEventListener('change',function(){var f=resIn.files&&resIn.files[0];if(f&&f.size>10485760)resIn.setCustomValidity('Max file size 10MB');else resIn.setCustomValidity('')})}ph(en.querySelector('[name=skills-stack]'),'e.g. Product strategy, Figma, growth marketing');var skIn=en.querySelector('[name=skills-stack]');if(skIn)skIn.required=true;charCount(en.querySelector('[name=skills-stack]'),400);charCount(en.querySelector('[name=experience]'),600);var ex=en.querySelector('[name=experience]');if(ex&&ex.tagName==='SELECT'){var ta=document.createElement('textarea');ta.className='w-input';ta.name='experience';ta.id='experience';ta.rows=3;ta.placeholder='e.g. Shipped v1 at seed startup; led growth from 0→$1M ARR';ta.required=true;(ex.closest('.w-select')||ex).replaceWith(ta)}else if(ex){ex.required=true;ph(ex,'e.g. Shipped v1 at seed startup; led growth from 0→$1M ARR')}if(!en.querySelector('[name=links]')){var liWrap=liIn&&(liIn.closest('.w-input')||liIn.parentElement);var lw=document.createElement('div');lw.id='dg-links-wrap';lw.className='dg-field-wrap';lw.innerHTML='<label class="w-form-label" for="links">Links (optional)</label><input class="w-input" type="text" id="links" name="links" placeholder="GitHub, portfolio, or other links">';if(liWrap&&liWrap.parentElement)liWrap.parentElement.insertBefore(lw,liWrap.nextSibling);else{var sub=en.querySelector('[type=submit],.w-button');sub?.parentElement?.insertBefore(lw,sub)}}var sf=en.querySelector('[name=sf-bay]');if(sf){sf.required=true;var sl=sf.closest('label')||sf.parentElement;if(sl){var sp=sl.querySelector('.w-form-label,span');if(sp)sp.textContent='Based in SF Bay Area *'}}if(!en.querySelector('[name=sf-bay]')){var c=document.createElement('label');c.className='w-checkbox';c.innerHTML='<input type="checkbox" name="sf-bay" value="yes" required><span class="w-form-label">Based in SF Bay Area *</span>';var b2=en.querySelector('[type=submit],.w-button');b2?.parentElement?.insertBefore(c,b2)}
// inject availability, salary-expect, why-startups for perfect matching
if(!en.querySelector('[name=availability]')){var av=document.createElement('div');av.className='dg-field-wrap';av.innerHTML='<label class="w-form-label" for="availability">Availability?</label><select class="w-select" id="availability" name="availability"><option value="">Select</option><option value="now">Now</option><option value="2-4w">2-4 weeks</option><option value="passive">Passive / open</option></select>';(en.querySelector('[name=sf-bay]')||en).parentElement.appendChild(av);}
if(!en.querySelector('[name=salary-expectation]')){var se=document.createElement('div');se.className='dg-field-wrap';se.innerHTML='<label class="w-form-label" for="salary-expectation">Comp expectation (optional)</label><input class="w-input" type="text" id="salary-expectation" name="salary-expectation" placeholder="e.g. 180-220k + equity">';en.appendChild(se);}
if(!en.querySelector('[name=why-startups]')){var ws=document.createElement('div');ws.className='dg-field-wrap';ws.innerHTML='<label class="w-form-label" for="why-startups">Why SF startups (optional)</label><textarea class="w-input" id="why-startups" name="why-startups" rows="2" placeholder="Mission, stage, impact..."></textarea>';en.appendChild(ws);}if(!en.querySelector('#dg-privacy')){var p=document.createElement('p');p.id='dg-privacy';p.style.cssText='color:#9ca3af;font-size:.8rem;margin:.75rem 0 0';p.textContent='We never blast your profile. Tech match + humans in the loop.';var b3=en.querySelector('[type=submit],.w-button');b3?.parentElement?.insertBefore(p,b3)}submitTrust(en,'Private until a reviewed match. Free for candidates.');var sb2=en.querySelector('[type=submit],.w-button');if(sb2){sb2.value='Get matched';sb2.textContent='Get matched'; sb2.removeAttribute('disabled'); sb2.disabled=false;}wizBuild(en,'engineer');qa('#tally-startup-embed,#tally-engineer-embed,iframe[data-tally-embed]').forEach(function(el){el.remove()});var stW=formEl('#startup-hire');if(stW)wizBuild(stW,'startup');var enW=formEl('#engineer-join');if(enW)wizBuild(enW,'engineer');} // ensure WIZ on any open
// extra label safety for mobile a11y on both forms (build more)
qa('input,select,textarea', document).forEach(function(i){ if(!i.id) return; var l = document.querySelector('label[for="'+i.id+'"]'); if(l) l.setAttribute('for', i.id); });
}
/* === COPY INJECTION — runtime marketing strings from COPY; honesty scrub separate === */
function copy(){qa(S+' h2').forEach(function(e){e.textContent=COPY.startupH2});qa(J+' h2').forEach(function(e){e.textContent=COPY.engineerH2});qa(S+' p,'+J+' p').forEach(function(e){var t=e.textContent||'';if(t.length>240||e.closest('form,.w-form'))return;e.textContent=e.closest(J)?COPY.engineerBody:COPY.startupBody});var jm=q(J);if(jm)qa('*',jm).forEach(function(e){if(e.children.length||e.closest('form,.w-form'))return;var t=(e.textContent||'').trim();if(/^ENGINEER APPLICATION$|^CANDIDATE APPLICATION$/i.test(t))e.textContent='SF STARTUP ROLES'})}
/* === HERO / CTA SURFACE — dual path pills live in contactStrip; keep sample labels honest === */
function hero(){
  qa('.hero-section h1,.hero-title,.header h1').forEach(function(e){
    e.innerHTML='The right people, <span class="title-accent-gold">with signal.</span>';
  });
  qa('.hero-section p,.hero-description,.subheading,.header p').forEach(function(e){
    if(e.closest('form,.w-form')||e.id==='dg-cand-kicker'||e.closest('.dg-candidates,#startup-modal,#jobseeker-modal,#dg-path-pills,#dg-hero-chips,#dg-simple-process'))return;
    var t=e.textContent||'';
    if(t.length>4&&t.length<400)e.textContent=COPY.heroSub;
  });
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
function wireNavHire(a){
  if(!a) return;
  a.id=a.id||'dg-nav-hire';
  a.setAttribute('data-demigod-modal','startup');
  a.setAttribute('data-dg-cta','hire');
  a.setAttribute('href','/?wiz=startup');
  a.setAttribute('aria-label',"I'm hiring — open startup brief");
  var span=a.querySelector('.button_label,.btn-label');
  if(span) span.textContent=COPY.navCta; else a.textContent=COPY.navCta;
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
function ensureNavTalent(parent){
  if(q('#dg-nav-talent')||!parent) return;
  var t=document.createElement('a');
  t.id='dg-nav-talent';
  t.className='button w-button';
  t.style.cssText='margin-left:.5rem;border:1px solid rgba(255,255,255,.22);background:transparent;color:#E8E4DC;border-radius:999px';
  wireNavTalent(t);
  parent.appendChild(t);
}
/* ==== SECTION: nav (hire/talent wiring — dual CTA semantics) ==== */
function nav(){
  var real=q('nav.w-nav,.w-nav');
  if(real){var inj=q('#dg-top-nav');if(inj)inj.remove();var st=q('#dg-nav-style');if(st)st.remove();document.body.style.paddingTop='';}
  var bar=q('nav.w-nav .w-nav-menu, nav.w-nav, .w-nav, header nav, .nav_container');
  var pickHire=function(a){if(a.closest('footer,.hero-actions,#dg-path-pills,#dg-bar'))return false;var t=(a.textContent||'').trim().split('\n')[0];return /^(GET STARTED|POST A JOB|HIRE TALENT|FIND TALENT|I'M HIRING)$/i.test(t)||a.classList.contains('is-talent')||a.id==='dg-nav-hire';};
  var btns=qa('nav.w-nav a.button,.w-nav a.button,nav a.button,header a.button,nav a.premium-btn,header a.premium-btn');
  var hireBtn=btns.find(pickHire)||btns[0];
  if(hireBtn){
    wireNavHire(hireBtn);
    var talentBtn=btns.find(function(a){return a!==hireBtn&&(a.classList.contains('is-job')||/FIND A JOB|JOIN|LOOKING|CANDIDATE/i.test((a.textContent||'')));});
    if(!talentBtn && btns.length>=2) talentBtn=btns.find(function(a){return a!==hireBtn;});
    if(talentBtn) wireNavTalent(talentBtn);
    else ensureNavTalent(hireBtn.parentElement||bar);
    qa('nav a,header a,.w-nav a').forEach(function(x){
      if(x===hireBtn||x===talentBtn||x.id==='dg-nav-talent') return;
      if(x.closest('.hero-actions,#dg-path-pills,#dg-bar,.pricing-card')) return;
      var t=(x.textContent||'').trim().split('\n')[0];
      if(/^(FIND TALENT|HIRE TALENT|GET STARTED|POST A JOB)$/i.test(t) && x.dataset.dgCta!=='talent') {
        x.style.setProperty('display','none','important');
      }
    });
    return;
  }
  if(q('#dg-nav-hire')) return;
  if(bar){
    var a=document.createElement('a');a.id='dg-nav-hire';a.className='button on-inverse w-button';
    wireNavHire(a); bar.appendChild(a); ensureNavTalent(bar); return;
  }
  if(!q('#dg-nav-style')){
    var st2=document.createElement('style');st2.id='dg-nav-style';
    st2.textContent='#dg-top-nav{position:fixed;top:0;left:0;right:0;z-index:999;display:flex;justify-content:space-between;align-items:center;gap:.75rem;padding:.55rem 1rem;background:rgba(6,6,6,.94);border-bottom:1px solid rgba(201,168,76,.15)}#dg-top-nav .dg-logo{color:#c9a84c;font-weight:700;text-decoration:none!important;font-family:Cinzel,serif}#dg-top-nav .dg-nav-ctas{display:flex;gap:.5rem;align-items:center}#dg-top-nav a.dg-cta{font-weight:700!important;min-height:40px;display:inline-flex;align-items:center;padding:.4rem .85rem;border-radius:8px;text-decoration:none!important}#dg-top-nav a.dg-cta-hire{background:#C9A84C;color:#0A0A0A!important}#dg-top-nav a.dg-cta-talent{border:1px solid rgba(201,168,76,.55);color:#C9A84C!important}body{padding-top:3.1rem}';
    document.head.appendChild(st2);
  }
  var top=document.createElement('div');top.id='dg-top-nav';
  top.innerHTML='<a class="dg-logo" href="/">Demigod</a><div class="dg-nav-ctas"><a id="dg-nav-hire" class="dg-cta dg-cta-hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">'+COPY.navCta+'</a><a id="dg-nav-talent" class="dg-cta dg-cta-talent" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">'+COPY.navCtaTalent+'</a></div>';
  document.body.prepend(top);
}
function trust(){/* v210: no visual wall — sr-only one-liner for a11y */ var old=q('#demigod-trust-block'); if(old)old.remove(); var f=q('footer,.footer'); if(!f||q('#demigod-trust-block'))return; var el=document.createElement('section'); el.id='demigod-trust-block'; el.setAttribute('aria-label','How it works'); el.style.cssText='position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0'; el.innerHTML='<p>Brief or profile → human match → both sides approve → intro. 10% on hire.</p>'; if(f.parentNode)f.parentNode.insertBefore(el,f); else document.body.appendChild(el); }
function mob(){if(q('#dg-bar'))return;var b=document.createElement('nav');b.id='dg-bar';b.setAttribute('aria-label','Mobile actions');b.innerHTML='<a class="dg-h" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire" aria-label="I\'m hiring — open startup brief">'+COPY.ctaFounder+'</a><a class="dg-j" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent" aria-label="I\'m looking — open talent profile">'+COPY.ctaEngineer+'</a>';document.body.appendChild(b)}
function foot(){var f=q('footer,.footer');if(!f)return;if(!q('#dg-legal-links')){var lg=document.createElement('p');lg.id='dg-legal-links';lg.style.cssText='margin:.5rem 0;font-size:.8rem';lg.innerHTML='<span class="dg-foot-primary"><a href="/?p=how" data-dg-page="how">How</a><a href="/?p=pricing" data-dg-page="pricing">Pricing</a><a href="/?p=faq" data-dg-page="faq">FAQ</a><a href="/?p=contact" data-dg-page="contact">Contact</a></span><span class="dg-foot-more" aria-label="More pages"><a href="/?p=legal" data-dg-page="legal">Legal</a><a href="/?p=pilot" data-dg-page="pilot">Pilot</a><a href="/?p=founders" data-dg-page="founders">Founders</a><a href="/?p=candidates" data-dg-page="candidates">Talent</a><a href="/?p=compare" data-dg-page="compare">Compare</a></span><a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a>';f.appendChild(lg);lg.addEventListener('click',function(e){var a=e.target.closest('[data-dg-page]');if(!a)return;e.preventDefault();openPage(a.getAttribute('data-dg-page'),true);})}qa('footer nav,footer ul,footer .w-col,footer [class*="column"],footer section',f).forEach(function(c){var t=c.textContent||'';if(t.length<8||t.length>8000)return;if(/Company|Services|Resources|Legal|ABOUT|TEAM|CAREERS|Facebook|Instagram|LinkedIn|YouTube|GET STARTED/i.test(t)&&!/hello@trydemigod|potter@trydemigod|© 2026/i.test(t))c.style.setProperty('display','none','important')});qa('footer a[href="#"]',f).forEach(function(a){var p=a.closest('li,nav,div')||a;if(!/hello@trydemigod|potter@trydemigod/i.test(p.textContent||''))p.style.setProperty('display','none','important')});qa('footer .footer_icon-group,footer .button-group,footer [class*="social"]',f).forEach(function(g){g.style.setProperty('display','none','important')});if(!q('#demigod-footer-tag')){var p=document.createElement('p');p.id='demigod-footer-tag';p.style.cssText='color:#9ca3af;font-size:.9rem;margin:.5rem 0 1rem;max-width:42rem';p.textContent=COPY.footerTag;var c=f.querySelector('[class*="copyright"],.footer_bottom')||f.lastElementChild;if(c&&c.parentNode)c.parentNode.insertBefore(p,c)}if(!q('#footer-email')){var a=document.createElement('a');a.id='footer-email';a.href='mailto:potter@trydemigod.com';a.textContent='potter@trydemigod.com';a.style.cssText='display:block!important;color:#c9a84c;font-size:.95rem;margin:.75rem 0;text-decoration:none';var c2=f.querySelector('[class*="copyright"],.footer_bottom')||f.lastElementChild;if(c2&&c2.parentNode)c2.parentNode.insertBefore(a,c2)}qa('footer .text-color_secondary,footer [class*="copyright"]',f).forEach(function(el){el.style.fontSize='0.875rem';el.style.lineHeight='1.4';el.textContent='© 2026 Demigod. All rights reserved.'});if(!q('#dg-copyright')&&!qa('footer .text-color_secondary,footer [class*="copyright"]',f).length){var cp=document.createElement('p');cp.id='dg-copyright';cp.textContent='© 2026 Demigod. All rights reserved.';cp.style.cssText='color:#A8A29E;font-size:.875rem;margin:.5rem 0 0';var bot=f.querySelector('.footer_bottom')||f;bot.appendChild(cp)}}
function footerDecisionLinks(){/* v564: keep footer lean — no extra decision links */}
function rmOrphanForms(){qa('form.w-form').forEach(function(f){if(f.closest('#startup-modal,#jobseeker-modal'))return;var n=(f.getAttribute('data-name')||f.name||'').toLowerCase();if(n==='email-form'||n==='test-form'||f.id==='email-form'){(f.closest('section,.w-form-wrap,div')||f).remove()}})}
function hide(f){try{detachTrap(true)}catch(e){}[S,J].forEach(function(id){if(!f&&OPEN===id)return;var m=q(id);if(m){m.style.display='none';m.setAttribute('aria-hidden','true');try{m.inert=true}catch(e){m.setAttribute('inert','')}}}); if(document.body){ var prev = document.body.dataset.prevOverflow || ''; var sy = parseInt(document.body.dataset.prevScrollY || '0', 10); document.body.style.overflow = prev; document.body.style.position = ''; document.body.style.top = ''; document.body.style.width = ''; delete document.body.dataset.prevOverflow; delete document.body.dataset.prevScrollY; try { window.scrollTo(0, sy); } catch(e){} } if(document.documentElement) document.documentElement.style.overflow=''; try{var bar=q('#dg-bar');if(bar){bar.style.removeProperty('display');bar.removeAttribute('aria-hidden');}}catch(e){} }
var busy=false,tmr=null,OBS=null,LAST_FOCUS=null,TRAP_H=null;
function focusables(root){if(!root)return[];return qa('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',root).filter(function(el){try{var s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&!el.disabled}catch(e){return true}})}
function attachTrap(m){detachTrap(false);LAST_FOCUS=document.activeElement;TRAP_H=function(e){if(e.key!=='Tab'||!OPEN)return;var modal=q(OPEN);if(!modal)return;var list=focusables(modal);if(!list.length){e.preventDefault();return}var first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();try{last.focus()}catch(_){}}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();try{first.focus()}catch(_){}}else if(!modal.contains(document.activeElement)){e.preventDefault();try{first.focus()}catch(_){}}};document.addEventListener('keydown',TRAP_H,true)}
function detachTrap(restore){if(TRAP_H){document.removeEventListener('keydown',TRAP_H,true);TRAP_H=null}if(restore!==false&&LAST_FOCUS&&LAST_FOCUS.focus){try{LAST_FOCUS.focus()}catch(e){}}LAST_FOCUS=null}
function wizCss(){if(q('#dg-wiz-css'))return;var s=document.createElement('style');s.id='dg-wiz-css';s.textContent='#startup-modal input:not([type=checkbox]):not([type=radio]),#startup-modal select,#startup-modal textarea,#jobseeker-modal input:not([type=checkbox]):not([type=radio]),#jobseeker-modal select,#jobseeker-modal textarea{font-size:16px!important;min-height:48px;line-height:1.35}#startup-modal .dg-wiz-next,#startup-modal .dg-wiz-back,#jobseeker-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-back{min-height:48px!important;padding:12px 16px!important;touch-action:manipulation;border-radius:10px!important}#startup-modal .dg-wiz-next:focus-visible,#startup-modal .dg-wiz-back:focus-visible,#jobseeker-modal .dg-wiz-next:focus-visible,#jobseeker-modal .dg-wiz-back:focus-visible{outline:2px solid #C9A84C!important;outline-offset:2px!important}#startup-modal .dg-wiz-head,#jobseeker-modal .dg-wiz-head{position:sticky;top:0;z-index:5;background:rgba(10,10,10,.96);padding:.5rem 0 .35rem;backdrop-filter:blur(6px)}#startup-modal .dg-wiz-count,#jobseeker-modal .dg-wiz-count{display:inline-flex;align-items:center;gap:.38rem;min-height:28px;padding:.2rem .6rem .2rem .24rem;border:1px solid rgba(201,168,76,.24);border-radius:999px;background:rgba(201,168,76,.07);color:#E8D5A3;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}#startup-modal .dg-wiz-count .dg-cur,#jobseeker-modal .dg-wiz-count .dg-cur{display:inline-grid;place-items:center;min-width:1.65rem;min-height:1.65rem;border-radius:50%;background:#C9A84C;color:#0A0A0A;font-size:.78rem;font-weight:800;font-variant-numeric:tabular-nums;box-shadow:0 0 0 1px rgba(232,213,163,.32)}#startup-modal .dg-wiz-bar,#jobseeker-modal .dg-wiz-bar{height:7px;background:rgba(168,162,158,.16);border:1px solid rgba(201,168,76,.12);border-radius:999px;overflow:hidden;margin:.65rem 0 .75rem;box-shadow:inset 0 1px 2px rgba(0,0,0,.35)}#startup-modal .dg-wiz-bar i,#jobseeker-modal .dg-wiz-bar i{position:relative;display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#B88C2D,#E8D5A3);box-shadow:0 0 12px rgba(201,168,76,.3);transition:width .25s ease}#startup-modal .dg-wiz-bar i:after,#jobseeker-modal .dg-wiz-bar i:after{content:"";position:absolute;right:0;top:50%;width:6px;height:6px;border-radius:50%;background:#F5F0E6;box-shadow:0 0 8px rgba(245,240,230,.75);transform:translate(0,-50%)}#startup-modal .dg-wiz-q,#jobseeker-modal .dg-wiz-q{font-size:1.15rem;font-weight:600;color:#F5F0E6;margin:.35rem 0}#startup-modal .dg-wiz-hint,#jobseeker-modal .dg-wiz-hint{font-size:.85rem;color:#A8A29E;margin:0 0 .5rem;line-height:1.4}@media(max-width:767px){#startup-modal .dg-wiz-nav,#jobseeker-modal .dg-wiz-nav{flex-direction:column!important;gap:8px!important;display:flex!important}#startup-modal .dg-wiz-next,#startup-modal .dg-wiz-back,#jobseeker-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-back{width:100%!important}#startup-modal,#jobseeker-modal{padding-bottom:env(safe-area-inset-bottom,0)}#dg-bar a{min-height:48px;display:flex;align-items:center;justify-content:center}}@media(prefers-reduced-motion:reduce){#startup-modal .dg-wiz-bar i,#jobseeker-modal .dg-wiz-bar i{transition:none}}#startup-modal .dg-wiz-review,#jobseeker-modal .dg-wiz-review{border:1px solid rgba(201,168,76,.28);border-radius:12px;padding:.75rem .9rem;margin:.5rem 0 .75rem;background:rgba(14,14,18,.92);max-height:40vh;overflow:auto;box-shadow:inset 0 0 0 1px rgba(201,168,76,.08)}#startup-modal .dg-wiz-review h3,#jobseeker-modal .dg-wiz-review h3{color:#C9A84C;font-size:.85rem;margin:0 0 .5rem;letter-spacing:.04em;text-transform:uppercase}#startup-modal .dg-wiz-review dt,#jobseeker-modal .dg-wiz-review dt{color:#A8A29E;font-size:.72rem;margin-top:.4rem}#startup-modal .dg-wiz-review dd,#jobseeker-modal .dg-wiz-review dd{color:#F5F0E6;font-size:.9rem;margin:0 0 .15rem;line-height:1.4}#startup-modal .dg-wiz-next,#jobseeker-modal .dg-wiz-next{box-shadow:0 0 0 1px rgba(201,168,76,.3),0 6px 20px rgba(0,0,0,.35)}#startup-modal input:not([type=checkbox]):not([type=radio]),#startup-modal select,#startup-modal textarea,#jobseeker-modal input:not([type=checkbox]):not([type=radio]),#jobseeker-modal select,#jobseeker-modal textarea{background:rgba(20,20,24,.85)!important;border:1px solid rgba(201,168,76,.3)!important;color:#F5F0E6!important;border-radius:8px!important}#startup-modal input::placeholder,#startup-modal textarea::placeholder,#jobseeker-modal input::placeholder,#jobseeker-modal textarea::placeholder{color:#7A756D!important}#startup-modal input[type=checkbox],#startup-modal input[type=radio],#jobseeker-modal input[type=checkbox],#jobseeker-modal input[type=radio]{accent-color:#C9A84C}';document.head.appendChild(s)}

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
      var span = a.querySelector('.btn-label,.button_label');
      if (span) {
        span.textContent = label;
        Array.prototype.forEach.call(a.childNodes, function(n){
          if (n.nodeType === 3 && String(n.textContent || '').trim()) n.textContent = '';
        });
      } else {
        a.textContent = label;
      }
    } catch (e) { try { a.textContent = label; } catch (_) {} }
    a.setAttribute('href', hire ? '/?wiz=startup' : '/?wiz=engineer');
    a.setAttribute('data-demigod-modal', hire ? 'startup' : 'jobseeker');
    a.setAttribute('data-dg-cta', hire ? 'hire' : 'talent');
    a.setAttribute('aria-label', hire ? "I'm hiring — open startup brief" : "I'm looking — open talent profile");
    a.classList.toggle('is-talent', hire);
    a.classList.toggle('is-job', !hire);
  }
  qa('a.premium-btn.is-talent,a.is-talent.premium-btn,a.is-talent').forEach(function(a){ wireCta(a, 'startup'); });
  qa('a.premium-btn.is-job,a.is-job.premium-btn,a.is-job').forEach(function(a){ wireCta(a, 'engineer'); });
  var heroPair = qa('.hero-actions a.premium-btn,.hero-actions a.button,.hero-section .hero-actions a,.hero-content-left a.premium-btn,.hero-content-left a.button');
  if (heroPair.length >= 2) {
    wireCta(heroPair[0], 'startup');
    wireCta(heroPair[1], 'engineer');
  } else if (heroPair.length === 1) {
    wireCta(heroPair[0], 'startup');
  }
  var heroAll = qa('.hero-section a.premium-btn, header a.premium-btn, .header a.premium-btn');
  if (heroAll.length >= 2) {
    wireCta(heroAll[0], 'startup');
    wireCta(heroAll[1], 'engineer');
  }
  qa('a,button').forEach(function(a){
    if (a.closest('#startup-modal,#jobseeker-modal,footer,#dg-faq')) return;
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
    if (a.closest('#startup-modal,#jobseeker-modal')) return;
    wireCta(a, 'startup');
  });
}
/* dual-path nudge: hint under each hero CTA + one-line chooser under the pair */
function ctaHints(){
  var host=q('.hero-actions');
  if(!host)return;
  qa('a[data-dg-cta]',host).forEach(function(a){
    if(a.dataset.dgHinted)return;
    a.dataset.dgHinted='1';
    var wrap=document.createElement('span');
    wrap.className='dg-cta-wrap';
    a.parentNode.insertBefore(wrap,a);
    wrap.appendChild(a);
    var hint=document.createElement('small');
    hint.className='dg-cta-hint';
    hint.textContent=a.getAttribute('data-dg-cta')==='hire'?COPY.ctaHireHint:COPY.ctaTalentHint;
    wrap.appendChild(hint);
  });
  if(!q('#dg-path-nudge')){
    var nudge=document.createElement('p');
    nudge.id='dg-path-nudge';
    nudge.textContent='Choose one path — opens the right form.';
    host.parentNode.insertBefore(nudge,host.nextSibling);
  }
}

function brandAssets(){if(q('#dg-brand-assets'))return;var s=document.createElement('style');s.id='dg-brand-assets';s.textContent=
/* v571 Operator Calm — warm paper, cobalt dual path, drop gold-recruiter night */
"html,body{background:#F7F4EF!important;color:#141414!important}"
+".nav_container,.nav_left,.nav_right{background:transparent!important}"
+".nav_container{position:sticky!important;top:0!important;z-index:50!important;display:flex!important;align-items:center!important;justify-content:space-between!important;padding:.85rem 1.25rem!important;backdrop-filter:blur(10px);background:rgba(247,244,239,.9)!important;border-bottom:1px solid #e4ddd3!important}"
+".nav_logo .paragraph_large,[data-brand-name]{color:#141414!important;font-weight:700!important;letter-spacing:.02em}"
+".nav_logo-icon{color:#1F4B99!important}"
+".hero-section,.header{background:#F7F4EF!important;background-image:none!important;min-height:auto!important;display:flex!important;align-items:flex-start!important;padding:clamp(2.5rem,8vh,4.5rem) 1.25rem 2.75rem!important;border-bottom:1px solid #e4ddd3!important}"
+".hero-grid-background,.grid-col-line,.hero-content-right,.statue-frame,.statue-svg,.statue-wrapper{display:none!important}"
+".hero-container,.hero-content-left{max-width:40rem!important;margin:0!important;width:100%!important}"
+".hero-section h1,.header h1,.hero-title{text-shadow:none!important;letter-spacing:-.03em;max-width:14ch!important;font-size:clamp(2.4rem,7vw,3.9rem)!important;font-weight:700!important;line-height:1.02!important;margin:.4rem 0 .9rem!important;color:#141414!important;animation:none!important}"
+".title-accent-gold{color:#1F4B99!important}.title-accent-cream,.title-accent-red,.title-accent-blue{color:#141414!important;display:inline}"
+".hero-section p,.header p,.subheading,.hero-description{max-width:36ch!important;font-size:1.1rem!important;line-height:1.55!important;color:#5c574f!important;margin:0 0 1.1rem!important;animation:none!important}"
+".hero-badge,.badge-text{display:inline-flex!important;align-items:center!important;gap:.4rem!important;color:#5c574f!important;font-size:.7rem!important;font-weight:600!important;letter-spacing:.14em!important;text-transform:uppercase!important;border:1px solid #e4ddd3!important;border-radius:999px!important;padding:.28rem .7rem!important;background:#fff!important;min-height:auto!important}"
+".badge-dot{width:6px!important;height:6px!important;border-radius:50%!important;background:#1F4B99!important;box-shadow:none!important}"
+"#dg-hero-chips,.dg-trust-line{display:block!important;margin:0 0 1.25rem!important;color:#5c574f!important;font-size:.92rem!important;letter-spacing:.01em;animation:none!important}"
+"#dg-hero-chips .dg-chip{display:none!important}"
+".hero-actions{display:flex!important;flex-wrap:wrap!important;gap:.75rem!important;align-items:stretch!important;margin-top:.15rem;animation:none!important}"
+".hero-actions a.premium-btn,.hero-actions a.button,.hero-actions a.w-button,#dg-bar a.dg-h,#dg-bar a.dg-j,#dg-nav-hire,#dg-nav-talent,a.premium-btn[data-dg-cta],a.button[data-dg-cta]{box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:52px!important;padding:.85rem 1.35rem!important;border-radius:14px!important;font-weight:650!important;font-size:.95rem!important;line-height:1.2!important;letter-spacing:.01em;text-decoration:none!important;white-space:nowrap!important;cursor:pointer!important;transition:background .15s ease,border-color .15s ease,color .15s ease;box-shadow:none!important;transform:none!important;filter:none!important}"
+".hero-actions a[data-dg-cta=hire],.hero-actions a.is-talent,#dg-bar a.dg-h,#dg-nav-hire,a[data-dg-cta=hire],.button.on-inverse{background:#1F4B99!important;color:#fff!important;border:1px solid #1F4B99!important}"
+".hero-actions a[data-dg-cta=hire]:hover,#dg-nav-hire:hover,a[data-dg-cta=hire]:hover{background:#163a7a!important}"
+".hero-actions a[data-dg-cta=talent],.hero-actions a.is-job,#dg-bar a.dg-j,#dg-nav-talent,a[data-dg-cta=talent]{background:#fff!important;color:#141414!important;border:1px solid #e4ddd3!important}"
+".hero-actions a[data-dg-cta=talent]:hover,a[data-dg-cta=talent]:hover{border-color:#1F4B99!important;color:#1F4B99!important}"
+".hero-actions a .btn-label,.hero-actions a .button_label,.hero-actions a .btn-arrow,.hero-actions a svg{display:inline!important;margin:0!important;padding:0!important;background:transparent!important;border:none!important;color:inherit!important;font:inherit!important;opacity:1!important}"
+".hero-actions a .btn-arrow,.hero-actions a svg{display:none!important}"
+"#dg-path-pills{display:flex!important;flex-wrap:wrap!important;gap:.35rem 1.15rem!important;margin:1.35rem 0 0!important;padding-top:1.1rem!important;border-top:1px solid #e4ddd3!important;animation:none!important}"
+"#dg-path-pills a{color:#5c574f!important;font-size:.9rem!important;font-weight:500!important;text-decoration:none!important;border-bottom:none!important;min-height:44px!important;display:inline-flex!important;align-items:center!important}"
+"#dg-path-pills a:hover,#dg-path-pills a:focus-visible{color:#1F4B99!important;outline:none}"
+"#dg-path-pills a:focus-visible{box-shadow:0 0 0 2px rgba(31,75,153,.35);border-radius:4px}"
+"#demigod-trust-block,#dg-faq,#dg-proof-strip,#dg-pipeline-note,#dg-contact-strip,#dg-hero-trust,#insights-section,.insights-section{display:none!important}"
+"section.trust-section,body>section:has(.steps-grid),body>section:has(.pricing-grid){display:block!important;visibility:visible!important;opacity:1!important;padding:3rem 1.25rem!important;background:#F7F4EF!important}"
+"section:has(.roles-grid),[data-dg-hidden=roles-simplify]{display:none!important}"
+".trust-header,.roles-header{max-width:40rem;margin:0 auto 1.5rem!important;text-align:left!important}"
+".trust-header h2,.heading_tertiary,section h2{color:#141414!important;font-size:clamp(1.35rem,3vw,1.75rem)!important;font-weight:650!important;letter-spacing:-.02em!important;margin:.5rem 0 .4rem!important}"
+".trust-header p,.paragraph_large{color:#5c574f!important;font-size:1rem!important;max-width:36ch}"
+".steps-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:1rem!important;max-width:52rem;margin:0 auto!important;visibility:visible!important;opacity:1!important}"
+".step-card{background:#fff!important;border:1px solid #e4ddd3!important;border-radius:14px!important;padding:1.15rem 1.1rem!important;box-shadow:none!important;transition:border-color .15s ease}"
+".step-card:hover,.step-card:focus-within{transform:none!important;border-color:#1F4B99!important}"
+".step-num{color:#1F4B99!important;font-size:.75rem!important;font-weight:700!important;letter-spacing:.12em!important;margin-bottom:.45rem!important}"
+".step-title{color:#141414!important;font-size:1.05rem!important;font-weight:650!important;margin:0 0 .35rem!important}"
+".step-desc{color:#5c574f!important;font-size:.92rem!important;line-height:1.45!important;margin:0!important}"
+".pricing-grid,.pricing-grid.is-single{display:block!important;max-width:26rem;margin:0 auto!important;padding:0!important;visibility:visible!important}"
+".pricing-card{background:#fff!important;border:1px solid #e4ddd3!important;border-radius:18px!important;padding:1.6rem 1.4rem!important;box-shadow:none!important;text-align:left!important}"
+".pricing-card h3{color:#5c574f!important;letter-spacing:.1em!important;font-size:.72rem!important;text-transform:uppercase!important;margin:0 0 .35rem!important}"
+".pricing-card .pricing-amount,.pricing-card .price,.pricing-card > div > div{color:#141414!important}"
+".pricing-card a.premium-btn,.pricing-card a.button{margin-top:1.1rem!important;min-height:48px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:14px!important;background:#1F4B99!important;color:#fff!important;border:none!important;padding:.7rem 1.2rem!important;font-weight:650!important}"
+".pricing-card-border-red,.pricing-card-divider{opacity:.35}"
+"#dg-legal-links{display:flex!important;flex-direction:column!important;align-items:center!important;gap:.45rem!important;margin:.75rem auto!important;max-width:28rem!important;padding:0 .75rem!important}"+"#dg-legal-links .dg-foot-primary,#dg-legal-links .dg-foot-more{display:flex!important;flex-wrap:wrap!important;justify-content:center!important;gap:.15rem .9rem!important}"+"#dg-legal-links .dg-foot-more a{color:#8a8378!important;font-size:.78rem!important}"+"#dg-legal-links .dg-foot-more a:hover{color:#5c574f!important}"
+"#dg-legal-links a{color:#5c574f!important;text-decoration:none!important;margin-right:0!important;font-size:.85rem!important;min-height:44px!important;display:inline-flex!important;align-items:center!important}"
+"#dg-legal-links a:hover,#dg-legal-links a:focus-visible{color:#1F4B99!important}"
+"#footer-email,footer a[href^=mailto]{color:#1F4B99!important;text-decoration:none!important;border-bottom:none;min-height:44px!important;display:inline-flex!important;align-items:center!important}"
+"#footer-email:hover,footer a[href^=mailto]:hover{color:#163a7a!important}"
+"footer .w-layout-grid,footer .footer_icon-group,footer .button-group,footer nav:not(:has(a[href^=mailto])),footer ul{display:none!important}"
+"footer,.footer{padding:2rem 1rem 2.5rem!important;text-align:center!important;border-top:1px solid #e4ddd3!important;max-width:32rem;margin-inline:auto;background:transparent!important}"
+"#demigod-footer-tag,footer .footer-tagline{font-size:.88rem!important;color:#8a8378!important;max-width:26rem;margin:.35rem auto!important;line-height:1.45!important}"
+"#dg-copyright,footer [class*=copyright],footer .text-color_secondary{color:#8a8378!important;font-size:.8rem!important;margin:.5rem auto 0!important}"
+"#main,main,h1.hero-title,.hero-section h1,#dg-page{scroll-margin-top:4.5rem!important}"
+"a:focus-visible,button:focus-visible,.premium-btn:focus-visible,#dg-bar a:focus-visible{outline:2px solid #1F4B99!important;outline-offset:3px!important}"
+"@media(max-width:767px){#dg-path-pills{display:none!important}.hero-actions{display:none!important}#dg-bar{position:fixed!important;left:0;right:0;bottom:0;z-index:9998;display:grid!important;grid-template-columns:1fr 1fr;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px))!important;background:rgba(247,244,239,.97)!important;border-top:1px solid #e4ddd3!important}#dg-bar a{min-width:0!important;min-height:48px!important;border-radius:14px!important;font-size:.9rem!important;font-weight:650!important;padding:.65rem .5rem!important;display:flex!important;align-items:center!important;justify-content:center!important;text-decoration:none!important}body{padding-bottom:calc(72px + env(safe-area-inset-bottom,0px))!important}.steps-grid{grid-template-columns:1fr!important}.hero-section h1,.header h1{font-size:clamp(2rem,9vw,2.75rem)!important}#dg-path-pills{justify-content:flex-start}}"
+"@media(min-width:768px){#dg-bar{display:none!important}body{padding-bottom:0!important}}"
+"@media(prefers-reduced-motion:reduce){.hero-section h1,.hero-section p,.hero-actions,#dg-hero-chips,#dg-path-pills,.step-card{animation:none!important;transition:none!important}}"
+"";document.head.appendChild(s)}

function ensureA11yCss(){if(q('#dg-focus-ring'))return;var fr=document.createElement('style');fr.id='dg-focus-ring';fr.textContent='a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible,.premium-btn:focus-visible,.dg-page-x:focus-visible,#dg-bar a:focus-visible{outline:2px solid #C9A84C!important;outline-offset:3px!important}';document.head.appendChild(fr);if(!q('#dg-legal-mobile')){var lm=document.createElement('style');lm.id='dg-legal-mobile';lm.textContent='@media(max-width:767px){#dg-legal-links{font-size:.75rem!important;gap:.25rem .55rem!important;padding:0 .5rem;justify-content:center}#dg-legal-links a{margin-right:0!important}}';document.head.appendChild(lm)}}
function ensureForcedColorsCss(){if(q('#dg-forced-colors'))return;var fc=document.createElement('style');fc.id='dg-forced-colors';fc.textContent='@media(forced-colors:active){#startup-modal .dg-wiz-head,#jobseeker-modal .dg-wiz-head,#startup-modal .dg-wiz-chrome,#jobseeker-modal .dg-wiz-chrome{border:1px solid CanvasText!important;forced-color-adjust:auto}#startup-modal .dg-wiz-bar,#jobseeker-modal .dg-wiz-bar{border:1px solid CanvasText!important;background:Canvas!important}#startup-modal .dg-wiz-bar>i,#jobseeker-modal .dg-wiz-bar>i{background:Highlight!important;box-shadow:none!important}}';document.head.appendChild(fc)}
function run(){if(busy)return;busy=true;try{brandAssets();ensureA11yCss();ensureForcedColorsCss()}catch(e){}if(OBS)OBS.disconnect();try{forceMainVisible();skipLink();heroImgPerf();lazyBelowFold();wizCss();faqCss();hero();copy();forms();fileUploadHonest();cta();ctaHints();nav();try{wireLogoHome()}catch(e){}(function roles(){qa('h2').forEach(function(h){if(/Live SF startup roles hiring now/i.test(h.textContent||''))h.textContent='Example roles — labeled samples'});qa('.badge-text').forEach(function(b){if(/^LIVE ROLES$/i.test((b.textContent||'').trim()))b.textContent='EXAMPLE ROLES'});qa('.role-card').forEach(function(c){if(c.querySelector('.dg-sample-tag'))return;var tag=document.createElement('span');tag.className='dg-sample-tag';tag.textContent='Sample';tag.style.cssText='display:inline-block;font-size:.68rem;font-weight:600;color:#A8A29E;border:1px solid rgba(201,168,76,.35);border-radius:4px;padding:1px 6px;margin:0 0 .35rem;letter-spacing:.06em;text-transform:uppercase';var title=c.querySelector('h3,.role-title-text');if(title)c.insertBefore(tag,title);else c.prepend(tag)});var junk=new RegExp(['l','orem'].join('')+'|consectetur','i');qa('section,div,[class*=role]').forEach(function(c){if(c!==document.body&&c!==document.documentElement&&!c.matches?.('main,.hero-section,header,footer')&&junk.test(c.textContent||'')&&(c.textContent||'').length<2000)c.style.setProperty('display','none','important')});var ins=q('#insights-section');if(ins)ins.style.setProperty('display','none','important');qa('h3.step-title,.step-title,h2,h3').forEach(function(h){if(/Meet Your 3-5|Lightning Fast|100% Vetted/i.test(h.textContent||'')){var card=h.closest('.step-card,div,section')||h;if(/Meet Your 3-5|Meet Your\s*3/i.test(h.textContent||'')){h.textContent='Meet curated matches';var d=card.querySelector&&card.querySelector('.step-desc,p');if(d&&/3[\s–-]5|pre-vetted candidates|highly aligned/i.test(d.textContent||''))d.textContent='Startups get curated matches — no volume promise.';}if(/Lightning Fast/i.test(h.textContent||''))h.textContent='Human-paced matching';if(/^100% Vetted/i.test(h.textContent||''))h.textContent='Human-reviewed'}});qa('p.step-desc,.step-desc').forEach(function(p){if(/3[\s–-]5|pre-vetted candidates|highly aligned/i.test(p.textContent||''))p.textContent='Startups get curated matches — no volume promise.';});qa('p,li,span,div').forEach(function(el){if(el.children&&el.children.length>2)return;var tx=el.textContent||'';if(tx.length>200)return;if(/90-?\s*day replacement guarantee/i.test(tx)&&!el.closest('#startup-modal,#jobseeker-modal')){el.textContent=tx.replace(/90-?\s*day replacement guarantee/ig,'90-day outcome focus (replacement policy pending)')}})})();trust();mob();foot();footerDecisionLinks();rmOrphanForms();successCta();if(!OPEN)hide();/* v210: essays off; trust sr-only */dedupeAll();scrubTimeClaims();scrubStaticLabels();scrubBadStaticClaims();scrubContactEmail();try{document.documentElement.classList.add('dg-cta-honest','dg-pricing-honest','dg-volume-honest','dg-contact-honest')}catch(e){}qa('a[target=_blank]').forEach(function(a){var r=a.getAttribute('rel')||'';if(r.indexOf('noopener')<0)a.setAttribute('rel',(r+' noopener noreferrer').trim())})}catch(e){console.error('Demigod foot fail',e)}finally{if(OBS){OBS.takeRecords();OBS.observe(document.documentElement,{childList:true,subtree:true})}busy=false}}

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
    var root=document.body||document.documentElement;
    var tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);
    var n,list=[];
    while(n=tw.nextNode()){ if(bad.test(n.nodeValue||'')){ bad.lastIndex=0; list.push(n);} }
    list.forEach(function(tn){ tn.nodeValue=(tn.nodeValue||'').replace(bad,good); });
    qa('a[href*="mailto:"],a[href*="hello@"]').forEach(function(a){
      var h=(a.getAttribute('href')||'');
      if(bad.test(h)){ bad.lastIndex=0; a.setAttribute('href',h.replace(bad,good)); }
      if(bad.test(a.textContent||'')){ bad.lastIndex=0; a.textContent=(a.textContent||'').replace(bad,good); }
    });
    qa('meta[content],[title],[aria-label],[data-props-link],[data-link]').forEach(function(m){
      ['content','title','aria-label','data-props-link','data-link','href'].forEach(function(attr){
        var c=m.getAttribute(attr); if(!c||!bad.test(c)){ bad.lastIndex=0; return; }
        bad.lastIndex=0; m.setAttribute(attr,c.replace(bad,good));
      });
    });
    qa('script[type="application/ld+json"]').forEach(function(s){
      var c=s.textContent||'';
      if(bad.test(c)){ bad.lastIndex=0; s.textContent=c.replace(bad,good); }
    });
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
    if(/^HIRE SF STARTUP TALENT$/i.test(t)||/^FIND TALENT$/i.test(t)||/^HIRE TALENT$/i.test(t)) el.textContent="I'm hiring";
    else if(/^GET MATCHED TO SF STARTUPS$/i.test(t)||/^JOIN NETWORK$/i.test(t)) el.textContent='Find a job';
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
    if(staleHire.test(out))return "I'm hiring";
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
    if (staleHire.test(t)) {
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
    if (staleHirePhrase.test(t) && !(el.matches&&el.matches('h1,.hero-title,.title-accent-gold,.title-accent-cream'))) {
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

function show(id){if(!q(id))run();var m=q(id);if(!m)return;OPEN=id;try{m.inert=false;m.removeAttribute('inert')}catch(e){}try{var bar=q('#dg-bar');if(bar){bar.style.setProperty('display','none','important');bar.setAttribute('aria-hidden','true');}}catch(e){}m.removeAttribute('aria-hidden');m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.style.cssText='display:flex!important;visibility:visible!important;opacity:1!important';m.setAttribute('aria-hidden','false');try{var title=m.querySelector('.dg-wiz-q,h2,h3,[class*=title]');if(title){if(!title.id)title.id='dg-modal-title-'+(id==='#startup-modal'?'startup':'jobseeker');m.setAttribute('aria-labelledby',title.id);}else{m.setAttribute('aria-label',id==='#startup-modal'?'Hire SF startup talent':'Join talent network');}}catch(e){}if(document.body){ if(!document.body.dataset.prevOverflow){ document.body.dataset.prevOverflow = document.body.style.overflow || getComputedStyle(document.body).overflow || ''; document.body.dataset.prevScrollY = '' + (window.scrollY || 0); } document.body.style.overflow='hidden'; document.body.style.position='fixed'; document.body.style.top = `-${document.body.dataset.prevScrollY}px`; document.body.style.width='100%'; } if(document.documentElement){ document.documentElement.style.overflow='hidden'; } setTimeout(function(){var fi=m.querySelector('input:not([type=hidden]),select,textarea');if(fi)try{fi.focus()}catch(e){}},60); setTimeout(dedupeAll, 120); setTimeout(scrubStaticLabels, 150);
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
function sched(){if(tmr)clearTimeout(tmr);tmr=setTimeout(function(){tmr=null;run()},120)}

function ensureHowLink(){if(q('#dg-how-it-works'))return;var host=q('#dg-proof-strip')||q('#dg-faq')||q('#dg-contact-strip')||q('footer,.footer');if(!host)return;var a=document.createElement('p');a.id='dg-how-it-works';a.style.cssText='text-align:center;margin:1rem auto;padding:0 1rem';a.innerHTML='<a href="'+HOW_IT_WORKS+'" style="color:#C9A84C;font-weight:600;min-height:44px;display:inline-flex;align-items:center">How matching works →</a>';if(host.parentNode)host.parentNode.insertBefore(a,host.nextSibling);else host.appendChild(a)}
/* === DEEP LINK — /?wiz=startup|engineer (+ hash aliases); product /?p= is same-origin shell route === */
/* === SIMPLE PAGES (?p=) — short secondary screens; home stays a decision screen === */
/* ==== SECTION: product pages (DG_PAGES + openPage / routePages /?p=) ==== */
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
    title: 'Find a job',
    doc: 'Talent · Demigod',
    desc: 'One private profile. Free forever. Shared only after mutual approve.',
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
      '<li><strong>Live:</strong> dual CTAs, one-question WIZ, 90-day outcome, tech matching with humans in the loop, product pages, email follow-up</li>' +
      '<li><strong>Runtime:</strong> foot v__DG_FOOT_VER__ on this page load</li>' +
      '<li><strong>Site:</strong> decision home, dual paths, chips, and product pages</li>' +
      '<li><strong>Pending:</strong> SMS (Twilio), card payments (Stripe) — commercial path is email until live</li>' +
      '<li><strong>Fee:</strong> 10% on hire — confirmed by email for now</li>' +
      '<li><strong>Honest board:</strong> sample roles labeled; no fake placements</li>' +
      '<li><strong>Notes:</strong> short product posts at /?p=blog — deep-link /?p=blog#note-{slug}</li>' +
      '</ul><p class="dg-p-lead">Questions: <a href="mailto:potter@trydemigod.com">potter@trydemigod.com</a></p>',
  },
  blog: {
    title: 'Notes',
    doc: 'Notes · Demigod',
    desc: 'Short product notes: 90-day outcomes, mutual approval, and simple pricing.',
    html:
      '<div class="dg-blog-grid">' +
      '<article class="dg-blog-card" id="note-90-day-outcomes"><img src="https://files.catbox.moe/urbco5.jpg" alt="Gold-on-dark abstract mark for 90-day outcome matching note" loading="lazy" decoding="async" width="1200" height="675"><small>Product</small><h3>Why 90-day outcomes beat keyword JDs</h3><p>Match on a measurable first-quarter result, not a stack laundry list.</p><details class="dg-blog-more"><summary>Full note · Why 90-day outcomes beat keyword JDs</summary><p>Keyword filters flood both sides with false matches. One measurable 90-day outcome creates a shared decision frame before identities move: what ships, what proof counts, and what would make either side pass. Stack laundry lists can wait until both sides have already opted into a real conversation.</p></details></article>' +
      '<article class="dg-blog-card" id="note-both-approve"><img src="https://files.catbox.moe/wewe5r.jpg" alt="Private match approval path illustration — both sides opt in" loading="lazy" decoding="async" width="1200" height="675"><small>Privacy</small><h3>Both sides approve before intros</h3><p>Evidence first. Contact details only after founder and talent both opt in.</p><details class="dg-blog-more"><summary>Full note · Both sides approve before intros</summary><p>Profiles stay private. Evidence packets move first: outcome, proof, constraints, and one open gap. Contact details move only when founder and talent both approve — no public talent feed, no cold blasts. That is slower than a public board and faster at real decisions — trust over volume. Follow-ups use potter@trydemigod.com — not a public talent feed.</p></details></article>' +
      '<article class="dg-blog-card" id="note-ten-percent"><img src="https://files.catbox.moe/eg561c.jpg" alt="Simple 10% hire fee diagram on dark gold brand field" loading="lazy" decoding="async" width="1200" height="675"><small>Pricing</small><h3>10% on hire, free for talent</h3><p>10% of first-year cash on hire. Free for talent. No retainers.</p><details class="dg-blog-more"><summary>Full note · 10% on hire, free for talent</summary><p>Agencies often sit at 15–25% plus retainers. Demigod charges 10% of first-year cash only when a hire starts. Talent never pays. No subscription to browse people; commercial follow-up is email (potter@trydemigod.com) while card tooling stays pending.</p></details></article>' +
      '<article class="dg-blog-card" id="note-private-match-notes"><img src="https://files.catbox.moe/i4j3y0.jpg" alt="Compact private match-note packet sketch" loading="lazy" decoding="async" width="1200" height="675"><small>Product</small><h3>What belongs in a private match note</h3><p>The smallest useful packet: proof, constraints, one evidence gap, and a private yes or pass.</p><details class="dg-blog-more"><summary>Full note · What belongs in a private match note</summary><p>A private match note is the smallest packet that lets both sides decide without exposing identities. Keep it tight: (1) one measurable 90-day outcome, (2) proof the candidate can ship that outcome, (3) hard constraints (location, comp band, visa, hours), (4) one explicit evidence gap, and (5) a private yes/pass from the reviewer. Skip stack laundry lists and culture fluff. If the note cannot support a clear yes or pass, it is not ready to move.</p></details></article>' +
      '<article class="dg-blog-card" id="note-human-review-over-volume"><img src="https://files.catbox.moe/zhxopd.jpg" alt="Human review shortlist over volume flood — brand visual" loading="lazy" decoding="async" width="1200" height="675"><small>Market</small><h3>Human review over application volume</h3><p>No fixed candidate-count promise — evidence-backed intros only.</p><details class="dg-blog-more"><summary>Full note · Human review over application volume</summary><p>No fixed candidate-count promise. Public application floods hide signal. A human-reviewed shortlist, grounded in a 90-day outcome and real proof, can save both sides weeks. Volume is not the product — mutual yes is.</p></details></article>' +
      '</div>',
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

  sample: {
    title: 'Sample matches',
    doc: 'Sample matches · Demigod',
    desc: 'Example roles and candidates on Demigod are labeled samples for illustration — no fake placements.',
    html:
      '<p class="dg-p-lead">Anything marked <strong>Sample</strong> on the board is illustrative, not a live listing.</p>' +
      '<p class="dg-p-note">Real activity ships as it happens — we never invent placements. Want a real intro? <a href="/?p=hire" data-dg-page="hire">Submit a role</a> or <a href="/?p=talent" data-dg-page="talent">share a profile</a>.</p>',
  },
  notfound: {
    title: 'Page not found',
    doc: 'Not found · Demigod',
    desc: 'That page does not exist.',
    html: '<p class="dg-p-lead">No page here. Head home or open a brief.</p>',
  }
};
function pageCss() {
  if (q('#dg-page-css')) return;
  var s = document.createElement('style');
  s.id = 'dg-page-css';
  s.textContent =
    '#dg-page{position:fixed;inset:0;z-index:10050;background:rgba(6,6,6,.92);backdrop-filter:blur(10px);overflow:auto;padding:1rem;animation:dg-page-in .25s ease both}' +
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
    '#dg-page .dg-blog-grid{display:grid;gap:.8rem}' +
    '#dg-page .dg-blog-card{overflow:hidden;border:1px solid rgba(201,168,76,.2);border-radius:12px;background:rgba(10,10,10,.5)}' +
    '#dg-page .dg-blog-card img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover}' +
    '#dg-page .dg-blog-card small,#dg-page .dg-blog-card h3,#dg-page .dg-blog-card p{display:block;margin:.65rem .85rem}' +
    '#dg-page .dg-blog-card small{color:#C9A84C;text-transform:uppercase;letter-spacing:.08em}' +
    '#dg-page .dg-blog-card h3{color:#E8D5A3;font-size:1rem}' +
    '#dg-page .dg-blog-card p{color:#A8A29E;line-height:1.45}' +
    '#dg-page .dg-blog-more{margin:.15rem .85rem .85rem;border-top:1px solid rgba(201,168,76,.12);padding-top:.35rem}' +
    '#dg-page .dg-blog-more summary{cursor:pointer;color:#E8D5A3;font-weight:600;min-height:44px;display:flex;align-items:center;list-style:none}' +
    '#dg-page .dg-blog-more summary::-webkit-details-marker{display:none}' +
    '#dg-page .dg-blog-more summary:before{content:"\\25B8 ";color:#C9A84C}' +
    '#dg-page .dg-blog-more[open] summary:before{content:"\\25BE "}' +
    '#dg-page .dg-blog-more p{margin:.35rem 0 .15rem}' +
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
    '@media(min-width:640px){#dg-page .dg-p-grid{grid-template-columns:1fr 1fr 1fr}}';
  document.head.appendChild(s);
}
function closePage() {
  var el = q('#dg-page');
  if (el) el.remove();
  if (document.body) document.body.style.overflow = '';
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
    '<a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">I\'m hiring</a>';
  var talent =
    '<a class="talent" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Find a job</a>';
  var back = '<a class="back" href="/" id="dg-page-back">← Home</a>';
  if (id === 'hire') return '<a class="hire" href="/?wiz=startup" data-demigod-modal="startup" data-dg-cta="hire">Start brief</a>' + talent + back;
  if (id === 'talent') return '<a class="talent" href="/?wiz=engineer" data-demigod-modal="jobseeker" data-dg-cta="talent">Create profile</a>' + hire + back;
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
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', meta.title);
  root.innerHTML =
    '<div class="dg-page-card"><div class="dg-page-top"><h1>' +
    meta.title +
    '</h1><button type="button" class="dg-page-x" aria-label="Close">✕</button></div>' +
    (String(meta.html || '').replace(/__DG_FOOT_VER__/g, String(window.__dgFootVer || window.dgFootVersion || '?'))) +
    '<div class="dg-page-ctas">' +
    pageCtas(id) +
    '</div></div>';
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';
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
  if (push !== false) {
    try {
      var u = new URL(location.href);
      u.searchParams.set('p', id);
      history.pushState({ dgPage: id }, '', u.pathname + u.search + (u.hash || ''));
    } catch (e) {}
  }
  try {
    root.querySelector('.dg-page-x').focus();
  } catch (e) {}
  // Deep-link Notes cards: /?p=blog#note-{slug} (or #slug) → open Full note + scroll
  if (id === 'blog') focusBlogNoteFromHash(root);

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
      '/compare': 'compare',
      '/pilot': 'pilot',
      '/network': 'talent',
      '/fees': 'pricing',
      '/security': 'legal',
      '/about': 'about',
      '/founders': 'founders',
      '/candidates': 'candidates',
      '/status': 'status',
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
    if(/^note-/.test(h)||/^(90-day-outcomes|both-approve|ten-percent|private-match-notes|human-review-over-volume)$/.test(h)){ openPage('blog',false); window.__dgDeepLinked=1; return; }
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

function finalButtonLabels(){var a=q('#startup-hire [type=submit],#startup-modal form [type=submit]');if(a){a.value='Submit brief';a.textContent='Submit brief'}var b=q('#engineer-join [type=submit],#jobseeker-modal form [type=submit]');if(b){b.value='Submit profile';b.textContent='Submit profile'}var o=q('#startup-hire [name="90day-outcome"],#startup-modal [name="90day-outcome"]');if(o){o.placeholder='e.g. Launch v1 checkout and sign two paying pilot customers';var l=o.id&&q('label[for="'+o.id+'"]');if(l)l.textContent='What must this hire accomplish in their first 90 days? *'}}
function orgJsonLd(){if(q('#dg-org-jsonld'))return;var ld=document.createElement('script');ld.type='application/ld+json';ld.id='dg-org-jsonld';ld.textContent=JSON.stringify({'@context':'https://schema.org','@type':'Organization',name:'Demigod',url:'https://www.trydemigod.com',email:'potter@trydemigod.com',description:'Demigod tech matches SF startup talent, humans in the loop. 10% on hire.',areaServed:'San Francisco Bay Area'});document.head.appendChild(ld)}


function wizResumeToast(modal){
  try{
    if(window.__dgWizStore!==true)return;
    if(!modal||q('#dg-wiz-resume',modal))return;
    var id=modal.id||'';
    var key=id.indexOf('startup')>=0?'dgWizSave_startup':(id.indexOf('jobseeker')>=0||id.indexOf('engineer')>=0?'dgWizSave_engineer':null);
    if(!key)return;
    var s=JSON.parse(localStorage.getItem(key)||'null');
    if(!s||!s.answers||Object.keys(s.answers).length<1)return;
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
  qa('a.w-nav-brand,a.nav_logo-link,.nav_logo-link,a.dg-logo,.logo-link').forEach(function(a){
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
function ensureTapTargetCss(){if(q('#dg-tap-targets'))return;var s=document.createElement('style');s.id='dg-tap-targets';s.textContent='.hero-actions a[data-dg-cta],#dg-nav-hire,#dg-nav-talent,#dg-bar a{min-height:48px!important}';document.head.appendChild(s)}
function boot(){if(!document.body)return;forceMainVisible();run();ensureReducedMotionHeroCss();ensureTapTargetCss();finalButtonLabels();try{wireLogoHome()}catch(e){}try{scrubBadStaticClaims();scrubContactEmail()}catch(e){}deepLink();try{document.body.classList.add('dg-ready');document.body.setAttribute('data-dg-ready','1')}catch(e){}try{if(window.requestIdleCallback)requestIdleCallback(function(){try{orgJsonLd()}catch(e){}});else setTimeout(function(){try{orgJsonLd()}catch(e){}},1200)}catch(e){}}boot();document.addEventListener('DOMContentLoaded',boot);[400,1500].forEach(function(ms){setTimeout(boot,ms)});/* v190: drop t=50 forceMainVisible — boot/run cover */
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
window.__dgFootVer='572';console.log('Demigod v572');
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
