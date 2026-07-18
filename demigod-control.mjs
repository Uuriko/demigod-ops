#!/usr/bin/env node
/**
 * demigod-control — cohesive Control Plane over all Demigod ops modules
 *
 * One mental model:
 *   Site (live/disk) · Webflow · Match · Review · Hygiene · Ship · Swarm · Orca
 * One CLI spine:
 *   bin/dg status|home|next|webflow|matches|review|hygiene|orca|full-check|ship-prep|…
 * One JSON:
 *   /tmp/dg-busy/control-plane.json  (+ dash /api/control)
 *
 * Related: demigod-agent-dashboard.mjs (:9878), demigod-tools-registry.mjs,
 *   docs/exchange/DEMIGOD-FULL-HISTORY-AND-TOOL-ATLAS.md
 * Usage:
 *   bin/dg status|--json
 *   bin/dg home
 *   bin/dg next
 *   bin/dg <module> [args…]
 *   node demigod-control.mjs modules
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { refuseIfStale } from './demigod-evidence.mjs';
import { buildNext } from './demigod-next.mjs';
import { BUSY, ensureBusy, atomicWrite, readJson } from './demigod-agent-tools-lib.mjs';
import { isFreshFile, writeJsonAuto } from './demigod-perf-cache.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const DASH = process.env.DEMIGOD_DASH || 'http://127.0.0.1:9878';
const OUT = path.join(BUSY, 'control-plane.json');
const NEXT_JSON = path.join(BUSY, 'next.json');
const COCKPIT_JSON = path.join(BUSY, 'cockpit.json');

/** Project full buildNext() → plane.next / cockpit.next shape */
export function projectNext(nextCanon) {
  return {
    id: nextCanon.id,
    title: nextCanon.title,
    cmd: nextCanon.cmd,
    pri: nextCanon.pri,
    mutate: nextCanon.mutate,
    freezeBlocks: nextCanon.freezeBlocks,
    reason: nextCanon.reason,
    demandSignal: nextCanon.demandSignal || null,
  };
}

/**
 * Persist canonical NEXT to next.json + patch control-plane + cockpit when present.
 * Call after freeze flips or whenever surfaces must agree with buildNext().
 */
export function writeNextSnapshot(nextCanon) {
  ensureBusy();
  atomicWrite(NEXT_JSON, JSON.stringify(nextCanon, null, 2) + '\n');

  // Freeze module is disabled — always unfrozen (imports stay for API stability).
  const freeze = { on: false, why: 'freeze disabled', at: null, by: null };
  const frozen = false;
  const nextOut = projectNext(nextCanon);

  const plane = safeJsonFile(OUT);
  if (plane && typeof plane === 'object') {
    plane.nextCanon = nextCanon;
    plane.next = nextOut;
    plane.at = new Date().toISOString();
    plane.frozen = frozen;
    plane.freezeWhy = freeze.why || null;
    plane.freezeAt = freeze.at || null;
    plane.freezeBy = freeze.by || null;
    plane.sessionMode = frozen ? 'read-only' : 'read-write';
    atomicWrite(OUT, JSON.stringify(plane) + '\n');
  }

  const cock = safeJsonFile(COCKPIT_JSON);
  if (cock && typeof cock === 'object' && cock.next) {
    // Only patch when cockpit was using canonical next (not live-down/board/verify override)
    const override = ['live-down', 'board-honesty', 'verify-source'].includes(cock.next?.id);
    if (!override) {
      cock.next = {
        ...nextOut,
        versions: nextCanon.versions,
        truthEvidence: nextCanon.truthEvidence,
      };
      cock.nextSource = 'refreshNextCanon';
      cock.freeze = { on: frozen, why: freeze.why || null, at: freeze.at || null };
      cock.at = new Date().toISOString();
      atomicWrite(COCKPIT_JSON, JSON.stringify(cock, null, 2) + '\n');
    }
  }

  return nextCanon;
}

/**
 * Rebuild NEXT and refresh persisted surfaces.
 * If control-plane.json is missing, builds full plane (do not fabricate a plane).
 */
export async function refreshNextCanon() {
  ensureBusy();
  if (!fs.existsSync(OUT)) {
    const plane = await buildControlPlane();
    return plane.nextCanon || buildNext();
  }
  const nextCanon = buildNext();
  return writeNextSnapshot(nextCanon);
}

