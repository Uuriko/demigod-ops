---
status: historical
archived: 2026-08-08
---

# Dasha — full audit, 2026-08-06

> Historical audit record. Several conditions changed during the same day: the Dasha documents are now tracked, Webflow directly renders the Desk, Telegram and the iframe are gone, the Desk has an interaction test, and generated landing surfaces now have a build gate. Use [`DASHA-WORKFLOW.md`](DASHA-WORKFLOW.md) for current truth. Preserve the sections below as evidence and defect history, not operating instructions.

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


---

## 8. Addendum — data-loss exposure, measured 2026-08-06 17:34 UTC

Acting on §4's note rather than leaving it recorded.

**`dasha-desk` is a separate project whose entire history exists only on this disk.**
73 files, 3 commits, a configured GitHub remote (`Uuriko/dasha-desk`) — and
`git log --branches --not --remotes` lists **all three commits**, meaning nothing
has ever been pushed. `main` has no tracking branch. It looks protected because it
has a repo and a remote; it is not.

**Its README claims a live URL that returns 404.** `https://uuriko.github.io/dasha-desk/`
is presented as "Live (Pages)" and does not resolve. For a project whose own README
says "No backend. No wallet connect. No fake roadmap", a false liveness claim is the
kind of thing it exists to avoid.

### What is now protected

| Asset | Protection |
|---|---|
| 7 top-level untracked Dasha docs (~700 lines) | verified by name inside `20260806T173406Z/data.tar.zst` |
| 6 tracked Dasha files | in the snapshot's git bundle |
| `dasha-desk` — 73 files **plus its .git** | `20260806T173406Z/dasha-desk.tar.zst`, 72K |

`dasha-desk` needed a separate archive: `bin/dg-snapshot` filters to top-level
paths, so a nested directory was silently outside its coverage. Found by listing
the archive by filename instead of trusting the tool's own summary — the snapshot
reported success while missing the largest thing it was run for.

Restore verified, not assumed: extracted to scratch, all 3 commits present in the
restored `.git`, and 15 of 15 working files byte-identical.

### Still unprotected

- `dasha-desk`'s 4 modified files and 2 untracked directories (`.github/`, `dist/`)
  are inside the archive as working files, but they remain uncommitted in its own
  repo.
- Nothing is pushed anywhere. Every copy is on this one disk, on a laptop that ran
  `git clean -xfd` four days ago and lost 37 files.

The fix is `git push`, which needs GitHub authentication the machine does not
currently have — `gh auth status` reports no logged-in host.


---

## 9. `dasha-desk` and the live page — audited 2026-08-06 17:5x UTC

### Truth boundaries: clean

Every boundary word in `dasha-desk` is used as a **refusal**, not a claim:

| Location | Wording |
|---|---|
| `README.md:53` | "**Not included:** claiming official endorsement by Dasha Nekrasova, Red Scare, or @dash_eats. Quotes are public posts for the `$dasha` instance." |
| `CONTRIBUTING.md:8` | "Don't claim official endorsement by Dasha / Red Scare / @dash_eats." |
| `index.html:44`, `src/body.html:32` | "Linked by @dash_eats · name dash_eats · symbol dasha · association is not endorsement or safety" |

No `t.me/dashacommunity` anywhere. No use of "verified", "endorsed" or "guaranteed"
as a claim. The candidate mint appears in 6 files, always alongside inspection links
(Solscan, Rugcheck, Birdeye) rather than presented as established.

**This identifies Dasha as Dasha Nekrasova, of Red Scare — a real public figure.**
That retrospectively confirms the decision not to source or edit images of her for a
token page: the repo itself refuses to claim her endorsement, and scraped likeness
would have implied exactly what it disclaims.

### Links

| URL | Status |
|---|---|
| `johns-awesome-project-39b1b5.webflow.io/dasha` | **200 — this is the live landing page** |
| `files.catbox.moe/cm5fmq.html` | 200 |
| `github.com/Uuriko/dasha-desk` | 200, but **empty** — consistent with nothing pushed |
| `x.com/dash_eats` | 200 |
| `solscan.io/token/53uxQ…` | 403 — bot protection, not a broken link |
| `uuriko.github.io/dasha-desk/` | **404 — the README presents this as "Live (Pages)"** |

### The live page, measured

`https://johns-awesome-project-39b1b5.webflow.io/dasha`, HTTP 200, at 390px:

