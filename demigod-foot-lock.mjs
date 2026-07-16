#!/usr/bin/env node
/**
 * Durable foot-core writer lock (claim / release / status / check).
 *
 * Complements bin/dg-lock (flock): flock serializes processes; this records
 * owner + base sha so agents and the dashboard refuse concurrent thrash.
 *
 * Exclusivity = owner + unguessable lease token + TTL (dead PID does NOT free).
 * Refresh/release require --token / DG_LOCK_TOKEN (or --force).
 * Claim uses flock around read-modify-write to reduce TOCTOU races.
 *
 * Usage:
 *   node demigod-foot-lock.mjs status
 *   node demigod-foot-lock.mjs claim [--owner grok] [--ttl 1800] [--token …] [--force]
 *   node demigod-foot-lock.mjs claim <owner> [ttlSec]
 *   node demigod-foot-lock.mjs release [--owner grok] [--token …] [--force]
 *   node demigod-foot-lock.mjs check [--owner me] [--token …]
 *   node demigod-foot-lock.mjs wrap -- cmd [args...]
 *   node demigod-foot-lock.mjs require   # hard fail if no valid lease
 *   import { assertCanWriteFoot } from './demigod-foot-lock.mjs'
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import {
  BUSY,
  sha256File,
  footVerFromJs,
  hostname,
  atomicWrite,
  opt,
  flag,
  positionals,
  readText,
} from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const FOOT = path.join(ROOT, 'demigod-foot-core.js');
const LOCK = path.join(BUSY, 'foot-lock.txt');
const LOCK_JSON = path.join(BUSY, 'foot-lock.json');
const FLOCK = '/tmp/demigod-foot-core.lock';
const META_FLOCK = '/tmp/demigod-foot-lock-meta.lock';

const args = process.argv.slice(2);
const cmd = args[0] || 'status';

const TTL_MIN = 5;
const TTL_MAX = 7200;

function footVer() {
  return footVerFromJs(readText(FOOT) || '') || '?';
}

function parseLegacyText(raw) {
  const rec = { legacy: true, raw };
  for (const line of String(raw).split('\n')) {
    const m = line.match(/^([a-zA-Z]+)=(.*)$/);
    if (!m) continue;
    const k = m[1];
    const v = m[2];
    if (k === 'owner') rec.owner = v;
    else if (k === 'pid') rec.pid = v && /^\d+$/.test(v) ? Number(v) : null;
    else if (k === 'at') rec.at = v;
    else if (k === 'expiresAt') rec.expiresAt = v;
    else if (k === 'baseSha') rec.baseSha = v;
    else if (k === 'footVer') rec.footVer = String(v).replace(/^v/, '');
    else if (k === 'why') rec.why = v;
    else if (k === 'host') rec.host = v;
    else if (k === 'ttlSec') rec.ttlSec = Number(v) || undefined;
  }
  if (!rec.owner) rec.owner = 'unknown';
  return rec;
}

function isExpired(lock) {
  if (!lock?.expiresAt) return false;
  const t = Date.parse(lock.expiresAt);
  return Number.isFinite(t) && t < Date.now();
}

/** Read lock; clear expired files. Never free on dead pid. */
function readLock({ clearExpired = true } = {}) {
  try {
    if (fs.existsSync(LOCK_JSON)) {
      const raw = fs.readFileSync(LOCK_JSON, 'utf8');
      let j;
      try {
        j = JSON.parse(raw);
      } catch {
        // corrupt JSON — fall through to text; do not invent free
        j = null;
      }
      if (j && typeof j === 'object') {
        if (clearExpired && isExpired(j)) {
          clearLockFiles();
          return null;
        }
        return j;
      }
    }
  } catch {
    /* fall through */
  }
  try {
    if (fs.existsSync(LOCK)) {
      const raw = fs.readFileSync(LOCK, 'utf8');
      const j = parseLegacyText(raw);
      if (clearExpired && isExpired(j)) {
        clearLockFiles();
        return null;
      }
      return j;
    }
  } catch {
    /* */
  }
  return null;
}

function clearLockFiles() {
  for (const f of [LOCK_JSON, LOCK]) {
    try {
      fs.unlinkSync(f);
    } catch {
      /* */
    }
  }
}

