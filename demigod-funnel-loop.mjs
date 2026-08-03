#!/usr/bin/env node
/**
 * demigod-funnel-loop — continuous local ticks + agent helpers.
 * Active focus: Events Bot / SF nights (see /tmp/dg-busy/events-bot/FOCUS.md).
 * Still runs light funnel hygiene (selftest/status/draft/pipeline) as secondary.
 *
 * Spawns Fable (design) + Codex (implement) as side workers; runs local ticks.
 * Stop: touch /tmp/dg-busy/funnel-loop.STOP
 *
 *   node demigod-funnel-loop.mjs run [--sleep-sec=30] [--max-cycles=0]
 *   node demigod-funnel-loop.mjs status
 *   node demigod-funnel-loop.mjs stop
 *   node demigod-funnel-loop.mjs once|once-draft [--force-paused]
 *
 * max-cycles=0 means unlimited. once-draft is blocked while lead FOCUS is paused
 * unless --force-paused (parity demigod-lead-collect.mjs).
 */
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  firstUsableOutreachEmail,
  hasUnresolvedLinkedInConflict,
  isUsableOutreachHandle,
} from './demigod-lead-collect.mjs';
import { normalizeLinkedInProfile } from './demigod-outreach-policy.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const DIR = path.join(BUSY, 'funnel-loop');
const STOP = path.join(BUSY, 'funnel-loop.STOP');
const PIDF = path.join(DIR, 'funnel-loop.pid');
const LOG = path.join(DIR, 'funnel-loop.log');
const STATE = path.join(DIR, 'state.json');
const FOCUS = path.join(BUSY, 'events-bot', 'FOCUS.md');
const DESIGN = path.join(BUSY, 'events-bot', 'EVENTBOT-MASTER-SPEC.md');

function ensure() {
  fs.mkdirSync(DIR, { recursive: true });
  fs.mkdirSync(path.join(BUSY, 'lead-system'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'demigod-outreach', 'funnel-drafts'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'demigod-outreach', 'funnel-receipts'), { recursive: true });
}

function log(line) {
  const s = `[${new Date().toISOString()}] ${line}\n`;
  process.stdout.write(s);
  // Duplex to LOG only on TTY — nohup >> LOG already captures stdout (avoid double lines)
  if (process.stdout.isTTY) {
    try {
      fs.appendFileSync(LOG, s);
    } catch {
      /* */
    }
  }
}

function readJson(p, def = null) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return def;
  }
}

function writeJson(p, o) {
  fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n');
}

function run(cmd, args, timeout = 120000) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    env: process.env,
    maxBuffer: 8 * 1024 * 1024,
  });
  // Keep full stdout — funnel status JSON already exceeds 6k; truncating
  // here made funnelStatus() always fail → lastStatus={} / total=undefined.
  return {
    status: r.status ?? 1,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
  };
}

/** Pure: parse CLI JSON stdout; tolerate leading/trailing noise + multi-JSON dumps. */
export function parseCliJson(stdout) {
  const s = String(stdout || '').trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    /* prefer last complete {...} object (status after logs) */
  }
  let end = s.lastIndexOf('}');
  while (end > 0) {
    let depth = 0;
    let start = -1;
    for (let i = end; i >= 0; i--) {
      const ch = s[i];
      if (ch === '}') depth++;
      else if (ch === '{') {
        depth--;
        if (depth === 0) {
          start = i;
          break;
        }
      }
    }
    if (start >= 0) {
      try {
        return JSON.parse(s.slice(start, end + 1));
      } catch {
        /* try earlier block */
      }
    }
    end = s.lastIndexOf('}', end - 1);
  }
  return null;
}

/** True if a codex exec is already running (avoid pile-up). */
function codexBusy() {
  try {
    const r = spawnSync('pgrep', ['-fc', 'codex exec'], { encoding: 'utf8' });
    return (Number((r.stdout || '0').trim()) || 0) >= 1;
  } catch {
    return false;
  }
}

/** Failed integrity gates must stop the cycle before any funnel mutation. */
export const mayRunFunnelStages = (selftestStatus) => selftestStatus === 0;

