#!/usr/bin/env node
/**
 * Freeze-safe ship prep — builds pastes + checklist without mutating live CDN/Webflow
 * unless freeze is OFF.
 *
 *   node demigod-ship-prep.mjs [--json]
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const shipPrepArgs = process.argv.slice(2);
const SHIP_PREP_FLAGS = new Set(['--json', '--help', '-h']);
const unknownShipPrep = shipPrepArgs.find((a) => !SHIP_PREP_FLAGS.has(a));
if (unknownShipPrep) {
  console.error(`ship-prep: unknown argument ${unknownShipPrep} — try: node demigod-ship-prep.mjs [--json]`);
  process.exit(2);
}
if (shipPrepArgs.includes('--help') || shipPrepArgs.includes('-h')) {
  console.log(`demigod-ship-prep — freeze-safe paste prep (no CDN/Webflow mutate)

Usage: node demigod-ship-prep.mjs [--json]`);
  process.exit(0);
}
const asJson = process.argv.includes('--json');

function run(label, cmd, timeout = 60000) {
  const r = spawnSync('bash', ['-lc', cmd], { cwd: ROOT, encoding: 'utf8', timeout });
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
  footSrc = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
  footVer = (footSrc.match(/__dgFootVer='(\d+)'/) || [])[1];
} catch {
  /* ignore */
}

const pastes = {
  footerLite: path.join(ROOT, 'demigod-footer-lite.html'),
  headMinimal: path.join(ROOT, 'demigod-head-minimal.html'),
  footCore: path.join(ROOT, 'demigod-foot-core.js'),
  headCss: path.join(ROOT, 'demigod-head-styles.css'),
};

const report = {
  at: new Date().toISOString(),
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
        'node demigod-cm6-paste-publish.mjs  # canonical head + footer pair',
        'Human or demigod-webflow-publish-auto: Publish',
      ]
    : [
        'node demigod-foot-cdn-publish.mjs',
        'node demigod-head-css-publish.mjs',
        'paste + Publish custom code',
      ],
};

fs.mkdirSync(BUSY, { recursive: true });
fs.writeFileSync(path.join(BUSY, 'ship-prep.json'), JSON.stringify(report, null, 2) + '\n');

if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`# ship-prep · freeze=${freeze.frozen ? 'ON' : 'OFF'} · disk foot v${footVer}`);
  for (const s of steps) console.log(`${s.ok ? '✓' : '✗'} ${s.label}`);
  console.log('\nNext:');
  for (const n of report.next) console.log(`  ${n}`);
  console.log(`\nreport: ${path.join(BUSY, 'ship-prep.json')}`);
}
process.exit(steps.filter((s) => !s.ok && s.label !== 'ship-checklist').length ? 1 : 0);
