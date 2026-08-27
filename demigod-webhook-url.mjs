/** Resolve public submissions webhook URL for footer loader + partner form POSTs. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));

const TUNNEL = path.join(ROOT, 'DEMIGOD-TUNNEL.json');
const SETUP = path.join(ROOT, 'DEMIGOD-WEBHOOK-SETUP.json');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return null;
  }
}

/** @returns {string} trailing-slash webhook POST URL or '' */
export function resolveWebhookPublicUrl() {
  const env = (process.env.DEMIGOD_WEBHOOK_PUBLIC_URL || '').trim();
  if (env) return env.replace(/\/?$/, '/') ;

  const tunnel = readJson(TUNNEL);
  if (tunnel?.webhookUrl) return String(tunnel.webhookUrl).replace(/\/?$/, '/') ;

  const setup = readJson(SETUP);
  if (setup?.webhookUrl) return String(setup.webhookUrl).replace(/\/?$/, '/') ;

  return '';
}
