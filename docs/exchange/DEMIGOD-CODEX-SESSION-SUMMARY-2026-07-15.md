# Demigod website session summary — v200–v207+

## Chronological ship record

- 2026-07-14 18:37 PT — v200 (`ebec75d`): introduced the honest dual path, “I'm hiring” vs “Find a job”; scrubbed unsupported SLA/48-hour claims and clarified pending capabilities.
- 2026-07-14 19:00 PT — v201 (`8c1ffe6`): made the FOUC/unhide path safer, added WIZ keyboard/touch polish, and improved trust presentation.
- 2026-07-14 19:21 PT — v202 source (`b55e0a6`): enforced one-question-at-a-time WIZ ownership, explicit review-before-submit, 90-day-outcome capture, safer mobile de-duplication, and further honesty fixes.
- 2026-07-14 19:34 PT — v202 CDN (`40138ae`): published `leqhep.js` and updated the footer loader; live dual CTAs were established.
- v203/v204 — no separate versioned commit appears in the requested 15-commit history; any intermediate work was folded into the later v205/v207 state.
- 2026-07-14 19:47 PT — v205 (`8f6f838`): reduced home to a decision screen, restored/strengthened `cta()` wiring, kept dual CTAs and mobile bar, hid essay/board clutter, and shipped the geometric-D favicon plus refreshed CSS/CDN loader.
- v206 — no separate commit or retained header marker found; it appears transitional rather than an independently documented release.
- v207+ — current working tree: added short same-origin `?p=` pages, footer page links, clean-path redirects, page history/Escape behavior, page metadata updates, idle Organization JSON-LD, and further home decluttering (FAQ/proof/contact essays removed).
- Live-confirmed by `WEBSITE-REVIEW-2026-07-15-V207.md`: CDN `jrm4vt.js`, `window.dgFootVersion = v207`, home body about 346 chars, dual hero CTAs, footer links, and working How/Pricing/FAQ routes.
- Verification recorded in the review: `npm run demigod:verify:source` PASS and foot-smoke v207 PASS; freeze was recommended after live confirmation.

## Current live architecture

- Webflow remains the page shell/DOM; runtime code deliberately hides legacy Designer sections instead of deleting them.
- `demigod-head-minimal.html` supplies CSS-first finite unhide safeguards, core brand tokens, external design CSS (`cycbs6.css`), image hints, favicon/meta/social tags, and static Organization/WebSite JSON-LD.
- Head favicon stack: inline geometric-D SVG first, Catbox SVG fallback/`sizes=any`, and the same SVG as Apple touch icon.
- Head metadata is home-oriented: canonical `/`, concise description, hero-based OG/Twitter large card, theme color, Organization and WebSite schemas.
- `demigod-footer-lite.html` is loader/router glue: redirects clean paths to `/?p=…`, sends `/events` to its Catbox page, then loads v207 core from `https://files.catbox.moe/jrm4vt.js`.
- `demigod-foot-core.js` is the sole behavioral source of truth: copy, WIZ configuration/runtime, forms, CTA/nav/mobile bar, honesty scrubs, short-page router, footer, accessibility/performance helpers, and idempotent boot.
- Home is intentionally minimal: hero/brand, one short proposition, “I'm hiring” and “Find a job,” mobile sticky dual CTA, and a small footer.
- Secondary content is rendered as an accessible overlay/dialog from `DG_PAGES` using `?p=`; current implemented surfaces include How, Pricing, FAQ, Hire, Talent, Contact, Legal, Partners, Compare, and likely Pilot per loader routing.
- WIZ deep links use `?wiz=startup|engineer`; forms remain multi-step, one question per screen, with review step and human-review/privacy/pending-service copy.
- Reliability strategy is repeated idempotent boot at immediate/DOMContentLoaded/400ms/1500ms; Organization JSON-LD runtime work is deferred to idle.
- Visual system is gold/cream/black, 12px CTA radii, solid hire vs outlined talent, reduced-motion handling, 44px targets, and a skip link.

## Open issues

- Foot bundle is about 138 KB and still monolithic; optional page code could later split from core.
- Triple boot trades performance for Webflow late-paint reliability; retain until late paint is proven fixed, then simplify.
- Hidden legacy Webflow sections remain DOM/download weight; delete them in Designer when safe.
- Webflow queue-publish API returns 412; UI publish works, but auth needs periodic refresh.
- All mini-pages reuse the hero social image; there are no page-specific OG assets.
- WIZ welcome copy and progress/error/save-resume UX remain candidates for tightening; page-dialog focus trap is still soft although Escape and initial focus work.
- SEO infrastructure remains incomplete: per-route canonical/OG behavior needs validation, plus robots.txt, sitemap, share cards, and title-template coverage.
- Quality gaps remain: live CTA metric CI, Lighthouse budget, 390/1280 visual regression, WIZ CDP playtest, footer/mini-page link checker, and CLS measurement.
- Product/ops items remain pending honestly: OAuth/prefill, dashboards/edit links, calendar, Stripe, SMS, referral tracking, analytics/funnel events, and real-proof surfaces.
- Apple touch icon points to SVG rather than a conventional 180px PNG; app-icon/OG asset packs remain unbuilt.
- Source provenance needs cleanup: v207 core, footer/head changes, backlog, and v207 review are currently uncommitted in the inspected working tree even though the review says v207 is live.

## Documentation updates needed

- Update `WEBSITE-BACKLOG-MEGA.md` to mark Compare shipped if the current `DG_PAGES.compare` live check is accepted; the review already lists Compare in the footer/design verdict while the backlog leaves it open.
- Reconcile C/SEO checkboxes with code: dynamic mini-page title/description work exists, static Organization + WebSite JSON-LD exists, and the home meta description is already under 155 characters; distinguish implemented from live-validated.
- Correct the backlog JSON-LD wording: current WebSite schema uses `CommunicateAction`, not `SearchAction`.
- Mark the footer one-liner and file-upload honesty work complete if current behavior is the accepted definition of done.
- Add explicit v205→v207 release notes (including whether v206 ever shipped), CDN hashes/URLs, publish time, and commit/publish provenance.
- Update the v207 review performance note saying “hero image catbox”: head OG/preload uses the Webflow CDN hero, while runtime background styling references Catbox; describe both paths.
- Record the exact set of `DG_PAGES` routes and which were live-tested; the review currently verifies only How/Pricing/FAQ despite broader footer/loader coverage.
- After committing, link the commit SHA from the v207 review and state freeze status rather than leaving “recommend freeze ON” unresolved.
