#!/usr/bin/env node
/**
 * demigod-doctor — local environment health for agents
 * node demigod-doctor.mjs [--json]
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function doctorPath() {
  return path.join(dataRoot(), 'DEMIGOD-DOCTOR.json');
}

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

function check(name, ok, detail = '') {
  return { name, ok: Boolean(ok), detail: String(detail).slice(0, 200) };
}

async function main() {
  if (process.argv.includes('--publish')) fail('publish_refused');
  const ROOT = dataRoot();
  const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
  const DASH = process.env.DEMIGOD_DASH || 'http://127.0.0.1:9878';
  const checks = [];
  checks.push(check('node', true, process.version));
  checks.push(check('cwd', fs.existsSync(path.join(ROOT, 'demigod-foot-core.js')), ROOT));
  checks.push(check('data root', fs.existsSync(ROOT), ROOT));
  // keys present not values
  const openaiFile = path.join(process.env.HOME || '', '.config/demigod/openai.env');
  checks.push(
    check(
      'openai.env file',
      fs.existsSync(openaiFile) && /OPENAI_API_KEY=\S+/.test(fs.readFileSync(openaiFile, 'utf8')),
      openaiFile,
    ),
  );
  // optional — missing is a note, not a fail for freeze/ops work
  checks.push(
    check(
      'OPENAI_API_KEY env',
      true,
      process.env.OPENAI_API_KEY ? 'set' : 'missing (optional for ops tools)',
    ),
  );

  // CDP
  try {
    const r = await fetch(`${CDP}/json/version`, { signal: AbortSignal.timeout(2000) });
    checks.push(check('CDP :9223', r.ok, await r.text().then((t) => t.slice(0, 80))));
  } catch (e) {
    checks.push(check('CDP :9223', false, e.message));
  }

  // Dash
  try {
    const r = await fetch(`${DASH}/api/health`, { signal: AbortSignal.timeout(2000) });
    checks.push(check('dashboard :9878', r.ok, await r.text()));
  } catch (e) {
    checks.push(check('dashboard :9878', false, e.message));
  }

  // CLIs
  for (const bin of [
    'bin/dg-usertest',
    'bin/dg-cockpit',
    'bin/dg-smoke',
    'bin/dg-dash',
    'bin/dg-matches',
    'bin/dg-inbox',
    'bin/dg-review',
    'bin/dg-webflow',
    'bin/dg-orca',
  ]) {
    checks.push(check(bin, fs.existsSync(path.join(ROOT, bin)), ''));
  }
  checks.push(check('review tool', fs.existsSync(path.join(ROOT, 'demigod-review.mjs')), ''));
  checks.push(check('webflow workbench', fs.existsSync(path.join(ROOT, 'demigod-webflow.mjs')), ''));
  checks.push(check('orca bridge', fs.existsSync(path.join(ROOT, 'demigod-orca-bridge.mjs')), ''));
  checks.push(check('full-check', fs.existsSync(path.join(ROOT, 'demigod-full-check.mjs')), ''));

  // Keep-awake + Orca runtime (phone remote seat)
  try {
    const pidPath = path.join(ROOT, '.keep-awake.pid');
    if (fs.existsSync(pidPath)) {
      const pid = Number(fs.readFileSync(pidPath, 'utf8').trim());
      try {
        process.kill(pid, 0);
        checks.push(check('keep-awake', true, `pid ${pid}`));
      } catch {
        checks.push(check('keep-awake', false, 'pid dead — bin/dg-orca up'));
      }
    } else {
      checks.push(check('keep-awake', false, 'no pidfile — bin/dg-orca up'));
    }
  } catch (e) {
    checks.push(check('keep-awake', false, e.message));
  }
  try {
    const st = spawnSync('orca-ide', ['status', '--json'], { encoding: 'utf8', timeout: 6000 });
    if (st.status === 0 && st.stdout) {
      const d = JSON.parse(st.stdout);
      const ok = Boolean(d?.result?.runtime?.reachable);
      checks.push(check('orca-ide', ok, d?.result?.runtime?.state || 'unknown'));
    } else {
      checks.push(check('orca-ide', false, (st.stderr || st.stdout || 'not reachable').slice(0, 120)));
    }
  } catch (e) {
    checks.push(check('orca-ide', false, e.message));
  }

  // Matching / board ops files
  checks.push(check('pairs lib', fs.existsSync(path.join(ROOT, 'demigod-pairs-lib.mjs')), ''));
  checks.push(check('match-review', fs.existsSync(path.join(ROOT, 'demigod-match-review.mjs')), ''));
  checks.push(
    check(
      'board audit log',
      fs.existsSync(path.join(ROOT, 'DEMIGOD-BOARD-AUDIT.jsonl')),
      path.join(ROOT, 'DEMIGOD-BOARD-AUDIT.jsonl'),
    ),
  );
  try {
    const pairs = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-PAIRS.json'), 'utf8'));
    const n = Object.keys(pairs.pairs || {}).length;
    checks.push(check('pair ledger', true, `${n} pairs`));
  } catch {
    checks.push(check('pair ledger', true, 'missing (empty ok — seed via bin/dg-matches seed)'));
  }
  // Match API if dash up
  try {
    const r = await fetch(`${DASH}/api/matches`, { signal: AbortSignal.timeout(3000) });
    const t = await r.text();
    let total = '?';
    try {
      total = JSON.parse(t)?.summary?.total;
    } catch {
      /* */
    }
    checks.push(check('/api/matches', r.ok, `total=${total}`));
  } catch (e) {
    checks.push(check('/api/matches', false, e.message));
  }
  checks.push(
    check(
      'real-roles env',
      true,
      process.env.DEMIGOD_ALLOW_REAL_ROLES === '1' ? 'ALLOW_REAL_ROLES=1' : 'off (sample-only)',
    ),
  );

  const freeze = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-PUBLISH-FREEZE.json'), 'utf8'));
    } catch {
      return { on: false };
    }
  })();
  checks.push(check('freeze readable', true, freeze.on ? `ON ${freeze.why || ''}` : 'OFF'));

  const pass = checks.every((c) => c.ok);
  const out = {
    at: new Date().toISOString(),
    path: doctorPath(),
    pass,
    checks,
    sent: false,
    liveMail: false,
    livePublish: false,
  };
  fs.mkdirSync(ROOT, { recursive: true });
  fs.writeFileSync(doctorPath(), JSON.stringify(out, null, 2) + '\n');
  if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 2));
  else {
    console.log(`demigod-doctor ${pass ? 'PASS' : 'ISSUES'}`);
    for (const c of checks) console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ' — ' + c.detail : ''}`);
    console.log(`wrote ${doctorPath()}`);
  }
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
