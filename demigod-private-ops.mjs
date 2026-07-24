#!/usr/bin/env node
/**
 * Minimal read-only projection for a private Demigod status page.
 *
 * This process never imports the privileged dashboard, runs commands, writes
 * files, or listens beyond loopback. It projects only fixed aggregate fields
 * from the cached control-plane receipt.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { footVerFromJs } from './demigod-agent-tools-lib.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = '/tmp/dg-busy/control-plane.json';
const FOOT = path.join(ROOT, 'demigod-foot-core.js');
const HOST = '127.0.0.1';
const PORT = 9879;
const MAX_AGE_MS = 15 * 60 * 1000;
const MAX_SOURCE_BYTES = 256_000;
const MAX_FOOT_BYTES = 2_000_000;
const HEALTH_STATES = new Set(['solid', 'watch', 'attention', 'truth-stale', 'truth-failed', 'demand-starved']);

export const SECURITY_HEADERS = Object.freeze({
  'Cache-Control': 'no-store, max-age=0',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
});

const unavailable = (state) => ({ schemaVersion: 1, state, ready: false });

function boolean(value) {
  if (typeof value !== 'boolean') throw new TypeError();
  return value;
}

function optionalBoolean(value) {
  return value === null ? null : boolean(value);
}

function count(value, max = 1_000_000_000) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) throw new TypeError();
  return value;
}

function version(value) {
  if (!/^\d+$/.test(String(value))) throw new TypeError();
  return count(Number(value));
}

function footMarkerVersions(source) {
  return [
    (source.match(/dg-foot-v(\d+)-core/) || [])[1],
    footVerFromJs(source),
    (source.match(/dgFootVersion\s*=\s*['"]v?(\d+)/) || [])[1],
    (source.match(/foot v(\d+)-core loaded/) || [])[1],
  ].map(version);
}

function truthVersion(summary) {
  const hit = typeof summary === 'string' && summary.match(/\bdisk=v(\d+)\b/);
  if (!hit) throw new TypeError();
  return version(hit[1]);
}

/** Convert a control-plane receipt into the only data shape this service may emit. */
export function projectStatus(input, currentVersion, nowMs = Date.now(), footMtimeMs = 0) {
  try {
    if (!input || input.schema !== 'demigod.control-plane/2' || input.version !== 2) return unavailable('invalid');
    if (typeof input.at !== 'string') return unavailable('invalid');
    const snapshotMs = Date.parse(input.at);
    if (!Number.isFinite(snapshotMs) || new Date(snapshotMs).toISOString() !== input.at) return unavailable('invalid');
    if (snapshotMs > nowMs || (footMtimeMs && footMtimeMs > nowMs)) return unavailable('future');
    if (nowMs - snapshotMs > MAX_AGE_MS || (footMtimeMs && footMtimeMs > snapshotMs + 2_000)) {
      return unavailable('stale');
    }

    const sourceVersion = version(currentVersion);
    const snapshotVersions = [
      version(input.nextCanon?.versions?.disk),
      version(input.nextCanon?.versions?.manifest),
      version((String(input.modules?.site?.metrics?.foot || '').match(/^foot v(\d+)$/) || [])[1]),
      truthVersion(input.truthEvidence?.summary),
      truthVersion(input.nextCanon?.truthEvidence?.summary),
    ];
    if (snapshotVersions.some((value) => value !== sourceVersion)) return unavailable('version-mismatch');

    const healthState = input.healthLabel;
    if (!HEALTH_STATES.has(healthState)) return unavailable('invalid');
    return {
      schemaVersion: 1,
      state: 'ready',
      ready: true,
      snapshotAgeSec: count(Math.floor((nowMs - snapshotMs) / 1000)),
      sourceVersion,
      healthScore: count(input.health, 100),
      healthState,
      truthGreen: boolean(input.truthEvidence.green),
      fullyShipped: boolean(input.nextCanon.fullyShipped),
      smokePass: boolean(input.modules.site.metrics.smoke),
      demandStarved: boolean(input.demandStarved),
      sentConfirmed: count(input.dms.sentConfirmed),
      roleCount: count(input.board.roles),
      realRoleCount: count(input.board.realRoles),
      boardHonest: boolean(input.board.honestyPass),
      inboxNewCount: count(input.modules.match.metrics.inboxNew),
      pairCount: count(input.modules.match.metrics.pairs),
      realProposedCount: count(input.modules.match.metrics.realProposed),
      reviewFail: boolean(input.modules.review.metrics.fail),
      reviewFindingCount: count(input.modules.review.metrics.count),
      loopOk: optionalBoolean(input.modules.workloop.metrics.ok),
      frozen: boolean(input.frozen),
      footLockHeld: boolean(input.lock.foot),
    };
  } catch {
    return unavailable('invalid');
  }
}

export function statusFromText(snapshotText, footText, nowMs = Date.now(), footMtimeMs = 0) {
  try {
    if (Buffer.byteLength(snapshotText) > MAX_SOURCE_BYTES || Buffer.byteLength(footText) > MAX_FOOT_BYTES) {
      return unavailable('invalid');
    }
    const markers = footMarkerVersions(footText);
    if (!markers.every((value) => value === markers[0])) return unavailable('version-mismatch');
    return projectStatus(JSON.parse(snapshotText), markers[0], nowMs, footMtimeMs);
  } catch {
    return unavailable('invalid');
  }
}

export function loadStatus(nowMs = Date.now()) {
  try {
    return statusFromText(
      fs.readFileSync(SOURCE, 'utf8'),
      fs.readFileSync(FOOT, 'utf8'),
      nowMs,
      fs.statSync(FOOT).mtimeMs,
    );
  } catch {
    return unavailable('invalid');
  }
}

function html(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function renderPage(status) {
  const labels = {
    snapshotAgeSec: 'Snapshot age (seconds)', sourceVersion: 'Source version', healthScore: 'Health score',
    healthState: 'Health state', truthGreen: 'Truth green', fullyShipped: 'Fully shipped', smokePass: 'Smoke pass',
    demandStarved: 'Demand starved', sentConfirmed: 'Confirmed sends', roleCount: 'Roles', realRoleCount: 'Real roles',
    boardHonest: 'Board honest', inboxNewCount: 'New inbox items', pairCount: 'Pairs', realProposedCount: 'Real proposals',
    reviewFail: 'Review failing', reviewFindingCount: 'Review findings', loopOk: 'Loop healthy', frozen: 'Frozen',
    footLockHeld: 'Foot lock held',
  };
  const rows = status.ready
    ? Object.entries(labels).map(([key, label]) => `<tr><th>${label}</th><td>${html(status[key])}</td></tr>`).join('')
    : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="referrer" content="no-referrer"><title>Demigod private ops</title><style>body{font:16px system-ui;background:#111;color:#eee;max-width:48rem;margin:3rem auto;padding:0 1rem}h1{font-size:1.6rem}p{color:#bbb}table{width:100%;border-collapse:collapse}th,td{padding:.55rem;border-bottom:1px solid #333;text-align:left}td{font-variant-numeric:tabular-nums}</style></head><body><h1>Demigod private ops</h1><p>State: ${html(status.state)}</p>${rows ? `<table>${rows}</table>` : '<p>Cached status is unavailable.</p>'}</body></html>`;
}

/** Pure router so the security boundary can be checked without opening a port. */
export function responseFor(method, rawUrl, loader = loadStatus) {
  if (method !== 'GET' && method !== 'HEAD') {
    return { statusCode: 405, type: 'text/plain; charset=utf-8', body: 'method not allowed\n', allow: 'GET, HEAD' };
  }
  const pathname = String(rawUrl || '').split('?', 1)[0];
  if (pathname !== '/' && pathname !== '/status.json') {
    return { statusCode: 404, type: 'text/plain; charset=utf-8', body: 'not found\n' };
  }
  const status = loader();
  const body = pathname === '/status.json' ? `${JSON.stringify(status)}\n` : renderPage(status);
  return {
    statusCode: status.ready ? 200 : 503,
    type: pathname === '/status.json' ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
    body,
  };
}

function serve() {
  const server = http.createServer((req, res) => {
    const reply = responseFor(req.method, req.url);
    const headers = {
      ...SECURITY_HEADERS,
      'Content-Type': reply.type,
      'Content-Length': Buffer.byteLength(reply.body),
      ...(reply.allow ? { Allow: reply.allow } : {}),
    };
    res.writeHead(reply.statusCode, headers);
    res.end(req.method === 'HEAD' ? undefined : reply.body);
  });
  server.headersTimeout = 5_000;
  server.requestTimeout = 5_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 32;
  server.on('error', () => {
    console.error(JSON.stringify({ ok: false, state: 'listen-failed' }));
    process.exitCode = 1;
  });
  server.listen(PORT, HOST, () => console.log(JSON.stringify({ ok: true, state: 'listening', port: PORT })));
}

function selfCheck() {
  const now = Date.parse('2026-07-20T20:00:00.000Z');
  const base = {
    schema: 'demigod.control-plane/2', version: 2, at: new Date(now - 30_000).toISOString(), health: 80,
    healthLabel: 'solid', demandStarved: false, frozen: false,
    truthEvidence: { green: true, summary: 'TRUTH PASS disk=v684 live=v684' },
    nextCanon: { fullyShipped: true, versions: { disk: '684', manifest: '684' }, truthEvidence: { summary: 'TRUTH PASS disk=v684' } },
    modules: {
      site: { metrics: { foot: 'foot v684', smoke: true } },
      match: { metrics: { inboxNew: 1, pairs: 2, realProposed: 0 } },
      review: { metrics: { fail: false, count: 0 } },
      workloop: { metrics: { ok: true } },
    },
    dms: { sentConfirmed: 0 }, board: { roles: 3, realRoles: 0, honestyPass: true }, lock: { foot: false },
    email: 'poison@example.com', name: 'Poison Name', command: 'rm poison', path: '/home/poison', freeText: '<script>poison</script>',
  };
  const foot = "/*dg-foot-v684-core*/ window.dgFootVersion='v684'; console.log('foot v684-core loaded'); window.__dgFootVer='684';";
  const ready = statusFromText(JSON.stringify(base), foot, now, now - 60_000);
  assert.equal(ready.state, 'ready');
  assert.deepEqual(Object.keys(ready).sort(), [
    'boardHonest', 'demandStarved', 'footLockHeld', 'frozen', 'fullyShipped', 'healthScore', 'healthState',
    'inboxNewCount', 'loopOk', 'pairCount', 'ready', 'realProposedCount', 'realRoleCount', 'reviewFail',
    'reviewFindingCount', 'roleCount', 'schemaVersion', 'sentConfirmed', 'smokePass', 'snapshotAgeSec',
    'sourceVersion', 'state', 'truthGreen',
  ].sort());
  for (const poison of ['poison@example.com', 'Poison Name', 'rm poison', '/home/poison', '<script>']) {
    assert.equal(JSON.stringify(ready).includes(poison), false);
  }
  assert.equal(projectStatus({ ...base, at: new Date(now - MAX_AGE_MS - 1).toISOString() }, 684, now).state, 'stale');
  assert.equal(projectStatus({ ...base, at: new Date(now + 1).toISOString() }, 684, now).state, 'future');
  assert.equal(projectStatus({ ...base, nextCanon: { ...base.nextCanon, versions: { disk: '683', manifest: '684' } } }, 684, now).state, 'version-mismatch');
  assert.equal(projectStatus({ ...base, modules: { ...base.modules, workloop: { metrics: { ok: null } } } }, 684, now).loopOk, null);
  assert.equal(projectStatus({ ...base, healthLabel: 'truth-failed' }, 684, now).healthState, 'truth-failed');
  assert.equal(statusFromText('{', foot, now).state, 'invalid');
  assert.equal(statusFromText(JSON.stringify(base), foot.replace('v684-core loaded', 'v683-core loaded'), now).state, 'version-mismatch');
  let loads = 0;
  assert.equal(responseFor('POST', '/status.json', () => { loads++; return ready; }).statusCode, 405);
  assert.equal(responseFor('GET', '/api/status', () => { loads++; return ready; }).statusCode, 404);
  assert.equal(loads, 0);
  assert.equal(responseFor('GET', '/status.json', () => ready).statusCode, 200);
  assert.equal(Object.keys(SECURITY_HEADERS).some((key) => key.toLowerCase().startsWith('access-control-')), false);
  console.log(JSON.stringify({ ok: true, checks: 16 }));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--self-check')) selfCheck();
  else serve();
}
