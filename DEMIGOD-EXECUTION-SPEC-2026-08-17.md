---
status: working
generated_by: claude
generated_at: 2026-08-17
---

# Execution spec — make trydemigod.com readable, then publish what it knows

This is the prompt. It is written against three documented failure modes of long-horizon coding
agents, and every section exists to block one of them:

- **Intent drift** — an underspecified task, where the model picks reasonable defaults that were
  never what anyone wanted. Blocked by per-task acceptance criteria that are checkable, not prose.
- **Hallucinated interfaces** — an invented function, config key or file that compiles and fails at
  runtime. Blocked by §2, which pins the real interfaces, verified to exist on 2026-08-17.
- **Context collapse** — losing earlier decisions across sessions and contradicting them. Blocked by
  §1's requirement to record every decision in the work queue, and by this file being the only
  place the plan lives.

The fourth failure is subtler: an agent with no way to evaluate its own result stops at code that
looks plausible and was never demonstrated to work. §1 rule 3 is the answer to that one.

## 0. Why this work, in one paragraph

AI crawlers do not execute JavaScript. GPTBot, ClaudeBot, PerplexityBot and the rest fetch HTML once
and move on; only Gemini renders, by borrowing Googlebot. Every page of trydemigod.com is rendered
by `demigod-foot-core.js` after load, so fetching as GPTBot returns **590 characters** for `/how`,
590 for `/faq`, 591 for `/blog` — a title and one boilerplate sentence — against **15,036** for
`/startups`, the one route with a pre-rendered fragment. The copy is not missing. It is complete,
authored HTML sitting in `DG_PAGES` inside a file that only runs in a browser. This work moves it
into the served HTML without rewriting it.

## 1. Operating loop

1. **Take the first unfinished task in wave order.** Waves are ordered so each one makes the next
   possible. Do not skip ahead because something looks more interesting.
2. **Read before writing.** Every task names the files it touches. Read them. If the interface is
   not in §2, verify it exists before depending on it.
3. **A task is done when its gate is green AND that gate would have been red before the change.**
   If the check could not have failed, the task is not finished — go back and make the check real.
   This is the only definition of done in this document.
4. **Smallest change that satisfies the acceptance criteria.** Reuse before writing: the pattern
   for almost everything here already exists in `demigod-directory-static.mjs`.
5. **Commit each task separately**, with a message that states the finding and what was measured.
6. **Record every decision in `DEMIGOD-WORK-QUEUE-2026-08-17.md`** as it is made — including the
   ones that turn out wrong. A later session cannot re-derive why something was skipped.
7. **Never publish, send, post, or move money** without authorization in the current user request.
   Preparing and verifying is always allowed; `bin/dg ship prepare` is allowed.
8. **Stop and say so** when a task turns out to need a decision only the operator can make. Silence
   or a plausible guess is worse than an unfinished task.

## 2. Pinned interfaces — verified to exist, 2026-08-17

Do not invent alternatives to these. If one appears wrong, verify against the file before changing
course.

| What | Where | Shape |
|---|---|---|
| Page copy for every route | `demigod-foot-core.js`, `var DG_PAGES = {…}` | `{ [key]: { title, doc, desc, html } }` — `html` is a complete authored HTML string |
| Route → page key | `demigod-foot-core.js`, `DG_PAGE_PATHS` | `{ how:'/how', pricing:'/pricing', faq:'/faq', … }` |
| Safe way to read both | `demigod-foot-smoke.mjs` lines 37–63 | runs foot-core in `vm.runInNewContext` with a browser-shaped sandbox and reads `window.__dgRouteStateForSmoke = { pages: DG_PAGES, paths: DG_PAGE_PATHS }` |
| Proven fragment generator | `demigod-directory-static.mjs` | `buildStaticDirectory(map, generatedAt, feed, maxBytes)` → HTML string; `stageStartupsPastePackage(html, { busy, sourcePath })` → paste package |
| Webflow custom-code ceiling | `demigod-directory-static.mjs` | `DEPLOYABLE_BYTES = 50000`, `HEADROOM_WARN_BYTES = 1500` |
| Blog source of truth | `demigod-blog-posts.json` | array of `{ slug, title, summary, body, published, publishedAt, dateModified }` |
| Pricing fragment | `demigod-pricing-fragment.mjs` | `pricingFragment(examples)` → HTML; already live, `/pricing` measures 3,255 crawlable chars |
| FAQ schema | `demigod-faq-schema.mjs` | `faqPageJsonLd(items)`, `faqJsonLdScript(items)` — **exported, no caller today** |
| FAQ visible-vs-schema rule | `demigod-seo-audit.mjs` | `faqPairsMatch(visible, schema)` — the 17 Q&A pairs must match exactly |
| Crawlable-text measurement | `demigod-site-health.mjs` | reports duplicate crawlable text across routes; exits 1 on findings |
| Posting-age data | `demigod-posting-age-index.mjs` | `--json` and an HTML fragment; 28.8% of attributable roles, 460 companies |
| Pay matrix | `demigod-board-pay.mjs --matrix` | `atsPayMatrix(map)` → rows + totals; 427 of 471 comparable |
| Suite | `demigod-verify-all.mjs` | 248 steps, `MIN_STEPS` floor; add entries when adding checks |
| Contracts | `demigod-die-contracts-check.mjs` | 30 enforced, `ENFORCED_FLOOR` ratchet |

## 3. Wave 1 — one pre-renderer, six routes

