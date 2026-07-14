# Demigod — Full Project History & Tool Atlas
**Living document** · generated 2026-07-14T18:37:40.226071+00:00  
**Workspace:** `/home/potter` · **Live:** https://www.trydemigod.com · **Webflow:** talentlink-sf

This consolidates documentation, git history, agent work, website stack, and internal tools so humans and agents share one map.

---

## 1. One-line product truth

**Demigod** = human-matched SF startup talent: outcome-led briefs/profiles → human review → mutual yes → intro · **10% on hire** · candidates free · `hello@trydemigod.com` · pre-services (payments/SMS pending).  
**Not** a job board / ATS / blast marketplace.

---

## 2. Chronological phases (evidence-based)

### Phase 0 — Init
- Repo bootstrap: `3029ead init: demigod + dev workspace base`
- Canonical pattern established: head-minimal + footer-lite + foot-core JS

### Phase 1 — Website core (foot versions ~v150–v187)
- Typeform-style WIZ stepper (startup + engineer + partner)
- 90day-outcome required + explicit review step
- Runtime honesty scrub (48h/SLA)
- Dual CTAs: I'm hiring / Find a job
- Product pages (how/hire/talent/pricing/…)
- **Critical postmortem:** v187 MutationObserver freeze (`wizBuild` style thrash) — see publish-load postmortem
- CDN via catbox; Webflow custom code paste

### Phase 2 — Ops OS (2026-07-12 → 07-13)
- Submissions inbox + board honesty gates
- Matching pair ledger (`DEMIGOD-PAIRS`) + match review queue
- Control plane + agent dashboard (:9878) Home merge
- Review tool v2, Webflow workbench, laptop hygiene
- Multi-agent prompt packs in `docs/exchange/`
- GitHub private backup `Uuriko/demigod-ops`

### Phase 3 — Cohesion + remote (this era)
- Orca mobile bridge (`bin/dg-orca`), keep-awake
- full-check, ship-prep, freeze guards on mutators
- Match honesty: no auto-seed, realProposed metrics
- Approve via `mintBoardEntry`, sample-by-default
- Design ships: **v196 → v197 → v198** live (gold system, brand assets, product shell v3)
- Master website improvement prompts (Codex/Claude/Fable)

### Still true
- **Demand** is the business bottleneck (agents may not nag GTM)
- **Human Publish** often required when Webflow session 412s
- **Freeze** used to prevent thrash after green ships

---

## 3. Who built what (agent roles)

| Actor | Typical ownership |
|-------|-------------------|
| **Grok (local)** | Implement foot/head, CDN, CDP paste, tools, verify, Orca, ship automation |
| **Fable / Claude** | Plans, audits, design/product prompts, boss authority via `bin/df` |
| **Codex** | Deep code review, WIZ correctness, ship pipeline specs, tool fixes |
| **Cursor** | Multi-file edits when in plan mode; cloud Webflow MCP only if asked |
| **Heavy (SuperGrok)** | Strategy / design direction (when available) |
| **Human** | Publish click (when session needs re-auth), final UX, freeze policy |

---

## 4. Website architecture (annotated)

```
Browser (trydemigod.com)
  ├── HEAD paste ← demigod-head-minimal.html
  │     ├── critical CSS + unhide-v5 (finite, no MO thrash)
  │     └── link → demigod-head-styles.css (CDN catbox)
  ├── Webflow canvas HTML (structure)
  └── FOOT paste ← demigod-footer-lite.html
        └── <script src=CDN foot-core.js>
              └── demigod-foot-core.js  ← ONLY site behavior SoR
                    ├── COPY / WIZ / CTAs / FAQ / trust
                    ├── board fetch (sample-labeled)
                    ├── product routes /?p=how
                    └── honesty scrub
```

**Product pages:** `demigod-pages/*.html` + `_shell.css` → upload catbox → `DEMIGOD-PAGES.json` map → Webflow redirects (when session auth works) or `/?p=` loader.

**Ship path:** freeze off → foot-cdn-publish → head-css-publish → cm6-paste-publish (Save) → Publish → live smoke.

---

## 5. Control plane modules

| Module | Why |
|--------|-----|
| site | Live foot healthy vs disk |
| webflow | Freeze, CDP, paste readiness |
| match | Inbox → pairs → review → intro |
| review | Diff-aware policy scan |
| hygiene | Tab/load budget |
| ship | Mutate CDN/Webflow only when safe |
| swarm | Multi-agent handoffs |
| orca | Phone ↔ laptop seat |

Front door: **`bin/dg`** → `demigod-control.mjs` · Dash: **:9878**

---

## 6. Internal tools atlas

### 6.1 Hot path (`bin/dg` + registry)

