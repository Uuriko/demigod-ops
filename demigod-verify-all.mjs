#!/usr/bin/env node
/** Run all Demigod verifications: source → live HTTP → optional CDP playtest. */
import { spawn } from 'child_process';
import path from 'path';

const ROOT = '/home/potter';
const browser = process.argv.includes('--browser');
const wizard = process.argv.includes('--wizard') || browser;
const ship = process.argv.includes('--ship');

if (ship || wizard) {
  const args = ['demigod-ship-gate.mjs'];
  if (browser && !wizard) args.push('--fast');
  const child = spawn(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  child.on('close', (code) => process.exit(code ?? 1));
} else {
  function run(script, args = []) {
    return new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(ROOT, script), ...args], {
        cwd: ROOT,
        stdio: 'inherit',
      });
      child.on('close', (code) => resolve(code ?? 1));
    });
  }

  const steps = [
    ['demigod-verify-board-honesty.mjs'] ,
    ['demigod-live-lib.test.mjs'],
    ['demigod-board-lib.test.mjs'],
    // Honesty poison-tests must stay fail-capable, not merely green today.
    ['demigod-verify-board-honesty.test.mjs'],
    ['demigod-demand.test.mjs'],
    ['demigod-foot-smoke.test.mjs'], // #40 — locks foot-smoke's parse+boot fail-capability (outage class)
    // Import-integrity poison (Claude/Grok): export contracts + clone-breaker edges must fail-red
    ['demigod-import-integrity.test.mjs'],
    // tools-selftest fail-capability (Claude c266): POISON=1 must fail suite (not vacuous-green)
    ['demigod-tools-selftest.poison.test.mjs'],
    // events-app policy fail-capability (Claude c269): strip CORS → assert red
    ['demigod-events-app-policy-selftest.poison.test.mjs'],
    // events-bot-selftest + funnel-loop once CLI fail-closed (unknown flags / FOCUS pause)
    ['demigod-events-bot-selftest-cli.test.mjs'],
    ['demigod-work-queue-dedupe.test.mjs'],
    ['demigod-dashboard-clean-ui.test.mjs'],
    // Canonical ship prepare must keep import-integrity + honesty steps.
    ['demigod-ship-prepare-contract.test.mjs'],
    ['demigod-webhook-ensure-private-write.test.mjs'],
    // Free-text scrubPII poison (Claude/Grok collab): identity links, phones, addresses — fail-capable
    ['demigod-submissions-lib.test.mjs'],
    // Resume/work-link required evidence on candidate ingest (pairs with adaptive form proof ask)
    ['demigod-submissions-required-evidence.test.mjs'],
    // Adaptive talent form + P0 evidence fields + WIZ ownership (email a11y describedby)
    ['demigod-adaptive-talent-form.test.mjs'],
    ['demigod-form-p0.test.mjs'],
    ['demigod-wiz-ownership-selftest.mjs'],
    ['demigod-pilot-os.test.mjs'],
    ['demigod-intro-receipt-binding.test.mjs'],
    ['demigod-outbound-poison.test.mjs'],
    // Matching funnel honesty: readiness gates + pairs CLI sample-by-default / consent fail-closed
    // (orphan tests lock nothing if only run by hand — cold-start quality > quantity)
    ['demigod-matching-readiness.test.mjs'],
    ['demigod-match-review-evidence.test.mjs'],
    ['demigod-match-review-private.test.mjs'],
    // Match engine evidence: skill/PII scrub + founder projection (was orphan unit-only)
    ['demigod-match-evidence.test.mjs'],
    // Outreach: drafted→sent requires receipt evidence (no vacuous status flip)
    ['demigod-outreach-evidence.test.mjs'],
    // D-005/D-012: research may inform review; never the automated match decision
    ['demigod-score-isolation.test.mjs'],
    // Accepted-role evidence: selftest + adversarial poison (null inbox, company atlas norm)
    ['demigod-accepted-role.mjs', ['--selftest']],
    ['demigod-accepted-role-poison.test.mjs'],
    ['demigod-accepted-role.test.mjs'],
    // Role Mission: structured notes + case/lineage/scenario/private→mutual fail-closed projection.
    ['demigod-role-packet.mjs', ['--selftest']],
    // Action layer: the never tier must stay unlockable by no flag combination, and an unknown
    // action must stay denied. Both are properties a future edit could quietly relax.
    ['demigod-action-authority.mjs', ['--selftest']],
    ['demigod-candidate-evidence.mjs', ['--selftest']],
    // Board pay: an ATS we cannot read pay from must never classify as a company that
    // withholds it. 166 of 471 boards are structurally silent, so collapsing the two
    // states understates pay transparency by 28 points and blames companies for a
    // vendor's API. The withheld/unsupported split is the assertion worth guarding.
    ['demigod-board-pay.mjs', ['--selftest']],
    // The company-truth rules: an unread board must never present as a company with no open
    // roles, and a missing role mix must not read as a counted zero. Both are one careless
    // default away from lying, and on 2026-08-17 the kernel test was the only thing that caught
    // a real regression -- while being run by no gate at all.
    ['demigod-role-mission-kernel.test.mjs'],
    ['demigod-hiring-shape.mjs', ['--selftest']],
    ['demigod-structured-hiring.mjs', ['--selftest']],
    ['demigod-dashboard-role-workspace.test.mjs'],
    ['demigod-die-web.test.mjs'],
    ['demigod-company-research-benchmark.mjs', ['--selftest']],
    // DIE company intelligence: one supported CLI over exact identity, packet, table, dry-run
    // waterfall, private memo, and writeback preview. Existing focused checks remain authoritative.
    ['demigod-company-identity.mjs', ['--selftest']],
    ['demigod-company-packet.mjs', ['--selftest']],
    ['demigod-company-waterfall.mjs', ['--selftest']],
    ['demigod-company-table.mjs', ['--selftest']],
    ['demigod-company-memo.mjs', ['--selftest']],
    ['demigod-packet-writeback.mjs', ['--selftest']],
    ['demigod-company-intelligence.test.mjs'],
    // Decay-aware source history: transport failures never stamp absence (Claude poison suite)
    ['demigod-source-history-poison.test.mjs'],
    // Research projection SSRF/quarantine poison — locks safeResearchUrl + field drop semantics
    ['demigod-research-projection-poison.test.mjs'],
    ['demigod-recruitai-export.mjs', ['--selftest']],
    ['demigod-pairs-cli-safety.test.mjs'],
    // Intro draft: sample pairs fail closed unless --force; SAMPLE marker when forced
    ['demigod-intro.test.mjs'],
    ['demigod-lead-sourcer.test.mjs'],
    ['demigod-funnel-selftest.mjs'],
    ['demigod-funnel-lock.test.mjs'],
    ['demigod-funnel-lock-race.test.mjs'],
    ['demigod-lead-enrich-lock.test.mjs'],
    ['demigod-lead-enrich-transport.test.mjs'],
    // SF startup directory: YC-public merge + host dedupe + atlas honesty (not orphan unit-only)
    ['demigod-startup-map-data.test.mjs'],
    ['demigod-startup-atlas-web.test.mjs'],
    // Jobs enrich slug honesty — domain-only slugs (blocks Camp/Cedar name→wrong ATS)
    ['demigod-startup-jobs-enrich.mjs', ['--selftest']],
    // Creative board repair is membership-invariant and requires exact owner evidence.
    ['demigod-directory-expand-creative.mjs', ['--selftest']],
    // Net-new Wikidata identity review: current, non-deprecated P31/P159 evidence.
    ['demigod-identity-review.mjs', ['--selftest']],
    // Directory rebuild-integrity floors — real map clears volume floors; truncation must fail-loud
    ['demigod-startup-map-data.mjs', ['--selftest']],
    // HN Who-is-Hiring source honesty — SF-only gate, mega-corp/subdomain exclusion, no URL injection
    ['demigod-hn-hiring.mjs', ['--selftest']],
    // Stale HN cache must not re-admit banned hosts as company websites (deel/tally/youtu/grnh/…)
    ['demigod-hn-cache-badhost.test.mjs'],
    // Last-good map: a rebuild that swaps out live boards one-for-one must not read as healthy
    ['demigod-map-checkpoint.mjs', ['--selftest']],
    // Gate integrity: a module whose selftest fires on import hands its importer a silent exit(0)
    ['demigod-selftest-guard.test.mjs'],
    // CONTRACTS.md answers for itself: enforced sections are called, prose-only ones report unwired
    ['demigod-die-contracts-check.mjs', ['--selftest']],
    // ...and the checker can still go red. The green run above only means something because these
    // feed it a broken document, a throwing executor, and a status ladder that trusts a date alone.
    ['demigod-die-contracts-check.poison.test.mjs'],
    // Gold is pinned and the map moves under it: when the selector stops reproducing gold, the
    // drift must name which companies moved rather than being absorbed into a re-selection.
    ['demigod-benchmark-selection-drift.test.mjs'],
    // Fail-closed opt-in taste prior. Nothing issues its receipts and nothing reads its output yet,
    // so this locks the only property that matters while it sits unwired: a missing or forged
    // receipt projects `unknown` and never a score. If the module is ever deleted, delete this too.
    ['demigod-taste-prior.mjs', ['--selftest']],
    // Two DIE modules that were untracked and unrun: whether a company is still operating, and the
    // corpus defects that would otherwise be discovered by a reader.
    ['demigod-company-liveness.mjs', ['--selftest']],
    ['demigod-corpus-defects.mjs', ['--selftest']],
    // The activity list every DIE surface projects through — shape only, never a score.
    ['demigod-die-activity-shape.test.mjs'],
    // Public brief: founder compensation stays a required, reviewable wizard step
    ['demigod-startup-comp-step.test.mjs'],
    // Evidence freshness: null seal hash + source drift must fail closed (not vacuous green)
    ['demigod-evidence-fresh.test.mjs'],
    // Empty-scope seal trap: isFresh vacuous-green documented; producers must not seal scope:[]
    ['demigod-evidence-vacuous-scope.test.mjs'],
    // Fetch SSRF: IP-literal hosts + per-hop private redirects never egress (orphan → gate)
    ['demigod-perf-cache-permissions.test.mjs'],
    // Hiring Pulse — empty map must not fabricate; deltas only with history; render escapes injection
    ['demigod-hiring-pulse.mjs', ['--selftest']],
    // Crawlable static directory — real company/job content in served HTML; JSON-LD verified-only; escapes
    ['demigod-directory-static.mjs', ['--selftest']],
    // Source honesty: prove the detector fails red, then gate the crawler-visible production HTML.
    ['demigod-live-honesty-audit.mjs', ['--selftest']],
    ['demigod-live-honesty-audit.mjs'],
    // Declared routes: 404 = broken; 301→/?p= = stub (not silent "all resolve")
    ['demigod-route-audit.mjs', ['--selftest']],
    // ...and the audit itself, not only its selftest. Only the selftest was wired, so the real
    // check ran by hand or not at all -- and it was red: `/tryout` was declared in foot-core's
    // pretty-path map with no published page behind it.
    ['demigod-route-audit.mjs'],
    ['demigod-site-health.mjs', ['--selftest']],
    /* The audit itself is NOT wired, and the reason is recorded so nobody re-adds it by reflex.
       It was added on 2026-08-17 on the belief that it reports and exits 0 -- that belief came from
       reading `$?` after a pipe to `tail`, which returns tail's status, and the audit actually exits
       1. It fails on something true and unfixable from here: live /startups claims 501 companies
       while the sealed artifact says 471, which clears only on an authorized publish. A suite that
       stays red until someone else acts is a suite people stop reading, so the finding lives in the
       work queue and in `bin/dg`, and this line stays a comment until the publish lands. */
    // Abstention ledger — measures what research REFUSED to answer. Only not_applicable may leave
    // the coverage denominator; a not_found must never launder a coverage miss into a category error.
    ['demigod-abstention-ledger.test.mjs'],
    ['demigod-abstention-ledger.mjs', ['--selftest']],
    // Role first-seen ledger — failed-fetch-never-closes + firstSeen-monotonic + observed≠posted honesty
    ['demigod-ats-providers.mjs', ['--selftest']],
    ['demigod-role-ledger.mjs', ['--selftest']],
    // Independent adversarial suite on role-ledger invariants + corrupt-SoR row injection
    ['demigod-role-ledger-poison.test.mjs'],
    // Live smoke readiness polls through transient CDP evaluate timeouts
    ['demigod-agent-smoke.test.mjs'],
    // grok-ask transport poison (Broken-pipe retry + context) — not orphaned manual-only
    ['demigod-grok-ask-selftest.mjs'],
    // SoR/PII gate must fail-red when dm-send-log is force-tracked (not vacuous green)
    ['demigod-verify-no-committable-sor.mjs', ['--self-test']],
    /* Wired 2026-08-17. These 101 files were run by no gate: each locks a real behaviour and none
       of it was being defended. Measured before wiring rather than after -- 100 of 101 passed, the
       slowest took 1.9s, and the whole set costs 19s, so the argument for leaving them out was
       never runtime. The one failure (clay-website) was a real finding: it asserted the foot binds
       employerDepartment and boardUpdatedAt, and both had quietly stopped appearing.
       No per-line comments here on purpose. Each file's own docstring says what it locks, and a
       hundred invented one-liners would be a hundred claims nobody verified. */
    ['demigod-agency-policy-apostrophe.test.mjs'],
    ['demigod-agent-tools-lock.test.mjs'],
    ['demigod-ats-fields-export.test.mjs'],
    ['demigod-auto-propose-cli.test.mjs'],
    ['demigod-blog-quality.test.mjs'],
    ['demigod-board-reset-publish-policy.test.mjs'],
    ['demigod-bounty-auth.test.mjs'],
    ['demigod-brand-assets-cascade.test.mjs'],
    ['demigod-clay-website.test.mjs'],
    ['demigod-community-forms-integration.test.mjs'],
    ['demigod-comp-alignment.test.mjs'],
    ['demigod-comp-range.test.mjs'],
    ['demigod-company-identity.test.mjs'],
    ['demigod-company-packet.test.mjs'],
    ['demigod-company-table.test.mjs'],
    ['demigod-company-waterfall.test.mjs'],
    ['demigod-copy-research-2026-08-06.test.mjs'],
    ['demigod-dashboard-agent-runtime.test.mjs'],
    ['demigod-dashboard-http-policy.test.mjs'],
    ['demigod-dashboard-inbox-source.test.mjs'],
    ['demigod-dashboard-mutation-policy.test.mjs'],
    ['demigod-dashboard-private-writer.test.mjs'],
    ['demigod-demand-draft-freshness.test.mjs'],
    ['demigod-demand-selftest-isolation.test.mjs'],
    ['demigod-directory-brief-cta.test.mjs'],
    ['demigod-foot-boot-schedule.test.mjs'],
    ['demigod-foot-copy-rerun.test.mjs'],
    ['demigod-footer-cdn-manifest.test.mjs'],
    ['demigod-form-attribution.test.mjs'],
    ['demigod-form-e2e-policy.test.mjs'],
    ['demigod-form-submit-policy.test.mjs'],
    ['demigod-head-font-optional.test.mjs'],
    ['demigod-head-route-paint.test.mjs'],
    ['demigod-head-title-leak.test.mjs'],
    ['demigod-hero-brand-guard.test.mjs'],
    ['demigod-hero-wordmark-character.test.mjs'],
    ['demigod-inbox-role-readiness.test.mjs'],
    ['demigod-inbox-update.test.mjs'],
    ['demigod-intake-smoke-isolation.test.mjs'],
    ['demigod-laptop-hygiene.test.mjs'],
    ['demigod-match-explain.test.mjs'],
    ['demigod-match-score-drift.test.mjs'],
    ['demigod-matching-guards.test.mjs'],
    ['demigod-mobile-bar-on-routes.test.mjs'],
    ['demigod-native-upload-contract.test.mjs'],
    ['demigod-no-committable-sor-lib.test.mjs'],
    ['demigod-nontechnical-matching.test.mjs'],
    ['demigod-ops-reconcile.test.mjs'],
    ['demigod-orca-agent-liveness.test.mjs'],
    ['demigod-packet-writeback.test.mjs'],
    ['demigod-pilot-inbound-permissions.test.mjs'],
    ['demigod-pilot-logger-publish-policy.test.mjs'],
    ['demigod-pilot-os-permissions.test.mjs'],
    ['demigod-priority-board-writer.test.mjs'],
    ['demigod-priority-board.test.mjs'],
    ['demigod-private-archive-hygiene.test.mjs'],
    ['demigod-public-roles-startup-first.test.mjs'],
    ['demigod-publish-freeze-coverage.test.mjs'],
    ['demigod-publish-freeze.test.mjs'],
    ['demigod-receipt-publish-policy.test.mjs'],
    ['demigod-render-listings-resilience.test.mjs'],
    ['demigod-resume-file-validation.test.mjs'],
    ['demigod-resume-url-inline.test.mjs'],
    ['demigod-role-ledger-timer.test.mjs'],
    ['demigod-roles-pipeline.test.mjs'],
    ['demigod-sample-data.test.mjs'],
    ['demigod-ship-loop-safety.test.mjs'],
    ['demigod-ship-webhook-auth.test.mjs'],
    ['demigod-social-meta-dedupe.test.mjs'],
    ['demigod-sprint-selftest-isolation.test.mjs'],
    ['demigod-startup-atlas-dashboard.test.mjs'],
    ['demigod-startup-atlas.test.mjs'],
    ['demigod-startup-threshold-drift.test.mjs'],
    ['demigod-submission-approval-guard.test.mjs'],
    ['demigod-submission-archive-retention.test.mjs'],
    ['demigod-submissions-approval-idempotency.test.mjs'],
    ['demigod-submissions-e2e-isolation.test.mjs'],
    ['demigod-submissions-inbox-attribution.test.mjs'],
    ['demigod-submissions-inbox-transition.test.mjs'],
    ['demigod-submissions-ingest-publish-policy.test.mjs'],
    ['demigod-submissions-test-isolation.test.mjs'],
    ['demigod-submissions-triage-privacy.test.mjs'],
    ['demigod-submissions-webhook-hmac-integration.test.mjs'],
    ['demigod-submit-to-pilot.test.mjs'],
    ['demigod-targets-detail.test.mjs'],
    ['demigod-targets-merge.test.mjs'],
    ['demigod-tool-dogfood.test.mjs'],
    ['demigod-watch-submits-private.test.mjs'],
    ['demigod-webflow-token-privacy.test.mjs'],
    ['demigod-webflow-webhook-setup.test.mjs'],
    ['demigod-webhook-auth.test.mjs'],
    ['demigod-webhook-idempotency.test.mjs'],
    ['demigod-webhook-origin.test.mjs'],
    ['demigod-webhook-rate-limit.test.mjs'],
    ['demigod-wiz-draft-file-recovery.test.mjs'],
    ['demigod-wiz-escape-ownership.test.mjs'],
    ['demigod-wiz-focus-trap.test.mjs'],
    ['demigod-wiz-review-focus.test.mjs'],
    ['demigod-wiz-step-announcement.test.mjs'],
    ['demigod-wizard-close.test.mjs'],
    ['demigod-x-self-announcement.test.mjs'],
    /* Wired 2026-08-17. Forty-six modules carried a --selftest that no runner called; measured
       first, the whole set costs under five seconds. Two were failing while nobody looked:
       public-comp returned a published range AND a point band for the same money, and
       navigation-audit needs --local, which is why it had "never passed". foot-cdn-publish is in
       here deliberately — it guards the publish path and its selftest was outside the suite. */
    ['demigod-button-audit.mjs', ['--selftest']],
    ['demigod-call-note.mjs', ['--selftest']],
    ['demigod-candidate-touch.mjs', ['--selftest']],
    ['demigod-cdp-mobile-a11y-sweep.mjs', ['--selftest']],
    ['demigod-cm6-paste-publish.mjs', ['--selftest']],
    ['demigod-company-intelligence.mjs', ['--selftest']],
    ['demigod-company-peers.mjs', ['--selftest']],
    ['demigod-control-board.mjs', ['--selftest']],
    ['demigod-directory-aging.mjs', ['--selftest']],
    ['demigod-enrichment.mjs', ['--selftest']],
    ['demigod-faq-schema.mjs', ['--selftest']],
    ['demigod-foot-cdn-publish.mjs', ['--selftest']],
    ['demigod-github-agent.mjs', ['--selftest']],
    ['demigod-hiring-freshness.mjs', ['--selftest']],
    ['demigod-hiring-ticket.mjs', ['--selftest']],
    ['demigod-hn-map-admit.mjs', ['--selftest']],
    ['demigod-intro-path.mjs', ['--selftest']],
    ['demigod-lighthouse.mjs', ['--selftest']],
    ['demigod-meta-audit.mjs', ['--selftest']],
    ['demigod-navigation-audit.mjs', ['--selftest', '--local']],
    ['demigod-public-comp.mjs', ['--selftest']],
    // The page copy every route already carries, checked against the real foot: AI crawlers do not
    // run JavaScript, so copy that only exists in DG_PAGES reaches none of them.
    ['demigod-route-static.mjs', ['--selftest']],
    // What an AI crawler receives, per route. The live audit is not wired on purpose — it is red
    // until a publish moves the staged fragments, and a gate nobody can clear is a gate nobody
    // reads. The measuring logic can still be wrong in ways no publish would fix, so it is tested.
    ['demigod-crawlable-audit.mjs', ['--selftest']],
    // The methodology page reads its figures from live artifacts at render time, so its selftest is
    // the thing standing between a published claim and a number that quietly drifted from the data.
    ['demigod-method-page.mjs', ['--selftest']],
    // The Origin mirror's URL builder and its refusals — a repo name reaching a git remote
    // unvalidated is how a mirror script writes somewhere nobody meant.
    ['demigod-origin-mirror.mjs', ['--selftest']],
    ['demigod-role-ledger-archive.mjs', ['--selftest']],
    ['demigod-supply-chain-check.mjs', ['--selftest']],
    ['demigod-site-schema.mjs', ['--selftest']],
    ['demigod-domain-drift.mjs', ['--selftest']],
    ['demigod-contact-discover.mjs', ['--selftest']],
    ['demigod-board-retention.test.mjs'],
    // The one Demigod test living outside the repo root, and therefore outside every glob anyone
    // has written to find these.
    ['docs/exchange/demigod-recruiting-research-pack.test.mjs'],
    ['demigod-outcome-grammar.mjs', ['--selftest']],
    ['demigod-page-review.mjs', ['--selftest']],
    ['demigod-phase2.mjs', ['--selftest']],
    ['demigod-pilot-batch.mjs', ['--selftest']],
    ['demigod-pilot-inbound.mjs', ['--selftest']],
    ['demigod-posting-age-index.mjs', ['--selftest']],
    ['demigod-pricing-fragment.mjs', ['--selftest']],
    ['demigod-public-roles.mjs', ['--selftest']],
    ['demigod-pulse-page.mjs', ['--selftest']],
    ['demigod-recruitai-desk.mjs', ['--selftest']],
    ['demigod-recruitai-import.mjs', ['--selftest']],
    ['demigod-recruitai-seed-pack.mjs', ['--selftest']],
    ['demigod-reseal-queue.mjs', ['--selftest']],
    ['demigod-roles-ats-apply.mjs', ['--selftest']],
    ['demigod-roles-ats-links.mjs', ['--selftest']],
    ['demigod-roles-feed.mjs', ['--selftest']],
    ['demigod-roles-pipeline.mjs', ['--selftest']],
    ['demigod-route-health.mjs', ['--selftest']],
    ['demigod-seo-audit.mjs', ['--selftest']],
    ['demigod-site-counters.mjs', ['--selftest']],
    ['demigod-startups-static-paste.mjs', ['--selftest']],
    ['demigod-tools-registry.mjs', ['--selftest']],
    ['demigod-truth.mjs', ['--selftest']],
    ['demigod-work-find.mjs', ['--selftest']],
    ['demigod-x-hiring.mjs', ['--selftest']],
    ['demigod-verify-source.mjs'],

    ['demigod-verify-live.mjs'],
    ['demigod-verify-receipt.mjs'],
    ['demigod-verify-signal-theater.mjs'],
    ['demigod-foot-smoke.mjs'],
  ];
  if (browser) steps.push(['demigod-playtest-review.mjs']);

  /* A suite that runs nothing reports `failed: 0`, which reads exactly like a clean run. verify-source
     already refuses to pass on an empty check list; this is the same guard for the same reason. The
     floor is a volume floor, not a target: a bad merge or a truncated array drops entries silently,
     and 95 steps becoming 12 is the failure mode worth catching. Raise it deliberately when steps
     are added; never lower it to make a run green. */
  const MIN_STEPS = 249;

  let failed = 0;
  let ran = 0;
  for (const [script, args = []] of steps) {
    const code = await run(script, args);
    ran++;
    if (code !== 0) failed++;
  }

  const tooFew = ran < MIN_STEPS;
  if (tooFew) console.error(`verify-all ran ${ran} steps, below the ${MIN_STEPS} floor — the suite was truncated, not clean`);
  const pass = failed === 0 && !tooFew;
  console.log(JSON.stringify({ pass, failed, ran, floor: MIN_STEPS, browser }));
  process.exit(pass ? 0 : 1);
}
