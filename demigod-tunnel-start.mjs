#!/usr/bin/env node
/** Start localtunnel to demigod webhook port; save public URL for Webflow. */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';

const PORT = Number(process.env.DEMIGOD_WEBHOOK_PORT || 9877);
const OUT = path.join(ROOT, 'DEMIGOD-TUNNEL.json');

async function healthOk() {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/health`);
    return r.ok;
  } catch (_) {
    return false;
  }
}

async function main() {
  if (!(await healthOk())) {
    console.error(JSON.stringify({ ok: false, error: `webhook not running on :${PORT} — run npm run demigod:submissions:webhook` }));
    process.exit(1);
  }

  const subdomain = (process.env.DEMIGOD_TUNNEL_SUBDOMAIN || 'demigod-trydemigod').trim();
  const ltArgs = ['--yes', 'localtunnel', '--port', String(PORT)];
  if (subdomain) ltArgs.push('--subdomain', subdomain);
  const proc = spawn('npx', ltArgs, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  let url = '';
  const onData = (chunk) => {
    const s = String(chunk);
    const m = s.match(/https:\/\/[^\s]+\.loca\.lt/);
    if (m) url = m[0];
  };
  proc.stdout.on('data', onData);
  proc.stderr.on('data', onData);

  for (let i = 0; i < 30 && !url; i++) await new Promise((r) => setTimeout(r, 500));

  if (!url) {
    proc.kill();
    console.error(JSON.stringify({ ok: false, error: 'tunnel URL not received' }));
    process.exit(1);
  }

  const webhookUrl = `${url}/`;
  fs.writeFileSync(OUT, JSON.stringify({
    at: new Date().toISOString(),
    port: PORT,
    tunnelUrl: url,
    webhookUrl,
    pid: proc.pid,
    subdomain: subdomain || null,
    note: 'Keep this process running; Webflow POSTs to webhookUrl. Set DEMIGOD_TUNNEL_SUBDOMAIN for stable URL.',
  }, null, 2));

  console.log(JSON.stringify({ ok: true, webhookUrl, out: OUT, pid: proc.pid }));

  proc.on('exit', (code) => {
    fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), exited: true, code }, null, 2));
  });

  // Keep tunnel alive when run directly
  if (!process.argv.includes('--print-only')) {
    process.on('SIGINT', () => { proc.kill(); process.exit(0); });
    await new Promise(() => {});
  } else {
    proc.unref();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });