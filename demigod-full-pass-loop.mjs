#!/usr/bin/env node
/**
 * demigod-full-pass-loop — durable multi-track loop (dash/tools/webflow + frontend)
 *
 *   nohup node demigod-full-pass-loop.mjs >> /tmp/dg-busy/full-pass-loop.log 2>&1 &
 *   node demigod-full-pass-loop.mjs stop
 *
 * Tracks rotate: seal → favicon/blog/assets → dash review → webflow doctor → website cycle → dogfood
 * Does NOT start 5s swarm. Sleep between units default 60s.
 * Stop: /tmp/dg-busy/full-pass.STOP
 */
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const STOP = path.join(BUSY, 'full-pass.STOP');
const STATE = path.join(BUSY, 'full-pass-state.json');
const LOG = path.join(BUSY, 'full-pass-loop.log');
const PID = path.join(BUSY, 'full-pass.pid');

const UNITS = [
  { id: 'truth', cmd: ['node', 'demigod-tool-dogfood.mjs', 'wrap', '--tool=truth', '--', 'node', 'demigod-truth.mjs'], timeout: 120000 },
  { id: 'priority', cmd: ['node', 'demigod-tool-dogfood.mjs', 'wrap', '--tool=priority', '--', 'node', 'demigod-priority-board.mjs', '--json'], timeout: 30000 },
  { id: 'webflow-doctor', cmd: ['node', 'demigod-tool-dogfood.mjs', 'wrap', '--tool=webflow-doctor', '--', 'node', 'demigod-webflow.mjs', 'doctor', '--json'], timeout: 60000 },
  { id: 'favicon', cmd: ['node', 'demigod-favicon-ship.mjs'], timeout: 120000 },
  { id: 'blog-assets', cmd: ['node', 'demigod-blog-assets-gen.mjs'], timeout: 180000 },
  { id: 'dash-review', cmd: ['node', 'demigod-review.mjs', '--files', 'demigod-agent-dashboard.mjs', 'demigod-agent-dashboard-ui.html', 'demigod-tools-registry.mjs', '--no-contract', '--fail-on', 'high'], timeout: 120000 },
  { id: 'cycle-website', cmd: ['node', 'demigod-cycle-work.mjs', '--domain=website', '--owner=full-pass', '--cycle=fp'], timeout: 200000 },
  { id: 'cycle-tools', cmd: ['node', 'demigod-cycle-work.mjs', '--domain=tools', '--owner=full-pass', '--cycle=fp'], timeout: 200000 },
  { id: 'dogfood', cmd: ['node', 'demigod-tool-dogfood.mjs', 'status', '--json'], timeout: 20000 },
  {
    id: 'codex-pass',
    cmd: [
      'timeout',
      '240',
      'codex',
      'exec',
      '--full-auto',
      '--sandbox',
      'workspace-write',
      'Demigod full-pass unit. Dogfood tools. Prefer: (1) fix dash/tools/webflow bugs from /tmp/dg-busy/full-pass-state.json last failures (2) frontend polish head/blog assets if demigod-blog-assets-gen left TODOs (3) improve priority/map if broken. No auto-DM. No 5s swarm. No game. Smallest Ponytail diffs. Write /tmp/dg-busy/full-pass-codex-unit.json receipt.',
    ],
    timeout: 260000,
  },
];

function log(line) {
  const s = `[${new Date().toISOString()}] ${line}\n`;
  process.stdout.write(s);
  fs.appendFileSync(LOG, s);
}

function writeState(patch) {
  let cur = {};
  try {
    cur = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  } catch {
    /* */
  }
  Object.assign(cur, patch, { at: new Date().toISOString() });
  fs.writeFileSync(STATE, JSON.stringify(cur, null, 2) + '\n');
}

function ensureNeverStop() {
  const stopNs = path.join(BUSY, 'never-stop.STOP');
  if (fs.existsSync(stopNs)) return;
  try {
    const st = JSON.parse(fs.readFileSync(path.join(BUSY, 'never-stop-state.json'), 'utf8'));
    // if no recent lastAt, restart
    const age = Date.now() - Date.parse(st.lastAt || 0);
    if (Number.isFinite(age) && age < 10 * 60 * 1000) return;
  } catch {
    /* */
  }
  const child = spawn(process.execPath, ['demigod-never-stop-loop.mjs', 'run', '--max-cycles=999', '--sleep-sec=45'], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  log(`ensured never-stop pid=${child.pid}`);
}

function runUnit(unit) {
  log(`UNIT start ${unit.id}`);
  const t0 = Date.now();
  const r = spawnSync(unit.cmd[0], unit.cmd.slice(1), {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: unit.timeout || 180000,
    env: process.env,
  });
  const ms = Date.now() - t0;
  const ok = r.status === 0;
  const tail = ((r.stdout || '') + (r.stderr || '')).slice(-800);
  log(`UNIT end ${unit.id} ok=${ok} ms=${ms}`);
  return { id: unit.id, ok, ms, status: r.status, tail };
}

async function main() {
  fs.mkdirSync(BUSY, { recursive: true });
  const argv = process.argv.slice(2);
  const unknown = argv.find((a) => a.startsWith('-'));
  if (unknown) {
    console.error(
      `full-pass-loop: unknown argument ${unknown} — try: demigod-full-pass-loop.mjs [run|status|stop]`,
    );
    process.exit(2);
  }
  if (argv[0] === 'stop') {
    fs.writeFileSync(STOP, new Date().toISOString());
    console.log(JSON.stringify({ ok: true, stop: STOP }));
    return;
  }
  if (argv[0] === 'status') {
    let st = {};
    try {
      st = JSON.parse(fs.readFileSync(STATE, 'utf8'));
    } catch {
      /* */
    }
    console.log(JSON.stringify({ stop: fs.existsSync(STOP), state: st }, null, 2));
    return;
  }
  if (argv[0] && argv[0] !== 'run' && argv[0] !== 'start') {
    console.error('usage: demigod-full-pass-loop.mjs [run|status|stop]');
    process.exit(2);
  }
  try {
    fs.unlinkSync(STOP);
  } catch {
    /* */
  }
  fs.writeFileSync(PID, String(process.pid));
  let i = 0;
  let n = 0;
  writeState({ mode: 'run', unitIndex: 0, cycles: 0, last: null });
  log('full-pass-loop START');
  while (!fs.existsSync(STOP)) {
    ensureNeverStop();
    const unit = UNITS[i % UNITS.length];
    i += 1;
    n += 1;
    let result;
    try {
      result = runUnit(unit);
    } catch (e) {
      result = { id: unit.id, ok: false, error: String(e.message || e) };
    }
    writeState({ unitIndex: i, cycles: n, last: result, ...(result.ok ? {} : { lastFailure: result }) });
    // brief sleep — never thrash
    const sleepSec = Number(process.env.FULL_PASS_SLEEP_SEC || 60);
    for (let s = 0; s < sleepSec && !fs.existsSync(STOP); s++) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  log('full-pass-loop STOPPED');
  writeState({ mode: 'stopped' });
}

main().catch((e) => {
  log(`fatal ${e.message || e}`);
  process.exit(1);
});