\n#### Group: session\n- `bin/dg home` — Cohesive map: site/webflow/match/review/hygiene/ship/orca **[hot]**\n- `bin/dg full-check` — Doctor + orca + gates + smoke (one spine) **[hot]**\n- `bin/dg-cockpit` — Single honest NEXT + hash chain **[hot]**\n- `bin/dg-smoke` — CDP body/h1/foot/WIZ proof **[hot]**\n- `bin/dg-usertest` — Unified site+dash+tools+forms UX suite **[hot]**\n- `bin/dg-usertest --quick` — Faster UX suite without full selftest **[hot]**\n- `node demigod-doctor.mjs` — Env health: CDP, dash, keys, bins, orca **[hot]**\n- `bin/dg-webflow status` — Freeze/tabs/truth/playbooks for Designer+Custom Code **[hot]**\n- `bin/dg-webflow doctor` — CDP + Designer + custom-code + freeze readiness **[hot]**\n- `node demigod-laptop-hygiene.mjs --prune` — Prune CDP tabs + load/mem check **[hot]**\n- `bin/dg-review` — Diff-aware rules, baseline, SARIF, fix prompt **[hot]**\n- `node demigod-submissions-approve.mjs --list` — Mint sample board card via mintBoardEntry **[hot]**\n- `bin/dg-inbox` — Redacted startup/engineer/partner queue **[hot]**\n- `bin/dg-matches list` — Pair ledger review queue (not public board) **[hot]**\n- `node demigod-pairs-lib.mjs list` — Canonical DEMIGOD-PAIRS propose/review/consent\n- `node demigod-auto-propose.mjs --json` — Score roles×cands → DEMIGOD-PAIRS (min score 72) **[hot]**\n- `node demigod-intro-draft.mjs <sub-id|pairId>` — Draft intro (gate: approved|mutual_yes; --force audits)\n- `curl -sS http://127.0.0.1:9878/api/agent-brief` — Markdown brief for models **[hot]**\n- `bin/dg-start` — Env + chrome + workspace hygiene\n- `node demigod-truth.mjs --md` — live==disk claims\n- `node demigod-preflight.mjs` — Before foot edits\n- `node demigod-handoff.mjs --note "…"` — Session handoff note\n\n#### Group: orca\n- `bin/dg-orca up` — Keep-awake + desktop Orca + pair + hubs **[hot]**\n- `bin/dg-orca status` — Runtime + keep-awake + pair doctor **[hot]**\n- `bin/dg-orca pair` — Phone pairing orca:// URL + HTML **[hot]**\n- `bin/dg-orca swarm` — Spawn grok+claude+codex in demigod-swarm worktree\n- `bin/dg-orca site` — Open live site + control plane in Orca browser\n\n#### Group: gates\n- `bin/dg-review --bug --gates` — Stricter + targeted gates\n- `node demigod-review-selftest.mjs` — Fixture proof of review engine\n- `npm run demigod:sprint-selftest` — Pairs + intro gate + board audit presence\n- `npm run demigod:verify:source` — Foot/head/footer source gate\n- `node demigod-verify-board-honesty.mjs` — ≤3 seed roles, real counts honest\n- `node demigod-verify-loop-state.mjs` — Loop/busy state consistency\n- `node demigod-foot-smoke.mjs` — Local foot JS smoke\n\n#### Group: ship\n- `node demigod-ship-checklist.mjs` — Freeze-aware ship readiness (no publish) **[hot]**\n- `bin/dg ship-prep` — Gates + paste paths + next commands (no mutate if frozen) **[hot]**\n- `node demigod-publish-freeze.mjs status` — Publish freeze on/off\n- `node demigod-ship-status.mjs` — CDN/ship snapshot\n- `node demigod-foot-cdn-publish.mjs` — Upload foot to catbox + manifest\n- `node demigod-cm6-paste-publish.mjs --footer-only` — Paste footer into Webflow custom code\n- `node demigod-cdp-tab-prune.mjs` — Close excess Chrome tabs\n\n#### Group: swarm\n- `node demigod-plan-inbox.mjs --useful` — Unread agent plans\n- `node demigod-tools-registry.mjs --md` — This catalog **[hot]**\n- `bin/dg-dash` — Agent dashboard UI :9878 **[hot]**\n\n#### Group: forms\n- `node demigod-wiz-cdp-playtest.mjs --local` — Local WIZ stepper playtest\n- `bin/dg-submit-fixture` — Webflow form submit mock harness\n

### 6.2 CLI wrappers (`bin/dg*`) — 55 files

| Binary | Header |
|--------|--------|


### 6.3 `demigod-*.mjs` inventory — 244 modules

Grouped by purpose (first-line header when present):

