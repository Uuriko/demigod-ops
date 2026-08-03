#!/usr/bin/env node
/** Local Webflow form webhook receiver → inbox + anonymized board. */
import http from 'http';
import {
  ingestSubmission,
  parseWebhookPayload,
  publicStatus,
} from './demigod-submissions-lib.mjs';
import { privateCapabilityHeaders, webhookOriginPolicy } from './demigod-webhook-origin.mjs';
import { allowWebhookRequest, webhookClientIp } from './demigod-webhook-rate-limit.mjs';
import { resolveWebflowWebhookSecrets, verifyWebflowWebhook, webhookAuthReadiness, webhookAuthSafeToBind } from './demigod-webhook-auth.mjs';

const PORT = Number(process.env.DEMIGOD_WEBHOOK_PORT || 9877);
const HOST = process.env.DEMIGOD_WEBHOOK_HOST || '127.0.0.1';
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = Math.min(1000, Math.max(1, Number(process.env.DEMIGOD_WEBHOOK_RATE_MAX) || 30));
const TRUSTED_PROXIES = (process.env.DEMIGOD_WEBHOOK_TRUSTED_PROXIES || '127.0.0.1,::1').split(',').map((ip) => ip.trim()).filter(Boolean);
const WEBFLOW_SECRETS = resolveWebflowWebhookSecrets();
const WEBFLOW_AUTH = webhookAuthReadiness(WEBFLOW_SECRETS);
if (!webhookAuthSafeToBind(HOST, WEBFLOW_SECRETS)) throw new Error('Refusing public webhook bind without a Webflow signing secret');
const CORS_ORIGINS = (process.env.DEMIGOD_WEBHOOK_CORS
  || 'https://www.trydemigod.com,https://trydemigod.com,https://talentlink-sf.webflow.io,https://talentlink-sf.design.webflow.com,http://127.0.0.1:9223')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const hits = new Map();

function corsHeaders(req) {
  const origin = req.headers.origin || '';
  const policy = webhookOriginPolicy(origin, CORS_ORIGINS);
  return {
    ...(policy.responseOrigin ? { 'Access-Control-Allow-Origin': policy.responseOrigin } : {}),
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Webflow-Form',
    'Access-Control-Max-Age': '86400',
  };
}

function rateOk(ip) {
  return allowWebhookRequest(hits, ip, { windowMs: RATE_WINDOW_MS, max: RATE_MAX });
}

const server = http.createServer(async (req, res) => {
  const cors = corsHeaders(req);
  if (!webhookOriginPolicy(req.headers.origin || '', CORS_ORIGINS).allowed) {
    req.resume();
    res.writeHead(403, { 'Cache-Control': 'no-store', ...cors });
    res.end();
    return;
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({ ok: true, service: 'demigod-submissions-webhook', auth: WEBFLOW_AUTH }));
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405, cors);
    res.end('Method not allowed');
    return;
  }

  const ip = webhookClientIp(req, TRUSTED_PROXIES);
  if (!rateOk(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({ ok: false, error: 'rate_limited' }));
    return;
  }

  const chunks = [];
  let bodySize = 0;
  const MAX_BODY = 256 * 1024; // a form submission is tiny; cap the body so an unbounded stream can't OOM the receiver
  try {
    for await (const chunk of req) {
      bodySize += chunk.length;
      if (bodySize > MAX_BODY) {
        res.writeHead(413, { 'Content-Type': 'application/json', ...cors });
        res.end(JSON.stringify({ ok: false, error: 'payload_too_large' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    }
  } catch {
    // aborted/errored request stream — do not let it become an unhandled rejection that kills the server
    try { res.writeHead(400, { 'Content-Type': 'application/json', ...cors }); res.end('{"ok":false,"error":"bad_request"}'); } catch { /* client gone */ }
    return;
  }
  const buf = Buffer.concat(chunks);
  const auth = verifyWebflowWebhook(buf, req.headers, WEBFLOW_SECRETS);
  if (!auth.allowed) {
    res.writeHead(401, privateCapabilityHeaders(cors));
    res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
    return;
  }

  try {
    const parsed = parseWebhookPayload(buf);
    const { name, data } = parsed;
    // Guard: a payload like {payload:{data:null}} yields data=null; ingestSubmission does Object.entries(data).
    if (!data || typeof data !== 'object') {
      res.writeHead(400, { 'Content-Type': 'application/json', ...cors });
      res.end(JSON.stringify({ ok: false, error: 'invalid_payload' }));
      return;
    }
    const formName = name || req.headers['x-webflow-form'] || 'unknown';
    const result = ingestSubmission({ ...parsed, name: formName });
    res.writeHead(200, privateCapabilityHeaders(cors));
    res.end(JSON.stringify({
      ok: true,
      id: result.record.id,
      status: publicStatus(result.record).status,
      featured: !!result.featured,
      reviewRequired: !result.featured,
      form: result.record.form,
    }));
  } catch (e) {
    // Log the detail server-side; return a generic error to the client. Echoing e.message leaked
    // internal detail to callers (e.g. board_write_refused honesty-gate text, fs paths).
    console.error('[demigod-webhook]', e);
    res.writeHead(500, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({ ok: false, error: 'server_error' }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(JSON.stringify({
    ok: true,
    url: `http://${HOST}:${PORT}/`,
    health: `http://${HOST}:${PORT}/health`,
    auth: WEBFLOW_AUTH,
    note: 'Point Webflow form webhook here (use ngrok for production)',
  }));
});
