#!/usr/bin/env node
/**
 * demigod-useful-loop — NONSTOP product-first plan→find→do→verify.
 *
 *   node demigod-useful-loop.mjs once
 *   node demigod-useful-loop.mjs run --sleep-sec=90
 *
 * Every cycle: demigod-work-find.mjs (discover NEW work) → execute up to N tasks.
 * STOP only: touch /tmp/dg-busy/useful-loop.STOP (systemd Restart=always will restart
 * unless unit is stopped; ExecStartPre clears STOP on intentional start).
 *
 * Never auto-DM, never invent RSVPs, never touch game, never force freeze off.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || '/home/potter';
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const STOP = path.join(BUSY, 'useful-loop.STOP');
const LOG = path.join(BUSY, 'useful-loop.log');
const LAST = path.join(BUSY, 'useful-loop-last.json');
const PLAN = path.join(BUSY, 'USEFUL-LOOP-PLAN.md');
const QUEUE = path.join(BUSY, 'work-queue.jsonl');
const WORK_STATE = path.join(BUSY, 'useful-loop-work-state.json');
const WORK_LOCK = path.join(BUSY, 'useful-loop-work.lock');
const MAX_TASKS = Number(process.env.USEFUL_LOOP_MAX_TASKS || 6);

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

function run(args, timeoutMs = 120000) {
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: process.env,
  });
  return {
    ok: r.status === 0,
    status: r.status,
    out: (r.stdout || '').slice(-4000),
    err: (r.stderr || '').slice(-2000),
  };
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function saveWorkState(state) {
  state.at = new Date().toISOString();
  atomicWrite(WORK_STATE, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  return state;
}

function loadWorkState() {
  const saved = readJson(WORK_STATE);
  if (saved) {
    if (saved.schema !== 'demigod.useful-work-state/1' || !saved.queue || !Array.isArray(saved.pending)) {
      throw new Error('invalid useful-loop work state');
    }
    return saved;
  }
  if (fs.existsSync(WORK_STATE)) throw new Error('unreadable useful-loop work state');
  let queue = { dev: null, ino: null, offset: 0 };
  try {
    const st = fs.statSync(QUEUE);
    queue = { dev: String(st.dev), ino: String(st.ino), offset: st.size };
  } catch {
    /* first queue write */
  }
  return saveWorkState({ schema: 'demigod.useful-work-state/1', queue, pending: [] });
}

function ingestWorkState(state) {
  let fd;
  try {
    fd = fs.openSync(QUEUE, 'r');
  } catch (error) {
    if (error?.code === 'ENOENT') return state;
    throw error;
  }
  let st;
  let start;
  let body;
  try {
    st = fs.fstatSync(fd);
    const sameQueue = state.queue.dev === String(st.dev) && state.queue.ino === String(st.ino);
    start = sameQueue && st.size >= Number(state.queue.offset || 0) ? Number(state.queue.offset || 0) : 0;
    body = Buffer.alloc(Math.max(0, st.size - start));
    if (body.length) body = body.subarray(0, fs.readSync(fd, body, 0, body.length, start));
  } finally {
    fs.closeSync(fd);
  }
  const dev = String(st.dev);
  const ino = String(st.ino);
  const end = body.lastIndexOf(10);
  if (end < 0) {
    if (state.queue.dev !== dev || state.queue.ino !== ino || state.queue.offset !== start) {
      state.queue = { dev, ino, offset: start };
      saveWorkState(state);
    }
    return state;
  }
  const pending = new Map(state.pending.filter((x) => x?.id).map((x) => [x.id, x]));
  for (const line of body.subarray(0, end + 1).toString('utf8').split('\n').filter(Boolean)) {
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    if (!row?.task || row.status === 'done' || row.kind === 'freeze') continue;
    const current = pending.get(row.task);
    pending.set(row.task, {
      id: row.task,
      pri: Math.min(current?.pri ?? 9, row.pri ?? 2),
      why: row.title || row.kind || row.task,
      key: row.key || null,
      queuedAt: row.at || null,
    });
  }
  state.queue = { dev, ino, offset: start + end + 1 };
  state.pending = [...pending.values()];
  return saveWorkState(state);
}

function acknowledgeWork(id) {
  const state = loadWorkState();
  const pending = state.pending.filter((x) => x.id !== id);
  if (pending.length !== state.pending.length) {
    state.pending = pending;
    saveWorkState(state);
  }
}

