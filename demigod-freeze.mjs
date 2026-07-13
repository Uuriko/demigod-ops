#!/usr/bin/env node
/**
 * File freeze / churn detector.
 * Snapshot sha256 of critical files at session start; check later for mid-session thrash.
 *
 * Default watch = site SSOT (foot/head/manifest/board). Ledger is --all only
 * (plan updates should not fail freeze).
 *
 * Usage:
 *   node demigod-freeze.mjs snapshot [--tag session] [--all]
 *   node demigod-freeze.mjs check [--tag session] [--all]   # exit 1 if changed
 *   node demigod-freeze.mjs status [--tag session]
 *   node demigod-freeze.mjs clear [--tag session]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BUSY, sha256File, ensureBusy, flag, opt } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const FREEZE_DIR = path.join(BUSY, 'freeze');
const args = process.argv.slice(2);
const cmd = args[0] || 'status';
const tag = opt(args, '--tag', process.env.DG_FREEZE_TAG || 'default');
const SNAP = path.join(FREEZE_DIR, `${tag.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`);

const CRITICAL = [
  'demigod-foot-core.js',
  'demigod-footer-lite.html',
  'demigod-head-minimal.html',
  'demigod-head-styles.css',
  'DEMIGOD-FOOT-CDN.json',
  'DEMIGOD-BOARD.json',
];
const EXTRA = ['DEMIGOD-PLAN-LEDGER.json'];

function watchList() {
  return flag(args, '--all') ? [...CRITICAL, ...EXTRA] : [...CRITICAL];
}

function snapFiles(list) {
  const files = {};
  for (const rel of list) {
    const full = path.join(ROOT, rel);
    let st = null;
    try {
      st = fs.statSync(full);
    } catch {
      /* missing */
    }
    files[rel] = {
      sha256: sha256File(full),
      bytes: st ? st.size : null,
      mtime: st ? st.mtime.toISOString() : null,
      missing: !st,
    };
  }
  return files;
}

function writeSnap(rec) {
  ensureBusy();
  fs.mkdirSync(FREEZE_DIR, { recursive: true });
  fs.writeFileSync(SNAP, JSON.stringify(rec, null, 2) + '\n');
}

if (cmd === 'snapshot') {
  const list = watchList();
  const files = snapFiles(list);
  const rec = {
    at: new Date().toISOString(),
    tag,
    root: ROOT,
    all: flag(args, '--all'),
    list,
    files,
  };
  writeSnap(rec);
  console.log(
    JSON.stringify(
      { ok: true, action: 'snapshot', tag, path: SNAP, count: Object.keys(files).length, all: rec.all },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (cmd === 'clear') {
  try {
    fs.unlinkSync(SNAP);
    console.log(JSON.stringify({ ok: true, cleared: tag, path: SNAP }));
  } catch {
    console.log(JSON.stringify({ ok: true, cleared: false, note: 'no snap', tag }));
  }
  process.exit(0);
}

if (cmd === 'status' || cmd === 'check') {
  let prev = null;
  try {
    prev = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  } catch {
    if (cmd === 'check') {
      console.error(
        JSON.stringify({
          ok: false,
          error: 'no_snapshot',
          tag,
          hint: 'node demigod-freeze.mjs snapshot [--tag session]',
        }),
      );
      process.exit(2);
    }
    console.log(JSON.stringify({ ok: true, snapshot: false, tag }));
    process.exit(0);
  }

  // Check the same file set as the snapshot (not current --all flag)
  const list = prev.list || Object.keys(prev.files || {});
  const now = snapFiles(list);
  const changes = [];
  for (const rel of list) {
    const a = prev.files?.[rel]?.sha256;
    const b = now[rel]?.sha256;
    if (a !== b) {
      changes.push({
        file: rel,
        was: a ? a.slice(0, 12) : null,
        now: b ? b.slice(0, 12) : null,
        missingNow: now[rel]?.missing || false,
      });
    }
  }
  const report = {
    ok: changes.length === 0,
    tag,
    snapshotAt: prev.at,
    checkedAt: new Date().toISOString(),
    changed: changes.length,
    changes,
    path: SNAP,
  };
  console.log(JSON.stringify(report, null, 2));
  if (cmd === 'check' && changes.length) process.exit(1);
  process.exit(0);
}

console.error('usage: snapshot | check | status | clear  [--tag name] [--all]');
process.exit(2);
