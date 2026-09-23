#!/usr/bin/env node
/**
 * Record first-reply SLA for one inbox.
 * A missing or injected row writes nothing. This command does not post to Slack or start a server.
 *
 * Usage:
 *   node demigod-sla-pager.mjs --tick
 *   node demigod-sla-pager.mjs --reply <id>
 *   node demigod-sla-pager.mjs --status
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, readJson } from './demigod-agent-tools-lib.mjs';

const SLA_MS = Number(process.env.DEMIGOD_SLA_MS || 120 * 60 * 1000);
const WARN_MS = Number(process.env.DEMIGOD_SLA_WARN_MS || 90 * 60 * 1000);

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function inboxPath() {
  return path.join(dataRoot(), 'DEMIGOD-SUBMISSIONS-INBOX.json');
}

function statePath() {
  return path.join(dataRoot(), 'DEMIGOD-SLA-STATE.json');
}

function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-SLA-DASHBOARD.json');
}

function honesty() {
  return { sent: false, liveMail: false, liveSlack: false };
}

function loadInbox() {
  const inbox = readJson(inboxPath()) || { items: [] };
  return { inbox, items: inbox.items || [] };
}

function saveInbox(inbox) {
  fs.mkdirSync(dataRoot(), { recursive: true });
  atomicWrite(inboxPath(), JSON.stringify(inbox, null, 2) + '\n');
}

function tick(now = Date.now()) {
  const { items } = loadInbox();
  const state = readJson(statePath()) || { open: [], history: [] };
  state.open = state.open || [];
  state.history = state.history || [];
  const known = new Set(state.open.map((row) => row.id).concat(state.history.map((row) => row.id)));

  for (const item of items) {
    if (!item?.id || known.has(item.id)) continue;
    if (item.status === 'rejected' || item.status === 'spam') continue;
    const receivedAt = new Date(item.at || 0).getTime();
    const entry = {
      id: item.id,
      form: item.form || '',
      at: item.at || '',
      receivedAt,
      warned: false,
      breached: false,
      repliedAt: item.repliedAt || null,
    };
    if (item.repliedAt) {
      entry.replyMs = new Date(item.repliedAt).getTime() - receivedAt;
      state.history = state.history.slice(-199);
      state.history.push(entry);
    } else {
      state.open.push(entry);
    }
    known.add(item.id);
  }

  const stillOpen = [];
  for (const row of state.open) {
    const fresh = items.find((item) => item.id === row.id);
    if (fresh?.repliedAt) {
      row.repliedAt = fresh.repliedAt;
      row.replyMs = new Date(fresh.repliedAt).getTime() - row.receivedAt;
      state.history = state.history.slice(-199);
      state.history.push(row);
      continue;
    }
    const elapsed = now - row.receivedAt;
    if (Number.isFinite(elapsed) && elapsed >= WARN_MS) row.warned = true;
    if (Number.isFinite(elapsed) && elapsed >= SLA_MS) row.breached = true;
    stillOpen.push(row);
  }
  state.open = stillOpen;
  state.at = new Date(now).toISOString();

  const breached = state.open.filter((row) => row.breached);
  const report = {
    at: state.at,
    ok: breached.length === 0,
    openCount: state.open.length,
    breachedCount: breached.length,
    historyCount: state.history.length,
    openIds: state.open.map((row) => row.id),
    breachedIds: breached.map((row) => row.id),
    statePath: statePath(),
    report: reportPath(),
    ...honesty(),
  };
  fs.mkdirSync(dataRoot(), { recursive: true });
  atomicWrite(statePath(), JSON.stringify(state, null, 2) + '\n');
  atomicWrite(reportPath(), JSON.stringify(report, null, 2) + '\n');
  return report;
}

function reply(id) {
  const needle = String(id || '').trim();
  if (!needle) return { code: 1, body: { ok: false, error: 'submission_required', ...honesty() } };
  const { inbox, items } = loadInbox();
  const item = items.find((row) => row.id === needle);
  if (!item) return { code: 1, body: { ok: false, error: 'not_found', id: needle, ...honesty() } };
  item.repliedAt = item.repliedAt || new Date().toISOString();
  item.status = item.status === 'new' || item.status === 'pending' ? 'replied' : item.status;
  saveInbox(inbox);
  const report = tick();
  return {
    code: 0,
    body: {
      ok: true,
      id: needle,
      openIds: report.openIds,
      breachedIds: report.breachedIds,
      report: report.report,
      ...honesty(),
    },
  };
}

function run(argv = process.argv.slice(2)) {
  const cmd = argv[0] || '--tick';
  if (cmd === '--test') {
    return { code: 1, body: { ok: false, error: 'inject_refused', ...honesty() } };
  }
  if (cmd === '--watch') {
    return { code: 1, body: { ok: false, error: 'watch_refused', ...honesty() } };
  }
  if (cmd === '--tick' || cmd === '--status') {
    const report = cmd === '--status' && readJson(reportPath()) ? readJson(reportPath()) : tick();
    return { code: report.ok ? 0 : 1, body: report };
  }
  if (cmd === '--reply') return reply(argv[1]);
  return { code: 1, body: { ok: false, error: 'command_invalid', ...honesty() } };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = run();
  const line = JSON.stringify(result.body);
  if (result.code === 0) console.log(line);
  else console.error(line);
  process.exit(result.code);
}
