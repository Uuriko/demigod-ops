#!/usr/bin/env node
/** Local Webflow form webhook receiver → inbox + anonymized board → publish CDN. */
import http from 'http';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import {
  ingestSubmission,
  parseWebhookPayload,
  findSubmission,
  publicStatus,
} from './demigod-submissions-lib.mjs';

const PORT = Number(process.env.DEMIGOD_WEBHOOK_PORT || 9877);
const HOST = process.env.DEMIGOD_WEBHOOK_HOST || '127.0.0.1';
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = Number(process.env.DEMIGOD_WEBHOOK_RATE_MAX || 30);
const CORS_ORIGINS = (process.env.DEMIGOD_WEBHOOK_CORS
  || 'https://www.trydemigod.com,https://trydemigod.com,https://talentlink-sf.webflow.io,http://127.0.0.1:9223')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const hits = new Map();

function corsHeaders(req) {
  const origin = req.headers.origin || '';
  const allow = CORS_ORIGINS.includes(origin) ? origin : (CORS_ORIGINS[0] || '*');
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Webflow-Form',
    'Access-Control-Max-Age': '86400',
  };
}

function rateOk(ip) {
  const now = Date.now();
  const bucket = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (bucket.length >= RATE_MAX) return false;
  bucket.push(now);
  hits.set(ip, bucket);
  return true;
}

function publishBoard() {
  spawnSync('node', ['demigod-board-publish.mjs'], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
}

const server = http.createServer(async (req, res) => {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({ ok: true, service: 'demigod-submissions-webhook' }));
    return;
  }
  if (req.method === 'GET' && /^\/status\/[a-z0-9-]+/i.test(req.url || '')) {
    const id = decodeURIComponent((req.url || '').split('?')[0].slice(8));
    const record = findSubmission(id);
    if (!record) {
      res.writeHead(404, { 'Content-Type': 'application/json', ...cors });
      res.end(JSON.stringify({ ok: false, error: 'not_found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({ ok: true, ...publicStatus(record) }));
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405, cors);
    res.end('Method not allowed');
    return;
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'local';
  if (!rateOk(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({ ok: false, error: 'rate_limited' }));
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const buf = Buffer.concat(chunks);

  try {
    const { name, data } = parseWebhookPayload(buf);
    const formName = name || req.headers['x-webflow-form'] || 'unknown';
    const result = ingestSubmission({ name: formName, data });
    if (result.featured) publishBoard();
    res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({
      ok: true,
      id: result.record.id,
      status: result.record.status,
      featured: !!result.featured,
      reviewRequired: !result.featured,
      form: result.record.form,
    }));
  } catch (e) {
    console.error('[demigod-webhook]', e);
    res.writeHead(500, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(JSON.stringify({
    ok: true,
    url: `http://${HOST}:${PORT}/`,
    health: `http://${HOST}:${PORT}/health`,
    note: 'Point Webflow form webhook here (use ngrok for production)',
  }));
});