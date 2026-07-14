#!/usr/bin/env node
/**
 * demigod-review-selftest — fixture-based proof the review engine works (v2.1)
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { ensureBusy, BUSY } from './demigod-agent-tools-lib.mjs';
import { computeSafeFixes } from './demigod-review-fix.mjs';
import { runGates, suggestGates } from './demigod-review-gates.mjs';
import { scoreSummary, limitFindings, matchExclude } from './demigod-review-lib.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(BUSY, 'review-fixtures');
const fails = [];
function ok(c, m) {
  if (!c) fails.push(m);
  else console.log('ok', m);
}

ensureBusy();
fs.mkdirSync(FIX, { recursive: true });

// Fixture: duplicate const + eval + bare saveBoard
const badPath = path.join(FIX, 'fixture-bad.mjs');
const bad = [
  "import fs from 'fs';",
  'const gate = 1;',
  'const x = 1;',
  'const gate = 2;',
  "eval('oops');",
  'saveBoard(board);',
  '',
].join('\n');
fs.writeFileSync(badPath, bad);

const goodPath = path.join(FIX, 'fixture-good.mjs');
fs.writeFileSync(
  goodPath,
  `import fs from 'fs';
export function hello() {
  return fs.existsSync('/tmp') ? 'ok' : 'no';
}
`,
);

// Fixture: trailing whitespace for tier-A fix
const wsPath = path.join(FIX, 'fixture-ws.mjs');
fs.writeFileSync(wsPath, "export const a = 1;   \nexport const b = 2;\n\n\n\n");

// Fixture: gate false-pass pattern
const gateBadPath = path.join(FIX, 'fixture-gate-or.mjs');
fs.writeFileSync(
  gateBadPath,
  `export function ok(r) {
  return r.status === 0 || /OK|PASS/i.test(r.out);
}
`,
);

const relBad = path.relative(ROOT, badPath);
const relGood = path.relative(ROOT, goodPath);
const relWs = path.relative(ROOT, wsPath);
const relGate = path.relative(ROOT, gateBadPath);

function runReview(extraArgs) {
  const r = spawnSync(
    'node',
    [path.join(ROOT, 'demigod-review.mjs'), '--json', '--no-git', '--full', ...extraArgs],
    { cwd: ROOT, encoding: 'utf8', timeout: 60000 },
  );
  let report = null;
  try {
    report = JSON.parse(r.stdout);
  } catch {
    const start = r.stdout.indexOf('{');
    if (start >= 0) {
      try {
        report = JSON.parse(r.stdout.slice(start));
      } catch {
        /* */
      }
    }
  }
  return { r, report };
}

const { r, report } = runReview(['--files', relBad, relGood]);
ok(report && report.findings, 'report parsed');
ok(report?.version === '2.1.0' || report?.version === 2, 'version present');
const findings = report?.findings || [];
const rules = new Set(findings.filter((f) => !f.suppressed).map((f) => f.rule));

ok(rules.has('duplicate-const') || rules.has('syntax'), 'detects duplicate const or syntax');
ok(rules.has('eval-use'), 'detects eval');
ok(
  findings.some((f) => f.file?.includes('fixture-bad') && (f.sev === 'critical' || f.sev === 'high')),
  'bad fixture has high/critical',
);
ok(
  !findings.some(
    (f) =>
      f.file?.includes('fixture-good') &&
      (f.sev === 'critical' || f.sev === 'high') &&
      f.rule !== 'broken-relative-import',
  ),
  'good fixture clean of critical/high (except maybe imports)',
);

// only-rule
const only = runReview(['--files', relBad, '--only-rule', 'eval-use']);
const onlyRules = new Set((only.report?.findings || []).filter((f) => !f.suppressed).map((f) => f.rule));
ok(onlyRules.has('eval-use') || onlyRules.has('syntax'), 'only-rule filters to eval (or syntax always)');
ok(
  ![...onlyRules].some((x) => x === 'duplicate-const'),
  'only-rule excludes duplicate-const',
);

// exclude-rule
const excl = runReview(['--files', relBad, '--exclude-rule', 'eval-use']);
ok(
  !(excl.report?.findings || []).some((f) => !f.suppressed && f.rule === 'eval-use'),
  'exclude-rule drops eval-use',
);

// fail-on never → exit 0 even with findings
const never = runReview(['--files', relBad, '--fail-on', 'never']);
ok(never.r.status === 0, 'fail-on never exits 0');
ok(never.report?.summary?.fail === false, 'fail-on never summary.fail false');

// max findings
const maxed = runReview(['--files', relBad, '--max', '1']);
const activeMax = (maxed.report?.findings || []).filter((f) => !f.suppressed);
ok(activeMax.length <= 1, 'max 1 active finding');

// gate-status-or-pass rule
const gOr = runReview(['--files', relGate, '--only-rule', 'gate-status-or-pass']);
ok(
  (gOr.report?.findings || []).some((f) => f.rule === 'gate-status-or-pass'),
  'detects gate status||PASS anti-pattern',
);

// computeSafeFixes unit
const wsSrc = fs.readFileSync(wsPath, 'utf8');
const { fixes, changed } = computeSafeFixes(relWs, wsSrc);
ok(changed && fixes.includes('strip-trailing-whitespace'), 'fix strips trailing ws');
ok(fixes.includes('collapse-extra-blank-lines') || fixes.includes('trailing-newline'), 'fix collapses blanks or newline');

// apply fix dry-run via CLI
const fixDry = runReview(['--files', relWs, '--fix', '--dry-run', '--fail-on', 'never']);
ok(
  (fixDry.report?.autoApplied || []).some((a) => a.dryRun && a.fixes?.length),
  'fix dry-run reports autofix',
);

// gates suggest for review files
const sug = suggestGates(['demigod-review.mjs']);
ok(sug.some((g) => g.id === 'review-selftest'), 'suggests review-selftest for review files');

// scoreSummary helpers
const sm = scoreSummary(
  [
    { sev: 'high', suppressed: false },
    { sev: 'low', suppressed: false },
  ],
  { failOn: 'critical' },
);
ok(sm.fail === false, 'failOn critical ignores high');
const sm2 = scoreSummary([{ sev: 'high', suppressed: false }], { failOn: 'high' });
ok(sm2.fail === true, 'failOn high trips on high');

ok(matchExclude('docs/foo.md', ['*.md']), 'matchExclude *.md');
ok(!matchExclude('demigod-x.mjs', ['*.md']), 'matchExclude no false positive');

// catalog
const cat = spawnSync('node', [path.join(ROOT, 'demigod-review.mjs'), '--catalog'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 10000,
});
ok(cat.status === 0 && /board-chokepoint|syntax|game-hard-stop|gate-status-or-pass/.test(cat.stdout), 'catalog lists rules');

// syntax of modules
for (const f of [
  'demigod-review.mjs',
  'demigod-review-lib.mjs',
  'demigod-review-rules.mjs',
  'demigod-review-fix.mjs',
  'demigod-review-gates.mjs',
]) {
  ok(spawnSync('node', ['--check', path.join(ROOT, f)]).status === 0, `${f} syntax`);
}

// version
const ver = spawnSync('node', [path.join(ROOT, 'demigod-review.mjs'), '--version'], {
  encoding: 'utf8',
});
ok(/2\.1/.test(ver.stdout), 'version 2.1');

if (fails.length) {
  console.error('FAIL', fails);
  console.error('sample findings', findings.slice(0, 8));
  process.exit(1);
}
console.log('ALL PASS', {
  findings: findings.length,
  rules: [...rules],
  version: report?.version,
});
