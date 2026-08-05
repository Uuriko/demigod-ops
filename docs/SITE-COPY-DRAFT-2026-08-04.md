# trydemigod.com — one-page draft

**Not published. Draft copy for review.** Publishing requires explicit
authorization; this is a file.

Premise from `DEMIGOD-FIRST-PRINCIPLES-2026-08-04.md`: at zero placements the
site's only job is to make **one specific founder send an email**. Not to run a
marketplace. Every element below either serves that or is cut.

Three changes from the live site:
1. The consent mechanic becomes the headline instead of a supporting detail
2. The retention argument replaces the match-quality implication — it's the one
   claim the causal evidence actually supports
3. One CTA, email. No dual path, no candidate form, no three-step diagram — the
   forms imply a queue of roles that does not exist

---

## Draft A — the consent mechanic leads

> # Names move only after both sides say yes.
>
> I place engineers at SF seed startups. One role at a time, read by a person.
>
> No résumé goes to a company, and no company sees a name, until both sides have
> agreed to the introduction. That's not a policy page — it's how the whole thing
> is built.
>
> **[ Email me about your role → potter@trydemigod.com ]**

### Below the fold

> ## Why this matters for your first hires
>
> Referred and vetted hires are 10–30% less likely to quit than applicants who
> come in cold. On a team of five, one early departure is a quarter of your
> runway spent twice.
>
> I'm not going to tell you I find better engineers. The research doesn't support
> that and neither would I. What referral and human review actually buy you is
> **people who stay**.

> ## How it works
>
> You tell me the role, the real constraints, and what you can pay. I read every
> profile myself — no keyword filter, no score, no AI verdict deciding who you
> see. When I think there's a fit, I ask both sides before any name moves.
>
> SF Bay Area only. Seed and Series A. Engineering roles.

> ## What it costs
>
> [ TBD — see pricing note below. Do not ship the current 10%-on-hire line
> unchanged. ]

> ## Who I am
>
> [ Potter — needs 2–3 sentences of specific, verifiable background. This is the
> single highest-leverage paragraph on the page and I can't write it for you.
> At zero placements, you are the proof. ]

> ---
> Looking for a role instead? Send me your background: potter@trydemigod.com

---

## Draft B — the constraint leads

> # I only do SF seed-stage engineering roles, and I read every profile myself.
>
> One person, one role at a time. Names move only after both sides say yes.
>
> **[ Email me about your role → potter@trydemigod.com ]**

Draft A leads with the mechanic that is genuinely rare. Draft B leads with focus,
which is the more common opening and reads as more conventional. **A is the
stronger bet** — it says something no competitor's site says, and it is true.

---

## Notes on what I could not write

**Pricing.** The live site says 10% on hire. The first-principles doc argues
that's roughly half market rate, contradicts the premium positioning, and applies
a volume model to a low-volume practice. But the replacement is a business
decision — retainer, fixed engagement, or a higher contingency — and it depends on
what you can defend in a conversation. I left it as a placeholder rather than
inventing a number for a live site.

**Who I am.** The most important block on the page. At zero placements the
operator *is* the product, and any specific claim about your background has to be
true and yours. A fabricated bio on a site whose entire premise is honesty would
be self-refuting.

## What I deliberately removed

| Element | Why |
| :--- | :--- |
| Candidate intake form | implies a queue of employer roles; there are three and all are samples |
| Dual CTA | splits attention; at n=0 there is one buyer to convince |
| Three-step process diagram | describes a system, not a person — and the system isn't running yet |
| "GET MATCHED TO SF STARTUPS" | the structural honesty problem: a form promising matches from an empty board |

The candidate side survives as one line at the bottom. That is honest — you *will*
read what people send — without implying an operating pipeline.

## Before publishing

- `node demigod-live-honesty-audit.mjs` — no banned claims in served HTML
- `bin/dg truth` — disk/live parity, board honesty
- The site is Webflow; changes go through the Designer or the `bin/dg` ship spine,
  not by editing this file
