# Dasha — full audit, 2026-08-06

Everything below was measured today, not summarised from notes. Where a claim could
not be verified, it says so. Written by Claude; grok leads the project and its
direction lives in `DASHA-ROADMAP.md`.

---

## 1. What exists

| File | Lines | Git | Author |
|---|---|---|---|
| `DASHA-PRODUCT-BRIEF.md` | 38 | untracked | grok |
| `DASHA-ROADMAP.md` | 252 | untracked | grok |
| `DASHA-PRODUCT-STRATEGY.md` | 134 | untracked | grok |
| `DASHA-DISCORD-BLUEPRINT.md` | 126 | untracked | grok |
| `DASHA-CRYPTO-LANDSCAPE.md` | 106 | untracked | grok |
| `DASHA-DOCS.md` | 40 | untracked | grok |
| `dasha-conviction-receipt.html` | 67 | tracked | grok, patched by Claude |
| `dasha-conviction-receipt.test.mjs` | 39 | tracked | grok, extended by Claude |
| `dasha-desk` / `dasha-desk.test.mjs` | — / 47 | untracked | grok, in progress |
| `dasha-landing.html` | 232 | tracked | Claude |
| `dasha-og-card.svg` / `.png` | 29 / 1200×630 | tracked | Claude |

**Six of grok's documents are untracked.** They exist only in the working tree. A
`git clean` or a bad checkout loses all of them, and the roadmap is 252 lines of
decisions that exist nowhere else.

---

## 2. Phase 0 exit gate — measured, item by item

The gate, verbatim from `DASHA-ROADMAP.md`:

| Gate item | Local page | Live site |
|---|---|---|
| No `t.me/dashacommunity` in outer or loaded content | **PASS** — 0 occurrences in landing, tool, or generated output | **FAIL** — roadmap records it still in the deployed iframe |
| Primary content indexable in the top-level document | **PASS** — 2,915 chars of text with JS and CSS stripped; iframe removed, tool inlined | **FAIL** — roadmap records "almost no indexable content beyond the iframe" |
| Zero serious axe violations attributable to page code | **PASS** — 0 violations at 390px and 1440px | not measured by me |
| No broken links or horizontal overflow at 390px and 1440px | **PASS** — no overflow at either; all 6 links resolve | not measured by me |

The axe result is trustworthy because the run reports what it *evaluated*: **42
rules passed, 47 inapplicable, 1 incomplete, 0 violations**. An empty violations
array from a harness that silently failed looks identical to a clean page, so the
rule count is the evidence, not the zero.

**Everything still failing is deployment-side.** The local page satisfies the gate;
the published Webflow document does not, and republishing is not something I can do.

---

## 3. Defects found and fixed today

| Defect | Where | Status |
|---|---|---|
| Risk disclaimer absent from receipt body and canvas card | `dasha-conviction-receipt.html` | **Fixed** — one shared constant across body, share text and a canvas footer band |
| "DASHA THESIS CARD" printed twice on the card | same | **Fixed** — filtered from the wrapped body; the header is drawn separately |
| Tool was iframed, so not indexable in the top-level document | `dasha-landing.html` | **Fixed** — inlined natively per the roadmap's Task 2 |
| "Share on X" and "Inspect token" open new tabs without saying so | `dasha-landing.html` | **Fixed** — announced in the accessible name, visible text unchanged |
| No `og:image` at all, while `twitter:card` requested a large image | `dasha-landing.html` | **Fixed** — 1200×630 card, dimensions verified against the PNG header |

Both duplication bugs were found by **rendering the PNG and looking at it**. Neither
was visible in the diff, and the test suite passed throughout.

---

## 4. Open defects, not fixed

- **The same two new-tab links exist in `dasha-conviction-receipt.html`** and are
  still unlabelled there. That is grok's file and it was edited nine minutes before
  this audit; patching across an active edit is how work gets clobbered.
- **Six roadmap/strategy documents are untracked.** One `git clean` loses them.
- **The domain is a placeholder.** `canonical`, `og:url` and `og:image` all point at
  `https://dashalabs.xyz/`, which I invented because no real URL exists anywhere in
  the repo. A wrong absolute URL is worse than none — it aims the social unfurl at a
  host that will not serve the image. **This needs the user.**
- **The tool now exists in two places** — inlined in the landing page and standalone.
  They will drift. Worth deciding which is canonical.

---

## 5. Truth and identity boundaries

grok's brief sets these, and the landing page was checked against each:

| Boundary | Landing page |
|---|---|
| No candidate mint address | **Clean** — 0 occurrences |
| No `t.me/dashacommunity` | **Clean** — 0 occurrences |
| Never substitute "official", "safe", "verified", "endorsed" | **Clean** — the only uses are the refusal *"No safety score"* and Solana's own guidance that verification is not endorsement |
| A timestamp and checksum do not prove content existed at that time | **Honoured** — the card and receipt both carry *"Local timestamp is not independently verified"* |

The generated share card carries no ticker, no price, no mint and nothing resembling
market data. It is the artifact most likely to be screenshotted away from context, so
it makes no claim the page itself would not make.

---

## 6. Test coverage

`dasha-conviction-receipt.test.mjs` — **PASS**. Drives a real browser on CDP :9223.

Asserts: invalid address rejected locally; canvas exactly 1200×675; PNG data URL;
X text ≤280 at maximum field lengths (measured 266); confidence and "Invalid if" in
the share text; no horizontal overflow; every control ≥48px; the page note says
"not proof".

Claude added: the risk line in the receipt body; `NFA` and `No wallet` in the share
text; and that the disclaimer band is **actually painted** — it reads canvas pixels
in the band region and requires >2000 non-dark subpixels. Asserting the constant
exists in source would prove the constant exists, not that anything was drawn.

**Not covered:** the landing page has no test. Its checks were run by hand today.

---

## 7. What needs the user

1. **The real domain.** Blocks `canonical`, `og:url`, `og:image` — three tags that
   must change together.
2. **Whether Dasha is a person or a brand you control.** I built original artwork
   rather than sourcing images, because the brief withholds token claims until
   identity is confirmed and the adjacent ANSEM precedent is a token launched in a
   real person's name with no version he endorsed. If you hold the rights, send the
   files.
3. **Deployment.** Every remaining Phase 0 failure is on the published Webflow
   document, not the local source.
