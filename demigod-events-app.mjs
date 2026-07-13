#!/usr/bin/env node
/**
 * Demigod Events webapp — local static server + optional JSON API.
 *
 *   node demigod-events-app.mjs              # http://127.0.0.1:3460/events
 *   PORT=3461 node demigod-events-app.mjs
 *
 * Serves demigod-events.html + demigod-events-data.json.
 * Public-safe only: does NOT expose sim MATCHES as real placements.
 * Interest form uses mailto:hello@trydemigod.com (no backend spam list).
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const PORT = Number(process.env.PORT || process.env.DEMIGOD_EVENTS_PORT || 3460);
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function readSafe(rel) {
  const p = path.join(ROOT, rel);
  if (!p.startsWith(ROOT)) throw new Error('path');
  return fs.readFileSync(p);
}

function publicData() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'demigod-events-data.json'), 'utf8'));
  // Never merge sim MATCHES into public payload
  raw.matchesPublic = [];
  raw.note = 'Public payload only. Internal MATCHES.json is not exposed.';
  try {
    const board = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-BOARD.json'), 'utf8'));
    const roles = (board.roles || [])
      .filter((r) => r.sample || board.signal?.realRoles === 0)
      .slice(0, 5)
      .map((r) => ({
        title: r.title,
        stage: r.stageType || r.stage || '',
        sample: !!r.sample || true,
        note: r.sample ? 'Labeled sample brief' : 'Board role',
      }));
    if (roles.length) raw.sampleRoles = roles;
    raw.boardSignal = {
      realRoles: board.signal?.realRoles ?? 0,
      realReceipts: board.signal?.realReceipts ?? 0,
    };
  } catch {
    /* keep static samples */
  }
  raw.server = { at: new Date().toISOString(), host: HOST, port: PORT };
  return raw;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  let p = url.pathname;

  // CORS for embed tests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Demigod-Events', 'v1');

  if (p === '/' || p === '/events' || p === '/events/') {
    p = '/demigod-events.html';
  }
  if (p === '/api/events' || p === '/api/events.json') {
    const body = JSON.stringify(publicData(), null, 2);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(body);
    return;
  }
  if (p === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'demigod-events', at: new Date().toISOString() }));
    return;
  }

  // map /demigod-events-data.json to enriched API when ?live=1
  if (p === '/demigod-events-data.json' && url.searchParams.get('live') === '1') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(publicData(), null, 2));
    return;
  }

  const fileRel = p.replace(/^\//, '') || 'demigod-events.html';
  const abs = path.join(ROOT, fileRel);
  if (!abs.startsWith(ROOT) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found. Try /events or /demigod-events.html');
    return;
  }
  const ext = path.extname(abs);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(fs.readFileSync(abs));
});

server.listen(PORT, HOST, () => {
  console.log(JSON.stringify({
    ok: true,
    events: `http://${HOST}:${PORT}/events`,
    html: `http://${HOST}:${PORT}/demigod-events.html`,
    api: `http://${HOST}:${PORT}/api/events`,
    data: `http://${HOST}:${PORT}/demigod-events-data.json`,
  }, null, 2));
});
