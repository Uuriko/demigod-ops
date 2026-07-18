#!/usr/bin/env node
/**
 * demigod-perf-cache — shared TTL caches for Demigod tooling hot paths
 *
 *   import {
 *     getCached, setCached, cachedFetchText, compactWriteJson,
 *     isFreshFile, readJsonIfFresh, BUSY
 *   } from './demigod-perf-cache.mjs'
 *
 * Memory TTL + optional /tmp/dg-busy disk mirror for cross-process reuse.
 * Never invents product truth — only caches network/probe results.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

export const BUSY = process.env.DG_BUSY || '/tmp/dg-busy';
const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const mem = new Map(); // key -> { at, ttlMs, value }

const DEFAULT_LIVE_TTL = Number(process.env.DEMIGOD_LIVE_CACHE_TTL_MS) || 15000;
const DEFAULT_PROBE_TTL = Number(process.env.DEMIGOD_PROBE_CACHE_TTL_MS) || 10000;

export function cacheKey(...parts) {
  return parts.map(String).join('::');
}

export function getCached(key, ttlMs = DEFAULT_PROBE_TTL) {
  const hit = mem.get(key);
  if (hit && Date.now() - hit.at < (hit.ttlMs ?? ttlMs)) {
    return { hit: true, value: hit.value, ageMs: Date.now() - hit.at };
  }
  // disk mirror
  try {
    const p = path.join(BUSY, 'perf-cache', sanitize(key) + '.json');
    const st = fs.statSync(p);
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const age = Date.now() - st.mtimeMs;
    if (age < (j.ttlMs || ttlMs) && j.value !== undefined) {
      mem.set(key, { at: Date.now() - age, ttlMs: j.ttlMs || ttlMs, value: j.value });
      return { hit: true, value: j.value, ageMs: age, disk: true };
    }
  } catch {
    /* */
  }
  return { hit: false, value: null };
}

export function setCached(key, value, ttlMs = DEFAULT_PROBE_TTL, { disk = true } = {}) {
  mem.set(key, { at: Date.now(), ttlMs, value });
  if (disk) {
    try {
      const dir = path.join(BUSY, 'perf-cache');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, sanitize(key) + '.json'),
        JSON.stringify({ at: new Date().toISOString(), ttlMs, value }),
      );
    } catch {
      /* */
    }
  }
  return value;
}

function sanitize(key) {
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 24);
}

export function isFreshFile(filePath, maxAgeSec) {
  try {
    const age = (Date.now() - fs.statSync(filePath).mtimeMs) / 1000;
    return age <= maxAgeSec;
  } catch {
    return false;
  }
}

export function readJsonIfFresh(filePath, maxAgeSec) {
  if (!isFreshFile(filePath, maxAgeSec)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/** Compact write — no pretty indent (hot path) */
export function compactWriteJson(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  // Atomic (temp+rename), same as writeJsonAuto — an exported JSON writer must not leave a torn file
  // for a concurrent reader, and a non-atomic twin next to the atomic one is a footgun.
  const tmp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(obj) + '\n');
  fs.renameSync(tmp, filePath);
}

/** Pretty only when DEMIGOD_JSON_PRETTY=1 */
export function writeJsonAuto(filePath, obj) {
  const pretty = process.env.DEMIGOD_JSON_PRETTY === '1';
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const data = (pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj)) + '\n';
  // Atomic: a direct writeFileSync let concurrent readers see a truncated JSON (this helper backs
  // truth.json / ship-status.json / demand caches read by the dashboard). Temp+rename so a reader
  // always sees a complete old-or-new file; a mid-write crash orphans the temp, never the target.
  const tmp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, filePath);
}

/**
 * Cached HTTP text fetch (live HTML, CDN js, etc.)
 */
export async function cachedFetchText(url, { ttlMs = DEFAULT_LIVE_TTL, headers = {}, timeoutMs = 22000, bust = false } = {}) {
  const key = cacheKey('fetch', url);
  if (!bust) {
    const c = getCached(key, ttlMs);
    if (c.hit) return { ...c.value, cached: true, cacheAgeMs: c.ageMs };
  }
  const r = await fetch(`${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`, {
    headers: { 'User-Agent': 'demigod-perf-cache', ...headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const buf = Buffer.from(await r.arrayBuffer());
  const value = {
    ok: r.ok,
    status: r.status,
    contentType: r.headers.get('content-type') || '',
    text: buf.toString('utf8'),
    bytes: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
  };
  setCached(key, value, ttlMs);
  return { ...value, cached: false };
}

/** Reuse /tmp/dg-busy/truth.json if young enough */
export function readFreshTruth(maxAgeSec = 15) {
  return readJsonIfFresh(path.join(BUSY, 'truth.json'), maxAgeSec);
}

export function readFreshShipStatus(maxAgeSec = 20) {
  return readJsonIfFresh(path.join(BUSY, 'ship-status.json'), maxAgeSec);
}

export function readFreshDashboardStatus(maxAgeSec = 30) {
  return readJsonIfFresh(path.join(BUSY, 'dashboard-status.json'), maxAgeSec);
}

export function constants() {
  return {
    ROOT,
    BUSY,
    DEFAULT_LIVE_TTL,
    DEFAULT_PROBE_TTL,
    memSize: mem.size,
  };
}