function writeLock(rec) {
  fs.mkdirSync(BUSY, { recursive: true });
  atomicWrite(LOCK_JSON, JSON.stringify(rec, null, 2) + '\n');
  const text = [
    `owner=${rec.owner}`,
    `pid=${rec.pid}`,
    `at=${rec.at}`,
    `expiresAt=${rec.expiresAt}`,
    `baseSha=${rec.baseSha}`,
    `footVer=v${rec.footVer}`,
    `why=${rec.why || ''}`,
    `host=${rec.host || ''}`,
    `ttlSec=${rec.ttlSec || ''}`,
    `token=${rec.token ? rec.token.slice(0, 8) + '…' : ''}`,
  ].join('\n');
  atomicWrite(LOCK, text + '\n');
  try {
    atomicWrite(
      path.join(BUSY, 'foot-lock-token.env'),
      `export DG_LOCK_TOKEN=${rec.token}\nexport DG_LOCK_OWNER=${rec.owner}\n`,
    );
  } catch {
    /* */
  }
}

function resolveToken() {
  return opt(args, '--token', null) || process.env.DG_LOCK_TOKEN || null;
}

function resolveOwner() {
  const pos = positionals(args, ['--owner', '--ttl', '--why', '--token']);
  return (
    opt(args, '--owner', null) ||
    pos[0] ||
    process.env.DG_LOCK_OWNER ||
    process.env.USER ||
    'agent'
  );
}

function resolveTtl() {
  const pos = positionals(args, ['--owner', '--ttl', '--why']);
  const raw = opt(args, '--ttl', null) || (pos[1] && /^\d+$/.test(pos[1]) ? pos[1] : null) || '1800';
  let ttl = Number(raw) || 1800;
  if (ttl < TTL_MIN) ttl = TTL_MIN;
  if (ttl > TTL_MAX) ttl = TTL_MAX;
  return ttl;
}

/** Serialize claim/release via flock re-exec (reduces TOCTOU races). */
function withMetaLockSync(fn) {
  if (process.env.DG_FOOT_LOCK_HELD === '1' || process.env.DG_LOCK_NO_FLOCK === '1') {
    return fn();
  }
  const which = spawnSync('which', ['flock'], { encoding: 'utf8' });
  if (which.status !== 0) return fn();

  const r = spawnSync(
    'flock',
    ['-w', '20', META_FLOCK, process.execPath, ...process.argv.slice(1)],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, DG_FOOT_LOCK_HELD: '1' },
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  // This command exits immediately after the flock child returns. Synchronous
  // writes keep the claim receipt (including the one-time token handoff) from
  // being dropped when stdout/stderr are pipes, as they are in bin/dg and
  // agent runners.
  if (r.stdout) fs.writeSync(process.stdout.fd, r.stdout);
  if (r.stderr) fs.writeSync(process.stderr.fd, r.stderr);
  process.exit(r.status ?? 1);
}

function statusJson() {
  const lock = readLock({ clearExpired: true });
  const base = {
    locked: Boolean(lock),
    lockPath: LOCK,
    lockJson: LOCK_JSON,
    flockPath: FLOCK,
    metaFlockPath: META_FLOCK,
    foot: FOOT,
    footVer: footVer(),
    currentSha: sha256File(FOOT),
  };
  if (!lock) return { ...base, locked: false, free: true, who: null };
  // `claim` is a short-lived CLI command: its PID is provenance, not a
  // long-running owner process. Only wrapper leases have a durable process
  // whose exit is meaningful liveness evidence.
  const alive = lock.pid && lock.pidScope === 'lease-owner'
    ? (() => {
        try {
          process.kill(lock.pid, 0);
          return true;
        } catch {
          return false;
        }
      })()
    : null;
  const shaNow = sha256File(FOOT);
  const ageSec = lock.at ? Math.round((Date.now() - Date.parse(lock.at)) / 1000) : null;
  const ttlLeftSec = lock.expiresAt
    ? Math.max(0, Math.round((Date.parse(lock.expiresAt) - Date.now()) / 1000))
    : null;
  // Redact full token in status output (full only in claim response + token.env)
  const safeLock = lock
    ? {
        ...lock,
        token: lock.token ? String(lock.token).slice(0, 8) + '…' : null,
        tokenPresent: Boolean(lock.token),
      }
    : null;
  return {
    ...base,
    locked: true,
    free: false,
    expired: isExpired(lock),
    ownerAlive: alive,
    // informational only — dead pid does NOT free
    baseShaMatch: lock.baseSha ? lock.baseSha === shaNow : null,
    lock: safeLock,
    who: {
      owner: lock.owner || null,
      pid: lock.pid ?? null,
      host: lock.host || null,
      why: lock.why || null,
      ageSec,
      ttlLeftSec,
      alive,
      agent: lock.owner || null,
    },
  };
}

export function getLockWho() {
  const st = statusJson();
  if (!st || !st.locked || !st.lock) return null;
  return st.who || {
    owner: st.lock.owner,
    pid: st.lock.pid,
    host: st.lock.host,
    why: st.lock.why,
    ageSec: st.who?.ageSec,
    ttlLeftSec: st.who?.ttlLeftSec,
    alive: st.ownerAlive,
    agent: st.lock.owner,
  };
}
export function getLockStatus() {
  return statusJson();
}

