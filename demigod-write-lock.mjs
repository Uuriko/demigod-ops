#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
const ROOT = '/home/potter';
const LOCK = path.join(ROOT, '.demigod-write.lock');
const TIMEOUT = 10 * 60 * 1000; // 10 min

export function acquireLock(pid = process.pid) {
  try {
    if (fs.existsSync(LOCK)) {
      const data = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
      if (Date.now() - data.ts < TIMEOUT) {
        if (data.pid !== pid) throw new Error(`Write lock held by ${data.pid}`);
      } else {
        console.log('Stale lock, removing');
      }
    }
    fs.writeFileSync(LOCK, JSON.stringify({ pid, ts: Date.now() }));
    return true;
  } catch (e) {
    console.error('Lock fail:', e.message);
    process.exit(1);
  }
}

export function releaseLock() {
  try { fs.unlinkSync(LOCK); } catch {}
}

if (import.meta.url === `file://${process.argv[1]}`) {
  acquireLock();
  console.log('Lock acquired');
  // for test
  setTimeout(() => { releaseLock(); console.log('released'); }, 1000);
}
