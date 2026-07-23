#!/usr/bin/env node
/**
 * demigod-verify-no-committable-sor — fail if any honesty-critical SoR / PII file is committable.
 *
 *   node demigod-verify-no-committable-sor.mjs        # exit 1 if tracked SoR/PII or privacy rules are unsafe
 *
 * Systematic prevention for the recurring gitignore-PII gap: the inbox/board/leads/pilots/events SoRs +
 * outreach drafts hold candidate/founder PII and must stay out of git. They were missed in waves
 * (inbox→board→leads→funnel-drafts) because a per-file `git check-ignore` only tests files you thought
 * to list. Git's read-only index plus an explicit ignore-policy check catches tracked private data and
 * private roots reopened to staging without taking the index lock, including in restricted agents. (#30)
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { isSensitive, verifyNoCommittableSor } from './demigod-no-committable-sor-lib.mjs';

export function main(argv = process.argv.slice(2)) {
  if (argv.includes('--self-test')) {
    let selfTestOk = true;
    const test = (name, file, expectFlagged) => {
      if (isSensitive(file) !== expectFlagged) {
        console.error(`SELFTEST FAIL: ${name} (${file})`);
        selfTestOk = false;
      }
    };
    test('board SoR flagged', 'DEMIGOD-BOARD.json', true);
    test('leads SoR flagged', 'DEMIGOD-LEADS.json', true);
    test('corrupt backup flagged', 'demigod-board.corrupt-123.bak.json', true);
    test('lowercase board backup flagged', 'demigod-board.json.bak-123', true);
    test('event pre-snapshot flagged', 'DEMIGOD-EVENTS.pre-calpurge-123.json', true);
    test('signal manifest flagged', 'SIGNAL-THEATER.json', true);
    test('candidate CRM flagged', 'talent-crm/candidate.json', true);
    test('proof log flagged', 'DEMIGOD-PROOF-LOG.json', true);
    test('tracked lowercase board symlink NOT flagged', 'demigod-board.json', false);
    test('funnel-draft flagged', 'demigod-outreach/funnel-drafts/x.txt', true);
    test('funnel receipt flagged', 'demigod-outreach/funnel-receipts/x.txt', true);
    test('send log flagged', 'demigod-outreach/dm-send-log.txt', true);
    test('tracker flagged', 'demigod-outreach/DM-BATCH-TRACKER.md', true);
    test('send archive flagged', 'demigod-outreach/sends-2026-07-09/SEND-LOG.txt', true);
    test('generic template NOT flagged', 'demigod-outreach/template-dm.md', false);
    test('generic engineer template NOT flagged', 'demigod-outreach/template-dm-engineer.md', false);
    test('legacy matches flagged', 'DEMIGOD-MATCHES.json', true);
    test('outreach state flagged', 'DEMIGOD-OUTREACH.json', true);
    test('referrals SoR flagged', 'DEMIGOD-REFERRALS.json', true);
    test('referrals sidecar flagged', 'DEMIGOD-REFERRALS.json.archive.jsonl', true);
    test('intro packet flagged', 'demigod-ops/intros/pilot.md', true);
    test('invoice packet flagged', 'demigod-ops/invoices/inv.json', true);
    test('intro gitkeep NOT flagged', 'demigod-ops/intros/.gitkeep', false);
    test('inbox report with contact rows flagged', 'DEMIGOD-INBOX-REPORT.json', true);
    test('safe metadata NOT flagged', 'DEMIGOD-INBOX-TRIAGE.json', false);
    test('safe report NOT flagged', 'DEMIGOD-BOARD-REPORT.json', false);
    test('source NOT flagged', 'demigod-board-lib.mjs', false);
    if (!selfTestOk) return 2;
    console.log('SELFTEST PASS: SoRs flagged, metadata/source not (fail-capable, no false-red)');
    return 0;
  }

  const result = verifyNoCommittableSor('/home/potter');
  if (result.error) {
    console.error('COMMITTABLE-SOR UNKNOWN — git file inventory failed:', result.error);
    return 1;
  }
  if (!result.ok) {
    console.error('COMMITTABLE-SOR FAIL — these honesty-critical SoR/PII paths are tracked or unignored:');
    for (const file of result.trackedSensitive.slice(0, 20)) console.error('  - ' + file);
    for (const rule of result.missingIgnoreRules.slice(0, 20)) console.error('  - missing .gitignore rule: ' + rule);
    for (const rule of result.unsafeNegations.slice(0, 20)) console.error('  - unsafe .gitignore negation: ' + rule);
    console.error('Fix: add them to .gitignore (they hold candidate/founder PII, must stay out of git).');
    return 1;
  }
  console.log('no committable SoR/PII OK (Git tracks/exposes no honesty-critical SoR)');
  return 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exitCode = main();
