# Funnel copy draft — /how, /hire, /talent (for review)

**Why:** the conversion audit found these three pages render 188–357 chars — a founder/candidate
arriving (e.g. from the Pulse) gets almost nothing to trust before the form. This drafts richer,
honest copy in the site's existing voice (matches the FAQ/pricing tone: specific, no overclaim, "we
say so honestly"). **Not applied** — these are `foot-core` `DG_PAGES` edits (foot-lock + 4 version
markers + `foot-smoke` + a publish authorization). Apply when you've approved the copy.

Locations in `demigod-foot-core.js`: `how` 3736–3747 · `hire` 3784–3791 · `talent` 3792–3799.
Keeps the existing classes (`dg-p-lead`, `dg-p-list`, `dg-p-note`) so rendering is unchanged.

---

## `hire` — founder landing (currently 188 chars → build trust before the form)

> **Lead:** Tell us the role and the one outcome a hire must own in their first 90 days. A person
> reads every brief — we only propose when the fit is real, and both sides still have to say yes.
>
> **What happens (list):**
> - You send a ~2-minute brief: role, must-haves, one 90-day outcome, and a cash band.
> - Demigod ranks candidates against that outcome; a human reviews before anything reaches you.
> - You approve before any intro. Pay **10% of first-year cash only when a hire starts** — nothing to post.
>
> **Note:** Why founders use it: no application blast, no résumé black hole, comp bands kept honest.
> SMS and card payments are still pending — commercial follow-ups come by email from
> potter@trydemigod.com, and we say so rather than pretend. [How it works →] · [Pricing →]

```html
'<p class="dg-p-lead">Tell us the role and the one outcome a hire must own in their first 90 days. A person reads every brief — we only propose when the fit is real, and both sides still have to say yes.</p>' +
'<ul class="dg-p-list">' +
'<li><strong>Send a ~2-min brief</strong> — role, must-haves, one 90-day outcome, cash band.</li>' +
'<li><strong>Tech ranks, a human reviews</strong> — against your outcome, before anything reaches you.</li>' +
'<li><strong>You approve before any intro</strong> — 10% of first-year cash only when a hire starts; nothing to post.</li>' +
'</ul>' +
'<p class="dg-p-note">No application blast, no résumé black hole, comp bands kept honest. SMS/card payments pending — follow-ups by email from potter@trydemigod.com. <a href="/?p=how" data-dg-page="how">How it works →</a> · <a href="/?p=pricing" data-dg-page="pricing">Pricing →</a></p>'
```

## `talent` — candidate landing (currently 237 chars → trust + privacy)

> **Lead:** One profile for SF startups. It's free, and it's private — your name and contact details
> are never shared with a company until a human sees a real fit and you approve the intro.
>
> **List:**
> - Free for candidates. Always. No fee, ever.
> - No board spam, no cold-LinkedIn blasts — outreach only when a real role fits.
> - Both sides approve before any intro. Pass privately; no rejection trail.
>
> **Note:** What we ask: strengths, a couple of work highlights, availability, and a cash band —
> enough to match against a real 90-day outcome, not keywords. [How it works →] · [FAQ →]

```html
'<p class="dg-p-lead">One profile for SF startups. It\'s free, and it\'s private — your name and contact details are never shared with a company until a human sees a real fit and you approve the intro.</p>' +
'<ul class="dg-p-list">' +
'<li><strong>Free for candidates.</strong> Always. No fee, ever.</li>' +
'<li><strong>No board spam</strong>, no cold-LinkedIn blasts — outreach only when a real role fits.</li>' +
'<li><strong>Both sides approve before any intro.</strong> Pass privately; no rejection trail.</li>' +
'</ul>' +
'<p class="dg-p-note">What we ask: strengths, a couple of work highlights, availability, and a cash band — enough to match a real 90-day outcome, not keywords. <a href="/?p=how" data-dg-page="how">How it works →</a> · <a href="/?p=faq" data-dg-page="faq">FAQ →</a></p>'
```

## `how` — the model (currently 357 chars → give the three gates real substance)

> **Lead:** A match has three gates. Nothing reaches the other side until all three pass.
>
> **List (ol):**
> 1. **Brief or profile** — startups send a role + one measurable 90-day outcome; talent sends one
>    profile. Real inputs, not keywords.
> 2. **Tech ranks, humans review** — Demigod ranks fits against the outcome; a person reviews every
>    proposal and forwards only when the evidence is real. If it's thin, we say so instead of
>    manufacturing a shortlist.
> 3. **Both approve → intro** — either side can pass privately. A warm intro email only when both say
>    yes. Fee (10% of first-year cash) only if you hire.
>
> **Note:** What it isn't: no public job feed, no application blast, no auto-DMs, no SLA theater.
> [See a fictional match note →] · [Pricing →] · [FAQ →]

```html
'<p class="dg-p-lead">A match has three gates. Nothing reaches the other side until all three pass.</p>' +
'<ol class="dg-p-list">' +
'<li><strong>Brief or profile</strong> — startups send a role + one measurable 90-day outcome; talent sends one profile. Real inputs, not keywords.</li>' +
'<li><strong>Tech ranks, humans review</strong> — Demigod ranks fits against the outcome; a person reviews every proposal and forwards only when the evidence is real. If it\'s thin, we say so instead of manufacturing a shortlist.</li>' +
'<li><strong>Both approve → intro</strong> — either side can pass privately. A warm intro email only when both say yes. Fee (10% of first-year cash) only if you hire.</li>' +
'</ol>' +
'<p class="dg-p-note">What it isn\'t: no public job feed, no application blast, no auto-DMs, no SLA theater. <a href="/?p=sample" data-dg-page="sample">See a fictional match note →</a> · <a href="/?p=pricing" data-dg-page="pricing">Pricing →</a> · <a href="/?p=faq" data-dg-page="faq">FAQ →</a></p>'
```

---

## Honesty check (every claim above traces to existing site truth)
- "10% of first-year cash only when a hire starts / nothing to post" — matches `pricing`.
- "free for candidates, private until you approve" — matches `talent`/FAQ.
- "SMS/card payments pending, follow-ups by email" — matches `pricing`/FAQ (no overclaim).
- "no auto-DMs, no SLA" — matches FAQ + the honesty invariants.
- "a person reads every brief / humans review" — matches `trustSteps` + FAQ.

## To apply (when approved + authorized to publish)
1. Hold the foot lock (`bin/dg-lock`); edit the 3 `DG_PAGES` entries; bump all 4 version markers.
2. `node demigod-foot-smoke.mjs` green (parse + boot).
3. CDN publish → `set_site_freeform_code(footer)` → `publish_site` → `bin/dg truth` live==disk.
4. Re-run `node demigod-conversion-audit.mjs` — the three pages should render materially more chars.