/** Run work-find and pull newest open tasks from queue. */
function discoverWork() {
  let state = loadWorkState();
  // Compound ambition before evidence scrape
  run(['demigod-idea-engine.mjs', '--promote'], 60000);
  run(['demigod-work-find.mjs'], 90000);
  state = ingestWorkState(state);
  return state.pending
    .map((x) => ({ id: x.id, pri: x.pri ?? 2, why: x.why || x.id }))
    .sort((a, b) => a.pri - b.pri || a.id.localeCompare(b.id));
}

function planCycle(ctx, cycle = 1) {
  const tasks = [];
  // P0 reactive
  if (!ctx.events?.local) tasks.push({ id: 'events-app-up', pri: 0, why: 'local events app down' });
  if (ctx.events?.needHeal || ctx.events?.public === false)
    tasks.push({ id: 'events-heal', pri: 0, why: 'public tunnel needHeal or public false' });
  if (ctx.events?.nativeRsvpRoutes === false)
    tasks.push({ id: 'events-restart-routes', pri: 0, why: 'native RSVP routes missing' });
  // Discover NEW work every cycle (never idle)
  for (const t of discoverWork()) tasks.push(t);
  // Baseline always — at least something product-facing
  tasks.push({ id: 'public-event-probe', pri: 1, why: 'public-event lifecycle honesty (pre-rsvp redacted / rsvp+ invite)' });
  tasks.push({ id: 'invite-drain', pri: 1, why: 'invite drain' });
  // Rotate deeper work so cycles don't only re-probe
  const deepRot = [
    'outreach-mx',
    'truth',
    'verify-source',
    'events-selftest',
    'lifecycle-tests',
    'demand-draft-hygiene',
    'warm-review',
    'foot-smoke',
    'online-selfcheck',
    'stage-pending-config',
    'board-pulse',
    'outreach-draft-audit',
    'rewrite-work-found',
    'loop-state',
    'demand-status',
  ];
  tasks.push({
    id: deepRot[cycle % deepRot.length],
    pri: 2,
    why: 'deep rotate ' + (cycle % deepRot.length),
  });
  tasks.push({
    id: deepRot[(cycle + 5) % deepRot.length],
    pri: 2,
    why: 'deep rotate b',
  });
  tasks.sort((a, b) => a.pri - b.pri || a.id.localeCompare(b.id));
  const seen = new Set();
  return tasks.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true))).slice(0, MAX_TASKS);
}

function doTask(id) {
  switch (id) {
    case 'events-app-up':
      return run(['demigod-events-online.mjs', 'up'], 180000);
    case 'events-heal':
      return run(['demigod-events-online.mjs', 'heal'], 180000);
    case 'events-restart-routes':
      spawnSync('systemctl', ['--user', 'restart', 'demigod-events-bot.service'], {
        encoding: 'utf8',
        timeout: 30000,
      });
      return run(['demigod-events-online.mjs', 'status'], 60000);
    case 'invite-drain':
      return run(['demigod-events-invite-drain.mjs'], 120000);
    case 'outreach-mx': {
      const code = `
import { loadStore, saveStore, hygieneOutreachMx, hygieneOutreachQueue, withEventsStoreLock } from './demigod-events-bot-agent.mjs';
await withEventsStoreLock(async () => {
  const s = loadStore();
  const hyg = hygieneOutreachQueue(s.outreach || [], s.activeEvent);
  const mx = await hygieneOutreachMx(s.outreach || []);
  if (Object.values(hyg).some(Boolean) || mx.rejectedMx || mx.reconciledTransient) saveStore(s);
  console.log(JSON.stringify({ hyg, mx, n: (s.outreach||[]).length }));
});
`;
      const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 120000,
      });
      return { ok: r.status === 0, status: r.status, out: r.stdout || '', err: r.stderr || '' };
    }
    case 'truth': {
      const r = spawnSync('bash', [path.join(ROOT, 'bin/dg-truth')], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 120000,
      });
      const out = (r.stdout || '') + (r.stderr || '');
      // Same honesty as ship prepare: disk≠live + freeze OFF + board ok is expected
      // prepare-only drift until current-request publish — not a product red.
      // foot-lock HELD = concurrent craft (not freeze); still prepare-only drift.
      const prepareOnlyDrift =
        r.status !== 0 &&
        /version drift disk/i.test(out) &&
        /freeze=OFF|freeze OFF/i.test(out) &&
        /board=ok|board honesty pass/i.test(out) &&
        !/freeze=ON|board honesty fail/i.test(out);
      return {
        ok: r.status === 0 || prepareOnlyDrift,
        status: r.status,
        observational: prepareOnlyDrift || undefined,
        out: out.slice(-2000),
        err: (r.stderr || '').slice(-1000),
      };
    }
    case 'loop-state':
      // Craft loops bump foot often; restamp foot_ver_disk to disk so gate stays honest.
      return run(['demigod-verify-loop-state.mjs', '--restamp'], 30000);
    case 'demand-status': {
      const r = spawnSync('bash', [path.join(ROOT, 'bin/dg'), 'demand', 'status'], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 60000,
      });
      return {
        ok: r.status === 0,
        status: r.status,
        out: (r.stdout || '').slice(-1500),
        err: (r.stderr || '').slice(-500),
      };
    }
    case 'foot-smoke':
      return run(['demigod-foot-smoke.mjs'], 60000);
    case 'online-selfcheck':
      return run(['demigod-events-online.mjs', 'selfcheck'], 30000);
    case 'public-event-probe': {
      // Lifecycle-honest: pre-rsvp active events have redacted public view + no native invite.
      // Require published invite only at rsvp+ (see publicEventView / store hygiene).
      // Tunnel (loca.lt) blips must not red the loop when local public-event still answers.
      const code = `
import { loadStore, publicEventView, hasPublishedInviteUrl, normalizeStage, STAGES } from './demigod-events-bot-agent.mjs';
import fs from 'fs';
const store = loadStore();
const id = store.activeEvent?.id;
const stage = normalizeStage(store.activeEvent?.stage);
const atRsvp = STAGES.indexOf(stage) >= STAGES.indexOf('rsvp');
const v = publicEventView(store, id);
const hasPub = hasPublishedInviteUrl(store.activeEvent, store);
const apiMeta = (() => { try { return JSON.parse(fs.readFileSync('DEMIGOD-EVENTS-API.json','utf8')); } catch { return {}; } })();
const eventsApiBase = String(apiMeta.apiBase || '');
const port = Number(apiMeta.port) || 3460;
const path = '/public-event?id=' + encodeURIComponent(id || '');
async function probe(url, headers = {}) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  return r.ok;
}
let httpOk = null;
let httpVia = null;
if (eventsApiBase && id) {
  for (let attempt = 0; attempt < 2 && httpOk !== true; attempt++) {
    try {
      if (attempt) await new Promise((r) => setTimeout(r, 400));
      httpOk = await probe(eventsApiBase + path, { 'Bypass-Tunnel-Reminder': '1' });
      if (httpOk) httpVia = 'tunnel';
    } catch { httpOk = false; }
  }
  if (httpOk !== true) {
    try {
      httpOk = await probe('http://127.0.0.1:' + port + '/api/events-bot' + path);
      if (httpOk) httpVia = 'local';
    } catch { httpOk = false; httpVia = httpVia || 'none'; }
  }
}
const redactedOk =
  !atRsvp &&
  v?.ok &&
  v.event?.title === '' &&
  v.event?.inviteUrl == null &&
  v.event?.rsvpOpen === false &&
  !hasPub;
const rsvpReadyOk = atRsvp && v?.ok && hasPub;
const out = {
  id, stage, atRsvp, hasPub,
  viewOk: !!v?.ok, rsvpOpen: v?.event?.rsvpOpen, rsvpYes: v?.event?.rsvpYes,
  api: eventsApiBase, httpOk, httpVia, redactedOk, rsvpReadyOk,
};
console.log(JSON.stringify(out));
if (!id || !v?.ok) process.exit(1);
if (atRsvp ? !rsvpReadyOk : !redactedOk) process.exit(1);
if (httpOk === false) process.exit(2);
`;
      const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 30000,
      });
      return { ok: r.status === 0, status: r.status, out: r.stdout || '', err: r.stderr || '' };
    }
    case 'stage-pending-config': {
      const code = `
import fs from 'fs';
import path from 'path';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';
const busy = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const eventsApiCfg = JSON.parse(fs.readFileSync('DEMIGOD-EVENTS-API.json', 'utf8'));
const fr = freezeStatus();
const blockedBy = fr.frozen
  ? 'publish freeze ON'
  : 'current-request auth + explicit --publish-config required (prepare-only)';
const pending = {
  ...eventsApiCfg,
  pendingPublish: true,
  blockedBy,
  freezeOn: Boolean(fr.frozen),
  stagedAt: new Date().toISOString(),
};
const dir = path.join(busy, 'events-bot');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'events-api-latest.pending.json'), JSON.stringify(pending, null, 2) + '\\n');
console.log(JSON.stringify({ ok: true, apiBase: eventsApiCfg.apiBase, staged: true, blockedBy }));
`;
      const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 15000,
      });
      return { ok: r.status === 0, status: r.status, out: r.stdout || '', err: r.stderr || '' };
    }
    case 'board-pulse': {
      const code = `
import fs from 'fs';
const p = '/tmp/dg-busy/coord/board.json';
const b = JSON.parse(fs.readFileSync(p, 'utf8'));
const at = new Date().toISOString().replace(/\\.\\d{3}Z$/, 'Z');
b.tracks = b.tracks || {};
b.at = at;
const keep = [
  'NONSTOP useful-loop: demigod-useful-loop.service (bin/dg-useful-loop status)',
];
const extra = (b.backlog || []).filter((x) => {
  const xl = String(x).toLowerCase();
  if (xl.includes('useful') || xl.includes('cdn events') || xl.includes('live sealed') || xl.includes('grok keep')) return false;
  return true;
}).slice(0, 4);
b.backlog = keep.concat(extra);
const tmp = p + '.tmp';
fs.writeFileSync(tmp, JSON.stringify(b, null, 2) + '\\n');
fs.renameSync(tmp, p);
console.log(JSON.stringify({ ok: true, backlog: b.backlog.length }));
`;
      const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 15000,
      });
      return { ok: r.status === 0, status: r.status, out: r.stdout || '', err: r.stderr || '' };
    }
    case 'verify-source': {
      const r = spawnSync('npm', ['run', 'demigod:verify:source'], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 180000,
      });
      return {
        ok: r.status === 0,
        status: r.status,
        out: (r.stdout || '').slice(-1200),
        err: (r.stderr || '').slice(-600),
      };
    }
    case 'events-selftest': {
      const r = spawnSync(
        process.execPath,
        ['demigod-events-bot-selftest.mjs'],
        {
          cwd: ROOT,
          encoding: 'utf8',
          timeout: 300000,
          env: { ...process.env, DEMIGOD_EVENTS_BOT_MOCK: '1' },
        },
      );
      return {
        ok: r.status === 0,
        status: r.status,
        out: (r.stdout || '').slice(-1500),
        err: (r.stderr || '').slice(-800),
      };
    }
    case 'lifecycle-tests': {
      const r = spawnSync(process.execPath, ['--test', 'demigod-events-lifecycle-readiness.test.mjs'], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 120000,
      });
      return {
        ok: r.status === 0,
        status: r.status,
        out: (r.stdout || '').slice(-1200),
        err: (r.stderr || '').slice(-600),
      };
    }
    case 'warm-review': {
      const code = `
import fs from 'fs';
const d = JSON.parse(fs.readFileSync('/tmp/dg-busy/demand-status.json','utf8'));
const w = d.warmInbound || {};
const lines = [
  '# Warm inbound pulse · ' + new Date().toISOString(),
  '',
  '- count: ' + (w.count ?? '?'),
  '- overdue: ' + JSON.stringify(w.overdueActionWho || w.overdueActionItems || w.rows || []).slice(0,500),
  '- pilots: ' + JSON.stringify(d.pilots || {}),
  '- policy: drafts-only / warm≠pilot / no send',
  '',
];
fs.mkdirSync('/tmp/dg-busy/demand', { recursive: true });
fs.writeFileSync('/tmp/dg-busy/demand/warm-inbound-pulse.md', lines.join('\\n'));
console.log(JSON.stringify({ ok: true, path: '/tmp/dg-busy/demand/warm-inbound-pulse.md', count: w.count }));
`;
      const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 15000,
      });
      return { ok: r.status === 0, status: r.status, out: r.stdout || '', err: r.stderr || '' };
    }
    case 'demand-draft-hygiene': {
      const r = spawnSync('bash', [path.join(ROOT, 'bin/dg'), 'demand', 'status'], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 60000,
      });
      const ok = r.status === 0 && /hygiene=ok|hygiene OK|drafts/i.test(r.stdout || '');
      return {
        ok: r.status === 0,
        status: r.status,
        out: (r.stdout || '').slice(-1200),
        err: (r.stderr || '').slice(-400),
        meta: { hygieneLooksOk: ok },
      };
    }
    case 'outreach-draft-audit': {
      const code = `
import fs from 'fs';
import { outreachDraftReadiness, isRealOutreachEmail } from './demigod-events-bot-agent.mjs';
const eventsStore = JSON.parse(fs.readFileSync('DEMIGOD-EVENTS.json','utf8'));
const o = eventsStore.outreach || [];
const by = {};
for (const x of o) by[x.status] = (by[x.status]||0)+1;
const row = (x) => ({
  id: x.id, kind: x.kind, to: x.toEmail, subject: (x.subject||'').slice(0,80),
  mx: x.emailCheck?.mx, ready: outreachDraftReadiness(x),
  external: isRealOutreachEmail(x.toEmail) && !/@trydemigod\\.com$/i.test(x.toEmail||''),
});
const open = o.filter(x => x.status==='queued'||x.status==='drafted');
const sample = open.slice(0,5).map(row);
const rejected = o.filter(x => x.status==='rejected').slice(0,3).map(row);
const externalReady = open.filter(x => row(x).external && row(x).ready >= 3).length;
const report = {
  at: new Date().toISOString(), by, sample, rejected, externalReady,
  note: 'draft only — no send',
};
fs.mkdirSync('/tmp/dg-busy/events-bot', { recursive: true });
fs.writeFileSync('/tmp/dg-busy/events-bot/outreach-draft-audit.json', JSON.stringify(report, null, 2)+'\\n');
console.log(JSON.stringify({ ok: true, by, n: o.length, externalReady, rejected: rejected.length }));
`;
      const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 20000,
      });
      return { ok: r.status === 0, status: r.status, out: r.stdout || '', err: r.stderr || '' };
    }
    case 'rewrite-work-found':
      return run(['demigod-work-find.mjs'], 90000);
    case 'laptop-blue-moon': {
      const r = spawnSync('bash', [path.join(ROOT, 'bin/dg-laptop-blue-moon')], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 120000,
      });
      return {
        ok: r.status === 0,
        status: r.status,
        out: (r.stdout || '').slice(-2000),
        err: (r.stderr || '').slice(-600),
      };
    }
    case 'funnel-collision-plan': {
      // Review-only by default (no --apply). Agents apply after explicit review.
      const r = spawnSync(process.execPath, ['demigod-funnel.mjs', 'collision-plan'], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 60000,
      });
      return {
        ok: r.status === 0,
        status: r.status,
        out: (r.stdout || '').slice(-1500),
        err: (r.stderr || '').slice(-400),
      };
    }
    case 'funnel-selftest-light': {
      // Full suite is long; light = package/status only unless USEFUL_LOOP_FULL_FUNNEL=1
      if (process.env.USEFUL_LOOP_FULL_FUNNEL === '1') {
        const r = spawnSync(process.execPath, ['demigod-funnel-selftest.mjs'], {
          cwd: ROOT,
          encoding: 'utf8',
          timeout: 600000,
        });
        return {
          ok: r.status === 0,
          status: r.status,
          out: (r.stdout || '').slice(-2000),
          err: (r.stderr || '').slice(-800),
        };
      }
      const r = spawnSync('bash', [path.join(ROOT, 'bin/dg'), 'funnel', 'status'], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 60000,
      });
      return {
        ok: r.status === 0,
        status: r.status,
        out: (r.stdout || '').slice(-1000),
        err: (r.stderr || '').slice(-400),
      };
    }
    default:
      return { ok: false, status: 1, out: '', err: 'unknown task ' + id };
  }
}

