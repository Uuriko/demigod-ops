import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SECRET_KEYS = [
  'DEMIGOD_WEBFLOW_WEBHOOK_SECRET_STARTUP',
  'DEMIGOD_WEBFLOW_WEBHOOK_SECRET_ENGINEER',
  'DEMIGOD_WEBFLOW_WEBHOOK_SECRET',
];
const DEFAULT_SECRET_FILE = path.join(os.homedir(), '.config/demigod/webhook.env');

function validSecret(value) {
  const secret = String(value || '').trim();
  return /^[a-f0-9]{32,256}$/i.test(secret) ? secret : '';
}

function readSecretFile(file) {
  if (!file) return {};
  try {
    if ((fs.statSync(file).mode & 0o077) !== 0) return {};
    return Object.fromEntries(fs.readFileSync(file, 'utf8').split('\n').flatMap((line) => {
      const match = line.match(/^([A-Z_]+)=([a-f0-9]{32,256})$/i);
      return match && SECRET_KEYS.includes(match[1]) ? [[match[1], match[2]]] : [];
    }));
  } catch { return {}; }
}

export function resolveWebflowWebhookSecrets(env = process.env, { secretFile = env === process.env ? DEFAULT_SECRET_FILE : null } = {}) {
  const stored = readSecretFile(secretFile);
  return [...new Set(SECRET_KEYS.map((key) => validSecret(env[key]) || validSecret(stored[key])).filter(Boolean))];
}

export function webflowWebhookSecretCoverage(env = process.env, { secretFile = env === process.env ? DEFAULT_SECRET_FILE : null } = {}) {
  const stored = readSecretFile(secretFile);
  const present = (key) => Boolean(validSecret(env[key]) || validSecret(stored[key]));
  const global = present('DEMIGOD_WEBFLOW_WEBHOOK_SECRET');
  return {
    startup: global || present('DEMIGOD_WEBFLOW_WEBHOOK_SECRET_STARTUP'),
    engineer: global || present('DEMIGOD_WEBFLOW_WEBHOOK_SECRET_ENGINEER'),
  };
}

export function persistWebflowWebhookSecrets(secrets = {}, { secretFile = DEFAULT_SECRET_FILE } = {}) {
  const entries = SECRET_KEYS.flatMap((key) => validSecret(secrets[key]) ? [[key, validSecret(secrets[key])]] : []);
  if (!entries.length) throw new Error('no valid Webflow webhook secret to persist');
  fs.mkdirSync(path.dirname(secretFile), { recursive: true, mode: 0o700 });
  const merged = { ...readSecretFile(secretFile), ...Object.fromEntries(entries) };
  const tmp = `${secretFile}.${process.pid}.tmp`;
  const contents = SECRET_KEYS.flatMap((key) => merged[key] ? [`${key}=${merged[key]}`] : []).join('\n') + '\n';
  let created = false;
  try {
    const fd = fs.openSync(tmp, 'wx', 0o600);
    created = true;
    try {
      fs.writeFileSync(fd, contents);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, secretFile);
    created = false;
  } finally {
    if (created) try { fs.unlinkSync(tmp); } catch { /* best-effort cleanup after failed write/rename */ }
  }
  fs.chmodSync(secretFile, 0o600);
  return { secretFile, keyCount: Object.keys(merged).length };
}

export function webhookAuthReadiness(secrets = resolveWebflowWebhookSecrets()) {
  return { mode: secrets.length ? 'webflow-hmac-sha256' : 'compat-unsigned', keyCount: secrets.length };
}

export function webhookAuthSafeToBind(host, secrets = resolveWebflowWebhookSecrets()) {
  return secrets.length > 0 || ['127.0.0.1', '::1', 'localhost'].includes(String(host || '').toLowerCase());
}

export function verifyWebflowWebhook(body, headers = {}, secrets = resolveWebflowWebhookSecrets()) {
  if (!secrets.length) return { allowed: true, ...webhookAuthReadiness(secrets) };
  const timestamp = String(headers['x-webflow-timestamp'] || '').trim();
  const signature = String(headers['x-webflow-signature'] || '').trim();
  if (!/^\d{10,16}$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(signature)) {
    return { allowed: false, ...webhookAuthReadiness(secrets) };
  }
  const provided = Buffer.from(signature, 'hex');
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  let allowed = false;
  for (const secret of secrets) {
    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}:`).update(payload).digest();
    allowed = (expected.length === provided.length && crypto.timingSafeEqual(expected, provided)) || allowed;
  }
  return { allowed, ...webhookAuthReadiness(secrets) };
}
