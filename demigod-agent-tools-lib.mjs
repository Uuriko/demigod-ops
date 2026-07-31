#!/usr/bin/env node
/**
 * demigod-agent-tools-lib — shared ops primitives (no side effects on import)
 *
 * Exports: BUSY, ensureBusy, atomicWrite, readJson, isFrozen, withFileLock,
 * footVerFromJs, claimMutateLock, opt, …
 * Used by: freeze, ship, webflow, pairs, truth, dashboard helpers.
 * Keep small — product truth lives in truth/evidence, not here.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

export const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
export const LIVE_DEFAULT = 'https://www.trydemigod.com';

/**
 * Invisible, bidi-control, and Unicode line/paragraph separator characters that must never
 * survive in untrusted descriptive text. One source of truth: this class had been copy-pasted
 * into six regexes across four files and drifted twice — every copy omitted \u2028/\u2029
 * (line/paragraph separators, honoured by JS and by several spreadsheet importers), and five of
 * six omitted \u061c (ARABIC LETTER MARK, a bidi control). Callers append their own ASCII C0
 * policy, which legitimately differs: the CSV/export path preserves \t\n\r and quotes them,
 * the reject predicates refuse them outright. Only the shared tail lives here.
 */
export const UNSAFE_INVISIBLE_CLASS =
  '\\u007f-\\u009f\\u061c\\u200b-\\u200f\\u2028\\u2029\\u202a-\\u202e\\u2060-\\u206f\\ufeff';

export function sha256File(file) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  } catch {
    return null;
  }
}

export function sha256Buf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * True only for a plain object — not null, not an array, not a primitive.
 *
 * Extracted from SIX real defects found 2026-07-30, all the same shape: parseable data of the wrong
 * type reaching code that assumed an object. `Object.entries('engineering')` yields index-keyed
 * character pairs; `{ ...'str' }` yields character keys; `arr.filter(r => r.id)` throws on a null
 * entry. Each site had hand-rolled this check, or omitted it. Consequences ranged from an inflated
 * coverage denominator to fabricated ledger rows to FAKE HIRING CATEGORIES ON A PUBLIC PAGE.
 *
 * Use at every boundary where data arrives from a file, a fetch, or another agent's output.
 */
export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Entries of `value` if it is a plain object, else none. The safe form of Object.entries(x || {}). */
export function objectEntries(value) {
  return isPlainObject(value) ? Object.entries(value) : [];
}

export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function readText(file, max = 500_000) {
  try {
    const s = fs.readFileSync(file, 'utf8');
    return s.length > max ? s.slice(0, max) : s;
  } catch {
    return null;
  }
}

