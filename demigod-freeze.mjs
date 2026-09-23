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
 *
 * The snapshot is written in DEMIGOD_ROOT. The command does not publish.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sha256File, flag, opt } from './demigod-agent-tools-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function fail(error) {
  console.error(JSON.stringify({
    ok: false,
    error,
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
  process.exit(1);
}

function diskFootVer() {
  try {
    const foot = fs.readFileSync(path.join(dataRoot(), 'demigod-foot-core.js'), 'utf8');
    return (foot.match(/__dgFootVer='(\d+)'/) || [])[1] || null;
  } catch {
    return null;
  }
}

const args = process.argv.slice(2);
if (args.includes('--publish')) fail('publish_refused');

const cmd = args[0] || 'status';
const tag = opt(args, '--tag', process.env.DG_FREEZE_TAG || 'default');
const safeTag = String(tag).replace(/[^a-zA-Z0-9._-]/g, '_');
function snapPath() {
  return path.join(dataRoot(), 'DEMIGOD-FREEZE', `${safeTag}.json`);
}

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
    const full = path.join(dataRoot(), rel);
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
  fs.mkdirSync(path.dirname(snapPath()), { recursive: true });
  fs.writeFileSync(snapPath(), JSON.stringify(rec, null, 2) + '\n');
}

const flags = {
  sent: false,
  liveMail: false,
  livePublish: false,
};

if (cmd === 'snapshot') {
  const list = watchList();
  const files = snapFiles(list);
  const rec = {
    at: new Date().toISOString(),
    tag,
    path: snapPath(),
    diskFootVer: diskFootVer(),
    root: dataRoot(),
    all: flag(args, '--all'),
    list,
    files,
    ...flags,
  };
  writeSnap(rec);
  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'snapshot',
        tag,
        path: snapPath(),
        diskFootVer: rec.diskFootVer,
        count: Object.keys(files).length,
        all: rec.all,
        ...flags,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (cmd === 'clear') {
  try {
    fs.unlinkSync(snapPath());
    console.log(JSON.stringify({ ok: true, cleared: tag, path: snapPath(), ...flags }));
  } catch {
    console.log(JSON.stringify({ ok: true, cleared: false, note: 'no snap', tag, path: snapPath(), ...flags }));
  }
  process.exit(0);
}

if (cmd === 'status' || cmd === 'check') {
  let prev = null;
  try {
    prev = JSON.parse(fs.readFileSync(snapPath(), 'utf8'));
  } catch {
    if (cmd === 'check') {
      console.error(
        JSON.stringify({
          ok: false,
          error: 'no_snapshot',
          tag,
          path: snapPath(),
          hint: 'node demigod-freeze.mjs snapshot [--tag session]',
          ...flags,
        }),
      );
      process.exit(2);
    }
    console.log(JSON.stringify({ ok: true, snapshot: false, tag, path: snapPath(), diskFootVer: diskFootVer(), ...flags }));
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
    path: snapPath(),
    diskFootVer: diskFootVer(),
    snapshotAt: prev.at,
    checkedAt: new Date().toISOString(),
    changed: changes.length,
    changes,
    ...flags,
  };
  console.log(JSON.stringify(report, null, 2));
  if (cmd === 'check' && changes.length) process.exit(1);
  process.exit(0);
}

console.error('usage: snapshot | check | status | clear  [--tag name] [--all]');
process.exit(2);
