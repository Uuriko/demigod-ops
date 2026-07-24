import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const BUSY_DIR = process.env.DEMIGOD_BUSY_DIR || '/tmp/dg-busy';
export const WORK_LOCK = path.join(BUSY_DIR, 'work-unit.lock');
const DEFAULT_TTL_MS = 175_000;

function alive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error?.code === 'EPERM'; }
}

function readLock(file = WORK_LOCK) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function reclaimable(lock, now = Date.now()) {
  if (!lock || typeof lock !== 'object') return true;
  const expires = Date.parse(lock.expiresAt || '');
  if (!lock.token || !Number.isSafeInteger(lock.pid) || !Number.isFinite(expires)) return true;
  return expires <= now || !alive(lock.pid);
}

export function acquireWorkUnit({ owner = 'cycle-work', ttlMs = DEFAULT_TTL_MS, file = WORK_LOCK } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const now = Date.now();
  const token = `${process.pid}-${crypto.randomBytes(12).toString('hex')}`;
  const record = {
    schema: 'demigod.work-unit-lock/1', token, pid: process.pid, owner,
    startedAt: new Date(now).toISOString(), expiresAt: new Date(now + Math.max(1_000, ttlMs)).toISOString(),
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(file, 'wx', 0o600);
      try { fs.writeFileSync(fd, JSON.stringify(record, null, 2) + '\n'); } finally { fs.closeSync(fd); }
      let released = false;
      return { acquired: true, record, release() {
        if (released) return false;
        const current = readLock(file);
        if (current?.token !== token || current?.pid !== process.pid) return false;
        try { fs.unlinkSync(file); released = true; return true; } catch { return false; }
      } };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      const current = readLock(file);
      if (attempt === 0 && reclaimable(current)) {
        try { fs.unlinkSync(file); } catch { /* another contender won */ }
        continue;
      }
      return { acquired: false, current, release() { return false; } };
    }
  }
  return { acquired: false, current: readLock(file), release() { return false; } };
}

export function installLockCleanup(lease) {
  if (!lease?.acquired) return () => {};
  const cleanup = () => lease.release();
  process.once('exit', cleanup);
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.once(signal, () => { cleanup(); process.exit(128 + ({ SIGINT: 2, SIGTERM: 15, SIGHUP: 1 })[signal]); });
  }
  return cleanup;
}

export function classifyVerdict(result = {}) {
  const health = Array.isArray(result.health) ? result.health : [];
  const timeout = result.timeout === true || result.failureKind === 'timeout' || health.some((c) => c.timeout || c.exit === 124 || c.failureKind === 'timeout');
  const blocked = result.blocked === true || result.childStartBlocked === true || result.failureKind === 'child-start' || health.some((c) => c.blocked || c.childStartBlocked);
  const fallback = result.fallback === true || /fallback/i.test(String(result.executionMode || '')) || health.some((c) => c.fallback);
  const degraded = result.degraded === true || health.some((c) => c.degraded);
  const failed = result.error || result.ok !== true || health.some((c) => c.exit !== 0);
  if (result.skipped === true) return 'skip';
  if (timeout || blocked) return 'blocked';
  if (fallback || degraded) return 'degraded';
  if (failed) return 'fail';
  return 'pass';
}

export function normalizeGap(value, floor = 60) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= floor ? parsed : floor;
}

export function receiptIsFresh(receipt, now = Date.now(), maxAgeMs = 15 * 60 * 1000) {
  const at = Date.parse(receipt?.at || '');
  const age = now - at;
  return Number.isFinite(at) && age >= 0 && age <= maxAgeMs;
}

export function selectDomain({ domains = {}, releaseBlocked = false, now = Date.now() } = {}) {
  const priorities = releaseBlocked
    ? ['ship', 'tools', 'website', 'startup', 'research']
    : ['tools', 'ship', 'website', 'startup', 'research'];
  const eligible = priorities.filter((name) => !domains[name]?.cooldownUntil || Date.parse(domains[name].cooldownUntil) <= now);
  return eligible[0] || [...priorities].sort((a, b) => Date.parse(domains[a]?.cooldownUntil || '') - Date.parse(domains[b]?.cooldownUntil || ''))[0];
}
