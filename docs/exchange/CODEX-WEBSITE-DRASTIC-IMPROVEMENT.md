# Codex website drastic improvement review

**Date:** 2026-07-16  
**Scope:** One product-first homepage redesign; no implementation in this review.
## 1. Codex verdict

Grok is substantially right. The site accumulated operational correctness, copy scrubs, and runtime product work while preserving the same visual composition. A version counter is not a design outcome. v564–569 changed what the existing parts say and hide; they did not create a new visual idea.

The sharper diagnosis: `demigod-foot-core.js` has become a second page builder. It rewrites the hero, detects sections by their text, hides stale canvas content, injects navigation and trust UI, restyles the page, and repairs dishonest static copy after load. That is why a green ship can still look unchanged—and why visual changes are brittle, selector-heavy, and vulnerable to FOUC. The frozen Designer canvas is not merely an architectural quirk; it is visual debt.

I would correct three parts of Grok's diagnosis:

1. Honesty and accessibility were not wasted effort. They prevented a polished lie and an unusable product. The failure was counting that necessary substrate as redesign progress.
2. Inspiration research is already sufficient. Another reference sweep has negative value until one direction is implemented.
3. “Drastic” should not mean more sections, effects, or code. It should mean a visibly different hierarchy, palette, typography, and first-screen decision—with less homepage content.

The current dark/gold treatment also reads closer to boutique recruiter or creative studio than a crisp matching product. The copy says “tech”; the page does not yet show a product system.

## 2. What “drastic improve” must mean

### Three-second glance

Without scrolling, a visitor must understand all four facts:

- Demigod matches talent with SF startups.
- Matching software narrows fit; people review the result.
- There are two obvious, equal paths: **I'm hiring** and **I'm looking**.
- An introduction happens only after both sides approve.

The employer path may be visually primary, but the talent path must never look like a footer escape hatch.

### Screenshot test

A before/after pair at 1440×900 and 390×844 must look like a different site even when blurred so no copy is readable. The after image passes only if it has:

- a warm light canvas instead of the current full-page charcoal field;
- one oversized editorial headline, not a centered stack of small marketing elements;
- two large path panels that dominate the first viewport;
- one restrained product artifact showing **rank → human review → mutual approval**;
- materially more whitespace and no link/chip clutter around the hero.

It fails if the visible difference is mostly new words, border radii, gold shades, or hidden sections. It also fails if either screenshot implies inventory, customers, speed, an SLA, automated hiring, hand-matching theater, guaranteed replacement, or live billing that does not exist.

### Product truth

“Tech + humans in the loop” means software structures and ranks fit; a person reviews potential matches; identity moves only after mutual interest. “90-day outcome” is an intake criterion for defining success, not a performance guarantee. Before services are operating, the site promises a review and a consent-based process—not a response time, shortlist size, placement outcome, Stripe checkout, or replacement policy.

## 3. Radical redesign: Operator Calm

Choose **operator calm**, not dark pro. Demigod needs clarity and trust more than mystique. Use a warm editorial canvas with black type, cobalt product accents, and charcoal reserved for the product artifact and footer. This is a clean break from recruiter gold while remaining serious.

### Hero: exact copy

**Eyebrow**  
`SF STARTUP TALENT MATCHING`
**H1**  
`The right people, with signal.`

**Subhead**  
`Demigod tech ranks the fit. A human reviews every potential match. Both sides approve before an intro.`

**Primary CTA**  
`I'm hiring`  
Supporting label: `Share a role`

**Secondary CTA**  
`I'm looking`  
Supporting label: `Share your profile`

**Trust line**  
`SF Bay Area · 10% on hire · Free for talent · No intro without mutual interest`

The two CTAs are 50/50 path panels, not one filled button plus one timid text link. Clicking either opens the existing branched WIZ immediately.

At the right edge on desktop, and below the paths on mobile, show one static product artifact—not fake data:

`01 Ranked by fit` → `02 Human reviewed` → `03 Both approve`

Label it `HOW A MATCH MOVES`, with abstract rows and status marks. Do not show invented candidate names, scores, logos, role counts, or activity.

### Delete from the homepage