/** Module map — the cohesion layer (UI + CLI + API) */
export const MODULES = {
  site: {
    title: 'Site',
    why: 'Live foot healthy and honest vs disk',
    emoji: '◎',
    accent: '#5ecf8a',
    key: 's',
    cli: 'bin/dg smoke',
    dashTab: 'overview',
    api: `${DASH}/api/smoke`,
    jobs: ['smoke', 'truth'],
    actions: [
      { id: 'smoke', label: 'Smoke', job: 'smoke' },
      { id: 'truth', label: 'Truth', job: 'truth' },
    ],
  },
  webflow: {
    title: 'Webflow',
    why: 'Freeze, CDP tabs, paste/publish readiness',
    emoji: '◇',
    accent: '#7eb6e8',
    key: 'w',
    cli: 'bin/dg webflow doctor',
    dashTab: 'plane',
    api: `${DASH}/api/webflow`,
    jobs: ['webflow', 'webflow-doctor', 'tab-prune'],
    actions: [
      { id: 'wf-doc', label: 'Doctor', job: 'webflow-doctor' },
      { id: 'wf-stat', label: 'Status', job: 'webflow' },
      { id: 'prune', label: 'Prune tabs', job: 'tab-prune' },
    ],
  },
  match: {
    title: 'Match',
    why: 'Inbox → pairs → review → intro draft',
    emoji: '⇄',
    accent: '#C9A84C',
    key: 'm',
    cli: 'bin/dg matches',
    dashTab: 'matches',
    api: `${DASH}/api/matches`,
    jobs: ['inbox', 'match-review', 'auto-propose'],
    actions: [
      { id: 'inbox', label: 'Inbox', job: 'inbox', tab: 'inbox' },
      { id: 'queue', label: 'Queue', job: 'match-review', tab: 'matches' },
      { id: 'auto', label: 'Auto-propose', job: 'auto-propose' },
    ],
  },
  review: {
    title: 'Review',
    why: 'Diff-aware policy scan + fix prompts',
    emoji: '⌕',
    accent: '#e8b84a',
    key: 'r',
    cli: 'bin/dg review',
    dashTab: 'plane',
    api: `${DASH}/api/review`,
    jobs: ['review', 'review-bug'],
    actions: [
      { id: 'rev', label: 'Review', job: 'review' },
      { id: 'revbug', label: 'Bug hunt', job: 'review-bug' },
    ],
  },
  hygiene: {
    title: 'Hygiene',
    why: 'Tabs + load — keep laptop snappy',
    emoji: '✧',
    accent: '#9a9388',
    key: 'h',
    cli: 'bin/dg hygiene --prune',
    dashTab: 'plane',
    jobs: ['hygiene', 'tab-prune'],
    actions: [{ id: 'hyg', label: 'Prune now', job: 'hygiene' }],
  },
  ponytail: {
    title: 'Ponytail',
    why: 'Lazy-senior coding for all agents (YAGNI / min code)',
    emoji: '✦',
    accent: '#c4b5fd',
    key: 'y',
    cli: 'bin/dg ponytail',
    dashTab: 'tools',
    api: `${DASH}/api/ponytail`,
    jobs: ['ponytail', 'ponytail-check'],
    actions: [
      { id: 'pt-status', label: 'Status', job: 'ponytail' },
      { id: 'pt-check', label: 'Check', job: 'ponytail-check' },
    ],
  },
  workloop: {
    title: 'Work loop',
    why: 'Cycle-work · never-stop · swarm status (safe; no auto thrash)',
    emoji: '⟳',
    accent: '#7dd3fc',
    key: 'l',
    cli: 'bin/dg cycle-status',
    dashTab: 'system',
    jobs: ['cycle-status', 'cycle-work', 'never-stop-status', 'swarm-status', 'harness-selftest', 'dogfood', 'priority'],
    actions: [
      { id: 'cstat', label: 'Cycle status', job: 'cycle-status' },
      { id: 'cwork', label: 'One cycle', job: 'cycle-work' },
      { id: 'ns', label: 'Never-stop status', job: 'never-stop-status' },
      { id: 'sw', label: 'Swarm status', job: 'swarm-status' },
      { id: 'stop-ns', label: 'Stop never-stop', job: 'never-stop-stop' },
      { id: 'stop-sw', label: 'Stop swarm', job: 'swarm-stop' },
    ],
  },
  ship: {
    title: 'Ship',
    why: 'When (not) to mutate CDN/Webflow',
    emoji: '⚑',
    accent: '#f07171',
    key: 'p',
    cli: 'node demigod-publish-freeze.mjs status',
    dashTab: 'roadmap',
    api: `${DASH}/api/ship-checklist`,
    jobs: ['ship-checklist', 'verify-source', 'board-honesty'],
    actions: [
      { id: 'shipc', label: 'Checklist', job: 'ship-checklist' },
      { id: 'honest', label: 'Board honesty', job: 'board-honesty' },
    ],
  },
  swarm: {
    title: 'Swarm',
    why: 'Handoffs + multi-agent plans',
    emoji: '◉',
    accent: '#7eb6e8',
    key: 'a',
    cli: 'bin/dg-handoff',
    dashTab: 'swarm',
    jobs: ['plan-inbox'],
    actions: [
      { id: 'plans', label: 'Plans', job: 'plan-inbox', tab: 'swarm' },
      { id: 'hand', label: 'Handoff', tab: 'handoff' },
    ],
  },
  orca: {
    title: 'Orca',
    why: 'Phone + laptop remote seat (pair, hubs, agent spawn)',
    emoji: '◎',
    accent: '#a78bfa',
    key: 'o',
    cli: 'bin/dg-orca status',
    dashTab: 'plane',
    jobs: [],
    actions: [
      { id: 'orca-up', label: 'Up', cmd: 'bin/dg-orca up' },
      { id: 'orca-pair', label: 'Pair URL', cmd: 'bin/dg-orca pair' },
      { id: 'orca-swarm', label: 'Swarm', cmd: 'bin/dg-orca swarm' },
    ],
  },
};

