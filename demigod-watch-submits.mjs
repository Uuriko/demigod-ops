#!/usr/bin/env node
/**
 * Watch WIZ / form submissions inbox for new items → human alert.
 * Wraps DEMIGOD-SUBMISSIONS-INBOX.json (no new store).
 *
 * Usage:
 *   node demigod-watch-submits.mjs           # report new since cursor
 *   node demigod-watch-submits.mjs --mark    # mark current as seen
 *   node demigod-watch-submits.mjs --json
 *   node demigod-watch-submits.mjs --all     # ignore cursor, show new-status
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  BUSY,
  ensureBusy,
  atomicWrite,
  readJson,
  flag,
} from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const INBOX = path.join(ROOT, 'DEMIGOD-SUBMISSIONS-INBOX.json');
const CURSOR = path.join(BUSY, 'submits-cursor.json');
const ALERT_MD = path.join(BUSY, 'SUBMIT-ALERT.md');
const ALERT_JSON = path.join(BUSY, 'submits-latest.json');

const args = process.argv.slice(2);
const asJson = flag(args, '--json');
const doMark = flag(args, '--mark');
const showAll = flag(args, '--all');

function loadInbox() {
  const j = readJson(INBOX);
  if (!j) return { items: [], at: null, error: 'inbox_missing_or_invalid' };
  return j;
}

function loadCursor() {
  return readJson(CURSOR) || { lastSeenAt: null, seenIds: {} };
}

function formKind(form = '') {
  const f = String(form).toLowerCase();
  if (/partner/.test(f)) return 'partner';
  if (/startup/.test(f)) return 'startup';
  if (/engineer|jobseeker|candidate/.test(f)) return 'engineer';
  return 'other';
}

function maskEmail(item) {
  try {
    const raw = item.raw || {};
    const email =
      raw['contact-email'] ||
      raw.contactEmail ||
      raw['seeker-email'] ||
      raw.seekerEmail ||
      raw['partner-email'] ||
      raw.partnerEmail ||
      '';
    if (!email) return '';
    return String(email).replace(/(^.).*(@.*$)/, '$1***$2');
  } catch {
    return '';
  }
}

function summarizeItem(item) {
  return {
    id: item.id,
    at: item.at,
    form: item.form,
    kind: formKind(item.form),
    status: item.status || 'unknown',
    email: maskEmail(item),
    statusUrl: item.id ? `https://www.trydemigod.com/#status/${item.id}` : null,
  };
}

const inbox = loadInbox();
const cursor = loadCursor();
const items = inbox.items || [];
const lastMs = cursor.lastSeenAt ? Date.parse(cursor.lastSeenAt) : 0;

const WEEK_MS = 7 * 86400000;
let fresh = items.filter((it) => {
  if (showAll) return (it.status || '') === 'new';
  if (cursor.seenIds?.[it.id]) return false;
  if (cursor.lastSeenAt) {
    const t = Date.parse(it.at || 0);
    return Number.isFinite(t) ? t > lastMs : true;
  }
  // never marked: only status=new from last 7 days (avoid flooding old smoke/history)
  if ((it.status || '') !== 'new') return false;
  const t = Date.parse(it.at || 0);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < WEEK_MS;
});

// sort newest first
fresh = fresh
  .slice()
  .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));

const rows = fresh.map(summarizeItem);
const byKind = rows.reduce((acc, r) => {
  acc[r.kind] = (acc[r.kind] || 0) + 1;
  return acc;
}, {});

if (doMark) {
  // Use snapshot max timestamp (not wall clock) to avoid lost-alert race
  let maxAt = 0;
  for (const it of items) {
    const t = Date.parse(it.at || 0);
    if (Number.isFinite(t) && t > maxAt) maxAt = t;
  }
  cursor.lastSeenAt = maxAt
    ? new Date(maxAt).toISOString()
    : new Date().toISOString();
  cursor.seenIds = cursor.seenIds || {};
  for (const it of items) {
    if (it.id) cursor.seenIds[it.id] = cursor.lastSeenAt;
  }
  // prune seen map if huge
  const ids = Object.keys(cursor.seenIds);
  if (ids.length > 500) {
    const keep = new Set(items.slice(0, 200).map((i) => i.id));
    const next = {};
    for (const id of keep) if (cursor.seenIds[id]) next[id] = cursor.seenIds[id];
    cursor.seenIds = next;
  }
  ensureBusy();
  atomicWrite(CURSOR, JSON.stringify(cursor, null, 2) + '\n');
}

const report = {
  at: new Date().toISOString(),
  inboxAt: inbox.at || null,
  inboxPath: INBOX,
  error: inbox.error || null,
  totalItems: items.length,
  newStatusCount: items.filter((i) => i.status === 'new').length,
  freshCount: rows.length,
  byKind,
  rows: rows.slice(0, 40),
  marked: doMark,
  lastSeenAt: cursor.lastSeenAt,
  actions: {
    triage: 'node demigod-submissions-inbox.mjs --new',
    approve: 'node demigod-submissions-approve.mjs <sub-id>',
    whiteGlove: 'demigod-ops/WHITE-GLOVE-ON-REPLY.md',
  },
  alert:
    rows.length > 0
      ? `ALERT: ${rows.length} new submission(s) — check ${ALERT_MD}`
      : 'no new submissions since cursor',
};

const md = [
  `# Demigod SUBMIT ALERT — ${report.at}`,
  report.error ? `error: ${report.error}` : null,
  `fresh: **${report.freshCount}** · inbox total: ${report.totalItems} · status=new: ${report.newStatusCount}`,
  `by kind: ${JSON.stringify(byKind)}`,
  '',
  report.freshCount ? '## New / unseen' : '## (none)',
  ...rows.slice(0, 20).map(
    (r) =>
      `- **${r.kind}** \`${r.id}\` ${r.at || '?'} ${r.email || ''} status=${r.status}\n  ${r.statusUrl || ''}`,
  ),
  '',
  '## Next (human)',
  '1. Open white-glove: `demigod-ops/WHITE-GLOVE-ON-REPLY.md`',
  '2. `node demigod-submissions-inbox.mjs --new`',
  '3. After handling: `node demigod-watch-submits.mjs --mark`',
  '',
  `cursor: ${CURSOR}`,
]
  .filter((l) => l !== null)
  .join('\n');

ensureBusy();
atomicWrite(ALERT_JSON, JSON.stringify(report, null, 2) + '\n');
atomicWrite(ALERT_MD, md + '\n');

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(
    `watch-submits  fresh=${report.freshCount}  status_new=${report.newStatusCount}  total=${report.totalItems}${doMark ? '  (marked)' : ''}`,
  );
  if (report.error) console.log(`  error: ${report.error}`);
  for (const r of rows.slice(0, 10)) {
    console.log(`  · ${r.kind} ${r.id} ${r.at || ''} ${r.email}`);
  }
  if (!rows.length) console.log('  (no new)');
  console.log(`alert  ${ALERT_MD}`);
}

// missing inbox is failure
if (report.error) process.exit(1);
// exit 2 if there are fresh items (useful for watchers / cron)
if (flag(args, '--exit-alert') && rows.length > 0) process.exit(2);
process.exit(0);
