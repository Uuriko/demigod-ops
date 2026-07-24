#!/usr/bin/env node
/**
 * demigod-events-online — bring Events Bot API up for live trydemigod.com
 *
 *   node demigod-events-online.mjs           # ensure app + tunnel, write config
 *   node demigod-events-online.mjs status
 *   node demigod-events-online.mjs stop
 *   node demigod-events-online.mjs --publish-config  # push events-api-latest.json to CDN repo
 *
 * Writes: DEMIGOD-EVENTS-API.json, /tmp/dg-busy/events-online/{app.pid,tunnel.pid,url}
 * Public config: Uuriko/demigod-site-cdn events-api-latest.json (jsDelivr + raw.githubusercontent)
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawn, spawnSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  isJunkCalendarTitle,
  isFixtureOfferId,
  offerIsSf,
  hasPublishedInviteUrl,
  normalizeStage,
} from './demigod-events-bot-agent.mjs';
import { assertNotFrozen, status as freezeStatus } from './demigod-publish-freeze.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/** True only when this file is the node entrypoint (not imported for tunnelPidFromPs etc.). */
const isMain =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === __filename;
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const EVENTS_STORE =
  process.env.DEMIGOD_EVENTS_STORE || path.join(ROOT, 'DEMIGOD-EVENTS.json');
const PORT = Number(process.env.DEMIGOD_EVENTS_PORT || 3460);
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const DIR = path.join(BUSY, 'events-online');
const OPS_SECRET_FILE = path.join(DIR, 'ops-secret');
const OPS_SECRET_ENV = path.join(DIR, 'ops-secret.env');
const API_JSON = path.join(ROOT, 'DEMIGOD-EVENTS-API.json');
const PREFERRED_SUB = (process.env.DEMIGOD_EVENTS_TUNNEL_SUBDOMAIN || 'demigod-events-bot').trim();
const CDN_REPO = process.env.DEMIGOD_CDN_REPO || 'Uuriko/demigod-site-cdn';
/** loca.lt health often lands ~8–10s under load; 8s Abort cut true-ups into needHeal thrash. */
export const PUBLIC_HEALTH_TIMEOUT_MS = 12_000;
const cmd = process.argv[2] || 'up';
const wantPublish = process.argv.includes('--publish-config');
const cliArgsValid = (args) => {
  const commands = args.filter((arg) => arg !== '--publish-config');
  return commands.length <= 1 &&
    commands.every((arg) => ['up', 'start', 'status', 'certify', 'stop', 'heal', 'selfcheck', 'ensure-ops', '--help', '-h'].includes(arg));
};

function ensureDir() {
  fs.mkdirSync(DIR, { recursive: true });
}

/**
 * Provision ops secret for draft tick / agent routes (FABLE P0-3).
 * Writes ${DIR}/ops-secret (raw hex, 0600) + ops-secret.env for systemd EnvironmentFile.
 * Never logs or returns the secret in status JSON — callers that need it for curl
 * must read the file themselves.
 * @returns {string} secret (only for process env injection — do not print)
 */
export function ensureOpsSecret(dir = DIR) {
  fs.mkdirSync(dir, { recursive: true });
  const secretFile = path.join(dir, 'ops-secret');
  const secretEnv = path.join(dir, 'ops-secret.env');
  let secret = '';
  try {
    secret = String(fs.readFileSync(secretFile, 'utf8') || '').trim();
  } catch {
    /* */
  }
  if (!/^[a-f0-9]{32,128}$/i.test(secret)) {
    secret = crypto.randomBytes(24).toString('hex');
    fs.writeFileSync(secretFile, secret + '\n', { mode: 0o600 });
    try {
      fs.chmodSync(secretFile, 0o600);
    } catch {
      /* */
    }
  }
  // systemd EnvironmentFile format (key=value, no quotes)
  fs.writeFileSync(secretEnv, `DEMIGOD_EVENTS_OPS_SECRET=${secret}\n`, { mode: 0o600 });
  try {
    fs.chmodSync(secretEnv, 0o600);
  } catch {
    /* */
  }
  return secret;
}

/** True if process environ has non-empty DEMIGOD_EVENTS_OPS_SECRET (never read value out). */
export function appHasOpsSecret(pid) {
  if (!pid) return false;
  try {
    const env = fs.readFileSync(`/proc/${pid}/environ`);
    // key= present with at least one non-null byte after =
    return /DEMIGOD_EVENTS_OPS_SECRET=[^\x00]+/.test(env.toString('binary'));
  } catch {
    return false;
  }
}

export function opsSecretConfigured(dir = DIR) {
  try {
    const s = String(fs.readFileSync(path.join(dir, 'ops-secret'), 'utf8') || '').trim();
    return /^[a-f0-9]{32,128}$/i.test(s);
  } catch {
    return false;
  }
}

export function pidIsInaccessible(errorCode) {
  return errorCode === 'EPERM';
}

function readPid(name) {
  try {
    const p = Number(String(fs.readFileSync(path.join(DIR, name), 'utf8')).trim());
    if (!Number.isInteger(p) || p <= 0) return null;
    try {
      process.kill(p, 0);
      return p;
    } catch (e) {
      // A restricted namespace can see the pid file but not signal the host process.
      // Only ESRCH proves the process is gone; EPERM must preserve host evidence.
      if (pidIsInaccessible(e?.code)) return p;
      // Stale pid file (process gone) — drop so status/heal do not lie
      try {
        fs.unlinkSync(path.join(DIR, name));
      } catch {
        /* */
      }
      return null;
    }
  } catch {
    return null;
  }
}

function writePid(name, pid) {
  fs.writeFileSync(path.join(DIR, name), String(pid) + '\n');
}

/**
 * Resolve Events Bot app PID: pid file → listener on PORT → systemd MainPID.
 * Refreshes app.pid when process is up but file missing (systemd start path).
 */
function resolveAppPid() {
  const fromFile = readPid('app.pid');
  if (fromFile) return fromFile;
  // ss: users:(("name",pid=123,fd=…))
  try {
    const out = execSync(`ss -ltnp 'sport = :${PORT}' 2>/dev/null || true`, {
      encoding: 'utf8',
      timeout: 3000,
    });
    const m = String(out).match(/pid=(\d+)/);
    if (m) {
      const p = Number(m[1]);
      if (p) {
        try {
          process.kill(p, 0);
          writePid('app.pid', p);
          return p;
        } catch {
          /* */
        }
      }
    }
  } catch {
    /* */
  }
  if (eventsBotUnitVisibility() === 'enabled') {
    try {
      const r = systemctlUser(['show', '-p', 'MainPID', '--value', 'demigod-events-bot.service']);
      const p = Number(String(r.stdout || '').trim());
      if (p > 0) {
        try {
          process.kill(p, 0);
          writePid('app.pid', p);
          return p;
        } catch {
          /* */
        }
      }
    } catch {
      /* */
    }
  }
  return null;
}

/**
 * Pure: all tunnel PIDs for PORT from `ps -eo pid,args` (FOCUS #1).
 * Matches cloudflared quick tunnel, localtunnel, and lt for our local port only.
 * Cloudflared host residual: 127.0.0.1 | [127.0.0.1] | localhost | localhost%lo0 |
 *   [::1%lo0] | [::1] | bare ::1 / ::1%lo0 | [0:0:0:0:0:0:0:1] | [::ffff:127.0.0.1] |
 *   [::ffff:7f00:1] | [::] | 0.0.0.0 | [0.0.0.0] (zone-id + expanded ::1 incl.).
 * Port flag residual: --port N · --port=N · --portN (glued long) · lt -p N ·
 *   lt -p=N · lt -pN (glued short) · quoted --port "N" / 'N' / --port="N" / -p "N"
 *   · smart-quoted --port “N” / ‘N’ (Word/iMessage paste residual).
 *   · guillemet --port «N» (FR/Word paste residual).
 *   Unquoted branch keeps \\b after digits so --port34600 ≠ 3460.
 * Order: cloudflared first, then localtunnel, then lt (same preference as status rediscover).
 * @param {string} psOut
 * @param {number} [port]
 * @returns {number[]}
 */
export function tunnelPidsFromPs(psOut, port = PORT) {
  const p = Number(port) || PORT;
  const lines = String(psOut || '').split('\n');
  // Host residual: cloudflared --url http://localhost:PORT / [::1%lo0] / [::1] /
  // [::ffff:127.0.0.1] / [::ffff:7f00:1] / [::] / 0.0.0.0 / [127.0.0.1] / [0.0.0.0]
  // (startTunnel uses 127.0.0.1; manual/heal may use localhost / v6 zone-id /
  // IPv4-mapped decimal|hex / all-if / bracketed IPv4). No leading \\b before host —
  // `[::1]` is non-word so \\b before `[` never matches. Zone-id [::1%…] before
  // plain [::1]; ffff-mapped before bare [::].
  // Zone-id residual: [::1%lo0] / [::%lo0] / mapped+bracket IPv4 %iface before bare forms.
  // Bare unbracket residual: ::1 / ::1%lo0 / 127.0.0.1%lo0 / 0.0.0.0%lo0 (port :N after).
  // Expanded loopback residual: [0:0:0:0:0:0:0:1] / zero-padded [0000:…:0001] (+ optional %iface).
  // Zero-padded last hextet residual: [::01%lo0] / ::0001 (not only [::1%lo0]).
  // [::0]/[::0000] zero-pad all-if; [::ffff:0:127.0.0.1] transitional IPv4-mapped.
  // Bare unbracket mapped residual: ::ffff:127.0.0.1 / ::ffff:7f00:1 (+ optional %iface).
  // Link-local residual: fe80::1 / [fe80::1%lo0] (manual cloudflared --url on iface).
  const cfHost =
    `(?:127\\.0\\.0\\.1(?:%[^\\s:/]+)?|\\[127\\.0\\.0\\.1(?:%[^\\]]+)?\\]|localhost(?:%[^\\s:/]+)?|\\[::0{0,3}1(?:%[^\\]]+)?\\]|::0{0,3}1(?:%[^\\s:/\\]]+)?|\\[(?:0{1,4}:){7}0{0,3}1(?:%[^\\]]+)?\\]|\\[::ffff:(?:0:)?(?:127\\.0\\.0\\.1|7f00:0*1)(?:%[^\\]]+)?\\]|::ffff:(?:0:)?(?:127\\.0\\.0\\.1|7f00:0*1)(?:%[^\\s:/]+)?|\\[fe80::0{0,3}1(?:%[^\\]]+)?\\]|fe80::0{0,3}1(?:%[^\\s:/\\]]+)?|\\[::0{0,4}(?:%[^\\]]+)?\\]|0\\.0\\.0\\.0(?:%[^\\s:/]+)?|\\[0\\.0\\.0\\.0(?:%[^\\]]+)?\\])`;
  // Port residual: --port 3460 | --port=3460 | --port3460 (glued long) |
  // -p 3460 | -p=3460 | -p3460 (glued short) | quoted --port "3460" / '3460' /
  // --port="3460" / -p "3460". Quoted branch needs full quotes (\\b after " fails);
  // unquoted keeps \\b so --port34600 ≠ 3460.
  // Matching quotes only — mismatched `"3460'` / `'3460"` not matched by design (LAST).
  // Smart-quote residual: Word/iMessage paste --port “3460” / ‘3460’ (U+201C/D/8/9).
  // Guillemet residual: FR/Word paste --port «3460» (U+00AB/BB).
  const portFlag = `(?:--port[=\\s]*|-p[=\\s]*)(?:"${p}"|'${p}'|\u201c${p}\u201d|\u2018${p}\u2019|\u00ab${p}\u00bb|${p}\\b)`;
  const patterns = [
    new RegExp(
      `^\\s*(\\d+)\\s+.*\\bcloudflared\\b.*\\btunnel\\b.*${cfHost}:${p}\\b`,
      'i',
    ),
    new RegExp(`^\\s*(\\d+)\\s+.*\\blocaltunnel\\b.*${portFlag}`, 'i'),
    new RegExp(`^\\s*(\\d+)\\s+.*\\blt\\b.*${portFlag}`, 'i'),
  ];
  const seen = new Set();
  const pids = [];
  for (const re of patterns) {
    for (const line of lines) {
      const m = line.match(re);
      if (m) {
        const pid = Number(m[1]);
        if (pid > 0 && !seen.has(pid)) {
          seen.add(pid);
          pids.push(pid);
        }
      }
    }
  }
  return pids;
}

/**
 * Pure: first tunnel PID for PORT from `ps -eo pid,args` (FOCUS #1).
 * Prefers cloudflared, then localtunnel / lt — see tunnelPidsFromPs.
 * @param {string} psOut
 * @param {number} [port]
 * @returns {number|null}
 */
export function tunnelPidFromPs(psOut, port = PORT) {
  const pids = tunnelPidsFromPs(psOut, port);
  return pids.length ? pids[0] : null;
}

/**
 * Resolve public tunnel PID: pid file → live process scan for PORT.
 * Refreshes tunnel.pid when cloudflared/localtunnel is up but file missing
 * (oneshot systemd + detached child often leave status tunnelAlive:false).
 */
function resolveTunnelPid() {
  const fromFile = readPid('tunnel.pid');
  if (fromFile) return fromFile;
  try {
    const out = execSync('ps -eo pid,args 2>/dev/null || true', {
      encoding: 'utf8',
      timeout: 3000,
    });
    const p = tunnelPidFromPs(out, PORT);
    if (p) {
      try {
        process.kill(p, 0);
        writePid('tunnel.pid', p);
        return p;
      } catch (e) {
        if (pidIsInaccessible(e?.code)) {
          writePid('tunnel.pid', p);
          return p;
        }
      }
    }
  } catch {
    /* */
  }
  return null;
}

function killPid(name) {
  const p = readPid(name);
  if (p) {
    try {
      process.kill(p, 'SIGTERM');
    } catch {
      /* */
    }
  }
  try {
    fs.unlinkSync(path.join(DIR, name));
  } catch {
    /* */
  }
}

/**
 * Pure: tunnel root from tunnelUrl *or* apiBase *or* health URL (FOCUS #1 public API).
 * Avoids double-path health probes when status/heal is fed apiBase by mistake.
 *   https://x.trycloudflare.com
 *   https://x.trycloudflare.com/api/events-bot
 *   https://x.trycloudflare.com/api/events-bot/health
 *   https://x.trycloudflare.com/api/events-bot?x=1   (query must not double-path)
 *   https://x.trycloudflare.com/api/events-bot/health#frag
 * → https://x.trycloudflare.com
 */
