#!/usr/bin/env node
/**
 * demigod-full-check — one spine (Atlas: DEMIGOD-FULL-HISTORY-AND-TOOL-ATLAS.md): doctor → orca → gates → smoke → control plane
 * Freeze-safe (no ship/mutate).
 *
 *   node demigod-full-check.mjs [--json] [--skip-smoke]
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const OUT = path.join(BUSY, 'full-check.json');

function run(label, cmd, timeout = 120000) {
  const t0 = Date.now();
  const r = spawnSync('bash', ['-lc', cmd], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    env: process.env,
  });
  const ms = Date.now() - t0;
  const ok = r.status === 0;
  return {
    label,
    cmd,
    ok,
    status: r.status,
    ms,
    stdout: (r.stdout || '').slice(-1200),
    stderr: (r.stderr || '').slice(-800),
  };
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const skipSmoke = args.includes('--skip-smoke');
  fs.mkdirSync(BUSY, { recursive: true });

  const steps = [];
  steps.push(run('doctor', 'node demigod-doctor.mjs --json', 30000));
  steps.push(run('orca-doctor', 'node demigod-orca-bridge.mjs doctor', 15000));
  steps.push(run('verify-source', 'npm run demigod:verify:source', 60000));
  steps.push(run('board-honesty', 'node demigod-verify-board-honesty.mjs', 20000));
  steps.push(run('loop-state', 'node demigod-verify-loop-state.mjs', 10000));
  steps.push(run('foot-smoke', 'node demigod-foot-smoke.mjs', 15000));
  steps.push(run('review', 'node demigod-review.mjs 2>/dev/null | tail -5', 90000));
  if (!skipSmoke) {
    steps.push(run('agent-smoke', 'node demigod-agent-smoke.mjs', 120000));
  }
  steps.push(run('control-plane', 'node demigod-control.mjs status --json', 30000));

  const failed = steps.filter((s) => !s.ok).map((s) => s.label);
  const report = {
    at: new Date().toISOString(),
    pass: failed.length === 0,
    failed,
    steps: steps.map(({ label, cmd, ok, status, ms }) => ({ label, cmd, ok, status, ms })),
    details: steps,
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

  if (asJson) {
    console.log(JSON.stringify({ ...report, details: undefined }, null, 2));
  } else {
    console.log(`# full-check ${report.pass ? 'PASS' : 'FAIL'} · ${report.at}`);
    for (const s of steps) {
      console.log(`${s.ok ? '✓' : '✗'} ${s.label} (${s.ms}ms)`);
      if (!s.ok && s.stderr) console.log(s.stderr.slice(0, 400));
      if (!s.ok && s.stdout) console.log(s.stdout.slice(0, 400));
    }
    console.log(`\nreport: ${OUT}`);
  }
  process.exit(report.pass ? 0 : 1);
}

main();
