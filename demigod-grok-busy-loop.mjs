#!/usr/bin/env node
/**
 * demigod-grok-busy-loop — keep Grok productively working on Demigod automation.
 *
 * Two layers each cycle:
 *   1) LOCAL (always): pipeline/funnel ticks, selftests, apply queue scripts — no LLM cost
 *   2) AGENT (every N cycles): enqueue grok-inbox job OR grok-ask implement one P0
 *
 *   node demigod-grok-busy-loop.mjs run [--sleep-sec=30] [--agent-every=2]
 *   node demigod-grok-busy-loop.mjs status|stop|once|feed
 *
 * Stop: touch /tmp/dg-busy/grok-busy.STOP
 * Kill switch global: /tmp/dg-busy/swarm.STOP
 */
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const DIR = path.join(BUSY, 'grok-busy');
const STOP = path.join(BUSY, 'grok-busy.STOP');
const GSTOP = path.join(BUSY, 'swarm.STOP');
const PIDF = path.join(DIR, 'grok-busy.pid');
const LOG = path.join(DIR, 'grok-busy.log');
const STATE = path.join(DIR, 'state.json');
const QUEUE = path.join(DIR, 'work-queue.jsonl');
const FOCUS = path.join(BUSY, 'events-bot', 'FOCUS.md');
const INBOX = path.join(BUSY, 'grok-inbox');

const DEFAULT_PROMPTS = [
  'Demigod EVENTS BOT / SF nights. Read /tmp/dg-busy/events-bot/FOCUS.md + EVENTBOT-MASTER-SPEC.md + BRIEF-FOR-AGENTS.md. Implement ONE minimal fix (lifecycle stage advance, offer match, outreach queue draft quality, events selftest, SF geo). DEMIGOD_EVENTS_BOT_MOCK=1 node demigod-events-bot-selftest.mjs must stay green. No auto-DM, no fake RSVPs, no invent emails, no board, no foot thrash. Write /tmp/dg-busy/grok-busy/LAST.md',
  'Demigod Events Bot. Read DEMIGOD-EVENTS.json honesty + demigod-events-bot-agent.mjs. Improve free SF venue match or resource outreach queue (draft only). Selftest green. LAST.md',
  'Demigod Events Bot chat/agent. Improve demigod-events-bot-chat.mjs owner voice or agent tick planning. SF only. No fake RSVPs. Selftest green. LAST.md',
  'Demigod Events page. Read FOCUS gaps (public API/tunnel, Partiful draft, gold UI). One small tools or app fix. Selftest green. LAST.md',
];

const BOUNDED_AGENT_CONTRACT = `BOUND THIS TASK (overrides broader wording above):
- Spend at most 120 seconds working; if no safe tiny fix is obvious in 45 seconds, make no edit and report the best verified gap.
- Open at most 2 task files, edit at most 1 unclaimed file, and change at most 20 lines. Do not write LAST.md; your response is the handoff.
- Run at most 1 focused file-level check (not the full events-bot selftest). Return even if the check fails or time expires.
- DEMIGOD-EVENTS.json and all production SoRs are read-only. Use a /tmp fixture; never rewrite live store data.
- No browser/network, publish, messages/forms, money, fake data, or other outbound action.
- Respond in at most 30 lines with exactly these headings: VERDICT, EVIDENCE, FINDINGS, HANDOFF.`;

function boundedAgentPrompt(prompt) {
  return `${String(prompt || DEFAULT_PROMPTS[0]).trim()}\n\n${BOUNDED_AGENT_CONTRACT}`;
}

function ensure() {
  fs.mkdirSync(DIR, { recursive: true });
  fs.chmodSync(DIR, 0o700);
  fs.mkdirSync(INBOX, { recursive: true });
  fs.mkdirSync(path.join(BUSY, 'events-bot'), { recursive: true });
  fs.mkdirSync(path.join(BUSY, 'lead-system'), { recursive: true });
  // Always ensure queue has Events Bot prompts (repave if empty or still funnel-only)
  const needSeed =
    !fs.existsSync(QUEUE) ||
    !fs.readFileSync(QUEUE, 'utf8').includes('EVENTS BOT');
  if (needSeed) {
    fs.writeFileSync(QUEUE, '');
    for (const p of DEFAULT_PROMPTS) {
      fs.appendFileSync(QUEUE, JSON.stringify({ at: new Date().toISOString(), prompt: p }) + '\n');
    }
  }
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

function alive() {
  if (!fs.existsSync(PIDF)) return false;
  try {
    process.kill(Number(fs.readFileSync(PIDF, 'utf8').trim()), 0);
    return true;
  } catch {
    return false;
  }
}

function run(args, timeout = 180000) {
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    maxBuffer: 8 * 1024 * 1024,
    env: process.env,
  });
  return { status: r.status ?? 1, out: (r.stdout || '').slice(-3000), err: (r.stderr || '').slice(-1000) };
}

