#!/usr/bin/env node
/**
 * Watch WIZ / form submissions inbox for new items → human alert.
 * Wraps DEMIGOD-SUBMISSIONS-INBOX.json (no new store).
 * The seen cursor and alert stay under DEMIGOD_ROOT. This command does not send mail.
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
import { atomicWrite, readJson, flag } from './demigod-agent-tools-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function inboxPath() {
  return path.join(dataRoot(), 'DEMIGOD-SUBMISSIONS-INBOX.json');
}

function cursorPath() {
  return path.join(dataRoot(), 'DEMIGOD-SUBMITS-CURSOR.json');
}

function alertJsonPath() {
  return path.join(dataRoot(), 'DEMIGOD-SUBMIT-ALERT.json');
}

function alertMdPath() {
  return path.join(dataRoot(), 'DEMIGOD-SUBMIT-ALERT.md');
}

function loadInbox() {
  const parsed = readJson(inboxPath());
  if (!parsed) return { items: [], at: null, error: 'inbox_missing_or_invalid' };
  return parsed;
}

function loadCursor() {
  return readJson(cursorPath()) || { lastSeenAt: null, seenIds: {} };
}

function formKind(form = '') {
  const name = String(form).toLowerCase();
  if (/partner/.test(name)) return 'partner';
  if (/startup/.test(name)) return 'startup';
  if (/engineer|jobseeker|candidate/.test(name)) return 'engineer';
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

export function watchSubmits(argv = process.argv.slice(2)) {
  const asJson = flag(argv, '--json');
  const doMark = flag(argv, '--mark');
  const showAll = flag(argv, '--all');
  const root = dataRoot();
  fs.mkdirSync(root, { recursive: true });

  const inbox = loadInbox();
  const cursor = loadCursor();
  const items = inbox.items || [];
  const lastMs = cursor.lastSeenAt ? Date.parse(cursor.lastSeenAt) : 0;
  const weekMs = 7 * 86400000;
  let fresh = items.filter((item) => {
    if (showAll) return (item.status || '') === 'new';
    if (cursor.seenIds?.[item.id]) return false;
    if (cursor.lastSeenAt) {
      const at = Date.parse(item.at || 0);
      return Number.isFinite(at) ? at > lastMs : true;
    }
    if ((item.status || '') !== 'new') return false;
    const at = Date.parse(item.at || 0);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < weekMs;
  });

  fresh = fresh.slice().sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  const rows = fresh.map(summarizeItem);
  const byKind = rows.reduce((acc, row) => {
    acc[row.kind] = (acc[row.kind] || 0) + 1;
    return acc;
  }, {});

  if (doMark) {
    let maxAt = 0;
    for (const item of items) {
      const at = Date.parse(item.at || 0);
      if (Number.isFinite(at) && at > maxAt) maxAt = at;
    }
    cursor.lastSeenAt = maxAt ? new Date(maxAt).toISOString() : new Date().toISOString();
    cursor.seenIds = cursor.seenIds || {};
    for (const item of items) {
      if (item.id) cursor.seenIds[item.id] = cursor.lastSeenAt;
    }
    const ids = Object.keys(cursor.seenIds);
    if (ids.length > 500) {
      const keep = new Set(items.slice(0, 200).map((item) => item.id));
      const next = {};
      for (const id of keep) if (cursor.seenIds[id]) next[id] = cursor.seenIds[id];
      cursor.seenIds = next;
    }
    atomicWrite(cursorPath(), JSON.stringify(cursor, null, 2) + '\n');
  }

  const report = {
    at: new Date().toISOString(),
    inboxAt: inbox.at || null,
    inboxPath: inboxPath(),
    cursorPath: cursorPath(),
    alertPath: alertJsonPath(),
    error: inbox.error || null,
    totalItems: items.length,
    newStatusCount: items.filter((item) => item.status === 'new').length,
    freshCount: rows.length,
    byKind,
    rows: rows.slice(0, 40),
    marked: doMark,
    lastSeenAt: cursor.lastSeenAt,
    sent: false,
    liveMail: false,
    actions: {
      triage: 'node demigod-submissions-inbox.mjs --new',
      approve: 'node demigod-submissions-approve.mjs <sub-id>',
      whiteGlove: 'demigod-ops/WHITE-GLOVE-ON-REPLY.md',
    },
    alert:
      rows.length > 0
        ? `ALERT: ${rows.length} new submission(s) — check ${alertMdPath()}`
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
      (row) =>
        `- **${row.kind}** \`${row.id}\` ${row.at || '?'} ${row.email || ''} status=${row.status}\n  ${row.statusUrl || ''}`,
    ),
    '',
    '## Next (human)',
    '1. Open white-glove: `demigod-ops/WHITE-GLOVE-ON-REPLY.md`',
    '2. `node demigod-submissions-inbox.mjs --new`',
    '3. After handling: `node demigod-watch-submits.mjs --mark`',
    '',
    `cursor: ${cursorPath()}`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  atomicWrite(alertJsonPath(), JSON.stringify(report, null, 2) + '\n');
  atomicWrite(alertMdPath(), md + '\n');

  if (asJson) console.log(JSON.stringify(report));
  else {
    console.log(
      `watch-submits  fresh=${report.freshCount}  status_new=${report.newStatusCount}  total=${report.totalItems}${doMark ? '  (marked)' : ''}`,
    );
    if (report.error) console.log(`  error: ${report.error}`);
    for (const row of rows.slice(0, 10)) {
      console.log(`  · ${row.kind} ${row.id} ${row.at || ''} ${row.email}`);
    }
    if (!rows.length) console.log('  (no new)');
    console.log(`alert  ${alertMdPath()}`);
  }
  return report;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const report = watchSubmits();
  if (report.error) process.exit(1);
  if (flag(process.argv.slice(2), '--exit-alert') && report.freshCount > 0) process.exit(2);
}