- Hero links for How, Pricing, and FAQ; the page itself answers How and Pricing.
- Sample/live role wall and the apologetic “No open roles listed yet.” empty state.
- Featured candidates, public ledger, fake-looking proof strips, and pipeline counters.
- Hero badge dots, trust chips, ornamental pills, gold gradients, and repeated “tech + humans” lines.
- FAQ accordion on home; keep FAQ as a direct footer page only.
- Notes/blog cards, compare, pilot, partners, founders, candidates, status, and method links from primary homepage chrome.
- Duplicate nav CTAs on desktop. Nav contains wordmark, `How it works`, `Pricing`, and one compact `Start` control that reveals the same two paths.
- Sticky desktop CTA bars. Keep one compact two-action mobile bar only after the hero scrolls out.

Deletion is part of the redesign. Do not replace removed clutter with testimonials, logos, metrics, photography, or a manifesto until real proof exists.

### Process section: exact copy

**Heading**  
`A match has three gates.`

**01 — Add the signal**  
`Hiring teams share the role and 90-day outcome. Talent shares work, skills, and constraints.`

**02 — Rank, then review**  
`Demigod tech surfaces fit. A human checks the evidence and tradeoffs.`

**03 — Both say yes**  
`Each side reviews the match privately. We introduce only with mutual interest.`

Use a single horizontal flow on desktop and a vertical numbered stack on mobile. No scroll carousel.

### Pricing card: exact copy

**Label**  
`FOR HIRING TEAMS`
**Price**  
`10%`

**Basis**  
`of first-year cash compensation, only when someone starts.`

**Included**

- `Role and outcome intake`
- `Tech-assisted matching`
- `Human review before intro`
- `Mutual approval`

**Footnote**  
`Free for talent. No charge before a hire. Billing setup is pending.`

**CTA**  
`Share a role`

One card only. Delete package comparison, “most popular,” replacement language, and payment-method imagery.

### Footer

Charcoal block with the wordmark and one sentence:

`SF startup talent matching—tech-assisted, human-reviewed.`

Links: `How it works` · `Pricing` · `FAQ` · `Legal` · `Contact`  
Contact: `potter@trydemigod.com`  
Final line: `© 2026 Demigod`

No social icons, newsletter, sitemap columns, “More pages” tier, pilot link, status link, or second email treatment.

### Visual system

| Element | Rule |
|---|---|
| Type | Use one installed/system grotesk stack: `Inter, ui-sans-serif, system-ui, sans-serif`. H1 72–88px desktop, 46–54px mobile, weight 600, line-height .94. Body 18–20px, line-height 1.5. No new font dependency. |
| Canvas | Warm paper `#F4F1E8`; cards `#FFFEFA`; primary ink `#111318`; secondary ink `#60636B`. |
| Accent | Cobalt `#3157F6` for primary actions/focus; pale cobalt `#E8EDFF` for selected/product states. Charcoal `#15171C` only for the artifact and footer. Remove gold as the primary brand signal. |
| Grid | 12-column, max-width 1200px. Hero 7/5 split. Section padding 112px desktop, 72px mobile. Use an 8px spacing base and large gaps; no content squeezed into decorative cards. |
| Shape | 16px panels, 10px controls, 1px neutral borders. No glassmorphism, glow, gradient mesh, or pill on every label. |
| Motion | 160–220ms opacity/translate or color only. Path cards move at most 4px on hover. Artifact may advance once on load, then stop. No parallax, counters, cursor effects, scroll hijack, or perpetual animation. `prefers-reduced-motion` removes transforms and sequencing. |
| Accessibility | 4.5:1 body contrast, visible cobalt focus ring, 48px action floor, semantic headings, real buttons/links, no information encoded by color alone. |

### Layer map