function claimBody() {
  const owner = resolveOwner();
  const ttl = resolveTtl();
  const why = opt(args, '--why', 'foot-core edit');
  const force = flag(args, '--force');
  const tokenIn = resolveToken();
  const existing = readLock({ clearExpired: true });

  if (existing && !force && !isExpired(existing)) {
    // Lease token: same Unix user cannot steal another session's lease
    if (existing.token) {
      if (tokenIn && tokenIn === existing.token) {
        // refresh own lease
      } else {
        console.error(
          JSON.stringify(
            {
              ok: false,
              error: 'locked',
              lock: { ...existing, token: existing.token ? existing.token.slice(0, 8) + '…' : null },
              hint:
                existing.owner === owner
                  ? 'same owner needs --token / DG_LOCK_TOKEN to refresh, or --force'
                  : 'wait for owner release, TTL expiry, or release --force if abandoned',
            },
            null,
            2,
          ),
        );
        process.exit(1);
      }
    } else if (existing.owner && existing.owner !== owner) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            error: 'locked',
            lock: existing,
            hint: 'wait for owner release, wait for TTL expiry, or release --force if abandoned',
          },
          null,
          2,
        ),
      );
      process.exit(1);
    }
  }

  // Keep token on refresh; mint new on fresh claim
  const token =
    existing && !force && tokenIn && existing.token === tokenIn
      ? existing.token
      : crypto.randomBytes(16).toString('hex');

  const rec = {
    owner,
    pid: process.pid,
    pidScope: 'claim-command',
    at: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    baseSha: sha256File(FOOT),
    footVer: footVer(),
    why,
    host: process.env.HOSTNAME || hostname(),
    ttlSec: ttl,
    token,
  };
  writeLock(rec);
  console.log(
    JSON.stringify(
      {
        ok: true,
        claimed: rec,
        hint: `export DG_LOCK_TOKEN=${token}  # required to refresh/release without --force`,
      },
      null,
      2,
    ),
  );
}

function releaseBody() {
  const owner = resolveOwner();
  const force = flag(args, '--force');
  const tokenIn = resolveToken();
  const existing = readLock({ clearExpired: true });
  if (!existing) {
    console.log(JSON.stringify({ ok: true, released: false, note: 'already free' }));
    return;
  }
  if (!force) {
    if (existing.token) {
      if (!tokenIn || tokenIn !== existing.token) {
        console.error(
          JSON.stringify({
            ok: false,
            error: 'token_required',
            lock: { owner: existing.owner, token: existing.token.slice(0, 8) + '…' },
            hint: 'pass --token / DG_LOCK_TOKEN or release --force',
          }),
        );
        process.exit(1);
      }
    } else if (existing.owner && existing.owner !== owner) {
      console.error(JSON.stringify({ ok: false, error: 'not_owner', lock: existing }, null, 2));
      process.exit(1);
    }
  }
  clearLockFiles();
  try {
    fs.unlinkSync(path.join(BUSY, 'foot-lock-token.env'));
  } catch {
    /* */
  }
  console.log(JSON.stringify({ ok: true, released: true, was: { ...existing, token: existing.token ? '…' : null } }));
}

function checkBody() {
  // Use raw lock for token compare (status redacts token)
  const raw = readLock({ clearExpired: true });
  const st = statusJson();
  if (!raw) {
    console.log(JSON.stringify({ ok: true, free: true, ...st }));
    process.exit(0);
  }
  const owner = resolveOwner();
  const tokenIn = resolveToken();
  if (raw.token && tokenIn && tokenIn === raw.token) {
    console.log(JSON.stringify({ ok: true, free: false, ownedByMe: true, tokenMatch: true, ...st }));
    process.exit(0);
  }
  if (raw.owner === owner && !raw.token) {
    console.log(JSON.stringify({ ok: true, free: false, ownedByMe: true, ...st }));
    process.exit(0);
  }
  if (isExpired(raw)) {
    console.log(
      JSON.stringify({
        ok: true,
        free: true,
        expired: true,
        note: 'TTL expired — claim or release --force',
        ...st,
      }),
    );
    process.exit(0);
  }
  console.error(JSON.stringify({ ok: false, free: false, ...st }, null, 2));
  process.exit(1);
}