function alive() {
  if (!fs.existsSync(PIDF)) return false;
  const p = fs.readFileSync(PIDF, 'utf8').trim();
  try {
    process.kill(Number(p), 0);
    return true;
  } catch {
    return false;
  }
}

function spawnBg(label, cmd, args, outFile, timeoutSec = 300) {
  const fd = fs.openSync(outFile, 'w');
  const child = spawn('timeout', [String(timeoutSec), cmd, ...args], {
    cwd: ROOT,
    env: process.env,
    stdio: ['ignore', fd, fd],
    detached: true,
  });
  child.unref();
  fs.closeSync(fd);
  log(`spawn ${label} pid=${child.pid} → ${outFile}`);
  return child.pid;
}

function funnelStatus() {
  const r = run(process.execPath, ['demigod-funnel.mjs', 'status'], 60000);
  const parsed = parseCliJson(r.stdout);
  if (parsed && typeof parsed === 'object') return parsed;
  return { ok: false, raw: String(r.stdout || '').slice(-500), exit: r.status };
}

export function selectDraftableLeads(leads, n = 3) {
  return [
    ...(leads.partners || []).map((l) => ({ ...l, side: 'partner' })),
    ...(leads.talent || []).map((l) => ({ ...l, side: 'talent' })),
  ]
    .filter(
      (l) =>
        (l.state || l.status || 'sourced') === 'sourced' &&
        (l.score || 0) >= 65 &&
        (firstUsableOutreachEmail(l.email, l.contactEmail) ||
          isUsableOutreachHandle(l.handle) ||
          (
            normalizeLinkedInProfile(l.linkedin || l.url) &&
            !hasUnresolvedLinkedInConflict(l)
          )),
    )
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, n);
}

function draftNextBatch(n = 3) {
  const leads = readJson(path.join(ROOT, 'DEMIGOD-LEADS.json'), {});
  const rows = selectDraftableLeads(leads, n);

  const done = [];
  for (const lead of rows) {
    const d = run(process.execPath, ['demigod-funnel.mjs', 'draft', `--id=${lead.id}`], 30000);
    if (d.status !== 0) {
      throw new Error(`draft fail ${lead.id}: ${(d.stderr || d.stdout).slice(-200)}`);
    }
    const evidence = path.join(ROOT, 'demigod-outreach', 'funnel-drafts', `${lead.id}.txt`);
    const t = run(
      process.execPath,
      ['demigod-funnel.mjs', 'transition', `--id=${lead.id}`, '--to=drafted', `--evidence=${evidence}`],
      30000,
    );
    done.push({ id: lead.id, ok: t.status === 0, score: lead.score });
    log(`drafted ${lead.id} ok=${t.status === 0}`);
  }
  return done;
}

function ensurePipelineSkeleton() {
  const p = path.join(ROOT, 'demigod-lead-pipeline.mjs');
  if (fs.existsSync(p)) return { existed: true };
  throw new Error(`missing canonical pipeline: ${p}`);
}

function spawnHelpers(cycle) {
  // Agents every 3 cycles only — every-cycle Fable+Codex was thrashing API + disk
  const agentEvery = Number(process.env.FUNNEL_LOOP_AGENT_EVERY || 3);
  if (cycle % agentEvery !== 0) {
    log(`helpers skip cycle=${cycle} (agent every ${agentEvery})`);
    return;
  }
  if (codexBusy()) {
    log(`helpers skip cycle=${cycle}: codex already running`);
    return;
  }

  const fableOut = path.join(DIR, `fable-c${cycle}.txt`);
  const codexOut = path.join(DIR, `codex-c${cycle}.txt`);

  const fableTask = `Demigod EVENTS BOT / SF nights. Task context: Events Bot autonomy + SF-only nights.
Read /tmp/dg-busy/events-bot/FOCUS.md + EVENTBOT-MASTER-SPEC.md + BRIEF-FOR-AGENTS.md + DEMIGOD-EVENTS.json.
Rank next 3 implementable P0s (lifecycle, offer match, outreach drafts, selftest, public API). Ponytail/YAGNI. No human task lists.
Output: numbered plan Grok/Codex can apply. Write also to /tmp/dg-busy/funnel-loop/FABLE-NEXT.md`;

  spawnBg(
    'fable',
    path.join(ROOT, 'bin/df'),
    ['review', fableTask],
    fableOut,
    240,
  );

  const codexTask = `Demigod EVENTS BOT / SF nights. Read /tmp/dg-busy/events-bot/FOCUS.md, EVENTBOT-MASTER-SPEC.md, demigod-events-bot-agent.mjs, demigod-events-bot-chat.mjs, demigod-events-app.mjs if present.
Implement ONE minimal Events Bot improvement (lifecycle stage, offer match, outreach queue draft, SF geo, selftest). No auto-DM. No fake RSVPs. No invent emails. No board. No foot thrash.
Run: DEMIGOD_EVENTS_BOT_MOCK=1 node demigod-events-bot-selftest.mjs must stay green.
Write what you did to /tmp/dg-busy/funnel-loop/CODEX-LAST.md`;

  spawnBg(
    'codex',
    'codex',
    ['exec', '--full-auto', '--sandbox', 'workspace-write', codexTask],
    codexOut,
    420,
  );

}