const DISPATCH = {
  webflow: ['demigod-webflow.mjs'],
  wf: ['demigod-webflow.mjs'],
  matches: ['demigod-match-review.mjs', '--json'],
  match: ['demigod-match-review.mjs', '--json'],
  pairs: ['demigod-pairs-lib.mjs', 'list'],
  inbox: ['demigod-submissions-inbox.mjs', '--json'],
  review: ['demigod-review.mjs'],
  hygiene: ['demigod-laptop-hygiene.mjs'],
  workloop: ['demigod-cycle-status.mjs'],
  ponytail: ['demigod-ponytail.mjs'],
  doctor: ['demigod-doctor.mjs'],
  smoke: ['demigod-agent-smoke.mjs'],
  truth: ['demigod-truth.mjs', '--md'],
  freeze: ['demigod-publish-freeze.mjs', 'status'],
  cockpit: ['demigod-agent-cockpit.mjs'],
  usertest: ['demigod-user-test.mjs', '--quick'],
};

function sh(cmd, timeout = 20000) {
  return spawnSync('bash', ['-lc', cmd], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
  });
}

function safeJsonFile(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

async function fetchJson(url, ms = 8000) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms) });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/**
 * Build full control-plane snapshot → /tmp/dg-busy/control-plane.json
 * Includes modules, spine, freeze, nextCanon (via buildNext + writeNextSnapshot).
 * Call refreshNextCanon() after freeze flips when a full rebuild is not needed.
 */
