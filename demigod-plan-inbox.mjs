#!/usr/bin/env node
/**
 * Plan drop inbox for one data root.
 * Drops and the seen cursor stay under DEMIGOD_ROOT. This command does not send mail.
 *
 * Usage:
 *   node demigod-plan-inbox.mjs              # list unread
 *   node demigod-plan-inbox.mjs --mark       # mark all current as read
 *   node demigod-plan-inbox.mjs --mark <file>
 *   node demigod-plan-inbox.mjs --json
 *   node demigod-plan-inbox.mjs --useful     # filter noise
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, readJson, flag } from './demigod-agent-tools-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function dropDir() {
  return path.join(dataRoot(), 'DEMIGOD-PLAN-DROPS');
}

function cursorPath() {
  return path.join(dataRoot(), 'DEMIGOD-PLAN-CURSOR.json');
}

function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-PLAN-INBOX.json');
}

function ledgerPath() {
  return path.join(dataRoot(), 'DEMIGOD-PLAN-LEDGER.json');
}

function isNoise(preview, name, bytes) {
  if (bytes < 40) return true;
  const p = (preview || '').toLowerCase();
  if (/reading prompt from stdin/.test(p) && p.length < 500) return true;
  if (/openai codex v\d/.test(p) && /session id:/.test(p) && p.length < 800) return true;
  if (/workdir:/.test(p) && /reasoning effort:/.test(p) && p.length < 600) return true;
  if (/write permission was denied/.test(p) && p.length < 200) return true;
  if (/i need your permission to write/.test(p) && p.length < 250) return true;
  if (/^empty$|^\(empty\)/.test(p.trim())) return true;
  if (name.endsWith('.png') || name.endsWith('.jpg')) return true;
  return false;
}

function listDrops() {
  try {
    return fs
      .readdirSync(dropDir())
      .map((name) => {
        const full = path.join(dropDir(), name);
        let st;
        try {
          st = fs.statSync(full);
        } catch {
          return null;
        }
        if (!st.isFile()) return null;
        let head = '';
        try {
          head = fs.readFileSync(full, 'utf8').slice(0, 500).replace(/\s+/g, ' ');
        } catch {
          head = '';
        }
        return {
          name,
          path: full,
          mtime: st.mtime.toISOString(),
          mtimeMs: st.mtimeMs,
          ageSec: Math.round((Date.now() - st.mtimeMs) / 1000),
          bytes: st.size,
          preview: head.slice(0, 160),
          noise: isNoise(head, name, st.size),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.mtimeMs - a.mtimeMs || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

function openPlans() {
  try {
    const ledger = JSON.parse(fs.readFileSync(ledgerPath(), 'utf8'));
    return (ledger.plans || []).filter((plan) => !['applied', 'ignored'].includes(plan.status));
  } catch {
    return [];
  }
}

function loadCursor() {
  const cursor = readJson(cursorPath());
  if (cursor && typeof cursor === 'object') {
    return { lastReadAt: cursor.lastReadAt || null, seen: cursor.seen || {} };
  }
  return { lastReadAt: null, seen: {} };
}

function markTarget(argv) {
  const i = argv.indexOf('--mark');
  if (i < 0) return null;
  const next = argv[i + 1];
  if (next && !next.startsWith('--')) return path.basename(next);
  return null;
}

function isUnread(file, cursor) {
  if (cursor.seen?.[file.name]) {
    const seenAt = Date.parse(cursor.seen[file.name]);
    if (Number.isFinite(seenAt) && file.mtimeMs > seenAt) return true;
    return false;
  }
  if (cursor.lastReadAt) {
    const lastMs = Date.parse(cursor.lastReadAt);
    if (Number.isFinite(lastMs)) return file.mtimeMs > lastMs;
  }
  return true;
}

function run(argv = process.argv.slice(2)) {
  const asJson = flag(argv, '--json');
  const doMark = flag(argv, '--mark');
  const usefulOnly = flag(argv, '--useful');
  const cursor = loadCursor();
  const files = listDrops();
  const markOne = doMark ? markTarget(argv) : null;

  if (doMark) {
    if (markOne) {
      cursor.seen = cursor.seen || {};
      cursor.seen[markOne] = new Date().toISOString();
    } else {
      cursor.lastReadAt = new Date().toISOString();
      cursor.seen = {};
      for (const file of files) cursor.seen[file.name] = cursor.lastReadAt;
    }
    fs.mkdirSync(dataRoot(), { recursive: true });
    atomicWrite(cursorPath(), JSON.stringify(cursor, null, 2) + '\n');
  }

  let unread = files.filter((file) => isUnread(file, cursor));
  if (usefulOnly) unread = unread.filter((file) => !file.noise);
  const report = {
    at: new Date().toISOString(),
    lastReadAt: cursor.lastReadAt,
    unreadCount: unread.length,
    unread: unread.slice(0, 25),
    openPlans: openPlans(),
    totalMulti: files.length,
    usefulOnly,
    markedAll: Boolean(doMark && !markOne),
    markedOne: markOne || null,
    cursorPath: cursorPath(),
    report: reportPath(),
    sent: false,
    liveMail: false,
  };
  fs.mkdirSync(dataRoot(), { recursive: true });
  atomicWrite(report.report, JSON.stringify(report, null, 2) + '\n');

  if (asJson) console.log(JSON.stringify(report));
  else {
    console.log(
      `plan-inbox  unread=${report.unreadCount}  multi_total=${report.totalMulti}  open_plans=${report.openPlans.length}${usefulOnly ? '  (useful)' : ''}`,
    );
    if (report.markedAll) console.log('  (marked all current as read)');
    if (report.markedOne) console.log(`  (marked ${report.markedOne})`);
    for (const file of report.unread.slice(0, 12)) {
      const tag = file.noise ? ' [noise]' : '';
      console.log(`  · ${file.ageSec}s  ${file.name}${tag}`);
      console.log(`    ${file.preview.slice(0, 100)}`);
    }
    for (const plan of report.openPlans) {
      console.log(`  plan [${plan.status}] ${String(plan.id).slice(0, 18)}… ${plan.title}`);
    }
    if (!report.unreadCount && !report.openPlans.length) console.log('  (inbox clear)');
    console.log(`cursor ${report.cursorPath}`);
  }
  return 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exit(run());
