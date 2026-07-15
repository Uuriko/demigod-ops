# Demigod website mega backlog (simple first)

**Principle:** Home = decision screen (brand + 1 line + 2 CTAs). Extra content lives on short secondary pages (`/?p=…`). No essay walls on home.

**Legend:** `[x]` ship-ready this wave · `[ ]` later · `!` needs real ops data

---

## A. Core conversion (home)
- [x] Dual path CTAs: I'm hiring / Find a job
- [x] Short hero (one H1 + one subline)
- [x] Mobile sticky dual CTA bar
- [x] Hide process/pricing/roles essays on home
- [x] Favicon (geometric D)
- [x] Hero entrance micro-animation (reduced-motion safe)
- [ ] Nav logo → home only (no dead links)
- [ ] Keyboard focus ring consistency on all CTAs
- [ ] Trust micro-line under CTAs (optional 1 short line only)
- [ ] Scroll-hint only if content exists below fold

## B. Secondary pages (short)
- [x] How it works (`/?p=how`) — 4 steps max
- [x] Pricing (`/?p=pricing`) — 10% on hire + pending honesty
- [x] FAQ (`/?p=faq`) — 5 short answers
- [x] For startups (`/?p=hire`) — 3 bullets + CTA
- [x] For talent (`/?p=talent`) — 3 bullets + CTA
- [x] Contact (`/?p=contact`) — email only
- [x] Privacy / Terms (`/?p=legal`) — short plain language
- [x] Partners / refer (`/?p=partners`) — 20% note + email
- [x] Compare vs boards/agencies (`/?p=compare`) — 3-column simple
- [x] Pilot program (`/?p=pilot`) — white-glove 1-pager
- [ ] Events index (already catbox) polish
- [x] About (1 paragraph, no founder names)
- [ ] Press kit (logo + one-liner)
- [x] Status / services pending page
- [ ] 404 friendly page

## C. Routing & SEO
- [x] Footer-lite path redirects: /how /pricing /hire /talent /faq /legal /partners → `/?p=`
- [x] Deep link `?p=` + `?wiz=`
- [ ] Canonical tags per mini-page
- [ ] Open Graph per mini-page title/description
- [ ] robots.txt allow public pages
- [ ] sitemap.xml with home + p-routes
- [x] JSON-LD Organization (+ WebSite schema; not SearchAction) — head/runtime
- [ ] Title template: `{Page} · Demigod`
- [ ] Share cards for hire/talent

## D. Wizard (WIZ) UX
- [x] One-question stepper (existing)
- [x] 90-day outcome required for startups
- [x] Review step before submit
- [x] Shorter welcome copy
- [ ] Progress % clarity
- [ ] Save & resume toast (1 line)
- [ ] Better error states (inline, not alert)
- [x] Success screen with next steps (3 bullets max)
- [ ] OAuth LinkedIn prefill (pending honest)
- [ ] Google for startups (pending honest)
- [ ] File resume upload honesty message
- [ ] Mobile keyboard: inputs 16px (existing)

## E. Trust & honesty
- [x] No fake 48h SLA
- [x] Pending SMS/payments language
- [x] Sample roles labeled (when shown)
- [ ] Hide sample board until real ≥1 placement `!`
- [ ] Proof page only when real receipt exists `!`
- [ ] Public ledger honesty strip

## F. Design system
- [x] Gold / cream / black tokens
- [x] 12px radius CTAs
- [x] Hire solid / talent outline
- [ ] Shared button component tokens in head CSS only
- [ ] Spacing scale (8px grid)
- [ ] Type scale clamp for H1/body
- [x] Focus-visible gold ring sitewide
- [ ] Reduced motion policy documented

## G. Performance
- [x] Hero image priority
- [x] Lazy below-fold images
- [ ] Defer non-critical foot work after first paint
- [ ] Avoid triple boot if possible (keep reliability)
- [ ] Preconnect catbox only
- [ ] Compress / optimize hero asset
- [ ] No layout thrash on run()
- [ ] Measure CLS on mobile

## H. Accessibility
- [x] Skip link
- [x] Modal aria labels on CTAs
- [x] Soft focus trap on mini-pages (WIZ trap still soft)
- [ ] Escape closes mini-pages
- [ ] Color contrast audit (gold on black)
- [ ] Touch targets ≥44px everywhere
- [ ] Screen reader names for icon-only controls

## I. Content (keep short)
- [x] Homepage copy cut
- [ ] Meta description rewrite (≤155 chars)
- [ ] Footer one-liner only
- [ ] Email templates (ops, not site)
- [ ] Thank-you page copy A/B
- [ ] 3 founder testimonials only when real `!`
- [ ] Role examples only when real `!`

## J. Product features on site
- [ ] Match status page (token link) `!`
- [ ] Founder dashboard stub (pending)
- [ ] Candidate profile edit link
- [ ] Calendar booking for intro (pending)
- [ ] Stripe checkout (pending honesty)
- [ ] SMS opt-in (pending)
- [ ] Referral tracking code page
- [ ] Intro email preview (internal)

## K. Ops / quality
- [x] Source verify gate
- [x] Foot smoke
- [ ] Live CTA metric script in CI
- [ ] Lighthouse budget (perf ≥80 mobile)
- [ ] Visual regression 390/1280
- [ ] WIZ CDP playtest green
- [ ] Link checker (footer + mini-pages)
- [ ] Freeze after green ship

## L. Brand assets
- [x] Favicon SVG
- [x] Hero background
- [ ] App icon 180/512 PNG pack
- [ ] OG image 1200×630
- [ ] Simple logo wordmark SVG
- [ ] Empty-state illustrations (optional, minimal)

## M. Analytics & feedback (honest)
- [ ] Plausible or privacy-light analytics
- [ ] CTA click events only (no PII)
- [ ] WIZ funnel step events
- [ ] Feedback mailto with page context

## N. Legal / policy
- [x] Short privacy/terms mini-page
- [ ] Cookie notice only if analytics added
- [ ] Data retention one-liner

## O. Nice-to-have polish
- [ ] Subtle gold grain on hero
- [ ] Button press state
- [ ] Page transition fade for mini-pages
- [ ] Prefetch wiz on hover CTA
- [ ] Offline-ish static shell for events

---

## This wave implementation priority
1. Simple mini-pages router in foot-core + footer links + path redirects  
2. Short content only  
3. SEO meta on mini-pages + document title  
4. Perf: lighter home run path  
5. Full code/design review → fix  


---
**Last reconciled:** 2026-07-15 with live v207 + `DEMIGOD-SESSION-STATUS-2026-07-15-WEBSITE.md`.


**v208 shipped live** `ixb392.js` — shorter WIZ, About/Status, focus rings, page focus trap.
