#!/usr/bin/env node
/**
 * demigod-selfstart — start / restart the agent stack if anything died.
 *
 * Chat turns end. This does not. Pair with demigod-selfstart.timer (every 2m).
 *
 *   node demigod-selfstart.mjs ensure   # default — heal stack
 *   node demigod-selfstart.mjs status
 *   node demigod-selfstart.mjs install  # print unit install (or run enable)
 *
 * Clears *accidental* STOP files for useful-loop / mind / grok-busy so "keep working"
 * cannot be stranded. Does NOT clear funnel-loop.STOP / never-stop.STOP (intentional pause).
 * Does NOT force freeze off, DM, or invent RSVPs.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.env.DEMIGOD_ROOT || '/home/potter';
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const LOG = path.join(BUSY, 'selfstart.log');
const LAST = path.join(BUSY, 'selfstart-last.json');

/** Units that must stay up for Grok nonstop work */
const UNITS = [
  'demigod-useful-loop.service',
  'demigod-nonstop-mind.service',
  'demigod-grok-busy.service',
  'demigod-events-bot.service',
  'demigod-funnel-watchdog.service',
  'demigod-agent-coord.service',
  'demigod-dash.service',
];

/** Timers that should be enabled */
const TIMERS = [
  'demigod-laptop-blue-moon.timer',
  'demigod-events-heal.timer',
  'demigod-selfstart.timer',
];

/** STOP files we clear so nonstop cannot soft-die forever */
const CLEAR_STOPS = [
  'useful-loop.STOP',
  'mind.STOP',
  'grok-busy.STOP',
  'selfstart.STOP', // only if we're running ensure
];

function log(line) {
  const s = `[${new Date().toISOString()}] ${line}`;
  console.log(s);
  try {
    fs.mkdirSync(BUSY, { recursive: true });
    fs.appendFileSync(LOG, s + '\n');
  } catch {
    /* */
  }
}

function systemctl(args) {
  return spawnSync('systemctl', ['--user', ...args], {
    encoding: 'utf8',
    timeout: 30000,
  });
}

function isActive(unit) {
  const r = systemctl(['is-active', unit]);
  return (r.stdout || '').trim() === 'active';
}

function ensureUnit(unit) {
  const before = isActive(unit);
  if (before) return { unit, was: 'active', action: 'none', ok: true };
  // enable + start
  systemctl(['enable', unit]);
  const st = systemctl(['start', unit]);
  const after = isActive(unit);
  log(`${unit}: was down → start status=${st.status} now=${after ? 'active' : 'failed'}`);
  return {
    unit,
    was: 'inactive',
    action: 'start',
    ok: after,
    err: after ? null : (st.stderr || st.stdout || '').slice(0, 300),
  };
}

function ensureTimer(unit) {
  const r = systemctl(['is-enabled', unit]);
  const en = (r.stdout || '').trim() === 'enabled';
  if (!en) {
    systemctl(['enable', '--now', unit]);
    log(`timer ${unit}: enabled --now`);
    return { unit, action: 'enable-now', ok: true };
  }
  // ensure active
  if (!isActive(unit)) {
    systemctl(['start', unit]);
    return { unit, action: 'start', ok: isActive(unit) };
  }
  return { unit, action: 'none', ok: true };
}

function clearStops() {
  const cleared = [];
  // Never clear if global selfstart is deliberately stopped via env
  if (process.env.DEMIGOD_SELFSTART_RESPECT_STOP === '1') {
    return cleared;
  }
  for (const name of CLEAR_STOPS) {
    if (name === 'selfstart.STOP') continue; // don't clear our own gate mid-run from list below
    const p = path.join(BUSY, name);
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
        cleared.push(name);
        log(`cleared STOP ${name}`);
      } catch (e) {
        log(`fail clear ${name}: ${e.message}`);
      }
    }
  }
  return cleared;
}

function ensure() {
  if (fs.existsSync(path.join(BUSY, 'selfstart.STOP'))) {
    log('selfstart.STOP present — not healing (intentional)');
    const receipt = {
      at: new Date().toISOString(),
      ok: true,
      skipped: true,
      reason: 'selfstart.STOP',
    };
    fs.writeFileSync(LAST, JSON.stringify(receipt, null, 2) + '\n');
    return receipt;
  }

  fs.mkdirSync(BUSY, { recursive: true });
  const cleared = clearStops();
  const units = UNITS.map(ensureUnit);
  const timers = TIMERS.filter((t) => t !== 'demigod-selfstart.timer' || true).map((t) => {
    try {
      return ensureTimer(t);
    } catch {
      return { unit: t, action: 'skip', ok: false };
    }
  });

  // Linger so user services survive logout
  spawnSync('loginctl', ['enable-linger', process.env.USER || 'potter'], {
    encoding: 'utf8',
    timeout: 10000,
  });

  // Heartbeat files for dashboards
  fs.writeFileSync(
    path.join(BUSY, 'selfstart.heartbeat'),
    new Date().toISOString() + '\n',
  );

  const failed = units.filter((u) => !u.ok);
  const receipt = {
    at: new Date().toISOString(),
    ok: failed.length === 0,
    clearedStops: cleared,
    units,
    timers,
    failed: failed.map((f) => f.unit),
    note: 'Chat ends; selfstart + systemd Restart=always keep stack up.',
  };
  fs.writeFileSync(LAST, JSON.stringify(receipt, null, 2) + '\n');
  log(
    `ensure ok=${receipt.ok} cleared=${cleared.join(',') || '—'} failed=${receipt.failed.join(',') || '—'}`,
  );
  console.log(JSON.stringify(receipt, null, 2));
  return receipt;
}

function status() {
  const rows = UNITS.map((u) => ({ unit: u, active: isActive(u) }));
  const stops = CLEAR_STOPS.map((n) => ({
    name: n,
    present: fs.existsSync(path.join(BUSY, n)),
  }));
  const out = {
    at: new Date().toISOString(),
    units: rows,
    stops,
    last: (() => {
      try {
        return JSON.parse(fs.readFileSync(LAST, 'utf8'));
      } catch {
        return null;
      }
    })(),
    heartbeat: (() => {
      try {
        return fs.readFileSync(path.join(BUSY, 'selfstart.heartbeat'), 'utf8').trim();
      } catch {
        return null;
      }
    })(),
  };
  console.log(JSON.stringify(out, null, 2));
  return out;
}

const cmd = process.argv[2] || 'ensure';
if (cmd === 'ensure' || cmd === 'heal' || cmd === 'up') ensure();
else if (cmd === 'status') status();
else if (cmd === 'install') {
  console.log(`# already managed by systemd units demigod-selfstart.service/.timer
systemctl --user enable --now demigod-selfstart.timer
systemctl --user start demigod-selfstart.service
bin/dg-selfstart status
`);
} else {
  console.error('usage: demigod-selfstart.mjs ensure|status|install');
  process.exit(2);
}
