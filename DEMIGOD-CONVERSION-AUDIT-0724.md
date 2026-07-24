# Conversion-path audit — 2026-07-24 (rendered DOM, live v819)

Method: `demigod-conversion-audit.mjs` drove the live Chrome via CDP through the funnel and measured
the **rendered** DOM after `foot-core` executed (not served HTML) — per the retro rule "measure the
artifact users get." Read-only (navigate + evaluate; no submit, no publish).

## Rendered-DOM facts

| Page | Title (branded?) | Hero line | Body text chars | Dishonest copy rendered? | Render glitches |
|------|------------------|-----------|-----------------|--------------------------|-----------------|
| home | ✓ Demigod · SF startup talent matching | `D E M I G O D` | **996** | none | none |
| how | ✓ How it works · Demigod | How it works | **357** | none | none |
| hire | ✓ Hire · Demigod | Hire talent | **188** | none | none |
| talent | ✓ Talent · Demigod | Join the talent network | **237** | none | none |
| startups | ✓ | REVIEWED STARTUP SUBMISSIONS… | 59,052 | none | none |

## Findings, ranked

**P1 — The funnel destinations are content-starved.** The three pages a skeptical founder/candidate
must pass through to convert render **188–357 characters** of body text each. `/how` (357 chars) is
the trust-builder — it cannot actually explain "tech ranks, humans review, mutual intro only" in that
space. `/hire` (188) and `/talent` (237) drop the visitor almost straight onto a form with no
reassurance, no "what happens next," no proof. A person arriving from the Pulse or a cold link gets
almost nothing to believe before being asked to commit. This is the single biggest conversion leak.
*Fix-owner: foot-core `DG_PAGES` copy (foot-lock + smoke + publish). Needs a publish authorization.*

**P2 — The homepage leads with the brand name, not a value proposition.** The hero renders
`D E M I G O D` (letter-spaced wordmark). A first-time visitor sees *who* before *what/why*. The
value prop lives in ~996 chars below the fold-ish. For a cold visitor this costs the 5-second "what
is this" test. *Fix-owner: foot-core hero copy / Designer.*

## Positives confirmed on the rendered artifact (not assumed)
- **The honesty scrubs actually work for users.** Zero dishonest copy (`Human-Matched`, `FIND TALENT`,
  `hello@`) renders on any page — confirming the live honesty gap is **crawler-only**, not
  user-facing. (Independent confirmation of the `demigod-live-honesty-audit` finding, via rendered DOM.)
- **No render glitches** anywhere — no `undefined`/`NaN`/`[object Object]`/unrendered templates.
- **All titles branded + honest.** No unbranded/"Untitled" titles in the funnel.
- **The directory renders rich** (59k chars) — the Pulse's destination works.

## What this means
The site is *honest and not broken* — but it's *thin* exactly where it needs to persuade. The demand
work (Pulse) points traffic at pages that don't yet do the persuading. Highest-leverage copy work:
write real `/how`, `/hire`, `/talent` content (the model, the proof, what-happens-next) — foot-gated,
so it needs the foot lock + a publish go-ahead, and is best done now while the write-swarm is frozen.