\n#### `website-runtime` (20)\n\n- `demigod-add-page-probe.mjs` — (no header)\n- `demigod-candidate-copy-pass.mjs` — Resize Designer + canvas/Webflow AI pass for all-candidate SF startup copy.\n- `demigod-cdp-wiz-audit.mjs` — Demigod CDP WIZ audit helper (internal tool).\n- `demigod-copy-inventory.mjs` — Full copy inventory: static HTML + hidden DOM + runtime-injected.\n- `demigod-copy-policy.mjs` — Copy-policy checker — disk foot COPY + live HTML by default.\n- `demigod-copy-scrub-audit.mjs` — Detects volume language ("3-5 highly...", receive 3-5) and lorem placeholders that evade main scrub.\n- `demigod-copy-static-ai.mjs` — Webflow AI: permanent static scrub of 48h / John Doe + page SEO meta.\n- `demigod-foot-lock.mjs` — Durable foot-core writer lock (claim / release / status / check).\n- `demigod-github-restore-foot.mjs` — Restore demigod-foot-core.js on GitHub via push_files payload file + gh api fallback.\n- `demigod-intake-from-wiz.mjs` — demigod-intake-from-wiz.mjs\n- `demigod-legal-page-pass.mjs` — Create /legal via add-page-menu-button → Create page; publish; verify 200.\n- `demigod-pages-build.mjs` — .html; do curl -F reqtype=fileupload -F fileToUpload=@$f https://catbox.moe/user/api.php; done\n- `demigod-pages-probe.mjs` — (no header)\n- `demigod-partnerships-page-pass.mjs` — Create /partnerships Webflow page (mirror legal-page-pass); publish; verify 200 + foot-core.\n- `demigod-route-pages-pass.mjs` — Create /legal and /partnerships Webflow pages if missing; publish; verify 200 + foot-core.\n- `demigod-ship-head-now.mjs` — * One-shot: paste canonical HEAD + footer-lite into Webflow custom code,  * Save, Publish with production domain selected, verify www.trydemigod.com.\n- `demigod-sla-pager.mjs` — Track <2h first-reply SLA on form submissions. Alerts via Slack + local badge JSON.\n- `demigod-wiz-a11y-audit.mjs` — WIZ a11y + perf audit via CDP: labels, contrast (WCAG), focus, dialog role, LCP/CLS.\n- `demigod-wiz-cdp-playtest.mjs` — demigod-wiz-cdp-playtest.mjs\n- `demigod-wizard-playtest.mjs` — CDP playtest: Typeform wizard v53 — one field per step, review, nav, screenshots.\n\n#### `verify-gates` (17)\n\n- `demigod-claim-verify.mjs` — Claim-verifier — "fixed" must mean re-checked fact (Sonnet settlement).\n- `demigod-foot-smoke.mjs` — Boot smoke test for demigod-foot-core.js.\n- `demigod-intake-smoke.mjs` — Brief intake smoke: live forms + webhook path + wizard UX.\n- `demigod-review-selftest.mjs` — * demigod-review-selftest — fixture-based proof the review engine works\n- `demigod-ship-checklist.mjs` — * Ship readiness checklist — freeze-aware, local-only truth.  * CLI: node demigod-ship-checklist.mjs [--json]  * Does NOT publish. Answers: "are we allowed / re\n- `demigod-source-truth-pass.mjs` — Heavy 12-step source truth pass: masters + canvas delete + custom code + CDN + verify.\n- `demigod-sprint-selftest.mjs` — * Consensus sprint selftest — pairs + intro gate + audit file presence.  * Usage: node demigod-sprint-selftest.mjs\n- `demigod-tools-selftest.mjs` — * Self-test for settlement / agent tools.  * Exit codes checked WITHOUT pipes (PIPESTATUS trap).  *  * Usage: node demigod-tools-selftest.mjs\n- `demigod-truth.mjs` — demigod-truth — single verified facts blob (no prose claims).\n- `demigod-verify-all.mjs` — Run all Demigod verifications: source → live HTTP → optional CDP playtest.\n- `demigod-verify-board-honesty.mjs` — Board honesty gate — pre-services phase: fails on any fabricated proof.\n- `demigod-verify-claims.mjs` — (no header)\n- `demigod-verify-live.mjs` — Fast HTTP verification of Demigod live site (no CDP).\n- `demigod-verify-loop-state.mjs` — Trust regression: ## loop-state claims in keep-going.md must match disk.\n- `demigod-verify-receipt.mjs` — Verify foot-core has receipt route + board receipts schema.\n- `demigod-verify-signal-theater.mjs` — Verify signal theater exports are fresh and manifest-valid.\n- `demigod-verify-source.mjs` — Verify local Demigod source files match deployed split architecture.\n\n#### `matching-inbox` (25)\n\n- `demigod-auto-propose.mjs` — Auto-propose pairs from board roles × candidates (no board mint, freeze-safe).\n- `demigod-intro-draft.mjs` — demigod-intro-draft.mjs — draft intro email from a submission id (NO SEND).\n- `demigod-intro-generator.mjs` — Demigod Intro Generator (automation for human review)\n- `demigod-intro.mjs` — dg-intro — mutual-yes gate + intro packet log (no board mint).\n- `demigod-match-review.mjs` — Match Review Queue — read/review pairs (no board mint).\n- `demigod-match.mjs` — dg-match — shortlist candidates against a pilot's 90-day outcome.\n- `demigod-matching-engine.mjs` — Demigod Matching Engine (ops tool)\n- `demigod-pairs-lib.mjs` — Canonical pair ledger — roleId:candidateId mutual-yes / review state.\n- `demigod-pilot-logger.mjs` — Log a real pilot → board JSON + CDN publish + receipt mint + signal card.\n- `demigod-pilot-os.mjs` — Thin pilot OS — one place for white-glove pilot state (not a product rewrite).\n- `demigod-pilot-tracker.mjs` — demigod-pilot-tracker.mjs\n- `demigod-plan-inbox.mjs` — Plan / multi-agent drop inbox for Grok.\n- `demigod-submission-triage.mjs` — Demigod Submission Triage (simple rule-based)\n- `demigod-submissions-approve.mjs` — * Approve inbox submission → mintBoardEntry (sample by default) + optional CDN.  * Routes through mintBoardEntry so sample/review gates stay honest.\n- `demigod-submissions-e2e.mjs` — E2E: webhook ingest → inbox → approve → board CDN.\n- `demigod-submissions-inbox.mjs` — Unified inbox view — startup, engineer, partner submissions in one triage report.\n- `demigod-submissions-ingest.mjs` — CLI: ingest a submission from JSON file or stdin → board + CDN publish.\n- `demigod-submissions-lib.mjs` — Anonymize Webflow form payloads → public board entries. No PII on featured cards.\n- `demigod-submissions-lib.test.mjs` — (no header)\n- `demigod-submissions-stale.mjs` — Flag stale status=new submissions (honesty: "will follow up" vs abandoned queue).\n- `demigod-submissions-triage-90d.mjs` — demigod-submissions-triage-90d.mjs\n- `demigod-submissions-triage.mjs` — Bulk-mark e2e / playtest inbox noise as spam.\n- `demigod-submissions-view.mjs` — * demigod-submissions-view.mjs  * Stub inbox viewer for WIZ briefs, applies 90d triage.  * Mocks some from form fields + 90d.\n- `demigod-submissions-webhook.mjs` — Local Webflow form webhook receiver → inbox + anonymized board → publish CDN.\n- `demigod-submit-to-pilot.mjs` — * Bridge: new startup submission → pilot-os draft (no board mint).  *  * Usage:  *   node demigod-submit-to-pilot.mjs --id sub-xxx  *   node demigod-submit-to-p\n\n#### `webflow-publish` (19)\n\n- `demigod-board-publish.mjs` — Publish DEMIGOD-BOARD.json to catbox CDN for foot-core fetch.\n- `demigod-cm6-paste-publish.mjs` — Paste demigod head + footer-lite into Webflow Custom Code via CDP cmTile.view.dispatch\n- `demigod-final-publish-pass.mjs` — Canvas patch + reliable publish + live drift check.\n- `demigod-foot-cdn-publish.mjs` — Retries permanent catbox; verifies non-empty body; never writes a dead CDN URL.\n- `demigod-foot-cdn-resolve.mjs` — Upload demigod-foot-core.js; resolve CDN URL via network + dashboard assets scrape.\n- `demigod-freeze.mjs` — File freeze / churn detector.\n- `demigod-head-css-publish.mjs` — Upload demigod-head-styles.css to catbox; patch link in demigod-head-minimal.html\n- `demigod-legal-publish.mjs` — (no header)\n- `demigod-partnerships-publish-pass.mjs` — Publish existing partnerships page in Webflow Designer; verify /partnerships 200.\n- `demigod-publish-foot.mjs` — Hash-gated foot publish pipeline:\n- `demigod-publish-freeze.mjs` — Publish freeze switch — hard-stop real publishes when site is green.\n- `demigod-publish-receipt.mjs` — Append-only publish receipts (hash chain: disk → CDN → live).\n- `demigod-redirects.mjs` — List / set Webflow 301 redirects via CDP session on dashboard.\n- `demigod-webflow-ai-ship.mjs` — Full source-truth ship: Webflow AI → wait → canvas patch → publish → verify metrics.\n- `demigod-webflow-audit.mjs` — Audit Demigod Webflow designer/preview via CDP — extract issues for Heavy + apply loop.\n- `demigod-webflow-lib.mjs` — * demigod-webflow-lib — shared Webflow/CDP helpers for agents\n- `demigod-webflow-publish-auto.mjs` — demigod-webflow-publish-auto.mjs\n- `demigod-webflow-webhook-setup.mjs` — CDP: register Webflow form_submission webhooks → public tunnel URL.\n- `demigod-webflow.mjs` — demigod-webflow — agent-first Webflow workbench\n\n#### `dashboard-control` (7)\n\n- `demigod-control.mjs` — demigod-control — cohesive Control Plane over all Demigod ops modules\n- `demigod-doctor.mjs` — * demigod-doctor — local environment health for agents  * node demigod-doctor.mjs [--json]\n- `demigod-full-check.mjs` — * demigod-full-check — one spine: doctor → orca → gates → smoke → control plane  * Freeze-safe (no ship/mutate).  *  *   node demigod-full-check.mjs [--json] [-\n- `demigod-internal-dashboard.mjs` — (no header)\n- `demigod-laptop-hygiene.mjs` — demigod-laptop-hygiene — tabs + light process/load check for a snappy laptop\n- `demigod-ship-prep.mjs` — * Freeze-safe ship prep — builds pastes + checklist without mutating live CDN/Webflow  * unless freeze is OFF.  *  *   node demigod-ship-prep.mjs [--json]\n- `demigod-tools-registry.mjs` — * Demigod tools registry — agent-discoverable catalog of keep-path tools.  * CLI: node demigod-tools-registry.mjs [--json] [--md] [--group gates]  * Used by das\n\n#### `gtm-outreach` (12)\n\n- `demigod-dm-mark-sent.mjs` — Also updates DM-BATCH-TRACKER.md Sent date when name matches a table row.\n- `demigod-founder-dm-blast.mjs` — Generate personalized founder outreach (DM + email). Dry-run only — never auto-sends.\n- `demigod-gtm-asset-gen.mjs` — Creative GTM asset generator: honest proof packs from live + board for DMs (no fakes)\n- `demigod-gtm-blast.mjs` — demigod-gtm-blast.mjs --dry\n- `demigod-gtm-dm-helper.mjs` — GTM DM helper for Demigod.\n- `demigod-gtm-execute.mjs` — * demigod-gtm-execute.mjs  * "Execute" the prepared sends by logging them (sim for GTM).  * Uses the sends dir + log-send.\n- `demigod-gtm-log-send.mjs` — * demigod-gtm-log-send.mjs  * Log a sent DM, tie to 90d outcome for tracking.  * Usage: node demigod-gtm-log-send.mjs --role="Founding PM" --to="name@co.com" --\n- `demigod-gtm-personalizer.mjs` — Lean GTM DM personalizer stub (internal tool).\n- `demigod-gtm-prep-sends.mjs` — demigod-gtm-prep-sends.mjs\n- `demigod-gtm-status.mjs` — * One-shot GTM status for Demigod autopilot handoffs.  * Usage: node demigod-gtm-status.mjs  * Writes: /tmp/demigod-gtm-status-latest.md + .json\n- `demigod-outreach-tracker.mjs` — Outreach state machine — warm leads without spam automation.\n- `demigod-verify-gtm-scripts.mjs` — Smoke-test GTM assist scripts (blast dry-run + SLA test tick).\n\n#### `design-pages` (9)\n\n- `demigod-canvas-simplify.mjs` — Canvas bloat delete only — no Tally, no mythic inject.\n- `demigod-design-audit.mjs` — Design audit: screenshots + off-palette color scan on key routes.\n- `demigod-design-snap.mjs` — Fast snap: trust + privacy only\n- `demigod-designer-bloat-delete.mjs` — Designer canvas: permanent DELETE of hidden bloat (not CSS hide). Publish when changes made.\n- `demigod-designer-form-rename.mjs` — Rename modal forms in Webflow Designer Settings panel + publish.\n- `demigod-designer-resize.mjs` — Resize Chrome window + Webflow Designer viewport to exit "browser too small" mode.\n- `demigod-hero-canvas-cleanup.mjs` — Permanently replace mythic hero copy on Webflow canvas + publish + verify.\n- `demigod-pricing-canvas-delete.mjs` — Permanently delete subscription pricing + hiring-model from Webflow canvas, publish, verify.\n- `demigod-proof-visualizer-stub.mjs` — Lean proof visualizer stub (internal GTM tool).\n\n#### `agent-collab` (40)\n\n- `demigod-agent-cockpit.mjs` — Demigod Agent Cockpit — single source of "what should I do next"\n- `demigod-agent-dashboard.mjs` — Demigod multi-agent + tools dashboard (agent-first)\n- `demigod-agent-smoke.mjs` — demigod-agent-smoke.mjs — one-shot live proof for agents\n- `demigod-agent-tools-lib.mjs` — * Shared helpers for Demigod agent tooling (settlement suite).  * Keep small — no side effects on import.\n- `demigod-cursor-explore.mjs` — Exhaustive cursor.com dashboard exploration for Demigod config planning.\n- `demigod-cursor-orchestrator.mjs` — demigod-cursor-orchestrator.mjs\n- `demigod-fable-copilot.mjs` — Fable/Cursor recruiting copilot stub (meta tool + proof).\n- `demigod-handoff.mjs` — Session handoff card — write at end of Grok/agent session for the next agent.\n- `demigod-heavy-architecture-handoff.mjs` — Site architecture report → SuperGrok Heavy\n- `demigod-heavy-cleanup-pass.mjs` — Heavy verdict cleanup: Webflow canvas DELETE + page SEO + publish + verify.\n- `demigod-heavy-competitors-followup.mjs` — Follow-up: Heavy sections A–F (first pass hit token limit).\n- `demigod-heavy-competitors-fresh.mjs` — Fresh Grok chat — condensed research digest → Heavy ACK + refine\n- `demigod-heavy-competitors-handoff.mjs` — Competitors + features research brief → SuperGrok Heavy\n- `demigod-heavy-copy-inventory.mjs` — Send full copy inventory to SuperGrok Heavy for audit + delete list.\n- `demigod-heavy-copy-prompt.mjs` — Copy audit → SuperGrok Heavy → COPY SPEC for Cursor.\n- `demigod-heavy-creative-next.mjs` — SuperGrok Heavy — creative deep next moves post-v64 copy policy + dynamic ledger.\n- `demigod-heavy-elegance-handoff.mjs` — Ask SuperGrok Heavy: code problems, bloat fruit, elegance + performance\n- `demigod-heavy-finish-next.mjs` — Full status → SuperGrok Heavy → very long FINISH FIRST + WORK NEXT Cursor prompt.\n- `demigod-heavy-form-fields.mjs` — Ask SuperGrok Heavy: precise form fields for Fonzi/Jack & similar dual-flow startups.\n- `demigod-heavy-full-audit.mjs` — Send full website audit to SuperGrok Heavy.\n- `demigod-heavy-full-sync.mjs` — Full audit + Heavy history digest → SuperGrok Heavy consult (build-focused).\n- `demigod-heavy-grok-build-research.mjs` — Ask SuperGrok Heavy to research Grok Build best practices + return master prompt.\n- `demigod-heavy-grok-options-research.mjs` — Report AGENTS.md routing options to Heavy + ask for deeper Grok Build capabilities research.\n- `demigod-heavy-grok-perf.mjs` — Ask SuperGrok Heavy: best Grok Build performance for Demigod agent work.\n- `demigod-heavy-history-digest.mjs` — Index SuperGrok Heavy Demigod-related threads from local artifacts.\n- `demigod-heavy-improve-prompt.mjs` — Report Demigod status to SuperGrok Heavy → collect improve Cursor prompt.\n- `demigod-heavy-leverage-next.mjs` — SuperGrok Heavy: highest leverage next actions — creative + blunt.\n- `demigod-heavy-master-code.mjs` — Ask SuperGrok Heavy for Navigation/Footer master + form rename CDP code.\n- `demigod-heavy-partnership-hybrid-c.mjs` — SuperGrok Heavy: Option C hybrid partnership — research + implementation plan + Cursor agent prompt.\n- `demigod-heavy-partnership-program.mjs` — Ask SuperGrok Heavy: partnership / referral program research for Demigod.\n- `demigod-heavy-pipeline.mjs` — Submissions pipeline plan → SuperGrok Heavy (no Tally, no game).\n- `demigod-heavy-priority-adjudicate.mjs` — SuperGrok Heavy — adjudicate what to do FIRST post-v65 + agent deep analysis.\n- `demigod-heavy-project-state.mjs` — Full Demigod project state → SuperGrok Heavy consult + report.\n- `demigod-heavy-roadmap.mjs` — Full status → SuperGrok Heavy → FINISH / START / PLAN + Cursor coding prompt.\n- `demigod-heavy-session-handoff.mjs` — Full session report → SuperGrok Heavy → deep research on what to work on next.\n- `demigod-heavy-ship-loop.mjs` — Heavy: close submissions loop + review gate + static drift — Demigod only.\n- `demigod-heavy-startup-checklist.mjs` — Ask SuperGrok Heavy: total startup setup + Demigod website checklist + roadmap.\n- `demigod-heavy-website-audit-pass.mjs` — Full website audit → local scans → SuperGrok Heavy (code + design + verdict).\n- `demigod-heavy-website-prompt.mjs` — Report website + GitHub CDN state to SuperGrok Heavy → collect Cursor prompt.\n- `demigod-orca-bridge.mjs` — * demigod-orca-bridge.mjs — pairing + doctor for Orca mobile ↔ demigod laptop  *  * Pairing payload v2 (base64 JSON):  *   { v, endpoint, deviceToken, publicKey\n\n#### `other` (95)\n\n- `demigod-a11y-perf-pipeline.mjs` — Lean a11y + perf pipeline stub (for WIZ/forms quality).\n- `demigod-anchors.mjs` — dg-anchors — verify search/replace anchors exist uniquely before apply.\n- `demigod-apply.mjs` — dg-apply — byte-exact plan apply with sha preconditions + ledger receipt.\n- `demigod-archive-scripts.mjs` — Archive legacy demigod automation + dead JS/HTML bundles.\n- `demigod-board-lib.mjs` — Shared board JSON helpers — signal, receipts, pilots, ghost roles.\n- `demigod-board-lib.test.mjs` — (no header)\n- `demigod-board-reset.mjs` — Reset featured board to curated seed cards (no test duplicates).\n- `demigod-board-watcher.mjs` — Board write-time watcher. Run with: node demigod-board-watcher.mjs or via entr\n- `demigod-board-write-guard.mjs` — Board write tripwire — refuse sample:false mints without honesty gate.\n- `demigod-build-loop.mjs` — Autonomous-ish build loop for Demigod software + pages.\n- `demigod-button-audit.mjs` — Full-site interactive audit: every visible link/button on key routes.\n- `demigod-capture-live-audit.mjs` — Extended live + blocker screenshots for Heavy / planning.\n- `demigod-cdp-force-latest.mjs` — demigod-cdp-force-latest.mjs\n- `demigod-cdp-regression.mjs` — Demigod CDP / WIZ Regression harness (internal tool + test).\n- `demigod-cdp-tab-prune.mjs` — Prune CDP Chrome tabs to Demigod budget (~6–10).\n- `demigod-close.mjs` — dg-close — hire outcome + fee terms + follow-up cadence (not full ATS).\n- `demigod-cms-legal-pass.mjs` — Create /legal page + Insights CMS via Webflow AI, then publish.\n- `demigod-conversion-playtest.mjs` — Conversion playtest — site green check for hiring path.\n- `demigod-drift-fix-pass.mjs` — Focused static drift fix: METHODOLOGY, TalentLink, email-form, FIND TALENT nav.\n- `demigod-events-app.mjs` — Demigod Events webapp — local static server + optional JSON API.\n- `demigod-fix-custom-code.mjs` — Fix Webflow custom code: demigod-core in Head, footer-lite in Footer.\n- `demigod-form-e2e-pw.mjs` — demigod-form-e2e-pw.mjs — Playwright form/WIZ flow proof (no CDP required).\n- `demigod-form-e2e.mjs` — demigod-form-e2e.mjs — Prove live WIZ form delivery path (Fable NOW item #2).\n- `demigod-form-submit-test.mjs` — Smoke test live Webflow forms via CDP (single browser session).\n- `demigod-forms-full-audit.mjs` — Deep CDP audit of startup + engineer modals (fields, UX, ghosts).\n- `demigod-forms-orphan-delete.mjs` — Delete orphan Email Form + Test Form from Designer canvas and Forms dashboard.\n- `demigod-forms-rename-pass.mjs` — CDP: Webflow Forms dashboard — rename email-form → startup-hire.\n- `demigod-full-audit.mjs` — Improved full audit: step-aware, skips welcome, checks vis>0, no bad statics, 90day presence, review populated, touch, next clickable, mobile/desktop.\n- `demigod-full-ship-pass.mjs` — Full ship pass: resize, nav/forms/footer/bloat canvas, AI, publish, audit, verify.\n- `demigod-future-services.mjs` — Demigod Future Services Stub (Twilio, Stripe, Microsoft for Startups / Azure).\n- `demigod-future-services.test.mjs` — * Simple test harness for demigod-future-services.mjs  * Run: node demigod-future-services.test.mjs  * Part of internal tests for future infra (pre-services hon\n- `demigod-ghost-push.mjs` — Publish ghost-roles JSON (real briefs only) for embeds / outreach.\n- `demigod-human-review-loop.mjs` — Demigod Human Review Loop helper (internal tool).\n- `demigod-job-store.mjs` — * Persisted job records under /tmp/dg-busy/jobs/ (experiment).  * CLI: node demigod-job-store.mjs list/get <id>/gc\n- `demigod-laptop-audit.mjs` — Full laptop + Demigod dev environment audit → DEMIGOD-LAPTOP-AUDIT.json\n- `demigod-lead-sourcer.mjs` — Demigod Lead Sourcer (internal automation tool)\n- `demigod-leverage-status.mjs` — Snapshot Demigod state for leverage decisions + Heavy handoff.\n- `demigod-live-custom-code-check.mjs` — Compare live footer CDN vs disk footer-lite (+ optional Webflow API via CDP).\n- `demigod-live-lib.mjs` — Shared Demigod live-site assertions — used by playtest, verify, and idle-lib.\n- `demigod-live-lib.test.mjs` — (no header)\n- `demigod-loop-audit.mjs` — demigod-loop-audit.mjs — single-conn robust audit + "screen recording" via seq shots.\n- `demigod-master-only-pass.mjs` — Master-only pass: Navigation + Footer masters + form settings via CDP + Webflow AI.\n- `demigod-mobile-audit.mjs` — Full mobile audit @ 390×844 — layout, taps, routes, wizard, copy, design.\n- `demigod-mobile-button-playtest.mjs` — Mobile tap audit: CTA hit areas + modal open reliability @ 390px.\n- `demigod-mobile-lighthouse.mjs` — Mobile Lighthouse + navigation timing audit for trydemigod.com\n- `demigod-nav-forms-pass.mjs` — Re-add Navigation component + fix both modal forms on Webflow canvas.\n- `demigod-nav-master-pass.mjs` — Open Navigation component master → FIND TALENT + publish.\n- `demigod-open-workspace.mjs` — Open Demigod website work tabs in CDP Chrome.\n- `demigod-ops-reconcile.mjs` — Ops reconcile — cross-check submits / pilots / outreach counts.\n- `demigod-partnerships-playtest.mjs` — CDP playtest: partnerships page, teaser, partner wizard, nav links.\n- `demigod-partnerships-rename-pass.mjs` — Rename Webflow "Untitled" page → Partnerships (slug partnerships); publish; verify.\n- `demigod-perf-cleanup.mjs` — Safe local performance cleanup — tabs, caches, stale ports.\n- `demigod-placement-tracker.mjs` — Demigod Placement Tracker (to payment)\n- `demigod-plan-ledger.mjs` — PLAN-LEDGER — plans cannot die silently.\n- `demigod-playtest-review.mjs` — New-user playtest + screenshot review for Demigod live site.\n- `demigod-preflight.mjs` — One-command preflight for agents (Grok self-tool).\n- `demigod-proof-logger.mjs` — Log real intros/placements → proof ledger + tweet template. No fake entries without --force.\n- `demigod-proof-pack-gen.mjs` — Honest proof pack generator: CDP screenshot + board stats + pending framing\n- `demigod-proof-sla.mjs` — * demigod-proof-sla.mjs  * Monitors 48h pilot SLA. Exit 1 if any overdue (for cron alerting).  * Uses same Slack webhook as sla-pager if available.\n- `demigod-push-live-now.mjs` — Head paste with readback\n- `demigod-quick-intake-enhanced.mjs` — Enhanced Demigod Quick Intake Generator\n- `demigod-quick-intake.mjs` — Demigod Quick Intake Generator\n- `demigod-receipt-mint.mjs` — Mint intro receipt → board JSON + publish CDN.\n- `demigod-release-check.mjs` — (no header)\n- `demigod-reply-check.mjs` — Reply / inbound capture check for Demigod GTM.\n- `demigod-resume-field-pass.mjs` — Add native Webflow File upload to engineer-join form + publish.\n- `demigod-review-fix.mjs` — * demigod-review-fix — tier A safe auto-fixers only\n- `demigod-review-gates.mjs` — * demigod-review-gates — targeted verify based on which files changed\n- `demigod-review-lib.mjs` — * demigod-review-lib — core: scope, diff hunks, baseline, report, scoring\n- `demigod-review-llm.mjs` — * demigod-review-llm — optional deep pass via claude CLI (when available)  * Never required. Adds semantic findings as rule=llm-semantic.\n- `demigod-review-rules.mjs` — * demigod-review-rules — pluggable rule catalog  * Each rule: { id, sev, tier, run(ctx) => Finding[] }  * ctx: { rel, src, root, isJs, isFoot, isMeta, bugMode }\n- `demigod-review.mjs` — demigod-review v2 — code review + bugfix orchestrator\n- `demigod-seo-nav-forms-pass.mjs` — SEO page title + nav master FIND TALENT + form label canvas fixes.\n- `demigod-session-contract.mjs` — Session / task contract — agents declare intent before heavy work.\n- `demigod-ship-gate.mjs` — * Unified Demigod ship gate — one timeout-safe pipeline:  * tabs → source → live → design snap → design audit → button quick → partnerships → wizard\n- `demigod-ship-status.mjs` — Ship state machine: disk foot → CDN manifest → live HTML\n- `demigod-signal-theater.mjs` — Export board JSON → shareable HTML card + PNG + DM snippets for founders.\n- `demigod-sms-handler.mjs` — Demigod SMS Handler (stub for Twilio webhook, pre-services pending).\n- `demigod-sms-sim.mjs` — demigod-sms-sim.mjs\n- `demigod-status-report.mjs` — Demigod project status for agents + SuperGrok Heavy.\n- `demigod-submit-fixture.mjs` — Minimal DOM stubs for form / .w-form / done / fail layouts\n- `demigod-system-audit.mjs` — Workspace + machine snapshot for Demigod ops.\n- `demigod-trust-regression.mjs` — demigod-trust-regression.mjs\n- `demigod-tunnel-start.mjs` — Start localtunnel to demigod webhook port; save public URL for Webflow.\n- `demigod-turn-lib.mjs` — Shared turn detection, screenshots, and reprompt helpers for Demigod loop.\n- `demigod-user-test.mjs` — Demigod unified user-test harness\n- `demigod-user-traversal.mjs` — Robust full user traversal: both forms, desktop+mobile, all WIZ steps (incl 90day + explicit review), state checks + seq screenshots.\n- `demigod-ux-flow-audit.mjs` — Multi-viewport Hire/Join/WIZ flow audit — Playwright, no CDP\n- `demigod-watch-submits.mjs` — Watch WIZ / form submissions inbox for new items → human alert.\n- `demigod-webhook-ensure.mjs` — Ensure local webhook + tunnel are healthy; rewire live footer if URL drifted.\n- `demigod-webhook-url.mjs` — Resolve public submissions webhook URL for footer loader + partner form POSTs.\n- `demigod-website-turn.mjs` — Demigod website autopilot turn:\n- `demigod-worker-budget.mjs` — Worker budget enforcer — cap concurrent agent processes (laptop hygiene).\n- `demigod-write-desk.mjs` — One-file desk snapshot — LAN, services, Demigod URLs, foot version.\n- `demigod-write-lock.mjs` — (no header)\n

