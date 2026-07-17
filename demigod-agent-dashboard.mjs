#!/usr/bin/env node
/**
 * demigod-agent-dashboard — multi-agent + tools dashboard (agent-first)
 *
 * Human UI:  http://127.0.0.1:9878/  (Dashboard v2)
 * Agent API: http://127.0.0.1:9878/api/status
 * Agent brief: /api/agent-brief  → /tmp/dg-busy/AGENT-BRIEF.md
 * Tools: /api/tools · Jobs: POST /api/jobs?run=smoke
 * Cockpit/Smoke: /api/cockpit · /api/smoke
 * Control: /api/control · Orient: /api/orient · Unify: /api/unify · Truth: /api/truth
 * Ponytail: /api/ponytail · jobs ponytail|ponytail-check
 * Maps: /api/maps · /api/maps/:id · Priority: /api/priority · Dogfood: /api/dogfood · Coord: /api/coord
 *
 * Sections in this file:
 *   imports/config · status builders · JOBS allowlist · HTTP API routes · static UI
 * UI file: demigod-agent-dashboard-ui.html (loaded from disk — no nested quote bugs)
 * Usage: node demigod-agent-dashboard.mjs | bin/dg-dash
 * Prefer bin/dg orient for CLI session start (not only the dash).
 */
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync, execFile, execFileSync, spawnSync } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { refuseIfStale } from './demigod-evidence.mjs';
import { buildNext } from './demigod-next.mjs';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const portArg = process.argv.includes('--port')
  ? process.argv[process.argv.indexOf('--port') + 1]
  : null;
const PORT = Number(portArg || process.env.DEMIGOD_DASH_PORT || 9878) || 9878;
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const LIVE = 'https://www.trydemigod.com';
const MULTI = '/tmp/dg-multi';
const BUSY = '/tmp/dg-busy';
const GATE_LATEST = '/tmp/demigod-gate-latest.txt';
const BRIEF_MD = path.join(BUSY, 'AGENT-BRIEF.md');
const BRIEF_JSON = path.join(BUSY, 'AGENT-BRIEF.json');
const STATUS_JSON = path.join(BUSY, 'dashboard-status.json');
const SERVER_HEARTBEAT = path.join(BUSY, 'dashboard-server.heartbeat');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`demigod-agent-dashboard

Usage: node demigod-agent-dashboard.mjs [--port <port>] [--snapshot]

Serves the local dashboard and agent API on 127.0.0.1.
Default port: 9878 (override with --port or DEMIGOD_DASH_PORT).
--snapshot refreshes dashboard-status.json without opening a listener.`);
  process.exit(0);
}

function safeRead(file, max = 120_000) {
  try {
    const s = fs.readFileSync(file, 'utf8');
    return s.length > max ? s.slice(0, max) + '\n…' : s;
  } catch {
    return null;
  }
}

function safeJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJsonAtomic(file, value) {
  // A single dashboard process can have overlapping async request handlers.
  // PID-only temp names let one write rename another write's temp file, leaving
  // the second request to fail with ENOENT. Give every publication its own temp.
  const tmp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(value)}\n`);
    fs.renameSync(tmp, file);
  } finally {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      // The rename normally consumed it; cleanup is best-effort on write errors.
    }
  }
}

function demandStatusSnapshot(j) {
  if (!j || typeof j !== 'object') return null;
  const top3 = Array.isArray(j.drafts?.top3) ? j.drafts.top3 : [];
  const needFix = Array.isArray(j.drafts?.needFix) ? j.drafts.needFix : [];
  // `hygieneOk` means no hard error, but warning flags still make a draft
  // non-clean. Keep the legacy fallback aligned with demigod-demand's
  // canonical `clean` count instead of silently promoting warned drafts.
  const cleanCount = top3.filter(
    (draft) => draft?.hygieneOk === true && Number(draft?.flagCount || 0) === 0,
  ).length;
  const allHygieneOk = j.drafts?.allHygieneOk ?? null;
  const sourceHygiene = j.drafts?.hygiene;
  // Prefer the path carried by the hygiene evidence itself. Canary and
  // isolated producers intentionally redirect demand materialization, and
  // replacing that provenance with the outer snapshot path makes the status
  // JSON advertise a different file than the one that produced the verdict.
  const hygieneStatusPath = sourceHygiene?.statusPath || j.statusPath || path.join(BUSY, 'demand-status.json');
  // A path alone is weak provenance: an independently refreshed producer can
  // replace the receipt at that path between dashboard polls. Bind the status
  // projection to the exact bytes inspected so file-only agents can detect
  // replacement or partial-copy drift without trusting mtime.
  const sourceReceipt = (() => {
    try {
      const bytes = fs.statSync(hygieneStatusPath).size;
      return {
        schema: 'demigod.source-receipt/1',
        capturedAt: new Date().toISOString(),
        path: hygieneStatusPath,
        bytes,
        sha256: sha256File(hygieneStatusPath),
      };
    } catch {
      return {
        schema: 'demigod.source-receipt/1',
        capturedAt: new Date().toISOString(),
        path: hygieneStatusPath,
        bytes: null,
        sha256: null,
      };
    }
  })();
  const hygieneAt = sourceHygiene?.at || j.at || null;
  const hygieneAtMs = Date.parse(hygieneAt || '');
  const hygieneTimestampInvalid = hygieneAt !== null && !Number.isFinite(hygieneAtMs);
  const hygieneRawAgeSec = (Date.now() - hygieneAtMs) / 1000;
  const hygieneClockSkewed = Number.isFinite(hygieneAtMs) && hygieneRawAgeSec < -60;
  const hygieneAgeSec = Number.isFinite(hygieneAtMs) && !hygieneClockSkewed
    ? Math.max(0, Math.round(hygieneRawAgeSec))
    : null;
  const hygieneOk = typeof sourceHygiene?.ok === 'boolean'
    ? sourceHygiene.ok
    : (typeof allHygieneOk === 'boolean' ? allHygieneOk : null);
  return {
    at: j.at || null,
    statusPath: j.statusPath || path.join(BUSY, 'demand-status.json'),
    sourceReceipt,
    pending: j.queue?.pending ?? null,
    sentConfirmed: j.dms?.sentConfirmed ?? null,
    pilotsFilled: j.pilots?.realFilled ?? null,
    next: j.next || null,
    top3: j.queue?.top3 || [],
    drafts: {
      top3,
      needFix,
      allHygieneOk,
      hygiene: {
        statusPath: hygieneStatusPath,
        jsonPointer: sourceHygiene?.jsonPointer || '/drafts/hygiene',
        // Keep the evidence binding beside the verdict. Status-path consumers
        // commonly read only drafts.hygiene; requiring them to join its parent
        // sourceReceipt makes a replaced demand receipt indistinguishable from
        // the bytes that originally produced this projection.
        sourceReceipt,
        source: typeof sourceHygiene?.ok === 'boolean'
          ? (sourceHygiene.source || 'drafts.hygiene')
          : (typeof allHygieneOk === 'boolean' ? 'drafts.allHygieneOk' : 'unknown'),
        at: hygieneAt,
        ageSec: hygieneAgeSec,
        stale: hygieneClockSkewed || hygieneAgeSec == null || hygieneAgeSec > 900,
        // Match demigod-orient's fail-closed evidence contract. Consumers of
        // dashboard-status.json can distinguish missing/old evidence from a
        // materially future-dated receipt instead of treating both as an
        // unexplained stale value.
        timestampInvalid: hygieneTimestampInvalid,
        clockSkewed: hygieneClockSkewed,
        checked: sourceHygiene?.checked ?? top3.length,
        clean: sourceHygiene?.clean ?? cleanCount,
        flagged: sourceHygiene?.flagged ?? needFix.length,
        // Preserve "unknown" instead of turning absent evidence into a false
        // hygiene failure (and the misleading dashboard label "0 flagged").
        ok: hygieneOk,
        // Publish the fail-closed verdict beside its provenance. File-only
        // consumers should not need to duplicate freshness and clock policy.
        ready:
          hygieneOk === true &&
          !hygieneClockSkewed &&
          hygieneAgeSec != null &&
          hygieneAgeSec <= 900 &&
          sourceReceipt.sha256 !== null,
      },
    },
    honesty: {
      autoDmAllowed: j.honesty?.autoDmAllowed === true,
      agentNeverAutoSends: j.honesty?.agentNeverAutoSends !== false,
      markSentRequiresAttestation: j.honesty?.markSentRequiresAttestation === true,
    },
  };
}

function run(cmd, timeout = 8000) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 2 * 1024 * 1024,
    }).trim();
  } catch (e) {
    return (e.stdout || e.stderr || e.message || '').toString().trim().slice(0, 400);
  }
}

function sha256File(file) {
  try {
    const buf = fs.readFileSync(file);
    return crypto.createHash('sha256').update(buf).digest('hex');
  } catch {
    return null;
  }
}

function detectAgent(name, head = '') {
  const n = (name + ' ' + head.slice(0, 200)).toLowerCase();
  if (/fable|df review/.test(n)) return 'fable';
  if (/sonnet/.test(n)) return 'sonnet';
  if (/opus/.test(n)) return 'opus';
  if (/codex/.test(n)) return 'codex';
  if (/grok|scheduler|hygiene|gate|dashboard/.test(n)) return 'grok/tools';
  if (/claude/.test(n)) return 'claude';
  return 'other';
}

function listRecentDir(dir, limit = 25) {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .map((name) => {
        const full = path.join(dir, name);
        let st;
        try {
          st = fs.statSync(full);
        } catch {
          return null;
        }
        if (!st.isFile()) return null;
        const head = safeRead(full, 600) || '';
        const preview = head
          .replace(/\s+/g, ' ')
          .replace(/OpenAI Codex[\s\S]{0,100}/g, '')
          .replace(/Reading prompt from stdin\.\.\./g, '')
          .slice(0, 200);
        return {
          name,
          path: full,
          bytes: st.size,
          mtime: st.mtime.toISOString(),
          ageSec: Math.round((Date.now() - st.mtimeMs) / 1000),
          preview,
          agent: detectAgent(name, head),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.mtime.localeCompare(a.mtime))
      .slice(0, limit);
  } catch {
    return [];
  }
}

function workerSnapshot() {
  const out = run(
    "ps -eo pid,etime,pcpu,pmem,cmd --width 220 | grep -E 'claude --print|codex exec|bin/df |demigod-agent-dashboard|chrome-devtools-mcp|remote-debugging-port=9223|cm6-paste' | grep -v grep | head -40",
  );
  const lines = out ? out.split('\n').filter(Boolean) : [];
  return lines.map((line) => {
    const m = line.trim().match(/^(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/);
    if (!m) return { raw: line.slice(0, 160) };
    const cmd = m[5];
    let kind = 'other';
    if (/model fable|fable/.test(cmd) && /claude/.test(cmd)) kind = 'fable';
    else if (/model sonnet/.test(cmd)) kind = 'sonnet';
    else if (/model opus/.test(cmd)) kind = 'opus';
    else if (/claude/.test(cmd)) kind = 'claude';
    else if (/codex exec/.test(cmd)) kind = 'codex';
    else if (/chrome-devtools/.test(cmd)) kind = 'chrome-mcp';
    else if (/remote-debugging|chrome-automation/.test(cmd)) kind = 'chrome-cdp';
    else if (/demigod-agent-dashboard/.test(cmd)) kind = 'dashboard';
    else if (/cm6-paste/.test(cmd)) kind = 'publish';
    return { pid: m[1], etime: m[2], pcpu: m[3], pmem: m[4], kind, cmd: cmd.slice(0, 140) };
  });
}

function footDisk() {
  const file = path.join(ROOT, 'demigod-foot-core.js');
  // Read the complete canonical file: __dgFootVer intentionally lives near EOF.
  // A truncated read made the dashboard silently fall back to the opening marker
  // and could hide a split-version release error.
  const js = safeRead(file, 2_000_000) || '';
  const privateVer = (js.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || [])[1] || null;
  const publicVer = (js.match(/dgFootVersion\s*=\s*['"]v?(\d+)['"]/) || [])[1] || null;
  const ver = privateVer || publicVer;
  const core = (js.match(/dg-foot-v(\d+)-core/) || [])[1] || null;
  return {
    ver,
    core: core ? `v${core}` : null,
    dgFootVersion: publicVer ? `v${publicVer}` : null,
    privateVersion: privateVer,
    versionMarkersAgree: Boolean(publicVer && privateVer && publicVer === privateVer),
    sha256: sha256File(file),
    bytes: (() => {
      try {
        return fs.statSync(file).size;
      } catch {
        return null;
      }
    })(),
  };
}

function footLock() {
  const lockPath = path.join(BUSY, 'foot-lock.txt');
  const lockJson = path.join(BUSY, 'foot-lock.json');
  const j = safeJson(lockJson);
  if (j) {
    const expiresAtMs = j.expiresAt ? Date.parse(j.expiresAt) : null;
    const expiryValid = expiresAtMs == null || Number.isFinite(expiresAtMs);
    // A malformed explicit expiry must never become an immortal dashboard lock.
    // Missing expiry remains valid for legacy/manual locks; an invalid timestamp
    // is treated as expired and surfaced through expiryValid=false.
    const expired = j.expiresAt != null && !Number.isFinite(expiresAtMs)
      ? true
      : Number.isFinite(expiresAtMs) && expiresAtMs < Date.now();
    const currentSha = sha256File(path.join(ROOT, 'demigod-foot-core.js'));
    const baseShaMatch = Boolean(j.baseSha && currentSha && j.baseSha === currentSha);
    const localOwner = !j.host || j.host === os.hostname();
    let ownerAlive = null;
    if (
      localOwner &&
      j.pidScope === 'lease-owner' &&
      Number.isInteger(Number(j.pid)) &&
      Number(j.pid) > 0
    ) {
      try {
        process.kill(Number(j.pid), 0);
        ownerAlive = true;
      } catch (err) {
        ownerAlive = err?.code === 'EPERM';
      }
    }
    const ttlLeftSec = Number.isFinite(expiresAtMs)
      ? Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000))
      : null;
    const changedSinceClaim = Boolean(j.baseSha && currentSha && !baseShaMatch);
    // A SHA change while a live lease is held is the expected result of the
    // owner editing foot-core. It is not evidence of a competing writer.
    // Reserve "compromised" for an unexpired lease whose recorded owner died.
    const compromised = !expired && ownerAlive === false;
    return {
      locked: !expired,
      path: lockPath,
      json: j,
      content: JSON.stringify(j).slice(0, 500),
      expired,
      expiryValid,
      ownerAlive,
      ttlLeftSec,
      baseShaMatch,
      changedSinceClaim,
      // Keep the lease enforced until expiry, but make stale-owner or
      // out-of-lease writes unmistakable to status/API consumers.
      compromised,
    };
  }
  const raw = safeRead(lockPath, 2000);
  if (!raw) return { locked: false, path: lockPath };
  return { locked: true, path: lockPath, content: raw.slice(0, 500) };
}

const LIVE_PROBE_TTL_MS = Number(process.env.DEMIGOD_LIVE_PROBE_TTL_MS) || 15000;
let liveProbeCache = { at: 0, data: null };

function footCdnUrls(value) {
  const text = String(value || '');
  const explicit = [...text.matchAll(/<script\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => /\bid=["']demigod-foot-cdn-loader["']/i.test(tag) || /\/foot-latest\.js(?:[?#"'])/i.test(tag))
    .map((tag) => (tag.match(/\bsrc=["'](https:\/\/[^"'\s<>]+)["']/i) || [])[1])
    .filter((url) =>
      /^https:\/\/(?:cdn\.jsdelivr\.net\/gh\/[^/]+\/[^/]+\/(?:[^\s<>/]+\/)*foot-latest\.js|cdn\.statically\.io\/gh\/[^/]+\/[^/]+\/[^/]+\/(?:[^\s<>/]+\/)*foot-latest\.js|(?:files|litter)\.catbox\.moe\/[a-z0-9]+\.js|gist\.githubusercontent\.com\/\S+\.js)(?:[?#]\S*)?$/i.test(url),
    );
  if (explicit.length) return explicit;

  // Legacy manifests can point directly at an opaque Catbox/Gist JS URL. Only
  // accept those when the whole value is a URL; scanning arbitrary live HTML
  // used to count unrelated product-map assets as extra foot loaders.
  const trimmed = text.trim();
  if (/^https:\/\/(?:files|litter)\.catbox\.moe\/[a-z0-9]+\.js(?:[?#]\S*)?$/i.test(trimmed)) return [trimmed];
  if (/^https:\/\/cdn\.statically\.io\/gh\/[^/]+\/[^/]+\/[^/]+\/(?:[^\s<>/]+\/)*foot-latest\.js(?:[?#]\S*)?$/i.test(trimmed)) return [trimmed];
  if (/^https:\/\/gist\.githubusercontent\.com\/\S+\.js(?:[?#]\S*)?$/i.test(trimmed)) return [trimmed];
  return [];
}

function footCdnUrl(value) {
  return footCdnUrls(value)[0] || null;
}

function footCdnKey(value) {
  const direct = String(value || '').trim();
  if (/^https:\/\/cdn\.jsdelivr\.net\/gh\/[^/]+\/[^/]+\/(?:[^\s<>/]+\/)*foot-latest\.js(?:[?#]\S*)?$/i.test(direct)) {
    return direct.replace(/[?#].*$/, '');
  }
  const url = footCdnUrl(value);
  return url ? url.replace(/[?#].*$/, '') : null;
}

function htmlHead(value) {
  const html = String(value || '');
  const match = html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i);
  return match ? match[1] : '';
}

async function liveProbe({ force = false } = {}) {
  const now = Date.now();
  if (!force && liveProbeCache.data && now - liveProbeCache.at < LIVE_PROBE_TTL_MS) {
    return { ...liveProbeCache.data, cached: true, cacheAgeMs: now - liveProbeCache.at };
  }
  const started = Date.now();
  try {
    const r = await fetch(`${LIVE}/?cb=${Date.now()}`, {
      headers: { 'User-Agent': 'dg-dashboard' },
      signal: AbortSignal.timeout(6000),
    });
    const html = await r.text();
    const headHtml = htmlHead(html);
    // Prefer real foot <script src=…> — product map lists other catbox .js first in footer-lite
    const cdnUrls = footCdnUrls(html);
    const cdn = cdnUrls[0] || null;
    const cdnKeys = cdnUrls.map(footCdnKey).filter(Boolean);
    const pub = (html.match(/Last Published:[^<]{0,70}/) || [])[0] || null;
    const foot = (html.match(/foot v\d+/) || [])[0] || null;
    const data = {
      ok: r.ok,
      status: r.status,
      ms: Date.now() - started,
      cdn,
      cdnId: footCdnKey(cdn),
      cdnUrls,
      cdnCount: cdnUrls.length,
      cdnUniqueCount: new Set(cdnKeys).size,
      singleFootCdn: cdnUrls.length === 1,
      pub,
      foot,
      // Scope the head gate to <head>; a body/footer comment must not make a
      // structurally corrupt custom-code paste look canonical.
      hasUnhide: /unhide-v5/.test(headHtml),
      hasCriticalUnhide: /dg-unhide-critical/.test(headHtml),
      canonicalHead: /unhide-v5/.test(headHtml) && /dg-unhide-critical/.test(headHtml),
      hasStartupModal: /startup-modal/.test(html),
      hasPathPills: /dg-path-pills|I'm hiring|I.?m hiring/.test(html) || /path-pills/.test(html),
    };
    liveProbeCache = { at: Date.now(), data };
    return data;
  } catch (e) {
    const data = { ok: false, error: String(e.message || e), ms: Date.now() - started };
    // Cache failures too. Without this, concurrent dashboard/status refreshes
    // stampede the same unavailable live endpoint until it recovers.
    liveProbeCache = { at: Date.now(), data };
    return data;
  }
}

/** In-memory status cache + singleflight — stops auto-refresh stampede + double work */
const STATUS_TTL_MS = Number(process.env.DEMIGOD_STATUS_TTL_MS) || 15000;
let statusCache = { at: 0, data: null };
let statusInflight = null;
/** Control plane is expensive (~1s) — reuse within TTL */
const CONTROL_TTL_MS = Number(process.env.DEMIGOD_CONTROL_TTL_MS) || 12000;
let controlCache = { at: 0, data: null };
/** /api/coord is hot-polled by UI + heartbeat — short cache (skip catbox live CSS by default) */
const COORD_TTL_MS = Number(process.env.DEMIGOD_COORD_TTL_MS) || 12000;
let coordCache = { at: 0, data: null };
/** Match queue rebuild can be skipped when fresh */
const MATCH_TTL_MS = Number(process.env.DEMIGOD_MATCH_TTL_MS) || 60000;
let matchCache = { at: 0, data: null };
/** HTML UI shell cache by mtime */
let uiHtmlCache = { mtimeMs: 0, html: '' };
/** Background demand refresh — never block collectStatus */
let demandRefreshInflight = false;

function jsonSend(res, code, obj, { pretty = false, headers = {} } = {}) {
  const body = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function isLocalHttpUrl(value) {
  try {
    const parsed = new URL(String(value || ''));
    return (
      parsed.protocol === 'http:' &&
      (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') &&
      parsed.port === String(PORT)
    );
  } catch {
    return false;
  }
}

function localMutationRequest(req) {
  const origin = String(req.headers.origin || '');
  const referer = String(req.headers.referer || '');
  // An explicit Origin is authoritative. Headerless CLI calls remain allowed;
  // otherwise a Referer must resolve to this dashboard's loopback port, not
  // merely some other local web app that can forge a mutation POST.
  return origin ? isLocalHttpUrl(origin) : !referer || isLocalHttpUrl(referer);
}

function slimStatus(data) {
  /** Minimal payload for UI poll — cuts ~65KB pretty → ~few KB */
  return {
    at: data.at,
    version: data.version,
    cached: data.cached,
    cacheAgeMs: data.cacheAgeMs,
    statusJsonPath: data.statusJsonPath || STATUS_JSON,
    statusJsonContract: data.statusJsonContract || null,
    statusDiscovery: data.statusDiscovery || null,
    statusVisibility: data.statusVisibility || null,
    statusPathView: data.statusPathView || null,
    // Preserve the dedicated file-reader proof in the slim API too. Without
    // this, agents polling /api/status?slim=1 lose the exact /api/orient +
    // demand-draft-hygiene view that dashboard-status.json advertises.
    statusJsonPathView: data.statusJsonPathView || null,
    orientApi: data.orientApi || '/api/orient',
    orientUrl: data.orientUrl || `http://127.0.0.1:${PORT}/api/orient`,
    cycleWork: data.cycleWork || null,
    cycleWorkHealth: data.cycleWorkHealth || null,
    priorityBoard: data.priorityBoard || null,
    webflow: data.webflow || null,
    fullPass: data.fullPass || null,
    demandDraftsHygiene: data.demandDraftsHygiene || null,
    demandDraftsHygieneOk: data.demandDraftsHygiene?.ok ?? null,
    demandDraftsHygieneSource: data.demandDraftsHygieneSource || 'unknown',
    demandDraftsHygieneAt: data.demandDraftsHygieneAt || null,
    demandDraftsHygieneAgeSec: data.demandDraftsHygieneAgeSec ?? null,
    demandDraftsHygieneStale: data.demandDraftsHygieneStale ?? true,
    demandDraftsHygieneReady: data.demandDraftsHygieneReady === true,
    draftHygieneVerdict: data.draftHygieneVerdict || null,
    demandDraftsHygieneStatusPath:
      data.demandDraftsHygieneStatusPath ||
      data.demandDraftsHygiene?.statusPath ||
      data.demandStatusPath ||
      path.join(BUSY, 'demand-status.json'),
    demandStatusPath: data.demandStatusPath || path.join(BUSY, 'demand-status.json'),
    timing: data.timing,
    pulseKey: data.pulseKey,
    next: data.next,
    glance: data.glance,
    sessionStory: data.sessionStory,
    truthEvidence: data.truthEvidence,
    orient: data.orient,
    demand: data.demand,
    freeze: data.freeze,
    live: data.live
      ? {
          ok: data.live.ok,
          foot: data.live.foot,
          cdnId: data.live.cdnId,
          cdnCount: data.live.cdnCount,
          cdnUniqueCount: data.live.cdnUniqueCount,
          singleFootCdn: data.live.singleFootCdn,
          cdnUrls: data.live.cdnUrls,
          hasUnhide: data.live.hasUnhide,
          hasCriticalUnhide: data.live.hasCriticalUnhide,
          canonicalHead: data.live.canonicalHead,
          error: data.live.error,
          ms: data.live.ms,
        }
      : null,
    jobQueue: data.jobQueue
      ? {
          running: data.jobQueue.running,
          recent: (data.jobQueue.recent || []).slice(0, 6),
          last: data.jobQueue.last,
        }
      : null,
    staleGates: data.staleGates,
    freshness: data.freshness,
    gates: data.gates
      ? {
          verifySourcePass: data.gates.verifySourcePass,
          verifySourceFresh: data.gates.verifySourceFresh,
          verifySourceTrust: data.gates.verifySourceTrust,
        }
      : null,
    truth: data.truth
      ? {
          foot: data.truth.foot ? { ver: data.truth.foot.ver } : null,
          live: data.truth.live ? { footVer: data.truth.live.footVer } : null,
          summaryLine: data.truth.summaryLine,
          pass: data.truth.pass,
        }
      : null,
    control: data.control
      ? {
          health: data.control.health,
          healthLabel: data.control.healthLabel,
          frozen: data.control.frozen,
          sessionMode: data.control.sessionMode,
          spine: (data.control.spine || []).slice(0, 6),
          modules: data.control.modules,
          moduleOrder: data.control.moduleOrder,
        }
      : null,
    handoffs: (data.handoffs || []).slice(0, 8),
    inbox: data.inbox
      ? { total: data.inbox.total, newCount: data.inbox.newCount, rows: (data.inbox.rows || []).slice(0, 8) }
      : null,
    matches: data.matches
      ? { summary: data.matches.summary, pairs: (data.matches.pairs || []).slice(0, 12) }
      : null,
    shipChecklist: data.shipChecklist
      ? { ready: data.shipChecklist.ready, frozen: data.shipChecklist.frozen, stage: data.shipChecklist.stage }
      : null,
    board: data.board,
    smoke: data.smoke ? { pass: data.smoke.pass, at: data.smoke.at } : null,
    cdp: data.cdp ? { up: data.cdp.up, pages: data.cdp.pages } : null,
    foot: data.foot
      ? {
          disk: data.foot.disk ? { ver: data.foot.disk.ver, sha12: data.foot.disk.sha12 } : null,
          liveMatchNote: data.foot.liveMatchNote,
        }
      : null,
    slim: true,
  };
}

function productHealth(data) {
  const processOk = true;
  const truthGreen = data?.truthEvidence?.green === true;
  const freezeOn = data?.freeze?.on === true || data?.control?.frozen === true;
  const demandStarved = data?.control?.healthLabel === 'demand-starved';
  const nextId = data?.next?.id || data?.control?.nextCanon?.id || null;
  const blockedBy = [];
  if (!truthGreen) blockedBy.push('truth-evidence');
  if (data?.orient?.assertSame?.ok === false) blockedBy.push('next-mismatch');
  const productOk = processOk && truthGreen && blockedBy.length === 0;
  const reportedLabel = data?.control?.healthLabel || data?.glance?.light || 'unknown';
  const healthLabel = productOk
    ? reportedLabel
    : reportedLabel === 'solid' || reportedLabel === 'green'
      ? 'watch'
      : reportedLabel;
  return {
    ok: productOk,
    processOk,
    productOk,
    truthGreen,
    freezeOn,
    health: data?.control?.health ?? null,
    healthLabel,
    demandStarved,
    lampsSummary: data?.orient?.lamps || data?.control?.lamps || null,
    nextId,
    blockedBy,
    at: data?.at || null,
  };
}

async function cdpProbe() {
  try {
    const ver = await (await fetch(`${CDP}/json/version`, { signal: AbortSignal.timeout(2000) })).json();
    const list = await (await fetch(`${CDP}/json/list`, { signal: AbortSignal.timeout(2000) })).json();
    const pages = (list || []).filter((t) => t.type === 'page');
    return {
      up: true,
      browser: ver.Browser || 'cdp',
      targets: list.length,
      pages: pages.length,
      pageUrls: pages.map((p) => (p.url || '').slice(0, 100)),
      hasCustomCode: pages.some((p) => /custom-code/.test(p.url || '')),
      hasDesigner: pages.some((p) => /design\.webflow\.com/.test(p.url || '')),
      hasLive: pages.some((p) => /trydemigod\.com/.test(p.url || '')),
    };
  } catch {
    return { up: false, targets: 0, pages: 0, pageUrls: [], hasCustomCode: false, hasDesigner: false, hasLive: false };
  }
}

function loadAvg() {
  try {
    const [a, b, c] = fs.readFileSync('/proc/loadavg', 'utf8').trim().split(/\s+/);
    return { '1m': a, '5m': b, '15m': c };
  } catch {
    return null;
  }
}

function memInfo() {
  try {
    const t = fs.readFileSync('/proc/meminfo', 'utf8');
    const get = (k) => {
      const m = t.match(new RegExp(`^${k}:\\s+(\\d+)`, 'm'));
      return m ? Math.round(Number(m[1]) / 1024) : null;
    };
    return { totalMb: get('MemTotal'), availableMb: get('MemAvailable'), freeMb: get('MemFree') };
  } catch {
    return null;
  }
}