export async function buildControlPlane() {
  ensureBusy();
  /* ==== SECTION: freeze + dash status (cached) ==== */
  // Publish freeze disabled entirely for now.
  const freeze = { on: false, why: 'freeze disabled', at: null, by: null };
  const frozen = false;

  // Prefer busy cache — only hit dash if stale (>30s)
  let dashStatus = safeJsonFile(path.join(BUSY, 'dashboard-status.json'));
  const dashAge = dashStatus?.at ? Date.now() - Date.parse(dashStatus.at) : Infinity;
  if (!dashStatus?.at || dashAge > 30000) {
    // Prefer slim status for speed
    dashStatus =
      (await fetchJson(`${DASH}/api/status?slim=1`)) ||
      (await fetchJson(`${DASH}/api/status`)) ||
      dashStatus;
  }
  const [webflow, review, hygiene, matchesBusy, ponytail] = await Promise.all([
    Promise.resolve(
      safeJsonFile(path.join(BUSY, 'webflow-status.json')) ||
        (dashAge < 60000 ? null : fetchJson(`${DASH}/api/webflow`)),
    ),
    Promise.resolve(safeJsonFile(path.join(BUSY, 'review-latest.json'))),
    Promise.resolve(safeJsonFile(path.join(BUSY, 'laptop-hygiene.json'))),
    Promise.resolve(safeJsonFile(path.join(BUSY, 'match-review-latest.json'))),
    Promise.resolve(safeJsonFile(path.join(BUSY, 'ponytail-status.json'))),
  ]);

  // Webflow status: only spawn if missing/stale (>90s) — was 25s block every home
  let wf = webflow;
  const wfPath = path.join(BUSY, 'webflow-status.json');
  if (!wf?.at || !isFreshFile(wfPath, 90)) {
    if (!isFreshFile(wfPath, 90)) {
      sh('node demigod-webflow.mjs status --json >/tmp/dg-busy/webflow-status.json 2>/dev/null', 12000);
    }
    wf = safeJsonFile(wfPath);
  }
  const wfDoctorRaw = safeJsonFile(path.join(BUSY, 'webflow-doctor.json')) || wf?.doctor || null;
  const wfDoctorAgeMs = wfDoctorRaw?.at ? Date.now() - Date.parse(wfDoctorRaw.at) : Infinity;
  const wfDoctor = wfDoctorRaw
    ? {
        ...wfDoctorRaw,
        ageMs: wfDoctorAgeMs,
        // >= -60000 rejects a future-dated/clock-skewed doctor envelope instead of blessing it
        // fresh forever (negative age passed `<= 120000`); mirrors dashboard.mjs truth-seal guard.
        fresh: Number.isFinite(wfDoctorAgeMs) && wfDoctorAgeMs >= -60000 && wfDoctorAgeMs <= 120000,
      }
    : null;

  const boardH = safeJsonFile(path.join(ROOT, 'DEMIGOD-BOARD-HONESTY.json'));
  const footLock = safeJsonFile(path.join(BUSY, 'foot-lock.json'));
  const lockExpiryMs = Date.parse(footLock?.expiresAt || '');
  const lockHeld = Number.isFinite(lockExpiryMs) && lockExpiryMs > Date.now();
  const footSha = dashStatus?.foot?.disk?.sha256 || null;
  const lockChangedSinceClaim = Boolean(lockHeld && footLock?.baseSha && footSha && footLock.baseSha !== footSha);
  const lockOwnerIsLocal = !footLock?.host || footLock.host === os.hostname();
  const lockHasOwnerPid = footLock?.pidScope === 'lease-owner';
  let lockOwnerAlive = null;
  // A PID only has meaning on the host that issued the lease. Probing a remote
  // owner's PID locally can collide with an unrelated process and fabricate
  // lock health; leave ownerAlive unknown for remote locks.
  if (lockHeld && lockOwnerIsLocal && lockHasOwnerPid && Number.isInteger(Number(footLock?.pid)) && Number(footLock.pid) > 0) {
    try {
      process.kill(Number(footLock.pid), 0);
      lockOwnerAlive = true;
    } catch (error) {
      lockOwnerAlive = error?.code === 'EPERM';
    }
  }

  function enrich(id, state) {
    const def = MODULES[id] || {};
    return {
      id,
      title: def.title,
      why: def.why,
      emoji: def.emoji,
      accent: def.accent,
      key: def.key,
      cli: def.cli,
      dashTab: def.dashTab,
      jobs: def.jobs || [],
      actions: def.actions || [],
      ...state,
    };
  }

  const modules = {};
  const siteTruthGreen = dashStatus?.truthEvidence?.green === true;
  const siteFullyShipped = dashStatus?.truth?.fullyShipped === true;
  modules.site = enrich('site', {
    // Reachability/smoke are useful metrics, but cannot make the Site module
    // green while canonical truth says disk and live are not fully shipped.
    ok: siteTruthGreen && siteFullyShipped,
    detail: dashStatus?.glance?.site || dashStatus?.live?.foot || '—',
    next: siteFullyShipped ? 'bin/dg smoke' : 'bin/dg truth',
    metrics: {
      foot: dashStatus?.live?.foot || null,
      smoke: dashStatus?.smoke?.pass ?? null,
      truthGreen: siteTruthGreen,
      fullyShipped: siteFullyShipped,
    },
  });
  modules.webflow = enrich('webflow', {
    ok: Boolean(wf?.cdp?.ok) && wfDoctor?.pass === true && wfDoctor.fresh,
    freeze: frozen,
    ready: wf?.ready || null,
    tabs: wf?.tabs?.byRole || null,
    detail: frozen
      ? `freeze ON · tabs ${wf?.tabs?.pages ?? '?'}`
      : `paste=${wf?.ready?.paste} · tabs ${wf?.tabs?.pages ?? '?'}`,
    next: 'bin/dg webflow doctor',
    doctor: wfDoctor,
    metrics: { pages: wf?.tabs?.pages, cdp: wf?.cdp?.ok, doctorPass: wfDoctor?.pass ?? null, doctorFresh: wfDoctor?.fresh ?? false },
  });
  const matchSum = matchesBusy?.summary || dashStatus?.matches?.summary || null;
  const realProposed =
    matchSum?.realProposed ??
    (matchSum?.byState?.proposed != null && matchSum?.sampleCount != null
      ? Math.max(0, (matchSum.byState.proposed || 0) - (matchSum.sampleCount || 0))
      : matchSum?.byState?.proposed);
  modules.match = enrich('match', {
    ok: true,
    summary: matchSum,
    inbox: dashStatus?.inbox
      ? { new: dashStatus.inbox.newCount, total: dashStatus.inbox.total }
      : null,
    detail: matchSum
      ? `pairs ${matchSum.total} · realProposed ${realProposed ?? 0} · samples ${matchSum.sampleCount ?? '?'}`
      : 'run bin/dg matches',
    next: 'bin/dg matches',
    metrics: {
      pairs: matchSum?.total,
      proposed: realProposed ?? 0,
      realProposed: realProposed ?? 0,
      sampleCount: matchSum?.sampleCount ?? 0,
      inboxNew: dashStatus?.inbox?.newCount,
    },
  });
  modules.review = enrich('review', {
    ok: review ? !review.summary?.fail : null,
    findings: review?.summary?.count ?? null,
    bySev: review?.summary?.bySev || null,
    detail: review
      ? `${review.summary?.count ?? 0} findings · fail=${review.summary?.fail}`
      : 'no review yet',
    next: 'bin/dg review',
    metrics: { fail: review?.summary?.fail, count: review?.summary?.count },
  });
  modules.hygiene = enrich('hygiene', {
    ok: hygiene?.healthy ?? null,
    tabs: hygiene?.tabs?.pages ?? wf?.tabs?.pages,
    detail: hygiene
      ? `load ${hygiene.load?.load1} · tabs ${hygiene.tabs?.pages} · free ${hygiene.load?.memAvailGb}G`
      : 'run hygiene',
    next: 'bin/dg hygiene --prune',
    metrics: { load: hygiene?.load?.load1, tabs: hygiene?.tabs?.pages },
  });
  modules.ponytail = enrich('ponytail', {
    ok: ponytail?.ok ?? null,
    detail: ponytail
      ? `mode=${ponytail.defaultMode || '?'} · score ${ponytail.score ?? '?'}/${ponytail.scoreMax ?? 9}` +
        (ponytail.missing?.length ? ` · missing ${ponytail.missing.join(',')}` : ' · agents wired')
      : 'run bin/dg ponytail',
    next: ponytail?.ok ? 'agents use Ponytail full mode' : 'bin/dg ponytail check',
    metrics: {
      mode: ponytail?.defaultMode || null,
      score: ponytail?.score ?? null,
      claude: ponytail?.surfaces?.claudePlugin?.enabled ?? null,
      codex: ponytail?.surfaces?.codexPlugin?.enabled ?? null,
      missing: ponytail?.missing || [],
    },
  });
  const cycle = safeJsonFile(path.join(BUSY, 'cycle-work-latest.json'));
  const nsStop = fs.existsSync(path.join(BUSY, 'never-stop.STOP'));
  const swStop = fs.existsSync(path.join(BUSY, 'swarm-busy.STOP'));
  modules.workloop = enrich('workloop', {
    ok: cycle?.ok === true && cycle?.attested === true,
    detail: cycle
      ? `cycle ${cycle.domain || '?'} · verdict=${cycle.verdict || cycle.verification || '?'} · ns=${nsStop ? 'stopped' : 'run?'} · swarm=${swStop ? 'stopped' : 'run?'}`
      : `no cycle receipt · ns=${nsStop ? 'stopped' : '?'} swarm=${swStop ? 'stopped' : '?'}`,
    next: 'bin/dg cycle-status',
    metrics: {
      domain: cycle?.domain || null,
      ok: cycle?.ok ?? null,
      neverStopStopped: nsStop,
      swarmStopped: swStop,
    },
  });
  modules.ship = enrich('ship', {
    ok: !frozen,
    freeze: frozen,
    detail: frozen ? `FROZEN — ${freeze.why || ''}` : 'freeze OFF — mutate with care',
    next: frozen ? 'do not paste/publish' : 'bin/dg-webflow playbook prep-footer-paste',
    metrics: {
      frozen,
      boardRoles: dashStatus?.board?.roles,
      boardReal: dashStatus?.board?.signal?.realRoles,
      honesty: boardH?.pass ?? null,
      footLock: lockHeld ? footLock?.owner || 'held' : 'free',
    },
  });
  // Orca remote seat — prefer cache file; skip 5s orca-ide spawn when fresh
  let orcaReach = null;
  try {
    const orcaMeta = safeJsonFile('/tmp/orca-pair-meta.json') || safeJsonFile(path.join(BUSY, 'orca-status.json'));
    if (orcaMeta && (orcaMeta.reachable != null || orcaMeta.result?.runtime?.reachable != null)) {
      orcaReach = Boolean(orcaMeta.reachable ?? orcaMeta.result?.runtime?.reachable);
    } else {
      const st = sh('orca-ide status --json 2>/dev/null', 2500);
      if (st.status === 0 && st.stdout) {
        const d = JSON.parse(st.stdout);
        orcaReach = Boolean(d?.result?.runtime?.reachable);
      }
    }
  } catch {
    /* ignore */
  }
  const keepPid = path.join(ROOT, '.keep-awake.pid');
  let awake = false;
  try {
    const pid = Number(fs.readFileSync(keepPid, 'utf8').trim());
    process.kill(pid, 0);
    awake = true;
  } catch { awake = false; }
  modules.orca = enrich('orca', {
    ok: orcaReach && awake,
    detail: orcaReach
      ? `runtime ok · keep-awake ${awake ? 'on' : 'OFF'} · pair: bin/dg-orca pair`
      : 'Orca down — bin/dg-orca up',
    next: orcaReach ? 'bin/dg-orca pair' : 'bin/dg-orca up',
    metrics: { reachable: orcaReach, keepAwake: awake },
  });
  modules.swarm = enrich('swarm', {
    ok: null,
    detail: `${(dashStatus?.handoffs || []).length} handoffs · plans via plan-inbox`,
    next: 'open Swarm tab',
    metrics: { handoffs: (dashStatus?.handoffs || []).length },
  });

  const next = dashStatus?.next || {
    id: 'orient',
    title: 'Orient via control plane',
    cmd: 'bin/dg home',
  };

  const spine = [];
  if (!wf?.cdp?.ok) spine.push({ pri: 0, id: 'cdp', title: 'Start CDP Chrome', cmd: '~/agent-dev.sh up', module: 'webflow' });
  if ((wf?.tabs?.pages || 0) > 10 || (wf?.tabs?.byRole?.['ops-dash'] || 0) > 2) {
    spine.push({ pri: 1, id: 'prune', title: 'Prune tabs', cmd: 'bin/dg hygiene --prune', module: 'hygiene', job: 'hygiene' });
  }
  if (modules.review.ok === false) {
    spine.push({
      pri: 2,
      id: 'review-block',
      title: 'Fix review blockers',
      cmd: 'bin/dg review',
      module: 'review',
      job: 'review',
    });
  }
  if (frozen) {
    spine.push({
      pri: 2,
      id: 'freeze',
      title: 'Freeze ON — ops only (no ship)',
      cmd: 'bin/dg home',
      module: 'ship',
    });
  }
  spine.push({
    pri: 3,
    id: 'next',
    title: next.title || 'NEXT',
    cmd: next.cmd || 'bin/dg smoke',
    module: 'site',
    job: next.id === 'smoke' ? 'smoke' : null,
  });
  const rp = modules.match.metrics?.realProposed ?? modules.match.metrics?.proposed ?? 0;
  if (rp > 0) {
    spine.push({
      pri: 4,
      id: 'pairs',
      title: `Review ${rp} real proposed pairs`,
      cmd: 'bin/dg matches',
      module: 'match',
      job: 'match-review',
      tab: 'matches',
    });
  }

  // Health score 0–100
  let health = 100;
  if (!modules.site.ok) health -= 25;
  if (!modules.webflow.ok) health -= 20;
  if (modules.review.ok === false) health -= 20;
  if (modules.hygiene.ok === false) health -= 10;
  if ((modules.hygiene.tabs || 0) > 12) health -= 10;
  if (frozen) health = Math.min(health, 85); // frozen is fine, not a failure
  health = Math.max(0, health);

  // Fresh truth evidence + single NEXT builder
  const te = refuseIfStale('truth');
  const truthEvidence = {
    green: Boolean(te.green),
    reason: te.reason || 'unknown',
    summary: te.summary || null,
    runId: te.runId || null,
    endedAt: te.endedAt || null,
  };
  const nextCanon = buildNext();
  spine.unshift({
    pri: 0,
    id: nextCanon.id,
    title: nextCanon.title,
    cmd: nextCanon.cmd,
    module: nextCanon.id.startsWith('ship')
      ? 'ship'
      : nextCanon.id.includes('demand')
        ? 'match'
        : 'site',
  });
  // Prefer canonical next over dash-derived for plane.next
  const nextOut = projectNext(nextCanon);
  const orderedSpine = spine.filter((item, index) => spine.findIndex((other) => other.cmd === item.cmd) === index).sort((a, b) => a.pri - b.pri);

  // Demand starvation: never label "solid" with 0 SENT under freeze (Codex N-E1)
  const demandSnap = safeJsonFile(path.join(BUSY, 'demand-status.json')) || {};
  const sentConfirmed = Number(demandSnap?.dms?.sentConfirmed ?? 0) || 0;
  const fullyShipped = Boolean(
    nextCanon?.versions &&
      nextCanon.versions.disk &&
      nextCanon.versions.live &&
      String(nextCanon.versions.disk) === String(nextCanon.versions.live) &&
      !frozen,
  );
  const demandStarved =
    frozen && sentConfirmed === 0 && (nextCanon?.id || '').includes('demand');
  let healthLabel = health >= 80 ? 'solid' : health >= 50 ? 'watch' : 'attention';
  // Product health fails closed on the truth seal. Process/module reachability
  // can still score well while evidence is missing or stale, but that state is
  // never "solid" and must be distinguishable from ordinary demand starvation.
  if (!truthEvidence.green) {
    health = Math.min(health, 49);
    healthLabel = 'truth-stale';
  } else if (demandStarved) {
    health = Math.min(health, 55);
    healthLabel = 'demand-starved';
  } else if (frozen && !fullyShipped && healthLabel === 'solid') {
    healthLabel = 'watch'; // freeze-hold: tools ok, not product-green
  }

  const plane = {
    schema: 'demigod.control-plane/2',
    at: new Date().toISOString(),
    version: 2,
    name: 'Demigod Control Plane',
    truthEvidence,
    nextCanon,
    frozen,
    freezeWhy: freeze.why || null,
    freezeAt: freeze.at || null,
    freezeBy: freeze.by || null,
    sessionMode: frozen ? 'read-only' : 'read-write',
    health,
    healthLabel,
    demandStarved: Boolean(demandStarved),
    dms: { sentConfirmed },
    board: {
      roles: dashStatus?.board?.roles ?? null,
      realRoles: dashStatus?.board?.signal?.realRoles ?? null,
      honestyPass: boardH?.pass ?? null,
    },
    lock: {
      foot: lockHeld,
      owner: lockHeld ? footLock?.owner || null : null,
      ownerAlive: lockHeld ? lockOwnerAlive : null,
      ownerIsLocal: lockHeld ? lockOwnerIsLocal : null,
      pidScope: lockHeld ? footLock?.pidScope || null : null,
      reservation: Boolean(lockHeld && footLock?.pidScope === 'claim-command'),
      changedSinceClaim: lockChangedSinceClaim,
      compromised: Boolean(lockHeld && (lockOwnerAlive === false || lockChangedSinceClaim)),
      ttlLeftSec: lockHeld ? Math.max(0, Math.ceil((lockExpiryMs - Date.now()) / 1000)) : 0,
    },
    assets: {
      ambient: '/assets/dashboard/control-plane-ambient.jpg',
      icons: '/assets/dashboard/module-icons.jpg',
      ambientLegacy: '/assets/dashboard/ambient-bg.jpg',
    },
    dash: DASH,
    next: nextOut,
    spine: orderedSpine,
    modules,
    moduleOrder: ['site', 'webflow', 'match', 'review', 'hygiene', 'ponytail', 'workloop', 'ship', 'swarm', 'orca'],
    moduleDefs: MODULES,
    entrypoints: {
      cli: 'bin/dg',
      dash: DASH,
      home: `${DASH}/#overview`,
      start: 'bin/dg-start',
      brief: `${DASH}/api/agent-brief`,
      control: `${DASH}/api/control`,
    },
    map: [
      '1. bin/dg home OR dash #overview (same home)',
      '2. bin/dg hygiene --prune',
      '3. bin/dg ponytail (lazy-senior agents)',
      '4. bin/dg webflow doctor',
      '5. Dash rooms: Inbox · Matches · Ship',
      '6. bin/dg review when shipping code',
      '7. Ship only freeze OFF + checklist',
    ],
    kbd: {
      g: 'go module (then s/w/m/r/h/y/p/a)',
      '/': 'command palette',
      r: 'refresh',
      '?': 'help',
    },
  };

  atomicWrite(OUT, JSON.stringify(plane) + '\n');
  // Keep next.json + cockpit next aligned with this write
  writeNextSnapshot(nextCanon);
  return plane;
}

