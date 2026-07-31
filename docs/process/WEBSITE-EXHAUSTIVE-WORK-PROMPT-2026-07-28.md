# Exhaustive website work prompt (self-execute)

**Product:** Demigod / trydemigod.com — SF startup talent matching, humans in the loop, 10% on hire.  
**SoR:** `demigod-foot-core.js` + footer-lite + head CSS/minimal. Release: `bin/dg truth` only.  
**Authority:** Publish CDN/CM6/events-config when useful (user standing ship authority this session).  
**Out of scope:** Eat the Sounds, Stripe, auto-DM, inventing pilots/receipts, fake SLA/volume.

## Research anchors (use while working)

- **Technical SEO (Webflow):** one H1/page, canonicals, meta title/description, schema (FAQ/Organization), sitemap + robots, Core Web Vitals (LCP/INP/CLS), no duplicate URLs.  
  Sources: Webflow technical SEO, Webflow SEO checklists 2026.  
- **Marketplace UX:** dual CTAs (hire vs talent), short trust under CTAs, mobile sticky CTAs, honest proof only, forms = primary conversion.  
  Sources: talent marketplace landing-page practices.  
- **A11y:** WCAG 2.2 AA checklist (A11Y Project / DigitalA11Y): focus-visible, 44px targets, contrast, labels, keyboard, live regions.  
- **Local gates:** `demigod-seo-audit`, `demigod-route-health`, `demigod-axe-routes`, `demigod-lighthouse`, `bin/dg truth`, WIZ CDP playtest.

## Current baseline (must re-check)

- Foot sealed **v851** disk=live.  
- Bare aliases: 301s live (refer/map/press/partners…).  
- Events config: was current after last publish (quick tunnel may rotate).  
- FAQPage schema on `/faq`. Dual H1 fixed on product pages.

## Workstreams (execute in order; skip only if already green)

### A. Integrity & observability
1. `bin/dg truth` + live-attest.  
2. Events status → heal if needed → **publish-config** if config stale.  
3. `demigod-route-health` — bareAliases empty.  
4. `demigod-seo-audit` — zero multi-H1; FAQ schema; meta length 80–160.  
5. `demigod-axe-routes` — 0 serious/critical.  
6. `demigod-lighthouse` — note LCP/CLS; a11y ≥90 if scored.  
7. CDP console sweep home/hire/talent/events/map.

### B. SEO / discoverability (foot + Webflow where needed)
8. Sitemap: ensure robots points at sitemap; note missing pretty paths if any.  
9. OG/Twitter: title, description, **url**, prefer hard paths; consider default `og:image` if missing.  
10. Title template consistency `{Page} · Demigod` on all DG_PAGES.  
11. JSON-LD: Organization + WebSite honest; FAQPage only on faq; no fake ratings/AggregateOffer.  
12. Share-friendly hire/talent meta (conversion keywords without false claims).  
13. Soft 404 / notfound UX + internal links.

### C. Conversion UX (home + WIZ)
14. Trust line under dual CTAs (honest, short).  
15. Mobile bar labels + 48px targets.  
16. WIZ: progress N of M · %, inline errors, resume toast, resume file honesty.  
17. Form attribution/referral notice integrity.  
18. Success screen next steps (no fake SLA).  
19. Sample board still labeled sample.

### D. Secondary pages
20. how / pricing / hire / talent / faq / legal / refer / events / map / press / sample — short, scannable.  
21. Events: no overclaim; API errors degrade honestly.  
22. Directory/map load failure copy.  
23. Press kit one-liner accuracy.

### E. Performance / a11y polish
24. Hero image priority / lazy below fold.  
25. Reduce layout thrash on `run()` if cheap.  
26. Focus-visible sitewide (CTAs, WIZ, page close).  
27. Contrast gold-on-black spot check.  
28. Reduced-motion respected.

### F. Ship
29. Bump foot version for any code change.  
30. `bin/dg ship prepare` → `DEMIGOD_CURRENT_REQUEST_PUBLISH=1 bin/dg ship run`.  
31. Re-run A gates post-ship.  
32. Write receipt under `/tmp/dg-busy/website-exhaustive-*.json`.

## Stop conditions
- Gates green and no unblocked website P0/P1 left, or blocked only on human CF login / Webflow API token.  
- Never invent business metrics on the public site.

## Done definition
Public site healthier on truth + SEO + a11y + routes + events config; every code change verified and shipped if it improves live.
