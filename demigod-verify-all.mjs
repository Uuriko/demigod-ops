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
    ['demigod-company-research-benchmark.mjs', ['--selftest']],
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
    ['demigod-site-health.mjs', ['--selftest']],
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
    ['demigod-verify-source.mjs'],

    ['demigod-verify-live.mjs'],
    ['demigod-verify-receipt.mjs'],
    ['demigod-verify-signal-theater.mjs'],
    ['demigod-foot-smoke.mjs'],
  ];
  if (browser) steps.push(['demigod-playtest-review.mjs']);

  let failed = 0;
  for (const [script, args = []] of steps) {
    const code = await run(script, args);
    if (code !== 0) failed++;
  }

  console.log(JSON.stringify({ pass: failed === 0, failed, browser }));
  process.exit(failed ? 1 : 0);
}