export function normalizeEventsPublicBase(url) {
  let u = String(url || '').trim();
  if (!u) return '';
  // Drop query/hash first — `?foo` / `#bar` break the path-end strip and
  // would yield root+`/api/events-bot?foo/api/events-bot` (double path).
  u = u.replace(/[?#].*$/, '');
  u = u.replace(/\/+$/, '');
  if (!u) return '';
  // Drop /api/events-bot and any trailing route (/health, /chat, …)
  u = u.replace(/\/api\/events-bot(?:\/.*)?$/i, '');
  return u.replace(/\/+$/, '');
}

/** Pure: public apiBase for foot / DEMIGOD-EVENTS-API.json */
export function eventsPublicApiBase(url) {
  const base = normalizeEventsPublicBase(url);
  return base ? base + '/api/events-bot' : '';
}

function publicConfigUrls() {
  return [
    `https://raw.githubusercontent.com/${CDN_REPO}/main/events-api-latest.json`,
    `https://cdn.jsdelivr.net/gh/${CDN_REPO}@main/events-api-latest.json`,
  ];
}

export function publicConfigMatches(currentApiBase, publishedApiBases = []) {
  return Boolean(currentApiBase) && publishedApiBases.includes(currentApiBase);
}

/** Pure: health probe URL (never double /api/events-bot) */
export function eventsPublicHealthUrl(url) {
  const api = eventsPublicApiBase(url);
  return api ? api + '/health' : '';
}

async function healthLocal() {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/api/events-bot/health`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/**
 * True when this process has native RSVP routes (not a pre-v733 app that only has /health).
 * Stale long-lived apps return plain "Not found. Try /events…" for public-event.
 */
async function localNativeRsvpRoutesOk() {
  try {
    const r = await fetch(
      `http://127.0.0.1:${PORT}/api/events-bot/public-event?id=canary_route_probe`,
      { signal: AbortSignal.timeout(2500) },
    );
    const t = await r.text();
    try {
      const j = JSON.parse(t);
      return !!(j && typeof j === 'object' && 'ok' in j);
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

async function healthPublic(base) {
  const healthUrl = eventsPublicHealthUrl(base);
  if (!healthUrl) return null;
  try {
    const r = await fetch(healthUrl, {
      headers: {
        'Bypass-Tunnel-Reminder': '1',
        'User-Agent': 'Mozilla/5.0 DemigodEventsOnline/1',
      },
      signal: AbortSignal.timeout(PUBLIC_HEALTH_TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const j = await r.json();
    // loca.lt interstitial sometimes 200s HTML-as-empty; require real health body
    if (!j || j.ok !== true) return null;
    return j;
  } catch {
    return null;
  }
}

async function websiteConfigStatus(currentApiBase) {
  const configs = await Promise.all(publicConfigUrls().map(async (url) => {
    try {
      const response = await fetch(url + '?t=' + Date.now(), {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }));
  const apiBases = [...new Set(configs.map((config) => eventsPublicApiBase(config?.apiBase)).filter(Boolean))];
  if (!apiBases.length) return { observable: false, current: null, reachable: null, apiBases: [] };
  const probes = await Promise.all(apiBases.map(healthPublic));
  return {
    observable: true,
    current: publicConfigMatches(currentApiBase, apiBases),
    reachable: probes.some((probe) => probe?.ok === true),
    apiBases,
  };
}

/**
 * Pure-ish: staged prepare-only website config (not live CDN).
 * Operators previously only saw dead published bases and had to open the pending file.
 */
export function readPendingWebsiteConfig(pendingPath, readFile = fs.readFileSync) {
  try {
    const j = JSON.parse(String(readFile(pendingPath, 'utf8') || ''));
    const apiBase = eventsPublicApiBase(j?.apiBase || j?.tunnelUrl || '');
    if (!apiBase) return null;
    return {
      apiBase,
      tunnelUrl: normalizeEventsPublicBase(j?.tunnelUrl || j?.apiBase || '') || null,
      pendingPublish: j?.pendingPublish !== false,
      blockedBy: j?.blockedBy || null,
    };
  } catch {
    return null;
  }
}

function systemctlUser(args, opts = {}) {
  return spawnSync('systemctl', ['--user', ...args], {
    encoding: 'utf8',
    timeout: opts.timeout || 20000,
  });
}

export function systemdUnitVisibility(result) {
  if (result.status === 0) return 'enabled';
  const detail = String(result.stderr || result.stdout || '');
  return /failed to connect to bus|operation not permitted|permission denied|timed out/i.test(detail)
    ? 'unknown'
    : 'disabled';
}

function eventsBotUnitVisibility() {
  return systemdUnitVisibility(systemctlUser(['is-enabled', 'demigod-events-bot.service']));
}

function startApp() {
  const secret = ensureOpsSecret();
  // Prefer systemd unit when available.
  // If the unit is enabled but restart fails, do NOT fall through to detached spawn —
  // that creates an unsupervised orphan (PPID 1) that steals :PORT and forces the unit
  // into permanent EADDRINUSE restart loops (same trap as bin/dg-dash :9878; events: NRestarts 1740+).
  const unitVisibility = eventsBotUnitVisibility();
  if (unitVisibility === 'unknown') {
    throw new Error('events-bot host_unobservable — refusing app kill/spawn');
  }
  if (unitVisibility === 'enabled') {
    const r = systemctlUser(['restart', 'demigod-events-bot.service']);
    if (r.status !== 0) {
      const detail = String(r.stderr || r.stdout || '').trim().slice(0, 240);
      throw new Error(
        `events-bot unit enabled but restart failed — refusing unsupervised spawn on :${PORT}` +
          (detail ? ` (${detail})` : ''),
      );
    }
    let pid = null;
    for (let i = 0; i < 40; i++) {
      const show = systemctlUser(['show', 'demigod-events-bot.service', '-p', 'MainPID', '--value']);
      pid = Number(String(show.stdout || '').trim()) || null;
      if (pid) break;
      spawnSync('sleep', ['0.25']);
    }
    if (pid) writePid('app.pid', pid);
    return pid;
  }
  // detached fallback only when the unit is not enabled at all
  const log = path.join(DIR, 'app.log');
  const out = fs.openSync(log, 'a');
  const child = spawn(process.execPath, ['demigod-events-app.mjs'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: '127.0.0.1',
      DEMIGOD_EVENTS_OPS_SECRET: secret,
    },
    detached: true,
    stdio: ['ignore', out, out],
  });
  child.unref();
  writePid('app.pid', child.pid);
  return child.pid;
}

/**
 * If app is up without OPS secret, restart once so tick routes work.
 * No-op when already configured. Never prints the secret.
 */
function ensureAppOpsSecret() {
  ensureOpsSecret();
  const pid = resolveAppPid();
  if (pid && appHasOpsSecret(pid)) return { ok: true, pid, restarted: false };
  if (eventsBotUnitVisibility() === 'unknown') {
    return { ok: false, error: 'events-bot host_unobservable — refusing app kill/spawn' };
  }
  // restart (startApp always injects secret / EnvironmentFile)
  try {
    // free port if orphan without secret holds it
    if (pid) {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        /* */
      }
      spawnSync('sleep', ['0.4']);
    }
    const next = startApp();
    return { ok: true, pid: next, restarted: true };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

function cloudflaredBin() {
  const home = process.env.HOME || '';
  // Prefer absolute paths first: startTunnel only cgroup-isolates CF when bin includes '/'.
  // Bare "cloudflared" on PATH previously forced detached spawn under useful-loop → killed on restart.
  const cands = [
    process.env.CLOUDFLARED_BIN,
    path.join(home, '.local/bin/cloudflared'),
    '/usr/local/bin/cloudflared',
    '/usr/bin/cloudflared',
    'cloudflared',
  ].filter(Boolean);
  for (const c of cands) {
    try {
      const r = spawnSync(c, ['--version'], { encoding: 'utf8', timeout: 5000 });
      if (r.status !== 0) continue;
      if (String(c).includes('/')) return c;
      // Resolve bare name to absolute so systemd-run isolation can run.
      const which = spawnSync('bash', ['-lc', 'command -v cloudflared'], {
        encoding: 'utf8',
        timeout: 5000,
        env: process.env,
      });
      const abs = String(which.stdout || '').trim().split('\n')[0];
      if (abs && abs.includes('/')) return abs;
      return c;
    } catch {
      /* */
    }
  }
  return '';
}

/** Pure: an explicit ladder choice overrides the service-wide preference. */
export function tunnelAttemptUsesCloudflared(
  opts = {},
  configured = process.env.DEMIGOD_EVENTS_TUNNEL,
) {
  return opts.forceCloudflared != null
    ? !!opts.forceCloudflared
    : configured === 'cloudflared';
}

/**
 * Soft preference for *new* tunnel selection (heal ladder order).
 * Must NOT gate preserve-of-healthy: DEMIGOD_EVENTS_TUNNEL=cloudflared used to
 * skip stable loca.lt and thrash-rotate every heal (CF miss → random loca).
 */
export function tunnelUrlMatchesPreference(url, configured = process.env.DEMIGOD_EVENTS_TUNNEL) {
  return configured !== 'cloudflared' || /\.trycloudflare\.com(\/|$)/i.test(String(url || ''));
}

/** Transient user unit so heal-from-useful-loop does not put CF in useful-loop's cgroup. */
const TUNNEL_RUN_UNIT = 'demigod-events-tunnel-run';

/**
 * Pure: argv for systemd-run --user --no-block (isolation from parent service cgroup).
 * useful-loop restart previously SIGKILL'd detached CF still in its control-group.
 * Only cloudflared (absolute bin) — npx/loca needs full agent PATH; keep those detached.
 */
export function tunnelSystemdRunArgs({
  bin,
  args = [],
  unit = TUNNEL_RUN_UNIT,
  logPath,
  workingDirectory = ROOT,
  pathEnv = '',
} = {}) {
  if (!bin || !logPath || !String(bin).includes('/')) return null;
  const out = [
    '--user',
    '--no-block',
    `--unit=${unit}`,
    `--working-directory=${workingDirectory}`,
    `--property=StandardOutput=append:${logPath}`,
    `--property=StandardError=append:${logPath}`,
  ];
  if (pathEnv) out.push(`--property=Environment=PATH=${pathEnv}`);
  out.push(bin, ...args);
  return out;
}

function stopTunnelRunUnit() {
  systemctlUser(['stop', `${TUNNEL_RUN_UNIT}.service`], { timeout: 15000 });
  systemctlUser(['reset-failed', `${TUNNEL_RUN_UNIT}.service`], { timeout: 10000 });
}

function tunnelRunUnitMainPid() {
  const show = systemctlUser(['show', `${TUNNEL_RUN_UNIT}.service`, '-p', 'MainPID', '--value']);
  const p = Number(String(show.stdout || '').trim());
  return Number.isInteger(p) && p > 0 ? p : null;
}

function tunnelRunUnitActive() {
  const r = systemctlUser(['is-active', `${TUNNEL_RUN_UNIT}.service`]);
  return String(r.stdout || '').trim() === 'active';
}

/**
 * Start public tunnel. opts.randomSub: skip preferred subdomain (loca.lt often dies on sticky names).
 * opts.forceCloudflared: use cloudflared quick tunnel when available.
 * Cloudflared → systemd-run transient unit (cgroup-isolated); loca/npx → detached spawn.
 */
function startTunnel(opts = {}) {
  const log = path.join(DIR, 'tunnel.log');
  fs.writeFileSync(log, '');
  const cf = cloudflaredBin();
  const forceCf = tunnelAttemptUsesCloudflared(opts);
  let bin;
  let args;
  let kind;
  // Prefer localtunnel; cloudflared when forced or second-chance heal.
  if (cf && forceCf) {
    bin = cf;
    args = ['tunnel', '--url', `http://127.0.0.1:${PORT}`, '--no-autoupdate'];
    kind = 'cloudflared';
  } else {
    bin = 'npx';
    args = ['--yes', 'localtunnel', '--port', String(PORT)];
    if (PREFERRED_SUB && !opts.randomSub) args.push('--subdomain', PREFERRED_SUB);
    kind = opts.randomSub ? 'localtunnel-random' : 'localtunnel';
  }
  fs.writeFileSync(path.join(DIR, 'tunnel-kind'), kind + '\n');

  // CF only: isolate from useful-loop/heal cgroup. npx needs agent PATH → detached.
  if (
    kind === 'cloudflared' &&
    process.env.DEMIGOD_EVENTS_TUNNEL_SYSTEMD !== '0' &&
    String(bin).includes('/')
  ) {
    stopTunnelRunUnit();
    const runArgs = tunnelSystemdRunArgs({
      bin,
      args,
      logPath: log,
      workingDirectory: ROOT,
      pathEnv: process.env.PATH || '',
    });
    const r = spawnSync('systemd-run', runArgs, {
      encoding: 'utf8',
      timeout: 20000,
      env: process.env,
    });
    if (r.status === 0) {
      let pid = null;
      for (let i = 0; i < 50; i++) {
        if (tunnelRunUnitActive()) {
          pid = tunnelRunUnitMainPid();
          if (pid) {
            try {
              process.kill(pid, 0);
              writePid('tunnel.pid', pid);
              return pid;
            } catch {
              /* still starting */
            }
          }
        }
        spawnSync('sleep', ['0.1']);
      }
      stopTunnelRunUnit();
    }
  }

  const outFd = fs.openSync(log, 'a');
  const child = spawn(bin, args, {
    cwd: ROOT,
    env: process.env,
    detached: true,
    stdio: ['ignore', outFd, outFd],
  });
  try {
    fs.closeSync(outFd);
  } catch {
    /* */
  }
  child.unref();
  writePid('tunnel.pid', child.pid);
  return child.pid;
}

/**
 * Kill recorded + stray tunnels for our port (localtunnel / cloudflared).
 * Same host/port residual as tunnelPidsFromPs (127.0.0.1 | [127.0.0.1] |
 * localhost | [::1%lo0] | [::1] | [::ffff:127.0.0.1] | [::] | 0.0.0.0 | [0.0.0.0] ·
 * --port=N · --portN · -p N · -p=N · -pN · --port "N" / 'N' / --port="N")
 * — prior awk only matched 127.0.0.1 and left localhost/[::1]/zone/[::]/0.0.0.0
 * /bracketed-IPv4 and equals/glued/quoted --port/-p orphans on heal.
 */
function killStrayTunnels() {
  stopTunnelRunUnit();
  killPid('tunnel.pid');
  try {
    const out = execSync('ps -eo pid,args 2>/dev/null || true', {
      encoding: 'utf8',
      timeout: 3000,
    });
    for (const pid of tunnelPidsFromPs(out, PORT)) {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        /* */
      }
    }
  } catch {
    /* */
  }
}

/**
 * Pure: tunnel heal attempt order (FOCUS #1 public API).
 * Prefer cloudflared first when last URL was trycloudflare (stay on CF), or a
 * *random* loca host (shared localtunnel relay thrash; no sticky name to preserve).
 * Fresh / preferred sticky loca → reusable subdomain first, then random, then CF.
 * @param {string} url last known public base (may be empty)
 * @param {{ hasCloudflared?: boolean, forceCloudflared?: boolean, preferredSubdomain?: string }} [opts]
 * @returns {{ randomSub: boolean, forceCloudflared: boolean, label: string }[]}
 */
export function tunnelHealAttempts(url, opts = {}) {
  const u = String(url || '');
  const hasCf = opts.hasCloudflared !== false;
  // Explicit opts.forceCloudflared wins; else env DEMIGOD_EVENTS_TUNNEL=cloudflared
  const forceCf = tunnelAttemptUsesCloudflared(opts);
  const wasLoca = /\.loca\.lt(\/|$)/i.test(u);
  const wasCf = /\.trycloudflare\.com(\/|$)/i.test(u);
  const preferred = String(
    opts.preferredSubdomain !== undefined ? opts.preferredSubdomain : PREFERRED_SUB || '',
  )
    .trim()
    .toLowerCase();
  let wasPreferredLoca = false;
  if (wasLoca && preferred) {
    try {
      const host = new URL(u.includes('://') ? u : `https://${u}`).hostname.toLowerCase();
      wasPreferredLoca = host === `${preferred}.loca.lt` || host.startsWith(`${preferred}.`);
    } catch {
      wasPreferredLoca = false;
    }
  }
  // Random loca already requires config republish; CF is usually more stable than the
  // public localtunnel relay (no sticky name left to protect).
  const wasRandomLoca = wasLoca && !wasPreferredLoca;
  const cfFirst = forceCf || wasCf || wasRandomLoca;
  const all = cfFirst
    ? [
        { randomSub: false, forceCloudflared: true, label: 'cloudflared' },
        { randomSub: true, forceCloudflared: false, label: 'loca-random' },
        { randomSub: false, forceCloudflared: false, label: 'loca-preferred' },
      ]
    : [
        { randomSub: false, forceCloudflared: false, label: 'loca-preferred' },
        { randomSub: true, forceCloudflared: false, label: 'loca-random' },
        { randomSub: false, forceCloudflared: true, label: 'cloudflared' },
      ];
  return all.filter((a) => !a.forceCloudflared || hasCf);
}

/**
 * Pure: status should adopt a live tunnel URL from log when the url-file probe
 * failed but a tunnel process is still up (avoids needHeal thrash while heal
 * is single-flight-skipped).
 */
export function statusShouldAdoptLiveTunnel({ publicOk, tunnelPid } = {}) {
  return publicOk !== true && Boolean(tunnelPid);
}

/**
 * Pure-ish helper: if a tunnel process is already up, probe the last log URL
 * before kill/restart (prevents orphaning a healthy CF while url file still
 * points at a dead loca host).
 */
async function tryAdoptLiveTunnelFromLog() {
  const pid = resolveTunnelPid();
  if (!pid) return null;
  let logText = '';
  try {
    logText = fs.readFileSync(path.join(DIR, 'tunnel.log'), 'utf8');
  } catch {
    return null;
  }
  const hit = normalizeEventsPublicBase(lastTunnelUrlFromLog(logText));
  if (!hit) return null;
  const a = await healthPublic(hit);
  if (!a?.ok) return null;
  await new Promise((r) => setTimeout(r, 400));
  const b = await healthPublic(hit);
  if (!b?.ok) return null;
  return { url: hit, pub: b };
}

/**
 * Bring public tunnel up when dead.
 * FOCUS #1: public API health for non-localhost visitors.
 * Ladder via tunnelHealAttempts — avoid thrashing a healthy public URL
 * just because tunnel.pid went stale.
 */
async function ensurePublicTunnel() {
  let url = '';
  try {
    url = normalizeEventsPublicBase(fs.readFileSync(path.join(DIR, 'url'), 'utf8'));
  } catch {
    /* */
  }
  let pub = null;
  // Prefer-stable: keep any healthy public (loca or CF). Preference only orders
  // the ladder when the written URL is dead — do not thrash-rotate healthy loca
  // just because DEMIGOD_EVENTS_TUNNEL=cloudflared (systemd default).
  if (url) {
    const probes = [];
    // loca.lt flakes both ways: require a stable verdict before preserving or rotating.
    for (let i = 0; i < 3; i++) {
      if (i) await new Promise((r) => setTimeout(r, 600));
      pub = await healthPublic(url);
      probes.push(!!pub?.ok);
      const verdict = publicHealthVerdict(probes);
      if (verdict === true) {
        resolveTunnelPid();
        return { url, pub, healed: false };
      }
      if (verdict === false) break;
    }
    // Alternating probes are inconclusive; let the next health cycle retry the same URL.
    if (publicHealthVerdict(probes) === null) {
      return { url, pub: null, healed: false, via: 'unstable' };
    }
  }

  // Written url is missing/dead — but a live CF/loca process may already be healthy.
  // Adopt it instead of killStray → thrash (observed: CF orphan healthy while loca url dead).
  const adopted = await tryAdoptLiveTunnelFromLog();
  if (adopted?.url && adopted?.pub?.ok) {
    return {
      url: adopted.url,
      pub: adopted.pub,
      healed: true,
      via: /\.trycloudflare\.com(\/|$)/i.test(adopted.url)
        ? 'adopt-live-cloudflared'
        : 'adopt-live-tunnel',
    };
  }

  const hasCf = !!cloudflaredBin();
  // Heal ladder uses host shape (trycloudflare vs loca) — root form is fine
  let attempts = tunnelHealAttempts(url, { hasCloudflared: hasCf });

  // Preferred sticky name is often 503/held by others; probing it first burns 25s+ and thrash.
  // If the sticky host is stably dead, skip loca-preferred and go random (or CF) immediately.
  if (PREFERRED_SUB) {
    const prefRoot = `https://${String(PREFERRED_SUB).toLowerCase()}.loca.lt`;
    const prefProbes = [];
    for (let i = 0; i < 2; i++) {
      if (i) await new Promise((r) => setTimeout(r, 400));
      prefProbes.push(!!(await healthPublic(prefRoot))?.ok);
    }
    if (publicHealthVerdict(prefProbes) === false) {
      attempts = filterHealAttemptsWhenPreferredDead(attempts, false);
    }
  }

  // After cloudflared hard-fails (429/1015), skip further CF attempts in this loop.
  let skipCloudflared = false;
  for (const attempt of attempts) {
    const usesCloudflared = tunnelAttemptUsesCloudflared(attempt);
    if (skipCloudflared && usesCloudflared) continue;
    killStrayTunnels();
    await new Promise((r) => setTimeout(r, 350));
    // npx can spawn `lt` after its wrapper receives TERM; sweep that late child once.
    killStrayTunnels();
    startTunnel(attempt);
    url = normalizeEventsPublicBase(parseTunnelUrl(usesCloudflared ? 35000 : 25000));
    if (!url) {
      if (usesCloudflared) {
        try {
          if (tunnelLogGivesUp(fs.readFileSync(path.join(DIR, 'tunnel.log'), 'utf8'))) {
            skipCloudflared = true;
          }
        } catch {
          /* */
        }
      }
      continue;
    }
    // Quick-tunnel DNS can lag the printed URL; give Cloudflare longer than loca.lt.
    // cloudflared even prints "it may take some time to be reachable".
    pub = null;
    if (usesCloudflared) await new Promise((r) => setTimeout(r, 1500));
    const healthAttempts = usesCloudflared ? 28 : 8;
    for (let i = 0; i < healthAttempts && !pub?.ok; i++) {
      await new Promise((r) => setTimeout(r, usesCloudflared ? 800 : 700));
      pub = await healthPublic(url);
    }
    if (pub?.ok) {
      await new Promise((r) => setTimeout(r, 600));
      const pub2 = await healthPublic(url);
      if (pub2?.ok) {
        // localtunnel often ignores --subdomain when sticky is taken — don't claim preferred.
        return { url, pub: pub2, healed: true, via: healViaLabel(attempt.label, url) };
      }
      pub = pub2;
    }
    // CF late-accept: DNS/QUIC sometimes clears only after the first probe window.
    // Prefer keeping a live trycloudflare process over thrashing into flaky loca.lt.
    if (usesCloudflared && url) {
      await new Promise((r) => setTimeout(r, 2500));
      const late = await healthPublic(url);
      if (late?.ok) {
        await new Promise((r) => setTimeout(r, 500));
        const late2 = await healthPublic(url);
        if (late2?.ok) {
          return {
            url,
            pub: late2,
            healed: true,
            via: healViaLabel(attempt.label, url) || 'cloudflared',
          };
        }
      }
      // Process still up + URL in log: give one more patience window before loca thrash.
      // Observed: CF prints URL, first window fails on DNS, killStray then forces loca-random.
      if (resolveTunnelPid()) {
        for (let i = 0; i < 12 && !pub?.ok; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          pub = await healthPublic(url);
        }
        if (pub?.ok) {
          await new Promise((r) => setTimeout(r, 500));
          const hold = await healthPublic(url);
          if (hold?.ok) {
            return {
              url,
              pub: hold,
              healed: true,
              via: 'cloudflared-patience',
            };
          }
        }
      }
    }
  }
  return { url: url || null, pub: pub || null, healed: true, via: 'failed' };
}

/** Pure: drop loca-preferred when sticky host is known dead (avoids thrash). */
export function filterHealAttemptsWhenPreferredDead(attempts, preferredAlive) {
  if (preferredAlive !== false) return attempts || [];
  return (attempts || []).filter((a) => a?.label !== 'loca-preferred');
}

/** Pure: honest heal via when preferred attempt yields a non-preferred URL. */
export function healViaLabel(attemptLabel, url) {
  const label = String(attemptLabel || '');
  if (label === 'loca-preferred' && !preferredTunnelMatch(url)) {
    return 'loca-preferred-miss-random';
  }
  return label || 'unknown';
}

/** Pure: only a stable tail is actionable; null leaves the current tunnel alone. */
export function publicHealthVerdict(oks, need = 2) {
  const tail = (oks || []).slice(-need);
  if (tail.length < need) return null;
  if (tail.every(Boolean)) return true;
  if (tail.every((ok) => !ok)) return false;
  return null;
}

/**
 * Pure: map multi-probe results → publicOk for status/needHeal.
 * Stable true/false wins; inconclusive (loca.lt flake) keeps any-success as up
 * so a single 503 does not thrash heal and rotate a working random tunnel.
 */
export function publicOkFromProbes(oks) {
  const v = publicHealthVerdict(oks);
  if (v === true) return true;
  if (v === false) return false;
  return (oks || []).some(Boolean);
}

/**
 * Sequential public health probes.
 * Early-exit only on stable *up* (fast happy path). Never early-exit on two
 * failures — loca.lt often 503s twice then recovers; cutting short forced
 * needHeal thrash and tunnel rotation of a still-live process.
 */
async function probePublicStable(root, { times = 3, gapMs = 450 } = {}) {
  if (!root) return { pub: null, publicOk: false, oks: [] };
  const oks = [];
  let pub = null;
  for (let i = 0; i < times; i++) {
    if (i) await new Promise((r) => setTimeout(r, gapMs));
    pub = await healthPublic(root);
    oks.push(!!pub?.ok);
    // Only short-circuit when the tunnel is clearly healthy.
    if (publicHealthVerdict(oks) === true) break;
  }
  return { pub, publicOk: publicOkFromProbes(oks), oks };
}

/**
 * Pure: last tunnel URL in a tunnel log by file order.
 * Prefer chronological last match — do not concatenate host-type groups (that made any
 * historical loca.lt win over a newer trycloudflare.com URL printed later in the same log).
 */
export function lastTunnelUrlFromLog(s) {
  const text = String(s || '');
  let last = '';
  for (const m of text.matchAll(/https:\/\/[a-z0-9-]+\.(?:trycloudflare\.com|loca\.lt)/gi)) {
    last = m[0].replace(/\/$/, '');
  }
  return last;
}

/**
 * Pure: cloudflared quick-tunnel hard failures that should not burn the full parse wait.
 * 429 / error 1015 → fall through to loca-random on the heal ladder immediately.
 */
export function tunnelLogGivesUp(s) {
  return /error code:\s*1015|429 Too Many Requests|failed to unmarshal quick Tunnel|Account is restricted/i.test(
    String(s || ''),
  );
}

/** Pure: after CF hard-fail, remaining ladder should not re-spawn cloudflared. */
export function filterHealAttemptsAfterCfGiveUp(attempts, skipCloudflared) {
  if (!skipCloudflared) return attempts || [];
  return (attempts || []).filter((a) => !tunnelAttemptUsesCloudflared(a));
}

/**
 * Single-flight lock for heal/up. Concurrent heals thrash loca/CF and leave
 * tunnel.pid/url lying about a half-killed tunnel.
 * @returns {{ lockPath: string, release: () => void } | null} null if live owner holds lock
 */
export function tryAcquireHealLock(dir = DIR, pid = process.pid, signal = process.kill) {
  fs.mkdirSync(dir, { recursive: true });
  const lockPath = path.join(dir, 'heal.lock');
  const me = String(pid);
  for (let i = 0; i < 2; i++) {
    try {
      const fd = fs.openSync(lockPath, 'wx', 0o600);
      try {
        fs.writeFileSync(fd, me + '\n');
      } catch {
        try {
          fs.closeSync(fd);
        } catch {
          /* */
        }
        try {
          fs.unlinkSync(lockPath);
        } catch {
          /* */
        }
        return null;
      }
      return {
        lockPath,
        release() {
          try {
            fs.closeSync(fd);
          } catch {
            /* */
          }
          try {
            const cur = String(fs.readFileSync(lockPath, 'utf8') || '').trim();
            if (cur === me) fs.unlinkSync(lockPath);
          } catch {
            /* */
          }
        },
      };
    } catch (e) {
      if (e?.code !== 'EEXIST') throw e;
      let owner = 0;
      try {
        const parsed = Number(String(fs.readFileSync(lockPath, 'utf8') || '').trim());
        owner = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
      } catch {
        /* */
      }
      if (owner > 0) {
        try {
          signal(owner, 0);
          return null;
        } catch (e) {
          if (pidIsInaccessible(e?.code)) return null;
        }
      } else {
        // A second process can see the lock between open('wx') and the PID write.
        // Treat fresh ownerless/malformed locks as busy; recover them after a bounded heal window.
        try {
          if (Date.now() - fs.statSync(lockPath).mtimeMs < 240_000) return null;
        } catch {
          return null;
        }
      }
      try {
        fs.unlinkSync(lockPath);
      } catch {
        /* */
      }
    }
  }
  return null;
}

function parseTunnelUrl(timeoutMs = 25000) {
  const log = path.join(DIR, 'tunnel.log');
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const text = fs.readFileSync(log, 'utf8');
      const hit = lastTunnelUrlFromLog(text);
      if (hit) return hit;
      // Do not sit 25–35s after CF rate-limit — next heal attempt is loca-random.
      if (tunnelLogGivesUp(text)) return '';
    } catch {
      /* */
    }
    spawnSync('sleep', ['0.4']);
  }
  return '';
}

/**
 * Pure: when to push events-api-latest.json to CDN.
 * - Publish is request-gated: foreground CLI opt-in and a healthy public base are required.
 */
export function shouldPublishConfig(_prevPublishedBase, nextApiBase, pubOk, force) {
  return Boolean(force && nextApiBase && pubOk);
}

/** The watchdog must heal a dead app as well as a dead public tunnel. */
export function needsHeal(localOk, publicOk) {
  return !localOk || !publicOk;
}

export function statusObservation(localOk, unitVisibility, publicOk = false, processEvidence = false) {
  // Live app/tunnel PID proves the host is reachable enough to observe process state.
  // Prefer honest "down" (heal may run) over host_unobservable (heal suppressed).
  if (!localOk && !publicOk && unitVisibility === 'unknown') {
    return processEvidence ? 'down' : 'host_unobservable';
  }
  return localOk || publicOk ? 'up' : 'down';
}

function readPrevPublishedBase() {
  try {
    const prev = JSON.parse(fs.readFileSync(API_JSON, 'utf8'));
    return prev?.published?.ok ? prev.apiBase || null : null;
  } catch {
    return null;
  }
}

function preferredTunnelMatch(root) {
  if (!PREFERRED_SUB || !root) return null;
  try {
    const host = new URL(root).hostname.toLowerCase();
    const want = String(PREFERRED_SUB).toLowerCase();
    return host === `${want}.loca.lt` || host.startsWith(`${want}.`);
  } catch {
    return false;
  }
}

/**
 * Operator-facing honesty: why preferredTunnelMatch is false.
 * CF quick tunnels (trycloudflare.com) are always random — sticky name is loca.lt only.
 */
export function preferredTunnelNote(root) {
  if (!root) return 'no public tunnel URL';
  const match = preferredTunnelMatch(root);
  if (match) return null;
  try {
    const host = new URL(root.includes('://') ? root : `https://${root}`).hostname.toLowerCase();
    if (host.endsWith('.trycloudflare.com')) {
      return (
        'Cloudflare quick tunnels assign random *.trycloudflare.com hostnames; preferredSubdomain ' +
        `"${PREFERRED_SUB}" is for loca.lt sticky only. Match false is expected until a named CF tunnel + custom domain is configured.`
      );
    }
    if (host.endsWith('.loca.lt') && PREFERRED_SUB) {
      return `Sticky loca preferred is ${PREFERRED_SUB}.loca.lt; live host is ${host}`;
    }
  } catch {
    /* fall through */
  }
  return PREFERRED_SUB
    ? `preferred tunnel name ${PREFERRED_SUB} not matched`
    : 'preferred tunnel name not configured';
}

function writeConfig(tunnelUrl) {
  // Normalize so accidental apiBase paste never writes double-path config
  const root = normalizeEventsPublicBase(tunnelUrl);
  const apiBase = eventsPublicApiBase(root);
  const body = {
    at: new Date().toISOString(),
    port: PORT,
    tunnelUrl: root,
    apiBase,
    preferredSubdomain: PREFERRED_SUB || null,
    preferredTunnelMatch: preferredTunnelMatch(root),
    preferredTunnelNote: preferredTunnelNote(root),
    appPid: resolveAppPid(),
    tunnelPid: resolveTunnelPid(),
    publicConfigUrls: publicConfigUrls(),
    note:
      'Events Bot public API. Foot fetches publicConfigUrls then probes apiBase. Keep bin/dg-events-online up (or systemd-user demigod-events-*).',
  };
  fs.writeFileSync(API_JSON, JSON.stringify(body, null, 2) + '\n');
  fs.writeFileSync(path.join(DIR, 'url'), root + '\n');
  fs.writeFileSync(path.join(DIR, 'api-base'), apiBase + '\n');
  // Always stage CDN payload so an authorized --publish-config is one command.
  try {
    const pendingDir = path.join(BUSY, 'events-bot');
    fs.mkdirSync(pendingDir, { recursive: true });
    const fr = freezeStatus();
    // Freeze is permanently disabled (FREEZE_DISABLED) — do not claim freeze blocks when OFF.
    // External publish still needs exact current-request auth + explicit --publish-config.
    const blockedBy = fr.frozen
      ? 'publish freeze ON'
      : 'current-request auth + explicit --publish-config required (prepare-only)';
    fs.writeFileSync(
      path.join(pendingDir, 'events-api-latest.pending.json'),
      JSON.stringify(
        {
          ...body,
          pendingPublish: true,
          blockedBy,
          freezeOn: Boolean(fr.frozen),
        },
        null,
        2,
      ) + '\n',
    );
  } catch {
    /* non-fatal */
  }
  return body;
}

function publishConfigToCdn(cfg) {
  assertNotFrozen('events-api-config-publish');
  // Prefer token probe — `gh auth status` can false-negative on keyring while token works
  // (same class of gate that blocked events-api-latest.json publish).
  const tok = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8' });
  if (tok.status !== 0 || !(tok.stdout || '').trim()) {
    return { ok: false, error: 'no gh token (gh auth token failed) — config not published' };
  }
  const work = path.join('/tmp', `demigod-events-api-cdn-${Date.now()}`);
  try {
    fs.mkdirSync(work, { recursive: true });
    const clone = spawnSync('gh', ['repo', 'clone', CDN_REPO, work, '--', '--depth=1'], {
      encoding: 'utf8',
      timeout: 120000,
    });
    if (clone.status !== 0) {
      return { ok: false, error: (clone.stderr || clone.stdout || 'clone failed').slice(0, 240) };
    }
    const payload = {
      ...cfg,
      schema: 'demigod.events-api/1',
      publishedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(work, 'events-api-latest.json'), JSON.stringify(payload, null, 2) + '\n');
    const git = (args) => spawnSync('git', args, { cwd: work, encoding: 'utf8', timeout: 60000 });
    git(['config', 'user.email', 'demigod-events@local']);
    git(['config', 'user.name', 'demigod-events-online']);
    git(['add', 'events-api-latest.json']);
    const st = git(['status', '--porcelain']);
    if (!(st.stdout || '').trim()) {
      return { ok: true, skipped: true, reason: 'no change' };
    }
    git(['commit', '-m', `events-api ${cfg.tunnelUrl}`]);
    const push = spawnSync('git', ['push', 'origin', 'HEAD:main'], {
      cwd: work,
      encoding: 'utf8',
      timeout: 120000,
    });
    if (push.status !== 0) {
      return { ok: false, error: (push.stderr || push.stdout || 'push failed').slice(0, 240) };
    }
    const rev = git(['rev-parse', 'HEAD']);
    const sha = (rev.stdout || '').trim().slice(0, 12) || 'main';
    return {
      ok: true,
      raw: `https://raw.githubusercontent.com/${CDN_REPO}/main/events-api-latest.json`,
      jsdelivr: `https://cdn.jsdelivr.net/gh/${CDN_REPO}@${sha}/events-api-latest.json`,
      sha,
    };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  } finally {
    try {
      fs.rmSync(work, { recursive: true, force: true });
    } catch {
      /* */
    }
  }
}

/**
 * Prod store honesty tripwire (FABLE P0-2).
 * Flags junk calendar titles, fixture offer ids, non-SF offers, and dishonest lifecycle state.
 * Pure aside from reading the store file. Never invents rows.
 */
export function storeHygiene(storePath = EVENTS_STORE) {
  const hits = [];
  let store;
  try {
    store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  } catch (error) {
    const hit = { kind: 'store_unreadable', error: error?.code || error?.name || 'invalid_json' };
    return { ok: false, hits: [hit], hitCount: 1, path: storePath };
  }
  for (const c of store.calendarEvents || []) {
    if (c && isJunkCalendarTitle(c.title)) {
      hits.push({ kind: 'calendar_junk', title: String(c.title || '').slice(0, 80) });
    }
  }
  for (const kind of ['sponsor', 'venue', 'volunteer']) {
    for (const o of store.offers?.[kind] || []) {
      if (!o) continue;
      if (isFixtureOfferId(o.id)) {
        hits.push({ kind: 'offer_seed', id: String(o.id), offerKind: kind });
      } else if (!offerIsSf(o)) {
        hits.push({
          kind: 'offer_non_sf',
          id: String(o.id || ''),
          offerKind: kind,
          city: String(o.city || '').slice(0, 60),
        });
      }
    }
  }
  for (const idea of store.ideas || []) {
    if (idea && isJunkCalendarTitle(idea.title)) {
      hits.push({ kind: 'idea_junk', title: String(idea.title || '').slice(0, 80) });
    }
  }
  // run/followup without real published invite = dishonest lifecycle (FABLE run gate)
  const ae = store.activeEvent;
  if (ae && ae.id) {
    const st = normalizeStage(ae.stage) || String(ae.stage || '');
    const hasRsvps = (store.rsvps || []).some((row) => row?.eventId === ae.id);
    const nativeArtifacts = [
      ...['inviteUrl', 'published_url', 'publishedUrl'].filter((field) => {
        try {
          const url = new URL(ae[field]);
          return url.searchParams.get('p') === 'event' && url.searchParams.get('id') === ae.id;
        } catch {
          return false;
        }
      }),
      ...(ae.rsvpTally?.source === 'demigod_native' ? ['rsvpTally'] : []),
      ...((store.platforms?.demigod || []).some((row) => row?.eventId === ae.id)
        ? ['platforms.demigod']
        : []),
    ];
    if (['ideate', 'resource'].includes(st) && !hasRsvps && nativeArtifacts.length) {
      hits.push({
        kind: 'premature_native_rsvp_artifacts',
        id: String(ae.id),
        stage: st,
        artifacts: nativeArtifacts,
      });
    }
    if (['plan', 'rsvp', 'run', 'followup'].includes(st) &&
        (ae.venue?.confirmed !== true || !String(ae.venue.confirmationEvidence || '').trim())) {
      hits.push({
        kind: 'advanced_without_confirmed_venue',
        id: String(ae.id),
        stage: st,
        title: String(ae.title || '').slice(0, 80),
      });
    }
    if ((st === 'run' || st === 'followup') && !hasPublishedInviteUrl(ae, store)) {
      hits.push({
        kind: 'run_without_invite_url',
        id: String(ae.id),
        stage: st,
        title: String(ae.title || '').slice(0, 80),
      });
    }
  }
  return {
    ok: hits.length === 0,
    hits: hits.slice(0, 40),
    hitCount: hits.length,
    path: storePath,
  };
}

async function status(requireCertified = false) {
  const local = await healthLocal();
  let url = '';
  try {
    url = fs.readFileSync(path.join(DIR, 'url'), 'utf8').trim();
  } catch {
    try {
      url = JSON.parse(fs.readFileSync(API_JSON, 'utf8')).tunnelUrl || '';
    } catch {
      /* */
    }
  }
  // Refresh pids when systemd/oneshot left processes up but files missing
  const appPid = resolveAppPid();
  const tunnelPid = resolveTunnelPid();
  let root = normalizeEventsPublicBase(url);
  // Multi-probe: loca.lt single-shot flakes used to set needHeal and thrash tunnels.
  let { publicOk } = await probePublicStable(root);
  // If url file is a dead loca/CF host but a live tunnel process still serves a
  // healthy URL (from tunnel.log), adopt it here — otherwise status stays
  // needHeal while heal is single-flight-skipped ("heal already running").
  if (statusShouldAdoptLiveTunnel({ publicOk, tunnelPid })) {
    const adopted = await tryAdoptLiveTunnelFromLog();
    if (adopted?.url && adopted?.pub?.ok) {
      root = normalizeEventsPublicBase(adopted.url);
      url = root;
      publicOk = true;
      try {
        writeConfig(root);
      } catch {
        try {
          fs.writeFileSync(path.join(DIR, 'url'), root + '\n');
        } catch {
          /* */
        }
      }
    }
  }
  const localOk = !!local?.ok;
  const reachable = localOk || publicOk;
  const observation = statusObservation(
    localOk,
    eventsBotUnitVisibility(),
    publicOk,
    !!(appPid || tunnelPid),
  );
  const hostUnobservable = observation === 'host_unobservable';
  const hygiene = storeHygiene();
  const nativeRsvpRoutes = localOk ? await localNativeRsvpRoutesOk() : false;
  const apiBase = eventsPublicApiBase(root) || null;
  const websiteConfig = await websiteConfigStatus(apiBase);
  const pendingPath = path.join(BUSY, 'events-bot', 'events-api-latest.pending.json');
  const pending = readPendingWebsiteConfig(pendingPath);
  const out = {
    at: new Date().toISOString(),
    ok: hostUnobservable ? null : reachable,
    certified: !hostUnobservable && publicOk && websiteConfig.reachable === true && hygiene.ok && nativeRsvpRoutes === true,
    local: hostUnobservable ? null : localOk,
    public: hostUnobservable ? null : publicOk,
    observation,
    hostUnobservable,
    // Process evidence (rediscovered) — not just pid-file presence.
    // tunnelAlive = process up; public = public health body ok (loca 503 can make process≠public).
    tunnelAlive: hostUnobservable ? null : !!tunnelPid,
    tunnelPublicOk: hostUnobservable ? null : publicOk,
    tunnelUrl: root || null,
    apiBase,
    preferredSubdomain: PREFERRED_SUB || null,
    preferredTunnelMatch: hostUnobservable ? null : preferredTunnelMatch(root),
    preferredTunnelNote: hostUnobservable ? null : preferredTunnelNote(root),
    appPid,
    tunnelPid,
    // Do not read openai from public /health (capability flags only). Env is the ops truth.
    openai: hostUnobservable
      ? null
      : !!(process.env.OPENAI_API_KEY && process.env.DEMIGOD_EVENTS_BOT_MOCK !== '1'),
    needHeal: hostUnobservable
      ? false
      : !reachable || !publicOk || nativeRsvpRoutes === false,
    nativeRsvpRoutes: hostUnobservable ? null : nativeRsvpRoutes,
    websiteConfigObservable: websiteConfig.observable,
    websiteConfigCurrent: websiteConfig.current,
    websiteConfigReachable: websiteConfig.reachable,
    websiteConfigApiBases: websiteConfig.apiBases,
    // Local public can be up while CDN config is stale; pending is prepare-only (publish-config gated).
    // Surface staged base so dash/agents do not confuse dead CDN bases with the pending heal target.
    pendingConfigPath: pendingPath,
    pendingApiBase: pending?.apiBase || null,
    pendingMatchesLocal: pending?.apiBase && apiBase ? pending.apiBase === apiBase : null,
    pendingBlockedBy: pending?.blockedBy || null,
    prepareOnlyWebsiteConfig:
      !hostUnobservable &&
      publicOk === true &&
      websiteConfig.reachable === false,
    storeHygiene: {
      ok: hygiene.ok,
      hitCount: hygiene.hitCount,
      hits: hygiene.hits.slice(0, 12),
    },
    // never include secret value
    opsSecretConfigured: opsSecretConfigured(),
    appHasOpsSecret: hostUnobservable ? null : appHasOpsSecret(appPid),
  };
  atomicWrite(path.join(DIR, 'status.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
  // exit 2: public dead OR store fixture pollution OR stale app missing native RSVP routes
  if (requireCertified) return out.certified ? 0 : 2;
  if (!hygiene.ok) return 2;
  if (hostUnobservable) return 0;
  if (out.ok && out.public && hygiene.ok && nativeRsvpRoutes !== false) return 0;
  if (out.ok && (!out.public || !hygiene.ok || nativeRsvpRoutes === false)) return 2;
  return 1;
}

async function up() {
  ensureDir();
  const healLock = tryAcquireHealLock();
  if (!healLock) {
    // Concurrent heal/up — do not kill tunnels mid-ladder.
    // systemd timer + useful-loop often race: exit 2 here reds the oneshot while a
    // peer heal is already recovering. Peer owns recovery; next tick re-checks.
    let url = '';
    try {
      url = normalizeEventsPublicBase(fs.readFileSync(path.join(DIR, 'url'), 'utf8'));
    } catch {
      /* */
    }
    const local = await healthLocal();
    const pub = url ? await healthPublic(url) : null;
    console.log(
      JSON.stringify({
        ok: true,
        skipped: true,
        reason: 'heal already running',
        local: !!local?.ok,
        public: !!pub?.ok,
        tunnelUrl: url || null,
        apiBase: url ? eventsPublicApiBase(url) : null,
      }),
    );
    process.exit(0);
  }
const exitWith = (code) => {
    healLock.release();
    process.exit(code);
  };
  try {
    ensureOpsSecret();
    // App must run with OPS secret so draft ticks are not stuck 401
    try {
      ensureAppOpsSecret();
    } catch {
      /* startApp path below if still down */
    }
    let local = await healthLocal();
    let nativeOk = local?.ok ? await localNativeRsvpRoutesOk() : false;
    // Stale app can pass /health while missing public-event/rsvp (pre-native binary).
    if (!local?.ok || !nativeOk) {
      try {
        // Prefer systemd restart when unit owns :PORT (supervised), else startApp.
        if (eventsBotUnitVisibility() === 'enabled') {
          systemctlUser(['restart', 'demigod-events-bot.service']);
        } else {
          startApp();
        }
      } catch (e) {
        console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
        exitWith(1);
      }
      for (let i = 0; i < 24 && (!local?.ok || !nativeOk); i++) {
        await new Promise((r) => setTimeout(r, 250));
        local = await healthLocal();
        nativeOk = local?.ok ? await localNativeRsvpRoutesOk() : false;
      }
    }
    if (!local?.ok) {
      console.error(JSON.stringify({
        ok: false,
        error: 'events app health failed on :' + PORT,
        log: path.join(DIR, 'app.log'),
      }));
      exitWith(1);
    }
    if (!nativeOk) {
      console.error(JSON.stringify({
        ok: false,
        error: 'events app missing native RSVP routes (public-event) on :' + PORT,
        log: path.join(DIR, 'app.log'),
      }));
      exitWith(1);
    }

    const tunnel = await ensurePublicTunnel();
    const url = tunnel.url;
    const pub = tunnel.pub;
    if (!url) {
      console.error(
        JSON.stringify({
          ok: false,
          error: 'tunnel URL not received',
          log: path.join(DIR, 'tunnel.log'),
        }),
      );
      exitWith(1);
    }

    // Read prior published base BEFORE writeConfig overwrites DEMIGOD-EVENTS-API.json
    const prevPublishedBase = readPrevPublishedBase();
    const cfg = writeConfig(url);
    let published = null;
    const forcePublish = wantPublish;
    const doPublish = shouldPublishConfig(
      prevPublishedBase,
      cfg.apiBase,
      !!pub?.ok,
      forcePublish,
    );
    // Publish only on an explicit foreground CLI request; recurring service env cannot opt in.
    if (doPublish) {
      published = publishConfigToCdn(cfg);
      if (published?.ok && published.jsdelivr) {
        cfg.published = published;
        fs.writeFileSync(API_JSON, JSON.stringify(cfg, null, 2) + '\n');
      }
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          local: true,
          public: !!pub?.ok,
          healed: !!tunnel.healed,
          via: tunnel.via || null,
          tunnelUrl: url,
          apiBase: cfg.apiBase,
          appPid: cfg.appPid,
          tunnelPid: cfg.tunnelPid,
          publishGate: {
            doPublish,
            force: !!forcePublish,
            prevPublishedBase,
            nextApiBase: cfg.apiBase,
          },
          published,
          apiJson: API_JSON,
        },
        null,
        2,
      ),
    );
    // exit 0 only when public healthy; 2 = local ok public flaky
    exitWith(pub?.ok ? 0 : 2);
  } catch (e) {
    healLock.release();
    throw e;
  }
}

function selfcheck() {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-events-online-selfcheck-'));
  const fails = [];
  const ok = (c, m) => {
    if (!c) fails.push(m);
  };
  ok(!status.toString().includes('ensureOpsSecret'), 'status does not provision ops credentials');
  ok(cliArgsValid(['status']) && !cliArgsValid(['status', '--bogus']), 'CLI rejects unknown flags');
  // DIR may be missing under a custom DEMIGOD_BUSY (selfcheck/CI) — create before pid probe.
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, 'invalid.pid'), '-1\n');
  ok(readPid('invalid.pid') === null, 'negative pid rejected');
  try {
    fs.unlinkSync(path.join(DIR, 'invalid.pid'));
  } catch {
    /* */
  }
  const a = 'https://old.trycloudflare.com/api/events-bot';
  const b = 'https://new.trycloudflare.com/api/events-bot';
  ok(shouldPublishConfig(null, a, true, false) === false, 'null prev without request → skip');
  ok(shouldPublishConfig(a, a, true, false) === false, 'same base → skip');
  ok(shouldPublishConfig(a, b, true, false) === false, 'rotated base without request → skip');
  ok(shouldPublishConfig(a, b, false, false) === false, 'public dead → never');
  ok(shouldPublishConfig(a, a, true, true) === true, 'force + healthy → publish');
  ok(shouldPublishConfig(a, a, false, true) === false, 'force + dead → never');
  ok(shouldPublishConfig(a, '', true, false) === false, 'empty next → never');
  // fail direction: vacuous green guard
  ok(shouldPublishConfig(null, null, true, false) === false, 'null next → never');
  ok(needsHeal(false, false) === true, 'dead app → heal');
  ok(needsHeal(true, false) === true, 'dead tunnel → heal');
  ok(needsHeal(true, true) === false, 'healthy app+tunnel → hold');
  ok(statusObservation(false, 'unknown') === 'host_unobservable', 'blocked host probe → unobservable');
  ok(statusObservation(false, 'unknown', true) === 'up', 'public health proves restricted host is up');
  ok(
    statusObservation(false, 'unknown', false, true) === 'down',
    'process evidence demotes unobservable → down (heal not suppressed)',
  );
  ok(statusObservation(false, 'enabled') === 'down', 'observable dead app → down');
  ok(statusObservation(true, 'unknown') === 'up', 'successful health probe → up');
  ok(
    statusShouldAdoptLiveTunnel({ publicOk: false, tunnelPid: 42 }) === true,
    'statusShouldAdoptLiveTunnel when public dead + process up',
  );
  ok(
    statusShouldAdoptLiveTunnel({ publicOk: true, tunnelPid: 42 }) === false,
    'statusShouldAdoptLiveTunnel skips when public already ok',
  );
  ok(
    statusShouldAdoptLiveTunnel({ publicOk: false, tunnelPid: null }) === false,
    'statusShouldAdoptLiveTunnel skips without tunnel process',
  );
  // Negative control (Claude c251): old 8s Abort would mark measured slow-healthy
  // loca (9.17s) dead → needHeal thrash. Pure threshold proof — no 9s sleep in selfcheck.
  const OLD_PUBLIC_HEALTH_TIMEOUT_MS = 8000;
  const MEASURED_SLOW_HEALTHY_LOCA_MS = 9170;
  ok(
    OLD_PUBLIC_HEALTH_TIMEOUT_MS < MEASURED_SLOW_HEALTHY_LOCA_MS &&
      PUBLIC_HEALTH_TIMEOUT_MS >= MEASURED_SLOW_HEALTHY_LOCA_MS &&
      fs
        .readFileSync(new URL(import.meta.url), 'utf8')
        .includes('AbortSignal.timeout(PUBLIC_HEALTH_TIMEOUT_MS)'),
    'negative-control: old 8s abort fails measured 9.17s healthy loca; PUBLIC_HEALTH_TIMEOUT_MS covers it and is wired',
  );
  ok(
    fs
      .readFileSync(new URL(import.meta.url), 'utf8')
      .includes('statusShouldAdoptLiveTunnel({ publicOk, tunnelPid })'),
    'status path uses statusShouldAdoptLiveTunnel gate',
  );
  ok(
    lastTunnelUrlFromLog(
      'Visit it at https://old-dead-host.trycloudflare.com\nVisit it at https://fresh-live-host.trycloudflare.com\n',
    ) === 'https://fresh-live-host.trycloudflare.com',
    'lastTunnelUrlFromLog prefers last URL',
  );
  ok(
    lastTunnelUrlFromLog(
      'your url is: https://old.loca.lt\nVisit it at https://fresh-cf.trycloudflare.com\n',
    ) === 'https://fresh-cf.trycloudflare.com',
    'lastTunnelUrlFromLog prefers later CF over earlier loca',
  );
  ok(
    lastTunnelUrlFromLog(
      'Visit it at https://a.trycloudflare.com\nyour url is: https://b.loca.lt\n',
    ) === 'https://b.loca.lt',
    'lastTunnelUrlFromLog prefers later loca over earlier CF',
  );
  ok(lastTunnelUrlFromLog('') === '', 'lastTunnelUrlFromLog empty');
  ok(
    tunnelLogGivesUp('ERR error code: 1015 status_code="429 Too Many Requests"') === true,
    'tunnelLogGivesUp CF rate limit',
  );
  ok(tunnelLogGivesUp('Visit it at https://ok.trycloudflare.com') === false, 'tunnelLogGivesUp healthy log');
  ok(
    tunnelAttemptUsesCloudflared({ forceCloudflared: false }, 'cloudflared') === false,
    'explicit loca fallback overrides cloudflared service preference',
  );
  ok(
    tunnelAttemptUsesCloudflared({}, 'cloudflared') === true,
    'cloudflared service preference applies without an explicit attempt',
  );
  ok(
    tunnelUrlMatchesPreference('https://healthy.trycloudflare.com', 'cloudflared') &&
      !tunnelUrlMatchesPreference('https://stale.loca.lt', 'cloudflared') &&
      tunnelUrlMatchesPreference('https://stale.loca.lt', ''),
    'preference helper still ranks CF over loca under cloudflared env (ladder only)',
  );
  ok(
    fs
      .readFileSync(new URL(import.meta.url), 'utf8')
      .includes('Prefer-stable: keep any healthy public') &&
      !/if \(url && tunnelUrlMatchesPreference\(url\)\)/.test(
        fs.readFileSync(new URL(import.meta.url), 'utf8'),
      ),
    'negative-control: ensurePublicTunnel preserves healthy loca without preference gate',
  );
  const sdArgs = tunnelSystemdRunArgs({
    bin: '/usr/bin/cloudflared',
    args: ['tunnel', '--url', 'http://127.0.0.1:3460', '--no-autoupdate'],
    unit: 'demigod-events-tunnel-run',
    logPath: '/tmp/dg-busy/events-online/tunnel.log',
    workingDirectory: '/home/potter',
    pathEnv: '/usr/bin:/bin',
  });
  ok(
    Array.isArray(sdArgs) &&
      sdArgs.includes('--user') &&
      sdArgs.includes('--no-block') &&
      sdArgs.includes('--unit=demigod-events-tunnel-run') &&
      sdArgs.includes('/usr/bin/cloudflared') &&
      sdArgs.includes('--property=Environment=PATH=/usr/bin:/bin') &&
      sdArgs.some((a) => String(a).startsWith('--property=StandardOutput=append:')),
    'tunnelSystemdRunArgs isolates cloudflared under user transient unit',
  );
  ok(tunnelSystemdRunArgs({ bin: 'npx', logPath: '/tmp/x' }) === null, 'tunnelSystemdRunArgs rejects non-absolute bin');
  ok(tunnelSystemdRunArgs({ bin: '', logPath: '/tmp/x' }) === null, 'tunnelSystemdRunArgs needs bin+log');
  const srcOnline = fs.readFileSync(new URL(import.meta.url), 'utf8');
  ok(
    /path\.join\(home, '\.local\/bin\/cloudflared'\)[\s\S]{0,120}'cloudflared'/.test(srcOnline),
    'cloudflaredBin prefers absolute paths before bare name (cgroup isolation)',
  );
  ok(
    /function stop\([\s\S]*?killStrayTunnels\(\)/.test(srcOnline) &&
      /cloudflared-patience/.test(srcOnline),
    'stop() sweeps tunnel strays; CF patience before loca thrash',
  );
  ok(
    readPendingWebsiteConfig('/no/such/pending.json') === null,
    'readPendingWebsiteConfig missing file → null',
  );
  ok(
    readPendingWebsiteConfig('/x', () =>
      JSON.stringify({
        apiBase: 'https://staged.trycloudflare.com/api/events-bot',
        pendingPublish: true,
        blockedBy: 'current-request auth + explicit --publish-config required (prepare-only)',
      }),
    )?.apiBase === 'https://staged.trycloudflare.com/api/events-bot',
    'readPendingWebsiteConfig surfaces staged apiBase',
  );
  ok(
    filterHealAttemptsAfterCfGiveUp(
      [
        { forceCloudflared: true, label: 'cloudflared' },
        { forceCloudflared: false, label: 'loca-random' },
        { forceCloudflared: true, label: 'cloudflared-2' },
      ],
      true,
    )
      .map((a) => a.label)
      .join(',') === 'loca-random',
    'filterHealAttemptsAfterCfGiveUp drops further CF attempts',
  );
  ok(
    filterHealAttemptsAfterCfGiveUp([{ forceCloudflared: true, label: 'cf' }], false).length === 1,
    'filterHealAttemptsAfterCfGiveUp no-op when not skipped',
  );
  ok(publicHealthVerdict([true, true]) === true, 'publicHealthVerdict two ok');
  ok(publicHealthVerdict([false, false]) === false, 'publicHealthVerdict two failures');
  ok(publicHealthVerdict([false, true]) === null, 'publicHealthVerdict mixed is inconclusive');
  ok(publicHealthVerdict([false, true, true]) === true, 'publicHealthVerdict stable tail recovers');
  ok(publicHealthVerdict([true], 2) === null, 'publicHealthVerdict needs two');
  ok(publicOkFromProbes([true, true]) === true, 'publicOkFromProbes stable ok');
  ok(publicOkFromProbes([false, false]) === false, 'publicOkFromProbes stable dead');
  ok(publicOkFromProbes([false, true]) === true, 'publicOkFromProbes flake keeps up (anti-thrash)');
  ok(publicOkFromProbes([true, false, false]) === false, 'publicOkFromProbes recovers to dead');
  ok(publicOkFromProbes([]) === false, 'publicOkFromProbes empty is down');
  ok(publicOkFromProbes([true]) === true, 'publicOkFromProbes single ok is up');
  // Full probe window recovers when early probes fail then succeed (status must not early-exit dead).
  ok(publicOkFromProbes([false, false, true]) === true, 'publicOkFromProbes third-probe recovery is up');
  ok(
    filterHealAttemptsWhenPreferredDead(
      [{ label: 'loca-preferred' }, { label: 'loca-random' }, { label: 'cloudflared' }],
      false,
    ).map((a) => a.label).join(',') === 'loca-random,cloudflared',
    'filterHealAttemptsWhenPreferredDead drops sticky when dead',
  );
  ok(
    filterHealAttemptsWhenPreferredDead([{ label: 'loca-preferred' }], true).length === 1,
    'filterHealAttemptsWhenPreferredDead keeps sticky when alive/unknown',
  );
  ok(healViaLabel('loca-preferred', 'https://random-xyz.loca.lt') === 'loca-preferred-miss-random', 'healViaLabel preferred miss');
  ok(healViaLabel('loca-preferred', 'https://demigod-events-bot.loca.lt') === 'loca-preferred', 'healViaLabel preferred hit');
  ok(healViaLabel('loca-random', 'https://x.loca.lt') === 'loca-random', 'healViaLabel random passthrough');
  {
    const lockDir = path.join(fixtureDir, 'heal-lock');
    const signalError = (code) => () => {
      throw Object.assign(new Error(code), { code });
    };
    // First owner must be this live pid so kill(0) proves the lock is held.
    const a = tryAcquireHealLock(lockDir, process.pid);
    ok(!!a && typeof a.release === 'function', 'tryAcquireHealLock acquires');
    const b = tryAcquireHealLock(lockDir, process.pid + 1);
    ok(b === null, 'tryAcquireHealLock blocks second owner');
    // ok() records failures without throw — never bare .release() on a failed acquire.
    a?.release();
    const c = tryAcquireHealLock(lockDir, process.pid);
    ok(!!c, 'tryAcquireHealLock re-acquires after release');
    c?.release();
    fs.writeFileSync(path.join(lockDir, 'heal.lock'), '');
    const empty = tryAcquireHealLock(lockDir, process.pid);
    ok(
      empty === null && fs.existsSync(path.join(lockDir, 'heal.lock')),
      'tryAcquireHealLock keeps fresh empty owner',
    );
    const stale = new Date(Date.now() - 300_000);
    fs.utimesSync(path.join(lockDir, 'heal.lock'), stale, stale);
    const recovered = tryAcquireHealLock(lockDir, process.pid);
    ok(!!recovered, 'tryAcquireHealLock clears stale empty owner');
    recovered?.release();
    fs.writeFileSync(path.join(lockDir, 'heal.lock'), '999999\n');
    const d = tryAcquireHealLock(lockDir, process.pid, signalError('ESRCH'));
    ok(!!d, 'tryAcquireHealLock releases dead ESRCH owner');
    d?.release();
    fs.writeFileSync(path.join(lockDir, 'heal.lock'), '1\n');
    const e = tryAcquireHealLock(lockDir, process.pid, signalError('EPERM'));
    ok(e === null && fs.existsSync(path.join(lockDir, 'heal.lock')), 'tryAcquireHealLock keeps EPERM owner');
    fs.writeFileSync(path.join(lockDir, 'heal.lock'), '1.5\n');
    const f = tryAcquireHealLock(lockDir, process.pid, signalError('ERR_INVALID_ARG_TYPE'));
    ok(f === null && fs.existsSync(path.join(lockDir, 'heal.lock')), 'tryAcquireHealLock keeps fresh malformed owner');
    const old = new Date(Date.now() - 300_000);
    fs.utimesSync(path.join(lockDir, 'heal.lock'), old, old);
    const g = tryAcquireHealLock(lockDir, process.pid, signalError('ERR_INVALID_ARG_TYPE'));
    ok(!!g, 'tryAcquireHealLock clears stale malformed owner');
    g?.release();
  }

  // ops secret provision: creates file, never empty, chmod-ish
  {
    const s1 = ensureOpsSecret(fixtureDir);
    ok(typeof s1 === 'string' && s1.length >= 32, 'ensureOpsSecret length');
    const s2 = ensureOpsSecret(fixtureDir);
    ok(s1 === s2, 'ensureOpsSecret stable across calls');
    ok(opsSecretConfigured(fixtureDir) === true, 'opsSecretConfigured after ensure');
    ok(fs.existsSync(path.join(fixtureDir, 'ops-secret')) && fs.existsSync(path.join(fixtureDir, 'ops-secret.env')), 'ops secret files exist');
    const envBody = fs.readFileSync(path.join(fixtureDir, 'ops-secret.env'), 'utf8');
    ok(
      envBody.startsWith('DEMIGOD_EVENTS_OPS_SECRET=') && !envBody.includes('\nDEMIGOD'),
      'ops-secret.env single key',
    );
  }

  // storeHygiene: clean prod-shaped object via tmp path; dirty pre-calpurge fails
  {
    const cleanTmp = path.join(fixtureDir, 'hygiene-clean-selfcheck.json');
    fs.writeFileSync(
      cleanTmp,
      JSON.stringify({
        calendarEvents: [
          { title: 'SoMa signal dinner', city: 'San Francisco' },
          { title: 'Mission rooftop hang', city: 'San Francisco' },
        ],
        offers: { sponsor: [], venue: [], volunteer: [] },
        ideas: [],
      }) + '\n',
    );
    const clean = storeHygiene(cleanTmp);
    ok(clean.ok === true && clean.hitCount === 0, 'storeHygiene clean → ok');
    fs.writeFileSync(cleanTmp, JSON.stringify({
      activeEvent: {
        id: 'ev_resource',
        stage: 'resource',
        inviteUrl: 'https://www.trydemigod.com/?p=event&id=ev_resource',
        published_url: 'https://www.trydemigod.com/?p=event&id=ev_resource',
        rsvpTally: { openedAt: '2026-07-22T00:00:00.000Z', source: 'demigod_native' },
      },
      rsvps: [],
      platforms: { demigod: [{ id: 'dg_resource', eventId: 'ev_resource', status: 'published_url' }] },
    }));
    const prematureNative = storeHygiene(cleanTmp);
    ok(
      prematureNative.hits.some((hit) =>
        hit.kind === 'premature_native_rsvp_artifacts' && hit.artifacts.length === 4),
      'storeHygiene reports pre-plan native RSVP contradiction',
    );
    fs.writeFileSync(cleanTmp, JSON.stringify({ activeEvent: { id: 'ev_stale', title: 'SoMa Supper Club', stage: 'plan', venue: { name: 'Sponsor café' } }, offers: {} }));
    const stalePlan = storeHygiene(cleanTmp);
    ok(stalePlan.hits.some((hit) => hit.kind === 'advanced_without_confirmed_venue'), 'storeHygiene rejects plan without confirmed venue evidence');
    const missing = storeHygiene(cleanTmp + '.missing');
    ok(missing.ok === false && missing.hits[0]?.kind === 'store_unreadable', 'storeHygiene missing → fail closed');
    fs.writeFileSync(cleanTmp, '{');
    const malformed = storeHygiene(cleanTmp);
    ok(malformed.ok === false && malformed.hits[0]?.kind === 'store_unreadable', 'storeHygiene malformed → fail closed');
    const dirtySnap = path.join(ROOT, 'DEMIGOD-EVENTS.pre-calpurge-20260717T221556Z.json');
    if (fs.existsSync(dirtySnap)) {
      const dirty = storeHygiene(dirtySnap);
      ok(dirty.ok === false && dirty.hitCount > 0, 'storeHygiene dirty pre-calpurge → hits');
      ok(
        dirty.hits.some((h) => h.kind === 'calendar_junk' || h.kind === 'offer_seed'),
        'storeHygiene dirty has calendar_junk or offer_seed',
      );
    }
    try {
      fs.unlinkSync(cleanTmp);
    } catch {
      /* */
    }
  }

  // FOCUS #1 heal ladder: preserve reusable loca names; retry CF only after CF.
  // forceCloudflared:false isolates from DEMIGOD_EVENTS_TUNNEL env in CI
  const labels = (url, o) => tunnelHealAttempts(url, o).map((x) => x.label);
  ok(
    labels('', { hasCloudflared: true, forceCloudflared: false })[0] ===
      'loca-preferred',
    'fresh start → reusable loca subdomain first',
  );
  ok(
    labels('https://metric-native-drain-banana.trycloudflare.com', {
      hasCloudflared: true,
      forceCloudflared: false,
    })[0] === 'cloudflared',
    'dead trycloudflare → cloudflared first (no loca thrash)',
  );
  ok(
    labels('https://demigod-events-bot.loca.lt', {
      hasCloudflared: true,
      forceCloudflared: false,
    })[0] === 'loca-preferred',
    'dead reusable loca → retry the same subdomain first',
  );
  ok(
    labels('https://shiny-donkeys-report.loca.lt', {
      hasCloudflared: true,
      forceCloudflared: false,
    })[0] === 'cloudflared',
    'dead random loca → cloudflared first (no sticky to preserve)',
  );
  ok(
    labels('https://x.trycloudflare.com', {
      hasCloudflared: false,
      forceCloudflared: false,
    }).every((l) => l !== 'cloudflared'),
    'no cloudflared bin → skip CF attempts',
  );
  ok(
    labels('', { hasCloudflared: true, forceCloudflared: true })[0] ===
      'cloudflared',
    'forceCloudflared → CF first even fresh',
  );

  // FOCUS #1: accept tunnel root *or* apiBase without double /api/events-bot
  const cfRoot = 'https://metric-native-drain-banana.trycloudflare.com';
  const cfApi = cfRoot + '/api/events-bot';
  ok(normalizeEventsPublicBase(cfRoot) === cfRoot, 'norm root stays root');
  ok(normalizeEventsPublicBase(cfApi) === cfRoot, 'norm apiBase → root');
  ok(
    normalizeEventsPublicBase(cfApi + '/health') === cfRoot,
    'norm health URL → root',
  );
  ok(normalizeEventsPublicBase(cfRoot + '/') === cfRoot, 'norm strips trailing slash');
  ok(normalizeEventsPublicBase('') === '', 'norm empty → empty');
  ok(eventsPublicApiBase(cfRoot) === cfApi, 'apiBase from root');
  ok(eventsPublicApiBase(cfApi) === cfApi, 'apiBase from apiBase (no double)');
  ok(
    eventsPublicHealthUrl(cfApi) === cfApi + '/health',
    'health from apiBase (no double path)',
  );
  ok(
    eventsPublicHealthUrl(cfRoot) === cfApi + '/health',
    'health from root',
  );
  ok(
    pidIsInaccessible('EPERM') && !pidIsInaccessible('ESRCH'),
    'pid evidence: EPERM is inaccessible, only ESRCH is gone',
  );
  ok(
    systemdUnitVisibility({
      status: 1,
      stderr: 'Failed to connect to bus: Operation not permitted',
    }) === 'unknown',
    'denied user-systemd → host unobservable',
  );
  ok(eventsPublicHealthUrl('') === '', 'health empty → empty');
  ok(
    eventsPublicApiBase('https://demigod-events-bot.loca.lt/api/events-bot/') ===
      'https://demigod-events-bot.loca.lt/api/events-bot',
    'loca apiBase trailing slash normalized',
  );
  // Query/hash on apiBase or health must not double-path (FOCUS #1 residual)
  ok(
    normalizeEventsPublicBase(cfApi + '?cache=1') === cfRoot,
    'norm apiBase?query → root',
  );
  ok(
    normalizeEventsPublicBase(cfApi + '/health?x=1') === cfRoot,
    'norm health?query → root',
  );
  ok(
    normalizeEventsPublicBase(cfApi + '#frag') === cfRoot,
    'norm apiBase#hash → root',
  );
  ok(
    eventsPublicApiBase(cfApi + '?x=1') === cfApi,
    'apiBase from apiBase?query (no double)',
  );
  ok(
    eventsPublicHealthUrl(cfApi + '?x=1') === cfApi + '/health',
    'health from apiBase?query (no double path)',
  );
  ok(
    eventsPublicApiBase(cfRoot + '/?x=1') === cfApi,
    'apiBase from root?query',
  );

  // FOCUS #1 residual: rediscover tunnel PID from ps when tunnel.pid missing
  {
    const sample = [
      '  111 other-process --port 3460',
      '271592 cloudflared tunnel --url http://127.0.0.1:3460 --no-autoupdate',
      '  222 localtunnel --port 9999',
    ].join('\n');
    ok(
      tunnelPidFromPs(sample, 3460) === 271592,
      'tunnelPidFromPs prefers cloudflared for port',
    );
    ok(
      tunnelPidFromPs('99 localtunnel --port 3460 --subdomain x', 3460) === 99,
      'tunnelPidFromPs localtunnel --port',
    );
    ok(
      tunnelPidFromPs('88 lt --port 3460', 3460) === 88,
      'tunnelPidFromPs lt --port',
    );
    ok(
      tunnelPidFromPs(
        '77 cloudflared tunnel --url http://127.0.0.1:9999 --no-autoupdate',
        3460,
      ) === null,
      'tunnelPidFromPs ignores other ports',
    );
    ok(tunnelPidFromPs('', 3460) === null, 'tunnelPidFromPs empty → null');
    // Residual: cloudflared --url http://localhost:PORT or http://[::1]:PORT
    ok(
      tunnelPidFromPs(
        '333 cloudflared tunnel --url http://localhost:3460 --no-autoupdate',
        3460,
      ) === 333,
      'tunnelPidFromPs cloudflared localhost host',
    );
    // Residual: scoped localhost%lo0 (some dual-stack / BSD pastes)
    ok(
      tunnelPidFromPs(
        '334 cloudflared tunnel --url http://localhost%lo0:3460 --no-autoupdate',
        3460,
      ) === 334,
      'tunnelPidFromPs cloudflared localhost%lo0 zone-id host',
    );
    ok(
      tunnelPidFromPs(
        '444 cloudflared tunnel --url http://[::1]:3460 --no-autoupdate',
        3460,
      ) === 444,
      'tunnelPidFromPs cloudflared [::1] host',
    );
    ok(
      tunnelPidFromPs(
        '445 cloudflared tunnel --url http://[::01%lo0]:3460 --no-autoupdate',
        3460,
      ) === 445,
      'tunnelPidFromPs cloudflared [::01%lo0] zero-pad zone',
    );
    ok(
      tunnelPidFromPs(
        '555 cloudflared tunnel --url http://localhost:9999 --no-autoupdate',
        3460,
      ) === null,
      'tunnelPidFromPs localhost other port ignored',
    );
    // Residual: killStray must see same host residual (not 127.0.0.1-only awk)
    ok(
      JSON.stringify(
        tunnelPidsFromPs(
          [
            '333 cloudflared tunnel --url http://localhost:3460 --no-autoupdate',
            '444 cloudflared tunnel --url http://[::1]:3460 --no-autoupdate',
            '99 localtunnel --port 3460 --subdomain x',
            '77 cloudflared tunnel --url http://127.0.0.1:9999 --no-autoupdate',
          ].join('\n'),
          3460,
        ),
      ) === JSON.stringify([333, 444, 99]),
      'tunnelPidsFromPs multi + host residual (killStray alphabet)',
    );
    ok(
      tunnelPidsFromPs('', 3460).length === 0,
      'tunnelPidsFromPs empty → []',
    );
    // Residual: 0.0.0.0 host + --port=N / lt -p N (killStray + PID rediscover)
    ok(
      tunnelPidFromPs(
        '666 cloudflared tunnel --url http://0.0.0.0:3460 --no-autoupdate',
        3460,
      ) === 666,
      'tunnelPidFromPs cloudflared 0.0.0.0 host',
    );
    ok(
      tunnelPidFromPs(
        '667 cloudflared tunnel --url http://0.0.0.0:9999 --no-autoupdate',
        3460,
      ) === null,
      'tunnelPidFromPs 0.0.0.0 other port ignored',
    );
    ok(
      tunnelPidFromPs('668 localtunnel --port=3460 --subdomain x', 3460) === 668,
      'tunnelPidFromPs localtunnel --port= equals form',
    );
    ok(
      tunnelPidFromPs('669 lt -p 3460', 3460) === 669,
      'tunnelPidFromPs lt -p short form',
    );
    ok(
      tunnelPidFromPs('670 lt --port=3460', 3460) === 670,
      'tunnelPidFromPs lt --port= equals form',
    );
    ok(
      tunnelPidFromPs('671 localtunnel --port=9999', 3460) === null,
      'tunnelPidFromPs --port= other port ignored',
    );
    ok(
      JSON.stringify(
        tunnelPidsFromPs(
          [
            '666 cloudflared tunnel --url http://0.0.0.0:3460 --no-autoupdate',
            '668 localtunnel --port=3460 --subdomain x',
            '669 lt -p 3460',
            '77 cloudflared tunnel --url http://0.0.0.0:9999 --no-autoupdate',
          ].join('\n'),
          3460,
        ),
      ) === JSON.stringify([666, 668, 669]),
      'tunnelPidsFromPs multi + 0.0.0.0/port-flag residual (killStray alphabet)',
    );
    // Residual: IPv6 all-if [::] + lt -p=N equals form (killStray + PID rediscover)
    ok(
      tunnelPidFromPs(
        '772 cloudflared tunnel --url http://[::]:3460 --no-autoupdate',
        3460,
      ) === 772,
      'tunnelPidFromPs cloudflared [::] all-if host',
    );
    ok(
      tunnelPidFromPs(
        '778 cloudflared tunnel --url http://[::0]:3460 --no-autoupdate',
        3460,
      ) === 778,
      'tunnelPidFromPs cloudflared [::0] zero-pad all-if',
    );
    ok(
      tunnelPidFromPs(
        '779 cloudflared tunnel --url http://[::ffff:0:127.0.0.1]:3460 --no-autoupdate',
        3460,
      ) === 779,
      'tunnelPidFromPs [::ffff:0:127.0.0.1] transitional mapped',
    );
    ok(
      tunnelPidFromPs(
        '773 cloudflared tunnel --url http://[::]:9999 --no-autoupdate',
        3460,
      ) === null,
      'tunnelPidFromPs [::] other port ignored',
    );
    ok(
      tunnelPidFromPs(
        '774 cloudflared tunnel --url http://[::1]:3460 --no-autoupdate',
        3460,
      ) === 774,
      'tunnelPidFromPs [::1] still preferred over bare [::] pattern',
    );
    ok(
      tunnelPidFromPs('775 lt -p=3460', 3460) === 775,
      'tunnelPidFromPs lt -p= equals form',
    );
    ok(
      tunnelPidFromPs('776 localtunnel -p=3460 --subdomain x', 3460) === 776,
      'tunnelPidFromPs localtunnel -p= equals form',
    );
    ok(
      tunnelPidFromPs('777 lt -p=9999', 3460) === null,
      'tunnelPidFromPs -p= other port ignored',
    );
    ok(
      JSON.stringify(
        tunnelPidsFromPs(
          [
            '772 cloudflared tunnel --url http://[::]:3460 --no-autoupdate',
            '775 lt -p=3460',
            '776 localtunnel -p=3460 --subdomain x',
            '77 cloudflared tunnel --url http://[::]:9999 --no-autoupdate',
          ].join('\n'),
          3460,
        ),
      ) === JSON.stringify([772, 776, 775]),
      'tunnelPidsFromPs multi + [::]/-p= residual (killStray alphabet)',
    );
    // Residual: lt/localtunnel -pPORT glued short (no space/equals; getopt-style)
    ok(
      tunnelPidFromPs('880 lt -p3460', 3460) === 880,
      'tunnelPidFromPs lt -pPORT glued short form',
    );
    ok(
      tunnelPidFromPs('881 localtunnel -p3460 --subdomain x', 3460) === 881,
      'tunnelPidFromPs localtunnel -pPORT glued short form',
    );
    ok(
      tunnelPidFromPs('882 lt -p9999', 3460) === null,
      'tunnelPidFromPs -pPORT other port ignored',
    );
    ok(
      tunnelPidFromPs('883 lt -p34600', 3460) === null,
      'tunnelPidFromPs -pPORT does not prefix-match longer port',
    );
    ok(
      JSON.stringify(
        tunnelPidsFromPs(
          [
            '772 cloudflared tunnel --url http://[::]:3460 --no-autoupdate',
            '880 lt -p3460',
            '881 localtunnel -p3460 --subdomain x',
            '77 cloudflared tunnel --url http://[::]:9999 --no-autoupdate',
            '882 lt -p9999',
          ].join('\n'),
          3460,
        ),
      ) === JSON.stringify([772, 881, 880]),
      'tunnelPidsFromPs multi + -pPORT glued residual (killStray alphabet)',
    );
    // Residual: lt/localtunnel --portPORT glued long (no space/equals; getopt-style)
    ok(
      tunnelPidFromPs('884 lt --port3460', 3460) === 884,
      'tunnelPidFromPs lt --portPORT glued long form',
    );
    ok(
      tunnelPidFromPs('885 localtunnel --port3460 --subdomain x', 3460) === 885,
      'tunnelPidFromPs localtunnel --portPORT glued long form',
    );
    ok(
      tunnelPidFromPs('886 lt --port9999', 3460) === null,
      'tunnelPidFromPs --portPORT other port ignored',
    );
    ok(
      tunnelPidFromPs('887 lt --port34600', 3460) === null,
      'tunnelPidFromPs --portPORT does not prefix-match longer port',
    );
    ok(
      tunnelPidFromPs('888 lt --port 3460', 3460) === 888,
      'tunnelPidFromPs lt --port space still matches after glued residual',
    );
    ok(
      tunnelPidFromPs('889 lt --port=3460', 3460) === 889,
      'tunnelPidFromPs lt --port= still matches after glued residual',
    );
    ok(
      JSON.stringify(
        tunnelPidsFromPs(
          [
            '990 cloudflared tunnel --url http://[::ffff:127.0.0.1]:3460 --no-autoupdate',
            '884 lt --port3460',
            '885 localtunnel --port3460 --subdomain x',
            '77 cloudflared tunnel --url http://[::ffff:127.0.0.1]:9999 --no-autoupdate',
            '886 lt --port9999',
            '880 lt -p3460',
          ].join('\n'),
          3460,
        ),
      ) === JSON.stringify([990, 885, 884, 880]),
      'tunnelPidsFromPs multi + --portPORT glued residual (killStray alphabet)',
    );
    // Residual: IPv4-mapped loopback [::ffff:127.0.0.1] (CF/node dual-stack print)
    ok(
      tunnelPidFromPs(
        '990 cloudflared tunnel --url http://[::ffff:127.0.0.1]:3460 --no-autoupdate',
        3460,
      ) === 990,
      'tunnelPidFromPs cloudflared [::ffff:127.0.0.1] IPv4-mapped host',
    );
    ok(
      tunnelPidFromPs(
        '991 cloudflared tunnel --url http://[::ffff:127.0.0.1]:9999 --no-autoupdate',
        3460,
      ) === null,
      'tunnelPidFromPs IPv4-mapped other port ignored',
    );
    ok(
      tunnelPidFromPs(
        '992 cloudflared tunnel --url http://[::1]:3460 --no-autoupdate',
        3460,
      ) === 992,
      'tunnelPidFromPs [::1] still matches after IPv4-mapped residual',
    );
    ok(
      tunnelPidFromPs(
        '993 cloudflared tunnel --url http://127.0.0.1:3460 --no-autoupdate',
        3460,
      ) === 993,
      'tunnelPidFromPs 127.0.0.1 still matches after IPv4-mapped residual',
    );
    // Case-insensitive hex in ffff (some ps dumps uppercase)
    ok(
      tunnelPidFromPs(
        '994 cloudflared tunnel --url http://[::FFFF:127.0.0.1]:3460 --no-autoupdate',
        3460,
      ) === 994,
      'tunnelPidFromPs IPv4-mapped host case-insensitive FFFF',
    );
    ok(
      JSON.stringify(
        tunnelPidsFromPs(
          [
            '990 cloudflared tunnel --url http://[::ffff:127.0.0.1]:3460 --no-autoupdate',
            '880 lt -p3460',
            '881 localtunnel -p3460 --subdomain x',
            '77 cloudflared tunnel --url http://[::ffff:127.0.0.1]:9999 --no-autoupdate',
            '992 cloudflared tunnel --url http://[::1]:3460 --no-autoupdate',
          ].join('\n'),
          3460,
        ),
      ) === JSON.stringify([990, 992, 881, 880]),
      'tunnelPidsFromPs multi + IPv4-mapped residual (killStray alphabet)',
    );
    // Residual: bracketed IPv4 [127.0.0.1] / [0.0.0.0] (URL parsers always-bracket hosts)
    ok(
      tunnelPidFromPs(
        '1090 cloudflared tunnel --url http://[127.0.0.1]:3460 --no-autoupdate',
        3460,
      ) === 1090,
      'tunnelPidFromPs cloudflared [127.0.0.1] bracketed IPv4 host',
    );
    ok(
      tunnelPidFromPs(
        '1091 cloudflared tunnel --url http://[127.0.0.1]:9999 --no-autoupdate',
        3460,
      ) === null,
      'tunnelPidFromPs [127.0.0.1] other port ignored',
    );
    ok(
      tunnelPidFromPs(
        '1092 cloudflared tunnel --url http://[0.0.0.0]:3460 --no-autoupdate',
        3460,
      ) === 1092,
      'tunnelPidFromPs cloudflared [0.0.0.0] bracketed all-if host',
    );
    ok(
      tunnelPidFromPs(
        '1093 cloudflared tunnel --url http://[0.0.0.0]:9999 --no-autoupdate',
        3460,
      ) === null,
      'tunnelPidFromPs [0.0.0.0] other port ignored',
    );
    ok(
      tunnelPidFromPs(
        '1094 cloudflared tunnel --url http://127.0.0.1:3460 --no-autoupdate',
        3460,
      ) === 1094,
      'tunnelPidFromPs bare 127.0.0.1 still matches after bracketed IPv4 residual',
    );
    ok(
      tunnelPidFromPs(
        '1095 cloudflared tunnel --url https://[127.0.0.1]:3460 --no-autoupdate',
        3460,
      ) === 1095,
      'tunnelPidFromPs [127.0.0.1] https scheme still matches',
    );
    ok(
      JSON.stringify(
        tunnelPidsFromPs(
          [
            '1090 cloudflared tunnel --url http://[127.0.0.1]:3460 --no-autoupdate',
            '880 lt -p3460',
            '881 localtunnel -p3460 --subdomain x',
            '77 cloudflared tunnel --url http://[127.0.0.1]:9999 --no-autoupdate',
            '1092 cloudflared tunnel --url http://[0.0.0.0]:3460 --no-autoupdate',
            '993 cloudflared tunnel --url http://127.0.0.1:3460 --no-autoupdate',
          ].join('\n'),
          3460,
        ),
      ) === JSON.stringify([1090, 1092, 993, 881, 880]),
      'tunnelPidsFromPs multi + bracketed IPv4 residual (killStray alphabet)',
    );
    // Residual: quoted port flags --port "N" / 'N' / --port="N" / -p "N"
    // (shells/wrappers that quote numeric args; \\b after " never matches)
    ok(
      tunnelPidFromPs('1190 lt --port "3460"', 3460) === 1190,
      'tunnelPidFromPs lt --port double-quoted form',
    );
    ok(
      tunnelPidFromPs("1191 localtunnel --port '3460' --subdomain x", 3460) ===
        1191,
      'tunnelPidFromPs localtunnel --port single-quoted form',
    );
    ok(
      tunnelPidFromPs('1192 lt --port="3460"', 3460) === 1192,
      'tunnelPidFromPs lt --port= double-quoted equals form',
    );
    ok(
      tunnelPidFromPs("1193 localtunnel --port='3460' --subdomain x", 3460) ===
        1193,
      'tunnelPidFromPs localtunnel --port= single-quoted equals form',
    );
    ok(
      tunnelPidFromPs('1194 lt -p "3460"', 3460) === 1194,
      'tunnelPidFromPs lt -p double-quoted short form',
    );
    ok(
      tunnelPidFromPs("1195 localtunnel -p='3460' --subdomain x", 3460) === 1195,
      'tunnelPidFromPs localtunnel -p= single-quoted short form',
    );
    ok(
      tunnelPidFromPs('1196 lt --port "9999"', 3460) === null,
      'tunnelPidFromPs quoted --port other port ignored',
    );
    ok(
      tunnelPidFromPs('1197 lt --port "34600"', 3460) === null,
      'tunnelPidFromPs quoted --port does not prefix-match longer port',
    );
    ok(
      tunnelPidFromPs('1197a lt --port "3460\'', 3460) === null,
      'tunnelPidFromPs mismatched quotes --port "N\' not matched',
    );
    ok(
      tunnelPidFromPs('1197b lt --port \'3460"', 3460) === null,
      'tunnelPidFromPs mismatched quotes --port \'N" not matched',
    );
    ok(
      tunnelPidFromPs('1210 lt --port \u201c3460\u201d', 3460) === 1210,
      'tunnelPidFromPs lt --port smart double-quoted form',
    );
    ok(
      tunnelPidFromPs('1211 lt --port \u20183460\u2019', 3460) === 1211,
      'tunnelPidFromPs lt --port smart single-quoted form',
    );
    ok(
      tunnelPidFromPs('1212 lt --port \u00ab3460\u00bb', 3460) === 1212,
      'tunnelPidFromPs lt --port guillemet-quoted form',
    );
    ok(
      tunnelPidFromPs('1213 lt --port=\u00ab3460\u00bb', 3460) === 1213,
      'tunnelPidFromPs lt --port= guillemet equals form',
    );
    ok(
      tunnelPidFromPs('1198 lt --port 3460', 3460) === 1198,
      'tunnelPidFromPs unquoted --port space still matches after quoted residual',
    );
    ok(
      tunnelPidFromPs('1199 lt --port=3460', 3460) === 1199,
      'tunnelPidFromPs unquoted --port= still matches after quoted residual',
    );
    ok(
      tunnelPidFromPs('1200 lt --port3460', 3460) === 1200,
      'tunnelPidFromPs glued --portPORT still matches after quoted residual',
    );
    ok(
      JSON.stringify(
        tunnelPidsFromPs(
          [
            '1090 cloudflared tunnel --url http://[127.0.0.1]:3460 --no-autoupdate',
            '1190 lt --port "3460"',
            '1191 localtunnel --port \'3460\' --subdomain x',
            '77 cloudflared tunnel --url http://[127.0.0.1]:9999 --no-autoupdate',
            '1196 lt --port "9999"',
            '1192 lt --port="3460"',
          ].join('\n'),
          3460,
        ),
      ) === JSON.stringify([1090, 1191, 1190, 1192]),
      'tunnelPidsFromPs multi + quoted port residual (killStray alphabet)',
    );
    // Residual: IPv6 zone-id [::1%lo0] (macOS/BSD scoped loopback; killStray + PID)
    ok(
      tunnelPidFromPs(
        '1200 cloudflared tunnel --url http://[::1%lo0]:3460 --no-autoupdate',
        3460,
      ) === 1200,
      'tunnelPidFromPs cloudflared [::1%lo0] zone-id host',
    );
    ok(
      tunnelPidFromPs(
        '1201 cloudflared tunnel --url http://[::1%lo0]:9999 --no-autoupdate',
        3460,
      ) === null,
      'tunnelPidFromPs [::1%lo0] other port ignored',
    );
    ok(
      tunnelPidFromPs(
        '1202 cloudflared tunnel --url http://[::1]:3460 --no-autoupdate',
        3460,
      ) === 1202,
      'tunnelPidFromPs plain [::1] still matches after zone-id residual',
    );
    // Residual: IPv4-mapped hex loopback [::ffff:7f00:1] (some dual-stack prints)
    ok(
      tunnelPidFromPs(
        '1210 cloudflared tunnel --url http://[::ffff:7f00:1]:3460 --no-autoupdate',
        3460,
      ) === 1210,
      'tunnelPidFromPs cloudflared [::ffff:7f00:1] hex-mapped host',
    );
    ok(
      tunnelPidFromPs(
        '1211 cloudflared tunnel --url http://[::ffff:7f00:1]:9999 --no-autoupdate',
        3460,
      ) === null,
      'tunnelPidFromPs [::ffff:7f00:1] other port ignored',
    );
    // Residual: zone-id on mapped/bracketed IPv4 (dual-stack + scoped iface)
    ok(
      tunnelPidFromPs(
        '1212 cloudflared tunnel --url http://[::ffff:127.0.0.1%lo0]:3460 --no-autoupdate',
        3460,
      ) === 1212,
      'tunnelPidFromPs [::ffff:127.0.0.1%lo0] mapped zone-id host',
    );
    ok(
      tunnelPidFromPs(
        '1213 cloudflared tunnel --url http://[127.0.0.1%lo0]:3460 --no-autoupdate',
        3460,
      ) === 1213,
      'tunnelPidFromPs [127.0.0.1%lo0] bracketed IPv4 zone-id host',
    );
    // Residual: all-if [::%lo0] (scoped unspecified; zone before bare [::])
    ok(
      tunnelPidFromPs(
        '1214 cloudflared tunnel --url http://[::%lo0]:3460 --no-autoupdate',
        3460,
      ) === 1214,
      'tunnelPidFromPs cloudflared [::%lo0] all-if zone-id host',
    );
    ok(
      tunnelPidFromPs(
        '1215 cloudflared tunnel --url http://[::%lo0]:9999 --no-autoupdate',
        3460,
      ) === null,
      'tunnelPidFromPs [::%lo0] other port ignored',
    );
    ok(
      tunnelPidFromPs(
        '1216 cloudflared tunnel --url http://[::]:3460 --no-autoupdate',
        3460,
      ) === 1216,
      'tunnelPidFromPs bare [::] still matches after all-if zone residual',
    );
    // Residual: expanded IPv6 loopback [0:0:0:0:0:0:0:1] (+ zone) — some ps expand ::1
    ok(tunnelPidFromPs('1220 cloudflared tunnel --url http://[0:0:0:0:0:0:0:1]:3460 --no-autoupdate', 3460) === 1220, 'tunnelPidFromPs expanded loopback');
    ok(tunnelPidFromPs('1221 cloudflared tunnel --url http://[0:0:0:0:0:0:0:1%lo0]:3460 --no-autoupdate', 3460) === 1221, 'tunnelPidFromPs expanded+zone');
    ok(tunnelPidFromPs('1222 cloudflared tunnel --url http://[0:0:0:0:0:0:0:1]:9999 --no-autoupdate', 3460) === null, 'tunnelPidFromPs expanded other port ignored');
    ok(tunnelPidFromPs('1223 cloudflared tunnel --url http://[0000:0000:0000:0000:0000:0000:0000:0001]:3460 --no-autoupdate', 3460) === 1223, 'tunnelPidFromPs expanded zero-padded loopback');
    ok(tunnelPidFromPs('1224 cloudflared tunnel --url http://[0000:0000:0000:0000:0000:0000:0000:0001%lo0]:3460 --no-autoupdate', 3460) === 1224, 'tunnelPidFromPs expanded zero-padded+zone');
    // Residual: bare unbracket ::1 / ::1%lo0 (LAST tunnel zone-id bare form)
    ok(tunnelPidFromPs('1230 cloudflared tunnel --url http://::1:3460 --no-autoupdate', 3460) === 1230, 'tunnelPidFromPs bare ::1 host');
    ok(tunnelPidFromPs('1231 cloudflared tunnel --url http://::1%lo0:3460 --no-autoupdate', 3460) === 1231, 'tunnelPidFromPs bare ::1%lo0 zone');
    ok(tunnelPidFromPs('1232 cloudflared tunnel --url http://::1:9999 --no-autoupdate', 3460) === null, 'tunnelPidFromPs bare ::1 other port ignored');
    ok(tunnelPidFromPs('1233 cloudflared tunnel --url http://[::1]:3460 --no-autoupdate', 3460) === 1233, 'tunnelPidFromPs bracketed [::1] still after bare residual');
    ok(tunnelPidFromPs('1234 cloudflared tunnel --url http://127.0.0.1%lo0:3460 --no-autoupdate', 3460) === 1234, 'tunnelPidFromPs bare 127.0.0.1%lo0 zone');
    ok(tunnelPidFromPs('1235 cloudflared tunnel --url http://0.0.0.0%lo0:3460 --no-autoupdate', 3460) === 1235, 'tunnelPidFromPs bare 0.0.0.0%lo0 zone');
    ok(tunnelPidFromPs('1236 cloudflared tunnel --url http://127.0.0.1%lo0:9999 --no-autoupdate', 3460) === null, 'tunnelPidFromPs bare IPv4 zone other port ignored');
    // Residual: bare unbracket ::ffff mapped (hex form was MISS; decimal already via 127.0.0.1 submatch)
    ok(tunnelPidFromPs('1240 cloudflared tunnel --url http://::ffff:7f00:1:3460 --no-autoupdate', 3460) === 1240, 'tunnelPidFromPs bare ::ffff:7f00:1');
    ok(tunnelPidFromPs('1241 cloudflared tunnel --url http://::ffff:7f00:1%lo0:3460 --no-autoupdate', 3460) === 1241, 'tunnelPidFromPs bare ::ffff:7f00:1%lo0');
    ok(tunnelPidFromPs('1242 cloudflared tunnel --url http://::ffff:7f00:1:9999 --no-autoupdate', 3460) === null, 'tunnelPidFromPs bare ::ffff hex other port ignored');
    ok(tunnelPidFromPs('1243 cloudflared tunnel --url http://[::ffff:7f00:1]:3460 --no-autoupdate', 3460) === 1243, 'tunnelPidFromPs bracketed mapped still after bare');
  }

  if (fails.length) {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    console.error(JSON.stringify({ ok: false, fails }));
    process.exit(1);
  }
  fs.rmSync(fixtureDir, { recursive: true, force: true });
  console.log(
    JSON.stringify({
      ok: true,
      checks:
        'shouldPublishConfig+tunnelHealAttempts+publicBaseNorm+queryHashStrip+storeHygiene+opsSecret+tunnelPidFromPs+tunnelPidLocalhost+tunnelPidsKillStray+tunnelPid0x0+tunnelPortFlag+tunnelPidV6Any+tunnelPortShortEquals+tunnelPortGluedShort+tunnelPortGluedLong+tunnelPidV4Mapped+tunnelPidBracketIPv4+tunnelPortQuoted+tunnelPidZoneId+tunnelPidBareMapped',
    }),
  );
}

function stop() {
  ensureDir();
  const healLock = tryAcquireHealLock();
  if (!healLock) {
    console.error(JSON.stringify({ ok: false, stopped: false, reason: 'heal already running' }));
    return 2;
  }
  try {
    // Reattach missing tunnel.pid before kill (oneshot/detached leave orphans otherwise).
    // Also stop systemd-run CF unit + residual CF/loca for :PORT — bare killPid left
    // orphans that the next up() "adopt-live-tunnel" and skipped a clean CF rehome.
    resolveTunnelPid();
    resolveAppPid();
    killStrayTunnels();
    killPid('app.pid');
    console.log(JSON.stringify({ ok: true, stopped: true }));
    return 0;
  } finally {
    healLock.release();
  }
}

if (isMain) {
  if (!cliArgsValid(process.argv.slice(2))) {
    console.error(
      'usage: demigod-events-online.mjs [up|status|certify|stop|heal|selfcheck|ensure-ops] [--publish-config]',
    );
    process.exit(2);
  } else if (cmd === '--help' || cmd === '-h') {
    console.log(
      'usage: demigod-events-online.mjs [up|status|certify|stop|heal|selfcheck|ensure-ops] [--publish-config]',
    );
  } else if (cmd === 'status' || cmd === 'certify') {
    status(cmd === 'certify').then((c) => process.exit(c));
  } else if (cmd === 'stop') {
    process.exitCode = stop();
  } else if (cmd === 'selfcheck') {
    selfcheck();
  } else if (cmd === 'ensure-ops') {
    // provision secret + restart app if missing secret (never print secret)
    ensureDir();
    ensureOpsSecret();
    const r = ensureAppOpsSecret();
    console.log(
      JSON.stringify({
        ok: !!r.ok,
        opsSecretConfigured: opsSecretConfigured(),
        appHasOpsSecret: appHasOpsSecret(r.pid || resolveAppPid()),
        restarted: !!r.restarted,
        appPid: r.pid || resolveAppPid(),
        error: r.error || undefined,
      }),
    );
    process.exit(r.ok ? 0 : 1);
  } else if (cmd === 'heal') {
    // FOCUS: if public dead, re-up tunnel (same as up)
    up().catch((e) => {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    });
  } else if (cmd === 'up' || cmd === 'start' || cmd === '--publish-config') {
    // bare --publish-config still runs up
    up().catch((e) => {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    });
  } else {
    console.error(
      'usage: demigod-events-online.mjs [up|status|certify|stop|heal|selfcheck|ensure-ops] [--publish-config]',
    );
    process.exit(2);
  }
}