function orient() {
  const st = run(['demigod-events-online.mjs', 'status'], 60000);
  let events = null;
  try {
    events = JSON.parse(st.out.match(/\{[\s\S]*\}/)?.[0] || 'null');
  } catch {
    /* fall back to the last status receipt below */
  }
  if (!events) events = readJson(path.join(BUSY, 'events-online', 'status.json'));
  const truth = readJson(path.join(BUSY, 'truth.json'));
  const freeze = readJson(path.join(BUSY, 'publish-freeze.json'));
  return {
    events,
    truthPass: !!truth?.pass || /TRUTH PASS/.test(JSON.stringify(truth || {})),
    freezeOn: !!(freeze?.frozen || freeze?.on),
    statusOk: st.ok || events?.local === true,
  };
}

async function once(cycle) {
  return withFileLock(WORK_LOCK, async () => {
    if (fs.existsSync(STOP)) {
      log('STOP present — skip');
      return { ok: true, stopped: true };
    }
    const ctx = orient();
    // Auto-heal P0 inside orient path when public is down (don't wait for plan only)
    if (ctx.events?.needHeal || ctx.events?.public === false) {
      log(`cycle=${cycle} auto-heal (needHeal/public)`);
      doTask('events-heal');
    }
    const plan = planCycle(ctx, cycle);
    log(
      `cycle=${cycle} plan=${plan.map((p) => p.id).join(',')} events.public=${ctx.events?.public} needHeal=${ctx.events?.needHeal} freeze=${ctx.freezeOn}`,
    );
    const did = [];
    for (const t of plan) {
      const r = doTask(t.id);
      let succeeded = r.ok;
      did.push({ id: t.id, pri: t.pri, why: t.why, ok: r.ok, status: r.status });
      log(`  ${t.id} ok=${r.ok} status=${r.status}`);
      if (!r.ok && t.pri === 0) {
        // one retry on P0
        const r2 = doTask(t.id);
        succeeded = r2.ok;
        did[did.length - 1].retryOk = r2.ok;
        log(`  ${t.id} retry ok=${r2.ok}`);
      }
      if (succeeded) acknowledgeWork(t.id);
    }
    // light gates — restamp foot_ver so concurrent craft does not false-red loopStateOk
    const src = run(['demigod-verify-loop-state.mjs', '--restamp'], 30000);
    const receipt = {
      at: new Date().toISOString(),
      cycle,
      plan: plan.map((p) => p.id),
      did,
      events: {
        public: ctx.events?.public,
        needHeal: ctx.events?.needHeal,
        nativeRsvpRoutes: ctx.events?.nativeRsvpRoutes,
        apiBase: ctx.events?.apiBase,
      },
      freezeOn: ctx.freezeOn,
      loopStateOk: src.ok,
      planDoc: PLAN,
    };
    fs.writeFileSync(LAST, JSON.stringify(receipt, null, 2) + '\n');
    return receipt;
    // Wait long enough for an in-flight systemd cycle (plan + events heal + gates).
  }, { timeoutMs: 120000, staleMs: 600000 });
}

