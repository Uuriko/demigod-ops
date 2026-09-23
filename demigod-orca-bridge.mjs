#!/usr/bin/env node
/**
 * demigod-orca-bridge.mjs — pairing + doctor for Orca mobile ↔ demigod laptop
 *
 * Pair files and the doctor report stay in DEMIGOD_ROOT. The command does not publish.
 *
 * Pairing payload v2 (base64 JSON):
 *   { v, endpoint, deviceToken, publicKeyB64 }
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const localFlags = { sent: false, liveMail: false, livePublish: false };

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || scriptDir();
}
function configDir() {
  return process.env.ORCA_CONFIG_DIR || path.join(os.homedir(), '.config/orca');
}
function pairTxtPath() {
  return path.join(dataRoot(), 'orca-pair-code.txt');
}
function pairHtmlPath() {
  return path.join(dataRoot(), 'orca-pair-code.html');
}
function pairMetaPath() {
  return path.join(dataRoot(), 'orca-pair-meta.json');
}
function doctorPath() {
  return path.join(dataRoot(), 'DEMIGOD-ORCA-DOCTOR.json');
}

function lanIp() {
  try {
    const out = execSync('hostname -I', { encoding: 'utf8', timeout: 2000 }).trim().split(/\s+/)[0];
    return out || '127.0.0.1';
  } catch {
    return '127.0.0.1';
  }
}

function readJson(p, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function readFoot() {
  try {
    return fs.readFileSync(path.join(dataRoot(), 'demigod-foot-core.js'), 'utf8');
  } catch {
    return '';
  }
}

function buildPairingUrl({ lan, port = 6768 } = {}) {
  const dir = configDir();
  const rt = readJson(path.join(dir, 'orca-runtime.json'), {});
  const devices = readJson(path.join(dir, 'orca-devices.json'), []) || [];
  const e2ee = readJson(path.join(dir, 'orca-e2ee-keypair.json'), {});
  const mobile = devices.find((d) => d.scope === 'mobile') || devices[0];
  const deviceToken = mobile?.token || rt.authToken;
  if (!deviceToken) {
    throw new Error('No device token — open Orca Mobile once or re-pair from UI');
  }
  const publicKeyB64 = e2ee.publicKeyB64;
  if (!publicKeyB64) {
    throw new Error('Missing orca-e2ee-keypair.json publicKeyB64');
  }
  let endpoint = `ws://${lan || lanIp()}:${port}`;
  const ws = (rt.transports || []).find((t) => t.kind === 'websocket');
  if (ws?.endpoint) {
    const m = String(ws.endpoint).match(/:(\d+)\s*$/);
    if (m) endpoint = `ws://${lan || lanIp()}:${m[1]}`;
  }
  const payload = {
    v: 2,
    endpoint,
    deviceToken,
    publicKeyB64,
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=+$/, '');
  const url = `orca://pair?code=${b64}`;
  return {
    url,
    endpoint,
    deviceName: mobile?.name || 'mobile',
    deviceId: mobile?.deviceId || null,
    runtimeId: rt.runtimeId || null,
    payload,
  };
}

function writePairFiles(info) {
  const lan = lanIp();
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(pairTxtPath(), info.url + '\n', { mode: 0o600 });
  try { fs.chmodSync(pairTxtPath(), 0o600); } catch { /* ignore */ }
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Orca Pair · Demigod</title>
<style>
body{font:17px system-ui,sans-serif;margin:0;padding:24px;max-width:720px;background:#0b0b0f;color:#f2f2f2}
h1{font-size:1.4rem;margin:0 0 8px}
.sub{color:#9aa;margin-bottom:16px}
textarea{width:100%;min-height:120px;font:12px ui-monospace,monospace;background:#14141c;color:#8ef;border:1px solid #333;border-radius:10px;padding:12px;box-sizing:border-box}
.btn{display:inline-block;margin:14px 8px 0 0;padding:12px 16px;background:#6c5ce7;color:#fff;border-radius:10px;text-decoration:none;font-weight:600}
.btn2{background:#222;border:1px solid #444}
.meta{color:#888;font-size:13px;margin-top:20px;line-height:1.5}
code{background:#222;padding:2px 6px;border-radius:4px;color:#ccc}
.ok{color:#6f6}
</style></head><body>
<h1>Pair phone → Demigod laptop</h1>
<p class="sub">Orca app → <b>Pair</b> → <b>Paste pairing code</b> (not Camera app)</p>
<textarea id="t" readonly>${info.url}</textarea>
<p>
  <a class="btn" href="${info.url}">Open pairing link</a>
  <a class="btn btn2" href="#" onclick="navigator.clipboard.writeText(document.getElementById('t').value);this.textContent='Copied';return false">Copy</a>
</p>
<p class="meta">
  <span class="ok">●</span> Endpoint <code>${info.endpoint}</code><br>
  Device: ${info.deviceName || 'mobile'} · Same Wi‑Fi (or Tailscale) as this laptop<br>
  After pair: open worktree <b>demigod-ops</b> or <b>potter-hub</b> · spawn Grok/Claude/Codex<br>
  CLI: <code>bin/dg-orca status</code> · Control plane: <code>http://127.0.0.1:9878</code>
</p>
<script>const t=document.getElementById('t');t.focus();t.select();</script>
</body></html>`;
  fs.writeFileSync(pairHtmlPath(), html, { mode: 0o600 });
  try { fs.chmodSync(pairHtmlPath(), 0o600); } catch { /* ignore */ }
  const meta = {
    path: pairMetaPath(),
    source: 'disk',
    url: info.url,
    endpoint: info.endpoint,
    deviceName: info.deviceName,
    deviceId: info.deviceId,
    runtimeId: info.runtimeId,
    ...localFlags,
  };
  fs.writeFileSync(pairMetaPath(), JSON.stringify(meta, null, 2), { mode: 0o600 });
  return {
    pairTxt: pairTxtPath(),
    pairHtml: pairHtmlPath(),
    pairMeta: pairMetaPath(),
    lan,
    source: 'disk',
    ...localFlags,
  };
}

function doctor() {
  const lan = lanIp();
  const dir = configDir();
  const rt = readJson(path.join(dir, 'orca-runtime.json'));
  const devices = readJson(path.join(dir, 'orca-devices.json'), []);
  const e2ee = readJson(path.join(dir, 'orca-e2ee-keypair.json'));
  const issues = [];
  const ok = [];
  const foot = readFoot();

  if (rt?.runtimeId) ok.push(`runtime ${rt.runtimeId.slice(0, 8)}…`);
  else issues.push('no orca-runtime.json (Orca not running?)');

  const ws = (rt?.transports || []).find((t) => t.kind === 'websocket');
  if (ws) ok.push(`ws ${ws.endpoint}`);
  else issues.push('no websocket transport');

  if (e2ee?.publicKeyB64) ok.push('e2ee key present');
  else issues.push('missing e2ee keypair');

  if (devices?.length) ok.push(`${devices.length} paired device(s)`);
  else issues.push('no devices in orca-devices.json — phone not paired yet');

  try {
    const ss = execSync('ss -tln', { encoding: 'utf8', timeout: 2000 });
    if (ss.includes(':6768')) ok.push('port 6768 listening');
    else issues.push('port 6768 not listening');
    if (ss.includes(':9878')) ok.push('control plane :9878');
    else issues.push('dashboard :9878 down — bin/dg-dash');
  } catch {
    issues.push('port check unavailable');
  }

  try {
    const pid = fs.readFileSync(path.join(dataRoot(), '.keep-awake.pid'), 'utf8').trim();
    try {
      process.kill(Number(pid), 0);
      ok.push(`keep-awake pid ${pid}`);
    } catch {
      issues.push('keep-awake pid dead — bin/dg-orca up');
    }
  } catch {
    issues.push('keep-awake not started');
  }

  try {
    const st = execSync('orca-ide status --json', { encoding: 'utf8', timeout: 2000 });
    const d = JSON.parse(st);
    if (d?.result?.runtime?.reachable) ok.push('orca-ide reachable');
    else issues.push('orca-ide status not reachable');
  } catch {
    issues.push('orca-ide status failed');
  }

  const gitDir = path.join(dataRoot(), '.git');
  if (fs.existsSync(gitDir)) {
    try {
      const rem = execSync('git remote get-url origin', { cwd: dataRoot(), encoding: 'utf8', timeout: 2000 }).trim();
      ok.push(`git origin ${rem}`);
    } catch {
      issues.push('no git origin (backup)');
    }
  } else {
    issues.push('no git origin (backup)');
  }

  return {
    path: doctorPath(),
    source: 'disk',
    footMarker: (foot.match(/Harbor \S+ keep/) || [''])[0],
    lan,
    ok,
    issues,
    devices: (devices || []).map((d) => ({ name: d.name, scope: d.scope, lastSeenAt: d.lastSeenAt })),
    ...localFlags,
  };
}

function writeDoctor() {
  const d = doctor();
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(doctorPath(), JSON.stringify(d, null, 2));
  console.log(JSON.stringify(d));
  if (d.issues.length) process.exitCode = 1;
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (process.argv.includes('--publish')) {
    console.error(JSON.stringify({ ok: false, error: 'publish_refused', ...localFlags }));
    process.exit(1);
  }
  if (!cmd || cmd === 'help' || cmd === '-h') {
    console.log(`Usage:
  node demigod-orca-bridge.mjs pair [--write]
  node demigod-orca-bridge.mjs doctor
  node demigod-orca-bridge.mjs status`);
    process.exit(0);
  }
  if (cmd === 'pair') {
    const info = buildPairingUrl({ lan: lanIp() });
    const write = rest.includes('--write') || rest.includes('-w');
    if (write) {
      const paths = writePairFiles(info);
      console.log(JSON.stringify({
        ok: true,
        path: paths.pairHtml,
        pairTxt: paths.pairTxt,
        pairMeta: paths.pairMeta,
        deviceName: info.deviceName,
        source: 'disk',
        ...localFlags,
      }));
    } else {
      console.log(info.url);
    }
    return;
  }
  if (cmd === 'doctor' || cmd === 'status') {
    writeDoctor();
    return;
  }
  console.error(JSON.stringify({ ok: false, error: 'unknown_command', ...localFlags }));
  process.exit(1);
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: 'orca_bridge_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