async function cycleOnce(state) {
  state.cycles = (state.cycles || 0) + 1;
  const cycle = state.cycles;
  log(`CYCLE ${cycle} begin`);

  // 1 selftests — Events Bot primary; light funnel gate still required before any lead mutations
  const ev = spawnSync(
    process.execPath,
    [path.join(ROOT, 'demigod-events-bot-selftest.mjs')],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 90000,
      env: { ...process.env, DEMIGOD_EVENTS_BOT_MOCK: '1' },
      maxBuffer: 8e6,
    },
  );
  log(`events-selftest exit=${ev.status ?? 1}`);
  // 120s — selftest suite grew; 60s flaked under load with concurrent canary
  const st = run(process.execPath, ['demigod-funnel-selftest.mjs'], 120000);
  log(
    `funnel-selftest exit=${st.status}` +
      (st.status !== 0
        ? ` err=${(st.stderr || st.stdout || '').slice(-300).replace(/\s+/g, ' ')}`
        : ''),
  );
  state.lastEventsSelftestOk = (ev.status ?? 1) === 0;
  state.lastSelftestOk = mayRunFunnelStages(st.status) && state.lastEventsSelftestOk;
  if (!state.lastSelftestOk) {
    log(`CYCLE ${cycle} aborted: selftest failed (events=${state.lastEventsSelftestOk} funnel=${mayRunFunnelStages(st.status)}); no stages ran`);
    return state;
  }

  // 2 ensure pipeline entrypoint
  ensurePipelineSkeleton();

  // 3 pipeline owns normalize/draft/join once per active cycle (no duplicate mutations here)
  let status = funnelStatus();
  if (status.focusPaused) {
    log('pipeline tick skipped: funnel focus paused');
  } else {
    const tick = run(process.execPath, ['demigod-lead-pipeline.mjs', 'tick', '--stage=all'], 180000);
    log(`pipeline tick exit=${tick.status}`);
    status = funnelStatus();
    if (tick.status !== 0) {
      state.lastSelftestOk = false;
      state.lastAt = new Date().toISOString();
      writeJson(STATE, state);
      writeJson(path.join(DIR, 'heartbeat.json'), {
        at: state.lastAt,
        cycle,
        selftestOk: false,
        pid: process.pid,
        owner: 'funnel-loop',
      });
      log(`CYCLE ${cycle} aborted: pipeline tick failed; no downstream jobs ran`);
      return state;
    }
  }

  // 4 record post-pipeline truth
  // FOCUS #2: invite outbox drain — every 2 cycles, or when snapshot stale (>3m), or needs_url>0
  const drainAge = Number(status?.metrics?.invite_drain_age_sec);
  const drainStale = !Number.isFinite(drainAge) || drainAge > 180;
  const drainNeed = Number(status?.metrics?.invite_drain_needs_url) > 0;
  if (cycle % 2 === 0 || drainStale || drainNeed) {
    const why = drainNeed ? 'needs_url' : drainStale ? `stale age=${drainAge}` : 'cadence';
    const drain = run(process.execPath, ['demigod-events-invite-drain.mjs'], 90000);
    log(`invite-drain (${why}) exit=${drain.status} ${(drain.stdout || '').trim().slice(-200)}`);
    status = funnelStatus(); // refresh invite_drain_* metrics after absorb
  }
  // Repair package boards only when post-pipeline truth says they drifted or stayed stale.
  const pkgAge = Number(status?.metrics?.package_age_sec);
  const pkgStale = !!status?.metrics?.package_stale || (Number.isFinite(pkgAge) && pkgAge > 600);
  if (!status.focusPaused && (status?.metrics?.package_drift || pkgStale)) {
    const why = status?.metrics?.package_drift
      ? 'drift'
      : `stale age_sec=${Number.isFinite(pkgAge) ? pkgAge : '?'}`;
    log(
      `package soft-refresh (${why}) approve_ready=${status.metrics.approve_ready} pkg=${status.metrics.package_approve_ready} send_ready=${status.metrics.send_ready}`,
    );
    run(process.execPath, ['demigod-lead-pipeline.mjs', 'tick', '--stage=packages'], 60000);
    status = funnelStatus();
  }
  state.lastStatus = {
    at: status.at,
    byState: status.byState,
    metrics: status.metrics,
    total: status.total,
  };
  log(`status total=${status.total} byState=${JSON.stringify(status.byState || {})}`);

  // 5 helpers every cycle (fable+codex) — staggered if previous still heavy
  spawnHelpers(cycle);

  // 6 occasional lead re-collect (every 8 cycles) if credits allow
  if (!status.focusPaused && cycle % 8 === 0) {
    log('scheduled lead-collect');
    const col = run(process.execPath, ['demigod-lead-collect.mjs', '--limit=25'], 300000);
    log(`lead-collect exit=${col.status} tail=${(col.stdout || '').slice(-200)}`);
    run(process.execPath, ['demigod-funnel.mjs', 'normalize'], 30000);
  }

  // 7 dogfood
  run(process.execPath, [
    'demigod-tool-dogfood.mjs',
    'log',
    '--tool=funnel-loop',
    `--ok=${state.lastSelftestOk ? 1 : 0}`,
    '--useful=1',
    `--why=cycle ${cycle} funnel automation`,
  ], 15000);

  state.lastAt = new Date().toISOString();
  writeJson(STATE, state);
  const latest = {
    cycle,
    at: state.lastAt,
    selftestOk: state.lastSelftestOk,
    status: state.lastStatus,
    drafted: null,
    focus: FOCUS,
    owner: 'funnel-loop',
  };
  writeJson(path.join(DIR, 'latest.json'), latest);
  // Observable loop heartbeat.
  writeJson(path.join(DIR, 'heartbeat.json'), {
    at: state.lastAt,
    cycle,
    selftestOk: state.lastSelftestOk,
    pid: process.pid,
    owner: 'funnel-loop',
  });
  log(`CYCLE ${cycle} end selftest=${state.lastSelftestOk}`);
  return state;
}

