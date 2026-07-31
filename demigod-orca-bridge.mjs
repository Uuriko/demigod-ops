#!/usr/bin/env node
/**
 * demigod-orca-bridge.mjs — pairing + doctor for Orca mobile ↔ demigod laptop
 *
 * Pairing payload v2 (base64 JSON):
 *   { v, endpoint, deviceToken, publicKeyB64 }
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, execSync } from 'node:child_process';

const ROOT = process.env.DEMIGOD_ROOT || '/home/potter';
const ORCA_CFG = path.join(os.homedir(), '.config/orca');
const RUNTIME = path.join(ORCA_CFG, 'orca-runtime.json');
const DEVICES = path.join(ORCA_CFG, 'orca-devices.json');
const E2EE = path.join(ORCA_CFG, 'orca-e2ee-keypair.json');
const PAIR_TXT = path.join(ROOT, 'orca-pair-code.txt');
const PAIR_HTML = path.join(ROOT, 'orca-pair-code.html');
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const STATUS = path.join(BUSY, 'orca-status.json');

function lanIp() {
  try {
    const out = execSync("hostname -I", { encoding: 'utf8' }).trim().split(/\s+/)[0];
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

function orcaJson(args, timeout = 8000) {
  const run = spawnSync('orca-ide', args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
  });
  if (run.status !== 0) return null;
  try {
    return JSON.parse(run.stdout || '{}');
  } catch {
    return null;
  }
}

// True only when a terminal's tail shows something other than an idle shell prompt.
// Unreadable/empty tail → false: an unproven agent must never be reported as one.
export function tailShowsAgent(tail) {
  if (!Array.isArray(tail)) return false;
  const last = [...tail].reverse().find((line) => String(line).trim() !== '');
  return last != null && !/[$#>]\s*$/.test(String(last));
}

function orchestrationStatus() {
  const cli = orcaJson(['status', '--json']);
  const runtime = cli?.result?.runtime || {};
  const currentRuntimeId = runtime.runtimeId || null;
  const previous = readJson(STATUS);
  const terminalProbe = runtime.reachable
    ? orcaJson(['terminal', 'list', '--worktree', `path:${ROOT}`, '--json'])
    : null;
  const terminalList = terminalProbe?.result || {};
  const terminalRows = terminalList.terminals || [];
  const terminals = terminalRows.filter(
    (terminal) => terminal.worktreePath === ROOT && terminal.orphaned !== true,
  );
  const tabTitles = new Map();
  const indexLayout = (node, tabTitle = null) => {
    if (!node || typeof node !== 'object') return;
    const title = node.panes && typeof node.title === 'string' ? node.title : tabTitle;
    if (node.handle && title) tabTitles.set(node.handle, title);
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') indexLayout(value, title);
    }
  };
  for (const layout of terminalList.visualLayouts || []) indexLayout(layout.root);
  const agentLabel = (terminal) => tabTitles.get(terminal.handle) || terminal.title || '';
  // A tab title is decoration: it outlives the agent that earned it, and Orca keeps the
  // pane alive as a bare shell. Claiming that pane is an agent is worse than reporting
  // none — `terminal send` would type the message into bash, which runs it. So require
  // evidence the pane is NOT sitting at a shell prompt, and fail closed when unknown.
  const live = new Map();
  const hasLiveAgent = (terminal) => {
    if (live.has(terminal.handle)) return live.get(terminal.handle);
    const probe = orcaJson(['terminal', 'read', '--terminal', terminal.handle, '--limit', '40', '--json']);
    const ok = tailShowsAgent(probe?.result?.terminal?.tail);
    live.set(terminal.handle, ok);
    return ok;
  };
  const findAgent = (name) => {
    const previousHandle =
      previous?.runtimeId === currentRuntimeId ? previous?.agents?.[name]?.handle : null;
    const candidates = [
      terminals.find((terminal) => terminal.handle === previousHandle),
      terminals.find((terminal) => new RegExp(`demigod.*${name}`, 'i').test(agentLabel(terminal))),
      terminals.find((terminal) => new RegExp(name, 'i').test(agentLabel(terminal))),
    ].filter(Boolean);
    return candidates.find(hasLiveAgent) || null;
  };
  const project = (terminal) =>
    terminal
      ? {
          handle: terminal.handle,
          title: agentLabel(terminal) || null,
          connected: terminal.connected === true,
          writable: terminal.writable === true,
        }
      : null;
  const claude = findAgent('claude');
  const codex = findAgent('codex');
  const taskProbe = runtime.reachable
    ? orcaJson(['orchestration', 'task-list', '--json'])
    : null;
  const inboxProbe = runtime.reachable
    ? orcaJson(['orchestration', 'inbox', '--limit', '50', '--json'])
    : null;
  const taskRows = taskProbe?.result?.tasks || [];
  const messages = inboxProbe?.result?.messages || [];
  const activeHandles = new Set([claude?.handle, codex?.handle].filter(Boolean));
  const replies = messages
    .filter(
      (message) =>
        /^Re:\s*/.test(String(message.subject || '')) &&
        activeHandles.has(message.from_handle) &&
        activeHandles.has(message.to_handle),
    )
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  let lastRoundTrip = null;
  for (const reply of replies) {
    const subject = String(reply.subject || '').replace(/^Re:\s*/, '');
    const sent = messages.find(
      (message) =>
        message.thread_id === reply.thread_id &&
        message.subject === subject &&
        message.from_handle === reply.to_handle &&
        message.to_handle === reply.from_handle &&
        Date.parse(message.created_at) <= Date.parse(reply.created_at),
    );
    if (!sent) continue;
    lastRoundTrip = {
      ok: true,
      at: reply.created_at,
      ms: Math.max(0, Date.parse(reply.created_at) - Date.parse(sent.created_at)),
      threadId: reply.thread_id || null,
      fromHandle: reply.from_handle,
      toHandle: reply.to_handle,
    };
    break;
  }
  if (
    !lastRoundTrip &&
    previous?.runtimeId === currentRuntimeId &&
    activeHandles.has(previous?.lastRoundTrip?.fromHandle) &&
    activeHandles.has(previous?.lastRoundTrip?.toHandle)
  ) {
    lastRoundTrip = previous.lastRoundTrip;
  }
  const agents = { claude: project(claude), codex: project(codex) };
  const probes = {
    terminals: runtime.reachable ? (terminalProbe?.ok === true ? 'ok' : 'failed') : 'skipped',
    tasks: runtime.reachable ? (taskProbe?.ok === true ? 'ok' : 'failed') : 'skipped',
    inbox: runtime.reachable ? (inboxProbe?.ok === true ? 'ok' : 'failed') : 'skipped',
  };
  const degraded = Object.values(probes).includes('failed');
  const receipt = {
    schema: 'demigod.orca-status/1',
    at: new Date().toISOString(),
    reachable: runtime.reachable === true,
    status:
      degraded
        ? 'degraded'
        : agents.claude?.connected && agents.codex?.connected
          ? 'connected'
          : runtime.reachable
            ? 'runtime-only'
            : 'down',
    runtimeId: currentRuntimeId,
    runtime: {
      state: runtime.state || 'not_running',
      reachable: runtime.reachable === true,
      appVersion: runtime.appVersion || null,
    },
    agents,
    probes,
    terminalCount: terminalProbe?.ok === true ? terminals.length : null,
    unreadCount:
      inboxProbe?.ok === true ? messages.filter((message) => message.read === 0).length : null,
    pendingTaskCount:
      taskProbe?.ok === true
        ? taskRows.filter((task) => !['completed', 'failed'].includes(task.status)).length
        : null,
    lastRoundTrip,
  };
  fs.mkdirSync(BUSY, { recursive: true });
  const tmp = `${STATUS}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(receipt, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, STATUS);
  return receipt;
}

function buildPairingUrl({ lan, port = 6768 } = {}) {
  const rt = readJson(RUNTIME, {});
  const devices = readJson(DEVICES, []) || [];
  const e2ee = readJson(E2EE, {});
  const mobile = devices.find((d) => d.scope === 'mobile') || devices[0];
  const deviceToken = mobile?.token || rt.authToken;
  if (!deviceToken) {
    throw new Error('No device token — open Orca Mobile once or re-pair from UI');
  }
  const publicKeyB64 = e2ee.publicKeyB64;
  if (!publicKeyB64) {
    throw new Error('Missing orca-e2ee-keypair.json publicKeyB64');
  }
  // Prefer LAN for phone; runtime may say 0.0.0.0
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
  const code = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url' in Buffer ? undefined : 'base64');
  // Node base64url available in modern node
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
  fs.writeFileSync(PAIR_TXT, info.url + '\n', { mode: 0o600 });
  try {
    fs.chmodSync(PAIR_TXT, 0o600);
  } catch { /* ignore */ }
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
  fs.writeFileSync(PAIR_HTML, html, { mode: 0o600 });
  try {
    fs.chmodSync(PAIR_HTML, 0o600);
  } catch { /* ignore */ }
  try {
    fs.writeFileSync('/tmp/orca-pair.html', html, { mode: 0o600 });
    fs.writeFileSync('/tmp/orca-pair-url.txt', info.url + '\n', { mode: 0o600 });
    fs.writeFileSync('/tmp/orca-pair-meta.json', JSON.stringify(info, null, 2), { mode: 0o600 });
  } catch { /* ignore */ }
  return { pairTxt: PAIR_TXT, pairHtml: PAIR_HTML, lan };
}

function doctor() {
  const lan = lanIp();
  const rt = readJson(RUNTIME);
  const devices = readJson(DEVICES, []);
  const e2ee = readJson(E2EE);
  const issues = [];
  const ok = [];

  if (rt?.runtimeId) ok.push(`runtime ${rt.runtimeId.slice(0, 8)}…`);
  else issues.push('no orca-runtime.json (Orca not running?)');

  const ws = (rt?.transports || []).find((t) => t.kind === 'websocket');
  if (ws) ok.push(`ws ${ws.endpoint}`);
  else issues.push('no websocket transport');

  if (e2ee?.publicKeyB64) ok.push('e2ee key present');
  else issues.push('missing e2ee keypair');

  if (devices?.length) ok.push(`${devices.length} paired device(s)`);
  else issues.push('no devices in orca-devices.json — phone not paired yet');

  // port checks
  try {
    const ss = execSync('ss -tln', { encoding: 'utf8' });
    if (ss.includes(':6768')) ok.push('port 6768 listening');
    else issues.push('port 6768 not listening');
    if (ss.includes(':9878')) ok.push('control plane :9878');
    else issues.push('dashboard :9878 down — bin/dg-dash');
  } catch { /* ignore */ }

  // keep-awake
  try {
    const pid = fs.readFileSync(path.join(ROOT, '.keep-awake.pid'), 'utf8').trim();
    try {
      process.kill(Number(pid), 0);
      ok.push(`keep-awake pid ${pid}`);
    } catch {
      issues.push('keep-awake pid dead — bin/dg-orca up');
    }
  } catch {
    issues.push('keep-awake not started');
  }

  // CLI
  try {
    const st = execSync('orca-ide status --json', { encoding: 'utf8', timeout: 8000 });
    const d = JSON.parse(st);
    if (d?.result?.runtime?.reachable) ok.push('orca-ide reachable');
    else issues.push('orca-ide status not reachable');
  } catch {
    issues.push('orca-ide status failed');
  }

  // github remote
  try {
    const rem = execSync('git -C /home/potter remote get-url origin', { encoding: 'utf8' }).trim();
    ok.push(`git origin ${rem}`);
  } catch {
    issues.push('no git origin (backup)');
  }

  return { lan, ok, issues, devices: (devices || []).map((d) => ({ name: d.name, scope: d.scope, lastSeenAt: d.lastSeenAt })) };
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
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
      console.log(JSON.stringify({ ...info, payload: undefined, ...paths }, null, 2));
    } else {
      console.log(info.url);
    }
    console.log(info.url);
    return;
  }
  if (cmd === 'doctor') {
    const d = doctor();
    console.log(JSON.stringify(d, null, 2));
    if (d.issues.length) process.exitCode = 1;
    return;
  }
  if (cmd === 'status') {
    const status = orchestrationStatus();
    console.log(JSON.stringify(status, null, 2));
    if (!status.reachable) process.exitCode = 1;
    return;
  }
  console.error('Unknown command', cmd);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