**W1-1 · Build `demigod-route-static.mjs`.**
One module that takes a route key, reads its copy from `DG_PAGES` through the vm sandbox, and emits
a bounded crawlable fragment. Not six copies of the directory generator.
*Acceptance:* `routeStaticFragment('faq')` returns HTML containing text from `DG_PAGES.faq.html`;
byte length ≤ `DEPLOYABLE_BYTES`; an unknown key throws rather than returning empty; a selftest
proves each of those and fails if the extraction returns nothing.
*Gate:* `node demigod-route-static.mjs --selftest`

**W1-2 · Prove the extraction against the real foot.**
*Acceptance:* the selftest reads the actual `demigod-foot-core.js`, not a fixture, and asserts every
key in `DG_PAGE_PATHS` that has copy also yields a non-empty fragment. A foot with a renamed
`DG_PAGES` must fail the gate loudly, not silently produce empty fragments.

**W1-3 · `/faq` fragment, and wire the orphaned schema.**
*Acceptance:* fragment contains all 17 Q&A pairs; `faqPairsMatch(visible, schema)` returns true
against `faqJsonLdScript`'s output; fragment plus schema ≤ 50,000 bytes.

**W1-4 · `/how`.** **W1-5 · `/about`.** **W1-6 · `/hire`.** **W1-7 · `/talent`.**
*Acceptance for each:* fragment carries the route's own lead paragraph, is under the ceiling, and
contains no copy from another route (the 24-route duplicate is the bug being fixed).

**W1-8 · `/blog` post bodies.**
Source is `demigod-blog-posts.json`, `published !== false` only.
*Acceptance:* the published essay's body text appears in the fragment; the three drafts do not.

**W1-9 · Stage every fragment as a paste package.**
Reuse `stageStartupsPastePackage`'s shape so an authorized publish is a paste, not a build.
*Acceptance:* one directory per route under `/tmp/dg-busy`, each with the HTML, a SHA256 and a
`prepare.json`.

## 4. Wave 2 — make the regression impossible

**W2-1 · Duplicate-crawlable-text gate.** Fails when two canonical routes serve the same stripped
text. *Acceptance:* injecting two identical routes fails it; today's live state is reported.

**W2-2 · Minimum-crawlable-characters gate.** Per route, a floor. *Acceptance:* a 590-character
route breaches it; `/startups` clears it.

**W2-3 · Crawlable text as a tracked number.** Recorded per route per run, the way version lag is.

**W2-4 · GPTBot receipt.** Fetch each canonical route with an AI-crawler user agent and store what
came back. *Acceptance:* the receipt names the user agent, the byte count and the stripped-text
count per route.

**W2-5 · Wire all four into `demigod-verify-all.mjs`** and raise `MIN_STEPS`.

## 5. Wave 3 — publish what the company knows

**W3-1 · Posting-age index host page**, aggregate form, headline number in the first 30% of the
page. **W3-2 · Pay-transparency matrix page.** **W3-3 · ATS capability matrix.**
**W3-4 · Methodology page**: what an unread board looks like and why a zero is not a zero.
**W3-5 · One "versus" page.** **W3-6 · Date-stamp and state a refresh cadence on each.**
*Acceptance for all:* every published number traces to a command in §2 that produces it, and no page
states a figure that no artifact can reproduce.

## 6. Wave 4 — measurement, hygiene, and the rest

`llms.txt` · robots policy for AI crawlers · Cloudflare Web Analytics named in `/legal` first ·
the 135 sites still on http · the 73 failed board reads · map rebuild for the 33 disambiguators ·
`/tmp` receipts · the 45 GB `src/` · push.

## 6b. Execution log — 2026-08-17

**Wave 1 complete.** `demigod-route-static.mjs` reads `DG_PAGES` by running foot-core in a vm
sandbox and stages 15 routes: 23,386 crawlable characters where most served 590. `/faq` 590 → 3,765
with the orphaned FAQPage generator finally wired and its visible-vs-schema round trip proven
fail-capable. `/blog` 591 → 4,876, drafts excluded by title and body opening, post fields escaped.

**Wave 2 measured.** `demigod-crawlable-audit.mjs` records what GPTBot receives per route. Nine
routes are byte-identical once the page title is removed — /about, /blog, /faq, /how, /legal, /press,
/private, /refer, /sample — and the title is why nobody saw it. Floor set at 900 from the measured
590-character boilerplate. Live audit deliberately not wired as a gate; its selftest is.

**Wave 3, three of five.** posting-age staged (1,229 chars), pay-transparency built and staged (944),
methodology built and staged (1,703) with every figure read from live artifacts at render time. The
"versus" page is left to the operator: it is positioning, not measurement.

**Correction absorbed.** The robots policy is deliberate — `search=yes, ai-train=no, use=reference`,
training crawlers blocked by name, every citation fetcher allowed. It needed no work, and it changes
nothing: the allowed fetchers do not run JavaScript either.

**Closed, not blocked.** `llms.txt` was recorded as "blocked on hosting — Webflow 404s arbitrary
root files". Research on 2026-08-17 says the hosting limit never mattered: SE Ranking measured
10.13% adoption across 300,000 domains with 39.6% of those files being plugin stubs; GPTBot,
ClaudeBot, PerplexityBot, OAI-SearchBot and Google-Extended overwhelmingly skip the file and crawl
HTML directly; Google's Gary Illyes confirmed Google does not support it and does not plan to; and
8 of 9 sites measured no traffic change after adding one. No major AI company has committed to
reading it in production. **Do not build it.** Reopen only if a named crawler documents support.

## 7. Not agent work — these need the operator

Publishing anything. The niche definition. Whether to name companies in the posting-age index. Legal
review of aggregating public ATS data. Who else holds the gate secret. Whether Demigod and Dasha
share a repo. Contacting the overdue warm lead.