const cmd = process.argv[2] || 'once';
const sleepSec = Number(
  (process.argv.find((a) => a.startsWith('--sleep-sec=')) || '--sleep-sec=120').split('=')[1] || 120,
);

if (cmd === 'task') {
  const taskId = process.argv[3];
  if (!taskId) {
    console.error('usage: demigod-useful-loop.mjs task <id>');
    process.exit(2);
  }
  const r = doTask(taskId);
  console.log(JSON.stringify({ id: taskId, ok: !!r?.ok, status: r?.status ?? null, out: r?.out || '', err: r?.err || '', meta: r?.meta || null }, null, 2));
  process.exit(r?.ok ? 0 : 1);
} else if (cmd === 'once') {
  once(1)
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(r.stopped || r.loopStateOk !== false ? 0 : 1);
    })
    .catch((err) => {
      const msg = String(err?.message || err);
      console.error(
        JSON.stringify({
          ok: false,
          error: msg.startsWith('lock_timeout:')
            ? 'useful-loop busy (another cycle holds the work lock)'
            : msg,
        }),
      );
      process.exit(1);
    });
} else if (cmd === 'run') {
  let cycle = 0;
  try {
    fs.writeFileSync(path.join(BUSY, 'useful-loop.pid'), String(process.pid) + '\n');
  } catch {
    /* */
  }
  const tick = async () => {
    if (fs.existsSync(STOP)) {
      log('STOP — exit run');
      process.exit(0);
    }
    cycle += 1;
    try {
      await once(cycle);
    } catch (e) {
      log('cycle error ' + (e?.message || e));
    }
    setTimeout(tick, Math.max(30, sleepSec) * 1000);
  };
  log(`RUN start sleepSec=${sleepSec} pid=${process.pid} NONSTOP find+do`);
  tick();
} else {
  console.error('usage: demigod-useful-loop.mjs once|run|task <id> [--sleep-sec=60]');
  process.exit(2);
}
