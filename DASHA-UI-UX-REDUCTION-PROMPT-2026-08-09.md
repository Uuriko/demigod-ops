---
status: reference
scope: Dasha public website UI/UX reduction
updated: 2026-08-09
---

# Dasha UI/UX reduction — research, decide, implement, verify

Act as Dasha's product designer, interaction designer, content designer, accessibility reviewer and
front-end engineer. Improve the existing public product by removing redundant copy, duplicate
actions and visual competition. This is a reduction pass, not a redesign contest and not permission
to add features. The result should feel faster, clearer, more elegant and more confident on both a
390px phone and a 1440px desktop while retaining Dasha's distinctive visual character.

## Product and scope

Work only on Dasha and the five public routes:

1. Home `/`
2. Studio `/studio`
3. Desk `/dasha`
4. Lobby `/lobby`
5. How to Buy `/how-to-buy`

Do not touch Demigod, the archived game, thesis cards, conviction receipts, forecasting products or
retired experiments. Do not revive removed disclaimer copy, Telegram, generic crypto copy, invented
token utility, price claims, fake engagement or unproved endorsements.

Begin with current truth: `DASHA-NOW.md`, `DASHA-PRODUCT-BRIEF.md`, `DASHA-ROADMAP.md`,
`DASHA-CLAIMS.md`, `DASHA-THREAT-MODEL.md`, the live pages and each route's canonical source. Treat
rendered behavior and current release receipts as stronger evidence than historical design notes.

## Research cadence

Search before inventory, again before selecting the batch, and once more before verification. Prefer
primary standards and platform guidance over inspiration galleries: W3C/WAI for accessibility,
web.dev for responsive interaction, Apple and Material for platform behavior, and public design
systems with tested component guidance. Use visual references only to study hierarchy, rhythm and
composition; never copy their brand language or ornamental surface treatment.

Each search must answer a live design question. Record the rule it supports, the exact element it
changes, and whether it justifies deletion, demotion or preservation. If research does not change a
decision, do not turn it into new copy or a new feature. Re-check current sources when guidance may
have changed, and retain links so the reasoning can be audited later.

Use these questions repeatedly:

1. Is this action discoverable without being repeated?
2. Does the control meet keyboard, focus, contrast and touch-target requirements?
3. Does a phone viewport preserve the same job without duplicating desktop chrome?
4. Is feedback singular, local and announced accessibly?
5. Does this element earn its visual weight?

Do not search indefinitely. Stop researching a decision when two authoritative sources agree and the
rendered interface supplies enough evidence to act. The purpose of browsing is a smaller, sounder
interface—not a larger design document.

## Desired feeling

The site should be:

- elegant, concise, mysterious and fun;
- visually bold without making every object loud;
- understandable by doing, not by reading instructions;
- quick enough that a first-time phone visitor can act without studying the page;
- recognizable across routes without forcing every route into the same layout;
- comfortable to scan, tap, type, edit, export and share;
- culturally specific rather than generic “Web3.”

Less is more. Deletion is the default move. Preserve a line only when removing it makes the next
action, trust boundary or outcome materially less clear. Preserve a control only when it performs a
distinct, likely action that cannot be expressed more naturally through an existing control.

## Evidence-based interface rules

Apply these as operational constraints:

- Give each viewport one obvious primary action and at most one competing prominent secondary
  action. Apple advises keeping prominent actions to one or two per view; GOV.UK similarly warns
  that multiple primary buttons make the next step harder to identify.
- Keep interactive hit regions at least 44×44 CSS pixels where practical. Do not make a control
  visually huge merely to satisfy the hit area; padding can supply the target.
- Use progressive disclosure for secondary tools, detail and account state. Hidden content must
  have an obvious reveal and must not conceal the primary action.
- Make controls visually distinct from content. A decorative tile must not look clickable unless it
  is clickable; a clickable object must have focus, hover/pressed and accessible-name states.
- Use native elements and behavior before custom interaction: links for navigation, buttons for
  actions, labels for fields, `details` only when its disclosure behavior genuinely fits, native
  share where available and a clear fallback where it is not.
- Keep action labels short verbs that state the result: `Open Studio`, `Save`, `Share`, `Copy mint`,
  `Join`, `Leave`. Do not add helper paragraphs to explain vague labels; repair the label.
- Group related items with alignment and space rather than boxes, borders, headings and prose all at
  once.
- Put essential content early in reading order. Move supporting evidence later or behind a clear
  disclosure.
- Never hide required navigation on mobile without an equally clear replacement.
- Preserve visible focus, keyboard activation, reduced motion, readable contrast, error feedback,
  safe areas and scrollability.

Primary references:

- [Apple Human Interface Guidelines — Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple Human Interface Guidelines — Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- [Apple Human Interface Guidelines — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [GOV.UK Design System — Button](https://design-system.service.gov.uk/components/button/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## Phase 1 — inventory the rendered product

Inspect every route at 390×844 and 1440×900. Record, in rendered order:

- headings and subheadings;
- paragraphs, captions, labels, status text and legal/trust copy;
- links and their destinations;
- buttons and their actions;
- fields and their labels;
- toggles, segmented controls, chips and selectors;
- repeated mint displays;
- repeated navigation;
- cards that look actionable;
- controls hidden at each breakpoint;
- sticky or fixed controls;
- empty, loading, error and signed-out states.

For each copy block ask:

1. Does it change the next action?
2. Does it state a load-bearing trust or permission boundary?
3. Does it add specific Dasha voice or culture?
4. Is the same idea already visible nearby?
5. Can the interface demonstrate it instead?

Delete or compress copy that fails the first three questions or duplicates another answer.

For each control ask:

1. Is it used for a distinct likely action?
2. Is it the best native control for that action?
3. Is its consequence obvious before activation?
4. Does it duplicate a nearby control or destination?
5. Does it deserve its current visual prominence?

Remove duplicate controls. Demote legitimate secondary controls visually or place them behind one
clear disclosure. Never hide exact-mint verification, destructive-account actions, consent or the
only route to an essential feature.

## Phase 2 — trace the core jobs

Evaluate the minimum action path for each route:

- Home: recognize Dasha → choose Studio, Quiz/Lobby, verify or buy.
- Studio: choose an image or use the current one → edit → save/share.
- Desk: confirm the mint → inspect chart/source or buy.
- Lobby: choose a nick/link X if desired → read or send a message.
- How to Buy: obtain SOL → verify mint → open the exact swap → confirm.

Count visible decisions before the core action. Count taps, not merely screens. Identify the first
point at which a newcomer must interpret multiple equally prominent choices. Reduce that point
without deleting a meaningful job.

Do not optimize every route toward buying. Studio's primary job is creation; Lobby's is chat; Desk's
is verification. A site-wide CTA does not deserve primary styling on every screen.

## Phase 3 — assess copy at three levels

### Remove

Delete:

- text that describes what the visible control already shows;
- repeated labels above self-explanatory sections;
- slogans repeated more than once per route;
- process copy before the user needs it;
- generic “community,” “culture,” “platform,” “ecosystem” or “experience” claims;
- defensive copy that does not protect a real trust boundary;
- status prose that can be a short state label;
- labels whose only purpose is to introduce another label.

### Compress

Turn:

- sentences into direct labels;
- two headings into one;
- long button labels into verbs plus objects;
- repeated mint explanations into one visible mint and one copy action;
- multi-line instructions into the single next action;
- repeated navigation into one consistent route set.

### Preserve

Keep only the narrowest necessary forms of:

- the exact mint;
- image/source attribution where required;
- CC0 scope and the Dasha name/likeness carve-out;
- OAuth consent and Board opt-in/leave meaning;
- honest editorial versus measured Board identity;
- error recovery;
- state that cannot be inferred visually.

Voice should be short, dry and specific. Do not imitate another brand by name. Avoid trying to sound
“internet.” If a line calls attention to its own cleverness, remove it.

## Phase 4 — simplify each surface

### Home

- Preserve a strong visual opening and one primary action.
- Keep every public route discoverable without presenting five equal hero buttons.
- Prefer a compact navigation spine plus contextual links within sections.
- Remove repeated explanations of Studio, Lobby, Quiz and Board when the interactive artifact is
  already visible.
- Keep the contract address easy to find and copy, but do not let multiple identical mint blocks
  dominate the page.
- Preserve one exact-mint buy route; do not add a wallet modal or second venue.

### Studio

- The canvas/output is the hero, not the toolbar.
- Show only the controls required for first output: image, line, one compact style path, Save/Share.
- Put formats, filters or fine adjustments behind one coherent control only if they remain useful.
- Avoid separate buttons that apply minor variants of the same action.
- Maintain mobile scrolling and keep the canvas visible while editing.
- Preserve undo/reset only if their scope is obvious.
- Empty and error states should offer one recovery action.

### Desk

- Optimize for verify → inspect → buy.
- Show the mint once prominently with a dependable copy action.
- Keep chart/source links visually secondary to verification and the exact buy route.
- Avoid dashboard-card proliferation, duplicated status labels and speculative market commentary.
- Keep live-data freshness visible only when the underlying data is actually live.

### Lobby

- The room should look like chat, not an admin panel.
- Keep identity setup, message history, composer and one compact presence/state area.
- Remove duplicate headings, explanatory banners and low-value message actions.
- Keep X linking optional and visually secondary until needed.
- Preserve moderation, rate-limit and connection feedback without persistent warning chrome.
- On mobile, the composer must remain reachable above browser/keyboard safe areas.

### Quiz and Simp Board

- Keep one question per view and make the answer itself the dominant interaction.
- Numeric keyboard shortcuts must work on desktop without adding visual clutter on mobile.
- Do not explain scoring before it matters.
- Keep X linking at the moment it is required to reveal/save a scored result.
- Distinguish editorial and measured rows without a paragraph of caveats.
- Keep Join, Leave and Share available only in the state where each action makes sense.

### How to Buy

- Preserve the exact sequence and exact mint.
- Prefer four direct steps over explanatory sections.
- One primary external swap link is enough.
- Avoid repeating the mint in prose when the copyable mint block is adjacent.

## Phase 5 — rank changes before editing

For every proposed deletion or demotion, record:

- route and exact element;
- current job;
- evidence that it is redundant or over-prominent;
- proposed change;
- risk of confusion after removal;
- mobile effect;
- desktop effect;
- accessibility effect;
- test needed.

Rank by:

1. removes a duplicated decision;
2. shortens the core action path;
3. improves mobile scanning or tapping;
4. clarifies primary versus secondary action;
5. reduces maintenance;
6. preserves or improves trust.

Implement one cohesive batch. Do not scatter unrelated cosmetic tweaks across every source simply to
claim broad coverage.

## Current execution brief — 2026-08-09

Run this prompt against the current rendered sources, not an imagined redesign. The initial mobile
and desktop inventory found a narrower, evidence-backed batch:

1. **Home:** keep the hero, exact mint, Studio, Board, contribution path and bounded footer sitemap.
   Remove the ticker, campaign-like Board preamble and repeated “Edit this” labels. Keep the three
   starter tiles visually and programmatically clickable. Replace token-section throat-clearing with
   a direct `$dasha` heading. Reduce vertical gaps after deletions rather than leaving empty stages.
2. **Studio:** make the generated image the first substantial object. Remove the eyebrow that merely
   repeats the page title and remove sitewide buying/Desk actions from the editor header. Retain the
   short CA link because it is a persistent identity check. Keep one primary Share action, Save as
   secondary, and Edit as the single instant variation action. Keep specialist exports under one
   disclosure. Tighten the rights line without changing its meaning.
3. **How to Buy:** keep the three-step sequence and the full copyable mint. Remove the portrait/source
   card and one-line explanations that restate each heading. Attach the source link to the mint step,
   where provenance matters. Flatten decorative cards into a calm numbered sequence.
4. **Navigation:** Home remains the bounded directory. Task pages show only Home/brand plus controls
   relevant to that task; the footer remains the second route-finding mechanism. Repeated functions
   use the same names: Studio, Lobby, Desk, How to buy, Copy mint, Share and Save.
5. **Quiz result:** keep one adaptive Share action: native image sharing when supported and the
   existing X intent fallback otherwise. Do not show separate Post-on-X or copy-invite controls that
   duplicate that action and its challenge URL. Keep errors and user-triggered outcomes in the polite
   status region, but clear routine board-load success text once the board itself is visible.

Measure the batch by visible decision count and word count, not by the number of CSS edits. At 390px,
the Home hero must still expose its primary creation action and contribution path; Studio must expose
canvas, caption, image, look and output actions without horizontal scrolling; How to Buy must expose
the full sequence without decorative duplication. At 1440px, preserve deliberate negative space and
do not stretch compact controls merely because room exists.

Before stopping, run route-specific browser tests at 320, 390 and 1440 pixels, serious/critical axe
checks, contrast tests, interaction tests for every retained control, and a fresh screenshot review.
If a deletion breaks route discovery, mint provenance, the creation flow or rights clarity, revert
that deletion—not the entire reduction pass. Prepare only; publishing remains a separate explicit
request.

## Phase 6 — implementation constraints

Follow Ponytail: delete first, reuse existing rules, use native HTML/CSS, add no dependency and stop
at the smallest change that works. Edit only canonical sources. Regenerate derived embeds/assets
with their existing builders; never hand-edit generated copies. Preserve unrelated work in dirty
shared worktrees.

Do not change visual identity wholesale. Keep the established palette and strong typography unless
measured readability or hierarchy requires a local adjustment. Prefer spacing, grouping, weight and
one primary color treatment over adding boxes, borders, gradients or icons.

Do not publish without explicit authorization in the current request.

## Phase 7 — prove the result

Before and after the change, measure:

- visible word count per route and viewport;
- visible interactive-control count per route and viewport;
- prominent-action count above the fold;
- taps/clicks to each core outcome;
- touch targets below 44×44;
- horizontal overflow;
- focus order and visible focus;
- critical/serious accessibility violations;
- pixel-level contrast;
- console and network errors;
- every affected link, button and form;
- Studio mobile scroll and export;
- quiz numeric shortcuts and mobile answers;
- Lobby composer/reconnect behavior;
- exact mint and external route integrity;
- generated artifact alignment.

A cleaner screenshot is not proof if a core action disappeared. A passing static test is not proof
if the live interaction is broken. Compare the rendered routes directly.

Success means the core action is more visually obvious, total copy/control load falls, no essential
route or trust boundary disappears, and all relevant interaction/accessibility gates pass.

## Final report

Report:

1. what was measurably busy;
2. what was removed, merged or demoted;
3. what was deliberately preserved;
4. before/after word and control counts;
5. mobile and desktop verification;
6. remaining ambiguity or unproven judgment;
7. publication status and exact identity if publication was separately authorized.

Lead with the result. Do not defend every deletion with an essay; the interface should provide the
proof.
