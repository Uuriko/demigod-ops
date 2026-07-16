#!/usr/bin/env node
/**
 * demigod-audit-100 — multi-layer audit harness (honest about residual risk)
 *
 *   bin/dg audit-100 [--json] [--quick]
 *
 * Layers:
 *   L1 source syntax + verify:source + foot-smoke + wiz-ownership
 *   L2 tools-os selftest + registry unique ids
 *   L3 live-attest (disk CDN body SHA)
 *   L4 truth + freeze + lock status
 *   L5 board honesty + loop-state
 *   L6 dash health (/api/orient if up)
 *   L7 git dirty / version drift signals
 *
 * Exit 0 = all hard layers pass · 1 = hard fail · 2 = soft warnings only
 *
 * NOTE: "100%" here means 100% of *instrumented* layers, not metaphysical certainty.
 * Residual: Webflow Designer DOM not deleted, human visual QA, CM6 false-green edge cases.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const OUT = path.join(BUSY, 'audit-100-latest.json');
const asJson = process.argv.includes('--json');
const quick = process.argv.includes('--quick');

function run(label, argv, { timeout = 120000, soft = false } = {}) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, argv, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    env: process.env,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const ok = r.status === 0;
  return {
    label,
    ok,
    soft,
    status: r.status,
    ms: Date.now() - t0,
    tail: out.trim().split('\n').slice(-8).join('\n'),
  };
}

const layers = [];

// L1
layers.push(run('L1-syntax-foot', ['--check', 'demigod-foot-core.js'], { timeout: 15000 }));
layers.push(run('L1-verify-source', ['demigod-verify-source.mjs'], { timeout: 60000 }));
layers.push(run('L1-foot-smoke', ['demigod-foot-smoke.mjs'], { timeout: 30000 }));
layers.push(run('L1-wiz-ownership', ['demigod-wiz-ownership-selftest.mjs'], { timeout: 30000 }));

// L2
if (!quick) layers.push(run('L2-tools-os-selftest', ['demigod-tools-os-selftest.mjs'], { timeout: 180000 }));
layers.push(
  run(
    'L2-registry-unique',
    ['-e', "import('./demigod-tools-registry.mjs').then(m=>{const t=m.TOOLS||m.tools||m.default||[]; const ids=(Array.isArray(t)?t:t.tools||[]).map(x=>x.id); if(!ids.length){console.log('no tools export'); process.exit(0)}; const s=new Set(ids); if(s.size!==ids.length){console.error('dups'); process.exit(1)}; console.log('unique', ids.length)})"],
    { soft: true },
  ),
);

// L3
layers.push(run('L3-live-attest', ['demigod-live-attest.mjs'], { timeout: 90000 }));

// L4
layers.push(run('L4-truth', ['demigod-truth.mjs'], { timeout: 120000, soft: true }));
layers.push(run('L4-freeze-status', ['demigod-publish-freeze.mjs', 'status'], { timeout: 10000, soft: true }));
layers.push(run('L4-lock-status', ['demigod-foot-lock.mjs', 'status'], { timeout: 10000, soft: true }));

// L5
layers.push(run('L5-board-honesty', ['demigod-verify-board-honesty.mjs'], { timeout: 30000 }));
if (!quick) layers.push(run('L5-loop-state', ['demigod-verify-loop-state.mjs'], { timeout: 30000, soft: true }));

// L6 dash — argv curl only (no bash pipe / -lc)
{
  const t0 = Date.now();
  const r = spawnSync(
    'curl',
    ['-sS', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '5', 'http://127.0.0.1:9878/'],
    { encoding: 'utf8', timeout: 8000 },
  );
  const code = String(r.stdout || '').trim();
  const ok = r.status === 0 && code === '200';
  layers.push({
    label: 'L6-dash-up',
    ok,
    soft: true,
    status: ok ? 0 : 1,
    ms: Date.now() - t0,
    tail: code || (r.stderr || '').trim().slice(-80),
  });
}
{
  const t0 = Date.now();
  const r = spawnSync('curl', ['-sS', '--max-time', '30', 'http://127.0.0.1:9878/api/orient?refresh=0'], {
    encoding: 'utf8',
    timeout: 35000,
  });
  let ok = false;
  let tail = '';
  try {
    const j = JSON.parse(r.stdout || '{}');
    ok = !!(j.schema || j.next);
    tail = `${j.schema || 'orient'} ${j.next?.id || j.next || ''}`.trim();
  } catch (e) {
    tail = String(e?.message || e).slice(0, 120);
  }
  layers.push({
    label: 'L6-api-orient',
    ok: r.status === 0 && ok,
    soft: true,
    status: r.status === 0 && ok ? 0 : 1,
    ms: Date.now() - t0,
    tail,
  });
}

// L7 git signals — cwd=ROOT (was broken: $DEMIGOD_ROOT often unset in bash -c)
{
  const t0 = Date.now();
  const r = spawnSync(
    'git',
    ['status', '--porcelain', '--', 'demigod-foot-core.js', 'demigod-footer-lite.html', 'demigod-head-minimal.html'],
    { cwd: ROOT, encoding: 'utf8', timeout: 15000 },
  );
  const dirty = (r.stdout || '').trim().length > 0;
  const ok = r.status === 0 && !dirty;
  layers.push({
    label: 'L7-git-dirty-site',
    ok,
    soft: true,
    status: ok ? 0 : 1,
    ms: Date.now() - t0,
    tail: dirty ? (r.stdout || '').trim().split('\n').slice(0, 5).join('\n') : r.status === 0 ? 'clean' : (r.stderr || '').trim().slice(-80),
  });
}

const hard = layers.filter((l) => !l.soft);
const soft = layers.filter((l) => l.soft);
const hardFail = hard.filter((l) => !l.ok);
const softFail = soft.filter((l) => !l.ok);
const report = {
  schema: 'demigod.audit-100/1',
  at: new Date().toISOString(),
  disclaimer:
    'Passes instrumented layers only. Residual: Designer DOM, human visual/a11y, CM6 false-green edge, third-party CDN hosts, uncommitted non-site files.',
  summary: {
    hard: hard.length,
    hardPass: hard.length - hardFail.length,
    hardFail: hardFail.map((l) => l.label),
    soft: soft.length,
    softFail: softFail.map((l) => l.label),
  },
  layers,
  residualChecklist: [
    'CDP visual: home CTAs + mobile 390 + pages how/pricing/status',
    'Webflow Custom Code API body equals demigod-footer-lite.html (manual or cm6 verify)',
    'No uncommitted foot-core when freeze ON (or intentional disk-ahead)',
    'Board seeds ≤3 and labeled sample',
    'Auto-DM still refused without DEMIGOD_ALLOW_AUTO_DM',
    'Catbox host health if not on gist fallback',
  ],
};

fs.mkdirSync(BUSY, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`# audit-100 hard ${report.summary.hardPass}/${report.summary.hard} soft-fail ${report.summary.softFail.length}`);
  for (const l of layers) {
    const mark = l.ok ? '✓' : l.soft ? '~' : '✗';
    console.log(`${mark} ${l.label} (${l.ms}ms)`);
    if (!l.ok && l.tail) console.log(l.tail.split('\n').map((x) => `    ${x}`).join('\n'));
  }
  console.log('\nResidual (not automated):');
  for (const r of report.residualChecklist) console.log(`  - ${r}`);
  console.log(`\nJSON: ${OUT}`);
}

if (hardFail.length) process.exit(1);
if (softFail.length) process.exit(2);
process.exit(0);
