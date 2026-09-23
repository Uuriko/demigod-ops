#!/usr/bin/env node
/**
 * Local write lock for one data root.
 * Writes DEMIGOD-WRITE-LOCK.json in DEMIGOD_ROOT. The command does not publish.
 *
 *   node demigod-write-lock.mjs acquire --note "…"
 *   node demigod-write-lock.mjs status
 *   node demigod-write-lock.mjs release
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const TIMEOUT = 10 * 60 * 1000;
const localFlags = { sent: false, liveMail: false, livePublish: false };

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || scriptDir();
}
function lockPath() {
  return path.join(dataRoot(), 'DEMIGOD-WRITE-LOCK.json');
}
function noteFrom(args) {
  const i = args.indexOf('--note');
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  return '';
}
function readLock() {
  try {
    return JSON.parse(fs.readFileSync(lockPath(), 'utf8'));
  } catch {
    return null;
  }
}

export function lockStatus() {
  const data = readLock();
  const fresh = Boolean(data && Date.now() - data.ts < TIMEOUT);
  return {
    ok: true,
    path: lockPath(),
    held: fresh,
    pid: fresh ? data.pid : null,
    note: fresh ? data.note || '' : '',
    ...localFlags,
  };
}

export function acquireLock(pid = process.pid, note = '') {
  const LOCK = lockPath();
  const data = readLock();
  if (data && Date.now() - data.ts < TIMEOUT && data.pid !== pid) {
    const err = new Error(`write_lock_held`);
    err.code = 'write_lock_held';
    err.holder = data.pid;
    throw err;
  }
  const rec = { pid, ts: Date.now(), note: String(note || '') };
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(LOCK, JSON.stringify(rec));
  return { ok: true, path: LOCK, held: true, pid, note: rec.note, ...localFlags };
}

export function releaseLock() {
  const LOCK = lockPath();
  try {
    fs.unlinkSync(LOCK);
  } catch {
    /* already clear */
  }
  return { ok: true, path: LOCK, held: false, released: true, ...localFlags };
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--publish')) {
    console.error(JSON.stringify({ ok: false, error: 'publish_refused', ...localFlags }));
    process.exit(1);
  }
  const cmd = args[0] || 'status';
  try {
    if (cmd === 'acquire') {
      console.log(JSON.stringify(acquireLock(process.pid, noteFrom(args))));
      process.exit(0);
    }
    if (cmd === 'release') {
      console.log(JSON.stringify(releaseLock()));
      process.exit(0);
    }
    if (cmd === 'status') {
      const st = lockStatus();
      console.log(JSON.stringify(st));
      process.exit(st.held ? 2 : 0);
    }
    console.error(JSON.stringify({ ok: false, error: 'usage', hint: 'acquire | status | release', ...localFlags }));
    process.exit(2);
  } catch (e) {
    console.error(JSON.stringify({
      ok: false,
      error: e.code || 'write_lock_held',
      holder: e.holder || null,
      path: lockPath(),
      ...localFlags,
    }));
    process.exit(1);
  }
}