- `lang` — **absent**
- `canonical` — **absent**
- `og:url` — **absent**
- `og:image` — points at **dexscreener's** token image, not a purpose-built card
- `t.me/dashacommunity` — **gone** (the roadmap's stale-deployment defect is resolved)
- iframes — **0** (the `text/plain` iframe defect is also resolved)
- indexable text in the top-level document — **1,172 chars**
- horizontal overflow — none
- axe — 88 rules evaluated, **2 serious violations: `html-has-lang`, `label`**

Two roadmap defects are already fixed on the deployed page: the Telegram link and
the iframe. Three remain and are the same three my local page fixes — `lang`,
canonical, `og:url` — plus a `label` violation the roadmap had not recorded.

**The domain question is answered.** `johns-awesome-project-39b1b5.webflow.io/dasha`
is the only live Dasha page. My landing page's placeholder `https://dashalabs.xyz/`
should become that, or whatever custom domain replaces it — but this is a
deployment decision, so the placeholder stays until someone says which.


---

## 10. Live `label` violation — diagnosed, and the domain resolved

### The violation, verbatim

axe rates this **critical**, not serious as §9 first reported.

```
rule:     label — "Form elements must have labels"
impact:   critical
selector: #dd-share
element:  <textarea id="dd-share" class="dd-textarea" rows="3" readonly></textarea>
axe:      no implicit <label>, no explicit <label>, no aria-label,
          no aria-labelledby
```

It is **page code, not Webflow chrome** — the `dd-` prefix is `dasha-desk`'s own
class naming. Source locations:

```
dasha-desk/index.html:93
dasha-desk/src/app.html:81
dasha-desk/src/body.html:81
dasha-desk/dist/index.html:152
```

In `src/body.html` it sits directly under `<h2>Post this</h2>` inside
`<article class="dd-card">` — so the heading gives a sighted user the context that
a screen-reader user does not get.

**Smallest fix:** `aria-label="Share text"` on the textarea, in all four copies.
A wrapping `<label>` would work too but changes layout; `aria-labelledby` pointing
at the existing `<h2>` is also valid and arguably better, since the visible heading
already names the control.

Not patched — `dasha-desk` is grok's, has its own repo, and carries four
uncommitted files.

### Domain: placeholder retired

`dasha-landing.html` used `https://dashalabs.xyz/`, invented when no real origin was
known. It does not resolve. A canonical pointing at a domain that never answers is
worse than none — it names an authoritative copy that does not exist and aims the
social unfurl at a host that cannot serve the image.

All three tags now point at `https://johns-awesome-project-39b1b5.webflow.io/`,
changed together because a canonical and an `og:url` that disagree is its own defect.

Two caveats, stated rather than implied:

- That origin is Webflow staging-style. If a custom domain arrives, `canonical`,
  `og:url` and `og:image` all change together.
- **`og:image` will not unfurl yet.** The card exists locally and is not deployed at
  that origin, so the URL is correct in form and not yet reachable.

`dasha-landing.test.mjs` still PASS — it asserts all three are absolute https URLs,
and the drift guards against the standalone were unaffected.

---

## 11. Design overhaul (2026-08-06, with grok and codex)

Five specific design questions were put to both agents independently against the live
file. They **converged** on: replace the hero diagram with a filled example card; the
single highest-value change is showing a finished receipt in the hero; one accent doing
every job flattens hierarchy; the tool stays above the explainer; keep it self-contained
with display type split from body type.

They split on two, and both splits were resolved with a reason rather than a preference:

- **Display face** — grok said mono, codex said editorial serif. Took *both*, by role:
  serif for display (contrarian in this category, which is the point), mono for data
  (fingerprint, timestamp, address, card), system sans for body and controls. Zero font
  files; the page is still fully self-contained.
- **Accent** — grok kept acid green, codex moved to lavender. Took codex's, on the
  argument that an acid trading-terminal palette contradicts the page's own "no wallet,
  no trading, no price data" claim. A page that looks like the thing it says it isn't is
  lying with CSS.

### Defects found and fixed

| Defect | Found by | Fix |
|---|---|---|
| Hero CTA pointed at `dasha-conviction-receipt.html` — sent visitors **off the page** to a tool already inlined below | grok | both CTAs now `#tool` |
| "Frame blocked or JavaScript off?" — **dead copy**, the tool has not been iframed for some time | grok | replaced with an honest link to the standalone |
| Two `<h1>` — the inlined tool brought the standalone's own | me | tool heading demoted to `h2.toolhead`, size reduced |
| The tool's CSS **re-declared `:root` after the page's own**, so it silently won every colour variable page-wide | me | scoped to `#tool`; palette now has one source |
| OG card mojibake (`Â·`, `â€"`) | me | the data: URL was decoded as latin-1; now served with an explicit charset. The SVG bytes were always correct |
| OG card had browser **scrollbars baked into the PNG** | me | `overflow:hidden` on the render host |
| Example card's disclaimer bar poked square corners past the card's `rx=14` | me | replaced the rect with a rule — same read, cannot clip |
| Generated canvas card rendered **every field in identical white bold**, so the invalidation — the one field the product exists for — had no more weight than the horizon | me | field-aware colour; each source line wrapped separately so colour survives wrapping |

### Truth boundaries held

- The hero example card uses a **self-documenting placeholder mint** (`EXAMPLEmint…1111pump`),
  never the candidate mint. A real address rendered in the product's own voice would read
  as a call on that token, and control is not established.
- The example thesis carries no price target, no return figure and no implied gain.
- The mechanism claim added to `#how` names the research and **self-limits in the same
  breath**: "Those studies are about forecasting, not tokens, and none of this predicts
  returns." No outcome, accuracy or return claim anywhere on the page.
- "What this is not" strip retained unchanged.

### Verification

- Contrast computed, not eyeballed: **9 foreground/background pairs, all ≥ 4.5:1**
  (lowest 7.71, muted-on-panel).
- `dasha-landing.test.mjs` PASS at 390 and 1440 — axe zero serious/critical with rule
  count proving the harness ran, >2000 indexable chars, og dimensions against the PNG
  header bytes, both drift guards.
- `dasha-conviction-receipt.test.mjs` PASS.
- Both drift guards green **after** the canvas change, which is the real check: the card
  colours live inside the compared script, so they had to change identically in both files.
- Rendered and inspected at 390 and 1440; OG card checked at full size and at thumbnail scale.

### Still open

- Everything remaining is a deploy or a push, both of which need the user.
- `#dd-share` critical `label` violation in `dasha-desk` — still grok's repo, still unreported upstream.

---

## 12. Verification pass, and a correction

### Correction: the `#dd-share` label violation is CLOSED

Sections 9 and 10 record `#dd-share` as an open critical `label` violation across four
`dasha-desk` files and on the live page. **That is no longer true and this supersedes
those entries.** It was fixed in `dasha-desk` commit `ef09e85`; my finding described the
pre-`ef09e85` state and I reported it upstream without re-checking first.

Verified directly rather than taken on report:

- Source — `aria-labelledby="dd-share-label"` present in `index.html`, `src/app.html`,
  `src/body.html` and `dist/index.html`, with `<h2 id="dd-share-label">Post this</h2>` above it.
- Live — `https://johns-awesome-project-39b1b5.webflow.io/dasha` returns HTTP 200 and the
  element carries `aria-labelledby="dd-share-label"`.
- axe on live: 88 rules, **one** serious violation remaining — `html-has-lang` on the
  outer `<html>`, which is Webflow chrome, not page code.

Two further corrections to §10: the roadmap **does** track this (root roadmap line 31),
so "nobody is tracking it" was wrong; and the roadmap's own line still says live lacks
the label, which is now also out of date.

The fix that shipped is the same one I would have proposed — `h2` id plus
`aria-labelledby` — which is convergent, not causal. It predates the report.

### Verification of the design overhaul

Re-checked because three of the standalone's edits were regex replacements against
remembered markup, and `String.replace()` with a non-matching pattern **fails silently
and returns the original**. The gates assert nothing about the standalone's typography,
so nothing would have caught a no-op.

| Check | Result |
|---|---|
| serif heading / mono eyebrow / mono address in standalone | all three **landed** |
| old-palette hexes surviving in either file (case-insensitive) | **none** |
| favicon identical across both files, new palette | identical, `#0B0A0C #F2EDE7 #C8B6FF` |
| favicon legibility at 16px | holds |
| standalone axe at 390 and 1440 | 89 rules, **zero** serious/critical |
| standalone horizontal overflow at 390 with a full 44-char mint | none |
| both gates after all changes | PASS |

### One defect found by looking

The five form fields — the actual product — had **no designed focus state**. The only
`:focus-visible` rule covered `a` and `button`, so inputs, textareas and selects fell
back to the browser's default ring. axe passes either way, because a visible indicator
does exist; that is precisely why the gate never surfaced it, and why rendering and
looking is not redundant with the test suite.

Fixed in both files: `input/textarea/select:focus-visible` now takes the accent outline.
Verified by keyboard focus rather than click — `:focus-visible` does not paint for mouse
interaction — and the computed outline colour reads `rgb(200, 182, 255)`, the accent.

---

## 13. Framing correction — this page is the tool, not the landing page

Supersedes the framing used throughout sections 1–12.

This audit has described `dasha-landing.html` as "the landing page" and measured it against
`DASHA-ROADMAP.md`'s Phase 0 exit gate for "one truthful, directly rendered, accessible
landing page". **That is the wrong target for this file.**

`DASHA-PRODUCT-BRIEF.md` lines 9–10 assigned the roles before any of this work began:

> 1. **Dasha Desk** — the `$dasha` landing page …
> 2. **Dasha Thesis Card** — the first useful tool …

Grok and Codex, asked independently on 2026-08-06, both recommended the same thing: the
Desk ships as the landing page; the Thesis Card is a tool surface folded in afterwards.
`DASHA-WORKFLOW.md` lines 18–21 records the same split — landing markup, styles and
behaviour all live under `dasha-desk/src/`.

**What this changes:** nothing about the defects found or the fixes made. The design system,
the honesty strip, the drift guards, the focus-state gate and the axe coverage all carry
over to the tool surface unchanged, and every defect in §11 was real regardless of what the
page is called.

**What it changes going forward:** this file stops being polished as an independent
destination. Its next job is Phase 1 integration as a module inside the Desk — worked
examples and a "proves / does not prove" panel — per brief line 24, which sequences Thesis
Card examples onto the landing page *after* the Desk's purpose is clear.

The Phase 0 exit gate belongs to the Desk. `dasha-landing.test.mjs` remains valid as a gate
for this file's own correctness; it was never evidence about the Desk.

See `DASHA-SYNC-2026-08-06.md` for the full three-agent sync, ownership map, and the
divergent-history finding on `dasha-desk`.
