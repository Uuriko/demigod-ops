#!/usr/bin/env node
/**
 * demigod-review-selftest — fixture-based proof the review engine works
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { ensureBusy, BUSY } from './demigod-agent-tools-lib.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(BUSY, 'review-fixtures');
const fails = [];
function ok(c, m) {
  if (!c) fails.push(m);
  else console.log('ok', m);
}

ensureBusy();
fs.mkdirSync(FIX, { recursive: true });

// Fixture: duplicate const + mid import-like pattern + bare saveBoard + eval
const badPath = path.join(FIX, 'fixture-bad.mjs');
// Indent template body so duplicate-const (top-level only) doesn't fire on this source file
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

// Fixture: clean file
const goodPath = path.join(FIX, 'fixture-good.mjs');
fs.writeFileSync(
  goodPath,
  `import fs from 'fs';
export function hello() {
  return fs.existsSync('/tmp') ? 'ok' : 'no';
}
`,
);

const relBad = path.relative(ROOT, badPath);
const relGood = path.relative(ROOT, goodPath);

const r = spawnSync(
  'node',
  [path.join(ROOT, 'demigod-review.mjs'), '--json', '--no-git', '--full', '--files', relBad, relGood],
  { cwd: ROOT, encoding: 'utf8', timeout: 60000 },
);

let report = null;
try {
  report = JSON.parse(r.stdout);
} catch {
  // may print non-json on stderr path
  const start = r.stdout.indexOf('{');
  if (start >= 0) {
    try {
      report = JSON.parse(r.stdout.slice(start));
    } catch {
      /* */
    }
  }
}

ok(report && report.findings, 'report parsed');
const findings = report?.findings || [];
const rules = new Set(findings.filter((f) => !f.suppressed).map((f) => f.rule));

ok(rules.has('duplicate-const') || rules.has('syntax'), 'detects duplicate const or syntax');
ok(rules.has('eval-use'), 'detects eval');
ok(
  findings.some((f) => f.file?.includes('fixture-bad') && (f.sev === 'critical' || f.sev === 'high')),
  'bad fixture has high/critical',
);
ok(
  !findings.some((f) => f.file?.includes('fixture-good') && (f.sev === 'critical' || f.sev === 'high') && f.rule !== 'broken-relative-import'),
  'good fixture clean of critical/high (except maybe imports)',
);

// catalog
const cat = spawnSync('node', [path.join(ROOT, 'demigod-review.mjs'), '--catalog'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 10000,
});
ok(cat.status === 0 && /board-chokepoint|syntax|game-hard-stop/.test(cat.stdout), 'catalog lists rules');

// lib import
const lib = spawnSync('node', ['--check', path.join(ROOT, 'demigod-review-lib.mjs')], {
  encoding: 'utf8',
});
ok(lib.status === 0, 'review-lib syntax');
ok(spawnSync('node', ['--check', path.join(ROOT, 'demigod-review-rules.mjs')]).status === 0, 'rules syntax');
ok(spawnSync('node', ['--check', path.join(ROOT, 'demigod-review-fix.mjs')]).status === 0, 'fix syntax');
ok(spawnSync('node', ['--check', path.join(ROOT, 'demigod-review-gates.mjs')]).status === 0, 'gates syntax');

if (fails.length) {
  console.error('FAIL', fails);
  console.error('sample findings', findings.slice(0, 8));
  process.exit(1);
}
console.log('ALL PASS', { findings: findings.length, rules: [...rules] });
