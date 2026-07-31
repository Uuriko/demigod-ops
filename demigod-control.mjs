#!/usr/bin/env node
/**
 * demigod-control — cohesive Control Plane over all Demigod ops modules
 *
 * One mental model:
 *   Site · Events · Webflow · Match · Review · Hygiene · Ponytail · Work loop · Ship · Plans · Orca
 * One CLI spine:
 *   bin/dg status|home|next|webflow|matches|review|hygiene|orca|check|ship|…
 * One JSON:
 *   /tmp/dg-busy/control-plane.json  (+ dash /api/control)
 *
 * Related: demigod-agent-dashboard.mjs (:9878), demigod-tools-registry.mjs
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
import { status as publishFreezeStatus } from './demigod-publish-freeze.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const DASH = process.env.DEMIGOD_DASH || 'http://127.0.0.1:9878';
const OUT = path.join(BUSY, 'control-plane.json');
const NEXT_JSON = path.join(BUSY, 'next.json');
const COCKPIT_JSON = path.join(BUSY, 'cockpit.json');

/** Age in ms from an ISO-ish `at`; missing/malformed → Infinity (fail closed → refresh). */
function ageMsFrom(at) {
  const t = Date.parse(at);
  return Number.isFinite(t) ? Date.now() - t : Infinity;
}

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

  const freeze = publishFreezeStatus();
  const frozen = freeze.frozen;
  const publishAuthorized = freeze.authorized === true;
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
    plane.sessionMode = frozen || !publishAuthorized ? 'prepare-only' : 'publish-authorized';
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
  events: {
    title: 'Events',
    why: 'SF night lifecycle, native RSVP, and public API health',
    emoji: '◉',
    accent: '#C9A84C',
    key: 'e',
    cli: 'bin/dg events status',
    dashTab: 'overview',
    jobs: ['events-outbox-status', 'events-invite-drain', 'events-tick'],
    actions: [
      { id: 'events-status', label: 'Status', cmd: 'bin/dg events status' },
      { id: 'events-outbox', label: 'Resource outbox', job: 'events-outbox-status' },
      { id: 'events-drain', label: 'Invite drain', job: 'events-invite-drain' },
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
    why: 'Continuous local audits and draft-only checks',
    emoji: '⟳',
    accent: '#7dd3fc',
    key: 'l',
    cli: 'bin/dg-useful-loop status',
    dashTab: 'system',
    jobs: [],
    actions: [],
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
    jobs: ['ship-checklist', 'verify-source', 'board-honesty', 'craft', 'craft-mint-ship'],
    actions: [
      { id: 'shipc', label: 'Checklist', job: 'ship-checklist' },
      { id: 'honest', label: 'Board honesty', job: 'board-honesty' },
      { id: 'craft', label: 'Craft log', job: 'craft' },
      { id: 'craft-mint', label: 'Mint ship', job: 'craft-mint-ship' },
    ],
  },
  plans: {
    title: 'Plans',
    why: 'Agent plans + handoffs',
    emoji: '◉',
    accent: '#7eb6e8',
    key: 'a',
    cli: 'bin/dg-handoff',
    dashTab: 'handoff',
    jobs: ['plan-inbox'],
    actions: [
      { id: 'plans', label: 'Plans', job: 'plan-inbox', tab: 'handoff' },
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
  review: ['demigod-review.mjs', '--no-contract'],
  hygiene: ['demigod-laptop-hygiene.mjs'],
  ponytail: ['demigod-ponytail.mjs'],
  doctor: ['demigod-doctor.mjs'],
  smoke: ['demigod-agent-smoke.mjs'],
  truth: ['demigod-truth.mjs', '--md'],
  freeze: ['demigod-publish-freeze.mjs', 'status'],
  cockpit: ['demigod-agent-cockpit.mjs'],
  usertest: ['demigod-user-test.mjs', '--quick'],
  priority: ['demigod-priority-board.mjs'],
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
export async function buildControlPlane({ dashStatus: suppliedDashStatus = null } = {}) {
  ensureBusy();
  /* ==== SECTION: freeze + dash status (cached) ==== */
  const freeze = publishFreezeStatus();
  const frozen = freeze.frozen;
  const publishAuthorized = freeze.authorized === true;

  // Prefer busy cache — only hit dash if stale (>30s); malformed `at` → Infinity → refresh
  let dashStatus = suppliedDashStatus || safeJsonFile(path.join(BUSY, 'dashboard-status.json'));
  const dashAge = ageMsFrom(dashStatus?.at);
  if (dashAge > 30000 || dashAge < -60000) {
    // Prefer slim status for speed
    dashStatus =
      (await fetchJson(`${DASH}/api/status?slim=1`)) ||
      (await fetchJson(`${DASH}/api/status`)) ||
      dashStatus;
  }
  const [webflow, review, hygiene, matchesBusy, ponytail] = await Promise.all([
    Promise.resolve(
      safeJsonFile(path.join(BUSY, 'webflow-status.json')) ||
        (dashAge >= -60000 && dashAge < 60000 ? null : fetchJson(`${DASH}/api/webflow`)),
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
  const wfDoctorAgeMs = ageMsFrom(wfDoctorRaw?.at);
  const wfDoctor = wfDoctorRaw
    ? {
        ...wfDoctorRaw,
        ageMs: wfDoctorAgeMs,
        // >= -60000 rejects a future-dated/clock-skewed doctor envelope instead of blessing it
        // fresh forever (negative age passed `<= 120000`); mirrors dashboard.mjs truth-seal guard.
        fresh: Number.isFinite(wfDoctorAgeMs) && wfDoctorAgeMs >= -60000 && wfDoctorAgeMs <= 15 * 60 * 1000,
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
  // Canonical truth first — never mix stale dash glance for live foot identity.
  // If truth.json exists, live foot comes only from that receipt (or unknown).
  // Dash glance may only fill gaps when there is no truth receipt at all.
  const te = refuseIfStale('truth');
  const truthReceipt = safeJsonFile(path.join(BUSY, 'truth.json'));
  const hasTruthReceipt = Boolean(truthReceipt && typeof truthReceipt === 'object');
  const siteTruthGreen = Boolean(te.green);
  const siteFullyShipped = Boolean(truthReceipt?.fullyShipped) && Boolean(te.fresh);
  const liveFootVer = truthReceipt?.live?.footVer || null;
  const liveFootUrl = truthReceipt?.live?.footUrl || null;
  const diskFootVer = truthReceipt?.foot?.ver || null;
  let siteDetail;
  const prepareOnlyRelease = Boolean(truthReceipt?.prepareOnlyRelease);
  const prepareOnlyAssets = Boolean(truthReceipt?.prepareOnlySiblingAssets);
  const publishLag = truthReceipt?.publishLag && typeof truthReceipt.publishLag === 'object'
    ? truthReceipt.publishLag
    : null;
  const siblingDrift = truthReceipt?.siblingDrift && typeof truthReceipt.siblingDrift === 'object'
    ? truthReceipt.siblingDrift
    : null;
  const lagSuffix = [
    publishLag?.lagging
      ? publishLag.overdue
        ? ` · lag DEBT +${publishLag.versionsAhead}ver ${publishLag.ageHours}h (auth publish)`
        : ` · lag +${publishLag.versionsAhead}ver ${publishLag.ageHours}h tracked`
      : '',
    siblingDrift?.status && siblingDrift.status !== 'matched'
      ? siblingDrift.intentional
        ? ` · siblings intentional (${siblingDrift.summary || 'staged'})`
        : ` · siblings NEED REVIEW (${siblingDrift.summary || 'unexplained'})`
      : '',
  ].join('');
  if (liveFootVer) {
    siteDetail = `Live foot v${liveFootVer}${liveFootUrl ? ` · ${liveFootUrl}` : ''}${
      siteFullyShipped
        ? ''
        : prepareOnlyRelease
          ? prepareOnlyAssets
            ? ' · prepare-only (sibling assets ahead of CDN)'
            : ' · prepare-only (publish unauthorized)'
          : ' · not fully shipped'
    }${lagSuffix}`;
  } else if (hasTruthReceipt && te.summary) {
    // Truth ran but live unknown — do not invent vN from dash cache
    siteDetail = String(te.summary).slice(0, 160);
  } else if (hasTruthReceipt) {
    siteDetail = diskFootVer
      ? `disk v${diskFootVer} · live unknown (truth)`
      : 'live unknown (truth receipt; no dash fill)';
  } else {
    siteDetail =
      dashStatus?.glance?.site ||
      dashStatus?.live?.foot ||
      (te.summary ? String(te.summary).slice(0, 120) : '—');
  }
  modules.site = enrich('site', {
    // Reachability/smoke are useful metrics, but cannot make the Site module
    // green while canonical truth says disk and live are not fully shipped.
    // Exception: prepareOnlyRelease means truth already soft-passed identity lag
    // while publish is unauthorized — treat as healthy prepare-only, not outage.
    ok: siteTruthGreen && (siteFullyShipped || prepareOnlyRelease),
    detail: siteDetail,
    next: siteFullyShipped
      ? 'bin/dg smoke'
      : prepareOnlyRelease
        ? publishLag?.overdue
          ? 'bin/dg ship prepare  # lag DEBT — ask current-request publish auth (not auto-ship)'
          : 'bin/dg ship prepare  # publish unauthorized — identity lag soft-ok'
        : 'bin/dg truth',
    metrics: {
      // Live identity only from truth when receipt exists (Codex cont16)
      foot: liveFootVer
        ? `foot v${liveFootVer}`
        : hasTruthReceipt
          ? null
          : dashStatus?.live?.foot || null,
      disk: diskFootVer,
      smoke: dashStatus?.smoke?.pass ?? null,
      truthGreen: siteTruthGreen,
      truthFresh: Boolean(te.fresh),
      fullyShipped: siteFullyShipped,
      prepareOnlyRelease,
      prepareOnlyAssets,
      publishLagOverdue: Boolean(publishLag?.overdue),
      publishLagVersions: publishLag?.versionsAhead ?? null,
      publishLagAgeHours: publishLag?.ageHours ?? null,
      truthSource: hasTruthReceipt ? 'truth.json' : 'dash-fallback',
    },
  });
  const eventsStore = safeJsonFile(path.join(ROOT, 'DEMIGOD-EVENTS.json'));
  const eventsOnlinePath = path.join(BUSY, 'events-online', 'status.json');
  // Refresh when stale; 30s covers slow tunnel probes (was 12s → null receipt → false "public unknown").
  if (!isFreshFile(eventsOnlinePath, 90)) sh('node demigod-events-online.mjs status >/dev/null 2>&1', 30000);
  const eventsOnlineFresh = isFreshFile(eventsOnlinePath, 90);
  // Keep last receipt when refresh still stale — prefer "up (stale)" over inventing unknown.
  const eventsOnline = safeJsonFile(eventsOnlinePath);
  const activeEvent = eventsStore?.activeEvent;
  const eventsPublic =
    eventsOnline?.public === true ? 'up' : eventsOnline?.public === false ? 'down' : 'unknown';
  const eventsPublicLabel = eventsOnlineFresh ? eventsPublic : `${eventsPublic} (stale)`;
  const eventsCertified =
    eventsOnlineFresh &&
    eventsOnline?.certified === true &&
    eventsOnline?.storeHygiene?.ok === true;
  // Local tunnel can be up while CDN website config still points at dead bases (publish-config gated).
  const websiteConfigStale =
    eventsOnlineFresh &&
    eventsOnline?.public === true &&
    eventsOnline?.websiteConfigCurrent === false;
  const websiteConfigDead =
    websiteConfigStale && eventsOnline?.websiteConfigReachable === false;
  const prepareOnlyWebsiteConfig =
    eventsOnline?.prepareOnlyWebsiteConfig === true || websiteConfigDead;
  // Operational health (public tunnel + routes + hygiene) is separate from CDN config ship.
  // Mirror site prepareOnlyRelease: do not red the module for publish-gated config lag alone.
  const eventsOperational =
    eventsOnlineFresh &&
    eventsOnline?.public === true &&
    eventsOnline?.needHeal !== true &&
    eventsOnline?.storeHygiene?.ok !== false &&
    eventsOnline?.nativeRsvpRoutes === true;
  const pendingMatch = eventsOnline?.pendingMatchesLocal === true;
  const configNote = websiteConfigDead
    ? pendingMatch
      ? ' · prepare-only (website config dead tunnels · pending matches local)'
      : ' · prepare-only (website config dead tunnels)'
    : websiteConfigStale
      ? pendingMatch
        ? ' · prepare-only (website config stale · pending matches local)'
        : ' · prepare-only (website config stale)'
      : '';
  // Sticky preferred loca name can 503 while a random loca tunnel is still public.
  const preferredTunnelMatch = eventsOnline?.preferredTunnelMatch;
  const preferredNote =
    eventsOnlineFresh &&
    eventsOnline?.public === true &&
    preferredTunnelMatch === false
      ? ' · preferred tunnel sticky name unavailable'
      : '';
  const eventsDetailCore = activeEvent?.id
    ? `${activeEvent.title || 'Untitled SF night'} · ${activeEvent.stage || '?'} · public ${eventsPublicLabel}`
    : `no active event · public ${eventsPublicLabel}`;
  modules.events = enrich('events', {
    // null = receipt stale/unknown; true = public operational (or certified);
    // publish-gated website-config lag must not paint red alone.
    ok: eventsOnlineFresh ? eventsOperational || eventsCertified : null,
    detail: `${eventsDetailCore}${configNote}${preferredNote}`,
    next: eventsOnline?.needHeal
      ? 'bin/dg events heal'
      : websiteConfigStale
        ? 'bin/dg events status  # website config publish gated'
        : 'bin/dg events status',
    metrics: {
      activeId: activeEvent?.id || null,
      stage: activeEvent?.stage || null,
      certified: eventsCertified,
      public: eventsOnline?.public ?? null,
      nativeRsvpRoutes: eventsOnlineFresh && eventsOnline?.nativeRsvpRoutes === true,
      storeHygiene: eventsOnline?.storeHygiene?.ok ?? null,
      receiptFresh: eventsOnlineFresh,
      websiteConfigCurrent: eventsOnline?.websiteConfigCurrent ?? null,
      websiteConfigReachable: eventsOnline?.websiteConfigReachable ?? null,
      prepareOnlyWebsiteConfig: prepareOnlyWebsiteConfig,
      eventsOperational: eventsOperational,
      preferredTunnelMatch: preferredTunnelMatch ?? null,
      pendingConfigPath: eventsOnline?.pendingConfigPath || null,
      pendingApiBase: eventsOnline?.pendingApiBase || null,
      pendingMatchesLocal:
        typeof eventsOnline?.pendingMatchesLocal === 'boolean'
          ? eventsOnline.pendingMatchesLocal
          : null,
      pendingBlockedBy: eventsOnline?.pendingBlockedBy || null,
    },
  });
  modules.webflow = enrich('webflow', {
    ok: wfDoctor?.fresh ? Boolean(wf?.cdp?.ok) && wfDoctor.pass === true : null,
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
  const matchReceiptAgeMs = ageMsFrom(matchesBusy?.at);
  const currentMatchEvidenceAgeMs = Math.min(
    ageMsFrom(safeJsonFile(path.join(ROOT, 'DEMIGOD-PAIRS.json'))?.at),
    ageMsFrom(dashStatus?.matches?.at),
  );
  const matchSum =
    (Number.isFinite(matchReceiptAgeMs) &&
    matchReceiptAgeMs >= -60000 &&
    matchReceiptAgeMs <= currentMatchEvidenceAgeMs
      ? matchesBusy?.summary
      : null) ||
    dashStatus?.matches?.summary ||
    null;
  const realProposed =
    matchSum?.realProposed ??
    (matchSum?.byState?.proposed != null && matchSum?.sampleCount != null
      ? Math.max(0, (matchSum.byState.proposed || 0) - (matchSum.sampleCount || 0))
      : matchSum?.byState?.proposed);
  // Prefer realCount so sample fixtures never inflate the "pairs" headline (cont25).
  const realPairCount =
    matchSum?.realCount != null
      ? Number(matchSum.realCount)
      : matchSum?.total != null && matchSum?.sampleCount != null
        ? Math.max(0, Number(matchSum.total) - Number(matchSum.sampleCount))
        : matchSum?.total ?? null;
  modules.match = enrich('match', {
    ok: true,
    summary: matchSum,
    inbox: dashStatus?.inbox
      ? { new: dashStatus.inbox.newCount, total: dashStatus.inbox.total }
      : null,
    detail: matchSum
      ? `pairs ${realPairCount ?? 0} real · realProposed ${realProposed ?? 0} · samples ${matchSum.sampleCount ?? '?'}`
      : 'run bin/dg matches',
    next: 'bin/dg matches',
    metrics: {
      pairs: realPairCount,
      totalLedger: matchSum?.total ?? null,
      proposed: realProposed ?? 0,
      realProposed: realProposed ?? 0,
      sampleCount: matchSum?.sampleCount ?? 0,
      inboxNew: dashStatus?.inbox?.newCount,
    },
  });
  // Show the review's age (not a stale flag): review runs on-demand, so an old result is valid until
  // the code changes — a time-based "stale" verdict would wrongly flag a still-good review. Surfacing
  // the age lets a reader judge whether it predates their edits without a false stale call.
  const reviewAgeMs = ageMsFrom(review?.at);
  const reviewAgeMin = Number.isFinite(reviewAgeMs) ? Math.round(reviewAgeMs / 60000) : null;
  const reviewPriority = (review?.summary?.bySev?.critical || 0) + (review?.summary?.bySev?.high || 0);
  modules.review = enrich('review', {
    ok: review ? !review.summary?.fail : null,
    findings: review ? reviewPriority : null,
    bySev: review?.summary?.bySev || null,
    detail: review
      ? `${reviewPriority} priority · ${review.summary?.count ?? 0} total · fail=${review.summary?.fail}${reviewAgeMin != null ? ` · ${reviewAgeMin < 90 ? `${reviewAgeMin}m` : `${Math.round(reviewAgeMin / 60)}h`} ago` : ''}`
      : 'no review yet',
    next: 'bin/dg review',
    metrics: { fail: review?.summary?.fail, count: review?.summary?.count, priority: review ? reviewPriority : null, ageMin: reviewAgeMin },
  });
  // Mirror the wfDoctor freshness guard (L353): the hygiene snapshot is a cached /tmp/dg-busy file;
  // without an age check a day-old snapshot shows tabs/load as current (was 27h stale, under-reporting
  // 13 live tabs as 5). >= -60000 rejects a future/clock-skewed stamp; <= 15min is the fresh window.
  const hygieneAgeMs = ageMsFrom(hygiene?.at);
  const hygieneStale = !!hygiene && !(hygieneAgeMs >= -60000 && hygieneAgeMs <= 15 * 60 * 1000);
  modules.hygiene = enrich('hygiene', {
    ok: hygieneStale ? null : (hygiene?.healthy ?? null),
    tabs: hygiene?.tabs?.pages ?? wf?.tabs?.pages,
    detail: hygiene
      ? `load ${hygiene.load?.load1} · tabs ${hygiene.tabs?.pages} · free ${hygiene.load?.memAvailGb}G${hygieneStale ? ` (stale${Number.isFinite(hygieneAgeMs) ? ` ${Math.round(hygieneAgeMs / 3600000)}h` : ''} — run bin/dg hygiene)` : ''}`
      : 'run hygiene',
    next: 'bin/dg hygiene --prune',
    metrics: { load: hygiene?.load?.load1, tabs: hygiene?.tabs?.pages, stale: hygieneStale, ageMs: hygieneAgeMs },
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
  const usefulLoop = safeJsonFile(path.join(BUSY, 'useful-loop-last.json'));
  const usefulLoopAgeMs = ageMsFrom(usefulLoop?.at);
  const usefulLoopFresh = usefulLoopAgeMs >= -60_000 && usefulLoopAgeMs <= 5 * 60_000;
  const usefulLoopStopped = ['useful-loop.STOP', 'watchdog.PAUSED']
    .some((file) => fs.existsSync(path.join(BUSY, file)));
  const usefulLoopTasks = Array.isArray(usefulLoop?.did) ? usefulLoop.did : [];
  const usefulLoopPassed = usefulLoopTasks.filter((task) => task?.ok === true).length;
  const usefulLoopHealthy =
    usefulLoopFresh &&
    !usefulLoopStopped &&
    usefulLoop?.ok === true &&
    usefulLoopPassed === usefulLoopTasks.length;
  modules.workloop = enrich('workloop', {
    ok: usefulLoopFresh ? usefulLoopHealthy : null,
    detail: usefulLoopStopped
      ? 'background work loops paused · laptop-friendly'
      : usefulLoop
      ? usefulLoopFresh
        ? `useful cycle ${usefulLoop.cycle ?? '?'} · ${usefulLoopPassed}/${usefulLoopTasks.length} ok · ${usefulLoopStopped ? 'stopped' : 'active'}`
        : `useful-loop receipt stale${Number.isFinite(usefulLoopAgeMs) ? ` ${Math.round(usefulLoopAgeMs / 60000)}m` : ''}`
      : 'no useful-loop receipt',
    next: 'bin/dg-useful-loop status',
    metrics: {
      cycle: usefulLoop?.cycle ?? null,
      ok: usefulLoopFresh ? usefulLoopHealthy : null,
      stale: !!usefulLoop && !usefulLoopFresh,
      ageMs: usefulLoopAgeMs,
      stopped: usefulLoopStopped,
      tasks: usefulLoopTasks.length,
      passed: usefulLoopPassed,
    },
  });
  let craftCount = null;
  let craftShipReady = null;
  try {
    const craft = await import('./demigod-craft-log.mjs').then((m) => m.status());
    craftCount = craft.count ?? 0;
    craftShipReady = Boolean(craft.ready?.ship_live && !String(craft.ready.ship_live).startsWith('no:'));
  } catch {
    /* craft log optional */
  }
  modules.ship = enrich('ship', {
    ok: !frozen && publishAuthorized,
    freeze: frozen,
    detail: frozen
      ? `FROZEN — ${freeze.why || ''}`
      : publishAuthorized
        ? `current request authorizes publish · craft entries=${craftCount ?? '?'}`
        : `prepare only — current request has not authorized publish · craft entries=${craftCount ?? '?'}`,
    next: frozen || !publishAuthorized ? 'bin/dg ship prepare' : 'bin/dg-webflow playbook prep-footer-paste',
    metrics: {
      frozen,
      publishAuthorized,
      boardRoles: dashStatus?.board?.roles,
      boardReal: dashStatus?.board?.signal?.realRoles,
      honesty: boardH?.pass ?? null,
      footLock: lockHeld ? footLock?.owner || 'held' : 'free',
      craftCount,
      craftShipReady,
    },
  });
  // Orca remote seat — receipt only; the dashboard refreshes stale receipts asynchronously.
  let orcaReach = null;
  try {
    const orcaMeta = safeJsonFile(path.join(BUSY, 'orca-status.json')) || safeJsonFile('/tmp/orca-pair-meta.json');
    const ageMs = Date.now() - Date.parse(orcaMeta?.at);
    const fresh = Number.isFinite(ageMs) && ageMs >= -60_000 && ageMs <= 300_000;
    if (fresh && (orcaMeta.reachable != null || orcaMeta.result?.runtime?.reachable != null)) {
      orcaReach = Boolean(orcaMeta.reachable ?? orcaMeta.result?.runtime?.reachable);
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
    ok: orcaReach == null ? null : orcaReach && awake,
    detail: orcaReach == null
      ? 'Orca receipt stale — bin/dg-orca status'
      : orcaReach
        ? `runtime ok · keep-awake ${awake ? 'on' : 'OFF'} · pair: bin/dg-orca pair`
        : 'Orca down — bin/dg-orca up',
    next: orcaReach == null ? 'bin/dg-orca status' : orcaReach ? 'bin/dg-orca pair' : 'bin/dg-orca up',
    metrics: { reachable: orcaReach, keepAwake: awake },
  });
  modules.plans = enrich('plans', {
    ok: null,
    detail: `${(dashStatus?.handoffs || []).length} handoffs · plans via plan-inbox`,
    next: 'open Work tab',
    metrics: { handoffs: (dashStatus?.handoffs || []).length },
  });

  const spine = [];
  if (!wf?.cdp?.ok) spine.push({ pri: 0, id: 'cdp', title: 'Start CDP Chrome', cmd: '~/agent-dev.sh up', module: 'webflow' });
  // Aging prepare-only debt: surface before hygiene thrash (still not auto-publish).
  if (publishLag?.overdue) {
    spine.push({
      pri: 0,
      id: 'publish-lag-debt',
      title: `Publish lag DEBT disk v${publishLag.diskVer} live v${publishLag.liveVer} (+${publishLag.versionsAhead}ver · ${publishLag.ageHours}h)`,
      cmd: 'bin/dg ship prepare  # needs exact current-request publish auth — not auto-ship',
      module: 'ship',
    });
  }
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
  if (modules.webflow.ok === false) health -= 20;
  if (modules.review.ok === false) health -= 20;
  if (modules.hygiene.ok === false) health -= 10;
  if ((modules.hygiene.tabs || 0) > 12) health -= 10;
  if (frozen) health = Math.min(health, 85); // frozen is fine, not a failure
  health = Math.max(0, health);

  // Fresh truth evidence (same `te` as modules.site — single snapshot) + NEXT builder
  const truthEvidence = {
    green: Boolean(te.green),
    pass: Boolean(te.pass),
    fresh: Boolean(te.fresh),
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
    healthLabel = truthEvidence.fresh ? 'truth-failed' : 'truth-stale';
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
    sessionMode: frozen || !publishAuthorized ? 'prepare-only' : 'publish-authorized',
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
    moduleOrder: ['site', 'events', 'webflow', 'match', 'review', 'hygiene', 'ponytail', 'workloop', 'ship', 'plans', 'orca'],
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
      '2. bin/dg events status',
      '3. bin/dg hygiene --prune',
      '4. bin/dg ponytail (lazy-senior agents)',
      '5. bin/dg webflow doctor',
      '6. Dash rooms: Inbox · Matches · Ship',
      '7. bin/dg review when shipping code',
      '8. Ship only with current-request authorization + checklist',
    ],
    kbd: {
      g: 'go module (then s/e/w/m/r/h/y/p/a)',
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
  // Control-plane verbs only accept --json; ignore-unknown would mask typos (cont27).
  if (['home', 'status', 'next', 'plane', 'modules'].includes(cmd)) {
    const bad = args.slice(1).filter((a) => a !== '--json');
    if (bad.length) {
      console.error(
        `unknown argument${bad.length > 1 ? 's' : ''}: ${bad.join(' ')} — try: bin/dg ${cmd} [--json]`,
      );
      process.exit(2);
    }
  }

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
  bin/dg matches | hygiene | doctor | smoke | truth | freeze | priority
  bin/dg dash

  # classic
  bin/dg-start             # session bootstrap
  open ${DASH}
`);
  // Unknown verbs: exit 2 (fail-closed family; help stays 0).
  process.exit(cmd === 'help' || cmd === '--help' ? 0 : 2);
}

// allow import
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(2);
  });
}