function deriveActions(ctx) {
  const actions = [];
  const { live, cdp, foot, gates, env, board, workers, multiTop } = ctx;

  if (foot?.disk && foot.disk.versionMarkersAgree !== true) {
    actions.push({
      pri: 0,
      id: 'disk-foot-version-markers',
      title: 'Disk foot version markers disagree or are incomplete',
      why: `dgFootVersion=${foot.disk.dgFootVersion || 'missing'} __dgFootVer=${foot.disk.privateVersion || 'missing'}`,
      cmd: 'node --check demigod-foot-core.js && node demigod-foot-smoke.mjs',
      owner: 'foot-lock-owner',
    });
  }

  if (!live?.ok) {
    actions.push({
      pri: 0,
      id: 'live-down',
      title: 'Live site probe failed',
      why: live?.error || 'live not ok',
      cmd: `curl -sS -o /dev/null -w '%{http_code}' ${LIVE}/`,
      owner: 'grok',
    });
  }

  if (live?.ok && live?.cdnCount !== 1) {
    actions.push({
      pri: 0,
      id: 'foot-loader-count',
      title: `Live HTML has ${live?.cdnCount ?? 0} foot loader references (expected exactly 1)`,
      why: (live?.cdnUrls || []).join(' · ') || 'no supported foot CDN URL found',
      cmd: 'node demigod-cm6-paste-publish.mjs',
      owner: 'grok',
    });
  }

  if (live?.ok && live?.canonicalHead !== true) {
    actions.push({
      pri: 0,
      id: 'canonical-head-missing',
      title: 'Live HTML is missing canonical unhide-v5 head markers',
      why: `unhide-v5=${live?.hasUnhide === true} dg-unhide-critical=${live?.hasCriticalUnhide === true}`,
      cmd: 'node demigod-cm6-paste-publish.mjs',
      owner: 'grok',
    });
  }

  const freezeOnEarly = Boolean(safeJson(path.join(BUSY, 'publish-freeze.json'))?.on);
  const manId = footCdnKey(foot?.manifest?.cdnUrl);
  const liveId = live?.cdnId;
  if (manId && liveId && manId !== liveId) {
    // Under freeze: expected lag is NOT a ship P0 (Codex N-D4 dual-P0 ban)
    actions.push({
      pri: freezeOnEarly ? 3 : 0,
      id: freezeOnEarly ? 'cdn-drift-expected' : 'cdn-drift',
      title: freezeOnEarly
        ? `CDN lag under freeze (expected): live=${liveId} ≠ manifest=${manId}`
        : 'Live CDN ≠ manifest — release staging is not attested',
      why: freezeOnEarly
        ? 'freeze ON — demand-first; not a second P0'
        : `live=${liveId} manifest=${manId}`,
      // Frozen drift is state to observe, not work to assign. Keep the row
      // useful with a read-only evidence command and no human owner.
      cmd: freezeOnEarly ? 'bin/dg truth' : 'node demigod-cm6-paste-publish.mjs',
      owner: freezeOnEarly ? 'freeze-gate' : 'grok',
    });
  }

  const diskVer = foot?.disk?.ver;
  const liveFoot = live?.foot?.replace(/foot v/, '') || null;
  if (diskVer && liveFoot && diskVer !== liveFoot) {
    actions.push({
      pri: freezeOnEarly ? 3 : 0,
      id: freezeOnEarly ? 'ver-drift-expected' : 'ver-drift',
      title: freezeOnEarly
        ? `Expected drift under freeze: disk v${diskVer} vs live v${liveFoot}`
        : `Disk foot v${diskVer} vs live ${live?.foot}`,
      why: freezeOnEarly
        ? 'freeze ON — intentional until human unfreeze; not a ship P0'
        : 'Hash/version drift — do not claim ship until CDN matches',
      cmd: freezeOnEarly
        ? 'bin/dg truth'
        : 'node --check demigod-foot-core.js && npm run demigod:foot:cdn # or manual catbox + cm6',
      owner: freezeOnEarly ? 'freeze-gate' : 'grok',
    });
  }

  if (gates?.verifySourcePass === false) {
    actions.push({
      pri: 0,
      id: 'gate-fail',
      title: 'verify:source FAIL',
      why: (gates.verifyFailed || []).join(', ') || 'see DEMIGOD-VERIFY-SOURCE.json',
      cmd: 'npm run demigod:verify:source',
      owner: 'grok',
    });
  }

  if (foot?.lock?.locked) {
    const ownerState = foot.lock.ownerAlive === false
      ? `owner process exited; lease remains valid for ${foot.lock.ttlLeftSec ?? '?'}s`
      : foot.lock.ownerAlive === true
        ? 'owner process alive'
        : 'owner liveness unknown';
    const changedSinceClaim = foot.lock.changedSinceClaim === true
      ? '; foot changed since this lease was claimed'
      : '';
    actions.push({
      pri: 1,
      id: 'foot-lock',
      title: 'Foot lock held — do not edit foot-core',
      why: `${ownerState}${changedSinceClaim}; ${foot.lock.content?.slice(0, 120) || 'lock present'}`,
      cmd: `cat ${foot.lock.path}`,
      owner: 'any',
    });
  }

  if (!cdp?.up) {
    actions.push({
      pri: 2,
      id: 'cdp-down',
      title: 'CDP down — cannot Webflow publish / wiz CDP',
      why: 'Port 9223 not answering',
      cmd: '~/agent-dev.sh chrome',
      owner: 'grok',
    });
  } else if (cdp.up && !cdp.hasCustomCode) {
    actions.push({
      pri: 2,
      id: 'cdp-no-custom-code',
      title: 'CDP up but custom-code tab missing',
      why: 'Open Webflow custom code for paste-publish',
      cmd: 'npm run demigod:workspace # or open custom-code URL',
      owner: 'grok',
    });
  }

  if (!env?.OPENAI_API_KEY) {
    actions.push({
      pri: 3,
      id: 'no-openai-key',
      title: 'Codex API key path unavailable',
      why: 'OPENAI_API_KEY missing — Pro CLI still works',
      cmd: 'codex exec "…"  # Pro session; or export OPENAI_API_KEY',
      owner: 'human',
    });
  }

  const realRoles = board?.signal?.realRoles ?? board?.realRoles ?? 0;
  if ((board?.roles || 0) > 3) {
    actions.push({
      pri: 1,
      id: 'board-trim',
      title: 'Board roles > 3 — honesty risk',
      why: `roles=${board.roles}`,
      cmd: 'node demigod-verify-board-honesty.mjs',
      owner: 'grok',
    });
  }

  // Site healthy only when full hash chain + FRESH truth evidence (unforgeable green)
  const diskVerGreen = foot?.disk?.ver || foot?.disk?.core || diskVer || null;
  const liveVerGreen = (live?.foot || '').replace(/^foot\s*v?/i, '') || null;
  const truthGreen = safeJson(path.join(BUSY, 'truth.json'));
  let truthEvidenceOk = false;
  try {
    const evPath = path.join(BUSY, 'evidence', 'latest-truth.json');
    if (fs.existsSync(evPath)) {
      const env = JSON.parse(fs.readFileSync(evPath, 'utf8'));
      const files = env.inputsAtSeal?.files || env.inputs?.files || {};
      let mismatch = false;
      for (const [rel, sha] of Object.entries(files)) {
        if (!sha) continue;
        try {
          const cur = crypto
            .createHash('sha256')
            .update(fs.readFileSync(path.join(ROOT, rel)))
            .digest('hex');
          if (cur !== sha) mismatch = true;
        } catch {
          mismatch = true;
        }
      }
      const ended = Date.parse(env.endedAt || '');
      const ttl = (env.ttlSec || 3600) * 1000;
      const ageMs = Date.now() - ended;
      // A pass without a valid seal time is not fresh evidence. Also reject
      // seals materially dated in the future instead of silently blessing a
      // clock-skewed or malformed envelope forever.
      const timestampValid = Number.isFinite(ended) && ageMs >= -60_000;
      const expired = !timestampValid || ageMs > ttl;
      truthEvidenceOk = Boolean(env.result?.pass) && !mismatch && !expired;
    }
  } catch {
    truthEvidenceOk = false;
  }
  const liveEqDiskGreen =
    truthEvidenceOk ||
    truthGreen?.claims?.['live==disk'] === true ||
    truthGreen?.match?.cdnBodyMatchesDisk === true;
  // Prefer evidence green; never site-green without fresh truth when evidence exists
  const freezeOnGreen = Boolean(safeJson(path.join(BUSY, 'publish-freeze.json'))?.on);
  if (
    live?.ok &&
    live?.singleFootCdn === true &&
    live?.canonicalHead === true &&
    gates?.verifySourcePass === true &&
    manId &&
    liveId &&
    manId === liveId &&
    diskVerGreen &&
    liveVerGreen &&
    String(diskVerGreen) === String(liveVerGreen) &&
    liveEqDiskGreen &&
    truthEvidenceOk &&
    !freezeOnGreen
  ) {
    actions.push({
      pri: 3,
      id: 'site-green',
      title: 'Site green — fresh truth evidence; avoid foot thrash',
      why: `live==disk v${liveVerGreen} cdn=${liveId} evidence-fresh`,
      cmd: 'bin/dg truth; bin/dg-preflight',
      owner: 'grok',
    });
  } else if (live?.ok && diskVerGreen && liveVerGreen && String(diskVerGreen) !== String(liveVerGreen)) {
    actions.push({
      pri: freezeOnGreen ? 2 : 1,
      id: 'disk-live-drift',
      title: freezeOnGreen
        ? `Disk v${diskVerGreen} vs live v${liveVerGreen} (freeze ON — intentional until unfreeze)`
        : `Disk v${diskVerGreen} vs live v${liveVerGreen} — publish needed`,
      why: freezeOnGreen ? 'publish-freeze on' : 'ship foot CDN + Webflow',
      cmd: freezeOnGreen
        ? 'node demigod-publish-freeze.mjs status'
        : 'node demigod-foot-cdn-publish.mjs && node demigod-cm6-paste-publish.mjs',
      owner: 'grok',
    });
  }

  // Prefer plan-inbox cursor (honors --mark); fall back to fresh multi heuristic
  const inboxSnap = safeJson(path.join(BUSY, 'plan-inbox-latest.json'));
  const unreadUseful = (inboxSnap?.unread || []).filter((f) => !f.noise);
  if (unreadUseful.length) {
    actions.push({
      pri: 2,
      id: 'read-plans',
      title: `Unread plan-inbox items (${unreadUseful.length})`,
      why: unreadUseful.map((f) => f.name).slice(0, 3).join(', '),
      cmd: 'node demigod-plan-inbox.mjs --useful',
      owner: 'grok',
    });
  } else {
    const freshPlans = (multiTop || []).filter(
      (f) => f.ageSec < 900 && /fable|opus|plan|strategy/.test(f.agent + f.name) && f.bytes > 200,
    );
    // only if inbox never marked (no cursor) — avoid re-nag after --mark
    if (freshPlans.length && !inboxSnap?.lastReadAt) {
      actions.push({
        pri: 2,
        id: 'read-plans',
        title: `Fresh agent drops (${freshPlans.length})`,
        why: freshPlans.map((f) => f.name).slice(0, 3).join(', '),
        cmd: 'node demigod-plan-inbox.mjs --useful',
        owner: 'grok',
      });
    }
  }

  // Preflight cache
  const pf = safeJson(path.join(BUSY, 'preflight-latest.json'));
  if (pf && pf.pass === false) {
    actions.push({
      pri: 1,
      id: 'preflight-red',
      title: 'Preflight FAIL — fix before foot edits',
      why: (pf.next || (pf.steps || []).filter((s) => !s.ok).map((s) => s.label).join(', ')).slice(0, 160),
      cmd: 'node demigod-preflight.mjs --strict',
      owner: 'grok',
    });
  }

  // Open plan ledger items
  try {
    const ledger = safeJson(path.join(ROOT, 'DEMIGOD-PLAN-LEDGER.json'));
    const open = (ledger?.plans || []).filter((p) => !['applied', 'ignored'].includes(p.status));
    if (open.length) {
      actions.push({
        pri: 3,
        id: 'open-plans',
        title: `Open plan-ledger items (${open.length})`,
        why: open.map((p) => p.title).slice(0, 3).join('; '),
        cmd: 'node demigod-plan-ledger.mjs open',
        owner: 'grok',
      });
    }
  } catch {
    /* */
  }

  const busyAgents = (workers || []).filter((w) => w.kind && !['dashboard', 'chrome-cdp', 'chrome-mcp', 'other'].includes(w.kind));
  // Intentional swarm: recent /tmp/dg-busy/swarm → do NOT recommend hygiene kill
  let swarmHot = false;
  try {
    const s = path.join(BUSY, 'swarm');
    if (fs.existsSync(s)) {
      const st = fs.statSync(s);
      swarmHot = Date.now() - st.mtimeMs < 2 * 3600 * 1000;
    }
  } catch {
    /* */
  }
  if (busyAgents.length >= 6 && !swarmHot) {
    actions.push({
      pri: 2,
      id: 'thrash',
      title: 'Many agent workers — check before hygiene kill',
      why: busyAgents.map((w) => w.kind).join(', '),
      cmd: 'pgrep -af "claude --print|codex exec|bin/df"; # only kill if NOT intentional swarm',
      owner: 'grok',
    });
  }

  actions.sort((a, b) => a.pri - b.pri || a.id.localeCompare(b.id));
  return actions;
}

function buildAgentBrief(data) {
  const a = data.actions || [];
  let top = a.filter((x) => x.pri <= 2).slice(0, 8);
  // Under freeze + demand-ops: exactly one P0 (demand); drift is expected note not peer P0
  if (data.freeze?.on) {
    const p0 = top.filter((x) => x.pri === 0);
    if (p0.length > 1) {
      const prefer =
        p0.find((x) => /demand|cockpit-demand/i.test(String(x.id) + x.title + x.cmd)) || p0[0];
      top = [prefer, ...top.filter((x) => x.pri !== 0 || x.id === prefer.id)].slice(0, 8);
    }
  }
  const pf = data.preflight || safeJson(path.join(BUSY, 'preflight-latest.json'));
  const inbox = data.inbox || safeJson(path.join(BUSY, 'plan-inbox-latest.json'));
  const orient = safeJson(path.join(BUSY, 'orient.json'));
  const unify = safeJson(path.join(BUSY, 'unify.json'));
  const unifyOnly =
    process.env.DEMIGOD_BRIEF_UNIFY_ONLY === '1' ||
    process.env.DEMIGOD_BRIEF_UNIFY_ONLY === 'true';
  const lines = [];
  lines.push(`# Demigod AGENT-BRIEF`);
  lines.push(`at: ${data.at}`);
  lines.push(`phase: ${data.phase}`);
  lines.push(`decision: ${data.decision}`);
  lines.push('');
  // Orient is the canonical compact entry point. Keep unify as a richer
  // fallback for older receipts, but do not advertise it as the starting API.
  const spine = orient?.next ? orient : unify;
  lines.push('## Orient (canonical entry — prefer /api/orient)');
  if (spine?.next) {
    lines.push(`- NEXT: **${spine.next.title}**`);
    lines.push(`- cmd: \`${spine.next.cmd}\``);
    lines.push(`- id=${spine.next.id} green=${spine.green ?? spine.truthEvidence?.green} freeze=${spine.freeze?.on ? 'ON' : 'OFF'}`);
    if (spine.demand) {
      lines.push(
        `- demand: pending=${spine.demand.pending} sent=${spine.demand.sentConfirmed} pilots=${spine.demand.pilotsFilled}`,
      );
      const draftHygiene = spine.demand?.drafts?.hygiene || spine.demandDraftsHygiene || null;
      const draftHygieneState = draftHygiene?.stale === true
        ? 'STALE'
        : draftHygiene?.ok === true
          ? 'clean'
          : draftHygiene?.ok === false
            ? 'FIX'
            : 'unknown';
      lines.push(
        `- drafts.hygiene: ${draftHygieneState} checked=${draftHygiene?.checked ?? '?'} flagged=${draftHygiene?.flagged ?? '?'} source=${draftHygiene?.source || 'unknown'}`,
      );
    }
    if (spine.truth?.summary) lines.push(`- truth: ${spine.truth.summary}`);
    if (spine.ship) lines.push(`- ship stage: ${spine.ship.stage} shipped=${spine.ship.shipped}`);
    if (spine.lock) lines.push(`- foot lock: ${spine.lock.held ? spine.lock.owner : 'free'}`);
    lines.push('- curl: `http://127.0.0.1:9878/api/orient`');
    lines.push('- cli: `bin/dg orient`');
    if (unify.cli?.spine?.length) {
      lines.push('- spine:');
      for (const c of unify.cli.spine) lines.push(`  - \`${c}\``);
    }
    if (unify.rules?.length) {
      lines.push('- rules: ' + unify.rules.join(' · '));
    }
  } else {
    lines.push('- (run bin/dg orient to refresh orient.json)');
  }
  lines.push('');
  if (unifyOnly) {
    lines.push('## FREEZE');
    lines.push(
      data.freeze?.on
        ? `- ON — ${data.freeze.why || 'publish frozen'} (no CDN/Webflow mutate)`
        : '- OFF — mutate only with lock + intent',
    );
    lines.push('');
    lines.push('_Brief mode: DEMIGOD_BRIEF_UNIFY_ONLY — full snapshot omitted._');
    lines.push('');
    return lines.join('\n') + '\n';
  }
  // FREEZE FIRST — Fable/agents must see this before any green gate
  lines.push('## FREEZE (read first)');
  if (data.freeze?.on) {
    lines.push(`- **ON** — ${data.freeze.why || 'publish frozen'}`);
    lines.push(`- at: ${data.freeze.at || '—'} by: ${data.freeze.by || '—'}`);
    lines.push('- **Do not ship CDN / Webflow / mutate jobs.** Safe: smoke, truth, brief, handoff.');
  } else {
    lines.push('- **OFF** — ship allowed if cockpit NEXT says so and lock free');
  }
  lines.push('');
  if (data.next?.cmd || data.next?.title) {
    lines.push('## NEXT contract (stable — parse this)');
    lines.push(`- id: ${data.next.id}`);
    lines.push(`- pri: ${data.next.pri}`);
    lines.push(`- title: ${data.next.title}`);
    lines.push(`- mutate: ${data.next.mutate} · freezeBlocks: ${data.next.freezeBlocks} · shipped: ${data.next.shipped}`);
    lines.push(`- cmd: \`${data.next.cmd || ''}\``);
    lines.push('');
  }
  lines.push('## Snapshot');
  lines.push(`- live: ${data.live?.ok ? 'OK' : 'FAIL'} ${data.live?.foot || ''} ${data.live?.cdnId || data.live?.cdn || ''}`);
  lines.push(`- disk foot: v${data.foot?.disk?.ver || '?'} sha256=${(data.foot?.disk?.sha256 || '').slice(0, 12)}…`);
  lines.push(`- manifest: ${data.foot?.manifest?.version || '?'} ${data.foot?.manifest?.cdnUrl || ''}`);
  lines.push(`- match: ${data.foot?.liveMatchNote || '?'}`);
  const vf = data.freshness?.verifySource;
  const verifyLabel =
    data.gates?.verifySourcePass === true ? 'PASS' : data.gates?.verifySourcePass === false ? 'FAIL' : '?';
  const verifyFresh = vf ? (vf.fresh ? 'fresh' : `STALE(${vf.label})`) : '?';
  lines.push(`- gates verify:source: ${verifyLabel} [${verifyFresh}]${vf?.lagSec != null ? ` lag=${vf.lagSec}s` : ''}`);
  if (vf && !vf.fresh) {
    lines.push(`  ⚠ do not trust verify PASS until: npm run demigod:verify:source`);
  }
  lines.push(`- board: roles=${data.board?.roles ?? '?'} signal=${JSON.stringify(data.board?.signal || {})}`);
  if (data.matches?.summary) {
    lines.push(
      `- matches: total=${data.matches.summary.total ?? '?'} byState=${JSON.stringify(data.matches.summary.byState || {})}`,
    );
    lines.push(`  review: bin/dg-matches list · curl -sS http://127.0.0.1:${PORT}/api/matches`);
  }
  if (data.inbox && !data.inbox.error) {
    lines.push(`- submissions inbox: new=${data.inbox.newCount ?? 0} total=${data.inbox.total ?? 0}`);
  }
  lines.push(`- cdp: ${data.cdp?.up ? 'UP' : 'DOWN'} pages=${data.cdp?.pages ?? 0}`);
  lines.push(`- foot-lock: ${data.foot?.lock?.locked ? 'HELD ' + (data.foot.lock.json?.owner || '') : 'free'}`);
  lines.push(`- preflight: ${pf?.pass === true ? 'PASS' : pf?.pass === false ? 'FAIL' : '?'} ${pf?.at ? '(' + pf.at + ')' : ''}`);
  lines.push(`- plan-inbox: unread=${inbox?.unreadCount ?? '?'} open_plans=${inbox?.openPlans?.length ?? '?'}`);
  const truth = data.truth || safeJson(path.join(BUSY, 'truth.json'));
  if (truth) {
    lines.push(`- truth fullyShipped: ${truth.match?.fullyShipped}  claims.live==disk: ${truth.claims?.['live==disk']}`);
  }
  lines.push(`- openai_key: ${data.env?.OPENAI_API_KEY ? 'set' : 'missing'}`);
  lines.push(`- cockpit shipped: ${data.cockpit?.shipped ?? '?'}`);
  lines.push(`- jobs running: ${data.jobQueue?.running || 'none'} recent=${data.jobQueue?.recent?.length ?? 0}`);
  lines.push(`- workers: ${JSON.stringify(data.workerCounts || {})}`);
  lines.push(`- load: ${data.system?.load?.['1m'] || '?'} mem_avail_mb: ${data.system?.mem?.availableMb ?? '?'}`);
  if (data.sessionStory) {
    lines.push('');
    lines.push('## Session story');
    lines.push(`- ${data.sessionStory}`);
  }
  if ((data.staleGates || []).length || (data.freshness && Object.values(data.freshness).some((f) => f && !f.fresh))) {
    lines.push('');
    lines.push('## Stale / untrusted caches');
    for (const s of (data.staleGates || []).slice(0, 8)) {
      lines.push(`- ${s.key}: ${s.reason}${s.ageSec != null ? ` age=${s.ageSec}s` : ''}`);
    }
    for (const [k, f] of Object.entries(data.freshness || {})) {
      if (f && !f.fresh) lines.push(`- freshness.${k}: ${f.label} (${f.reason})`);
    }
  }
  const handoffs = data.handoffs || [];
  if (handoffs.length) {
    lines.push('');
    lines.push('## Handoff wall (newest)');
    for (const h of handoffs.slice(0, 5)) {
      lines.push(`- [${h.from}] ${h.at}: ${String(h.text || '').slice(0, 160)}`);
    }
  }
  lines.push('');
  lines.push('## Blockers / next actions (do in order)');
  if (!top.length) lines.push('- (none — site green; no agent action currently authorized)');
  for (const x of top) {
    lines.push(`- [P${x.pri}] ${x.title}`);
    lines.push(`  why: ${x.why}`);
    lines.push(`  owner: ${x.owner}`);
    lines.push(`  cmd: ${x.cmd}`);
    if (x.mutate) lines.push(`  mutate: YES — freeze must be OFF`);
  }
  lines.push('');
  lines.push('## Plan inbox (unread useful)');
  const unread = (inbox?.unread || []).filter((f) => !f.noise).slice(0, 6);
  if (!unread.length) lines.push('- (clear or run: node demigod-plan-inbox.mjs --useful)');
  for (const f of unread) {
    lines.push(`- ${f.ageSec}s ${f.name}: ${(f.preview || '').slice(0, 100)}`);
  }
  if ((inbox?.openPlans || []).length) {
    lines.push('');
    lines.push('## Open plan-ledger');
    for (const p of inbox.openPlans.slice(0, 5)) {
      lines.push(`- [${p.status}] ${p.title} (${p.owner || '?'})`);
    }
  }
  lines.push('');
  lines.push('## Recent agent drops (newest)');
  for (const f of (data.drops?.multi || []).slice(0, 8)) {
    lines.push(`- ${f.ageSec}s ${f.agent} ${f.name}: ${f.preview.slice(0, 120)}`);
  }
  lines.push('');
  lines.push('## SSOT paths (always read before ship)');
  lines.push('- DEMIGOD-COMPRESSED-STATE.md');
  lines.push('- docs/exchange/DEMIGOD-STARTUP-ROADMAP.md');
  lines.push('- /tmp/dg-busy/AGENT-BRIEF.md  (this file)');
  lines.push('- /tmp/dg-busy/preflight-latest.json');
  lines.push('- /tmp/dg-busy/plan-inbox-latest.json');
  lines.push('- /tmp/demigod-gate-latest.txt');
  lines.push('');
  lines.push('## Exact cmds for Grok session start');
  lines.push('```bash');
  lines.push('curl -sS http://127.0.0.1:9878/api/next          # stable NEXT JSON');
  lines.push('curl -sS http://127.0.0.1:9878/api/agent-brief  # this brief');
  lines.push('bin/dg-cockpit && bin/dg-smoke');
  lines.push('curl -sS "http://127.0.0.1:9878/api/delta?since=$(date -u -d \'5 min ago\' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)"');
  lines.push('```');
  lines.push('');
  lines.push('## Standing rules');
  lines.push('- One foot-core writer (claim lock with unique --owner); verify after edits; hash before claiming live');
  lines.push('- No 48h/SLA/founder-name; pending Twilio/Stripe language');
  lines.push('- Never ship while publish-freeze ON; never trust site-green without cockpit.shipped');
  lines.push('- No game work; no demigod:source-truth (archived mutator)');
  lines.push('- Prefer /api/next + /api/agent-brief over scraping HTML');
  return lines.join('\n');
}