/** Atomic write: temp file in same dir then rename. Optional exact mode is for private artifacts. */
export function atomicWrite(file, body, { mode = null } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp.${process.pid}.${Date.now()}`;
  try {
    fs.writeFileSync(tmp, body, mode == null ? undefined : { mode });
    // rename(2) REPLACES the inode, so the survivor's mode is the tmp file's (umask), not the
    // original's. Without this, an atomic rewrite silently widens 600 -> 664 and strips +x from
    // 775 -> 664. That is reachable: demigod-review-fix.mjs:103 atomicWrites arbitrary repo paths
    // (path.join(ROOT, rel)) and the repo root holds 775 .mjs entrypoints, which would stop being
    // executable. statSync throws for a NEW file -- there the umask default is exactly right.
    if (mode != null) fs.chmodSync(tmp, mode);
    else {
      try {
        fs.chmodSync(tmp, fs.statSync(file).mode & 0o777);
      } catch {
        /* new file: keep the umask default */
      }
    }
    fs.renameSync(tmp, file);
  } finally {
    // A failed write/rename must not leave a receipt-shaped temp file behind.
    // Ignore cleanup errors so the original filesystem error remains visible.
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      /* preserve the original failure */
    }
  }
}

/** Extract first complete top-level JSON object from mixed stdout */
export function parseFirstJson(text) {
  if (!text) return null;
  const start = text.indexOf('{');
  if (start < 0) return null;
  // try full slice from first { to last }
  const end = text.lastIndexOf('}');
  if (end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      /* fall through to brace scan */
    }
  }
  // brace-depth scan for first object
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function runNode(root, args, opts = {}) {
  const r = spawnSync('node', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: opts.timeout || 90000,
    stdio: opts.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...(opts.env || {}) },
  });
  const out = ((r.stdout || '') + (r.stderr || '')).trim();
  return {
    status: r.status,
    out,
    stdout: (r.stdout || '').trim(),
    stderr: (r.stderr || '').trim(),
    error: r.error || null,
    signal: r.signal || null,
  };
}

/** Ensure /tmp/dg-busy exists (agent evidence + control surfaces). */
export function ensureBusy() {
  fs.mkdirSync(BUSY, { recursive: true });
}

export function hostname() {
  try {
    return fs.readFileSync('/etc/hostname', 'utf8').trim();
  } catch {
    return process.env.HOSTNAME || 'local';
  }
}

export function footVerFromJs(js) {
  if (!js) return null;
  return (
    (js.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] ||
    (js.match(/dgFootVersion\s*=\s*['"]v?(\d+)/) || [])[1] ||
    null
  );
}

export const PLAN_STATUSES = new Set([
  'proposed',
  'partial',
  'applied',
  'ignored',
  'blocked',
  'review',
]);

export function flag(args, name) {
  return args.includes(name);
}

export function opt(args, name, def = null) {
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1] && !String(args[i + 1]).startsWith('--')) return args[i + 1];
  // Also accept the GNU `--name=value` form. Without it, `=` is not an error -- indexOf misses,
  // positionals() then drops the token because it starts with `--`, and the caller silently falls
  // back to its default. That is how `dg lock claim --owner=coord-claude` recorded owner=potter
  // (process.env.USER) with no warning: it mislabelled who holds the foot lock, which is the exact
  // field other agents and the dashboard read to decide whether to wait. Silent + wrong, in a
  // coordination primitive. 19 tools share this helper; none used `=` before, so nothing changes
  // for existing callers -- this only stops the next person who types what every other CLI accepts.
  const pre = `${name}=`;
  const hit = args.find((a) => String(a).startsWith(pre));
  if (hit) {
    const v = String(hit).slice(pre.length);
    if (v) return v; // `--name=` with no value is "not provided", same as today
  }
  return def;
}

/** Positional tokens after subcommand, excluding flag values */
export function positionals(args, flagNames = []) {
  const skip = new Set();
  for (const f of flagNames) {
    const i = args.indexOf(f);
    if (i >= 0 && args[i + 1]) skip.add(args[i + 1]);
  }
  return args.slice(1).filter((a) => !a.startsWith('--') && !skip.has(a));
}


/** Publish freeze — single choke point for agents/dashboard/jobs */
/**
 * Publish freeze on? File publish-freeze.json and/or DEMIGOD_PUBLISH_FREEZE env.
 * Mutators (CDN/Webflow) must respect this.
 * @returns {{ on: boolean, why?: string, env: boolean, file: boolean }}
 */
export function isFrozen(busy = BUSY) {
  const j = readJson(path.join(busy, 'publish-freeze.json')) || {};
  const envRaw = String(process.env.DEMIGOD_PUBLISH_FREEZE || '').toLowerCase();
  const envOn = ['1', 'true', 'yes', 'on'].includes(envRaw);
  const fileOn = Boolean(j.on);
  return {
    on: envOn || fileOn,
    env: envOn,
    file: fileOn,
    why: j.why || (envOn ? 'DEMIGOD_PUBLISH_FREEZE env' : null),
    at: j.at || null,
    by: j.by || null,
    path: path.join(busy, 'publish-freeze.json'),
  };
}

/** Prefer real foot <script src=catbox> — not first catbox id in product maps */
export function footScriptIdFromHtml(html) {
  if (!html) return null;
  const m =
    html.match(/src=["']https:\/\/files\.catbox\.moe\/([a-z0-9]+\.js)["']/) ||
    html.match(/files\.catbox\.moe\/([a-z0-9]+\.js)/);
  return m ? m[1] : null;
}

/** File mtime evidence for freshness UI */
export function fileEvidence(file) {
  try {
    const st = fs.statSync(file);
    return {
      path: file,
      mtime: st.mtime.toISOString(),
      mtimeMs: st.mtimeMs,
      ageSec: Math.round((Date.now() - st.mtimeMs) / 1000),
      bytes: st.size,
      missing: false,
    };
  } catch {
    return { path: file, missing: true, ageSec: null, mtime: null, mtimeMs: 0 };
  }
}

/**
 * Gate freshness vs foot-core (or other source of truth).
 * stale if missing OR gate mtime older than source - skewMs
 */
export function gateFreshness(gateFile, sourceFile, { skewMs = 2000, maxAgeSec = null } = {}) {
  const gate = fileEvidence(gateFile);
  const source = fileEvidence(sourceFile);
  if (gate.missing) {
    return { fresh: false, reason: 'missing', gate, source, label: 'missing' };
  }
  if (source.missing) {
    return { fresh: true, reason: 'no-source', gate, source, label: 'ok' };
  }
  if (gate.mtimeMs + skewMs < source.mtimeMs) {
    return {
      fresh: false,
      reason: 'older-than-source',
      gate,
      source,
      label: 'stale-vs-foot',
      lagSec: Math.round((source.mtimeMs - gate.mtimeMs) / 1000),
    };
  }
  // Future-dated gate file (clock skew / malformed write): negative ageSec silently passed the
  // `> maxAgeSec` check below and was blessed fresh forever. Reject it (mirrors the dashboard guard).
  if (gate.ageSec != null && gate.ageSec < -60) {
    return { fresh: false, reason: 'clock-skew', gate, source, label: 'future-mtime', ageSec: gate.ageSec };
  }
  if (maxAgeSec != null && gate.ageSec != null && gate.ageSec > maxAgeSec) {
    return { fresh: false, reason: 'max-age', gate, source, label: 'stale-age', ageSec: gate.ageSec };
  }
  return { fresh: true, reason: 'ok', gate, source, label: 'fresh' };
}

export function ageLabel(sec) {
  if (sec == null || Number.isNaN(sec)) return '—';
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

/** Claim short-lived mutate lock under busy (dashboard jobs / ship). Returns token or null. */
export function claimMutateLock(owner = 'dashboard', busy = BUSY) {
  ensureBusy();
  const lockPath = path.join(busy, 'mutate-job-lock.json');
  const now = Date.now();
  try {
    const cur = readJson(lockPath);
    if (cur && cur.owner !== owner) {
      const expiresAtMs = Date.parse(cur.expiresAt || '');
      // A malformed lease is not proof that the other owner released it.
      // Fail closed so a damaged lock cannot authorize overlapping mutations.
      if (!Number.isFinite(expiresAtMs) || expiresAtMs > now) {
        return {
          ok: false,
          lock: cur,
          path: lockPath,
          reason: Number.isFinite(expiresAtMs) ? 'held' : 'malformed_lease',
        };
      }
    }
  } catch {
    /* */
  }
  const lock = {
    owner,
    pid: process.pid,
    at: new Date().toISOString(),
    expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
  };
  atomicWrite(lockPath, JSON.stringify(lock, null, 2) + '\n');
  return { ok: true, lock, path: lockPath };
}

export function releaseMutateLock(owner = 'dashboard', busy = BUSY) {
  const lockPath = path.join(busy, 'mutate-job-lock.json');
  try {
    const cur = readJson(lockPath);
    if (!cur || cur.owner === owner || !cur.expiresAt || Date.parse(cur.expiresAt) < Date.now()) {
      try {
        fs.unlinkSync(lockPath);
      } catch {
        /* */
      }
      return { ok: true };
    }
    return { ok: false, lock: cur };
  } catch {
    return { ok: true };
  }
}

/** Sync exclusive lock around critical sections (pilot store, etc.). */
/** Sleep without hot CPU spin (Atomics.wait when available). */
function lockBackoffMs(ms) {
  try {
    const sab = new SharedArrayBuffer(4);
    const ia = new Int32Array(sab);
    Atomics.wait(ia, 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      /* last-resort spin */
    }
  }
}

function lockHolderAlive(lockPath) {
  try {
    const raw = fs.readFileSync(lockPath, 'utf8').trim();
    const pid = Number(String(raw).split(/\s+/)[0]);
    if (!pid || !Number.isFinite(pid)) return null;
    try {
      process.kill(pid, 0);
      return true; // alive
    } catch {
      return false; // dead
    }
  } catch {
    return null;
  }
}

export function withFileLock(lockPath, fn, { timeoutMs = 15000, staleMs = 120000 } = {}) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const start = Date.now();
  let fd;
  while (true) {
    try {
      fd = fs.openSync(lockPath, 'wx');
      fs.writeSync(fd, `${process.pid} ${new Date().toISOString()}\n`);
      break;
    } catch (e) {
      if (e && e.code !== 'EEXIST') throw e;
      try {
        const st = fs.statSync(lockPath);
        const age = Date.now() - st.mtimeMs;
        const alive = lockHolderAlive(lockPath);
        // Steal only if holder is dead, or staleMs elapsed AND holder unknown/dead
        if (alive === false || (age > staleMs && alive !== true)) {
          try {
            fs.unlinkSync(lockPath);
          } catch {
            /* */
          }
          continue;
        }
      } catch {
        /* */
      }
      if (Date.now() - start > timeoutMs) {
        throw new Error(`lock_timeout:${lockPath}`);
      }
      lockBackoffMs(40);
    }
  }
  const release = () => {
    try {
      if (fd != null) fs.closeSync(fd);
    } catch {
      /* */
    }
    try {
      fs.unlinkSync(lockPath);
    } catch {
      /* */
    }
  };
  try {
    const result = fn();
    if (result && typeof result.finally === 'function') return result.finally(release);
    release();
    return result;
  } catch (error) {
    release();
    throw error;
  }
}
