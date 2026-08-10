# Dasha OSS — agent self-prompt + checklist

**Purpose:** Detailed working prompt for Grok/Claude/Codex to improve open source setup, attract contributors/stars, and **test whether our approach is good** against successful OSS patterns.  
**Repo (desk-first):** https://github.com/Uuriko/dasha-desk  
**Live product:** https://www.getdasha.com/dasha (+ home/studio on getdasha.com)  
**Updated:** 2026-08-08  

**Tone for public surfaces:** concise, ambitious, open-ended — community input on what to build. Prefer invitation over constraint walls. Keep honesty (unofficial, mint risk) without drowning README in bans.

---

## Self-prompt (paste / reuse each cycle)

```
You are improving open source for Dasha (getdasha / $dasha culture tools).

PRIMARY REPO: Uuriko/dasha-desk (MIT, static mint desk + tools).
PRODUCT SITE: getdasha.com (home, /studio, /dasha) — ship is separate from GitHub.

GOALS
1. Make the GitHub project an obvious place for strangers to land, understand, run, and contribute.
2. Grow real contributors and healthy discovery (stars, forks, issues, PRs) without spam or paid star farms.
3. Benchmark our setup against successful OSS projects and close the highest-leverage gaps.
4. Keep community roadmap open (infra / consumer / creative) — less is more; no feature theater.

CONSTRAINTS
- Dasha only (not Demigod website ship).
- Do not revive thesis/receipts/FOMO product paths as OSS product.
- Do not invent endorsement or “safe mint” claims.
- Prefer docs/templates/CI/issue hygiene over large new products unless an issue demands it.
- Publish to Webflow only with current-request auth + valid token.
- Less is more: one solid slice per cycle beats a manifesto of unfinished work.

METHOD
A) Inventory current OSS surface (README, CONTRIBUTING, LICENSE, SECURITY, CoC, templates, CI, topics, demo, issues).
B) Diff against “successful OSS baseline” (below).
C) Pick the single highest-ROI missing item; implement; verify.
D) Run the “fitness tests” section; record results.
E) Leave a short receipt: what changed, what still blocks stars/contributors.

SUCCESS THIS CYCLE
- At least one measurable OSS improvement shipped (doc, template, CI, issue seed, demo GIF, topics, etc.).
- Fast product gate still green if site sources touched.
- Fitness checklist has more YES boxes than last cycle (or honest NO with next action).
```

---

## What successful OSS projects tend to get right

Patterns from GitHub “community standards,” opensource.guide, launch checklists, and high-visibility repos (not a mandate to copy any one product):

| Pattern | Why it works | Examples / signals |
|--------|----------------|-------------------|
| **15-second README** | Strangers decide in one screen | One-line pitch, hero GIF/screenshot, install, one “try it” link |
| **Demo before theory** | Proof beats prose | Live URL + animated GIF of the core loop |
| **Copy-paste quick start that works** | First clone must succeed | `git clone` → one command → browser open |
| **CONTRIBUTING is short + kind** | Long ban lists scare people | How to run, how to PR, where to ask; “ideas welcome” |
| **Labels + good first issues** | Onboarding funnel | `good first issue`, `help wanted`, `docs` |
| **Issue / PR templates** | Lower support load | Bug + Idea; not 12 forms |
| **CI on every PR** | Trust + safety net | Build + tests green badge in README |
| **LICENSE + SECURITY + CoC** | GitHub community standards | MIT/Apache + private security path |
| **Topics + description + homepage** | Discoverability | Accurate topics; homepage = live product |
| **Active maintainer pulse** | Stars without replies die | Reply SLA culture, not silence |
| **CHANGELOG / releases** | Product signal | Tag `v0.x` with notes + demo |
| **Discussions (optional)** | Ideas without issue spam | Q&A / Ideas categories |
| **SCOPE clarity** | Avoid wrong contributors | What this repo is / isn’t (one paragraph) |

