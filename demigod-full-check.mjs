#!/usr/bin/env node
/**
 * demigod-full-check — FULL-CHECK ORCHESTRATOR (freeze-safe, read-only)
 *
 * Atlas: docs/exchange/DEMIGOD-FULL-HISTORY-AND-TOOL-ATLAS.md
 * Order: local gates → live-doctor → route-mime → browser smoke → control plane
 *
 * Flags:
 *   --json           JSON only
 *   --skip-smoke     skip agent-smoke (browser)
 *   --skip-browser   alias of --skip-smoke
 *   --release        DEMIGOD_REQUIRE_LIVE_MATCH=1 (disk must equal live)
 *   --offline        skip network steps (live-doctor, route-mime, smoke)
 *
 *   node demigod-full-check.mjs [--json] [--skip-smoke] [--release] [--with-review]
 *   bin/dg full-check
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const OUT = path.join(BUSY, 'full-check.json');

function run(label, cmd, timeout = 120000, envExtra = {}) {
  const t0 = Date.now();
  const r = spawnSync('bash', ['-lc', cmd], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    env: { ...process.env, ...envExtra },
  });
  const ms = Date.now() - t0;
  const ok = r.status === 0;
  let childJson = null;
  // Prefer known artifact paths over parsing stdout
  const artifactMap = {
    'truth': path.join(BUSY, 'truth.json'),
    'live-doctor': path.join(BUSY, 'live-doctor.json'),
    'route-mime': path.join(BUSY, 'route-mime.json'),
    doctor: path.join(BUSY, 'doctor.json'),
    'agent-smoke': path.join(BUSY, 'agent-smoke.json'),
    'control-plane': path.join(BUSY, 'control-plane.json'),
  };
  const art = artifactMap[label];
  if (art && fs.existsSync(art)) {
    try {
      childJson = JSON.parse(fs.readFileSync(art, 'utf8'));
    } catch {
      childJson = null;
    }
  }
  return {
    label,
    cmd,
    ok,
    status: r.status,
    ms,
    stdout: (r.stdout || '').slice(-1200),
    stderr: (r.stderr || '').slice(-800),
    child: childJson
      ? {
          pass: childJson.pass,
          issues: childJson.issues || childJson.failed,
          driftExpected: childJson.driftExpected,
          liveVer: childJson.live?.footVer || childJson.summary?.foot,
          diskVer: childJson.disk?.foot?.ver,
        }
      : null,
  };
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const skipSmoke = args.includes('--skip-smoke') || args.includes('--skip-browser');
  const withReview = args.includes('--with-review') || args.includes('--review');
  const offline = args.includes('--offline');
  const release = args.includes('--release') || process.env.DEMIGOD_REQUIRE_LIVE_MATCH === '1';
  fs.mkdirSync(BUSY, { recursive: true });

  const liveEnv = release ? { DEMIGOD_REQUIRE_LIVE_MATCH: '1' } : {};
  const liveFlags = release ? '--json --require-match' : '--json';

  const steps = [];
  steps.push(run('doctor', 'node demigod-doctor.mjs --json', 30000));
  steps.push(run('orca-doctor', 'node demigod-orca-bridge.mjs doctor', 15000));
  steps.push(run('verify-source', 'npm run demigod:verify:source', 60000));
  steps.push(run('board-honesty', 'node demigod-verify-board-honesty.mjs', 20000));
  steps.push(run('loop-state', 'node demigod-verify-loop-state.mjs', 10000));
  steps.push(run('foot-smoke', 'node demigod-foot-smoke.mjs', 15000));
  if (withReview) {
    steps.push(run('code-review', 'node demigod-review.mjs --format summary --fail-on high', 120000));
  }
  steps.push(run('review', 'node demigod-review.mjs 2>/dev/null | tail -5', 90000));

  if (!offline) {
    // Artifact identity (intentional freeze drift: warning only unless --release)
    steps.push(run('truth', `node demigod-truth.mjs ${liveFlags}`, 90000, liveEnv));
    // User-facing product routes must be text/html
    steps.push(run('route-mime', 'node demigod-route-mime.mjs --json', 90000));
  }

  if (!skipSmoke && !offline) {
    steps.push(run('agent-smoke', 'node demigod-agent-smoke.mjs', 120000));
  }
  steps.push(run('control-plane', 'node demigod-control.mjs status --json', 30000));

  const failed = steps.filter((s) => !s.ok).map((s) => s.label);
  const liveChild = steps.find((s) => s.label === 'truth' || s.label === 'live-doctor')?.child;
  const report = {
    at: new Date().toISOString(),
    schemaVersion: 1,
    id: 'full-check',
    pass: failed.length === 0,
    release,
    offline,
    failed,
    driftExpected: Boolean(liveChild?.driftExpected),
    steps: steps.map(({ label, cmd, ok, status, ms, child }) => ({
      label,
      cmd,
      ok,
      status,
      ms,
      child,
    })),
    details: steps,
    artifacts: {
      fullCheck: OUT,
      liveDoctor: path.join(BUSY, 'live-doctor.json'),
      routeMime: path.join(BUSY, 'route-mime.json'),
    },
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

  if (asJson) {
    console.log(JSON.stringify({ ...report, details: undefined }, null, 2));
  } else {
    console.log(
      `# full-check ${report.pass ? 'PASS' : 'FAIL'} · ${report.at}` +
        (release ? ' · RELEASE' : '') +
        (report.driftExpected ? ' · driftExpected' : ''),
    );
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
