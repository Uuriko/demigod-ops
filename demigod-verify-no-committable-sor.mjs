#!/usr/bin/env node
/**
 * demigod-verify-no-committable-sor — fail if any honesty-critical SoR / PII file is committable.
 *
 *   node demigod-verify-no-committable-sor.mjs        # exit 1 if any SoR/PII would be `git add -A`'d
 *
 * Systematic prevention for the recurring gitignore-PII gap: the inbox/board/leads/pilots/events SoRs +
 * outreach drafts hold candidate/founder PII and must stay out of git. They were missed in waves
 * (inbox→board→leads→funnel-drafts) because a per-file `git check-ignore` only tests files you thought
 * to list. This runs the ACTUAL risky op (`git add -A --dry-run`) and flags any SoR/PII that would stage,
 * so a NEW un-gitignored SoR is caught at commit-time, not by a late manual dogfood. (backlog #30)
 */
import { execFileSync } from 'child_process';

// PRECISE SoR/PII patterns (exact SoR files + PII dirs). Deliberately NOT broad substrings like `-INBOX`
// or `-data` — those false-red on safe metadata (DEMIGOD-INBOX-REPORT/TRIAGE = ids/counts, no PII).
const SOR = [
  /^DEMIGOD-(BOARD|PAIRS|LEADS|PILOTS)\.json/,
  /^DEMIGOD-SUBMISSIONS-INBOX\.json/,
  /^DEMIGOD-EVENTS(-API)?\.json/,
  /^demigod-events-data\.json/,
  /^demigod-board\.(json|corrupt)/i,
  /\.corrupt[.-]/i, // corrupt-preserve backups (real data at corrupt-time), any case
  /^demigod-outreach\/(funnel-drafts|ready-emails|founders)/,
];
// Safe metadata that name-matches but holds no PII (ids/counts) — never flag.
const SAFE = /-(REPORT|TRIAGE|AUDIT|DASHBOARD)\.json$/;

let staged = '';
try {
  // stderr ignored: git warns about embedded repos (.fzf/.pyenv/etc.) — noise, not SoR/PII.
  staged = execFileSync('git', ['add', '-A', '--dry-run'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) {
  console.error('warn: git add -A --dry-run failed (not a git repo?):', e.message);
  process.exit(0); // no repo → nothing to protect; don't block
}

const committable = staged
  .split('\n')
  .map((l) => (l.match(/^add '(.+)'$/) || [])[1])
  .filter(Boolean)
  .filter((f) => !SAFE.test(f) && SOR.some((re) => re.test(f)));

if (committable.length) {
  console.error('COMMITTABLE-SOR FAIL — these honesty-critical SoR/PII files would be `git add -A`d:');
  for (const f of committable.slice(0, 20)) console.error('  - ' + f);
  console.error('Fix: add them to .gitignore (they hold candidate/founder PII, must stay out of git).');
  process.exit(1);
}
console.log('no committable SoR/PII OK (git add -A stages no honesty-critical SoR)');

// self-check (assert-based): run `node demigod-verify-no-committable-sor.mjs --self-test`
if (process.argv.includes('--self-test')) {
  const test = (name, f, expectFlagged) => {
    const flagged = !SAFE.test(f) && SOR.some((re) => re.test(f));
    if (flagged !== expectFlagged) { console.error(`SELFTEST FAIL: ${name} (${f})`); process.exit(2); }
  };
  test('board SoR flagged', 'DEMIGOD-BOARD.json', true);
  test('leads SoR flagged', 'DEMIGOD-LEADS.json', true);
  test('corrupt backup flagged', 'demigod-board.corrupt-123.bak.json', true);
  test('funnel-draft flagged', 'demigod-outreach/funnel-drafts/x.txt', true);
  test('safe metadata NOT flagged', 'DEMIGOD-INBOX-TRIAGE.json', false);
  test('safe report NOT flagged', 'DEMIGOD-BOARD-REPORT.json', false);
  test('source NOT flagged', 'demigod-board-lib.mjs', false);
  console.log('SELFTEST PASS: SoRs flagged, metadata/source not (fail-capable, no false-red)');
}