**Star growth (honest):** stars follow *useful demo + distribution*, not badge count. Playbooks that work: demo GIF in README → share on X/HN/Reddit once → good first issues → merge first external PR fast. Avoid paid stars.

---

## Current baseline (desk) — snapshot for agents

Update this table when you re-audit:

| Item | Typical status | Notes |
|------|----------------|-------|
| Public repo | Yes | `Uuriko/dasha-desk` |
| LICENSE MIT | Yes | |
| README | Yes | Keep short; pitch + run + contribute |
| CONTRIBUTING | Yes | Keep open / community-first |
| CODE_OF_CONDUCT | Yes | |
| SECURITY | Yes | |
| Issue templates (bug + idea) | Yes | |
| PR template | Yes | |
| CI (build/test on PR) | Partial | `verify.yml` may need `workflow` OAuth scope to land |
| Pages demo | Often broken/404 | Dead demo hurts trust |
| Demo GIF in README | Often missing | High leverage |
| good first issues | Often 0 | Seed 3–5 |
| Topics | Partial | Expand carefully |
| CHANGELOG / releases | Often missing | |
| Stars / external PRs | Near zero | Expected early; track monthly |
| Studio as public repo | Not yet | Future extract |
| Monorepo whole dump | **Do not** | Ops secrets / Demigod |

Fitness tests and checklists below are how you **verify** the approach.

---

## Detailed checklist — make OSS setup better

### A. GitHub community standards (table stakes)

- [ ] LICENSE present and accurate (MIT for code; media attribution separate)
- [ ] README: one-line pitch above the fold
- [ ] README: live demo link that works (404 = fix or remove)
- [ ] README: screenshot or **GIF** of the core loop (mint check / share / remix)
- [ ] README: clone → run in ≤3 commands; commands actually work on fresh clone
- [ ] CONTRIBUTING: how to run tests/build; how to open PR; where ideas go
- [ ] CODE_OF_CONDUCT with report contact
- [ ] SECURITY.md with private reporting path
- [ ] Issue templates: Bug + Idea (not only bugs)
- [ ] PR template: why / what / how verified
- [ ] GitHub “Community standards” UI green (check Insights → Community)
- [ ] Description + homepage + topics set on the repo
- [ ] Default branch `main`; protect later when 2+ maintainers

### B. First-hour contributor experience

- [ ] Fresh-clone script or doc: no monorepo Demigod steps required
- [ ] `node build.mjs --check` (or equivalent) fails loudly on drift
- [ ] At least one fast unit test (`dasha-share`, `dasha-oss-docs`) documented in README
- [ ] Generated files clearly marked (do not hand-edit)
- [ ] Config (`config/dasha.json`) documented if contributors should edit it
- [ ] No secrets in git history of public repo (scan; rotate if ever leaked)
- [ ] `receipts/` / FOMO experiments **not** published as product samples
- [ ] Attribution for third-party media clear (`assets/ATTRIBUTION.md`)

### C. Contribution funnel (contributors + stars)

- [ ] **3–5 `good first issue`s** open: docs typo, a11y, copy, one small UI, one test
- [ ] Labels: `good first issue`, `help wanted`, `docs`, `bug`, `idea`, `enhancement`
- [ ] Pin one issue: “Ideas welcome — what should we build?”
- [ ] Discussions enabled with Ideas / Q&A (if Issues alone feels noisy)
- [ ] First external PR: merge path is fast (review same day if possible)
- [ ] README badge: CI status (after verify workflow is on remote)
- [ ] Social proof: star history optional later; don’t fake metrics
- [ ] One public launch post (X) that links **demo + repo** in same breath
- [ ] Topics match search intent: e.g. `solana`, `web3`, `static-site`, `opensource`, `meme` (only if true)

### D. Product / multi-repo architecture (OSS shape)

