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
import dns from 'node:dns';
import net from 'node:net';
import { Agent, fetch as undiciFetch } from 'undici';
import { fileURLToPath } from 'url';

// Prefer DEMIGOD_BUSY (same as evidence/export/sourcer); keep DG_BUSY as legacy alias.
export const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const mem = new Map(); // key -> { at, ttlMs, value }

const DEFAULT_LIVE_TTL = Number(process.env.DEMIGOD_LIVE_CACHE_TTL_MS) || 15000;
const DEFAULT_PROBE_TTL = Number(process.env.DEMIGOD_PROBE_CACHE_TTL_MS) || 10000;

export function cacheKey(...parts) {
  return parts.map(String).join('::');
}

export function getCached(key, ttlMs = DEFAULT_PROBE_TTL) {
  const hit = mem.get(key);
  if (hit && Date.now() - hit.at < Math.min(hit.ttlMs ?? ttlMs, ttlMs)) {
    return { hit: true, value: hit.value, ageMs: Date.now() - hit.at };
  }
  // disk mirror
  try {
    const p = path.join(BUSY, 'perf-cache', sanitize(key) + '.json');
    const st = fs.statSync(p);
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const age = Date.now() - st.mtimeMs;
    const effectiveTtlMs = Math.min(Number(j.ttlMs) || ttlMs, ttlMs);
    if (age < effectiveTtlMs && j.value !== undefined) {
      mem.set(key, { at: Date.now() - age, ttlMs: effectiveTtlMs, value: j.value });
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
      writeJsonAuto(
        path.join(BUSY, 'perf-cache', sanitize(key) + '.json'),
        { at: new Date().toISOString(), ttlMs, value },
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
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const privateRoot = path.resolve(BUSY);
  const resolvedDir = path.resolve(dir);
  if (resolvedDir === privateRoot || resolvedDir.startsWith(privateRoot + path.sep)) {
    fs.chmodSync(dir, 0o700);
  }
  const data = (pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj)) + '\n';
  // Atomic: a direct writeFileSync let concurrent readers see a truncated JSON (this helper backs
  // truth.json / ship-status.json / demand caches read by the dashboard). Temp+rename so a reader
  // always sees a complete old-or-new file; a mid-write crash orphans the temp, never the target.
  const tmp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, data, { mode: 0o600 });
  fs.chmodSync(tmp, 0o600);
  fs.renameSync(tmp, filePath);
}

/**
 * Cached HTTP text fetch (live HTML, CDN js, etc.)
 */
const blockedV4 = new net.BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
]) blockedV4.addSubnet(address, prefix, 'ipv4');

const blockedV6 = new net.BlockList();
for (const [address, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
  ['5f00::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
]) blockedV6.addSubnet(address, prefix, 'ipv6');

export function isPublicNetworkAddress(address, family = net.isIP(address)) {
  if (family === 4 || family === 'IPv4') return !blockedV4.check(address, 'ipv4');
  if (family === 6 || family === 'IPv6') return !blockedV6.check(address, 'ipv6');
  return false;
}

export function guardedLookup(hostname, options, callback, lookupImpl = dns.lookup) {
  const requestedFamily = typeof options === 'number' ? options : Number(options?.family) || 0;
  lookupImpl(
    hostname,
    { all: true, verbatim: true, ...(requestedFamily ? { family: requestedFamily } : {}) },
    (error, addresses) => {
      if (error) return callback(error);
      const resolved = Array.isArray(addresses) ? addresses : [];
      if (
        !resolved.length ||
        resolved.some(({ address, family }) => !isPublicNetworkAddress(address, family))
      ) return callback(Object.assign(new Error(`non_public_network_address:${hostname}`), {
        code: 'ENONPUBLIC',
      }));
      resolved.sort((a, b) => Number(b.family === 4) - Number(a.family === 4));
      return options?.all
        ? callback(null, resolved)
        : callback(null, resolved[0].address, resolved[0].family);
    },
  );
}

async function publicGet(url, { headers, timeoutMs, lookupImpl, fetchImpl }) {
  const dispatcher = new Agent({
    connect: {
      lookup: (hostname, options, callback) =>
        guardedLookup(hostname, options, callback, lookupImpl),
    },
  });
  try {
    let target = new URL(url);
    for (let redirects = 0; redirects <= 5; redirects++) {
      const host = target.hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');
      if (
        !['http:', 'https:'].includes(target.protocol) ||
        target.username ||
        target.password ||
        !host ||
        host === 'localhost' ||
        host.endsWith('.localhost') ||
        host.endsWith('.local') ||
        host.endsWith('.internal') ||
        host.endsWith('.lan') ||
        net.isIP(host)
      ) throw new Error('invalid_public_url');
      const response = await fetchImpl(target, {
        dispatcher,
        headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
      });
      const location = response.headers.get('location');
      if ([301, 302, 303, 307, 308].includes(response.status) && location) {
        await response.body?.cancel();
        if (redirects === 5) throw new Error('too_many_redirects');
        target = new URL(location, target);
        continue;
      }
      return {
        status: response.status,
        contentType: response.headers.get('content-type') || '',
        buf: Buffer.from(await response.arrayBuffer()),
      };
    }
    throw new Error('too_many_redirects');
  } finally {
    await dispatcher.close();
  }
}

export async function cachedFetchText(url, {
  ttlMs = DEFAULT_LIVE_TTL,
  headers = {},
  timeoutMs = 22000,
  retries = 0,
  bust = false,
  lookup = dns.lookup,
  fetchImpl = undiciFetch,
} = {}) {
  const key = cacheKey('fetch-public-v1', url);
  if (!bust) {
    const c = getCached(key, ttlMs);
    if (c.hit) return { ...c.value, cached: true, cacheAgeMs: c.ageMs };
  }
  const target = new URL(url);
  target.searchParams.append('v', Date.now());
  let response;
  for (let attempt = 0; ; attempt++) {
    try {
      response = await publicGet(target, {
        headers: { 'User-Agent': 'demigod-perf-cache', ...headers },
        timeoutMs,
        lookupImpl: lookup,
        fetchImpl,
      });
      break;
    } catch (error) {
      const detail = `${error?.message || ''} ${error?.cause?.message || ''}`;
      if (attempt >= retries || /invalid_public_url|non_public_network_address/.test(detail)) throw error;
    }
  }
  const { buf } = response;
  const value = {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    contentType: response.contentType,
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