| Layer | Owns after redesign | Must stop owning |
|---|---|---|
| Webflow Designer | Permanent homepage DOM: nav, hero, two path panels, product artifact, process, pricing, footer; semantic order; static honest fallback copy; modal/form shells. | Stale role walls, candidate cards, agency pricing claims, duplicate footer columns, hidden legacy sections. |
| `demigod-head-styles.css` / `demigod-head-minimal.html` | Tokens and critical above-fold CSS; base typography/layout; deterministic JS-loading state; bounded FOUC protection; reduced-motion baseline. | A second full theme, text-content policy, broad emergency unhiding, and selectors coupled to obsolete canvas sections. |
| `demigod-foot-core.js` | WIZ branching/runtime, form validation, modal focus, submission behavior, mini-page routing if retained, small progressive enhancement for the artifact and mobile CTA. | Building the homepage, sniffing sections by copy, rewriting stable marketing text, hiding legacy layout, injecting nav/footer/process/pricing, and shipping hundreds of CSS declarations in `brandAssets()`. |
| `demigod-footer-lite.html` | One pinned loader only. | Content or visual logic. |

This layer change is essential. Repainting the overlay without fixing ownership would produce another fragile “version” rather than a redesign.

## 4. Implementation plan: one ship

1. **Freeze the brief.** Approve this copy, the Operator Calm tokens, and one desktop/mobile wireframe. No alternative mood branch and no further inspiration work.
2. **Capture before proof.** Save full-page and first-viewport screenshots at 1440×900 and 390×844, plus JS-off screenshots and current Lighthouse/accessibility baselines.
3. **Build the permanent shell in Designer.** Reuse the existing nav, modal/form shells, and classes where safe; replace the visible homepage structure in one unpublished Designer pass. Delete obsolete visible sections rather than hiding them.
4. **Move critical visuals to head CSS.** Implement only tokens, typography, layout, focus, motion preference, and first-viewport stability in `demigod-head-styles.css`; update the minimal head reference once.
5. **Cut foot-core back to product behavior.** In one locked edit of `demigod-foot-core.js`, remove the homepage injection/rewriting/hiding paths made obsolete by the new DOM. Retarget existing WIZ CTA wiring to stable `data-dg-*` hooks. Preserve validation, consent, focus management, honesty guards at true trust boundaries, and routing still in use.
6. **Keep the loader boring.** Change `demigod-footer-lite.html` only if the immutable asset pin changes; add no markup or logic there.
7. **Run one local review loop.** At desktop and mobile verify: three-second comprehension, both WIZ paths, keyboard/focus, reduced motion, JS-on/JS-off truth, no stale claims, no overflow, no hidden content flashes, and no invented proof.
8. **Run the existing gates once the visual review passes.** `npm run demigod:verify:source`, targeted honesty/board checks, then the canonical live/sha gate. Add one small assertion to the existing source verifier for the two path hooks and absence of the deleted homepage injectors; no new framework or meta-tool.
9. **Publish once through the canonical ship path.** One coordinated Designer + head + pinned foot release, one version, one writer, one lock. Do not publish intermediate polish versions.
10. **Capture after proof.** Reproduce the same four screenshots and baselines, then place the before/after pairs beside the release receipt. The release is accepted by visible difference and task completion, not version equality alone.

Ponytail rule: reuse the current WIZ and ship path; use native HTML/CSS for the static page; delete runtime reconstruction; add no dependency, design framework, animation library, or redesign toolchain.

## 5. What to stop doing

- Stop treating a version bump, CDN SHA, or green source gate as evidence of visual progress.
- Stop editing copy in one version, spacing in the next, footer links in the next, and calling the sequence a redesign.
- Stop using `foot-core` as a runtime CMS and page builder for stable homepage content.
- Stop preserving bad Designer sections behind `display:none`; delete or replace them at the source.
- Stop adding scrub patterns for every new synonym of an old false claim. Remove the false static claim once.
- Stop commissioning more inspiration, strategy, agent panels, and merged syntheses before this direction ships.
- Stop parallel homepage writers. One brief, one owner, one locked foot edit, one ship.
- Stop showing sample inventory merely to make the marketplace look active.
- Stop adding pages and footer links to prove completeness. Pre-services trust comes from clarity and restraint.
- Stop optimizing the FAQ, Notes, status, compare, pilot, and edge routes while the first viewport lacks a strong product identity.
- Stop decorative motion that does not explain ranking, review, or approval.
- Stop measuring effort. Measure whether a stranger can identify the product, audience paths, mechanism, and terms from one screenshot.