- [ ] Desk remains the **first public product repo** (clear, completable)
- [ ] Studio extract plan when embed/build is stable (`dasha-studio` MIT twin)
- [ ] Home landing either stays private ops or becomes a third thin public module — **not** whole monorepo
- [ ] Cross-link: desk README ↔ live site ↔ studio; site footer Source → correct repo
- [ ] Shared “community roadmap” doc that is **invitation**, not a locked waterfall
- [ ] Avoid plugin-ecosystem theater until strangers use the tools

### E. Quality bar without scaring people away

- [ ] CI: build check + share test + OSS docs test on PR
- [ ] No requirement for full CDP/axe on every PR (keep that optional/strict)
- [ ] SECURITY path for mint/UI security issues (wrong CA, XSS)
- [ ] Dependabot for Actions only after CI exists
- [ ] CODEOWNERS optional; don’t block solo maintainers
- [ ] Release `v0.1.0` when demo GIF + CI + README honest

### F. Growth & distribution (stars are a lagging indicator)

- [ ] Demo GIF/video checked into repo or linked (README top)
- [ ] Live desk and GitHub homepage always match “what this is”
- [ ] Single launch day: X thread + optional HN/r/solana **after** green demo
- [ ] List on awesome-solana / tool lists only when product is stable
- [ ] Reply to issues within a stated window (even “triaged, thanks”)
- [ ] Monthly: count stars, unique clones (GitHub Insights), open PRs, time-to-first-response
- [ ] Never buy stars or engagement

### G. Governance & honesty (trust)

- [ ] “Unofficial / association ≠ endorsement” one line in README (not a novel)
- [ ] Mint documented as associated public CA; no “verified safe”
- [ ] Media rights not over-claimed as MIT
- [ ] Maintainers list or CODEOWNERS when second person arrives
- [ ] Clear that roadmap is community-shaped (`docs/ROADMAP.md` + issues)

---

## Fitness tests — “is the way we’re doing it good?”

Run these periodically; save output under a receipt path. **Pass means the approach is working; fail means change the approach.**

### T1 — Stranger 15-minute test (manual or agent with clean env)

1. Open the GitHub repo in a logged-out browser (or private window).  
2. Time-to-understand: can you state what it does in one sentence from the README alone?  
3. Time-to-run: clone + run local server without reading anything outside README/CONTRIBUTING.  
4. Time-to-first-edit: change a string, rebuild if needed, see change.  
**Pass:** all three under 15 minutes for a competent generalist.

### T2 — Community standards API / UI

```bash
gh api repos/Uuriko/dasha-desk/community/profile
# or: GitHub → Insights → Community
```

**Pass:** README, LICENSE, CoC, CONTRIBUTING, SECURITY, issue templates present (GitHub’s checklist).

### T3 — Automated OSS docs test (already exists)

```bash
cd dasha-desk && node dasha-oss-docs.test.mjs
```

**Pass:** exits 0. Extend this test when new “must exist” files land (e.g. CHANGELOG).

### T4 — Fresh-clone CI

```bash
git clone https://github.com/Uuriko/dasha-desk.git /tmp/dasha-desk-fresh
cd /tmp/dasha-desk-fresh
node build.mjs --check
node dasha-share.test.mjs
node dasha-oss-docs.test.mjs
```

**Pass:** all exit 0 with no monorepo paths required.

### T5 — Dead-link audit

- README live URL returns 200  
- Homepage field on repo returns 200  
- Pages URL either 200 or **removed from README**  
**Pass:** no advertised 404s.

### T6 — Competitor / peer snapshot (qualitative)

Pick 2–3 successful small tools (e.g. popular static web tools, Solana util repos with clear demos). Score us 0–2 on: pitch, demo, quick start, first issues, CI badge, release.  
**Pass:** average ≥ peer mid-tier on pitch+demo+quick start; document gaps.

### T7 — Funnel metrics (monthly)

| Metric | Healthy early signal |
|--------|----------------------|
| Stars | Non-zero after first public post + working demo |
| Unique clones (Insights) | >0 weekly after share |
| Issues from non-maintainers | ≥1 idea or bug in 30 days after GFI seed |
| External PRs | ≥1 in 60 days if GFIs exist and maintainer replies |
| Time-to-first-response | Days, not weeks |

