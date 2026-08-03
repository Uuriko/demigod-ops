#!/usr/bin/env node
/**
 * Plan / multi-agent drop inbox for Grok.
 *
 * Tracks last-read cursor; lists unread files in /tmp/dg-multi + open PLAN-LEDGER items.
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
import { BUSY, ensureBusy, atomicWrite, readJson, flag, opt } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const MULTI = process.env.DEMIGOD_MULTI || '/tmp/dg-multi';
const CURSOR = path.join(BUSY, 'plan-inbox-cursor.json');
const LEDGER = path.join(ROOT, 'DEMIGOD-PLAN-LEDGER.json');
const args = process.argv.slice(2);
const asJson = flag(args, '--json');
const doMark = flag(args, '--mark');
const usefulOnly = flag(args, '--useful');

function loadCursor() {
  const c = readJson(CURSOR);
  if (c && typeof c === 'object') {
    return { lastReadAt: c.lastReadAt || null, seen: c.seen || {} };
  }
  return { lastReadAt: null, seen: {} };
}

function saveCursor(c) {
  ensureBusy();
  atomicWrite(CURSOR, JSON.stringify(c, null, 2) + '\n');
}

function isNoise(preview, name, bytes) {
  if (bytes < 40) return true;
  const p = (preview || '').toLowerCase();
  // Codex CLI banners / empty sessions
  if (/reading prompt from stdin/.test(p) && p.length < 500) return true;
  if (/openai codex v\d/.test(p) && /session id:/.test(p) && p.length < 800) return true;
  if (/workdir:/.test(p) && /reasoning effort:/.test(p) && p.length < 600) return true;
  // Read-only agent couldn't write — still may contain useful body after banner
  if (/write permission was denied/.test(p) && p.length < 200) return true;
  if (/i need your permission to write/.test(p) && p.length < 250) return true;
  if (/^empty$|^\(empty\)/.test(p.trim())) return true;
  // pure binary-looking
  if (name.endsWith('.png') || name.endsWith('.jpg')) return true;
  return false;
}

function listMulti() {
  try {
    return fs
      .readdirSync(MULTI)
      .map((name) => {
        const full = path.join(MULTI, name);
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
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch {
    return [];
  }
}

function openPlans() {
  try {
    const j = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
    return (j.plans || []).filter((p) => !['applied', 'ignored'].includes(p.status));
  } catch {
    return [];
  }
}

function markTarget() {
  // --mark alone → all; --mark file → one
  const i = args.indexOf('--mark');
  if (i < 0) return null;
  const next = args[i + 1];
  if (next && !next.startsWith('--')) return path.basename(next);
  return null;
}

const cursor = loadCursor();
const lastMs = cursor.lastReadAt ? Date.parse(cursor.lastReadAt) : 0;
const files = listMulti();
const markOne = doMark ? markTarget() : null;

if (doMark) {
  if (markOne) {
    cursor.seen = cursor.seen || {};
    cursor.seen[markOne] = new Date().toISOString();
  } else {
    cursor.lastReadAt = new Date().toISOString();
    cursor.seen = {};
    for (const f of files) cursor.seen[f.name] = cursor.lastReadAt;
  }
  saveCursor(cursor);
}

function isUnread(f) {
  // Per-file mark: re-unread if modified after the mark timestamp
  if (cursor.seen?.[f.name]) {
    const seenAt = Date.parse(cursor.seen[f.name]);
    if (Number.isFinite(seenAt) && f.mtimeMs > seenAt) return true;
    return false;
  }
  // Full watermark (mark-all): anything newer than lastReadAt is unread
  if (cursor.lastReadAt && Number.isFinite(lastMs)) {
    return f.mtimeMs > lastMs;
  }
  // never marked
  return true;
}

let unread = files.filter(isUnread);
if (usefulOnly) unread = unread.filter((f) => !f.noise);

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
};

try {
  ensureBusy();
  atomicWrite(path.join(BUSY, 'plan-inbox-latest.json'), JSON.stringify(report, null, 2) + '\n');
} catch {
  /* */
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(
    `plan-inbox  unread=${report.unreadCount}  multi_total=${report.totalMulti}  open_plans=${report.openPlans.length}${usefulOnly ? '  (useful)' : ''}`,
  );
  if (report.markedAll) console.log('  (marked all current as read)');
  if (report.markedOne) console.log(`  (marked ${report.markedOne})`);
  for (const f of report.unread.slice(0, 12)) {
    const tag = f.noise ? ' [noise]' : '';
    console.log(`  · ${f.ageSec}s  ${f.name}${tag}`);
    console.log(`    ${f.preview.slice(0, 100)}`);
  }
  for (const p of report.openPlans) {
    console.log(`  plan [${p.status}] ${String(p.id).slice(0, 18)}… ${p.title}`);
  }
  if (!report.unreadCount && !report.openPlans.length) console.log('  (inbox clear)');
  console.log(`cursor ${CURSOR}`);
}

process.exit(0);