---

## 7. Key git milestones (recent)

| Commit | Summary |
|--------|---------|
| f228a61 | Great design v198 brand assets + product pages |
| e9b744a | Design v197 cooler UI + copy |
| 1f6615b | Ship live v196 foot + head CSS |
| 9645174 | mint approve, auto-propose, ship-prep |
| ed69995 | match honesty, freeze env, orca pair bind |
| 305aa3f | full-check, freeze guards, honesty JSON |
| f6daa65 | Orca phone remote seat |
| dcc2c65 | Control plane home, tools, webflow, review |
| 9ca8d71 | Events, matching, Stripe stubs, head/publish |

---

## 8. Documentation map

| Doc | Role |
|-----|------|
| `DEMIGOD-COMPRESSED-STATE.md` | Living ship truth (update every ship) |
| `DEMIGOD-AGENTS.md` | Agent rules + canonical files |
| `DEMIGOD-WORKFLOW.md` | Human workflow |
| `AGENTS.md` / `CLAUDE.md` | Workspace + phase |
| `docs/exchange/*` | Postmortems, multi-agent packs, roadmaps |
| `prompts/demigod/MASTER-*` | Long improvement prompts |
| This file | Full history + tool atlas |

Key exchange docs: PUBLISH-LOAD-POSTMORTEM, AGENT-TOOLING, SWARM-SYNTHESIS, DASHBOARD-V2, MULTI-AGENT-PROMPT-PACK, COMPETITOR-UX-INSPIRATION.