function printHome(plane) {
  const lines = [];
  lines.push(`# ${plane.name}`);
  lines.push(`at: ${plane.at}`);
  lines.push(`freeze: ${plane.frozen ? 'ON ⛔' : 'OFF'} ${plane.freezeWhy || ''}`);
  lines.push(`dash: ${plane.dash}`);
  lines.push('');
  lines.push('## Modules');
  for (const [id, def] of Object.entries(MODULES)) {
    const st = plane.modules[id] || {};
    const mark = st.ok === false ? '✗' : st.ok === true ? '✓' : '·';
    lines.push(`### ${mark} ${id} — ${def.title}`);
    lines.push(`- ${def.why}`);
    lines.push(`- state: ${st.detail || '—'}`);
    lines.push(`- next: \`${st.next || def.cli}\``);
  }
  lines.push('');
  lines.push('## Spine (do in order)');
  for (const s of plane.spine) {
    lines.push(`${s.pri}. **${s.title}**`);
    lines.push(`   \`${s.cmd}\``);
  }
  lines.push('');
  lines.push('## How it connects');
  lines.push('```');
  lines.push('  bin/dg  ──►  modules (webflow|matches|review|hygiene|…)');
  lines.push('     │');
  lines.push('     ├── writes /tmp/dg-busy/control-plane.json');
  lines.push('     │');
  lines.push('  Dash :9878 ──► same modules as tabs + /api/control');
  lines.push('     │');
  lines.push('  Jobs / registry ──► one catalog, freeze-gated mutate');
  lines.push('```');
  lines.push('');
  lines.push('## Map');
  for (const m of plane.map) lines.push(`- ${m}`);
  return lines.join('\n') + '\n';
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'home';
  const asJson = args.includes('--json');

  // Dispatch: bin/dg webflow doctor → demigod-webflow doctor
  if (DISPATCH[cmd]) {
    const base = DISPATCH[cmd];
    const rest = args.slice(1).filter((a) => a !== '--json' || cmd === 'review' || cmd === 'hygiene');
    // special: hygiene --prune default when no args?
    const nodeArgs = [...base, ...args.slice(1)];
    const r = spawnSync('node', nodeArgs, { cwd: ROOT, stdio: 'inherit' });
    process.exit(r.status ?? 1);
  }

  if (cmd === 'orca') {
    const r = spawnSync('bash', ['bin/dg-orca', ...args.slice(1)], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    process.exit(r.status ?? 1);
  }

  if (cmd === 'dash') {
    const r = spawnSync('bash', ['-lc', 'bin/dg-dash'], { cwd: ROOT, stdio: 'inherit' });
    process.exit(r.status ?? 0);
  }

  if (cmd === 'modules') {
    if (asJson) console.log(JSON.stringify(MODULES, null, 2));
    else {
      for (const [id, m] of Object.entries(MODULES)) {
        console.log(`${id.padEnd(10)} ${m.title} · ${m.cli}`);
      }
    }
    process.exit(0);
  }

  if (cmd === 'home' || cmd === 'status' || cmd === 'next' || cmd === 'plane') {
    const plane = await buildControlPlane();
    if (cmd === 'next') {
      if (asJson) {
        console.log(JSON.stringify({ next: plane.next, spine: plane.spine, frozen: plane.frozen }, null, 2));
      } else {
        console.log(`NEXT: ${plane.next.title}`);
        console.log(`cmd:  ${plane.next.cmd}`);
        console.log('');
        for (const s of plane.spine.slice(0, 6)) console.log(`  ${s.pri}. ${s.title}\n     ${s.cmd}`);
      }
    } else if (asJson || cmd === 'status' || cmd === 'plane') {
      console.log(JSON.stringify(plane, null, 2));
    } else {
      console.log(printHome(plane));
    }
    process.exit(0);
  }

  // unknown → show help
  console.log(`Demigod Control Plane

  bin/dg home              # cohesive map + module state
  bin/dg status --json     # control-plane.json
  bin/dg next              # spine of next actions
  bin/dg modules

  # dispatch
  bin/dg webflow [doctor|tabs|…]
  bin/dg review [flags]
  bin/dg matches | hygiene | doctor | smoke | truth | freeze
  bin/dg dash

  # classic
  bin/dg-start             # session bootstrap
  open ${DASH}
`);
  process.exit(cmd === 'help' || cmd === '--help' ? 0 : 1);
}

// allow import
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(2);
  });
}
