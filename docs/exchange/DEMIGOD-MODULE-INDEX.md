# Demigod module index (every demigod-*.mjs)

| File | Purpose |
|------|---------|
| `demigod-a11y-perf-pipeline.mjs` | Lean a11y + perf pipeline stub (for WIZ/forms quality). |
| `demigod-add-page-probe.mjs` | (no header) |
| `demigod-agent-cockpit.mjs` | Demigod Agent Cockpit — single source of "what should I do next" |
| `demigod-agent-dashboard.mjs` | Demigod multi-agent + tools dashboard (agent-first) |
| `demigod-agent-smoke.mjs` | demigod-agent-smoke.mjs — one-shot live proof for agents |
| `demigod-agent-tools-lib.mjs` | * Shared helpers for Demigod agent tooling (settlement suite).  * Keep small — no side effects on import. |
| `demigod-anchors.mjs` | dg-anchors — verify search/replace anchors exist uniquely before apply. |
| `demigod-apply.mjs` | dg-apply — byte-exact plan apply with sha preconditions + ledger receipt. |
| `demigod-archive-scripts.mjs` | Archive legacy demigod automation + dead JS/HTML bundles. |
| `demigod-auto-propose.mjs` | Auto-propose pairs from board roles × candidates (no board mint, freeze-safe). |
| `demigod-board-lib.mjs` | Shared board JSON helpers — signal, receipts, pilots, ghost roles. |
| `demigod-board-lib.test.mjs` | (no header) |
| `demigod-board-publish.mjs` | Publish DEMIGOD-BOARD.json to catbox CDN for foot-core fetch. |
| `demigod-board-reset.mjs` | Reset featured board to curated seed cards (no test duplicates). |
| `demigod-board-watcher.mjs` | Board write-time watcher. Run with: node demigod-board-watcher.mjs or via entr |
| `demigod-board-write-guard.mjs` | Board write tripwire — refuse sample:false mints without honesty gate. |
| `demigod-build-loop.mjs` | Autonomous-ish build loop for Demigod software + pages. |
| `demigod-button-audit.mjs` | Full-site interactive audit: every visible link/button on key routes. |
| `demigod-candidate-copy-pass.mjs` | Resize Designer + canvas/Webflow AI pass for all-candidate SF startup copy. |
| `demigod-canvas-simplify.mjs` | Canvas bloat delete only — no Tally, no mythic inject. |
| `demigod-capture-live-audit.mjs` | Extended live + blocker screenshots for Heavy / planning. |
| `demigod-cdp-force-latest.mjs` | demigod-cdp-force-latest.mjs |
| `demigod-cdp-regression.mjs` | Demigod CDP / WIZ Regression harness (internal tool + test). |
| `demigod-cdp-tab-prune.mjs` | Prune CDP Chrome tabs to Demigod budget (~6–10). |
| `demigod-cdp-wiz-audit.mjs` | Demigod CDP WIZ audit helper (internal tool). |
| `demigod-claim-verify.mjs` | Claim-verifier — "fixed" must mean re-checked fact (Sonnet settlement). |
| `demigod-close.mjs` | dg-close — hire outcome + fee terms + follow-up cadence (not full ATS). |
| `demigod-cm6-paste-publish.mjs` | Paste demigod head + footer-lite into Webflow Custom Code via CDP cmTile.view.dispatch |
| `demigod-cms-legal-pass.mjs` | Create /legal page + Insights CMS via Webflow AI, then publish. |
| `demigod-control.mjs` | demigod-control — cohesive Control Plane over all Demigod ops modules |
| `demigod-conversion-playtest.mjs` | Conversion playtest — site green check for hiring path. |
| `demigod-copy-inventory.mjs` | Full copy inventory: static HTML + hidden DOM + runtime-injected. |
| `demigod-copy-policy.mjs` | Copy-policy checker — disk foot COPY + live HTML by default. |
| `demigod-copy-scrub-audit.mjs` | Detects volume language ("3-5 highly...", receive 3-5) and lorem placeholders that evade main scrub. |
| `demigod-copy-static-ai.mjs` | Webflow AI: permanent static scrub of 48h / John Doe + page SEO meta. |
| `demigod-cursor-explore.mjs` | Exhaustive cursor.com dashboard exploration for Demigod config planning. |
| `demigod-cursor-orchestrator.mjs` | demigod-cursor-orchestrator.mjs |
| `demigod-design-audit.mjs` | Design audit: screenshots + off-palette color scan on key routes. |
| `demigod-design-snap.mjs` | Fast snap: trust + privacy only |
| `demigod-designer-bloat-delete.mjs` | Designer canvas: permanent DELETE of hidden bloat (not CSS hide). Publish when changes made. |
| `demigod-designer-form-rename.mjs` | Rename modal forms in Webflow Designer Settings panel + publish. |
| `demigod-designer-resize.mjs` | Resize Chrome window + Webflow Designer viewport to exit "browser too small" mode. |
| `demigod-dm-mark-sent.mjs` | Also updates DM-BATCH-TRACKER.md Sent date when name matches a table row. |
| `demigod-doctor.mjs` | * demigod-doctor — local environment health for agents  * node demigod-doctor.mjs [--json] |
| `demigod-drift-fix-pass.mjs` | Focused static drift fix: METHODOLOGY, TalentLink, email-form, FIND TALENT nav. |
| `demigod-events-app.mjs` | Demigod Events webapp — local static server + optional JSON API. |
| `demigod-fable-copilot.mjs` | Fable/Cursor recruiting copilot stub (meta tool + proof). |
| `demigod-final-publish-pass.mjs` | Canvas patch + reliable publish + live drift check. |
| `demigod-fix-custom-code.mjs` | Fix Webflow custom code: demigod-core in Head, footer-lite in Footer. |
| `demigod-foot-cdn-publish.mjs` | Retries permanent catbox; verifies non-empty body; never writes a dead CDN URL. |
| `demigod-foot-cdn-resolve.mjs` | Upload demigod-foot-core.js; resolve CDN URL via network + dashboard assets scrape. |
| `demigod-foot-lock.mjs` | Durable foot-core writer lock (claim / release / status / check). |
| `demigod-foot-smoke.mjs` | Boot smoke test for demigod-foot-core.js. |
| `demigod-form-e2e-pw.mjs` | demigod-form-e2e-pw.mjs — Playwright form/WIZ flow proof (no CDP required). |
| `demigod-form-e2e.mjs` | demigod-form-e2e.mjs — Prove live WIZ form delivery path (Fable NOW item #2). |
| `demigod-form-submit-test.mjs` | Smoke test live Webflow forms via CDP (single browser session). |
| `demigod-forms-full-audit.mjs` | Deep CDP audit of startup + engineer modals (fields, UX, ghosts). |
| `demigod-forms-orphan-delete.mjs` | Delete orphan Email Form + Test Form from Designer canvas and Forms dashboard. |
| `demigod-forms-rename-pass.mjs` | CDP: Webflow Forms dashboard — rename email-form → startup-hire. |
| `demigod-founder-dm-blast.mjs` | Generate personalized founder outreach (DM + email). Dry-run only — never auto-sends. |
| `demigod-freeze.mjs` | File freeze / churn detector. |
| `demigod-full-audit.mjs` | Improved full audit: step-aware, skips welcome, checks vis>0, no bad statics, 90day presence, review populated, touch, next clickable, mobil |
| `demigod-full-check.mjs` | * demigod-full-check — one spine: doctor → orca → gates → smoke → control plane  * Freeze-safe (no ship/mutate).  *  *   node demigod-full-c |
| `demigod-full-ship-pass.mjs` | Full ship pass: resize, nav/forms/footer/bloat canvas, AI, publish, audit, verify. |
| `demigod-future-services.mjs` | Demigod Future Services Stub (Twilio, Stripe, Microsoft for Startups / Azure). |
| `demigod-future-services.test.mjs` | * Simple test harness for demigod-future-services.mjs  * Run: node demigod-future-services.test.mjs  * Part of internal tests for future inf |
| `demigod-ghost-push.mjs` | Publish ghost-roles JSON (real briefs only) for embeds / outreach. |
| `demigod-github-restore-foot.mjs` | Restore demigod-foot-core.js on GitHub via push_files payload file + gh api fallback. |
| `demigod-gtm-asset-gen.mjs` | Creative GTM asset generator: honest proof packs from live + board for DMs (no fakes) |
| `demigod-gtm-blast.mjs` | demigod-gtm-blast.mjs --dry |
| `demigod-gtm-dm-helper.mjs` | GTM DM helper for Demigod. |
| `demigod-gtm-execute.mjs` | * demigod-gtm-execute.mjs  * "Execute" the prepared sends by logging them (sim for GTM).  * Uses the sends dir + log-send. |
| `demigod-gtm-log-send.mjs` | * demigod-gtm-log-send.mjs  * Log a sent DM, tie to 90d outcome for tracking.  * Usage: node demigod-gtm-log-send.mjs --role="Founding PM" - |
| `demigod-gtm-personalizer.mjs` | Lean GTM DM personalizer stub (internal tool). |
| `demigod-gtm-prep-sends.mjs` | demigod-gtm-prep-sends.mjs |
| `demigod-gtm-status.mjs` | * One-shot GTM status for Demigod autopilot handoffs.  * Usage: node demigod-gtm-status.mjs  * Writes: /tmp/demigod-gtm-status-latest.md + . |
| `demigod-handoff.mjs` | Session handoff card — write at end of Grok/agent session for the next agent. |
| `demigod-head-css-publish.mjs` | Upload demigod-head-styles.css to catbox; patch link in demigod-head-minimal.html |
| `demigod-heavy-architecture-handoff.mjs` | Site architecture report → SuperGrok Heavy |
| `demigod-heavy-cleanup-pass.mjs` | Heavy verdict cleanup: Webflow canvas DELETE + page SEO + publish + verify. |
| `demigod-heavy-competitors-followup.mjs` | Follow-up: Heavy sections A–F (first pass hit token limit). |
| `demigod-heavy-competitors-fresh.mjs` | Fresh Grok chat — condensed research digest → Heavy ACK + refine |
| `demigod-heavy-competitors-handoff.mjs` | Competitors + features research brief → SuperGrok Heavy |
| `demigod-heavy-copy-inventory.mjs` | Send full copy inventory to SuperGrok Heavy for audit + delete list. |
| `demigod-heavy-copy-prompt.mjs` | Copy audit → SuperGrok Heavy → COPY SPEC for Cursor. |
| `demigod-heavy-creative-next.mjs` | SuperGrok Heavy — creative deep next moves post-v64 copy policy + dynamic ledger. |
| `demigod-heavy-elegance-handoff.mjs` | Ask SuperGrok Heavy: code problems, bloat fruit, elegance + performance |
| `demigod-heavy-finish-next.mjs` | Full status → SuperGrok Heavy → very long FINISH FIRST + WORK NEXT Cursor prompt. |
| `demigod-heavy-form-fields.mjs` | Ask SuperGrok Heavy: precise form fields for Fonzi/Jack & similar dual-flow startups. |
| `demigod-heavy-full-audit.mjs` | Send full website audit to SuperGrok Heavy. |
| `demigod-heavy-full-sync.mjs` | Full audit + Heavy history digest → SuperGrok Heavy consult (build-focused). |
| `demigod-heavy-grok-build-research.mjs` | Ask SuperGrok Heavy to research Grok Build best practices + return master prompt. |
| `demigod-heavy-grok-options-research.mjs` | Report AGENTS.md routing options to Heavy + ask for deeper Grok Build capabilities research. |
| `demigod-heavy-grok-perf.mjs` | Ask SuperGrok Heavy: best Grok Build performance for Demigod agent work. |
| `demigod-heavy-history-digest.mjs` | Index SuperGrok Heavy Demigod-related threads from local artifacts. |
| `demigod-heavy-improve-prompt.mjs` | Report Demigod status to SuperGrok Heavy → collect improve Cursor prompt. |
| `demigod-heavy-leverage-next.mjs` | SuperGrok Heavy: highest leverage next actions — creative + blunt. |
| `demigod-heavy-master-code.mjs` | Ask SuperGrok Heavy for Navigation/Footer master + form rename CDP code. |
| `demigod-heavy-partnership-hybrid-c.mjs` | SuperGrok Heavy: Option C hybrid partnership — research + implementation plan + Cursor agent prompt. |
| `demigod-heavy-partnership-program.mjs` | Ask SuperGrok Heavy: partnership / referral program research for Demigod. |
| `demigod-heavy-pipeline.mjs` | Submissions pipeline plan → SuperGrok Heavy (no Tally, no game). |
| `demigod-heavy-priority-adjudicate.mjs` | SuperGrok Heavy — adjudicate what to do FIRST post-v65 + agent deep analysis. |
| `demigod-heavy-project-state.mjs` | Full Demigod project state → SuperGrok Heavy consult + report. |
| `demigod-heavy-roadmap.mjs` | Full status → SuperGrok Heavy → FINISH / START / PLAN + Cursor coding prompt. |
| `demigod-heavy-session-handoff.mjs` | Full session report → SuperGrok Heavy → deep research on what to work on next. |
| `demigod-heavy-ship-loop.mjs` | Heavy: close submissions loop + review gate + static drift — Demigod only. |
| `demigod-heavy-startup-checklist.mjs` | Ask SuperGrok Heavy: total startup setup + Demigod website checklist + roadmap. |
| `demigod-heavy-website-audit-pass.mjs` | Full website audit → local scans → SuperGrok Heavy (code + design + verdict). |
| `demigod-heavy-website-prompt.mjs` | Report website + GitHub CDN state to SuperGrok Heavy → collect Cursor prompt. |
| `demigod-hero-canvas-cleanup.mjs` | Permanently replace mythic hero copy on Webflow canvas + publish + verify. |
| `demigod-human-review-loop.mjs` | Demigod Human Review Loop helper (internal tool). |
| `demigod-intake-from-wiz.mjs` | demigod-intake-from-wiz.mjs |
| `demigod-intake-smoke.mjs` | Brief intake smoke: live forms + webhook path + wizard UX. |
| `demigod-internal-dashboard.mjs` | (no header) |
| `demigod-intro-draft.mjs` | demigod-intro-draft.mjs — draft intro email from a submission id (NO SEND). |
| `demigod-intro-generator.mjs` | Demigod Intro Generator (automation for human review) |
| `demigod-intro.mjs` | dg-intro — mutual-yes gate + intro packet log (no board mint). |
| `demigod-job-store.mjs` | * Persisted job records under /tmp/dg-busy/jobs/ (experiment).  * CLI: node demigod-job-store.mjs list/get <id>/gc |
| `demigod-laptop-audit.mjs` | Full laptop + Demigod dev environment audit → DEMIGOD-LAPTOP-AUDIT.json |
| `demigod-laptop-hygiene.mjs` | demigod-laptop-hygiene — tabs + light process/load check for a snappy laptop |
| `demigod-lead-sourcer.mjs` | Demigod Lead Sourcer (internal automation tool) |
| `demigod-legal-page-pass.mjs` | Create /legal via add-page-menu-button → Create page; publish; verify 200. |
| `demigod-legal-publish.mjs` | (no header) |
| `demigod-leverage-status.mjs` | Snapshot Demigod state for leverage decisions + Heavy handoff. |
| `demigod-live-custom-code-check.mjs` | Compare live footer CDN vs disk footer-lite (+ optional Webflow API via CDP). |
| `demigod-live-lib.mjs` | Shared Demigod live-site assertions — used by playtest, verify, and idle-lib. |
| `demigod-live-lib.test.mjs` | (no header) |
| `demigod-loop-audit.mjs` | demigod-loop-audit.mjs — single-conn robust audit + "screen recording" via seq shots. |
| `demigod-master-only-pass.mjs` | Master-only pass: Navigation + Footer masters + form settings via CDP + Webflow AI. |
| `demigod-match-review.mjs` | Match Review Queue — read/review pairs (no board mint). |
| `demigod-match.mjs` | dg-match — shortlist candidates against a pilot's 90-day outcome. |
| `demigod-matching-engine.mjs` | Demigod Matching Engine (ops tool) |
| `demigod-mobile-audit.mjs` | Full mobile audit @ 390×844 — layout, taps, routes, wizard, copy, design. |
| `demigod-mobile-button-playtest.mjs` | Mobile tap audit: CTA hit areas + modal open reliability @ 390px. |
| `demigod-mobile-lighthouse.mjs` | Mobile Lighthouse + navigation timing audit for trydemigod.com |
| `demigod-nav-forms-pass.mjs` | Re-add Navigation component + fix both modal forms on Webflow canvas. |
| `demigod-nav-master-pass.mjs` | Open Navigation component master → FIND TALENT + publish. |
| `demigod-open-workspace.mjs` | Open Demigod website work tabs in CDP Chrome. |
| `demigod-ops-reconcile.mjs` | Ops reconcile — cross-check submits / pilots / outreach counts. |
| `demigod-orca-bridge.mjs` | * demigod-orca-bridge.mjs — pairing + doctor for Orca mobile ↔ demigod laptop  *  * Pairing payload v2 (base64 JSON):  *   { v, endpoint, de |
| `demigod-outreach-tracker.mjs` | Outreach state machine — warm leads without spam automation. |
| `demigod-pages-build.mjs` | .html; do curl -F reqtype=fileupload -F fileToUpload=@$f https://catbox.moe/user/api.php; done |
| `demigod-pages-probe.mjs` | (no header) |
| `demigod-pairs-lib.mjs` | Canonical pair ledger — roleId:candidateId mutual-yes / review state. |
| `demigod-partnerships-page-pass.mjs` | Create /partnerships Webflow page (mirror legal-page-pass); publish; verify 200 + foot-core. |
| `demigod-partnerships-playtest.mjs` | CDP playtest: partnerships page, teaser, partner wizard, nav links. |
| `demigod-partnerships-publish-pass.mjs` | Publish existing partnerships page in Webflow Designer; verify /partnerships 200. |
| `demigod-partnerships-rename-pass.mjs` | Rename Webflow "Untitled" page → Partnerships (slug partnerships); publish; verify. |
| `demigod-perf-cleanup.mjs` | Safe local performance cleanup — tabs, caches, stale ports. |
| `demigod-pilot-logger.mjs` | Log a real pilot → board JSON + CDN publish + receipt mint + signal card. |
| `demigod-pilot-os.mjs` | Thin pilot OS — one place for white-glove pilot state (not a product rewrite). |
| `demigod-pilot-tracker.mjs` | demigod-pilot-tracker.mjs |
| `demigod-placement-tracker.mjs` | Demigod Placement Tracker (to payment) |
| `demigod-plan-inbox.mjs` | Plan / multi-agent drop inbox for Grok. |
| `demigod-plan-ledger.mjs` | PLAN-LEDGER — plans cannot die silently. |
| `demigod-playtest-review.mjs` | New-user playtest + screenshot review for Demigod live site. |
| `demigod-preflight.mjs` | One-command preflight for agents (Grok self-tool). |
| `demigod-pricing-canvas-delete.mjs` | Permanently delete subscription pricing + hiring-model from Webflow canvas, publish, verify. |
| `demigod-proof-logger.mjs` | Log real intros/placements → proof ledger + tweet template. No fake entries without --force. |
| `demigod-proof-pack-gen.mjs` | Honest proof pack generator: CDP screenshot + board stats + pending framing |
| `demigod-proof-sla.mjs` | * demigod-proof-sla.mjs  * Monitors 48h pilot SLA. Exit 1 if any overdue (for cron alerting).  * Uses same Slack webhook as sla-pager if ava |
| `demigod-proof-visualizer-stub.mjs` | Lean proof visualizer stub (internal GTM tool). |
| `demigod-publish-foot.mjs` | Hash-gated foot publish pipeline: |
| `demigod-publish-freeze.mjs` | Publish freeze switch — hard-stop real publishes when site is green. |
| `demigod-publish-receipt.mjs` | Append-only publish receipts (hash chain: disk → CDN → live). |
| `demigod-push-live-now.mjs` | Head paste with readback |
| `demigod-quick-intake-enhanced.mjs` | Enhanced Demigod Quick Intake Generator |
| `demigod-quick-intake.mjs` | Demigod Quick Intake Generator |
| `demigod-receipt-mint.mjs` | Mint intro receipt → board JSON + publish CDN. |
| `demigod-redirects.mjs` | List / set Webflow 301 redirects via CDP session on dashboard. |
| `demigod-release-check.mjs` | (no header) |
| `demigod-reply-check.mjs` | Reply / inbound capture check for Demigod GTM. |
| `demigod-resume-field-pass.mjs` | Add native Webflow File upload to engineer-join form + publish. |
| `demigod-review-fix.mjs` | * demigod-review-fix — tier A safe auto-fixers only |
| `demigod-review-gates.mjs` | * demigod-review-gates — targeted verify based on which files changed |
| `demigod-review-lib.mjs` | * demigod-review-lib — core: scope, diff hunks, baseline, report, scoring |
| `demigod-review-llm.mjs` | * demigod-review-llm — optional deep pass via claude CLI (when available)  * Never required. Adds semantic findings as rule=llm-semantic. |
| `demigod-review-rules.mjs` | * demigod-review-rules — pluggable rule catalog  * Each rule: { id, sev, tier, run(ctx) => Finding[] }  * ctx: { rel, src, root, isJs, isFoo |
| `demigod-review-selftest.mjs` | * demigod-review-selftest — fixture-based proof the review engine works |
| `demigod-review.mjs` | demigod-review v2 — code review + bugfix orchestrator |
| `demigod-route-pages-pass.mjs` | Create /legal and /partnerships Webflow pages if missing; publish; verify 200 + foot-core. |
| `demigod-seo-nav-forms-pass.mjs` | SEO page title + nav master FIND TALENT + form label canvas fixes. |
| `demigod-session-contract.mjs` | Session / task contract — agents declare intent before heavy work. |
| `demigod-ship-checklist.mjs` | * Ship readiness checklist — freeze-aware, local-only truth.  * CLI: node demigod-ship-checklist.mjs [--json]  * Does NOT publish. Answers:  |
| `demigod-ship-gate.mjs` | * Unified Demigod ship gate — one timeout-safe pipeline:  * tabs → source → live → design snap → design audit → button quick → partnerships  |
| `demigod-ship-head-now.mjs` | * One-shot: paste canonical HEAD + footer-lite into Webflow custom code,  * Save, Publish with production domain selected, verify www.trydem |
| `demigod-ship-prep.mjs` | * Freeze-safe ship prep — builds pastes + checklist without mutating live CDN/Webflow  * unless freeze is OFF.  *  *   node demigod-ship-pre |
| `demigod-ship-status.mjs` | Ship state machine: disk foot → CDN manifest → live HTML |
| `demigod-signal-theater.mjs` | Export board JSON → shareable HTML card + PNG + DM snippets for founders. |
| `demigod-sla-pager.mjs` | Track <2h first-reply SLA on form submissions. Alerts via Slack + local badge JSON. |
| `demigod-sms-handler.mjs` | Demigod SMS Handler (stub for Twilio webhook, pre-services pending). |
| `demigod-sms-sim.mjs` | demigod-sms-sim.mjs |
| `demigod-source-truth-pass.mjs` | Heavy 12-step source truth pass: masters + canvas delete + custom code + CDN + verify. |
| `demigod-sprint-selftest.mjs` | * Consensus sprint selftest — pairs + intro gate + audit file presence.  * Usage: node demigod-sprint-selftest.mjs |
| `demigod-status-report.mjs` | Demigod project status for agents + SuperGrok Heavy. |
| `demigod-submission-triage.mjs` | Demigod Submission Triage (simple rule-based) |
| `demigod-submissions-approve.mjs` | * Approve inbox submission → mintBoardEntry (sample by default) + optional CDN.  * Routes through mintBoardEntry so sample/review gates stay |
| `demigod-submissions-e2e.mjs` | E2E: webhook ingest → inbox → approve → board CDN. |
| `demigod-submissions-inbox.mjs` | Unified inbox view — startup, engineer, partner submissions in one triage report. |
| `demigod-submissions-ingest.mjs` | CLI: ingest a submission from JSON file or stdin → board + CDN publish. |
| `demigod-submissions-lib.mjs` | Anonymize Webflow form payloads → public board entries. No PII on featured cards. |
| `demigod-submissions-lib.test.mjs` | (no header) |
| `demigod-submissions-stale.mjs` | Flag stale status=new submissions (honesty: "will follow up" vs abandoned queue). |
| `demigod-submissions-triage-90d.mjs` | demigod-submissions-triage-90d.mjs |
| `demigod-submissions-triage.mjs` | Bulk-mark e2e / playtest inbox noise as spam. |
| `demigod-submissions-view.mjs` | * demigod-submissions-view.mjs  * Stub inbox viewer for WIZ briefs, applies 90d triage.  * Mocks some from form fields + 90d. |
| `demigod-submissions-webhook.mjs` | Local Webflow form webhook receiver → inbox + anonymized board → publish CDN. |
| `demigod-submit-fixture.mjs` | Minimal DOM stubs for form / .w-form / done / fail layouts |
| `demigod-submit-to-pilot.mjs` | * Bridge: new startup submission → pilot-os draft (no board mint).  *  * Usage:  *   node demigod-submit-to-pilot.mjs --id sub-xxx  *   node |
| `demigod-system-audit.mjs` | Workspace + machine snapshot for Demigod ops. |
| `demigod-tools-registry.mjs` | * Demigod tools registry — agent-discoverable catalog of keep-path tools.  * CLI: node demigod-tools-registry.mjs [--json] [--md] [--group g |
| `demigod-tools-selftest.mjs` | * Self-test for settlement / agent tools.  * Exit codes checked WITHOUT pipes (PIPESTATUS trap).  *  * Usage: node demigod-tools-selftest.mj |
| `demigod-trust-regression.mjs` | demigod-trust-regression.mjs |
| `demigod-truth.mjs` | demigod-truth — single verified facts blob (no prose claims). |
| `demigod-tunnel-start.mjs` | Start localtunnel to demigod webhook port; save public URL for Webflow. |
| `demigod-turn-lib.mjs` | Shared turn detection, screenshots, and reprompt helpers for Demigod loop. |
| `demigod-user-test.mjs` | Demigod unified user-test harness |
| `demigod-user-traversal.mjs` | Robust full user traversal: both forms, desktop+mobile, all WIZ steps (incl 90day + explicit review), state checks + seq screenshots. |
| `demigod-ux-flow-audit.mjs` | Multi-viewport Hire/Join/WIZ flow audit — Playwright, no CDP |
| `demigod-verify-all.mjs` | Run all Demigod verifications: source → live HTTP → optional CDP playtest. |
| `demigod-verify-board-honesty.mjs` | Board honesty gate — pre-services phase: fails on any fabricated proof. |
| `demigod-verify-claims.mjs` | (no header) |
| `demigod-verify-gtm-scripts.mjs` | Smoke-test GTM assist scripts (blast dry-run + SLA test tick). |
| `demigod-verify-live.mjs` | Fast HTTP verification of Demigod live site (no CDP). |
| `demigod-verify-loop-state.mjs` | Trust regression: ## loop-state claims in keep-going.md must match disk. |
| `demigod-verify-receipt.mjs` | Verify foot-core has receipt route + board receipts schema. |
| `demigod-verify-signal-theater.mjs` | Verify signal theater exports are fresh and manifest-valid. |
| `demigod-verify-source.mjs` | Verify local Demigod source files match deployed split architecture. |
| `demigod-watch-submits.mjs` | Watch WIZ / form submissions inbox for new items → human alert. |
| `demigod-webflow-ai-ship.mjs` | Full source-truth ship: Webflow AI → wait → canvas patch → publish → verify metrics. |
| `demigod-webflow-audit.mjs` | Audit Demigod Webflow designer/preview via CDP — extract issues for Heavy + apply loop. |
| `demigod-webflow-lib.mjs` | * demigod-webflow-lib — shared Webflow/CDP helpers for agents |
| `demigod-webflow-publish-auto.mjs` | demigod-webflow-publish-auto.mjs |
| `demigod-webflow-webhook-setup.mjs` | CDP: register Webflow form_submission webhooks → public tunnel URL. |
| `demigod-webflow.mjs` | demigod-webflow — agent-first Webflow workbench |
| `demigod-webhook-ensure.mjs` | Ensure local webhook + tunnel are healthy; rewire live footer if URL drifted. |
| `demigod-webhook-url.mjs` | Resolve public submissions webhook URL for footer loader + partner form POSTs. |
| `demigod-website-turn.mjs` | Demigod website autopilot turn: |
| `demigod-wiz-a11y-audit.mjs` | WIZ a11y + perf audit via CDP: labels, contrast (WCAG), focus, dialog role, LCP/CLS. |
| `demigod-wiz-cdp-playtest.mjs` | demigod-wiz-cdp-playtest.mjs |
| `demigod-wizard-playtest.mjs` | CDP playtest: Typeform wizard v53 — one field per step, review, nav, screenshots. |
| `demigod-worker-budget.mjs` | Worker budget enforcer — cap concurrent agent processes (laptop hygiene). |
| `demigod-write-desk.mjs` | One-file desk snapshot — LAN, services, Demigod URLs, foot version. |
| `demigod-write-lock.mjs` | (no header) |
