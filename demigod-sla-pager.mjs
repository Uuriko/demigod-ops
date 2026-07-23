#!/usr/bin/env node
/** Track <2h first-reply SLA on form submissions. Alerts via Slack + local badge JSON. */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { ROOT } from './demigod-turn-lib.mjs';
import { INBOX_PATH as PRODUCTION_INBOX_PATH } from './demigod-submissions-lib.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const SLA_MS = Number(process.env.DEMIGOD_SLA_MS || 120 * 60 * 1000);
const WARN_MS = Number(process.env.DEMIGOD_SLA_WARN_MS || 90 * 60 * 1000);
const POLL_MS = Number(process.env.DEMIGOD_SLA_POLL_MS || 30_000);
const PORT = Number(process.env.DEMIGOD_SLA_PORT || 9878);

export function slaSlackConfig(env = {}) {
  const webhook = env.SLACK_WEBHOOK_URL || env.DEMIGOD_SLACK_WEBHOOK || '';
  return { webhook, authorized: Boolean(webhook) && env.DEMIGOD_ALLOW_SLA_SLACK === '1' };
}

const SLACK = slaSlackConfig(process.env);

export function pagerPaths({ test = false, pid = process.pid } = {}) {
  const testDir = test ? path.join('/tmp/dg-busy/tests', `sla-pager-${pid}`) : '';
  return {
    testDir,
    inbox: testDir ? path.join(testDir, 'inbox.json') : PRODUCTION_INBOX_PATH,
    state: testDir ? path.join(testDir, 'state.json') : path.join(ROOT, 'DEMIGOD-SLA-STATE.json'),
    badge: testDir ? path.join(testDir, 'badge.json') : path.join(ROOT, 'public', 'sla-badge.json'),
    dashboard: testDir ? path.join(testDir, 'dashboard.json') : path.join(ROOT, 'DEMIGOD-SLA-DASHBOARD.json'),
  };
}

const PAGER_PATHS = pagerPaths({ test: process.argv.includes('--test') });
const TEST_DIR = PAGER_PATHS.testDir;
const INBOX_PATH = PAGER_PATHS.inbox;
const STATE_PATH = PAGER_PATHS.state;
const BADGE_PATH = PAGER_PATHS.badge;
const DASH_PATH = PAGER_PATHS.dashboard;

function loadJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

export function saveJson(p, data) {
  const privateFile = p === INBOX_PATH || /^(?:DEMIGOD-SLA-(?:STATE|DASHBOARD)|state|dashboard)\.json$/.test(path.basename(p));
  atomicWrite(p, JSON.stringify(data, null, 2), { mode: privateFile ? 0o600 : null });
}

export async function postSlack(text, { config = SLACK, send = fetch } = {}) {
  if (!config.webhook) return { ok: false, reason: 'no_slack_webhook' };
  if (!config.authorized) return { ok: false, reason: 'outbound_not_authorized' };
  const res = await send(config.webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, unfurl_links: false }),
  });
  return { ok: res.ok, status: res.status };
}

function loadInbox() {
  const inbox = loadJson(INBOX_PATH, { items: [] });
  return inbox.items || [];
}

function computeBadge(state) {
  const closed = (state.history || []).filter((h) => h.repliedAt);
  const times = closed.map((h) => h.replyMs).filter((n) => Number.isFinite(n));
  const avgMs = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  const compliant = times.filter((t) => t <= SLA_MS).length;
  const rate = times.length ? Math.round((compliant / times.length) * 100) : null;
  return {
    at: new Date().toISOString(),
    badge: 'Human reply tracking',
    targetMinutes: SLA_MS / 60_000,
    averageReplyMinutes: avgMs != null ? Math.round(avgMs / 60_000) : null,
    complianceRate: rate,
    openCount: (state.open || []).length,
    sampleSize: times.length,
  };
}

function tick(state) {
  const now = Date.now();
  const inbox = loadInbox();
  const known = new Set((state.open || []).map((o) => o.id).concat((state.history || []).map((h) => h.id)));

  for (const item of inbox) {
    if (known.has(item.id)) continue;
    if (item.status === 'rejected' || item.status === 'spam') continue;
    const entry = {
      id: item.id,
      form: item.form,
      at: item.at,
      receivedAt: new Date(item.at).getTime(),
      warned: false,
      breached: false,
      repliedAt: item.repliedAt || null,
    };
    if (item.repliedAt) {
      entry.repliedAt = item.repliedAt;
      entry.replyMs = new Date(item.repliedAt).getTime() - entry.receivedAt;
      state.history = (state.history || []).slice(-199);
      state.history.push(entry);
    } else {
      state.open = state.open || [];
      state.open.push(entry);
    }
    known.add(item.id);
  }

  const stillOpen = [];
  for (const o of state.open || []) {
    const fresh = inbox.find((i) => i.id === o.id);
    if (fresh?.repliedAt) {
      o.repliedAt = fresh.repliedAt;
      o.replyMs = new Date(fresh.repliedAt).getTime() - o.receivedAt;
      state.history = (state.history || []).slice(-199);
      state.history.push(o);
      continue;
    }
    const elapsed = now - o.receivedAt;
    if (!o.warned && elapsed >= WARN_MS) {
      o.warned = true;
      const msg = `⏱ Demigod SLA warning: ${o.form} submission ${o.id} — ${Math.round(elapsed / 60000)}min without reply (target ${SLA_MS / 60000}min)`;
      console.log(msg);
      postSlack(msg).then((r) => { o.warnSlack = r; });
    }
    if (!o.breached && elapsed >= SLA_MS) {
      o.breached = true;
      const msg = `🚨 Demigod SLA BREACH: ${o.form} ${o.id} — reply NOW (hello@trydemigod.com)`;
      console.log(msg);
      postSlack(msg).then((r) => { o.breachSlack = r; });
    }
    stillOpen.push(o);
  }
  state.open = stillOpen;
  state.at = new Date().toISOString();

  const badge = computeBadge(state);
  saveJson(STATE_PATH, state);
  saveJson(BADGE_PATH, badge);
  saveJson(DASH_PATH, { ...badge, open: state.open, historyCount: (state.history || []).length });
  return { state, badge };
}

function runTest() {
  const testId = `sla-test-${Date.now()}`;
  const inbox = loadJson(INBOX_PATH, { items: [] });
  inbox.items = inbox.items || [];
  inbox.items.unshift({
    id: testId,
    form: 'startup-hire',
    at: new Date().toISOString(),
    status: 'pending',
    raw: { 'role-title': 'SLA test role', 'contact-email': 'test@example.com' },
  });
  saveJson(INBOX_PATH, inbox);

  let state = loadJson(STATE_PATH, { open: [], history: [] });
  const r1 = tick(state);
  state = r1.state;

  console.log(JSON.stringify({
    ok: true,
    mode: 'test',
    testId,
    open: r1.state.open.length,
    badge: r1.badge,
    slackConfigured: !!SLACK.webhook,
    slackAuthorized: SLACK.authorized,
    testDir: TEST_DIR,
  }, null, 2));
}

function markReply(id) {
  const inbox = loadJson(INBOX_PATH, { items: [] });
  const item = (inbox.items || []).find((i) => i.id === id);
  if (!item) {
    console.error(JSON.stringify({ ok: false, error: 'not_found', id }));
    process.exit(1);
  }
  item.repliedAt = new Date().toISOString();
  item.status = item.status || 'replied';
  saveJson(INBOX_PATH, inbox);

  let state = loadJson(STATE_PATH, { open: [], history: [] });
  const r = tick(state);
  console.log(JSON.stringify({ ok: true, id, replyMs: r.state.history?.slice(-1)[0]?.replyMs, badge: r.badge }, null, 2));
}

function startWatcher() {
  let state = loadJson(STATE_PATH, { open: [], history: [] });
  const loop = () => {
    try {
      const r = tick(state);
      state = r.state;
    } catch (e) {
      console.error('[sla-pager]', e);
    }
  };
  loop();
  setInterval(loop, POLL_MS);

  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      const badge = loadJson(BADGE_PATH, {});
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'demigod-sla-pager', badge }));
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });
  server.listen(PORT, '127.0.0.1', () => {
    console.log(JSON.stringify({
      ok: true,
      mode: 'watch',
      port: PORT,
      health: `http://127.0.0.1:${PORT}/health`,
      badgePath: path.relative(ROOT, BADGE_PATH),
      slackConfigured: !!SLACK.webhook,
      slackAuthorized: SLACK.authorized,
      targetMinutes: SLA_MS / 60_000,
    }));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (arg === '--test') runTest();
  else if (arg === '--tick') {
    const state = loadJson(STATE_PATH, { open: [], history: [] });
    const r = tick(state);
    console.log(JSON.stringify({ ok: true, badge: r.badge, open: r.state.open?.length }, null, 2));
  } else if (arg === '--reply') markReply(process.argv[3]);
  else if (arg === '--status') {
    console.log(JSON.stringify(loadJson(DASH_PATH, computeBadge(loadJson(STATE_PATH, {}))), null, 2));
  } else startWatcher();
}