async function collectStatus() {
  const t0 = Date.now();
  const footDiskInfo = footDisk();
  const cdnManifest = safeJson(path.join(ROOT, 'DEMIGOD-FOOT-CDN.json'));
  const verifySource = safeJson(path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json'));
  const board = safeJson(path.join(ROOT, 'DEMIGOD-BOARD.json'));
  const gateLatest = safeRead(GATE_LATEST, 4000);
  const compressed = safeRead(path.join(ROOT, 'DEMIGOD-COMPRESSED-STATE.md'), 5000);
  const lock = footLock();

  const boardSignal = board?.signal || {
    realRoles: (board?.roles || []).filter((r) => !r.sample).length,
    sampleRoles: (board?.roles || []).filter((r) => r.sample).length,
    realReceipts: (board?.receipts || []).filter((r) => !r.sample).length,
  };

  // Single live + cdp probe (cockpit reuses live — no second network hop)
  const [live, cdp] = await Promise.all([liveProbe(), cdpProbe()]);
  const workers = workerSnapshot();
  const multi = listRecentDir(MULTI, 20);
  const busy = listRecentDir(BUSY, 12);
  const research = listRecentDir(path.join(ROOT, 'docs/research'), 8);

  const since = Date.now() - 2 * 3600 * 1000;
  const recentAgents = {};
  for (const f of multi) {
    if (new Date(f.mtime).getTime() < since) continue;
    recentAgents[f.agent] = (recentAgents[f.agent] || 0) + 1;
  }

  const manId = footCdnKey(cdnManifest?.cdnUrl);
  const liveId = live?.cdnId;
  let liveMatchNote = 'unknown';
  if (manId && liveId) liveMatchNote = manId === liveId ? 'live CDN matches manifest id' : `DRIFT live=${liveId} man=${manId}`;
  if (cdnManifest?.sha256 && footDiskInfo.sha256) {
    liveMatchNote +=
      footDiskInfo.sha256 === cdnManifest.sha256
        ? ' · disk sha == manifest sha'
        : ' · disk sha ≠ manifest (unpublished local edits?)';
  }

  const foot = {
    disk: footDiskInfo,
    manifest: cdnManifest,
    liveMatchNote,
    lock,
  };

  const gates = {
    latestFile: gateLatest,
    verifySourcePass: verifySource?.pass ?? null,
    verifySourceAt: verifySource?.at ?? null,
    verifyFailed: (verifySource?.checks || []).filter((c) => c && c.ok === false).map((c) => c.name).slice(0, 12),
  };

  const env = {
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
    CDP_URL: CDP,
  };

  const boardInfo = {
    roles: (board?.roles || []).length,
    receipts: (board?.receipts || []).length,
    signal: boardSignal,
  };

  const workerCounts = workers.reduce((acc, w) => {
    const k = w.kind || 'other';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  // HOT PATH: never execSync plan-inbox here (was blocking event loop up to 8s).
  // Use last cache only; agents refresh via CLI when needed.
  const preflightCache = safeJson(path.join(BUSY, 'preflight-latest.json'));
  const inboxCache = safeJson(path.join(BUSY, 'plan-inbox-latest.json'));
  const truthCache = safeJson(path.join(BUSY, 'truth.json'));

  const actions = deriveActions({
    live,
    cdp,
    foot,
    gates,
    env,
    board: boardInfo,
    workers,
    multiTop: multi,
  });

  // Agent cockpit — reuse dashboard live probe (skipLive + liveOverride)
  let cockpit = null;
  try {
    const { buildCockpit } = await import('./demigod-agent-cockpit.mjs');
    cockpit = await buildCockpit({
      skipLive: true,
      liveOverride: live,
    });
    if (cockpit?.next) {
      const n = cockpit.next;
      actions.unshift({
        pri: n.pri,
        id: 'cockpit-' + n.id,
        title: n.title,
        why: n.mutate ? 'MUTATE only if freeze OFF' : 'read-only / diagnostic',
        cmd: n.cmd,
        owner: 'grok',
        mutate: !!n.mutate,
      });
      const seen = new Set();
      for (let i = actions.length - 1; i >= 0; i--) {
        if (seen.has(actions[i].id)) actions.splice(i, 1);
        else seen.add(actions[i].id);
      }
      actions.sort((a, b) => a.pri - b.pri || String(a.id).localeCompare(String(b.id)));
    }
  } catch (e) {
    cockpit = { error: String(e.message || e) };
  }

  const freezeState = safeJson(path.join(BUSY, 'publish-freeze.json')) || { on: false };
  let host = 'local';
  try {
    host = fs.readFileSync('/etc/hostname', 'utf8').trim() || 'local';
  } catch {
    host = 'local';
  }

  // Evidence ages for every cached gate/artifact (UI badges)
  function evidenceOf(rel) {
    const full = rel.startsWith('/') ? rel : path.join(ROOT, rel);
    try {
      const st = fs.statSync(full);
      return {
        path: full,
        mtime: st.mtime.toISOString(),
        ageSec: Math.round((Date.now() - st.mtimeMs) / 1000),
        bytes: st.size,
      };
    } catch {
      return { path: full, missing: true };
    }
  }
  const evidence = {
    verifySource: evidenceOf('DEMIGOD-VERIFY-SOURCE.json'),
    boardHonesty: evidenceOf('DEMIGOD-BOARD-HONESTY.json'),
    board: evidenceOf('DEMIGOD-BOARD.json'),
    footCdn: evidenceOf('DEMIGOD-FOOT-CDN.json'),
    freeze: evidenceOf(path.join(BUSY, 'publish-freeze.json')),
    smoke: evidenceOf(path.join(BUSY, 'agent-smoke.json')),
    truth: evidenceOf(path.join(BUSY, 'truth.json')),
    preflight: evidenceOf(path.join(BUSY, 'preflight-latest.json')),
    planInbox: evidenceOf(path.join(BUSY, 'plan-inbox-latest.json')),
    cockpit: evidenceOf(path.join(BUSY, 'cockpit.json')),
    shipStatus: evidenceOf(path.join(BUSY, 'ship-status.json')),
    gateLatest: evidenceOf(GATE_LATEST),
    brief: evidenceOf(BRIEF_MD),
  };

  let toolsSummary = null;
  try {
    const { buildRegistry } = await import('./demigod-tools-registry.mjs');
    const reg = buildRegistry();
    toolsSummary = { count: reg.count, groups: reg.groups, at: reg.at };
  } catch {
    toolsSummary = null;
  }

  const data = {
    at: new Date().toISOString(),
    host,
    version: 5,
    phase: 'GTM + pre-services honesty',
    decision: 'FIX not rewrite',
    system: { load: loadAvg(), mem: memInfo() },
    env,
    foot,
    live,
    cdp,
    gates,
    board: boardInfo,
    freeze: freezeState,
    cockpit,
    smoke: safeJson(path.join(BUSY, 'agent-smoke.json')),
    workers,
    workerCounts,
    activity2h: recentAgents,
    actions,
    preflight: preflightCache,
    inbox: inboxCache,
    truth: truthCache,
    truthEvidence: (() => {
      const te = refuseIfStale('truth');
      return {
        green: Boolean(te.green),
        pass: Boolean(te.pass),
        fresh: Boolean(te.fresh),
        reason: te.reason || 'no-evidence',
        runId: te.runId || null,
        summary: te.summary || null,
        endedAt: te.endedAt || null,
      };
    })(),
    // Mirror the CLI/API orientation card into the main status path so agents
    // can orient from one cached request without spawning another Node process.
    orient: (() => {
      const orientPath = path.join(BUSY, 'orient.json');
      const j = safeJson(orientPath);
      let receiptAgeMs = null;
      try {
        // Receipt content is the evidence clock. File mtime is mutable (touch,
        // copy, restore) and must not make an old orientation card look fresh.
        const receiptAtMs = Date.parse(j?.at || '');
        const rawAgeMs = Date.now() - receiptAtMs;
        // A materially future-dated receipt is not fresh evidence. Preserve a
        // small tolerance for filesystem/clock jitter, but fail closed beyond it.
        receiptAgeMs = Number.isFinite(receiptAtMs) && Number.isFinite(rawAgeMs) && rawAgeMs >= -60_000
          ? Math.max(0, rawAgeMs)
          : null;
      } catch {}
      const demand = demandStatusSnapshot(safeJson(path.join(BUSY, 'demand-status.json')));
      const degraded = !j || receiptAgeMs == null || receiptAgeMs > 120_000;
      return {
        at: j?.at || null,
        api: '/api/orient',
        statusJsonPath: STATUS_JSON,
        receiptPath: orientPath,
        receiptAvailable: Boolean(j),
        receiptAgeMs,
        degraded,
        ok: j?.ok === true,
        exit: j?.exit ?? null,
        // A stale receipt may describe a historically green state, but it is
        // not current green evidence. Preserve the raw bit for diagnosis while
        // making the dashboard-facing signal fail closed.
        green: !degraded && j?.green === true,
        receiptGreen: j?.green === true,
        // Freeze is live coordination state, not historical receipt evidence.
        // Mirror the current value so /status/orient stays freeze-honest even
        // when orient.json predates a publish-freeze toggle.
        freeze: {
          on: freezeState?.on === true,
          why: freezeState?.why || null,
        },
        next: j?.next || null,
        // Keep the canonical nested status path current even when orient.json
        // is older than the independently refreshed demand-status receipt.
        // Consumers may now read /orient/demand/drafts/hygiene directly
        // without falling back to a dashboard-specific alias.
        demand: demand
          ? {
              ...(j?.demand || {}),
              ...demand,
              drafts: demand.drafts || null,
            }
          : (j?.demand || null),
        // Preserve the canonical demand shape as well as the compact aliases
        // below. File-only agents can now read /orient/drafts/hygiene exactly
        // as they would read /demand/drafts/hygiene.
        drafts: demand?.drafts || null,
        // Keep the orientation payload self-contained for API clients. The
        // compact orient receipt intentionally omits full drafts, while the
        // dashboard status needs their hygiene result without a second join.
        demandDrafts: demand?.drafts || null,
        demandDraftsHygiene: demand?.drafts?.hygiene || null,
        demandDraftsHygieneSource: demand?.drafts?.hygiene?.source || 'unknown',
        demandDraftsHygieneStatusPath:
          demand?.drafts?.hygiene?.statusPath || demand?.statusPath || path.join(BUSY, 'demand-status.json'),
        demandStatusPath: demand?.statusPath || path.join(BUSY, 'demand-status.json'),
        assertSame: j?.assertSame || null,
        lamps: j?.lamps || null,
      };
    })(),
    demand: (() => {
      try {
        const p = path.join(BUSY, 'demand-status.json');
        if (!fs.existsSync(p)) return null;
        return demandStatusSnapshot(JSON.parse(fs.readFileSync(p, 'utf8')));
      } catch {
        return null;
      }
    })(),
    evidence,
    tools: toolsSummary,
    drops: { multi, busy, research },
    docs: {
      compressedPreview: compressed?.split('\n').slice(0, 16).join('\n') || null,
      startupRoadmap: 'docs/exchange/DEMIGOD-STARTUP-ROADMAP.md',
      livingRoadmap: 'docs/exchange/DEMIGOD-LIVING-ROADMAP.md',
      toolsKeep: 'docs/exchange/DEMIGOD-TOOLS-KEEP-VS-ARCHIVE.md',
      swarm: '/tmp/dg-busy/swarm/SYNTHESIS.md',
    },
    links: {
      live: LIVE,
      dashboard: `http://127.0.0.1:${PORT}/`,
      api: `http://127.0.0.1:${PORT}/api/status`,
      orient: `http://127.0.0.1:${PORT}/api/orient`,
      demandStatus: path.join(BUSY, 'demand-status.json'),
      agentBrief: `http://127.0.0.1:${PORT}/api/agent-brief`,
      cockpit: `http://127.0.0.1:${PORT}/api/cockpit`,
      smoke: `http://127.0.0.1:${PORT}/api/smoke`,
      tools: `http://127.0.0.1:${PORT}/api/tools`,
      jobs: `http://127.0.0.1:${PORT}/api/jobs`,
      actions: `http://127.0.0.1:${PORT}/api/actions`,
      briefFile: BRIEF_MD,
    },
    agentConsume: {
      preferred: [
        `curl -sS http://127.0.0.1:${PORT}/api/orient`,
        `curl -sS http://127.0.0.1:${PORT}/api/cockpit`,
        'node demigod-agent-cockpit.mjs --md',
        `curl -sS http://127.0.0.1:${PORT}/api/agent-brief`,
        'node demigod-agent-smoke.mjs',
        `node demigod-tools-registry.mjs --md`,
        `cat ${BRIEF_MD}`,
      ],
      note: 'Start with /api/orient or bin/dg orient — fresh truth, demand hygiene, and one canonical NEXT.',
    },
    timing: { collectMs: Date.now() - t0 },
  };

  await enrichStatus(data);
  data.agentBriefMarkdown = buildAgentBrief(data);

  try {
    fs.mkdirSync(BUSY, { recursive: true });
    // Compact JSON on disk — faster write, smaller I/O
    // The status path is an agent API contract. Publish it atomically so a
    // concurrent file-only reader never loses /api/orient or draft-hygiene
    // discovery to a partially written JSON document.
    writeJsonAtomic(STATUS_JSON, data);
    fs.writeFileSync(BRIEF_MD, data.agentBriefMarkdown);
    fs.writeFileSync(
      BRIEF_JSON,
      JSON.stringify({
        at: data.at,
        version: data.version,
        next: data.next,
        glance: data.glance,
        sessionStory: data.sessionStory,
        actions: data.actions,
        live: data.live,
        foot: data.foot,
        gates: data.gates,
        cdp: data.cdp,
        board: data.board,
        freeze: data.freeze,
        staleGates: data.staleGates,
        workerCounts: data.workerCounts,
        activity2h: data.activity2h,
      }),
    );
  } catch {
    /* ignore */
  }

  return data;
}

/** Cached / singleflight status — concurrent refreshers share one collect */
async function getStatus({ force = false } = {}) {
  const now = Date.now();
  // Invalidate status cache when truth or cycle receipts are newer than the
  // cache stamp so health/priority do not keep stale truth/cycle cards after ship.
  if (!force && statusCache.data && now - statusCache.at < STATUS_TTL_MS) {
    for (const name of [
      'truth.json',
      'cycle-work-latest.json',
      'pilot-inbound.json',
      'demand-status.json',
      'webflow-doctor.json',
    ]) {
      try {
        const mtime = fs.statSync(path.join(BUSY, name)).mtimeMs;
        if (Number.isFinite(mtime) && mtime > statusCache.at) {
          force = true;
          break;
        }
      } catch {
        /* optional receipts */
      }
    }
  }
  if (!force && statusCache.data && now - statusCache.at < STATUS_TTL_MS) {
    return { ...statusCache.data, cached: true, cacheAgeMs: now - statusCache.at };
  }
  if (statusInflight) return statusInflight;
  statusInflight = collectStatus()
    .then((data) => {
      statusCache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      statusInflight = null;
    });
  return statusInflight;
}


const UI_HTML_PATH = path.join(ROOT, 'demigod-agent-dashboard-ui.html');
function loadHtml() {
  try {
    const st = fs.statSync(UI_HTML_PATH);
    if (uiHtmlCache.html && uiHtmlCache.mtimeMs === st.mtimeMs) return uiHtmlCache.html;
    const html = fs.readFileSync(UI_HTML_PATH, 'utf8');
    uiHtmlCache = { mtimeMs: st.mtimeMs, html };
    return html;
  } catch (e) {
    const msg = String(e.message || e)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<!DOCTYPE html><html><body style="background:#111;color:#f88;font-family:sans-serif;padding:2rem">
      <h1>Dashboard UI missing</h1>
      <p>Expected demigod-agent-dashboard-ui.html next to the server</p>
      <p>${msg}</p>
      <p><a href="/api/status" style="color:#C9A84C">/api/status</a></p>
    </body></html>`;
  }
}

/** Safe allowlist for jobs — safe = human-clickable anytime; mutate = freeze-gated */
/* ==== SECTION: JOBS allowlist (mutate jobs freeze-gated) ==== */
const JOBS = {
  orient: { cmd: 'node', args: ['demigod-orient.mjs', '--json'], timeout: 60000, safe: true },
  smoke: { cmd: 'node', args: ['demigod-agent-smoke.mjs'], timeout: 90000, safe: true },
  cockpit: { cmd: 'node', args: ['demigod-agent-cockpit.mjs', '--json'], timeout: 30000, safe: true },
  truth: { cmd: 'node', args: ['demigod-truth.mjs'], timeout: 45000, safe: true },
  preflight: { cmd: 'node', args: ['demigod-preflight.mjs'], timeout: 60000, safe: true },
  'plan-inbox': { cmd: 'node', args: ['demigod-plan-inbox.mjs', '--json'], timeout: 20000, safe: true },
  'tab-prune': { cmd: 'node', args: ['demigod-cdp-tab-prune.mjs'], timeout: 15000, safe: true },
  'board-honesty': { cmd: 'node', args: ['demigod-verify-board-honesty.mjs'], timeout: 20000, safe: true },
  'verify-source': { cmd: 'npm', args: ['run', 'demigod:verify:source'], timeout: 120000, safe: true },
  'tools-registry': { cmd: 'node', args: ['demigod-tools-registry.mjs', '--json'], timeout: 10000, safe: true },
  usertest: { cmd: 'node', args: ['demigod-user-test.mjs', '--quick'], timeout: 120000, safe: true },
  doctor: { cmd: 'node', args: ['demigod-doctor.mjs', '--json'], timeout: 20000, safe: true },
  review: { cmd: 'node', args: ['demigod-review.mjs', '--json'], timeout: 90000, safe: true },
  'review-bug': { cmd: 'node', args: ['demigod-review.mjs', '--bug', '--json'], timeout: 120000, safe: true },
  'review-selftest': { cmd: 'node', args: ['demigod-review-selftest.mjs'], timeout: 60000, safe: true },
  webflow: { cmd: 'node', args: ['demigod-webflow.mjs', '--json'], timeout: 30000, safe: true },
  'webflow-doctor': { cmd: 'node', args: ['demigod-webflow.mjs', 'doctor', '--json'], timeout: 30000, safe: true },
  'webflow-open-code': { cmd: 'node', args: ['demigod-webflow.mjs', 'open', 'custom-code'], timeout: 15000, safe: true },
  'webflow-paste-check': { cmd: 'node', args: ['demigod-webflow.mjs', 'paste-check', '--json'], timeout: 15000, safe: true },
  hygiene: { cmd: 'node', args: ['demigod-laptop-hygiene.mjs', '--prune', '--json'], timeout: 45000, safe: true },
  ponytail: { cmd: 'node', args: ['demigod-ponytail.mjs', 'status', '--json'], timeout: 30000, safe: true },
  'ponytail-check': { cmd: 'node', args: ['demigod-ponytail.mjs', 'check', '--json'], timeout: 30000, safe: true },
  'cycle-status': { cmd: 'node', args: ['demigod-cycle-status.mjs', '--json'], timeout: 20000, safe: true },
  'cycle-work': {
    cmd: 'node',
    args: ['demigod-cycle-work.mjs', '--domain=auto', '--owner=dashboard', '--cycle=dash'],
    timeout: 180000,
    safe: true,
  },
  'never-stop-status': { cmd: 'node', args: ['demigod-never-stop-loop.mjs', 'status'], timeout: 15000, safe: true },
  'never-stop-stop': { cmd: 'node', args: ['demigod-never-stop-loop.mjs', 'stop'], timeout: 15000, safe: true },
  'swarm-status': { cmd: 'node', args: ['demigod-swarm-busy.mjs', 'status'], timeout: 15000, safe: true },
  // Periodic Codex review/assist swarm (not cycle-work busy): bin/dg-codex-swarm
  'codex-swarm-status': { cmd: 'bin/dg-codex-swarm', args: ['status'], timeout: 15000, safe: true },
  'codex-swarm-once': { cmd: 'bin/dg-codex-swarm', args: ['once'], timeout: 240000, safe: true },
  'codex-swarm-hint': { cmd: 'bin/dg-codex-swarm', args: ['apply-hint'], timeout: 10000, safe: true },
  'workflow-map-update': { cmd: 'bin/dg-workflow-map', args: ['update'], timeout: 30000, safe: true },
  'workflow-map-review': { cmd: 'bin/dg-workflow-map', args: ['review'], timeout: 20000, safe: true },
  'anti-bloat-doctrine': { cmd: 'bin/dg-anti-bloat', args: ['doctrine'], timeout: 5000, safe: true },
  'anti-bloat-pick': { cmd: 'bin/dg-anti-bloat', args: ['pick', '--context=auto'], timeout: 10000, safe: true },
  'quality-once': { cmd: 'bin/dg-quality', args: ['once', '--context=auto'], timeout: 240000, safe: true },
  'quality-status': { cmd: 'bin/dg-quality', args: ['status'], timeout: 15000, safe: true },
  'quality-backlog': { cmd: 'bin/dg-quality', args: ['backlog'], timeout: 10000, safe: true },
  'ops-os-status': { cmd: 'bin/dg-ops-os', args: ['status'], timeout: 20000, safe: true },
  'ops-os-next': { cmd: 'bin/dg-ops-os', args: ['next'], timeout: 15000, safe: true },
  'ops-os-tick': { cmd: 'bin/dg-ops-os', args: ['tick'], timeout: 180000, safe: true },
  'swarm-stop': { cmd: 'node', args: ['demigod-swarm-busy.mjs', 'stop'], timeout: 15000, safe: true },
  'harness-selftest': { cmd: 'node', args: ['demigod-harness-selftest.mjs'], timeout: 60000, safe: true },
  priority: { cmd: 'node', args: ['demigod-priority-board.mjs', '--json'], timeout: 15000, safe: true },
  dogfood: { cmd: 'node', args: ['demigod-tool-dogfood.mjs', 'status', '--json'], timeout: 20000, safe: true },
  'coord-status': { cmd: 'bin/dg-agent-coord', args: ['status'], timeout: 10000, safe: true },
  'favicon-ship': { cmd: 'node', args: ['demigod-favicon-ship.mjs'], timeout: 30000, safe: true },
  'blog-assets': { cmd: 'node', args: ['demigod-blog-assets-gen.mjs'], timeout: 30000, safe: true },
  'full-pass-status': { cmd: 'node', args: ['demigod-full-pass-loop.mjs', 'status'], timeout: 10000, safe: true },
  'webflow-status': { cmd: 'node', args: ['demigod-webflow.mjs', 'status', '--json'], timeout: 30000, safe: true },
  control: { cmd: 'node', args: ['demigod-control.mjs', 'status', '--json'], timeout: 45000, safe: true },
  'ship-checklist': { cmd: 'node', args: ['demigod-ship-checklist.mjs', '--json'], timeout: 15000, safe: true },
  demand: { cmd: 'node', args: ['demigod-demand.mjs', 'status', '--json'], timeout: 20000, safe: true },
  pilot: { cmd: 'node', args: ['demigod-pilot-inbound.mjs', 'status', '--json'], timeout: 15000, safe: true },
  'next-canon': { cmd: 'node', args: ['demigod-next.mjs', '--json'], timeout: 10000, safe: true },
  unify: { cmd: 'node', args: ['demigod-unify.mjs', '--json'], timeout: 20000, safe: true },
  'ship-status': { cmd: 'node', args: ['demigod-ship-status.mjs', '--json'], timeout: 45000, safe: true },
  'ship-facts': { cmd: 'node', args: ['demigod-ship.mjs', 'status', '--facts'], timeout: 60000, safe: true },
  'ship-prepare': { cmd: 'node', args: ['demigod-ship.mjs', 'prepare'], timeout: 180000, safe: true },
  'lock-who': { cmd: 'node', args: ['demigod-foot-lock.mjs', 'who'], timeout: 10000, safe: true },
  ledger: { cmd: 'node', args: ['demigod-version-ledger.mjs', 'delta'], timeout: 10000, safe: true },
  evidence: { cmd: 'node', args: ['demigod-evidence.mjs', 'fresh', 'truth'], timeout: 10000, safe: true },
  'evidence-producers': {
    cmd: 'node',
    args: ['demigod-evidence.mjs', 'producers', 'truth,review,demand,smoke'],
    timeout: 15000,
    safe: true,
  },
  'full-check': { cmd: 'node', args: ['demigod-full-check.mjs', '--json', '--skip-smoke'], timeout: 300000, safe: true },
  'tools-os-selftest': { cmd: 'node', args: ['demigod-tools-os-selftest.mjs'], timeout: 300000, safe: true },
  'wiz-ownership': { cmd: 'node', args: ['demigod-wiz-ownership-selftest.mjs'], timeout: 30000, safe: true },
  'cm6-check': { cmd: 'node', args: ['demigod-cm6-paste-publish.mjs', '--check-structural'], timeout: 15000, safe: true },
  inbox: { cmd: 'node', args: ['demigod-submissions-inbox.mjs', '--json'], timeout: 15000, safe: true },
  'match-review': { cmd: 'node', args: ['demigod-match-review.mjs', '--json'], timeout: 15000, safe: true },
  'auto-propose': { cmd: 'node', args: ['demigod-auto-propose.mjs', '--json'], timeout: 30000, safe: true },
  // mutate — never auto-run from simple mode
  'foot-cdn': { cmd: 'node', args: ['demigod-foot-cdn-publish.mjs'], timeout: 120000, safe: false, mutate: true },
  'cm6-paste': {
    cmd: 'node',
    args: ['demigod-cm6-paste-publish.mjs'],
    timeout: 180000,
    safe: false,
    mutate: true,
  },
};

const HANDOFF_PATH = path.join(BUSY, 'dashboard-handoff.json');
const jobMap = new Map(); // id -> job record
const jobState = { last: null, running: null };
let jobSeq = 0;

function listJobsMeta() {
  return Object.entries(JOBS).map(([id, s]) => ({
    id,
    safe: !!s.safe,
    mutate: !!s.mutate,
    timeout: s.timeout,
  }));
}

function annotateRunnableTools(reg) {
  if (!reg || !Array.isArray(reg.tools)) return reg;
  return {
    ...reg,
    tools: reg.tools.map((tool) => {
      // Treat only explicit allowlist entries as executable. A registry id such
      // as "toString" must not inherit authority from Object.prototype.
      const job = Object.prototype.hasOwnProperty.call(JOBS, tool.id)
        ? JOBS[tool.id]
        : null;
      return {
        ...tool,
        // Execution authority and mutation classification share one source.
        // Registry copy may lag the dashboard allowlist during concurrent work.
        runnable: Boolean(job),
        safe: job?.safe === true,
        // A tool absent from JOBS has no dashboard execution authority, so its
        // mutation authority must also fail closed instead of trusting catalog
        // metadata that the server does not execute.
        mutate: job ? job.mutate === true : false,
      };
    }),
  };
}

function readHandoffs(limit = 20) {
  const j = safeJson(HANDOFF_PATH) || { notes: [] };
  const notes = Array.isArray(j.notes) ? j.notes : [];
  return notes.slice(0, limit);
}

const eventRing = [];
function pushEvent(type, message, meta = null) {
  eventRing.unshift({
    id: `e${Date.now().toString(36)}${(++jobSeq).toString(36)}`,
    at: new Date().toISOString(),
    type,
    message: String(message).slice(0, 300),
    meta: meta || undefined,
  });
  if (eventRing.length > 80) eventRing.length = 80;
}

function appendHandoff({ from = 'agent', text = '', meta = null, done = null, next = null, blocked = null } = {}) {
  const structured = [done, next, blocked].some((x) => x != null && String(x).length);
  const composed =
    text ||
    [done != null ? `done: ${done}` : null, next != null ? `next: ${next}` : null, blocked != null ? `blocked: ${blocked}` : null]
      .filter(Boolean)
      .join(' · ');
  const note = {
    id: `h${Date.now().toString(36)}${(++jobSeq).toString(36)}`,
    at: new Date().toISOString(),
    from: String(from).slice(0, 32),
    text: String(composed).slice(0, 2000),
    meta: {
      ...(meta || {}),
      done: done || null,
      next: next || null,
      blocked: blocked || null,
      structured: structured || Boolean(meta?.structured),
    },
  };
  // Atomic-ish: write tmp then rename (avoid partial clobber)
  try {
    fs.mkdirSync(BUSY, { recursive: true });
    let notes = [];
    try {
      notes = readHandoffs(100);
    } catch {
      notes = [];
    }
    notes.unshift(note);
    notes = notes.slice(0, 50);
    const body = JSON.stringify({ at: note.at, notes }, null, 2) + '\n';
    const tmp = HANDOFF_PATH + `.tmp.${process.pid}`;
    fs.writeFileSync(tmp, body);
    fs.renameSync(tmp, HANDOFF_PATH);
    pushEvent('handoff', `${note.from}: ${note.text.slice(0, 80)}`);
  } catch {
    /* */
  }
  return note;
}

/** Stable NEXT — canonical demigod-next (not cockpit re-derive) */
function nextContract(data) {
  const freezeOn = Boolean(data?.freeze?.on);
  let canon = null;
  try {
    canon = buildNext({
      truth: data?.truth || null,
      demand: data?.demand || null,
    });
  } catch {
    canon = null;
  }
  if (canon) {
    return {
      id: canon.id || null,
      pri: canon.pri ?? null,
      title: canon.title || null,
      cmd: canon.cmd || null,
      mutate: !!canon.mutate,
      // Freeze gates publish/mutation, not read-only truth/demand/control work.
      freezeBlocks: !!canon.freezeBlocks || (freezeOn && !!canon.mutate),
      shipped: Boolean(data?.cockpit?.shipped || canon.fullyShipped),
      source: 'demigod-next',
      reason: canon.reason || null,
      versions: canon.versions || null,
      truthEvidence: canon.truthEvidence || null,
    };
  }
  // Fallback only if builder throws
  const n = data?.cockpit?.next || null;
  if (!n) {
    return {
      id: null,
      pri: null,
      title: null,
      cmd: null,
      mutate: false,
      freezeBlocks: freezeOn,
      shipped: Boolean(data?.cockpit?.shipped),
      source: 'none',
    };
  }
  return {
    id: n.id || null,
    pri: n.pri ?? null,
    title: n.title || null,
    cmd: n.cmd || null,
    mutate: !!n.mutate,
    freezeBlocks: freezeOn && !!n.mutate,
    shipped: Boolean(data?.cockpit?.shipped),
    source: 'cockpit-fallback',
  };
}

function buildGlance(data) {
  // Accept both the dashboard probe shape (`ok`) and the canonical truth
  // shape (`reachable` / `htmlOk`). Cached truth-backed snapshots otherwise
  // misreport a reachable site as DOWN merely because they lack `live.ok`.
  const liveOk = data?.live?.ok === true || data?.live?.reachable === true || data?.live?.htmlOk === true;
  const truthGreen = data?.truthEvidence?.green === true;
  const siteOk = liveOk && truthGreen;
  const freezeOn = Boolean(data?.freeze?.on);
  const next = nextContract(data);
  const stale = (data?.staleGates || []).length;
  let site = liveOk
    ? `Live ${data.live?.foot || 'UP'} · ${data.live?.cdnId || 'cdn?'}`
    : `Live DOWN · ${data.live?.error || 'probe failed'}`;
  if (data?.cockpit?.shipped) site += ' · hash chain green';
  else if (liveOk) site += ' · not fully shipped';
  return {
    site,
    // Reachability is not release health. A responsive stale foot must stay
    // red while canonical truth reports disk/live or attestation drift.
    siteOk,
    siteReachable: liveOk,
    siteReason: !liveOk
      ? (data?.live?.error || 'unreachable')
      : !truthGreen
        ? (data?.truthEvidence?.summary || data?.truthEvidence?.reason || 'truth not green')
        : 'canonical truth green',
    freeze: freezeOn ? `ON — ${data.freeze?.why || 'publish frozen'}` : 'OFF — ship allowed if needed',
    freezeOn,
    agentNext: next.title
      ? `P${next.pri} ${next.title}${next.freezeBlocks ? ' (blocked by freeze)' : ''}`
      : 'No NEXT — idle / green',
    next,
    staleCount: stale,
  };
}

function buildSessionStory(data) {
  const parts = [];
  const smoke = data?.smoke;
  const freezeOn = Boolean(data?.freeze?.on);
  const ev = data?.evidence || {};
  if (smoke?.pass === true) parts.push(`smoke PASS (${ageLabel(ev.smoke?.ageSec)})`);
  else if (smoke?.pass === false) parts.push(`smoke FAIL (${ageLabel(ev.smoke?.ageSec)})`);
  else parts.push('smoke not run yet');
  parts.push(freezeOn ? 'freeze ON' : 'freeze OFF');
  parts.push(data?.live?.foot ? `live ${data.live.foot}` : 'live ?');
  if (data?.gates?.verifySourcePass === true) parts.push(`verify PASS (${ageLabel(ev.verifySource?.ageSec)})`);
  else if (data?.gates?.verifySourcePass === false) parts.push('verify FAIL');
  const handoffs = readHandoffs(3);
  if (handoffs[0]) parts.push(`last note: ${handoffs[0].from} ${ageLabel(Math.round((Date.now() - Date.parse(handoffs[0].at)) / 1000))}`);
  return parts.join(' · ');
}

function ageLabel(sec) {
  if (sec == null || Number.isNaN(sec)) return '—';
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

function buildStaleGates(evidence, thresholds = {}) {
  // required: missing counts as stale; optional: only age-stale if file exists
  const required = {
    verifySource: 7200,
    smoke: 86400,
    truth: 7200,
  };
  const optional = {
    preflight: 86400,
    boardHonesty: 86400,
    cockpit: 86400,
    shipStatus: 86400,
  };
  const tReq = { ...required, ...(thresholds.required || {}) };
  const tOpt = { ...optional, ...(thresholds.optional || {}) };
  const stale = [];
  for (const [key, maxSec] of Object.entries(tReq)) {
    const e = evidence?.[key];
    if (!e || e.missing) {
      stale.push({ key, reason: 'missing', ageSec: null, maxSec });
      continue;
    }
    if (e.ageSec != null && e.ageSec > maxSec) {
      stale.push({ key, reason: 'stale', ageSec: e.ageSec, maxSec, label: ageLabel(e.ageSec) });
    }
  }
  for (const [key, maxSec] of Object.entries(tOpt)) {
    const e = evidence?.[key];
    if (!e || e.missing) continue;
    if (e.ageSec != null && e.ageSec > maxSec) {
      stale.push({ key, reason: 'stale', ageSec: e.ageSec, maxSec, label: ageLabel(e.ageSec) });
    }
  }
  return stale;
}

/** Slim delta for agents — only changed keys since ISO timestamp */
function buildDelta(data, sinceIso) {
  const since = sinceIso ? Date.parse(sinceIso) : 0;
  const at = Date.parse(data.at) || Date.now();
  if (!since || at <= since) {
    return { at: data.at, changed: false, since: sinceIso || null, fields: {} };
  }
  const fields = {
    // Delta consumers must receive the same cycle attestation verdict as full
    // status. Omitting it lets a long-lived agent retain a stale green receipt
    // after a degraded, blocked, or expired cycle replaces it on disk.
    cycleWork: data.cycleWork || null,
    cycleWorkHealth: data.cycleWorkHealth || null,
    next: nextContract(data),
    orient: data.orient
      ? {
          api: data.orient.api || '/api/orient',
          statusJsonPath: data.orient.statusJsonPath || STATUS_JSON,
          ok: data.orient.ok ?? null,
          green: data.orient.green ?? null,
          // Delta polling must replace freshness state atomically with the
          // orient verdict. Omitting these fields lets a long-lived dashboard
          // retain a formerly-current card after the receipt becomes stale.
          receiptGreen: data.orient.receiptGreen ?? null,
          receiptAvailable: data.orient.receiptAvailable === true,
          receiptAgeMs: data.orient.receiptAgeMs ?? null,
          degraded: data.orient.degraded === true,
          exit: data.orient.exit ?? null,
          next: data.orient.next || null,
          freeze: data.orient.freeze || {
            on: data.freeze?.on === true,
            why: data.freeze?.why || null,
          },
          assertSame: data.orient.assertSame || null,
          // Preserve the canonical full-status shape in delta polling. The
          // advertised /orient/drafts/hygiene pointer must not disappear when
          // an agent switches from /api/status to ?since= incremental reads.
          drafts: {
            hygiene: data.orient.drafts?.hygiene || data.orient.demandDraftsHygiene || null,
          },
          demandDraftsHygiene: data.orient.demandDraftsHygiene || null,
          demandDraftsHygieneSource:
            data.orient.demandDraftsHygiene?.source || data.demandDraftsHygieneSource || 'unknown',
          demandDraftsHygieneAt:
            data.orient.demandDraftsHygieneAt || data.demandDraftsHygieneAt || null,
          demandDraftsHygieneAgeSec:
            data.orient.demandDraftsHygieneAgeSec ?? data.demandDraftsHygieneAgeSec ?? null,
          demandDraftsHygieneStale:
            data.orient.demandDraftsHygieneStale ?? data.demandDraftsHygieneStale ?? true,
          demandDraftsHygieneReady:
            data.orient.demandDraftsHygieneReady === true && data.demandDraftsHygieneReady === true,
          demandDraftsHygieneStatusPath:
            data.orient.demandDraftsHygiene?.statusPath ||
            data.demandDraftsHygieneStatusPath ||
            data.orient.demandStatusPath ||
            path.join(BUSY, 'demand-status.json'),
          demandStatusPath: data.orient.demandStatusPath || path.join(BUSY, 'demand-status.json'),
        }
      : {
          api: '/api/orient',
          statusJsonPath: STATUS_JSON,
          ok: null,
          green: null,
          freeze: {
            on: data.freeze?.on === true,
            why: data.freeze?.why || null,
          },
          assertSame: null,
          drafts: {
            hygiene: data.demand?.drafts?.hygiene || null,
          },
          // Orient can be unavailable while the independently materialized
          // demand receipt is still valid. Keep delta clients on the same
          // hygiene evidence as full/slim status instead of erasing it merely
          // because the orientation wrapper is missing.
          demandDraftsHygiene: data.demand?.drafts?.hygiene || null,
          demandDraftsHygieneSource:
            data.demand?.drafts?.hygiene?.source || data.demandDraftsHygieneSource || 'unknown',
          demandDraftsHygieneAt: data.demandDraftsHygieneAt || null,
          demandDraftsHygieneAgeSec: data.demandDraftsHygieneAgeSec ?? null,
          demandDraftsHygieneStale: data.demandDraftsHygieneStale ?? true,
          demandDraftsHygieneReady: false,
          demandDraftsHygieneStatusPath:
            data.demand?.drafts?.hygiene?.statusPath ||
            data.demandDraftsHygieneStatusPath ||
            data.demand?.statusPath ||
            path.join(BUSY, 'demand-status.json'),
          demandStatusPath: data.demand?.statusPath || path.join(BUSY, 'demand-status.json'),
        },
    demandDraftsHygiene: data.demand?.drafts?.hygiene || null,
    demandDraftsHygieneSource: data.demandDraftsHygieneSource || 'unknown',
    demandDraftsHygieneAt: data.demandDraftsHygieneAt || null,
    demandDraftsHygieneAgeSec: data.demandDraftsHygieneAgeSec ?? null,
    demandDraftsHygieneStale: data.demandDraftsHygieneStale ?? true,
    demandDraftsHygieneReady: data.demandDraftsHygieneReady === true,
    demandDraftsHygieneStatusPath:
      data.demandDraftsHygieneStatusPath || data.demand?.statusPath || path.join(BUSY, 'demand-status.json'),
    demandStatusPath: data.demand?.statusPath || path.join(BUSY, 'demand-status.json'),
    freeze: { on: Boolean(data.freeze?.on), why: data.freeze?.why || null },
    live: { ok: data.live?.ok, foot: data.live?.foot, cdnId: data.live?.cdnId },
    shipped: Boolean(data.cockpit?.shipped),
    verifySourcePass: data.gates?.verifySourcePass ?? null,
    smokePass: data.smoke?.pass ?? null,
    staleGates: data.staleGates || [],
    sessionStory: data.sessionStory,
    glance: data.glance,
  };
  return { at: data.at, changed: true, since: sinceIso, fields };
}

function buildJobQueue() {
  const memRecent = [...jobMap.values()]
    .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
    .slice(0, 12)
    .map((j) => ({
      jobId: j.jobId,
      id: j.id,
      status: j.status,
      ok: j.ok,
      ms: j.ms,
      at: j.at,
      mutate: j.mutate,
      error: j.error ? String(j.error).slice(0, 120) : undefined,
    }));
  // Merge disk history from job-store if present
  let diskRecent = [];
  try {
    const dir = path.join(BUSY, 'jobs');
    if (fs.existsSync(dir)) {
      diskRecent = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          try {
            const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
            const st = fs.statSync(path.join(dir, f));
            return { ...j, _mtime: st.mtimeMs };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => (b._mtime || 0) - (a._mtime || 0))
        .slice(0, 12)
        .map((j) => ({
          jobId: j.jobId,
          id: j.id,
          status: j.status,
          ok: j.ok,
          ms: j.ms,
          at: j.at || j.endedAt,
          mutate: j.mutate,
          persisted: true,
        }));
    }
  } catch {
    /* */
  }
  const seen = new Set(memRecent.map((j) => j.jobId));
  const recent = memRecent.concat(diskRecent.filter((j) => j.jobId && !seen.has(j.jobId))).slice(0, 16);
  return {
    running: jobState.running,
    last: jobState.last
      ? { jobId: jobState.last.jobId, id: jobState.last.id, status: jobState.last.status, ok: jobState.last.ok, ms: jobState.last.ms }
      : null,
    recent,
    blockedHint: jobState.running
      ? `job running: ${jobState.running} — wait or poll /api/jobs`
      : null,
  };
}

function ensureDemandFresh(maxAgeSec = 900) {
  /**
   * Never block the status hot path with execSync.
   * If stale/missing: spawn background refresh and return current cache (if any).
   */
  const p = path.join(BUSY, 'demand-status.json');
  let ageSec = null;
  try {
    ageSec = Math.round((Date.now() - fs.statSync(p).mtimeMs) / 1000);
    if (!Number.isFinite(ageSec) || ageSec < 0) ageSec = null;
  } catch {
    ageSec = null;
  }
  if (ageSec != null && ageSec <= maxAgeSec) {
    return { refreshed: false, ageSec, background: false };
  }
  if (!demandRefreshInflight) {
    demandRefreshInflight = true;
    import('child_process')
      .then(({ spawn }) => {
        const child = spawn(process.execPath, ['demigod-demand.mjs', 'status', '--json'], {
          cwd: ROOT,
          stdio: 'ignore',
          detached: true,
        });
        child.unref();
        let hardStop = null;
        const done = () => {
          clearTimeout(watchdog);
          if (hardStop) clearTimeout(hardStop);
          demandRefreshInflight = false;
        };
        const watchdog = setTimeout(() => {
          try {
            child.kill('SIGTERM');
          } catch {
            /* child already exited */
          }
          // Keep the single-flight guard until the child actually exits. If it
          // ignores SIGTERM, bound the wait and make one final best-effort stop.
          hardStop = setTimeout(() => {
            try {
              child.kill('SIGKILL');
            } catch {
              /* child already exited */
            }
            demandRefreshInflight = false;
          }, 5_000);
          hardStop.unref();
        }, 25_000);
        watchdog.unref();
        child.on('exit', done);
        child.on('error', done);
      })
      .catch(() => {
        demandRefreshInflight = false;
      });
  }
  return { refreshed: false, ageSec, background: true, scheduled: true };
}

async function enrichStatus(data) {
  data.version = 5;
  // Stable discovery fields survive both the full persisted status document
  // and the slim polling payload; consumers need no implicit /tmp knowledge.
  data.statusJsonPath = STATUS_JSON;
  data.orientApi = '/api/orient';
  data.orientUrl = `http://127.0.0.1:${PORT}/api/orient`;
  // Swarm cycles already emit a canonical receipt. Surface it here so agents
  // can distinguish a clean run from a sandbox-degraded fallback without
  // scraping logs or guessing from a successful exit code.
  const cycleWorkPath = path.join(BUSY, 'cycle-work-latest.json');
  data.cycleWorkPath = cycleWorkPath;
  data.cycleWork = safeJson(cycleWorkPath) || null;
  let cycleWorkAgeSec = null;
  let cycleWorkTimestampValid = false;
  let cycleWorkFileAgeSec = null;
  try {
    cycleWorkFileAgeSec = Math.max(0, Math.round((Date.now() - fs.statSync(cycleWorkPath).mtimeMs) / 1000));
  } catch {
    /* receipt is optional until the first cycle */
  }
  // Freshness belongs to the receipt, not its inode. Copying or touching an
  // old receipt must never turn it into current cycle attestation.
  const cycleWorkAtMs = Date.parse(data.cycleWork?.at || '');
  const rawReceiptAgeSec = (Date.now() - cycleWorkAtMs) / 1000;
  // Tolerate small clock skew, but never bless a materially future-dated
  // receipt as age zero/fresh evidence.
  cycleWorkTimestampValid = Number.isFinite(cycleWorkAtMs) && Number.isFinite(rawReceiptAgeSec) && rawReceiptAgeSec >= -60;
  cycleWorkAgeSec = cycleWorkTimestampValid ? Math.max(0, Math.round(rawReceiptAgeSec)) : null;
  const cycleChecks = Array.isArray(data.cycleWork?.health)
    ? data.cycleWork.health.map((check) => {
        const childError = check?.error && typeof check.error === 'object'
          ? [check.error.code, check.error.message].filter(Boolean).join(': ')
          : check?.error;
        const diagnostic = [check?.detail, childError, check?.tail].find(
          (value) => typeof value === 'string' && value.trim(),
        );
        return {
        name: check?.name || 'unknown',
        exit: Number.isInteger(check?.exit) ? check.exit : null,
        failureKind: typeof check?.failureKind === 'string' ? check.failureKind : null,
        degraded: check?.degraded === true,
        blocked: check?.blocked === true,
        childStartBlocked: check?.childStartBlocked === true,
        fallback: check?.fallback === true,
          // Cycle-work receipts use `tail`/structured `error`; older receipts
          // use `detail`. Normalize all three without inflating every poll.
          detail: diagnostic ? diagnostic.trim().slice(0, 240) : null,
        };
      })
    : [];
  const cycleWorkStale = !cycleWorkTimestampValid || cycleWorkAgeSec == null || cycleWorkAgeSec > 900;
  const cycleWorkExceptions = cycleChecks.filter(
    (check) => check.exit !== 0 || check.degraded || check.blocked || check.childStartBlocked,
  );
  const cycleWorkDegraded =
    data.cycleWork?.degraded === true ||
    cycleChecks.some((check) => check.degraded || check.fallback || check.childStartBlocked);
  const cycleWorkReasons = [
    !data.cycleWork ? 'receipt-missing' : null,
    cycleWorkStale ? 'receipt-stale' : null,
    data.cycleWork?.attested !== true ? 'not-attested' : null,
    cycleWorkDegraded ? 'degraded' : null,
    data.cycleWork?.blocked === true ? 'blocked' : null,
    cycleChecks.some((check) => check.childStartBlocked) ? 'child-start-blocked' : null,
    cycleChecks.some((check) => check.exit !== 0) ? 'check-failed' : null,
    cycleWorkExceptions.length > 0 ? 'check-exception' : null,
  ].filter(Boolean);
  const cycleWorkSummary = {
    total: cycleChecks.length,
    // A successful fallback proves only its bounded in-process contract. It
    // must not inflate the attested pass count shown to operators or agents.
    passed: cycleChecks.filter((check) =>
      check.exit === 0 &&
      !check.blocked &&
      !check.childStartBlocked &&
      !check.degraded &&
      !check.fallback
    ).length,
    fallbackPassed: cycleChecks.filter((check) =>
      check.exit === 0 &&
      (check.blocked || check.childStartBlocked || check.degraded || check.fallback)
    ).length,
    failed: cycleChecks.filter((check) => check.exit !== 0).length,
    blocked: cycleChecks.filter((check) => check.blocked || check.childStartBlocked).length,
    degraded: cycleChecks.filter((check) => check.degraded || check.fallback).length,
    fallback: cycleChecks.filter((check) => check.fallback).length,
  };
  const cycleReleaseDrift = Array.isArray(data.cycleWork?.releaseDrift)
    ? data.cycleWork.releaseDrift.filter((item) => typeof item === 'string' && item.trim()).slice(0, 12)
    : [];
  const cycleReleaseBlocker = typeof data.cycleWork?.releaseBlocker === 'string'
    ? data.cycleWork.releaseBlocker.trim().slice(0, 500) || null
    : null;
  const rawReleaseRecovery = data.cycleWork?.releaseRecovery;
  const rawReleaseRecoveryCommand = typeof rawReleaseRecovery?.command === 'string'
    ? rawReleaseRecovery.command.trim().slice(0, 240) || null
    : null;
  // Older cycle receipts did not always annotate recovery commands. Known
  // release publishers must still be presented fail-closed as mutations.
  const inferredReleaseMutation = Boolean(
    rawReleaseRecoveryCommand &&
    /(?:^|\s)(?:node\s+)?(?:\.\/)?demigod-foot-cdn-publish\.mjs(?:\s|$)/.test(rawReleaseRecoveryCommand),
  );
  const releaseRecoveryMutates = rawReleaseRecovery?.mutates === true || inferredReleaseMutation;
  const explicitReleaseGates = Array.isArray(rawReleaseRecovery?.gatedBy)
    ? rawReleaseRecovery.gatedBy
        .filter((gate) => typeof gate === 'string' && gate.trim())
        .map((gate) => gate.trim().slice(0, 80))
        .slice(0, 8)
    : [];
  const releaseRecoveryGates = releaseRecoveryMutates && explicitReleaseGates.length === 0
    ? ['publish-freeze-off', 'foot-write-lock']
    : explicitReleaseGates;
  const cycleReleaseRecovery = rawReleaseRecovery && typeof rawReleaseRecovery === 'object'
    ? {
        state: typeof rawReleaseRecovery.state === 'string'
          ? rawReleaseRecovery.state.trim().slice(0, 80) || null
          : null,
        command: rawReleaseRecoveryCommand,
        then: typeof rawReleaseRecovery.then === 'string'
          ? rawReleaseRecovery.then.trim().slice(0, 240) || null
          : null,
        mutates: releaseRecoveryMutates,
        gatedBy: releaseRecoveryGates,
        guarded:
          rawReleaseRecovery.guarded === true ||
          (releaseRecoveryMutates && releaseRecoveryGates.length > 0),
        requiresLiveAttestation: rawReleaseRecovery.requiresLiveAttestation === true,
        owner: typeof rawReleaseRecovery.owner === 'string'
          ? rawReleaseRecovery.owner.trim().slice(0, 120) || null
          : null,
      }
    : null;
  const releaseDetails = data.cycleWork?.releaseDetails;
  // Tools cycles already publish identityDelta, while website cycles retain
  // the equivalent core/manifest pair. Normalize both receipt shapes here so
  // a domain rotation cannot make an active staged-release mismatch disappear
  // from the compact dashboard/status API.
  const rawReleaseIdentity = releaseDetails?.identityDelta || (
    releaseDetails?.core && releaseDetails?.manifest
      ? Object.fromEntries(['version', 'sha256', 'bytes'].flatMap((key) => {
          const expected = releaseDetails.core[key];
          const staged = releaseDetails.manifest[key];
          return expected === staged ? [] : [[key, { expected, staged }]];
        }))
      : null
  );
  const cycleReleaseIdentity = rawReleaseIdentity && typeof rawReleaseIdentity === 'object'
    ? Object.fromEntries(
        ['version', 'sha256', 'bytes'].flatMap((key) => {
          const delta = rawReleaseIdentity[key];
          if (!delta || typeof delta !== 'object') return [];
          const clean = (value) => {
            if (value == null) return null;
            if (key === 'bytes') return Number.isSafeInteger(value) && value >= 0 ? value : null;
            const text = String(value).trim();
            return text ? text.slice(0, key === 'sha256' ? 128 : 40) : null;
          };
          const expected = clean(delta.expected);
          const staged = clean(delta.staged);
          return expected == null && staged == null ? [] : [[key, { expected, staged }]];
        }),
      )
    : {};
  const cycleWorkBlocked = data.cycleWork?.blocked === true ||
    cycleChecks.some((check) => check.blocked || check.childStartBlocked);
  // Derive the public verification label from normalized child health. Do not
  // trust an older or contradictory receipt's top-level string: a blocked,
  // degraded, or stale cycle can never remain labelled "attested" here.
  const cycleHasReleasePreflight =
    data.cycleWork?.domain === 'website' ||
    data.cycleWork?.domain === 'ship' ||
    data.cycleWork?.domain === 'tools';
  // Tools OS can be green while release staging is not. Prefer release-blocked
  // over generic "blocked" so priority/UI do not say tools are unattested.
  const cycleToolsReady =
    data.cycleWork?.domain === 'tools' && data.cycleWork?.toolsReady === true;
  const cycleReleaseBlocked =
    cycleHasReleasePreflight &&
    data.cycleWork?.releaseReady === false &&
    (data.cycleWork?.attested === true || cycleToolsReady) &&
    !cycleWorkStale &&
    (cycleToolsReady || !cycleWorkBlocked);
  const cycleWorkVerification = cycleReleaseBlocked
    ? 'release-blocked'
    : cycleWorkBlocked
      ? 'blocked'
      : cycleWorkExceptions.length > 0
        ? 'failed'
      : cycleWorkDegraded || cycleWorkStale || data.cycleWork?.attested !== true
        ? (data.cycleWork?.ok === true ? 'degraded' : 'failed')
        : 'attested';
  data.cycleWorkHealth = {
    receiptAvailable: Boolean(data.cycleWork),
    attested: data.cycleWork?.attested === true,
    verification: cycleWorkVerification,
    ok:
      data.cycleWork?.ok === true &&
      data.cycleWork?.attested === true &&
      !cycleWorkDegraded &&
      !cycleWorkBlocked &&
      !cycleWorkStale &&
      cycleWorkExceptions.length === 0,
    degraded: cycleWorkDegraded,
    blocked: cycleWorkBlocked,
    // Keep concrete ship drift on the compact health surface. Otherwise the
    // dashboard collapses an actionable manifest/core mismatch into the
    // generic "cycle blocked" label even though the receipt knows the cause.
    shipReady: data.cycleWork?.domain === 'ship' ? data.cycleWork?.shipReady === true : null,
    // Tools OS health and release staging are independent. Preserve the
    // receipt's explicit toolsReady bit so API/UI consumers do not infer that
    // a staged manifest/core mismatch means the tools checks themselves failed.
    toolsReady: data.cycleWork?.domain === 'tools' ? data.cycleWork?.toolsReady === true : null,
    releaseReady: cycleHasReleasePreflight ? data.cycleWork?.releaseReady === true : null,
    // Surface release-blocked so priority-board does not collapse to "not attested".
    failureKind: data.cycleWork?.failureKind || (cycleReleaseBlocked ? 'release-blocked' : null),
    releaseBlocker: cycleReleaseBlocker,
    releaseDrift: cycleReleaseDrift,
    releaseRecovery: cycleHasReleasePreflight ? cycleReleaseRecovery : null,
    releaseDetails: cycleHasReleasePreflight && Object.keys(cycleReleaseIdentity).length
      ? { identityDelta: cycleReleaseIdentity }
      : null,
    domain: data.cycleWork?.domain || null,
    cycle: data.cycleWork?.cycle ?? null,
    ageSec: cycleWorkAgeSec,
    fileAgeSec: cycleWorkFileAgeSec,
    timestampSource: 'receipt.at',
    timestampValid: cycleWorkTimestampValid,
    stale: cycleWorkStale,
    reasons: [...new Set(cycleWorkReasons)],
    exceptionCount: cycleWorkExceptions.length,
    summary: cycleWorkSummary,
    checks: cycleChecks,
  };
  // Keep demand snapshot warm for glance (agent-only; never auto-sends)
  try {
    data.demandRefresh = ensureDemandFresh(900);
    data.demandStale = data.demandRefresh?.ageSec == null || data.demandRefresh.ageSec > 900;
    if (!data.demand) {
      try {
        const j = JSON.parse(fs.readFileSync(path.join(BUSY, 'demand-status.json'), 'utf8'));
        data.demand = demandStatusSnapshot(j);
      } catch {
        /* */
      }
    }
    if (data.demand) {
      data.demand.stale = data.demandStale;
      data.demand.ageSec = data.demandRefresh?.ageSec ?? null;
    }
    data.demandDraftsHygiene = data.demand?.drafts?.hygiene || null;
    // Top-level booleans keep the advertised status path grep/jq friendly;
    // consumers need not reconstruct visibility from nested contracts.
    data.demandDraftsHygieneVisible = data.demandDraftsHygiene != null;
    // Publish the canonical nested location as data, not just as prose in the
    // discovery views. File-only consumers can follow this pointer directly
    // and avoid depending on the top-level compatibility alias.
    data.demandDraftsHygieneCanonicalJsonPointer = '/demand/drafts/hygiene';
    data.demandDraftsHygieneOk = data.demandDraftsHygiene?.ok ?? null;
    data.demandDraftsHygieneSource = data.demandDraftsHygiene?.source || 'unknown';
    // Preserve the hygiene receipt's own evidence clock. A queue/status refresh
    // can update demand.at without rechecking drafts; using that broader clock
    // would make stale hygiene evidence look fresh in /api/status.
    data.demandDraftsHygieneAt = data.demandDraftsHygiene?.at || null;
    data.demandDraftsHygieneAgeSec = data.demandDraftsHygiene?.ageSec ?? null;
    data.demandDraftsHygieneStale = data.demandDraftsHygiene?.stale ?? true;
    // One fail-closed readiness bit prevents API, delta, and file consumers
    // from treating a present but stale (or failing) hygiene receipt as safe.
    data.demandDraftsHygieneReady =
      data.demandDraftsHygiene?.ok === true && data.demandDraftsHygieneStale === false;
    data.demandStatusPath = data.demand?.statusPath || path.join(BUSY, 'demand-status.json');
    data.demandStatusSourceReceipt = data.demand?.sourceReceipt || {
      path: data.demandStatusPath,
      bytes: null,
      sha256: null,
    };
  data.demandDraftsHygieneStatusPath =
    data.demandDraftsHygiene?.statusPath || data.demandStatusPath;
  // Small, stable file-reader view: a consumer opening dashboard-status.json
  // can discover the orient endpoint and draft-hygiene value in one object.
  data.statusPathView = {
    schema: 'demigod.dashboard-status-path-view/1',
    path: STATUS_JSON,
    orientApi: data.orientApi,
    orientUrl: data.orientUrl,
    orientStatusJsonPath: data.orient?.statusJsonPath || STATUS_JSON,
    // Make the HTTP entrypoint discoverable from the durable status receipt
    // without requiring callers to assemble it from separate scalar fields.
    orientEndpoint: {
      method: 'GET',
      path: data.orientApi,
      statusJsonPath: STATUS_JSON,
      demandDraftsHygieneJsonPointer: '/orient/demandDraftsHygiene',
      // Document both shapes served by /api/orient: its direct response and
      // the durable mirror in dashboard-status.json. This keeps file readers
      // and HTTP clients from accidentally applying the persisted /orient
      // prefix to the endpoint response itself.
      responseJsonPointers: {
        draftsHygiene: '/drafts/hygiene',
        demandDraftsHygiene: '/demandDraftsHygiene',
        persistedMirror: '/orient/drafts/hygiene',
      },
    },
    // One bounded read recipe for agents that start from the persisted file.
    // Keep the endpoint, canonical nested value, and fail-closed readiness bit
    // together so status consumers do not need to reverse-engineer aliases.
    agentRead: {
      statusJsonPath: STATUS_JSON,
      orientApi: data.orientApi,
      orientJsonPointer: '/orient',
      demandDraftsHygieneJsonPointer: '/demand/drafts/hygiene',
      orientDraftsHygieneJsonPointer: '/orient/drafts/hygiene',
      demandDraftsHygieneReadyJsonPointer: '/demandDraftsHygieneReady',
      demandDraftsHygieneReady: data.demandDraftsHygieneReady === true,
    },
    orientApiVisible: data.orientApi === '/api/orient',
    orientApiJsonPointer: '/orientApi',
    orientDraftsHygiene: data.orient?.drafts?.hygiene || null,
    orientDraftsHygieneVisible: data.orient?.drafts?.hygiene != null,
    orientDraftsHygieneJsonPointer: '/orient/drafts/hygiene',
    demandDraftsHygiene: data.demandDraftsHygiene,
    demandDraftsHygieneVisible: data.demandDraftsHygiene != null,
    demandDraftsHygieneOk: data.demandDraftsHygieneOk,
    demandDraftsHygieneJsonPointer: '/demandDraftsHygiene',
    demandDraftsHygieneCanonicalJsonPointer:
      data.demandDraftsHygieneCanonicalJsonPointer,
    demandDraftsHygieneOkJsonPointer: '/demandDraftsHygieneOk',
    demandDraftsHygieneSource: data.demandDraftsHygieneSource,
    demandDraftsHygieneSourceJsonPointer: '/demandDraftsHygieneSource',
    demandDraftsHygieneAt: data.demandDraftsHygieneAt,
    demandDraftsHygieneAgeSec: data.demandDraftsHygieneAgeSec,
    demandDraftsHygieneStale: data.demandDraftsHygieneStale,
    demandDraftsHygieneReady: data.demandDraftsHygieneReady,
    demandDraftsHygieneReadyJsonPointer: '/demandDraftsHygieneReady',
    demandDraftsHygieneStatusPath: data.demandDraftsHygieneStatusPath,
    demandDraftsHygieneStatusPathJsonPointer: '/demandDraftsHygieneStatusPath',
    demandStatusPath: data.demandStatusPath,
    demandStatusPathJsonPointer: '/demandStatusPath',
    demandStatusSourceReceipt: data.demandStatusSourceReceipt,
    demandStatusSourceReceiptJsonPointer: '/demandStatusSourceReceipt',
    complete:
      data.orientApi === '/api/orient' &&
      data.orient?.drafts?.hygiene != null &&
      data.demandDraftsHygiene != null &&
      data.demandDraftsHygieneReady === true,
  };
    // collectStatus builds the orient mirror before this optional demand refresh.
    // Rejoin it here so the persisted /orient pointers cannot lag the root
    // hygiene snapshot within the same dashboard-status.json receipt.
    if (data.orient) {
      data.orient.drafts = data.demand?.drafts || null;
      data.orient.demandDrafts = data.demand?.drafts || null;
      data.orient.demandDraftsHygiene = data.demandDraftsHygiene;
      data.orient.demandDraftsHygieneReady = data.demandDraftsHygieneReady;
      data.orient.demandDraftsHygieneOk = data.demandDraftsHygieneOk;
      data.orient.demandDraftsHygieneSource = data.demandDraftsHygieneSource;
      data.orient.demandDraftsHygieneAt = data.demandDraftsHygieneAt;
      data.orient.demandDraftsHygieneAgeSec = data.demandDraftsHygieneAgeSec;
      data.orient.demandDraftsHygieneStale = data.demandDraftsHygieneStale;
      data.orient.demandDraftsHygieneStatusPath = data.demandDraftsHygieneStatusPath;
      data.orient.demandStatusPath = data.demandStatusPath;
      data.orient.demandStatusSourceReceipt = data.demandStatusSourceReceipt;
      data.orient.statusJsonPath = STATUS_JSON;
    }
    // statusPathView is assembled before the orient mirror is refreshed above.
    // Rebind its value so a single read of dashboard-status.json never exposes
    // a current root hygiene receipt beside a stale/null orient projection.
    data.statusPathView.orientDraftsHygiene = data.orient?.drafts?.hygiene || null;
    data.statusPathView.orientDraftsHygieneVisible =
      data.statusPathView.orientDraftsHygiene != null;
    data.statusPathView.orientDraftsHygieneConsistent =
      data.statusPathView.orientDraftsHygieneVisible &&
      data.statusPathView.demandDraftsHygieneVisible &&
      JSON.stringify(data.statusPathView.orientDraftsHygiene) ===
        JSON.stringify(data.statusPathView.demandDraftsHygiene);
    data.statusPathView.complete =
      data.statusPathView.orientApiVisible &&
      data.statusPathView.orientDraftsHygieneVisible &&
      data.statusPathView.demandDraftsHygieneVisible &&
      data.statusPathView.orientDraftsHygieneConsistent &&
      // Visibility and consistency only prove that both projections agree.
      // They must not turn a stale or failing hygiene receipt into a complete
      // status contract; readiness already folds ok=true and stale=false.
      data.statusPathView.demandDraftsHygieneReady === true;
  } catch {
    /* */
  }
  // Visibility is only trustworthy when the root snapshot and its orient
  // mirror identify the same hygiene evidence. Presence alone can hide a
  // partially refreshed status document from file-only agents.
  const orientDemandDraftsHygieneConsistent =
    data.demandDraftsHygiene != null &&
    data.orient?.demandDraftsHygiene != null &&
    // Equal verdicts can still conceal lagging checked/clean/flagged counts.
    // Require the complete normalized receipt to match across both views.
    JSON.stringify(data.orient.demandDraftsHygiene) ===
      JSON.stringify(data.demandDraftsHygiene) &&
    data.orient.demandDraftsHygieneSource === data.demandDraftsHygieneSource &&
    data.orient.demandDraftsHygieneStatusPath === data.demandDraftsHygieneStatusPath;
  const statusJsonContractComplete =
    data.orientApi === '/api/orient' &&
    Boolean(data.orient) &&
    data.orient?.demandDraftsHygiene != null &&
    data.demandDraftsHygiene != null &&
    orientDemandDraftsHygieneConsistent &&
    // Agreement only proves both projections describe the same receipt. A
    // stale or failing receipt must keep the advertised status contract
    // incomplete even when the root and orient mirrors agree byte-for-byte.
    data.demandDraftsHygieneReady === true &&
    data.orient?.demandDraftsHygieneReady === true;
  // Compact machine-readable contract at the advertised status path. Agents
  // should not have to infer endpoint names or traverse discovery metadata.
  data.statusJsonContract = {
    schema: 'demigod.dashboard-status-contract/1',
    complete: statusJsonContractComplete,
    completeJsonPointer: '/statusJsonContract/complete',
    statusJsonPath: STATUS_JSON,
    statusJsonPathJsonPointer: '/statusJsonPath',
    orientApi: data.orientApi,
    orientApiJsonPointer: '/orientApi',
    orientUrl: data.orientUrl,
    orientStatusJsonPath: data.orient?.statusJsonPath || STATUS_JSON,
    orientJsonPointer: '/orient',
    orientDraftsHygieneJsonPointer: '/orient/drafts/hygiene',
    orientDemandDraftsHygieneJsonPointer: '/orient/demandDraftsHygiene',
    orientDemandDraftsHygieneOkJsonPointer: '/orient/demandDraftsHygieneOk',
    orientDemandDraftsHygieneReady: data.orient?.demandDraftsHygieneReady === true,
    orientDemandDraftsHygieneReadyJsonPointer: '/orient/demandDraftsHygieneReady',
    orientDemandDraftsHygieneSourceJsonPointer: '/orient/demandDraftsHygieneSource',
    orientDemandDraftsHygieneStatusPathJsonPointer: '/orient/demandDraftsHygieneStatusPath',
    orientDemandStatusPathJsonPointer: '/orient/demandStatusPath',
    demandDraftsHygiene: data.demandDraftsHygiene || null,
    demandDraftsHygieneOk: data.demandDraftsHygiene?.ok ?? null,
    demandDraftsHygieneJsonPointer: '/demandDraftsHygiene',
    demandDraftsHygieneCanonicalJsonPointer:
      data.demandDraftsHygieneCanonicalJsonPointer,
    demandDraftsHygieneSource: data.demandDraftsHygieneSource || 'unknown',
    demandDraftsHygieneAt: data.demandDraftsHygieneAt || null,
    demandDraftsHygieneAgeSec: data.demandDraftsHygieneAgeSec ?? null,
    demandDraftsHygieneStale: data.demandDraftsHygieneStale ?? true,
    demandDraftsHygieneReady: data.demandDraftsHygieneReady === true,
    demandDraftsHygieneReadyJsonPointer: '/demandDraftsHygieneReady',
    demandDraftsHygieneSourceJsonPointer: '/demandDraftsHygieneSource',
    demandDraftsHygieneStatusPath: data.demandDraftsHygieneStatusPath || data.demandStatusPath,
    demandDraftsHygieneStatusPathJsonPointer: '/demandDraftsHygieneStatusPath',
    demandStatusPath: data.demandStatusPath,
    demandStatusPathJsonPointer: '/demandStatusPath',
    // Minimal file-only entrypoint: one durable path plus the two fields an
    // orienting agent needs before it decides whether to call the dashboard.
    statusPathView: {
      path: STATUS_JSON,
      orientApi: data.orientApi,
      orientUrl: data.orientUrl,
      orientStatusJsonPath: data.orient?.statusJsonPath || STATUS_JSON,
      orientApiJsonPointer: '/orientApi',
      orientDraftsHygieneJsonPointer: '/orient/drafts/hygiene',
      orientDemandDraftsHygieneJsonPointer: '/orient/demandDraftsHygiene',
      orientDemandDraftsHygieneOkJsonPointer: '/orient/demandDraftsHygieneOk',
      orientDemandDraftsHygieneReadyJsonPointer: '/orient/demandDraftsHygieneReady',
      demandDraftsHygieneJsonPointer: '/demandDraftsHygiene',
      demandDraftsHygieneOkJsonPointer: '/demandDraftsHygieneOk',
      demandDraftsHygieneReadyJsonPointer: '/demandDraftsHygieneReady',
    },
    visibility: {
      orientApi: data.orientApi === '/api/orient',
      orientCard: Boolean(data.orient),
      orientDemandDraftsHygiene: data.orient?.demandDraftsHygiene != null,
      demandDraftsHygiene: data.demandDraftsHygiene != null,
      consistent: orientDemandDraftsHygieneConsistent,
      complete: statusJsonContractComplete,
    },
  };
  // Small, stable proof for agents that read dashboard-status.json directly.
  // Keep values (not only JSON pointers) together so a single file read shows
  // whether orientation and demand-draft hygiene are actually visible now.
  data.statusVisibility = {
    schema: 'demigod.dashboard-status-visibility/1',
    // Keep the two cross-surface pointers at the front of this receipt: they
    // are the minimal link from /api/orient back into dashboard-status.json.
    orientJsonPointer: '/orient',
    orientDemandDraftsHygieneJsonPointer: '/orient/demandDraftsHygiene',
    statusJsonPath: STATUS_JSON,
    statusJsonPathVisible: data.statusJsonPath === STATUS_JSON,
    orientApi: data.orientApi,
    orientApiJsonPointer: '/orientApi',
    // Treat only the canonical endpoint as visible. A non-empty typo would
    // otherwise make the persisted dashboard receipt claim successful
    // discovery while sending file-only agents to a missing route.
    orientApiVisible: data.orientApi === '/api/orient',
    orientUrl: data.orientUrl,
    orientStatusJsonPath: data.orient?.statusJsonPath || STATUS_JSON,
    orientVisible: Boolean(data.orient),
    orientDemandDraftsHygieneVisible: data.orient?.demandDraftsHygiene != null,
    orientDemandDraftsHygieneConsistent,
    orientDraftsHygieneJsonPointer: '/orient/drafts/hygiene',
    orientRoute: {
      method: 'GET',
      path: '/api/orient',
      statusJsonPath: STATUS_JSON,
    },
    statusJsonPointers: {
      statusJsonPath: '/statusJsonPath',
      orientApi: '/orientApi',
      orient: '/orient',
      orientDraftsHygiene: '/orient/drafts/hygiene',
      demandDraftsHygiene: '/demandDraftsHygiene',
      orientDemandDraftsHygiene: '/orient/demandDraftsHygiene',
      demandDraftsHygieneStatusPath: '/demandDraftsHygieneStatusPath',
      demandStatusPath: '/demandStatusPath',
    },
    orientDemandDraftsHygieneOkJsonPointer: '/orient/demandDraftsHygieneOk',
    orientDemandDraftsHygieneReady: data.orient?.demandDraftsHygieneReady === true,
    orientDemandDraftsHygieneReadyJsonPointer: '/orient/demandDraftsHygieneReady',
    orientDemandDraftsHygieneSourceJsonPointer: '/orient/demandDraftsHygieneSource',
    orientDemandDraftsHygieneStatusPathJsonPointer: '/orient/demandDraftsHygieneStatusPath',
    demandDraftsHygiene: data.demandDraftsHygiene || null,
    demandDraftsHygieneJsonPointer: '/demandDraftsHygiene',
    demandDraftsHygieneVisible: data.demandDraftsHygiene != null,
    demandDraftsHygieneOk: data.demandDraftsHygieneOk ?? null,
    demandDraftsHygieneOkJsonPointer: '/demandDraftsHygieneOk',
    demandDraftsHygieneReady: data.demandDraftsHygieneReady === true,
    demandDraftsHygieneReadyJsonPointer: '/demandDraftsHygieneReady',
    demandDraftsHygieneSource: data.demandDraftsHygieneSource || 'unknown',
    demandDraftsHygieneAt: data.demandDraftsHygieneAt || null,
    demandDraftsHygieneAgeSec: data.demandDraftsHygieneAgeSec ?? null,
    demandDraftsHygieneStale: data.demandDraftsHygieneStale ?? true,
    demandDraftsHygieneStatusPath:
      data.demandDraftsHygieneStatusPath || data.demandStatusPath,
    demandStatusPath: data.demandStatusPath,
    complete:
      data.statusJsonPath === STATUS_JSON &&
      data.orientApi === '/api/orient' &&
      Boolean(data.orient) &&
      data.orient?.demandDraftsHygiene != null &&
      data.demandDraftsHygiene != null &&
      orientDemandDraftsHygieneConsistent &&
      // Visibility is not usability. Keep this one-read status-path receipt
      // fail closed when the shared hygiene evidence is stale or flagged.
      data.demandDraftsHygieneReady === true &&
      data.orient?.demandDraftsHygieneReady === true,
  };
  // Single fail-closed verdict shared by persisted status views, slim polling,
  // and /api/orient. Build it before the compact path view so that view never
  // publishes a raw receipt without its readiness decision.
  data.draftHygieneVerdict = {
    schema: 'demigod.draft-hygiene-verdict/1',
    ready: data.demandDraftsHygieneReady === true,
    reason: data.demandDraftsHygieneReady === true
      ? 'ready'
      : data.demandDraftsHygiene == null
        ? 'missing'
        : data.demandDraftsHygiene?.clockSkewed === true
          ? 'clock-skewed'
          : data.demandDraftsHygieneStale === true
            ? 'stale'
            : data.demandDraftsHygieneOk === false
              ? 'flagged'
              : 'unknown',
    ok: data.demandDraftsHygieneOk ?? null,
    stale: data.demandDraftsHygieneStale ?? true,
    source: data.demandDraftsHygieneSource || 'unknown',
    at: data.demandDraftsHygieneAt || null,
    ageSec: data.demandDraftsHygieneAgeSec ?? null,
    statusPath: data.demandDraftsHygieneStatusPath || data.demandStatusPath || null,
    checked: data.demandDraftsHygiene?.checked ?? null,
    clean: data.demandDraftsHygiene?.clean ?? null,
    flagged: data.demandDraftsHygiene?.flagged ?? null,
  };
  // Keep the canonical persisted orient branch independently auditable. A
  // file-only reader following /orient/drafts/hygiene should not need to join
  // root aliases to learn whether that evidence is usable or where it came
  // from. This is also the shape returned by the orient discovery contract.
  if (data.orient) {
    data.orient.drafts = {
      ...(data.orient.drafts || {}),
      hygiene: data.demandDraftsHygiene || null,
      hygieneVerdict: data.draftHygieneVerdict,
      statusPath: data.demandDraftsHygieneStatusPath || data.demandStatusPath || null,
      statusJsonPath: STATUS_JSON,
      sourceReceipt: {
        source: data.demandDraftsHygieneSource || 'unknown',
        ...(data.demandDraftsHygiene?.sourceReceipt || data.demandStatusSourceReceipt || {}),
        at: data.demandDraftsHygieneAt || null,
        ageSec: data.demandDraftsHygieneAgeSec ?? null,
        stale: data.demandDraftsHygieneStale ?? true,
        statusPath: data.demandDraftsHygieneStatusPath || data.demandStatusPath || null,
      },
    };
  }
  // One durable locator for both the HTTP endpoint and the exact persisted
  // hygiene field. This keeps file-only agents aligned with /api/orient.
  data.statusDiscovery = {
    schema: 'demigod.dashboard-status-discovery/1',
    path: STATUS_JSON,
    // Keep the canonical name alongside the legacy `path` field so consumers
    // can copy this object between /api/status and /api/orient unchanged.
    statusJsonPath: STATUS_JSON,
    statusJsonPathJsonPointer: '/statusJsonPath',
    orientApi: '/api/orient',
    orientApiJsonPointer: '/orientApi',
    orientUrl: data.orientUrl,
    orientUrlJsonPointer: '/orientUrl',
    orientField: 'orient',
    orientJsonPointer: '/orient',
    orientDraftsHygieneJsonPointer: '/orient/drafts/hygiene',
    orientDraftsHygieneVerdictJsonPointer: '/orient/drafts/hygieneVerdict',
    orientDraftsHygieneSourceReceiptJsonPointer: '/orient/drafts/sourceReceipt',
    orientStatusJsonPathJsonPointer: '/orient/statusJsonPath',
    orientDemandDraftsHygieneJsonPointer: '/orient/demandDraftsHygiene',
    orientDemandDraftsHygieneOkJsonPointer: '/orient/demandDraftsHygieneOk',
    orientDemandDraftsHygieneSourceJsonPointer: '/orient/demandDraftsHygiene/source',
    orientDemandDraftsHygieneExplicitSourceJsonPointer: '/orient/demandDraftsHygieneSource',
    orientDemandDraftsHygieneStatusPathJsonPointer: '/orient/demandDraftsHygieneStatusPath',
    orientDemandStatusPathJsonPointer: '/orient/demandStatusPath',
    cycleWorkField: 'cycleWork',
    cycleWorkJsonPointer: '/cycleWork',
    cycleWorkPath: data.cycleWorkPath,
    cycleWorkHealthField: 'cycleWorkHealth',
    cycleWorkHealthJsonPointer: '/cycleWorkHealth',
    cycleWorkAttestedJsonPointer: '/cycleWorkHealth/attested',
    demandDraftsHygieneField: 'demandDraftsHygiene',
    demandDraftsHygieneJsonPointer: '/demandDraftsHygiene',
    draftHygieneVerdictField: 'draftHygieneVerdict',
    draftHygieneVerdictJsonPointer: '/draftHygieneVerdict',
    demandDraftsHygieneSourceJsonPointer: '/demandDraftsHygieneSource',
    demandDraftsHygieneStatusPathJsonPointer: '/demandDraftsHygieneStatusPath',
    demandDraftsHygieneSource: data.demandDraftsHygieneSource || 'unknown',
    demandDraftsHygiene: data.demandDraftsHygiene || null,
    draftHygieneVerdict: data.draftHygieneVerdict || null,
    demandStatusPathJsonPointer: '/demandStatusPath',
  };
  // Minimal file-reader view: consumers that only know dashboard-status.json
  // should not have to reverse-engineer the larger discovery contracts to
  // locate the live orient route and its persisted draft-hygiene evidence.
  data.statusJsonPathView = {
    schema: 'demigod.dashboard-status-path-view/1',
    path: STATUS_JSON,
    statusJsonPath: STATUS_JSON,
    orientApi: '/api/orient',
    orientUrl: data.orientUrl,
    // Stable pointers let minimal file readers verify both required surfaces
    // without knowing the rest of the dashboard status schema.
    pointers: {
      orientApi: '/statusJsonPathView/orientApi',
      demandDraftsHygiene: '/statusJsonPathView/demand/drafts/hygiene',
      demandDraftsHygieneVerdict: '/statusJsonPathView/demand/drafts/hygieneVerdict',
    },
    // Mirror /api/orient's canonical demand shape for file-only readers.
    demand: {
      drafts: {
        hygiene: data.demandDraftsHygiene || null,
        // Pair evidence with the normalized fail-closed decision. Presence of
        // a hygiene object alone is not readiness: it may be stale or flagged.
        hygieneVerdict: data.draftHygieneVerdict || null,
      },
    },
    // Compact route + receipt locator for one-read file consumers.
    orientEndpoint: {
      method: 'GET',
      path: '/api/orient',
      statusJsonPath: STATUS_JSON,
      // Put the visibility/readiness verdict beside the route. A status-file
      // reader can decide whether the advertised orient surface is usable
      // without chasing the evidence pointers first.
      visible: data.orientApi === '/api/orient',
      demandDraftsHygieneVisible: data.demandDraftsHygiene != null,
      demandDraftsHygieneReady: data.draftHygieneVerdict?.ready === true,
      // Keep provenance on the compact endpoint card itself. Consumers that
      // only read statusJsonPathView no longer need to chase the root aliases
      // to learn which demand receipt supplied the hygiene verdict.
      demandDraftsHygieneSource: data.demandDraftsHygieneSource || 'unknown',
      demandDraftsHygieneStatusPath:
        data.demandDraftsHygieneStatusPath || data.demandStatusPath || null,
      demandDraftsHygieneJsonPointer: '/statusJsonPathView/demand/drafts/hygiene',
      demandDraftsHygieneVerdictJsonPointer:
        '/statusJsonPathView/demand/drafts/hygieneVerdict',
    },
    orientApiVisible: data.orientApi === '/api/orient',
    orientJsonPointer: '/orient',
    orientVisible: Boolean(data.orient),
    // Structural /api/orient mirror for file-only readers.
    orient: {
      api: '/api/orient',
      statusJsonPath: STATUS_JSON,
      drafts: { hygiene: data.orient?.drafts?.hygiene || data.demandDraftsHygiene || null },
      demand: {
        drafts: {
          // The orient receipt may have been read before this status cycle
          // refreshed demand. Prefer the normalized root evidence so every
          // statusJsonPathView hygiene projection is byte-for-byte current.
          hygiene: data.demandDraftsHygiene || data.orient?.demand?.drafts?.hygiene || null,
          // Match the persisted root demand projection: evidence without its
          // fail-closed verdict can make a stale or flagged receipt look ready.
          hygieneVerdict: data.draftHygieneVerdict || null,
          statusPath:
            data.demandDraftsHygieneStatusPath || data.demandStatusPath || null,
          statusJsonPath: STATUS_JSON,
        },
      },
    },
    orientDemandDraftsHygiene: data.orient?.demandDraftsHygiene || null,
    orientDemandDraftsHygieneVisible: data.orient?.demandDraftsHygiene != null,
    orientDemandDraftsHygieneConsistent,
    demandDraftsHygiene: data.demandDraftsHygiene || null,
    demandDraftsHygieneVerdict: data.draftHygieneVerdict || null,
    demandDraftsHygieneStatusJsonPointer: '/statusJsonPathView/demand/drafts/hygiene',
    orientDraftsHygieneStatusJsonPointer: '/statusJsonPathView/orient/drafts/hygiene',
    orientDemandDraftsHygieneStatusJsonPointer:
      '/statusJsonPathView/orient/demand/drafts/hygiene',
    demandDraftsHygieneOk: data.demandDraftsHygieneOk ?? null,
    demandDraftsHygieneSource: data.demandDraftsHygieneSource || 'unknown',
    demandDraftsHygieneVisible: data.demandDraftsHygiene != null,
    demandDraftsHygieneReady: data.draftHygieneVerdict?.ready === true,
    demandDraftsHygieneJsonPointer: '/demandDraftsHygiene',
    orientDemandDraftsHygieneJsonPointer: '/orient/demandDraftsHygiene',
    demandDraftsHygieneStatusPath: data.demandDraftsHygieneStatusPath,
    complete:
      data.orientApi === '/api/orient' &&
      Boolean(data.orient) &&
      data.orient?.demandDraftsHygiene != null &&
      data.demandDraftsHygiene != null &&
      orientDemandDraftsHygieneConsistent &&
      // A consistent stale/flagged receipt is still unusable. Keep this
      // compact file-reader contract aligned with statusPathView and the
      // draftHygieneVerdict fail-closed readiness policy.
      data.draftHygieneVerdict?.ready === true,
  };
  // Canonical one-read agent entrypoint. Keep this deliberately smaller than
  // the discovery/debug views above: readers of dashboard-status.json need the
  // route, the exact demand shape returned by /api/orient, and a fail-closed
  // consistency verdict without reconstructing JSON pointers.
  data.agentOrientStatus = {
    schema: 'demigod.agent-orient-status/1',
    statusJsonPath: STATUS_JSON,
    statusJsonPathVisible: data.statusJsonPath === STATUS_JSON,
    api: '/api/orient',
    url: data.orientUrl,
    endpoint: {
      method: 'GET',
      path: '/api/orient',
      statusJsonPath: STATUS_JSON,
      demandDraftsHygieneJsonPointer: '/agentOrientStatus/demand/drafts/hygiene',
      demandDraftsHygieneVerdictJsonPointer:
        '/agentOrientStatus/demand/drafts/hygieneVerdict',
      demandDraftsHygieneSourceReceiptJsonPointer:
        '/agentOrientStatus/demand/drafts/sourceReceipt',
      demandDraftsHygieneStatusPathJsonPointer:
        '/agentOrientStatus/demand/drafts/statusPath',
      demandDraftsHygieneStatusJsonPathJsonPointer:
        '/agentOrientStatus/demand/drafts/statusJsonPath',
      // Keep the durable file locator in the compact receipt itself. Agents
      // can discover the HTTP route and verify the exact persisted evidence
      // without first expanding statusDiscovery/statusJsonContract.
      statusJsonPathViewJsonPointer: '/statusJsonPathView',
    },
    demand: {
      drafts: {
        hygiene: data.demandDraftsHygiene || null,
        // Keep the evidence and its fail-closed interpretation adjacent in
        // the compact status receipt. File-only readers must not infer that
        // a present but stale/flagged hygiene object is ready.
        hygieneVerdict: data.draftHygieneVerdict || null,
        // Persist the source receipt path beside the evidence. This makes the
        // compact status object independently auditable without a root-field
        // join through demandDraftsHygieneStatusPath.
        statusPath:
          data.demandDraftsHygieneStatusPath || data.demandStatusPath || null,
        // Keep the dashboard receipt location distinct from the upstream
        // demand-status source. A file-only reader can now resolve this
        // hygiene projection without inferring which path `statusPath` names.
        statusJsonPath: STATUS_JSON,
        // Materialize the receipt advertised by endpoint's
        // demandDraftsHygieneSourceReceiptJsonPointer. Previously that pointer
        // ended at a missing child of `hygiene`, so compact status consumers
        // could discover the evidence but not its provenance in one read.
        sourceReceipt: {
          source: data.demandDraftsHygieneSource || 'unknown',
          ...(data.demandDraftsHygiene?.sourceReceipt || data.demandStatusSourceReceipt || {}),
          at: data.demandDraftsHygieneAt || null,
          ageSec: data.demandDraftsHygieneAgeSec ?? null,
          stale: data.demandDraftsHygieneStale ?? true,
          statusPath:
            data.demandDraftsHygieneStatusPath || data.demandStatusPath || null,
        },
      },
    },
    visible:
      data.statusJsonPath === STATUS_JSON &&
      data.orientApi === '/api/orient' &&
      data.demandDraftsHygiene != null,
    consistent: orientDemandDraftsHygieneConsistent,
    ready:
      data.statusJsonPath === STATUS_JSON &&
      data.orientApi === '/api/orient' &&
      data.demandDraftsHygieneReady === true &&
      orientDemandDraftsHygieneConsistent,
  };
  // Freshness: verify vs foot-core (false PASS prevention)
  try {
    // dynamic import-free: use sync helpers inlined via fs already available
    const footCore = path.join(ROOT, 'demigod-foot-core.js');
    const verifyPath = path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json');
    const boardPath = path.join(ROOT, 'DEMIGOD-BOARD-HONESTY.json');
    const smokePath = path.join(BUSY, 'agent-smoke.json');
    const gateFresh = (gateFile, sourceFile, maxAgeSec = null) => {
      const g = (() => {
        try {
          const st = fs.statSync(gateFile);
          return { mtimeMs: st.mtimeMs, ageSec: Math.round((Date.now() - st.mtimeMs) / 1000), missing: false };
        } catch {
          return { missing: true, mtimeMs: 0, ageSec: null };
        }
      })();
      const s = (() => {
        try {
          const st = fs.statSync(sourceFile);
          return { mtimeMs: st.mtimeMs, missing: false };
        } catch {
          return { missing: true, mtimeMs: 0 };
        }
      })();
      if (g.missing) return { fresh: false, reason: 'missing', label: 'missing' };
      if (!s.missing && g.mtimeMs + 2000 < s.mtimeMs) {
        return {
          fresh: false,
          reason: 'older-than-source',
          label: 'stale-vs-foot',
          lagSec: Math.round((s.mtimeMs - g.mtimeMs) / 1000),
        };
      }
      if (maxAgeSec != null && g.ageSec != null && g.ageSec > maxAgeSec) {
        return { fresh: false, reason: 'max-age', label: 'stale-age', ageSec: g.ageSec };
      }
      return { fresh: true, reason: 'ok', label: 'fresh', ageSec: g.ageSec };
    };
    data.freshness = {
      verifySource: gateFresh(verifyPath, footCore, 7200),
      boardHonesty: gateFresh(boardPath, path.join(ROOT, 'DEMIGOD-BOARD.json'), 86400),
      smoke: gateFresh(smokePath, footCore, 86400),
    };
    // If verify is stale, never imply green trust
    if (data.freshness.verifySource && !data.freshness.verifySource.fresh) {
      data.gates = {
        ...(data.gates || {}),
        verifySourceTrust: false,
        verifySourceFresh: false,
        verifySourceFreshness: data.freshness.verifySource,
      };
    } else if (data.gates) {
      data.gates.verifySourceTrust = data.gates.verifySourcePass === true;
      data.gates.verifySourceFresh = true;
    }
  } catch {
    data.freshness = {};
  }

  data.next = nextContract(data);
  // Canonical next already freeze-aware; still stamp freezeBlocks on any mutate
  if (data.freeze?.on && data.next?.mutate) {
    data.next = {
      ...data.next,
      freezeBlocks: true,
      title: data.next.title || 'Blocked by freeze',
      note: 'freeze ON — mutate blocked',
    };
  }
  data.staleGates = buildStaleGates(data.evidence || {});
  // Merge freshness into stale display
  for (const [k, f] of Object.entries(data.freshness || {})) {
    if (f && !f.fresh && !data.staleGates.some((s) => s.key === k)) {
      data.staleGates.push({
        key: k,
        reason: f.reason,
        ageSec: f.ageSec ?? f.lagSec ?? null,
        maxSec: null,
        label: f.label,
      });
    }
  }
  data.glance = buildGlance(data);
  const webflow = safeJson(path.join(BUSY, 'webflow-status.json'));
  data.webflow = webflow
    ? { ...webflow, doctor: safeJson(path.join(BUSY, 'webflow-doctor.json')) || webflow.doctor || null }
    : null;
  data.fullPass = safeJson(path.join(BUSY, 'full-pass-state.json')) || null;
  try {
    const { buildPriorityBoard } = await import('./demigod-priority-board.mjs');
    data.priorityBoard = buildPriorityBoard(data);
  } catch (e) {
    data.priorityBoard = { schema: 'demigod.priority-board/1', at: new Date().toISOString(), headline: { title: 'priority unavailable', detail: String(e.message || e) }, cards: [] };
  }
  data.sessionStory = buildSessionStory(data);
  data.handoffs = readHandoffs(12);
  data.jobsMeta = listJobsMeta();
  data.jobQueue = buildJobQueue();
  data.events = eventRing.slice(0, 20);
  // Ship readiness
  try {
    const { buildShipChecklist } = await import('./demigod-ship-checklist.mjs').catch(() => ({ buildShipChecklist: null }));
    if (typeof buildShipChecklist === 'function') {
      data.shipChecklist = buildShipChecklist();
    }
  } catch {
    data.shipChecklist = null;
  }
  // Submissions inbox (redacted snapshot)
  try {
    // Prefer busy cache; refresh if missing/stale (>5 min)
    let snap = safeJson(path.join(BUSY, 'submissions-inbox-latest.json'));
    const age = snap?.at ? Date.now() - Date.parse(snap.at) : Infinity;
    if (!snap || age > 5 * 60 * 1000) {
      run('node demigod-submissions-inbox.mjs --json', 12000);
      snap = safeJson(path.join(BUSY, 'submissions-inbox-latest.json'));
    }
    data.inbox = snap
      ? {
          at: snap.at,
          total: snap.summary?.total ?? snap.totalItems ?? 0,
          newCount: snap.newCount ?? 0,
          byKind: snap.summary?.byKind || snap.byKind || {},
          newestAt: snap.newestAt || null,
          newestAgeSec: snap.newestAgeSec ?? null,
          rows: (snap.rows || []).slice(0, 12),
          actions: snap.actions || {},
        }
      : { total: 0, newCount: 0, rows: [], error: 'no snapshot' };
  } catch (e) {
    data.inbox = { total: 0, newCount: 0, rows: [], error: String(e.message || e) };
  }
  // Match review queue — cache 60s (build can be heavy)
  try {
    const now = Date.now();
    if (matchCache.data && now - matchCache.at < MATCH_TTL_MS) {
      data.matches = matchCache.data;
      data.matchesCached = true;
    } else {
      const { buildQueue } = await import('./demigod-match-review.mjs');
      const msnap = buildQueue({ limit: 40 });
      try {
        fs.mkdirSync(BUSY, { recursive: true });
        fs.writeFileSync(path.join(BUSY, 'match-review-latest.json'), JSON.stringify(msnap) + '\n');
      } catch {
        /* */
      }
      data.matches = {
        at: msnap.at,
        summary: msnap.summary || {},
        pairs: (msnap.pairs || []).slice(0, 40),
        actions: msnap.actions || {},
      };
      matchCache = { at: now, data: data.matches };
    }
  } catch (e) {
    data.matches = { summary: { total: 0 }, pairs: [], error: String(e.message || e) };
  }
  // Roadmap sprint snapshot
  data.roadmap = {
    sprint: 'D',
    freezeOn: Boolean(data.freeze?.on),
    items: [
      { id: 'ship-checklist', title: 'Ship readiness checklist', done: Boolean(data.shipChecklist) },
      { id: 'doctor', title: 'Doctor CLI', done: true },
      { id: 'usertest', title: 'User-test harness', done: true },
      { id: 'inbox', title: 'Submissions inbox in Ops', done: Boolean(data.inbox && !data.inbox.error) },
      { id: 'intro-draft', title: 'Intro draft from sub-id', done: fs.existsSync(path.join(ROOT, 'demigod-intro-draft.mjs')) },
      { id: 'board-choke', title: 'Board writeBoard lock+audit', done: fs.existsSync(path.join(ROOT, 'DEMIGOD-BOARD-AUDIT.jsonl')) },
      { id: 'pairs', title: 'Canonical pair ledger', done: fs.existsSync(path.join(ROOT, 'demigod-pairs-lib.mjs')) },
      { id: 'match-queue', title: 'Match Review Queue', done: Boolean(data.matches && !data.matches.error) },
      { id: 'intro-gate', title: 'Intro lifecycle gate', done: true },
      { id: 'real-roles-env', title: 'allowRealRoles needs env gate', done: true },
      { id: 'match-consent-ui', title: 'Matches consent + intro POST', done: true },
      { id: 'lock-backoff', title: 'withFileLock Atomics backoff', done: true },
      { id: 'pairs-dual-write', title: 'matching-engine → pairs SoR', done: true },
      { id: 'job-history', title: 'Persisted job history', done: true },
      { id: 'events', title: 'Events ring /api/events', done: true },
      { id: 'sse', title: 'True SSE live push', done: true },
      { id: 'auto-propose', title: 'Auto-propose pairs from inbox', done: true },
      {
        id: 'collapse-legacy-matches',
        title: 'Pairs SoR (dg matches); pilot shortlist dual-writes',
        done: Boolean(data.matches?.summary?.realProposed != null),
      },
    ],
    doc: 'docs/exchange/DEMIGOD-BACKLOG-HUGE.md',
  };
  // Control plane — TTL cache (was ~1.3s every collect)
  try {
    const now = Date.now();
    if (controlCache.data && now - controlCache.at < CONTROL_TTL_MS) {
      data.control = controlCache.data;
      data.controlCached = true;
    } else {
      const { buildControlPlane } = await import('./demigod-control.mjs');
      try {
        writeJsonAtomic(STATUS_JSON, { ...data, control: undefined });
      } catch {
        /* */
      }
      const plane = await buildControlPlane();
      data.control = {
        at: plane.at,
        schema: plane.schema,
        version: plane.version,
        frozen: plane.frozen,
        freezeWhy: plane.freezeWhy,
        freezeAt: plane.freezeAt,
        freezeBy: plane.freezeBy,
        sessionMode: plane.sessionMode,
        health: plane.health,
        healthLabel: plane.healthLabel,
        demandStarved: plane.demandStarved || false,
        dms: plane.dms || null,
        board: plane.board,
        lock: plane.lock,
        assets: plane.assets,
        modules: plane.modules,
        moduleOrder: plane.moduleOrder,
        spine: (plane.spine || []).slice(0, 8),
        map: plane.map,
        kbd: plane.kbd,
        entrypoints: plane.entrypoints,
        nextCanon: plane.nextCanon || plane.next || null,
        truthEvidence: plane.truthEvidence || null,
      };
      controlCache = { at: now, data: data.control };
    }
  } catch (e) {
    const cp = safeJson(path.join(BUSY, 'control-plane.json'));
    data.control = cp
      ? {
          at: cp.at,
          frozen: cp.frozen,
          modules: cp.modules,
          spine: (cp.spine || []).slice(0, 6),
          health: cp.health,
          error: String(e.message || e),
        }
      : { error: String(e.message || e) };
  }
  data.links = {
    ...(data.links || {}),
    delta: `http://127.0.0.1:${PORT}/api/delta`,
    handoff: `http://127.0.0.1:${PORT}/api/handoff`,
    next: `http://127.0.0.1:${PORT}/api/next`,
    orient: `http://127.0.0.1:${PORT}/api/orient`,
    jobs: `http://127.0.0.1:${PORT}/api/jobs`,
    events: `http://127.0.0.1:${PORT}/api/events`,
    shipChecklist: `http://127.0.0.1:${PORT}/api/ship-checklist`,
    matches: `http://127.0.0.1:${PORT}/api/matches`,
    inbox: `http://127.0.0.1:${PORT}/api/inbox`,
    control: `http://127.0.0.1:${PORT}/api/control`,
    webflow: `http://127.0.0.1:${PORT}/api/webflow`,
    review: `http://127.0.0.1:${PORT}/api/review`,
  };
  data.pulseKey = [
    data.next?.id,
    data.next?.title,
    data.freeze?.on,
    data.live?.foot,
    data.live?.cdnId,
    data.gates?.verifySourcePass,
    data.gates?.verifySourceFresh,
    data.smoke?.pass,
    data.jobQueue?.running,
  ].join('|');
  return data;
}

async function executeJob(jobId, toolId) {
  const spec = JOBS[toolId];
  const rec = jobMap.get(jobId);
  if (!spec || !rec) {
    if (jobState.running === toolId) jobState.running = null;
    return;
  }
  rec.status = 'running';
  rec.startedAt = new Date().toISOString();
  // jobState.running already claimed in startJob
  const t0 = Date.now();
  try {
    // Defense-in-depth: re-check freeze at execute time (not only startJob)
    if (spec.mutate) {
      const freeze = safeJson(path.join(BUSY, 'publish-freeze.json'));
      if (freeze?.on) {
        throw new Error('mutate blocked at execute — publish-freeze ON: ' + (freeze.why || ''));
      }
    }
    const { stdout, stderr } = await execFileAsync(spec.cmd, spec.args, {
      cwd: ROOT,
      timeout: spec.timeout,
      maxBuffer: 4 * 1024 * 1024,
      env: process.env,
      // never pass shell — args array only (injection safe)
    });
    if (toolId === 'plan-inbox' && stdout && stdout.trim().startsWith('{')) {
      try {
        fs.mkdirSync(BUSY, { recursive: true });
        fs.writeFileSync(path.join(BUSY, 'plan-inbox-latest.json'), stdout.trim() + '\n');
      } catch {
        /* */
      }
    }
    statusCache = { at: 0, data: null };
    rec.status = 'done';
    rec.ok = true;
    pushEvent('job', `${toolId} done`, { jobId, ms: Date.now() - t0 });
    rec.ms = Date.now() - t0;
    rec.endedAt = new Date().toISOString();
    rec.stdout = (stdout || '').slice(0, 4000);
    rec.stderr = (stderr || '').slice(0, 1500);
    jobState.last = { ...rec };
    await persistDashboardJob(rec);
  } catch (e) {
    statusCache = { at: 0, data: null };
    rec.status = 'failed';
    rec.ok = false;
    rec.ms = Date.now() - t0;
    rec.endedAt = new Date().toISOString();
    rec.error = String(e.message || e).slice(0, 500);
    pushEvent('job', `${toolId} failed: ${rec.error.slice(0, 80)}`, { jobId });
    rec.stdout = (e.stdout || '').toString().slice(0, 2000);
    rec.stderr = (e.stderr || '').toString().slice(0, 1500);
    jobState.last = { ...rec };
    await persistDashboardJob(rec);
  } finally {
    if (jobState.running === toolId) jobState.running = null;
    if (spec?.mutate) {
      try {
        const lockPath = path.join(BUSY, 'mutate-job-lock.json');
        const cur = safeJson(lockPath);
        if (!cur || (rec.mutateLockToken && cur.token === rec.mutateLockToken)) {
          try {
            fs.unlinkSync(lockPath);
          } catch {
            /* */
          }
        }
      } catch {
        /* */
      }
    }
    // prune old jobs (keep newest 30)
    if (jobMap.size > 40) {
      const keys = [...jobMap.keys()];
      for (const k of keys.slice(0, keys.length - 30)) jobMap.delete(k);
    }
  }
}

async function persistDashboardJob(rec) {
  try {
    fs.mkdirSync(BUSY, { recursive: true });
    writeJsonAtomic(path.join(BUSY, 'dashboard-job-last.json'), rec);
  } catch {
    /* optional latest-job receipt */
  }
  try {
    const { saveJob } = await import('./demigod-job-store.mjs');
    saveJob(rec);
  } catch {
    /* optional durable job store */
  }
}

/** Start job async — returns immediately with jobId */
function startJob(toolId, { allowMutate = false } = {}) {
  const spec = JOBS[toolId];
  if (!spec) return { ok: false, error: 'unknown job: ' + toolId, allowed: Object.keys(JOBS) };
  // Refuse before acquiring a mutate lease. The old order leaked a 10-minute
  // mutate lock whenever any safe job already occupied the single job slot.
  if (jobState.running) {
    return {
      ok: false,
      error: 'job already running: ' + jobState.running,
      running: jobState.running,
      retryAfterSec: 3,
    };
  }
  if (spec.mutate && !allowMutate) {
    return {
      ok: false,
      error: 'mutate job blocked — pass allowMutate=1 and ensure freeze OFF',
      mutate: true,
      freezeHint: 'node demigod-publish-freeze.mjs status',
    };
  }
  let mutateLockToken = null;
  if (spec.mutate) {
    const freeze = safeJson(path.join(BUSY, 'publish-freeze.json'));
    if (freeze?.on) {
      return {
        ok: false,
        error: 'mutate job blocked — publish-freeze is ON',
        mutate: true,
        freezeOn: true,
        freezeWhy: freeze.why || null,
      };
    }
    // Cross-process mutate lock (survives concurrent agent CLIs)
    try {
      const lockPath = path.join(BUSY, 'mutate-job-lock.json');
      const cur = safeJson(lockPath);
      const curExpiryMs = cur?.expiresAt ? Date.parse(cur.expiresAt) : NaN;
      // Fail closed for corrupt/legacy leases. Silently overwriting a lock with
      // no usable expiry can permit two dashboard mutators to run concurrently.
      if (cur && (!Number.isFinite(curExpiryMs) || curExpiryMs > Date.now())) {
        return {
          ok: false,
          error: Number.isFinite(curExpiryMs)
            ? `mutate lock held by ${cur.owner || '?'} pid=${cur.pid || '?'}`
            : `mutate lock malformed — refusing overwrite (${cur.owner || '?'} pid=${cur.pid || '?'})`,
          lock: cur,
        };
      }
      fs.mkdirSync(BUSY, { recursive: true });
      mutateLockToken = crypto.randomUUID();
      // writeJsonAtomic (:77 in this file) instead of a bare writeFileSync. The mutate lock was the
      // one file here written non-atomically -- writeFileSync truncates then writes, so a concurrent
      // reader can land on the 0-byte window. Acquire reads it via safeJson, which returns null on any
      // parse error, and then tests `if (cur && ...)` -- so an empty read means "no lock held" and TWO
      // mutating jobs run at once. That is the opposite of the acquire path's stated policy ("Fail
      // closed for corrupt/legacy leases"), and it defeats the lock exactly when it is under load.
      // The helper was written for this race; its own comment describes it.
      writeJsonAtomic(lockPath, {
        owner: `dash:${toolId}`,
        pid: process.pid,
        at: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        token: mutateLockToken,
      });
    } catch (e) {
      return { ok: false, error: 'mutate lock failed: ' + String(e.message || e) };
    }
  }
  // Claim slot synchronously to prevent double-start race.
  const jobId = `j${Date.now().toString(36)}${(++jobSeq).toString(36)}`;
  jobState.running = toolId; // claim before setImmediate
  const rec = {
    jobId,
    id: toolId,
    status: 'queued',
    ok: null,
    safe: !!spec.safe,
    mutate: !!spec.mutate,
    mutateLockToken,
    at: new Date().toISOString(),
    startedAt: null,
    endedAt: null,
    ms: null,
  };
  jobMap.set(jobId, rec);
  // fire and forget
  setImmediate(() => executeJob(jobId, toolId));
  return {
    ok: true,
    jobId,
    id: toolId,
    status: 'queued',
    timeoutMs: spec.timeout,
    poll: `http://127.0.0.1:${PORT}/api/jobs/${jobId}`,
  };
}

/** Sync wait helper (legacy smoke?run=1) — prefer startJob */
async function runJob(id, opts = {}) {
  const started = startJob(id, opts);
  if (!started.ok || !started.jobId) return started;
  const deadline = Date.now() + (JOBS[id]?.timeout || 60000) + 5000;
  while (Date.now() < deadline) {
    const rec = jobMap.get(started.jobId);
    if (rec && (rec.status === 'done' || rec.status === 'failed')) return { ...rec, jobId: started.jobId };
    await new Promise((r) => setTimeout(r, 150));
  }
  return { ok: false, error: 'wait timeout', jobId: started.jobId, status: 'running' };
}

function readBody(req, max = 32_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on('data', (c) => {
      n += c.length;
      if (n > max) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

if (process.argv.includes('--snapshot')) {
  const data = await getStatus({ force: true });
  console.log(JSON.stringify({
    ok: true,
    statusJsonPath: data.statusJsonPath || STATUS_JSON,
    orientApi: data.orientApi || '/api/orient',
    // Snapshot mode is commonly consumed by cycle workers. Keep the canonical
    // attestation summary here so `ok: true` (snapshot creation succeeded)
    // cannot be mistaken for a fully verified tools cycle.
    cycleWork: data.cycleWork || null,
    cycleWorkHealth: data.cycleWorkHealth || null,
    cycleWorkAttested: data.cycleWorkHealth?.attested === true,
    cycleWorkDegraded: data.cycleWorkHealth?.degraded === true,
    cycleWorkVerification: data.cycleWorkHealth?.verification || null,
    demandDraftsHygiene: data.demandDraftsHygiene || null,
    demandDraftsHygieneReady: data.demandDraftsHygieneReady === true,
    orientDemandDraftsHygieneReady: data.orient?.demandDraftsHygieneReady === true,
    // Preserve the canonical /api/orient demand path in lightweight snapshots.
    // Cycle workers can inspect demand.drafts.hygiene without translating the
    // root compatibility aliases used by older dashboard consumers.
    demand: {
      drafts: {
        hygiene: data.demandDraftsHygiene || null,
        hygieneVerdict: data.draftHygieneVerdict || null,
      },
    },
    demandDraftsHygieneStatusPath:
      data.demandDraftsHygieneStatusPath || data.demandStatusPath || null,
    demandStatusPath: data.demandStatusPath || null,
    // Make the persisted receipt directly addressable from the lightweight
    // snapshot. A consumer can now read one path + pointer pair and inspect
    // the same fail-closed hygiene verdict served by /api/orient.
    statusJsonPathDemandDraftsHygieneJsonPointer: '/draftHygieneVerdict',
    draftHygieneVerdict: data.draftHygieneVerdict || null,
    draftHygieneVerdictReady: data.draftHygieneVerdict?.ready === true,
    statusDiscovery: data.statusDiscovery || null,
    // Preserve the persisted one-read proof in snapshot mode. Previously the
    // snapshot exposed discovery pointers and the compact view, but omitted
    // the receipt that says whether /api/orient + draft hygiene are both
    // present and consistent in dashboard-status.json.
    statusVisibility: data.statusVisibility || null,
    statusVisibilityComplete: data.statusVisibility?.complete === true,
    visibility: data.statusJsonContract?.visibility || null,
    // Keep the exact persisted-status view in the CLI snapshot. Cycle workers
    // can now verify /api/orient plus both hygiene projections from one read,
    // instead of reconstructing that contract from discovery pointers.
    statusJsonPathView: data.statusJsonPathView || null,
    statusJsonPathViewComplete: data.statusJsonPathView?.complete === true,
    // Snapshot consumers get the same compact, fail-closed orient + hygiene
    // receipt as readers of dashboard-status.json.
    agentOrientStatus: data.agentOrientStatus || null,
    agentOrientStatusReady: data.agentOrientStatus?.ready === true,
  }, null, 2));
  process.exit(0);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const noStore = { 'Cache-Control': 'no-store' };
  try {
    /* ==== SECTION: HTTP API routes (agent-first JSON) ==== */
    /* truth · unify · ledger · evidence · status · next · orient · events · presence · graph
     * jobs · ship-checklist · roadmap · inbox · matches · doctor · orca · control · webflow
     * review · delta · handoff · brief · actions · cockpit · smoke · tools · job/start · UI */
    if (url.pathname === '/api/truth') {
      try {
        const { refuseIfStale, loadLatest } = await import('./demigod-evidence.mjs');
        const truthFresh = refuseIfStale('truth');
        const reviewFresh = refuseIfStale('review');
        const body = {
          truth: truthFresh,
          review: reviewFresh,
          green: Boolean(truthFresh.green),
          note: 'green only if truth evidence pass+fresh',
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
      return;
    }
    if (url.pathname === '/api/unify') {
      try {
        const { buildUnify } = await import('./demigod-unify.mjs');
        const pretty = url.searchParams.get('pretty') === '1';
        const u = await buildUnify();
        // System → Hot tools is rendered from this payload (not /api/tools),
        // so apply the same server-owned executable allowlist here too.
        const toolsHot = Array.isArray(u?.toolsHot)
          ? annotateRunnableTools({ tools: u.toolsHot }).tools
          : [];
        jsonSend(res, 200, { ...u, toolsHot }, { pretty });
      } catch (e) {
        jsonSend(res, 500, { error: String(e.message || e) });
      }
      return;
    }
    if (url.pathname === '/api/ledger') {
      try {
        const { tail } = await import('./demigod-version-ledger.mjs');
        const n = Number(url.searchParams.get('n')) || 20;
        jsonSend(res, 200, { at: new Date().toISOString(), rows: tail(n) });
      } catch (e) {
        jsonSend(res, 500, { error: String(e.message || e) });
      }
      return;
    }
    if (url.pathname === '/api/evidence' || url.pathname === '/api/evidence/list') {
      try {
        const { listEvidence, refuseIfStale } = await import('./demigod-evidence.mjs');
        jsonSend(res, 200, {
          at: new Date().toISOString(),
          items: listEvidence({ limit: 30 }),
          truth: refuseIfStale('truth'),
          review: refuseIfStale('review'),
        });
      } catch (e) {
        jsonSend(res, 500, { error: String(e.message || e) });
      }
      return;
    }
    if (url.pathname === '/api/status' || url.pathname === '/api/status.json') {
      const force = url.searchParams.get('force') === '1';
      const pretty = url.searchParams.get('pretty') === '1';
      const slim = url.searchParams.get('slim') === '1';
      const data = await getStatus({ force });
      const payload = slim ? slimStatus(data) : data;
      jsonSend(res, 200, payload, { pretty });
      return;
    }
    if (url.pathname === '/api/next') {
      const pretty = url.searchParams.get('pretty') === '1';
      const data = await getStatus({});
      jsonSend(
        res,
        200,
        { at: data.at, next: data.next, glance: data.glance, sessionStory: data.sessionStory },
        { pretty },
      );
      return;
    }
    if (url.pathname === '/api/orient') {
      const pretty = url.searchParams.get('pretty') === '1';
      const noRefresh = url.searchParams.get('refresh') === '0';
      const args = ['demigod-orient.mjs', '--json'];
      if (noRefresh) args.push('--no-refresh');
      const r = spawnSync(process.execPath, args, {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 120000,
        env: process.env,
      });
      let body = null;
      try {
        body = JSON.parse((r.stdout || '').trim().split('\n').filter(Boolean).pop() || '{}');
      } catch {
        body = { ok: false, exit: r.status ?? 1, raw: (r.stdout || r.stderr || '').slice(0, 2000) };
      }
      if (r.error || !body || Object.keys(body).length === 0) {
        const orientPath = path.join(BUSY, 'orient.json');
        body = safeJson(orientPath) || body || {};
        body.cached = true;
        body.degraded = true;
        body.refreshError = r.error?.code || r.error?.message || null;
        // Receipt time is the evidence clock. File mtime can be refreshed by a
        // copy/restore and must not make a stale orientation card look recent.
        const cachedAtMs = Date.parse(body?.at || '');
        const cachedRawAgeMs = Date.now() - cachedAtMs;
        body.cacheAgeMs =
          Number.isFinite(cachedAtMs) && cachedRawAgeMs >= -60_000
            ? Math.max(0, cachedRawAgeMs)
            : null;
      }
      const demand = demandStatusSnapshot(safeJson(path.join(BUSY, 'demand-status.json')));
      // Rebind the canonical nested demand path to the same normalized
      // snapshot used by the aliases below. The orient subprocess (or cached
      // fallback) can carry an older demand receipt, which previously let
      // `/api/orient` expose fresh `demandDraftsHygiene` beside stale
      // `demand.drafts.hygiene` in one response.
      body.demand = {
        ...(body.demand && typeof body.demand === 'object' ? body.demand : {}),
        ...(demand && typeof demand === 'object' ? demand : {}),
        drafts: demand?.drafts || null,
      };
      body.drafts = demand?.drafts || null;
      body.demandDrafts = demand?.drafts || null;
      body.demandDraftsHygiene = demand?.drafts?.hygiene || null;
      body.demandDraftsHygieneVisible = body.demandDraftsHygiene != null;
      body.demandDraftsHygieneOk = body.demandDraftsHygiene?.ok ?? null;
      body.demandDraftsHygieneSource = demand?.drafts?.hygiene?.source || 'unknown';
      // Use the hygiene check's own evidence clock. The surrounding demand
      // snapshot may be refreshed without re-reading drafts, so demand.at can
      // otherwise make stale draft evidence appear current on /api/orient.
      body.demandDraftsHygieneAt = body.demandDraftsHygiene?.at || null;
      const demandDraftsHygieneAtMs = Date.parse(body.demandDraftsHygieneAt || '');
      const demandDraftsHygieneRawAgeSec = (Date.now() - demandDraftsHygieneAtMs) / 1000;
      body.demandDraftsHygieneClockSkewed =
        Number.isFinite(demandDraftsHygieneAtMs) && demandDraftsHygieneRawAgeSec < -60;
      body.demandDraftsHygieneAgeSec =
        Number.isFinite(demandDraftsHygieneAtMs) && !body.demandDraftsHygieneClockSkewed
          ? Math.max(0, Math.round(demandDraftsHygieneRawAgeSec))
          : null;
      body.demandDraftsHygieneStale =
        body.demandDraftsHygieneClockSkewed ||
        body.demandDraftsHygieneAgeSec == null ||
        body.demandDraftsHygieneAgeSec > 900;
      body.demandStatusPath = demand?.statusPath || path.join(BUSY, 'demand-status.json');
      body.demandDraftsHygieneStatusPath =
        body.demandDraftsHygiene?.statusPath || body.demandStatusPath;
      // Build this from the response-local demand snapshot. `data` belongs to
      // getStatus/enrichStatus and is not in scope in this route; consulting it
      // here made /api/orient throw after the subprocess had succeeded.
      body.draftHygieneVerdict = {
        schema: 'demigod.draft-hygiene-verdict/1',
        ready:
          body.demandDraftsHygieneOk === true &&
          body.demandDraftsHygieneStale === false,
        reason: body.demandDraftsHygiene == null
          ? 'missing'
          : body.demandDraftsHygieneClockSkewed
            ? 'clock-skewed'
            : body.demandDraftsHygieneStale
              ? 'stale'
              : body.demandDraftsHygieneOk === false
                ? 'flagged'
                : body.demandDraftsHygieneOk === true
                  ? 'clean'
                  : 'unknown',
        ok: body.demandDraftsHygieneOk,
        stale: body.demandDraftsHygieneStale,
        clockSkewed: body.demandDraftsHygieneClockSkewed,
        source: body.demandDraftsHygieneSource,
        at: body.demandDraftsHygieneAt,
        ageSec: body.demandDraftsHygieneAgeSec,
        statusPath: body.demandDraftsHygieneStatusPath,
        checked: body.demandDraftsHygiene?.checked ?? null,
        clean: body.demandDraftsHygiene?.clean ?? null,
        flagged: body.demandDraftsHygiene?.flagged ?? null,
      };
      body.statusJsonPath = STATUS_JSON;
      body.statusJsonPathVisible = true;
      body.orientApi = '/api/orient';
      body.orientUrl = `http://127.0.0.1:${PORT}/api/orient`;
      // Give /api/orient the same small discovery surface as the persisted
      // dashboard receipt. Callers can verify both the endpoint and hygiene
      // evidence directly, without unpacking statusJsonContract first.
      body.statusPathView = {
        schema: 'demigod.dashboard-status-path-view/1',
        path: STATUS_JSON,
        orientApi: body.orientApi,
        orientUrl: body.orientUrl,
        orientApiVisible: body.orientApi === '/api/orient',
        demandDraftsHygiene: body.demandDraftsHygiene,
        demandDraftsHygieneVisible: body.demandDraftsHygiene != null,
        demandDraftsHygieneOk: body.demandDraftsHygiene?.ok ?? null,
        demandDraftsHygieneStatusPath: body.demandDraftsHygieneStatusPath,
        complete:
          body.orientApi === '/api/orient' &&
          body.demandDraftsHygiene != null &&
          Boolean(body.demandDraftsHygieneStatusPath),
      };
      // Mirror the compact persisted-status contract here. An agent entering
      // through /api/orient can now discover the durable JSON receipt and the
      // exact demand hygiene evidence without first fetching /api/status.
      body.statusJsonContract = {
        schema: 'demigod.dashboard-status-contract/1',
        statusJsonPath: STATUS_JSON,
        statusJsonPathJsonPointer: '/statusJsonPath',
        orientApi: body.orientApi,
        orientApiJsonPointer: '/orientApi',
        orientUrl: body.orientUrl,
        orientDraftsHygieneJsonPointer: '/orient/drafts/hygiene',
        demandDraftsHygiene: body.demandDraftsHygiene,
        demandDraftsHygieneOk: body.demandDraftsHygiene?.ok ?? null,
        demandDraftsHygieneJsonPointer: '/demandDraftsHygiene',
        demandDraftsHygieneOkJsonPointer: '/demandDraftsHygieneOk',
        demandDraftsHygieneSource: body.demandDraftsHygieneSource,
        demandDraftsHygieneAt: body.demandDraftsHygieneAt,
        demandDraftsHygieneAgeSec: body.demandDraftsHygieneAgeSec,
        demandDraftsHygieneStale: body.demandDraftsHygieneStale,
        demandDraftsHygieneSourceJsonPointer: '/demandDraftsHygieneSource',
        demandDraftsHygieneStatusPath: body.demandDraftsHygieneStatusPath,
        demandDraftsHygieneStatusPathJsonPointer: '/demandDraftsHygieneStatusPath',
        demandStatusPath: body.demandStatusPath,
        demandStatusPathJsonPointer: '/demandStatusPath',
        statusPathView: {
          path: STATUS_JSON,
          orientApiJsonPointer: '/orientApi',
          demandDraftsHygieneJsonPointer: '/demandDraftsHygiene',
          demandDraftsHygieneSourceJsonPointer: '/demandDraftsHygieneSource',
          demandDraftsHygieneStatusPathJsonPointer: '/demandDraftsHygieneStatusPath',
          demandStatusPathJsonPointer: '/demandStatusPath',
        },
        visibility: {
          orientApi: true,
          orientCard: true,
          orientDemandDraftsHygiene: body.demandDraftsHygiene != null,
          demandDraftsHygiene: body.demandDraftsHygiene != null,
          consistent: body.demandDraftsHygiene != null,
          complete: body.demandDraftsHygiene != null,
        },
      };
      // Give /api/orient the same one-read visibility receipt persisted in
      // dashboard-status.json. This makes the endpoint and file contracts
      // directly comparable instead of asking clients to infer visibility
      // from a collection of nullable fields.
      body.statusVisibility = {
        schema: 'demigod.dashboard-status-visibility/1',
        statusJsonPath: STATUS_JSON,
        statusJsonPathVisible: body.statusJsonPath === STATUS_JSON,
        orientApi: body.orientApi,
        orientApiJsonPointer: '/orientApi',
        orientApiVisible: true,
        orientUrl: body.orientUrl,
        orientStatusJsonPath: STATUS_JSON,
        orientVisible: true,
        // This response is the orient object; keep both its response-local
        // pointer and the matching persisted dashboard-status.json pointer.
        orientJsonPointer: '',
        orientStatusJsonPointer: '/orient',
        orientDemandDraftsHygieneJsonPointer: '/demandDraftsHygiene',
        orientStatusDemandDraftsHygieneJsonPointer: '/orient/demandDraftsHygiene',
        statusJsonPointers: {
          statusJsonPath: '/statusJsonPath',
          orientApi: '/orientApi',
          orient: '/orient',
          orientDraftsHygiene: '/orient/drafts/hygiene',
          demandDraftsHygiene: '/demandDraftsHygiene',
          orientDemandDraftsHygiene: '/orient/demandDraftsHygiene',
          demandDraftsHygieneStatusPath: '/demandDraftsHygieneStatusPath',
          demandStatusPath: '/demandStatusPath',
        },
        orientDemandDraftsHygieneOkJsonPointer: '/demandDraftsHygieneOk',
        orientStatusDemandDraftsHygieneOkJsonPointer: '/orient/demandDraftsHygieneOk',
        orientDemandDraftsHygieneSourceJsonPointer: '/demandDraftsHygieneSource',
        orientStatusDemandDraftsHygieneSourceJsonPointer: '/orient/demandDraftsHygieneSource',
        orientDemandDraftsHygieneStatusPathJsonPointer: '/demandDraftsHygieneStatusPath',
        orientStatusDemandDraftsHygieneStatusPathJsonPointer:
          '/orient/demandDraftsHygieneStatusPath',
        demandDraftsHygiene: body.demandDraftsHygiene,
        demandDraftsHygieneJsonPointer: '/demandDraftsHygiene',
        demandDraftsHygieneVisible: body.demandDraftsHygiene != null,
        demandDraftsHygieneOk: body.demandDraftsHygieneOk,
        demandDraftsHygieneOkJsonPointer: '/demandDraftsHygieneOk',
        demandDraftsHygieneSource: body.demandDraftsHygieneSource,
        demandDraftsHygieneAt: body.demandDraftsHygieneAt,
        demandDraftsHygieneAgeSec: body.demandDraftsHygieneAgeSec,
        demandDraftsHygieneStale: body.demandDraftsHygieneStale,
        demandDraftsHygieneStatusPath: body.demandDraftsHygieneStatusPath,
        demandStatusPath: body.demandStatusPath,
        complete:
          body.statusJsonPath === STATUS_JSON &&
          body.orientApi === '/api/orient' &&
          body.demandDraftsHygiene != null,
      };
      body.statusDiscovery = {
        schema: 'demigod.dashboard-status-discovery/1',
        path: STATUS_JSON,
        statusJsonPath: STATUS_JSON,
        statusJsonPathJsonPointer: '/statusJsonPath',
        orientApi: '/api/orient',
        orientApiJsonPointer: '/orientApi',
        orientUrl: body.orientUrl,
        orientUrlJsonPointer: '/orientUrl',
        orientField: 'orient',
        orientJsonPointer: '/orient',
        orientStatusJsonPathJsonPointer: '/statusJsonPath',
        // /api/orient returns the orient card itself, so these pointers are
        // rooted in this response (the persisted dashboard status uses the
        // nested /orient/... pointers assembled by enrichStatus above).
        orientDemandDraftsHygieneJsonPointer: '/demandDraftsHygiene',
        orientDemandDraftsHygieneOkJsonPointer: '/demandDraftsHygieneOk',
        orientDemandDraftsHygieneSourceJsonPointer: '/demandDraftsHygiene/source',
        orientDemandDraftsHygieneExplicitSourceJsonPointer: '/demandDraftsHygieneSource',
        orientDemandDraftsHygieneStatusPathJsonPointer: '/demandDraftsHygieneStatusPath',
        orientDemandStatusPathJsonPointer: '/demandStatusPath',
        demandDraftsHygieneField: 'demandDraftsHygiene',
        demandDraftsHygieneJsonPointer: '/demandDraftsHygiene',
        demandDraftsHygieneOkJsonPointer: '/demandDraftsHygieneOk',
        demandDraftsHygieneSourceJsonPointer: '/demandDraftsHygieneSource',
        demandDraftsHygieneStatusPathJsonPointer: '/demandDraftsHygieneStatusPath',
        demandDraftsHygieneSource: body.demandDraftsHygieneSource,
        demandStatusPathJsonPointer: '/demandStatusPath',
      };
      // Match the compact view persisted in dashboard-status.json so callers
      // entering through /api/orient can discover the durable receipt and
      // inspect demand.drafts.hygiene without translating contracts.
      body.statusJsonPathView = {
        schema: 'demigod.dashboard-status-path-view/1',
        path: STATUS_JSON,
        statusJsonPath: STATUS_JSON,
        orientApi: '/api/orient',
        orientUrl: body.orientUrl,
        // Mirror the persisted locator so HTTP and file readers share one contract.
        orientEndpoint: {
          method: 'GET',
          path: '/api/orient',
          statusJsonPath: STATUS_JSON,
          demandDraftsHygieneJsonPointer: '/statusJsonPathView/demand/drafts/hygiene',
          demandDraftsHygieneVerdictJsonPointer:
            '/statusJsonPathView/demand/drafts/hygieneVerdict',
          demandDraftsHygieneSourceReceiptJsonPointer:
            '/statusJsonPathView/demand/drafts/sourceReceipt',
        },
        orientApiVisible: true,
        demand: {
          drafts: {
            hygiene: body.demandDraftsHygiene,
            // Match dashboard-status.json: raw evidence is not readiness when
            // the receipt is stale, clock-skewed, or explicitly flagged.
            hygieneVerdict: body.draftHygieneVerdict,
            sourceReceipt: body.demandDraftsHygiene?.sourceReceipt || null,
          },
        },
        orient: {
          api: '/api/orient',
          statusJsonPath: STATUS_JSON,
          drafts: {
            hygiene: body.demandDraftsHygiene,
            hygieneVerdict: body.draftHygieneVerdict,
            sourceReceipt: body.demandDraftsHygiene?.sourceReceipt || null,
          },
          demand: {
            drafts: {
              hygiene: body.demandDraftsHygiene,
              hygieneVerdict: body.draftHygieneVerdict,
              sourceReceipt: body.demandDraftsHygiene?.sourceReceipt || null,
            },
          },
        },
        demandDraftsHygieneJsonPointer: '/statusJsonPathView/demand/drafts/hygiene',
        demandDraftsHygieneVerdictJsonPointer:
          '/statusJsonPathView/demand/drafts/hygieneVerdict',
        demandDraftsHygieneReady: body.draftHygieneVerdict?.ready === true,
        orientDraftsHygieneJsonPointer:
          '/statusJsonPathView/orient/drafts/hygiene',
        orientDemandDraftsHygieneJsonPointer:
          '/statusJsonPathView/orient/demand/drafts/hygiene',
        demandDraftsHygieneSource: body.demandDraftsHygieneSource,
        demandDraftsHygieneStatusPath: body.demandDraftsHygieneStatusPath,
        complete:
          body.statusJsonPath === STATUS_JSON &&
          body.orientApi === '/api/orient' &&
          body.demandDraftsHygiene != null &&
          body.draftHygieneVerdict?.ready === true,
      };
      body.cli = 'bin/dg orient --json';
      body.httpAt = new Date().toISOString();
      // CLI exits 1 for a valid soft card and 2 for a valid NEXT mismatch.
      // Those are orientation states, not HTTP/server failures; clients must
      // inspect green/assertSame/exit without treating the endpoint as down.
      const orientAtMs = Date.parse(body?.at || '');
      const orientAgeMs = Date.now() - orientAtMs;
      const validOrientCard =
        body?.schema === 'demigod.orient/1' &&
        Number.isFinite(orientAtMs) &&
        orientAgeMs >= -60_000 &&
        (!body.cached || orientAgeMs <= 15 * 60_000);
      // Cached is provenance, not validity. An absent or malformed orient
      // receipt must not become a false-green because fallback stamped it.
      jsonSend(res, validOrientCard ? 200 : 503, body, { pretty });
      return;
    }
    if (url.pathname === '/api/events') {
      // SSE stream when Accept: text/event-stream or ?sse=1
      const wantSse =
        url.searchParams.get('sse') === '1' ||
        String(req.headers.accept || '').includes('text/event-stream');
      if (wantSse) {
        res.writeHead(200, {
          ...noStore,
          'Content-Type': 'text/event-stream; charset=utf-8',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        res.write(`event: hello\ndata: ${JSON.stringify({ at: new Date().toISOString(), n: eventRing.length })}\n\n`);
        res.write(`event: snapshot\ndata: ${JSON.stringify({ events: eventRing.slice(0, 20) })}\n\n`);
        let lastId = eventRing[0]?.id || null;
        let lastPulse = statusCache.data?.pulseKey || null;
        let lastJob = jobState.running || null;
        // Compare the complete freeze payload. The reason/evidence can change
        // while the on/off bit stays the same, and the dashboard should not
        // show that stale context until the next reconciliation poll.
        let lastFreezeKey = JSON.stringify(statusCache.data?.freeze || null);
        let lastHealthKey = JSON.stringify({
          truthEvidence: statusCache.data?.truthEvidence || null,
          cycleWork: statusCache.data?.cycleWork || null,
          cycleWorkHealth: statusCache.data?.cycleWorkHealth || null,
          live: statusCache.data?.live || null,
        });
        const tick = setInterval(async () => {
          try {
            if (res.writableEnded) {
              clearInterval(tick);
              return;
            }
            const head = eventRing[0];
            if (head && head.id !== lastId) {
              const batch = [];
              for (const e of eventRing) {
                if (e.id === lastId) break;
                batch.push(e);
              }
              lastId = head.id;
              for (const e of batch.reverse()) {
                res.write(`event: event\ndata: ${JSON.stringify(e)}\n\n`);
              }
            }
            // Lightweight status delta (no force collect — cache only)
            const d = statusCache.data;
            if (d) {
              const delta = {};
              if (d.pulseKey !== lastPulse) {
                delta.pulseKey = d.pulseKey;
                // Send the complete canonical contract. A partial NEXT payload
                // can otherwise inherit stale mutate/freeze metadata client-side
                // when the selected task changes between reconciliation polls.
                delta.next = d.next ? nextContract(d) : null;
                lastPulse = d.pulseKey;
              }
              const freezeKey = JSON.stringify(d.freeze || null);
              if (freezeKey !== lastFreezeKey) {
                delta.freeze = d.freeze;
                lastFreezeKey = freezeKey;
              }
              const jr = jobState.running || null;
              if (jr !== lastJob) {
                delta.jobRunning = jr;
                lastJob = jr;
              }
              const health = {
                truthEvidence: d.truthEvidence || null,
                cycleWork: d.cycleWork || null,
                cycleWorkHealth: d.cycleWorkHealth || null,
                live: d.live || null,
              };
              const healthKey = JSON.stringify(health);
              if (healthKey !== lastHealthKey) {
                delta.health = health;
                lastHealthKey = healthKey;
              }
              if (Object.keys(delta).length) {
                delta.at = new Date().toISOString();
                res.write(`event: delta\ndata: ${JSON.stringify(delta)}\n\n`);
              } else {
                res.write(`: ping ${Date.now()}\n\n`);
              }
            } else {
              res.write(`: ping ${Date.now()}\n\n`);
            }
          } catch {
            clearInterval(tick);
          }
        }, 2000);
        req.on('close', () => clearInterval(tick));
        return;
      }
      res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ at: new Date().toISOString(), events: eventRing.slice(0, 40) }));
      return;
    }
    if (url.pathname === '/api/presence') {
      // Multi-agent presence from recent handoffs + foot lock who
      const notes = readHandoffs(20);
      const maxAge = 4 * 3600;
      const now = Date.now();
      const agents = {};
      for (const n of notes) {
        const age = n.at ? Math.round((now - Date.parse(n.at)) / 1000) : null;
        if (age == null || age > maxAge) continue;
        const a = n.from || 'agent';
        if (!agents[a] || age < agents[a].ageSec) {
          agents[a] = { from: a, at: n.at, ageSec: age, text: String(n.text || '').slice(0, 120), current: true };
        }
      }
      let lockWho = null;
      try {
        const { getLockWho } = await import('./demigod-foot-lock.mjs');
        lockWho = getLockWho();
      } catch {
        /* */
      }
      jsonSend(res, 200, {
        at: new Date().toISOString(),
        agents: Object.values(agents),
        lock: lockWho || null,
        freezeOn: Boolean(statusCache.data?.freeze?.on),
        nextId: statusCache.data?.next?.id || null,
      });
      return;
    }
    if (url.pathname === '/api/graph') {
      // Module → job → evidence edges for System tab
      const nodes = [
        { id: 'truth', kind: 'tool' },
        { id: 'next', kind: 'tool' },
        { id: 'demand', kind: 'tool' },
        { id: 'ship', kind: 'tool' },
        { id: 'review', kind: 'tool' },
        { id: 'evidence-truth', kind: 'evidence' },
        { id: 'ledger', kind: 'artifact' },
        { id: 'unify', kind: 'tool' },
        { id: 'dash', kind: 'ui' },
      ];
      const edges = [
        { from: 'truth', to: 'evidence-truth' },
        { from: 'truth', to: 'ledger' },
        { from: 'truth', to: 'next' },
        { from: 'demand', to: 'next' },
        { from: 'next', to: 'unify' },
        { from: 'ship', to: 'unify' },
        { from: 'unify', to: 'dash' },
        { from: 'review', to: 'evidence-truth' },
      ];
      jsonSend(res, 200, { at: new Date().toISOString(), nodes, edges });
      return;
    }
    if (url.pathname === '/api/jobs-history' || url.pathname === '/api/jobs/history') {
      // Fast path — never full collectStatus
      jsonSend(res, 200, {
        at: new Date().toISOString(),
        running: jobState.running || null,
        recent: buildJobQueue().recent || [],
        meta: listJobsMeta(),
      });
      return;
    }
    if (url.pathname === '/api/ship-checklist') {
      try {
        const { buildShipChecklist } = await import('./demigod-ship-checklist.mjs');
        const c = buildShipChecklist();
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(c, null, 2));
      } catch (e) {
        res.writeHead(500, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
      return;
    }
    if (url.pathname === '/api/roadmap') {
      const data = await getStatus({});
      res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data.roadmap || {}, null, 2));
      return;
    }
    if (url.pathname === '/api/inbox') {
      const force = url.searchParams.get('refresh') === '1';
      if (force) {
        try {
          run('node demigod-submissions-inbox.mjs --json', 15000);
        } catch {
          /* */
        }
        statusCache = { at: 0, data: null };
      }
      const data = await getStatus({});
      const format = url.searchParams.get('format') || 'json';
      if (format === 'md') {
        const ib = data.inbox || {};
        const lines = [
          `# Submissions inbox`,
          `at: ${ib.at || data.at}`,
          `new: ${ib.newCount ?? 0} · total: ${ib.total ?? 0}`,
          '',
        ];
        for (const r of ib.rows || []) {
          lines.push(`- ${r.id} · ${r.kind} · ${r.status} · ${r.email || '—'} · ${r.headline || ''}`);
        }
        lines.push('', 'draft: node demigod-intro-draft.mjs <id>', 'refresh: curl -sS "http://127.0.0.1:9878/api/inbox?refresh=1"');
        res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
        res.end(lines.join('\n') + '\n');
      } else {
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data.inbox || {}, null, 2));
      }
      return;
    }
    if (url.pathname === '/api/matches' || url.pathname === '/api/match-review') {
      // POST review: { pairId, decision, note? }
      if (req.method === 'POST') {
        // Local-origin soft-guard (same pattern as mutate jobs) — curl has no Origin
        const origin = String(req.headers.origin || '');
        // Origin is authoritative when present; never let a local-looking
        // Referer override an explicitly non-local Origin.
        const local = localMutationRequest(req);
        if (!local) {
          res.writeHead(403, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'forbidden from origin ' + origin }));
          return;
        }
        try {
          const body = JSON.parse((await readBody(req)) || '{}');
          const pairId = body.pairId || body.id;
          const action = String(body.action || (body.decision ? 'review' : body.side ? 'consent' : 'review')).toLowerCase();
          const actor = body.actor || process.env.USER || 'dashboard';
          const { reviewPair, consentPair, getPair } = await import('./demigod-pairs-lib.mjs');

          if (action === 'intro' || action === 'intro-draft' || action === 'draft') {
            if (!pairId) throw new Error('pairId required');
            if (!/^[a-f0-9]{8,32}$/i.test(String(pairId))) throw new Error('pairId_invalid');
            const pair = getPair(pairId);
            if (!pair) throw new Error('pair_not_found');
            // Never accept force from HTTP body — gate stays honest
            let draft = null;
            try {
              const out = execFileSync(process.execPath, ['demigod-intro-draft.mjs', String(pairId), '--json'], {
                cwd: ROOT,
                encoding: 'utf8',
                timeout: 15000,
                stdio: ['ignore', 'pipe', 'pipe'],
                maxBuffer: 1 * 1024 * 1024,
              });
              draft = JSON.parse(out);
            } catch (e) {
              const raw = String(e.stderr || e.stdout || e.message || '');
              try {
                draft = JSON.parse(raw);
              } catch {
                draft = { ok: false, error: raw.slice(0, 400) };
              }
            }
            statusCache = { at: 0, data: null };
            pushEvent('intro-draft', `${pairId} draft ${draft?.ok ? 'ok' : 'fail'}`, { pairId });
            res.writeHead(draft?.ok ? 200 : 400, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: !!draft?.ok, pair, draft }, null, 2));
            return;
          }

          if (action === 'consent') {
            const side = body.side;
            const pair = consentPair(pairId, { side, actor });
            statusCache = { at: 0, data: null };
            pushEvent('match-consent', `${pairId} ${side} → ${pair.state}`, { pairId, side, state: pair.state });
            res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: true, pair }, null, 2));
            return;
          }

          // default: review
          const decision = body.decision;
          const note = body.note || '';
          const pair = reviewPair(pairId, {
            decision,
            note,
            actor,
          });
          try {
            run('node demigod-match-review.mjs --json', 12000);
          } catch {
            /* */
          }
          statusCache = { at: 0, data: null };
          pushEvent('match-review', `${pairId} → ${pair.state}`, { pairId, state: pair.state });
          res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true, pair }, null, 2));
        } catch (e) {
          res.writeHead(400, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
        }
        return;
      }
      const force = url.searchParams.get('refresh') === '1';
      const stateFilter = url.searchParams.get('state') || null;
      if (force) {
        try {
          const args = ['demigod-match-review.mjs', '--json'];
          if (stateFilter) args.push('--state', stateFilter);
          const r = spawnSync(process.execPath, args, {
            cwd: ROOT,
            encoding: 'utf8',
            timeout: 15000,
            env: process.env,
            maxBuffer: 4 * 1024 * 1024,
          });
          if (r.error) throw r.error;
          if (r.status !== 0) throw new Error((r.stderr || r.stdout || `match review exited ${r.status}`).trim());
        } catch {
          /* */
        }
        statusCache = { at: 0, data: null };
      }
      try {
        const { buildQueue } = await import('./demigod-match-review.mjs');
        const q = buildQueue({ state: stateFilter });
        fs.mkdirSync(BUSY, { recursive: true });
        fs.writeFileSync(path.join(BUSY, 'match-review-latest.json'), JSON.stringify(q, null, 2) + '\n');
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(q, null, 2));
      } catch (e) {
        const data = await getStatus({});
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data.matches || { error: String(e.message || e) }, null, 2));
      }
      return;
    }
    if (url.pathname === '/api/doctor') {
      try {
        run('node demigod-doctor.mjs --json', 20000);
        const doc = safeJson(path.join(BUSY, 'doctor.json'));
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(doc || { error: 'no doctor output' }, null, 2));
      } catch (e) {
        res.writeHead(500, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
      return;
    }
    if (url.pathname === '/api/orca') {
      try {
        const { spawnSync } = await import('child_process');
        const st = spawnSync('bash', ['-lc', 'node demigod-orca-bridge.mjs doctor'], {
          cwd: ROOT,
          encoding: 'utf8',
          timeout: 12000,
        });
        let doctor = null;
        try {
          doctor = JSON.parse(st.stdout || '{}');
        } catch {
          doctor = { raw: (st.stdout || '').slice(0, 500), stderr: (st.stderr || '').slice(0, 300) };
        }
        let runtime = null;
        const ost = spawnSync('orca-ide', ['status', '--json'], { encoding: 'utf8', timeout: 6000 });
        try {
          runtime = JSON.parse(ost.stdout || '{}')?.result || null;
        } catch {
          runtime = null;
        }
        let keepAwake = false;
        try {
          const pid = Number(fs.readFileSync(path.join(ROOT, '.keep-awake.pid'), 'utf8').trim());
          process.kill(pid, 0);
          keepAwake = true;
        } catch {
          keepAwake = false;
        }
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify(
            {
              at: new Date().toISOString(),
              keepAwake,
              runtime,
              doctor,
              cmds: {
                up: 'bin/dg-orca up',
                pair: 'bin/dg-orca pair',
                status: 'bin/dg-orca status',
                swarm: 'bin/dg-orca swarm',
              },
              pairPage: doctor?.lan ? `http://${doctor.lan}:8767/orca-pair.html` : null,
            },
            null,
            2,
          ),
        );
      } catch (e) {
        res.writeHead(500, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
      return;
    }

    if (url.pathname === '/api/priority' || url.pathname === '/api/priority-board') {
      try {
        const pretty = url.searchParams.get('pretty') === '1';
        const data = await getStatus({});
        const board = data.priorityBoard || (await import('./demigod-priority-board.mjs')).buildPriorityBoard(data);
        jsonSend(res, 200, board, { pretty });
      } catch (e) {
        jsonSend(res, 500, { error: String(e.message || e) });
      }
      return;
    }
    if (url.pathname === '/api/maps' || url.pathname === '/api/maps/index') {
      try {
        const maps = [
          {
            id: 'agents',
            title: 'Multi-agent coord (Claude · Codex · Grok)',
            path: 'docs/DEMIGOD-MULTI-AGENT-COORD-DIAGRAM.md',
            purpose: 'Lanes, spawn_wave, term-pump, Codex swarm, receipts, ship path',
          },
          {
            id: 'workflow',
            title: 'Total workflow & processes',
            path: 'docs/DEMIGOD-TOTAL-WORKFLOW-DIAGRAM.md',
            purpose: 'End-to-end ops + ship + demand + agents',
          },
          {
            id: 'website',
            title: 'Website architecture',
            path: 'docs/DEMIGOD-WEBSITE-ARCHITECTURE-DIAGRAM.md',
            purpose: 'Browser load, WIZ, board, CDN',
          },
          {
            id: 'resources',
            title: 'Resources & workflows map',
            path: 'docs/DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md',
            purpose: 'Control plane modules, CLI, tools catalog',
          },
        ].map((m) => {
          const abs = path.join(ROOT, m.path);
          let bytes = 0;
          let mtime = null;
          try {
            const st = fs.statSync(abs);
            bytes = st.size;
            mtime = st.mtime.toISOString();
          } catch {
            /* missing */
          }
          return { ...m, bytes, mtime, url: `/api/maps/${m.id}`, ok: bytes > 0 };
        });
        jsonSend(res, 200, { schema: 'demigod.maps-index/1', at: new Date().toISOString(), maps });
      } catch (e) {
        jsonSend(res, 500, { error: String(e.message || e) });
      }
      return;
    }
    {
      const mapMatch = url.pathname.match(/^\/api\/maps\/([a-z0-9-]+)$/i);
      if (mapMatch) {
        const id = mapMatch[1];
        const table = {
          agents: 'docs/DEMIGOD-MULTI-AGENT-COORD-DIAGRAM.md',
          workflow: 'docs/DEMIGOD-TOTAL-WORKFLOW-DIAGRAM.md',
          website: 'docs/DEMIGOD-WEBSITE-ARCHITECTURE-DIAGRAM.md',
          resources: 'docs/DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md',
        };
        const rel = table[id];
        if (!rel) {
          jsonSend(res, 404, { error: 'unknown map', id, allowed: Object.keys(table) });
          return;
        }
        try {
          const abs = path.join(ROOT, rel);
          const md = fs.readFileSync(abs, 'utf8');
          if (url.searchParams.get('format') === 'json') {
            jsonSend(res, 200, { id, path: rel, bytes: md.length, markdown: md });
          } else {
            res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
            res.end(md);
          }
        } catch (e) {
          jsonSend(res, 404, { error: String(e.message || e), id });
        }
        return;
      }
    }
    if (url.pathname === '/api/dogfood') {
      try {
        const pretty = url.searchParams.get('pretty') === '1';
        const { spawnSync } = await import('child_process');
        const r = spawnSync(process.execPath, ['demigod-tool-dogfood.mjs', 'status', '--json'], {
          cwd: ROOT,
          encoding: 'utf8',
          timeout: 15000,
        });
        let body = {};
        try {
          body = JSON.parse(r.stdout || '{}');
        } catch {
          body = { ok: false, raw: (r.stdout || r.stderr || '').slice(0, 500) };
        }
        jsonSend(res, r.status === 0 ? 200 : 500, body, { pretty });
      } catch (e) {
        jsonSend(res, 500, { error: String(e.message || e) });
      }
      return;
    }

    // Autonomy / ops OS spine
    if (url.pathname === '/api/ops-os' || url.pathname === '/api/autonomy') {
      try {
        const { spawnSync } = await import('child_process');
        spawnSync(process.execPath, [path.join(ROOT, 'demigod-ops-os.mjs'), 'status', '--json'], {
          cwd: ROOT,
          encoding: 'utf8',
          timeout: 20000,
        });
        const snap = safeJson(path.join(BUSY, 'ops-os.json')) || { error: 'no ops-os.json' };
        jsonSend(res, 200, snap, url.searchParams.get('pretty') === '1');
      } catch (e) {
        jsonSend(res, 500, { error: String(e.message || e) });
      }
      return;
    }

    // Multi-agent coordination board (Claude + Codex + Grok)
    if (url.pathname === '/api/coord' || url.pathname === '/api/agent-coord') {
      try {
        const pretty = url.searchParams.get('pretty') === '1';
        const forceCoord =
          url.searchParams.get('force') === '1' || url.searchParams.get('liveCss') === '1';
        const wantLiveCss =
          url.searchParams.get('liveCss') === '1' || process.env.DEMIGOD_COORD_LIVE_CSS === '1';
        const nowCoord = Date.now();
        if (!forceCoord && coordCache.data && nowCoord - coordCache.at < COORD_TTL_MS) {
          jsonSend(
            res,
            200,
            { ...coordCache.data, cached: true, cacheAgeMs: nowCoord - coordCache.at },
            { pretty },
          );
          return;
        }
        const coordDir = path.join(BUSY, 'coord');
        const board = safeJson(path.join(coordDir, 'board.json'));
        const withFreshness = (rec) => {
          if (!rec) return rec;
          if (!rec.at) return { ...rec, ageSec: null, clockSkewed: false, stale: true };
          const ageSec = Math.round((Date.now() - Date.parse(rec.at)) / 1000);
          const clockSkewed = Number.isFinite(ageSec) && ageSec < -60;
          return {
            ...rec,
            ageSec: Number.isFinite(ageSec) ? Math.max(0, ageSec) : null,
            clockSkewed,
            stale: !Number.isFinite(ageSec) || clockSkewed || ageSec > 3600,
          };
        };
        const claude = withFreshness(safeJson(path.join(coordDir, 'claude-last.json')));
        const codex = withFreshness(safeJson(path.join(coordDir, 'codex-last.json')));
        const grok = withFreshness(safeJson(path.join(coordDir, 'grok-last.json')));
        // Interactive tmux term-pump agents write term-*-last.json (separate from headless workers)
        const term = {
          claude: withFreshness(safeJson(path.join(coordDir, 'term-claude-last.json'))),
          grok: withFreshness(safeJson(path.join(coordDir, 'term-grok-last.json'))),
        };
        let inboxTail = [];
        try {
          const raw = fs.readFileSync(path.join(coordDir, 'inbox.jsonl'), 'utf8');
          inboxTail = raw
            .trim()
            .split('\n')
            .filter(Boolean)
            .slice(-12)
            .map((line) => {
              try {
                return JSON.parse(line);
              } catch {
                return { raw: line.slice(0, 200) };
              }
            });
        } catch {
          /* */
        }
        let pidAlive = false;
        try {
          const pid = parseInt(fs.readFileSync(path.join(coordDir, 'coord.pid'), 'utf8').trim(), 10);
          if (Number.isInteger(pid) && pid > 0) {
            process.kill(pid, 0);
            pidAlive = true;
          }
        } catch {
          pidAlive = false;
        }
        let heartbeatAgeSec = null;
        try {
          heartbeatAgeSec = Math.max(0, Math.round((Date.now() - fs.statSync(path.join(coordDir, 'coord.heartbeat')).mtimeMs) / 1000));
        } catch {
          /* A log write is activity, not proof that the supervisor loop is alive. */
        }
        const heartbeatFresh = heartbeatAgeSec !== null && heartbeatAgeSec < 120;
        const stopRequested = fs.existsSync(path.join(coordDir, 'STOP'));
        const pidUnobservable = !pidAlive && heartbeatFresh && !stopRequested;
        const supervisorDown = !pidAlive && !heartbeatFresh && !stopRequested;
        const workerGraceMs = { claude: 315000, codex: 255000, grok: 255000 };
        const workerStatus = (name) => {
          const pidFile = path.join(coordDir, `${name}.pid`);
          try {
            const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
            if (!Number.isInteger(pid) || pid <= 0) return 'idle';
            process.kill(pid, 0);
            return 'busy';
          } catch {
            try {
              return pidUnobservable && Date.now() - fs.statSync(pidFile).mtimeMs < workerGraceMs[name] ? 'pid-unobservable' : 'idle';
            } catch {
              return 'idle';
            }
          }
        };
        const coordWorkers = Object.fromEntries(
          ['claude', 'codex', 'grok'].map((name) => [name, workerStatus(name)]),
        );
        const effectiveBoard = board && {
          ...board,
          tracks: {
            ...(board.tracks || {}),
            ...Object.fromEntries(
              Object.entries(coordWorkers).map(([name, status]) => [
                name,
                { ...(board.tracks?.[name] || {}), persistedStatus: board.tracks?.[name]?.status || null, status: status === 'pid-unobservable' ? board.tracks?.[name]?.status || status : status },
              ]),
            ),
          },
        };
        const staleTracks = Object.keys(coordWorkers).filter(
          (name) => !pidUnobservable && board?.tracks?.[name]?.status !== coordWorkers[name],
        );
        const truth = safeJson(path.join(BUSY, 'truth.json'));
        const truthEvidence = refuseIfStale('truth');
        const webflowStatus = safeJson(path.join(BUSY, 'webflow-status.json'));
        const webflowDoctor = safeJson(path.join(BUSY, 'webflow-doctor.json'));
        const webflow = webflowStatus || webflowDoctor ? { ...(webflowStatus || {}), doctor: webflowDoctor || webflowStatus?.doctor || null } : null;
        const webflowAgeMs = webflow?.at ? Date.now() - Date.parse(webflow.at) : null;
        const webflowFresh = Number.isFinite(webflowAgeMs) && webflowAgeMs >= -60000 && webflowAgeMs <= 120000;
        const webflowDoctorAgeMs = webflow?.doctor?.at ? Date.now() - Date.parse(webflow.doctor.at) : null;
        const webflowDoctorFresh = Number.isFinite(webflowDoctorAgeMs) && webflowDoctorAgeMs >= -60000 && webflowDoctorAgeMs <= 120000;
        // ship-status.json is fresher for disk/live/stage than truth alone (agents dogfood this)
        const shipStatus = safeJson(path.join(BUSY, 'ship-status.json'));
        const shipAgeMs = shipStatus?.at ? Date.now() - Date.parse(shipStatus.at) : null;
        // Concurrent foot bumps leave ship-status.facts.diskVer lagging — overlay live disk marker
        // Also backfill live/man from truth when ship-status is partial (agents dogfood full triple)
        let shipFacts = shipStatus?.facts || null;
        try {
          const diskNow =
            (fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8').match(/__dgFootVer='(\d+)'/) ||
              [])[1] || null;
          const liveNow =
            truth?.live?.footVer != null
              ? String(truth.live.footVer).replace(/^v/, '')
              : truth?.foot?.liveVer != null
                ? String(truth.foot.liveVer).replace(/^v/, '')
                : null;
          const manNow =
            truth?.manifest?.version != null
              ? String(truth.manifest.version).replace(/^v/, '')
              : null;
          if (diskNow || liveNow || manNow) {
            const claimed = shipFacts?.diskVer != null ? String(shipFacts.diskVer).replace(/^v/, '') : null;
            const next = { ...(shipFacts || {}) };
            if (diskNow) {
              next.diskVer = diskNow;
              next.diskVerSource = claimed === diskNow ? 'ship-status' : 'disk-live';
            }
            // Prefer truth live/man when ship-status is missing, partial, or stale/mismatched
            // (post-ship dogfood often showed liveVer lagging real HTML pin)
            const shipLive = next.liveVer != null ? String(next.liveVer).replace(/^v/, '') : null;
            if (
              liveNow &&
              (shipLive == null || shipLive === '' || shipLive === '?' || shipLive !== liveNow)
            ) {
              next.liveVer = liveNow;
              next.liveVerSource = 'truth';
            }
            const shipMan = next.manVer != null ? String(next.manVer).replace(/^v/, '') : null;
            if (
              manNow &&
              (shipMan == null || shipMan === '' || shipMan === '?' || shipMan !== manNow)
            ) {
              next.manVer = manNow;
              next.manVerSource = 'truth';
            }
            const d = next.diskVer != null ? String(next.diskVer).replace(/^v/, '') : null;
            const l = next.liveVer != null ? String(next.liveVer).replace(/^v/, '') : null;
            const m = next.manVer != null ? String(next.manVer).replace(/^v/, '') : null;
            if (d && l && m) {
              next.diskMatchesManifest = d === m;
              next.diskMatchesLive = d === l;
            }
            shipFacts = next;
          }
        } catch {
          /* keep ship-status facts */
        }
        const ship = {
          pass: truthEvidence?.green ?? false,
          artifactPass: truth?.pass ?? null,
          evidence: truthEvidence,
          summaryLine: truth?.summaryLine || shipStatus?.nextAction || null,
          primaryBlocker: truth?.release?.primaryBlocker || truthEvidence?.reason || null,
          recoveryCommand:
            truth?.release?.recovery?.command || shipStatus?.nextCmd || null,
          at: truth?.at || shipStatus?.at || null,
          stage: shipStatus?.stage || null,
          nextCmd: shipStatus?.nextCmd || null,
          nextAction: shipStatus?.nextAction || null,
          facts: shipFacts,
          shipped: shipStatus?.shipped ?? null,
          shipStatusAgeMs: Number.isFinite(shipAgeMs) ? shipAgeMs : null,
          shipStatusFresh: Number.isFinite(shipAgeMs) && shipAgeMs >= -60000 && shipAgeMs <= 300000,
        };
        // Never advertise "all green" when disk foot ver ≠ live (stale ship-status / race)
        try {
          const d = shipFacts?.diskVer != null ? String(shipFacts.diskVer).replace(/^v/, '') : null;
          const l = shipFacts?.liveVer != null ? String(shipFacts.liveVer).replace(/^v/, '') : null;
          const lag = d && l && d !== l;
          const liesGreen = /all green|no ship needed|fully shipped/i.test(
            String(ship.nextCmd || '') + ' ' + String(ship.nextAction || ''),
          );
          if (lag && (liesGreen || ship.shipped === true)) {
            ship.shipped = false;
            ship.pass = false;
            ship.stage = ship.stage && ship.stage !== 'cdn_body_matches_disk' ? ship.stage : 'live_matches_disk_ver';
            ship.nextAction = `live v${l} disk v${d}`;
            ship.nextCmd =
              'node demigod-cm6-paste-publish.mjs  # live foot ver lags disk; paste footer after CDN';
            ship.recoveryCommand = ship.nextCmd;
            ship.nextCmdSource = 'coord-honesty';
          }
        } catch {
          /* */
        }
        // Paste readiness (agents dogfood without re-running webflow doctor)
        try {
          const roles = webflow?.tabs?.byRole || {};
          const freezeOn = shipFacts?.freezeOn === true;
          let pasteBlockedBy = null;
          if (freezeOn) pasteBlockedBy = 'freeze';
          else if ((roles['webflow-login'] || 0) > 0) pasteBlockedBy = 'webflow-login';
          else if (!(roles['custom-code'] > 0)) pasteBlockedBy = 'no-custom-code-tab';
          const needsPaste =
            shipFacts?.diskMatchesLive === false ||
            /paste|cm6-paste|live_matches/i.test(String(ship.stage || '') + String(ship.nextCmd || ''));
          ship.pasteReady = needsPaste && !pasteBlockedBy;
          ship.pasteBlockedBy = needsPaste ? pasteBlockedBy : null;
          ship.pasteHint =
            pasteBlockedBy === 'webflow-login'
              ? 'Re-auth site-owner Webflow in CDP (not empty Google account); custom-code must not be 404, then bin/dg-webflow open custom-code'
              : pasteBlockedBy === 'no-custom-code-tab'
                ? 'bin/dg-webflow open custom-code (authenticated session)'
                : pasteBlockedBy === 'freeze'
                  ? 'node demigod-publish-freeze.mjs off'
                  : needsPaste
                    ? 'bin/dg ship paste  # with foot lock'
                    : null;
        } catch {
          /* */
        }
        // loop-state gate snapshot (keep-going.md vs disk foot) — no shell-out
        let loopState = { ok: null, claimed: null, disk: null };
        try {
          const kg = fs.readFileSync(path.join(ROOT, 'demigod-keep-going.md'), 'utf8');
          const block = (kg.split(/^## loop-state.*$/m)[1] || '').split(/^\*\*/m)[0];
          const claimedRaw = (block.match(/- foot_ver_disk:\s*(\S+)/) || [])[1] || '';
          const claimed = claimedRaw.replace(/^v/, '') || null;
          const disk =
            (fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8').match(/__dgFootVer='(\d+)'/) ||
              [])[1] || null;
          loopState = {
            ok: !!(claimed && disk && claimed === disk),
            claimed: claimed ? `v${claimed}` : null,
            disk: disk ? `v${disk}` : null,
          };
        } catch (e) {
          loopState = { ok: false, claimed: null, disk: null, error: String(e.message || e).slice(0, 120) };
        }
        // Blog SoR readiness (demigod-blog-posts.json) — agents dogfood without shelling out
        let blog = { ok: false, posts: 0, published: 0, allHaveImageAlt: false, allHaveBody: false };
        try {
          const blogJson = safeJson(path.join(ROOT, 'demigod-blog-posts.json'));
          const posts = Array.isArray(blogJson?.posts) ? blogJson.posts : [];
          const published = posts.filter((p) => p && p.published !== false);
          const allHaveImageAlt = posts.length > 0 && posts.every((p) => String(p?.imageAlt || '').trim());
          const allHaveBody = posts.length > 0 && posts.every((p) => String(p?.body || '').trim().length >= 40);
          const allHaveSummary = posts.length > 0 && posts.every((p) => String(p?.summary || '').trim());
          blog = {
            // fail closed: empty/thin SoR must not look green to agents
            ok: posts.length > 0 && published.length > 0 && allHaveImageAlt && allHaveBody && allHaveSummary,
            posts: posts.length,
            published: published.length,
            allHaveImageAlt,
            allHaveBody,
            allHaveSummary,
            at: blogJson?.at || null,
          };
        } catch (e) {
          blog = { ok: false, posts: 0, published: 0, error: String(e.message || e).slice(0, 120) };
        }
        // Head + footer-lite + foot Notes disk readiness (ship prep without shelling out)
        let head = { ok: false, shipReady: false };
        try {
          const h = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
          const hasCanonical = /rel=["']canonical["']/.test(h);
          const hasOgSiteName = /property=["']og:site_name["']/.test(h);
          const hasOgUrl = /property=["']og:url["']/.test(h);
          const hasOgImageAlt = /property=["']og:image:alt["']/.test(h);
          const hasTwitterUrl = /name=["']twitter:url["']/.test(h);
          const hasTwitterCard = /name=["']twitter:card["']/.test(h);
          const hasRobots = /name=["']robots["']/.test(h);
          const hasColorScheme = /name=["']color-scheme["']/.test(h);
          const cssUrl = (h.match(/<link[^>]+href=["'](https:\/\/files\.catbox\.moe\/[^"']+\.css)["']/i) || [])[1] || null;
          const diskCss = fs.readFileSync(path.join(ROOT, 'demigod-head-styles.css'));
          const diskCssSha = crypto.createHash('sha256').update(diskCss).digest('hex');
          let cssFresh = false;
          let cssFreshSource = null;
          // Receipt first (no network) — live catbox fetch only when ?liveCss=1 or DEMIGOD_COORD_LIVE_CSS=1
          {
            const rec = safeJson(path.join(BUSY, 'head-css-cdn.json'));
            const ageMs = rec?.at ? Date.now() - Date.parse(rec.at) : Infinity;
            const recFresh =
              rec?.match === true &&
              Number.isFinite(ageMs) &&
              ageMs >= -60000 &&
              ageMs <= 30 * 60 * 1000 &&
              (!rec.href || !cssUrl || rec.href === cssUrl) &&
              (!rec.diskMd5 ||
                rec.diskMd5 === crypto.createHash('md5').update(diskCss).digest('hex'));
            if (recFresh) {
              cssFresh = true;
              cssFreshSource = 'head-css-cdn.json';
            } else if (rec && rec.match === false && Number.isFinite(ageMs) && ageMs <= 30 * 60 * 1000) {
              cssFresh = false;
              cssFreshSource = 'head-css-cdn.json';
            }
          }
          if (!cssFresh && wantLiveCss && cssUrl) {
            try {
              const liveCss = Buffer.from(
                await (await fetch(cssUrl, { signal: AbortSignal.timeout(2500) })).arrayBuffer(),
              );
              cssFresh =
                crypto.createHash('sha256').update(liveCss).digest('hex') === diskCssSha;
              if (cssFresh) cssFreshSource = 'live-fetch';
            } catch {
              /* catbox flaky — keep receipt result */
            }
          }
          const metaReady =
            hasCanonical &&
            hasOgSiteName &&
            hasOgUrl &&
            hasOgImageAlt &&
            hasTwitterUrl &&
            hasTwitterCard &&
            hasRobots &&
            hasColorScheme;
          head = {
            ok: true,
            hasCanonical,
            hasOgSiteName,
            hasOgUrl,
            hasOgImageAlt,
            hasTwitterUrl,
            hasTwitterCard,
            hasRobots,
            hasColorScheme,
            cssUrl,
            cssFresh,
            cssFreshSource,
            metaReady,
            // shipReady still requires CSS CDN match; agents distinguish via metaReady/cssFresh
            shipReady: metaReady && cssFresh,
          };
        } catch (e) {
          head = { ok: false, shipReady: false, metaReady: false, error: String(e.message || e).slice(0, 120) };
        }
        let footerLite = { ok: false };
        try {
          const f = fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8');
          const ver = (f.match(/cdn-loader\s+v(\d+)/i) || f.match(/\bv(\d+)\b/) || [])[1] || null;
          // Accept exact or nested path redirects: /(blog|notes)(/|$) and /method(/|$)
          // Also v28 \/ ?$ form: /^\/(blog|notes)\/?$/i and /^\/method\/?$/i
          const hasBlogRedirect = /\/\(blog\|notes\)/.test(f) || /blog\|notes/.test(f);
          const hasMethodRedirect = /\/method/.test(f) || /p=method/.test(f);
          const hasNestedPathRedirects =
            /\/\(blog\|notes\)\(\\\/\|\$\)/.test(f) ||
            /\/method\(\\\/\|\$\)/.test(f) ||
            /\/\(blog\|notes\)\\\/\?\$/.test(f) ||
            /\/method\\\/\?\$/.test(f);
          // /blog|notes/{slug} → /?p=blog#note-{slug} (deep-link preserve)
          const hasNoteSlugRedirect = /#note-/.test(f) && /blog\|notes/.test(f);
          // c228/v505: /sample → ?p=sample (pairs with core DG_PAGES.sample + verify footer:sample-path)
          const hasSamplePath = /\\\/sample/.test(f) && /p=sample/.test(f);
          // c309/v507: /pilot → ?p=pilot (pairs with DG_PAGES.pilot + legal nav + verify footer:pilot-path)
          const hasPilotPath = /\\\/pilot/.test(f) && /p=pilot/.test(f);
          footerLite = {
            ok: true,
            ver: ver ? `v${ver}` : null,
            hasBlogRedirect,
            hasMethodRedirect,
            hasNestedPathRedirects,
            hasNoteSlugRedirect,
            hasSamplePath,
            hasPilotPath,
            shipReady:
              hasBlogRedirect &&
              hasMethodRedirect &&
              hasNestedPathRedirects &&
              hasNoteSlugRedirect &&
              hasSamplePath &&
              hasPilotPath,
          };
        } catch (e) {
          footerLite = { ok: false, error: String(e.message || e).slice(0, 120) };
        }
        // Foot Notes cards vs blog SoR (static HTML ship path; dogfood without shell)
        let footNotes = { ok: false, shipReady: false };
        try {
          const core = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
          const blogJson = safeJson(path.join(ROOT, 'demigod-blog-posts.json'));
          const posts = (Array.isArray(blogJson?.posts) ? blogJson.posts : []).filter(
            (p) => p && p.published !== false,
          );
          let matched = 0;
          let anchors = 0;
          const gaps = [];
          for (const p of posts) {
            const slug = String(p.slug || '').trim();
            const okTitle = !!(p.title && core.includes(p.title));
            const okSummary = !!(p.summary && core.includes(p.summary));
            const okAlt = !p.imageAlt || core.includes(p.imageAlt);
            const okBody = !p.body || core.includes(String(p.body).slice(0, 48));
            const okAnchor = !!(slug && core.includes(`id="note-${slug}"`));
            if (okAnchor) anchors += 1;
            if (okTitle && okSummary && okAlt && okBody && okAnchor) matched += 1;
            else gaps.push(slug || '?');
          }
          const moreCount = (core.match(/class="dg-blog-more"/g) || []).length;
          const hasDetails = moreCount >= posts.length && posts.length > 0;
          const hasDeepLink = core.includes('Deep-link Notes cards');
          const hasReducedMotionScroll = /prefers-reduced-motion: reduce/.test(core) && /scrollIntoView/.test(core);
          const labeledSummaries = (core.match(/<summary>Full note · /g) || []).length;
          const hasLabeledSummaries = labeledSummaries >= posts.length && posts.length > 0;
          const hasNoteTitle = core.includes(' · Notes · Demigod');
          const hasNoteHashChange =
            /hashchange/.test(core) && core.includes('focusBlogNoteFromHash');
          footNotes = {
            ok: true,
            posts: posts.length,
            matched,
            anchors,
            moreCount,
            hasDetails,
            hasDeepLink,
            hasReducedMotionScroll,
            labeledSummaries,
            hasLabeledSummaries,
            hasNoteTitle,
            hasNoteHashChange,
            gaps: gaps.slice(0, 5),
            shipReady:
              posts.length > 0 &&
              matched === posts.length &&
              hasDetails &&
              anchors === posts.length &&
              hasDeepLink &&
              hasLabeledSummaries &&
              hasNoteTitle &&
              hasNoteHashChange &&
              hasReducedMotionScroll,
          };
        } catch (e) {
          footNotes = { ok: false, shipReady: false, error: String(e.message || e).slice(0, 120) };
        }
        // Foot version markers — thrash leaves splits mid-edit
        let footMarkers = { ok: false, agree: false };
        try {
          const core = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
          const banner = (core.match(/dg-foot-v(\d+)-core/) || [])[1] || null;
          const internal = (core.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] || null;
          const publicV = (core.match(/dgFootVersion\s*=\s*['"]v?(\d+)/) || [])[1] || null;
          const booted = (core.match(/foot v(\d+)-core loaded/) || [])[1] || null;
          const agree = !!(banner && internal && publicV && booted && new Set([banner, internal, publicV, booted]).size === 1);
          footMarkers = {
            ok: true,
            agree,
            banner: banner ? `v${banner}` : null,
            internal: internal ? `v${internal}` : null,
            public: publicV ? `v${publicV}` : null,
            booted: booted ? `v${booted}` : null,
          };
        } catch (e) {
          footMarkers = { ok: false, agree: false, error: String(e.message || e).slice(0, 80) };
        }
        // One fail-closed disk-prep signal for agents (no CDN/ship — paste readiness only)
        const diskReadyBlockers = [];
        if (!loopState?.ok) diskReadyBlockers.push('loopState');
        if (!footMarkers?.agree) diskReadyBlockers.push('foot.markers');
        if (!blog?.ok) diskReadyBlockers.push('blog');
        // Prefer precise head blockers (CSS CDN lag ≠ missing og/meta)
        if (head?.ok === false) diskReadyBlockers.push('head');
        else if (head?.metaReady === false) diskReadyBlockers.push('head.meta');
        else if (head?.cssFresh === false) diskReadyBlockers.push('head.css');
        else if (head?.shipReady === false) diskReadyBlockers.push('head');
        if (!footerLite?.shipReady) diskReadyBlockers.push('footerLite');
        if (!footNotes?.shipReady) diskReadyBlockers.push('footNotes');
        // onlyCssLag must not fire when foot CDN also drifts (agents would skip needed foot ship)
        const footSealed =
          ship?.pass === true ||
          (ship?.facts?.diskMatchesManifest === true &&
            ship?.facts?.diskVer != null &&
            String(ship.facts.diskVer).replace(/^v/, '') ===
              String(ship.facts.liveVer ?? '').replace(/^v/, '') &&
            String(ship.facts.diskVer).replace(/^v/, '') ===
              String(ship.facts.manVer ?? '').replace(/^v/, ''));
        const onlyHeadCss =
          diskReadyBlockers.length === 1 && diskReadyBlockers[0] === 'head.css';
        const onlyCssLag = onlyHeadCss && footSealed === true;
        const dVer =
          ship?.facts?.diskVer != null ? String(ship.facts.diskVer).replace(/^v/, '') : null;
        const lVer =
          ship?.facts?.liveVer != null ? String(ship.facts.liveVer).replace(/^v/, '') : null;
        const mVer =
          ship?.facts?.manVer != null ? String(ship.facts.manVer).replace(/^v/, '') : null;
        let diskReadyNote = null;
        if (onlyCssLag) {
          diskReadyNote =
            'foot sealed + metaReady; re-publish head CSS via demigod-head-css-publish (intentional, not thrash)';
        } else if (onlyHeadCss && !footSealed) {
          if (dVer && mVer && dVer !== mVer) {
            diskReadyNote = `disk v${dVer}≠man v${mVer} — bin/dg ship cdn then paste; then head CSS`;
          } else if (dVer && lVer && dVer !== lVer) {
            diskReadyNote = `live v${lVer} lags disk v${dVer} — CM6 paste (custom-code auth); then head CSS`;
          } else {
            diskReadyNote = 'head.css lag AND foot not sealed — ship foot then CSS';
          }
        } else if (diskReadyBlockers.includes('foot.markers')) {
          diskReadyNote = 'foot version markers disagree (banner/internal/public/booted) — finish foot bump under lock';
        }
        const diskReady = {
          ok: diskReadyBlockers.length === 0,
          blockers: diskReadyBlockers,
          footSealed: footSealed === true,
          onlyCssLag,
          note: diskReadyNote,
        };
        // Lanes + shared digest (anti-thrash multi-agent contract)
        const lanes = {
          claude: 'website',
          codex: 'tools',
          grok: 'gates',
          rules:
            'claude=foot/head/blog via dg-lock; codex=dash/tools only (no foot-core); grok=verify+coord (website SoR only by explicit board assignment)',
        };
        let claims = safeJson(path.join(coordDir, 'claims.json'));
        // Drop stale holds independently; legacy strings fall back to claims.at.
        try {
          if (claims && typeof claims === 'object') {
            const holds = claims.holds && typeof claims.holds === 'object' ? { ...claims.holds } : {};
            const staleKeys = Object.entries(holds)
              .filter(([, hold]) => {
                const age = Date.now() - Date.parse(hold?.at || claims.at);
                return !Number.isFinite(age) || age < -60_000 || age > 15 * 60_000;
              })
              .map(([key]) => key);
            const activeHolds = Object.fromEntries(Object.entries(holds).filter(([key]) => !staleKeys.includes(key)));
            if (staleKeys.length) {
              claims = {
                ...claims,
                holds: activeHolds,
                holdsCleared: staleKeys,
                holdsStale: true,
                active: Object.keys(activeHolds).length > 0,
                activeHoldCount: Object.keys(activeHolds).length,
              };
            } else {
              claims = {
                ...claims,
                holds,
                holdsStale: false,
                // Non-active claims must never be treated as ship-ready evidence
                active: Object.keys(holds).length > 0,
                activeHoldCount: Object.keys(holds).length,
              };
            }
          }
        } catch {
          /* keep raw claims */
        }
        let digest = null;
        try {
          const digPath = path.join(coordDir, 'digest.md');
          const st = fs.statSync(digPath);
          const ageSec = Math.round((Date.now() - st.mtimeMs) / 1000);
          const clockSkewed = ageSec < -60;
          const text = fs.readFileSync(digPath, 'utf8');
          digest = {
            ageSec: Math.max(0, ageSec),
            clockSkewed,
            stale: clockSkewed || ageSec > 600,
            lines: text.split('\n').length,
            preview: text.slice(0, 600),
          };
        } catch {
          digest = { ageSec: null, clockSkewed: false, stale: true, lines: 0, preview: '' };
        }
        const chat = withFreshness(safeJson(path.join(coordDir, 'chat-last.json')));
        // Periodic Codex swarm assist (bin/dg-codex-swarm + demigod-codex-swarm.timer)
        const swarmLast = withFreshness(safeJson(path.join(BUSY, 'swarm', 'swarm-last.json')));
        let swarmLatestAgeSec = null;
        let swarmLatestClockSkewed = false;
        try {
          const st = fs.statSync(path.join(BUSY, 'swarm', 'latest.md'));
          const ageSec = Math.round((Date.now() - st.mtimeMs) / 1000);
          swarmLatestClockSkewed = ageSec < -60;
          swarmLatestAgeSec = Math.max(0, ageSec);
        } catch {
          /* */
        }
        const swarm = {
          last: swarmLast,
          latestAgeSec: swarmLatestAgeSec,
          clockSkewed: swarmLatestClockSkewed,
          stale: swarmLatestClockSkewed || swarmLatestAgeSec == null || swarmLatestAgeSec > 20 * 60,
          dir: path.join(BUSY, 'swarm'),
          cmd: 'bin/dg-codex-swarm once',
        };
        // Human-readable multi-agent work summary (Home panel; refresh via /api/coord poll)
        const workLogAgent = (id, label, rec, workerStatus) => {
          const did = Array.isArray(rec?.did)
            ? rec.did.map((d) => String(d).trim()).filter(Boolean).slice(0, 6)
            : rec?.did
              ? [String(rec.did).trim()].filter(Boolean)
              : [];
          const next = rec?.next != null ? String(rec.next).trim().slice(0, 280) : null;
          const headline = did[0] || next || rec?.focus || rec?.note || '(no recent did[])';
          return {
            id,
            label,
            lane: rec?.lane || lanes[id] || null,
            status: workerStatus || (rec?.stale ? 'stale' : rec ? 'idle' : 'missing'),
            ok: rec?.ok ?? null,
            cycle: rec?.cycle ?? null,
            at: rec?.at || null,
            ageSec: rec?.ageSec ?? null,
            stale: !!rec?.stale,
            clockSkewed: !!rec?.clockSkewed,
            headline: String(headline).slice(0, 220),
            did,
            next,
            files: Array.isArray(rec?.files) ? rec.files.slice(0, 8) : [],
          };
        };
        const workAgents = [
          workLogAgent('claude', 'Claude', claude, coordWorkers.claude),
          workLogAgent('codex', 'Codex', codex, coordWorkers.codex),
          workLogAgent('grok', 'Grok', grok, coordWorkers.grok),
          workLogAgent('chat', 'Chat (this thread)', chat, null),
        ];
        if (term?.claude) workAgents.push(workLogAgent('term-claude', 'Term Claude', term.claude, null));
        if (term?.grok) workAgents.push(workLogAgent('term-grok', 'Term Grok', term.grok, null));
        const recent = [];
        for (const a of workAgents) {
          if (!a.at && !a.did.length) continue;
          recent.push({
            at: a.at,
            ageSec: a.ageSec,
            agent: a.id,
            label: a.label,
            cycle: a.cycle,
            lane: a.lane,
            text: a.did.length ? a.did.join(' · ') : a.headline,
            source: 'receipt',
          });
        }
        const boardDone = Array.isArray(effectiveBoard?.done_recent) ? effectiveBoard.done_recent : [];
        for (const d of boardDone.slice(0, 12)) {
          const text = d?.did != null ? String(d.did).trim() : d?.text != null ? String(d.text).trim() : '';
          if (!text) continue;
          const at = d?.at || null;
          const ageMs = at ? Date.now() - Date.parse(at) : NaN;
          const ageSec = Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : null;
          recent.push({
            at,
            ageSec: Number.isFinite(ageSec) ? Math.max(0, ageSec) : null,
            agent: d?.agent || 'board',
            label: d?.agent || 'board',
            cycle: d?.cycle ?? null,
            lane: null,
            text: text.slice(0, 400),
            source: 'board',
          });
        }
        recent.sort((a, b) => {
          const ta = a.at ? Date.parse(a.at) : 0;
          const tb = b.at ? Date.parse(b.at) : 0;
          return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
        });
        const busyBits = workAgents
          .filter((a) => a.status === 'busy' || (!a.stale && a.ageSec != null && a.ageSec < 600))
          .map((a) => `${a.label}${a.lane ? '·' + a.lane : ''}: ${a.headline}`)
          .slice(0, 4);
        let workSummary =
          busyBits.length > 0
            ? busyBits.join(' | ')
            : recent[0]
              ? `${recent[0].label}: ${String(recent[0].text).slice(0, 160)}`
              : 'No recent agent receipts yet — workers write *-last.json each cycle.';
        // Ship strip for humans (sealed vs lag) — avoids reading raw ship.facts JSON
        const shipSnap = {
          disk: shipFacts?.diskVer != null ? String(shipFacts.diskVer).replace(/^v/, '') : null,
          live: shipFacts?.liveVer != null ? String(shipFacts.liveVer).replace(/^v/, '') : null,
          man: shipFacts?.manVer != null ? String(shipFacts.manVer).replace(/^v/, '') : null,
          sealed: diskReady?.footSealed === true || diskReady?.ok === true,
          blockers: Array.isArray(diskReady?.blockers) ? diskReady.blockers.slice(0, 4) : [],
        };
        if (shipSnap.disk || shipSnap.live) {
          const shipBit = shipSnap.sealed
            ? `ship=sealed v${shipSnap.live || shipSnap.disk}`
            : `ship disk=${shipSnap.disk || '?'} live=${shipSnap.live || '?'} man=${shipSnap.man || '?'}${shipFacts?.liveCdnId ? ' live@' + String(shipFacts.liveCdnId).slice(0,12) : ''}${shipFacts?.manCdnId ? ' man@' + String(shipFacts.manCdnId).slice(0,12) : ''}${shipSnap.blockers.length ? ' · ' + shipSnap.blockers.join(',') : ''}`;
          workSummary = `${shipBit} · ${workSummary}`;
        }
        // Firecrawl usertest snapshot (optional file; no extra network)
        let crawlSnap = null;
        try {
          const crawlPath = path.join(BUSY, 'firecrawl', 'FIRECRAWL-DATA-REPORT.json');
          const crawl = safeJson(crawlPath);
          if (crawl?.findings?.length) {
            const open = crawl.findings.filter((f) => f && f.sev && f.sev !== 'info');
            const ids = open.map((f) => String(f.id || ''));
            const ageMs = crawl.at ? Date.now() - Date.parse(crawl.at) : null;
            crawlSnap = {
              at: crawl.at || null,
              ageSec: Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : null,
              liveFoot: crawl.live_foot || null,
              shipLive: shipSnap.live || null,
              shipDisk: shipSnap.disk || null,
              shipSealed: shipSnap.sealed === true,
              open: open.length,
              top: open.slice(0, 4).map((f) => `${f.sev}·${f.id}`),
              serpHello: ids.some((id) => /hello|serp-stale-hello/i.test(id)),
              serpVolume: ids.some((id) => /3-5|volume|serp-stale-3/i.test(id)),
              noSitemap: ids.some((id) => /sitemap/i.test(id)),
            };
            if (crawlSnap.open > 0) {
              const flags = [
                crawlSnap.serpHello ? 'hello@' : null,
                crawlSnap.serpVolume ? '3-5' : null,
                crawlSnap.noSitemap ? 'sitemap' : null,
              ].filter(Boolean);
              workSummary = `crawl open=${crawlSnap.open}${flags.length ? ' [' + flags.join(',') + ']' : ''} (${crawlSnap.top.join(',')}) · ${workSummary}`;
            }
          }
        } catch (_) { /* ignore */ }
        // Live verify residual (DEMIGOD-VERIFY-LIVE.json) — Designer static drift vs runtime scrub
        let liveSnap = null;
        try {
          const livePath = path.join(ROOT, 'DEMIGOD-VERIFY-LIVE.json');
          const live = safeJson(livePath);
          if (live?.findings?.length || live?.at) {
            const findings = Array.isArray(live.findings) ? live.findings : [];
            const ageMs = live.at ? Date.now() - Date.parse(live.at) : null;
            const tops = findings.slice(0, 4).map((f) => `${f.severity || f.sev || '?'}:${String(f.issue || f.id || '').slice(0, 60)}`);
            const volumeStatic = findings.some((f) => /volume promise|3-5/i.test(String(f.issue || '')));
            const helloStatic = findings.some((f) => /hello@/i.test(String(f.issue || '')));
            liveSnap = {
              at: live.at || null,
              ageSec: Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : null,
              pass: live.pass === true,
              open: findings.length,
              top: tops,
              volumeStatic,
              helloStatic,
              runtimeScrubNote: [
                volumeStatic ? 'Designer canvas 3-5 remains in raw HTML; head+foot rewrite after JS' : null,
                helloStatic ? 'hello@ in static HTML; runtime scrubs to potter@' : null,
              ].filter(Boolean).join(' · ') || null,
            };
            if (liveSnap.open > 0) {
              const note = [volumeStatic ? 'canvas volume' : null, helloStatic ? 'hello@' : null].filter(Boolean);
              const noteBit = note.length ? ' · ' + note.join('+') + ' (JS scrub)' : '';
              const staticOnly = findings.every((f) => /volume promise|3-5|hello@/i.test(String(f.issue || '')));
              liveSnap.staticOnlyResiduals = staticOnly;
              workSummary = `liveVerify open=${liveSnap.open}${noteBit}${staticOnly && shipSnap.sealed ? ' · hold sealed' : ''} (${liveSnap.top.join('; ')}) · ${workSummary}`;
            }
          }
        } catch (_) { /* ignore */ }
        // Redesign / CDN pin lag (disk ship blocked on Webflow paste)
        let redesignSnap = null;
        try {
          const man = safeJson(path.join(ROOT, 'DEMIGOD-FOOT-CDN.json'));
          const pub = safeJson(path.join(BUSY, 'redesign-publish-status.json'));
          if (man?.footVer || man?.version || pub?.diskFoot) {
            const manVer = String(man?.footVer || man?.version || shipSnap.man || '').replace(/^v/, '');
            redesignSnap = {
              disk: String(shipSnap.disk || pub?.diskFoot || man?.footVer || man?.version || '').replace(/^v/, ''),
              live: String(shipSnap.live || pub?.liveFoot || '').replace(/^v/, '') || null,
              man: shipSnap.man || manVer || null,
              manVer: manVer || null,
              cdnUrl: man?.cdnUrl || pub?.cdn || null,
              manCdnShort: (man?.cdnUrl || pub?.cdn || '').split('@')[1]?.slice(0,12) || (shipFacts?.manCdnId || '').slice(0,12) || null,
              liveCdnShort: (shipFacts?.liveCdnId || '').slice(0,12) || null,
              pasteBlocked: Boolean(pub?.blockers?.length) || (shipSnap.disk && shipSnap.live && String(shipSnap.disk) !== String(shipSnap.live)) || (man?.version && shipSnap.live && String(man.version) !== String(shipSnap.live).replace(/^v/,'')),
              pasteReason: (Array.isArray(pub?.blockers) && pub.blockers[0]) || shipFacts?.pasteBlockedBy || null,
              stage: pub?.stage || shipSnap.stage || null,
              manAt: man?.at || null,
              cdnSealed: Boolean(shipSnap.disk && manVer && String(shipSnap.disk).replace(/^v/, '') === String(manVer).replace(/^v/, '')),
              lagVer: (function () {
                const d = Number(String(shipSnap.disk || pub?.diskFoot || '').replace(/^v/, ''));
                const l = Number(String(shipSnap.live || pub?.liveFoot || '').replace(/^v/, ''));
                if (Number.isFinite(d) && Number.isFinite(l) && d !== l) return d - l;
                if (pub?.lagVer != null && Number.isFinite(Number(pub.lagVer))) return Number(pub.lagVer);
                return null;
              })(),
            };
            if (redesignSnap.pasteBlocked && redesignSnap.disk) {
              const manBit = redesignSnap.manVer ? ` man v${redesignSnap.manVer}` : '';
              const why = redesignSnap.pasteReason ? ` · ${String(redesignSnap.pasteReason).slice(0, 48)}` : '';
              const seal = redesignSnap.cdnSealed ? ' cdn-sealed' : '';
              const lagBit = redesignSnap.lagVer != null ? ` lag+${redesignSnap.lagVer}` : '';
              const manAtBit = redesignSnap.manAt ? ` manAt ${String(redesignSnap.manAt).slice(0, 16)}` : '';
              workSummary = `redesign disk v${redesignSnap.disk} live v${redesignSnap.live || '?'}${manBit}${seal}${lagBit}${manAtBit} man@${redesignSnap.manCdnShort || '?'} live@${redesignSnap.liveCdnShort || '?'} (paste blocked${why}) · ${workSummary}`;
            }
          }
        } catch (_) { /* ignore */ }
        const workLog = {
          schema: 'demigod.work-log/1',
          at: new Date().toISOString(),
          summary: workSummary.slice(0, 600),
          ship: shipSnap,
          redesign: redesignSnap,
          crawl: crawlSnap,
          live: liveSnap,
          agents: workAgents,
          recent: recent.slice(0, 24),
          backlog: Array.isArray(effectiveBoard?.backlog)
            ? effectiveBoard.backlog.map((b) => String(b).slice(0, 200)).slice(0, 6)
            : [],
          goal: effectiveBoard?.goal || null,
          cycle: effectiveBoard?.cycle ?? null,
          loopRunning: pidAlive || pidUnobservable,
        };
        const qualityBacklog = safeJson(path.join(coordDir, 'quality-backlog.json'));
        const openP0P1 = (qualityBacklog?.items || []).filter(
          (item) => item?.status === 'open' && (item?.sev === 'P0' || item?.sev === 'P1'),
        );
        const coordPayload = {
            ok: true,
            schema: 'demigod.coord-api/2',
            at: new Date().toISOString(),
            loopRunning: pidAlive || pidUnobservable,
            supervisor: { alive: pidAlive, pidUnobservable, heartbeatFresh, heartbeatAgeSec, stopRequested, unexpectedDown: supervisorDown },
            workers: coordWorkers,
            reconciliation: {
              needed: supervisorDown || (!stopRequested && staleTracks.length > 0),
              staleTracks,
              cmd: supervisorDown ? 'bin/dg-agent-coord start' : 'bin/dg-agent-coord status',
            },
            lanes,
            claims,
            digest,
            swarm,
            quality: {
              at: qualityBacklog?.at || null,
              openP0P1: openP0P1.length,
              items: openP0P1,
            },
            workLog,
            board: effectiveBoard,
            claude,
            codex,
            grok,
            chat,
            term,
            ship,
            // Fresh ship prepare dogfood (bin/dg ship prepare → ship-prepare.json)
            shipPrepare: (() => {
              const rec = safeJson(path.join(BUSY, 'ship-prepare.json'));
              if (!rec?.at) return { ok: false, fresh: false };
              const ageMs = Date.now() - Date.parse(rec.at);
              const ageSec = Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : null;
              const fresh =
                Number.isFinite(ageSec) && ageSec >= -60 && ageSec <= 30 * 60;
              const steps = Array.isArray(rec.steps)
                ? rec.steps.map((s) => ({
                    label: s?.label || s?.name || '?',
                    ok: s?.ok === true,
                  }))
                : [];
              return {
                ok: rec.ok === true && fresh,
                pass: rec.ok === true,
                fresh,
                ageSec: Number.isFinite(ageSec) ? Math.max(0, ageSec) : null,
                at: rec.at,
                steps,
                failed: steps.filter((s) => !s.ok).map((s) => s.label),
              };
            })(),
            loopState,
            footMarkers,
            blog,
            head,
            footerLite,
            footNotes,
            // Head CSS CDN dogfood (agents check match without shell curl)
            headCss: (() => {
              const rec = safeJson(path.join(BUSY, 'head-css-cdn.json'));
              if (!rec?.at) return rec || { ok: false, match: null };
              const ageMs = Date.now() - Date.parse(rec.at);
              const ageSec = Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : null;
              const clockSkewed = Number.isFinite(ageSec) && ageSec < -60;
              const stale = !Number.isFinite(ageSec) || clockSkewed || ageSec > 3600;
              return {
                ok: rec.match === true && !stale && !clockSkewed,
                match: rec.match === true,
                href: rec.href || null,
                diskMd5: rec.diskMd5 || null,
                liveMd5: rec.liveMd5 || null,
                diskBytes: rec.diskBytes ?? null,
                liveBytes: rec.liveBytes ?? null,
                at: rec.at,
                ageSec: Number.isFinite(ageSec) ? Math.max(0, ageSec) : null,
                clockSkewed,
                stale,
                note: rec.note || null,
              };
            })(),
            diskReady,
            // Compact foot-lock dogfood (agents avoid shelling demigod-foot-lock status)
            footLock: (() => {
              try {
                const lk = footLock();
                const j = lk?.json || null;
                return {
                  locked: lk?.locked === true,
                  free: lk?.locked !== true,
                  expired: lk?.expired === true,
                  compromised: lk?.compromised === true,
                  owner: j?.owner || null,
                  why: j?.why ? String(j.why).slice(0, 120) : null,
                  footVer: j?.footVer || null,
                  at: j?.at || null,
                  expiresAt: j?.expiresAt || null,
                  ttlLeftSec: lk?.ttlLeftSec ?? null,
                  baseShaMatch: lk?.baseShaMatch ?? null,
                  changedSinceClaim: lk?.changedSinceClaim ?? null,
                };
              } catch (e) {
                return { locked: null, free: false, error: String(e.message || e).slice(0, 80) };
              }
            })(),
            webflow: webflow
              ? {
                  at: webflow.at || null,
                  ageMs: webflowAgeMs,
                  fresh: webflowFresh,
                  clockSkewed: Number.isFinite(webflowAgeMs) && webflowAgeMs < -60000,
                  cdp: webflow.cdp?.ok === true,
                  tabs: webflow.tabs?.byRole || {},
                  doctorFresh: webflowDoctorFresh,
                  doctorCmd: webflowDoctorFresh ? null : 'bin/dg webflow doctor',
                  doctorClockSkewed: Number.isFinite(webflowDoctorAgeMs) && webflowDoctorAgeMs < -60000,
                  doctorObservable:
                    webflowDoctorFresh &&
                    !(webflow.doctor?.tips || []).some((tip) => tip.includes('unobservable')) &&
                    !(webflow.doctor?.checks || []).some((check) => check.name === 'cdp' && /EPERM/.test(check.detail || '')),
                  doctorPass: webflowDoctorFresh ? webflow.doctor?.pass ?? null : null,
                  doctorFailed: webflowDoctorFresh
                    ? (webflow.doctor?.checks || [])
                        .filter((check) => !check.ok && !['designer tab', 'custom-code tab', 'live tab'].includes(check.name))
                        .map((check) => check.name)
                    : [],
                  ready: webflowFresh ? webflow.ready ?? null : null,
                }
              : null,
            inboxTail,
            brief: '/tmp/dg-busy/coord/CLAUDE-BRIEF.md',
            cli: 'bin/dg-agent-coord status|lanes|start|stop|once',
        };
        writeJsonAtomic(path.join(BUSY, 'coord-api-last.json'), coordPayload);
        coordCache = { at: Date.now(), data: coordPayload };
        jsonSend(res, 200, coordPayload, { pretty });
      } catch (e) {
        jsonSend(res, 500, { error: String(e.message || e) });
      }
      return;
    }

    if (url.pathname === '/api/ponytail') {
      try {
        const pretty = url.searchParams.get('pretty') === '1';
        const force = url.searchParams.get('refresh') === '1' || url.searchParams.get('run') === '1';
        let rec = safeJson(path.join(BUSY, 'ponytail-status.json'));
        const ageMs = rec?.at ? Date.now() - Date.parse(rec.at) : Infinity;
        if (force || !rec || !Number.isFinite(ageMs) || ageMs > 120000) {
          const { gatherStatus } = await import('./demigod-ponytail.mjs');
          rec = gatherStatus();
        }
        jsonSend(res, 200, rec, { pretty });
      } catch (e) {
        jsonSend(res, 500, { error: String(e.message || e) });
      }
      return;
    }
    if (url.pathname === '/api/control' || url.pathname === '/api/control-plane') {
      try {
        const force = url.searchParams.get('force') === '1' || url.searchParams.get('refresh') === '1';
        const pretty = url.searchParams.get('pretty') === '1';
        const now = Date.now();
        if (!force && controlCache.data && now - controlCache.at < CONTROL_TTL_MS) {
          jsonSend(res, 200, { ...controlCache.data, cached: true, cacheAgeMs: now - controlCache.at }, { pretty });
          return;
        }
        // Prefer control slice from fresh status (avoids double build when status just ran)
        const st = await getStatus({ force: false });
        if (st.control && !force) {
          jsonSend(res, 200, { ...st.control, fromStatus: true }, { pretty });
          return;
        }
        const { buildControlPlane } = await import('./demigod-control.mjs');
        const plane = await buildControlPlane();
        controlCache = { at: Date.now(), data: plane };
        jsonSend(res, 200, plane, { pretty });
      } catch (e) {
        const cached = safeJson(path.join(BUSY, 'control-plane.json'));
        const error = String(e.message || e);
        if (cached) {
          let cacheAgeMs = null;
          try {
            cacheAgeMs = Math.max(0, Date.now() - fs.statSync(path.join(BUSY, 'control-plane.json')).mtimeMs);
          } catch {
            /* cache disappeared between read and stat */
          }
          jsonSend(
            res,
            200,
            { ...cached, cached: true, degraded: true, refreshError: error, cacheAgeMs },
            { pretty },
          );
        } else {
          jsonSend(res, 500, { error });
        }
      }
      return;
    }
    if (url.pathname === '/api/webflow') {
      try {
        const force = url.searchParams.get('refresh') === '1' || url.searchParams.get('run') === '1';
        if (force) {
          run('node demigod-webflow.mjs doctor --json', 25000);
        }
        let wf = safeJson(path.join(BUSY, 'webflow-status.json'));
        if (!wf) {
          run('node demigod-webflow.mjs status --json', 25000);
          wf = safeJson(path.join(BUSY, 'webflow-status.json'));
        }
        const doctor = safeJson(path.join(BUSY, 'webflow-doctor.json'));
        const statusAgeMs = wf?.at ? Date.now() - Date.parse(wf.at) : Infinity;
        const doctorAgeMs = doctor?.at ? Date.now() - Date.parse(doctor.at) : Infinity;
        res.writeHead(wf ? 200 : 503, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(wf ? { ...wf, ageMs: statusAgeMs, clockSkewed: Number.isFinite(statusAgeMs) && statusAgeMs < -60000, fresh: Number.isFinite(statusAgeMs) && statusAgeMs >= -60000 && statusAgeMs <= 120000, doctor: doctor ? { ...doctor, ageMs: doctorAgeMs, clockSkewed: Number.isFinite(doctorAgeMs) && doctorAgeMs < -60000, fresh: Number.isFinite(doctorAgeMs) && doctorAgeMs >= -60000 && doctorAgeMs <= 120000 } : null, actions: ['webflow-doctor', 'webflow-open-code', 'ship-prepare', 'webflow-paste-check'] } : { error: 'no webflow status' }, null, 2));
      } catch (e) {
        res.writeHead(500, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
      return;
    }
    if (url.pathname === '/api/review') {
      const force = url.searchParams.get('refresh') === '1' || url.searchParams.get('run') === '1';
      if (force || req.method === 'POST') {
        try {
          const extra = [];
          if (url.searchParams.get('bug') === '1') extra.push('--bug');
          if (url.searchParams.get('gates') === '1') extra.push('--gates');
          run(`node demigod-review.mjs --json ${extra.join(' ')}`, 90000);
        } catch {
          /* report may still write */
        }
      }
      const rev = safeJson(path.join(BUSY, 'review-latest.json'));
      if (url.searchParams.get('format') === 'md') {
        const md = safeRead(path.join(BUSY, 'review-latest.md'), 80_000);
        res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
        res.end(md || '# no review yet\n');
        return;
      }
      res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify(
          rev || {
            error: 'no review yet',
            hint: 'POST /api/review or curl -sS "http://127.0.0.1:9878/api/review?run=1"',
          },
          null,
          2,
        ),
      );
      return;
    }
    if (url.pathname === '/api/delta') {
      const data = await getStatus({});
      const since = url.searchParams.get('since') || null;
      res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(buildDelta(data, since), null, 2));
      return;
    }
    if (url.pathname === '/api/handoff') {
      if (req.method === 'GET') {
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ at: new Date().toISOString(), notes: readHandoffs(30) }, null, 2));
        return;
      }
      if (req.method === 'POST') {
        // Local-origin soft-guard (same as matches / mutate jobs)
        const origin = String(req.headers.origin || '');
        const local = localMutationRequest(req);
        if (!local) {
          res.writeHead(403, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'forbidden from origin ' + origin }));
          return;
        }
        let body = {};
        try {
          const raw = await readBody(req);
          body = raw ? JSON.parse(raw) : {};
        } catch (e) {
          res.writeHead(400, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid JSON body: ' + String(e.message || e) }));
          return;
        }
        const text = body.text || body.note || body.message || '';
        const done = body.done ?? null;
        const next = body.next ?? null;
        const blocked = body.blocked ?? null;
        if (!String(text).trim() && done == null && next == null && blocked == null) {
          res.writeHead(400, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'text or done/next/blocked required' }));
          return;
        }
        const note = appendHandoff({
          from: body.from || 'human',
          text,
          meta: body.meta || null,
          done,
          next,
          blocked,
        });
        statusCache = { at: 0, data: null };
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, note, notes: readHandoffs(12) }));
        return;
      }
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('GET or POST');
      return;
    }
    if (url.pathname === '/api/agent-brief' || url.pathname === '/api/brief') {
      const data = await getStatus({ force: url.searchParams.get('force') === '1' });
      const format = url.searchParams.get('format') || 'md';
      const wantUnifyOnly = url.searchParams.get('unify') === '1' || url.searchParams.get('unifyOnly') === '1';
      if (wantUnifyOnly) {
        process.env.DEMIGOD_BRIEF_UNIFY_ONLY = '1';
      }
      const md = wantUnifyOnly ? buildAgentBrief(data) : data.agentBriefMarkdown || buildAgentBrief(data);
      if (wantUnifyOnly) delete process.env.DEMIGOD_BRIEF_UNIFY_ONLY;
      if (format === 'json') {
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            at: data.at,
            next: data.next,
            glance: data.glance,
            sessionStory: data.sessionStory,
            actions: wantUnifyOnly ? [] : data.actions,
            staleGates: data.staleGates,
            unifyOnly: wantUnifyOnly,
            markdown: md,
          }),
        );
      } else {
        res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
        res.end(md);
      }
      return;
    }
    if (url.pathname === '/api/actions') {
      const data = await getStatus({});
      res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify(
          { at: data.at, next: data.next, actions: data.actions, cockpitNext: data.cockpit?.next || null },
          null,
          2,
        ),
      );
      return;
    }
    if (url.pathname === '/api/cockpit') {
      try {
        // Prefer dashboard status cockpit (cached, single live probe)
        const data = await getStatus({});
        if (data.cockpit && !data.cockpit.error) {
          const format = url.searchParams.get('format') || 'json';
          if (format === 'md') {
            const { toMarkdown } = await import('./demigod-agent-cockpit.mjs');
            res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
            res.end(toMarkdown(data.cockpit));
          } else {
            res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(data.cockpit, null, 2));
          }
          return;
        }
        const { buildCockpit, toMarkdown } = await import('./demigod-agent-cockpit.mjs');
        const c = await buildCockpit({ skipLive: false });
        const format = url.searchParams.get('format') || 'json';
        if (format === 'md') {
          res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
          res.end(toMarkdown(c));
        } else {
          res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(c, null, 2));
        }
      } catch (e) {
        res.writeHead(500, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
      return;
    }
    if (url.pathname === '/api/smoke') {
      const last = safeJson(path.join(BUSY, 'agent-smoke.json'));
      if (url.searchParams.get('run') === '1') {
        // Prefer async unless wait=1
        if (url.searchParams.get('wait') === '1') {
          const job = await runJob('smoke');
          const fresh = safeJson(path.join(BUSY, 'agent-smoke.json'));
          res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ...(fresh || {}), job }, null, 2));
          return;
        }
        const started = startJob('smoke');
        res.writeHead(started.ok ? 202 : 409, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ...started, last }, null, 2));
        return;
      }
      res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify(
          {
            last,
            refresh: `curl -sS 'http://127.0.0.1:${PORT}/api/smoke?run=1'`,
            cli: 'node demigod-agent-smoke.mjs',
          },
          null,
          2,
        ),
      );
      return;
    }
    if (url.pathname === '/api/tools') {
      try {
        const { buildRegistry, toMarkdown } = await import('./demigod-tools-registry.mjs');
        const group = url.searchParams.get('group') || null;
        // Default agent-friendly: hide aliases + hot only.
        // Full catalog: ?all=1 or hideAliases=0&hotOnly=0
        const allTools =
          url.searchParams.get('all') === '1' || url.searchParams.get('all') === 'true';
        const hideAliases = allTools
          ? false
          : url.searchParams.get('hideAliases') !== '0' &&
            url.searchParams.get('hideAliases') !== 'false';
        const hotOnly = allTools
          ? false
          : url.searchParams.get('hotOnly') !== '0' && url.searchParams.get('hotOnly') !== 'false';
        const reg = annotateRunnableTools(buildRegistry({ group, hideAliases, hotOnly }));
        const format = url.searchParams.get('format') || 'json';
        if (format === 'md') {
          res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
          res.end(toMarkdown(reg));
        } else {
          res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(reg));
        }
      } catch (e) {
        res.writeHead(500, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
      return;
    }
    // /api/jobs/:jobId poll
    const jobPoll = url.pathname.match(/^\/api\/jobs\/([A-Za-z0-9_-]+)$/);
    if (jobPoll) {
      const rec = jobMap.get(jobPoll[1]);
      if (!rec) {
        res.writeHead(404, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unknown jobId', jobId: jobPoll[1] }));
        return;
      }
      res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(rec, null, 2));
      return;
    }
    if (url.pathname === '/api/jobs' || url.pathname === '/api/job/start') {
      const id = url.searchParams.get('run') || url.searchParams.get('id') || url.searchParams.get('type');
      const allowMutate = url.searchParams.get('allowMutate') === '1';
      const wait = url.searchParams.get('wait') === '1';
      if (req.method === 'GET' && !id) {
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify(
            {
              allowed: listJobsMeta(),
              running: jobState.running,
              last: jobState.last,
              how: {
                async: `curl -X POST 'http://127.0.0.1:${PORT}/api/jobs?run=smoke'  # returns jobId immediately`,
                poll: `curl -sS 'http://127.0.0.1:${PORT}/api/jobs/<jobId>'`,
                wait: `curl -sS 'http://127.0.0.1:${PORT}/api/jobs?run=smoke&wait=1'`,
              },
            },
            null,
            2,
          ),
        );
        return;
      }
      if (!id) {
        res.writeHead(400, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'pass ?run=<id>', allowed: Object.keys(JOBS) }));
        return;
      }
      // Mutate jobs: require POST + local Origin (CSRF soft-guard for browser tabs).
      // Authorize before both sync (?wait=1) and async dispatch paths.
      if (JOBS[id]?.mutate) {
        if (req.method !== 'POST') {
          res.writeHead(405, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'mutate jobs require POST' }));
          return;
        }
        const origin = req.headers.origin || '';
        const local = localMutationRequest(req);
        // curl has no Origin — allow; browser cross-origin blocked
        if (!local) {
          res.writeHead(403, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'mutate job forbidden from origin ' + origin }));
          return;
        }
      }
      if (wait) {
        const result = await runJob(id, { allowMutate });
        res.writeHead(result.ok === false && result.error ? 409 : 200, {
          ...noStore,
          'Content-Type': 'application/json; charset=utf-8',
        });
        res.end(JSON.stringify(result, null, 2));
        return;
      }
      // True async: return jobId immediately
      const started = startJob(id, { allowMutate });
      const code = started.ok ? 202 : 409;
      res.writeHead(code, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(started, null, 2));
      return;
    }
    // Static design assets (local only)
    if (url.pathname.startsWith('/assets/')) {
      const rel = url.pathname.replace(/^\/assets\//, '').replace(/\.\./g, '');
      const file = path.join(ROOT, 'demigod-assets', rel);
      if (!file.startsWith(path.join(ROOT, 'demigod-assets'))) {
        res.writeHead(403);
        res.end('forbidden');
        return;
      }
      try {
        const buf = fs.readFileSync(file);
        const ext = path.extname(file).toLowerCase();
        const type =
          ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : ext === '.png'
              ? 'image/png'
              : ext === '.webp'
                ? 'image/webp'
                : ext === '.svg'
                  ? 'image/svg+xml'
                  : 'application/octet-stream';
        res.writeHead(200, { ...noStore, 'Content-Type': type, 'Cache-Control': 'public, max-age=3600' });
        res.end(buf);
      } catch {
        res.writeHead(404);
        res.end('not found');
      }
      return;
    }
    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/dashboard' || url.pathname === '/v2' || url.pathname === '/v5') {
      res.writeHead(200, { ...noStore, 'Content-Type': 'text/html; charset=utf-8' });
      res.end(loadHtml());
      return;
    }
    if (url.pathname === '/healthz' || url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          uptimeSec: Math.round(process.uptime()),
          cacheAgeMs: statusCache.data ? Date.now() - statusCache.at : null,
          statusTtlMs: STATUS_TTL_MS,
          controlTtlMs: CONTROL_TTL_MS,
          coordTtlMs: COORD_TTL_MS,
          coordCacheAgeMs: coordCache.data ? Date.now() - coordCache.at : null,
          inflight: Boolean(statusInflight),
        }),
      );
      return;
    }
    if (url.pathname === '/api/health') {
      const data = await getStatus({});
      const health = productHealth(data);
      res.writeHead(health.ok ? 200 : 503, { ...noStore, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found — try /  /api/status  /api/agent-brief  /api/actions  /api/health');
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
});

server.on('error', (error) => {
  // Keep daemon/startup failures machine-readable and avoid Node's noisy
  // unhandled "error" event crash (for example EADDRINUSE or sandbox EPERM).
  console.error(JSON.stringify({
    ok: false,
    error: 'dashboard_listen_failed',
    code: error?.code || null,
    message: String(error?.message || error),
    host: '127.0.0.1',
    port: PORT,
  }));
  process.exitCode = error?.code === 'EADDRINUSE' ? 98 : 1;
});

server.listen(PORT, '127.0.0.1', () => {
  const refreshHostEvidence = () => {
    // Heartbeat file only — no HTTP self-fetch (avoids hot-path thrash)
    try {
      fs.writeFileSync(SERVER_HEARTBEAT, `${new Date().toISOString()}\n`);
    } catch {
      /* */
    }
  };
  refreshHostEvidence();
  setInterval(refreshHostEvidence, 60_000).unref();
  console.log(
    JSON.stringify(
      {
        ok: true,
        dashboard: `http://127.0.0.1:${PORT}/`,
        agentBrief: `http://127.0.0.1:${PORT}/api/agent-brief`,
        actions: `http://127.0.0.1:${PORT}/api/actions`,
        health: `http://127.0.0.1:${PORT}/api/health`,
        briefFile: BRIEF_MD,
        refreshSec: 45,
        statusTtlMs: STATUS_TTL_MS,
        coordTtlMs: COORD_TTL_MS,
      },
      null,
      2,
    ),
  );
});
