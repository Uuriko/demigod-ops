#!/usr/bin/env node
/**
 * Resolve Webflow Data API token for server-side scripts (webhooks, CMS CLI).
 * Never put tokens in Custom Code / foot-core.
 *
 * Sources (first hit wins):
 *   1. WEBFLOW_API_TOKEN | WEBFLOW_ACCESS_TOKEN | WEBFLOW_SITE_TOKEN
 *   2. ~/.config/demigod/webflow.env  (KEY=value lines)
 *   3. $ROOT/.secrets/webflow.env     (gitignored if present)
 *
 * Note: MCP OAuth tokens are NOT accepted by api.webflow.com REST (401).
 * Create a site token: Webflow → Site settings → Apps & integrations → API access.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const ENV_CANDIDATES = [
  path.join(os.homedir(), '.config/demigod/webflow.env'),
  path.join(ROOT, '.secrets/webflow.env'),
  path.join(ROOT, 'webflow.env'),
];

const KEYS = ['WEBFLOW_API_TOKEN', 'WEBFLOW_ACCESS_TOKEN', 'WEBFLOW_SITE_TOKEN'];

function parseEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

/** @returns {{ token: string|null, source: string|null, filesChecked: string[] }} */
export function resolveWebflowApiToken() {
  for (const k of KEYS) {
    const v = (process.env[k] || '').trim();
    if (v) return { token: v, source: `env:${k}`, filesChecked: ENV_CANDIDATES };
  }
  const filesChecked = [];
  for (const file of ENV_CANDIDATES) {
    filesChecked.push(file);
    const parsed = parseEnvFile(file);
    for (const k of KEYS) {
      const v = (parsed[k] || '').trim();
      if (v) return { token: v, source: `${file}:${k}`, filesChecked };
    }
  }
  return { token: null, source: null, filesChecked };
}

export function hasWebflowApiToken() {
  return Boolean(resolveWebflowApiToken().token);
}

export const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID || '6a34c484dcedc18a17408187';
export const WEBFLOW_SITE_SLUG = process.env.WEBFLOW_SITE || 'talentlink-sf';

/** Bridge App deep-link — open with Designer signed in; keep panel open for Designer MCP. */
export const WEBFLOW_MCP_BRIDGE_URL =
  process.env.WEBFLOW_MCP_BRIDGE_URL ||
  'https://talentlink-sf.design.webflow.com/?app=dc8209c65e3ec02254d15275ca056539c89f6d15741893a0adf29ad6f381eb99';

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('demigod-webflow-token.mjs')) {
  const r = resolveWebflowApiToken();
  console.log(
    JSON.stringify(
      {
        ok: Boolean(r.token),
        source: r.source,
        hasToken: Boolean(r.token),
        siteId: WEBFLOW_SITE_ID,
        bridgeUrl: WEBFLOW_MCP_BRIDGE_URL,
        filesChecked: r.filesChecked,
        note: r.token
          ? 'token present for REST Data API scripts'
          : 'no site token — use Webflow MCP for Data ops, or set WEBFLOW_API_TOKEN in ~/.config/demigod/webflow.env',
      },
      null,
      2,
    ),
  );
  process.exit(r.token ? 0 : 2);
}