---

## 9. Lessons learned (do not re-learn)

1. **MutationObservers that write styles** can freeze the page forever (v187).
2. **Grep gates green ≠ boot** — always foot-smoke / parse.
3. **Catbox .html is text/plain** — never user-navigate raw HTML CDN.
4. **Webflow API 412** = re-login session; Save may still land custom code.
5. **Freeze prevents thrash** after green ships; mutators must assert freeze.
6. **Sample inventory** must never look like live open roles.
7. **One-question WIZ** dies if resize unhides every field.
8. **Demand > website** for company outcome — but this doc is for engineering systems.

---

## 10. Commenting / annotation policy

We do **not** put a comment on every line of every file (noise). Instead:

1. **File header** (purpose, SoR, related commands) on every demigod module
2. **Section banners** in foot-core / control / dashboard for major subsystems
3. **This atlas** maps every module
4. **JSDoc on exports** for libraries used by multiple tools
5. **Ship receipts** in `/tmp/dg-busy/` and exchange docs

When an agent touches a file, it must leave or improve the file header.

---

## 11. Next engineering focus (software only)

See also: `prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md` + new ops tools prompt.

1. P0 website correctness (WIZ ownership, smoke version, product MIME routes)
2. Tool cohesion: one SoR matching, dashboard job freeze parity
3. Ship reliability: session 412 recovery, automated hash alignment
4. Annotate/export registry for agent discovery
5. Optional new tools: route MIME checker, live version doctor, WIZ visual regression

---

*End of atlas. Update when major ships land.*
