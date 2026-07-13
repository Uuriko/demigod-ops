#!/usr/bin/env node
/** Ensure local webhook + tunnel are healthy; rewire live footer if URL drifted. */
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { resolveWebhookPublicUrl } from './demigod-webhook-url.mjs';
import { extractLiveWebhookUrl } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-WEBHOOK-ENSURE.json');
const PORT = Number(process.env.DEMIGOD_WEBHOOK_PORT || 9877);
const norm = (u) => String(u || '').trim().replace(/\/?$/, '/');

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

async function liveWebhook() {
  try {
    const r = await fetch(`https://www.trydemigod.com/?v=${Date.now()}`, { signal: AbortSignal.timeout(20000) });
    return extractLiveWebhookUrl(await r.text());
  } catch (_) {
    return '';
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

  let expected = norm(resolveWebhookPublicUrl());
  if (!expected || !(await tunnelHealth(expected))) {
    result.actions.push('tunnel_restart');
    startTunnel();
    expected = await waitForTunnel();
    if (!expected) {
      result.actions.push('tunnel_failed');
      fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
      console.error(JSON.stringify({ ok: false, error: 'tunnel not healthy after restart', out: OUT }));
      process.exit(1);
    }
  }

  const live = norm(await liveWebhook());
  result.expected = expected;
  result.live = live || null;

  if (live !== expected) {
    result.actions.push('rewire');
    const wire = spawnSync('npm', ['run', 'demigod:webhook:wire'], { cwd: ROOT, stdio: 'inherit', timeout: 180000 });
    result.rewireExit = wire.status ?? 1;
    if (wire.status !== 0) {
      fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
      process.exit(1);
    }
    result.live = norm(await liveWebhook());
  }

  result.ok = result.live === expected;
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ok: result.ok, expected, live: result.live, actions: result.actions, out: OUT }));
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });