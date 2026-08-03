#!/usr/bin/env node
/** Ensure the local Webflow form receiver and its public tunnel are healthy. */
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { resolveWebhookPublicUrl } from './demigod-webhook-url.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-WEBHOOK-ENSURE.json');
const PORT = Number(process.env.DEMIGOD_WEBHOOK_PORT || 9877);
const norm = (u) => String(u || '').trim().replace(/\/?$/, '/');

export function writeResult(file, result) {
  atomicWrite(file, JSON.stringify(result, null, 2), { mode: 0o600 });
}

async function localHealth() {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/health`, { signal: AbortSignal.timeout(4000) });
    return r.ok;
  } catch (_) {
    return false;
  }
}

async function tunnelHealth(url) {
  if (!url) return false;
  try {
    const r = await fetch(`${norm(url)}health`, {
      headers: { 'Bypass-Tunnel-Reminder': 'true' },
      signal: AbortSignal.timeout(10000),
    });
    return r.ok;
  } catch (_) {
    return false;
  }
}

function startTunnel() {
  const proc = spawn('node', ['demigod-tunnel-start.mjs', '--print-only'], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
  });
  proc.unref();
}

async function waitForTunnel(ms = 25000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const url = resolveWebhookPublicUrl();
    if (url && await tunnelHealth(url)) return norm(url);
    await new Promise((r) => setTimeout(r, 1000));
  }
  return '';
}

async function main() {
  const result = { at: new Date().toISOString(), actions: [] };

  if (!(await localHealth())) {
    console.error(JSON.stringify({ ok: false, error: `webhook not running on :${PORT} — npm run demigod:submissions:webhook` }));
    process.exit(1);
  }

  let publicUrl = norm(resolveWebhookPublicUrl());
  if (!publicUrl || !(await tunnelHealth(publicUrl))) {
    result.actions.push('tunnel_restart');
    startTunnel();
    publicUrl = await waitForTunnel();
    if (!publicUrl) {
      result.actions.push('tunnel_failed');
      writeResult(OUT, result);
      console.error(JSON.stringify({ ok: false, error: 'tunnel not healthy after restart', out: OUT }));
      process.exit(1);
    }
  }

  result.publicUrl = publicUrl;
  result.ok = true;
  writeResult(OUT, result);
  console.log(JSON.stringify({ ok: true, publicUrl, actions: result.actions, out: OUT }));
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