**Fail signal:** perfect docs, zero traffic — distribution problem, not template problem.

### T8 — Product honesty (Dasha-specific)

```bash
# from product worktree
npm run dasha:gate:fast
node dasha-live-verify.mjs  # network
```

**Pass:** gate green; mint consistent; no forbidden claim strings on OSS desk sources.

---

## Prioritized backlog (do in this order unless peers say otherwise)

### P0 — Trust & first impression (this week)

1. Working demo link (Pages **or** only getdasha.com/dasha in README — no 404).  
2. Demo GIF of desk (mint copy + optional share).  
3. Seed **3 good first issues**.  
4. Land CI `verify.yml` (needs `workflow` scope on `gh` auth).  
5. Fresh-clone proof recorded once.

### P1 — Contributor activation (next)

6. Pin “Ideas welcome” issue; optional Discussions.  
7. Expand topics carefully.  
8. Tag `v0.1.0` + short release notes when demo+CI honest.  
9. One X post: demo + GitHub.  
10. First-response habit for issues.

### P2 — Product OSS expansion (later)

11. Extract Studio public repo (same voice).  
12. Cross-repo “ecosystem” README only when 2+ repos exist.  
13. Shared design tokens / config package **only if** duplication hurts.  
14. Changelog automation optional.

### P3 — Scale (only with demand)

15. Branch protection + CODEOWNERS with 2nd maintainer.  
16. Dependabot.  
17. Translations.  
18. Plugin registry — **not** before real users.

---

## Anti-patterns (don’t “improve” OSS this way)

- Dumping the whole Demigod monorepo public  
- Star farming, engagement pods  
- 40-page CONTRIBUTING full of product bans (keep risk notes short)  
- Advertising GitHub Pages while it 404s  
- Requiring CDP/browser farms for every PR  
- Closed roadmap that contradicts “community decides”  
- Shipping FOMO/raid experiments as the face of the repo  

---

## Suggested issue seeds (copy when ready)

1. **docs:** Add a 20-second GIF of mint copy + CA check to README  
2. **a11y:** Audit focus order / contrast on mint row  
3. **dx:** Document exact `python3 -m http.server` port + expected files  
4. **test:** Assert `config/dasha.json` mint matches body mint string  
5. **idea (pinned):** What should Dasha tools build next? (infra / consumer / creative)

---

## Agent execution recipe (one cycle)

1. Run **T2–T5** and note gaps.  
2. Ask Claude + Codex (optional): “single highest-ROI OSS gap from DASHA-OSS-SELF-PROMPT.md P0.”  
3. Implement **one** P0/P1 item.  
4. Re-run fitness tests that apply.  
5. Push to `Uuriko/dasha-desk` if docs/code (not monorepo ops).  
6. Receipt: 5–10 lines in session notes or `docs/` only if durable.

---

## References (external patterns)

- https://opensource.guide/starting-a-project/  
- GitHub Community Standards (repo Insights → Community)  
- https://github.blog/open-source/new-to-open-source-heres-everything-you-need-to-get-started/  
- Contributor growth: good first issues, CONTRIBUTING, fast maintainer reply  
- Star growth: demo-first README + coordinated share (not badge spam)  

---

## Related project docs

- Desk public: `dasha-desk/README.md`, `CONTRIBUTING.md`, `docs/ROADMAP.md`  
- Operator: `DASHA-OPEN-SOURCE.md`, `DASHA-OSS-OPERATOR-PLAYBOOK.md`  
- Ship: `DASHA-SHIP-FAST.md` (site publish ≠ OSS publish)

---

## Execution log (2026-08-08)

Shipped on `Uuriko/dasha-desk`: demo GIF, CI verify, mint consistency test, GFI issues #4–#6 (+ closed #5/#6), pinned Ideas #7, topics, release **v0.1.0**, fresh-clone PASS, Pages+live 200. Remaining: human distribution (X post), external contributors over time.
