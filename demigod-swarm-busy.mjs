#!/usr/bin/env node
/**
 * demigod-swarm-busy — keep Codex + Fable constantly planning/working
 *
 * Bounded implementation supervision. One Codex implementation role enters
 * the shared cycle-work single-flight boundary; reviews are external/periodic.
 *
 *   node demigod-swarm-busy.mjs start [--gap-sec 5]
 *   node demigod-swarm-busy.mjs stop
 *   node demigod-swarm-busy.mjs status
 *
 * Stop: /tmp/dg-busy/swarm-busy.STOP
 */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { normalizeGap } from './demigod-harness-coord.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const STOP = path.join(BUSY, 'swarm-busy.STOP');
const STATE = path.join(BUSY, 'swarm-busy-state.json');
const SUPERVISOR = path.join(BUSY, 'swarm-supervisor.lock');

function ensure() {
  fs.mkdirSync(BUSY, { recursive: true });
}

function log(role, line) {
  const s = `[${new Date().toISOString()}] [${role}] ${line}\n`;
  process.stdout.write(s);
  fs.appendFileSync(path.join(BUSY, `swarm-${role}.log`), s);
}

function writeState(patch) {
  ensure();
  let cur = {};
  try {
    cur = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  } catch {
    /* */
  }
  Object.assign(cur, patch, { at: new Date().toISOString() });
  fs.writeFileSync(STATE, JSON.stringify(cur, null, 2) + '\n');
}

function shouldStop() {
  return fs.existsSync(STOP);
}

function runOnce(role, n) {
  const out = path.join(BUSY, `swarm-${role}-${n}.txt`);
  const fd = fs.openSync(out, 'a');
  let cmd, args, timeoutSec;
  // Rotate domains; every 5th job is outside research (catalog search + brief).
  const domain = n % 5 === 0 ? 'research' : ['website', 'tools', 'startup', 'ship'][n % 4];
  if (role === 'codex') {
    cmd = 'timeout';
    timeoutSec = 175;
    args = [
      String(timeoutSec),
      process.execPath,
      path.join(ROOT, 'demigod-cycle-work.mjs'),
      '--domain=auto',
      `--cycle=${n}`,
      '--owner=swarm-codex',
    ];
  } else if (role === 'fable') {
    cmd = 'timeout';
    timeoutSec = 180;
    args = [
      String(timeoutSec),
      path.join(ROOT, 'bin/df'),
      'review',
      domain === 'research'
        ? `Demigod swarm-busy fable #${n} domain=research. Run node demigod-loop-research.mjs --cycle=fable-${n} if brief stale. Read /tmp/dg-busy/research-brief.md. Write apply-ready patches to /tmp/dg-busy/swarm-fable-plan-${n}.md grounded in that research (exact search/replace). No human-task lists.`
        : `Demigod swarm-busy fable #${n} domain=${domain}. Write IMPLEMENTABLE patch plan for domain=${domain} to /tmp/dg-busy/swarm-fable-plan-${n}.md with exact search/replace or file edits for Grok/Codex. Also list verification commands. Optional: use /tmp/dg-busy/research-brief.md. No human-task lists.`,
    ];
  } else {
    cmd = 'timeout';
    timeoutSec = 200;
    args = [
      String(timeoutSec),
      'claude',
      '--print',
      '--model',
      'sonnet',
      '--add-dir',
      ROOT,
      domain === 'research'
        ? `Demigod swarm-busy claude #${n} domain=research. Summarize /tmp/dg-busy/research-latest.json into 3 bullets + one concrete edit idea to /tmp/dg-busy/swarm-claude-research-${n}.md. No human tasks.`
        : `Demigod swarm-busy claude #${n} domain=${domain}. Ponytail REQUIRED: YAGNI/reuse/stdlib/native before new code; min diff; keep safety. IMPLEMENT a small fix in that domain if you can edit; else write exact unified-diff style edits to /tmp/dg-busy/swarm-claude-patch-${n}.md. Domain website=foot-core, tools=demand/dashboard, startup=pilot-inbound, ship=cm6. No human tasks.`,
    ];
  }

  return new Promise((resolve) => {
    log(role, `start #${n} → ${out}`);
    const child = spawn(cmd, args, {
      cwd: ROOT,
      env: process.env,
      stdio: ['ignore', fd, fd],
    });
    const t0 = Date.now();
    child.on('exit', (code) => {
      try {
        fs.closeSync(fd);
      } catch {
        /* */
      }
      log(role, `exit #${n} code=${code} ms=${Date.now() - t0}`);
      resolve({ code, n, out });
    });
  });
}

