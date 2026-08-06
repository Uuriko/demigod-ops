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