async function runLoop(opts) {
  ensure();
  if (alive()) {
    console.log(JSON.stringify({ ok: false, error: 'already running', pid: fs.readFileSync(PIDF, 'utf8').trim() }));
    process.exit(1);
  }
  fs.rmSync(STOP, { force: true });
  fs.writeFileSync(PIDF, String(process.pid));
  const sleepSec = opts.sleepSec ?? Number(process.env.FUNNEL_LOOP_SLEEP_SEC || 30);
  const maxCycles = opts.maxCycles ?? Number(process.env.FUNNEL_LOOP_MAX_CYCLES || 0); // 0=∞

  let state = readJson(STATE, {
    schema: 'demigod.funnel-loop/1',
    startedAt: new Date().toISOString(),
    cycles: 0,
  });
  state.startedAt = state.startedAt || new Date().toISOString();
  state.running = true;
  writeJson(STATE, state);
  log(`loop start sleep=${sleepSec}s maxCycles=${maxCycles || '∞'} focus=${FOCUS}`);

  const onExit = () => {
    try {
      fs.rmSync(PIDF, { force: true });
    } catch {
      /* */
    }
  };
  process.on('exit', onExit);
  process.on('SIGTERM', () => {
    fs.writeFileSync(STOP, new Date().toISOString());
    process.exit(0);
  });

  while (!fs.existsSync(STOP)) {
    try {
      state = await cycleOnce(state);
    } catch (e) {
      log(`cycle error: ${e.message || e}`);
      state.lastError = String(e.message || e);
      writeJson(STATE, state);
    }
    if (maxCycles > 0 && state.cycles >= maxCycles) {
      log('max-cycles reached');
      break;
    }
    // interruptible sleep
    const end = Date.now() + sleepSec * 1000;
    while (Date.now() < end && !fs.existsSync(STOP)) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  state.running = false;
  state.stoppedAt = new Date().toISOString();
  writeJson(STATE, state);
  onExit();
  log('loop stopped');
}

function cmdStatus() {
  ensure();
  const state = readJson(STATE, {});
  console.log(
    JSON.stringify(
      {
        ok: true,
        running: alive(),
        pid: alive() ? fs.readFileSync(PIDF, 'utf8').trim() : null,
        stop: fs.existsSync(STOP),
        state,
        latest: readJson(path.join(DIR, 'latest.json')),
        log: LOG,
      },
      null,
      2,
    ),
  );
}

function cmdStop() {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(STOP, new Date().toISOString() + '\n');
  if (alive()) {
    try {
      process.kill(Number(fs.readFileSync(PIDF, 'utf8').trim()), 'SIGTERM');
    } catch {
      /* */
    }
  }
  console.log(JSON.stringify({ ok: true, stop: STOP }));
}

function cmdOnceDraft({ forcePaused = false } = {}) {
  ensure();
  // Lead funnel FOCUS pause must block once-draft mutations (parity collect --force-paused).
  const status = funnelStatus();
  if (status.focusPaused && !forcePaused) {
    console.error(
      JSON.stringify({
        ok: false,
        focusPaused: true,
        error: 'requires --force-paused while lead funnel is paused',
      }),
    );
    process.exit(2);
  }
  const done = draftNextBatch(3);
  console.log(
    JSON.stringify({ ok: true, drafted: done, focusPaused: !!status.focusPaused }, null, 2),
  );
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const argv = process.argv.slice(2);
  const cmd = argv[0] || 'status';
  const allowedFlag = (a) =>
    a.startsWith('--sleep-sec=') || a.startsWith('--max-cycles=') || a === '--force-paused';
  const unknown = argv.find((a) => a.startsWith('-') && !allowedFlag(a));
  if (unknown) {
    console.error(
      `funnel-loop: unknown argument ${unknown} — try: demigod-funnel-loop.mjs run|status|stop|once|once-draft [--sleep-sec=30] [--max-cycles=0] [--force-paused]`,
    );
    process.exit(2);
  }
  if (cmd.startsWith('-')) {
    console.error(
      'usage: run|status|stop|once|once-draft [--sleep-sec=30] [--max-cycles=0] [--force-paused]',
    );
    process.exit(2);
  }
  const sleepArg = argv.find((a) => a.startsWith('--sleep-sec='));
  const maxArg = argv.find((a) => a.startsWith('--max-cycles='));
  const forcePaused = argv.includes('--force-paused');
  const opts = {
    sleepSec: sleepArg ? Number(sleepArg.split('=')[1]) : undefined,
    maxCycles: maxArg ? Number(maxArg.split('=')[1]) : undefined,
  };

  if (cmd === 'run' || cmd === 'start') {
    runLoop(opts).catch((e) => {
      console.error(e);
      process.exit(1);
    });
  } else if (cmd === 'status') cmdStatus();
  else if (cmd === 'stop') cmdStop();
  else if (cmd === 'once-draft' || cmd === 'once') cmdOnceDraft({ forcePaused });
  else {
    console.error(
      'usage: run|status|stop|once|once-draft [--sleep-sec=30] [--max-cycles=0] [--force-paused]',
    );
    process.exit(2);
  }
}
