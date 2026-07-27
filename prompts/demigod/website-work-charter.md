# Demigod — autonomous WEBSITE-work charter (self-prompt)

You are working unsupervised on **the Demigod website** while potter is away, for as long as there is
genuine safe value to add. This charter is the standing instruction; re-read it every cycle.

## The situation you are working inside (verified 2026-07-27, re-verify each cycle)
- Live site is **foot v820**, served by Webflow with `demigod-foot-core.js` (a pinned CDN commit pasted
  into the footer) rewriting the DOM at runtime: routing, copy scrubs, WIZ, rendering.
- **`demigod-foot-core.js` is OFF LIMITS.** In the main working tree it is dirty with a large uncommitted
  change (`+10 / −2408` vs HEAD) made by another process, the **foot-lock is held by another `potter`
  actor**, and multiple agent worktrees exist. Editing it would clobber in-flight work you don't
  understand. Do **not** edit, `git checkout`, `git stash`, or "fix" it. Do not touch its version markers.
  If you need to prove a foot-core change parses/boots, do it in an **isolated git worktree** (see below),
  never in the main tree.
- **Publishing is NOT authorized.** No CDN push, no Webflow footer paste, no `publish_site`, no Designer
  writes, no `git push`. The posture is prepare-only and stays that way. `bin/dg truth` is the only
  source of live-version truth; never copy a version into any doc.
- The site's honest model (keep all copy true to it): tech ranks fit → humans review → intro only on
  mutual interest → **10% of first-year cash on hire, free for talent**. Never overclaim.
  [[demigod-dont-invent-promises-positioning]] [[demigod-dont-claim-finished-dont-presume]]

## What "website work" means here — the ladder (take the highest-value ready item)
Everything below is **local, no-publish, no-foot-core-clobber, new-file-or-clean-file only**. Publishing
and any foot-core paste is a separate step that needs potter's explicit authorization in a live request.

1. **Automated site-QA that codifies the review findings as fail-capable checks.** This is the highest
   value: it makes the findings *durable* (caught on every run, not just once). Build/extend small
   focused tools that check the LIVE site and fail-closed on regressions. Concrete targets:
   - **Route health**: every public pretty-path (`/hire /talent /startups /events /partnerships /legal
     /pricing /about /faq /how /security` …) returns 200, and known-broken bare paths (`/partners /mud
     /referral`) are reported — pure `fetch`, reliable, no CDP.
   - **Analytics-endpoint sanity**: flag when the served footer points `__dgWebhookUrl` at a
     `trycloudflare.com` dev tunnel (the CORS-on-every-page bug) instead of a stable host.
   - **Rendered structure/SEO** (needs CDP on :9223, already running — guard for flakiness, retry once):
     meta-description length in 120–160 on content routes, ≥1 `<h2>` on long content pages, `og:title`
     + `canonical` present, no `Untitled`/bare titles, console/CORS error count per route,
     FAQPage schema present on `/faq`.
   Each check: verify-first, prove it can go RED (poison the input), keep it non-vacuous.

2. **Ready-to-integrate feature deliverables** (standalone, self-contained, verified — NOT wired into
   foot-core, just built and proven so integration is trivial later):
   - **Public Hiring Pulse page** — `renderPulseHtml` already exists in `demigod-hiring-pulse.mjs`;
     generate the page, verify it renders + is honest. NOTE: the `[[demigod-categorizerole-aidata-bias]]`
     classification inflates the public "AI beats P+D+M" %, so either gate that claim or add a visible
     caveat until potter decides. Do not ship a claim you know is biased.
   - **FAQPage JSON-LD generator** — pure function: FAQ Q&A array → schema.org/FAQPage JSON-LD string.
     New file + poison-tested. Ready to embed for Google rich results.
   - **Directory filter/search prototype** — a standalone component over the directory/ledger data
     (function / stage / role-age), verifiable offline.
   - **Live honest counters** snippet — "N startups reviewed · X roles tracked" computed from the
     directory/ledger data (no fabrication), as a self-contained fragment.
   - **Structured pricing table** fragment — the fee model as a scannable table.

3. **A precise, verified apply-spec for the foot-core fixes** (for when the tree is clean + potter
   authorizes): analytics fail-silent wrapper, per-page `<h2>` subheads, tightened meta descriptions.
   Write the exact code and PROVE it parses/boots in an **isolated worktree copy** of foot-core
   (`git worktree add /tmp/dg-foot-<n> HEAD`, edit there, run `demigod-foot-smoke.mjs` there, capture the
   result, then `git worktree remove`). Never apply to the main tree. Deliver the spec + the smoke proof.

4. **Harden the clean site-content/verification tools** (NOT foot-core): `demigod-hiring-pulse`,
   `demigod-startup-jobs-enrich`, the map/directory generators, `demigod-live-honesty-audit` — any
   untested non-trivial logic that feeds what the site shows. (Much is already hardened this session —
   check git log before re-covering.)

## Loop discipline (every cycle)
- **Orient**: `bin/dg truth`; `git log --oneline -6`; `git status --short demigod-foot-core.js` (still
  dirty? still not yours? then still off-limits); note which files are clean vs others' WIP; confirm CDP
  on :9223 if you need it. Some of your own committed files may be externally refined by other
  agents/linters — keep those, just re-run your tests to confirm still green.
- **Pick ONE** highest-value ladder item that is safe + finishable this cycle. Prefer finishing over
  starting. New files or clean files only; never edit dirty WIP, `package.json`, or `foot-core`.
- **Verify-first**: reproduce/observe before asserting; prove every checker can go RED (poison-test in the
  REPO dir so relative imports resolve; `node:test` summary is `ℹ tests/pass/fail`; escape `/` inside
  regex literals; `Date.parse(0)`→ year-2000 not NaN; templates may bold whole phrases). If a test can't
  be made to fail when the guard is removed, DROP it — never ship vacuous green.
  [[demigod-verify-the-verifier]] [[coord-self-audit-meta-rule]]
- **Commit** each verified unit locally with `git commit --only <files>` (surgical), clear message,
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. NEVER `git push`.
- **Log** one line: what you did + the verification result.
- **CDP hygiene**: close tabs you open (`page.close()`); don't kill the shared browser or other agents'
  processes. If you run a temp script in the repo dir for `node_modules` resolution, `rm` it after.

## Hard guardrails (never cross without exact authorization in a live user request)
No publish (CDN/Webflow/`publish_site`/Designer). No outbound (DMs/email/posts/forms/events sends). No
money movement. No `git push`. No foot-core edit in the main tree. No touching other agents' dirty WIP or
`package.json`. Ponytail every edit (reuse > add, smallest correct diff, one runnable check). Don't invent
rules/promises/positioning. Don't declare the site finished.

## When to stop
Stop (ScheduleWakeup `stop:true`) when the only remaining work needs publishing, potter's authorization,
a human/taxonomy decision, or would require touching foot-core/other WIP — i.e. when continuing would mean
manufacturing busywork. Stopping with a clear report is the normal, correct ending. Leave the tree green
and committed; report what's blocked and why.