function wrap() {
  const dash = args.indexOf('--');
  const rest = dash >= 0 ? args.slice(dash + 1) : args.slice(1);
  if (!rest.length) {
    console.error('usage: wrap -- <cmd> [args...]');
    process.exit(2);
  }
  process.env.DG_LOCK_OWNER = process.env.DG_LOCK_OWNER || 'wrap';
  const owner = process.env.DG_LOCK_OWNER;
  const ttl = Math.min(TTL_MAX, Math.max(TTL_MIN, Number(process.env.DG_LOCK_TTL || 1800)));
  const existing = readLock({ clearExpired: true });
  if (existing && !isExpired(existing) && existing.owner && existing.owner !== owner) {
    console.error(JSON.stringify({ ok: false, error: 'locked', lock: existing }, null, 2));
    process.exit(1);
  }
  const rec = {
    owner,
    pid: process.pid,
    pidScope: 'lease-owner',
    at: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    baseSha: sha256File(FOOT),
    footVer: footVer(),
    why: `wrap: ${rest.join(' ').slice(0, 120)}`,
    host: hostname(),
    ttlSec: ttl,
  };
  writeLock(rec);
  const r = spawnSync('flock', ['-w', '30', FLOCK, ...rest], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  const after = readLock({ clearExpired: false });
  if (after && after.owner === owner && after.pid === process.pid) clearLockFiles();
  process.exit(r.status ?? 1);
}

/**
 * Hard mutex for foot-core edits. Exit process if not free or not held by this agent.
 * Escape: DG_FOOT_LOCK_SKIP=1 (tests only).
 * @param {{ label?: string, soft?: boolean }} [opts]
 * @returns {{ ok: boolean, lock?: any, free?: boolean }}
 */
export function assertCanWriteFoot(opts = {}) {
  const label = opts.label || 'foot-edit';
  if (process.env.DG_FOOT_LOCK_SKIP === '1') {
    return { ok: true, skipped: true, free: true };
  }
  const raw = readLock({ clearExpired: true });
  const token = process.env.DG_LOCK_TOKEN || null;
  const owner = process.env.DG_LOCK_OWNER || process.env.USER || 'agent';
  if (!raw) {
    const msg = {
      ok: false,
      error: 'foot_lock_required',
      label,
      hint: 'bin/dg lock claim --owner "$USER" --why "edit foot"  then export DG_LOCK_TOKEN=…',
    };
    if (opts.soft) return msg;
    console.error(JSON.stringify(msg, null, 2));
    process.exit(1);
  }
  if (isExpired(raw)) {
    clearLockFiles();
    const msg = {
      ok: false,
      error: 'foot_lock_expired',
      label,
      hint: 'claim a new lock',
    };
    if (opts.soft) return msg;
    console.error(JSON.stringify(msg, null, 2));
    process.exit(1);
  }
  // Must own via token (preferred) or legacy same-owner without token
  const tokenOk = raw.token && token && token === raw.token;
  const legacyOk = !raw.token && raw.owner === owner;
  if (!tokenOk && !legacyOk) {
    const msg = {
      ok: false,
      error: 'foot_locked_by_other',
      label,
      owner: raw.owner,
      expiresAt: raw.expiresAt,
      hint: 'wait, or release --force if abandoned',
    };
    if (opts.soft) return msg;
    console.error(JSON.stringify(msg, null, 2));
    process.exit(1);
  }
  return { ok: true, free: false, owner: raw.owner, expiresAt: raw.expiresAt };
}

function requireBody() {
  const r = assertCanWriteFoot({ label: 'require' });
  console.log(JSON.stringify({ ...r, status: statusJson() }, null, 2));
  process.exit(r.ok ? 0 : 1);
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  if (cmd === 'status' || cmd === 'who') {
    const st = statusJson();
    if (cmd === 'who' || process.argv.includes('--who')) {
      const w = st.who || { free: true, owner: null };
      if (process.argv.includes('--json') || cmd === 'status') {
        console.log(JSON.stringify(cmd === 'who' ? { free: !st.locked, ...st.who, locked: st.locked } : st, null, 2));
      } else {
        if (!st.locked) console.log('lock: free');
        else
          console.log(
            `lock: ${w.owner || '?'} pid=${w.pid ?? '?'} age=${w.ageSec ?? '?'}s ttlLeft=${w.ttlLeftSec ?? '?'}s alive=${w.alive} why=${w.why || '—'}`,
          );
      }
    } else {
      console.log(JSON.stringify(st, null, 2));
    }
  } else if (cmd === 'claim') {
    withMetaLockSync(claimBody);
  } else if (cmd === 'release') {
    withMetaLockSync(releaseBody);
  } else if (cmd === 'check') {
    checkBody();
  } else if (cmd === 'require') {
    requireBody();
  } else if (cmd === 'wrap') {
    wrap();
  } else {
    console.error('usage: status|who | claim | release | check | require | wrap -- cmd...');
    process.exit(2);
  }
}
