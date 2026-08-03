#!/usr/bin/env node
/** CDP: register Webflow form_submission webhooks → public tunnel URL. */
import fs from 'fs';
import net from 'node:net';
import path from 'path';
import { ROOT, wlog } from './demigod-turn-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';
import { persistWebflowWebhookSecrets, resolveWebflowWebhookSecrets, webflowWebhookSecretCoverage } from './demigod-webhook-auth.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-WEBHOOK-SETUP-RESULT.json');
const SITE_ID = '6a34c484dcedc18a17408187';
const FORMS = [
  { name: 'startup-hire', key: 'startup' },
  { name: 'engineer-join', key: 'engineer' },
];

function privateIpv4(host) {
  const [a, b] = host.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 0 || b === 168))
    || (a === 198 && (b === 18 || b === 19));
}

function privateIpv6(host) {
  if (/^(?:::|::1$|f[cd]|fe[89ab])/i.test(host)) return true;
  const mapped = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!mapped) return false;
  const value = (parseInt(mapped[1], 16) * 0x10000) + parseInt(mapped[2], 16);
  return privateIpv4([value >>> 24, value >>> 16 & 255, value >>> 8 & 255, value & 255].join('.'));
}

export function validateWebhookTarget(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 2048) return { ok: false, reason: 'target must be 1–2048 characters' };
  let url;
  try { url = new URL(raw); } catch { return { ok: false, reason: 'target must be an absolute URL' }; }
  if (url.protocol !== 'https:') return { ok: false, reason: 'target must use HTTPS' };
  if (url.username || url.password) return { ok: false, reason: 'target must not contain credentials' };
  if (url.hash) return { ok: false, reason: 'target must not contain a fragment' };
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan')) {
    return { ok: false, reason: 'target must use a public hostname' };
  }
  const ipType = net.isIP(host);
  if ((ipType === 4 && privateIpv4(host)) || (ipType === 6 && privateIpv6(host))) {
    return { ok: false, reason: 'target must not use a private IP' };
  }
  if (!ipType && !host.includes('.')) return { ok: false, reason: 'target must use a public hostname' };
  return { ok: true, url: url.href };
}

function resolveWebhookUrl() {
  const env = process.env.DEMIGOD_WEBHOOK_PUBLIC_URL;
  if (env) return { webhookUrl: env.replace(/\/?$/, '/') + (env.endsWith('/') ? '' : ''), source: 'env' };
  const tunnelPath = path.join(ROOT, 'DEMIGOD-TUNNEL.json');
  if (fs.existsSync(tunnelPath)) {
    const t = JSON.parse(fs.readFileSync(tunnelPath, 'utf8'));
    if (t.webhookUrl) return { webhookUrl: t.webhookUrl, source: 'tunnel', tunnelUrl: t.tunnelUrl };
  }
  return { webhookUrl: `http://127.0.0.1:${process.env.DEMIGOD_WEBHOOK_PORT || 9877}/`, source: 'local' };
}

export function priorCreatedWebhooks(report, webhookUrl) {
  if (!report || report.webhookUrl !== webhookUrl) return new Map();
  const api = (report.attempts || []).find((attempt) => attempt?.method === 'api');
  return new Map((api?.results || []).flatMap((result) =>
    result?.ok && result?.secretConfigured && FORMS.some((form) => form.name === result.form)
      && typeof result.id === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(result.id)
      ? [[result.form, result.id]]
      : []));
}

export async function tryApiWebhooks(webhookUrl, { fetchImpl = fetch, secretFile, skipForms = new Map(), configuredKeyCount = 0 } = {}) {
  const target = validateWebhookTarget(webhookUrl);
  if (!target.ok) return { ok: false, method: 'api', reason: `invalid webhook target: ${target.reason}`, results: [] };
  webhookUrl = target.url;
  let token = process.env.WEBFLOW_API_TOKEN || process.env.WEBFLOW_ACCESS_TOKEN || process.env.WEBFLOW_SITE_TOKEN;
  if (!token) {
    try {
      const { resolveWebflowApiToken } = await import('./demigod-webflow-token.mjs');
      token = resolveWebflowApiToken().token;
    } catch (_) { /* ignore */ }
  }
  if (!token) return { ok: false, reason: 'no WEBFLOW_API_TOKEN (set env or ~/.config/demigod/webflow.env)' };

  // Library callers must not bypass the CLI main() gate — fail closed before any create.
  const needsCreate = FORMS.some((form) => !skipForms.has(form.name));
  if (needsCreate) assertNotFrozen('webflow-webhook-setup');

  const results = [];
  const captured = {};
  for (const form of FORMS) {
    if (skipForms.has(form.name)) {
      results.push({ form: form.name, status: null, ok: true, id: skipForms.get(form.name), secretConfigured: true, skipped: true });
      continue;
    }
    const body = {
      triggerType: 'form_submission',
      url: webhookUrl,
      filter: { name: form.name },
    };
    let res;
    try {
      res = await fetchImpl(`https://api.webflow.com/v2/sites/${SITE_ID}/webhooks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      results.push({ form: form.name, status: null, ok: false, id: null, secretConfigured: false, error: 'webflow_api_unavailable' });
      continue;
    }
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch (_) { /* ignore */ }
    const secret = typeof json.secretKey === 'string' && /^[a-f0-9]{32,256}$/i.test(json.secretKey.trim())
      ? json.secretKey.trim()
      : '';
    const id = res.ok && typeof json.id === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(json.id) ? json.id : null;
    const accepted = res.ok && Boolean(id);
    if (accepted && secret) captured[`DEMIGOD_WEBFLOW_WEBHOOK_SECRET_${form.key.toUpperCase()}`] = secret;
    results.push({ form: form.name, status: res.status, ok: accepted, id, secretConfigured: Boolean(secret), error: accepted ? undefined : res.ok ? 'webflow_api_invalid_response' : 'webflow_api_error' });
  }
  let persisted = null;
  if (Object.keys(captured).length) persisted = persistWebflowWebhookSecrets(captured, { ...(secretFile ? { secretFile } : {}) });
  const createdCount = results.filter((result) => result.ok && !result.skipped).length;
  return {
    ok: results.every((result) => result.ok && result.secretConfigured),
    method: 'api',
    results,
    secretKeyCount: persisted?.keyCount || configuredKeyCount,
    createdButUnauthenticated: createdCount > 0 && results.some((result) => result.ok && !result.skipped && !result.secretConfigured),
  };
}

async function main() {
  assertNotFrozen('webflow-webhook-setup');
  const { webhookUrl, source, tunnelUrl } = resolveWebhookUrl();
  wlog(`webhook setup target: ${webhookUrl} (${source})`);

  const report = {
    at: new Date().toISOString(),
    webhookUrl,
    source,
    tunnelUrl: tunnelUrl || null,
    forms: FORMS,
    attempts: [],
  };

  let previous = null;
  try { previous = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { /* first setup */ }
  const prior = priorCreatedWebhooks(previous, webhookUrl);
  const configuredKeyCount = resolveWebflowWebhookSecrets().length;
  const coverage = webflowWebhookSecretCoverage();
  const missingPriorKey = [...prior.keys()].some((name) => name === 'startup-hire' ? !coverage.startup : !coverage.engineer);
  if (missingPriorKey) {
    console.log(JSON.stringify({ ok: false, method: 'api', reason: 'prior webhook receipt exists but its private signing key is unavailable; refusing duplicate create' }));
    process.exitCode = 1;
    return;
  }
  const api = await tryApiWebhooks(webhookUrl, { skipForms: prior, configuredKeyCount });
  report.attempts.push(api);
  if (api.ok) {
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ ok: true, method: 'api', webhookUrl, out: OUT }));
    return;
  }
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({
    ok: false,
    method: 'api',
    reason: api.createdButUnauthenticated
      ? 'created webhook response missing usable secretKey'
      : 'authenticated API setup required; unsigned dashboard fallback disabled',
    out: OUT,
  }));
  process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