function runSh(cmd, args, timeout = 300000) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    maxBuffer: 8 * 1024 * 1024,
    env: process.env,
  });
  return { status: r.status ?? 1, out: (r.stdout || '').slice(-3000), err: (r.stderr || '').slice(-1000) };
}

/** Funnel-loop owns full local spine when healthy — avoid double selftest/pipeline thrash. */
function funnelLoopHealthy(maxAgeSec = 180) {
  try {
    const hb = readJson(path.join(BUSY, 'funnel-loop', 'heartbeat.json'), null);
    if (!hb?.at) return false;
    const age = (Date.now() - Date.parse(hb.at)) / 1000;
    if (!Number.isFinite(age) || age > maxAgeSec) return false;
    // Prefer green heartbeat; stale red still means funnel-loop is the owner
    return true;
  } catch {
    return false;
  }
}

function funnelLoopPidAlive() {
  try {
    const p = fs.readFileSync(path.join(BUSY, 'funnel-loop', 'funnel-loop.pid'), 'utf8').trim();
    process.kill(Number(p), 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deterministic work.
 * - When funnel-loop is UP + recent heartbeat: light tick only (status + feed support).
 * - When funnel-loop is DOWN: full spine (selftest + pipeline stages).
 */
function localTick(cycle) {
  const results = {};
  const peer = funnelLoopPidAlive() && funnelLoopHealthy();

  if (peer) {
    // Funnel-loop owns lead spine + full events selftest each cycle.
    // De-dupe thrash: run events selftest every 3 cycles here as canary only (soft).
    const runEvSt = cycle % 3 === 0;
    if (runEvSt) {
      results.eventsSelftest = runSh(
        'env',
        ['DEMIGOD_EVENTS_BOT_MOCK=1', process.execPath, path.join(ROOT, 'demigod-events-bot-selftest.mjs')],
        90000,
      );
      if ((results.eventsSelftest.status ?? 1) !== 0) {
        log(`eventsSelftest soft-fail (funnel-loop is gate) status=${results.eventsSelftest.status}`);
      }
    } else {
      results.eventsSelftest = {
        status: 0,
        out: 'skipped (funnel-loop owns selftest; canary every 3 cycles here)',
      };
    }
    results.status = run(['demigod-funnel.mjs', 'status'], 30000);
    // FOCUS #1: public API heal ladder (status exit 2 = local ok / public dead)
    results.eventsOnline = run(['demigod-events-online.mjs', 'status'], 45000);
    if ((results.eventsOnline.status ?? 1) !== 0) {
      log(
        `eventsOnline needHeal status=${results.eventsOnline.status} — running heal`,
      );
      results.eventsHeal = run(['demigod-events-online.mjs', 'heal'], 180000);
    }
    // FOCUS #2: absorb human Partiful/Luma URLs (soft — never invent RSVPs)
    results.inviteDrain = run(['demigod-events-invite-drain.mjs'], 60000);
    if ((results.inviteDrain.status ?? 1) !== 0) {
      log(`inviteDrain soft-fail status=${results.inviteDrain.status}`);
    }
    const eventsPublicOk =
      (results.eventsOnline.status ?? 1) === 0 ||
      (results.eventsHeal && (results.eventsHeal.status ?? 1) === 0);
    results.mode = {
      status: 0,
      out: eventsPublicOk
        ? 'events focus + light funnel status + online ok'
        : 'events focus + light funnel status + online needHeal',
    };
    // Tick ok: funnel status + public health. Events selftest is soft under peer (gate is funnel-loop).
    const ok = (results.status.status ?? 1) === 0 && eventsPublicOk;
    writeJson(path.join(DIR, 'local-latest.json'), {
      cycle,
      at: new Date().toISOString(),
      ok,
      mode: 'events-light',
      peer: 'funnel-loop',
      focus: 'events-bot',
      eventsPublicOk,
      eventsSelftestCanary: runEvSt,
      results: Object.fromEntries(
        Object.entries(results).map(([k, v]) => [k, { status: v.status, tail: (v.out || v.err || '').slice(-200) }]),
      ),
    });
    log(
      `localTick cycle=${cycle} ok=${ok} mode=events-light eventsPublicOk=${eventsPublicOk} evStCanary=${runEvSt}`,
    );
    return { ok, results, mode: 'events-light' };
  }

  results.selftest = run(['demigod-funnel-selftest.mjs'], 90000);
  results.policy = run(['demigod-outreach-policy.mjs', 'selftest'], 30000);
  results.revenue = run(['demigod-revenue.mjs', 'selftest'], 30000);
  results.status = run(['demigod-funnel.mjs', 'status'], 30000);
  results.join = run(['demigod-funnel.mjs', 'join'], 60000);
  results.followup = run(['demigod-funnel.mjs', 'followup', '--days=5'], 60000);
  results.replies = run(['demigod-replies-ingest.mjs'], 90000);
  results.intro = run(['demigod-funnel.mjs', 'intro'], 60000);
  // FOCUS #5 path: pilot/invoice report-only (no --apply / no invent cash)
  results.pilot = run(['demigod-funnel.mjs', 'pilot'], 60000);
  results.invoice = run(['demigod-funnel.mjs', 'invoice'], 30000);
  results.hygiene = run(['demigod-funnel.mjs', 'hygiene'], 60000);
  results.pairSync = run(['demigod-funnel.mjs', 'pair-sync'], 60000);

  // rotate pipeline stages (includes pilot/invoice spine)
  const stages = [
    'policy',
    'join',
    'followup',
    'match',
    'replies',
    'intro',
    'pilot',
    'invoice',
    'selftest',
  ];
  const st = stages[cycle % stages.length];
  results.pipeline = run(['demigod-lead-pipeline.mjs', 'tick', `--stage=${st}`], 180000);

  // every 4 cycles: draft more leads (approve stays human-only — Trust Ladder L1)
  if (cycle % 4 === 0) {
    results.draft = run(['demigod-funnel-loop.mjs', 'once-draft'], 120000);
  }

  const ok = Object.values(results).every((r) => (r.status ?? 1) === 0);
  writeJson(path.join(DIR, 'local-latest.json'), {
    cycle,
    at: new Date().toISOString(),
    ok,
    mode: 'full',
    peer: null,
    results: Object.fromEntries(
      Object.entries(results).map(([k, v]) => [k, { status: v.status, tail: (v.out || v.err || '').slice(-200) }]),
    ),
  });
  log(`localTick cycle=${cycle} ok=${ok} mode=full stages=${Object.keys(results).join(',')}`);
  return { ok, results, mode: 'full' };
}

function popQueuePrompt() {
  if (!fs.existsSync(QUEUE)) return DEFAULT_PROMPTS[0];
  const lines = fs.readFileSync(QUEUE, 'utf8').split('\n').filter(Boolean);
  if (!lines.length) {
    // refill
    for (const p of DEFAULT_PROMPTS) {
      fs.appendFileSync(QUEUE, JSON.stringify({ at: new Date().toISOString(), prompt: p }) + '\n');
    }
    return DEFAULT_PROMPTS[0];
  }
  const first = lines[0];
  fs.writeFileSync(QUEUE, lines.slice(1).join('\n') + (lines.length > 1 ? '\n' : ''));
  try {
    return JSON.parse(first).prompt || DEFAULT_PROMPTS[0];
  } catch {
    return first;
  }
}

/** Feed grok-inbox so swarm-drainer@grok has continuous work. */
function feedInbox(n = 2) {
  ensure();
  const pending = fs.readdirSync(INBOX).filter((f) => f.endsWith('.req') || f.endsWith('.run')).length;
  let added = 0;
  while (pending + added < n) {
    const prompt = popQueuePrompt();
    // push prompt back so queue doesn't empty permanently
    fs.appendFileSync(QUEUE, JSON.stringify({ at: new Date().toISOString(), prompt }) + '\n');
    const id = `funnel-${Date.now().toString(36)}-${added}`;
    const tmp = path.join(INBOX, `${id}.tmp`);
    const req = path.join(INBOX, `${id}.req`);
    fs.writeFileSync(tmp, boundedAgentPrompt(prompt) + '\n');
    fs.renameSync(tmp, req);
    added++;
    log(`fed inbox ${id}`);
  }
  return { pending: pending + added, added };
}

function grokDrainerAlive() {
  // prefer systemd; fall back to pid file
  const r = spawnSync('systemctl', ['--user', 'is-active', 'swarm-drainer@grok.service'], {
    encoding: 'utf8',
  });
  if ((r.stdout || '').trim() === 'active') return true;
  try {
    const p = fs.readFileSync(path.join(BUSY, 'grok-drainer.pid'), 'utf8').trim();
    process.kill(Number(p), 0);
    return true;
  } catch {
    return false;
  }
}

function countGrokAsk() {
  const r = spawnSync('bash', ['-lc', "pgrep -fc 'grok -p|bin/grok-ask' || true"], {
    encoding: 'utf8',
  });
  return Number((r.stdout || '0').trim()) || 0;
}

/**
 * Agent tick: prefer swarm-drainer@grok inbox (one worker).
 * Only call grok-ask directly if drainer is down AND fewer than 1 grok-ask already running.
 */
function agentTick(cycle) {
  const prompt = popQueuePrompt();
  fs.appendFileSync(QUEUE, JSON.stringify({ at: new Date().toISOString(), prompt }) + '\n');
  log(`agentTick start cycle=${cycle}`);

  const feed = feedInbox(2);
  if (grokDrainerAlive()) {
    log(`agentTick via inbox (drainer up) pending≈${feed.pending}`);
    return { mode: 'inbox', ...feed };
  }

  if (countGrokAsk() >= 1) {
    log('agentTick skip direct — grok-ask already running');
    return { mode: 'skip-busy', ...feed };
  }

  const outFile = path.join(DIR, `agent-c${cycle}.txt`);
  const r = runSh(
    'timeout',
    [String(process.env.GROK_BUSY_AGENT_TIMEOUT || 360), path.join(ROOT, 'bin/grok-ask'), boundedAgentPrompt(prompt)],
    Number(process.env.GROK_BUSY_AGENT_TIMEOUT || 360) * 1000 + 10000,
  );
  fs.writeFileSync(outFile, (r.out || '') + '\n' + (r.err || ''));
  if ((r.out || '').length > 80) {
    fs.writeFileSync(path.join(DIR, 'LAST.md'), `# Grok busy cycle ${cycle}\n\n${r.out}\n`);
  }
  log(`agentTick direct exit=${r.status} outlen=${(r.out || '').length}`);
  return { mode: 'direct', status: r.status, outlen: (r.out || '').length, outFile, ...feed };
}

async function cycleOnce(state) {
  state.cycles = (state.cycles || 0) + 1;
  const cycle = state.cycles;
  log(`CYCLE ${cycle} begin`);
  const local = localTick(cycle);
  state.lastLocalOk = local.ok;

  const agentEvery = state.agentEvery || 2;
  if (cycle % agentEvery === 0) {
    try {
      state.lastAgent = agentTick(cycle);
    } catch (e) {
      log(`agentTick error: ${e.message || e}`);
      state.lastAgent = { error: String(e.message || e) };
    }
  } else {
    // still keep inbox warm
    state.lastFeed = feedInbox(1);
  }

  state.lastAt = new Date().toISOString();
  writeJson(STATE, state);
  writeJson(path.join(DIR, 'latest.json'), {
    cycle,
    at: state.lastAt,
    localOk: local.ok,
    agent: state.lastAgent || null,
    feed: state.lastFeed || null,
    focus: FOCUS,
  });
  log(`CYCLE ${cycle} end localOk=${local.ok}`);
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
  const sleepSec = opts.sleepSec ?? Number(process.env.GROK_BUSY_SLEEP_SEC || 30);
  const agentEvery = opts.agentEvery ?? Number(process.env.GROK_BUSY_AGENT_EVERY || 2);

  let state = readJson(STATE, { schema: 'demigod.grok-busy/1', cycles: 0 });
  state.startedAt = new Date().toISOString();
  state.running = true;
  state.agentEvery = agentEvery;
  writeJson(STATE, state);
  log(`loop start sleep=${sleepSec}s agentEvery=${agentEvery}`);

  const cleanup = () => {
    try {
      fs.rmSync(PIDF, { force: true });
    } catch {
      /* */
    }
  };
  process.on('exit', cleanup);
  process.on('SIGTERM', () => {
    fs.writeFileSync(STOP, new Date().toISOString());
    process.exit(0);
  });

  while (!fs.existsSync(STOP) && !fs.existsSync(GSTOP)) {
    try {
      state = await cycleOnce(state);
    } catch (e) {
      log(`cycle error: ${e.message || e}`);
    }
    const end = Date.now() + sleepSec * 1000;
    while (Date.now() < end && !fs.existsSync(STOP) && !fs.existsSync(GSTOP)) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  state.running = false;
  state.stoppedAt = new Date().toISOString();
  writeJson(STATE, state);
  cleanup();
  log('loop stopped');
}

function cmdStatus() {
  ensure();
  const state = readJson(STATE);
  const stop = fs.existsSync(STOP) || fs.existsSync(GSTOP);
  const stateAgeSec = state?.lastAt ? (Date.now() - Date.parse(state.lastAt)) / 1000 : Infinity;
  // ponytail: sandbox PID namespaces hide the host PID; a fresh cycle receipt is the bounded fallback.
  const running = alive() || (!stop && fs.existsSync(PIDF) && stateAgeSec < Number(process.env.GROK_BUSY_SLEEP_SEC || 90) + 120);
  console.log(
    JSON.stringify(
      {
        ok: true,
        running,
        pid: running ? fs.readFileSync(PIDF, 'utf8').trim() : null,
        stop,
        state: state ? { ...state, running } : null,
        latest: readJson(path.join(DIR, 'latest.json')),
        inboxPending: fs.readdirSync(INBOX).filter((f) => f.endsWith('.req')).length,
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

function cmdFeed() {
  ensure();
  console.log(JSON.stringify({ ok: true, ...feedInbox(3) }, null, 2));
}

function cmdSelftest() {
  const generated = boundedAgentPrompt(DEFAULT_PROMPTS[0]);
  const required = [
    'at most 120 seconds',
    'Open at most 2 task files',
    'edit at most 1 unclaimed file',
    'Run at most 1 focused file-level check',
    'DEMIGOD-EVENTS.json and all production SoRs are read-only',
    'No browser/network, publish, messages/forms, money',
    'VERDICT, EVIDENCE, FINDINGS, HANDOFF',
  ];
  if (!required.every((text) => generated.includes(text))) throw new Error('bounded agent prompt selftest failed');
  console.log(JSON.stringify({ ok: true, check: 'bounded-agent-prompt', workBudgetSec: 120 }));
}

async function cmdOnce() {
  ensure();
  let state = readJson(STATE, { cycles: 0, agentEvery: 1 });
  state = await cycleOnce(state);
  writeJson(STATE, state);
  console.log(JSON.stringify({ ok: true, cycle: state.cycles, localOk: state.lastLocalOk }, null, 2));
}

const rawArgs = process.argv.slice(2);
for (const a of rawArgs) {
  if (!a.startsWith('-')) continue;
  if (a.startsWith('--sleep-sec=') || a.startsWith('--agent-every=')) continue;
  if (a === '--help' || a === '-h') {
    console.log('usage: run|status|stop|once|feed|selftest [--sleep-sec=30] [--agent-every=2]');
    process.exit(0);
  }
  console.error(
    `grok-busy: unknown argument ${a} — try: demigod-grok-busy-loop.mjs run|status|stop|once|feed|selftest [--sleep-sec=30] [--agent-every=2]`,
  );
  process.exit(2);
}
const positionals = rawArgs.filter((a) => !a.startsWith('-'));
const cmd = positionals[0] || 'status';
if (positionals.length > 1) {
  console.error(
    `grok-busy: unknown argument ${positionals[1]} — try: demigod-grok-busy-loop.mjs ${cmd} [--sleep-sec=30] [--agent-every=2]`,
  );
  process.exit(2);
}
const sleepArg = rawArgs.find((a) => a.startsWith('--sleep-sec='));
const everyArg = rawArgs.find((a) => a.startsWith('--agent-every='));
const opts = {
  sleepSec: sleepArg ? Number(sleepArg.split('=')[1]) : undefined,
  agentEvery: everyArg ? Number(everyArg.split('=')[1]) : undefined,
};

if (cmd === 'run' || cmd === 'start') {
  runLoop(opts).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else if (cmd === 'status') cmdStatus();
else if (cmd === 'stop') cmdStop();
else if (cmd === 'feed') cmdFeed();
else if (cmd === 'once') cmdOnce();
else if (cmd === 'selftest') cmdSelftest();
else {
  console.error('usage: run|status|stop|once|feed|selftest [--sleep-sec=30] [--agent-every=2]');
  process.exit(2);
}
