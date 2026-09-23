#!/usr/bin/env node
/**
 * Freeze-safe ship prep — builds pastes + checklist without mutating live CDN/Webflow
 * unless freeze is OFF.
 *
 *   node demigod-ship-prep.mjs [--json]
 *   Writes DEMIGOD-SHIP-PREP.json in DEMIGOD_ROOT. Does not publish.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function dataRoot() {
  return process.env.DEMIGOD_ROOT || scriptDir();
}

function prepPath() {
  return path.join(dataRoot(), 'DEMIGOD-SHIP-PREP.json');
}

const asJson = process.argv.includes('--json');

function fail(error) {
  console.error(JSON.stringify({
    ok: false,
    error,
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
  process.exit(1);
}

if (process.argv.includes('--publish')) fail('publish_refused');

function run(label, cmd, timeout = 60000) {
  const r = spawnSync('bash', ['-lc', cmd], { cwd: dataRoot(), encoding: 'utf8', timeout });
  return {
    label,
    ok: r.status === 0,
    status: r.status,
    out: ((r.stdout || '') + (r.stderr || '')).slice(-600),
  };
}

const freeze = freezeStatus();
const steps = [];
steps.push(run('verify-source', 'npm run demigod:verify:source'));
steps.push(run('board-honesty', 'node demigod-verify-board-honesty.mjs'));
steps.push(run('loop-state', 'node demigod-verify-loop-state.mjs'));
steps.push(run('foot-smoke', 'node demigod-foot-smoke.mjs'));
steps.push(run('match-review', 'node demigod-match-review.mjs --json | head -c 400'));
steps.push(run('ship-checklist', 'node demigod-ship-checklist.mjs 2>/dev/null || true'));

// Read version markers
let footVer = null;
let footSrc = '';
try {
  footSrc = fs.readFileSync(path.join(dataRoot(), 'demigod-foot-core.js'), 'utf8');
  footVer = (footSrc.match(/__dgFootVer='(\d+)'/) || [])[1];
} catch {
  /* ignore */
}

const pastes = {
  footerLite: path.join(dataRoot(), 'demigod-footer-lite.html'),
  headMinimal: path.join(dataRoot(), 'demigod-head-minimal.html'),
  footCore: path.join(dataRoot(), 'demigod-foot-core.js'),
  headCss: path.join(dataRoot(), 'demigod-head-styles.css'),
};

const report = {
  at: new Date().toISOString(),
  path: prepPath(),
  freeze,
  diskFootVer: footVer,
  canShip: !freeze.frozen && steps.every((s) => s.ok || s.label === 'ship-checklist'),
  steps,
  pastes,
  next: freeze.frozen
    ? [
        'node demigod-publish-freeze.mjs off',
        'node demigod-foot-cdn-publish.mjs',
        'node demigod-head-css-publish.mjs',
        'node demigod-cm6-paste-publish.mjs --footer-only  # or full custom-code',
        'Human or demigod-webflow-publish-auto: Publish',
      ]
    : [
        'node demigod-foot-cdn-publish.mjs',
        'node demigod-head-css-publish.mjs',
        'paste + Publish custom code',
      ],
  sent: false,
  liveMail: false,
  livePublish: false,
};

fs.mkdirSync(dataRoot(), { recursive: true });
fs.writeFileSync(prepPath(), JSON.stringify(report, null, 2) + '\n');

if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`# ship-prep · freeze=${freeze.frozen ? 'ON' : 'OFF'} · disk foot v${footVer}`);
  for (const s of steps) console.log(`${s.ok ? '✓' : '✗'} ${s.label}`);
  console.log('\nNext:');
  for (const n of report.next) console.log(`  ${n}`);
  console.log(`\nreport: ${prepPath()}`);
}
process.exit(steps.filter((s) => !s.ok && s.label !== 'ship-checklist').length ? 1 : 0);