async function worker(role, gapSec) {
  let n = 1;
  writeState({ [`${role}Pid`]: process.pid, [`${role}N`]: 0 });
  while (!shouldStop()) {
    try {
      await runOnce(role, n);
    } catch (e) {
      log(role, `error ${e.message || e}`);
    }
    writeState({ [`${role}N`]: n, [`${role}Last`]: new Date().toISOString() });
    n += 1;
    // tiny gap only — keep constantly busy
    await new Promise((r) => setTimeout(r, gapSec * 1000));
  }
  log(role, 'stopped via STOP file');
}

async function start(argv) {
  ensure();
  const existing = (() => { try { return JSON.parse(fs.readFileSync(SUPERVISOR, 'utf8')); } catch { return null; } })();
  if (existing?.pid) {
    try {
      process.kill(Number(existing.pid), 0);
      console.log(JSON.stringify({ ok: false, skipped: true, reason: 'duplicate-supervisor', supervisor: existing }));
      return;
    } catch { try { fs.unlinkSync(SUPERVISOR); } catch { /* */ } }
  }
  try {
    fs.writeFileSync(SUPERVISOR, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }) + '\n', { flag: 'wx' });
  } catch (error) {
    if (error?.code === 'EEXIST') {
      console.log(JSON.stringify({ ok: false, skipped: true, reason: 'duplicate-supervisor' }));
      return;
    }
    throw error;
  }
  try {
    fs.unlinkSync(STOP);
  } catch {
    /* */
  }
  const gap = normalizeGap(argv.find((a) => a.startsWith('--gap-sec='))?.split('=')[1]);
  const roles = ['codex'];
  // parent supervises children
  const kids = [];
  for (const role of roles) {
    const child = spawn(
      process.execPath,
      [path.join(ROOT, 'demigod-swarm-busy.mjs'), 'worker', role, `--gap-sec=${gap}`],
      {
        cwd: ROOT,
        detached: true,
        stdio: 'ignore',
      },
    );
    child.unref();
    kids.push({ role, pid: child.pid });
    log('main', `spawned ${role} pid=${child.pid}`);
  }
  writeState({ mode: 'main', kids, gapSec: gap, startedAt: new Date().toISOString() });
  fs.writeFileSync(SUPERVISOR, JSON.stringify({ pid: kids[0]?.pid || process.pid, role: 'codex', gapSec: gap, startedAt: new Date().toISOString() }) + '\n');
  fs.writeFileSync(path.join(BUSY, 'swarm-busy.pid'), String(process.pid));
  console.log(JSON.stringify({ ok: true, gapSec: gap, kids }, null, 2));
}

async function workerCmd(argv) {
  const role = argv[0];
  const gap = normalizeGap(argv.find((a) => a.startsWith('--gap-sec='))?.split('=')[1]);
  fs.writeFileSync(path.join(BUSY, `swarm-${role}.pid`), String(process.pid));
  await worker(role, gap);
}

function stop() {
  ensure();
  fs.writeFileSync(STOP, new Date().toISOString());
  try { fs.unlinkSync(SUPERVISOR); } catch { /* */ }
  // best-effort kill recorded pids
  const st = (() => {
    try {
      return JSON.parse(fs.readFileSync(STATE, 'utf8'));
    } catch {
      return {};
    }
  })();
  for (const role of ['codex', 'fable', 'claude']) {
    try {
      const p = fs.readFileSync(path.join(BUSY, `swarm-${role}.pid`), 'utf8').trim();
      process.kill(Number(p), 'SIGTERM');
    } catch {
      /* */
    }
  }
  console.log(JSON.stringify({ ok: true, stop: STOP, note: 'workers exit after current job' }));
}

function status() {
  ensure();
  let st = {};
  try {
    st = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  } catch {
    /* */
  }
  const alive = {};
  for (const role of ['codex', 'fable', 'claude']) {
    try {
      const p = fs.readFileSync(path.join(BUSY, `swarm-${role}.pid`), 'utf8').trim();
      process.kill(Number(p), 0);
      alive[role] = { pid: Number(p), up: true };
    } catch {
      alive[role] = { up: false };
    }
  }
  console.log(JSON.stringify({ stop: fs.existsSync(STOP), state: st, alive }, null, 2));
}

const swarmArgv = process.argv.slice(2);
const cmd = swarmArgv[0] || 'status';
const swarmAllowed = (a) => a.startsWith('--gap-sec=');
const swarmUnknown = swarmArgv.find((a) => a.startsWith('-') && !swarmAllowed(a));
if (swarmUnknown) {
  console.error(
    `swarm-busy: unknown argument ${swarmUnknown} — try: start|worker|stop|status [--gap-sec=N]`,
  );
  process.exit(2);
}
if (cmd === 'start') start(swarmArgv.slice(1));
else if (cmd === 'worker') workerCmd(swarmArgv.slice(1));
else if (cmd === 'stop') stop();
else if (cmd === 'status') status();
else {
  console.error('usage: start|worker|stop|status [--gap-sec=N]');
  process.exit(2);
}
