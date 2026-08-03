# CDN outage and honesty (2026-07-17) — **CORRECTED: the premise was wrong**

> **Status: this document originally justified a head-layer Sample labeller on a claim I later
> disproved. Kept as the record of the error and its measurement.**

## The claim I made, and why it was wrong

I reported: *"with the foot CDN blocked, 3 fabricated role-cards render with 0 Sample badges — real users
see invented jobs advertised as real."*

**False.** I counted `document.querySelectorAll('.role-card').length === 3` — DOM **presence** — and never
checked whether the cards were **visible**.

## What is actually true (measured: CDP-blocked `*foot-latest.js*`, rendered live, full page scroll)

| | control | foot blocked |
|---|---|---|
| page renders | 1323 chars | **314 chars, NOT blank** ✓ (07-08 blank-page class stays fixed) |
| CTAs | "I'm hiring / I'm looking" | **"I'M HIRING" present** ✓ — user can still convert |
| banned copy | 0/6 | **1/6** — h1 reverts to "SF STARTUP TALENT. HUMAN MATCHED." |
| `.trust-section` | `block` | **`display:none`** |
| role-cards **visible** | 3 | **0** (in DOM: 3, boxes `0x0`) |
| fake job text readable | yes (labelled Sample) | **FALSE** |
| `mailto:hello@` | 0 | **0** ✓ (head-layer scrub, needs no CDN) |

**The foot is what reveals `.trust-section`.** With the foot dead the section never renders, so the
fabricated listings are never seen. **A CDN outage costs the h1 only** — which is exactly what the
long-standing note said. I "corrected" a note that was already right.

Two traps, one inside the other:
1. **Presence ≠ visibility.** Use `getBoundingClientRect()` + computed style + an ancestor walk. The
   hider was an ancestor (`SECTION.trust-section`), not the card.
2. **No-scroll artifact.** My first "cards are hidden" reading could itself have been wrong, since
   Webflow IX reveals on scroll. Only a full page scroll + `scrollIntoView` settled it.

## Consequences

- The head `.dg-sample-tag` labeller in `dg-early-copy-scrub` was shipped for a scenario that cannot
  happen, costing **798 bytes** of a **50,000-char capped** head.
- Its only residual value: *foot boots but its labelling breaks*. That is already covered by
  **`core:sample-badge-scrub`** (neg-tested 07-17).
- **It is coupled to `head:sample-badge-scrub`** (added at my request): deleting the block turns
  `verify:source` RED. **Remove the gate first, then the block** — otherwise the tree is red and peers
  cannot ship.

## What still stands

- **JS-off / scrapers** still read the raw canvas: fabricated listings, `pre-vetted` on `/pricing`,
  Human-Matched variants. **No head/foot fix reaches that** — canvas-only, behind Webflow MCP re-auth.
- Head budget: caps at **50,000 and fails SILENTLY** (200 + "saved" + verifying readback while the server
  keeps the old head; 83 min lost on 07-16). Long rationale belongs in `docs/`, never in the head paste.
