#!/usr/bin/env node
/**
 * Demigod multi-agent + tools dashboard (agent-first)
 *
 * Human UI:  http://127.0.0.1:9878/  (Dashboard v2)
 * Agent API: http://127.0.0.1:9878/api/status
 * Agent brief: /api/agent-brief  → /tmp/dg-busy/AGENT-BRIEF.md
 * Tools: /api/tools · Jobs: POST /api/jobs?run=smoke
 * Cockpit/Smoke: /api/cockpit · /api/smoke
 *
 * UI file: demigod-agent-dashboard-ui.html (loaded from disk — no nested quote bugs)
 * Usage: node demigod-agent-dashboard.mjs | bin/dg-dash
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { execSync, execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

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
  const js = safeRead(file, 80_000) || '';
  const ver =
    (js.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] ||
    (js.match(/dgFootVersion\s*=\s*['"]v?(\d+)/) || [])[1] ||
    null;
  const core = (js.match(/dg-foot-v(\d+)-core/) || [])[1] || null;
  return {
    ver,
    core: core ? `v${core}` : null,
    dgFootVersion: (js.match(/dgFootVersion = '([^']+)'/) || [])[1] || null,
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
    const expired = j.expiresAt && Date.parse(j.expiresAt) < Date.now();
    return { locked: !expired, path: lockPath, json: j, content: JSON.stringify(j).slice(0, 500), expired };
  }
  const raw = safeRead(lockPath, 2000);
  if (!raw) return { locked: false, path: lockPath };
  return { locked: true, path: lockPath, content: raw.slice(0, 500) };
}

async function liveProbe() {
  const started = Date.now();
  try {
    const r = await fetch(`${LIVE}/?cb=${Date.now()}`, {
      headers: { 'User-Agent': 'dg-dashboard' },
      signal: AbortSignal.timeout(6000),
    });
    const html = await r.text();
    // Prefer real foot <script src=…> — product map lists other catbox .js first in footer-lite
    const cdn =
      (html.match(/src=["']https:\/\/files\.catbox\.moe\/([a-z0-9]+\.js)["']/) || [])[1] ||
      (html.match(/files\.catbox\.moe\/([a-z0-9]+\.js)/) || [])[1] ||
      null;
    const pub = (html.match(/Last Published:[^<]{0,70}/) || [])[0] || null;
    const foot = (html.match(/foot v\d+/) || [])[0] || null;
    return {
      ok: r.ok,
      status: r.status,
      ms: Date.now() - started,
      cdn: cdn ? `files.catbox.moe/${cdn}` : null,
      cdnId: cdn || null,
      pub,
      foot,
      hasUnhide: /unhide-v5/.test(html),
      hasStartupModal: /startup-modal/.test(html),
      hasPathPills: /dg-path-pills|I'm hiring|I.?m hiring/.test(html) || /path-pills/.test(html),
    };
  } catch (e) {
    return { ok: false, error: String(e.message || e), ms: Date.now() - started };
  }
}

/** In-memory status cache + singleflight — stops auto-refresh stampede + double work */
const STATUS_TTL_MS = 2500;
let statusCache = { at: 0, data: null };
let statusInflight = null;

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

  const manId = foot?.manifest?.cdnUrl?.match(/\/([a-z0-9]+\.js)/)?.[1];
  const liveId = live?.cdnId;
  if (manId && liveId && manId !== liveId) {
    actions.push({
      pri: 0,
      id: 'cdn-drift',
      title: 'Live CDN ≠ manifest — publish or confirm intentional lag',
      why: `live=${liveId} manifest=${manId}`,
      cmd: 'node demigod-cm6-paste-publish.mjs --footer-only',
      owner: 'grok',
    });
  }

  const diskVer = foot?.disk?.ver;
  const liveFoot = live?.foot?.replace(/foot v/, '') || null;
  if (diskVer && liveFoot && diskVer !== liveFoot) {
    actions.push({
      pri: 0,
      id: 'ver-drift',
      title: `Disk foot v${diskVer} vs live ${live?.foot}`,
      why: 'Hash/version drift — do not claim ship until CDN matches',
      cmd: 'node --check demigod-foot-core.js && npm run demigod:foot:cdn # or manual catbox + cm6',
      owner: 'grok',
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
    actions.push({
      pri: 1,
      id: 'foot-lock',
      title: 'Foot lock held — do not edit foot-core',
      why: foot.lock.content?.slice(0, 120) || 'lock present',
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

  const realRoles = board?.signal?.realRoles ?? board?.signal?.realRoles;
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

  // Site healthy only when full hash chain + versions agree (swarm tools audit 2026-07-13)
  const diskVerGreen = foot?.disk?.ver || foot?.disk?.core || diskVer || null;
  const liveVerGreen = (live?.foot || '').replace(/^foot\s*v?/i, '') || null;
  const truthGreen = safeJson(path.join(BUSY, 'truth.json'));
  const liveEqDiskGreen =
    truthGreen?.claims?.['live==disk'] === true || truthGreen?.match?.cdnBodyMatchesDisk === true;
  const freezeOnGreen = Boolean(safeJson(path.join(BUSY, 'publish-freeze.json'))?.on);
  if (
    live?.ok &&
    gates?.verifySourcePass === true &&
    manId &&
    liveId &&
    manId === liveId &&
    diskVerGreen &&
    liveVerGreen &&
    String(diskVerGreen) === String(liveVerGreen) &&
    liveEqDiskGreen &&
    !freezeOnGreen
  ) {
    actions.push({
      pri: 3,
      id: 'site-green',
      title: 'Site green — no ship required; avoid foot thrash',
      why: `live==disk v${liveVerGreen} cdn=${liveId}`,
      cmd: 'node demigod-ship-status.mjs; bin/dg-preflight',
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
        : 'node demigod-foot-cdn-publish.mjs && node demigod-cm6-paste-publish.mjs --footer-only',
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
  const top = a.filter((x) => x.pri <= 2).slice(0, 8);
  const pf = data.preflight || safeJson(path.join(BUSY, 'preflight-latest.json'));
  const inbox = data.inbox || safeJson(path.join(BUSY, 'plan-inbox-latest.json'));
  const lines = [];
  lines.push(`# Demigod AGENT-BRIEF`);
  lines.push(`at: ${data.at}`);
  lines.push(`phase: ${data.phase}`);
  lines.push(`decision: ${data.decision}`);
  lines.push('');
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
  if (!top.length) lines.push('- (none — site green; improve tools or wait for human task)');
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

  const manId = cdnManifest?.cdnUrl?.match(/\/([a-z0-9]+\.js)/)?.[1];
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
        `curl -sS http://127.0.0.1:${PORT}/api/cockpit`,
        'node demigod-agent-cockpit.mjs --md',
        `curl -sS http://127.0.0.1:${PORT}/api/agent-brief`,
        'node demigod-agent-smoke.mjs',
        `node demigod-tools-registry.mjs --md`,
        `cat ${BRIEF_MD}`,
      ],
      note: 'Start with /api/cockpit or bin/dg-cockpit — single NEXT, no false green.',
    },
    timing: { collectMs: Date.now() - t0 },
  };

  await enrichStatus(data);
  data.agentBriefMarkdown = buildAgentBrief(data);

  try {
    fs.mkdirSync(BUSY, { recursive: true });
    fs.writeFileSync(STATUS_JSON, JSON.stringify(data, null, 2));
    fs.writeFileSync(BRIEF_MD, data.agentBriefMarkdown);
    fs.writeFileSync(
      BRIEF_JSON,
      JSON.stringify(
        {
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
        },
        null,
        2,
      ),
    );
  } catch {
    /* ignore */
  }

  return data;
}

/** Cached / singleflight status — concurrent refreshers share one collect */
async function getStatus({ force = false } = {}) {
  const now = Date.now();
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
    return fs.readFileSync(UI_HTML_PATH, 'utf8');
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
const JOBS = {
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
  hygiene: { cmd: 'node', args: ['demigod-laptop-hygiene.mjs', '--prune', '--json'], timeout: 45000, safe: true },
  control: { cmd: 'node', args: ['demigod-control.mjs', 'status', '--json'], timeout: 45000, safe: true },
  'ship-checklist': { cmd: 'node', args: ['demigod-ship-checklist.mjs', '--json'], timeout: 15000, safe: true },
  inbox: { cmd: 'node', args: ['demigod-submissions-inbox.mjs', '--json'], timeout: 15000, safe: true },
  'match-review': { cmd: 'node', args: ['demigod-match-review.mjs', '--json'], timeout: 15000, safe: true },
  'auto-propose': { cmd: 'node', args: ['demigod-auto-propose.mjs', '--json'], timeout: 30000, safe: true },
  // mutate — never auto-run from simple mode
  'foot-cdn': { cmd: 'node', args: ['demigod-foot-cdn-publish.mjs'], timeout: 120000, safe: false, mutate: true },
  'cm6-paste': {
    cmd: 'node',
    args: ['demigod-cm6-paste-publish.mjs', '--footer-only'],
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

function appendHandoff({ from = 'agent', text = '', meta = null } = {}) {
  const note = {
    id: `h${Date.now().toString(36)}${(++jobSeq).toString(36)}`,
    at: new Date().toISOString(),
    from: String(from).slice(0, 32),
    text: String(text).slice(0, 2000),
    meta: meta || undefined,
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

/** Stable NEXT contract — every agent parses this the same way */
function nextContract(data) {
  const n = data?.cockpit?.next || null;
  const freezeOn = Boolean(data?.freeze?.on);
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
    source: 'cockpit',
  };
}

function buildGlance(data) {
  const liveOk = Boolean(data?.live?.ok);
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
    siteOk: liveOk,
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
    next: nextContract(data),
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

async function enrichStatus(data) {
  data.version = 5;
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
  // Suppress mutate NEXT language while frozen (still show freeze-aware title)
  if (data.freeze?.on && data.next?.mutate) {
    data.next = {
      ...data.next,
      freezeBlocks: true,
      title: data.next.title || 'Blocked by freeze',
      note: 'freeze ON — do not run mutate cmd',
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
  // Match review queue (pair ledger — not public board). In-process build; no stale busy cache.
  try {
    const { buildQueue } = await import('./demigod-match-review.mjs');
    const msnap = buildQueue({ limit: 40 });
    try {
      fs.mkdirSync(BUSY, { recursive: true });
      fs.writeFileSync(path.join(BUSY, 'match-review-latest.json'), JSON.stringify(msnap, null, 2) + '\n');
    } catch {
      /* cache write best-effort */
    }
    data.matches = {
      at: msnap.at,
      summary: msnap.summary || {},
      pairs: (msnap.pairs || []).slice(0, 40),
      actions: msnap.actions || {},
    };
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
      { id: 'collapse-legacy-matches', title: 'Delete legacy DEMIGOD-MATCHES path', done: false },
    ],
    doc: 'docs/exchange/DEMIGOD-BACKLOG-HUGE.md',
  };
  // Control plane — always freshen (uses cached dashboard-status, no recursion)
  try {
    const { buildControlPlane } = await import('./demigod-control.mjs');
    // Write status first so plane can read it
    try {
      fs.writeFileSync(STATUS_JSON, JSON.stringify({ ...data, control: undefined }, null, 2));
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
      board: plane.board,
      lock: plane.lock,
      assets: plane.assets,
      modules: plane.modules,
      moduleOrder: plane.moduleOrder,
      spine: (plane.spine || []).slice(0, 8),
      map: plane.map,
      kbd: plane.kbd,
      entrypoints: plane.entrypoints,
    };
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
    try {
      fs.mkdirSync(BUSY, { recursive: true });
      fs.writeFileSync(path.join(BUSY, 'dashboard-job-last.json'), JSON.stringify(rec, null, 2));
    try {
      const { saveJob } = await import('./demigod-job-store.mjs');
      saveJob(rec);
    } catch { /* optional persist */ }
    } catch {
      /* */
    }
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
  } finally {
    if (jobState.running === toolId) jobState.running = null;
    if (spec?.mutate) {
      try {
        const lockPath = path.join(BUSY, 'mutate-job-lock.json');
        const cur = safeJson(lockPath);
        if (!cur || String(cur.owner || '').startsWith('dash:')) {
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

/** Start job async — returns immediately with jobId */
function startJob(toolId, { allowMutate = false } = {}) {
  const spec = JOBS[toolId];
  if (!spec) return { ok: false, error: 'unknown job: ' + toolId, allowed: Object.keys(JOBS) };
  if (spec.mutate && !allowMutate) {
    return {
      ok: false,
      error: 'mutate job blocked — pass allowMutate=1 and ensure freeze OFF',
      mutate: true,
      freezeHint: 'node demigod-publish-freeze.mjs status',
    };
  }
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
      if (cur?.expiresAt && Date.parse(cur.expiresAt) > Date.now()) {
        return {
          ok: false,
          error: `mutate lock held by ${cur.owner || '?'} pid=${cur.pid || '?'}`,
          lock: cur,
        };
      }
      fs.mkdirSync(BUSY, { recursive: true });
      fs.writeFileSync(
        lockPath,
        JSON.stringify(
          {
            owner: `dash:${toolId}`,
            pid: process.pid,
            at: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          },
          null,
          2,
        ) + '\n',
      );
    } catch (e) {
      return { ok: false, error: 'mutate lock failed: ' + String(e.message || e) };
    }
  }
  // Claim slot synchronously to prevent double-start race
  if (jobState.running) {
    return {
      ok: false,
      error: 'job already running: ' + jobState.running,
      running: jobState.running,
      retryAfterSec: 3,
    };
  }
  const jobId = `j${Date.now().toString(36)}${(++jobSeq).toString(36)}`;
  jobState.running = toolId; // claim before setImmediate
  const rec = {
    jobId,
    id: toolId,
    status: 'queued',
    ok: null,
    safe: !!spec.safe,
    mutate: !!spec.mutate,
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const noStore = { 'Cache-Control': 'no-store' };
  try {
    if (url.pathname === '/api/status' || url.pathname === '/api/status.json') {
      const force = url.searchParams.get('force') === '1';
      const data = await getStatus({ force });
      res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(data, null, 2));
      return;
    }
    if (url.pathname === '/api/next') {
      const data = await getStatus({});
      res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ at: data.at, next: data.next, glance: data.glance, sessionStory: data.sessionStory }, null, 2));
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
        // snapshot first
        res.write(`event: snapshot\ndata: ${JSON.stringify({ events: eventRing.slice(0, 20) })}\n\n`);
        let lastId = eventRing[0]?.id || null;
        const tick = setInterval(() => {
          try {
            if (res.writableEnded) {
              clearInterval(tick);
              return;
            }
            const head = eventRing[0];
            if (head && head.id !== lastId) {
              // push new events since lastId (newest first → reverse for chrono)
              const batch = [];
              for (const e of eventRing) {
                if (e.id === lastId) break;
                batch.push(e);
              }
              lastId = head.id;
              for (const e of batch.reverse()) {
                res.write(`event: event\ndata: ${JSON.stringify(e)}\n\n`);
              }
            } else {
              res.write(`: ping ${Date.now()}\n\n`);
            }
          } catch {
            clearInterval(tick);
          }
        }, 1500);
        req.on('close', () => clearInterval(tick));
        return;
      }
      res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ at: new Date().toISOString(), events: eventRing.slice(0, 40) }, null, 2));
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
        const referer = String(req.headers.referer || '');
        const local =
          !origin ||
          origin.startsWith('http://127.0.0.1') ||
          origin.startsWith('http://localhost') ||
          referer.startsWith('http://127.0.0.1') ||
          referer.startsWith('http://localhost');
        if (origin && !local) {
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
              const out = execSync(`node demigod-intro-draft.mjs ${pairId} --json`, {
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
          run(`node ${args.join(' ')}`, 15000);
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
    if (url.pathname === '/api/control' || url.pathname === '/api/control-plane') {
      try {
        const { buildControlPlane } = await import('./demigod-control.mjs');
        const plane = await buildControlPlane();
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(plane, null, 2));
      } catch (e) {
        const cached = safeJson(path.join(BUSY, 'control-plane.json'));
        res.writeHead(cached ? 200 : 500, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(cached || { error: String(e.message || e) }, null, 2));
      }
      return;
    }
    if (url.pathname === '/api/webflow') {
      try {
        const force = url.searchParams.get('refresh') === '1' || url.searchParams.get('run') === '1';
        if (force) {
          run('node demigod-webflow.mjs status --json', 25000);
        }
        let wf = safeJson(path.join(BUSY, 'webflow-status.json'));
        if (!wf || force) {
          run('node demigod-webflow.mjs status --json', 25000);
          wf = safeJson(path.join(BUSY, 'webflow-status.json'));
        }
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(wf || { error: 'no webflow status' }, null, 2));
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
        const referer = String(req.headers.referer || '');
        const local =
          !origin ||
          origin.startsWith('http://127.0.0.1') ||
          origin.startsWith('http://localhost') ||
          referer.startsWith('http://127.0.0.1') ||
          referer.startsWith('http://localhost');
        if (origin && !local) {
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
        if (!String(text).trim()) {
          res.writeHead(400, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'text required' }));
          return;
        }
        const note = appendHandoff({
          from: body.from || 'human',
          text,
          meta: body.meta || null,
        });
        statusCache = { at: 0, data: null };
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, note, notes: readHandoffs(12) }, null, 2));
        return;
      }
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('GET or POST');
      return;
    }
    if (url.pathname === '/api/agent-brief' || url.pathname === '/api/brief') {
      const data = await getStatus({ force: url.searchParams.get('force') === '1' });
      const format = url.searchParams.get('format') || 'md';
      if (format === 'json') {
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify(
            {
              at: data.at,
              next: data.next,
              glance: data.glance,
              sessionStory: data.sessionStory,
              actions: data.actions,
              staleGates: data.staleGates,
              markdown: data.agentBriefMarkdown,
            },
            null,
            2,
          ),
        );
      } else {
        res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
        res.end(data.agentBriefMarkdown);
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
        const reg = buildRegistry({ group });
        const format = url.searchParams.get('format') || 'json';
        if (format === 'md') {
          res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
          res.end(toMarkdown(reg));
        } else {
          res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(reg, null, 2));
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
      if (wait) {
        const result = await runJob(id, { allowMutate });
        res.writeHead(result.ok === false && result.error ? 409 : 200, {
          ...noStore,
          'Content-Type': 'application/json; charset=utf-8',
        });
        res.end(JSON.stringify(result, null, 2));
        return;
      }
      // Mutate jobs: require POST + local Origin (CSRF soft-guard for browser tabs)
      if (JOBS[id]?.mutate) {
        if (req.method !== 'POST') {
          res.writeHead(405, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'mutate jobs require POST' }));
          return;
        }
        const origin = req.headers.origin || '';
        const referer = req.headers.referer || '';
        const local =
          !origin ||
          origin.startsWith('http://127.0.0.1') ||
          origin.startsWith('http://localhost') ||
          referer.startsWith('http://127.0.0.1') ||
          referer.startsWith('http://localhost');
        // curl has no Origin — allow; browser cross-origin blocked
        if (origin && !local) {
          res.writeHead(403, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'mutate job forbidden from origin ' + origin }));
          return;
        }
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
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          uptimeSec: Math.round(process.uptime()),
          cacheAgeMs: statusCache.data ? Date.now() - statusCache.at : null,
          inflight: Boolean(statusInflight),
        }),
      );
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found — try /  /api/status  /api/agent-brief  /api/actions  /api/health');
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    JSON.stringify(
      {
        ok: true,
        dashboard: `http://127.0.0.1:${PORT}/`,
        agentBrief: `http://127.0.0.1:${PORT}/api/agent-brief`,
        actions: `http://127.0.0.1:${PORT}/api/actions`,
        health: `http://127.0.0.1:${PORT}/api/health`,
        briefFile: BRIEF_MD,
        refreshSec: 12,
        statusTtlMs: STATUS_TTL_MS,
      },
      null,
      2,
    ),
  );
});
